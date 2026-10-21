import Dexie from "dexie";
import type { Table } from "dexie";
import { captureSchema } from "../capture/protocol";
import type { Capture } from "../capture/protocol";
import { taskInputSchema, taskSchema } from "./schema";
import type { SavedTask } from "./schema";

export class TaskDatabase extends Dexie {
  tasks!: Table<SavedTask, string>;

  constructor(name = "reentry") {
    super(name);
    this.version(1).stores({ tasks: "id, &captureId, savedAt" });
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
  return db.transaction("rw", db.tasks, async () => {
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
    return candidate;
  });
}

export async function listTasks(db: TaskDatabase) {
  return (await db.tasks.orderBy("savedAt").reverse().toArray()).map((task) =>
    taskSchema.parse(task),
  );
}
