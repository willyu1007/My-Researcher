# 02 Architecture

## Governance Model
- `T-043 experiment-foundation-v1` is the parent task and keeps the V1 product narrative.
- Child tasks own bounded design/implementation slices.
- The project registry maps all child tasks to `R-012` because the governance contract has no native parent-child edge.

## Review Issue Ownership
| Review issue | Owner child |
|---|---|
| S1 too large | this task |
| DatasetAsset / DatasetVersion overlap | `experiment-foundation-dataset-registry-contracts` |
| BenchmarkAsset / EvaluationProtocol overlap | `experiment-foundation-benchmark-protocol-contracts` |
| Missing version locks | `experiment-foundation-version-lock-recipe-contracts` |
| Fine-tuning bypass risk | `experiment-foundation-version-lock-recipe-contracts` and `experiment-foundation-materialization-adapter-contracts` |
| Adapter metadata boundary | `experiment-foundation-materialization-adapter-contracts` |
| Thin EvidenceCandidate | `experiment-foundation-result-evidence-sidecar-contracts` |
| Candidate state in canonical asset lifecycle | `experiment-foundation-candidate-promotion-contracts` |
| Cloud mirror canonical drift | `experiment-foundation-dataset-registry-contracts` and `experiment-foundation-execution-adapters` |
| Evaluation fact leaderboard creep | `experiment-foundation-result-evidence-sidecar-contracts` |

## S1 Split
- `S1-A` freezes the minimum closed loop: assets, versions, locks, readiness, recipe, materialization boundary, result, evidence, and sidecar.
- `S1-B` freezes extension shells: tuning, fine-tuning profiles, method components, comparison observations, implementation decision signals, and paper-table-ready fact groups.
