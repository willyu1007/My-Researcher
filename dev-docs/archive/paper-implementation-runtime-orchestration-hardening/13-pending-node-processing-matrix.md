# 13 Pending Node Processing Matrix

## Purpose
This matrix is the source of truth for PaperImplementation agent workflow node promotion boundaries and the remaining deterministic/operational lanes.

It separates:
- already promoted runtime slots, which are not listed here except for cross-cutting cleanup;
- promoted agent workflow nodes, retained here as their boundary and evidence record;
- deterministic and operational lanes, which should not become LLM runtime slots but still need stronger stress evidence.

## Current Promotion Baseline
The following slots are promoted and are not pending node work:
- `trace_integrity_review.boundary_debate`
- `claim_boundary_review.boundary_debate`
- `dossier_readiness_prep.readiness_audit`
- `result_analysis.interpretation_scenarios`
- `experiment_design.work_order_draft`
- `experiment_critique.plan_critique`
- `route_architecture.route_candidates`
- `route_skeptic_review.route_risk_critique`
- `validation_cycle_planning.cycle_candidates`
- `feasibility_planning.probe_plan_candidates`
- `cross_board_synthesis.merge_split_reuse_scenarios`
- `evidence_board_curation.binding_gap_candidates`
- `motive_decomposition.draft_assertion_candidates`
- `motive_evolution.evolution_decision_support`

Promoted slots already have controlled runtime services/routes, shared runtime/admission envelopes, provider canary hooks, L5 stress coverage, L6 near-prod evidence hooks, and either Domain Gate materialization or an explicit no-authority boundary.

## Closed Cross-Cutting Cleanup
| Item | Closure |
|---|---|
| PaperImplementation model-profile product eligibility | Closed 2026-06-04. Promoted PaperImplementation runtime profiles now bind explicit PaperImplementation run-mode eligibility in the unified backend model-profile registry: `provider_llm` may run in `acceptance` / `product`, while `mocked_llm` and `codex_assisted` are limited to `test` / `acceptance`. |

## Cross-Cutting Decisions For Future Nodes
Every future agent workflow node or major re-promotion MUST inherit the harness/runtime boundary from `10-harness-runtime-boundary.md`.

Operational interpretation:
- Harness verifies, stresses, and replays; it does not execute production semantics.
- Runtime executes production-capable LLM/Codex/mock slot logic; it does not write domain authority.
- Admission verifies runtime evidence; it does not repair, rerun, or materialize state.
- Domain Gate and deterministic services own queue/domain/live-experiment state transitions.
- Promotion evidence is machine-verifiable. Human-readable summaries or audit narratives are not required promotion artifacts and must not become acceptance criteria.

## Cross-Cutting Route-Slice Decisions
| Item | Decision | Required enforcement | Revisit point |
|---|---|---|---|
| Shared debate helper extraction | Do not extract a full shared debate execution helper before the route slice. The next slice should use a slot-local runtime facade, following the same bounded checklist used by promoted slots. | Each promoted route slot MUST carry explicit slot/profile/prompt identity, same-profile retry, no product fallback, admission replay/drift checks, no authority write assertions, and no-dual-track scans. Shared code MAY be limited to small pure helpers that do not own execution semantics. | Re-evaluate after `route_architecture.route_candidates` and `route_skeptic_review.route_risk_critique` are both promoted and L5/L6 evidence shows whether duplicated control flow is actually creating drift. |
| Model option parameter visibility | Every new promoted slot MUST include a profile resolution block before implementation is accepted. The registry YAML candidate list is not sufficient by itself because backend profile options own normalized params, timeout, eligibility, and retry/fallback policy. | Use the template below in the slot note or implementation notes before adding service/routes. Schema/service tests MUST assert route-owned profile id, explicit model option membership when supplied, resolved provider option lineage, and `product -> provider_llm`. Registry tests MUST cover PaperImplementation product eligibility for the new profile. | Revisit only if model-profile registry emits a machine-readable profile-resolution artifact that can be cited directly by slot docs/tests. |

### Profile Resolution Block Template
Each new promoted slot note MUST include this block before code promotion:

```yaml
slot_id: <workflow_type.slot_name>
workflow_type: <PaperImplementationAgentWorkflowType>
role_slot_ids:
  - <role_slot_id>
profile_id: paper-implementation.<domain>.<slot>.v1
prompt_template_id: paper-implementation-<domain>-<slot>
prompt_template_version: v1
output_contract_id: <RoleArtifactContract@v1>
final_output_contract_id: <FinalArtifactContract@v1>
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - <profile_id>.openai-balanced
    - <profile_id>.dashscope-balanced
  manual_quality_options:
    - <profile_id>.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: medium | large
  timeout_policy: <backend profile option timeout or inherited gateway timeout>
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
verification:
  schema_negative: product_non_provider_rejected
  service_negative: product_fixture_mode_rejected_before_orchestrator
  route_negative: profile_or_model_option_drift_rejected_before_gateway
  registry_test: paper_implementation_product_provider_only
```

The block is a promotion artifact, not a human-readable summary. Acceptance depends on tests and machine-verifiable runtime/admission/domain fields matching the block.

## Route Architecture Node Alignment
`route_architecture.route_candidates` is the first promoted route-slice node.

### Runtime Role
This node is a production-capable runtime proposal slot. It MUST produce admitted route candidate proposal artifacts only. It MUST NOT create `TechnicalRouteCandidate`, mutate `ValidationCycle`, create queue items, or emit Domain Gate payloads in the first slice.

Harness may construct route-planning scenarios and call the real runtime route/service path, but harness MUST NOT compile prompts, select models, compute cache/compression identity, repair route proposals, or emit production runtime artifacts.

### Slot Profile Resolution
```yaml
slot_id: route_architecture.route_candidates
workflow_type: route_architecture
role_slot_ids:
  - route_architecture.route_candidate_designer
profile_id: paper-implementation.route-architecture.route-candidates.v1
prompt_template_id: paper-implementation-route-architecture-route-candidates
prompt_template_version: v1
output_contract_id: PaperImplementationRoutePlanningRoleArtifact@v1
final_output_contract_id: PaperImplementationRoutePlanningArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.route-architecture.route-candidates.v1.openai-balanced
    - paper-implementation.route-architecture.route-candidates.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.route-architecture.route-candidates.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: large
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_route_candidate_proposal
  forbidden_writes:
    - technical_route_candidate
    - validation_cycle
    - feasibility_probe
    - decision_work_queue_item
verification:
  schema_negative: product_non_provider_rejected
  service_negative: product_fixture_mode_rejected_before_orchestrator
  route_negative: profile_or_model_option_drift_rejected_before_gateway
  registry_test: paper_implementation_product_provider_only
```

### Output Contract Minimum
Route architecture and route skeptic use the shared `PaperImplementationRoutePlanningRoleArtifact@v1` and `PaperImplementationRoutePlanningArtifact@v1` contract family. Slot-specific schema branches still bind `workflow_type`, role slot id, profile id, prompt id, and required payload fields; this is shared contract structure, not a shared execution helper.

The role output MUST include at least two candidate proposals when `role_status=passed`. Candidate keys are runtime-local identifiers and MUST NOT be treated as persisted `route_candidate_id` values.

Each candidate proposal MUST include:
- `candidate_key`;
- `route_summary`;
- `expected_information_gain`;
- `baseline_gap_status`;
- `primary_metric_refs`;
- `dataset_version_refs`;
- `baseline_version_refs`;
- `code_version_refs`;
- `config_refs`;
- `scope_boundary_ref` or an explicit `scope_boundary_status=no_expansion`;
- `confirmatory_marker`;
- `trace_manifest_ref` or `trace_manifest_id`;
- `blocker_codes`;
- `warning_codes`.

The role and final artifacts MUST reject or omit authority-looking fields:
- `route_candidate_id` as a persisted domain id;
- `validation_cycle_patch`;
- `technical_route_candidate_create_request`;
- `domain_gate_request`;
- `queue_action`;
- `work_order_request`;
- `live_experiment_request`.

### Admission And Evidence
Admission MUST verify target refs, motive/board/cycle refs, source hashes, prompt/profile/model-option identity, output hash, candidate count, route-proposal forbidden fields, replay/idempotency, and source/cycle drift. Admission MUST NOT repair missing route refs, synthesize route blockers, create queue items, or materialize route authority.

Minimum L5 cases for this node:
- product non-provider mode rejected before orchestrator;
- provider-mode fixture payload rejected before orchestrator;
- model-option drift rejected before gateway;
- over-budget context blocks with zero provider calls;
- provider failure retries at most once and ends with no final artifact;
- schema-invalid output retries at most once and ends with no final artifact;
- route/cycle mutation fields are rejected;
- stale validation-cycle or source-hash drift blocks admission;
- harness proposal artifacts cannot masquerade as runtime final artifacts.

## Route Skeptic Review Node Alignment
`route_skeptic_review.route_risk_critique` is the second route-slice node. It consumes the admitted route proposal artifact produced by `route_architecture.route_candidates` and produces critique-only runtime evidence.

### Runtime Role
This node is an independent critic runtime slot. It MUST require an admitted `route_architecture.route_candidates` final artifact as its primary input. Deterministic `TechnicalRouteCandidate` refs MAY appear only as secondary context for duplicate detection, drift comparison, or background route history; they MUST NOT start this slot by themselves.

The first slice MUST NOT add a second route entrypoint through deterministic route authority. It also MUST NOT create queue items, mutate route/cycle authority, or emit Domain Gate payloads.

### Slot Profile Resolution
```yaml
slot_id: route_skeptic_review.route_risk_critique
workflow_type: route_skeptic_review
role_slot_ids:
  - route_skeptic_review.independent_route_critic
profile_id: paper-implementation.route-skeptic-review.route-risk-critique.v1
prompt_template_id: paper-implementation-route-skeptic-review-route-risk-critique
prompt_template_version: v1
output_contract_id: PaperImplementationRoutePlanningRoleArtifact@v1
final_output_contract_id: PaperImplementationRoutePlanningArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.route-skeptic-review.route-risk-critique.v1.openai-balanced
    - paper-implementation.route-skeptic-review.route-risk-critique.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.route-skeptic-review.route-risk-critique.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: medium
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  primary_admitted_route_proposal_final_artifact: required
  technical_route_candidate_refs_as_primary_input: forbidden
  technical_route_candidate_refs_as_secondary_context: optional
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_route_risk_critique
  forbidden_writes:
    - technical_route_candidate
    - validation_cycle
    - feasibility_probe
    - decision_work_queue_item
verification:
  schema_negative: product_non_provider_rejected
  service_negative: missing_admitted_route_proposal_rejected_before_orchestrator
  route_negative: technical_route_candidate_primary_input_rejected
  registry_test: paper_implementation_product_provider_only
```

### Input Contract Minimum
Primary input MUST be one admitted final runtime artifact from `route_architecture.route_candidates`. The skeptic slot MUST verify the candidate key under review exists inside that admitted proposal artifact.

Allowed secondary context:
- deterministic `TechnicalRouteCandidate` refs;
- validation-cycle refs;
- feasibility-probe refs;
- budget and compute refs;
- failed-run or failed-probe evidence refs;
- source context packets and source hashes.

Forbidden primary inputs:
- `technical_route_candidate`;
- `paper_implementation_proposal_artifact`;
- `agent_workflow_harness_run`;
- `decision_work_queue_item`;
- unadmitted route architecture runtime artifact.

### Output Contract Minimum
The role output MUST include:
- `reviewed_candidate_key`;
- `reviewed_route_proposal_ref`;
- `reviewed_route_proposal_hash`;
- `risk_level`;
- `risk_codes`;
- `blocker_codes`;
- `warning_codes`;
- `scope_boundary_findings`;
- `budget_compute_findings`;
- `baseline_gap_findings`;
- `metric_alignment_findings`;
- `dataset_code_config_readiness_findings`;
- `confirmatory_exploratory_findings`;
- `repair_suggestions`;
- `recommended_disposition`: `proceed`, `revise`, `park`, or `abandon`;
- `no_queue_side_effect: true`.

The role and final artifacts MUST reject or omit authority-looking fields:
- `queue_action`;
- `validation_cycle_patch`;
- `technical_route_candidate_update`;
- `technical_route_candidate_create_request`;
- `domain_gate_request`;
- `work_order_request`;
- `live_experiment_request`.

### Admission And Evidence
Admission MUST verify the admitted route proposal final artifact, reviewed candidate key, source hashes, optional secondary context refs, prompt/profile/model-option identity, output hash, forbidden fields, replay/idempotency, and drift. Admission MUST NOT create or resolve queue items, mutate route/cycle authority, reinterpret provider failures as semantic blockers, or materialize Domain Gate state.

Minimum L5 cases for this node:
- missing admitted route proposal final artifact rejected before orchestrator;
- `TechnicalRouteCandidate` as primary input rejected;
- harness proposal artifact as primary input rejected;
- product non-provider mode rejected before orchestrator;
- provider-mode fixture payload rejected before orchestrator;
- model-option drift rejected before gateway;
- missing critique dimensions retries at most once and ends with no final artifact;
- provider failure retries at most once and ends with no final artifact;
- queue or route/cycle mutation fields are rejected;
- admitted proposal hash/source drift blocks admission.

## Route Planning Slice Status
The route planning slice is promoted through `PaperImplementationRoutePlanningRuntimeService` and the controlled HTTP runtime routes:
- `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/route-architecture-route-candidates/run`
- `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/route-skeptic-review-route-risk-critique/run`

Both slots use the production runtime/admission path, shared context/cache/compression plumbing, provider-only product profile resolution, and no-Domain-Gate/no-queue/no-route-write final-artifact assertions. The L5 stress runner now treats route provider failure, incomplete route candidate set, and incomplete skeptic dimension coverage as required cases.

## Validation Cycle Planning Node Alignment
`validation_cycle_planning.cycle_candidates` has now been promoted as the first validation-cycle planning runtime slice after the route planning slice.

### Implementation Sequencing Decision
Promoted `validation_cycle_planning.cycle_candidates` as a single-node runtime slice first. Do not pair it with `feasibility_planning.probe_plan_candidates` in the same implementation pass, and do not introduce a broad `ValidationPlanningRuntimeService` facade yet.

The implementation service is `PaperImplementationValidationCyclePlanningRuntimeService` and exposes only `runCycleCandidates(...)` in the first slice. `feasibility_planning.probe_plan_candidates` remains the immediate follow-up node and MAY later share small pure helpers, but it MUST NOT share execution ownership, prompt semantics, retry/fallback policy, final artifact assembly, admission, or Domain Gate decisions before its own node alignment is complete.

### Runtime Role
This node is a production-capable runtime proposal slot for route-bound validation-cycle candidates. The first slice MUST stay narrow: it consumes admitted route proposal and route skeptic artifacts, then produces admitted cycle candidate proposal evidence only.

Runtime MUST NOT produce a directly submit-ready `CreateValidationCycleDraftRequest`. The deterministic `PaperImplementationValidationCyclePlanningService` remains the only production owner for creating and admitting `ValidationCycle` objects, and also owns `TechnicalRouteCandidate`, `FeasibilityProbe`, and `ExperimentPlanLight` creation.

Harness may construct validation-cycle planning scenarios and call the real runtime route/service path, but harness MUST NOT compile prompts, select models, compute cache/compression identity, repair cycle proposals, or emit production runtime artifacts.

### Slot Profile Resolution
```yaml
slot_id: validation_cycle_planning.cycle_candidates
workflow_type: validation_cycle_planning
role_slot_ids:
  - validation_cycle_planning.cycle_candidate_designer
profile_id: paper-implementation.validation-cycle-planning.cycle-candidates.v1
prompt_template_id: paper-implementation-validation-cycle-planning-cycle-candidates
prompt_template_version: v1
output_contract_id: PaperImplementationValidationCyclePlanningRoleArtifact@v1
final_output_contract_id: PaperImplementationValidationCyclePlanningArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.validation-cycle-planning.cycle-candidates.v1.openai-balanced
    - paper-implementation.validation-cycle-planning.cycle-candidates.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.validation-cycle-planning.cycle-candidates.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: large
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  primary_admitted_route_proposal_final_artifact: required
  primary_admitted_route_skeptic_final_artifact: required
  route_proposal_hash_must_match_skeptic_review: true
  reviewed_candidate_key_must_match_skeptic_review: true
  technical_route_candidate_refs_as_primary_input: forbidden
  technical_route_candidate_refs_as_secondary_context: optional
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_validation_cycle_candidate_proposal
  forbidden_writes:
    - validation_cycle
    - technical_route_candidate
    - feasibility_probe
    - experiment_plan_light
    - decision_work_queue_item
verification:
  schema_negative: create_validation_cycle_draft_request_rejected
  service_negative: missing_admitted_route_skeptic_rejected_before_orchestrator
  route_negative: route_proposal_hash_or_candidate_key_mismatch_rejected
  registry_test: paper_implementation_product_provider_only
```

### 2026-06-07 Implementation Status
- Implemented shared contracts, schemas, role/final artifacts, and runtime request schema for `validation_cycle_planning.cycle_candidates`.
- Added `PaperImplementationValidationCyclePlanningRuntimeService` with one role invocation, max-one same-profile technical retry, product provider-only request guards, runtime artifact persistence, admission, and proposal-only final artifact assembly.
- Added runtime lineage guards so passed role output must match request-owned admitted route proposal ref/hash, admitted route skeptic ref/hash, and reviewed candidate keys before any final artifact can be admitted.
- Wired `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/validation-cycle-planning-cycle-candidates/run` through the existing controller/app route group.
- Added backend and YAML model/prompt registry entries for `paper-implementation.validation-cycle-planning.cycle-candidates.v1` / `paper-implementation-validation-cycle-planning-cycle-candidates`.
- Extended schema tests, service unit tests, route integration, model-profile registry coverage, and L5 stress required-case coverage.

### Input Contract Minimum
Primary inputs MUST include:
- one admitted final runtime artifact from `route_architecture.route_candidates`;
- one admitted final runtime artifact from `route_skeptic_review.route_risk_critique`;
- a reviewed candidate key that exists in the route architecture final artifact and is covered by the skeptic final artifact;
- matching route proposal artifact hash across the cycle-planning request and the skeptic artifact.

Allowed secondary context:
- deterministic `TechnicalRouteCandidate` refs for duplicate or drift comparison only;
- motive version refs, board version refs, assertion refs, evidence refs, trace refs, prior validation-cycle refs, feasibility-probe refs, result refs, budget refs, and source context packets.

