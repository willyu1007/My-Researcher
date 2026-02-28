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

### 2026-02-27 - 顶栏复合 Tab（一级 + 右侧二级）首版
- Trigger:
  - 用户要求将二级 Tab（Topic 设置 / 规则中心 / 运行与告警）移动到一级 Tab 右侧，并统一二级 Tab 交互逻辑。
- What changed:
  - 顶栏文献管理导航改为复合结构：
    - `自动导入` 与其二级项（Topic 设置 / 规则中心 / 运行与告警）同框展示。
    - `手动导入`、`文献综览` 保持一级入口并与复合入口并列。
  - 二级 Tab 交互统一为同一套入口逻辑：
    - 点击二级项会自动切回 `auto-import` 主 Tab，并切换对应子页。
    - 内容区移除旧 `auto-pull-subtab-strip`，避免顶部与内容区双重二级导航重复。
  - 顶栏样式改为自适应单行：
    - 中央 Tab 区支持横向滚动（窄宽时不换行、不挤压主布局）。
    - 新增复合 Tab 外框与主/子项状态样式。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅

### 2026-02-27 - 顶栏 Tab 二次精简（激活收起 + 无底色 + 顶部横线）
- Trigger:
  - 用户要求二级项仅在对应一级激活时显示，并移除 Tab 胶囊外框与底色，改为顶部横线风格。
- What changed:
  - 二级项挂载规则调整：
    - 仅当“当前激活一级 Tab 且该一级存在二级配置”时渲染二级项；切换到无二级的一级项时自动收起。
  - Tab 视觉结构精简：
    - 移除一级/二级 Tab 的底色、外框、胶囊圆角背景。
    - 导航容器改为顶部基线（top border）样式。
    - 激活态改为“顶部高亮线 + 字色/字重”而非背景填充。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅

### 2026-02-27 - 顶栏 Tab 三次微调（移除顶部线条）
- Trigger:
  - 用户要求取消顶部的两条横线。
- What changed:
  - 移除文献 Tab 容器顶部基线。
  - 移除一级/二级 Tab 激活态顶部高亮线，保留文字颜色与字重作为状态反馈。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 顶栏高度回调与左侧对齐修复
- Trigger:
  - 用户反馈当前顶栏高度偏离此前版本，左侧区域出现明显错位。
- What changed:
  - 恢复文献导航区高度节奏到此前版本：
    - 去除额外顶端内边距，恢复一级/二级按钮的最小高度与垂直内边距。
    - 恢复一级/二级项之间的紧凑间距。
  - macOS 顶栏对齐修复：
    - 将 `.topbar-literature-tabs` 纵向偏移从 `translateY(3px)` 调整为 `translateY(1.5px)`，与左侧按钮/右侧控件保持一致。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 二级 Tab 垂直对齐修复
- Trigger:
  - 用户反馈次级 Tab 文案视觉上偏上。
- What changed:
  - 将二级按钮的 `line-height / min-height / padding` 调整为与一级按钮更接近的垂直节奏，消除上浮感。
  - 小屏样式同步调整二级按钮最小高度与垂直内边距。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 子 Tab 间距与层级区分优化
- Trigger:
  - 用户要求子 Tab 更靠近主 Tab、子项更紧凑，并与一级 Tab 做更明确区分。
- What changed:
  - 间距收紧：
    - 缩小主/子间距与子项之间 gap。
    - 缩小子 Tab 水平内边距，保持垂直高度稳定。
  - 层级区分：
    - 在子 Tab 左侧增加分隔符 `|`。
    - 子 Tab 默认色改为更浅层级，hover 与 active 色强度低于一级 Tab。
    - 子 Tab 激活字重从 600 降到 500，避免与一级抢视觉焦点。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 子 Tab 紧凑度与垂直位置二次微调
- Trigger:
  - 用户要求进一步紧凑子 Tab，并将子 Tab 整体再下移。
- What changed:
  - 紧凑度：
    - 主/子与子项 gap 进一步压缩为 0。
    - 子 Tab 左缩进、分隔符右间距、子按钮内边距进一步收紧。
    - 子按钮最小高度下调（桌面/小屏分别下调）。
  - 垂直位置：
    - 子 Tab 容器增加 `translateY(1px)`，使其视觉位置略低于主 Tab。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 文本层级微调（一级增大 / 二级变浅）
