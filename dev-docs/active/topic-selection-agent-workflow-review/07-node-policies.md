# 07 Node Policies

## Purpose
This file is the per-node semantic contract for T-089. The workflow matrix gives a compact routing summary; this file defines the detailed policy that implementation and harness scenarios must consume.

Stub policies are not implementation-ready. They reserve all D-13 fields so missing semantics are visible before runtime work starts.

## Required Fields
- `node_id`
- `authority_object`
- `preconditions`
- `blocking_conditions`
- `deterministic_validators`
- `allowed_execution_modes`
- `default_execution_mode`
- `debate_trigger_policy`
- `profile_escalation_policy_ref`
- `input_contract_refs`
- `output_contract_refs`
- `authority_write_boundary`
- `audit_artifact_policy`
- `failure_semantics`

## Node Evaluation Dimensions
Every node review MUST evaluate automation callability before implementation work is considered closed.

`policy_status=implementation_ready` means business semantics are clear enough to implement. It does not by itself mean the node is already callable by automation. That distinction is captured by `automation_callability`.

`automation_callability` MUST answer:
- whether the node has a stable normalized node input;
- whether the node has a stable normalized node result for success and blocked paths;
- whether a `WorkflowHarness` runner exists;
- whether the runner calls the existing authority-write service instead of writing authority directly;
- whether the node can run without script-local request choreography;
- whether the node emits harness trace/audit/artifact refs;
- whether scenario registry or scenario runner code can invoke it by `node_id` without knowing downstream route sequencing.

## Common Policy Vocabulary
- `policy_status=stub`: required fields are reserved, but the node is not implementation-ready.
- `policy_status=draft`: all required fields have concrete draft values, but they still need review against contracts, services, and scenarios.
- `policy_status=implementation_ready`: all D-13 fields are concrete, scenario assertions can cite the policy, and no `TBD-node-policy-detail` remains.
- `policy_status=implemented`: implementation and verification have landed against the policy.
- `TBD-node-policy-detail`: visible placeholder allowed only during T-089 design alignment.
- `not_allowed`: the capability is explicitly disabled for the node.
- `not_applicable`: the field is irrelevant because the node does not use that mechanism.
- `none`: no model-like execution occurs and `AgentOrchestrator` is not invoked.
- `blocked`: the node stops before authority writes and records blocking reasons, trace, and audit/artifact refs where applicable.
- `require_human_review`: the node cannot finalize authority output until a human decision record exists.
- `fixture_human_decision`: test or acceptance input that simulates a human decision. It must be provenance-labeled and must not be mistaken for real human judgment.
- `allowed_execution_modes`: the only execution modes the node policy permits. `mocked_llm` is still test/acceptance-only.
- `authority_write_boundary`: the domain service/repository boundary that may persist authority objects after validation passes.
- `profile_escalation_policy_ref`: a reference to the attempt-level escalation policy; deterministic and human-review nodes use `not_applicable`.
- `debate_trigger_policy`: concrete trigger rules for debate-eligible nodes; non-debate nodes use `not_allowed`.
- `failure_semantics`: how invalid input, missing preconditions, validation failure, model failure, debate unresolved, guardrail blocking, and persistence conflict are represented.
- `automation_callability.status=not_callable`: the node is only available through manual route/service choreography or script-owned sequencing.
- `automation_callability.status=partially_callable`: a service/route exists, but there is no normalized harness runner or blocked result shape.
- `automation_callability.status=callable`: a WorkflowHarness runner exists with stable input/result, trace, assertions, and no script-local business choreography.
- `automation_callability.status=blocked`: upstream contracts or authority boundaries are not clear enough to define an automated runner safely.

## Fill Order
Policy details must be filled in this order.

### Phase 0 - Common Vocabulary
- Keep this vocabulary section current before filling individual node policies.
- If a node needs a new shared term, add it here first.

### Phase 1 - Debate-Eligible Nodes
- `topic-selection.resource-sampling.create-sample-set.v1`
- `topic-selection.v1a.generate-need-candidate.v1`
- `topic-selection.v1b.assess-topic-value.v1`
- `topic-selection.v1c.generate-promotion-support.v1`

These nodes shape the most complex policy language. Fill debate triggers, Codex/provider/mocked boundaries, audit artifacts, failure semantics, and authority-write boundaries before any debate implementation.

### Phase 2 - Remaining Single-Agent Nodes
- `topic-selection.v1a.validate-need-adjudication.v1`
- `topic-selection.v1b.plan-research-slice.v1`
- `topic-selection.v1b.form-topic-question-contract.v1`

Fill prompt/response packet expectations, deterministic validators, allowed execution modes, profile escalation refs, and authority-write boundaries.

### Phase 3 - Deterministic, Human, And Downstream Spine
- `topic-selection.v1a.create-topic-seed.v1`
- `topic-selection.v1a.snapshot-literature-resource-pool.v1`
- `topic-selection.v1a.create-search-plan.v1`
- `topic-selection.v1a.record-search-run.v1`
- `topic-selection.v1a.build-evidence-map.v1`
- `topic-selection.v1a.human-confirm-need.v1`
- `topic-selection.v1a.publish-v1b-input-bundle.v1`
- `topic-selection.v1b.build-intake-constraint-profile.v1`
- `topic-selection.v1b.decide-value-disposition.v1`
- `topic-selection.v1b.create-topic-package-draft.v1`
- `topic-selection.v1b.assess-package-readiness.v1`
- `topic-selection.v1b.publish-v1c-input-bundle.v1`
- `topic-selection.v1c.create-promotion-input-snapshot.v1`
- `topic-selection.v1c.run-promotion-gate.v1`
- `topic-selection.v1c.human-promotion-decision.v1`
- `topic-selection.v1c.create-paper-project-bridge.v1`
- `topic-selection.downstream.paper-project-intake.v1`
- `topic-selection.downstream.feedback-recheck.v1`

Fill currentness, immutability, human fixture separation, authority-write ownership, and absence assertions for blocked paths.

## Current v1a Automation Callability Snapshot
This snapshot prevents `policy_status=implementation_ready` from being mistaken for automated execution readiness.

| Node | Policy status | Automation callability | Current reason |
|---|---|---|---|
| `topic-selection.v1a.create-topic-seed.v1` | `implementation_ready` | `callable` | `runCreateTopicSeedScenario` exists with stable success/blocked result and trace artifact. |
| `topic-selection.v1a.snapshot-literature-resource-pool.v1` | `implementation_ready` | `callable` | `runSnapshotLiteratureResourcePoolScenario` exists with stable success/blocked result and trace artifact. |
| `topic-selection.v1a.create-search-plan.v1` | `implementation_ready` | `callable` | `runCreateSearchPlanScenario` exists with strict blueprint validation, success/blocked result, and trace artifact. |
| `topic-selection.v1a.record-search-run.v1` | `implementation_ready` | `callable` | `runRecordSearchRunScenario` exists with normalized bundle validation, success/blocked result, handoff/loopback routing, and trace artifact. |
| `topic-selection.v1a.build-evidence-map.v1` | `implementation_ready` | `callable` | `runBuildEvidenceMapScenario` exists with stable success/blocked/review-required result and trace artifact. |
| `topic-selection.v1a.generate-need-candidate.v1` | `implementation_ready` | `callable` | `runGenerateNeedCandidateScenario` exists with exact replay, stable trace snapshot, and real E2E canary use. |
| `topic-selection.v1a.validate-need-adjudication.v1` | `implementation_ready` | `callable` | `runValidateNeedAdjudicationScenario` exists with strict readiness/support lineage, recommendation gate, replay/duplicate handling, and trace artifact. |
| `topic-selection.v1a.human-confirm-need.v1` | `implementation_ready` | `callable` | `runHumanConfirmNeedScenario` exists with stable success/blocked/review result, semantic review artifacts, exact replay, duplicate/partial-write guards, and trace artifact. |
| `topic-selection.v1a.publish-v1b-input-bundle.v1` | `implementation_ready` | `callable` | `runPublishV1bInputBundleScenario` exists with explicit handoff refs, exact replay, version reuse idempotency, lineage guards, and trace artifact. |

## Current v1a Replay / Idempotency Matrix
This matrix prevents automated runners from assuming full-chain exact replay where the implementation only guarantees deterministic validation or append-only materialization.

| Node | Current replay/idempotency mode | Automation rule |
|---|---|---|
| `topic-selection.v1a.create-topic-seed.v1` | append-only materialization; no exact replay lookup | Retrying a failed or changed attempt SHOULD use a new `node_attempt_id`; the runner MUST rely on lineage, gate, transition, and trace assertions rather than reusing a prior TopicSeed authority. |
| `topic-selection.v1a.snapshot-literature-resource-pool.v1` | append-only materialization with `snapshot_hash` as content-equivalence key | Equivalent repeated runs MAY create a new snapshot authority id but MUST produce the same `snapshot_hash`; runners MUST NOT treat `snapshot_hash` as an authority ref or skip control-plane evidence. |
| `topic-selection.v1a.create-search-plan.v1` | deterministic materialization with blueprint/schema/lineage/hash guards; no exact replay lookup | A repeated automated run SHOULD use a new `node_attempt_id`; same-attempt reuse is not a replay contract and MUST NOT bypass blueprint validation, snapshot-hash verification, or authority creation guards. |
| `topic-selection.v1a.record-search-run.v1` | append-only factual record with lineage, accounting, snapshot-membership, and handoff/loopback guards | A repeated consumable run SHOULD use a new `node_attempt_id`; failed/partial/non-consumable records remain audit facts and MUST NOT be transformed into Node 5 handoff by replay. |
| `topic-selection.v1a.build-evidence-map.v1` | materialization from a validated extraction draft/report; no exact replay lookup | Review or blocked attempts are terminal for that attempt; retries MUST use a new `node_attempt_id` and a full revised draft unless future policy adds explicit replay lookup. |
| `topic-selection.v1a.generate-need-candidate.v1` | exact replay by `workflow_run_id + node_attempt_id + input_hash` | Matching replay returns the stored discovery trace snapshot and adapter result without context recompilation, model invocation, debate execution, or authority writes; input-hash drift blocks with `REPLAY_INPUT_HASH_MISMATCH`. |
| `topic-selection.v1a.validate-need-adjudication.v1` | exact replay by `workflow_run_id + node_attempt_id + input_hash` plus duplicate adjudication protection | Matching replay returns the stored node result; changed input hash or missing replay evidence blocks before authority writes. Fresh retries use a new `node_attempt_id`. |
| `topic-selection.v1a.human-confirm-need.v1` | exact replay by `workflow_run_id + node_attempt_id + input_hash` plus duplicate/partial-write guards | Matching replay returns the stored node result; duplicate reserved-id materialization and partial confirmation writes block instead of creating alternate confirmation semantics. |
| `topic-selection.v1a.publish-v1b-input-bundle.v1` | exact replay by `workflow_run_id + node_attempt_id + input_hash`; idempotent bundle reuse by `validated_need_ref + expected_bundle_version` | Matching replay performs no bundle write; existing expected-version bundle reuse is explicit `ready` idempotency, while changed input hash blocks. |

Implementation boundary:
- N1-N5 exact replay is a future enhancement, not an implied v1a invariant.
- N1-N5 automated retries MUST be modeled as fresh attempts unless the node-specific policy is amended and code adds durable replay lookup.
- N6-N9 exact replay is implemented and test-covered today; automated E2E replay of the whole v1a chain MUST account for N1-N5 fresh-attempt semantics.

## Stub Policy Template
```yaml
policy_status: stub
node_id: TBD
authority_object: TBD
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: TBD-node-policy-detail
default_execution_mode: TBD-node-policy-detail
debate_trigger_policy: TBD-node-policy-detail
profile_escalation_policy_ref: TBD-node-policy-detail
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
automation_callability: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

## Policies

### `topic-selection.resource-sampling.create-sample-set.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.resource-sampling.create-sample-set.v1
authority_object: TopicSelectionResourceSampleSet
preconditions:
  - request payload validates against CreateTopicSelectionResourceSampleRequest.
  - topic_id is non-empty.
  - sample_size normalizes to an integer >= 1.
  - role_targets normalize to support/challenge/baseline/context totals equal to sample_size.
  - candidate pool is resolved from topic-scoped literature.
  - eligible candidates must be in_scope.
  - eligible candidates must have activationStatus active or eligible.
  - eligible candidates must have key content ready or keyContentDigest.
  - eligible candidates must have at least one source ref.
blocking_conditions:
  - malformed payload returns INVALID_PAYLOAD before sample-set creation.
  - no eligible candidates creates blocked sample set with NO_ELIGIBLE_RESOURCE_CANDIDATES.
  - classifier-wide failure creates blocked sample set with LLM_CLASSIFICATION_FAILED.
  - selected item count 0 creates blocked sample set.
  - debate unresolved or blocked creates blocked sample set when disputed candidates affect selected set identity or role target fill and no replacement exists.
  - final debate output rejected by deterministic guardrails creates blocked sample set when no replacement candidate can fill required roles.
deterministic_validators:
  - risk-heavy candidates cannot be selected as support.
  - baseline requires topic-core and benchmark/evaluation/comparison semantics.
  - topic drift becomes review or excluded.
  - selected target-role candidates must satisfy target role relevance floor.
  - broad foundation-only candidates cannot enter target roles.
  - context selection is capped by context role target.
  - fine-tuning coverage shortage emits warning rather than silently passing.
  - sample hash is derived only from policy_version, topic_id, sample_size, role_targets, seed, and selected refs/roles/ranks.
  - LLM/Codex/provider/debate output cannot bypass deterministic guardrails or role-balanced sampling.
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy:
  status: allowed
  default_roles:
    arbiter:
      multiplicity: exactly_1
      responsibilities:
        - frame issue from trigger condition.
        - route internal turns to explorer or deep_critic.
        - synthesize role summaries.
        - classify points as useful, speculative, rejected, unresolved, or guardrail-bound.
        - emit final structured debate output.
      direct_authority_write: false
    explorer:
      multiplicity: 1..N
      responsibilities:
        - expand possible value, use, role, baseline, context, and method-family interpretations.
        - respond to arbiter follow-up questions.
    deep_critic:
      multiplicity: 1..N
      responsibilities:
        - dig into risks, counterpoints, attack/failure modes, unverifiability, and topic drift.
        - respond to arbiter follow-up questions.
  non_default_roles:
    grounding_auditor: not_allowed_by_default
    evidence_auditor: requires_explicit_policy_update
  trigger_conditions:
    - support/challenge polarity conflict that may affect selected target role.
    - risk-heavy candidate is proposed as support by model-like output.
    - benchmark-first candidate conflicts between baseline and challenge.
    - role target is underfilled and review candidates contain plausible replacement evidence.
    - candidate classification can affect sample hash or selected set identity.
  non_triggers:
    - CONTEXT_CAP_APPLIED alone.
    - FINE_TUNING_UNDERCOVERED alone.
    - no eligible candidates.
    - deterministic source/key-content/scope exclusions.
    - clear topic drift that guardrails can route to review or excluded.
  internal_loop:
    shape: arbiter_led_iterative_loop
    max_rounds_default: 2
    max_rounds_maximum: 3
    max_role_agent_failures: 1
    max_total_model_failures: 2
    final_status_values: [finalize, blocked, require_human_review]
    continue_allowed_only_as_internal_turn_decision: true
    same_role_agents_merge_before_arbiter: true
  success_exit:
    - trigger issue addressed.
    - explorer expanded at least once.
    - deep_critic pressure-tested at least once.
    - arbiter output includes recommended classification impact, useful evidence points, rejected speculative points, unresolved points, guardrail hints, and confidence.
    - final output passes schema validation and deterministic guardrails.
  failure_exit:
    - max rounds exhausted without verifiable recommendation.
    - required role output malformed after retry or replacement.
    - arbiter output malformed after retry.
    - necessary evidence/source missing.
    - unresolved conflict affects selected set identity or role target fill.
    - high risk found without safe downgrade path.
    - deterministic guardrails reject final recommendation and no replacement candidate can fill required role.
  human_review_exit:
    - useful evidence exists but risk interpretation is insufficient.
    - explorer and deep_critic have strong incompatible judgments.
    - candidate materially affects selected set identity and source semantics need human judgment.
    - scope boundary issue may alter topic definition.
  no_automatic_reentry:
    - terminal debate output is final for the node attempt.
    - rerun requires explicit new workflow/node attempt with changed input hash, policy version, execution mode, human instruction, bugfix/regression purpose, or scenario-controlled new run.
profile_escalation_policy_ref: topic-selection.resource-sampling-classification.profile-escalation.v1 # superseded per T-088 D-27 (2026-07-05): 全仓零实现、无自动升级路径——显式 execution_spec/execution_plan 取代; 矩阵 Slot Map 行已同步 2026-07-06
input_contract_refs:
  - CreateTopicSelectionResourceSampleRequest
  - TopicSelectionResourceSamplingLlmOutput
  - TopicSelectionResourceCandidateClassificationDraft
  - TopicSelectionResourceRoleTargets
output_contract_refs:
  - TopicSelectionResourceSampleResult
  - TopicSelectionResourceSampleSetRecord
  - TopicSelectionResourceSampleItemRecord
  - TopicSelectionResourceSamplingAuditRecord
authority_write_boundary:
  domain_service: TopicSelectionResourceSamplingService.createResourceSampleSet
  repository: TopicSelectionResourceSamplingRepository.createResourceSampleSet
  authority_objects:
    - TopicSelectionResourceSampleSet
    - TopicSelectionResourceSampleItem
    - TopicSelectionResourceSamplingAudit
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - candidate_count
    - eligible_count
    - selected_count
    - excluded_count
    - warning_codes
    - guardrail_summary
    - prompt_template_id
    - prompt_template_version
    - model/profile refs
    - execution provenance
    - classifier structured output artifact ref
    - sample_hash
  debate_when_present:
    - issue framing
    - role agent provenance
    - role-level summaries
    - arbiter final output
    - terminal status and reason codes
  must_not_record:
    - hidden reasoning
    - provider secrets
    - unredacted raw logs outside artifact policy
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  no_eligible_candidates: persist blocked sample set and audit.
  llm_failure: persist blocked sample set with LLM_CLASSIFICATION_FAILED; no keyword fallback.
  debate_blocked: route affected candidates to review/excluded; blocked if sample cannot be filled.
  debate_require_human_review: route affected candidates to review; ready_with_warning only if selected set remains usable without them.
  guardrail_rejection: apply review/excluded/downgrade outcome before role-balanced selection.
  role_underfilled: ready_with_warning when usable selected items remain; blocked if selected item count is 0.
  persistence_conflict: fail node attempt with conflict and preserve trace/audit refs where created.
```

### `topic-selection.v1a.create-topic-seed.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.create-topic-seed.v1
authority_object: TopicSelectionTopicSeed
preconditions:
  - title_card_id resolves to an existing TitleCard.
  - intent_summary is non-empty after fallback to TitleCard brief when applicable.
  - scope_notes is present or intentionally null with traceable source context.
  - seed_version is explicit or derived by the service.
blocking_conditions:
  - missing TitleCard returns NOT_FOUND.
  - malformed payload returns INVALID_PAYLOAD before authority creation.
  - empty final intent_summary after fallback blocks with GATE_CONSTRAINT_FAILED before authority creation.
  - deterministic gate topic-selection.topic-seed-ready failure blocks before repository persistence.
  - transition title-card-to-topic-seed failure blocks before repository persistence.
deterministic_validators:
  - create-topic-seed is deterministic and MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, or debate runtime.
  - TopicSeed lineage must point to the source TitleCard.
  - input snapshot must include title, brief, status, updated_at, final intent_summary, scope_notes, and seed_version.
  - seed_kind is fixed to title_card by TopicSelectionSearchResourceService and is not accepted as caller input.
  - successful transition must create a TopicSeed authority ref.
  - duplicate/idempotency behavior must be surfaced by WorkflowHarness scenario result instead of hidden in script retries.
amendments:
  N1-AM01:
    summary: TopicSeed LLM boundary amendment.
    decision_order: node_1_amendment_not_n3_follow_up
    node_execution:
      - create-topic-seed remains deterministic with execution_mode=none.
      - Node 1 MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
    optional_pre_node_semantic_preparation:
      - Human input, Codex, provider LLM, or fixture may prepare intent_summary and scope_notes before Node 1 invocation.
      - This preparation is input drafting only and does not create TopicSelectionTopicSeed authority.
      - A future TopicSeedIntentDraft@v1 helper may be introduced as a pre-node value artifact/profile only after a Node 1 amendment locks its contract and model policy.
      - Current implementation locks no executable TopicSeed draft/review profile.
    authority_rule:
      - TopicSelectionTopicSeed is created only by TopicSelectionSearchResourceService.createTopicSeedFromTitleCard after deterministic validation and control-plane transition.
      - Node 1 freezes the final accepted intent_summary and scope_notes in the input snapshot regardless of their upstream drafting origin.
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs:
  - CreateTopicSeedFromTitleCardInput
  - TitleCard
output_contract_refs:
  - TopicSelectionTopicSeedRecord
authority_write_boundary:
  workflow_harness: TopicSelectionWorkflowHarnessService.runCreateTopicSeedScenario
  route: POST /topic-selection/v1a/topic-seeds/from-title-card
  controller: TopicSelectionV1aController.createTopicSeedFromTitleCard
  domain_service: TopicSelectionSearchResourceService.createTopicSeedFromTitleCard
  repository: TopicSelectionSearchResourceRepository.createTopicSeed
  authority_objects:
    - TopicSelectionTopicSeed
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - control-plane input snapshot.
    - readiness gate result for topic-selection.topic-seed-ready.
    - transition attempt for title-card-to-topic-seed.
    - harness trace artifact with scenario_id, node_id, workflow_run_id, node_attempt_id, status, authority refs, audit refs, blockers, and assertions.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
automation_callability:
  status: callable
  runner: TopicSelectionWorkflowHarnessService.runCreateTopicSeedScenario
  stable_node_input: TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput
  stable_node_result: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult
  scenario_invocation:
    node_id: topic-selection.v1a.create-topic-seed.v1
    script_local_choreography_required: false
  authority_boundary_preserved: true
  blocked_result_shape: true
  trace_artifact: WorkflowHarnessCreateTopicSeedScenarioTrace@v1
  remaining_gaps:
    - scenario registry dispatch does not yet call this runner directly; current coverage is service-level WorkflowHarness unit tests.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_title_card: return NOT_FOUND before control-plane transition.
  empty_final_intent: return GATE_CONSTRAINT_FAILED before TopicSeed id allocation and repository persistence.
  gate_or_transition_failed: block before repository persistence.
  repository_failure: fail the node attempt without creating downstream v1a authority.
```

### `topic-selection.v1a.snapshot-literature-resource-pool.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.snapshot-literature-resource-pool.v1
authority_object: TopicSelectionLiteratureResourcePoolSnapshot
semantic_boundary:
  - The node only materializes a TopicSelectionLiteratureResourcePoolSnapshot authority.
  - The node MUST NOT perform resource sampling, literature selection, evidence-role classification, or evidence-polarity judgment.
  - Any ResourceSampleSet must be upstream provenance only after its selected literature has already been attached to the TitleCard evidence basket.
amendments:
  N2-AM01:
    summary: Literature resource pool snapshot LLM boundary confirmation.
    decision_order: node_2_amendment_not_n3_follow_up
    node_execution:
      - snapshot-literature-resource-pool remains deterministic with execution_mode=none.
      - Node 2 MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
    semantic_routing:
      - Resource sampling and selected-literature semantics belong upstream before the evidence basket is frozen.
      - Evidence-role classification, evidence-polarity judgment, and deeper evidence interpretation belong upstream resource sampling or downstream evidence/need nodes.
      - Node 2 only snapshots traceable resource state from the normalized source scope.
normalized_harness_source_scope:
  supported:
    - title_card_evidence_basket
  unsupported_compat_values:
    - manual_selection
    - search_result
  blocked_code: UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A
resource_quality_gate_policy:
  blocking_scope: traceability_and_authority_creation_only
  must_block:
    - missing TopicSeed.
    - TopicSeed/title-card lineage mismatch.
    - empty TitleCard evidence basket.
    - evidence-basket literature id that cannot resolve to a Literature record.
    - unsupported normalized harness source_scope.
    - failed control-plane readiness gate or transition.
  must_warn:
    - incomplete key-content readiness.
    - incomplete abstract readiness.
    - low source_count.
    - incomplete pipeline readiness.
    - stale or duplicate pipeline status.
    - incomplete fulltext readiness.
  warning_sink: source_health_summary.warning_codes
snapshot_hash_policy:
  purpose: content_replay_identity
  must_include:
    - title_card_id.
    - topic_seed_ref.
    - source_scope.
    - evidence basket updated_at.
    - evidence-basket-derived literature_refs.
    - content_source_refs.
    - source_health_summary.
    - policy_version_id.
  must_exclude:
    - literature_resource_pool_snapshot_id.
    - input_snapshot_id.
    - gate_result_id.
    - transition_attempt_id.
    - harness trace artifact id.
    - created_at.
    - created_by.
  replay_semantics:
    - Same TopicSeed, same evidence basket state, same source health summary, same source scope, and same policy_version_id MUST produce the same snapshot_hash.
    - Different control-plane/audit ids across repeated runs MUST NOT change snapshot_hash.
    - Different resource contents, source health summary, source scope, or policy_version_id SHOULD change snapshot_hash.
