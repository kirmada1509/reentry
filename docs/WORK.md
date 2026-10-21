# Active work and handoff

## Current result

NVIDIA integration follows Phase 3 commit `221a5e9`. The user requested using `NVIDIA_API_KEY` and placed it in ignored `.env.local`. The NVIDIA adapter is implemented behind the existing `RecoveryModel` interface; no new package or agent framework was added.

## Decisions

- Current hosted selection: `nvidia/nemotron-3-ultra-550b-a55b`, NVIDIA text-output mode, thinking off. Local Ollama `qwen3:4b` remains available through explicit server configuration. Other provider keys supplied by the user are untouched and unused.
- NVIDIA authentication stays server-side. Its credential destination is fixed to the official HTTPS chat-completions endpoint; redirects are refused. No browser credential settings, model-selected tools, implicit retry or fallback.
- The screen names NVIDIA/model and the exact task data leaving the computer before inference. An unchecked, page-local agreement gates Generate. Server acknowledgement is bound to provider/model/output/thinking configuration; a stale acknowledgement is rejected before inference and the notice refreshes without retry.
- Provider-specific configuration supports text, JSON object and JSON schema request modes and explicit thinking controls. Only Ultra/text/thinking-off has the completed live quality gate. HTTP mocks cover other request modes; support/quality must be evaluated per selected model/account.
- Keep the common evidence/progress/target validators, 30-second deadline, bounded response/input and stale-result checks. Hosted responses record the served model and settings with a null weight digest; no remote hash is invented.
- Prompt `recovery-3` adds obsolete-action handling and distinguishes cosmetic edits from meaning changes. Earlier Lightning trials failed edge cases; a Super model was inaccessible (404). Ultra was selected explicitly during development, never as an application fallback.
- No checkpoint schema/history change: reviewed recovery stays separate from original facts. Formal Learn review gaps and starter attribution remain unchanged; no public push/submission is authorized.

## Verification

- Deterministic browser suite: 26 passed, one separate live-only case skipped. Includes hosted notice/agreement, stale-model rejection, refresh reset, all capture/source/recovery regressions. Synthetic UI responses establish consent behavior, not model quality.
- Unit/integration suite includes native NVIDIA headers/formats/cancellation/refusal/truncation/invalid outputs, safe HTTP failures, no retry, configuration, server agreement checks and a NVIDIA token-pattern guard. Final `pnpm check`: 80 tests across twelve files plus formatting/lint/types/UI/secret/context guards passed. Details: [TEST_RESULTS.md](TEST_RESULTS.md).
- NVIDIA's six-case evaluation passes with Ultra (five real inferences plus missing evidence blocked locally). Its real-extension hosted journey passed, including agreement, actual inference, correction and Continue. Local Ollama's three original cases also pass with prompt 3. Exact evidence and limits: [TEST_RESULTS.md](TEST_RESULTS.md).
- The actual NVIDIA key was checked absent from built web/extension browser assets. `.env.local`, other credentials, learner profile and browser/model evidence remain ignored/untracked. Never include credential values in handoff output.
- Production defaults are NVIDIA in ignored local settings. Web/extension production builds and HTTP smoke passed. Public hosted-model setup and missing-agreement rejection were verified against production. The managed app is running on http://127.0.0.1:3000.

## Next product work

Phase 4: revision corrections, restore, bounded history/deletion and broader interruption resilience. Do not treat the NVIDIA adapter as completion of accessibility/release/Learn gates. Setup: [NVIDIA.md](NVIDIA.md); existing local path: [PHASE3.md](PHASE3.md).
