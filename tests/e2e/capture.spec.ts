import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test as base, expect, chromium } from "@playwright/test";
import type { BrowserContext, Page, Worker } from "@playwright/test";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";

const appUrl = process.env.REENTRY_TEST_APP_ORIGIN!;
const sourceUrl = `${process.env.REENTRY_TEST_SOURCE_ORIGIN}/instructions.html`;
const extensionPath = path.resolve("extension/.output/chrome-mv3-e2e");
const test = base.extend<{
  extension: { context: BrowserContext; worker: Worker };
}>({
  extension: async ({}, runTest, info) => {
    const profile = await mkdtemp(path.join(tmpdir(), "reentry-capture-"));
    const context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: process.env.HEADED !== "1",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--enable-unsafe-extension-debugging",
      ],
    });
    try {
      await context.tracing.start({ screenshots: true, snapshots: true });
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker"));
      expect(new URL(worker.url()).hostname).toBe(DEFAULT_EXTENSION_ID);
      await expect
        .poll(() =>
          worker.evaluate(() => chrome.action.onClicked.hasListeners()),
        )
        .toBe(true);
      await runTest({ context, worker });
    } finally {
      await context.tracing.stop({ path: info.outputPath("trace.zip") });
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});

async function captureSelection(context: BrowserContext, select = true) {
  const page = await context.newPage();
  await page.goto(`${sourceUrl}?selection=${crypto.randomUUID()}`);
  const text = select
    ? await page.locator("#instructions").evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        return selection.toString();
      })
    : "";
  const preview = await invokeCapture(context, page);
  return { page, preview, text };
}

async function invokeCapture(context: BrowserContext, page: Page) {
  const browserSession = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await browserSession.send("Target.getTargets", {
    filter: [{ type: "tab", exclude: false }],
  });
  const target = targetInfos.find((item) => item.url === page.url());
  if (!target) throw new Error("No browser tab target for the source page.");
  await page.bringToFront();
  // This executes Chrome's real toolbar action and its activeTab grant. No
  // host permissions, injected capture result, or fake action event is used.
  const [preview] = await Promise.all([
    context.waitForEvent("page"),
    browserSession.send("Extensions.triggerAction", {
      id: DEFAULT_EXTENSION_ID,
      targetId: target.targetId,
    }),
  ]);
  await preview.waitForURL(
    `chrome-extension://${DEFAULT_EXTENSION_ID}/capture.html?*`,
  );
  await browserSession.detach();
  return preview;
}

async function confirmPreview(context: BrowserContext, preview: Page) {
  const created = context.waitForEvent("page");
  await preview
    .getByRole("button", { name: "Confirm capture and open ReEntry" })
    .click();
  const app = await created;
  await app.waitForURL(`${appUrl}/?capture=*`);
  await expect(
    app.getByRole("heading", { name: "Save a checkpoint", exact: true }),
  ).toBeVisible();
  return app;
}

async function fillTask(page: Page) {
  await page
    .getByLabel("Your goal", { exact: true })
    .fill("Finish application");
  await page.getByLabel("Work link", { exact: true }).fill(sourceUrl + "#work");
  await page
    .getByLabel("What have you completed?", { exact: true })
    .fill("Transcript attached");
  await page.getByRole("checkbox").check();
  await page
    .getByLabel("One next action", { exact: true })
    .fill("Find first referee");
}

test("@capture real action, exact source, durable save, harmless retry and work link", async ({
  extension,
}, info) => {
  const { context, worker } = extension;
  const { page: source, preview, text } = await captureSelection(context);
  await expect(
    preview.getByLabel("Selected instructions · exact captured text", {
      exact: true,
    }),
  ).toHaveValue(text);
  await expect(preview.getByLabel("Source URL", { exact: true })).toHaveValue(
    source.url(),
  );
  await expect(
    preview
      .getByText("Fictional application instructions · ReEntry sandbox", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  const captureId = new URL(preview.url()).searchParams.get("id")!;
  const app = await confirmPreview(context, preview);
  await expect(
    app.getByLabel("Selected instructions · exact captured text", {
      exact: true,
    }),
  ).toHaveValue(text);
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
  await fillTask(app);
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Saved checkpoint", exact: true }),
  ).toBeVisible();
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
  await app.reload();
  await app
    .getByRole("button", { name: "Open saved checkpoint", exact: true })
    .click();
  await expect(
    app.getByText("Transcript attached", { exact: true }),
  ).toBeVisible();
  await expect(
    app.getByLabel("Saved instructions · captured text, not a live check", {
      exact: true,
    }),
  ).toHaveValue(text);
  await app.goto(`${appUrl}/?capture=${captureId}`);
  await expect(app.getByRole("status")).toContainText("already saved");
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
  const reopened = context.waitForEvent("page");
  await app.getByRole("link", { name: "Open work link", exact: true }).click();
  await expect(await reopened).toHaveURL(sourceUrl + "#work");
  await app.screenshot({
    path: info.outputPath("saved-checkpoint.png"),
    fullPage: true,
  });
});

test("@capture missing selection and declined preview create no task", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const empty = await captureSelection(context, false);
  await expect(empty.preview.getByRole("alert")).toContainText(
    "Select instruction text",
  );
  const { preview } = await captureSelection(context);
  await preview
    .getByRole("button", { name: "Discard capture", exact: true })
    .click();
  await expect(preview.getByRole("status")).toContainText("discarded");
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toEqual([]);
  const app = await context.newPage();
  await app.goto(appUrl);
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
});

