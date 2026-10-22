# ReEntry harness and model choice

New direction requested October 22: [stateful browser task agent](AGENTIC_PLAN.md). Model-selected observation tools, automatic task/checkpoint updates, interruption and reminders now justify evaluating a durable agent runtime such as LangGraph.js. The fixed workflow below describes the current release; it is not a constraint on the newly requested iteration. No agent framework or automatic monitoring has been installed/implemented by this planning update.

Decision, October 22, 2026: keep a small, fixed recovery workflow and a replaceable model connection. No LangChain, LangGraph, autonomous tool loop, or multi-agent framework is needed for the first release. Phase 3 implements this boundary with local Ollama and a provider-independent contract; a subsequent [NVIDIA adapter](NVIDIA.md) adds hosted inference with explicit processing agreement. Setup, bounds and current limits: [PHASE3.md](PHASE3.md).

## What the harness does

The harness is the application code that controls a recovery request:

1. Collect the saved goal, user-confirmed progress, intended action, and comparable old/new source captures.
2. Check input limits and attach the task revision and source digests.
3. Ask the configured model once for a structured recovery proposal.
4. Validate its structure, source references, exact quotes, permitted action target, and consistency with confirmed facts.
5. Reject an outdated result if the task or sources changed while it ran.
6. Show the suggestion for review, or preserve the saved context and offer manual recovery on failure.

The model interprets the supplied evidence. It does not choose tools, browse websites, read private forms, update confirmed progress, or submit work. Exact quotes and schema checks cannot prove that an interpretation is correct; user inspection and correction remain part of the journey.

## Keep the model replaceable

The recovery feature calls one small server-only `RecoveryModel` interface. Its input uses ReEntry's goal/facts/source schema. Its result contains an untrusted proposal candidate plus execution metadata; the harness applies the shared Zod and evidence validators before accepting it. Provider response objects and SDK types never enter checkpoint storage or UI components.

| Layer                             | Responsibility                                                    | Changes when switching provider? |
| --------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| Extension, storage, recovery card | Capture, preserve facts, review and correct                       | No                               |
| Recovery harness                  | Prepare context, validate evidence, reject stale results          | No                               |
| Model adapter                     | Translate request/response, capabilities, cancellation and errors | Select or add an adapter         |
| Server configuration              | Provider, model id, endpoint and credentials                      | Yes                              |

Keep the shared prompt and proposal schema versioned. Provider-specific formatting or options stay inside the adapter. Start with a simple factory; a dynamic plugin system is unnecessary.

## Reuse a client library where it helps

Use [Vercel AI SDK Core's provider abstraction](https://ai-sdk.dev/docs/foundations/providers-and-models) for hosted adapters when they are added. Direct provider packages exist for [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai) and [DeepSeek](https://ai-sdk.dev/providers/ai-sdk-providers/deepseek). Pass explicit provider instances; no AI Gateway account or intermediary service is required for this design.

For the initial Ollama adapter, use its documented native structured-output API through a thin adapter. If a tested SDK-compatible adapter preserves the needed schema/cancellation behavior, it can replace that transport without changing the recovery feature. Do not build a general inference client or install multiple speculative provider packages during Phase 0. Pin and verify the selected clients in the implementation slice.

| Connection                                    | Role                                                                   | Verification required                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Local Ollama + an evaluated open-weight model | First implemented adapter and hackathon demo                           | Real interpretation, evidence, latency, timeout and unavailable-service cases                |
| NVIDIA-hosted chat models                     | Implemented adapter; [setup](NVIDIA.md), explicit processing agreement | Native HTTP contract, six-case Ultra evaluation, real hosted journey recorded                |
| OpenAI API                                    | Later optional adapter behind the same interface                       | Contract tests and real recovery evaluation with the selected model before claiming support  |
| DeepSeek API                                  | Later optional direct-provider adapter                                 | Its own contract tests and live evaluation; do not assume OpenAI options are identical       |
| Other compatible endpoint                     | Possible later adapter                                                 | Verify the actual API and capabilities; changing a base URL alone does not establish support |

Qwen3 4B is the planned local candidate; model ids remain server configuration rather than being embedded in recovery logic. Actual tested runs and model selection are recorded in [TEST_RESULTS.md](TEST_RESULTS.md). A self-hosted DeepSeek model can also be served through a local runtime; that is different from sending data to DeepSeek's hosted API.

## Capabilities, configuration and privacy

Providers differ. [Ollama documents schema-constrained output](https://docs.ollama.com/capabilities/structured-outputs), [OpenAI distinguishes JSON mode from schema adherence](https://developers.openai.com/api/docs/guides/structured-outputs), and [DeepSeek documents JSON-output requirements and empty-content cases](https://api-docs.deepseek.com/guides/json_mode/). Select the output mode for the tested provider/model. Always run the same application validators, including on schema-constrained responses; malformed, empty, truncated, refused or unsupported results become visible failures.

Keep provider, model id, endpoint, capability settings and credentials in validated server configuration. Model ids are configuration, not hardcoded UI choices. Require a model id and reject invalid provider/configuration combinations at startup. Endpoints are operator-controlled configuration, never arbitrary URLs supplied in capture text or browser requests. Keys stay in ignored server environment files. Do not add a credential-settings screen for the hackathon.

Use one bounded call per user request, initially a 30-second total deadline, cancellation and bounded input/output. Disable implicit SDK retries so they cannot extend that deadline or duplicate paid requests. Offer explicit retry; do not switch models or providers automatically after failure.

Local inference is the default. If a hosted adapter is enabled later, show the provider and that the goal, progress and captured evidence will leave the computer before the user requests inference. Require explicit agreement to that processing mode, including after a provider change. Keep cloud logs off and task text/prompts out of telemetry. Choosing a hosted model does not require hosting ReEntry itself.

Record the actual provider, model id, local digest or available remote version identifier, prompt/schema version, input revision/digests, validation outcome and latency with the run evidence. Do not invent a remote model digest or promise a fixed model behind a changing alias.

## Phase 3 tests and boundary

Use MSW/Serve for the actual adapter's HTTP envelope, and an injected fake model for provider-independent harness tests. Check valid output, invalid/empty/truncated/refused output, bad citations, invented completion, unknown destinations, timeout/cancellation, stale results and service errors. Verify invalid configuration makes no request, and local failure never contacts a hosted provider.

Run the same harness contract against the real local adapter with HTTP mocks and a fake alternative implementation. This checks that the recovery feature has no Ollama dependency; it does not establish OpenAI or DeepSeek support. When a hosted adapter is added, give it provider-specific request/response tests, processing-consent checks and the six-case live evaluation before enabling it for real use. Hosted credentials are not required to complete the initial local demo.

Keep the real open-weight route and its evaluation for the DEV submission. Provider independence permits later choices; a mocked response or a proprietary-only demonstration does not establish the planned open-weight mechanism.

See [Phase 3](IMPLEMENTATION_PLAN.md#phase-3--interpret-the-change-with-a-real-open-weight-model) for the implementation gate. Reconsider an agent framework only if a later approved feature needs model-selected tools, branching workflows or durable jobs that this fixed flow cannot handle simply.
