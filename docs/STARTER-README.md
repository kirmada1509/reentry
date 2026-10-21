# Agent Starter

A reusable starting point for product work with coding agents: shared rules and skills, registry-installed shadcn UI, strict TypeScript, quality gates, local process scripts, and optional browser log viewing.

## Start the next product

From this template:

    pnpm run new my-product

Then:

    cd ../my-product
    pnpm bootstrap
    pnpm dev

The new-project command exports the committed template into a fresh Git repository, changes the package and environment names, and excludes Git history, dependencies, local credentials, and runtime files. Commit improvements to the starter before using that command.

Alternatively clone this repository, remove/change its origin, and run pnpm bootstrap. If hosted on GitHub later, it can be marked as a template repository.

Complete [docs/PRODUCT.md](PRODUCT.md), open the new folder in your coding agent, and ask:

> Read AGENTS.md and the product brief. Plan the first complete user journey, select existing shadcn components, then implement and verify it.

## Included

| Area              | Default                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| Application       | Next.js App Router, React, strict TypeScript, pnpm lockfile                          |
| Agent entry point | Short AGENTS.md, shared Claude/Cursor/Copilot pointers                               |
| Skills            | Product planning, feature delivery, registry UI, operational debugging, verification |
| Optional roles    | Planner, implementer, reviewer briefs; no automatic agent swarm                      |
| UI                | Official shadcn components and an unchanged upstream example                         |
| Engineering       | Thin routes, validated input/configuration, explicit errors, bounded JSON parsing    |
| Logs              | Structured JSON, redaction, request IDs, status/duration, safe error capture         |
| Cloud             | Optional Axiom ingest; optional Doppler secrets injection; optional OTLP tracing     |
| Health            | Liveness and configuration readiness routes                                          |
| Checks            | Husky, lint-staged, Prettier, ESLint, TypeScript, Vitest, UI and secret guards       |
| CI                | Checks, production build, and HTTP smoke on GitHub Actions                           |
| Operations        | Bootstrap, foreground/background start, stop, status, logs, new-project export       |

Node.js 22.14+ or 24 and pnpm 12 are supported by the package constraints. The local/CI runtime is pinned to Node 22.23.2; pnpm downloads it when needed and records its checksum in the lockfile. Managed background scripts support macOS/Linux.

## Commands

| Command                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| pnpm bootstrap                  | Locked install, local configuration, hooks, setup checks       |
| pnpm dev                        | Foreground development                                         |
| pnpm dev:start / pnpm dev:stop  | Start/stop this project's background server                    |
| pnpm dev:status / pnpm dev:logs | Inspect the managed server                                     |
| pnpm ui:add dialog              | Install official UI and record its provenance                  |
| pnpm check                      | Formatting, lint, types, tests, UI, secret, instruction checks |
| pnpm verify                     | All checks plus production build                               |
| pnpm smoke                      | Check the running starter's page and health routes             |
| pnpm observe:smoke              | Send one diagnostic event to configured Axiom                  |
| pnpm logs:open                  | Open the configured cloud log view                             |
| pnpm agent:context              | Report instruction size and available project skills           |

Pre-commit runs staged secret checks, formatting/linting, UI policy, and type checks. Pre-push runs the complete check suite. CI adds the production build and HTTP smoke. Turn on repository branch protection when you host it to make CI a merge requirement.

## UI rule

Choose and wire existing components. The starter does not ask an agent to design a new component system. Registry assets have recorded hashes; handwritten visual primitives and additional CSS fail the guard. Page/data/action wiring remains normal product work.

The default home is the official shadcn empty-demo example; its controls are demonstrations. Replace it with the product flow before a product demo. See [UI policy](UI.md).

## Logs in a browser

Doppler manages secrets. Axiom is the application log viewer. Local logging works immediately; cloud viewing needs your dataset and ingestion token. See [operations setup](OPERATIONS.md) for the one-time activation steps and verification marker.

Runtime configuration, database/auth providers, and product integrations are selected for the actual product instead of being imposed by the starter.

## Read only what is relevant

- [Starter plan and researched alternatives](STARTER-PLAN.md)
- [Engineering guidelines](ENGINEERING.md)
- [UI source and enforcement](UI.md)
- [Operations and cloud setup](OPERATIONS.md)
- [Current task/handoff](WORK.md)
- [Verification record](VERIFICATION.md)

Skills live once under .agents/skills. Claude's skills path links to that directory; other agents can follow the canonical policy pointers. Tool-specific support varies, so check the agent's skill selector when adopting a new tool.

[MIT license](../LICENSE). Vendored UI attribution is in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
