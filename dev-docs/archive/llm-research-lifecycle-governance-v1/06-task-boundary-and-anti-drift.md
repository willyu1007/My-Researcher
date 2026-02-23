# 06 Task Boundary and Anti-Drift

## Purpose
- 为 `T-002 paper-assistant-core-modules` 与 `T-003 llm-research-lifecycle-governance-v1` 建立单一职责边界与同步规则，避免同题双文档漂移。

## Task role split (single-writer model)
| Topic | SSOT owner | Consumer | Update rule |
|---|---|---|---|
| 8 模块定义、任务包条目、批次优先级 | `T-002` (`06-task-packages.md`) | `T-003` | 先改 `T-002`，再在 `T-003` 引用，不复制重写 |
| 4 阶段门禁（entry/exit） | `T-003` (`roadmap.md`, `01-plan.md`) | `T-002` | 先改 `T-003`，`T-002` 仅引用阶段结论 |
| LLM 自动化编排规则 | `T-003` (`roadmap.md`, `02-architecture.md`) | `T-002` | 仅 `T-003` 可写策略，`T-002` 禁止复写 |
| 模块 4~7 版本主线（Version Spine） | `T-003` (`roadmap.md`, `02-architecture.md`) | `T-002` | 仅 `T-003` 可写字段与冻结点规则 |
| 模块执行优先级与任务拆分队列 | `T-002` (`roadmap.md`, `06-task-packages.md`) | `T-003` | `T-003` 只引用 TP 编号，不维护独立队列 |

## Hard boundaries
1. `T-002` 禁止定义或覆盖以下内容：阶段门禁规则、LLM 自动化审批策略、4~7 版本字段契约。
2. `T-003` 禁止重命名 8 模块、重排 TP 编号、定义独立批次体系。
3. 两个任务都必须使用相同模块编号映射：`M1..M8` 对应 `TP-01..TP-08`。
4. 当单次变更同时触达两任务时，必须在两边 `03-implementation-notes.md` 同步记录变更摘要。

## Change protocol (ordered)
1. 判断变更归属（模块清单类 -> `T-002`，治理/版本类 -> `T-003`）。
2. 仅在 SSOT 文档修改正文；另一侧只更新引用或链接。
3. 运行一致性检查：
   - `rg -n "TP-0[1-8]|M[1-8]" dev-docs/active/paper-assistant-core-modules dev-docs/active/llm-research-lifecycle-governance-v1`
   - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
4. 在两任务的 `04-verification.md` 记录检查结果（至少记录一次人工交叉检查）。

## Drift checklist
- [ ] 两任务模块列表名称一致，且仅 `T-002` 维护模块定义正文。
- [ ] 两任务阶段定义一致，且仅 `T-003` 维护阶段门禁正文。
- [ ] `T-003` 的版本对象命名可在 `T-002` 中被引用但不被改写。
- [ ] `T-002` 的批次优先级可在 `T-003` 中被引用但不被复制成第二套表。
- [ ] 任一新增规则都附带“owner task”声明。

## Decision log
### 2026-02-21
- 决策: 采用“双任务单写者”模型，避免同一主题在两任务中并行维护。
- 影响: `T-002` 聚焦“模块包定义”，`T-003` 聚焦“阶段治理与版本治理”。
