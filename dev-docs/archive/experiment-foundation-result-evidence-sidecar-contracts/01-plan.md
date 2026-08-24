# 01 Plan

## Phases
1. Define result packet contract for metrics, artifacts, logs, config snapshot, and validation input.
2. Define `ResultValidationReport` blockers and protocol checks.
3. Define `EvaluationFact` and `MetricObservation` minimal fact store.
4. Define `EvidenceCandidate` statuses and required refs.
5. Define `PaperExperimentSidecar` refs, locks, hashes, event refs, and snapshots.
6. Add negative tests for invalid result to evidence, metric-only facts, final claim text in evidence, and full asset DTO copies in sidecar.

## Acceptance Criteria
- `ExperimentResult` and `FineTuningResult` cannot be consumed as claims directly.
- Invalid or unvalidated results cannot create `EvidenceCandidate`.
- `EvidenceCandidate` has status, result refs, validation refs, protocol refs, provenance, caveats, and review blockers.
- `PaperExperimentSidecar` records refs/version locks/status snapshots only.
- Evaluation facts are facts, not leaderboard rows or final paper tables.

## Review Gate
- Close after materialization result fields settle.
- Close before paper-project bridge implementation or UI evidence screens.
