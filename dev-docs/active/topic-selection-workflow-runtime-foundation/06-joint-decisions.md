# 06 Joint Decisions

## Purpose
- This file is the joint boundary decision log for T-088 and T-089.
- T-088 owns runtime primitives and implementation.
- T-089 owns node-by-node workflow classification and debate eligibility.
- Decisions here should be referenced rather than duplicated across both packages.

## D-01 WorkflowNode And Agent Relationship
- Status: locked
- Date: 2026-05-19

### Decision
- `WorkflowNode` is the primary workflow unit.
- `Agent`, `multi_agent_debate`, `codex_assisted`, `human_review`, and deterministic service calls are executor choices inside a node.
- Debate is not a separate workflow spine.

### Locked Model
```text
WorkflowRun
  -> WorkflowNode
      -> deterministic service call
      -> single-agent LLM call
      -> codex-assisted structured response
      -> future multi-agent debate
      -> human review checkpoint
```

### Required Node Fields
- `node_id`
- `node_kind`
- `stage`
- `authority_scope`
- `input_refs`
- `output_refs`
- `execution_mode`
- `executor_kind`
- `status`
- `blocking_reasons`
- `audit_refs`

### Rationale
- v1a/v1b/v1c are already tested and reasoned about as business nodes.
- The same business node may run through mocked LLM, provider LLM, Codex-assisted response, or future debate without becoming a different workflow step.
- Top-level agent-based orchestration would make trace, audit, and acceptance assertions drift away from authority-object boundaries.

## D-02 WorkflowHarness Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- `WorkflowHarness` is the scenario runner and acceptance shell.
- It sequences nodes, injects execution mode, records trace, runs assertions, and emits artifacts.
- It does not own business decisions, write authority objects directly, call provider APIs directly, or decide debate eligibility.

### Responsible For
- Scenario management such as `v1b-product-e2e`, `real-e2e-canary`, and `scale-quality-gate`.
- Fixture and real-data setup: mock resources, real topic scope, sample size, seed, and topic id.
- Node order orchestration across v1a, v1b, v1c, bridge, and downstream recheck scenarios.
- Execution mode injection: `mocked_llm`, `codex_assisted`, and `provider_llm`.
- Unified trace with input refs, output refs, status, duration, warnings, blockers, and audit refs.
- Acceptance assertions such as role counts, sample hash, accepted-risk carry, non-advance stop, and bridge idempotency.
- Artifact output that supports reproduction without storing hidden reasoning.

### Not Responsible For
- Reimplementing v1a/v1b/v1c domain services.
- Direct authority-object writes outside existing domain service boundaries.
- Direct provider calls outside `AgentOrchestrator` or the existing LLM gateway boundary.
- Deciding which nodes use debate; that belongs to T-089.
- Acting as an online scheduler. It may share runtime primitives, but the harness itself is for acceptance, rehearsal, and controlled runs.

### Runtime Layering
```text
WorkflowRuntimeCore
  reusable node execution, trace, audit, and mode injection

WorkflowHarness
  scenario runner, fixtures, assertions, and artifacts for tests/acceptance
```

### Rationale
- This keeps product runtime primitives separate from test-script concerns.
- Current real-flow scripts should migrate into harness scenarios instead of expanding as parallel orchestration code.

## D-03 AgentOrchestrator Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- `AgentOrchestrator` is the model/executor invocation boundary inside a `WorkflowNode`.
- It receives a fully built invocation payload from `WorkflowRuntimeCore` or a concrete `WorkflowNodeExecutor`.
- It validates structured output, applies retry/escalation policy, records invocation audit, and returns normalized execution results.
- It is not a workflow engine, not a domain service, and not a business-context resolver.

### Data Ownership Boundary
```text
Domain data resolution: WorkflowNodeExecutor owns it
Model execution: AgentOrchestrator owns it
Authority persistence: Domain service owns it
Audit persistence: AgentOrchestrator / runtime owns it
```

### Meaning Of "Receives"
- `AgentOrchestrator` receives an invocation payload assembled by the caller.
- The payload includes input refs, context packet, prompt/profile/schema refs, output schema, deterministic guardrail refs, execution mode, and executor kind.
- `AgentOrchestrator` may resolve prompt/profile/policy configuration from SSOT, registry, or cache, but every resolved value must be versioned or ref-backed.
- `AgentOrchestrator` may read mock/replay fixtures only in explicit `mocked_llm` or replay scenarios.

### Not Allowed
- Do not directly read business DB tables to assemble topic-selection context.
- Do not query or reinterpret title-card, sample set, value assessment, bridge, or downstream feedback domain objects.
- Do not treat cache as a business fact source.
- Do not silently reuse historical LLM responses as provider execution.
- Do not write authority objects or bypass deterministic guardrails.
- Do not replace `BackendLlmGateway`; provider API calls still route through the gateway boundary.

### Responsible For
- Routing execution to `mocked_llm`, `codex_assisted`, `provider_llm`, or a future executor adapter.
- Schema validation of structured output.
- Retry, escalation, and blocked decisions via profile escalation policy.
- Invocation audit with profile, model, prompt id, schema id, validation result, retry/escalation reason, telemetry summary, and artifact refs.
- Returning normalized result status, structured output, warnings, blockers, and audit refs to the node executor.

### Rationale
- Keeping domain context assembly outside `AgentOrchestrator` prevents a second business-read path from drifting away from existing domain services.
- This makes model execution replaceable and auditable without duplicating topic-selection authority logic.
- Future multi-agent debate can be attached as an executor adapter without changing the top-level workflow spine.

## D-04 Execution Mode Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- `execution_mode` identifies the source of model-like execution for a node.
- `execution_mode` is separate from `executor_kind`.
- `mocked_llm` is test/acceptance-only and must never be mixed with product runtime decisions.

### Vocabulary
```text
executor_kind:
  deterministic
  single_agent
  multi_agent_debate
  human_review
  codex_assisted

execution_mode:
  mocked_llm
  codex_assisted
  provider_llm
```

### mocked_llm
- Purpose: unit tests, integration tests, CI regression, deterministic replay, local acceptance, and real-data-but-mocked-LLM canary runs.
- Source: deterministic fixture, replay fixture, or deterministic mock.
- It may execute product code paths for verification, but its outputs are acceptance artifacts, not product intelligence results.
- It must require explicit opt-in.
- It must record fixture id, fixture hash, mock profile, schema version, `source_kind`, and `non_provider=true`.
- It must not be used for product online runtime, user real workflow automation, or provider outage fallback.
- It must not generate authority artifacts that can be mistaken for real LLM decisions.

### provider_llm
- Purpose: real provider behavior validation, real-flow rehearsals, quality gates, and product runtime execution when enabled.
- Source: real provider calls through `BackendLlmGateway`.
- It must record provider, model, profile, prompt id/version, schema id/version, telemetry summary, retry/escalation, and validation result.
- It must not use historical response cache as a silent substitute for provider execution.

### codex_assisted
- Purpose: local/operator acceptance and design rehearsal when direct provider execution is unavailable, expensive, or intentionally avoided.
- Source: a structured prompt packet produced by the harness/runtime and a structured response supplied by Codex or an operator.
- It must record prompt packet hash, response hash, operator/source label, validation result, and audit label.
- It is not product runtime automation and must not silently replace provider execution.

### Database Separation
- Test and CI `mocked_llm` runs should use isolated test databases or disposable schemas.
- Local acceptance `mocked_llm` runs that touch a persistent developer DB must be explicitly marked as `run_mode=acceptance`, `execution_mode=mocked_llm`, and `non_provider=true`.
- Product runtime stores must reject or quarantine `mocked_llm` writes unless an explicit acceptance/test runtime flag is enabled.
- Any persisted object produced through a non-provider mode must be traceable through workflow/audit refs.
- Provider-backed decisions and mocked acceptance decisions must be query-distinguishable without reading free-text notes.

### Shared Constraints Across Modes
- All modes use the same `context_packet`, output schema, schema validation, and deterministic guardrails for a given node plan.
- `WorkflowRun` may define a default execution mode; individual nodes may override it only when the node plan declares `allowed_execution_modes`.
- Authority persistence still belongs to domain services and can happen only after schema validation and deterministic guardrails pass.
- `execution_mode` must appear in trace and audit records.

### Rationale
- Separating mode from executor keeps one workflow shape while making execution provenance explicit.
- Treating `mocked_llm` as test-only prevents fixture outputs from contaminating real decision history.
- Database separation and audit labels make it possible to run high-fidelity acceptance flows without confusing them with provider-backed decisions.

## D-05 Profile Escalation Policy Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- `profile_escalation_policy` is a deterministic runtime policy.
- It decides retry, profile escalation, block, or human review for a node attempt.
- It does not change workflow nodes, switch executor kind, or silently cross execution modes.

### Allowed Decisions
```text
retry_same_profile
escalate_profile
block
require_human_review
```

### No Silent Cross-Mode Escalation
- `mocked_llm` must not automatically escalate to `provider_llm`.
- `codex_assisted` must not automatically escalate to `provider_llm`.
- `provider_llm` may escalate from a weaker profile to a stronger profile only within the node plan's `allowed_profiles`.
- Moving from mock/Codex-assisted execution to provider execution requires an explicit new run or explicit node attempt planned by the harness/runtime.

### Debate Is Not Profile Escalation
- Moving from `single_agent` to `multi_agent_debate` changes `executor_kind`.
- Debate eligibility and debate workflow design belong to T-089 node classification.
- D-05 only covers profile, model, prompt, and runtime-strength escalation within the selected executor boundary.

### Deterministic Inputs
- schema validation result
- malformed output count
- retry count
- deterministic guardrail result
- confidence or uncertainty score
- risk severity
- provider timeout, rate-limit, or error class
- node risk class
- cost or budget ceiling
- allowed profile list

### Auditable Outputs
- decision
- `from_profile`
- `to_profile`
- trigger codes
- attempt number
- previous error class
- validation summary
- telemetry summary
- blocked reason or human-review reason

### Failure Rules
- After max attempts, the policy must return `block` or `require_human_review`.
- It must not downgrade to keyword heuristics.
- It must not silently use cached responses.
- It must not bypass deterministic guardrails.

### Rationale
- Escalation must improve model execution quality without changing workflow semantics.
- Keeping mode changes and executor changes outside profile escalation prevents accidental mock/provider mixing and prevents debate from becoming an implicit fallback path.

## D-06 Trace, Audit, And Persistence Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- D-06 aligns with the existing topic-selection control-plane rather than replacing it.
- Future `WorkflowRuntime` persistence must store run/node/attempt summaries, audit refs, artifact refs, and authority refs.
- Large context packets, prompt packets, and full structured model outputs should be stored as redacted artifacts with hashes, not as unbounded DB payloads.
- Domain authority objects remain owned and persisted by domain services.

### Existing Control-Plane Alignment
- Existing compatible primitives:
  - `TopicSelectionInputSnapshot`
  - `TopicSelectionArtifactRef`
  - `TopicSelectionLlmWorkflowRun`
  - `TopicSelectionQualitySignal`
  - `TopicSelectionReadinessGateResult`
  - `TopicSelectionChainTransitionAttempt`
  - `TopicSelectionFunctionalLineageLink`
  - `TopicSelectionTraceSnapshot`
- T-088 should reuse or extend these concepts instead of creating a parallel trace/audit spine.

### Trace Boundary
- Trace is workflow observability, not business authority.
- Trace records run, node, and attempt status, refs, duration, warnings, blockers, mode, executor, and audit/artifact refs.
- Trace must not duplicate full domain objects.
- `TraceSnapshot.payload` may carry execution diagnostics, but not full authority-object copies.

### Audit Boundary
- Audit is evidence for model invocation, deterministic guardrails, and escalation decisions.
- Audit should be append-only.
- Audit records should include profile/model/prompt/schema refs, validation summaries, guardrail trigger codes, escalation decisions, telemetry summaries, and artifact refs.
- Hidden reasoning, provider secrets, raw API keys, and unredacted provider logs must not be persisted.

### DB Boundary
- DB stores queryable summaries and refs: run id, node id, attempt id, status, execution mode, executor kind, profile, hashes, audit refs, artifact refs, and authority refs.
- DB records must make `mocked_llm`, `codex_assisted`, and `provider_llm` query-distinguishable.
- Inline JSON payloads are allowed only for small, redacted summaries.
- Large context/prompt/output payloads must use artifact refs with checksum/hash and schema version.

### Artifact Boundary
- Artifacts may store context packets, prompt packets, structured outputs, validation reports, and acceptance snapshots.
- Artifacts must include checksum/hash, schema version, redaction policy, and storage kind.
- Literature full text or large source content should be referenced by ref/hash unless an artifact is explicitly an acceptance snapshot.
- Artifacts are not authority objects.

### Authority Persistence Boundary
- Domain services persist authority objects such as `SampleSet`, `ValueAssessment`, `PromotionGate`, `Bridge`, and downstream feedback records.
- Workflow runtime can reference authority objects but must not bypass domain service APIs to write them.
- Trace/audit records cannot become business truth when they disagree with domain authority records.

### Failure Records
- Failed and negative outcomes must be recorded as first-class trace/audit states.
- Examples: `blocked`, `schema_invalid`, `guardrail_failed`, `max_attempts_exceeded`, `provider_error`, and `human_review_required`.
- Failures must not exist only in console logs.

### Compatibility Gaps And Handling
- Current `TopicSelectionResourceSamplingAudit.llmStructuredOutput` stores structured output in DB.
  - Handling: keep for compatibility; future runtime should store only small redacted summaries in DB and move full prompt/context/LLM output to artifact refs.
  - T-088 should record this as a migration/enhancement candidate rather than breaking T-079.
- Current `TopicSelectionLlmWorkflowRun` lacks explicit `execution_mode`, `executor_kind`, and `non_provider`.
  - Handling: T-088 should add or wrap runtime records so mode/executor/provenance are queryable without reading free-text notes.
- Current `TopicSelectionArtifactRef.payload` allows inline JSON.
  - Handling: inline payload remains valid for small redacted summaries; large payloads must use `uri + checksum`.
- Current `TopicSelectionTraceSnapshot.payload` allows arbitrary JSON.
  - Handling: trace payload must be constrained by convention/schema to execution diagnostics and must not copy full authority objects.

### Rationale
- The repo already has a topic-selection control-plane; D-06 tightens future runtime persistence rather than introducing a second one.
- Compatibility avoids invalidating completed T-079 behavior while giving T-088 clear cleanup targets.
- DB summaries plus artifact refs keep queryability, reproducibility, and storage hygiene balanced.

## D-07 Multi-Agent Debate Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- `multi_agent_debate` is a bounded `executor_kind` for explicitly approved high-conflict nodes.
- It is not a workflow spine, not profile escalation, and not a default fallback.
- It produces auditable structured recommendations, blocker summaries, or unresolved results, never direct authority writes.
- Debate output caching, retention, artifact granularity, and per-node persistence policy are owned by T-089.

### Runtime Position
```text
WorkflowNode
  executor_kind = multi_agent_debate
  execution_mode = provider_llm | codex_assisted
```
- `mocked_llm` can test debate fixtures but cannot represent a real debate decision.
- Product runtime debate must be provider-backed unless explicitly designed as human/operator assisted workflow.
- Codex-assisted debate is valid for local rehearsal and acceptance, but must not be labeled as provider-backed execution.

### Required Node-Level Contract
- roles
- role objectives
- allowed context packet
- turn limit
- arbiter or deterministic resolution rule
- output schema
- blocker rule
- audit and artifact expectations
- allowed profiles/models
- max cost and latency boundary

### Eligible Debate Triggers
- evidence polarity conflict
- support/challenge role ambiguity
- novelty vs feasibility tension
- accepted risk vs promotion readiness
- downstream feedback disagreement
- high-impact blocker classification

### Bounded Execution Rules
- Debate must have bounded turns.
- Debate must have a final arbiter or deterministic resolution rule.
- Debate output must resolve to `decision`, `unresolved`, `require_human_review`, or `blocked`.
- `unresolved` must not auto-pass.

### Persistence Boundary
- D-07 defines only the shared runtime boundary.
- T-089 decides, node by node:
  - which debate outputs become DB summaries;
  - which outputs become artifacts;
  - whether debate result cache is allowed;
  - cache key shape;
  - whether cached results are replay-only or operator-approved reuse;
  - role output retention granularity;
  - arbiter summary retention;
  - unresolved/human-review retention;
  - whether any transcript-like structured excerpt is allowed.
- T-088 may implement generic artifact/cache primitives only after T-089 specifies node-level policy.

### Artifact Boundary
- Debate artifacts may store structured role outputs, arbiter summary, trigger codes, final result, validation report, and per-role model/profile/prompt/schema refs.
- Hidden reasoning must not be persisted.
- Long free-form dialogue must not become an authority artifact.

