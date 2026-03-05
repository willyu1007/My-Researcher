# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-03-05

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

### 2026-03-02 - 自动导入质量链路切换为 0-100 LLM 评分
- Trigger:
  - 用户确认自动导入质量流程必须固定为“完整性硬校验 -> 预去重 -> LLM 评分(0-100) -> 门槛过滤 -> 排序入库”，并要求去除旧 `0-1` 完整度门槛语义。
- What changed:
  - 共享契约：
    - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
    - `quality_spec` 删除 `min_completeness_score/require_include_match`，新增 `min_quality_score(0-100)`，默认 `70`。
  - 后端仓储与映射：
    - `apps/backend/src/repositories/auto-pull-repository.ts`
    - `apps/backend/src/repositories/prisma/prisma-auto-pull-repository.ts`
    - 统一 `qualitySpec.minQualityScore`。
  - 执行流程重构：
    - `apps/backend/src/services/auto-pull-service.ts`
    - 新增完整性 5 项硬校验（title/authors/year/doi-or-arxiv/http(s) source_url）。
    - 新增评分前去重：run 内去重 + DB 去重（命中即跳过，不更新既有文献）。
    - 新增 LLM 评分调用（`AUTO_PULL_LLM_SCORER_URL` 等配置）；评分不可用时 source/run 标记 `QUALITY_SCORE_UNAVAILABLE` 并告警。
    - 门槛过滤改为 `quality_score >= min_quality_score`。
    - 排序规则：
      - `llm_score`：直接按 `quality_score`。
      - `hybrid_score`：`0.70*quality + 0.15*freshness + 0.10*publication_status + 0.05*citation_score`（四舍五入）。
    - `source_attempt.meta` 新增标准统计键：
      - `incomplete_rejected_count`
      - `duplicate_skipped_count`
      - `scored_count`
      - `below_threshold_count`
      - `eligible_count`
      - `imported_new_count`
      - `imported_existing_count`
      - `llm_score_avg`
      - `ranking_mode`
      - `threshold`
    - `suggestions[].score` 语义改为“本次排序分（llm/hybrid）”。
    - include/exclude 调整为仅影响检索 query，不再参与质量门槛过滤。
  - 文献服务：
    - `apps/backend/src/services/literature-service.ts`
    - 新增 `findImportDedupMatch`，供 auto-pull 在评分前执行 DB 去重。
  - 前端规则与说明：
    - `apps/desktop/src/renderer/App.tsx`
    - 质量门槛改为 `0-100`，预设更新为 `60/70/80/90`，默认 `70`。
    - tooltip 文案更新为新链路与排序解释（LLM/综合）。
    - 执行详情展示新增计数项（不完整/去重跳过/低于门槛/可导入/新增/命中既有/平均质量分）。
  - API 文档：
    - `docs/context/api/openapi.yaml`
    - `quality_spec` 与 `GET /auto-pull/runs/{runId}` 示例同步为新语义与计数字段。
    - 重新生成 `api-index` 与 context registry 校验产物。
