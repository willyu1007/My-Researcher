# 02 Architecture

## Joint Boundary Decisions
- Joint decision SSOT: `dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md`.
- T-088 owns the runtime primitives implied by those decisions.
- T-089 consumes the same decisions when classifying each topic-selection node into deterministic, single-agent, Codex-assisted, human-review, or multi-agent-debate execution.

## Runtime Boundaries
- `WorkflowHarness`: scenario setup, fixture loading, node sequencing, run trace, and assertions.
- `WorkflowScenario`: versioned acceptance scenario definition. Existing real-flow, E2E, quality-gate, and provider-stability flows must migrate here rather than remain as script-owned semantics. The initial T-089 scenario registry is `dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`.
- `AgentOrchestrator`: executor invocation boundary that receives caller-built invocation payloads, validates structured output, applies retry/escalation policy, and records audit. It does not read business DB state to assemble domain context.
- Domain services: still own v1a/v1b/v1c decisions, repositories, and contract validation.
- Provider gateway: existing `BackendLlmGateway` remains the only backend path to provider APIs.

## Module-Level Value Contracts
- `TopicSelectionTopicSeed` remains an authority object created only by Node 1, not by any model-like helper.
- `TopicSeedIntentDraft` is reserved as an optional pre-Node-1 value artifact for future use. It may help draft `intent_summary` and `scope_notes`, but it must not write TopicSeed authority or change Node 1 execution mode.
- `TopicSelectionSearchPlanBlueprint` is a topic-selection module-level value contract, not a private Node 3 helper shape.
- The blueprint is not a standalone authority object in the initial normalization slice. It is frozen through Node 3 normalized input, control-plane input snapshot, and harness trace.
- Node 3 consumes and validates the blueprint, then materializes `TopicSelectionSearchPlan` and `TopicSelectionCoverageRowIntent` authorities.
- Future blueprint producers, including WorkflowScenario fixtures, human/Codex-assisted local drafting, or an automatic `draft-search-plan-blueprint` node, must produce the same module-level blueprint contract.
- Node 3 must not create a second, node-private blueprint contract or infer a blueprint from upstream authorities.

### TopicSeed Intent Draft Boundary
Node 1 may receive `intent_summary` and `scope_notes` that were drafted by a human, Codex, a provider LLM, or a test fixture before invocation. That upstream drafting is input preparation only.

Requirements:
- `topic-selection.v1a.create-topic-seed.v1` stays deterministic with `execution_mode=none`.
- Node 1 must not call `AgentOrchestrator`, `BackendLlmGateway`, Codex, provider LLMs, or debate runtime.
- Any future `TopicSeedIntentDraft@v1` helper must be defined as a separate pre-node value artifact/profile under the Node 1 decision section, not as an N3 follow-up.
- Draft output may become input provenance when the contract supports it, but the TopicSeed authority is created only after Node 1 validates and freezes the final input.
- No executable TopicSeed draft profile is locked in this slice.

### `TopicSelectionSearchPlanBlueprint@v1`
Minimum fields:
- `schema_version`: fixed blueprint schema id.
- `blueprint_origin`: `workflow_scenario_fixture | human_authored | codex_assisted | upstream_node`.
- `blueprint_provenance_refs`: functional refs for fixture, operator note, Codex packet, or future upstream node artifacts; may be empty for minimal tests.
- `title_card_ref`: concrete TitleCard ref.
- `topic_seed_ref`: concrete TopicSeed ref with version.
- `literature_resource_pool_snapshot_ref`: concrete Node 2 snapshot ref with version.
- `expected_snapshot_hash`: the snapshot hash the blueprint was drafted against.
- `plan_version`: optional requested SearchPlan version.
- `parent_search_plan_ref`: optional ref for refinement/recheck plans.
- `recheck_request_ref`: optional ref when the blueprint answers a SearchPlan recheck request.
- `query_intents`: non-empty normalized search-intent strings.
- `coverage_intents`: non-empty execution-level coverage rows.
- `must_check_constraints`: normalized constraints the SearchPlan must preserve.
- `exclusion_rules`: normalized exclusion rules the SearchPlan must preserve.
- `coverage_strategy`: structured strategy object for search breadth, depth, source mix, and sequencing.
- `role_coverage_expectation`: structured minimum evidence-role coverage expectation.
- `policy_version`: policy used to validate the blueprint.
- `output_schema_version`: expected downstream SearchPlan output schema.

