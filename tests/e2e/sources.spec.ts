import { expect } from "@playwright/test";
import { test, appUrl, invokeCapture } from "./extension";
import {
  scenario,
  seed,
  start,
  recapture,
  confirm,
  saveComparison,
} from "./source-journey";

test("@sources V1 to V2 at the same URL retains evidence and progress after returning and refreshing", async ({
  extension,
}, info) => {
  const { context } = extension;
  const fixture = await scenario();
  const initial = await seed(context, fixture.url);
  const returnUrl = initial.url();
  await initial.close();
  await fixture.version("v2");
  const app = await context.newPage();
  await app.goto(returnUrl);
  const source = await start(context, app, fixture.url);
  const { preview, text } = await recapture(context, source);
  const review = await confirm(context, preview);
  await expect(
    review.getByLabel("Saved instruction text", { exact: true }),
  ).toContainText("Supply one referee.");
  await expect(
    review.getByLabel("New instruction text", { exact: true }),
  ).toHaveValue(text);
  await saveComparison(review);
  await expect(
    review.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    review.getByRole("region", { name: "Text differences" }),
  ).toContainText("Removed");
  await review.reload();
  await expect(
    review.getByLabel("Saved instruction text", { exact: true }),
  ).toHaveValue(
    "Attach your transcript. Supply one referee. Keep a copy of your application.",
  );
  await expect(
    review.getByLabel("New instruction text", { exact: true }),
  ).toHaveValue(
    "Attach your transcript. Supply two referees. Keep a copy of your application.",
  );
  await expect(
    review.getByText("Transcript attached", { exact: true }),
  ).toBeVisible();
  await expect(
    review.getByText("Find first referee", { exact: true }),
  ).toBeVisible();
  await expect(
    review.getByLabel("Saved instruction URL", { exact: true }),
  ).toHaveValue(fixture.url);
  await expect(
    review.getByLabel("New instruction URL", { exact: true }),
  ).toHaveValue(fixture.url);
  await review.screenshot({
    path: info.outputPath("source-comparison.png"),
    fullPage: true,
  });
});

