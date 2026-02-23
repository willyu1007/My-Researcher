# 00 Overview

## Status
- State: done
- Next step: 进入归档评审；若通过则迁移到 `dev-docs/archive/governance-event-delivery-backend-implementation-v1`。

## Goal
- 将治理事件交付机制转化为后端可执行实现，保证在并发与失败场景下的可重试、可审计和可回滚。

## Non-goals
- 不改写 `T-003` 治理语义与 gate 判定。
- 不承担运维值守与告警体系设计（由 `T-010` 负责）。
- 不改写桌面端 UI。

## Context
- `T-008` 已定义 delivery policy、幂等与失败恢复方向。
- `T-007` 已有事件生产点，当前缺少稳定交付层实现。
- 本任务是 delivery implementation owner。

## Acceptance criteria (high level)
- [x] 交付适配层（adapter）实现完成并接入现有事件生产点。
- [x] `in-process` 重试与失败审计路径可运行。
- [x] `durable-outbox` 升级边界明确，且可通过 feature flag 控制。
- [x] 后端测试覆盖成功、重试、失败、幂等四类关键路径。
- [x] 与 `T-010` 的观测字段契约对齐（见 `06-telemetry-contract-draft.md`）。
