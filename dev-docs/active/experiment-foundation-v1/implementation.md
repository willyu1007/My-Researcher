# 03 Implementation Notes

> Historical implementation log retained for the planned parent backlog. References to retired
> `.ai` mechanisms are provenance only; current governance is defined by `.ai/project/AGENTS.md`.

## Closure/backlog alignment - 2026-05-19
- Re-reviewed the repo after T-078 and the post-review desktop fixes.
- Cleaned obsolete temporary UI-gate evidence directories under `.ai/.tmp/ui/` for the T-078 runs; durable verification evidence remains in task docs.
- Clarified the parent acceptance criteria into two groups:
  - T-070~T-078 minimum operational chain that is now closed;
  - explicit follow-up scope that must be tracked as new task packages rather than hidden continuation work under T-043.
- Parent T-043 remains `planned` as the closure/backlog umbrella because the original conceptual scope includes productized tuning workflow, full base-model/fine-tuning-dataset registries, dedicated paper-project bridge UI/API, candidate extraction, and real cloud SDK/credential hardening.
- No second experiment-foundation implementation track should be created in `literature`, `research-argument`, or `paper-project`; those modules should consume refs/sidecars from the existing experiment-foundation registry/API.
- Removed the generic registry `external_training_job` record kind so external job state has a single owner: the T-077 execution table/API. Registry records may reference jobs, but must not create/update job state.

## T-077 execution adapters landing - 2026-05-18
- Completed `T-077 experiment-foundation-execution-adapters`.
- Added minimum execution backend closure: `ExternalTrainingJob` shared/API contracts, dedicated external job persistence, memory/Prisma repositories, service/controller/routes, LocalScript execution, mockable Aliyun PAI-DLC boundary, readiness/materialization/idempotency gates, cancellation, stage events, partial refs, result validation, and evidence candidate creation.
- LocalScript stays safe by default: auto-enabled only under `NODE_ENV=test`, explicit opt-in outside tests, `shell=false`, execution-root containment, and command allowlist.
- Aliyun remains SDK-free and credential-free in this slice; it validates `DatasetMirror` refs for readiness, freshness, provider, checksum, and policy approval before mocked submit.
- Mainline next owner is `T-078 experiment-foundation-desktop-workbench`.

## T-076 persistence/api/readiness landing - 2026-05-18
- Completed `T-076 experiment-foundation-persistence-api-readiness`.
- Added minimum backend closure for experiment foundation: generic registry/readiness persistence, shared API wrappers, repositories, services, REST routes, readiness gates, candidate promotion persistence, DB context refresh, and targeted backend tests.
- Repo migration was generated only; no live database migration was applied.
- Mainline next owner is `T-077 experiment-foundation-execution-adapters`.

## T-075 candidate promotion contract landing - 2026-05-18
- Completed `T-075 experiment-foundation-candidate-promotion-contracts`.
- Added shared contracts for literature/manual asset candidates, source/provenance traces, duplicate/completeness/policy/risk checks, deterministic rule traces, triage reports, promotion requests, and promotion results.
- Candidate status remains separate from canonical asset lifecycle; canonical asset/protocol/method schemas now explicitly reject candidate lifecycle fields.
- Auto-promotion is gated by grounded source/provenance, confidence >= `0.8`, low risk, no duplicate, complete fields, clear policy, and deterministic rule trace refs.
- Promotion outputs canonical refs/hashes only; no canonical DTOs, execution payloads, result/evidence records, paper claims, or platform-private fields are allowed in candidate/promotion contracts.
- Boundary in T-075 remained shared-contract-only: it did not add candidate import/extraction service, persistence/API/UI, or actual canonical asset creation logic. Later T-076/T-078 add generic registry/API/UI surfaces, while candidate extraction and canonical asset synthesis remain follow-up scope.
- Mainline next owner is `T-076 experiment-foundation-persistence-api-readiness`.

