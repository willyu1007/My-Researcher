# 07 Implementation Pack A Readiness Closure

## Closure status

- Review date: 2026-07-13
- Authorized activity: readiness closure plus the separately recorded 2026-07-13 Pack A implementation authorization
- Result: `implementation_authorized_in_progress`
- Subsequent Pack A result: `control_plane_source_binding_verified`
- Implementation authorized by the readiness-closure record: no; authorized by the user's subsequent explicit confirmation on 2026-07-13
- Prisma migration apply authorized by the readiness-closure record: no
- Product admission enable/cutover authorized by the readiness-closure record: no
- Pack: `Implementation Pack A — Phase 1 + D-19 minimal v2 spine`

The readiness closure froze the exact first-pack asset census, logical-to-Prisma family names, relational versus typed-snapshot placement, stable error reasons, verification IDs, current legacy population and a non-overlapping edit boundary. The required later user confirmation was received on 2026-07-13, and the authorized technical implementation subsequently completed. Existing-environment DB apply and product enable/cutover remain unauthorized by the readiness record.

## Post-readiness formal product outcome — 2026-07-15

The readiness record itself did not authorize product enablement, but the user subsequently granted explicit authorization for the formal PI scope → Pack A named-local landing. That operation is now complete: active PaperProject `P313` reached an admitted ValidationCycle through the normal PI routes, the dedicated v2 admission drained T1-T4, and the final EF inbox contains the sole exact acknowledgement. Final configuration retains committed named-local cutover while admission and Pack B simulation are off.

The product outcome satisfies the previously separate product-bound Pack A prerequisite without changing the original readiness population. The later authorization does not complete Pack B E1-E5, a non-local rollout, provider execution, scientific evidence, D-18 closure, UI/search or traffic enablement outside the reviewed named-local target.

## Post-readiness implementation outcome — 2026-07-13

- The implementation stayed inside the frozen Pack A population and did not require an OQ-23/D-23 expansion.
- Final schema census: 34 additive v2 models, comprising 6 PI and 28 EF models.
- A01-A04 and B01-B10 passed on isolated disposable PostgreSQL.
- Final run `packa-d19-source-policy-20260713-r2` passed A01-A04/B01-B10 and exact source-policy binding with `blockers=[]`; the earlier `SOURCE_POLICY_UNRESOLVED` technical-run result remains preserved as superseded history.
- The PASS is limited to control-plane source identity/license/access/integrity binding and does not establish extraction, scientific alignment, provider execution, existing-environment DB apply or product cutover.
- No existing database apply, capability enable, product cutover, provider/cloud call or scientific evidence generation occurred.
- Final evidence: `artifacts/implementation/00-pack-a-technical-closure.md` and `artifacts/implementation/01-pack-a-source-policy-closure.md`.

## Plan restatement

### Goal

Implement the smallest additive v2 persistence and service spine that proves:

1. five exact ExperimentFoundation asset families can be authored through typed CAS drafts, frozen as immutable server-hashed revisions and readied against exact dependency revisions;
2. PI can admit one immutable WorkOrder revision with `1..N` exact cells;
3. EF can exact-materialize one VersionLock, one RunRecipe and one TrainingTaskSpec per admitted cell, then freeze one batch Run;
4. PI can sequence-fenced CAS-advance the branch head;
5. EF can durably acknowledge the exact head event through the final inbox receipt.

### Included change surface

- new shared v2 contracts and canonical hash profiles;
- new PI v2 admission/head/inbox/outbox models, repositories, services and dedicated routes;
- new EF typed asset/readiness/materialization/Run/inbox/outbox models, repositories and services;
- one additive Prisma migration;
- one default-off admission configuration key;
- real-Postgres crash/replay/conflict tests and a D-19 gate runner.

### Explicit exclusions

- PaperProject/ValidationCycle bootstrap and candidate/import/promotion;
- ExecutionAttempt, provider request/job, ExternalTrainingJob and CollectionAttempt;
- ExperimentResult, scientific validation, EvidenceCandidate and RunEvidenceUnit;
- ValidationCycle closure/watermark/disposition and ResultInterpretationPacket;
- desktop UI, read model, search/embedding and semantic retrieval;
- legacy row backfill, annotation, trust upgrade, runtime union, dual read/write or fallback;
- product cutover and global legacy-writer shutdown.

