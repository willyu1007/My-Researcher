# 06 Child Task Review

## Purpose
- Keep the parent package aligned with child task packages.
- Map design review issues to concrete owners.
- Confirm the overall plan covers the V1 goal before implementation moves forward.

## Governance Decision
- Decision: `PROJECT_UPDATE` and `REUSE_TASK`.
- Parent task: `T-043 experiment-foundation-v1`.
- Requirement mapping: `M-001 > F-001 > R-012 > T-043 + child tasks`.
- Parent-child relationship is documented in task docs and `.ai-task.yaml` keywords because the project contract does not define a native parent edge.

## Child Coverage Matrix
| Flow / concern | Owner child | Upstream dependency | Downstream consumer | Closure signal |
|---|---|---|---|---|
| Review report ingestion and S1 split | `experiment-foundation-design-review-sync` | external review report and parent package | all children | done: coverage matrix has no unmapped high-risk issue |
| Dataset identity/version/storage/mirror | `experiment-foundation-dataset-registry-contracts` | parent asset scope | locks, persistence, adapters, sidecar | done: DatasetAsset has no version/checksum/storage refs; DatasetVersionLock has no storage/mirror refs |
| Benchmark/protocol/baseline split | `experiment-foundation-benchmark-protocol-contracts` | research-argument baseline/protocol context | locks, validation, sidecar | done: protocol has version/hash; benchmark references protocol; baseline_set does not leak into baseline assets |
| Version locks and recipe path | `experiment-foundation-version-lock-recipe-contracts` | dataset + benchmark/protocol contracts | materialization, persistence, sidecar | done: RunRecipe locks refs/hashes/readiness and stays platform-neutral |
| Materialization and adapter metadata | `experiment-foundation-materialization-adapter-contracts` | locked RunRecipe | adapters, persistence | done: TrainingTaskSpec, materialization result, fine-tuning profile, and adapter metadata refs are frozen |
| Result, evidence, facts, sidecar | `experiment-foundation-result-evidence-sidecar-contracts` | materialized task/result context | paper bridge, UI | done: invalid results cannot create evidence; sidecar stores refs/hashes/snapshots only |
| Candidate promotion | `experiment-foundation-candidate-promotion-contracts` | canonical asset contracts | persistence/API/import | done: candidate state is separate; auto-promotion is gated by source/provenance, confidence, duplicate, completeness, policy, risk, and rule traces |
| Persistence/API/readiness | `experiment-foundation-persistence-api-readiness` | S1-A/S1-B contracts | adapters, UI | done: generic registry/readiness DB SSOT, repository/service/API, readiness checks, candidate promotion persistence, DB context sync, and targeted backend tests pass |
| Execution adapters | `experiment-foundation-execution-adapters` | materialization + persistence + result contracts | result/evidence and UI | done: LocalScript smoke, mocked Aliyun mirror/policy gates, idempotency, cancellation, collect, validation, and evidence tests pass |
| Desktop workbench | `experiment-foundation-desktop-workbench` | stable API/contracts | user workflows | UI governance/smoke checks pass |

## Review Report Coverage
| Review point | Covered by | Gap status |
|---|---|---|
| S1 too large; split S1-A/S1-B | design-review-sync | covered |
| DatasetAsset / DatasetVersion overlap | dataset-registry-contracts | covered |
| BenchmarkAsset / EvaluationProtocol overlap | benchmark-protocol-contracts | covered |
| Missing baseline/benchmark/protocol/method version locks | version-lock-recipe-contracts | covered |
| Fine-tuning execution bypass risk | version-lock-recipe-contracts + materialization-adapter-contracts | covered |
| TrainingTaskSpec vs adapter metadata boundary | materialization-adapter-contracts | covered |
| EvidenceCandidate too thin | result-evidence-sidecar-contracts | covered |
| Candidate state should not live in canonical asset lifecycle | candidate-promotion-contracts | covered |
| Cloud mirror vs canonical registry conflict | dataset-registry-contracts + execution-adapters | covered |
| Evaluation facts should not become leaderboard/paper claim | result-evidence-sidecar-contracts | covered |
| PaperExperimentSidecar owner clarity | result-evidence-sidecar-contracts | covered |
| Execution profile should be capability-based | version-lock-recipe-contracts | covered |
| Local registry as Postgres metadata + filesystem refs + cloud mirror | dataset-registry-contracts + persistence-api-readiness | covered |
| BaselineAsset vs research-argument baseline_set | benchmark-protocol-contracts | covered |
| Execution pipeline testability: events, idempotency, cancellation, partial results | materialization-adapter-contracts + execution-adapters | covered |
| Literature auto-promotion strictness | candidate-promotion-contracts | covered |

