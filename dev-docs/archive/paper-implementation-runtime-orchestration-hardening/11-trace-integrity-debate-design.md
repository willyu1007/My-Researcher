# 11 Trace Integrity Debate Design

## Decision
The first promoted PaperImplementation runtime node SHOULD be `trace_integrity_review.boundary_debate`.

The node is a bounded semantic trace debate. The node is not a trace-manifest validator, trace repair writer, or claim/dossier authority gate. The node determines whether the target object's semantic conclusion is genuinely supported by the trace/evidence/run lineage available in the bounded implementation context.

> **D-16 source refinement（2026-07-12）**：future/productized retrieval separates eligible scientific RunEvidenceUnit from immutable closed-Cycle execution-accounting refs. Failed/cancelled/incomplete execution comes from the exact Cycle closure snapshot/hash; complete valid negative/inconclusive scientific results may remain REU on a separate disposition axis. Sidecar/project-wide failed-REU scans are not source authorities.

## Why Debate Is Required
Deterministic checks can catch missing manifests, stale refs, target mismatch, and memo-as-evidence violations. They cannot reliably catch semantic support gaps such as:
- a trace covers background context but not the actual claim;
- a source locator exists but points to the wrong evidence granularity;
- a result interpretation is being used as primary evidence;
- a failed/cancelled/incomplete execution snapshot entry or a valid negative/inconclusive scientific result is omitted from the reasoning chain;
- a challenge or conflict binding is absent from the claimed support path;
- a support chain makes an unsupported leap from evidence to writing-facing conclusion.

The debate is therefore required for product promotion of the node, but the debate MUST be bounded.

## Bounded Debate Shape
The node uses deterministic preflight plus exactly four fixed semantic runtime role slots:

| Step | Slot id | Role | Purpose | Output |
|---|---|---|---|---|
| 0 | deterministic preflight | rule gate | Check manifest, target, freshness, source locator presence, memo-as-evidence, and allowed source families before runtime. | `preflight_blockers`, `retrieval_packet_ref/hash` |
| 1 | `trace_integrity_review.support_mapper_map` | support mapper | Build the strongest ref-backed support map for each reviewed semantic statement. | `support_map` |
| 2 | `trace_integrity_review.skeptic_challenge` | skeptic | Find support gaps, source mismatch, omitted failures, omitted challenges, and unsupported leaps. | `challenge_findings` |
| 3 | `trace_integrity_review.support_mapper_reconcile` | targeted reconcile | Resolve each skeptic finding as accepted blocker, resolved with refs, or rebutted with refs. No broad regeneration. | `finding_resolution_map` |
| 4 | `trace_integrity_review.arbiter_final` | arbiter | Produce the final machine-readable trace integrity artifact and blocker set. | `TraceIntegrityDebateArtifact@v1` |

There is no open-ended conversation. There is no dynamic role creation. There is no second debate round in the first slice. Unresolved disagreement becomes a blocker.

## Executor Decision
Debate execution is owned by `PaperImplementationRuntimeSlot`, implemented by a future `PaperImplementationTraceIntegrityDebateRuntimeService` or equivalent runtime facade. Harness selects the scenario and execution profile, but the harness does not execute role prompts, choose provider SDKs, compute cache keys, or repair failed role outputs.

All semantic role slots MUST execute through the shared runtime boundary:

```text
PaperImplementationHarness
  -> PaperImplementationTraceIntegrityDebateRuntimeService
  -> AgentOrchestrator or neutral shared runtime facade
  -> BackendLlmGateway only when execution_mode=provider_llm
```

First-slice execution modes:

| Mode | Executor owner | Allowed use | Provider calls | Notes |
|---|---|---|---|---|
| `mocked_llm` | Runtime service fixture executor | L1/L2 deterministic tests and harness fixtures | 0 | Fixture output must still pass per-role admission. |
| `codex_assisted` | Runtime service Codex-assisted executor path | Local acceptance and development diagnosis | 0 provider calls | Useful for fast semantic quality iteration; not live-provider proof. |
| `provider_llm` | `AgentOrchestrator -> BackendLlmGateway` | Product-capable path and L4 canary | exactly one live call per executed role unless blocked before call | Response reuse must miss/block; provider failure fails closed. |

