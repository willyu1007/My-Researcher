# 02 Architecture

## Relationship To Existing Tasks
- T-088 owns the generic WorkflowHarness and AgentOrchestrator foundations.
- T-089 owns node-level agent/debate classification and policy semantics.
- T-107/T-108/T-111 own v1b/v1c/v1a orchestration hardening.
- T-112 owns the cross-cutting LLM context/cache/compression/token-budget runtime used by those flows.

## Locked Decisions
- D1: T-112 is a cross-cutting topic-selection runtime task, not a patch to v1a, v1b, or v1c alone.
- D2: T-112 introduces a shared LLM runtime kernel plus node policy adapters/context compilers. The runtime kernel standardizes mechanical enforcement and audit semantics; node adapters own semantic context construction and preservation rules.
- D2.1: the node-scope matrix row granularity is the LLM invocation slot, not the workflow node. A workflow node with multiple LLM roles, debate stages, semantic support artifacts, or provider canary surfaces MUST have separate matrix rows for each independently invokable slot.
- D3: the initial slot inventory MUST cover profile-registry LLM profiles, v1b semantic support slots, direct `BackendLlmGateway` callers, Codex acceptance slots, and provider-required canary surfaces. v1c bounded micro-debate and provider canaries are split by role/surface; provider-specific evidence such as OpenAI versus DashScope belongs in the acceptance matrix, not as separate slot-inventory rows.
- D4: every invocation slot MUST bind a `ContextPolicyProfile`. The profile is the unit that decides suitable context, memory inclusion, compression, token-budget behavior, exact cache behavior, response reuse, post-reuse gates, and provenance. Functional templates and execution modifiers are reusable profile ingredients, not replacements for slot-specific context policy.
- D5: context suitability is profile-declared, not runtime-inferred. Each `ContextPolicyProfile` MUST declare source taxonomy, memory rules, compression rules, cache rules, token-budget runtime order, and profile versioning/hash fields. The shared runtime only executes and validates those declarations.
- D6: `ContextPolicyProfile` definitions live behind an independent registry/resolver. Shared contracts define schema and types; backend registry resolves and validates profiles at runtime; matrix rows reference profile id/version for governance only. Missing profiles, slot/profile mismatch, hash drift, or schema invalidity MUST fail closed.
- D7: T-112 uses one shared runtime kernel plus stage-specific adapters. All provider, Codex-assisted, mocked, and external artifact admission paths MUST pass through runtime policy checks, but v1a, v1b, v1c, and resource sampling may keep independent adapters/facades for workflow-specific context construction. Separate stage-owned cache/compression/reuse/token-budget/provenance kernels are forbidden.
- D7.1: v1b N7 is a core topic-question-contract context hub, not a lightweight side path. Its semantic support slots remain non-authority, but the N7 adapter MUST enforce high-quality input context admission and produce high-quality, ref-backed context/handoff for downstream N8 and loopback decisions.
- D8: the first deep integration chain is v1a N6. It exercises single-agent generation, debate slots, `exploration_context`, `arbiter_context`, context-family isolation, exact cache behavior, response reuse policy, and deterministic candidate admission.
- D9: compression is runtime-orchestrated and profile-governed. Codex may be the default semantic `CompressionExecutor`, but Codex is not the policy owner, quality gate, or authority source. Compression output is a non-authority, ref-backed, hash-checked, quality-gated artifact.
- D10: the first token-budget slice uses one shared `ConservativeTokenEstimator`; it does not introduce provider-aware tokenizer plugins. Provider/model actual token telemetry is recorded for calibration only and may tune profile margins later.
- D11: cache is for cross-provider and cross-mode context identity plus preprocessing artifacts, not cross-provider provider-response reuse. Context packet cache reuses exact-key artifact refs; provider responses, provider telemetry, provider-side cache hits, and provider-specific repair results are never silently reused across providers.
- D12: context packet cache uses an artifact-ref read-through contract. The cache index stores only exact keys, hashes, artifact refs, freshness/status, and provenance metadata; it does not store business authority payloads. Exact hits return artifact refs and standardized cache results, while stale/drifted/context-family-mismatched entries miss or block through runtime policy.
- D13: Codex-assisted, provider-LLM, and mocked execution share one runtime, but their execution provenance and response-reuse permissions are distinct. `provider_llm` never silently reuses historical responses and provider-required slots require live calls; `codex_assisted` exact response reuse requires operator or explicit local approval and records `non_provider=true`; `mocked_llm` reuse is limited to test/acceptance fixtures.
- D14: prompt packet cache is keyed by the complete invocation prompt packet, not only the system prompt. Prompt identity MUST distinguish slot, role, stage, scenario, template version, context refs/hashes, dynamic material refs/hashes, output contract, model/profile params, runtime modifiers, and redaction policy. The prompt index stores hashes, metadata, artifact refs, and provenance only; persisted prompt payloads must be redacted, ref-backed artifacts.
- D15: LLM roles may generate dynamic prompt material such as issue frames, focus questions, repair agendas, challenge lists, or risk checklists, but they MUST NOT generate or override the executable prompt. Dynamic prompt material must be schema-validated, ref-backed, hash-included, provenance-recorded, and rendered by a fixed prompt compiler.
- D16: prompt quality is monitored through static prompt-template lint, runtime `PromptQualityReport`, and outcome telemetry. Prompt quality gates may warn or block unsafe prompt packets, while effectiveness metrics are review signals only and cannot rewrite business authority.
- D17: every LLM-like invocation emits an append-only runtime audit envelope for machine verification, but human-facing audit is served through projections. `operator_audit_summary` and `human_trust_summary` may simplify fields for developer/operator or product-human consumption, but each projection MUST reference the source envelope hash/ref, MUST NOT rewrite conclusions, and MUST NOT become business authority.
- D18 historical first-slice boundary: implementation began only with a narrow v1a N6 first slice. The full slot inventory remained coverage evidence, and only rows promoted into an implementation-ready matrix could be wired to the shared runtime. Later D20-D32 sections record the promoted v1b, v1c, and resource-sampling rows; any still-unpromoted direct-provider path remains deferred until an explicit matrix promotion.
- D18.1: v1a separates node runtime from `WorkflowHarness` orchestration. Node runtime adapters/context compiler facades own each node's concrete LLM-like execution semantics: context construction, prompt/profile/variant binding, cache identity, compression and re-rendering, schema/admission/routing gates, and authority-write command shape. `WorkflowHarness` owns whole-flow N1-N9 ordering, replay/idempotency, handoff routing, test fixtures, assertions, traces, and smoke/e2e control. It may call node adapters and inject test overrides, but it MUST NOT become the SSOT for prompt/cache/compression/admission/authority semantics.

