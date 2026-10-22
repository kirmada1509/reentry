import Dexie from "dexie";
import type { Table } from "dexie";
import { captureSchema, idSchema, isFresh } from "../capture/protocol";
import type { Capture } from "../capture/protocol";
import { taskInputSchema, taskSchema } from "./schema";
import type {
  SavedTask,
  TaskRevision,
  DeletionMarker,
  Cleanup,
  TaskDraft,
} from "./schema";
import type { RecoveryRecord } from "../recovery/schema";
import type { SourceCheck } from "../sources/schema";

export class TaskDatabase extends Dexie {
  tasks!: Table<SavedTask, string>;
  revisions!: Table<TaskRevision, [string, number]>;
  deletions!: Table<DeletionMarker, string>;
  cleanup!: Table<Cleanup, string>;
  drafts!: Table<TaskDraft, string>;
  checks!: Table<SourceCheck, string>;
  recoveries!: Table<RecoveryRecord, string>;

  constructor(name = "reentry") {
    super(name);
    this.version(1).stores({ tasks: "id, &captureId, savedAt" });
    this.version(2).stores({
      tasks: "id, &captureId, savedAt",
      checks: "id, taskId, &captureId, startedAt",
    });
    this.version(3).stores({
      tasks: "id, &captureId, savedAt",
      checks: "id, taskId, &captureId, startedAt",
      recoveries: "id, taskId, checkId, createdAt",
    });
    this.version(4)
      .stores({
        tasks: "id, &captureId, savedAt",
        checks: "id, taskId, &captureId, startedAt",
        recoveries: "id, taskId, checkId, createdAt",
        revisions: "[taskId+revision], taskId",
        deletions: "id",
        cleanup: "id",
        drafts: "id",
      })
      .upgrade(async (transaction) => {
        const tasks = await transaction.table("tasks").toArray();
        for (const raw of tasks) {
          const task = taskSchema.parse(raw);
          await transaction
            .table("revisions")
            .put({ taskId: task.id, revision: task.revision, task });
        }
      });
  }
}

let database: TaskDatabase | undefined;
export function taskDatabase() {
  database ??= new TaskDatabase();
  return database;
}

export async function captureDigest(capture: Capture) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(capture)),
  );
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function saveTask(
  db: TaskDatabase,
  rawInput: unknown,
  rawCapture: unknown,
) {
  const input = taskInputSchema.parse(rawInput);
  const capture = captureSchema.parse(rawCapture);
  const digest = await captureDigest(capture);
  const candidate = taskSchema.parse({
    id: crypto.randomUUID(),
    captureId: capture.id,
    goal: input.goal,
    workUrl: input.workUrl,
    progress: input.progress,
    nextAction: input.nextAction,
    materialUrls: input.materialUrls,
    savedAt: new Date().toISOString(),
    revision: 1,
    source: { ...capture, digest },
  });
  return db.transaction(
    "rw",
    [db.tasks, db.revisions, db.deletions, db.drafts],
    async () => {
      await assertCaptureAllowed(db, capture);
      const existing = await db.tasks
        .where("captureId")
        .equals(capture.id)
        .first();
      if (existing) {
        if (existing.source.digest !== digest)
          throw new Error("Capture id already saved with different evidence.");
        return taskSchema.parse(existing);
      }
      await db.tasks.add(candidate);
      await db.revisions.add({
        taskId: candidate.id,
        revision: 1,
        task: candidate,
      });
      await db.drafts.delete(capture.id);
      return candidate;
    },
  );
}

export async function listTasks(db: TaskDatabase) {
  return (await db.tasks.orderBy("savedAt").reverse().toArray()).map((task) =>
    taskSchema.parse(task),
  );
}

export async function assertCaptureAllowed(db: TaskDatabase, capture: Capture) {
  const cutoff = await db.deletions.get("clear-before");
  if (
    !isFresh(capture) ||
    (await db.deletions.get(`capture:${capture.id}`)) ||
    (cutoff && capture.capturedAt <= cutoff.deletedAt)
  )
    throw new Error(
      "This capture expired or belongs to deleted data. Select the source again.",
    );
}

export async function taskHistory(db: TaskDatabase, taskId: string) {
  return (
    await db.revisions.where("taskId").equals(idSchema.parse(taskId)).toArray()
  )
    .sort((a, b) => b.revision - a.revision)
    .map((record) => taskSchema.parse(record.task));
}

