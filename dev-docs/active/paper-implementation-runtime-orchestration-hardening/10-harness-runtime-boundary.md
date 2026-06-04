# 10 Harness Runtime Boundary

## Decision
`PaperImplementationHarness` is the scenario and evidence shell. It is not the production runtime, not the provider executor, not the admission gate, and not the authority writer.

Production promotion MUST introduce explicit runtime slot and admission boundaries before any harness-backed workflow can claim product-mode orchestration coverage.

## Canonical Vocabulary And No-Dual-Track Rule
Existing harness records and new runtime records MUST keep distinct meanings. The implementation must not create a wrapper or compatibility lane that lets the old harness artifact masquerade as a production runtime artifact.

| Term | Canonical meaning | Must not mean |
|---|---|---|
| `workflow_type` | Coarse PaperImplementation workflow family from the existing enum, such as `trace_integrity_review`. | A promoted runtime node by itself. |
| `slot_id` | Production runtime node identity inside a workflow family, such as `trace_integrity_review.boundary_debate`. | A harness scenario name or proposal artifact kind. |
| `PaperImplementationAgentWorkflowHarnessRun` | Existing proposal-harness run record for scenario evidence, proposal capture, gate checks, transition evidence, and queue suggestions in the harness lane. | Runtime role artifact, runtime identity, provider execution proof, or admission record. |
| `PaperImplementationProposalArtifact` | Existing proposal-harness output artifact. | Admitted final runtime artifact for a promoted slot. |
| `PaperImplementationRuntimeArtifactEnvelope` | Generic persistence envelope for runtime artifacts with `artifact_scope=role` or `artifact_scope=final`. | Harness proposal record or domain authority table. |
| `PaperImplementationRuntimeRoleArtifact` | Logical role-scope runtime artifact carried by `PaperImplementationRuntimeArtifactEnvelope` when `artifact_scope=role`. | Physical table per role, domain authority, or queue item. |
| `PaperImplementationRuntimeAdmissionRecord` | New admission verification record for a runtime role or final artifact. | Semantic discovery, retry, prompt construction, or queue materialization. |
| `TraceIntegrityRoleArtifact@v1` | Trace-specific role payload inside the runtime role artifact envelope. | Separate business lane or standalone authority object. |
| `TraceIntegrityDebateArtifact@v1` | Trace-specific final runtime artifact after arbiter output and final admission. | A harness proposal artifact or intermediate role artifact. |

No-dual-track rule:
- For a promoted `slot_id`, product-mode domain flow MUST consume only the admitted final runtime artifact.
- The existing harness may launch or replay scenarios and record refs to runtime artifacts after the fact, but it MUST NOT produce the domain-facing final artifact for that promoted slot.
- `PaperImplementationAgentWorkflowHarnessRun` and `PaperImplementationProposalArtifact` MUST NOT be wrapped, aliased, or projected as `PaperImplementationRuntimeArtifactEnvelope`, `PaperImplementationRuntimeRoleArtifact`, `PaperImplementationRuntimeAdmissionRecord`, or `TraceIntegrityDebateArtifact@v1`.
- Unpromoted workflows may continue to use the existing proposal-harness path, but a workflow becomes runtime-governed only when a concrete `slot_id` is promoted. `workflow_type` alone is not enough to infer runtime promotion.
- Domain services MUST reject promoted-slot inputs that arrive as harness proposal artifacts instead of admitted final runtime artifacts.

## Layer Ownership
| Layer | Owns | May call | Must not call or mutate |
|---|---|---|---|
| `PaperImplementationHarness` | scenario fixtures, replay/stress orchestration, blocked-path assertions, proposal run capture, queue/blocker evidence | runtime facade, read-only domain query services, harness repository | provider SDKs, `BackendLlmGateway` directly, prompt/cache/token/compression kernels, admission overrides, domain state writers |
| `PaperImplementationRuntimeSlot` | slot context compilation, prompt/profile binding, prompt variant, context packet cache, prompt packet cache, response-reuse guard, runtime identity, token-budget gate, compression policy, runtime audit envelope | `AgentOrchestrator` or neutral shared runtime facade; read-only context resolvers; runtime cache/index repositories | domain authority persistence, queue resolution, experiment submit/sync/cancel, provider responses as business cache entries |
| `AgentOrchestrator` / `BackendLlmGateway` | model execution, structured output validation, provider telemetry, retry/escalation mechanics | provider adapters, model/profile registry, telemetry sinks | PaperImplementation domain repositories, trace/claim/dossier writers, harness scenario decisions |
| `PaperImplementationRuntimeAdmission` | runtime artifact admission, identity/hash recomputation, provenance class, forbidden-field checks, side-effect boundary, output normalization | read-only runtime artifacts, trace/source lookup, domain gate facades | provider execution, prompt construction, state mutation, hidden fallback |
| Domain services | motive, evidence, validation, work-order, trace, result, claim, dossier deterministic gates | admitted runtime proposal/support artifacts, repositories, queue services | provider calls, prompt/cache/token policy, unverified runtime output |
| `StateWriter` / admitted domain writer | authority mutation after deterministic gates, trace, confirmation, and accepted-risk checks | domain services and repositories | LLM/provider execution, experiment execution, harness-only decisions |
| Workbench/UI | read models, queue commands, human decisions | backend routes | runtime internals, direct authority shortcuts, local readiness authority |

