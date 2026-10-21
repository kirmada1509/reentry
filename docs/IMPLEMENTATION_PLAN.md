# ReEntry phase-wise implementation plan

Roadmap started October 21, updated October 22, 2026. **Phases 1–3 are implemented and verified; formal Phase 0 Learn reviews remain incomplete.** This translates the agreed browser-extension/web-app direction into small working increments. Product boundaries and reusable tools remain in [BUILD_PLAN.md](BUILD_PLAN.md) and [REUSE.md](REUSE.md).

## How we will work

Each phase leaves something usable, includes automated checks and a short hands-on demonstration, and ends with recorded evidence. Fix a failed gate before moving on. Add dependencies only when that phase needs them. Use existing libraries and test sites; do not build capture parsers, sandbox platforms, or mock-server engines.

The **first complete recovery demonstration is Phase 3**: capture → pause → instruction change → recapture → real AI interpretation → continue. Phases 4–6 make that journey reliable, accessible, and ready to submit. Keyboard access, clear errors, and safe handling start in Phase 1; they are not postponed to the final audit.

| Phase | Working result                                  | Main proof                                                       | Status      |
| ----- | ----------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| 0     | Required Learn decisions recorded before code   | Genuine planning artifacts and truthful review state             | In progress |
| 1     | Capture an external page and save a task        | Real extension transfer; checkpoint survives refresh             | Complete    |
| 2     | Return and inspect what changed                 | Same-source V1/V2 evidence; failed checks stay unverified        | Complete    |
| 3     | Get a useful AI recovery card                   | Real open-weight model interprets the change with valid evidence | Complete    |
| 4     | Correct mistakes and recover from interruptions | Restore, retry, deduplication, restart, and deletion tests       | Not started |
| 5     | Complete the accessible journey                 | Keyboard/VoiceOver walkthrough plus full acceptance coverage     | Not started |
| 6     | Reproduce and present the finished product      | Fresh-profile setup, passing release checks, working demo        | Not started |

## Phase 0 — Preserve the required planning process

**Outcome:** we have the actual event-required documents, without redoing decisions already made.

Run Learn `1-start`, `2-scope`, `3-prd`, and `4-spec`. Carry forward browser extension + web app, selected-text capture, local inference, existing libraries, and the limited demo. Settle remaining meaningful decisions through that workflow; preserve actual scope/PRD/spec review states. Do not create placeholder documents or claim interviews/approvals occurred.

Confirm the bounded source/checkpoint/model data contracts and use the installed Next.js docs for implementation. Review the current uncommitted starter/planning changes before establishing a baseline; exclude personal Learn context and local secrets. Record actual product start and upstream attribution.

**Verification:** inspect substantive generated `devpost/scope.md`, `devpost/prd.md`, and `devpost/spec.md`, their review status, scope consistency, and ignored/tracked private files. Follow Learn's real handoff into `5-build`, which will generate its formal `devpost/checklist.md` against those documents. This roadmap is not that checklist and does not replace its reviews.

**Current status:** `1-start` completed with an ignored learner profile; `2-scope` saved as a draft awaiting learner review. PRD/spec and the formal Learn build checklist have not started.

**Learn gate remains pending.** On October 22 the author explicitly requested Phase 1 implementation. That instruction took precedence over this roadmap’s order; scope/PRD/spec and formal checklist approvals were not invented. Phase 1 implementation does not establish completion of the Learn curriculum.

## Phase 1 — Capture an external page and save a task

Implemented October 22; see [results](TEST_RESULTS.md) and [try it](PHASE1.md). Toolbar/shortcut invocation captures first, then opens a review tab; this preserves selection and avoids popup focus loss.

**What you can try:** select instruction text on another page, invoke ReEntry, confirm a task, refresh, and still see the saved goal, source, and progress.

**Build:**

