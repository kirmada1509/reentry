import nextEnv from "@next/env";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";
import { ObservationStore } from "../src/features/observation/store";
import { pageIdentity } from "../src/features/observation/page-identity";
import { createTaskHarness } from "../src/features/agent/harness";
import { agentProcessing } from "../src/features/agent/processing";
import { configuredStructuredModel } from "../src/lib/ai/factory";
import { getEnvironment } from "../src/lib/env";
import { AGENT_PROMPT_VERSION } from "../src/features/agent/prompt";

// Explicit, fictional-only model evaluation. No browser profile or live course
// page is read. Each case is attempted once; failures and responses are retained.
nextEnv.loadEnvConfig(process.cwd());
const output = process.argv[2] ?? ".runtime/assignment-evaluation.json";
const pacingMs = Number(process.argv[3] ?? "60000");
if (!Number.isInteger(pacingMs) || pacingMs < 0 || pacingMs > 60000)
  throw new Error("Evaluation pacing must be 0–60000 milliseconds.");
if (existsSync(output))
  throw new Error("Use a fresh output path; retain failed trials.");
const directory = mkdtempSync(path.join(tmpdir(), "reentry-assignment-eval-"));
const environment = getEnvironment(),
  processing = agentProcessing();
if (!processing.available)
  throw new Error("Configure an available model first.");
let now = Date.now();
const store = new ObservationStore(
  path.join(directory, "agent.sqlite"),
  () => now,
);
const site = "https://fictional-campus.example";
const device = store.pair(store.challenge(), environment.REENTRY_EXTENSION_ID);
const session = store.setSession(
  device.deviceId,
  { allSites: false, origins: [site], policy: "local-observation-v1" },
  false,
  environment.REENTRY_APP_ORIGIN,
).session;
store.agent.action(
  { action: "enable", consentId: processing.consentId, sessionId: session.id },
  processing,
);
const streamId = randomUUID();
let decisions: unknown[] = [];
const harness = createTaskHarness(
  store.agent,
  () => ({
    generate: async (request, signal) => {
      const response = await configuredStructuredModel().generate(
        request,
        signal,
      );
      decisions.push(response.candidate);
      return response;
    },
  }),
  agentProcessing,
  environment.REENTRY_AGENT_TIMEOUT_MS,
);
const results: Array<{
  name: string;
  passed: boolean;
  [key: string]: unknown;
}> = [];
const assignment = (id = "12307") =>
  store.agent.tasks().find((t) => t.resourceKey === key(id));
const key = (id: string) =>
  createHash("sha256")
    .update(pageIdentity(new URL(`${site}/mod/assign/view.php?id=${id}`)))
    .digest("hex");
const cases = [
  {
    name: "pending assignment discovered with a useful next step",
    id: "12307",
    status: "No submissions have been made yet",
    check: () =>
      assignment()?.intent === "assignment" &&
      assignment()?.stage === "ongoing" &&
      /email|instructions|dataset|data points|100|5/i.test(
        assignment()?.nextAction ?? "",
      ),
  },
  {
    name: "saved draft remains unfinished",
    id: "12307",
    status: "Draft (not submitted)",
    check: () =>
      assignment()?.stage === "ongoing" &&
      assignment()?.progress.at(-1)?.kind === "draft_saved",
  },
  {
    name: "same-name second assignment stays separate",
    id: "12308",
    status: "No submissions have been made yet",
    check: () =>
      store.agent.tasks().length === 2 &&
      assignment("12308")?.intent === "assignment",
  },
  {
    name: "matching pending-to-submitted status completes only first assignment",
    id: "12307",
    status: "Submitted for grading",
    check: () =>
      assignment()?.stage === "completed" &&
      assignment("12308")?.stage === "ongoing",
  },
  {
    name: "already submitted first visit adds no obligation",
    hostIgnore: true,
    id: "12309",
    status: "Submitted for grading",
    check: () => !assignment("12309") && store.agent.tasks().length === 2,
  },
];
mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
function save() {
  writeFileSync(
    output,
    JSON.stringify(
      {
        synthetic: true,
        plannedCases: cases.length,
        complete: results.length === cases.length,
        promptVersion: AGENT_PROMPT_VERSION,
        pacingMs,
        createdAt: new Date().toISOString(),
        provider: processing.provider,
        model: processing.model,
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
try {
  for (const [index, item] of cases.entries()) {
    if (index) await pause(pacingMs);
    now += 9000;
    decisions = [];
    const event = {
      version: 1 as const,
      eventId: randomUUID(),
      deviceId: device.deviceId,
      sessionId: session.id,
      streamId,
      observedAt: new Date(now).toISOString(),
      reason: "page-change" as const,
      page: {
        origin: site,
        title: "Fictional campus · Lab Assignment 1",
        content: `Lab Assignment 1\nFictional data science course\nSubmit a folder containing a self-created dataset with 100 data points and 5 dimensions. Refer to the assignment email for further instructions.\nDue: Sunday, 25 October 2026, 11:59 PM (fictional deadline).\nSubmission status\n${item.status}\nGrading status\nNot graded`,
        pageKey: key(item.id),
        fields: [],
      },
    };
    store.accept(device.deviceId, event, environment.REENTRY_APP_ORIGIN);
    const outcome = await harness.tick();
    const passed = Boolean(
      item.check() &&
      (outcome
        ? ["accepted", "ignored"].includes(outcome.state)
        : "hostIgnore" in item && item.hostIgnore),
    );
    results.push({
      name: item.name,
      passed,
      outcome,
      input: event,
      decisions,
      tasks: store.agent.tasks(),
    });
    save();
    console.log(
      `${item.name}: ${passed ? "passed" : "FAILED"} (${outcome?.state ?? "host-ignored"})`,
    );
  }
} finally {
  save();
  store.close();
  rmSync(directory, { recursive: true, force: true });
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
