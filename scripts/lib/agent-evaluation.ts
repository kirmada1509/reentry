import { z } from "zod";
import type { AgentTask } from "../../src/features/agent/schema";
import {
  checkpointKindSchema,
  taskSchema,
} from "../../src/features/agent/schema";

const intent = z.enum(["research", "purchase", "application"]);
export const evaluationCorpus = z.strictObject({
  version: z.literal("agent-release-v1"),
  description: z.string(),
  traces: z
    .array(
      z.strictObject({
        id: z.string(),
        cohort: z.enum(["regression", "held-out"]),
        steps: z
          .array(
            z
              .strictObject({
                id: z.string(),
                page: z.string().optional(),
                title: z.string().optional(),
                content: z.string().optional(),
                stream: z.string().default("work"),
                role: z.string().optional(),
                intent: intent.optional(),
                stages: z.array(taskSchema.shape.stage).optional(),
                checkpoint: checkpointKindSchema.optional(),
                newTask: z.boolean().optional(),
                noNewTask: z.boolean().optional(),
                notCompleted: z.array(z.string()).default([]),
                correction: z
                  .strictObject({
                    goal: z.string(),
                    finishCondition: z.string(),
                    intent,
                  })
                  .optional(),
              })
              .refine(
                (s) =>
                  s.correction
                    ? Boolean(s.role)
                    : Boolean(s.page && s.title && s.content),
                "Provide a correction role or an observation source.",
              ),
          )
          .min(1)
          .max(30),
      }),
    )
    .min(1)
    .max(20),
});
export type EvaluationStep = z.infer<
  typeof evaluationCorpus
>["traces"][number]["steps"][number];

/** Ground truth stays in the evaluator. Only page text enters the model. */
export function scoreStep(
  step: EvaluationStep,
  before: AgentTask[],
  after: AgentTask[],
  roles: Map<string, string>,
) {
  const added = after.filter((t) => !before.some((b) => b.id === t.id));
  const changed = after.filter(
    (t) => before.find((b) => b.id === t.id)?.revision !== t.revision,
  );
  const knownRoleIds = new Set(roles.values());
  const prior = step.role ? roles.get(step.role) : undefined;
  if (step.role && !prior && changed.length === 1)
    roles.set(step.role, changed[0]!.id);
  const task = after.find(
    (t) => t.id === (step.role ? roles.get(step.role) : undefined),
  );
  const discoveryOpportunity = Boolean(step.newTask || step.noNewTask);
  const discoveryError = Boolean(
    (step.newTask &&
      (added.length !== 1 ||
        !task ||
        (step.intent && task.intent !== step.intent))) ||
    (step.noNewTask && added.length !== 0),
  );
  const mergeOpportunity = Boolean(step.newTask && knownRoleIds.size);
  const wrongMerge = Boolean(
    mergeOpportunity && task && knownRoleIds.has(task.id),
  );
  const negative = step.notCompleted.map((role) =>
    after.find((t) => t.id === roles.get(role)),
  );
  const falseCompletions = negative.filter(
    (t) => t?.stage === "completed",
  ).length;
  const unverifiableNegatives = negative.filter((t) => !t).length;
  const problems: string[] = [];
  if (discoveryError) problems.push("task-discovery");
  if (wrongMerge) problems.push("wrong-merge");
  if (step.role && !task) problems.push("missing-task");
  if (step.intent && task?.intent !== step.intent) problems.push("intent");
  if (step.stages && (!task || !step.stages.includes(task.stage)))
    problems.push("stage");
  if (step.checkpoint && task?.progress.at(-1)?.kind !== step.checkpoint)
    problems.push("checkpoint");
  if (prior && added.length && step.role)
    problems.push("unexpected-task-split");
  if (falseCompletions) problems.push("false-completion");
  if (unverifiableNegatives) problems.push("unverifiable-negative");
  if (step.correction && task?.goal !== step.correction.goal)
    problems.push("lost-correction");
  const priorTask = before.find((t) => t.id === prior);
  if (
    priorTask?.corrected &&
    task &&
    !step.correction &&
    (task.goal !== priorTask.goal ||
      task.finishCondition !== priorTask.finishCondition ||
      task.intent !== priorTask.intent)
  )
    problems.push("lost-correction");
  return {
    passed: problems.length === 0,
    problems,
    discoveryOpportunity,
    discoveryError,
    mergeOpportunity,
    wrongMerge,
    negativeChecks: negative.length,
    unverifiableNegatives,
    falseCompletions,
    taskId: task?.id ?? null,
  };
}

export function summarize(
  rows: Array<
    ReturnType<typeof scoreStep> & {
      calls: number;
      durationMs: number;
      failedJob: boolean;
      plannedCorrection: boolean;
    }
  >,
) {
  const sum = (
    field:
      | "calls"
      | "durationMs"
      | "negativeChecks"
      | "falseCompletions"
      | "unverifiableNegatives",
  ) => rows.reduce((n, r) => n + r[field], 0);
  const latencies = rows
    .filter((r) => !r.plannedCorrection)
    .map((r) => r.durationMs)
    .sort((a, b) => a - b);
  return {
    steps: rows.length,
    passed: rows.filter((r) => r.passed && !r.failedJob).length,
    discovery: {
      errors: rows.filter((r) => r.discoveryError).length,
      opportunities: rows.filter((r) => r.discoveryOpportunity).length,
    },
    merging: {
      wrongMerges: rows.filter((r) => r.wrongMerge).length,
      opportunities: rows.filter((r) => r.mergeOpportunity).length,
    },
    completion: {
      falseCompletions: sum("falseCompletions"),
      negativeChecks: sum("negativeChecks"),
      unverifiableChecks: sum("unverifiableNegatives"),
    },
    corrections: {
      scripted: rows.filter((r) => r.plannedCorrection).length,
      operator: 0,
      steps: rows.length,
      requiredHumanRate: "not measured",
    },
    model: {
      calls: sum("calls"),
      jobs: rows.filter((r) => !r.plannedCorrection).length,
      failedJobs: rows.filter((r) => r.failedJob).length,
    },
    latencyMs: {
      samples: latencies.length,
      median: latencies.length
        ? latencies[Math.floor((latencies.length - 1) * 0.5)]
        : null,
      p95: latencies.length
        ? latencies[Math.ceil(latencies.length * 0.95) - 1]
        : null,
      total: sum("durationMs"),
    },
  };
}