workflow_harness_runner_contract:
  target_runner: TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario
  implementation_status: implemented
  authority_service: TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot
  direct_repository_write_allowed: false
  script_local_choreography_allowed: false
  node_input_type: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput
  node_result_type: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult
  success_result_must_include:
    - literature_resource_pool_snapshot_ref.
    - snapshot_version.
    - snapshot_hash.
    - included_literature_refs.
    - content_source_refs.
    - source_health_summary.
    - control_plane_refs.
    - harness_trace_artifact_ref.
  blocked_result_must_include:
    - status=blocked.
    - blocker_codes.
    - normalized node_input.
    - no TopicSelectionLiteratureResourcePoolSnapshot authority refs.
    - harness_trace_artifact_ref when trace recording is available.
audit_trace_boundary:
  control_plane_role: authoritative_audit_facts
  harness_trace_role: automation_execution_evidence
  trace_schema: WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1
  separation_rule:
    - control-plane input snapshot, readiness gate, and transition attempt remain the authoritative audit facts.
    - harness trace artifact MUST NOT replace control-plane audit refs.
    - control-plane refs and harness trace refs MAY cross-reference each other for replay/debug.
  trace_must_record:
    - scenario_id.
    - node_id.
    - workflow_run_id.
    - node_attempt_id.
    - normalized node_input.
    - normalized node_result.
    - snapshot_hash.
    - source_health_summary.
    - authority_refs.
    - control_plane_refs.
    - blocker_codes.
    - warning_codes.
    - assertions.
  trace_must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw LLM transcript.
    - raw debate transcript.
search_plan_handoff_policy:
  downstream_node: topic-selection.v1a.create-search-plan.v1
  frozen_authority_ref_required: true
  must_handoff:
    - literature_resource_pool_snapshot_ref.
    - snapshot_version.
    - snapshot_hash.
    - source_scope.
    - literature_refs.
    - content_source_refs.
    - source_health_summary.
  downstream_must_not_read_as_resource_truth:
    - mutable TitleCard evidence basket.
    - ResourceSampleSet.
    - caller-supplied selected literature refs.
    - current search results.
  replay_rule:
    - SearchPlan must be based on the supplied LiteratureResourcePoolSnapshot authority, not the current mutable evidence basket state.
    - If the evidence basket changes after snapshot creation, a new LiteratureResourcePoolSnapshot must be created before those changes can affect SearchPlan.
    - snapshot_hash is an assertion/replay check and must not replace the snapshot authority ref.
idempotency_policy:
  default_mode: append_only
  authority_id_reuse: false
  content_equivalence_key: snapshot_hash
  repeated_equivalent_run:
    - MAY create a new LiteratureResourcePoolSnapshot authority id.
    - MUST produce the same snapshot_hash when TopicSeed, evidence basket state, source scope, source health summary, and policy_version_id are equivalent.
    - MUST record a distinct execution/audit trail for the new attempt.
  must_not:
    - silently reuse an existing snapshot authority by hash.
    - treat snapshot_hash as the authority ref.
    - skip control-plane gate/transition evidence because an equivalent hash already exists.
  future_reuse_mode:
    - Any reuse_existing_snapshot_by_hash behavior requires an explicit policy and runner input flag in a future slice.
implementation_readiness_review:
  status: implemented_callable
  complexity: moderate_bounded
  rationale:
    - The node is deterministic and does not require AgentOrchestrator, provider LLM, Codex, or debate runtime.
    - Existing route, service, repository, control-plane gate, and transition boundaries already cover the authority write path.
    - The remaining work is harness normalization, trace assembly, hash/source-health hardening, and focused service/runner tests.
  non_goals:
    - do not implement alternate source_scope resolvers.
    - do not implement resource sampling or evidence-role classification.
    - do not implement reuse_existing_snapshot_by_hash.
    - do not make SearchPlan read mutable evidence basket state as resource truth.
  closed_implementation_gaps:
    - runSnapshotLiteratureResourcePoolScenario implemented.
    - service snapshot_hash aligned with the locked content_replay_identity payload.
    - source_health_summary.warning_codes expanded for maturity warnings without turning them into blockers.
    - runner trace schema and success/blocked assertions implemented.
    - blocked missing-literature results preserve control-plane audit refs created before repository persistence is skipped.
    - normalized runner requires concrete TopicSeed refs with version and title-card lineage.
  callable_promotion_evidence:
    - stable normalized input/result types exist.
    - unsupported source_scope blocks before authority creation in the harness path.
    - success and blocked result tests pass.
    - hash stability and append-only repeated-run tests pass.
    - source-health warning non-blocking tests pass.
    - SearchPlan handoff assertion tests pass.
preconditions:
  - topic_seed_id resolves to a TopicSeed under the same title_card_id.
  - title-card evidence basket is the single normalized source of included literature for this node.
  - title-card evidence basket contains at least one literature item for the current source_scope.
  - literature records and source records are resolvable or reported through source_health_summary.
blocking_conditions:
  - missing TopicSeed returns NOT_FOUND.
  - TopicSeed title-card mismatch returns VERSION_CONFLICT.
  - empty evidence basket blocks with GATE_CONSTRAINT_FAILED.
  - unresolved evidence-basket literature id blocks with MISSING_LITERATURE_RECORD before snapshot authority creation.
  - normalized harness input with source_scope other than title_card_evidence_basket blocks with UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A.
  - deterministic gate topic-selection.literature-snapshot-ready failure blocks before repository persistence.
  - transition topic-seed-to-literature-snapshot failure blocks before repository persistence.
deterministic_validators:
  - snapshot-literature-resource-pool is deterministic and MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, or debate runtime.
  - included literature refs must be derived from the TitleCard evidence basket, not directly from ResourceSampleSet, SearchResult, or caller-supplied selected refs.
  - resource sampling and evidence-role decisions must be completed before this node and reflected through the evidence basket if they are relevant.
  - source_scope must remain explicit; normalized harness execution supports only title_card_evidence_basket while route-level enum compatibility may retain manual_selection and search_result.
  - snapshot hash must be derived from title_card_id, TopicSeed ref, source_scope, basket timestamp, literature refs, source refs, source health summary, and policy_version_id.
  - snapshot hash must not include repository-generated ids, control-plane ids, harness trace artifact ids, created_at, or created_by.
  - repeated equivalent runs may create distinct snapshot authorities, but content equivalence must be visible through the same snapshot_hash.
  - missing literature records must become source-health/blocker diagnostics, not silent omission.
  - key-content, abstract, source-count, pipeline-readiness, stale/duplicate, and fulltext-readiness issues are diagnostic warnings at this node unless they also break traceability.
  - snapshot lineage must point to the TopicSeed and included literature/source refs.
  - downstream SearchPlan must consume the LiteratureResourcePoolSnapshot authority and must not infer resources from the current mutable evidence basket.
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs:
  - CreateLiteratureResourcePoolSnapshotInput
  - TopicSelectionTopicSeedRecord
  - TitleCardEvidenceBasket
output_contract_refs:
  - TopicSelectionLiteratureResourcePoolSnapshotRecord
authority_write_boundary:
  route: POST /topic-selection/v1a/literature-resource-pool-snapshots
  controller: TopicSelectionV1aController.createLiteratureResourcePoolSnapshot
  domain_service: TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot
  repository: TopicSelectionSearchResourceRepository.createLiteratureResourcePoolSnapshot
  workflow_harness_runner: TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario
  authority_objects:
    - TopicSelectionLiteratureResourcePoolSnapshot
  workflow_harness_direct_write: false
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
automation_callability:
  status: callable
  target_runner: TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario
  stable_input_type: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput
  stable_result_type: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult
  script_local_choreography_required: false
  blocked_result_shape: true
  trace_artifact: WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1
  remaining_gaps: []
audit_artifact_policy:
  must_record:
    - control-plane input snapshot with TopicSeed, evidence-basket-derived literature refs, and source refs.
    - readiness gate result for topic-selection.literature-snapshot-ready.
    - transition attempt for topic-seed-to-literature-snapshot.
    - snapshot_hash.
    - source_health_summary.
    - harness trace artifact using WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1 once normalized.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw LLM transcript.
    - raw debate transcripts.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_topic_seed: return NOT_FOUND.
  lineage_conflict: return VERSION_CONFLICT.
  unsupported_source_scope_for_normalized_v1a: return blocked harness result with UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A before authority creation.
  unresolved_literature_record: return blocked harness result with MISSING_LITERATURE_RECORD before authority creation.
  downstream_handoff_conflict: downstream SearchPlan must block with VERSION_CONFLICT if the supplied snapshot authority does not match TopicSeed/title-card lineage.
  empty_source_scope: block with GATE_CONSTRAINT_FAILED.
  gate_or_transition_failed: block before repository persistence.
  repository_failure: fail the node attempt without creating downstream v1a authority.
```

### `topic-selection.v1a.create-search-plan.v1`
```yaml
policy_status: draft
node_id: topic-selection.v1a.create-search-plan.v1
authority_object: TopicSelectionSearchPlan
locked_decisions:
  N3-D01:
    status: locked
    summary: SearchPlan authority materialization boundary only.
    semantic_boundary:
      - The node only materializes a caller-supplied SearchPlan blueprint as TopicSelectionSearchPlan plus TopicSelectionCoverageRowIntent authorities.
      - The node MUST NOT execute retrieval.
      - The node MUST NOT build EvidenceMap.
      - The node MUST NOT judge evidence roles or evidence polarity.
      - The node MUST NOT generate research content.
      - The node MUST NOT call AgentOrchestrator, BackendLlmGateway, provider LLMs, Codex, or debate runtime.
    normalized_resource_truth:
      - The normalized harness path consumes the LiteratureResourcePoolSnapshot authority produced by Node 2.
      - The normalized harness path MUST NOT re-read the mutable TitleCard evidence basket, ResourceSampleSet, caller-supplied selected literature refs, or current search results as resource truth.
    normalized_coverage_policy:
      - Explicit coverage_intents are required in the normalized harness input.
      - Service/route compatibility behavior that derives support-only coverage rows from query_intents MAY remain.
      - Compatibility default coverage MUST NOT be treated as normalized automated v1a behavior.
  N3-D02:
    status: locked
    summary: SearchPlan blueprint is a module-level explicit upstream input, not generated by Node 3.
    blueprint_source_policy:
      - Node 3 validates and materializes a supplied SearchPlan blueprint.
      - Node 3 MUST NOT generate a SearchPlan blueprint from TopicSeed, LiteratureResourcePoolSnapshot, TitleCard, ResourceSampleSet, selected literature refs, or search results.
      - Node 3 MUST NOT call a model-like executor to draft the blueprint.
    module_contract_policy:
      - TopicSelectionSearchPlanBlueprint is a topic-selection module-level value contract.
      - The minimum blueprint contract must be defined once and reused by Node 3, WorkflowScenario fixtures, human/Codex-assisted inputs, and any future blueprint-generation node.
      - Node 3 must not define or accept a node-private incompatible blueprint variant.
      - The blueprint is not a standalone authority object in the initial normalization slice; it is frozen in Node 3 input snapshot and harness trace.
    allowed_blueprint_origins:
      - WorkflowScenario or test fixture.
      - Human-authored local input.
      - Codex-assisted local drafting before node invocation.
      - Future separately defined upstream blueprint-generation node.
    provenance_policy:
      - Blueprint origin MAY be recorded as provenance refs or trace metadata.
      - Provenance refs do not become resource truth and do not replace the LiteratureResourcePoolSnapshot authority.
    future_generation_boundary:
      - Automatic blueprint generation requires a separate node such as topic-selection.v1a.draft-search-plan-blueprint.v1.
      - That node must define its own execution mode, model policy, input context, output contract, and verification before Node 3 consumes its result.
  N3-D03:
    status: locked
    summary: TopicSelectionSearchPlanBlueprint@v1 minimum module contract.
    blueprint_minimum_fields:
      - schema_version.
      - blueprint_origin.
      - blueprint_provenance_refs.
      - title_card_ref.
      - topic_seed_ref.
      - literature_resource_pool_snapshot_ref.
      - expected_snapshot_hash.
      - plan_version.
      - parent_search_plan_ref.
      - recheck_request_ref.
      - query_intents.
      - coverage_intents.
      - must_check_constraints.
      - exclusion_rules.
      - coverage_strategy.
      - role_coverage_expectation.
      - policy_version.
      - output_schema_version.
    coverage_intent_required_fields:
      - coverage_key.
      - intent_type.
      - query.
      - rationale.
      - required.
      - priority.
      - expected_evidence_role.
      - target_source_types.
      - refs.
    coverage_intent_optional_empty_arrays:
      - target_source_types.
      - refs.
    consumer_fit_review:
      - Node 3 maps the blueprint to CreateSearchPlanInput and coverage row authorities.
      - Node 4 uses persisted coverage row ids and semantics for observations, bindings, assessments, and risk acceptances.
      - EvidenceMap preserves coverage_row_intent_ref lineage from SearchRun bindings.
      - NeedCandidate generation consumes EvidenceMap role bundles and does not need blueprint internals.
      - Future blueprint-generation nodes can produce the same contract without adding a parallel shape.
  N3-D04:
    status: locked
    summary: SearchPlanBlueprint draft/review model profile policy with Codex default.
    node_boundary:
      - topic-selection.v1a.create-search-plan.v1 remains deterministic with execution_mode=none.
      - Blueprint draft/review profiles run before Node 3 and do not write SearchPlan authority.
      - Model-like blueprint output must pass TopicSelectionSearchPlanBlueprint@v1 schema validation and Node 3 deterministic validators before authority creation.
    execution_modes:
      default_execution_mode: codex_assisted
      allowed_execution_modes:
        - codex_assisted
        - provider_llm
        - mocked_llm
      mocked_llm_scope: test_and_acceptance_only
      provider_llm_scope: explicit_operator_upgrade_or_provider_quality_scenario
    draft_profile:
      profile_id: topic-selection.search-plan-blueprint.draft.v1
      profile_function: search_plan_blueprint_drafting
      role_family: single_agent
      stage_family: blueprint_draft
      output_contract: TopicSelectionSearchPlanBlueprint@v1
      default_execution_mode: codex_assisted
      normalized_params:
        creativity: medium
        reasoning_depth: high
        output_budget: large
        structured_output_required: true
        output_format: json_schema
      model_options:
        - option_id: topic-selection.search-plan-blueprint.draft.v1.openai-balanced
          option_purpose: default_balanced_provider_run
          provider_id: openai
          model_id: gpt-5.5
          timeout_ms: 120000
        - option_id: topic-selection.search-plan-blueprint.draft.v1.openai-high-accuracy
          option_purpose: high_accuracy_explicit_provider_run
          provider_id: openai
          model_id: gpt-5.5
          timeout_ms: 180000
        - option_id: topic-selection.search-plan-blueprint.draft.v1.dashscope-budget
          option_purpose: budget_sensitive_explicit_provider_run
          provider_id: dashscope
          model_id: qwen3.6-plus
          timeout_ms: 120000
          provider_overrides:
            enable_thinking: true
    review_profile:
      profile_id: topic-selection.search-plan-blueprint.review.v1
      profile_function: search_plan_blueprint_review
      role_family: single_agent
      stage_family: blueprint_review
      output_contract: TopicSelectionSearchPlanBlueprintReview@v1
      default_execution_mode: codex_assisted
      normalized_params:
        creativity: low
        reasoning_depth: high
        output_budget: medium
        structured_output_required: true
        output_format: json_schema
      model_options:
        - option_id: topic-selection.search-plan-blueprint.review.v1.openai-balanced
          option_purpose: default_balanced_provider_run
          provider_id: openai
          model_id: gpt-5.5
          timeout_ms: 90000
        - option_id: topic-selection.search-plan-blueprint.review.v1.openai-high-accuracy
          option_purpose: high_accuracy_explicit_provider_run
          provider_id: openai
          model_id: gpt-5.5
          timeout_ms: 150000
        - option_id: topic-selection.search-plan-blueprint.review.v1.dashscope-budget
          option_purpose: budget_sensitive_explicit_provider_run
          provider_id: dashscope
          model_id: qwen3.6-plus
          timeout_ms: 120000
          provider_overrides:
            enable_thinking: true
    fallback_and_audit:
      automatic_provider_fallback: false
      manual_rerun_allowed: true
      explicit_model_option_override_allowed: true
      codex_source_kind: codex_response
      provider_source_kind: provider_response
      store_raw_provider_response: false
      forbid_hidden_reasoning: true
      deepseek_status: not_available_until_registered_provider
  N3-D05:
    status: locked
    summary: WorkflowHarness normalized runner contract blocks permissive fallback semantics.
    runner_contract:
      target_runner: TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario
      implementation_status: implemented
      normalized_input_contract:
        - TopicSelectionSearchPlanBlueprint@v1.
        - scenario_id.
        - scenario_case_id.
        - workspace_id.
        - workflow_run_id.
        - node_attempt_id.
        - created_by.
      normalized_result_contract:
        success:
          - status=succeeded.
          - search_plan_ref.
          - coverage_row_intent_refs.
          - plan_version.
          - query_intents.
          - must_check_constraints.
          - exclusion_rules.
          - control_plane_refs.
          - workflow_run_ref.
          - harness_trace_artifact_ref.
        blocked:
          - status=blocked.
          - blocker_codes.
          - normalized node_input.
          - no TopicSelectionSearchPlan authority refs.
          - no TopicSelectionCoverageRowIntent authority refs.
          - harness_trace_artifact_ref when trace recording is available.
    strict_pre_service_validation:
      - topic_seed_ref and literature_resource_pool_snapshot_ref must be concrete refs with versions and matching title_card_id.
      - resolved TopicSeed must belong to title_card_id.
      - resolved LiteratureResourcePoolSnapshot must belong to title_card_id and trace to the resolved TopicSeed.
      - expected_snapshot_hash must equal the resolved LiteratureResourcePoolSnapshot.snapshot_hash.
      - query_intents must be present and non-empty after normalization.
      - coverage_intents must be explicitly present and non-empty after normalization.
      - method_family_targets must be explicitly present and non-empty after normalization.
      - every coverage_intent must include coverage_key, intent_type, query, rationale, required, priority, expected_evidence_role, target_source_types, and refs.
      - target_source_types and refs may be empty arrays but must not be omitted.
    fallback_policy:
      route_service_compatibility_fallback_allowed: true
      normalized_harness_fallback_allowed: false
      forbidden_in_normalized_harness:
        - deriving coverage rows from query_intents.
        - defaulting expected_evidence_role to support.
        - defaulting coverage_key from row index.
        - defaulting priority from row index.
        - defaulting rationale to a generated generic sentence.
        - accepting omitted target_source_types or refs.
    authority_write_boundary:
      authority_service: TopicSelectionSearchResourceService.createSearchPlan
      direct_repository_write_allowed: false
      partial_authority_allowed_on_blocked_result: false
    trace_contract:
      trace_schema: WorkflowHarnessCreateSearchPlanScenarioTrace@v1
      trace_must_record:
        - scenario_id.
        - node_id.
        - workflow_run_id.
        - node_attempt_id.
        - normalized node_input.
        - normalized node_result.
        - blueprint_origin.
        - blueprint_provenance_refs.
        - expected_snapshot_hash.
        - resolved_snapshot_hash.
        - query_intents.
        - coverage_intents.
        - method_family_targets.
        - search_plan_ref.
        - coverage_row_intent_refs.
        - control_plane_refs.
        - blocker_codes.
        - warning_codes.
        - assertions.
      trace_must_not_record:
        - hidden reasoning.
        - provider secrets.
        - raw provider logs.
        - raw LLM transcript.
        - raw debate transcript.
  N3-D06:
    status: locked
    summary: Implementation readiness and callable promotion for strict SearchPlan runner.
    implementation_readiness_review:
      status: implemented_callable
      complexity: moderate_bounded
      rationale:
        - Existing route, service, repository, control-plane workflow, gate, transition, and coverage-row persistence paths are reused.
        - No DB migration, provider LLM, Codex runtime, debate runtime, or new route is required.
        - The new behavior is isolated in WorkflowHarness strict pre-service validation, blueprint snapshot freezing, and trace assembly.
      closed_implementation_gaps:
        - TopicSelectionSearchPlanBlueprint@v1 shared contract and JSON schema added.
        - runCreateSearchPlanScenario implemented.
        - Strict blueprint schema, lineage, snapshot-hash, query-intent, coverage-intent, and fallback-blocking validators implemented.
        - WorkflowHarnessCreateSearchPlanScenarioTrace@v1 trace artifact implemented.
        - Full SearchPlan blueprint is frozen in normalized node input, service input snapshot, and harness trace.
        - TopicSeed intent preparation provenance refs can be recorded without changing Node 1 execution mode.
        - ResourceSampleSet provenance refs can be recorded for Node 2 without changing snapshot resource truth or snapshot_hash.
      callable_promotion_evidence:
        - successful strict-blueprint SearchPlan creation test passes.
        - malformed blueprint schema version blocked test passes.
        - missing blueprint blocked test passes.
        - snapshot hash drift blocked test passes.
        - omitted coverage intents blocked test passes.
        - fallback-derived coverage semantics blocked test passes.
        - lineage mismatch blocked test passes.
        - blocked paths return no SearchPlan or CoverageRow authority refs.
    automation_callability:
      status: callable
      runner: TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario
      stable_node_input: TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput
      stable_node_result: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult
      trace_artifact: WorkflowHarnessCreateSearchPlanScenarioTrace@v1
      script_local_choreography_required: false
  N3-D07:
    status: locked
    summary: SearchPlan blueprint owns topic-level method-family targets for downstream coverage-gap warnings.
    contract_scope:
      field: method_family_targets
      owner_contract: TopicSelectionSearchPlanBlueprint@v1
      contract_level: module_level_value_contract
      persistence_location: TopicSelectionSearchPlanRecord.coverage_strategy.method_family_targets
      db_migration_required: false
    rationale:
      - Method-family expectations are part of the selected topic/search strategy, not a private Node 6 heuristic.
      - N6 can warn about uncovered mentioned method families only if N3/N4/N5 carry the intended target set forward.
      - Keeping the field on the module-level SearchPlan blueprint avoids a second SearchPlan-blueprint shape in the WorkflowHarness script.
    propagation_rule:
      - Node 3 validates and freezes non-empty method_family_targets in the SearchPlan blueprint.
      - Node 3 stores the normalized targets in SearchPlan coverage_strategy.
      - Node 4 reads the resolved SearchPlan and emits the targets in TopicSelectionSearchRunHandoff@v1.
      - Node 5 copies the targets into TopicSelectionEvidenceMapHandoff@v1 and includes them in the handoff/input refs hash.
      - Node 6 compiles the targets into search_coverage_digest.method_family_targets and admission checks METHOD_FAMILY_COVERAGE_GAP against this target set.
    dual_track_controls:
      - Route/service compatibility may continue accepting coverage_strategy, but normalized WorkflowHarness execution requires top-level blueprint method_family_targets.
      - Backend must not hard-code fine_tuning, hybrid, RAG, or any other method family when the SearchPlan target set is absent.
      - Method-family target order is not semantically meaningful; replay/drift checks should compare normalized sets or hashes, not raw array order.
    failure_semantics:
      - Missing or empty method_family_targets blocks normalized Node 3 before SearchPlan authority creation.
      - Malformed targets return INVALID_PAYLOAD or GATE_CONSTRAINT_FAILED according to the validation layer.
preconditions:
  - topic_seed_id resolves under title_card_id.
  - literature_resource_pool_snapshot_id resolves under title_card_id.
  - snapshot.topic_seed_ref matches the requested TopicSeed.
  - supplied snapshot_hash expectation matches the resolved LiteratureResourcePoolSnapshot.
  - SearchPlan blueprint is explicitly supplied by the caller.
  - SearchPlan blueprint schema_version is exactly TopicSelectionSearchPlanBlueprint@v1.
  - SearchPlan blueprint satisfies TopicSelectionSearchPlanBlueprint@v1.
  - query_intents are non-empty after normalization.
  - coverage_intents are explicitly supplied and non-empty after normalization.
  - method_family_targets are explicitly supplied and non-empty after normalization.
blocking_conditions:
  - missing TopicSeed or LiteratureResourcePoolSnapshot returns NOT_FOUND.
  - TopicSeed/Snapshot/title-card lineage mismatch returns VERSION_CONFLICT.
  - snapshot_hash mismatch returns VERSION_CONFLICT before SearchPlan authority creation.
  - missing SearchPlan blueprint blocks before SearchPlan authority creation.
  - malformed SearchPlan blueprint blocks before SearchPlan authority creation.
  - empty or blank query intent blocks with GATE_CONSTRAINT_FAILED.
  - empty or blank coverage intent blocks with GATE_CONSTRAINT_FAILED.
  - empty or missing method_family_targets blocks before SearchPlan authority creation.
  - missing coverage intent required field blocks with INVALID_PAYLOAD before SearchPlan authority creation.
  - omitted coverage_intents in the normalized harness path blocks before SearchPlan authority creation.
  - deterministic gate topic-selection.search-plan-ready failure blocks before repository persistence.
  - transition literature-snapshot-to-search-plan failure blocks before repository persistence.
deterministic_validators:
  - create-search-plan is deterministic in the current v1a normalization slice.
  - future model-like SearchPlan drafting requires an explicit T-089 policy update before implementation.
  - SearchPlan blueprint generation is out of scope for this node.
  - SearchPlanBlueprint draft/review model profiles are upstream blueprint-production or review aids, not Node 3 executors.
  - SearchPlan blueprint validation uses the module-level TopicSelectionSearchPlanBlueprint@v1 contract.
  - normalized harness coverage row intents must come from explicit coverage_intents, not from service fallback defaults.
  - each coverage row must preserve expected evidence role, query, priority, required flag, and refs.
  - must-check constraints and exclusion rules must be persisted with SearchPlan.
  - workflow profile remains deterministic-contract unless a future policy version changes it.
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs:
  - TopicSelectionSearchPlanBlueprint
  - CreateSearchPlanInput
  - TopicSelectionTopicSeedRecord
  - TopicSelectionLiteratureResourcePoolSnapshotRecord
  - TopicSelectionCoverageRowIntentRecord input shape
