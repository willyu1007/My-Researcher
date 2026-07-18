# PaperImplementation Phase 4 current-path survey

## Scope and conclusion

This is a read-only inventory of the current PaperImplementation (PI) paths relevant to T-132 Phase 4 and decisions D-16, D-17, and D-18.

The current implementation still contains all four superseded authorities that the atomic cutover must remove together:

1. Callers author `cycle_assessment`, and callers may select `decision_exit` before closure.
2. Result Analysis produces four scenarios plus complete packet semantics and deterministically assembles a `CreateResultInterpretationPacketRequest`.
3. WorkOrder monitor ingestion mints trusted REUs for `failed`, `cancelled`, `inconclusive`, and `negative` statuses as well as `succeeded`.
4. Ready-dossier validation scans all project REUs and reconciles failed-like statuses globally.

`PaperExperimentSidecar` is also currently an independently writable and upsertable generic Experiment Foundation record, not a rebuild-only projection. No production `CycleReadyForInterpretation` contract, event, evaluator, repository, or route exists.

## 1. ValidationCycle closure and completion

### Caller-authored contract surface

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:266` — `ValidationCycleAssessment`. Caller-authored fields are `outcome`, `information_gain_realized`, `residual_uncertainties`, `recommended_next_action`, and `rationale` at `:266-272`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:274` — `ValidationCycle`. The current record shape includes lifecycle/execution status, mutable `outputs`, optional `cycle_assessment`, trace/gate refs, optional `decision_exit`, confirmation/proposal lineage, and timestamps at `:274-303`.

  There is no current-effective execution-accounting snapshot, closure snapshot hash, selected-exit derivation provenance, disposition field, or closure CAS version.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:414` — `CreateValidationCycleDraftRequest`. It accepts caller-selected `decision_exit` at `:423`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:433` — `AdmitValidationCycleRequest`. It accepts or overrides caller-selected `decision_exit` at `:436`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:443` — `CompleteValidationCycleRequest`. It accepts caller-authored `cycle_assessment` at `:447`, plus caller-selected closure lifecycle status, execution status, and arbitrary partial outputs at `:444-446`.

  It does not accept `decision_exit` at completion. Closure merely preserves the value previously supplied at draft or admission.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:752` — `createValidationCycleDraftRequestSchema`. It exposes `decision_exit` at `:765`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:800` — `admitValidationCycleRequestSchema`. It exposes `decision_exit` at `:807`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:815` — `completeValidationCycleRequestSchema`. It requires caller `cycle_assessment` at `:818` and accepts it at `:823`.

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts:828` — `validationCycleSchema`. It exposes stored `cycle_assessment` and `decision_exit` at `:864` and `:868`.

### HTTP, controller, and service path

- `apps/backend/src/routes/paper-implementation-routes.ts:765` — draft POST `/paper-implementation/projects/:implementation_project_id/validation-cycles/drafts`, validated by `createValidationCycleDraftRequestSchema` at `:766-773`.

- `apps/backend/src/routes/paper-implementation-routes.ts:775` — admission POST `/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/admit`, validated by `admitValidationCycleRequestSchema` at `:776-783`.

- `apps/backend/src/routes/paper-implementation-routes.ts:785` — completion POST `/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/complete`, validated by `completeValidationCycleRequestSchema` and dispatched to `controller.completeValidationCycle` at `:786-793`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:721` — `createValidationCycleDraft`. It forwards the caller body unchanged to the service at `:729-732`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:739` — `admitValidationCycle`. It forwards the caller body unchanged at `:750-754`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:761` — `completeValidationCycle`. It forwards the caller body unchanged to `PaperImplementationValidationCyclePlanningService.completeValidationCycle` at `:772-776`.

- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts:104` — `createValidationCycleDraft`. It builds the input snapshot at `:139-153` and the initial cycle at `:154-183`, copying caller `decision_exit` at `:172` and initializing `cycle_assessment` to `null` at `:168`.

- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts:191` — `admitValidationCycle`. It copies `request.decision_exit ?? cycle.decision_exit` at `:226`.

- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts:235` — `completeValidationCycle`.

  Current behavior:

  - permits `admitted`, `running`, or `interpreting` cycles at `:241-244`;
  - reads two recently completed cycles for the same target at `:245-250`;
  - takes the closure timestamp at `:251`;
  - copies caller lifecycle status and execution status at `:254-255`;
  - merges caller-supplied partial outputs at `:256`;
  - directly stores caller `request.cycle_assessment` at `:257`;
  - sets `updated_at` and `completed_at` at `:258-259`;
  - persists by a general cycle update at `:261`;
  - consumes the caller-authored assessment for the repeated-low-information loop check at `:262-281`.

  It does not derive an exit, calculate a scientific disposition, evaluate D-18 current-effective scope, fence branch heads or attempts, reject active real attempts, snapshot eligible REUs, or write an immutable execution-accounting record.

### Persistence and current closure record

- `prisma/schema.prisma:4472` — `PaperImplementationValidationCycleInputSnapshot`. This stores the initial context snapshot fields at `:4472-4485`; it is not a D-18 closure or execution-accounting snapshot.

- `prisma/schema.prisma:4487` — `PaperImplementationValidationCycle`. The current closure-bearing row contains:

  - target, trigger, frame, context, criteria, and budget at `:4491-4503`;
  - `expectedInformationGain` at `:4504`;
  - `cycleStatus` and `executionStatus` at `:4505-4506`;
  - JSON `outputs` at `:4507`;
  - JSON `cycleAssessment` at `:4508`;
  - nullable string `decisionExit` at `:4509`;
  - gate/trace fields at `:4510-4512`;
  - confirmation and policy fields at `:4513-4515`;
  - proposal lineage at `:4516-4517`;
  - audit timestamps, including `completedAt`, at `:4518-4522`.

  There is no embedded Cycle closure scope, effective-head snapshot, attempt accounting, eligible-REU membership, snapshot hash, proposal hash binding, disposition, or closure version/CAS field.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:88` — `toValidationCycle`. It maps `cycleAssessment` and `decisionExit` at `:103-110`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:246` — `createValidationCycleDraft`. It atomically creates the initial input snapshot and cycle at `:249-269`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:272` — `findValidationCycleById`. It resolves by project and cycle id at `:272-279`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:282` — `listValidationCycles`. It performs a project-wide cycle listing at `:282-289`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:292` — `updateValidationCycle`. It unconditionally updates by cycle id at `:295-299`; there is no lifecycle, state-version, head-watermark, or closure CAS condition.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:302` — `listRecentCompletedCyclesByTarget`. It queries completed cycles by project and target at `:302-318` for the low-information review behavior.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:450` — `toCycleCreateInput`. It persists `cycleAssessment` and `decisionExit` at `:474-478`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-repository.ts:498` — `toCycleUpdateInput`. It reuses the full create mapping at `:500-502`, so completion rewrites the complete row instead of committing a dedicated immutable closure structure.

### Atomic-cutover disposition

Close or replace together:

- draft/admission `decision_exit`;
- completion `cycle_assessment`;
- caller-selected closure lifecycle/execution status;
- arbitrary caller closure `outputs`;
- the completion request and schema;
- the service’s direct assignments;
- the general non-CAS row-update semantics;
- the current closure row shape.

Preserve:

- the existing `/complete` action as the sole human closure action;
- project and Cycle scope enforcement;
- applicable trace, confirmation, and proposal lineage;
- the low-information review behavior only after converting it to consume server-derived closure output.

## 2. Result Analysis and ResultInterpretationPacket creation

### Where scenarios are produced

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:192` — Result Analysis slot id `result_analysis.interpretation_scenarios`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:241` — Result Analysis runtime/profile identifier `paper-implementation-result-analysis-scenarios`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:321` — role slot `result_analysis.interpretation_scenario_builder`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:363` — role artifact schema id `PaperImplementationResultAnalysisRoleArtifact@v1`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:367` — runtime request schema id `RunPaperImplementationResultAnalysisRuntimeRequest@v1`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1034` — `PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS`. The current required scenario set is:

  - `positive`;
  - `negative`;
  - `inconclusive`;
  - `failed_run`.

  The definition is at `:1034-1041`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1043` — `PaperImplementationResultAnalysisScenarioOutput`. Each scenario contains id/kind/summary, support/challenge/limitation refs, forbidden overclaims, recommended claim refs, and follow-up refs at `:1043-1053`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1055` — comment and semantic contract boundary. It explicitly states that the three semantic blocks form the semantic half of `ResultInterpretationPacket`, and that the runtime service deterministically assembles `CreateResultInterpretationPacketRequest` from them plus structural request refs at `:1055-1063`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1065` — `PaperImplementationResultAnalysisInterpretationSummary`. This includes result summary text, assertion refs, unexpected findings, failed/inconclusive/stale refs, and accounting flags at `:1065-1076`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1078` — `PaperImplementationResultAnalysisReliabilityAssessment`, including `failed_runs_retained`, confound/limitation refs, and notes at `:1078-1083`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1085` — `PaperImplementationResultAnalysisClaimImplications`, including allowed claim ceiling, forbidden overclaims, recommended claims, and follow-ups at `:1085-1090`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1092` — `PaperImplementationResultAnalysisRoleOutput`. The role emits:

  - `scenario_outputs` at `:1099`;
  - complete `interpretation` at `:1106`;
  - complete `reliability` at `:1107`;
  - complete `claim_implications` at `:1108`.

  Comments at `:1100-1105` explicitly state that the runtime assembles `CreateResultInterpretationPacketRequest`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1111` — `PaperImplementationResultAnalysisArtifact`. The final runtime artifact carries both `domain_gate_request` and `scenario_outputs` at `:1123-1124`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:1139` — `RunPaperImplementationResultAnalysisRuntimeRequest`. Scenarios can originate from:

  - provider execution selected through `execution_mode`;
  - caller-supplied `mocked_role_outputs` at `:1157-1160`;
  - caller-supplied `codex_role_outputs` at `:1161-1164`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3409` — `paperImplementationResultAnalysisScenarioOutputSchema` begins with its required fields at `:3409-3429`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3432` — `completeResultAnalysisScenarioOutputsSchema`. It requires an array containing every one of the four scenario kinds at `:3432-3445`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3447` — `paperImplementationResultAnalysisInterpretationSummarySchema`, validating the complete interpretation block at `:3447-3474`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3476` — `paperImplementationResultAnalysisReliabilityAssessmentSchema`, validating the reliability block at `:3476-3491`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3493` — `paperImplementationResultAnalysisClaimImplicationsSchema`, validating claim implications at `:3493-3508`.

