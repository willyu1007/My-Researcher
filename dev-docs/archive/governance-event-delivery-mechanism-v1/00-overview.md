# 00 Overview

## Status
- State: done
- Next step: 迁移到 `dev-docs/archive/governance-event-delivery-mechanism-v1` 并完成治理同步。

## Goal
- 为治理事件建立独立的交付治理层，确保 `research.*` 事件在 LLM 驱动的并发流程中可稳定传递、可重试、可审计。

## Non-goals
- 不改写已归档 `T-007` 的接口行为。
- 不改写 `T-003` 中阶段 gate 判定语义。
- 不在本任务直接实现消息中间件部署。

## Context
- `T-007` 已实现事件生产点，但事件交付机制细化被收口决议转入后续任务。
- 现有后端为 Fastify + TypeScript + Prisma，采用 repo-prisma SSOT。
- 项目强调 LLM 自动化并发尝试，需要明确事件投递与失败处理边界。

## Acceptance criteria (high level)
- [x] 明确事件交付模式与切换条件（`in-process` / `durable-outbox`）。
- [x] 明确事件 envelope 与幂等约束（event_id/dedupe_key/trace_id）。
- [x] 明确重试、死信、人工兜底策略与审批边界。
- [x] 形成后续实现任务拆分（至少 backend + observability 两条，已创建 `T-009/T-010`）。
- [x] 完成治理映射（`R-006/T-008`）并通过 sync/lint 校验。