## Exact D-19 typed asset census

The first migration contains exactly five top-level typed asset families. The allowlist is closed; no sixth wildcard or generic asset family may enter Pack A.

| Kind | Fixture cardinality | Why Pack A requires the kind | Named typed content | Excluded neighboring concepts |
|---|---:|---|---|---|
| `Dataset` | 2 revisions | RAGPerf requires a Wikipedia corpus and Natural Questions query workload | `DatasetRevisionContent@v1` includes version identity, checksum manifest snapshot, split protocol snapshot and exact DataPolicy revision ref/hash | DatasetMirror and provider storage are later execution work |
| `DataPolicy` | 2 dataset-specific revisions | the existing Apache-2.0 RAGPerf code policy does not authorize the external datasets | `DataPolicyContent@v1` | code-license policy cannot substitute for dataset policy |
| `MetricDefinition` | 17 revisions | preserve the source metric census and exact keys/types/units/evaluator bindings | `MetricDefinitionContent@v1` | evaluator remains a code-local capability, not a DB plugin asset |
| `Benchmark` | 1 revision | the v1 protocol is blocked by an unresolved benchmark forward ref; v2 must resolve the real benchmark | `BenchmarkContent@v1` references both Dataset revisions | reverse default-protocol ref is derived/display-only and excluded from readiness hash |
| `EvaluationProtocol` | 1 new v2 revision | D-17 requires canonical ordered typed rules and exact dependencies; T-131 v1 remains catalog-only | `EvaluationProtocolContent@v2` | no rewrite, trust upgrade or executable fallback from v1 |

`BaselineImplementationVersion`, `MethodRecipeComponent`, DatasetMirror, ExecutionProfile, platform/provider objects, candidate/promotion kinds and evaluator/plugin manifests are absent from Pack A. The existing v1 VersionLock requirement for at least one baseline and method lock is contract debt; the new v2 contract must not fabricate those assets.

### Dataset subcontracts

`ChecksumManifestSnapshot@v1` and `SplitProtocolSnapshot@v1` are named typed values inside `DatasetRevisionContent@v1`, not additional top-level asset families. DataPolicy remains an independent exact revision dependency. Dataset location availability uses an append-only lifecycle event plus current projection and is not part of the immutable scientific snapshot hash.

### Fixture dependency order

1. freeze two dataset-specific DataPolicy revisions and seventeen MetricDefinition revisions;
2. freeze two Dataset revisions with checksum/split snapshots, exact policy refs/hashes and location lifecycle projections;
3. freeze one Benchmark revision referencing both exact Dataset revisions;
4. freeze one EvaluationProtocol v2 revision referencing the Benchmark and MetricDefinition revisions;
5. create readiness attestations bottom-up, with the protocol attestation carrying the ordered transitive dependency manifest;
6. create a VersionLock whose ordered dependency rows cover `datasets[2] + policies[2] + benchmark[1] + protocol[1] + metrics[17]`;
7. create one RunRecipe and two cell-bound TrainingTaskSpecs.

### Adapter-tier rule fixture

All seventeen MetricDefinition revisions remain typed catalog facts. The adapter-tier EvaluationProtocol v2 activates only the following canonically ordered required rules:

1. `artifact_contract@v1:text_pipeline_stats` — exactly one `text_pipeline_stats.txt`, content hash required, parser binding `ragperf_text_pipeline_stats@v1`;
2. `metric_contract@v1:embedding_time_ns`;
3. `metric_contract@v1:generation_time_ns`;
4. `metric_contract@v1:prompt_time_ns`;
5. `metric_contract@v1:qps`;
6. `metric_contract@v1:rerank_time_ns`;
7. `metric_contract@v1:retrieval_time_ns`;
8. `metric_contract@v1:total_pipeline_time_ns`.

The seven RAGAS quality metrics and three resource metrics remain inactive catalog definitions for the adapter tier. `evaluate_result.csv` is not a required adapter-tier artifact. The first pack checks only rule-type readiness; Pack A creates no result or validation record.

Original-source dataset licenses and access terms were resolved by the exact attestation consumed in `packa-d19-source-policy-20260713-r2`. Deterministic test policies still cannot be reported as source-policy evidence, and the resulting control-plane source binding must not be reported as extraction or scientific readiness.

