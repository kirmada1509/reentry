import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";
import { test, appUrl, sourceUrl, invokeToolbar } from "./extension";
import { pair } from "./observation-journey";

test("home and toolbar open automatic tracking without selected text; legacy capture bookmarks redirect", async ({
  extension,
}) => {
  const { context } = extension;
  const app = await context.newPage();
  await app.goto(appUrl);
  await expect(app).toHaveURL(`${appUrl}/observe`);
  await expect(
    app.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(
    app.getByText("Select instructions on a page", { exact: false }),
  ).toHaveCount(0);
  const source = await context.newPage();
  await source.goto(sourceUrl);
  const companion = await invokeToolbar(context, source);
  await expect(companion).toHaveURL(/companion\.html\?/);
  await expect(
    companion.getByRole("heading", { name: "Here with you." }),
  ).toBeVisible();
  await expect(companion.getByText("Capture needs attention")).toHaveCount(0);
  const legacy = await context.newPage();
  await legacy.goto(
    `chrome-extension://${DEFAULT_EXTENSION_ID}/capture.html?error=no-selection`,
  );
  await expect(legacy).toHaveURL(
    `chrome-extension://${DEFAULT_EXTENSION_ID}/companion.html`,
  );
  await expect(
    legacy.getByRole("heading", { name: "Here with you." }),
  ).toBeVisible();
});

test("an opened Moodle assignment becomes an unfinished task, retains its ID on return, and tracks draft versus submission", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic provider; real-model evaluation is separate.",
  );
  test.setTimeout(100000);
  const { context } = extension;
  const fixture = await readFile(
    "tests/fixtures/sites/assignment.html",
    "utf8",
  );
  const site = new URL(sourceUrl).origin;
  await context.route(`${site}/mod/assign/view.php?*`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        new URL(route.request().url()).searchParams.get("id") === "12309"
          ? fixture.replace(
              "No submissions have been made yet",
              "Submitted for grading",
            )
          : fixture,
    }),
  );
  const { app } = await pair(context);
  await app.reload();
  await app
    .getByRole("checkbox", { name: "Allow automatic local AI processing" })
    .check();
  await app
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  const source = await context.newPage();
  await source.goto(
    `${site}/mod/assign/view.php?id=12307&sesskey=fictional-secret#private`,
  );
  await expect(
    app.getByText("Submit Lab Assignment 1", { exact: true }),
  ).toBeVisible({ timeout: 25000 });
  const tasks = async () => {
    const response = await app.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    });
    return response.json();
  };
  const first = (await tasks()).tasks[0];
  expect(first.intent).toBe("assignment");
  expect(first.stage).toBe("ongoing");
  expect(first.resourceKey).toMatch(/^[a-f0-9]{64}$/);
  await expect(
    app.getByRole("textbox", { name: "Your goal", exact: true }),
  ).toHaveCount(0);
  // The actual browser owns and binds the URL. Return links exclude sesskey.
  await source.bringToFront();
  await extension.worker.evaluate(async () => {
    await chrome.alarms.create("reentry-return-check", {
      when: Date.now() + 50,
    });
  });
  await expect
    .poll(
      async () =>
        (await tasks()).recovery.items.find(
          (t: { taskId: string }) => t.taskId === first.id,
        )?.url,
      { timeout: 20000 },
    )
    .toBe(`${site}/mod/assign/view.php?id=12307`);
  await source.bringToFront();
  await source.getByRole("button", { name: "Save fictional draft" }).click();
  await expect
    .poll(async () => (await tasks()).tasks[0]?.progress.at(-1)?.kind, {
      timeout: 25000,
    })
    .toBe("draft_saved");
  expect((await tasks()).tasks[0].stage).toBe("ongoing");
  await source
    .getByRole("button", { name: "Submit fictional assignment" })
    .click();
  await expect
    .poll(async () => (await tasks()).tasks[0]?.stage, { timeout: 25000 })
    .toBe("completed");
  const other = await context.newPage();
  await other.goto(`${site}/mod/assign/view.php?id=12308`);
  await expect
    .poll(async () => (await tasks()).tasks.length, { timeout: 25000 })
    .toBe(2);
  expect(
    new Set(
      (await tasks()).tasks.map((t: { resourceKey: string }) => t.resourceKey),
    ).size,
  ).toBe(2);
  await other.goto(`${site}/mod/assign/view.php?id=12309`);
  await expect
    .poll(async () => {
      const response = await app.request.get(`${appUrl}/api/agent/web`, {
        headers: { "x-reentry-web": "1", origin: appUrl },
      });
      return (await response.json()).observations[0]?.page.content.includes(
        "Submitted for grading",
      );
    })
    .toBe(true);
  expect((await tasks()).tasks).toHaveLength(2);
  expect((await tasks()).status).not.toBe("unavailable");
});
