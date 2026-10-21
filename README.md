# ReEntry

An accessible recovery card for unfinished work: preserve the goal, confirmed progress, materials, changed instructions, and one concrete next action.

**Status:** Phases 1–2 are implemented: capture instructions, save a persistent checkpoint, return to its source, and compare a fresh selection with the original evidence. Task-bound recapture preserves confirmed progress and the saved action. AI interpretation begins in Phase 3. Formal Learn planning reviews remain incomplete; the author explicitly requested implementation.

## Start locally

```sh
pnpm bootstrap
pnpm extension:build
pnpm dev
```

Open **http://127.0.0.1:3000**. In Chrome's `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/.output/chrome-mv3`. Select instructions on another page and invoke the extension's toolbar action or shortcut. Review the capture, confirm, then save a checkpoint in ReEntry. Follow the [Phase 1 walkthrough](docs/PHASE1.md) for sandbox and retry instructions.

The starter pins Node 22.23.2 and pnpm 12.5.1. No cloud credentials or model runtime are needed for Phases 1–2. Return using the same browser profile and exact app address.

## Project documents

- [Original product concept](reentry.md)
- [Bounded product brief](docs/PRODUCT.md)
- [Scope, architecture, and testing sandboxes](docs/BUILD_PLAN.md)
- [Phase-wise implementation plan and test gates](docs/IMPLEMENTATION_PLAN.md)
- [Build checklist and current phase](docs/BUILD_CHECKLIST.md)
- [Working Phase 1: setup and walkthrough](docs/PHASE1.md)
- [Working Phase 2: return and compare](docs/PHASE2.md)
- [Verification evidence](docs/TEST_RESULTS.md)
- [Simple harness and replaceable models](docs/HARNESS.md)
- [Required testing sandboxes](docs/BUILD_PLAN.md#required-testing-sandboxes)
- [Open-source tools and online sandbox alternatives](docs/REUSE.md)
- [Event requirements and deadlines](docs/HACKATHONS.md)
- [Starter and Learn provenance](docs/PROVENANCE.md)
- [Setup and verification](docs/SETUP.md)
- [Current handoff](docs/WORK.md)
- [Learn workflow status](devpost/README.md)

The Devpost Learn process requires genuine scope/PRD/spec reviews before its formal build workflow. Those reviews are pending; do not present this implementation as completion of that curriculum. Preserve actual documents and review history for submission.

## Engineering

Read [AGENTS.md](AGENTS.md). Use the official shadcn registry workflow. `pnpm check` includes web and extension type checks; `pnpm build` and `pnpm extension:build` compile each surface. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e` for the real-extension capture and comparison suite. Tests allocate ports and temporary profiles and build a separate test extension. The original starter guide is preserved in [docs/STARTER-README.md](docs/STARTER-README.md).

Built from [kirmada1509/agent-starter](https://github.com/kirmada1509/agent-starter), with history and MIT license preserved. The source remote is named `upstream`; a separate ReEntry GitHub repository has not been created or published. UI attribution remains in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