### Rationale
- Debate is useful only where conflict materially changes a topic-selection decision.
- Keeping cache and persistence choices in T-089 prevents T-088 from building a generic debate cache that does not match node-level risk and retention needs.

## D-08 Codex-Assisted Execution Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- This project is personal and local-first, not an online commercial runtime.
- `codex_assisted` is an explicit local operator-assisted execution mode and may be the default low-cost mode.
- Codex can replace most single-agent provider calls when the node allows it.
- Codex can replace one or more specific roles inside a multi-agent debate when the debate node policy allows it.
- Codex-assisted execution must remain provenance-distinguishable from provider-backed execution.

### Local Setting
- Add a local setting comparable to the literature-management provider settings:
  - `preferred_agent_execution_mode = codex_assisted | provider_llm`
  - default: `codex_assisted`
- A workflow run or node plan may override the default.
- Provider-quality acceptance or real-provider behavior tests may require `provider_llm`.

### Single-Agent Nodes
- Most `single_agent` nodes may run with `execution_mode=codex_assisted`.
- The runtime/harness must generate a standard prompt packet.
- Codex or the operator must return a standard response packet.
- Free-form chat output must not flow directly into persistence.

### Multi-Agent Debate Roles
- Codex may execute a specific debate role such as reviewer, skeptic, evidence auditor, or arbiter when allowed by the node-level debate policy.
- Each debate role must record its own execution provenance:
```text
role=skeptic, execution_mode=codex_assisted
role=advocate, execution_mode=provider_llm
```
- T-089 decides whether Codex can execute one role, multiple roles, or no roles for each approved debate node.
- Codex executing all debate roles should not be the default because it may collapse debate diversity into one viewpoint.

### Required Prompt Packet
- `node_id`
- `node_kind`
- `run_id`
- `attempt_id`
- context packet hash
- allowed refs
- output schema ref/version
- guardrail notes
- expected response envelope
- execution provenance labels

### Required Response Packet
- structured output
- operator/source label
- response hash
- validation result
- optional reviewer note
- audit ref

### Persistence And Provenance
- Codex-assisted results may drive local product workflows.
- Persisted records must make provenance queryable:
  - `execution_mode=codex_assisted`
  - `non_provider=true`
  - `operator_assisted=true`
  - prompt packet hash
  - response packet hash
  - role provenance when debate is involved
- Codex-assisted output must not be labeled as provider-backed execution.

### Non-Negotiable Constraints
- Do not bypass schema validation.
- Do not bypass deterministic guardrails.
- Do not persist hidden reasoning.
- Do not let Codex write authority objects directly.
- Domain services remain the authority persistence boundary.
- Human-confirmed authority still requires a human decision record when the node contract requires human review.

### Rationale
- Codex as the default local execution mode controls cost while preserving one workflow shape.
- Explicit provenance prevents later confusion between Codex-assisted local decisions and provider-backed model decisions.
- Standard prompt/response packets keep Codex-assisted execution compatible with the same validation, audit, and trace model as provider execution.

## D-09 Existing Runner Migration And Semantic Drift Closure
- Status: locked
- Date: 2026-05-19

### Decision
- The runtime upgrade must not leave a second authoritative workflow path.
- Existing topic-selection real-flow, E2E, quality-gate, and provider-stability scripts may remain only as backward-compatible CLI wrappers after migration.
- Workflow semantics must live in one place: `WorkflowNode` contracts, `WorkflowScenario` definitions, `WorkflowHarness`, `AgentOrchestrator`, profile-escalation policy, and domain services.
- No script, fixture, or acceptance helper may retain separate business sequencing, model-routing, evidence-assignment, guardrail, persistence, or hash semantics after the migration is complete.

### Wrapper-Only Rule
Legacy CLI entrypoints may keep:
- command name compatibility;
- CLI/env parsing;
- scenario id selection;
- artifact root selection;
- exit-code mapping;
- human-readable console summaries.

Legacy CLI entrypoints must not keep:
- inline topic-selection node sequencing;
- direct calls to topic-selection business services except through the harness scenario runner;
- prompt construction outside the standard prompt packet;
- independent `mocked_llm`, `codex_assisted`, or `provider_llm` branching;
- independent guardrail or readiness decisions;
- independent evidence basket assignment rules;
- independent sample/title/value/promotion/bridge persistence rules;
- independent hash, cache, or replay semantics.

### Scenario Registry
The existing flows should be migrated into explicit scenario ids, including:
- `topic-selection.real-e2e.canary.v1`
- `topic-selection.real-e2e.scale-quality.v1`
- `topic-selection.v1b.non-advance-negative.v1`
- `topic-selection.provider-stability.v1`

Additional debate scenarios may be added by T-089 after node-level debate policy is locked, but they must use the same registry and harness.

### Migration Completion Criteria
The migration is not considered complete until:
- every pre-existing topic-selection E2E or real-flow command maps to a `WorkflowScenario`;
- old and new paths have run at least one parity canary against the same fixtures or real sample set;
- the legacy implementation path is deleted or reduced to wrapper-only code;
- a repository search shows no remaining script-owned topic-selection sequencing, prompt construction, provider/mock branching, guardrail decisions, evidence assignment, or persistence semantics;
- new tests assert that CLI wrappers call the harness scenario runner instead of business services directly;
- acceptance artifacts use the harness artifact convention, with historical `.ai/.tmp` artifacts retained only as historical evidence.

### Semantic Drift Controls
- Scenario inputs, node contracts, output schemas, reason codes, and artifact refs must be versioned.
- Mocked, Codex-assisted, and provider-backed executions must share the same node contracts and validators.
- Fixture meaning must be centralized; a mock fixture cannot redefine product semantics.
- Historical artifact format adapters, if needed, must be one-way readers and must not become an alternate writer path.
- Any new topic-selection E2E, real-flow, or debate acceptance test must be added as a `WorkflowScenario`, not as a new standalone runner.

### Ownership
- T-088 owns runtime migration, harness scenario registry, wrapper conversion, and drift checks.
- T-089 owns future debate scenarios and node-level debate policies, but must register them through the same harness path.

### Rationale
- This closes the main dual-track risk: test scripts proving behavior that the product runtime does not actually use.
- Keeping legacy commands as wrappers preserves developer ergonomics without preserving duplicate semantics.
- A single scenario registry lets ordinary agent workflows, Codex-assisted runs, provider runs, and future debate runs share one acceptance shape.

## D-10 T-089 Workflow Matrix As Semantic Entry
- Status: locked
- Date: 2026-05-19

### Decision
- T-089 must produce a node-by-node workflow matrix, not a primarily narrative workflow proposal.
- Every ordinary agent, multi-agent debate, Codex-assisted, provider-backed, deterministic, or human-review decision must bind to a concrete `node_id`.
- Free-floating descriptions such as "add debate to value assessment" or "let Codex handle most agent nodes" are not accepted unless they are represented as matrix fields on specific nodes.
- The workflow matrix is the semantic entry for later implementation and test planning; prose can explain rationale, but cannot define separate behavior outside the matrix.

### Required Matrix Fields
Each matrix row must include at least:
- `node_id`
- `stage`
- `authority_object`
- `executor_kind`
- `default_execution_mode`
- `codex_allowed`
- `provider_required`
- `debate_allowed`
- `human_review_required`
- `input_refs`
- `output_refs`
- `blocking_conditions`
- `deterministic_validators`
- `audit_refs`
- `artifact_refs`
- `covered_scenarios`

### Binding Rules
- `executor_kind` must use the shared values from D-04.
- `default_execution_mode` must use the shared values from D-04, or D-12 `none` for non-model nodes.
- Debate decisions must reference D-07 fields and any T-089 node-level debate policy.
- Codex decisions must reference D-08 prompt/response packet and provenance constraints.
- Scenario coverage must reference D-09 `WorkflowScenario` ids rather than standalone scripts.
- A node can be marked as debate-rejected, but the rejection reason must be recorded in the matrix or an adjacent node policy section.

### Drift Controls
- Later implementation tasks must cite matrix rows when changing runtime, service, prompt, route, persistence, or tests.
- If implementation needs a field not present in the matrix, update the matrix first instead of encoding hidden semantics in code.
- Runtime defaults must not infer missing matrix decisions.
- Tests should assert matrix-driven behavior for non-deterministic nodes once the runtime exists.

### Ownership
- T-089 owns the matrix content and node-level workflow decisions.
- T-088 owns runtime primitives that consume those decisions.

### Rationale
- A matrix makes ambiguous workflow claims reviewable and testable.
- Binding decisions to `node_id` prevents ordinary agent workflow, Codex-assisted execution, debate, and provider execution from drifting into parallel interpretations.

## D-11 Canonical Node Granularity And Harness Alignment
- Status: locked
- Date: 2026-05-19

### Decision
- `WorkflowNode` granularity is defined as an authority-producing or authority-gating product decision.
- Nodes must match what `WorkflowHarness` can sequence, trace, assert, and replay through `WorkflowScenario` definitions.
- Nodes are not code functions, validators, guardrails, LLM attempts, artifact writes, hash calculations, or low-level repository operations.
- Node-internal steps may be audited and artifacted, but they must not become separate workflow nodes unless they create or gate a cross-step authority boundary.

### Harness Alignment
- `WorkflowHarness` sequences canonical nodes through scenarios.
- `AgentOrchestrator` is invoked only inside nodes that require model-like execution.
- Deterministic validators, profile escalation attempts, LLM/Codex/provider calls, guardrail decisions, and hash generation remain node-internal execution details.
- Scenario selection may skip or stop nodes according to declared preconditions, but it must not redefine node semantics.

### Included Node Types
- Handoff/publish nodes are included when they create a formal cross-stage authority input, such as `publish-v1b-input-bundle` and `publish-v1c-input-bundle`.
- Human confirmation nodes are included as `human_review` workflow nodes; test scenarios may inject human decision fixtures.
- Downstream consumer nodes may be included where E2E acceptance crosses the topic-selection boundary, but T-089 must not rewrite downstream PaperProject semantics.

### Excluded As Standalone Nodes
- `WorkflowRun`, `ArtifactRef`, `TraceSnapshot`, `QualitySignal`, gate telemetry, and lineage records are not standalone nodes by default.
- They appear in matrix rows as `audit_refs`, `artifact_refs`, `deterministic_validators`, or control-plane refs.
- If one of these records later becomes an authority-producing product decision, the matrix must be updated before implementation.

### Canonical Node List
- `topic-selection.resource-sampling.create-sample-set.v1`
- `topic-selection.v1a.build-evidence-map.v1`
- `topic-selection.v1a.generate-need-candidate.v1`
- `topic-selection.v1a.validate-need-adjudication.v1`
- `topic-selection.v1a.human-confirm-need.v1`
- `topic-selection.v1a.publish-v1b-input-bundle.v1`
- `topic-selection.v1b.build-intake-constraint-profile.v1`
- `topic-selection.v1b.plan-research-slice.v1`
- `topic-selection.v1b.form-topic-question-contract.v1`
- `topic-selection.v1b.assess-topic-value.v1`
- `topic-selection.v1b.decide-value-disposition.v1`
- `topic-selection.v1b.create-topic-package-draft.v1`
- `topic-selection.v1b.assess-package-readiness.v1`
- `topic-selection.v1b.publish-v1c-input-bundle.v1`
- `topic-selection.v1c.create-promotion-input-snapshot.v1`
- `topic-selection.v1c.generate-promotion-support.v1`
- `topic-selection.v1c.run-promotion-gate.v1`
- `topic-selection.v1c.human-promotion-decision.v1`
- `topic-selection.v1c.create-paper-project-bridge.v1`
- `topic-selection.downstream.paper-project-intake.v1`
- `topic-selection.downstream.feedback-recheck.v1`

### Rationale
- This granularity is coarse enough to avoid implementation-detail drift and fine enough to support product-grade E2E assertions.
- It lets harness scenarios exercise the real flow without turning scripts into a second workflow runtime.
- It preserves human and downstream boundaries as explicit workflow nodes where acceptance depends on them.

## D-12 Default Executor And Execution Mode Classification
- Status: locked
- Date: 2026-05-19

### Decision
- T-089 uses a conservative initial classification for every D-11 node.
- Most model-like single-agent nodes default to `execution_mode=codex_assisted` to control local cost.
- Deterministic and human-review nodes use `default_execution_mode=none`.
- No node is provider-required by default in the initial matrix.
- Provider execution is required only by provider-quality scenarios or explicit user/runtime override.
- Initial debate eligibility is limited to four high-conflict nodes.

### `none` Execution Mode Sentinel
- `none` is allowed only in the workflow matrix for nodes that do not invoke model-like execution.
- `none` means `AgentOrchestrator` is not invoked for the node.
- `none` is not a fourth model execution mode and must not be used for model-like executor attempts.
- Trace records for `none` nodes should still record executor kind, node status, validators, audit refs, and authority refs.

### Default Classification Rules
- Resource sampling, need-candidate generation, need adjudication support, research-slice planning, topic-question formation, value assessment, and promotion support default to:
  - `executor_kind=single_agent`
  - `default_execution_mode=codex_assisted`
  - `codex_allowed=yes`
  - `provider_required=no`
- Evidence map build, handoff bundle publication, disposition materialization, package draft creation, readiness checks, promotion input snapshot, promotion gate, bridge creation, PaperProject intake, and downstream feedback/recheck routing default to:
  - `executor_kind=deterministic`
  - `default_execution_mode=none`
  - `codex_allowed=no`
  - `provider_required=no`
- Need confirmation and promotion authorization default to:
  - `executor_kind=human_review`
  - `default_execution_mode=none`
  - `human_review_required=yes`

### Debate Eligibility
Initial `debate_allowed=yes` is limited to:
- `topic-selection.resource-sampling.create-sample-set.v1`
- `topic-selection.v1a.generate-need-candidate.v1`
- `topic-selection.v1b.assess-topic-value.v1`
- `topic-selection.v1c.generate-promotion-support.v1`

`topic-selection.v1a.generate-need-candidate.v1` is debate-eligible because need discovery benefits from structured expansion and deep excavation before a new candidate is added to the existing `NeedCandidate` pool. `topic-selection.v1a.validate-need-adjudication.v1` is not debate-eligible in the initial matrix because it consumes one selected `NeedCandidate` plus sibling candidate-pool context, applies structured adjudication/routing, and retains human fallback for final need confirmation.

`topic-selection.v1c.run-promotion-gate.v1` stays deterministic. Debate may generate advisory promotion support, but the gate must remain a deterministic rule application over support, dossier, snapshot, blockers, and accepted-risk refs.

### Provider Policy
- The initial matrix does not force provider execution for any node.
- Provider-backed execution may still run through `provider_llm` when:
  - a provider-quality scenario requires it;
  - the user explicitly switches from local Codex-assisted execution;
  - a future node policy marks provider execution as required and updates the matrix first.
- Codex-assisted output and provider-backed output must remain provenance-distinguishable.

### Rationale
- `none` prevents deterministic/human nodes from being mislabeled as mock, Codex, or provider LLM executions.
- Codex-assisted defaults match the personal local-first cost model without creating a separate workflow shape.
- Keeping promotion gate deterministic prevents debate output from becoming hidden promotion authorization.

## D-13 Node Policy Contract
- Status: locked
- Date: 2026-05-19

### Decision
- Every D-11 node must have a node policy.
- The workflow matrix alone is not sufficient to implement or accept a node.
- Node policies are recorded in `dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`.
- `WorkflowHarness` must consume matrix rows plus node policies; scripts must not infer missing node behavior.
- A node cannot be promoted from design to implementation until its policy fields are filled enough to drive validation, execution, audit, and failure semantics.

### Required Policy Fields
Each node policy must define:
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

### Binding Rules
- Deterministic nodes must still have node policies; otherwise blocking rules drift into service code and tests.
- Debate eligibility in the matrix must be backed by a `debate_trigger_policy`.
- Codex and provider execution must be allowed by the node policy, not only by global defaults.
- Human-review nodes must specify how fixture-injected decisions differ from real human decisions.
- The policy must identify the domain service that owns authority writes.
- Policy fields can reference existing contracts, validators, and service methods, but cannot rely on undocumented script behavior.

### Stub Policy Rule
- T-089 may create stub policies before full review.
- Stub policies must be clearly marked and must not be treated as implementation-ready.
- Stub policies must still reserve all required D-13 fields so missing semantics are visible.

### Drift Controls
- If code, tests, prompts, provider routing, debate routing, or artifacts require a node behavior not present in the node policy, update the policy first.
- Harness scenarios must cite node policies when asserting non-deterministic behavior.
- `TBD-node-policy-detail` is allowed only during T-089 design alignment and must be removed before implementation work begins for that node.