Default first-slice profile:
- `codex_assisted` is the default semantic execution mode for all four role slots.
- `mocked_llm` is fixture/test-only.
- `provider_llm` is an explicit L4 canary/product-capable profile, not the default profile for the first implementation slice.
- No runtime may silently downgrade from `provider_llm` to `codex_assisted` or `mocked_llm`.

The first slice SHOULD use one execution mode for all four semantic roles in a debate attempt. Mixed-role execution modes are deferred because they complicate cache identity, retry semantics, and provider evidence. A later profile MAY allow role-specific model options, but only after the same-mode profile is proven.

Executor kind:
- `bounded_semantic_debate` for the whole debate attempt;
- `semantic_support_mapper`, `semantic_skeptic`, `semantic_reconcile`, and `semantic_arbiter` for role-level provenance;
- `deterministic_preflight` for step 0.

Runtime MUST persist role-level execution provenance: `execution_mode`, `executor_kind`, `model_profile_id`, `model_option_id` when provider-backed, prompt/profile/cache identity, provider call count, and response reuse status.

## Bounded Deep Search
Deep search is deterministic and bounded before role execution. Runtime roles consume the same ref-backed retrieval packet.

Allowed source families:
- target object and declared source refs;
- trace manifests and trace lineage refs;
- citation candidates and source locators;
- claim trace packets;
- evidence board assertions, bindings, challenge bindings, and transfer bindings;
- validation cycle, route, probe, and experiment-plan refs directly tied to the target;
- eligible run evidence units, including complete valid positive, negative, and inconclusive scientific results;
- exact immutable closed-Cycle snapshot/hash entries for failed, cancelled, and incomplete execution;
- result packets, failure summaries, limitations, and result interpretations, explicitly labeled as non-primary evidence;
- dossier readiness refs when the target is dossier-facing.

Bounds:
- `max_depth = 2`;
- source family allowlist is mandatory;
- retrieval packet MUST carry source refs, source hashes, family labels, and freshness status;
- role prompts MUST NOT re-read mutable project state outside the retrieval packet;
- missing relevant source family is a blocker or warning, not a reason for unbounded search.

## Retrieval Service Caller
`TraceIntegrityRetrievalPacket@v1` is built by a deterministic read-only service, tentatively named `PaperImplementationTraceIntegrityRetrievalService`.

Caller rules:
- `PaperImplementationTraceIntegrityDebateRuntimeService` is the only product-path caller of `buildRetrievalPacket`.
- Harness calls the debate runtime service, not the retrieval service.
- Runtime role slots consume the built retrieval packet; they never call the retrieval service directly.
- Admission may read the retrieval packet and call a verification/read method, but admission must not call `buildRetrievalPacket` to create a new runtime context.
- Domain services and state writers do not call the retrieval service.
- UI/workbench does not call the retrieval service.

Allowed methods:
- `buildRetrievalPacket(request)`: runtime-service only; creates the ref-backed packet from target refs, statement packet, source family allowlist, and source hashes.
- `verifyRetrievalPacket(packetRef, expectedIdentity)`: admission/read-only verification; checks packet identity, freshness, source hashes, and allowlist coverage without expanding context.

Replay and fixture rules:
- `run_mode=replay` may supply an existing `retrieval_packet_ref/hash`, but the runtime service must verify the packet before role execution.
- `mocked_llm` fixtures may include retrieval packets, but they still pass the same runtime/admission verification.
- No path may let Harness inject an unverified retrieval packet into role prompts.

## Failure And Queue Boundary
The trace debate follows the shared complexity rule:

```text
Runtime owns discovery.
Admission owns verification.
Domain Gate owns state transition.
```

`PaperImplementationTraceIntegrityDebateRuntimeService` returns one status:
- `passed`: deterministic preflight and all required role artifacts completed, with no final blockers;
- `blocked`: retrieval/preflight/debate completed enough to identify typed blockers;
- `failed_runtime`: provider/schema/parse/runtime execution failed after bounded retry, so no paper-quality semantic conclusion is claimed.

