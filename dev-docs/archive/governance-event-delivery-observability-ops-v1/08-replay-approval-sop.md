# 08 Replay Approval SOP

## Purpose
- 规范 dead-letter/failed delivery 的回放流程，确保每次回放均可审批、可追溯、可回滚。

## Replay entry criteria
- 仅当满足以下任一条件可发起回放申请：
  - `delivery_dead_letter_count > 0` 且确认为可恢复失败。
  - 某关键 `paper_id` 的治理事件缺失，影响阶段推进。
  - `critical` incident 明确要求补偿执行。

## Roles (R/C/F)
- R: on-call backend（申请与执行）
- C: module owner（业务语义核验）
- C: reviewer/approver（审批）
- F: 未审批直接执行批量回放

## Replay request form (required fields)
| Field | Required | Description |
| --- | --- | --- |
| `request_id` | yes | 全局唯一请求标识 |
| `paper_id` | yes | 受影响论文对象 |
| `event_id` / `dedupe_key` | yes | 待回放事件主键 |
| `event_type` | yes | `research.*` 事件名 |
| `failure_reason` | yes | 失败根因摘要 |
| `risk_level` | yes | low/medium/high |
| `requested_by` | yes | 发起人 |
| `approved_by` | yes | 审批人 |
| `approved_at` | yes | 审批时间 |
| `rollback_plan` | yes | 回滚/补偿策略 |

## Approval gate rules
| Condition | Approval policy |
| --- | --- |
| 单事件回放、风险 low | 1 位 approver |
| 批量回放（> 10 events）或风险 medium | 2 位 approver（backend lead + module owner） |
| 涉及发布门/跨模块补偿或风险 high | 2 位 approver + incident commander 口头确认并留痕 |

## Execution procedure
1. 提取待回放集合（按 `paper_id/event_type/dedupe_key`）。
2. 校验幂等键：若已 delivered，标记 skipped 并写审计记录。
3. 执行回放（默认串行；批量必须分批并记录批次号）。
4. 每个事件写入运维审计字段：
   - `ops_action=replay`
   - `request_id`
   - `operator`
   - `result=delivered|failed|skipped`
   - `result_error`（可空）
5. 回放后 15 分钟复核核心指标（success rate、dead-letter、latency）。

## Rejection and abort rules
- 任一必填字段缺失：拒绝执行并返回补全清单。
- 审批链不完整：拒绝执行。
- 回放中连续失败率 > 20%：立即中止并升级 incident。

## Rollback strategy
- 回放造成重复副作用时，执行补偿动作并追加 `ops_action=compensate` 审计记录。
- 保留原始失败记录，不做覆盖写，采用 append-only 追溯。

## Evidence and retention
- 申请单、审批记录、执行日志、结果复核必须同 `request_id` 关联。
- 本地模式下至少保留 30 天；进入集中存储后按平台合规策略迁移。