### Rationale
- Node policies keep business blockers, validators, execution permissions, and failure semantics out of scripts.
- They make debate and Codex/provider decisions explicit enough to avoid later dual-track behavior.
- They give T-088 a concrete runtime contract without forcing T-089 to implement runtime primitives.

## D-14 Scenario Coverage Contract
- Status: locked
- Date: 2026-05-19

### Decision
- Every D-11 node must be covered by at least one `WorkflowScenario`.
- Scenario definitions are recorded in `dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`.
- The workflow matrix `covered_scenarios` column must reference scenario ids from the registry.
- Scenarios are acceptance orchestration only; they must not define business rules that are absent from the matrix or node policies.
- Scenario coverage is required before implementation tasks can claim end-to-end workflow acceptance.

### Scenario Registry Fields
Each scenario entry must define:
- `scenario_id`
- `status`
- `purpose`
- `scenario_type`
- `execution_modes`
- `covered_nodes`
- `fixtures_or_data_source`
- `assertion_scope`
- `artifact_expectations`
- `business_semantics_source`

### Initial Scenario Registry
- `topic-selection.real-e2e.canary.v1`
- `topic-selection.real-e2e.scale-quality.v1`
- `topic-selection.v1b.non-advance-negative.v1`
- `topic-selection.provider-stability.v1`
- `topic-selection.downstream.feedback-recheck.v1`
- `topic-selection.debate.resource-sampling-polarity.v1`
- `topic-selection.debate.v1a-need-discovery.v1`
- `topic-selection.debate.v1b-value-tension.v1`
- `topic-selection.debate.v1c-promotion-support-risk.v1`

### Binding Rules
- `WorkflowScenario` must reference existing matrix rows and node policies.
- Provider scenarios may force `execution_mode=provider_llm` for the scenario run, but they must not change `provider_required` in the matrix.
- Mocked, Codex-assisted, and provider-backed scenarios must share the same node contracts, validators, and authority-write boundaries.
- Debate scenarios are allowed only for nodes with `debate_allowed=yes`.
- Negative scenarios must assert where the workflow stops and which downstream authority objects must remain absent.
- Historical scripts may be migrated into scenarios, but scenario definitions must not preserve script-owned business semantics.

### Coverage Rules
- A full-chain scenario can cover multiple nodes, but each node must still list the scenario id in the matrix.
- Debate scenario ids should be listed only on the debate-eligible nodes they exercise.
- Provider-stability coverage should be listed on model-like nodes, not deterministic nodes that do not call model-like executors.
- Downstream feedback/recheck coverage should be explicit rather than implied by PaperProject intake coverage.

### Drift Controls
- Adding a new E2E, real-flow, provider, mock, Codex, debate, or negative acceptance path requires a new registry entry or an update to an existing entry.
- If a scenario needs a business decision not covered by node policy, update the node policy first.
- `TBD-scenario` must not remain in the matrix after D-14.

### Rationale
- Scenario registry coverage closes the last known path for acceptance scripts to become a second semantic runtime.
- Separating scenario orchestration from node policy keeps tests useful without letting tests define product behavior.
- Explicit coverage makes it clear which nodes are covered by happy path, negative, provider, downstream, and debate acceptance.

## D-15 Node Policy Detail Fill Order
- Status: locked
- Date: 2026-05-19

### Decision
- Node policy details must be filled in a fixed order.
- The order is: common policy vocabulary, high-risk debate-eligible nodes, remaining single-agent nodes, then deterministic/human/downstream spine.
- No implementation task should start for a node while its policy still contains `TBD-node-policy-detail`.
- The fill order is recorded in `dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`.

### Phase 0 - Common Policy Vocabulary
Define shared policy terms before filling individual nodes:
- `policy_status`
- `TBD-node-policy-detail`
- `not_allowed`
- `not_applicable`
- `none`
- `blocked`
- `require_human_review`
- `fixture_human_decision`
- `allowed_execution_modes`
- `authority_write_boundary`
- `profile_escalation_policy_ref`
- `debate_trigger_policy`
- `failure_semantics`

### Phase 1 - High-Risk Debate-Eligible Nodes
Fill these first:
- `topic-selection.resource-sampling.create-sample-set.v1`
- `topic-selection.v1a.generate-need-candidate.v1`
- `topic-selection.v1b.assess-topic-value.v1`
- `topic-selection.v1c.generate-promotion-support.v1`

These nodes must define debate triggers, Codex/provider/mocked boundaries, audit artifacts, failure semantics, and authority-write boundaries before any debate implementation.

### Phase 2 - Remaining Single-Agent Nodes
Fill these after debate-eligible nodes:
- `topic-selection.v1a.validate-need-adjudication.v1`
- `topic-selection.v1b.plan-research-slice.v1`
- `topic-selection.v1b.form-topic-question-contract.v1`

These nodes must define prompt/response packet expectations, deterministic validators, allowed execution modes, profile escalation, and authority-write boundaries.

### Phase 3 - Deterministic, Human, And Downstream Spine
Fill the remaining nodes in topological workflow order:
- deterministic handoff and readiness nodes;
- human confirmation and promotion decision nodes;
- bridge and downstream PaperProject/feedback nodes.

These nodes must focus on preconditions, currentness, immutability, human fixture separation, authority-write ownership, and absence assertions for blocked paths.

### Drift Controls
- Filling an easy deterministic node first must not create conventions that conflict with the high-risk debate nodes.
- If a later node requires a new shared policy term, update the common vocabulary first.
- `policy_status=implementation_ready` is allowed only when all D-13 fields are concrete and scenario assertions can reference them.
- Runtime and harness implementation must cite policy sections, not informal discussion notes.

### Rationale
- The highest semantic-risk nodes are the debate-eligible nodes, so they should shape the policy detail language.
- A fixed order prevents low-risk deterministic nodes from creating shallow policy conventions that fail when applied to agent/debate nodes.

## D-16 Resource Sampling Node Policy And Debate Loop
- Status: locked
- Date: 2026-05-19

### Decision
- `topic-selection.resource-sampling.create-sample-set.v1` is a `single_agent` node with deterministic guardrails and optional bounded multi-agent debate.
- The node produces `TopicSelectionResourceSampleSet`, `TopicSelectionResourceSampleItem`, and `TopicSelectionResourceSamplingAudit`.
- LLM, Codex, provider, mocked, or debate output is advisory classification input only.
- Final selected roles, selected set identity, warnings, sample hash, and authority writes are controlled by deterministic guardrails plus the role-balanced sampler.

### Resource Sampling Authority Semantics
- `ready`: sample set may enter v1a.
- `ready_with_warning`: sample set may enter v1a only with warnings carried through trace/audit.
- `blocked`: sample set must not enter v1a.
- Classifier failure must not silently fall back to keyword-only sampling.
- Hidden reasoning and provider secrets must not be persisted.

### Debate Role Model
- Default debate roles are intentionally coarse:
  - `arbiter`
  - `explorer`
  - `deep_critic`
- `grounding_auditor` is not a default role. Grounding checks belong first to deterministic guardrails, arbiter evidence checklist, schema validation, and final output validation.
- A future `evidence_auditor` role may be enabled only by explicit node policy update.
- Role multiplicity is allowed for worker roles:
  - `explorer`: `1..N`
  - `deep_critic`: `1..N`
  - `arbiter`: exactly `1`
- Multiple agents in the same role must be merged into a role-level summary before arbiter synthesis. Agent count must not become hidden voting weight.

### Arbiter Responsibilities
- Arbiter is the debate loop controller, not only a final judge.
- Arbiter must:
  - frame the discussion issue from trigger conditions;
  - decide which role acts next and what question it should answer;
  - route a critic-discovered risk back to explorer when expansion is useful;
  - route an explorer-discovered value point back to deep critic when pressure testing is useful;
  - decide which points are useful, speculative, rejected, unresolved, or guardrail-bound;
  - emit the only external structured debate output.
- Arbiter output is consumed by orchestrator/domain service. Arbiter must not directly write DB authority objects.

### Internal Iterative Loop
- Debate is an arbiter-led internal loop inside one workflow node attempt.
- It is not a one-shot fan-out and not a self-reactivating workflow.
- Default flow:
```text
arbiter opens issue
  -> explorer expands value / role / use possibilities
  -> arbiter reframes or routes
  -> deep_critic digs risks / counterpoints / failure modes
  -> arbiter judges, reframes, and optionally requests follow-up
  -> arbiter emits terminal structured output
```
- Internal turn decision may use `continue`.
- External terminal output must be one of:
  - `finalize`
  - `blocked`
  - `require_human_review`
- `continue` must not appear as final output.

### Loop Bounds
- `max_rounds`: default `2`, maximum `3`.
- `max_role_agent_failures`: `1` per role.
- `max_total_model_failures`: `2`.
- `max_wall_clock_ms`: node-policy-defined during implementation.
- All intermediate turns are debate artifacts only; they do not directly affect sample set persistence.

### Success Exit
Arbiter may emit `finalize` only when:
- the trigger issue has been addressed;
- explorer has expanded at least once;
- deep critic has pressure-tested at least once;
- arbiter identifies recommended classification impact, useful evidence points, rejected speculative points, unresolved points, guardrail hints, and confidence;
- final output passes schema validation;
- final output does not bypass deterministic guardrails.

Successful debate completion does not guarantee sample set `ready`; deterministic assembly may still produce `ready`, `ready_with_warning`, or `blocked`.

### Failure Exit
Arbiter must emit `blocked` when:
- max rounds are reached without a verifiable recommendation;
- required role output remains malformed after allowed retry/replacement;
- arbiter output remains malformed after retry;
- necessary evidence/source is missing;
- role conflict cannot be resolved and the candidate affects selected set identity or role targets;
- model failures prevent critical role output;
- high risk is found with no safe downgrade path;
- deterministic guardrails reject the final debate recommendation and no alternative candidate can fill the required role.

Failure records must include reason codes and artifacts. A failed debate can still lead to `ready_with_warning` if disputed candidates are excluded from selection and the sample remains usable; otherwise the sample set is `blocked`.

### Human Review Exit
Arbiter may emit `require_human_review` when:
- useful evidence exists but risk interpretation is insufficient;
- explorer and deep critic both produce strong incompatible judgments;
- the candidate materially affects selected set identity and source semantics need human judgment;
- debate discovers a scope boundary issue that may alter the topic definition;
- accepting the warning may change downstream v1a direction.

Human review marks the candidate `review` unless a later explicit human decision changes the node attempt. Human decisions must be provenance-labeled and must not be recorded as Codex or provider decisions.

### No Automatic Post-Exit Re-Entry
- Debate may iterate internally, but it must not self-reactivate after `finalize`, `blocked`, or `require_human_review`.
- Post-exit rerun is a new workflow/node attempt with new provenance, not a continuation of the same debate.
- A rerun requires an explicit changed input hash, policy version, execution mode, human instruction, bugfix/regression run, or scenario-controlled new run.
- The runtime must not restart debate automatically because arbiter is uncertain, sample hash changed, role target is underfilled, or a worker role found a new direction.

### Rationale
- The goal is to expand and deepen thinking at high-conflict sampling points while preserving local-first usability and replayability.
- Arbiter-led bounded iteration gives useful exploration without turning resource sampling into open-ended research discussion.
- Banning automatic post-exit re-entry prevents state-space explosion, semantic drift, provider instability amplification, cost surprises, and hard-to-replay acceptance behavior.

## D-17 V1A Need Discovery Debate And Existing Candidate Pool
- Status: locked
- Date: 2026-05-19

### Decision
- `topic-selection.v1a.generate-need-candidate.v1` is the v1a node where multi-agent debate may be used.
- `topic-selection.v1a.validate-need-adjudication.v1` is not debate-eligible in the initial matrix.
- The product emphasis is candidate discovery: produce one or more grounded `NeedCandidate` records and add them to the existing `NeedCandidate` pool before adjudication evaluates or routes any selected need.
- Debate is used to widen and deepen the candidate-generation process, not to perform final validation.
- Need adjudication consumes one selected `NeedCandidate`, sibling candidate-pool context, and support packet, then applies structured disposition/routing with deterministic validators and human fallback.

### Repo Compatibility Constraint
- Do not add a new `NeedCandidateSet` authority object, table, DTO, route, or persistence path.
- The repo already has `TopicSelectionNeedCandidate`, `POST /topic-selection/v1a/need-candidates`, and list-by-title-card projections.
- The candidate pool is a read model over existing `NeedCandidate` records, typically scoped by title card, evidence map, status, and freshness.
- Debate artifacts may contain explored alternatives, rejected framings, and merge/recheck hints, but those artifacts are not a second source of authority.

### Generate-Need-Candidate Semantics
- The node authority object type remains `NeedCandidate`.
- One successful node attempt may write multiple grounded `NeedCandidate` records through the existing need-validation service/repository boundary.
- Multi-candidate output is a bounded batch, not a new authority object.
- Initial policy target: persist `1..5` candidates per successful attempt; attempts requiring more than 5 persisted candidates must rerun with explicit policy/user instruction rather than silently expanding the batch.
- Each persisted candidate is an independent authority record with its own candidate version/hash and validation result.
- Candidate drafts that fail per-candidate gates must not be persisted. They are recorded as rejected framings with reason codes in the discovery artifact.
- A generate attempt may succeed when at least one candidate passes the gates. If no candidate passes, the node blocks instead of writing weak candidates.
- All candidates written by the same attempt should share workflow/audit refs so the discovery batch can be replayed without introducing a `NeedCandidateSet`.
- Written candidates naturally become part of the existing candidate pool; no separate set object is persisted.
- Debate may internally explore more framings than it persists. Non-persisted alternatives, rejected framings, merge hints, ranking notes, and discovery rationale remain audit/artifact content unless a later explicit candidate-generation attempt persists another `NeedCandidate`.
- Each persisted candidate must carry evidence refs, scope notes, non-goals, assumptions, uncertainty, gap codes, and source/search/evidence-map refs using existing `NeedCandidate` fields.
- The node may produce `recheck_suggestions` or `evidence_gaps`, but it must not create SearchPlan changes directly.
- The node must not create `ValidatedNeed`; human confirmation remains the authority boundary for validation.

### Debate Harness Guidance
- Debate for this node is an arbiter-led discovery loop using the D-16 role model:
  - `arbiter`
  - `explorer`
  - `deep_critic`
- The internal loop should guide the candidate-generation process through:
  1. evidence signal extraction;
  2. candidate framing expansion;
  3. candidate-pool comparison against existing sibling `NeedCandidate` records;
  4. candidate batch synthesis and ranking;
  5. grounded quality check.
- Explorer expands possible need framings, latent value points, scenario gaps, and alternative interpretations.
- Deep critic pressure-tests pseudo-gaps, prior-art conflicts, over-broad claims, weak evidence, and unsupported leaps.
- Arbiter controls discussion points, asks follow-up questions, selects useful findings, rejects speculation, synthesizes the candidate drafts, assigns batch order in the artifact, and emits the only external structured output.

### Agent Workflow Gate Order
The generate-need-candidate node must execute in this order:
1. compile deterministic context from evidence, resource, search, sibling candidate, memory, scope, and non-goal refs;
2. run single-agent or debate discovery to produce a ranked candidate draft batch;
3. run deterministic per-candidate gates before any authority write;
4. drop invalid drafts into rejected-framing artifacts with reason codes;
5. if `1..5` valid drafts remain, write the valid candidates through one authority-write attempt;
6. refresh or return candidate-pool projection refs after the authority write commits.

The ranked draft batch is a model/debate output and artifact, not an authority object. Deterministic gates own the decision about which drafts become `NeedCandidate` records.

### Authority Write Semantics
- The authority write should be all-or-none for the valid candidate batch after invalid drafts have already been filtered out.
- A transaction or equivalent repository/domain-service batch boundary should create all valid `NeedCandidate` records together, attach shared workflow/audit refs, and expose each persisted candidate ref.
- Existing single-candidate creation semantics remain the compatibility baseline; implementation may add a service-level batch wrapper, but it must not bypass the existing need-validation service/repository boundary.
- If the authority write fails after the valid batch is chosen, the node must not leave a partial batch. It records persistence conflict refs and can be retried as a new node attempt.

### Debate Triggers
Debate may run when:
- the evidence map supports multiple plausible need framings;
- the first-pass need statement is broad, shallow, or topic-like rather than a research need;
- support evidence suggests value but challenge evidence suggests pseudo-gap or prior-art risk;
- benchmark/comparison evidence implies an evaluation need rather than a method need;
- resource samples contain competing method families, domains, or problem framings;
- high-value evidence is present but scope, non-goals, and mechanism are underspecified.

