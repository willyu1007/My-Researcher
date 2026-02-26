# 01 Plan

## Plan principle
- 自动拉取以规则为中心，不再围绕 paper/topic 即时查询执行。
- 先完成后端异步可运行链路，再替换前端交互入口，最后做回归验证。

## Phase A — Schema & contracts
1. Prisma 增加 Topic/Rule/Run/Alert/Suggestion 模型并生成 migration。
2. Shared 删除旧 search/web-import 契约，新增 Topic/Auto Pull DTO 与 schema。

Acceptance criteria:
- Schema 与 shared typecheck 通过。
- 新旧契约边界清晰，无重复定义。

## Phase B — Backend layered implementation
1. 新增 topic-settings 与 auto-pull 路由、控制器、服务、仓储。
2. 接入 Prisma/InMemory 双实现。
3. 删除 `/literature/search`、`/literature/web-import`。

Acceptance criteria:
- 规则 CRUD、run、retry、alerts ack 接口可调用。
- 旧接口访问返回 404。

## Phase C — Async run engine
1. `trigger` 创建 `PENDING` run 后后台执行。
2. 状态流转：`PENDING -> RUNNING -> SUCCESS|PARTIAL|FAILED|SKIPPED`。
3. Scheduler 按 due 规则触发。
4. single-flight：同规则 in-flight 时写 `SKIPPED` + 告警。

Acceptance criteria:
- run 明细可查询到 source attempts 与错误信息。
- 并发触发不会导致同 rule 重叠运行。

## Phase D — UI replacement
1. 自动导入页替换为三子 Tab：Topic 设置 / 规则中心 / 运行与告警。
2. 支持 Topic CRUD、规则创建编辑启停、立即运行、告警筛选与 ack。
3. 运行列表展示状态、触发类型、耗时、导入/失败计数。

Acceptance criteria:
- 旧“关键词即时检索/URL 批量抓取”交互下线。
- 全局规则与 Topic 规则可独立展示与操作。

## Phase E — Verification & docs
1. 跑完 shared/backend/desktop typecheck、backend test、desktop build。
2. 更新 `00/02/03/04/roadmap` 以支持后续会话恢复。

Acceptance criteria:
- 自动化检查全部通过。
- 文档与当前实现一致。
