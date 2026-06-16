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
- 归属：T-123 Phase 4（dev-docs/active/topic-selection-productization-hardening/）。冲突面评估：纯加法、不与 T-088 Phase 2 runtime primitives 重叠。

## D-T123-02 (2026-06-13) — T-123 Phase 3 对 harness 的加法式改动（联合决策登记）
- 范围：`topic-selection-v1b-workflow-harness-service.ts` + v1b harness contracts 新增：
  ① N8 确定性 gate 增加 T1 borderline / T3 维度冲突触发检查——首评（frozen payload 无 `n8_debate_admission_ref`）命中 → 新 blocker 码（loopback 路径）；debate 复评（payload 携带 admission ref）仍命中 → 新 warning 码（准入）。阈值以 provisional 标注进 N8 node policy（契约层数据，非服务内常量）。
  ② N8 runner 实装既已声明的 loopback 路由选择（route edge `RB_N8_N7`、目标码 `n8_feedback_to_n7`，均为既有声明）+ 组装 `N8ToN7Feedback@v1` 工件（既有契约）。
  ③ N7 gate 在 `n7_n8_debate_admission_review` 支持工件存在时发射既已声明的 `n8_debate_level_selected` warning。
  ④ N8 runtime（harness 内部构造）按 handoff 携带的 `n8_debate_admission_ref/hash`（N7 runner 既有织入）选择 debate 草稿生成路径。
- 不改动：`invokeNode` 生命周期、replay key 组成规则、既有 N8 三类 blocker 语义、route edges 集合（仅启用既有声明边）、N9（DP-3.4 收窄为 N8-only，其 loopback 码保持 declared-unused）。
- 设计要点：零新触发引擎（D2）——T1/T3 是纯确定性编码，复用 N6 同形 gate→loopback 机制；复评防环判据用既有 handoff 字段，零新契约字段；debate 运行时本体在 harness 外（共享骨架 + v1b builder，DMP-10 单实现）。
- 归属：T-123 Phase 3（dev-docs/active/topic-selection-productization-hardening/，决策 DP-3.1~3.6 见其 03 §Phase 3 决策）。冲突面评估：纯加法、不与 T-088 runtime primitives 重叠；N8/N7 gate 改动与 T-088 Phase 2 无共享改动点。

## D-T123-03 (2026-06-15) — T-123 Phase 5.1 harness 单文件拆分（机械重构，联合决策登记）
- 范围：`topic-selection-v1b-workflow-harness-service.ts`（现 12,929 行）的**纯机械拆分**——把内聚的**纯函数簇**逐步抽出为独立模块（不改 `WorkflowHarnessService` 类对外契约）：① parse-and-resolve 子系统（`parseN*` frozen payload 解析 + `resolveN*Payload`/`resolveN7SupportContext`/`resolveEarlySemanticSupportPayload` 等纯解析）；② **hash-authority 簇**（`hashContext` 之外的 ~11 个 `hashN*Authority` + ref builder + `outcomeGateResultHash` 的纯计算部分）；③ ref/issue builder 工具（`n7BuildEvidenceRefs`/`uniqueRefs`/`uniqueIssues` 等）。被抽函数改为接收显式参数的 module 级函数（无 `this`），harness 类调用点逐字替换为模块调用。有状态的 per-node runner（依赖 18 个实例依赖）本期不动或仅改薄委托。
- 不改动：`invokeNode` 生命周期与四类 blocker 顺序、replay key 组成规则（`hashContext` → `node_replay_key` 必须 byte-identical）、route edges 集合、所有 gate/blocker 语义、**所有 byte-bearing 哈希**（`frozen_input_hash`/`execution_spec_hash`/`gate_result_hash`/`route_hash`/runtime_admission/11 个 authority hash/`node_replay_key`）、控制面记录形态、契约层。零行为变化。
- 设计要点：复用 v1c debate-core 抽取已验证的**逐字搬迁 + 差分核验**范式（被抽逻辑 byte-identical，pre/post 差分探针互证）。先落 **replay-identity 守卫单测**（对代表性输入钉死 `hashContext`/各 authority hash/`outcomeGateResultHash`/frozen_input_hash 的具体值），每个抽取 slice 前后该守卫 + 全套件必须保持绿；任一哈希漂移即视为回归。增量推进：一簇一 slice，互不耦合者优先（parse/hash/ref builder 纯函数无实例状态，最低风险）。多 session 工程。
- 归属：T-123 Phase 5.1（F-11，dev-docs/active/topic-selection-productization-hardening/，计划见其 03 §Phase 5 + 00-overview Next）。冲突面评估：纯机械、零行为/契约改动；harness 本体属 T-088 WorkflowHarness 边界（D-02），故按 D3 在此联合登记；不引入新 runtime primitive、不与 T-088 Phase 2 改动点重叠。**重构期间 T-088 若需改 harness 本体请先在此协调，避免大范围搬迁冲突。**
- **续推移交（2026-06-16）**：T-123 收尾关闭归档，本 harness 拆分线**所有权移交 T-127 W-12**（`topic-selection-backend-hardening-and-expansion`，相位提前至 Phase 2、**一次拆透 b1**）。后续拆分在 T-127 登记 **D-T127-01** 续此范式（slice 边界 + N1 golden replay-identity 守卫逐字搬迁 + 差分核验承袭）；原 slice 1（dedup-utils）成果保留为起点。本条 D-T123-03 维持历史记录，进行中工作改看 T-127。
