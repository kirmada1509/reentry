import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { agentViewSchema } from "../../src/features/agent/schema";
import type { AgentView } from "../../src/features/agent/schema";
import { AGENT_PROMPT_VERSION } from "../../src/features/agent/prompt";
import { appUrl } from "./extension";
import { openDisclosure } from "./observation-journey";

/** A real single-page browser recording; no seeded task, accelerated clock or model fallback. */
export function agentDemo(page: Page, reader: Page) {
  const directory = process.env.REENTRY_AGENT_DEMO_DIR;
  if (!directory)
    throw new Error(
      "Use the explicit agent-demo runner with a fresh output directory.",
    );
  const captions: Array<{ start: number; end: number; text: string }> = [];
  const checkpoints: Array<{ name: string; at: string; state: AgentView }> = [];
  let complete = false;
  async function read() {
    const response = await reader.request.get(`${appUrl}/api/agent/tasks`, {
      headers: { "x-reentry-web": "1", origin: appUrl },
    });
    expect(response.ok()).toBe(true);
    return agentViewSchema.parse(await response.json());
  }
  async function scene(text: string, action: () => Promise<void>, hold = 2) {
    const start = Date.now();
    try {
      await action();
      const readingMs = (text.split(/\s+/).length / 3 + 1) * 1000;
      await page.waitForTimeout(
        Math.max(hold * 1000, readingMs - (Date.now() - start)),
      );
    } finally {
      captions.push({ start, end: Date.now(), text });
    }
  }
  async function wait(name: string, predicate: (state: AgentView) => boolean) {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const state = await read();
      if (predicate(state)) {
        checkpoints.push({ name, at: new Date().toISOString(), state });
        return state;
      }
      if (["unavailable", "budget", "needs-consent"].includes(state.status))
        throw new Error(
          `The ${name} model update could not be accepted. No operator retry is used in this trial.`,
        );
      await page.waitForTimeout(1000);
    }
    throw new Error(
      `The ${name} state did not arrive within the recording deadline.`,
    );
  }
  async function home() {
    await page.goto(`${appUrl}/observe`);
    await page.bringToFront();
    await expect(page.getByRole("article")).toHaveCount(1);
  }
  async function enable() {
    await page.goto(`${appUrl}/observe`);
    await page
      .getByRole("checkbox", { name: "Allow automatic NVIDIA processing" })
      .check();
    await page
      .getByRole("button", { name: "Enable task understanding", exact: true })
      .click();
  }
  async function interrupt() {
    await home();
    await openDisclosure(page, "Return and reminder options");
    await page
      .getByRole("button", { name: "Waiting for something", exact: true })
      .click();
    await expect(
      page.getByText("Waiting — reminders are paused until you resume.", {
        exact: true,
      }),
    ).toBeVisible();
    // A real short tab switch, not a simulated forty-five-minute reminder wait.
    const away = await page.context().newPage();
    await away.goto("about:blank");
    await away.bringToFront();
    await away.waitForTimeout(2000);
    await away.close();
    await page.bringToFront();
    await page
      .getByRole("button", { name: "Resume this task", exact: true })
      .click();
  }
  async function finish(success: boolean) {
    complete = success;
    await mkdir(directory!, { recursive: true });
    const database = new Database(
      path.join(
        process.env.REENTRY_TEST_FIXTURE_DIR!,
        process.env.REENTRY_AGENT_DEMO_KIND === "shopping"
          ? "agent.sqlite"
          : "observations.sqlite",
      ),
      { readonly: true, fileMustExist: true },
    );
    const calls = (
      database.prepare("SELECT COUNT(*) AS n FROM agent_calls").get() as {
        n: number;
      }
    ).n;
    const jobs = database
      .prepare(
        "SELECT id,state,calls,context,proposal FROM agent_jobs ORDER BY created,rowid",
      )
      .all();
    const observations = database
      .prepare("SELECT body FROM observations ORDER BY received,rowid")
      .all() as Array<{ body: string }>;
    database.close();
    const state = await read();
    const endedAt = Date.now();
    await writeFile(
      path.join(directory!, "journey.json"),
      JSON.stringify(
        {
          version: "agent-browser-demo-v1",
          promptVersion: AGENT_PROMPT_VERSION,
          browserVersion: page.context().browser()?.version(),
          complete,
          syntheticSite: true,
          realProvider: "nvidia",
          scriptedClock: false,
          operatorRetries: 0,
          operatorCorrections: 0,
          kind: process.env.REENTRY_AGENT_DEMO_KIND,
          endedAt,
          captions,
          checkpoints,
          state,
          modelCallReservations: calls,
          jobs,
          observations: observations.map((r) => JSON.parse(r.body)),
        },
        null,
        2,
      ) + "\n",
    );
    if (!page.isClosed()) {
      await page.screenshot({
        path: path.join(directory!, success ? "completed.png" : "failed.png"),
        fullPage: true,
      });
      const video = page.video();
      await page.close();
      if (video) await video.saveAs(path.join(directory!, "journey.webm"));
    }
  }
  return { read, scene, wait, home, enable, interrupt, finish };
}