## T-074 result/evidence/sidecar contract landing - 2026-05-17
- Completed `T-074 experiment-foundation-result-evidence-sidecar-contracts`.
- Added shared contracts for `ExperimentResult`, `FineTuningResult`, `ResultValidationReport`, `EvaluationFact`, `MetricObservation`, `ComparisonObservation`, `ImplementationDecisionSignal`, `PaperTableFactSet`, `EvidenceCandidate`, and `PaperExperimentSidecar`.
- The result chain now has shared-contract coverage from T-073 materialized task outputs to validated facts, evidence candidates, and paper sidecar refs.
- Boundary remains product-layer incomplete: no persistence/API/UI/adapters/result collection services were added in T-074.
- Mainline next owner is `T-075 experiment-foundation-candidate-promotion-contracts`.

## T-073 materialization/adapter boundary contract landing - 2026-05-17
- Completed `T-073 experiment-foundation-materialization-adapter-contracts`.
- Added shared contracts for `MaterializeTrainingTaskSpecRequest`, `TrainingTaskSpec`, `FineTuningTaskProfile`, `TrainingTaskMaterializationResult`, `ExperimentFoundationAdapterMetadataRef`, and execution hook refs.
- Preserved T-072 semantics: `RunRecipe` remains locked and platform-neutral; T-073 only consumes it when materializing a normalized task spec.
- Fine-tuning remains a specialized `TrainingTaskSpec` profile and cannot bypass `RecipeDraft -> RunRecipe -> TrainingTaskSpec`.
- Mainline next owner is `T-074 experiment-foundation-result-evidence-sidecar-contracts`.

## T-071 benchmark/protocol/baseline contract landing - 2026-05-17
- Completed `T-071 experiment-foundation-benchmark-protocol-contracts`.
- Added shared contracts for benchmark identity, evaluation protocol, metric definition, baseline identity, baseline implementation version, and narrow lock inputs for T-072.
- Boundary now has executable contract support:
  - `BenchmarkAsset` is identity/testbed level and references protocol refs.
  - `EvaluationProtocol` owns version/hash plus metric/evaluator/reporting/comparison/statistics/budget/tuning rules.
  - `BaselineAsset` is method/model identity only.
  - `BaselineImplementationVersion` owns code/runtime/entrypoint/version fields.
  - Retired workspace-selection fields remain rejected from canonical baseline metadata.
- Mainline next owner is `T-072 experiment-foundation-version-lock-recipe-contracts`.

## T-070 dataset registry contract landing - 2026-05-17
- Completed `T-070 experiment-foundation-dataset-registry-contracts`.
- Added the first experiment-foundation shared contract module for dataset registry boundaries.
- Dataset boundary now has executable contract support:
  - `DatasetAsset` is identity only.
  - `DatasetVersion` owns version, manifest, split, policy, processing, locations, access, and readiness refs.
  - `DatasetMirror` is non-canonical execution mirror metadata tied to source checksum manifest hash.
  - `DatasetVersionLock` gives later `RunRecipe` work the dataset version/hash/policy lock input without storage paths or mirror refs.
- Mainline next owner is `T-071 experiment-foundation-benchmark-protocol-contracts`.

## Semantic drift cleanup and closure review - 2026-05-17
- Rechecked the mother package and child packages against `/Users/yurui/Downloads/experiment-foundation-v1-design-review.md`.
- Tightened remaining wording drift:
  - platform selection is now consistently placed at `MaterializeTrainingTaskSpecRequest.platform_id`
  - `RunRecipe` remains platform-neutral and only carries locks plus capability-oriented execution requirements
  - fine-tuning no longer appears as a standalone execution spec path
  - adapter-private payloads are barred from `RunRecipe` and public domain DTOs
- Added `07-quality-closure-review.md` to separate two conclusions:
  - T-069 design/governance closure is complete
  - at that time, product-level experiment-foundation functionality was not closed because contracts, DB/API, UI, adapters, and evidence sidecar were still unimplemented
- Next owner remains `T-070 experiment-foundation-dataset-registry-contracts`.