test("@sources unchanged captured material and cosmetic edits have honest distinct states", async ({
  extension,
}) => {
  const { context } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  const source = await start(context, app, fixture.url);
  const { preview } = await recapture(context, source);
  const review = await confirm(context, preview);
  await saveComparison(review);
  await expect(
    review.getByRole("heading", {
      name: "Unchanged within the captured section",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    review.getByText(
      "Only the selected instruction text matched the saved capture.",
      { exact: false },
    ),
  ).toBeVisible();
  await fixture.version("cosmetic");
  const second = await start(context, review, fixture.url);
  const next = await recapture(context, second);
  const changed = await confirm(context, next.preview);
  await saveComparison(changed);
  await expect(
    changed.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    changed.getByText("These are text differences.", { exact: false }),
  ).toContainText("not yet a conclusion");
});

test("@sources different URL or section and unconfirmed section cannot become unchanged", async ({
  extension,
}) => {
  const { context } = extension;
  const fixture = await scenario();
  let app = await seed(context, fixture.url);
  for (const variant of ["url", "section", "unconfirmed"] as const) {
    const source = await start(context, app, fixture.url);
    if (variant === "url")
      await source.goto(fixture.url + "?different-source=1");
    const { preview } = await recapture(
      context,
      source,
      variant === "section" ? "#other-instructions" : "#instructions",
    );
    app = await confirm(context, preview);
    await saveComparison(app, variant !== "unconfirmed");
    await expect(
      app.getByRole("heading", {
        name: "Captures cannot be compared",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      app.getByRole("heading", {
        name: "Unchanged within the captured section",
        exact: true,
      }),
    ).toHaveCount(0);
    await app.reload();
    await expect(
      app.getByRole("heading", {
        name: "Captures cannot be compared",
        exact: true,
      }),
    ).toBeVisible();
  }
});

test("@sources cancelled preview, missing selection and unavailable source stay unverified", async ({
  extension,
}) => {
  const { context } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  const source = await start(context, app, fixture.url);
  const { preview } = await recapture(context, source);
  await preview
    .getByRole("button", { name: "Discard capture", exact: true })
    .click();
  await app.bringToFront();
  await expect(
    app.getByRole("heading", {
      name: "Check cancelled — instructions remain unverified",
      exact: true,
    }),
  ).toBeVisible();
  const empty = await start(context, app, fixture.url);
  await invokeCapture(context, empty);
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  const unavailable = await start(context, app, fixture.url);
  await unavailable.close();
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  await app.reload();
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    app.getByText("Transcript attached", { exact: true }),
  ).toBeVisible();
});

test("@sources simultaneous tasks cannot accept each other's recaptures or acknowledgements", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const fixture = await scenario();
  const a = await seed(context, fixture.url, "Application A");
  const b = await seed(context, fixture.url, "Application B");
  const sourceA = await start(context, a, fixture.url);
  const sourceB = await start(context, b, fixture.url);
  await fixture.version("v2");
  await sourceA.reload();
  await sourceB.reload();
  const captureA = await recapture(context, sourceA);
  const captureB = await recapture(context, sourceB);
  const reviewA = await confirm(context, captureA.preview, "Application A");
  const reviewB = await confirm(context, captureB.preview, "Application B");
  const paramsA = new URL(reviewA.url()).searchParams;
  const paramsB = new URL(reviewB.url()).searchParams;
  const mismatch = await context.newPage();
  await mismatch.goto(
    `${appUrl}/check?task=${paramsB.get("task")}&check=${paramsA.get("check")}&capture=${paramsA.get("capture")}`,
  );
  await expect(
    mismatch.getByRole("alert", { name: "Source check needs attention" }),
  ).toContainText("belong together");
  await expect(
    mismatch.getByRole("button", {
      name: "Save source comparison",
      exact: true,
    }),
  ).toHaveCount(0);
  const reply = await reviewB.evaluate(
    async ({ captureId, checkId, taskId }) =>
      new Promise<unknown>((resolve) =>
        chrome.runtime.sendMessage(
          "nabinfdlobegbkgehppcipkhbddjbdka",
          { version: 1, type: "capture.ack", captureId, checkId, taskId },
          resolve,
        ),
      ),
    {
      captureId: paramsA.get("capture"),
      checkId: paramsB.get("check"),
      taskId: paramsB.get("task"),
    },
  );
  expect(reply).toEqual({ status: "rejected" });
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toHaveLength(2);
  await saveComparison(reviewA);
  await saveComparison(reviewB);
  await expect(
    reviewA.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    reviewB.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
  ).toBeVisible();
});

test("@sources network failure and user-reported missing instructions never appear unchanged", async ({
  extension,
}) => {
  const { context } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  await context.route(fixture.url, (route) => route.abort("failed"));
  const source = await start(context, app, fixture.url);
  const errorPreview = await invokeCapture(context, source);
  await expect(errorPreview.getByRole("alert")).toBeVisible();
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  await context.unroute(fixture.url);
  await start(context, app, fixture.url);
  await app
    .getByRole("button", { name: "I cannot read the source", exact: true })
    .click();
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    app.getByText("You reported that the source could not be read.", {
      exact: false,
    }),
  ).toBeVisible();
  await app.reload();
  await expect(
    app.getByRole("heading", {
      name: "Could not check the instructions",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    app.getByRole("heading", {
      name: "Unchanged within the captured section",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("@sources comparison storage failure retains awaiting check and pending capture for retry", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  await fixture.version("v2");
  const source = await start(context, app, fixture.url);
  const { preview } = await recapture(context, source);
  const review = await confirm(context, preview);
  await review.evaluate(() => {
    Reflect.set(window, "failComparisonWrite", true);
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.name === "checks" && Reflect.get(window, "failComparisonWrite"))
        throw new DOMException(
          "Simulated check storage failure",
          "QuotaExceededError",
        );
      return put.apply(this, args);
    };
  });
  await saveComparison(review);
  await expect(
    review.getByRole("alert", { name: "Source check needs attention" }),
  ).toContainText("Could not save this comparison");
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toHaveLength(1);
  await expect(
    review.getByRole("heading", {
      name: "Review recapture for this task",
      exact: true,
    }),
  ).toBeVisible();
  await review.evaluate(() =>
    Reflect.set(window, "failComparisonWrite", false),
  );
  await saveComparison(review);
  await expect(
    review.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
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

test("@sources a saved comparison survives lost acknowledgement and refresh without a duplicate", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  await fixture.version("v2");
  const source = await start(context, app, fixture.url);
  const { preview } = await recapture(context, source);
  const review = await confirm(context, preview);
  await review.evaluate(() => {
    const send = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = ((...args: unknown[]) => {
      if ((args[1] as { type?: string })?.type === "capture.ack") {
        (args[2] as (reply: unknown) => void)({ status: "unavailable" });
        return;
      }
      return Reflect.apply(send, chrome.runtime, args);
    }) as typeof chrome.runtime.sendMessage;
  });
  await saveComparison(review);
  await expect(review.getByRole("status")).toContainText(
    "Acknowledgement is pending",
  );
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toHaveLength(1);
  await review.reload();
  await expect(review.getByRole("status")).toContainText("already saved");
  await expect(
    review.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
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

test("@sources repeated invocation reopens the bound capture and closing its source preserves it", async ({
  extension,
}) => {
  const { context, worker } = extension;
  const fixture = await scenario();
  const app = await seed(context, fixture.url);
  await fixture.version("v2");
  const source = await start(context, app, fixture.url);
  const { preview } = await recapture(context, source);
  const repeated = await invokeCapture(context, source);
  expect(repeated.url()).toBe(preview.url());
  expect(
    await worker.evaluate(
      async () =>
        (await chrome.storage.local.get("reentry-pending"))["reentry-pending"],
    ),
  ).toHaveLength(1);
  await source.close();
  await app
    .getByRole("button", { name: "Refresh check status", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Awaiting a fresh capture", exact: true }),
  ).toBeVisible();
  const review = await confirm(context, repeated);
  await saveComparison(review);
  await expect(
    review.getByRole("heading", {
      name: "Text changed — review your saved next action",
      exact: true,
    }),
  ).toBeVisible();
});
