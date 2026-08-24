# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-075 experiment-foundation-candidate-promotion-contracts`.

## Goal
- Ensure external job outputs become validated result packets, then evidence candidates, then paper sidecar refs without allowing raw results to become paper claims directly.

## Non-goals
- Do not write paper claims or final paper tables.
- Do not build a leaderboard.
- Do not copy full reusable asset DTOs into paper-project contracts.

## Responsibilities
- Define `ExperimentResult`, `FineTuningResult`, and `ResultValidationReport` requirements.
- Define `EvidenceCandidate` minimum fields and status transitions.
- Define minimal evaluation fact layer as validated fact store, not ranking system.
- Define `PaperExperimentSidecar` refs, version locks, hashes, status snapshots, and ownership boundaries.

## Boundary
- Owns validated result to evidence and paper bridge contracts.
- Consumes T-073 `TrainingTaskSpec`, `TrainingTaskMaterializationResult`, adapter metadata refs, stage events, and partial result refs; does not redefine materialization or adapter metadata boundaries.
- Hands off claim-evidence review to paper/research workflows.
- Hands off execution collection mechanics to `experiment-foundation-execution-adapters`.

## Done Means
- [x] Invalid results cannot create evidence candidates.
- [x] Sidecar stores refs/locks/snapshots, not full asset DTOs.
- [x] Evaluation facts remain factual inputs, not claims or leaderboards.

## Acceptance criteria
- [x] Shared contracts define `ExperimentResult`, `FineTuningResult`, `ResultValidationReport`, fact/observation records, `EvidenceCandidate`, `PaperTableFactSet`, and `PaperExperimentSidecar`.
- [x] Negative schema tests reject invalid result evidence creation, paper-claim fields, leaderboard/final-table fields, copied DTOs, missing hashes, and adapter-private leaks.
- [x] T-074 consumes T-073 refs/hashes without redefining `TrainingTaskSpec`, materialization, adapter metadata, or external job execution semantics.
