# ReEntry browser agent — build plan

Updated October 23, 2026. This is the current roadmap for the automatic browser agent and its calm interface, using the selected open-source tools below. Phases 0–4 are implemented: observation, task inference, evidenced progress/completion, interruption recovery and optional local reminders. [Foundation evidence](AGENT_FOUNDATION.md), [completion rules](AGENT_PROGRESS.md) and [reminder bounds](AGENT_REMINDERS.md) record the actual behavior. Phase 5 is next; native accessibility/permission/desktop-banner acceptance remains open. The existing manual release remains working; its earlier plan is preserved in [BUILD_PLAN_MANUAL.md](BUILD_PLAN_MANUAL.md), with actual results in [TEST_RESULTS.md](TEST_RESULTS.md).

## The product we are building

ReEntry quietly keeps your place while you use the browser. After enabling assistance, you continue with your task. The agent understands the likely goal, creates a finish condition, tracks meaningful progress, and helps you resume after an interruption. It completes a task when supporting evidence is actually observed.

The default experience requires neither selecting text nor filling a checkpoint form. Small corrections remain available when the inferred intent is wrong. Start with two complete task families: shopping and applications. Other websites can be evaluated later; universal browser understanding is not an initial promise.

The first release of this iteration observes your actions and manages ReEntry tasks/reminders. It does not place purchases or submit external forms on your behalf.

## What the interface should feel like

A quiet companion: warm neutral surfaces, dark readable text, a restrained green accent, generous spacing and clear hierarchy. No busy analytics dashboard, stream of agent messages, flashing status, constantly moving cards or guilt-inducing task counters. See the [visual and interaction brief](UI_DIRECTION.md).

Four main surfaces:

1. **Welcome and enable:** explain browser access and model processing clearly; enable assistance, choose site coverage and reminder preferences once.
2. **Browser companion:** a compact Chrome side panel showing the task you are doing, what finishing means, recent progress and one next action. Pause and correct are always reachable.
3. **Return home:** a spacious overview with Continue, Waiting and Finished groups. Emphasize the task you can resume rather than everything unfinished.
4. **Task detail:** the finish condition, observed checkpoints, changes and evidence. Show a concise story first; expand the observation history only when requested.

A correction should look like changing a short sentence or choosing “I’m only researching,” not completing another form. Do not reorder a focused card or steal focus when the agent updates it.

## What we keep and what we add

Keep this repository, the WXT extension, official registry UI, production start/stop commands, NVIDIA/Ollama connections, revision/deletion patterns and existing regression suite. Preserve current manual tasks and their evidence.

Add automatic browser observation, an authenticated background connection, durable agent memory, a bounded tool loop, automatic completion verification and local reminders. Adopt the stack below through Phase 0 integration tests. Keep provider-specific requests behind ReEntry's own interface; switching models must not require changing the task workflow. The [open-source comparison](AGENT_REUSE.md) contains source links, licenses, integration limits and alternatives.

Proposed memory default: a local server-side SQLite store is authoritative for new agent tasks, evidence and effect records, integrated with a tested persistent graph checkpointer. The extension has a durable bounded observation/reminder-delivery queue, not an independent competing task database. The existing web-origin Dexie store remains intact for legacy manual tasks. Validate the chosen SQLite/checkpointer package, restart behavior and deployment compatibility in the first spike before installing it for feature work. No cloud database, accounts or hosting are needed.

Browser observation uses Chrome content scripts and events. Reuse Chrome alarms/notifications for reminders, Playwright/MSW/axe for tests, and official shadcn components/blocks for screens. Do not add a second browser automation process merely to watch the user's existing browser. [Architecture and tool boundaries](AGENTIC_PLAN.md).

## Selected tools and exactly how we use them

