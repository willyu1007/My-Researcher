# 04 Verification

## Planning-package verification — 2026-07-30

- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 7/7 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → registered T-134 and regenerated dashboard, feature map and task index.
- Registry semantic mapping → `M-001 > F-001 > R-012 > T-134`, status `planned`, updated `2026-07-30`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with two unrelated pre-existing task-state-format warnings for T-124/T-133 documentation.
- T-132 cross-check → authoritative scope freeze removes desktop UI and transfers EF-P06/P14/P15/semantic EF-P21 to T-134.
- `git diff --check` → passed.

## Phase 0 census/freeze verification — 2026-08-02

- `node .ai/scripts/ctl-project-governance.mjs resume --task T-134 --json` → recovered T-134 as `planned` with Phase 0 as the next action before any implementation-file read.
- Source census covered the four findings' shared contracts, routes/controllers, services, repository interfaces/Prisma implementations, Prisma models, capability composition and named unit/API/relational tests.
- EF-P14 evidence → current service admits null target binding; upstream bridge service/repository already creates and attaches a complete ref pair; existing bootstrap repository is atomic and race-idempotent.
- EF-P06 evidence → cutover guard closes the generic promotion mutation; v2 canonical asset and admitted-cell materialization writers exist; no typed preparation Candidate/promotion model or product route exists.
- EF-P15 evidence → `RunV2`, TaskSpec, Attempt and Result schemas are non-null PI-bound; legacy rows are ineligible; only the existing Evidence Trust Gateway writes REU/trace/outbox.
- EF-P21 evidence → structured lineage queries include `implementationProjectId` before cross-domain resolution; only literature owns current vector storage; PI has no semantic writer/index.
- `06-phase0-census-and-freeze.md` records runnable phase-specific unit/API/disposable-PostgreSQL/context/governance evidence and rollback requirements.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 8/8 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → updated T-134 and regenerated registry/dashboard/feature map/task index.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with only the two unrelated pre-existing T-124/T-133 state-format warnings.

Implementation, runtime, database and cloud verification have not started. The task is now `in-progress`; Phase 0 is documentation-complete and all implementation effects remain zero.
