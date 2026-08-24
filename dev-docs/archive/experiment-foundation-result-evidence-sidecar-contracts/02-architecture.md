# 02 Architecture

## Result Chain
```text
TrainingTaskSpec + TrainingTaskMaterializationResult + adapter metadata refs
  -> ExternalTrainingJob
  -> ExperimentResult / FineTuningResult
  -> ResultValidationReport
  -> EvaluationFact / MetricObservation
  -> EvidenceCandidate
  -> PaperExperimentSidecar
  -> downstream claim-evidence review
```

T-074 starts from the materialized execution boundary frozen by T-073. It may reference `TrainingTaskSpec`, `TrainingTaskMaterializationResult`, adapter metadata refs, stage events, cancellation requests, and partial result refs, but it MUST NOT redefine how a `RunRecipe` becomes a `TrainingTaskSpec`.

## EvidenceCandidate Minimum Fields
- id, status, source result refs, validation report refs
- run_recipe_id and lock hash
- evaluation protocol version/hash
- metric observation refs and artifact refs
- caveats, blockers, provenance refs, created_by, created_at
- downstream review refs, but no final claim text

## Sidecar Minimum Fields
- paper_project_id
- run_recipe refs and lock snapshots
- training task spec refs and job refs
- materialization result refs, adapter metadata refs/hashes, stage event refs, and partial result refs
- result, validation, fact, and evidence candidate refs
- dataset/baseline/benchmark/protocol version locks
- status snapshots, event log refs, provenance refs

## Required Invariants
- Materialization semantics are owned by T-073; T-074 only consumes materialized refs and hashes.
- Invalid result cannot create evidence candidate.
- Evidence candidate cannot contain final paper claim or acceptance status.
- Paper sidecar cannot copy full reusable asset DTOs.
- Evaluation facts cannot imply ranking, best result, or final table ownership.

## Negative Schema Tests
- Reject EvidenceCandidate from invalid result.
- Reject metric-only fact without run/result/protocol/asset context.
- Reject sidecar storing full dataset/baseline/benchmark DTOs.
- Reject PaperTableFactSet that behaves as a final table renderer.
