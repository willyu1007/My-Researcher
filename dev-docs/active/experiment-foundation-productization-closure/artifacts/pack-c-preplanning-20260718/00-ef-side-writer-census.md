# T-132 Phase 4 pre-planning survey: current ExperimentFoundation result, validation, and evidence paths

Survey scope: current repository code in `packages/shared`, `apps/backend`, and `prisma/schema.prisma`, with D-16/D-17 as the target semantics. “Current” distinguishes code that still exists and is internally callable from HTTP mutation routes that are blocked in the named-local cutover configuration.

## Executive findings

- The three legacy scientific object kinds—`experiment_result`, `result_validation_report`, and `evidence_candidate`—are all stored as rows in the single generic `ExperimentFoundationRecord` table, not dedicated Prisma tables.
- There are two underlying creation mechanisms:
  - `ExperimentFoundationExecutionService.collectJob()` creates all three through private helpers.
  - `ExperimentFoundationService.createRecord()` and `upsertRecord()` accept caller-supplied payloads for all three generic record kinds.
- Three HTTP entrances can reach those writers:
  - generic EF record POST/PUT;
  - direct legacy EF job collection;
  - the PI live-experiment collection wrapper.
- Those routes are registered but carry `legacyExperimentMutationOnRequest`. With named-local cutover enabled, requests are rejected before controller execution. The underlying services and repositories remain present and internally callable.
- Legacy `EvaluationProtocol` is typed only at its outer object. Its eight policy blocks are open `Record<string, unknown>` / `additionalProperties: true` JSON.
- The legacy collector does not load or execute those policy blocks. It heuristically checks locked metric definitions, generic artifact presence, job status, and trace-hash presence.
- Pack A already introduced a typed `EvaluationProtocol` v2 snapshot with one `required_rules` array and the closed rule union `metric_contract@v1 | artifact_contract@v1`. Current v2 code validates rule shape, rule bindings, and readiness support, but does not execute the rules against scientific batch results.
- Partial acceptance remains fully represented in legacy contracts and code: `accept_partial`, `accepted_partial`, `partial_acceptance_ref`, partial materialization, partial-result records, and EvidenceCandidate creation from accepted-partial validation.
- Pack A and Pack B v2 persistence extends through `Run`/`RunCell` and provider-control/diagnostic provisional outputs. There is no v2 Prisma table for scientific result, scientific validation, EvidenceCandidate, RunEvidenceUnit, Cycle closure, or closure snapshot.
- Legacy LocalScript and the legacy default fake Aliyun client can create scientific result/validation/evidence if the HTTP guard is bypassed through internal service calls or cutover is false. No underlying legacy writer checks `adapter_kind`, external-job reference type, or fake metadata before writing.
- Pack B v2 has explicit simulation/fake provenance identifiers and writes only `ProvisionalOutputV2`; it currently has no scientific writer at which to apply the required rejection.

## 1. Current writer and creation paths

### 1.1 Generic legacy record authority

The generic record-kind allowlist explicitly includes all three target kinds:

