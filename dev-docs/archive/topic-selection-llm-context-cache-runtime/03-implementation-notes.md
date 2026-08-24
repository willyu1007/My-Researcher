# 03 Implementation Notes

## 2026-05-28 - Task Package Creation
- Created `T-112 topic-selection-llm-context-cache-runtime` as a dedicated task package.
- Decision: this is a cross-cutting topic-selection runtime package, not a T-107/T-108/T-111 tail item.
- Relationship:
  - consumes T-088 AgentOrchestrator/WorkflowHarness foundations;
  - consumes T-089 node-policy classifications;
  - hardens v1a/v1b/v1c provider and Codex-assisted execution without redefining their route policies.
- Initial architecture aligns with T-088/T-089 D-18: cache is acceleration/replay only; durable memory is structured business memory; context families stay distinct; response reuse must be provenance-labeled and non-provider unless a live provider call actually occurs.

## Pending Decisions
- D19: lock v1b N7 as the first post-v1a runtime rollout slice, including exact slot scope, context families, input refs, prompt/cache identity fields, and N7->N8/loopback handoff shape.
- D21: lock v1b/v1c compression executor policy, including which slots allow `deterministic_structural` and `codex_assisted` compression and which facts must be preserved.
- D22: lock production stress layering for v1b/v1c, including local/unit, Prisma-backed, provider canary, concurrency/load, and long-context/adversarial fixtures.
- D23: lock v1b semantic support generation/admission path so support artifacts carry real prompt/profile/provenance hashes and production/provider paths cannot use placeholder prompt identities.

## Locked Production Boundaries
- D20: v1a production deployment keeps context packet cache as an artifact-ref read-through runtime index with the current process-local store. A restart/deploy may miss and recompile context packets; this is safe because context packets are acceleration/audit artifacts, not authority. Do not add a DB-backed context packet cache index until a later slice proves a concrete cross-process context-reuse requirement and defines migration, freshness, and cleanup policy.

## Implementation Backlog
- Add shared contract schemas and schema tests. Done for the contract-first slice.
- Add context packet cache lookup/reuse. Done for the backend primitive; context compiler/node wiring remains pending.
- Add token-budget gate. Done for the backend primitive; provider/node wiring remains pending.
- Add compression report and quality gate.
- Add exact response reuse policy.
- Add prompt packet cache/index contract and prompt quality report.
- Add unified runtime audit envelope and projection contracts.
- Integrate selected v1a/v1b/v1c nodes.
- Add provider canaries and stale-cache negative tests.

## 2026-05-29 - D1/D2 Alignment And Matrix Gate
- Locked D1: T-112 remains a cross-cutting topic-selection runtime task, not a v1a/v1b/v1c node patch.
- Revised D2: the shared runtime is a mechanical enforcement kernel, not a generic semantic context compressor.
- Node policy adapters/context compilers own node-specific context construction, preservation rules, stale behavior, compression strategy choice, provider-required live-call policy, and authority-boundary checks.
- The shared runtime owns token-budget preflight, exact cache/reuse key validation, context packet cache semantics, compression report envelope validation, response reuse enforcement, provider-cache telemetry separation, and provenance/audit shape.
- Added a matrix-first gate: every LLM-capable node/slot must be represented in `06-node-scope-matrix.md` before runtime implementation for that surface.
- Locked D2.1: matrix rows are LLM invocation slots, not workflow nodes. v1a N6 debate roles, v1b semantic-support artifacts, and v1c provider/Codex canary surfaces require separate rows because their context families, authority relation, and reuse policy differ.
- Locked D3: the initial matrix coverage includes profile-registry LLM profiles, v1b semantic support slots, direct `BackendLlmGateway` callers, Codex acceptance slots, and provider-required canary surfaces.
- Split v1c N2 bounded micro-debate into four rows: supporter draft, reviewer critic, supporter repair, and synthesizer final. Split v1c provider canary coverage into explicit N3 diagnostic adjunct, N4 delegated promotion decision, and N6 feedback normalization rows, while treating OpenAI/DashScope as provider evidence dimensions rather than separate slot rows.
- Locked D4: every invocation slot binds a `ContextPolicyProfile`. The profile is the unit for deciding suitable context, memory inclusion, compression, cache, token budget, response reuse, post-reuse gates, and provenance.
- D4 uses reusable functional templates plus execution modifiers, but those are only profile ingredients. They do not replace slot-specific context-family, source-ref, memory, compression, cache, and gate policy.
- Cache and reuse keys MUST include `invocation_slot_id`; `node_id` alone is insufficient for multi-slot nodes such as v1a N6 and v1c N2.
- Locked D5: `ContextPolicyProfile` field semantics define source taxonomy, memory policy, compression policy, cache policy, token-budget runtime order, and profile versioning. Context suitability is profile-declared, not inferred by the runtime.
- Durable memory may enter context only as labeled warning/risk/constraint/accepted-risk/blocker-history/recheck input, never as standalone evidence. Compression and cache are acceleration/runtime aids and cannot become business authority.
- Runtime order is fixed: collect sources and memory, compile/resolve context, run context cache lookup, preflight token budget, compress if allowed, re-estimate, hash prompt packet, check reuse policy, invoke provider/Codex/mock, then run validation and deterministic gates.
- Locked D6: `ContextPolicyProfile` definitions are resolved through an independent registry/resolver. Shared contracts own schema/types; backend owns validated resolution and stable hashes; matrix rows reference id/version for governance only.
- The first implementation should use hardcoded TypeScript defaults and fail closed for unknown profile id, version mismatch, slot/profile mismatch, schema invalidity, unsupported template/modifier, or profile hash drift.
- Locked D7: use one shared runtime kernel plus stage-specific adapters/facades. Every provider, Codex-assisted, mocked, and external artifact admission path must pass runtime checks; stage adapters may own workflow-specific context construction but not independent cache/compression/reuse/token-budget/provenance kernels.
- Added D7.1: v1b N7 is a core topic-question-contract context hub. Its semantic support artifacts remain non-authority, but N7 must accept high-quality context and produce ref-backed handoff context for N8 value assessment and loopback decisions.
- Locked D8: v1a N6 is the first deep runtime integration chain because it exercises single-agent generation, debate slots, `exploration_context`, `arbiter_context`, cache/reuse isolation, and deterministic candidate admission.
- Locked D9: compression is orchestrated by the shared runtime and governed by the slot profile. Codex may be the default semantic compression executor, but Codex output remains a non-authority, ref-backed, hash-checked, quality-gated artifact.
- First-slice compression executors are `deterministic_structural` and `codex_assisted`; provider LLM compression is not the default, and `provider_required_live` slots default to compression-disallowed unless explicitly testing compressed context.
- Locked D10: first-slice token budget uses a single `ConservativeTokenEstimator`, not provider-aware tokenizer plugins. Provider actual token counts are telemetry-only calibration data for future margin tuning.
- Token budget profiles must declare output budget, safety margin, and unknown-estimate behavior; default safety margin is at least `1.25`.
- Locked D11: cache targets cross-provider/cross-mode context identity and preprocessing artifacts, not provider response reuse. Context packet cache returns exact-key artifact refs; provider responses, telemetry, provider-side cache hits, and provider-specific repair results are not cross-provider business cache targets.
- Locked D12: context packet cache uses an artifact-ref read-through contract. The cache index stores exact keys, hashes, artifact refs, freshness/status, and provenance metadata only; it does not store business payloads or provider responses. Exact hits return standardized cache result metadata plus the existing artifact ref, while stale/drifted/context-family-mismatched entries miss or block through shared runtime policy.
- Locked D13: Codex-assisted, provider-LLM, and mocked execution share one runtime but have distinct execution provenance and response-reuse permissions. `provider_llm` never silently reuses historical responses and provider-required slots require live calls. `codex_assisted` exact reuse requires operator or explicit local approval and records `non_provider=true`. `mocked_llm` reuse is limited to test/acceptance fixtures. Response reuse payloads are ref-backed artifacts; the reuse index stores exact lookup and audit metadata only.
- Locked D14: prompt packet cache is keyed by the complete invocation prompt packet, not only the system prompt. Complex workflows must distinguish role/stage/scenario through `prompt_variant_key`. Prompt index rows store hashes, metadata, artifact refs, and provenance only; persisted prompt payloads must be redacted, ref-backed artifacts.
- Locked D15: LLM roles may generate dynamic prompt material such as issue frames, focus questions, challenge lists, risk checklists, and repair agendas, but they cannot generate or override executable prompts. Dynamic material must be schema-validated, ref-backed, hash-included, provenance-recorded, and rendered by fixed prompt compilers.
- Locked D16: prompt quality monitoring combines static prompt-template lint, runtime `PromptQualityReport`, and effectiveness telemetry. Prompt quality gates may warn/block unsafe prompt packets before execution, while outcome telemetry is a review signal and cannot mutate business authority retroactively.
- Locked D17: every LLM-like invocation emits or references an append-only `runtime_audit_envelope` for machine verification. Human-facing audit is produced through projections: `operator_audit_summary` for developer/operator debugging and `human_trust_summary` for product/human-confirmation trust cues. Projections must carry source envelope ref/hash, may simplify fields, must not rewrite conclusions, and cannot become business authority.
- Locked D18 historical first-slice stance: implementation readiness was limited to a narrow first slice. The full matrix remained inventory until rows were promoted. First implementation started with shared contracts/schema tests, profile registry skeleton, runtime key/token/cache/audit primitives, and then v1a N6 single-agent/debate wiring. Later D20-D32 sections record the promoted v1b, v1c, and resource-sampling rows.

## 2026-05-29 - Implementation Readiness Review Findings
- Finding resolved: matrix inventory was not implementation-ready. Added a dedicated first-slice implementation-ready matrix for v1a N6 slots with profile ids, prompt variants, token budgets, compression policy, cache/reuse policy, audit projections, and focused tests.
- Finding resolved: stale implementation gate. `04-verification.md` now names the first slice and lists required contracts/runtime prerequisites before implementation.
- Finding tracked for first code PR: shared contracts currently do not match D12-D17 and must be implemented before runtime/node wiring.
- Finding tracked for runtime wiring: existing v1a N6 context compiler has local key/artifact behavior and must be routed through shared key/cache primitives rather than extended with another local cache formula.
- Historical rollout finding, later superseded by promoted rows: resource sampling, v1b, and v1c direct `BackendLlmGateway` paths were deferred until their matrix rows were promoted.
- Finding tracked for contract enforcement: Codex exact reuse must require approval or explicit local approved-reuse setting with `non_provider=true` before schema/deterministic gate admission.

## 2026-05-29 - First Implementation Prep
- Moved task state to `implementation-prep`.
- Selected the LLM engineering `standardize-calling-wrapper` procedure for this implementation slice: existing `BackendLlmGateway` remains the provider path, and T-112 adds topic-selection runtime governance before provider/Codex/mock execution.
- Added `08-first-slice-implementation-prep.md` as the file-level preparation plan for the first code round.
- Locked first code commit boundary as shared runtime contracts and schema tests only. Backend primitives and v1a N6 wiring are subsequent commits after contract tests pass.
- Confirmed no new provider, provider secret, env key, model-routing registry, Prisma schema, or desktop UI change is part of round 1.

## 2026-05-29 - Contract-First Slice Implemented
- Added `packages/shared/src/research-lifecycle/topic-selection-llm-runtime-contracts.ts` with runtime vocabulary and JSON schemas for context policy profiles, profile registries, cache key/result envelopes, token-budget gate results, compression reports, prompt packet identity, redacted prompt packet artifacts, prompt quality reports, exact response reuse provenance, runtime audit envelopes, and audit projections.
- Added `packages/shared/src/research-lifecycle/topic-selection-llm-runtime-contracts.schema.test.ts` with first-slice negative tests for unknown context family, missing cache-key policy/schema/profile fields, invalid cache-hit/stale envelopes, missing token-budget decision, missing compression source refs, forbidden hidden reasoning/raw prompt payload fields, prompt variant requirements, bounded dynamic prompt material, Codex approval requirements, provider telemetry separation, and projection source-envelope refs.
- Updated shared exports in `packages/shared/src/research-lifecycle/index.ts`, `packages/shared/package.json`, and the barrel re-export surface test in `packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts`.
- Kept backend runtime primitives, `AgentOrchestrator` wiring, v1a N6 behavior changes, persistence fields, provider config, and provider canaries out of this slice as planned.
- Task state is now `in-progress`; the next implementation slice is the backend profile registry skeleton plus stable runtime key primitives.

## 2026-05-30 - Backend Registry And Key Primitive Slice Implemented
- Corrected `token_estimate_safety_margin` contract semantics from a 0-1 ratio to a multiplier with minimum `1`, matching the locked first-slice default `1.25`.
- Added `apps/backend/src/services/topic-selection-context-policy-profile-registry-service.ts` with hardcoded v1a N6 first-slice `ContextPolicyProfile` defaults for need candidate generation, explorer, deep critic, arbiter issue framing, and arbiter final synthesis.
- Added `apps/backend/src/services/topic-selection-context-policy-profile-registry-service.unit.test.ts` covering default registry validation, profile hash generation, unknown profile failure, version mismatch, slot/profile mismatch, expected hash drift, duplicate profile/slot detection, policy drift, and schema-invalid rows.
- Added `apps/backend/src/services/topic-selection-llm-runtime-key-builder-service.ts` with stable hash builders for context packet cache keys, source ref hashes, generic payload hashes, and prompt packet identity.
- Added `apps/backend/src/services/topic-selection-llm-runtime-key-builder-service.unit.test.ts` proving cache key drift on slot/context/profile/model changes, provider key completeness, order-insensitive source-ref hashing, prompt variant binding, dynamic prompt material hash binding, and malformed prompt identity rejection.
- Still no `AgentOrchestrator` wiring, provider call changes, persistence fields, provider config, or provider canaries in this slice.
- Follow-up primitive slice completed the `ConservativeTokenEstimator` plus token-budget gate service; read-through context cache remains next.

## 2026-05-30 - Token Estimator And Budget Gate Primitive Slice Implemented
- Added `apps/backend/src/services/topic-selection-conservative-token-estimator-service.ts` with deterministic local CJK, Latin, JSON, and schema-overhead estimates plus a safety-margin multiplier.
- Added `apps/backend/src/services/topic-selection-conservative-token-estimator-service.unit.test.ts` covering deterministic CJK/text estimates, JSON/schema overhead, safety-margin application, and invalid safety-margin rejection.
- Added `apps/backend/src/services/topic-selection-token-budget-gate-service.ts` with schema-validated token-budget gate results driven by the resolved `ContextPolicyProfile`.
- Added `apps/backend/src/services/topic-selection-token-budget-gate-service.unit.test.ts` covering `within_budget`, `requires_compression`, compression-disallowed blocking, post-compression over-budget blocking, and unknown-estimate allow/block behavior.
- The gate service records provider/model/profile identity fields, estimated input/output tokens, context window, schema overhead, decision, compression strategy ref, blocker codes, and warning codes.
- This slice still does not wire `AgentOrchestrator`, does not call providers, does not add persistence fields, and does not run provider canaries.
- Next implementation slice: read-through context packet cache service boundary, followed by response reuse/audit runtime skeleton.

## 2026-05-30 - Context Packet Cache Primitive Slice Implemented
- Added `apps/backend/src/services/topic-selection-context-packet-cache-service.ts` with an artifact-ref-only context packet cache store and service boundary.
- Added `apps/backend/src/services/topic-selection-context-packet-cache-service.unit.test.ts` covering exact hit reuse, stale block/miss policy, context-family drift, source-ref drift, disabled-cache `not_applicable`, and put-if-absent preservation of the first exact artifact ref.
- The service validates cache keys and result envelopes against the shared T-112 schemas, requires the resolver-produced `context_policy_profile_hash`, and never stores business payloads or provider responses.
- This slice still does not wire the v1a N6 context compiler, does not add persistence fields, does not modify provider calls, and does not run provider canaries.
- Next implementation slice: response reuse/audit runtime skeleton, then v1a N6 context compiler read-through integration when the primitive set is ready.

## 2026-05-30 - Production-Shaped Local Context Cache Tests Implemented
- Extended `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts` with optional runtime context cache bindings. Default compiler behavior remains unchanged when no binding is supplied.
- Added v1a N6 production-shaped local tests in `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts` using real exploration/arbiter context payloads, the artifact boundary, in-memory control-plane repository, and `TopicSelectionContextPacketCacheService`.
- Exact runtime cache hit now reuses existing context artifact refs and returns `cache_hit=true` in the compiled context packets without writing duplicate context artifacts for the same N6 attempt.
- Stale and context-family-drifted runtime cache entries block before artifact writes, preserving the authority/write boundary.
- This is still a local runtime test layer: no live provider invocation, no `AgentOrchestrator` provider preflight, no persistence schema change, and no provider canary execution.

## 2026-05-30 - Production-Shaped Token Budget Harness Layer Implemented
- Extended `TopicSelectionAgentOrchestratorService` with optional runtime token-budget input and preflight evaluation before mocked/Codex/provider source execution.
- The preflight uses `TopicSelectionTokenBudgetGateService`, resolved model/profile identity, rendered messages, output schema, and the first-slice `ContextPolicyProfile`.
- Over-budget provider invocations now block before `BackendLlmGateway.createStructuredOutput`; audit artifacts carry the token-budget blocker/warning codes and provider provenance identity while provider call count remains `0`.
- Extended `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` to bind the v1a N6 need-candidate-generation context policy profile and pass token-budget input into the single-agent invocation path.
- Added unit/harness tests for `AgentOrchestrator` and v1a N6 adapter over-budget provider fixtures. The adapter test proves no ranked draft artifact is written when the budget gate blocks.
- Compression execution is intentionally not wired in this layer. `requires_compression` remains a runtime block until compression reports are wired into context rewrite and prompt re-render.
- No live provider canaries, provider secrets/config changes, DB schema changes, or desktop UI changes were introduced.

## 2026-05-30 - Backend Compression Runtime Primitive Implemented
- Added `apps/backend/src/services/topic-selection-compression-runtime-service.ts`.
- The service creates shared-schema-validated `TopicSelectionCompressionReportEnvelope` records with source refs, input/compressed/summary hashes, before/after token estimates, redaction policy, executor kind, strategy id/version, preserved fact kinds, quality-gate result, blockers, and warnings.
- The service fails closed for profile hash drift, missing source refs, disallowed compression profile, executor/profile mismatch, missing strategy id/version, and redaction policy drift.
- The quality gate blocks compressed payloads or summaries that contain forbidden persisted classes such as hidden reasoning, raw provider logs, credentials, provider secrets, API keys, or unredacted private content.
- The quality gate blocks when required preserved facts are dropped, including blockers, residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, and recheck hints.
- Added `apps/backend/src/services/topic-selection-compression-runtime-service.unit.test.ts` covering valid reports, dropped risk/gap/recheck facts, forbidden payloads, drift rejection, executor policy rejection, redaction drift, and non-reducing compression warnings.
- This remains a primitive layer: no v1a N6 automatic context rewrite, no Codex compression invocation, no provider canary, no DB schema change, and no provider secret/config change.

## 2026-05-30 - WorkflowHarness Token Gate Production-Shaped Verification Implemented
- Extended `TopicSelectionWorkflowHarnessGenerateNeedCandidateInput` with optional `runtime_token_budget_overrides`.
- Included runtime token-budget overrides in the N6 scenario input hash so replay identity changes when the preflight budget fixture changes.
- Passed the overrides from WorkflowHarness into `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`, which already binds the first-slice v1a N6 `ContextPolicyProfile`.
- Added a WorkflowHarness test for a `provider_llm`/product N6 scenario with an over-budget fixture after compression is already applied.
- The test proves the scenario blocks with `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION`, provider gateway call count stays `0`, ranked/admission/routing artifacts are not written, context refs remain auditable, and no NeedCandidate authority record is created.
- This is the first production-shaped end-to-end local N6 token-gate path; live OpenAI/DashScope canaries and automatic compression retry remain pending.

## 2026-05-30 - Readiness Review Findings Fix Slice Implemented
- Fixed audit gap: `TopicSelectionAgentInvocationAuditSnapshot` now requires `token_budget_gate_result`, and `AgentOrchestrator` writes the gate result into both invocation results and audit artifacts.
- Fixed debate-slot bypass: v1a N6 `TopicSelectionNeedDiscoveryDebateLoopService` now binds first-slice context runtime profiles for explorer, deep critic, arbiter issue framing, and arbiter final synthesis before calling `AgentOrchestrator`.
- Fixed Codex cached exact reuse gap: `codex_assisted` cached reuse now requires operator approval or explicit local approval setting plus exact non-provider reuse provenance, with response hash, prompt packet hash, profile hash, and approval drift checks before schema validation.
- Fixed provider telemetry gap: `BackendLlmGateway` records provider-side cache hit/read/write fields from provider usage details, and resource-sampling telemetry aggregation preserves them as provider telemetry only.
- Added compression report recording at the orchestration boundary: when token budget requires compression and the caller supplies compressed material, `AgentOrchestrator` records a quality-gated `TopicSelectionCompressionReportEnvelope` diagnostic artifact and still blocks provider execution until node-level prompt/context rewrite is wired.
- Added focused tests for audit gate persistence, Codex reuse provenance artifact recording, v1a N6 debate token-budget preflight, provider-side cache telemetry, and compression-report artifact recording.

## 2026-05-30 - v1a N6 Single-Agent Compression-And-Rerender Slice Implemented
- Extended `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` with a first-slice deterministic compression loop for single-agent N6 provider/Codex/mock invocations.
- The adapter now evaluates the fully rendered N6 prompt with `TopicSelectionTokenBudgetGateService` before invoking `AgentOrchestrator`; only `requires_compression` enters the local compression path.
- The compression path creates a `context_compression_report` artifact through the existing artifact boundary, using `TopicSelectionCompressionRuntimeService` for source refs, hashes, redaction policy, token estimates, executor kind, strategy version, and quality gate.
- The compressed prompt payload carries a `compressed_context` block with source context packet hashes, a synthetic compression report ref, compacted exploration/arbiter payloads, and a preserved fact inventory for method-family gaps, source-health warnings, unresolved challenges, blockers, and residual risks.
- The final invocation passes the compression report artifact ref into `AgentOrchestrator` runtime provenance and re-runs the token-budget gate with compressed estimates before any provider call.
- `WorkflowHarness` now includes the compression report artifact ref in generated N6 trace source/artifact refs, keeping replay/audit visibility while preserving authority-write boundaries.
- Added adapter and WorkflowHarness tests proving an over-target N6 provider-shaped fixture records the report, re-renders compressed context, performs exactly one gateway call, and still runs schema validation, candidate admission, supplemental routing, and persistence gates.
- No provider SDK path, provider secret/config, Prisma schema, or desktop UI change was introduced.

## 2026-05-30 - v1a N6 Compression Negative Closure
- Added adapter tests for two failure modes after compression is attempted:
  - compressed context is still over budget, which records a `context_compression_report` artifact but blocks before provider calls and before ranked/admission/routing/authority writes;
  - compression quality gate drops required preserved facts, which surfaces `COMPRESSION_QUALITY_GATE_BLOCKED` at the N6 adapter result and still blocks provider/authority side effects.
- Added a WorkflowHarness scenario for the post-compression over-budget path, proving the compression report remains visible in trace refs while gateway call count and NeedCandidate authority writes stay at zero.
- Tightened adapter failure semantics so compression quality blocker/warning codes are merged into the top-level N6 result instead of being hidden behind the secondary token-budget block.

## 2026-05-30 - Compression Identity Binding Slice
- Extended `TopicSelectionPromptPacketIdentity` with explicit `compression_report_ref`, `compression_report_hash`, and `compressed_context_hash` fields. These fields are required in the shared prompt identity contract and default to `null` only when no compression participated in the rendered prompt.
- Extended the backend runtime key builder so compression report drift and compressed context drift change the prompt packet hash. This prevents a compressed prompt from sharing identity with the original long-context prompt or with a different compression report artifact.
- Extended `TopicSelectionAgentInvocationProvenance` and `TopicSelectionAgentOrchestratorService` runtime provenance with `compression_report_hash` and `compressed_context_hash`, in addition to the existing compression report ref.
- Updated the v1a N6 single-agent adapter to pass the recorded `context_compression_report` artifact hash plus the compressed context hash into `AgentOrchestrator` for both successful compressed invocations and blocked post-compression paths.
- Tightened Codex-assisted prompt identity handling: a supplied `prompt_packet_hash` is accepted only when it matches the current runtime-computed prompt hash, including compression identity. This prevents a stale Codex/reuse prompt hash from masking compression report drift.
- Added focused tests proving compression identity is schema-required, key-builder-bound, included in invocation provenance, and drift-sensitive at the prompt packet hash layer.
- This slice still does not add live provider canaries, DB persistence fields, desktop UI, or provider SDK/config changes.

