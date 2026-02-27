# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-02-26

## Final UI decision matrix (alignment output)
| Decision area | Final decision | Rationale | Frozen |
|---|---|---|---|
| 视觉方向 | 高效工作台 | 优先信息密度与可操作性 | yes |
| 布局 | 标签页分步（3 标签：自动导入/手动导入/文献综览） | 降低认知切换成本并收敛入口 | yes |
| 导入入口策略 | 自动联网 / 手动上传 / Zotero 同级可用 | 避免主次依赖阻塞 | yes |
| 查询方案 | 高级条件构建器（AND/OR）+ 保存查询 | 可解释、可复用 | yes |
| 结果视图 | 列表 + 行内关键信息 + 快速操作 | 支持研究场景快速扫描 | yes |
| 反馈策略 | 内联状态 + 顶部提示统一 | 保证可恢复性 | yes |
| 文案策略 | 中文优先，必要英文术语保留 | 降低使用门槛 | yes |
| 后端边界 | 复用现有 API，阻塞再开子任务 | 控制 scope 与风险 | yes |

## Out-of-scope (alignment output)
- 视觉品牌重塑与主题体系重构。
- 新建复杂查询 DSL。
- 大规模后端 schema/API 重构。
- 跨用户共享文献库能力。

## Go / No-Go gate (alignment output)
### Go conditions
- 三类导入入口全部可用。
- 高级查询构建器可稳定使用（含保存查询）。
- 综览与分类可完成主要维护任务。
- UI gate 无错误。
- 无破坏性 API 变更。

### No-Go triggers
- 任一导入入口不可恢复。
- 查询结果错误导致核心流程不可用。
- 状态反馈缺失，用户无法判断恢复路径。

## Frozen decision table
| ID | Decision | Owner | Date | Change policy |
|---|---|---|---|---|
| FD-01 | 标签 IA 固定为 3 标签 | Product/UI | 2026-02-26 | 仅在对齐评审中可改 |
| FD-02 | 三入口同级可用 | Product | 2026-02-26 | 禁止单入口降级为主依赖 |
| FD-03 | 条件构建器首版替代 DSL | Product/Engineering | 2026-02-26 | 本轮不引入 DSL |
| FD-04 | 反馈体系统一为“顶部+内联” | Engineering | 2026-02-26 | 禁止新增无反馈关键动作 |
| FD-05 | 最小后端边界策略 | Engineering | 2026-02-26 | 阻塞才建子任务扩展 |

## Deviation record template
### [Deviation-ID]
- Trigger:
- Original frozen decision:
- Actual change:
- Why change was required:
- Impact scope:
- Verification after deviation:
- Approved by:
- Follow-up action:

### DEV-20260226-01
- Trigger:
  - 用户反馈希望合并“手动上传 + 文献库联动”，并明确不喜欢大量卡片化布局。
- Original frozen decision:
  - FD-01（原始）4 标签 IA：自动联网导入 / 手动上传 / 文献库联动 / 综览与分类。
- Actual change:
  - 调整为 3 标签：自动导入 / 手动导入 / 文献综览；其中“手动导入”包含文件上传与 Zotero 联动两个分区。
  - 文献区样式由多卡片改为“分区 + 分割线”扁平布局。
- Why change was required:
  - 与最新用户偏好对齐，降低视觉噪音并提升信息连续性。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
  - 本文档决策矩阵与冻结决策条目
- Verification after deviation:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
- Approved by:
  - 用户当轮明确要求（会话内确认）
- Follow-up action:
  - 人工验收时重点确认“手动导入”页两分区的信息层级与可用性。

## Execution log
### 2026-02-26 - Phase 3 UI 实施完成（前端）
- Scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- What changed:
  - 文献管理改为 3 标签页分步结构（自动导入 / 手动导入 / 文献综览）。
  - 手动导入页合并文件上传与 Zotero 联动，保留双状态显示。
  - 新增高级查询条件构建器（字段 + 操作符 + AND/OR），支持保存查询、应用查询、重置查询。
  - 新增查询排序策略（更新时间/年份/标题）。
  - 新增顶部反馈模型（含恢复动作）并统一到导入/查询/综览/元数据更新路径。
  - 三类导入入口接入 `UiOperationStatus`（idle/loading/ready/empty/error/saving）并输出内联状态。
  - 综览与分类页改为工作台形态：统计卡片 + 选题范围快速维护 + 查询结果行内快速操作 + 元数据编辑。
  - 样式层补齐 tab strip、query builder、反馈条和移动端响应式布局，并改为扁平分区样式。
