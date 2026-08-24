# 07 Quality Closure Review

> Historical closure record. References to retired `.ai` paths below are provenance, not current
> commands or storage contracts.

## Purpose
本文件用于把外部设计审查报告的高价值观点，对照当前 repo 实际状态，收口为母包级质量结论。

## Deep Re-review - 2026-05-19
结论：repo 已满足 T-070~T-078 定义的实验基座最小可操作闭环，但不满足母包最初概念范围中的所有产品化功能要求。因此：
- `T-069` through `T-078`: closed.
- `T-043 experiment-foundation-v1`: remains `planned` as parent closure/backlog umbrella, not as an implementation lane.
- No new experiment-foundation semantics should be implemented inside `literature`, `research-argument`, or `paper-project`; those modules should consume existing refs/sidecars.

Post-review cleanup:
- Removed obsolete temporary UI-gate evidence directories for T-078 from `.ai/.tmp/ui/`.
- Split parent acceptance wording into minimum closed criteria and explicit follow-up scope.
- Replaced stale parent implementation TODOs that still described already-completed S1/S2/S7/S9 work.
- Removed `external_training_job` from generic registry record kinds so execution job state has one owner: the T-077 execution table/API.

结论分两层：
- 任务治理和设计分包已经闭环：`T-069` 已把审查观点吸收进母包和子包边界。
- 产品最小实现链路已经闭环：T-070~T-075 shared contracts/schema tests、T-076 DB/API/readiness、T-077 execution adapters、T-078 desktop workbench 已形成最小可操作链路。

## Review Report Alignment
| Review point | Current package guard | Owner |
|---|---|---|
| S1 过大，需要拆为最小闭环和薄壳扩展 | 母包 roadmap 和子包顺序拆为 S1-A / S1-B；先 `T-070` 合同，再逐步进入 API/UI/adapter | Parent + T-070 |
| `DatasetAsset` 与版本/存储/校验语义重叠 | `DatasetAsset` 只保留 identity；`DatasetVersion` / `ChecksumManifest` / `DatasetLocation` / `DatasetMirror` 分别 owning 版本、校验、本地引用和云执行镜像 | T-070 |
| `BenchmarkAsset` 与评测协议语义重叠 | `BenchmarkAsset` 只保留 identity/testbed；`EvaluationProtocol` owns metrics/evaluator/reporting/statistics/comparison/budget/tuning rules | T-071 |
| 缺少一等版本锁 | `RunRecipe` 必须锁 dataset version/hash、baseline implementation version、evaluation protocol version/hash、method component versions | T-072 |
| Fine-tuning 绕过主流程 | Fine-tuning 只能走 `RecipeDraft -> RunRecipe -> TrainingTaskSpec(profile=llm_fine_tuning)` | T-072 + T-073 |
| `RunRecipe` 与平台 adapter 边界不清 | `RunRecipe` 只存能力需求和锁；平台选择在 `MaterializeTrainingTaskSpecRequest.platform_id` | T-073 |
| `EvidenceCandidate` 过薄 | 候选必须带 result/evaluation fact/provenance/validation/quality/risk/reviewer fields；invalid result 不得成为 evidence | T-074 |
| candidate 状态污染 canonical lifecycle | canonical asset lifecycle 不含 `candidate`；candidate review status 单独建模 | T-075 |
| 云 mirror 与 canonical registry 冲突 | 本地 registry 是 canonical metadata + file refs；cloud mirror 只是 execution mirror | T-070 + T-077 |
| evaluation facts 被误用为 leaderboard/claim | Evaluation fact layer 只存可追溯事实，不生成最终 leaderboard/table/claim | T-074 |
| `PaperExperimentSidecar` owner 不清 | Sidecar 只存 refs/locks/hashes/snapshots/event entries，不复制完整 DTO | T-074 |

## Semantic Drift Guard
| Boundary | Guarded wording |
|---|---|
| Dataset identity | `DatasetAsset` MUST NOT own version/checksum/storage/mirror fields. |
| Dataset version | `DatasetVersion` owns immutable version identity, policy snapshot, split/process refs, manifest refs, and checksums. |
| Benchmark identity | `BenchmarkAsset` owns task/testbed identity; it does not own mutable evaluator/protocol rules. |
| Evaluation protocol | `EvaluationProtocol` is versioned/hashable and owns metrics, evaluator, reporting, statistics, comparison, budget, and tuning rules. |
| Recipe path | `RecipeDraft` may be incomplete; only valid `RunRecipe` can materialize a `TrainingTaskSpec`. |
| Platform boundary | `RunRecipe` remains platform-neutral; platform choice and adapter-private metadata stay at materialization/adapter boundary. |
| Evidence boundary | Evidence candidates are validated result-derived artifacts, not claim text or claim acceptance. |
| Paper bridge | Paper project stores sidecar refs/locks/snapshots, not reusable asset DTO copies. |

