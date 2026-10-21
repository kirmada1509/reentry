# Active work and handoff

## Goal

Phase 2: return to a saved task, explicitly recapture its source, and inspect old/new text without losing confirmed progress. Implemented October 22, 2026; verification is recorded in [TEST_RESULTS.md](TEST_RESULTS.md).

## Decisions

- One product: WXT Chrome extension plus Next.js app. Selected-text capture happens before the review tab opens. No parser, custom scholarship app, Electron wrapper or sandbox engine.
- Reuse WXT storage, webext-core messaging, Dexie and jsdiff. The Phase 2 dependency is `diff` 9.0.0; raw evidence stays intact and exact text equality determines unchanged status.
- Native external messaging retains the manifest hostname restriction plus exact app-origin/port and sender checks, strict bounded payloads, confirmed captures only, durable database commit before acknowledgement and capture-id deduplication.
- Default app origin: `http://127.0.0.1:3000`; stable unpacked id: `nabinfdlobegbkgehppcipkhbddjbdka`. The development identity key is public. No provider credentials are needed for Phases 1–2.
- A source tab is bound to task/check/baseline identifiers before recapture. Preview names the task; app verifies the association. Same-section confirmation is required in addition to optional page id/heading hints. Full URL/mode/version/known section mismatch produces incomparable evidence.
- Comparisons retain immutable before/after snapshots against the original checkpoint. They do not replace progress or the saved action. Changed text includes cosmetic edits; there is no semantic requirement or verified-action claim yet.
- Check sessions use browser-session storage to prevent tab-id reuse after browser restart. Pending captures remain local, bounded and expiring. Failed/cancelled/missing-context checks remain unverified; history/deletion/full restart resilience belongs to Phase 4.
- Keep the later harness simple and model-independent; see [HARNESS.md](HARNESS.md). No agent framework, model client or hosted provider was installed. Visual refinement follows the working recovery kernel.
- The user explicitly requested implementation despite missing formal Learn reviews. Scope remains draft; PRD/spec/formal Learn checklist remain absent. Do not fabricate curriculum completion or learner experience.
- Preserve starter history and MIT notices. `upstream` remains reference-only; no remote publication or push was requested.

## Actual state

- Phase 1 was already committed as `31c8d24` before Phase 2 began. Workspace checks, web/extension production builds and production HTTP smoke passed; the updated managed production server is running at port 3000. [PHASE1.md](PHASE1.md) explains initial setup; [PHASE2.md](PHASE2.md) explains stable-URL switching and recapture. Checklist: [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md).
- Fifteen real-extension browser cases passed: six capture regressions and nine source-comparison cases. These cover actual action permission, same-URL V1/V2 recapture, both snapshots across refresh, unchanged/cosmetic edits, cross-task rejection, cancellation/failure, write/acknowledgement retries and repeated invocation. Phase 1 native keyboard evidence remains valid for that phase; no new Phase 2 VoiceOver/native keyboard acceptance is claimed.
- Dexie v2 retains legacy Phase 1 records and adds source checks without inventing missing section metadata. Failed writes do not acknowledge; acknowledgement failure retains one durable comparison and retries after refresh.
- Static versions are fictional HTML served by existing http-server with caching disabled. The copy helper changes only source content, never an expected comparison/model answer. Automated runs own isolated fixture copies/profiles/ports.
- AI recovery, corrections/restoration/deletion and full accessibility acceptance remain unimplemented. Credentials, learner profile and browser evidence remain ignored/untracked.

## Next concrete action

Phase 3: implement the provider-independent recovery contract and bounded local Ollama adapter; validate proposals against actual source snapshots and confirmed facts. Preserve manual recovery and never silently fall back to a hosted provider. Record real-model evidence before clearing its gate. Formal Learn planning/review gaps remain separate outstanding submission work.

## Verification

See [TEST_RESULTS.md](TEST_RESULTS.md) for exact checks, local evidence and limits. Initial ReEntry baseline: `8be78ad`; pre-Phase-1 baseline: `f86a3f4`. Publication has not occurred.