## Runtime Boundaries
- `AgentOrchestrator`: remains the preferred structured agent invocation boundary. T-112 adds prompt/context cache policy and token-budget preflight here or in a shared runtime collaborator called from here.
- `TopicSelectionLlmRuntime` or equivalent shared runtime kernel: owns token-budget preflight, exact cache/reuse key validation, context packet cache lookup/store semantics, compression report envelope validation, response reuse enforcement, and provenance. It must not compile node semantics, read mutable node state, call provider SDKs directly, or write business authority.
- `TopicSelectionContextPolicyProfileRegistryService` or equivalent independent resolver: resolves `ContextPolicyProfile` by slot/profile id/version, validates schema, computes or verifies profile hash, and blocks mismatch. It should remain separate from the model profile registry in the first implementation slice.
- Node policy adapters/context compilers: own node-specific context construction, `context_family`, source refs, preservation checklist, compression strategy choice, stale miss/block behavior, provider-required live-call policy, and authority-boundary checks.
- Stage adapters/facades: `v1a`, `v1b`, `v1c`, and resource-sampling adapters may present workflow-specific APIs to callers, but they MUST delegate shared key building, token-budget decisions, cache/reuse enforcement, compression envelope validation, and provenance semantics to the shared runtime kernel.
- `BackendLlmGateway`: remains the only provider API path. It may report telemetry and provider-cache fields, but it must not make business cache decisions.
- Context compilers: compile ref-backed packets and consult the shared context packet cache before recording duplicate packets.
- Prompt compilers: render fixed prompt templates plus approved dynamic material into prompt packets, compute prompt packet hashes, and emit prompt quality reports before provider/Codex/mock execution.
- WorkflowHarness: invokes nodes and asserts cache/reuse/token-budget behavior without owning cache semantics.
- Domain services: remain authority writers and deterministic gate owners.

