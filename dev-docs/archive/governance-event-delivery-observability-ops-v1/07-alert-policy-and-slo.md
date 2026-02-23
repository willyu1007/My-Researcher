# 07 Alert Policy and SLO

## Scope
- 本文定义治理事件交付的可观测基线：SLI/SLO、告警分级、升级路径和降噪策略。
- 命名与口径以 `06-telemetry-contract-draft.md` 为准。

## Core SLI definitions
| SLI | Metric key | Window | Formula |
| --- | --- | --- | --- |
| Delivery success rate | `delivery_success_rate` | 5m/30m | `delivered / (delivered + failed)` |
| Retry pressure | `delivery_retry_count` | 5m | `sum(max(attempts - 1, 0))` |
| Delivery latency | `delivery_latency_p95_ms` | 15m | `p95(finished_at - started_at)` |
| Dead-letter volume | `delivery_dead_letter_count` | 15m | `count(status=failed)` |
| Manual intervention load | `delivery_manual_intervention_count` | 1h | `count(ops_action in [replay, compensate])` |

## SLO baseline (v1)
| SLO | Target | Burn budget policy |
| --- | --- | --- |
| Success rate | `>= 99.5%` (rolling 30m) | 两次连续窗口低于目标即进入 incident 流程 |
| Latency p95 | `<= 1500 ms` (rolling 15m) | 超阈值连续 3 个窗口触发 error |
| Dead-letter rate | `< 0.2%` of delivery attempts (rolling 30m) | 超阈值立即人工排障 |

## Alert matrix
| Severity | Trigger | Primary owner | Action SLA |
| --- | --- | --- | --- |
| warn | success rate `< 99.5%` for 5m, or retry spike > 2x baseline | on-call backend | 30 分钟内确认 |
| error | success rate `< 98.0%` for 5m, or latency p95 `> 1500 ms` for 15m | backend lead + ops | 10 分钟内止血 |
| critical | success rate `< 95.0%` for 10m, or dead-letter 持续增长并影响阶段推进 | incident commander | 5 分钟内建立 war room |

## Escalation policy
1. `warn`：记录 ticket + 观察 1 个窗口；若未恢复，升级 `error`。
2. `error`：暂停非关键 replay，锁定新风险发布；若 10 分钟未恢复，升级 `critical`。
3. `critical`：启动 incident runbook，要求人工审批才能恢复自动化回放。

## Alert noise control
- 抑制规则：
  - 同一 `paper_id + event_type + delivery_mode` 在 10 分钟内仅保留首个 warn。
  - 已进入 `critical` 的同类告警自动合并。
- 免打扰窗口：
  - 仅允许 `warn` 级别进入延迟队列，`error/critical` 不延迟。

## Ownership and boundaries
- R: `T-010` 定义 SLO/告警策略与值守动作。
- C: `T-009` 提供指标来源、事件字段与失败上下文。
- F: `T-010` 不可通过告警策略改写 delivery 业务行为。

## Verification checklist
- [x] 指标键名与 `06-telemetry-contract-draft.md` 一致。
- [x] 覆盖 `warn/error/critical` 三级策略。
- [x] 每个等级都有 owner 和动作时限。
