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
});
export type Capture = z.infer<typeof captureSchema>;
export const pendingSchema = z.strictObject({
  capture: captureSchema,
  status: z.enum(["draft", "confirmed"]),
});
export type PendingCapture = z.infer<typeof pendingSchema>;

export const bridgeRequestSchema = z.discriminatedUnion("type", [
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
  }),
]);
export type BridgeRequest = z.infer<typeof bridgeRequestSchema>;
export const bridgeResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("capture"), capture: captureSchema }),
  z.strictObject({ status: z.literal("acknowledged") }),
  z.strictObject({ status: z.literal("unavailable") }),
  z.strictObject({ status: z.literal("rejected") }),
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
