# 04-verification

## Planned verification matrix
### Governance
| Command | Expected result | Purpose |
|---|---|---|
| `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` | 新任务生成 `.ai-task.yaml`，并登记到 registry 与 derived views | 完成任务注册 |
| `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` | lint 通过；若存在历史 warning，则需明确不是本任务引入 | 校验治理一致性 |

### Frontend waves
| Command | Expected result | Purpose |
|---|---|---|
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | pass | 校验 TS 边界稳定 |
| `pnpm --filter @paper-engineering-assistant/desktop build` | pass | 校验打包与样式入口稳定 |
| `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` | pass | 校验 UI 主流程无回归 |

### Backend wave
| Command | Expected result | Purpose |
|---|---|---|
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | 校验 service/repository 拆分不破坏类型边界 |
| `pnpm --filter @paper-engineering-assistant/backend test` | pass | 校验业务规则与 HTTP 行为稳定 |
| `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | 校验 backend 依赖的 shared surface 兼容 |

### Shared contract wave
| Command | Expected result | Purpose |
|---|---|---|
| `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | 校验 contract surface |
| `pnpm --filter @paper-engineering-assistant/shared test` | pass | 校验 schema/contract 行为 |
| `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | 校验 backend consumers 兼容 |
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | pass | 校验 desktop consumers 兼容 |

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `dev-docs/active/maintainability-file-split-governance/.ai-task.yaml`
    - 分配任务 ID：`T-015`
    - 更新 `.ai/project/main/registry.yaml`
    - 重建 `.ai/project/main/dashboard.md`
    - 重建 `.ai/project/main/feature-map.md`
    - 重建 `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 保留两条历史 warning：
      - `app-tsx-layout-split` 的 `00-overview.md` 仍缺少 `## Status` / `- State: <status>`
      - `topic-initial-pull-and-rule-preview` 的 `00-overview.md` 仍缺少 `## Status` / `- State: <status>`
  - Note:
    - 以上 warning 为既有任务遗留，不由 `T-015` 引入
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - 生成 `dev-docs/active/backend-service-boundary-split-wave3/.ai-task.yaml`
    - 生成 `dev-docs/active/frontend-normalizers-and-css-split-wave2/.ai-task.yaml`
    - 生成 `dev-docs/active/literature-container-controller-split-wave1/.ai-task.yaml`
    - 生成 `dev-docs/active/shared-contract-decomposition-wave4/.ai-task.yaml`
    - 分配任务 ID：
      - `T-016 backend-service-boundary-split-wave3`
      - `T-017 frontend-normalizers-and-css-split-wave2`
      - `T-018 literature-container-controller-split-wave1`
      - `T-019 shared-contract-decomposition-wave4`
    - 更新 `.ai/project/main/registry.yaml`
    - 重建 `.ai/project/main/dashboard.md`
    - 重建 `.ai/project/main/feature-map.md`
    - 重建 `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - lint passed
    - 仅保留两条历史 warning：
      - `app-tsx-layout-split` 的 `00-overview.md` 仍缺少 `## Status` / `- State: <status>`
      - `topic-initial-pull-and-rule-preview` 的 `00-overview.md` 仍缺少 `## Status` / `- State: <status>`
  - Note:
    - 曾发生一次并发执行 `sync`/`lint` 导致 lint 读到同步前状态，已按正确顺序重跑并确认结果。

## Project hub registration checks
- [pass] registry 已登记 `T-015`
  - Evidence:
    - `.ai/project/main/registry.yaml`
- [pass] dashboard 已展示 `T-015`
  - Evidence:
    - `.ai/project/main/dashboard.md`
- [pass] feature-map 已在 `F-000` 下展示 `T-015`
  - Evidence:
    - `.ai/project/main/feature-map.md`
- [pass] task-index 已展示 `T-015`
  - Evidence:
    - `.ai/project/main/task-index.md`
- [pass] registry 已登记 `T-016` / `T-017` / `T-018` / `T-019`
  - Evidence:
    - `.ai/project/main/registry.yaml`
- [pass] dashboard 已展示 `T-016` / `T-017` / `T-018` / `T-019`
  - Evidence:
    - `.ai/project/main/dashboard.md`
- [pass] feature-map 已在 `F-000` 下展示 `T-016` / `T-017` / `T-018` / `T-019`
  - Evidence:
    - `.ai/project/main/feature-map.md`
- [pass] task-index 已展示 `T-016` / `T-017` / `T-018` / `T-019`
  - Evidence:
    - `.ai/project/main/task-index.md`

## Evidence to record after each wave
- registry/task-index/dashboard/feature-map 是否已更新
- 是否生成或更新 `.ai-task.yaml`
- 若 lint 产生 warning，是否为既有历史问题
- 每个波次的 typecheck/build/test/smoke 结果
