import { z } from "zod";
import { originSchema } from "../observation/protocol";

export const evidenceSchema = z.strictObject({
  eventId: z.uuid(),
  quote: z.string().trim().min(2).max(200),
});
export const taskDescriptionSchema = z.strictObject({
  goal: z.string().trim().min(3).max(160),
  finishCondition: z.string().trim().min(3).max(240),
  intent: z.enum(["research", "purchase", "application"]),
});
export const taskSchema = taskDescriptionSchema.extend({
  id: z.uuid(),
  revision: z.number().int().positive(),
  origin: originSchema,
  stage: z.enum(["candidate", "ongoing", "uncertain"]),
  nextAction: z.string().min(3).max(240),
  evidence: z.array(evidenceSchema).min(1).max(3),
  corrected: z.boolean(),
  dismissed: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type AgentTask = z.infer<typeof taskSchema>;
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
  }),
]);
export type AgentDecision = z.infer<typeof decisionSchema>;
// Model citations are references; the host, not the model, copies source text.
export const modelDecisionSchema = z.discriminatedUnion("tool", [
  decisionSchema.options[0],
  decisionSchema.options[1],
  decisionSchema.options[2],
  decisionSchema.options[3]
    .omit({ evidence: true })
    .extend({ evidenceRefs: z.array(z.string().min(3).max(80)).min(1).max(8) }),
]);
export type AgentModelDecision = z.infer<typeof modelDecisionSchema>;
export const agentActionSchema = z.discriminatedUnion("action", [
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
]);
export type AgentAction = z.infer<typeof agentActionSchema>;
export const agentViewSchema = z.strictObject({
  enabled: z.boolean(),
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
