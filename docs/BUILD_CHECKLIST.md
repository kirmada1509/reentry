# ReEntry build checklist

This checklist tracks the automatic-agent foundation first and preserves the manual release history below. The current automatic-agent build order is [BUILD_PLAN.md](BUILD_PLAN.md); historical manual checks do not complete the new phases.

## Automatic-agent Phase 0 — Reused foundation

- [x] Compose the labelled calm home, companion and task-detail prototype from official registry UI; verify dialog keyboard/focus and narrow layouts.
- [x] Integrate Page Controller in a WXT spike; verify useful context, seeded sensitive-data filtering, unchanged test-page focus/values, bounded output and production bundling.
- [x] Prove LangGraph plus the official SQLite checkpointer across real process restart, with stable task identity and no duplicate accepted effect.
- [x] Establish the authenticated extension/server contract and single task-state authority design. Pairing/delivery endpoints remain Phase 1 implementation.
- [x] Pin and run the existing Sauce Labs shop separately; retain attribution, disable reporting/remote fonts and verify checkout/reset with synthetic data.
- [x] Record dependency/fixture versions and actual acceptance evidence in [AGENT_FOUNDATION.md](AGENT_FOUNDATION.md).

**Local gate passed October 23:** 88 unit/integration tests, 48 production browser cases with two intentional live/demo skips, and separate commerce acceptance. Phases 1–2 are now implemented below; completion verification remains next. Native accessibility/zoom acceptance is still open.

## Automatic-agent Phase 1 — Chosen-site observation

- [x] Pair the extension through an expiring one-use challenge and bound device bearer, keeping provider credentials separate.
- [x] Add local-processing/site consent, optional Chrome host access, exact-origin/port enforcement and visible pause/resume.
- [x] Register passive observers dynamically; coalesce navigation/semantic DOM/form-status changes and exclude seeded private fields/answers.
- [x] Persist a bounded extension queue before acknowledgement; retry outages without duplicate accepted events.
- [x] Store accepted observations and dedup receipts transactionally in local SQLite, with session/clock/revocation guards and retention bounds.
- [x] Wire the live dashboard and extension companion using official registry components; preserve the manual release and preview.
- [x] Pass seven focused production Chromium journeys, including Northstar, queue capacity, offline/restart, failed writes, pause/revocation, axe and narrow reflow.
- [x] Complete production regression (55 passed, two intentional skips), affected observation rerun (seven passed), commerce (two passed), workspace checks (99 tests/sixteen files), default-origin builds and HTTP smoke.
- [ ] Native side-panel placement/shortcut, external-host permission prompt and VoiceOver/real-zoom acceptance (manual gates).

The Phase 1 gate above is observation-only. Phase 2 below adds separately consented inference; completion and reminders remain later work. See [AGENT_OBSERVATION.md](AGENT_OBSERVATION.md).

## Automatic-agent Phase 2 — Inferred tasks and finish conditions

- [x] Extend existing NVIDIA/Ollama transports with a provider-independent structured request, preserving manual recovery.
- [x] Add separate current-model/site-session processing agreement and revoke it on site-session/configuration changes.
- [x] Connect the real observation authority to bounded LangGraph read/task tools and the official SQLite checkpointer.
- [x] Persist stable tasks, ten-revision history, durable jobs and idempotent effects; protect corrections and reject stale source/session/version results.
- [x] Compose the shared real task feed and concise correction dialog from installed registry controls in app and companion.
- [x] Verify subprocess restart/effect replay, failed writes, exact evidence, correction conflicts, budgets, deadlines and deletion.
- [x] Pass the eight-case real-NVIDIA corpus, including captured product/cart reader output and current-evidence priority over tentative AI memory; retain failed trials and timeouts.
- [x] Pass final workspace checks (111 tests/seventeen files), production regression (57 passed/two intentional skips), commerce (two passed/one live skip), actual NVIDIA upstream-shop journey, default-origin builds and HTTP smoke. Publication/CI results are recorded at handoff.
- [ ] Native VoiceOver, side-panel placement and actual browser zoom acceptance remain manual gates.

Task discovery was the Phase 2 boundary; Phase 3 completion is tracked below and reminders remain Phase 4. Same-site grouping and prototype limits are documented in [AGENT_INFERENCE.md](AGENT_INFERENCE.md).

## Automatic-agent Phase 3 — Progress and observed completion

- [x] Store twelve evidence-linked progress points and preserve earlier observations across requirement changes/restart.
- [x] Add a bounded complete-task tool with host checks for freshness, subject, final-review anchor, same tab/session and known receipt replay.
- [x] Observe portal dialogs; retain browser-owned stream identity across navigation/worker suspension.
- [x] Distinguish drafts, attempted submission, validation/payment failure, cancellation and observed success; preserve corrections.
- [x] Add explicit human finish, reopen and revision-aware deletion with minimal recreation markers and context cleanup.
- [x] Extend the existing Northstar with fictional validation/final review/saved receipts; reuse the existing shop checkout.
- [x] Pass the deterministic Northstar changed-requirement/validation/receipt/restart/axe journey and failed-receipt-storage case.
- [x] Pass 134 workspace tests/project guards, all four affected production journeys, commerce, actual live NVIDIA purchase completion/restart, default-origin builds and HTTP smoke; retain the separate reader timeout and successful explicit replay. The complete local run passed 58 cases with two intentional skips and one subsequently fixed model-fixture issue; hosted CI reruns the full set and is reported at handoff.
- [ ] Native VoiceOver, side-panel placement and actual browser zoom acceptance remain manual gates.

[Progress and completion setup/bounds](AGENT_PROGRESS.md). Reminders remain Phase 4.

