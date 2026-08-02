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

At Phase 0 close, implementation, runtime, database and cloud verification had not started; all implementation effects were zero.

## Phase 1 EF-P14 verification — 2026-08-02

- `pnpm run typecheck` from `apps/backend` → passed after Prisma client generation; `tsc -p tsconfig.json --noEmit` reported zero errors.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/paper-implementation-intake-bootstrap-service.unit.test.ts` → 18/18 passed. Covers bound creation/replay, repository race result, inactive/source/hash failures, unbound zero-write, both half-pairs, handoff/bridge drift, cross-title-card, wrong ref type, stale binding hash, legacy-null replay/read classification and feedback regressions.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/routes/paper-implementation-routes.integration.test.ts` → 7/7 passed. Covers the stable `409 GATE_CONSTRAINT_FAILED` / `PAPER_PROJECT_BINDING_REQUIRED` HTTP envelope and zero project writes plus the existing PaperImplementation route flows.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/paper-implementation-contract-evaluation-suite.unit.test.ts` → 5/5 passed.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/repositories/prisma/prisma-paper-implementation-repository.unit.test.ts` → 2/2 passed; same-hash race converges and changed-hash race conflicts.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts` → 12/12 passed; confirms upstream intake creates and atomically attaches the exact paired refs, replays once and rolls back on attachment conflict.
- The direct ts-node typechecking loader fails anonymously under local Node `v26.5.0`; tests therefore use transpile-only while the separate successful backend TypeScript check remains the type authority.
- No database suite was required or run: Phase 1 changes only pre-repository service admission, and the existing Prisma transaction/schema were unchanged. Zero-write rejection is asserted against the repository boundary; durable race behavior is covered by the unchanged Prisma repository unit suite.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 8/8 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → passed with no generated-view change required; T-134 remains `in-progress`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with only the two unrelated pre-existing T-124/T-133 state-format warnings.
- `git diff --check` → passed.

Phase 1 is complete. EF-P14 is verified at service, HTTP, contract-regression and repository-race layers without schema/data/runtime effects.
