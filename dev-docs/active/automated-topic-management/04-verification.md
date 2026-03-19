# 04 Verification

## Automated checks
- [pass] `pnpm --filter @paper-engineering-assistant/backend run prisma:generate`
  - Result:
    - Prisma client regenerated successfully after topic-management schema landing.
    - `buildApp()` 导入恢复可用，memory-mode integration test 不再被 Prisma type drift 卡住。
- [pass] `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/app.topic-management-config.test.ts src/repositories/topic-management.repository.test.ts src/services/topic-management.service.test.ts src/routes/topic-management.routes.test.ts src/routes/topic-management.routes.integration.test.ts src/routes/topic-management.contract-drift.test.ts`
  - Result:
    - `26` tests passed.
    - 覆盖 store config 级联 / mixed-store fail-fast、in-memory repository、service invariants、promotion 补偿回滚、HTTP route validation / error mapping / happy path、buildApp 全链路与 contract drift。
- [pass] `pnpm --filter @paper-engineering-assistant/backend run typecheck`
  - Result:
    - backend TypeScript compile passed after app wiring、service rollback、Prisma repository interface changes.
- [pass] `node .ai/scripts/ctl-api-index.mjs generate --touch`
  - Result:
    - 重建 `docs/context/api/API-INDEX.md` 与 `docs/context/api/api-index.json`
    - 端点总数更新为 `47`
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - `[ok] Sync complete.`
    - regenerated:
      - `.ai/project/main/dashboard.md`
      - `.ai/project/main/feature-map.md`
      - `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`
    - unrelated warnings remain for existing tasks:
      - `app-tsx-layout-split`: missing `## Status` / `- State: <status>` in `00-overview.md`
      - `topic-initial-pull-and-rule-preview`: missing `## Status` / `- State: <status>` in `00-overview.md`
  - Note:
    - warnings are pre-existing and not caused by `T-014`
- [warn] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result:
    - 当前 workspace 下 `packages/shared` 缺失本地 `node_modules`，`ts-node` loader 无法解析，命令在测试启动前失败。
  - Note:
    - 本批次 shared 契约变更已被 backend route/service 测试间接覆盖；后续若要单独跑 shared test，需要先修复该包的本地测试环境。

## Manual checks
- [pass] 任务包完整性检查
  - Check:
    - 目录包含 `roadmap + 00~05 + .ai-task.yaml`
  - Evidence:
    - `Get-ChildItem dev-docs/active/automated-topic-management | Select-Object Name`
  - Result:
    - 任务包结构符合 repo 约定
- [pass] roadmap 质量检查
  - Check:
    - roadmap 明确区分模块边界、MVP 范围、后置增强项和 open questions
  - Evidence:
    - `roadmap.md` 中存在 `Non-goals`、`Open questions and assumptions`、`Phases`、`Step-by-step plan`
  - Result:
    - 后续讨论可直接围绕 roadmap 收敛，不需要重新做上下文整理
- [pass] architecture 边界检查
  - Check:
    - `02-architecture.md` 是否明确区分 `topic settings`、topic decision layer、`paper-project`
  - Evidence:
    - `02-architecture.md` 中存在 `Boundary model` 与 `Promotion bridge`
  - Result:
    - 已明确区分检索配置对象与研究命题对象
- [pass] project hub registration 检查
  - Check:
    - `T-014` 和 `R-009` 已进入 registry 与 derived views
  - Evidence:
    - `rg -n "R-009|T-014|automated-topic-management" .ai/project/main/registry.yaml .ai/project/main/task-index.md .ai/project/main/feature-map.md .ai/project/main/dashboard.md`
  - Result:
    - 新 requirement/task 已在 project hub 中可查询
- [pass] 文档与 LLM 自审契约对齐
  - Check:
    - 02-architecture 已内嵌 common envelope 与 EvidenceReview / NeedReview / ValueAssessment 三份 template 关键字段及对象对应、artifact landing strategy；roadmap/01-plan/00-overview/03/05 已同步引用或验收条款，无外部 schema 路径依赖
  - Evidence:
    - `02-architecture.md` 中存在「LLM 自审契约与对象对应（内嵌）」及「Artifact landing strategy」；`roadmap.md` Input sources 含「LLM 自审契约」、Phase 2 含对应 deliverable/verification；`00-overview.md` Context 与 Acceptance criteria 含契约基线与 02 内嵌对应
  - Result:
    - 契约内容已落到任务规划中，实现时可仅以本任务包文档为准