For v1a specifically, `WorkflowHarness` should remain a flow controller and verification harness. If a runtime decision depends on a v1a node's semantic state, such as N6 generation mode, debate role, runtime context packet identity, compression preserved facts, candidate admission, or persistence command shape, that decision belongs in the v1a node adapter/context compiler layer. Harness code may pass scenario inputs, replay fixtures, and explicit test overrides, but production semantics must still be resolved by the node runtime path.

## Runtime Integration Pattern
All LLM-like paths use the same runtime kernel through an adapter:
- `AgentOrchestrator` paths call the runtime for profile resolution, key building, token preflight, cache/reuse policy, compression validation, and provenance before invoking provider/Codex/mock behavior.
- Direct `BackendLlmGateway` callers must move behind a runtime provider wrapper before provider execution. The promoted v1a/v1b/v1c/resource-sampling surfaces now route through `AgentOrchestrator` or their registered runtime/admission services; any future direct-provider surface must first be promoted in the matrix.
- External artifact admission paths, including v1b semantic artifacts and v1c Codex acceptance outputs, call runtime admission validation for schema, hashes, provenance, reuse policy, and post-reuse gates without triggering provider execution.
- Provider canaries call the runtime with `provider_required_live`, which forces live provider execution and treats cached responses as miss/block only.

The shared kernel must be stage-agnostic. Stage adapters decide context sources and handoffs, while the kernel enforces invariant semantics.

## Implementation Readiness Gate
T-112 MUST NOT wire runtime behavior into a slot until that slot is promoted from inventory to implementation-ready status in `06-node-scope-matrix.md`.

First-slice readiness is limited to v1a N6 and requires:
- registered `ContextPolicyProfile` ids, versions, and stable hashes for every v1a N6 slot;
- shared contract schemas for context cache results, token-budget gate results, compression reports, prompt packet identity, `PromptQualityReport`, exact response reuse provenance, runtime audit envelopes, and audit projections;
- fail-closed schema tests for missing profile/schema/policy/hash fields and forbidden payload classes;
- runtime key builders that include `invocation_slot_id`, profile hash, context family, prompt variant, dynamic material refs/hashes, redaction policy, model option, and normalized params when relevant;
- `ConservativeTokenEstimator` and token-budget gate tests before any provider call;
- context packet read-through cache tests proving exact hit, stale miss/block, context-family isolation, and idempotent artifact-ref behavior;
- Codex-assisted reuse contract tests proving approval is required and `non_provider=true` is recorded;
- v1a N6 harness tests proving cache/reuse/compression cannot bypass schema validation, candidate admission, deterministic gates, or authority-write boundaries.

Historical first-slice scope blocked resource sampling, v1b, and v1c runtime integration until their rows had the same implementation-ready detail. D20-D32 promoted the agreed v1b, v1c, and resource-sampling rows. Any future direct `BackendLlmGateway` path MUST NOT claim T-112 cache/reuse/token-budget semantics until routed through the shared runtime wrapper.

## Adapter Pattern
T-112 MUST avoid a generic semantic compressor. Each LLM-capable node supplies a node policy adapter that declares:
- node and slot identity;
- context family;
- input refs and required source/input hashes;
- token-budget policy;
- compression strategy and required preserved facts;
- context-cache exact key fields and stale behavior;
- response reuse eligibility and approval requirements;
- provider-required live-call behavior;
- deterministic gates that must still run after cache or reuse.

The shared runtime kernel MAY execute a configured compression strategy, but it MUST validate the compression report envelope and quality-gate result against the adapter policy before any provider call or reuse result is accepted.

