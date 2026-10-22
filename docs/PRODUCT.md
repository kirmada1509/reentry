# ReEntry product brief

Updated October 22, 2026: capture, persistent checkpoints, source comparison and the Phase 3 AI recovery flow are implemented using existing open-source tools. Verification status and limits are in [TEST_RESULTS.md](TEST_RESULTS.md). Revision/draft/deletion resilience and automated accessibility/production acceptance are now implemented. Native accessibility and final submission gates remain pending. Original intent: [reentry.md](../reentry.md). This brief is planning input, not a substitute for the required Learn documents.

## Outcome

- Product: ReEntry, an accessible recovery card for interrupted work.
- Person: a student with ADHD, working-memory difficulties, or frequent interruptions. No clinical efficacy claims.
- Situation: returning to a scholarship application after its instructions changed.
- Complete journey: capture selected instructions on an external page → confirm transcript progress and save the work link → pause → requirement changes from one referee to two → explicitly recapture that section → inspect the evidenced change → reopen the external application.
- Demo revelation: check that the saved intention remains valid before offering the next step.

## First release

- Must work: user-invoked selected-text capture through a Chrome extension; reliable transfer to the web app; material/work links; explicit progress confirmation; persistent checkpoints; user-triggered recapture and comparison; actual open-weight interpretation; evidence inspection; correction/restore; one continuation action.
- Required testing coverage uses existing Selenium/The Internet pages, Playwright, MSW/Serve, and axe. Keep deterministic local copies/fixtures for CI; create only the missing before/after instruction text. No custom scholarship application, mock-server engine, or sandbox platform. See [required sandboxes](BUILD_PLAN.md#required-testing-sandboxes) and [reuse choices](REUSE.md).
- Deferred: Electron, continuous/background monitoring, automated full-page scraping, exact form-field restoration, form autofill/submission, desktop/PDF/iframe capture, real file uploads/OCR, email/calendar integrations, accounts, cloud sync, vector search, chat, and autonomous actions. Readable-page extraction is an optional explicit capture mode, not a replacement for an empty selection.
- Success: after refresh, confirmed progress remains; actual extension recapture sees one referee change to two, with old/new excerpts and the first referee as the next action. Continue reopens the saved application link. The external application owns its form state; exact field focus is not promised.
- Failure: if recapture fails or the selected section cannot be compared, say requirements could not be verified. An unchanged selection means only that captured section is unchanged. If inference fails, preserve the checkpoint and offer manual review. Never promote AI claims to completed work.
- Proposed platform: WXT Chrome Manifest V3 extension plus the starter's Next.js/React/TypeScript/Zod web app. Reuse WXT storage/messaging wrappers, Dexie for IndexedDB, jsdiff for text differences, and Defuddle only when readable extraction is needed. Use a [simple, provider-independent harness](HARNESS.md), starting with local Ollama and an evaluated open-weight model; Qwen3 4B is a candidate, not a product dependency. OpenAI/DeepSeek connections can be added later behind the same boundary, without changing the recovery journey. Verify native website-to-extension messaging early; replace the old custom HTTP handoff queue design. No sponsor integration is required.
- Data: task goal, user-reviewed work/material links, selected-text snapshots with source/section/time, confirmed facts, ten checkpoint revisions per task, and bounded pending capture transfers. Do not capture external form field values. Delete-task/delete-all covers associated pending transfers too. Browser storage is not an encrypted vault or backup; failed writes remain visibly unsaved.
- Demo instruction pairs are explicitly fictional and served separately from ReEntry using an existing static server. Reuse a generic Selenium form or licensed derivative as the work destination. “Transcript attached” is a user-supplied confirmation, not a verified upload. Public test sites are supplementary smoke tests, not controllable scholarship systems.
- Demo presentation update (October 22, requested by the author): the manual sandbox is now a fictional Northstar scholarship portal composed from existing official registry components. It has an award overview, requirements, an explicitly saved browser-local application draft, a simulated transcript attachment and referee fields. Scenario switching preserves the same source URL and the saved application draft. It remains external test equipment, with no accounts, real uploads, submissions or backend. Small bare instruction fixtures stay in the automated regression suite. Acceptance includes actual extension capture/recapture and continuation into the retained portal draft, plus storage-failure, source-failure, keyboard, axe and narrow-layout checks. See [demo walkthrough](SANDBOX.md).

## UI plan

- Registry reference: included official empty-demo for the initial empty state; replace its demonstration controls with real actions.
- Compose installed Card, Alert, Badge, Button, Label, Input, Textarea, Dialog, Separator, Skeleton. Add Checkbox/Collapsible through the official registry only if needed.
- Screens: extension capture preview/status; task library (start/open task); checkpoint editor (confirm/save); recovery card (check source/continue); evidence/editor (save correction/restore). The application form lives on the external site.
- States: empty/no selection; unsupported page; capture preview; app unavailable/pending delivery; saving; awaiting recapture; checking; unchanged section; material change; unverified/incomparable source; model unavailable; invalid output; storage failure; complete.
- Recovery reading order: goal → confirmed progress → changes → one next action → materials/questions. Calm single-column layout, standard variants, plain copy, details on demand; no timer or required animation.
- Accessibility: descriptive labels/headings/landmarks, visible focus, keyboard-only controls, focus restoration, restrained live announcements, 200% text size, 400% zoom/reflow, narrow screens, reduced motion, and manual VoiceOver verification. Automated checks do not establish full conformance.

Select standard components and default variants. UI planning is welcome; writing a new visual component library is outside the default scope.

## Operations

- Initial environment: Chrome with unpacked extension and Next.js server on this computer; inference can use local Ollama or the implemented [NVIDIA-hosted option](NVIDIA.md) after explicit processing agreement. Public demo video and reproducible local setup are the submission route. Cloud hosting and store publication are deferred.
- Readiness: capture permission, app/extension-id configuration with sender/origin validation, Dexie persistence, and comparable source captures. Report model availability separately so manual recovery still works.
- Events: fixed event names for checkpoint save, check outcome, and inference outcome. No task text, source bodies, personal materials, or model prompts in telemetry.
- Cloud logs: disabled initially. No automatic remote inference fallback. NVIDIA-hosted inference requires explicit agreement to sending task context to the named model/provider, with credentials kept server-side. The local Ollama route remains available; future hosted providers require their own evaluation and agreement.
- Authentication: no user accounts for the single-user local prototype; allowlist native website messaging, validate the exact app origin/port and capture/task identifiers, and acknowledge only durable storage. A hosted multi-user version requires a new storage/authorization design.
- Side effects: checkpoint changes are user-confirmed; no application submission, referee contact, email, or publishing from the product.

## Delivery

- Done: real external-page capture/recapture, reliable transfer, persistent checkpoints, real local-model recovery, evidenced changes, correction/restore, passing required sandbox cases, verified accessible journey, public licensed repository, and working demo video.
- First deadline: Task Forge, October 25 at 02:30 IST; target completion/submission October 24 evening.
- Owner: project author; eligibility and event registration remain their responsibility.
- Execution: follow the [testable phase plan](IMPLEMENTATION_PLAN.md). Phases 1–3 implement capture, persistence, source comparison and real local AI recovery. The author requested implementation before formal Learn reviews were complete; those reviews remain pending, not retrospectively approved; the first complete live-model recovery demo is Phase 3, followed by resilience, accessibility, and release gates. See [build plan](BUILD_PLAN.md) and [event checks](HACKATHONS.md).
