import { randomUUID } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { taskSchema } from "../../src/features/agent/schema";
import { test, appUrl, sourceUrl } from "./extension";
import { pair, openDisclosure } from "./observation-journey";
const headers = { "x-reentry-web": "1", origin: appUrl };
function seed(count = 3) {
  const db = new Database(
    path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "observations.sqlite"),
  );
  try {
    db.pragma("busy_timeout=5000");
    return Array.from({ length: count }, (_, index) => {
      const task = taskSchema.parse({
        id: randomUUID(),
        revision: 1,
        origin: new URL(sourceUrl).origin,
        goal:
          index === 0
            ? "Northstar application with a longer but readable goal"
            : "Prepare fictional application " + (index + 1),
        finishCondition:
          "Observe a fresh matching submission confirmation for this fictional award",
        intent: "application",
        stage: "ongoing",
        nextAction: "Add the second referee, then review the application",
        evidence: [
          {
            eventId: randomUUID(),
            quote: "The fictional requirements now ask for two referees.",
          },
        ],
        corrected: false,
        dismissed: false,
        updatedAt: new Date().toISOString(),
        progress: [
          {
            kind: "requirements_changed",
            summary:
              "Requirements ask for a second referee; the first is still saved.",
            eventId: randomUUID(),
            observedAt: new Date().toISOString(),
            evidence: [
              { eventId: randomUUID(), quote: "Two referees are required." },
            ],
          },
        ],
      });
      db.prepare("INSERT INTO agent_tasks VALUES(?,?)").run(
        task.id,
        JSON.stringify(task),
      );
      db.prepare("INSERT INTO agent_task_history VALUES(?,?,?)").run(
        task.id,
        1,
        JSON.stringify(task),
      );
      db.prepare(
        "INSERT INTO agent_recovery(task_id,last_active,url) VALUES(?,?,?)",
      ).run(
        task.id,
        Date.now() - 46 * 60_000,
        `${new URL(sourceUrl).origin}/observe.html`,
      );
      return task;
    });
  } finally {
    db.close();
  }
}
async function prepared(page: Page) {
  await page.reload();
  await page
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await page
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
}
async function settled(page: Page) {
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
async function accessible(page: Page) {
  await settled(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function state(page: Page) {
  return (
    await page.request.get(`${appUrl}/api/agent/tasks`, { headers })
  ).json();
}

test("task cards stay in place and keep keyboard focus during background changes; explicit review releases saved updates", async ({
  extension,
}, info) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Synthetic stored-state accessibility fixture.",
  );
  test.setTimeout(90000);
  const { app } = await pair(extension.context);
  await prepared(app);
  const records = seed();
  await app.reload();
  await expect(app.getByRole("article")).toHaveCount(3);
  expect(
    await app
      .getByRole("button", { name: "Browser settings", exact: true })
      .getAttribute("aria-expanded"),
  ).toBe("false");
  expect(
    await app
      .getByRole("button", { name: "AI and reminder settings", exact: true })
      .getAttribute("aria-expanded"),
  ).toBe("false");
  const first = app.locator(`[data-task-card="${records[0]!.id}"]`),
    second = app.locator(`[data-task-card="${records[1]!.id}"]`);
  const focus = second.getByRole("button", {
    name: "Return to work",
    exact: true,
  });
  await app.bringToFront();
  await focus.focus();
  expect(await app.evaluate(() => document.hasFocus())).toBe(true);
  const before = await focus.boundingBox();
  await app.evaluate(() => {
    const events: { focus: number; scroll: number } = { focus: 0, scroll: 0 };
    (window as unknown as { calmEvents: typeof events }).calmEvents = events;
    document.addEventListener("focusin", () => events.focus++);
    window.addEventListener("scroll", () => events.scroll++);
  });
  const response = await app.request.post(`${appUrl}/api/agent/tasks`, {
    headers,
    data: {
      action: "correct",
      id: records[0]!.id,
      expectedRevision: 1,
      goal: "A revised fictional application goal that should wait while another card is focused",
      intent: "application",
      finishCondition: records[0]!.finishCondition,
    },
  });
  expect(response.status()).toBe(200);
  await expect(
    app.getByText("New updates are saved.", { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  await expect(focus).toBeFocused();
  expect((await focus.boundingBox())!.y).toBe(before!.y);
  await expect(first.getByRole("heading")).toHaveText(records[0]!.goal);
  expect(
    await app.evaluate(
      () =>
        (window as unknown as { calmEvents: { focus: number; scroll: number } })
          .calmEvents,
    ),
  ).toEqual({ focus: 0, scroll: 0 });
  await expect(app.locator("[data-sonner-toast]")).toHaveCount(0);
  await app
    .getByRole("button", { name: "Review saved updates", exact: true })
    .click();
  await expect(first.getByRole("heading")).toContainText(
    "A revised fictional application goal",
  );
  await expect(app.getByRole("article")).toHaveCount(3);
  await app.setViewportSize({ width: 1280, height: 900 });
  await settled(app);
  await app.screenshot({
    path: info.outputPath("task-home.png"),
    fullPage: true,
  });
  // A stale activeElement in a hidden app must not freeze progress indefinitely.
  await focus.focus();
  const other = await extension.context.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  // Playwright emulates focused documents in every headless tab by default.
  const cdp = await extension.context.newCDPSession(app);
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await expect.poll(() => app.evaluate(() => document.hasFocus())).toBe(false);
  const background = await app.request.post(`${appUrl}/api/agent/tasks`, {
    headers,
    data: {
      action: "correct",
      id: records[1]!.id,
      expectedRevision: 1,
      goal: "Updated while ReEntry was in the background",
      intent: "application",
      finishCondition: records[1]!.finishCondition,
    },
  });
  expect(background.status()).toBe(200);
  await expect(second.getByRole("heading")).toHaveText(
    "Updated while ReEntry was in the background",
  );
  await expect(
    app.getByRole("button", { name: "Review saved updates", exact: true }),
  ).toHaveCount(0);
  await cdp.detach();
  await other.close();
});

test("late polling cannot overwrite a saved correction; keyboard dialogs preserve drafts, inspect history and restore focus", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic response-race fixture.",
  );
  test.setTimeout(90000);
  const { app } = await pair(extension.context);
  await prepared(app);
  const [task] = seed(1);
  await app.reload();
  const snapshot = await state(app);
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  await app.route("**/api/agent/tasks", async (route) => {
    if (route.request().method() === "GET" && !held) {
      held = true;
      await wait;
      await route.fulfill({ json: snapshot });
    } else await route.continue();
  });
  await expect.poll(() => held, { timeout: 15000 }).toBe(true);
  await openDisclosure(app, "Task options");
  const trigger = app.getByRole("button", {
    name: "Correct this task",
    exact: true,
  });
  await trigger.focus();
  await app.keyboard.press("Enter");
  const dialog = app.getByRole("dialog");
  await dialog.getByLabel("Goal", { exact: true }).fill("x");
  await dialog
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(dialog.getByLabel("Goal", { exact: true })).toBeFocused();
  await expect(dialog.getByLabel("Goal", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await dialog
    .getByLabel("Goal", { exact: true })
    .fill("My saved correction must win over a delayed poll");
  await dialog
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  release();
  await expect(
    app.getByRole("heading", {
      name: "My saved correction must win over a delayed poll",
      exact: true,
    }),
  ).toBeVisible();
  await app.waitForTimeout(300);
  await expect(
    app.getByRole("heading", { name: task!.goal, exact: true }),
  ).toHaveCount(0);
  await app.unroute("**/api/agent/tasks");
  await app
    .getByRole("button", { name: "Revision history", exact: true })
    .click();
  const history = app.getByRole("dialog");
  await expect(history.getByText(/^Revision 2 ·/)).toBeVisible();
  await expect(history.getByText(task!.goal, { exact: true })).toBeVisible();
  await accessible(app);
  await app.keyboard.press("Escape");
  await expect(
    app.getByRole("button", { name: "Revision history", exact: true }),
  ).toBeFocused();
  await app.getByRole("button", { name: "Mark finished", exact: true }).click();
  await app
    .getByRole("button", { name: "Yes, mark finished", exact: true })
    .click();
  await expect(
    app.getByRole("button", { name: "Reopen task", exact: true }),
  ).toBeFocused();
});

test("real task and companion screens reflow with long content, 200-percent text, 400-percent viewport and reduced motion", async ({
  extension,
}, info) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Synthetic content and accessibility acceptance.",
  );
  test.setTimeout(90000);
  const { app, companion } = await pair(extension.context);
  await prepared(app);
  const records = seed(6);
  const changed = await app.request.post(`${appUrl}/api/agent/tasks`, {
    headers,
    data: {
      action: "correct",
      id: records[0]!.id,
      expectedRevision: 1,
      goal: "A".repeat(160),
      intent: "application",
      finishCondition:
        "A long finish condition with an uninterrupted identifier: " +
        "z".repeat(180),
    },
  });
  expect(changed.status()).toBe(200);
  await app.reload();
  await expect(app.getByRole("article")).toHaveCount(6);
  for (const page of [app, companion]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 640 });
    await expect(page.getByRole("article")).toHaveCount(6, { timeout: 15000 });
    await accessible(page);
    const first = page.getByRole("article").first();
    await first
      .getByRole("button", { name: "Task options", exact: true })
      .click();
    await first
      .getByRole("button", { name: "Correct this task", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    expect(
      await dialog.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
    expect(
      await page
        .locator('[data-slot="dialog-overlay"]')
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
    await accessible(page);
    const bounds = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: innerHeight };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    await page.keyboard.press("Escape");
    await expect(
      first.getByRole("button", { name: "Correct this task", exact: true }),
    ).toBeFocused();
    await page.setViewportSize({ width: 640, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await accessible(page);
    await first
      .getByRole("button", { name: "Revision history", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText(/^Revision 2 ·/),
    ).toBeVisible();
    await accessible(page);
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await settled(page);
    await page.screenshot({
      path: info.outputPath(
        page === app ? "task-home-narrow.png" : "companion-narrow.png",
      ),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
  }
});

test("failed clear remains visibly unsaved in its dialog and a successful clear cannot be repopulated by an old read", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Injected local transport failure.",
  );
  test.setTimeout(90000);
  const { app } = await pair(extension.context);
  await prepared(app);
  seed(1);
  await app.reload();
  await expect(app.getByRole("article")).toHaveCount(1);
  await app.route("**/api/agent/web", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON().action === "clear"
    )
      await route.fulfill({
        status: 503,
        json: { error: "Injected sandbox failure" },
      });
    else await route.continue();
  });
  await app
    .getByRole("button", {
      name: "Disconnect and clear observations",
      exact: true,
    })
    .click();
  const dialog = app.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Disconnect and clear", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("could not save");
  expect((await state(app)).tasks).toHaveLength(1);
  await app.unroute("**/api/agent/web");
  const snapshot = await state(app);
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  await app.route("**/api/agent/tasks", async (route) => {
    if (route.request().method() === "GET" && !held) {
      held = true;
      await wait;
      await route.fulfill({ json: snapshot });
    } else await route.continue();
  });
  await expect.poll(() => held, { timeout: 15000 }).toBe(true);
  await dialog
    .getByRole("button", { name: "Disconnect and clear", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  release();
  await app.waitForTimeout(300);
  await expect(app.getByRole("article")).toHaveCount(0);
  await expect(
    app.getByRole("button", { name: "Connect browser", exact: true }),
  ).toBeVisible();
});