Forbidden primary inputs:
- `technical_route_candidate`;
- `validation_cycle`;
- `agent_workflow_harness_run`;
- `decision_work_queue_item`;
- unadmitted route architecture or route skeptic runtime artifacts.

### Output Contract Minimum
The role output MUST include at least two `cycle_candidate_proposals` when `role_status=passed`. Candidate keys are runtime-local identifiers and MUST NOT be treated as persisted `validation_cycle_id` values.

Each cycle candidate proposal MUST include:
- `candidate_key`;
- `reviewed_route_candidate_key`;
- `target_ref` and target frame summary;
- `cycle_type`;
- `trigger_refs`;
- `validation_question`;
- `assumptions_under_test`;
- `assertion_refs_under_test`;
- `decision_if_pass`;
- `decision_if_fail`;
- `decision_if_inconclusive`;
- `expected_information_gain` of `low`, `medium`, or `high`;
- `criteria` with pass, fail, inconclusive, stop, and minimum-artifact requirements;
- `budget_envelope` with budget ref/id, retry budget, and runtime or compute cap;
- `included_context_refs` for motive, board, evidence, route, prior-cycle, probe, result, and trace context;
- `confirmatory_marker`;
- `blocker_codes`;
- `warning_codes`.

The role and final artifacts MUST reject or omit authority-looking fields:
- `validation_cycle_id` as a persisted domain id;
- `create_validation_cycle_draft_request`;
- `admit_validation_cycle_request`;
- `technical_route_candidate_create_request`;
- `feasibility_probe_create_request`;
- `experiment_plan_light_create_request`;
- `domain_gate_request`;
- `queue_action`;
- `work_order_request`;
- `live_experiment_request`.

### Admission And Evidence
Admission MUST verify route architecture and route skeptic final artifacts, route proposal hash, reviewed candidate key, motive/board/evidence/trace refs, budget refs, prompt/profile/model-option identity, output hash, candidate count, forbidden fields, replay/idempotency, and source drift. Admission MUST NOT repair criteria, synthesize budgets, create validation cycles, create queue items, or materialize Domain Gate state.

Minimum L5 cases for this node:
- missing admitted route architecture final artifact rejected before orchestrator;
- missing admitted route skeptic final artifact rejected before orchestrator;
- route proposal hash mismatch rejected before orchestrator;
- reviewed candidate key mismatch rejected before orchestrator;
- deterministic `TechnicalRouteCandidate` as primary input rejected;
- product non-provider mode rejected before orchestrator;
- provider-mode fixture payload rejected before orchestrator;
- model-option drift rejected before gateway;
- over-budget context blocks with zero provider calls;
- provider failure retries at most once and ends with no final artifact;
- schema-invalid criteria or budget retries at most once and ends with no final artifact;
- `expected_information_gain=none` rejected for passed candidates;
- validation-cycle/route/probe/workorder/live-adapter/queue mutation fields are rejected;
- harness proposal artifacts cannot masquerade as runtime final artifacts.

## Feasibility Planning Node Alignment
`feasibility_planning.probe_plan_candidates` is the next validation-planning runtime slice after `validation_cycle_planning.cycle_candidates`.

### Implementation Sequencing Decision
Promote `feasibility_planning.probe_plan_candidates` as a single-node runtime slice. Do not introduce a broad validation-planning facade in this pass, and do not extract a shared execution helper.

The implementation service SHOULD be `PaperImplementationFeasibilityPlanningRuntimeService` and expose only `runProbePlanCandidates(...)` in the first slice. It MAY later share small pure helpers with validation-cycle planning for ref hashing, forbidden-field scans, or final-artifact envelope assembly, but it MUST NOT share execution ownership, prompt semantics, retry/fallback policy, admission decisions, or Domain Gate decisions before its own node evidence is closed.

### Runtime Role
This node is a production-capable runtime proposal slot for converting an admitted validation-cycle candidate proposal into feasibility probe and plan-light candidate proposals.

Runtime MUST NOT output a directly submit-ready `CreateFeasibilityProbeRequest`, `CreateExperimentPlanLightRequest`, `CreateValidationCycleDraftRequest`, queue action, Domain Gate request, WorkOrder request, or live adapter payload. The deterministic `PaperImplementationValidationCyclePlanningService` remains the only production owner for creating `FeasibilityProbe` and `ExperimentPlanLight` objects.

Harness can still record generic `AgentWorkflowHarnessRun` evidence for `workflow_type=feasibility_planning`, including proposal artifacts for validation scenarios. That harness surface is validation/recording only. It MUST NOT compile prompts, select models, compute runtime identity, compute cache/compression identity, repair outputs, emit runtime artifacts, or satisfy primary admitted runtime artifact inputs.

### Three-Dimensional Assessment
Robustness: require an admitted validation-cycle final artifact as the primary input, plus route proposal and route skeptic lineage anchors inherited from that cycle artifact. The runtime must fail closed on missing refs, hash drift, reviewed candidate key drift, schema-invalid probe plans, missing budget/stop/trace refs, provider failure after one technical retry, and any authority-looking output field.

Complexity control: keep one role and one runtime method. Do not pair deterministic `createFeasibilityProbe(...)` or `createExperimentPlanLight(...)` calls in the runtime path. Do not add arbiter/debate/reconcile roles in the first slice. Treat high-cost or conflicting feasibility evidence as blocker/warning codes inside candidate proposals, not as a separate execution chain.

Clear responsibility split: runtime proposes feasibility probe or plan-light candidates; admission verifies artifact identity and no-side-effect invariants; deterministic domain service owns persisted probe/plan creation; Domain Gate remains absent in the first slice; harness verifies the production path but cannot become a second producer.

### Slot Profile Resolution
```yaml
slot_id: feasibility_planning.probe_plan_candidates
workflow_type: feasibility_planning
role_slot_ids:
  - feasibility_planning.probe_plan_designer
profile_id: paper-implementation.feasibility-planning.probe-plan-candidates.v1
prompt_template_id: paper-implementation-feasibility-planning-probe-plan-candidates
prompt_template_version: v1
output_contract_id: PaperImplementationFeasibilityPlanningRoleArtifact@v1
final_output_contract_id: PaperImplementationFeasibilityPlanningArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.feasibility-planning.probe-plan-candidates.v1.openai-balanced
    - paper-implementation.feasibility-planning.probe-plan-candidates.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.feasibility-planning.probe-plan-candidates.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: large
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  primary_admitted_validation_cycle_candidate_final_artifact: required
  primary_admitted_route_proposal_final_artifact: required_lineage_anchor
  primary_admitted_route_skeptic_final_artifact: required_lineage_anchor
  validation_cycle_hash_must_match_request: true
  route_proposal_hash_must_match_cycle_candidate_artifact: true
  route_skeptic_hash_must_match_cycle_candidate_artifact: true
  reviewed_cycle_candidate_key_must_match_cycle_artifact: true
  reviewed_route_candidate_key_must_match_cycle_artifact: true
  harness_artifacts_as_primary_input: forbidden
  deterministic_route_probe_plan_refs_as_primary_input: forbidden
  deterministic_route_probe_plan_refs_as_secondary_context: optional
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_feasibility_probe_plan_candidate_proposal
  forbidden_writes:
    - feasibility_probe
    - experiment_plan_light
    - validation_cycle
    - technical_route_candidate
    - research_work_order
    - live_experiment_run
    - decision_work_queue_item
verification:
  schema_negative: feasibility_probe_or_experiment_plan_light_create_request_rejected
  service_negative: missing_admitted_validation_cycle_candidate_rejected_before_orchestrator
  route_negative: cycle_route_skeptic_or_candidate_key_mismatch_rejected
  harness_negative: harness_proposal_artifact_primary_input_rejected
  registry_test: paper_implementation_product_provider_only
```

### Input Contract Minimum
Primary inputs MUST include:
- one admitted final runtime artifact from `validation_cycle_planning.cycle_candidates`;
- lineage anchors for the admitted `route_architecture.route_candidates` final artifact referenced by the validation-cycle candidate artifact;
- lineage anchors for the admitted `route_skeptic_review.route_risk_critique` final artifact referenced by the validation-cycle candidate artifact;
- a reviewed cycle candidate key that exists in the validation-cycle final artifact;
- a reviewed route candidate key that matches the selected cycle candidate's route binding.

Allowed secondary context:
- deterministic `TechnicalRouteCandidate`, `ValidationCycle`, `FeasibilityProbe`, or `ExperimentPlanLight` refs for duplicate, baseline, or drift comparison only;
- motive version refs, board version refs, assertion refs, evidence refs, trace refs, result refs, budget refs, dataset/baseline/code/config refs, and source context packets.

Forbidden primary inputs:
- `technical_route_candidate`;
- `validation_cycle`;
- `feasibility_probe`;
- `experiment_plan_light`;
- `agent_workflow_harness_run`;
- `implementation_proposal_artifact`;
- raw or parsed harness output refs;
- decision work queue items;
- unadmitted validation-cycle, route architecture, or route skeptic runtime artifacts.

### Output Contract Minimum
The role output MUST include at least two `probe_plan_candidate_proposals` when `role_status=passed`. Candidate keys are runtime-local identifiers and MUST NOT be treated as persisted `feasibility_probe_id` or `experiment_plan_light_id` values.

Each probe/plan candidate proposal MUST include:
- `candidate_key`;
- `reviewed_cycle_candidate_key`;
- `reviewed_route_candidate_key`;
- `probe_kind`;
- `probe_question`;
- `plan_summary`;
- `expected_information_gain`;
- `baseline_gap_status`;
- `primary_metric_refs`;
- `dataset_version_refs`;
- `baseline_version_refs`;
- `code_version_refs`;
- `config_refs`;
- `budget_envelope`;
- `stop_condition_refs`;
- `trace_refs`;
- `confirmatory_marker`;
- `blocker_codes`;
- `warning_codes`.

The role and final artifacts MUST reject or omit authority-looking fields:
- `feasibility_probe_id` as a persisted domain id;
- `experiment_plan_light_id` as a persisted domain id;
- `create_feasibility_probe_request`;
- `create_experiment_plan_light_request`;
- `create_validation_cycle_draft_request`;
- `admit_validation_cycle_request`;
- `technical_route_candidate_create_request`;
- `domain_gate_request`;
- `queue_action`;
- `work_order_request`;
- `live_experiment_request`.

Final artifacts MUST include side-effect guards:
- `no_domain_gate_request`;
- `no_queue_side_effect`;
- `no_feasibility_probe_side_effect`;
- `no_experiment_plan_light_side_effect`;
- `no_validation_cycle_side_effect`.

### Admission And Evidence
Admission MUST verify validation-cycle, route architecture, and route skeptic final artifacts, route proposal hash, route skeptic hash, reviewed cycle candidate key, reviewed route candidate key, motive/board/evidence/trace refs, budget refs, stop-condition refs, prompt/profile/model-option identity, output hash, candidate count, forbidden fields, replay/idempotency, and source drift.

Admission MUST NOT repair probe plans, synthesize budgets, create feasibility probes, create plan-light objects, create validation cycles, create queue items, or materialize Domain Gate state.

Minimum L5 cases for this node:
- missing admitted validation-cycle candidate final artifact rejected before orchestrator;
- missing route proposal or route skeptic lineage anchor rejected before orchestrator;
- validation-cycle artifact hash mismatch rejected before orchestrator;
- route proposal or route skeptic hash mismatch rejected before orchestrator;
- reviewed cycle candidate key mismatch rejected before orchestrator;
- reviewed route candidate key mismatch rejected before orchestrator;
- harness proposal artifact as primary input rejected;
- deterministic route/probe/plan-light refs as primary input rejected;
- product non-provider mode rejected before orchestrator;
- provider-mode fixture payload rejected before orchestrator;
- model-option drift rejected before gateway;
- over-budget context blocks with zero provider calls;
- provider failure retries at most once and ends with no final artifact;
- schema-invalid probe/plan proposal retries at most once and ends with no final artifact;
- missing budget, stop-condition, metric, dataset, baseline, code, config, or trace refs rejected for passed candidates;
- high-cost confirmatory candidate with open baseline gap rejected unless represented as a blocked proposal;
- feasibility-probe/plan-light/validation-cycle/route/workorder/live-adapter/queue mutation fields are rejected;
- harness proposal artifacts cannot masquerade as runtime final artifacts.

### 2026-06-07 Implementation Status
`feasibility_planning.probe_plan_candidates` is promoted through a dedicated `PaperImplementationFeasibilityPlanningRuntimeService`.

Implemented closure points:
- shared runtime contracts and schemas for request, role output, final artifact, budget envelope, source context packets, and probe/plan candidate proposals;
- context family `paper_implementation_feasibility_planning`;
- backend runtime service method `runProbePlanCandidates(...)`;
- HTTP runtime route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/feasibility-planning-probe-plan-candidates/run`;
- model profile and prompt registry entries for `paper-implementation.feasibility-planning.probe-plan-candidates.v1`;
- product-mode provider-only profile resolution and provider fixture rejection;
- runtime/admission lineage checks for validation-cycle, route proposal, route skeptic, reviewed cycle keys, and reviewed route keys;
- no-Domain-Gate and no-side-effect assertions for feasibility probe, experiment plan-light, validation cycle, queue, WorkOrder, and live adapter payloads;
- L5 required stress cases for over-budget zero provider calls, provider failure retry exhaustion, and incomplete proposal sets.

## Cross Board Synthesis Node Alignment
`cross_board_synthesis.merge_split_reuse_scenarios` is the next motive/evidence-board runtime slice after feasibility planning.

### Implementation Sequencing Decision
Promote `cross_board_synthesis.merge_split_reuse_scenarios` as a single-node runtime slice. Do not introduce a broad motive-board runtime facade, do not extract a debate execution helper in the first slice, and do not reuse `CreateCrossBoardReviewRequest` as the runtime output contract.

The implementation service SHOULD be `PaperImplementationCrossBoardSynthesisRuntimeService` and expose only `runMergeSplitReuseScenarios(...)` in the first slice. It MAY later share small pure helpers with motive/evidence-board services for ref normalization, memo-like ref detection, or forbidden-field scans, but it MUST NOT share execution ownership, prompt semantics, retry/fallback policy, admission decisions, or Domain Gate decisions.

Implementation order MUST be:
1. add shared runtime contracts and schemas for request, role output, final artifact, scenario proposal, board anchor, and context packet DTOs;
2. add `PaperImplementationCrossBoardSynthesisRuntimeService.runMergeSplitReuseScenarios(...)`;
3. wire the controlled runtime route/controller/app entrypoint;
4. add model profile and prompt registry entries;
5. add L1-L5 tests and runtime-stress required cases.

The runtime service may own preflight structural validation, profile/prompt/model-option resolution, context packet and compression identity, provider role invocation, role artifact recording, role output structural validation, final proposal artifact assembly, runtime admission calls, and same-profile technical retry. It MUST NOT own domain review creation, transfer binding creation, portfolio mutation, motive evolution, queue creation, Domain Gate materialization, or semantic repair of provider output.

### Runtime Role
This node is a production-capable runtime proposal slot for producing typed merge, split, reuse, park, and reject scenarios from admitted board-version context.

Runtime MUST NOT call `createCrossBoardReview(...)`, `createEvidenceTransferBinding(...)`, `applyMotivePortfolioDecision(...)`, motive evolution writers, queue writers, or any Domain Gate materializer. The deterministic motive/evidence-board services remain the owners for cross-board review records, evidence transfer bindings, and portfolio state transitions.

Harness can still record generic `AgentWorkflowHarnessRun` evidence for `workflow_type=cross_board_synthesis`. That harness surface is validation/recording only. It MUST NOT compile prompts, select models, compute runtime identity, compute cache/compression identity, repair outputs, emit runtime artifacts, or satisfy primary admitted runtime artifact inputs.

### Three-Dimensional Assessment
Robustness: require admitted board-version refs with hashes, motive/version refs, trace manifests, source locator refs, freshness markers, challenge/conflict refs, and any existing EvidenceTransferBinding refs. The runtime must fail closed on missing board anchors, board hash drift, dropped conflict/challenge refs after compression, memo-like evidence refs, cross-board reuse without an evidence transfer binding or explicit blocker, provider failure after one technical retry, and any authority-looking output field.

Complexity control: keep one role and one runtime method. Do not add arbiter/reconcile roles, portfolio-decision simulation, or second-pass debate in the first slice. Scenario coverage is conditional and machine-checkable: require reuse scenarios only when transfer bindings exist, require park or reject scenarios when unresolved conflicts/challenges exist, and require merge or split scenarios only when overlap/divergence hints are present. This avoids forcing artificial five-way output on every board pair.

Clear responsibility split: runtime proposes typed cross-board scenarios; admission verifies board identity, transfer-binding identity, conflict preservation, memo guard, and no-side-effect invariants; deterministic domain services own review records, evidence transfer creation, motive evolution, portfolio decisions, and queue routing; Domain Gate remains absent in the first slice; harness verifies the production path but cannot become a second producer.

### Slot Profile Resolution
```yaml
slot_id: cross_board_synthesis.merge_split_reuse_scenarios
workflow_type: cross_board_synthesis
role_slot_ids:
  - cross_board_synthesis.merge_split_reuse_scenario_designer
profile_id: paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1
prompt_template_id: paper-implementation-cross-board-synthesis-merge-split-reuse-scenarios
prompt_template_version: v1
output_contract_id: PaperImplementationCrossBoardSynthesisRoleArtifact@v1
final_output_contract_id: PaperImplementationCrossBoardSynthesisArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.openai-balanced
    - paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: large
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
request_policy:
  board_anchors: required_min_two
  board_anchor_fields:
    board_version_ref: required
    board_version_hash: required
    motive_ref: required
    core_motive_version_ref: required
    trace_manifest_ref: required
    trace_manifest_hash: required
    evidence_binding_refs: required_non_empty_for_evidence_bearing_board
    source_locator_refs: required_non_empty_for_evidence_bearing_board
    conflict_refs: required_when_present_on_board
    challenge_refs: required_when_present_on_board
    freshness_status: required
  reviewed_board_version_refs_must_match_board_anchors: true
  reviewed_conflict_refs_must_cover_board_conflicts: true
  reviewed_challenge_refs_must_cover_board_challenges: true
  board_version_hashes_must_match_request: true
  motive_refs_must_match_board_versions: true
  trace_manifest_hashes_must_match_request: true
  source_locator_refs_required_for_evidence_bearing_context: true
  conflict_and_challenge_refs_preserved_by_compression: true
  evidence_transfer_binding_refs_as_reuse_authority: required_when_reuse_claimed
  reuse_without_transfer_binding_must_be_blocked_or_warned: true
  harness_artifacts_as_primary_input: forbidden
  cross_board_review_refs_as_primary_input: forbidden
  portfolio_decision_refs_as_primary_input: forbidden
  motive_evolution_decision_refs_as_primary_input: forbidden
  deterministic_board_or_transfer_refs_as_secondary_context: optional
  run_mode_product_requires_execution_mode: provider_llm
  provider_mode_model_option_resolution: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  provider_mode_rejects_fixture_payloads: true
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_cross_board_merge_split_reuse_scenario_proposal
  forbidden_writes:
    - cross_board_review
    - evidence_transfer_binding
    - motive_portfolio_decision
    - motive_evolution_decision
    - motive_evidence_board_version
    - core_motive_version
    - decision_work_queue_item