- Impact scope:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/literature-service.ts`
  - `apps/backend/src/repositories/auto-pull-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-auto-pull-repository.ts`
  - `apps/backend/src/routes/auto-pull-routes.integration.test.ts`
  - `apps/backend/src/services/auto-pull-service.unit.test.ts`
  - `apps/desktop/src/renderer/App.tsx`
  - `docs/context/api/openapi.yaml`
  - `docs/context/api/api-index.json`
  - `docs/context/api/API-INDEX.md`
  - `docs/context/registry.json`

### 2026-03-02 - 每次拉取上限改为“全局去重后 TopK”，首次拉取 5x
- Trigger:
  - 用户要求“每日/每次拉取上限”在首次拉取时放宽到 5 倍，后续拉取按配置执行；并明确上限逻辑应在全局去重后按排序规则取 TopK。
- What changed:
  - `apps/backend/src/services/auto-pull-service.ts`
    - 运行内策略从“source 内直接导入”调整为“两阶段”：
      - 阶段1：各 source/topic 执行完整性校验、去重、评分、门槛过滤，产出候选池（不直接入库）。
      - 阶段2：汇总全局候选池，按排序分全局排序后取 TopK，再统一入库。
    - 首次拉取判定：当启用 source 在本次 run 均处于 `bootstrap_full_range`（无 cursor）时，`effective_limit = configured_limit * 5`；否则 `effective_limit = configured_limit`。
    - 新增 helper：`resolveEffectivePullLimit`。
    - `source_attempt.meta` 新增/补齐：
      - `fetch_limit`、`effective_limit`、`configured_limit`
      - `initial_pull`、`limit_multiplier`
      - `selected_topk_count`、`topk_skipped_count`
    - `run.summary` 同步写入 `effective_limit`、`initial_pull`、`selected_topk_count` 等运行汇总信息。
  - `apps/desktop/src/renderer/App.tsx`
    - 新增“每次拉取上限”提示文案：首次 5x、后续按配置、全局去重、按排序规则取 TopK。
    - 在“规则绑定”与“全局规则编辑”两个“每次拉取上限”字段挂载问号提示。
- Impact scope:
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/auto-pull-service.unit.test.ts`
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 文献综览 UI 改为“查询区 + 单大列表（统计入表头）”
- Trigger:
  - 用户要求先收敛整体 UI：主区域仅保留一张大列表，按文献状态维度展示，并保留查询选项区；统计信息不单独占区块，放入表头。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 在 `文献综览` 中移除“左侧选题范围 + 右侧结果列表”双面板。
    - 改为单一大表格：表头第一行展示 `总文献 / In Scope / Cited / Top Tags`，第二行为列名。
    - 保留查询区（Topic/Paper 筛选 + 高级查询 + 预设）与行内操作（保留/排除/保存元数据）。
    - 保留状态反馈（查询状态、加载/错误提示），并补充 `topicScopeLoading` 的轻量提示文案。
  - `apps/desktop/src/renderer/app-layout.css`
    - 新增单表格样式：`literature-overview-table-*`（容器滚动、表头、摘要行、hover、空态）。
    - 新增 `literature-overview-actions`，用于操作列按钮布局。
    - 删除旧双面板布局依赖（`literature-panels` / `literature-panel` / `literature-overview-list` / `literature-overview-row` / `literature-metadata-editor`）在综览中的使用语义。
    - 移动端保留横向滚动，最小表宽收敛为 `860px`。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 文献综览查询区二次轻量化（1-2 行可用）
- Trigger:
  - 用户反馈当前查询/筛选仍偏复杂，要求“1-2 行即可满足”，并要求 UI 进一步轻量化。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 查询区收敛为两行：
      - 第 1 行：`Topic`、`Paper`、`关键词`、`应用筛选`
      - 第 2 行：`范围状态`、`引用状态`、`权限`、`排序`、`重置筛选`
    - 新增轻量筛选状态：`overviewKeyword`、`overviewScopeFilter`、`overviewCitationFilter`、`overviewRightsFilter`。
    - 新增轻量筛选投影函数 `applyOverviewQuickFilters` + `projectOverviewItems`，统一用于：
      - 首次加载综览
      - 本地筛选重算
      - 高级查询结果投影
    - 将原高级条件构建器下沉为 `高级筛选（可选）` 折叠区，默认不展开，避免主视图复杂度。
  - `apps/desktop/src/renderer/app-layout.css`
    - 新增轻量筛选行样式：`literature-quick-filters`、`literature-quick-row`。
    - 新增高级折叠区样式：`literature-advanced-query*`。
    - 表格视觉进一步轻量化：弱化容器边框、降低表头背景强度、收紧单元格间距、降低 hover 强度。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 下线“高级筛选”区块与关联报错功能