Each `coverage_intent` row MUST include:
- `coverage_key`
- `intent_type`
- `query`
- `rationale`
- `required`
- `priority`
- `expected_evidence_role`
- `target_source_types`
- `refs`

`target_source_types` and `refs` may be empty arrays, but the fields must exist after normalization.

Consumer fit:
- Node 3 can map the blueprint directly to `CreateSearchPlanInput` and block stale `expected_snapshot_hash` before authority creation.
- Node 4 can bind observations, evidence bindings, assessments, and risk acceptances to persisted coverage row ids without guessing row semantics.
- EvidenceMap can preserve `coverage_row_intent_ref` and expected role lineage from SearchRun bindings.
- NeedCandidate generation consumes EvidenceMap role bundles, so it does not need to read the blueprint directly.
- Future blueprint generators have one output shape to target, avoiding a second contract when automatic drafting is introduced.

### SearchPlanBlueprint LLM Profiles
`TopicSelectionSearchPlanBlueprint@v1` may be drafted or reviewed by model-like execution before Node 3 runs. Node 3 itself remains deterministic and never invokes these profiles.

Default execution mode:
- `codex_assisted` is the default for local personal-use drafting and review.
- `provider_llm` is an explicit operator upgrade or provider-quality scenario.
- `mocked_llm` is test/acceptance-only.

Draft profile:
```yaml
profile_id: topic-selection.search-plan-blueprint.draft.v1
profile_function: search_plan_blueprint_drafting
role_family: single_agent
stage_family: blueprint_draft
output_contract: TopicSelectionSearchPlanBlueprint@v1
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
model_options:
  - option_id: topic-selection.search-plan-blueprint.draft.v1.openai-balanced
    option_purpose: default_balanced_provider_run
    provider_id: openai
    model_id: gpt-5.5
    request_policy: { timeout_ms: 120000 }
    normalized_params:
      creativity: medium
      reasoning_depth: high
      output_budget: large
      structured_output_required: true
      output_format: json_schema
  - option_id: topic-selection.search-plan-blueprint.draft.v1.openai-high-accuracy
    option_purpose: high_accuracy_explicit_provider_run
    provider_id: openai
    model_id: gpt-5.5
    request_policy: { timeout_ms: 180000 }
    normalized_params:
      creativity: medium
      reasoning_depth: high
      output_budget: large
      structured_output_required: true
      output_format: json_schema
  - option_id: topic-selection.search-plan-blueprint.draft.v1.dashscope-budget
    option_purpose: budget_sensitive_explicit_provider_run
    provider_id: dashscope
    model_id: qwen3.6-plus
    request_policy: { timeout_ms: 120000 }
    normalized_params:
      creativity: medium
      reasoning_depth: high
      output_budget: large
      structured_output_required: true
      output_format: json_schema
    provider_overrides: { enable_thinking: true }
```

Review profile:
```yaml
profile_id: topic-selection.search-plan-blueprint.review.v1
profile_function: search_plan_blueprint_review
role_family: single_agent
stage_family: blueprint_review
output_contract: TopicSelectionSearchPlanBlueprintReview@v1
allowed_execution_modes: [codex_assisted, provider_llm, mocked_llm]
default_execution_mode: codex_assisted
model_options:
  - option_id: topic-selection.search-plan-blueprint.review.v1.openai-balanced
    option_purpose: default_balanced_provider_run
    provider_id: openai
    model_id: gpt-5.5
    request_policy: { timeout_ms: 90000 }
    normalized_params:
      creativity: low
      reasoning_depth: high
      output_budget: medium
      structured_output_required: true
      output_format: json_schema
  - option_id: topic-selection.search-plan-blueprint.review.v1.openai-high-accuracy
    option_purpose: high_accuracy_explicit_provider_run
    provider_id: openai
    model_id: gpt-5.5
    request_policy: { timeout_ms: 150000 }
    normalized_params:
      creativity: low
      reasoning_depth: high
      output_budget: medium
      structured_output_required: true
      output_format: json_schema
  - option_id: topic-selection.search-plan-blueprint.review.v1.dashscope-budget
    option_purpose: budget_sensitive_explicit_provider_run
    provider_id: dashscope
    model_id: qwen3.6-plus
    request_policy: { timeout_ms: 120000 }
    normalized_params:
      creativity: low
      reasoning_depth: high
      output_budget: medium
      structured_output_required: true
      output_format: json_schema
    provider_overrides: { enable_thinking: true }
```

