import { agentViewSchema, agentHistorySchema } from "./schema";
import type { AgentAction } from "./schema";
export async function agentWeb(action?: AgentAction) {
  const response = await fetch("/api/agent/tasks", {
    method: action ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      "x-reentry-web": "1",
      ...(action ? { "content-type": "application/json" } : {}),
    },
    ...(action ? { body: JSON.stringify(action) } : {}),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "This task or session changed. Reload and review before saving; your input is still here."
        : "Could not save this change. Your input is still here; retry when connected.",
    );
  return agentViewSchema.parse(await response.json());
}

export async function agentHistory(id: string, revision: number) {
  const response = await fetch(
    `/api/agent/tasks?${new URLSearchParams({ id, revision: String(revision) })}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { "x-reentry-web": "1" },
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "This task changed. Close history and review the task before opening it again."
        : "History is unavailable. Close and try again when connected.",
    );
  const value = agentHistorySchema.parse(await response.json());
  if (value.taskId !== id || value.currentRevision !== revision)
    throw new Error(
      "History did not match this task. Close and review before trying again.",
    );
  return value;
}
