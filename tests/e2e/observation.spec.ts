import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test, appUrl, sourceUrl } from "./extension";
import { DEFAULT_EXTENSION_ID } from "../../src/features/capture/config";
import { createServer } from "node:http";
import { pair, dashboard, openDisclosure } from "./observation-journey";
import { writeFile } from "node:fs/promises";
import path from "node:path";
const site = new URL(sourceUrl).origin;
const fixture = `${site}/observe.html`;
const companionUrl = `chrome-extension://${DEFAULT_EXTENSION_ID}/companion.html`;

test("@observation a full durable queue refuses extra updates and reports the loss", async ({
  extension,
}) => {
  const { app, companion } = await pair(extension.context);
  const page = await extension.context.newPage();
  await page.goto(fixture);
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(0);
  const baseline = (await dashboard(app)).observations[0]!;
  await expect
    .poll(() =>
      extension.worker.evaluate(
        async () =>
          (
            (await chrome.storage.local.get("observation-v1"))[
              "observation-v1"
            ] as { queue: unknown[] }
          ).queue.length,
      ),
    )
    .toBe(0);
  await extension.context.setOffline(true);
  // Seed a valid full queue from an actually captured event, then exercise the
  // automatic observer against its capacity boundary; no capture is injected.
  await extension.worker.evaluate(async (event) => {
    const state = (await chrome.storage.local.get("observation-v1"))[
      "observation-v1"
    ] as Record<string, unknown>;
    state.queue = Array.from({ length: 100 }, () => ({
      ...event,
      eventId: crypto.randomUUID(),
    }));
    await chrome.storage.local.set({ "observation-v1": state });
  }, baseline);
  await page.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "Queue overflow update must remain visibly unsaved.";
  });
  await expect
    .poll(() =>
      extension.worker.evaluate(
        async () =>
          (
            (await chrome.storage.local.get("observation-v1"))[
              "observation-v1"
            ] as { dropped: number }
          ).dropped,
      ),
    )
    .toBeGreaterThan(0);
  expect(
    await extension.worker.evaluate(
      async () =>
        (
          (await chrome.storage.local.get("observation-v1"))[
            "observation-v1"
          ] as { queue: unknown[] }
        ).queue.length,
    ),
  ).toBe(100);
  await extension.context.setOffline(false);
  await openDisclosure(companion, "Delivery details");
  await companion.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    companion.getByText("0 updates waiting for the local app.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    companion.getByText(
      /pending updates expired, were replaced, or could not be stored/,
    ),
  ).toBeVisible();
});

test("@observation Northstar saved-form status and changed requirements arrive without capture selection", async ({
  extension,
}) => {
  const { app } = await pair(extension.context);
  await writeFile(
    path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "portal/scenario.json"),
    JSON.stringify({ version: "v1" }),
  );
  const page = await extension.context.newPage();
  await page.goto(`${site}/portal/application.html`);
  await page
    .getByLabel("Your statement", { exact: true })
    .fill("SyntheticNorthstarPrivateStatement");
  await page
    .getByRole("button", { name: "Attach sample transcript", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save application draft", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.includes("Draft saved in this browser"),
      ),
    )
    .toBe(true);
  expect(JSON.stringify((await dashboard(app)).observations)).not.toContain(
    "SyntheticNorthstarPrivateStatement",
  );
  await writeFile(
    path.join(process.env.REENTRY_TEST_FIXTURE_DIR!, "portal/scenario.json"),
    JSON.stringify({ version: "v2" }),
  );
  await page.goto(`${site}/portal/instructions.html`);
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        /two referees/i.test(e.page.content),
      ),
    )
    .toBe(true);
});

