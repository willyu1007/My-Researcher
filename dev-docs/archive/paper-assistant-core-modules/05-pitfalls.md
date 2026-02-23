# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- 未经确认不要把“架构设想”写成“实现定稿”。
- 清理 `init/` 前必须先完成更新根文档与归档。

## Pitfall log (append-only)

### 2026-02-21 - Premature finalization of module boundaries
- Symptom:
  - 8 个子功能被误写为“已定稿”实现边界。
- Context:
  - 讨论阶段用户明确要求“先讨论，不定稿”。
- What we tried:
  - 先给出完整边界并落入 Stage A 决策区。
- Why it failed (or current hypothesis):
  - 违背用户期望，导致文档语义过早收敛。
- Fix / workaround (if any):
  - 回退为“discussion draft / tbd”，并恢复 open question。
- Prevention (how to avoid repeating it):
  - 讨论阶段统一使用“待讨论”标签，审批前再转 confirmed。
- References (paths/commands/log keywords):
  - `init/_work/stage-a-docs/requirements.md`
  - `init/_work/stage-a-docs/risk-open-questions.md`
