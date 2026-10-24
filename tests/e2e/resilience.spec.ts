import { expect } from "@playwright/test";
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

async function editor(context: import("@playwright/test").BrowserContext) {
  const fixture = await scenario();
  const check = await seed(context, fixture.url);
  const id = new URL(check.url()).searchParams.get("task")!;
  await check.goto(`${appUrl}/task?task=${id}`);
  await expect(check.getByRole("status")).toContainText("revision 1");
  return { page: check, id, fixture };
}

test("@resilience edits, recovers a draft after refresh, restores and deletes without resurrection", async ({
  extension,
}) => {
  const { page, id } = await editor(extension.context);
  await page
    .getByLabel("What have you completed?", { exact: true })
    .fill("Transcript prepared; not uploaded.");
  await expect(page.getByRole("status")).toContainText("Draft kept");
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Recovered your local draft",
  );
  await expect(
    page.getByLabel("What have you completed?", { exact: true }),
  ).toHaveValue("Transcript prepared; not uploaded.");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 2");
  await page
    .getByRole("button", { name: "Revision history (2)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore revision 1", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 3");
  await expect(
    page.getByLabel("What have you completed?", { exact: true }),
  ).toHaveValue("Transcript attached");
  await page
    .getByRole("button", { name: "Delete this task", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Delete this task", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Delete this task", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete task", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("deleted");
  await page.goto(`${appUrl}/task?task=${id}`);
  await expect(
    page.getByRole("alert", {
      name: "Checkpoint needs attention",
      exact: true,
    }),
  ).toContainText("unavailable");
  await page.goto(`${appUrl}/checkpoints`);
  await expect(
    page.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
});

test("@resilience conflicting tabs retain the second draft for explicit review", async ({
  extension,
}) => {
  const { page, id } = await editor(extension.context);
  const second = await extension.context.newPage();
  await second.goto(`${appUrl}/task?task=${id}`);
  await expect(second.getByRole("status")).toContainText("revision 1");
  await page.getByLabel("One next action", { exact: true }).fill("Ask Alex");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 2");
  await second
    .getByLabel("One next action", { exact: true })
    .fill("Ask Morgan");
  await second.getByRole("checkbox").check();
  await second
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(
    second.getByRole("alert", {
      name: "Checkpoint needs attention",
      exact: true,
    }),
  ).toContainText("another tab");
  await expect(
    second.getByLabel("One next action", { exact: true }),
  ).toHaveValue("Ask Morgan");
  await second
    .getByRole("button", {
      name: "Load latest version for review",
      exact: true,
    })
    .click();
  await expect(second.getByRole("checkbox")).not.toBeChecked();
  await second.getByRole("checkbox").check();
  await second
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(second.getByRole("status")).toContainText("revision 3");
});

test("@resilience failed revision write stays visible and retries exactly once", async ({
  extension,
}) => {
  const { page } = await editor(extension.context);
  await page.evaluate(() => {
    Reflect.set(window, "failRevision", true);
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      ...args: Parameters<IDBObjectStore["add"]>
    ) {
      if (this.name === "revisions" && Reflect.get(window, "failRevision"))
        throw new DOMException("Simulated quota failure", "QuotaExceededError");
      return add.apply(this, args);
    };
  });
  await page.getByLabel("One next action", { exact: true }).fill("Ask Alex");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(
    page.getByRole("alert", {
      name: "Checkpoint needs attention",
      exact: true,
    }),
  ).toContainText("quota");
  await expect(page.getByLabel("One next action", { exact: true })).toHaveValue(
    "Ask Alex",
  );
  await page.evaluate(() => Reflect.set(window, "failRevision", false));
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 2");
});

test("@resilience deletion purges outstanding task recaptures and delete-all purges unbound captures", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const fixture = await scenario();
  const check = await seed(context, fixture.url);
  const id = new URL(check.url()).searchParams.get("task")!;
  const source = await start(context, check, fixture.url);
  await recapture(context, source);
  const edit = await context.newPage();
  await edit.goto(`${appUrl}/task?task=${id}`);
  await edit
    .getByRole("button", { name: "Delete this task", exact: true })
    .click();
  await edit
    .getByRole("button", { name: "Confirm delete task", exact: true })
    .click();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
  const fresh = await captureSelection(context);
  const app = await confirmPreview(context, fresh.preview);
  await fillTask(app);
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Saved checkpoint", exact: true }),
  ).toBeVisible();
  await captureSelection(context); // Independent draft must also be removed by delete-all.
  await app
    .getByRole("button", { name: "Delete all saved data", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Confirm delete all", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
});

test("@resilience reviewed recovery becomes unusable after a checkpoint correction", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE === "1",
    "Deterministic response case.",
  );
  const { page, id, fixture } = await editor(extension.context);
  await page.goto(`${appUrl}/check?task=${id}`);
  await fixture.version("v2");
  const source = await start(extension.context, page, fixture.url);
  const { preview } = await recapture(extension.context, source);
  const comparison = await confirm(extension.context, preview);
  await saveComparison(comparison);
  await comparison
    .getByRole("link", { name: "Review AI recovery", exact: true })
    .click();
  await comparison
    .getByRole("button", { name: "Generate recovery suggestion", exact: true })
    .click();
  await comparison
    .getByRole("button", { name: "Save reviewed recovery", exact: true })
    .click();
  await expect(
    comparison.getByRole("button", {
      name: "Continue to saved work",
      exact: true,
    }),
  ).toBeEnabled();
  await page.goto(`${appUrl}/task?task=${id}`);
  await page
    .getByLabel("What have you completed?", { exact: true })
    .fill("Nothing yet");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save checkpoint revision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("revision 2");
  await comparison
    .getByRole("button", { name: "Continue to saved work", exact: true })
    .click();
  await expect(
    comparison.getByRole("alert", {
      name: "Recovery needs attention",
      exact: true,
    }),
  ).toContainText("outdated");
  await comparison.reload();
  await expect(
    comparison.getByRole("heading", {
      name: "Recovery suggestion · review required",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("@resilience full browser restart keeps confirmed checkpoints and pending captures", async ({
  extension,
}) => {
  const { page, id } = await editor(extension.context);
  await page
    .getByLabel("One next action", { exact: true })
    .fill("Restart draft");
  await expect(page.getByRole("status")).toContainText("Draft kept");
  const { preview } = await captureSelection(extension.context);
  const previewUrl = preview.url();
  await preview.close();
  const restarted = await extension.restart();
  const edit = await restarted.context.newPage();
  await edit.goto(`${appUrl}/task?task=${id}`);
  await expect(edit.getByRole("status")).toContainText(
    "Recovered your local draft",
  );
  await expect(edit.getByLabel("One next action", { exact: true })).toHaveValue(
    "Restart draft",
  );
  const recovered = await restarted.context.newPage();
  await recovered.goto(previewUrl);
  await expect(
    recovered.getByRole("button", {
      name: "Confirm capture and open ReEntry",
      exact: true,
    }),
  ).toBeVisible();
});

test("@resilience worker suspension preserves a pending capture", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const { preview } = await captureSelection(context);
  const url = preview.url();
  await preview.close();
  const session = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await session.send("Target.getTargets");
  const target = targetInfos.find(
    (item) => item.type === "service_worker" && item.url === worker.url(),
  );
  expect(target).toBeDefined();
  await session.send("Target.closeTarget", { targetId: target!.targetId });
  await session.detach();
  const recovered = await context.newPage();
  await recovered.goto(url);
  await expect(
    recovered.getByRole("button", {
      name: "Confirm capture and open ReEntry",
      exact: true,
    }),
  ).toBeVisible();
});

test("@resilience unavailable app leaves a confirmed capture for explicit retry", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const { preview } = await captureSelection(context);
  await context.route(`${appUrl}/checkpoints?capture=*`, (route) =>
    route.abort(),
  );
  const opening = context.waitForEvent("page");
  await preview
    .getByRole("button", {
      name: "Confirm capture and open ReEntry",
      exact: true,
    })
    .click();
  const failed = await opening;
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ] as { status: string }[],
      ),
    )
    .toEqual([expect.objectContaining({ status: "confirmed" })]);
  await failed.close();
  await context.unroute(`${appUrl}/checkpoints?capture=*`);
  const retry = context.waitForEvent("page");
  await preview
    .getByRole("button", { name: "Open ReEntry again", exact: true })
    .click();
  const app = await retry;
  await expect(
    app.getByRole("heading", { name: "Save a checkpoint", exact: true }),
  ).toBeVisible();
  await fillTask(app);
  await app
    .getByRole("button", { name: "Save confirmed checkpoint", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (1)" }),
  ).toBeVisible();
});

test("@resilience delete-all can clear pending captures before the first checkpoint", async ({
  extension,
}) => {
  const { context, worker } = extension;
  await captureSelection(context);
  const app = await context.newPage();
  await app.goto(`${appUrl}/checkpoints`);
  await expect(
    app.getByRole("heading", { name: "Your saved tasks (0)" }),
  ).toBeVisible();
  await app
    .getByRole("button", { name: "Delete all saved data", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Confirm delete all", exact: true })
    .click();
  await expect(app.getByRole("status")).toContainText("deleted");
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("reentry-pending"))[
            "reentry-pending"
          ],
      ),
    )
    .toEqual([]);
});