## Child task split and design review coverage - 2026-05-17
- Created child task packages under `dev-docs/active/experiment-foundation-*` while keeping this package as parent `T-043`.
- Added `06-child-task-review.md` to map design review issues to child task owners and implementation order.
- Updated the parent overview and plan to include `S0` design review sync and split `S1` into S1-A minimum closed-loop contracts plus S1-B extension shells.
- Synced parent architecture wording for the highest-risk conflicts: DatasetAsset no longer owns version/checksum/storage fields, BenchmarkAsset now references versioned EvaluationProtocol rules, canonical asset lifecycle no longer uses `candidate`, and fine-tuning is a `TrainingTaskSpec` profile rather than a standalone execution bypass.
- Initial closure result: no high-risk review issue remains unmapped; implementation order now requires dataset and benchmark/protocol contracts before version locks, version locks before materialization, and materialization/result contracts before adapters/UI.

## Initial planning notes - 2026-05-12
- Task package created to plan `experiment-foundation-v1`.
- User intent:
  - 新增“实验基座”模块。
  - UI 位置放到“文献管理”下方。
  - 目标是管理数据、benchmark、baseline、evaluation protocol，使论文实施阶段可检索、引用、复用。
  - 先基于 roadmap 对齐决策点，再进入实现。
- Governance decision:
  - This is a complex, cross-cutting task and requires dev-docs context preservation.
  - Task id: `T-043`.
  - Slug: `experiment-foundation-v1`.
  - Proposed mapping: `M-001 > F-001 > R-012`.
- Semantic decision:
  - `experiment-foundation` is independent from `literature`.
  - Literature can discover candidates; experiment foundation owns reusable implementation assets.
  - Retired workspace-selection fields should not be duplicated; current consumers should use reusable `BaselineAsset` refs directly.

## Decision alignment state
- `DP-01`: UI label. [confirmed]
- `DP-02`: storage scope. [confirmed]
- `DP-03`: candidate promotion policy. [confirmed]
- `DP-04`: baseline/benchmark usage and verification bar. [confirmed]
- `DP-05`: run recipe depth. [confirmed]
- `DP-06`: paper-project integration style. [confirmed]
- `DP-07`: first training platform adapter. [confirmed]
- `DP-08`: result collection contract. [confirmed]
- `DP-09`: method recipe V1 scope. [confirmed]
- `DP-10`: evaluation layer V1 scope. [confirmed]
- `DP-11`: LLM fine-tuning support. [confirmed]

## Discussion sync - 2026-05-12
- User confirmed the four-layer capability model:
  - reusable asset layer
  - method recipe layer
  - evaluation layer
  - external execution control layer
- User confirmed reusable fixed assets should include data, baselines, and reproduction mechanisms that can be directly referenced or used.
- User confirmed method recipe scope should cover common training/inference strategies, optimizers, experiment hypotheses, model structures, and other tunable implementation choices.
- User confirmed evaluation scope should cover metrics and test protocols.
- User confirmed training may involve LLM fine-tuning.
- User confirmed the execution-engineering boundary:
  - The project should not build its own training platform.
  - Existing training platforms or infrastructure should execute training/inference jobs.
  - `experiment-foundation` should provide a fixed control pipeline for task creation, process monitoring, result collection, and evidence conversion.
- Architecture decision:
  - Treat `experiment-foundation` as the control plane.
  - Treat external training platforms as the compute/runtime plane.
  - Use adapter contracts to keep platform details out of core domain contracts.
- Fixed pipeline now recorded:
  - `Resolve`
  - `Validate`
  - `Mirror`
  - `Materialize`
  - `Submit`
  - `Monitor`
  - `Collect`
  - `Validate Result`
- New proposed objects:
  - `BaseModelAsset`
  - `FineTuningDatasetAsset`
  - `TrainingStrategy`
  - `InferenceStrategy`
  - `OptimizerPreset`
  - `ArchitectureTemplate`
  - `ExperimentHypothesis`
  - `HyperparameterSpace`
  - `AblationPlan`
  - `FineTuningStrategy`
  - `MetricDefinition`
  - `TestSuite`
  - `StatisticalProtocol`
  - `ReportingProtocol`
  - `ComparisonPolicy`
  - `ExecutionPlatform`
  - `TrainingTaskSpec`
  - `FineTuningTaskProfile`
  - `ExternalTrainingJob`
  - `ExperimentResult`
  - `FineTuningResult`
  - `EvidenceCandidate`

