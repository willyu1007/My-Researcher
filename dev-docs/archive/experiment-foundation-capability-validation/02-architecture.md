# 02 Architecture

## Validation Boundary
T-090 validates the experiment foundation as an integrated capability, but it does not create new ownership semantics.

The canonical ownership remains:
- Shared contracts: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`
- Registry/readiness/promotion API: T-076 backend service/routes/repositories
- Execution job lifecycle: T-077 execution service/routes/repositories
- Desktop workbench: T-078 renderer module consuming existing APIs
- Parent backlog/closure umbrella: T-043

## Test Layers
| Layer | Purpose | Default? |
|---|---|---|
| Shared schema regression | Prove contracts still reject boundary drift | yes |
| Backend service scenario | Prove registry/readiness/promotion/execution behavior through services | yes |
| Backend route scenario | Prove public REST routes and error envelopes | yes |
| External adapter fake/smoke | Prove LocalScript and mocked Aliyun boundaries | yes, credential-free |
| Desktop smoke/e2e | Prove operator workbench consumes APIs correctly | yes if local desktop test harness is available |
| Prisma/live DB smoke | Prove migrations and repositories against Postgres | opt-in only |
| Real cloud canary | Prove actual Aliyun SDK/credential path | out of scope unless a later task owns it |

## Harness / Fixture Design
T-090 should use a small three-layer test design. The goal is to make scenario tests readable without creating a second experiment-foundation implementation in test code.

### 1. Fixture Builders
Suggested file:
- `apps/backend/src/services/experiment-foundation-scenario-fixtures.ts`

Responsibilities:
- build deterministic, contract-valid payloads;
- provide `ref(type, id)` and deterministic hash helpers;
- build graph-level fixture groups, not isolated ad hoc objects.

Suggested builders:
- `datasetGraphFixture()`
- `protocolGraphFixture()`
- `runRecipeGraphFixture()`
- `trainingTaskGraphFixture()`
- `resultGraphFixture()`
- `candidateFixture()`
- `unsafeCandidateFixture(overrides)`
- `staleMirrorFixture()`
- `restrictedPolicyFixture()`

Rules:
- use shared experiment-foundation TypeScript types and JSON schema constants;
- fixture IDs and hashes are deterministic;
- overrides are allowed, but the default fixture must be fully valid;
- fixtures must not store raw datasets, checkpoints, model weights, credentials, SDK payloads, or adapter-private payloads.

### 2. API Scenario Harness
Suggested file:
- `apps/backend/src/services/experiment-foundation-capability-harness.ts`

Responsibilities:
- drive public Fastify routes through `buildApp().inject()`;
- create a readable API for scenario tests without owning business semantics;
- centralize stable response/error assertions.

Suggested helpers:
- `buildExperimentFoundationHarness()`
- `createRecord(kind, payload)`
- `upsertRecord(kind, id, payload)`
- `getRecord(kind, id)`
- `listRecords(filters)`
- `checkReadiness(targetRef)`
- `promoteCandidate(candidateId, request, result)`
- `submitJob(payload)`
- `syncJob(jobId)`
- `cancelJob(jobId)`
- `collectJob(jobId)`
- `expectError(response, code, status)`

Rules:
- prefer route-level tests for capability proof;
- use service-level setup only for edge cases that are awkward or noisy through routes;
- harness helpers must not recompute readiness, promotion, materialization, validation, or adapter semantics.

### 3. External Fakes
Suggested file:
- `apps/backend/src/services/experiment-foundation-external-fakes.ts`

Responsibilities:
- isolate LocalScript temp execution roots and fixture scripts;
- provide a configurable fake Aliyun PAI-DLC client;
- model external success/failure deterministically without real cloud credentials.

Suggested helpers:
- `createLocalScriptExecutionRoot()`
- `writeAllowedLocalScript()`
- `writeUnsafeLocalScriptCase()`
- `FakeAliyunPaiDlcClient`
- `fakeAliyunSuccess()`
- `fakeAliyunStaleMirror()`
- `fakeAliyunChecksumMismatch()`
- `fakeAliyunRestrictedWithoutApproval()`

Rules:
- LocalScript uses OS temp or a shallow controlled test root and cleans up after itself;
- Aliyun remains SDK-free and credential-free in T-090;
- fakes return refs, hashes, and adapter metadata refs, never inline private payloads.

### Suggested Test File Split
1. `experiment-foundation-capability-registry-readiness.test.ts`
2. `experiment-foundation-capability-automation.test.ts`
3. `experiment-foundation-capability-local-script.test.ts`
4. `experiment-foundation-capability-aliyun-boundary.test.ts`
5. `experiment-foundation-capability-result-evidence-sidecar.test.ts`
6. `experiment-foundation-capability-adjacent-flow.test.ts`

Desktop smoke should be added after backend/API scenario coverage is stable, because desktop coverage can be affected by unrelated renderer work in adjacent task lines.

## Capability Matrix
| Capability | Inputs | Expected output | Main risk |
|---|---|---|---|
| Dataset registry | asset/version/location/mirror/policy payloads | stored records + metadata indexes | asset/version/mirror semantic drift |
| Readiness | target refs + source refs | persisted readiness report | stale or missing blockers pass unnoticed |
| Candidate promotion | candidate + request/result | request/result records + candidate status | unsafe auto-promotion or canonical lifecycle pollution |
| Recipe/materialization precondition | locked run recipe + materialization result | task spec ready for execution | draft or unlocked payload reaches submit |
| LocalScript submit | task spec + materialization + readiness | job + stage events | unsafe command/path execution |
| Mock Aliyun submit | task spec + ready mirror + policy approval | job + metadata refs | cloud mirror treated as canonical or private payload leakage |
| Collect/validate | job + adapter output | result, validation, facts, evidence | invalid results become evidence or claims |
| Paper sidecar refs | result/evidence/facts/locks refs | sidecar refs/hashes/snapshots | DTO copy into paper project |
| Desktop operations | user actions + JSON payloads | API mutations/status rendering | renderer reimplements domain logic |

## Detailed Test Matrix
| Test object group | Primary objects/routes | Happy-path proof | Required negative/robustness proof | Default suite |
|---|---|---|---|---|
| Registry and readiness | `dataset_asset`, `dataset_version`, `dataset_location`, `dataset_mirror`, `data_policy`, `benchmark_asset`, `evaluation_protocol`, `baseline_asset`, `/experiment-foundation/records`, `/experiment-foundation/readiness/check` | frozen DTO payloads can be created/listed/read/upserted and readiness reports can be persisted/read | missing hashes, stale mirror, non-ready version, unsupported `record_kind`, forbidden private fields, `external_training_job` registry write rejection | yes |
| Automation API flow | registry routes, readiness routes, candidate promotion route, execution job routes | scripted create/upsert/check/promote/submit/sync/cancel/collect flow can run repeatedly | duplicate create returns `VERSION_CONFLICT`, missing refs return `NOT_FOUND`, gate failures return `GATE_CONSTRAINT_FAILED`, malformed DTOs return `INVALID_PAYLOAD`, repeated cancel/collect is deterministic | yes |
| Candidate promotion | candidate records, `asset_promotion_request`, `asset_promotion_result`, `/experiment-foundation/candidates/:candidate_id/promotion` | eligible low-risk candidate records request/result and updates candidate status | low confidence, duplicate, incomplete, unclear/restricted policy, high/restricted risk, missing canonical refs, embedded canonical DTOs | yes |
| Recipe/materialization preconditions | `version_lock`, `run_recipe`, `training_task_spec`, `training_task_materialization_result` | locked recipe and materialization result can feed execution submit | draft-shaped payload, missing `run_recipe_hash`, missing `version_lock_hash`, non-passed readiness, stale materialization, platform-private payload leakage | yes |
| LocalScript external boundary | `LocalScriptAdapter`, `TrainingTaskSpec`, execution job routes | `submit -> sync -> collect` creates job, stage events, result, validation, facts, and eligible evidence | non-test disabled execution, command not in allowlist, unsafe cwd/output path, missing readiness, stale materialization, unexpected script failure | yes |
| Mock Aliyun external boundary | `AliyunPaiDlcAdapter`, `dataset_mirror`, `data_policy`, adapter metadata refs | ready/fresh mirror with checksum match and policy approval can create job and metadata refs | no mirror, stale mirror, checksum mismatch, unsupported provider, restricted/private/approval-required policy without approval, credential/sdk/private payload leakage | yes |
| Result/evidence validation | `ExperimentResult`, `FineTuningResult`, `ResultValidationReport`, `EvaluationFact`, `MetricObservation`, `ComparisonObservation`, `EvidenceCandidate` | collected outputs create valid/accepted evidence only through validation reports | invalid/partial/unvalidated result cannot create evidence, metric-only facts rejected, paper-claim/final-conclusion/leaderboard/final-table fields rejected | yes |
| Sidecar and adjacent flow | `PaperExperimentSidecar`, result/evidence/fact refs, version lock hashes/snapshots | paper/research adjacent flow can consume refs/sidecar refs | full reusable DTO copies rejected, adjacent modules do not create second job lifecycle, no final claim/table generated from unvalidated result | yes |
| Desktop workbench smoke | `ExperimentFoundationModule`, API client, registry/readiness/jobs/evidence panels | operator can navigate, list/create/readiness-check/submit/sync/collect/inspect evidence through API-backed UI | errors render stable codes, UI does not own readiness/promotion/materialization/result-validation semantics, no legacy CSS | yes when desktop harness is available |
| Prisma/live DB smoke | Prisma repositories and generated migrations | migrated test DB can persist registry/readiness/job records | missing/unapplied migrations, DB uniqueness conflict mapping, transaction rollback | opt-in |
| Real cloud canary | future real Aliyun SDK/credentials path | real cloud job can be submitted and collected | credential isolation, cost control, SDK/API drift | out of scope for T-090 |

## Critical-node Deep-test Matrix
Every critical node below should have node-specific assertions across functional behavior, integration, robustness, and quality dimensions.

| Node | Functional proof | Integration proof | Robustness / failure proof | Quality / safety proof |
|---|---|---|---|---|
| N1 Registry write/read/upsert | create/list/read/upsert works for frozen canonical and operational payloads | stored record metadata can be consumed by readiness, promotion, execution, and UI filters | duplicate create, unsupported kind, invalid schema, forbidden DTO aliases, `external_training_job` generic write rejected | payload remains JSON DTO only; no raw data, credentials, or adapter-private blobs |
| N2 Readiness gate | readiness produces `passed/blocked/stale/unknown` reports | submit/materialization gates consume latest readiness report | missing hash/ref, stale mirror, non-ready dataset version, invalid result, unknown target | blockers/actions/source refs are explicit and persisted |
| N3 Candidate promotion | eligible candidate records request/result and updates status | canonical refs in promotion result can be resolved by registry | low confidence, duplicate, incomplete, unclear/restricted policy, high risk, missing canonical refs | candidate lifecycle does not leak into canonical asset lifecycle |
| N4 Version lock and RunRecipe | locked `RunRecipe` carries dataset/protocol/baseline/method/readiness hashes | materialization consumes only locked, platform-neutral recipe inputs | draft-shaped payload, missing hashes, blocked/stale readiness, platform-private fields | immutable/hashable recipe; no path/mirror/vendor/private payload leakage |
| N5 Materialization and TrainingTaskSpec | valid recipe/materialization creates normalized task spec payloads | execution submit consumes `training_task_spec` and materialization refs/hashes | missing runtime/config/task hashes, mismatched profile, stale materialization | adapter metadata represented by refs/hashes only |
| N6 Submit external job | LocalScript and mocked Aliyun submit create job and stage refs | sync/cancel/collect can consume returned job refs and status | missing readiness, hash mismatch, idempotency conflict, unsafe LocalScript command/path, Aliyun mirror/policy failure | job state is only owned by execution API/table; no generic registry job writes |
| N7 Sync and cancellation | status sync and cancel update job state and append events | cancellation request refs can be traced from job events | repeated sync/cancel, unknown remote status, cancelled/succeeded conflict, adapter failure | deterministic idempotency and auditable stage/cancellation refs |
| N8 Collect and result validation | collect creates result, validation, facts, partial refs, and eligible evidence | evidence/sidecar consume result and validation refs | missing metrics/artifacts/config, invalid/partial result, protocol mismatch, adapter output failure | invalid result cannot become evidence; no claim/table/leaderboard fields |
| N9 Evidence and sidecar | evidence and sidecar records carry refs/locks/hashes/snapshots | adjacent paper/research flows can consume refs without DTO copies | unvalidated evidence, full reusable DTO copies, final paper claim text, stale lock snapshots | facts remain facts; paper sidecar remains trace attachment |
| N10 Desktop operator workflow | UI renders registry/readiness/promotion/jobs/evidence operations | UI uses existing backend APIs and shared types | API errors, malformed JSON, long blockers/errors, missing selection, stale selected record | renderer does not own readiness/promotion/materialization/result validation; no legacy CSS |
| N11 Adjacent workflow boundary | paper/research side can validate experiment refs/sidecar refs | no-copy handoff remains compatible with existing workflow contracts | adjacent module attempts to copy DTOs or create parallel job/result lifecycle | regression checks prevent hidden second track |

## Deep-test Dimensions
For each node, classify test cases by dimension:
- **F** functional correctness;
- **C** contract/schema enforcement;
- **I** integration with upstream/downstream nodes;
- **S** state transition, idempotency, and retry behavior;
- **R** robustness under stale/missing/partial/failed inputs;
- **D** data safety and security boundary;
- **T** traceability/audit fields;
- **Q** quality gates: deterministic, isolated, maintainable, no semantic duplication.

T-090 acceptance should not count a critical node as covered unless at least `F + I + R + T` are represented, and any security-sensitive node must include `D`.

## Recommended Scenario Flow
1. Build the minimal valid experiment graph: dataset asset/version/location/mirror/policy -> benchmark/protocol/baseline -> version lock/run recipe -> task spec/materialization result.
2. Run registry/readiness route scenarios over that graph.
3. Run candidate promotion scenarios with both eligible and unsafe candidates.
4. Execute the LocalScript happy path: `submit -> sync -> collect -> validate -> evidence`.
5. Execute LocalScript negative cases for execution safety, readiness, stale materialization, and idempotency.
6. Execute mocked Aliyun success and gate-failure cases for mirror/checksum/policy/private-payload boundaries.
7. Validate result/evidence/sidecar behavior, including invalid and partial result paths.
8. Validate adjacent-flow no-copy/no-second-track contracts.
9. Run desktop operator smoke against deterministic route responses or local backend.
10. Keep live Postgres and real cloud checks separate from the default suite.

## Automation Contract
Automated tests should prefer public REST routes for scenario coverage, and use services only for focused edge cases that are hard to express through route setup.

Automation must assert:
- idempotency keys return existing job/record when intended;
- conflicting idempotency keys return `VERSION_CONFLICT`;
- gate failures return `GATE_CONSTRAINT_FAILED`;
- invalid DTOs return `INVALID_PAYLOAD`;
- missing referenced records return `NOT_FOUND`;
- repeated sync/collect/cancel calls are deterministic.

## External Interaction Contract
LocalScript:
- `NODE_ENV=test` may auto-enable local execution.
- Non-test execution requires explicit opt-in.
- Commands must use `child_process.spawn` with `shell=false`.
- cwd/input/output paths must stay under the configured execution root.
- command allowlist must be enforced.

Mocked Aliyun:
- no real SDK dependency or credentials;
- fake client injection controls remote states;
- dataset mirrors must be `ready` and `fresh`;
- mirror provider must be `aliyun_oss` or `pai_dataset`;
- checksum hash must match the locked dataset version;
- restricted/private/approval-required policies require approval refs.

## Adjacent Workflow Contract
Adjacent modules may consume:
- `ExperimentFoundationRef`
- `PaperExperimentSidecar` refs
- result/evidence/fact refs
- version lock hashes and snapshots

Adjacent modules must not:
- copy `DatasetAsset`, `DatasetVersion`, `BenchmarkAsset`, `BaselineAsset`, `EvaluationProtocol`, `RunRecipe`, `TrainingTaskSpec`, or result DTOs into their own state;
- create a second external job lifecycle;
- generate final claims, rankings, or paper tables directly from unvalidated experiment results.

## Data Safety
Tests must not store:
- raw datasets;
- checkpoints or model weights;
- credentials, access keys, SDK payloads, endpoint-private payloads;
- cloud platform request/response bodies inline in public DTOs.

Allowed test artifacts:
- small synthetic metrics/log text;
- local temp files under OS temp or controlled test fixture roots;
- refs/hashes to fake artifacts;
- adapter metadata refs pointing to fake metadata artifacts.
