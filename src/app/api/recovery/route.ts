import { getEnvironment } from "@/lib/env";
import { processingStatus } from "@/lib/ai/processing";
import { configuredModel } from "@/lib/ai/factory";
import { AppError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/read-json";
import { withRoute } from "@/lib/http/route";
import { recoveryInputSchema } from "@/features/recovery/schema";
import { runRecovery } from "@/features/recovery/harness";

export const runtime = "nodejs";
export const GET = withRoute("recovery.configuration", () => {
  const env = getEnvironment();
  return Response.json(processingStatus(env));
});
export const POST = withRoute("recovery.generate", async (request, { log }) => {
  const env = getEnvironment();
  if (request.headers.get("origin") !== env.REENTRY_APP_ORIGIN)
    throw new AppError(
      "INVALID_ORIGIN",
      "Open ReEntry at its configured address to request recovery.",
      403,
    );
  const processing = processingStatus(env);
  if (
    processing.processing === "hosted" &&
    request.headers.get("x-reentry-consent") !== processing.consentId
  )
    throw new AppError(
      "PROCESSING_CONSENT_REQUIRED",
      "Review and agree to the current NVIDIA model's hosted processing before requesting recovery. Reload if the provider or model changed.",
      403,
    );
  const model = configuredModel();
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(env.REENTRY_AI_TIMEOUT_MS),
  ]);
  const input = await readJson(request, recoveryInputSchema, 192 * 1024);
  const result = await runRecovery(input, model, signal);
  log.info("recovery.validated", {
    durationMs: result.execution.durationMs,
    provider: result.execution.provider,
    schemaVersion: result.execution.schemaVersion,
  });
  return Response.json(result);
});
