# 09 Current State Map

## Purpose
Map D-25 `generate-need-candidate` implementation slices to current repository files before coding starts.

This document is a planning artifact. It does not introduce a new runtime contract, authority object, route, or persistence path.

## 2026-05-20 Status Update
- This map began as a pre-implementation snapshot. Some early "Gap" bullets are now closed by the T-088/T-089 implementation notes and verification records.
- Current runtime anchors now include `TopicSelectionAgentOrchestratorService`, `TopicSelectionWorkflowHarnessService`, the v1a need-discovery debate loop, and the scenario runner `.ai/scripts/topic-selection-workflow-scenario-runner.mjs`.
- The old standalone `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` path is retired. Its assertions are preserved by `topic-selection.real-e2e.scale-quality.v1` in the scenario runner.
- This document remains useful for historical mapping, but the current source of truth for executable scenario status is `08-scenarios.md` plus the latest implementation/verification notes.

## Scope Answer
- The deep decisions D-17 through D-25 are focused on `topic-selection.v1a.generate-need-candidate.v1`.
- T-089 is not limited to v1a overall: `06-workflow-matrix.md` already covers resource sampling, v1a, v1b, v1c, and downstream nodes.
- Current node-policy depth is uneven:
  - `topic-selection.resource-sampling.create-sample-set.v1` has a draft policy.
  - `topic-selection.v1a.generate-need-candidate.v1` has the deepest policy and implementation-slice design.
  - v1b/v1c/downstream nodes are mostly matrix rows and stub policies, except for debate scenario placeholders.

## Current Implementation Anchors

### Shared Contracts
- Existing:
  - `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`
    - Defines `TopicSelectionNeedCandidateRecord`, readiness/support/adjudication/validated-need/v1b-bundle records, v1a generate-need-candidate node contracts, v1a need-discovery artifact snapshot/ref-bundle contracts, and JSON schemas.
  - `packages/shared/src/research-lifecycle/topic-selection-control-plane-contracts.ts`
    - Defines `TopicSelectionFunctionalRef`, artifact refs, workflow runs, gates, transitions, lineage, and trace contracts.
  - `packages/shared/src/research-lifecycle/topic-selection-resource-sampling-contracts.ts`
    - Existing structured-output schema pattern for LLM classification.
- Missing for D-25:
  - Backend validators for `GenerateNeedCandidateNodeInput`
  - Backend validators for `GenerateNeedCandidateNodeResult`
  - Backend validators for `RankedCandidateDraftBatch`
  - Backend validators for `CandidateDraftAdmissionReport`
  - Backend validators for `SupplementalRoundRoutingDecision`
  - Backend validators for `PersistNeedCandidateBatchCommand`
- Recommended target:
  - Shared contracts now live in `topic-selection-need-validation-contracts.ts`; subsequent slices should import these schemas rather than redefining node payload shapes.

### Current NeedCandidate Creation Path
- Existing:
  - `apps/backend/src/services/topic-selection-need-validation-service.ts`
    - `createNeedCandidateFromEvidenceMap` creates one `NeedCandidate` from an evidence map.
    - It already compiles an input snapshot, records a workflow run, runs a deterministic gate, attempts a transition, links lineage, builds a trace snapshot, then persists the candidate.
  - `apps/backend/src/repositories/topic-selection-need-validation.repository.ts`
    - Defines `createNeedCandidate`, read/list/update, readiness, support packet, adjudication, validated need, v1b bundle, and memory APIs.
  - `apps/backend/src/repositories/prisma/prisma-topic-selection-need-validation-repository.ts`
    - Persists `TopicSelectionNeedCandidate`.
  - `apps/backend/src/repositories/in-memory-topic-selection-need-validation-repository.ts`
    - In-memory test repository.
  - `prisma/schema.prisma`
    - `TopicSelectionNeedCandidate` already exists with evidence refs, status fields, control-plane refs, `artifactRefs`, merge refs, and timestamps.
- Gap:
  - Current creation is single-candidate and direct-request driven.
  - No admitted-only batch command.
  - No `idempotency_key`.
  - No all-or-none multi-candidate transaction wrapper.
  - No candidate-pool projection hash contract.