- Trigger:
  - 用户要求移除文献综览中的“高级筛选（可选）”区域，以及该区域内重复出现的 `NOT_FOUND` 错误提示与相关功能。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 删除高级筛选相关类型与状态：`QueryField/QueryOperator/QueryLogic/QueryCondition/QueryGroup/SavedQueryPreset`。
    - 删除高级筛选处理逻辑：条件增删改、应用高级查询、重置条件、保存/应用/删除预设。
    - 删除 `retry-query` 恢复动作分支，错误恢复仅保留 `retry-zotero-import` 与 `reload-overview`。
    - 删除综览页 `<details className="literature-advanced-query">` 区块与该区域下方独立 `queryError` 文案渲染。
    - `projectOverviewItems` 收敛为仅“轻量筛选 + 排序”投影，不再接收 `queryGroup`。
    - 综览标题文案从“高级查询 + 元数据”调整为“轻量筛选 + 元数据”。
  - `apps/desktop/src/renderer/app-layout.css`
    - 删除高级筛选相关样式：`literature-advanced-query*`、`literature-query-conditions`、`literature-query-row`（含移动端覆盖）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 综览中 Paper NOT_FOUND 报错降级为空态
- Trigger:
  - 用户反馈在高级筛选下线后，综览区仍出现 `NOT_FOUND: Paper P001 not found.` 红色报错。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 新增 `isPaperNotFoundMessage` 辅助函数识别 `NOT_FOUND + Paper + not found` 错误文案。
    - 在 `loadLiteratureOverview` 的 `catch` 分支中，对该错误降级为 `empty` 状态：
      - 不渲染红色错误提示
      - 保持综览统计与结果列表为空态（0 条）
      - 不触发 overview 错误反馈气泡
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 移除综览顶部工具栏元素与状态功能
- Trigger:
  - 用户要求去除文献综览顶部的标题、查询状态、刷新综览、同步到论文管理元素及相关功能。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 删除综览顶部工具栏渲染块（标题/查询状态/刷新综览/同步到论文管理）。
    - 删除 `queryStatus` 状态链（state + 所有 `setQueryStatus` 调用）。
    - 删除仅用于顶部状态文案的 `formatUiOperationStatus`。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 修复“注入测试数据后综览无数据”
- Trigger:
  - 用户反馈点击“注入测试数据”后，文献综览仍为空。
- Root cause:
  - 注入逻辑仅写入“手动导入草稿”与 DEV 自动拉取配置，不会自动执行 `/literature/import`。
  - 综览接口仅聚合 `topic_scope` 与 `paper_literature_links`，未被纳入 scope/link 的文献不会出现在综览。
  - 过滤应用逻辑使用 `nextPaper = input || current`，导致无法清空无效 Paper 过滤（如历史默认 `P001`）。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - `handleInjectManualImportTestData` 增加“注入后自动入库”流程：
      - 对注入行执行校验，抽取有效 `normalized` 项。
      - 调用 `/literature/import` 入库。
      - 将入库结果批量写入当前 Topic 的 `in_scope`（`/topics/:topicId/literature-scope`）。
      - 自动刷新 `topic scope` 与 `literature overview`。
      - 自动清空 `paperId` 过滤，避免无效 Paper 阻断综览。
    - 修复筛选应用逻辑：`handleApplyLiteratureFilters` 改为严格采用输入值，不再回退旧值，支持清空 Paper/Topic 过滤。
    - 修复模块加载逻辑：当 topic/paper 为空时清空对应面板状态而非触发“不能为空”错误请求。
    - `paperId/paperIdInput` 默认值由 `P001` 调整为空字符串，减少首次进入综览时的无效过滤。
    - `loadLiteratureOverview` 增加兜底：当 `paper_id` 不存在但 `topic_id` 存在时，自动回退为 topic-only 查询。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 前端下线文献“权限分级”UI与交互（个人模式）
- Trigger:
  - 用户确认项目为个人使用，不需要权限相关界面与交互。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 文献综览筛选区移除“权限”维度（不再按 rights_class 筛选）。
    - 文献综览表格移除“权限”列。
    - 元数据编辑移除 rights_class 下拉，不再发送 `rights_class` 更新；仅保留标签更新。
    - 前端综览数据模型不再解析/使用 `rights_class` 与 `rights_class_counts`。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
- Notes:
  - 本次为前端下线（UI/UX + 前端交互）；后端与数据库仍保留 `rights_class` 字段用于兼容现有接口。