## Context Policy Profile
Each implementation-ready invocation slot MUST declare a `ContextPolicyProfile` with:
- `invocation_slot_id`;
- `functional_template`;
- `execution_modifiers`;
- `context_family`;
- `allowed_source_refs`;
- `memory_policy`;
- `compression_policy`;
- `cache_policy`;
- `token_budget_policy`;
- `reuse_policy`;
- `post_reuse_gates`;
- `provenance_policy`.

Functional templates classify authority risk:
- `candidate_for_deterministic_gate`: model output is only a candidate for a deterministic gate.
- `support_only_semantic`: output supports diagnosis, critique, summary, or advisory reasoning and never writes authority.
- `delegated_payload_candidate`: output is a delegated payload candidate that requires authorization and deterministic admission.
- `human_review_advisory`: output supports human confirmation but never replaces accountable human authority.

Execution modifiers add runtime constraints:
- `provider_required_live`;
- `codex_exact_reuse_allowed`;
- `mock_replay_allowed`;
- `external_artifact_admission`;
- `compression_allowed_with_quality_gate`;
- `compression_disallowed`.

Cache and reuse keys MUST include `invocation_slot_id`. `node_id` alone is not sufficient because nodes such as v1a N6 and v1c N2 contain multiple independently invokable slots.

## Context Policy Field Semantics
Context source taxonomy:
- `authority_record`: may provide primary facts.
- `ref_backed_artifact`: may provide facts only with source refs and hashes.
- `durable_memory`: may enter as warning, risk, constraint, accepted risk, blocker history, or recheck hint; it must not become evidence by itself.
- `prior_llm_output`: not a fact source by default; may be used only as labeled support, critique, or replay input when allowed by profile.
- `cache_projection`: acceleration only; never authority.
- `provider_telemetry`: audit, cost, and debug only; never context authority.

Memory policy requirements:
- memory entries must preserve `memory_ref`, source refs, source hash, `created_at`, and policy version;
- memory must enter context with an explicit use label such as `risk_warning`, `constraint`, `recheck_hint`, `accepted_risk`, or `blocker_history`;
- stale, source-drifted, or policy-drifted memory must miss, block, or downgrade to warning according to profile policy;
- gate-adjacent and arbiter/final slots must preserve blocker, residual-risk, accepted-risk, gap, and recheck memory when present.

Compression policy requirements:
- `compression_mode` is one of `disallowed`, `allowed_with_quality_gate`, or `required_when_over_budget`;
- compression must be ref-backed, hash-checked, versioned, and redaction-policy aware;
- compression quality gate must preserve source refs, blockers, residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, and recheck hints when present;
- compression reports must not persist hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content.
- `compression_executor_kind` may be `deterministic_structural` or `codex_assisted` in the first implementation slice;
- `codex_assisted` compression may summarize semantic context, but eligibility, preserved facts, quality gates, provenance, and cache keys are determined by `ContextPolicyProfile` and the shared runtime;
- provider LLMs are not the default compression executor to avoid confusing provider live invocation semantics with preprocessing;
- `provider_required_live` slots default to compression-disallowed unless the canary explicitly tests compressed-context behavior.

Compression report requirements:
- `compression_report_ref`;
- `source_refs`;
- `input_context_hash`;
- `compressed_context_hash`;
- `summary_hash`;
- `estimated_input_tokens_before`;
- `estimated_input_tokens_after`;
- `redaction_policy`;
- `compression_executor_kind`;
- `compression_strategy_id`;
- `compression_strategy_version`;
- `quality_gate_result`;
- blocker and warning codes.

Cache policy requirements:
- context packet cache uses exact-key read-through lookup only;
- cache targets context identity and preprocessing artifacts, not provider response authority;
- cache index rows store key/hash/ref/status/provenance metadata only, not business authority payloads;
- stale source refs, source hash, policy, schema, compiler, profile, model option, execution mode, context family, or redaction drift must miss or block by profile policy;
- cache hits cannot skip schema validation, deterministic gates, authority write boundaries, or provenance recording;
- `provider_required_live` means cached responses are miss/block only and cannot satisfy provider output.

