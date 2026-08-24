# 11 Debate Model Invocation Policy

## Purpose
This document is the SSOT for model invocation rules used by future multi-agent debate loops in topic selection. It defines how execution mode, provider profiles, role/stage mapping, Codex substitution, and provenance must work before implementation begins.

Business decisions still belong to node policies, deterministic validators, and domain services. This policy only governs how model-like agent calls are selected, executed, audited, and normalized.

## Status
- Policy version: `v1`
- Current locked decision: `DMP-13`
- Pending decisions: none

## DMP-01 Execution Mode And Provider Boundary
- Status: locked
- Date: 2026-05-19

### Decision
`execution_mode` MUST express the source class of model-like output, not the concrete provider or model.

The allowed model-like execution modes remain:
- `mocked_llm`
- `codex_assisted`
- `provider_llm`

`provider_llm` means a real provider-backed execution class. It MAY resolve to OpenAI, DashScope, DeepSeek, or another registered provider through a versioned model profile. It MUST NOT be split into provider-specific execution modes such as `openai_llm`, `dashscope_llm`, or `deepseek_llm`.

### Boundary
Concrete provider, model, provider-specific parameters, fallback policy, timeout, retry, budget, and reasoning/thinking parameters MUST be resolved from a versioned `model_profile_id`, not from workflow branching logic.

Conceptual shape:

```yaml
execution_mode: provider_llm
model_profile_id: topic-selection.need-discovery.explorer.v1
selected_model_option_id: provider-a-balanced-explorer
normalized_params:
  creativity: medium
  reasoning_depth: medium
  output_budget: medium
provider_fallback_policy:
  automatic_fallback: false
```

The exact profile fields are defined by `DMP-02`, `DMP-05`, and `DMP-06`.

### Required Semantics
- `mocked_llm` MUST remain test/acceptance fixture execution and MUST NOT participate in real product decisions.
- `codex_assisted` MUST remain distinguishable from provider-backed execution in provenance, audit, and persisted summaries.
- `provider_llm` MUST route provider API calls through `AgentOrchestrator` and the existing LLM gateway boundary.
- Workflow, node policy, harness, route, or service code MUST NOT branch on concrete provider ids for business behavior.
- Provider-specific parameters MUST NOT leak into domain services, deterministic validators, or persistence code.
- All execution modes MUST normalize to the same node contracts and pass the same deterministic validators and authority-write boundaries.

### Rationale
Keeping `execution_mode` provider-agnostic prevents a provider enum from becoming a second workflow runtime. Versioned model profiles can support multiple providers and parameter families while preserving one orchestration path, one provenance shape, and one deterministic validation path.

## DMP-02 Model Profile Registry Shape
- Status: locked
- Date: 2026-05-20

### Decision
Model profiles MUST be function, role, and stage oriented. They MUST NOT be primarily provider-ranking tables.

The model profile registry is the SSOT for model-like invocation configuration: workflow function, role family, stage family, quality objectives, output contract, allowed execution modes, capabilities, provider/model options, request policy, normalized parameters, provider-specific overrides, audit policy, and budget policy.

Role/stage policy may reference a versioned `profile_id`, but it MUST NOT directly encode concrete provider ids, model ids, provider-specific parameters, fallback chains, or budget rules.

### Minimum Profile Fields
Each debate-capable model profile SHOULD use this shape:

```yaml
profile_id: topic-selection.need-discovery.explorer.v1
status: active
profile_function: need_discovery_exploration
role_family: explorer
stage_family: discovery_expansion
quality_objectives:
  - broaden_candidate_framing
  - surface_latent_value_points
  - preserve_source_grounding
allowed_execution_modes: [provider_llm, codex_assisted]
required_capabilities:
  - structured_output
  - json_object
output_contract: RankedCandidateExplorationNotes@v1

model_options:
  - option_id: openai-balanced-explorer
    option_purpose: default_balanced_provider_run
    provider_id: openai
    model_id: gpt-model-id
    use_when:
      - default_provider_run
    request_policy:
      timeout_ms: 180000
    normalized_params:
      creativity: medium
      reasoning_depth: medium
      output_budget: medium
      structured_output_required: true
      output_format: json_schema
    provider_overrides: {}

  - option_id: dashscope-thinking-budget-explorer
    option_purpose: budget_sensitive_thinking_provider_run
    provider_id: dashscope
    model_id: qwen-model-id
    use_when:
      - budget_sensitive_manual_selection
    request_policy:
      timeout_ms: 300000
    normalized_params:
      creativity: medium
      reasoning_depth: medium
      output_budget: medium
      structured_output_required: true
      output_format: json_schema
    provider_overrides:
      enable_thinking: true
    capability_degrade_policy:
      allow_optional_degrade: false

provider_fallback_policy:
  automatic_fallback: false
  manual_rerun_allowed: true
  explicit_profile_override_allowed: true

audit_policy:
  store_prompt_hash: true
  store_response_hash: true
  store_structured_output: true
  store_raw_provider_response: false
  forbid_hidden_reasoning: true

budget_policy:
  max_provider_attempts: 1
  max_estimated_cost_usd: null
```

### Model Options
Different providers MAY share the same `model_options` envelope. This gives the harness, orchestrator, registry validators, and audit code one shape to inspect.

Provider differences MUST be isolated as follows:
- `normalized_params` contains cross-provider abstract parameters.
- `provider_overrides` contains provider-specific knobs.
- Provider adapters or the LLM gateway map both layers to concrete provider API payloads.
- Domain services, node policies, workflow harnesses, and deterministic validators MUST NOT interpret provider-specific overrides.

Current v1 registered provider mapping:
- OpenAI: Responses API for default/quality/deep-reasoning provider runs.
- DashScope: OpenAI-compatible Chat Completions with `extra_body.enable_thinking`.
- DeepSeek: OpenAI-compatible Chat Completions with V4 thinking controls.

DeepSeek V4 thinking is allowed only as an explicit model option on debate worker profiles in v1:
- `topic-selection.need-discovery.explorer.v1.deepseek-v4-thinking`
- `topic-selection.need-discovery.deep-critic.v1.deepseek-v4-thinking`

It is intentionally not a default provider option and not available on arbiter final synthesis in v1. This keeps DeepSeek as an alternative exploration/deep-critique source without changing the authoritative arbiter boundary.

### Selection Semantics
`option_purpose` and `use_when` are the primary selection semantics for model options.

`priority` or `weight` MUST NOT carry business meaning. If introduced later, they MAY only act as a low-level tie-breaker among options with the same `option_purpose` and compatible `use_when` conditions.

### Boundary
- `DMP-02` defines the profile shape only.
- `DMP-03` defines role/stage to `profile_id` mapping.
- `DMP-04` defines Codex substitution by role/stage.
- `DMP-05` defines provider fallback and escalation behavior.
- `DMP-06` defines normalized parameter value sets and provider mappings.