test("@observation real pairing, automatic private-field-safe updates, quiet debounce and unverified submission", async ({
  extension,
}) => {
  const { app, companion } = await pair(extension.context);
  const page = await extension.context.newPage();
  await page.goto(fixture);
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(0);
  await page
    .getByLabel("Essay", { exact: true })
    .fill("seeded-private-essay-8364");
  await page.evaluate(() => {
    document.getElementById("echo")!.textContent = "seeded-private-essay-8364";
  });
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.fields.some((f) => f.label === "Essay" && f.present),
      ),
    )
    .toBe(true);
  const delivered = JSON.stringify((await dashboard(app)).observations);
  for (const secret of [
    "seeded-private-essay-8364",
    "seeded-password-5842",
    "4242424242424242",
    "seeded-hidden-token-9843",
    "private-region-1849",
  ])
    expect(delivered).not.toContain(secret);
  const count = (await dashboard(app)).observations.length;
  await page.evaluate(() => {
    for (let n = 0; n < 50; n++)
      document.getElementById("noise")!.textContent = `Timer ${n}`;
  });
  await page.waitForTimeout(2500);
  expect((await dashboard(app)).observations).toHaveLength(count);
  await page
    .getByRole("button", { name: "Submit fictional application" })
    .click();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some(
        (e) => e.reason === "submit-attempt",
      ),
    )
    .toBe(true);
  expect(JSON.stringify((await dashboard(app)).observations)).not.toContain(
    '"completed"',
  );
  await app.close();
  await page.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "Fictional change: add a second referee.";
  });
  await expect
    .poll(async () => {
      await openDisclosure(companion, "Delivery details");
      await companion.getByRole("button", { name: "Retry connection" }).click();
      await openDisclosure(companion, "Delivery details");
      return companion.getByText(/Last delivered/).textContent();
    })
    .toContain("Last delivered");
  const reopened = await extension.context.newPage();
  await reopened.goto(`${appUrl}/observe`);
  await expect
    .poll(async () =>
      (await dashboard(reopened)).observations.some((e) =>
        e.page.content.includes("second referee"),
      ),
    )
    .toBe(true);
});

test("@observation queue survives actual offline delivery and a full browser restart", async ({
  extension,
}) => {
  const { app, companion } = await pair(extension.context);
  const page = await extension.context.newPage();
  await page.goto(fixture);
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(0);
  await extension.context.setOffline(true);
  await page.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "Offline fictional checkpoint awaiting delivery.";
  });
  await expect
    .poll(() =>
      extension.worker.evaluate(async () => {
        const stored = await chrome.storage.local.get("observation-v1");
        return (
          (stored["observation-v1"] as { queue: unknown[] })?.queue.length ?? 0
        );
      }),
    )
    .toBeGreaterThan(0);
  await companion.close();
  await app.close();
  const restarted = await extension.restart();
  const check = await restarted.context.newPage();
  await check.goto(`${appUrl}/observe`);
  await expect
    .poll(
      async () =>
        (await dashboard(check)).observations.filter((e) =>
          e.page.content.includes("Offline fictional checkpoint"),
        ).length,
    )
    .toBe(1);
  const companionAgain = await restarted.context.newPage();
  await companionAgain.goto(companionUrl);
  await openDisclosure(companionAgain, "Delivery details");
  await expect(
    companionAgain.getByText("0 updates waiting for the local app.", {
      exact: true,
    }),
  ).toBeVisible();
  // Recover the same mounted companion, without clearing action errors or
  // relying on a tab reload to remove an outdated connection warning.
  await restarted.context.setOffline(true);
  await openDisclosure(companionAgain, "Delivery details");
  await companionAgain
    .getByRole("button", { name: "Retry connection", exact: true })
    .click();
  await expect(
    companionAgain.getByText(/Could not refresh ReEntry/),
  ).toBeVisible();
  await restarted.context.setOffline(false);
  await openDisclosure(companionAgain, "Delivery details");
  await companionAgain
    .getByRole("button", { name: "Retry connection", exact: true })
    .click();
  await expect(
    companionAgain.getByText(/Could not refresh ReEntry/),
  ).toHaveCount(0);
  const sourceAgain = await restarted.context.newPage();
  await sourceAgain.goto(fixture);
  await sourceAgain.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "After browser restart, observation still works.";
  });
  await expect
    .poll(async () =>
      (await dashboard(check)).observations.some((e) =>
        e.page.content.includes("After browser restart"),
      ),
    )
    .toBe(true);
});