- `EXPERIMENT_FOUNDATION_RECORD_KINDS`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:505`.
- `experiment_result`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:539`.
- `result_validation_report`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:541`.
- `evidence_candidate`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:547`.
- `ExperimentFoundationRecordKind`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:565`.
- `CreateExperimentFoundationRecordRequest`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1662`. It contains only `record_kind` and an open record payload.
- `createExperimentFoundationRecordRequestSchema`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:4653`. Route-level validation accepts an allowed `record_kind` and an object payload at lines 4657–4660. Kind-specific validation happens in the service.

Service writers:

- `ExperimentFoundationService.createRecord`: `apps/backend/src/services/experiment-foundation-service.ts:411`.
  - Resolves the kind at line 412.
  - Validates the kind-specific payload at line 413.
  - Derives identity/hash/status metadata at line 414.
  - Checks for an existing row at lines 415–422.
  - Calls repository `createRecord` at lines 424–441.
- `ExperimentFoundationService.upsertRecord`: `apps/backend/src/services/experiment-foundation-service.ts:444`.
  - Resolves and checks the path/body kind at lines 449–452.
  - Validates the caller payload at line 453.
  - Checks the derived identity against the path at lines 454–457.
  - Calls repository `upsertRecord` at lines 458–476.
  - This can create a missing row or replace an existing result, validation, or evidence payload.
- `RECORD_KIND_CONFIG.experiment_result`: `apps/backend/src/services/experiment-foundation-service.ts:227`.
- `RECORD_KIND_CONFIG.result_validation_report`: `apps/backend/src/services/experiment-foundation-service.ts:239`.
- `RECORD_KIND_CONFIG.evidence_candidate`: `apps/backend/src/services/experiment-foundation-service.ts:273`.
- `ExperimentFoundationService` compiles every registered kind schema in its constructor: `apps/backend/src/services/experiment-foundation-service.ts:394-408`.
- `ExperimentFoundationService.assertValidPayload`: `apps/backend/src/services/experiment-foundation-service.ts:642-662`.

HTTP entrances:

- `registerExperimentFoundationRoutes`: `apps/backend/src/routes/experiment-foundation-routes.ts:86`.
- `POST /experiment-foundation/records`: `apps/backend/src/routes/experiment-foundation-routes.ts:93-100`.
- `ExperimentFoundationController.createRecord`: `apps/backend/src/controllers/experiment-foundation-controller.ts:68-78`; calls the service at line 73.
- `PUT /experiment-foundation/records/:record_kind/:record_id`: `apps/backend/src/routes/experiment-foundation-routes.ts:101-111`.
- `ExperimentFoundationController.upsertRecord`: `apps/backend/src/controllers/experiment-foundation-controller.ts:80-94`; calls the service at lines 85–89.
- Both mutation routes install `legacyExperimentMutationOnRequest`: `apps/backend/src/routes/experiment-foundation-routes.ts:91,97,108`.
- The cutover guard returns a pre-controller 409 when cutover is committed: `apps/backend/src/routes/experiment-v2-cutover-guard.ts:17-42`.

Repository writers shared by all generic kinds:

- `ExperimentFoundationRepository.createRecord`: `apps/backend/src/repositories/experiment-foundation.repository.ts:62`.
- `ExperimentFoundationRepository.upsertRecord`: `apps/backend/src/repositories/experiment-foundation.repository.ts:63`.
- `PrismaExperimentFoundationRepository.createRecord`: `apps/backend/src/repositories/prisma/prisma-experiment-foundation-repository.ts:30`.
  - Calls `prisma.experimentFoundationRecord.create` at lines 32–34.
- `PrismaExperimentFoundationRepository.upsertRecord`: `apps/backend/src/repositories/prisma/prisma-experiment-foundation-repository.ts:41`.
  - Calls `prisma.experimentFoundationRecord.upsert` at lines 42–63.
- `InMemoryExperimentFoundationRepository.createRecord`: `apps/backend/src/repositories/in-memory-experiment-foundation-repository.ts:20`.
- `InMemoryExperimentFoundationRepository.upsertRecord`: `apps/backend/src/repositories/in-memory-experiment-foundation-repository.ts:29`.
- The backing production table is the generic `ExperimentFoundationRecord` model: `prisma/schema.prisma:5923`.

This generic path is authority-equivalent to the specialized collector for Phase 4 closure: a caller can mint a schema-valid result, validation report, or EvidenceCandidate without executing the collector’s heuristic validation or any provider-provenance check.

### 1.2 Legacy collection orchestration

Primary orchestration symbol:

- `ExperimentFoundationExecutionService.collectJob`: `apps/backend/src/services/experiment-foundation-execution-service.ts:260`.

Its exact write sequence is non-transactional across the generic record store and external-job update:

1. Loads the job and returns early if any `result_refs` already exist: `apps/backend/src/services/experiment-foundation-execution-service.ts:264-267`.
2. Loads the collection context and calls the selected adapter: `apps/backend/src/services/experiment-foundation-execution-service.ts:269-271`.
3. Creates diagnostic partial-result records: `apps/backend/src/services/experiment-foundation-execution-service.ts:272`.
4. Loads locked metric-definition context: `apps/backend/src/services/experiment-foundation-execution-service.ts:273`.
5. Computes `ValidationAnalysis`, passing caller-selected `Boolean(input.accept_partial)`: `apps/backend/src/services/experiment-foundation-execution-service.ts:274-280`.
6. Generates result and validation IDs/hashes: `apps/backend/src/services/experiment-foundation-execution-service.ts:281-298`.
7. Creates `ExperimentResult`: `apps/backend/src/services/experiment-foundation-execution-service.ts:299-308`.
8. Creates metric observations: `apps/backend/src/services/experiment-foundation-execution-service.ts:309-317`.
9. Creates evaluation facts: `apps/backend/src/services/experiment-foundation-execution-service.ts:318-326`.
10. Creates `ResultValidationReport`: `apps/backend/src/services/experiment-foundation-execution-service.ts:327-335`.
11. Adds result and validation refs to the pending job update: `apps/backend/src/services/experiment-foundation-execution-service.ts:336-339`.
12. Optionally creates `FineTuningResult`: `apps/backend/src/services/experiment-foundation-execution-service.ts:340-349`.
13. If validation is `valid` or `accepted_partial` and at least one metric observation exists, creates `EvidenceCandidate`: `apps/backend/src/services/experiment-foundation-execution-service.ts:350-363`.
14. Creates adapter metadata and a stage event: `apps/backend/src/services/experiment-foundation-execution-service.ts:365-380`.
15. Updates the external job with partial-result refs and result refs only after all preceding generic writes: `apps/backend/src/services/experiment-foundation-execution-service.ts:381-398`.

Concrete target writers:

- `ExperimentFoundationExecutionService.createExperimentResult`: `apps/backend/src/services/experiment-foundation-execution-service.ts:696`.
  - Constructs `ExperimentResult`: `apps/backend/src/services/experiment-foundation-execution-service.ts:706-728`.
  - Calls `registryService.createRecord({ record_kind: 'experiment_result' })`: `apps/backend/src/services/experiment-foundation-execution-service.ts:729-732`.
- `ExperimentFoundationExecutionService.createValidationReport`: `apps/backend/src/services/experiment-foundation-execution-service.ts:851`.
  - Constructs `ResultValidationReport`: `apps/backend/src/services/experiment-foundation-execution-service.ts:860-878`.
  - Creates a synthetic `partial_acceptance_ref` for accepted-partial status: `apps/backend/src/services/experiment-foundation-execution-service.ts:872-874`.
  - Calls `registryService.createRecord({ record_kind: 'result_validation_report' })`: `apps/backend/src/services/experiment-foundation-execution-service.ts:879-882`.
- `ExperimentFoundationExecutionService.createEvidenceCandidate`: `apps/backend/src/services/experiment-foundation-execution-service.ts:935`.
  - Constructs `EvidenceCandidate`: `apps/backend/src/services/experiment-foundation-execution-service.ts:943-973`.
  - Calls `registryService.createRecord({ record_kind: 'evidence_candidate' })`: `apps/backend/src/services/experiment-foundation-execution-service.ts:974-977`.
  - The object is minted per external job/task spec, not for one complete exact Run batch.

Adjacent writes in the same orchestration:

- `ExperimentFoundationExecutionService.createPartialResults` creates `TrainingTaskPartialResultRef` objects and writes each as `training_task_partial_result_ref`: `apps/backend/src/services/experiment-foundation-execution-service.ts:667-693`.
- `ExperimentFoundationExecutionService.createMetricObservations`: `apps/backend/src/services/experiment-foundation-execution-service.ts:736`; generic writes at lines 784–787.
- `ExperimentFoundationExecutionService.createEvaluationFacts`: `apps/backend/src/services/experiment-foundation-execution-service.ts:793`; generic writes at lines 842–845.
- `ExperimentFoundationExecutionService.createFineTuningResult`: `apps/backend/src/services/experiment-foundation-execution-service.ts:886`; generic write at lines 928–931.
- Adapter metadata and stage events are also generic record writes through `registryService.createRecord`: `apps/backend/src/services/experiment-foundation-execution-service.ts:623,651`.

The target objects therefore do not share one repository transaction. A result, observation, fact, or validation record can remain if a later insert or the final external-job update fails.

Direct EF HTTP entrance:

- `POST /experiment-foundation/execution/jobs/:external_job_id/collect`: `apps/backend/src/routes/experiment-foundation-execution-routes.ts:95-102`.
- `ExperimentFoundationExecutionController.collectJob`: `apps/backend/src/controllers/experiment-foundation-execution-controller.ts:111-121`; calls the service at line 116.
- The route installs `legacyExperimentMutationOnRequest`: `apps/backend/src/routes/experiment-foundation-execution-routes.ts:59,99`.

Execution repository participation:

- `ExperimentFoundationExecutionRepository.updateExternalTrainingJob`: `apps/backend/src/repositories/experiment-foundation-execution.repository.ts:23`.
- `PrismaExperimentFoundationExecutionRepository.updateExternalTrainingJob`: `apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-repository.ts:34`.
- `InMemoryExperimentFoundationExecutionRepository.updateExternalTrainingJob`: `apps/backend/src/repositories/in-memory-experiment-foundation-execution-repository.ts:25`.
- The associated job table is `ExperimentFoundationExternalTrainingJob`: `prisma/schema.prisma:5966`.

### 1.3 PI live-experiment wrapper into the legacy collector

This is not a separate EF object constructor, but it is an independent externally reachable creation path into `collectJob` and therefore must be closed or redirected.

- Route `POST /paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect`: `apps/backend/src/routes/paper-implementation-routes.ts:945-958`.
- `PaperImplementationController.collectLiveExperimentRun`: `apps/backend/src/controllers/paper-implementation-controller.ts:1081-1103`.
- The controller calls `PaperImplementationLiveExperimentAdapterService.collectLiveExperimentRun`: `apps/backend/src/controllers/paper-implementation-controller.ts:1093-1098`.
- `PaperImplementationLiveExperimentAdapterService.collectLiveExperimentRun`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:177`.
- It forwards `accept_partial` into `CollectExternalTrainingJobRequest`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:197-200`.
- It calls `ExperimentFoundationExecutionService.collectJob`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:201-204`.
- After the legacy collector writes, `loadFinalEvidenceRefs` requires result and validation refs: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:378-390`.
- EvidenceCandidate refs are optional and merely collected if present: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:391-406`.
- `loadRecordHash` checks only the reference kind and loads `record_hash`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:409-414`.
- It does not inspect the validation payload, exact Run batch completeness, or provider provenance.
- The PI collect route installs `legacyExperimentMutationOnRequest`: `apps/backend/src/routes/paper-implementation-routes.ts:955`.

### 1.4 Route/runtime reachability

- Generic EF routes are registered in `buildApp`: `apps/backend/src/app.ts:1283-1287`.
- Legacy EF execution routes are registered at `apps/backend/src/app.ts:1288-1292`.
- PI legacy routes are registered at `apps/backend/src/app.ts:1300-1307`.
- Cutover state is read during app construction: `apps/backend/src/app.ts:368-383`.
- `isPaperImplementationExperimentV2CutoverCommitted`: `apps/backend/src/app.ts:1839-1843`.
- The boolean parser defaults an absent or blank flag to false: `apps/backend/src/app.ts:1856-1872`.
- Named-local configuration sets `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true`: `.env.local:26`.
- The same named-local value appears in `env/values/dev.local.yaml:1`.
- Once enabled, `legacyExperimentMutationOnRequest` rejects mutations before schema validation, controller invocation, service invocation, or repository access: `apps/backend/src/routes/experiment-v2-cutover-guard.ts:32-42`.

The guard does not remove or hard-disable:

- `ExperimentFoundationService.createRecord`;
- `ExperimentFoundationService.upsertRecord`;
- `ExperimentFoundationExecutionService.collectJob`;
- `PaperImplementationLiveExperimentAdapterService.collectLiveExperimentRun`;
- their repository methods.

Internal callers, tests, scripts, or app construction with cutover false can still execute them.

## 2. EvaluationProtocol representation and rule execution

### 2.1 Legacy EvaluationProtocol: opaque policy JSON

Legacy interface:

- `EvaluationProtocol`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:764`.
- Typed identity and dependency fields:
  - `evaluation_protocol_id`: line 765;
  - `benchmark_asset_id`: line 766;
  - `protocol_version`: line 767;
  - `protocol_hash`: line 768;
  - `metric_definition_refs`: line 769;
  - `evaluator_refs`: line 770.
