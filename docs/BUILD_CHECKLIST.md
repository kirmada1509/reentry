# ReEntry build checklist

Project execution tracker, started October 21, 2026. Phases 1–3 implemented October 22. Details and test gates: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); actual evidence: [TEST_RESULTS.md](TEST_RESULTS.md).

This checklist tracks actual project work. It is not the formal Learn `devpost/checklist.md`, which `5-build` generates from the genuinely reviewed scope, PRD, and spec. Do not mark a phase complete until its gate passes.

## Repository and baseline

- [x] Verify Git is initialized in this project; preserve the starter's history.
- [x] Keep the source remote named `upstream`; do not publish ReEntry changes there.
- [x] Verify local credentials and the learner profile are ignored and untracked.
- [x] Save the reviewed ReEntry planning/setup baseline as a local commit: `8be78ad`.

## Phase 0 — Learn planning

- [x] Inspect the actual `devpost/` state and the dedicated ReEntry workspace.
- [x] Run `1-start`, carry forward the supplied idea, and save an honest ignored learner profile.
- [ ] Establish review format and review the generated scope draft.
- [ ] Save learner-approved `devpost/scope.md` through `2-scope`.
- [ ] Run `3-prd`; save and review the concrete screens, behavior, states, and accessibility requirements.
- [ ] Run `4-spec`; save and review the technical plan, data contracts, connection boundary, and model investigation.
- [ ] Generate the formal Learn build checklist through `5-build` against the approved documents.
- [ ] Verify required planning documents are substantive and public-ready, with real review status and upstream attribution.

**Learn gate remains incomplete.** On October 22 the author explicitly requested Phase 1 implementation; that instruction took precedence over the roadmap’s sequencing. Scope/PRD/spec reviews and the formal Learn checklist remain pending. Do not claim the prescribed learning process was followed in order.

## Phase 1 — Capture and save

- [x] Create the WXT extension and standard capture-preview UI; pin only needed dependencies.
- [x] Capture selected text/title/source URL from a separate origin after explicit user invocation.
- [x] Implement the bounded native app/extension connection and Dexie save with durable acknowledgement.
- [x] Save a goal, reviewed work link, confirmed progress, and user-entered next action.
- [x] Verify persistence after refresh and duplicate-delivery handling; reject invalid sender/input and declined previews.
- [x] Pass `@capture` checks, actual Chrome keyboard/permission check, workspace checks, and web/extension builds.

**Gate passed:** real external capture becomes one durable saved task; no clipboard or mocked-permission substitute. Native keyboard acceptance used Chrome for Testing 156 on macOS. Screen-reader acceptance remains Phase 5. See [results](TEST_RESULTS.md).

## Phase 2 — Return and compare

- [x] Add Return/Open source/Check again with explicit task/source association.
- [x] Reuse existing form pages; add only small V1/V2 instruction fixtures served by http-server.
- [x] Recapture at a stable source URL and show raw old/new evidence using jsdiff.
- [x] Distinguish changed text, unchanged captured section, failed check, and incomparable captures.
- [x] Pass `@sources` checks, including wrong-task/section and failed recapture cases.

**Gate passed:** current source evidence is inspectable; failed checks never become “unchanged.” See [walkthrough](PHASE2.md) and [results](TEST_RESULTS.md).

## Phase 3 — Real-model recovery

- [x] Define the provider-independent recovery interface and simple harness from [HARNESS.md](HARNESS.md); keep SDK types out of UI/storage.
- [x] Connect local Ollama through a bounded, validated server-only adapter with configurable provider/model; disable implicit retries and automatic cloud fallback.
- [x] Validate source ids/quotes, action targets, output bounds, and consistency with confirmed facts.
- [x] Show a correctable recovery card and one next action; Continue uses the saved work link.
- [x] Reuse MSW/Serve handlers for deterministic good/error model responses; pass `@recovery` checks.
- [x] Verify the common harness contract with mocked Ollama and a fake alternative, including invalid configuration, cancellation, stale results and no remote fallback. Hosted adapters require their own tests and explicit processing agreement when added later.
- [x] Record real-model increase, unchanged, and contradiction runs with actual inputs/outputs and model/prompt identifiers.
- [x] Demonstrate real capture → pause → change → recapture → actual inference → Continue with mocks disabled.

**Gate passed:** the core journey works with actual local Qwen3 4B, including review/correction and Continue. Three live cases and a separate real-extension/model journey passed; see [results](TEST_RESULTS.md) and [setup](PHASE3.md).

## Phase 4 — Correction and resilience

- [ ] Save corrections as revisions; restore prior contents as a new revision and enforce bounded history.
- [ ] Handle app/popup/worker/browser interruptions and failed writes with visible pending/unsaved states.
- [ ] Reject stale inference/transfer results and conflicting saves without losing newer state.
- [ ] Delete task-associated history, evidence, proposals, and pending captures; prevent resurrection.
- [ ] Pass `@resilience` checks and hands-on edit/restore/interruption/deletion checks.

**Gate:** tested failures cause no silent loss, duplicate checkpoint, stale overwrite, or deleted-task resurrection.

## Phase 5 — Complete accessible acceptance

- [ ] Finish deterministic coverage for all six sandbox groups in [BUILD_PLAN.md](BUILD_PLAN.md#required-testing-sandboxes).
- [ ] Add axe checks for ReEntry UI and pass `@a11y` plus core browser regressions.
- [ ] Complete keyboard-only and VoiceOver journeys, including permission invocation and error recovery.
- [ ] Check focus, labels, announcements, 200% text, 400% web reflow, narrow layouts, and reduced motion.
- [x] Finish six-case evaluation for the current NVIDIA Ultra default (five real inferences plus missing evidence blocked before inference); retain actual evidence/limits in [TEST_RESULTS.md](TEST_RESULTS.md). Local Ollama retains its separate three-case regression.
- [ ] Fix core usability/accessibility defects before release.

**Gate:** the whole recovery journey and its failure paths are accessible and supported by actual test evidence.

## Phase 6 — Reproducible release

- [ ] Verify fresh-profile setup and actual production web/extension builds together.
- [ ] Update README setup, extension-id configuration, fixture reset, model setup, licenses, and disclosures.
- [ ] Update production smoke tests and CI; run workspace, build, and deterministic end-to-end gates.
- [ ] Record the roughly two-minute working demo with real inference and disclosed controlled test content.
- [ ] Complete Learn final review, learning wrap-up/app map, and the actual shipping workflow.
- [ ] Prepare public repository/video and participant-written submission materials; verify event eligibility and deadlines.

**Gate:** a new user can reproduce the release, and demo/test evidence matches the built version. Publishing and submission are not claimed until actually performed.

## Recording progress

When tests exist, save real outcomes in `docs/TEST_RESULTS.md`: phase, commit, commands, automated/manual results, evidence links, and limitations. Keep the next action in [WORK.md](WORK.md). Capture/source/recovery browser cases, static/MSW sandboxes and explicit live-model evaluation are runnable; resilience and accessibility tags remain planned. Never tick a box because a file merely exists or a mock produced the desired answer.