## 2026-05-30 - Prompt Packet Runtime And Quality Gate Slice
- Added `apps/backend/src/services/topic-selection-prompt-packet-runtime-service.ts` as the first runtime prompt-packet builder.
- The service creates a redacted/ref-backed prompt artifact envelope and a schema-validated `PromptQualityReport` from the rendered messages, source refs, context packet hashes, prompt variant, slot/profile hash, model option, normalized params, compression identity, runtime modifiers, output contract, and redaction policy.
- `AgentOrchestrator` now runs prompt packet preparation for runtime-enabled invocations before token-budget preflight, records redacted prompt and prompt-quality diagnostic artifacts, binds the runtime-computed prompt hash into provenance, and blocks prompt-quality failures before provider/Codex/mock execution.
- Runtime prompt provenance now includes `redacted_prompt_artifact_ref` and `prompt_quality_report_ref` without persisting rendered prompt text.
- Prompt quality blockers currently cover missing source/context refs, dynamic material override-policy violations, and forbidden secret/raw-log payload shapes. Governance phrases such as `no_hidden_reasoning` and natural terms such as `risk-aware` are explicitly not treated as secret or hidden-reasoning leakage.
- Added focused tests for redacted prompt artifact creation, forbidden secret/raw-provider-log blocking before provider calls, profile/slot drift rejection, missing source-ref blocking, and N6 debate regression coverage.
- This slice does not add a persisted prompt cache index, semantic response cache, provider canaries, DB schema changes, or desktop UI changes.

## 2026-05-30 - Prompt Packet Cache Primitive Slice
- Added a shared `TopicSelectionPromptPacketCacheResultEnvelope` contract and schema test.
- Added `apps/backend/src/services/topic-selection-prompt-packet-cache-service.ts` with an artifact-ref-only prompt packet cache/index boundary.
- The service indexes exact `prompt_packet_hash` hits to existing redacted prompt artifact refs and prompt quality report refs, including artifact hashes, prompt variant, invocation slot, profile hash, output contract, redaction policy, freshness, quality decision, blockers, warnings, and provenance.
- Cache hits do not contain prompt payload text, do not store or return provider responses, and are not sufficient to skip provider/Codex/mock execution, schema validation, deterministic gates, or authority boundaries.
- Stale prompt packet index entries block or miss according to the slot profile cache policy. Stored-entry drift, profile/slot drift, output-contract drift, redaction drift, compression identity drift, model option drift, normalized params drift, and runtime-modifier drift block as `blocked_drift`.
- Added unit tests for exact hits, stale block/miss behavior, disabled-cache `not_applicable`, drift blocking, and put-if-absent preservation of the first exact artifact refs.
- This slice remains a backend primitive. It does not add a persisted DB index, does not silently reuse responses, does not change provider call behavior, and does not run live provider canaries.

## 2026-05-30 - Prompt Packet Cache Read-Through Wiring Slice
- Wired `TopicSelectionPromptPacketCacheService` into `TopicSelectionAgentOrchestratorService` for runtime-enabled invocations.
- `AgentOrchestrator` now builds the exact prompt packet identity first, checks the prompt packet cache, and on an exact hit reuses only the existing redacted prompt artifact ref and prompt quality report ref.
- Prompt cache misses still record redacted prompt and prompt-quality artifacts through the control plane, then index their refs and artifact hashes with put-if-absent semantics.
- Stale or drifted prompt cache entries become prompt-runtime blockers before provider/Codex/mock execution; they do not fall through to unsafe artifact reuse.
- Exact prompt cache hits are compared against the current runtime-computed `PromptQualityReport`; quality-decision/blocker/warning drift blocks before execution instead of trusting an old quality report.
- Provider execution semantics are unchanged: a provider-mode prompt cache hit still calls `BackendLlmGateway.createStructuredOutput`, records live provider provenance/telemetry, and reports response cache status as `not_applicable`.
- Added orchestrator regression tests proving exact prompt cache hits reuse prompt artifacts without reusing provider responses or reducing live provider call count, and proving stale quality-report drift blocks before provider execution.

## 2026-05-30 - Minimal Provider Canary Harness Slice
- Added `apps/backend/src/services/topic-selection-provider-canary-service.ts` as a thin provider-canary harness over the existing `AgentOrchestrator -> BackendLlmGateway` boundary.
- The canary deliberately uses the implementation-ready v1a N6 need-candidate runtime profile, because broader v1b/v1c provider rows remain inventory/planned until their rows are promoted.
- The harness supports OpenAI and DashScope model-option routes for two checks:
  - provider-required prompt-cache exact hit: invoke the same runtime prompt twice and verify two gateway calls still occur while only redacted prompt artifact refs and prompt-quality report refs are reused;
  - token over-budget fixture: set the estimated input above the context window after compression and verify provider call count remains `0`.
- The canary fails closed if the resolved context profile no longer carries the `provider_required_live` execution modifier.
- Added `apps/backend/src/services/topic-selection-provider-canary-service.unit.test.ts` with fake-gateway canaries for OpenAI and DashScope. These local tests also assert provider-side cache telemetry remains telemetry and does not become response reuse.
- Added optional live OpenAI/DashScope test entries gated by `T112_PROVIDER_CANARY_LIVE=1`, `BACKEND_TEST_PRESERVE_REAL_ENV=1`, and the relevant provider key. They are skipped by default so normal CI/dev runs do not require secrets or spend provider budget.
- This slice does not add a second provider path, direct SDK usage, provider secrets, DB prompt index, desktop UI, or v1c provider-canary workflow wiring. Live provider evidence was gated at introduction time and was later collected after explicit approval.

## 2026-05-30 - Persistent DB Prompt Packet Index Slice
- Added Prisma SSOT model `TopicSelectionPromptPacketCacheIndex` and migration `20260530170000_add_topic_selection_prompt_packet_cache_index`.
- The persistent index stores exact prompt-packet identity metadata, artifact refs, artifact hashes, quality decision, freshness status, provenance ref, blocker codes, and warning codes only.
- The table intentionally does not store rendered prompt text, prompt payloads, provider responses, provider telemetry payloads, secrets, credentials, or authority payloads.
- Moved the prompt cache store interface to `apps/backend/src/repositories/topic-selection-prompt-packet-cache-store.repository.ts`, keeping `TopicSelectionPromptPacketCacheService` dependent on an abstract store rather than Prisma.
- Added `apps/backend/src/repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.ts` implementing `findByPromptPacketHash` and put-if-absent semantics over Prisma, including duplicate-race handling.
- Wired `buildApp` so Prisma-backed deployments use the persistent prompt packet cache store, while memory deployments still use the in-memory store. Tests can still inject a custom store.
- The Prisma-backed app wiring opts into a missing-table fallback for this cache-only index: until an approved migration is applied to a target DB, prompt-cache lookup behaves as miss and put behaves as no-op. This keeps the cache non-authoritative and prevents pending DB apply from blocking live topic-selection flows.
- Added repository tests proving the Prisma store persists artifact-ref-only rows, preserves first-writer semantics, maps stale/blocking metadata back into cache entries, and never persists prompt/provider payload fields.
- Refreshed `docs/context/db/schema.json` through DB SSOT sync. Local/dev DB apply is recorded in the follow-up apply section below; staging/prod apply remains pending explicit environment approval.

## 2026-05-30 - Persistent DB Prompt Packet Index Local/Dev Apply
- After explicit DB write approval, applied `20260530170000_add_topic_selection_prompt_packet_cache_index` to the local/dev PostgreSQL target loaded from `.env.local`.
- Post-apply `prisma migrate status` reports the local/dev database schema is up to date.
- Ran a real Prisma store smoke against the migrated table: insert exact prompt packet index row, read by `promptPacketHash`, confirm duplicate put-if-absent preserves the first writer, then clean up the smoke row.
- The missing-table fallback remains in app wiring for environments that have not yet applied the migration; it is a cache-only safety path and is not used as an authority source.

## 2026-05-30 - Production-Shaped Runtime Verification
- Ran LLM registry/config gates and local provider canary tests. Registry/config passed; local provider canaries passed with 34/36 active tests and 2 live-provider tests skipped by explicit env/key gate.
- Ran real Prisma prompt-index smoke over `AgentOrchestrator` with a stub provider gateway. Exact prompt packet cache hit reused redacted prompt and prompt-quality artifact refs while still making two provider gateway calls; provider response cache status stayed `not_applicable` and response reuse refs stayed `null`.
- Ran real Prisma over-budget smoke over the same runtime boundary. Token-budget gate blocked with `blocked_over_budget` before provider execution and provider gateway call count `0`.
- Created local/dev balanced resource sample fixture `resource_sample_set_t112_prod_balanced_20260530` because the default deterministic sample underfilled the `baseline` role for v1a replay harness verification.
- Prisma-backed v1a N1-N9 main WorkflowHarness smoke passed with the balanced sample, deterministic mock LLM, and no external provider calls. It persisted an N6 prompt index row with hash `6b124fc37338c6179d4779d1327ca079d78b7eee5a1c6f3236a609a3af1f04e0`.

## 2026-05-30 - Production-Shaped Replay Finding Fix
- Fixed `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` so HTTP assertion failures preserve structured controller error metadata (`statusCode`, `errorCode`, `details`, response body, and parsed payload).
- Fixed `expectReplayInputHashMismatch` control flow so it only handles errors thrown by the harness request and no longer catches its own assertion failure as an unexpected transport error.
- Corrected the replay drift fixture from `scenario_input.policy_version` to `output_schema_version`. The harness route envelope intentionally overwrites `policy_version` from the supported route policy, while `output_schema_version` participates in N6-N9 input hashes and is valid for exercising replay drift.
- Re-ran the Prisma-backed v1a replay smoke with `resource_sample_set_t112_prod_balanced_20260530`. Exact replay preserved authority counts and LLM call count `0`; drifted N6-N9 replay inputs all produced `REPLAY_INPUT_HASH_MISMATCH` without invoking the LLM gateway.
- Closed the default deterministic mock sampling underfill without relaxing production resource-sampling guardrails. When mock sampling does not cover all harness roles, the script records the underfilled sample and falls back to the T-112 balanced replay fixture for local/dev smoke verification.

## 2026-05-30 - Live Provider Canary Evidence
- After explicit approval to use local provider configuration, ran live OpenAI and DashScope provider canaries through the existing `AgentOrchestrator -> BackendLlmGateway` path.
- The live unit canary suite passed with 6/6 tests active: local fake-gateway semantics, OpenAI live invocation, and DashScope live invocation all passed.
- Ran an additional production-shaped Prisma live evidence script using real `BackendLlmGateway`, Prisma control-plane artifacts, and the Prisma prompt packet cache index.
- For both OpenAI and DashScope, exact prompt-cache hits reused only redacted prompt artifact refs and prompt-quality report refs while still making two live provider calls. Provider response cache status stayed `not_applicable`, and response reuse refs stayed `null`.
- For both providers, over-budget fixtures blocked before provider execution with `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION` and provider call count `0`.
- Temporary prompt index rows and diagnostic artifacts from the direct live evidence run were cleaned; post-cleanup counts were `0/0`.

## 2026-05-30 - v1a Runtime Closure Finding Fix
- Closed the v1a review finding that N5/N7/N8 still had `AgentOrchestrator` LLM calls without T-112 runtime preflight. Added registered context runtime profiles for:
  - v1a N5 `evidence_extraction`;
  - v1a N7 `adjudication_recommendation`;
  - v1a N8 `confirmation_semantic_review`.
- Wired `WorkflowHarness` so N5/N7/N8 invocations now pass `runtime_token_budget` with slot-specific profile ids, prompt-template ids, context families, context payloads, and explicit context packet hashes.
- Wired the v1a N6 context packet read-through cache into the main app/harness path by injecting `TopicSelectionContextPacketCacheService` and passing runtime cache bindings into `TopicSelectionNeedDiscoveryContextCompilerService`.
- Resolved provider/model profile metadata before building N6 runtime context cache bindings, so provider-required keys include concrete `model_option_id` and `normalized_params_hash` rather than a provider-mode placeholder.
- Exposed `runtime_cache_key_hash` on need-discovery context packets and compiled context pairs. This makes the shared runtime cache key auditable separately from the packet-local compatibility `cache_key`.
- Changed `AgentOrchestrator` prompt packet identity to prefer explicit `context_packet_hashes`; callers may still fall back to legacy ref hashing only when explicit packet hashes are unavailable.
- Updated the N6 single-agent adapter and debate loop so prompt identity uses actual exploration/arbiter context payload hashes. Debate roles now bind role-appropriate context refs/hashes instead of every role carrying both exploration and arbiter context refs.
- Relaxed adapter artifact-ref expectations for context cache hits from "same workflow run" to "same semantic context contract." A context cache hit may legitimately return an artifact ref from the source workflow run; consumers still validate title card, context family, policy/schema/profile, execution mode, and payload hash.
- Kept compression quality rules in the shared compression runtime and runtime profile contracts. No node-local compression quality fork was introduced in this repair.
- Historical repair scope: this repair did not promote resource sampling, v1b, or v1c rows to implementation-ready status, and it did not add provider SDK paths, provider secrets, semantic response cache, or desktop UI. Later D20-D32 sections record the rows promoted after this repair.

## 2026-05-31 - Production-Shaped v1a Provider Verification Fix
- A real OpenAI v1a provider harness run exposed that provider-generated N5 EvidenceMap extraction can materialize as `ready_with_warning` while still creating authority refs and a valid Node 6 handoff.
- Updated `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` so provider-backed EvidenceMap extraction accepts `ready` or `ready_with_warning`; `ready_with_warning` must still carry warning codes in the downstream handoff.
- The deterministic/non-provider harness expectation remains strict `ready`.
- This is a harness expectation fix, not a relaxation of authority boundaries: EvidenceMap authority refs, EvidenceUnit refs, handoff creation, runtime agent success, and downstream deterministic gates are still required.

## 2026-05-31 - v1a Runtime Policy Stress Harness
- Added WorkflowHarness-level runtime stress coverage before promoting the same pattern to v1b/v1c.
- Added a deterministic context-producer stress path for v1a N1/N2/N3/N4 and N9. This path verifies topic-seed refs, literature snapshot hashes, source-health warning handoff, SearchPlan/SearchRun drift blocking before authority writes, N9 exact replay, and N9 lineage drift blocking without invoking the LLM gateway.
- The N6-first stress path now exercises exact context-cache read-through, provider-required live-call behavior on prompt/context cache hits, model-option drift miss behavior, stale context-cache blocking, deterministic schema/admission/routing artifacts after cache hit, and zero NeedCandidate authority writes when persistence is forbidden.
- The v1a chain stress path runs the LLM-bearing N5/N6/N7/N8 sequence with fake gateway outputs but production-shaped `AgentOrchestrator` calls:
  - N5 provider EvidenceMap extraction records token-budget audit and materializes a warning-backed EvidenceMap handoff.
  - N6 provider generation triggers over-target compression, records a compression report, re-renders the prompt, and still passes schema/admission/persistence gates.
  - N7 provider adjudication records token-budget audit and must carry `METHOD_FAMILY_COVERAGE_GAP` when the support packet reports it.
  - N8 provider semantic review records token-budget audit before human-confirmed ValidatedNeed authority creation.
- This is a policy stress suite, not throughput/load testing. It validates runtime decisions, provenance, call counts, context lineage, and authority boundaries under producer hash-drift, compressed, cache-hit, drift, and stale conditions without real provider credentials.

## 2026-05-31 - Prisma-Backed v1a Runtime Stress Runner
- Added `.ai/scripts/topic-selection-v1a-runtime-stress.mjs` and `pnpm topic-selection:v1a-runtime-stress`.
- The runner reuses the existing Prisma-backed v1a harness instead of introducing another workflow path. Each child run executes N1-N9 with `TOPIC_SELECTION_V1A_HARNESS_REPLAY_SMOKE=1`, reads the child summary artifact, and then queries the Prisma prompt packet index for rows created during the stress window.
- Stress mode is parameterized by `TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS` and `TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES`. Supported N6 modes are `single_agent` and `multi_agent_debate`.
- The runner fails closed if a deterministic stress child invokes the harness LLM gateway, if N6 does not persist candidates, if replay smoke fails, if input-hash drift invokes the LLM gateway, or if prompt packet index rows/slot distribution are missing.
- This remains a local/dev production-shaped stress runner. It writes local Prisma workflow records and prompt index rows, but does not call live providers by default and does not require provider secrets.

## 2026-05-31 - Phase 1 Closure Planning
- Added `Next Phase 1 - v1a Runtime Closure Pack` to `01-plan.md`.
- Added `09-v1a-runtime-stress-runbook.md` with usage, prerequisites, parameters, expected results, artifact locations, and troubleshooting for the Prisma-backed v1a runtime stress runner.
- Tightened the runtime stress runner after review:
  - child failures now report child stderr/stdout before attempting to read the summary artifact;
  - prompt packet index assertions now check expected slot minimums for single-agent and multi-agent-debate modes;
  - prompt quality validation now checks for `block` decisions rather than a non-existent `fail` decision.

## 2026-05-31 - v1b N7 Runtime First Slice Planning Sync
- Added `Next Phase 2 - v1b N7 Runtime First Slice` to `01-plan.md` as the post-v1a execution checklist.
- Confirmed the planning stance for D19 discussion: v1b N7 should be treated as a context hub plus support-artifact admission surface before it is treated as a provider-generation node.
- Identified the first N7 slot set for D19 alignment:
  - `n7_candidate_grouping`;
  - `n7_failed_trial_synthesis`;
  - `n7_n8_debate_admission_review`.
- Added D23 as a required support-path decision because current v1b harness/script paths can produce semantic artifacts with placeholder prompt identity metadata. Production/provider support artifacts must not be admitted under T-112 without real prompt packet, profile, input, and provenance hashes.
- Documented the implementation boundary for the first N7 slice:
  - keep N7 deterministic candidate selection, trial ledger, N8 admission, loopback, and persistence gates as authority;
  - add runtime profile resolution, context admission, prompt identity validation, token-budget preflight, compression report validation, replay/idempotency checks, and audit provenance around support artifacts and context handoffs;
  - do not promote v1b N4/N6/N8 or DB-backed context packet cache in the same slice unless D19-D22 explicitly change scope.

## 2026-05-31 - D19 Output Context Clarification
- Confirmed D19.1: v1b N7 may proceed as the first post-v1a runtime slice, without promoting v1b N4/N6/N8 in the same slice.
- Clarified that v1b already has a workflow-level `N7ToN8Handoff@v1` contract. T-112 does not need to invent the business handoff; it needs runtime context families/profiles for cache, compression, prompt identity, token budget, replay, and audit semantics.
- Locked D19-B/C for planning:
  - N7 support-slot inputs share the runtime context family `v1b_n7_topic_question_hardening` in this slice;
  - support slot isolation comes from `invocation_slot_id`, prompt variant, profile hash, frozen input hash, and support artifact identity rather than one top-level runtime family per support slot;
  - N7 output context is route-specific and does not reuse the support-slot input family.
- Corrected the proposed N7 output context model from one generic handoff family to two route-specific runtime context projections:
  - `v1b_n7_to_n8_topic_question_contract_context` wraps the existing N7-to-N8 forward handoff and is consumed by N8 value assessment;
  - `v1b_n7_to_n6_failed_trial_loopback_context` carries failed-trial synthesis, N8 feedback, failed candidate lineage, and regeneration hints back to N6.
- The N7-to-N6 projection is initially a T-112 runtime context artifact, not a new workflow handoff kind in this first slice. A formal `N7ToN6Handoff@v1` remains deferred until the N6 loopback generation surface is promoted.

## 2026-05-31 - D19-D Per-Slot Policy Lock
- Locked `n7_candidate_grouping` as an optional support-only semantic slot for duplicate/overlap grouping, candidate relationship hints, priority support, and risk/gap/recheck visibility. It may use accepted risks and residual gaps only as labeled hints, never as standalone candidate evidence.
- Locked `n7_failed_trial_synthesis` as the support-only repair context for N7 candidate-trial exhaustion and N6 regeneration. It may carry failure history, N8 feedback, failed-candidate lineage, and regeneration hints, but it cannot create new candidate authority or downstream recheck authority.
- Locked `n7_n8_debate_admission_review` as the support-only admission review for N8 gate-rejected feedback and readmission/debate escalation. It may use current N8 feedback and directly relevant prior rejection/value facts, but it must not import unrelated long-term memory.
- D19-D first-slice cache identity requirements:
  - `n7_candidate_grouping`: frozen input hash, N6 handoff hash, candidate set hash, candidate hashes/order, profile hash, prompt variant, output contract, runtime modifiers, and redaction policy;
  - `n7_failed_trial_synthesis`: failed-trial ledger hash, N8 feedback hash, previous N7 handoff hash, failed candidate hashes, candidate set hash, profile hash, prompt variant, output contract, runtime modifiers, and redaction policy;
  - `n7_n8_debate_admission_review`: selected or failed candidate hash, N8 feedback hash, previous N7 handoff hash, failed contract hash, optional value assessment hash, profile hash, prompt variant, output contract, runtime modifiers, and redaction policy.
- D19-D first-slice compression preserved facts:
  - `n7_candidate_grouping`: candidate ids/hashes, overlap groups, grouping rationale, priority signals, candidate relationship hints, risk/gap/recheck hints;
  - `n7_failed_trial_synthesis`: failure reasons, failed candidate ids/hashes, affected refs, previous N7 handoff refs/hashes, regeneration hints, loopback target, accepted risks, residual risks, blocker codes, and recheck hints;
  - `n7_n8_debate_admission_review`: N8 gate rejection reason, debate/admission need, selected or failed candidate identity, failed contract identity, value/risk facts, blockers, accepted risks, residual risks, and recheck hints.
- D19 is now closed for v1b N7 first-slice planning. Remaining pre-implementation decisions are D23 for semantic support generation/admission path, D20 for context packet persistence stance confirmation, D21 for broader compression policy, and D22 for verification/stress layering.

## 2026-05-31 - D23-A Semantic Support Generation Path Lock
- Locked D23-A: production/provider/Codex generation for promoted v1b N7 semantic support slots must pass through the shared T-112 runtime boundary.
- A v1b `SemanticSupportAdapter` may own node semantics, including slot selection, context compilation, frozen input/N6 handoff/N8 feedback binding, output contract selection, and optional-support behavior.
- The adapter must delegate mechanical runtime semantics to `AgentOrchestrator` or an equivalent shared runtime facade:
  - prompt packet identity;
  - prompt packet cache;
  - token-budget preflight;
  - compression report validation;
  - provider-required live-call guard;
  - exact response reuse provenance guard;
  - provider telemetry separation;
  - runtime audit envelope.
- Direct `BackendLlmGateway` support generation is not T-112-compliant for promoted v1b N7 slots. A direct provider/script-generated support artifact may be admitted only if D23-B/D admission rules accept its runtime provenance, and placeholder prompt/profile/slot hashes remain blocked except for D23-C fixture-only exceptions.

## 2026-05-31 - D23-B Frozen Support Artifact Admission Lock
- Locked D23-B: frozen or externally produced v1b N7 support artifacts may be consumed only through runtime admission before N7 deterministic gates.
- Admission must verify:
  - slot id is one of `n7_candidate_grouping`, `n7_failed_trial_synthesis`, or `n7_n8_debate_admission_review`;
  - `normalized_output_ref` resolves to a frozen control-plane artifact;
  - artifact payload hash, `normalized_output_hash`, `structured_output_hash`, and declared support artifact hash all match;
  - `context_policy_profile_id`, `context_policy_profile_hash`, `prompt_packet_hash`, `runtime_invocation_context_hash`, output contract, prompt variant key, and redaction policy match the current promoted-slot runtime identity;
  - frozen input hash, N6 handoff hash, candidate set hash, and slot-specific source hashes match the current N7 run;
  - execution provenance is explicit, including provider live-call telemetry refs for `provider_llm`, `non_provider=true` for Codex/mock/reuse, and approval refs for Codex exact reuse.
- Admission success only adds the artifact as non-authority support context. It does not create authority, satisfy provider live-call requirements, or skip N7 deterministic gates.
- Admission failure blocks before N7 deterministic gates. Missing runtime provenance must not be downgraded to a warning, inferred by rehashing, or treated as a cache hit.

## 2026-05-31 - D23-C LLM-Operable Provenance Class Lock
- Locked D23-C around LLM-operable provenance rather than human-oriented audit completeness.
- v1b N7 support artifacts must carry a machine-readable `runtime_provenance_class`:
  - `runtime_verified`: produced or admitted through the T-112 runtime with real prompt/profile/runtime/source hashes. Eligible for production admission, prompt/cache/replay analysis, and LLM workflow-quality optimization evidence.
  - `fixture_replay`: explicit test/acceptance fixture or mocked replay. May drive harness/unit/acceptance tests, may contain synthetic or placeholder runtime identity, and must remain non-provider/non-authority. Not eligible for production admission or real prompt packet cache rows.
  - `legacy_unverified`: direct script/provider or historical artifact without verified runtime identity. May be used for migration diagnostics only. Not eligible for promoted-slot production admission, prompt cache rows, response reuse, or LLM workflow optimization evidence.