- Trigger:
  - 用户要求一级 Tab 字体稍大，二级 Tab 颜色再浅一些。
- What changed:
  - 一级 Tab 字号上调一档（含小屏断点字号同步上调）。
  - 二级 Tab 默认/hover/active 颜色统一下调强度，整体层级更轻。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 方案1：浅色主题下一级 Tab 对比增强（组件级）
- Trigger:
  - 用户确认采用方案1：不改全局 token，仅增强浅色主题一级 Tab 的选中/未选中对比。
- What changed:
  - 仅在 `morethan.light` 下覆盖一级 Tab 颜色：
    - 未选中：使用 `text_secondary` 与 `text_muted` 混合，降低强度。
    - hover：回到 `text_secondary`。
    - 选中：使用 `primary_active`，与未选中拉开差异。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 一级/二级 Tab 选中态字重上调
- Trigger:
  - 用户要求同时增加一级与二级 Tab 的选中态字重。
- What changed:
  - 一级 Tab 选中态字重由 `600` 上调到 `700`。
  - 二级 Tab 选中态字重由 `500` 上调到 `600`。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 自动导入二级 Tab 文案调整
- Trigger:
  - 用户要求替换二级 Tab 文案。
- What changed:
  - `Topic 设置` -> `设置主题`
  - `运行与告警` -> `执行详情`
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - 自动导入顶部状态区移除
- Trigger:
  - 用户要求移除自动导入页顶部“状态/Topic/规则/运行/告警”整行信息及对应横线。
- What changed:
  - 删除自动导入页顶部状态工具条（包含左侧“状态”与右侧四个状态 badge）。
  - 针对文献工作区覆盖 `module-dashboard` 的顶部边线与内边距，移除该区域横线视觉。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Verification:
  - `pnpm desktop:build` ✅

### 2026-02-27 - Topic/Rule many-to-many + 主题启停跳过检索
- Trigger:
  - 用户确认三项约束：
    - 主题关闭时不暂停规则，而是在检索执行中跳过该主题。
    - Topic 侧需要可选择已有规则，并支持“新建规则”快捷跳转。
    - 规则与主题按 many-to-many 规划。
- What changed:
  - 数据模型与迁移：
    - `TopicProfile` 新增 `isActive`。
    - `AutoPullRule` 移除单一 `topicId`，改为通过 `AutoPullRuleTopic` 关联表绑定主题。
    - 新增迁移 `20260227163000_autopull_rule_topic_many_to_many`，包含旧 `topicId` 到关联表的数据回填。
  - Shared 契约：
    - `TopicProfileDTO` 新增 `is_active`、`rule_ids`。
    - `Create/UpdateTopicProfileRequest` 新增 `is_active`、`rule_ids`。
    - `AutoPullRuleDTO` 新增 `topic_ids`（保留 `topic_id` 兼容字段）。
    - `Create/UpdateAutoPullRuleRequest` 新增 `topic_ids`（并兼容 `topic_id`）。
  - 后端服务/仓储：
    - 仓储新增 rule-topic 读写接口（Prisma + InMemory 双实现）。
    - `AutoPullService` 改为按 many-to-many 解析规则绑定。
    - TOPIC 规则执行改为“按 active topic 上下文执行”，inactive topic 进入 `skipped_topic_ids`。
    - 当 TOPIC 规则无 active topic 时，run 直接 `SKIPPED`，并产出 `NO_ACTIVE_TOPIC` 告警。
    - Topic 设置接口支持直接维护 `rule_ids` 绑定。
  - 前端 UI/交互（自动导入）：
    - 子 Tab 顺序调整为：`规则中心` -> `设置主题` -> `执行详情`。
    - `设置主题`改为“主题列表为主”：展示主题详情、启用/关闭、绑定规则概览。
    - 新增“新增主题”弹框（创建/编辑复用），弹框内可选择已有 TOPIC 规则绑定。
    - 新增“新建规则”快捷跳转：从主题列表一键跳到规则中心并预填绑定主题。
    - 规则表单改为 `topic_ids` 输入（逗号/换行），适配 many-to-many。
    - 文案将 `Venue` 明确为“期刊/会议来源过滤”或“期刊/会议关键词”。