- Notes:
  - 后端接口保持不变，仅复用现有 `/literature/*` 能力，符合最小后端边界策略。

### 2026-02-26 - 文献区信息层级精简（用户反馈修订）
- Trigger:
  - 用户反馈“页面标题无必要，Topic/Paper 更像筛选项”。
- What changed:
  - 移除文献模块顶部大标题，仅保留状态徽标与反馈。
  - `Topic ID / Paper ID` 文案改为“筛选（可选）”，并合并为统一“应用筛选”动作。
  - 保留导入默认参数（分类标签、范围变更原因），避免影响导入链路。
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅

### 2026-02-26 - 筛选语义强化与去卡片化（二次修订）
- Trigger:
  - 用户继续反馈 Topic/Paper 应仅视为筛选项，且不希望文献模块大量卡片化。
- What changed:
  - 文献模块顶部上下文徽标改为“Topic 筛选 / Paper 筛选”，空值显示“全部”。
  - 文献模块隐藏全局指标卡区，仅保留文献流程相关信息。
  - 综览统计由 4 个指标卡改为单行摘要条（总文献 / In Scope / Cited / Top Tags）。
  - 标签导航改为下划线式扁平导航，降低按钮卡片感。
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅
  - `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full` ✅

### 2026-02-26 - 顶栏 Tab 与综览内筛选（三次修订）
- Trigger:
  - 用户要求将 tab 按键移入顶栏，并移除文献页面通用筛选区，仅在“文献综览”中显示筛选。
- What changed:
  - 文献管理 3 个 tab（自动导入 / 手动导入 / 文献综览）迁移到应用顶栏中心区域。
  - 删除文献页主体顶部的筛选与 tab 区块，避免非综览场景出现筛选表单。
  - 在“文献综览”高级查询区加入 Topic/Paper 筛选输入与“应用筛选”按钮。
  - 将“默认分类标签 / 范围变更原因”迁移到自动导入与手动导入页内作为导入参数，不再占用全局顶部区域。
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅

### 2026-02-26 - 自动导入 Tab 需求对齐（成功/失败/重试闭环）
- Trigger:
  - 按“逐 tab 对齐需求”从自动导入开始，补齐可恢复反馈与批量导入可解释性。
- What changed:
  - 修复恢复动作语义偏差：候选导入失败时由 `retry-query` 改为 `retry-candidate-import`，避免误触发“重新检索”。
  - 自动导入页状态拆分为三段：检索状态 / 候选导入状态 / URL 导入状态（统一 `UiOperationStatus`）。
  - URL 批量导入新增逐条结果回显（成功/失败、provider、dedup、错误信息）。
  - URL 部分失败场景支持“仅重试失败 URL”，并在顶部反馈中提供 `retry-web-import-failed` 恢复动作。
  - 候选导入流程新增显式 loading/error 状态与错误文案，减少无反馈等待。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅

### 2026-02-26 - 自动拉取系统重构（规则驱动 + 异步 run）
- Trigger:
  - 用户确认“自动拉取必须是规则驱动、异步执行、可观测告警”，并要求立即替换旧自动拉取接口与 UI。