- Synthetic or placeholder runtime identity is allowed only under `runtime_provenance_class=fixture_replay`.
- Product/provider/Codex production admission requires `runtime_provenance_class=runtime_verified`.
- The purpose of this classification is to make downstream LLM agents robust when deciding whether an artifact is reusable workflow evidence, fixture coverage evidence, or migration-only diagnostic material.

## 2026-05-31 - D23-D Admission Failure Semantics Lock
- Locked D23-D: v1b N7 support artifact admission fails closed before deterministic gates.
- Optional absent support is distinct from malformed present support:
  - `n7_candidate_grouping` is optional. Complete absence may continue with a `support_absent` warning/context note, but a present malformed, drifted, legacy, or provenance-incomplete artifact blocks.
  - `n7_failed_trial_synthesis` is conditionally required for candidate-trial exhaustion and N6 loopback. It blocks when absent on that required path, may be absent on non-required paths, and blocks when present but invalid.
  - `n7_n8_debate_admission_review` is conditionally required when N8 feedback is `gate_rejected` and N7 needs readmission/debate admission. It blocks when absent on that required path, may be absent on non-required paths, and blocks when present but invalid.
- Admission failure must emit machine-readable blocker codes suitable for LLM workflow repair:
  - `N7_SUPPORT_ARTIFACT_PROVENANCE_MISSING`;
  - `N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID`;
  - `N7_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT`;
  - `N7_SUPPORT_ARTIFACT_PROFILE_DRIFT`;
  - `N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT`;
  - `N7_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT`;
  - `N7_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH`;
  - `N7_REQUIRED_SUPPORT_ARTIFACT_MISSING`;
  - `N7_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED`.
- Admission failure must not silently downgrade to warning, discard the bad artifact and continue, or implicitly trigger provider/Codex regeneration. Regeneration requires an explicit support-generation path.

## 2026-05-31 - D23-E Legacy Path Retirement Lock
- Locked D23-E: avoid long-term dual-track semantics between legacy v1b direct provider/script support generation and the promoted T-112 runtime path.
- Current v1b harness and scripts do not directly conflict with T-112 because v1b N7 is not yet runtime-promoted. They remain useful for deterministic workflow semantics, handoff, and loopback coverage.
- Once v1b N7 support slots are promoted, legacy direct provider/script support generation must not produce `runtime_verified` artifacts and must not be accepted in production admission.
- Migration sequence:
  - keep existing harness coverage while adding runtime-backed N7 support generation/admission tests;
  - classify existing fixture-style artifacts as `fixture_replay` through test helpers;
  - classify direct provider/script or historical outputs without runtime identity as `legacy_unverified` diagnostics during migration;
  - after runtime-backed replacement tests pass, remove promoted-slot direct `BackendLlmGateway`/script generation paths instead of leaving a permanent alternate path.
- Legacy paths may remain only for migration diagnostics outside promoted-slot admission. They must not feed product admission, prompt packet cache rows, response reuse, or LLM workflow optimization evidence.

## 2026-05-31 - D22 Verification Ladder Lock
- Locked D22 for v1b N7 runtime first slice as a promotion-gate ladder rather than generic throughput stress.
- Layer 1, unit/contract:
  - profile registry and profile hash drift;
  - runtime key builder and prompt identity drift;
  - support artifact admission helper;
  - `runtime_provenance_class` classification;
  - compression preserved-fact validation;
  - response reuse/provider-live guard regressions.
- Layer 2, harness policy stress:
  - exact replay without reinvocation;
  - frozen input drift;
  - support artifact hash drift;
  - optional absent versus malformed present support;
  - conditionally required support missing;
  - cache hit still runs N7 deterministic gates;
  - no authority bypass for candidate selection, trial ledger, N8 admission, loopback, or persistence.
- Layer 3, Prisma-backed local/dev runtime smoke:
  - N6->N7->N8 forward path with runtime-verified support;
  - N8->N7 feedback/readmission path;
  - N7->N6 failed-trial loopback context projection;
  - prompt packet cache remains metadata-only;
  - provider responses are not reused;
  - runtime audit/provenance artifacts are persisted or referenced as designed.
- Layer 4, executor/canary:
  - Codex-assisted or provider-capable N7 support generation, when enabled, must pass through shared runtime;
  - direct provider legacy generation must be detected as non-compliant or removed from promoted paths;
  - live provider canaries are optional for N7 until a provider-required N7 support surface is explicitly promoted.
- Layer 5, adversarial/long-context:
  - large candidate sets;
  - long N8 feedback;
  - failed-trial history;
  - placeholder runtime identity;
  - `fixture_replay` and `legacy_unverified` product-admission attempts;
  - raw provider log/secret-shaped payloads;
  - compression dropping risk/gap/recheck or failed-trial facts.
- Entry and exit gates:
  - first implementation may begin after D19/D23 are locked and L1/L2 cases are specified;
  - legacy promoted-slot direct provider/script paths must fully exit only after L1-L3 pass for the runtime-backed N7 support path;
  - expansion to v1b N4/N6/N8 requires N7 L1-L3 plus minimum L5 coverage for provenance class, drift, compression fact preservation, and no authority bypass.

## 2026-05-31 - D20 v1b N7 Context Packet Persistence Lock
- Locked D20 for the v1b N7 first slice: do not add a DB-backed context packet cache index.
- v1b N7 uses:
  - control-plane artifact refs/hashes for support artifacts, N7 output projections, and handoff context;
  - the existing prompt packet persistent index for prompt identity metadata;
  - process-local/runtime context packet cache for exact context artifact read-through when available.
- Context packet cache misses after process restart or deploy are acceptable. The node may recompile ref-backed context packets because they are acceleration/audit artifacts, not business authority.
- N7 output projections remain ref-backed artifacts:
  - `v1b_n7_to_n8_topic_question_contract_context`;
  - `v1b_n7_to_n6_failed_trial_loopback_context`.
- A DB-backed context packet cache may be reconsidered only after v1b/v1c rollout proves a concrete cross-process reuse requirement and defines freshness, migration, retention, cleanup, and non-authority semantics.

## 2026-05-31 - D21 v1b/v1c Compression Executor Lock
- Locked D21: `deterministic_structural` is the default compression executor for v1b/v1c runtime rollout.
- `codex_assisted` compression is allowed only when the slot profile explicitly permits semantic long-context compression. Its output remains non-authority, ref-backed, hash-checked, and quality-gated.
- Provider LLM compression is disallowed by default for v1b/v1c. A provider-required live slot must not silently use a provider-generated compressed context unless a future slot profile and canary explicitly promote that behavior.
- Compression reports and compressed context hashes must participate in prompt identity. Compression report drift or compressed context drift must change the prompt packet hash and block stale support admission.
- Compression cannot generate or override executable prompt content, deterministic gate inputs, support artifact authority, loopback authority, downstream recheck authority, or ref/hash lineage.
- v1b N7 first-slice support-slot executor policy:
  - `n7_candidate_grouping`: default `deterministic_structural`; `codex_assisted` may be enabled only for large candidate sets or semantic grouping-rationale compression; provider LLM compression is disallowed; preserved facts are candidate ids/hashes, candidate order, overlap groups, grouping rationale, priority signals, candidate relationship hints, and risk/gap/recheck hints.
  - `n7_failed_trial_synthesis`: default `deterministic_structural`; `codex_assisted` may be enabled only for long failed-trial history or N8 feedback semantic compression; provider LLM compression is disallowed; preserved facts are failure reasons, failed candidate ids/hashes, affected refs, previous N7 handoff refs/hashes, N8 feedback hash, regeneration hints, loopback target, accepted risks, residual risks, blockers, and recheck hints.
  - `n7_n8_debate_admission_review`: default `deterministic_structural`; `codex_assisted` may be enabled only for N8 feedback and value/risk context compression, not for rewriting the admission recommendation; provider LLM compression is disallowed; preserved facts are N8 gate rejection reason, debate/admission need, selected or failed candidate identity, failed contract identity, value/risk facts, blockers, accepted risks, residual risks, and recheck hints.
- Broader v1b/v1c defaults:
  - v1b N4/N6/N8 should start with structural compression first; Codex-assisted compression requires explicit profile permission and slot-specific preserved facts.
  - v1c promotion support and bounded debate role contexts should start with structural compression first; Codex-assisted compression may be considered only for explicit long-context support slots.
  - v1c downstream feedback normalization must preserve downstream source refs, malformed evidence markers, and recheck hints. Malformed reuse or compression must not create a downstream recheck.

## 2026-05-31 - v1b N7 Implementation Checklist and Readiness Review
- Converted D19-D23 into the Phase 2 implementation checklist in `01-plan.md`. The checklist is ordered by dependency: contract envelope, profile registry, admission helper, context/projection builder, runtime-backed generation adapter, harness integration, L1/L2 verification, L3 smoke, legacy exit, and governance.
- Readiness verdict: v1b N7 is ready to start L1/L2 implementation preparation. It is not ready for runtime promotion, provider/Codex production support generation, legacy path exit, or v1b N4/N6/N8 expansion until the blockers below are implemented and verified.
- Blocker R1, support artifact runtime envelope is incomplete for D23:
  - current shared `TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef` carries `prompt_packet_hash`, `input_hash`, `slot_spec_hash`, and `provenance_ref`, but it does not yet carry `runtime_provenance_class`, context policy profile id/version/hash, runtime invocation context hash, redaction policy, compression identity, source hash bundle, or runtime audit ref/hash;
  - current request validation accepts the same legacy envelope shape, so production admission cannot yet distinguish `runtime_verified`, `fixture_replay`, and `legacy_unverified` from schema alone;
  - the v1b harness e2e helper still defaults `prompt_packet_hash` to a placeholder hash when no value is supplied, which must become fixture-only after D23 is implemented.
- Blocker R2, v1b N7 context runtime profiles are not registered:
  - the runtime profile registry currently contains v1a N5/N6/N7/N8 runtime profiles only;
  - existing v1b model profiles for N7 support slots are agent/model profiles, not `ContextPolicyProfile` entries and do not satisfy T-112 profile hash, context family, compression, cache, or reuse semantics.
- Blocker R3, N7 support admission is still payload/hash-only:
  - current `resolveN7SemanticPayload` validates normalized output payload shape and matching payload hashes, but it does not verify profile hash, prompt packet hash against current runtime identity, runtime invocation context hash, source hashes, provenance class, redaction policy, or compression identity;
  - optional/conditionally-required slot behavior exists in deterministic N7 logic, but D23 blocker-code semantics still need a dedicated runtime admission helper.
- Blocker R4, runtime-backed N7 support generation does not exist yet:
  - current harness/script support artifact creation can produce non-runtime semantic artifacts for N7 support slots;
  - promoted-slot provider/Codex generation must be routed through `AgentOrchestrator` or an equivalent shared runtime facade before any support artifact can be classified as `runtime_verified`.
- Non-blocking assets already present:
  - N7 frozen input and N6 handoff loading already verify candidate-set lineage, candidate refs/hashes, and N8 feedback shape;
  - deterministic N7 candidate selection, trial switching, gate readmission, failed-trial loopback, and N7-to-N8 handoff behavior already have harness coverage;
  - N7 support payload contracts and model profile IDs already exist and can be reused as output-contract/model-profile inputs, as long as they are not treated as runtime profiles.
- Recommended first code slice:
  - implement I1/I2/I3 together, with no provider execution and no legacy removal;
  - land schema/profile/admission unit tests first;
  - only then wire the admission helper into N7 harness paths and add L2 replay/drift/no-authority-bypass tests.

## 2026-05-31 - v1a Runtime Invocation Context Contract
- Added `TopicSelectionRuntimeInvocationContext@v1` as the shared identity envelope for runtime-only semantic modifiers. The envelope captures semantic scenario identity, loop/repair identity, debate round/role/stage identity, parent invocation hashes, and dynamic prompt material hashes.
- Added required `runtime_invocation_context_hash` fields to context packet cache keys, prompt packet identity, and runtime audit envelope contracts. This makes loop, supplemental, repair, debate, and semantic-scenario changes part of cache/prompt identity instead of node-local conventions.
- Kept the runtime invocation context hash semantic-only. It intentionally excludes `workflow_run_id` and `node_attempt_id`, so exact context cache reuse can still work across equivalent workflow runs.
- Wired the new hash through backend runtime key building, prompt packet runtime, N6 context packet read-through cache bindings, N6 single-agent adapter calls, N6 debate role/final calls, and v1a N5/N7/N8 token-budget runtime bindings.
- N6 debate dynamic material is now explicit: arbiter issue framing/final synthesis pass role summaries and issue-frame refs as bounded dynamic prompt material records. These records can influence prompt rendering but cannot override prompt templates.
- Extended v1a stress coverage so a nonsemantic scenario exact hit still reuses context artifacts, while supplemental round identity and explicit semantic scenario identity force cache misses.

## 2026-05-31 - v1a Production Readiness Follow-Up
- Committed the v1a runtime invocation-context implementation as `8b750fe feat(topic-selection): bind v1a runtime invocation context`.
- Re-ran live OpenAI/DashScope provider canaries after the runtime identity changes. Provider-required prompt-cache hits still performed live gateway calls, and over-budget fixtures still called zero providers.
- Re-ran Prisma-backed v1a N1-N9 main and replay-smoke harnesses with the balanced T-112 fixture. Main execution passed with deterministic mocked LLMs and replay drift blocked N6-N9 with `REPLAY_INPUT_HASH_MISMATCH` without extra LLM calls.
- Re-ran a production-shaped OpenAI v1a provider slice with real provider calls for N5, N6, and N7. The full N1-N9 flow passed and published the v1b input bundle.
- A DashScope N6 provider slice exposed provider prompt fragility: generated candidates were schema-valid but not validation-ready because they omitted non-empty `scope_notes`. Hardened the fixed N6 prompt compiler with explicit readiness constraints for `scope_notes` and `speculative=false`, then reran the DashScope N6 provider slice successfully.
- Locked D20 for v1a: persistent DB context packet cache is not part of this production boundary. The deployed v1a path may lose context packet cache hits across process restarts and safely recompiles ref-backed context packets. Persistent prompt packet cache remains Prisma-backed; provider response reuse remains blocked for `provider_llm`.

## 2026-05-31 - v1b N7 Admission First Slice Implemented
- Implemented the first v1b N7 runtime slice for I1/I2/I3, plus partial I6 harness admission wiring. This slice intentionally does not add provider/Codex support generation, DB-backed context packet persistence, or legacy-path removal.
- Closed R1 for the promoted-slot admission envelope:
  - `TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef` now carries `runtime_provenance_class`, context policy profile id/version/hash, prompt variant key, runtime invocation context hash, redaction policy, source hashes, runtime audit ref/hash, and compression identity fields;
  - shared schema validation requires full runtime identity for `runtime_verified`;
  - fixture helpers and local harness scripts explicitly classify placeholder identity as `fixture_replay`.
- Closed R2 for the first N7 admission profile set:
  - added N7 `ContextPolicyProfile` entries for `n7_candidate_grouping`, `n7_failed_trial_synthesis`, and `n7_n8_debate_admission_review`;
  - all three bind to `v1b_n7_topic_question_hardening`, support-only semantics, D21 executor policy, D19 preserved facts, and slot-specific post-cache gates.
- Closed R3 for present-artifact admission:
  - added `TopicSelectionV1bN7SupportAdmissionService`;
  - admission distinguishes absent optional support, missing required support, `fixture_replay`, `legacy_unverified`, runtime identity drift, exact source-hash drift, exact prompt-packet hash drift, prompt/profile/runtime drift, payload hash drift, and compression identity drift;
  - malformed or drifted present support blocks before N7 deterministic gates and returns machine-readable `N7_SUPPORT_ARTIFACT_*` blocker codes.
- Wired the admission helper into N7 support consumption in `TopicSelectionV1bWorkflowHarnessService`. Existing deterministic N7 authority behavior remains unchanged: candidate selection, trial ledger, N8 admission/readmission, failed-trial loopback routing, replay checks, and persistence gates still own business authority.
- Product-mode N7 support admission now rejects `fixture_replay` and `legacy_unverified` artifacts. Non-product fixtures remain usable for harness coverage but cannot be treated as production runtime evidence.
- At this admission-first-slice stage, I5 runtime-backed support generation had not yet been implemented; the later runtime support adapter section below closes the prompt packet hash gap for generated Codex/mocked support artifacts.
- Remaining blockers before runtime promotion after the later runtime support adapter:
  - process-local read-through caching for reusable N7 support context packets is still pending; route-specific output projection artifacts are implemented;
  - broader L2/L3 stress and Prisma-backed v1b N7 smoke are still pending;
  - legacy direct provider/script support-generation paths must fully exit only after runtime-backed N7 support generation/admission L1-L3 pass.

## 2026-05-31 - v1b N7 Route Projection First Slice Implemented
- Implemented the I4 route-projection portion for v1b N7 without adding a DB-backed context packet cache or changing business authority writes.
- Added `TopicSelectionV1bN7RuntimeContextProjection@v1` with two strict projection kinds:
  - `v1b_n7_to_n8_topic_question_contract_context`;
  - `v1b_n7_to_n6_failed_trial_loopback_context`.
- Both projection kinds are non-authority runtime context artifacts:
  - `non_authority=true`;
  - `context_cache_scope=process_local_runtime_only`;
  - `context_authority=non_authority_runtime_context`.
- The N7 forward and gate-readmission paths now record a diagnostic projection artifact tied to the persisted `N7ToN8Handoff@v1` ref/hash, topic-question contract refs/hashes, answerability plan, trial ledger, selected candidate, candidate set, selected research slice, debate-admission artifact, and optional candidate-grouping support.
- The N7 candidate-trials-exhausted path now records a diagnostic projection artifact for N6 regeneration context, including candidate set identity, N6 handoff hash, optional N8 feedback ref/hash, failed-trial synthesis ref/hash, exhausted candidate refs/hashes, failure reason codes, regeneration hints, and synthesis summary.
- `TopicSelectionV1bWorkflowHarnessService` records projection artifacts as control-plane `diagnostic` artifacts and includes `runtime_context_projection_ref` and `runtime_context_projection_hash` in admitted trace payloads. Selection decisions include the projection ref in `artifact_refs`, but the projection does not become handoff authority, loopback authority, or persisted business authority.
- Fixture and route helpers were updated to preserve the expanded semantic support envelope. The v1b harness e2e script also now preserves provider-side cache telemetry fields in sanitized audit snapshots, matching the shared T-112 agent invocation audit contract.
- Remaining I4 boundary after the route-projection slice:
  - support-generation context compilation still needed to move behind the shared runtime adapter;
  - process-local read-through caching for N7 support context packets remained deferred;
  - direct external support artifacts still could not be promoted to product `runtime_verified` admission without a true prompt packet hash from the shared runtime.

## 2026-05-31 - v1b N7 Runtime-Backed Support Generation Implemented
- Added `TopicSelectionV1bN7SupportRuntimeService` as the first runtime-backed N7 semantic support adapter.
- The adapter owns the N7 support-slot binding for:
  - `n7_candidate_grouping`;
  - `n7_failed_trial_synthesis`;
  - `n7_n8_debate_admission_review`.
- For each support slot, the adapter compiles a non-authority `TopicSelectionV1bN7SupportRuntimeContextPacket@v1` from the frozen N7 payload, N6 handoff/candidate refs and hashes, selected research slice, generation artifact, candidate gate hash, optional grouping hash, and optional N8 feedback identity.
- The support context packet uses the locked `v1b_n7_topic_question_hardening` family and remains a diagnostic runtime artifact, not handoff authority or business authority.
- Support generation now invokes `TopicSelectionAgentOrchestratorService.invokeStructuredOutput`, so prompt packet identity, prompt quality report, token-budget preflight, prompt cache handling, response-reuse guard, compression provenance, schema validation, and runtime audit are delegated to the shared T-112 runtime boundary.
- Generated N7 support artifacts are classified as `runtime_verified` only after:
  - structured output schema validation passes;
  - output hash matches orchestrator provenance;
  - prompt packet hash and runtime invocation context hash are available;
  - runtime audit ref/hash is recorded;
  - context policy profile hash, source hash bundle, redaction policy, and compression identity are populated.
- `TopicSelectionV1bWorkflowHarnessService` now computes N7 support admission expected identity through the runtime service instead of using fixture placeholder prompt hashes. Product-mode `runtime_verified` Codex support can be admitted as non-authority context before deterministic N7 gates.
- The N7 support profiles continue to disallow `provider_llm`; first implementation covers `codex_assisted` and `mocked_llm`. Provider telemetry separation is inherited from `AgentOrchestrator` but has no promoted provider N7 support path yet.
- Remaining work:
  - add process-local read-through caching for reusable N7 support context packets if L2/L3 evidence shows it is useful;
  - broaden L2 stress for exact replay, source drift, compression fact drop, and conditionally required support;
  - add L3 Prisma-backed v1b N7 runtime smoke and prompt-index metadata checks;
  - fully remove any promoted-slot legacy support generation path only after L1-L3 pass.

## 2026-05-31 - v1b N7 Runtime First Slice L2/L3 Closure
- Closed the v1b N7 first-slice L2 harness stress items for runtime-backed support admission:
  - exact replay with runtime-verified support returns replay provenance without rewriting authority or handoff artifacts;
  - source-hash drift blocks before authority/handoff writes;
  - malformed runtime support cannot bypass deterministic candidate gates;
  - conditionally required `n7_n8_debate_admission_review` and `n7_failed_trial_synthesis` support now share `N7_REQUIRED_SUPPORT_ARTIFACT_MISSING`;
  - compression quality gate tests now use the real v1b N7 context profiles and block dropped candidate identity/order/rationale, N8 feedback, loopback target, regeneration hints, gate rejection reason, debate admission need, and value/risk facts.
