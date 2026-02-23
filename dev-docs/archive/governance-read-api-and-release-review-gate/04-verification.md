# 04 Verification

## Automated checks
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result: pass
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: pass
- [pass] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: pass (`12 passed, 0 failed`)
- [not-applicable] `pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - Result: 本轮未修改 `prisma/schema.prisma`，无需执行 schema 变更校验。

## Manual smoke checks
- [pass] `GET /paper-projects/:id/timeline` 返回按时间序事件。
  - Evidence: `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts` 中 `governance read endpoints and release review endpoint work together`。
- [pass] `GET /paper-projects/:id/resource-metrics` 返回 tokens/cost/gpu 指标快照。
  - Evidence: 同上 integration case + `apps/backend/src/services/research-lifecycle-service.unit.test.ts` metrics case。
- [pass] `GET /paper-projects/:id/artifact-bundle` 返回四类链接字段。
  - Evidence: integration case 对 `proposal_url/review_url` 进行断言。
- [pass] `POST /paper-projects/:id/release-gate/review` 写入并返回审计回执。
  - Evidence: integration case 断言 `review_id/accepted`，unit case 断言 `audit_ref`。
- [pass] release review 输入校验负例。
  - Evidence: integration case `release review endpoint rejects invalid payload` 返回 `400 INVALID_PAYLOAD`。

## Rollout / Backout
- Rollout:
  - 先上线只读接口，再灰度启用 release-review 写入口。
- Backout:
  - 临时下线新增路由或以 feature flag 关闭新入口，保留旧行为。

## Governance checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: pass
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass
