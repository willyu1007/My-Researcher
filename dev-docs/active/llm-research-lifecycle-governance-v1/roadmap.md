# LLM-Driven Research Lifecycle Governance v1 — Roadmap

## Goal
- 围绕 8 个功能模块与 4 个阶段建立可执行 roadmap，明确自动化编排与职责边界，并为模块 4 到 7 建立严格版本管理主线。

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: `docs/project/overview/requirements.md`
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/llm-research-lifecycle-governance-v1/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | Current chat | 8 模块边界、4 阶段推进、LLM 自动化与版本治理重点 | highest | 明确强调模块 4~7 的版本管理 |
| Requirements doc | `docs/project/overview/requirements.md` | 产品边界、MUST 能力与约束 | high | 对齐 local-first、Claims-Evidence 可追溯 |
| Blueprint doc | `docs/project/overview/project-blueprint.json` | 技术栈与能力开关约束 | high | TypeScript monorepo + React/Fastify/Postgres |
| Existing roadmap | `dev-docs/active/paper-assistant-core-modules/roadmap.md` | 既有规划背景与依赖线索 | medium | 本任务为细化增强，不覆盖旧任务 |
| Model inference | N/A | 填补流程命名与治理字段细节 | lowest | 仅在用户未指定处使用 |

## Non-goals
- 不在本任务中实现业务代码或数据库迁移。
- 不锁定所有 API 细节与 UI 交互稿。
- 不替代研究者的学术判断，不生成无证据结论。

## Open questions and assumptions
### Open questions (answer before execution)
- Q1: 模块 6（模型与训练）在 M0 是否默认关闭，仅保留可选能力开关。
- Q2: 模块 4 到 7 的版本 SSOT 是“数据库主存 + Git 快照映射”，还是“Git 主存 + 数据库索引”。
- Q3: 阶段 4 的投稿能力在 M0 是否只覆盖“打包与检查”，暂不做平台自动投递。

### Assumptions (if unanswered)
- A1: M0 先采用“数据库主存 + Git 快照映射”，保证结构化查询与审计（risk: medium）。
- A2: 模块 6 作为可选链路，空缺时阶段 3 仍可完成（risk: low）。
- A3: 阶段 4 先做投稿前治理与修稿编排，不做外部平台自动提交（risk: low）。
- A4: 当前研究方向默认为 LLM，`core_score_vector` 使用全局统一默认配置（risk: low）。

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | 任务组织方式 | 既有 3 批次草案 vs 用户要求 4 阶段推进 | 采用 4 阶段作为执行主线 | latest user-confirmed instruction | 在 `01-plan.md` 固化阶段验收 |
| C2 | 模块 8 归位 | 旧草案将“论文管理”置于末位 vs 新需求要求先有论文主键 | 将模块 3 固定为“论文项目管理”并前置 | latest user-confirmed instruction | 在阶段 2 先落地主键与状态机 |
| C3 | 版本治理重点 | 通用版本策略 vs 用户强调 4~7 | 单独建立 Research Version Spine | latest user-confirmed instruction | 阶段 3 输出版本字段与门禁规则 |
| C4 | 配置生效与回滚策略 | 多种执行路径 vs 用户确认方案 | 默认 `next_gate_window` 生效；回滚采用 stage 自动守护 + paper/global 人工审批 | latest user-confirmed instruction | 固化到 `07-value-gate-dictionary.md` |
| C5 | 版本命名策略 | 纯语义版号 vs 纯递增版号 | 采用三层命名：`P-M-B-N` + `SP-*` + `Rx.y.z` | latest user-confirmed instruction | 固化到 `07-value-gate-dictionary.md` 与 `02-architecture.md` |
| C6 | 冻结粒度策略 | 模块级冻结 vs 阶段级冻结（并行线程冲突） | 采用快照冻结：`SP-partial/SP-full` + 兼容性约束 | latest user-confirmed instruction | 固化到 `07-value-gate-dictionary.md` 与 `02-architecture.md` |
| C7 | M6 可选缺省时的 M7 契约 | 无训练链路时评估标准不确定 | 采用 M7 双分支：`with_m6/no_m6`；`no_m6` 需更严格阈值与写作约束 | latest user-confirmed instruction | 固化到 `07-value-gate-dictionary.md` 与 `02-architecture.md` |

