import Database from "better-sqlite3";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page, Worker } from "@playwright/test";
import { expect } from "@playwright/test";
import { test, appUrl, sourceUrl } from "./extension";
import { pair, openDisclosure } from "./observation-journey";
const headers = { "x-reentry-web": "1", origin: appUrl };
async function tasks(page: Page) {
  return (
    await page.request.get(`${appUrl}/api/agent/tasks`, { headers })
  ).json();
}
async function application(extension: Parameters<typeof pair>[0]) {
  const { app, companion } = await pair(extension);
  await app.reload();
  await app
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await app
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  const source = await extension.newPage();
  await source.goto(
    `${new URL(sourceUrl).origin}/observe.html?token=fictional-private#section`,
  );
  await expect(
    app.getByText("Work on the scholarship application", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await source.bringToFront();
  return { app, companion, source };
}
async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) =>
          Number.isFinite(a.effect?.getComputedTiming().endTime ?? 0),
        )
        .map((a) => a.finished.catch(() => undefined)),
    );
  });
}
async function settings(page: Page) {
  await openDisclosure(page, "AI and reminder settings");
  await page
    .getByRole("button", { name: "Reminder settings", exact: true })
    .click();
  await settle(page);
  return page.getByRole("dialog");
}
async function wake(worker: Worker) {
  // Fire the actual registered listener in a disposable extension worker. No
  // production clock override or reminder injection exists in the application.
  await worker.evaluate(async () => {
    await chrome.alarms.create("reentry-return-check", {
      when: Date.now() + 50,
    });
  });
}
function away(taskId: string) {
  // Accelerate only this test-owned SQLite activity clock, not model results.
  const db = new Database(
    path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "observations.sqlite"),
  );
  try {
    db.pragma("busy_timeout=5000");
    db.prepare(
      "UPDATE agent_recovery SET last_active=?,returned_at=NULL WHERE task_id=?",
    ).run(Date.now() - 46 * 60_000, taskId);
  } finally {
    db.close();
  }
}