## Flow Review
1. Literature/manual observations become candidates through `experiment-foundation-candidate-promotion-contracts`.
2. Promoted dataset/benchmark/baseline/protocol records land in canonical contracts owned by dataset and benchmark/protocol children.
3. Readiness checks and version locks create a stable `RunRecipe` through the version-lock child.
4. Materialization converts valid locks into `TrainingTaskSpec` plus adapter metadata refs.
5. Execution adapters submit/monitor/collect outputs using materialized specs and non-canonical mirrors.
6. Result validation creates facts and evidence candidates.
7. Paper sidecar binds refs/locks/snapshots into paper-project without copying reusable asset DTOs.
8. Desktop workbench consumes API state and never owns domain semantics.

## Per-flow Contract Closure Checklist
| Step | Required input contract | Required output contract | Review before next step |
|---|---|---|---|
| Candidate discovery | source refs, extraction provenance, candidate type, confidence, risk | candidate status + promotion blockers | source/license/version/policy/duplicate fields are sufficient |
| Candidate promotion | reviewed candidate + promotion decision | canonical asset refs plus version/protocol/policy refs | no candidate state leaks into canonical lifecycle |
| Dataset registration | DatasetAsset identity + DatasetVersion details | version with checksum manifest hash, split hash, policy ref, location refs | DatasetAsset has no version/checksum/storage refs |
| Benchmark/baseline/protocol registration | benchmark identity, protocol rules, baseline implementation | protocol version/hash and baseline implementation version | BenchmarkAsset references protocol; BaselineAsset does not own protocol |
| Readiness | asset refs, versions, policies, protocol hashes, entrypoints | readiness report id/hash + blockers | blockers cover license, checksum, split, protocol, entrypoint, stale mirror |
| Recipe draft | selected/candidate refs and params | editable incomplete draft | draft cannot submit or materialize |
| RunRecipe lock | validated refs, versions, hashes, readiness | immutable platform-neutral RunRecipe + version lock | no vendor/platform/private fields |
| Materialization | RunRecipe lock + platform selection + adapter version | TrainingTaskSpec + adapter metadata ref/hash | materialization is reproducible and fine-tuning uses profile |
| Execution | TrainingTaskSpec + adapter metadata + idempotency key | ExternalTrainingJob + event log | mirror freshness and policy approval are checked; job state is not writable through generic registry records |
| Result collection | job refs + artifacts/logs/config snapshots | ExperimentResult/FineTuningResult | result packet has metrics, artifacts, logs, config, protocol context |
| Result validation | result + protocol version/hash | ResultValidationReport + blocker codes | invalid result cannot become evidence |
| Evidence creation | valid result + validation report + facts | EvidenceCandidate | no final claim text or acceptance field |
| Sidecar binding | evidence/result/job/task/recipe/asset locks | PaperExperimentSidecar refs/locks/snapshots | no full reusable asset DTO copies |
| Desktop workflow | API DTOs and service status | guarded views/actions | UI does not own domain semantics or legacy CSS |

## Current Gap Review
- No uncovered high-risk review point remains after this split.
- The main execution dependency is now closed for the minimum chain: dataset and benchmark/protocol contracts closed before version locks; version locks closed before materialization; materialization and result contracts closed before adapters and UI.
- The project contract lacks native child-task edges. Mitigation: child packages carry `parent-task:T-043` keywords, parent docs carry this matrix, and registry tasks map to `R-012`.
- The registry does not encode child execution order. Mitigation: parent `06-child-task-review.md` carried closure gates with each child’s `01-plan.md` (children now archived; their plans are summarized in each child’s `dev-docs/archive/<child>/summary.md`); governance lint confirms identity/mapping, while humans follow the documented order.
- Remaining product gaps are not child-task misses in T-069~T-078. They are explicit follow-up scopes: productized tuning workflow, candidate extraction/import, typed asset APIs/UI beyond generic registry, dedicated paper-project sidecar bridge, live DB migration smoke, and real Aliyun SDK/credential hardening.