- Opaque policy authorities:
  - `aggregation`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:771`;
  - `seed_policy`: line 772;
  - `repeat_policy`: line 773;
  - `reporting_protocol`: line 774;
  - `comparison_policy`: line 775;
  - `statistical_protocol`: line 776;
  - `budget_fairness_policy`: line 777;
  - `tuning_fairness_policy`: line 778.
- Every policy authority is `Record<string, unknown>`.

Legacy schema:

- `experimentFoundationEvaluationProtocolSchema`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:2359`.
- The outer protocol object uses `additionalProperties: false`: lines 2360–2362.
- All eight policy fields use `objectPayload`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:2387-2394`.
- `objectPayload` is an object with `additionalProperties: true`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1768`.
- Therefore only the top-level protocol field names are controlled; contents of the policy blocks are opaque.

Legacy parsing and validation:

- `RECORD_KIND_CONFIG.evaluation_protocol`: `apps/backend/src/services/experiment-foundation-service.ts:96-100`.
- AJV compilation occurs in `ExperimentFoundationService` constructor: `apps/backend/src/services/experiment-foundation-service.ts:394-408`.
- `assertValidPayload` applies the schema during generic create/upsert: `apps/backend/src/services/experiment-foundation-service.ts:642-662`.
- There is no separate parser or typed validator for the eight policy blocks.
- `EvaluationProtocolLock`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:816`.
- The lock retains protocol identity/hash and `metric_definition_refs`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:817-823`.
- It does not retain or type the policy blocks.

Legacy execution does not execute the protocol policy blocks:

- `ExperimentFoundationExecutionService.loadProtocolMetricContext`: `apps/backend/src/services/experiment-foundation-execution-service.ts:516`.
- It iterates only `evaluation_protocol_lock.metric_definition_refs`: `apps/backend/src/services/experiment-foundation-execution-service.ts:519`.
- Non-`metric_definition` refs are classified as missing: lines 520–523.
- It loads generic `metric_definition` records: lines 524–532.
- It derives expected metric keys from the loaded definitions: lines 534–538.
- It does not load the `evaluation_protocol` record itself.

Legacy heuristic validator:

- `analyzeValidation`: `apps/backend/src/services/experiment-foundation-execution-service.ts:1023`.
- Checks trace-hash presence: `apps/backend/src/services/experiment-foundation-execution-service.ts:1030-1036`.
- Uses collected metric keys: lines 1037–1039.
- Treats “at least one artifact” as satisfying a generic `metric_bundle` artifact requirement: line 1040.
- Reports missing metric definitions and metrics outside the lock: lines 1041–1046.
- Adds job status as a violation unless the collected status is `succeeded`: lines 1047–1049.
- Adds a violation when trace hashes are absent: lines 1050–1052.
- Requires at least one metric and at least one artifact or log as “observable facts”: line 1053.
- Computes protocol completeness from those heuristics: lines 1054–1058.
- Never reads `aggregation`, seed/repeat policies, reporting protocol, comparison/statistical protocol, or fairness policies.
- Operates per collected external job/task spec, not per v2 Run batch.

### 2.2 Pack A EvaluationProtocol v2: typed required-rule authority

Closed rule vocabulary:

- `EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:73`.
- Supported literals are `metric_contract@v1` and `artifact_contract@v1`: lines 74–76.
- `ExperimentFoundationV2RequiredRuleType`: lines 77–78.
- `ExperimentFoundationV2MetricContractRuleV1`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:189`.
- Its typed fields include:
  - `rule_id`: line 190;
  - `rule_type`: line 191;
  - exact `MetricDefinition` revision ref: lines 192–194;
  - `metric_key`: line 195;
  - `required_cardinality`: line 196;
  - `split_key`: line 197;
  - `value_type`: line 198;
  - `unit`: line 199;
  - `finite_required`: line 200.
- `ExperimentFoundationV2ArtifactContractRuleV1`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:203`.
- Its typed fields include rule ID/type, artifact kind, filename, cardinality, content-hash requirement, and parser binding: lines 204–210.
- Closed union `ExperimentFoundationV2RequiredRuleV1`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:213`.

Protocol authority:

- `ExperimentFoundationV2EvaluationProtocolSemanticContentV2`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:217`.
- Requires `schema_version: 'v2'`: line 218.
- Includes protocol key/display name: lines 219–220.
- Includes exact Benchmark revision dependency: lines 221–223.
- Includes exact ordered MetricDefinition revision dependencies: lines 224–226.
- Contains the single `required_rules` array: line 227.
- `ExperimentFoundationV2EvaluationProtocolDraftContentV2`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:230`.
- `ExperimentFoundationV2EvaluationProtocolRevisionContentV2`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:232`.
- `ExperimentFoundationEvaluationProtocolV2`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:289`.
- `ExperimentFoundationEvaluationProtocolRevisionV2`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:321`.

Shared schemas:

- `experimentFoundationV2MetricContractRuleV1Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:734`.
- `experimentFoundationV2ArtifactContractRuleV1Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:761`.
- `experimentFoundationV2RequiredRuleV1Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:784`.
- It is a `oneOf` union of the two rule schemas: lines 785–788.
- Shared protocol semantic schema begins at `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:791`.
- It requires `required_rules`: lines 794–801.
- `required_rules` must be a nonempty array of `experimentFoundationV2RequiredRuleV1Schema`: lines 812–816.
- `experimentFoundationV2EvaluationProtocolDraftContentV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:820`.
- `experimentFoundationV2EvaluationProtocolRevisionContentV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:823`.
- `experimentFoundationEvaluationProtocolV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:921`.
- `experimentFoundationEvaluationProtocolRevisionV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:978`.

Where v2 protocols are parsed and validated:

- `ExperimentFoundationV2Service`: `apps/backend/src/services/experiment-foundation-v2-service.ts:175`.
- It constructs AJV validators for each asset type: `apps/backend/src/services/experiment-foundation-v2-service.ts:193-203`.
- EvaluationProtocol uses `experimentFoundationV2EvaluationProtocolDraftContentV2Schema`: lines 199–201.
- `createAssetDraft` invokes `assertDraftContent`: `apps/backend/src/services/experiment-foundation-v2-service.ts:206-213`.
- `assertDraftContent` begins at `apps/backend/src/services/experiment-foundation-v2-service.ts:875`.
- `assertDraftDependencies` resolves every exact dependency: `apps/backend/src/services/experiment-foundation-v2-service.ts:606-624`.
- It dispatches EvaluationProtocol-specific binding validation: `apps/backend/src/services/experiment-foundation-v2-service.ts:631-635`.
- `assertProtocolBindings`: `apps/backend/src/services/experiment-foundation-v2-service.ts:661`.
- Builds an exact metric-dependency map: lines 665–667.
- Rejects duplicate `rule_id`: lines 668–673.
- For metric rules, requires the rule’s exact metric revision to appear in `metric_dependencies`: lines 674–681.
- Resolves the exact metric revision: lines 683–686.
- Rejects a non-MetricDefinition resolution: lines 687–689.
- Verifies metric key, value type, and unit against the exact MetricDefinition snapshot: lines 690–699.