- `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:3519` — `paperImplementationResultAnalysisRoleOutputSchema`. It validates the scenario array and three semantic blocks at `:3519-3552`.

- `apps/backend/src/routes/paper-implementation-routes.ts:410` — POST `/paper-implementation/projects/:implementation_project_id/runtime-slots/result-analysis-scenarios/run` at `:411-418`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1644` — `runResultAnalysisRuntime`. It calls `PaperImplementationResultAnalysisRuntimeService.runInterpretationScenarios` at `:1652-1656`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:182` — `SLOT_PROFILE`. It identifies the result-analysis workflow, role, prompt, final artifact, and output contract at `:182-196`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:198` — retry constants. Missing semantic blocks, incomplete scenario sets, malformed assembled packet requests, and invalid assertion ref types are treated as retryable result-analysis failures at `:198-220`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:263` — `runInterpretationScenarios`.

  It:

  - validates the request at `:267`;
  - requires an active PI project at `:268`;
  - creates the runtime identity at `:269-270`;
  - handles deterministic preflight blockers at `:275-289`;
  - invokes the role at `:292`;
  - records the role artifact at `:293-295`;
  - derives passed/blocked status from role output at `:312-322`;
  - records a final artifact at `:323-330`;
  - returns the final runtime result at `:333-341`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:344` — `invokeRoleWithBoundedRetry`. Provider mode may retry runtime or semantic failures at `:344-373`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:376` — `invokeRole`. It calls the agent orchestrator with the strict result-analysis role schema at `:387-410`.

  Output origins are:

  - provider LLM through the orchestrator;
  - mocked output injected at `:423-429`;
  - Codex-assisted operator output injected at `:430-436`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:442` — `recordPreflightBlockedArtifact`. A deterministic blocked artifact produces no scenarios and null semantic blocks at `:447-455`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:896` — `roleMessages`. The prompt:

  - tells the role that interpretations are not evidence at `:904-905`;
  - tells it to use actual source-context bodies at `:906-910`;
  - requires all four scenarios and all three packet semantic blocks at `:911-914`;
  - enforces assertion/evidence ref separation at `:915-916`;
  - instructs it not to emit the structural request envelope at `:917`;
  - prohibits writing claims, dossiers, trace repairs, queues, prompt text, or raw provider output at `:918`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:923` — user prompt payload. It explicitly includes `required_scenario_kinds: ['positive', 'negative', 'inconclusive', 'failed_run']` at `:923-935`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1062` — `roleArtifactPayload`. It stores the role output in the runtime artifact at `:1062-1073`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1076` — `fixtureOutputForMode`. It selects `mocked_role_outputs` or `codex_role_outputs` at `:1076-1085`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1088` — `assertRequest`.

  It:

  - checks ref/hash cardinality at `:1089-1090`;
  - checks source-context hash fencing at `:1092`;
  - requires structural context sufficient for a packet request before any provider call at `:1093-1105`;
  - restricts product mode to provider LLM at `:1106-1107`;
  - rejects profile/mode mismatches at `:1109-1128`;
  - requires caller fixtures for mocked/Codex modes at `:1142-1146`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1259` — `semanticOutputFailureCode`. It:

  - rejects missing semantic blocks at `:1266-1268`;
  - rejects evidence refs in assertion positions at `:1269-1277`;
  - rejects missing scenario kinds at `:1279-1283`;
  - assembles and validates the full packet request at `:1284-1287`.

### Can Result Analysis directly materialize a packet?

It does not write Prisma during the same `runInterpretationScenarios` call, but it currently produces a complete materializable packet command and exposes a dedicated second HTTP action that persists it. This is more authority than a hash-bound proposal.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:767` — `finalPayload`. For passed output it embeds a complete service-assembled `domain_gate_request` at `:794-800`.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1308` — `assembleDomainGateRequest`. It returns a full `CreateResultInterpretationPacketRequest` from request structural context plus model semantics at `:1308-1325`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:73` — result-analysis artifact validator field.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:76` — packet-request validator field.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:84` — constructor compilation of the Result Analysis artifact validator.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:87` — constructor compilation of `createResultInterpretationPacketRequestSchema` at `:87-88`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:91` — `materializeFinalRuntimeArtifact`. It recognizes the Result Analysis slot and dispatches its embedded request to packet materialization at `:99-113`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:148` — `materializeResultInterpretationPacket`. It:

  - looks for an existing packet at `:154-157`;
  - calls `resultClaimDossier.createResultInterpretationPacket` at `:162`;
  - retries by read-back on a version conflict at `:163-175`;
  - verifies the stored packet matches the request at `:177`;
  - returns the materialized packet ref/hash at `:178-189`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:292` — `assertMaterializableFinalArtifact`. It permits passed final Result Analysis artifacts at `:292-313`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:316` — `resultAnalysisPayload`. It validates and casts the final runtime artifact payload at `:316-324`.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:359` — `resultInterpretationPacketRequest`. It validates the embedded full packet request at `:359-370`.