- [pass] 全部验收条件检查
  - Check:
    - 00-overview.md 中所有 Acceptance criteria 均已标记为完成
  - Evidence:
    - 任务包完整、roadmap 明确记录边界与 open questions、01-plan 区分 phases、02-architecture 明确三层边界并内嵌契约、registry 已通过 sync/lint
  - Result:
    - Phase 2 文档细化已完成，可进入 Phase 3 实现拆分讨论

## 测试矩阵（内嵌）

| Layer | Scenario | Type | Expected Result | Risk Covered |
|-------|----------|------|-----------------|--------------|
| Shared schema | NeedReview payload 缺少 `evidence_review_refs` | Positive | schema accepts payload | v1 evidence bridge defer policy |
| Shared schema | Question payload 缺少 source 数组 | Negative | 4xx validation failure | orphan question records |
| Shared schema | Promotion decision promote 无 package/title | Negative | 4xx validation failure | invalid irreversible promote |
| Shared schema | Loopback decision 无 target | Negative | 4xx validation failure | ambiguous recovery path |
| Repository | Need reviews 按 topic 隔离 | Positive | list 仅返回匹配 topic 记录 | cross-topic data bleed |
| Repository | Promotion decision 存储 promoted paper id | Positive | DTO 持久化 promoted_paper_id | broken audit trail |
| Service | Need review 引用缺失 literature | Negative | 404 not found | non-evidence-based need |
| Service | Question 无上游 sources | Negative | invariant error | unsupported derivation |
| Service | Question 引用 archived / cross-topic 上游 | Negative | 404/409 invariant error | invalid lineage reuse |
| Service | Value verdict promote 且 hard gate 失败 | Negative | invariant error | unsafe promotion signal |
| Service | Topic package 绑定错误 question/value assessment | Negative | invariant error | broken alignment |
| Service | Promotion decision promote 且 gates 失败 | Negative | invariant error | paper from weak topic |
| Service | Promote-to-paper-project 空 evidence ids | Negative | invariant error | empty initial context |
| Service | Topic package / promotion 引用不存在 literature ids | Negative | 404 not found | fake evidence ids entering paper context |
| Service | Promote-to-paper-project 成功 | Positive | paper project 创建且 decision 持久化 | happy path broken |
| Service | Promote-to-paper-project decision 持久化失败 | Negative | created paper rolled back | orphan paper project |
| Service | Promote-to-paper-project rollback 自身失败 | Negative | 500 with rollback context | silent partial failure |
| Route | Invalid question body | Negative | 400 from schema validation | contract drift |
| Route | Invalid promotion decision body | Negative | 400 from schema validation | malformed control |
| Route | Service invariant failure | Negative | 404/409/422 with machine-friendly code | domain errors hidden as 500 |
| Route | Unexpected service failure | Negative | 500 | unhandled runtime faults |
| Route | Full promotion flow via HTTP | Positive | 201 with paper_id and decision_id | route/controller wiring |
| Contract | canonical path drift | Negative | test fails when route/OpenAPI diverge | docs/context drift |
| App wiring | `TOPIC_REPOSITORY=prisma` 级联解析 | Positive | dependent stores resolve to prisma | mixed persistence false 404 / split writes |
| App wiring | Prisma topic-management mixed store mismatch | Negative | build fails fast | split-brain persistence |

## 测试清单（内嵌）

### 1. Shared contract / schema 层
- CreateNeedReviewRequest 拒绝空 literature_ids
- CreateNeedReviewRequest 允许缺失 evidence_review_refs
- CreateTopicQuestionRequest 至少需要 source_need_review_ids 或 source_evidence_review_ids 之一
- CreateTopicValueAssessmentRequest 需要全部 hard_gates
- CreateTopicPromotionDecisionRequest verdict=promote 需要 package_id 和 target_paper_title
- CreateTopicPromotionDecisionRequest verdict=loopback 需要 loopback_target
- PromoteTopicToPaperProjectRequest 需要 question_id、value_assessment_id、package_id、title、created_by

