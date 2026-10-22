---
doc: prd
status: draft
record: retrospective
---

# ReEntry — Product Requirements

An accessible recovery card for a person returning to interrupted work. This document records the implemented product and the author's supplied decisions after implementation began. It does not claim a pre-build interview or learner review.

Source: [scope > The Unique Kernel](scope.md#the-unique-kernel).

## The Core Journey

1. Select instructions on an ordinary external webpage and invoke the Chrome extension.
2. Review the exact selection, then save a goal, work link, user-confirmed progress, next action and optional supporting links.
3. Close the app and return using the same browser profile and app address.
4. Open a source check for the task, recapture the equivalent instruction section, and confirm that association.
5. Inspect old/current evidence and whether the captured text changed. Failed or incomparable checks remain unverified.
6. Optionally request AI interpretation. NVIDIA requires a fresh, explicit processing agreement; local Ollama is an alternative configuration.
7. Inspect exact quotes, correct the proposed action and save the review. Continue opens the saved work link.
8. Correct a checkpoint, restore earlier contents as a new revision, or delete its data.

Source: scope > The Core Loop and What "Working" Looks Like.

## Screens and Layout

- Extension preview: captured text, source address, confirmation/discard, pending captures and actionable capture failures.
- Task library and capture form: saved tasks, reviewed source, progress confirmation and checkpoint saving.
- Source check: task identity, explicit check action, immutable before/after evidence, textual result and comparison association.
- Recovery: goal and confirmed progress, interpreted change with evidence, one reviewed next action, model processing disclosure and manual recovery/materials.
- Checkpoint editor: current saved facts, recoverable draft, save revision, history/restore and deletion confirmation.

## Look and Feel

Calm, single-column reading order, standard shadcn components, explicit labels and visible focus. Secondary details use disclosure controls. Meaning does not depend on color, timers or animation. This carries scope > Inspiration & Identity forward; it does not invent a custom design system.

## Features and Behavior

### Evidence and confirmed progress

Exact captured text, URL, detected section, capture time and digest remain immutable. Capture time is not website edit time. A text difference is not itself a material requirement change. Equal captured text does not verify the whole page. Only the user's confirmed record establishes progress.

### Recovery and continuation

The configured model interprets a fixed, bounded context. Valid references and quotes are required, but do not prove semantic truth. Model failure preserves saved context and manual recovery. No autonomous external actions, implicit provider fallback, autofill or form submission occur. The user reviews any proposed next action before assisted continuation.

### Corrections and persistence

Save creates a new revision with optimistic conflict checking. Retain the latest ten revisions including the current one. Restore creates a later revision with earlier contents. Drafts remain separate from confirmed checkpoints. Failed storage writes remain unsaved; they never cause acknowledgement of capture delivery.

### Deletion

Task deletion removes associated history, evidence, proposals and drafts. Delete-all includes existing pending captures. Minimal identifier/timestamp markers reject replay; an outbox retries extension cleanup. New explicit captures remain possible. Deletion is not a forensic secure-erasure guarantee.

## States and Boundaries

- Empty/no selection: explain how to capture; do not read the entire page automatically.
- Restricted page, editable field or unsupported selection: explain the capture boundary without inventing evidence.
- Offline app/extension: pending capture and explicit retry; no false save success.
- Awaiting/failed/incomparable check: requirements unverified.
- Changed/unchanged captured material: present scope and times honestly.
- Model unavailable/invalid/refused/cancelled: preserve facts and offer manual recovery.
- Conflicting tab: preserve visible draft, require loading current facts for review before saving.
- Missing/deleted task: actionable unavailable state, no recreation by delayed work.

## Product Decisions

The author chose one browser extension plus one web app, reuse of open-source capture/storage/testing tools, a small model-independent harness, NVIDIA support, and autonomous completion of the remaining implementation. No personal diagnosis, coding experience, learning outcome or eligibility is inferred.

## What We're Building

The complete local capture → pause → recapture → evidenced recovery → correction/restore → continuation journey, plus reproducible tests and release materials.

## Deferred From the POC

Electron, accounts, cloud sync/hosting, store publication, background monitoring, universal website support, PDF/OCR ingestion, form-field restoration and extra providers. Source: scope > Explicitly Cut.

## Open Questions

Native VoiceOver acceptance, personal eligibility, genuine learner review/reflection and final contest submission must be recorded from actual evidence. These are not retroactively completed by this document.
