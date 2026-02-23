# 01 Plan

## Phases
1. Contract alignment and state model design
2. Panel implementation and shared components
3. Integration hardening and flag rollout
4. Verification and governance sync

## Phase completion
- [x] Phase 1: Contract alignment and state model design
- [x] Phase 2: Panel implementation and shared components
- [x] Phase 3: Integration hardening and flag rollout
- [x] Phase 4: Verification and governance sync

## Detailed steps
- Step 1: 对齐 `T-005` 接口增量草案，冻结前端 DTO 和 view-model 映射。
- Step 2: 实现 Timeline panel（按时间序渲染事件，支持 node/snapshot 跳转入口）。
- Step 3: 实现 Runtime metrics panel（token/cost/gpu 指标与更新时间）。
- Step 4: 实现 Artifact bundle inspector（proposal/paper/repo/review 链接状态）。
- Step 5: 实现 Release review queue（只读列表 + 人审提交动作）。
- Step 6: 接入 feature-flag 与异常回退，确保默认关闭不影响现有页面。
- Step 7: 执行 typecheck/build/smoke，并回填 `04-verification.md`。

## Risks & mitigations
- Risk: `T-007` 接口字段变更导致前端解析失败。
  - Mitigation: 建立 DTO 适配层，统一 schema guard 与默认值。
- Risk: 并行分支事件量大导致渲染性能下降。
  - Mitigation: 分页/虚拟滚动与惰性展开细节。
- Risk: release-review 操作反馈不清晰。
  - Mitigation: 明确请求状态、失败原因、审计回执展示。