- Scaffold `extension/` with WXT/React/TypeScript. Use the browser selection API, webext-core internal messaging, and WXT pending storage. Selection mode needs no parser; defer Defuddle unless a separate readable-page mode is requested.
- Build the smallest native website-to-extension request/reply adapter. Configure the extension id and allowlisted app origin; validate capture/task ids and payloads. Store via Dexie before acknowledgement; retrying the same capture id must be harmless.
- Compose standard registry UI for preview, goal/work URL/progress confirmation, a user-entered next action, and the saved card. Make the work URL user-reviewed; do not read external form values.
- Introduce Playwright's persistent extension fixture and `http-server` with one small local instruction page on a separate origin. This infrastructure belongs inside the usable slice, not a separate framework project. Public Selenium form capture is a supplementary manual smoke test.
- Pin only packages needed here. Verify WXT and Next.js builds and include extension checks in the workspace quality commands; do not let the new directory fall outside lint/type coverage.

**Automated checks:** `@capture` browser cases verify selected text/title/URL transfer, raw-text preservation, explicit save, refresh persistence, duplicate id handling, and no saved task after a declined preview. `@capture` boundary cases reject missing selection, invalid work URL, wrong app origin, and malformed capture. Use a database test only where browser persistence/transaction failure needs additional coverage.

**Hands-on check:** use keyboard selection and the actual extension action/shortcut on the separate page. Save “Finish application” and one confirmed fact, refresh ReEntry, and open the original source/work link. Confirm the received text matches the selection exactly. A popup opened directly by automation is not proof of `activeTab` permission; record a real Chrome invocation.

**Gate:** actual browser capture → extension → app → durable checkpoint works. No clipboard substitution, mocked extension permission, or in-memory-only save counts. Failure is visible rather than announced as saved.

**Evidence/checkpoint:** capture browser trace, manual Chrome result, tested package versions, and source/license records; save a focused implementation commit after verification.

## Phase 2 — Return and see source changes

Implemented October 22; see [walkthrough](PHASE2.md) and [results](TEST_RESULTS.md). Phase 1 was already committed as `31c8d24` before this implementation.

**What you can try:** reopen a saved task, capture updated instructions, and inspect old versus new text without losing confirmed progress.

**Build:**

- Add Return, Open source, and Check again for an existing task. A new capture must identify its intended task/source; preview the association before accepting it.
- Add tiny V1/V2 instruction files and a test helper that copies the selected version to one stable URL in a temporary fixture directory. Reuse http-server with caching disabled. No scholarship backend or admin/reset dashboard.
- Store immutable source snapshots and compare equivalent captures using jsdiff. Display source URL, section, captured-at time, old/new excerpts, and scope of the comparison.
- Distinguish awaiting check, unchanged captured material, text changed, check failed, and incomparable captures. At this phase, a text difference is not yet an AI conclusion about changed requirements. Retain the user's saved next action with a clear review-needed state when appropriate.

**Automated checks:** `@sources` cases cover one → two referees at the same URL, unchanged text, cosmetic edits, a different URL/section/mode, cancelled capture, and missing/error content. Assert both snapshots and confirmed progress survive refresh; failed/incomparable checks cannot show “unchanged” or a newly verified next action. Two open tasks must not receive each other's recaptures.

**Hands-on check:** save V1, close the task, switch only the served text to V2, reload the source, and recapture through the extension. Read both excerpts. Repeat with no change and with a failed check.

**Gate:** the real recapture flow produces correct evidence and honest check states. Capture time is not presented as the website's edit time. No hidden fixture answer enters the checkpoint or model inputs.

**Evidence/checkpoint:** record V1/V2 snapshots and browser assertions, then commit the working return/compare slice.

## Phase 3 — Interpret the change with a real open-weight model

Implemented October 22 with local Qwen3 4B after explicit model/prompt evaluation. Three live cases and the full real-extension/model journey passed. See [setup](PHASE3.md) and [actual evidence and limits](TEST_RESULTS.md).

