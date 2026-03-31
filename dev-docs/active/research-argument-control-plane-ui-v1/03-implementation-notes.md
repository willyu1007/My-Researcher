# 03 Implementation Notes

## Initial decisions
- 决定 UI 任务只消费 research-argument read models，不承担 title-card source-object 编辑主线。
- 决定 minimum views 与 `research-varify` 控制面建议保持一致，但不提前实现 V1.5 planner 操作台。

## Open hooks
- 待实施时需要决定控制面入口与 `paper-project` / `title-card` 主模块之间的导航关系。
