# 02 Architecture

## Frontend module boundaries
- Workspace Shell (`LiteratureWorkspace`)
  - 负责共享上下文、标签切换、全局反馈。
- Tab A: `AutoImportTab`
  - 负责联网检索候选 + URL 自动抓取导入。
- Tab B: `ManualImportTab`
  - 负责文件解析上传 + Zotero 参数输入与导入同步。
- Tab C: `OverviewTab`
  - 负责统计、列表、筛选、元数据维护。
- Shared: `AdvancedQueryBuilder`
  - 负责条件组编辑（AND/OR）、保存查询、应用查询。
- Shared: `FeedbackCenter`
  - 顶部提示 + 内联状态展示。

## State model
### Required UI types
- `UiOperationStatus = idle | loading | ready | empty | error | saving`
- `QueryCondition`:
  - `field`（如 title/provider/tags/rights_class/year/topic_scope_status/citation_status）
  - `operator`（contains/equals/not_equals/in/gt/lt/is_empty/is_not_empty）
  - `value`
- `QueryGroup`:
  - `logic: AND | OR`
  - `conditions: QueryCondition[]`
- `SavedQueryPreset`:
  - `id`
  - `name`
  - `group: QueryGroup`
  - `defaultSort`
- `InlineFeedbackModel`:
  - `slot`（tab/header/row）
  - `level`（info/success/warning/error）
  - `message`
  - `recoveryAction`（retry/reload/edit-fix）

### UI state machine
1. 导入操作：`idle -> loading -> ready|error`
2. 查询操作：`idle -> loading -> ready|empty|error`
3. 元数据保存：`ready -> saving -> ready|error`
4. 首屏综览：`idle -> loading -> ready|empty|error`

## Interaction protocol
- 顶部反馈（全局）:
  - 显示当前模块最近一次关键操作结果（成功/失败/恢复建议）。
- 内联反馈（局部）:
  - 每个标签与关键表单元素显示状态与错误原因。
- 恢复动作:
  - 所有 `error` 状态必须带重试或修复动作入口。

## Data flow
1. 用户在标签页触发操作。
2. 统一请求层调用现有 `/literature/*` API。
3. 结果进入共享状态容器。
4. 查询构建器对综览 items 执行前端条件求值。
5. 列表与统计按过滤结果渲染。

## Minimal backend dependency strategy
- Default:
  - 复用现有 endpoint：
    - `POST /literature/web-import`
    - `POST /literature/import`
    - `POST /literature/zotero-import`
    - `GET /literature/overview`
    - `PATCH /literature/:literatureId/metadata`
- Forbidden in this round:
  - 静默新增/修改破坏性接口。
- Escalation rule:
  - 若高级查询在性能/准确性上被验证阻塞，创建“阻塞修复子任务”再扩展后端能力。

## Constraints
- 中文优先文案；英文术语仅用于必要学术字段。
- 统一状态机覆盖所有关键交互。
- UI 结构必须同时适配桌面与小屏。
