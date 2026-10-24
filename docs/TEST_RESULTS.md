# ReEntry verification evidence

## Automatic entry points and assignments — October 24, 2026 (IST)

Normal home/toolbar now open automatic tasks. The manual library moved to `/checkpoints`, old capture bookmarks redirect to the companion, and selected-text capture is explicit Manual tools. Existing browser data is preserved. Moodle-style assignment links retain only their numeric ID; host-pinned resource identity separates same-name assignments. Recognised pending/draft submission tables permit assignment intent; other pages cannot acquire this intent from model output. First-seen submitted assignments are ignored before inference.

Verification on this update:

- `pnpm check` passed **194 tests / 26 files**, formatting, lint, both type checks, registry provenance, credential patterns and context checks. The 1,002-write retention case twice exceeded the default five-second timeout during full-suite disk contention while passing alone in about one second; it now has a bounded 15-second allowance, retaining every real write and assertion.
- The full production browser regression passed **67 / 3 intentional skips**. A prior run failed one application receipt because expanded guidance exceeded the unchanged 32 KB input limit; an interrupted run was superseded. Compact guidance and a captured-context budget test address that failure.
- Final `agent-3.7` production acceptance passed **4/4** toolbar/assignment/application cases, including the host-ignore case and correct ID/token-free return URL. After updating portal guidance/manual-tool placement, **5/5** portal/application cases passed. The production commerce regression passed **2 / 2 intentional skips**. These browser runs use deterministic model transport; Chrome observation, pairing, permissions, storage, navigation and delivery are real.
- Default-origin extension/web builds and managed production restart passed. HTTP smoke verifies the new home redirect, automatic page, preserved manual library, health and request IDs. The focused publication audit passed.
- Actual NVIDIA development replay with final `agent-3.7`: **9/9** application/shopping progress cases passed; **5/5** assignment outcomes passed (**four accepted model decisions plus one host-ignore with no inference**). No failed jobs occurred in either final replay. The assignment flow includes automatic pending discovery, saved draft, separate same-name assignment IDs, matching submission completion and no first-seen submitted obligation. These are fictional contexts in disposable stores, not a private Nalanda walkthrough or universal website accuracy.

[Every trial, denominators and report hashes](evidence/agent-assignments-nvidia.json) retains the earlier failures. `agent-3.6` initially misclassified an award application as an assignment, causing the progress cohort to pass only 4/9. Restricting assignment intent in both the request schema and host validator fixes that regression in the final replay. An already-submitted first visit also elicited an invalid completion proposal; it was rejected without creating a task. The initial assignment scorer incorrectly called that outcome passing solely because no task appeared. The scorer now requires a valid outcome, and the host skips first-seen submitted assignments before spending an inference call. The raw report is preserved and its effective score is corrected in the public ledger.

The earlier frozen 25-step Phase 6 corpus has **not** been replayed with agent-3.7. Its 23/25 result below belongs to the released agent-3.4 snapshot. Native VoiceOver, permission-dialog decisions, actual private Nalanda behavior and human submission/Learn gates remain open. Generic other-work completion requires user review; inferred deadline scheduling is not implemented. See [setup, demo and boundaries](AGENT_ASSIGNMENTS.md).

## Automatic-agent Phase 6 — October 24, 2026 (IST)

**Final current replay:** all 25 steps attempted without provider unavailability, **23/25 passed**, regression **10/10**. Discovery errors 0/12; wrong merges 0/1; accepted false completions **0/26**, none unverifiable. The host rejected two unsafe proposals after cancellation/from an old receipt. The strict command exits **1**, so an all-passing model-quality claim remains open. There were 24 calls/24 jobs plus one scripted correction; empirical median 2,507 ms, p95 5,215 ms, summed step work 66,105 ms excluding 60-second pacing. [Summary and every denominator](evidence/agent-phase6-summary.json). These are exposed-cohort results.

The frozen `agent-release-v1` corpus was committed before the first inference: five fictional traces, 25 steps, 24 model jobs and one scripted correction. Ten steps are regression cases and fifteen were held out from these development tests on the first run. Later replays are exposed-cohort trials. Synthetic observation timestamps advance nine seconds; job latency uses the real clock. Expected labels and evaluator role bindings stay outside model inputs.

The baseline passed 21/25 steps with discovery errors 0/12, wrong merges 0/1 and zero accepted false completions across 26 negative checks, with none unverifiable. Three unsafe completion proposals were rejected; one changed-requirement update had the right action but the wrong progress category. The 3.1 replay passed 22/25. The 3.2 replay regressed to 18/25 with four unverifiable negatives. Current-prompt trials initially encountered HTTP 429; incomplete reports retain their actual denominators and are not an all-pass safety result. [Every release-cohort trial](evidence/agent-phase6-nvidia.json) and [affected reader/progress regression attempts](evidence/agent-phase6-provider-regressions.json) are retained. See [current provider status](AGENT_RELEASE.md).

Actual full-page application trials exposed format problems: a diagnostic response cited 24 real spans, and another used a summary longer than 240 characters. The host now validates every reference in a bounded list of up to 80 before retaining three. A fabricated tail rejects the entire proposal. One summary-only shortening request can run only after all other fields/citations validate; it consumes the same durable three-call budget and cannot change completion permission. Tests cover malicious tails, exhausted budgets, provider failure, injected extra repair fields, revoked agreement and stale context. No new provider, website action, credential in the client or dependency was added.

The successful current-prompt browser takes are **application-9** and **shopping-2**. Each has five accepted model jobs, zero operator retries/corrections and a separate full-browser restart check preserving task identity/revision. Application uses six model-call reservations (one prose repair); shopping uses five. Earlier failed takes and setup failures remain in the [browser trial ledger](evidence/agent-phase6-browser-trials.json). Original responses before diagnostic capture are unavailable; no retrospective cause is invented for those failures.

- Application MP4: **83.88 seconds**, 1280×900; saved draft, real brief tab switch/waiting-resume, changed second-referee requirement, validation failure, final review, fresh fictional receipt and saved evidence/history.
- Shopping MP4: **73.88 seconds**, 1280×900; tentative research, cart intent, real brief interruption/resume, validation failure, final review and matching sample-shop receipt.
- Both videos are uncut and unaccelerated, have eight SRT/VTT caption intervals and no audio. No task/model output is seeded. Browser viewport recording does not establish native side-panel behavior. The 45-minute reminder threshold is not demonstrated.
- Visual checks inspected frames from the actual MP4s. Screenshots: [application](evidence/agent-phase6-application.png), [changed instructions](evidence/agent-phase6-changed-requirements.png), [shopping](evidence/agent-phase6-shopping.png). All page data is fictional or the sample site's published demonstration content. Raw traces, browser profiles, keys and bearer credentials remain private/ignored.

