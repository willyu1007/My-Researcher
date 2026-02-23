# Analemma Borrowing Governance Adaptation v1 — Roadmap

## Goal
- 将 Analemma/FARS 的可借鉴机制沉淀为本仓库可执行治理任务包（文档与治理映射先行），并输出后续前后端联动调整方案。

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: (none)
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/analemma-borrowing-governance-v1/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | chat (2026-02-23) | 任务边界、映射、交付深度 | highest | 明确要求新建 `T-005` + 完整 bundle |
| Existing governance contract | `.ai/project/main/registry.yaml`, `.ai/project/CONTRACT.md` | ID/status/registry consistency | high | 必须遵循 contract 枚举与约束 |
| Existing anti-drift contract | `dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md` | 单写者边界与反漂移规则 | high | `T-005` 不重写 `T-002/T-003` 主权内容 |
| Existing interface baseline | `dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md` | 增量接口草案参考 | high | `08-interface-delta-spec.md` 仅做增量 |
| Model inference | N/A | 结构化文档组织与 phase 编排 | lowest | 不覆盖用户显式决策 |

## Non-goals
- 不实施前后端功能代码，不修改业务接口实现。
- 不改写 `T-002` 模块清单 SSOT 与 `T-003` 阶段治理 SSOT。
- 不定义新的非 LLM 研究方向默认策略。
- 不在本任务落地 UI 页面或数据库迁移。

## Open questions and assumptions
### Open questions (answer before execution)
- 无。

### Assumptions (if unanswered)
- A1: 本任务状态采用 `in-progress` 并在后续实现任务完成后再归档。 (risk: low)
- A2: 后续联动执行拆分为独立任务（建议 `T-006`、`T-007`），不在 `T-005` 内实施。 (risk: low)

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | Task placement | 并入 `T-003` vs 新建任务 | 新建 `T-005` | 用户显式确认 | 在 `F-001` 下新增 `R-003` |
| C2 | Requirement mapping | 复用 `R-001` vs 新建 requirement | 新建 `R-003` | 用户显式确认 | 更新 registry + sync/lint |
| C3 | Scope breadth | 立即前后端改造 vs 文档先行 | 文档先行，输出联动方案 | 用户显式确认 | 后续拆分实现任务 |

## Scope and impact
- Affected areas/modules:
  - `.ai/project/main/registry.yaml`
  - `.ai/project/main/{dashboard.md,feature-map.md,task-index.md}` (generated)
  - `dev-docs/active/analemma-borrowing-governance-v1/*`
- External interfaces/APIs:
  - 仅新增文档草案，不变更现网 API。
- Data/storage impact:
  - 无持久层结构变更。
- Backward compatibility:
  - 与现有 `T-003` 接口契约兼容，采用“字段可空 + 增量发布”原则。

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
  - `.ai/project/main/registry.yaml`
  - `.ai/project/main/feature-map.md`
  - `.ai/project/main/task-index.md`
  - `.ai/project/main/dashboard.md`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions (landing points) (may be empty)
- New module(s) (preferred):
  - `dev-docs/active/analemma-borrowing-governance-v1/`
- New interface(s)/API(s) (when relevant):
  - 文档层增量草案：timeline/resource-metrics/artifact-bundle/release-gate
- New file(s) (optional):
  - `.ai-task.yaml`, `roadmap.md`, `00~08` 文档

## Phases
1. **Phase 1**: Roadmap and bundle skeleton
   - Deliverable: `roadmap.md` + `00~05` + `.ai-task.yaml`
   - Acceptance criteria: 文档结构完整，状态字段有效，内容与边界一致。
2. **Phase 2**: Borrowing adaptation specs
   - Deliverable: `06-borrowing-matrix.md`, `07-integration-adjustment-plan.md`, `08-interface-delta-spec.md`
   - Acceptance criteria: 覆盖 8 类借鉴项，含 owner/value gate/interface 增量。
