# 04-verification

## Planned verification matrix
### Governance
| Command | Expected result | Purpose |
|---|---|---|
| `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | generate `.ai-task.yaml`, register task, regenerate views | task registration |
| `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | pass | governance consistency |

### Implementation
| Command | Expected result | Purpose |
|---|---|---|
| `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | shared package surface remains valid |
| `pnpm --filter @paper-engineering-assistant/shared test` | pass | shared runtime/schema checks remain valid |
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | backend subpath imports compile |
| `pnpm --filter @paper-engineering-assistant/backend test` | pass | backend tests and import guard pass |

### Static audits
| Command | Expected result | Purpose |
|---|---|---|
| `rg -n "import .*'@paper-engineering-assistant/shared'|import .*\"@paper-engineering-assistant/shared\"|export .* from '@paper-engineering-assistant/shared'|export .* from \"@paper-engineering-assistant/shared\"" apps/backend/src` | no matches | prove backend root import cleanup |
| `rg -n "interface-field-contracts" packages/shared apps/backend/src --glob '!**/dist/**'` | no active code/test matches | prove compat layer removal |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - generated `.ai-task.yaml`
    - assigned task ID `T-020`
    - registered task in project hub derived views
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - project mapping remained `M-000 / F-000`
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result:
    - shared package compiles with direct `research-lifecycle` barrel and subpath exports
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result:
    - `9` tests passed / `0` failed
    - shared runtime/schema checks now target the clean barrel and direct split modules
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - backend subpath imports compile successfully
    - Prisma pretypecheck/generate completed successfully
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result:
    - `93` tests passed / `0` failed
    - new backend root-import guard test passed
- [pass] `rg -n "import .*'@paper-engineering-assistant/shared'|import .*\"@paper-engineering-assistant/shared\"|export .* from '@paper-engineering-assistant/shared'|export .* from \"@paper-engineering-assistant/shared\"" apps/backend/src`
  - Result:
    - no matches
    - backend root import cleanup verified
- [pass] `rg -n "interface-field-contracts" packages/shared apps/backend/src --glob '!**/dist/**'`
  - Result:
    - no matches
    - compat file removal verified across active code and tests

## Evidence to capture during implementation
- assigned task ID and mapping
- subpath export surface
- migrated backend import inventory
- guard test result
- final static audit output