Debate must not run when:
- required evidence map or source refs are missing;
- the task is only formatting or projection of an already accepted `NeedCandidate`;
- deterministic blockers already prevent candidate generation;
- the workflow is in a scenario that intentionally exercises the single-agent path.

### Adjudication Boundary
- `validate-need-adjudication` evaluates one selected `NeedCandidate` at a time with sibling candidate-pool context.
- It may return validate, return-to-candidate, request-searchplan-recheck, reject, park, or merge according to existing v1a semantics.
- It must not run debate in the initial matrix.
- Human confirmation remains the final authority for `ValidatedNeed`.
- If adjudication finds the selected candidate is too weak, it should route back to candidate generation, another sibling candidate, or recheck rather than inventing a better candidate.

### Scenario Impact
- Replace `topic-selection.debate.v1a-need-adjudication.v1` with `topic-selection.debate.v1a-need-discovery.v1`.
- Matrix `debate_allowed=yes` moves from `validate-need-adjudication` to `generate-need-candidate`.
- Scenario assertions must verify bounded grounded candidate creation, candidate-pool growth/projection, per-candidate validation, rejected alternative artifacts, no direct SearchPlan mutation, no new `NeedCandidateSet` authority, and absence of `ValidatedNeed` authority writes.

### Rationale
- Debate is most valuable before the system has committed to one candidate framing.
- Once candidates exist, adjudication is better modeled as structured routing over one selected candidate at a time plus human fallback; adding debate there would increase complexity without improving the main product risk.
- Reusing the existing `NeedCandidate` pool avoids a parallel set authority while still preventing downstream nodes from evaluating a single unexamined candidate as if it were the whole search space.

## D-18 Context Cache Memory And Compression Policy
- Status: locked
- Date: 2026-05-19

### Decision
- Agent workflow caching, context memory, and compression are allowed only when they preserve the authority boundaries from D-03, D-04, D-06, D-07, and D-17.
- Cache is an acceleration/replay mechanism, not a business fact source.
- Long-term memory must use structured business objects such as decision memory, risk, recheck, rejected/parked/merged candidate refs, and downstream feedback; it must not use implicit agent chat history as durable memory.
- Context for multi-agent/debate nodes must be split into two packet families:
  - `exploration_context`
  - `arbiter_context`
- Exact-invocation response cache is allowed as a local cost-saving mechanism, but it must be provenance-labeled and must not masquerade as live `provider_llm` execution.

### Cache Classes
- `context_packet_cache`: compiled input packets for a node/role. It may be reused only when input refs, input hash, compiler version, policy version, schema version, profile, execution mode, and context family match.
- `artifact_cache`: large summaries, role summaries, evidence digests, and redacted prompt/response packet refs. It is audit/replay support only.
- `response_reuse_cache`: exact-invocation model/Codex response reuse for replay or local cost saving. It is never authority by itself.
- `projection_cache`: read-only projections such as candidate-pool digests or evidence-bundle digests. It must be rebuildable from DB authority records and artifact refs.
- `durable_memory`: structured business memory objects. It may enter context as constraint, warning, or required challenge, but not as evidence.

### Response Reuse Policy
- Do not add a new `execution_mode` for cache reuse.
- A live provider call remains `execution_mode=provider_llm`.
- `provider_llm` must not silently use historical response cache in place of a provider call.
- Automatic exact-invocation reuse is allowed only in explicit replay/acceptance paths marked `execution_mode=mocked_llm`, `run_mode=acceptance|test`, and `non_provider=true`.
- Local personal cost-saving reuse is allowed under `execution_mode=codex_assisted` only when the response is explicitly operator-approved or locally configured as operator-approved reuse.
- Cached local reuse must record:
  - `response_source=cached_exact_invocation`
  - cache key
  - source workflow/node/attempt id
  - source execution mode
  - response hash
  - context packet hash
  - schema/profile/policy versions
  - operator approval or local setting ref
  - `non_provider=true`
- Provider-quality scenarios that require `provider_llm` must treat response cache hits as misses or block; they must not downgrade to cached reuse.
- Cached responses re-entering a workflow must still pass schema validation, deterministic gates, audit/artifact recording, and authority-write boundaries.

### Context Packet Families
All context packets must share this envelope:
- `node_id`
- `workflow_run_id`
- `node_attempt_id`
- `context_family`
- `input_refs`
- `input_refs_hash`
- `context_compiler_version`
- `policy_version`
- `output_schema_version`
- `profile_id`
- `execution_mode`
- `cache_key`
- `cache_hit`
- `redaction_policy`
- `created_at`

`exploration_context` is for explorer/deep-critic style work:
- purpose: widen candidate space, discover alternative framings, pressure-test pseudo-gaps, and surface recheck/merge hints;
- may include broader resource/evidence digests, neighboring problem framings, sibling candidate summaries, rejected/parked/merged candidate memories, and challenge prompts;
- may use wider compression with more recall and less finality;
- must remain ref-backed and versioned;
- must not authorize DB writes.

Minimum `exploration_context` payload:
- `topic_scope`
- `evidence_signal_digest`
- `resource_sample_digest`
- `search_coverage_digest`
- `sibling_candidate_digest`
- `decision_memory_digest`
- `exploration_prompts`
- `challenge_prompts`
- `allowed_outputs`
- `forbidden_outputs`

`arbiter_context` is for arbiter/resolution work:
- purpose: choose useful findings, reject speculation, produce ranked draft batches, route unresolved issues, and prepare gate-ready structured output;
- must include the node policy, output schema, deterministic guardrail checklist, authority-write boundary, source refs, role-level summaries, unresolved points, rejected-framing candidates, and candidate-pool digest;
- should not depend on raw multi-turn role transcripts unless referenced as artifacts;
- must be narrower, stricter, and more evidence-bound than `exploration_context`;
- must expose enough refs for deterministic gates to validate the final structured output.

Minimum `arbiter_context` payload:
- `node_policy_ref`
- `output_schema_ref`
- `authority_boundary`
- `max_persisted_candidates`
- `deterministic_gate_checklist`
- `role_level_summaries`
- `candidate_pool_digest`
- `evidence_ref_table`
- `rejected_framing_table`
- `unresolved_points`
- `batch_ranking_rules`
- `persistence_rules`
- `failure_rules`

### Durable Memory Admission Rules
Long-term memory may enter context only in these forms:
- rejected `NeedCandidate`: constraint or warning;
- parked `NeedCandidate`: caution or revisit condition;
- merged `NeedCandidate`: duplicate or merge hint;
- prior-art conflict: required challenge;
- pseudo-gap failure: blocker candidate;
- search coverage gap: recheck hint;
- accepted risk: risk carry-forward;
- downstream feedback: challenge or recheck trigger.

Memory must not be represented as evidence. Any memory item included in a context packet must identify its source authority ref, memory type, admission role, source hash, and summary hash.

### Compression Rules
- Every compression layer must record source refs, compiler version, input hash, summary hash, created_at, and redaction policy.
- Compression must preserve traceability from prompt packet to DB authority refs and artifact refs.
- Summaries may remove verbosity but must not remove blocker facts, risk flags, unresolved challenge refs, source-health warnings, or decision-memory constraints.
- A stale summary must miss cache when any source ref, source hash, policy version, schema version, compiler version, role context family, or execution profile changes.
- Raw provider logs, hidden reasoning, credentials, and unredacted secrets must not be persisted.

Recommended compression layers:
1. raw authority/artifact refs;
2. evidence/resource digest;
3. candidate/memory digest;
4. role-level summaries;
5. `arbiter_context`.

Default context size policy for v1a need discovery:
- `exploration_context` should favor recall and may carry 20-30 evidence/resource signals when refs justify them.
- `arbiter_context` should favor decision readiness and should carry at most 5 candidate drafts plus 3-5 key evidence refs per draft unless a future node policy version changes the limit.
- Role raw outputs remain artifact-only.
- Role-level summaries may enter `arbiter_context`.

### Context Cache Key
Context packet cache keys must include:
- `node_id`
- `context_family`
- `input_refs_hash`
- `policy_version`
- `context_compiler_version`
- `schema_version`
- `profile_id`
- `execution_mode`
- `memory_digest_hash`
- `candidate_pool_hash`

`exploration_context` cache hits must not satisfy `arbiter_context` requests, and `arbiter_context` cache hits must not satisfy `exploration_context` requests.

### Generate-Need-Candidate Application
- `topic-selection.v1a.generate-need-candidate.v1` must compile both context families for debate runs:
  - explorer and deep-critic roles receive `exploration_context`;
  - arbiter receives `arbiter_context` plus role-level summaries and deterministic gate checklist.
- The ranked candidate draft batch belongs to artifacts until deterministic gates select valid drafts.
- Candidate authority writes remain `NeedCandidate` records only.
- Cached context or response reuse must not cause the node to skip per-candidate gates or all-or-none persistence.

### Rationale
- Splitting context lets exploration stay broad without letting broad exploratory material become arbiter authority.
- Explicit response reuse provides a local cost-saving path while preserving D-04 execution provenance.
- Ref-backed compression keeps long workflows usable without letting cache, summaries, or chat history become a parallel truth layer.

## D-19 NeedCandidate Draft Mapping And Discovery Debate Workflow
- Status: locked
- Date: 2026-05-19

### Decision
- Do not lock the ranked candidate draft batch schema yet.
- Lock the mapping boundary between candidate drafts and `TopicSelectionNeedCandidateRecord`.
- Lock the practical v1a need-discovery debate workflow before final schema design.
- The draft batch is model/debate output and artifact-only until deterministic gates select valid drafts.
- Each persisted candidate maps to one `TopicSelectionNeedCandidateRecord`.

### Direct Draft-To-NeedCandidate Mapping
These draft fields may map directly to persisted `TopicSelectionNeedCandidateRecord` fields after validation and normalization:
- `candidate_need` -> `candidate_need`
- `unmet_need_statement` -> `unmet_need_statement`
- `mechanism_type` -> `mechanism_type`
- `mechanism_summary` -> `mechanism_summary`
- `mechanism_payload` -> `mechanism_payload`
- `scope_notes` -> `scope_notes`
- `non_goal_notes` -> `non_goal_notes`
- `prior_art_status` -> `prior_art_status`
- `evidence_role_refs` -> `evidence_role_bundle`
- `conflict_refs` -> `conflict_refs`
- `strength_assessment_refs` -> `strength_assessment_refs`
- `gap_codes` -> `gap_codes`
- `speculative` -> `speculative`
- `confidence` -> `confidence`

### System-Derived Fields
These `TopicSelectionNeedCandidateRecord` fields must be derived by backend/runtime code, not supplied as authority by agents or debate:
- `need_candidate_id`
- `workspace_id`
- `title_card_id`
- `evidence_map_id`
- `candidate_version`
- `lifecycle_status`
- `decision_status`
- `review_status`
- `freshness_status`
- `evidence_map_ref`
- `search_run_ref`
- `search_plan_ref`
- `literature_snapshot_ref`
- `input_snapshot_id`
- `workflow_run_id`
- `gate_result_id`
- `transition_attempt_id`
- `trace_snapshot_id`
- `artifact_refs`
- `result_adjudication_id`
- `result_validated_need_id`
- `merged_into_need_candidate_ref`
- `created_by`
- `created_at`
- `updated_at`

Initial status defaults should remain compatible with current v1a semantics:
- `lifecycle_status=hypothesis`
- `decision_status=hypothesis`
- freshness/review status are computed from input currentness and deterministic gate results.

### Artifact-Only Draft Fields
These draft or batch fields must not become `NeedCandidate` authority fields:
- `draft_id`
- `rank`
- `batch_ranking_rationale`
- `arbiter_selection_rationale`
- `rejected_framings`
- `unresolved_points`
- `recheck_suggestions`
- `duplicate_or_merge_hint`
- raw role transcripts

`rank` is a batch artifact, not a stable candidate fact. `duplicate_or_merge_hint` can guide deterministic gates or later adjudication, but it must not directly set `merged_into_need_candidate_ref` unless a later explicit merge decision occurs. `recheck_suggestions` can guide `SearchPlanRecheckRequest` creation later, but the generate node must not mutate `SearchPlan`.

`assumptions` and `uncertainty_notes` default to artifacts. A future schema may normalize part of them into `mechanism_payload` only when the mapping is explicit and deterministic.

### Debate Workflow
The v1a need-discovery debate workflow is:
1. Deterministic context compile creates `exploration_context`, `arbiter_context`, evidence/resource/search digests, candidate-pool digest, and decision-memory digest.
2. Arbiter opens the debate by framing discovery goals, required checks, prior-art or pseudo-gap risks, and role-specific questions.
3. Explorer proposes multiple need framings and value directions from `exploration_context`.
4. Deep critic pressure-tests those framings for pseudo-gap, prior art, weak evidence, over-broad scope, missing baseline, and unsupported mechanism.
5. Arbiter evaluates whether a targeted supplemental round is needed.
6. Optional supplemental rounds may run only on arbiter-scoped unresolved questions.
7. Arbiter emits a ranked candidate draft batch, rejected framings, unresolved points, merge/recheck hints, and terminal result.
8. Deterministic per-candidate gates decide which drafts can be persisted.
9. Valid candidates persist all-or-none as `NeedCandidate` records; invalid drafts remain rejected-framing artifacts.
10. Runtime returns candidate-pool projection refs.

### Round Limits
- Need-discovery debate may run up to 3 total rounds.
- Round 1 is the required exploration plus critique round.
- Rounds 2 and 3 are optional supplemental rounds.
- Supplemental rounds must be targeted by arbiter to specific unresolved questions; they must not reopen broad exploration from scratch.
- After round 3, arbiter must emit one of:
  - `finalize`
  - `blocked`
  - `require_human_review`
- `continue` must not appear as a terminal output.

### Rationale
- Mapping first prevents draft schema work from creating fields that cannot safely persist to the existing `NeedCandidate` model.
- Keeping rank, rejected framings, unresolved points, and recheck hints in artifacts prevents transient debate outputs from becoming durable facts.
- Allowing up to 3 targeted rounds supports deeper excavation without creating open-ended multi-agent loops.

## D-20 Ranked Candidate Draft Batch Minimum Schema
- Status: locked
- Date: 2026-05-19

### Decision
- Lock the minimum schema for `ranked_candidate_draft_batch`.
- The schema is an artifact/model-output contract, not an authority object.
- It is intentionally minimal: it must support deterministic gates, mapping to `TopicSelectionNeedCandidateRecord`, and audit of rejected/unresolved material.
- Do not include `assumptions`, `uncertainty_notes`, `duplicate_or_merge_hint`, or `recheck_suggestions` as required minimum fields in v1.
- Those optional fields may appear in future schema versions or extension payloads, but they must remain artifact-only unless a later node policy explicitly maps them.

### Minimum Schema Shape
```yaml
schema_version: string
draft_batch:
  batch_id: string
  terminal_result: finalize | blocked | require_human_review
  ranking_rationale: string
drafts:
  - draft_id: string
    rank: number
    candidate_need: string
    unmet_need_statement: string
    mechanism_type: string
    mechanism_summary: string | null
    mechanism_payload: object
    scope_notes: string
    non_goal_notes: string
    prior_art_status: string
    evidence_role_refs:
      support: FunctionalRef[]
      challenge: FunctionalRef[]
      baseline: FunctionalRef[]
      context: FunctionalRef[]
    conflict_refs: FunctionalRef[]
    strength_assessment_refs: FunctionalRef[]
    gap_codes: string[]
    speculative: boolean
    confidence: number
    selection_rationale: string
rejected_framings:
  - framing_id: string
    summary: string
    reason_codes: string[]
    evidence_refs: FunctionalRef[]
unresolved_points:
  - point_id: string
    summary: string
    severity: low | medium | high
    suggested_route: recheck | human_review | park | ignore
```

### Schema Rules
- `schema_version` must be explicit and versioned.
- `draft_batch.terminal_result=finalize` requires `drafts.length >= 1`.
- `draft_batch.terminal_result=blocked` may have zero drafts, but it must include at least one `unresolved_points` item or rejected framing with reason codes.
- `draft_batch.terminal_result=require_human_review` must include `unresolved_points` with `suggested_route=human_review`.
- `drafts.length` must not exceed `max_persisted_candidates` from node policy.
- `rank` must be unique and contiguous within `drafts`.
- `draft_id` and `framing_id` are local artifact ids and must not be reused as DB ids.
- Each draft must cite at least one support or challenge evidence ref.
- Evidence refs must resolve to the input evidence/resource/search snapshots.
- `selection_rationale` and `ranking_rationale` are artifact explanations, not `NeedCandidate` authority fields.
- `rejected_framings` do not create `NeedCandidate` records.
- `unresolved_points` do not create recheck, risk, queue, or human-decision authority records by themselves.