test("interrupted application has a safe return link, waiting/snooze/cancel controls, persistent settings and accessible recovery", async ({
  extension,
}, info) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic policy/browser acceptance uses the local model fixture.",
  );
  test.setTimeout(90000);
  expect(
    await extension.worker.evaluate(() =>
      chrome.permissions.contains({ permissions: ["notifications", "idle"] }),
    ),
  ).toBe(false);
  let { app } = await application(extension.context);
  await expect(
    app.getByRole("button", { name: "Return to work", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const before = await tasks(app);
  const id = before.tasks[0].id;
  expect(before.recovery.policy.enabled).toBe(false);
  expect(before.recovery.items[0].url).toBe(
    `${new URL(sourceUrl).origin}/observe.html`,
  );
  const opened = extension.context.waitForEvent("page");
  await app
    .getByRole("button", { name: "Return to work", exact: true })
    .click();
  const returned = await opened;
  await expect(returned).toHaveURL(`${new URL(sourceUrl).origin}/observe.html`);
  await returned.close();
  const dialog = await settings(app);
  await dialog
    .getByLabel("Reminder timezone", { exact: true })
    .fill("Not/AZone");
  await dialog
    .getByRole("button", { name: "Save reminder settings", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("timezone");
  await dialog
    .getByLabel("Reminder timezone", { exact: true })
    .fill("Asia/Kolkata");
  await dialog
    .getByRole("button", { name: "Save reminder settings", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Return and reminder options", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Waiting for something", exact: true })
    .click();
  await expect(
    app.getByText("Waiting — reminders are paused until you resume.", {
      exact: true,
    }),
  ).toBeVisible();
  await app
    .getByRole("button", { name: "Resume this task", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Snooze for one hour", exact: true })
    .click();
  await expect(app.getByText("Snoozed until", { exact: false })).toBeVisible();
  await app
    .getByRole("button", {
      name: "Cancel reminders for this task",
      exact: true,
    })
    .click();
  await expect(
    app.getByText("Reminders cancelled for this task.", { exact: true }),
  ).toBeVisible();
  await app.bringToFront();
  away(id);
  await app.reload();
  await expect(
    app.getByText("Ready whenever you are. Here’s where you left off.", {
      exact: true,
    }),
  ).toBeVisible();
  await app.setViewportSize({ width: 360, height: 1000 });
  expect((await new AxeBuilder({ page: app }).analyze()).violations).toEqual(
    [],
  );
  // Declined and cancelled permission attempts are simulated only at the
  // native-dialog boundary; neither can silently save an enabled policy.
  const companion = extension.context
    .pages()
    .find((page) => page.url().endsWith("/companion.html"))!;
  await companion.evaluate(() =>
    Object.defineProperty(chrome.permissions, "request", {
      configurable: true,
      value: async () => false,
    }),
  );
  let permissionDialog = await settings(companion);
  await permissionDialog
    .getByRole("checkbox", { name: "Enable gentle reminders", exact: true })
    .check();
  await permissionDialog
    .getByRole("button", { name: "Save reminder settings", exact: true })
    .click();
  await expect(permissionDialog.getByRole("alert")).toContainText(
    "not allowed",
  );
  expect((await tasks(app)).recovery.policy.enabled).toBe(false);
  await permissionDialog
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await companion.evaluate(() =>
    Object.defineProperty(chrome.permissions, "request", {
      configurable: true,
      value: () =>
        new Promise<boolean>((resolve) => {
          (
            window as unknown as {
              resolveReminderPermission: (value: boolean) => void;
            }
          ).resolveReminderPermission = resolve;
        }),
    }),
  );
  permissionDialog = await settings(companion);
  await permissionDialog
    .getByRole("checkbox", { name: "Enable gentle reminders", exact: true })
    .check();
  await permissionDialog
    .getByRole("button", { name: "Save reminder settings", exact: true })
    .click();
  await expect(permissionDialog.getByRole("status")).toContainText(
    "permission choice",
  );
  await permissionDialog
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await companion.evaluate(() =>
    (
      window as unknown as {
        resolveReminderPermission: (value: boolean) => void;
      }
    ).resolveReminderPermission(true),
  );
  await expect
    .poll(async () => (await tasks(app)).recovery.policy.enabled)
    .toBe(false);
  await app.bringToFront();
  const secondDialog = await settings(app);
  await secondDialog
    .getByRole("button", {
      name: "Delivery and permission details",
      exact: true,
    })
    .click();
  await settle(app);
  await app.setViewportSize({ width: 320, height: 640 });
  await settle(app);
  const bounds = await secondDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
  expect(
    await secondDialog
      .getByLabel("Quiet hours start", { exact: true })
      .evaluate((input) => input.getBoundingClientRect().width),
  ).toBeGreaterThan(180);
  expect((await new AxeBuilder({ page: app }).analyze()).violations).toEqual(
    [],
  );
  await app.screenshot({ path: info.outputPath("reminder-settings.png") });
  await secondDialog
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  const restarted = await extension.restart();
  app = await restarted.context.newPage();
  await app.goto(`${appUrl}/observe`);
  const saved = await tasks(app);
  expect(saved.tasks[0].id).toBe(id);
  expect(saved.recovery.policy.timeZone).toBe("Asia/Kolkata");
  expect(saved.recovery.items[0].muted).toBe(true);
  expect(saved.recovery.items[0].snoozedUntil).not.toBeNull();
  await expect
    .poll(() =>
      restarted.worker.evaluate(async () =>
        Boolean(await chrome.alarms.get("reentry-return-check")),
      ),
    )
    .toBe(true);
});

test.describe("pregranted reminder API fixture", () => {
  test.use({ reminderPermissionFixture: true });
  test("local reminder uses real Chrome APIs once per day across restart and finishing clears its notification", async ({
    extension,
  }) => {
    test.skip(
      process.env.REENTRY_TEST_LIVE === "1",
      "Deterministic notification acceptance uses a fictional application.",
    );
    test.setTimeout(90000);
    const initial = await application(extension.context);
    let app = initial.app;
    const { companion, source } = initial;
    expect(
      await extension.worker.evaluate(() =>
        chrome.permissions.contains({ permissions: ["notifications", "idle"] }),
      ),
    ).toBe(true);
    const dialog = await settings(companion);
    await dialog
      .getByRole("checkbox", { name: "Enable gentle reminders", exact: true })
      .check();
    await dialog
      .getByRole("checkbox", { name: "Keep quiet hours", exact: true })
      .uncheck();
    await dialog
      .getByRole("button", { name: "Save reminder settings", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    expect(
      await extension.worker.evaluate(() =>
        chrome.permissions.contains({ permissions: ["notifications", "idle"] }),
      ),
    ).toBe(true);
    await source.close();
    await app.bringToFront();
    const id = (await tasks(app)).tasks[0].id;
    away(id);
    await wake(extension.worker);
    await expect
      .poll(
        () =>
          extension.worker.evaluate(async () =>
            Object.keys(await chrome.notifications.getAll()).filter((id) =>
              id.startsWith("reentry-return-"),
            ),
          ),
        { timeout: 15000 },
      )
      .toHaveLength(1);
    const notificationIds = await extension.worker.evaluate(async () =>
      Object.keys(await chrome.notifications.getAll()),
    );
    await wake(extension.worker);
    await app.waitForTimeout(500);
    expect(
      await extension.worker.evaluate(async () =>
        Object.keys(await chrome.notifications.getAll()),
      ),
    ).toEqual(notificationIds);
    const db = new Database(
      path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "observations.sqlite"),
    );
    try {
      expect(
        db
          .prepare("SELECT COUNT(*) AS n FROM agent_reminders WHERE task_id=?")
          .get(id),
      ).toEqual({ n: 1 });
    } finally {
      db.close();
    }
    await extension.worker.evaluate(() =>
      chrome.alarms.clear("reentry-return-check"),
    );
    const restarted = await extension.restart();
    app = await restarted.context.newPage();
    await app.goto(`${appUrl}/observe`);
    await expect
      .poll(() =>
        restarted.worker.evaluate(async () =>
          Boolean(await chrome.alarms.get("reentry-return-check")),
        ),
      )
      .toBe(true);
    // Browser restart may dismiss OS notifications. The durable daily reservation
    // must prevent another create even if nothing remains in the system tray.
    const ledger = await restarted.worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-notification-attempts-v1"))[
          "reentry-notification-attempts-v1"
        ],
    );
    expect(Object.keys(ledger as Record<string, number>)).toEqual(
      notificationIds,
    );
    await openDisclosure(app, "Task options");
    await app
      .getByRole("button", { name: "Mark finished", exact: true })
      .click();
    await app
      .getByRole("button", { name: "Yes, mark finished", exact: true })
      .click();
    await wake(restarted.worker);
    await expect
      .poll(() =>
        restarted.worker.evaluate(async () =>
          Object.keys(await chrome.notifications.getAll()).filter((id) =>
            id.startsWith("reentry-return-"),
          ),
        ),
      )
      .toEqual([]);
  });
});