Cross-provider cache semantics:
- context packet artifacts may be reused across providers and execution modes when exact key fields match;
- compression reports/artifacts may be reused across providers and execution modes when exact key fields match and the quality gate remains valid;
- prompt packet hashes and metadata may be reused for replay identity, audit, and cost analysis;
- token estimates and provider actual-token telemetry may be reused for calibration/audit only;
- provider responses are not cross-provider reusable under `provider_llm`;
- provider telemetry and provider-side cache-hit semantics are provider audit data, not business response reuse.

## Context Packet Cache Read-Through Contract
The context packet cache is a lightweight lookup index over ref-backed artifacts. It MUST NOT become a second authority store or stage-specific payload store.

For the v1a production boundary, the context packet cache index is process-local. Loss of that index after restart/deploy is a safe miss that recompiles the ref-backed context packet; correctness must not depend on a persistent context packet cache row.

Runtime read-through order:
1. Resolve `ContextPolicyProfile` and validate slot/profile/hash compatibility.
2. Ask the stage adapter/context compiler for source refs, source hashes, memory refs, context family, and compiler metadata.
3. Build the exact context packet cache key through the shared runtime.
4. Query the cache index.
5. If the entry is an exact fresh hit, return the existing `artifact_ref` and cache metadata.
6. If source, hash, profile, schema, compiler, redaction, execution-mode, model-option, or context-family drift is detected, return a miss or block according to profile policy.
7. On miss, compile a new context packet artifact, persist the artifact, then insert or reuse the cache index row with put-if-absent/idempotent semantics.

Cache result enum:
- `hit`;
- `miss`;
- `blocked_stale`;
- `blocked_drift`;
- `bypassed`;
- `not_applicable`.

Cache hit envelope:
- `cache_result`;
- `artifact_ref`;
- `artifact_hash`;
- `cache_key_hash`;
- `context_family`;
- `context_policy_profile_id`;
- `context_policy_profile_version`;
- `context_policy_profile_hash`;
- `source_refs_hash`;
- `freshness_status`;
- `provenance_ref`.

Cache index rows MAY be queryable for audit and cost analysis, but the artifact remains the reusable context packet. Stage adapters MAY own context construction, but they MUST NOT introduce separate cache indexes or local read-through semantics for v1a, v1b, v1c, or resource sampling.

## Prompt Packet Identity And Cache
A prompt packet is the complete executable invocation prompt package, not only the system prompt. It includes:
- stable system/developer instructions;
- node/slot task instructions;
- role, stage, and scenario instructions such as explorer, critic, arbiter, repair, final synthesis, or feedback normalization;
- rendered context refs, context packet hashes, or redacted context excerpts;
- dynamic prompt material refs and hashes when present;
- output schema and response contract instructions;
- runtime modifiers such as `provider_required_live`, compression usage, reuse-disabled policy, and redaction policy.

Prompt packet cache/index rows MUST store metadata only:
- `prompt_packet_hash`;
- `prompt_template_id`;
- `prompt_template_version`;
- `prompt_variant_key`;
- `invocation_slot_id`;
- `context_packet_hashes`;
- `dynamic_material_refs_hash`;
- `output_contract`;
- `context_policy_profile_hash`;
- `model_option_id`;
- `normalized_params_hash`;
- `runtime_modifiers_hash`;
- `redaction_policy`;
- redacted prompt artifact ref when persisted;
- provenance ref.

The full executable prompt may exist in memory for the current invocation. If a prompt payload is persisted for replay, audit, or debugging, it MUST be a redacted, ref-backed artifact with hash, source refs, redaction policy, and provenance. Prompt cache/index storage MUST NOT persist hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content.

`prompt_variant_key` is required for complex workflows. It distinguishes role/stage/scenario variants even when the system prompt or base template is shared. Examples include `need_candidate_generation`, `explorer.round_1_discovery`, `deep_critic.round_1_discovery`, `arbiter.issue_framing`, `arbiter.final_synthesis`, `promotion_supporter_repair`, and `downstream_feedback_normalization`.

