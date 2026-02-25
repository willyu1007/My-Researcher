# 文献管理流程梳理与落地 — Roadmap

## Goal
- 明确并固化 M1「文献管理」端到端流程（检索/导入/去重/标注/引用联动），并产出可直接进入实现阶段的完整任务包。

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: `docs/project/overview/requirements.md`, `docs/project/overview/domain-glossary.md`, `dev-docs/archive/paper-assistant-core-modules/06-task-packages.md`
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/literature-management-flow/roadmap.md`
- Mode fallback used: non-Plan default applied: no

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | chat | 目标与交付形式（梳理流程 + 完整任务包） | highest | 本次直接按计划产物落盘 |
| Requirements doc | `docs/project/overview/requirements.md` | M0/M1 检索、去重、RAG、授权边界 | high | 作为功能与边界主约束 |
| Domain glossary | `docs/project/overview/domain-glossary.md` | 术语统一（Literature Registry / Abstract-level RAG） | high | 作为数据模型命名基线 |
| Existing task package | `dev-docs/archive/paper-assistant-core-modules/06-task-packages.md` | TP-01 目标/DoD/依赖关系 | medium | 作为模块优先级输入 |
| Current code reality | `apps/backend/src/services/research-lifecycle-service.ts`, `packages/shared/src/research-lifecycle/interface-field-contracts.ts`, `prisma/schema.prisma` | 现状差距识别 | medium | 已存在 project 创建时 evidence id 最小校验 |
| Model inference | N/A | 填补实现顺序与 UIUX 协同细节 | lowest | 仅用于未定实现细节 |

## Non-goals
- 本任务不直接实现后端 API、数据库表或桌面功能代码。
- 本任务不覆盖 M2~M8 的完整业务逻辑，只定义与文献管理的接口边界。
- 本任务不引入团队级共享知识库与跨用户全文复用能力。

## Open questions and assumptions
### Open questions (answer before execution)
- (none)

### Assumptions (if unanswered)
- A1: M0 首批外部检索源固定 `Crossref + arXiv`，其他源延后 (risk: low)
- A2: 引用状态联动采用单向链路：选题范围 -> 论文管理可写 -> 写作中心只读 (risk: low)
- A3: M0 的 PDF 仅导入元数据/摘要，不做全文索引与全文向量化 (risk: low)

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | M0 检索形态 | “快速上全文” vs “摘要级 RAG + 来源可追溯” | 采用摘要级 RAG，全文能力放 M1 | requirements.md 明确约束 | M1 再补全文策略 |
| C2 | 现有入口约束 | 仅 `literature_evidence_ids` 校验 vs 完整文献注册表 | 保留现有校验并扩展为 registry 驱动 | 用户目标为流程梳理 + 完整任务包 | 执行期补实体映射 |

## Scope and impact
- Affected areas/modules: `apps/backend`（routes/services/repositories）, `packages/shared`（contracts）, `prisma`（schema）, `apps/desktop`（文献管理面板）
- External interfaces/APIs: 外部文献源（Crossref/arXiv 等）与本地 PDF 导入能力
- Data/storage impact: 新增文献注册表、来源追溯、去重键与论文关联关系
- Backward compatibility: 兼容当前 paper project 创建逻辑，新增字段/接口采用增量扩展

## Consistency baseline for dual artifacts (if applicable)
- [x] Goal is semantically aligned with host plan artifact
- [x] Boundaries/non-goals are aligned
- [x] Constraints are aligned
- [x] Milestones/phases ordering is aligned
- [x] Acceptance criteria are aligned
- Intentional divergences:
  - (none)

## Project structure change preview (may be empty)
This section is a **non-binding, early hypothesis** to help humans confirm expected project-structure impact.

### Existing areas likely to change (may be empty)
- Modify:
  - `apps/backend/src/routes/`
  - `apps/backend/src/services/`
  - `apps/backend/src/repositories/`
  - `packages/shared/src/research-lifecycle/`
  - `prisma/`
  - `apps/desktop/src/renderer/`
  - `docs/context/api/`
- Delete:
  - (none)
- Move/Rename:
  - (none)

### New additions (landing points) (may be empty)
- New module(s) (preferred):
  - `apps/backend/src/modules/literature/`（候选）
- New interface(s)/API(s) (when relevant):
  - `POST /literature/search`
  - `POST /literature/import`
  - `POST /paper-projects/:id/literature-links`
  - `GET /paper-projects/:id/literature`
- New file(s) (optional):
  - `apps/desktop/src/renderer/features/literature/*`（候选）

## Phases
1. **Phase 1**: 业务流程与契约定稿
   - Deliverable: 文献管理流程图、状态机、实体与接口契约草案
   - Acceptance criteria: 对检索/导入/去重/标注/引用联动流程达成单一口径
2. **Phase 2**: 后端与数据层落地
   - Deliverable: registry 数据模型、API、去重与来源追溯能力
   - Acceptance criteria: 可稳定导入与去重，并可按项目查询文献台账
3. **Phase 3**: 桌面端流程接入
   - Deliverable: 文献管理面板与论文/选题入口联动
   - Acceptance criteria: 用户可从文献管理完成筛选并挂载到论文项目
4. **Phase 4**: 验证与发布准备
   - Deliverable: 自动化与人工验证记录、回滚策略
   - Acceptance criteria: 关键路径通过，回归风险可控

## Step-by-step plan (phased)
> Keep each step small, verifiable, and reversible.

### Phase 0 — Discovery
- Objective: 校准现有实现与目标流程差距，冻结范围边界
- Deliverables:
  - 文献管理现状盘点（已有/缺失）
  - 关键开放问题清单
- Verification:
  - 范围、非目标、依赖关系在任务包中明确
- Rollback:
  - N/A (no code changes)

### Phase 1 — 流程与契约定稿
- Objective:
  - 定义端到端流程与状态转移
  - 定义实体与接口契约
- Deliverables:
  - `02-architecture.md` 流程与边界
  - API/Schema 草案
- Verification:
  - 每个流程节点都有输入/输出与失败处理
- Rollback:
  - 回退到文档变更前版本，不影响代码

### Phase 2 — 后端与数据层实现
- Objective:
  - 建立文献注册表、去重策略、来源追溯
- Deliverables:
  - Prisma schema 迁移
  - backend routes/services/repositories 增量实现
  - shared contracts 更新
- Verification:
  - 类型检查、单测、导入/去重 smoke case 通过
- Rollback:
  - 迁移可逆；接口保留向后兼容路径

### Phase 3 — 桌面端接入
- Objective:
  - 让文献管理成为论文管理与选题管理的统一上游入口
- Deliverables:
  - 文献管理 UI 入口
  - 文献筛选/挂载到 paper project 的交互链路
- Verification:
  - 手工验证「检索 -> 选中 -> 关联论文」闭环
- Rollback:
  - 通过 feature flag 或入口降级到只读态

### Phase 4 — 验证与交接
- Objective:
  - 固化验收证据与运行手册
- Deliverables:
  - `04-verification.md` 完整记录
  - 风险与回滚清单
- Verification:
  - 构建、类型检查、核心 smoke tests 全通过
- Rollback:
  - 发布前失败直接回退到上一稳定构建

## Verification and acceptance criteria
- Build/typecheck:
  - `pnpm typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm desktop:typecheck`
- Automated tests:
  - `pnpm --filter @paper-engineering-assistant/backend test`
  - `pnpm ci:prisma-smoke`
- Manual checks:
  - 新建论文项目时可从文献管理选择并绑定 evidence
  - 同一文献重复导入命中去重而非重复入库
  - RAG/摘要输出包含 `paper_id + source_url + source_anchor`
- Acceptance criteria:
  - 文献管理流程节点输入/输出清晰且可追溯
  - 文献去重稳定可复现
  - 文献与论文/选题关系可查询、可回溯
  - 不触发 `RESTRICTED` 内容错误同步

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 去重键冲突导致误合并 | medium | high | DOI/arXiv/title-author-year 多级回退 + 人工确认入口 | 重复率与误合并日志报警 | 回退到上个 schema + 恢复误合并记录 |
| 外部源不稳定 | high | medium | 查询缓存 + 多源回退 + 限流重试 | 429/5xx 指标上升 | 切换到缓存只读模式 |
| 文献与论文映射不一致 | medium | high | 事务化写入与幂等键 | 关联表完整性检查失败 | 回滚最近批次关联变更 |
| 深色/浅色 UI 可读性回归 | medium | medium | token 驱动与视觉验收矩阵 | 回归截图对比失败 | 回退主题相关样式变更 |

## Optional detailed documentation layout (convention)
If you maintain a detailed dev documentation bundle for the task, the repository convention is:

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

Suggested mapping:
- The roadmap's **Goal/Non-goals/Scope** → `00-overview.md`
- The roadmap's **Phases** → `01-plan.md`
- The roadmap's **Architecture direction (high level)** → `02-architecture.md`
- Decisions/deviations during execution → `03-implementation-notes.md`
- The roadmap's **Verification** → `04-verification.md`

## To-dos
- [x] Confirm planning-mode signal handling and fallback record
- [x] Confirm input sources and trust levels
- [x] Confirm merge decisions and conflict log entries
- [x] Confirm open questions
- [x] Confirm phase ordering and DoD
- [x] Confirm verification/acceptance criteria
- [x] Confirm rollout/rollback strategy
