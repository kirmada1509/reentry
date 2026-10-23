import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import { test, appUrl, sourceUrl } from "./extension";
import { pair, openDisclosure } from "./observation-journey";

test("automatic tasks distinguish research and purchase, group tabs, persist corrections and need separate consent", async ({
  extension,
}) => {
  const { context } = extension;
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic fake-model acceptance; separate live evaluation.",
  );
  test.setTimeout(90000);
  const { app, companion } = await pair(context);
  const source = await context.newPage();
  await source.goto(`${new URL(sourceUrl).origin}/research.html`);
  await expect
    .poll(async () => {
      const response = await app.request.get(`${appUrl}/api/agent/web`, {
        headers: { "x-reentry-web": "1", origin: appUrl },
      });
      return (await response.json()).observations.length;
    })
    .toBe(1);
  await source.waitForTimeout(6500);
  const quiet = await app.request.get(`${appUrl}/api/agent/web`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  expect((await quiet.json()).observations).toHaveLength(1);
  await expect
    .poll(async () => {
      const res = await app.request.get(`${appUrl}/api/agent/tasks`, {
        headers: { "x-reentry-web": "1", origin: appUrl },
      });
      return (await res.json()).tasks.length;
    })
    .toBe(0);
  await app.reload();
  await app
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await app
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  await expect(
    app.getByText("Compare the Cedar backpack", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    app.getByText("Research, with no purchase obligation", { exact: false }),
  ).toBeVisible();
  await expect(
    companion.getByText("Compare the Cedar backpack", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const state = await app.request.get(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  const id = (await state.json()).tasks[0].id;
  const tab = await context.newPage();
  await tab.goto(`${new URL(sourceUrl).origin}/research.html`);
  await tab.getByRole("button", { name: "Add to fictional cart" }).click();
  await expect(
    app.getByText("Buy the Cedar backpack", { exact: true }),
  ).toBeVisible({ timeout: 25000 });
  const updated = await app.request.get(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  const tasks = (await updated.json()).tasks;
  expect(tasks).toHaveLength(1);
  expect(tasks[0].id).toBe(id);
  await openDisclosure(app, "Task options");
  await app
    .getByRole("button", { name: "Correct this task", exact: true })
    .click();
  await app
    .getByLabel("Goal", { exact: true })
    .fill("Only compare a bag for next month");
  await app
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await app.reload();
  await expect(
    app.getByText("Only compare a bag for next month", { exact: true }),
  ).toBeVisible();
  await tab.getByRole("button", { name: "Start fictional checkout" }).click();
  await expect
    .poll(
      async () => {
        const res = await app.request.get(`${appUrl}/api/agent/tasks`, {
          headers: { "x-reentry-web": "1", origin: appUrl },
        });
        return (await res.json()).tasks[0].revision;
      },
      { timeout: 25000 },
    )
    .toBeGreaterThan(tasks[0].revision + 1);
  await app.reload();
  await expect(
    app.getByText("Only compare a bag for next month", { exact: true }),
  ).toBeVisible();
  await openDisclosure(app, "Task options");
  await app
    .getByRole("button", { name: "Correct this task", exact: true })
    .click();
  const dialog = app.getByRole("dialog");
  await dialog
    .getByLabel("Goal", { exact: true })
    .fill("My unsaved correction");
  await companion
    .getByRole("button", { name: "Pause observation", exact: true })
    .click();
  await companion
    .getByRole("button", { name: "Resume observation", exact: true })
    .click();
  await expect(
    app.getByText("AI task understanding is off.", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Goal", { exact: true })).toHaveValue(
    "My unsaved correction",
  );
  const latest = await app.request.get(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  const current = (await latest.json()).tasks[0];
  const conflict = await app.request.post(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
    data: {
      action: "correct",
      id: current.id,
      expectedRevision: current.revision,
      goal: "Saved from another tab",
      finishCondition: current.finishCondition,
      intent: current.intent,
    },
  });
  expect(conflict.status()).toBe(200);
  await dialog
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("changed");
  await expect(dialog.getByLabel("Goal", { exact: true })).toHaveValue(
    "My unsaved correction",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await app
    .getByRole("button", { name: "Browser settings", exact: true })
    .focus();
  await expect(
    app.getByText("Saved from another tab", { exact: true }),
  ).toBeVisible();
  await openDisclosure(app, "Task options");
  await app.getByRole("button", { name: "Mark finished", exact: true }).click();
  await app
    .getByRole("button", { name: "Yes, mark finished", exact: true })
    .click();
  await expect(
    app.getByText("Marked finished by you", { exact: true }),
  ).toBeVisible();
  await openDisclosure(app, "Task options");
  await app.getByRole("button", { name: "Reopen task", exact: true }).click();
  await expect(app.getByText("Needs clarity", { exact: true })).toBeVisible();
  await openDisclosure(app, "Task options");
  await app.getByRole("button", { name: "Delete task", exact: true }).click();
  const beforeDelete = (
    await (
      await app.request.get(`${appUrl}/api/agent/tasks`, {
        headers: { "x-reentry-web": "1", origin: appUrl },
      })
    ).json()
  ).tasks[0];
  const changed = await app.request.post(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
    data: {
      action: "correct",
      id: beforeDelete.id,
      expectedRevision: beforeDelete.revision,
      goal: "Changed before deletion",
      intent: beforeDelete.intent,
      finishCondition: beforeDelete.finishCondition,
    },
  });
  expect(changed.status()).toBe(200);
  await app
    .getByRole("button", { name: "Delete task and history", exact: true })
    .click();
  await expect(app.getByRole("dialog").getByRole("alert")).toContainText(
    "changed",
  );
  await app.getByRole("button", { name: "Keep task", exact: true }).click();
  await app
    .getByRole("button", { name: "Browser settings", exact: true })
    .focus();
  await expect(
    app.getByText("Changed before deletion", { exact: true }),
  ).toBeVisible();
  await app.setViewportSize({ width: 360, height: 1000 });
  expect((await new AxeBuilder({ page: app }).analyze()).violations).toEqual(
    [],
  );
  expect(
    await app.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("application intent appears without a task form and stays unverified after submit attempt", async ({
  extension,
}) => {
  const { context } = extension;
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Synthetic-model application acceptance.",
  );
  let { app } = await pair(context);
  await app.reload();
  await app
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await app
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  await app.close();
  const source = await context.newPage();
  await source.goto(`${new URL(sourceUrl).origin}/observe.html`);
  await expect
    .poll(
      async () => {
        const response = await source.request.get(`${appUrl}/api/agent/tasks`, {
          headers: { "x-reentry-web": "1", origin: appUrl },
        });
        return (await response.json()).tasks.length;
      },
      { timeout: 20000 },
    )
    .toBe(1);
  app = await context.newPage();
  await app.goto(`${appUrl}/observe`);
  await expect(
    app.getByText("Work on the scholarship application", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await source
    .getByRole("button", { name: "Submit fictional application" })
    .click();
  await openDisclosure(app, "Recent observations");
  await expect(
    app.getByText("Submission attempted; success is unverified", {
      exact: false,
    }),
  ).toBeVisible({ timeout: 15000 });
  const response = await app.request.get(`${appUrl}/api/agent/tasks`, {
    headers: { "x-reentry-web": "1", origin: appUrl },
  });
  const data = await response.json();
  expect(data.tasks).toHaveLength(1);
  expect(data.tasks[0].stage).not.toBe("completed");
});