## Allowed Flow
The product-mode flow MUST be linear at boundaries even when the harness runs multi-scenario cases:

1. Harness selects a scenario and target `workflow_type`.
2. Harness calls a runtime facade with refs, hashes, run mode, execution mode, and slot id.
3. Runtime slot invokes deterministic statement/retrieval preparation, compiles context, resolves context/prompt cache policy, checks token/compression policy, builds prompt/cache identity, and invokes `AgentOrchestrator` when execution is needed.
4. Runtime emits a ref-backed runtime artifact plus audit envelope. Provider output is never business authority.
5. Admission recomputes runtime identity, output hash, source refs, trace refs, and forbidden-field checks.
6. Domain service consumes only the admitted final runtime artifact for a promoted slot and still runs deterministic gates.
7. State writer mutates authority only after deterministic gates, trace rules, queue/human decisions, and accepted-risk rules pass.
8. Harness records scenario evidence and assertions after the fact.

Harness may orchestrate several branches, but each branch still follows this sequence. A branch cannot skip admission because another branch passed.

## Boundary Contracts
### Harness Request Contract
Harness-to-runtime requests MUST include:
- `scenario_id`
- `slot_id`
- `workflow_type`
- `target_ref`
- `input_refs`
- `source_hash_bundle`
- `run_mode`
- `execution_mode`
- `expected_output_schema_id`
- `allowed_side_effects`, normally empty for LLM-backed slots
- `harness_run_ref`

Harness-to-runtime requests MUST NOT include:
- raw provider credentials
- executable prompt text outside a registered template/profile path
- hidden reasoning
- authority write instructions
- pre-admitted output hashes supplied as trusted facts

### Runtime Result Contract
Runtime results MUST include:
- `runtime_artifact_ref`
- `context_packet_ref/hash`
- `runtime_invocation_context_hash`
- `prompt_packet_ref`
- `prompt_packet_hash`
- `prompt_template_id`
- `prompt_template_version_id`
- `prompt_variant_id`
- `prompt_redaction_policy_hash`
- `context_policy_profile_hash`
- `cache_policy_profile_hash`
- `context_cache_key_hash`
- `context_cache_status`
- `context_cache_result_ref/hash` when a context packet cache entry is used or written
- `prompt_packet_cache_key_hash`
- `prompt_packet_cache_status`
- `prompt_packet_cache_result_ref/hash` when a prompt packet cache entry is used or written
- `model_profile_id`
- `model_option_id` when provider-backed
- `token_budget_gate_result_ref/hash`
- `compression_policy_profile_hash`
- `compression_status`: `not_needed`, `applied`, or `failed`
- `compression_report_ref/hash` when used
- `compressed_context_packet_ref/hash` when compression is applied
- `output_schema_id`
- `output_hash`
- `runtime_audit_ref/hash`
- `execution_mode`
- `executor_kind`
- `provider_call_count`
- `response_reuse_status`
- `response_reuse_decision_ref/hash`
- `blockers`
- `warnings`

Runtime results MUST NOT include rendered prompt text, hidden reasoning, unredacted prompt content, provider secrets, or authority status such as `claim_ready`, `dossier_ready`, `motive_admitted`, or `work_order_submitted` unless the authority-like field is clearly labeled as a proposal field and revalidated by admission/domain gates.

Context and prompt cache entries are runtime metadata and ref-backed artifacts only. They MUST NOT store domain authority payloads, raw provider responses, provider secrets, hidden reasoning, or unredacted prompt content.

### Runtime Prompt Token Compression Contract
Prompt construction, token budgeting, compression, and prompt/cache identity are runtime responsibilities.

| Concern | Runtime responsibility | Other layers |
|---|---|---|
| Prompt template/profile binding | Resolve registered prompt template, version, variant, model profile, output schema, redaction policy, and role slot. | Harness may request a registered profile/slot; it must not supply rendered prompt text. |
| Prompt packet construction | Build a ref-backed prompt packet from the final context packet, retrieval packet, prior role artifacts, template/profile identity, and output schema. | Admission verifies hashes and schema; Domain/UI must not inspect prompt internals as business evidence. |
| Token budget gate | Estimate prompt/input/output token budget before executor call and emit `token_budget_gate_result_ref/hash`. | If the gate blocks, provider call count must be zero. |
| Compression | Apply only registered compression policies and emit `compression_report_ref/hash`, `compression_status`, and compressed context refs when used. | Harness cannot choose ad hoc compression; Admission cannot recompress or repair context. |
| Cache identity | Compute context cache and prompt packet cache keys after compression/redaction identity is known. | Cache hits are metadata reuse only and do not skip admission or domain gates. |

Compression is a runtime context transformation, not semantic repair. A compression report MUST record input/output context hashes, compression policy profile, preserved source refs, dropped or summarized sections, quality-gate status, and whether failure/negative/challenge refs were preserved. Compression MUST NOT drop refs that affect trace support, failure evidence, negative/inconclusive runs, challenge bindings, or blocker interpretation. If required compression cannot pass quality gates, runtime returns `failed_runtime` and does not call the executor.

### Admission Contract
Admission MUST recompute or verify:
- slot id and workflow type match;
- runtime artifact hash and output hash;
- prompt/context/profile/schema/version identity;
- context cache and prompt packet cache hits match slot, profile, source refs, source hashes, prompt variant, output schema, compression identity, and redaction policy;
- prompt packet refs, prompt template/version/variant, token-budget result, compression report, and compressed context refs match runtime identity;
- source refs are in the admitted input snapshot;
- trace refs are complete and target the expected object;
- memo/rationale/summary fields are not treated as evidence;
- provider-required slots did not use provider response reuse;
- product-mode output is not fixture replay, mock output, or legacy-unverified support;
- output contains no direct authority mutation request;
- normalized proposal/support artifact refs are stable.

Admission MAY return an admitted support/proposal artifact with a normalized blocker set, or an admission rejection. Admission MUST NOT invoke a provider, regenerate output, rebuild prompts, recompress context, invent semantic blockers, materialize queue items, resolve a queue item, or write domain authority.

### Role Artifact And Admission Granularity
Multi-role runtime nodes MUST separate role-level execution evidence from final domain-facing artifacts.

Role-level runtime artifact rules:
- every executed role emits a ref-backed role runtime artifact;
- role artifacts carry role slot id, call index, input refs/hashes, prior role artifact refs/hashes, prompt/cache/token/compression identity, output schema, output hash, executor provenance, provider call count, retry attempt index, response reuse status, and runtime audit refs;
- role artifacts are runtime evidence only and are not domain authority;
- role artifacts MUST NOT contain rendered prompt text, hidden reasoning, provider secrets, authority write instructions, or local readiness decisions.

Per-role admission rules:
- per-role admission runs before the next role consumes a prior role artifact;
- per-role admission verifies schema, role slot id, call index, retrieval/context refs, prior role hashes, prompt/cache/token/compression/redaction identity, allowed refs, output hash, provider response reuse, and forbidden authority fields;
- per-role admission returns an admitted role artifact ref/hash or an admission rejection;
- per-role admission MUST NOT create semantic blockers, materialize queue items, decide domain transitions, or act as a second arbiter.

Final artifact rules:
- only the admitted final artifact is passed to Domain Gate;
- Domain Gate MUST NOT consume intermediate role artifacts to decide workflow state;
- intermediate role artifacts may be resolved for replay, debugging, runtime audit, cache identity, and final-admission verification only.

If a per-role admission rejects, the multi-role attempt stops before the next role. The rejection is a technical/admission failure, not a paper-quality semantic blocker.

### Blocker And Queue Ownership
Production complexity MUST be controlled by this rule:

```text
Runtime owns discovery.
Admission owns verification.
Domain Gate owns state transition.
```

Runtime service owns discovery of retrieval, preflight, semantic-debate, provider/schema, and runtime-execution outcomes. It returns one of:
- `passed`: role artifacts and final artifact are complete enough for admission;
- `blocked`: a typed blocker set explains why the target cannot proceed;
- `failed_runtime`: a technical runtime failure such as provider/schema/parse exhaustion, not a semantic blocker.