verification:
  schema_negative: cross_board_review_or_portfolio_decision_payload_rejected
  service_negative: missing_admitted_board_versions_rejected_before_orchestrator
  route_negative: board_hash_or_conflict_ref_drift_rejected
  harness_negative: harness_proposal_artifact_primary_input_rejected
  registry_test: paper_implementation_product_provider_only
```

### Input Contract Minimum
The runtime request MUST be a runtime-specific DTO centered on `board_anchors[]`. It MUST NOT accept `CreateCrossBoardReviewRequest`, `ApplyMotivePortfolioDecisionRequest`, `CreateMotiveEvolutionDecisionRequest`, or any harness output shape as the request body.

Primary inputs MUST include:
- `target_ref`;
- `source_refs`;
- `board_anchors[]` with at least two admitted board anchors.

Each `board_anchors[]` item MUST include:
- `board_version_ref`;
- `board_version_hash`;
- `motive_ref`;
- `core_motive_version_ref`;
- `trace_manifest_ref`;
- `trace_manifest_hash`;
- `evidence_binding_refs`;
- `source_locator_refs`;
- `conflict_refs`;
- `challenge_refs`;
- `freshness_status`.

Request-owned reviewed sets MUST include:
- `reviewed_board_version_refs`;
- `reviewed_conflict_refs`;
- `reviewed_challenge_refs`;
- `evidence_transfer_binding_refs`;
- `reuse_policy`.

Runtime preflight MUST reject:
- fewer than two board anchors;
- missing board version ref/hash;
- missing motive or core motive version refs;
- missing trace manifest ref/hash;
- missing source locator refs for evidence-bearing context;
- conflict or challenge refs present in board context but absent from the reviewed sets;
- memo-like refs in evidence-bearing context.

If `evidence_transfer_binding_refs` is empty, provider output MUST NOT produce a passed `reuse` scenario. It may only represent reuse as blocked or warned, with an explicit missing-transfer-binding blocker.

Allowed secondary context:
- existing `CrossBoardReview` refs for historical comparison only;
- deterministic EvidenceTransferBinding refs for reuse authority comparison;
- motive assertion refs, evidence binding refs, accepted-risk refs, route/experiment refs, result/claim refs, and source context packets.

Forbidden primary inputs:
- `agent_workflow_harness_run`;
- `implementation_proposal_artifact`;
- raw or parsed harness output refs;
- `cross_board_review`;
- `motive_portfolio_decision`;
- `motive_evolution_decision`;
- decision work queue items;
- untraced board summaries, rationale memos, display summaries, or other memo-like evidence refs.

### Output Contract Minimum
The role output MUST include at least the scenario kinds required by the request-owned context. It SHOULD NOT force artificial merge/split/reuse/park/reject coverage when the input context lacks the corresponding trigger.

Scenario enums:
- `scenario_kind`: `merge`, `split`, `reuse`, `park`, or `reject`;
- `disposition`: `viable_candidate`, `blocked_missing_transfer_binding`, `blocked_conflict_unresolved`, `blocked_stale_or_untraced_context`, or `needs_domain_review`;
- `recommended_next_gate`: `cross_board_review`, `evidence_transfer_binding_review`, `motive_evolution_review`, `portfolio_decision_review`, `evidence_board_curation`, `trace_repair`, or `none`.

Scenario coverage rules:
- if EvidenceTransferBinding refs are present, at least one `reuse` scenario is required;
- if unresolved conflicts or challenged evidence refs are present, at least one `park` or `reject` scenario is required;
- if motive scope-overlap hints are present, at least one `merge` scenario is required;
- if motive scope-divergence hints are present, at least one `split` scenario is required.

Each scenario proposal MUST include:
- `scenario_key`;
- `scenario_kind`;
- `disposition`;
- `source_board_version_refs`;
- `source_board_version_hashes`;
- `target_motive_refs`;
- `evidence_transfer_binding_refs`;
- `conflict_refs`;
- `challenge_refs`;
- `freshness_blockers`;
- `source_locator_refs`;
- `expected_benefit`;
- `risk_codes`;
- `blocker_codes`;
- `warning_codes`;
- `recommended_next_gate`.

Role output MUST include:
- `role_slot_id = cross_board_synthesis.merge_split_reuse_scenario_designer`;
- `role_status`;
- `summary`;
- `cited_source_refs`;
- `reviewed_board_version_refs`;
- `reviewed_conflict_refs`;
- `reviewed_challenge_refs`;
- `reviewed_evidence_transfer_binding_refs`;
- `scenario_proposals`;
- `blocker_codes`;
- `warning_codes`;
- all final side-effect guards listed below.

Passed role outputs MUST include at least one scenario proposal. Blocked role outputs MAY include zero scenario proposals only when blocker codes explain the missing required context before provider semantics can be trusted.

Admission MUST NOT perform semantic interpretation. It only validates request-owned refs, hashes, schema fields, enumerated coverage rules, forbidden authority fields, side-effect guards, replay, idempotency, and drift. It MUST NOT decide whether two motives semantically deserve merge/split/reuse, infer missing evidence from summaries, rewrite `scenario_kind`, promote blocked scenarios to viable scenarios, synthesize EvidenceTransferBinding refs, or create review/portfolio/evolution payloads.

Scenario admission rules:
- every scenario's `source_board_version_refs` and `source_board_version_hashes` MUST match request-owned `board_anchors[]`;
- `reuse + viable_candidate` MUST include at least one `evidence_transfer_binding_ref`;
- when request `evidence_transfer_binding_refs` is empty, any reuse scenario MUST use `blocked_missing_transfer_binding`;
- every scenario with evidence-bearing context MUST include non-empty `source_locator_refs`;
- every scenario that cites request-owned conflict or challenge refs MUST preserve those refs in the scenario and in the role-level reviewed refs;
- scenario keys are runtime-local identifiers and MUST NOT be treated as persisted domain ids.

The role and final artifacts MUST reject or omit authority-looking fields:
- `cross_board_review_id`;
- `create_cross_board_review_request`;
- `evidence_transfer_binding_request`;
- `motive_portfolio_decision_id`;
- `motive_roles_after_decision`;
- `merged_motives`;
- `split_motives`;
- `motive_evolution_decision_request`;
- `domain_gate_request`;
- `queue_action`.

Final artifacts MUST include side-effect guards:
- `no_domain_gate_request`;
- `no_queue_side_effect`;
- `no_cross_board_review_side_effect`;
- `no_evidence_transfer_binding_side_effect`;
- `no_portfolio_mutation_side_effect`;
- `no_motive_evolution_side_effect`.

### Admission And Evidence
Admission MUST verify admitted board refs, board hashes, motive refs, trace refs, source locator refs, EvidenceTransferBinding refs, conflict/challenge refs, freshness policy, prompt/profile/model-option identity, output hash, conditional scenario coverage, forbidden fields, replay/idempotency, and source drift.

Admission MUST NOT repair scenarios, synthesize evidence transfer bindings, create cross-board reviews, create motive evolution decisions, create portfolio decisions, create queue items, or materialize Domain Gate state.

Minimum L5 cases for this node:
- missing admitted board version refs rejected before orchestrator;
- board version hash mismatch rejected before orchestrator;
- motive ref mismatch rejected before orchestrator;
- missing source locator refs rejected for evidence-bearing context;
- memo-like evidence refs rejected before provider calls;
- conflict/challenge preservation loss or missing required conflict/challenge scenario coverage blocks or retry-exhausts with no final artifact;
- scenario-local source locator, transfer binding, conflict, and challenge refs outside request-owned reviewed sets retry-exhaust with no final artifact;
- reuse scenario without EvidenceTransferBinding refs fails closed or is represented as a blocked proposal;
- provider-mode fixture payload rejected before orchestrator;
- product non-provider mode rejected before orchestrator;
- model-option drift rejected before gateway;
- over-budget context blocks with zero provider calls;
- provider failure retries at most once and ends with no final artifact;
- incomplete required scenario coverage retries at most once and ends with no final artifact;
- cross-board review, evidence transfer, portfolio, motive evolution, Domain Gate, and queue mutation fields are rejected;
- harness proposal artifacts cannot masquerade as runtime final artifacts.

### Test Matrix Decision
The cross-board synthesis slice should use the smallest machine-verifiable test set that closes runtime/admission/domain boundaries.

L1 shared schema MUST cover:
- request schema for `board_anchors.length >= 2`, board ref/hash, motive refs, trace refs, source locator refs, and reviewed conflict/challenge refs;
- role output schema for `scenario_kind`, `disposition`, and `recommended_next_gate` enums;
- final artifact schema requiring all no-side-effect guards;
- negative schema fixtures for cross-board review, evidence transfer, portfolio decision, Domain Gate, and queue payload fields.

L2 runtime service tests MUST cover:
- happy path from two board anchors through role/final runtime artifacts and admission;
- preflight fail-closed cases for missing board anchors, board hash drift, missing trace refs, missing source locators, memo-like evidence refs, and product non-provider execution;
- output/admission fail-closed cases for dropped conflict/challenge refs, scenario-local refs outside request-owned reviewed sets, viable reuse without EvidenceTransferBinding refs, provider domain-writer fields, incomplete required scenario coverage, and schema-invalid provider output;
- provider failure and schema/coverage invalid output retry at most once on the same profile, ending with no final artifact when exhausted;
- no calls to cross-board review creation, EvidenceTransferBinding creation, portfolio decision, motive evolution, queue, or Domain Gate materialization.

L3 route integration SHOULD stay narrow:
- route happy path uses the production runtime/admission service path;
- product non-provider mode, explicit model-option drift, and body-owned slot/profile/runtime identity overrides are rejected;
- board hash or conflict-ref drift is rejected through the route;
- route does not materialize Domain Gate or domain writes.

Registry/profile tests MUST cover:
- PaperImplementation product mode remains provider-only for the new profile;
- explicit model options must belong to the cross-board profile;
- YAML profile and prompt entries match backend registry identity;
- registry validation finds the profile and prompt template.

L5 stress required cases SHOULD be limited to the following machine-boundary cases:
1. over-budget board context blocks with zero provider calls;
2. provider failure retries once and creates no final artifact;
3. missing conflict/challenge scenario coverage retries once and creates no final artifact;
4. scenario-local refs outside request-owned reviewed sets retry once and creates no final artifact;
5. viable reuse without EvidenceTransferBinding refs retries once and creates no final artifact;
6. memo-as-evidence payload is rejected before provider calls.

No-dual-track scans MUST prove:
- runtime service does not use `AgentWorkflowHarnessRun` as a primary input;
- runtime service does not call `createCrossBoardReview`, `createEvidenceTransferBinding`, `applyMotivePortfolioDecision`, queue writers, or Domain Gate materializers;
- domain writer fields appear only in schema negative fixtures, service negative fixtures, route negative fixtures, L5 negative fixtures, or documentation.

Do not add a Prisma smoke by default unless this slice changes the DB schema. Do not make live provider canaries default; keep provider canary hooks opt-in.

## Evidence Board Curation Node Alignment
`evidence_board_curation.binding_gap_candidates` is the next motive/evidence-board runtime slice after cross-board synthesis.

### Implementation Sequencing Decision
Promote `evidence_board_curation.binding_gap_candidates` as a single-node proposal runtime slice with a schema-controlled challenge pass. Do not introduce a full proposer/critic/arbiter debate, do not extract a shared debate execution helper in the first slice, and do not reuse `CreateMotiveEvidenceBoardVersionRequest` as the runtime output contract.

The implementation service SHOULD be `PaperImplementationEvidenceBoardCurationRuntimeService` and expose only `runBindingGapCandidates(...)` in the first slice. It MAY later share small pure helpers for functional-ref normalization, memo-like ref detection, forbidden-field scans, and request-owned set checks. It MUST NOT share execution ownership, prompt semantics, retry/fallback policy, admission decisions, Domain Gate decisions, or evidence-board writer authority.

Implementation order MUST be:
1. add shared runtime contracts and schemas for request, role output, final artifact, binding candidate, gap candidate, candidate challenge check, and context packet DTOs;
2. add `PaperImplementationEvidenceBoardCurationRuntimeService.runBindingGapCandidates(...)`;
3. wire the controlled runtime route/controller/app entrypoint;
4. add model profile and prompt registry entries;
5. add L1-L5 tests and runtime-stress required cases.

The runtime service may own preflight structural validation, profile/prompt/model-option resolution, context packet and compression identity, provider role invocation, machine semantic gate, role artifact recording, final proposal artifact assembly, runtime admission calls, and max-one same-profile technical retry. It MUST NOT own evidence-board version creation, EvidenceBinding creation, EvidenceTransferBinding creation, citation candidate creation, trace repair queue creation, queue creation, Domain Gate materialization, or semantic repair of provider output.

### Runtime Role
This node is a production-capable runtime proposal slot for binding/gap curation. It proposes which request-owned evidence/citation/source-locator refs may become evidence-binding candidates and which assertion/evidence gaps should route to trace repair, stale-evidence recheck, transfer-binding review, or board update review.

Runtime MUST NOT call `createMotiveEvidenceBoardVersion(...)`, create `EvidenceBinding` objects, call `createEvidenceTransferBinding(...)`, call `createCitationCandidate(...)`, create trace repair queue items, create decision queue items, or call any Domain Gate materializer. `PaperImplementationMotiveEvidenceBoardService` and `PaperImplementationTraceKernelService` remain the owners for board/evidence binding, transfer binding, citation candidate, and trace repair authority.

Harness can still record generic `AgentWorkflowHarnessRun` evidence for `workflow_type=evidence_board_curation`. That harness surface is validation/recording only. It MUST NOT compile prompts, select models, compute runtime identity, compute cache/compression identity, repair outputs, emit runtime artifacts, or satisfy primary admitted runtime artifact inputs.

### Boundary/Dual-Track/Robustness/Complexity Review
Responsibility boundary: runtime proposes binding/gap candidates with bounded challenge checks. Admission verifies refs, hashes, challenge-check completeness, side-effect guards, forbidden fields, replay, and drift. Deterministic board and trace services own board updates, evidence binding creation, transfer binding creation, citation creation, and trace repair queue writes. Domain Gate remains absent in the first slice. Harness verifies the production path but cannot become a second producer.

No-dual-track risk: the first slice MUST have one runtime route/service path and one final artifact schema. Harness artifacts MUST NOT become primary input or final runtime artifacts. `source_context_packets` MUST NOT become a parallel evidence authority lane. `seed_initial_board_candidates` MUST NOT become an implicit board-creation or board-draft path.

Robustness: require request-owned target board/motive/assertion refs, trace manifest refs and hashes, source locator refs, citation candidate refs, evidence refs, freshness status, existing binding refs, accepted-risk refs, and secondary source context packet hashes where they affect curation. The runtime must fail closed on missing source locators for viable binding candidates, invented refs, memo-like evidence refs, stale or missing-locator refs presented as viable bindings, provider failure after one technical retry, incomplete challenge checks, unscoped source context packets, and any authority-looking output field.

Complexity control: keep one role, one runtime method, one route, and one final proposal artifact schema. Do not add proposer/critic/arbiter roles, broad motive-board runtime facades, multi-round candidate rewrite, full board writer payloads, or full debate transcript capture in the first slice. The challenge pass is not a separate role; it is a required structured field inside each binding candidate. `curation_mode` may change only preflight requirements and machine gate rules, not the output shape or authority boundary.

### Controlled Runtime Flow
The first slice MUST use five runtime phases:
1. Preflight: enforce `product -> provider_llm`, slot/profile/model-option ownership, request-owned ref completeness, source-hash presence, and forbidden primary inputs. Reject harness artifacts, memo-like evidence refs, and domain-writer request shapes before provider calls.
2. Context build: compile ref-backed context, source hash bundle, prompt packet hash, cache/compression identity, and runtime token budget. Source locators, citation candidates, trace manifests, existing bindings, and assertions MUST be part of primary input refs.
3. Single controlled role call: call only `evidence_board_curation.binding_gap_candidate_curator`. The role MUST emit binding candidates, gap candidates, and a structured challenge check for every binding candidate in one output.
4. Machine gate and retry: runtime only accepts or rejects. It does not repair candidates. It retries at most once on schema/provider/machine-boundary failures with the same profile/model option/prompt identity.
5. Artifact and admission finalize: exhausted retry records one failed role artifact and rejected admission with no final artifact. Passed or blocked proposal outputs may create role/final runtime artifacts, but final artifacts remain proposal-only and carry no domain-writer payload.

### Slot Profile Resolution
```yaml
slot_id: evidence_board_curation.binding_gap_candidates
workflow_type: evidence_board_curation
role_slot_ids:
  - evidence_board_curation.binding_gap_candidate_curator
profile_id: paper-implementation.evidence-board-curation.binding-gap-candidates.v1
prompt_template_id: paper-implementation-evidence-board-curation-binding-gap-candidates
prompt_template_version: v1
output_contract_id: PaperImplementationEvidenceBoardCurationRoleArtifact@v1
final_output_contract_id: PaperImplementationEvidenceBoardCurationArtifact@v1
registry_resolution:
  yaml_candidates_path: .ai/llm-config/registry/model_profiles.yaml
  backend_registry_path: apps/backend/src/services/topic-selection-model-profile-registry-service.ts
  default_provider_options:
    - paper-implementation.evidence-board-curation.binding-gap-candidates.v1.openai-balanced
    - paper-implementation.evidence-board-curation.binding-gap-candidates.v1.dashscope-balanced
  manual_quality_options:
    - paper-implementation.evidence-board-curation.binding-gap-candidates.v1.openai-quality
  normalized_params:
    creativity: low
    reasoning_depth: high
    output_budget: medium
  timeout_policy: inherited_gateway_timeout
  retry_policy: max_one_same_profile_technical_retry
  fallback_policy: fail_closed_no_mock_codex_cache_replay_in_product
  product_eligibility:
    mocked_llm: forbidden
    codex_assisted: forbidden
    provider_llm: required
