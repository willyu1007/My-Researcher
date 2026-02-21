# Paper Assistant Core Modules — Roadmap

## Goal
- 为论文助手的 8 个核心子功能建立可执行的任务包体系，形成分阶段实现顺序与验收口径。

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: `docs/project/overview/requirements.md`
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/paper-assistant-core-modules/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | Current chat | 阶段目标与优先级 | highest | 先形成任务包，不做实现定稿 |
| Requirements doc | `docs/project/overview/requirements.md` | 功能范围与约束 | high | 初始化归档后的 Stage A SSOT |
| Blueprint doc | `docs/project/overview/project-blueprint.json` | 技术基线与特性开关 | high | 当前 M0/M1/M2 路线基线 |
| Existing roadmap | (none) | N/A | medium | 首次创建 |
| Model inference | N/A | 填补任务拆分细节 | lowest | 仅用于结构化组织 |

## Non-goals
- 不在本阶段实现业务代码。
- 不在本阶段锁定所有模块内部接口细节。
- 不在本阶段启动跨用户协作能力。

## Open questions and assumptions
### Open questions (answer before execution)
- Q1: 8 个子功能应按 2 批还是 3 批推进。
- Q2: M0 是否需要先落地最小可用桌面壳（shell）再推进业务模块。

### Assumptions (if unanswered)
- A1: 先完成共享底座（项目/任务/文献/追溯）再上层能力（risk: medium）。
- A2: 写作与投稿模块主要依赖现有工具集成，不先重建编辑器（risk: low）。

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | 8 个模块是否立即定稿 | 用户要求“先讨论，不定稿” vs 先前草案结论 | 以任务包形式规划，接口细节保持待讨论 | latest user-confirmed instruction | 在每个任务包进入实现前补充接口设计 |

## Scope and impact
- Affected areas/modules: `dev-docs/`, `apps/`, `packages/`, `docs/context/`, `env/`, `ci/`
- External interfaces/APIs: 文献检索源、LLM API、Prism/Overleaf、本地 Git、可选 Qdrant
- Data/storage impact: local-first 主存储 + 云控制面同步
- Backward compatibility: 以新增模块和兼容扩展为主，不破坏现有初始化产物

## Project structure change preview (may be empty)
### Existing areas likely to change (may be empty)
- Modify:
  - `apps/`
  - `packages/`
  - `docs/context/`
  - `dev-docs/active/paper-assistant-core-modules/`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions (landing points) (may be empty)
- New module(s) (preferred):
  - `apps/backend/src/modules/*`
  - `apps/frontend/src/features/*`
  - `packages/shared/*`
- New interface(s)/API(s) (when relevant):
  - `<TBD>`（按任务包逐个细化）
- New file(s) (optional):
  - `<TBD>`

## Phases
1. **Phase 1**: 底座能力与研究入口
   - Deliverable: 文献管理、研究方向池、论文管理的任务包与验收口径
   - Acceptance criteria: 三个模块的输入/输出/边界明确，可独立排期
2. **Phase 2**: 研究执行闭环
   - Deliverable: 理论框架、实验设计、模型训练、数据分析任务包
   - Acceptance criteria: 四个模块形成 claims-evidence 可追溯链路
3. **Phase 3**: 写作与投稿闭环
   - Deliverable: 写作/投稿/修稿任务包及与外部工具集成边界
   - Acceptance criteria: 与上游研究模块可串联成端到端流程

## Step-by-step plan (phased)
### Phase 0 — Discovery (if needed)
- Objective: 锁定任务包模板与优先级标准
- Deliverables:
  - 任务包清单（8 项）
  - 模块依赖图（高层）
- Verification:
  - 用户确认任务包拆分可执行
- Rollback:
  - N/A

### Phase 1 — Foundation Packages
- Objective: 明确底座型模块任务包
- Deliverables:
  - 文献管理任务包
  - 研究方向池任务包
  - 论文管理任务包
- Verification:
  - 每个任务包含目标、范围、接口策略、验收指标
- Rollback:
  - 回退到仅保留 roadmap + open questions

### Phase 2 — Research Execution Packages
- Objective: 建立研究执行链路任务包
- Deliverables:
  - 理论框架与研究设计
  - 实验设计
  - 模型与训练
  - 数据分析与讨论
- Verification:
  - 链路完整覆盖 claims -> experiment -> analysis
- Rollback:
  - 将复杂模块降级为探索任务

### Phase 3 — Writing Lifecycle Package
- Objective: 收口写作投稿链路
- Deliverables:
  - 写作、投稿、修稿任务包
- Verification:
  - 明确内部能力与外部工具调用边界
- Rollback:
  - 仅保留集成策略，不进入细化实现

## Verification and acceptance criteria
- Build/typecheck:
  - 文档阶段不强制 build
- Automated tests:
  - 文档一致性检查 + 结构完整性检查
- Manual checks:
  - 审阅每个任务包的范围与边界是否可落地
- Acceptance criteria:
  - 8 个模块均有任务包条目
  - 每个任务包都有优先级、依赖、验收标准
  - 与 Stage A/B 决策一致，不提前锁定实现细节

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 任务包过于宏观，不可执行 | med | high | 每个任务包强制给出 DoD 与验收命令 | 评审后无法给出下一步实现动作 | 回退并补充粒度 |
| 任务包过度定稿，违背“待讨论”要求 | med | high | 明确标注“边界待讨论” | 文档出现强制接口定稿措辞 | 回退到 TBD 状态 |
| 模块依赖顺序错误 | med | med | 先做底座模块，再做链路模块 | 执行时出现循环依赖 | 调整 Phase 顺序 |

## Optional detailed documentation layout (convention)
```
dev-docs/active/paper-assistant-core-modules/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
  06-task-packages.md
```

## To-dos
- [x] Confirm planning-mode signal handling and fallback record
- [x] Confirm input sources and trust levels
- [x] Confirm merge decisions and conflict log entries
- [ ] Confirm open questions
- [ ] Confirm phase ordering and DoD
- [ ] Confirm verification/acceptance criteria
- [ ] Confirm rollout/rollback strategy
