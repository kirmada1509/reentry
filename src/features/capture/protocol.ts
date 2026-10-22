import { z } from "zod";

export const CAPTURE_LIMIT = 20_000;
export const PENDING_LIMIT = 10;
export const CAPTURE_TTL_MS = 24 * 60 * 60 * 1000;
export const idSchema = z.uuid();
export const httpUrlSchema = z
  .string()
  .max(2048)
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        throw new Error("invalid URL");
      }
    } catch {
      context.addIssue({
        code: "custom",
        message:
          "Use a complete HTTP or HTTPS link without embedded credentials.",
      });
    }
  });

export const captureSchema = z.strictObject({
  id: idSchema,
  title: z.string().min(1).max(500),
  url: httpUrlSchema,
  text: z
    .string()
    .min(1)
    .max(CAPTURE_LIMIT)
    .refine((value) => value.trim().length > 0),
  capturedAt: z.iso.datetime(),
  mode: z.literal("selection"),
  extractorVersion: z.literal(1),
  section: z
    .strictObject({
      key: z.string().min(1).max(300),
      label: z.string().min(1).max(300),
    })
    .optional(),
});
export type Capture = z.infer<typeof captureSchema>;
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const checkContextSchema = z.strictObject({
  id: idSchema,
  taskId: idSchema,
  baselineId: idSchema,
  baselineDigest: digestSchema,
  sourceUrl: httpUrlSchema,
  goal: z.string().min(1).max(300),
  startedAt: z.iso.datetime(),
});
export type CheckContext = z.infer<typeof checkContextSchema>;
export const checkFailureSchema = z.enum([
  "cancelled",
  "no-selection",
  "unsupported",
  "too-large",
  "storage-failed",
  "capture-failed",
  "source-closed",
  "extension-unavailable",
  "source-unavailable",
  "context-lost",
]);
export type CheckFailure = z.infer<typeof checkFailureSchema>;
export const pendingSchema = z.strictObject({
  capture: captureSchema,
  status: z.enum(["draft", "confirmed"]),
  check: checkContextSchema.optional(),
});
export type PendingCapture = z.infer<typeof pendingSchema>;

export const purgeSchema = z.strictObject({
  taskIds: z.array(idSchema).max(100),
  captureIds: z.array(idSchema).max(100),
  before: z.iso.datetime().optional(),
});
export const bridgeRequestSchema = z.discriminatedUnion("type", [
  purgeSchema.extend({
    version: z.literal(1),
    type: z.literal("capture.purge"),
  }),
  z.strictObject({
    version: z.literal(1),
    type: z.literal("capture.get"),
    captureId: idSchema,
  }),
  z.strictObject({
    version: z.literal(1),
    type: z.literal("capture.ack"),
    captureId: idSchema,
    taskId: idSchema,
    checkId: idSchema.optional(),
  }),
  z.strictObject({
    version: z.literal(1),
    type: z.literal("check.start"),
    check: checkContextSchema,
  }),
  z.strictObject({
    version: z.literal(1),
    type: z.literal("check.status"),
    checkId: idSchema,
    taskId: idSchema,
  }),
  z.strictObject({
    version: z.literal(1),
    type: z.literal("check.cancel"),
    checkId: idSchema,
    taskId: idSchema,
  }),
]);
export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;
export const bridgeResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("capture"),
    capture: captureSchema,
    check: checkContextSchema.optional(),
  }),
  z.strictObject({ status: z.literal("acknowledged") }),
  z.strictObject({ status: z.literal("purged") }),
  z.strictObject({ status: z.literal("unavailable") }),
  z.strictObject({ status: z.literal("rejected") }),
  z.strictObject({ status: z.literal("check-started"), checkId: idSchema }),
  z.strictObject({
    status: z.literal("check-status"),
    checkId: idSchema,
    state: z.enum(["awaiting", "captured", "failed", "cancelled"]),
    reason: checkFailureSchema.optional(),
  }),
  z.strictObject({ status: z.literal("check-cancelled") }),
]);
export type BridgeResponse = z.infer<typeof bridgeResponseSchema>;

export function isAppSender(
  sender: { url?: string; origin?: string; id?: string; frameId?: number },
  appOrigin: string,
) {
  if (
    sender.id ||
    !sender.url ||
    (sender.frameId !== undefined && sender.frameId !== 0)
  )
    return false;
  try {
    return (
      new URL(sender.url).origin === appOrigin &&
      (!sender.origin || sender.origin === appOrigin)
    );
  } catch {
    return false;
  }
}

export function isFresh(capture: Capture, now = Date.now()) {
  const age = now - Date.parse(capture.capturedAt);
  return age >= 0 && age < CAPTURE_TTL_MS;
}
