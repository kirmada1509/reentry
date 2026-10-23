# ReEntry browser agent: requested next iteration

Requested October 22, 2026. Phases 0–5 of this direction are now implemented: chosen-site observation, separately consented task inference, evidence-linked progress and bounded matching-confirmation checks. [Completion rules and limits](AGENT_PROGRESS.md). [Interruption recovery and optional local reminders](AGENT_REMINDERS.md) are implemented through a deterministic policy. Keep the current repository and preserve the working manual release. The author wants automatic task discovery, inferred completion checkpoints, progress tracking and reminders without selecting text or filling a checkpoint form.

## Intended experience

Enable browser assistance once and grant the chosen website access and processing mode. ReEntry observes eligible pages, infers ongoing tasks, creates checklist entries, updates their progress, and detects interruption or completion. A compact extension side panel shows the task, intended finish condition, observed progress, next action and supporting evidence. Corrections are optional inline edits; the existing long form becomes an advanced/manual fallback.

An enabled session can cover permitted normal websites across tabs. Chrome's protected pages and inaccessible frames are not universal DOM access. Tracking has visible pause/site controls. Hosted processing needs a session/site-level disclosure and agreement; the old per-capture NVIDIA agreement does not silently authorize sending an entire browsing session.

The first implementation observes the user's actions. Its tools change ReEntry tasks/reminders, inspect permitted browser context and reopen work. Purchasing, submitting external forms, sending messages and entering credentials are not browser-agent tools in this iteration.

## Two complete initial journeys

### Shopping

1. Observe related product browsing and comparison across permitted tabs.
2. Infer a candidate intent: researching, comparing or buying a particular product. A product-page visit alone does not prove purchase intent. Update the candidate as cart/checkout evidence appears; let the user correct the goal inline.
3. For a buying task, generate a finish condition such as an order-confirmation state matching the relevant task/product. Preserve intermediate checkpoints such as product chosen, cart reached and checkout started.
4. If interrupted, retain the latest verified stage and a work link, with a resumable checklist entry and a configurable local reminder.
5. Mark completion automatically only after fresh, task-matched confirmation evidence. Clicking Buy, Place order or Submit is an attempt, not success. Failed payment, cancellation and unrelated historical orders do not complete this task.

Start with a clearly fictional commerce sandbox and a held-out variant. Do not create real Amazon orders to test completion. Reading an allowed real product page can be a supplementary smoke test; it does not establish reliable Amazon checkout support.

### Application

1. Recognize an application from visible page structure, instructions, field labels/statuses and user interaction.
2. Infer its goal and finish condition; track saved draft, present/missing materials, remaining sections and submission status without requiring manual goal/progress entry.
3. Distinguish draft saved, submit attempted, validation failed and submitted. Task-scoped receipt/success evidence establishes submission completion.
4. Reconcile changed requirements against the current task. Add a newly required referee without losing prior evidence or confusing AI observations with user-confirmed facts.
5. Apply the opt-in local interruption-reminder policy. Deadline reminders are deferred: missing/ambiguous deadlines stay unknown rather than invented.

Northstar supplies the controlled application journey. Its simulated attachment must stay labelled simulated; the agent must infer from the actual rendered page, without scenario IDs or expected answers in the model context.

## Architecture and reuse

The expanded [open-source comparison](AGENT_REUSE.md) records the current choices and alternatives. Evaluate the separately published Page Agent controller before building a DOM reader, and use the official LangGraph SQLite checkpointer before implementing checkpoint infrastructure. The patched reader and persistent checkpointer are verified Phase 0 integrations. Reuse Sauce Labs' sample shop for commerce, preserving its license and isolating its runtime.

`browser events → bounded observations → task inference → tool loop → durable task/checkpoint state → completion verification → checklist/reminders`

| Layer           | Reuse                                                                               | New responsibility                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Browser sensing | Existing WXT extension; Chrome content scripts, scripting, tabs and permission APIs | Automatic navigation/DOM/input-status observations across enabled sites, task/tab grouping and snapshot references |
| Agent runtime   | Prefer LangGraph.js, subject to a small integration spike                           | Bounded tool selection, branching, interruption/resume and persistent graph state                                  |
| Model boundary  | Existing NVIDIA/Ollama transports and validated server configuration                | A new provider-independent agent request/result contract; no provider SDK types in task storage                    |
| Product memory  | Server SQLite authority; existing revision/deletion patterns                        | Agent tasks, observations, evidence links, task versions and reminder records                                      |
| Scheduling      | Chrome alarms and notifications                                                     | Durable intent, deduplicated local delivery, cancellation and startup reconciliation                               |
| Interface       | Existing official registry components                                               | Automatic task feed, task detail/timeline, correction, pause and reminder controls                                 |