### Rationale
Function-oriented profiles preserve why a model is being called before choosing who serves it. A unified option envelope keeps provider configuration auditable without forcing different providers into identical parameter semantics.

## DMP-03 Role/Stage To Profile Mapping
- Status: locked
- Date: 2026-05-20

### Decision
Debate execution MUST be decomposed into explicit role/stage invocation slots. Each slot MUST reference a versioned `profile_id`, output contract, and input context family. A role/stage mapping MUST NOT directly encode provider ids, model ids, provider-specific parameters, fallback chains, retry rules, or budget rules.

### Mapping Shape
Debate-capable nodes SHOULD use this mapping shape:

```yaml
node_id: topic-selection.v1a.generate-need-candidate.v1
debate_policy_id: topic-selection.need-discovery.debate.v1

role_stage_profiles:
  explorer:
    round_1_discovery:
      profile_id: topic-selection.need-discovery.explorer.v1
      input_context_family: exploration_context
      output_contract: NeedDiscoveryExplorerNotes@v1
      instance_policy:
        min_instances: 1
        max_instances: 3
        default_instances: 2
        allow_duplicate_model_options: true
        diversity_policy: prefer_prompt_or_context_angle_diversity
        merge_output_as: role_level_summary
    supplemental_repair:
      profile_id: topic-selection.need-discovery.explorer-repair.v1
      input_context_family: exploration_context
      output_contract: NeedDiscoverySupplementalNotes@v1
      instance_policy:
        min_instances: 1
        max_instances: 2
        default_instances: 1
        allow_duplicate_model_options: true
        diversity_policy: scoped_question_diversity
        merge_output_as: role_level_summary

  deep_critic:
    round_1_discovery:
      profile_id: topic-selection.need-discovery.deep-critic.v1
      input_context_family: exploration_context
      output_contract: NeedDiscoveryDeepCriticNotes@v1
      instance_policy:
        min_instances: 1
        max_instances: 3
        default_instances: 1
        allow_duplicate_model_options: true
        diversity_policy: prefer_critique_angle_diversity
        merge_output_as: role_level_summary
    supplemental_repair:
      profile_id: topic-selection.need-discovery.deep-critic-repair.v1
      input_context_family: exploration_context
      output_contract: NeedDiscoverySupplementalNotes@v1
      instance_policy:
        min_instances: 1
        max_instances: 2
        default_instances: 1
        allow_duplicate_model_options: true
        diversity_policy: scoped_question_diversity
        merge_output_as: role_level_summary

  arbiter:
    issue_framing:
      profile_id: topic-selection.need-discovery.arbiter-framing.v1
      input_context_family: arbiter_context
      output_contract: DebateIssueFrame@v1
      instance_policy:
        min_instances: 1
        max_instances: 1
        default_instances: 1
        allow_duplicate_model_options: false
        merge_output_as: arbiter_decision
    final_synthesis:
      profile_id: topic-selection.need-discovery.arbiter-final.v1
      input_context_family: arbiter_context
      output_contract: RankedCandidateDraftBatch@v1
      instance_policy:
        min_instances: 1
        max_instances: 1
        default_instances: 1
        allow_duplicate_model_options: false
        merge_output_as: external_structured_output
```

### Required Semantics
- `explorer` and `deep_critic` MAY have multiple instances in the same role/stage.
- Multiple same-role outputs MUST be merged into a role-level summary before arbiter consumption.
- `arbiter` MUST be single-instance for each debate loop and is the only external structured-output port.
- Worker role multiplicity is defined by `instance_policy`, not by a provider list.
- Multi-instance worker roles MAY resolve to one or more provider/model options, including duplicate options, through their bound profile.
- Reusing the same provider/model for multiple instances is allowed only when each instance has a distinct `agent_instance_id` and provenance.
- Each role instance MUST record `agent_instance_id`, role, stage, `profile_id`, selected model option id when applicable, provider/model identity when applicable, prompt packet hash, response hash, and execution provenance.
- `round_1_discovery` MAY explore broadly within the node scope.
- `supplemental_repair` MUST be limited to arbiter-specified questions and MUST NOT restart broad exploration.
- Only the arbiter `final_synthesis` output may enter D-20 ranked candidate draft batch schema validation for v1a need discovery.
- If a required role/stage slot has no profile mapping, the debate loop MUST stop as `blocked`; it MUST NOT invent a default provider or profile.

### Boundary
- `DMP-03` defines role/stage to `profile_id` mapping only.
- `DMP-04` defines Codex substitution by role/stage.
- `DMP-05` defines provider fallback and escalation.
- `DMP-08` defines retry and failure handling.
- Node policies still define debate triggers, blockers, authority boundaries, and deterministic validators.

### Rationale
Explicit role/stage slots keep debate orchestration inspectable and prevent hidden provider logic from becoming workflow semantics. The mapping also preserves the split between exploration context for worker roles and arbiter context for synthesis, ranking, and gate preparation.

## DMP-04 Codex Substitution Rules
- Status: locked
- Date: 2026-05-20

### Decision
Codex substitution is a role/stage slot-level execution override under `execution_mode=codex_assisted`. It MAY replace selected model-like invocations for local cost control, but it MUST NOT replace the model profile itself, change the role/stage mapping, or masquerade as `provider_llm`.

### Substitution Shape
Debate-capable nodes SHOULD declare Codex substitution policy separately from role/stage profile mapping:

```yaml
codex_substitution:
  default_enabled: true
  allowed_slots:
    - role: explorer
      stages: [round_1_discovery, supplemental_repair]
    - role: deep_critic
      stages: [round_1_discovery, supplemental_repair]
    - role: arbiter
      stages: [issue_framing]
  forbidden_slots:
    - role: arbiter
      stages: [final_synthesis]
      rule: forbidden_in_v1_executable_contract
  forbidden_when:
    - provider_quality_scenario
    - explicit_provider_run
    - missing_operator_trace
```

### Required Semantics
- Codex substitution is allowed by default for local personal cost control where the node policy permits it.
- `explorer` and `deep_critic` are the preferred Codex substitution targets.
- `arbiter.issue_framing` MAY use Codex because it frames internal discussion points.
- `arbiter.final_synthesis` is forbidden for Codex substitution in the v1 executable contract because it is the only external structured-output port. It may run only as `mocked_llm` in test/acceptance isolation or `provider_llm` for real execution.
- Provider-quality scenarios and explicit provider runs MUST NOT use Codex substitution.
- Codex failure MUST NOT fallback to `mocked_llm`.
- Codex output MUST pass the same output contract, schema validation, deterministic gates, routing, and authority-write boundaries as provider output.
- Codex output MUST record `execution_mode=codex_assisted`, `source_kind=codex_response`, `non_provider=true`, operator label, prompt packet hash, response hash, and optional operator approval ref.
- Codex substitution MUST NOT alter `profile_id`; the original role/stage profile remains the semantic intent.