Runtime discovery rules:
- retrieval build failures become `blocked` with existing trace/source blocker codes such as `trace_manifest_missing`, `source_locator_missing`, `source_ref_drift`, or `claim_trace_packet_missing_required_lineage`;
- stale retrieval packets become `blocked` with `trace_manifest_stale`, `source_ref_drift`, or `stale_evidence_changes_claim_boundary`;
- semantic gaps found by debate roles become `blocked` with the fixed blocker taxonomy below;
- provider/schema/parse exhaustion becomes `failed_runtime`, not a semantic blocker.

Admission rules:
- verify retrieval packet identity, source hashes, role artifact hashes, output schema, forbidden fields, and blocker taxonomy;
- reject invalid artifacts with admission errors;
- do not invent semantic blockers;
- do not build or refresh retrieval packets;
- do not materialize work queue items.

Domain gate rules:
- consume only admitted `TraceIntegrityDebateArtifact@v1` outputs;
- translate admitted blockers into queue items, loopback work, or state transitions;
- keep queue item shape and workflow transitions outside runtime/admission.

## Retry Policy
First-slice trace debate does not use retry as a semantic improvement mechanism.

Allowed retry:
- provider/schema/parse technical failure MAY retry once;
- retry MUST use the same role slot, prompt/context identity, execution mode, model profile, output schema, retrieval packet hash, and prior role artifact hashes;
- retry attempt index is audit metadata only.

Forbidden retry/fallback:
- no second debate round;
- no retry for retrieval build failure, stale trace, source hash drift, target mismatch, or missing source families;
- no retry to resolve semantic disagreement;
- no automatic profile escalation;
- no mixed-role execution mode inside one debate attempt;
- no fallback from `provider_llm` to `codex_assisted`, `mocked_llm`, fixture replay, prompt cache, or historical provider output.

Exhaustion semantics:
- semantic/retrieval failures return `blocked` with typed blockers;
- provider/schema/parse exhaustion returns `failed_runtime`;
- `failed_runtime` MUST NOT contain semantic paper-quality blocker claims.

> **取代注记（2026-07-12，D9 已签核，T-124 S3-α 实施）**：本节"整场 debate 无断点、失败即全链重跑"的隐含语义已被 D9 resume 契约取代（决策见 `dev-docs/active/paper-implementation-productization-hardening/00-overview.md` D9 段，工单见同包 `10-s3-workorder.md` §S3-α1）。`RunPaperImplementationTraceIntegrityDebateRuntimeRequest` / `RunPaperImplementationP1RuntimeReviewRequest` 现支持可选 `resume_from_run_id`：同一 run 身份下复用该 run 已 admitted 的 role artifact 前缀（同 retrieval packet hash / source bundle hash、同 profile/prompt identity，逐角色 admission 复核），从首个缺失角色继续执行，新角色沿用原 run_id 的下一 call 序；identity/hash 漂移拒续（409）、跨 slot/项目复用拒绝、已 admitted 角色不重发 provider 调用、已有 admitted final 的 run resume 幂等返回原 final。定性为技术续跑，不构成语义 fallback 或 provider 响应复用——本节 Forbidden retry/fallback 列表其余条目继续有效。历史正文保持不改。

## Prompt Token Compression Runtime Contract
Every semantic role slot is a runtime invocation with its own prompt packet, token gate, compression decision, cache identity, and audit envelope.

Per-role runtime artifact MUST include:
- `role_slot_id`;
- `call_index`;
- `context_packet_ref/hash`;
- `retrieval_packet_ref/hash`;
- `prior_role_artifact_refs/hashes`;
- `prompt_packet_ref/hash`;
- `prompt_template_id`;
- `prompt_template_version_id`;
- `prompt_variant_id`;
- `prompt_redaction_policy_hash`;
- `output_schema_id`;
- `model_profile_id`;
- `model_option_id` when provider-backed;
- `execution_mode`;
- `executor_kind`;
- `token_budget_gate_result_ref/hash`;
- `compression_policy_profile_hash`;
- `compression_status`: `not_needed`, `applied`, or `failed`;
- `compression_report_ref/hash` when used;
- `compressed_context_packet_ref/hash` when compression is applied;
- `context_cache_key_hash`;
- `context_cache_status`;
- `prompt_packet_cache_key_hash`;
- `prompt_packet_cache_status`;
- `response_reuse_status`;
- `provider_call_count`;
- `runtime_audit_ref/hash`;
- `output_hash`.

