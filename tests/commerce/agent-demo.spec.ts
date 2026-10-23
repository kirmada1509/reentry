import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import { test, appUrl } from "../e2e/extension";
import { pair, dashboard, openDisclosure } from "../e2e/observation-journey";
import { agentDemo } from "../e2e/agent-demo-journey";

test("@agent-demo-shopping uninterrupted real NVIDIA shopping interruption through validation, review and confirmation", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_AGENT_DEMO_KIND !== "shopping",
    "Explicit real-provider recording only.",
  );
  test.setTimeout(420000);
  const { app, companion } = await pair(extension.context);
  await app.setViewportSize({ width: 1280, height: 900 });
  const demo = agentDemo(app, companion),
    site = "http://127.0.0.1:4177";
  let success = false,
    id = "",
    revision = 0;
  try {
    await demo.scene(
      "A local copy of Sauce Labs' sample shop. All credentials and checkout details here are published or fictional; no real order or payment.",
      async () => {
        await app.goto(site);
        await app.bringToFront();
        await app.getByTestId("username").fill("standard_user");
        await app.getByTestId("password").fill("secret_sauce");
        await app.getByTestId("login-button").click();
        await app
          .getByText("Sauce Labs Backpack", { exact: true })
          .first()
          .click();
        await expect
          .poll(async () =>
            (await dashboard(companion)).observations.some((e) =>
              e.page.content.includes("Back to products"),
            ),
          )
          .toBe(true);
      },
    );
    await demo.scene(
      "After separate NVIDIA agreement, visiting a product is tentative research, not an assumed purchase obligation.",
      async () => {
        await demo.enable();
        const state = await demo.wait(
          "research",
          (s) =>
            s.tasks.length === 1 &&
            s.tasks[0]?.intent === "research" &&
            s.tasks[0].stage === "candidate",
        );
        id = state.tasks[0]!.id;
        await app.reload();
        await expect(app.getByRole("article")).toHaveCount(1);
      },
      3,
    );
    await demo.scene(
      "Adding the backpack to the cart changes the inferred intent. The same task now aims for an order confirmation.",
      async () => {
        await app.goto(`${site}/inventory-item.html?id=4`);
        await app.bringToFront();
        await app
          .getByRole("button", { name: "Add to cart", exact: true })
          .click();
        await app.getByTestId("shopping-cart-link").click();
        await demo.wait(
          "cart",
          (s) =>
            s.tasks.length === 1 &&
            s.tasks[0]?.id === id &&
            s.tasks[0].intent === "purchase" &&
            s.tasks[0].stage !== "completed" &&
            /order|receipt|confirm/i.test(s.tasks[0].finishCondition),
        );
      },
    );
    await demo.scene(
      "Put checkout aside, switch away briefly, then resume. The task and finish condition stay saved; reminders remain off.",
      () => demo.interrupt(),
      3,
    );
    await demo.scene(
      "An empty checkout attempt is a validation failure. The agent preserves the task as unfinished.",
      async () => {
        await app.goto(`${site}/cart.html`);
        await app.bringToFront();
        await app.getByTestId("checkout").click();
        await app.getByTestId("continue").click();
        await expect(
          app.getByText("Error: First Name is required"),
        ).toBeVisible();
        await demo.wait(
          "validation",
          (s) =>
            s.tasks[0]?.progress.at(-1)?.kind === "blocked" &&
            s.tasks[0].stage !== "completed",
        );
      },
    );
    await demo.scene(
      "The user supplies fictional checkout details and reaches final review. Review alone does not mean the order was placed.",
      async () => {
        await app.getByTestId("firstName").fill("Fictional");
        await app.getByTestId("lastName").fill("Tester");
        await app.getByTestId("postalCode").fill("00000");
        await app.getByTestId("continue").click();
        await demo.wait(
          "final review",
          (s) =>
            s.tasks[0]?.progress.at(-1)?.kind === "review_ready" &&
            s.tasks[0].stage !== "completed",
        );
      },
    );
    await demo.scene(
      "Only the fresh matching sample-shop receipt completes the task. The user, not ReEntry, presses Finish.",
      async () => {
        await app.getByTestId("finish").click();
        await expect(
          app.getByRole("heading", {
            name: "Thank you for your order!",
            exact: true,
          }),
        ).toBeVisible();
        await demo.wait(
          "confirmed purchase",
          (s) =>
            s.tasks.length === 1 &&
            s.tasks[0]?.id === id &&
            s.tasks[0].stage === "completed" &&
            s.tasks[0].completedBy === "observation",
        );
      },
    );
    await demo.scene(
      "Return to inspect the saved interpretation and source evidence. Generic receipt matching is conservative and not vendor-server verification.",
      async () => {
        await demo.home();
        await expect(
          app.getByText("Confirmation observed", { exact: true }),
        ).toBeVisible();
        await openDisclosure(app, "Why this task?");
        revision = (await demo.read()).tasks[0]!.revision;
      },
      4,
    );
    success = true;
  } finally {
    await demo.finish(success);
  }
  const restarted = await extension.restart();
  const returned = await restarted.context.newPage();
  await returned.goto(`${appUrl}/observe`);
  const state = await (
    await returned.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    })
  ).json();
  expect(state.tasks[0]).toMatchObject({ id, revision, stage: "completed" });
  await writeFile(
    path.join(process.env.REENTRY_AGENT_DEMO_DIR!, "restart.json"),
    JSON.stringify({ passed: true, tasks: state.tasks }, null, 2) + "\n",
  );
});