Fallback and audit:
- Automatic provider fallback is disabled.
- Manual rerun or explicit profile/model-option override is allowed and must create a new attempt with provenance.
- Codex output must be recorded as `execution_mode=codex_assisted` and `source_kind=codex_response`.
- Provider output must go through `AgentOrchestrator` and `BackendLlmGateway`.
- Hidden reasoning, raw provider logs, provider-private thinking traces, and secrets must not be persisted.
- DeepSeek is not a valid option until it is registered as a provider in `.ai/llm-config/registry/providers.yaml`.

## Profile Escalation Policy
- Inputs: node kind, uncertainty, malformed output count, deterministic guardrail outcome, reviewer risk level, and user-selected execution mode.
- Decisions: keep current profile, retry same profile, escalate profile, block run.
- Audit: selected profile, escalation trigger, retry count, structured-output validation result, and provider telemetry summary.
- It must not silently cross execution modes, switch executor kind, downgrade to heuristics, use cached responses, or bypass deterministic guardrails.
- Escalating from `single_agent` to `multi_agent_debate` is not profile escalation; it is a T-089 workflow classification decision.

## Execution Modes
- `mocked_llm` is test/acceptance-only. It must not be used as product runtime or as provider outage fallback.
- `provider_llm` is the only provider-backed runtime mode and must call through `BackendLlmGateway`.
- `codex_assisted` is an operator/local acceptance mode that validates structured responses like provider output but is not product automation.
- `none` is allowed only as a matrix sentinel for deterministic and human-review nodes that do not invoke `AgentOrchestrator`.
- Mocked and provider-backed decisions must be database- and audit-distinguishable; product runtime stores must reject or quarantine mock writes unless an explicit acceptance/test flag is enabled.

## Trace, Audit, And Persistence
- Reuse the existing topic-selection control-plane primitives rather than creating a parallel trace/audit spine.
- Runtime DB records store queryable summaries and refs; large prompt/context/output payloads belong in redacted artifacts with hashes.
- Domain services remain the only writers of authority objects.
- Agent invocation audit snapshots use the shared `topic-selection-agent-invocation-audit-v1` envelope before control-plane artifact persistence.
- The shared envelope is the only runtime provenance shape for `mocked_llm`, `codex_assisted`, `provider_llm`, single-agent, and future debate role calls; source differences are recorded as fields, not alternate result shapes.
- Current gaps are compatibility items: `ResourceSamplingAudit.llmStructuredOutput`, missing explicit mode/executor fields on `LlmWorkflowRun`, and unconstrained inline payloads must be handled by T-088 without breaking completed T-079 behavior.

## Multi-Agent Debate
- Debate is a bounded executor for explicitly approved high-conflict nodes, not a workflow spine or profile escalation path.
- Debate runtime support must not write authority objects directly.
- Debate caching, retention, artifact granularity, and per-node persistence policy are owned by T-089.

## Codex-Assisted Mode
- Codex-assisted mode is the default low-cost local execution option for this personal local-first project.
- The harness/runtime emits a structured prompt packet and accepts a structured response packet from Codex or the operator.
- Most single-agent nodes may use Codex instead of provider LLM when allowed by node policy.
- Multi-agent debate may assign Codex to specific roles when T-089 allows it.
- Codex-assisted results may drive local product workflows, but they must be query-distinguishable from provider-backed decisions and validated exactly like provider output.

## Compatibility Guardrails
- No parallel ad hoc workflow runner should remain authoritative after migration.
- Legacy real-flow/E2E scripts may remain only as wrapper-only CLI entrypoints around `WorkflowHarness.runScenario`.
- Wrapper scripts must not retain topic-selection node sequencing, prompt construction, model-mode branching, guardrail decisions, evidence assignment, persistence semantics, hash semantics, or replay/cache semantics.
- Migration is incomplete until repository checks and wrapper tests prove the old scripts cannot execute a separate workflow path.
- Existing API and persistence contracts remain backward compatible.
- No hidden chain-of-thought or non-auditable LLM reasoning is persisted.
