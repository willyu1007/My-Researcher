# 01-plan

## Phases
1. Wave 0: 治理与盘点
2. Wave 1A: App orchestration 拆分（复用 `T-012`）
3. Wave 1B: 前端容器与控制层拆分
4. Wave 2: 前端 utility 与样式拆分
5. Wave 3: 后端 service/repository 边界拆分
6. Wave 4: shared contracts 拆分

## Execution rule
- Wave 1A 继续复用 `T-012`。
- 其余波次任务包已按用户要求预创建完成：
  - `T-018 literature-container-controller-split-wave1`
  - `T-017 frontend-normalizers-and-css-split-wave2`
  - `T-016 backend-service-boundary-split-wave3`
  - `T-019 shared-contract-decomposition-wave4`
- 虽然任务包已预创建，但产品代码实施仍必须一次只推进一个波次或一个显式定义的并行集合。
- 进入实施前仍需再次核对该波次的 entry gate 与 overlap baseline。

## Wave details
### Wave 0
- Objective:
  - 创建总任务包，冻结治理决策，完成 project hub 同步。
- Deliverables:
  - `roadmap.md`
  - `00-overview.md`
  - `01-plan.md`
  - `02-architecture.md`
  - `03-implementation-notes.md`
  - `04-verification.md`
  - `05-pitfalls.md`
  - sync 生成的 `.ai-task.yaml`
- Acceptance:
  - 新任务已被分配 `T-xxx`
  - registry、dashboard、feature-map、task-index 已出现新任务
  - 文档已足以支撑后续波次立项
- Verification:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

### Wave 1A
- Objective:
  - 收敛 `App.tsx` 的 orchestration 职责。
- Deliverables:
  - 复用 `T-012` 完成 App-only 拆分
- Scope:
  - `App.tsx`
  - `app-layout.css`
  - 必要的 shell/literature/module 出口整理
- Acceptance:
  - `T-012` 不扩 scope
  - App 保持现有对外行为不变
  - controller 与 tab 逻辑不进入 `T-012`
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`

### Wave 1B
- Objective:
  - 拆分文献管理前端容器、控制器与视图边界。
- Child task:
  - `T-018 literature-container-controller-split-wave1`
- Scope:
  - `AutoImportTab.tsx`
  - `useAutoImportController.ts`
  - `useManualImportController.ts`
- Acceptance:
  - 降低 prop fan-out
  - 保持文案、交互、API path、effect 时序、class/data-ui 语义不变
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`

### Wave 2
- Objective:
  - 将前端 utility 与样式整理为稳定边界。
- Child task:
  - `T-017 frontend-normalizers-and-css-split-wave2`
- Scope:
  - `normalizers.ts`
  - `shell.css`
  - `literature-auto-import.css`
  - `literature-manual-import.css`
- Acceptance:
  - normalizer 按 domain 拆分
  - CSS import order 与 cascade 稳定
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`

### Wave 3
- Objective:
  - 拆分后端 service/repository 的职责边界。
- Child task:
  - `T-016 backend-service-boundary-split-wave3`
- Scope:
  - `auto-pull-service.ts`
  - `literature-flow-service.ts`
  - `prisma-literature-repository.ts`
- Acceptance:
  - REST path/method 不变
  - Prisma schema 不变
  - 持久化语义不变
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`

### Wave 4
- Objective:
  - 将 shared contracts 拆成 bounded context 文件组。
- Child task:
  - `T-019 shared-contract-decomposition-wave4`
- Scope:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- Acceptance:
  - 保留旧 barrel export 兼容层
  - consumers 可渐进迁移
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

## Dependencies and ordering
- Wave 0 MUST 先完成。
- Wave 1A SHOULD 先于 Wave 1B。
- Wave 2 SHOULD 在 Wave 1A/1B 稳定后进入。
- Wave 3 SHOULD 在前端边界初步稳定后进入。
- Wave 4 SHOULD 最后进入，以避免 shared contracts 过早扩散改动。
- 推荐执行链：
  - `T-012 app-tsx-layout-split`
  - `T-018 literature-container-controller-split-wave1`
  - `T-017 frontend-normalizers-and-css-split-wave2`
  - `T-016 backend-service-boundary-split-wave3`
  - `T-019 shared-contract-decomposition-wave4`
- 显式阻塞：
  - `T-017` 受 `T-018` 与 `T-011` 的 `normalizers.ts` baseline 约束
  - `T-016` 受 `T-011` / `T-013` backend overlap 约束
  - `T-019` 受 `T-011` shared baseline、`T-014` sibling barrel、以及 consumer audit 约束

## Exit criteria for this governance task
- 已建立稳定的总任务与子任务治理框架。
- 每一波都有明确范围、验收和默认验证矩阵。
- 规划中的子任务包已全部创建并完成首轮合同 review。
- 后续实施不再需要重新做任务形态与项目映射决策。
