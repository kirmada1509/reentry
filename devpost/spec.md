---
doc: spec
status: draft
record: retrospective
---

# ReEntry — Technical Specification

Recorded after the initial implementation, using the supplied concept, existing plans and actual code. Learner review is pending; no plan-first sequence is claimed.

## How This Works, In Plain Language

A Chrome extension reads only text the user explicitly selects. The local web app stores a confirmed checkpoint in this browser. A later source capture provides evidence to compare. A small server-side AI connection proposes a continuation; the user reviews it before reopening their work.

## The Core Journey Through the System

Extension toolbar action grants activeTab → plain-text preview → native website/extension messaging → validated capture → IndexedDB transaction → durable acknowledgement. A task-bound source tab links recapture to its original evidence. The server runs a fixed prepare/call/validate workflow, and browser storage rejects results whose inputs have changed. PRD ref: The Core Journey.

## Stack

TypeScript, Next.js 16.4.2, React 19.3, Zod 4, WXT 0.21.4, Dexie 4.4.6 and jsdiff 9. Official shadcn components supply UI. Playwright, MSW Serve and axe supply test infrastructure. Exact dependency pins are in the committed package manifest and lockfile. Technical references and licenses: [reuse](../docs/REUSE.md), [provenance](../docs/PROVENANCE.md), [third-party notices](../THIRD_PARTY_NOTICES.md).

## Where It Runs and How Someone Tries It

Node 22.23.2 and pnpm 12.5.1; local Chrome. Run `pnpm bootstrap`, `pnpm extension:build`, then `pnpm dev`. Open http://127.0.0.1:3000 and load `extension/.output/chrome-mv3` unpacked. Retain this exact origin/profile. The bundled public manifest key stabilizes the unpacked extension ID; it is not a private credential. Model setup: [NVIDIA](../docs/NVIDIA.md) or [Ollama](../docs/PHASE3.md). Do not put real keys in example files or client settings.

## Look and Feel

Compose registry Card, Alert, Badge, Button, Dialog, Collapsible, Checkbox and form fields in framework pages. Use shipped variants and permitted layout utilities. No custom CSS or changes to vendor assets. PRD ref: Look and Feel; Screens and Layout.

## Components

- Capture/bridge: validates exact sender origin/port, UUIDs, size/freshness and task association; WXT persists pending transfers. PRD ref: Evidence and confirmed progress.
- Task storage: Dexie transactions, migration, revisions, drafts, deletion markers and extension-cleanup outbox. PRD ref: Corrections and persistence; Deletion.
- Sources: immutable snapshots, equivalent-section confirmation, text comparison and honest unverified states. PRD ref: Evidence and confirmed progress.
- Recovery: provider-independent interface, bounded model call, exact-quote/progress validators, input digest, reviewed action and guarded continuation. PRD ref: Recovery and continuation.

## Data Model

Database version 4 preserves the earlier task/check/recovery stores and adds revisions keyed by task/revision, drafts, deletion markers and cleanup items. Existing tasks seed revision history during migration. SavedTask has a positive monotonic revision. Latest ten snapshots are retained. Source checks optionally record taskRevision; legacy checks belong to revision one. AI records remain separate from confirmed facts and are bound to an input digest. Minimal deletion IDs/timestamps prevent replay; delete-all sets a capture cutoff. Browser storage is neither an encrypted vault nor an external backup.

## File Structure

- `src/app/`: task library, source check, recovery, editor and thin HTTP routes.
- `src/features/`: capture, tasks, sources and recovery behavior.
- `src/lib/ai/`: model boundary and explicit NVIDIA/Ollama adapters.
- `extension/`: WXT worker, preview and bounded native bridge.
- `tests/`: storage/provider cases, real-extension journeys and controlled static/MSW fixtures.
- `devpost/`: retrospective planning records and app map; private learner profile is ignored.

## External Services and Dependencies

Ollama uses its configured loopback API. NVIDIA uses the official fixed HTTPS chat-completions endpoint with a server-only NVIDIA_API_KEY. Current configuration is NVIDIA Nemotron Ultra, text output, thinking off; support/quality is model-specific. Requests have a 30-second deadline and no automatic retry/fallback. Hosted processing requires agreement bound to current configuration. Account limits and cost are not guaranteed; other provider keys are unused. See [harness](../docs/HARNESS.md) and [NVIDIA setup](../docs/NVIDIA.md).

## Important Failure Modes

- Storage failure → visible unsaved state, preserved input, no acknowledgement; explicit retry.
- Stale task/source/model agreement → reject outdated work, request review/recheck; never overwrite newer facts.
- Worker/browser/app interruption → bounded pending capture, retained confirmed data, recovered draft where its write succeeded; lost task-tab association requires a fresh source check.
- Extension unavailable during deletion → local deletion remains committed and cleanup retries on reconnection.

## Verification

`pnpm check`, builds, `pnpm test:e2e`, production-mode browser acceptance, smoke and explicit live-model evaluation. Axe does not establish full screen-reader conformance. Actual results and limitations live in [test results](../docs/TEST_RESULTS.md).

## What Was Simplified and Why

A fixed harness instead of an autonomous agent framework; selected text instead of universal extraction; local single-user storage instead of accounts/cloud sync. These choices preserve the demonstrable recovery kernel.

## Decisions and Open Issues

The author's model-framework question resulted in the existing small provider boundary. Later NVIDIA integration demonstrates replacement without changing capture or task storage. Agent implementation choices include optimistic concurrency and a deletion outbox. Retrospective documents do not establish prescribed curriculum completion; actual learner review, native accessibility observations and submission attestations remain pending where unperformed.