## Overall Implementation Order
1. `experiment-foundation-design-review-sync`
2. `experiment-foundation-dataset-registry-contracts`
3. `experiment-foundation-benchmark-protocol-contracts`
4. `experiment-foundation-version-lock-recipe-contracts`
5. `experiment-foundation-materialization-adapter-contracts`
6. `experiment-foundation-result-evidence-sidecar-contracts`
7. `experiment-foundation-candidate-promotion-contracts`
8. `experiment-foundation-persistence-api-readiness`
9. `experiment-foundation-execution-adapters`
10. `experiment-foundation-desktop-workbench`

## Entry Gate Before Next Step
- Review the owner child package before starting work.
- Confirm upstream closure signals are satisfied.
- Confirm negative schema tests are listed for the boundary being frozen.
- Confirm no child duplicates another child ownership.

## Final Parent Review Gate
- Re-read this file and each archived child’s `dev-docs/archive/<child>/summary.md`.
- Confirm child acceptance criteria cover parent acceptance criteria.
- Run project governance sync and lint.
- Only then start implementation under the first child package.

## Final Review Status - 2026-05-17
- Child task package set created: complete.
- Review report high-value issues mapped: complete.
- Per-flow contract closure checklist added: complete.
- Known non-product governance gap documented with mitigation: complete.
- Governance sync/lint: passed.
- `T-069 experiment-foundation-design-review-sync`: done; next owner is `T-070 experiment-foundation-dataset-registry-contracts`.
- `T-070 experiment-foundation-dataset-registry-contracts`: done; next owner is `T-071 experiment-foundation-benchmark-protocol-contracts`.
- `T-071 experiment-foundation-benchmark-protocol-contracts`: done; next owner is `T-072 experiment-foundation-version-lock-recipe-contracts`.
- `T-072 experiment-foundation-version-lock-recipe-contracts`: done; next owner is `T-073 experiment-foundation-materialization-adapter-contracts`.
- `T-073 experiment-foundation-materialization-adapter-contracts`: done; next owner is `T-074 experiment-foundation-result-evidence-sidecar-contracts`.
- `T-074 experiment-foundation-result-evidence-sidecar-contracts`: done; next owner is `T-075 experiment-foundation-candidate-promotion-contracts`.
- `T-075 experiment-foundation-candidate-promotion-contracts`: done; next owner is `T-076 experiment-foundation-persistence-api-readiness`.
- `T-076 experiment-foundation-persistence-api-readiness`: done; next owner is `T-077 experiment-foundation-execution-adapters`.
- `T-077 experiment-foundation-execution-adapters`: done; next owner is `T-078 experiment-foundation-desktop-workbench`.
- `T-078 experiment-foundation-desktop-workbench`: done; desktop consumes registry/readiness/promotion/execution APIs without owning experiment semantics.
- T-070~T-078 minimum implementation chain: complete.
- Parent closure note: original roadmap also names richer tuning workflow records and real cloud SDK/credential hardening; keep those as explicit follow-up decisions rather than silently treating them as implemented.

## Post-cleanup Review Status - 2026-05-19
- T-069~T-078 remain the complete minimum implementation chain.
- T-043 remains `planned` only as the parent closure/backlog umbrella; do not start a second experiment-foundation implementation track under adjacent modules.
- Any remaining work must be opened as new follow-up task packages that consume the existing experiment-foundation contracts, registry/readiness APIs, execution APIs, and sidecar refs.
- T-090 `experiment-foundation-capability-validation` is the first explicit follow-up package. It owns scenario-level testing of automation, external interactions, and adjacent-flow robustness for the already-closed minimum chain.

## Capability Validation Review Status - 2026-05-24
- T-090 `experiment-foundation-capability-validation`: done.
- T-090 validated the minimum chain through backend scenario harnesses, LocalScript execution, mocked Aliyun mirror/policy gates, candidate promotion, result/evidence/sidecar guards, adjacent workorder no-copy guards, and desktop smoke.
- The remaining items are product-expansion follow-ups, not evidence that the T-070~T-078 minimum chain is still open.