### Boundary
- `DMP-04` defines where Codex may substitute for a role/stage invocation.
- `DMP-05` defines provider fallback and escalation when `execution_mode=provider_llm`.
- `DMP-07` defines the full provenance/audit field set.
- `DMP-09` defines mock/test isolation.

### Rationale
Codex can reduce local provider cost while preserving one workflow contract. Treating Codex as an execution override, rather than a hidden provider fallback, keeps provenance honest and prevents provider-quality acceptance from being satisfied by non-provider output.

## DMP-05 Provider Fallback And Escalation
- Status: locked
- Date: 2026-05-20

### Decision
Automatic provider fallback is disabled in v1.

A failed `provider_llm` invocation MUST record a failure artifact and stop the current role/stage slot or node as `blocked`. The operator MAY manually rerun the same profile or explicitly choose a different profile/model option, but the system MUST NOT automatically switch providers, switch to Codex, or switch to mocked output.

### Policy Shape
Debate-capable profiles SHOULD express v1 fallback behavior with this shape:

```yaml
provider_fallback_policy:
  automatic_fallback: false
  manual_rerun_allowed: true
  explicit_profile_override_allowed: true
  provider_failure_result: blocked
  record_failure_artifact: true
```

### Required Semantics
- `provider_llm` provider-call failure MUST record a failure artifact before returning `blocked`.
- v1 MUST NOT automatically fallback from one provider/model option to another provider/model option.
- v1 MUST NOT automatically fallback from `provider_llm` to `codex_assisted`.
- v1 MUST NOT fallback from any real execution mode to `mocked_llm`.
- Manual rerun MUST create a new attempt/run record with explicit provenance.
- Explicit profile or provider-option override MUST be operator-visible and MUST create a new attempt/run record with explicit provenance.
- Schema validation failure, deterministic validator failure, admission failure, routing blockers, and persistence failure are node/workflow failures, not provider-call failures; they MUST NOT trigger provider fallback.
- Future automatic fallback, if introduced, MUST be handled by a separate task and MUST include a deterministic attempt ledger, stable replay key, per-attempt telemetry, scenario coverage, and node-policy opt-in.

### Boundary
- `DMP-05` defines v1 fallback and escalation behavior only.
- `DMP-06` defines normalized parameter value sets and provider mappings.
- `DMP-07` defines the full provenance, audit, and telemetry field set.
- `DMP-08` defines retry, blocked, and human-review behavior outside provider fallback.
- Node policies still define whether a blocked provider slot blocks the whole node or can be surfaced for manual review.

### Rationale
This project is local-first and personal-use. Reproducibility, debuggability, and no-dual-track semantics are more valuable than high-availability provider failover. Disabling automatic fallback keeps provider choice explicit and prevents hidden provider/model changes from contaminating acceptance evidence.

## DMP-06 Parameter Normalization
- Status: locked
- Date: 2026-05-20

### Decision
Model invocation parameters MUST be normalized as cross-provider intent in the model profile. Workflow matrices, node policies, role/stage mappings, harness scenarios, domain services, and persisted authority objects MUST NOT contain concrete provider parameter names.

The canonical v1 parameter surface is intentionally small:

```yaml
normalized_params:
  creativity: low | medium | high
  reasoning_depth: none | low | medium | high | xhigh
  output_budget: small | medium | large
  structured_output_required: true | false
  output_format: text | json_object | json_schema
```

Provider-specific parameters MAY appear only under `provider_overrides` inside a versioned model option. Provider adapters or the LLM gateway map `normalized_params` plus `provider_overrides` to concrete provider payloads.

### Required Semantics
- Role/stage mapping MUST reference `profile_id`; it MUST NOT set `temperature`, `top_p`, `max_tokens`, `reasoning_effort`, `thinking_effort`, `enable_thinking`, or equivalent provider parameters.
- Node input/result contracts MUST NOT expose provider-specific parameter names.
- `normalized_params` MUST use only the canonical v1 keys unless a later profile-registry migration adds a new versioned key.
- `creativity` expresses exploration variance, not provider temperature directly.
- `reasoning_depth` expresses desired analysis budget, not a guarantee that every provider exposes the same reasoning/thinking mechanism.
- `output_budget` expresses expected response size; concrete token limits belong to provider adapters or provider overrides.
- `structured_output_required=true` and `output_format=json_schema` MUST be enforced by the calling wrapper/orchestrator contract before any downstream deterministic gates run.
- If a required capability cannot be satisfied by the selected provider/model option, profile resolution MUST fail fast.
- Optional capability degradation is allowed only when the model option explicitly permits it and the run records `capability_degraded=true` with a reason.
- Hidden reasoning, chain-of-thought, raw thinking traces, and provider-private reasoning payloads MUST NOT be persisted, even when `reasoning_depth` requests deeper analysis.
- `codex_assisted` execution MAY consume the same normalized intent, but its provenance MUST show it was applied through an operator/Codex-assisted path rather than a provider API payload.

### Provider Mapping Boundary
The provider adapter layer owns concrete mappings such as:

```yaml
provider_parameter_mapping:
  provider-a:
    creativity: adapter_maps_to_supported_sampling_controls
    reasoning_depth: adapter_maps_to_supported_reasoning_controls
    output_budget: adapter_maps_to_supported_output_limits
  provider-b:
    creativity: adapter_maps_to_supported_sampling_controls
    reasoning_depth: adapter_maps_to_supported_thinking_controls
    output_budget: adapter_maps_to_supported_output_limits
```

Concrete API field names are adapter details and MUST NOT be duplicated in node policies or workflow definitions.

Current executable mapping:
- OpenAI Responses API receives `reasoning.effort` derived from `normalized_params.reasoning_depth`: `low -> low`, `medium -> medium`, `high/xhigh -> high`; `none` omits the reasoning effort field.
- DashScope compatible-mode chat receives `extra_body.enable_thinking`, derived from `reasoning_depth !== none` and overridable only through the selected model option's `provider_overrides`.
- `provider_overrides` remain explicit model-option data. They may override adapter-derived provider fields, but they MUST NOT appear in node policy, workflow harness business logic, deterministic validators, or persisted authority records.
- The normalized parameter hash remains the stable cross-provider audit marker; raw provider runtime payloads are transport details and MUST NOT be persisted as decision evidence.

### Boundary
- `DMP-06` defines normalized parameter semantics and provider mapping boundaries.
- `DMP-02` defines where normalized parameters live inside model profiles.
- `DMP-05` remains authoritative for fallback; parameter mapping MUST NOT imply automatic provider fallback.
- `DMP-07` defines which parameter summaries, hashes, and capability-degrade markers are recorded in provenance/audit.
- `DMP-10` defines the final SSOT and implementation-location rules for profile registry and adapters.

