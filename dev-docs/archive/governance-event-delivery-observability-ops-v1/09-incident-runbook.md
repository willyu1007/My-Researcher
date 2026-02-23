# 09 Incident Runbook

## Incident levels
| Level | Definition | Typical signal |
| --- | --- | --- |
| L1 (warn) | 局部退化，可在单窗口内恢复 | `warn` 告警 |
| L2 (error) | 明显退化，影响部分研究链路 | `error` 告警持续 > 10 分钟 |
| L3 (critical) | 持续失败或影响发布门禁 | `critical` 告警 |

## Response workflow
1. Detect
   - 记录首次触发时间、告警指标、影响范围（`paper_id/event_type`）。
2. Triage
   - 判断是否为噪音告警、单点失败或系统性故障。
3. Contain
   - 关闭自动回放。
   - 若为 L3，冻结高风险阶段推进动作（仅保留手工审批路径）。
4. Recover
   - 修复故障根因（配置、下游依赖、重试策略）。
   - 按 `08-replay-approval-sop.md` 执行必要回放。
5. Validate
   - 连续 2 个窗口验证 success rate 与 dead-letter 恢复到 SLO 区间。
6. Close
   - 输出复盘记录并更新防再发措施。

## Fast diagnosis checklist
- `delivery_mode` 是否与当前环境预期一致（`in-process|durable-outbox`）。
- `delivery_retry_count` 是否异常飙升。
- `delivery_dead_letter_count` 是否持续增长。
- 失败是否集中在特定 `event_type` 或 `paper_id`。
- 审计记录中是否出现重复 `dedupe_key` 或同类 `final_error`。

## Communication template
- 事件标题：`[delivery-incident][L{level}] <summary>`
- 必填信息：
  - start time / detected by
  - impacted scope (`paper_id`, `event_type`, modules)
  - current mitigation
  - next checkpoint time

## Exit criteria
- 告警恢复：`warn/error/critical` 全部清零或降至可接受范围。
- 业务恢复：受影响链路可继续推进，且回放审计完整。
- 复盘完成：根因、影响、修复、预防动作均已记录并分配 owner。

## Backout guidance
- 若修复后出现二次回归，回退到“最小安全模式”：
  - 仅保留 `critical` 告警
  - 禁用自动回放
  - 采用手工审批执行补偿
