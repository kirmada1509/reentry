import { agentViewSchema } from "./schema";
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