- `apps/backend/src/routes/paper-implementation-routes.ts:278` — runtime artifact admission route at `:278-287`.

- `apps/backend/src/routes/paper-implementation-routes.ts:288` — POST `/paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate` at `:289-294`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1570` — `materializeRuntimeDomainGate`. It invokes `materializeFinalRuntimeArtifact` at `:1580-1584`.

### Every ResultInterpretationPacket creation trigger

There are exactly two production entry triggers. Both converge on the same service and repository writer.

#### Trigger 1: Direct public POST

- `apps/backend/src/routes/paper-implementation-routes.ts:997` — POST `/paper-implementation/projects/:implementation_project_id/result-interpretation-packets`, validated with `createResultInterpretationPacketRequestSchema` and handled by `controller.createResultInterpretationPacket` at `:998-1006`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1244` — `createResultInterpretationPacket`. It forwards the caller body to the dossier service at `:1252-1256`.

#### Trigger 2: Admitted runtime Domain Gate materialization

- `apps/backend/src/routes/paper-implementation-routes.ts:288` — materialization route.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1570` — materialization controller.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:91` — final runtime artifact dispatcher.

- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts:148` — packet materializer.

This path materializes a passed, admitted Result Analysis final artifact.

### Converged packet writer stack

- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts:131` — `ResultInterpretationPacket`. The independent packet contains Cycle/plan ids, source bundle, result summary, reliability, claim implications, interpretation gate status, trace, policy, creator, and timestamp at `:131-146`.

- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts:148` — `CreateResultInterpretationPacketRequest`. It accepts complete packet content at `:148-159`.

- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts:448` — `createResultInterpretationPacketRequestSchema` at `:448-472`.

- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts:474` — `resultInterpretationPacketSchema` at `:474-507`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:173` — `createResultInterpretationPacket`.

  It:

  - requires an active project at `:177`;
  - resolves the Cycle at `:178-184`;
  - optionally resolves and checks the plan at `:185-200`;
  - requires a complete trace manifest at `:201-207`;
  - resolves source REUs at `:208-213`;
  - applies the result-interpretation gate at `:214`;
  - constructs the packet at `:216-231`;
  - calls the repository writer at `:232`.

  It only checks that the Cycle exists. It does not require that the Cycle is closed, that it has a D-18 immutable snapshot, or that the proposal matches a closure hash.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:580` — `resolveRunEvidenceRefs`. It requires source refs to resolve to trusted same-Cycle and optionally same-plan REUs at `:580-627`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:629` — `assertResultInterpretationGate`.

  It:

  - requires at least one REU at `:633-635`;
  - requires exploratory/confirmatory separation at `:636-641`;
  - requires forbidden overclaims at `:643-648`;
  - checks validation-report coverage at `:650-659`;
  - checks metric refs for successful runs at `:660-666`;
  - treats `failed`, `cancelled`, and `negative` REUs as failed-like at `:668-678`;
  - handles `inconclusive` REUs at `:679-689`.

  It performs no CycleReady or closed-snapshot check.

- `apps/backend/src/repositories/paper-implementation-result-claim-dossier.repository.ts:9` — repository-level `createResultInterpretationPacket` writer contract at `:9-11`.

- `apps/backend/src/repositories/in-memory-paper-implementation-result-claim-dossier-repository.ts:24` — in-memory packet writer. It asserts a new id and writes to `resultPackets` at `:24-28`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts:70` — `toResultInterpretationPacket`, mapping the durable row at `:70-86`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts:167` — `createResultInterpretationPacket`. It performs a direct Prisma create at `:170-173`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts:271` — `toResultPacketCreateInput`. It persists:

  - source REU refs at `:279-280`;
  - validation report refs at `:281-282`;
  - metric refs at `:283-284`;
  - failed-run refs at `:285-286`;
  - inconclusive-run refs at `:287-288`;
  - stale/invalidated refs at `:289-290`;
  - complete source and semantic blocks at `:291-294`;
  - gate/accounting/claim fields at `:295-300`.

- `prisma/schema.prisma:4913` — `PaperImplementationResultInterpretationPacket`. It is an independent row with:

  - project/Cycle/plan identity at `:4914-4917`;
  - REU/validation/metric/failed/inconclusive/stale refs at `:4918-4929`;
  - source, result summary, reliability, and claim implications at `:4930-4933`;
  - gate and accounting booleans at `:4934-4937`;
  - claim ceiling/overclaim count at `:4938-4939`;
  - trace, policy, creator, and timestamp at `:4940-4944`.

  It has no Cycle closure snapshot hash or proposal-to-closure binding.

### Atomic-cutover disposition

Replace the four-scenario/full-command authority with one hash-bound proposal contract.

Remove or close both pre-closure packet creation triggers, or constrain the sole surviving packet creation path to a post-closure server projection.

Preserve runtime artifact admission, hashing, replay, and audit machinery as proposal transport and evidence—not as an independent scientific conclusion writer.

## 3. RunEvidenceUnit writers and creation paths

### Contract currently permits failed and cancelled REUs

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:8` — `PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES`, used by REUs at `:8-20`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:43` — harness execution statuses, including `failed` and `cancelled`, at `:43-51`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:53` — monitor event kinds, including `failed` and `cancelled`, at `:53-62`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:64` — `PAPER_IMPLEMENTATION_RUN_STATUSES`. It mixes execution states and scientific dispositions:

  - `submitted`;
  - `running`;
  - `succeeded`;
  - `failed`;
  - `cancelled`;
  - `inconclusive`;
  - `negative`.

  The definition is at `:64-74`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:76` — REU trust statuses `trusted`, `untrusted`, and `needs_review` at `:76-82`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:149` — `RunMonitorIntakeRecord`. It stores caller-supplied result, validation-report, EvidenceCandidate refs/hashes, failure summary, and raw payload at `:149-168`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:170` — `RunEvidenceUnit`. It carries:

  - WorkOrder, Cycle, plan, and monitor ids at `:171-176`;
  - external job identity/hash at `:177-178`;
  - mixed `run_type`, `run_status`, and trust status at `:179-181`;
  - dataset/baseline/code/config refs at `:182-185`;
  - result/report refs and hashes at `:186-189`;
  - EvidenceCandidate refs and hashes at `:190-191`;
  - failure summary identity/content at `:192-193`;
  - trace and creation audit fields at `:194-197`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:235` — `RecordRunMonitorIntakeRequest`. Callers can provide:

  - `monitor_intake_id`;
  - `run_evidence_unit_id`;
  - `run_evidence_trace_manifest_id`;
  - `work_order_id`;
  - external job ref/hash;
  - monitor and run status;
  - result ref/hash;
  - validation report ref/hash;
  - EvidenceCandidate refs/hashes;
  - failure summary;
  - raw payload and timestamps.

  These fields are at `:235-254`. This is not identity-only server resolution.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:256` — `RecordRunMonitorIntakeResponse`, returning both monitor and optional REU at `:256-259`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:379` — `recordRunMonitorIntakeRequestSchema`. It exposes all caller authority fields at `:379-403`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:488` — `runMonitorIntakeRecordSchema` at `:488-523`.

- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts:525` — `runEvidenceUnitSchema`. It requires the mixed `run_status`, trust status, candidate refs/hashes, and trace at `:525-565` and following properties.

- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:62` — `SyncLiveExperimentRunRequest`, which can specify monitor identity and receipt metadata at `:62-67`.

- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:69` — `CollectLiveExperimentRunRequest`. Caller may supply REU/trace ids and failure summary at `:69-78`.

- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:80` — `CancelLiveExperimentRunRequest`. Caller may supply REU/trace ids at `:80-90`.

- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:141` — `collectLiveExperimentRunRequestSchema`. It exposes caller REU/trace ids and failure summary at `:141-154`.

- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts:156` — `cancelLiveExperimentRunRequestSchema`. It exposes caller REU/trace ids at `:156-171`.

### Sole low-level constructor today, with multiple entry paths

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:53` — `FINAL_RUN_STATUSES`. It explicitly includes `succeeded`, `failed`, `cancelled`, `inconclusive`, and `negative`.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:54` — `RESULT_REQUIRED_RUN_STATUSES`, only `succeeded`.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:55` — `FAILURE_SUMMARY_REQUIRED_RUN_STATUSES`, containing `failed`, `cancelled`, `inconclusive`, and `negative`.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:274` — `recordRunMonitorIntake`. This is the only production domain constructor of a `RunEvidenceUnit` object.

  Current flow:

  - requires an active project at `:278`;
  - resolves an optional WorkOrder at `:280-282`;
  - sets trust to `trusted` whenever a WorkOrder was supplied, otherwise `untrusted`, at `:283`;
  - accepts caller raw payload after only the cross-boundary payload-copy guard at `:284`;
  - builds `RunMonitorIntakeRecord` from caller fields at `:285-304`;
  - initializes optional REU and WorkOrder update at `:305-306`;
  - if a WorkOrder exists, checks external-job consistency at `:307-309`;
  - for every `FINAL_RUN_STATUSES` member, calls final-input validation at `:310-311`;
  - trusts caller REU id at `:312`;
  - resolves a caller-selected trace manifest at `:313-317`;
  - constructs a trusted REU at `:318-348`;
  - copies caller result/report/candidate fields at `:334-339`;
  - creates a generated failure-summary id from caller text at `:340-343`;
  - persists monitor, optional REU, and WorkOrder update together at `:351-355`;
  - returns the persisted REU at `:356-359`.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:516` — `assertFinalRunEvidenceInput`.

  It:

  - requires result ref/hash only for `succeeded` at `:517-522`;
  - requires validation report ref/hash only for `succeeded` at `:523-531`;
  - requires only free-text `failure_summary` for `failed`, `cancelled`, `inconclusive`, and `negative` at `:533-541`.

  No EF EvidenceCandidate existence, validation-passed status, protocol compliance, exact Run/Attempt identity, execution mode, batch identity, or candidate hash resolution is performed.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:545` — `requireRunEvidenceUnitId`. It trusts a caller-supplied REU identity at `:545-553`.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:556` — `requireRunEvidenceTraceManifest`. It checks only that a complete trace manifest is targeted at the caller-selected REU id at `:556-573`.

- `apps/backend/src/repositories/paper-implementation-workorder.repository.ts:8` — `RunMonitorIngestionPersistence`, containing monitor, optional REU, and optional WorkOrder update.

- `apps/backend/src/repositories/paper-implementation-workorder.repository.ts:52` — project REU listing contract.

- `apps/backend/src/repositories/paper-implementation-workorder.repository.ts:56` — keyed REU lookup contract.

- `apps/backend/src/repositories/paper-implementation-workorder.repository.ts:61` — external-job REU lookup contract.

- `apps/backend/src/repositories/in-memory-paper-implementation-workorder-repository.ts:20` — in-memory REU maps.

- `apps/backend/src/repositories/in-memory-paper-implementation-workorder-repository.ts:108` — in-memory monitor-ingestion REU insertion starts here; it writes the REU and project index at `:108-128`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:249` — `recordMonitorIngestion`. It transactionally creates:

  - the monitor at `:252-256`;
  - the optional REU at `:257-263`;
  - the optional WorkOrder update at `:264-270`.

  The transaction executes at `:272`, and the persisted REU is mapped at `:273-279`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:282` — `listRunEvidenceUnits`. It lists all project REUs at `:282-289`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:292` — `findRunEvidenceUnitById` at `:292-299`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:302` — `findRunEvidenceUnitByExternalJob` at `:302-317`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:473` — `toRunEvidenceUnitCreateInput`. It maps the complete legacy REU into Prisma at `:473-510` and following fields.

- `prisma/schema.prisma:4816` — `PaperImplementationRunMonitorIntake`. It durably stores caller result/report/candidate refs and hashes, failure summary, raw payload, and trust/run status at `:4816-4854`.

- `prisma/schema.prisma:4856` — `PaperImplementationRunEvidenceUnit`. It is the current durable REU row with:

  - project/WorkOrder/Cycle/plan/monitor ids at `:4857-4862`;
  - external job identity/hash at `:4863-4867`;
  - mixed `runType`, `runStatus`, and `trustedStatus` at `:4868-4870`;
  - dataset/baseline/code/config refs at `:4871-4878`;
  - result and validation report refs/hashes at `:4879-4888`;
  - EvidenceCandidate refs/hashes at `:4889-4891`;
  - failure summary id/content at `:4892-4893`;
  - trace and audit fields at `:4894-4897`;
  - project, WorkOrder, Cycle, plan, monitor, job, status, validation, failure, and trace indexes at `:4899-4910`.

### Creation path 1: Standalone/manual attachment, monitor, and recovery intake

- `apps/backend/src/routes/paper-implementation-routes.ts:973` — POST `/paper-implementation/projects/:implementation_project_id/run-monitor-intakes` at `:977-985`.

- The route uses `recordRunMonitorIntakeRequestSchema` at `:979-982`.

- The route is protected by `legacyMutationOnRequest` at `:983`, but it remains the registered legacy writer path and must be closed or redirected during atomic cutover.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1129` — `recordRunMonitorIntake`. It calls `workOrderExperimentBridge.recordRunMonitorIntake` at `:1137-1141`.

- With `work_order_id`, any final status creates a trusted REU.

- Without a WorkOrder, it stores an untrusted monitor and no REU because the REU constructor is inside the `if (workOrder)` branch at `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:307-350`.

This single public endpoint is the present standalone-attachment, monitor, and recovery seam. There is no separate production recovery worker or recovery-specific REU repository writer.

### Creation path 2: Live collect

- `apps/backend/src/routes/paper-implementation-routes.ts:945` — POST `/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect` at `:949-957`.

- The route uses `collectLiveExperimentRunRequestSchema` at `:951-954` and `legacyMutationOnRequest` at `:955`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1081` — `collectLiveExperimentRun`. It calls the live adapter at `:1093-1099`.

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:177` — `collectLiveExperimentRun`.

  It:

  - resolves the WorkOrder at `:183-186`;
  - resolves the owned external job at `:187`;
  - returns any already-created REU before collection side effects at `:188-195`;
  - calls the provider collection operation at `:197-204`;
  - returns any REU discovered after collection at `:206-213`;
  - otherwise calls `recordFinalOrStatusUpdate` at `:215-228`.

A terminal success, failure, or cancellation reaches monitor ingestion and can create an REU.

### Creation path 3: Live cancel

- `apps/backend/src/routes/paper-implementation-routes.ts:959` — POST `/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/cancel` at `:963-971`.

- The route uses `cancelLiveExperimentRunRequestSchema` at `:965-968` and `legacyMutationOnRequest` at `:969`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1105` — `cancelLiveExperimentRun`. It calls the adapter at `:1117-1123`.

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:231` — `cancelLiveExperimentRun`.

  It:

  - resolves the WorkOrder and owned job at `:237-241`;
  - returns an existing REU before cancel side effects at `:242-249`;
  - invokes provider cancellation at `:251-256`;
  - calls `recordFinalOrStatusUpdate` at `:258-271`;
  - passes the human cancel reason as the failure summary at `:268`.

A terminal cancelled external job therefore mints a trusted cancelled REU.

### Creation path 4: Live finalization common path

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:274` — `recordFinalOrStatusUpdate`.

  It:

  - maps external status at `:288`;
  - treats `succeeded`, `failed`, and `cancelled` as terminal at `:289`;
  - writes monitor-only status for nonterminal jobs at `:290-310`;
  - derives or accepts a REU id at `:313`;
  - accepts or creates the trace manifest at `:314-316`;
  - loads EF result/report/candidate refs only for `succeeded` at `:317-319`;
  - uses empty scientific refs for failed/cancelled executions at `:317-319`;
  - calls `recordRunMonitorIntake` with REU identity and trace at `:320-344`;
  - supplies failure/cancel reason instead of scientific evidence for failed-like terminal statuses at `:337-339`;
  - returns the resulting REU and marks terminal evidence recorded at `:345-351`.

