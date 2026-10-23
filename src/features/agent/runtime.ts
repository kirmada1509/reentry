import "server-only";
import { configuredStructuredModel } from "@/lib/ai/factory";
import { getEnvironment } from "@/lib/env";
import { getLogger } from "@/lib/observability/logger";
import { observationStore } from "../observation/repository";
import { createTaskHarness } from "./harness";
import { agentProcessing } from "./processing";

const shared = globalThis as typeof globalThis & {
  reentryTaskTimer?: ReturnType<typeof setInterval>;
};
export function startTaskRuntime() {
  if (shared.reentryTaskTimer) return;
  let harness: ReturnType<typeof createTaskHarness> | undefined;
  let nextAttempt = 0;
  shared.reentryTaskTimer = setInterval(() => {
    if (Date.now() < nextAttempt) return;
    void (async () => {
      try {
        harness ??= createTaskHarness(
          observationStore().agent,
          configuredStructuredModel,
          agentProcessing,
          getEnvironment().REENTRY_AGENT_TIMEOUT_MS,
        );
        const result = await harness.tick();
        if (!result) return;
        const log = getLogger().with({
          requestId: result.requestId,
          operation: "agent.infer",
        });
        log.info("agent.decision_finished", {
          outcome: result.state,
          ...("failureCode" in result
            ? { failureCode: result.failureCode }
            : {}),
        });
        await log.flush();
      } catch {
        nextAttempt = Date.now() + 30000;
        // Startup/storage errors stay safe; request controls expose availability.
        const log = getLogger();
        log.error("agent.worker_unavailable", {});
        await log.flush();
      }
    })();
  }, 1000);
  shared.reentryTaskTimer.unref();
}