Admission verifies identity, schema, forbidden fields, retrieval packet identity, source hashes, role lineage, and blocker taxonomy. Admission may reject invalid artifacts, but it MUST NOT create new semantic blockers, build retrieval context, decide queue item shape, or reinterpret provider failures as paper-quality blockers.

Domain gate consumes admitted blockers and runtime status to create queue items, loopback work, or state transitions. Queue materialization is a domain workflow decision, not a runtime or admission side effect.

## Failure Semantics
| Failure | Owner | Required behavior |
|---|---|---|
| Missing/invalid scenario fixture | Harness | block scenario before runtime; record harness evidence only. |
| Unknown slot/profile/schema | Runtime slot | block before context compilation or provider call. |
| Token over budget with no allowed compression | Runtime slot | return `failed_runtime`; provider call count must be zero. |
| Compression quality failure | Runtime slot | return `failed_runtime`; provider call count must be zero if failure occurs before executor call. |
| Context or prompt cache stale/drift | Runtime slot | miss or block by slot policy; never return a cache hit with stale source/profile/schema/prompt/compression identity. |
| Retrieval packet build failure | Runtime service | return `blocked` with typed retrieval/trace/source blockers; do not call semantic roles with incomplete context. |
| Retrieval packet stale or source hash drift before role execution | Runtime service | return `blocked`; do not repair refs and do not ask roles to compensate for drift. |
| Provider-required exact response reuse hit | Runtime slot/admission | treat as miss/block and execute live provider call only if token/provider gates pass. |
| Provider unavailable or provider error | Runtime/orchestrator | bounded retry only if policy allows; otherwise return `failed_runtime`, no mock/cache fallback. |
| Schema/output validation failure | Runtime then admission | bounded retry if policy allows; otherwise return `failed_runtime` or admission rejection with ref-backed evidence. |
| Provider/schema/parse retry exhausted | Runtime/orchestrator | return `failed_runtime`; do not emit semantic blockers and do not fall back to mock/cache/replay. |
| Source hash, trace, or target drift detected after runtime | Admission/domain gate | reject or block before deterministic gate or authority write; do not rebuild context in admission. |
| Deterministic domain gate failure | Domain service | create queue/repair/loopback context; runtime success is not business success. |
| Human confirmation required | Domain service/workbench | create queue item; harness/runtime cannot auto-confirm. |

## Retry And Fallback Policy
First-slice runtime retry policy is intentionally narrow:

| Case | Retry policy | Result when exhausted |
|---|---|---|
| Retrieval build failure, stale trace, source hash drift, target mismatch | no retry | `blocked` with typed blocker. |
| Semantic disagreement between debate roles | no retry and no second debate round | unresolved disagreement becomes `blocked`. |
| Provider error, schema validation failure, or parse failure | max one same-profile retry for the same role and same prompt/context identity | `failed_runtime`. |
| Context/prompt cache stale or drift | no retry as a cache hit; miss or block by policy | miss/block with audit evidence. |
| Profile escalation | disabled in first slice | `failed_runtime` or `blocked`, depending on root cause. |
| Mixed-role execution mode | disabled in first slice | reject before execution. |

Retry attempts MUST preserve slot id, role id, prompt/context identity, source hashes, execution mode, model profile, output schema, and cache identity. Retry attempt index belongs in runtime audit, not in domain authority.

Runtime MUST NOT use retry exhaustion as a reason to fall back to `mocked_llm`, fixture replay, prompt cache, historical provider output, or a weaker execution profile.

## Forbidden Coupling
These patterns are production blockers:
- Harness imports provider adapters, `BackendLlmGateway`, or provider-specific SDKs.
- Harness computes prompt packet hash, context/prompt cache key, cache hit status, token budget decision, compression result, or admission identity.
- Harness wraps `PaperImplementationAgentWorkflowHarnessRun` or `PaperImplementationProposalArtifact` as a runtime role artifact, admission record, or final debate artifact.
- Runtime writes motive, validation cycle, work order, trace, claim, dossier, or writing packet authority.
- Runtime stores provider responses, domain authority payloads, prompt payloads, hidden reasoning, secrets, or unredacted private content in cache indexes.
- Admission invokes providers or silently regenerates missing support.
- Admission rebuilds prompt packets, recompresses context, or changes token/compression decisions.
- Domain services call providers or inspect prompt/cache internals.
- Product-mode provider failure falls back to `mocked_llm`, fixture replay, prompt cache, or historical provider output.
- Exact response reuse satisfies `provider_llm`.
- UI calls runtime internals or writes readiness locally.
- Retired `research-argument` or pre-writing control-plane artifacts re-enter as wrappers or compatibility inputs.

