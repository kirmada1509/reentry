import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import {
  appUrl,
  captureSelection,
  confirmPreview,
  fillTask,
  invokeCapture,
} from "./extension";
export async function scenario() {
  const id = crypto.randomUUID();
  const directory = path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, id);
  await mkdir(directory);
  const target = path.join(directory, "instructions.html");
  async function version(name: "v1" | "v2" | "cosmetic") {
    await copyFile(
      path.resolve("tests/fixtures/sites/versions", `${name}.html`),
      target,
    );
  }
  await version("v1");
  return {
    url: `${process.env.REENTRY_TEST_SOURCE_ORIGIN}/${id}/instructions.html`,
    version,
  };
}

export async function seed(
  context: BrowserContext,
  url: string,
  goal = "Finish application",
) {
  const { page: source, preview } = await captureSelection(context, true, url);
  const app = await confirmPreview(context, preview);
  await fillTask(app, goal);
  await app.getByLabel("Work link", { exact: true }).fill(url + "#work");
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Saved checkpoint", exact: true }),
  ).toBeVisible();
  await source.close();
  await app
    .getByRole("link", { name: "Check instructions again", exact: true })
    .click();
  await expect(
    app.getByRole("heading", {
      name: "Instructions have not been checked again",
      exact: true,
    }),
  ).toBeVisible();
  return app;
}

export async function start(
  context: BrowserContext,
  app: Page,
  sourceUrl: string,
) {
  const created = context.waitForEvent("page");
  await app
    .getByRole("button", { name: "Open source and check again", exact: true })
    .click();
  const source = await created;
  await source.waitForURL(sourceUrl);
  await source.waitForLoadState("domcontentloaded");
  return source;
}

export async function recapture(
  context: BrowserContext,
  source: Page,
  selector = "#instructions",
) {
  const text = await source.locator(selector).evaluate((element) => {
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString();
  });
  const preview = await invokeCapture(context, source);
  return { preview, text };
}

export async function confirm(
  context: BrowserContext,
  preview: Page,
  goal = "Finish application",
) {
  await expect(
    preview.getByText(`Check instructions for: ${goal}`, { exact: true }),
  ).toBeVisible();
  const created = context.waitForEvent("page");
  await preview
    .getByRole("button", {
      name: "Confirm recapture for this task",
      exact: true,
    })
    .click();
  const app = await created;
  await app.waitForURL(`${appUrl}/check?*`);
  await expect(
    app.getByRole("heading", {
      name: "Review recapture for this task",
      exact: true,
    }),
  ).toBeVisible();
  return app;
}

export async function saveComparison(app: Page, confirmSection = true) {
  if (confirmSection)
    await app
      .getByRole("checkbox", {
        name: "I selected the same instruction section as the saved capture.",
      })
      .check();
  await app
    .getByRole("button", { name: "Save source comparison", exact: true })
    .click();
}