## Dynamic Prompt Material
Dynamic prompt material is structured input produced during a workflow to focus a later prompt. It may include issue frames, focus questions, challenge lists, candidate conflict summaries, risk checklists, repair agendas, or unresolved gap lists.

LLM roles MAY produce dynamic prompt material only under these constraints:
- the executable prompt template, role boundary, output contract, schema, authority boundary, token/cache/reuse policy, and provider-required-live semantics remain fixed and cannot be overwritten by dynamic material;
- dynamic material has a declared schema and output contract;
- dynamic material is stored as a ref-backed artifact with source refs, source hashes, material hash, producer slot, workflow run id, and provenance;
- dynamic material refs and hashes participate in the prompt packet hash, cache key, and response reuse key;
- stale, schema-invalid, or source-drifted dynamic material blocks or misses according to the slot profile;
- dynamic material remains advisory/support context and cannot become business authority.

For v1a N6, `arbiter.issue_framing` may produce a `DebateIssueFrame` artifact. `arbiter.final_synthesis` then renders that artifact through a fixed final-synthesis template rather than allowing the arbiter to author the next executable prompt.

## Prompt Quality Monitoring
Prompt quality is evaluated before and after execution.

Static prompt-template lint SHOULD verify:
- `invocation_slot_id`, template id, and template version are present;
- role/stage/scenario boundaries are explicit;
- required context placeholders and dynamic-material placeholders are declared;
- output contract and schema are declared;
- authority boundary is stated;
- forbidden payload classes are excluded;
- template/profile compatibility is valid.

Runtime `PromptQualityReport` MUST include:
- `prompt_packet_hash`;
- `prompt_template_id`;
- `prompt_template_version`;
- `prompt_variant_key`;
- `context_packet_hashes`;
- `dynamic_material_refs`;
- `output_contract`;
- `redaction_policy`;
- `quality_decision`: `pass`, `warn`, or `block`;
- blocker and warning codes;
- provenance ref.

Prompt quality gate MUST block when required context refs are missing, context family mismatches, dynamic material is schema-invalid or drifted, arbiter/final stages omit required blocker/risk/gap/recheck inputs, output schema is missing, unredacted private content or secrets are detected, or token budget cannot be satisfied under profile policy.

Effectiveness telemetry SHOULD track schema validation failure rate, provider repair/retry count, deterministic gate rejection rate, missing required field rate, blocker/risk/gap omission rate, human override rate, downstream recheck rate, provider canary failures, fixture replay drift, and token estimate versus actual deviation. These metrics are prompt quality signals for review; they do not mutate gate outcomes or business authority retroactively.

## Invocation Audit And Projections
The runtime audit envelope is the complete machine-readable evidence chain for one LLM-like invocation. It is append-only and ref-backed. It supports harness assertions, replay diagnostics, idempotency checks, drift investigation, provider canaries, cost analysis, and implementation debugging.

`runtime_audit_envelope` MUST include, when applicable:
- `workflow_run_id`;
- `node_id`;
- `invocation_slot_id`;
- `node_attempt_id`;
- `execution_mode`;
- `executor_kind`;
- profile, schema, policy, template, model option, and normalized params hashes;
- context cache result, context artifact refs, and context hashes;
- compression report ref;
- prompt packet hash/ref and `PromptQualityReport` ref;
- token-budget gate result;
- response artifact ref/hash or response reuse provenance;
- schema validation result;
- post-reuse gate result;
- deterministic gate result;
- authority-boundary result;
- provider telemetry only when a live provider call occurred;
- blocker and warning codes.

The complete runtime envelope is primarily consumed by:
- runtime services for policy enforcement and idempotency;
- WorkflowHarness and contract tests for replay/cache/reuse/gate assertions;
- provider canary verification;
- developers debugging failed or drifted invocations.