3. **Phase 3**: Governance mapping and verification
   - Deliverable: `R-003/T-005` 注册完成，sync/lint 通过，生成视图更新。
   - Acceptance criteria: registry、feature-map、task-index、dashboard 一致且可查询。

## Step-by-step plan (phased)
> Keep each step small, verifiable, and reversible.

### Phase 0 — Discovery
- Objective: 确认现有任务边界、状态枚举、治理同步命令。
- Deliverables:
  - 边界基线：`T-002/T-003` 单写者契约引用
  - 映射基线：`F-001/R-001` 现状
- Verification:
  - 能定位 `.ai/project/CONTRACT.md` + `06-task-boundary-and-anti-drift.md`
- Rollback:
  - N/A

### Phase 1 — Bundle creation
- Objective:
  - 创建 `T-005` 完整任务包并填充可执行内容。
- Deliverables:
  - `.ai-task.yaml`
  - `roadmap.md`
  - `00~05` 核心文档
- Verification:
  - `find dev-docs/active/analemma-borrowing-governance-v1 -maxdepth 1 -type f | sort`
- Rollback:
  - 删除 `dev-docs/active/analemma-borrowing-governance-v1/` 并回退 registry 修改。

### Phase 2 — Borrowing adaptation completion
- Objective:
  - 将 8 类借鉴项落成矩阵、联动方案、接口增量草案。
- Deliverables:
  - `06-borrowing-matrix.md`
  - `07-integration-adjustment-plan.md`
  - `08-interface-delta-spec.md`
- Verification:
  - `rg -n "B-0[1-8]|GET /paper-projects/:id/timeline|research.node.status.changed" dev-docs/active/analemma-borrowing-governance-v1`
- Rollback:
  - 保留 `00~05`，冻结/移除 `06~08`。

### Phase 3 — Governance mapping and checks
- Objective:
  - 新增 `R-003/T-005` 并完成项目治理一致性检查。
- Deliverables:
  - `registry.yaml` requirement/task 新条目
  - sync 后的 derived views 更新
- Verification:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Rollback:
  - 从 registry 撤回 `R-003/T-005`，重跑 sync 恢复派生视图。

## Verification and acceptance criteria
- Build/typecheck:
  - N/A（文档任务）
- Automated tests:
  - 治理命令：`sync + lint` 通过
- Manual checks:
  - 抽样检查 `01-plan.md` 3 个步骤具备输入/输出/验收
  - 交叉检查 `08-interface-delta-spec.md` 未覆盖既有契约主权
- Acceptance criteria:
  - `T-005` 完整 task bundle（`roadmap + 00~08 + .ai-task.yaml`）已落盘
  - `R-003/T-005` 已挂到 `F-001/M-001`
  - 8 类借鉴项均有落点、门禁、owner、字段映射
  - rollback 策略可执行且已文档化

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 与 `T-002/T-003` 边界冲突 | med | high | 引用单写者契约，`T-005` 仅增量适配 | 关键字交叉扫描 + 人工复核 | 冻结 `06~08` 并回退冲突段落 |
| 接口增量与现有契约冲突 | med | high | `08-interface-delta-spec` 仅增量、字段可空 | 对照 `08-interface-field-contracts.md` | 回退增量段落并记录待决议 |
| 治理映射漂移 | low | med | 执行 `sync + lint` 并记录证据 | lint error/warn | 撤回 registry 新增并重跑 sync |

## Optional detailed documentation layout (convention)
If you maintain a detailed dev documentation bundle for the task, the repository convention is:

```text
dev-docs/active/analemma-borrowing-governance-v1/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
  06-borrowing-matrix.md
  07-integration-adjustment-plan.md
  08-interface-delta-spec.md
```

## To-dos
- [x] Confirm planning-mode signal handling and fallback record
- [x] Confirm input sources and trust levels
- [x] Confirm merge decisions and conflict log entries
- [x] Confirm open questions
- [x] Confirm phase ordering and DoD
- [x] Confirm verification/acceptance criteria
- [x] Confirm rollout/rollback strategy