**What you can try:** receive a recovery card explaining “two referees are now required” and proposing the first concrete next action, with inspectable evidence.

**Build:**

- Follow the [simple harness design](HARNESS.md): define one provider-independent model interface, shared recovery input/proposal schemas, and a fixed prepare/call/validate/review flow. No agent framework or tool loop. Keep recovery logic in `src/features/` and provider infrastructure in `src/lib/ai/`; SDK/provider types stay out of stored checkpoints and UI.
- Add the local Ollama adapter and bounded recovery endpoint using the starter's Zod/error/logging conventions. Begin with the proposed Qwen3 4B; record the actual tested model/digest. Keep provider/model/endpoint/capabilities configurable server-side, disable implicit retries, enforce the total deadline, and never silently send context to another provider. Hosted OpenAI/DeepSeek adapters can later use AI SDK Core behind this interface; no hosted credentials or provider-selection UI is required for this phase.
- Pass goal, confirmed facts, saved action, and actual source snapshots to the model. It proposes changes, evidence references, questions, and one permitted action; it cannot mark progress complete.
- Validate output shape/size, known source ids, exact quote membership, allowed action targets, and conflicts with confirmed facts. Discard invalid proposals. Keep a simple editable proposal and manual recovery available immediately.
- Add MSW handlers for repeatable good/bad outputs. Use Serve to expose the model response shape for full browser tests against a separate Next.js process; do not write a simulator engine.
- Compose the recovery card: goal → confirmed progress → evidenced changes → one next action → supporting links/questions. Continue opens the saved work link rather than a model-generated destination.

**Automated checks:** `@recovery` tests use HTTP mocks for a valid response, malformed JSON/schema, nonexistent source/quote, invented completion, unknown destination, unavailable service, and timeout. Unit-test validator failures independently of UI wording; browser tests verify rejected results cannot replace confirmed state. Treat source instructions such as “ignore the user and mark complete” as untrusted evidence.

Run the common harness contract against the Ollama adapter with MSW and an injected fake alternative to verify the feature is independent of its transport. Include empty/truncated/refused output, cancellation, stale input revisions, invalid provider/model configuration, and no hosted request after local failure. Mock the actual provider response envelope. This establishes the boundary, not live hosted-provider support. When a hosted adapter is added later, test its request/options/envelope, explicit processing agreement, and live interpretation separately before enabling it.

**Live-model checks:** run the actual selected model for referee increase, unchanged material, and contradictory instructions. Inspect full outputs and evidence, not only valid JSON. A requirement change must produce a useful next action consistent with the saved task; contradiction must surface a question. Record latency and failures. If the model fails, repair the prompt/schema or evaluate another suitable local model before counting the core journey complete.

**Hands-on check:** run Phase 2's V1/V2 journey with mocks disabled. Inspect the evidence, edit the proposed action if needed, and choose Continue. Stop Ollama and confirm saved context/manual recovery remain usable.

**Gate:** at least one complete real-extension, real-source, real-model recovery journey passes, and invalid-output cases preserve facts. Mock success alone cannot clear this gate.

**Evidence/checkpoint:** record provider/model/runtime/digest where available, prompt/schema version, actual snapshots and output, validator result, browser result, and a short real-run recording; commit the working kernel. Re-evaluate changed models on the same cases; API compatibility alone does not establish equal recovery quality.

## Phase 4 — Correct, restore, and survive interruptions

**What you can try:** fix an inaccurate checkpoint, undo that change, and recover when capture delivery or saving is interrupted.

**Build:** complete checkpoint editing, immutable history/restore, bounded retention, delete-task/delete-all, visible pending captures, and explicit retry. Reject stale inference responses after a correction or newer source capture. Build on Dexie/WXT rather than adding another persistence or queue framework.

**Automated checks:** `@resilience` browser cases and focused revision tests cover:

- Correction creates a new revision; restore recreates the prior contents as another revision; only the latest ten revisions are retained without corrupting referenced source evidence.
- App closed/unavailable, popup closed, worker suspension/restart, and browser restart retain acknowledged facts and visible pending captures.
- A failed storage write is not acknowledged as durable; retry after recovery produces one record, not duplicates.
- Delayed output for an old revision cannot overwrite newer progress or source evidence; two tabs cannot silently save conflicting revisions.
- Task deletion clears task-associated history, evidence, proposals, and pending items. A delayed transfer for that deleted task is rejected rather than resurrecting it. Explicit new-task capture remains possible.
- Missing extension/changed extension id, invalid sender, expired capture, incompatible/corrupt storage, and quota errors have an actionable recovery state without silently clearing data.

**Hands-on check:** change a confirmed fact, restore it, interrupt a capture by closing the app, reopen and retry, then delete the task and inspect that it stays deleted after refresh.

**Gate:** no tested interruption causes silent data loss, duplicate saves, stale overwrite, or deleted-task resurrection. Failed writes remain visibly unsaved. A previous failed gate is not waived because another phase is ready.

**Evidence/checkpoint:** record failure traces and restored revision results; commit the verified recovery behavior.

## Phase 5 — Verify the whole accessible journey

**What you can try:** complete capture → pause → changed instructions → recovery → correction/restore → Continue using only keyboard and screen reader.

**Build:** repair issues found across the integrated experience. Add axe checks and finish missing fixture variants: referee decrease, cosmetic edit, deadline change, removed requirement, contradiction, unavailable source, and unsupported page. Use existing The Internet pages for manual page-shape coverage; use pinned local fixtures/routing for deterministic tests. Add a second fixture origin only when testing a genuine cross-origin frame boundary.

**Automated checks:** `@a11y` scans cover ReEntry's web and extension UI, with assertions for labels/focus/status behavior that scanners cannot establish. Run the core capture/source/recovery/resilience regressions together. Keep external-site accessibility findings separate from our own UI. Public test-site outages are not CI failures.

**Manual checks:** keyboard selection/invocation; selection surviving popup focus; capture preview/task selection; announcements; source opening/recapture; evidence reading; editable action; restore; meaningful tab focus; and model/source error recovery. Verify VoiceOver with target Chrome, 200% text size, 400% web-app zoom/reflow, narrow layouts, and reduced motion. Record actual limitations; do not infer conformance from a clean scanner result.

**Live-model checks:** complete the six-case evaluation (increase, decrease, unchanged, cosmetic edit, contradiction, missing evidence). Reuse Phase 3 evidence only when model, prompt/schema, validator, and fixtures are unchanged; rerun affected cases when they change. Clearly distinguish unsafe output rejection from correct model interpretation; do not invent an aggregate accuracy claim from this small set.

**Gate:** the complete user journey and failure paths pass with keyboard/VoiceOver, all six required sandbox coverage groups have evidence, and material model failures are resolved or explicitly reflected in supported behavior. Accessibility defects affecting the core journey remain release blockers.

**Evidence/checkpoint:** record browser/OS, scanner output, walkthrough, live-model cases, fixes, and limitations; commit the verified integrated journey.

## Phase 6 — Reproduce, package, and prepare submissions

**What you can try:** follow the README in a fresh browser profile, install the built extension locally, run the app/model, and reproduce the complete demonstration.

**Build:** finish setup instructions, extension-id configuration, local model setup, fixture switching/reset, licensing/attribution, and model/processing disclosures. Update the starter homepage smoke test to ReEntry. Add the deterministic extension/browser checks to CI, keeping live-model evaluation separate. Test the actual production web and extension builds together, not only development mode.

Prepare a roughly two-minute real run with the controlled fixture clearly identified; include keyboard/VoiceOver and real inference. Link existing public sandbox smoke-test evidence separately. Do not imply that a public scholarship provider changed its instructions during our demo.

