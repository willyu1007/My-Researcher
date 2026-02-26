# 文献管理 UIUX 可用化（先任务包、后对齐、再执行）— Roadmap

## Goal
- 将文献管理前端 UIUX 提升到“接近发布级可用”，覆盖三类导入入口、综览与分类、元数据管理与高级查询。

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: `dev-docs/active/literature-management-flow/*` + 用户本轮确认计划
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/literature-management-flow/roadmap.md`
- Mode fallback used: non-Plan default applied: no

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | 当前会话（“PLEASE IMPLEMENT THIS PLAN”） | 目标、边界、验收与执行顺序 | highest | 本轮唯一优先输入 |
| Existing task bundle | `dev-docs/active/literature-management-flow/*` | 现状与可复用实现 | high | 在不破坏现有 API 的前提下演进 |
| Current frontend reality | `apps/desktop/src/renderer/App.tsx`, `app-layout.css` | UI 结构与状态管理基线 | high | 当前为堆叠流，需改为标签页分步 |
| Model inference | N/A | 补齐未显式指定的低风险实现细节 | lowest | 仅用于样式与交互细节 |

## Non-goals
- 不进行视觉品牌重设计（仅做可用性与信息架构提升）。
- 不引入必须新增的后端公共 endpoint。
- 不在本轮引入 DSL 查询输入或复杂规则引擎。

## Open questions and assumptions
### Open questions (answer before execution)
- (none)

### Assumptions (if unanswered)
- A1: 现有后端接口可支撑首版 UI 高级查询（前端条件构建 + 前端筛选）(risk: medium)
- A2: 文献管理文案中文优先，英文仅保留必要学术字段 (risk: low)

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | 执行顺序 | “先实现” vs “先任务包+对齐” | 严格按“先任务包、后对齐、再执行” | 用户明确要求 | 执行结果回写任务包 |
| C2 | 后端范围 | 新增查询 endpoint vs 最小边界复用 | 默认复用现有 API，仅在阻塞时开子任务 | 用户明确边界 | 阻塞再建子任务 |
| C3 | 查询形态 | DSL vs 条件构建器 | 首版采用条件构建器 + 保存查询 | 用户明确决策 | DSL 延后 |

## Scope and impact
- Affected areas/modules:
  - `dev-docs/active/literature-management-flow/*`
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/app-layout.css`
- External interfaces/APIs:
  - `POST /literature/web-import`
  - `POST /literature/import`
  - `POST /literature/zotero-import`
  - `GET /literature/overview`
  - `PATCH /literature/:literatureId/metadata`
- Data/storage impact:
  - 本轮前端主导，无新增必需持久化模型。
- Backward compatibility:
  - 保持向后兼容，不破坏现有路由和契约。

## 可用性定义（接近发布级）
- 关键路径全通：三条导入入口 + 查询 + 综览 + 元数据更新闭环可执行。
- 失败可恢复：每类失败均提供明确重试/修复动作。
- 反馈及时一致：关键动作都具备“内联状态 + 顶部提示”。
- 状态完整：`idle/loading/ready/empty/error/saving` 全覆盖。

## UI 信息架构（标签页分步）
1. 自动导入
2. 手动导入（文件上传 + 文献库联动）
3. 文献综览

## 灰度与回滚策略
- 灰度阶段:
  1. 阶段 A：内部环境启用新标签页与高级查询，旧流程保留。
  2. 阶段 B：默认新流程，保留回退入口（配置开关/回滚分支）。
  3. 阶段 C：移除旧入口，仅保留新工作台。
- 回滚触发条件:
  - 三类导入任一不可用且无法在 1 个修复周期内恢复。
  - 高级查询返回结果明显错误（错误率超阈值）影响核心任务。
  - 反馈系统缺失导致用户无法判断状态与恢复路径。

## 前端优先与最小后端边界
- 前端优先:
  - 先完成标签 IA、状态机、查询构建器、反馈一致性与列表交互。
- 最小后端边界:
  - 仅复用现有 `/literature/*` 路由。
  - 若高级查询性能/准确性被证明阻塞，再进入“阻塞修复子任务”，不在本轮静默扩 scope。

## Consistency baseline for dual artifacts (if applicable)
- [x] Goal is semantically aligned with host plan artifact
- [x] Boundaries/non-goals are aligned
- [x] Constraints are aligned
- [x] Milestones/phases ordering is aligned
- [x] Acceptance criteria are aligned
- Intentional divergences:
  - (none)

## Project structure change preview (may be empty)
This section is a non-binding, early hypothesis to help humans confirm expected project-structure impact.

### Existing areas likely to change (may be empty)
- Modify:
  - `dev-docs/active/literature-management-flow/`
  - `apps/desktop/src/renderer/`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions (landing points) (may be empty)
- New module(s) (preferred):
  - (none)
- New interface(s)/API(s) (when relevant):
  - (none)
- New file(s) (optional):
  - (none)

## Phases
1. **Phase 1**: 任务包刷新
   - Deliverable: roadmap + `00~05` 文档完整更新，覆盖 IA/边界/验收。
   - Acceptance criteria: 文档可直接指导执行并可交接。
2. **Phase 2**: 全量 UI 对齐
   - Deliverable: Final UI decision matrix + Out-of-scope + Go/No-Go gate。
   - Acceptance criteria: 高影响决策全部冻结，无待决项。
3. **Phase 3**: 前端 UIUX 实施
   - Deliverable: 标签页分步、三入口同级可用、高级查询、综览分类、反馈体系。
   - Acceptance criteria: 满足“接近发布级”定义。
4. **Phase 4**: 验证与灰度准备
   - Deliverable: 自动化/手工/可用性/灰度验证记录。
   - Acceptance criteria: 所有 Go 门槛通过且可执行回滚。

## Step-by-step plan (phased)
### Phase 1 — 任务包刷新
- Objective:
  - 按已确认决策刷新 `roadmap + 00~05`。
- Deliverables:
  - 完整任务包文档。
- Verification:
  - 逐文件校验必含条目是否齐全。
- Rollback:
  - 文档回滚到上一个稳定提交。

### Phase 2 — 全量 UI 对齐
- Objective:
  - 冻结 UI 决策并明确执行门。
- Deliverables:
  - 决策矩阵、Out-of-scope、Go/No-Go gate。
- Verification:
  - 决策项全部为“已确认”。
- Rollback:
  - 保留历史决策版本并恢复。

### Phase 3 — 前端实施
- Objective:
  - 完成标签页架构、查询构建器、结果列表、综览分类与反馈统一。
- Deliverables:
  - `App.tsx`/`app-layout.css` 的可运行 UI 改造。
- Verification:
  - 三入口可用 + 高级查询可用 + 元数据编辑可用。
- Rollback:
  - 回滚前端改动，恢复旧文献面板。

### Phase 4 — 验证与治理同步
- Objective:
  - 完成命令验证与治理索引同步。
- Deliverables:
  - `04-verification.md` 结果记录 + governance sync 执行记录。
- Verification:
  - 指定命令与手工场景全部记录清晰。
- Rollback:
  - 任一门槛不通过则停止灰度，保留旧流程。

## Verification and acceptance criteria
- Build/typecheck:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm desktop:typecheck`
  - `pnpm desktop:build`
- Automated tests:
  - `pnpm --filter @paper-engineering-assistant/backend test`
  - `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full`
  - `node .ai/tests/run.mjs --suite ui`
- Manual checks:
  - 自动联网导入、手动上传、Zotero、高级查询、结果列表、综览分类、反馈一致性。
- Acceptance criteria:
  - 三类导入入口全部可用。
  - 高级查询构建器可稳定使用。
  - 综览与分类可完成主要维护任务。
  - UI gate 无错误。
  - 无破坏性 API 变更。

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 查询构建器逻辑复杂导致误筛选 | medium | high | 条件求值器单点实现 + 手工场景覆盖 | 查询场景结果偏差 | 回退到基础筛选 |
| 三入口状态反馈不一致 | medium | high | 统一 `UiOperationStatus` 与反馈模型 | UI 检查发现状态缺口 | 回退统一层改造 |
| 综览编辑与列表状态不同步 | medium | medium | 编辑后统一刷新与局部回写策略 | 元数据显示延迟/错乱 | 回退到全量刷新策略 |

## Optional detailed documentation layout (convention)
```
dev-docs/active/literature-management-flow/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos
- [x] Confirm input sources and trust levels
- [x] Confirm phase ordering and DoD
- [x] Confirm verification/acceptance criteria
- [x] Confirm rollout/rollback strategy