## Frozen Prisma family and invariant matrix

Final column spelling may change only through the implementation migration diff review when the replacement is mechanically equivalent and recorded in `07-implementation-readiness-review.md`. Model-family ownership and invariant placement are frozen.

| Owner | Frozen Prisma family | Required relational fields and constraints | Named typed JSON + server hash | Primary acceptance IDs |
|---|---|---|---|---|
| PI | `PaperImplementationExperimentWorkOrderBranchV2` | project/Cycle/branch identity; `unique(validationCycleId, branchKey)`; state version; current revision id/sequence; external EF head Run/manifest/event refs; conditional current/head CAS | `branchFrameJson` + `branchFrameHash` | A01, B01, B03, B06 |
| PI | `PaperImplementationExperimentWorkOrderRevisionV2` | branch FK; immutable revision sequence; `unique(branchId, revisionSequence)` and `unique(branchId, contentHash)`; cell-plan and approved-plan hashes | `workOrderSnapshotJson` + `contentHash` | A02, B01, B05 |
| PI | `PaperImplementationExperimentWorkOrderRevisionCellV2` | revision FK; ordinal, cell key, seed/repeat identity; `unique(revisionId, ordinal)` and `unique(revisionId, cellKey)` | `parametersJson`, `requiredResultContractJson`, `cellHash` | B02, B07 |
| PI | `PaperImplementationExperimentWorkOrderAdmissionV2` | revision FK unique; approved-plan hash; idempotency key unique; immutable actor/time | no open policy blob | A01, B01, B05 |
| PI | `PaperImplementationExperimentIntegrationInboxV2` | consumer/event id unique; consumer/business key unique; payload hash; outcome/status; exact event scope | typed event payload and stored outcome only | B03, B05, B06 |
| PI | `PaperImplementationExperimentIntegrationOutboxV2` | event id and aggregate-transition key unique; structured type/version/scope/correlation/causation; relay state is non-authoritative | typed event payload + payload hash | B01, B03, B05 |
| EF | `ExperimentFoundationDatasetV2` + `ExperimentFoundationDatasetRevisionV2` | logical identity; draft state-version CAS; immutable revision sequence/content hash; current revision relation | named dataset draft/revision snapshots only | A02, A03, A04 |
| EF | `ExperimentFoundationDataPolicyV2` + `ExperimentFoundationDataPolicyRevisionV2` | same identity/draft/revision pattern | named data-policy snapshots only | A02, A03, A04 |
| EF | `ExperimentFoundationMetricDefinitionV2` + `ExperimentFoundationMetricDefinitionRevisionV2` | same identity/draft/revision pattern | named metric-definition snapshots only | A02, A03, A04 |
| EF | `ExperimentFoundationBenchmarkV2` + `ExperimentFoundationBenchmarkRevisionV2` | same identity/draft/revision pattern; exact dataset dependency refs | named benchmark snapshots only | A02, A03, A04 |
| EF | `ExperimentFoundationEvaluationProtocolV2` + `ExperimentFoundationEvaluationProtocolRevisionV2` | same identity/draft/revision pattern; exact benchmark/metric dependency refs | named typed required-rule snapshots only | A02, A03, A04 |
| EF | `ExperimentFoundationAssetLifecycleEventV2` + `ExperimentFoundationAssetLifecycleProjectionV2` | closed asset-type enum; exact logical/revision refs; append-only sequence; current projection CAS | small typed reason/detail only | A04 |
| EF | `ExperimentFoundationReadinessAttestationV2` | exact target type/revision/hash; evaluator profile/hash; dependency-manifest hash; immutable outcome | qualification/blocker snapshot only | A04 |
| EF | `ExperimentFoundationReadinessDependencyV2` | attestation FK; ordinal; exact dependency type/revision/hash; `unique(attestationId, ordinal)` and exact-ref uniqueness | none | A04 |
| EF | `ExperimentFoundationVersionLockV2` + `ExperimentFoundationVersionLockDependencyV2` | materialization key unique; ordered exact dependencies; same key/same hash reuses, changed hash conflicts | resolved non-identity lock values + lock hash | B02, B05, B07 |
| EF | `ExperimentFoundationRunRecipeV2` | VersionLock/readiness FKs; materialization key unique | resolved parameters/config snapshot + recipe hash | B02, B05 |
| EF | `ExperimentFoundationTrainingTaskSpecV2` | RunRecipe FK; external PI revision/cell exact refs; materialization key unique | task command/input/output/resource/retry snapshot + TaskSpec hash | B02, B07 |
| EF | `ExperimentFoundationRunV2` | unique external PI WorkOrder revision; immutable Run id/manifest hash; no Attempt/provider/scientific status | no second Run-manifest JSON | B02, B07 |
| EF | `ExperimentFoundationRunCellV2` | Run and TaskSpec FKs; ordinal/cell/external PI cell uniqueness; exact PI cell/hash binding | cell scientific tuple only; manifest hash derives from ordered rows | B02, B07 |
| EF | `ExperimentFoundationIntegrationInboxV2` | EF consumer/event and business-key uniqueness; T2/T4 local outcome atomicity; final processed row is the sole acknowledgement | typed event payload and stored outcome only | B02, B04, B05, B06 |
| EF | `ExperimentFoundationIntegrationOutboxV2` | EF event and aggregate-transition uniqueness; structured event fields | typed event payload + payload hash | B02, B05 |

