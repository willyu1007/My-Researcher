# 01 Plan

## Phases
1. Source mapping and canonical file selection
2. Architecture / product docs landing
3. Shared TS contracts and context glossary
4. Verification and handoff

## Detailed steps
- Phase 1:
  - 为 `research-varify` 四份输入建立 source-to-target 对照表。
  - 固定 canonical 落点，避免后续重复建文档。
- Phase 2:
  - 落 framework / data schema / planner / control plane 四份正式文档。
  - 为每份 canonical 文档补 `requirements.md` 映射章节。
  - 在相关 existing docs 中补 cross-link，而不是复制内容。
- Phase 3:
  - 新增 research-argument shared contracts：
    - domain objects:
      - `ResearchArgumentWorkspace`
      - `ResearchBranch`
      - `Problem`
      - `ValueHypothesis`
      - `ContributionDelta`
      - `DimensionState`
      - `AbstractState`
      - `Claim`
      - `EvidenceRequirement`
      - `EvidenceItem`
      - `BaselineSet`
      - `Protocol`
      - `ReproItem`
      - `Run`
      - `Artifact`
      - `Boundary`
      - `AnalysisFinding`
      - `IssueFinding`
      - `ReportProjection`
      - `DecisionRecord`
      - `LessonRecord`
      - `ReadinessDecision`
    - read-model / projection DTOs:
      - `WorkspaceSummary`
      - `AbstractStateSnapshot`
      - `ClaimEvidenceCoverageRow`
      - `ProtocolBaselineReproReadiness`
      - `DecisionTimelineEntry`
      - `ActionQueueItem`
      - `ReportPointer`
    - bridge / workflow DTOs:
      - `SeedWorkspaceFromTitleCardRequest`
      - `SeedWorkspaceFromTitleCardResponse`
      - `ReadinessVerifyRequest`
      - `ReadinessVerifyResponse`
      - `DecisionActionRequest`
      - `DecisionActionResponse`
      - `PromoteToPaperProjectRequest`
      - `PromoteToPaperProjectResponse`
      - `WritingEntryPacket`
      - `SubmissionRiskReport`
    - planner / report / async DTOs:
      - `PlannerAction`
      - `PlannerBundle`
      - `PlannerCandidate`
      - `CriticFinding`
      - `RuleFinding`
      - `SubmissionRiskFinding`
      - `AsyncTaskRecord`
  - 更新 glossary/context registry。
- Phase 4:
  - 执行 context verify、governance sync/lint，并记录 handoff。

## Entry criteria
- umbrella `T-023` 的 ownership split 与 coverage boundary 已冻结。
- `research-varify` 输入源、`requirements.md`、现有 `title-card` / `paper-project` 合同都已完成对照。

## Exit review before `T-025`
- canonical docs 落点、命名和 cross-link 已固定。
- shared contracts 已按 `domain / read-model / bridge / advisory` 四组收口。
- glossary / registry 已补齐 research-argument 名词，不存在待定命名冲突。
- 所有 deferred item 都已明确 owner，不允许留“后续再说”的隐性空白。

## Deliverables
- Canonical docs
- Shared TS contracts
- Glossary/context deltas
- Requirements mapping
- Verification record
