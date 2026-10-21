# Active work and handoff

## Goal

Phase 1: capture selected external-page instructions through the real Chrome extension and save a durable, user-confirmed task. Implemented October 22, 2026.

## Decisions

- One product: WXT extension plus Next.js web app. User invokes the toolbar or keyboard shortcut; capture happens before a separate review tab opens so focus changes do not lose the selection.
- Reuse browser selection, WXT storage, webext-core internal messaging and Dexie. No parser, custom scholarship app or sandbox engine. Supporting links use complete reviewed HTTP(S) URLs.
- Native external messaging: manifest hostname restriction plus exact app-origin/port and sender checks, strict bounded payloads, confirmed captures only, durable database commit before acknowledgement, capture-id deduplication.
- Default app origin: `http://127.0.0.1:3000`; stable unpacked id: `nabinfdlobegbkgehppcipkhbddjbdka`. Extension public key is for development identity. Public connection settings are validated server-side; no model/provider credentials needed.
- Keep the later harness simple and model-independent; see [HARNESS.md](HARNESS.md). No model or agent framework was installed.
- User explicitly requested Phase 1 despite missing formal Learn reviews. This overrides the roadmap order, not the truth of review status. Scope remains draft, PRD/spec/formal Learn checklist absent. Do not fabricate curriculum completion or learner experience.
- Preserve starter Git history and MIT notices; remote `upstream` remains reference-only. No remote repository or push was requested.

## Actual state

- Phase 1 product gate passed. [PHASE1.md](PHASE1.md) explains setup, sandbox and the working journey. [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md) records completion; [TEST_RESULTS.md](TEST_RESULTS.md) records evidence.
- Six real-extension browser cases passed with a bundled Chrome for Testing persistent profile and actual toolbar-action permission grant. Native keyboard journey also passed against production web/extension builds on macOS. No VoiceOver result is claimed.
- Capture drafts/confirmed transfers wait in extension storage (maximum ten, 24-hour TTL). Saved tasks persist in IndexedDB and reject duplicate capture ids with different evidence. Failed writes do not acknowledge; failed acknowledgement preserves a saved task and retries after refresh.
- Comparison, AI inference, revision editing/restoration/deletion and broad resilience/accessibility acceptance remain unimplemented. Phase 2 is next product work.
- Credentials and learner profile remain ignored/untracked. Synthetic test/browser artifacts are ignored.

## Next concrete action

Phase 2: explicit task-associated recapture at the same source, old/new evidence through jsdiff, and honest changed/unchanged/unavailable/incomparable states. Preserve Phase 1's real bridge and source metadata. Formal Learn planning/review gaps remain separate outstanding submission work; do not relabel existing roadmap documents as approved Learn artifacts.

## Verification

See [TEST_RESULTS.md](TEST_RESULTS.md) for actual commands and limitations. Baseline before implementation: `f86a3f4`; initial ReEntry baseline: `8be78ad`. Publication has not occurred.
