import { storage } from "wxt/utils/storage";
import { z } from "zod";
import {
  isFresh,
  pendingSchema,
  PENDING_LIMIT,
} from "../../src/features/capture/protocol";
import type { PendingCapture } from "../../src/features/capture/protocol";

const pending = storage.defineItem<PendingCapture[]>("local:reentry-pending", {
  defaultValue: [],
});
let operations: Promise<unknown> = Promise.resolve();

// All writers live in the worker. Serialize read/modify/write operations there.
export function updatePending<T>(
  operation: (items: PendingCapture[]) => {
    items: PendingCapture[];
    result: T;
  },
): Promise<T> {
  const next = operations
    .catch(() => undefined)
    .then(async () => {
      const parsed = z
        .array(pendingSchema)
        .max(PENDING_LIMIT)
        .safeParse(await pending.getValue());
      if (!parsed.success)
        throw new Error("Pending capture storage is invalid.");
      const current = parsed.data.filter((item) => isFresh(item.capture));
      const { items, result } = operation(current);
      await pending.setValue(
        z.array(pendingSchema).max(PENDING_LIMIT).parse(items),
      );
      return result;
    });
  operations = next;
  return next;
}
