# 02 Architecture

## Purpose
- 固定 research-argument domain 的 SSOT 落点、术语边界与 shared contract surface，避免后续 runtime 任务重复定义。

## Canonical landing points
- `docs/project/architecture/research-argument-framework.md`
- `docs/project/architecture/research-argument-data-schema.md`
- `docs/project/architecture/research-argument-planner-spec.md`
- `docs/project/product/research-argument-control-plane-ui.md`

## Context / glossary scope
- `docs/context/glossary.json`
  - `AbstractState`
  - `ArgumentObjectGraph`
  - `WorthContinuing`
  - `ReadyForWritingEntry`
  - `CriticHub`
  - `RuleEngine`
  - `WritingEntryPacket`
  - `SubmissionRiskReport`
  - `Decision`
  - `Lesson`
- 如需新增 architecture/context artifact，必须同步 `docs/context/registry.json`。

## Shared contract boundaries
- research-argument contract 只定义 domain interfaces，不定义具体 storage 细节。
- 与 `title-card-management-contracts` 的关系：
  - 读取并桥接上游对象
  - 不复制 `title-card` DTO
- 与 `paper-project-contracts` 的关系：
  - 产出 readiness / bridge 结果
  - 产出 `SubmissionRiskReport` 与 `WritingEntryPacket` sidecar contracts
  - 不重写 downstream writing / stage-gate DTO

## Shared contract groups
- Domain:
  - workspace / branch / claim / evidence / baseline / protocol / repro / run / artifact / boundary / decision / lesson
- Read-model:
  - `WorkspaceSummary`
  - `AbstractStateSnapshot`
  - `ClaimEvidenceCoverageRow`
  - `ProtocolBaselineReproReadiness`
  - `DecisionTimelineEntry`
  - `ActionQueueItem`
  - `ReportPointer`
- Bridge/workflow:
  - `SeedWorkspaceFromTitleCardRequest` / `Response`
  - `ReadinessVerifyRequest` / `Response`
  - `DecisionActionRequest` / `Response`
  - `PromoteToPaperProjectRequest` / `Response`
- Advisory/report:
  - `PlannerCandidate`
  - `PlannerBundle`
  - `CriticFinding`
  - `RuleFinding`
  - `SubmissionRiskFinding`
  - `SubmissionRiskReport`
  - `WritingEntryPacket`
  - `AsyncTaskRecord`

## Requirements mapping rule
- 每份 canonical doc 必须新增一节，说明其覆盖的 requirement/journey slice。
- shared contracts 必须显式覆盖：
  - `Claim / Evidence / Baseline / Protocol / ReproItem`
  - readiness decision
  - risk report projection
  - writing handoff packet

## Canonical doc contract rule
- 每份 canonical doc 必须包含：
  - owned requirement/journey slice
  - upstream inputs
  - exported nouns / interfaces
  - downstream consumers
  - explicit out-of-scope / deferred items

## Implemented export surface
- 公开 contract entrypoint:
  - `packages/shared/src/research-lifecycle/research-argument-contracts.ts`
- 内部 slice:
  - `research-argument-domain-contracts.ts`
  - `research-argument-read-model-contracts.ts`
  - `research-argument-bridge-contracts.ts`
  - `research-argument-advisory-contracts.ts`
- 公开根对象固定为：
  - `ResearchArgumentWorkspace`
  - `workspace_id`
- intake 文档中的 `Project / project_id` 只保留为 source language，不进入公开合同。

## Non-runtime rule
- 本任务可以编辑 docs/context 和 shared contract files。
- 本任务不落 backend repository/service/UI 代码。