LangGraph provides stateful orchestration and can be used without LangChain model wrappers. It does not supply browser permissions, task inference quality or completion verification. Choose and test a persistent local checkpointer; an in-memory saver alone does not meet restart recovery. Reconcile graph state with product memory instead of maintaining two independent authoritative task records.

Background memory must work with the web app tab closed. The current web-origin Dexie database is not directly available to an extension service worker or the Node server. Preserve that legacy store for manual tasks. Phase 1 implements an authoritative local server-side SQLite observation store; Phase 2 extends this authority to agent tasks using the verified graph checkpointer. The extension queue is a delivery buffer; the dashboard reads the accepted task store. Reusing existing revision/deletion logic does not imply that all origins can share the existing database.

Browser Use is an open-source option for active browser automation. Our first need is to observe the user's existing browsing, so keep the extension as the sensor; do not add a second Python browser-control process merely to watch pages. Revisit Browser Use/CDP if delegated browser actions become an explicit later feature.

References checked October 22: [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview), [persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence), [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms), [notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications), [Browser Use](https://github.com/browser-use/browser-use).

## Observation and execution contract

- Observe navigation, relevant DOM changes, form input/change status, saves and submit attempts. Debounce and compare bounded snapshots; avoid a model call per keystroke or mutation. Ignore the extension's own UI and repetitive advertising/countdown mutations.
- Use visible text, semantic labels, links, roles and field completion markers. Exclude passwords, authentication tokens, hidden inputs, payment fields and unnecessary raw form answers. Keep raw observations short-lived and bounded; retain the minimum evidence supporting a checkpoint. DOM redaction must be tested, not assumed perfect.
- Treat page content as untrusted evidence. It cannot redefine system instructions, grant tools or schedule arbitrary effects. The host validates every tool call and its task/site scope.
- Keep the implemented model tools bounded: inspect recent history, read a task, propose/revise a task/checkpoint, propose completion, or ignore. Reminder controls and scheduling are deterministic host behavior, not model tools. No arbitrary JavaScript execution, shell, filesystem, browser-action or arbitrary remote-fetch tool.
- Persist observations and event IDs before processing; apply task updates with expected task versions and input digests. Reject stale inferences, duplicate effects and deleted-task replays. Agent-created progress remains attributed to agent observations, not written as a fabricated user confirmation into the current manual schema.
- Give each task a stable ID and independent workflow. Tab IDs are ephemeral. Reconcile related tabs without merging unrelated purchases or applications; support dismiss/correct/split when inferred grouping is wrong.
- Use a bounded loop and per-task call/time budgets, cancellation, cooldowns and visible model-unavailable states. Keep observation usable when inference is offline; queue bounded events rather than silently dropping them or guessing success.
- Add an authenticated, extension-bound local agent API/pairing path. The existing web-page-pulls-capture bridge alone cannot deliver unattended inference when the web app tab is closed. Keep model keys on the server and reject unpaired/cross-origin requests.
- Store reminder intent before calling alarms/notifications, use idempotent IDs, cancel on completion/deletion, and recreate missing alarms after worker/browser restart. Local Chrome reminders can be delayed while the device sleeps or browser is unavailable; do not promise delivery after browser exit. External calendar/email scheduling is a separate integration.

## Testable implementation order

The current authoritative sequence is [BUILD_PLAN.md](BUILD_PLAN.md): Phase 0 designs and prototypes the calm interface and tests the runtime/storage choice; Phases 1–4 add observation, task inference, completion and reminders; Phases 5–6 finish reliability, accessibility, evaluation and release. The [UI direction](UI_DIRECTION.md) is part of every phase, not a final decoration pass. Keep the contracts above as the technical acceptance baseline.

Success is demonstrated on two task families and unfamiliar variants. “Any task on any website” is a direction to evaluate, not an initial capability claim. No fixed implementation timeline or hackathon eligibility change is inferred here.

## Next concrete implementation task

Phases 0–5 are implemented. [Foundation evidence](AGENT_FOUNDATION.md), [browser setup](AGENT_OBSERVATION.md), [inference setup](AGENT_INFERENCE.md), [completion](AGENT_PROGRESS.md) and [interruption/reminder policy](AGENT_REMINDERS.md) record actual boundaries. LangGraph consumes accepted observations through the provider-independent structured interface; SQLite owns jobs, task revisions, effects and reminder reservations. Chrome supplies local scheduling/delivery. The model cannot schedule reminders or execute external website actions. Native permissions, desktop notification banners and accessibility remain manual gates. [Calm live screens, history and refresh/focus reliability](AGENT_CALM.md) are implemented. Next is Phase 6 of [BUILD_PLAN.md](BUILD_PLAN.md): complete-agent evaluation and demonstration. No universal browser understanding or deadline reminder delivery is claimed.
