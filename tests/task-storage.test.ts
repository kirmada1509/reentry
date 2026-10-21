import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { TaskDatabase, listTasks, saveTask } from "@/features/tasks/storage";

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
  goal: "Finish application",
  workUrl: "https://example.org/apply",
  progress: "Transcript attached",
  nextAction: "Find first referee",
  materialUrls: [],
  confirmed: true,
};
const capture = () => ({
  id: crypto.randomUUID(),
  title: "Instructions",
  url: "https://example.org/instructions",
  text: "  Supply one referee.\nDo not trim this.  ",
  capturedAt: new Date().toISOString(),
  mode: "selection",
  extractorVersion: 1,
});

describe("durable task saving", () => {
  it("persists source, confirmed progress and next action across reopening", async () => {
    const db = database();
    const evidence = capture();
    const saved = await saveTask(db, input, evidence);
    db.close();
    const reopened = database(db.name);
    expect(await listTasks(reopened)).toEqual([saved]);
    expect(saved.source.text).toBe(evidence.text);
    expect(saved.source.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.progress).toBe(input.progress);
  });

  it("deduplicates concurrent deliveries without replacing confirmed facts", async () => {
    const db = database();
    const evidence = capture();
    const [first, retry] = await Promise.all([
      saveTask(db, input, evidence),
      saveTask(db, { ...input, progress: "Changed retry input" }, evidence),
    ]);
    expect(retry.id).toBe(first.id);
    expect(await db.tasks.count()).toBe(1);
    expect(retry.progress).toBe(first.progress);
    await expect(
      saveTask(db, input, {
        ...evidence,
        text: "Different instructions with the same id",
      }),
    ).rejects.toThrow("different evidence");
    expect((await listTasks(db))[0]).toEqual(first);
  });

  it("writes nothing for unsafe work links, unconfirmed progress or a failed transaction", async () => {
    const db = database();
    await expect(
      saveTask(db, { ...input, workUrl: "javascript:alert(1)" }, capture()),
    ).rejects.toThrow();
    await expect(
      saveTask(db, { ...input, confirmed: false }, capture()),
    ).rejects.toThrow();
    db.tasks.hook("creating", () => {
      throw new Error("simulated quota failure");
    });
    await expect(saveTask(db, input, capture())).rejects.toThrow(
      "quota failure",
    );
    expect(await db.tasks.count()).toBe(0);
  });
});