- Added Prisma-backed L3 smoke scenario `n7_runtime_smoke` to `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and package script `pnpm topic-selection:v1b-n7-runtime-smoke`.
- The smoke exercises:
  - N6->N7->N8 forward path with runtime-verified `n7_candidate_grouping`;
  - N8 blocking-gate feedback -> N7 readmission with runtime-verified `n7_n8_debate_admission_review`;
  - N7 failed-trial exhaustion -> N6 loopback projection with runtime-verified `n7_failed_trial_synthesis`;
  - Prisma prompt packet index metadata rows for all three N7 support slots;
  - runtime audit provenance with `source_kind=codex_response`, `non_provider=true`, `cache_status=not_applicable`, `response_reuse_ref=null`, and no provider telemetry.
- Removed the promoted-slot direct N7 support writer from the v1b harness e2e script. Historical provider-negative loopback scenarios generated N7 support through `TopicSelectionV1bN7SupportRuntimeService` before the provider-negative harness entry was retired; active N7 runtime support evidence now comes from `n7_runtime_smoke` and `topic-selection:v1b-runtime-stress`.
- Fixture helpers remain available for non-promoted fixture paths through `fixture_replay`; they are not allowed to produce `runtime_verified` support or prompt packet cache evidence.
- First-slice status after this closure:
  - v1b N7 L1-L3 and promoted-slot legacy exit are complete;
  - DB-backed context packet cache remains intentionally out of scope per D20;
  - v1b N4/N6/N8 expansion remains gated on minimum L5/adversarial coverage and explicit promotion of their matrix rows.

## 2026-05-31 - v1b N7 Quality Review Closure
- Closed the code-quality findings from the v1b N7 first-slice review before moving to the post-N7 v1b expansion.
- Runtime-verified N7 support admission now binds the support artifact to a real runtime audit artifact:
  - `runtime_audit_ref` must be an `artifact_ref`;
  - `provenance_ref` must equal `runtime_audit_ref`;
  - the referenced audit artifact must exist, have the declared checksum, belong to the same workflow run, and carry a succeeded invocation audit snapshot;
  - audit provenance must match node/workflow/attempt, execution mode, run mode, profile, output contract, prompt packet hash, structured output hash, and non-provider semantics;
  - response reuse must remain `null`, cache status must stay `not_applicable`, and provider telemetry must stay absent for promoted Codex/mocked N7 support paths.
- Failed-trial synthesis support is now constrained to the frozen N7/N8 boundary before N6 loopback projection:
  - every exhausted candidate ref must belong to the frozen admissible candidate set;
  - every affected ref must be part of the frozen N7 source refs, candidate set, admissible candidates, selected research slice, generation artifact, optional grouping artifact, or N8 feedback artifact;
  - unknown refs block with `N7_FAILED_TRIAL_SYNTHESIS_UNKNOWN_REF`;
  - projection building no longer fabricates fallback hashes for unknown candidate refs.
- Runtime context projection artifacts are now recorded only after authority persistence succeeds:
  - `prepareAdmittedControlPlane` no longer records N7 runtime projections;
  - `persistAdmittedResult` writes authority first, then records the non-authority runtime projection, then builds the final trace snapshot;
  - N7 authority-write failure tests assert no replayable trace, no authority record, and no orphaned runtime projection artifact for the failed attempt.
- Minimum adversarial quality coverage for the N7 expansion gate is now satisfied by focused negative tests for audit drift, unknown failed-trial refs, deterministic-gate bypass, and projection orphan prevention.
- Post-N7 runtime expansion may proceed with v1b N6 first, then v1b N8, then v1b N4. The expansion should preserve the N7 rule that audit artifacts are LLM-operable workflow-quality evidence, not human-only documentation and not business authority.

## 2026-05-31 - D24 v1b N6 Chain Alignment Started
- Agreed to align v1b N6 holistically before implementation because N6 has multiple chain surfaces:
  - N5->N6 initial generation;
  - N7->N6 fallback/regeneration after failed candidate trials;
  - N6->prior-node fallback through triage, debate escalation, or slice rollback;
  - N6 internal orchestration from draft generation/admission through deterministic gate, authority write, and N6->N7 handoff.
- D24 will be discussed in this order:
  - D24-A promoted scope;
  - D24-B N5->N6 initial generation;
  - D24-C N7->N6 fallback regeneration;
  - D24-D N6->prior-node fallback;
  - D24-E N6 internal orchestration;
  - D24-F cache/compression/replay boundaries;
  - D24-G verification and legacy exit.
- Accepted D24-A scope:
  - first implementation slice promotes only `n6_question_candidate_draft` with generation mode `initial_from_n5`;
  - `n6_loopback_triage` remains support-only guarded/planned behavior and is not mandatory in the first implementation slice;
  - `regeneration_after_n7_loopback`, `regeneration_after_n6_gate_failure`, and provider canary paths remain later slices;
  - matrix promotion is limited to the first-slice `n6_question_candidate_draft.initial_from_n5` row;
  - provider canary evidence is not required before implementation starts.
- Accepted direction for D24-B:
  - `N5ToN6Handoff@v1` remains the only authority input for initial N5->N6 generation;
  - `n6_question_candidate_draft` generates or admits `TopicQuestionCandidateSetDraft@v1` only as a model draft before `N6TopicQuestionCandidateGate`;
  - N6 deterministic gates remain responsible for schema validation, source/ref/hash validation, answerability/falsification/claim-ceiling checks, candidate admission, authority writes, and `N6ToN7Handoff@v1`;
  - initial generation uses `v1b_n6_topic_question_generation` and generation mode `initial_from_n5`;
  - prompt/cache identity must include frozen input hash, `n5_handoff_hash`, selected research slice ref/hash, option-set ref/hash, selected-option ref/hash, selection-decision ref/hash, constraint/readiness refs/hashes, prompt variant, output contract, profile id/version/hash, model/runtime params hash, and redaction policy;
  - N6 draft artifacts should carry `runtime_verified`, `fixture_replay`, or `legacy_unverified` provenance classes so downstream LLM agents can reason about workflow-quality evidence without treating diagnostics as authority;
  - first implementation should use `codex_assisted` and `mocked_llm`; provider canary should follow after runtime identity, admission, replay, and deterministic-gate boundaries are stable.
- Complexity assessment for D24-B:
  - overall complexity is medium-high but controllable if isolated;
  - main complexity comes from N6 draft artifacts being gate inputs rather than support-only artifacts, the existing direct frozen semantic artifact path, a larger context compiler surface, many prompt/cache identity fields, and the requirement that promoted-slot legacy direct generation exits cleanly after replacement tests pass;
  - relative simplifiers are the existing N6 deterministic gate, existing `N5ToN6Handoff@v1`, existing draft schema, and strong frozen lineage/ref/hash validation;
  - do not implement D24-B together with N7->N6 fallback regeneration or N6->prior-node fallback.
- Accepted direction for D24-C:
  - N7->N6 fallback regeneration overlaps heavily with existing WorkflowHarness behavior, and that overlap is intentional;
  - existing harness semantics remain the business authority skeleton: N7 candidate-trial exhaustion, N7 loopback projection recording after successful authority persistence, N6 frozen lineage validation, N6 deterministic candidate gate, N6 authority writes, and `N6ToN7Handoff@v1` emission should not be reimplemented in a new runtime flow;
  - T-112 should add only the shared runtime boundary around N6 draft generation/admission when regeneration needs LLM-like work;
  - regeneration should use the existing `n6_question_candidate_draft` slot with generation mode `regeneration_after_n7_loopback`, not a new business node;
  - `v1b_n7_to_n6_failed_trial_loopback_context` remains a non-authority runtime projection that enters prompt/cache identity, compression preserved facts, and runtime audit, while `N5ToN6Handoff@v1` remains the authority input;
  - implementation risk is mainly legacy direct draft generation/admission becoming a long-term dual path. After replacement tests pass, promoted-slot direct frozen semantic draft generation must exit rather than remain soft-disabled.
- Accepted direction for D24-D:
  - `n6_loopback_triage` is a support-only runtime slot for N6 failure routing and is not mandatory for every N6 failure;
  - simple candidate-level or question-frame-level failures may use deterministic fallback without invoking triage;
  - runtime triage is allowed only when N6 needs failure attribution, debate escalation advice, or rollback-to-N5 advice;
  - triage can provide failure scope, dominant reason codes, affected refs, regeneration hints, debate escalation recommendation, and upstream rollback recommendation;
  - triage cannot create candidate authority, select a new slice, rewrite N5 selection, emit `N6ToN7Handoff@v1`, or create downstream recheck authority;
  - malformed or drifted present triage support blocks, while absent optional triage falls back to conservative deterministic routing.
- Accepted direction for D24-E:
  - v1b N6 runtime design targets node orchestration, not harness orchestration;
  - the node runtime adapter is the SSOT for slot/profile/generation-mode binding, N6 runtime context compilation, shared runtime invocation, `runtime_verified` draft artifact creation, and admission expected identity;
  - `WorkflowHarness` should call and verify that node adapter, execute existing deterministic gates, record traces/replay/smoke evidence, and validate persistence, but must not define a separate prompt/cache/compression/admission/authority semantic path;
  - the unified N6 internal order is frozen authority input validation -> generation mode selection -> mode-specific non-authority runtime context loading -> runtime context packet compilation -> shared prompt/cache/token/compression/audit runtime -> draft admission -> N6 deterministic gate -> authority write -> `N6ToN7Handoff@v1`;
  - runtime success does not mean N6 business success. N6 business success requires deterministic gate success, authority persistence success, and handoff emission;
  - if authority write fails, N6 must not record a replayable success trace or emit a downstream handoff.
- Accepted direction for D24-F:
  - N6 cache, compression, replay, and audit artifacts are primarily LLM-operable workflow-quality evidence rather than human-facing audit reports;
  - prompt/cache identity should let later agents and replay runners decide whether frozen lineage, generation mode, mode-specific context, prompt variant, profile, model/runtime params, redaction policy, and compression state are reusable or drifted;
  - compression reports should let automatic compressors, evaluators, and repair loops verify preserved facts, detect dropped facts, and block unsafe compression before another LLM draft is generated;
  - runtime audit should let later agents distinguish context drift, token-budget failure, schema failure, admission failure, deterministic gate failure, authority-write failure, provider telemetry, and response-reuse provenance;
  - replay evidence should prove workflow equivalence and boundary preservation, not only saved LLM calls;
  - provider response reuse remains blocked for `provider_llm`, and provider-side cache telemetry remains telemetry only;
  - context packet cache remains process-local/runtime-only for the N6 expansion. Cache hits cannot skip prompt packet identity, runtime audit, draft admission, deterministic gate, authority write, or `N6ToN7Handoff@v1`.
- Accepted direction for D24-G:
  - verification follows D22 layering: L1 unit/contract, L2 WorkflowHarness policy stress, L3 Prisma-backed local/dev smoke, L4 provider/executor canary, and L5 adversarial/long-context stress;
  - first implementation entry does not require provider canary. Provider canary follows after Codex/mocked runtime identity, admission, replay, prompt-index, and deterministic-gate boundaries are stable;
  - first-slice minimum completion requires L1/L2 for the N5->N6 initial path, documentation updates, and removal of promoted-slot legacy direct draft generation for that path;
  - N7->N6 regeneration implementation requires initial-path L1/L2 pass plus N7 loopback projection identity, drift, orphan, and unknown-ref tests;
  - `fixture_replay` artifacts and unit fixture helpers may remain, but product/acceptance promoted paths must not directly submit legacy frozen semantic drafts to N6 gate;
  - placeholder prompt hashes must not enter real prompt packet cache rows, and `legacy_unverified` artifacts must not be downgraded to warnings for product admission;
  - LLM-like call delta `0` is useful replay evidence, but N6 replay success also requires frozen input identity, runtime/admission identity, deterministic gate replay, authority refs/hashes, and `N6ToN7Handoff@v1` hash equivalence.
- Implementation readiness review:
  - verdict: ready to start Slice 1 implementation preparation;
  - ready scope is `n6_question_candidate_draft.initial_from_n5` through Codex/mocked shared runtime;
  - not ready in Slice 1: N7->N6 regeneration, N6 gate-failure retry, `n6_loopback_triage` runtime generation, provider canary, and DB-backed context packet cache;
  - first code steps should add the v1b N6 first-slice context runtime profile, N6 draft runtime/admission contracts and tests, node-level N6 draft runtime adapter, WorkflowHarness adapter calls for the promoted initial path, and promoted initial-path legacy exit after replacement L1/L2 tests pass.

## 2026-05-31 - v1b N6 Initial Runtime Draft Slice Implemented
- Added the v1b N6 first-slice `ContextPolicyProfile` for `n6_question_candidate_draft` with context family `v1b_n6_topic_question_generation`, candidate-for-deterministic-gate semantics, `draft_admission` post-cache/reuse gates, and preserved facts for N5 handoff, selected slice/option identity, evidence/boundary/assumption refs, claim ceiling, non-goals, source-health warnings, and risk/gap/recheck facts.
- Added `TopicSelectionV1bN6DraftRuntimeService` as the node-level runtime adapter for generation mode `initial_from_n5`.
  - The adapter compiles a ref-backed runtime context packet from the frozen N5->N6 input, records it as a diagnostic artifact, invokes `AgentOrchestrator`, and records a `runtime_verified` `TopicQuestionCandidateSetDraft@v1` semantic artifact.
  - Prompt identity uses `prompt_variant_key=n6_question_candidate_draft.initial_from_n5` while keeping `invocation_slot_id=n6_question_candidate_draft`; the runtime invocation context hash binds the `initial_from_n5` semantic scenario.
  - The shared `AgentOrchestrator` now accepts an optional `prompt_variant_key`, preserving the existing invocation-slot default for current N7/v1a callers while allowing N6 generation-mode-specific prompt packet identity.
- Added `TopicSelectionV1bN6DraftAdmissionService` with fail-closed admission for promoted N6 drafts.
  - `runtime_verified` drafts must match output hash, prompt packet hash, context profile id/version/hash, prompt variant, runtime invocation context hash, redaction policy, source hash bundle, runtime audit ref/hash, and coherent compression identity.
  - `legacy_unverified` is blocked instead of downgraded to warning.
  - `fixture_replay` remains test/acceptance-only and is blocked in product mode.
- Reordered `WorkflowHarness` N6 execution so frozen N6 payload parsing, context loading, and N5 handoff lineage validation happen before draft artifact resolution/admission.
- Wired N6 draft admission into the existing deterministic N6 candidate gate and authority-write path. Runtime success remains non-authority; N6 business success still requires deterministic gate pass, candidate-set authority persistence, and `N6ToN7Handoff@v1`.
- Added focused L1/L2 coverage:
  - profile resolution and preserved-fact policy checks;
  - N6 admission exact identity, legacy/fixture behavior, payload/profile/prompt/runtime/source/compression drift;
  - product-mode runtime-verified Codex draft admission;
  - runtime draft exact replay without authority rewrites;
  - source drift and runtime-audit drift blocking before authority writes;
  - legacy draft blocking;
  - deterministic gate bypass attempt blocking after runtime admission.
- Slice status:
  - `n6_question_candidate_draft.initial_from_n5` L1/L2 is implemented and passing;
  - N7->N6 regeneration, N6 gate-failure regeneration, and `n6_loopback_triage` runtime generation remain later D24 slices;
  - context packet cache remains process-local/runtime-only per D20.

## 2026-05-31 - v1b N6 L3/L4/L5 Verification Slice Implemented
- Added Prisma-backed L3 smoke scenario `n6_runtime_smoke` to `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and package script `pnpm topic-selection:v1b-n6-runtime-smoke`.
  - The smoke drives N1-N5 setup, generates a product-mode `runtime_verified` Codex-assisted N6 draft through `TopicSelectionV1bN6DraftRuntimeService`, admits N6 through the existing deterministic gate, and verifies `N6ToN7Handoff@v1` emission.
  - Exact replay reuses the same authority/handoff refs and does not create additional artifact refs for the N6 workflow run.
  - Source-hash drift blocks with `N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT` before authority or handoff emission.
  - Prompt packet index checks confirm metadata-only N6 rows for `n6_question_candidate_draft.initial_from_n5`; rows contain refs/hashes and do not expose messages or provider responses.
- Added v1b N6 provider canary methods to `TopicSelectionProviderCanaryService`.
  - Local fake-gateway coverage proves prompt packet cache hits still require two provider-facing calls and exact response reuse remains null/not-applicable.
  - OpenAI/DashScope over-budget canaries block before provider calls.
  - Live v1b N6 provider canaries are gated by `T112_V1B_N6_PROVIDER_CANARY_LIVE=1` and `BACKEND_TEST_PRESERVE_REAL_ENV=1`; the OpenAI schema name is kept under the provider `text.format.name` 64-character limit.
- Added N6 L5 compression/adversarial tests to `topic-selection-compression-runtime-service.unit.test.ts`.
  - Dropping N6 long-context facts blocks for missing N5 handoff, option-set identity, evidence refs, boundary refs, assumption refs, claim ceiling, non-goals, and recheck hints.
  - Persisting adversarial raw provider logs in compressed context blocks with `COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD`.
- Updated first-slice status:
  - `n6_question_candidate_draft.initial_from_n5` now has L1/L2 implementation, L3 Prisma-backed smoke, L4 local/live provider canary evidence, and L5 long-context/adversarial compression coverage.
  - Next v1b N6 work should promote P2.1b regeneration/triage paths instead of widening the initial N5->N6 path further.

## 2026-05-31 - v1b N6 L3/L4/L5 Quality Fixes
- Tightened the v1b N6 provider canary so it now uses the real `TopicQuestionCandidateSetDraft@v1` schema instead of the generic provider transport canary batch schema.
  - The canary still remains non-authority and continues through `AgentOrchestrator -> BackendLlmGateway`.
  - The OpenAI schema name stays within the provider `text.format.name` 64-character limit.
  - Unit fake-gateway output now returns a canonical N6 topic-question candidate draft fixture and validates against the real N6 schema.
- Expanded N6 long-context compression tests to cover the full inherited common preserved-fact surface:
  - blockers;
  - accepted risks;
  - method-family gaps;
  - unresolved challenges;
  - residual risks and recheck hints.
- Strengthened Prisma-backed N6 smoke prompt-index assertions.
  - N6 prompt index checks now bind to the exact generated prompt packet hashes for the initial and drift branches.
  - The smoke asserts the N6 prompt-index delta equals the generated N6 prompt hash count.
  - The smoke also checks Prisma runtime model metadata to ensure `TopicSelectionPromptPacketCacheIndex` does not persist prompt payloads, provider responses, provider telemetry payloads, raw provider logs, authority payloads, or secrets.

## 2026-05-31 - v1b N6 P2.1b N7 Loopback Regeneration Slice Implemented
- Promoted `n6_question_candidate_draft.regeneration_after_n7_loopback` as the first P2.1b row; `regeneration_after_n6_gate_failure` and `n6_loopback_triage` remain planned.
- Extended `TopicSelectionV1bN6DraftRuntimeService` with generation-mode-aware context:
  - `initial_from_n5` remains the promoted initial path and rejects N7 loopback projection context.
  - `regeneration_after_n7_loopback` requires exactly one `v1b_n7_to_n6_failed_trial_loopback_context` artifact in frozen `source_refs`.
  - The N7 projection is loaded by ref, checksum-verified, schema/policy-checked, and embedded into the N6 runtime context packet as non-authority mode context.
  - Prompt/runtime identity now includes the generation mode, projection hash, old N6 handoff hash, exhausted candidate hashes, failure reason codes, regeneration hints, and optional N8 feedback hash.
- Strengthened N7 loopback projection production:
  - N7 now includes selected research slice ref and `selected_research_slice_hash` in the failed-trial loopback projection.
  - N6 regeneration admission requires the projection source hashes to match `failed_trial_synthesis_hash`, `topic_question_candidate_set_hash`, `n6_handoff_hash`, and the current frozen selected research slice hash.
- Wired WorkflowHarness N6 draft admission to infer generation mode from prompt identity plus frozen projection context.
  - A regeneration prompt variant without projection blocks.
  - Projection context with an initial prompt variant blocks as prompt identity drift.
  - Runtime expected identity is computed from the same mode context before admission, so old runtime artifacts cannot enter a different N6 chain.
- Expanded N6 compression preserved facts for P2.1b: N7 loopback projection, failed-trial synthesis, exhausted candidate refs/hashes, candidate order, failure reason codes, regeneration hints, and N8 feedback.
- Added L1/L2 coverage for N7->N6 regeneration:
  - runtime-generated N6 regeneration draft admits in product mode and still passes through the existing deterministic N6 candidate gate and authority write path;
  - prompt identity drift and source hash drift block before authority writes;
  - orphan regeneration requests block before runtime generation;
  - malformed projections with unknown exhausted candidate refs block before draft generation/admission.

## 2026-06-01 - v1b N6 P2.1b Loopback Triage Runtime Slice Implemented
- Promoted `n6_loopback_triage` from guarded/planned fixture support to an optional support-only runtime/admission slot.
- Added `TopicSelectionV1bN6LoopbackTriageRuntimeService`:
  - binds `n6_loopback_triage` to `v1b_n6_loopback_triage_context`;
  - routes Codex-assisted and mocked support generation through `AgentOrchestrator`;
  - records runtime-verified semantic support artifacts with runtime audit ref/hash, prompt packet hash, profile hash, runtime invocation context hash, redaction policy, source hashes, and output hash;
  - binds triage identity to the frozen N5->N6 lineage plus failed draft hash, failed draft prompt packet hash, and failed draft source-hash bundle;
  - rejects non-N6 draft artifacts or failed draft hash mismatch before building triage context.
- Added `TopicSelectionV1bN6LoopbackTriageAdmissionService`:
  - blocks missing provenance class, `legacy_unverified`, fixture replay in product mode, prompt identity drift, profile drift, runtime audit drift, source hash drift, payload hash mismatch, and incomplete compression identity;
  - permits fixture replay only outside product for explicit fixture tests.
- Wired WorkflowHarness N6 loopback plan resolution to verify runtime-verified triage audit artifacts before admitting present triage.
  - Absent triage remains optional and falls back to deterministic routing.
  - Malformed or drifted present triage blocks before loopback routing and before authority/handoff writes.
- Registered the N6 loopback triage context runtime profile and compression preserved facts.
  - Required facts include failed draft identity, blocked candidate context, dominant reason codes, affected refs, regeneration hints, debate escalation, upstream rollback, and loopback target.
- Added L1/L2 coverage:
  - product-mode runtime-verified triage is admitted and still produces only a blocked loopback result with no authority or handoff;
  - source hash drift blocks with `N6_LOOPBACK_TRIAGE_ARTIFACT_SOURCE_HASH_DRIFT`;
  - product-mode fixture triage blocks with `N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID`;
  - compression quality gate blocks dropped N6 loopback triage facts.
- Remaining P2.1b work is `n6_question_candidate_draft.regeneration_after_n6_gate_failure`.

## 2026-06-01 - v1b N6 P2.1b Gate-Failure Regeneration Slice Implemented
- Promoted `n6_question_candidate_draft.regeneration_after_n6_gate_failure` as the final P2.1b row.
- Added `TopicSelectionV1bN6RuntimeContextProjection@v1` with projection kind `v1b_n6_gate_failure_retry_context`.
  - The projection is emitted only for N6 blocked loopback results whose target is `n6_regenerate_candidates`.
  - It is non-authority runtime context and participates in trace payloads as `runtime_context_projection_ref/hash`.
  - It preserves failed draft ref/hash, failed draft prompt packet hash, failed draft source-hash bundle, blocked-candidate context hash, failure reason codes, regeneration hints, selected slice identity, and N5 handoff hash.
- Extended `TopicSelectionV1bN6DraftRuntimeService` generation modes:
  - `initial_from_n5` rejects any N7 loopback or N6 gate-failure projection context;
  - `regeneration_after_n7_loopback` requires exactly one N7 failed-trial projection and no N6 gate-failure projection;
  - `regeneration_after_n6_gate_failure` requires exactly one N6 gate-failure retry projection and no N7 failed-trial projection.
- Wired WorkflowHarness draft admission to infer `regeneration_after_n6_gate_failure` from prompt variant plus frozen projection context.
  - Retry projection context with an initial prompt variant blocks as prompt identity drift.
  - Source-hash drift blocks before deterministic candidate gate and before authority/handoff writes.
  - Orphan or malformed retry projections block before runtime generation/admission.
- Tightened retry projection admission so source/support hashes must self-consistently bind failed draft prompt identity, failed draft source-hash bundle, blocked-candidate context, failure reason codes, regeneration hints, and optional triage refs/hashes.
- Expanded N6 compression preserved facts with N6 gate-failure projection, failed draft identity, blocked candidate context, and loopback target.
- P2.1b L1/L2 was closed in this slice; later closure work promoted it to L3 Prisma smoke plus L5 compression blockers.

## 2026-06-01 - v1b N8 P2.2 D25-A-E Locked
- D25-A locks the first N8 runtime slice to `n8_value_assessment_draft` only.
  - The first slice does not expand N9/N10/N11, does not change the N8 deterministic value gate, does not runtime-ize N8->N7 feedback generation, and does not introduce debate/provider canary paths.
  - Runtime output remains a non-authority `TopicValueAssessmentDraft@v1` semantic artifact with allowed effect `model_draft_for_gate`.
  - N8 authority writes still require deterministic N8 gate admission and existing `topic_value_assessment` / `N8ToN9Handoff@v1` persistence.
- D25-B locks N8 context input and prompt/cache identity.
  - N8 runtime must bind both `N7ToN8Handoff@v1` authority lineage and exactly one `v1b_n7_to_n8_topic_question_contract_context` non-authority projection.
  - The projection is LLM-operable context only; it is not business authority and cannot bypass N8 deterministic gates.
  - Prompt/cache identity must include the invocation slot, prompt variant `n8_value_assessment_draft.initial_from_n7`, model/profile identity, context profile hash, redaction policy, frozen input hash, N7 handoff hash, N7->N8 projection hash, topic question hash, topic question contract hash, active candidate hash, answerability plan hash, trial ledger hash, selected research slice hash, candidate set hash, source hash bundle hash, output contract, and runtime modifiers hash.
  - Missing, duplicated, checksum-drifted, wrong-route, wrong-lineage, or source-hash-drifted N7->N8 projections block before draft generation/admission and before authority/handoff writes.
- D25-C locks N8 compression as workflow robustness, not content pruning.
  - Compression may reduce expression density, but it must preserve the fact set and structural shape needed by N8 deterministic gate, N8->N9 handoff, N8 rejection feedback, replay/idempotency, and prompt/cache identity.
  - Required preservation includes N7 handoff/projection lineage, topic question and contract refs/hashes, active candidate identity, answerability plan, trial ledger, value rationale, support-quality facts, reviewer-facing uncertainty, risk/gap/blocker facts, source-health warnings, and downstream feedback/recheck hints.
  - Missing required facts, missing required arrays/maps/refs/hashes, rewritten authority semantics, or schema-invalid compressed context blocks before draft generation/admission.
  - A blocked compressed artifact remains non-authority workflow evidence for LLM iteration and cannot become an admissible prompt/cache hit.
- D25-D locks the N8 authority boundary.
  - Runtime output remains advisory and cannot create `topic_value_assessment`, `N8ToN9Handoff@v1`, `N8ToN7Feedback`, route decisions, trial-ledger updates, or candidate mutations.
  - Gate pass is the only authority admission path for N8 value assessment and N8->N9 handoff persistence.
  - Gate reject creates no value authority or handoff; deterministic harness logic creates N8->N7 feedback from validated gate blockers and ref/hash-bound failed draft context.
  - Malformed runtime output, malformed compression output, or cache/reuse hit cannot create feedback and cannot skip the deterministic gate or feedback rules.
- D25-E locks compression failure detection as runtime self-check, not harness-only judgment.
  - Shared runtime must validate compression report schema, source refs/hashes, compressed context hash, forbidden payload classes, post-compression token budget, blocker/warning codes, and rejected-artifact cache exclusion before prompt packet creation.
  - N8 adapter must provide a required-structure manifest for node semantics: lineage refs/hashes, required compact-context paths, preserved fact groups, allowed authority fields, and route/gate semantics.
  - Runtime/admission must compare compressed context against the manifest: required paths are present, required ids/refs/hashes are unchanged, required fact groups survive, no new authority-looking fields appear, and no route/gate semantics are rewritten.
  - `WorkflowHarness` must not own a parallel production validity decision for compression. Harness coverage must construct adversarial inputs and assert that runtime/admission services return blockers.
  - Valid adversarial cases include missing trial ledger, missing required arrays/maps/refs/hashes, N7 projection hash drift, dropped value/risk/gap facts, schema-invalid compact context, rejected compression artifact used as prompt input, and compression success attempting to create feedback or authority.

