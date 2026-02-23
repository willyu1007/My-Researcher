# 06 Telemetry Contract Draft

## Purpose
- 冻结 `T-009` 与 `T-010` 的 delivery telemetry 字段与命名，避免实现层与观测层出现双写词典。

## Metric dictionary (v1 draft)
| Metric key | Type | Source | Formula / aggregation | Notes |
| --- | --- | --- | --- | --- |
| `delivery_success_rate` | gauge | delivery audit records | `delivered / (delivered + failed)` | duplicate 不计入分母 |
| `delivery_retry_count` | counter | audit `attempts` | `sum(max(attempts-1, 0))` | 按时间窗口累加 |
| `delivery_latency_p95_ms` | gauge | attempt timestamps | `p95(finished_at - started_at)` | 单位毫秒 |
| `delivery_dead_letter_count` | counter | outbox records | `status=failed` count | durable-outbox 模式生效 |
| `delivery_manual_intervention_count` | counter | ops action logs | 手工回放/补偿次数 | 由 `T-010` 维护 |

## Dimension keys
- `delivery_mode`: `in-process | durable-outbox`
- `event_type`: 当前 `research.*` 事件名
- `paper_id`
- `module_id`（若存在）
- `severity`（info/warning/error）

## Field-level mapping to backend artifacts
| Contract field | T-009 source |
| --- | --- |
| `delivery_mode` | `GovernanceDeliveryAuditRecord.mode` |
| `delivery_status` | `GovernanceDeliveryAuditRecord.status` |
| `dedupe_key` | `GovernanceDeliveryAuditRecord.dedupe_key` |
| `trace_id` | `GovernanceDeliveryAuditRecord.trace_id` |
| `attempts` | `GovernanceDeliveryAuditRecord.attempts` |
| `outbox_status` | `GovernanceOutboxRecord.status` |
| `outbox_attempts` | `GovernanceOutboxRecord.attempts` |
| `last_error` | `GovernanceDeliveryAuditRecord.final_error` / `GovernanceOutboxRecord.last_error` |

## Alert severity baseline
- `warn`: success rate < 99.5% (5m window) or retry spike
- `error`: success rate < 98.0% (5m window) or dead-letter growth
- `critical`: sustained delivery failure with business impact

## Compatibility rules
- 本契约不改写 `research.*` 业务语义。
- 所有字段先增量可选，避免破坏旧面板/旧流程。
- 新增字段命名必须复用本文件，不得在 `T-009/T-010` 另建同义名。

## Ownership
- Producer owner: `T-009`（字段来源与计算逻辑）
- Consumer owner: `T-010`（告警/运行手册/回放流程）
- Semantic owner: `T-003`（业务治理语义）
