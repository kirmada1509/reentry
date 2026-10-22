import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test as base, expect, chromium } from "@playwright/test";
import type { BrowserContext, Page, Worker } from "@playwright/test";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";

export const appUrl = process.env.REENTRY_TEST_APP_ORIGIN!;
export const sourceUrl = `${process.env.REENTRY_TEST_SOURCE_ORIGIN}/instructions.html`;
const extensionPath = path.resolve(
  process.env.REENTRY_TEST_PRODUCTION === "1"
    ? "extension/.output/chrome-mv3"
    : "extension/.output/chrome-mv3-e2e",
);
export const test = base.extend<{
  extension: {
    context: BrowserContext;
    worker: Worker;
    restart: () => Promise<{ context: BrowserContext; worker: Worker }>;
  };
}>({
  extension: async ({}, runTest, info) => {
    const profile = await mkdtemp(path.join(tmpdir(), "reentry-capture-"));
    const launch = () =>
      chromium.launchPersistentContext(profile, {
        channel: "chromium",
        ...(process.env.REENTRY_TEST_LIVE === "1"
          ? {
              recordVideo: {
                dir: info.outputPath("video"),
                size: { width: 1280, height: 900 },
              },
            }
          : {}),
        headless: process.env.HEADED !== "1",
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          "--enable-unsafe-extension-debugging",
        ],
      });
    let context = await launch();
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
      await runTest({
        context,
        worker,
        restart: async () => {
          await context.tracing.stop({
            path: info.outputPath("before-restart-trace.zip"),
          });
          await context.close();
          context = await launch();
          await context.tracing.start({ screenshots: true, snapshots: true });
          const restarted =
            context.serviceWorkers()[0] ??
            (await context.waitForEvent("serviceworker"));
          await expect
            .poll(() =>
              restarted.evaluate(() => chrome.action.onClicked.hasListeners()),
            )
            .toBe(true);
          return { context, worker: restarted };
        },
      });
    } finally {
      await context.tracing.stop({ path: info.outputPath("trace.zip") });
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});

export async function captureSelection(
  context: BrowserContext,
  select = true,
  url = `${sourceUrl}?selection=${crypto.randomUUID()}`,
) {
  const page = await context.newPage();
  await page.goto(url);
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

export async function invokeCapture(context: BrowserContext, page: Page) {
  const browserSession = await context.browser()!.newBrowserCDPSession();
  // Identify this fixture tab even when several checks share one stable URL.
  // Restore its real title before the actual extension action captures it.
  const originalTitle = await page.title();
  const marker = `reentry-test-tab-${crypto.randomUUID()}`;
  await page.evaluate((title) => {
    document.title = title;
  }, marker);
  let targetId = "";
  try {
    await expect
      .poll(async () => {
        const { targetInfos } = await browserSession.send("Target.getTargets", {
          filter: [{ type: "tab", exclude: false }],
        });
        targetId =
          targetInfos.find((item) => item.title === marker)?.targetId ?? "";
        return Boolean(targetId);
      })
      .toBe(true);
  } finally {
    await page.evaluate((title) => {
      document.title = title;
    }, originalTitle);
  }
  await page.bringToFront();
  // This executes Chrome's real toolbar action and its activeTab grant. No
  // host permissions, injected capture result, or fake action event is used.
  const [preview] = await Promise.all([
    context.waitForEvent("page"),
    browserSession.send("Extensions.triggerAction", {
      id: DEFAULT_EXTENSION_ID,
      targetId,
    }),
  ]);
  await preview.waitForURL(
    `chrome-extension://${DEFAULT_EXTENSION_ID}/capture.html?*`,
  );
  await browserSession.detach();
  return preview;
}

export async function confirmPreview(context: BrowserContext, preview: Page) {
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

export async function fillTask(page: Page, goal = "Finish application") {
  await page.getByLabel("Your goal", { exact: true }).fill(goal);
  await page.getByLabel("Work link", { exact: true }).fill(sourceUrl + "#work");
  await page
    .getByLabel("What have you completed?", { exact: true })
    .fill("Transcript attached");
  await page.getByRole("checkbox").check();
  await page
    .getByLabel("One next action", { exact: true })
    .fill("Find first referee");
}