## 2026-06-01 - v1b N8 P2.2 First Slice Implemented
- Readiness scan result:
  - no DB/schema/provider blocker was found for the L1/L2 N8 slice;
  - the existing N8 deterministic gate and authority path already load `N7ToN8Handoff@v1`, validate value draft structure, and create `TopicValueAssessment` / `N8ToN9Handoff@v1` only after gate admission;
  - the missing production pieces were the N8 runtime profile, value-draft runtime generator, runtime/admission self-check, and test helper propagation of the N7->N8 projection into N8 frozen source refs.
- Added `topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1`.
  - Context family: `v1b_n8_topic_value_assessment`.
  - Invocation slot: `n8_value_assessment_draft`.
  - Preserved facts include N7 handoff, N7->N8 projection, topic question/contract, active candidate, answerability plan, trial ledger, selected slice, candidate set, value rationale, support quality, reviewer uncertainty, risk/gap/blocker facts, and feedback/recheck hints.
  - Post-cache/reuse gates include draft admission, compression structure manifest, deterministic gate, feedback boundary, and authority boundary.
- Added `TopicSelectionV1bN8ValueAssessmentRuntimeService`.
  - It requires exactly one ref-backed `v1b_n7_to_n8_topic_question_contract_context` projection in N8 `frozen_input.source_refs`.
  - It checksum-verifies the projection artifact, enforces non-authority invoke-next policy, checks projection lineage against the frozen N8 payload, and includes the projection hash in source hashes and prompt/runtime identity.
  - It builds a `TopicSelectionV1bN8RequiredStructureManifest@v1` before prompt packet creation and self-checks required paths, required source hashes, forbidden authority-looking fields, and route/gate semantics.
  - It invokes `AgentOrchestrator` for Codex-assisted or mocked output and records a `runtime_verified` `n8_value_assessment_draft` semantic artifact with audit ref/hash, prompt packet hash, runtime invocation hash, profile hash, redaction policy, source hashes, and output hash.
  - It now builds N8 compression-attempt preserved-fact inventory inside the runtime adapter before invoking `AgentOrchestrator`, so dropped required facts or forbidden persisted payloads are blocked by the shared compression quality gate before draft output/admission.
- Added `TopicSelectionV1bN8ValueAssessmentAdmissionService`.
  - It blocks missing provenance, `legacy_unverified`, fixture replay in product mode, prompt/profile/runtime-audit/source-hash/run-mode drift, payload hash mismatch, and incomplete compression identity.
  - Fixture replay remains test/acceptance-only; product admission requires `runtime_verified` provenance.
- Wired `TopicSelectionV1bWorkflowHarnessService` N8 draft resolution through runtime admission.
  - Runtime audit artifacts are dereferenced and checksum/provenance-checked before admission.
  - Expected runtime identity is recomputed from the current N8 frozen payload, requested run mode, and N7->N8 projection, so stale or drifted runtime draft artifacts cannot pass into the deterministic N8 value gate.
  - The deterministic N8 value gate, feedback behavior, replay/idempotency, and authority writes remain unchanged.
- Updated v1b harness fixtures so N8 input now carries the N7 trace projection ref by default.
  - This removes a potential semantic split where tests could pass with only the business handoff but production runtime identity required the non-authority projection.
  - Product-mode fixture replay is explicitly blocked for N8 value drafts.
- Added a v1b WorkflowHarness trace-snapshot read route for LLM-operable workflow continuation.
  - HTTP clients can read `runtime_context_projection_ref/hash` from the N7 trace snapshot and include the projection artifact in N8 frozen source refs.
  - The route exposes already-persisted trace metadata; it does not create authority and does not expose provider payloads beyond the existing trace snapshot contract.
- P2.2 L1/L2 status:
  - runtime-verified Codex N8 value draft admits in product mode;
  - N7->N8 projection source-hash drift blocks before authority writes;
  - missing projection blocks runtime generation before prompt creation;
  - product fixture replay blocks before deterministic N8 authority admission.

## 2026-06-01 - v1b N8 P2.2 L3/L4/L5 Verification Slice Implemented
- Added Prisma-backed L3 smoke scenario `n8_runtime_smoke` to `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and package script `pnpm topic-selection:v1b-n8-runtime-smoke`.
  - The smoke drives N1-N7 setup, reads the N7 trace projection, includes the `v1b_n7_to_n8_topic_question_contract_context` ref in N8 frozen source refs, generates a product-mode `runtime_verified` Codex-assisted N8 value draft through `TopicSelectionV1bN8ValueAssessmentRuntimeService`, and admits it through the existing deterministic N8 value gate.
  - Exact replay reuses the same `topic_value_assessment` and `N8ToN9Handoff@v1` refs without additional artifact writes for the N8 workflow run.
  - Projection source-hash drift blocks with `N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT` before authority or handoff emission.
  - Prompt packet index checks confirm metadata-only N8 rows for `n8_value_assessment_draft.initial_from_n7`; rows contain refs/hashes and do not expose messages or provider responses.
- Added v1b N8 provider canary methods to `TopicSelectionProviderCanaryService`.
  - Local fake-gateway coverage proves OpenAI/DashScope prompt packet cache hits still require two provider-facing calls and exact response reuse remains null/not-applicable.
  - OpenAI/DashScope over-budget N8 canaries block before provider calls.
  - Live N8 provider canaries are gated by `T112_V1B_N8_PROVIDER_CANARY_LIVE=1` and `BACKEND_TEST_PRESERVE_REAL_ENV=1`.
- Added N8 L5 compression/adversarial tests to `topic-selection-compression-runtime-service.unit.test.ts`.
  - Dropping N8 long-context facts blocks for missing N7 handoff, N7->N8 projection, topic question, active candidate, answerability plan, trial ledger, candidate set, value rationale, support quality, reviewer uncertainty, risk/gap/blocker facts, and feedback/recheck hints.
  - Persisting adversarial raw provider logs in compressed N8 context blocks with `COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD`.
- Follow-up quality fixes:
  - N8 product/runtime admission now rejects run-mode drift rather than deriving prompt identity solely from the submitted semantic artifact.
  - N8 runtime compression self-check is exercised through `TopicSelectionV1bN8ValueAssessmentRuntimeService`, not only direct compression-unit fixtures.
  - Live N8 provider canary assertions now check prompt packet hash stability, prompt artifact/quality-report reuse, `not_applicable` provider response cache statuses, null response reuse refs, and telemetry count.
- P2.2 status:
  - `n8_value_assessment_draft.initial_from_n7` now has L1/L2 implementation, L3 Prisma-backed smoke, L4 local/live provider canary evidence, and L5 long-context/adversarial compression coverage.
  - Remaining post-N7 v1b runtime expansion should move to v1b N4 rather than widening N8 into N9/N10/N11 or runtime-owned feedback generation.

## 2026-06-01 - v1a Runtime/Harness Boundary Lock
- Locked D18.1: v1a node runtime and `WorkflowHarness` have separate responsibilities.
- Node runtime adapters/context compiler facades own node-level LLM-like execution semantics. For v1a this includes N6 single-agent/debate generation mode, runtime context packet identity, prompt/profile/variant binding, compression and re-rendering, schema/admission/routing gates, and persistence command shape.
- `WorkflowHarness` owns whole-flow control: N1-N9 ordering, replay/idempotency, route-policy handoff, scenario fixtures, assertions, traces, and smoke/e2e verification.
- Harness-level test overrides are allowed only as inputs to node adapters/shared runtime collaborators. They must not define a second prompt/cache/compression/admission/authority semantics path.
- Implemented the first D18.1 cleanup:
  - added `TopicSelectionV1aN6RuntimeContextCacheBindingService` as the thin N6 runtime binding facade;
  - moved N6 context-cache profile/model/runtime-invocation/prompt-seed/cache-binding construction out of `TopicSelectionWorkflowHarnessService`;
  - `WorkflowHarness` now supplies scenario facts, input refs, and explicit test overrides to the facade, then passes the returned runtime cache binding into the context compiler.
- Secondary cleanup:
  - review N5/N7/N8 runtime token-budget binding in the harness and keep it as simple orchestration input assembly only;
  - if those nodes gain node-specific prompt/cache/compression/admission policy, introduce node facades instead of extending `WorkflowHarness`;
  - add regression coverage that promoted v1a nodes pass through node adapters/shared runtime collaborators, and that harness assertions do not become production policy.

## 2026-06-01 - v1a N5/N8 Mocked Runtime Stress Mode
- Added an explicit N8 semantic review execution-mode switch to `.ai/scripts/topic-selection-v1a-harness-e2e.mjs`.
  - Default remains `deterministic_parser`.
  - `TOPIC_SELECTION_V1A_HARNESS_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_EXECUTION_MODE=mocked_llm` now drives N8 through `AgentOrchestrator` without external provider calls.
  - Provider mode is gated by the existing model-option path and remains separate from this mocked stress mode.
- Added runtime context-ref hydration for N8 mocked semantic review fixtures.
  - The fixture uses `__runtime_context_packet_ref__` only as a harness placeholder.
  - `TopicSelectionWorkflowHarnessService` replaces the placeholder with the actual semantic review context packet artifact ref before invoking `AgentOrchestrator`, so final semantic review output, audit response hash, and lineage checks remain ref-backed and self-consistent.
  - This avoids a test-only bypass of the N8 lineage gate.
- Extended `.ai/scripts/topic-selection-v1a-runtime-stress.mjs` with `TOPIC_SELECTION_V1A_RUNTIME_STRESS_CONTEXT_MODES`.
  - `baseline` preserves the existing N6/N7-focused behavior: N5 extraction stays deterministic and N8 semantic review stays deterministic.
  - `mocked_n5_n8` sets N5 evidence extraction and N8 semantic review to `mocked_llm`.
  - Prompt packet index snapshots now include N5/N8 counts and assert expected slot minimums for `evidence_extraction` and `confirmation_semantic_review` only when the mocked context mode is active.
- The new stress run found and fixed a real fixture drift:
  - N8 mocked review initially carried `policy_version=v1`, while HTTP harness invocation normalizes node scenario input to `topic-selection-v1a-workflow-route-policy-v1`.
  - The fixture now binds the route-policy version used by the invocation envelope, preserving the same lineage semantics as production harness execution.
- V1A-GAP-04 is closed. The later v1a production-readiness slices completed N5/N7/N8 over-budget compression, N1-N4 producer replay/drift smoke, and provider slices; only the optional N9 terminal context handoff audit projection remains deferred and non-blocking for v1a closure.

## 2026-06-01 - v1a N5 Over-Budget Compression Closure
- Added N5 evidence extraction compressed-context planning to `TopicSelectionV1aLlmRuntimeBindingService`.
  - The plan creates `topic-selection-v1a-n5-evidence-extraction-compressed-context-v1` with source context hashes, compacted search-run handoff, compacted extraction context packet, preserved fact inventory, and explicit non-authority compression notes.
  - Preserved N5 facts include blocker codes, residual/accepted risk refs, source-health warnings, method-family gaps, unresolved challenge refs, and recheck hint refs where present in the N5 context packet payload.
  - Compressed prompt rendering uses ref-backed compressed context and keeps the original context packet hash plus compression report identity in runtime provenance.
- Wired N5 `WorkflowHarness` execution through a production-shaped preflight path.
  - Over-target N5 provider/codex/mock invocations now run the shared token-budget gate before provider execution.
  - `requires_compression` records a `context_compression_report` diagnostic artifact through the shared compression runtime, then re-renders the N5 prompt with compressed context.
  - The second invocation still enters `AgentOrchestrator`, so prompt packet identity, schema validation, token gate audit, and provider/Codex/mock provenance remain centralized.
  - If compressed context remains over budget, `AgentOrchestrator` blocks before the gateway; EvidenceMap materialization receives no draft and creates no authority refs.
- Preserved authority boundaries.
  - Compression report and compressed context are diagnostic/advisory only.
  - EvidenceMap authority creation still only happens through `TopicSelectionEvidenceMapMaterializationService`.
  - Cache/compression cannot satisfy materialization, skip role/locator/lineage checks, or write EvidenceMap/EvidenceUnit authority.
- Added N5 focused coverage.
  - Over-target N5 compression succeeds with one gateway call, a compression report artifact, a within-budget final audit, and normal materialization warnings.
  - Compressed-context-still-over-budget blocks with gateway call count `0`, a compression report artifact, blocked token gate audit, and no EvidenceMap authority.
- Subsequent D18 work completed later: N7/N8 compression closure, N1-N4 producer replay/drift smoke, and uneven provider slices.

## 2026-06-01 - v1a N7 Over-Budget Compression Closure
- Added N7 adjudication compressed-context planning to `TopicSelectionV1aLlmRuntimeBindingService`.
  - The plan creates `topic-selection-v1a-n7-need-adjudication-compressed-context-v1` with source hashes for NeedCandidate, readiness assessment, and validation support packet.
  - Preserved N7 facts include blockers, residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, and recheck hints from candidate/readiness/support packet sources.
  - Compressed prompt rendering carries only refs plus `compressed_need_adjudication_context`; the original candidate/readiness/support packet remain authority refs, not authority replacement payloads.
- Wired N7 `WorkflowHarness` execution through a production-shaped compression preflight.
  - Over-target N7 provider/codex/mock invocations run the shared token-budget gate before provider execution.
  - `requires_compression` records a `context_compression_report` diagnostic artifact through the shared compression runtime, then re-renders the N7 prompt with compressed context and compression identity.
  - The second invocation still enters `AgentOrchestrator`, so prompt packet identity, schema validation, token gate audit, provider/Codex/mock provenance, and response-reuse semantics remain centralized.
  - If the compression quality gate itself blocks, N7 stops before `AgentOrchestrator`/provider invocation and carries the compression report ref plus blocker codes into the harness trace.
  - If compressed context remains over budget, `AgentOrchestrator` blocks before the gateway; no adjudication result or reserved ValidatedNeed authority is created.
- Preserved deterministic adjudication boundaries.
  - Compression report and compressed context are advisory only.
  - N7 deterministic gates still enforce recommendation lineage, residual-risk carry, method-family gap carry, high-risk human acceptance, duplicate adjudication blocking, and route-policy outcomes.
  - Cache/compression cannot satisfy adjudication authority, skip residual-risk/gap checks, create recheck/merge routes, or write ValidatedNeed authority.
- Added N7 focused coverage.
  - Over-target N7 compression succeeds with one gateway call, a compression report artifact in the harness trace, a within-budget final audit, and normal adjudication warnings.
  - Compressed-context-still-over-budget blocks with gateway call count `0`, a compression report artifact, blocked token gate audit, and no adjudication authority.
  - Compression-quality-gate failure blocks with gateway call count `0`, a blocked compression report artifact, and no adjudication authority.
- Subsequent D18 work completed later: N8 compression closure, N1-N4 producer replay/drift smoke, and uneven provider slices.

## 2026-06-01 - v1a N8 Over-Budget Compression Closure
- Added N8 human-confirmation semantic-review compressed-context planning to `TopicSelectionV1aLlmRuntimeBindingService`.
  - The plan creates `topic-selection-v1a-n8-human-confirmation-compressed-context-v1` with the semantic review context packet ref/hash, compacted advisory payload, preserved fact inventory, and explicit non-authority compression notes.
  - Preserved N8 facts include residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, recheck hints, and non-accepted required human checks as blockers.
  - Compressed prompt rendering carries the original context packet ref/hash plus `compressed_human_confirmation_context`; the compressed payload remains advisory and cannot satisfy human confirmation authority writes.
- Wired N8 `WorkflowHarness` semantic review execution through a production-shaped compression preflight.
  - Over-target N8 provider/codex/mock invocations run the shared token-budget gate before provider execution.
  - `requires_compression` records a `context_compression_report` diagnostic artifact through the shared compression runtime, then re-renders the N8 prompt with compressed context and compression identity.
  - The second invocation still enters `AgentOrchestrator`, so prompt packet identity, schema validation, token gate audit, provider/Codex/mock provenance, and response-reuse semantics remain centralized.
  - If the compression quality gate blocks, N8 stops before `AgentOrchestrator`/provider invocation and carries the compression report ref plus blocker codes into the harness trace.
  - If compressed context remains over budget, `AgentOrchestrator` blocks before the gateway; no semantic review, human decision, or ValidatedNeed authority is created.
- Preserved human confirmation boundaries.
  - Compression report and compressed context are advisory only.
  - N8 semantic review still only gates semantic alignment; `confirmValidatedNeed` remains the sole human authority materialization path.
  - Cache/compression cannot satisfy required human checks, create accepted-risk refs, skip lineage checks, or write ValidatedNeed authority.
- Added N8 focused coverage.
  - Over-target N8 compression succeeds with one gateway call, a compression report artifact in the harness trace, a within-budget final audit, and normal human confirmation authority materialization.
  - Compressed-context-still-over-budget blocks with gateway call count `0`, a compression report artifact, blocked token gate audit, and no ValidatedNeed authority.
  - Compression-quality-gate failure blocks with gateway call count `0`, a blocked compression report artifact, and no ValidatedNeed authority.
- Subsequent D18 work completed later: N1-N4 producer replay/drift smoke and uneven provider slices for DashScope N7/N8 plus OpenAI N8.

## 2026-06-01 - v1a N1-N4 Producer Replay/Drift Smoke
- Added replay identity to deterministic v1a context producers N1-N4.
  - N1 TopicSeed, N2 LiteratureResourcePoolSnapshot, N3 SearchPlan, and N4 SearchRun traces now carry `input_hash`, `node_input`, `node_result`, and `replay_provenance`.
  - Exact same `workflow_run_id + node_attempt_id + input_hash` replays return the existing authority refs and source trace artifact ref without creating duplicate TopicSeed/Snapshot/SearchPlan/SearchRun authority.
  - Same `node_attempt_id` with input-hash drift returns `REPLAY_INPUT_HASH_MISMATCH` as a blocked trace result for N1-N4 and creates only diagnostic trace artifacts.
- Extended the production-shaped v1a harness replay smoke.
  - `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` now covers N1-N4 plus N6-N9 exact replay and input-hash drift.
  - Replay DB counts include N1-N4 authority tables, N5 authority tables, N6-N9 authority tables, and control-plane input/gate/transition counts.
  - The smoke asserts exact replay has zero DB count drift and zero LLM calls; input-hash drift has zero authority/control-plane drift, zero LLM calls, and only trace artifact growth.
- Fixed a production-shape replay assertion issue found by the DB smoke.
  - N4 SearchRun replay is read back from JSON, so `authority_refs.includes(search_run_ref)` used object identity and failed after deserialization.
  - The assertion now compares functional ref identity by value through `sameFunctionalRef`, matching production storage semantics.
- Added focused unit coverage.
  - The new N1-N4 producer replay unit test covers exact replay provenance, ref stability, same-attempt input-hash drift blocking, no authority refs on drift, and zero LLM gateway calls.
- Subsequent v1a provider-slice work completed later. Optional N9 terminal context handoff audit projection remains deferred and non-blocking.

## 2026-06-01 - v1a N8 Runtime Quality Findings Closure
- Closed the implementation-readiness review findings from the N8 semantic-review runtime slice.
  - N8 semantic review lineage now validates `provenance_ref` against the runtime context packet ref, not only `context_packet_ref`, before human confirmation authority materialization.
  - `AppError.details.review_reason_codes` now survive the N8 failure-to-human-review route so downstream audit/review consumers can see why `require_human_review` was selected.
  - N8 semantic review context packet hashes are now computed from canonical business payload only; volatile `created_at` remains persisted metadata but no longer participates in `context_packet_hash` or downstream prompt/cache keys.
- Added regression coverage.
  - A provenance-drift mocked semantic review blocks before HumanConfirmedDecision/ValidatedNeed authority writes.
  - A malformed semantic review output routes to `require_human_review` and preserves `SEMANTIC_REVIEW_FAILED`.
  - The context packet hash test proves `created_at` is excluded from the stable hash while still present in the persisted packet.
- Subsequent v1a provider-slice work completed later. Optional N9 terminal context handoff audit projection remains deferred and non-blocking.

## 2026-06-01 - v1b N4 Runtime First Slice
- Promoted the initial N4 research-slice option draft path.
  - First slice is limited to `n4_research_slice_option_draft.initial_from_n3`.
  - N5 request-more-options, N4 retry variants, provider canaries, and Prisma-backed smoke are deferred until the initial path is stable.
  - Product-mode N4 admission now requires `runtime_verified` provenance from `TopicSelectionV1bN4ResearchSliceRuntimeService`; `fixture_replay` remains accepted only outside product.
- Added N4 runtime/admission services.
  - `TopicSelectionV1bN4ResearchSliceRuntimeService` builds a ref-backed context packet with frozen N1/N2/N3 lineage plus planning input derived from N1 intake snapshot, N2 constraint profile, and N3 readiness.
  - Prompt identity includes frozen input hash, N2/N3 handoff hashes, N1/N2/N3 authority hashes, planning-input hash, evidence role-bundle hash, evidence refs hash, constraint digest hash, claim ceiling hash, non-goals hash, accepted-risk/recheck/memory hashes, output contract, profile hash, redaction policy, runtime modifiers, and compression identity when present.
  - `TopicSelectionV1bN4ResearchSliceAdmissionService` blocks provenance/profile/prompt/runtime-audit/source-hash/payload drift and rejects legacy/unverified artifacts.
- Added N4 compression self-check semantics.
  - N4 emits a required-structure manifest for frozen lineage, planning input, evidence refs, required paths, preserved fact groups, forbidden authority fields, and deterministic gate ownership.
  - Compression MUST preserve N3 handoff lineage, intake snapshot identity, constraint profile, readiness, validated need, evidence role bundle/refs, claim ceiling, non-goals, accepted risks, risk/gap/blocker facts, recheck hints, memory suggestions, source-health warnings, and planning input structure.
  - Compression artifacts remain non-authority workflow evidence. Dropped required facts, forbidden payload classes, or manifest drift block before draft output/admission.
- Preserved authority boundaries.
  - Runtime output remains `model_draft_for_gate`.
  - Only the deterministic N4 gate may create `ResearchSliceOptionSet`, `ResearchSliceOption`, `PlanResearchSliceRun`, or `N4ToN5Handoff`.
  - Cache/compression/reuse cannot select a slice, create package/recheck records, or bypass N4 deterministic scope/evidence/claim-ceiling checks.

## 2026-06-01 - v1a Provider Slice Findings Closure
- Ran the uneven v1a provider slices for DashScope N7/N8 and OpenAI N8 over the production-shaped N1-N9 harness using the balanced T-112 sample set.
- DashScope N7 passed with one live provider invocation at the adjudication recommendation slot; no N7 code change was required.
- DashScope N8 exposed two provider-hardening issues in the human-confirmation semantic-review slot.
  - The provider produced schema-valid semantic output but did not reliably echo system-owned lineage fields. N8 now treats `provider_llm` semantic review lineage as runtime-owned: `workflow_run_id`, `node_attempt_id`, `review_id`, context/provenance refs, execution mode, profile id, policy version, and output schema version are stamped from the invocation context before authority materialization.
  - The provider used `review_reason_codes` for positive rationale even when `status=pass`. N8 now clears provider pass-only positive reason codes when risk/check coverage is complete and there are no scope violations, recording `SEMANTIC_REVIEW_PASS_REASON_CODES_IGNORED`.
- Tightened the N8 deterministic semantic gate so coverage and scope fields cannot be bypassed by a provider claiming `status=pass`.
  - `risk_coverage != complete` blocks with `MISSING_ACCEPTED_RISK_COVERAGE`.
  - `required_check_coverage != complete` blocks with `MISSING_REQUIRED_CHECK_COVERAGE`.
  - non-empty `scope_violations` blocks with `SEMANTIC_REVIEW_SCOPE_VIOLATION`.
- Prompt binding now includes an explicit `output_lineage` block and instructs providers to copy lineage fields exactly, keep `review_reason_codes` empty for pass, and reserve reason codes for warning/manual-review cases.
- The normalization is provider-only. Existing mocked/Codex lineage/provenance drift tests still block before `HumanConfirmedDecision` or `ValidatedNeed` authority writes.
- OpenAI N8 passed after the same hardening, confirming the N8 provider slice is stable across OpenAI and DashScope through the shared `AgentOrchestrator -> BackendLlmGateway` path.

## 2026-06-01 - v1a Closure Audit
- Reviewed v1a N1-N9 against the T-112 runtime boundary after the provider slice was committed.
- No blocking code findings were found in the v1a promoted runtime surface.
- Node-level closure:
  - N1-N4 are deterministic context producers. They do not require LLM runtime binding, but now have exact replay/input-hash drift blocking and zero-LLM replay smoke coverage.
  - N5 evidence extraction uses `TopicSelectionV1aLlmRuntimeBindingService` for runtime token/compression identity; EvidenceMap authority remains owned by deterministic materialization.
  - N6 candidate generation uses the v1a N6 runtime context-cache binding facade plus `AgentOrchestrator`; exact context-cache hits still run admission/routing/persistence gates.
  - N7 adjudication uses shared runtime token/compression identity; residual-risk, method-gap, high-risk, duplicate, and route-policy gates remain deterministic.
  - N8 semantic review is advisory only. Provider outputs are lineage-stamped from runtime context before authority materialization, and pass-status coverage/scope fields are still deterministically checked.
  - N9 publish is deterministic. Exact replay and lineage drift are covered; optional terminal context handoff audit projection remains deferred and non-blocking.
- Documentation drift fixed during the audit:
  - earlier “Remaining v1a work” notes now point to later completed slices instead of implying provider slices are still open;
  - v1a-specific acceptance items now distinguish completed v1a closure from still-open global v1b/v1c/resource-sampling coverage.

## 2026-06-01 - v1b N4 L3 Prisma-Backed Runtime Smoke
- Added `n4_runtime_smoke` to `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and exposed it as `pnpm topic-selection:v1b-n4-runtime-smoke`.
- The smoke reuses the existing Prisma-backed v1b WorkflowHarness rather than introducing a parallel runner.
  - Setup drives N1/N2/N3 through HTTP and then loads persisted N1 intake snapshot, N2 constraint profile, and N3 readiness through the Prisma v1b intake repository to build the same planning input that production N4 admission derives.
  - Runtime generation uses `TopicSelectionV1bN4ResearchSliceRuntimeService -> AgentOrchestrator` with the Prisma control plane and Prisma prompt packet cache store.
  - Product-mode N4 admission consumes the generated `runtime_verified` semantic artifact and remains the only path that materializes `ResearchSliceOptionSet`, `ResearchSliceOption`, `PlanResearchSliceRun`, and `N4ToN5Handoff`.