async function writeRevision(
  db: TaskDatabase,
  taskId: string,
  expectedRevision: number,
  rawInput: unknown,
) {
  const parsed = taskInputSchema.parse(rawInput);
  const input = {
    goal: parsed.goal,
    workUrl: parsed.workUrl,
    progress: parsed.progress,
    nextAction: parsed.nextAction,
    materialUrls: parsed.materialUrls,
  };
  const current = await db.tasks.get(idSchema.parse(taskId));
  if (!current)
    throw new Error("This task was deleted or is no longer available.");
  if (current.revision !== expectedRevision)
    throw new Error(
      "This checkpoint changed in another tab. Your draft is kept. Reload the latest checkpoint before saving.",
    );
  const task = taskSchema.parse({
    ...current,
    ...input,
    revision: current.revision + 1,
    savedAt: new Date().toISOString(),
  });
  await db.tasks.put(task);
  await db.revisions.add({ taskId, revision: task.revision, task });
  const history = await db.revisions.where("taskId").equals(taskId).toArray();
  const expired = history.sort((a, b) => b.revision - a.revision).slice(10);
  await db.revisions.bulkDelete(
    expired.map((record) => [taskId, record.revision]),
  );
  await db.drafts.delete(taskId);
  return task;
}
export async function updateTask(
  db: TaskDatabase,
  taskId: string,
  expectedRevision: number,
  input: unknown,
) {
  return db.transaction("rw", [db.tasks, db.revisions, db.drafts], () =>
    writeRevision(db, taskId, expectedRevision, input),
  );
}
export async function restoreTask(
  db: TaskDatabase,
  taskId: string,
  expectedRevision: number,
  revision: number,
) {
  return db.transaction("rw", [db.tasks, db.revisions, db.drafts], async () => {
    const old = await db.revisions.get([idSchema.parse(taskId), revision]);
    if (!old) throw new Error("That revision is no longer retained.");
    const task = taskSchema.parse(old.task);
    return writeRevision(db, taskId, expectedRevision, {
      goal: task.goal,
      workUrl: task.workUrl,
      progress: task.progress,
      nextAction: task.nextAction,
      materialUrls: task.materialUrls,
      confirmed: true,
    });
  });
}

export async function deleteTasks(db: TaskDatabase, taskIds?: string[]) {
  return db.transaction(
    "rw",
    [
      db.tasks,
      db.revisions,
      db.checks,
      db.recoveries,
      db.deletions,
      db.cleanup,
      db.drafts,
    ],
    async () => {
      const before = new Date().toISOString();
      const tasks = taskIds
        ? await db.tasks.bulkGet(taskIds.map((id) => idSchema.parse(id)))
        : await db.tasks.toArray();
      const ids: string[] = [];
      const captures: string[] = [];
      for (const task of tasks) {
        if (!task) continue;
        ids.push(task.id);
        const checks = await db.checks
          .where("taskId")
          .equals(task.id)
          .toArray();
        const captureIds = [
          task.captureId,
          ...checks.flatMap((check) => (check.after ? [check.after.id] : [])),
        ];
        captures.push(...captureIds);
        await db.deletions.bulkPut(
          [`task:${task.id}`, ...captureIds.map((id) => `capture:${id}`)].map(
            (id) => ({ id, deletedAt: before }),
          ),
        );
        await db.tasks.delete(task.id);
        await db.revisions.where("taskId").equals(task.id).delete();
        await db.checks.where("taskId").equals(task.id).delete();
        await db.recoveries.where("taskId").equals(task.id).delete();
        await db.drafts.bulkDelete([task.id, task.captureId]);
      }
      if (!taskIds) {
        await db.deletions.put({ id: "clear-before", deletedAt: before });
        await db.drafts.clear();
      }
      // One item per task bounds protocol messages even for a large library.
      for (let index = 0; index < ids.length; index++) {
        const taskId = ids[index]!;
        await db.cleanup.add({
          id: crypto.randomUUID(),
          taskIds: [taskId],
          captureIds: [],
        });
      }
      for (let index = 0; index < captures.length; index += 100)
        await db.cleanup.add({
          id: crypto.randomUUID(),
          taskIds: [],
          captureIds: captures.slice(index, index + 100),
        });
      if (!taskIds)
        await db.cleanup.add({
          id: crypto.randomUUID(),
          taskIds: [],
          captureIds: [],
          before,
        });
    },
  );
}