Five asset identity tables may contain only their correspondingly named draft JSON column. Five revision tables may contain only their correspondingly named immutable snapshot JSON column. A generic `assetKind/payload`, `recordKind/payload`, EAV property table or wildcard asset writer fails readiness.

## Stable error and outcome matrix

Pack A reuses the existing top-level `INVALID_PAYLOAD`, `NOT_FOUND`, `VERSION_CONFLICT`, `GATE_CONSTRAINT_FAILED` and `CONCURRENT_ADVANCE` response codes. `details.reason_code` provides the stable machine-actionable reason. The two-level code shape avoids collapsing all conflicts into prose while preserving the repository error envelope.

| Condition | HTTP / top-level code | Stable `details.reason_code` or outcome | Retry |
|---|---|---|---|
| v2 intake disabled | 409 / `GATE_CONSTRAINT_FAILED` | `PI_EXPERIMENT_V2_ADMISSION_DISABLED` | only after configuration enable |
| malformed typed snapshot/cell plan | 400 / `INVALID_PAYLOAD` | `V2_TYPED_SNAPSHOT_INVALID` or `WORK_ORDER_CELL_PLAN_INVALID` | after input correction |
| caller hash differs from server hash | 409 / `VERSION_CONFLICT` | `SERVER_CANONICAL_HASH_MISMATCH` | no |
| asset draft expected version stale | 409 / `VERSION_CONFLICT` | `ASSET_DRAFT_CAS_CONFLICT` | reload/rebase |
| asset/readiness exact revision missing | 404 / `NOT_FOUND` | `EXACT_REVISION_NOT_FOUND` | after dependency exists |
| dependency hash/revision drift | 422 / `GATE_CONSTRAINT_FAILED` | `READINESS_DEPENDENCY_DRIFT` | rebuild attestation |
| materialization key reused with changed hash | 409 / `VERSION_CONFLICT` | `MATERIALIZATION_KEY_CONFLICT` | no |
| Run cells differ from admitted cells | 422 / `GATE_CONSTRAINT_FAILED` | `RUN_CELL_PARITY_MISMATCH` | new revision/admission |
| second Run or changed manifest for one revision | 409 / `VERSION_CONFLICT` | `RUN_ALREADY_FROZEN` or `RUN_MANIFEST_CONFLICT` | no |
| event/business key reused with changed payload | 409 / `VERSION_CONFLICT` | `INTEGRATION_EVENT_PAYLOAD_CONFLICT` | no |
| valid prerequisite temporarily invisible | 422 / `GATE_CONSTRAINT_FAILED` | `INTEGRATION_PREREQUISITE_NOT_READY` | yes, same payload |
| lower branch sequence | 200 stored outcome | `ignored_stale` | no new domain/outbox write |
| head expected state/sequence changed | 409 / `CONCURRENT_ADVANCE` | `BRANCH_HEAD_CAS_CONFLICT` | reload exact head |
| same sequence references different Run/manifest | 409 / `VERSION_CONFLICT` | `BRANCH_HEAD_SCOPE_CONFLICT` | no |

