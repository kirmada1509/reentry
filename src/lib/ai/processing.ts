import "server-only";
import { createHash } from "node:crypto";
import type { getEnvironment } from "@/lib/env";
import { NVIDIA_CHAT_URL } from "./nvidia";
// An acknowledgement is bound to the public processing configuration, not the
// secret key. Reloading or changing provider/model requires agreement again.
export function processingStatus(env: ReturnType<typeof getEnvironment>) {
  const hosted = env.REENTRY_AI_PROVIDER === "nvidia";
  return {
    enabled: env.REENTRY_AI_PROVIDER !== "disabled",
    provider: env.REENTRY_AI_PROVIDER,
    model: env.REENTRY_AI_MODEL ?? null,
    processing: hosted ? ("hosted" as const) : ("local" as const),
    ...(hosted
      ? {
          consentId: createHash("sha256")
            .update(
              JSON.stringify({
                notice: "hosted-v1",
                provider: env.REENTRY_AI_PROVIDER,
                model: env.REENTRY_AI_MODEL,
                endpoint: NVIDIA_CHAT_URL,
                output: env.NVIDIA_OUTPUT_MODE,
                thinking: env.NVIDIA_THINKING,
              }),
            )
            .digest("hex"),
        }
      : {}),
  };
}
