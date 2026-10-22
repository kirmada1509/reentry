import { z } from "zod";
import {
  checkContextSchema,
  checkFailureSchema,
  idSchema,
} from "../capture/protocol";
import { sourceSnapshotSchema } from "../tasks/schema";

export const comparisonReasonSchema = z.enum([
  "different-url",
  "different-section",
  "different-mode",
  "different-extractor",
  "section-unconfirmed",
]);
export type ComparisonReason = z.infer<typeof comparisonReasonSchema>;
export const sourceCheckSchema = z
  .strictObject({
    id: idSchema,
    taskId: idSchema,
    taskRevision: z.number().int().positive().optional(),
    context: checkContextSchema,
    startedAt: z.iso.datetime(),
    before: sourceSnapshotSchema,
    status: z.enum([
      "awaiting",
      "unchanged",
      "changed",
      "incomparable",
      "failed",
      "cancelled",
    ]),
    after: sourceSnapshotSchema.optional(),
    captureId: idSchema.optional(),
    completedAt: z.iso.datetime().optional(),
    sameSection: z.boolean().optional(),
    reason: z.union([comparisonReasonSchema, checkFailureSchema]).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.id !== value.context.id ||
      value.taskId !== value.context.taskId ||
      value.before.id !== value.context.baselineId ||
      value.before.digest !== value.context.baselineDigest
    )
      context.addIssue({
        code: "custom",
        message: "Check association is inconsistent.",
      });
    const compared = ["changed", "unchanged", "incomparable"].includes(
      value.status,
    );
    if (
      compared !== Boolean(value.after) ||
      (compared && (!value.captureId || value.captureId !== value.after?.id))
    )
      context.addIssue({
        code: "custom",
        message: "A completed comparison must retain its source capture.",
      });
  });
export type SourceCheck = z.infer<typeof sourceCheckSchema>;
