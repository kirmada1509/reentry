import { writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { test, captureSelection, confirmPreview, fillTask } from "./extension";
import { start, recapture, confirm, saveComparison } from "./source-journey";

const origin = `${process.env.REENTRY_TEST_SOURCE_ORIGIN}/portal`;
async function version(value: "v1" | "v2" | "cosmetic") {
  await writeFile(
    path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "portal/scenario.json"),
    JSON.stringify({ version: value }),
  );
}
async function accessible(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((item) =>
          Number.isFinite(item.effect?.getComputedTiming().endTime ?? 0),
        )
        .map((item) => item.finished.catch(() => undefined)),
    );
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}

test("@portal saved application survives capture, changed requirements, recovery and continuation", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Uses the deterministic inference sandbox.",
  );
  await version("v1");
  const work = await extension.context.newPage();
  await work.goto(`${origin}/application.html`);
  await work
    .getByLabel("Your statement", { exact: true })
    .fill(
      "I want to study environmental engineering and improve water access.",
    );
  await work
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await work
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await expect(work.getByRole("status")).toContainText(
    "Draft saved in this browser",
  );
  await work.close();

  const { page: source, preview } = await captureSelection(
    extension.context,
    true,
    `${origin}/instructions.html`,
  );
  await expect(
    source.getByRole("button", {
      name: "Continue application draft",
      exact: true,
    }),
  ).toBeVisible();
  const checkpoint = await confirmPreview(extension.context, preview);
  await fillTask(checkpoint);
  await checkpoint
    .getByLabel("Work link", { exact: true })
    .fill(`${origin}/application.html`);
  await checkpoint
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await checkpoint
    .getByRole("link", { name: "Check instructions again", exact: true })
    .click();

  await version("v2");
  const updated = await start(
    extension.context,
    checkpoint,
    `${origin}/instructions.html`,
  );
  await expect(updated.locator("#instructions")).toContainText(
    "Supply two referees.",
  );
  const recaptured = await recapture(extension.context, updated);
  const comparison = await confirm(extension.context, recaptured.preview);
  await saveComparison(comparison);
  await comparison
    .getByRole("link", { name: "Review AI recovery", exact: true })
    .click();
  await comparison
    .getByRole("button", { name: "Generate recovery suggestion", exact: true })
    .click();
  await expect(
    comparison.getByRole("region", { name: "Evidence 1", exact: true }),
  ).toContainText("Supply two referees.");
  await comparison
    .getByLabel("Reviewed next action", { exact: true })
    .fill("Find and add the first referee.");
  await comparison
    .getByRole("button", { name: "Save reviewed recovery", exact: true })
    .click();
  const created = extension.context.waitForEvent("page");
  await comparison
    .getByRole("button", { name: "Continue to saved work", exact: true })
    .click();
  const returned = await created;
  await returned.waitForURL(`${origin}/application.html`);
  await expect(
    returned.getByLabel("Your statement", { exact: true }),
  ).toHaveValue(
    "I want to study environmental engineering and improve water access.",
  );
  await expect(
    returned.getByRole("button", {
      name: "Remove sample transcript",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    returned.getByLabel("Second referee", { exact: true }),
  ).toBeVisible();
});

test("@portal accessible application, draft failures, requirement change and explicit reset", async ({
  extension,
}, info) => {
  await version("v1");
  const page = await extension.context.newPage();
  await page.goto(`${origin}/instructions.html`);
  await expect(page.locator("#instructions")).toContainText(
    "Supply one referee.",
  );
  await accessible(page);
  await page
    .getByRole("button", {
      name: "Select requirements for capture",
      exact: true,
    })
    .click();
  expect(await page.evaluate(() => getSelection()?.toString())).toContain(
    "Supply one referee.",
  );
  await page.screenshot({
    path: info.outputPath("overview.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start application draft", exact: true })
    .click();
  await page
    .getByLabel("Your statement", { exact: true })
    .fill("A fictional statement.");
  await page
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await page.getByLabel("First referee", { exact: true }).fill("Dr Sample");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Your draft could not be saved",
  );
  await expect(page.getByRole("status")).not.toContainText("Draft saved");
  await page.screenshot({
    path: info.outputPath("application.png"),
    fullPage: true,
  });
  await accessible(page);

  // A fresh navigation restores the native storage method. Save a complete draft.
  await page.reload();
  await page
    .getByLabel("Your statement", { exact: true })
    .fill("A fictional statement.");
  await page
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await page.getByLabel("First referee", { exact: true }).fill("Dr Sample");
  await page
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await expect(
    page.getByText("4 of 4 sections ready", { exact: true }),
  ).toBeVisible();
  await version("v2");
  await page.reload();
  await expect(page.getByLabel("First referee", { exact: true })).toHaveValue(
    "Dr Sample",
  );
  await expect(page.getByLabel("Second referee", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("3 of 4 sections ready", { exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("application-narrow.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Review application", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await accessible(page);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review application", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Demo setup and reset", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset demo application draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Demo draft reset");
  await page.reload();
  await expect(page.getByLabel("Your statement", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("button", { name: "Attach sample transcript", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Second referee", { exact: true }),
  ).toBeVisible();
});

test("@portal unavailable requirements never silently fall back to old instructions", async ({
  extension,
}) => {
  const page = await extension.context.newPage();
  await page.route("**/portal/scenario.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto(`${origin}/instructions.html`);
  await expect(page.getByRole("alert")).toContainText(
    "Requirements could not be loaded",
  );
  await expect(page.locator("#instructions")).toHaveCount(0);
});
