# Active work and handoff

## Current automatic-agent iteration

Phase 4 is implemented and locally verified. [AGENT_REMINDERS.md](AGENT_REMINDERS.md) documents opt-in interruption reminders, local work links, waiting/snooze/cancel, quiet hours, per-day attempt dedup, restart and privacy/delivery limits. The model contract remains unchanged and cannot schedule reminders or infer website deadlines. The same `/observe` page and companion share the recovery controls. Default policy is off, 45 minutes away, once per task per local day, quiet 22:00–08:00 with an explicitly saved timezone.

`pnpm check` passed 158 tests/nineteen files and project guards. Both new production browser journeys passed, including permission denial/cancel boundary stubs, persistence, restart, safe return URLs and axe. Actual Chrome notification APIs passed using a disposable pregranted-permission copy of the production bundle; native optional-prompt approval and visible desktop banners remain manual gates. The default production manifest keeps notifications/idle optional. No real user browser profile/permission was changed. The full production regression passed 61 cases with two intentional skips. Final new reminder journeys passed again after scrolling/transaction/pending-link hardening, and four existing task/progress cases passed during that hardening. Commerce passed two cases with one explicit live skip. Default-origin web/extension production builds and HTTP smoke passed. The managed app is running at http://127.0.0.1:3000; reload the unpacked extension and refresh open pages. Publication/CI are reported separately at handoff.

Next: Phase 5 of [BUILD_PLAN.md](BUILD_PLAN.md), calmness and reliability across content, interruptions and accessibility modes. Retain native VoiceOver/side-panel/zoom gates and genuine Learn/submission gates. Previous Phase 3 accepted 134 tests and hosted CI 39980315622; its real NVIDIA evidence and retained timeout are in [TEST_RESULTS.md](TEST_RESULTS.md).

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