### Mapping Boundary
- Draft fields listed in D-19 direct mapping may feed `TopicSelectionNeedCandidateRecord` after deterministic normalization and gate validation.
- Batch metadata, rank, rationale, rejected framings, unresolved points, and local ids remain artifact-only.
- Backend/runtime still derives candidate ids, versions, statuses, source refs, control-plane refs, artifact refs, creator, and timestamps.

### Rationale
- A small required schema keeps the first implementation gateable and replayable.
- Deferring assumptions, uncertainty notes, duplicate/merge hints, and recheck suggestions avoids unstable mappings before the core candidate path is implemented.
- Rejected and unresolved material remains visible for audit without polluting the candidate authority table.

## D-21 NeedCandidate Draft Admission Gates
- Status: locked
- Date: 2026-05-19

### Decision
- Lock deterministic admission gates for `ranked_candidate_draft_batch` before any `NeedCandidate` authority write.
- Debate or single-agent execution may produce, rank, and explain candidate drafts, but it cannot decide authority persistence by itself.
- The admission layer answers only whether each draft is eligible to become a `NeedCandidate`.
- The admission layer must not rewrite candidate content, invent missing refs, downgrade failures into partial authority writes, or create `ValidatedNeed`.
- Gate results are recorded as a `CandidateDraftAdmissionReport` artifact.

### Admission Report Shape
```yaml
schema_version: string
batch_id: string
node_attempt_id: string
terminal_result: finalize | blocked | require_human_review
draft_results:
  - draft_id: string
    rank: number
    decision: admit | reject_artifact_only | require_human_review | return_for_supplemental_round | merge_hint_only
    reason_codes: string[]
    resolved_ref_counts:
      support: number
      challenge: number
      baseline: number
      context: number
    normalized_candidate_key: string | null
    duplicate_candidate_refs: FunctionalRef[]
    required_human_review_points: FunctionalRef[]
    supplemental_questions: string[]
valid_draft_count: number
rejected_draft_count: number
merge_hint_count: number
blocking_reason_codes: string[]
```

### Gate Order
1. `schema_gate`: reuse D-20 minimum schema validation. Failure blocks the node with `INVALID_RANKED_CANDIDATE_DRAFT_BATCH`.
2. `reference_integrity_gate`: every evidence, conflict, and strength ref must resolve to the input evidence/resource/search snapshots. Unresolved refs block or reject the affected draft before persistence.
3. `scope_gate`: `candidate_need` and `unmet_need_statement` must stay inside topic scope and must respect inherited exclusions/non-goals.
4. `evidence_sufficiency_gate`: each admitted draft must cite at least one support or challenge ref; context-only or baseline-only drafts cannot persist.
5. `mechanism_sufficiency_gate`: admitted drafts must express a researchable mechanism, method, system design, evaluation path, or technical lever rather than only a broad topic or interest statement.
6. `novelty_duplicate_gate`: normalized candidate keys and candidate-pool comparison decide whether the draft is new, duplicate, or merge-only.
7. `risk_speculation_gate`: speculative or high-risk drafts may persist only when challenge/conflict refs or explicit scope limits are present.
8. `batch_gate`: after per-draft gates, admitted draft count must be `1..max_persisted_candidates` before authority write.

### Admission Decisions
- `admit`: draft may enter the all-or-none `NeedCandidate` persistence batch.
- `reject_artifact_only`: draft is not persisted and remains a rejected-framing artifact with reason codes.
- `require_human_review`: draft is grounded but cannot be safely admitted without human judgment.
- `return_for_supplemental_round`: draft needs arbiter-scoped supplemental exploration and the node still has remaining debate rounds.
- `merge_hint_only`: draft is too close to an existing candidate and records merge hints without creating a new authority row.

### Batch Semantics
- If at least one draft is `admit`, the admitted drafts persist all-or-none after deterministic normalization.
- Invalid or rejected drafts must be filtered before the authority-write transaction starts.
- If zero drafts are `admit` and debate rounds remain, the arbiter may request `return_for_supplemental_round`.
- If zero drafts are `admit` and no rounds remain, the node returns `blocked` or `require_human_review`.
- `merge_hint_only` does not create or mutate authority rows by itself.

### Rationale
- This separates excavation from persistence: agents broaden and deepen candidate discovery, deterministic gates protect authority state.
- Keeping admission results as artifacts makes failures auditable without adding another candidate authority model.
- The all-or-none valid batch rule prevents silent partial persistence and keeps workflow replay deterministic.

## D-22 Supplemental Round Routing Policy
- Status: locked
- Date: 2026-05-19

### Decision
- Lock the routing policy for optional supplemental rounds inside `generate-need-candidate`.
- Supplemental rounds are a bounded repair path for promising but not-yet-admissible candidate drafts.
- Supplemental rounds are not a fallback for malformed schemas, missing preconditions, topic drift, pseudo-gaps, ungrounded ideas, duplicate candidates, or broad re-exploration.
- The arbiter owns the routing decision and must produce a `SupplementalRoundRoutingDecision` artifact before any supplemental round starts.
- Supplemental round output must re-enter D-20 schema validation and D-21 admission gates; it cannot bypass deterministic gates or persist authority directly.

### Routing Artifact Shape
```yaml
schema_version: string
batch_id: string
node_attempt_id: string
current_round_index: number
remaining_round_budget: number
routing_decision: run_supplemental_round | reject_without_supplement | block | require_human_review | finalize_with_admitted_batch
source_draft_ids: string[]
trigger_reason_codes: string[]
supplemental_questions:
  - question_id: string
    target_draft_ids: string[]
    question: string
    expected_resolution: add_challenge_ref | sharpen_mechanism | clarify_scope | resolve_conflict | differentiate_duplicate | bound_speculation
allowed_roles: string[]
forbidden_actions: string[]
stop_condition: string
```

### Supplementable Reasons
- Missing or thin challenge coverage when the draft has grounded support and the evidence map suggests available contrary evidence.
- Mechanism is underspecified but the evidence signals point to a concrete method, system, evaluation path, or technical lever.
- Scope or non-goal boundary is unclear but the draft is otherwise in-topic and grounded.
- Support and challenge evidence conflict in a way that needs targeted arbiter-scoped resolution.
- A speculative but promising draft needs explicit risk bounds or conflict refs before admission.
- A near-duplicate draft may be differentiated only when the arbiter identifies a concrete, evidence-backed distinction to test.

### Non-Supplementable Reasons
- `INVALID_RANKED_CANDIDATE_DRAFT_BATCH`, malformed context, missing required source refs, or model output that should go through retry/escalation instead.
- Topic drift, inherited exclusion violation, or non-goal violation.
- No support/challenge evidence can ground the draft.
- Broad topic restatement, pseudo-gap, or interest statement with no researchable mechanism.
- Pure duplicate where `merge_hint_only` is sufficient.
- Round budget exhausted.

### Round Rules
- Round 1 is the required initial exploration and critique round.
- Rounds 2 and 3 are optional supplemental rounds only.
- A supplemental round must target explicit `source_draft_ids` and concrete `supplemental_questions`.
- A supplemental request may contain at most 5 questions.
- Allowed roles default to `explorer` and `deep_critic`; arbiter frames the questions and synthesizes the returned role summaries.
- Supplemental workers consume `exploration_context` plus arbiter-scoped question deltas; arbiter consumes `arbiter_context` plus returned role-level summaries.
- Supplemental workers must not reopen broad exploration, introduce unrelated candidate families, mutate authority objects, or call persistence paths.
- After each supplemental round, the arbiter emits an updated ranked candidate draft batch and admission gates run again.

### Terminal Routing
- If at least one draft is already `admit`, the default route is `finalize_with_admitted_batch` unless the arbiter can justify one targeted supplemental round before persistence.
- If zero drafts are admitted and at least one draft has a supplementable reason with remaining budget, route `run_supplemental_round`.
- If zero drafts are admitted and reasons are non-supplementable, route `reject_without_supplement`, `block`, or `require_human_review` according to failure semantics.
- `require_human_review` is allowed only for grounded drafts with unresolved judgment, not as a generic failure fallback.
- After round 3, route must be `finalize_with_admitted_batch`, `block`, or `require_human_review`; it must not request another round.

### Rationale
- This preserves the benefit of deeper excavation without turning debate into an open-ended retry system.
- Tying supplemental rounds to admission failures keeps the loop focused on quality repair rather than additional ideation.
- Re-running schema and admission gates after every supplemental round prevents a second persistence path from emerging.

## D-23 NeedCandidate Persistence Batch Contract
- Status: locked
- Date: 2026-05-19

### Decision
- Lock the batch persistence contract that turns admitted candidate drafts into `NeedCandidate` authority rows.
- Persistence accepts only drafts with `decision=admit` from D-21 `CandidateDraftAdmissionReport`.
- Persistence must not consume raw debate output, non-admitted drafts, rejected framings, unresolved points, hidden reasoning, or artifact rationale as authority fields.
- The write boundary remains the existing `TopicSelectionNeedValidationService`/repository path or a service-level batch wrapper over the same repository boundary.
- Do not introduce `NeedCandidateSet` or a second candidate write path.
- Admitted drafts in one node attempt persist all-or-none in one transaction.

### Command Shape
`PersistNeedCandidateBatchCommand`:
```yaml
schema_version: string
node_attempt_id: string
workflow_run_id: string
topic_scope_ref: FunctionalRef
evidence_map_ref: FunctionalRef
resource_sample_set_ref: FunctionalRef | null
ranked_candidate_draft_batch_artifact_ref: FunctionalRef
admission_report_artifact_ref: FunctionalRef
supplemental_routing_artifact_refs: FunctionalRef[]
admitted_drafts:
  - draft_id: string
    rank: number
    candidate_need: string
    unmet_need_statement: string
    mechanism_type: string
    mechanism_summary: string | null
    mechanism_payload: object
    scope_notes: string
    non_goal_notes: string
    prior_art_status: string
    evidence_role_bundle: object
    conflict_refs: FunctionalRef[]
    strength_assessment_refs: FunctionalRef[]
    gap_codes: string[]
    speculative: boolean
    confidence: number
    normalized_candidate_key: string
    source_admission_decision_ref: FunctionalRef
idempotency_key: string
```

### Backend-Derived Fields
- Backend/runtime derives `NeedCandidate.id`.
- Backend/runtime derives `candidate_version` and `candidate_hash`.
- Backend/runtime derives lifecycle, decision, review, and freshness statuses.
- Backend/runtime resolves workspace, title, topic, and evidence authority refs from command refs and current workflow context.
- Backend/runtime attaches artifact refs, discovery audit refs, workflow refs, creator/source metadata, and timestamps.
- LLM/debate drafts must not provide these fields directly.

### Hash, Version, And Idempotency
- `candidate_hash` is computed from canonicalized admitted authority fields, key refs, and policy/schema versions.
- `candidate_hash` must not include rank, rationale, role transcripts, hidden reasoning, rejected framings, unresolved points, or supplemental routing explanations.
- Initial `candidate_version` is `1`.
- Updates to an existing normalized candidate key are not allowed by this contract; a later explicit policy must define update/merge semantics.
- `idempotency_key` is derived from `workflow_run_id`, `node_attempt_id`, admitted `draft_id` list, and admission report hash.
- Replaying the same `idempotency_key` returns the same persisted candidate refs and must not insert duplicates.

### Artifact And Audit Attachment
- Each persisted candidate links to:
  - `ranked_candidate_draft_batch_artifact_ref`
  - `admission_report_artifact_ref`
  - zero or more `supplemental_routing_artifact_refs`
  - `discovery_audit_ref`
  - `workflow_run_id`
  - `node_attempt_id`
- Artifacts support explanation, replay, and debugging; they are not candidate authority fields.

### Candidate-Pool Projection
```yaml
persisted_candidate_refs: FunctionalRef[]
candidate_pool_projection_ref: FunctionalRef
candidate_pool_projection_hash: string
```
- The candidate-pool projection is a query/sorting view over existing `NeedCandidate` rows.
- Projection generation must not create `NeedCandidateSet` or another durable set authority.
- The projection hash is used for replay/audit and downstream context checks.

### Failure Semantics
- Empty `admitted_drafts` fails with `NO_ADMITTED_DRAFTS`.
- More than `max_persisted_candidates` admitted drafts fails with `TOO_MANY_NEED_CANDIDATES`.
- Draft not marked `admit` in the admission report fails with `DRAFT_NOT_ADMITTED`.
- Unresolved command refs fail with `UNRESOLVED_PERSISTENCE_REFS`.
- Normalized key conflict with an existing candidate fails with `DUPLICATE_NEED_CANDIDATE`; this contract does not auto-merge.
- Candidate hash or version derivation failure fails with `NEED_CANDIDATE_VERSION_FAILED`.
- Any per-draft persistence failure rolls back the full batch.

### Rationale
- D-23 closes the path from D-19/D-20/D-21/D-22 into one authority write contract.
- Keeping persistence focused on admitted drafts prevents raw agent outputs from becoming durable product state.
- Idempotency and all-or-none writes make replay safe while avoiding partial candidate pools.

## D-24 GenerateNeedCandidate Node I/O Contract
- Status: locked
- Date: 2026-05-19

### Decision
- Lock `topic-selection.v1a.generate-need-candidate.v1` external node I/O as the sole contract between `WorkflowHarness` and the business workflow.
- The node may run debate, supplemental rounds, schema validation, admission gates, and persistence internally, but external callers see one input schema and one result schema.
- All execution modes (`codex_assisted`, `provider_llm`, `mocked_llm`) must use the same I/O shapes.
- Provenance records distinguish execution source; result shape must not change by execution mode.
- Downstream nodes must consume only node result refs/status/warnings/errors, not raw debate transcripts or hidden reasoning.

### Input Shape
`GenerateNeedCandidateNodeInput`:
```yaml
schema_version: string
workflow_run_id: string
node_attempt_id: string
topic_scope_ref: FunctionalRef
evidence_map_ref: FunctionalRef
evidence_strength_ref: FunctionalRef
resource_sample_set_ref: FunctionalRef | null
candidate_pool_projection_ref: FunctionalRef | null
search_snapshot_refs: FunctionalRef[]
resource_snapshot_refs: FunctionalRef[]
exploration_context_ref: FunctionalRef
arbiter_context_ref: FunctionalRef
execution_mode: codex_assisted | provider_llm | mocked_llm
profile_id: string
policy_version: string
operator_reuse_approval_ref: FunctionalRef | null
```

### Input Rules
- Input carries refs and context packet refs, not scattered raw DB records.
- `exploration_context_ref` and `arbiter_context_ref` must resolve to D-18 context packets with matching input refs, policy version, schema version, execution mode, profile, and context family.
- `candidate_pool_projection_ref` may be null only when no prior candidate pool exists for the title/topic scope.
- `operator_reuse_approval_ref` is required only when local cost-saving cached response reuse is used under `codex_assisted`.
- The node must not bypass context compilation by reading business DB records directly through model orchestration.

### Result Shape
`GenerateNeedCandidateNodeResult`:
```yaml
schema_version: string
workflow_run_id: string
node_attempt_id: string
status: succeeded | blocked | require_human_review
terminal_result: finalize | blocked | require_human_review
persisted_candidate_refs: FunctionalRef[]
candidate_pool_projection_ref: FunctionalRef | null
candidate_pool_projection_hash: string | null
artifact_refs:
  ranked_candidate_draft_batch: FunctionalRef | null
  minimum_schema_validation_report: FunctionalRef | null
  candidate_draft_admission_report: FunctionalRef | null
  supplemental_round_routing_decisions: FunctionalRef[]
  persist_need_candidate_batch_command: FunctionalRef | null
  discovery_audit: FunctionalRef | null
warning_codes: string[]
error_code: string | null
```

### Status Semantics
- `succeeded` means at least one `NeedCandidate` was persisted and candidate-pool projection refs/hash are returned.
- `blocked` means the node produced no authority output and cannot continue without changed inputs, retry/escalation, or upstream repair.
- `require_human_review` means grounded draft or conflict material exists but needs human judgment; it is not a generic failure fallback.
- `persisted_candidate_refs=[]` is allowed only when `status=blocked` or `status=require_human_review`.
- `status=succeeded` requires `terminal_result=finalize`.
- `status=blocked` requires `terminal_result=blocked`.
- `status=require_human_review` requires `terminal_result=require_human_review`.

### Required Artifact Refs By Status
- `succeeded` requires:
  - `ranked_candidate_draft_batch`
  - `minimum_schema_validation_report`
  - `candidate_draft_admission_report`
  - `persist_need_candidate_batch_command`
  - `discovery_audit`
  - non-empty `persisted_candidate_refs`
  - non-null `candidate_pool_projection_ref`
  - non-null `candidate_pool_projection_hash`
