# 04 Verification

## Automated checks
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: pass.
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: pass (`20 passed, 0 failed`)；新增 adapter+audit+outbox 相关单测共 8 条通过。
- [pass] `GOVERNANCE_DELIVERY_MODE=in-process pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)。
- [pass] `GOVERNANCE_DELIVERY_MODE=durable-outbox pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)。
- [pass] `rg -n "delivery_success_rate|delivery_retry_count|delivery_latency_p95_ms|delivery_dead_letter_count|delivery_manual_intervention_count" dev-docs/archive/governance-event-delivery-observability-ops-v1/06-telemetry-contract-draft.md`
  - Result: telemetry 词典键已冻结并可被 `T-009/T-010` 复用。
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: `T-009` 注册并进入派生视图。
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass。
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-009 --json`
  - Result: `feature_id=F-001`, `milestone_id=M-001`, `status=archived`。

## Manual checks
- [pass] 确认 `T-009` 不改写 `T-003` 阶段语义与 gate 规则。
  - Evidence: `00-overview.md`/`02-architecture.md` 明确语义非目标与 forbidden 边界。
- [pass] 确认 `T-009` 与 `T-010` 职责边界无重复实现项。
  - Evidence: `T-009` 聚焦 delivery implementation，`T-010` 聚焦 observability + ops，已在双方 `02-architecture.md` 对齐。

## Rollout / Backout
- Rollout:
  - 先灰度 in-process delivery，再评估 outbox。
- Backout:
  - 关闭 delivery 新路径，回退到当前事件记录模式。
