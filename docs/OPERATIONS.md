# Operations and observability

## Daily local use

- pnpm bootstrap: install locked dependencies, prepare an ignored local environment file, install hooks, and run setup checks.
- ./start.sh / pnpm local:start: build the Chrome extension and start the managed development server in the background. Reload the extension in Chrome after rebuilding.
- ./stop.sh / pnpm local:stop: stop this project's managed server without deleting browser data. Stop before starting again or switching development/production modes.
- pnpm dev: foreground development server.
- pnpm dev:start: managed background development server.
- pnpm dev:status / pnpm dev:logs / pnpm dev:logs --follow: inspect the managed server.
- pnpm dev:stop: stop this project's managed server.
- pnpm build, then pnpm start: foreground production server.
- pnpm start:managed: background production server.
- pnpm smoke: check the running starter over HTTP.

Default port is 3000. Assign a different PORT in each project's .env.local when running products together. Managed scripts refuse occupied ports and verify the supervisor identity before stopping a process. They support macOS/Linux; foreground commands support other platforms. Restart after configuration changes.

.runtime contains ignored PID metadata and local logs, with restricted permissions. The file grows by appending; use the cloud viewer for retention and production log management. Stop the server before deleting an old local log.

## Secrets: local file or Doppler

Local use: fill .env.local; keep .env.example limited to names and safe defaults.

Optional Doppler setup, once per product:

1. Install the official Doppler CLI and sign in with doppler login.
2. Select the product's project/config using doppler setup.
3. Add the required secret names in the Doppler dashboard.
4. Run doppler run -- pnpm dev, or doppler run -- pnpm dev:start.

The selected doppler.yaml is ignored so a cloned project cannot silently inherit another product's secret configuration. An account and CLI are not needed for the local path.

Doppler stores/injects configuration. Its activity log concerns secret operations; the application's log viewer is Axiom.

## Browser log viewer: Axiom

1. Create an Axiom dataset for the product.
2. Create a token restricted to ingestion into that dataset.
3. Set AXIOM_TOKEN, AXIOM_DATASET, and the dataset's AXIOM_EDGE in Doppler or .env.local.
4. Set LOG_DASHBOARD_URL to your saved Axiom view, or keep the Axiom console default.
5. Run pnpm observe:smoke. A successful result prints a unique marker accepted by ingestion.
6. Open the dataset in Axiom and find that marker. Run pnpm logs:open to reopen the configured view.
7. Restart the application, exercise its API, and find request.completed events.

The starter does not create accounts or remote resources. An authenticated cloud smoke is required to claim live browser ingestion. Unit tests exercise the real SDK with a mocked ingest endpoint.

Example APL queries (replace the dataset name):

    ['my-product-logs']
    | where message == "request.completed"
    | order by _time desc

    ['my-product-logs']
    | where fields.requestId == "request-id-from-response"

    ['my-product-logs']
    | where message == "request.completed"
    | summarize count() by fields.status

Save a log stream and views for failed requests, request counts, and durationMs. Add a monitor for sustained failures once the product has meaningful traffic. Status and duration are log-derived operational signals; the starter does not claim a dedicated metrics exporter.

## Log contract

Use getLogger().info("feature.event", { operationId, status }) with fixed event names and bounded fields. The route context supplies a request-scoped logger. Await flush for background jobs and CLI work; withRoute schedules it after HTTP responses.

Default fields include service, environment, request ID, operation, status, duration, and active trace/span IDs when present. Never pass request objects, payloads, headers, cookies, raw URLs, user prompts, or provider exceptions wholesale.

Key-based redaction removes credential/personal-data fields recursively. It cannot recognize secrets hidden in arbitrary text. Application log records deliberately omit raw exception messages/stacks; use stable error codes, operations, and correlation IDs. Framework and dependency stdout is outside this redaction boundary. Add a reviewed diagnostic policy if a product needs richer internal error reporting.

Cloud-export failure emits a safe warning and preserves local logging. Batching is best-effort; abrupt termination can lose buffered events. Use a platform log drain or durable collector when delivery guarantees become necessary.

## Optional tracing

Set OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS for a compatible collector. @vercel/otel registers during Node.js startup only when an endpoint exists. Standard OTLP settings control export.

Automatic outbound-fetch instrumentation is disabled by this starter. Next.js spans can still contain route/URL information: inspect exported attributes and configure collector filtering/sampling for the product before enabling tracing on sensitive traffic. Logs and tracing are separate configuration paths.

## Health

- /api/health/live: the process can respond.
- /api/health/ready: runtime configuration is valid.

Readiness currently has no database or remote-service probes because those dependencies are product-specific. Add bounded checks for critical dependencies when introducing them. Cloud logging availability must not make the product unready.

References: [Doppler CLI](https://docs.doppler.com/docs/cli), [Axiom log ingestion](https://axiom.co/docs/send-data/nextjs), [Axiom SDK](https://github.com/axiomhq/axiom-js), [Next.js instrumentation](https://nextjs.org/docs/app/guides/instrumentation).
