# 02 Architecture

## Boundaries
- In scope:
  - `apps/desktop` 的治理面板 UI、前端数据适配与交互状态管理。
- Out of scope:
  - 后端接口实现（归 `T-007`）。
  - 治理语义定义（归 `T-003/T-005`）。

## Ownership (R/C/F)
- R (`T-006`): 前端展示逻辑、DTO 适配、可用性与回退策略。
- C (`T-007`): API payload 稳定性与事件语义一致性。
- F (`T-006` forbidden): 直接修改后端路由、数据库 schema、生命周期 gate 策略。

## Interface contracts consumed
- REST:
  - `GET /paper-projects/:id/timeline`
  - `GET /paper-projects/:id/resource-metrics`
  - `GET /paper-projects/:id/artifact-bundle`
  - `POST /paper-projects/:id/release-gate/review`
- Events (optional progressive enhancement):
  - `research.node.status.changed`
  - `research.timeline.event.appended`
  - `research.metrics.updated`
  - `research.release.reviewed`

## UI data model invariants
- 所有新增字段按 nullable/optional 处理，不假设必填。
- 任何 panel 都必须暴露证据链入口（node/snapshot/reference）。
- 默认状态下 feature flag 关闭，应用主流程行为不变。

## Integration sequence
1. 读取静态接口契约并生成前端类型。
2. 落地四个 panel + 共用 loading/error/empty 组件。
3. 打开灰度 flag 做端到端 smoke，回填验证证据。
