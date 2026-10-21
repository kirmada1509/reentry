import { expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { test } from "./extension";
import {
  scenario,
  seed,
  start,
  recapture,
  confirm,
  saveComparison,
} from "./source-journey";
const live = process.env.REENTRY_TEST_LIVE === "1";
async function recovery(context: BrowserContext, goal = "Finish application") {
  const fixture = await scenario();
  let task = await seed(context, fixture.url, goal);
  if (live) {
    const returnUrl = task.url();
    await task.close();
    task = await context.newPage();
    await task.goto(returnUrl);
  }
  await fixture.version("v2");
  const source = await start(context, task, fixture.url);
  const { preview } = await recapture(context, source);
  const comparison = await confirm(context, preview, goal);
  await saveComparison(comparison);
  await comparison
    .getByRole("link", { name: "Review AI recovery", exact: true })
    .click();
  await expect(
    comparison.getByRole("button", {
      name: "Generate recovery suggestion",
      exact: true,
    }),
  ).toBeEnabled({ timeout: 30000 });
  return { page: comparison, fixture, check: task };
}
async function generate(page: Page) {
  await page
    .getByRole("button", { name: "Generate recovery suggestion", exact: true })
    .click();
}
async function preserved(page: Page) {
  await expect(
    page.getByText("Transcript attached", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Saved checkpoint", exact: true })
      .getByText("Find first referee", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open saved work manually", exact: true }),
  ).toBeVisible();
}

test.describe("@recovery deterministic model sandbox", () => {
  test.skip(live, "Synthetic sandbox suite; live path is separate.");
  test("validated recovery can be corrected, saved, refreshed and continued at the saved work URL", async ({
    extension,
  }) => {
    const { page, fixture } = await recovery(extension.context);
    await generate(page);
    await expect(
      page.getByRole("heading", {
        name: "Recovery suggestion · review required",
        exact: true,
      }),
    ).toBeVisible();
    await preserved(page);
    await expect(
      page.getByRole("region", { name: "Evidence 1", exact: true }),
    ).toContainText("Supply two referees.");
    await expect(
      page.getByRole("button", { name: "Continue to saved work", exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel("Reviewed next action", { exact: true })
      .fill("Ask Alex to be the first referee.");
    await page
      .getByRole("button", { name: "Save reviewed recovery", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Reviewed action saved",
    );
    await page.reload();
    await expect(
      page.getByLabel("Reviewed next action", { exact: true }),
    ).toHaveValue("Ask Alex to be the first referee.");
    const created = extension.context.waitForEvent("page");
    await page
      .getByRole("button", { name: "Continue to saved work", exact: true })
      .click();
    const work = await created;
    await work.waitForURL(fixture.url + "#work");
    await preserved(page);
  });
  for (const mode of [
    "malformed",
    "bad-quote",
    "progress",
    "completion",
    "destination",
    "unavailable",
    "timeout",
  ])
    test(`rejects ${mode} while preserving manual recovery and facts`, async ({
      extension,
    }) => {
      const { page } = await recovery(extension.context, `case:${mode}`);
      await generate(page);
      await expect(
        page.getByRole("alert", {
          name: "Recovery needs attention",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Recovery suggestion · review required",
          exact: true,
        }),
      ).toHaveCount(0);
      await preserved(page);
      await page.reload();
      await preserved(page);
    });
  test("cancelled request cannot become a saved suggestion", async ({
    extension,
  }) => {
    const { page } = await recovery(extension.context, "case:cancel");
    await generate(page);
    await page
      .getByRole("button", { name: "Cancel recovery", exact: true })
      .click();
    await expect(
      page.getByRole("alert", {
        name: "Recovery needs attention",
        exact: true,
      }),
    ).toContainText("cancelled");
    await page.waitForTimeout(3200);
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Recovery suggestion · review required",
        exact: true,
      }),
    ).toHaveCount(0);
    await preserved(page);
  });
  test("late response after a newer source check is rejected without saving", async ({
    extension,
  }) => {
    const { page, fixture } = await recovery(extension.context);
    await page.route("**/api/recovery", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      const another = await extension.context.newPage();
      const taskId = new URL(page.url()).searchParams.get("task");
      await another.goto(new URL(`/check?task=${taskId}`, page.url()).href);
      await start(extension.context, another, fixture.url);
      await route.fulfill({ response });
    });
    await generate(page);
    await expect(
      page.getByRole("alert", {
        name: "Recovery needs attention",
        exact: true,
      }),
    ).toBeVisible();
    await preserved(page);
    await expect(
      page.getByRole("heading", {
        name: "Recovery suggestion · review required",
        exact: true,
      }),
    ).toHaveCount(0);
  });
});

test("@live real extension, changed source, local model, correction and Continue", async ({
  extension,
}, info) => {
  test.skip(!live, "Run explicitly with REENTRY_TEST_LIVE=1 and local Ollama.");
  test.setTimeout(90000);
  const { page, fixture } = await recovery(extension.context);
  await generate(page);
  await expect(
    page.getByRole("heading", {
      name: "Recovery suggestion · review required",
      exact: true,
    }),
  ).toBeVisible({ timeout: 35000 });
  await expect(
    page.getByRole("heading", {
      name: "Instructions affect your next step",
      exact: true,
    }),
  ).toBeVisible();
  await preserved(page);
  await expect(
    page.getByLabel("Reviewed next action", { exact: true }),
  ).toHaveValue(/first.*referee/i);
  const evidence = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("reentry");
        request.onerror = () =>
          reject(new Error("Evidence database unavailable"));
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(
            ["tasks", "checks", "recoveries"],
            "readonly",
          );
          const tasks = transaction.objectStore("tasks").getAll();
          const checks = transaction.objectStore("checks").getAll();
          const recoveries = transaction.objectStore("recoveries").getAll();
          transaction.oncomplete = () => {
            db.close();
            resolve({
              tasks: tasks.result,
              checks: checks.result,
              recoveries: recoveries.result,
            });
          };
          transaction.onerror = () => {
            db.close();
            reject(new Error("Evidence read failed"));
          };
        };
      }),
  );
  await info.attach("actual-browser-recovery", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath("live-recovery.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Reviewed next action", { exact: true })
    .fill("Ask Alex to be my first referee; then find the second.");
  await page
    .getByRole("button", { name: "Save reviewed recovery", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Reviewed action saved");
  const opened = extension.context.waitForEvent("page");
  await page
    .getByRole("button", { name: "Continue to saved work", exact: true })
    .click();
  await (await opened).waitForURL(fixture.url + "#work");
});