### 2026-03-02 - 文献综览移除 Topic/Paper 输入项
- Trigger:
  - 用户要求文献综览界面不再显示 Topic 与 Paper 两个输入内容。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 在综览查询区第一行删除 `Topic` 与 `Paper` 两个输入字段，仅保留关键词与其余筛选。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 文献综览筛选重构为单行轻量版（关键词/年份/标签/包含排除/排序）
- Trigger:
  - 用户要求将文献综览筛选改为单行轻量 UI，选项固定为：关键词搜索、发表年份范围、标签筛选、包含排除（勾选框）、排序（重要度评分/更新时间/发布时间/标题首字母 + 正序/倒序三角切换），并保留“应用/重置”按钮。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 过滤项重构：
      - 新增年份范围（起始/结束）与标签关键词过滤。
      - 新增包含排除勾选：`保留(in_scope)`、`排除(excluded)`。
      - 删除旧的范围状态下拉与引用状态下拉。
    - 排序重构：
      - 排序规则改为 `importance / updated_at / published_at / title_initial`。
      - 新增独立排序方向 `asc / desc`，UI 通过 `▲/▼` 切换。
      - 新增重要度评分函数（基于 citation_status、scope_status、年份、更新时间）用于 `importance` 排序。
    - 交互重构：
      - 引入“输入草稿值 + 应用值”双状态，`应用` 按钮生效时才提交过滤条件。
      - `重置` 同时重置输入草稿值与已应用值。
  - `apps/desktop/src/renderer/app-layout.css`
    - 查询区改为单行轻量布局（桌面端单行可横向滚动，移动端回落换行）。
    - 新增年份范围、包含排除勾选、排序方向按钮组的紧凑样式。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 文献综览筛选区强制单行（不换行）
- Trigger:
  - 用户确认筛选区域必须始终一行展示，不接受两行布局。
