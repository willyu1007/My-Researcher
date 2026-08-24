# topic-selection-v1a-search-resource-evidence-inputs

## Outcome

- Implement the v1a entry and search input layer from title-card/topic seed and literature resources through `SearchPlan` and `SearchRun`.
- Produce stable search/resource/evidence-input refs that `EvidenceMap` can consume.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-052`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- SearchPlan cannot be created without TopicSeed and snapshot refs.
- SearchRun cannot be consumed without source health/result accounting.
- Coverage matrix can be regenerated from child records only.
- Search recheck outcomes remain traceable to the originating request and policy decision.
- Raw search logs cannot be used as EvidenceMap authority refs.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-search-resource-evidence-inputs/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
