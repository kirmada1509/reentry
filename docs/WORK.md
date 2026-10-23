# Active work and handoff

## Current automatic-agent iteration

Phase 6 is in progress. The new versioned `agent-release-v1` corpus and evaluator distinguish regression and development-held-out traces, task discovery, merges, negative completion checks, call attempts, latency, and scripted versus operator corrections. Four scoring/corpus tests pass. Freeze/commit this cohort before the first actual model run; preserve every result. Next: real NVIDIA corpus, live application/shop recordings and factual release/submission updates. The default managed app must be stopped before tests rebuild `.next`, and restored at the end. No product prompt/validator changes yet.

Phase 5 is implemented and locally verified (October 24). [AGENT_CALM.md](AGENT_CALM.md) documents the live task-first home/companion, disclosures, actual ten-revision read-only history, focus-stable updates, stale-read protection, inline correction/clear failures and reduced motion. Existing registry theme/controls and model-independent harness remain; inference prompts, provider inputs and completion rules did not change. User actions apply immediately, while background task content waits for focused review; hidden apps keep updating. No automatic-task restore was added.

`pnpm check` passed 167 tests/twenty files and project guards. Complete local production regression passed 64 cases with two intentional skips and one headless focus-fixture issue; the corrected fixture and all six affected task/calm journeys then passed against fresh production builds. Commerce passed two with one explicit live skip. Default-origin web/extension builds and HTTP smoke passed. Selected evidence and screenshots: [TEST_RESULTS.md](TEST_RESULTS.md) and [evidence](evidence/agent-phase5-verification.txt). Publication audit and hosted CI are reported separately at handoff. The managed production app is restored at http://127.0.0.1:3000; reload the unpacked extension and refresh existing tabs. The automatic task home is http://127.0.0.1:3000/observe.

Next: Phase 6 of [BUILD_PLAN.md](BUILD_PLAN.md), complete-agent evaluation and new demonstration. Native Chrome attachment timed out during Phase 5. VoiceOver, native side-panel placement, actual browser zoom/text, native optional-permission decisions and OS notification banners remain explicit manual gates. Genuine Learn reviews/reflections and submission/upload gates remain open. Retain Phase 3 real NVIDIA evidence and its timeout; no new provider-quality result is claimed for this interface phase.

## Delivered

The author authorized autonomous implementation, public repository creation/push and technical release preparation. Checkpoint revisions, ten-item history, restore, recoverable drafts, conflict handling, deletion/replay safeguards, extension cleanup outbox and improved registry-composed screens are implemented.

Public source: https://github.com/kirmada1509/reentry. Preview assets: https://github.com/kirmada1509/reentry/releases/tag/v0.1.0. The release includes a 108-second actual-NVIDIA MP4, SRT/VTT captions and screenshots. Source instructions are explicitly fictional. README and docs/RELEASE.md explain reproducible setup and limits.

## Verification

- `pnpm check`: 86 unit/integration tests across thirteen files plus formatting/lint/web+extension types/UI provenance/focused secrets/context guards.
- Latest complete production web/extension suite: 45 deterministic cases passed together, with two explicit live/recording skips, including three new Northstar portal journeys.
- Final actual-NVIDIA demo/live-context accessibility: three passed, one synthetic-only skip. Final deterministic accessibility subset: three passed. Tests include browser restart, worker suspension, failed writes, stale results, edit conflicts, history/restore/deletion, axe, focus, long text, 320px reflow and simulated 200% text.
- Fresh clone bootstrap of `3cbf03f` passed without copied private context or credentials. Focused publication audit covers history, tracked files and built browser assets.
- Fresh six-scenario NVIDIA evaluation retained an initial decrease timeout; an isolated explicit repeat passed. No application retry/fallback was added. Evidence/limitations: docs/TEST_RESULTS.md and docs/evidence/.
- The hosted CI restriction was resolved October 22. Rerun 39701097413 passed project checks and 41 browser cases, but one accessibility case required the macOS extension font name on Linux. A retry-only fix confirmed that Chromium consistently supplies an OS-specific body font there. Font assertions now wait for the configured system font on the root and accept the browser’s sans-serif body stack, preserving the intended Geist/system sans requirements. Local `pnpm check` and all three production accessibility journeys passed after the fix. Hosted CI run 39753513724 passed all 86 project tests, 42 browser tests (two intentional skips) and production smoke. Repository/license and public video/caption downloads were verified anonymously; final production smoke passed after restoring the default-origin extension build and managed app. The app uses http://127.0.0.1:3000 with NVIDIA enabled and hosted processing agreement required.

## Local start/stop scripts

`./start.sh` / `pnpm local:start` now builds both surfaces and starts the managed production server without live reload. The previous development default reproduced a continuous Fast Refresh/page reload loop. A speculative narrower CSS watch scope did not fix it and was reverted; no development-bundler fix is claimed. Build steps run only after the existing active-server/port preflight, so repeated start cannot overwrite a running build. `./stop.sh` / `pnpm local:stop` retains owned-process stopping. Verified a real production browser stayed on ReEntry for ten seconds with zero navigations/rebuilds while both runtime and server logs were repeatedly appended; repeated start was refused before changing BUILD_ID. `pnpm check`, both builds and HTTP smoke passed. The production app is running at http://127.0.0.1:3000. Explicit development commands remain available separately. Saved browser data/origin and the extension ID are unchanged.

## Presentation sandbox

The author requested a richer presentation sandbox. `pnpm sandbox:sites` now builds and serves a fictional Northstar scholarship portal using the existing official registry components, Vite and http-server. It has award requirements, saved browser-local application fields, a simulated transcript attachment, preparation progress, review/reset dialogs and V1/V2/cosmetic switching at the same source URL. No portal backend/accounts/uploads were added. Default port 4176 falls forward when occupied; explicit occupied ports fail clearly. Minimal fixtures remain automated test equipment. See docs/SANDBOX.md and docs/TEST_RESULTS.md for the verified journey and evidence. The portal is running at http://127.0.0.1:4176/instructions.html; ReEntry is running at http://127.0.0.1:3000. Native VoiceOver/manual zoom gates remain open.

## Decisions

Keep the local Chrome/web product, NVIDIA default with explicit agreement, optional Ollama and provider-independent harness. Other provider keys are unused. Credentials, learner profile and raw runtime profiles remain ignored. Official registry font wiring fixes the starter's serif fallback; finite transition settling makes axe scans deterministic without suppressing contrast rules.

## Remaining human gates

The Mac was locked and could not be automatically unlocked. Native Chrome/VoiceOver and actual browser text/zoom acceptance remain unperformed. A public YouTube/Vimeo upload for AI Basics is still needed. Retrospective Learn documents/app map and technical submission drafts are prepared; genuine learner reviews/reflections, personal answers, eligibility/registration attestations and final submissions are not fabricated. No contest was submitted.

Rebuild/reload the extension in Chrome after updates while retaining the same ID/origin/profile. Browser storage is not an encrypted vault or backup. Clearing site data removes saved work.
