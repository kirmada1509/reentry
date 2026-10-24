import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";
import {
  test,
  appUrl,
  sourceUrl,
  captureSelection,
  invokeCapture,
  confirmPreview,
  fillTask,
} from "./extension";

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
  await app.goto(`${appUrl}/checkpoints`);
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