Exact same-input replay returns the stored success/outcome and creates no duplicate row or event.

## Event and Unit-of-Work lock

The only business integration events are:

1. `WorkOrderRevisionAdmitted@v1`;
2. `RunManifestFrozen@v1`;
3. `BranchHeadAdvanced@v1`.

Every event envelope contains structured `event_id`, `event_type`, `schema_version`, `producer_domain`, `occurred_at`, `correlation_id`, `causation_id`, `business_idempotency_key`, exact project/Cycle/branch/revision/sequence scope and `payload_hash`. The typed payload adds only event-specific frozen values.

The only successful domain-authority commits are T1 PI admission/current-revision/outbox, T2 EF inbox/materialization/Run/outbox, T3 PI inbox/head/outbox and T4 EF final inbox acknowledgement. Relay lease/publish bookkeeping may commit separately and never becomes domain acknowledgement.

## Capability and interface lock

- New key: `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED`.
- Default: `false` in `env/contract.yaml`.
- Owner: PI product admission service.
- Effect: reject a new v2 admission before T1 with zero PI v2, EF v2 and legacy writes.
- Non-effect: the key cannot stop relay/consumers for a committed saga and cannot enable LocalScript/provider execution.
- Forbidden substitutes: `EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED`, database capability/eligibility rows and `dispatch_eligible` fields.

The first product write route is dedicated and versioned:

`POST /paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-work-orders/v2/admissions`

The request contains branch key/frame, immutable revision content, exact ordered cells and one business idempotency key. Existing legacy WorkOrder draft/admit/harness/live-adapter routes remain outside the v2 repository and cannot be called by the new service. Cross-domain event delivery uses typed in-process consumer ports plus DB outbox/inbox; Pack A introduces no unauthenticated internal HTTP mutation route.

Readback routes are project/scope filtered and side-effect free. Cross-project reads return the repository's established not-found/permission-safe outcome. Event logs include ids, types, sequences, outcomes and latency only; scientific payloads, dataset locations and credentials are not logged.

## Current population lock

### Source snapshot

