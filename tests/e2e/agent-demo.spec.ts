import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import { test, appUrl, sourceUrl } from "./extension";
import { pair, dashboard, openDisclosure } from "./observation-journey";
import { agentDemo } from "./agent-demo-journey";

test("@agent-demo-application uninterrupted real NVIDIA application, brief interruption, changed requirements, failure and receipt", async ({
  extension,
}) => {
  test.skip(
    process.env.REENTRY_AGENT_DEMO_KIND !== "application",
    "Explicit real-provider recording only.",
  );
  test.setTimeout(420000);
  const scenario = path.join(
    process.env.REENTRY_TEST_FIXTURE_DIR!,
    "portal/scenario.json",
  );
  await writeFile(scenario, JSON.stringify({ version: "v1" }));
  const { app, companion } = await pair(extension.context);
  await app.setViewportSize({ width: 1280, height: 900 });
  const demo = agentDemo(app, companion),
    url = `${new URL(sourceUrl).origin}/portal/application.html`;
  let success = false,
    id = "",
    revision = 0;
  try {
    await demo.scene(
      "Fictional Northstar application. ReEntry observes the enabled page; the agent never submits forms for you.",
      async () => {
        await app.goto(url);
        await app.bringToFront();
        await app
          .getByLabel("Your statement", { exact: true })
          .fill("A fictional student statement about water research.");
        await app
          .getByRole("button", {
            name: "Attach sample transcript",
            exact: true,
          })
          .click();
        await app
          .getByLabel("First referee", { exact: true })
          .fill("Sample mentor");
        await app
          .getByRole("button", { name: "Save application draft", exact: true })
          .click();
        await expect
          .poll(async () =>
            (await dashboard(companion)).observations.some((e) =>
              /Draft saved/i.test(e.page.content),
            ),
          )
          .toBe(true);
      },
    );
    await demo.scene(
      "Agree separately to NVIDIA processing. The real model infers the task and finish condition without a checkpoint form.",
      async () => {
        await demo.enable();
        const state = await demo.wait(
          "saved draft",
          (s) =>
            s.tasks.length === 1 &&
            s.tasks[0]?.intent === "application" &&
            s.tasks[0].progress.some(
              (p) =>
                p.kind === "draft_saved" ||
                /draft.*saved|saved.*draft/i.test(p.summary),
            ),
        );
        id = state.tasks[0]!.id;
        revision = state.tasks[0]!.revision;
        await app.reload();
        await expect(app.getByRole("article")).toHaveCount(1);
      },
      3,
    );
    await demo.scene(
      "Put the task aside and return after a brief tab switch. Reminders stay off; no long absence is simulated.",
      () => demo.interrupt(),
      3,
    );
    await writeFile(scenario, JSON.stringify({ version: "v2" }));
    await demo.scene(
      "The fictional instructions now require a second referee. Returning preserves the draft and triggers fresh interpretation.",
      async () => {
        await app.goto(url);
        await app.bringToFront();
        await expect(
          app.getByRole("button", {
            name: "Remove sample transcript",
            exact: true,
          }),
        ).toBeVisible();
        await demo.wait("changed requirements", (s) =>
          Boolean(
            s.tasks[0]?.id === id &&
            s.tasks[0].revision > revision &&
            /referee|reference/i.test(s.tasks[0].nextAction) &&
            /second|two|additional|remaining|missing|2/i.test(
              s.tasks[0].nextAction,
            ) &&
            s.tasks[0].progress.some(
              (p) =>
                p.kind === "draft_saved" ||
                /draft.*saved|saved.*draft/i.test(p.summary),
            ),
          ),
        );
        await demo.home();
        await openDisclosure(app, "Why this task?");
        await app.screenshot({
          path: path.join(
            process.env.REENTRY_AGENT_DEMO_DIR!,
            "changed-requirements.png",
          ),
          fullPage: true,
        });
      },
      3,
    );
    await demo.scene(
      "A submission attempt with a missing referee produces validation failure, not completion.",
      async () => {
        await app.goto(url);
        await app.bringToFront();
        await app
          .getByRole("button", { name: "Review application", exact: true })
          .click();
        await app
          .getByRole("button", {
            name: "Submit fictional application",
            exact: true,
          })
          .click();
        await expect(app.getByRole("dialog").getByRole("alert")).toContainText(
          "Validation error",
        );
        await demo.wait(
          "blocked submission",
          (s) =>
            s.tasks[0]?.progress.at(-1)?.kind === "blocked" &&
            s.tasks[0].stage !== "completed",
        );
      },
    );
    await demo.scene(
      "Complete the missing section and review. ReEntry sees a review checkpoint; no application has been submitted yet.",
      async () => {
        await app
          .getByRole("button", { name: "Back to draft", exact: true })
          .click();
        await app
          .getByLabel("Second referee", { exact: true })
          .fill("Another sample mentor");
        await app
          .getByRole("button", { name: "Save application draft", exact: true })
          .click();
        await app
          .getByRole("button", { name: "Review application", exact: true })
          .click();
        await demo.wait(
          "final review",
          (s) =>
            s.tasks[0]?.progress.at(-1)?.kind === "review_ready" &&
            s.tasks[0].stage !== "completed",
        );
      },
    );
    await demo.scene(
      "The user submits the fictional form. A fresh matching receipt allows the harness to accept observed completion.",
      async () => {
        await app
          .getByRole("button", {
            name: "Submit fictional application",
            exact: true,
          })
          .click();
        await expect(
          app.getByRole("heading", {
            name: "Application successfully submitted",
            exact: true,
          }),
        ).toBeVisible();
        await demo.wait(
          "confirmed application",
          (s) =>
            s.tasks[0]?.id === id &&
            s.tasks[0].stage === "completed" &&
            s.tasks[0].completedBy === "observation",
        );
      },
    );
    await demo.scene(
      "Return to the saved evidence and revision history. This is observed confirmation, not independent institutional verification.",
      async () => {
        await demo.home();
        await expect(
          app.getByText("Confirmation observed", { exact: true }),
        ).toBeVisible();
        await openDisclosure(app, "Why this task?");
        await openDisclosure(app, "Task options");
        await app
          .getByRole("button", { name: "Revision history", exact: true })
          .click();
        await expect(
          app.getByRole("dialog").getByText("AI interpretation").first(),
        ).toBeVisible();
        await app.keyboard.press("Escape");
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
  await expect(
    returned.getByText("Confirmation observed", { exact: true }),
  ).toBeVisible();
  const after = await (
    await returned.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    })
  ).json();
  expect(after.tasks[0]).toMatchObject({ id, revision, stage: "completed" });
  await writeFile(
    path.join(process.env.REENTRY_AGENT_DEMO_DIR!, "restart.json"),
    JSON.stringify({ passed: true, tasks: after.tasks }, null, 2) + "\n",
  );
});