### Routes And API
- Existing:
  - `apps/backend/src/routes/topic-selection-v1a-routes.ts`
    - `POST /topic-selection/v1a/need-candidates`
    - list-by-title-card v1a projections.
  - `apps/backend/src/controllers/topic-selection-v1a-controller.ts`
    - Routes direct `NeedCandidateBody` to `createNeedCandidateFromEvidenceMap`.
  - `apps/backend/src/routes/topic-selection-v1a-routes.integration.test.ts`
    - Exercises a broad v1a HTTP flow through evidence map, need candidate, readiness, support packet, adjudication, and v1b bundle.
  - `apps/desktop/src/renderer/modules/topic-workbench/api/v1a.ts`
    - Desktop read/adjudication/v1b handoff client APIs.
- Gap:
  - No route/controller for `GenerateNeedCandidateNodeInput` / `GenerateNeedCandidateNodeResult`.
  - No WorkflowHarness entrypoint for the node.
  - No public API contract for generated candidate batch execution.

### Control Plane And Artifacts
- Existing:
  - `apps/backend/src/services/topic-selection-control-plane-service.ts`
    - `compileInputSnapshot`, `recordArtifactRef`, `recordWorkflowRun`, `runDeterministicGate`, `attemptTransition`, lineage, trace.
  - `apps/backend/src/repositories/topic-selection-control-plane.repository.ts`
  - `apps/backend/src/repositories/prisma/prisma-topic-selection-control-plane-repository.ts`
  - `apps/backend/src/repositories/in-memory-topic-selection-control-plane-repository.ts`
  - `packages/shared/src/research-lifecycle/topic-selection-control-plane-contracts.ts`
- Reusable:
  - Input snapshots and artifact refs can support D-25 artifact/ref boundary.
  - `recordWorkflowRun` already creates workflow runs with artifact refs.
- Gap:
  - Dedicated v1a need-discovery artifact boundary helper now exists, but the real node executor does not consume it yet.
  - Context packet artifacts and replay refs are not implemented yet.
  - No explicit FunctionalRef resolver for non-artifact D-25 authority refs.

### Context Compiler
- Existing:
  - `TopicSelectionControlPlaneService.compileInputSnapshot` can hash source refs and payloads.
  - D-18 context semantics exist in docs.
- Gap:
  - No implementation module for `exploration_context` and `arbiter_context`.
  - No context-family-specific cache or validation.
  - No current context packet DTO/schema.
- Recommended target:
  - New backend service near topic-selection workflow runtime, or a reusable runtime package if T-088 introduces one first.

### LLM / Orchestration
- Existing:
  - `apps/backend/src/services/llm-gateway.ts`
    - `BackendLlmGateway.createStructuredOutput` and telemetry.
  - Topic-selection single-agent services already inject `llmGateway`:
    - resource sampling
    - v1b research slice
    - v1b topic question
    - v1b value assessment
    - v1c promotion support
  - Unit tests use stub `createStructuredOutput` gateways.
- Gap:
  - No `AgentOrchestrator` implementation.
  - No unified `mocked_llm` / `codex_assisted` / `provider_llm` execution-mode adapter.
  - No debate role orchestration.
  - No Codex-assisted execution adapter.
- Recommended target:
  - T-088 runtime service first, then D-25 node-specific adapter.

## D-25 Slice Map

