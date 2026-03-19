# 01-plan

## Phases
1. Baseline freeze and overlap reconciliation
2. Auto-pull service decomposition
3. Literature flow service decomposition
4. Prisma repository decomposition
5. Facade stabilization and integration cleanup
6. Verification and handoff

## Phase details
### Phase 1 - Baseline freeze and overlap reconciliation
- Deliverables:
  - `T-011` / `T-013` 最新基线吸收记录
  - backend 绿色 baseline（typecheck/test）记录
  - facade public surface 盘点
- Acceptance:
  - 拆分前的行为基线明确
  - 知道哪些方法/测试必须在重构后保持原样
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`

### Phase 2 - Auto-pull service decomposition
- Deliverables:
  - config CRUD / orchestration / adapters / scoring / mapper 子模块
  - `AutoPullService` facade
  - 对应测试调整
- Acceptance:
  - `AutoPullService` 不再承担全部内部实现细节
  - `auto-pull-service.unit.test.ts` 语义继续成立
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend test -- src/services/auto-pull-service.unit.test.ts`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`

### Phase 3 - Literature flow service decomposition
- Deliverables:
  - coordinator / stage executors / embedding adapter / artifact helper 子模块
  - `LiteratureFlowService` facade
  - 对应测试调整
- Acceptance:
  - pipeline 编排与阶段实现职责分离
  - `literature-flow-service.unit.test.ts` 语义继续成立
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend test -- src/services/literature-flow-service.unit.test.ts`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`

### Phase 4 - Prisma repository decomposition
- Deliverables:
  - core/source、scope/link、pipeline/artifact、embedding 子模块
  - record mapper helpers 分离
  - `PrismaLiteratureRepository` facade
- Acceptance:
  - repository 内部职责可按子域定位
  - repository interface 语义保持兼容
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`

### Phase 5 - Facade stabilization and integration cleanup
- Deliverables:
  - route/controller/service wiring 清理
  - import path 整理
  - integration notes
- Acceptance:
  - 上游代码仍依赖稳定 facade，不感知内部拆分细节
  - repository boundary 仍符合“不在 business layer 直接 import Prisma”
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`

### Phase 6 - Verification and handoff
- Deliverables:
  - verification 记录
  - handoff notes
  - 需留给 Wave 4 的 shared-contract 相关残留说明
- Acceptance:
  - 不再遗留“哪些属于 Wave 3 / 4”的模糊区
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`

## Entry criteria
- backend baseline 已验证为绿色。
- `T-011` / `T-013` 对目标文件的重叠改动已吸收或停稳。
- shared contract 在本 wave 中被冻结，不并发做 Wave 4 大拆。

## Exit criteria
- service/repository 的职责分区可以用目录与 facade 说明清楚。
- 上游 route/controller 不需要知道内部是如何被拆开的。
- 后续 backend 迭代可以在子模块内增量修改，而不必反复进入超大单文件。