Human-facing audit content MUST be projections from the envelope:
- `operator_audit_summary`: developer/operator view for debugging and review. It may show live provider versus Codex/mock/reuse, cache hit/miss/block, compression status, token gate status, prompt quality status, schema/gate status, blocker/warning codes, and artifact refs/hashes.
- `human_trust_summary`: product or human-confirmation view. It may show source refs, residual risks, evidence gaps, recheck hints, live-provider versus non-provider/replay labeling, deterministic gate status, and human confirmation status.

Projection rules:
- projections may omit low-level fields such as raw cache keys, token internals, prompt payload details, and raw provider telemetry;
- projections MUST carry the source `runtime_audit_envelope` ref/hash;
- projections MUST NOT rewrite decisions, blocker/warning codes, execution mode, provider-live status, reuse status, or authority-boundary outcome;
- projections MUST NOT persist hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content;
- projections are read-only audit views and cannot become business authority.

Token-budget runtime order:
1. Collect source refs and memory refs.
2. Compile or resolve context packet.
3. Run context packet cache exact lookup.
4. Run token-budget preflight.
5. Compress only if profile policy allows or requires it.
6. Re-run token estimate after compression.
7. Generate prompt packet and prompt packet hash.
8. Check exact response reuse policy.
9. Execute provider, Codex-assisted, or mocked path.
10. Run schema validation, post-reuse gates, deterministic gates, and authority boundary checks.

Token-budget estimator requirements:
- first-slice implementation uses a single `ConservativeTokenEstimator`;
- provider-aware tokenizer adapters are out of scope for the first slice;
- estimates must be stable, explainable, and deterministic from prompt/context/schema inputs;
- estimator uses conservative multipliers for CJK text, English text, JSON payloads, and schema overhead;
- output budget comes from `ContextPolicyProfile` or model profile, not from runtime guessing;
- each profile declares a `token_estimate_safety_margin`, defaulting to at least `1.25`;
- unknown estimate should occur only when input structure cannot be inspected; profile policy then decides `budget_unknown_allow_with_warning` or block;
- provider actual token counts, when available, are telemetry-only calibration data and do not retroactively change the gate decision.

Profile versioning requirements:
- `context_policy_profile_id`;
- `context_policy_profile_version`;
- `context_policy_profile_hash`;
- `context_compiler_version`;
- `compression_strategy_version`;
- `memory_policy_version`;
- `cache_policy_version`;
- `redaction_policy`.

These version and hash fields MUST participate in cache and reuse keys when relevant.

## Context Policy Profile Registry
Shared package responsibilities:
- define `ContextPolicyProfile` types and JSON schemas;
- define profile registry schema and schema tests;
- define resolver input/output contracts used by backend runtime and harness tests.

Backend responsibilities:
- provide an independent `TopicSelectionContextPolicyProfileRegistryService` or equivalent resolver;
- load a hardcoded TypeScript default registry for the first implementation slice;
- validate all profiles on service construction;
- compute stable profile hashes and expose resolved profile metadata to runtime;
- fail closed for unknown profile id, version mismatch, slot/profile mismatch, unsupported functional template, unsupported execution modifier, invalid schema, or profile hash drift.

Governance responsibilities:
- `06-node-scope-matrix.md` references profile id/version and records review intent;
- runtime MUST NOT read matrix markdown as configuration;
- project sync/lint or focused schema tests SHOULD detect matrix rows that have no registered profile.

The first implementation SHOULD use TypeScript constants rather than dynamic JSON/YAML config. A file-backed or operator-managed registry can be introduced later only if schema validation, hash stability, and fail-closed behavior remain unchanged.

## Cache Classes
| Class | Purpose | Authority? | Reuse Rule |
|---|---|---:|---|
| `context_packet_cache` | Reuse compiled context packet artifact refs | no | Exact match on slot, context family, source refs/hash, compiler, policy, schema, profile, execution mode, memory/candidate hashes |
| `prompt_packet_cache` | Reuse redacted prompt packets | no | Exact match on messages, context refs/hashes, prompt template, schema, profile/model option, normalized params |
| `response_reuse_cache` | Reuse exact non-provider structured responses | no | Explicit replay/test/acceptance or operator-approved Codex-assisted reuse only; no provider cross-provider reuse |
| `artifact_cache` | Reuse large summaries/digests | no | Rebuildable/ref-backed only; never a business fact source |
| `projection_cache` | Speed read-only projections | no | Rebuildable from authority records and artifact refs |
| `durable_memory` | Business memory records | conditional | Enters context as warnings/constraints/challenges, not evidence |

