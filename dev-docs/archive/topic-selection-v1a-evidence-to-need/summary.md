# topic-selection-v1a-evidence-to-need

## Outcome

- 建立 `TopicSeed -> LiteratureResourcePoolSnapshot -> SearchPlan -> SearchRun -> EvidenceMap/EvidenceUnit -> NeedCandidate -> ValidateNeedAdjudicationResult -> ValidatedNeed` 的最小可验收闭环。
- v1a 的成功出口是 human-confirmed `ValidatedNeed`，并具备 trace、gate、recheck、risk、memory 和 offline evaluation baseline。

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-044`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- A `ValidatedNeed` can be created only through `ValidateNeedAdjudicationResult.final_decision = validate`.
- Non-validate adjudication outcomes keep `output_validated_need_id = null`.
- Trace can be followed from `ValidatedNeed` to EvidenceUnit, SearchRun, SearchPlan, and literature snapshot.
- Recheck/risk/memory states are visible to gates and do not rewrite historical decisions.
- Offline evaluation/replay can report the v1a minimum metrics.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-evidence-to-need/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
