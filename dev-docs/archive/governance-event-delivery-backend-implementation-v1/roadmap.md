# Roadmap

## Summary
- 目标：把 `T-008` 的事件交付机制决议落地为后端可执行实现，优先交付稳定的 `in-process` 路径，并预留 `durable-outbox` 升级位。
- 本任务聚焦 backend delivery，不改写治理语义与前端展示。

## Milestones
1. Delivery adapter and envelope contract implementation
2. In-process publish/retry baseline
3. Durable-outbox readiness (schema + worker boundary)
4. End-to-end backend verification and rollback playbook

## Scope
- 实现 `delivery adapter` 抽象（publish/ack/nack/retry）。
- 落地事件 envelope（`event_id/trace_id/dedupe_key/payload_version`）。
- 落地 `in-process` 重试与失败持久化策略。
- 设计并实现 `durable-outbox` 升级兼容边界（可先 feature-flag 关闭）。

## Out of scope
- 不改写 `T-003` 的 stage/value gate 语义。
- 不新增桌面端 UI 面板能力（由前端任务负责）。
- 不在本任务完成生产级运维值守体系（由 `T-010` 负责）。

## Inputs and dependencies
- `dev-docs/active/governance-event-delivery-mechanism-v1/`
- `dev-docs/archive/governance-read-api-and-release-review-gate/`
- `dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md`

## Risks
- 重试与幂等设计不完整导致重复副作用。
- outbox 事务边界不当导致事件丢失或重复投递。
- 与现有 repository 层耦合过高，后续演进困难。

## Rollback
- 若投递失败率异常：回退到仅记录审计、不异步投递的安全模式。
- 若 outbox 方案不稳定：保留 `in-process` 路径，关闭 outbox feature flag。
- 若兼容性风险出现：回滚新增 delivery 字段到可选态，不改变现有 payload 核心语义。

## Definition of done
- `roadmap + 00~05 + .ai-task.yaml` 文档完整。
- 后端交付路径有明确实现步骤、接口边界、验收标准。
- 与 `T-010` 的 observability/ops 职责边界清晰，不冲突。
- `sync --apply` 与 `lint --check` 通过。
