# 01 Plan

## Phases
1. 任务包初始化与治理映射
2. 领域边界与对象模型收敛
3. MVP 执行方案拆分
4. 后续增强路线与验证策略固化

## Detailed steps
- Step 1: 创建 `T-014` 任务目录、`.ai-task.yaml`、`roadmap.md`、`00~05`。
- Step 2: 在 `roadmap.md` 中固化三层边界：
  - `topic settings` 负责检索配置
  - topic decision layer 负责 `need/question/value/promotion`
  - `paper-project` 负责执行态论文生命周期
- Step 3: 在 `02-architecture.md` 中定义 MVP 核心对象，并内嵌 LLM 自审契约与对象对应：
  - `EvidenceMap-core`、`ValidatedNeed`、`TopicQuestion`、`TopicValueAssessment`、`TopicPackage`、`TopicPromotionDecision`
  - common envelope 必填字段及 EvidenceReview / NeedReview / ValueAssessment 三份 template 关键字段（见 02-architecture「LLM 自审契约与对象对应」）
  - 对象与三份 template 的字段级对应表及 artifact landing strategy（Phase 1 存 EvidenceReview 于 LiteraturePipelineArtifact.payload，NeedReview/ValueAssessment 为 topic-level artifact；Phase 2 可晋升为一类表）
- Step 4: 明确 MVP 收敛策略：
  - 先打通 `EvidenceMap-core -> ValidatedNeed -> TopicQuestion -> TopicValueAssessment -> Promotion`
  - 将 `EvidenceMap` 图谱增强、多角色评审、portfolio 管理后置
- Step 5: 产出实现拆分方向（见 02-architecture「后端契约与实现基线」）：
  - Shared contracts（topic-management-contracts.ts）-> 导出并更新 research-lifecycle index
  - In-memory repository -> 再 Prisma repository
  - Service invariants（hard-gate 强制、promotion 约束）
  - Routes + controller（Fastify 注册，schema 来自 shared）
  - Happy-path 测试 -> 完整测试矩阵（见 04-verification）
- Step 6: 更新 `.ai/project/main/registry.yaml`，新增 requirement 与 task 映射。
- Step 7: 执行治理命令并把结果记录到 `04-verification.md`：
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Deliverables by phase
- Phase 1:
  - `.ai-task.yaml`
  - `roadmap.md`
  - `00-overview.md`
  - `01-plan.md`
  - `02-architecture.md`
  - `03-implementation-notes.md`
  - `04-verification.md`
  - `05-pitfalls.md`
- Phase 2:
  - 对象边界、状态流转、promotion 约束
  - 对象与 EvidenceReview / NeedReview / ValueAssessment 的字段级对应表及 common envelope 要求（已写入 02-architecture，无外部路径引用）
- Phase 3:
  - 后续实现任务拆分建议
  - 推荐实现顺序：1) Shared contracts 2) In-memory repository 3) Service invariants 4) Routes + controller 5) Happy-path 测试 6) Prisma repository 7) SQL-to-Prisma 对账
- Phase 4:
  - Enhancement backlog 与验证路线

## Risks & mitigations
- Risk: 讨论阶段就把模块范围拉到完整图谱与多 agent 编排。
  - Mitigation: 强制区分 `EvidenceMap-core` 与图谱增强，后者不进入 MVP。
- Risk: 讨论阶段把 `EvidenceMap` 整体排除出 MVP，导致流程无法闭环。
  - Mitigation: 在 Phase 2 先定义 `EvidenceMap-core` 的最小合同与 refresh/recheck 回路。
- Risk: 新中间层与现有 `topic settings` 发生语义重叠。
  - Mitigation: 在 architecture 中把 profile/settings 与 question/package 分层建模。
- Risk: promotion 讨论脱离现有 `paper-project` 契约。
  - Mitigation: 先对照现有 `createPaperProject` 输入做 bridge mapping。
- Risk: 任务治理未登记导致后续多轮讨论失去连续性。
  - Mitigation: 立即同步 project hub 并通过 lint 校验。

## Acceptance criteria (step-level)
- 每一步都必须具备：
  - 清晰输入来源
  - 可交付输出
  - 具体验收方式
- 后续实现拆分必须能回答：
  - 哪些属于 MVP
  - 哪些必须后置
  - 哪些需要人工拍板后才能开始
