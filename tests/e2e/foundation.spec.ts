import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { test, appUrl, sourceUrl, invokeCapture } from "./extension";

test("calm fictional preview supports correction, restart, companion and empty states", async ({
  page,
}) => {
  await page.goto(`${appUrl}/preview`);
  await expect(
    page.getByRole("heading", { name: "A little easier to return." }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional preview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Correct this" }).click();
  await page.getByRole("button", { name: "I’m only researching" }).click();
  await expect(
    page.getByRole("heading", { name: "Research the Northstar scholarship" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Research the Northstar scholarship" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Companion preview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Beside your work" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume preview", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore preview states and settings" })
    .click();
  await page.getByRole("button", { name: "Dismiss example task" }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for your next beginning" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore an example" }).click();
  await page.getByRole("button", { name: "Task details", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "How you got here" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your correction · Read requirements before deciding whether to apply.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("preview has no axe violations or horizontal overflow at side-panel width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${appUrl}/preview?view=companion`);
  await expect(
    page.getByRole("heading", { name: "Beside your work" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Return to this task", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Why this?", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running"),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Correct this" }).click();
  await expect(page.getByLabel("Your goal", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Correct this" }),
  ).toBeFocused();
});

test("patched page reader runs in real activeTab context without changing the page or exposing seeded answers", async ({
  extension,
}) => {
  const page = await extension.context.newPage();
  await page.goto(sourceUrl);
  const preview = await invokeCapture(extension.context, page);
  await preview.close();
  await page.bringToFront();
  await page.evaluate(() => {
    const section = document.createElement("section");
    section.innerHTML = `<h2>Foundation application</h2><p>Supply two referees. Save your draft.</p><form>
      <label>Applicant name<input id="foundation-name" value="SyntheticPrivateName"></label>
      <label>Password<input type="password" value="SyntheticPassword92"></label>
      <label>Statement<textarea>SyntheticPrivateStatement</textarea></label>
      <input type="hidden" value="SyntheticHiddenToken"><input autocomplete="cc-number" value="4111222233334444">
      <div contenteditable="true">SyntheticPrivateEditor</div><div data-private>SyntheticPrivateBlock</div>
      <button type="button">Save draft</button></form>`;
    document.body.append(section);
    document.getElementById("foundation-name")!.focus();
    Object.assign(window, { __foundationMutations: 0 });
    new MutationObserver((mutations) => {
      const target = window as unknown as { __foundationMutations: number };
      target.__foundationMutations += mutations.length;
    }).observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  });
  const result = await extension.worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}*` });
    if (!tab?.id) throw new Error("Test tab missing");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["reader-spike.js"],
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        (globalThis as unknown as { __reentryReaderFoundation: unknown })
          .__reentryReaderFoundation,
    });
    return results[0]?.result;
  }, sourceUrl);
  expect(JSON.stringify(result)).toContain("Supply two referees");
  expect(JSON.stringify(result)).not.toMatch(
    /SyntheticPrivate|SyntheticPassword|SyntheticHidden|4111222233334444/,
  );
  expect(JSON.stringify(result).length).toBeLessThan(8500);
  await expect(page.locator("#foundation-name")).toBeFocused();
  await expect(page.locator("#foundation-name")).toHaveValue(
    "SyntheticPrivateName",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __foundationMutations: number })
          .__foundationMutations,
    ),
  ).toBe(0);
});
