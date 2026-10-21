---
doc: scope
status: draft
---

# ReEntry

An accessible recovery card that helps a student return to interrupted work with their goal, confirmed progress, materials, changed instructions, and one concrete next action in view.

## The Unique Kernel

ReEntry checks whether the saved intention still makes sense against newly captured instructions. It connects an evidenced requirement change to the user's unfinished work, keeps confirmed progress separate from AI interpretation, and lets the user inspect and correct the proposed continuation.

## Who It's For

A student completing an application who has ADHD, working-memory difficulties, or frequent interruptions. After a break, they need to remember what they completed, find the right material, and establish whether the instructions still apply. The product hypothesis is less repeated context reconstruction and fewer missed steps; no clinical benefit is claimed.

## The Core Loop

1. On an external instruction page, select relevant text and invoke ReEntry.
2. Review the capture, add the goal and work link, and confirm progress plus the intended next action.
3. Pause, then return to the saved task later.
4. Reopen the instruction page and explicitly capture the equivalent section again.
5. Inspect the recovery card: confirmed progress, evidenced changes, unresolved questions, and one proposed action. Correct it if needed, then reopen the work link.

The user controls capture and confirmation. ReEntry says when instructions could not be checked; it never presents a failed comparison as unchanged. Continue reopens a reviewed link, without promising exact field restoration.

## Inspiration & Identity

The learner's [original concept](../reentry.md) calls for calm, accessible presentation, logical reading order, visible focus, descriptive controls, large-text support, and meaning that does not depend on color or animation. Preserve these qualities through a keyboard and screen-reader journey. Do not add timers, streaks, or distracting interactions.

Use the existing product starter and the [researched reusable components](../docs/REUSE.md). The learner specifically requested existing tools and online test sites instead of custom capture infrastructure or sandbox applications. Detailed screen and visual choices belong in the PRD.

## Why This Matters to the Learner

The learner wants a strong, working ReEntry submission for Task Forge, Build With AI: Basics, and DEV Hacktoberfest Week 3. They asked for clear explanations, open-source reuse, and a phase-wise testable path into building. No personal diagnosis, user-study result, or programming experience is inferred.

## What "Working" Looks Like

Capture scholarship-like instructions requiring one referee. Save the application goal and user-confirmed transcript progress, then pause. Change a clearly labeled controlled instruction fixture at the same URL to require two referees. Recapture through the actual extension.

The running open-weight model identifies that change with the old and current excerpts. The card preserves the transcript progress, proposes adding the first referee, and keeps the second visible as subsequent work. The user can inspect, edit, and restore checkpoints, then reopen the work link. The journey and its failure paths work with keyboard and screen reader.

Use an existing generic test form or licensed derivative for the work destination; the controlled instructions are small fictional fixtures, not a new scholarship application. Disclose them as such. A real model run and complete demo establish working behavior; a mocked response alone does not.

## The POC Boundary

- One local user, one supported browser, extension plus the existing web app as one product.
- User-triggered selected-text capture and recapture on ordinary top-level web pages.
- Persistent goal, work/material links, confirmed facts, source snapshots, and checkpoints.
- A readable evidence-based recovery card with one next action, correction, and restore.
- Substantive open-weight interpretation, with manual recovery when inference is unavailable.
- Existing open-source infrastructure and test websites, plus only the missing before/after instruction fixtures and task-specific tests.
- Actual Learn planning artifacts, public licensed source, and a working short demo for the intended submissions.

## Later

Additional supported page types, optional readable-page capture using an existing extractor, explicit PDF/DOCX imports, and an Electron version if desktop workflows prove valuable. Broader user testing can validate the recovery hypothesis after the core experience works.

## Explicitly Cut

- Continuous monitoring and whole-browser capture: the first release checks on explicit user action.
- Automatic progress detection, form autofill, and application submission: confirmed progress and continuation stay under user control.
- Universal website support and exact field restoration: these require site-specific reliability work outside this proof of concept.
- A separate scholarship application, custom extraction parser, and custom sandbox platform: reuse existing tools and small fixtures.
- Accounts, cloud sync/hosting, extra browsers, store publication, and decorative sponsor integrations: they are not needed to demonstrate the shared recovery journey.

## Review Status

Draft generated during the actual `2-scope` workflow from the learner's supplied brief and subsequent decisions. Not yet learner-approved. Detailed product and technical plans follow this review; no implementation result is claimed.
