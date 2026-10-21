# Source and project provenance

Recorded October 21, 2026 (IST). Do not backdate project work or treat inherited commits as ReEntry development.

## Starter

- Source: [kirmada1509/agent-starter](https://github.com/kirmada1509/agent-starter).
- Imported commit: `4ee50075d585d2ad12c440d1ce618311d4148d65`.
- Latest inherited commit timestamp: October 21, 2026, 21:40:49 +05:30.
- Method: HTTPS clone, moved into this workspace after checking for conflicts. The pre-existing `reentry.md` was preserved.
- Git history retained; `origin` renamed to `upstream`. No fork, new remote repository, or push performed.
- Reused work: framework scaffold, registry components, logging/health infrastructure, scripts, tests, CI, and agent instructions. These are starter work, not ReEntry-specific contributions.
- MIT license retained in `LICENSE`; UI notices retained in `THIRD_PARTY_NOTICES.md`. Original README retained in `docs/STARTER-README.md`.

## Devpost Learn

- Source: [challengepost/learn-ai-basics](https://github.com/challengepost/learn-ai-basics).
- Imported commit: `a0f065781873e8a7ed9a9a705a8dafa6a0810439`.
- Installation: copies of the six skill directories, including templates/references, under `.agents/skills/`. No external installer was executed. One trailing blank line in `5-build/templates/checklist-template.md` was normalized during the first staged whitespace check; curriculum content is unchanged.
- MIT license retained in `docs/licenses/devpost-learn-MIT.txt`.
- Vendored curriculum excluded from automatic local formatting; the single recorded trailing-newline normalization is the only change to upstream files.
- Installation does not mean the workflow was run. See `devpost/README.md` for actual progress.

## Initial planning session

- The supplied concept says it was prepared October 21, 2026; that is a concept date, not proof of earlier implementation.
- This session adopted the starter, renamed package/environment identity, installed curriculum, and wrote planning/setup documents.
- No ReEntry application features or model integrations were implemented during that initial planning session. Actual implementation starts are recorded below.
- AI assistance: Codex inspected sources, initialized the starter, researched requirements, and drafted planning documents. Keep this disclosure current as development proceeds.
- Preserve real future commits and planning history as evidence; a new repository timestamp alone does not prove project eligibility.

## Reuse research, not yet incorporated

The later planning revision evaluated existing capture/storage/diff/testing packages and online test sites; decisions and primary sources are in [REUSE.md](REUSE.md). These shortlisted tools have not been installed or copied by this documentation update. Record exact versions, copied file commit ids, and license notices when adopting them rather than presenting research as implementation.

## Phase 0 kickoff

Created a project build checklist and ran the actual Learn onboarding/scope workflow on October 21, 2026. The learner profile is local and ignored; `devpost/scope.md` is a draft pending review. PRD/spec and the formal Learn build checklist have not been generated. No learner experience or approval was invented, and no ReEntry feature implementation start is claimed from these planning artifacts.

## Phase 1 implementation — October 22, 2026 (IST)

The author explicitly requested implementing Phase 1. Codex wrote the capture protocol, WXT action/background/review tab, native app bridge, Dexie task persistence, checkpoint/library UI and tests. This is the first ReEntry-specific product implementation; it is separate from inherited starter work. Formal Learn reviews remain incomplete and were not marked approved retrospectively.

Installed and pinned: WXT 0.21.4 and its React module 1.2.2 (MIT), webext-core messaging 4.0.0 (MIT), Dexie 4.4.6 (Apache-2.0), Playwright 1.64.1 (Apache-2.0), http-server 14.1.1 (MIT), fake-indexeddb 6.2.6 (Apache-2.0), Tailwind Vite integration 4.3.3 (MIT), and Chrome types 0.3.5 (MIT). WXT supplies its storage integration. Package licenses remain in their installed distributions; upstream source links are in [REUSE.md](REUSE.md). The additional official shadcn checkbox was installed through the existing registry tool; acquisition/hash and MIT attribution are retained.

The instruction HTML is original fictional test content under the project license. No Selenium/The Internet source or assets were copied in this phase. No custom scholarship application or parser was built. No model integration or live inference is claimed. The manifest development key is a generated public key used for stable extension identity, not a retained private signing key.

## Phase 2 implementation — October 22, 2026 (IST)

The author requested committing the existing work and implementing Phase 2. Phase 1 was already committed as `31c8d24`. Codex implemented task-bound source-check sessions, explicit recapture confirmation, immutable source snapshots, Dexie v2 migration, comparison/status UI, controlled static instruction versions and additional real-extension/failure tests. No model or hosted provider integration was added.

New pinned dependency: [jsdiff](https://github.com/kpdecker/jsdiff), npm `diff` 9.0.0, BSD-3-Clause. Its installed distribution retains the license. ReEntry uses `diffWordsWithSpace` with time/edit limits for presentation; raw text and exact equality drive evidence/status. The V1/V2/cosmetic HTML files are original fictional content under the project license. http-server remains the existing static host; the switch helper only copies a file and does not implement a sandbox platform. Formal Learn review gaps remain unchanged and are not retrospective approvals.

## Phase 3 implementation — October 22, 2026 (IST)

The author requested Phase 3 implementation. Codex wrote the provider-independent recovery input/proposal contract, fixed harness, native Ollama adapter, bounded same-origin API, editable recovery UI, Dexie v3 proposal storage, stale-result checks and deterministic/live evaluation workflows. The app does not use an agent framework or install hosted provider clients.

New pinned development dependencies: MSW 3.0.3, Serve (`@msw/serve`) 0.11.0 and tsx 4.23.15, all MIT. Their installed distributions retain their licenses. tsx's esbuild binary installation is explicitly allowed in `pnpm-workspace.yaml`; unrelated optional native builds remain disabled. The sandbox reuses upstream MSW handlers/Serve rather than a custom model server engine. Fictional recovery inputs and handlers are original project test code.

The existing local Qwen3.5 9B was evaluated first. Deadline failures and an interpretation that skipped a pending first step prompted a shorter prompt and evaluation of the planned smaller [Qwen3 4B](https://ollama.com/library/qwen3:4b) (Apache-2.0, Q4_K_M; weights downloaded through Ollama and not committed). Actual model digests, successful/failed runs and latency belong in [TEST_RESULTS.md](TEST_RESULTS.md), not inferred from model names. No hosted inference or public model-quality guarantee is claimed. Learn review gaps and starter attribution remain unchanged.

## NVIDIA integration — October 22, 2026 (IST)

The author requested NVIDIA-hosted LLM support and supplied a key through ignored local configuration. Codex added a native NVIDIA chat-completions adapter, validated server settings, processing notice/agreement checks, provider-specific HTTP tests and real hosted evaluations. Existing fetch/Zod/harness infrastructure is reused; no NVIDIA/OpenAI SDK, client credential storage or new package was added. Other supplied provider keys were not used.

The selected remote model is `nvidia/nemotron-3-ultra-550b-a55b` through NVIDIA's [documented catalog API](https://docs.api.nvidia.com/nim/reference/llm-apis). No model weights/assets were copied into this repository. NVIDIA's service/model terms govern hosted use; the application does not infer a remote weight digest or freeze an alias. Prompt `recovery-3` and actual failed/successful trials are recorded in [TEST_RESULTS.md](TEST_RESULTS.md). Hosted inference and its explicit processing agreement supplement the preserved local open-weight route; they do not establish other providers' support or event eligibility.
