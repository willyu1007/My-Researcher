# 02 Architecture

## Layer boundaries
- Metrics layer: 汇总 delivery 成功/失败/延迟/重试等指标。
- Alert layer: 依据阈值触发告警与升级。
- Ops layer: 执行 dead-letter 回放、人工审批和应急回滚。
- Audit layer: 记录所有运维动作，形成可追溯链路。

## Ownership (R/C/F)
- R (`T-010`): observability/alerting/runbook 定义与运维流程。
- C (`T-009`): delivery 状态事件与字段来源。
- C (`T-008`): policy 与回滚边界。
- F (`T-010` forbidden): 改写 delivery backend 业务实现、改写治理语义。

## Contract targets
- Metrics (minimum):
  - `delivery_success_rate`
  - `delivery_retry_count`
  - `delivery_latency_p95_ms`
  - `delivery_dead_letter_count`
  - `delivery_manual_intervention_count`
- Alerts:
  - warn/error/critical 三级触发矩阵
- Ops artifacts:
  - replay request form
  - approval record
  - incident timeline
  - postmortem template

## Compatibility invariants
- 指标命名与 `T-009` 字段一致，不自创第二套词典。
- 告警策略不改变业务语义，仅反映执行状态。
- 回放动作必须保留审计字段，不允许无痕操作。
- 命名与口径以 `06-telemetry-contract-draft.md` 为准（single source）。

## Operational notes
- 默认 local-first：先本地日志+结构化报告，再逐步接入外部监控。
- 所有自动化回放动作默认关闭，需审批后启用。
- 运维基线文档落点：
  - `07-alert-policy-and-slo.md`
  - `08-replay-approval-sop.md`
  - `09-incident-runbook.md`
  - `10-postmortem-template.md`