### Creation path 5: Live trace side writer

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:355` — `findOrCreateRunEvidenceTrace`.

  It:

  - computes a prospective REU target at `:361`;
  - scans trace manifests for an existing complete match at `:362-368`;
  - creates a new trace manifest at `:369-375`.

This is not the REU insert itself, but it is a required writer in the current creation choreography. The future gateway must own or transactionally coordinate this trace write rather than allowing adapters to establish REU authority independently.

### Creation path 6: Sync/recovery observation, currently no REU

- `apps/backend/src/routes/paper-implementation-routes.ts:931` — sync POST route begins at `:935-943`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1057` — `syncLiveExperimentRun`. It calls the adapter at `:1069-1075`.

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:135` — `syncLiveExperimentRun`.

  It:

  - resolves the WorkOrder and owned job at `:139-147`;
  - maps sync status at `:148-149`;
  - records a monitor at `:150-163`;
  - returns no final REU and recommends collect/cancel for terminal observation at `:164-173`.

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts:445` — `mapSyncMonitorStatus`. It maps submitted/queued to submitted and every other external status to `running` at `:445-450`.

Thus sync/recovery observation currently does not mint a REU, even if the external job is terminal. It hands off to collect/cancel. This observation path should be preserved as identity-only intake, while eventual evidence eligibility is routed through the single gateway.

### Creation path 7: T-124 code and tests

T-124 does not introduce a second repository writer. Its REU implementation is the same WorkOrder monitor-ingestion constructor plus the live adapter paths.

Tests explicitly lock the current superseded behavior:

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts:572` — “admits work order, submits harness run, and records failed run evidence.”

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts:588-602` — supplies a failed monitor and asserts a failed REU and failed WorkOrder.

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts:696` — “negative final run keeps process completion separate from scientific outcome.”

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts:712-729` — creates and asserts a `negative` REU.

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts:791` — “cancel finalizes trusted cancelled run evidence with target-specific trace.”

- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts:797-815` — asserts a cancelled REU, cancel reason, target-specific trace, terminal evidence flag, and idempotent replay.

These tests must change atomically with the contracts and writer.

### Failed/cancelled eligibility answer

Yes. Failed and cancelled execution can currently become trusted REUs. `negative` and `inconclusive` can also become trusted REUs through the direct monitor path.

The direct constructor is `PaperImplementationWorkOrderExperimentBridgeService.recordRunMonitorIntake` at `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:274`.

Live collect and cancel are adapter paths into that constructor. No current PI Evidence Trust Gateway exists.

## 4. Dossier readiness and T-124 S3 accounting

### Failed-like status authority

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:72` — `FAILED_LIKE_RUN_STATUSES`. The packet-level set is `failed`, `cancelled`, and `negative`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:73` — `PROJECT_ACCOUNTABLE_RUN_STATUSES`. The S3 project-level set is `failed`, `cancelled`, `negative`, and `inconclusive` at `:73-77`.

### Dossier creation path

- `apps/backend/src/routes/paper-implementation-routes.ts:1037` — POST `/paper-implementation/projects/:implementation_project_id/implementation-dossiers` at `:1038-1046`.

- `apps/backend/src/controllers/paper-implementation-controller.ts:1344` — `createImplementationDossier`. It calls the dossier service at `:1352-1356`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:332` — `createImplementationDossier`.

  It:

  - requires an active project at `:336`;
  - resolves the trace manifest at `:337-340`;
  - requires a complete manifest target for `ready_for_writing` at `:341-348`;
  - resolves all result packets at `:349-352`;
  - resolves claim candidates at `:353-356`;
  - resolves claim trace packets at `:357-360`;
  - applies the ordinary dossier gate at `:361`;
  - validates the keyed readiness result at `:362-365`;
  - invokes project-wide REU accounting at `:366`;
  - builds and hashes the dossier at `:367-378`.

### Exact project-wide failed-like accounting

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:1079` — S3-β2 comment documenting the project-wide reconciliation semantics at `:1079-1101`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:1102` — `assertProjectRunEvidenceAccounting`. This is the exact superseded S3 scan.

  For ready dossiers it:

  - skips non-ready dossiers at `:1107-1109`;
  - calls `workOrderRepository.listRunEvidenceUnits(implementationProjectId)` at `:1110`;
  - validates explicit exclusions against the project-wide REU set at `:1111-1115`;
  - filters all trusted project REUs to `PROJECT_ACCOUNTABLE_RUN_STATUSES` at `:1116-1117`;
  - treats direct dossier failed/inconclusive/negative refs as coverage at `:1121-1124`;
  - treats validated exclusions as coverage at `:1125`;
  - treats REUs cited by included ResultInterpretationPackets as coverage at `:1126`;
  - computes missing project REUs at `:1128`;
  - fails with every missing REU id and status at `:1129-1138`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:1159` — `resolveProvablyInvalidatedExclusions`.

  It:

  - consumes the same project-wide REU list at `:1159-1163`;
  - indexes project REUs by id at `:1168`;
  - rejects non-REU or unresolved refs at `:1172-1180`;
  - infers invalidation from a newer trusted same-WorkOrder REU at `:1182-1187`;
  - otherwise loads the WorkOrder and accepts `superseded` status at `:1188-1197`;
  - rejects non-superseded exclusions at `:1198-1213`;
  - returns the accepted exemption set at `:1215`.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:1220` — `runEvidenceRefIds`. It performs normalized REU ref-type filtering at `:1220-1223`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts:282` — `listRunEvidenceUnits`. It performs an unbounded project-wide `findMany` at `:285-289`.

### Other project-wide REU scan

A second project-wide scan exists but is not failed-like dossier accounting:

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:772` — `assertRunEvidenceSupportRefsResolve`.

- It filters ClaimCandidate support refs to REUs at `:776-780`.

- It calls `listRunEvidenceUnits` for the whole project at `:781`.

- It builds a project-wide id set and rejects unresolved support refs at `:782-790`.

This should be converted to keyed or batched explicit-ref lookup during cleanup so a misleading project-scan pattern is not retained.

### Tests locking superseded S3 behavior

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:744` — ready dossier rejects uncovered trusted failed-like project runs.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:746-760` — fixture includes failed and negative project REUs and expects both ids in the missing list.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:768-783` — accepts exclusion when a newer trusted same-WorkOrder REU exists.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:790-818` — direct disclosure and packet-source coverage for failed, negative, and inconclusive REUs.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:823` — rejects exclusion refs that do not resolve to project REUs.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:848` — rejects exclusion of a failed REU that is not provably superseded.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:873` — accepts exclusion when the owning WorkOrder is superseded.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:894` — rejects foreign-typed refs whose ids collide with REU ids.

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts:920` — skips project reconciliation for non-ready dossiers and untrusted failed runs.