### Rationale
Provider APIs differ and change. A compact normalized parameter layer lets workflow and debate design express functional intent while keeping provider-specific mechanics inside the LLM gateway/profile adapter boundary. This prevents role semantics from drifting into provider-specific behavior.

## DMP-07 Provenance, Audit, And Telemetry
- Status: locked
- Date: 2026-05-20

### Decision
All model-like invocations MUST use one common provenance/audit envelope. Debate MAY add a debate extension to the same envelope, but it MUST NOT use a separate tracing model.

The common envelope applies to `provider_llm`, `codex_assisted`, and `mocked_llm` execution. Single-agent nodes use the common fields only. Multi-agent debate nodes use the common fields plus debate extension fields for role, stage, round, and worker-to-arbiter lineage.

### Common Invocation Envelope
Every model-like invocation attempt SHOULD record this minimum shape:

```yaml
invocation_provenance:
  workflow_run_id: string
  node_attempt_id: string
  invocation_attempt_id: string
  node_id: string
  execution_mode: provider_llm | codex_assisted | mocked_llm
  run_mode: product | acceptance | test

  profile:
    profile_id: string
    profile_version: string
    profile_hash: string
    model_option_id: string | null
    normalized_params_hash: string
    capability_degraded: boolean
    capability_degrade_reason: string | null

  source:
    source_kind: provider_response | codex_response | mock_fixture
    provider_id: string | null
    model_id: string | null
    provider_request_id: string | null
    codex_operator_label: string | null
    mock_fixture_id: string | null

  input:
    prompt_template_id: string
    prompt_template_version: string
    prompt_packet_hash: string
    context_packet_refs: string[]
    context_packet_hashes: string[]

  output:
    response_hash: string | null
    structured_output_hash: string | null
    schema_validation_status: passed | failed | skipped
    artifact_refs: string[]
    status: succeeded | blocked | require_human_review | failed
    error_code: string | null

  telemetry:
    started_at: string
    completed_at: string | null
    duration_ms: number | null
    input_token_estimate: number | null
    output_token_estimate: number | null
    cost_estimate_usd: number | null
    cache_status: miss | hit | bypassed | not_applicable
    response_reuse_ref: string | null
```

### Debate Extension
Debate invocations SHOULD add this extension:

```yaml
debate_extension:
  debate_loop_id: string
  debate_policy_id: string
  round_index: number
  role: explorer | deep_critic | arbiter
  stage: string
  agent_instance_id: string
  parent_invocation_attempt_ids: string[]
  role_level_summary_ref: string | null
  arbiter_issue_frame_ref: string | null
  arbiter_final_artifact_ref: string | null
```

### Required Semantics
- The common envelope is mandatory for single-agent and debate model-like invocations.
- Debate-specific fields MUST live in `debate_extension`; they MUST NOT fork the common envelope.
- `execution_mode`, `source_kind`, `profile_id`, and source identity fields MUST distinguish provider, Codex, and mock outputs clearly.
- `provider_request_id` MAY be stored as diagnostic metadata, but it MUST NOT become a business input or authority reference.
- Prompt text, raw provider logs, secrets, credentials, API keys, hidden reasoning, chain-of-thought, raw thinking traces, and provider-private reasoning payloads MUST NOT be persisted.
- Raw worker outputs MAY be stored only as internal audit artifacts after redaction. They MUST NOT cross the node boundary as business inputs.
- The arbiter final artifact or node result is the only debate output that MAY feed downstream deterministic gates.
- Business-facing node results SHOULD expose only node status, authority refs, warnings/blockers, selected artifact refs, and audit refs/hashes.
- Cache and response reuse markers are provenance facts only; they MUST NOT change `execution_mode` or bypass schema validation and deterministic gates.
- Telemetry fields are diagnostic/cost evidence. Missing token or cost estimates MUST NOT block a node unless a node policy explicitly requires budget enforcement.

### Boundary
- `DMP-07` defines provenance, audit, telemetry, and debate lineage fields.
- `DMP-05` defines provider fallback behavior and manual rerun/override semantics.
- `DMP-06` defines normalized parameter semantics; `DMP-07` records only parameter summaries and hashes, not provider-specific payloads.
- `DMP-08` defines retry, blocked, failed, and human-review status semantics.
- `DMP-09` defines mock/test isolation rules.
- `DMP-10` defines the final SSOT and implementation-location rules for the envelope schema.

### Rationale
One provenance envelope keeps ordinary agent workflows and debate workflows on the same audit rail. The debate extension captures internal role/round lineage without allowing worker traces to become business contracts or a parallel workflow output path.

## DMP-08 Failure, Retry, Blocked, And Human Review
- Status: locked
- Date: 2026-05-20

### Decision
v1 allows only narrow low-level technical retry. It does not allow semantic retry, automatic provider fallback, or hidden re-asking of the model after schema, grounding, admission, or persistence failures.

A retry is technical only when it keeps the same `profile_id`, model option, normalized parameters, prompt packet hash, context packet hashes, output contract, and execution mode. Any change to those inputs is a new invocation attempt or an explicit operator rerun, not a retry.

### Policy Shape
Debate-capable profiles SHOULD express failure handling with this shape:

```yaml
failure_handling_policy:
  technical_retry:
    enabled: true
    max_provider_call_attempts: 2
    retryable_error_classes:
      - network_timeout
      - transient_rate_limit
      - transient_provider_5xx
    require_same_profile: true
    require_same_model_option: true
    require_same_prompt_packet_hash: true
    require_same_context_packet_hashes: true

  semantic_retry:
    enabled: false

  provider_fallback:
    automatic_fallback: false

  supplemental_round:
    is_retry: false
    requires_arbiter_scoped_questions: true
```

### Status Semantics
- `succeeded`: the invocation or node produced contract-valid output accepted by downstream deterministic gates for that step.
- `blocked`: the system cannot safely continue automatically, and the stop reason is operational, contractual, missing-data, or deterministic workflow failure rather than an explicit human judgment request.
- `require_human_review`: the system has enough context to present a grounded judgment question, but product policy requires operator decision before continuing.
- `failed`: an unexpected implementation/runtime failure occurred and should be treated as a bug or infrastructure problem, not as a valid workflow decision.