| Responsibility                                             | Selected tool                                               | ReEntry integration                                                                                                                                                                                   | First phase            |
| ---------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Extension lifecycle, content scripts and internal delivery | Existing WXT and webext-core messaging/storage integrations | Keep the extension; add permitted-site observation and the local authenticated delivery adapter.                                                                                                      | 0–1                    |
| Interactive page context                                   | Page Agent's `@page-agent/page-controller`                  | Use a narrow observation adapter around the standalone controller, with tested filtering and page-behavior controls. Reuse its DOM engine; exclude its browser action methods from the agent's tools. | 0 spike, 1 integration |
| Agent orchestration                                        | `@langchain/langgraph` with compatible peers                | Express observation, task inference, bounded tool selection, checkpoint updates and verification as a stateful graph using ReEntry's model interface.                                                 | 0 spike, 2 integration |
| Durable graph state                                        | `@langchain/langgraph-checkpoint-sqlite`                    | Use its file-backed `SqliteSaver`. Keep task/evidence/effect records in the authoritative local SQLite store, with explicit reconciliation between task updates and graph checkpoints.                | 0 spike, 2 integration |
| Model access                                               | Existing NVIDIA and optional Ollama adapters                | Extend the shared agent decision contract and validate outputs. Credentials stay on the server.                                                                                                       | 2                      |
| Document-heavy source material                             | Defuddle, when the Phase 1 reader tests establish a gap     | Use local synchronous extraction behind the same observation adapter for instructions/articles. Keep form/status evidence from the interactive reader; do not introduce remote extraction fallback.   | 1, only if needed      |
| Commerce sandbox                                           | Sauce Labs `sample-app-web`                                 | Run a pinned local upstream shop separately, with its UI/assets and license; disable external reporting and add only missing test variants.                                                           | 0 setup, 1 onward      |
| Application sandbox                                        | Existing Northstar portal                                   | Reuse its saved drafts and instruction switching; add fictional validation/submission/receipt states for Phase 3.                                                                                     | 0 onward               |
| Calm interface                                             | Existing official shadcn registry components/blocks         | Compose home, Chrome companion, evidence disclosures and concise corrections through the registry adoption workflow.                                                                                  | Every phase            |
| Reminders                                                  | Chrome alarms, notifications and idle                       | Store intent, schedule platform alarms, deduplicate delivery and reconcile after restart.                                                                                                             | 4                      |
| Verification                                               | Existing Playwright, MSW/Serve and axe                      | Exercise the real extension and local sites; inject controlled failures and evaluate the configured model separately.                                                                                 | Every phase            |

Nanobrowser is a reference for extension side-panel, tab-group and permission patterns. Reuse a specific licensed module only when it closes a demonstrated gap; do not fork the complete product or adopt its browser-held credential design. Stagehand and Browser Use remain later options for delegated browser actions. Deep Agents and Mastra remain alternative runtimes, not additional layers on LangGraph. rrweb is optional synthetic recording/replay equipment if ordinary Playwright fixtures prove insufficient. These are deliberate integration boundaries, not required installations.

Phase 0 must resolve the known Page Controller issues: default serialization can include form values, extraction adds annotations, and observation can trigger mutations. Verify filtering before storage/delivery/inference, page behavior and self-induced observation loops. An empty attribute list or disabled operation mask is not proof of safe passive reading. If the package fails, document the failing case and prefer a small attributed adaptation of existing extraction code before considering a new reader. Keep the failing gate open until resolved.

Pin working versions and upstream fixture commits after the smallest integration succeeds; retain licenses and record modifications in provenance. The shop currently needs a newer Node runtime than ReEntry's pinned Node 22.23.2, so isolate its build/runtime and allocate a separate free port. Production use of each new dependency requires its own build and acceptance evidence.

ReEntry-specific code remains responsible for intent inference, related-tab grouping, evidence-backed finish conditions, corrections, stale-update/deletion safeguards and the reminder policy. None of the selected libraries supplies those product judgments automatically.

## Phase 0 — Design the experience and prove the foundation

**Status:** locally verified. The fictional preview, patched reader, file-backed graph restart/effect-replay test, connection contract and pinned shopping sandbox are implemented. The connection is a tested protocol boundary, not an exposed pairing/delivery API. The companion is a web preview of the future native side panel. See [the implementation record](AGENT_FOUNDATION.md).

**What you can try:** a clickable, clearly labelled prototype of the home screen, companion and task detail, including empty, active, interrupted, completed and disconnected states.

