# ReEntry

An accessible recovery card for unfinished work: preserve the goal, confirmed progress, materials, changed instructions, and one concrete next action.

**Status:** The core recovery journey, checkpoint editing, ten-revision history/restore, draft recovery, conflict protection and deletion cleanup are implemented. The screens use accessible registry components and automated axe/focus/reflow checks. Production browser acceptance and supporting evidence are recorded; native VoiceOver and manual zoom/text-setting acceptance remain open because the Mac was locked during testing. See [release preparation](docs/RELEASE.md) and [actual evidence](docs/TEST_RESULTS.md).

ReEntry works with local Ollama or NVIDIA-hosted models behind one provider-independent harness. NVIDIA processing needs explicit agreement and a server-only key; no credentials are shipped in the extension. Formal Learn documents are retrospective drafts with unperformed human reviews clearly recorded.

## Working demo

[Watch/download the 1:48 real-model demo](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.mp4) · [SRT captions](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.srt) · [VTT captions](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.vtt) · [Preview release and screenshots](https://github.com/kirmada1509/reentry/releases/tag/v0.1.0)

The recording uses fictional instruction changes and actual NVIDIA inference, with user review, correction, restore and continuation. GitHub video delivery is prepared; AI Basics still needs a public YouTube/Vimeo upload. Native accessibility acceptance and human Learn/submission activities remain explicitly pending.

## Start locally

```sh
pnpm bootstrap
./start.sh
```

Stop with `./stop.sh`. The matching commands are `pnpm local:start` and `pnpm local:stop`. Start builds the extension and web app, then runs the production app in the background without live reload. Use `pnpm dev:status` and `pnpm dev:logs` to inspect it. Stop an already running managed server before starting again; the scripts refuse active servers/occupied ports before rebuilding and preserve saved browser data. The shell scripts support macOS/Linux and can be invoked by their full path from another directory. Development commands (`pnpm dev` / `pnpm dev:start`) remain separate from this normal-use launcher.

Open **http://127.0.0.1:3000**. In Chrome's `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/.output/chrome-mv3`. Select instructions on another page and invoke the extension's toolbar action or shortcut. Review the capture, confirm, then save a checkpoint in ReEntry. After updates, rebuild and choose Reload for ReEntry in Chrome extensions; keep the same extension ID, app origin and browser profile. Follow the [Phase 1 walkthrough](docs/PHASE1.md) for sandbox and retry instructions.

The starter pins Node 22.23.2 and pnpm 12.5.1. No cloud credentials or model runtime are needed for Phases 1–2. Return using the same browser profile and exact app address.

For a presentation-ready external task, run `pnpm sandbox:sites` in another terminal and open the printed **Northstar demo portal** address. It includes a saved application draft, sample transcript, preparation checklist and switchable referee requirements. Follow the [sandbox walkthrough](docs/SANDBOX.md) for the complete interruption-and-return demo.

## Project documents

- [Original product concept](reentry.md)
- [Bounded product brief](docs/PRODUCT.md)
- [Scope, architecture, and testing sandboxes](docs/BUILD_PLAN.md)
- [Phase-wise implementation plan and test gates](docs/IMPLEMENTATION_PLAN.md)
- [Build checklist and current phase](docs/BUILD_CHECKLIST.md)
- [Release setup, verification and limitations](docs/RELEASE.md)
- [Retrospective product requirements](devpost/prd.md)
- [Retrospective technical specification](devpost/spec.md)
- [App map](devpost/app-map.html)
- [Submission preparation](submissions/)
- [Working Phase 1: setup and walkthrough](docs/PHASE1.md)
- [Working Phase 2: return and compare](docs/PHASE2.md)
- [Phase 3: local AI recovery](docs/PHASE3.md)
- [NVIDIA model setup and hosted processing](docs/NVIDIA.md)
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

Read [AGENTS.md](AGENTS.md). Use the official shadcn registry workflow. `pnpm check` includes web and extension type checks; `pnpm build` and `pnpm extension:build` compile each surface. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e` for the real-extension suite. Use `REENTRY_TEST_PRODUCTION=1 pnpm test:e2e` for production builds; [hosted CI passed](https://github.com/kirmada1509/reentry/actions/runs/39753513724) with 86 project tests, 42 browser tests and production smoke. `node scripts/publication-audit.mjs` checks history/tracked files and built browser assets for focused credential patterns and configured key values. Tests allocate ports and temporary profiles and build a separate test extension. The original starter guide is preserved in [docs/STARTER-README.md](docs/STARTER-README.md).

Built from [kirmada1509/agent-starter](https://github.com/kirmada1509/agent-starter), with history and MIT license preserved. The starter source remote remains `upstream`; the separate ReEntry repository is https://github.com/kirmada1509/reentry. Publication status is recorded in the release evidence. UI attribution remains in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
