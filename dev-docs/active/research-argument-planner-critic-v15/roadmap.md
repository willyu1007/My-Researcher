# Research Argument Planner Critic v1.5 Roadmap

## Decision
- Child task: `T-028 research-argument-planner-critic-v15`
- Mapping: `M-001 > F-001 > R-011`
- Primary goal: 在 V1 graph/state 与 bridge 稳定后，为 research-argument 层补上 candidate generation、bundle ranking、CriticHub、RuleEngine、RiskReportAssembler、stagnation detection、memory/tabu 与 async execution enhancement。

## Phases
1. Planner action space and bundle scoring
2. CriticHub and rule-engine split
3. Memory / stagnation / async execution
4. Verification and handoff

## Explicit defaults
- 本任务是 V1.5 enhancement，不得前置到 V1。
- CriticHub 输出不自动成为权威对象，仍受引用 / candidate / rule-check / human-confirm 约束。
- async reliability、API governance、cost、audit 和 observability hooks 在本任务内明确 owner。
