import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { taskSchema } from "@/features/agent/schema";
import {
  evaluationCorpus,
  scoreStep,
  summarize,
} from "../scripts/lib/agent-evaluation";
import corpus from "./fixtures/agent-release-v1.json";
const task = () =>
  taskSchema.parse({
    id: randomUUID(),
    revision: 1,
    origin: "https://example.com",
    goal: "Buy a fictional lamp",
    intent: "purchase",
    stage: "ongoing",
    finishCondition: "A fresh lamp confirmation",
    nextAction: "Review the lamp",
    evidence: [{ eventId: randomUUID(), quote: "Your cart contains the lamp" }],
    updatedAt: new Date().toISOString(),
    corrected: false,
    dismissed: false,
  });
const step = {
  id: "new",
  role: "lamp",
  newTask: true,
  intent: "purchase" as const,
  stream: "work",
  notCompleted: ["lamp"],
};
it("the frozen corpus separates cohorts and includes positive and negative source cases", () => {
  const parsed = evaluationCorpus.parse(corpus);
  expect(new Set(parsed.traces.map((t) => t.cohort))).toEqual(
    new Set(["regression", "held-out"]),
  );
  expect(
    parsed.traces
      .flatMap((t) => t.steps)
      .some((s) => s.stages?.includes("completed")),
  ).toBe(true);
  expect(
    parsed.traces.flatMap((t) => t.steps).filter((s) => s.notCompleted.length)
      .length,
  ).toBeGreaterThan(15);
  expect(() => evaluationCorpus.parse({ ...corpus, traces: [] })).toThrow();
  for (const trace of parsed.traces) {
    expect(new Set(trace.steps.map((s) => s.id)).size).toBe(trace.steps.length);
    for (const s of trace.steps)
      if (s.content)
        expect(s.content).not.toMatch(
          /expected|newTask|notCompleted|held-out|oracle/i,
        );
  }
});
it("an unrelated task merge is a discovery error and merge, not a successful new task", () => {
  const first = task(),
    roles = new Map([["prior", first.id]]);
  const row = scoreStep(step, [first], [{ ...first, revision: 2 }], roles);
  expect(row).toMatchObject({
    passed: false,
    discoveryOpportunity: true,
    discoveryError: true,
    mergeOpportunity: true,
    wrongMerge: true,
    falseCompletions: 0,
  });
  expect(scoreStep(step, [], [first], new Map())).toMatchObject({
    passed: true,
    negativeChecks: 1,
  });
});
it("a missing task cannot silently count as a verified negative or a successful completion check", () => {
  const row = scoreStep(step, [], [], new Map());
  expect(row).toMatchObject({
    passed: false,
    falseCompletions: 0,
    negativeChecks: 1,
    unverifiableNegatives: 1,
  });
  const first = task();
  const roles = new Map([["lamp", first.id]]);
  const positive = scoreStep(
    { ...step, newTask: false, stages: ["completed"] },
    [first],
    [first],
    roles,
  );
  expect(positive.problems).toContain("stage");
  const negative = scoreStep(
    { ...step, newTask: false },
    [first],
    [{ ...first, stage: "completed", revision: 2 }],
    roles,
  );
  expect(negative).toMatchObject({ passed: false, falseCompletions: 1 });
});
it("aggregates failures, real call attempts and correction counts with explicit denominators", () => {
  const first = task();
  const row = scoreStep(step, [], [first], new Map());
  const missing = scoreStep(step, [], [], new Map());
  const report = summarize([
    {
      ...row,
      calls: 2,
      durationMs: 100,
      failedJob: false,
      plannedCorrection: false,
    },
    {
      ...missing,
      calls: 1,
      durationMs: 45000,
      failedJob: true,
      plannedCorrection: false,
    },
    {
      ...row,
      calls: 0,
      durationMs: 2,
      failedJob: false,
      plannedCorrection: true,
    },
  ]);
  expect(report).toMatchObject({
    steps: 3,
    passed: 2,
    model: { calls: 3, jobs: 2, failedJobs: 1 },
    completion: { negativeChecks: 3, unverifiableChecks: 1 },
    corrections: {
      scripted: 1,
      operator: 0,
      requiredHumanRate: "not measured",
    },
    latencyMs: { samples: 2, median: 100, p95: 45000 },
  });
});
