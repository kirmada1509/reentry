import { requestCaptureBridge } from "../capture/bridge";
import { readConnectionConfiguration } from "../capture/config";
import type { TaskDatabase } from "./storage";

// Cross-store cleanup is an outbox: local deletion commits first, then idempotent
// extension purges are acknowledged. Failure never rolls back local deletion.
export async function flushCleanup(db: TaskDatabase) {
  const items = await db.cleanup.toArray();
  for (const item of items) {
    try {
      const reply = await requestCaptureBridge(
        readConnectionConfiguration().extensionId,
        {
          version: 1,
          type: "capture.purge",
          taskIds: item.taskIds,
          captureIds: item.captureIds,
          ...(item.before ? { before: item.before } : {}),
        },
      );
      if (reply.status !== "purged") break;
      await db.cleanup.delete(item.id);
    } catch {
      break;
    }
  }
  return db.cleanup.count();
}
