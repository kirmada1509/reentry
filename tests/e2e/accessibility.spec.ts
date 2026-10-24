import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  test,
  appUrl,
  captureSelection,
  confirmPreview,
  fillTask,
} from "./extension";
import {
  scenario,
  seed,
  start,
  recapture,
  confirm,
  saveComparison,
} from "./source-journey";
async function accessible(page: Page) {
  // Scan the settled interaction state, including the registry's button color
  // transitions when a generated result changes the primary action.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().endTime ?? 0),
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
test("@a11y empty library, extension preview, capture form, editor, history and deletion dialog", async ({
  extension,
}, info) => {
  const app = await extension.context.newPage();
  await app.goto(`${appUrl}/checkpoints`);
  await expect(app.locator("body")).toHaveCSS("font-family", /Geist/);
  await accessible(app);
  const { preview } = await captureSelection(extension.context);
  // Verify the configured theme after it loads. Chromium's extension stylesheet
  // can give body an OS-specific sans stack (for example DejaVu Sans on Linux).
  await expect(preview.locator("html")).toHaveCSS("font-family", /system-ui/);
  await expect(preview.locator("body")).toHaveCSS(
    "font-family",
    /\b(?:system-ui|sans-serif)\b/,
  );
  await accessible(preview);
  const form = await confirmPreview(extension.context, preview);
  await accessible(form);
  await fillTask(form);
  await form
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    form.getByRole("heading", { name: "Saved checkpoint", exact: true }),
  ).toBeVisible();
  await accessible(form);
  await form
    .getByRole("link", { name: "Edit checkpoint and history", exact: true })
    .first()
    .click();
  await expect(form.getByRole("status")).toContainText("revision 1");
  await accessible(form);
  await form.setViewportSize({ width: 320, height: 800 });
  await noOverflow(form);
  await form.emulateMedia({ reducedMotion: "reduce" });
  await form
    .getByRole("button", { name: "Revision history (1)", exact: true })
    .focus();
  await form.keyboard.press("Enter");
  await expect(
    form.getByRole("heading", { name: "Revision 1 · current", exact: true }),
  ).toBeVisible();
  await form
    .getByRole("button", { name: "Delete this task", exact: true })
    .focus();
  await form.keyboard.press("Enter");
  await accessible(form);
  await form.keyboard.press("Escape");
  await expect(
    form.getByRole("button", { name: "Delete this task", exact: true }),
  ).toBeFocused();
  await form.screenshot({
    path: info.outputPath("editor-narrow.png"),
    fullPage: true,
  });
});
test("@a11y comparison and recovery, including errors and narrow layouts", async ({
  extension,
}, info) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic accessibility case.",
  );
  const fixture = await scenario();
  const check = await seed(extension.context, fixture.url);
  await accessible(check);
  await fixture.version("v2");
  const source = await start(extension.context, check, fixture.url);
  const { preview } = await recapture(extension.context, source);
  const comparison = await confirm(extension.context, preview);
  await accessible(comparison);
  await saveComparison(comparison);
  await accessible(comparison);
  await comparison
    .getByRole("link", { name: "Review AI recovery", exact: true })
    .click();
  await expect(
    comparison.getByRole("button", {
      name: "Generate recovery suggestion",
      exact: true,
    }),
  ).toBeEnabled();
  await comparison
    .getByRole("button", { name: "Generate recovery suggestion", exact: true })
    .focus();
  await comparison.keyboard.press("Enter");
  await expect(
    comparison.getByRole("heading", {
      name: "Recovery suggestion · review required",
      exact: true,
    }),
  ).toBeFocused();
  await accessible(comparison);
  await comparison.setViewportSize({ width: 320, height: 800 });
  await noOverflow(comparison);
  await accessible(comparison);
  await comparison.screenshot({
    path: info.outputPath("recovery-narrow.png"),
    fullPage: true,
  });
});

test("@a11y long confirmed text reflows and 200-percent text retains usable controls", async ({
  extension,
}) => {
  const fixture = await scenario();
  const check = await seed(extension.context, fixture.url);
  const id = new URL(check.url()).searchParams.get("task");
  await check.goto(`${appUrl}/task?task=${id}`);
  await check.getByLabel("Your goal", { exact: true }).fill("A".repeat(300));
  await check
    .getByLabel("What have you completed?", { exact: true })
    .fill("B".repeat(3000));
  await check.getByRole("checkbox").check();
  await check
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(check.getByRole("status")).toContainText("revision 2");
  await check.setViewportSize({ width: 320, height: 800 });
  await noOverflow(check);
  await check.setViewportSize({ width: 1280, height: 900 });
  await check.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await noOverflow(check);
  await expect(
    check.getByRole("button", {
      name: "Save checkpoint revision",
      exact: true,
    }),
  ).toBeVisible();
});