**Build:** select the registry theme/type/layout, compose the three core screens with fictional task data, and document the interaction rules. In small separate spikes, test the published Page Controller inside WXT for useful DOM context, data minimization, stable page behavior and bundle compatibility; verify model-directed graph branching and restart persistence using the official LangGraph SQLite checkpointer; settle the authenticated extension connection contract. Follow the concrete [adoption gates](AGENT_REUSE.md#adoption-gates-before-feature-work). Prototype data is never presented as actual agent inference.

Bring up a pinned local Sauce Labs shop at this stage so later phases have a real existing shopping journey to test. Verify browse → cart → checkout → simulated completion and reset using synthetic details, with external reporting disabled. Keep Northstar available alongside it. Record ports, upstream commit/license, isolated runtime and reproducible start/reset instructions. This is test equipment; it does not establish automatic ReEntry task tracking.

**Pass when:** the core journey is understandable without a walkthrough; primary actions, pause and correction work; the layout is calm at desktop and side-panel widths; keyboard focus is clear; the reader supplies useful context without seeded sensitive values escaping its adapter or disturbing the tested pages; persistence resumes a sample workflow after a real process restart without duplicating an accepted effect; the local shop journey and reset work reproducibly. If a chosen library fails this spike, record and resolve that concrete failure before feature dependencies are adopted.

**Result:** a visual baseline and tested architecture, before another round of engineering-first screens.

## Phase 1 — Let ReEntry observe the browser

**What you can try:** enable assistance and browse the application sandbox. ReEntry receives relevant page changes without selecting text or filling a task form.

**Build:** permission/site controls, visible pause, navigation/DOM/form-status observation triggers, bounded snapshots and a durable queue to the authenticated local backend. The observation adapter calls the Phase 0-tested Page Controller; use Defuddle only for a demonstrated document-extraction gap. Retain the smallest useful evidence. Filter password/payment/hidden-token fields and unnecessary raw answers before persistence, delivery or hosted processing. Ignore the extension's own UI, reader annotations and repetitive mutations. Store current consent separately from old per-capture agreement. Exercise both Northstar and the local upstream shop.

**Pass when:** permitted page changes arrive, denied/paused sites do not; a saved observation survives worker restart; backend downtime queues bounded events and reconnects without duplicates; unpaired requests are rejected; redaction tests cover seeded sensitive examples. The companion shows honest connected, paused, unavailable and catching-up states without a wall of logs.

**Result:** an automatic browser context stream, not yet an intelligent task agent.

## Phase 2 — Infer tasks and finish conditions

**Status:** implemented. See [setup, architecture and limits](AGENT_INFERENCE.md) and [actual verification](TEST_RESULTS.md). Same-site grouping is supported; cross-site grouping is deferred. Native accessibility remains a manual gate.

**What you can try:** browsing an application or progressing toward checkout creates a task automatically. Its short description and intended finish condition appear in the companion and home screen.

**Build:** a provider-independent agent decision contract, LangGraph orchestration using the Phase 0-tested file-backed SQLite checkpointer, stable task IDs and cross-tab grouping. Let the model choose among bounded observation/history/task tools. Persist accepted decisions and graph progress with version checks and idempotent effect records. The browser reader supplies context; the graph owns orchestration; the model transport remains replaceable. Distinguish candidate intent, ongoing work and completion uncertainty; honor user corrections over later guesses.

**Pass when:** no manual checkpoint form is required; shopping research is distinguishable from buying; an ordinary product visit does not become a forced purchase obligation; unrelated tasks stay separate; browser/server restart resumes rather than duplicates the task; stale inference cannot replace newer evidence. Test the common model contract with fakes and the actual configured NVIDIA model. Other provider support is claimed only after its adapter/evaluation passes.

**Result:** the first useful automatic version of ReEntry.

## Phase 3 — Track progress and verify completion

**What you can try:** watch a task move through meaningful checkpoints as you act. Leave during checkout or an application, return, and see exactly where you stopped. Successfully finishing completes the correct task automatically.

**Build:** evidence-linked intermediate checkpoints, task-specific finish conditions, fresh confirmation checks, changed-instruction reconciliation, cancellation/dismissal and correction. Saving a draft, attempting submission and successful submission are distinct states. The default card shows the useful next action; supporting evidence sits under “Why this?”.

Extend Northstar only with missing fictional validation/submission/receipt states. Reuse the local Sauce Labs shop's existing cart, review, cancel and completion flow; add controlled missing failure/receipt variants rather than another commerce implementation. Keep test-only expected answers outside the agent's observed context.

**Pass when:** successful order/application confirmations complete the matching task; clicking Submit, failed payment, validation errors, an unrelated receipt or old confirmation do not; one-to-two-referee changes revise the remaining work without losing progress; prompt injection cannot grant tools or fabricate completion; corrections survive later updates; deletion prevents delayed events from resurrecting the task.

**Result:** an evidenced task companion rather than an activity summarizer.

## Phase 4 — Handle interruptions and reminders

**What you can try:** stop midway, return later, and receive a short recovery card. If reminders are enabled, ReEntry quietly reminds you of unfinished work and stops reminding once it is completed.

**Build:** interrupted/waiting states, resumable work links, next-action updates, reminder policy, snooze/cancel and idempotent notification delivery. Suggested initial policy: one gentle reminder after 45 minutes away, at most one per task per day, with configurable quiet hours. This is a product default to test, not a deadline inferred from the website. Only schedule real deadline reminders when the deadline and timezone are supported by evidence.

**Pass when:** switching briefly between tabs does not trigger reminders; completing/deleting/dismissing a task cancels stale reminders; restart reconciles missing alarms; duplicate events never produce duplicate notifications; unknown deadlines remain unknown. Document delayed local delivery while Chrome/device is unavailable; do not promise notifications after browser exit.

**Implementation (October 23):** [Return and reminder setup, policy, data and delivery bounds](AGENT_REMINDERS.md). Uses native Chrome alarms/notifications/idle plus WXT storage and the existing SQLite authority; no new dependency or model scheduling tool. Website deadline scheduling is deferred, so unknown deadlines stay unknown. Native permission-prompt approval and visible desktop banner verification remain manual gates.

**Result:** ReEntry supports returning to work without nagging.

## Phase 5 — Make calmness and reliability hold up

**What you can try:** use the whole journey through the companion and home screen with realistic content, long text, several tabs and interruptions.

**Build:** replace prototype bindings with production data throughout, refine spacing/hierarchy/microcopy, preserve focused-card position, and tuck technical details behind disclosures. Verify failure/reconnect states, race conditions, deletion, history, retention limits and control of call budgets. Apply any theme through the documented registry adoption/provenance workflow; do not edit hashes to bless custom primitives.

**Pass when:** the main journey has no required large form; each screen has one clear primary action; background events do not steal focus or repeatedly reshuffle the list; minor updates do not create toasts; keyboard/axe, narrow side panels, 200% text, 400% reflow and reduced motion are covered. Record actual manual Chrome/VoiceOver results or keep unavailable gates explicitly open. On-screen explanations distinguish observed facts, agent inference and user corrections.

**Result:** a calm, coherent daily-use experience rather than a debug interface.

## Phase 6 — Evaluate and prepare the demonstration

**What you can try:** two complete real-model demonstrations: a shopping interruption through order confirmation, and an application interruption through changed requirements and submission confirmation.

**Build:** a versioned evaluation set, adversarial/held-out variants, fresh-profile setup, actual provider runs and honest public evidence. Reuse the polished Northstar portal; extend it with clearly fictional validation/submission/receipt states. Use a pinned local copy of the MIT-licensed Sauce Labs sample shop for commerce, with an isolated compatible runtime, upstream notices and disabled external reporting. Add only missing controlled failure/receipt variants; no real payment integration. See [sandbox reuse](AGENT_REUSE.md#existing-sandboxes-we-can-use).

**Pass when:** report task-discovery errors, wrong task merges, false completions, correction frequency, latency and model-call counts with actual denominators. Require no false completions in the release regression set, without claiming that establishes universal accuracy. Production builds, the full browser suite and CI pass. Record the uninterrupted automatic journey and disclose fictional sites, inherited code, AI help and limits. Existing eligibility, Learn reviews and personal submission attestations remain separate human gates.

**Result:** a technically supported submission candidate showing the agent's substantive contribution.

## Required testing sandboxes

| Sandbox                   | Purpose                                                                                           | Reuse and necessary additions                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Northstar application     | Automatic task creation, material/form progress, instruction change, validation versus submission | Existing polished portal; add labelled fictional success/failure/receipt states                                     |
| Commerce journey          | Research versus purchase, cart, interrupted checkout, success/failure/cancellation                | Pinned Sauce Labs sample shop in a separate local runtime; add only missing negative cases; no real payments        |
| Unfamiliar page variants  | Expose hardcoded site assumptions                                                                 | Alternate wording, structure, SPA navigation and unrelated confirmations; expected labels stay outside model inputs |
| Browser lifecycle         | Tab grouping, worker suspension, closed app tab, offline backend and restart                      | Real extension in Playwright profiles; persistent test data and controllable service failures                       |
| Model/tool failures       | Malformed output, prompt injection, incorrect evidence, stale results, timeouts and budgets       | Existing MSW/Serve and fake transports plus separate actual-provider evaluation                                     |
| Reminders                 | Deduplication, quiet hours, snooze, completion cancellation and restart                           | Chrome alarm/notification APIs with deterministic scheduling fixtures; actual native smoke where available          |
| Calm/accessibility states | Layout, focus, motion, notification restraint and comprehension                                   | axe, keyboard, viewport tests and hands-on inspection; record unperformed manual checks                             |

Public test sites are supplementary manual smoke checks, not CI dependencies. Ordinary browsing of an allowed real shopping site can test observation; it does not authorize a test purchase or establish checkout reliability.

## Working rules and next step

Each phase includes its visible UI, tests and evidence. Commit a verified slice before the next phase; do not postpone all design until the end. Preserve legacy manual data, server-only credentials, the stable production launcher and existing accessibility functionality. Add dependencies only when their working slice needs them.

**Phases 1–3 implemented:** real observation, separate model/site-session agreement, automatic tasks, evidence-linked progress, corrections, fresh confirmation checks and deletion. [Setup](AGENT_INFERENCE.md) and [completion rules/limits](AGENT_PROGRESS.md). **Next: Phase 4**, interruption handling and local reminders. Native/manual accessibility gates remain open.