- What changed:
  - `apps/desktop/src/renderer/app-layout.css`
    - 查询行统一 `flex-wrap: nowrap`，桌面与移动端都禁止换行。
    - 保持横向滚动兜底：超出宽度时横向滚动而非折行。
    - 新增 `literature-filter-action` 固定“应用/重置”按钮紧凑宽度。
    - 删除小屏断点下将筛选行改为 100% 换行的覆盖逻辑。
  - `apps/desktop/src/renderer/App.tsx`
    - “应用/重置”按钮增加 `literature-filter-action` 样式类。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`
  - `apps/desktop/src/renderer/App.tsx`

### 2026-03-02 - 排序方向并入下拉选项（移除 ▲▼）
- Trigger:
  - 用户要求去除正序/倒序图标按钮，并将方向整合到排序下拉中（如“重要度评分正序”）。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 新增排序预设类型 `QuerySortPreset`（`规则|方向`）。
    - 排序下拉改为组合项：每个规则包含正序/倒序两个选项。
    - 删除排序方向按钮（▲/▼）和对应输入态。
    - `应用` 时通过 `parseQuerySortPreset` 解析并写入 `querySort + sortDirection`。
  - `apps/desktop/src/renderer/app-layout.css`
    - 移除排序方向按钮组样式，排序控件回归单一下拉布局。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 文献综览状态枚举切换 + 统计条下沉至表格底部
- Trigger:
  - 用户要求将状态改为：自动化就绪、可被引用、不可引用、已排除；
  - 并将统计信息从表头移到表格底部，替换为：总文献、最近更新、自动化就绪文献、可被引用文献、已排除文献。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 新增综览状态派生逻辑：
      - `已排除`：`topic_scope_status === excluded`
      - `自动化就绪`：非排除且存在来源链接与来源更新时间
      - `可被引用`：非排除且引用关键信息完整（作者、年份、定位信息 DOI/arXiv/来源链接）
      - `不可引用`：其余情况
    - 状态列由原 `scope/citation` 双行原始值展示，改为单一业务状态标签。
    - 删除表头统计行；新增表格 `tfoot` 统计行，展示指定 5 项指标。
    - 底部统计按当前综览结果集计算，并新增“最近更新”时间显示。
  - `apps/desktop/src/renderer/app-layout.css`
    - 调整表格统计行样式以支持 `tfoot` 底部统计展示（`td` 兼容、上边框分隔）。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 综览筛选控件精简（年份单输入 + 标签下拉 + 状态下拉）
- Trigger:
  - 用户要求：
    - 年份改为一个输入区域；
    - 标签改为下拉选择；
    - “保留/排除”点选改为状态下拉框。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 年份筛选：
      - 双输入（起/止）改为单输入 `overviewYearInput`。
      - 新增 `parseYearRangeFilterInput`，支持 `2023` 或 `2020-2024`（含 `~ / 至 / 到` 分隔）。
    - 标签筛选：
      - 从文本输入改为下拉框。
      - 下拉项按当前综览数据的标签集合动态生成，默认“全部标签”。
      - 过滤逻辑由“包含匹配”改为“标签精确匹配”。
    - 状态筛选：
      - 勾选框（保留/排除）改为单一状态下拉（全部/保留/排除）。
      - 应用时映射到现有 scope 过滤逻辑，并在单选状态下执行严格匹配（不混入无状态项）。
  - `apps/desktop/src/renderer/app-layout.css`
    - 清理双年份输入与勾选框相关样式。
    - 调整年份/状态下拉宽度以维持单行轻量布局。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 年份控件回调为双输入（默认 1900-2100，浅灰占位）
- Trigger:
  - 用户要求年份区域保留两段式输入，并以浅灰提示默认区间 `1900 - 2100`。
- What changed:
  - `apps/desktop/src/renderer/App.tsx`
    - 将年份输入从单输入恢复为起始/结束双输入。
    - 年份过滤默认区间设置为 `1900-2100`（输入为空时按默认区间应用）。
    - `重置` 后恢复默认区间过滤，同时输入框为空以展示占位提示。
  - `apps/desktop/src/renderer/app-layout.css`
    - 恢复年份双输入栅格样式。
    - 为年份输入占位符设置浅灰文本色，匹配“默认值提示”视觉。
- Impact scope:
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-02 - 年份双输入合并为单外框样式
- Trigger:
  - 用户要求双输入保留，但视觉上合并为一个外框。
- What changed:
  - `apps/desktop/src/renderer/app-layout.css`
    - 为 `.literature-year-range` 增加统一边框、圆角、背景和 `focus-within` 高亮。
    - 内部两个年份输入改为无边框透明背景，焦点不再单独出框。
    - 分隔符颜色与占位符浅灰色保持一致，整体视觉为“同一控件”。
- Impact scope:
  - `apps/desktop/src/renderer/app-layout.css`

### 2026-03-04 - 统一文献流程 SSOT + Pipeline 骨架（V1）
- Trigger:
  - 用户确认按“统一文献流程 SSOT + Pipeline 骨架方案（V1）”直接实施，目标为自动导入/手动导入/文献综览三模块围绕同一后端 SSOT 运作。
- What changed:
  - Prisma / DB:
    - `prisma/schema.prisma`：新增
      - `LiteraturePipelineState`
      - `LiteraturePipelineStageState`
      - `LiteraturePipelineRun`
      - `LiteraturePipelineRunStep`
    - `LiteratureRecord` 新增 `keyContentDigest`，并补充 pipeline relation。
    - 新增 migration：
      - `prisma/migrations/20260304120000_add_literature_pipeline_ssot/migration.sql`
  - Shared 契约:
    - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
    - 新增 `OverviewStatus`、pipeline stage/status/run/trigger/dedup 类型与 DTO。
    - `LiteratureOverviewItem` 新增 `overview_status` 与 `pipeline_state`。
    - 新增 pipeline API 请求 schema（`listLiteraturePipelineRunsQuerySchema`、`createLiteraturePipelineRunRequestSchema`）。
    - metadata patch 契约新增 `key_content_digest`。
  - Backend 服务与编排:
    - 新增 `apps/backend/src/services/overview-status-resolver.ts`（后端统一状态优先级：`excluded > automation_ready > citable > not_citable`）。
    - 新增 `apps/backend/src/services/pipeline-orchestrator.ts`（run/step 异步状态机，`PENDING -> RUNNING -> terminal`）。
    - 新增 `apps/backend/src/services/literature-flow-service.ts`（统一入口触发、阶段执行、pipeline 聚合态维护）。
    - `apps/backend/src/services/literature-service.ts`：
      - `import/zoteroImport/updateLiteratureMetadata` 接入统一 flow；
      - 新增 `importFromAutoPull`；
      - `getOverview` 改为读取后端计算的 `overview_status + pipeline_state`；
      - 新增 pipeline 读取/触发/列表接口服务方法。
  - Backend 仓储:
    - `apps/backend/src/repositories/literature-repository.ts` 扩展 pipeline record 与仓储接口。
    - `apps/backend/src/repositories/in-memory-literature-repository.ts` 落地 pipeline state/stage/run/step 内存实现。
    - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts` 落地 Prisma 实现并补齐 `keyContentDigest`。
  - Backend 路由/控制器:
    - `apps/backend/src/controllers/literature-controller.ts`
    - `apps/backend/src/routes/literature-routes.ts`
    - 新增:
      - `GET /literature/:literatureId/pipeline`
      - `POST /literature/:literatureId/pipeline/runs`
      - `GET /literature/:literatureId/pipeline/runs`
  - 自动导入写回策略:
    - `apps/backend/src/services/auto-pull-service.ts`
    - 导入调用改为 `literatureService.importFromAutoPull`，触发源统一为 `AUTO_PULL`。
    - 增加规则信号过滤（include/exclude）后再评分。
    - 分数硬切改为直接给出 `suggestedScope`：
      - `>= min_quality_score` -> `in_scope`（reason=`AUTO_RULE_SCORE_GTE_THRESHOLD`）
      - `< min_quality_score` -> `excluded`（reason=`AUTO_RULE_SCORE_LT_THRESHOLD`）
    - 对 TOPIC run 自动写回 `TopicLiteratureScope`（最小 reason code 审计）。
  - 前端综览收敛:
    - `apps/desktop/src/renderer/App.tsx`
    - 综览状态不再前端派生，直接消费后端 `overview_status`。
    - 去除 `overviewContentStatusById` 本地占位状态。
    - “提取摘要/预处理/向量化”改为调用后端 pipeline 触发接口。
    - 内容状态展示改为基于 `pipeline_state`（摘要/关键内容就绪）。