### Required Semantics
- Low-level technical retry MAY retry only provider transport or transient provider errors, and only under the same invocation semantics.
- Each provider-call retry MUST be recorded under the invocation provenance, including attempt index, retryable error class, provider request id when available, start/end time, and final outcome.
- Technical retry MUST NOT alter prompt text, context packets, profile, model option, parameters, schema, execution mode, role, stage, or debate round.
- Provider-call exhaustion under `provider_llm` MUST follow `DMP-05`: record a failure artifact and return `blocked`; it MUST NOT fallback.
- Schema validation failure MUST NOT trigger a model retry.
- Deterministic validator failure, admission failure, routing blocker, and persistence failure MUST NOT trigger model retry.
- `codex_assisted` failure MUST NOT fallback to `mocked_llm` or `provider_llm`.
- `mocked_llm` failures are test/acceptance fixture failures and MUST NOT be treated as product runtime recovery paths.
- Debate supplemental rounds are not retries. A supplemental round is allowed only when the arbiter emits scoped repair questions, remaining round budget exists, and the node policy permits supplemental repair.
- A supplemental round MUST re-enter the same output contract, schema validation, deterministic gates, routing, and authority-write boundary as the initial round.
- `blocked` MUST preserve blockers, error code, audit refs, and retry/rerun eligibility hints.
- `require_human_review` MUST preserve the concrete review question, candidate/ref targets, supporting evidence refs, unresolved judgment reason, and audit refs.

### Boundary
- `DMP-08` defines failure and retry semantics for model-like invocation and debate flow.
- `DMP-05` remains authoritative for provider fallback and manual profile/provider-option override.
- `DMP-07` defines how retry attempts, blockers, and human-review context are recorded.
- Node policies define whether a specific blocker stops the node, surfaces human review, or routes to a scoped supplemental round.
- Persistence rollback/idempotency remains owned by the domain persistence service and repository contracts, not by model retry policy.

### Rationale
Most model failures in this workflow are semantic or contractual, not transport failures. Automatically re-asking the model after those failures would hide product decisions inside retry behavior. Keeping retry narrow makes failures inspectable and keeps supplemental debate repair as an explicit arbiter-led workflow step.

## DMP-09 Mock/Test And Real-Decision Isolation
- Status: locked
- Date: 2026-05-20

### Decision
`mocked_llm` is test and acceptance infrastructure only. It MUST NOT participate in product-mode decisions, product-mode authority writes, provider-quality evidence, or real-flow acceptance claims.

Real decision evidence MUST come from `provider_llm` or explicitly marked `codex_assisted` runs. Mock evidence MAY prove contract, routing, validation, persistence-isolation, and harness behavior, but it MUST remain visibly separate from real decision evidence.

### Isolation Matrix

```yaml
execution_isolation:
  product:
    allowed_execution_modes: [provider_llm, codex_assisted]
    forbidden_execution_modes: [mocked_llm]
    authority_write_scope: product_database
    mock_authority_write_allowed: false

  acceptance:
    allowed_execution_modes: [mocked_llm, provider_llm, codex_assisted]
    authority_write_scope: isolated_acceptance_database_or_fixture_namespace
    mock_authority_write_allowed: true
    real_decision_claim_requires: [provider_llm_or_codex_assisted, explicit_source_kind]

  test:
    allowed_execution_modes: [mocked_llm]
    authority_write_scope: in_memory_or_test_database
    mock_authority_write_allowed: true
```

### Required Semantics
- `mocked_llm` MUST be rejected when `run_mode=product`.
- `mocked_llm` MUST NOT write product database authority records.
- Mock-backed persistence coverage MUST use an in-memory repository, isolated test database, isolated acceptance database, or explicit fixture namespace.
- Mock-backed artifacts MUST record `run_mode`, `execution_mode=mocked_llm`, `source_kind=mock_fixture`, and `mock_fixture_id`.
- Provider-backed artifacts MUST record `execution_mode=provider_llm`, `source_kind=provider_response`, and provider/model identity.
- Codex-assisted artifacts MUST record `execution_mode=codex_assisted`, `source_kind=codex_response`, `non_provider=true`, and operator/Codex provenance.
- `mocked_llm` output MUST NOT satisfy provider-quality scenarios or real-flow acceptance criteria.
- Real E2E evidence MUST be labeled separately from mock acceptance evidence in verification notes and artifact summaries.
- `provider_llm` or `codex_assisted` failure MUST NOT fallback to `mocked_llm`.
- `mocked_llm` failure is a test/acceptance fixture failure and MUST NOT trigger product recovery behavior.
- Cache/reuse records generated from mock output MUST NOT be consumed by product-mode runs.
- Mixed-source comparison is allowed for quality review only when the report explicitly separates source classes and does not merge mock results into real decision metrics.

### Boundary
- `DMP-09` defines run-mode and mock isolation.
- `DMP-04` defines Codex substitution and its provenance requirements.
- `DMP-05` and `DMP-08` forbid fallback from real execution modes to mock.
- `DMP-07` defines the common provenance fields that make source separation auditable.
- `DMP-10` defines where run-mode enforcement, fixture namespaces, and product/test database separation must live in implementation.

### Rationale
Mock runs are valuable for deterministic acceptance, but they are dangerous when their outputs resemble real decisions. Strict run-mode, provenance, and persistence isolation prevents a passing mock harness from being misread as a real topic-selection flow.

## DMP-10 SSOT And No-Dual-Track Implementation Rules
- Status: locked
- Date: 2026-05-20

### Decision
Debate model invocation v1 MUST have one implementation path. Model profiles, role/stage mappings, invocation entrypoints, provenance, artifacts, cache/reuse, run-mode enforcement, and authority writes MUST NOT fork into debate-specific alternatives.

The model profile registry is the SSOT for provider/model selection, provider/model options, normalized parameters, provider overrides, capability requirements, fallback policy, retry policy, audit policy, budget policy, and mock/run-mode eligibility. Workflow and node policy documents may reference profile ids and execution modes, but they MUST NOT duplicate concrete provider/model/parameter rules.

All model-like nodes, including ordinary single-agent nodes and multi-agent debate slots, MUST use the same execution object semantics:

```yaml
execution_spec:
  execution_mode: provider_llm | codex_assisted | mocked_llm
  model_option_id: optional_profile_bound_option_for_provider_llm
```

For debate, the executable plan MAY apply this same shape at three levels:
- `default`: inherited by slots unless overridden.
- `slots.<slot_id>`: applies to every instance in that role/stage slot.
- `instances.<slot_id>#<agent_instance_id>`: applies to one repeatable instance, for example `explorer.round_1_discovery#explorer_2`.

For current debate execution plans, precedence is `instances > slots > default > node input`. `DMP-11` defines the generalized all-node invocation-slot precedence. Legacy `slot_execution_overrides` and `slot_model_option_overrides` are compatibility-only and MUST NOT be mixed with `execution_plan` in the same run.

### Implementation Ownership
The implementation MUST keep these ownership boundaries:

