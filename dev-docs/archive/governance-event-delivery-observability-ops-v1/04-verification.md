# 04 Verification

## Automated checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: 注册与派生视图更新完成。
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass。
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-010 --json`
  - Result: `feature_id=F-001`, `milestone_id=M-001`, `status=archived`。
- [pass] `GOVERNANCE_DELIVERY_MODE=in-process pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)；验证 observability 依赖的治理读接口在默认交付模式可用。
- [pass] `GOVERNANCE_DELIVERY_MODE=durable-outbox pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)；验证 observability 依赖的治理读接口在 outbox 模式可用。
- [pass] `rg -n "delivery_success_rate|delivery_retry_count|delivery_latency_p95_ms|delivery_dead_letter_count|delivery_manual_intervention_count" dev-docs/archive/governance-event-delivery-observability-ops-v1/06-telemetry-contract-draft.md dev-docs/archive/governance-event-delivery-observability-ops-v1/07-alert-policy-and-slo.md`
  - Result: telemetry 核心指标在词典与告警文档中一致。
- [pass] `rg -n "warn|error|critical|Action SLA|Escalation" dev-docs/archive/governance-event-delivery-observability-ops-v1/07-alert-policy-and-slo.md`
  - Result: 告警分级、触发条件、SLA 与升级策略完整。
- [pass] `rg -n "request_id|approved_by|rollback_plan|ops_action=replay|append-only" dev-docs/archive/governance-event-delivery-observability-ops-v1/08-replay-approval-sop.md`
  - Result: 回放审批与审计字段完整。
- [pass] `rg -n "Detect|Triage|Contain|Recover|Validate|Close|L1|L2|L3" dev-docs/archive/governance-event-delivery-observability-ops-v1/09-incident-runbook.md`
  - Result: incident runbook 闭环步骤与分级定义完整。

## Manual checks
- [pass] 确认 `T-010` 不改写 `T-009` backend delivery 实现主权。
  - Evidence: `00-overview.md`、`02-architecture.md` 明确 `T-010` 只维护 observability + ops。
- [pass] 确认 runbook/alert 字段命名与 `T-009` 契约一致。
  - Evidence: `06-telemetry-contract-draft.md` 为 single source，`07/08/09` 全量引用该命名。

## Rollout / Backout
- Rollout:
  - 先启用核心指标和 critical 告警，再扩展 warn/error。
- Backout:
  - 降级到最小监控模式，仅保留关键审计日志。