### Atomic-cutover disposition

Remove together:

- `PROJECT_ACCOUNTABLE_RUN_STATUSES`;
- `assertProjectRunEvidenceAccounting`;
- the unbounded project-wide REU scan;
- failed/cancelled/negative/inconclusive REU status accounting;
- the newer-REU/WorkOrder-supersession exclusion heuristic;
- the S3 tests that preserve those semantics.

Replace them with explicit immutable closed-Cycle snapshot refs and hashes. Dossier readiness should validate only the referenced closed-Cycle membership. It must not retain a legacy scan fallback.

## 5. PaperExperimentSidecar

### Contract and storage

- `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:548` — `paper_experiment_sidecar` is a first-class generic `ExperimentFoundationRecordKind`.

- `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:1330` — `PaperExperimentSidecar`. It is a full independent aggregate-shaped DTO containing:

  - its own id/project/status at `:1331-1333`;
  - RunRecipe and VersionLock identity/hash at `:1334-1337`;
  - dataset/evaluation/benchmark/baseline/method locks at `:1338-1346`;
  - TrainingTaskSpec and materialization identity/hash at `:1347-1350`;
  - adapter metadata and external job refs/hashes at `:1351-1354`;
  - stage/cancellation/partial-result refs at `:1355-1357`;
  - result and validation refs/hashes at `:1358-1361`;
  - evaluation fact and EvidenceCandidate refs/hashes at `:1362-1365`;
  - paper-table fact refs/hashes at `:1366-1367`;
  - status snapshots, event logs, and provenance at `:1368-1370`;
  - its own `sidecar_hash` and created/updated timestamps at `:1371-1373`.

- `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts:3943` — `experimentFoundationPaperExperimentSidecarSchema`. It requires the full DTO and its own hash/timestamps at `:3943-4041`.

- `apps/backend/src/services/experiment-foundation-service.ts:279` — `RECORD_KIND_CONFIG.paper_experiment_sidecar`. It registers generic create/upsert support with:

  - `paper_experiment_sidecar_id` as identity at `:281`;
  - `sidecar_hash`, `run_recipe_hash`, and `version_lock_hash` as hash fields at `:282`;
  - `sidecar_status` as status at `:283`.

- `prisma/schema.prisma:5923` — `ExperimentFoundationRecord`. This generic durable record contains:

  - kind/id/hash/status/family at `:5924-5929`;
  - parent and owner refs at `:5930-5933`;
  - arbitrary JSON payload/source/traceability refs at `:5934-5936`;
  - mutable created/updated timestamps at `:5937-5938`;
  - uniqueness by `recordKind, recordId` at `:5940`.

There is no dedicated Sidecar projection table and no relational or hash binding to a PI Cycle closure snapshot.

### Writers

- `apps/backend/src/routes/experiment-foundation-routes.ts:93` — generic POST `/experiment-foundation/records`, which can create `record_kind=paper_experiment_sidecar`, at `:93-100`.

- `apps/backend/src/routes/experiment-foundation-routes.ts:101` — generic PUT `/experiment-foundation/records/:record_kind/:record_id`, which can overwrite/upsert a Sidecar, at `:101-110`.

- Both generic mutation routes use `legacyMutationOnRequest` at `apps/backend/src/routes/experiment-foundation-routes.ts:91,97,108`, but the independent writer remains registered and implemented.

- `apps/backend/src/controllers/experiment-foundation-controller.ts:68` — `createRecord`. It calls `ExperimentFoundationService.createRecord` at `:73`.

- `apps/backend/src/controllers/experiment-foundation-controller.ts:80` — `upsertRecord`. It calls `ExperimentFoundationService.upsertRecord` at `:85-89`.

- `apps/backend/src/services/experiment-foundation-service.ts:411` — `createRecord`.

  It:

  - validates kind and caller payload at `:412-414`;
  - rejects an existing record at `:415-421`;
  - derives storage metadata from the caller payload;
  - writes the independently supplied payload through the generic repository at `:424-441`.

- `apps/backend/src/services/experiment-foundation-service.ts:444` — `upsertRecord`.

  It:

  - validates the path/body kind at `:449-452`;
  - validates the full caller payload at `:453`;
  - checks caller payload identity against the path at `:454-457`;
  - loads the current record at `:458`;
  - upserts the independently supplied payload and metadata at `:459-472`.

- `apps/backend/src/repositories/experiment-foundation.repository.ts` — generic `ExperimentFoundationRepository` defines create/upsert/find/list operations for every record kind.

- `apps/backend/src/repositories/in-memory-experiment-foundation-repository.ts:20` — in-memory generic record creation begins here.

- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-repository.ts:233` — `toPrismaRecordData`, mapping generic record content into the `ExperimentFoundationRecord` table.

### Current authority classification

No specialized `PaperExperimentSidecar` builder, rebuilder, projector, or Cycle-closure consumer exists elsewhere in production code. The only production symbol references are the shared contract/configuration, generic record service, generic routes/repositories, and boundary guards.

Therefore, the current Sidecar is an independently writable, mutable generic ledger record. It is not rebuildable-projection-only.

Phase 4 must:

- close generic create/upsert authority for `paper_experiment_sidecar`;
- derive the Sidecar deterministically from immutable closed-Cycle authority;
- avoid migrating Sidecar payloads into a second closure ledger;
- preserve it only as a display/retrieval projection.

## 6. PI v2 Pack A families already landed

### Prisma families

All PI Pack A models are under the T-132 comment at `prisma/schema.prisma:6009-6010`.

#### Branch and embedded head authority

- `prisma/schema.prisma:6011` — `PaperImplementationExperimentWorkOrderBranchV2`.

  It owns:

  - PI project/Cycle/branch identity at `:6012-6015`;
  - branch frame schema, JSON, and hash at `:6016-6018`;
  - branch `stateVersion` at `:6019`;
  - current admitted revision id/sequence at `:6020-6021`;
  - head version and head revision/run/event fields at `:6022-6027`;
  - creation/update timestamps at `:6028-6029`.

- `prisma/schema.prisma:6031-6034` — relations to revisions, exact current revision, exact head revision, and admissions.

- `prisma/schema.prisma:6032-6033` — current/head exact composite restrictive FKs.

- `prisma/schema.prisma:6036-6038` — Cycle/branch-key uniqueness and exact current/head uniqueness.

Head is intentionally embedded in the branch authority rather than stored as a separate independent head ledger.

#### Immutable revision authority

- `prisma/schema.prisma:6044` — `PaperImplementationExperimentWorkOrderRevisionV2`.

  It stores:

  - branch/revision/parent identity at `:6045-6048`;
  - schema-versioned WorkOrder snapshot JSON at `:6049-6050`;
  - immutable content, cell-plan, and approved-plan hashes at `:6051-6053`;
  - creator identity and timestamp at `:6054-6056`.

- `prisma/schema.prisma:6058-6064` — restrictive branch/parent/current/head/cell/admission relations.

- `prisma/schema.prisma:6066-6072` — branch-sequence, branch-content, exact owner/sequence/approved-plan uniqueness and indexes.

#### Ordered revision-cell authority

- `prisma/schema.prisma:6075` — `PaperImplementationExperimentWorkOrderRevisionCellV2`.

  It stores:

  - revision identity and ordinal/key at `:6076-6079`;
  - seed and repeat index at `:6080-6081`;
  - schema-versioned parameters and required-result contract JSON at `:6082-6085`;
  - immutable cell hash at `:6086`;
  - timestamp at `:6087`.

- `prisma/schema.prisma:6089` — restrictive revision relation.

- `prisma/schema.prisma:6091-6093` — revision ordinal, key, and hash uniqueness.

#### Admission authority

- `prisma/schema.prisma:6096` — `PaperImplementationExperimentWorkOrderAdmissionV2`.

  It stores:

  - admission/branch/revision identity at `:6097-6099`;
  - exact approved-plan hash at `:6100`;
  - business idempotency key at `:6101`;
  - admitting actor and timestamp at `:6102-6104`.

- `prisma/schema.prisma:6106-6107` — restrictive branch and exact revision/approved-plan relations.

- `prisma/schema.prisma:6109-6111` — exact revision/plan and business-key uniqueness.

#### PI integration inbox

- `prisma/schema.prisma:6114` — `PaperImplementationExperimentIntegrationInboxV2`.

  It stores:

  - inbox/consumer/event identity and schema metadata at `:6115-6124`;
  - exact PI project/Cycle/branch/revision scope at `:6125-6133`;
  - Run and manifest identity at `:6134-6135`;
  - event payload JSON, payload hash, and envelope hash at `:6136-6138`;
  - status, outcome, reason, and processing timestamps at `:6139-6143`.

- `prisma/schema.prisma:6145-6148` — consumer/event and consumer/business uniqueness plus type/sequence indexes.

#### PI integration outbox

- `prisma/schema.prisma:6151` — `PaperImplementationExperimentIntegrationOutboxV2`.

  It stores:

  - outbox/event/aggregate/transition identity at `:6152-6157`;
  - event schema/producer/timing/correlation metadata at `:6158-6163`;
  - exact PI project/Cycle/branch/revision scope at `:6164-6172`;
  - optional Run/manifest identity at `:6173-6174`;
  - payload JSON, payload hash, and envelope hash at `:6175-6177`;
  - relay status, attempts, lease, backoff, delivery, and error metadata at `:6178-6187`.

- `prisma/schema.prisma:6189-6192` — aggregate-transition uniqueness and relay/correlation indexes.

### Migrations

- `prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql:9` — creates `PaperImplementationExperimentWorkOrderBranchV2`.

- Same migration `:33` — creates `PaperImplementationExperimentWorkOrderRevisionV2`.

- Same migration `:51` — creates `PaperImplementationExperimentWorkOrderRevisionCellV2`.

- Same migration `:69` — creates `PaperImplementationExperimentWorkOrderAdmissionV2`.

- Same migration `:83` — creates `PaperImplementationExperimentIntegrationInboxV2`.

- Same migration `:116` — creates `PaperImplementationExperimentIntegrationOutboxV2`.

- `prisma/migrations/20260714210000_normalize_experiment_v2_event_payloads/migration.sql` — later event payload/envelope normalization and hardening for PI/EF inbox/outbox storage.

### Shared PI v2 contracts

- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts:95` — `EXPERIMENT_V2_EVENT_TYPES`: `WorkOrderRevisionAdmitted`, `RunManifestFrozen`, and `BranchHeadAdvanced` at `:95-100`.

- Same file `:102` — fixed event schema version `v1`.

- Same file `:103` — producer domains `PaperImplementation` and `ExperimentFoundation` at `:103-107`.

- Same file `:115` — `PaperImplementationExperimentV2ParameterValue`.

- Same file `:120` — `PaperImplementationExperimentV2RequiredMetricResult`.

- Same file `:127` — `PaperImplementationExperimentV2RequiredArtifactResult`.

- Same file `:132` — `PaperImplementationExperimentV2RequiredResultContract`.

- Same file `:137` — `PaperImplementationExperimentV2ExactCellInput`.

- Same file `:145` — `PaperImplementationExperimentV2BranchFrame`.

- Same file `:153` — `PaperImplementationExperimentV2RunPolicy`.

- Same file `:158` — `PaperImplementationExperimentV2WorkOrderRevisionSnapshot`.

- Same file `:168` — `PaperImplementationExperimentV2AdmissionRequest`. Caller supplies semantic branch/revision/cell content plus a business key, not server authority ids or hashes.

- Same file `:176` — `PaperImplementationExperimentWorkOrderBranchV2`, including current admitted revision and head projection at `:176-191`.

- Same file `:193` — `PaperImplementationExperimentWorkOrderRevisionV2`.

- Same file `:204` — `PaperImplementationExperimentWorkOrderRevisionCellV2`.

- Same file `:212` — `PaperImplementationExperimentWorkOrderAdmissionV2`.

- Same file `:221` — `PaperImplementationExperimentV2AdmissionResponse`.

- Same file `:229` — `ExperimentV2EventScope`.

- Same file `:302` — `RunManifestFrozenEventV1`.

- Same file `:308` — `BranchHeadAdvancedPayloadV1`.

- Same file `:316` — `BranchHeadAdvancedEventV1`.

- Same file `:322` — `ExperimentV2IntegrationEvent` union at `:322-325`.

- Same file `:327` — `PaperImplementationExperimentIntegrationInboxV2`.

- Same file `:340` — `PaperImplementationExperimentIntegrationOutboxV2`.

### Shared schemas

- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts:552` — `paperImplementationExperimentV2AdmissionRequestSchema`.

- Same file `:575` — `paperImplementationExperimentWorkOrderBranchV2Schema`.

- Same file `:612` — `paperImplementationExperimentWorkOrderRevisionV2Schema`.

- Same file `:637` — `paperImplementationExperimentWorkOrderRevisionCellV2Schema`.

- Same file `:667` — `paperImplementationExperimentWorkOrderAdmissionV2Schema`.

- Same file `:688` — `paperImplementationExperimentV2AdmissionResponseSchema`.

- Same file `:705` — shared integration-event scope schema properties.

- Same file `:788` — `runManifestFrozenTaskSpecBindingV1Schema`.

- Same file `:809` — `runManifestFrozenPayloadV1Schema`.

- Same file `:838` — `branchHeadAdvancedPayloadV1Schema`.

- Same file `:857` — strict `integrationEventSchema` builder.

- Same file `:894` — `workOrderRevisionAdmittedEventV1Schema`.

- Same file `:900` — `runManifestFrozenEventV1Schema`.

- Same file `:906` — `branchHeadAdvancedEventV1Schema`.

- Same file `:912` — `experimentV2IntegrationEventSchema` union at `:912-918`.

### Canonical hash pattern

- `packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts:170` — `PaperImplementationExperimentV2ApprovedPlanHashInput`.

- `apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts:5-9` — imports server canonical hash functions for approved plan, branch frame, cells, cell plan, and WorkOrder revision.

- `apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts:191` — server-derived branch frame hash.

- Same service `:194` — server-derived revision content hash.

- Same service `:218` — server-derived cell hash.

- Same service `:227` — server-derived cell-plan hash.

- Same service `:228` — server-derived approved-plan hash.

### Route and caller-authority pattern

- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts:89` — `registerPaperImplementationExperimentV2Routes`.

- Same file `:93-100` — dedicated typed v2 admission POST.

- Same file `:100` — route `/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-work-orders/v2/admissions`.

- Same file `:102-108` — explicit parameter, body, response, and error schemas.

- Same file `:110-125` — prevalidation rejects caller-authored authority fields before reaching the use case.

### Admission service/repository transaction pattern

- `apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts:119` — `PaperImplementationExperimentV2AdmissionService`.

- `apps/backend/src/repositories/experiment-spine-v2.repository.ts:87` — `PaperImplementationExperimentV2AdmissionBundle`. Branch, revision, cells, admission, and outbox travel as one commit bundle at `:87-93`.