debate_policy:
  full_debate_helper: forbidden_first_slice
  proposer_critic_arbiter_roles: forbidden_first_slice
  controlled_challenge_pass: required_structured_field
  role_calls_per_attempt: 1
  semantic_rewrite_after_challenge: forbidden
domain_gate_boundary:
  first_slice: no_domain_gate
  allowed_final_artifact: admitted_binding_gap_candidate_proposal
  forbidden_writes:
    - motive_evidence_board_version
    - evidence_binding
    - evidence_transfer_binding
    - citation_candidate
    - trace_repair_queue_item
    - decision_work_queue_item
```

### Input Contract Minimum
The runtime request MUST be a runtime-specific DTO centered on a target board/motive/assertion context. It MUST NOT accept `CreateMotiveEvidenceBoardVersionRequest`, `CreateEvidenceTransferBindingRequest`, `CreateCitationCandidateRequest`, trace repair queue requests, or any harness output shape as the request body.

The request MUST use a discriminated mode instead of optional board semantics:
- `curation_mode = curate_existing_board`;
- `curation_mode = seed_initial_board_candidates`.

`curate_existing_board` is the default first-slice mode for an existing `MotiveEvidenceBoardVersion`. It MUST require `target_board_ref`, `target_board_hash`, `existing_evidence_binding_refs`, and `existing_bound_evidence_refs`. It is append-only: it may propose new binding candidates and gaps, but it MUST NOT update, remove, rewrite, or patch existing board content.

`seed_initial_board_candidates` is allowed for an admitted motive/core-motive version that has no current board. It MUST require motive/version/assertion, trace, source locator, citation candidate, and evidence refs. It MUST NOT require or accept `target_board_ref` as primary authority, and it MUST NOT accept `existing_evidence_binding_refs` or `existing_bound_evidence_refs` as current-board authority. It may seed candidate proposals for a later deterministic board path, but it MUST NOT emit board-shaped content, a board draft, board bindings, board summaries, board state, or board create requests.

### Request Schema Decision
The first implementation SHOULD encode the runtime request as a discriminated union with one shared base and two mode-specific branches.

Shared base fields MUST include:
- `curation_mode`;
- `target_ref`;
- `input_snapshot_ref`;
- `source_refs`;
- `source_hashes`;
- `target_motive_ref`;
- `target_core_motive_version_ref`;
- `target_assertion_refs`;
- `trace_manifest_refs`;
- `trace_manifest_hashes`;
- `source_locator_refs`;
- `citation_candidate_refs`;
- `reviewed_citation_candidate_refs`;
- `evidence_refs`;
- `existing_evidence_binding_refs`;
- `existing_bound_evidence_refs`;
- `freshness_policy`;
- `accepted_risk_refs`;
- optional `source_context_packets`.

The `curate_existing_board` branch MUST additionally require:
- `target_board_ref`;
- `target_board_hash`;
- `existing_evidence_binding_refs`;
- `existing_bound_evidence_refs`.

The `seed_initial_board_candidates` branch MUST NOT include current-board authority fields:
- `target_board_ref`;
- `target_board_hash`;
- `existing_evidence_binding_refs`;
- `existing_bound_evidence_refs`.

`source_context_packets` are optional in the first slice. If present, each packet MUST include:
- `packet_ref`;
- `packet_hash`;
- `source_ref`;
- `source_hash`;
- `evidence_kind`;
- `content_summary`;
- `key_facts`;
- `covered_evidence_refs`;
- `covered_source_locator_refs`;
- `covered_citation_candidate_refs`;
- `covered_trace_manifest_refs`.

Requests that provide evidence text or `source_context_packets` without the required ref authority MUST fail preflight. Text-only evidence review is not a runtime entrypoint. Missing source locator, citation candidate, evidence, source, or trace refs may produce gap/blocker candidates only; they MUST NOT produce viable binding candidates.

Primary inputs MUST include:
- `target_ref`;
- `input_snapshot_ref`;
- `source_refs` and `source_hashes`;
- `target_board_ref` and `target_board_hash` when a current board exists;
- `target_motive_ref`;
- `target_core_motive_version_ref`;
- `target_assertion_refs`;
- `trace_manifest_refs` and trace manifest hashes;
- `source_locator_refs`;
- `citation_candidate_refs`;
- `reviewed_citation_candidate_refs`;
- `evidence_refs`;
- `existing_evidence_binding_refs`;
- `existing_bound_evidence_refs`;
- freshness and accepted-risk refs when present.

Runtime preflight MUST reject:
- missing target motive or core motive version refs;
- missing reviewed assertion refs;
- missing source locator refs for evidence-bearing context;
- missing citation candidate refs when citation-backed evidence is proposed;
- missing source hashes;
- `source_context_packets` that are not covered by request-owned source refs and hashes;
- `source_context_packets` whose covered evidence, source locator, citation candidate, or trace refs are outside request-owned ref sets;
- `existing_bound_evidence_refs` outside request-owned `evidence_refs`;
- `seed_initial_board_candidates` requests carrying current-board binding context;
- evidence text or source packets without request-owned source locator, citation candidate, evidence, and trace refs;
- stale or broken trace refs presented as viable binding context;
- memo-like refs in primary evidence context;
- harness artifacts as primary input;
- domain-writer request payloads as primary input.

Allowed secondary context:
- existing `MotiveEvidenceBoardVersion` refs for comparison;
- existing `EvidenceBinding` refs for duplicate/gap comparison;
- existing bound evidence refs for duplicate-evidence comparison;
- existing `EvidenceTransferBinding` refs for transfer-review hints only;
- trace repair queue refs for historical blockers only;
- `source_context_packets` when live provider semantic quality needs reviewable evidence text.

`source_context_packets` are secondary provider-review material only. They are not primary evidence authority. They MUST be covered by `source_refs` plus source/context hashes, included in cache and prompt identity, and scoped to the requested evidence/source locator/citation candidate refs. They MUST NOT replace source refs, source locator refs, citation candidate refs, evidence refs, or trace manifest refs. They MUST NOT carry raw unscoped history, harness output, free-form evidence memos, or evidence text that is not covered by request-owned source refs and hashes.

Forbidden primary inputs:
- `agent_workflow_harness_run`;
- `implementation_proposal_artifact`;
- raw or parsed harness output refs;
- board summaries, display summaries, rationale memos, LLM rationales, result interpretation packets, or other memo-like evidence refs;
- `CreateMotiveEvidenceBoardVersionRequest`;
- `CreateEvidenceTransferBindingRequest`;
- `CreateCitationCandidateRequest`;
- trace repair queue or decision queue create payloads.

### Output Contract Minimum
The first-slice output MUST be append-only for both `curate_existing_board` and `seed_initial_board_candidates`. Runtime output is limited to:
- `binding_candidate_proposals[]`;
- `gap_candidate_proposals[]`;
- blocker/warning codes;
- side-effect guards.

`curate_existing_board` MUST NOT act as a board editor. It MUST NOT output:
- `board_draft`;
- `board_summary`;
- `board_state`;
- `bindings`;
- `update_existing_binding_proposals`;
- `remove_binding_proposals`;
- `board_summary_patch`;
- `board_state_patch`;
- persisted `EvidenceBinding` objects;
- `CreateMotiveEvidenceBoardVersionRequest`;
- trace repair queue items;
- stale-evidence recheck queue items;
- board update requests.

`seed_initial_board_candidates` MUST NOT act as a board creator. It MUST NOT output:
- `board_draft`;
- `board_summary`;
- `board_state`;
- `bindings`;
- `create_board_request`;
- `CreateMotiveEvidenceBoardVersionRequest`;
- persisted `MotiveEvidenceBoardVersion` objects;
- persisted `EvidenceBinding` objects.

For `curate_existing_board`, a new binding candidate MUST NOT duplicate `existing_bound_evidence_refs`. `existing_evidence_binding_refs` identify current binding records; `existing_bound_evidence_refs` identify the evidence already bound by those records. If the same evidence is already bound on the current board, the runtime may only emit a gap/warning/blocker candidate; it MUST NOT emit that evidence as a new viable binding candidate. Candidate keys also MUST NOT collide with existing binding ids.

Role output MUST include:
- `role_slot_id = evidence_board_curation.binding_gap_candidate_curator`;
- `role_status`;
- `summary`;
- `cited_source_refs`;
- `reviewed_assertion_refs`;
- `reviewed_source_locator_refs`;
- `reviewed_citation_candidate_refs`;
- `reviewed_evidence_refs`;
- `reviewed_existing_evidence_binding_refs`;
- `binding_candidate_proposals`;
- `gap_candidate_proposals`;
- `blocker_codes`;
- `warning_codes`;
- all final side-effect guards listed below.

Each `binding_candidate_proposal` MUST include:
- `candidate_key`;
- `target_assertion_ref`;
- `evidence_ref`;
- `source_locator_refs`;
- `citation_candidate_refs`;
- `proposed_role`;
- `proposed_scope`;
- `proposed_strength`;
- `support_state`;
- `challenge_status`;
- `freshness_status`;
- `interpretation`;
- `challenge_check`;
- `blocker_codes`;
- `warning_codes`;
- `recommended_next_gate`.

Each `challenge_check` MUST include machine-checkable fields:
- `memo_or_summary_rejected`;
- `locator_quality`;
- `citation_status`;
- `scope_match_status`;
- `freshness_status`;
- `should_downgrade_to_gap`;
- `downgrade_reason_codes`;
- `blocking_reason_codes`.

Each `gap_candidate_proposal` MUST include:
- `gap_key`;
- `target_assertion_ref`;
- `gap_kind`;
- `missing_evidence_need`;
- `source_locator_blockers`;
- `citation_blockers`;
- `freshness_blockers`;
- `recommended_next_gate`;
- `blocker_codes`;
- `warning_codes`.

Machine gate rules:
- every viable binding candidate MUST include non-empty source locator refs;
- every candidate ref MUST be inside request-owned/reviewed sets;
- memo-like evidence refs MUST fail closed before final artifact admission;
- stale, missing-locator, or unreviewed-citation refs MUST NOT be emitted as viable binding candidates; they must become gap/blocker candidates;
- every binding candidate MUST include a challenge check;
- no candidate key may be treated as a persisted domain id.

### Simplified Issue Code Decision
The first slice MUST NOT introduce fine-grained audit-oriented issue codes. Issue codes exist only to make runtime scheduling, retry, and admission rejection deterministic. Human-readable diagnostics are optional and MUST NOT drive control flow.

Runtime/admission status SHOULD use:
- `terminal_code`;
- `reason_kind`;
- `details`.

Passed outputs keep the generic `runtime_status=passed` and do not need a terminal code. Terminal codes are for non-passed control-flow outcomes only.

Allowed `terminal_code` values:
- `preflight_blocked`: zero provider calls, no final artifact;
- `runtime_retry_exhausted`: max-one same-profile technical retry exhausted, no final artifact;
- `admission_rejected`: machine-boundary rejection, no semantic repair;
- `admitted_blocked`: valid final artifact with semantic blockers/gaps in payload.

Allowed `reason_kind` values for `preflight_blocked`:
- `missing_required_refs`;
- `forbidden_input`;
- `source_identity_invalid`;
- `mode_authority_violation`;
- `context_over_budget`.

Allowed `reason_kind` values for `runtime_retry_exhausted`:
- `provider_failed`;
- `output_invalid`;
- `machine_gate_failed`.

Allowed `reason_kind` values for `admission_rejected`:
- `identity_invalid`;
- `lineage_invalid`;
- `ref_drift`;
- `forbidden_authority_payload`;
- `side_effect_guard_missing`;
- `status_invalid`.

Candidate-level routing codes SHOULD stay small and payload-local:
- `missing_locator`;
- `missing_citation`;
- `stale_or_unreviewed`;
- `duplicate_existing`;
- `memo_like_evidence`;
- `scope_or_trace_gap`;
- `downstream_review_required`.

Specific fields, refs, modes, and schema paths belong in machine-readable `details`, not new issue-code enums. Admission MUST NOT create semantic blocker codes, upgrade gaps to bindings, downgrade bindings to gaps, or judge whether evidence truly supports an assertion.

Implementation mapping MUST keep the generic runtime/admission envelopes unchanged:
- do not add `terminal_code`, `reason_kind`, or `details` to `PaperImplementationRuntimeArtifactEnvelope` or `PaperImplementationRuntimeAdmissionRecord`;
- put the simplified control object in the evidence-board curation role/final artifact payload only, for example `runtime_control: { terminal_code, reason_kind, details }`;
- map `preflight_blocked` and `runtime_retry_exhausted` to generic `runtime_status=failed_runtime` role artifacts with coarse `runtime_failure_code` values such as `EVIDENCE_BOARD_CURATION_PREFLIGHT_BLOCKED` or `EVIDENCE_BOARD_CURATION_RUNTIME_RETRY_EXHAUSTED`;
- keep `admitted_blocked` as generic `runtime_status=blocked`, `runtime_failure_code=null`, non-empty payload-local blocker/routing codes, and an admitted final artifact;
- keep generic admission `issue_codes` produced by `PaperImplementationRuntimeAdmissionService` as machine identity/schema/replay failures. Do not replace that shared admission schema in this slice.

The role and final artifacts MUST reject or omit authority-looking fields:
- `motive_evidence_board_version_id`;
- `board_draft`;
- `board_summary`;
- `board_state`;
- `bindings`;
- `create_motive_evidence_board_version_request`;
- `evidence_binding_id`;
- `create_evidence_binding_request`;
- `update_existing_binding_proposals`;
- `remove_binding_proposals`;
- `board_summary_patch`;
- `board_state_patch`;
- `evidence_transfer_binding_request`;
- `citation_candidate_request`;
- `trace_repair_queue_item`;
- `domain_gate_request`;
- `queue_action`.

Final artifacts MUST include side-effect guards:
- `no_domain_gate_request`;
- `no_queue_side_effect`;
- `no_board_write_side_effect`;
- `no_evidence_binding_side_effect`;
- `no_evidence_transfer_binding_side_effect`;
- `no_citation_candidate_side_effect`;
- `no_trace_repair_queue_side_effect`.

### Admission And Evidence
Admission MUST verify target board/motive/assertion refs, source hashes, trace refs and trace hashes, source locator refs, citation candidate refs, evidence refs, existing binding refs, freshness policy, prompt/profile/model-option identity, output hash, challenge-check completeness, forbidden fields, side-effect guards, replay/idempotency, and source drift.

Admission MUST NOT decide whether evidence semantically proves an assertion, rewrite binding candidates, upgrade gap candidates to binding candidates, synthesize missing source locators, create citation candidates, create evidence bindings, create board versions, create transfer bindings, create queue items, or materialize Domain Gate state.

Minimum L5 cases for this node:
- missing source locator refs block before provider or retry-exhaust with no final artifact;
- memo-like evidence refs are rejected before provider calls;
- provider failure retries at most once and ends with no final artifact;
- over-budget context blocks with zero provider calls;
- viable binding candidate without source locator refs retry-exhausts with no final artifact;
- duplicate existing binding emitted as a new viable binding candidate retry-exhausts with no final artifact in `curate_existing_board`;
- stale or unreviewed citation emitted as viable binding retry-exhausts with no final artifact;
- invented assertion, evidence, source locator, citation candidate, trace, or existing binding refs retry-exhaust with no final artifact;
- missing candidate challenge check retry-exhausts with no final artifact;
- board/evidence-binding/transfer/citation/trace-repair/queue/Domain Gate mutation fields are rejected;
- harness proposal artifacts cannot masquerade as runtime final artifacts.

### Test Matrix Decision
The evidence-board curation slice should use the smallest machine-verifiable test set that closes runtime/admission/domain boundaries.

L1 shared schema MUST cover request, role output, final artifact, binding candidate, gap candidate, challenge check, forbidden payload negatives, and side-effect guards.

L2 runtime service tests MUST cover happy path, blocked-only gap output, zero-call preflight, provider/schema retry exhaustion, missing challenge check, ref drift, memo-like evidence rejection, stale/unreviewed viable binding rejection, forbidden domain-writer fields, and no direct board/binding/transfer/citation/queue/Domain Gate writes.

L3 route integration SHOULD stay narrow: route happy path uses production runtime/admission, product non-provider mode is rejected, model-option drift is rejected, request-owned ref drift is rejected, and route does not materialize Domain Gate or domain writes.

Registry/profile tests MUST cover provider-only product eligibility and profile-owned model options.

L5 stress required cases SHOULD be limited to:
1. over-budget context blocks with zero provider calls;
2. provider failure retries once and creates no final artifact;
3. missing challenge check retries once and creates no final artifact;
4. viable binding without source locator retries once and creates no final artifact;
5. duplicate existing binding in `curate_existing_board` retries once and creates no final artifact;
6. invented request-owned refs retry once and creates no final artifact;
7. memo-as-evidence payload is rejected before provider calls.

No-dual-track scans MUST stay small and machine-enforceable:
- service scan: runtime service MUST NOT use `AgentWorkflowHarnessRun`, `PaperImplementationProposalArtifact`, or `implementation_proposal_artifact` as primary input; MUST NOT import or depend on `PaperImplementationMotiveEvidenceBoardService`, `PaperImplementationTraceKernelService`, motive repositories, or trace repositories; and MUST NOT call `createMotiveEvidenceBoardVersion`, `createEvidenceTransferBinding`, `createCitationCandidate`, trace repair queue writers, decision queue writers, or Domain Gate materializers;
- contract scan: request and final artifact schemas MUST reject harness/proposal refs as authority, domain-writer payloads, board-shaped fields, binding writer fields, transfer/citation writer fields, queue payloads, and Domain Gate payloads;
- route scan: only the controlled `evidence_board_curation.binding_gap_candidates` runtime route may execute this slot; there MUST NOT be a generic runtime-envelope write route, harness wrapper route, board-writer route, or Domain Gate route for this first slice;
- whitelist scan: forbidden input/output fields may appear only in shared schema negative fixtures, service negative fixtures, route negative fixtures, L5 negative fixtures, or documentation.

Do not add a Prisma smoke by default unless this slice changes the DB schema. Do not make live provider canaries default; keep provider canary hooks opt-in.

## Motive Decomposition Node Alignment

Slot identity: `motive_decomposition.draft_assertion_candidates`.

Role identity: `motive_decomposition.draft_assertion_candidate_designer`.

The node's purpose is to propose draft assertion decomposition candidates for an existing `CoreMotiveVersion` / `MotiveAssertion` context. It exists to make over-broad, compound, or boundary-unclear motive assertions easier to review downstream. It MUST NOT create or admit `CoreMotiveVersion`, `MotiveAssertion`, `MotiveEvolutionDecision`, motive portfolio state, board state, evidence bindings, trace repair queue items, decision queue items, or Domain Gate payloads.

### Profile Resolution Block

The first slice MUST use the existing promoted PaperImplementation runtime profile registry path. Do not add a node-local model-selection mechanism.

```yaml
slot: motive_decomposition.draft_assertion_candidates
role: motive_decomposition.draft_assertion_candidate_designer
profile_id: paper-implementation.motive-decomposition.draft-assertion-candidates.v1
prompt_template_id: paper-implementation-motive-decomposition-draft-assertion-candidates
prompt_template_version: v1
default_output_budget: large
profile_intent:
  creativity: low
  reasoning: high
  output_shape: structured