output_contract_refs:
  - TopicSelectionSearchPlanRecord
  - TopicSelectionCoverageRowIntentRecord
authority_write_boundary:
  route: POST /topic-selection/v1a/search-plans
  controller: TopicSelectionV1aController.createSearchPlan
  domain_service: TopicSelectionSearchResourceService.createSearchPlan
  repository: TopicSelectionSearchResourceRepository.createSearchPlanWithCoverageIntents
  authority_objects:
    - TopicSelectionSearchPlan
    - TopicSelectionCoverageRowIntent
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - control-plane input snapshot with TopicSeed, Snapshot refs, and complete TopicSelectionSearchPlanBlueprint@v1 payload.
    - deterministic workflow run for topic-selection.search-plan-draft.
    - readiness gate result for topic-selection.search-plan-ready.
    - transition attempt for literature-snapshot-to-search-plan.
    - coverage row count and artifact refs.
    - harness trace artifact once normalized.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_upstream_ref: return NOT_FOUND.
  lineage_conflict: return VERSION_CONFLICT.
  snapshot_hash_mismatch: return VERSION_CONFLICT before authority creation.
  missing_blueprint: block before authority creation.
  coverage_gap: block with GATE_CONSTRAINT_FAILED before repository persistence.
  gate_or_transition_failed: block before repository persistence.
  repository_failure: fail the node attempt without partial SearchPlan/CoverageRow authority semantics.
```

### `topic-selection.v1a.record-search-run.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.record-search-run.v1
authority_object: TopicSelectionSearchRun
preconditions:
  - search_plan_id resolves under title_card_id.
  - SearchPlan resolves to its LiteratureResourcePoolSnapshot.
  - coverage observations, evidence bindings, assessments, and risk acceptances refer only to rows under the SearchPlan.
  - evidence_map_input_refs are non-empty when the run is intended to feed EvidenceMap.
semantic_boundary:
  - record-search-run records an already-produced search/import/manual-result fact.
  - record-search-run is not the search execution node and does not call search providers.
  - search execution failure is a valid SearchRun fact when the record contract is valid.
  - Node 4 blocked means the SearchRun record contract is invalid or unsafe to persist.
  - failed SearchRun records are audit facts only and MUST NOT produce a consumable Node 5 EvidenceMap handoff.
normalized_input_contract:
  contract_name: TopicSelectionSearchRunRecordBundle@v1
  contract_kind: module_level_value_contract
  persistence_kind: non_authority_input_bundle
  dual_track_rule:
    - The bundle is the normalized harness input for Node 4.
    - The bundle must map losslessly to the existing RecordSearchRunInput service call.
    - The existing TopicSelectionSearchResourceService.recordSearchRun remains the only SearchRun authority writer.
    - Route payload compatibility may remain only when it uses the same fields and semantics; it must not become a second product contract.
  required_fields:
    - schema_version.
    - title_card_ref.
    - search_plan_ref.
    - literature_resource_pool_snapshot_ref.
    - expected_literature_snapshot_hash.
    - run_kind.
    - run_status.
    - query_provenance.
    - result_accounting.
    - source_health_summary.
    - dedup_summary.
    - evidence_map_input_refs.
    - coverage_observations.
    - evidence_bindings.
    - coverage_assessments.
    - coverage_risk_acceptances.
    - raw_log_artifact_ref_or_payload.
    - policy_version.
    - output_schema_version.
  forbidden_fields:
    - evidence_units.
    - selected_need_candidate.
    - TopicQuestionContract.
    - topic_value_assessment.
    - hidden_reasoning.
    - provider_secret.
  version_guard_rule:
    - SearchPlan version is asserted only by search_plan_ref.version_id; no duplicate expected_search_plan_version field is allowed.
    - LiteratureResourcePoolSnapshot version is asserted only by literature_resource_pool_snapshot_ref.version_id.
    - expected_literature_snapshot_hash is a replay/currentness guard over the resolved LiteratureResourcePoolSnapshot contents, not a replacement for the concrete snapshot ref.
  minimum_validation_rules:
    - title_card_ref.ref_type must be title_card and title_card_ref.ref_id must equal title_card_id.
    - search_plan_ref.ref_type must be search_plan and search_plan_ref.version_id must be non-empty.
    - literature_resource_pool_snapshot_ref.ref_type must be literature_resource_pool_snapshot and version_id must be non-empty.
    - resolved SearchPlan title_card_id and plan_version must match title_card_ref and search_plan_ref.version_id.
    - resolved SearchPlan.literature_snapshot_ref must match literature_resource_pool_snapshot_ref.
    - resolved LiteratureResourcePoolSnapshot snapshot_version and snapshot_hash must match literature_resource_pool_snapshot_ref.version_id and expected_literature_snapshot_hash.
    - all coverage_observations, evidence_bindings, coverage_assessments, and coverage_risk_acceptances must reference coverage rows owned by the resolved SearchPlan.
    - evidence_map_input_refs must use only SearchRun-supported authority/provenance refs: literature_record, literature_source, literature_abstract, fulltext_document, fulltext_section, fulltext_paragraph, fulltext_anchor, or manual_locator.
    - evidence_bindings[].literature_ref must be literature_record.
    - evidence_bindings[].source_refs must be literature_source or locator-provenance refs only.
    - run_status succeeded or partial requires non-empty evidence_map_input_refs and may emit a Node 5 handoff when all lineage checks pass.
    - run_status failed may use empty evidence_map_input_refs, must set consumable_for_evidence_map=false, and must not emit a Node 5 handoff.
    - raw search logs may be stored only as redacted artifact/audit payload or artifact_ref/raw_search_log refs and must not appear in evidence_map_input_refs.
    - coverage_risk_acceptances[].accepted_risk_ref must be accepted_risk or search_coverage_risk, not a generic coverage row/ref.
  result_accounting_rules:
    - result accounting is an audit-fact integrity check, not a topic-value judgment.
    - total_result_count must be >= unique_literature_count and both must be >= 0.
    - total_result_count must be >= duplicate_result_count + unique_literature_count.
    - failed_source_count and skipped_source_count must be >= 0.
    - distinct literature_ref.ref_id count from evidence_bindings must be <= unique_literature_count.
    - run_status succeeded requires failed_source_count=0.
    - run_status succeeded with total_result_count > 0 requires at least one coverage observation or evidence binding.
    - run_status partial allows failed or skipped sources, but source_health_summary must expose warning/error evidence for the partial condition.
    - run_status failed may use unique_literature_count=0 and empty evidence bindings, but source_health_summary must expose an error or failure summary.
  controlled_semantic_metadata:
    allowed_scope: search_coverage_provenance_semantics
    allowed_fields:
      - query_provenance.
      - source_health_summary.
      - dedup_summary.
      - coverage_observations[].missing_reason_codes.
      - coverage_observations[].notes.
      - coverage_assessments[].verdict.
      - coverage_assessments[].issue_codes.
      - coverage_risk_acceptances for search coverage risk only.
    forbidden_fields:
      - evidence_role.
      - evidence_polarity.
      - evidence_strength.
      - need_candidate_ref.
      - validated_need_ref.
      - topic_question_contract_ref.
      - topic_value_score.
      - claim_support_verdict.
      - claim_risk_acceptance.
    semantic_boundary:
      - Node 4 may record lightweight coverage/search provenance semantics needed to audit retrieval execution.
      - Node 4 must not perform research-evidence interpretation, topic-value assessment, NeedCandidate support, or claim judgment.
  optional_bundle_draft_review_layer:
    status: allowed_pre_node_input_preparation
    node_execution_unchanged: deterministic_none
    profile_pattern: follows_node3_blueprint_draft_review_pattern
    candidate_profiles:
      - topic-selection.search-run-record-bundle.draft.v1
      - topic-selection.search-run-record-bundle.review.v1
    default_execution_mode: codex_assisted
    provider_execution: explicit_upgrade_or_provider_quality_scenario_only
    mocked_llm: test_acceptance_only
    output_contract: TopicSelectionSearchRunRecordBundle@v1
    hard_rules:
      - Model-like execution may draft or review the bundle only before Node 4 invocation.
      - Model-like output must pass the bundle schema and Node 4 deterministic validators before SearchRun authority creation.
      - Model-like execution must not create SearchRun, coverage records, EvidenceMap, EvidenceUnit, NeedCandidate, or topic-value authority.
      - Automatic provider fallback is disabled; manual rerun or explicit model-option override is required.
      - LLM failure must not silently downgrade to keyword/default coverage semantics.
  snapshot_membership_rule:
    decision_id: N4-D07
    normalized_rule: snapshot_only_consumable_search_run
    node_capability_boundary:
      - Node 4 does not retrieve, acquire, or create LiteratureRecord authority.
      - Node 4 does not refresh the resource pool or mutate the TitleCard evidence basket.
      - Node 4 records and validates the already-produced SearchRun bundle only.
    consumable_handoff_rule:
      - evidence_bindings[].literature_ref must be a member of the resolved LiteratureResourcePoolSnapshot.literature_refs.
      - evidence_map_input_refs literature refs must be members of the resolved LiteratureResourcePoolSnapshot.literature_refs.
      - snapshot-outside literature refs must not enter Node 5 handoff.
    anomaly_rule:
      - snapshot-outside refs are blocked by default in normalized execution.
      - A future explicit audit-only anomaly field may record snapshot-outside discovered refs, but those refs cannot be evidence_map_input_refs or CoverageEvidenceBinding literature refs.
      - Raw or unresolved search results remain raw-log artifacts only.
    loopback_rule:
      - If upstream search execution discovers new literature that matters, the workflow must route through literature acquisition/resource refresh, evidence basket update, Node 2 snapshot refresh, and any needed Node 3 plan update before a consumable Node 4 run.
  raw_artifact_boundary:
    decision_id: N4-D08
    semantic_split:
      raw_log_artifact:
        meaning: proves search execution process and provider/import/manual result details.
        authority_kind: audit_only
      literature_and_source_refs:
        meaning: prove literature/source identity, repository ownership, and snapshot membership.
        authority_kind: evidence_authority_basis_for_node5
      locator_provenance_refs:
        meaning: prove fulltext/abstract/manual locator positions for later EvidenceUnit extraction.
        authority_kind: locator_provenance_only
      coverage_semantic_metadata:
        meaning: explains how this SearchRun covered SearchPlan rows.
        authority_kind: coverage_audit_metadata_only
    allowed:
      - redacted raw_log_artifact_payload may be stored as a workflow/control-plane artifact.
      - raw_log_artifact_ref may appear in audit/artifact refs only when ref_type is artifact_ref or raw_search_log.
      - coverage_assessments[].verdict may describe coverage-row retrieval status only.
    forbidden:
      - raw_log_artifact_ref in evidence_map_input_refs.
      - raw_log_artifact_ref as evidence_bindings[].literature_ref.
      - raw_log_artifact_ref as evidence_bindings[].source_refs.
      - raw_log_artifact_ref in Node 5 handoff authority refs.
      - using fulltext/abstract/manual locator refs as substitutes for snapshot-member Literature/Source authority.
      - interpreting coverage_assessments[].verdict as evidence strength, topic value, or claim support.
    node5_consumption_rule:
      - Node 5 evidence authority is snapshot-member literature refs and legal source refs, plus coverage row lineage.
      - Fulltext/abstract/manual locator refs may be carried only as EvidenceUnit locator provenance.
      - A raw result must first be resolved to snapshot-member Literature/Source authority plus optional locator provenance before it can support EvidenceMap construction.
  output_handoff_policy:
    decision_id: N4-D09
    fields:
      - consumable_for_evidence_map.
      - downstream_handoff.
      - loopback_signal.
    downstream_handoff:
      contract_name: TopicSelectionSearchRunHandoff@v1
      consumer: topic-selection.v1a.build-evidence-map.v1
      present_when: consumable_for_evidence_map=true
      null_when:
        - run_status failed.
        - record contract failed.
        - lineage, snapshot, coverage, accounting, raw-artifact, or snapshot-membership checks fail.
      minimum_fields:
        - search_run_ref.
        - search_plan_ref.
        - literature_resource_pool_snapshot_ref.
        - literature_snapshot_hash.
        - method_family_targets copied from resolved SearchPlan coverage_strategy.
        - coverage_row_intent_refs.
        - coverage_role_expectations derived from resolved SearchPlan coverage rows.
        - evidence_map_input_refs.
        - coverage_binding_refs.
        - coverage_assessment_refs.
        - coverage_summary.
        - source_health_summary.
        - result_accounting.
        - raw_log_artifact_refs as audit-only.
        - policy_version.
        - output_schema_version.
      forbidden_fields:
        - raw result payload.
        - hidden reasoning.
        - LLM notes.
        - EvidenceUnit draft.
        - newly inferred evidence_role outside SearchPlan-derived coverage_role_expectations.
        - evidence_polarity.
        - evidence_strength.
        - need/value/claim semantics.
    loopback_signal:
      contract_name: TopicSelectionSearchRunLoopbackSignal@v1
      consumer: orchestrator_or_control_plane
      authority_kind: non_authority_routing_signal
      present_when:
        - SearchRun is not consumable but can be repaired by upstream action.
        - coverage is missing or insufficient.
        - source health records partial/degraded execution.
        - snapshot-outside refs were detected.
        - result accounting or coverage completeness requires rerun/review.
      allowed_targets:
        - topic-selection.v1a.create-search-plan.v1
        - topic-selection.v1a.snapshot-literature-resource-pool.v1
        - upstream_search_execution_or_input_preparation
        - human_review_search_coverage_acceptance
      not_authority: true
      not_node5_input: true
    coexistence_rule:
      - In v1, downstream_handoff and loopback_signal MUST NOT both be present.
      - Consumable result uses downstream_handoff and loopback_signal=null.
      - Repairable non-consumable result uses downstream_handoff=null and loopback_signal.
      - Blocked record-contract failure uses downstream_handoff=null; blocker_codes carry the failure, and trace-level loopback hints may be recorded but are not normal loopback_signal.
  implementation_readiness_review:
    decision_id: N4-D10
    decision: implementation_ready
    automation_callability_after_review: callable
    repo_state_findings:
      - Shared contracts now define TopicSelectionSearchRunRecordBundle@v1, TopicSelectionSearchRunHandoff@v1, and TopicSelectionSearchRunLoopbackSignal@v1.
      - TopicSelectionSearchResourceService.recordSearchRun is already the single SearchRun authority writer and already creates coverage child records in one repository call.
      - Service validation now checks SearchPlan/Snapshot title-card lineage, coverage-row ownership, snapshot hash, concrete functional-ref version checks, snapshot-member Literature/Source authority refs, locator-provenance legality, full accounting invariants, and failed-run audit-only state intent.
      - Existing route payload is a compatibility surface over recordSearchRun; normalized automation must use the bundle and a mapper, not a second route/product contract.
      - runRecordSearchRunScenario now emits handoff/loopback output while keeping blocked contract failures out of SearchRun authority creation.
    semantic_drift_risk_review:
      dual_track_input_contract:
        risk: service-local RecordSearchRunInput could drift from the shared normalized bundle.
        control: define bundle/handoff/loopback in shared contracts and make WorkflowHarness map bundle to the service input losslessly.
      route_compatibility:
        risk: POST /topic-selection/v1a/search-runs could become a looser product contract than normalized Node 4.
        control: keep the route as compatibility/manual surface; normalized scenarios must reject omitted schema/version/hash semantics before service authority creation.
      evidence_vs_coverage_semantics:
        risk: coverage_assessments verdicts or coverage_risk_acceptances could be reused as evidence strength, topic value, claim support, or claim-risk acceptance.
        control: validators must limit Node 4 semantics to retrieval coverage provenance and search-coverage risk only.
      raw_artifact_refs:
        risk: raw_log_artifact or artifact_ref could bypass Literature/Source authority and feed Node 5.
        control: block raw refs in evidence_map_input_refs, evidence_bindings literature/source refs, and downstream_handoff authority refs.
      coverage_role_drift:
        risk: Node 5 could reinterpret a SearchPlan coverage row as a different EvidenceUnit role.
        control: Node 4 handoff carries coverage_role_expectations from resolved CoverageRowIntent records; Node 5 materialization blocks mismatched draft roles.
      method_family_target_drift:
        risk: Node 6 could warn against a hard-coded or resource-sample-only method family set instead of the SearchPlan's target method families.
        control: Node 4 handoff carries method_family_targets from the resolved SearchPlan coverage_strategy; Node 5 and Node 6 must consume the carried targets as the authoritative coverage target set.
      snapshot_membership:
        risk: upstream search execution may discover valid new literature and accidentally attach it to SearchRun without refreshing Node 2.
        control: block snapshot-outside refs in consumable output and emit loopback_signal to acquisition/resource refresh plus Node 2/Node 3 rerun.
      failed_run_consumability:
        risk: failed SearchRuns may be persisted with consumable transition semantics.
        control: failed runs may persist only as audit facts with consumable_for_evidence_map=false and no downstream_handoff.
    complexity_assessment:
      level: moderate_bounded
      no_db_migration_expected: true
      reasons:
        - Existing SearchRun, coverage observation, evidence binding, assessment, risk acceptance, control-plane, and artifact persistence can hold required authority and audit evidence.
        - Handoff and loopback are node result/trace contracts, not new persisted authorities.
        - No provider, Codex, AgentOrchestrator, or debate runtime is introduced into Node 4 execution.
        - Main work is deterministic validation plus a normalized WorkflowHarness runner.
      complexity_controls:
        - Implement shared DTO/schema first.
        - Add a single bundle-to-recordSearchRun mapper.
        - Harden recordSearchRun validators before adding the runner.
        - Keep route compatibility tests separate from normalized harness tests.
        - Do not add persistence fields unless a validator cannot be implemented with existing authority records and trace artifacts.
    required_implementation_slices:
      contracts:
        - Done: TopicSelectionSearchRunRecordBundle@v1, TopicSelectionSearchRunHandoff@v1, TopicSelectionSearchRunLoopbackSignal@v1, schemas, and schema smoke tests.
      service_hardening:
        - Done: validate concrete SearchPlan and Snapshot refs, version_id, expected_literature_snapshot_hash, accounting invariants, source-health failure summaries, snapshot membership, source refs, raw artifact boundary, and search-coverage-only risk acceptance.
        - Done: SearchRun control-plane transition/state-write intent derives audit-only vs consumable state from run_status.
      workflow_harness:
        - Done: runRecordSearchRunScenario with one stable result shape for succeeded, blocked, non-consumable repairable, and failed-audit paths.
        - Done: WorkflowHarnessRecordSearchRunScenarioTrace@v1.
      tests:
        - Covered in focused schema, service, and harness tests; route compatibility remains a separate API-surface test concern and must not relax normalized harness semantics.
blocking_conditions:
  - missing SearchPlan or LiteratureResourcePoolSnapshot returns NOT_FOUND.
  - SearchPlan/Snapshot/title-card lineage mismatch returns VERSION_CONFLICT.
  - coverage record outside SearchPlan rows returns VERSION_CONFLICT.
  - snapshot-outside literature refs in consumable evidence bindings or evidence_map_input_refs return VERSION_CONFLICT or GATE_CONSTRAINT_FAILED before SearchRun authority creation.
  - raw log artifact refs in evidence authority slots return GATE_CONSTRAINT_FAILED before SearchRun authority creation.
  - malformed payload, missing source-health summary, missing result accounting, or raw log as authority ref blocks before SearchRun authority creation.
  - run_status failed blocks downstream EvidenceMap construction but does not by itself block SearchRun authority creation when the record contract is valid.
  - deterministic gate or transition failure blocks before repository persistence.
deterministic_validators:
  - record-search-run is deterministic and MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, or debate runtime.
  - record-search-run is a factual contract and lineage gate, not a topic-value judgment gate.
  - stricter topic-level quality control must be handled by layered v1a/v1b/v1c gates and bounded loopback, not by adding multi-agent debate to this node.
  - result accounting must be explicit for total, unique, duplicate, failed, and skipped counts.
  - result accounting counts must be internally consistent and reconcile with evidence binding uniqueness.
  - SearchPlan and LiteratureResourcePoolSnapshot version checks must use only concrete ref version_id fields.
  - expected_literature_snapshot_hash must match the resolved snapshot hash.
  - evidence bindings must cite coverage row ids under the SearchPlan.
  - evidence bindings and consumable evidence_map_input_refs must cite only literature refs from the resolved LiteratureResourcePoolSnapshot.
  - controlled semantic metadata must stay within search coverage provenance semantics.
  - raw artifacts must remain audit-only and must not bypass Literature/Source authority.
  - evidence_map_input_refs must include all refs needed by later EvidenceMap units.
  - source health warnings must remain visible in the SearchRun result and harness trace.
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
multi_agent_policy:
  debate_allowed: false
  rationale:
    - Node 4 records and validates already-produced search evidence; it does not broaden or deepen topic thinking.
    - Multi-agent debate at this layer would blur search-result recording with evidence interpretation, need discovery, or topic-value assessment.
    - If agent-assisted search-result organization is needed later, it must be modeled as an upstream input-preparation or search-execution node whose output is then deterministically checked by Node 4.
topic_quality_guardrail_placement:
  principle: strict_topic_selection_guarding_is_layered_not_node4_debate
  node4_responsibility:
    - traceability and lineage integrity.
    - complete result accounting.
    - coverage-row binding integrity.
    - raw-log versus authority-ref separation.
    - SearchRun consumability handoff for Node 5.
  upstream_or_downstream_responsibility:
    - need exploration and candidate generation belongs to v1a generate-need-candidate.
    - candidate validation and human confirmation belong to v1a adjudication/human-confirm nodes.
    - topic value, reviewer relevance, risk, and boundary quality belong to v1b assessment and package gates.
    - final promotion conservatism belongs to v1c promotion gates and human decision.
  loopback_rule:
    - Later loopback may request a new SearchPlan or SearchRun when evidence is insufficient, but Node 4 must not use loopback as permission to relax record-level validation.
profile_escalation_policy_ref: not_applicable
input_contract_refs:
  - TopicSelectionSearchRunRecordBundle@v1
  - RecordSearchRunInput
  - TopicSelectionSearchPlanRecord
  - TopicSelectionLiteratureResourcePoolSnapshotRecord
  - TopicSelectionCoverageRowIntentRecord
output_contract_refs:
  - TopicSelectionSearchRunRecord
  - TopicSelectionSearchRunHandoff@v1
  - TopicSelectionSearchRunLoopbackSignal@v1
  - TopicSelectionCoverageExecutionObservationRecord
  - TopicSelectionCoverageEvidenceBindingRecord
  - TopicSelectionCoverageAssessmentRecord
  - TopicSelectionCoverageRiskAcceptanceRecord
authority_write_boundary:
  route: POST /topic-selection/v1a/search-runs
  controller: TopicSelectionV1aController.recordSearchRun
  domain_service: TopicSelectionSearchResourceService.recordSearchRun
  repository: TopicSelectionSearchResourceRepository.createSearchRunWithCoverageRecords
  authority_objects:
    - TopicSelectionSearchRun
    - TopicSelectionCoverageExecutionObservation
    - TopicSelectionCoverageEvidenceBinding
    - TopicSelectionCoverageAssessment
    - TopicSelectionCoverageRiskAcceptance
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - control-plane input snapshot with SearchPlan, Snapshot, and evidence input refs.
    - workflow/search-run trace once normalized.
    - result accounting summary.
    - source health summary.
    - coverage observation and assessment summary.
    - harness trace artifact once normalized.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_upstream_ref: return NOT_FOUND.
  lineage_conflict: return VERSION_CONFLICT.
  coverage_record_conflict: return VERSION_CONFLICT before repository persistence.
  failed_run: persist a failed SearchRun as an audit fact when the record contract is valid; mark it non-consumable and do not emit Node 5 handoff.
  record_contract_failed: block before SearchRun authority creation when accounting, source health, authority refs, or lineage are invalid.
  gate_or_transition_failed: block before repository persistence.
  repository_failure: fail the node attempt without partial SearchRun/CoverageRecord authority semantics.
```

### `topic-selection.v1a.build-evidence-map.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.build-evidence-map.v1
authority_object: TopicSelectionEvidenceMap
agent_policy:
  decision_id: N5-D00
  summary: single_agent_semantic_extraction_allowed_no_debate
  node_can_perform_semantic_extraction: true
  allowed_model_like_participation:
    - codex_assisted
    - provider_llm
    - mocked_llm_test_only
  default_local_mode: codex_assisted
  execution_mode_none_allowed: true
  debate_trigger_policy: not_allowed
  multi_agent_roles: []
  hard_boundary:
    - model-like execution may extract or draft EvidenceUnit source statements, locator candidates, role suggestions, typed-link suggestions, clusters, patterns, and conflict hints.
    - model-like execution MUST output a structured draft/review artifact only.
    - deterministic validators MUST convert only accepted draft fields into EvidenceMap service input.
    - model-like execution MUST NOT write EvidenceMap, EvidenceUnit, typed-link, cluster, pattern, conflict, NeedCandidate, value, or claim authority.
    - hidden reasoning, raw provider logs, and raw debate transcripts MUST NOT be persisted.