Prompt rules:
- Runtime builds prompt packets only from the retrieval packet, reviewed statement packet, prior admitted role artifacts, registered prompt template/version/variant, model profile, output schema, and redaction policy.
- Harness must not provide rendered prompt text or prompt packet hashes as trusted facts.
- Role prompts must not re-read mutable project state outside the retrieval packet and prior admitted role artifacts.
- Rendered prompts and hidden reasoning must not be stored in domain artifacts, cache indexes, or admission outputs.

Token and compression rules:
- Runtime estimates token budget before each role executor call.
- If the prompt is over budget and compression is allowed, runtime applies the registered compression policy before prompt packet cache identity is finalized.
- Compression must preserve source refs, trace refs, eligible negative/inconclusive REU refs, closed-Cycle failed/cancelled/incomplete Run/Attempt refs, challenge refs, blocker-relevant refs, and role artifact lineage.
- Compression report must state which sections were preserved, summarized, or dropped and must include a quality-gate decision.
- Token over-budget without allowed compression, or compression quality failure, returns `failed_runtime` with zero provider calls when failure occurs before executor invocation.

Admission rules for prompt/compression:
- Per-role admission verifies prompt packet hash, prompt template/version/variant, output schema, token-budget result, compression report hash, compressed context hash when present, cache key/status, and redaction policy hash.
- Admission must not rebuild prompts, recompress context, alter cache decisions, or infer missing prompt/compression identity.

## Role Artifact And Admission Granularity
Each semantic role produces a `TraceIntegrityRoleArtifact@v1`. The final arbiter role additionally produces the `TraceIntegrityDebateArtifact@v1`.

Both payloads are persisted through `PaperImplementationRuntimeArtifactEnvelope`:
- role payloads use `artifact_scope=role`;
- final payloads use `artifact_scope=final`;
- role-specific content stays inside the payload contract and must not create per-role persistence tables.

Role artifact chain:

| Role | Runtime artifact | Per-role admission purpose | Next consumer |
|---|---|---|---|
| `support_mapper_map` | support map role artifact | verify support-map schema, refs, prompt/cache/token/compression identity, and no authority fields | `skeptic_challenge` |
| `skeptic_challenge` | challenge role artifact | verify challenge schema, referenced support-map hash, allowed refs, and no new source refs | `support_mapper_reconcile` |
| `support_mapper_reconcile` | reconcile role artifact | verify every skeptic finding has one disposition and rebuttals cite allowed refs | `arbiter_final` |
| `arbiter_final` | final arbiter role artifact plus `TraceIntegrityDebateArtifact@v1` | verify final blocker coverage, lineage, runtime identity, and proposal-only boundary | Domain Gate, after final admission only |

Per-role admission is a chaining gate, not a domain gate:
- RoleAdmissionService decides whether one role artifact may be consumed by the next role;
- RoleAdmissionService returns an admitted role artifact ref/hash or a role admission rejection;
- RoleAdmissionService does not create semantic blockers;
- RoleAdmissionService does not materialize queue items;
- RoleAdmissionService does not decide trace repair, claim readiness, dossier readiness, or writing projection state.

Only the admitted `TraceIntegrityDebateArtifact@v1` may enter Domain Gate. Domain Gate must not inspect intermediate role artifacts for state transition decisions. Intermediate role artifacts are available for replay, debugging, cache identity, runtime audit, and final-admission lineage verification.

If any per-role admission rejects, the debate stops before the next role and returns no domain-facing final artifact. The failure is technical/admission evidence, not a semantic trace blocker.

Existing harness relationship:
- `PaperImplementationAgentWorkflowHarnessRun` may record the scenario, expected blockers, and refs to role/final runtime artifacts after the debate completes;
- the transcript is not a `TraceIntegrityRoleArtifact@v1`;
- the transcript is not a `TraceIntegrityDebateArtifact@v1`;
- the transcript cannot satisfy per-role admission or final admission;
- the transcript cannot be consumed by Domain Gate for `trace_integrity_review.boundary_debate`.

