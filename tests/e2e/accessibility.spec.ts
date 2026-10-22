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
  await page
    .locator("[data-slot=dialog-content]")
    .evaluateAll(async (elements) => {
      await Promise.all(
        elements.flatMap((element) =>
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        ),
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
  await app.goto(appUrl);
  await accessible(app);
  const { preview } = await captureSelection(extension.context);
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