Stored snapshot validation:

- `assetRevisionValidators`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:42-48`.
- EvaluationProtocol revision validator registration: line 47.
- `assetIdentityValidators`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:50-56`.
- EvaluationProtocol identity validator registration: line 55.
- `assetDraftValidators`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:58-64`.
- EvaluationProtocol draft validator registration: line 63.
- `assertStoredExperimentFoundationV2AssetIdentityIntegrity`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:86-94`.
- `assertStoredExperimentFoundationV2AssetRevisionIntegrity`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:96-139`.
- EvaluationProtocol revision hash input uses `evaluation_protocol_revision`: lines 127–131.
- `assertStoredExperimentFoundationV2AssetDraftIntegrity`: `apps/backend/src/repositories/experiment-foundation-v2-stored-snapshot-integrity.ts:142-148`.

Existing rule-capability evaluation:

- `DEFAULT_READINESS_EVALUATOR_PROFILE`: `apps/backend/src/services/experiment-foundation-v2-service.ts:159-165`.
- It declares support for `artifact_contract@v1` and `metric_contract@v1`: lines 161–164.
- `requiredRulesSupported`: `apps/backend/src/services/experiment-foundation-v2-service.ts:1401`.
- For non-protocol assets it returns true: lines 1405–1407.
- For EvaluationProtocol it checks every rule type against the code-local supported set: lines 1408–1411.
- Readiness evaluation calls this function: `apps/backend/src/services/experiment-foundation-v2-service.ts:806-809`.
- Unsupported rules add `UNSUPPORTED_RULE`: `apps/backend/src/services/experiment-foundation-v2-service.ts:810-812`.
- `createReadinessAttestation` persists `all_required_rules_supported`: `apps/backend/src/services/experiment-foundation-v2-service.ts:475-488`.
- Contract field `all_required_rules_supported`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:362-367`.
- Its schema is `experimentFoundationReadinessQualificationSnapshotV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:1057-1075`.

Current limitation: this is a shape, binding, and capability-support check only. There is no current code that executes:

- metric cardinality;
- split identity;
- metric value type/unit;
- finite-number requirements;
- artifact cardinality;
- exact filename;
- content-hash presence;
- parser binding

against one complete Run batch. The only scientific validator remains legacy `analyzeValidation`, which does not consume v2 `required_rules`.

## 3. Partial-result and partial-evidence branches

### 3.1 Contract vocabulary

- `EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:350`.
- Includes `partial`: line 353.
- Includes `accepted_partial`: line 354.
- `ExperimentFoundationResultValidationStatus`: lines 356–357.
- `ExperimentResult.partial_result_refs`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1143`.
- `ResultValidationReport.partial_acceptance_ref`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1190`.
- `EvidenceCandidate.validation_status` explicitly permits `valid | accepted_partial`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1305-1309`.
- `CollectExternalTrainingJobRequest.accept_partial`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1755-1758`.
- Request schema exposes `accept_partial`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:4878`.
- PI wrapper repeats the flag in `CollectLiveExperimentRunRequest`: `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:69-77`.
- PI wrapper JSON schema exposes it: `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:141-153`, specifically line 148.
- `training_task_partial_result_ref` remains a generic record kind: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:538`.
- `TrainingTaskPartialResultRef` fields begin at `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1057`.
- `ExperimentFoundationExternalTrainingJob.partial_result_refs`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1085`.
- Materialization schema permits `materialized | partial`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3195`.
- Result schema requires `partial_result_refs`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3454`; property schema at line 3481.
- Validation-report schema has an accepted-partial conditional branch: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3599-3605`.
- It requires `partial_acceptance_ref` for `accepted_partial`: lines 3603–3605.
- General nullable property declaration: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3622`.
- EvidenceCandidate schema accepts `valid` and `accepted_partial`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3905`.

### 3.2 Runtime branches

- Submit accepts a partial materialization:
  - `ExperimentFoundationExecutionService.assertSubmitGate`: `apps/backend/src/services/experiment-foundation-execution-service.ts:401`.
  - `materializationResult.status` may be `materialized` or `partial`: `apps/backend/src/services/experiment-foundation-execution-service.ts:417-418`.
- Collection creates partial-result records before validation:
  - call in `collectJob`: `apps/backend/src/services/experiment-foundation-execution-service.ts:272`;
  - generated partial IDs: `apps/backend/src/services/experiment-foundation-execution-service.ts:667,677`;
  - writes each `training_task_partial_result_ref`: `apps/backend/src/services/experiment-foundation-execution-service.ts:687-693`.
- Caller `accept_partial` is converted to boolean and passed into validation: `apps/backend/src/services/experiment-foundation-execution-service.ts:274-280`.
- `analyzeValidation` creates warning `accepted partial adapter output`: `apps/backend/src/services/experiment-foundation-execution-service.ts:1059`.
- It returns `accepted_partial` whenever:
  - the caller opted in;
  - trace hashes exist;
  - at least one checked metric exists.
- That branch is `apps/backend/src/services/experiment-foundation-execution-service.ts:1070-1078`.
- The branch can succeed even when:
  - the external job is not succeeded;
  - expected metrics are missing;
  - required artifact presence fails;
  - protocol violations exist.