- `blocked` requires the last available failure artifact, such as schema validation report, admission report, supplemental routing decision, persist command snapshot, or discovery audit.
- `require_human_review` requires `candidate_draft_admission_report` or `supplemental_round_routing_decisions` and a human-review reason in artifacts or warning/error metadata.

### Error Code Set
- `MISSING_EVIDENCE_MAP`
- `MISSING_EVIDENCE_SOURCE_REFS`
- `MISSING_CONTEXT_PACKET`
- `MALFORMED_CONTEXT_PACKET`
- `STALE_CONTEXT_PACKET`
- `NO_GROUNDED_NEED_CANDIDATE`
- `PSEUDO_GAP_ONLY`
- `INVALID_RANKED_CANDIDATE_DRAFT_BATCH`
- `CANDIDATE_DRAFT_ADMISSION_FAILED`
- `UNRESOLVED_CANDIDATE_DRAFT_REFS`
- `MALFORMED_NEED_CANDIDATE_OUTPUT`
- `NO_ADMISSIBLE_NEED_CANDIDATE`
- `NO_ADMITTED_DRAFTS`
- `DRAFT_NOT_ADMITTED`
- `UNRESOLVED_PERSISTENCE_REFS`
- `DUPLICATE_NEED_CANDIDATE`
- `NEED_CANDIDATE_VERSION_FAILED`
- `TOO_MANY_NEED_CANDIDATES`
- `PERSIST_NEED_CANDIDATE_BATCH_FAILED`

### Downstream Handoff
- Downstream nodes may consume:
  - `persisted_candidate_refs`
  - `candidate_pool_projection_ref`
  - `candidate_pool_projection_hash`
  - `artifact_refs.discovery_audit`
  - `warning_codes`
  - `error_code`
- This node must not directly create `ValidatedNeed`, `SearchPlan`, `NeedCandidateSet`, or a v1b input bundle.
- Downstream nodes must not read raw debate transcripts as business input.

### Rationale
- D-24 turns D-17 through D-23 from internal workflow design into one implementable node interface.
- A stable node I/O contract keeps WorkflowHarness scenarios independent from the chosen executor or provider.
- Keeping internal artifacts behind result refs prevents raw agent material from becoming downstream business state.

## D-25 GenerateNeedCandidate Implementation Slice
- Status: locked
- Date: 2026-05-19

### Decision
- Lock the implementation slice order for `topic-selection.v1a.generate-need-candidate.v1`.
- D-25 is a construction plan, not a new runtime authority object or alternate node contract.
- Implementation must preserve D-24 node I/O and must not introduce a second write path, `NeedCandidateSet`, raw transcript handoff, or mode-specific result shape.
- Each slice must be independently testable before the next slice depends on it.

### Slice Order
1. `contracts_schema`
   - Define shared DTO/schema/error-code contracts for `GenerateNeedCandidateNodeInput`, `GenerateNeedCandidateNodeResult`, `RankedCandidateDraftBatch`, `CandidateDraftAdmissionReport`, `SupplementalRoundRoutingDecision`, and `PersistNeedCandidateBatchCommand`.
   - This slice must not implement business persistence or model calls.
2. `artifact_ref_boundary`
   - Define artifact write/read refs, artifact hash, redacted snapshot shape, and FunctionalRef resolution rules.
   - Hidden reasoning, provider secrets, and raw provider logs remain excluded.
3. `context_compiler_integration`
   - Integrate D-18 `exploration_context`, `arbiter_context`, exact cache key, refs-only input, and context packet validation.
   - This slice must not invoke LLMs.
4. `orchestrator_adapter`
   - Connect `AgentOrchestrator` to `mocked_llm`, `codex_assisted`, and `provider_llm`.
   - All execution modes must return the same contract shape and differ only by provenance.
5. `draft_schema_validation`
   - Implement D-20 minimum schema validation for `RankedCandidateDraftBatch`.
   - Invalid schema blocks before admission gates.
6. `admission_gates`
   - Implement D-21 deterministic gates as pure service logic where possible: reference integrity, scope, evidence sufficiency, mechanism sufficiency, novelty/duplicate, risk/speculation, and batch gate.
   - This slice should be covered by focused unit tests with fixtures before any provider/codex E2E.
7. `supplemental_routing`
   - Implement D-22 supplemental round routing, source draft targeting, question cap, no broad re-exploration, and round-3 terminal rule.
   - First verification should use mocked role outputs.
8. `persistence_batch`
   - Implement D-23 admitted-only, idempotent, all-or-none persistence through the existing `TopicSelectionNeedValidationService`/repository boundary.
   - Return candidate-pool projection refs/hash without creating `NeedCandidateSet`.
9. `workflow_harness_scenarios`
   - Register and execute WorkflowHarness scenarios for happy path, zero admitted to supplemental, duplicate to merge hint, malformed draft blocked, persistence rollback, and execution-mode shape stability.

### Verification Order
- Run deterministic unit tests before any model-like execution tests.
- Run `mocked_llm` WorkflowHarness scenarios before `provider_llm` or `codex_assisted` scenarios.
- Run provider/codex scenarios only after contracts, context, validators, admission gates, supplemental routing, and persistence batch are passing in mocked mode.
- Verify every slice through explicit artifacts or test evidence before marking the implementation slice complete.

### Implementation Guardrails
- Do not add `NeedCandidateSet`.
- Do not let raw debate transcripts become downstream business input.
- Do not allow raw transcript handoff from debate artifacts into downstream business contracts.
- Do not let raw LLM/debate output bypass D-20 schema validation, D-21 admission gates, or D-23 persistence contract.
- Do not introduce a D-20/D-21/D-23 bypass through orchestration, cache reuse, Codex-assisted execution, or test-only shortcuts.
- Do not create a mode-specific result shape for `codex_assisted`, `provider_llm`, or `mocked_llm`.
- Do not perform partial batch persistence.
- Do not make `codex_assisted` or cached response reuse masquerade as `provider_llm`.
- Do not allow cached response masquerading as provider_llm in implementation tests or real runs.

### Rationale
- D-25 converts the locked design into a safe implementation sequence.
- Contracts, artifacts, context, and deterministic gates are lower-risk prerequisites for LLM execution.
- Mocked harness verification first keeps the implementation debuggable before provider/codex variability enters the loop.

## D-26 Cross-Version Handoff Boundary
- Status: locked
- Date: 2026-05-19

### Decision
- Before implementing D-25 `contracts_schema`, lock the minimum cross-version boundary from v1a to v1b to v1c.
- D-26 is a compatibility boundary, not a new workflow node, authority object, or implementation slice.
- v1a `generate-need-candidate` may deepen discovery and persist a bounded batch of `NeedCandidate` records, but it does not publish v1b inputs.
- v1b begins only from the existing deterministic `topic-selection.v1a.publish-v1b-input-bundle.v1` node after a human-confirmed `ValidatedNeed` exists.
- v1c begins only from the existing deterministic `topic-selection.v1b.publish-v1c-input-bundle.v1` node after package readiness exists.

### v1a To v1b Handoff
- The v1a-to-v1b authority input remains `TopicSelectionV1aToV1bInputBundleRecord`.
- The bundle may carry:
  - `validated_need_ref`
  - `source_need_candidate_ref`
  - `adjudication_result_ref`
  - `support_packet_ref`
  - `human_decision_ref`
  - evidence/search/literature snapshot refs
  - `risk_refs`
  - `gap_codes`
  - `memory_suggestion_refs`
  - `recheck_request_refs`
  - `trace_refs`
  - small redacted `handoff_payload`
- The bundle must not carry raw debate transcripts, hidden reasoning, raw ranked draft batches, raw rejected framings, or supplemental-round role outputs as business input.
- Candidate-pool projection refs/hash are v1a discovery/adjudication context and audit material by default; they do not become required v1b business input unless a later v1b policy explicitly promotes them through a stable summary/ref field.

### v1b Consumption Boundary
- `TopicQuestionContract` and `TopicValueAssessment` consume v1b bundle refs, intake constraint profile, selected research slice, risk/gap/recheck/memory refs, and evidence/search snapshots.
- They must not directly read v1a raw debate artifacts or raw D-20/D-21/D-22 artifacts as business facts.
- v1b may use artifact refs for traceability, replay, and audit, but product decisions must be based on stable refs and domain records.
- v1b `assess-topic-value` remains debate-eligible, but its debate policy will be deepened later; D-26 does not implement or fully specify v1b debate.
- v1b deterministic nodes own disposition, package draft, readiness, and v1c bundle publication; model/debate outputs remain advisory until deterministic gates and service boundaries accept them.

### v1b To v1c Handoff
- The v1b-to-v1c authority input remains `TopicSelectionV1bToV1cInputBundleRecord`.
- The v1c bundle carries ready package refs, readiness assessment refs, topic/question/value/package snapshots, accepted-risk refs, blocker/recheck refs, trace refs, and bundle hash according to the existing v1b topic-package contracts.
- The v1c bundle must not carry raw v1a/v1b debate transcripts, hidden reasoning, or unvalidated model output as business input.
- v1c `generate-promotion-support` may later use debate for accepted-risk tension, but support generation remains advisory to the deterministic promotion gate.
- `topic-selection.v1c.run-promotion-gate.v1` remains deterministic, and final promotion remains human-confirmed through `topic-selection.v1c.human-promotion-decision.v1`.

### D-25 Contract Implications
- `GenerateNeedCandidateNodeResult` should expose only v1a node result refs/status/artifact refs needed by v1a continuation and audit.
- It must not include v1b/v1c package, value, topic-question, promotion, bridge, or downstream fields.
- `PersistNeedCandidateBatchCommand` must remain an admitted-draft-to-`NeedCandidate` authority write contract; it must not embed v1b/v1c handoff fields.
- If v1b/v1c later need more context, add stable fields to their own handoff/input contracts instead of mutating v1a raw debate artifacts into cross-stage inputs.

### Non-Goals
- Do not add `NeedCandidateSet`.
- Do not add a new v1a-to-v1b handoff object.
- Do not make `candidate_pool_projection_ref` a required v1b input in this decision.
- Do not define full v1b or v1c debate schemas here.
- Do not allow raw model/debate output to cross version boundaries as business input.

### Rationale
- v1a can become richer without forcing v1b/v1c to consume unstable internal artifacts.
- The handoff boundary preserves existing domain authority objects and avoids dual-track DTOs.
- v1b/v1c can be deepened later against their own node policies without reopening the v1a `generate-need-candidate` contract.

## D-T123-01 (2026-06-12) — T-123 Phase 4 对 harness 的加法式改动（联合决策登记）
- 范围：`topic-selection-v1b-workflow-harness-service.ts` 新增 ① N6 确定性 gate 的 decision-memory dedup warning（新 helper + `validateAndBuildN6Candidates` 处一个调用点 + 契约 N6 `warning_codes` 增加 `decision_memory_duplicate_candidate`）；② N6/N8 runtime service（harness 内部构造）经 frozen_input.source_refs 解析可选的 decision-memory packet artifact（镜像既有 projection 解析模式）。
- 不改动：`invokeNode` 生命周期、节点策略语义、route edges、replay key 组成规则（memory ref 经 frozen_input 自然参与 frozen_input_hash）。
- 设计要点：memory packet 是预先持久化的 control-plane artifact、由调用方放入 frozen_input.source_refs（与 N7 loopback projection 同构），保证生成/准入 expected-identity 恒等与 replay 确定性；不做活查询注入。
- 归属：T-123 Phase 4（dev-docs/archive/topic-selection-productization-hardening/）。冲突面评估：纯加法、不与 T-088 Phase 2 runtime primitives 重叠。

## D-T123-02 (2026-06-13) — T-123 Phase 3 对 harness 的加法式改动（联合决策登记）
- 范围：`topic-selection-v1b-workflow-harness-service.ts` + v1b harness contracts 新增：
  ① N8 确定性 gate 增加 T1 borderline / T3 维度冲突触发检查——首评（frozen payload 无 `n8_debate_admission_ref`）命中 → 新 blocker 码（loopback 路径）；debate 复评（payload 携带 admission ref）仍命中 → 新 warning 码（准入）。阈值以 provisional 标注进 N8 node policy（契约层数据，非服务内常量）。
  ② N8 runner 实装既已声明的 loopback 路由选择（route edge `RB_N8_N7`、目标码 `n8_feedback_to_n7`，均为既有声明）+ 组装 `N8ToN7Feedback@v1` 工件（既有契约）。
  ③ N7 gate 在 `n7_n8_debate_admission_review` 支持工件存在时发射既已声明的 `n8_debate_level_selected` warning。
  ④ N8 runtime（harness 内部构造）按 handoff 携带的 `n8_debate_admission_ref/hash`（N7 runner 既有织入）选择 debate 草稿生成路径。
- 不改动：`invokeNode` 生命周期、replay key 组成规则、既有 N8 三类 blocker 语义、route edges 集合（仅启用既有声明边）、N9（DP-3.4 收窄为 N8-only，其 loopback 码保持 declared-unused）。
- 设计要点：零新触发引擎（D2）——T1/T3 是纯确定性编码，复用 N6 同形 gate→loopback 机制；复评防环判据用既有 handoff 字段，零新契约字段；debate 运行时本体在 harness 外（共享骨架 + v1b builder，DMP-10 单实现）。
- 归属：T-123 Phase 3（dev-docs/archive/topic-selection-productization-hardening/，决策 DP-3.1~3.6 见其 03 §Phase 3 决策）。冲突面评估：纯加法、不与 T-088 runtime primitives 重叠；N8/N7 gate 改动与 T-088 Phase 2 无共享改动点。

## D-T123-03 (2026-06-15) — T-123 Phase 5.1 harness 单文件拆分（机械重构，联合决策登记）
- 范围：`topic-selection-v1b-workflow-harness-service.ts`（现 12,929 行）的**纯机械拆分**——把内聚的**纯函数簇**逐步抽出为独立模块（不改 `WorkflowHarnessService` 类对外契约）：① parse-and-resolve 子系统（`parseN*` frozen payload 解析 + `resolveN*Payload`/`resolveN7SupportContext`/`resolveEarlySemanticSupportPayload` 等纯解析）；② **hash-authority 簇**（`hashContext` 之外的 ~11 个 `hashN*Authority` + ref builder + `outcomeGateResultHash` 的纯计算部分）；③ ref/issue builder 工具（`n7BuildEvidenceRefs`/`uniqueRefs`/`uniqueIssues` 等）。被抽函数改为接收显式参数的 module 级函数（无 `this`），harness 类调用点逐字替换为模块调用。有状态的 per-node runner（依赖 18 个实例依赖）本期不动或仅改薄委托。
- 不改动：`invokeNode` 生命周期与四类 blocker 顺序、replay key 组成规则（`hashContext` → `node_replay_key` 必须 byte-identical）、route edges 集合、所有 gate/blocker 语义、**所有 byte-bearing 哈希**（`frozen_input_hash`/`execution_spec_hash`/`gate_result_hash`/`route_hash`/runtime_admission/11 个 authority hash/`node_replay_key`）、控制面记录形态、契约层。零行为变化。
- 设计要点：复用 v1c debate-core 抽取已验证的**逐字搬迁 + 差分核验**范式（被抽逻辑 byte-identical，pre/post 差分探针互证）。先落 **replay-identity 守卫单测**（对代表性输入钉死 `hashContext`/各 authority hash/`outcomeGateResultHash`/frozen_input_hash 的具体值），每个抽取 slice 前后该守卫 + 全套件必须保持绿；任一哈希漂移即视为回归。增量推进：一簇一 slice，互不耦合者优先（parse/hash/ref builder 纯函数无实例状态，最低风险）。多 session 工程。
- 归属：T-123 Phase 5.1（F-11，dev-docs/archive/topic-selection-productization-hardening/，计划见其 03 §Phase 5 + 00-overview Next）。冲突面评估：纯机械、零行为/契约改动；harness 本体属 T-088 WorkflowHarness 边界（D-02），故按 D3 在此联合登记；不引入新 runtime primitive、不与 T-088 Phase 2 改动点重叠。**重构期间 T-088 若需改 harness 本体请先在此协调，避免大范围搬迁冲突。**
- **续推移交（2026-06-16）**：T-123 收尾关闭归档，本 harness 拆分线**所有权移交 T-127 W-12**（`topic-selection-backend-hardening-and-expansion`，相位提前至 Phase 2、**一次拆透 b1**）。后续拆分在 T-127 登记 **D-T127-01** 续此范式（slice 边界 + N1 golden replay-identity 守卫逐字搬迁 + 差分核验承袭）；原 slice 1（dedup-utils）成果保留为起点。本条 D-T123-03 维持历史记录，进行中工作改看 T-127。

