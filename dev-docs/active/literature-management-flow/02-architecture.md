# 02 Architecture

## Scope baseline (2026-02-26)
- 自动拉取系统以“规则”作为执行单元，不再提供即时检索与 URL 批量抓取入口。
- 执行模型为纯异步 run：触发后先落库 `PENDING`，后台推进为 `RUNNING` 与终态。
- 规则体系包含两级并行：
  - 全局规则（`GLOBAL`）
  - Topic 规则（`TOPIC`）

## Frontend boundaries
- `文献管理 > 自动导入` 主 Tab 保留入口不变。
- 自动导入内部拆分 3 个子 Tab：
  - `Topic 设置`：Topic 配置 CRUD（关键词、venue、默认时间窗口）
  - `规则中心`：规则 CRUD、启停、立即运行
  - `运行与告警`：Run 列表/详情、失败源重试、告警筛选与 ack
- `手动导入` 与 `文献综览` 保持独立流程，不依赖自动拉取链路。

## Backend layered design
- Route:
  - `topic-settings-routes.ts`
  - `auto-pull-routes.ts`
- Controller:
  - `TopicSettingsController`
  - `AutoPullController`
- Service:
  - `AutoPullService`（规则解析、异步 run 编排、质量门、告警）
  - `AutoPullScheduler`（进程内定时扫描 due 规则）
- Repository:
  - `AutoPullRepository`（业务接口）
  - `PrismaAutoPullRepository` / `InMemoryAutoPullRepository`（双实现）

## Persistence model
- 规则配置：
  - `TopicProfile`
  - `AutoPullRule`
  - `AutoPullRuleSource`
  - `AutoPullRuleSchedule`
- 运行态：
  - `AutoPullRun`
  - `AutoPullRunSourceAttempt`
  - `AutoPullCursor`
- 可观测与建议：
  - `AutoPullAlert`
  - `AutoPullSuggestion`

## Run state machine
1. 触发（manual/schedule） -> 创建 `PENDING` run
2. 后台执行 -> 更新 `RUNNING`
3. 完成 -> `SUCCESS | PARTIAL | FAILED`
4. 重叠触发（同 rule in-flight） -> 创建 `SKIPPED` + `RUN_SKIPPED_SINGLE_FLIGHT` 告警

## Quality gate and import policy
- 默认质量门：
  - `min_completeness_score >= 0.6`
  - `require_include_match = true`
  - 命中 exclude 关键词直接建议 `excluded`
- 结果策略：
  - 生成 `AutoPullSuggestion`
  - 不直接写入 `TopicLiteratureScope`

## API contract
- 新增：
  - `POST /topics/settings`
  - `GET /topics/settings`
  - `PATCH /topics/settings/:topicId`
  - `POST /auto-pull/rules`
  - `GET /auto-pull/rules`
  - `PATCH /auto-pull/rules/:ruleId`
  - `DELETE /auto-pull/rules/:ruleId`
  - `POST /auto-pull/rules/:ruleId/runs`
  - `POST /auto-pull/runs/:runId/retry-failed-sources`
  - `GET /auto-pull/runs`
  - `GET /auto-pull/runs/:runId`
  - `GET /auto-pull/alerts`
  - `POST /auto-pull/alerts/:alertId/ack`
- 删除：
  - `POST /literature/search`
  - `POST /literature/web-import`

## Operational constraints
- 单规则禁止并发 run（single-flight）。
- 无可用 source 视为配置错误：run 失败并产生日志化告警。
- 调度器默认启用，可通过 `AUTO_PULL_SCHEDULER_ENABLED=false` 关闭（测试/隔离环境）。