- Impact scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260227163000_autopull_rule_topic_many_to_many/migration.sql`
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `apps/backend/src/repositories/auto-pull-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-auto-pull-repository.ts`
  - `apps/backend/src/repositories/in-memory-auto-pull-repository.ts`
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/auto-pull-service.unit.test.ts`
  - `apps/backend/src/routes/auto-pull-routes.integration.test.ts`
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- Notes:
  - 保持旧 `topic_id` 入参兼容，前端已切换至 `topic_ids` 主路径。

### 2026-02-27 - 新增主题弹窗交互升级（自动标识 + 下拉多选 + 双滑块）
- Trigger:
  - 用户要求优化“新增主题”样式与交互：
    - Topic 标识自动生成
    - 文案避免中英混排
    - 包含词/排除词使用加号添加
    - 会议/期刊改为下拉多选
    - 年份改为双滑块时间轴
    - 明确“默认窗口 / 主题勾选 / 规则绑定”语义
- What changed:
  - Topic 标识生成策略改为稳定自动生成：
    - 基于主题名称生成 `TOPIC-<SLUG>`。
    - 若冲突自动追加递增后缀（`-2/-3...`），避免随机后缀导致预览与提交不一致。
  - 主题弹窗 UI 重构：
    - “包含词 / 排除词”改为 token 加号添加模式，支持回删。
    - “会议与期刊”改为下拉多选面板（checkbox 列表 + 清空选择）。
    - “年份范围”改为双滑块时间轴样式，并显示当前起止年份。
  - 语义可解释性增强：
    - “默认检索窗口天数”新增说明文案，明确其在未单独设置时间范围时生效。
    - “参与自动检索”勾选项新增说明文案，明确取消勾选时规则继续运行但跳过该主题。
    - 规则绑定区新增“前往规则中心”快捷入口，并明确“在此勾选后加入规则检索目标”。
  - 文案清理：
    - 将主题设置区相关提示统一为中文表达（例如“暂无主题设置”“包含词/排除词”等）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 新增主题弹窗样式对齐（二次修订：中文哈希 ID + 回车添加 + 分区布局）
- Trigger:
  - 用户反馈“主题名称似乎不支持中文”，并提供目标弹窗参考图，要求先对齐方案后实施。
- What changed:
  - 主题标识生成改为“中文安全哈希”：
    - `generateTopicIdByName` 不再依赖英文 slug，而是基于主题名称 `NFKC` 归一化后生成稳定 8 位十六进制哈希。
    - 生成规则为 `TOPIC-<HASH>`，冲突时自动追加递增后缀（`-2/-3...`）。
  - 包含词/排除词交互改为“回车自动添加”：
    - 移除加号按钮。
    - 输入框按 `Enter`（且非输入法组合态）直接加入词条。
  - 弹窗布局按参考图重排：
    - 顶部标题栏（创建/编辑主题 + 关闭按钮）。
    - 两个分区：`主题基础信息` 与 `运行方式与规则`。
    - 基础信息采用双列布局：主题名称/主题标识、包含词/排除词、会议与期刊/默认检索窗口。
    - 年份范围改为“起始年输入 + 双滑块 + 结束年输入”，并增加快捷按钮（近5年/近10年/全部）。
    - 运行区改为左右卡片：左侧启用策略说明，右侧规则绑定面板（含“去规则中心创建规则”）。
    - 底部固定操作区：取消 + 创建/更新主题。
  - 响应式补齐：
    - 小屏下主题表单自动改为单列，年份区自动纵向堆叠，避免控件拥挤。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 新增主题弹窗细节微调（三次修订：去默认窗口 + 年份轨道高亮）
- Trigger:
  - 用户继续提出弹窗细节调整：
    - 移除“自动生成主题标识”说明文案
    - 主题标识输入框改灰底
    - 取消“默认检索窗口”，将年份范围移动到该位置
    - 年份双滑块两个点之间高亮着色
    - 近5/近10/全部快捷项移动到“年份范围”标题旁
- What changed:
  - UI 文案与样式：
    - 移除主题名称下方辅助说明文案。
    - `主题标识` 只读输入框新增灰底样式。
  - 表单结构：
    - 删除“默认检索窗口”可视输入控件。
    - 将“年份范围”并入 `topic-modal-grid` 右列（替代默认窗口原位置）。
    - 年份快捷项移动到标题右侧，和标题同行展示。
  - 年份轨道高亮：
    - 引入 `topicYearRangeTrackStyle`（CSS 变量）计算当前起止年份百分比。
    - 滑块底轨改为分段渐变，起止点之间使用主色高亮。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 新增主题弹窗细节微调（四次修订：年份范围去外框）