## Automatic-agent Phase 4 — Interruptions and local reminders

- [x] Add local activity/return paths without changing model evidence inputs; exclude credentials, queries, fragments, out-of-scope pages and incognito sampling.
- [x] Compose short interruption/return summaries, explicit waiting/resume and a real continuation action from installed registry components.
- [x] Add opt-in policy with 45-minute default, once-per-task/local-day attempts, quiet hours/timezone and one-hour snooze/per-task cancellation; keep speculative research quiet.
- [x] Persist reservations before external delivery and attempt hashes before Chrome; revalidate current durable task/session/settings, distinguish failed creation from lost acknowledgement, and never resend ambiguous attempts that day.
- [x] Reconcile a missing one-minute alarm on worker/browser restart; clear stale notifications on completion/dismiss/delete, return, waiting/snooze, pause/revocation, policy changes or local outage.
- [x] Keep Chrome notifications/idle permissions optional; preserve the user's ability to decline/cancel without a delayed policy save. Keep work paths local and notification text generic.
- [x] Pass 158 workspace tests/nineteen files and all project guards. The complete production regression passed 61 cases with two intentional skips before final hardening; both new reminder journeys passed again afterward and four task/progress cases passed during hardening. Commerce passed two with one live skip. Default-origin production builds and HTTP smoke passed; publication/CI are reported separately at handoff.
- [ ] Native optional-permission prompt approval/denial, visible desktop banners, VoiceOver, side-panel placement and actual browser zoom/text acceptance (manual gates).

[Return/reminder setup and delivery boundaries](AGENT_REMINDERS.md). Deadline scheduling is intentionally absent; unknown website deadlines remain unknown. Next: automatic-agent Phase 5.

Tool assignments and deferred alternatives are in the [selected stack](BUILD_PLAN.md#selected-tools-and-exactly-how-we-use-them). The historical manual-release checklist follows.

Project execution tracker, started October 21, 2026. Phases 1–4 and automated accessibility/release work implemented October 22. Native accessibility and genuine learner/submission gates remain explicit below. Details and test gates: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); actual evidence: [TEST_RESULTS.md](TEST_RESULTS.md).

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
- [x] Prepare substantive retrospective PRD from supplied decisions and actual implementation.
- [ ] Complete genuine PRD review through the Learn workflow.
- [x] Prepare substantive retrospective specification and implementation mapping.
- [ ] Complete genuine specification review through the Learn workflow.
- [ ] Generate the formal Learn build checklist through `5-build` against the approved documents.
- [x] Verify planning drafts are substantive and public-ready, with truthful pending review status and upstream attribution.

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

- [x] Save corrections as revisions; restore prior contents as a new revision and enforce bounded history.
- [x] Handle app/popup/worker/browser interruptions and failed writes with visible pending/unsaved states.
- [x] Reject stale inference/transfer results and conflicting saves without losing newer state.
- [x] Delete task-associated history, evidence, proposals, and pending captures; prevent resurrection.
- [x] Pass automated `@resilience` checks, including browser restart and worker suspension.
- [ ] Native hands-on confirmation of edit/restore/interruption/deletion (Mac locked).

**Gate:** tested failures cause no silent loss, duplicate checkpoint, stale overwrite, or deleted-task resurrection.

## Phase 5 — Complete accessible acceptance

- [x] Finish deterministic coverage for all six sandbox groups in [BUILD_PLAN.md](BUILD_PLAN.md#required-testing-sandboxes).
- [x] Add axe checks for ReEntry UI and pass `@a11y` plus core browser regressions.
- [ ] Complete keyboard-only and VoiceOver journeys, including permission invocation and error recovery.
- [ ] Check focus, labels, announcements, 200% text, 400% web reflow, narrow layouts, and reduced motion.
- [x] Finish six-case evaluation for the current NVIDIA Ultra default (five real inferences plus missing evidence blocked before inference); retain actual evidence/limits in [TEST_RESULTS.md](TEST_RESULTS.md). Local Ollama retains its separate three-case regression.
- [ ] Fix core usability/accessibility defects before release.

**Gate:** the whole recovery journey and its failure paths are accessible and supported by actual test evidence.

## Phase 6 — Reproducible release

- [x] Verify fresh-profile setup and actual production web/extension builds together.
- [x] Update README setup, extension-id configuration, fixture reset, model setup, licenses, and disclosures.
- [x] Update production smoke tests and CI; run workspace, build, and deterministic end-to-end gates.
- [x] Record the 1:48 working demo with real NVIDIA inference, captions and disclosed fictional instruction changes.
- [x] Prepare retrospective scope/PRD/spec/checklist and technical app map.
- [ ] Complete genuine Learn final review, learning/reflection and personal shipping activities.
- [x] Prepare public repository, GitHub video release, technical submission drafts and publication audit.
- [ ] Upload video publicly to YouTube/Vimeo for AI Basics; complete participant-written/personal answers, eligibility and final submission.

**Gate:** a new user can reproduce the release, and demo/test evidence matches the built version. Publishing and submission are not claimed until actually performed.

## Recording progress

When tests exist, save real outcomes in `docs/TEST_RESULTS.md`: phase, commit, commands, automated/manual results, evidence links, and limitations. Keep the next action in [WORK.md](WORK.md). Capture/source/recovery/resilience/accessibility cases, static/MSW sandboxes, production browser acceptance and explicit live-model evaluation are runnable. Never tick a box because a file merely exists or a mock produced the desired answer.

Native Chrome/VoiceOver, real 200% text/400% browser zoom, personal attestations and final submission remain pending. Automated checks do not substitute for them.
