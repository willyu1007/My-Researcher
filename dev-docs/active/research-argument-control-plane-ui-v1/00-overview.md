# 00 Overview

## Status
- State: planned
- Next step: 在 `T-025` / `T-026` 提供稳定 read models 后，固定桌面控制面的入口位置和最小视图集。

## Goal
- 提供 research-argument workspace 的用户可见控制面。
- 让用户能理解当前 readiness、分支状态、blocker、claim-evidence coverage 与待确认动作。
- 让用户能审查 protocol/baseline/repro readiness、submission risk report 和 writing handoff packet。

## Non-goals
- 不替代现有 `title-card` 工作台。
- 不在首版引入完整 portfolio 管理或自定义设计系统。
- 不在本任务实现 planner / critic runtime。

## Acceptance criteria (high level)
- [x] `dev-docs/active/research-argument-control-plane-ui-v1/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [ ] 控制面最小视图固定为 9 维 dashboard、branch graph、blocker board、coverage table、protocol/baseline/repro readiness、risk report review、writing handoff packet preview、action queue。
- [ ] 人工确认点和 override surface 已固定。
- [ ] desktop typecheck / UI governance / handoff 验证通过。