## Scope and impact
- Affected areas/modules: `dev-docs/active/llm-research-lifecycle-governance-v1/`, `.ai/project/main/`
- External interfaces/APIs: LLM provider APIs、文献检索源、可选训练执行器、Prism/Overleaf 集成边界（仅规划）
- Data/storage impact: 新增“版本链路对象”规划（ResearchSpec/ExperimentPlan/TrainingRun/AnalysisReport）
- Backward compatibility: 以新增任务文档为主，不改现有业务实现

## Task boundary and anti-drift
- 本任务只维护治理层：4 阶段门禁、LLM 自动化编排策略、模块 4~7 版本主线。
- 模块定义、TP 列表、批次优先级由 `T-002` 维护并作为只读输入。
- 统一边界契约：`dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`。

## Project structure change preview (may be empty)
This section is a non-binding, early hypothesis to help humans confirm expected project-structure impact.

### Existing areas likely to change (may be empty)
- Modify:
  - `dev-docs/active/`
  - `.ai/project/main/registry.yaml`
  - `.ai/project/main/task-index.md`
  - `.ai/project/main/dashboard.md`
  - `.ai/project/main/feature-map.md`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions (landing points) (may be empty)
- New module(s) (preferred):
  - `dev-docs/active/llm-research-lifecycle-governance-v1/`
- New interface(s)/API(s) (when relevant):
  - `<TBD>`（后续进入实现阶段再细化）
- New file(s) (optional):
  - `dev-docs/active/llm-research-lifecycle-governance-v1/roadmap.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/00-overview.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/01-plan.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/02-architecture.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/03-implementation-notes.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/04-verification.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/05-pitfalls.md`
  - `dev-docs/active/llm-research-lifecycle-governance-v1/.ai-task.yaml`

## Phases
1. **Phase 1**: 文献与选题基础阶段（模块 1-2）
   - Deliverable: 文献注册表与选题候选池的职责边界、准入规则、自动化入口
   - Acceptance criteria: 选题具备可追溯输入来源，且可被明确评审“进入/不进入”研究阶段
2. **Phase 2**: 论文项目立项阶段（模块 3）
   - Deliverable: 论文主键、阶段状态机、门禁策略（立项门禁）
   - Acceptance criteria: 每个立项题目都能生成唯一论文主键并进入受控生命周期
3. **Phase 3**: 研究准备与验证阶段（模块 4-7）
   - Deliverable: Research Version Spine（设计->实验->训练->分析）和自动化编排契约
   - Acceptance criteria: 任一分析结论可追溯到上游版本与运行上下文（run_id、parent_version）
4. **Phase 4**: 写作/投稿/修稿交付阶段（模块 8）
   - Deliverable: 与阶段 3 证据链一致的写作与投稿修稿流程
   - Acceptance criteria: 写作/修稿输出不能越权改写 4~7 原始版本对象

## Step-by-step plan (phased)
### Phase 0 — Discovery
- Objective: 锁定 8 模块输入输出、4 阶段门禁与版本对象最小集合
- Deliverables:
  - 模块职责矩阵（Responsible / Collaborate / Forbidden）
  - `Stage DAG + Value Gate` 词典（节点状态、回流、保留策略）
  - 4 阶段门禁清单（entry/exit conditions）
  - 4~7 版本对象草案
  - 字段级契约草案（`08-interface-field-contracts.md`）
- Verification:
  - 用户确认模块边界与阶段顺序可执行
- Rollback:
  - N/A