## Multi-Scenario And Debate Boundary
Harness may define scenario sets, expected blockers, and branch assertions. Runtime/admission must own branch identity for any output that can be admitted.

Debate roles are independent runtime slots when they invoke LLM/Codex/provider execution. A critic, arbiter, or final synthesis prompt MUST have a distinct `slot_id`, prompt variant, source hash bundle, and audit envelope. Harness may decide which debate scenario to run; it cannot collapse role outputs into authority.

Multi-scenario outputs MUST be admitted one branch at a time. The selected branch is a deterministic domain decision or human decision, not a harness preference.

Debate execution MUST be owned by RuntimeSlot/runtime services. Harness may select `mocked_llm`, `codex_assisted`, or `provider_llm` through a registered profile, but every role invocation must run through the same shared runtime boundary. First-slice trace debate defaults to `codex_assisted` for semantic roles and rejects mixed execution modes within one debate attempt.

Retrieval packet construction is a runtime-service responsibility. Harness may supply target/scenario refs, but it must not call the retrieval service or inject unverified retrieval packets. Admission may verify an existing retrieval packet; it must not build a new runtime context.

## Code Review Checklist
Use this checklist before implementing any promoted slot:
- Does the harness avoid direct provider/runtime-kernel imports?
- Does every promoted slot have a `slot_id` and profile identity?
- Does RuntimeSlot own context/prompt cache keying, stale/drift policy, metadata-only persistence, and response-reuse guard?
- Does provider mode fail closed instead of using mock/cache/replay fallback?
- Does admission recompute identity instead of trusting harness-supplied hashes?
- Does runtime success still pass through deterministic domain gates?
- Are prompt/cache/token/compression artifacts metadata/ref-backed and not authority payloads?
- Are intermediate role artifacts admitted only for role chaining and final verification, not domain state transitions?
- Are debate and multi-scenario branches represented with distinct slot/scenario identity?
- Are queue/human confirmation paths explicit when authority risk remains?

## First-Slice Boundary Application
| Slot | Harness responsibility | Runtime responsibility | Admission responsibility | Domain Gate responsibility |
|---|---|---|---|---|
| `trace_integrity_review.boundary_debate` | build semantic trace-risk scenarios and expected blocker assertions; record runtime refs after execution | run bounded support/skeptic/reconcile/arbiter role slots, resolve context/prompt cache, record role artifact hashes and per-role prompt/cache/token/compression/audit identity | verify trace refs, target refs, source hashes, role artifact lineage, prompt/compression identity, memo-role guard, final blocker coverage, and final artifact identity | consume only admitted `TraceIntegrityDebateArtifact@v1`; materialize trace repair queue or loopback from admitted blockers |
| `claim_boundary_review.boundary_debate` | run overclaim/failed-run/source-locator scenarios and debate fixtures; record runtime refs after execution | execute critic/adjudicator slots with distinct prompt variants, cache identities, and audit envelopes | verify claim trace, support/challenge refs, failed-run inclusion, no-overclaim gate, and final artifact identity | run deterministic claim gate; no claim authority from harness proposal artifacts |
| `dossier_readiness_prep.readiness_audit` | run ready/park/abandon and writing-packet-bypass scenarios; record runtime refs after execution | compile dossier readiness context and alternatives, resolve cache policy, record runtime identity | verify dossier version, readiness gate refs, trace/claim packet refs, failed-run count, and final artifact identity | run deterministic dossier readiness gate; writing packet remains projection |

## Verification To Add
Future implementation MUST add tests that prove:
- a harness-only run cannot call a provider;
- a provider-required runtime slot calls the shared gateway and blocks response reuse;
- context/prompt cache hits are exact identity matches and stale/drifted cache entries miss or block;
- prompt/context cache indexes remain metadata-only and ref-backed;
- over-budget runtime blocks before provider call;
- prompt packet, token-budget, compression, redaction, and cache identities are emitted by RuntimeSlot and verified by admission;
- per-role admission rejection stops the multi-role chain before the next role and does not create a semantic blocker or queue item;
- promoted-slot domain flow rejects harness proposal artifacts that are not admitted final runtime artifacts;
- existing harness records can reference runtime artifacts for evidence but cannot satisfy runtime/admission contracts;
- admission rejects placeholder/fixture/legacy runtime identity in product mode;
- runtime success cannot bypass trace, claim, dossier, WorkOrder, or human confirmation gates;
- multi-scenario exact replay creates no duplicate authority writes;
- drift in source refs, prompt/profile/schema, cache result, compression report, or runtime audit blocks admission.