- L3 assertions cover product-mode runtime admission, exact replay with no additional artifact refs, source-hash drift blocking with `N4_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT`, non-provider runtime audit provenance, response reuse staying `not_applicable`/`null`, and N4 prompt-index metadata-only rows.
- This closes the N4 L3 local/dev smoke layer. N4 L4 provider/executor canary and L5 long-context/adversarial compression remain next.

## 2026-06-01 - v1b N4 L4/L5 Local Verification Slice Implemented
- Added v1b N4 provider canary methods to `TopicSelectionProviderCanaryService`.
  - Local OpenAI/DashScope canaries use the real `ResearchSliceOptionSetDraft@v1` schema and N4 context profile.
  - Prompt-cache exact hits still require two provider gateway calls, reuse only prompt artifact/quality-report refs, keep provider response cache status `not_applicable`, and keep response reuse refs `null`.
  - Over-budget fixtures block with zero gateway calls.
  - Live OpenAI/DashScope N4 provider canaries are present but gated by `T112_V1B_N4_PROVIDER_CANARY_LIVE=1`, `BACKEND_TEST_PRESERVE_REAL_ENV=1`, and provider keys.
- Added N4 L5 compression/adversarial tests to `topic-selection-compression-runtime-service.unit.test.ts`.
  - Dropping N4 long-context facts blocks for missing N3 handoff, intake readiness, validated need, evidence role bundle/refs, claim ceiling, non-goals, accepted risks, risk/gap/blocker facts, recheck hints, memory suggestions, and planning input.
  - Persisting adversarial raw provider logs in compressed N4 context blocks with `COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD`.
- `n4_research_slice_option_draft.initial_from_n3` now has L1/L2 implementation, L3 Prisma-backed smoke, L4 local provider canary gates, and L5 long-context/adversarial compression coverage. Fresh live provider evidence remains an explicit optional run, not an implicit default test.

## 2026-06-01 - v1b N4 Live Provider Canary Evidence
- Ran the explicit live v1b N4 provider canary gate with `T112_V1B_N4_PROVIDER_CANARY_LIVE=1` and local provider configuration.
- Re-ran the N4 L3/L4 evidence after splitting the v1a provider slice into its own commit, so the v1b N4 verification now reflects the current uncommitted v1b patch set.
  - L3 Prisma smoke run id: `t112-v1b-n4-runtime-smoke-20260601b`.
  - L4 live provider test result: 2 N4 live provider canaries passed, 22 nonmatching tests skipped.
- OpenAI N4 live provider canary passed through `AgentOrchestrator -> BackendLlmGateway`.
  - The canary used the N4 `ResearchSliceOptionSetDraft@v1` schema, live provider execution, and prompt-cache exact-hit repetition.
  - It verified two provider calls, prompt packet hash equality, prompt artifact/quality-report reuse, provider response cache status `not_applicable`, null response reuse refs, and provider telemetry.
- DashScope N4 live provider canary passed through the same runtime path.
  - DashScope completed within the 300-second test timeout.
  - The same provider-required-live and response non-reuse assertions passed.
- N4 first-slice runtime closure now has L1/L2 implementation, L3 Prisma-backed smoke, L4 local and live provider evidence, and L5 long-context/adversarial compression coverage.

## 2026-06-01 - v1c N2 Promotion Support LLM Draft Runtime Slice
- Started Phase 3 with the existing v1c N2 `promotion_support_generation.llm_draft` path.
  - Scope is only the current single LLM draft path in `TopicSelectionV1cPromotionGateService`.
  - Bounded micro-debate role slots, N3/N4 provider canaries, and N6 downstream feedback normalization remain follow-up v1c slots.
- Replaced direct `BackendLlmGateway` execution with `TopicSelectionAgentOrchestratorService`.
  - `llm_draft` now uses the shared runtime for prompt packet identity, token-budget preflight, model profile resolution, provider telemetry, response non-reuse, and invocation audit snapshot creation.
  - Added `topic-selection.v1c.n2.promotion-support-llm-draft.context-runtime@v1` with context family `v1c_n2_promotion_support`.
  - Added `topic-selection-promotion-decision-support` to the model profile registry with provider-only OpenAI/DashScope options.
- Preserved authority boundaries.
  - `TopicSelectionPromotionDecisionSupportLlmDraft@v1` remains reviewer-facing support prose only.
  - Deterministic N3 promotion gate evaluation remains the authority for disposition, loopback hints, and promotion readiness.
  - Provider response reuse remains blocked; raw provider response payload is not persisted in the support artifact.
- Runtime provenance is stored in the existing v1c support control-plane telemetry.
  - Telemetry now includes `llm_runtime_provenance` and `llm_runtime_audit`.
  - Provider telemetry remains separated from business support fields.

## 2026-06-01 - v1b Runtime Closure Refocus
- Refocused the next implementation work on v1b runtime closure before any broader v1c rollout.
- Added `.ai/scripts/topic-selection-v1b-runtime-stress.mjs` and `pnpm topic-selection:v1b-runtime-stress`.
  - The runner composes the existing Prisma-backed v1b harness scenarios: `n4_runtime_smoke`, `n6_runtime_smoke`, `n7_runtime_smoke`, and `n8_runtime_smoke`.
  - Child runs are isolated by `TOPIC_SELECTION_V1B_HARNESS_RUN_ID`, forced into `fixture` semantic mode, and keep `TITLE_CARD_REPOSITORY` plus `RESEARCH_LIFECYCLE_REPOSITORY` on Prisma.
  - The runner asserts metadata-only prompt packet index shape, scenario-specific runtime cases, and expected prompt packet index rows across N4, N6, all promoted N7 support slots, and N8.
- Updated the slot inventory wording for promoted v1b N6/N7 runtime rows so the main matrix no longer presents those rows as product frozen-semantic-only paths.
- The closure runner is explicitly a stress harness around existing runtime adapters. It does not move prompt/cache/compression/admission authority into the stress script.
- Remaining v1b runtime hardening after closure stress is stable: P2.1b N6 loopback/regeneration paths are now promoted from L1/L2 into integrated L3/L5 coverage.

