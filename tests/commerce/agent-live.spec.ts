import { writeFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test, appUrl } from "../e2e/extension";
import { pair, dashboard } from "../e2e/observation-journey";

test("@agent-live real NVIDIA groups upstream product research and cart with app tabs closed, then survives browser restart", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_TEST_LIVE !== "1",
    "Explicit NVIDIA evaluation, outside CI.",
  );
  test.setTimeout(300000);
  const { context } = extension;
  const { app, companion } = await pair(context);
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4177");
  await page.getByTestId("username").fill("standard_user");
  await page.getByTestId("password").fill("secret_sauce");
  await page.getByTestId("login-button").click();
  await page.getByText("Sauce Labs Backpack", { exact: true }).first().click();
  await expect(page.getByTestId("back-to-products")).toBeVisible();
  await expect
    .poll(async () =>
      (await dashboard(app)).observations.some((e) =>
        e.page.content.includes("Back to products"),
      ),
    )
    .toBe(true);
  await companion
    .getByRole("checkbox", { name: "Allow automatic NVIDIA processing" })
    .check();
  await companion
    .getByRole("button", { name: "Enable task understanding", exact: true })
    .click();
  await expect(
    companion.getByRole("button", {
      name: "Pause AI understanding",
      exact: true,
    }),
  ).toBeVisible();
  await app.close();
  await companion.close();
  const read = async () => {
    const response = await page.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    });
    return response.json();
  };
  async function record(stage: string) {
    const snapshot = {
      synthetic: true,
      stage,
      tasks: await read(),
      observations: await dashboard(page),
    };
    const filename = test.info().outputPath(`agent-${stage}.json`);
    await writeFile(filename, JSON.stringify(snapshot, null, 2));
    await test.info().attach(`synthetic-agent-${stage}`, {
      path: filename,
      contentType: "application/json",
    });
  }
  try {
    await expect
      .poll(
        async () =>
          (await read()).tasks.some(
            (t: { intent: string; stage: string }) =>
              t.intent === "research" && t.stage === "candidate",
          ),
        { timeout: 120000 },
      )
      .toBe(true);
    const id = (await read()).tasks[0].id;
    await record("research");
    await page
      .getByRole("button", { name: "Add to cart", exact: true })
      .click();
    await page.getByTestId("shopping-cart-link").click();
    await expect(page.getByTestId("cart-list")).toContainText(
      "Sauce Labs Backpack",
    );
    await expect
      .poll(
        async () =>
          (await read()).tasks.some(
            (t: { id: string; intent: string }) =>
              t.id === id && t.intent === "purchase",
          ),
        { timeout: 120000 },
      )
      .toBe(true);
    const before = await read();
    expect(before.tasks).toHaveLength(1);
    expect(before.tasks[0].finishCondition).toMatch(/order|confirm|receipt/i);
    await record("cart");
    const restarted = await extension.restart();
    const returned = await restarted.context.newPage();
    await returned.goto(`${appUrl}/observe`);
    const response = await returned.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    });
    const after = await response.json();
    expect(after.tasks.map((t: { id: string }) => t.id)).toEqual([id]);
    expect(after.tasks[0].revision).toBe(before.tasks[0].revision);
    await test.info().attach("synthetic-agent-after-restart", {
      body: JSON.stringify(after, null, 2),
      contentType: "application/json",
    });
  } catch (error) {
    await record("failure");
    throw error;
  }
});
