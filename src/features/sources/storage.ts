import {
  captureSchema,
  checkContextSchema,
  checkFailureSchema,
  idSchema,
} from "../capture/protocol";
import type { CheckContext, CheckFailure } from "../capture/protocol";
import { taskSchema } from "../tasks/schema";
import { captureDigest } from "../tasks/storage";
import type { TaskDatabase } from "../tasks/storage";
import { compareSources } from "./compare";
import { sourceCheckSchema } from "./schema";

export async function getTask(db: TaskDatabase, taskId: string) {
  const value = await db.tasks.get(idSchema.parse(taskId));
  if (!value) throw new Error("Saved task not found in this browser.");
  return taskSchema.parse(value);
}

export async function latestCheck(db: TaskDatabase, taskId: string) {
  const records = await db.checks
    .where("taskId")
    .equals(idSchema.parse(taskId))
    .sortBy("startedAt");
  const value = records.at(-1);
  return value ? sourceCheckSchema.parse(value) : undefined;
}

export async function getCheck(db: TaskDatabase, id: string, taskId: string) {
  const value = await db.checks.get(idSchema.parse(id));
  if (!value || value.taskId !== idSchema.parse(taskId))
    throw new Error("This check does not belong to the selected task.");
  return sourceCheckSchema.parse(value);
}

export async function beginCheck(db: TaskDatabase, taskId: string) {
  return db.transaction("rw", db.tasks, db.checks, async () => {
    const task = await getTask(db, taskId);
    const previous = await latestCheck(db, task.id);
    if (
      previous?.status === "awaiting" &&
      (previous.taskRevision ?? 1) === task.revision
    )
      return previous;
    const startedAt = new Date(
      Math.max(Date.now(), previous ? Date.parse(previous.startedAt) + 1 : 0),
    ).toISOString();
    const context: CheckContext = {
      id: crypto.randomUUID(),
      taskId: task.id,
      baselineId: task.source.id,
      baselineDigest: task.source.digest,
      sourceUrl: task.source.url,
      goal: task.goal,
      startedAt,
    };
    const record = sourceCheckSchema.parse({
      id: context.id,
      taskId: task.id,
      context,
      taskRevision: task.revision,
      before: task.source,
      startedAt,
      status: "awaiting",
    });
    await db.checks.add(record);
    return record;
  });
}

export async function finishCheckFailure(
  db: TaskDatabase,
  id: string,
  taskId: string,
  reason: CheckFailure,
) {
  checkFailureSchema.parse(reason);
  return db.transaction("rw", db.checks, async () => {
    const check = await getCheck(db, id, taskId);
    if (check.status !== "awaiting") return check;
    const result = sourceCheckSchema.parse({
      ...check,
      status: reason === "cancelled" ? "cancelled" : "failed",
      reason,
      completedAt: new Date().toISOString(),
    });
    await db.checks.put(result);
    return result;
  });
}

export async function saveComparison(
  db: TaskDatabase,
  rawContext: unknown,
  rawCapture: unknown,
  sameSection: boolean,
) {
  const context = checkContextSchema.parse(rawContext);
  const capture = captureSchema.parse(rawCapture);
  const digest = await captureDigest(capture);
  return db.transaction("rw", db.tasks, db.checks, async () => {
    const task = await getTask(db, context.taskId);
    const check = await getCheck(db, context.id, task.id);
    if (
      (check.taskRevision ?? 1) !== task.revision ||
      JSON.stringify(context) !== JSON.stringify(check.context) ||
      task.source.id !== context.baselineId ||
      task.source.digest !== context.baselineDigest
    )
      throw new Error(
        "The task or source association changed. Start a new check.",
      );
    if (check.status !== "awaiting") {
      if (check.after?.id === capture.id && check.after.digest === digest)
        return check;
      throw new Error("This check is already closed. Start another check.");
    }
    if (
      (await db.tasks.where("captureId").equals(capture.id).count()) ||
      (await db.checks.where("captureId").equals(capture.id).count())
    )
      throw new Error("This capture has already been used elsewhere.");
    const result = sourceCheckSchema.parse({
      ...check,
      after: { ...capture, digest },
      captureId: capture.id,
      sameSection,
      completedAt: new Date().toISOString(),
      ...compareSources(check.before, capture, sameSection),
    });
    await db.checks.put(result);
    return result;
  });
}
