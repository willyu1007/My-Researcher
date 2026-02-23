# 01 Plan

## Phases
1. Delivery policy freeze
2. Architecture and contract alignment
3. Implementation slicing and ownership
4. Verification and release strategy

## Detailed steps
- Step 1: 汇总 `T-003/T-005/T-007` 既有事件契约与边界，形成交付机制问题清单。
  - Output: 决策输入表（语义保持项、待决项、禁止项）。
  - Done when: 待决项有 owner 与决策时限。
- Step 2: 固化交付模式与切换规则（默认 `in-process`，可升级到 `durable-outbox`）。
  - Output: 交付模式决议与启用条件。
  - Done when: 模式切换不改变事件语义与 API 契约。
- Step 3: 设计 event envelope、幂等与失败恢复策略（retry/backoff/dlq/manual gate）。
  - Output: 字段级约束与状态机。
  - Done when: 每个失败路径都有明确处置与审计字段。
- Step 4: 拆分后续实现任务（建议 `T-009`/`T-010`）并定义 R/C/F 边界。
  - Output: 实施任务草案 + 依赖顺序。
  - Done when: 不与 `T-003/T-004` 单写者边界冲突。
- Step 5: 执行治理 sync/lint 与文档一致性检查。
  - Output: 可复现验证记录。
  - Done when: 所有检查为 pass。

## Risks and mitigations
- Risk: 事件语义与交付语义耦合过深。
  - Mitigation: 保持语义 owner 在 `T-003`，`T-008` 只维护 delivery 层。
- Risk: outbox 方案引入 DB 事务复杂度。
  - Mitigation: 先定义最小可落地策略，再由后续实现任务验证事务一致性。
- Risk: 重试策略导致重复副作用。
  - Mitigation: 强制幂等键与消费去重约束，并提供人工审计入口。

## Dependency order
1. `T-003` 语义契约（read-only input）
2. `T-007` 事件生产点（read-only input）
3. `T-008` 交付机制决议（this task）
4. `T-009/T-010` 实施任务（future)
