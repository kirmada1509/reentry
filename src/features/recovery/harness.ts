import { AppError } from "@/lib/http/errors";
import type { RecoveryModel } from "@/lib/ai/model";
import { inputDigest, validateInput, validateProposal } from "./validate";
import { PROMPT_VERSION, SCHEMA_VERSION, recoveryResultSchema } from "./schema";

export async function runRecovery(
  raw: unknown,
  model: RecoveryModel,
  signal: AbortSignal,
) {
  const started = performance.now();
  const input = await validateInput(raw);
  if (signal.aborted)
    throw new AppError(
      "RECOVERY_CANCELLED",
      "Recovery was cancelled or reached its time limit. Your saved context is intact.",
      408,
    );
  let cancel: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", cancel, { once: true });
  });
  try {
    const output = await Promise.race([
      model.generate(input, signal),
      cancelled,
    ]);
    signal.throwIfAborted();
    const proposal = validateProposal(output.candidate, input);
    const digest = await inputDigest(input);
    signal.throwIfAborted();
    return recoveryResultSchema.parse({
      id: crypto.randomUUID(),
      inputDigest: digest,
      createdAt: new Date().toISOString(),
      proposal,
      execution: {
        provider: output.provider,
        model: output.model,
        modelDigest: output.modelDigest,
        settings: output.settings,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        durationMs: Math.round(performance.now() - started),
      },
    });
  } catch (error) {
    if (signal.aborted)
      throw new AppError(
        "RECOVERY_CANCELLED",
        "Recovery was cancelled or reached its time limit. Your saved context is intact.",
        408,
      );
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_PROPOSAL",
      "The model's suggestion could not be validated. Review your saved context or retry.",
      422,
    );
  } finally {
    if (cancel) signal.removeEventListener("abort", cancel);
  }
}
