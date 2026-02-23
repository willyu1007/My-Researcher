# 02 Architecture

## Layer boundaries
- Route: 只做路由绑定和请求/响应 schema。
- Controller: 参数验证、错误映射、调用 service。
- Service: 业务编排（读取聚合、审查决策、事件触发）。
- Repository: Prisma 查询与持久化；返回领域对象。

## Ownership (R/C/F)
- R (`T-007`): 新增治理接口与事件实现、审计字段完整性。
- C (`T-003`): gate 语义与生命周期主规则。
- C (`T-006`): 前端消费契约反馈。
- F (`T-007` forbidden): 重写 `T-003` 的 gate 策略、改造无关业务模块。

## Contract targets
- REST:
  - `GET /paper-projects/:id/timeline`
  - `GET /paper-projects/:id/resource-metrics`
  - `GET /paper-projects/:id/artifact-bundle`
  - `POST /paper-projects/:id/release-gate/review`
- Events:
  - `research.node.status.changed`
  - `research.timeline.event.appended`
  - `research.metrics.updated`
  - `research.release.reviewed`

## Compatibility invariants
- 不破坏既有字段组语义：
  - `lineage_meta`
  - `value_judgement_payload`
  - `snapshot_pointer_payload`
- 新增字段初版可空/可选，走增量发布。
- 对旧客户端保持未知字段忽略兼容。

## Data and migration notes
- 若需新增持久化字段，遵循 repo-prisma SSOT：先改 `prisma/schema.prisma`，再走 migration。
- 若无需落库，优先以 projection/read-model 聚合实现。
