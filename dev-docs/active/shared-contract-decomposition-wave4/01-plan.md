# 01-plan

## Phases
1. Consumer audit and compatibility contract
2. Bounded-context slice design
3. Contract file extraction
4. Barrel compatibility stabilization
5. Consumer verification and handoff

## Phase details
### Phase 1 - Consumer audit and compatibility contract
- Deliverables:
  - current export surface 清单
  - backend/desktop consumer audit
  - 兼容 barrel 策略
- Acceptance:
  - 明确哪些导出必须原样保留
  - 明确哪些 consumer 可以后续渐进迁移
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 2 - Bounded-context slice design
- Deliverables:
  - contract slice 列表
  - 各 slice 的职责边界
  - barrel 关系图
- Acceptance:
  - 不再依赖单文件增长来容纳新合同
  - topic-management sibling module 不被破坏
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`

### Phase 3 - Contract file extraction
- Deliverables:
  - 新 contract 文件组
  - `interface-field-contracts.ts` 兼容聚合层或等效过渡层
- Acceptance:
  - 旧导出仍可解析
  - 新文件边界能按 bounded context 解释清楚
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared test`

### Phase 4 - Barrel compatibility stabilization
- Deliverables:
  - `research-lifecycle/index.ts` 稳定导出
  - `packages/shared/src/index.ts` 顶层 shared barrel 稳定导出
  - 必要的 consumer import rewrite（仅限兼容）
- Acceptance:
  - backend/desktop 不被迫做一次性大迁移
  - 现有 consumer 路径仍可工作
- Verification:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 5 - Consumer verification and handoff
- Deliverables:
  - verification 记录
  - consumer audit 结果更新
  - 后续是否需要第二步“去兼容层”任务的建议
- Acceptance:
  - 本包仅完成安全拆分，不把“彻底移除兼容层”硬塞进同一 wave
- Verification:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

## Entry criteria
- Wave 3 已稳定，或至少 backend/shared internal boundaries 不再活跃漂移。
- 已完成 consumer audit，并知道 barrel compatibility 要保留什么。
- `T-011` 的 shared baseline 已吸收。

## Exit criteria
- shared contract 的边界可以通过 bounded-context 文件组解释清楚。
- 兼容 barrel 已经把 consumer 风险压低到可控范围。
- 后续若要彻底清理兼容层，可以单独立项，而不是继续膨胀本包。