```yaml
implementation_ownership:
  model_profile_registry:
    owns:
      - provider_and_model_options
      - normalized_params
      - provider_overrides
      - required_capabilities
      - fallback_policy
      - retry_policy
      - audit_policy
      - budget_policy
      - run_mode_eligibility

  workflow_and_node_policy:
    may_reference:
      - node_id
      - execution_mode
      - run_mode
      - profile_id
      - role_stage_profile_mapping
      - deterministic_gate_policy
    must_not_define:
      - concrete_provider_id
      - concrete_model_id
      - provider_specific_parameters
      - fallback_chain
      - alternate_mock_rules

  invocation_runtime:
    entrypoint: AgentOrchestrator
    provider_boundary: BackendLlmGateway
    provenance_shape: common_invocation_envelope
    debate_extra_shape: debate_extension

  artifacts_and_authority:
    artifact_boundary: TopicSelectionControlPlaneService artifact refs
    authority_write_boundary: domain service and repository contracts
    workflow_harness_boundary: registered WorkflowScenario definitions
```

### Required Semantics
- Feature code MUST NOT import or call provider SDKs directly.
- All provider calls MUST pass through `AgentOrchestrator` and the existing LLM gateway boundary.
- Debate MUST NOT introduce a separate LLM router, prompt runtime, cache layer, artifact writer, transcript store, or authority persistence path.
- Role/stage mapping MUST only reference versioned `profile_id` values and output/input contracts.
- Provider/model/parameter changes MUST be made through versioned profile registry changes and profile validation.
- Prompt templates MUST remain versioned references; node adapters may build prompt packets, but they MUST NOT create an unversioned parallel prompt source for debate.
- The common provenance envelope from `DMP-07` is the only invocation audit shape. Debate may add `debate_extension` only.
- Run-mode enforcement from `DMP-09` MUST run at orchestration/harness boundaries and at any future route-level node runner boundary.
- Mock/test isolation MUST NOT be reimplemented differently in individual node services.
- Cache and response reuse MUST be recorded through the shared provenance/cache markers and MUST NOT create a new execution mode.
- Artifacts MUST be written through the existing control-plane artifact-ref boundary with redaction policy applied.
- Authority writes MUST remain inside domain services/repositories; agent/debate runtime MUST only produce validated artifacts or commands consumed by those services.
- Workflow acceptance coverage MUST use registered `WorkflowScenario` definitions, not standalone runners with independent routing semantics.
- Future multi-agent debate implementation MUST reuse the same profile resolver, orchestrator, provenance envelope, artifact boundary, and domain persistence boundary as single-agent nodes.
- Any exception to these rules requires a new task package, explicit drift analysis, and governance lint/update before implementation.

### Implementation Order
Implementation SHOULD proceed in this order:
- Profile registry/schema validator for DMP-01 through DMP-12.
- Shared provenance envelope contract and validator.
- Orchestrator profile resolution and run-mode enforcement.
- WorkflowHarness scenario wiring over the shared runtime.
- Route-level node runner only after harness scenarios pass.
- Provider/Codex real-flow evidence only after mock/test isolation and provenance validation pass.

### Boundary
- `DMP-10` finalizes SSOT and implementation-location rules for Debate Model Invocation Policy v1.
- It does not implement the registry, route runner, profile validator, or multi-agent loop by itself.
- Any implementation task must keep DMP-01 through DMP-12 as the policy baseline.

### Rationale
The highest long-term risk is not a missing provider option; it is two plausible invocation systems coexisting with slightly different semantics. A single SSOT and one runtime path keep single-agent workflows, debate workflows, mock harnesses, Codex-assisted runs, and provider-backed runs comparable and auditable.

## DMP-11 Invocation Slot Override Boundary
- Status: locked
- Date: 2026-05-25

### Decision
All model-like participation points in topic selection MUST be represented as invocation slots.

An invocation slot is the smallest workflow-owned call site that may produce model-like output through `mocked_llm`, `codex_assisted`, or `provider_llm`. Single-agent nodes usually have one invocation slot. Multi-agent debate nodes have role/stage slots and MAY have instance-level specs for repeatable worker roles.

Deterministic nodes and deterministic subpaths MUST NOT accept invocation overrides. If a caller supplies `execution_spec`, `model_option_id`, or an execution plan to a deterministic-only path, the node MUST block with `INVALID_PAYLOAD` before any authority write.

### General Override Shape
Single-agent or bounded semantic-review slots use the shared execution object:

```yaml
execution_spec:
  execution_mode: mocked_llm | codex_assisted | provider_llm
  model_option_id: optional_profile_bound_option_for_provider_llm
```

Debate slots use the execution plan envelope:

```yaml
execution_plan:
  default:
    execution_mode: provider_llm
  slots:
    explorer.round_1_discovery:
      execution_mode: provider_llm
      model_option_id: topic-selection.need-discovery.explorer.v1.deepseek-v4-thinking
  instances:
    explorer.round_1_discovery#explorer_2:
      execution_mode: codex_assisted
```

### Precedence
Override precedence is:

```text
instance > slot > node/call-site > scenario default > profile default
```

Definitions:
- `instance`: one repeatable role instance, such as `explorer.round_1_discovery#explorer_2`.
- `slot`: one invocation slot, such as `explorer.round_1_discovery` or `evidence_extraction`.
- `node/call-site`: the node-level single-agent `execution_spec` for non-debate calls.
- `scenario default`: harness/scenario-level default execution mode for the run.
- `profile default`: model profile registry selection when `provider_llm` has no explicit `model_option_id`.

### Required Semantics
- `execution_mode` expresses source class only; it MUST NOT encode provider, model, or provider-specific parameters.
- `model_option_id` is legal only when the effective `execution_mode` is `provider_llm`.
- Provider/model selection MUST resolve through the model profile registry. Workflow code, node policies, harness scripts, and routes MUST NOT branch on concrete provider/model ids for business behavior.
- Provider-specific parameters MUST remain under model-option `provider_overrides` and be mapped only by provider adapters or `BackendLlmGateway`.
- `codex_assisted` is an explicit execution override or default for local cost control; it is not provider fallback and cannot masquerade as provider evidence.
- `mocked_llm` remains test/acceptance-only and cannot satisfy product-mode authority or provider-quality claims.
- Provider failure MUST return `blocked` according to profile failure policy. It MUST NOT automatically switch provider, switch to Codex, switch to mock, or use cached non-provider output.
- Repeatable instance overrides are allowed only for slots whose instance policy permits multiple instances. Arbiter slots and ordinary single-agent nodes MUST NOT use instance-level overrides.
- Effective invocation identity MUST be included in replay/cache hashes: node id, slot id, instance id when present, execution mode, profile id, model option id when present, normalized params hash, prompt packet hash, and context packet hashes.
- Artifacts and provenance MUST record the effective source class, selected profile, selected model option when applicable, provider/model identity when applicable, and whether the output came from a cache/reuse path.