### Phase 1 — Foundation Governance (Modules 1-3)
- Objective: 建立研究入口治理，避免未筛选方向直接进入研发链路
- Deliverables:
  - 文献管理与选题管理联动规则
  - 论文主键生成与状态机草案
- Verification:
  - 立项门禁可判断并记录决策理由
- Rollback:
  - 回退为仅保留选题候选池，不开放立项

### Phase 2 — Versioned Research Spine (Modules 4-7)
- Objective: 建立模块 4 到 7 的版本主线与自动化运行协议
- Deliverables:
  - 版本对象与字段契约：`research_spec_v`、`experiment_plan_v`、`training_run_v`、`analysis_report_v`
  - 版本命名契约：工作节点 `P-M-B-N`、冻结快照 `SP-*`、发布标签 `Rx.y.z`
  - 版本关系约束：`paper_id + stage_id + version_id + parent_version_id + run_id + lane_id + attempt_id`
  - 快照冻结规则：`SP-partial` / `SP-full`、兼容性约束、并发线程下的快照切片策略
  - 快照执行面：`paper_active_sp_full` 指针切换用于晋级/回滚，不改写历史快照
- Verification:
  - 任一 `analysis_report_v` 能回链到唯一 `research_spec_v`
  - 自动化运行记录包含 LLM 代理配置与审计轨迹
- Rollback:
  - 降级为“手动审批 + 部分自动化”，保留版本追溯字段不变

### Phase 3 — Writing Delivery Contract (Module 8)
- Objective: 让写作/投稿/修稿严格消费阶段 3 已冻结证据
- Deliverables:
  - 写作输入契约（只读 4~7 冻结版本）
  - 投稿包生成规则与修稿回链机制
- Verification:
  - 修稿建议均可指向具体证据版本，不允许“无来源修改”
- Rollback:
  - 仅保留写作建议与人工修稿映射，不自动更新投稿包

### Phase 4 — Governance Closure
- Objective: 固化任务执行基线并接入项目治理
- Deliverables:
  - dev-docs 全套文档齐备并通过 governance lint
  - 项目 registry 完成任务注册与索引更新
- Verification:
  - `sync --apply` 与 `lint --check` 通过
- Rollback:
  - 若 lint 失败，回退 registry 变更并仅保留本地任务文档

## Verification and acceptance criteria
- Build/typecheck:
  - 本任务为文档治理阶段，不触发业务 build
- Automated tests:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Manual checks:
  - 检查 8 模块与 4 阶段是否被一一映射
  - 检查模块 4~7 是否有统一版本对象和冻结规则
- Acceptance criteria:
  - 新任务已创建并登记到 project hub
  - roadmap 明确 8 模块职责和 4 阶段推进路径
  - roadmap 明确 LLM 自动化编排边界
  - roadmap 明确 4~7 版本管理 spine 和门禁

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 自动化越权改写研究结论 | med | high | 写作与修稿模块只读冻结证据版本 | 发现下游模块写入上游版本对象 | 关闭自动写回，仅保留建议 |
| 4~7 版本链断裂导致不可追溯 | med | high | 强制 parent_version_id + run_id + stage gate | analysis 无法回链 research spec | 阶段 3 回退到手动门禁 |
| 模块边界定义过粗，后续无法实施 | med | med | 每阶段补充 R/C/F 矩阵与 API 草图 | 计划评审无法给出下一步实现动作 | 回退并加细职责矩阵 |

## Optional detailed documentation layout (convention)
```
dev-docs/active/llm-research-lifecycle-governance-v1/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
  06-task-boundary-and-anti-drift.md
  07-value-gate-dictionary.md
  08-interface-field-contracts.md
```

## To-dos
- [x] Confirm planning-mode signal handling and fallback record
- [x] Confirm input sources and trust levels
- [x] Confirm merge decisions and conflict log entries
- [ ] Confirm open questions
- [x] Confirm phase ordering and DoD
- [x] Confirm verification/acceptance criteria
- [x] Confirm rollout/rollback strategy
