# 文献管理自动拉取系统重构 Roadmap（规则化异步版）

## Goal
- 将“自动拉取”从同步即时调用重构为“规则驱动 + 异步执行 + 可观测告警”，作为后续 LLM 自动化流程的稳定输入层。

## Locked product decisions
- 触发方式：手动 + 定时。
- 执行架构：纯异步 run。
- 规则体系：全局规则 + Topic 规则并行。
- 数据源：Crossref + arXiv + Zotero。
- 调度器：后端内置。
- 并发策略：同规则 single-flight，重叠触发记 `SKIPPED` 并告警。
- 旧接口策略：删除 `/literature/search`、`/literature/web-import`。

## Phase plan
1. 数据模型与迁移
   - Prisma 新增 Topic/Rule/Run/Alert/Suggestion 全链路模型。
   - 生成 migration 并完成 schema 校验。
2. Shared 契约重构
   - 删除旧 search/web-import 契约。
   - 新增 Topic/Rule/Run/Alert DTO 与 schema。
3. 后端分层落地
   - 新增 auto-pull/topic-settings routes、controllers、services、repositories。
   - 接入 Prisma/InMemory 双仓储实现。
4. 异步 run 与调度器
   - 触发创建 `PENDING` run，后台执行为 `RUNNING` 与终态。
   - 接入内置 scheduler + due 判定 + single-flight。
5. 质量门与告警
   - 引入完整度阈值、include/exclude 命中策略。
   - 生成 suggestion，不直接写 scope。
   - 统一告警码与 ack/retry 链路。
6. 前端自动导入页替换
   - 三子 Tab：Topic 设置 / 规则中心 / 运行与告警。
   - 支持 Topic CRUD、规则 CRUD、立即运行、run 详情、告警筛选与 ack。
7. 旧能力下线与回归
   - 移除 `/literature/search`、`/literature/web-import` route/controller/service。
   - 回归验证旧接口 404。
8. 验证与记录
   - 通过 shared/backend/desktop typecheck + backend test + desktop build。
   - 将实现与验证回写到 `03-implementation-notes.md`、`04-verification.md`。

## Acceptance criteria
- 新 API 全量可用且契约稳定。
- 自动导入 UI 完成规则化替换，旧即时检索/URL 抓取交互下线。
- run 状态可观测（含 `PENDING`）且可查看 source attempt 失败原因。
- single-flight、retry failed sources、alerts ack 行为可验证。
- 手动导入/综览/元数据链路无回归。

## Current status (2026-02-26)
- 已完成：Phase 1~8。
- 待完成：人工功能验收与灰度发布检查（非代码阻塞项）。
