import { writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { test, appUrl, sourceUrl } from "./extension";
import { pair, openDisclosure } from "./observation-journey";
import type { AgentView } from "../../src/features/agent/schema";

const origin = new URL(sourceUrl).origin;
test("@progress Northstar draft, changed instructions, validation, final review and matching receipt survive return", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic model contract journey.",
  );
  test.setTimeout(150000);
  const scenario = path.join(
    process.env.REENTRY_TEST_FIXTURE_DIR!,
    "portal/scenario.json",
  );
  await writeFile(scenario, JSON.stringify({ version: "v1" }));
  const { app } = await pair(extension.context);
  const work = await extension.context.newPage();
  const read = async (): Promise<AgentView> => {
    const res = await app.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    });
    return res.json();
  };
  const checkpoint = async (kind: string) =>
    expect
      .poll(async () => (await read()).tasks[0]?.progress.at(-1)?.kind, {
        timeout: 30000,
      })
      .toBe(kind);
  await work.goto(`${origin}/portal/application.html`);
  await work
    .getByLabel("Your statement", { exact: true })
    .fill("A fictional student statement about water research.");
  await work
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await work.getByLabel("First referee", { exact: true }).fill("Sample mentor");
  await work
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await app.reload();
  await app
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await app
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  await checkpoint("draft_saved");
  const id = (await read()).tasks[0]!.id;
  await writeFile(scenario, JSON.stringify({ version: "v2" }));
  await work.reload();
  await expect(
    work.getByRole("button", { name: "Remove sample transcript", exact: true }),
  ).toBeVisible();
  await checkpoint("requirements_changed");
  expect(
    (await read()).tasks[0]!.progress.some((p) => p.kind === "draft_saved"),
  ).toBe(true);
  await work
    .getByRole("button", { name: "Review application", exact: true })
    .click();
  await work
    .getByRole("button", { name: "Submit fictional application", exact: true })
    .click();
  await expect(work.getByRole("dialog").getByRole("alert")).toContainText(
    "Validation error",
  );
  await checkpoint("blocked");
  expect((await read()).tasks[0]!.stage).not.toBe("completed");
  await work
    .getByRole("button", { name: "Back to draft", exact: true })
    .click();
  await work
    .getByLabel("Second referee", { exact: true })
    .fill("Another sample mentor");
  await work
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await work
    .getByRole("button", { name: "Review application", exact: true })
    .click();
  await checkpoint("review_ready");
  await work
    .getByRole("button", { name: "Submit fictional application", exact: true })
    .click();
  await expect(
    work.getByRole("heading", {
      name: "Application successfully submitted",
      exact: true,
    }),
  ).toBeVisible();
  await checkpoint("confirmed");
  expect((await read()).tasks[0]).toMatchObject({ id, stage: "completed" });
  await app.reload();
  await expect(
    app.getByText("Confirmation observed", { exact: true }),
  ).toBeVisible();
  await app
    .getByRole("button", { name: "Why this task?", exact: true })
    .click();
  await app.setViewportSize({ width: 360, height: 1000 });
  expect((await new AxeBuilder({ page: app }).analyze()).violations).toEqual(
    [],
  );
  expect(
    await app.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const returned = await extension.restart();
  const receipt = await returned.context.newPage();
  await receipt.goto(`${origin}/portal/application.html`);
  await expect(
    receipt.getByRole("heading", {
      name: "Application successfully submitted",
      exact: true,
    }),
  ).toBeVisible();
  const home = await returned.context.newPage();
  await home.goto(`${appUrl}/observe`);
  await expect(
    home.getByText("Confirmation observed", { exact: true }),
  ).toBeVisible();
  await openDisclosure(home, "Task options");
  await home.getByRole("button", { name: "Delete task", exact: true }).click();
  await home
    .getByRole("button", { name: "Delete task and history", exact: true })
    .click();
  await expect(
    home.getByText("Work on the scholarship application", { exact: true }),
  ).toHaveCount(0);
});

test("@progress Northstar failed receipt storage never acknowledges success", async ({
  extension,
}) => {
  const page = await extension.context.newPage();
  await page.goto(`${origin}/portal/application.html`);
  await page
    .getByLabel("Your statement", { exact: true })
    .fill("Fictional study plan");
  await page.getByLabel("First referee", { exact: true }).fill("Sample mentor");
  const second = page.getByLabel("Second referee", { exact: true });
  if (await second.count()) await second.fill("Second mentor");
  await page
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review application", exact: true })
    .click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes("receipt"))
        throw new DOMException("Fixture quota failure", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "Submit fictional application", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "could not be saved",
  );
  await expect(
    page.getByRole("heading", {
      name: "Application successfully submitted",
      exact: true,
    }),
  ).toHaveCount(0);
});