- Same file `:95` — `PaperImplementationExperimentV2CommitAdmissionInput`, adding the expected branch state version at `:95-98`.

- Same file `:100` — `PaperImplementationExperimentV2CommitHeadInput`, containing expected state version, branch, inbox, and outbox at `:100-105`.

- Same file `:107` — `PaperImplementationExperimentSpineV2Repository`.

- Same file `:108` — exact branch lookup.

- Same file `:114` — business-key replay lookup.

- Same file `:119` — exact revision bundle lookup.

- Same file `:124` — atomic `commitAdmission` contract at `:124-126`.

- Same file `:128` — inbox-by-event lookup.

- Same file `:133` — inbox-by-business-key lookup.

- Same file `:141` — processed-head replay verification.

- Same file `:146` — rejected/processed inbox outcome recording.

- Same file `:151` — atomic `commitHeadAdvance` contract at `:151-154`.

- Same file `:156-159` — relay claim/deliver/terminal/release contract.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts:75` — `PrismaPaperImplementationExperimentSpineV2Repository`.

- Same file `:79` — `findBranch`.

- Same file `:94` — `findAdmissionByBusinessKey`.

- Same file `:105` — `findRevisionBundle`.

- Same file `:112` — `commitAdmission`; Prisma transaction and replay checks begin at `:112-125`.

### Embedded head CAS pattern

- `apps/backend/src/services/paper-implementation-experiment-v2-head-service.ts:177` — `PaperImplementationExperimentV2HeadService`.

- Same file `:188` — `consume`, accepting only `RunManifestFrozenEventV1` and mapping repository constraints at `:188-197`.

- Same file `:200` — `consumeValidated`; inbox replay checking starts at `:203`.

- Same file `:370` — increments the PI branch state version with an int32 fence at `:370-374`.

- Same file `:375` — constructs the next server-derived branch head at `:375-382`.

- Same file `:383` — creates the PI inbox.

- Same file `:384` — creates `BranchHeadAdvancedPayloadV1` at `:384-390`.

- Same file `:391` — creates the typed `BranchHeadAdvancedEventV1` at `:391-403`.

- Same file `:404` — calls `repository.commitHeadAdvance`, supplying expected branch state version, next branch, inbox, and outbox at `:404-414`.

- `apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts:382` — `commitHeadAdvance`.

  It:

  - runs in one Prisma transaction at `:387`;
  - validates exact inbox replay and stored head authority at `:388-418`;
  - reloads and validates exact branch/admission authority at `:421-428`;
  - performs branch `stateVersion` and head-version CAS at `:430-448`;
  - fails if the CAS did not update exactly one row at `:449-453`;
  - creates the inbox and outbox in the same transaction at `:456-460`;
  - maps write constraints at `:464-466`.

### Pattern Phase 4 additions should follow

Phase 4 PI additions should follow this landed Pack A pattern:

- additive, named v2 models and contracts;
- caller supplies identity-only or semantic proposal inputs, never final authority fields;
- server derives canonical hashes, selected scope, disposition, and exit;
- exact scope is relational and typed rather than buried only in unvalidated JSON;
- restrictive FKs and unique constraints own same-domain invariants;
- state changes use explicit version CAS;
- closure snapshot, Cycle update, REU/trace/outbox writes are atomic;
- typed inbox/outbox envelopes support replay and recovery;
- no dual writes to generic legacy records;
- no fallback from v2 closure authority to legacy Sidecar, packet, or project-scan state.

## 7. CycleReadyForInterpretation and cycle-readiness evaluation

There is no existing production implementation.

An exhaustive case-insensitive search across `apps/`, `packages/`, and `prisma/` found no production symbol, field, event, model, route, or service named or equivalent to:

- `CycleReadyForInterpretation`;
- `ready_for_interpretation`;
- `cycle_readiness`;
- “cycle readiness”;
- “interpretation readiness”.

### Nearest but insufficient code

- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts:173` — packet creation resolves only whether the Cycle exists at `:178-184`. It never checks Cycle lifecycle status or a D-18 readiness watermark.

- Same file `:580` — `resolveRunEvidenceRefs` checks trusted, same-Cycle, and optionally same-plan REUs at `:580-627`.

- Same file `:629` — `assertResultInterpretationGate` checks packet content and mixed REU accounting at `:629-690`, not exact branch/current-revision/head/Attempt readiness.

- `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts:1088` — `assertRequest` checks that caller-supplied structural refs are sufficient to assemble a packet request at `:1093-1105`. This is request-shape completeness, not server-evaluated Cycle readiness.

- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts:235` — current completion checks only Cycle lifecycle status at `:241-244`. It does not evaluate:

  - all admitted branches;
  - each current admitted revision;
  - non-null matching effective head;
  - exact head Run and RunCells;
  - all Attempts;
  - active real Attempt blockers;
  - non-head history exclusion;
  - explicit comparison refs;
  - eligible REU refs;
  - proposal hash/current-effective watermark drift.

- `prisma/schema.prisma:6545` — `ExperimentFoundationReadinessAttestationV2`. This is Pack A asset readiness and exact dependency admission, not PI Cycle interpretation readiness.

- `prisma/schema.prisma:5948` — generic `ExperimentFoundationReadinessReport`. This is also unrelated and must not become PI scientific closure authority.

### Required Phase 4 addition

Phase 4 needs a PI-owned deterministic evaluator/read model for the D-18 current-effective watermark.

It should:

- read exact PI branch/current-revision/head state;
- resolve exact EF Run, cell, and Attempt facts;
- block missing heads and Cycle-wide active real Attempts;
- classify eligible REUs only through the Evidence Trust Gateway;
- bind the admitted Result Analysis proposal hash;
- return a server-derived readiness decision and exact candidate snapshot/hash;
- be consumed by Result Analysis admission and the existing Cycle completion action;
- remain an evaluator or rebuildable read model, not a caller-writable generic readiness record;
- introduce no additional human closure action.

## Atomic cutover checklist

- Close caller `decision_exit` at draft and admission.

- Close caller `cycle_assessment`, arbitrary output patches, and caller-selected closure statuses at completion.

- Replace the current ValidationCycle update with server-derived scientific disposition and selected exit plus an immutable embedded current-effective execution-accounting snapshot/hash under CAS.

- Replace Result Analysis four-scenario/full packet-command output with one hash-bound proposal admitted only against Cycle readiness.

- Remove direct, open, and pre-closure `ResultInterpretationPacket` materialization.

- Retain only post-closure packet projection/read behavior bound to the closed snapshot and proposal hash.

- Introduce one PI Evidence Trust Gateway.

- Route direct monitor, live collect/cancel, recovery/sync finalization, and standalone attachment through identity-only server resolution.

- Make failed, cancelled, and incomplete execution create zero REUs.

- Separate complete validated negative/inconclusive scientific disposition from execution status.

- Remove project-wide failed-like REU dossier reconciliation.

- Remove inferred REU exclusion/supersession heuristics.

- Make dossiers consume explicit immutable closed-Cycle snapshot refs/hashes.

- Disable generic `paper_experiment_sidecar` create/upsert authority.

- Rebuild Sidecar strictly from closure authority.

- Preserve Pack A’s typed v2, server-hash, restrictive-relational, version-CAS, atomic inbox/outbox, and replay patterns.

- Replace all T-124 tests that lock trusted failed/cancelled REUs, open packet materialization, and project scans in the same migration slice.

- Do not leave dual-read, compatibility aliases, historical-scan fallback, `FailureEvidenceUnit`, a second evidence gateway, a standalone Sidecar ledger, a second conclusion object, or an additional human action.

SURVEY COMPLETE
