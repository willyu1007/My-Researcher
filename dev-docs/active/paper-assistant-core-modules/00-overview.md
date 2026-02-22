# 00 Overview

## Status
- State: planned
- Next step: 基于 `06-task-packages.md` 与 `T-003` 边界契约确认模块包 owner 与批次划分

## Goal
- 形成论文助手 8 个子功能的可执行任务包，作为模块定义与优先级的 SSOT。

## Non-goals
- 本阶段不实现业务代码。
- 本阶段不锁定所有模块接口与技术选型细节。
- 本阶段不启动跨用户协作能力。
- 本任务不维护 4 阶段门禁规则（由 `T-003` 维护）。
- 本任务不维护模块 4 到 7 的版本字段与冻结策略（由 `T-003` 维护）。

## Context
- 初始化已完成（Stage A/B/C complete），仓库具备 local-first、CI、环境与上下文基础设施。
- 用户明确要求：8 个子功能目前为架构设想，边界需后续讨论，不提前定稿。
- 跨任务边界契约见：`dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`。

## Acceptance criteria (high level)
- [ ] 8 个子功能均有任务包条目（目标、范围、验收、依赖）。
- [ ] 任务包按执行优先级分批，且顺序可解释。
- [ ] 任务包与当前 Blueprint、Stage A 约束一致。
- [ ] `T-003` 仅引用本任务的模块包定义，不产生第二套模块清单。