- Trigger:
  - 用户要求“年份范围不需要外框”。
- What changed:
  - 将年份起止输入框样式改为无边框、透明背景、居中文本，保留数值编辑能力。
  - 聚焦时仅提升文字对比，不再显示输入框边框高亮。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 新增主题弹窗文案微调（五次修订：标题替换与去重复）
- Trigger:
  - 用户要求将“创建主题”替换为“主题基础信息”（保持蓝色），并去除内容区重复的“主题基础信息”标题。
- What changed:
  - 弹窗头部标题由创建/编辑态文案统一为“主题基础信息”。
  - 弹窗 `aria-label` 同步改为“主题基础信息”。
  - 删除第一分区内重复的小标题“主题基础信息”。
  - 弹窗头部标题颜色调整为蓝色主色。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 新增主题弹窗间距修正（六次修订：空 token 不占位）
- Trigger:
  - 用户反馈“主题名称 / 包含词 / 会议与期刊”三行之间垂直间距不一致。
- What changed:
  - `topic-token-list` 在空状态下不再占位（`:empty` 时不渲染），消除“包含词”行额外留白。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 会议与期刊下拉布局微调（七次修订：每行三项）
- Trigger:
  - 用户要求“会议与期刊”的下拉选择改为一行三个选项。
- What changed:
  - `topic-venue-picker-list` 改为三列网格（桌面每行 3 项）。
  - 小屏降级为两列，避免选项挤压。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 运行方式右侧标题补齐（八次修订）
- Trigger:
  - 用户要求在右侧卡片添加标题“规则绑定”。
- What changed:
  - 右侧规则卡片头部由弱化 caption 文本改为明确标题 `规则绑定`。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 运行方式与规则绑定并排修正（九次修订）
- Trigger:
  - 用户要求“规则绑定”和“运行方式”同行展示。
- What changed:
  - 在中等宽度断点下保留 `topic-modal-grid-run` 双列布局，避免该分区被全局单列规则折叠。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 年份范围轴线位置微调（十次修订）
- Trigger:
  - 用户要求“年份范围选择轴上移一点，保持视觉统一”。
- What changed:
  - `topic-year-range-main` 增加轻微负上边距，使年份数值与滑轨整体上移。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 规则绑定标题外提（十一次修订）
- Trigger:
  - 用户要求“规则绑定”移到框外，并与“运行方式”使用同级标题样式。
- What changed:
  - 运行区重构为左右两列各自标题：
    - 左列标题：运行方式
    - 右列标题：规则绑定
  - 右侧卡片内移除原嵌入标题，仅保留“创建规则”按钮与规则列表。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 规则绑定空态样式对齐（十二次修订）
- Trigger:
  - 用户提供参考图，要求“规则绑定”空态 UI 对齐。
- What changed:
  - 规则绑定卡片改为双态：
    - 无规则：居中空态（图标 + 提示文案 + “去规则中心创建规则”按钮）
    - 有规则：保留“创建规则”按钮与绑定列表
  - 新增空态图标容器与强调按钮样式，使视觉层级接近参考图。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 运行区列宽比例调整（十三次修订：1:2）
- Trigger:
  - 用户要求“运行方式”和“规则绑定”区域宽度比例调整为 `1:2`。
- What changed:
  - `topic-modal-grid-run` 列宽改为 `1fr : 2fr`。
  - 中等宽度断点保持同样比例，避免回退为等宽。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 运行区卡片等高修正（十四次修订）
- Trigger:
  - 用户要求“运行方式”和“规则绑定”外框等高。
- What changed:
  - 运行区网格改为拉伸对齐。
  - 左右列改为 `auto + 1fr` 行结构，卡片层设置 `height: 100%`。
  - 两侧卡片统一最小高度为 `144px`。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - 契约漂移修复 + 手动导入可编辑工作台（引用就绪）
- Trigger:
  - 用户要求执行“契约漂移修复 + 手动导入工作台”实施计划，优先修复手动导入 UI 与契约一致性。
