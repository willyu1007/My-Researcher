# 00 Overview

## Status
- State: done
- Next step: 任务文档归档到 `dev-docs/archive/governance-read-api-and-release-review-gate` 并保持只读；事件交付机制细化转后续任务跟进。

## Goal
- 落地治理读 API 与发布审查门接口，使 `T-006` 可直接消费 timeline/metrics/artifact/review 数据并具备审计可追溯性。

## Non-goals
- 不实现桌面端展示逻辑。
- 不改写 `T-003` 的阶段门禁主语义。
- 不引入非必要的基础设施迁移（如消息总线重构）。

## Context
- `T-005` 已定义接口增量草案和兼容性约束。
- 当前后端栈为 Fastify + TypeScript + Prisma（repo-prisma SSOT）。
- 需要在保持兼容的前提下提供新增查询与审查写入。

## Acceptance criteria (high level)
- [x] 四个接口按契约返回，且不破坏现有接口行为。
- [x] release-review 提交写入审计字段（reviewers/decision/risk_flags/label_policy/approved_at）。
- [x] 新增事件 payload 与接口字段保持一致。
- [x] typecheck + tests + 手工 smoke 均通过并记录证据。
