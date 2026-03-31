# 00 Overview

## Status
- State: planned
- Next step: 等 `T-025` 到 `T-027` 提供稳定 graph/state/readiness/control-plane surface 后，再启动 planner / critic implementation。

## Goal
- 为 research-argument domain 增加高价值动作排序和多视角 critique 能力。
- 在不破坏 V1 稳定性的前提下，补齐 bundle planning、CriticHub、memory 与后台任务编排。
- 在同一任务内补齐 `RuleEngine`、`RiskReportAssembler`、异步可靠性和 API 治理约束。

## Non-goals
- 不在本任务重新定义 graph/state persistence。
- 不实现 V2/V3 学习型排序、contextual bandit 或 MCTS rollout。
- 不把 CriticHub 直接当作 source-of-truth。
- 不替代全局 Git/sync 子系统实现，只声明兼容钩子与治理要求。

## Acceptance criteria (high level)
- [x] `dev-docs/active/research-argument-planner-critic-v15/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [ ] candidate generation 与 bundle ranking contracts 已固定。
- [ ] CriticHub / RuleEngine / RiskReportAssembler ownership split 已固定。
- [ ] `RuleEngine` 输出已固定为 `severity/detail/pointers`。
- [ ] stagnation detection、memory/tabu、async task taxonomy、retry/backoff、idempotency keys、error classes、rate limiting、API cost accounting、observability hooks 已固定。
- [ ] 验证通过且不破坏 V1 graph/state。
