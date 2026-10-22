import Dexie from "dexie";
import { z } from "zod";
import type { TaskDatabase } from "../tasks/storage";
import { getTask, latestCheck } from "../sources/storage";
import { inputDigest, validateInput, validateProposal } from "./validate";
import { recoveryRecordSchema, recoveryResultSchema } from "./schema";

export async function currentRecoveryInput(db: TaskDatabase, taskId: string) {
  const task = await getTask(db, taskId);
  const check = await latestCheck(db, taskId);
  return validateInput({ task, check });
}
export async function saveRecovery(
  db: TaskDatabase,
  taskId: string,
  rawResult: unknown,
) {
  const result = recoveryResultSchema.parse(rawResult);
  return db.transaction("rw", db.tasks, db.checks, db.recoveries, async () => {
    const input = await Dexie.waitFor(currentRecoveryInput(db, taskId));
    if ((await Dexie.waitFor(inputDigest(input))) !== result.inputDigest)
      throw new Error(
        "Recovery is outdated. Check the current task and request a new suggestion.",
      );
    validateProposal(result.proposal, input);
    const record = recoveryRecordSchema.parse({
      ...result,
      taskId,
      checkId: input.check.id,
    });
    const existing = await db.recoveries.get(record.id);
    if (existing) {
      if (
        JSON.stringify({
          ...existing,
          reviewedAction: undefined,
          reviewedAt: undefined,
        }) !== JSON.stringify(record)
      )
        throw new Error("Conflicting recovery result.");
      return recoveryRecordSchema.parse(existing);
    }
    await db.recoveries.add(record);
    return record;
  });
}
export async function latestRecovery(db: TaskDatabase, taskId: string) {
  const records = await db.recoveries
    .where("taskId")
    .equals(taskId)
    .sortBy("createdAt");
  const record = records.at(-1);
  if (!record) return undefined;
  const parsed = recoveryRecordSchema.parse(record);
  const input = await currentRecoveryInput(db, taskId);
  if ((await inputDigest(input)) !== parsed.inputDigest) return undefined;
  validateProposal(parsed.proposal, input);
  return parsed;
}
export async function reviewRecovery(
  db: TaskDatabase,
  id: string,
  action: string,
) {
  const reviewedAction = z.string().trim().min(1).max(1000).parse(action);
  return db.transaction("rw", db.tasks, db.checks, db.recoveries, async () => {
    const record = recoveryRecordSchema.parse(await db.recoveries.get(id));
    const input = await Dexie.waitFor(currentRecoveryInput(db, record.taskId));
    if ((await Dexie.waitFor(inputDigest(input))) !== record.inputDigest)
      throw new Error("Recovery is outdated.");
    const reviewed = {
      ...record,
      reviewedAction,
      reviewedAt: new Date().toISOString(),
    };
    await db.recoveries.put(reviewed);
    return reviewed;
  });
}
export async function continuationTarget(db: TaskDatabase, id: string) {
  return db.transaction("r", [db.tasks, db.checks, db.recoveries], async () => {
    const record = recoveryRecordSchema.parse(await db.recoveries.get(id));
    const input = await Dexie.waitFor(currentRecoveryInput(db, record.taskId));
    if (
      !record.reviewedAction ||
      (await Dexie.waitFor(inputDigest(input))) !== record.inputDigest
    )
      throw new Error("Review a current recovery before continuing.");
    return input.task.workUrl;
  });
}