### Current Slot Categories
- Deterministic-only node: no invocation slot, no override surface.
- Single-agent semantic slot: one `execution_spec`, no instance override.
- Human-authorized semantic-review slot: one `execution_spec` only when the human/delegation policy allows a model-like reviewer.
- Debate worker slot: role/stage `slot_id`, optional instance-level override when the scenario contract allows multiple worker instances.
- Debate arbiter slot: role/stage `slot_id`, slot-level override only; instance override is forbidden.

### Boundary
- `DMP-11` defines override shape and precedence for all model-like topic-selection calls.
- Node policies and workflow matrix define whether a node has an invocation slot at all.
- Model profile registry defines concrete provider/model options and runtime parameters.
- `DMP-10` remains the SSOT/no-dual-track implementation rule.
- Current v1a implementation already applies this shape to N5, N6 single-agent, N6 debate, N7, and N8; the workflow matrix must be kept aligned so it does not imply a second deterministic-only path for implemented model-like slots.

### Rationale
Without a single invocation-slot concept, provider overrides, Codex substitution, debate role selection, and harness variables can grow into separate routing systems. A single precedence rule keeps local cost control, real-provider canaries, DeepSeek worker alternatives, and future v1b/v1c LLM nodes comparable and auditable.

## DMP-12 Slot Execution Profiles V1
- Status: locked
- Date: 2026-05-25

### Decision
Slot execution profiles MUST be named, explicit, and executable. Defaults MUST NOT contain alternatives such as `A or B`, and workflow code MUST NOT use vague selectors such as `scenario-defined` without resolving them to a concrete named profile before invocation.

Named profiles are policy-level execution plans. Runtime implementation still resolves concrete provider/model/timeout through the model profile registry and the execution plan shape from `DMP-11`.

### Single-Agent Defaults
The current v1a single-agent slot defaults are:

| Slot | Default execution mode | Notes |
| --- | --- | --- |
| N5 `evidence_extraction` | `none` | Requires caller-supplied `TopicSelectionEvidenceMapExtractionDraft@v1`; model-like extraction is explicit quality/canary upgrade. |
| N6 `need_candidate_generation` | `codex_assisted` | Local cost-control default before deterministic admission. |
| N7 `adjudication_recommendation` | `codex_assisted` | Provider is explicit quality/canary upgrade. |
| N8 `confirmation_semantic_review` | `codex_assisted` | Runs only under the human/delegation boundary; provider is explicit high-risk review upgrade. |

### Product-Quality Timeout Targets
The project is local-first and personal-use, so product-quality model calls SHOULD favor quality over low latency. Smoke/connectivity timeouts MAY remain shorter and MUST NOT redefine product-quality defaults.

| Option family or slot | Target timeout |
| --- | ---: |
| Standard provider call | 180s |
| OpenAI `openai-quality` | 300s |
| OpenAI `openai-deep-reasoning` | 450s |
| DashScope thinking option | 300s |
| DeepSeek V4 thinking option | 450s |
| `arbiter.final_synthesis` with deep reasoning | 450s |
| Smoke/connectivity tests | 60s-180s |

These are implemented registry values for SO-03. Smoke/connectivity tests may choose shorter per-test timeouts, but they do not redefine product-quality defaults.

### Codex Participation Boundary
Codex SHOULD participate broadly for local cost control and project-aware critique, especially in explorer, deep critic, issue framing, N5 extraction, N7 recommendation, and N8 semantic review.

Codex participation has additional robustness constraints:
- Codex worker outputs MUST use the same structured output contracts as provider outputs.
- Codex workers MUST consume frozen context packets by default and MUST NOT read live DB, mutable resource pools, harness runtime state, or repo files during the invocation.
- If a Codex run intentionally uses repo, skill, or additional operator context, provenance MUST record `codex_context_augmented=true` and the extra context/artifact refs.
- Codex outputs are non-authority artifacts until deterministic gates accept downstream materialization.
- Codex MUST NOT write `NeedCandidate`, `EvidenceMap`, `ValidatedNeed`, v1b, v1c, or downstream authority records directly.
- Codex MUST NOT be the only deep-critique anchor in a provider-quality debate profile.
- Codex MUST NOT perform `arbiter.final_synthesis` in a run that claims provider-quality debate evidence.
- Provider-quality final synthesis MUST remain provider-backed.

### Named V1a Debate Profiles
`mixed-cost-control` is the default recommended daily local debate profile:

| Slot instance | Execution |
| --- | --- |
| `explorer.round_1_discovery#explorer_1` | `codex_assisted` |
| `deep_critic.round_1_discovery#deep_critic_1` | `codex_assisted` |
| `arbiter.issue_framing` | `codex_assisted` |
| `arbiter.final_synthesis` | `provider_llm` with OpenAI `openai-quality` |

`provider-diverse-deep` is the high-quality provider canary/review profile:

| Slot instance | Execution |
| --- | --- |
| `explorer.round_1_discovery#explorer_1` | `codex_assisted` |
| `explorer.round_1_discovery#explorer_2` | `provider_llm` with OpenAI `openai-quality` |
| `explorer.round_1_discovery#explorer_3` | `provider_llm` with DashScope thinking option |
| `deep_critic.round_1_discovery#deep_critic_1` | `provider_llm` with OpenAI `openai-deep-reasoning` |
| `deep_critic.round_1_discovery#deep_critic_2` | `codex_assisted` |
| `arbiter.issue_framing` | `codex_assisted` |
| `arbiter.final_synthesis` | `provider_llm` with OpenAI `openai-deep-reasoning` |

The default `provider-diverse-deep` profile uses two deep critics: OpenAI as the provider-backed anchor and Codex as the project-aware critic. DeepSeek V4 thinking is an optional manual third critic or replacement source for explorer/deep_critic, not the default deep-critic anchor.

### Provider Option Naming
DashScope debate options that use thinking are named to make thinking explicit. Canonical id suffix: `dashscope-thinking-budget`.

The compatibility id suffix `dashscope-budget` remains as a legacy alias, but it MUST continue to mean DashScope/Qwen with thinking enabled. A future non-thinking DashScope option must use a separate id, such as `dashscope-fast-nonthinking`.

### Boundary
- `DMP-12` defines named slot execution profiles and product-quality timeout targets.
- The model profile registry remains the implementation SSOT for exact option ids, model ids, normalized params, provider overrides, and timeout values.
- `DMP-11` remains the override-shape and precedence rule.
- SO-03 implementation sync has landed for timeout values, DashScope thinking option naming with legacy alias, and v1a harness named debate profile materialization. Tests may now assume these option names and timeout values.

### Rationale
The system should use Codex heavily where it improves project-aware exploration and critique, but it must preserve a provider-backed quality anchor for external final synthesis and provider-quality debate claims. Named profiles give the harness deterministic behavior while still allowing cost-control and high-quality canary modes.

