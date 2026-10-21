import { captureDigest } from "../../src/features/tasks/storage";
import type { Capture } from "../../src/features/capture/protocol";
import type { RecoveryInput } from "../../src/features/recovery/schema";
export async function recoveryFixture(
  afterText = "Attach your transcript. Supply two referees.",
  goal = "Finish application",
): Promise<RecoveryInput> {
  const before: Capture = {
    id: crypto.randomUUID(),
    title: "Fictional instructions",
    url: "https://example.org/instructions",
    text: "Attach your transcript. Supply one referee.",
    capturedAt: new Date().toISOString(),
    mode: "selection",
    extractorVersion: 1,
    section: { key: "id:p:instructions", label: "Requirements" },
  };
  const after: Capture = {
    ...before,
    id: crypto.randomUUID(),
    text: afterText,
    capturedAt: new Date().toISOString(),
  };
  const task = {
    id: crypto.randomUUID(),
    captureId: before.id,
    goal,
    progress: "Transcript attached",
    nextAction: "Find first referee",
    workUrl: "https://example.org/apply",
    materialUrls: [],
    savedAt: new Date().toISOString(),
    revision: 1 as const,
    source: { ...before, digest: await captureDigest(before) },
  };
  const id = crypto.randomUUID();
  return {
    task,
    check: {
      id,
      taskId: task.id,
      context: {
        id,
        taskId: task.id,
        baselineId: before.id,
        baselineDigest: task.source.digest,
        sourceUrl: before.url,
        goal,
        startedAt: new Date().toISOString(),
      },
      before: task.source,
      after: { ...after, digest: await captureDigest(after) },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: before.text === after.text ? "unchanged" : "changed",
      sameSection: true,
      captureId: after.id,
    },
  };
}
