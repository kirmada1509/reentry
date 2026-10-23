# ReEntry

A calm browser task agent that notices unfinished work, preserves progress and helps you return to the right next step.

**Status:** The core recovery journey, checkpoint editing, ten-revision history/restore, draft recovery, conflict protection and deletion cleanup are implemented. The screens use accessible registry components and automated axe/focus/reflow checks. Production browser acceptance and supporting evidence are recorded; native VoiceOver and manual zoom/text-setting acceptance remain unperformed after earlier native attachment attempts failed. See [release preparation](docs/RELEASE.md) and [actual evidence](docs/TEST_RESULTS.md).

ReEntry works with local Ollama or NVIDIA-hosted models behind one provider-independent harness. NVIDIA processing needs explicit agreement and a server-only key; no credentials are shipped in the extension. Formal Learn documents are retrospective drafts with unperformed human reviews clearly recorded.

**Automatic-agent preview:** Phases 0–5 are implemented. Phase 6 adds a frozen evaluation corpus, reproducible real-model recordings and bounded output repair. [Evaluation, demonstrations and remaining gates](docs/AGENT_RELEASE.md). Live tasks and next actions come first, with quiet background updates, revision history and accessible correction/recovery controls. Automatic discovery, evidence-linked progress, matching completion and optional local reminders remain in the same app. [Calm interface and reliability](docs/AGENT_CALM.md). Open [browser setup](http://127.0.0.1:3000/observe), pair the extension, enable a site, then separately agree to automatic processing by the named model. The app and companion show tentative research, ongoing work, evidence and concise corrections. [Setup](docs/AGENT_INFERENCE.md) and [progress/completion rules](docs/AGENT_PROGRESS.md). [Return and reminder setup](docs/AGENT_REMINDERS.md). The existing manual release and [labelled design preview](http://127.0.0.1:3000/preview) remain available.

## Automatic demonstrations

[Application: 1:24](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-application.mp4) · [SRT](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-application.srt) · [VTT](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-application.vtt)

[Shopping: 1:14](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-shopping.mp4) · [SRT](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-shopping.srt) · [VTT](https://github.com/kirmada1509/reentry/releases/download/v0.2.0/reentry-agent-shopping.vtt) · [Technical preview assets](https://github.com/kirmada1509/reentry/releases/tag/v0.2.0)

Both are uncut browser recordings of actual NVIDIA inference on fictional local sites. They show automatic tasks, interruption/return, validation versus completion and retained task history. Application requirements change during the journey. No task/model result is seeded. Five accepted jobs use six model calls for the application (one summary repair) and five for shopping. A separate restart check passes for both. The complete trial ledger retains failed takes; these selected demonstrations do not establish general website accuracy. [Protocol and evidence](docs/AGENT_RELEASE.md).

## Earlier manual demo

[Watch/download the 1:48 real-model demo](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.mp4) · [SRT captions](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.srt) · [VTT captions](https://github.com/kirmada1509/reentry/releases/download/v0.1.0/reentry-demo.vtt) · [Preview release and screenshots](https://github.com/kirmada1509/reentry/releases/tag/v0.1.0)

The recording uses fictional instruction changes and actual NVIDIA inference, with user review, correction, restore and continuation. GitHub video delivery is prepared; AI Basics still needs a public YouTube/Vimeo upload. Native accessibility acceptance and human Learn/submission activities remain explicitly pending.

## Start locally

```sh
pnpm bootstrap
./start.sh
```

Stop with `./stop.sh`. The matching commands are `pnpm local:start` and `pnpm local:stop`. Start builds the extension and web app, then runs the production app in the background without live reload. Use `pnpm dev:status` and `pnpm dev:logs` to inspect it. Stop an already running managed server before starting again; the scripts refuse active servers/occupied ports before rebuilding and preserve saved browser data. The shell scripts support macOS/Linux and can be invoked by their full path from another directory. Development commands (`pnpm dev` / `pnpm dev:start`) remain separate from this normal-use launcher.

Open **http://127.0.0.1:3000/observe** for automatic tasks. In Chrome's `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/.output/chrome-mv3`. Choose **Connect browser**, pair the companion, allow a chosen site's observation, then separately agree to the named AI provider. Browse the enabled site normally; inferred tasks and progress appear without a checkpoint form. Expand **Browser settings** to change site access, **AI and reminder settings** for processing/reminders, and a task's **Task options** to correct it or inspect history. Reminders stay off until enabled.

The original manual capture/checkpoint journey remains at **http://127.0.0.1:3000** under **Saved checkpoints**. Select instructions on another page and invoke the extension's toolbar action or shortcut to use that flow. After updates, rebuild and choose Reload for ReEntry in Chrome extensions; keep the same extension ID, app origin and browser profile. [Automatic setup](docs/AGENT_INFERENCE.md) · [manual walkthrough](docs/PHASE1.md).

The starter pins Node 22.23.2 and pnpm 12.5.1. No cloud credentials or model runtime are needed for manual capture/checkpoints or deterministic tests. Automatic task inference requires a configured model. Return using the same browser profile and exact app address.

For a presentation-ready external task, run `pnpm sandbox:sites` in another terminal and open the printed **Northstar demo portal** address. It includes a saved application draft, sample transcript, preparation checklist and switchable referee requirements. Follow the [sandbox walkthrough](docs/SANDBOX.md) for the complete interruption-and-return demo.

## Project documents

- [Original product concept](reentry.md)
- [Bounded product brief](docs/PRODUCT.md)
- [Scope, architecture, and testing sandboxes](docs/BUILD_PLAN.md)
- [Calm UI direction for the browser agent](docs/UI_DIRECTION.md)
- [Agent tools, memory, and observation contracts](docs/AGENTIC_PLAN.md)
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

Read [AGENTS.md](AGENTS.md). Use the official shadcn registry workflow. `pnpm check` includes web and extension type checks; `pnpm build` and `pnpm extension:build` compile each surface. Run `pnpm exec playwright install chromium`, then `pnpm test:e2e` for the real-extension suite. Use `REENTRY_TEST_PRODUCTION=1 pnpm test:e2e` for production builds; current verification is recorded in [test results](docs/TEST_RESULTS.md), with hosted status in [GitHub Actions](https://github.com/kirmada1509/reentry/actions/workflows/ci.yml). `node scripts/publication-audit.mjs` checks history/tracked files and built browser assets for focused credential patterns and configured key values. Tests allocate ports and temporary profiles and build a separate test extension. The original starter guide is preserved in [docs/STARTER-README.md](docs/STARTER-README.md).

Built from [kirmada1509/agent-starter](https://github.com/kirmada1509/agent-starter), with history and MIT license preserved. The starter source remote remains `upstream`; the separate ReEntry repository is https://github.com/kirmada1509/reentry. Publication status is recorded in the release evidence. UI attribution remains in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
