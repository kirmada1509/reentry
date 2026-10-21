import "server-only";
import { getEnvironment } from "@/lib/env";
import { AppError } from "@/lib/http/errors";
import { ollamaModel } from "./ollama";
export function configuredModel() {
  const env = getEnvironment();
  if (env.REENTRY_AI_PROVIDER !== "ollama" || !env.REENTRY_AI_MODEL)
    throw new AppError(
      "MODEL_DISABLED",
      "Local AI is not configured. Your saved context is available for manual recovery.",
      503,
    );
  return ollamaModel({
    model: env.REENTRY_AI_MODEL,
    endpoint: env.REENTRY_AI_ENDPOINT,
    think: env.REENTRY_AI_THINK,
  });
}