## Statement Extraction Boundary
The deterministic reviewed-statement extractor is structural only. The extractor MUST NOT judge whether a sentence contains multiple arguments, whether a claim is semantically compound, or how a long prose field should be decomposed.

The extractor MAY produce a `TraceReviewedStatementPacket@v1` from:
- explicit claim/dossier statement items when the owning domain service already exposes them;
- stable structured fields on `claim_candidate`;
- dossier claim refs, readiness refs, limitation refs, failed-run refs, and claim-trace refs that can be mapped back to existing structured objects.

The extractor MUST NOT:
- split natural-language text into multiple semantic claims;
- classify a source sentence as atomic or compound;
- rewrite claim text into clearer prose;
- infer missing support/challenge refs;
- convert dossier prose or writing projection prose into new authority statements.

When only a raw claim field exists, the extractor emits one statement for that source field with `statement_granularity_status=not_assessed`. When dossier prose cannot be mapped to a claim/ref/readiness field, the extractor may record `unmapped_prose_present` as structural context, but the extractor must not decide whether the prose introduced a new claim.

The semantic debate, especially `skeptic_challenge` and `arbiter_final`, owns granularity risk findings. If a reviewed statement appears to contain multiple support obligations or cannot be judged as one stable unit, the debate emits a blocker such as `statement_decomposition_required`. The debate does not split the statement or create new authority statements.

## Role Contracts
### `support_mapper_map`
MUST:
- map every reviewed statement from the packet to direct, partial, background-only, conflicting, or missing support;
- cite only refs present in the retrieval packet;
- label result interpretation, memo, rationale, and summary as non-primary evidence;
- include closed-Cycle failed/cancelled/incomplete execution refs and eligible negative/inconclusive scientific REU refs when they affect support.

MUST NOT:
- invent refs;
- declare readiness or authority;
- hide unsupported statements by omitting them.

### `skeptic_challenge`
MUST:
- challenge every support chain that is indirect, background-only, stale, contradicted, or missing failure evidence;
- identify statement granularity risks when one reviewed statement appears to require multiple independent support obligations;
- emit one finding per distinct issue;
- cite affected refs and target statements;
- classify blocker severity deterministically.

MUST NOT:
- create new claims;
- request open-ended search;
- treat absence of evidence as support.

### `support_mapper_reconcile`
MUST:
- resolve every skeptic finding exactly once;
- choose one disposition: `accepted_blocker`, `resolved_with_refs`, `rebutted_with_refs`, or `context_gap_blocker`;
- cite refs for any rebuttal or resolution;
- preserve accepted blockers.

MUST NOT:
- broadly regenerate the support map;
- drop critic findings;
- downgrade blockers without refs.

### `arbiter_final`
MUST:
- cover every reviewed statement and every skeptic finding;
- produce a final blocker set;
- preserve unresolved disagreement as a blocker;
- output a single `TraceIntegrityDebateArtifact@v1`.

MUST NOT:
- introduce new source refs absent from prior role artifacts;
- write trace repairs, claims, dossier readiness, or writing packets;
- create human audit summaries.

## Output Contract
`TraceIntegrityDebateArtifact@v1` SHOULD include:
- `status`: `passed`, `blocked`, or `failed_runtime`;
- `target_ref`;
- `reviewed_statement_refs`;
- `retrieval_packet_ref`;
- `retrieval_packet_hash`;
- `preflight_blockers`;
- `support_map`;
- `challenge_findings`;
- `finding_resolution_map`;
- `semantic_coverage_status`: `complete`, `partial_with_warnings`, or `blocked`;
- `arbiter_blocker_codes`;
- `blockers`;
- `runtime_failure_code` when `status=failed_runtime`;
- `role_artifact_refs`;
- `role_artifact_hashes`;
- `admitted_role_artifact_refs`;
- `admitted_role_artifact_hashes`;
- `role_prompt_packet_refs`;
- `role_prompt_packet_hashes`;
- `role_token_budget_gate_result_refs`;
- `role_compression_report_refs`;
- `runtime_identity`;
- `cache_identity`;
- `source_refs`;
- `source_hash_bundle`.

