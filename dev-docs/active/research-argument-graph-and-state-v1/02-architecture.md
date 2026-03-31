# 02 Architecture

## V1 object minimum
- `ResearchArgumentWorkspace`
- `ResearchBranch`
- `Problem`
- `ValueHypothesis`
- `ContributionDelta`
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
- `DimensionState`
- `AbstractStateSnapshot`
- `ReportProjection`
- `DecisionRecord`
- `LessonRecord`

## Ownership and boundaries
- `T-025` 拥有 persistence、repository、service、state recompute 与 read model。
- `T-026` 只能消费这里暴露的 seed/init 和 readiness surface。
- `T-028` 只能消费这里暴露的 graph/state contracts，不能反向定义 persistence 结构。

## Produced runtime surfaces
- Persistence / repository:
  - workspace / branch store
  - graph object store
  - decision / lesson log
  - report projection store
- Service / read-model:
  - `WorkspaceSummary`
  - `AbstractStateSnapshot`
  - `ClaimEvidenceCoverageRow`
  - `ProtocolBaselineReproReadiness`
  - `DecisionTimelineEntry`
  - `ReportProjection`

## Identity and traceability contract
- 每个 graph object 必须至少带：
  - `workspace_id`
  - `branch_id`
  - stable object id
- 与上游 `title-card` 的 traceability 必须保留：
  - `title_card_id`
  - source `need` / `research_question` / `value_assessment` refs
  - source literature evidence refs
- 与下游 handoff 的 traceability 必须预留：
  - packet/report refs
  - `paper_id` ref（创建后）

## Recompute rule
- 任意改变 graph truth 的 mutation 都必须：
  - 同步 recompute，或
  - enqueue `state_recompute_task`
- 不允许对象图静默漂移而 state 不更新。

## Projection rules
- `EvaluationSoundness` 必须至少投影：
  - `BaselineSet`
  - `Protocol`
  - `Run`
  - `Artifact`
  - `AnalysisFinding`
- `ReproducibilityReadiness` 必须至少投影：
  - `Protocol`
  - `ReproItem`
  - `Run`
  - `Artifact`
- `ReportProjection` 用于承接 risk report、coverage report 和 downstream handoff 所需的聚合视图。

## Metadata hooks
- graph/report artifacts 默认 local-first。
- persistence/read models 必须带：
  - sync eligibility
  - authorization metadata
  - Git weak mapping refs
  - audit refs

## Out of scope
- bundle planning
- CriticHub
- learning memory
- desktop rendering
