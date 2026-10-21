# Active work and handoff

## Goal

Phase 3: implement the provider-independent recovery harness, local Ollama adapter and a correctable recovery card. The user explicitly requested implementation after Phase 2 (`0052e56`); the initial working tree was clean.

## Decisions

- One product remains the WXT extension plus Next.js app. Capture and source comparison are unchanged; the comparable check page now links to `/recover`.
- The fixed harness validates input → calls one `RecoveryModel` adapter → validates proposal → returns execution metadata. No agent framework, tool loop, hosted SDK, provider fallback or automatic retry.
- Local Ollama uses native schema-constrained `/api/chat`, bounded JSON, temperature zero, configured thinking, a conservative prompt budget and at most 30 seconds including cancellation. Model listing supplies the actual available digest. Provider/model/loopback endpoint are validated server settings, never browser-controlled destinations.
- Recovery proposals must preserve confirmed progress exactly and cite actual snapshot ids/quotes. Strict output rejects unknown fields and destinations; the app maps the sole `work` target to the user's stored work URL. Validation does not prove semantic correctness; inspection and correction remain necessary.
- Dexie v3 stores proposals and reviewed actions separately. A task/source input digest includes the revision and full source context. New source checks or altered task data reject late results and disable stale continuation. Original task facts/action are not overwritten; full checkpoint revisions/restoration/deletion remain Phase 4.
- Server API uses same-origin validation, bounded readJson, withRoute, safe fixed event names and no source/prompt logging. No cloud processing was enabled. Manual recovery remains available when AI is disabled, unavailable or cancelled.
- UI uses existing registry components/defaults; no custom visual system. Visual refinement follows this working recovery kernel.
- Synthetic model responses use MSW 3.0.3 through Serve 0.11.0; tsx 4.23.15 runs their shared handlers and the live evaluator. esbuild installation is explicitly approved for this development runtime. No sandbox engine was built.
- Existing Qwen3.5 9B trials revealed deadline failures under load and one suggestion skipping a still-pending first step. The prompt was tightened; Qwen3 4B was selected after evaluation with thinking disabled and prompt `recovery-2`. Earlier smaller-model prompt/thinking trials also failed; their limitations are recorded in the results. Model selection is an explicit development/configuration choice, never an application fallback.
- Preserve starter history/notices and `upstream` as reference-only. Formal Learn scope remains draft; PRD/spec/formal curriculum checklist/reviews remain incomplete. Do not claim retrospective approval or publish/push without the author's instruction.

## Verification state

- All 25 deterministic browser cases passed (15 capture/source regressions plus ten recovery cases); the separate live-only case is skipped in that run.
- Unit/integration suite: 55 passed across eleven files. Coverage includes provider contract, native HTTP envelope, validation/injection boundaries, no fallback, cancellation even for a noncooperative fake adapter, persistence/review/staleness, input budget, HTTP origin/payload rejection and existing regressions.
- Final `pnpm check` passed (55 tests across eleven files); web and extension production builds and production HTTP smoke passed. `/recover`, `/check` and local model configuration were verified against the production server.
- Live gate passed: all three final model cases and the separate real-extension/model journey passed, including close/reopen, review/correction and Continue. See [PHASE3.md](PHASE3.md) for commands; record actual evidence in [TEST_RESULTS.md](TEST_RESULTS.md).
- Model records, download logs, browser artifacts, `.env.local` and the learner profile are ignored/untracked. The managed production app is running at http://127.0.0.1:3000 with local `qwen3:4b` enabled in ignored configuration.

## Next concrete action

Phase 3 is ready for its implementation commit. The next product implementation is Phase 4: revision corrections, restore, history/deletion and broader interruption resilience.
