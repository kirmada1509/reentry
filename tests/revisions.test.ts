import "fake-indexeddb/auto";
import { captureSchema } from "@/features/capture/protocol";
import Dexie from "dexie";
import { afterEach, expect, test } from "vitest";
import {
  TaskDatabase,
  saveTask,
  updateTask,
  restoreTask,
  taskHistory,
  deleteTasks,
} from "@/features/tasks/storage";
import { saveDraft, loadDraft } from "@/features/tasks/drafts";
import { beginCheck, saveComparison } from "@/features/sources/storage";
import { recoveryFixture } from "./fixtures/recovery";
const databases: TaskDatabase[] = [];
function database(name = crypto.randomUUID()) {
  const db = new TaskDatabase(name);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) {
    db.close();
    await db.delete();
  }
});
const input = {
  goal: "Application",
  progress: "Transcript attached",
  nextAction: "Find referee",
  workUrl: "https://example.org/apply",
  materialUrls: [],
  confirmed: true,
};
async function seed(db: TaskDatabase) {
  const fixture = await recoveryFixture();
  return saveTask(db, input, captureSchema.strip().parse(fixture.check.before));
}
test("migration preserves revision-one tasks and seeds history without deleting checks or reviews", async () => {
  const name = crypto.randomUUID();
  const old = new Dexie(name);
  old.version(3).stores({
    tasks: "id, &captureId, savedAt",
    checks: "id, taskId, &captureId, startedAt",
    recoveries: "id, taskId, checkId, createdAt",
  });
  const fixture = await recoveryFixture();
  await old.table("tasks").put(fixture.task);
  await old.table("checks").put(fixture.check);
  await old.table("recoveries").put({
    id: crypto.randomUUID(),
    taskId: fixture.task.id,
    reviewedAction: "Preserve me",
  });
  old.close();
  const db = database(name);
  expect((await taskHistory(db, fixture.task.id))[0]).toEqual(fixture.task);
  expect(await db.checks.count()).toBe(1);
  expect((await db.recoveries.toArray())[0]?.reviewedAction).toBe(
    "Preserve me",
  );
});
test("editing and restore create monotonic immutable revisions, retaining ten", async () => {
  const db = database();
  let task = await seed(db);
  const original = task;
  task = await updateTask(db, task.id, task.revision, {
    ...input,
    progress: "Corrected progress",
  });
  expect(task.source).toEqual(original.source);
  task = await restoreTask(db, task.id, task.revision, 1);
  expect(task.progress).toBe(original.progress);
  expect(task.revision).toBe(3);
  for (let i = 0; i < 11; i++)
    task = await updateTask(db, task.id, task.revision, {
      ...input,
      goal: `Edit ${i}`,
    });
  const history = await taskHistory(db, task.id);
  expect(history).toHaveLength(10);
  expect(history[0]?.revision).toBe(14);
  expect(history.at(-1)?.revision).toBe(5);
});
test("concurrent edits cannot overwrite newer data; draft survives reopen and conflicts", async () => {
  let db = database();
  const task = await seed(db);
  const draft = {
    id: task.id,
    baseRevision: 1,
    goal: "Draft",
    progress: "",
    nextAction: "",
    workUrl: "",
    materials: "",
    confirmed: false,
  };
  await saveDraft(db, draft);
  db.close();
  db = database(db.name);
  expect(await loadDraft(db, task.id)).toEqual(draft);
  const results = await Promise.allSettled([
    updateTask(db, task.id, 1, { ...input, goal: "A" }),
    updateTask(db, task.id, 1, { ...input, goal: "B" }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await saveDraft(db, draft);
  await expect(updateTask(db, task.id, 1, input)).rejects.toThrow(
    "another tab",
  );
  expect(await loadDraft(db, task.id)).toEqual(draft);
});
test("failed history write rolls back checkpoint and preserves draft for retry", async () => {
  const db = database();
  const task = await seed(db);
  const fail = () => {
    throw new Error("quota failure");
  };
  db.revisions.hook("creating", fail);
  await expect(
    updateTask(db, task.id, 1, { ...input, goal: "Changed" }),
  ).rejects.toThrow("quota");
  expect((await db.tasks.get(task.id))?.revision).toBe(1);
  db.revisions.hook("creating").unsubscribe(fail);
  expect((await updateTask(db, task.id, 1, input)).revision).toBe(2);
});
test("delayed recapture after correction is rejected", async () => {
  const db = database();
  const task = await seed(db);
  const check = await beginCheck(db, task.id);
  await updateTask(db, task.id, 1, input);
  const fixture = await recoveryFixture();
  await expect(
    saveComparison(
      db,
      check.context,
      captureSchema.strip().parse(fixture.check.after),
      true,
    ),
  ).rejects.toThrow("changed");
  expect((await beginCheck(db, task.id)).taskRevision).toBe(2);
});
test("deletion removes related data and rejects original capture replay and late editing", async () => {
  const db = database();
  const task = await seed(db);
  await beginCheck(db, task.id);
  await deleteTasks(db, [task.id]);
  expect(await db.tasks.count()).toBe(0);
  expect(await db.checks.count()).toBe(0);
  expect(await db.revisions.count()).toBe(0);
  expect(await db.cleanup.count()).toBeGreaterThan(0);
  await expect(
    saveTask(db, input, captureSchema.strip().parse(task.source)),
  ).rejects.toThrow("deleted");
  await expect(updateTask(db, task.id, 1, input)).rejects.toThrow("deleted");
  await seed(db);
  await deleteTasks(db);
  expect(await db.tasks.count()).toBe(0);
  const old = await recoveryFixture();
  old.check.before.capturedAt = new Date(Date.now() - 1000).toISOString();
  await expect(
    saveTask(db, input, captureSchema.strip().parse(old.check.before)),
  ).rejects.toThrow("deleted");
});