product_mode:
  execution_mode: provider_llm_only
model_option_resolution:
  mode: explicit_or_default_profile_option
  explicit_model_option_must_belong_to_profile: true
  model_option_id_requires_execution_mode_provider_llm: true
```

Product-mode eligibility MUST use `PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY`: `provider_llm` is eligible for product, while `mocked_llm` and `codex_assisted` are not product execution modes for this slot. Test and acceptance fixtures may still exercise non-provider modes through the registry policy, but they MUST NOT become product fallbacks.

Runtime MAY accept an explicit `model_option_id` only when `execution_mode=provider_llm`. If omitted in provider mode, runtime resolves the default model option from the profile. Any explicit model option outside `paper-implementation.motive-decomposition.draft-assertion-candidates.v1` MUST fail before provider invocation.

Role/final runtime artifacts MUST record the resolved identity needed for replay and admission:
- `model_profile_id`;
- `model_option_id` when `execution_mode=provider_llm`;
- `prompt_template_id`;
- `prompt_template_version_id`;
- `context_policy_profile_hash`;
- `cache_policy_profile_hash`;
- `compression_policy_profile_hash`.

Cache/admission identity MUST bind the resolved profile id, resolved model option id when provider-backed, prompt template id/version, output schema version, target assertion refs, assertion/source packet hashes, source hashes, and compression identity.

Runtime MUST reject request-side prompt text overrides, raw model parameter overrides, provider id overrides, prompt template overrides, and request-supplied cache/compression hashes. The registry owns model option details. Admission verifies identity and drift; it MUST NOT judge whether selected model parameters are semantically appropriate.

Harness may call the real runtime route with fixtures, but harness MUST NOT compile prompts, select model options, override raw model params, compute runtime cache/compression identity, or emit production runtime artifacts for this slot.

### Semantic Boundary

This node requires controlled semantic processing because assertion decomposition cannot be reduced to structural ref validation. Runtime MAY identify that an assertion has multiple support obligations, propose smaller draft assertion candidates, bind each candidate to request-owned evidence/source/trace refs, and mark evidence gaps, trace drift, scope drift, or human-confirmation needs.

Runtime MUST NOT make authority-level semantic decisions:
- it MUST NOT decide that a draft assertion is admitted or proven;
- it MUST NOT rewrite the current motive/version/assertion state;
- it MUST NOT upgrade a candidate into a persisted assertion;
- it MUST NOT infer missing evidence from summaries, harness output, or LLM rationale;
- it MUST NOT materialize motive evolution, board, trace, queue, or Domain Gate state.

Admission remains non-semantic. It may validate schemas, request-owned refs, hashes, side-effect guards, replay/idempotency, forbidden authority fields, model/profile identity, and drift. It MUST NOT judge whether a proposed decomposition is scientifically correct, whether evidence proves a new assertion, or whether the motive should change.

### Input Contract / Context Authority Decision

The first slice MUST support only `decompose_existing_assertions`. It targets existing request-owned `MotiveAssertion` refs under an admitted `CoreMotiveVersion`. It MUST NOT support whole-motive free exploration, missing-assertion discovery, motive rewrite, assertion creation, portfolio decisions, or motive evolution decisions in this slice.

`target_assertion_refs` MUST be non-empty. A request without explicit assertion refs is too broad for the first slice and risks turning the runtime into an unbounded motive reader.

Primary request authority MUST include:
- `target_ref`: a `core_motive_version` ref;
- `target_motive_ref`;
- `target_core_motive_version_ref`;
- `target_assertion_refs`;
- `input_snapshot_ref`;
- `input_snapshot_hash`;
- `trace_manifest_refs`;
- `trace_manifest_hashes`;
- `evidence_refs`;
- `source_refs`;
- `source_hashes`;
- `source_locator_refs`;
- `citation_candidate_refs`;
- `accepted_risk_refs` when present;
- upstream blocker/review refs when they are admitted, request-owned, and ref-backed.

Provider-visible assertion text is allowed only through bounded `assertion_context_packets`. These packets are provider-review material, not authority. Each packet MUST include:
- `packet_ref`;
- `packet_hash`;
- `assertion_ref`;
- `assertion_hash`;
- `assertion_text`;
- `scope_boundary_summary`;
- `covered_evidence_refs`;
- `covered_trace_manifest_refs`;
- `covered_source_refs`.

Preflight MUST reject:
- `assertion_context_packets` whose `assertion_ref` is outside `target_assertion_refs`;
- `assertion_context_packets` whose `assertion_hash` does not match request-owned assertion authority;
- covered refs outside request-owned evidence, trace, or source ref sets;
- any assertion text outside bounded assertion context packets;
- harness output, memo-like summaries, LLM rationales, board summaries, or free-form motive notes as authority.

The correct boundary is not "no text". The boundary is "no unbound text". Runtime may pass ref/hash-bound assertion text to the provider so the provider can propose decomposition candidates, but refs and hashes remain the only machine authority.

### Context / Cache / Compression Identity Decision

Identity is a machine replay/cache/admission boundary, not a human audit layer. This node needs identity only to prove that a runtime output still belongs to the same slot, profile, prompt, schema, input refs, hashes, and compression policy that produced it.

Runtime identity MUST bind:
- slot and role identity;
- `execution_mode`;
- resolved `model_profile_id`;
- resolved provider `model_option_id` when `execution_mode=provider_llm`;
- prompt template id/version;
- role output schema version and final artifact schema version;
- `target_motive_ref`;
- `target_core_motive_version_ref`;
- canonicalized `target_assertion_refs`;
- `input_snapshot_ref` and `input_snapshot_hash`;
- assertion packet refs/hashes and assertion refs/hashes;
- packet-covered evidence, trace, and source refs;
- evidence refs, source refs/hashes, source locator refs, citation candidate refs, and trace manifest refs/hashes;
- accepted-risk refs and admitted upstream blocker/review artifact refs when present;
- context policy hash, cache policy hash, and compression policy hash;
- compressed context packet hash when a compressed packet is materialized.

Changing any slot/profile/prompt/model-option/schema/input/hash/compression identity field MUST cause a cache miss or a new runtime execution. It MUST NOT silently reuse an older final artifact.

Runtime preflight/admission MUST reject:
- cache hits or runtime artifacts missing required identity fields;
- target assertion refs that do not match the request;
- assertion packet refs/hashes that do not match request-owned assertion authority;
- packet-covered refs outside request-owned evidence/trace/source sets;
- source hash, trace hash, input snapshot hash, or compression identity drift;
- prompt/profile/model option identity drift;
- request-supplied cache or compression hashes;
- production artifacts whose primary identity depends on harness run ids, cached prior outputs, mock/Codex execution, LLM rationale, memo text, board summaries, or unbound assertion text.

Compression MUST preserve all identity-bearing refs and hashes above, plus blocker-critical evidence such as evidence gaps, trace drift refs, accepted-risk refs, and human-confirmation markers. Compression MAY summarize assertion text for provider review only when the summary remains tied to `packet_ref`, `packet_hash`, `assertion_ref`, and `assertion_hash`.

Do not add raw model parameter snapshots, provider reasoning hashes, human-readable audit summary hashes, per-candidate identity graphs, or harness run identity to the first-slice identity model. Registry-owned model options and runtime artifact identity are enough for this node.

### Implementation Boundary / Service Control Decision

The first slice SHOULD use a dedicated single-slot service: `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)`.

The service owns slot execution orchestration, but owns no motive/assertion/domain state transition authority. It MAY control:
- structural preflight and request-owned ref/hash validation;
- profile, prompt, and model-option resolution through the registry;
- context packet assembly, cache identity, compression identity, and token budget gating;
- one provider role invocation through the shared orchestrator/provider gateway;
- max-one same-profile technical retry;
- role output machine gate and final artifact assembly;
- runtime artifact recording and runtime admission calls;
- return status mapping to `passed`, `blocked`, or `failed_runtime`.

The service MUST NOT control:
- `CoreMotiveVersion` or `MotiveAssertion` creation/update;
- motive evolution decision creation;
- board/evidence binding or trace repair creation;
- decision queue creation;
- Domain Gate materialization;
- prompt/model selection outside the registry;
- semantic repair of provider output.

The route/controller owns only the single production entrypoint and request dispatch. It MUST NOT compile prompts, select models, compute cache/compression identity, repair provider output, judge decomposition correctness, or materialize domain state.

Admission owns verification only. It validates schema, refs/hashes, identity, no-side-effect guards, replay, idempotency, and drift. It does not invoke providers, control retry, rewrite candidates, or decide scientific correctness.

Domain services own mutation only. Any accepted runtime candidate must flow through a later human/domain gate that consumes `runtime_artifact_ref + candidate_key` and then calls deterministic motive services if mutation is approved.

Harness owns validation only. It may construct fixtures and call the real route/service path, but it MUST NOT compile prompts, choose model options, calculate production identity, create runtime artifacts directly, or stand in for provider execution in product.

### Output Schema Decision

Do not add `source_assertion_reviews[]`. It is an audit-shaped object and the user-facing explanation is not needed for this node. The machine need is coverage, not review prose.

Role output MUST instead use top-level machine coverage:
- `decomposition_result_status`;
- `reviewed_assertion_refs`;
- `draft_assertion_candidates`;
- `blocker_codes`;
- `warning_codes`;
- no-side-effect guards.

`reviewed_assertion_refs` MUST cover `target_assertion_refs`. If an assertion has no candidate, the machine meaning is simply that the provider covered the assertion and emitted no draft candidate. Runtime does not need a per-assertion review summary or candidate-key index to explain the absence.

`decomposition_result_status` is a minimal machine status, not an audit layer. It exists only to disambiguate an empty `draft_assertion_candidates[]` result:
- `candidates_proposed`: at least one draft assertion candidate was emitted;
- `no_decomposition_needed`: all target assertions were reviewed and no candidate is needed;
- `blocked`: candidate generation or direct decomposition is blocked by machine-consumable blocker codes.

Each `draft_assertion_candidate` MUST include:
- `candidate_key`;
- `source_assertion_ref`;
- `candidate_kind`;
- `draft_assertion_text`;
- `scope_boundary_summary`;
- `support_obligation_summary`;
- `covered_evidence_refs`;
- `covered_source_refs`;
- `covered_source_locator_refs`;
- `covered_citation_candidate_refs`;
- `covered_trace_manifest_refs`;
- `decomposition_check`;
- `blocker_codes`;
- `warning_codes`;
- `recommended_next_gate`.

The first-slice `candidate_kind` enum SHOULD stay small:
- `split_child`;
- `scope_clarification`;
- `support_obligation`.

Do not add `merge_like`, `rewrite`, `new_claim`, or `blocked_candidate` candidate kinds in the first slice. Merge/rewrite/new-claim risks belong in `decomposition_check`, blocker codes, and `recommended_next_gate`, not in a candidate kind that implies motive evolution authority.

Output MUST NOT contain:
- `assertion_id`;
- `candidate_assertion_ref`;
- `CreateMotiveAssertionInput`;
- `assertion_type`;
- `importance`;
- `validation_requirements`;
- `falsification`;
- `CoreMotiveVersion` patches;
- `motive_evolution_decision_request`;
- `domain_gate_request`;
- `queue_action`.

This keeps downstream consumption explicit: later human/domain gates may consume the admitted runtime artifact ref plus `candidate_key`, then call motive domain services if a candidate is accepted. Runtime never fabricates a persisted `motive_assertion` ref.

### Controlled Challenge Decision

The first slice MUST NOT implement a full debate. Do not add proposer/skeptic/arbiter roles, multi-round transcripts, a shared debate execution helper, or semantic reconciliation logic.

The first slice SHOULD use a single-role controlled decomposition challenge. Each `draft_assertion_candidate` MUST include a structured `decomposition_check` that challenges the candidate locally:
- `compoundness_status`: whether the source assertion appears to be one obligation, multiple obligations, or unclear;
- `scope_change_status`: whether the candidate is a clarification, split, merge-like change, or new-claim risk;
- `evidence_coverage_status`: whether request-owned evidence refs cover the candidate fully, partially, or not at all;
- `trace_alignment_status`: whether request-owned trace/source refs align, partially align, or drift;
- `new_claim_risk`: whether the candidate appears to add a claim not present in the source motive/assertion context;
- `human_confirmation_required`: whether the candidate needs human/domain confirmation before any motive mutation;
- `blocking_reason_codes`;
- `recommended_next_gate`.

The controlled challenge is part of the same role output. It is not a second role, not a final arbiter, and not a runtime permission to mutate motive state.

### Controlled Runtime Flow

The first slice SHOULD keep the flow to four scheduling steps:
1. Preflight validates motive/version/assertion/evidence/source/trace refs and rejects harness, memo-like, board-writer, motive-writer, queue, and Domain Gate authority payloads.
2. Candidate generation invokes one provider role to produce draft assertion candidates.
3. Controlled challenge requires a `decomposition_check` for every candidate in the same structured output.
4. Machine gate plus admission verifies schema, refs/hashes, coverage declarations, side-effect guards, forbidden fields, replay, and drift; it does not decide semantic correctness.

### Result Status / Retry / Fallback Decision

The first slice MUST use `decomposition_result_status` as the only top-level result-state enum. Runtime gate MUST enforce:
- `reviewed_assertion_refs` covers all `target_assertion_refs`;
- `candidates_proposed` requires `draft_assertion_candidates.length > 0`;
- `no_decomposition_needed` requires `draft_assertion_candidates.length === 0` and `blocker_codes.length === 0`;
- `blocked` requires `blocker_codes.length > 0`; candidates MAY be empty.

`candidates_proposed` MAY still carry blocker or warning codes when some proposed candidates require downstream review. The status means candidates exist; it does not mean candidates are admitted, proven, or materializable.

Provider failures, schema-invalid outputs, coverage failures, forbidden authority fields, side-effect guard failures, ref/hash drift, and missing required `decomposition_check` fields are technical or machine-boundary failures. Runtime MAY retry them once with the same profile. If they still fail, runtime records `failed_runtime`, final admission is rejected, and no final artifact is emitted.

Semantic blockers are not retry targets. `new_claim_risk`, trace drift, missing evidence coverage, scope drift, human-confirmation requirements, and `no_decomposition_needed` outcomes should be represented as `decomposition_result_status`, blocker codes, and gate recommendations. Runtime MUST NOT semantically retry to force candidates through, and admission MUST NOT rewrite or reinterpret the semantic result.

Product mode has no fallback to mock, Codex, generic harness, cached prior output, or deterministic domain writer output. The only allowed retry is the max-one same-profile technical retry above.

Do not add per-assertion status, no-op candidates, reason objects, `source_assertion_reviews[]`, retry reason taxonomies, semantic severity ladders, candidate graphs, or multiple status fields per candidate in the first slice.

### Machine Gate / Admission Robustness Decision

Robustness depends on keeping draft assertion candidates out of the existing persisted assertion consumption chain. Runtime output remains proposal data inside an admitted runtime artifact. Only a later human/domain gate may turn an admitted runtime artifact ref plus `candidate_key` into a real motive/assertion mutation through the deterministic motive services.

Runtime machine gate MAY enforce candidate-level semantic-boundary rules because those rules are needed to keep the provider output schedulable:
- `decomposition_result_status` must satisfy the result-status invariants above;
- `reviewed_assertion_refs` must cover all `target_assertion_refs`;
- every `source_assertion_ref` must be request-owned;
- every covered evidence/source/source-locator/citation/trace ref must be request-owned;
- every `draft_assertion_candidate` must include a complete `decomposition_check`;
- `candidate_kind` must stay within the first-slice enum;
- `new_claim_risk=true` must require `human_confirmation_required=true` and a next gate of `motive_evolution_review` or `human_confirmation`;
- candidates with trace drift or missing evidence coverage must carry blockers and must not look directly materializable;
- output must not include persisted assertion ids/refs, motive write payloads, Domain Gate payloads, or queue actions.

Admission MUST remain non-semantic and structural:
- validate schema and runtime artifact identity;
- validate request-owned refs and hashes;
- validate `reviewed_assertion_refs` coverage;
- validate assertion packet coverage and packet hashes;
- validate no-side-effect guards and forbidden authority fields;
- validate replay, idempotency, and drift.

Admission MUST NOT decide whether the decomposition is scientifically correct, whether a draft assertion is proven, whether evidence is sufficient to admit a new assertion, or whether the motive should be changed. It MUST NOT rewrite candidates, upgrade candidates into persisted assertions, synthesize missing refs, infer evidence from text, or materialize motive/domain/queue/Domain Gate state.

### Test Matrix / Implementation Readiness Decision

The first implementation slice MUST close L1-L5 evidence plus no-dual-track scans before promotion. This is not an audit test suite; it is the minimum machine evidence that runtime can be scheduled, fail closed, preserve identity, and avoid domain mutation.

L1 shared schema tests MUST cover:
- request mode limited to `decompose_existing_assertions`;
- non-empty `target_assertion_refs`;
- `assertion_context_packets` require `packet_ref`, `packet_hash`, `assertion_ref`, and `assertion_hash`;
- role output requires `decomposition_result_status`;
- three-state `decomposition_result_status` invariants;
- each draft candidate requires `decomposition_check`;
- candidate kind enum limited to `split_child`, `scope_clarification`, and `support_obligation`;
- final artifact is proposal-only;
- rejection of `source_assertion_reviews[]`;
- rejection of `CreateMotiveAssertionInput`, persisted assertion refs, Domain Gate payloads, queue actions, motive evolution payloads, and other writer-shaped fields.

L2 runtime service unit tests MUST cover:
- happy path creates admitted proposal-only draft candidates with no domain writes;
- `no_decomposition_needed` with zero candidates and zero blockers is structurally valid;
- `blocked` with non-empty blockers and optional zero candidates is structurally valid and does not trigger semantic retry;
- preflight zero-provider-call blockers for empty target refs, packet hash drift, packet refs outside target assertions, packet-covered refs outside request-owned sets, unbound text, harness/memo authority, and over-budget context;
- provider failure retries once with the same profile, then fails closed with no final artifact;
- schema or machine-boundary failures retry once, then fail closed with no final artifact;
- missing `decomposition_check`, missing reviewed assertion coverage, invalid result-status invariant, forbidden writer fields, and candidate refs outside request-owned sets fail closed;
- semantic blockers such as trace drift, evidence gap, human-confirmation requirement, and no-decomposition-needed outcomes do not trigger semantic retry;
- `new_claim_risk=true` requires `human_confirmation_required=true` and a next gate of `motive_evolution_review` or `human_confirmation`;
- product-mode non-provider execution is rejected;
- explicit `model_option_id` must belong to the motive-decomposition profile;
- profile, prompt, model-option, cache, and compression identity drift is rejected;
- no calls create motive/assertion, board/evidence, trace repair, queue, or Domain Gate side effects.

L3 route integration tests SHOULD stay narrow:
- one happy-path production route call uses the real controller/service/admission path;
- ref drift, provider fixture payloads, product non-provider execution, and authority/writer-shaped request payloads are rejected;
- response shape does not expose prompt text, raw provider output, or domain writer payloads;
- only one slot-specific runtime route exists for this node, with no generic harness wrapper route.

Profile and registry tests MUST cover:
- model profile registration for `paper-implementation.motive-decomposition.draft-assertion-candidates.v1`;
- prompt template registration for `paper-implementation-motive-decomposition-draft-assertion-candidates@v1`;
- product-mode provider-only eligibility through `PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY`;
- explicit model option ownership by the slot profile;
- LLM registry validation.

Minimum L5 required stress cases SHOULD be limited to:
1. over-budget assertion/source context blocks before provider calls;
2. provider failure retry exhaustion creates no final artifact and no domain/queue/Domain Gate payload;
3. missing `decomposition_check` retries once and creates no final artifact;
4. invalid `decomposition_result_status` invariant retries once and creates no final artifact;
5. missing `reviewed_assertion_refs` coverage retries once and creates no final artifact;
6. candidate refs outside request-owned sets retry once and create no final artifact;
7. `new_claim_risk=true` without human-confirmation gate fails closed with no final artifact;
8. memo, harness, or unbound-text authority blocks before provider calls.

No-dual-track scans MUST prove:
- the runtime service does not import or call motive domain writers, board/evidence writers, trace repair writers, queue writers, or Domain Gate materializers;
- the runtime service does not bypass the shared orchestrator/provider gateway with direct provider-wrapper calls;
- the route layer exposes exactly one slot-specific runtime route and no generic harness wrapper route;
- forbidden writer fields appear only in schema negative fixtures, service/route/L5 negative fixtures, or documentation;
- harness artifacts cannot satisfy primary runtime inputs.

Implementation readiness requires all planned L1-L5 tests, registry validation, no-dual-track scans, backend typecheck, runtime stress runner, scoped `git diff --check`, and project governance sync/lint to pass. Prisma smoke and live provider canaries remain opt-in unless this slice later changes persistence or live-provider release policy.

### 2026-06-09 Implementation Status

Completed for `motive_decomposition.draft_assertion_candidates`:
- shared runtime contracts and L1 schema tests;
- model profile YAML entry `paper-implementation.motive-decomposition.draft-assertion-candidates.v1`;
- prompt template YAML entry `paper-implementation-motive-decomposition-draft-assertion-candidates@v1`;
- backend default model-profile registry mirror with low creativity, high reasoning, large output budget, and `PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY`;
- shared context family `paper_implementation_motive_decomposition`;
- registry tests for provider-only product eligibility, profile-owned explicit model options, profile resolution, and context family availability;
- `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)`;
- L2 service tests covering happy path, no-decomposition-needed, admitted semantic blockers, zero-call preflight, same-profile retry exhaustion, schema/machine-boundary failures, new-claim/human-confirmation gating, product provider-only rejection, model-option ownership, harness primary-ref rejection, forbidden authority fields, no-side-effect guards, and absence of domain writes;
- controlled runtime route/controller/app wiring through the slot-specific production route;
- L3 route tests covering happy path, ref drift fail-closed retry, provider fixture rejection, authority payload rejection, model-option drift rejection, response-shape/no-side-effect guards, and Domain Gate materialization rejection;
- eight L5 required stress cases covering over-budget zero-call, provider retry exhaustion, schema/machine-boundary retry exhaustion, reviewed assertion coverage, request-owned candidate refs, new-claim human-confirmation gating, memo-like authority preflight, and no final/domain-writer payload leakage;
- unified runtime-stress required-case parsing, including motive-decomposition TAP subtest coverage and the motive L2 service regression file;
- scoped backend typecheck, route/controller/app scan, direct service writer scan, forbidden-field review scan, full diff check, runtime stress summary, and project governance sync/lint.

Promotion closure:
- `motive_decomposition.draft_assertion_candidates` is promoted as a proposal-only runtime slot.
- Runtime/admission remain non-mutating; deterministic/human gates own any later `MotiveAssertion`, `CoreMotiveVersion`, board/evidence, trace repair, queue, or Domain Gate transition.
- Harness remains validation-only and cannot satisfy product runtime/provider execution or primary runtime identity.

### Debate Deferral

Full debate remains deferred until a later high-impact motive evolution or portfolio-changing slice needs it. If a candidate implies motive split/merge, supersession, portfolio role changes, or human-confirmation-required semantic change, this node should emit blocker/gate recommendations only and route the decision to `motive_evolution_review` or `human_confirmation`.

### Motive Evolution Role / Semantic / Debate Alignment

`motive_evolution.evolution_decision_support` is a high-authority decision-support runtime slot, not a domain writer.

The slot MAY perform bounded semantic processing because its value is to compare motive/version, evidence, trace, portfolio, and prior-decision pressure. That semantic processing MUST stop at decision-support fields:
- `decision_option_kind`: `keep_current`, `repair_evidence_board_first`, `supersede`, `merge`, `split`, `park`, or `abandon`;
- source, evidence, trace, board, validation-cycle, result, cross-board-review, and prior-decision refs used for support or challenge;
- portfolio impact class, downstream validation impact, human-confirmation requirement, blocker/warning codes, and recommended next gate.

The slot MUST NOT create or apply `MotiveEvolutionDecision`, `MotivePortfolioDecision`, `CoreMotiveVersion`, `MotiveAssertion`, evidence-board, trace-repair, queue, or Domain Gate state. It MUST NOT emit writer-shaped payloads such as `CreateMotiveEvolutionDecisionRequest`, `ApplyMotivePortfolioDecisionRequest`, `motive_roles_after_decision`, `change_set`, `core_motive_version_patch`, `application_status=approved|applied`, or any direct domain mutation request.

Controlled debate is required for this slot, but it is fixed and bounded:
1. `motive_evolution.evolution_option_designer` proposes a small set of ref-backed options.
2. `motive_evolution.evolution_risk_challenger` challenges every option across evidence, trace, portfolio, human-confirmation, and downstream impact dimensions.
3. A deterministic runtime machine gate derives the final support packet from covered options only.

No LLM arbiter, open-ended transcript, or shared debate execution helper is allowed in the first slice. Any option that lacks challenger coverage, uses refs outside the request-owned context, or implies semantic/portfolio mutation without a human/domain gate MUST be blocked rather than repaired semantically by runtime or admission.

Responsibility split:
- runtime owns preflight, profile/prompt/model-option resolution, context/cache/compression identity, provider role orchestration, same-profile technical retry, machine gating, final support-packet assembly, and admission calls;
- admission verifies schema, refs/hashes, identity, role lineage, challenge coverage, no-side-effect guards, replay, and drift only;
- deterministic T-094 services plus human/domain gate own all motive evolution and portfolio mutation;
- harness may call the production route for validation but cannot compile prompts, select models, emit runtime artifacts, or stand in for product provider execution.

### Motive Evolution Output Schema / Admission Alignment

Keep the first-slice output schema intentionally small. The final artifact is an `evolution_decision_support_packet` with three nested layers only:

1. Top-level support packet:
   - `support_result_status`: `options_proposed`, `no_evolution_needed`, or `blocked`;
   - target motive refs and target core motive version refs;
   - `decision_options` keyed by option key;
   - top-level blocker/warning codes;
   - no-side-effect guards.
2. `decision_options` map values:
   - option identity comes from the map key;
   - `option_kind`: `keep_current`, `repair_evidence_board_first`, `supersede`, `merge`, `split`, `park`, or `abandon`;
   - supporting refs, challenging refs, portfolio impact class, human-confirmation flag, recommended next gate, blocker/warning codes, and `challenge_check`.
3. `challenge_check`:
   - evidence status, trace status, portfolio status, human-confirmation status, downstream-impact status, and blocking reason codes.

Do not add audit transcripts, source-by-source prose reviews, candidate writer DTO fragments, or convenience payloads for downstream domain writers. Human-readable summaries MAY exist as short diagnostics only and MUST NOT be admission authority.

Admission is a machine-boundary verifier only. It MUST verify request-owned refs/hashes, role lineage, option key uniqueness, every option's complete `challenge_check`, portfolio-impact and human-confirmation invariants, recommended-gate consistency, required no-side-effect guards, forbidden writer fields, replay, idempotency, and drift. It MUST NOT rank options, choose the best option, repair missing challenge fields, infer missing refs from summaries, create queue items, or materialize Domain Gate/domain state.

The first slice has no Domain Gate materialization. A later human/domain gate MAY consume `runtime_artifact_ref + option_key` after admission, but the runtime artifact itself is not a `MotiveEvolutionDecision`, portfolio decision, or mutation request.

### Motive Evolution Context / Cache / Compression Alignment

This node should carry necessary complexity because high-quality evolution support depends on the full motive, portfolio, evidence, trace, and prior-decision frame. Complexity is acceptable only when it improves decision quality, runtime robustness, or authority-boundary safety. It MUST NOT be added for audit prose, convenience writer payloads, or human-facing narrative.

Required core context:
- target motive refs;
- target core motive version refs plus version/state hashes;
- portfolio snapshot ref/hash, including motive roles, role limits, active/primary set, and latest portfolio decision ref when present;
- evidence board refs, evidence binding refs, challenge/conflict refs, and related hashes;
- trace manifest refs/hashes;
- human-confirmation policy ref;
- source hash bundle.

Optional trigger context MAY include validation cycle refs, result packet refs, cross-board review refs, prior evolution decision refs, prior portfolio decision refs, accepted-risk refs, and human request refs. Optional triggers are not required for every run, but every supplied trigger MUST be request-owned and ref/hash-bound. Unbound summaries, harness artifacts, proposal artifacts, cached prior outputs, and writer DTOs cannot become primary context or production identity.

Provider-readable `motive_context_packets[]` MAY be used to expose concise text to provider roles. Each packet MUST include `packet_ref`, `packet_hash`, `packet_kind`, covered target refs, covered evidence/trace refs where applicable, and source hash lineage. These packets are prompt material only; they do not replace authority refs/hashes.

Cache identity MUST include slot id, role slot id, profile id, model option id, prompt template/version, output schema id, input snapshot hash, required core refs/hashes, supplied optional trigger refs/hashes, context packet refs/hashes, compression policy id, and compression result hash. The challenger role cache key MUST also include the designer role artifact ref/hash and option-set hash, so a challenge cannot be reused across different option sets.

Compression MAY shorten provider-readable text, but MUST preserve all refs/hashes, negative and challenging evidence markers, trace blockers, portfolio impact markers, human-confirmation requirements, accepted-risk refs, option keys, and prior-decision refs. If compression loses authority fields, changes hashes, omits required blockers, or cannot prove packet coverage, runtime MUST fail closed before provider invocation.

### Motive Evolution L1-L5 / No-Dual-Track Matrix

The test matrix covers runtime quality and authority safety only. It MUST NOT add audit-only coverage.

L1 shared schema:
- support packet three-layer structure;
- required core context and optional trigger ref/hash rules;
- `motive_context_packets[]` packet ref/hash/coverage rules;
- unique option keys and complete `challenge_check` for every option;
- portfolio-impact and human-confirmation invariants;
- forbidden writer fields, Domain Gate payloads, queue payloads, raw prompt/provider payloads, harness/proposal identity fields, and cached prior outputs.

L2 runtime service:
- missing required core context fails before provider calls;
- harness/proposal/unbound summary/cached-output primary context is rejected;
- product mode requires provider execution and profile-owned model options;
- designer role output must produce a bounded option set;
- challenger role output must cover every option from the designer role artifact;
- challenger cache identity must bind designer artifact ref/hash plus option-set hash;
- compression loss, packet coverage drift, authority hash drift, and cache identity drift fail closed;
- portfolio-changing or semantic-changing options without human-confirmation gate fail closed;
- provider/schema/machine-boundary failures use at most one same-profile technical retry and emit no final support packet after exhaustion.

L3 route/controller/app:
- expose exactly one slot-specific production runtime route;
- controller forwards only and does not compile prompts, choose models, repair outputs, admit artifacts directly, or mutate domain state;
- provider fixtures are rejected in provider/product mode;
- response contains no `MotiveEvolutionDecision`, portfolio request, queue payload, Domain Gate payload, or writer-shaped convenience field;
- blocked and failed runtime artifacts do not trigger Domain Gate, queue, motive, portfolio, board, or trace writes.

L4 provider canary:
- add an opt-in live provider canary after the route exists;
- prove the live provider path uses the same route/service/orchestrator/admission chain as deterministic tests;
- keep it outside default CI and outside deterministic runtime-stress closure.

L5 stress:
- over-budget or compression-loss input makes zero provider calls;
- provider failure retry exhaustion creates no final support packet;
- missing challenger coverage creates no final support packet;
- cache identity drift prevents response reuse;
- writer DTOs and state-mutation payloads are rejected;
- portfolio-changing option without human-confirmation gate is rejected;
- harness/proposal/cached prior output cannot become runtime identity;
- failed or blocked artifacts cannot materialize Domain Gate, queue, motive, portfolio, board, trace, or evidence state.

No-dual-track scans MUST prove:
- no harness production entrypoint;
- no direct provider wrapper bypass;
- no motive, portfolio, board, evidence, trace, queue, or Domain Gate writer calls inside the runtime service;
- exactly one slot-specific route;
- forbidden fields appear only in schemas, prompt constraints, negative fixtures, tests, or documentation.

### Motive Evolution Implementation Sequencing

Implement in five bounded steps:

1. Completed: shared contracts and L1 schema tests only.
   Add slot/profile/prompt/role constants, runtime request schema, role output schemas, final support packet schema, context packet schema, forbidden-field guards, and L1 schema tests. Do not add runtime service, route, registry, provider canary, or Domain Gate behavior in this step.
2. Completed: registry, prompt, and context family.
   Add model profile YAML, prompt template YAML, backend model-profile registry mirror, context family, profile-owned model option tests, prompt identity tests, and registry validation. Product mode remains provider-only.
3. Completed: runtime service and L2 tests.
   Add a dedicated `PaperImplementationMotiveEvolutionRuntimeService.runEvolutionDecisionSupport(...)` that owns preflight, profile/prompt/model-option resolution, context/cache/compression identity, two-role provider orchestration, same-profile retry, machine gates, artifact assembly, and admission calls. It must not call domain writers, Domain Gate materializers, queue writers, or direct provider wrappers.
4. Completed: route/controller/app wiring and L3 tests.
   Add one slot-specific runtime route and entrypoint-only controller method. Add L3 route tests for happy path, product provider-only, provider fixture rejection, forbidden authority payloads, drift, response shape, and no Domain Gate/domain side effects.
5. Completed: L5 stress, runtime-stress parsing, provider canary hook, and final verification.
   Added required stress cases, runtime-stress required-case parsing, opt-in provider canary hook, backend typecheck, no-dual-track scans, diff check, and governance sync/lint. The slot is promoted after stress summary and no-dual-track evidence passed.

### Motive Evolution Implementation Readiness Review

Readiness status: promoted. Step 5 is complete, and no additional agent workflow node remains pending in this matrix.

Ready conditions already satisfied:
- node role and state-writer boundary are defined;
- bounded semantic processing and controlled two-role debate are defined;
- output schema and admission boundary are defined;
- context/cache/compression identity is defined around necessary complexity;
- L1-L5/no-dual-track matrix is defined;
- first-slice Domain Gate materialization is explicitly absent;
- product mode remains provider-only.
- shared runtime contracts and L1 schema tests are implemented for the motive evolution slot;
- registry, prompt template, backend profile mirror, and context family are implemented;
- dedicated runtime service and L2 tests are implemented;
- one controlled route/controller/app entrypoint and L3 route tests are implemented.

Implementation MUST NOT add Domain Gate coupling, queue behavior, or T-094 writer integration as part of the runtime slot. Any future mutation path must be a separate deterministic/human-domain-gate slice.

Primary implementation risks:
- writer-shaped payload leakage into runtime output;
- challenger artifacts reused across different designer option sets;
- compression dropping negative evidence, portfolio impact, or human-confirmation requirements;
- admission drifting into semantic ranking or option repair;
- harness/proposal artifacts becoming a parallel runtime identity source.

Mitigation: keep follow-up work in deterministic/operational lane stress and Domain Gate/domain-service replay coverage; do not reopen runtime authority for this slot without a new decision record.

### 2026-06-09 Motive Evolution Step 1 Implementation Status

Completed for `motive_evolution.evolution_decision_support`:
- shared slot/profile/prompt/role constants;
- `RunPaperImplementationMotiveEvolutionRuntimeRequest@v1`;
- option-designer and risk-challenger role output schemas;
- support-only final artifact schema;
- provider-readable `motive_context_packets[]` schema;
- forbidden harness/proposal/writer/Domain Gate/queue/prompt/provider/cache payload guards;
- L1 schema tests for role outputs, final artifact, and runtime request.

Step 1 quality bar:
- request context is ref/hash-bound and provider fixtures are rejected in provider mode;
- product mode remains provider-only;
- portfolio-changing and semantic/portfolio impact options require human confirmation;
- blocked challenge checks require blocking reason codes;
- option identity is carried by keyed maps, not array elements, so duplicate option keys and nested convenience `option_key` fields are rejected at L1;
- optional trigger context is accepted only when refs and hashes are supplied together;
- final runtime/cache identity recursively rejects forbidden prompt/provider/cache/writer/Domain Gate/queue fields;
- final support packet status is machine-consistent with `support_result_status` and `runtime_failure_code`;
- no runtime service, route, registry YAML/profile mirror, prompt template, context family, provider canary, Domain Gate, queue, or T-094 writer path was added.

Historical next step after step 1 was registry / prompt / context family. Current next step is recorded below in the step 4 status block.

### 2026-06-09 Motive Evolution Step 4 Implementation Status

Completed for `motive_evolution.evolution_decision_support`:
- one slot-specific route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/motive-evolution-decision-support/run`;
- entrypoint-only controller method `runMotiveEvolutionRuntime`;
- app wiring through `PaperImplementationMotiveEvolutionRuntimeService` and `TopicSelectionAgentOrchestratorService`;
- injectable `paperImplementationMotiveEvolutionLlmGateway` for deterministic L3 coverage and future opt-in provider path;
- L3 route coverage for passed two-role support packets, default provider model-option resolution, no authority side effects, Domain Gate materialization rejection, ref drift, provider fixtures, authority payloads, model-option drift, and every-product-slot provider fail-closed behavior;
- route-discovered runtime fixes for 1-based controlled-debate `round_index` and shared retry warning codes.

