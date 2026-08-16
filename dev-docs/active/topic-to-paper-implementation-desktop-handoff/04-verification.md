# 04 Verification

## Planning and registration checks
- [x] T-138 task metadata is unique and governance mapping is `M-001 > F-001 > R-009 + R-013`.
- [x] Governance sync/query/lint pass with T-138 in `planned` state.
- [x] Documentation lint and `git diff --check` pass.
- [x] No application/source/config/database/provider file changed during task creation.

## Planning verification log
- 2026-08-17 — `ctl-project-governance sync --apply --changelog`, both requirement mappings, and the final sync completed.
- 2026-08-17 — Governance query returned only T-138 with `planned`, `F-001`, and `M-001`; the registry records `R-009 + R-013`.
- 2026-08-17 — Governance lint, documentation lint, and `git diff --check` passed. Documentation lint reported only advisory wording warnings; the new T-138 warning was removed before commit.
- 2026-08-17 — The task-creation diff contains only `dev-docs/active/topic-to-paper-implementation-desktop-handoff/` and `.ai/project/main/` governance files.

## Automated checks for implementation
- Desktop typecheck:
  - `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/desktop typecheck`
- Focused component/controller tests must cover:
  - existing ImplementationProject lookup and adoption;
  - missing project followed by one idempotent bootstrap;
  - repeated click without duplicate bootstrap;
  - error preservation and retry;
  - terminal Claim/Dossier display.
- UI governance:
  - run the repository's applicable `data-ui`/token/Tailwind B1 gate discovered during implementation.
- Repository checks:
  - `node .ai/scripts/ctl-project-governance.mjs lint --check`
  - `git diff --check`

## Manual smoke checks
1. Open an admitted Topic bridge with an existing `PaperProjectIntake`.
2. Click the selected “continue to Paper Implementation” action once.
3. Confirm the app switches to `论文管理 > 论文实施` and loads the matching project without copied ids/hashes.
4. Repeat the action and confirm no duplicate project is created.
5. Use an eligible bridge without a project and confirm the existing bootstrap creates exactly one project.
6. Confirm a load failure retains context and exposes one clear retry.
7. Load a project with a `ready_for_writing` Dossier and confirm Claim/Dossier status is visible.

## Expected effect boundaries
- New PAI Jobs: 0.
- New LLM calls: 0.
- Database migrations: 0.
- New public APIs: 0.
- New authentication/approval gates: 0.
- User-authored technical ids/hashes on the normal path: 0.

## Rollout / Backout
- Rollout: one desktop navigation path using existing product APIs and owner records.
- Backout: revert the new callback/context and restore the existing independent workbenches; no persisted domain record needs migration or deletion.