`pnpm check` passed **185 tests across 25 files**, formatting/lint, web/extension types and all project guards. The complete production root browser suite passed **65 cases with three intentional live/recording skips**. Commerce passed **two cases with two intentional live/recording skips**. Both selected explicit NVIDIA recordings passed separately, including restart. A fresh local clone of committed source `7b7b326` passed frozen-lock bootstrap, all then-current 183 tests, extension build and web build. It contained example-only configuration, no copied configured credential, learner profile or agent database, and a clean tracked checkout. The later publication-audit path/missing-directory regression adds two tests without changing application behavior. [Hosted implementation CI passed on 2233791](https://github.com/kirmada1509/reentry/actions/runs/40036866545): 185 project tests, 65 root browser cases, two commerce cases and HTTP smoke. Publication audit passed with 721 history blobs, tracked files, built browser assets and the explicit distribution directory. Final documentation/evidence CI is checked separately; [selected verification](evidence/agent-phase6-verification.txt) records the sources.

Default-origin `pnpm local:start` rebuilt both surfaces and restored the managed production app at http://127.0.0.1:3000; final HTTP smoke passed. Reload the unpacked extension and refresh existing tabs.

The final native inventory again reported a locked Mac and failed automatic unlock; no native browser session was accessible, and the in-app browser had no tabs. An existing authenticated video-upload session could not be accessed. Native VoiceOver, native side-panel placement, actual browser zoom/text settings, optional-permission prompts and OS banners remain unperformed manual gates. Automated checks do not establish conformance. Human correction frequency, time saved and cognitive benefit were not measured. Learn reviews/reflections, registration/eligibility, public YouTube/Vimeo upload and actual submissions remain outstanding.

## Automatic-agent Phase 5 — October 24, 2026 (IST)

The live `/observe` page and extension companion now put production tasks/next actions before setup and diagnostics. [Behavior, screenshots and limits](AGENT_CALM.md). No model prompt, inference input, provider adapter or completion validator changed.

- `pnpm check` passed **167 tests across twenty files**, formatting/lint, web and extension types, registry provenance, focused secrets and context guards. New cases cover coalesced reads, stale responses after mutation/clear/disposal, focus-aware presentation, immediate deletion removal, real immutable ten-revision history, stale/malformed/unauthorized history access, deletion and the 100-task capacity boundary without evicting saved work. Existing call/tool budgets, retention, replay, persistence and reminder tests remain in the suite.
- The complete local production web/extension run passed **64 cases**, with two intentional live/demo skips and one new test-fixture failure. Playwright emulates document focus in every headless tab, so bringing another tab forward alone did not make the app unfocused. The fixture now disables that emulation for its background assertion; the foreground assertions still require a focused document. **All six affected task/calm journeys passed** after that correction, using fresh production web/extension builds. Hosted CI reruns the complete suite and is reported separately at handoff.
- New production acceptance uses fictional stored task records, including six cards and maximum-length unbroken content. It verifies stable content/order/position and zero focus/scroll events during a focused background update; explicit review and background updates; no toast; delayed reads after corrections and clear; failed clear preserving data; inline validation and typed drafts; actual history; keyboard dialog activation/Escape and focus restoration after human finish. Axe, 320px reflow (400%-equivalent from 1280px), simulated 200% text and computed reduced-motion dialog/overlay styles pass on both surfaces. No axe rule is disabled. [Selected evidence](evidence/agent-phase5-verification.txt).
- The manual capture/recovery release remains available. The ordinary automatic journey requires no checkpoint form. Revision history for automatic tasks is read-only; automatic restore is not claimed. A correction takes precedence while its retained progress/source quotes remain labelled as interpretations/evidence.

Commerce passed **two cases with one intentional live skip**. Default-origin production web/extension builds and HTTP smoke passed, and the managed app was restored at http://127.0.0.1:3000. Publication/CI are reported separately at handoff. Native Chrome attachment timed out: VoiceOver speech/navigation, native side-panel placement and actual browser zoom/text settings remain **unperformed manual gates**. Optional permission approval and visible OS banners remain open from Phase 4. No fresh NVIDIA accuracy/latency result is claimed; Phase 3 actual-provider results and retained failures remain below. Phase 6 is the next evaluation/demo slice.

## Automatic-agent Phase 4 — October 23, 2026 (IST)

Local return links, interruption/return summaries, explicit waiting, one-hour snooze, per-task cancellation and opt-in Chrome reminders are implemented. [Setup, policy and privacy/delivery limits](AGENT_REMINDERS.md). The model contract and provider inputs are unchanged; website deadline scheduling is absent.

- `pnpm check` passed **158 tests across nineteen files**, formatting/lint, web/extension types, registry provenance, focused secrets and context guards. Fifteen policy/store cases and eight external-delivery-boundary cases cover default-off/45-minute threshold, brief switches, activity/return, timezone/DST/quiet hours, local-day cap, waiting/snooze/cancel, terminal/dismiss/delete, session/consent/permission absence, URL minimization/forgery, conflicting settings, transaction rollback, ambiguous crash/ack outcomes, safe generic text and last-moment cancellation. A route integration case also verifies bearer/schema rejection and request IDs for the new delivery controls.
- Complete production Chromium regression passed **61 cases, with two intentional live/demo skips** before final dialog-scroll and transaction hardening. Both new browser journeys passed: safe return URL/continuation, waiting/resume/snooze/cancel, policy persistence/restart, request-denial and cancellation boundary stubs, axe, one daily real Chrome API notification and cleanup on human finish. Both new reminder journeys passed again after final hardening, including real dialog bounds, readable time controls and footer access at 320×640. Four existing task/progress journeys passed during hardening. Commerce passed two with one explicit live skip. Default-origin production web/extension builds and HTTP smoke passed, with the managed app restored at http://127.0.0.1:3000. Publication/CI are reported separately at handoff.
- Headless notification acceptance uses a **disposable copy** of the production extension bundle with test-only predeclared notifications/idle permissions. Production assets/manifest and actual user profiles are untouched; the default manifest still has optional permissions and starts successfully with those namespaces absent. Native grant/deny approval and visible OS banners remain unverified. The actual Chrome alarm/notification API records, daily reservation and extension attempt ledger are checked across a real browser restart. Removing its check alarm before restart verifies reconciliation. The 45-minute wait is accelerated only in the test-owned SQLite activity fixture; no production clock override exists.
- Development found that registering a notification listener before optional permission exists throws because Chrome omits the namespace entirely. Listener installation now follows permission grant, with a regression covering absent namespaces. Lost delivery acknowledgements do not claim a successful Chrome create failed. Closing settings during a pending permission choice invalidates the pending save. Recovery reads and last-moment eligibility checks now read fresh authoritative tasks/settings inside SQLite transactions. A pending path lookup is retained through delayed AI discovery, so leaving before the model finishes does not silently lose the return link; the new regression also checks deletion cleanup.
- A short-screen check reproduced the expanded dialog starting **198px above** a 320×640 viewport despite passing axe. It now uses the official registry's scrollable-dialog layout (`max-h-[70vh] overflow-y-auto`), without new CSS or changed vendor assets. The guard permits only those two additional layout utilities; browser acceptance checks actual dialog bounds and reaches its footer by scrolling. Finite registry animations settle before contrast scans; no contrast rule is disabled.
- No NVIDIA evaluation was repeated: inference prompts, source references, decision schemas, model adapters and completion validation are unchanged. Existing Phase 3 actual-provider evidence and its retained timeout remain below. This phase's timing decisions are deterministic and cannot be delegated to website/model text.

Native Chrome permission approval, desktop banners, VoiceOver/side-panel placement and actual browser zoom/text checks remain manual gates. Browser/device/server absence can miss/delay reminders; ambiguous attempts are not retried that day. The page-path association can be coarse for shared/query-driven pages, and opening a path does not restore external form state. No universal website support, deadline interpretation or guaranteed notification delivery is claimed.

## Automatic-agent Phase 3 — October 23, 2026 (IST)

Evidence-linked progress, changed-requirement reconciliation, bounded confirmation proposals, explicit human finish, reopening and deletion are implemented. [Setup, rules and limits](AGENT_PROGRESS.md). Reminders remain Phase 4.

- `pnpm check` passed **134 tests across seventeen files**, formatting/lint, web/extension types, registry provenance, focused secrets and context guards. Default-origin production web/extension builds and HTTP smoke passed; Northstar static assets were rebuilt. Commerce passed two cases with its separate live-provider case intentionally skipped.
- Upgrade acceptance also resumes an expired Phase 2 in-flight job whose saved task snapshot lacks the new progress field. Snapshot reads now apply schema defaults before model input, preserving the same task ID and creating one next revision. `pnpm check` passed 134 tests after this compatibility fix; the rebuilt default app and HTTP smoke passed again.
- Deterministic unit/graph checks cover application and purchase progress, restart and idempotent confirmation, failed writes with explicit retry, conflict protection, human versus observed finish, task/history deletion and delayed recreation. Negative cases include submit attempts, payment/validation failure, cancellation, wrong-tab and named unrelated receipts, known old receipts, delayed delivery, negated success, forged checkpoint metadata and injection. A failed submission cannot become a confirmation anchor.
- The complete production browser run passed 58 cases with two intentional live/demo skips and one deterministic-model grouping failure. That fixture had relied on a goal still containing “Cedar” after a user correction; it now uses retained evidence too. All four affected production task/progress journeys passed after the fix, including the complete Northstar draft → changed instructions → validation → review → receipt → restart journey, failed receipt storage, correction/session conflicts, human finish/reopen and a deletion conflict announced inside its dialog. Axe and 360px reflow passed. Hosted CI reruns the complete set and is reported at handoff.
- The actual reused shop → production extension/backend → NVIDIA journey passed in 1.5 minutes, from research through cart, validation failure, final review and fresh matching confirmation, with app/companion tabs closed. Browser restart retained the completed task ID/revision. All five decisions were accepted with **zero operator retries** in final trial 8. Earlier rejected trials and their synthetic snapshots remain in [live evidence](evidence/agent-phase3-shop-live.json); selected actual event/runner output is [recorded separately](evidence/agent-phase3-shop-live.txt). No real order or payment occurred.
- Final synthetic progress evaluation passed **9/9**. The expanded actual-reader/inference cohort passed **9/10**, retaining a 45-second review timeout; its subsequent generic-receipt decision correctly recovered the review from history and completed the task. A separate explicit real-provider review replay passed. This is a successful recovery plus an availability limitation, not a clean 10/10 cohort. Earlier model/provider failures and all cohorts are retained in [model evidence](evidence/agent-phase3-nvidia.json) and [diagnostic replays](evidence/agent-phase3-replays.json). NVIDIA has no automatic retry/fallback.
- Actual reader output exposed two contract issues: a valid ten-reference proposal exceeded the old eight-reference cap, and the model sometimes echoed current checkpoint IDs/times. The host now checks up to sixteen references while retaining three quotes, and accepts redundant metadata only when it exactly matches the observation, then stores its own values. Unknown references, forged metadata and extra completion fields remain rejected. Prompt memory omits old research progress and source metadata; completion schemas offer only eligible anchors and currently visible receipt subjects. A first-discovered receipt creates no new obligation. Temporary raw diagnostics were restricted to the owned synthetic shop and removed from runtime source before final builds.
- Native side-panel placement/shortcut, external permission dialogs, VoiceOver and actual browser zoom/text remain open manual gates. Automated acceptance is not full accessibility conformance. Fresh real-Ollama automatic-agent quality and universal website completion accuracy are not claimed. Genuine Learn reviews, eligibility and personal submissions remain separate.

## Automatic-agent Phase 2 — October 23, 2026 (IST)

Automatic task/finish-condition inference through LangGraph, separate processing consent, the shared live feed, concise corrections and SQLite job/effect reconciliation are implemented. [Setup and bounds](AGENT_INFERENCE.md). No completion or reminder claim is made.

- `pnpm check`: 111 tests across seventeen files passed, plus formatting/lint, web/extension types, UI provenance, secrets and context guards. Common transport/manual recovery regressions remain covered.
- Unit/HTTP checks cover host-owned source references, bounded read tools, related/separate tasks, correction precedence/conflicts, failed transaction rollback, dismissal, call budgets, deadlines, config/session consent and stale source/version guards, including observations from another tab in the same millisecond. Enable requests must match both the reviewed model notice and the reviewed site-session ID; an unchanged model notice cannot authorize a replacement site session from a stale screen. Unknown references are rejected even if they appear after the three retained citations. Model-written quote fields are rejected.
- Subprocess tests terminate during a model-directed read loop and after a committed task effect. A new process resumes/reconciles to one task/revision/effect, without duplication.
- Production task acceptance covers research → purchase grouping across tabs, application inference with the app tab closed, correction persistence, an open correction surviving a site-session change, conflicting second-tab edits retaining unsaved input, submission uncertainty, axe and narrow reflow. Stable passive-reader acceptance waits through its real periodic cycle and expects one unchanged observation.
- The first full run exposed a revocation/reconnection error. An instrumentation-owned store instance shared through globalThis crossed Next bundle error-class boundaries. Module-owned connections now share the SQLite file, and all nine affected production browser cases passed after that fix.
- A scoped destructive Alert measured 4.49:1 during the new conflict-state axe scan. Recoverable notices now use the registry’s default variant; no custom visual rules, vendor edits or disabled accessibility rules were added.
- Early real-NVIDIA trials exposed overlong/normalized quotations, tentative intent not advancing, and 30-second timeouts. Background reasoning has a separate 45-second default deadline, with no automatic provider fallback/retry. Both whitespace re-anchoring and its limits are retained as historical trials: the actual reader split headings and currency/number nodes, which caused otherwise useful model proposals to fail exact-quote validation. [Heading replay](evidence/agent-phase2-browser-quote.json), [currency-node replay](evidence/agent-phase2-shop-quote.json).
- The final provider-independent contract uses model-selected source IDs. The host validates every reference and copies exact source spans. A diagnostic model response selected four valid references; the final bounded contract accepts up to eight and retains three, including current evidence. [Actual cart diagnostic and accepted projection](evidence/agent-phase2-shop-reference.json).
- The final eight-case NVIDIA corpus passed eight of eight, covering candidate research, buying intent/grouping, separate application, correction precedence, page injection, unrelated browsing and captured upstream product/cart reader output. An intervening live repeat retained an old AI research intent despite cart evidence; model memory now labels unreviewed AI records as identity hints and omits their old intent/stage/finish/next action, while preserving human corrections. Current evidence is presented last. [Actual prior-intent failure](evidence/agent-phase2-prior-intent.json). All development trials remain in [the evaluation record](evidence/agent-phase2-nvidia.json); these are known synthetic cases, not a held-out general accuracy/security benchmark.
- The early bare “Cart ready” fixture produced research but did not consistently establish buying intent. This limitation is retained. The real provider browser gate now uses the pinned upstream shop’s actual product/detail/cart UI. That production extension → backend → NVIDIA journey passed, with app/companion tabs closed during inference and task identity/revision preserved after a full browser restart. It did not place an order. [Actual runner evidence](evidence/agent-phase2-shop-live.txt) and [final research/cart snapshots](evidence/agent-phase2-shop-live.json).
- The transient Page Controller new-element `*` marker caused a redundant snapshot. The adapter now removes that bookkeeping flag before redaction/storage. Automatic real-Ollama quality has not been reevaluated; deterministic tests cover its shared transport. Native accessibility/zoom, cross-site grouping and universal website support remain unverified.

A final review separated transient companion connection warnings from action errors; the warning now clears after reconnect without remounting. All nine affected observation/task journeys passed again, followed by fresh default-origin builds and smoke.

Final complete production regression: **57 passed, two intentional live/demo skips**. Commerce: **two passed, one intentional live-provider skip**; the separate actual-NVIDIA shop journey passed. Default-origin production web/extension builds and HTTP smoke passed. The local app is running at http://127.0.0.1:3000. Publication/CI results are reported separately at handoff and the current state is in [WORK.md](WORK.md).

## Automatic-agent Phase 1 — October 23, 2026 (IST)

Real chosen-site observation, explicit local-processing consent, pairing/delivery, live companion controls and SQLite acceptance are implemented. [Setup, data bounds and manual gates](AGENT_OBSERVATION.md). This phase has no model calls, task inference, completion judgment or reminder delivery.

- Final `pnpm check`: all 99 tests across sixteen files passed, with formatting/lint, web/extension types, registry provenance, secrets and context guards. Default-origin web/extension production builds and HTTP smoke passed; the managed app is running at http://127.0.0.1:3000.
- Complete production web/extension regression: 55 passed, two explicit live-model/demo skips. All seven affected automatic-observation cases passed again after final capture-time retention and offline queue expiry hardening.
- The seven cases include Northstar saved-draft and changed-instruction observation, a seeded full-queue capacity boundary, actual automatic DOM/form/submit-attempt delivery with private-field exclusions, closing the app tab, offline delivery and full browser restart, pause/resume/revocation, exact-port isolation/untrusted bridge rejection, failed extension writes/recovery, axe and 320/360px reflow.
- The separate upstream commerce suite passed both cases: the original cart/validation/checkout/reset journey and a real extension-observed React inventory/cart/receipt journey. It retains entered-detail exclusions and makes no automatic completion claim.
- Store/HTTP checks cover transaction rollback, DB reopen/dedup, session/clock/Origin/Host rejection, expired/one-use/replaced pairing, clear/revocation, body limits and retention. Offline delivery does not extend the 24-hour capture-time retention clock.
- The persistent disposable Chromium fixture now excludes password-save/leak prompts for the published synthetic login; the native popup itself was not captured. This resolves page interactions stopping after the login wait without modifying real-user Chrome settings or the passive reader. Speculative viewport changes were reverted.
- Extension styling now explicitly scans the unchanged registry component sources outside WXT's root. This fixed an invisible checkbox without adding visual rules or changing vendor assets.
- Native side-panel placement/shortcut, external-site permission-prompt approval, VoiceOver and actual browser zoom/text settings remain manual gates. The automated companion is the actual extension page at side-panel width.

Final workspace/publication/smoke results and the next phase are recorded in [WORK.md](WORK.md). No fresh NVIDIA evaluation was needed because inference inputs/transports are unchanged and this new stream stays local.

## Automatic-agent Phase 0 — October 23, 2026 (IST)

The calm fictional preview, standalone Page Controller adaptation, real LangGraph/SQLite persistence spike and reused commerce sandbox are implemented. These results do not establish automatic browser tracking or live agent inference. [Reproduction and limitations](AGENT_FOUNDATION.md).

- `pnpm check`: passed all guards, lint/types and 88 unit/integration tests across fourteen files, including separate-process crash/restart/effect replay and extension-origin/token boundary rejection.
- Production web and Chrome extension builds: passed, including the local-only unlisted reader. Existing manifest permissions and extension ID remain unchanged.
- `REENTRY_TEST_PRODUCTION=1 pnpm test:e2e`: 48 passed; two explicit live-model/demo skips. Three new cases verify preview correction/reload, 360px companion axe/focus/reflow and real activeTab reader behavior with seeded private values and zero test-page mutations.
- `pnpm test:commerce`: passed cart retention across reload, empty-field validation, simulated order confirmation and reset, with all browser requests restricted to the local host. The first run exposed Google Fonts requests; the local derivative now removes them. Reporting imports are inert local aliases.
- `pnpm smoke`: passed after restoring the default-origin production extension/app build.
- Native VoiceOver/browser zoom and universal page support are unverified. The graph uses a fake decision model; no new hosted inference, reminders, continuous monitoring or live pairing is claimed.

## Phase 1 — October 22, 2026 (IST)

Implementation checkpoint: Git commit titled `feat: implement phase-one capture and durable checkpoints`; this record is included with that implementation. Prior baseline: `f86a3f4`. These results describe Phase 1, not completion of the full product or Learn curriculum.

Environment: macOS 26.4 arm64, pinned Node 22.23.2 / pnpm 12.5.1, Next.js 16.4.2, WXT 0.21.4, Playwright 1.64.1 and bundled Chrome for Testing 156.0.8078.4. Synthetic fixture/task data only.

| Check                               | Observed result                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | Formatting, lint, web/extension type checks, 27 tests across eight files, registry UI guard, secret-pattern guard and agent-context checks passed. |
| `pnpm build`                        | Production web build passed; home page uses request-time public extension configuration.                                                           |
| `pnpm extension:build`              | Production Manifest V3 extension built; capture action, background worker and review tab included. No broad host permissions.                      |
| `pnpm test:e2e --grep @capture`     | Six cases passed with real browser/extension APIs and isolated profiles/ports.                                                                     |
| `pnpm start:managed` + `pnpm smoke` | Production server started; ReEntry page, liveness/readiness, correlation ids and missing-route checks passed.                                      |
| Native keyboard walkthrough         | Passed against production web and extension builds in a separate Chrome for Testing profile using native keyboard input.                           |

The six browser cases cover:

1. Real action → selected text/title/URL → preview/confirmation → durable save; refresh persistence, harmless repeated delivery, and correct work-link opening.
2. No selection and discarded preview: no task saved.
3. Wrong app origin/port, malformed bridge messages and unsafe work link: evidence access/save rejected.
4. Simulated IndexedDB write failure: error shown, no task acknowledged, confirmed capture retained; retry saves once.
5. Simulated lost acknowledgement: one durable task remains, capture stays pending, refresh acknowledges without a duplicate.
6. Selected editable input: refused without capturing the field value.

Unit checks additionally cover strict ids/payloads, empty/oversized captures, exact selection-text preservation, capture age bounds, invalid connection configuration, persistent reopen, concurrent duplicate saves, conflicting evidence under one capture id and transaction failure.

Browser tests invoke the real Chrome toolbar-action path through browser-level `Extensions.triggerAction` and its `activeTab` grant. They do not fabricate capture output, manually dispatch a fake extension action, or add broad website permissions. Source tabs use unique test query ids to address the correct browser tab; the exact resulting URL is preserved and asserted. Tests wait for the worker's action listener before invocation. The first fixed-port attempt encountered an existing service, so the runner now allocates its own available ports and a separate test extension build.

Local ignored evidence: each case has a `trace.zip` under `test-results/`; the first also has `saved-checkpoint.png`. These artifacts are not public repository assets and are regenerated by the suite.

## Native keyboard observation

Against the production server at http://127.0.0.1:3000 and the fixture at port 4176:

- Native Command+A selection and Command+Shift+Y invoked the installed extension. The review contained selected page text and the exact source URL; the synthetic input's value was absent.
- Tab navigation reached source text and capture confirmation; Return opened ReEntry.
- Tab/type/Space navigation completed goal, work URL, confirmed-progress checkbox and next action; Return saved the checkpoint.
- Focus moved to the saved-checkpoint heading. Command+R preserved one saved task. Tab/Return reopened its card with the same progress and instructions, then opened the saved work URL in a new tab.
- Native accessibility tree and screenshot were inspected for the saved view. This is a keyboard/UI smoke check, not a screen-reader conformance claim.

## Limits recorded at the Phase 1 checkpoint

No VoiceOver, full zoom/reflow audit, public Selenium smoke result, cross-browser acceptance, model inference, recapture comparison, restore/history or deletion result is claimed. Those belong to later gates. Storage-failure/acknowledgement cases deliberately inject faults; the successful capture/save path uses real extension and IndexedDB behavior. Formal Learn scope/PRD/spec reviews remain incomplete, with no retrospective approvals recorded.

## Phase 2 — October 22, 2026 (IST)

Implementation checkpoint: commit titled `feat: add task-bound source recapture and comparison`; this record is included with that implementation. Phase 1 was already committed as `31c8d24` and the working tree was clean when Phase 2 began. Same pinned environment as Phase 1; new dependency `diff` 9.0.0 (BSD-3-Clause). Synthetic task/source data only.

| Check                                                                               | Observed result                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                        | Formatting, lint, web/extension type checks, 33 tests across nine files, registry UI guard, secret-pattern guard and agent-context checks passed.                                                                                               |
| `pnpm test:e2e`                                                                     | Fifteen real-extension cases passed: all six Phase 1 capture regressions plus nine Phase 2 source cases.                                                                                                                                        |
| `pnpm build`                                                                        | Production web build passed, including the new `/check` route.                                                                                                                                                                                  |
| `pnpm extension:build`                                                              | Production MV3 build passed with task-bound check/capture handling; no additional permissions.                                                                                                                                                  |
| `pnpm start:managed` + `pnpm smoke`                                                 | Production app at http://127.0.0.1:3000 passed the existing home/health/correlation/missing-route smoke; an additional HTTP check confirmed `/check` responds with its page. This is route availability, not a full production-browser journey. |
| `pnpm sandbox:sites start 4187`, `pnpm sandbox:switch v2`, `pnpm sandbox:switch v1` | HTTP reads at one stable URL verified one referee → two referees → reset. The owned sandbox server was stopped afterward.                                                                                                                       |

The nine source browser cases cover:

1. Close/reopen the saved task; switch actual served HTML from V1 to V2 at the same URL; real recapture; both snapshots, exact URLs, confirmed progress and saved action survive refresh.
2. Unchanged text versus punctuation-only edit: exact equality gives unchanged captured material; cosmetic edits still give text changed.
3. Different URL, different known section and missing same-section confirmation: incomparable, never unchanged.
4. Discarded preview, explicit cancellation, missing selection and source closed before capture: visible unverified states, no new verified action.
5. Two simultaneous tasks at the same source URL: task/check/capture mix-ups and wrong-task acknowledgement are rejected.
6. Network failure and user-reported unreadable/missing instructions: failed/unverified, never unchanged.
7. Injected comparison-storage failure: awaiting check and pending capture remain; retry saves successfully.
8. Injected lost acknowledgement: one saved comparison survives refresh, retries acknowledgement and clears the pending transfer without duplication.
9. Repeated extension invocation reopens the same task-bound capture; closing its source after capture preserves it for confirmation/save.

Unit/integration coverage adds mode/version mismatch handling, raw whitespace edits, immutable snapshots/facts, concurrent starts, duplicate/conflicting delivery, cancelled checks that cannot revive, and a real Dexie v1 → v2 upgrade that preserves legacy records/digests without inventing section metadata. Unsupported extraction metadata is rejected at the wire boundary; only selection/version 1 is implemented.

The successful paths use real selection, Chrome toolbar action/activeTab, external messaging and IndexedDB. Stable-URL tests copy fictional HTML files into isolated temporary directories served by http-server with caching disabled. No fake capture, comparison answer or AI response is injected. The browser helper temporarily tags fixture tab titles to address the correct Chrome tab when URLs match, restores the real title before capture, and preserves the actual source URL. Fault cases deliberately inject storage/message/network failures.

Local ignored evidence: traces under `test-results/`, plus `sources--sources-V1-to-V2--5dc3e-er-returning-and-refreshing/source-comparison.png`. The comparison screenshot was inspected: both captures, timestamps, preserved progress/action and labelled added/removed fragments are visible. Artifacts are regenerated by the suite; they are not public submission assets.

## Current limits after Phase 2

AI interpretation and real-model evaluation begin in Phase 3. A text edit is not a semantic requirement decision; the saved next action remains not reassessed. Selection cannot identify every login/error page, so unreadable sources also have an explicit user report action. Comparisons use the original checkpoint as baseline, not the previous recapture.

No new native keyboard/VoiceOver run, full zoom/reflow audit, public-site smoke, cross-browser acceptance, restore/history/deletion or full browser-restart resilience is claimed for Phase 2. The earlier Phase 1 native keyboard result is scoped to that journey. Formal Learn scope/PRD/spec reviews remain incomplete. See [PHASE2.md](PHASE2.md) for limits and [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md) for remaining gates.

## Phase 3 — October 22, 2026 (IST)

Implementation checkpoint: commit titled `feat: implement provider-independent AI recovery`; this record is included with that implementation. Prior product commit: `0052e56`. Same macOS/Node/pnpm/Next/WXT/Playwright environment as Phase 2. New test tools: MSW 3.0.3, Serve 0.11.0 and tsx 4.23.15. Fictional task/instruction data only; no hosted inference used.

### Deterministic checks

- Unit/integration suite: 55 tests across eleven files passed, including existing regressions, common harness contract against native Ollama through MSW and a fake alternative, exact quote/id and progress validation, invented completion/destination rejection, empty/truncated/refused output, input budgets, deadline/cancellation, no fallback, persistence/review/stale input and HTTP origin/payload/correlation boundaries.
- `pnpm test:e2e`: 25 passed, one live-only case deliberately skipped. All fifteen capture/source regressions passed; ten recovery cases covered validated suggestion → correction → save → refresh → correct work URL; malformed/invalid quote/progress/completion/destination outputs; unavailable service; deadline; cancellation without later saving; and a real newer source check invalidating a held response.
- MSW/Serve mocked the actual native Ollama listing/chat envelope for server-to-model calls. Successful capture/source/bridge/database paths used the real extension and IndexedDB. These tests establish integration behavior, not model quality or hosted-provider support.

### Actual local-model evidence

Runtime: Ollama **0.34.4**. Selected model: **qwen3:4b**, Q4_K_M, Apache-2.0, digest `359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7`. Native structured JSON output; thinking disabled, temperature 0, 16,384 context tokens, 2,000 maximum generated tokens. Prompt `recovery-2`, output schema 1. The model id is server configuration, not recovery logic.

Final `pnpm test:model:live` passed all three case assertions. Full actual messages, input snapshots, proposals, execution settings and digests are saved in ignored `.runtime/model-evaluation/2026-10-21T21-17-10-891Z.json`. Outputs were inspected beyond the assertions:

| Case                            | Observed interpretation and action                                                                                                   | Duration |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| One → two referees              | Changed; “Two referees are now required.” Exact one/two source quotes; action **Find first referee**; transcript progress preserved. | 6,791 ms |
| Same instructions               | Unchanged; no changes/questions; retains **Find first referee** and confirmed progress.                                              | 1,711 ms |
| Two referees versus no referees | Uncertain; asks which instruction applies and proposes clarification before disputed work.                                           | 2,433 ms |

These are observed runs with a model already used during development, not cold-start timings or a broad accuracy benchmark. The required six-case release evaluation remains Phase 5.

Earlier real trials are retained under `.runtime/model-evaluation/`. The installed Qwen3.5 9B exceeded deadlines under load and once proposed the second referee before the first was complete. Early Qwen3 4B output also expanded the action and mishandled contradictions; enabling thinking exceeded the deadline. A later heuristic-passing result still misstated a remaining quantity, which human inspection caught. The final prompt uses generic sample-collection examples, prioritizes contradiction, preserves a useful pending action verbatim and prohibits inferred remaining counts. The final outputs above passed after that change. The app does not implement trial-driven model switching or automatic retry; these were explicit development evaluations. Quote/schema validity alone did not establish correctness.

### Real extension + model journey

`REENTRY_TEST_LIVE=1 REENTRY_AI_MODEL=qwen3:4b REENTRY_AI_THINK=false pnpm test:e2e --grep @live --output=.runtime/phase3-live` passed **one real-model browser case** with the MSW model server disabled. It captured V1 through the actual extension, saved a checkpoint, closed/reopened its task view, changed the actual HTML at the same URL, recaptured and compared V2, called local Ollama, preserved confirmed progress, edited/saved the reviewed action, and opened the exact saved work URL via Continue.

The browser's actual response said **“Two referees are now required”**, cited the exact old/new sentences, and retained **“Find first referee.”** Inference took **4,636 ms** with the same digest, prompt/schema and settings as above. The reviewed action was changed to “Ask Alex to be my first referee; then find the second.” The external destination opened with the original `#work` URL; no model-generated URL or form submission occurred.

Ignored evidence directory: `.runtime/phase3-live/recovery--live-real-extens-aade9-del-correction-and-Continue/`. It contains the trace, inspected `live-recovery.png`, actual input/result extracted from the trace into `actual-browser-recovery.json`, and nine real page recordings under `video/`. These are test evidence clips, not the finished hackathon submission video. Deterministic traces remain under `test-results/`.

### Final workspace and production checks

`pnpm check` passed: formatting, lint, web/extension type checks, all 55 tests across eleven files, registry UI, secret-pattern and agent-context guards. Final `pnpm build` and `pnpm extension:build` passed with `/api/recovery` and `/recover` included. `pnpm start:managed` plus `pnpm smoke` passed; additional HTTP checks confirmed `/recover` and `/check` respond and `/api/recovery` reports enabled local `ollama` / `qwen3:4b` with no-store caching. This production smoke checks availability/configuration; the complete browser journey above ran against the test-managed Next development server. Full production-browser acceptance remains a release check.

The managed production app is left running at http://127.0.0.1:3000. Local configuration, model weights, personal learner context and browser/model evidence remain ignored/untracked. Documentation links and staged whitespace/secret checks are verified before commit.

### Current limits after Phase 3

Only local Ollama is implemented. A fake alternative verifies the interface; OpenAI/DeepSeek adapters and hosted processing consent are future work. The app preserves facts, validates evidence references and forces review, but cannot prove every interpretation or catch every semantic contradiction. The observed prompt improvements are examples, not an accuracy claim.

No new native keyboard/VoiceOver acceptance, zoom/reflow audit, full six-case model evaluation, checkpoint revision/restore/delete, complete restart resilience, public-site smoke or submission-ready video is claimed. The checkpoint remains intact while reviewed recovery actions are stored separately. Formal Learn reviews remain incomplete. See [PHASE3.md](PHASE3.md) and the remaining [checklist](BUILD_CHECKLIST.md).

## NVIDIA-hosted adapter — October 22, 2026 (IST)

Implementation checkpoint: commit titled `feat: add NVIDIA-hosted recovery with processing consent`; baseline `221a5e9`. No new dependency. The author supplied `NVIDIA_API_KEY` in ignored local configuration; the value is not included in evidence, client assets, source or logs. Other provider credentials were left unused.

The selected provider/model is **NVIDIA / `nvidia/nemotron-3-ultra-550b-a55b`** at its official HTTPS chat-completions endpoint. Live settings: text output containing the strict application JSON proposal, thinking off, temperature 0, 2,000 generated-token cap, prompt `recovery-3`, schema 1, 30-second deadline. Text mode relies on application parsing/validation; it does not claim provider-enforced JSON schema adherence. Remote digest is null because no weight digest was supplied.

### Automated boundaries

- Native NVIDIA HTTP tests exercise bearer headers without credentials in prompts/results, text/JSON-object/JSON-schema request envelopes, thinking omit/on/off and reasoning budget, refusal/tool-call/empty/truncated/malformed/unknown-model/quote/progress/destination rejection, cancellation, redirect refusal, and safe handling of pending/auth/access/options/rate/server errors with one request and no fallback.
- Server route tests reject missing/stale hosted-processing agreement before provider side effects. The public configuration response contains no key or endpoint credential. Browser tests verify the unchecked agreement, named hosted notice, changed-model rejection/notice refresh, and reset after reload. Those UI tests deliberately stub the app boundary; they are not model evidence.
- `pnpm test:e2e` passed **26 cases**, with the separate live case intentionally skipped. All earlier capture/source/recovery regressions passed.
- The focused secret guard now recognizes NVIDIA token patterns. An exact-value check also confirmed the real configured key is absent from built web and extension browser assets, without printing it.

### Actual hosted evaluation

Six scenarios passed against Ultra: five actual inferences and one missing-evidence guard that makes no provider call. Final exact messages/inputs/results/settings are in ignored `.runtime/model-evaluation/2026-10-21T22-44-02-313Z.json`; five observed inference durations were 1,561–4,843 ms. Inspected outputs:

| Scenario                     | Observed behavior                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| One → two referees           | Identifies increased requirement with exact old/new quotes; retains **Find first referee**.      |
| One → no referees            | Explains removal and replaces the obsolete referee action with reviewing remaining requirements. |
| Unchanged                    | No material change; preserves the pending action and confirmed progress.                         |
| Cosmetic punctuation/spacing | Unchanged meaning, with no invented requirement change.                                          |
| Conflicting two versus none  | Uncertain; asks which new instruction applies before proceeding.                                 |
| Missing evidence             | Rejected locally before adapter inference.                                                       |

Earlier attempts are not counted as success: Lightning misclassified cosmetic edits, retained an obsolete action, or produced invalid/uncertain outputs on clear examples. Thinking-mode trials did not consistently fix those cases. `nvidia/nemotron-3-super-120b-a12b` returned HTTP 404 for this account despite being in the catalog. Ultra was explicitly chosen after evaluation; the app never automatically changes model/provider. These small samples are not an accuracy benchmark or a guarantee about a changing remote alias.

Ollama regression: `.runtime/model-evaluation/2026-10-21T22-39-25-545Z.json` records all three original local cases passing with prompt 3, same Qwen3 4B digest as Phase 3. This preserves the local adapter; its semantic questions remain subject to review.

### Real hosted browser journey

`REENTRY_TEST_LIVE=1 REENTRY_AI_PROVIDER=nvidia REENTRY_AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b NVIDIA_OUTPUT_MODE=text NVIDIA_THINKING=off pnpm test:e2e --grep @live --output=.runtime/nvidia-live` passed **one actual NVIDIA browser case**. It uses the real extension/activeTab, actual V1/V2 HTML, explicit hosted-processing checkbox, server acknowledgement, NVIDIA inference, preserved progress, correction/save and Continue at the exact stored work URL.

The inspected hosted result states that the referee requirement increased from one to two, cites the exact sentences, and keeps **Find first referee**. Inference took **2,873 ms**. The browser trace contains the processing acknowledgement header and no NVIDIA credential; provider authentication is server-side. Screenshot, trace, page recordings and input/result extracted from the trace are under ignored `.runtime/nvidia-live/recovery--live-real-extens-aade9-del-correction-and-Continue/`. These are test clips, not the submission video.

### Limits

Ultra/text/thinking-off is the live-tested NVIDIA configuration. Other models or output modes need their own real evaluation; HTTP compatibility alone is not support/quality proof. Authentication/usage/account/model availability can vary, and invalid/incomplete responses remain visible failures. No direct Gemini, DeepSeek, OpenRouter, Mistral or OpenAI adapter was implemented. Existing accessibility, revision/history/delete, production-browser release acceptance and formal Learn gaps remain open.

Final workspace verification: `pnpm check` passed all **80 tests across twelve files**, formatting/lint, web/extension types, registry UI, secret-pattern and context guards. `pnpm build` and `pnpm extension:build` passed. Production HTTP smoke passed; `/api/recovery` reports NVIDIA/Ultra hosted processing without a credential, and a same-origin POST without agreement returns `PROCESSING_CONSENT_REQUIRED` before inference. The configured key is absent from final browser assets. The app is left running at http://127.0.0.1:3000 with NVIDIA enabled in ignored local settings. Browser journey evidence is from the test-managed Next development server; full production-browser release acceptance remains separate.

## October 22 — Checkpoint revisions and accessible browser acceptance

- Database version 4 migrates existing tasks into immutable revision history while preserving source checks and reviewed recoveries. Editing/restore uses expected revisions and retains ten snapshots. A restored checkpoint receives a later revision.
- Draft recovery is distinct from confirmed saving. Deletion atomically removes local associated data, keeps minimal replay markers and durably queues idempotent extension cleanup. A disconnected extension does not undo local deletion.
- Checkpoint edits invalidate recovery input digests and older task-bound recaptures. Continue validates the current task/check/recovery in a consistent read transaction.
- UI adds the checkpoint editor/history and deletion dialogs, task access links, registry disclosure controls and clearer recovery evidence labels. Registry assets remain unmodified.
- `pnpm check`: 86 tests across thirteen files, formatting/lint/web+extension types, UI provenance, focused secret and context guards passed.
- Focused browser run: eight resilience/accessibility cases passed, including real browser close/relaunch with retained checkpoint/draft/pending capture, conflicting tabs, failed revision writes, restore, deletion/purge, stale continuation, axe, 320px layouts, reduced motion and dialog focus restoration.
- Production acceptance: 34 deterministic cases passed using actual Next production and WXT production builds together; one live-only test intentionally skipped. No model-quality claim comes from the synthetic server used for these cases.
- Initial test failures were corrected: selectors needed named alerts to distinguish Next's route announcer; keyboard activation needed an enabled control; axe scanned during dialog opening animation and now waits for animation completion rather than suppressing contrast rules.
- Native Chrome/VoiceOver, 200% browser text settings and actual 400% browser zoom are not established by these automated results. The 320px reflow check is supporting evidence, not a claim that every manual accessibility gate passed.

### Expanded release checks

- The expanded production run passed 40 deterministic browser cases, with two deliberate skips for explicit live/recording runs. Worker suspension was exercised by closing its real browser target; reopening the capture preview proved the background messaging resumed without relying on a Playwright worker-event notification. Unavailable-app retry uses the actual "Open ReEntry again" preview control.
- Additional source variants cover decrease/removal, deadline change and contradiction while preserving raw before/current text and confirmed progress. Model interpretation remains separately evaluated.
- Fresh NVIDIA evidence is retained publicly in `docs/evidence/nvidia-release-evaluation.json`. Its decrease case timed out at the 30-second boundary; cosmetic/increase/unchanged/contradiction passed, and missing evidence was blocked before calling the model. An explicit isolated decrease repeat passed in 3,582 ms; see `nvidia-decrease-repeat.json`. No application retry/fallback was introduced, and the failed attempt is preserved.
- A fresh production real-NVIDIA demonstration passed, including explicit agreement, changed-source interpretation, action correction, continuation, checkpoint correction and restore. The raw browser recording is approximately 108 seconds with matching SRT/VTT captions. A final typography recording replaces this initial capture after the registry font fix.
- Long-text reflow and simulated 200% root text sizing passed a supplemental production accessibility run. This does not claim actual native browser text settings or 400% zoom acceptance.
- Visual review found a pre-existing registry font token mismatch causing serif fallback. The official font-geist registry corrected Next wiring; the extension receives its standard system-font token. Computed-font assertions and axe now cover both. The layout guard explicitly permits text wrapping utilities for unbroken user text; it does not allow arbitrary appearance changes.
- Native tool attempt: "The Mac is locked and automatic unlock could not unlock it." Native Chrome/VoiceOver acceptance and authenticated YouTube/Vimeo upload remain unperformed. No user interruption/approval request was issued.

### Final release evidence

- Registry typography/long-text production suite: 41 deterministic cases passed, two explicit live/recording skips. A later zero-checkpoint delete-all case passed separately; it clears pending captures even before a first task exists.
- Final real-NVIDIA recording plus live-context accessibility checks passed: three passed, one synthetic-only accessibility case deliberately skipped. The final MP4 is 108.2 seconds, packaged with matching SRT/VTT captions and screenshots. Model/source data is fictional; the inference is real.
- Final deterministic accessibility subset passed all three cases after waiting for finite registry transitions before scanning. No contrast rules are disabled; the primary-action color transition is allowed to settle. This covers the generated result, 320px layouts, long unbroken text, simulated 200% text sizing, computed fonts and dialog focus restoration.
- Migration coverage now verifies a valid previously reviewed recovery can still resolve its continuation URL after upgrading, rather than checking only that a row survived.
- Fresh local clone of release-preparation commit `3cbf03f`: `pnpm bootstrap` passed with frozen dependencies, example-only configuration and no copied credentials/learner profile.
- Publication audit checked Git history, tracked files and built browser assets for focused patterns and configured credential values. Credentials/private learner context are ignored and untracked. The audit remains a focused guard, not a complete secret-detection guarantee.
- Source: https://github.com/kirmada1509/reentry. Preview assets: https://github.com/kirmada1509/reentry/releases/tag/v0.1.0. CI runs production browser acceptance without live model keys; its current status is visible on GitHub.
- Still open: native Chrome/VoiceOver, actual browser text/zoom acceptance, public YouTube/Vimeo upload, genuine learner reviews/reflections, eligibility attestations and actual contest submissions. The locked Mac blocked native controls; none of these human activities is inferred from automated success.

### Published preview and final acceptance

- Final complete production-mode run on release code: **42 passed, two deliberate live/recording skips**. All capture, source, recovery, resilience and accessibility cases ran together, including the zero-checkpoint delete-all case.
- Public repository and MIT license were verified without authentication. The non-draft v0.1.0 prerelease contains the MP4, SRT/VTT and two screenshots; anonymous ranged GET requests verified the video/caption downloads. Release target: `f4b3fc544c91c453ca98e2e99dfa2b8737b11de7`.
- Hosted GitHub verification did not start because of an account-level restriction, before any test step. This is an external runner availability issue; no hosted pass is claimed. Full local production acceptance and the existing workspace gates passed. No account settings were changed.

### Presentation sandbox upgrade — October 22

- Subsequent hosted CI run [39753513724](https://github.com/kirmada1509/reentry/actions/runs/39753513724) passed 86 project tests, 42 production browser tests (two intentional skips), and HTTP smoke after the account restriction was resolved and the OS-specific font assertion corrected.
- Added a separate static fictional Northstar portal, using the existing registry components/theme, Vite and http-server. Small HTML fixtures remain in the regression suite; the portal uses no accounts, submission service, real uploads or external assets.
- Expanded full production acceptance: **45 browser tests passed together, two deliberate live/recording skips**. Three new cases cover real-extension capture/recapture, evidenced recovery and continuation into retained application fields; application save failure, requirement-dependent checklist/referee fields, reset and source unavailability; axe, keyboard dialog focus and 320px reflow.
- An initial axe failure found 4.49:1 contrast in the registry destructive alert description. The portal now uses the standard high-contrast default alert for error text, preserving role=alert and descriptive messages. No axe rules or checks were suppressed.
- Actual CLI smoke: cosmetic/V2/V1 switching served the expected JSON; occupied explicit port 4173 returned an actionable error without terminating its unrelated service; default startup selected 4177 while 4176 was occupied. The owned old sandbox was then replaced by the new portal at 4176. The actual UI was visually inspected; a fictional-data screenshot is retained in `docs/evidence/northstar-overview.png`.
- ReEntry's normal extension build and local development app were restored after the production browser tests, and HTTP smoke passed. No new live-model evaluation was run for this presentation-only change; the capture text, inference harness and validators are unchanged.

### Stable local launcher — October 22

- Reproduced the reported continuous development Fast Refresh loop in an actual Chromium page, with repeated successful page loads and rebuild messages. Narrowing the CSS scan was insufficient and was reverted; a specific file-watcher root cause or development-bundler fix is not claimed.
- `./start.sh` / `pnpm local:start` now checks for an active owned server/occupied port, builds the extension and web app, then starts the production server through the existing supervisor. Normal use has no development refresh client. Explicit development commands are separate.
- The real production browser remained on `http://127.0.0.1:3000/`, titled “ReEntry · Save your place,” for a ten-second observation: **zero main-frame navigations and zero Fast Refresh rebuilds**. During the observation, a separate process appended to `.runtime/reload-probe.log` and `.runtime/server.log` 24 times each.
- A second `./start.sh` was rejected with the active-server message before changing `.next/BUILD_ID`'s modification time, preserving the running build. Both production builds, `pnpm check` (86 project tests) and HTTP smoke passed. No product data schema, model configuration, capture protocol or application UI was changed.
