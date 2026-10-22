import { draftSchema } from "./schema";
import type { TaskDatabase } from "./storage";

export async function saveDraft(db: TaskDatabase, input: unknown) {
  const draft = draftSchema.parse(input);
  return db.transaction("rw", [db.tasks, db.drafts, db.deletions], async () => {
    if (
      (await db.deletions.get(`task:${draft.id}`)) ||
      (await db.deletions.get(`capture:${draft.id}`))
    )
      throw new Error("This task was deleted.");
    const cutoff = await db.deletions.get("clear-before");
    if (
      draft.baseRevision === 0 &&
      cutoff &&
      (!draft.capturedAt || draft.capturedAt <= cutoff.deletedAt)
    )
      throw new Error(
        "This capture belongs to deleted data. Capture the source again.",
      );
    if (draft.baseRevision > 0 && !(await db.tasks.get(draft.id)))
      throw new Error("This task was deleted.");
    await db.drafts.put(draft);
  });
}
export async function loadDraft(db: TaskDatabase, id: string) {
  const value = await db.drafts.get(id);
  return value ? draftSchema.parse(value) : undefined;
}