- What changed:
  - API 契约与上下文：
    - 完整重写 `docs/context/api/openapi.yaml`，覆盖后端当前 31 个 endpoint（含 `/health`），按 `health/research-lifecycle/literature/topic-settings/auto-pull` 分 tag。
    - 为关键接口补 request/response example：`POST /paper-projects`、`POST /literature/import`、`POST /literature/zotero-import`、`POST /topics/settings`、`POST /auto-pull/rules`、`GET /auto-pull/runs/{runId}`。
    - 生成 `docs/context/api/api-index.json`、`docs/context/api/API-INDEX.md` 并通过 `--touch` 同步 `docs/context/registry.json` checksum。
  - 手动导入工作台（桌面端）：
    - 新增 `apps/desktop/src/renderer/literature/manual-import-types.ts`：`ManualImportMode`、`ManualDraftRow`、`ManualRowValidation`、`ManualImportSession` 等内部类型。
    - 新增 `apps/desktop/src/renderer/literature/manual-import-utils.ts`：JSON/CSV/BibTeX 解析、引用就绪校验、字段规范化、批量标签/rights 纯函数。
    - `App.tsx` 重构手动导入链路为“上传 -> 可编辑表格审阅 -> 导入已选可用行”：
      - 行级编辑/删除、仅错误行过滤、全选/反选可导入行。
      - 批量追加标签、批量设置 `rights_class`。
      - 导入策略单选：默认 `import_and_scope`，可切换 `import_only`。
      - 提交时仅发送“勾选且通过校验”的行；成功后移除已成功提交行，保留其余行继续编辑。
      - `import_and_scope` 且 Topic 为空时阻断并提示。
    - Zotero 保持一键同步，不进入审阅表格；前端 `limit` 超界自动收敛到 `1-50` 并提示。
  - 样式更新：
    - `apps/desktop/src/renderer/app-layout.css` 新增手动审阅表格样式（固定表头、横向滚动、错误行高亮、移动端可读）。
- Impact scope:
  - `docs/context/api/openapi.yaml`
  - `docs/context/api/api-index.json`
  - `docs/context/api/API-INDEX.md`
  - `docs/context/registry.json`
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
  - `apps/desktop/src/renderer/literature/manual-import-types.ts`
  - `apps/desktop/src/renderer/literature/manual-import-utils.ts`

### 2026-02-27 - 手动导入策略开关下线（固定仅入库）
- Trigger:
  - 用户明确当前链路下文献管理应聚焦“提供足够文献”，不需要手动导入策略选择。
- What changed:
  - `App.tsx` 移除手动文件导入策略单选（`import_and_scope` / `import_only`）。
  - 文件导入提交逻辑改为固定仅入库：仅调用 `POST /literature/import`，不再在手动文件导入中写 topic scope。
  - 导入完成提示改为“入库完成（新增/去重/失败）”。
  - “范围变更原因”字段文案调整为 `Zotero 范围变更原因（可选）`，避免与手动文件导入语义混淆。
  - 清理对应无用样式（`manual-import-mode-*`）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-27 - Zotero 入口改为固定仅入库
- Trigger:
  - 用户确认“文献管理核心是提供足够文献”，要求 Zotero 与手动文件导入保持同一语义（不做导入时 scope 写入）。
- What changed:
  - `handleImportFromZotero` 请求体移除 `topic_id/scope_status/scope_reason`。
  - Zotero 成功提示由“导入 + 加入范围”改为仅“导入 N 条”。
  - 手动导入页移除 Zotero scope reason 输入项，底部说明更新为“固定仅入库”。
  - 保留 `scopeReasonInput` 内部默认值，仅供综览页手动 scope 调整时附带 reason。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-02-27 - 移除“导入默认参数”与默认标签自动注入
- Trigger:
  - 用户确认“标签应在后续阶段填写”，要求删除“导入默认参数”模块。
- What changed:
  - 删除手动导入页“导入默认参数/默认分类标签”UI。
  - 删除默认标签状态与相关逻辑：
    - 上传后不再自动给草稿行追加默认标签。
    - 提交手动导入时不再自动并入默认标签。
    - Zotero 导入请求不再携带 `tags`。
  - 审阅表格保留“标签”列，仅支持按行手工填写（如需）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-02-28 - 手动导入布局对齐截图 + 注入测试数据
- Trigger:
  - 用户要求“手动导入”参考目标截图布局，并提供一组可直接注入的测试数据用于联调与演示。
