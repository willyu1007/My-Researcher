# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## Decisions & tradeoffs
- 决策: 把接口交付拆为独立后端任务 `T-007`。
  - 理由: 避免 `T-003` 主治理语义与实现细节混写。
- 决策: 先读接口后审查写接口。
  - 理由: 让 `T-006` 可尽早接入观测面板，降低端到端阻塞。
- 决策: 事件触发点与接口交付同任务完成。
  - 理由: 保证 timeline 与 metrics 更新链一致。

## Planned artifacts
- New backend routes/controllers/services/repositories
- Contract tests and smoke evidence
- Audit trail records for release review

## Open follow-ups
- 非阻塞后续：明确事件交付机制（现有系统事件总线/内部发布器）并补充实现约束。
- 收口决议：该后续项不阻塞 `T-007` 归档，建议在新任务（建议 `T-008`）中承接。

## Progress log
- 2026-02-23: 进入实现阶段，开始落地 route/controller/service/repository 改造与测试补齐。
- 2026-02-23: 已完成接口落地：
  - `GET /paper-projects/:id/timeline`
  - `GET /paper-projects/:id/resource-metrics`
  - `GET /paper-projects/:id/artifact-bundle`
  - `POST /paper-projects/:id/release-gate/review`
- 2026-02-23: 已完成 shared 合同增量（type + schema）并接入 Fastify 路由校验。
- 2026-02-23: 已完成 service/repository 增量实现（timeline event、artifact bundle、runtime metric、release review audit）。
- 2026-02-23: 已补充 unit/integration 测试并通过。
- 2026-02-23: 收口评审通过，确认以 `v1` 目标归档；事件交付机制细化转后续任务。