## UI label decision sync - 2026-05-12
- User confirmed `DP-01`.
- Decision:
  - Desktop user-facing UI label is `实验基座`.
  - UI entry should be placed below “文献管理”.
  - Canonical backend/shared domain remains `experiment-foundation`.
  - UI placement does not make the module a `literature` submodule.

## Storage decision sync - 2026-05-12
- User accepted the storage solution for `DP-02`.
- Decision:
  - Local experiment registry is canonical.
  - Local file refs are first-class dataset locations.
  - Cloud locations such as Aliyun OSS / PAI Dataset are optional execution mirrors.
  - Raw data must not be stored in git or database blobs.
  - Cloud mirrors must not overwrite local canonical metadata without review.
- New proposed storage objects:
  - `DatasetVersion`
  - `DatasetLocation`
  - `DatasetMirror`
  - `ChecksumManifest`
  - `SplitProtocol`
  - `DataProcessingRecipe`
  - `DataPolicy`
- Aliyun implication:
  - `AliyunPaiDlcAdapter` should consume OSS / PAI Dataset refs from `DatasetMirror`.
  - Before submit, the control pipeline should validate checksum, data policy, split protocol, and mirror freshness.
  - Outputs should return through OSS/platform artifacts into `ExperimentResult`, then `EvidenceCandidate`.

## Adapter decision sync - 2026-05-12
- User accepted the recommendation for `DP-07`.
- Decision:
  - V1 includes `LocalScriptAdapter` for local smoke and pipeline validation.
  - V1 includes `AliyunPaiDlcAdapter` as the first real cloud execution adapter.
  - V1 does not include `CustomHttpAdapter`.
- Implementation implication:
  - Core services must depend on `TrainingPlatformAdapter`.
  - PAI-DLC private fields stay in adapter metadata.
  - `AliyunPaiDlcAdapter` consumes `DatasetMirror` refs for OSS / PAI Dataset inputs.
  - `LocalScriptAdapter` should not require cloud credentials.

## Result collection decision sync - 2026-05-12
- User accepted the recommendation for `DP-08`.
- Decision:
  - Result collection contract is fixed as metrics + artifacts + logs + config snapshot + validation report.
- Implementation implication:
  - `ExperimentResult` and `FineTuningResult` must carry a structured result packet, not loose file refs only.
  - `metrics` should bind to `MetricDefinition` where possible.
  - `config snapshot` must capture effective runtime config.
  - `validation report` must check `EvaluationProtocol`.
  - Evidence candidates should only be created from valid or explicitly accepted partial results.

## Candidate promotion decision sync - 2026-05-12
- User rejected making human review a default blocking gate for `DP-03`.
- Decision:
  - Low-risk complete candidates can be auto-promoted by deterministic checks.
  - Manual review is reserved for high-risk, incomplete, conflicting, restricted, low-confidence, or policy-sensitive candidates.
  - Human review should be minimized and should not block the common low-risk path.
- Implementation implication:
  - Candidate triage must produce explicit state and reasons.
  - Auto-promotion requires source refs, metadata completeness, policy fields, duplicate check, and confidence/risk thresholds.
  - Ungrounded candidates must be rejected or marked `needs_info`.
  - Manual review state should be `manual_review_required`, not a global gate.

## Baseline and benchmark decision sync - 2026-05-12
- User accepted the `DP-04` distinction between baseline and benchmark.
- Decision:
  - `BaselineAsset` answers “和谁比”: reusable method/model/implementation/reproduction recipe.
  - `BenchmarkAsset` answers “怎么比”: task, dataset/split, metrics, evaluator, reporting protocol, and comparison policy.
  - Full benchmark reproduction is not required for baseline catalog entry.
  - Baseline and benchmark have separate verification ladders.
- Baseline verification ladder:
  - `metadata_complete`
  - `reachable`
  - `smoke_verified`
  - `protocol_compatible`
  - `benchmark_verified`
