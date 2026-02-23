# Roadmap

## Summary
- 目标：为治理事件建立可执行的交付机制基线，确保 `T-007` 已落地事件在并发与失败场景下具备可追溯、可重试、可审计的一致行为。
- 本任务先完成治理与架构收口，不直接改写业务 API 语义。

## Milestones
1. Event delivery policy freeze
2. Delivery architecture and compatibility contract
3. Backend implementation slicing plan
4. Verification and rollout/backout playbook

## Scope
- 定义事件交付模式与切换策略（`in-process` / `durable-outbox`）。
- 定义事件 envelope、幂等与重试约束。
- 定义 delivery observability（状态、指标、审计字段）。
- 形成后续实现任务拆分建议（建议 `T-009` 后端实现、`T-010` 运维与观测）。

## Out of scope
- 不新增或变更 `T-007` 的 REST 接口契约字段。
- 不改写 `T-003` 阶段门禁语义与 value gate 判定。
- 不在本任务部署新的中间件基础设施（Kafka/NATS/Redis Streams）。

## Inputs and dependencies
- `dev-docs/archive/governance-read-api-and-release-review-gate/`
- `dev-docs/archive/analemma-borrowing-governance-v1/08-interface-delta-spec.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/07-value-gate-dictionary.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md`

## Risks
- 事件语义与交付语义混写，造成职责漂移。
- 引入持久化队列后与现有 Prisma 事务边界冲突。
- 重试策略未定义幂等键，导致重复消费副作用。

## Rollback
- 若边界漂移：回退到仅保留决议文档，不输出实现拆分。
- 若方案冲突：冻结 `durable-outbox` 路径，仅保留 `in-process` 最小策略并标记待决。
- 若治理映射冲突：撤回 `R-006/T-008` 并重新挂载到正确 feature。

## Definition of done
- `roadmap + 00~05 + .ai-task.yaml` 完整。
- `T-008` 已映射到 `M-001/F-001`，并绑定 `R-006`。
- 交付机制决议包含：交付模式、幂等键、重试/死信、观测指标、回滚规则。
- `sync --apply` 与 `lint --check` 通过。