extraction_draft_contract:
  decision_id: N5-D01
  contract_name: TopicSelectionEvidenceMapExtractionDraft@v1
  contract_level: module_value_contract
  owner_module: topic-selection-evidence-map
  authority_kind: non_authority_input_draft
  node_wrapper_contract: TopicSelectionBuildEvidenceMapNodeInput@v1
  node_wrapper_level: node_workflow_contract
  no_harness_private_shape: true
  allowed_producers:
    - codex_assisted
    - provider_llm
    - mocked_llm
    - human
    - fixture
  consumer:
    - topic-selection.v1a.build-evidence-map.v1
  execution_mode_none_rule:
    - execution_mode=none means a ready TopicSelectionEvidenceMapExtractionDraft@v1 is already supplied by a human, fixture, or caller.
    - execution_mode=none MUST NOT create a second service-input path.
  materialization_rule:
    - deterministic validators map accepted draft fields into CreateEvidenceMapFromSearchRunInput.
    - TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun remains the sole EvidenceMap authority writer.
    - draft artifacts may be hashed or persisted for audit, but they are not EvidenceMap authority.
  minimum_fields:
    - schema_version
    - title_card_ref
    - search_run_ref
    - search_plan_ref
    - literature_resource_pool_snapshot_ref
    - literature_snapshot_hash
    - producer_kind
    - profile_id
    - input_refs_hash
    - draft_units
    - draft_links
    - draft_clusters
    - draft_patterns
    - draft_conflicts
    - warning_codes
    - policy_version
    - output_schema_version
  draft_unit_minimum_fields:
    - client_unit_key
    - evidence_role
    - literature_ref
    - source_refs
    - locator
    - source_statement
    - source_attribution_kind
    - coverage_row_intent_ref_nullable
    - confidence
    - issue_codes
  forbidden_fields:
    - evidence_map_id
    - evidence_unit_id
    - created_authority_refs
    - gate_result_id
    - transition_attempt_id
    - need_candidate_ref
    - topic_value_score
    - claim_support_verdict
    - evidence_strength
    - hidden_reasoning
    - raw_provider_response
    - raw_fulltext_dump
    - raw_search_log_authority_refs
materialization_validator:
  decision_id: N5-D02
  report_contract: EvidenceMapMaterializationReport@v1
  validation_layers:
    - schema
    - lineage
    - materialization
  status_policy:
    ready:
      create_authority: true
      handling: call TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun.
    ready_with_warning:
      create_authority: true
      handling: create EvidenceMap and persist warning/issue codes in report, harness trace, and accepted EvidenceUnit issue codes when applicable.
    review_required:
      create_authority: false
      handling: return review package with ambiguous units, review codes, and revised-draft expectations.
    blocked:
      create_authority: false
      handling: return stable blocked result with blocker codes, failed layer, rejected draft refs, and repair target.
  warning_examples:
    - coverage_row_intent_ref missing while literature/source/locator refs remain legal.
    - abstract-only support with ABSTRACT_ONLY_SUPPORT issue code.
    - uneven role distribution that does not break authority safety.
    - some draft units rejected while enough accepted units remain for a valid EvidenceMap.
    - high context-unit share that should constrain downstream NeedCandidate sufficiency.
  blocker_examples:
    - malformed TopicSelectionBuildEvidenceMapNodeInput@v1 or TopicSelectionEvidenceMapExtractionDraft@v1.
    - title-card, SearchRun, SearchPlan, snapshot, or input_refs_hash mismatch.
    - literature/source/locator ref outside Node 4 handoff authority refs.
    - coverage_row_intent_ref expected role does not match the drafted evidence_role.
    - empty source_statement or missing locator.
    - source_attribution_kind=llm_inference used as source authority.
    - typed link, cluster, pattern, or conflict ref points to unknown client_unit_key.
    - no accepted EvidenceUnit remains after validation.
  review_required_examples:
    - same source is drafted as both support and challenge without conflict structure.
    - source_statement is over-summarized or locator granularity is too weak.
    - low-confidence unit is proposed as core support.
    - context units dominate and downstream evidence sufficiency is unclear.
  automatic_routing:
    - SCHEMA_MALFORMED may retry the same execution profile once; no automatic provider fallback.
    - LINEAGE_MISMATCH routes to Node 4 or upstream handoff repair; Node 5 must not repair it.
    - REF_OUTSIDE_HANDOFF routes to Node 4 SearchRun/evidence-binding repair.
    - INSUFFICIENT_VALID_UNITS may rerun extraction or route to human evidence completion.
    - SOURCE_AUTHORITY_INVALID routes to human review or re-extraction; it must not be downgraded into source_claim.
  allowed_normalization:
    - stable ordering.
    - duplicate structure removal.
    - stable client key generation when the draft supplies deterministic source refs.
  forbidden_auto_repair:
    - rewrite evidence_role.
    - invent source_statement.
    - replace literature_ref or source_ref.
    - re-read live resource pools or mutable DB state to patch stale input.
    - downgrade llm_inference into source_claim or human_judgment.
  report_fields:
    - status.
    - accepted_unit_count.
    - rejected_unit_count.
    - rejection_reasons_by_client_unit_key.
    - warning_codes.
    - review_codes.
    - blocker_codes.
    - failed_validation_layer.
    - repair_target.
    - normalized_role_counts.
    - materialization_input_hash.
    - mapped_CreateEvidenceMapFromSearchRunInput_when_ready.
extraction_execution_profile:
  decision_id: N5-D03
  profile_id: topic-selection.evidence-map-extraction.single-agent.v1
  profile_registry_owned: true
  profile_function: evidence_map_extraction_single_agent
  default_execution_mode: codex_assisted
  allowed_execution_modes:
    - none
    - codex_assisted
    - provider_llm
    - mocked_llm
  mode_policy:
    none:
      model_invocation: false
      requirement: caller supplies valid TopicSelectionEvidenceMapExtractionDraft@v1.
    codex_assisted:
      model_invocation: true
      role: default local cost-control extraction/review producer.
      provenance: non_provider_codex_assisted.
    provider_llm:
      model_invocation: true
      role: explicit operator quality upgrade or provider-quality scenario.
      provenance: provider_backed_with_profile_resolved_model_option.
    mocked_llm:
      model_invocation: true
      role: acceptance and unit tests only.
      provenance: test_only_mocked_llm.
  profile_registry_rule:
    - Concrete provider, model option, normalized parameters, request policy, retry policy, audit policy, and budget policy are resolved by the profile registry.
    - Node 5 policy may reference profile_id and execution_mode but must not branch business behavior on provider or model ids.
    - Profile output contract must be TopicSelectionEvidenceMapExtractionDraft@v1.
  context_packet_contract:
    contract_name: TopicSelectionEvidenceMapExtractionContextPacket@v1
    context_family: evidence_extraction_context
    compiler_owner: WorkflowHarness or caller-owned context compiler before model invocation.
    input_sources:
      - TopicSelectionSearchRunHandoff@v1.
      - SearchRun evidence bindings and evidence_map_input_refs.
      - SearchPlan ref, coverage row intent table, and search-plan blueprint summary when available.
      - LiteratureResourcePoolSnapshot ref/hash and selected literature/source locator tables.
      - expected role counts or role minimums.
      - source-attribution rules, forbidden output rules, and materialization validator checklist.
    envelope_fields:
      - node_id.
      - workflow_run_id.
      - node_attempt_id.
      - context_family.
      - input_refs.
      - input_refs_hash.
      - context_compiler_version.
      - policy_version.
      - output_schema_version.
      - execution_mode.
      - profile_id.
      - cache_key.
      - cache_hit.
      - redaction_policy.
      - created_at.
    forbidden_context:
      - live DB reads during model invocation.
      - mutable resource-pool reads after context packet compilation.
      - raw provider logs or raw search logs as authority.
      - Node 6 exploration_context.
      - Node 6 arbiter_context.
      - debate transcripts or NeedCandidate discovery memory.
  retry_policy:
    transient_or_malformed_output_retry: same profile and execution mode at most once.
    automatic_provider_fallback: false
    automatic_codex_fallback: false
    automatic_mock_fallback: false
    keyword_extraction_fallback: false
  output_contract:
    - TopicSelectionEvidenceMapExtractionDraft@v1 only.
  provider_schema_compatibility:
    - Provider structured-output requests may receive an invocation-boundary projection of the shared JSON schema when a provider rejects valid local JSON Schema features.
    - The current projection removes `properties.<forbidden_field>=false` entries before provider invocation.
    - Local Ajv validation MUST still use the original shared schema; provider schema projection MUST NOT become a weaker product contract.
    - Forbidden output fields remain blocked by local validation and `additionalProperties=false`.
cache_reuse_audit_policy:
  decision_id: N5-D04
  purpose: prevent context pollution and cached response masquerading while allowing reproducible local cost control.
  context_packet_cache:
    allowed: true
    cache_family: evidence_extraction_context
    exact_match_required: true
    required_match_fields:
      - node_id
      - search_run_handoff_hash
      - search_plan_ref
      - search_plan_version
      - literature_resource_pool_snapshot_ref
      - literature_resource_pool_snapshot_hash
      - context_compiler_version
      - policy_version
      - schema_version
      - output_schema_version
      - execution_mode
      - profile_id
      - context_family
    mismatch_behavior: cache_miss_or_block_before_model_invocation
  extraction_draft_response_reuse:
    allowed_for_codex_assisted: true
    codex_assisted_provenance:
      response_source: cached_exact_invocation
      non_provider: true
      requires_source_attempt_ref: true
      requires_context_packet_hash_match: true
    provider_llm_reuse_allowed: false
    provider_llm_cache_hit_behavior: miss_or_block; never provider-backed provenance.
    mocked_llm_reuse_allowed: test_only
  validator_requirement:
    - cached or reused drafts MUST pass N5-D02 materialization validation.
    - cached or reused drafts MUST NOT bypass EvidenceMapMaterializationReport@v1.
    - cached or reused drafts MUST NOT call TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun unless report status is ready or ready_with_warning.
  context_pollution_guards:
    - evidence_extraction_context cache entries must not satisfy Node 6 exploration_context or arbiter_context requests.
    - Node 6 exploration_context or arbiter_context cache entries must not satisfy Node 5 evidence_extraction_context requests.
    - debate transcripts, NeedCandidate discovery memory, and arbiter summaries are forbidden in Node 5 context packet cache.
    - mutable DB/live resource reads cannot be used to patch a cached context packet.
  audit_provenance_must_record:
    - context_packet_ref.
    - context_packet_hash.
    - context_compiler_version.
    - profile_id.
    - execution_mode.
    - model_option_id when provider-backed.
    - cache_key.
    - cache_hit_or_miss.
    - response_source.
    - source_attempt_ref when reused.
    - draft_hash.
    - redacted_structured_draft_artifact_ref.
    - materialization_report_ref.
    - materialization_report_hash.
    - accepted_unit_count.
    - rejected_unit_count.
    - role_counts.
    - warning_codes.
    - blocker_codes.
    - review_codes.
  audit_must_not_record:
    - hidden_reasoning.
    - raw_provider_logs.
    - raw_fulltext_dumps.
    - raw_search_logs_as_authority.
    - Node 6 exploration_context packet payloads.
    - Node 6 arbiter_context packet payloads.
    - debate transcripts.
review_required_revision_policy:
  decision_id: N5-D05
  review_result_contract: EvidenceMapExtractionReviewPackage@v1
  review_required_semantics:
    creates_evidence_map_authority: false
    terminal_for_current_attempt: true
    next_step: explicit revised TopicSelectionEvidenceMapExtractionDraft@v1.
  review_package_fields:
    - schema_version.
    - workflow_run_id.
    - node_attempt_id.
    - review_package_ref.
    - materialization_report_ref.
    - materialization_report_hash.
    - extraction_context_packet_ref.
    - extraction_context_packet_hash.
    - draft_ref.
    - draft_hash.
    - ambiguous_unit_keys.
    - review_codes.
    - accepted_draft_ref_summary.
    - rejected_draft_ref_summary.
    - required_revision_actions.
    - allowed_revision_producers.
    - policy_version.
    - schema_version.
    - output_schema_version.
    - execution_mode.
    - profile_id.
  allowed_revision_producers:
    - human
    - codex_assisted
    - provider_llm
  revision_output_rule:
    - revised output MUST be a full TopicSelectionEvidenceMapExtractionDraft@v1.
    - patch DTOs, partial-update DTOs, reviewer-only DTOs, and direct service-input patches are forbidden.
    - revised draft must pass N5-D02 materialization validation from scratch.
  append_only_attempt_rule:
    - every revision creates a new node_attempt_id.
    - every revision records revision_of_attempt_ref.
    - every revision records review_package_ref.
    - prior draft, context packet, materialization report, and review package artifacts must not be overwritten.
  context_reuse_rule:
    reuse_original_context_packet_allowed_when_all_match:
      - SearchRun handoff hash.
      - SearchPlan ref/version.
      - LiteratureResourcePoolSnapshot ref/hash.
      - context compiler version.
      - policy version.
      - schema version.
      - output schema version.
      - execution mode.
      - profile id.
      - context_family.
    recompile_required_when_any_upstream_ref_or_hash_changes: true
    live_db_repair_during_revision: forbidden
  retry_loop_rule:
    automatic_same_profile_retry_limit: 1
    further_revision_requires: explicit operator-triggered workflow attempt.
    unbounded_autonomous_loop: forbidden
  review_package_must_not_record:
    - hidden_reasoning.
    - raw_provider_logs.
    - raw_fulltext_dumps.
    - raw_search_logs_as_authority.
    - Node 6 exploration_context payloads.
    - Node 6 arbiter_context payloads.
    - debate transcripts.
evidence_map_handoff_policy:
  decision_id: N5-D06
  handoff_contract: TopicSelectionEvidenceMapHandoff@v1
  handoff_kind: non_authority_workflow_output
  only_downstream_consumer: topic-selection.v1a.generate-need-candidate.v1
  produced_when_materialization_status:
    - ready
    - ready_with_warning
  not_produced_when_materialization_status:
    - review_required
    - blocked
  handoff_fields:
    - schema_version.
    - workflow_run_id.
    - node_attempt_id.
    - handoff_ref.
    - title_card_ref.
    - evidence_map_ref.
    - search_run_ref.
    - search_plan_ref.
    - literature_resource_pool_snapshot_ref.
    - materialization_report_ref.
    - materialization_report_hash.
    - method_family_targets.
    - need_validation_evidence_bundle_ref when available as read projection.
    - evidence_unit_count.
    - role_counts.
    - abstract_only_support_count.
    - warning_summary.
    - issue_summary.
    - source_refs_hash.
    - policy_version.
    - schema_version.
    - output_schema_version.
  forbidden_handoff_payloads:
    - extraction_draft_payload.
    - extraction_draft_ref_as_downstream_evidence.
    - review_package_ref_as_downstream_evidence.
    - raw_model_output.
    - hidden_reasoning.
    - raw_provider_logs.
    - raw_fulltext_dumps.
    - raw_search_logs_as_authority.
    - v1b ResearchSlice refs.
    - TopicQuestionContract refs.
    - topic value assessment refs.
    - claim or bridge refs.
  non_handoff_outputs:
    - EvidenceMapExtractionReviewPackage@v1 for review_required.
    - blocker and repair routing data for blocked.
    - UI/read-only EvidenceMap projections.
    - audit and verification script reads.
  node6_consumption_rule:
    - Node 6 consumes evidence_map_ref and read projections such as TopicSelectionNeedValidationEvidenceBundle.
    - Node 6 consumes method_family_targets only as coverage-target metadata for gap warnings; it must not treat the target names as evidence facts or source claims.
    - Node 6 MUST NOT consume extraction draft, review package, raw model output, cache artifact, or audit artifact as evidence facts.
    - ready_with_warning handoff may proceed, but warnings and issue summaries become downstream sufficiency constraints rather than strong evidence.
    - WorkflowHarness may pass TopicSelectionEvidenceMapHandoff@v1 into Node 6 as transition provenance; Node 6 must validate matching EvidenceMap/SearchRun/LiteratureSnapshot refs before context compilation.
    - Node 6 business input refs must reject EvidenceMap extraction drafts, review packages, materialization reports, raw model/provider outputs, raw search logs, hidden reasoning, and debate transcripts.
implementation_readiness_review:
  decision_id: N5-D07
  implementation_readiness: implementation_ready
  automation_callability: callable
  review_conclusion:
    - product semantics, authority ownership, execution modes, failure states, and downstream handoff rules are concrete enough to automate.
    - normalized runner and tests have landed; remaining work is future node expansion rather than N5 policy ambiguity.
  initial_persistence_scope:
    db_migration_required: false
    reason: extraction context, draft, materialization report, review package, and harness trace are non-authority artifacts/control-plane/audit refs.
    authority_writer: TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun
  locked_implementation_order:
    - shared contracts and JSON schemas.
    - topic-selection.evidence-map-extraction.single-agent.v1 profile registry entry.
    - deterministic materialization validator and mapper into CreateEvidenceMapFromSearchRunInput.
    - context/adapter path for model-like execution through the existing AgentOrchestrator.
    - WorkflowHarness runBuildEvidenceMapScenario runner.
    - focused schema, materialization, and harness tests.
  compatibility_boundary:
    - POST /topic-selection/v1a/evidence-maps remains compatibility/manual direct service behavior.
    - normalized automation MUST use runBuildEvidenceMapScenario and shared Node 5 contracts.
    - direct route compatibility MUST NOT become a second automated semantics track.
  implementation_must_prove:
    - shared Node 5 contracts validate normalized input, draft, materialization report, review package, and handoff.
    - profile registry resolves topic-selection.evidence-map-extraction.single-agent.v1.
    - ready and ready_with_warning are the only materialization statuses that call EvidenceMap authority creation.
    - review_required emits EvidenceMapExtractionReviewPackage@v1 and creates no EvidenceMap authority.
    - blocked creates no EvidenceMap authority and no Node 6 handoff.
    - successful output exposes TopicSelectionEvidenceMapHandoff@v1 without leaking draft/model/cache/audit-only artifacts to Node 6.
preconditions:
  - request payload validates against POST /topic-selection/v1a/evidence-maps schema.
  - title_card_id is non-empty and matches the resolved SearchRun.
  - search_run_id resolves to a SearchRun with run_status succeeded or partial.
  - SearchRun resolves to its SearchPlan through search_run.search_plan_ref.
  - SearchRun resolves to its LiteratureResourcePoolSnapshot through search_run.literature_snapshot_ref.
  - SearchPlan literature_snapshot_ref matches the resolved LiteratureResourcePoolSnapshot.
  - evidence_units contains at least one claim-level unit.
  - each EvidenceUnit has evidence_role support, challenge, baseline, or context.
  - each EvidenceUnit has a non-empty source_statement.
  - each EvidenceUnit has a locator with source_ref and matching literature_ref.
  - each EvidenceUnit literature_ref, source_refs, locator.source_ref, and locator content refs are contained in SearchRun evidence_map_input_refs or the SearchRun coverage evidence bindings.
  - each coverage_row_intent_id, when present, resolves under the SearchPlan coverage rows.
  - each non-abstract locator resolves against available literature source/fulltext records.
  - typed_links, clusters, patterns, and conflict_sets refer only to client_unit_key values in the same request.
  - normalized WorkflowHarness execution validates TopicSelectionBuildEvidenceMapNodeInput@v1 and TopicSelectionEvidenceMapExtractionDraft@v1 before service input materialization.
  - model-like execution, when used, receives TopicSelectionEvidenceMapExtractionContextPacket@v1 with matching context family, input hash, profile id, execution mode, policy version, and schema version.
  - any context packet cache hit or response reuse has exact-match provenance and cannot cross context families.
  - review-required revisions, when used, carry revision_of_attempt_ref and review_package_ref and submit a full replacement extraction draft.
  - Node 6 handoff is requested only after materialization status ready or ready_with_warning.
blocking_conditions:
  - malformed payload returns INVALID_PAYLOAD before service execution.
  - evidence_units empty blocks with GATE_CONSTRAINT_FAILED before authority creation.
  - SearchRun not found returns NOT_FOUND.
  - SearchRun title_card_id mismatch blocks with VERSION_CONFLICT.
  - SearchRun run_status other than succeeded or partial blocks with GATE_CONSTRAINT_FAILED.
  - SearchPlan not found returns NOT_FOUND.
  - LiteratureResourcePoolSnapshot not found returns NOT_FOUND.
  - SearchRun/SearchPlan/LiteratureResourcePoolSnapshot lineage mismatch blocks with VERSION_CONFLICT.
  - EvidenceUnit source_attribution_kind=llm_inference blocks with GATE_CONSTRAINT_FAILED because LLM inference cannot be source-claim authority.
  - EvidenceUnit source_statement empty returns INVALID_PAYLOAD.
  - EvidenceUnit missing locator or locator.source_ref returns INVALID_PAYLOAD.
  - EvidenceUnit coverage_row_intent_id outside SearchPlan coverage rows blocks with VERSION_CONFLICT.
  - EvidenceUnit literature/source/locator refs outside SearchRun EvidenceMap input refs or coverage bindings block with GATE_CONSTRAINT_FAILED.
  - EvidenceUnit locator literature_ref mismatch blocks with VERSION_CONFLICT.
  - EvidenceUnit literature or source refs not found return NOT_FOUND.
  - section/paragraph/anchor locator without resolvable fulltext refs blocks with GATE_CONSTRAINT_FAILED or NOT_FOUND.
  - typed_link, cluster, pattern, or conflict_set references an unknown client_unit_key blocks before authority creation.
  - deterministic gate topic-selection.evidence-map-ready fails blocks before repository persistence.
  - transition search-run-to-evidence-map fails blocks before repository persistence.
deterministic_validators:
  - EvidenceMap authority materialization is deterministic even when a pre-materialization semantic extraction draft was produced by Codex or an LLM.
  - build-evidence-map MUST NOT call or route through multi-agent debate runtime.
  - AgentOrchestrator/BackendLlmGateway/Codex MAY be used only for single-agent semantic extraction or review before authority persistence.
  - model-like extraction output MUST pass the EvidenceMap extraction draft schema and deterministic ref validators before it can become service input.
  - WorkflowHarness MUST NOT accept a private or alternate evidence draft shape.
  - model-like extraction MUST use the profile-registry-resolved profile and frozen context packet; it must not query live DB or mutable resource state during invocation.
  - cached or reused extraction drafts MUST still pass materialization validation and MUST NOT bypass EvidenceMapMaterializationReport@v1.
  - cached responses MUST NOT satisfy provider_llm provenance requirements.
  - review_required MUST emit EvidenceMapExtractionReviewPackage@v1 and MUST NOT create authority for the current attempt.
  - revised drafts MUST create new attempts and MUST NOT mutate prior attempt artifacts.
  - Node 6 handoff MUST be emitted only for ready or ready_with_warning materialization reports.
  - Node 6 handoff MUST NOT include extraction drafts, review packages, raw model output, cache artifacts, or audit-only artifacts as evidence facts.
  - warning statuses may create authority only when the materialization report status is ready_with_warning.
  - review_required and blocked statuses MUST NOT call the EvidenceMap service writer.
  - source_attribution_kind may be source_claim, counter_evidence, or human_judgment; llm_inference MUST NOT become EvidenceUnit source authority.
  - EvidenceUnit authority fields must be copied from request payload and validated refs; the service MUST NOT invent source refs.
  - all authority EvidenceUnit refs must trace to SearchRun evidence_map_input_refs or SearchRun coverage evidence bindings.
  - each EvidenceUnit locator must match its literature_ref.
  - non-abstract locators must resolve to literature fulltext structures before persistence.
  - abstract-only support is allowed but MUST receive ABSTRACT_ONLY_SUPPORT issue code for downstream strength/readiness gates.
  - role counts must be derived from persisted EvidenceUnits only.
  - context units may be persisted as context but MUST NOT by themselves satisfy downstream need-candidate evidence sufficiency.
  - conflict sets, typed links, clusters, and patterns are structural evidence-map artifacts; they cannot introduce refs outside the request's EvidenceUnits.
  - input snapshot source_refs must include SearchRun, SearchPlan, LiteratureResourcePoolSnapshot, EvidenceUnit literature refs, and EvidenceUnit source refs.
  - workflow run key must remain topic-selection.evidence-map-build with deterministic-contract profile.
  - readiness gate key must remain topic-selection.evidence-map-ready.
  - transition key must remain search-run-to-evidence-map.
  - successful persistence writes EvidenceMap and child EvidenceUnit/link/cluster/pattern/conflict records through TopicSelectionEvidenceMapRepository.createEvidenceMapWithRecords.
  - getNeedValidationEvidenceBundle is a read projection over the EvidenceMap and MUST NOT create new authority records.