- Benchmark verification ladder:
  - `protocol_complete`
  - `assets_reachable`
  - `evaluator_smoke_verified`
  - `reproducible_protocol`
  - `comparison_certified`
- Default gate policy:
  - catalog entry: baseline `metadata_complete + reachable`, benchmark `protocol_complete + assets_reachable`
  - executable run recipe: baseline `smoke_verified`, benchmark `evaluator_smoke_verified`
  - formal comparison: baseline `protocol_compatible`, benchmark `reproducible_protocol`
  - paper-grade strong evidence: baseline `benchmark_verified`, benchmark `comparison_certified`, valid result packet

## RunRecipe depth decision sync - 2026-05-12
- User accepted the recommendation for `DP-05`.
- Decision:
  - V1 should use a materializable recipe model.
  - Do not make `RunRecipe` a loose static config.
  - Do not make `RunRecipe` a platform-specific executable script or adapter request body.
  - Use three layers: `RecipeDraft -> RunRecipe -> TrainingTaskSpec`.
- Object semantics:
  - `RecipeDraft` is editable and may be incomplete; it is for interactive selection and planning.
  - `RunRecipe` locks asset refs, versions, protocol hashes, method params, readiness result, and traceability refs.
  - `RunRecipe` remains platform-neutral and deterministic from locked inputs.
  - `TrainingTaskSpec` is materialized from a valid `RunRecipe` plus `MaterializeTrainingTaskSpecRequest.platform_id`.
  - Adapter-private fields such as PAI-DLC-specific request shape stay in adapter metadata.
- Implementation implication:
  - Readiness checks should block direct submission of `RecipeDraft`.
  - `GenerateRunRecipeRequest` should validate that required refs, versions, params, and protocol hashes are present.
  - `MaterializeTrainingTaskSpecRequest` should be the execution boundary, not `GenerateRunRecipeRequest`.

## PaperProject integration decision sync - 2026-05-12
- User accepted the traceability sidecar approach for `DP-06`.
- Decision:
  - `paper-project` consumes experiment-foundation outputs through `PaperExperimentSidecar`.
  - V1 should not expand core `PaperProject` DTOs with full dataset/baseline/benchmark/result structures.
  - `PaperExperimentSidecar` must preserve traceability through frozen refs, version locks, hashes, provenance refs, event log entries, and status snapshots.
- Required trace chain:
  - `PaperProject`
  - `PaperExperimentSidecar`
  - `EvidenceCandidate`
  - `ExperimentResult` / `FineTuningResult`
  - `ExternalTrainingJob`
  - `TrainingTaskSpec`
  - `RunRecipe`
  - `DatasetVersion` / `BaselineAsset` / `BenchmarkAsset` / `EvaluationProtocol`
  - `LiteratureRecord` / source refs
- Implementation implication:
  - Sidecar should record `runRecipeIds`, `experimentResultIds`, `evidenceCandidateIds`, `readinessReportIds`, `trainingTaskSpecIds`, and `externalTrainingJobIds`.
  - Sidecar should record dataset/baseline/benchmark/protocol version locks and hashes such as `datasetProtocolHash`, `evaluationProtocolHash`, `configSnapshotHash`, and `checksumManifestHash`.
  - Sidecar should record binding/refresh/accept/invalidated/superseded events.
  - If a canonical asset later changes, the sidecar remains a historical binding snapshot rather than silently following the latest asset state.

## Method recipe and tuning decision sync - 2026-05-12
- User clarified `DP-09`: experiment foundation should not implement automatic hyperparameter tuning, but it must support human-in-the-loop and LLM-in-the-loop tuning linked with paper implementation.
- Decision:
  - V1 supports reusable method recipe records: `TrainingStrategy`, `InferenceStrategy`, `OptimizerPreset`, `HyperparameterSpace`, `AblationPlan`, and `FineTuningStrategy`.
  - V1 supports controlled tuning workflow records: `TuningSession`, `TuningProposal`, `TuningDecision`, and `TuningTrial`.
  - V1 does not provide automatic hyperparameter optimization, background search loops, or unattended multi-run tuning.
  - Human/LLM-in-the-loop means proposals and analysis are recorded, decisions are auditable, and accepted changes flow through `RecipeDraft -> RunRecipe -> TrainingTaskSpec`.