- What changed:
  - `App.tsx`
    - 手动导入页新增分段切换：`文件上传与审阅` / `文献库联动 (Zotero)`。
    - 文件入口改为卡片化上传区（支持点击与拖拽），视觉结构对齐目标图：顶部分段 + 上传卡片 + 虚线拖拽区。
    - 新增“注入测试数据”按钮：一键写入 6 行草稿（覆盖可导入、缺作者、年份非法、URL 非法等场景）。
    - 上传解析逻辑抽出为 `importManualFileIntoSession`，文件选择与拖拽复用同一条解析链路。
  - `app-layout.css`
    - 新增手动导入分段控件样式、上传卡片与拖拽区样式、移动端适配（`max-width: 1100px`）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-28 - 侧栏设置入口 + 开发模式开关 + 上传区视觉收敛
- Trigger:
  - 用户要求设置入口常驻左侧导航左下角，支持“标准/开发模式”切换；并在开发模式下控制“注入测试数据”显示，同时进一步收敛上传区视觉权重。
- What changed:
  - `App.tsx`
    - 新增左侧导航底部常驻“设置”入口，带弹出面板。
    - 设置面板新增模式切换：`标准模式` / `开发模式`。
    - 开发模式下显示开关：`显示“注入测试数据”`；仅在该条件满足时，手动导入页显示注入按钮。
    - 新增本地持久化键：`pea.app.mode`、`pea.dev.manual-seed-visible`。
    - 手动导入分段文案更新为：`上传本地文件`、`从Zotero获取`。
  - `app-layout.css`
    - 新增侧栏设置入口/弹层样式，风格对齐轻量菜单。
    - 上传卡片与拖拽区样式收敛：降低字重与对比、弱化高亮、替换为细线图标、弱化按钮阴影。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-28 - 设置入口去底色 + 去分割线 + 继续降字重
- Trigger:
  - 用户要求：左侧设置按键不使用底色、上方不加分割线，并继续降低整体字重。
- What changed:
  - `app-layout.css`
    - `sidebar-settings-trigger` 背景改为透明，hover/active 仅轻微高亮。
    - `sidebar-footer-settings` 去除顶部边线。
    - 设置面板按钮、手动导入分段按钮、上传区标题/按钮字重继续下调为 `400`。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-28 - 设置面板改为开关模式 + 测试数据双操作项
- Trigger:
  - 用户要求：模式选择改为同一行开关样式；移除“显示注入测试数据”开关，改为“注入测试数据 / 取消注入数据”两个设置项，且仅开发模式可点击（标准模式灰态禁用）。
- What changed:
  - `App.tsx`
    - 设置面板改为“模式开关（标准/开发）+ 两个测试操作按钮”。
    - 新增 `handleClearInjectedManualImportData`，用于取消注入并清空当前手动导入草稿。
    - 移除旧逻辑：`devManualSeedVisible` 状态、对应 localStorage、以及上传区内联“注入测试数据”按钮。
  - `app-layout.css`
    - 新增模式开关样式（track/thumb）与动作按钮样式。
    - 非开发模式下动作按钮呈灰态禁用（`disabled`）。
    - 删除不再使用的旧样式类（segment/toggle/manual-upload-actions）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-28 - 设置弹窗改为列表分割线风格（无内嵌卡片）
- Trigger:
  - 用户要求设置按钮字体更小，设置弹窗参考菜单样式，使用分割线并去掉内嵌卡片结构。
- What changed:
  - `App.tsx`
    - 设置弹窗改为“行列表结构”：`开发模式` 行 + 分割线 + `注入测试数据` + `取消注入数据`。
    - 设置按钮保留纯文本“设置”。
  - `app-layout.css`
    - `sidebar-settings-trigger` 字号调整为 `13px`。
    - 设置弹窗改为紧凑列表样式（`padding: 6px 0`, 行 hover, 分割线）。
    - 删除旧的“卡片式/按钮组”样式定义。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-02-28 - 设置测试项增加右侧轻箭头
- Trigger:
  - 用户确认设置项可继续对齐参考图，要求测试项带右侧轻箭头。
- What changed:
  - `App.tsx`：`注入测试数据` / `取消注入数据` 行增加右侧箭头字符。
  - `app-layout.css`：新增 `.sidebar-settings-item-arrow`，并补充 disabled 时箭头灰态。