Step 4 quality bar:
- exactly one controlled route/controller/app entrypoint exists for this slot;
- product mode remains provider-only and rejects mocked/Codex fixtures before provider execution;
- route final artifacts remain support-only and carry no `MotiveEvolutionDecision`, portfolio request, queue payload, Domain Gate payload, or writer-shaped convenience field;
- failed runtime cases return one failed role artifact plus one rejected admission record and no final support packet;
- route/controller/app wiring does not add Domain Gate, queue, T-094 writer, direct provider wrapper, or harness production path.

Historical next step after step 4 was L5 stress / runtime-stress parsing / provider-canary hook / final no-dual-track verification. Current status is recorded in the step 5 block below.

### 2026-06-09 Motive Evolution Step 5 Implementation Status

Completed for `motive_evolution.evolution_decision_support`:
- eight L5 stress cases for over-budget zero-call preflight, provider retry exhaustion, missing challenger coverage, option-set drift, writer-shaped payload rejection, portfolio-changing option without human-confirmation gate, blocked challenge without reason, and memo-like context zero-call preflight;
- unified runtime-stress required-case parsing for all eight motive-evolution cases;
- runtime-stress service regression inclusion for the dedicated motive-evolution service tests;
- deterministic runtime-stress guardrails that disable `T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE` by default;
- opt-in live provider canary hook for the motive-evolution route using the same route/service/orchestrator/admission path;
- provider-canary config-key registration in `.ai/llm-config/registry/config_keys.yaml`;
- final no-dual-track scans proving no direct provider wrapper, no harness production entrypoint, no motive/portfolio/board/evidence/trace/queue/Domain Gate writer calls, and one slot-specific route.