## DMP-13 Debate Primitive Dichotomy And N8 Bounded-Sequence Trigger Semantics
- Status: locked
- Date: 2026-06-13
- Source: T-123 Phase 3 (DP-3.1~3.6); harness change registered as T-088 `06-joint-decisions.md` D-T123-02.

### Decision
Multi-agent debate in topic selection has exactly two primitives. Every debate-eligible node MUST bind to one of them; no third shape may be introduced without a new DMP decision.

| Primitive | Shape | Nodes | Reference |
| --- | --- | --- | --- |
| `divergent_loop` | Arbiter-led iterative fan-out: variable rounds, explorer/deep_critic multiplicity, arbiter frames/routes/synthesizes, bounded `max_rounds`. | resource-sampling, v1a need discovery | `D-16`, `D-17` |
| `bounded_sequence` | Fixed single-pass role order for evaluation nodes; the final synthesizer is the sole external structured output (arbiter semantics, `D-07`/`DMP-03`). | v1c N2 promotion support, v1b N8 value assessment | this decision |

`bounded_sequence` role order is fixed and single-pass:
- v1c N2: `promotion_supporter_draft -> reviewer_critic_review -> promotion_supporter_repair -> synthesizer_final`.
- v1b N8: `n8_debate_assessor_draft -> n8_debate_value_critic -> n8_debate_assessor_repair -> n8_debate_synthesizer_final`.

Both primitives share ONE runtime implementation (`DMP-10`): the bounded-sequence skeleton is a single shared executor; v1c N2 and v1b N8 inject version-specific context-packet construction, output contract, and preserved facts. No second debate engine, LLM path, or hash implementation is created.

### N8 Bounded-Sequence Trigger Semantics (N6-Isomorphic, Zero New Engine)
N8 debate is `conditional`. Activation reuses the existing deterministic gate + loopback mechanism (same form as N6 loopback triage) — there is NO new trigger engine:

| Trigger | Mechanism | Code / Source |
| --- | --- | --- |
| T1 borderline | Deterministic N8 gate check over the draft: `total_score` inside the policy band, or `confidence` below the policy floor. | `N8_VALUE_BORDERLINE_DEBATE_TRIGGER` (blocker, first pass) / `N8_VALUE_BORDERLINE_AFTER_DEBATE` (warning, post-debate) |
| T3 dimension conflict | Deterministic N8 gate check: dimension-score spread at/above threshold, or a single dimension below floor while total is admissible. | `N8_DIMENSION_CONFLICT_DEBATE_TRIGGER` (blocker) / `N8_DIMENSION_CONFLICT_AFTER_DEBATE` (warning) |
| T2 rerun drift | NOT an independent detector. The `n7_n8_debate_admission_review` slot reads the frozen `trial_ledger_hash` as reference input when recommending debate level. | trial ledger (existing N7->N8 projection) |
| T4 operator force | `DMP-11` execution-plan explicit selection of a debate level; no new field. | execution_plan slot override |

Escalation flow (N6-isomorphic):
1. First-pass N8 (frozen payload's debate-admission `input_mode != feedback_from_n8`) hits T1/T3 -> gate emits the blocker, route `loopback` (`RB_N8_N7`, `loopback_target_code: n8_feedback_to_n7`), and records an `N8ToN7Feedback@v1` artifact. No authority is written.
2. N7 re-enters in `feedback_from_n8` mode, runs `n7_n8_debate_admission_review` -> selects `debate_level` (compact vs provider-diverse-deep) -> emits `n8_debate_level_selected` warning -> pins the admission ref into the N7->N8 handoff.
3. The N8 debate runtime (caller-side, like v1c N2) runs the 4-role bounded sequence; the synthesizer's `TopicValueAssessmentDraft@v1` is recorded into `n8_value_assessment_draft` for the same deterministic gate.
4. Post-debate re-assessment still inside a trigger band -> admit with the `*_AFTER_DEBATE` warning (no further loopback): debate already ran for this contract. The coordinator loopback budget is a second safeguard.

Thresholds are PROVISIONAL (`debate_trigger_thresholds` on the N8 node policy) and MUST be calibrated against near-prod deep-test score distributions; they are node-policy data, not service constants. Scope is N8-only: N9 remains a deterministic dispatcher; its declared loopback codes stay unused.

### Named V1b N8 Debate Profiles
The four N8 role slots share ONE model profile (`topic-selection.v1b.n8-bounded-debate.v1`) plus four per-role context-policy profiles. Per-role provider diversity is expressed as `model_option_id` overrides in the `DMP-11` execution plan on this one profile — NOT separate model profiles.

`compact_assessment_debate` is the default daily local profile:

| Role slot | Execution |
| --- | --- |
| `n8_debate_assessor_draft` | `codex_assisted` |
| `n8_debate_value_critic` | `codex_assisted` |
| `n8_debate_assessor_repair` | `codex_assisted` |
| `n8_debate_synthesizer_final` | `codex_assisted` |

`provider_diverse_deep_debate` is the high-conflict canary/review profile:

| Role slot | Execution |
| --- | --- |
| `n8_debate_assessor_draft` | `codex_assisted` |
| `n8_debate_value_critic` | `provider_llm` with OpenAI `openai-deep-reasoning` |
| `n8_debate_assessor_repair` | `codex_assisted` |
| `n8_debate_synthesizer_final` | `provider_llm` with OpenAI `openai-deep-reasoning` |

Consistent with the `DMP-12` Codex participation boundary: Codex MUST NOT be the only deep-critique anchor nor perform final synthesis in a run claiming provider-quality debate evidence — hence the critic and synthesizer are provider-backed in `provider_diverse_deep_debate`.

### Boundary
- `DMP-13` defines the debate-primitive dichotomy and N8 trigger/admission semantics. The deterministic threshold VALUES live in the N8 node policy (calibratable data), not in this policy or in service code.
- The shared bounded-sequence skeleton is the single implementation (`DMP-10`); v1c N2 and v1b N8 provide version strategies only.
- `DMP-11` remains the override-shape/precedence rule; `DMP-12` remains the v1a named-profile SSOT; the model profile registry remains the implementation SSOT for option ids and timeouts.
- Workflow-matrix N8 row references this decision for the conditional-debate mechanism.

### Rationale
Forcing debate into exactly two primitives prevents a third ad-hoc shape from drifting in, and binding N8 activation to the existing gate+loopback mechanism keeps "conditional debate" deterministic and replayable instead of a heuristic. Provider-backing the critic and synthesizer in the deep profile preserves an external quality anchor, matching the `DMP-12` Codex boundary.

## Pending Decisions
- None. Debate Model Invocation Policy v1 is fully locked by `DMP-01` through `DMP-13`.