- Implementation implication:
  - A tuning proposal may be authored by human, LLM, or system rule.
  - Proposal records must include changed params, rationale, source/result refs, expected effect, risk, budget/resource estimate, constraints, and rollback notes.
  - A proposal cannot submit a job directly.
  - A `TuningDecision` must be recorded before a proposal can create/update a recipe path that reaches execution.
  - `TuningTrial` must link the accepted decision to recipe draft, run recipe, task spec, result, and evidence candidate.
  - Paper implementation workflow should link to tuning sessions via implementation stage refs and sidecar trace refs.

## Evaluation fact-layer decision sync - 2026-05-12
- User clarified `DP-10`: evaluation must preserve enough structured data to support later paper tables and implementation decisions, but does not need a complete leaderboard.
- Decision:
  - V1 includes `MetricDefinition`, `EvaluationProtocol`, `ComparisonPolicy`, and `ResultValidationReport` for validity/comparability.
  - V1 also includes a structured fact layer: `EvaluationFact`, `MetricObservation`, `ComparisonObservation`, `ImplementationDecisionSignal`, and `PaperTableFactSet`.
  - Evaluation facts support later paper table generation and implementation judgement.
  - V1 does not implement a full leaderboard, ranking service, or final paper-table renderer.
- Implementation implication:
  - Metric observations should include result refs, recipe refs, asset/protocol versions, metric id, split/subset, seed/repeat, value, unit/direction, validation status, and provenance.
  - Comparison observations should include subject/baseline refs, deltas, statistical protocol output where available, fairness status, and interpretation tags.
  - Implementation decision signals should support `continue`, `adjust`, `rerun`, `abandon`, and `needs_more_data`, each with source facts and rationale.
  - Paper table fact sets should group eligible facts and expose missing-cell warnings, not render final manuscript tables.
  - Evaluation facts remain evidence inputs and must not bypass claim-evidence review.

## LLM fine-tuning sync - 2026-05-12
- Decision:
  - LLM fine-tuning is a first-class scenario in experiment foundation.
  - It is not a separate training platform and does not imply building an LLMOps platform in this repo.
  - It should be modeled as a specialized `TrainingTaskSpec` profile submitted through the same external platform adapter boundary.
- Minimum V1 support:
  - `BaseModelAsset`
  - `FineTuningDatasetAsset`
  - `FineTuningStrategy`
  - `FineTuningTaskProfile`
  - `FineTuningResult`
  - readiness gate
  - artifact collection for adapter/checkpoint/metrics/logs/model card
- Out of scope for V1:
  - automatic RLHF pipeline
  - automatic hyperparameter search
  - multi-node topology optimization
  - automatic model merge/release/deployment
  - automatic claim creation from fine-tuning result
- `DP-11` is confirmed as specialized `TrainingTaskSpec` profile.

## Deviations from plan
- None yet.

## Remaining follow-up TODOs
- Keep platform credentials as refs only; do not store secret values in task specs, registry payloads, adapter metadata refs, or docs.
- Keep PaperProject integration aligned with confirmed `DP-06`: use `PaperExperimentSidecar` frozen trace refs and do not copy reusable asset DTOs into core paper-project contracts.
- Track first-class tuning workflow work as a new task package if/when implementing `TuningSession`, `TuningProposal`, `TuningDecision`, and `TuningTrial`.
- Track real Aliyun SDK/credential hardening as a new task package; the T-077 adapter is intentionally SDK-free and mockable.
- Track candidate extraction/import as a new task package; current T-075/T-076 scope starts from grounded candidate payloads and promotion requests.
- Track typed asset workbench/API expansion as a new task package; current T-076/T-078 minimum loop uses the generic registry over frozen domain DTO payloads.
- Keep project hub sync/lint current after any follow-up task registration.
