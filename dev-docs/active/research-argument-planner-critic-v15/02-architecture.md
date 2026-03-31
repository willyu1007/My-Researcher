# 02 Architecture

## Inputs
- `T-025` graph/state/read models
- `T-026` readiness and decision surfaces
- `T-027` UI action / explainability requirements

## Frozen boundaries
- Planner 负责 candidate generation、bundle ranking、reason logging。
- CriticHub 负责 reviewer-style critique 与建议。
- RuleEngine 负责 deterministic hard checks。
- RiskReportAssembler 负责 `severity / detail / pointers` 报告投影。
- Memory 层负责 action history、tabu、lesson priors。

## Produced advisory contract surface
- `PlannerCandidate`
  - action candidate、expected impact、reason、required inputs
- `PlannerBundle`
  - ranked candidates、bundle rationale、preconditions、stop conditions
- `CriticFinding`
  - reviewer persona、finding text、support refs、non-authoritative status
- `RuleFinding`
  - deterministic finding with `severity / detail / pointers`
- `SubmissionRiskFinding`
  - grouped risk item、affected dimensions、suggested fix、document/object pointers
- `AsyncTaskRecord`
  - task type、idempotency key、attempt state、retry policy、cost / telemetry refs

## Advisory-to-authority rule
- Critic / planner / rule output 默认都是 advisory。
- 只有在满足 citation / candidate selection / deterministic checks / human confirmation 后，才允许推动 graph object、decision 或 handoff artifact 进入 authority 状态。

## Async and API governance owner
- 本任务负责定义：
  - async task taxonomy
  - retry/backoff
  - idempotency keys
  - error classes
  - rate limiting
  - API cost accounting
  - observability hooks
- 本任务不接管全局 sync/Git 子系统实现，但必须声明兼容性需求与 metadata hooks。

## Out of scope
- redefining persistence models
- V2/V3 learning algorithms
- replacing human confirmation on high-risk actions
