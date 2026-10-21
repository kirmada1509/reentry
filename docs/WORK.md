# Active work and handoff

## Goal

Create the build checklist, save the ReEntry Git baseline, and start Phase 0 through the actual Learn workflow.

## Decisions

- One product: WXT browser extension plus the existing Next.js web app, explicit selected-text capture/recapture, user-confirmed progress, evidenced local-model interpretation, correction/restore, and reopening the work link.
- Reuse WXT/webext-core, Dexie, jsdiff, existing test sites, Playwright/MSW/Serve/axe, and tiny instruction fixtures. Optional Defuddle mode, PDFs/DOCX, Electron, background monitoring, and exact field restoration remain outside the first release.
- Project execution tracker: [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md). Phase/test details: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Scope/sandboxes: [BUILD_PLAN.md](BUILD_PLAN.md). Reuse/licenses: [REUSE.md](REUSE.md).
- Preserve inherited Git history and MIT notices. This workspace already has a Git repository on `main`; the starter remote is `upstream`. No reset, fresh history, remote repository, or push is needed to initialize local tracking.
- Personal Learn context and credentials are ignored and untracked. Do not invent learner background, reviews, evidence, or completed phase gates.

## Actual state

- Build checklist created; Phase 0 is in progress. Phases 1–6 are not started. ReEntry baseline saved as local commit `8be78ad`; inherited history is preserved.
- Learn `1-start` completed with an honest ignored learner profile. Supplied product/platform/reuse decisions were carried forward.
- Learn `2-scope` generated [../devpost/scope.md](../devpost/scope.md) with `status: draft`. Learner approval is pending; Markdown is used for the first review while the optional HTML preference remains unconfirmed. PRD/spec and formal Learn build checklist do not exist yet.
- The running application is still the starter example. No extension/model/sandbox implementation or new shortlisted dependency was added.
- The project build checklist is not the formal Learn `devpost/checklist.md`. Generate that later through `5-build` against actual approved planning artifacts.

## Next concrete action

Complete the pending scope review; Markdown is currently displayed, and HTML remains optional. Then follow `3-prd` and `4-spec`, carrying prior decisions forward. Do not rerun broad ideation or invent approvals. Phase 1 begins only when its real planning prerequisites are satisfied.

## Verification

- `pnpm check`: passed formatting, lint, types, all 20 tests across six files, UI policy, secret-pattern guard, and agent-context validation during Phase 0 kickoff.
- Git root/branch/remote, staged-file state, and ignored personal/credential paths inspected before baseline preparation.
- Baseline commit `8be78ad` passed staged secret checks, formatting hooks, UI policy, and type generation/checks. Staged private-path and document-link review passed. See [SETUP.md](SETUP.md). No product acceptance test or live-model result is claimed.
