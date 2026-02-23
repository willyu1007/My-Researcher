# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-24

## What changed
- 创建任务包文档骨架并生成 roadmap。
- 将 8 个子功能从“抽象设想”转为“可执行任务包列表（待确认边界）”。
- 明确本任务为“模块任务包 SSOT”，并将阶段门禁/版本治理职责移交给 `T-003`。
- 增加稳定模块映射（M1..M8 与 TP-01..TP-08）。
- 将本任务术语从 `Phase` 收敛为 `Batch`，避免与 `T-003` 的 4 阶段门禁概念冲突。
- 在 `06-task-packages.md` 新增 owner/handoff 映射与执行队列，补齐可执行性信息。
- 在 `roadmap.md` 回填 open questions 决议（3 批推进；先桌面壳后模块）。

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
- Decision:
  - 采用双任务单写者模型防止漂移。
  - Rationale:
    - 同主题双任务并行维护时，若无 owner 会快速漂移。
  - Alternatives considered:
    - 保留两边自由编辑；被拒绝（风险过高）。

## Deviations from plan
- Change:
  - 无
  - Why:
    - N/A
  - Impact:
    - N/A

## Known issues / follow-ups
- 后续实现需新建任务承接 Batch A/B/C，`T-002` 不直接承载业务代码实现。
- 每次涉及跨任务更新时，需同步执行 `06-task-boundary-and-anti-drift.md` 的检查清单。

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