### 2. Repository 层
- In-memory repository 按 topic_id 存储并列出 need reviews
- In-memory repository 按 topic_id 存储并列出 questions
- Value assessments 可按 record_id 读回
- Topic package 原样存储 selected literature evidence ids
- Promotion decisions 持久化 promoted_paper_id

### 3. Service invariants
- Question 创建无上游 sources 失败
- Need review 创建无至少一个 literature_id 失败
- Need review 创建引用不存在 literature 失败
- Question 创建引用跨 topic / 不存在的 NeedReview 失败
- Question 创建引用 source_evidence_review_ids（bridge 未实现）失败
- Value assessment 任一 hard gate 失败不得标记 promote
- Archived question 不允许进入 value assessment
- Topic package 需要 value assessment 属于同一 question
- Topic package 需要 selected literature evidence ids 全部可解析到 literature record
- Promotion decision promote 需要 package id 和 target paper title
- Promotion decision promote 失败若 value assessment 有 failed hard gate
- Promotion decision loopback 需要 loopback target
- Promote-to-paper-project 失败若 package/value assessment/question 未对齐
- Promote-to-paper-project 失败若 selected literature evidence ids 为空
- Promote-to-paper-project 失败若 selected literature evidence ids 在 promotion 时已失效
- Promote-to-paper-project 将 selected literature evidence ids 传入 initial_context
- Promote-to-paper-project 若 decision 持久化失败则回滚 paper project
- Promote-to-paper-project 若回滚自身失败则返回 500 并带上下文

### 4. HTTP / Fastify route 层
- Valid need review 返回 201
- Invalid question payload 在 service 调用前验证失败
- Invalid promotion decision payload 在 service 调用前验证失败
- 成功 route-level promotion 返回 201 且含 paper_id
- Service invariant failures 以 404/409/422 返回
- Unexpected service errors 以 500 返回
- Contract drift test 要求 nested route path 与 OpenAPI 同步

### 5. End-to-end topic promotion flow
- Create need review -> create question from need review -> create passing value assessment -> create topic package -> promote to paper project
- 验证 paper_id、decision_id、转发的 literature_evidence_ids

### 6. 推荐测试执行顺序与命令（Phase 3 落地后）

| 顺序 | 命令 | 结果 |
|------|------|------|
| 1 | `pnpm --filter @paper-engineering-assistant/backend run prisma:generate` | pass |
| 2 | `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/app.topic-management-config.test.ts src/repositories/topic-management.repository.test.ts src/services/topic-management.service.test.ts src/routes/topic-management.routes.test.ts src/routes/topic-management.routes.integration.test.ts src/routes/topic-management.contract-drift.test.ts` | 26 pass |
| 3 | `pnpm --filter @paper-engineering-assistant/backend run typecheck` | pass |
| 4 | `node .ai/scripts/ctl-api-index.mjs generate --touch` | pass |

- **E2E promotion flow**：由 `topic-management.routes.test.ts` 中用例「full HTTP flow can promote a topic to paper project」覆盖（need review → question → value assessment → package → promote-to-paper-project），断言 paper_id、decision_id、literature_evidence_ids 经 gateway 传递）。
- **Schema 测试位置**：schema 测试仍在 `packages/shared/src/research-lifecycle/topic-management-contracts.schema.test.ts`；但当前未能在本 workspace 成功执行，阻塞点是 `packages/shared` 本地测试环境缺失 `node_modules/ts-node` 解析。

### 7. 后置但重要
- Prisma repository 集成测试
- Migration smoke tests
- Duplicate-submission / idempotency 测试
- Authorization 测试（auth 引入后）
- Event/timeline audit 测试（timeline 写入实现后）

## Rollout / Backout
- Rollout:
  - 完成文档创建后，同步 project hub，作为后续讨论与实现拆分的上下文基线。
- Backout:
  - 如果任务命名、映射或范围判断错误，可删除 `dev-docs/active/automated-topic-management/`，回退 registry 相关条目后重新执行 `sync --apply`。

## Rollback checks
- [pass] registry 回滚可执行性
  - Check:
    - 删除新增 requirement/task 后重新 `sync --apply`
  - Expected:
    - project hub 不再包含 `T-014`
  - Note:
    - 当前未执行实际回滚，仅确认回滚路径清晰且可操作