- Without acceptance, incomplete output returns `partial` when at least one metric exists, otherwise `invalid`: `apps/backend/src/services/experiment-foundation-execution-service.ts:1080-1087`.
- `collectJob` treats `accepted_partial` as evidence-passing: `apps/backend/src/services/experiment-foundation-execution-service.ts:350-354`.
- `createValidationReport` synthesizes a `partial_acceptance` reference: `apps/backend/src/services/experiment-foundation-execution-service.ts:872-874`.
- No corresponding typed `partial_acceptance` record kind appears in `EXPERIMENT_FOUNDATION_RECORD_KINDS`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:505-564`.
- `createFineTuningResult` treats accepted-partial status as unblocked: `apps/backend/src/services/experiment-foundation-execution-service.ts:923`.
- `createEvidenceCandidate` casts validation status to `valid | accepted_partial`: `apps/backend/src/services/experiment-foundation-execution-service.ts:948`.
- Generic readiness treats accepted-partial fine-tuning results as ready: `apps/backend/src/services/experiment-foundation-service.ts:762-766`.
- Generic readiness treats accepted-partial EvidenceCandidates as ready: `apps/backend/src/services/experiment-foundation-service.ts:768-771`.
- PI live collection forwards the flag unchanged: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:197-204`.
- PI live evidence tracing includes external job partial-result refs as log artifacts: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:484`.

### 3.3 Pack B provisional outputs

Pack B uses the name `ProvisionalOutputV2`, but it is deliberately diagnostic-only rather than partial scientific evidence:

- `ExperimentFoundationProvisionalOutputV2`: `prisma/schema.prisma:6983`.
- Fake-provider output manifest classification is `diagnostic_only`: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:42-48`.
- Provisional outputs are emitted only for fake-provider collection: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:513-515`.
- No v2 result, validation, EvidenceCandidate, or RunEvidenceUnit is created from them.

## 4. Pack A / Pack B v2 Prisma model families

The schema declares the v2 asset enum at `prisma/schema.prisma:6001-6007`.

The Pack A PI boundary is documented at `prisma/schema.prisma:6009-6010`. The Pack A EF boundary is documented at `prisma/schema.prisma:6195-6196`. Pack B begins at `prisma/schema.prisma:6803-6805`.

### 4.1 Pack A: PI-owned authority

Six models:

- `PaperImplementationExperimentWorkOrderBranchV2` — `prisma/schema.prisma:6011`
- `PaperImplementationExperimentWorkOrderRevisionV2` — `prisma/schema.prisma:6044`
- `PaperImplementationExperimentWorkOrderRevisionCellV2` — `prisma/schema.prisma:6075`
- `PaperImplementationExperimentWorkOrderAdmissionV2` — `prisma/schema.prisma:6096`
- `PaperImplementationExperimentIntegrationInboxV2` — `prisma/schema.prisma:6114`
- `PaperImplementationExperimentIntegrationOutboxV2` — `prisma/schema.prisma:6151`

The schema comment states that these models keep EF-owned Run references external and define no PI↔EF relation: `prisma/schema.prisma:6009-6010`.

### 4.2 Pack A: EF-owned asset families

Dataset family:

- `ExperimentFoundationDatasetV2` — `prisma/schema.prisma:6197`
- `ExperimentFoundationDatasetRevisionV2` — `prisma/schema.prisma:6212`
- `ExperimentFoundationDatasetFreezeCommandReceiptV2` — `prisma/schema.prisma:6241`

DataPolicy family:

- `ExperimentFoundationDataPolicyV2` — `prisma/schema.prisma:6255`
- `ExperimentFoundationDataPolicyRevisionV2` — `prisma/schema.prisma:6270`
- `ExperimentFoundationDataPolicyFreezeCommandReceiptV2` — `prisma/schema.prisma:6294`

MetricDefinition family:

- `ExperimentFoundationMetricDefinitionV2` — `prisma/schema.prisma:6308`
- `ExperimentFoundationMetricDefinitionRevisionV2` — `prisma/schema.prisma:6323`
- `ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2` — `prisma/schema.prisma:6347`

Benchmark family:

- `ExperimentFoundationBenchmarkV2` — `prisma/schema.prisma:6361`
- `ExperimentFoundationBenchmarkRevisionV2` — `prisma/schema.prisma:6376`
- `ExperimentFoundationBenchmarkFreezeCommandReceiptV2` — `prisma/schema.prisma:6411`

EvaluationProtocol family:

- `ExperimentFoundationEvaluationProtocolV2` — `prisma/schema.prisma:6425`
- `ExperimentFoundationEvaluationProtocolRevisionV2` — `prisma/schema.prisma:6440`
- `ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2` — `prisma/schema.prisma:6471`
- `ExperimentFoundationEvaluationProtocolMetricDependencyV2` — `prisma/schema.prisma:6485`

The schema describes these as five named EF v2 asset families, with each identity owning only its named draft JSON and each immutable revision owning only its named snapshot JSON: `prisma/schema.prisma:6195-6196`.

### 4.3 Pack A: EF lifecycle and readiness

- `ExperimentFoundationAssetLifecycleEventV2` — `prisma/schema.prisma:6502`
- `ExperimentFoundationAssetLifecycleProjectionV2` — `prisma/schema.prisma:6525`
- `ExperimentFoundationReadinessAttestationV2` — `prisma/schema.prisma:6545`
- `ExperimentFoundationReadinessDependencyV2` — `prisma/schema.prisma:6570`

### 4.4 Pack A: EF version lock, recipe, task, and Run

- `ExperimentFoundationVersionLockV2` — `prisma/schema.prisma:6588`
- `ExperimentFoundationVersionLockDependencyV2` — `prisma/schema.prisma:6609`
- `ExperimentFoundationRunRecipeV2` — `prisma/schema.prisma:6627`
- `ExperimentFoundationTrainingTaskSpecV2` — `prisma/schema.prisma:6648`
- `ExperimentFoundationRunV2` — `prisma/schema.prisma:6675`
- `ExperimentFoundationRunCellV2` — `prisma/schema.prisma:6696`

### 4.5 Pack A: EF integration

- `ExperimentFoundationIntegrationInboxV2` — `prisma/schema.prisma:6719`
- `ExperimentFoundationIntegrationOutboxV2` — `prisma/schema.prisma:6759`

Pack A therefore contains:

- 6 PI-owned models;
- 28 EF-owned models.

### 4.6 Pack B: EF provider-control and diagnostic lineage

Six EF-owned models:

- `ExperimentFoundationProviderPayloadV2` — `prisma/schema.prisma:6806`
- `ExperimentFoundationExecutionAttemptV2` — `prisma/schema.prisma:6839`
- `ExperimentFoundationExecutionAttemptEventV2` — `prisma/schema.prisma:6892`
- `ExperimentFoundationProviderCommandV2` — `prisma/schema.prisma:6919`
- `ExperimentFoundationCollectionAttemptV2` — `prisma/schema.prisma:6957`
- `ExperimentFoundationProvisionalOutputV2` — `prisma/schema.prisma:6983`

There are no Pack B PI-owned models. The schema explicitly describes Pack B as EF-owned, non-production provider-control lineage: `prisma/schema.prisma:6803-6805`.

### 4.7 Absence confirmation

A model-name census of `prisma/schema.prisma` finds no v2 model containing `Result`, `Validation`, `Evidence`, or `Closure`.

Semantically, the v2 family ends with diagnostic `ExperimentFoundationProvisionalOutputV2`: `prisma/schema.prisma:6983-6999`.

There are currently no dedicated v2 tables for:

- scientific `ExperimentResult` or batch result;
- `ScientificValidation`;
- `ResultValidationReport`;
- `EvidenceCandidate`;
- v2 `RunEvidenceUnit`;
- Evidence Trust Gateway output;
- ValidationCycle closure decision;
- current-effective closure snapshot;
- scientific closure accounting.

Similarly named existing models are legacy/non-v2:

- `PaperImplementationValidationCycle` — `prisma/schema.prisma:4487`
- `PaperImplementationRunEvidenceUnit` — `prisma/schema.prisma:4856`
- `ExperimentFoundationRecord` — `prisma/schema.prisma:5923`
- `ExperimentFoundationExternalTrainingJob` — `prisma/schema.prisma:5966`

The legacy EF result, validation report, and EvidenceCandidate are payloads in `ExperimentFoundationRecord`; they do not have dedicated Prisma models.

## 5. Existing v2 shared EF contract files and patterns

The research-lifecycle barrel exports the v2 contract modules at `packages/shared/src/research-lifecycle/index.ts:7-11`.

### 5.1 `experiment-foundation-v2-contracts.ts`

Path: `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts`.

Main exact-reference and snapshot schemas:

- `experimentFoundationV2ExactAssetRevisionRefSchema` — `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:528`
- `experimentFoundationV2ChecksumEntrySnapshotV1Schema` — `:531`
- `experimentFoundationV2ChecksumManifestSnapshotV1Schema` — `:542`
- `experimentFoundationV2SplitSnapshotV1Schema` — `:558`
- `experimentFoundationV2SplitProtocolSnapshotV1Schema` — `:570`

Typed asset content schemas:

- `experimentFoundationV2DatasetDraftContentV1Schema` — `:622`
- `experimentFoundationV2DatasetRevisionContentV1Schema` — `:625`
- `experimentFoundationV2DataPolicyDraftContentV1Schema` — `:659`
- `experimentFoundationV2DataPolicyRevisionContentV1Schema` — `:662`
- `experimentFoundationV2MetricDefinitionDraftContentV1Schema` — `:699`
- `experimentFoundationV2MetricDefinitionRevisionContentV1Schema` — `:702`
- `experimentFoundationV2BenchmarkDraftContentV1Schema` — `:727`
- `experimentFoundationV2BenchmarkRevisionContentV1Schema` — `:730`
- `experimentFoundationV2EvaluationProtocolDraftContentV2Schema` — `:820`
- `experimentFoundationV2EvaluationProtocolRevisionContentV2Schema` — `:823`

Required-rule schemas:

- `experimentFoundationV2MetricContractRuleV1Schema` — `:734`
- `experimentFoundationV2ArtifactContractRuleV1Schema` — `:761`
- `experimentFoundationV2RequiredRuleV1Schema` — `:784`

Draft request schemas:

- `experimentFoundationV2UpdateDatasetDraftRequestSchema` — `:842`
- `experimentFoundationV2UpdateDataPolicyDraftRequestSchema` — `:844`
- `experimentFoundationV2UpdateMetricDefinitionDraftRequestSchema` — `:849`
- `experimentFoundationV2UpdateBenchmarkDraftRequestSchema` — `:854`
- `experimentFoundationV2UpdateEvaluationProtocolDraftRequestSchema` — `:856`
- `experimentFoundationV2FreezeDraftRequestSchema` — `:862`

Asset identity schemas:

- `experimentFoundationDatasetV2Schema` — `:901`
- `experimentFoundationDataPolicyV2Schema` — `:906`
- `experimentFoundationMetricDefinitionV2Schema` — `:911`
- `experimentFoundationBenchmarkV2Schema` — `:916`
- `experimentFoundationEvaluationProtocolV2Schema` — `:921`

Asset revision schemas:

- `experimentFoundationDatasetRevisionV2Schema` — `:958`
- `experimentFoundationDataPolicyRevisionV2Schema` — `:963`
- `experimentFoundationMetricDefinitionRevisionV2Schema` — `:968`
- `experimentFoundationBenchmarkRevisionV2Schema` — `:973`
- `experimentFoundationEvaluationProtocolRevisionV2Schema` — `:978`

Execution-authority snapshot schemas:

- `experimentFoundationTrainingTaskIoSnapshotV2Schema` — `:984`
- `experimentFoundationRunRecipeSnapshotV2Schema` — `:1003`
- `experimentFoundationTrainingTaskSpecSnapshotV2Schema` — `:1015`

Readiness schemas:

- `experimentFoundationReadinessQualificationSnapshotV2Schema` — `:1057`
- `experimentFoundationReadinessBlockerV2Schema` — `:1078`
- `experimentFoundationReadinessAttestationV2Schema` — `:1088`
- `experimentFoundationReadinessDependencyV2Schema` — `:1117`

Pattern to follow:

- exported TypeScript interfaces plus exported JSON schemas;
- `additionalProperties: false`;
- literal schema versions;
- exact revision refs and canonical hashes;
- bounded integer helpers;
- separate draft, immutable revision, identity, and persisted snapshot shapes;
- closed discriminated unions for capabilities such as required rules.

### 5.2 `experiment-foundation-execution-v2-contracts.ts`

Path: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts`.