test("@observation pause, port scope, accessible companion and revocation prevent further delivery", async ({
  extension,
}) => {
  const { app, companion } = await pair(extension.context);
  await expect(
    new AxeBuilder({ page: companion }).analyze().then((r) => r.violations),
  ).resolves.toEqual([]);
  await companion.setViewportSize({ width: 360, height: 850 });
  expect(
    await companion.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    new AxeBuilder({ page: app }).analyze().then((r) => r.violations),
  ).resolves.toEqual([]);
  await app.setViewportSize({ width: 320, height: 850 });
  expect(
    await app.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const source = await extension.context.newPage();
  await source.goto(fixture);
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(0);
  await companion
    .getByRole("button", { name: "Pause observation", exact: true })
    .click();
  await expect(
    companion.getByRole("button", { name: "Resume observation", exact: true }),
  ).toBeVisible();
  const before = (await dashboard(app)).observations.length;
  await source.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "Must not be read while paused.";
  });
  await source.waitForTimeout(2500);
  expect((await dashboard(app)).observations).toHaveLength(before);
  await companion
    .getByRole("button", { name: "Resume observation", exact: true })
    .click();
  await source.bringToFront();
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(before);
  await app
    .getByRole("button", { name: "Disconnect and clear observations" })
    .click();
  await app
    .getByRole("button", { name: "Disconnect and clear", exact: true })
    .click();
  await expect(
    app.getByText("Disconnected. Observed page data was cleared.", {
      exact: true,
    }),
  ).toBeVisible();
  await source.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "Late page after disconnect.";
  });
  await source.waitForTimeout(2500);
  expect((await dashboard(app)).observations).toEqual([]);
  await openDisclosure(companion, "Delivery details");
  await companion.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    companion.getByRole("button", {
      name: "Connect to local app",
      exact: true,
    }),
  ).toBeVisible();
});

test("@observation exact ports and untrusted bridge requests cannot enable another site", async ({
  extension,
}) => {
  const { app } = await pair(extension.context);
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(
      "<html lang='en'><title>Denied site</title><main><h1>Must never be observed</h1></main></html>",
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing port");
    const denied = await extension.context.newPage();
    await denied.goto(`http://127.0.0.1:${address.port}`);
    const reply = await denied.evaluate(
      async (id) =>
        new Promise<unknown>((resolve) => {
          chrome.runtime.sendMessage(
            id,
            { version: 1, type: "agent.pair", challenge: "a".repeat(64) },
            (value: unknown) => resolve(value),
          );
        }),
      DEFAULT_EXTENSION_ID,
    );
    expect(reply).toEqual({ status: "rejected" });
    await denied.waitForTimeout(2500);
    expect((await dashboard(app)).observations).toEqual([]);
    const allowed = await extension.context.newPage();
    await allowed.goto(fixture);
    await expect
      .poll(async () => (await dashboard(app)).observations.length)
      .toBeGreaterThan(0);
    expect(JSON.stringify((await dashboard(app)).observations)).not.toContain(
      "Must never be observed",
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("@observation failed extension writes do not acknowledge unsaved changes and pause reading", async ({
  extension,
}) => {
  const { app, companion } = await pair(extension.context);
  const source = await extension.context.newPage();
  await source.goto(fixture);
  await expect
    .poll(async () => (await dashboard(app)).observations.length)
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      extension.worker.evaluate(
        async () =>
          (
            (await chrome.storage.local.get("observation-v1"))[
              "observation-v1"
            ] as { queue: unknown[] }
          ).queue.length,
      ),
    )
    .toBe(0);
  await extension.worker.evaluate(() => {
    Reflect.set(
      globalThis,
      "restoreObservationStorage",
      chrome.storage.local.set,
    );
    chrome.storage.local.set = () =>
      Promise.reject(new Error("Synthetic storage failure"));
  });
  await source.evaluate(() => {
    document.getElementById("instructions")!.textContent =
      "This update could not be saved.";
  });
  await source.waitForTimeout(2500);
  await openDisclosure(companion, "Delivery details");
  await companion.getByRole("button", { name: "Retry connection" }).click();
  await expect(companion.getByRole("alert")).toContainText(
    "Browser storage failed",
  );
  expect(JSON.stringify((await dashboard(app)).observations)).not.toContain(
    "could not be saved",
  );
  await extension.worker.evaluate(() => {
    chrome.storage.local.set = Reflect.get(
      globalThis,
      "restoreObservationStorage",
    );
  });
  await companion
    .getByRole("button", { name: "Resume observation", exact: true })
    .click();
  await source.bringToFront();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.includes("could not be saved"),
      ),
    )
    .toBe(true);
});
