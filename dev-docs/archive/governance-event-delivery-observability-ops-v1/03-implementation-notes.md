# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## What changed
- 基于 `T-008` 拆分创建 observability + ops 任务包（`T-010`）。
- 明确本任务不实现 delivery core，仅承接监控、告警、回放和 runbook。
- 新增并冻结跨任务 telemetry 命名词典：
  - `dev-docs/active/governance-event-delivery-observability-ops-v1/06-telemetry-contract-draft.md`
  - 与 `T-009` 当前字段来源完成一轮对齐。
- 新增告警与 SLO 基线文档：
  - `dev-docs/active/governance-event-delivery-observability-ops-v1/07-alert-policy-and-slo.md`
- 新增回放审批 SOP：
  - `dev-docs/active/governance-event-delivery-observability-ops-v1/08-replay-approval-sop.md`
- 新增 incident runbook 与复盘模板：
  - `dev-docs/active/governance-event-delivery-observability-ops-v1/09-incident-runbook.md`
  - `dev-docs/active/governance-event-delivery-observability-ops-v1/10-postmortem-template.md`

## Decisions and tradeoffs
- 决策: 优先冻结“核心指标 + 分级告警”，再扩展复杂运维自动化。
  - 理由: 先建立可靠值守底线，避免过度自动化引入新风险。
  - 替代方案: 一次性建设全自动回放；未采用，审批和风险控制不足。
- 决策: 回放默认人工审批。
  - 理由: 涉及治理链路，必须留痕与可追责。
  - 替代方案: 默认自动回放；未采用，风险过高。

## Open follow-ups
- 待后续实现任务落地真实指标上报后，执行阈值压测并回填 SLO 调优记录。

## Progress log
- 2026-02-23: 从 `T-008` 完成任务拆分并创建 `T-010` 文档包。
- 2026-02-23: 与 `T-009` 完成 telemetry 字段命名对齐，形成 `06-telemetry-contract-draft.md`。
- 2026-02-23: 完成告警矩阵、回放审批 SOP、incident runbook、postmortem 模板，收口 `T-010` AC。