- Impact scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260304120000_add_literature_pipeline_ssot/migration.sql`
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `apps/backend/src/services/overview-status-resolver.ts`
  - `apps/backend/src/services/pipeline-orchestrator.ts`
  - `apps/backend/src/services/literature-flow-service.ts`
  - `apps/backend/src/services/literature-service.ts`
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/controllers/literature-controller.ts`
  - `apps/backend/src/routes/literature-routes.ts`
  - `apps/backend/src/repositories/literature-repository.ts`
  - `apps/backend/src/repositories/in-memory-literature-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
  - `apps/backend/src/services/overview-status-resolver.unit.test.ts`
  - `apps/backend/src/services/pipeline-orchestrator.unit.test.ts`
  - `apps/backend/src/services/auto-pull-service.unit.test.ts`
  - `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts`
  - `apps/desktop/src/renderer/App.tsx`
- Notes:
  - 按“加字段/加接口”兼容策略实施，旧接口未做破坏性删除。
  - 回填 job（历史文献 dedup/backfill 统计）作为后续阶段单独执行，当前先落 SSOT 与触发骨架。

### 2026-03-05 - 文献管线 V2 完整化（7 阶段可执行 + 契约一致化）
- Trigger:
  - 用户要求将文献 pipeline 从 V1 骨架升级为“完整可运行 7 阶段管线”，并完成 API/DB/前端语义与文档一致化。
- What changed:
  - Prisma / DB:
    - `prisma/schema.prisma`
      - 新增 `LiteraturePipelineArtifact` 模型，承载 `PREPROCESSED_TEXT/CHUNKS/EMBEDDINGS/LOCAL_INDEX` 中间产物。
      - `LiteraturePipelineRun` 新增 in-flight 查询索引：`@@index([literatureId, status])`。
    - 新增 migration：
      - `prisma/migrations/20260305130000_upgrade_literature_pipeline_v2/migration.sql`
  - Repository:
    - `apps/backend/src/repositories/literature-repository.ts`
      - 扩展 pipeline artifact record/type。
      - 新增批量 stage-state 查询与 artifact 读写接口。
    - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
    - `apps/backend/src/repositories/in-memory-literature-repository.ts`
      - 完成上述接口双实现。
  - Pipeline orchestrator:
    - `apps/backend/src/services/pipeline-orchestrator.ts`
      - 新增 literature 维度 single-flight：已有 in-flight run 时新 run 直接 `SKIPPED` 并写 `PIPELINE_RUN_SKIPPED_SINGLE_FLIGHT`。
      - 标准化 step input/output 引用结构。
  - 7 阶段执行器:
    - `apps/backend/src/services/literature-flow-service.ts`
      - 移除 V1 未实现占位，7 阶段全部可执行。
      - 权限门禁收敛：
        - `RESTRICTED` 阻断后四阶段。
        - `USER_AUTH` 受 `LITERATURE_USER_AUTH_PIPELINE_ENABLED` 控制。
      - 向量化策略：外部 embedding 服务优先，失败自动回退本地 embedding。
      - 新增 stage artifact 写入/覆盖逻辑，支持重复运行复用。
      - 提供综览语义构建能力：`pipeline_state` 深阶段位、`pipeline_stage_status`、`pipeline_actions`。
  - 综览与前端语义:
    - `apps/backend/src/services/literature-service.ts`
      - `GET /literature/overview` 返回 `pipeline_stage_status + pipeline_actions`。
    - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
      - 扩展 `LiteratureOverviewItem`、`LiteraturePipelineStateDTO`、action/stage 状态类型。
      - 对齐 `UpdateLiteratureMetadataRequest/Response` 的 `key_content_digest`。
    - 前端：
      - `apps/desktop/src/renderer/literature/shared/types.ts`
      - `apps/desktop/src/renderer/literature/shared/normalizers.ts`
      - `apps/desktop/src/renderer/literature/overview/OverviewTab.tsx`
      - 三动作启停与禁用原因改为后端直出语义，不再前端推断。
  - API / Context:
    - `docs/context/api/openapi.yaml`：
      - 文档化 `GET /literature/{literatureId}/pipeline`
      - 文档化 `POST /literature/{literatureId}/pipeline/runs`
      - 文档化 `GET /literature/{literatureId}/pipeline/runs`
      - 更新 `LiteratureOverviewItem` 与 metadata schema 漂移。
    - 生成并同步：
      - `docs/context/api/api-index.json`
      - `docs/context/api/API-INDEX.md`
      - `docs/context/db/schema.json`
      - `docs/context/registry.json`
  - 回填脚本:
    - 新增 `apps/backend/scripts/backfill-literature-pipeline.mjs`
      - 默认 dry-run，`--apply` 才真实触发。
      - 支持批次、并发、审计汇总（触发/跳过/失败原因分布）。
    - `apps/backend/package.json` 新增 `pipeline:backfill` 脚本入口。
  - 环境契约:
    - `env/contract.yaml` 与 `env/values/*.yaml` 补充：
      - `LITERATURE_USER_AUTH_PIPELINE_ENABLED`（默认 `false`）
      - `LITERATURE_PIPELINE_EMBEDDING_URL`
      - `LITERATURE_PIPELINE_EMBEDDING_API_KEY`
      - `LITERATURE_PIPELINE_EMBEDDING_MODEL`
- Impact scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260305130000_upgrade_literature_pipeline_v2/migration.sql`
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `apps/backend/src/repositories/literature-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
  - `apps/backend/src/repositories/in-memory-literature-repository.ts`
  - `apps/backend/src/services/literature-flow-service.ts`
  - `apps/backend/src/services/literature-service.ts`
  - `apps/backend/src/services/pipeline-orchestrator.ts`
  - `apps/backend/src/services/pipeline-orchestrator.unit.test.ts`
  - `apps/backend/src/services/literature-flow-service.unit.test.ts`
  - `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts`
  - `apps/backend/scripts/backfill-literature-pipeline.mjs`
  - `apps/backend/package.json`
  - `apps/desktop/src/renderer/literature/shared/types.ts`
  - `apps/desktop/src/renderer/literature/shared/normalizers.ts`
  - `apps/desktop/src/renderer/literature/overview/OverviewTab.tsx`
  - `docs/context/api/openapi.yaml`
  - `docs/context/api/api-index.json`
  - `docs/context/api/API-INDEX.md`
  - `docs/context/db/schema.json`
  - `docs/context/registry.json`
  - `env/contract.yaml`
  - `env/values/dev.yaml`
  - `env/values/staging.yaml`
  - `env/values/prod.yaml`
- Notes:
  - 回填作业仅交付脚本与执行参数，不在本轮自动触发历史数据回填。
  - 向量持久化维持本地优先，不引入外部向量数据库。

### 2026-03-05 - Pipeline 工作流缺口修复 V2.1（三项优先）
- Trigger:
  - 用户确认优先修复三项工作流缺口：
    - embedding 版本化映射（保留历史 + 自动激活最新成功版本）
    - 全局 retrieve + chunk 证据 API
    - 手动录入入口改为独立 side panel（Overview 仅触发）
- What changed:
  - Commit A `527d2ef`:
    - Prisma 新增 `LiteratureEmbeddingVersion / LiteratureEmbeddingChunk / LiteratureEmbeddingTokenIndex`。
    - `LiteratureRecord.activeEmbeddingVersionId` 落库。
    - repository（prisma + in-memory + interface）扩展版本化读写能力。
    - shared 契约新增 `GetLiteratureMetadataResponse`、retrieve request/response/hit/evidence 类型。
  - Commit B `df0ac28`:
    - `literature-flow-service` 在 `EMBEDDED/INDEXED` 阶段写入新 embedding version。
    - 仅在 `INDEXED` 成功后切换 `activeEmbeddingVersionId`，失败 run 不切换。
  - Commit C `dbc07a5`:
    - 新增 `GET /literature/{literatureId}/metadata`。
    - 新增 `POST /literature/retrieve` 与 `LiteratureRetrievalService`（Hybrid=0.7 vector + 0.3 lexical，返回 evidence chunks）。
    - OpenAPI + API index 同步。
  - Commit D `3b9fe34`:
    - 前端新增 `Metadata Intake Panel`（独立侧栏录入）。
    - Overview 每行新增“录入内容”触发按钮，面板负责 GET/PATCH metadata、成功后关闭并刷新 overview。
  - Commit E（本次）:
    - 新增 `apps/backend/scripts/backfill-embedding-version-mapping.mjs`（默认 dry-run，支持 `--apply --batch-size --concurrency`）。
    - `apps/backend/package.json` 新增 `pipeline:backfill-embedding-mapping` 脚本。
    - dev-docs 与 verification 记录补齐。
- Impact scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260305190000_add_embedding_version_mapping/migration.sql`
  - `apps/backend/src/repositories/literature-repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
  - `apps/backend/src/repositories/in-memory-literature-repository.ts`
  - `apps/backend/src/services/literature-flow-service.ts`
  - `apps/backend/src/services/literature-retrieval-service.ts`
  - `apps/backend/src/services/literature-service.ts`
  - `apps/backend/src/controllers/literature-controller.ts`
  - `apps/backend/src/routes/literature-routes.ts`
  - `apps/backend/scripts/backfill-embedding-version-mapping.mjs`
  - `apps/backend/package.json`
  - `apps/desktop/src/renderer/literature/intake/MetadataIntakePanel.tsx`
  - `apps/desktop/src/renderer/literature/intake/useMetadataIntakeController.ts`
  - `apps/desktop/src/renderer/literature/overview/OverviewTab.tsx`
  - `apps/desktop/src/renderer/literature/overview/useOverviewActionsController.ts`
  - `apps/desktop/src/renderer/literature/shared/types.ts`
  - `apps/desktop/src/renderer/literature/shared/normalizers.ts`
  - `apps/desktop/src/renderer/styles/literature-overview.css`
  - `docs/context/api/openapi.yaml`
  - `docs/context/api/api-index.json`
  - `docs/context/api/API-INDEX.md`
- Notes:
  - 本轮未自动执行 backfill 写入；仅交付脚本与执行参数。