## 2026-06-01 - v1b N6 P2.1b Loopback L3/L5 Closure
- Added `n6_loopback_runtime_smoke` to `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and `pnpm topic-selection:v1b-n6-loopback-runtime-smoke`.
  - The new scenario exercises `n6_question_candidate_draft.regeneration_after_n7_loopback` using a ref-backed `v1b_n7_to_n6_failed_trial_loopback_context` emitted by N7 failed-trial synthesis.
  - It exercises runtime `n6_loopback_triage` on an N6 deterministic gate failure, then consumes the emitted `v1b_n6_gate_failure_retry_context` through `n6_question_candidate_draft.regeneration_after_n6_gate_failure`.
  - Prompt packet index assertions now include `n6_loopback_triage` and the two regeneration prompt variants.
- Extended `pnpm topic-selection:v1b-runtime-stress` so the default combined stress includes `n6_loopback_runtime_smoke` between the initial N6 and N7/N8 smokes.
- Tightened the closure stress review checks:
  - `n6_loopback_triage` smoke now asserts audit provenance binding for non-provider execution, null model option, prompt packet hash, structured output hash, cache status `not_applicable`, null response reuse, and absent provider telemetry.
  - The combined runtime stress runner now validates each child harness run's own prompt-index delta before using the global DB snapshot, so unrelated prompt rows cannot mask a missing scenario slot.
- L5 coverage for the P2.1b facts remains in `topic-selection-compression-runtime-service.unit.test.ts`.
  - The long-context/adversarial tests block dropped N7 loopback projection, N6 gate-failure projection, failed draft identity, blocked candidate context, failed-trial synthesis, exhausted candidate identity/order, failure reason, regeneration hint, loopback target, N8 feedback, and loopback triage facts.
- This closes the local/dev L3 path for P2.1b without making the harness runner an authority owner; node adapters and runtime/admission services still own all semantic decisions.

## 2026-06-01 - D26 v1b Runtime Closure Scope Locked
- D26-A locks v1b runtime closure to the promoted N4/N6/N7/N8 runtime surface.
  - The closure signal is based on the existing promoted slots and their combined stress path, not on converting every v1b LLM-like or delegated semantic surface in the workflow.
- D26-B deferred v1b N2/N3/N5 runtime promotion at that point in the closure.
  - This historical deferral was superseded by D30, which explicitly promoted `n2_constraint_profile_semantic_support`, `n3_readiness_classification`, and `n5_slice_selection_review` with context family, authority boundary, prompt/cache identity, compression policy, and legacy-exit criteria.
- D26-C defines v1b closure acceptance.
  - At D26, `pnpm topic-selection:v1b-runtime-stress` was the combined local/dev Prisma evidence for promoted N4/N6/N7/N8 slots. After D30, the same runner includes `early_semantic_runtime_smoke` for promoted N2/N3/N5 semantic support slots.
  - Per-node L3/L4/L5 evidence remains the source of detailed slot confidence.
  - Prompt packet index persistence must stay metadata-only, provider response reuse remains blocked, compression self-check stays in runtime/admission services, and deterministic gates/handoffs/authority writes remain owned by node adapters and workflow services.
- The following D27 decision locks closure acceptance; execution evidence is recorded in verification.

## 2026-06-01 - D27 v1b Closure Acceptance Locked
- D27-A locks `pnpm topic-selection:v1b-runtime-stress` as the main closure command for the promoted v1b runtime surface.
  - The command composes N4, N6 initial, N6 loopback/regeneration, N7, and N8 Prisma-backed runtime smokes.
  - Child-level prompt-index deltas and the global prompt-index snapshot both participate in the acceptance signal.
- D27-B keeps per-node evidence as the detailed confidence floor.
  - Promoted N4/N6/N7/N8 slots must retain L1/L2 unit or harness policy coverage, L3 Prisma-backed smoke evidence, applicable L4 provider/executor canaries, and L5 compression/adversarial blockers.
- D27-C locks runtime authority invariants for closure.
  - Prompt packet index persistence remains metadata-only.
  - Provider response reuse remains blocked.
  - Compression failure remains runtime/admission-owned, not harness-only.
  - Deterministic gates, handoffs, route decisions, and authority writes remain workflow-owned and cannot be bypassed by cache hits, compression artifacts, or runtime support artifacts.
- D27-D marks N2/N3/N5 as deferred surfaces for this closure.
  - They are not missing coverage for v1b closure unless a later decision promotes them.
- D27-E defines the post-closure roadmap fork.
  - With closure evidence recorded, the next decision is either a separate delegated semantic support runtime-promotion decision for N2/N3/N5, or a return to v1c/resource-sampling rollout.

## 2026-06-01 - v1b Provider Canary Entrypoint Repair
- Deep v1b review found that the old `pnpm topic-selection:v1b-provider-canary` entry still invoked the N1-N11 harness with `TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE=provider_llm`.
- Current T-112 first-slice runtime policy correctly rejects provider `model_option_id` values on promoted N4/N6/N8 semantic artifacts, so the old full-chain provider harness path now fails closed with `N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT`.
- Kept the fail-closed runtime policy unchanged.
- Repointed `pnpm topic-selection:v1b-provider-canary` to the supported `TopicSelectionProviderCanaryService` slot-level provider checks for v1b N4/N6/N8.
- Updated the v1b runner guide and v1b hardening acceptance wording so provider-required-live evidence is slot-level, while deterministic full-chain evidence remains `pnpm topic-selection:v1b-harness-e2e` and `pnpm topic-selection:v1b-runtime-stress`.

## 2026-06-01 - v1b Runtime Documentation Consistency Closure
- Closed the remaining provider-canary wording drift before planning near-production v1b deep testing.
  - `06-node-scope-matrix.md` now marks `n6_question_candidate_draft.provider_canary` as implemented L4 slot-level evidence instead of deferred.
  - `08-exit-gate-review.md` now describes current provider-backed v1b evidence as `TopicSelectionProviderCanaryService -> AgentOrchestrator -> BackendLlmGateway` slot checks, not the retired N1-N11 provider repeat harness.
- No runtime policy changed in this documentation closure.
  - Deterministic full-chain evidence remains `pnpm topic-selection:v1b-harness-e2e`.
  - Promoted runtime closure evidence remains `pnpm topic-selection:v1b-runtime-stress`.
  - Provider-required-live evidence remains `pnpm topic-selection:v1b-provider-canary`.

## 2026-06-01 - v1b Near-Production Deep Test Entrypoint
- Added `.ai/scripts/topic-selection-v1b-near-prod-deep-test.mjs` and `pnpm topic-selection:v1b-near-prod-deep-test`.
  - The runner wraps existing evidence entries only; it does not implement independent prompt/cache/compression/admission semantics.
  - The default bundle runs Prisma-backed N1-N11 fixture behavior, promoted N4/N6/N7/N8 runtime stress, focused runtime/compression/admission unit tests, and the current N4/N6/N8 provider slot canary.
  - It writes one wrapper summary under `.ai/.tmp/topic-selection-v1b-near-prod-deep-test/<run-id>/90-summary.json` and references child command logs plus child JSON summaries where available.
- Retired the active provider-negative loopback harness entry.
  - Removed `topic-selection:v1b-provider-negative-loopbacks` from `package.json`.
  - Removed `provider_negative_loopbacks` from `.ai/scripts/topic-selection-v1b-harness-e2e.mjs`.
  - Removed the provider-negative child scenario from `.ai/scripts/topic-selection-workflow-scenario-runner.mjs`.
  - Updated `.ai/scripts/topic-selection-real-e2e.mjs` so retired quality-negative direct-route mode points to runtime stress plus provider slot canary instead of the removed provider-negative harness entry.
- Rationale:
  - Current T-112 v1b N6 first-slice runtime admission correctly rejects provider `model_option_id` values in promoted N6 draft artifacts.
  - The old provider-negative loopback path therefore conflicts with the promoted runtime boundary and would reintroduce a dual-track semantic surface.
  - Active negative/loopback coverage now belongs to deterministic runtime stress and service-level tests; provider-required-live evidence stays slot-level and non-authority.

## 2026-06-01 - v1b Provider Harness Compatibility Exit
- Completed the hard exit for the retired v1b full-chain provider harness semantics.
  - `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` now accepts only `TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE=fixture`; `provider_llm` fails at argument parsing with guidance to use `pnpm topic-selection:v1b-provider-canary`.
  - Removed the old provider draft helpers, provider schema routing, harness provider env parsing, and provider telemetry passthrough from the v1b harness runner.
  - Renamed remaining negative/loopback fixture payload fields away from provider-negative terminology because those cases are deterministic runtime stress semantics, not live-provider acceptance.
  - `.ai/scripts/topic-selection-real-e2e.mjs` now forces its v1b leg to the fixture harness and no longer passes v1b provider id, timeout, or retry envs into the v1b harness child.
  - The desktop v1b acceptance copy now points provider live validation to N4/N6/N8 slot canaries plus near-production runtime stress, not a repeat=3 full-chain provider harness.
- Boundary retained:
  - Provider-required-live v1b evidence remains slot-level through `TopicSelectionProviderCanaryService -> AgentOrchestrator -> BackendLlmGateway`.
  - Deterministic full-chain authority evidence remains `pnpm topic-selection:v1b-harness-e2e`.
  - Negative/loopback coverage remains deterministic runtime-stress/service coverage.

## 2026-06-01 - D28 v1c Runtime Landing Alignment Started
- Accepted D28-A scope:
  - current v1c runtime landing targets N2 bounded micro-debate and N6 downstream feedback normalization;
  - N3 gate diagnostic adjunct and N4 delegated promotion decision were initially held as provider-canary-only in this phase; N4 was later superseded by D28-L/D28-M and now uses the production runtime/admission slot plus slot-level provider canary;
  - historical D28 scope note, superseded by D32: resource sampling remained a later explicit runtime-promotion phase and was not part of the v1c closure scope at that time.
- Accepted D28-B responsibility boundary:
  - shared runtime is the unified context/cache/compression/memory/token/reuse/audit execution layer;
  - runtime owns `ContextPolicyProfile` resolution, memory policy enforcement, memory manifest/hash construction, context packet cache lookup semantics, prompt packet cache, token-budget preflight, compression orchestration/reporting/quality gates, response-reuse guards, provider telemetry separation, and runtime audit/provenance;
  - v1c node adapters/admission services own semantic context compilation, source-ref and hash binding, required fact inventories, fixed prompt rendering, output admission, and authority-boundary handoff to deterministic services;
  - WorkflowHarness owns orchestration, legal handoffs, fixtures, replay/stress/drift cases, evidence summaries, and assertions that runtime/admission/deterministic gates behaved correctly;
  - WorkflowHarness must not own prompt rendering, cache keys, compression preserved facts, memory selection, provider calls, response reuse decisions, or authority admission formulas.
- Boundary note:
  - context memory can enter runtime context only through profile-approved families/use labels and remains warning/risk/recheck/constraint input, never standalone authority;
  - cache, compression, memory manifests, prompt artifacts, provider telemetry, and runtime audit artifacts are acceleration/provenance/diagnostic evidence only and cannot bypass N2 advisory admission, N3 deterministic promotion gate, or N6 deterministic recheck side-effect boundaries.

## 2026-06-01 - D28-C v1c N2 Bounded Micro-Debate Shape Locked
- D28-C locks bounded micro-debate as the canonical T-112 v1c N2 runtime path.
  - The existing single `promotion_support_generation.llm_draft` path remains compatibility/transition support and does not define v1c runtime closure.
  - Fixed role slots are `n2_bounded_micro_debate.promotion_supporter_draft`, `n2_bounded_micro_debate.reviewer_critic_review`, `n2_bounded_micro_debate.promotion_supporter_repair`, and `n2_bounded_micro_debate.synthesizer_final`.
- All four role slots must pass through the shared runtime layer.
  - Runtime handles context memory, context/prompt cache, token-budget, compression, response-reuse guard, provider telemetry separation, and audit/provenance for each role.
  - Node adapter/admission owns the role sequence, prior-role artifact binding, fixed prompt rendering, role output schema/admission, allowed refs, forbidden authority fields, and final advisory handoff.
- Intermediate role outputs are diagnostic/support artifacts only.
  - `promotion_supporter_draft`, `reviewer_critic_review`, and `promotion_supporter_repair` may feed later role prompt identity as dynamic material refs/hashes.
  - Only `synthesizer_final` may enter the N2 advisory support/dossier output consumed by N3.
  - N3 may validate the admitted final structured semantic layer, but must not treat intermediate role artifacts as gate authority.
- Exact response reuse boundary:
  - Codex/mock exact role-output reuse is allowed only with non-provider provenance, operator approval or explicit local approved-reuse setting, exact prompt packet hash, profile hash, prior-role hash, and full schema/admission rerun.
  - `provider_llm` role outputs must be live provider calls; prompt-cache hits may reuse prompt artifacts/quality reports only and cannot satisfy provider response output.

## 2026-06-01 - D28-C1 v1c N2 Context Memory And Compression Policy Locked
- N2 base context packet policy:
  - v1c N2 adapters compile one frozen base context packet from the N1 `PromotionInputSnapshotHandoff`;
  - runtime may add only profile-approved memory manifests and must not re-read mutable v1b/package state to repair or enrich context;
  - base context must preserve promotion input snapshot ref/hash, topic package ref/hash, topic question/contract identity, answerability plan, selected evidence refs, claim ceiling, contribution summary, evaluation plan summary, accepted risk refs, blocker refs, recheck refs, memory suggestion refs, and source-health warning facts.
- N2 role dynamic material policy:
  - critic reads the supporter draft ref/hash;
  - repair reads critic findings ref/hash;
  - final reads supporter draft, critic review, and repair refs/hashes;
  - dynamic material is rendered only through fixed prompt compilers and cannot override templates, output contracts, authority boundaries, cache/reuse policy, compression policy, or provider-required-live semantics.
- N2 compression policy:
  - compression is a robustness mechanism and cannot prune semantic obligations;
  - quality gate blocks if compressed context drops claim ceiling, selected evidence refs, evidence support map, topic question/contract identity, answerability plan, contribution summary, evaluation plan, accepted risks, blockers, recheck obligations, critic findings, critic resolution map, readiness coverage items, allowed-ref manifest, or source-health warnings;
  - a blocked compression artifact remains non-authority diagnostic evidence and cannot become an admissible prompt/cache hit.
- N2 context memory policy:
  - allowed memory inputs are accepted/residual risk, blocker, source-health warning, recheck hint, memory suggestion, and decision-memory context;
  - memory can only enrich advisory support context and cannot become standalone promotion authority, override N1 frozen facts, or satisfy N3 promotion readiness.

## 2026-06-01 - D28-D v1c N6 Feedback Normalization Boundary Locked
- D28-D splits N6 into runtime normalization and deterministic side-effect admission.
  - The runtime slot may produce only `TopicSelectionV1cDownstreamFeedbackCandidate@v1`.
  - The candidate is not feedback authority and cannot create a recheck request by itself.
  - The deterministic N6 service remains the only owner of downstream feedback persistence and recheck work creation.
- N6 runtime responsibilities:
  - compile source feedback context and profile-approved memory manifests;
  - run prompt packet cache, token-budget preflight, compression, response-reuse guard, provider telemetry separation, and audit/provenance through the shared runtime;
  - treat cache/compression/reuse success as provenance only, not as a side-effect trigger.
- N6 admission responsibilities:
  - verify active `PaperProjectBridge` handoff identity and source hashes;
  - verify downstream source kind/ref, source feedback refs allowlist, feedback signal, severity, required action for recheck-producing signals, forbidden mutation fields, and bridge/promotion/package ref drift;
  - verify prompt packet hash, profile hash, runtime invocation context hash, source hashes, and normalized candidate hash before calling `TopicSelectionV1cDownstreamFeedbackRecheckService.recordDownstreamTopicFeedback`.
- N6 compression preserved facts:
  - bridge ref/hash, source promotion decision ref, commitment profile ref, promotion input snapshot ref, downstream source ref, source feedback refs, feedback signal, required action, affected ref or loopback target hint, severity, no-upstream-mutation boundary, and allowed-ref manifest.
- Side-effect boundary:
  - malformed, stale, drifted, or improperly reused normalized candidates create no feedback and no recheck;
  - Codex/mock exact reuse requires non-provider provenance, approval or explicit local approved-reuse setting, exact prompt/profile/source hash match, and full admission rerun;
  - `provider_llm` cannot use historical response reuse;
  - `recheck_opened` records typed recheck work and resume hints only, and does not trigger N1-N5 automatically.
- Harness alignment:
  - this follows the existing v1c harness principle: WorkflowHarness verifies legal handoff, record-only N6 ingress, no upstream auto-loop, no duplicate side effects, and deterministic service ownership; it must not own normalization prompts, cache keys, compression preserved facts, admission formulas, or recheck creation logic.

## 2026-06-01 - D28-G v1c Runtime Service Placement Locked
- N2 bounded debate runtime placement:
  - add `TopicSelectionV1cN2BoundedDebateRuntimeService` as production-shaped code for the four role invocations;
  - the service owns shared-runtime invocation assembly for role slots and emits runtime-verified role artifacts;
  - it must not write N3 gate authority or promotion decisions.
- N2 bounded debate admission placement:
  - add `TopicSelectionV1cN2BoundedDebateAdmissionService` or a tightly scoped helper under the v1c promotion-support boundary;
  - admission validates role order, prior-role hashes, allowed refs, forbidden authority fields, final semantic layer, critic finding resolution map, and runtime/provenance identity;
  - only the admitted final artifact may produce N2 support/dossier input consumed by N3.
- N6 feedback normalization runtime placement:
  - add `TopicSelectionV1cN6FeedbackNormalizationRuntimeService` as production-shaped code for normalized candidate generation;
  - the service owns shared-runtime invocation assembly and emits runtime-verified normalized candidate artifacts;
  - it must not persist downstream feedback or create recheck work.
- N6 feedback normalization admission placement:
  - add `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`;
  - admission validates bridge/source/reuse/compression/provenance/hash binding and then calls the existing `TopicSelectionV1cDownstreamFeedbackRecheckService` as the deterministic side-effect owner.
- Harness/script placement:
  - v1c WorkflowHarness and `.ai/scripts/topic-selection-v1c-*` runners should call these services and collect evidence;
  - scripts may remain L5 evidence wrappers but should not remain the main implementation of provider/Codex prompts, cache keys, compression policy, admission formulas, or recheck side effects.

## 2026-06-01 - D28-H v1c Slot And Profile Naming Locked
- N2 invocation slot ids:
  - `n2_bounded_micro_debate.promotion_supporter_draft`;
  - `n2_bounded_micro_debate.reviewer_critic_review`;
  - `n2_bounded_micro_debate.promotion_supporter_repair`;
  - `n2_bounded_micro_debate.synthesizer_final`.
- N2 context profile ids:
  - `topic-selection.v1c.n2.bounded-debate.supporter-draft.context-runtime@v1`;
  - `topic-selection.v1c.n2.bounded-debate.reviewer-critic.context-runtime@v1`;
  - `topic-selection.v1c.n2.bounded-debate.supporter-repair.context-runtime@v1`;
  - `topic-selection.v1c.n2.bounded-debate.synthesizer-final.context-runtime@v1`.
- N2 profile semantics:
  - context family is `v1c_n2_bounded_promotion_support`;
  - role isolation is represented through slot id, prompt variant, runtime invocation context hash, and dynamic material refs/hashes rather than separate context families;
  - model profile id is `topic-selection.v1c.promotion-support.bounded-micro-debate.v1`;
  - provider-canary profiles remain canary-only and are not the canonical runtime profile;
  - all four N2 role context profiles use `support_only_semantic` because their outputs are advisory support, not deterministic authority candidates.
- N6 slot/profile semantics:
  - invocation slot id is `downstream_feedback_normalization`;
  - context profile id is `topic-selection.v1c.n6.downstream-feedback-normalization.context-runtime@v1`;
  - context family is the existing `v1c_n6_downstream_feedback_normalization`;
  - model profile id is `topic-selection.v1c.downstream-feedback-normalization.v1`;
  - context profile uses `candidate_for_deterministic_gate` because the normalized candidate must pass deterministic N6 admission before any feedback/recheck side effect.

## 2026-06-01 - D28-I v1c Runtime Implementation Order Locked
- D28-I locks N2 before N6.
  - N2 bounded micro-debate is the highest-complexity v1c slot-level surface and should establish the registry/runtime/admission pattern first.
  - N6 feedback normalization should reuse the same pattern after N2 stabilizes.
- Step 1: registry/contracts first.
  - Add `v1c_n2_bounded_promotion_support`, N2 four context profiles, N2 canonical model profile, and N6 runtime/model profiles.
  - Add profile/schema tests for profile hash stability, slot mismatch blocking, context family binding, preserved facts, and post-cache gates.
- Step 2: N2 runtime/admission L1.
  - Implement `TopicSelectionV1cN2BoundedDebateRuntimeService` and `TopicSelectionV1cN2BoundedDebateAdmissionService`.
  - Start with mocked/Codex-response inputs before provider wiring.
  - Cover role order, prior-role hash drift, allowed refs, forbidden authority fields, final semantic layer, and critic resolution map.
- Step 3: N2 L2/L3.
  - Wire v1c harness through the N2 runtime/admission services.
  - Add Prisma smoke for prompt packet index metadata-only behavior, exact replay, drift blocking, and no N3 authority bypass.
- Step 4: N2 L4/L5.
  - Add provider slot canaries proving all four provider roles still live-call on prompt-cache hits and cannot reuse provider responses.
  - Add long-context/adversarial compression blockers for dropped risk, recheck, evidence, allowed-ref manifest, and critic-finding/resolution facts.
- Step 5: N6 runtime/admission.
  - Implement `TopicSelectionV1cN6FeedbackNormalizationRuntimeService` and `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`.
  - Focus verification on malformed, stale, drifted, or improperly reused candidates creating no feedback/recheck side effects.
- Step 6: v1c runtime stress closure.
  - Add `pnpm topic-selection:v1c-runtime-stress`.
  - Combine N2 runtime smoke, N6 runtime smoke, prompt-index assertions, and no side-effect bypass checks.

## 2026-06-01 - D28-J Minimum Landable First Slice Locked
- D28-J locks the first implementation slice to registry/contracts foundation only.
  - The goal is to establish stable v1c runtime identities before service or harness wiring.
  - This slice should be independently reviewable and reversible without changing workflow behavior.
- Included in the first slice:
  - add `v1c_n2_bounded_promotion_support` to shared runtime context families;
  - add N2 bounded micro-debate context profile id constants, slot id constants, and registry rows for all four role slots;
  - add N2 canonical bounded micro-debate model profile `topic-selection.v1c.promotion-support.bounded-micro-debate.v1`;
  - add N6 downstream feedback normalization context/model profiles as registry foundation only;
  - add tests for N2/N6 profile resolution, profile hash stability, slot/profile mismatch blocking, context family binding, preserved fact coverage, provider-live response-reuse blocking, and post-cache/post-reuse gate coverage.
- Excluded from the first slice:
  - no `TopicSelectionV1cN2BoundedDebateRuntimeService`;
  - no `TopicSelectionV1cN2BoundedDebateAdmissionService`;
  - no `TopicSelectionV1cN6FeedbackNormalizationRuntimeService`;
  - no `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`;
  - no WorkflowHarness, script, provider-canary, route, DB schema, or migration changes;
  - no DB-backed context packet cache.
- Verification floor for this slice:
  - shared runtime schema tests;
  - context policy profile registry unit tests;
  - model profile registry unit tests;
  - backend typecheck;
  - `git diff --check`.

## 2026-06-01 - D28-J Registry/Contracts First Slice Landed
- Shared runtime contract update:
  - added `v1c_n2_bounded_promotion_support` to `TOPIC_SELECTION_CONTEXT_FAMILIES`;
  - added schema-test coverage proving context policy profiles and context packet cache keys accept the new v1c bounded promotion support family.
- Context policy registry update:
  - added N2 bounded micro-debate slot constants and context profile constants for supporter draft, reviewer critic, supporter repair, and synthesizer final;
  - added N2 context profile rows with `support_only_semantic`, context family `v1c_n2_bounded_promotion_support`, provider-required-live reuse blocking, prompt/context cache gates, and compression preserved facts for N1 frozen promotion input, evidence, claim ceiling, risks, blockers, recheck obligations, allowed refs, source-health warnings, critic findings, critic resolution map, and readiness coverage;
  - added N6 downstream feedback normalization slot/profile constants and a context profile row with `candidate_for_deterministic_gate`, context family `v1c_n6_downstream_feedback_normalization`, feedback normalization admission gates, recheck side-effect boundary gates, provider-required-live reuse blocking, and preserved facts for bridge/source/feedback/recheck boundaries.
- Model profile registry update:
  - added canonical N2 runtime model profile `topic-selection.v1c.promotion-support.bounded-micro-debate.v1`;
  - added canonical N6 runtime model profile `topic-selection.v1c.downstream-feedback-normalization.v1`;
  - kept v1c provider-canary profiles as canary-only profiles.
- `.ai/llm-config` registry update:
  - registered the same canonical N2/N6 model profile ids in `.ai/llm-config/registry/model_profiles.yaml`;
  - did not change prompt templates or legacy Codex acceptance scripts in this slice.
- Scope intentionally not changed:
  - no `TopicSelectionV1cN2BoundedDebateRuntimeService`;
  - no `TopicSelectionV1cN2BoundedDebateAdmissionService`;
  - no `TopicSelectionV1cN6FeedbackNormalizationRuntimeService`;
  - no `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`;
  - no harness/script/provider-canary/route/DB/migration changes;
  - no DB-backed context packet cache.

## 2026-06-02 - D28-I Step 2 N2 Runtime/Admission L1 Landed
- Added `TopicSelectionV1cN2BoundedDebateRuntimeService`.
  - The service builds a ref-backed `TopicSelectionV1cN2BoundedDebateContextPacket@v1` from a frozen `PromotionInputSnapshotHandoff`.
  - It binds each role to the canonical N2 context profile, canonical N2 model profile, prompt template `topic-selection-v1c-promotion-support-bounded-micro-debate@1`, runtime invocation context hash, context packet hash, prompt packet hash, and redaction policy.
  - It routes role generation through `TopicSelectionAgentOrchestratorService` and therefore uses the shared prompt packet runtime/cache, token-budget preflight, compression hooks, response-reuse guard, provider telemetry separation, and runtime audit surface.
  - It emits runtime-verified role artifacts with structured output refs/hashes, runtime audit refs/hashes, source hashes, prompt identity, context profile identity, and prior-role artifact hashes.
- Added `TopicSelectionV1cN2BoundedDebateAdmissionService`.
  - Admission requires exactly the four canonical roles in order:
    - `n2_bounded_micro_debate.promotion_supporter_draft`;
    - `n2_bounded_micro_debate.reviewer_critic_review`;
    - `n2_bounded_micro_debate.promotion_supporter_repair`;
    - `n2_bounded_micro_debate.synthesizer_final`.
  - Admission validates runtime provenance class, profile identity, prompt packet hash, runtime invocation context hash, audit identity, source hashes, normalized payload hash, prior-role artifact hashes, allowed refs, and forbidden authority/downstream fields.
  - Final admission validates `synthesizer_final` has an N3-readable semantic layer covering claim ceiling alignment, contribution summary, evaluation plan, evidence support map, accepted risk acknowledgements, recheck obligation summary, critic finding resolution map, and readiness coverage items.
  - Final admission also verifies every critic finding is resolved and that accepted risk refs and recheck refs from the frozen handoff are not dropped.
  - Successful admission returns a non-authority `TopicSelectionPromotionDecisionSupportLlmDraft` projection from the final output for the future N2 support/dossier integration slice.
- Added focused L1 unit coverage.
  - Happy path: four Codex-assisted role outputs produce runtime-verified artifacts and only the final synthesizer output is admitted into the support draft projection.
  - Blockers: non-canonical role order, prior-role hash drift, forbidden authority fields, out-of-bounds refs, incomplete final semantic layer, and dropped accepted-risk/recheck refs.
- Scope intentionally not changed in this L1 slice:
  - no WorkflowHarness wiring;
  - no Prisma smoke or prompt-index persistence assertions beyond the existing runtime path;
  - no provider canary changes;
  - no N3 promotion gate invocation from the new final artifact;
  - no N6 feedback-normalization runtime/admission;
  - no route, DB schema, migration, or DB-backed context packet cache changes.

## 2026-06-02 - D28-I Step 3 N2 Harness/Prisma Smoke Landed
- Added a service-level bridge from admitted N2 bounded runtime output into existing v1c support persistence.
  - `TopicSelectionV1cPromotionGateService.createPromotionDecisionSupportFromVerifiedRuntimeDraft` accepts only a service-internal verified-runtime draft envelope.
  - The HTTP/controller input path remains unchanged; external route callers cannot submit this envelope through the route contract as a new authority path.
  - The method persists N2 support/dossier as `llm_draft` advisory material but does not create a promotion gate check.
  - N3 remains explicit through `createPromotionGateCheckFromSupport`, so N2 cannot set gate disposition, authorize promotion, create human decisions, create bridges, or open rechecks.
- Wired `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` through the N2 bounded runtime/admission services.
  - The harness now runs all four N2 slots through `TopicSelectionV1cN2BoundedDebateRuntimeService`.
  - It admits only the synthesizer-final output through `TopicSelectionV1cN2BoundedDebateAdmissionService`.
  - It feeds the admitted `TopicSelectionPromotionDecisionSupportLlmDraft` into `TopicSelectionV1cPromotionGateService` before explicitly invoking N3.
  - Added a support-only/no-N3-bypass scenario proving N2 support persistence alone creates no gate, human decision, bridge, downstream feedback, or recheck side effect.
- Added `pnpm topic-selection:v1c-n2-runtime-smoke`.
  - The smoke uses Prisma-backed `TopicSelectionControlPlaneService`, `TopicSelectionPromptPacketCacheService`, and `PrismaTopicSelectionV1cPromotionGateRepository`.
  - It verifies four prompt-index rows for the four N2 bounded role slots and asserts the prompt packet index model stores metadata/refs/hashes only, not prompt payloads or provider responses.
  - It verifies replay by reusing the admitted runtime draft for support persistence and re-invoking the N3 gate check, with stable support/gate ids and stable prompt-index row count for the admitted prompt hashes.
  - It verifies drift by tampering the final role artifact prompt packet hash and expecting `N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT`.
  - It verifies no N3 bypass by checking no `TopicSelectionPromotionGateCheck` exists before the explicit N3 call.
- Scope still deferred:
  - no provider slot canary changes;
  - no long-context/adversarial compression additions for v1c N2;
  - no N6 downstream feedback normalization runtime/admission;
  - no DB-backed context packet cache.

## 2026-06-02 - D28-I Step 3 Review Hardening Landed
- Hardened the N2 bounded-runtime admission boundary.
  - `TopicSelectionV1cN2BoundedDebateAdmissionService` now receives the runtime service as an expected-identity builder and recomputes expected identity internally from the frozen handoff, role artifact metadata, prior role artifacts, execution/run mode, and structured output hash.
  - Role artifacts now carry `workflow_run_id`, `node_attempt_id`, and `policy_version`, so admission no longer needs caller-supplied expected identity material.
  - Successful admission returns a sealed admission identity plus `admission_identity_hash` covering the final prompt packet hash, runtime audit ref/hash, final structured-output hash, role artifact hashes, prompt packet hashes, source hashes, prior-role hashes, and support-only boundary.
- Hardened the service bridge into `TopicSelectionV1cPromotionGateService`.
  - `createPromotionDecisionSupportFromVerifiedRuntimeDraft` now requires provenance, audit snapshot, admission identity, and admission identity hash.
  - Runtime draft validation rejects missing or drifted audit/provenance/identity before N2 support persistence.
  - The support run key now includes the admitted runtime identity hash, preventing a different admitted runtime final from silently reusing stale support for the same promotion input snapshot.
  - The support control-plane snapshot, workflow telemetry, and support artifact payload now include the runtime admission identity/hash for audit.
- Corrected provider/non-provider evidence semantics.
  - Codex-assisted bounded-runtime support no longer falls back to default OpenAI provider/model fields in the N2 support workflow run.
  - `normalizeN2PromotionSupport` now takes explicit `provider_involved` evidence from the caller instead of inferring provider involvement from `support_generation_mode=llm_draft`.
- Strengthened replay/cache smoke coverage.
  - Harness replay now reuses the exact admitted runtime envelope instead of re-running fresh N2 runtime artifacts; this matches the new identity-bound replay semantics.
  - Prisma smoke now replays the stable first N2 slot and asserts prompt-cache read-through by verifying the redacted prompt artifact ref and prompt quality report ref are reused without adding prompt-index rows.

## 2026-06-02 - D28-I Step 4 N2 L4/L5 Provider Canary and Compression Adversarial Landed
- Added v1c N2 slot-level provider canaries to `TopicSelectionProviderCanaryService`.
  - New local and optional live canaries cover all four bounded micro-debate slots:
    - `n2_bounded_micro_debate.promotion_supporter_draft`;
    - `n2_bounded_micro_debate.reviewer_critic_review`;
    - `n2_bounded_micro_debate.promotion_supporter_repair`;
    - `n2_bounded_micro_debate.synthesizer_final`.
  - The canary path is `TopicSelectionProviderCanaryService -> TopicSelectionAgentOrchestratorService -> BackendLlmGateway`.
  - This service-level L4 canary explicitly exercises the production N2 bounded-debate runtime profile and reports `canary_surface=production_runtime_slot`; provider canaries do not own a separate v1c provider-canary-only model profile.
  - It validates provider-required-live behavior on prompt-cache hits, prompt packet hash stability, redacted prompt artifact and prompt quality report reuse, null provider response reuse refs, provider telemetry separation, and over-budget zero-call blocking.
  - The v1c N2 provider-canary schema is derived from the slot reference draft with exact `role_slot`/`schema_version`, required slot-specific fields, closed object shapes, and exact functional-ref identity checks. A malformed minimal `{schema_version, role_slot}` provider output is blocked instead of being accepted as live-provider evidence.
  - Live OpenAI/DashScope coverage is explicitly gated by `T112_V1C_N2_PROVIDER_CANARY_LIVE=1` plus `BACKEND_TEST_PRESERVE_REAL_ENV=1` and provider credentials; default local tests use the fake gateway only.
- Extended `TopicSelectionV1cN2BoundedDebateRuntimeService` compression wiring.
  - The role-generation input now supports `runtime_token_budget_overrides` and `compression_attempt`, matching the existing v1b N4/N8 runtime pattern.
  - N2 runtime computes required compression facts from the frozen promotion input snapshot, source hashes, allowed-ref manifest, accepted risk/blocker/recheck/memory refs, prior role hashes, critic findings, critic resolution map, and readiness coverage.
  - Compression attempts are still acceleration/audit inputs only: quality-gate blockers stop before structured output, and admission/deterministic N3 remain authoritative.
- Added L5 adversarial/long-context coverage.
  - N2 runtime test blocks final-slot generation when compressed context drops required final facts or carries `raw_provider_logs`.
  - Compression runtime tests block dropped N2 long-context facts and adversarial persisted provider payloads directly at the shared compression layer.
- No DB schema, route contract, prompt template, provider credential/config, DB-backed context packet cache, or harness authority boundary was changed.

## 2026-06-02 - D28-K N6 Feedback Normalization L1 Runtime/Admission Slice Landed
- Added the missing shared `TopicSelectionV1cDownstreamFeedbackCandidate@v1` contract surface.
  - `topicSelectionV1cDownstreamFeedbackCandidateSchema` now defines the N6 runtime output as a strict normalized candidate with bridge/source refs, feedback signal, severity, required action, normalization hints, cited refs, feedback payload, and `no_upstream_mutation_confirmed`.
  - The candidate remains non-authority. It does not include downstream feedback ids, recheck ids, impact summaries, bridge patches, promotion patches, or workflow automation fields.
- Added `TopicSelectionV1cN6FeedbackNormalizationRuntimeService`.
  - The service owns the `downstream_feedback_normalization` runtime invocation through `AgentOrchestrator`.
  - It uses the existing N6 context profile `topic-selection.v1c.n6.downstream-feedback-normalization.context-runtime@v1`, context family `v1c_n6_downstream_feedback_normalization`, model profile `topic-selection.v1c.downstream-feedback-normalization.v1`, and prompt template `topic-selection-v1c-downstream-feedback-normalization@1`.
  - It records a ref-backed context packet, builds prompt packet identity, runs token-budget preflight, supports compression attempts, and records runtime-verified candidate artifacts with prompt/profile/runtime/source hashes.
  - Compression required facts bind the bridge, promotion decision, commitment profile, promotion input snapshot, downstream source ref, source feedback refs, raw feedback hash, required-action/signal/severity hints, allowed-ref manifest, and no-upstream-mutation boundary.
- Added `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`.
  - Admission receives the original runtime source input as well as the candidate artifact, so LLM output cannot self-author source refs or feedback refs.
  - It recomputes expected prompt/runtime/source identity through the runtime service and blocks profile drift, prompt drift, runtime context drift, source hash drift, and payload hash mismatch.
  - It blocks source mismatch, out-of-bounds refs, forbidden authority/automation fields even inside open `feedback_payload`, missing recheck `required_action`, mismatched recheck hints, and missing no-upstream-mutation confirmation.
  - Successful admission returns deterministic `TopicSelectionDownstreamTopicFeedbackCreateInput` only; the deterministic `TopicSelectionV1cDownstreamFeedbackRecheckService` remains the sole owner of feedback/recheck side effects.
- The L1 tests intentionally mirror the existing harness boundary:
  - N6 is record-only downstream ingress;
  - admitted candidates can be recorded idempotently through deterministic service;
  - replay creates one feedback/recheck projection;
  - bridge payload hash, `paper_project_intake_ref`, and `target_paper_project_ref` remain unchanged;
  - malformed candidate reuse creates no side effects.
- Completed after the L1 slice:
  - `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` now calls through the N6 runtime/admission services before deterministic downstream feedback/recheck persistence;
  - added `pnpm topic-selection:v1c-n6-runtime-smoke` for Prisma-backed N6 prompt-index/replay/drift/no-side-effect-bypass assertions;
- Still deferred:
  - v1c runtime stress combining N2 and N6.

## 2026-06-02 - D28-K Step 2 N6 Harness/Prisma Smoke Landed
- Wired v1c acceptance harness N6 scenarios through `TopicSelectionV1cN6FeedbackNormalizationRuntimeService` and `TopicSelectionV1cN6FeedbackNormalizationAdmissionService`.
  - The harness still owns scenario orchestration, row evidence, and no-auto-loop assertions.
  - Runtime owns context packet, prompt packet identity/cache, token-budget/compression path, runtime audit, and candidate artifact provenance.
  - Admission owns profile/prompt/runtime/source/payload hash checks and conversion to deterministic `TopicSelectionDownstreamTopicFeedbackCreateInput`.
  - `TopicSelectionV1cDownstreamFeedbackRecheckService` remains the only service that creates downstream feedback and recheck side effects.
- Added `.ai/scripts/topic-selection-v1c-n6-runtime-smoke.mjs` and package script `topic-selection:v1c-n6-runtime-smoke`.
  - The smoke uses Prisma-backed `TopicSelectionControlPlaneService`, `TopicSelectionPromptPacketCacheService`, and `PrismaTopicSelectionV1cDownstreamFeedbackRecheckRepository`.
  - It verifies prompt packet index metadata-only model shape, one N6 prompt-index row for the first runtime candidate, prompt-cache read-through on replay, deterministic feedback/recheck idempotency, prompt drift blocking at admission, and no run-key writes to upstream v1c authority tables.
  - The bridge handoff remains an in-memory fixture provider in this smoke so the test isolates N6 downstream effects from N1-N5 authority setup.
- No DB schema, route contract, provider credential/config, or DB-backed context packet cache change was introduced.

## 2026-06-02 - D28-K Step 3 N6 Dual-Track Policy Removal Landed
- Added `TopicSelectionV1cDownstreamFeedbackPolicy` as the canonical N6 downstream loopback policy.
  - `feedback_signal -> loopback_target`, `loopback_target -> affected_ref`, `loopback_target -> affected_stage`, and `requires_recheck` are now resolved in one service-local module.
  - `TopicSelectionV1cN6FeedbackNormalizationAdmissionService` and `TopicSelectionV1cDownstreamFeedbackRecheckService` both consume this policy instead of owning private copies.
  - The policy intentionally remains an internal backend service module with one exported resolver; helper maps and ref-resolution helpers are not exported.
- Removed the old admission-side fallback that synthesized required affected refs when bridge lineage was missing.
  - Missing `validated_need`, value-assessment, topic-question, research-slice, or evidence/search lineage now blocks admission with `N6_FEEDBACK_NORMALIZATION_AFFECTED_REF_UNRESOLVED`.
  - The deterministic downstream feedback service still throws the canonical `GATE_CONSTRAINT_FAILED` if called directly with missing required lineage.
  - This keeps malformed/stale/reused N6 candidates from creating downstream recheck authority.
- Tightened N6 candidate artifact provenance.
  - `TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact.runtime_provenance_class` is now only `runtime_verified`.
  - The unused `legacy_unverified`/fixture provenance variants were removed from this product admission surface.
- No harness-owned loopback/affected-ref formula remains for v1c N6.
  - Harness code still constructs scenario fixture outputs and records evidence.
  - Runtime/admission/deterministic services own prompt/cache/compression/provenance/admission and side-effect semantics.
  - No DB schema, route contract, provider credential/config, or DB-backed context packet cache change was introduced.

## 2026-06-02 - D28-K Step 4 N6 L4/L5 Provider Canary and Compression Adversarial Landed
- Added v1c N6 downstream feedback normalization slot canaries to `TopicSelectionProviderCanaryService`.
  - The service-level L4 canary exercises the production runtime slot: context profile `topic-selection.v1c.n6.downstream-feedback-normalization.context-runtime@v1`, model profile `topic-selection.v1c.downstream-feedback-normalization.v1`, slot `downstream_feedback_normalization`, and prompt `topic-selection-v1c-downstream-feedback-normalization@1`.
  - Local OpenAI/DashScope fake-gateway tests prove prompt packet refs can be reused while provider calls remain live, provider response reuse refs remain null, provider-side cache telemetry stays telemetry-only, and over-budget fixtures call zero providers.
  - A malformed minimal N6 provider output is blocked by the strict slot schema and cannot become provider evidence or downstream recheck authority.
  - Optional live coverage is gated by `T112_V1C_N6_PROVIDER_CANARY_LIVE=1`, `BACKEND_TEST_PRESERVE_REAL_ENV=1`, and provider credentials.
- Added v1c N6 L5 compression adversarial coverage at the shared compression runtime layer.
  - Long-context compression that drops promotion lineage, downstream source refs, source feedback refs, feedback signal, required action, affected ref, loopback target, severity, no-upstream-mutation boundary, or allowed-ref manifest blocks.
  - Compressed N6 context that persists `raw_provider_logs` blocks with `COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD`.
- Removed the old v1c provider-canary-only track.
  - Deleted `.ai/scripts/topic-selection-v1c-provider-canary.mjs`.
  - Removed v1c provider-canary-only model profiles from `TopicSelectionModelProfileRegistryService`.
  - `pnpm topic-selection:v1c-provider-canary` now routes to the unified backend `TopicSelectionProviderCanaryService` test entry with N2/N6 live gates.
  - N3/N4 provider-only adjunct rows are no longer represented as T-112 runtime slots; they can return only if they are promoted through explicit runtime/admission services.
- No DB schema, route contract, provider credential/config, or DB-backed context packet cache change was introduced.

## 2026-06-02 - D28-K Step 5 v1c Runtime Stress Runner Landed
- Added `.ai/scripts/topic-selection-v1c-runtime-stress.mjs` and package script `pnpm topic-selection:v1c-runtime-stress`.
  - The runner is a composition/evidence layer only. It does not construct prompts, perform admission, normalize feedback, or create deterministic authority.
  - Default execution runs one N2 Prisma runtime smoke, one N6 Prisma runtime smoke, one v1c harness acceptance pass, and one local `TopicSelectionProviderCanaryService` smoke.
  - `TOPIC_SELECTION_V1C_RUNTIME_STRESS_ITERATIONS` controls repeated N2/N6 smoke iterations.
  - `TOPIC_SELECTION_V1C_RUNTIME_STRESS_INCLUDE_HARNESS_ACCEPTANCE=0` and `TOPIC_SELECTION_V1C_RUNTIME_STRESS_INCLUDE_PROVIDER_CANARY=0` can narrow the runner for local debugging.
- The runner reads child manifests and asserts:
  - N2 prompt-index rows cover all four bounded micro-debate slots;
  - N2 replay keeps support/gate ids stable, prompt-cache replay reuses prompt artifacts, prompt drift blocks, and no N3 gate is created before explicit N3;
  - N6 prompt-index rows cover `downstream_feedback_normalization`;
  - N6 feedback replay is idempotent, prompt-cache replay reuses prompt artifacts, prompt drift blocks, and upstream v1c authority table counts remain unchanged;
  - v1c harness rows all pass and expose no pending gaps;
  - provider canary local smoke passes with live-provider gates forced off by the runner.
- The runner also snapshots the Prisma prompt packet index before/after and asserts expected slot minimums plus no prompt quality blockers.
- No DB schema, route contract, provider credential/config, DB-backed context packet cache, or harness authority boundary was changed.

## 2026-06-02 - D28-L N4 Delegated Promotion Decision L1-L3 Landed
- Added the shared `TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1` contract surface.
  - The candidate is non-authority and can only become input to explicit human acceptance through `TopicSelectionV1cHumanPromotionDecisionService.recordHumanPromotionDecision`.
  - It carries N3 gate id, promotion input snapshot id/hash, decision, rationale, condition/loopback fields, cited refs, decision support refs, and explicit `no_authority_write_confirmed`, `no_bridge_creation_confirmed`, and `human_review_required` boundaries.
  - Schema coverage rejects invalid delegated boundary flags and keeps the contract reachable through direct and barrel exports.
- Added `TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService`.
  - The service owns slot `n4_delegated_promotion_decision_candidate`, context family `v1c_n4_delegated_promotion_decision`, model profile `topic-selection.v1c.delegated-promotion-decision.v1`, and prompt `topic-selection-v1c-delegated-promotion-decision@1`.
  - It records a ref-backed N3 gate context packet, uses `AgentOrchestrator` for prompt packet identity/cache, token-budget preflight, provider telemetry separation, runtime audit, and runtime-verified candidate artifacts.
  - The standard N4 context target is 20k input tokens so the baseline N3 handoff path remains a no-compression prompt-cache replay path. The deterministic compression rerun path remains in the runtime for later long-context/adversarial N4 coverage.
- Added `TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService`.
  - Admission recomputes expected profile/prompt/runtime/source/payload identity through the runtime service.
  - It blocks prompt/profile/runtime/source drift, source mismatch, out-of-bounds refs, missing gate/snapshot support refs, forbidden authority/bridge/recheck/automation fields, invalid human boundary flags, invalid external human actor, and decision/condition/loopback mismatches.
  - Successful admission returns only a safe `RecordHumanPromotionDecisionInput`; it does not call the N4 human writer and cannot create N5 bridge authority.
- Wired `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` N4 happy/no-bridge/replay paths through runtime/admission before explicit human writer calls.
  - The harness remains an orchestration/evidence layer only.
  - Replay no longer has a direct N4 fixture writer path; runtime/admission no-authority assertions compare write-count deltas, so exact replay with pre-existing authority records remains valid.
- Added `.ai/scripts/topic-selection-v1c-n4-runtime-smoke.mjs` and package script `pnpm topic-selection:v1c-n4-runtime-smoke`.
  - The smoke uses Prisma-backed control plane, prompt packet cache index, N3 gate repository, human decision repository, and N5 bridge repository.
  - It verifies prompt-index metadata-only behavior, one N4 prompt-index row, prompt-cache replay artifact reuse, human decision replay idempotency, explicit N5 bridge replay idempotency, prompt drift blocking, no N4 authority write from runtime/admission, and no N5 bridge before explicit N5.
- Extended `pnpm topic-selection:v1c-runtime-stress`.
  - The runner now executes N2, N4, and N6 Prisma runtime smokes per iteration plus harness acceptance and local provider canary.
  - Prompt-index minimum slot assertions now include `n4_delegated_promotion_decision_candidate`.
- No DB schema, route contract, provider credential/config, DB-backed context packet cache, or direct provider SDK path was introduced.

## 2026-06-02 - D28-M N4 L4/L5 Provider Canary and Compression Adversarial Landed
- Added v1c N4 delegated promotion decision slot canaries to `TopicSelectionProviderCanaryService`.
  - The service-level L4 canary exercises the production runtime slot: context profile `topic-selection.v1c.n4.delegated-promotion-decision.context-runtime@v1`, model profile `topic-selection.v1c.delegated-promotion-decision.v1`, slot `n4_delegated_promotion_decision_candidate`, and prompt `topic-selection-v1c-delegated-promotion-decision@1`.
  - Local OpenAI/DashScope fake-gateway tests prove prompt packet refs can be reused while provider calls remain live, provider response reuse refs remain null, provider-side cache telemetry stays telemetry-only, and over-budget fixtures call zero providers.
  - A malformed minimal N4 provider output is blocked by the strict slot schema and cannot become provider evidence, N4 human authority, or N5 bridge authority.
  - The canary schema now binds key delegated-decision boundary fields exactly: decision, condition action/severity/loopback target, human-review requirement, no-authority-write confirmation, and no-bridge-creation confirmation.
  - Optional live coverage is gated by `T112_V1C_N4_PROVIDER_CANARY_LIVE=1`, `BACKEND_TEST_PRESERVE_REAL_ENV=1`, and provider credentials.
- Added v1c N4 L5 compression adversarial coverage at the shared compression runtime layer.
  - Long-context compression that drops promotion gate handoff, promotion input snapshot, gate disposition, promote-allowed decision, support/dossier/readiness refs, conditions, required actions, loopback hints, accepted risks, claim ceiling, early-check obligations, allowed-ref manifest, human authority boundary, or no-bridge boundary blocks.
  - Compressed N4 context that persists `raw_provider_logs` blocks with `COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD`.
- Extended the default v1c runtime stress runner provider-canary child so local N4 canary coverage runs with live-provider gates forced off.
- No DB schema, route contract, provider credential/config, DB-backed context packet cache, direct provider SDK path, or provider-canary-only harness path was introduced.

## 2026-06-02 - D28-M N4 L4/L5 Review Hardening Landed
- Tightened generated provider-canary schemas for exact runtime-slot fixture arrays.
  - Functional-ref arrays now carry `minItems`, `maxItems`, and `uniqueItems` so duplicate or missing delegated-decision support refs cannot pass the canary schema.
  - Non-ref arrays now carry `maxItems` alongside `minItems`, keeping fixed fixture arrays such as N4 conditions from accepting extra elements.
- Strengthened v1c N4 provider-canary tests.
  - Local tests now validate the happy N4 reference candidate against the generated schema and prove duplicated `decision_support_refs` are rejected.
  - Optional live OpenAI/DashScope N4 canaries now use the same runtime evidence helper as local canaries, covering provider-required-live, production-runtime-slot labels, prompt hash stability, prompt artifact and quality-report reuse, response cache `not_applicable`, null response reuse refs, and telemetry provider ids.

## 2026-06-02 - D28-N v1c Production-Depth Runner Landed
- Added `.ai/scripts/topic-selection-v1c-production-depth.mjs` and package script `pnpm topic-selection:v1c-production-depth`.
  - The runner is a pressure/governance composition layer only; it does not construct prompts, own admission formulas, normalize feedback, write authority, or restore full-chain provider harness execution.
  - Default execution runs one higher-iteration serial `pnpm topic-selection:v1c-runtime-stress`, two concurrent runtime-stress children, focused runtime/compression/admission unit tests, and the unified local provider slot canary.
  - Runtime-stress children run live-provider gates off; live provider validation remains explicit via N2/N4/N6 slot canary env gates.
- Added production-depth built-in checks:
  - Prisma prompt packet index metadata-only schema guard;
  - real DB `PrismaTopicSelectionPromptPacketCacheStore.putIfAbsent` first-writer race with eight concurrent writers, exactly one inserted row, all participants observing one winning prompt artifact ref, and cleanup verification leaving zero temporary race rows;
  - v1c N2/N4/N6 provider profile drift guards for OpenAI and DashScope model options, including cross-profile model-option mismatch blocking;
  - retention observation for prompt-index rows created during the production-depth window plus non-destructive old-row counting.
- Default production-depth passed with six effective runtime-stress iterations and prompt-index coverage for all promoted v1c slots.
- No DB schema, route contract, provider credential/config, DB-backed context packet cache, direct provider SDK path, or provider-canary-only harness path was introduced.

## 2026-06-02 - D28-N Production-Depth Review Hardening Landed
- Hardened the production-depth prompt-index first-writer race cleanup.
  - The temporary race row cleanup now runs in `finally`, so a failed race assertion still attempts to remove the run-scoped temporary prompt-index row.
  - The success path still asserts exactly one inserted row, one shared winning prompt artifact ref, one deleted cleanup row, and zero remaining rows.

## 2026-06-02 - D28-O v1c Provider-Live Acceptance Diagnostics Landed
- Enhanced `TopicSelectionProviderCanaryLiveRequiredEvidence` so live-provider acceptance does not collapse provider/runtime failures into an undiagnosable `blocked` status.
  - Live evidence now carries per-attempt `error_code`, blocker codes, warning codes, and token-budget gate decisions for the first and second invocation.
  - The generic provider canary path now reuses the same live-evidence builder as v1b/v1c slot canaries.
  - Provider canary tests now assert live-required success through a diagnostic helper so future live failures surface provider id, model option, call count, blocker/error codes, and token-budget decisions in TAP output.
- Ran v1c N2/N4/N6 DashScope live slot canaries against the production runtime slots.
  - N2 bounded micro-debate all-slot live canary passed.
  - N4 delegated promotion decision live canary passed.
  - N6 downstream feedback normalization live canary passed.
  - Each passed path still proves provider calls happen despite prompt-cache reuse, response reuse refs stay null, and provider telemetry remains telemetry-only.
- OpenAI live acceptance did not pass in this local environment.
  - A focused N2 supporter-draft diagnostic showed two real provider attempts, both token-budget `within_budget`, both response reuse refs null, and provider-call count 2, but both attempts blocked at the provider request layer.
  - Observed OpenAI blockers were provider-channel/request failures (`InvalidRequestError` in the runtime diagnostic and `TransientError`/`fetch failed` in a direct gateway probe), not token-budget, prompt-cache, response-reuse, or deterministic-authority bypass failures.
  - This was later fixed in D28-P.

## 2026-06-02 - D28-P OpenAI v1c Provider-Live Channel Stabilization Landed
- Fixed the OpenAI Responses structured-output schema compatibility issues exposed by v1c live canaries.
  - OpenAI request schema normalization now strips `uniqueItems`, which is valid for local Ajv/provider-canary fixture validation but rejected by the OpenAI structured-output schema subset.
  - OpenAI request schema normalization now fills `items: { type: "string" }` for `maxItems: 0` arrays whose local schema has `items: {}`. The item schema remains unreachable because `maxItems` is zero; local/runtime/admission validation semantics are unchanged.
- Added a guarded OpenAI transport fallback inside `BackendLlmGateway`.
  - Normal execution still uses the existing single gateway and `fetch` path.
  - If an OpenAI `api.openai.com` request fails with a connection-level `fetch failed` / undici timeout/reset, the gateway retries that same request through system `curl`.
  - The curl fallback passes the Authorization header through an extra file descriptor config stream, not command-line arguments, so provider credentials are not exposed through process args.
  - No provider SDK, second gateway, new config key, provider profile change, prompt change, route change, DB schema change, or provider response reuse behavior was introduced.
- Re-ran v1c OpenAI provider-live acceptance.
  - Focused N2 supporter draft, N2 repair, and N4 probes succeeded after the schema/transport fixes.
  - The full gated OpenAI v1c N2/N4/N6 live slot canary group passed.

## 2026-06-02 - D29 T-112 Closure Audit
- Entered closure audit for the promoted T-112 runtime surface after v1c production-depth and both live provider groups had passing evidence.
- Closure scope is explicitly bounded to:
  - v1a N5/N6/N7/N8 runtime-bound LLM slots plus deterministic N1-N4/N9 replay/publish boundaries;
  - v1b promoted N4/N6/N7/N8 runtime slots;
  - v1c promoted N2 bounded micro-debate, N4 delegated promotion decision, and N6 downstream feedback normalization slots.
- No new code findings were identified during the audit. The runtime/harness responsibility split remains aligned with the locked T-112 principles:
  - runtime owns context policy resolution, context-memory policy, context/prompt cache semantics, token-budget preflight, compression orchestration/reporting/quality gates, response-reuse guards, provider telemetry separation, and runtime audit/provenance;
  - node adapters/admission services own semantic context construction, source-ref and hash binding, preserved-fact inventories, output admission, and authority-boundary handoff;
  - harness owns orchestration, fixtures, replay/stress/drift cases, evidence summaries, and boundary assertions only.
- Closure audit treats these as explicit non-blocking deferrals, not hidden gaps:
  - DB-backed context packet cache index;
  - historical D29 note, superseded by D30/D32 for the named promoted surfaces: resource-sampling runtime promotion and any direct-provider surface that had not been promoted into the matrix implementation rows;
  - historical D29 note, superseded by D30: v1b frozen/delegated N2/N3/N5 semantic support runtime promotion.
- Acceptance criteria were normalized from older global wording to the promoted-surface closure semantics so the docs do not imply unimplemented global provider coverage.

## 2026-06-02 - D30 v1b N2/N3/N5 Runtime Promotion Scope Locked
- Promoted the first non-blocking follow-up slice after D29 closure audit: v1b N2/N3/N5 frozen/delegated semantic support runtime promotion.
- Minimum implementation surface:
  - N2 `n2_constraint_profile_semantic_support`;
  - N3 `n3_readiness_classification`;
  - N5 `n5_slice_selection_review`.
- Runtime service scope:
  - generate `runtime_verified` semantic support artifacts through `TopicSelectionAgentOrchestratorService`;
  - use registered model profiles and `ContextPolicyProfile` rows;
  - record ref-backed context packet artifacts, prompt packet identity/cache, token-budget preflight, runtime audit/provenance, and prompt-cache metadata;
  - stay provider-agnostic and avoid direct provider SDK/gateway calls outside `AgentOrchestrator`.
- Admission service scope:
  - validate provenance class, profile identity, prompt packet hash, runtime invocation context hash, source hashes, payload hash, output contract, slot/effect, and audit ref/hash;
  - block `fixture_replay` in product admission unless explicitly in acceptance/test mode;
  - block `legacy_unverified` for promoted slots.
- Authority boundary:
  - N2/N5 delegated candidates remain non-authority until the existing WorkflowHarness deterministic/delegated gate accepts the frozen payload;
  - N3 readiness classification remains support-only and cannot override deterministic readiness assessment;
  - cache/replay/runtime artifacts cannot create N2/N3/N5 authority, N4 option sets, N6 handoffs, or downstream side effects.
- Deferred outside this slice:
  - DB-backed context packet cache index;
  - provider-live canary expansion for N2/N3/N5;
  - historical D30 note, superseded by D32 for resource-sampling batch classification: resource-sampling runtime promotion.

## 2026-06-02 - D30 v1b N2/N3/N5 Runtime Promotion Landed
- Added `TopicSelectionV1bEarlySemanticSupportRuntimeService` for the promoted early semantic slots:
  - N2 `n2_constraint_profile_semantic_support`;
  - N3 `n3_readiness_classification`;
  - N5 `n5_slice_selection_review`.
- Runtime now generates `runtime_verified` semantic support artifacts through `TopicSelectionAgentOrchestratorService`, with registered context profiles, prompt packet identity/cache metadata, token-budget preflight, runtime audit provenance, ref-backed context packets, and no direct provider SDK path.
- Added `TopicSelectionV1bEarlySemanticSupportAdmissionService` and wired WorkflowHarness N2/N3/N5 consumption through it.
  - Admission recomputes expected profile, prompt packet hash, runtime invocation context hash, run mode, source hashes, payload hash, slot/effect, and audit identity.
  - `legacy_unverified` is blocked.
  - `fixture_replay` is blocked in product mode and remains acceptance/test-only.
  - Optional source hashes are omitted rather than represented by placeholder hashes.
- Harness responsibility remains orchestration/evidence only.
  - N2/N5 Codex delegated payloads still pass through existing deterministic/delegated gates before authority writes.
  - N3 support remains non-authority and cannot substitute for persisted N3 readiness authority.
  - Human delegated N2/N5 authority input remains a frozen business input path, not an LLM semantic artifact runtime path.
- Extended `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` with `early_semantic_runtime_smoke` and package script `pnpm topic-selection:v1b-early-semantic-runtime-smoke`.
  - It verifies N2 runtime replay, N2 source-hash drift blocking, N3 support no-N3-authority-bypass, N5 delegated selection replay, and Prisma prompt-index metadata-only rows for all three promoted slots.
- Extended `.ai/scripts/topic-selection-v1b-runtime-stress.mjs` so default v1b runtime stress includes the early semantic runtime smoke.
- Verification passed:
  - backend TypeScript compile;
  - early semantic admission unit tests;
  - context policy registry and shared runtime schema tests;
  - harness script syntax checks;
  - `early_semantic_runtime_smoke`;
  - runtime-stress targeted to `early_semantic_runtime_smoke`.
- No DB schema, route contract, provider credential/config, DB-backed context packet cache, direct provider SDK path, or provider-harness full-chain path was introduced.

## 2026-06-02 - D31 v1b Early Semantic Promotion Review Fixes
- Fixed the D30 review findings around promoted N2/N3/N5 semantic support runtime quality.
- Service-level WorkflowHarness tests no longer handcraft promoted N2/N5 Codex semantic artifacts.
  - N2 `codex_delegated` tests now generate `runtime_verified` support artifacts through `TopicSelectionV1bEarlySemanticSupportRuntimeService`.
  - `runReadyN3` also attaches runtime-generated N3 support-only evidence so downstream service-level coverage exercises the promoted N3 admission path without granting it authority.
  - N5 `codex_delegated` tests now use runtime-generated `n5_slice_selection_review` artifacts.
- HTTP route integration smoke no longer uses placeholder promoted N2 semantic artifacts.
  - The HTTP route smoke keeps deterministic `fixture` authority input for N2 because its scope is route/legacy-write compatibility, not Codex delegated runtime evidence.
  - Runtime evidence for N2/N3/N5 remains covered by the dedicated Prisma `early_semantic_runtime_smoke`.
- Tightened `TopicSelectionV1bEarlySemanticSupportAdmissionService`.
  - `fixture_replay` remains blocked in product mode.
  - In acceptance/test mode, `fixture_replay` must still pass profile, prompt packet, runtime invocation context, source-hash, payload-hash, and compression identity checks; it is no longer a broad bypass.
- Updated the plan notes so D26/D27 deferred N2/N3/N5 wording is explicitly marked as superseded by D30.

## 2026-06-02 - D32 Resource-Sampling Runtime Promotion
- Promoted `resource_classification.batch` as the minimum resource-sampling runtime slice.
- Added registered resource-sampling context/model profiles:
  - context profile `topic-selection.resource-sampling.literature-classification-batch.context-runtime@v1`;
  - invocation slot `resource_classification.batch`;
  - context family `resource_sampling_literature_classification_batch`;
  - model profile `topic-selection-resource-sampling-classification`;
  - output contract `TopicSelectionResourceSamplingLlmOutput@v1`.
- Replaced the direct batch-level `BackendLlmGateway` call in `TopicSelectionResourceSamplingService` with `TopicSelectionAgentOrchestratorService`.
  - The service now creates a real control-plane workflow run before classifying eligible batches.
  - Each provider batch records prompt packet identity/cache metadata, token-budget gate result, and runtime audit artifacts through `AgentOrchestrator`.
  - Structured output and guardrail summary artifacts are recorded on the same workflow run before the workflow is updated to succeeded/failed.
- App wiring now passes a resource-sampling `AgentOrchestrator` with the shared prompt packet cache service, so Prisma-backed prompt-index persistence is used in production-shaped app wiring.
- Resource-sampling model normalization is now registry-bound.
  - `model.profile_id` must match the registered resource-sampling profile.
  - `model.model_id` must match the selected registered OpenAI/DashScope runtime option.
  - This prevents audit model refs from describing a different model than the provider option actually used by runtime.
- Authority boundary remains unchanged.
  - Runtime classification output is still only a semantic draft.
  - Deterministic guardrails, sample assembly, and `topic-selection.resource-sample-ready` remain the only path to persisted resource sample authority.
  - Provider response reuse remains blocked, provider-side cache telemetry remains telemetry only, and no DB-backed context packet cache was introduced.
- L4 provider canary coverage now includes resource sampling.
  - `TopicSelectionProviderCanaryService` exposes `runResourceSamplingPromptCacheLiveRequiredCanary` and `runResourceSamplingOverBudgetZeroCallCanary` for slot `resource_classification.batch`.
  - The canary invocation uses the registered resource-sampling context/model profiles, prompt `topic-selection-resource-sampling-classification`, output contract `TopicSelectionResourceSamplingLlmOutput@v1`, semantic context packet hashes, and provider-required-live runtime token-budget preflight.
  - Local fake-gateway tests prove prompt packet reuse does not become provider response reuse, over-budget preflight makes zero provider calls, and malformed minimal provider outputs are schema-blocked while response reuse refs remain null.
  - Optional live gates are available through `T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE=1` plus `BACKEND_TEST_PRESERVE_REAL_ENV=1` and the provider key.
- L5 compression adversarial coverage now includes resource sampling.
  - Compression quality gates block dropped `literature_ref`, candidate abstract/digest, role classification, rationale, method family, and guardrail signal facts.
  - Compression quality gates also block forbidden raw provider logs in resource-sampling compressed context payloads.

## 2026-06-02 - D33 Final Closure Pass
- Marked T-112 `done` for the promoted runtime scope.
- Normalized final closure scope across overview, architecture, and acceptance docs:
  - v1a N5/N6/N7/N8 plus deterministic N1-N4/N9 replay/publish boundaries;
  - v1b N2/N3/N4/N5/N6/N7/N8 semantic/runtime surfaces;
  - v1c N2/N4/N6 runtime/admission surfaces;
  - resource-sampling `resource_classification.batch`.
- Reclassified stale D29/D26 wording as historical/superseded where D30/D32 later promoted the named surfaces.
- Non-blocking future decisions remain outside T-112 closure:
  - DB-backed context packet cache index;
  - any future direct/provider/Codex surface not yet registered in the runtime profile/matrix.
- No code, route contract, DB schema, provider credential/config, provider SDK path, or authority boundary changed in D33.
