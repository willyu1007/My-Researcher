# Topic Initial Pull And Rule Preview

## Goal
- Add topic-level first-run flag that controls full-range pull.
- Auto set first-run flag to false after first successful run.
- In topic settings list, click effective rule to preview with the same style/content as the "新增主题" rule preview.

## Non-goals
- No redesign of unrelated tabs.
- No change to rule contract semantics beyond topic-level initial pull signal.

## Status
- State: in-progress
- Next step: 基于现有 topic initial pull 与 effective rule preview 产物，继续收口剩余实现与验证记录；当前仅修复治理状态格式，不改该任务 scope。

## Scope
- Backend: auto-pull topic DTO/repository/service + run execution decision.
- Frontend: topic profile types/normalizers/controller/UI table interaction.
- DB: topic profile field persistence.