- What changed:
  - Prisma SSOT 新增自动拉取全链路模型：`TopicProfile`、`AutoPullRule`、`AutoPullRuleSource`、`AutoPullRuleSchedule`、`AutoPullRun`、`AutoPullRunSourceAttempt`、`AutoPullCursor`、`AutoPullAlert`、`AutoPullSuggestion`；并补全 `LiteratureRecord.autoPullSuggestions` 反向关系。
  - Shared 契约删除旧 `LiteratureSearchRequest/Response`、`LiteratureWebAutoImportRequest/Response`，新增 Topic/Rule/Run/Alert 相关 DTO 与 schema。
  - 后端新增 Topic/Auto Pull 路由、控制器、服务、仓储（Prisma + InMemory），并在 `app.ts` 接入。
  - 调度器改为内置 `AutoPullScheduler`，默认启用，可通过 `AUTO_PULL_SCHEDULER_ENABLED=false` 关闭。
  - Run 执行模型改为纯异步：`POST /auto-pull/rules/:ruleId/runs` 仅创建 `PENDING` run 并后台执行；执行期间状态流转为 `PENDING -> RUNNING -> SUCCESS|PARTIAL|FAILED|SKIPPED`。
  - 单飞策略升级为 in-flight 保护：同规则存在 `PENDING/RUNNING` run 时，新触发写 `SKIPPED` run，并生成 `RUN_SKIPPED_SINGLE_FLIGHT` 告警。
  - 质量门保持“抓取后判定 + suggestion 输出”策略：默认 `min_completeness_score=0.6`、`require_include_match=true`，scope 仅建议不直接写入 `TopicLiteratureScope`。
  - 新告警编码链路落地：`NO_SOURCE_CONFIG`、`SOURCE_UNREACHABLE`、`SOURCE_AUTH_ERROR`、`SOURCE_RATE_LIMIT`、`PARSE_FAILED`、`IMPORT_FAILED`、`RUN_SKIPPED_SINGLE_FLIGHT`。
  - 旧接口已移除：`POST /literature/search`、`POST /literature/web-import`；对应路由测试改为 404 回归验证。
  - 前端“自动导入”页完全替换为三子 Tab（`Topic 设置` / `规则中心` / `运行与告警`），支持 Topic 设置 CRUD、规则创建编辑启停、手动触发、Run 详情、告警筛选/ack、失败源重试。
  - 运行列表新增 `PENDING` 可视状态与耗时展示，满足“状态 + 触发类型 + 导入/失败 + 耗时”信息要求。
- Impact scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260226103000_add_auto_pull_system/migration.sql`
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `apps/backend/src/app.ts`
  - `apps/backend/src/routes/auto-pull-routes.ts`
  - `apps/backend/src/routes/topic-settings-routes.ts`
  - `apps/backend/src/routes/literature-routes.ts`
  - `apps/backend/src/controllers/auto-pull-controller.ts`
  - `apps/backend/src/controllers/topic-settings-controller.ts`
  - `apps/backend/src/controllers/literature-controller.ts`
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/auto-pull-scheduler.ts`
  - `apps/backend/src/services/literature-service.ts`
  - `apps/backend/src/repositories/auto-pull-repository.ts`
  - `apps/backend/src/repositories/in-memory-auto-pull-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-auto-pull-repository.ts`
  - `apps/backend/src/routes/auto-pull-routes.integration.test.ts`
  - `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts`
  - `apps/backend/src/services/auto-pull-service.unit.test.ts`
  - `apps/backend/src/services/auto-pull-scheduler.unit.test.ts`
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Notes:
  - 现有 `manual import / zotero import / overview / metadata` 主流程未破坏。

### 2026-02-27 - 自动导入遗留清理 + 底部告警可关闭
- Trigger:
  - 用户要求继续执行“人工验收脚本 + 清理遗留状态”，并将告警信息统一放到底部且允许关闭。
- What changed:
  - 清理 `App.tsx` 中旧自动导入遗留实现：
    - 删除旧即时检索/候选导入/URL 批量抓取的状态变量、类型定义、解析函数与恢复动作分支。
    - 删除对应占位 handler（`handleSearchLiterature`、`handleImportSelectedCandidates`、`handleAutoImportFromWeb`）和冗余 `void` 占位引用。
  - 统一反馈告警展示位置：
    - 原顶部 `literature-top-feedback` 改为全局底部 `literature-bottom-alert`。
    - 告警支持显式“关闭”按钮；有恢复动作时保留“执行恢复动作”入口。
  - 规则告警列表交互文案对齐：
    - 告警列表中未确认按钮由 `Ack` 改为“关闭”（底层仍走 ack 接口）。
    - 关闭后反馈文案更新为“告警已关闭”。
  - 样式层新增底部浮层在桌面/小屏的响应式布局，避免遮挡核心表单交互。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅

### 2026-02-27 - 告警轻量化与文案去重（对齐修订）
- Trigger:
  - 用户反馈告警“过大且显眼，并侵占左侧区域”，同时要求减少重复信息（例如“自动拉取 / Topic 设置”重复出现）。
- What changed:
  - 告警浮层从底部居中宽横幅改为“右下角轻量 toast”（固定窄宽，不跨越左侧导航区域）。
  - 告警行为改为分级消失策略：
    - `success/info`：3 秒自动关闭
    - `warning/error`：常驻，需手动关闭
  - 自动导入页去重文案：
    - 移除“自动拉取（规则驱动 + 异步运行）”重复大标题
    - 移除子 Tab 内容区内重复的“Topic 设置 / 规则中心 / 运行与告警”段落标题
    - 仅保留子 Tab 导航本身表达当前语义
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
