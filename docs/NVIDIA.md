# NVIDIA-hosted recovery

ReEntry supports NVIDIA AI endpoints through the existing provider-independent harness. Local Ollama remains available. Provider selection is explicit; an error never switches models or providers automatically.

## Configure

Keep your key in ignored `.env.local`, never in browser settings, source files or chat. Set:

```dotenv
REENTRY_AI_PROVIDER=nvidia
REENTRY_AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b
NVIDIA_API_KEY=your-key-here
NVIDIA_OUTPUT_MODE=text
NVIDIA_THINKING=off
REENTRY_AI_TIMEOUT_MS=30000
```

Restart the app after changing configuration. The NVIDIA credential destination is fixed to `https://integrate.api.nvidia.com/v1/chat/completions`; the existing `REENTRY_AI_ENDPOINT` setting applies only to Ollama. No NVIDIA SDK, OpenAI account, API gateway or additional package is required.

`REENTRY_AI_MODEL` selects a model exposed by NVIDIA's [API catalog](https://docs.api.nvidia.com/nim/reference/llm-apis). A catalog listing does not prove access for your account. The tested default is `nvidia/nemotron-3-ultra-550b-a55b`; exact results are in [TEST_RESULTS.md](TEST_RESULTS.md). Model aliases can change; NVIDIA does not provide a local weight digest for these responses, so metadata records `modelDigest: null` rather than inventing one.

Capabilities vary by model:

- `NVIDIA_OUTPUT_MODE=text` requests an ordinary completion containing the strict JSON proposal specified in the shared prompt. ReEntry parses and validates it. This is the live-tested mode; it does not claim model-enforced schema adherence.
- `json_object` sends NVIDIA's compatible JSON-mode response format; `json_schema` sends the proposal's JSON schema. These request modes have HTTP contract tests; verify support and model quality with the actual selected model before using them. Unsupported options produce a visible error without fallback.
- `NVIDIA_THINKING=off` sends `chat_template_kwargs.enable_thinking=false`; `on` enables thinking with a 512-token reasoning budget inside a 2,000-token total generation cap. `omit` sends neither option for models without that capability. The live-tested Ultra setting is `off`. These are NVIDIA/Nemotron options, not assumptions about every catalog model. See NVIDIA's [model API reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b-infer) for the parameter family.

To switch back locally, set `REENTRY_AI_PROVIDER=ollama` and `REENTRY_AI_MODEL=qwen3:4b`, then restart. Keeping the NVIDIA key stored does not trigger hosted calls. Other provider keys are not read or used by this adapter.

## Review before sending

Open a comparable saved source check and choose **Review AI recovery**. The recovery screen names NVIDIA and the selected model, explains which data leaves the computer, and requires **I agree to send this task context to NVIDIA…** before Generate is enabled.

Only generating a suggestion sends the goal, confirmed progress, saved next action and captured instruction text/ids to NVIDIA. The key stays on the server. The model receives no form credentials, browser cookies or private field inspection. You still review your capture and interpretation; selected text may itself contain personal information.

Agreement is held only in the current page. Refresh requires agreement again. The server independently checks the acknowledgement against the current provider/model/output/thinking configuration. An older acknowledgement is rejected before any provider call, the page reloads the processing notice, and Generate stays disabled until you agree again. There is no automatic retry after a configuration change.

The saved checkpoint and manual work link remain available during cancellation, timeout, authentication/permission failure, model unavailability and rate/usage limiting. Provider error bodies and keys are excluded from errors/logs. HTTP redirects are refused, pending responses are not polled, inference is capped at 30 seconds, and there are no implicit retries or hosted/local fallback.

## Verification

`pnpm test` includes native NVIDIA envelope/header/format/error tests through MSW, the common harness validators, and server consent-boundary tests. `pnpm test:e2e --grep @nvidia` checks the hosted notice, checkbox, refresh and changed-model agreement with synthetic app-boundary responses; it does not claim real model inference.

With the configuration above, `pnpm test:model:live` evaluates six scenarios: increase, decrease, unchanged, cosmetic edit, contradictory instructions, and missing evidence. Five call the actual configured model; missing evidence must be blocked locally before a provider request. The command records actual inputs/messages/results/settings under ignored `.runtime/model-evaluation/`. It sends fictional fixtures rather than your saved tasks. Inspect outputs as well as assertions; these few cases are not an accuracy benchmark.

For a real browser/API journey with fictional data:

```sh
REENTRY_TEST_LIVE=1 REENTRY_AI_PROVIDER=nvidia \
REENTRY_AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b \
NVIDIA_OUTPUT_MODE=text NVIDIA_THINKING=off \
pnpm test:e2e --grep @live --output=.runtime/nvidia-live
```

The test explicitly checks the processing agreement before inference, then verifies source evidence, progress, user correction and Continue at the saved work URL. Trace/page recordings are local ignored test evidence, not a finished submission video. Hosted calls use your NVIDIA account's limits; a rate/usage failure is visible and requires an explicit retry.
