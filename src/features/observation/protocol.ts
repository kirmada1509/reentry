import { z } from "zod";
import {
  recoveryTickSchema,
  notificationResultSchema,
} from "../agent/recovery-schema";

export const originSchema = z
  .string()
  .max(300)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        /^https?:$/.test(url.protocol) &&
        url.origin === value &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Enter an exact http:// or https:// site address without a path.");
export const scopeSchema = z
  .strictObject({
    allSites: z.boolean(),
    origins: z.array(originSchema).max(10),
    policy: z.literal("local-observation-v1"),
  })
  .refine((v) => v.allSites || v.origins.length > 0, "Choose a site.");
export type ObservationScope = z.infer<typeof scopeSchema>;
export const sessionSchema = z.strictObject({
  id: z.uuid(),
  scope: scopeSchema,
  paused: z.boolean(),
});
export type ObservationSession = z.infer<typeof sessionSchema>;
export const pageSchema = z.strictObject({
  origin: originSchema,
  title: z.string().max(240),
  content: z.string().max(8000),
  pageKey: z.string().regex(/^[a-f0-9]{64}$/),
  fields: z
    .array(z.strictObject({ label: z.string().max(100), present: z.boolean() }))
    .max(30),
});
export const eventSchema = z.strictObject({
  version: z.literal(1),
  eventId: z.uuid(),
  sessionId: z.uuid(),
  deviceId: z.uuid(),
  streamId: z.uuid().optional(),
  observedAt: z.iso.datetime(),
  reason: z.enum([
    "navigation",
    "page-change",
    "form-status",
    "submit-attempt",
  ]),
  page: pageSchema,
});
export type ObservationEvent = z.infer<typeof eventSchema>;
export function scopeAllows(
  scope: ObservationScope,
  origin: string,
  appOrigin: string,
) {
  return (
    origin !== appOrigin &&
    originSchema.safeParse(origin).success &&
    (scope.allSites || scope.origins.includes(origin))
  );
}
export const deviceRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("recovery_tick"),
    tick: recoveryTickSchema,
  }),
  z.strictObject({
    action: z.literal("notification_check"),
    id: notificationResultSchema.shape.id,
    sessionId: z.uuid(),
  }),
  z.strictObject({
    action: z.literal("notification_result"),
    delivery: notificationResultSchema,
  }),
  z.strictObject({
    action: z.literal("pair"),
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.strictObject({
    action: z.literal("session"),
    scope: scopeSchema,
    paused: z.boolean(),
  }),
  z.strictObject({ action: z.literal("status") }),
  z.strictObject({ action: z.literal("tasks") }),
  z.strictObject({ action: z.literal("task_change"), change: z.unknown() }),
  z.strictObject({ action: z.literal("event"), event: eventSchema }),
]);
export const webActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("challenge") }),
  z.strictObject({ action: z.literal("pause") }),
  z.strictObject({ action: z.literal("clear") }),
]);
export const agentBridgeSchema = z.discriminatedUnion("type", [
  z.strictObject({
    version: z.literal(1),
    type: z.literal("agent.pair"),
    challenge: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.strictObject({ version: z.literal(1), type: z.literal("agent.open") }),
  z.strictObject({ version: z.literal(1), type: z.literal("agent.sync") }),
]);
export type AgentBridgeRequest = z.infer<typeof agentBridgeSchema>;
export const companionStatusSchema = z.strictObject({
  paired: z.boolean(),
  session: sessionSchema.nullable(),
  pending: z.number().int().min(0),
  dropped: z.number().int().min(0),
  lastDelivered: z.iso.datetime().nullable(),
  problem: z.enum([
    "none",
    "offline",
    "revoked",
    "storage",
    "capacity",
    "permission",
    "reader",
  ]),
  challengeReady: z.boolean(),
  notificationsReady: z.boolean().default(false),
});
export type CompanionStatus = z.infer<typeof companionStatusSchema>;
export const dashboardSchema = z.strictObject({
  paired: z.boolean(),
  session: sessionSchema.nullable(),
  lastSeen: z.iso.datetime().nullable(),
  observations: z.array(eventSchema).max(20),
});
export type ObservationDashboard = z.infer<typeof dashboardSchema>;