Main schemas:

- `simulationExternalJobRefV2Schema` — `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:364`
- `fakeAliyunPaiDlcSourceBindingV1Schema` — `:378`
- `fakeAliyunPaiDlcRedactedManifestV1Schema` — `:399`
- `providerPayloadV2Schema` — `:461`
- `executionAttemptV2Schema` — `:513`
- `attemptEventSnapshotV2Schema` — `:596`
- `attemptEventV2Schema` — `:608`
- `providerCommandSnapshotV2Schema` — `:654`
- `providerCommandV2Schema` — `:678`
- `collectionAttemptV2Schema` — `:739`
- `provisionalOutputManifestV2Schema` — `:777`
- `provisionalOutputV2Schema` — `:799`
- `workflowSimulationCellStatusV2Schema` — `:827`
- `workflowSimulationStatusV2Schema` — `:856`
- `startWorkflowSimulationV2RequestSchema` — `:888`
- `startWorkflowSimulationV2ResponseSchema` — `:897`
- `controlExecutionAttemptV2RequestSchema` — `:920`
- `executionAttemptV2EnvelopeSchema` — `:933`
- `experimentFoundationExecutionV2ErrorResponseSchema` — `:942`

Pattern to follow:

- code-owned literal identities;
- explicit execution mode and provenance;
- immutable event/snapshot envelopes;
- exact provider-payload hashes and source bindings;
- strict separation between provisional diagnostic output and scientific evidence.

Adjacent schema test:

- `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts`.

### 5.3 `experiment-foundation-cloud-preflight-v2-contracts.ts`

Path: `packages/shared/src/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts.ts`.

Main schemas:

- `experimentFoundationAliyunPaiDlcExecutionProfileV1Schema` — `packages/shared/src/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts.ts:138`
- `experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema` — `:163`
- `experimentFoundationAliyunPaiDlcRedactedManifestV1Schema` — `:214`
- `experimentFoundationCloudPreflightV2CheckOutcomeSchema` — `:304`

Pattern to follow:

- exact real-provider payload/profile typing;
- redacted durable manifests;
- provider/preflight outcomes separated from scientific execution and evidence.

Adjacent schema test:

- `packages/shared/src/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts.schema.test.ts`.

### 5.4 `paper-implementation-experiment-v2-contracts.ts`

Path: `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts`.

EF-relevant PI result-contract and exact-cell schemas:

- `paperImplementationExperimentV2RequiredMetricResultSchema` — `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts:435`
- `paperImplementationExperimentV2RequiredArtifactResultSchema` — `:451`
- `paperImplementationExperimentV2RequiredResultContractSchema` — `:461`
- `paperImplementationExperimentV2ExactCellInputSchema` — `:477`
- `paperImplementationExperimentV2BranchFrameSchema` — `:493`
- `paperImplementationExperimentV2RunPolicySchema` — `:515`
- `paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema` — `:525`

Admission schemas:

- `paperImplementationExperimentV2AdmissionRequestSchema` — `:552`
- `paperImplementationExperimentWorkOrderBranchV2Schema` — `:575`
- `paperImplementationExperimentWorkOrderRevisionV2Schema` — `:612`
- `paperImplementationExperimentWorkOrderRevisionCellV2Schema` — `:637`
- `paperImplementationExperimentWorkOrderAdmissionV2Schema` — `:667`
- `paperImplementationExperimentV2AdmissionResponseSchema` — `:688`

Integration event schemas:

- `workOrderRevisionAdmittedCellV1Schema` — `:729`
- `workOrderRevisionAdmittedPayloadV1Schema` — `:757`
- `runManifestFrozenTaskSpecBindingV1Schema` — `:788`
- `runManifestFrozenPayloadV1Schema` — `:809`
- `branchHeadAdvancedPayloadV1Schema` — `:838`
- `workOrderRevisionAdmittedEventV1Schema` — `:894`
- `runManifestFrozenEventV1Schema` — `:900`
- `branchHeadAdvancedEventV1Schema` — `:906`
- `experimentV2IntegrationEventSchema` — `:912`

Pattern to preserve:

- PI owns the declared required-result contract and admission scope.
- EF owns materialized execution and scientific facts.
- Domain integration uses typed, payload-hashed events rather than cross-domain table authority.

### 5.5 Shared helpers

`experiment-v2-contract-limits.ts`:

- Path: `packages/shared/src/research-lifecycle/experiment-v2-contract-limits.ts`.
- Barrel-exported at `packages/shared/src/research-lifecycle/index.ts:7`.
- Provides central hash patterns and integer/JSON limits imported by the v2 schema files, including `packages/shared/src/research-lifecycle/experiment-foundation-v2-contracts.ts:1-5` and `experiment-foundation-execution-v2-contracts.ts:5-8`.