- Git branch/HEAD: `main@f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- Worktree entries at snapshot: 95 modified/untracked entries
- Relevant Pack A schema/contract/route/controller/service/repository/migration files: clean
- Relevant source-population digest: `sha256:ea9673af733a6216342c0e42e6056c6d80232b2b0f00974a70639ef6c2d0f976`
- `prisma/schema.prisma`: `sha256:01683681554fa9d9960466f82794c2f84685b15bc880f250f3175cc4e28263b0`
- `env/contract.yaml`: `sha256:df10ac5a9b4f838ca7c208504fc70074456f7f7208e22dcec5edffad59de0ef9`
- legacy EF contract: `sha256:b77b57cb8d59341b96d19516f64e44120699d918b179ed571437ac1c3be7788b`
- legacy PI WorkOrder contract: `sha256:24b61817dd038ac0e1b74d590fa0b33f391d3444cb09b63950327ded5890eb8d`

The relevant digest covers Prisma schema, env contract, legacy shared contracts, app composition, PI/EF routes/controllers/services/repository ports and Prisma repositories, plus the EF core/external-job and PI WorkOrder legacy migrations. Implementation must recompute the digest or record an explicit reviewed delta before the first edit.

### Local development database snapshot

Read-only counts and full-row digests were captured from schema `my_researcher_dev` without changing rows:

| Legacy table | Rows | Full-row MD5 digest | Current status census |
|---|---:|---|---|
| `PaperImplementationResearchWorkOrder` | 1 | `760099753f1fd22e41ced1fe5acb0175` | `failed=1` |
| `PaperImplementationWorkOrderHarnessRun` | 1 | `2c44e87889dad879f70c759c4798406b` | `submitted=1` |
| `ExperimentFoundationRecord` | 231 | `7756349d166ea3092a3c78b45bf3b625` | 24 existing record kinds |
| `ExperimentFoundationReadinessReport` | 15 | `b99c61c132ec75b099911d04756440c4` | `passed=12`, `blocked=3` |
| `ExperimentFoundationExternalTrainingJob` | 6 | `107af190bc31f974567af51ccafcec29` | `running=1`, `succeeded=3`, `failed=1`, `cancelled=1` |

The submitted HarnessRun and running ExternalTrainingJob do not block an additive, default-off implementation. The two active legacy rows do block future product cutover until the legacy work is terminal or restarted as new v2 lineage. Pack A migration and tests must leave all five table counts/digests unchanged.

### Legacy writer/read population

- PI direct legacy WorkOrder/Harness/monitor/REU Prisma write calls: 7.
- EF generic record/readiness/external-job Prisma write calls: 9.
- v2 branch/revision/cell/head/Run/RunCell/inbox/outbox models and writers: 0 before implementation.
- Existing EF public routes expose generic POST/PUT writes and `latest readiness by target id`.
- Existing PI routes expose singular WorkOrder draft/admit, HarnessRun and live adapter writes.
- Existing governance JSONL/in-memory outbox has no D-20 authority.

Pack A must create new v2 contract/service/repository files rather than add v2 methods to legacy repository interfaces. Existing generic/legacy routes may remain registered during D-19 acceptance, but the new entrance and tests must prove zero invocation and zero legacy write.

## Edit-population lock

Implementation may add new v2 files and modify only the following existing integration points without a new readiness review:

- `prisma/schema.prisma` and one new additive migration directory;
- `env/contract.yaml` plus generated `env/.env.example`, `docs/env.md` and `docs/context/env/contract.json` through the repository env-contract workflow;
- `apps/backend/src/app.ts` for v2 composition;
- new dedicated shared contracts/tests under `packages/shared/src/research-lifecycle/`, plus `packages/shared/src/research-lifecycle/index.ts` and `packages/shared/package.json` exports;
- new dedicated PI/EF v2 routes, controllers, services, repositories and tests;
- `docs/context/api/openapi.yaml`, generated `docs/context/api/api-index.json`, `docs/context/registry.json` and generated `docs/context/db/schema.json` through their owning context/DB-SSOT workflows;
- T-132/T-124 canonical documentation and the predeclared D-19 gate script.

The following dirty T-124 surfaces are forbidden for Pack A edits: result-claim/dossier, runtime-admission, runtime slot services, live-provider semantics, REU writers/readers and existing shared runtime contracts. Any need to edit a forbidden surface means scope expansion and blocks implementation pending review.

## Readiness verification baseline

The readiness closure ran only non-mutating checks:

| Check | Outcome |
|---|---|
| T-132 strict docs lint | 8/8, 0 errors, 0 warnings before the readiness artifact |
| T-124 strict docs lint | 12/12, 0 errors, 0 warnings |
| project governance query/lint | T-132 `planned`, T-124 `in-progress`, lint passed |
| Prisma schema validate | passed with a non-connecting placeholder `DATABASE_URL`; the first invocation failed only because the variable was absent |
| shared typecheck | passed |
| backend `tsc --noEmit` | passed |
| targeted shared EF + PI WorkOrder schemas | 50/50 passed |
| EF service unit suite | 11/11 passed |
| EF execution service unit suite | 10/10 passed |
| PI WorkOrder bridge service unit suite | 17/17 passed |
| PI WorkOrder Prisma repository unit suite | 2/2 passed |
| scoped `git diff --check` | passed |

The green baseline proves that current legacy behavior is reproducible, not that D-22 exists. Existing tests still cover superseded generic records, singular WorkOrder/HarnessRun, LocalScript scientific writes and mixed evidence semantics; none may be counted as Pack A acceptance.

## Pack A acceptance IDs and commands

| ID | Required evidence |
|---|---|
| A01 | capability-off route returns the stable reason and all v2/legacy write counts remain zero |
| A02 | every named typed snapshot validates, canonicalizes and server-hashes; caller hash/tamper negatives fail |
| A03 | five asset drafts enforce expected-version CAS and immutable revision replay |
| A04 | exact readiness dependency manifests pass; target/dependency drift, revocation and `latest` lookup fail |
| B01 | T1 admission/current-revision/outbox commits or rolls back together |
| B02 | T2 inbox + exact VersionLock/Recipe/two TaskSpecs/Run/two cells/outbox commits or rolls back together |
| B03 | T3 inbox + exact-scope head CAS + outbox commits or rolls back together |
| B04 | T4 final EF inbox receipt is the only acknowledgement |
| B05 | exact replay converges without duplicate authority/events |
| B06 | payload conflict, stale sequence, missing prerequisite and same-sequence/different-manifest follow frozen outcomes |
| B07 | one revision→two exact cells→two TaskSpecs→one Run parity and derived manifest hash pass; every drift fails |
| B08 | excluded-table/write census is zero and all five legacy digests remain unchanged |
| B09 | schema/repository scans find zero cross-domain FK/relation/shared writer/generic v2 payload table |
| B10 | disabling new admission mid-saga still drains the committed chain to T4 and admits no second request |

Implementation verification must include:

```bash
pnpm --filter @paper-engineering-assistant/shared typecheck
pnpm --filter @paper-engineering-assistant/shared test
pnpm --filter @paper-engineering-assistant/backend prisma:validate
pnpm --filter @paper-engineering-assistant/backend typecheck
pnpm --filter @paper-engineering-assistant/backend test
node .ai/scripts/experiment-foundation-d19-spine-gate.mjs --run-id <run-id>
node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict
node .ai/scripts/lint-docs.mjs --path dev-docs/active/paper-implementation-productization-hardening --strict
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
```

The D-19 gate writes redacted machine-readable evidence under `.ai/.tmp/experiment-foundation-productization/<run-id>/`. `summary.json` contains `run_id`, `status`, capability state, fixture ids/hashes, checks with A01-B10 status/evidence paths, before/after legacy census/digests, v2/excluded write census, event/UoW outcomes and migration digest. A missing required ID makes the gate `failed`; an unavailable disposable Postgres makes the gate `blocked`, never passed.

## Migration, rollout and rollback review

- Migration is expand-only and creates only the frozen Pack A families, indexes and constraints.
- Migration must not alter, relate, populate, hash, annotate or delete a legacy table/row.
- DB apply requires a separate `sync-db-schema-from-code` diff preview and explicit approval.
- Implementation can merge with the v2 admission key still default `false`.
- Product enablement requires Phase 1 A01-A04 and D-19 B01-B10 evidence plus a separate approval.
- Rollback disables new v2 admission, drains committed outbox/inbox work to T4 and preserves all v2 rows/events for replay/audit.
- Rollback never drops additive v2 tables, rewrites v2 lineage, opens a legacy fallback writer or converts v2 rows into legacy rows.

## Review findings

### Must-fix before implementation authorization

None remain inside the approved readiness-closure scope. The exact five-kind census, model/invariant/error/test matrix, capability key, writer/schema population and verification baseline are frozen by the readiness-closure record.

### Must-fix before D-19 acceptance

1. ~~resolve original-source policy/license/access facts for both RAGPerf dataset revisions~~ — completed by `packa-d19-source-policy-20260713-r2` with canonical attestation digest `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`;
2. ~~implement and pass A01-A04 and B01-B10 on disposable real Postgres~~ — completed by `packa-d19-final-20260713-r2`;
3. ~~prove the migration diff contains no excluded family, cross-domain FK or legacy mutation~~ — completed;
4. ~~preserve the locked legacy digests~~ — completed inside the disposable gate; an independently observed external legacy transition still requires a fresh pre-cutover review.

No bounded Pack A D-19 acceptance item remains. The source-policy dependency was satisfied rather than bypassed. Extraction/scientific alignment and later execution/product gates remain explicitly outside Pack A acceptance.

### Must-fix before product cutover

1. ~~terminalize or explicitly account for the submitted legacy HarnessRun and running ExternalTrainingJob~~ — completed during the named-local Pack A landing review; historical rows remain unchanged/read-only;
2. ~~pass D-19 and obtain product enable/cutover approval~~ — disposable D-19 passed and subsequent explicit authorization opened the named-local product landing;
3. ~~close overlapping legacy product writers in the cutover release without restoring fallback on rollback~~ — named-local committed cutover remains enabled; admission is now closed and there is no legacy fallback.

## Authorization recommendation

The readiness record plus subsequent independently authorized operations now support bounded Pack A control-plane source binding, named-local schema landing and formal PI product admission-to-ack closure. Pack B E1-E5 and every non-local/provider/scientific/closure/UI slice remain separate gates; relevant scope drift or edits to forbidden T-124 surfaces still reopen review.
