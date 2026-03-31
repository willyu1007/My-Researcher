# 05 Pitfalls

## P-001 planner can redefine V1 contracts by accident
- Symptom:
  - 为了排序方便，implementation 反向修改 graph/state 基础结构。
- Prevention:
  - planner 只能消费 V1 contracts；任何基础模型变化必须回到 `T-024` / `T-025`。

## P-002 critic output can be mistaken for authority
- Symptom:
  - 没有引用或人工确认的 critic 输出直接落为正式 blocker / decision。
- Prevention:
  - 保持 `citation | candidate flag | rule-check | human-confirm` 之一为落库前提。
