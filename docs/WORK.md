# Active work and handoff

## Current automatic-agent iteration

Phase 1 automatic observation is implemented. The real setup/dashboard is at http://127.0.0.1:3000/observe; [AGENT_OBSERVATION.md](AGENT_OBSERVATION.md) explains pairing, site consent, privacy boundaries and retry. The companion is an extension page and configured native side panel. It reads permitted visible pages automatically through the patched Page Controller, with local-only processing consent, pause/site controls and an authenticated durable queue. SQLite owns accepted observations; manual Dexie checkpoints remain independent. The labelled fictional design preview remains at `/preview`.

Focused Phase 1 production acceptance passed seven Chromium journeys: queue capacity, Northstar draft/changed instructions, automatic page/form observations and seeded private exclusions, app-tab closure, offline delivery/full browser restart, pause/resume/revocation, exact ports/untrusted bridge requests, failed storage/recovery, axe and narrow layouts. The full production suite passed 55 journeys with two intentional live-model/demo skips; all seven affected observation journeys passed again after final retention hardening. Both upstream-shop cases passed: the automatic observed checkout and the existing checkout/reset acceptance. Final `pnpm check` passed all 99 tests across sixteen files plus formatting, lint, web/extension types and policy guards. Default-origin production web/extension builds and HTTP smoke passed; the app is running at http://127.0.0.1:3000. The focused publication audit passed across 514 history blobs, tracked files and built browser assets, including comparisons against configured credentials. Phase 0 hosted CI run 39835426949 passed; Phase 1 hosted CI is checked after publication and reported separately.

Next concrete task: Phase 2 of [BUILD_PLAN.md](BUILD_PLAN.md): provider-independent task/finish-condition inference with LangGraph, stable task/effect IDs, cross-tab grouping, user corrections and stale-decision guards. No model receives the Phase 1 observation stream, and no automatic task inference, completion judgment or reminder delivery is claimed. Existing manual NVIDIA/Ollama recovery remains unchanged. Native side-panel placement/shortcut, external-site Chrome permission prompts, VoiceOver and actual browser zoom/text checks remain manual gates.

The [Phase 0 foundation](AGENT_FOUNDATION.md) retains the exact source pins and restart/reader adaptation evidence. LangGraph's existing SQLite spike and the reused Sauce Labs shop remain available; their fixture data is separate from the production observation store.
The [research comparison](AGENT_REUSE.md) documents alternatives: Defuddle only for a demonstrated extraction gap; Nanobrowser as a targeted reference; other automation tools/frameworks deferred. Genuine Learn reviews, eligibility and native accessibility remain separate open human gates.

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
