import nextEnv from "@next/env";
import { createHash, randomUUID } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ObservationStore } from "../src/features/observation/store";
import { createTaskHarness } from "../src/features/agent/harness";
import { agentProcessing } from "../src/features/agent/processing";
import { configuredStructuredModel } from "../src/lib/ai/factory";
import { getEnvironment } from "../src/lib/env";
import { AGENT_PROMPT_VERSION } from "../src/features/agent/prompt";
import { evaluationCorpus, scoreStep, summarize } from "./lib/agent-evaluation";

nextEnv.loadEnvConfig(process.cwd());
const processing = agentProcessing(),
  env = getEnvironment();
if (!processing.available)
  throw new Error(
    "Configure a provider for this explicit fictional-data evaluation.",
  );
const output = process.argv[2] ?? "";
if (!output)
  throw new Error(
    "Supply a fresh JSON output path; earlier trials must be retained.",
  );
const bytes = readFileSync("tests/fixtures/agent-release-v1.json");
const corpus = evaluationCorpus.parse(JSON.parse(bytes.toString()));
const pacingMs = Number(process.argv[3] ?? "10000");
if (!Number.isInteger(pacingMs) || pacingMs < 0 || pacingMs > 60000)
  throw new Error("Evaluation pacing must be 0–60000 milliseconds.");
const directory = mkdtempSync(path.join(tmpdir(), "reentry-release-eval-"));
const results: Array<
  ReturnType<typeof scoreStep> & {
    trace: string;
    cohort: string;
    step: string;
    calls: number;
    durationMs: number;
    failedJob: boolean;
    plannedCorrection: boolean;
    [key: string]: unknown;
  }
> = [];
const report = {
  version: corpus.version,
  promptVersion: AGENT_PROMPT_VERSION,
  corpusSha256: createHash("sha256").update(bytes).digest("hex"),
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  createdAt: new Date().toISOString(),
  synthetic: true,
  observationClock:
    "Nine-second synthetic increments; job latency uses the real clock.",
  complete: false,
  plannedSteps: corpus.traces.reduce((n, t) => n + t.steps.length, 0),
  interruptedBy: null as string | null,
  pacingMs,
  provider: processing.provider,
  model: processing.model,
  timeoutMs: env.REENTRY_AGENT_TIMEOUT_MS,
  operatorRetries: 0,
  results,
  summary: summarize(results),
  cohorts: {} as Record<string, ReturnType<typeof summarize>>,
};
mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
function flush() {
  report.summary = summarize(results);
  for (const cohort of ["regression", "held-out"])
    report.cohorts[cohort] = summarize(
      results.filter((r) => r.cohort === cohort),
    );
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}
try {
  traces: for (const trace of corpus.traces) {
    let now = Date.now();
    const store = new ObservationStore(
      path.join(directory, `${trace.id}.sqlite`),
      () => now,
    );
    try {
      const site = "https://fictional-release.example";
      const device = store.pair(store.challenge(), env.REENTRY_EXTENSION_ID);
      const session = store.setSession(
        device.deviceId,
        { allSites: false, origins: [site], policy: "local-observation-v1" },
        false,
        env.REENTRY_APP_ORIGIN,
      ).session;
      store.agent.action(
        {
          action: "enable",
          consentId: processing.consentId,
          sessionId: session.id,
        },
        processing,
      );
      const roles = new Map<string, string>(),
        streams = new Map<string, string>();
      for (const step of trace.steps) {
        if (results.length && !step.correction) await delay(pacingMs);
        now += 9000;
        const before = store.agent.tasks();
        let calls = 0;
        const decisions: unknown[] = [];
        const started = performance.now();
        let outcome: unknown = null,
          failedJob = false;
        if (step.correction) {
          const task = before.find((t) => t.id === roles.get(step.role!));
          if (task)
            store.agent.action(
              {
                action: "correct",
                id: task.id,
                expectedRevision: task.revision,
                ...step.correction,
              },
              processing,
            );
        } else {
          if (!step.page || !step.title || !step.content)
            throw new Error(
              "An observation step needs page, title and content.",
            );
          if (!streams.has(step.stream)) streams.set(step.stream, randomUUID());
          const event = {
            version: 1 as const,
            eventId: randomUUID(),
            deviceId: device.deviceId,
            sessionId: session.id,
            streamId: streams.get(step.stream)!,
            observedAt: new Date(now).toISOString(),
            reason: "navigation" as const,
            page: {
              origin: site,
              title: step.title,
              content: step.content,
              pageKey: createHash("sha256").update(step.page).digest("hex"),
              fields: [],
            },
          };
          store.accept(device.deviceId, event, env.REENTRY_APP_ORIGIN);
          const result = await createTaskHarness(
            store.agent,
            () => ({
              generate: async (request, signal) => {
                calls++;
                const response = await configuredStructuredModel().generate(
                  request,
                  signal,
                );
                decisions.push(response.candidate);
                return response;
              },
            }),
            agentProcessing,
            env.REENTRY_AGENT_TIMEOUT_MS,
          ).tick();
          outcome = result;
          failedJob =
            !result || ["failed", "stale", "cleared"].includes(result.state);
        }
        const tasks = store.agent.tasks();
        const score = scoreStep(step, before, tasks, roles);
        results.push({
          ...score,
          trace: trace.id,
          cohort: trace.cohort,
          step: step.id,
          calls,
          durationMs: Math.round(performance.now() - started),
          failedJob,
          plannedCorrection: Boolean(step.correction),
          outcome,
          decisions,
          tasks,
          // Expected labels never enter the request; retain only fictional source text here.
          input: step.correction
            ? null
            : {
                title: step.title,
                content: step.content,
                page: step.page,
                stream: step.stream,
              },
        });
        flush();
        console.log(
          `${trace.id}/${step.id}: ${score.passed && !failedJob ? "passed" : "FAILED"}; calls=${calls}`,
        );
        if (
          outcome &&
          typeof outcome === "object" &&
          "failureCode" in outcome &&
          outcome.failureCode === "MODEL_RATE_LIMITED"
        ) {
          report.interruptedBy = "MODEL_RATE_LIMITED";
          break traces;
        }
      }
    } finally {
      store.close();
    }
  }
  report.complete = results.length === report.plannedSteps;
} finally {
  flush();
  rmSync(directory, { recursive: true, force: true });
}
console.log(JSON.stringify(report.summary));
if (
  !report.complete ||
  report.summary.passed !== report.summary.steps ||
  report.summary.completion.falseCompletions
)
  process.exitCode = 1;
