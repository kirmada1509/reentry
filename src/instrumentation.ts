import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnvironment } = await import("@/lib/env");
  const environment = getEnvironment();
  if (environment.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({
      serviceName: environment.APP_NAME,
      attributes: { "deployment.environment.name": environment.APP_ENV },
      // Exclude automatic outbound fetch instrumentation to avoid exporting credentials or query strings.
      instrumentations: [],
    });
  }
  const { startTaskRuntime } = await import("@/features/agent/runtime");
  startTaskRuntime();
  const { getLogger } = await import("@/lib/observability/logger");
  const log = getLogger();
  log.info("app.started", {
    cloudLogging: Boolean(environment.AXIOM_TOKEN),
    tracing: Boolean(environment.OTEL_EXPORTER_OTLP_ENDPOINT),
  });
  await log.flush();
}

export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getLogger } = await import("@/lib/observability/logger");
  const log = getLogger();
  // Log the route pattern, never raw URL/query, request headers, message, or stack.
  log.error("framework.request_failed", {
    incidentId: crypto.randomUUID(),
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
  });
  await log.flush();
};
