# 04 Verification

## Planned checks
- `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`
- `pnpm --filter @paper-engineering-assistant/shared test`
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - `R-011`、`T-024` 和相关 child task 映射已注册。
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result:
    - new research-argument contracts compile cleanly under the shared package.
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result:
    - barrel re-export, bridge schema load, `workspace_id` accept, legacy `project_id` reject, packet/report schema smoke, invalid `claim_strength` reject, missing grouped risk reject, and mismatched sidecar ref kind reject all passed.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result:
    - backend consumers remain compatible after new shared export surface landed.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result:
    - desktop consumers remain compatible after new shared export surface landed.
- [pass] `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`
  - Result:
    - glossary and registry remain consistent after research-argument markdown artifacts were registered.
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - project hub re-synced after task artifact updates.
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.` after implementation landed.

## Pre-handoff review for `T-025`
- [x] canonical docs 的落点和命名已冻结。
- [x] `domain / read-model / bridge / advisory` 合同分组已冻结。
- [x] `T-025` 所需的对象名、read-model DTO、metadata nouns 不存在未决冲突。
- [x] downstream consumers 已在 docs 中标明，不需要通过口头补充解释。