| Slice | Current Status | Existing Anchors | Main Gap | Suggested First Files |
|---|---|---|---|---|
| `contracts_schema` | Implemented in shared contracts | Shared need-validation contracts and schema tests | Backend services do not yet consume these validators | `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`; `packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts` |
| `artifact_ref_boundary` | Implemented as focused helper | Control-plane artifact refs/workflow runs; v1a need-discovery artifact snapshot/ref-bundle contracts | Runtime node executor does not consume helper yet; replay artifact refs remain later work | `apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts`; `apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts` |
| `context_compiler_integration` | Implemented as compile/validate helper | Input snapshots; D-18 docs; artifact-ref boundary | Runtime node executor/cache store does not consume helper yet | `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts`; `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts` |
| `orchestrator_adapter` | Implemented as runtime + node adapter | `BackendLlmGateway`; `TopicSelectionAgentOrchestratorService`; `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`; stub LLM tests; WorkflowHarness scenarios | No route-level node execution yet | Connected to WorkflowHarness |
| `draft_schema_validation` | Implemented as deterministic validator | `TopicSelectionRankedCandidateDraftBatchMinimumValidationReport`; `TopicSelectionRankedCandidateDraftBatchValidatorService`; adapter artifact-boundary tests; WorkflowHarness scenarios | No route-level node execution yet | Connected to admission gates and WorkflowHarness |
| `admission_gates` | Implemented as deterministic admission report service | `TopicSelectionCandidateDraftAdmissionService`; D-21 `CandidateDraftAdmissionReport` fields; adapter artifact-boundary tests; WorkflowHarness scenarios | No route-level node execution yet | Connected to supplemental routing, persistence, and WorkflowHarness |
| `supplemental_routing` | Implemented as deterministic routing report service | `TopicSelectionSupplementalRoundRoutingService`; D-22 `SupplementalRoundRoutingDecision` fields; adapter artifact-boundary tests; WorkflowHarness scenarios | Does not execute supplemental worker rounds yet | Connected to optional persistence and WorkflowHarness |
| `persistence_batch` | Implemented as service-layer batch path over existing NeedCandidate model | `TopicSelectionPersistNeedCandidateBatchService`; `TopicSelectionNeedValidationRepository.createNeedCandidatesBatch`; adapter optional persistence tests; WorkflowHarness finalize scenario | No new Prisma hash/idempotency columns; idempotency enforced by deterministic ids and transaction/replay checks | Future DB hardening optional |
| `workflow_harness_scenarios` | Implemented for generate-need-candidate scenario plumbing and initial debate loop | `TopicSelectionWorkflowHarnessService`; `TopicSelectionNeedDiscoveryDebateLoopService`; finalize-persist, supplemental-routing, admission-blocked, duplicate merge-hint, malformed blocked output, execution-mode shape, persistence-conflict, provider-mode debate, mixed Codex/provider slot, final-synthesis Codex-forbidden tests, and real E2E canary v1a generate-node migration | Full route/API runner not yet added; remaining real-flow nodes still use script orchestration; automated supplemental repair rounds pending | Next: complete scenario-wrapper migration or supplemental repair automation |

## v1a Spine Split Status
- `validate-need-adjudication`, `human-confirm-need`, and `publish-v1b-input-bundle` are now split at the backend route/service boundary.
- `POST /topic-selection/v1a/need-candidates/:needCandidateId/adjudications` writes only adjudication authority plus typed side-effect refs.
- `POST /topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations` owns `HumanConfirmedDecision` and `ValidatedNeed`.
- `runPublishV1bInputBundleScenario` owns the normalized automated v1b handoff; `POST /topic-selection/v1a/v1b-input-bundles` remains the compatibility service boundary and is idempotent for existing bundles.
- The real E2E canary now uses the generate-need-candidate WorkflowHarness entrypoint for v1a candidate creation.
- The remaining route-level wrapper gap in the D-25 table refers to a product/API node runner and full scenario-wrapper migration, not to the adjudication/human-confirm/v1b handoff split.

## Recommended Implementation Order
1. Apply D-26 cross-version boundary before changing contracts; this keeps v1a node I/O from absorbing unfinished v1b/v1c semantics.
2. Start with `contracts_schema`; it is the lowest-risk change and unlocks all downstream tests.
3. Add deterministic validators and unit fixtures before any LLM execution.
4. Reuse control-plane artifact/workflow primitives, but add node-specific redacted artifact helpers only where needed.
5. Implement context compiler and orchestrator adapter before provider/codex tests.
6. Implement batch persistence last among service slices, because it depends on contracts, refs, admission reports, and candidate hashing.
7. WorkflowHarness scenarios now cover the mocked deterministic generate-need-candidate paths.

## Scope Boundaries
- Do not implement v1b/v1c debate details as part of this D-25 slice.
- Do not embed v1b/v1c authority fields in v1a `generate-need-candidate` node contracts.
- Do not add `NeedCandidateSet`.
- Do not create a second candidate write path outside the existing need-validation service/repository boundary.
- Do not let raw LLM/debate output skip D-20 schema validation, D-21 admission gates, or D-23 persistence.
- Do not treat existing v1a HTTP route tests as a replacement for WorkflowHarness scenarios.
