import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { compareSources, textChanges } from "@/features/sources/compare";
import {
  beginCheck,
  finishCheckFailure,
  getCheck,
  getTask,
  saveComparison,
} from "@/features/sources/storage";
import {
  captureDigest,
  saveTask,
  TaskDatabase,
} from "@/features/tasks/storage";
import type { Capture } from "@/features/capture/protocol";

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
function capture(text = "Supply one referee."): Capture {
  return {
    id: crypto.randomUUID(),
    title: "Instructions",
    url: "https://example.org/instructions",
    text,
    capturedAt: new Date().toISOString(),
    mode: "selection",
    extractorVersion: 1,
    section: { key: "id:p:requirements", label: "Requirements" },
  };
}
const input = {
  goal: "Finish application",
  workUrl: "https://example.org/apply",
  progress: "Transcript attached",
  nextAction: "Find first referee",
  materialUrls: [],
  confirmed: true,
};

describe("honest source comparison", () => {
  it("distinguishes exact equality from requirement-looking and cosmetic text edits", () => {
    const before = capture();
    expect(compareSources(before, capture(), true)).toEqual({
      status: "unchanged",
    });
    expect(
      compareSources(before, capture("Supply two referees."), true),
    ).toEqual({ status: "changed" });
    expect(
      compareSources(before, capture("Supply one referee!"), true),
    ).toEqual({ status: "changed" });
    expect(
      compareSources(before, capture("Supply  one referee."), true),
    ).toEqual({ status: "changed" });
    expect(textChanges(before.text, "Supply two referees.").parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Removed",
          text: expect.stringContaining("one"),
        }),
        expect.objectContaining({
          kind: "Added",
          text: expect.stringContaining("two"),
        }),
      ]),
    );
  });
  it("never calls different sources, sections, extraction modes/versions or unconfirmed selections unchanged", () => {
    const before = capture();
    for (const [after, reason] of [
      [{ ...capture(), url: "https://example.org/elsewhere" }, "different-url"],
      [
        { ...capture(), section: { key: "id:p:other", label: "Other" } },
        "different-section",
      ],
      [{ ...capture(), mode: "readable" }, "different-mode"],
      [{ ...capture(), extractorVersion: 2 }, "different-extractor"],
    ] as const)
      expect(compareSources(before, after, true)).toEqual({
        status: "incomparable",
        reason,
      });
    expect(compareSources(before, capture(), false)).toEqual({
      status: "incomparable",
      reason: "section-unconfirmed",
    });
  });
});

describe("persistent task-associated checks", () => {
  it("keeps both snapshots and original confirmed facts across refresh/reopen", async () => {
    const db = database();
    const task = await saveTask(db, input, capture());
    const check = await beginCheck(db, task.id);
    const after = capture("Supply two referees.");
    const result = await saveComparison(db, check.context, after, true);
    expect(result.status).toBe("changed");
    expect(result.before).toEqual(task.source);
    expect(result.after?.text).toBe(after.text);
    expect(await getTask(db, task.id)).toEqual(task);
    db.close();
    const reopened = database(db.name);
    expect(await getCheck(reopened, check.id, task.id)).toEqual(result);
    expect(await getTask(reopened, task.id)).toEqual(task);
  });

  it("deduplicates concurrent starts/delivery and rejects cross-task or conflicting captures", async () => {
    const db = database();
    const a = await saveTask(db, input, capture());
    const b = await saveTask(
      db,
      { ...input, goal: "Second application" },
      capture(),
    );
    const [first, retry] = await Promise.all([
      beginCheck(db, a.id),
      beginCheck(db, a.id),
    ]);
    expect(first.id).toBe(retry.id);
    await expect(
      saveComparison(db, { ...first.context, taskId: b.id }, capture(), true),
    ).rejects.toThrow("belong");
    const after = capture("Supply two referees.");
    const result = await saveComparison(db, first.context, after, true);
    expect(await saveComparison(db, first.context, after, true)).toEqual(
      result,
    );
    await expect(
      saveComparison(db, first.context, { ...after, text: "Other text" }, true),
    ).rejects.toThrow("closed");
    expect(await db.checks.count()).toBe(1);
    expect(await getTask(db, b.id)).toEqual(b);
  });

  it("retains awaiting state on write failure and cannot revive cancelled/failed checks", async () => {
    const db = database();
    const task = await saveTask(db, input, capture());
    const check = await beginCheck(db, task.id);
    const fail = () => {
      throw new Error("simulated check write failure");
    };
    db.checks.hook("updating", fail);
    await expect(
      saveComparison(db, check.context, capture("Supply two referees."), true),
    ).rejects.toThrow("write failure");
    expect((await getCheck(db, check.id, task.id)).status).toBe("awaiting");
    db.checks.hook("updating").unsubscribe(fail);
    const cancelled = await finishCheckFailure(
      db,
      check.id,
      task.id,
      "cancelled",
    );
    expect(cancelled.status).toBe("cancelled");
    expect(
      await finishCheckFailure(db, check.id, task.id, "source-unavailable"),
    ).toEqual(cancelled);
    await expect(
      saveComparison(db, check.context, capture(), true),
    ).rejects.toThrow("closed");
    const next = await beginCheck(db, task.id);
    expect(
      (await finishCheckFailure(db, next.id, task.id, "source-unavailable"))
        .status,
    ).toBe("failed");
    expect(await getTask(db, task.id)).toEqual(task);
  });

  it("upgrades Phase 1 IndexedDB without changing legacy evidence or inventing a section", async () => {
    const name = crypto.randomUUID();
    const original = capture();
    delete original.section;
    const task = {
      id: crypto.randomUUID(),
      captureId: original.id,
      goal: input.goal,
      workUrl: input.workUrl,
      progress: input.progress,
      nextAction: input.nextAction,
      materialUrls: [],
      savedAt: new Date().toISOString(),
      revision: 1,
      source: { ...original, digest: await captureDigest(original) },
    };
    const legacy = new Dexie(name);
    legacy.version(1).stores({ tasks: "id, &captureId, savedAt" });
    await legacy.table("tasks").add(task);
    legacy.close();
    const db = database(name);
    expect(await getTask(db, task.id)).toEqual(task);
    const check = await beginCheck(db, task.id);
    expect(check.before.section).toBeUndefined();
    const result = await saveComparison(db, check.context, capture(), false);
    expect(result.status).toBe("incomparable");
    expect(result.reason).toBe("section-unconfirmed");
    expect(await getTask(db, task.id)).toEqual(task);
  });
});