## Exact Key Fields
All cache/reuse keys must include the relevant subset of:
- `node_id`
- `invocation_slot_id`
- `workflow_profile_key` or `profile_id`
- `execution_mode`
- `executor_kind`
- `context_family`
- `input_refs_hash`
- `context_packet_hashes`
- `prompt_packet_hash`
- `policy_version`
- `schema_version`
- `context_compiler_version`
- `prompt_template_id`
- `prompt_template_version`
- `profile_hash`
- `model_option_id`
- `normalized_params_hash`
- `output_contract`
- `redaction_policy`

## Token Budget Gate
The gate runs before provider execution. It must produce an auditable result with:
- model/provider/profile identity;
- estimated input tokens;
- estimated output budget;
- available context window when known;
- schema/token overhead estimate;
- decision;
- compression strategy ref when used;
- warning/blocker codes.

If token budget cannot be estimated reliably, node policy decides whether to allow with warning or block. Provider calls must still record actual telemetry afterward.

## Compression Rules
- Compression is source-ref backed and hash-checked.
- Compression may remove verbosity but must preserve blockers, accepted risks, residual risks, unresolved challenges, source-health warnings, recheck hints, and method-family coverage gaps.
- Exploration context can favor recall; arbiter/gate context must favor strictness and decision readiness.
- Compression artifacts must not persist hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content.

## Response Reuse Rules
- No new execution mode is introduced for cache reuse.
- `provider_llm` means a live provider call was attempted for that invocation. If a provider-required scenario sees an exact cache hit, it must treat it as a miss or block according to policy.
- `codex_assisted` may reuse an exact response only when operator-approved or locally configured as approved reuse.
- `mocked_llm` may use exact replay/test fixtures in test or acceptance.
- Every reused response re-enters normal schema validation and deterministic gates.

Response reuse storage uses the same artifact-ref pattern as context cache:
- response payloads live in ref-backed artifacts;
- the reuse index stores exact keys, response hash, artifact ref, approval/provenance metadata, and freshness/status only;
- the reuse index is not a business authority store;
- provider response payloads cannot be reused under `provider_llm` unless the current invocation made a live provider call and the payload is that live result;
- reused Codex or mocked responses MUST be recorded as `non_provider=true`.

Execution mode policy:
| Execution mode | Response reuse permission | Required provenance |
|---|---|---|
| `provider_llm` | No silent historical response reuse; `provider_required_live` requires live provider invocation | provider, model, model option, normalized params, provider attempt id when available, token telemetry, provider-side cache telemetry if exposed |
| `codex_assisted` | Exact reuse only with operator approval or explicit local approved-reuse setting | `non_provider=true`, approval ref or local setting ref, source workflow/node/attempt, prompt/context/profile/schema/policy versions |
| `mocked_llm` | Exact replay only for test/acceptance fixtures | `non_provider=true`, fixture id/version, replay hash, source prompt/context/profile/schema/policy versions |

Shared validation after reuse:
- schema validation;
- output contract validation;
- post-reuse gates declared by `ContextPolicyProfile`;
- deterministic gate execution;
- authority-boundary checks;
- provenance/audit write.

## Drift Handling
Drift must block or miss cache when any of these change:
- source refs or source hash;
- policy version;
- schema version;
- compiler version;
- prompt template version;
- profile hash;
- model option;
- normalized params;
- execution mode;
- executor kind;
- context family;
- redaction policy.

## Provider Cache Telemetry
Provider-side cache behavior, if exposed by an API, is telemetry only. It cannot satisfy business cache requirements and cannot be treated as proof of response reuse unless the shared response reuse provenance is present.