test("@capture wrong origin/port and malformed requests cannot retrieve evidence", async ({
  extension,
}) => {
  const { context } = extension;
  const { preview, page } = await captureSelection(context);
  const id = new URL(preview.url()).searchParams.get("id")!;
  const app = await confirmPreview(context, preview);
  const send = async (target: Page, message: unknown) =>
    target.evaluate(
      ({ extensionId, message }) =>
        new Promise<unknown>((resolve) => {
          chrome.runtime.sendMessage(extensionId, message, (reply: unknown) => {
            if (chrome.runtime.lastError)
              resolve({ status: "blocked-by-browser" });
            else resolve(reply);
          });
        }),
      { extensionId: DEFAULT_EXTENSION_ID, message },
    );
  expect(
    await send(page, { version: 1, type: "capture.get", captureId: id }),
  ).toEqual({ status: "rejected" });
  expect(
    await send(app, {
      version: 1,
      type: "capture.get",
      captureId: id,
      unexpected: "reject me",
    }),
  ).toEqual({ status: "rejected" });
  expect(
    await send(app, {
      version: 1,
      type: "capture.ack",
      captureId: id,
      taskId: "invalid",
    }),
  ).toEqual({ status: "rejected" });
  await fillTask(app);
  await app
    .getByLabel("Work link", { exact: true })
    .fill("javascript:alert(1)");
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("alert", { name: "Something needs your attention" }),
  ).toContainText("HTTP or HTTPS");
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
});

test("@capture failed browser storage keeps the confirmed capture for a successful retry", async ({
  extension,
}) => {
  const { context, worker } = extension;
  await context.addInitScript(() => {
    Reflect.set(window, "failTaskWrite", true);
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      ...args: Parameters<IDBObjectStore["add"]>
    ) {
      if (this.name === "tasks" && Reflect.get(window, "failTaskWrite"))
        throw new DOMException(
          "Simulated storage failure",
          "QuotaExceededError",
        );
      return add.apply(this, args);
    };
  });
  const { preview } = await captureSelection(context);
  const app = await confirmPreview(context, preview);
  await fillTask(app);
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("alert", { name: "Something needs your attention" }),
  ).toContainText("Could not save your checkpoint");
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
  const pending = await worker.evaluate(
    async () =>
      (await chrome.storage.local.get("reentry-pending"))[
        "reentry-pending"
      ] as { status: string }[],
  );
  expect(pending).toHaveLength(1);
  expect(pending[0]?.status).toBe("confirmed");
  await app.evaluate(() => Reflect.set(window, "failTaskWrite", false));
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
});

test("@capture lost acknowledgement keeps one durable task and clears pending on refresh", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const { preview } = await captureSelection(context);
  const app = await confirmPreview(context, preview);
  await app.evaluate(() => {
    const send = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = ((...args: unknown[]) => {
      const request = args[1] as { type?: string };
      if (request?.type === "capture.ack") {
        const callback = args[2] as (reply: unknown) => void;
        callback({ status: "unavailable" });
        return;
      }
      return Reflect.apply(send, chrome.runtime, args);
    }) as typeof chrome.runtime.sendMessage;
  });
  await fillTask(app);
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(app.getByRole("status")).toContainText(
    "acknowledgement is pending",
  );
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toHaveLength(1);
  await app.reload();
  await expect(app.getByRole("status")).toContainText("already saved");
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
});

test("@capture selecting an editable field is refused without capturing its value", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const page = await context.newPage();
  await page.goto(sourceUrl);
  await page
    .getByLabel("Private form value (never captured automatically)")
    .selectText();
  const preview = await invokeCapture(context, page);
  await expect(preview.getByRole("alert")).toContainText(
    "editable fields are not supported",
  );
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))[
          "reentry-pending"
        ] ?? [],
    ),
  ).toEqual([]);
});
