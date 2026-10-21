# Devpost Learn planning status

The official Learn pack is installed in `.agents/skills/1-start` through `6-ship`, also reachable through `.claude/skills`. Source/license: [provenance](../docs/PROVENANCE.md).

## Actual progress

- `1-start`: completed. The learner profile is saved locally and ignored by Git.
- `2-scope`: draft generated in [scope.md](scope.md); learner approval is pending. Markdown is currently displayed; an optional HTML preference has not been confirmed. Its frontmatter is `status: draft`.
- `3-prd` and `4-spec`: not started; no approved artifacts are claimed.
- `5-build`: not started. Generate its formal build checklist only after the real planning prerequisites are satisfied.

The [project build checklist](../docs/BUILD_CHECKLIST.md) tracks actual work across phases. The [implementation roadmap](../docs/IMPLEMENTATION_PLAN.md) supplies test gates; neither substitutes for the real Learn planning documents or formal build checklist.

Keep required scope, PRD, and spec in the eventual public repository. The personal learner profile and local credentials remain excluded by default; the conversation still goes through the AI provider.

## Implementation sequencing

On October 22 the author explicitly requested Phase 1 implementation. Capture and checkpoint saving proceeded using the existing product brief and phase plan, outside the still-incomplete formal Learn sequence. Scope remains a draft; no PRD/spec/checklist approval or retrospective curriculum completion is claimed. See [actual implementation and tests](../docs/TEST_RESULTS.md).
