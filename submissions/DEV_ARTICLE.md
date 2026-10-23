---
title: "ReEntry: a quieter return to unfinished work"
tags: devchallenge, hf26challenge
published: false
---

Prepared entry for [DEV’s Week 3 challenge, Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19). This technical draft was prepared with AI assistance; participant review and publication are pending.

## What I Built

ReEntry keeps a small, correctable account of unfinished browser work: the goal, what finishing would look like, meaningful progress, supporting observations and one next action.

Consider an application saved with one referee. While the task is put aside, the instructions change to require two. Returning to the page should reveal the additional referee and preserve the earlier draft progress. A saved draft, a failed submission attempt and a submission receipt must remain distinct.

The first ReEntry release required selecting instructions and filling a checkpoint form. The current browser agent observes enabled sites and infers the task and finish condition. A product visit starts as tentative research. Cart activity can turn that same task into a purchase, with an order confirmation as its proposed finish condition. The person can correct those conclusions, pause observation or dismiss the task.

The companion and home keep the next action visible. Source quotes, revision history and settings are expandable. Minor background changes wait while a task has keyboard focus. Reminders are opt-in, follow quiet hours and never derive a deadline from arbitrary website text.

## Demo

[Application and shopping recordings, captions and source](https://github.com/kirmada1509/reentry/releases/tag/v0.2.0).

These are uninterrupted recordings of actual NVIDIA inference with the production extension and web app. Northstar is a fictional application; the shop is a pinned local copy of Sauce Labs’ MIT sample app. No real application, payment or order is made. Each journey includes a brief interruption, unfinished validation failure, final review, matching confirmation and a separate browser-restart check. The 45-minute reminder threshold is not accelerated or demonstrated.

Native VoiceOver, actual browser zoom, side-panel placement and OS notification acceptance remain manual gates. Automated keyboard/axe/reflow checks are recorded; complete accessibility conformance is not claimed.

## Code

[Public MIT repository](https://github.com/kirmada1509/reentry) · [Reproduction and evaluation](https://github.com/kirmada1509/reentry/blob/main/docs/AGENT_RELEASE.md) · [Actual results and retained failures](https://github.com/kirmada1509/reentry/blob/main/docs/TEST_RESULTS.md).

The model has a narrow vocabulary: inspect recent observations, read saved task history, propose an update, propose completion or ignore the page. It cannot execute JavaScript, click a site, send a message or schedule a reminder.

## How I Built It

The WXT extension reuses [Page Agent’s controller](https://github.com/alibaba/page-agent), adapted for passive extraction and data minimization. It omits editable field values and arbitrary JavaScript execution. Observation has explicit site scope, validated browser senders and a bounded delivery queue. A local Next.js service owns the durable SQLite records.

[LangGraph](https://github.com/langchain-ai/langgraphjs) runs the bounded reasoning/read/accept loop with SQLite checkpoints. Its graph memory holds a job identifier; product records own task revisions, accepted effects and replay protection. Restarting a worker cannot turn an already accepted effect into a second task.

The demonstrated model is NVIDIA’s `nvidia/nemotron-3-ultra-550b-a55b`. Its [model card](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard) identifies open weights under OpenMDW-1.1; hosted API terms are separate. NVIDIA processing is disclosed and requires agreement. The key stays server-side. This hosted demonstration does not run offline. An optional Ollama adapter uses the same provider-independent interface, but fresh automatic-agent quality is not claimed for every alternative model.

The host decides what a completion proposal can mean. It requires a fresh receipt, a matching task, an eligible earlier review, browser-owned tab continuity, permitted scope and unchanged context. Known old receipts, another tab’s confirmation and cancelled checkouts cannot silently finish an ongoing task. The label says “Confirmation observed”: website text is not a signed institutional or payment guarantee.

Live testing made this boundary visible. In the first frozen 25-step cohort, the model proposed three unsafe completions. The harness rejected all three. There were zero accepted false completions in 26 negative state checks, with no missing task checks. Overall, 21/25 steps passed; the remaining classification error was a changed requirement labelled as a saved draft. Discovery errors were 0/12, and wrong merges were 0/1. Those are small, constructed denominators, not general accuracy estimates. The current exposed-cohort replay completed 25 steps without provider unavailability: 23 passed, including all ten regression steps. Two unsafe completion proposals after cancellation/from an old receipt were rejected. Accepted false completions remained 0/26, with no missing checks; the strict evaluator still exits 1. It used 24 calls for 24 model jobs plus one planned correction. Empirical median latency was 2,507 ms and p95 5,215 ms, excluding the deliberate 60-second request spacing. Earlier exposed-cohort runs, regressions and throttling remain in the evidence.

Full-page application testing found output-shape failures too: a valid response cited 24 source spans, and another generated a progress summary longer than the display limit. The host now validates every reference in a bounded list before retaining three. An invalid final reference still rejects the whole proposal. A single optional prose-shortening call may replace only an overlong summary, after all other fields and citations validate. It consumes the existing three-call budget and cannot alter task identity, stage, evidence or completion permission. Provider errors are not automatically retried. In the successful application take, this shortened a 252-character summary to 102 characters; five accepted updates used six calls. The captured earlier 342-character failure and failed 255-character shortening attempt remain in the evidence. This demonstrates improved format compatibility, not a general accuracy gain.

## Why Does Open Innovation Matter?

The open reader and harness made their actual behavior inspectable. ReEntry can disable reader capabilities it does not need, limit what reaches the model, inspect persistent effects and test the acceptance logic outside the interface. Those controls define how a task can change.

The provider interface also keeps task state independent of an inference vendor’s SDK objects. Changing models still requires a real evaluation; protocol compatibility does not establish equivalent behavior. No comparison here proves superiority over a closed model, lower inference cost or universal privacy. The practical benefit is a mechanism that can be inspected, changed and reproduced.

## The Lazy Payoff

The manual route requires three task descriptions: goal, confirmed progress and next action. The automatic browser recordings enter none of those task-description fields into ReEntry. The person still completes the external application or checkout and can correct an inference when needed.

That is an observed reduction in task-entry work in scripted examples. No user study measured time saved, working-memory benefit or clinical effectiveness. The useful payoff is narrower: return to a preserved, evidenced next step without first reconstructing and typing the whole task again.

ReEntry inherits the credited `agent-starter` scaffold, registry UI and infrastructure. Original work includes the observation boundary, task/progress rules, effect transactions, evidence validation, recovery controls, calm interface and evaluations. Codex assisted with code, tests and this draft. Learn documents preserve their retrospective status and pending human reviews. No partner category, personal reflection or contest receipt is asserted.
