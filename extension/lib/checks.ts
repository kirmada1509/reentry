import { storage } from "wxt/utils/storage";
import { z } from "zod";
import {
  CAPTURE_TTL_MS,
  checkContextSchema,
  checkFailureSchema,
} from "../../src/features/capture/protocol";
import type { CheckFailure } from "../../src/features/capture/protocol";

const sessionSchema = z.strictObject({
  context: checkContextSchema,
  tabId: z.number().int().nonnegative(),
  state: z.enum(["awaiting", "captured", "failed", "cancelled"]),
  reason: checkFailureSchema.optional(),
});
export type CheckSession = z.infer<typeof sessionSchema>;
// Session storage survives worker restarts but cannot bind old tab ids to new
// browser tabs after a browser restart.
const sessions = storage.defineItem<CheckSession[]>("session:reentry-checks", {
  defaultValue: [],
});
let operations: Promise<unknown> = Promise.resolve();
export function updateChecks<T>(
  operation: (items: CheckSession[]) => { items: CheckSession[]; result: T },
): Promise<T> {
  const next = operations
    .catch(() => undefined)
    .then(async () => {
      const all = z
        .array(sessionSchema)
        .max(20)
        .parse(await sessions.getValue());
      const now = Date.now();
      const current = all.filter(
        (item) => now - Date.parse(item.context.startedAt) < CAPTURE_TTL_MS,
      );
      const { items, result } = operation(current);
      await sessions.setValue(z.array(sessionSchema).max(20).parse(items));
      return result;
    });
  operations = next;
  return next;
}
export async function checkForTab(tabId: number) {
  return updateChecks((items) => ({
    items,
    result: items.find(
      (item) =>
        item.tabId === tabId &&
        (item.state === "awaiting" || item.state === "captured"),
    ),
  }));
}
export async function markCheck(
  id: string,
  state: CheckSession["state"],
  reason?: CheckFailure,
) {
  await updateChecks((items) => ({
    items: items.map((item) =>
      item.context.id === id && item.state !== "cancelled"
        ? { ...item, state, ...(reason ? { reason } : {}) }
        : item,
    ),
    result: undefined,
  }));
}