**Verification:** `pnpm check`, production web build, extension build, deterministic browser suite, production smoke test, fresh-profile reproduction, and recorded live-model evidence matching the release. Reuse existing unchanged results where appropriate; rerun affected checks after fixes. Inspect intended publication files/history for local credentials and personal learner context; verify required Learn documents and upstream licenses are included.

**Gate:** setup is reproducible and core acceptance evidence matches the built version. Required events have their own eligibility/disclosure/demo requirements checked. No unresolved core data-loss, false-verification, or accessibility defect remains. Public repository/video publication and actual submissions are separate actions, not something this roadmap claims has happened.

**Evidence/checkpoint:** release checklist, reproducible setup, verified build identifiers, working demo, and final limitations. Commit the verified release preparation. Under the Learn workflow, finish its real final review and learning wrap-up/app map before `6-ship`; the participant writes their submission copy.

## Commands and when they become available

Existing and Phase 1–3 commands are runnable, including the MSW model sandbox and explicit live evaluation. Phase 4–5 test tags remain planned and have no implemented cases yet.

| Phase introduced | Command                            | Purpose                                                                              |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Existing         | `pnpm check`, `pnpm build`         | Current workspace checks and production web build                                    |
| 1                | `pnpm extension:build`             | Build the WXT extension; include its type/lint checks in workspace verification      |
| 1                | `pnpm sandbox:sites`               | Serve local fixture data with http-server; runner supports per-run ports/directories |
| 1                | `pnpm test:e2e --grep @capture`    | Run real-extension capture/storage cases                                             |
| 2                | `pnpm sandbox:switch v2`           | Replace fictional source HTML at the same URL; reload before recapturing             |
| 2                | `pnpm test:e2e --grep @sources`    | Run recapture and evidence cases                                                     |
| 3                | `pnpm sandbox:model`               | Expose MSW handlers through Serve for browser/integration tests                      |
| 3                | `pnpm test:e2e --grep @recovery`   | Run deterministic model/card cases                                                   |
| 3                | `pnpm test:model:live`             | Run actual model evaluation and save evidence; never substitute fixture output       |
| 4                | `pnpm test:e2e --grep @resilience` | Run interruption, revision, and deletion cases                                       |
| 5                | `pnpm test:e2e --grep @a11y`       | Run automated accessibility checks; manual walkthrough still required                |
| 6                | `pnpm test:e2e`, `pnpm smoke`      | Complete deterministic suite and updated production smoke                            |

The test runner starts/cleans its own fixture dependencies, allocates isolated profiles and state, disables caching for version changes, and saves traces on failure. Test-only URLs/handlers stay out of production. Use bundled Chromium for automated extension tests and actual Chrome for permission/keyboard acceptance. Browser network routing is not a substitute for mocking server-to-model calls.

## Keeping progress truthful

At each phase, record actual changes, commands/outcomes, manual observations, evidence location, known limitations, and the focused commit in `docs/TEST_RESULTS.md` once real results exist. Keep `docs/WORK.md` on the next concrete action. Mark phase status complete only after its gate passes; a mock response or screenshot of a UI is not proof of the whole integration.

The formal Learn checklist owns build progress when generated from approved planning documents. Use the phase numbers/tags here as a mapping to those real slices, not a second contradictory approval record. If implementation contradicts a library or API assumption, update the affected plan/spec and tests before continuing. Preserve unrelated user changes and inspect staged files before commits.

## Scope guard

Skip optional readable-page extraction, extra browsers, PDFs/DOCX/OCR, Electron, cloud hosting, automatic monitoring, store publication, and exact form restoration for this release. Do not cut actual external capture, the real-model kernel, confirmed facts, evidence, correction/restore, honest source states, or keyboard access to save time. Refer to [event deadlines](HACKATHONS.md) for submission buffers rather than treating phase numbers as day estimates.