Admission, not the runtime artifact, owns `admission_identity` and `admission_identity_hash`.

## Blocker Taxonomy
The first slice SHOULD support these blocker codes:
- `trace_manifest_missing`;
- `trace_manifest_stale`;
- `trace_target_mismatch`;
- `source_ref_drift`;
- `source_locator_missing`;
- `source_locator_semantic_mismatch`;
- `semantic_support_gap`;
- `unsupported_claim_leap`;
- `statement_decomposition_required`;
- `trace_covers_background_not_claim`;
- `failure_evidence_omitted`;
- `negative_or_inconclusive_run_omitted`;
- `challenge_ref_omitted`;
- `conflicting_evidence_unresolved`;
- `interpretation_used_as_primary_evidence`;
- `memo_as_evidence_detected`;
- `stale_evidence_changes_claim_boundary`;
- `claim_trace_packet_missing_required_lineage`.

## Cache And Identity
RuntimeSlot owns all cache semantics:
- one shared context packet cache identity for the bounded retrieval packet;
- one prompt packet cache identity per role slot;
- prompt keys include role slot id, call index, retrieval packet hash, prior role artifact hashes, profile hash, prompt template version, output schema, model profile/option, execution mode, executor kind, redaction policy, and compression hash when used;
- prompt packet cache identity is finalized only after token/compression decisions are known;
- provider response reuse is blocked or treated as miss for `provider_llm`;
- exact prompt/context cache hits still run admission and deterministic domain gates.

## Admission Rules
Per-role admission MUST run before the next role:
- role slot and call index match;
- retrieval packet hash matches;
- prior role artifact hashes match when required;
- prompt packet, token-budget, compression, cache, and redaction identities match;
- refs are inside the retrieval packet;
- output schema is valid;
- forbidden authority fields are absent.
- the admitted role artifact ref/hash is recorded before the next role runs.

Final admission MUST verify:
- all required admitted role artifact refs/hashes are present;
- every skeptic finding has exactly one resolution;
- every accepted blocker appears in the final blocker set;
- every rebuttal/resolution cites allowed refs;
- no provider response reuse satisfied a provider-required role;
- runtime/cache/prompt/profile/source identity is stable;
- token/compression reports are present when required and match role artifacts;
- final artifact is proposal/support only.

## Complexity Limits
First-slice hard limits:
- exactly four semantic role invocations;
- one execution mode for all semantic roles in a debate attempt;
- no open-ended rounds;
- no dynamic agents;
- no role-triggered unbounded retrieval;
- no human-audit summary;
- no automatic trace repair;
- unresolved disagreement blocks;
- retry is limited to transient provider/schema/parse failures, not source/trace drift.

## Minimum Tests
The first implementation slice SHOULD prove:
- happy path with direct support and no blockers;
- extractor emits raw claim fields with `statement_granularity_status=not_assessed` instead of judging compoundness;
- semantic debate, not extractor, creates `statement_decomposition_required`;
- background-only trace creates `trace_covers_background_not_claim`;
- missing failure run creates `failure_evidence_omitted`;
- source locator mismatch creates `source_locator_semantic_mismatch`;
- result interpretation as evidence creates `interpretation_used_as_primary_evidence`;
- skeptic finding without resolution blocks final admission;
- rebuttal without allowed refs blocks final admission;
- role artifact hash drift blocks the next role;
- mixed execution modes in one first-slice debate attempt are rejected;
- provider mode records one live provider call per executed role and zero calls when blocked before execution;
- token over-budget and compression quality failure record zero provider calls when blocked before execution;
- per-role prompt packet, token-budget, compression, and cache identity drift blocks admission;
- per-role admission rejection stops the debate before the next role and produces no domain-facing final artifact;
- Domain Gate consumes only admitted `TraceIntegrityDebateArtifact@v1`, not intermediate role artifacts;
- prompt/context cache replay does not skip admission or deterministic gates;
- provider-required response reuse is blocked or treated as miss.