## D-T127-01 (2026-06-17) — T-127 W-12 harness 一次拆透至壳（机械重构，承 D-T123-03，联合决策登记）
- 起点：续 D-T123-03。`topic-selection-v1b-workflow-harness-service.ts` 现 **12,898 行**；F-11 已落 slice 1 —— `topic-selection-v1b-harness-dedup-utils.ts`（`uniqueRefs`/`uniqueStrings`/`uniqueIssues`）+ `topic-selection-v1b-harness-authority-hash.ts` 起头（`canonicalHash`/`hashV1bFrozenInput`/`hashResearchSliceOptionAuthority`/`researchSliceOptionRef`），harness 已 import 二者。
- 范围：**一次拆透（b1）**——把剩余内聚纯函数簇逐字搬迁为 module 级函数（无 `this`），harness 类调用点逐字替换：① parse-and-resolve 簇（`parseN1..parseN11` frozen payload 解析 + `resolveN*Payload`/`resolveN7SupportContext`/`resolveEarlySemanticSupportPayload`）；② 补全 hash-authority 簇（`hashContext` **之外**的 ~11 个 `hashN*Authority` + `outcomeGateResultHash` 纯计算部分 + ref builder，并入 `harness-authority-hash` 模块）；③ 剩余 ref/issue builder 工具。**本期拆至 harness 壳仅余生命周期 8 步 + 持久化簇**（不留长尾）；有状态 per-node runner（18 实例依赖）仍留壳内或仅改薄委托。
- 不改动（同 D-T123-03）：`invokeNode` 生命周期与四类 blocker 顺序、**`hashContext` 留壳内**（→ `node_replay_key` 必须 byte-identical）、replay key 组成规则、route edges 集合、所有 gate/blocker 语义、**所有 byte-bearing 哈希**（`frozen_input_hash`/`execution_spec_hash`/`gate_result_hash`/`route_hash`/runtime_admission/11 个 authority hash/`node_replay_key`）、控制面记录形态、契约层。零行为/契约改动。
- 设计要点：承 D-T123-03 **逐字搬迁 + 差分核验**范式 + F-11 已落的 **N1 golden replay-identity 守卫**（`GUARD_GOLDEN_N1` 钉死 N1 的 6 哈希）+ `OPTION_AUTHORITY_GOLDEN`。每个抽取 slice 前后：N1 golden 守卫 + v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比必须保持绿；任一哈希漂移即回滚该 slice。**N1-only 守卫盲区**：N2+ 含非 idFactory 随机元，仅服务 N2+ 的 authority hash 抽取以全链 e2e + 全套件兜底。一簇一 slice，纯函数无实例状态者优先。
- 归属：T-127 W-12（Phase 2，`dev-docs/archive/topic-selection-backend-hardening-and-expansion/`，计划见其 01 §2.0–2.2 + 03 Phase 2）。冲突面评估：纯机械、零行为/契约改动；harness 本体属 T-088 WorkflowHarness 边界（D-02），按 **D6** 在此续登记（承 D-T123-03）；不引入新 runtime primitive、不与 T-088 Phase 2 改动点重叠。**拆透期间 T-088 若需改 harness 本体请先在此协调，避免大范围搬迁冲突。**
- **收口（2026-06-18）**：W-12 已收口 —— 70 个纯助手（含 ref-builders/asserts 共 90 搬迁函数）全数析出至 16 个兄弟模块，harness **12,898→9,933 行**，严格 DAG 无环；每批 N1 golden 守卫绿 + 全套件 1469/0/35 byte-identical；独立逐字对抗评审 90 函数 0 缺陷。harness 现即字面壳（生命周期 + 持久化 + stateful per-node async runner + runner-local 类型助手）。后续 W-07 触碰 harness N6 节点体登记 **D-T127-02**（下）。

## D-T127-02 (2026-06-19) — T-127 W-07 N6 有界对抗 debate 全运行时（a–i，承 D-T127-01，联合决策登记）
- 起点：续 D-T127-01。W-12 已把 harness 拆至壳；N6 纯叶（`topic-selection-v1b-harness-n6.ts`）+ loopback-triage runtime/admission（`topic-selection-v1b-n6-loopback-triage-{runtime,admission}-service.ts`）就绪，但 debate 执行层缺位。现状（DMP-03 reserved）：`n6_debate_escalation` loopback 目标 + `n6_loopback_triage` 支持槽已实现并校验（`harness-n6.ts` policy blocker + harness `resolveN6LoopbackTriage`），但无 scenario/runtime/trigger 定义 —— triage 识别出 `debate_escalation` 后仅由 `n6LoopbackWarnings` 发 `N6_DEBATE_ESCALATION_RECOMMENDED` warning、无 debate 真跑（死端）。D3 锁定：本期补为**全运行时**（非 spec-only），消除 escalation 死端 / 死能力。
- 范围（加法）：`topic-selection-v1b-workflow-harness-service.ts` 对 N6 节点体 `runN6GenerateTopicQuestionCandidates` 的**加法式 debate-escalation 分支**——当 `loopbackTargetCode==='n6_debate_escalation'` 时（step g）：①构建 process-local N6→debate-escalation runtime context projection（与 `buildN6GateFailureRetryContextProjection` 同构、不持久化）；②同进程同步调用 harness 外新增 `TopicSelectionN6DebateEscalationRuntimeService`（复用**并加法泛化**共享 `topic-selection-bounded-debate-core-service.ts`——见下「core 泛化」，注入 N6 divergent_loop strategy，3 角色 explorer→critic→arbiter：explorer 多 framing 产出 + arbiter 综合候选子集）；③arbiter 综合草稿经 N6 debate 准入后桥接进既有 `validateAndBuildN6Candidates` gate（镜像 N8 gate-bridge）→ finalize/blocked/require_human_review → 正常继续。配套（harness 外）：scenario 契约工厂 + scenario_id（`topic-selection-debate-scenario-contracts.ts`）、N6 debate model profile + per-role context-policy profile（`topic-selection-{model,context-policy}-profile-registry-service.ts`，DP-3.5）、role/slot/output-contract/blocker-code/handoff 类型（`topic-selection-v1b-workflow-harness-contracts.ts`）、触发阈值经 `node_policy` 契约层量化（承 W-06 N8 provisional 范式，复用既有 gate 码 `weak_topic_question_candidate_set`/`duplicate_or_overlapping_candidates`，零新触发引擎，D2）。**core 泛化（前置 slice，DMP-10 单 core 调和 divergent_loop）**：`BoundedDebateCoreService.runLoop` 当前为固定序列走（一角色一产出、duplicate slot 拒绝、末角色=输出），装不下 divergent_loop。本期对其**加法扩展**（Option A，2026-06-19 用户确认）：在**同一 core 类**上新增 `runDivergentLoop` 方法（divergent：多 explorer 扇出 → critic → arbiter issue-frame → arbiter final-synthesis 选子集），**每个 role turn 复用现有 `generateRoleArtifact` per-turn 原语**；**`runLoop`（bounded_sequence）+ `generateRoleArtifact` + `BoundedDebateStrategy` 接口零 diff** → N8/v1c-N2 byte-identity **构造性成立**（非测试再验证）。新增 `DivergentDebateStrategy` 接口扩展 `BoundedDebateStrategy` 的 per-turn hook 子集（`generateRoleArtifact` 仍是唯一 role-turn 契约，DMP-10 单原语不削弱）。**N8 + v1c-N2 两既有消费者 replay byte-identity 作为 core-gen 验收硬门**（先单独落 core-gen slice + 两节点守卫零基线哈希改动，再让 N6 接入）。仍 DMP-10 单 core、不建第二套（V1A `NeedDiscoveryDebateLoopService` 独立路径不复制）。
- 不改动（同 D-T127-01）：`invokeNode` 生命周期与四类 blocker 顺序；`hashContext`→`node_replay_key` 组成规则（debate 载荷经 `semantic_artifacts` 槽参与、不入 `frozen_input`，`frozen_input_hash` 恒等）；route edges 集合（debate 仍路由回 `generate-topic-question-candidates.v1` 既有声明边，`n6LoopbackRouteTargetNode` 不变）；既有 N6 三类 blocker / triage policy blocker / warning 语义；**所有 byte-bearing 哈希**（11 authority hash / `frozen_input_hash` / `execution_spec_hash` / `gate_result_hash` / `route_hash` / runtime_admission / `node_replay_key`）；控制面记录形态；DMP-10 单 debate 路径（不引入第二实现）。零既有行为/契约改动。
- 设计要点：primitive 选 **divergent_loop**（3 角色 explorer→critic→arbiter，承 V1A N6 / generate-need-candidate debate 先例，贴合 N6 生成型探索任务——explorer 探不同 framing、critic 挑战弱集/重叠、arbiter 综合候选子集；在 02-architecture §3.1 design gate 关定 resolved=divergent_loop；matrix vocab 限 divergent_loop/bounded_sequence/reserved/none）。模板镜像 V1A divergent_loop debate（`topic-selection-need-discovery-debate-loop-service.ts` 的角色编排 + `createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract` 的 scenario 形态），但**经泛化后的共享 core 承载**（不复制 V1A 独立 service，DMP-10）。debate 本体在 harness 外（泛化后的共享 core divergent 走法 + N6 divergent_loop strategy 注入；既有 bounded_sequence 走法零行为改动），harness 仅新增「检测→执行→gate-bridge」薄接入点。承 D-T123-02 gate→loopback + honest-mocked-cannot-run（DMP-09）范式；admission 经同一 core hook 重算 debate 身份（`loop_transcript_hash` + role identity）。**replay 守卫（三重）**：①**core-gen slice**：N8 + v1c-N2 既有 debate replay byte-identity 守卫（泛化不得动既有 bounded_sequence 字节）；②N1-only `GUARD_GOLDEN_N1` 不覆盖 N6 debate 路径（N6 含非 idFactory 随机元），故 step h 新增专用 N6 debate replay-identity 守卫（钉死 `loop_transcript_hash` + admission identity）；③断言非 debate 的 N6 regenerate/rollback 路径哈希 byte-identical。每 slice 前后 N1 golden + v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比保持绿，任一哈希漂移即回滚该 slice。
- 归属：T-127 W-07（Phase 3，`dev-docs/archive/topic-selection-backend-hardening-and-expansion/`，计划见其 01 §3.1–3.2 + 02 §32–38 + 03 Phase 3）。冲突面：加法式（N6 harness 节点体 + 配套契约/profile/runtime + **共享 `bounded-debate-core` 加法泛化**）、零既有行为/哈希/契约改动 —— 既有 bounded_sequence 走法 byte-identical（N8 + v1c-N2 replay 守卫为 core-gen 硬门），仍 DMP-10 单 core（不建第二套）。harness 本体 + 共享 debate-core 均属 T-088 WorkflowHarness/runtime 边界（D-02），按 **D6** 在此续登记（承 D-T127-01）。**与 T-089 协调**：N6 节点 `debate_primitive` reserved→implemented 在 `docs/context/process/topic-selection-workflow-matrix.md` N6 行翻转、T-089 `03-implementation-notes` 留痕（divergent_loop 经泛化后的共享 debate-core 承载、无第二实现路径 DMP-10）。**W-07 期间 T-088 若需改 harness N6 节点体或 `bounded-debate-core` 请先在此协调。**
- **收口（2026-06-20）— W-07 全 a–i 完成,含一处架构修正**：core-gen + f0–f6 + step i 落地（commits 见 T-127 `03-implementation-notes` W-07 块）。**架构修正**：上文「范围 step g」原设想 harness 节点体**同进程同步调用** N6 debate runtime（in-harness 执行）。实施时核实真架构（harness comment 4908-4913 明示 + grep 证 N8 `runDebate` 无 production caller）：**debate 执行在 caller 端**（`TopicSelectionV1bN6DivergentDebateRuntimeService.runDivergentDebate` = caller-side runtime,镜像 N8 `runDebate` / v1c N2;harness 不内调）。`n6_debate_escalation` 的检测/路由 harness 侧本已完整（`runN6GenerateTopicQuestionCandidates` 3078-3128 + trace 带 `debate_escalation` + `N6_DEBATE_ESCALATION_RECOMMENDED`）。故 **harness 节点体实际改动极小**：仅 `n6LoopbackWarnings` 加发 product 下的 `N6_DEBATE_THRESHOLDS_PROVISIONAL` advisory tripwire（gated escalation+product,非阻断,镜像 N8 DP-3.3）——**未**新增 in-harness debate 调用、**未**动 `invokeNode` 生命周期 / replay key / route edges / 既有 gate 语义 / 任何 byte-bearing 哈希。**replay byte-identity 保持**（gated 故非-debate + 其他节点 + N1 golden 全绿,backend 1496/0/35）。DMP-10 单 core（`runDivergentLoop` 加法泛化,N8/v1c byte-identical 构造性成立）。step i 矩阵 flip + T-089 SSOT 留痕已落（matrix consistency test 绿）。prompt 正文延期 **T-128**。每刀对抗式评审 + 修复（f3 arity trap / f4 RIC 契约 / f5 bridge 字节透传 / f6 tripwire gating）。**D6 收口**：本期对 harness 本体的实际触碰 = 仅 tripwire 一处加法(gated),已记;`bounded-debate-core` = `runDivergentLoop` 加法泛化(已记)。

## D-T128-00 (2026-06-25) — T-128 产品就绪收口包 harness-touch 协议开篇（承 D-T127-02，联合决策登记）
- **背景**：T-127 已 done（W-01..W-13 全收口，harness 拆透至壳 D-T127-01 + N6 divergent debate 全运行时 D-T127-02）。其遗留的产品就绪缺口由 **T-128**（`topic-selection-product-readiness-closure`，重定范围自 prompt-content-authoring）一站式收口或显式登记延期。本条为 T-128 的 harness-touch 协议开篇，承 D-T127-02。
- **协议**：T-128 的使命主体是 **prompt 正文产品化（Phase 1）+ 产品跑使能（Phase 2）+ 首次真跑（Phase 3）+ 结构硬化（Phase 4）**。其中 prompt 正文撰写 / v1c 接线（已于 T-127 W-13 完成，**D6=否**：v1c 无 run-coordinator/harness，N2/N4 runtime/admission 不调 `invokeNode`、仅引纯 `canonicalHash` leaf）**不触 harness 本体，无需 JD**。凡 T-128 触碰 **WorkflowHarness 壳 / 节点体 / AgentOrchestrator 边界 / 共享 `bounded-debate-core` / 共享压缩 orchestrator** 的改动，**先在本文件追加对应 `D-T128-0N`**（承本条），再实施。
- **本期已登记的 harness-touch 占位**（详见各条）：`D-T128-01`（W-12 N6 升级可达性硬化）、`D-T128-02`（W-11 P-01 压缩恢复 topic-selection 半边，跨 T-124）。后续若 W-14（provider_llm debate 类型并集放宽 + `model_option_id` 穿 role turn，触 `bounded-debate-core`）等启动，再各开 `D-T128-0N`。
- **不变量承诺（全包）**：所有 harness-touch 改动维持 **replay byte-identity**（`invokeNode` 生命周期 + 四类 blocker 顺序 + `hashContext`→`node_replay_key` 组成 + route edges 集合 + 既有 gate/blocker 语义 + 所有 byte-bearing 哈希 不变，除非该条 JD 显式声明并配 golden re-baseline 留痕）；不引入第二套 debate/prompt/context 装配路径（DMP-10 单 core、`prompt_packet_hash` canonicalHash 单源）；不翻 N8/N6 `provisional`、不撤 tripwire（D8）。
- **归属**：T-128（`dev-docs/archive/topic-selection-product-readiness-closure/`，W-01/W-03）。冲突面：本条仅为协议声明，零代码改动。**T-088 若需改 harness 本体 / `bounded-debate-core` / 共享压缩 orchestrator，请在本包 harness-touch 落地前于此协调。**

