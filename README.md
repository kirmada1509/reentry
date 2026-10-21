# ReEntry

An accessible recovery card for unfinished work: preserve the goal, confirmed progress, materials, changed instructions, and one concrete next action.

**Status:** starter initialized; the plan targets a browser extension plus this web app, assembled from existing open-source libraries. Use existing online test sites and small deterministic fixtures instead of building sandbox applications. Phase 0 has started with Learn onboarding and a scope draft. The running app still displays the starter example; integrations and ReEntry features are not implemented yet.

## Start locally

```sh
pnpm bootstrap
pnpm dev
```

Use the local URL printed by the server. The starter pins Node 22.23.2 and pnpm 12.5.1. No cloud credentials are required. The planned Ollama dependency is not installed by bootstrap.

## Project documents

- [Original product concept](reentry.md)
- [Bounded product brief](docs/PRODUCT.md)
- [Scope, architecture, and testing sandboxes](docs/BUILD_PLAN.md)
- [Phase-wise implementation plan and test gates](docs/IMPLEMENTATION_PLAN.md)
- [Build checklist and current phase](docs/BUILD_CHECKLIST.md)
- [Required testing sandboxes](docs/BUILD_PLAN.md#required-testing-sandboxes)
- [Open-source tools and online sandbox alternatives](docs/REUSE.md)
- [Event requirements and deadlines](docs/HACKATHONS.md)
- [Starter and Learn provenance](docs/PROVENANCE.md)
- [Setup and verification](docs/SETUP.md)
- [Current handoff](docs/WORK.md)
- [Learn workflow status](devpost/README.md)

Complete the installed Devpost Learn planning sequence before ReEntry feature work. Preserve its generated scope, PRD, and spec in the public repository.

## Engineering

Read [AGENTS.md](AGENTS.md). Use the official shadcn registry workflow. `pnpm check` runs quality gates; `pnpm build` verifies production compilation. The original starter guide is preserved in [docs/STARTER-README.md](docs/STARTER-README.md), with local links adjusted for its new location.

Built from [kirmada1509/agent-starter](https://github.com/kirmada1509/agent-starter), with history and MIT license preserved. The source remote is named `upstream`; a separate ReEntry GitHub repository has not been created or published. UI attribution remains in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
