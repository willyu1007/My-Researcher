# 03 Implementation Notes

## Status
- Current status: `planned`
- Last updated: 2026-02-21

## What changed
- 创建任务包文档骨架并生成 roadmap。
- 将 8 个子功能从“抽象设想”转为“可执行任务包列表（待确认边界）”。

## Files/modules touched (high level)
- `dev-docs/active/paper-assistant-core-modules/roadmap.md`
- `dev-docs/active/paper-assistant-core-modules/00-overview.md`
- `dev-docs/active/paper-assistant-core-modules/01-plan.md`
- `dev-docs/active/paper-assistant-core-modules/02-architecture.md`
- `dev-docs/active/paper-assistant-core-modules/03-implementation-notes.md`
- `dev-docs/active/paper-assistant-core-modules/04-verification.md`
- `dev-docs/active/paper-assistant-core-modules/05-pitfalls.md`
- `dev-docs/active/paper-assistant-core-modules/06-task-packages.md`

## Decisions & tradeoffs
- Decision:
  - 先形成任务包与顺序，不提前锁定接口细节。
  - Rationale:
    - 符合用户“先讨论后定稿”的要求。
  - Alternatives considered:
    - 直接拆实现任务并绑定接口；被拒绝（过早定稿）。

## Deviations from plan
- Change:
  - 无
  - Why:
    - N/A
  - Impact:
    - N/A

## Known issues / follow-ups
- 需逐个确认 8 个任务包的 DoD 与优先级批次。
- 需决定是否先做最小桌面壳再做模块功能。

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