## D-T128-01 (2026-06-25，回填 2026-07-03) — W-12 N6 升级可达性硬化（承 D-T128-00，联合决策登记）
- **状态：已回填（grounding 2026-07-03）→ 落地中。** 原占位声明经全面 grounding 后**大幅修正**：占位所述「projection 未记录/未穿线」已被 T-127 W-07（`4417477f` 等）超越——harness N6 节点体已对 `n6_regenerate_candidates` **和** `n6_debate_escalation` 两路由构建并记录 `v1b_n6_gate_failure_retry_context` projection（harness `:3114-3126`/`:7378`），coordinator 已对 **debate 升级路由**穿线（`:710-717`，discriminator `loopback_target_code='n6_debate_escalation'`），runtime 消费/校验完整（n6-draft-runtime `:824-926`），且有升级 e2e 测试（harness unit `:5946-6043`）。
- **grounding 修正后的真实残余（W-12 实做范围）**：
  - **(A) 单代理再生 re-entry 的 coordinator 条件穿线**：`buildNextRequest` 的 extraProjection 仅在 debate 路由供给；N6 recipe 无 `required_projection_kind` → 经 coordinator 的单代理再生 re-entry（caller 供 `draft_payload`/`execution_spec`，draft 变体为 `regeneration_after_n6_gate_failure`）的请求 source_refs **不含** projection → harness/runtime 按门语义 block。这是「escalation→retry 软死端」的**真残余**（regenerate 半边）。修法（加法式、presence-based）：N6 re-entry 构建请求时，**若** run 内存在 `loopback_target_code='n6_regenerate_candidates'` 的 gate-failure projection 工件则自动附至 source_refs（discriminator 同款、most-recent）；不存在 → no-op（初次进入 byte-identical）。
  - **(B) 幂等负例守卫**：blocked-then-retry（再生与升级两路由：重进入择取 discriminated/most-recent projection、不产生重复 projection 工件、replay 身份成立）+ crash-mid-debate（部分 role transcript 残留后重进入干净重跑,不误admit 残留;`DEBATE_GATE_DRAFT_MARKER` 仅护 completed→rejection 窗口的语义显式钉测）。
  - **(C) re-entry `generation_mode` caller 契约文档化**：`regeneration_after_n6_gate_failure` ⇒ source_refs 恰一枚 N6 gate-failure projection、无 N7 projection（mode 判定 harness `:8303-8347`）;落 coordinator 既有 caller-contract 文档块 + T-128 03。
- **不改动**：`invokeNode` 生命周期/四类 blocker 顺序/`hashContext`→`node_replay_key`/route edges/既有 N6 三类 blocker/triage policy/`N6_DEBATE_ESCALATION_RECOMMENDED` warning 语义/所有 byte-bearing 哈希;projection 不入 `frozen_input`（source_refs 通道,`frozen_input_hash` 恒等——与既有 debate 穿线同机制）;不新增第二 projection 种类/装配路径。初次进入（无 projection 工件）路径 byte-identical。
- **验证口径**：coordinator+harness 既有套件零回归（含 GUARD_GOLDEN_N1）;新增 (A) 再生穿线单测（driveTo 门失败→re-entry 请求 source_refs 含 discriminated projection→harness admit）+ (B) 两负例守卫;full backend 全绿;证据记 T-128 `04`。
- **归属**：T-128 W-12（Phase 4）。冲突面：coordinator `buildNextRequest`/N6 re-entry 分支加法 + 测试;harness 本体预计零改动（若 (B) 需暴露测缝再回本条补记）。T-088 若同期改 N6 节点体/coordinator 请在此协调。
- **复审修正（2026-07-03,对抗式复审,commit `592c42d0`）**：(A) 的「presence-based（run 生命周期存在性）」被复审证伪为边角 DEFECT——N5 slice 回滚重驱后的**全新** N6 前向进入会误附陈旧 regenerate projection,runtime 对错误附着不豁免而是 fail-close（initial 变体 `N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT`、regenerate 变体 lineage-hash drift）→ 双变体死端,回归 pre-W-12 可用路径。修正为 **pending-aware**：新增 `pendingN6RegenerateLoopback`（镜像 `pendingN6DebateEscalation` 的 loopback+无升级 warning 判定,并借 `pendingN8BoundedDebate` 的 seq 比较排除「N5 已在其后重新 admit」= 全新前向进入）,非 pending → `{}` byte-identical。+1 回归测（N5 重驱后不附着）。coordinator 49/49。harness 本体仍零改动。

## D-T128-02 (2026-06-25) — 占位：W-11 P-01 压缩恢复 topic-selection 半边（承 D-T128-00，跨 T-124 + T-088，联合决策登记）
- **状态：占位（PLACEHOLDER）—— 待 W-11（Phase 4）与 T-124 + T-088 三方协调后回填具体 范围/不改动/设计要点。** 本条按 D6 协议 + 跨包协调在触碰前登记，**当前最大未追踪开口**。
- **认领的开口**（T-123 D3 closure 的孤儿确认义务，T-127 收口未碰 → 现孤儿；W-03 正式纳入 T-128 ledger）：共享 orchestrator 的 `blockForCompressionAttempt` **只记录不恢复**——超预算输入 fail-closed、**无 compress→re-gate→continue 分支**。T-123 D3 要求「topic-selection 侧回归由 T-127 共同确认」但 T-127 收口未做。本包以本条正式认领 **topic-selection 侧回归确认半边**。
- **跨包协调**：压缩恢复主体是**共享 orchestrator 内部改**（`blockForCompressionAttempt` → compress→re-gate→continue），归 **T-124**（`paper-implementation-productization-hardening`）+ **T-088** 主导；本包认领 **topic-selection 侧回归确认**（v1a need-discovery debate fail-closed `runtimeTokenBudgetInput` 从不设 `compression_attempt` 同根，见 T-128 节点审计）。**STEP-7 debate 压缩-facts builder**（N6/N8 debate 传 `compression_attempt:null`、未建 `requiredCompressionFacts`）严格在本恢复**下游**，跟其后做、不独立建。
- **边界承诺**：可达性（W-10 首次真跑）**不阻塞**于此（本条 gates「product-robust」健壮性，非可达性）；维持 replay byte-identity；不翻 provisional / 不撤 tripwire（D8）。
- **归属**：T-128 W-11（Phase 4，coordinates-with T-124 + T-088）。冲突面：共享 orchestrator 属跨包边界，回填前三方在此协调改动点，避免压缩恢复主体与 topic-selection 回归确认重叠或冲突。
- **回填（2026-07-02，W-11 grounding 后落地设计；用户「进入 Phase 4，先做 W-11」授权）**：
  - **实锤证据**：T-128 W-10 run3——真语料 24 条分类批实测 32,632 tokens 超 24k 目标，`TOKEN_BUDGET_REQUIRES_COMPRESSION` 在产品链第一个 LLM 步整链 fail-closed、零 provider 调用（40k 校准是止血，恢复分支才是本体）。
  - **现状勘定**：压缩**验证器**已完整（`TopicSelectionCompressionRuntimeService.createReport`：禁载荷扫描 + 按 profile `preserved_fact_kinds` 的必留事实门 + 前后 token 估计，全确定性）；token gate 已有 `compression_already_applied` 防循环语义（再超 → `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION` 硬 block）；`prompt_packet_hash`/provenance 经 `runtimeCompressionIdentity` 自动折叠 runtime 的 report ref/hash + compressed_context_hash（零新增持久化面）；registry 工厂默认 `required_when_over_budget` + `deterministic_structural` + 策略 id/version 齐备。缺的只是「验证通过后以压缩形态继续」。
  - **范围（S1 orchestrator）**：`TopicSelectionAgentRuntimeCompressionAttemptInput` 增可选 `compressed_messages`；preflight 的 requires_compression+attempt 分支：报告验证/记录**原样**；当质量门非 blocked **且**供有 `compressed_messages` 时，以压缩形态重跑 token gate（`compression_already_applied=true`）——within/unknown-allow → 返回 `compressionApplication`（替换消息 + runtime 补 report ref/hash、compressed_context_hash、already_applied），`invokeStructuredOutput` 对替换后输入**重建 prompt packet** 并走既有执行尾（一次性替换，无递归；身份=实际发送消息）；仍超 → `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION` block 带报告 refs。执行尾（prompt-quality block + executeSource + 输出门 + buildResult）逐字抽取为单一 `finishInvocation` 供两形态复用。
  - **范围（S2 首个 topic-selection 调用方）**：resource-sampling 分类批随 invocation 预供 deterministic_structural attempt（降级文本=摘除 `key_content_digest` 的候选行 + 压缩消息；required facts 声明 `literature_ref`/`candidate_title` 级保留，digest **显式不列 required**——分类可降级依赖 title+abstract+tags）；预算内时 attempt 被 gate 完全忽略（零行为改）。
  - **不改动**：无 `compressed_messages` 时全部既有路径 byte-identical（record+block 语义原样，orchestrator 既有 over-budget/记录/质量门钉测不动；canary over-budget 钉测不动；paper-implementation L5 `*_over_budget_zero_provider_calls` 不受影响——其调用方不供 compressed_messages，启用归 T-124 后续）；无第二 LLM 通路（executor kinds 不变，attempt 仍 caller 预计算、确定性、质量门强制，承 T-124 D3）；gate `decide()` 顺序/码不变；provisional/tripwire 不动（D8）。
  - **T-128 侧回归确认（T-123 D3 孤儿义务）**：以钉测集合完成——既有 fail-closed 全绿 + 新增恢复分支单测（成功续跑带 `COMPRESSION_APPLIED` / 仍超硬 block / 质量门 block 原样 / 缺 compressed_messages 原样）+ full backend 套件。
  - **事故记录**：首次落地被 2026-07-03 22:14 本目录外部 `git reset`（chip 会话引导副作用）清除未提交编辑，本条与 S1 代码为重放；此后 W-11 各步即改即提交。

## D-T128-03 (2026-07-02) — W-10 真跑修复：v1b→v1c bundle_hash 生产者↔校验者单源化（承 D-T128-00，联合决策登记）
- **背景/发现**：T-128 W-10 首次 `run_mode:'product'` 真跑（run7，t128-w10-product-run7-1782993406）v1a+v1b 全链通过后，v1c promotion-input snapshot 判 `needs_upstream_refresh`，blocker=`v1b_to_v1c_bundle_hash_drift`。取证发现**两个生产者、两种载荷形状**：route 路径 `topic-selection-v1b-topic-package-service.ts`（~:1024-1058）以 5 字段（`check_ref`/`package_ref`/`package_version`/`readiness_ref`/`value_disposition_decision_ref`）算 `bundle_hash`，与 v1c 校验器 `expectedV1cBundleHash`（`topic-selection-v1c-promotion-input-service.ts:929`）一致；而 **harness N11 发布路径**（`topic-selection-v1b-workflow-harness-service.ts:~6772`）以 **4 字段异名键**（`package_ref`/`package_readiness_assessment_ref`/`package_trace_boundary_check_ref`/`value_disposition_decision_ref`，无 `package_version`）算——harness 发布的 bundle **结构性永不过** v1c 新鲜度门。单测因 in-memory 仓储无序列化往返、且各侧 fixture 自洽而未暴露；真 Prisma 全链首跑即撞（这正是 W-10 的存在意义）。
- **改动（单源化）**：`topic-selection-v1b-harness-authority-hash.ts`（纯叶，canonicalHash 同源）新增 `v1bToV1cBundleHashPayload` + `hashV1bToV1cBundle`，三处消费：harness N11 构建、topic-package service 路由路径、v1c `expectedV1cBundleHash`。路由路径与校验器输出 **byte-identical**（同形状同函数，零行为改）；harness N11 的 `bundle_hash` 输出改为 5 字段规范形状 = **修复本体**（新 run 生效；run7 历史 bundle 不回填，留作失败证据）。
- **不改动**：`invokeNode` 生命周期 / 四类 blocker 顺序 / `hashContext`→`node_replay_key` / route edges / 其余 byte-bearing 哈希；`hashN10V1cInputBundleAuthority` 函数本体不变（其对 bundle 全记录哈希，`bundle_hash` 字段值变化仅影响**新 run** 的 N10/N11 authority hash，无 golden 钉旧值）；不引入第二哈希路径（DMP-10 / canonicalHash 单源）。
- **验证**：helper 单测（producer↔checker 同源等价）+ v1c promotion-input 既有套件 + full backend 套件 + 真跑过 v1c 门（证据记 T-128 `04-verification.md` 2026-07-02 段）。
- **归属**：T-128 W-10（Phase 3）。冲突面：harness N11 节点体一处表达式替换，加法泄漏面零。**T-088 若同期改 N11 节点体请在此协调。**

## D-27 (2026-07-05) — Profile Escalation Policy Runtime 处置：superseded（T-088 对账收口，联合决策）
- **背景**：profile escalation policy runtime 是本包 00-overview 三大目标之一（AC-3），D-05（2026-05-19）锁定了其边界（允许的决策集 / 无静默跨模式升级 / debate≠escalation / 确定性输入 / 可审计输出）。03 各切片（Slice 2/3/4）持续标注其 pending。2026-07-05 对账核实：**全仓零实现**（无 `ProfileEscalation*` 符号），且此后 6 周的产品化演进（T-107..T-128）从未需要它。
- **决定（用户拍板 2026-07-05）**：登记 **superseded**。实际演化以**显式选择**取代了策略运行时：统一 `TopicSelectionAgentExecutionSpec`（03 §2026-05-24）+ debate `execution_plan`（default/slots/instances，含 per-slot model options，03 §2026-05-23/24）+ T-127 W-07 debate execution plan registry + T-128 W-14 的 route strip / coordinator reject / runtime mixing-guard 产品门控。升级决策由 caller/人工显式指定并经 invocation provenance envelope 全程审计。D-05 要防的「静默升级」风险的消解方式从「策略运行时+审计」变为「**不存在自动升级路径**」——与 D8「无自动翻门」纪律同构。
- **边界**：D-05 作为设计记录**保留不删**；若未来 provider 常态化（T-129 C-3 之后）重新出现自动升级需求，须开新 JD 且遵守 D-05 边界。00-overview AC-3 判定 superseded（引本条）；AC-6 的 "escalation" 覆盖子句同步改判为对显式 `execution_spec`/`execution_plan` 路径的覆盖（既有测试已覆盖 mismatch 拒绝/双轨拒绝语义）。
- **归属**：T-088 对账切片（2026-07-05）。零代码改动。

## D-28 (2026-07-05) — D-09 脚本迁移完成判据修订 + 一次性审计（T-088 对账收口，联合决策）
- **背景**：D-09（2026-05-19）判据要求 typed `WorkflowScenario` registry、CLI 降级 wrapper-only、wrapper 测试、drift check、新 E2E 必须注册 scenario。现实（2026-07-05 盘点）：quality-gate 断言已迁 `topic-selection-workflow-scenario-runner.mjs`（2 个注册 scenario id：canary / scale-quality），但 T-107..T-128 各包按既定实践新增 15+ 独立 acceptance runner（皆经 harness/coordinator 服务）；typed registry / wrapper 测试 / drift check 未实施。判据与现实背离。
- **决定（用户拍板 2026-07-05，经成本/收益对比）**：脚本层不在产品执行路径上（产品路径=routes→coordinator→runtime services→orchestrator→gateway，其鲁棒性由路由/协调器测试、W-14 dormancy+tripwire、sign-off schema、bundle_hash 单源、矩阵一致性脚本、replay goldens 直接守护）；原判据买的 enforcement 可由一次性审计+台账机器校验等价获得，而收紧执行需重排已验证证据链（w15-s4 product run、goldens 等），churn 为净稳定性风险。故：
  1. **完成判据修订**：所有 topic-selection acceptance 脚本的业务语义（节点执行 / prompt 构造 / guardrail-admission 判定 / 权威持久化）必须经 backend 服务层或 `buildApp` HTTP 路由；脚本可做 DI 装配、fixture 种植/清理、按经典链顺序调用节点级 runner，不得自持节点内部语义、不得绕门、不得直连 provider。
  2. **判据退役**：typed scenario registry / wrapper-only CLI / wrapper 测试 / drift check 不再要求，由三层现有守卫接替（矩阵一致性脚本进默认套件 + replay byte-identity goldens + per-package acceptance runner 实践）。
  3. **硬约束保留并升级为机器校验对象**：任何新增 topic-selection E2E/real-flow/debate acceptance 脚本必须在 T-089 `08-scenarios.md` 登记 scenario 条目；scenario 台账 ↔ 脚本映射的机器校验由 T-089 结构化硬化切片③（covered_scenarios 机器校验）实现。
  4. **一次性审计（已执行 2026-07-05）**：18 个 `.ai/scripts/topic-selection-*.mjs` 逐个核查四判据（业务语义经服务层 / 无直连 provider / prisma 直写分类 / 无门禁绕过）。**结论：18/18 合规，零违规**——15 compliant + 3 compliant-with-notes（notes 均为 fixture 种植或门禁负例的测试脚手架：real-e2e 的 bridge status 负例翻转、v1a-harness-e2e 的 T-112 replay fixture 种植、w15-s4 的 env 选仓储模式）。证据表见 04 §2026-07-05。
- **不改动**：D-09 的 Semantic Drift Controls 小节（契约版本化 / 三模式同契约 / fixture 语义集中 / 单向历史 reader）整体保留为纪律；scenario-runner 既有 2 注册 id 不动。
- **归属**：T-088 对账切片（2026-07-05）。零代码改动（③ 的机器校验归 T-089）。
