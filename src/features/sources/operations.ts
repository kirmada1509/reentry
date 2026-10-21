import { requestCaptureBridge } from "../capture/bridge";
import { readConnectionConfiguration } from "../capture/config";
import {
  captureSchema,
  checkContextSchema,
  idSchema,
} from "../capture/protocol";
import type { Capture, CheckContext, CheckFailure } from "../capture/protocol";
import type { TaskDatabase } from "../tasks/storage";
import type { SourceCheck } from "./schema";
import {
  beginCheck,
  finishCheckFailure,
  getCheck,
  saveComparison,
} from "./storage";

function bridge() {
  return readConnectionConfiguration().extensionId;
}

export async function startSourceCheck(db: TaskDatabase, taskId: string) {
  const check = await beginCheck(db, taskId);
  try {
    const reply = await requestCaptureBridge(bridge(), {
      version: 1,
      type: "check.start",
      check: check.context,
    });
    if (reply.status !== "check-started" || reply.checkId !== check.id)
      throw new Error("Check not started.");
    return check;
  } catch {
    return finishCheckFailure(db, check.id, taskId, "extension-unavailable");
  }
}

export async function refreshSourceCheck(
  db: TaskDatabase,
  rawCheck: SourceCheck,
) {
  const check = await getCheck(db, rawCheck.id, rawCheck.taskId);
  if (check.status !== "awaiting") return check;
  try {
    const reply = await requestCaptureBridge(bridge(), {
      version: 1,
      type: "check.status",
      checkId: check.id,
      taskId: check.taskId,
    });
    if (reply.status !== "check-status")
      return finishCheckFailure(db, check.id, check.taskId, "context-lost");
    if (reply.checkId !== check.id) throw new Error("Wrong check status.");
    if (reply.state === "failed" || reply.state === "cancelled")
      return finishCheckFailure(
        db,
        check.id,
        check.taskId,
        reply.state === "cancelled"
          ? "cancelled"
          : (reply.reason ?? "capture-failed"),
      );
    return check;
  } catch {
    return finishCheckFailure(
      db,
      check.id,
      check.taskId,
      "extension-unavailable",
    );
  }
}

export async function closeSourceCheck(
  db: TaskDatabase,
  check: SourceCheck,
  reason: CheckFailure,
) {
  const result = await finishCheckFailure(db, check.id, check.taskId, reason);
  try {
    await requestCaptureBridge(bridge(), {
      version: 1,
      type: "check.cancel",
      checkId: check.id,
      taskId: check.taskId,
    });
  } catch {
    /* The durable closed check prevents later imports from reviving it. */
  }
  return result;
}

export async function receiveRecapture(
  db: TaskDatabase,
  taskId: string,
  checkId: string,
  captureId: string,
) {
  idSchema.parse(captureId);
  const check = await getCheck(db, checkId, taskId);
  if (check.captureId === captureId && check.after)
    // Stored snapshots also carry a digest; only remove that internal metadata.
    return {
      check,
      capture: captureSchema.strip().parse(check.after),
      saved: true,
    };
  if (check.status !== "awaiting")
    throw new Error(
      "This check is closed. Start a new check from the saved task.",
    );
  const reply = await requestCaptureBridge(bridge(), {
    version: 1,
    type: "capture.get",
    captureId,
  });
  if (
    reply.status !== "capture" ||
    reply.capture.id !== captureId ||
    !reply.check ||
    JSON.stringify(reply.check) !== JSON.stringify(check.context)
  )
    throw new Error(
      "This capture does not belong to this task and check, or is no longer available. Reopen its extension preview.",
    );
  return { check, capture: reply.capture, saved: false };
}

export async function persistRecapture(
  db: TaskDatabase,
  rawContext: CheckContext,
  rawCapture: Capture,
  sameSection: boolean,
) {
  const context = checkContextSchema.parse(rawContext);
  const capture = captureSchema.parse(rawCapture);
  const fresh = await receiveRecapture(
    db,
    context.taskId,
    context.id,
    capture.id,
  );
  if (JSON.stringify(fresh.capture) !== JSON.stringify(capture))
    throw new Error("The capture changed during review. Reopen the preview.");
  return saveComparison(db, context, capture, sameSection);
}

export async function acknowledgeRecapture(check: SourceCheck) {
  if (!check.captureId) return false;
  try {
    const reply = await requestCaptureBridge(bridge(), {
      version: 1,
      type: "capture.ack",
      captureId: check.captureId,
      taskId: check.taskId,
      checkId: check.id,
    });
    return reply.status === "acknowledged";
  } catch {
    return false;
  }
}
