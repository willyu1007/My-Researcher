# 04 Verification

## Automated checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: `T-008` 任务与派生视图注册成功。
- [pass] `node .ai/scripts/ctl-project-governance.mjs map --project main --task T-008 --feature F-001 --milestone M-001 --requirement R-006 --apply`
  - Result: `T-008` 映射到 `M-001/F-001` 并绑定 `R-006`。
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: 映射后再次 sync 未回退挂载关系。
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass。
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-008 --json`
  - Result: `feature_id=F-001`, `milestone_id=M-001`, `status=in-progress`。
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-009 --json`
  - Result: `T-009` 已归档，`dev_docs_path=dev-docs/archive/governance-event-delivery-backend-implementation-v1`。
- [pass] `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-010 --json`
  - Result: `T-010` 已归档，`dev_docs_path=dev-docs/archive/governance-event-delivery-observability-ops-v1`。
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: pass (`20 passed, 0 failed`)。
- [pass] `GOVERNANCE_DELIVERY_MODE=in-process pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)。
- [pass] `GOVERNANCE_DELIVERY_MODE=durable-outbox pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts`
  - Result: pass (`6 passed, 0 failed`)。

## Manual checks
- [pass] 确认 `T-008` 不改写 `T-003` 的 gate 语义正文，仅新增 delivery 层决议。
  - Evidence: `02-architecture.md` 明确 `C (T-003)` 与 `F (T-008 forbidden)`，并声明语义 owner。
- [pass] 确认 `T-008` 不改写 `T-007` 已归档接口验收定义。
  - Evidence: `00-overview.md`/`roadmap.md` 明确不变更 `T-007` 接口行为，仅处理 delivery 层。
- [pass] 确认 `T-008` 收口决议已启动并形成可执行建议。
  - Evidence: `06-closure-decision.md` 提供 readiness matrix、选项、风险与推荐方案。

## Rollout / Backout
- Rollout:
  - 先文档冻结，再拆实现任务，最后灰度上线。
- Backout:
  - 若决议冲突，保留任务包并回退到“仅 in-process”策略草案。
