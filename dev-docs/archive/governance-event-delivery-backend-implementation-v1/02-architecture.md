# 02 Architecture

## Layer boundaries
- Producer integration: 从现有 service 事件触发点进入 delivery adapter。
- Delivery core: 执行 publish/retry/ack/nack，维护幂等与失败状态。
- Persistence: 存储失败记录与可选 outbox 记录。
- Contract bridge: 输出给 `T-010` 的 telemetry 字段与状态事件。

## Ownership (R/C/F)
- R (`T-009`): delivery backend 实现、幂等策略、失败恢复执行。
- C (`T-008`): delivery policy 与回滚策略。
- C (`T-010`): telemetry 字段消费与运维门禁约束。
- F (`T-009` forbidden): 改写 `T-003` 语义、改写 `T-007` 归档接口定义、扩展 UI。

## Core contracts
- Adapter methods:
  - `publish(event)`
  - `ack(event_id)`
  - `nack(event_id, reason)`
  - `retry(event_id, schedule)`
- Envelope fields:
  - `event_id`, `event_type`, `aggregate_id`, `trace_id`, `dedupe_key`, `occurred_at`, `payload_version`

## Compatibility invariants
- 保持既有 `research.*` 事件名与 payload 语义不变。
- 新增字段默认可选，避免破坏旧客户端。
- 任何 delivery 错误不得影响主事务返回协议（除非明确 fail-fast 场景）。
- telemetry 字段命名遵循 `dev-docs/active/governance-event-delivery-observability-ops-v1/06-telemetry-contract-draft.md`（单一词典）。

## Data notes
- 若新增 outbox 表，遵循 `prisma/schema.prisma` SSOT + migration 流程。
- in-process 路径必须有失败审计表征，避免 silent drop。