`experiment-v2-canonical-hash.ts`:

- Path: `packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts`.
- Defines canonical JSON types: `packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts:36-42`.
- Defines hash profiles: line 61.
- `ServerCanonicalExperimentV2HashInput`: line 65.
- Payload-hashed event types: lines 72–86.
- EF asset revision hash input: line 89.
- EF VersionLock hash input: line 111.
- EF readiness hash input: line 122.
- EF RunRecipe hash input: line 132.
- EF TrainingTaskSpec hash input: line 139.
- EF Run manifest row hash type: line 153.
- PI approved plan hash input: line 170.
- EF Attempt event hash input: line 176.
- EF ProviderCommand hash input: line 190.
- It is imported directly by consumers rather than exported from `research-lifecycle/index.ts`.

General adjacent v2 contract test:

- `packages/shared/src/research-lifecycle/experiment-v2-contracts.schema.test.ts`.

## 6. LocalScript and fake-provider provenance

### 6.1 Legacy LocalScript identifiers

Contract identifiers:

- Allowed platform kind literal `local_script`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:242-245`.
- Allowed adapter kind literal `local_script`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:249-252`.
- `ExperimentFoundationTrainingPlatformRef.platform_kind`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:945`.
- `ExperimentFoundationTrainingPlatformRef.adapter_kind`: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:946`.
- Platform schema requires matching LocalScript platform/adapter literals: `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:2915-2926`.

Runtime identifiers:

- `LocalScriptAdapter`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:64`.
- `adapterKind = 'local_script'`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:65`.
- Local job ID prefix `local_script_`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:76`.
- External job ref type `local_script_process`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:94`.
- `ExperimentFoundationExecutionService` installs LocalScript by default: `apps/backend/src/services/experiment-foundation-execution-service.ts:84`.

Current scientific-writer behavior:

- `collectJob` selects the adapter based on the job and collects immediately: `apps/backend/src/services/experiment-foundation-execution-service.ts:269-272`.
- It does not reject `job.adapter_kind === 'local_script'`.
- `createExperimentResult` copies the external-job ref/hash without checking its type or adapter provenance: `apps/backend/src/services/experiment-foundation-execution-service.ts:696-733`.
- `createValidationReport` receives no job or adapter provenance argument: `apps/backend/src/services/experiment-foundation-execution-service.ts:851-884`.
- `createEvidenceCandidate` receives no job or adapter provenance argument: `apps/backend/src/services/experiment-foundation-execution-service.ts:935-978`.
- `createEvidenceCandidate.provenance_refs` is simply caller-supplied `sourceRefs`: `apps/backend/src/services/experiment-foundation-execution-service.ts:963`.
- Generic record creation and generic schemas contain no LocalScript exclusion.
- Current behavior is explicitly covered by the test named `LocalScript submit, sync, collect creates result validation and evidence records`: `apps/backend/src/services/experiment-foundation-execution-service.unit.test.ts:360`.

Therefore LocalScript is not rejected by the current result, validation, or EvidenceCandidate writer.

### 6.2 Legacy fake Aliyun identifiers

A separate legacy fake-provider path is concealed behind Aliyun-looking identities:

- `AliyunPaiDlcAdapter`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:183`.
- Its default constructor argument is `new FakeAliyunPaiDlcClient()`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:186`.
- `FakeAliyunPaiDlcClient`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:209`.
- Fake job ID prefix is `aliyun_pai_dlc_`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:214`.
- Fake external ref type is `aliyun_pai_dlc_job`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:216`.
- Submit metadata indicates fakery only through `{ mocked: true }`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:223`.
- Status metadata uses `{ mocked: true }`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:232`.
- Cancel metadata uses `{ mocked: true, reason }`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:246`.
- Collection calls `buildCollectedResult(..., { mocked: true })`: `apps/backend/src/services/experiment-foundation-execution-adapters.ts:250-252`.
- `ExperimentFoundationExecutionService` installs `AliyunPaiDlcAdapter` by default: `apps/backend/src/services/experiment-foundation-execution-service.ts:85`.

The legacy scientific path never inspects adapter metadata. Consequently it can mint:

- `ExperimentResult`;
- `ResultValidationReport`;
- `EvidenceCandidate`

with:

- `adapter_kind = 'aliyun_pai_dlc'`;
- `external_job_ref.ref_type = 'aliyun_pai_dlc_job'`;

even though execution came from `FakeAliyunPaiDlcClient`.

The external ref type and adapter kind do not distinguish this fake implementation from a real Aliyun implementation.

### 6.3 Pack B explicit fake/simulation identifiers

Shared identifiers:

- Provider payload schema literal `FakeAliyunPaiDlcSubmitPayload@v1`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:10-11`.
- Adapter identity `deterministic_fake_aliyun_pai_dlc@v1`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:12-13`.
- Only allowed execution mode is `simulation`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:15-17`.
- Only allowed provenance is `non_production_fake_provider`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:19-23`.
- Fake external-job ref type `fake_aliyun_pai_dlc_job`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:156-159`.
- Its schema fixes the same ref type: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:364-369`.

Provider payload contract:

- `ProviderPayloadV2`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:161`.
- Carries payload schema and adapter identity: lines 170–171.
- Carries execution mode and provenance: lines 172–173.
- Carries simulation profile, redacted manifest, payload hash, and byte size: lines 174–178.
- `providerPayloadV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:461`.
- Requires `adapter_identity`, `execution_mode`, and `provenance`: lines 473–477.
- Fixes the provider payload schema literal: lines 492–495.
- Fixes the adapter identity literal: lines 496–499.
- Restricts mode/provenance to the closed arrays: lines 500–504.

ExecutionAttempt contract:

- `ExecutionAttemptV2`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:181`.
- `executionAttemptV2Schema`: `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts:513`.
- Requires `execution_mode` and `provenance`: lines 530–538.
- Restricts them to the closed simulation/fake enums: lines 568–572.

Persistence:

- `ExperimentFoundationProviderPayloadV2.payloadSchemaVersion`: `prisma/schema.prisma:6815`.
- `adapterIdentity`: `prisma/schema.prisma:6816`.
- `executionMode`: `prisma/schema.prisma:6817`.
- `provenance`: `prisma/schema.prisma:6818`.
- `simulationProfileVersion`: `prisma/schema.prisma:6819`.
- `ExperimentFoundationExecutionAttemptV2.executionMode`: `prisma/schema.prisma:6859`.
- `ExperimentFoundationExecutionAttemptV2.provenance`: `prisma/schema.prisma:6860`.

Service enforcement:

- Attempt construction stamps `execution_mode: 'simulation'`: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:240`.
- Attempt construction stamps `provenance: 'non_production_fake_provider'`: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:241`.
- Replay validation rejects Attempt mode/provenance drift: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:831-832`.
- Replay validation rejects ProviderPayload mode/provenance drift: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:839-840`.
- `toProviderPayload` exposes only simulation/fake provenance: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:970-991`, specifically lines 984–985.
- `toExecutionAttempt` rejects any persisted non-simulation/non-fake Attempt: `apps/backend/src/services/experiment-foundation-execution-v2-service.ts:994-1002`.

Deterministic fake provider enforcement:

- `ExperimentFoundationV2FakeProviderResponse.execution_mode`: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:54`.
- `provenance`: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:55`.
- `assertFakeSubmitPayload`: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:339`.
- It checks schema version, adapter identity, execution mode, and provenance: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:349-355`.
- It checks the code-owned simulation profile and profile hash: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:358-374`.
- Deterministic external job IDs use `fake_aliyun_pai_dlc_job_`: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:486-498`.
- Fake responses stamp simulation/fake provenance: `apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts:516-523`.

Current v2 evidence behavior:

- Pack B validates and preserves fake/simulation provenance within provider-control code.
- Pack B writes only diagnostic `ExperimentFoundationProvisionalOutputV2`.
- There is no v2 scientific result, validation, EvidenceCandidate, or REU writer to reject fake provenance yet.
- Phase 4 must apply rejection at the new ScientificValidation/EvidenceCandidate boundary.
- The rejection must cover explicit Pack B identifiers and must not rely only on legacy `aliyun_pai_dlc_job` ref types, because the legacy fake Aliyun client uses the same apparently real identity.

## 7. Downstream legacy RunEvidenceUnit evidence path

Although outside the three EF target object types, this is the downstream D-16 leak that consumes their refs and must be closed with Phase 4.

### 7.1 Direct monitor-intake writer

- `PaperImplementationWorkOrderExperimentBridgeService.recordRunMonitorIntake`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:274`.
- Determines `trusted` solely from whether the request resolves a WorkOrder: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:278-284`.
- Copies caller result, validation, and EvidenceCandidate refs/hashes into `RunMonitorIntakeRecord`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:285-304`.
- For every status in `FINAL_RUN_STATUSES`, it invokes final evidence validation: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:307-317`.
- Constructs a trusted `RunEvidenceUnit`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:318-348`.
- Copies result/validation/evidence refs without resolving their scientific eligibility: lines 334–339.
- Persists the monitor intake, optional REU, and WorkOrder update through `recordMonitorIngestion`: lines 351–355.

Final-input checks:

- `assertFinalRunEvidenceInput`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:516`.
- Requires result ref/hash only for result-required statuses: lines 517–522.
- Requires validation-report ref/hash only for result-required statuses: lines 523–531.
- Requires a failure summary for failed, cancelled, inconclusive, and negative statuses: lines 533–541.
- It does not:
  - require an EvidenceCandidate;
  - load or validate an EvidenceCandidate;
  - verify exact Run batch completeness;
  - verify validation-passed status;
  - verify provider provenance;
  - reject LocalScript or fake execution.

Trace requirement:

- `requireRunEvidenceUnitId`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:545-553`.
- `requireRunEvidenceTraceManifest`: `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:556-573`.
- These enforce identity/trace existence, not scientific eligibility.

Direct HTTP entrance:

- `POST /paper-implementation/projects/:implementation_project_id/run-monitor-intakes`: `apps/backend/src/routes/paper-implementation-routes.ts:973-985`.
- `PaperImplementationController.recordRunMonitorIntake`: `apps/backend/src/controllers/paper-implementation-controller.ts:1129-1144`.
- The route is cutover-guarded at `apps/backend/src/routes/paper-implementation-routes.ts:983`.

Repository writer:

- `PaperImplementationWorkOrderRepository.recordMonitorIngestion` persistence contract includes optional `run_evidence_unit`: `apps/backend/src/repositories/paper-implementation-workorder.repository.ts:10`.
- `PrismaPaperImplementationWorkOrderRepository.recordMonitorIngestion` directly creates `PaperImplementationRunEvidenceUnit`: `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:257-260`.
- In-memory persistence also writes the REU when present: `apps/backend/src/repositories/in-memory-paper-implementation-workorder-repository.ts:106-125`.

### 7.2 PI live adapter terminal conversion

- `PaperImplementationLiveExperimentAdapterService.recordFinalOrStatusUpdate`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:274`.
- Treats mapped `succeeded`, `failed`, and `cancelled` statuses as terminal: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:288-290`.
- Nonterminal status produces no REU: lines 291–310.
- For terminal status:
  - derives/accepts a RunEvidenceUnit ID: line 313;
  - resolves or creates a TraceManifest: lines 314–316;
  - loads result/validation/evidence refs only for succeeded status: lines 317–319;
  - failed/cancelled statuses use empty evidence refs;
  - calls `recordRunMonitorIntake`: lines 320–344;
  - returns the resulting REU: lines 345–351.
- Its own note states that terminal jobs are converted into trusted RunEvidenceUnit objects: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:351`.

`loadFinalEvidenceRefs`:

- Requires `experiment_result`: `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:379`.
- Requires `result_validation_report`: lines 380–387.
- Loads only record hashes: lines 389–390.
- EvidenceCandidate refs are optional: lines 391–397.
- Does not require exactly one EvidenceCandidate, load its payload, or check validation/provenance: lines 399–406.

Consequences:

- Failed/cancelled terminal executions can create trusted REUs with no EF result/validation/evidence.
- Succeeded executions can create trusted REUs with result and validation refs but no EvidenceCandidate.
- Accepted-partial validation can flow through the legacy collector and be represented as evidence.
- LocalScript and the legacy fake Aliyun client are not rejected.
- The path is per external job, not complete exact Run batch.
- This is the pre-D-16 mixed evidence-accounting path that Phase 4 must replace with one Gateway path consuming only complete, validation-passed exact-batch EvidenceCandidate authority.

## 8. Phase 4 closure checklist derived from the inventory

Phase 4 planning must explicitly replace or hard-disable all of the following:

1. `ExperimentFoundationExecutionService.collectJob` and its private:
   - `createExperimentResult`;
   - `createValidationReport`;
   - `createEvidenceCandidate`.
2. The per-job `analyzeValidation` heuristic validator.
3. Generic `ExperimentFoundationService.createRecord` authority for:
   - `experiment_result`;
   - `result_validation_report`;
   - `evidence_candidate`.
4. Generic `ExperimentFoundationService.upsertRecord` authority for the same kinds.
5. Direct generic EF POST/PUT entrances, with enforcement below the HTTP cutover hook so internal callers cannot bypass closure.
6. Direct legacy EF collect entrance.
7. PI live-experiment collect entrance and its `accept_partial` forwarding.
8. Contract vocabulary and runtime branches for:
   - `accept_partial`;
   - `accepted_partial`;
   - `partial_acceptance_ref`;
   - accepted-partial EvidenceCandidate eligibility.
9. Partial materialization admission where it can feed scientific execution.
10. Per-artifact/log `training_task_partial_result_ref` behavior where it overlaps the new exact-batch result authority.
11. The non-atomic sequence of generic result, observation, fact, validation, evidence, and external-job writes.
12. The PI monitor-intake REU writer that trusts caller refs.
13. The PI live adapter’s terminal failed/cancelled REU creation.
14. The PI live adapter’s succeeded path that requires only result and validation refs while treating EvidenceCandidate as optional.
15. LocalScript provenance:
    - `adapter_kind='local_script'`;
    - `platform_kind='local_script'`;
    - external ref type `local_script_process`;
    - job ID prefix `local_script_`.
16. Explicit Pack B fake provenance:
    - `execution_mode='simulation'`;
    - `provenance='non_production_fake_provider'`;
    - adapter identity `deterministic_fake_aliyun_pai_dlc@v1`;
    - ref type/prefix `fake_aliyun_pai_dlc_job`.
17. Legacy fake Aliyun execution, which uses:
    - `adapter_kind='aliyun_pai_dlc'`;
    - ref type `aliyun_pai_dlc_job`;
    - ID prefix `aliyun_pai_dlc_`;
    - only `{ mocked: true }` metadata to reveal fakery.
18. Any new Gateway or ScientificValidation implementation must consume the existing typed EvaluationProtocol v2 `required_rules` authority rather than legacy opaque policy blocks or a second rule representation.
19. Scientific validation must be batch scoped to one exact `ExperimentFoundationRunV2` and all required `ExperimentFoundationRunCellV2` rows, not to one legacy external job.
20. EvidenceCandidate minting must occur only from a complete, validation-passed, real-provider exact batch and at a single writer point.

SURVEY COMPLETE