## Current Repo Closure Check
| Area | Repo evidence | Closure |
|---|---|---|
| Task governance | Parent and child task bundles exist; `T-069` through `T-078` are marked done | T-070~T-078 minimum chain closed |
| Shared contracts | `experiment-foundation-contracts.ts` contains T-070 through T-075 contract subsets | Closed for frozen shared contract surface |
| Contract tests | `experiment-foundation-contracts.schema.test.ts` covers forbidden-field aliases, platform-private boundaries, evidence guards, sidecar no-copy guards, candidate gates, and execution job API wrappers | Closed for shared-contract slices |
| Persistence/API | T-076 adds generic registry/readiness persistence, repositories/services, REST routes, readiness gates, and candidate promotion persistence | Closed for minimum backend loop |
| Execution adapters | T-077 adds dedicated `ExternalTrainingJob` persistence, LocalScript execution, mocked Aliyun PAI-DLC boundary, submit/sync/cancel/collect APIs, result validation, and evidence creation; job state is not writable through generic registry records | Closed for minimum backend loop |
| Desktop UI | `coreNavItems` now places `实验基座` below `文献管理`; `ExperimentFoundationModule` exposes registry/readiness/promotion/recipe/materialization/job/evidence views | Closed for minimum operational workbench |
| Evidence/paper integration | T-074 defines sidecar contracts; T-077 creates result/evidence records; T-078 exposes evidence and sidecar records through registry/evidence views | Minimum closed; dedicated paper-project bridge UI remains follow-up |

## Full Requirement Closure Review
| Requirement area | Repo status | Closure |
|---|---|---|
| Dataset/benchmark/baseline/protocol contracts | Shared contracts and negative schema tests exist | Closed |
| Version locks, recipe path, materialization boundary | Shared contracts enforce platform-neutral `RunRecipe` and materialized `TrainingTaskSpec` | Closed for minimum chain |
| Persistence/API/readiness | Generic registry, readiness reports, repositories, services, REST routes, and candidate promotion persistence exist | Closed for minimum chain |
| Execution and evidence | LocalScript path and mocked Aliyun boundary create job/result/validation/evidence records | Closed for minimum chain |
| Desktop workbench | Registry/readiness/promotion/recipe/execution/evidence operation surfaces exist below `文献管理` | Closed for minimum chain |
| Literature-to-candidate import | No automatic extraction/import service is implemented | Follow-up |
| Canonical asset synthesis from promotion | Promotion requires existing canonical refs and does not synthesize canonical DTOs | Follow-up |
| First-class tuning workflow | `TuningSession/TuningProposal/TuningDecision/TuningTrial` are conceptually scoped but not implemented | Follow-up |
| Full base-model/fine-tuning-dataset registries | Fine-tuning path is modeled through locks/task profile/result; full reusable registries are not implemented | Follow-up |
| Dedicated recipe/materialization generation services | Desktop writes frozen payloads through registry; no generator service is implemented | Follow-up |
| Dedicated paper-project bridge UI/API | Sidecar contracts and registry views exist; paper-project attachment workflow is not implemented | Follow-up |
| Real cloud SDK/credential execution | Aliyun path is SDK-free and mockable; no real credentials/cloud submit path | Follow-up |
| Live DB application and full DB smoke | Repo migrations and DB context exist; live DB migration application is out of scope | Follow-up |

## Follow-up Validation Package
- `T-090 experiment-foundation-capability-validation` is complete as of 2026-05-24.
- It proved automation, external-boundary behavior, result/evidence creation, sidecar compatibility, desktop/API operation, and adjacent-flow robustness against the T-070~T-078 minimum chain.
- The validation package did not expand product semantics; it added tests/harnesses and narrowly fixed the adjacent workorder bridge no-copy guard exposed by validation.

## Code Quality Review
Quality signals:
- T-078 is UI-only and does not change backend/shared/Prisma contracts.
- Desktop imports shared experiment-foundation constants/types instead of duplicating renderer enums.
- Desktop bridge now allows `PUT` and `/experiment-foundation/**`, matching existing T-076 upsert/API paths.
- Renderer JSON editors only transport frozen contract payloads to backend APIs; they do not own readiness, promotion, materialization, adapter execution, or result validation semantics.
- No `apps/desktop/src/renderer/styles/**`, `app-layout.css`, token, or UI contract change was added.
- UI governance initially caught dynamic `data-tone`; the fix uses explicit data-ui tone literals and the gate now passes.
- The current worktree has unrelated dirty files from other task lines; T-078 changes must be staged/reviewed separately.

## Functional Closure Result
当前功能需求已完成最小后端 + 桌面操作闭环，但不是完整实验平台、完整调参系统、完整候选抽取系统或完整论文桥接产品。

已经闭环的是：实验基座设计审查吸收、任务包拆分、职责边界和执行顺序；T-070 dataset registry；T-071 benchmark/protocol/baseline；T-072 version-lock/recipe；T-073 materialization/adapter-boundary；T-074 result/evidence/sidecar；T-075 candidate promotion；T-076 persistence/API/readiness；T-077 execution adapters；T-078 desktop workbench。

为避免语义漂移，母包暂不把以下能力伪装成已实现：完整 `TuningSession/TuningProposal/TuningDecision/TuningTrial` 产品化链路、真实 Aliyun SDK/凭证接入、专门的 paper-project bridge UI。这些应作为 closure decision 后的 follow-up 小包，而不是混入 T-078。
