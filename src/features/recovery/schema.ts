import { z } from "zod";
import { digestSchema, idSchema } from "../capture/protocol";
import { taskSchema } from "../tasks/schema";
import { sourceCheckSchema } from "../sources/schema";

export const PROMPT_VERSION = "recovery-2";
export const SCHEMA_VERSION = 1;
export const recoveryInputSchema = z
  .strictObject({
    task: taskSchema.extend({
      goal: z.string().min(1).max(300),
      progress: z.string().min(1).max(3000),
      nextAction: z.string().min(1).max(1000),
      materialUrls: taskSchema.shape.materialUrls.max(5),
    }),
    check: sourceCheckSchema,
  })
  .superRefine(({ task, check }, ctx) => {
    if (
      task.captureId !== task.source.id ||
      check.context.sourceUrl !== task.source.url ||
      check.taskId !== task.id ||
      check.context.baselineDigest !== task.source.digest ||
      check.context.baselineId !== task.source.id ||
      !check.after ||
      !["changed", "unchanged"].includes(check.status) ||
      check.sameSection !== true
    )
      ctx.addIssue({
        code: "custom",
        message: "Comparable, task-associated evidence is required.",
      });
  });
export type RecoveryInput = z.infer<typeof recoveryInputSchema>;
const citationSchema = z.strictObject({
  sourceId: idSchema,
  quote: z.string().min(1).max(1000),
});
export const proposalSchema = z.strictObject({
  assessment: z.enum(["changed", "unchanged", "uncertain"]),
  summary: z.string().trim().min(1).max(600),
  confirmedProgress: z.string().min(1).max(3000),
  changes: z
    .array(
      z.strictObject({
        description: z.string().min(1).max(500),
        before: citationSchema,
        after: citationSchema,
      }),
    )
    .max(4),
  questions: z.array(z.string().min(1).max(300)).max(3),
  nextAction: z.strictObject({
    instruction: z.string().trim().min(1).max(1000),
    target: z.literal("work"),
  }),
});
export type RecoveryProposal = z.infer<typeof proposalSchema>;
export const executionSchema = z.strictObject({
  provider: z.string().min(1).max(80),
  model: z.string().min(1).max(200),
  modelDigest: z.string().max(200).nullable(),
  promptVersion: z.string().min(1).max(80),
  schemaVersion: z.literal(SCHEMA_VERSION),
  durationMs: z.number().nonnegative(),
  settings: z
    .record(
      z.string().max(50),
      z.union([z.string().max(200), z.number().finite(), z.boolean()]),
    )
    .refine((value) => Object.keys(value).length <= 10),
});
export const recoveryResultSchema = z.strictObject({
  id: idSchema,
  inputDigest: digestSchema,
  createdAt: z.iso.datetime(),
  proposal: proposalSchema,
  execution: executionSchema,
});
export type RecoveryResult = z.infer<typeof recoveryResultSchema>;
export const recoveryRecordSchema = recoveryResultSchema.extend({
  taskId: idSchema,
  checkId: idSchema,
  reviewedAction: z.string().trim().min(1).max(1000).optional(),
  reviewedAt: z.iso.datetime().optional(),
});
export type RecoveryRecord = z.infer<typeof recoveryRecordSchema>;
export const modelStatusSchema = z.strictObject({
  enabled: z.boolean(),
  provider: z.string(),
  model: z.string().nullable(),
  processing: z.literal("local"),
});