Step 5 quality bar:
- product mode remains provider-only;
- runtime stress fails if any required motive-evolution L5 case is missing, skipped, renamed, or failed;
- failed provider/schema/machine-boundary cases emit no final support packet and no non-provider fallback;
- live provider canary remains opt-in and outside deterministic closure;
- the runtime slot still cannot materialize `MotiveEvolutionDecision`, portfolio decisions, queue items, board/binding writes, trace repair, or Domain Gate payloads.

## Agent Workflow Promotion Matrix

All agent workflow nodes listed below are now promoted. The table is retained as the slot-by-slot promotion record and boundary checklist, not as a pending-work queue.

| Node | Current authority surface | Required slot identity | Model/profile and params | Context/cache/compression | Loop strategy | Retry/fallback strategy | Debate / multi-scenario strategy | Admission and Domain Gate boundary | Minimum production-grade evidence | Suggested order |
|---|---|---|---|---|---|---|---|---|---|---|
| `route_architecture` | T-095 route/probe planning; deterministic services own cycle/route authority. | `route_architecture.route_candidates` with role `route_architecture.route_candidate_designer`. | Promoted through the Route Architecture Node Alignment block above. Product mode is provider-only; default output budget is `large`. | Runtime compiles motive, validation-cycle, route/probe, metric, budget, and source refs into ref-backed context. Cache keys include route/probe refs, source hashes, prompt variant, output schema, and compression identity. | Loop to route repair, feasibility probe, validation-cycle repair, or upstream feedback. Runtime cannot mutate route/cycle state. | Max one same-profile technical retry. Provider failure, schema failure, over-budget, stale refs, or compression failure fail closed. No mock/Codex/cache fallback in product. | Multi-candidate route alternatives are required. Debate helper extraction remains deferred. | First slice is proposal-only and has no Domain Gate materialization. Admission verifies route proposal refs, motive/board/cycle refs, source hashes, candidate count, expected information gain fields, forbidden route/cycle/queue fields, replay, and drift. | Shared schema test, service test, route integration, profile registry validation, L5 required stress, no route/cycle/queue write assertions, no-dual-track scan. | promoted |
| `route_skeptic_review` | T-095 loop-budget/review anchors; deterministic services own queue/route authority. | `route_skeptic_review.route_risk_critique` with role `route_skeptic_review.independent_route_critic`. | Promoted through the Route Skeptic Review Node Alignment block above. Product mode is provider-only; default output budget remains `medium`. | Primary context must be an admitted route architecture final artifact. Optional deterministic `TechnicalRouteCandidate` refs are secondary context only. Cache identity binds admitted proposal hash, reviewed candidate key, critique dimension set, source hashes, prompt variant, output schema, and compression identity. | Loop to route repair, abandonment/park queue, validation-cycle repair, or upstream feedback. Runtime cannot materialize those loop targets. | Same max-one technical retry. Provider/schema failures fail closed; semantic blocker output is admitted as review evidence only. | The critic role is the only first-slice critique role. Do not add arbiter/reconcile in this slice. Multi-scenario is support-only: blocker/repair/park alternatives are proposal findings, not state transitions. | First slice is critique-only and has no Domain Gate materialization. Admission verifies admitted route proposal, candidate key, blocker/risk refs, budget/scope risks, no route mutation, and no queue materialization. | Same as route architecture plus missing admitted proposal rejection, deterministic route primary-input rejection, missing critique dimension retry exhaustion, queue mutation rejection, and proposal hash/source drift coverage. | promoted |
| `validation_cycle_planning` | T-095 deterministic validation cycle service owns cycle creation/admission and route/probe/plan-light creation. | `validation_cycle_planning.cycle_candidates` with role `validation_cycle_planning.cycle_candidate_designer`. | Promoted through the Validation Cycle Planning Node Alignment block above. Product mode is provider-only; default output budget is `large`. | Primary context must include admitted route architecture and route skeptic final artifacts with matching proposal hash and candidate key. Secondary context may include deterministic route refs plus motive, board, assertion, evidence, trace, prior-cycle, probe, result, and budget refs. Compression must preserve negative/failed evidence and budget blockers. | Loop through low-information cycle feedback, loop-budget review, route/probe repair, feasibility planning, or upstream feedback. Runtime output cannot create cycles or queue items. | Same-profile technical retry only. Provider/schema/coverage failures fail closed with no final artifact. No mock/Codex/cache fallback in product. | Multi-candidate cycle alternatives are required. No debate helper and no broad validation-planning facade in the first slice; high-cost-cycle debate can be revisited after feasibility planning evidence exists. | First slice has no Domain Gate materialization. Admission verifies route proposal/skeptic refs, candidate key, criteria, budget, expected information gain, stop conditions, target frame, trace/source refs, forbidden cycle/route/probe/workorder/live/queue fields, replay, and drift. Domain service owns cycle draft/admission. | Shared schema test, service test, route integration, profile registry validation, provider canary hook, L5 over-budget/provider-failure/schema-invalid/drift/mutation coverage, no validation-cycle/route/probe/queue write assertions, no-dual-track scan. | promoted |
| `feasibility_planning` | T-095 deterministic validation cycle service owns feasibility probe and plan-light creation; generic harness can only record validation scenarios. | `feasibility_planning.probe_plan_candidates` with role `feasibility_planning.probe_plan_designer`. | Promoted through the Feasibility Planning Node Alignment block above. Product mode is provider-only; default output budget is `large`. | Primary context must include an admitted validation-cycle candidate final artifact plus route proposal and route skeptic lineage anchors inherited from that artifact. Secondary context may include deterministic route/probe/plan-light refs plus motive, board, assertion, evidence, trace, result, budget, dataset, baseline, code, and config refs. Compression must preserve negative/failed evidence, baseline gaps, and budget blockers. | Loop to route/probe repair, budget review, validation-cycle repair, or upstream feedback. Runtime output cannot create feasibility probes, plan-light objects, cycles, or queue items. | Same-profile technical retry only. Provider/schema/coverage failures fail closed with no final artifact. No mock/Codex/cache fallback in product. | Multi-candidate probe/plan alternatives are required. No debate helper in the first slice; high-cost or conflicting feasibility evidence stays as blocker/warning codes inside candidate proposals. | First slice has no Domain Gate materialization. Admission verifies validation-cycle, route proposal, and route skeptic refs, reviewed cycle/route keys, budget, stop conditions, metric/data/baseline/code/config refs, trace/source refs, forbidden probe/plan/cycle/route/workorder/live/queue fields, replay, and drift. Domain service owns probe and plan-light creation. | Shared schema test, service test, route integration, profile registry validation, provider canary hook, L5 over-budget/provider-failure/schema-invalid/drift/mutation coverage, no feasibility-probe/plan-light/cycle/route/queue write assertions, no-dual-track harness scan. | promoted |
| `cross_board_synthesis` | T-094 evidence board, evidence transfer, cross-board review, and motive portfolio services own domain authority. | `cross_board_synthesis.merge_split_reuse_scenarios` with role `cross_board_synthesis.merge_split_reuse_scenario_designer`. | Promoted through the Cross Board Synthesis Node Alignment block above. Product mode is provider-only; default output budget is `large`. | Primary context must include at least two admitted board-version refs with hashes, motive/version refs, trace refs, source locator refs, freshness, challenge/conflict refs, and transfer binding refs when reuse is claimed. Compression must preserve conflict/challenge refs. | Loop to evidence board curation, motive decomposition/evolution draft, cross-board review, transfer-binding review, or upstream trace repair. Runtime output cannot create those loop targets. | Same-profile technical retry only. Provider/schema/coverage failures fail closed with no final artifact. No mock/Codex/cache fallback in product. | Conditional multi-scenario coverage is required: reuse when transfer bindings exist, park/reject when conflicts/challenges exist, merge for overlap hints, split for divergence hints. No debate helper in the first slice. | First slice has no Domain Gate materialization. Admission verifies board hashes, motive/trace/source refs, transfer-binding refs, conflict/challenge preservation, memo-as-evidence guard, forbidden cross-board-review/transfer/portfolio/evolution/queue fields, replay, and drift. Domain services own any review, transfer, portfolio, or motive state transition. | Shared schema test, service test, route integration, profile registry validation, L5 over-budget/provider-failure/conflict-scenario/scenario-ref-drift/memo-as-evidence/reuse-without-transfer coverage, no-dual-track harness scan. | promoted |
| `evidence_board_curation` | T-094 board/evidence binding and trace/evidence services own board, binding, citation, transfer, and trace-repair authority. | `evidence_board_curation.binding_gap_candidates` with role `evidence_board_curation.binding_gap_candidate_curator`. | Promoted through the Evidence Board Curation Alignment, Implementation, and Review Fixes blocks above. Product mode is provider-only; default output budget is `medium`. | Primary context binds target motive/version/assertion refs, trace manifest refs/hashes, source locator refs, citation candidate refs, reviewed citation candidate refs, evidence refs, existing binding refs, existing bound evidence refs, freshness policy, and accepted-risk refs. `curate_existing_board` and `seed_initial_board_candidates` are explicit discriminated modes. Cache identity includes source locator, citation candidate, trace, evidence, existing binding, existing bound evidence, source hashes, and secondary `source_context_packets` when present. Source context packets are review material only and cannot replace ref authority. | Loop to trace repair, evidence transfer review, stale-evidence recheck, board update review, or upstream trace/source repair. Runtime output cannot create those loop targets. | Same-profile technical retry only. Provider/schema/machine-boundary failures fail closed with no final artifact. No mock/Codex/cache fallback in product. | Single-role controlled challenge runtime: each binding candidate includes a structured `challenge_check`. No proposer/critic/arbiter roles, no shared debate helper, and no semantic rewrite in the first slice. Multi-candidate binding/gap alternatives remain proposal evidence only. | First slice has no Domain Gate materialization. Output is append-only: new binding candidates and gap candidates only, no existing binding update/removal, board-shaped output, board summary/state, board write, binding write, transfer/citation/trace-repair/queue fields. `seed_initial_board_candidates` cannot emit board drafts, board create requests, or current-board binding context. Admission verifies refs/hashes, source packet coverage, source locators, citation status, freshness, challenge-check completeness, duplicate bound-evidence rejection, memo-as-evidence guard, replay, and drift. Domain services own board/evidence mutation. | Shared schema test, service test, route integration, profile registry validation, L5 over-budget/provider-failure/missing-challenge/missing-locator/duplicate-existing-binding/invented-ref/memo-as-evidence coverage, no-dual-track harness scan, and unified runtime stress runner coverage. | promoted |
| `motive_decomposition` | T-094 motive versions/assertions and motive board services own all motive/assertion mutation. | `motive_decomposition.draft_assertion_candidates` with role `motive_decomposition.draft_assertion_candidate_designer`. | Promoted through the Motive Decomposition Alignment and Implementation Status blocks above. Product mode is provider-only through `PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY`; explicit `model_option_id` is allowed only for `provider_llm` and must belong to the slot profile. Runtime records resolved profile/model-option/prompt/context/cache/compression identity; no raw model parameter or prompt overrides. | First slice supports only `decompose_existing_assertions`: target assertion refs must be non-empty and request-owned. Context includes target motive/version/assertion refs, evidence refs, trace/source refs and hashes, accepted-risk markers, upstream feedback, and ref/hash-bound `assertion_context_packets` for provider-visible assertion text. Text may enter the prompt only through packet refs/hashes; unbound text, harness run ids, cached prior outputs, provider reasoning, or audit summaries cannot become production identity. | Dedicated `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)` owns preflight, registry resolution, context/cache/compression identity, provider orchestration, same-profile retry, machine gate, artifact assembly, and admission call. Route/controller controls only the entrypoint. Admission verifies only. Domain services own mutation. Harness validates only. Runtime cannot materialize motive evolution, board/evidence, trace repair, queue, or Domain Gate targets. | Same-profile technical retry only for provider/schema/coverage/forbidden-field/machine-boundary failures. If retry still fails, no final artifact is emitted. Semantic blockers and no-decomposition-needed outcomes do not retry; they finalize through `decomposition_result_status` as blocked or no-candidate artifacts when structurally valid. No mock/Codex/cache/generic harness fallback in product. | Single-role semantic candidate runtime with mandatory controlled `decomposition_check` per candidate. No full debate, proposer/critic/arbiter roles, transcript, shared debate helper, or semantic reconciliation in the first slice. Multi-candidate decomposition alternatives are proposal evidence only. No `source_assertion_reviews[]`; use top-level `decomposition_result_status` and `reviewed_assertion_refs` for machine state and coverage. | First slice has no Domain Gate materialization. Output is draft-only assertion candidates plus `decomposition_result_status`, blocker/warning codes, `reviewed_assertion_refs`, gate recommendations, and no-side-effect guards. Runtime gate enforces result-status invariants, request-owned refs, complete `decomposition_check`, identity drift rejection, new-claim/human-confirmation gating, and no direct materialization shape. Admission verifies schema, refs/hashes, profile/prompt/model-option/cache/compression identity, reviewed assertion coverage, assertion packet coverage, no-side-effect guards, forbidden fields, replay, and drift only; it does not judge semantic correctness or mutate motive/assertion state. | Shared schema, service, route, registry/profile, L5 required stress, runtime-stress parser, typecheck, no-dual-track service/route/contract scans, diff check, and governance sync/lint are complete. Runtime-stress summary parsed all eight motive L5 required cases as passed. | promoted |
| `motive_evolution` | T-094 motive evolution decisions and portfolio state. Existing deterministic services own semantic `CoreMotiveVersion` changes, `MotiveEvolutionDecision` creation, portfolio decisions, and human-confirmed primary/active-set transitions. | `motive_evolution.evolution_decision_support` with roles `motive_evolution.evolution_option_designer` and `motive_evolution.evolution_risk_challenger`. | Profile `paper-implementation.motive-evolution.evolution-decision-support.v1`, prompt template `paper-implementation-motive-evolution-decision-support@v1`, and context family `paper_implementation_motive_evolution` are registered. Low creativity, high reasoning, large output budget. Product mode provider-only through the shared PaperImplementation runtime eligibility guard. Omitted provider `model_option_id` may resolve through the profile default only when the returned provenance option belongs to this slot's allowlist. | Context must bind explicit motive refs, core motive version refs, portfolio role/set refs, evidence refs, trace refs/hashes, board/cross-board refs when relevant, validation/result trigger refs, prior evolution/portfolio decision refs, human-confirmation requirements, accepted-risk refs, and source hash bundle. Runtime cannot accept harness/proposal artifacts, unbound summaries, or writer DTOs as primary context. | Dedicated `PaperImplementationMotiveEvolutionRuntimeService.runEvolutionDecisionSupport(...)` owns preflight, two-role orchestration, provenance/profile/prompt/model/cache/compression identity, machine gating, runtime artifact assembly, and admission calls. The controlled route/controller/app entrypoint is wired and delegates only. Loop recommendations may route to motive evolution review, portfolio decision review, evidence board curation, trace repair, validation repair, or human confirmation, but runtime cannot create those loop targets. | Same-profile technical retry only for provider/schema/coverage/forbidden-field/machine-boundary failures. No semantic retry, no LLM arbiter, no mock/Codex/cache/generic harness fallback in product. If the bounded debate is incomplete, provider identity/source/run-mode provenance drifts, mutating fields appear, or provider execution fails, fail closed with no final support packet and one rejected admission record. | Controlled two-role debate is required: an option designer proposes ref-backed `keep_current`, `repair_evidence_board_first`, `supersede`, `merge`, `split`, `park`, or `abandon` options; a risk challenger must cover every option across evidence, trace, portfolio, human-confirmation, and downstream impact. Multi-option support is required, but options are decision support only. No open transcript, arbiter, shared debate execution helper, or semantic reconciliation in the first slice. | Output is an `evolution_decision_support_packet`, not a `MotiveEvolutionDecision` or portfolio request. Admission verifies refs/hashes, profile/prompt/model-option/cache/compression identity, role lineage, complete challenge coverage, human-confirmation flags, portfolio impact classification, no-side-effect guards, forbidden writer fields, replay, and drift only. Domain/human gate is mandatory before any mutation. Route tests prove Domain Gate materialization is rejected for this slot. | Shared schema L1, registry/profile validation, prompt/context identity checks, backend typecheck, dedicated runtime service, L2 service tests, route/controller/app wiring, L3 route tests, default provider option regression, provider source/run-mode provenance drift tests, opt-in provider canary hook, L5 adversarial state-mutation and writer-shaped payload tests, runtime-stress required-case parsing, final promotion verification, service/route/contract no-dual-track scans, and Domain Gate rejection of blocked/failed support packets are complete. Prisma smoke is not required because step 5 introduced no persistence change. | promoted |

