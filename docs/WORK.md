# Active work and handoff

## Completed update: automatic entry points and assignments

October 24: implement normal root/toolbar companion entry, isolate manual tools without deleting existing data, and add Moodle-style assignment recognition/identity/progress. Prompt agent-3.7 also supports explicit other work with user-confirmed completion. See [behavior and demo](AGENT_ASSIGNMENTS.md). Verified: 194 tests/26 files and all project guards; full production browser 67 passes/three skips, final affected acceptance 4/4 and portal/application 5/5, commerce two passes/two skips. Actual NVIDIA agent-3.7 development trials pass 9/9 progress and 5/5 assignment outcomes (four model decisions plus one host-ignore). Earlier input-size, classification and invalid-receipt failures remain recorded in TEST_RESULTS and the trial ledger. The frozen 25-step agent-3.4 corpus was not replayed for 3.7. Default-origin extension/web builds and production restart passed; HTTP smoke checks the new home redirect, automatic screen, manual library, health and request correlation. The managed app is running at http://127.0.0.1:3000. Reload the unpacked extension and refresh source/app tabs before using this update. Publication audit passed; no private campus page or real coursework was used for testing.

## Current automatic-agent release

Phase 6 technical implementation and verification are recorded; the preview is a controlled submission candidate with explicit model/manual limitations. [AGENT_RELEASE.md](AGENT_RELEASE.md) is the current protocol, evidence and acceptance record. The immutable evaluation corpus was committed before first inference. Actual model testing prompted bounded citation compatibility and one summary-only repair within the existing three-call budget. No dependency or additional provider was added.

Current actual-NVIDIA recordings: application-9 (83.88 seconds, five accepted jobs/six model-call reservations) and shopping-2 (73.88 seconds, five jobs/five calls). Both use fresh profiles, fictional sites, no seeded inference, no operator retry/correction and separate successful restart checks. Earlier failed takes/cohorts remain recorded. Packaged MP4/SRT/VTT/screenshots are under ignored `.runtime/agent-release/distribution`; raw traces/profiles must not be published.

Verification: `pnpm check` passed 185 tests/25 files and project guards; production root browser regression passed 65 with three intentional skips; commerce passed two with two intentional skips. Fresh local clone of `7b7b326` passed bootstrap, 183 then-current tests and both builds without copied credentials, learner profile or task database. The two later tests check publication-audit paths/failures only. Actual results and limitations are in [TEST_RESULTS.md](TEST_RESULTS.md).

The final paced NVIDIA replay completed all 25 steps: 23 passed, regression 10/10, discovery errors 0/12, wrong merges 0/1, zero accepted false completions across 26 negative checks and none missing. Two unsafe completion proposals were rejected; the strict evaluator exits 1. An all-passing model-quality claim remains open. Earlier provider-disrupted trials and the affected reader/progress attempts are retained. Do not retune the frozen corpus or present exposed-cohort replays as blind hold-outs.

Hosted implementation CI passed on `2233791`: https://github.com/kirmada1509/reentry/actions/runs/40036866545. [Technical preview](https://github.com/kirmada1509/reentry/releases/tag/v0.2.0); final documentation/evidence CI status is visible in GitHub Actions. Default-origin extension/web builds and HTTP smoke passed after restoring the managed production app at http://127.0.0.1:3000. Reload the unpacked extension and refresh its existing tabs. Final publication verification is recorded at handoff.

## Product and local use

Use `./start.sh` / `pnpm local:start` for production without live reload; `./stop.sh` / `pnpm local:stop` stops only owned processes. Start refuses active servers/occupied ports before rebuilding. The automatic home is http://127.0.0.1:3000/observe; load `extension/.output/chrome-mv3` unpacked, pair, enable a chosen site and separately agree to model processing. Reload the extension and refresh existing tabs after rebuilding, preserving extension ID/origin/profile. The original capture/checkpoint editor/history/restore remains under Manual tools → Manual checkpoints at `/checkpoints`.

`pnpm sandbox:sites` prints the fictional Northstar portal URL; `pnpm sandbox:switch v1|v2|cosmetic` changes instructions before recapture/observation. `pnpm sandbox:commerce` reuses the attributed pinned Sauce Labs sample shop. No real payment, account, upload or application submission is implemented. External pages own their form state.

## Decisions and authorization

The author authorized autonomous implementation, public repository creation/push and technical release preparation. Keep the local Chrome/web app, NVIDIA default with explicit agreement, optional Ollama and provider-independent harness. Other supplied provider keys remain unused. Credentials, learner profile and runtime profiles remain ignored. Keep starter history/MIT license and `upstream`; public source is https://github.com/kirmada1509/reentry. Preserve the historical v0.1.0 manual preview.

## Open human gates

Native VoiceOver, actual browser zoom/text, side-panel placement, optional-permission decisions and OS notification banners remain unperformed. The final native inventory again reported that the Mac was locked and automatic unlock failed; no native apps/browser session was accessible. The in-app browser had no tabs, so no existing authenticated video-upload session was available through the enabled surfaces. Do not infer conformance from headless checks. Genuine learner reviews/reflections, personal answers, participant eligibility/registration, a required public YouTube/Vimeo upload and actual submissions remain separate. Retrospective Learn addenda and factual submission drafts are prepared; no personal approval, reflection or submission receipt is invented.
