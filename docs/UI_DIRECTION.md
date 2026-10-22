# ReEntry — calm visual and interaction direction

Proposed October 22, 2026. Design brief for the automatic browser agent. This describes the intended next UI, not a redesign already implemented. Build order and gates: [BUILD_PLAN.md](BUILD_PLAN.md).

October 23 update: the labelled Phase 0 [fictional preview](AGENT_FOUNDATION.md#try-the-interface) implements the home, companion and detail baseline with sourced Stone/Emerald tokens. Live agent bindings and the native companion remain later phases. This brief continues to define their intended behavior.

## Design intent

ReEntry should make returning feel manageable. It should show a useful place to begin, without turning unfinished work into a performance dashboard. Beauty should come from composition, typography, materials and restraint, with strong accessibility throughout.

Visual direction:

- A warm stone/off-white canvas, gently separated surfaces and dark charcoal text. Select the exact accessible registry theme in Phase 0.
- One restrained sage/forest-green accent for the main action and meaningful progress. Color is never the sole status cue; long-form text stays dark and readable.
- Geist or another single readable registry-provided sans family; clear heading/body hierarchy, comfortably sized body copy, short paragraphs and readable line lengths.
- Generous spacing, quiet borders, restrained rounding and consistent control placement. Avoid nested stacks of bordered cards when a list and spacing communicate better.
- Minimal icons, used with text. Site identity helps recognition; decorative charts, gradients, illustrations and dense metric tiles are unnecessary for this product.
- Light mode first. Dark mode is a coherent later theme state after the main journey passes; do not maintain two unfinished visual systems.

Use existing official shadcn components/blocks. Prototype theme and typography acquisition through the registry workflow first. If that workflow cannot express the selected theme, make a deliberate, documented adoption-tool change rather than silently editing vendor styling or hashes. No new primitive component library is proposed.

## Home — a place to return

Start with “Welcome back” and one useful task to resume. Follow with a short list of other ongoing tasks and a quiet Waiting group. Finished work is available without dominating the page. Use a lightweight navigation shell rather than the analytics/chart content of a dashboard block.

An example selected task:

> Finish your Northstar application
>
> Your sample transcript is saved. The requirements now ask for a second referee.
>
> Next: add the additional referee.
>
> **Resume application** · Why this?

The task title and next action are readable before status metadata. Keep provider names, model output and raw event history out of the main card; expose them where useful in details/settings. A candidate inferred task is labelled as a possibility, not a confirmed obligation.

## Companion — beside the actual work

Use Chrome's native side panel, not an injected overlay that covers the external site's controls. The panel remains available as the user moves between relevant tabs, subject to browser permission and behavior. [Chrome side-panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).

Reading order:

1. Current task and a quiet monitoring/paused/connection indicator.
2. “Finished when…” with a short, correctable completion condition.
3. The last meaningful checkpoint and the next useful action.
4. One contextual action: resume, view the missing step, or review an uncertain inference.
5. “Why this?” disclosure with the supporting observations.

Pause/site controls stay reachable without overwhelming the task. “That’s not my task” or “I’m only researching” should take a small inline interaction. No giant goal/progress/next-action form is required for ordinary use.

## Detail — trustworthy without being noisy

Show the goal, completion condition, observed progress, meaningful changes and next action. A short checkpoint timeline can include “Draft saved,” “Requirement changed” and “Submission confirmation observed.” Each entry can expand to its evidence.

Distinguish agent-inferred interpretations, directly observed signals and explicit user corrections. Show uncertainty with plain wording such as “I couldn’t verify submission.” Do not show numeric model confidence as a calibrated probability unless evaluation establishes that meaning.

History, correction, dismissal, reminder controls and deletion are secondary actions. Preserve previous evidence when the plan changes. A failed inference does not erase the task or turn it into a blank error screen.

## Onboarding and settings

Explain what is observed and what is sent to the selected provider before assistance starts. Enable chosen site coverage, reminders and processing mode once. Keep site exclusions, pause, retention and processing agreement available later.

Permission denied, unsupported page, model unavailable and app disconnected have distinct calm states. “Observing the page” does not imply “AI has checked the latest changes.” The UI must remain honest while catching up.

## Calm behavior is part of acceptance

- No focus stealing, automatic scrolling or reordering of a focused item when background updates arrive.
- Stable task identities and grouped observations; no new task/toast for every page click.
- No constantly pulsing agent indicator, typing simulation, timer or constantly changing progress percentage.
- Small background updates are silent. Announce meaningful changes concisely, without reading an entire timeline through a live region.
- Completion can settle into a quiet labelled state. No required celebration or animation. Respect reduced motion.
- Reminders are opt-in during setup, configurable and rate-limited. Snooze and dismiss are easy. Use supportive wording, not “You are behind” or alarm-colored overdue counters.
- One clear primary action per screen; evidence and technical details use disclosures.
- Preserve typed corrections and their focus during inference, reconnects and late results.

## Required design states

Prototype and test these before considering the design complete:

| State                          | What it should communicate                                   |
| ------------------------------ | ------------------------------------------------------------ |
| First visit / no tasks         | What ReEntry does and how to enable it                       |
| Observing, no clear task       | Nothing needs your attention; no invented task               |
| Candidate intent               | A possible task, easy to correct or dismiss                  |
| Active task                    | What you are doing and what finishing means                  |
| Interrupted / waiting          | What is preserved and the useful next step                   |
| Changed instructions           | The relevant change, evidence and revised next action        |
| Completion observed            | Which finish condition was met and what supports it          |
| Unverified / model unavailable | What is known, what could not be checked, and how to recover |
| Paused / permission denied     | What is no longer being observed and how to change it        |
| Reminder / snoozed             | Why it exists, when it will return, and how to stop it       |

## Visual verification

Compare real screenshots of empty and populated states at desktop, narrow window and actual Chrome side-panel sizes. Inspect short and long task titles, long links, several tasks, slow inference and errors. Verify contrast, keyboard navigation, visible focus, zoom/reflow, 200% text, reduced motion and screen-reader announcements. Record native checks that cannot be performed as pending.

The phase-0 prototype is a concrete design artifact, labelled as using fictional data. It is not proof of a working agent. The product is ready only when the same design works with actual observations and model results.
