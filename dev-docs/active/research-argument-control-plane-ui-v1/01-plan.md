# 01 Plan

## Phases
1. Read-model to view mapping
2. View composition and interaction design
3. Desktop implementation plan and verification

## Detailed steps
- Phase 1:
  - 固定 control-plane read models 与 UI 视图的映射。
- Phase 2:
  - 固定最小 screen set：
    - abstract state dashboard
    - branch graph
    - blocker board
    - claim-evidence coverage
    - protocol/baseline/repro readiness
    - submission risk report review
    - writing entry packet preview
    - action queue
    - recent decisions
  - 固定人工确认点与 override 操作。
- Phase 3:
  - 执行 desktop typecheck、UI governance gate 与手工闭环验证。

## Entry criteria
- `T-025` 已冻结 read-model DTO 与 explainability 字段。
- `T-026` 已冻结 readiness / packet / report 查询与 action surfaces。

## Exit review before `T-028` / implementation close
- 每个 view 都已映射到单一稳定 read model，不再依赖 ad-hoc 拼装。
- 高风险动作的 confirmation / audit reason surface 已冻结。
- risk report 和 packet preview 的字段足够支撑 reviewer-style 解释与 downstream handoff。
- UI 没有反向侵入 `title-card` / `paper-project` persistence 细节。
