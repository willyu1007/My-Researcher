# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## What changed
- 基于 `T-008` 拆分创建 backend delivery implementation 任务包（`T-009`）。
- 明确本任务与 `T-010` 的职责边界：`T-009` 负责执行面，`T-010` 负责观测与运维面。
- 新增 backend 交付适配器：
  - `apps/backend/src/services/event-delivery/governance-event-delivery-adapter.ts`
  - 支持 `in-process` 交付模式、有限重试、幂等去重缓存（dedupe key）。
- `ResearchLifecycleService` 已接入 delivery adapter，`appendTimelineEvent` 改为通过 adapter 交付并附带失败审计信息。
- 新增 delivery 审计持久化存储：
  - `apps/backend/src/services/event-delivery/governance-delivery-audit-store.ts`
  - 提供 `FileGovernanceDeliveryAuditStore`（JSONL 持久化）与 `InMemoryGovernanceDeliveryAuditStore`（测试/内存模式）。
- `apps/backend/src/app.ts` 已接入 `FileGovernanceDeliveryAuditStore`，支持通过 `GOVERNANCE_DELIVERY_AUDIT_LOG_PATH` 覆盖默认路径。
- 新增 durable-outbox 升级边界：
  - `apps/backend/src/services/event-delivery/governance-delivery-outbox-store.ts`
  - `apps/backend/src/services/event-delivery/governance-event-delivery-outbox-adapter.ts`
  - 通过 `GOVERNANCE_DELIVERY_MODE=in-process|durable-outbox` 切换交付模式。
  - `apps/backend/src/app.ts` 新增 `GOVERNANCE_OUTBOX_LOG_PATH` 作为 outbox 日志落盘路径。
- 新增 adapter 单元测试：
  - `apps/backend/src/services/governance-event-delivery-adapter.unit.test.ts`
  - 覆盖成功、重试成功、重试失败、重复投递去重。
- 新增 Phase 2 审计相关测试：
  - `apps/backend/src/services/governance-delivery-audit-store.unit.test.ts`（文件持久化）
  - `apps/backend/src/services/research-lifecycle-service.unit.test.ts` 新增“delivery failure persisted”用例。
- 新增 Phase 3 outbox 边界测试：
  - `apps/backend/src/services/governance-event-delivery-outbox-adapter.unit.test.ts`
  - 覆盖 outbox 成功/失败状态流转。
- 与 `T-010` 完成 telemetry 词典对齐：
  - 新增 `dev-docs/active/governance-event-delivery-observability-ops-v1/06-telemetry-contract-draft.md`
  - `T-009` 架构文档改为引用该词典作为单一命名来源。

## Decisions and tradeoffs
- 决策: 先实现 `in-process`，再演进 `durable-outbox`。
  - 理由: 先保证最小稳定路径，降低一次性变更风险。
  - 替代方案: 直接上 outbox；未采用，当前交付风险和事务复杂度较高。
- 决策: 保持 delivery 失败与主事务解耦（非 fail-fast 默认）。
  - 理由: 避免 delivery 异常放大到核心业务链路。
  - 替代方案: 全部 fail-fast；未采用，用户体验与可用性风险高。

## Open follow-ups
- 待推进 durable-outbox 的持久化模型从文件日志升级到 Prisma 表结构（含 migration/worker contract）。

## Progress log
- 2026-02-23: 从 `T-008` 完成任务拆分并创建 `T-009` 文档包。
- 2026-02-23: 任务启动，进入 Phase 1（adapter + envelope 基线）实现。
- 2026-02-23: 完成 Phase 1 首轮落地并通过 backend typecheck/test（16/16）。
- 2026-02-23: 完成 Phase 2（失败审计持久化）并通过 backend typecheck/test（18/18）与 governance sync/lint/query。
- 2026-02-23: 完成 Phase 3 边界实现（durable-outbox feature flag + outbox store/adapter）并通过 backend typecheck/test（20/20）。
- 2026-02-23: 完成与 `T-010` 的 telemetry 字段契约对齐并收口 `T-009`。
