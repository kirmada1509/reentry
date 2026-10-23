import { z } from "zod";

// Work links never enter model context. Keep only a browser-validated origin/path.
export function workLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password)
      return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}
export const workLinkSchema = z
  .string()
  .max(2000)
  .refine((v) => workLink(v) === v);
export const reminderPolicySchema = z
  .strictObject({
    enabled: z.boolean(),
    awayMinutes: z.number().int().min(15).max(240),
    quietEnabled: z.boolean(),
    quietStart: z.number().int().min(0).max(1439),
    quietEnd: z.number().int().min(0).max(1439),
    timeZone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Use a supported timezone, such as Asia/Kolkata."),
  })
  .refine(
    (p) => !p.quietEnabled || p.quietStart !== p.quietEnd,
    "Quiet hours must have different start and end times.",
  );
export type ReminderPolicy = z.infer<typeof reminderPolicySchema>;
export const defaultReminderPolicy: ReminderPolicy = {
  enabled: false,
  awayMinutes: 45,
  quietEnabled: true,
  quietStart: 22 * 60,
  quietEnd: 8 * 60,
  timeZone: "UTC",
};
export const recoveryTickSchema = z.strictObject({
  sessionId: z.uuid().nullable(),
  observedAt: z.iso.datetime(),
  current: z
    .strictObject({
      url: workLinkSchema,
      pageKey: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .nullable(),
  notificationsReady: z.boolean(),
});
export type RecoveryTick = z.infer<typeof recoveryTickSchema>;
export const notificationResultSchema = z.strictObject({
  id: z.string().regex(/^reentry-return-[a-f0-9]{64}$/),
  result: z.enum(["delivered", "failed", "cancelled"]),
});
export const recoveryItemSchema = z.strictObject({
  taskId: z.uuid(),
  state: z.enum(["active", "away", "interrupted", "waiting", "returned"]),
  lastActive: z.iso.datetime(),
  returnedAt: z.iso.datetime().nullable(),
  url: workLinkSchema.nullable(),
  muted: z.boolean(),
  snoozedUntil: z.iso.datetime().nullable(),
});
export const recoveryViewSchema = z.strictObject({
  version: z.number().int().min(0),
  policy: reminderPolicySchema,
  items: z.array(recoveryItemSchema).max(100),
  deliveryFailed: z.boolean(),
});
export type RecoveryView = z.infer<typeof recoveryViewSchema>;
export const recoveryDeliverySchema = z.strictObject({
  notification: z
    .strictObject({ id: notificationResultSchema.shape.id })
    .nullable(),
  activeIds: z.array(notificationResultSchema.shape.id).max(100),
});
export type RecoveryDelivery = z.infer<typeof recoveryDeliverySchema>;

export function localTime(now: number, policy: ReminderPolicy) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: policy.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  const minute = Number(part("hour")) * 60 + Number(part("minute"));
  const quiet =
    policy.quietEnabled &&
    (policy.quietStart < policy.quietEnd
      ? minute >= policy.quietStart && minute < policy.quietEnd
      : minute >= policy.quietStart || minute < policy.quietEnd);
  return { day: `${part("year")}-${part("month")}-${part("day")}`, quiet };
}
