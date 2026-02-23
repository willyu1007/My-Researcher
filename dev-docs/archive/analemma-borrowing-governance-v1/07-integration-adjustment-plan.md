# 07 Integration Adjustment Plan

## Scope
- 本文档仅给出联动调整方案，不实施代码。
- 目标：让 `T-005` 产出的借鉴适配层可被前后端任务直接消费。

## Integration strategy
1. 先后端后前端：先提供稳定只读接口与事件，再在桌面端接入可视化。
2. 读写分离：首轮仅增加只读查询与审核动作，不改核心训练/实验执行链路。
3. Feature-flag rollout：新增面板与接口均走 feature flag。

## Backend adjustment proposal (future T-007)
### Planned deliverables
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
- Read model:
  - timeline/materialized view
  - runtime metrics snapshot
  - artifact bundle projection

### Acceptance criteria
- API 返回与 `08-interface-delta-spec.md` 一致。
- 默认不影响既有接口行为。
- 人审 gate 接口具备审计字段。

## Frontend adjustment proposal (future T-006)
### Planned deliverables
- Desktop modules:
  - Timeline panel
  - Runtime metrics panel
  - Artifact bundle inspector
  - Release review queue
- UX constraints:
  - 默认只读
  - 显示证据链跳转（node -> snapshot -> section）
  - 明确 “AI-generated” 合规标识

### Acceptance criteria
- 面板数据可追溯到后端接口字段。
- 不改动现有壳层路由主流程。
- 具备加载失败与空数据回退状态。

## Suggested task decomposition
1. `T-006 desktop-governance-observability-panels`
2. `T-007 governance-read-api-and-release-review-gate`

## Risk controls
- 避免一次性引入写路径改造。
- 所有新增字段默认 nullable，逐步收紧。
- 评审动作必须记录 `approved_by/approved_at/reason`。
