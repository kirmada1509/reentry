import "server-only";
import { createHash } from "node:crypto";
import { getEnvironment } from "@/lib/env";
import { processingStatus } from "@/lib/ai/processing";

export function agentProcessing() {
  const env = getEnvironment();
  const previous = processingStatus(env);
  return {
    provider: env.REENTRY_AI_PROVIDER,
    model: env.REENTRY_AI_MODEL ?? null,
    hosted: previous.processing === "hosted",
    available: previous.enabled,
    consentId: createHash("sha256")
      .update(
        JSON.stringify({
          policy: "agent-session-v1",
          provider: previous,
          endpoint:
            env.REENTRY_AI_PROVIDER === "ollama"
              ? env.REENTRY_AI_ENDPOINT
              : null,
          think: env.REENTRY_AI_THINK,
        }),
      )
      .digest("hex"),
  };
}
