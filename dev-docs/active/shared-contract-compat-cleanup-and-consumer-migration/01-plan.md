# 01-plan

## Phases
1. [x] Task registration and baseline audit
2. [x] Shared public surface stabilization
3. [x] Backend consumer migration
4. [x] Compat cleanup and documentation updates
5. [x] Guardrail, verification, and handoff

## Phase details
### Phase 1 - Task registration and baseline audit
- Deliverables:
  - task bundle + governance registration
  - overlap review for `T-011` / `T-014`
  - baseline import inventory
- Acceptance:
  - task has assigned `T-xxx`
  - project mapping lands on `M-000 / F-000`
  - migration target list is frozen before code edits
- Verification:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - `rg -n "from '@paper-engineering-assistant/shared'|from \"@paper-engineering-assistant/shared\"" apps/backend/src`

### Phase 2 - Shared public surface stabilization
- Deliverables:
  - `exports` subpaths in shared package
  - direct `research-lifecycle` barrel
  - root alias remains available
- Acceptance:
  - backend can resolve file-named subpath imports
  - shared no longer needs compat file in its barrel chain
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`

### Phase 3 - Backend consumer migration
- Deliverables:
  - `28` single-domain files rewritten
  - `5` mixed-domain files split into multiple subpath imports
- Acceptance:
  - repo-internal backend imports no longer use shared root entry
  - mixed-domain files compile with explicit bounded-context imports
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `rg -n "from '@paper-engineering-assistant/shared'|from \"@paper-engineering-assistant/shared\"" apps/backend/src`

### Phase 4 - Compat cleanup and documentation updates
- Deliverables:
  - `interface-field-contracts.ts` removed
  - shared tests updated off compat barrel
  - shared README updated to new public entrypoints
- Acceptance:
  - no active code/test import references `interface-field-contracts`
  - test surface reflects direct modules / clean barrel
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `rg -n "interface-field-contracts" packages/shared apps/backend/src --glob '!**/dist/**'`

### Phase 5 - Guardrail, verification, and handoff
- Deliverables:
  - backend static boundary test
  - verification evidence recorded
  - implementation notes and current status updated
- Acceptance:
  - future root-entry regressions fail backend test
  - handoff docs explain what changed and how to verify
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Entry criteria
- New task bundle exists under `dev-docs/active/shared-contract-compat-cleanup-and-consumer-migration/`.
- Baseline governance lint and typecheck status recorded.
- public subpath naming is fixed to filename-aligned paths.

## Exit criteria
- compat layer is removed from active code.
- backend import boundary is enforced by test.
- verification matrix and task docs are current enough for handoff.
