# Phase 3 — AI recovery you can inspect

ReEntry now has a fixed prepare → model → validate → review workflow. The model interprets your comparable source captures and proposes one action. You inspect the evidence, correct the suggestion if needed, and explicitly save the reviewed action before Continue opens your existing work link.

## Enable local inference

Install and run Ollama separately. Choose an installed model that supports its native structured-output API. The application does not download models automatically or change provider after an error.

In your ignored `.env.local`, configure:

```dotenv
REENTRY_AI_PROVIDER=ollama
REENTRY_AI_MODEL=qwen3:4b
REENTRY_AI_ENDPOINT=http://127.0.0.1:11434
REENTRY_AI_THINK=false
REENTRY_AI_TIMEOUT_MS=30000
```

If the model is absent, `ollama pull qwen3:4b` downloads it (approximately 2.5 GB). Restart the app after changing server settings. `REENTRY_AI_PROVIDER=disabled` with an empty model id preserves manual recovery and capture/comparison. The configured model id is required when Ollama is enabled; unsupported providers and non-loopback endpoints fail configuration validation. The default endpoint must be an HTTP loopback origin with no path, credentials, query or fragment.

The later [NVIDIA adapter](NVIDIA.md) adds an explicitly approved hosted option. There is no direct OpenAI/DeepSeek adapter or credential screen yet. The server-only `RecoveryModel` interface accepts any future adapter; the shared proposal schema, validator, UI and database do not depend on Ollama response types. Hosted adapters will require their own request/envelope tests, evaluation and explicit processing agreement before use.

## Try the complete journey

1. Follow the [Phase 2 walkthrough](PHASE2.md): save V1, pause, switch the actual instruction file to V2, recapture the same section and save the comparison.
2. Choose **Review AI recovery**, then **Generate recovery suggestion**. The screen names the configured provider/model and explains the local processing boundary before the request.
3. Read goal → confirmed progress → interpretation and before/after quotes → one next action → questions/materials. Source ids identify the immutable snapshots; **Inspect source evidence** opens their full text, URLs and timestamps.
4. Correct **Reviewed next action** if needed, then choose **Save reviewed recovery**. This saves a reviewed proposal separately; the original checkpoint's progress and action remain intact.
5. Choose **Continue to saved work**. ReEntry opens only the stored, user-reviewed work URL. It does not fill or submit the external form.

A new source check or changed checkpoint makes an older result stale. Late results cannot be saved or continued as current. Refresh reloads a current saved suggestion and its reviewed action. Full checkpoint revisions/restoration/deletion remain Phase 4.

## Validation and failure behavior

- The server validates task/check/baseline association, equivalent captures, exact snapshot digests and input bounds. The browser also checks current task/source input before saving or continuing.
- The model receives goal, confirmed progress, saved action and the actual two source texts/ids. Source prose is untrusted data. There are no model-selected tools, browsing, executable actions or credentials in the prompt.
- Output uses a versioned strict schema. Confirmed progress must match exactly; changed interpretations require old/new source citations with exact quote membership. Unknown fields, invented completion fields, destinations, invalid references and malformed/incomplete output are rejected. Uncertainty requires a question.
- These checks do not prove semantic correctness. A model can still misunderstand quantities, contradictions or what remains to do. The live evaluation checks selected examples; user inspection/correction is part of the product, not a guarantee of factual accuracy.
- One inference call uses a total deadline of at most 30 seconds and cancellation. The adapter also reads local model metadata to record the available digest. No implicit retries, model switching or cloud fallback occurs. An explicit retry is a new request.
- The Ollama adapter bounds its JSON response and generation length. A conservative 12,000-byte prompt budget leaves space in the 16K context; oversized evidence produces a visible failure instead of silent truncation. Full captures remain saved for manual review.
- On error, timeout or cancellation, confirmed progress is preserved and **Open saved work manually** stays available. The server logs fixed events, duration, provider and error codes; task/source bodies, prompts and raw model errors are excluded.

## Test sandboxes and actual model evidence

`pnpm test:e2e` starts a synthetic model sandbox using MSW handlers through Serve, alongside isolated static instructions and the real extension. `pnpm test:e2e --grep @recovery` runs only recovery cases. These mock tests exercise the real server-to-model HTTP envelope; they are not proof of model quality.

`pnpm sandbox:model` starts the same synthetic handlers at http://127.0.0.1:4190. To use it manually, deliberately configure that endpoint and model `reentry-test`, then restart ReEntry. Its outputs are synthetic; restore your real model settings afterward. Fault modes exist only in test handlers, selected by fictional goals such as `case:bad-quote`, `case:timeout` and `case:unavailable`.

`pnpm test:model:live` calls the actual configured model for referee increase, unchanged instructions and contradiction. It records actual inputs/results, full synthetic evaluation messages, model digest, prompt/schema versions, settings, validation, latency and case assertions under ignored `.runtime/model-evaluation/`. Read the records as well as the exit code; heuristic assertions alone do not establish usefulness.

`REENTRY_TEST_LIVE=1 REENTRY_AI_MODEL=qwen3:4b pnpm test:e2e --grep @live` runs the real-extension V1/V2 journey with the model sandbox disabled. It records a browser trace, screenshot and page videos under `test-results/`. Run live evaluation separately from large builds or browser regressions to avoid avoidable resource contention. The application still enforces the same 30-second limit under load.

See [TEST_RESULTS.md](TEST_RESULTS.md) for observed runs, failed attempts and remaining limits. Formal Learn review gaps are unchanged; no retrospective approval is implied by this implementation.
