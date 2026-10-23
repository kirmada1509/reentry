import "server-only";
import type { RecoveryModel, StructuredModel } from "./model";
import { getEnvironment } from "@/lib/env";
import { AppError } from "@/lib/http/errors";
import { nvidiaModel, nvidiaStructuredModel } from "./nvidia";
import { ollamaModel, ollamaStructuredModel } from "./ollama";
function createModel(structured: boolean) {
  const env = getEnvironment();
  if (
    env.REENTRY_AI_PROVIDER === "nvidia" &&
    env.REENTRY_AI_MODEL &&
    env.NVIDIA_API_KEY
  )
    return (structured ? nvidiaStructuredModel : nvidiaModel)({
      model: env.REENTRY_AI_MODEL,
      apiKey: env.NVIDIA_API_KEY,
      outputMode: env.NVIDIA_OUTPUT_MODE,
      thinking: env.NVIDIA_THINKING,
    });
  if (env.REENTRY_AI_PROVIDER !== "ollama" || !env.REENTRY_AI_MODEL)
    throw new AppError(
      "MODEL_DISABLED",
      "AI is not configured. Your saved context is available for manual recovery.",
      503,
    );
  return (structured ? ollamaStructuredModel : ollamaModel)({
    model: env.REENTRY_AI_MODEL,
    endpoint: env.REENTRY_AI_ENDPOINT,
    think: env.REENTRY_AI_THINK,
  });
}

export function configuredModel() {
  return createModel(false) as RecoveryModel;
}
export function configuredStructuredModel() {
  return createModel(true) as StructuredModel;
}