allowed_execution_modes: [none, codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: topic-selection.evidence-map-extraction.single-agent.v1
input_contract_refs:
  - TopicSelectionBuildEvidenceMapNodeInput@v1
  - TopicSelectionSearchRunHandoff@v1
  - TopicSelectionEvidenceMapExtractionContextPacket@v1
  - cached_exact_invocation provenance when response reuse is used
  - EvidenceMapExtractionReviewPackage@v1 when revising a review-required attempt
  - CreateEvidenceMapFromSearchRunInput
  - TopicSelectionEvidenceMapExtractionDraft@v1
  - TopicSelectionSearchRunRecord
  - TopicSelectionSearchPlanRecord
  - TopicSelectionLiteratureResourcePoolSnapshotRecord
  - TopicSelectionCoverageRowIntentRecord
  - TopicSelectionCoverageEvidenceBindingRecord
  - TopicSelectionEvidenceUnitRecord input shape
  - TopicSelectionEvidenceSourceLocator
output_contract_refs:
  - EvidenceMapMaterializationReport@v1
  - EvidenceMapExtractionReviewPackage@v1
  - TopicSelectionEvidenceMapHandoff@v1
  - TopicSelectionEvidenceMapRecord
  - TopicSelectionEvidenceUnitRecord
  - TopicSelectionEvidenceTypedLinkRecord
  - TopicSelectionEvidenceClusterRecord
  - TopicSelectionEvidencePatternRecord
  - TopicSelectionEvidenceConflictSetRecord
  - TopicSelectionNeedValidationEvidenceBundle read projection
authority_write_boundary:
  route: POST /topic-selection/v1a/evidence-maps
  controller: TopicSelectionV1aController.createEvidenceMapFromSearchRun
  domain_service: TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun
  repository: TopicSelectionEvidenceMapRepository.createEvidenceMapWithRecords
  authority_objects:
    - TopicSelectionEvidenceMap
    - TopicSelectionEvidenceUnit
    - TopicSelectionEvidenceTypedLink
    - TopicSelectionEvidenceCluster
    - TopicSelectionEvidencePattern
    - TopicSelectionEvidenceConflictSet
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - control-plane input snapshot with source refs and digest_payload.
    - workflow run artifact with evidence_unit_count, typed_link_count, cluster_count, pattern_count, and conflict_set_count.
    - readiness gate result for topic-selection.evidence-map-ready.
    - transition attempt for search-run-to-evidence-map.
    - lineage link from SearchRun to EvidenceMap.
    - trace snapshot with role_counts and abstract_only_support_count.
    - EvidenceMap artifact_refs returned by the control plane.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
    - LLM-generated claims as source-claim authority.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_upstream_ref: return NOT_FOUND for missing SearchRun, SearchPlan, LiteratureResourcePoolSnapshot, Literature, Source, or fulltext locator records.
  lineage_conflict: return VERSION_CONFLICT when SearchRun, SearchPlan, LiteratureResourcePoolSnapshot, title card, coverage row, or locator lineage is inconsistent.
  gate_blocked: return GATE_CONSTRAINT_FAILED before repository persistence.
  llm_inference_source_claim: return GATE_CONSTRAINT_FAILED and do not downgrade to source_claim.
  role_or_locator_issue: block before persistence unless the issue is abstract-only support, which is persisted with ABSTRACT_ONLY_SUPPORT issue code for downstream gates.
  transition_failed: block before repository persistence and preserve control-plane gate/transition diagnostics.
  repository_failure: fail the node attempt without partial child-record authority semantics.
```

### `topic-selection.v1a.generate-need-candidate.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.generate-need-candidate.v1
authority_object: NeedCandidate
preconditions:
  - TopicSelectionEvidenceMap exists for the current topic scope.
  - EvidenceStrengthAssessment or equivalent evidence-strength summary is current for the evidence map.
  - Selected literature refs and source refs are resolvable from the sample set or evidence map.
  - Search/resource snapshots are versioned so candidate evidence can be traced.
  - Existing sibling NeedCandidate refs for the title card or evidence map are resolved as candidate-pool context when available.
  - Topic scope, exclusions, and inherited non-goals are present in the context packet.
  - exploration_context and arbiter_context packets compile with source refs, compiler version, input hash, summary hash, and redaction policy.
  - shared context envelope contains node_id, workflow_run_id, node_attempt_id, context_family, input_refs, input_refs_hash, context_compiler_version, policy_version, output_schema_version, profile_id, execution_mode, cache_key, cache_hit, redaction_policy, and created_at.
  - exploration_context payload contains topic_scope, evidence_signal_digest, resource_sample_digest, search_coverage_digest, sibling_candidate_digest, decision_memory_digest, exploration_prompts, challenge_prompts, allowed_outputs, and forbidden_outputs.
  - search_coverage_digest.method_family_targets is compiled from TopicSelectionEvidenceMapHandoff@v1 or upstream SearchPlan/SearchRun handoff, not from model output.
  - arbiter_context payload contains node_policy_ref, output_schema_ref, authority_boundary, max_persisted_candidates, deterministic_gate_checklist, role_level_summaries, candidate_pool_digest, evidence_ref_table, rejected_framing_table, unresolved_points, batch_ranking_rules, persistence_rules, and failure_rules.
blocking_conditions:
  - missing evidence map blocks with MISSING_EVIDENCE_MAP.
  - missing source refs blocks with MISSING_EVIDENCE_SOURCE_REFS.
  - missing exploration_context or arbiter_context blocks with MISSING_CONTEXT_PACKET.
  - malformed context envelope or required context payload fields block with MALFORMED_CONTEXT_PACKET.
  - stale context packet cache blocks with STALE_CONTEXT_PACKET.
  - no candidate can cite support/problem/gap evidence blocks with NO_GROUNDED_NEED_CANDIDATE.
  - every proposed candidate is only a broad topic restatement blocks with PSEUDO_GAP_ONLY.
  - ranked candidate draft batch fails minimum schema validation blocks with INVALID_RANKED_CANDIDATE_DRAFT_BATCH.
  - candidate draft admission report cannot be produced blocks with CANDIDATE_DRAFT_ADMISSION_FAILED.
  - unresolved evidence, conflict, or strength refs block or reject affected drafts before persistence with UNRESOLVED_CANDIDATE_DRAFT_REFS.
  - all candidate drafts fail admission gates and no supplemental debate round remains blocks with NO_ADMISSIBLE_NEED_CANDIDATE.
  - required model or debate output remains malformed after allowed retries blocks with MALFORMED_NEED_CANDIDATE_OUTPUT.
  - admitted_drafts is empty blocks with NO_ADMITTED_DRAFTS before persistence.
  - a persistence draft not marked admit in CandidateDraftAdmissionReport blocks with DRAFT_NOT_ADMITTED.
  - persistence command refs cannot resolve blocks with UNRESOLVED_PERSISTENCE_REFS.
  - normalized candidate key conflicts with an existing NeedCandidate blocks with DUPLICATE_NEED_CANDIDATE.
  - any candidate hash or version cannot be computed blocks with NEED_CANDIDATE_VERSION_FAILED.
  - candidate batch exceeds max_persisted_candidates blocks with TOO_MANY_NEED_CANDIDATES.
deterministic_validators:
  - D-25 implementation slice order is contracts_schema, artifact_ref_boundary, context_compiler_integration, orchestrator_adapter, draft_schema_validation, admission_gates, supplemental_routing, persistence_batch, and workflow_harness_scenarios.
  - contracts_schema must define shared DTO/schema/error-code contracts before business persistence, model calls, or WorkflowHarness E2E implementation.
  - artifact_ref_boundary must define artifact write/read refs, artifact hash, redacted snapshot shape, and FunctionalRef resolution before context compiler and orchestration integration depend on artifacts.
  - context_compiler_integration must validate exploration_context, arbiter_context, exact cache key, refs-only input, and context packets before any LLM invocation.
  - orchestrator_adapter must keep mocked_llm, codex_assisted, and provider_llm on the same node I/O schema and differentiate source only through provenance.
  - draft_schema_validation must block invalid RankedCandidateDraftBatch output before admission gates.
  - admission_gates must run as deterministic service logic before persistence and before provider/codex E2E is treated as meaningful.
  - supplemental_routing must be verified first with mocked role outputs and must preserve source draft targeting, question cap, no broad re-exploration, and round-3 terminal behavior.
  - persistence_batch must use the existing TopicSelectionNeedValidationService/repository boundary, admitted-only command inputs, idempotency, all-or-none transaction behavior, and candidate-pool projection refs/hash.
  - workflow_harness_scenarios must cover happy path, zero admitted to supplemental, duplicate to merge hint, malformed draft blocked, persistence rollback, and execution-mode shape stability.
  - deterministic unit tests must pass before model-like execution tests.
  - mocked_llm WorkflowHarness scenarios must pass before provider_llm or codex_assisted scenarios.
  - implementation must not add NeedCandidateSet, raw transcript handoff, mode-specific result shapes, D-20/D-21/D-23 bypasses, partial batch persistence, or cached response masquerading as provider_llm.
  - GenerateNeedCandidateNodeInput contains schema_version, workflow_run_id, node_attempt_id, topic_scope_ref, evidence_map_ref, evidence_strength_ref, resource_sample_set_ref, candidate_pool_projection_ref, search_snapshot_refs, resource_snapshot_refs, exploration_context_ref, arbiter_context_ref, execution_mode, profile_id, policy_version, and operator_reuse_approval_ref.
  - GenerateNeedCandidateNodeInput carries refs and context packet refs, not scattered raw DB records.
  - GenerateNeedCandidateNodeInput execution_mode is codex_assisted, provider_llm, or mocked_llm.
  - all execution modes use the same GenerateNeedCandidateNodeInput and GenerateNeedCandidateNodeResult shapes.
  - execution source differences are recorded through provenance, not result shape changes.
  - candidate_pool_projection_ref may be null only when no prior candidate pool exists for the title/topic scope.
  - operator_reuse_approval_ref is required only for local cost-saving cached response reuse under codex_assisted.
  - GenerateNeedCandidateNodeResult contains schema_version, workflow_run_id, node_attempt_id, status, terminal_result, persisted_candidate_refs, candidate_pool_projection_ref, candidate_pool_projection_hash, artifact_refs, warning_codes, and error_code.
  - GenerateNeedCandidateNodeResult status is succeeded, blocked, or require_human_review.
  - GenerateNeedCandidateNodeResult terminal_result is finalize, blocked, or require_human_review.
  - status succeeded requires terminal_result finalize, non-empty persisted_candidate_refs, candidate_pool_projection_ref, and candidate_pool_projection_hash.
  - status blocked requires terminal_result blocked and the last available failure artifact.
  - status require_human_review requires terminal_result require_human_review and human-review reason metadata.
  - persisted_candidate_refs may be empty only when status is blocked or require_human_review.
  - succeeded result requires artifact refs for ranked_candidate_draft_batch, minimum_schema_validation_report, candidate_draft_admission_report, persist_need_candidate_batch_command, and discovery_audit.
  - blocked result requires at least one failure artifact ref from schema validation report, admission report, supplemental routing decision, persist command snapshot, or discovery audit.
  - require_human_review result requires candidate_draft_admission_report or supplemental_round_routing_decisions plus human-review reason.
  - downstream handoff is limited to persisted_candidate_refs, candidate_pool_projection_ref, candidate_pool_projection_hash, discovery audit ref, warning_codes, and error_code.
  - downstream nodes must not read raw debate transcripts or hidden reasoning as business input.
  - explorer and deep_critic role calls consume exploration_context.
  - arbiter calls consume arbiter_context plus role-level summaries and deterministic gate checklist.
  - context_packet_cache hits require exact match on input refs/hash, compiler version, policy version, schema version, execution mode, profile, and context family.
  - exploration_context cache hits must not satisfy arbiter_context requests and arbiter_context cache hits must not satisfy exploration_context requests.
  - durable memory included in context appears only as constraint, warning, required challenge, duplicate/merge hint, recheck hint, risk carry-forward, or downstream challenge; it is never treated as evidence.
  - arbiter_context carries role-level summaries but does not require raw role transcripts.
  - arbiter_context carries at most 5 candidate drafts and 3..5 key evidence refs per draft unless a future policy version changes this cap.
  - exact-invocation response reuse is never treated as live provider_llm execution.
  - cached response reuse must run schema validation, per-candidate gates, audit/artifact recording, and authority-write boundary checks.
  - max_persisted_candidates is 5 unless a future policy version explicitly changes it.
  - draft-to-NeedCandidate mapping allows direct persistence only for candidate_need, unmet_need_statement, mechanism_type, mechanism_summary, mechanism_payload, scope_notes, non_goal_notes, prior_art_status, evidence_role_bundle, conflict_refs, strength_assessment_refs, gap_codes, speculative, and confidence.
  - backend/runtime derives id, workspace/title/evidence refs, candidate_version, lifecycle_status, decision_status, review_status, freshness_status, control-plane refs, artifact refs, result refs, merge refs, creator, and timestamps.
  - draft_id, rank, batch_ranking_rationale, arbiter_selection_rationale, rejected_framings, unresolved_points, recheck_suggestions, duplicate_or_merge_hint, and raw role transcripts are artifact-only unless a later explicit node policy changes their mapping.
  - model or debate output is a ranked candidate draft batch before persistence.
  - ranked candidate draft batch has schema_version, draft_batch, drafts, rejected_framings, and unresolved_points.
  - draft_batch has batch_id, terminal_result, and ranking_rationale.
  - terminal_result is finalize, blocked, or require_human_review.
  - finalize requires at least one draft.
  - blocked may have zero drafts but must include unresolved_points or rejected_framings with reason codes.
  - require_human_review requires at least one unresolved point with suggested_route human_review.
  - draft count is at most max_persisted_candidates.
  - draft ranks are unique and contiguous.
  - each draft has draft_id, rank, candidate_need, unmet_need_statement, mechanism_type, mechanism_summary, mechanism_payload, scope_notes, non_goal_notes, prior_art_status, evidence_role_refs, conflict_refs, strength_assessment_refs, gap_codes, speculative, confidence, and selection_rationale.
  - each draft cites at least one support or challenge evidence ref.
  - each rejected_framing has framing_id, summary, reason_codes, and evidence_refs.
  - each unresolved_point has point_id, summary, severity, and suggested_route.
  - assumptions, uncertainty_notes, duplicate_or_merge_hint, and recheck_suggestions are not required minimum schema fields and remain artifact-only when present.
  - CandidateDraftAdmissionReport is produced before any NeedCandidate authority write.
  - CandidateDraftAdmissionReport contains schema_version, batch_id, node_attempt_id, terminal_result, draft_results, valid_draft_count, rejected_draft_count, merge_hint_count, and blocking_reason_codes.
  - each draft admission result has draft_id, rank, decision, reason_codes, resolved_ref_counts, normalized_candidate_key, duplicate_candidate_refs, required_human_review_points, and supplemental_questions.
  - draft admission decision is one of admit, reject_artifact_only, require_human_review, return_for_supplemental_round, or merge_hint_only.
  - SupplementalRoundRoutingDecision is produced before any optional supplemental round starts.
  - SupplementalRoundRoutingDecision contains schema_version, batch_id, node_attempt_id, current_round_index, remaining_round_budget, routing_decision, source_draft_ids, trigger_reason_codes, supplemental_questions, allowed_roles, forbidden_actions, and stop_condition.
  - supplemental routing decision is one of run_supplemental_round, reject_without_supplement, block, require_human_review, or finalize_with_admitted_batch.
  - run_supplemental_round is allowed only for promising grounded drafts with supplementable reasons and remaining round budget.
  - supplementable reasons are missing or thin challenge coverage, underspecified mechanism with concrete evidence signals, unclear scope or non-goal boundary, support/challenge conflict needing targeted resolution, speculative draft needing risk bounds, or near-duplicate draft with a concrete evidence-backed distinction to test.
  - non-supplementable reasons are malformed schema or context, missing required source refs, topic drift, exclusion/non-goal violation, ungrounded draft, pseudo-gap, pure duplicate, or exhausted round budget.
  - supplemental questions target explicit source_draft_ids and are capped at 5 per supplemental round.
  - supplemental allowed roles default to explorer and deep_critic; arbiter frames questions and synthesizes returned role-level summaries.
  - supplemental workers consume exploration_context plus arbiter-scoped question deltas.
  - supplemental workers must not reopen broad exploration, introduce unrelated candidate families, mutate authority objects, or call persistence paths.
  - supplemental round output re-enters RankedCandidateDraftBatch minimum schema validation and CandidateDraftAdmissionReport gates before persistence.
  - after round 3, supplemental routing must not request another round and must resolve to finalize_with_admitted_batch, block, or require_human_review.
  - schema_gate reuses RankedCandidateDraftBatch minimum schema validation and blocks malformed batches before per-draft gates.
  - reference_integrity_gate verifies all evidence_role_refs, conflict_refs, and strength_assessment_refs resolve to input evidence, resource, or search snapshots.
  - method_family_coverage_gate compares candidate-mentioned method families against search_coverage_digest.method_family_targets and current evidence coverage; uncovered target families emit METHOD_FAMILY_COVERAGE_GAP instead of being silently cleaned.
  - scope_gate rejects or routes drafts whose candidate_need or unmet_need_statement drift outside topic scope, exclusions, or non-goals.
  - evidence_sufficiency_gate allows persistence only when a draft cites at least one support or challenge ref.
  - mechanism_sufficiency_gate rejects drafts that are only broad topics, interest statements, or pseudo-gaps without a researchable mechanism, method, system design, evaluation path, or technical lever.
  - novelty_duplicate_gate computes normalized_candidate_key and compares it with candidate-pool context before new authority creation.
  - duplicate drafts become merge_hint_only unless a later human/deterministic policy explicitly authorizes a new candidate.
  - risk_speculation_gate allows speculative drafts to persist only when challenge/conflict refs or explicit scope limits are present.
  - batch_gate requires admitted draft count to be 1..max_persisted_candidates before authority persistence.
  - zero admitted drafts may return_for_supplemental_round only while debate rounds remain; otherwise the node blocks or requires human review.
  - admission gates must not rewrite candidate content, invent missing refs, create ValidatedNeed, or mutate SearchPlan authority.
  - PersistNeedCandidateBatchCommand is constructed only from draft_results with decision admit.
  - PersistNeedCandidateBatchCommand contains schema_version, node_attempt_id, workflow_run_id, topic_scope_ref, evidence_map_ref, resource_sample_set_ref, ranked_candidate_draft_batch_artifact_ref, admission_report_artifact_ref, supplemental_routing_artifact_refs, admitted_drafts, and idempotency_key.
  - each admitted draft command contains draft_id, rank, candidate_need, unmet_need_statement, mechanism_type, mechanism_summary, mechanism_payload, scope_notes, non_goal_notes, prior_art_status, evidence_role_bundle, conflict_refs, strength_assessment_refs, gap_codes, speculative, confidence, normalized_candidate_key, and source_admission_decision_ref.
  - persistence command must not include raw debate output, non-admitted drafts, rejected framings, unresolved points, hidden reasoning, or artifact rationale as authority fields.
  - backend/runtime derives NeedCandidate id, candidate_version, candidate_hash, lifecycle_status, decision_status, review_status, freshness_status, workspace/title/topic/evidence authority refs, artifact refs, audit refs, creator/source metadata, and timestamps.
  - candidate_hash is computed from canonicalized admitted authority fields, key refs, and policy/schema versions.
  - candidate_hash excludes rank, rationale, role transcripts, hidden reasoning, rejected framings, unresolved points, and supplemental routing explanations.
  - initial candidate_version is 1.
  - idempotency_key is derived from workflow_run_id, node_attempt_id, admitted draft ids, and admission report hash.
  - replaying the same idempotency_key returns the same persisted candidate refs and must not insert duplicates.
  - same workflow_run_id + node_attempt_id + input_hash is exact replay and returns the existing discovery trace snapshot without recompiling context, reinvoking Codex/provider/debate, or writing authority.
  - same workflow_run_id + node_attempt_id with a changed input_hash blocks with VERSION_CONFLICT before context compilation, model invocation, or authority writes.
  - normalized candidate key conflicts block with DUPLICATE_NEED_CANDIDATE and do not auto-merge.
  - persisted candidates link to ranked candidate draft batch artifact ref, admission report artifact ref, supplemental routing artifact refs, discovery audit ref, workflow_run_id, and node_attempt_id.
  - successful persistence returns persisted_candidate_refs, candidate_pool_projection_ref, and candidate_pool_projection_hash.
  - candidate_pool_projection is a query/sorting view over NeedCandidate rows and does not create NeedCandidateSet authority.
  - deterministic per-candidate gates run before any NeedCandidate authority write.
  - successful output creates 1..5 persisted NeedCandidate authority records through the existing need-validation service boundary.
  - each persisted candidate has candidate_need, unmet_need_statement, mechanism_type, mechanism_payload, evidence_role_bundle, gap_codes, speculative, confidence, scope_notes, and non_goal_notes according to existing TopicSelectionNeedCandidateRecord fields.
  - each persisted candidate passes support/challenge coverage, pseudo-gap, scope, non-goal, and duplicate/merge checks independently.
  - invalid candidate drafts are filtered before the authority-write transaction starts and are preserved only as rejected-framing artifacts.
  - the valid candidate batch is persisted all-or-none; partial batch persistence is not allowed.
  - persisted candidates in the same attempt share discovery audit refs and workflow/run provenance.
  - discovery artifact records explored alternatives, rejected framings, merge hints, batch ranking, and why each persisted candidate was selected.
  - all cited refs come from input evidence, search, or resource snapshots.
  - persisted candidates are not supported only by context/background refs.
  - candidate-pool projection includes the new NeedCandidate records after persistence and does not require a separate NeedCandidateSet object.
  - output may include recheck_suggestions or evidence_gaps, but must not create SearchPlan authority changes.
  - output must not create ValidatedNeed.
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy:
  - debate_allowed when evidence map supports multiple plausible need framings.
  - debate_allowed when first-pass need statement is broad, shallow, or topic-like.
  - debate_allowed when support evidence suggests value but challenge evidence suggests pseudo-gap or prior-art risk.
  - debate_allowed when benchmark/comparison evidence implies an evaluation need rather than a method need.
  - debate_allowed when resource samples contain competing method families, domains, or problem framings.
  - debate_allowed when high-value evidence is present but scope, non-goals, or mechanism are underspecified.
  - debate_not_allowed when required evidence map or source refs are missing.
  - debate_not_allowed when the workflow intentionally exercises the single-agent path.
  - default roles are arbiter, explorer, and deep_critic.
  - arbiter controls evidence-signal extraction, candidate framing expansion, candidate-pool comparison, candidate batch synthesis/ranking, and grounded quality check.
  - round 1 is required exploration plus critique.
  - rounds 2 and 3 are optional supplemental rounds scoped by arbiter to concrete unresolved questions.
  - maximum total rounds is 3.
  - supplemental rounds must not restart broad exploration.
  - after round 3, arbiter must emit finalize, blocked, or require_human_review.
profile_escalation_policy_ref:
  policy: DMP-05 provider fallback and profile escalation policy
  registry_service: TopicSelectionModelProfileRegistryService
  invocation_boundary: TopicSelectionAgentOrchestratorService
  semantics:
    - provider/model/model-option selection is profile-registry-owned.
    - automatic fallback to another provider, Codex, or mock is forbidden.
    - provider change requires manual rerun or explicit model_option_id override with new provenance.
    - mocked_llm is test/acceptance-only and cannot satisfy product authority decisions.
    - codex_assisted is allowed only when the node or slot permits it and remains non-provider provenance.
input_contract_refs:
  - GenerateNeedCandidateNodeInput
  - TopicSelectionEvidenceMapHandoff@v1 as optional transition provenance
  - TopicSelectionEvidenceMap
  - EvidenceStrengthAssessment
  - TopicSelectionResourceSampleSet
  - TopicSelectionNeedCandidateRecord list projection
  - exploration_context packet
  - arbiter_context packet
  - Search/resource snapshot refs
output_contract_refs:
  - GenerateNeedCandidateNodeResult
  - RankedCandidateDraftBatch minimum schema
  - CandidateDraftAdmissionReport
  - SupplementalRoundRoutingDecision
  - PersistNeedCandidateBatchCommand
  - TopicSelectionNeedCandidateRecord
  - CandidatePoolProjection refs/hash
  - Candidate discovery audit/artifact refs
authority_write_boundary:
  workflow_harness: TopicSelectionWorkflowHarnessService.runGenerateNeedCandidateScenario
  adapter: TopicSelectionGenerateNeedCandidateOrchestratorAdapterService.generateRankedCandidateDraftBatch
  context_compiler: TopicSelectionNeedDiscoveryContextCompilerService
  artifact_boundary: TopicSelectionNeedDiscoveryArtifactBoundaryService
  single_agent_invocation: TopicSelectionAgentOrchestratorService.invokeStructuredOutput
  debate_runtime: TopicSelectionNeedDiscoveryDebateLoopService.runNeedDiscoveryDebate
  deterministic_gates:
    - TopicSelectionRankedCandidateDraftBatchValidatorService.validate
    - TopicSelectionCandidateDraftAdmissionService.createAdmissionReport
    - TopicSelectionSupplementalRoundRoutingService.createRoutingDecision
  batch_command_builder: TopicSelectionPersistNeedCandidateBatchService.buildCommand
  authority_persistence: TopicSelectionPersistNeedCandidateBatchService.persistBatch
  repository: TopicSelectionNeedValidationRepository.createNeedCandidatesBatch
  compatibility_route:
    route: POST /topic-selection/v1a/need-candidates
    boundary: TopicSelectionNeedValidationService.createNeedCandidateFromEvidenceMap
    semantics: legacy/manual single-candidate creation path; it MUST NOT claim WorkflowHarness, debate, or multi-candidate batch execution provenance.
  authority_objects:
    - TopicSelectionNeedCandidateRecord
  forbidden_authority_objects:
    - NeedCandidateSet
    - ValidatedNeed
    - TopicQuestionContract
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
  partial_batch_persistence: false
audit_artifact_policy:
  - Persist candidate discovery audit summary with execution_mode, executor_kind, profile, input hash, output hash, candidate versions/hashes, and persisted candidate refs.
  - Persist WorkflowHarness discovery trace with payload_schema, input_hash, node_input, compiled_context, adapter_result, assertions, artifact refs, and authority refs so exact replay can return a stable node result.
  - Persist exploration_context and arbiter_context packet refs/hashes, cache hit/miss status, and compression versions.
  - If response reuse occurs, record response_source=cached_exact_invocation, cache key, source workflow/node/attempt id, source execution mode, response hash, context packet hash, schema/profile/policy versions, operator approval or local setting ref, and non_provider=true.
  - Store ranked candidate draft batch, minimum schema validation report, CandidateDraftAdmissionReport, SupplementalRoundRoutingDecision, PersistNeedCandidateBatchCommand redacted snapshot, explored alternatives, rejected framings, merge hints, recheck suggestions, unresolved points, batch ranking, debate role summaries, arbiter output, draft-to-record mapping report, candidate-pool projection refs/hash, and validation report as artifacts.
  - Do not persist hidden reasoning, provider secrets, or raw provider logs.
failure_semantics:
  - invalid payload or missing preconditions returns blocked before authority write.
  - node_attempt_id replay with input_hash drift fails with VERSION_CONFLICT before context compilation, provider/Codex/debate invocation, or authority writes.
  - stale, missing, or hash-mismatched context packets block before model/debate invocation.
  - response cache hit in a provider-quality scenario requiring provider_llm is treated as a miss or block, not as provider execution.
  - malformed model/debate output follows D-05 retry/escalation and then blocked or require_human_review.
  - insufficient evidence returns blocked with evidence gap refs rather than inventing a candidate.
  - admission gate failures are recorded in CandidateDraftAdmissionReport before any authority write.
  - invalid candidates are dropped only when at least one valid candidate remains and the artifact records the rejection reason; otherwise the node blocks.
  - duplicate drafts return merge_hint_only and do not create new authority rows.
  - supplemental round routing failures are recorded in SupplementalRoundRoutingDecision and do not trigger broad re-exploration.
  - malformed schema/context, topic drift, ungrounded drafts, pseudo-gaps, pure duplicates, or exhausted round budget do not trigger supplemental rounds.
  - zero admitted drafts return for supplemental round only within the node round limit; after round exhaustion the node blocks or requires human review.
  - debate unresolved may return require_human_review only when grounded candidate drafts exist but batch selection or persistence requires human judgment.
  - empty admitted_drafts, non-admitted draft persistence, unresolved persistence refs, duplicate normalized keys, or hash/version failures block before authority commit.
  - persistence conflict rolls back the valid batch, records candidate versions/hashes and intended authority refs, and does not retry as a different semantic run.
  - any per-draft persistence failure rolls back the full batch; partial batch persistence is not allowed.
  - PERSIST_NEED_CANDIDATE_BATCH_FAILED is returned when persistence batch execution fails after command validation but before successful commit.
  - node result shape remains stable for codex_assisted, provider_llm, and mocked_llm failures.
```

### `topic-selection.v1a.validate-need-adjudication.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.validate-need-adjudication.v1
authority_object: ValidateNeedAdjudicationResult
locked_decisions:
  N7-D01:
    summary: adjudication_result_only_split_from_human_confirmation
    rules:
      - Node 7 persists TopicSelectionValidateNeedAdjudicationResultRecord only.
      - Node 7 MUST NOT create ValidatedNeed, HumanConfirmedDecision, V1bInputBundle, TopicQuestionContract, SearchPlan mutations, NeedCandidateSet, or PaperProject/Bridge authority.
      - final_decision=validate means pending human confirmation; Node 8 is the only ValidatedNeed materialization path.
  N7-D02:
    summary: single_agent_recommendation_allowed_no_debate
    rules:
      - Node 7 may use single-agent model-like execution to generate an adjudication recommendation packet.
      - Allowed modes are codex_assisted, provider_llm, and mocked_llm.
      - Default local mode is codex_assisted; provider_llm is explicit quality upgrade; mocked_llm is test/acceptance-only.
      - Node 7 is not debate-eligible because debate belongs to Node 6 need discovery, while Node 7 adjudicates and routes an already selected candidate.
      - Model-like output cannot directly create authority or satisfy human confirmation.
      - TopicSelectionNeedValidationService.adjudicateNeed remains the only adjudication authority writer.
  N7-D03:
    summary: semantic_recommendation_provenance_with_whitelist_authority_mapping
    rules:
      - Semantic content is allowed only as recommendation/provenance, such as TopicSelectionNeedAdjudicationRecommendationPacket@v1.
      - Recommendation packets are not authority and cannot override the ValidationDecisionSupportPacket.
      - Support packet, readiness assessment, NeedCandidate, and repository-resolved evidence/risk refs are the semantic SSOT for adjudication.
      - Node 7 MUST NOT re-derive evidence roles, risk refs, merge targets, or recheck refs from natural-language rationale.
      - Authority fields are whitelist-mapped and ref-grounded only.
      - Allowed mapped authority fields are final_decision, rationale, required_actions, rejected_reason, gap_codes, accepted_risk_refs, residual_risk_refs, merge_target_need_candidate_ref, and search-plan recheck reason/gap fields.
      - If a recommendation conflicts with the support packet or cannot be mapped deterministically, the runner must block or require human review instead of silently rewriting semantic content.
  N7-D04:
    summary: final_decision_enum_and_route_semantics
    values:
      validate:
        meaning: Candidate may proceed to Node 8 human confirmation.
        requirements:
          - support packet is ready.
          - unresolved blockers are absent or explicitly accepted as risk refs.
        forbidden:
          - create ValidatedNeed in Node 7.
          - publish v1b input bundle.
      return_to_candidate:
        meaning: Candidate remains revisable and returns to NeedCandidate-level repair.
        requirements:
          - actionable rationale or required_actions.
      request_searchplan_recheck:
        meaning: Evidence/search coverage needs repair before adjudication can advance.
        requirements:
          - searchplan_recheck_reason or gap_codes.
        route: SearchPlan recheck request.
      reject:
        meaning: Candidate is not viable and should close as rejected.
        requirements:
          - rejected_reason or equivalent rationale.
      park:
        meaning: Candidate remains a non-advancing hypothesis.
        requirements:
          - park rationale or required_actions.
        forbidden:
          - enter Node 8.
      merge:
        meaning: Candidate is duplicate or should be represented by another NeedCandidate.
        requirements:
          - merge_target_need_candidate_ref.
          - merge target belongs to the same title-card scope.
          - merge target is not the selected candidate.
        forbidden:
          - auto-merge authority content.
      require_human_review:
        meaning: not a final_decision; node status/routing outcome only when N7 cannot safely persist adjudication.
  N7-D05:
    summary: validate_adjudication_requires_node8_human_confirmation
    rules:
      - final_decision=validate produces a confirmable adjudication only.
      - Node 7 MUST reserve output_validated_need_id as a stable target id for validate adjudication; only Node 8 may materialize that id as TopicSelectionValidatedNeedRecord authority.
      - After a validate adjudication, NeedCandidate remains pending confirmation with decision_status=ready_for_validation and review_status=needs_human_review.
      - Node 8 MUST consume the validate adjudication and explicit human, hybrid, or human_delegated confirmation before writing HumanConfirmedDecision and materializing ValidatedNeed.
      - Only Node 8 may move the candidate to decision_status=resulted_in_validated_need, review_status=human_confirmed, and lifecycle_status=closed.
      - v1b publication MUST consume ValidatedNeed from Node 8, not Node 7 adjudication output.
      - Node 7 has no automatic-confirm mode; Codex/provider recommendations can route to Node 8 but cannot satisfy confirmation.
  N7-D06:
    summary: state_compression_boundary
    layers:
      model_visible:
        allowed:
          - final_decision.
          - rationale.
          - required_actions.
          - gap_codes.
          - accepted_risk_refs.
          - residual_risk_refs.
          - rejected_reason.
          - merge_target_need_candidate_ref.
          - searchplan_recheck_reason.
        forbidden:
          - decision_status.
          - review_status.
          - lifecycle_status.
          - freshness_status.
          - loopback_target.
          - result_validated_need_id.
          - open_recheck_request_refs.
      workflow_harness:
        route_outcomes:
          validate: advance_to_human_confirmation
          return_to_candidate: repair_need_candidate
          request_searchplan_recheck: repair_search_plan
          reject: stop_rejected
          park: hold_candidate
          merge: stop_merged
          blocked: blocked
          require_human_review: require_human_review
        rule: route_outcome is the only orchestration-level state that automated callers should consume.
      domain_service:
        rule: candidate persistence statuses are deterministic derived state and cannot be supplied by caller/model/harness.
        mappings:
          validate:
            decision_status: ready_for_validation
            lifecycle_status: preserve_current
            review_status: needs_human_review
            freshness_status: preserve_current
          return_to_candidate:
            decision_status: returned_for_revision
            lifecycle_status: hypothesis
            review_status: human_reviewed
            freshness_status: preserve_current
          request_searchplan_recheck:
            decision_status: searchplan_recheck_requested
            lifecycle_status: hypothesis
            review_status: human_reviewed
            freshness_status: recheck_required
          reject:
            decision_status: rejected
            lifecycle_status: closed
            review_status: human_reviewed
            freshness_status: preserve_current
          park:
            decision_status: parked
            lifecycle_status: hypothesis
            review_status: human_reviewed
            freshness_status: preserve_current
          merge:
            decision_status: merged
            lifecycle_status: closed
            review_status: human_reviewed
            freshness_status: preserve_current
    rules:
      - final_decision is the only business judgment input.
      - route_outcome is the only orchestration output.
      - DB status fields are domain-service derived state.
      - park is a hold state, not a closed terminal state.
      - validate routes to Node 8 and is not final approval.
  N7-D07:
    summary: recommendation_to_authority_gate
    authority_sources:
      human_or_hybrid_adjudication_packet:
        may_materialize_final_decisions:
          - validate
          - return_to_candidate
          - request_searchplan_recheck
          - reject
          - park
          - merge
        requirements:
          - deterministic validation passes.
          - actor/provenance identifies human or hybrid acceptance.
      fixture_human_decision:
        may_materialize_final_decisions:
          - validate
          - return_to_candidate
          - request_searchplan_recheck
          - reject
          - park
          - merge
        requirements:
          - test_or_acceptance_only.
          - explicit fixture provenance.
      codex_assisted_or_provider_llm_recommendation:
        materialization_allowed_without_extra_human_acceptance:
          - validate
          - request_searchplan_recheck
          - return_to_candidate
        materialization_requires_human_or_hybrid_acceptance:
          - reject
          - merge
          - park
        low_risk_requirements:
          validate:
            - creates pending Node 8 handoff only.
            - does not create ValidatedNeed or human confirmation.
          request_searchplan_recheck:
            - creates typed SearchPlanRecheckRequest only after validation.
            - does not mutate SearchPlan.
          return_to_candidate:
            - includes actionable required_actions.
      mocked_llm:
        rule: test_or_acceptance_only; no product decision authority.
    rules:
      - model-like recommendation packets cannot directly create ValidateNeedAdjudicationResult.
      - only the WorkflowHarness runner may convert an accepted recommendation into domain-service input after deterministic validation.
      - high-risk model recommendations without human/hybrid acceptance return require_human_review and write no adjudication authority.
  N7-D08:
    summary: readiness_support_packet_freeze_boundary
    runner_sequence:
      - resolve selected NeedCandidate.
      - create or consume explicit NeedCandidateReadinessAssessment.
      - block unless readiness recommendation is ready_for_validation.
      - create or consume explicit ValidationDecisionSupportPacket.
      - freeze support packet refs as recommendation/adjudication truth.
      - run optional recommendation packet through D07 gate.
      - call TopicSelectionNeedValidationService.adjudicateNeed only after deterministic validation passes.
      - return compressed route_outcome from adjudication result.
    packet_modes:
      default: create_fresh
      allowed:
        - create_fresh
        - consume_explicit_ref
      forbidden:
        - auto_find_latest
        - implicit_reuse_by_candidate
        - implicit_reuse_by_timestamp
    explicit_ref_validation:
      readiness_assessment:
        - belongs to selected NeedCandidate.
        - belongs to current title-card scope.
        - recommendation is ready_for_validation.
        - policy/schema/version expectations match runner input.
        - freshness expectations are still satisfied.
      validation_support_packet:
        - belongs to selected NeedCandidate.
        - status is ready.
        - readiness_assessment_ref matches explicit or freshly-created readiness when present.
        - evidence_map_ref, search_run_ref, search_plan_ref, and literature_snapshot_ref match selected candidate lineage.
        - evidence_role_bundle, conflict refs, strength assessment refs, residual risk refs, and required_human_checks are present.
    blocked_readiness_handling:
      rule: readiness recommendations other than ready_for_validation block before support packet or adjudication authority creation.
      recommendations:
        searchplan_recheck:
          repair_hint: repair_search_plan
        needs_scope_revision:
          repair_hint: repair_need_candidate
        evidence_gap:
          repair_hint: repair_need_candidate
        reject:
          repair_hint: require_human_review
          rule: readiness reject is a gate finding, not final_decision=reject.
        merge_required:
          repair_hint: require_human_review
          rule: readiness merge_required is a gate finding, not final_decision=merge.
        park:
          repair_hint: require_human_review
          rule: readiness park is a gate finding, not final_decision=park.
    support_packet_freeze:
      rule: support packet is the frozen evidence/risk/human-check boundary for recommendation and adjudication.
      forbidden_after_freeze:
        - re-read live EvidenceMap as business truth.
        - re-read live SearchPlan as business truth.
        - re-read live SearchRun as business truth.
        - re-read live LiteratureResourcePoolSnapshot or evidence basket as business truth.
        - repair stale refs in place.
      upstream_change_rule: if upstream evidence/search/resource state changes, create a new readiness assessment and support packet before adjudication.
    complexity_guard:
      - N7 runner orchestrates existing services; it does not introduce a new reasoning layer.
      - readiness and support packet are frozen gates, not alternative adjudication authorities.
  N7-D09:
    summary: recommendation_packet_and_automation_handoff_split
    recommendation_packet_contract:
      contract_ref: TopicSelectionNeedAdjudicationRecommendationPacket@v1
      artifact_only: true
      authority: false
      downstream_automation_handoff: false
      allowed_inputs:
        - frozen ValidationDecisionSupportPacket.
        - readiness summary.
        - selected NeedCandidate snapshot.
        - sibling candidate summary.
        - accepted policy instructions.
        - ref-grounded evidence/risk summaries from support packet.
      forbidden_inputs:
        - live DB reads after support packet freeze.
        - mutable EvidenceMap/SearchPlan/SearchRun/resource data.
        - evidence basket live state.
        - hidden reasoning.
        - raw provider logs.
        - debate transcripts.
      allowed_outputs:
        - final_decision.
        - rationale.
        - required_actions.
        - gap_codes.
        - accepted_risk_refs.
        - residual_risk_refs.
        - rejected_reason.
        - merge_target_need_candidate_ref.
        - searchplan_recheck_reason.
      forbidden_outputs:
        - route_outcome.
        - next_node_id.
        - repair_target.
        - decision_status.
        - review_status.
        - lifecycle_status.
        - freshness_status.
        - authority ids to create.
        - direct workflow commands.
    model_profile:
      profile_id: topic-selection.need-adjudication.single-agent.v1
      default_execution_mode: codex_assisted
      provider_llm: explicit_quality_upgrade
      mocked_llm: test_or_acceptance_only
      structured_output_required: true
      output_format: json_schema
      normalized_parameters:
        creativity: low
        reasoning_depth: high
        output_budget: medium
      fallback: disabled
      failure_handling:
        malformed_output: blocked_or_require_human_review
        provider_failure: blocked
        policy_conflict: require_human_review
    node_result_contract:
      contract_ref: TopicSelectionValidateNeedAdjudicationNodeResult@v1
      automation_handoff: true
      consumed_by_downstream_automation: true
      must_include:
        - node_id.
        - status.
        - route_outcome.
        - need_candidate_ref.
        - readiness_assessment_ref when created.
        - validation_support_packet_ref when created.
        - adjudication_result_ref when created.
        - next_node_id when applicable.
        - repair_target when applicable.
        - required_actions.
        - blocker_codes.
        - warning_codes.
        - accepted_risk_refs.
        - residual_risk_refs.
        - recheck_request_ref when created.
        - merge_target_need_candidate_ref when present.
        - recommendation_packet_ref when created.
        - harness_trace_artifact_ref.
      route_outcome_actions:
        advance_to_human_confirmation: call topic-selection.v1a.human-confirm-need.v1.
        repair_need_candidate: route to candidate repair/generation loop.
        repair_search_plan: route to SearchPlan recheck.
        stop_rejected: stop current candidate as rejected.
        hold_candidate: pause current candidate without Node 8 or v1b publication.
        stop_merged: stop current candidate and point to merge target.
        blocked: stop automation and expose blockers/repair hints.
        require_human_review: wait for human or hybrid acceptance.
    rules:
      - downstream automation must consume TopicSelectionValidateNeedAdjudicationNodeResult@v1, not TopicSelectionNeedAdjudicationRecommendationPacket@v1.
      - validate handoffs must carry reserved_validated_need_ref as the N8 materialization target; the ref is an automation anchor, not authority.
      - LLM/Codex/provider/mock must not output route_outcome, next_node_id, repair_target, or direct workflow commands.
      - runner derives route_outcome and next automation handoff after D07 gate and domain-service result.
  N7-D10:
    summary: retry_idempotency_and_duplicate_adjudication_protection
    attempt_identity:
      required:
        - workflow_run_id.
        - node_attempt_id.
      bound_outputs:
        - TopicSelectionValidateNeedAdjudicationNodeResult@v1.
        - TopicSelectionNeedAdjudicationRecommendationPacket@v1 when present.
        - readiness_assessment_ref when created.
        - validation_support_packet_ref when created.
        - adjudication_result_ref when created.
        - harness_trace_artifact_ref.
      input_hash_includes:
        - node_id.
        - node_attempt_id.
        - selected NeedCandidate ref/version.
        - packet mode and explicit readiness/support refs when supplied.
        - policy/schema/profile versions.
        - execution mode.
        - recommendation/adjudication request payload.
        - support packet hash or support packet ref once frozen.
    replay_policy:
      same_node_attempt_id:
        meaning: exact replay request.
        success:
          - input hash matches existing attempt.
          - prior node result and trace artifact are available.
          - return existing node result with replay provenance.
          - perform no authority writes.
        blocked:
          - input hash differs from existing attempt.
          - prior node result or trace artifact is missing.
          - requested replay would require creating authority.
    new_attempt_policy:
      before_adjudication:
        - append-only fresh readiness/support packet creation is allowed under create_fresh.
        - explicit packet refs remain allowed only through D08 validation.
      after_adjudication_exists:
        - second adjudication authority creation is forbidden.
        - return blocked duplicate result with existing adjudication ref when resolvable.
        - include existing N7 node result/handoff ref when available.
        - automation may consume existing handoff or require explicit repair/human-supervised flow.
    model_retry_policy:
      allowed:
        - at most one same-profile technical retry for transient transport failure.
        - at most one same-profile retry for malformed structured output before authority write.
      forbidden:
        - automatic provider fallback.
        - automatic Codex fallback.
        - automatic mocked fallback.
        - keyword/rule-only adjudication fallback.
        - changing final_decision during retry without new recommendation provenance.
        - retry after high-risk recommendation has already routed to require_human_review.
    partial_artifact_policy:
      - readiness/support packets created before later model/gate failure remain append-only audit facts.
      - blocked node result must reference created readiness/support packet refs when available.
      - later attempts must not implicitly reuse these packets as latest; explicit refs are required.
  N7-D11:
    summary: node_result_status_and_blocker_taxonomy
    allowed_statuses:
      ready:
        meaning: node result is immediately consumable by downstream automation.
        requirements:
          - route_outcome is not blocked.
          - route_outcome is not require_human_review.
          - required authority/provenance refs for the route are present.
        notes:
          - may represent fresh authority creation.
          - may represent exact replay of an existing ready node result.
      blocked:
        meaning: current attempt cannot auto-advance.
        requirements:
          - route_outcome is blocked.
          - blocker_codes are non-empty.
          - repair hints or existing refs are included when available.
        use_for:
          - malformed input.
          - non-ready readiness.
          - stale or mismatched refs.
          - replay drift or missing replay evidence.
          - duplicate or pending adjudication.
          - provider/model failure.
          - malformed recommendation that cannot be mapped.
      require_human_review:
        meaning: current attempt needs human or hybrid acceptance before materialization or advancement.
        requirements:
          - route_outcome is require_human_review.
          - review_reason_codes are non-empty.
          - recommendation/support refs are included when available.
        use_for:
          - high-risk model recommendation without human/hybrid acceptance.
          - semantic conflict that cannot be deterministically mapped.
          - policy conflict requiring operator judgment.
    forbidden_statuses:
      - ready_with_warning.
      - duplicate.
      - replayed.
      - pending.
      - route_specific_statuses.
    code_and_provenance_rules:
      - warnings are represented only by warning_codes and trace/audit refs.
      - duplicate/pending adjudication is status=blocked with blocker_code DUPLICATE_OR_PENDING_ADJUDICATION plus existing refs.
      - replay is represented by replay_provenance and keeps the original status.
      - replay drift or missing replay evidence is status=blocked.
      - human review is a status only when the current attempt must stop for human/hybrid acceptance; Node 8 human confirmation is reached through status=ready plus route_outcome=advance_to_human_confirmation.
  N7-D12:
    summary: implementation_readiness_review_and_test_matrix
    decision:
      policy_status: implementation_ready
      automation_callability: callable
      implementation_may_start: true
    current_repo_support:
      - readiness, support-packet, adjudication, human-confirmation, and v1b publication routes already exist.
      - TopicSelectionNeedValidationService owns readiness/support/adjudication authority.
      - duplicate adjudication is already guarded through result_adjudication_id.
      - TopicSelectionAgentOrchestratorService and TopicSelectionModelProfileRegistryService exist.
      - WorkflowHarness trace artifact pattern exists for prior v1a nodes.
    required_implementation_gaps:
      - add TopicSelectionNeedAdjudicationRecommendationPacket@v1 shared contract/schema.
      - add TopicSelectionValidateNeedAdjudicationNodeResult@v1 shared contract/schema.
      - register topic-selection.need-adjudication.single-agent.v1.
      - add needValidation dependency to TopicSelectionWorkflowHarnessService.
      - implement runValidateNeedAdjudicationScenario.
      - implement D08 explicit packet validation without latest lookup.
      - harden TopicSelectionNeedValidationService.adjudicateNeed with support-packet lineage validation so direct REST adjudication cannot bypass harness semantics.
      - implement D09 recommendation invocation and handoff split.
      - implement D10 replay/duplicate handling.
      - implement D11 status/code taxonomy.
    db_migration_expectation:
      initial_expectation: not_required
      rationale:
        - authority objects already exist.
        - recommendation packet and node result can be artifact/control-plane scoped.
        - trace snapshot and artifact refs already exist.
      pause_condition:
        - exact replay cannot be implemented through existing workflow/artifact/trace lookup.
        - implementation requires a durable node-result index not already represented in the repo schema.
      action_if_pause_condition_hits: use DB SSOT workflow before adding storage.
    implementation_order:
      - shared contracts and schema tests.
      - model profile registry entry and registry tests.
      - harness input/result/trace types.
      - readiness/support orchestration.
      - recommendation invocation and D07 gate.
      - adjudication write and node result handoff mapping.
      - replay and duplicate handling.
      - focused unit tests and route regression tests.
    implementation_risks:
      - explicit readiness/support packet validation accidentally reuses latest-by-candidate compatibility behavior.
      - shared readiness enum values merge_required or park are not handled by the runner.
      - support-packet freeze is weakened by live evidence/search/resource rereads.
      - direct REST adjudication bypasses harness lineage checks and accepts a stale support packet.
      - replay lookup cannot reliably find prior node result and trace.
      - replay storage gaps are hidden by starting a fresh attempt or adding ad hoc local storage.
      - high-risk model recommendations create authority without human/hybrid acceptance.
      - validate is misclassified as require_human_review instead of ready handoff to Node 8.
      - duplicate adjudication creates a second result instead of blocked duplicate handoff.
    risk_amendments:
      N7-D12-AM01:
        summary: full_readiness_enum_coverage
        rule: every shared readiness recommendation value must be handled explicitly by the runner.
        non_ready_values:
          - needs_scope_revision.
          - evidence_gap.
          - searchplan_recheck.
          - merge_required.
          - reject.
          - park.
        handling:
          - block before support packet creation and adjudication authority.
          - return repair or review hints in the node result.
          - do not map readiness merge_required to final_decision merge.
          - do not map readiness park to final_decision park.
          - high-risk persisted decisions still require D07 human or hybrid acceptance.
      N7-D12-AM02:
        summary: service_level_support_packet_lineage_guard
        rule: lineage validation must exist in both WorkflowHarness and TopicSelectionNeedValidationService.adjudicateNeed.
        validate_refs:
          - need_candidate_ref.
          - readiness_assessment_ref.
          - evidence_map_ref.
          - search_run_ref.
          - search_plan_ref.
          - literature_snapshot_ref.
          - policy_version.
          - schema_version.
        failure_result: VERSION_CONFLICT or GATE_CONSTRAINT_FAILED before adjudication authority write.
        purpose: prevent direct REST route compatibility from becoming a second semantic track.
      N7-D12-AM03:
        summary: replay_storage_preflight
        rule: exact replay must prove stable node-result and trace lookup before runner is callable.
        lookup_key:
          - workflow_run_id.
          - node_attempt_id.
        pass_condition: prior node result, trace artifact, and input hash are all recoverable.
        pause_condition: existing storage cannot guarantee exact replay lookup.
        action_if_pause_condition_hits: use DB SSOT workflow for durable node-result indexing before implementation continues.
preconditions:
  - workflow_run_id and node_attempt_id are present.
  - selected NeedCandidate exists and belongs to the current title_card_id/topic scope.
  - selected NeedCandidate decision_status is ready_for_validation.
  - selected NeedCandidate lifecycle_status is not closed.
  - selected NeedCandidate has not already produced a ValidatedNeed.
  - ValidationDecisionSupportPacket exists and belongs to the selected NeedCandidate.
  - support packet status is ready.
  - support packet evidence_map_ref, search_run_ref, search_plan_ref, literature_snapshot_ref, evidence_role_bundle, conflict_refs, strength_assessment_refs, residual_risk_refs, and required_human_checks are available.
  - sibling NeedCandidate refs for the title card are available as candidate-pool context when duplicate/merge/park/reject decisions are possible.
  - readiness assessment exists with recommendation ready_for_validation when supplied.
  - if readiness/support refs are supplied, they are explicit refs and not latest-by-candidate lookup results.
  - support packet lineage matches candidate, readiness, evidence map, search run, search plan, literature snapshot, policy version, and schema version.
  - evidence map freshness is current or accepted risk/recheck refs explicitly explain the residual risk.
  - execution packet includes final-decision recommendation context, but human confirmation remains outside this node.
  - validate decisions may prepare a human-confirmation recommendation package, but this is handoff material only and cannot satisfy human confirmation.
  - model-like recommendation requests include profile topic-selection.need-adjudication.single-agent.v1 or an explicit compatible registry override.
blocking_conditions:
  - malformed payload returns INVALID_PAYLOAD before authority creation.
  - missing workflow_run_id or node_attempt_id returns INVALID_PAYLOAD before authority creation.
  - node_attempt_id replay with input hash drift blocks with VERSION_CONFLICT.
  - node_attempt_id with an existing trace and changed input hash blocks with VERSION_CONFLICT; a first-time attempt without prior trace may proceed as a fresh attempt.
  - NeedCandidate not found returns NOT_FOUND.
  - support packet not found returns NOT_FOUND.
  - support packet belongs to a different NeedCandidate blocks with VERSION_CONFLICT.
  - support packet lineage differs from selected candidate/readiness/evidence/search/literature refs blocks with VERSION_CONFLICT or GATE_CONSTRAINT_FAILED.
  - selected NeedCandidate already produced a ValidatedNeed blocks with GATE_CONSTRAINT_FAILED.
  - selected NeedCandidate already has a pending adjudication blocks with GATE_CONSTRAINT_FAILED.
  - selected NeedCandidate lifecycle_status closed blocks with GATE_CONSTRAINT_FAILED.
  - selected NeedCandidate decision_status other than ready_for_validation blocks with GATE_CONSTRAINT_FAILED.
  - support packet status not ready blocks with GATE_CONSTRAINT_FAILED.
  - support packet refs cannot resolve blocks with NOT_FOUND or VERSION_CONFLICT.
  - readiness assessment belongs to a different NeedCandidate blocks with VERSION_CONFLICT.
  - readiness assessment recommendation other than ready_for_validation blocks with GATE_CONSTRAINT_FAILED.
  - readiness recommendation merge_required or park blocks as a gate finding and must not be persisted as final_decision merge or park.
  - implicit latest readiness/support packet lookup blocks with GATE_CONSTRAINT_FAILED.
  - explicit readiness/support packet lineage or freshness mismatch blocks with VERSION_CONFLICT or GATE_CONSTRAINT_FAILED.
  - final_decision merge without merge_target_need_candidate_ref returns INVALID_PAYLOAD.
  - final_decision request_searchplan_recheck without actionable reason/gap context blocks with GATE_CONSTRAINT_FAILED.
  - agent/model output malformed after allowed low-level technical retry blocks with MALFORMED_ADJUDICATION_OUTPUT.
  - recommendation packet that contains route_outcome, next_node_id, repair_target, DB status fields, authority ids to create, or direct workflow commands blocks with MALFORMED_ADJUDICATION_OUTPUT.
  - new attempt after existing adjudication result blocks duplicate authority creation and returns existing refs when available.
  - adjudication result attempts to create ValidatedNeed, V1bInputBundle, TopicQuestionContract, SearchPlan mutation, or direct memory materialization blocks before authority write.
deterministic_validators:
  - validate-need-adjudication is not debate-eligible.
  - allowed model-like execution is single-agent only through AgentOrchestrator.
  - Codex may produce a local recommendation only when execution_mode=codex_assisted and provenance marks source_kind=codex_assisted.
  - provider_llm may produce a recommendation only through a registry-owned profile; provider/model ids must not branch business behavior.
  - mocked_llm is test/acceptance-only and cannot satisfy product authority decisions.
  - output final_decision must be one of validate, return_to_candidate, request_searchplan_recheck, reject, park, or merge.
  - model-like recommendation packets must not include decision_status, review_status, lifecycle_status, freshness_status, loopback_target, result_validated_need_id, or open_recheck_request_refs.
  - WorkflowHarness derives route_outcome from final_decision and exposes route_outcome to automated orchestration.
  - automated orchestration must consume route_outcome rather than candidate persistence status fields.
  - candidate persistence statuses must be derived by TopicSelectionNeedValidationService from final_decision and validated side effects only.
  - recommendation-to-authority conversion is allowed only inside the WorkflowHarness runner gate before TopicSelectionNeedValidationService.adjudicateNeed is called.
  - human or hybrid adjudication packets may materialize any final_decision after deterministic validation.
  - fixture human decisions may materialize any final_decision only in test/acceptance scenarios with explicit provenance.
  - codex_assisted and provider_llm recommendations may materialize without extra human acceptance only for validate, request_searchplan_recheck, and return_to_candidate.
  - codex_assisted and provider_llm recommendations for reject, merge, or park require human or hybrid acceptance before authority persistence.
  - mocked_llm remains test/acceptance-only and must not establish product decision authority.
  - WorkflowHarness defaults to fresh readiness assessment and fresh validation support packet creation.
  - existing readiness/support packet consumption requires explicit refs and deterministic lineage/freshness validation.
  - readiness recommendation other than ready_for_validation blocks before support packet or adjudication authority creation.
  - readiness recommendation reject must not be treated as final_decision reject without human/hybrid acceptance.
  - readiness recommendations merge_required and park must not be treated as final_decision merge or park without human/hybrid acceptance.
  - all shared readiness recommendation enum values must have explicit runner behavior.
  - recommendation and adjudication must consume the frozen ValidationDecisionSupportPacket and must not re-read live upstream evidence/search/resource state as business truth.
  - support packet lineage must be validated by both WorkflowHarness and TopicSelectionNeedValidationService.adjudicateNeed before adjudication authority writes.
  - model-like recommendation input must be compiled from frozen support packet/readiness/candidate/sibling summaries only.
  - TopicSelectionNeedAdjudicationRecommendationPacket@v1 is artifact/provenance only and is not a downstream automation handoff.
  - TopicSelectionValidateNeedAdjudicationNodeResult@v1 is the only N7 downstream automation handoff.
  - downstream automation must consume runner-derived status, route_outcome, refs, blockers, warnings, risk refs, next_node_id, and repair_target from the node result.
  - recommendation packet must not contain route_outcome, next_node_id, repair_target, DB status fields, authority ids to create, or direct workflow commands.
  - node_attempt_id reuse must be treated as exact replay and must not create authority.
  - exact replay requires matching input hash plus existing node result and trace.
  - exact replay requires proven storage lookup by workflow_run_id and node_attempt_id before the runner can become callable.
  - replay storage gaps must pause implementation for DB SSOT handling and must not fall back to a fresh run or local artifact workaround.
  - fresh attempts before adjudication are append-only and may create fresh readiness/support packets.
  - fresh attempts after adjudication exists must not create a second ValidateNeedAdjudicationResult.
  - duplicate adjudication blocks must expose existing adjudication refs when resolvable and existing handoff refs when available.
  - model retry is limited to same-profile technical retry and must not cross provider/Codex/mock boundaries.
  - blocked attempts after readiness/support creation must retain those refs as audit facts and must not silently reuse them in later attempts.
  - Node result status must be one of ready, blocked, or require_human_review.
  - ready status must not use route_outcome blocked or require_human_review.
  - blocked status must carry non-empty blocker_codes.
  - require_human_review status must carry non-empty review_reason_codes.
  - warnings, duplicate handling, and replay handling must not introduce extra status values.
  - implementation readiness is callable through runValidateNeedAdjudicationScenario after D12 matrix tests landed.
  - final_decision validate produces only a ValidateNeedAdjudicationResult authority record; ValidatedNeed authority is created only by human-confirm-need.
  - final_decision return_to_candidate maps loopback_target to need_candidate.
  - final_decision request_searchplan_recheck maps loopback_target to search_plan and may output a typed recheck request ref only after deterministic validation.
  - final_decision reject requires rejected_reason or equivalent rationale.
  - final_decision merge requires merge_target_need_candidate_ref and must not auto-merge authority records.
  - final_decision park must preserve candidate as hypothesis and record required_actions or rationale.
  - accepted_risk_refs and residual_risk_refs must be explicit refs; risk prose alone is not sufficient.
  - support packet required_human_checks remain handoff requirements, not proof of human confirmation.
  - any Codex/provider wording for a future human confirmation must be recorded as recommendation or draft provenance only, not as a human decision.
  - semantic recommendation content is provenance; support packet and repository-resolved refs remain the adjudication semantic SSOT.
  - natural-language rationale may explain mapped decisions but must not create new evidence, risk, merge, or recheck refs.
  - sibling candidate context is used only for duplicate/merge/park reasoning and must not overwrite selected candidate content.
  - adjudication result may output required_actions, loopback_target, rejected_reason, merge target, recheck suggestion/ref, memory suggestion ref, risk refs, gap_codes, and rationale.
  - adjudication result must not create ValidatedNeed, V1bInputBundle, TopicQuestionContract, or PaperProjectBridge.
  - direct SearchPlan mutation is forbidden; searchplan recheck is represented as a typed recheck request.
  - direct memory materialization is forbidden; memory learning is represented as a suggestion/ref for a later materialization path.
  - domain authority write must be all-or-nothing for the adjudication result and its typed side-effect refs; pre-write control-plane audit records may remain as failed-attempt evidence.
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: not_allowed
profile_escalation_policy_ref:
  policy: DMP-05 provider fallback and profile escalation policy
  registry_service: TopicSelectionModelProfileRegistryService
  invocation_boundary: TopicSelectionAgentOrchestratorService
  semantics:
    - no debate escalation.
    - no automatic provider fallback.
    - malformed semantic output does not retry as a different adjudication decision.
    - human-confirm-need is the only final validation authority path.
input_contract_refs:
  - TopicSelectionNeedCandidateRecord
  - TopicSelectionValidationDecisionSupportPacketRecord
  - TopicSelectionNeedCandidateReadinessAssessmentRecord
  - TopicSelectionNeedValidationEvidenceBundle
  - TopicSelectionEvidenceStrengthAssessmentRecord
  - sibling TopicSelectionNeedCandidateRecord list projection
  - TopicSelectionNeedAdjudicationRecommendationPacket@v1 when model-like recommendation is used
  - accepted risk refs
  - open search-plan recheck refs
output_contract_refs:
  - TopicSelectionValidateNeedAdjudicationNodeResult@v1
  - TopicSelectionNeedAdjudicationRecommendationPacket@v1 when model-like recommendation is used
  - TopicSelectionValidateNeedAdjudicationResultRecord
  - optional SearchPlanRecheckRequest ref
  - optional CandidateDecisionMemorySuggestion ref
  - required_actions
  - accepted_risk_refs
  - residual_risk_refs
  - gap_codes
authority_write_boundary:
  target_boundary:
    route: POST /topic-selection/v1a/need-candidates/:needCandidateId/adjudications
    controller: TopicSelectionV1aController.adjudicateNeed
    domain_service: TopicSelectionNeedValidationService.adjudicateNeed
    repository: TopicSelectionNeedValidationRepository adjudication-result persistence
    authority_objects:
      - TopicSelectionValidateNeedAdjudicationResultRecord
    forbidden_authority_objects:
      - HumanConfirmedDecision
      - TopicSelectionValidatedNeedRecord
      - TopicSelectionV1aToV1bInputBundleRecord
      - TopicQuestionContract
  implemented_backend_route:
    route: POST /topic-selection/v1a/need-candidates/:needCandidateId/adjudications
    method: TopicSelectionNeedValidationService.adjudicateNeed
    status: split_authority_route
    writes_when_validate:
      - TopicSelectionValidateNeedAdjudicationResultRecord
    does_not_write:
      - HumanConfirmedDecision
      - TopicSelectionValidatedNeedRecord
      - TopicSelectionV1aToV1bInputBundleRecord
    constraint: Human confirmation and v1b publication are separate routes and cannot be inferred from adjudication payload fields.
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - selected candidate ref and candidate version.
    - support packet ref and packet status.
    - readiness assessment ref when present.
    - evidence map/search/literature lineage refs.
    - sibling candidate context hash when used.
    - execution_mode, profile_id, model_option_id, and provenance for model-like recommendation.
    - final_decision, loopback_target, required_actions, risk refs, gap codes, and rationale.
    - any output recheck request or memory suggestion refs as typed side-effect refs.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
    - human confirmation as an inferred model output.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_candidate_or_packet: return NOT_FOUND.
  stale_or_mismatched_refs: return VERSION_CONFLICT or GATE_CONSTRAINT_FAILED before authority creation.
  replay_input_hash_drift: return VERSION_CONFLICT with no authority writes.
  replay_trace_missing: return GATE_CONSTRAINT_FAILED with no authority writes.
  non_ready_readiness: return blocked with readiness recommendation, blocker codes, and repair hints; write no support packet or adjudication authority.
  implicit_latest_packet_lookup: return GATE_CONSTRAINT_FAILED.
  agent_failure: return blocked with no adjudication authority write.
  malformed_recommendation: return blocked or require_human_review; do not invent a final decision.
  recommendation_attempts_to_drive_workflow: return blocked with MALFORMED_ADJUDICATION_OUTPUT and no adjudication authority write.
  high_risk_model_recommendation_without_human_acceptance: return require_human_review with no adjudication authority write.
  duplicate_or_pending_adjudication: return blocked duplicate result with existing adjudication ref when available; no second adjudication authority write.
  warning_present: keep original status and attach warning_codes.
  human_review_required: return require_human_review with review_reason_codes and no direct workflow command.
  validate_pending_human_confirmation: return ready with route_outcome advance_to_human_confirmation; Node 8 handles human confirmation.
  merge_without_target: return INVALID_PAYLOAD.
  unresolved_recheck_or_risk: return request_searchplan_recheck or require_human_review, not validate.
  composite_route_risk: retired; adjudication no longer writes HumanConfirmedDecision, ValidatedNeed, or V1bInputBundle.
```

### `topic-selection.v1a.human-confirm-need.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.human-confirm-need.v1
authority_object: ValidatedNeed materialization
preconditions:
  - ValidateNeedAdjudicationResult exists for the selected NeedCandidate.
  - adjudication final_decision is validate.
  - adjudication output_validated_need_id exists as a reserved target id.
  - reserved output_validated_need_id is not treated as ValidatedNeed authority until TopicSelectionValidatedNeedRecord exists.
  - adjudication output_validated_need_id is not already materialized as an existing ValidatedNeed.
  - ValidationDecisionSupportPacket exists and belongs to the selected NeedCandidate.
  - NeedCandidate has not already produced a ValidatedNeed.
  - HumanConfirmationInput@v1 exists.
  - HumanConfirmationInput@v1 actor_mode is human, hybrid, or human_delegated.
  - HumanConfirmationInput@v1 accountable_human_ref exists.
  - hybrid means a human remains accountable while Codex or another assistant may draft auditable rationale/checklist text after human review.
  - human_delegated means the accountable human authorizes Codex or a provider LLM to execute confirmation under fixed policy n8-validate-only-delegation-v1.
  - human_delegated input includes delegated_executor with executor_type, provenance_ref, and policy_id=n8-validate-only-delegation-v1.
  - rationale is present.
  - required_check_results are explicit.
  - Codex-assisted rationale or checklist text, when used, has provenance and has been reviewed/accepted by the human or hybrid actor before submission.
  - Delegated Codex/provider confirmation, when used, has executor provenance and satisfies fixed policy n8-validate-only-delegation-v1 before submission.
  - required_human_checks from the support packet are represented by required_check_results.
  - accepted risk refs required by adjudication/support packet are explicit.
  - HumanConfirmationSemanticReview@v1 exists before materialization.
  - HumanConfirmationSemanticReview@v1 status is pass or warning before materialization.
confirmation_input_contract:
  contract_id: HumanConfirmationInput@v1
  contract_scope: node_level_value_contract
  persistence: stored with HumanConfirmedDecision input snapshot and trace/audit artifacts; not a standalone DB authority.
  fields:
    actor_mode: human | hybrid | human_delegated
    accountable_human_ref: TopicSelectionFunctionalRef
    rationale: string
    accepted_risk_refs: TopicSelectionFunctionalRef[]
    required_check_results:
      - check_id: string
        result: accepted | not_applicable
    delegated_executor:
      required_when: actor_mode=human_delegated
      fields:
        executor_type: codex | provider_llm
        provenance_ref: TopicSelectionFunctionalRef
        policy_id: n8-validate-only-delegation-v1
  fixed_delegation_policy:
    policy_id: n8-validate-only-delegation-v1
    allows:
      - confirm an N7 adjudication whose final_decision is validate.
      - materialize only the adjudication output_validated_need_id.
      - use delegated executor output only after N8 deterministic validation.
    forbids:
      - caller-defined delegation scopes.
      - separate delegation authority.
      - accepting newly introduced risk.
      - overriding required human checks.
      - resolving reject, merge, or park decisions.
      - mutating evidence, search, candidate, support-packet, or adjudication content.
semantic_review_contract:
  contract_id: HumanConfirmationSemanticReview@v1
  contract_scope: node_level_audit_artifact
  persistence: stored in trace/audit artifacts with the confirmation attempt; not a DB authority.
  purpose: parse N7 semantic content and confirmation rationale for alignment without re-adjudicating the NeedCandidate.
  input_sources:
    - N7 adjudication final_decision and rationale.
    - validation support packet required_human_checks and residual risk refs.
    - NeedCandidate snapshot summary and authority refs.
    - HumanConfirmationInput@v1 rationale, required_check_results, accepted_risk_refs, and delegated_executor provenance when present.
  fields:
    status: pass | warning | blocked
    alignment_codes: string[]
    risk_coverage: complete | missing_required_acceptance
    required_check_coverage: complete | incomplete
    scope_violations: string[]
    rationale_summary: string
    provenance_ref: TopicSelectionFunctionalRef
  may_parse:
    - whether N7 rationale expresses validate rather than hidden reject, merge, or park semantics.
    - whether confirmation rationale aligns with the selected NeedCandidate, support packet, and validate adjudication.
    - whether accepted_risk_refs cover existing required residual risks.
    - whether required_check_results correspond to support-packet required_human_checks.
    - whether delegated executor output stays inside fixed policy n8-validate-only-delegation-v1.
  must_not:
    - re-evaluate NeedCandidate value.
    - re-read EvidenceMap to infer new evidence roles or evidence strength.
    - change N7 final_decision.
    - generate new accepted risk refs.
    - mutate evidence, search, candidate, support-packet, or adjudication content.
    - run debate.
semantic_review_invocation_policy:
  profile_id: topic-selection.confirmation-semantic-review.single-agent.v1
  default_mode: codex_assisted
  allowed_modes:
    - deterministic_parser
    - codex_assisted
    - provider_llm
    - mocked_llm
  mode_rules:
    deterministic_parser: allowed only for trivial fully structured checks; if rationale alignment is non-trivial, use codex_assisted or provider_llm.
    codex_assisted: default local/personal mode and cost-control path.
    provider_llm: explicit quality upgrade only; never required by default.
    mocked_llm: test/acceptance-only and never mixed with real decision persistence.
  context_packet:
    contract_id: HumanConfirmationSemanticReviewContextPacket@v1
    persistence: trace/audit artifact only; not DB authority.
    must_freeze:
      - adjudication ref, final_decision, rationale, output_validated_need_id, and version.
      - support packet ref, required_human_checks, residual risk refs, and version.
      - NeedCandidate ref, stable summary, and version.
      - HumanConfirmationInput@v1 snapshot.
      - delegated executor provenance snapshot when actor_mode=human_delegated.
      - policy ids, schema versions, and expected output schema.
    must_not_include:
      - hidden reasoning.
      - raw provider logs.
      - mutable live DB readers.
      - raw fulltext dumps.
      - debate transcripts.
  output_schema: HumanConfirmationSemanticReview@v1 structured JSON only.
  retry_policy:
    transient_or_malformed_output: retry same profile and same mode at most once.
    forbidden_fallbacks:
      - provider-to-provider fallback.
      - provider-to-codex fallback.
      - codex-to-provider fallback.
      - fallback to mocked_llm.
      - fallback to keyword/default acceptance.
  cache_policy:
    exact_match_reuse_allowed: true
    required_match_fields:
      - context_packet_hash
      - profile_id
      - execution_mode
      - run_mode
      - executor_kind
      - model_option_id when provider-backed or explicitly provided
      - policy_version
      - output_schema_version
    provider_quality_runs_must_not_use_cached_non_provider_response: true
  failure_policy:
    context_packet_build_failure: blocked.
    semantic_review_model_failure: require_human_review or blocked; never materialize by bypassing review.
    semantic_review_malformed_after_retry: require_human_review.
    semantic_review_blocked_output: blocked.
    semantic_review_ambiguous_alignment: require_human_review.
node_result_contract:
  contract_ref: TopicSelectionHumanConfirmNeedNodeResult@v1
  automation_handoff: true
  consumed_by_downstream_automation: true
  status_values:
    - ready
    - blocked
    - require_human_review
  ready_route_outcome: advance_to_publish_v1b_input_bundle
  ready_next_node_id: topic-selection.v1a.publish-v1b-input-bundle.v1
  must_include:
    - node_id.
    - status.
    - route_outcome.
    - adjudication_result_ref.
    - need_candidate_ref.
    - validation_support_packet_ref.
    - human_decision_ref when created.
    - validated_need_ref when materialized.
    - semantic_review_context_packet_ref.
    - semantic_review_ref.
    - confirmation_input_ref_or_hash.
    - accepted_risk_refs.
    - residual_risk_refs.
    - required_check_results_snapshot.
    - blocker_codes.
    - warning_codes.
    - review_reason_codes.
    - next_node_id when ready.
    - harness_trace_artifact_ref.
  route_outcome_actions:
    advance_to_publish_v1b_input_bundle: call topic-selection.v1a.publish-v1b-input-bundle.v1.
    blocked: stop automation and expose blockers, failed layer, and repair hints.
    require_human_review: stop automation and expose review reason codes plus confirmation/semantic-review refs when available.
  ready_requirements:
    - HumanConfirmedDecision has been written.
    - TopicSelectionValidatedNeedRecord has been materialized with adjudication output_validated_need_id.
    - HumanConfirmationSemanticReview@v1 status is pass or warning.
    - route_outcome is advance_to_publish_v1b_input_bundle.
    - next_node_id is topic-selection.v1a.publish-v1b-input-bundle.v1.
  blocked_requirements:
    - route_outcome is blocked.
    - blocker_codes are non-empty.
    - no v1b bundle authority is created.
    - validated_need_ref is absent.
  require_human_review_requirements:
    - route_outcome is require_human_review.
    - review_reason_codes are non-empty.
    - no ValidatedNeed materialization occurs for the current attempt.
    - no v1b bundle authority is created.
  forbidden:
    - ready_with_warning status.
    - duplicate status.
    - replayed status.
    - route-specific statuses.
    - direct v1b bundle creation.
    - route_outcome values other than advance_to_publish_v1b_input_bundle, blocked, or require_human_review.
retry_idempotency_policy:
  exact_replay:
    condition: same node_attempt_id and same input_hash.
    result: return existing TopicSelectionHumanConfirmNeedNodeResult@v1.
    writes: no authority writes and no new semantic review invocation.
  materialized_reserved_id:
    condition: adjudication output_validated_need_id already exists as TopicSelectionValidatedNeedRecord.
    result: blocked with blocker_code DUPLICATE_VALIDATED_NEED.
    rule: do not compare confirmation input hashes, semantic review hashes, or adjudication hashes to produce idempotent ready.
    writes: no HumanConfirmedDecision, no ValidatedNeed, and no v1b bundle writes.
  failed_attempts:
    blocked: append-only trace/audit evidence only.
    require_human_review: append-only trace/audit evidence only.
    retry_rule: later retry must use a new node_attempt_id.
    forbidden: do not auto-promote failed attempts to latest reusable state.
  partial_confirmation_write:
    condition: HumanConfirmedDecision exists for the attempt but TopicSelectionValidatedNeedRecord was not materialized.
    result: blocked with blocker_code PARTIAL_CONFIRMATION_WRITE.
    repair_rule: explicit human/operator repair only; no automatic backfill and no direct materialization retry under the same attempt.
implementation_readiness_review:
  decision:
    policy_status: implementation_ready
    automation_callability: callable
    implementation_may_start: completed
  current_repo_support:
    - human confirmation REST route and domain-service path exist.
    - TopicSelectionNeedValidationService.confirmValidatedNeed owns HumanConfirmedDecision and ValidatedNeed authority writes.
    - N7 runner already emits reserved_validated_need_ref for validate handoff.
    - WorkflowHarness trace artifact pattern and exact replay lookup pattern exist for earlier v1a nodes.
    - AgentOrchestrator and model profile registry exist for single-agent semantic review.
  required_implementation_gaps:
    - none open for WorkflowHarness callability.
  implementation_result:
    - shared contract/schema added for HumanConfirmationInput@v1, HumanConfirmationSemanticReviewContextPacket@v1, HumanConfirmationSemanticReview@v1, and TopicSelectionHumanConfirmNeedNodeResult@v1.
    - model profile topic-selection.confirmation-semantic-review.single-agent.v1 added.
    - REST/service confirmation input accepts legacy human_actor/human_rationale and normalized HumanConfirmationInput@v1.
    - human_delegated requires delegated_executor provenance and fixed policy n8-validate-only-delegation-v1.
    - duplicate reserved-id and partial HumanConfirmedDecision write guards landed without DB migration.
    - runHumanConfirmNeedScenario landed with semantic-review context/review artifacts, exact replay, ready/blocked/review result shape, and Node 9 handoff.
    - existing HumanConfirmedDecision artifact refs, input snapshots, and trace artifacts are sufficient for N8 input/review refs; no DB SSOT migration was required.
  minimum_test_matrix:
    contracts:
      - HumanConfirmationInput@v1 accepts human, hybrid, and human_delegated.
      - human_delegated requires delegated_executor and fixed policy id.
      - HumanConfirmationSemanticReview@v1 accepts only pass, warning, or blocked.
      - TopicSelectionHumanConfirmNeedNodeResult@v1 accepts only ready, blocked, or require_human_review.
    harness_happy_path:
      - N7 validate adjudication plus human confirmation materializes reserved ValidatedNeed.
      - ready result uses route_outcome advance_to_publish_v1b_input_bundle and next_node_id topic-selection.v1a.publish-v1b-input-bundle.v1.
      - no TopicSelectionV1aToV1bInputBundleRecord is created by N8.
    delegated_path:
      - human_delegated with codex provenance and fixed policy passes.
      - wrong policy id, missing provenance, or newly introduced risk blocks.
    semantic_review_negative:
      - hidden reject, merge, or park alignment blocks or requires human review.
      - missing required check coverage blocks.
      - missing accepted risk coverage blocks.
      - ambiguous rationale returns require_human_review.
      - malformed semantic review after retry returns require_human_review.
    retry_and_duplicate:
      - same node_attempt_id and input_hash returns exact replay with no writes.
      - materialized reserved id returns blocked with DUPLICATE_VALIDATED_NEED.
      - partial confirmation write returns blocked with PARTIAL_CONFIRMATION_WRITE.
    boundary:
      - no EvidenceMap reread for new evidence roles.
      - no N7 adjudication mutation.
      - no v1b bundle creation.
      - no debate execution.
id_policy:
  reserved_by: topic-selection.v1a.validate-need-adjudication.v1
  source_field: TopicSelectionValidateNeedAdjudicationResultRecord.output_validated_need_id
  materialized_by: topic-selection.v1a.human-confirm-need.v1
  materialized_field: TopicSelectionValidatedNeedRecord.validated_need_id
  n8_mints_id: false
  rule: N8 persists the ValidatedNeed record using the reserved id; N8 does not allocate, replace, or reinterpret the id.
blocking_conditions:
  - malformed payload returns INVALID_PAYLOAD before authority creation.
  - adjudication result not found returns NOT_FOUND.
  - support packet not found returns NOT_FOUND.
  - NeedCandidate not found returns NOT_FOUND.
  - adjudication final_decision other than validate blocks with GATE_CONSTRAINT_FAILED.
  - missing adjudication output_validated_need_id blocks with GATE_CONSTRAINT_FAILED.
  - adjudication output_validated_need_id already materialized blocks with DUPLICATE_VALIDATED_NEED.
  - NeedCandidate already has result_validated_need_id blocks with GATE_CONSTRAINT_FAILED.
  - partial confirmation write detected blocks with PARTIAL_CONFIRMATION_WRITE.
  - HumanConfirmationInput@v1 actor_mode other than human, hybrid, or human_delegated returns INVALID_PAYLOAD.
  - missing accountable_human_ref, rationale, accepted_risk_refs, or required_check_results returns INVALID_PAYLOAD.
  - human_delegated without delegated_executor.executor_type, delegated_executor.provenance_ref, or delegated_executor.policy_id=n8-validate-only-delegation-v1 returns INVALID_PAYLOAD.
  - human_delegated fixed-policy violation blocks with GATE_CONSTRAINT_FAILED.
  - human_delegated attempt with new unaccepted residual risk, unsatisfied required human checks, or unresolved conflict refs blocks with GATE_CONSTRAINT_FAILED.
  - HumanConfirmationSemanticReview@v1 status blocked blocks materialization.
  - semantic review scope violation blocks with GATE_CONSTRAINT_FAILED.
  - semantic review missing required risk/check coverage blocks with GATE_CONSTRAINT_FAILED.
  - semantic review ambiguous rationale alignment returns require_human_review.
  - adjudication/support packet/candidate refs mismatch blocks with VERSION_CONFLICT.
  - residual risk requires acceptance but accepted_risk_refs are missing blocks with GATE_CONSTRAINT_FAILED.
  - transition to ValidatedNeed fails blocks before repository persistence.
deterministic_validators:
  - human-confirm-need is human_review and MUST NOT let AgentOrchestrator, BackendLlmGateway, Codex, or debate runtime write authority directly.
  - N8 MAY call a bounded semantic parser/reviewer to produce HumanConfirmationSemanticReview@v1.
  - Semantic review MUST consume a frozen HumanConfirmationSemanticReviewContextPacket@v1 and MUST NOT read mutable DB state after packet construction.
  - semantic review may use deterministic parsing, codex_assisted, or provider_llm execution; mocked_llm is test/acceptance-only.
  - provider_llm semantic review is an explicit quality upgrade, not required for local default execution.
  - codex_assisted semantic review is the default local/personal mode.
  - semantic review may retry once only under the same profile and same mode for transient or malformed structured-output failures.
  - semantic review MUST NOT automatically fall back across provider, Codex, mocked, keyword, or deterministic acceptance modes.
  - semantic review output is audit/provenance only; deterministic validators decide whether materialization is allowed.
  - semantic review MUST NOT create or modify HumanConfirmationInput@v1, final_decision, accepted risk refs, required check results, or ValidatedNeed fields.
  - downstream automation MUST consume TopicSelectionHumanConfirmNeedNodeResult@v1, not HumanConfirmationInput@v1, HumanConfirmationSemanticReview@v1, or HumanConfirmedDecision directly.
  - ready results MUST route only to topic-selection.v1a.publish-v1b-input-bundle.v1 through route_outcome=advance_to_publish_v1b_input_bundle.
  - blocked and require_human_review results MUST NOT carry a next_node_id or direct workflow command.
  - N8 MUST NOT create TopicSelectionV1aToV1bInputBundleRecord; Node 9 is the only v1b input bundle publisher.
  - exact replay returns the existing node result for the same node_attempt_id and input_hash without any authority writes.
  - if the reserved ValidatedNeed id is already materialized, N8 MUST return blocked with DUPLICATE_VALIDATED_NEED instead of attempting idempotent ready.
  - blocked and require_human_review attempts are append-only audit evidence; retries require a new node_attempt_id.
  - partial HumanConfirmedDecision without ValidatedNeed materialization blocks with PARTIAL_CONFIRMATION_WRITE and requires explicit repair.
  - Codex-assisted confirmation drafting may occur before this node or inside a future harness wrapper, but the persisted confirmation actor must remain human, hybrid, or human_delegated.
  - human_delegated execution may use Codex or a provider LLM only as an authorized executor under fixed policy n8-validate-only-delegation-v1; the authority source is HumanConfirmationInput@v1 plus deterministic N8 validation, not the model output by itself.
  - ValidatedNeed may be materialized only from a validate adjudication plus an explicit human decision record.
  - N8 must use the adjudication output_validated_need_id as the ValidatedNeed id and must not generate, allocate, or accept an alternate id.
  - output_validated_need_id is a reserved automation anchor, not authority; existence checks must query TopicSelectionValidatedNeedRecord.
  - human confirmation cannot be inferred from provider, Codex, mock, or cached model output without an explicit human or human_delegated confirmation payload.
  - Codex/provider/cached text may be used only as reviewed rationale/checklist content or delegated executor output with provenance; it cannot replace actor_mode/accountable_human_ref and cannot create HumanConfirmedDecision without explicit human, hybrid, or human_delegated submission.
  - human_delegated confirmation must be limited to validate confirmation; it cannot accept newly introduced risk, override required human checks, resolve merge/reject/park choices, or mutate upstream evidence/search/candidate content.
  - ValidatedNeed fields must derive from NeedCandidate, support packet, adjudication, and human decision refs.
  - ValidatedNeed must preserve evidence_map_ref, search_run_ref, search_plan_ref, literature_snapshot_ref, support_packet_ref, adjudication_result_ref, human_decision_ref, evidence_role_bundle, strength_assessment_refs, conflict_refs, residual_risk_refs, accepted_risk_refs, and trace_refs.
  - ValidatedNeed must not mutate NeedCandidate content, SearchPlan, EvidenceMap, ResourceSampleSet, or V1b bundle state.
  - support packet required_human_checks must remain auditable in the confirmation payload or trace.
  - accepted risk refs must be carried forward without converting risk prose into authority refs.
  - domain authority write must be all-or-nothing for the ValidatedNeed and candidate status patch; pre-write control-plane audit and human decision records may remain as failed-attempt evidence if the final domain write fails.
allowed_execution_modes:
  authority_gate: [human_review]
  semantic_review: [deterministic_parser, codex_assisted, provider_llm, mocked_llm]
default_execution_mode:
  authority_gate: human_review
  semantic_review: codex_assisted
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: topic-selection.confirmation-semantic-review.single-agent.v1
input_contract_refs:
  - TopicSelectionValidateNeedAdjudicationResultRecord
  - TopicSelectionNeedCandidateRecord
  - TopicSelectionValidationDecisionSupportPacketRecord
  - HumanConfirmationInput@v1
output_contract_refs:
  - TopicSelectionValidatedNeedRecord
  - HumanConfirmedDecision
  - TopicSelectionHumanConfirmNeedNodeResult@v1 trace/audit artifact
  - HumanConfirmationSemanticReviewContextPacket@v1 trace/audit artifact
  - HumanConfirmationSemanticReview@v1 trace/audit artifact
authority_write_boundary:
  target_boundary:
    route: POST /topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations
    controller: TopicSelectionV1aController.confirmValidatedNeed
    domain_service: TopicSelectionNeedValidationService.confirmValidatedNeed
    repository: TopicSelectionNeedValidationRepository validated-need persistence
    authority_objects:
      - HumanConfirmedDecision
      - TopicSelectionValidatedNeedRecord
    forbidden_authority_objects:
      - TopicSelectionV1aToV1bInputBundleRecord
      - TopicQuestionContract
  implemented_backend_route:
    route: POST /topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations
    method: TopicSelectionNeedValidationService.confirmValidatedNeed
    status: split_authority_route
    constraint: Actors outside human, hybrid, or human_delegated are rejected before persistence; duplicate ValidatedNeed materialization returns GATE_CONSTRAINT_FAILED.
    current_gap: none for N8 WorkflowHarness callability; remaining downstream automation work belongs to Node 9 publish-v1b-input-bundle.
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - adjudication result ref.
    - support packet ref.
    - source NeedCandidate ref and candidate version.
    - human decision ref, HumanConfirmationInput@v1, actor mode, accountable human ref, rationale, and policy version.
    - TopicSelectionHumanConfirmNeedNodeResult@v1 status, route outcome, next node, blockers, warnings, and review reasons.
    - HumanConfirmationSemanticReviewContextPacket@v1 hash, profile id, execution mode, policy version, and output schema version.
    - HumanConfirmationSemanticReview@v1 status, alignment codes, risk coverage, required-check coverage, scope violations, summary, and provenance.
    - Codex-assisted confirmation draft/review refs when used, marked as reviewed input rather than confirming actor.
    - human_delegated delegated_executor executor type, fixed policy id, profile/model refs, normalized parameters, response provenance, and fixed-policy validation result when used.
    - accepted/residual risk refs.
    - trace refs inherited from candidate/support/adjudication.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
    - unauthenticated model output as human confirmation.
    - unauthenticated Codex output as confirming actor.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_required_ref: return NOT_FOUND.
  ref_mismatch: return VERSION_CONFLICT before authority creation.
  not_validate_decision: return GATE_CONSTRAINT_FAILED.
  missing_reserved_validated_need_id: return GATE_CONSTRAINT_FAILED.
  duplicate_validated_need: return GATE_CONSTRAINT_FAILED and do not create a second ValidatedNeed.
  missing_human_confirmation: return require_human_review.
  invalid_delegated_executor_payload: return INVALID_PAYLOAD before authority creation.
  delegated_policy_violation: return GATE_CONSTRAINT_FAILED before authority creation.
  semantic_review_scope_violation: return GATE_CONSTRAINT_FAILED before authority creation.
  semantic_review_missing_required_coverage: return GATE_CONSTRAINT_FAILED before authority creation.
  semantic_review_ambiguous_alignment: return require_human_review and do not materialize ValidatedNeed.
  semantic_review_model_failure: return require_human_review or blocked; never silently bypass semantic review for materialization.
  semantic_review_malformed_after_retry: return require_human_review and do not materialize ValidatedNeed.
  semantic_review_context_build_failure: return blocked and do not invoke model execution.
  duplicate_validated_need: return blocked with DUPLICATE_VALIDATED_NEED and do not write confirmation or v1b authority.
  partial_confirmation_write: return blocked with PARTIAL_CONFIRMATION_WRITE and require explicit repair.
  repository_failure: fail without partial ValidatedNeed semantics.
  partial_control_plane_audit_after_failure: allowed only as failed-attempt evidence; it must not be treated as a materialized ValidatedNeed.
```

### `topic-selection.v1a.publish-v1b-input-bundle.v1`
```yaml
policy_status: implementation_ready
node_id: topic-selection.v1a.publish-v1b-input-bundle.v1
authority_object: TopicSelectionV1aToV1bInputBundleRecord
chain_boundary:
  deterministic_node: true
  v1a_main_chain_terminal_forward_node: true
  v1a_domain_result_terminal_node: topic-selection.v1a.human-confirm-need.v1
  v1a_to_v1b_handoff_terminal_node: topic-selection.v1a.publish-v1b-input-bundle.v1
  boundary_statement: N8 materializes the domain result `ValidatedNeed`; N9 publishes the stable v1b input boundary and does not perform new domain judgment.
preconditions:
  - ValidatedNeed exists.
  - PublishV1bInputBundleNodeInput@v1 declares the expected v1a handoff refs; N9 must not infer missing refs from DB live reads.
  - source NeedCandidate exists.
  - ValidationDecisionSupportPacket exists.
  - ValidateNeedAdjudicationResult exists.
  - HumanConfirmedDecision ref exists on the ValidatedNeed.
  - ValidatedNeed evidence/search/literature refs are current enough for v1b intake or carry explicit risk/recheck refs.
  - no active v1b input bundle already exists for the same ValidatedNeed and bundle_version unless replay/idempotency is explicitly supported.
blocking_conditions:
  - malformed payload returns INVALID_PAYLOAD before authority creation.
  - missing expected_bundle_version in WorkflowHarness automation returns INVALID_PAYLOAD before authority creation.
  - ValidatedNeed not found returns NOT_FOUND.
  - source NeedCandidate not found returns NOT_FOUND.
  - support packet not found returns NOT_FOUND.
  - adjudication result not found returns NOT_FOUND.
  - ValidatedNeed/source candidate/support packet/adjudication refs mismatch blocks with VERSION_CONFLICT.
  - missing human_decision_ref blocks with GATE_CONSTRAINT_FAILED.
  - ValidatedNeed without evidence role bundle blocks with GATE_CONSTRAINT_FAILED.
  - unresolved high-priority recheck without accepted carry-forward risk blocks with GATE_CONSTRAINT_FAILED.
  - same node_attempt_id with changed input hash blocks with REPLAY_INPUT_HASH_MISMATCH.
  - duplicate bundle for the same ValidatedNeed and expected_bundle_version returns idempotent existing bundle; semantically duplicate bundle creation is forbidden.
  - semantic duplicate detection across different bundle versions is out of scope for v1; only exact version reuse is handled.
deterministic_validators:
  - publish-v1b-input-bundle is deterministic and MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, or debate runtime.
  - publish-v1b-input-bundle is the final forward node of the v1a main chain; any later work belongs to v1b or to v1a side-channel governance/repair flows.
  - N9 must not re-evaluate topic value, reinterpret N8 human confirmation, or perform semantic adjudication.
  - N9 node input must act as a handoff contract: it declares v1a refs explicitly and DB reads are used only to verify and materialize the bundle.
  - N9 must preserve traceability across business lineage and automation execution trace.
  - handoff payload must derive only from ValidatedNeed, source NeedCandidate, support packet, adjudication result, memory suggestion refs, and recheck request refs.
  - bundle must preserve validated_need_ref, source_need_candidate_ref, adjudication_result_ref, support_packet_ref, human_decision_ref, evidence_map_ref, search_run_ref, search_plan_ref, literature_snapshot_ref, evidence_role_bundle, trace_refs, risk_refs, gap_codes, memory_suggestion_refs, and recheck_request_refs.
  - risk_refs must be the union of residual_risk_refs and accepted_risk_refs from ValidatedNeed/adjudication, not free-text risk notes.
  - memory_suggestion_refs are carried as refs only; memory materialization is not part of this node.
  - recheck_request_refs are carried as refs only; SearchPlan mutation is not part of this node.
  - v1b input bundle must not include raw debate transcripts, hidden reasoning, raw ranked draft batches, raw rejected framings, or provider logs.
  - v1b input bundle must not create ResearchSlice, TopicQuestionContract, TopicPackageDraft, PromotionDecision, or PaperProjectBridge.
retry_idempotency_policy:
  exact_replay:
    condition: same node_attempt_id and same input_hash.
    result: return existing PublishV1bInputBundle node result.
    writes: no bundle writes.
  existing_bundle_reuse:
    condition: same validated_need_ref and same expected_bundle_version already has a TopicSelectionV1aToV1bInputBundleRecord.
    result: ready with idempotency_result reused_existing_bundle.
    writes: no new bundle writes.
  missing_expected_bundle_version:
    condition: WorkflowHarness input omits expected_bundle_version.
    result: blocked with INVALID_PAYLOAD.
    reason: automation must not rely on service default-version minting.
  replay_input_hash_mismatch:
    condition: same node_attempt_id but changed input_hash.
    result: blocked with REPLAY_INPUT_HASH_MISMATCH.
    writes: no bundle writes.
  explicit_new_version:
    condition: caller supplies a new expected_bundle_version for the same ValidatedNeed.
    result: allowed only if lineage and payload-hash validation pass.
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs:
  - PublishV1bInputBundleNodeInput@v1
  - TopicSelectionValidatedNeedRecord
  - TopicSelectionNeedCandidateRecord
  - TopicSelectionValidationDecisionSupportPacketRecord
  - TopicSelectionValidateNeedAdjudicationResultRecord
  - CandidateDecisionMemorySuggestion refs
  - SearchPlanRecheckRequest refs
output_contract_refs:
  - TopicSelectionPublishV1bInputBundleNodeResult@v1
  - TopicSelectionV1aToV1bInputBundleRecord
authority_write_boundary:
  route: POST /topic-selection/v1a/v1b-input-bundles
  controller: TopicSelectionV1aController.publishV1bInputBundle
  domain_service: TopicSelectionNeedValidationService.publishV1bInputBundle
  repository: TopicSelectionNeedValidationRepository.createV1aToV1bInputBundle
  authority_objects:
    - TopicSelectionV1aToV1bInputBundleRecord
  forbidden_authority_objects:
    - ResearchSlice
    - TopicQuestionContract
    - TopicPackageDraft
    - PromotionDecision
    - PaperProjectBridge
  implemented_backend_route:
    route: POST /topic-selection/v1a/v1b-input-bundles
    method: TopicSelectionNeedValidationService.publishV1bInputBundle
    status: compatibility_service_boundary
    idempotency: returns an existing bundle for the same ValidatedNeed and requested bundle_version; without bundle_version, returns the newest existing bundle before creating a new default-version bundle.
  implemented_workflow_harness_runner:
    method: runPublishV1bInputBundleScenario
    status: callable_normalized_automation_path
    idempotency: exact replay by node_attempt_id plus input_hash; existing bundle reuse by validated_need_ref plus expected_bundle_version.
  agent_orchestrator_direct_write: false
  debate_executor_direct_write: false
audit_artifact_policy:
  must_record:
    - PublishV1bInputBundleNodeInput@v1 snapshot.
    - input hash.
    - bundle payload hash.
    - idempotency result.
    - validated need ref.
    - source need candidate ref.
    - adjudication result ref.
    - support packet ref.
    - human decision ref.
    - evidence/search/literature lineage refs.
    - trace refs.
    - risk refs.
    - memory suggestion refs.
    - recheck request refs.
    - bundle version.
    - harness trace artifact ref.
  must_not_record:
    - hidden reasoning.
    - provider secrets.
    - raw provider logs.
    - raw debate transcripts.
    - raw ranked candidate drafts.
    - new semantic explanation.
failure_semantics:
  invalid_payload: return INVALID_PAYLOAD before authority creation.
  missing_required_ref: return NOT_FOUND.
  ref_mismatch: return VERSION_CONFLICT before authority creation.
  missing_human_decision: return GATE_CONSTRAINT_FAILED.
  unresolved_recheck_or_risk: block unless explicit accepted risk/recheck carry-forward refs exist.
  replay_input_hash_mismatch: return VERSION_CONFLICT with blocker_code REPLAY_INPUT_HASH_MISMATCH.
  duplicate_bundle: return ready with idempotency_result reused_existing_bundle only when expected_bundle_version matches.
  semantic_duplicate_across_versions: out_of_scope_v1; do not add a separate error code.
  repository_failure: fail without partial handoff semantics.
implementation_readiness_review:
  decision:
    policy_status: implementation_ready
    automation_callability: callable
    implementation_may_start: true
  complexity: controlled
  db_migration_required: false
  required_contracts:
    - PublishV1bInputBundleNodeInput@v1
    - TopicSelectionPublishV1bInputBundleNodeResult@v1
  service_harness_boundary:
    route_service_api: keep compatible validated_need_id plus bundle_version plus created_by shape.
    harness_contract: enforce explicit handoff refs, expected_bundle_version, input hash, replay, and trace.
    service_guard: add minimal lineage and human-decision guards from existing records without requiring full harness input on public route.
    no_dual_persistence_path: Harness must call TopicSelectionNeedValidationService.publishV1bInputBundle; it must not write bundles directly.
  implementation_notes:
    - Node result must expose v1b_input_bundle_ref, bundle_version, bundle_payload_hash, idempotency_result, carried refs, blockers, warnings, replay provenance, and harness_trace_artifact_ref.
    - Node result must not hard-code the first v1b node until v1b node policies are normalized.
    - No DB migration is required because existing bundle records and trace artifacts can carry the needed lineage.
```

### `topic-selection.v1b.build-intake-constraint-profile.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.build-intake-constraint-profile.v1
authority_object: TopicSelectionV1bIntakeConstraintProfile
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.plan-research-slice.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.plan-research-slice.v1
authority_object: ResearchSlice
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: TBD-node-policy-detail
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.form-topic-question-contract.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.form-topic-question-contract.v1
authority_object: TopicQuestionContract
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: TBD-node-policy-detail
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.assess-topic-value.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.assess-topic-value.v1
authority_object: TopicValueAssessment
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: TBD-node-policy-detail
profile_escalation_policy_ref: TBD-node-policy-detail
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.decide-value-disposition.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.decide-value-disposition.v1
authority_object: ValueDispositionDecision
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.create-topic-package-draft.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.create-topic-package-draft.v1
authority_object: TopicPackageDraft
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.assess-package-readiness.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.assess-package-readiness.v1
authority_object: TopicPackageReadinessAssessment
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1b.publish-v1c-input-bundle.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1b.publish-v1c-input-bundle.v1
authority_object: TopicSelectionV1bToV1cInputBundle
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1c.create-promotion-input-snapshot.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1c.create-promotion-input-snapshot.v1
authority_object: PromotionInputSnapshot
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1c.generate-promotion-support.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1c.generate-promotion-support.v1
authority_object: PromotionDecisionSupport
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
debate_trigger_policy: TBD-node-policy-detail
profile_escalation_policy_ref: TBD-node-policy-detail
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1c.run-promotion-gate.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1c.run-promotion-gate.v1
authority_object: PromotionGateCheck
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1c.human-promotion-decision.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1c.human-promotion-decision.v1
authority_object: PromotionDecision
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.v1c.create-paper-project-bridge.v1`
```yaml
policy_status: stub
node_id: topic-selection.v1c.create-paper-project-bridge.v1
authority_object: PaperProjectBridge
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.downstream.paper-project-intake.v1`
```yaml
policy_status: stub
node_id: topic-selection.downstream.paper-project-intake.v1
authority_object: PaperProjectIntake
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```

### `topic-selection.downstream.feedback-recheck.v1`
```yaml
policy_status: stub
node_id: topic-selection.downstream.feedback-recheck.v1
authority_object: DownstreamTopicFeedback
preconditions: TBD-node-policy-detail
blocking_conditions: TBD-node-policy-detail
deterministic_validators: TBD-node-policy-detail
allowed_execution_modes: [none]
default_execution_mode: none
debate_trigger_policy: not_allowed
profile_escalation_policy_ref: not_applicable
input_contract_refs: TBD-node-policy-detail
output_contract_refs: TBD-node-policy-detail
authority_write_boundary: TBD-node-policy-detail
audit_artifact_policy: TBD-node-policy-detail
failure_semantics: TBD-node-policy-detail
```
