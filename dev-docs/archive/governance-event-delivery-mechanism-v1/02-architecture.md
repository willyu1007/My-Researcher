# 02 Architecture

## Layer boundaries
- Producer layer: 由既有 service 在业务成功点写入事件（已在 `T-007`）。
- Delivery layer: 负责投递、重试、失败状态流转、审计字段补全（本任务定义）。
- Transport adapter: 统一抽象 `publish/ack/nack`，支持 `in-process` 与 `durable-outbox`。
- Observer layer: 暴露交付指标与失败告警，不改写业务语义。

## Ownership (R/C/F)
- R (`T-008`): 事件交付机制决议、失败恢复规则、观测与回滚策略。
- C (`T-003`): 事件语义、stage gate 约束、value gate 规则。
- C (`T-007`): 事件生产点实现与字段基线。
- F (`T-008` forbidden): 修改业务接口契约、改写阶段语义、重构桌面 UI。

## Event envelope baseline
- Required:
  - `event_id`
  - `event_type`
  - `aggregate_id`
  - `occurred_at`
  - `payload_version`
  - `trace_id`
  - `dedupe_key`
- Optional:
  - `lane_id`
  - `attempt_id`
  - `risk_flags`

## Delivery modes
- Mode A: `in-process`
  - 适用于当前单进程与低延迟场景。
  - 失败策略：有限重试 + 审计落盘 + 人工告警。
- Mode B: `durable-outbox`
  - 适用于高并发与进程故障可恢复场景。
  - 失败策略：事务写入 outbox，异步投递，支持死信与人工重放。

## Compatibility invariants
- 不改变既有 `research.*` 事件名与 payload 语义。
- 不破坏 `lineage_meta/value_judgement_payload/snapshot_pointer_payload` 兼容性。
- 新增交付字段默认可选，遵循增量发布。

## Anti-drift constraints
- 所有语义调整必须回写 `T-003`，`T-008` 仅引用。
- 交付机制文档不能重新定义 M1~M8 模块职责。
- 所有后续实现任务必须声明“语义 owner = T-003，delivery owner = T-008”。
