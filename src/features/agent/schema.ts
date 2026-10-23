import { z } from "zod";
import { originSchema } from "../observation/protocol";
import { reminderPolicySchema, recoveryViewSchema } from "./recovery-schema";

export const evidenceSchema = z.strictObject({
  eventId: z.uuid(),
  quote: z.string().trim().min(2).max(200),
});
export const taskDescriptionSchema = z.strictObject({
  goal: z.string().trim().min(3).max(160),
  finishCondition: z.string().trim().min(3).max(240),
  intent: z.enum(["research", "purchase", "application"]),
});
export const checkpointKindSchema = z.enum([
  "research",
  "editing",
  "cart",
  "draft_saved",
  "requirements_changed",
  "review_ready",
  "submit_attempt",
  "blocked",
  "cancelled",
  "confirmed",
]);
export const progressSchema = z.strictObject({
  kind: checkpointKindSchema,
  summary: z.string().trim().min(3).max(240),
  eventId: z.uuid(),
  observedAt: z.iso.datetime(),
  streamId: z.uuid().optional(),
  evidence: z.array(evidenceSchema).min(1).max(3),
});
const checkpointSchema = progressSchema
  .pick({ kind: true, summary: true })
  .extend({ kind: checkpointKindSchema.exclude(["confirmed"]) });
export const taskSchema = taskDescriptionSchema.extend({
  id: z.uuid(),
  revision: z.number().int().positive(),
  origin: originSchema,
  stage: z.enum([
    "candidate",
    "ongoing",
    "uncertain",
    "completed",
    "cancelled",
  ]),
  nextAction: z.string().min(3).max(240),
  evidence: z.array(evidenceSchema).min(1).max(3),
  corrected: z.boolean(),
  dismissed: z.boolean(),
  updatedAt: z.iso.datetime(),
  progress: z.array(progressSchema).max(12).default([]),
  subject: z.string().trim().min(3).max(100).optional(),
  completedBy: z.enum(["observation", "user"]).optional(),
});
export type AgentTask = z.infer<typeof taskSchema>;
export const historyRequestSchema = z.strictObject({
  id: z.uuid(),
  expectedRevision: z.number().int().positive(),
});
export const agentHistorySchema = z
  .strictObject({
    taskId: z.uuid(),
    currentRevision: z.number().int().positive(),
    revisions: z.array(taskSchema).min(1).max(10),
  })
  .refine(
    (v) =>
      v.revisions[0]?.revision === v.currentRevision &&
      v.revisions.every(
        (t, i) =>
          t.id === v.taskId &&
          (i === 0 || t.revision < v.revisions[i - 1]!.revision),
      ),
    "History does not match this task revision.",
  );
export type AgentHistory = z.infer<typeof agentHistorySchema>;
export const decisionSchema = z.discriminatedUnion("tool", [
  z.strictObject({ tool: z.literal("inspect_history") }),
  z.strictObject({ tool: z.literal("read_task"), taskId: z.uuid() }),
  z.strictObject({ tool: z.literal("ignore") }),
  z.strictObject({
    tool: z.literal("upsert_task"),
    taskId: z.uuid().nullable(),
    ...taskDescriptionSchema.shape,
    stage: z.enum(["candidate", "ongoing", "uncertain"]),
    nextAction: z.string().min(3).max(240),
    evidence: z.array(evidenceSchema).min(1).max(3),
    checkpoint: checkpointSchema.optional(),
    subject: z.string().trim().min(3).max(100).optional(),
  }),
  z.strictObject({
    tool: z.literal("complete_task"),
    taskId: z.uuid(),
    anchorEventId: z.uuid(),
    receiptSubject: z.string().trim().min(3).max(100).nullable(),
    evidence: z.array(evidenceSchema).min(1).max(3),
  }),
]);
export type AgentDecision = z.infer<typeof decisionSchema>;
// Model citations are references; the host copies source text. Verbose providers
// may return up to 80 references. Validate every one before retaining three.
export const modelDecisionSchema = z.discriminatedUnion("tool", [
  decisionSchema.options[0],
  decisionSchema.options[1],
  decisionSchema.options[2],
  decisionSchema.options[3].omit({ evidence: true }).extend({
    evidenceRefs: z.array(z.string().min(3).max(80)).min(1).max(80),
  }),
  decisionSchema.options[4].omit({ evidence: true }).extend({
    evidenceRefs: z.array(z.string().min(3).max(80)).min(1).max(80),
  }),
]);
export type AgentModelDecision = z.infer<typeof modelDecisionSchema>;
export const agentActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("reminder_policy"),
    expectedVersion: z.number().int().min(0),
    policy: reminderPolicySchema,
  }),
  z.strictObject({
    action: z.literal("recovery"),
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
    change: z.enum(["wait", "resume", "snooze", "mute", "unmute"]),
  }),
  z.strictObject({
    action: z.literal("enable"),
    consentId: z.string().length(64),
    sessionId: z.uuid(),
  }),
  z.strictObject({ action: z.literal("disable") }),
  z.strictObject({ action: z.literal("retry") }),
  z.strictObject({
    action: z.literal("correct"),
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
    ...taskDescriptionSchema.shape,
  }),
  z.strictObject({
    action: z.literal("dismiss"),
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.enum(["delete", "reopen", "finish"]),
    id: z.uuid(),
    expectedRevision: z.number().int().positive(),
  }),
]);
export type AgentAction = z.infer<typeof agentActionSchema>;
export const agentViewSchema = z.strictObject({
  enabled: z.boolean(),
  recovery: recoveryViewSchema,
  status: z.enum([
    "off",
    "ready",
    "thinking",
    "unavailable",
    "budget",
    "needs-consent",
  ]),
  tasks: z.array(taskSchema).max(100),
  callsRemaining: z.number().int().min(0),
  processing: z.strictObject({
    provider: z.string(),
    model: z.string().nullable(),
    hosted: z.boolean(),
    available: z.boolean(),
    consentId: z.string().length(64),
  }),
});
export type AgentView = z.infer<typeof agentViewSchema>;
