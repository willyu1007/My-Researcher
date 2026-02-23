# Roadmap

## Summary
- 目标：为治理事件交付建立可观测与运维保障基线，覆盖指标、告警、回放、人工审查与应急回滚流程。
- 本任务聚焦 observability + ops，不承担 delivery core 代码实现。

## Milestones
1. Delivery telemetry contract freeze
2. Alerting and SLO policy definition
3. Replay and incident playbook baseline
4. Verification and rollout governance

## Scope
- 定义 delivery 指标面：成功率、重试次数、滞留时延、死信量、手工干预量。
- 定义告警阈值与分级响应（warn/error/critical）。
- 定义 dead-letter 回放与人工审批流程。
- 形成运维 runbook 与事件审计报表模板。

## Out of scope
- 不改写后端 delivery 业务代码（由 `T-009` 负责）。
- 不修改 `T-003`/`T-008` 治理语义。
- 不在本任务部署新的第三方监控平台。

## Inputs and dependencies
- `dev-docs/active/governance-event-delivery-mechanism-v1/`
- `dev-docs/active/governance-event-delivery-backend-implementation-v1/`
- `docs/context/` 现有环境与观测上下文（若存在）

## Risks
- 指标定义与业务语义不一致，导致误报/漏报。
- 告警阈值缺乏分层，造成噪音告警。
- 回放流程缺少审批门禁，带来二次风险。

## Rollback
- 若新告警策略噪音过高：回退到仅 critical 级别告警。
- 若回放流程不稳定：冻结自动回放，仅保留人工审批模式。
- 若运维文档与实现脱节：回退到最小可执行 runbook 并补齐证据。

## Definition of done
- `roadmap + 00~05 + .ai-task.yaml` 文档完整。
- 指标、告警、回放、应急流程都有可执行标准。
- 与 `T-009` 职责边界清晰，形成联动依赖顺序。
- `sync --apply` 与 `lint --check` 通过。