## Pending Deterministic And Operational Lanes
These lanes should not become LLM runtime slots by default. They need stronger replay/stress evidence or explicit Domain Gate coupling.

## Domain Gate Consumption Matrix

The remaining T-114 closure work is deterministic. Runtime slots are promoted; the question is which admitted runtime final artifacts may be consumed by Domain Gate and which must remain support-only.

### D-17 Product-Target Materializable Allowlist (docs-only; not implemented)

The landed service still contains three materializer branches. Under D-17, only the two rows below remain product-valid. Result Analysis is removed from the target allowlist and recorded separately as superseded migration debt.

| Runtime slot | Domain artifact | Deterministic writer owner | Required Domain Gate behavior |
|---|---|---|---|
| `claim_boundary_review.boundary_debate` | `ClaimCandidate` | `PaperImplementationResultClaimDossierService.createClaimCandidate` | Consume only admitted `passed` final artifacts with a valid claim `domain_gate_request`. Same normalized identity returns `already_materialized`; same id with different payload returns `VERSION_CONFLICT`. |
| `dossier_readiness_prep.readiness_audit` | `ImplementationDossier` | `PaperImplementationResultClaimDossierService.createImplementationDossier` | Consume only admitted `passed` final artifacts with a valid dossier `domain_gate_request`. Same normalized identity returns `already_materialized`; same id with different payload returns `VERSION_CONFLICT`. |

### Superseded Landed Result-Analysis Materializer

| Landed path | Historical fact | D-17 product target |
|---|---|---|
| `result_analysis.interpretation_scenarios` → Domain Gate → `PaperImplementationResultClaimDossierService.createResultInterpretationPacket` | Implemented and historically verified by T-114 for replay/drift/fail-closed behavior. | Remove the materializer atomically. Admit one exact-hash-bound Result Analysis proposal as support-only; the existing ValidationCycle closure accepts/corrects it and alone writes disposition/selected exit. T-098 creates a packet only after resolving that exact closed Cycle. This migration is not implemented by the docs update. |

### Support-Only Runtime Artifacts

These slots are explicitly non-materializable in this slice. Their final artifacts may be admitted as evidence, proposals, critiques, or decision support, but Domain Gate must reject them with `GATE_CONSTRAINT_FAILED` and must not call any deterministic writer.

| Runtime slot | Why support-only | Domain owner that must remain outside runtime/admission |
|---|---|---|
| `trace_integrity_review.boundary_debate` | Trace debate can identify blockers or repair direction, but trace manifest creation/repair and queue routing are deterministic lanes. | T-097 trace service and future trace/queue domain gate path. |
| `experiment_design.work_order_draft` | WorkOrder draft candidates are evidence only; creating/admitting WorkOrders is deterministic. | T-096 WorkOrder admission service. |
| `experiment_critique.plan_critique` | Critique artifacts are review evidence only; they cannot submit, sync, collect, cancel, or mutate WorkOrders. | T-096 WorkOrder service and T-104 live adapter. |
| `route_architecture.route_candidates` | Route candidates are proposals only; route/probe/cycle creation remains deterministic. | T-095 route/probe/validation-cycle services. |
| `route_skeptic_review.route_risk_critique` | Risk critique can recommend repair/park/abandon, but it cannot create queue or route mutation payloads. | T-095 route service and T-099/T-100 queue service. |
| `validation_cycle_planning.cycle_candidates` | Cycle candidates are proposals only. | T-095 validation-cycle service. |
| `feasibility_planning.probe_plan_candidates` | Probe/plan candidates are proposals only. | T-095 feasibility probe / plan-light service. |
| `cross_board_synthesis.merge_split_reuse_scenarios` | Merge/split/reuse scenarios are synthesis evidence only. | T-094 board, cross-board review, transfer binding, motive portfolio services. |
| `evidence_board_curation.binding_gap_candidates` | Binding/gap candidates are append-only proposals only. | T-094 board/evidence/citation/trace repair services. |
| `motive_decomposition.draft_assertion_candidates` | Draft assertion candidates cannot create or mutate motives/assertions. | T-094 motive version/assertion services. |
| `motive_evolution.evolution_decision_support` | Decision support cannot create `MotiveEvolutionDecision`, portfolio changes, or human-confirmed motive transitions. | T-094 motive evolution / portfolio services plus human/domain gate. |
| `result_analysis.interpretation_scenarios` | D-17 makes the admitted final artifact one scientific-disposition proposal only; model/runtime/admission/Domain Gate cannot write Cycle assessment, selected exit or accepted packet. | Existing T-095 ValidationCycle closure authority consumes the exact proposal; T-098 is a post-closure packet/claim/dossier consumer. |

### Non-Negotiable Gate Rules

- Domain Gate must fetch the runtime artifact from the runtime/admission repository by `runtime_artifact_id`; callers cannot provide artifact envelopes or writer payloads inline.
- Domain Gate must reject role artifacts, blocked final artifacts, failed-runtime final artifacts, unsupported slots, non-admitted final artifacts, and admitted records with issue codes.
- Domain Gate must validate the slot-specific `domain_gate_request` shape before writer calls for materializable slots.
- Domain Gate must not inspect support-only proposal fields to infer a state transition.
- Runtime, admission, and harness must not call deterministic writer services directly for these transitions.
- Human-readable summaries and audit text are not part of readiness; required proof is machine-verifiable route/service/stress evidence.

### Implementation Readiness Review

Status: deterministic Domain Gate coverage hardening steps 1-2, deterministic-lane step 3, and DecisionWorkQueue deterministic stress step 4 are complete; remaining work stays operational.

The landed `PaperImplementationRuntimeDomainGateService` uses a three-branch allowlist for claim, dossier, and result-analysis materializers, and historical tests cover replay/drift for all three. T-132 D-17 supersedes the result-analysis branch only: product acceptance requires a two-branch claim/dossier allowlist, support-only Result Analysis, one ValidationCycle closure conclusion writer and post-closure packet creation. Until the atomic migration lands, the historical green tests must not be treated as D-17 evidence.

Closed in deterministic implementation step 1:
- explicit support-only Domain Gate rejection matrix now covers every promoted support-only slot through real product runtime routes;
- trace-integrity support-only rejection is covered through the real `trace-integrity-boundary-debate` route;
- deterministic stress runner now parses the support-only rejection matrix as a required runtime-regression case.

Closed in deterministic implementation step 2:
- deterministic stress runner now parses required cases for claim, dossier, and result-analysis idempotency/replay;
- deterministic stress runner now parses required cases for same-id materialization drift conflicts and malformed result-analysis Domain Gate payloads;
- deterministic stress runner now parses required cases for role, blocked final, and failed-runtime final rejection;
- deterministic stress runner now executes a Domain Gate writer-ownership scan proving the service dependency and writer-call surface is limited to runtime admission plus T-098 result/claim/dossier materializers.

Closed in deterministic implementation step 3:
- deterministic stress runner now includes step `03-deterministic-lane-regression` for non-LLM producer lanes;
- intake bootstrap route/service replay, duplicate bootstrap idempotency, stale bridge hash rejection, and no-mutation behavior are parsed as required deterministic-lane cases;
- trace manifest complete/no-queue, stale repair queue, and immutable trace/citation/claim id conflict behavior are parsed as required deterministic-lane cases;
- WorkOrder draft/admission/submission/evidence trace boundaries are parsed as required deterministic-lane cases, including admission replay/drift and harness-run idempotency replay/drift;
- `PaperImplementationWorkOrderExperimentBridgeService` now consumes the existing idempotency-key repository lookup and rejects replay drift without adding a runtime, Domain Gate, queue, live adapter, or harness production path.

Closed in deterministic implementation step 4:
- deterministic stress runner now includes step `04-decision-work-queue-regression` for the existing harness-backed DecisionWorkQueue surface;
- queue dedup identity no longer includes `harnessRunId`; it is stable across equivalent blocked reruns by transition key, queue type, target ref, and sorted blocker codes;
- queue retry/cooldown behavior remains bounded and non-scheduler-owned in this slice: harness-generated items start with `retry_count=0`, `retry_budget=1`, and `cooldown_until=null`;
- service and Prisma repositories replay the same terminal resolution status idempotently and reject terminal-status drift with `VERSION_CONFLICT`;
- equivalent blockers that recur after terminal resolution reopen the same semantic queue item as `open` instead of returning a terminal item to a newly blocked run;
- runtime admission still rejects drift without queue payloads, and runtime/admission/Domain Gate scans show no queue materializer path.

Remaining coverage gaps to close before calling deterministic closure production-grade:
- avoid adding a generic Domain Gate facade, broad runtime-envelope materializer, queue materializer, or semantic decision logic in admission;
- continue deterministic lane stress outside the LLM runtime surface for env-gated live adapter operational gates.

| Lane | Current surface | Pending work | Required evidence |
|---|---|---|---|
| Intake bootstrap | T-093 routes/services. | Closed in deterministic step 3; keep as required deterministic-lane stress case. | Route replay, idempotency, stale bridge rejection, no LLM/provider calls. |
| Trace manifest creation/repair | T-097 deterministic service. | Closed in deterministic step 3 for complete/stale/immutable-id regression; future additions can add failed-run-specific trace accounting when queue/live lanes are expanded. | Trace source drift, locator drift, failed-run accounting, no runtime context rebuild in admission. |
| WorkOrder admission | T-096 deterministic service. | Closed in deterministic step 3 for draft/admission/submission/evidence identity; keep experiment-design runtime output proposal-only. | Runtime artifact can propose draft only; deterministic service owns WorkOrder creation/admission; replay and drift checks. |
| Live experiment submit/sync/collect/cancel | T-104 adapter. | Closed in operational step 5; keep env-gated and required in runtime-stress. | No LLM runtime can submit/cancel/sync experiments; adapter failure/backoff is operational, not semantic fallback; submit/sync/collect/cancel replay, final-evidence side effects, external failure no-partial-state behavior, and no runtime/admission/harness entrypoint are required cases. |
| Result/claim/dossier authority writes | T-098 deterministic service. | Continue adding Domain Gate tests for newly promoted runtime final artifacts. | Domain Gate materialization, replay/idempotency, same-id drift conflict, blocked/failed runtime rejection. |
| Decision work queue | Existing harness-backed blocker queue surface, future T-099/T-100 orchestration service. | Closed in deterministic step 4 for existing surface: stable dedup, bounded retry/cooldown defaults, terminal resolution replay/drift, recurrent-blocker reopen, and runtime/admission no-queue-materializer proof. Future extraction to a dedicated domain queue service must be a separate ownership decision, not a parallel queue path. | Equivalent blocked reruns reuse one queue item; terminal resolution is idempotent for same status and drift-conflicting for different terminal status; recurrent blockers reopen the same semantic queue item; runtime/admission cannot materialize queue items. |
| Provider variance evaluation | T-105 evaluation lane. | Closed as evidence/preflight stress step; keep out of product runtime/provider canary and Domain Gate eligibility. | Deterministic fake replay, live preflight skip/block, schema/trace/authority/handoff guardrails, route delegation, evaluation-only refs, and no runtime/admission/Domain Gate/live entrypoint scan are required cases. |

## Per-Slot Implementation Checklist
This historical checklist remains the promotion bar for any future agent workflow slot or major re-promotion. All current agent workflow nodes have satisfied it:
- Define concrete `slot_id`, role slot id(s), profile id, prompt template id, and output contract id.
- Define model option policy: default provider option, manual quality/deep options, normalized params, timeout, and product-mode eligibility.
- Assert the harness only calls the real runtime route/service path and verifies machine invariants; it must not compile prompts, choose models, compute cache/compression identity, repair outputs, or emit runtime artifacts.
- Add product-mode guard: `run_mode=product` requires `execution_mode=provider_llm`.
- Add context packet identity, prompt packet identity, token-budget gate, compression policy, cache key, and cache result refs.
- Add same-profile technical retry and explicit no fallback to mock/Codex/cache/replay in product mode.
- Add role artifact and final artifact schemas with forbidden prompt/provider/authority payload checks.
- Add admission record coverage for passed, blocked, failed-runtime, replay, and drift.
- Add Domain Gate materialization only when a deterministic domain service owns the target state transition; otherwise assert explicit no-Domain-Gate/no-authority boundary.
- Add L1 shared schema, L2 service, L3 repository/Prisma smoke when persisted, L4 provider canary hook, and L5 stress/compression/adversarial tests.
- Treat human-readable summaries as optional diagnostics only. Promotion must be proven by runtime/admission/domain evidence fields and no-side-effect assertions.
- Add no-dual-track scans proving the harness cannot masquerade as runtime/admission/domain authority.

## Next Recommended Slice
Provider variance evaluation evidence/preflight stress is now closed. Move into final holistic T-114 closure review across runtime/admission/Domain Gate/deterministic/operational lanes.

Current status:
1. Completed: node role and authority boundary. This slot produces decision support only; deterministic T-094 services plus human/domain gate own motive evolution and portfolio mutation.
2. Completed: semantic processing and debate. Bounded semantic processing is allowed; controlled two-role debate is required; no LLM arbiter or semantic repair in the first slice.
3. Completed: output schema and admission. The first slice uses a simple `evolution_decision_support_packet` plus machine-only admission; no writer-shaped payloads or Domain Gate materialization.
4. Completed: context/cache/compression identity. Preserve necessary complexity for decision quality and robustness, but exclude audit prose, convenience writer payloads, unbound summaries, and harness/proposal artifacts from production identity.
5. Completed: L1-L5 and no-dual-track matrix. Cover state-mutation adversarial cases, human-confirmation gates, replay/drift, compression loss, cache identity drift, and deterministic writer bypass.
6. Completed: implementation step 1. Shared contracts and L1 schema tests are landed; no runtime service, route, registry, provider canary, Domain Gate, queue, or T-094 writer path was added.
7. Completed: implementation step 2. Model profile YAML, prompt template YAML, backend registry mirror, context family, profile-owned model option tests, prompt/context identity checks, and registry validation are landed.
8. Completed: implementation step 3. Dedicated runtime service and L2 tests are landed; the service is provider-only in product, validates role provenance/profile/prompt/model/source/run-mode identity, accepts only slot-owned default provider option resolution when omitted, executes the fixed two-role controlled debate, assembles/admits role and final artifacts, and has no domain-writer, Domain Gate, queue, route, or harness production path.
9. Completed: implementation step 4. One slot-specific route/controller/app wiring path and L3 route tests are landed; no provider canary, L5 stress, Domain Gate, queue, or T-094 writer integration was added.
10. Completed: pre-step-5 maintenance refactor. `PaperImplementationController` now takes a named dependency object instead of a long positional constructor parameter list, so additional runtime slots cannot silently shift Domain Gate/live/evaluation dependencies.
11. Completed: implementation step 5. L5 stress coverage, runtime-stress required-case parsing, opt-in provider canary hook, provider-canary config-key registration, final no-dual-track scans, and promotion verification are landed.
12. Completed: deterministic Domain Gate implementation step 1. The support-only rejection matrix covers all promoted support-only runtime final artifacts, including trace integrity, and runtime-stress parses it as a required regression case.
13. Completed: deterministic Domain Gate implementation step 2. Runtime-stress now requires replay/idempotency, same-id drift conflict, malformed payload, role/blocked/failed rejection cases, and runs a writer-ownership scan that limits Domain Gate writers to T-098 result/claim/dossier materializers.
14. Completed: deterministic lane implementation step 3. Runtime-stress now requires intake bootstrap, trace manifest, and WorkOrder deterministic-lane regression cases; WorkOrder admission and harness-run submission replay are idempotent for matching identities and reject drifted identities with `VERSION_CONFLICT`.
15. Completed: DecisionWorkQueue deterministic stress step 4. Runtime-stress now requires harness rerun queue dedup, bounded retry/cooldown defaults, recurrent-blocker reopen, terminal resolution replay/drift in service and Prisma paths, and runtime admission no-queue-payload rejection.
16. Completed: live experiment adapter operational stress. Runtime-stress now requires 12 live adapter cases covering WorkOrder submit prerequisite/idempotency, missing materialization refs, wrong external job pre-side-effect rejection, sync monitor-only behavior including terminal observation, collect/cancel trusted evidence finalization and idempotency, route schema/delegation, external execution failure no-partial-state/no-fallback behavior, and ownership scan proof that runtime/admission/harness do not own live experiment execution.
17. Completed: provider variance evaluation evidence/preflight stress. Runtime-stress now requires six provider variance cases covering deterministic fake replay, live provider preflight skip/block without execution, schema/trace/authority/handoff guardrails, route schema/delegation, evaluation-only refs with no runtime/admission/Domain Gate authority, and ownership scan proof that runtime/admission/Domain Gate/live/harness services do not own provider variance execution or eligibility.

Reason:
- All agent workflow nodes are now promoted as bounded proposal/critique/synthesis/curation/decomposition/decision-support slices.
- The remaining robustness risk is no longer a missing LLM runtime slot, untested DecisionWorkQueue replay/dedup surface, untested live adapter operational lane, or unbounded provider variance evidence/preflight lane.
- The next slice should preserve the same boundary: runtime and harness validate/produce evidence only; deterministic services and Domain Gate own state mutation.
