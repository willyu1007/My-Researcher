# 01 Plan

## Phase 0 - Current-State Inventory
- Inventory all topic-selection LLM-like call paths:
  - resource sampling classification;
  - v1a evidence extraction, need generation, adjudication, semantic confirmation;
  - v1b semantic draft/support nodes;
  - v1c promotion support and feedback normalization;
  - downstream feedback/recheck bridges that consume topic-selection outputs.
- Classify existing mechanisms as context hash, prompt hash, replay hash, telemetry, cache marker, compression marker, or true reusable cache.
- Upgrade `06-node-scope-matrix.md` into the implementation gate for T-112:
  - every LLM-capable invocation slot MUST have an explicit row before shared runtime behavior is implemented for that surface;
  - row granularity is slot-level rather than node-level, so debate roles, semantic support artifacts, and provider canary surfaces are separate rows;
  - v1c bounded micro-debate MUST be split by role slot, and v1c provider canary surfaces MUST be split by provider-required invocation surface;
  - every row MUST identify the node policy adapter or context compiler that owns semantic context construction;
  - every row MUST define token-budget, compression, context-cache, response-reuse, and authority-boundary behavior.
- Record node gaps in `06-node-scope-matrix.md`.
- Runtime implementation MUST NOT allow node-local cache, compression, or response-reuse semantics that are not represented in the matrix.

## Phase 1 - Policy And Contract Design
- Define shared vocabulary:
  - `context_packet`;
  - `context_policy_profile`;
  - `prompt_packet`;
  - `invocation_cache_key`;
  - `token_budget_gate`;
  - `compression_report`;
  - `response_reuse_provenance`.
- Define `ContextPolicyProfile` as the slot-level unit that binds suitable context, memory inclusion, compression, token-budget behavior, cache behavior, response reuse, post-reuse gates, and provenance requirements.
- Define reusable functional templates and execution modifiers, while requiring every slot to bind an explicit profile.
- Define context source taxonomy, memory-policy semantics, compression-policy semantics, cache-policy semantics, token-budget runtime order, and profile versioning fields.
- Define shared profile registry contracts and a backend resolver that validates profile schema/hash, binds profiles to invocation slots, and fails closed on missing or drifted profiles.
- Define the shared runtime kernel contract:
  - it owns mechanical policy enforcement, key validation, token-budget preflight, cache/reuse envelope validation, compression report validation, and provenance;
  - it does not own node semantic context construction, preservation rules, or authority writes.
- Define stage adapter/facade contracts:
  - v1a, v1b, v1c, and resource-sampling adapters own workflow-specific context construction and handoff semantics;
  - all adapters delegate key building, token-budget decisions, cache/reuse enforcement, compression report validation, and provenance semantics to the shared runtime kernel;
  - independent stage-owned cache/compression/reuse/token-budget/provenance kernels are forbidden.
- Lock cache classes:
  - context packet cache;
  - prompt packet cache;
  - response reuse cache;
  - artifact/projection cache;
  - durable business memory.
- Define prompt packet identity as the full invocation prompt package, not only the system prompt.
- Define controlled dynamic prompt material for debate/repair/finalization workflows.
- Define prompt-template lint, runtime `PromptQualityReport`, and prompt effectiveness telemetry.
- Define unified runtime audit envelope plus simplified `operator_audit_summary` and `human_trust_summary` projections.
- Define drift blockers for source refs, input hash, policy version, schema version, compiler version, profile hash, model option, execution mode, context family, and redaction policy.

## Phase 1A - Implementation Readiness Gate
- Treat `06-node-scope-matrix.md` as two layers:
  - full slot inventory for coverage and governance;
  - implementation-ready matrix rows for slots that may be wired into runtime behavior.
- Use `08-first-slice-implementation-prep.md` as the file-level implementation preparation plan for the first code slice.
- Promote only v1a N6 rows into the first implementation-ready slice.
- Require first-slice v1a N6 rows to define:
  - registered `ContextPolicyProfile` id/version/hash;
  - prompt variant key and dynamic material refs where applicable;
  - exact token-budget limits and unknown-estimate behavior;
  - compression mode, executor, preserved facts, and quality blockers;
  - context cache key fields and stale miss/block behavior;
  - prompt packet hash inputs and `PromptQualityReport` blockers;
  - response reuse permission and approval requirements;
  - audit envelope/projection expectations;
  - focused contract, unit, and harness tests.
- Begin implementation with shared contracts/schema tests and runtime primitives before any node wiring.
- Historical first-slice stance: resource sampling, v1b, and v1c runtime wiring were deferred until their rows were promoted to implementation-ready status; later D20-D32 sections record the promoted rows.

## Phase 1B - Contract-First Slice
- Status: done for shared contracts and schema tests.
- Added shared runtime contracts for profile registry, context cache key/result, token-budget gate, compression report, prompt packet identity, prompt quality, exact response reuse provenance, runtime audit envelope, and audit projections.
- Added schema tests for first-slice contract blockers before backend runtime or node wiring.
- Backend registry/key, token-budget, and context-cache primitives are now complete; reuse/audit primitives remain next.

## Phase 1C - Backend Registry And Key Primitive Slice
- Status: done for first-slice registry and key builders.
- Added hardcoded v1a N6 `ContextPolicyProfile` defaults and resolver.
- Added fail-closed validation for profile schema, duplicate profile/slot ids, provider live-call policy drift, compression quality drift, cache-key field drift, forbidden payload class drift, preserved fact drift, version mismatch, slot mismatch, and expected profile hash drift.
- Added stable context packet cache key and prompt packet identity builders.
- Verified key hashes change on slot, context family, profile, model option, prompt variant, and dynamic material hash changes.
- No node wiring, provider call changes, or persistence changes were introduced.

## Phase 1D - Backend Token Budget Primitive Slice
- Status: done for the first-slice estimator and token-budget gate service.
- Added the deterministic local `ConservativeTokenEstimator`.
- Added a token-budget gate service that emits schema-validated `within_budget`, `requires_compression`, `blocked_over_budget`, and `budget_unknown_allow_with_warning` decisions.
- Gate decisions use the slot `ContextPolicyProfile` token-budget policy, compression policy, safety margin, output budget, context window, and unknown-estimate behavior.
- Over-budget provider execution is not wired yet; this slice only provides the reusable primitive and tests.
- No `AgentOrchestrator` wiring, provider call changes, persistence fields, provider config, or provider canaries were introduced.

## Phase 1E - Backend Context Packet Cache Primitive Slice
- Status: done for the first-slice context packet cache service boundary.
- Added an artifact-ref-only context packet cache store/service.
- Exact cache-key hits return the existing artifact ref and artifact hash through the shared result envelope.
- Stale entries return `blocked_stale` or `miss` according to the slot `ContextPolicyProfile`.
- Context-family, profile-hash, schema, redaction, cache-scope, and source-ref drift return `blocked_drift`.
- Put-if-absent recording preserves an existing exact artifact ref and does not store business payloads.
- No node context compiler read-through wiring, persistence fields, provider call changes, or provider canaries were introduced.

## Phase 1F - Production-Shaped Local Runtime Tests
- Status: done for the v1a N6 context compiler cache-read-through local path.
- Added tests using the real v1a N6 context payloads, artifact boundary, in-memory control-plane repository, and runtime context packet cache service.
- Verified repeated compilation of the same N6 attempt reuses existing exploration and arbiter context artifact refs without creating duplicate context artifacts.
- Verified stale or context-family-drifted runtime cache entries block before any context artifact write.
- Kept provider execution mocked/out of scope; this layer proves artifact/cache semantics before live provider canaries.

## Phase 1G - Production-Shaped Token Budget Harness Layer
- Status: done for the v1a N6 single-agent provider path and v1a N6 debate slots.
- Added optional runtime token-budget input to `AgentOrchestrator` and evaluates the resolved `ContextPolicyProfile` before source execution.
- Over-budget provider invocations block before `BackendLlmGateway.createStructuredOutput`, emit audit/blocker codes, and preserve provider provenance fields without pretending a live call happened.
- v1a N6 adapter now binds the first-slice need-candidate-generation profile and passes the gate input for single-agent generation.
- v1a N6 debate loop slots now bind their own first-slice context runtime profiles before each explorer, critic, issue-framing, and final-synthesis invocation.
- Added focused tests proving over-budget N6 provider fixtures have provider call count `0` and do not write ranked draft artifacts.
- Token-budget gate results are now included in invocation result/audit snapshots whenever runtime preflight is supplied.
- v1a N6 single-agent compression prompt rewrite is implemented for the first slice; broader slots still block or defer unless they have explicit compression wiring.

## Phase 1H - Backend Compression Runtime Primitive
- Status: done for the compression report and quality-gate primitive plus `AgentOrchestrator` report recording on supplied compression attempts.
- Added a backend compression runtime service that creates schema-validated `TopicSelectionCompressionReportEnvelope` records from a resolved `ContextPolicyProfile`.
- The primitive enforces profile hash, source refs, redaction policy, compression strategy id/version, and allowed executor kinds before report creation.
- The quality gate blocks forbidden persisted payload classes such as hidden reasoning, raw provider logs, credentials, provider secrets, API keys, and unredacted private content.
- The quality gate blocks when compressed fact inventory drops required preserved facts declared by the profile, including blockers, residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, and recheck hints.
- The primitive emits before/after conservative token estimates and warns when compression does not reduce the estimate.
- `AgentOrchestrator` now records `TopicSelectionCompressionReportEnvelope` diagnostic artifacts when token budget requires compression and the caller supplies compressed context/summary material.
- This layer does not yet rewrite v1a N6 prompt/context messages or route compressed context into a live provider retry; that remains a node compiler integration step.

## Phase 1I - Production-Shaped WorkflowHarness Token Gate Verification
- Status: done for the v1a N6 single-agent provider over-budget harness path.
- `TopicSelectionWorkflowHarnessGenerateNeedCandidateInput` now accepts runtime token-budget overrides and includes them in the generate-need-candidate replay/hash identity.
- The harness passes runtime token-budget overrides into the v1a N6 adapter so production-shaped scenarios can exercise the same `AgentOrchestrator` preflight path as adapter tests.
- Added a WorkflowHarness provider fixture proving an over-budget N6 attempt blocks before gateway execution, does not write ranked/admission/routing artifacts, and does not create NeedCandidate authority records.
- This is still local provider-shaped verification using the existing fake gateway; OpenAI/DashScope live canaries remain a later explicit step.

## Phase 1J - v1a Runtime/Harness Boundary Lock
- Status: implemented for N6 runtime context-cache binding extraction; N5/N7/N8 review remains a follow-up guardrail, not a production blocker for the current v1a closure boundary.
- v1a node runtime adapters/context compiler facades are the SSOT for node-level execution semantics:
  - context construction and context-family binding;
  - prompt/profile/variant/runtime identity binding;
  - cache key material, stale behavior, and compression preserved facts;
  - schema validation, candidate/support admission, routing, and authority-write command shape.
- `WorkflowHarness` is the whole-flow controller:
  - N1-N9 ordering;
  - route-policy transitions and handoff routing;
  - replay/idempotency assertions;
  - scenario fixtures, test overrides, traces, and smoke/e2e verification.
- `WorkflowHarness` MAY pass explicit test overrides such as runtime token-budget estimates or mocked provider outputs, but those overrides must enter a node adapter/shared runtime path and must not become a second production semantics path.
- v1a cleanup backlog:
  - done: move N6 runtime context-cache input construction out of `WorkflowHarness` and into a thin N6 runtime binding facade;
  - review N5/N7/N8 `runtime_token_budget` construction and move any production profile/prompt/context identity semantics into node-specific facades if they grow beyond simple orchestration input assembly;
  - keep harness assertions about cache/reuse/token-budget behavior, but avoid harness-owned prompt/cache/compression/admission formulas;
  - add a boundary regression check that promoted v1a nodes are invoked through node adapters/shared runtime collaborators rather than a harness-local runtime path.

## Phase 2 - Context Packet Cache Runtime
- Add read-through cache lookup for compiled context packets before recording a new artifact. Done for the v1a N6 context compiler local path; broader node/harness rollout pending.
- Ensure cache hits return existing artifact refs and mark `cache_hit=true`. Done for the v1a N6 context compiler local path.
- Treat context packet cache as cross-provider/cross-mode context identity and preprocessing reuse, not provider response reuse.
- Implement the cache as an artifact-ref index: exact keys, hashes, artifact refs, freshness/status, and provenance metadata only. Done for the backend primitive.
- Return standardized cache results: `hit`, `miss`, `blocked_stale`, `blocked_drift`, `bypassed`, or `not_applicable`. Done for the backend primitive.
- Ensure stale keys miss or block according to node policy. Done for the backend primitive.
- Use idempotent put-if-absent behavior when a miss compiles and persists a new context packet artifact. Done for the backend primitive.
- Preserve current artifact boundary behavior and forbid cache hits across context families. Done for the backend primitive and v1a N6 context compiler local path.

## Phase 3 - Token Budget Gate
- Add provider-call preflight in `AgentOrchestrator` or a small runtime collaborator. Done for v1a N6 single-agent provider path; broader node rollout pending.
- Implement the first-slice `ConservativeTokenEstimator` as the only token estimator. Done for the backend primitive.
- Keep provider-aware tokenizers out of scope for the first slice; record provider actual token telemetry for calibration only.
- Estimate prompt/context/schema output budget before `BackendLlmGateway.createStructuredOutput`. Done for v1a N6 single-agent provider path; broader provider paths pending.
- Return typed gate outcomes. Done for the backend primitive:
  - `within_budget`;
  - `requires_compression`;
  - `blocked_over_budget`;
  - `budget_unknown_allow_with_warning`.
- Route `requires_compression` only through node-approved compression strategies. Pending runtime compression integration; first-slice N6 currently blocks instead of invoking a compressor.
- Require every profile to declare output budget and safety margin. Done for the first-slice registry profiles.

## Phase 4 - Compression Runtime
- Implement ref-backed compression layers with compiler version, source refs, hashes, redaction policy, token estimates, and quality-gate status. Done for backend report/quality-gate primitive and v1a N6 single-agent artifact persistence/prompt rewrite; broader node wiring remains pending.
- Support first-slice compression executor kinds:
  - `deterministic_structural` for structural trimming, chunking, ref preservation, and deterministic digests;
  - `codex_assisted` for semantic long-context compression when the slot profile allows it.
- Treat Codex compression as a non-authority artifact-producing executor; profile/runtime owns eligibility, quality gate, provenance, and cache-key behavior. Done for eligibility/report quality primitive; Codex execution path remains pending.
- Keep raw provider logs, hidden reasoning, credentials, and unredacted secrets out of persisted artifacts. Done in backend quality gate for compressed payloads and summaries.
- Add node-specific compression policies for broad exploration context versus strict arbiter/gate context.

## Phase 5 - Exact Response Reuse
- Add exact invocation cache keys for approved replay/Codex-assisted cost-saving paths. Done for the `AgentOrchestrator` Codex cached-exact path; broader response reuse index remains pending.
- Forbid silent provider response reuse in `provider_llm`. Done at `AgentOrchestrator` source execution boundary; provider path still executes live or blocks.
- Forbid cross-provider provider-response reuse; provider responses, provider telemetry, provider-side cache hits, and provider-specific repair results are not business cache targets.
- Keep Codex-assisted, provider-LLM, and mocked execution in one runtime while separating execution provenance and response-reuse permissions.
- Store reusable response payloads as ref-backed artifacts; use the reuse index only for exact keys, response hash, artifact ref, approval/provenance metadata, and freshness/status.
- Require Codex-assisted exact reuse to carry operator approval or explicit local approved-reuse setting plus `non_provider=true`. Done in `AgentOrchestrator` with exact response hash, prompt packet hash, profile hash, and approval/local-setting drift checks.
- Restrict mocked reuse to test/acceptance fixtures with fixture/replay provenance.
- Require reused responses to pass schema validation, deterministic gates, audit recording, and authority-write boundaries.
- Record source workflow/node/attempt, source execution mode, response hash, prompt/context hashes, schema/profile/policy versions, and approval ref. Done for Codex cached-exact reuse through a diagnostic reuse-provenance artifact.

## Phase 5A - Prompt Packet Cache And Quality
- Treat `prompt_packet_hash` as the hash of the complete invocation prompt packet, including slot, role, stage, scenario, template version, context refs/hashes, dynamic material refs/hashes, output contract, model/profile params, runtime modifiers, and redaction policy.
- Store prompt cache/index rows as metadata only: prompt hash, template id/version, variant key, context/dynamic hashes, model/profile params hash, output contract, redaction policy, artifact ref, and provenance. Done for the backend primitive and `AgentOrchestrator` read-through path.
- Persist full prompt payloads only as redacted, ref-backed artifacts when replay/audit/debugging requires them. Done for runtime-enabled `AgentOrchestrator` invocations.
- Require `prompt_variant_key` for complex workflows such as v1a N6 debate roles, v1c bounded debate roles, repair stages, and final synthesis.
- Allow LLM roles to produce dynamic prompt material only as schema-validated, ref-backed artifacts rendered by fixed prompt compilers.
- Add prompt quality gates using static template lint plus runtime `PromptQualityReport`. Done for first-slice runtime prompt preparation.
- Reuse exact prompt packet cache hits only for redacted prompt artifact refs and prompt quality report refs; provider/Codex/mock response execution, schema validation, deterministic gates, and authority boundaries still run.
- Record prompt effectiveness telemetry without allowing it to retroactively change business authority.

## Phase 5B - Invocation Audit And Human Projections
- Emit one append-only `runtime_audit_envelope` for every provider, Codex-assisted, mocked, reuse, cache-hit, and compression-relevant invocation path.
- Include workflow/node/slot/attempt identity, execution mode, executor kind, profile/schema/policy/template/model hashes, context/cache/compression/prompt/token/reuse/schema/gate/authority outcomes, and blocker/warning codes.
- Record provider telemetry only for live provider calls.
- Generate `operator_audit_summary` as a developer/operator projection for debugging and review.
- Generate `human_trust_summary` as a simplified product/human-confirmation projection focused on source refs, risks, gaps, recheck hints, live/non-provider labeling, deterministic gate status, and human confirmation.
- Require every projection to reference the source audit envelope ref/hash and forbid projections from rewriting decisions or becoming business authority.

## Phase 6 - Node Integration
- Use v1a N6 as the first deep integration chain.
- Integrate policies into:
  - resource sampling;
  - v1a N5/N6/N7/N8;
  - v1b semantic draft/support nodes, with v1b N7 treated as a core topic-question-contract context hub;
  - v1c promotion support and feedback normalization;
  - downstream recheck/feedback normalization where model-like execution exists.
- Ensure direct `BackendLlmGateway` callers move behind a runtime provider wrapper before provider execution.
- Ensure external artifact admission paths use runtime validation/provenance/reuse policy without triggering provider execution.
- Avoid node-local cache semantics outside shared contracts.

## Phase 6A - First Deep Slice: v1a N6
- Integrate the shared runtime with v1a N6 single-agent and debate slots only after the first-slice readiness gate passes.
- Production-shaped local cache tests are in place for the context compiler before provider/harness wiring.
- Implement shared contracts and schema tests first:
  - `ContextPolicyProfile` registry contract;
  - context cache result envelope;
  - token-budget gate result;
  - compression report envelope;
  - prompt packet identity and `PromptQualityReport`;
  - exact response reuse provenance and approval fields;
  - runtime audit envelope and projections.
- Implement backend runtime primitives next:
  - profile registry skeleton with hardcoded TypeScript defaults;
  - shared key builders;
  - `ConservativeTokenEstimator`;
  - token-budget gate service;
  - context packet cache read-through interface;
  - response reuse policy skeleton;
  - audit envelope/projection builders.
- Validate `invocation_slot_id` isolation across single-agent, explorer, deep critic, arbiter issue framing, and arbiter final synthesis.
- Validate `exploration_context` cannot satisfy `arbiter_context`, and stale context family/source/profile drift misses or blocks.
- Validate Codex-assisted compression for long exploration context only when the profile allows it, with quality gate enforcement before provider/Codex/mock invocation.
- Validate deterministic structural compression for the first v1a N6 single-agent path: done with adapter and WorkflowHarness provider-shaped tests.
- Validate cache/reuse hits still run schema validation, candidate admission, persistence gates, and authority write boundaries.
- Historical Phase 6 scope deferred resource sampling, v1b, and v1c direct-provider paths until their implementation-ready rows were expanded; D20-D32 now record the promoted rows.

## Phase 7 - Verification And Cleanup
- Add contract, unit, HTTP, harness, and provider canary tests.
- Delete or retire any node-local cache markers that become redundant.
- Run governance sync/lint and record results in `04-verification.md`.

## Next Phase 3 - v1c Runtime Landing

### D28 Alignment Track Before Implementation
- D28-A promoted v1c runtime scope:
  - promote v1c N2 bounded micro-debate role slots into the T-112 runtime surface;
  - promote v1c N6 downstream feedback normalization into the T-112 runtime surface;
  - keep v1c N3 gate diagnostic adjunct and N4 delegated-promotion provider surfaces as provider-canary-only for this phase;
  - historical D28 scope kept resource sampling out of the v1c closure phase; D32 later promoted `resource_classification.batch` through a separate runtime-promotion phase.
- D28-B runtime / node-adapter / harness responsibility boundary:
  - shared runtime owns context/cache/compression/memory/token/reuse/audit execution semantics;
  - v1c node adapters/admission services own node semantic context compilation, required fact inventories, output admission, deterministic gate handoff, and authority boundaries;
  - WorkflowHarness owns orchestration, fixtures, replay/stress/drift cases, and evidence assertions only.
- D28-C N2 bounded micro-debate canonical shape:
  - fixed slots are `n2_bounded_micro_debate.promotion_supporter_draft`, `n2_bounded_micro_debate.reviewer_critic_review`, `n2_bounded_micro_debate.promotion_supporter_repair`, and `n2_bounded_micro_debate.synthesizer_final`;
  - bounded micro-debate is the canonical T-112 v1c N2 runtime path; the existing single `promotion_support_generation.llm_draft` path remains compatibility/transition support and is not the v1c runtime closure path;
  - all four role slots must pass through the shared runtime for context memory, context/prompt cache, token-budget, compression, response-reuse guard, provider telemetry separation, and audit/provenance;
  - only `synthesizer_final` may enter the N2 advisory output contract consumed by N3;
  - intermediate role artifacts remain diagnostic/support context only;
  - Codex/mock exact role-output reuse is allowed only with non-provider provenance, approval or local approved-reuse setting, exact prompt packet/profile/prior-role hash match, and full schema/admission rerun;
  - `provider_llm` role outputs must be live calls and cannot be satisfied by historical response reuse.
- D28-C1 N2 context/memory/compression policy:
  - v1c N2 adapters compile one frozen base context packet from the N1 `PromotionInputSnapshotHandoff`; runtime may add only profile-approved memory manifests and must not re-read mutable v1b/package state;
  - base context must preserve promotion input snapshot, package/question/contract identity, answerability plan, selected evidence, claim ceiling, contribution summary, evaluation plan, accepted risks, blockers, recheck obligations, memory suggestions, and source-health warnings;
  - role dynamic material binds prior role artifact refs/hashes only and cannot override templates, output contracts, authority boundaries, cache/reuse policy, compression policy, or provider-required-live semantics;
  - N2 compression must preserve claim ceiling, evidence refs/support map, topic question/contract identity, answerability plan, contribution/evaluation summaries, risks, blockers, recheck obligations, critic findings/resolution map, readiness coverage items, allowed-ref manifest, and source-health warnings;
  - N2 context memory is limited to accepted/residual risk, blocker, source-health warning, recheck hint, memory suggestion, and decision-memory context; memory never becomes standalone promotion authority and cannot override N1 frozen facts.
- D28-D N6 downstream feedback normalization:
  - LLM/Codex/provider output is only a normalized candidate;
  - deterministic N6 service remains the only place that can record downstream feedback and open recheck work;
  - malformed, stale, drifted, or improperly reused normalized candidates must block before any recheck side effect;
  - N6 admission must verify active bridge handoff identity, downstream source refs, source feedback allowlist, feedback signal/severity, required action for recheck-producing signals, forbidden mutation fields, and prompt/profile/runtime/source hash binding;
  - feedback signal routing, loopback target selection, affected-ref resolution, and affected-stage labels must live in a single downstream feedback policy shared by admission and deterministic recheck creation; harnesses may assert outcomes but must not duplicate these formulas;
  - N6 compression must preserve bridge identity, promotion decision and commitment refs, promotion input snapshot ref, downstream source ref, source feedback refs, feedback signal, required action, affected ref or loopback target hint, severity, no-upstream-mutation boundary, and allowed-ref manifest;
  - N6 `recheck_opened` records typed recheck work and resume hints only; it must not trigger N1-N5 automatically.
- D28-E cache and compression persistence boundary:
  - keep context packet cache artifact-ref-only and process-local/runtime-owned for this phase;
  - keep Prisma-backed prompt packet index as the only persistent cache index;
  - reassess DB-backed context packet cache only after v1c runtime stress and resource-sampling rollout evidence.
- D28-F verification ladder:
  - follow the existing T-112 layering: L1 profile/key/schema/admission unit tests, L2 node adapter/harness policy tests, L3 Prisma smoke, L4 provider slot canaries, L5 long-context/adversarial compression tests, and a final v1c runtime stress wrapper.
- D28-G v1c runtime service/code placement:
  - add a production-shaped `TopicSelectionV1cN2BoundedDebateRuntimeService` for the four N2 role invocations;
  - add a `TopicSelectionV1cN2BoundedDebateAdmissionService` or tightly scoped helper that validates role order, prior-role hashes, allowed refs, forbidden fields, final semantic layer, and critic resolution map before producing admitted N2 support/dossier input;
  - add a production-shaped `TopicSelectionV1cN6FeedbackNormalizationRuntimeService` for normalized feedback candidate generation;
  - add a `TopicSelectionV1cN6FeedbackNormalizationAdmissionService` that validates bridge/source/reuse/compression/provenance/hash binding before calling `TopicSelectionV1cDownstreamFeedbackRecheckService`;
  - v1c harness and scripts call these services and remain orchestration/evidence layers, not owners of provider/Codex prompts, cache keys, compression, admission, or side-effect formulas.
- D28-H v1c slot/profile naming:
  - N2 slot ids are `n2_bounded_micro_debate.promotion_supporter_draft`, `n2_bounded_micro_debate.reviewer_critic_review`, `n2_bounded_micro_debate.promotion_supporter_repair`, and `n2_bounded_micro_debate.synthesizer_final`;
  - N2 context profile ids are `topic-selection.v1c.n2.bounded-debate.supporter-draft.context-runtime@v1`, `topic-selection.v1c.n2.bounded-debate.reviewer-critic.context-runtime@v1`, `topic-selection.v1c.n2.bounded-debate.supporter-repair.context-runtime@v1`, and `topic-selection.v1c.n2.bounded-debate.synthesizer-final.context-runtime@v1`;
  - N2 context family is `v1c_n2_bounded_promotion_support`; role separation is carried by slot id, prompt variant, runtime invocation context hash, and dynamic material refs/hashes;
  - N2 model profile id is `topic-selection.v1c.promotion-support.bounded-micro-debate.v1`; v1c provider canaries must exercise this production runtime profile through `TopicSelectionProviderCanaryService`, not a separate provider-canary-only profile;
  - all four N2 role profiles use `support_only_semantic`;
  - N6 slot id is `downstream_feedback_normalization`, profile id is `topic-selection.v1c.n6.downstream-feedback-normalization.context-runtime@v1`, context family is `v1c_n6_downstream_feedback_normalization`, model profile id is `topic-selection.v1c.downstream-feedback-normalization.v1`, and the runtime profile uses `candidate_for_deterministic_gate`.
- D28-I implementation and verification order:
  - start with registry/contracts before service wiring: add `v1c_n2_bounded_promotion_support`, N2 four context profiles, N2 canonical model profile, N6 runtime/model profiles, and profile/schema tests for hash, slot mismatch, context family, preserved facts, and post-cache gates; done 2026-06-01;
  - implement N2 runtime/admission L1 next using mocked/Codex-response inputs before provider wiring; done 2026-06-02;
  - add N2 L2/L3 harness/Prisma smoke after L1 passes, proving prompt-index metadata-only behavior, support/gate replay, drift blocking, and no N3 authority bypass; done 2026-06-02 via `pnpm topic-selection:v1c-harness-acceptance` and `pnpm topic-selection:v1c-n2-runtime-smoke`;
  - add N2 L4/L5 provider slot canaries and long-context/adversarial compression blockers; done 2026-06-02;
  - implement N6 runtime/admission after N2 stabilizes, focusing on malformed/stale/reused candidate blocking before feedback/recheck side effects; L1 shared contract/runtime/admission slice done 2026-06-02;
  - add N6 L2/L3 harness/Prisma smoke after L1 passes, proving v1c harness calls through runtime/admission, prompt-index metadata-only behavior, feedback/recheck replay, prompt drift blocking, and no upstream side-effect bypass; done 2026-06-02 via `pnpm topic-selection:v1c-harness-acceptance` and `pnpm topic-selection:v1c-n6-runtime-smoke`;
  - remove N6 admission/recheck dual-track loopback and affected-ref policy before L4/L5 expansion; done 2026-06-02 with one canonical downstream feedback policy and missing-lineage admission blocking;
  - add N6 L4/L5 provider slot canary and long-context/adversarial compression blockers after L3 stabilizes; done 2026-06-02 through `TopicSelectionProviderCanaryService` production runtime slot coverage and shared compression-runtime adversarial tests;
  - close the runtime layer with `pnpm topic-selection:v1c-runtime-stress` combining N2/N4/N6 runtime smokes, prompt-index assertions, provider canary local smoke, harness acceptance, and no side-effect bypass checks; done 2026-06-02;
  - run production-depth after runtime closure with `pnpm topic-selection:v1c-production-depth`; done 2026-06-02. This adds higher iteration count, concurrent runtime stress, prompt-index first-writer race, provider profile drift guards, retention/cleanup observation, focused runtime/compression/admission unit tests, and local provider slot canary coverage. It remains a pressure/governance layer and does not restore full-chain provider harness semantics.
- D28-J minimum landable first slice:
  - first implementation slice is registry/contracts foundation only;
  - include `v1c_n2_bounded_promotion_support` in shared runtime context families;
  - add N2 four bounded-debate context profile ids/slot ids and registry rows;
  - add N2 canonical bounded micro-debate model profile;
  - add N6 downstream feedback normalization context/model profiles as registry foundation only, without service wiring;
  - add or update schema/profile tests for N2/N6 profile resolution, profile hash stability, slot/profile mismatch blocking, context family binding, preserved fact coverage, provider-live response-reuse blocking, and post-cache/post-reuse gates;
  - do not create N2/N6 runtime services, do not wire harness/scripts, do not change provider canaries, do not add migrations, and do not introduce DB-backed context packet cache in this slice.

## Next Phase 1 - v1a Runtime Closure Pack

### Objective
- Freeze the current v1a T-112 implementation as the reference baseline before promoting v1b/v1c rows.
- Close the v1a scope at the level of tests, docs, verification evidence, usage guidance, and commit grouping.
- Make the next handoff explicit: v1b N7 can start only after the v1a runtime closure pack has passed its exit criteria.

### Scope
- Include the v1a runtime policy stress tests:
  - N1/N2/N3/N4 deterministic context producer and N9 publish-boundary stress;
  - N5/N6/N7/N8 LLM runtime gate stress;
  - N6 context-cache hit/drift/stale stress.
- Include the Prisma-backed v1a runtime stress runner:
  - `pnpm topic-selection:v1a-runtime-stress`;
  - single-agent and multi-agent-debate modes;
  - prompt packet index growth/slot distribution checks;
  - exact replay and input-hash drift LLM call-count checks.
- Include documentation updates for usage, verification evidence, pitfalls, and acceptance status.
- Include commit grouping for the completed v1a closure work.

### Non-Scope
- Do not add new DB schema or migrations.
- Do not add live provider calls to the runtime stress runner.
- Do not promote v1b/v1c runtime wiring in this phase.
- Do not implement a persistent DB context packet cache index in this phase.
- Do not change provider routing, model registry, prompt templates, or provider credentials.

### Work Packages
- P1.1 Diff and implementation review:
  - review current v1a stress tests and runtime stress runner for duplicate runtime semantics, local cache-key formulas, response-reuse ambiguity, provider SDK bypass, hidden provider calls, and authority-boundary drift;
  - confirm the runner only uses existing `AgentOrchestrator -> BackendLlmGateway` harness paths and existing Prisma-backed app wiring.
- P1.2 Usage documentation:
  - document `pnpm topic-selection:v1a-runtime-stress`;
  - document required env assumptions: local/dev `.env.local`, migrated local/dev Prisma DB, balanced T-112 sample fixture, no provider credentials required by default;
  - document optional parameters:
    - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_RUN_ID`;
    - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS`;
    - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=single_agent,multi_agent_debate`;
    - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_CHILD_TIMEOUT_MS`.
- P1.3 Verification ladder:
  - run syntax/package checks;
  - run targeted v1a runtime policy stress tests;
  - run the full WorkflowHarness test file;
  - run backend typecheck;
  - run single-agent Prisma-backed runtime stress;
  - run multi-agent-debate Prisma-backed runtime stress;
  - run project governance sync/lint.
- P1.4 Evidence consolidation:
  - keep command/results in `04-verification.md`;
  - ensure `00-overview.md` acceptance items reflect the v1a stress coverage;
  - keep pitfalls focused on historical do-not-repeat lessons, not current TODOs.
- P1.5 Commit grouping:
  - Commit A: v1a WorkflowHarness runtime policy stress coverage and T-112 docs;
  - Commit B: Prisma-backed v1a runtime stress runner, package script, usage/verification docs;
  - optionally squash into one commit only if review prefers a single v1a closure changeset.

### Exit Criteria
- Targeted stress command passes with all active v1a stress tests.
- Full `topic-selection-workflow-harness-service.unit.test.ts` passes.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` passes.
- `pnpm topic-selection:v1a-runtime-stress` passes for at least:
  - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_ITERATIONS=2`;
  - `TOPIC_SELECTION_V1A_RUNTIME_STRESS_MODES=single_agent`;
  - one multi-agent-debate run.
- Runtime stress evidence proves:
  - exact replay LLM call delta is `0`;
  - input-hash drift LLM call delta is `0`;
  - prompt packet index records expected N6/N7 slot rows;
  - no live provider call is required by default.
- `git diff --check` passes for touched files.
- Project governance sync/lint passes.
- The final diff is ready to commit without unresolved implementation findings.

### Risks And Mitigations
- Risk: local/dev DB stress leaves diagnostic records.
  - Mitigation: treat records as local verification artifacts; do not run against shared production DB; use explicit run ids and artifact dirs.
- Risk: stress runner is mistaken for provider canary.
  - Mitigation: docs and pitfall state it defaults to deterministic mocked LLM execution and does not spend provider budget.
- Risk: prompt packet index rows grow across repeated local stress runs.
  - Mitigation: Phase 1 records this as acceptable local/dev evidence; retention/cleanup policy is deferred to a later persistence-governance decision.
- Risk: v1a closure work delays v1b promotion.
  - Mitigation: keep Phase 1 limited to review, docs, verification, and commit grouping; no new runtime feature scope.

### Handoff Gate To v1b
- v1b N7 implementation preparation may start after Phase 1 exit criteria pass and the v1a closure commits are staged or explicitly accepted as a single pending changeset.
- The first v1b step should promote v1b N7 rows in `06-node-scope-matrix.md` from inventory to implementation-ready, then define the v1b N7 `ContextPolicyProfile`.

## Next Phase 2 - v1b N7 Runtime First Slice

### Objective
- Promote v1b N7 as the first post-v1a runtime rollout slice.
- Treat v1b N7 as a context hub, support-artifact admission surface, and deterministic topic-question-contract authority gate.
- Add T-112 runtime admission, prompt identity, token-budget, compression, provenance, and replay controls without rewriting the N7 deterministic authority logic.

### Scope
- Include v1b N7 support slots:
  - `n7_candidate_grouping`;
  - `n7_failed_trial_synthesis`;
  - `n7_n8_debate_admission_review`.
- Include N7 context-hub packet/admission behavior for:
  - frozen N7 input;
  - candidate set and candidate hashes;
  - N6 handoff;
  - topic frame and workflow run context;
  - optional N8 feedback;
  - admitted semantic support artifact refs and hashes.
- Include N7->N8 and N7->N6 loopback handoff refs/hashes as runtime-auditable outputs.
- Treat N7 outputs as route-specific runtime context projections:
  - `v1b_n7_to_n8_topic_question_contract_context` for the existing `N7ToN8Handoff@v1` forward path;
  - `v1b_n7_to_n6_failed_trial_loopback_context` for N7 candidate-trial exhaustion and N6 regeneration/triage input.
- Treat N7 support-slot inputs as one runtime context family for this slice:
  - `v1b_n7_topic_question_hardening`;
  - slot separation is enforced by `invocation_slot_id`, prompt variant, profile hash, frozen input hash, and support artifact identity.
- Include prompt packet identity validation for admitted/generated support artifacts.
- Include token-budget preflight and compression report validation for support generation/admission paths that use LLM-like execution.

### Non-Scope
- Do not promote v1b N4, v1b N6, or v1b N8 in the same slice.
- Do not add a DB-backed context packet cache index in this slice.
- Do not make N7 support artifacts authority records.
- Do not allow prompt packet cache hits or response reuse to skip N7 deterministic gates.
- Do not add new provider secrets, provider registry entries, or desktop UI changes.

### Implementation Checklist
- I0 Readiness preflight:
  - keep D19-D23 locked as the first-slice scope;
  - treat v1b N7 as ready for L1/L2 implementation preparation only, not runtime promotion;
  - specify L1 unit/contract and L2 harness policy cases before wiring production/provider support generation.
- I1 Shared support artifact contract: done for the first N7 admission slice.
  - extend the v1b semantic support artifact envelope with `runtime_provenance_class`;
  - add runtime identity fields for current promoted-slot admission: context policy profile id/version/hash, prompt variant key, runtime invocation context hash, redaction policy, source hash bundle, runtime audit ref/hash, compression report ref/hash, and compressed context hash;
  - keep `fixture_replay` as the only class allowed to carry synthetic or placeholder runtime identity;
  - update shared schema tests and harness request validation so production/provider/Codex admission fails closed on missing or placeholder runtime identity.
- I2 v1b N7 `ContextPolicyProfile` registry: done for the first N7 admission slice.
  - add constants for the three N7 profiles:
    `topic-selection.v1b.n7.candidate-grouping.context-runtime@v1`,
    `topic-selection.v1b.n7.failed-trial-synthesis.context-runtime@v1`,
    `topic-selection.v1b.n7.n8-debate-admission-review.context-runtime@v1`;
  - bind each profile to `v1b_n7_topic_question_hardening`, its invocation slot id, output contract, D21 executor policy, D19 preserved facts, exact cache key fields, stale/drift behavior, and non-authority support provenance;
  - add registry tests for successful resolution, unknown profile, slot/profile mismatch, profile hash drift, disallowed provider compression, and profile-disallowed `codex_assisted` compression.
- I3 N7 runtime support admission helper: done for the first N7 admission slice.
  - introduce a dedicated admission service/helper before N7 deterministic gates;
  - distinguish absent optional support, absent conditionally required support, and malformed present support;
  - verify normalized output ref/hash, structured output hash, payload hash, support artifact hash, profile hash, prompt packet hash, runtime invocation context hash, source hashes, output contract, prompt variant, redaction policy, provenance class, and compression identity;
  - emit D23 blocker codes and return only non-authority admitted support context.
- I4 N7 context packet and route projection builder: partially done.
  - compile/admit a ref-backed N7 context packet from frozen input, N6 handoff, candidate set/order/hash list, topic frame, workflow run context, optional N8 feedback, and admitted support refs;
  - keep context packet cache process-local/runtime-only for this slice;
  - emit route-specific runtime context projections for `v1b_n7_to_n8_topic_question_contract_context` and `v1b_n7_to_n6_failed_trial_loopback_context` without creating new authority. Done for diagnostic control-plane artifacts and trace refs on the N7 forward/readmission and N7-to-N6 failed-trial loopback paths.
  - Reusable support-generation context compilation is now implemented inside `TopicSelectionV1bN7SupportRuntimeService`; process-local context packet read-through caching remains pending and is intentionally not promoted as a DB-backed context cache surface.
- I5 Runtime-backed semantic support generation: done for the first Codex/mocked N7 support path.
  - add a v1b N7 semantic support adapter that owns slot selection, context compilation, prompt variant selection, and output contract selection. Done in `TopicSelectionV1bN7SupportRuntimeService`;
  - delegate prompt packet runtime/cache, token-budget preflight, compression report validation, provider-required live-call guard, response-reuse guard, provider telemetry separation, and runtime audit to `AgentOrchestrator` or an equivalent shared runtime facade. Done for `codex_assisted` and `mocked_llm`; `provider_llm` remains profile-disallowed for N7 support slots;
  - ensure generated support artifacts are emitted as `runtime_verified` only after runtime identity, output hash, and quality gates pass. Done for generated N7 support artifacts.
- I6 N7 harness integration: done for the promoted N7 support path.
  - replace promoted-slot direct support consumption with the runtime admission helper while keeping deterministic N7 candidate selection, trial ledger, N8 admission, loopback routing, and persistence gates unchanged;
  - classify legacy direct script/provider artifacts as `legacy_unverified` diagnostics only during migration. Promoted N7 support script paths no longer use direct support artifact writers;
  - keep fixture helpers on `fixture_replay` and prevent fixture prompt hashes from entering real prompt packet cache rows.
- I7 L1/L2 verification: done for the v1b N7 first slice.
  - L1 must cover profile resolution/drift, runtime identity schema, admission class handling, prompt/cache key drift, compression preserved facts, provider compression block, and response-reuse/provider-live guards;
  - L2 must cover exact replay with zero LLM-like reinvocation, frozen input drift, support hash drift, optional absent versus malformed present support, required support missing, compression fact drop, and no authority bypass.
- I8 L3 local/dev smoke: done for the v1b N7 first slice.
  - add a Prisma-backed v1b N7 smoke covering N6->N7->N8 forward path, N8->N7 readmission, N7->N6 failed-trial loopback context projection, prompt index metadata-only behavior, and provider response non-reuse;
  - record prompt packet index deltas and runtime audit/provenance refs for each support slot.
- I9 Legacy exit: done for promoted v1b N7 support generation paths after L1-L3 pass.
  - after runtime-backed N7 support generation/admission L1-L3 pass, remove promoted-slot direct provider/script generation paths rather than soft-disabling them;
  - keep only fixture or migration diagnostics outside promoted-slot admission;
  - block v1b N4/N6/N8 runtime expansion until N7 L1-L3, minimum L5, and legacy exit are complete. N7 L1-L3 and legacy exit are complete; minimum L5 coverage remains the next expansion gate.
- I10 Documentation and governance:
  - update `03-implementation-notes.md` after each implementation slice;
  - record commands and outcomes in `04-verification.md`;
  - keep `06-node-scope-matrix.md` and `07-acceptance-matrix.md` synchronized with runtime behavior;
  - run project governance lint after doc or task-state changes.

### Decision Gates
- D19 is locked for v1b N7 first-slice planning:
  - v1b N7 proceeds first without promoting v1b N4/N6/N8;
  - N7 support inputs use `v1b_n7_topic_question_hardening`;
  - N7 outputs use the two route-specific runtime context projections listed above;
  - `n7_candidate_grouping`, `n7_failed_trial_synthesis`, and `n7_n8_debate_admission_review` have locked per-slot input refs, cache identity fields, memory inclusion, compression preserved facts, and blocker behavior in `06-node-scope-matrix.md`.
- D23-A is locked: production/provider/Codex v1b N7 semantic support generation must pass through the shared T-112 runtime boundary via `AgentOrchestrator` or an equivalent shared runtime facade; direct `BackendLlmGateway` support generation is not T-112-compliant for promoted slots.
- D23-B is locked: frozen or externally produced v1b N7 support artifacts may be admitted only through runtime admission before deterministic gates, with slot/profile/prompt/runtime/source/provenance hashes verified; successful admission yields non-authority support context only.
- D23-C is locked: support artifacts must be machine-classified as `runtime_verified`, `fixture_replay`, or `legacy_unverified`; production admission requires `runtime_verified`, fixture placeholders are allowed only as `fixture_replay`, and `legacy_unverified` artifacts are migration diagnostics only.
- D23-D is locked: support artifact admission fails closed before deterministic gates; optional support may be absent, but malformed/drifted/legacy/provenance-incomplete present artifacts block, and conditionally required support blocks when absent on its required path.
- D23-E is locked: legacy direct provider/script support-generation paths are transitional only. After the runtime-backed N7 support path and replacement tests pass, promoted-slot legacy generation must be removed and fully exit the promoted-slot path to avoid long-term dual-track semantics.
- D20 is locked for v1b N7 first slice: do not add a DB-backed context packet cache index. N7 uses artifact refs/hashes, prompt packet persistent index, and process-local/runtime context cache only; context packets and output projections remain rebuildable acceleration/audit artifacts, not authority.
- D21 is locked: v1b/v1c rollout defaults to `deterministic_structural` compression; `codex_assisted` is allowed only when the slot profile explicitly permits semantic long-context compression and the output remains non-authority, ref-backed, hash-checked, and quality-gated; provider LLM compression is disallowed by default. For v1b N7, all three support slots use this policy and must preserve their D19-locked candidate, failure, feedback, risk/gap/recheck, handoff, and blocker facts.
- D22 is locked for v1b N7: verification is layered into L1 unit/contract, L2 harness policy stress, L3 Prisma-backed local/dev runtime smoke, L4 executor/canary checks, and L5 adversarial/long-context stress. Implementation may begin after L1/L2 cases are specified; legacy exit requires L1-L3 pass; v1b N4/N6/N8 expansion requires N7 L1-L3 plus minimum L5 coverage.

### Exit Criteria
- The D19-approved v1b N7 rows are represented in `06-node-scope-matrix.md`.
- v1b N7 runtime profiles resolve and fail closed on profile/hash/slot drift.
- N7 support-artifact admission blocks drifted/legacy/fixture-in-product support artifacts; conditionally required route-level support checks remain part of the broader L2/L3 slice.
- Runtime-backed N7 support generation emits `runtime_verified` artifacts through `AgentOrchestrator`; prompt identity validation rejects placeholder prompt hashes outside explicit test fixtures.
- Exact replay and drift-negative harness tests show zero LLM-like reinvocation.
- Prisma-backed v1b N7 runtime smoke records prompt index metadata for all three N7 support slots and verifies non-provider, non-response-reuse runtime audit provenance.
- Promoted v1b N7 support generation scripts no longer use direct support artifact writers; runtime support generation is the only promoted path.
- N7 deterministic gates still own topic-question-contract authority writes after cache/reuse/compression paths.
- Documentation and verification evidence are updated before moving to v1b N4/N6/N8.

## Next Phase 3 - v1b N6/N8/N4 Runtime Expansion

### Entry Status
- v1b N7 first slice is complete for L1-L3, promoted-slot legacy exit, and minimum adversarial quality coverage.
- The next rollout step corresponds to the T-112 implementation Phase 2: expand runtime coverage around the N7 context hub without introducing a second context-cache persistence surface.
- D20 remains in force: do not add a DB-backed context packet cache index during this expansion.

### D24 Alignment Track Before Implementation
- D24-A promoted scope: decide which v1b N6 slots become implementation-ready in the first N6 slice.
- D24-B N5->N6 initial generation: align authority input, runtime context identity, draft admission, provenance class, execution modes, and legacy exit.
- D24-C N7->N6 fallback regeneration: align how `v1b_n7_to_n6_failed_trial_loopback_context` enters N6 as non-authority runtime context.
- D24-D N6->prior-node fallback: align `n6_loopback_triage`, debate escalation, and rollback-to-N5 behavior without creating candidate authority.
- D24-E N6 internal orchestration: align runtime generation/admission order, deterministic gate order, authority write order, and handoff emission.
- D24-F cache/compression/replay boundaries: align prompt packet identity, context packet scope, preserved facts, exact replay, and provider non-reuse.
- D24-G verification and legacy exit: align L1/L2/L3/L5 coverage and removal of promoted-slot direct generation paths.

### D24-A Accepted Scope
- First implementation slice promotes only `n6_question_candidate_draft` with generation mode `initial_from_n5`.
- `n6_loopback_triage` is documented as support-only guarded/planned behavior, but is not mandatory in the first implementation slice.
- `regeneration_after_n7_loopback`, `regeneration_after_n6_gate_failure`, and provider canary paths remain later slices.
- Matrix promotion is limited to the first-slice `n6_question_candidate_draft.initial_from_n5` row.
- Provider canary evidence is not required before starting implementation; it follows after Codex/mocked runtime identity, admission, replay, prompt-index, and deterministic-gate boundaries are stable.

### D24-B Accepted Direction
- Initial N5->N6 generation keeps `N5ToN6Handoff@v1` as the only authority input.
- `n6_question_candidate_draft` may generate or admit `TopicQuestionCandidateSetDraft@v1` through the shared runtime, but it does not create candidate authority.
- N6 deterministic gates still own schema validation, source/ref/hash validation, answerability checks, candidate admission, authority writes, and `N6ToN7Handoff@v1` emission.
- Initial generation uses `v1b_n6_topic_question_generation` and generation mode `initial_from_n5`.
- Prompt/cache identity for the initial path includes the frozen input hash, `n5_handoff_hash`, selected research slice ref/hash, option-set ref/hash, selected-option ref/hash, selection-decision ref/hash, constraint/readiness refs/hashes, prompt variant, output contract, profile id/version/hash, model/runtime params hash, and redaction policy.
- N6 draft artifacts should use the same machine-readable provenance classes as N7 support artifacts: `runtime_verified`, `fixture_replay`, and `legacy_unverified`.
- First implementation should prefer `codex_assisted` and `mocked_llm`; provider canary can follow after runtime identity, admission, replay, and gate boundaries are stable.
- Complexity assessment: D24-B is medium-high but controllable as an isolated slice. It should not be implemented together with N7->N6 fallback regeneration or N6->prior-node fallback.

### D24-C Accepted Direction
- N7->N6 fallback regeneration has high overlap with existing WorkflowHarness behavior and should reuse it rather than introduce a parallel workflow.
- The existing harness remains responsible for N7 candidate-trial exhaustion, post-authority-write loopback projection recording, N6 frozen lineage validation, N6 deterministic candidate gates, authority writes, and `N6ToN7Handoff@v1`.
- T-112 adds only the runtime generation/admission layer for the N6 draft when regeneration needs LLM-like work.
- Regeneration uses the same `n6_question_candidate_draft` slot with generation mode `regeneration_after_n7_loopback`.
- The `v1b_n7_to_n6_failed_trial_loopback_context` projection remains non-authority runtime context and must participate in prompt/cache identity, compression preserved facts, and runtime audit.
- Promoted-slot direct frozen semantic draft generation must exit after replacement tests pass; fixture replay can remain explicitly classified as fixture-only.

### D24-D Accepted Direction
- `n6_loopback_triage` is a support-only runtime slot for N6 failure routing, not a default mandatory LLM step.
- Simple candidate/question-frame failures may use deterministic fallback without invoking triage.
- Runtime triage is allowed when N6 needs failure attribution, debate escalation advice, or rollback-to-N5 advice.
- Triage may provide failure scope, dominant reason codes, affected refs, regeneration hints, debate escalation advice, and upstream rollback advice.
- Triage must not create candidates, directly select a new slice, rewrite N5 selection, emit `N6ToN7Handoff@v1`, or create downstream recheck authority.
- Malformed or drifted present triage support blocks; absent optional triage falls back to conservative deterministic routing.

### D24-E Accepted Direction
- v1b N6 runtime design targets node orchestration, not a harness-specific workflow.
- The node-level runtime adapter is the SSOT for N6 slot/profile/mode binding, context compilation, shared runtime invocation, runtime-verified draft creation, and admission expected identity.
- `WorkflowHarness` must call and verify the node adapter; it must not define independent cache, context, compression, admission, prompt identity, or authority semantics.
- N6 internal order is frozen authority input validation, generation-mode selection, non-authority runtime context loading, runtime context packet compilation, prompt/cache/token/compression/audit runtime, draft admission, deterministic gate, authority write, then `N6ToN7Handoff@v1`.
- Runtime success never equals N6 business success. N6 success requires deterministic gate success, authority persistence success, and successful downstream handoff emission.
- Authority-write failure must not leave a replayable N6 success trace or downstream handoff.

### D24-F Accepted Direction
- N6 cache, compression, replay, and audit artifacts are primarily LLM-operable workflow-quality evidence, not human-facing audit reports.
- Prompt/cache identity exists so later agents and replay runners can decide whether the same frozen lineage, generation mode, mode-specific context, prompt variant, profile, model/runtime params, redaction policy, and compression state are actually reusable.
- Compression reports exist so automatic compressors, evaluators, and repair loops can verify preserved facts, detect dropped facts, and block unsafe long-context reduction before another LLM draft is generated.
- Runtime audit exists so later agents can distinguish context drift, budget failure, schema failure, admission failure, deterministic gate failure, authority-write failure, provider telemetry, and response-reuse provenance.
- Replay evidence exists to prove workflow equivalence and boundary preservation, not only to prove saved LLM calls.
- Provider response reuse remains blocked for `provider_llm`; provider-side cache telemetry is telemetry only.
- Context packet cache remains process-local/runtime-only for this N6 expansion. A cache hit cannot skip prompt packet identity, runtime audit, draft admission, deterministic gate, authority write, or `N6ToN7Handoff@v1`.

### D24-G Accepted Direction
- N6 verification follows D22 layering: L1 unit/contract, L2 WorkflowHarness policy stress, L3 Prisma-backed local/dev smoke, L4 provider/executor canary, and L5 adversarial/long-context stress.
- First implementation entry does not require provider canary. Provider evidence follows after Codex/mocked runtime identity, admission, replay, prompt-index, and deterministic-gate boundaries are stable.
- First-slice minimum completion requires L1/L2 for the N5->N6 initial path, docs update, and promoted-slot legacy direct draft generation removal for that path.
- N7->N6 regeneration implementation requires initial-path L1/L2 pass plus N7 loopback projection identity, drift, orphan, and unknown-ref tests.
- `fixture_replay` artifacts and unit fixture helpers may remain, but product/acceptance promoted paths must not directly submit legacy frozen semantic drafts to N6 gate.
- Placeholder prompt hashes must not enter real prompt packet cache rows, and `legacy_unverified` artifacts must not be downgraded to warnings for product admission.
- LLM-like call delta `0` is useful replay evidence, but N6 replay success also requires frozen input identity, runtime/admission identity, deterministic gate replay, authority refs/hashes, and `N6ToN7Handoff@v1` hash equivalence.

### D24 Implementation Readiness Review
- Verdict: ready to start Slice 1 implementation preparation.
- Ready scope: `n6_question_candidate_draft.initial_from_n5` through Codex/mocked shared runtime.
- Not ready in Slice 1: N7->N6 regeneration, N6 gate-failure retry, `n6_loopback_triage` runtime generation, provider canary, and DB-backed context packet cache.
- Required first code steps:
  - add the v1b N6 first-slice context runtime profile;
  - add N6 draft runtime/admission contracts and tests;
  - add node-level N6 draft runtime adapter;
  - wire `WorkflowHarness` to call the node adapter for promoted initial-path draft generation/admission;
  - remove promoted initial-path direct draft generation after replacement L1/L2 tests pass.
- Slice 1 implementation status:
  - profile, runtime adapter, admission service, `WorkflowHarness` admission wiring, and L1/L2 tests are implemented for `initial_from_n5`;
  - L3 Prisma-backed local/dev smoke is implemented as `pnpm topic-selection:v1b-n6-runtime-smoke`;
  - L4 provider canary coverage is implemented for OpenAI and DashScope over `AgentOrchestrator -> BackendLlmGateway`; provider-required live calls remain non-reusable business responses, and over-budget canaries call zero providers;
  - L5 long-context/adversarial coverage blocks dropped N6 preserved facts and forbidden persisted payloads before draft generation/admission can continue;
  - `legacy_unverified` N6 drafts now block before deterministic gates, and `fixture_replay` remains limited to non-product fixture paths;
  - N6 frozen payload/context/handoff lineage validation now runs before draft artifact resolution/admission;
  - next work is P2.1b regeneration/triage promotion.
- P2.1b implementation status:
  - `regeneration_after_n7_loopback` is implemented through L1-L3 with ref-backed N7 failed-trial projection identity and drift blockers;
  - `n6_loopback_triage` is implemented through L1-L3 as an optional support-only runtime/admission slot bound to the failed N6 draft hash, failed draft prompt identity, failed draft source-hash bundle, runtime audit, and `v1b_n6_loopback_triage_context`;
  - product mode blocks fixture loopback triage, and `legacy_unverified` triage cannot enter promoted admission;
  - `regeneration_after_n6_gate_failure` is implemented through L1-L3 with ref-backed N6 gate-failure retry projection identity, failed draft identity, blocked-candidate context, reason/hint hashes, and drift blockers;
  - P2.1b is closed at L1-L3 with L5 compression blockers. P2.2 v1b N8 is the next implementation-readiness focus.

### Implementation Order
- P2.1 v1b N6 initial topic-question candidate generation:
  - bind `n6_question_candidate_draft.initial_from_n5` to the shared runtime;
  - keep `N5ToN6Handoff@v1` as the only authority input;
  - preserve frozen N5 lineage, selected slice/option identity, evidence/boundary/assumption refs, claim ceiling, source-health warnings, and risk/gap/recheck hints through prompt identity and compression gates;
  - verify exact replay, frozen input drift, prompt/cache key drift, provider non-reuse, no authority bypass, and promoted initial-path legacy exit.
- P2.1b v1b N6 regeneration and triage:
  - `regeneration_after_n7_loopback` is now bound after P2.1 L1/L2 pass;
  - consume the N7 failed-trial loopback projection as ref-backed non-authority context with selected-slice lineage and N6 handoff hash checks;
  - preserve failed-trial blockers, exhausted candidate refs, regeneration hints, candidate-order facts, and source-health warnings through prompt identity and compression gates;
  - verify N7 loopback drift, unknown failed-trial refs, orphan projection blocking, triage authority boundaries, and no authority bypass;
  - `n6_loopback_triage` is now bound as optional support-only runtime context for N6 failed-draft routing; it can classify failure scope, dominant reason codes, affected refs, regeneration hints, debate escalation advice, and rollback-to-N5 advice, but cannot create candidates, select a slice, emit handoff authority, or create downstream recheck;
  - `regeneration_after_n6_gate_failure` is now bound to `v1b_n6_gate_failure_retry_context`, preserving failed draft identity, blocked-candidate context, failure reason codes, regeneration hints, selected slice identity, and N5 handoff hash through prompt identity and compression gates;
  - P2.1b L1-L3 and L5 compression blocker coverage are complete.
- P2.2 v1b N8 topic value assessment:
  - D25-A is locked: first slice promotes only `n8_value_assessment_draft`; it does not expand N9/N10/N11, does not change the N8 deterministic gate, does not runtime-ize N8->N7 feedback generation, and does not introduce multi-agent debate/provider canaries in the first slice;
  - D25-A boundary: `n8_value_assessment_draft` remains `model_draft_for_gate`; runtime success produces a non-authority semantic artifact only, and N8 authority writes still require the existing deterministic value gate plus `N8ToN9Handoff@v1` persistence;
  - D25-B is locked: N8 runtime MUST bind both the `N7ToN8Handoff@v1` authority lineage and exactly one `v1b_n7_to_n8_topic_question_contract_context` non-authority projection;
  - D25-B identity: prompt/cache identity MUST include invocation slot id, prompt variant `n8_value_assessment_draft.initial_from_n7`, model/profile identity, context profile hash, redaction policy, frozen input hash, N7 handoff hash, N7->N8 projection hash, topic question hash, topic question contract hash, active candidate hash, answerability plan hash, trial ledger hash, selected research slice hash, candidate set hash, source hash bundle hash, output contract, and runtime modifiers hash;
  - D25-B blockers: missing, duplicated, checksum-drifted, wrong-route, wrong-lineage, or source-hash-drifted N7->N8 projection blocks before draft generation/admission and before any authority/handoff write;
  - D25-C is locked: N8 compression is a robustness mechanism, not content pruning. Compression MAY change expression density, but MUST preserve the fact set and structural shape required by the N8 workflow;
  - D25-C required preservation: compression MUST preserve N7 handoff/projection lineage, topic question and contract refs/hashes, active candidate identity, answerability plan, trial ledger, value rationale, support-quality facts, reviewer-facing uncertainty, risk/gap/blocker facts, source-health warnings, and downstream feedback/recheck hints;
  - D25-C blockers: missing required facts, missing required arrays/maps/refs/hashes, rewritten authority semantics, or compressed context that cannot be schema-validated blocks before draft generation/admission. A blocked compression artifact remains non-authority workflow evidence and cannot be cached as an admissible prompt input;
  - D25-D is locked: N8 runtime output is advisory `model_draft_for_gate` only. Runtime/cache/compression/reuse success cannot create `topic_value_assessment`, `N8ToN9Handoff@v1`, `N8ToN7Feedback`, route decisions, trial-ledger updates, or candidate mutations;
  - D25-D authority boundary: deterministic N8 gate pass is the only authority admission path for value assessment and N8->N9 handoff persistence; deterministic N8 gate reject creates no value authority and leaves N8->N7 feedback generation to deterministic harness logic;
  - D25-E is locked: compression failure detection MUST live in runtime/admission code, not in `WorkflowHarness`-only assertions. Harness tests only construct adversarial cases and verify runtime blockers;
  - D25-E shared runtime self-check: compression report schema, source refs/hashes, compressed context hash, forbidden payload classes, post-compression token budget, blocker/warning codes, and rejected-artifact cache exclusion MUST be validated before prompt packet creation;
  - D25-E N8 adapter self-check: N8 MUST emit a required-structure manifest for lineage, refs/hashes, required paths, preserved fact groups, allowed authority fields, and route/gate semantics. The compressed context must validate against the manifest before draft generation or draft admission;
  - D25-E harness boundary: `WorkflowHarness` MUST NOT implement a parallel production validity decision for compression. It may assert that missing trial ledger, ref/hash drift, dropped risk facts, schema-invalid compact context, or rejected compression artifacts are blocked by runtime/admission services;
  - verify N7 projection drift, N8 feedback handoff back to N7, malformed support/compression blocking, runtime compression self-check blockers, provider non-reuse, deterministic feedback boundaries, and no authority bypass.
- P2.3 v1b N4 research-slice option generation:
  - first slice promotes only `n4_research_slice_option_draft.initial_from_n3`; N5 request-more-options and later loopback variants remain deferred until this initial path is stable;
  - runtime context family is `v1b_n4_research_slice_option_generation`; product-mode admission requires `runtime_verified` provenance from `TopicSelectionV1bN4ResearchSliceRuntimeService`, while fixture replay is test/acceptance-only;
  - N4 output remains `model_draft_for_gate`; it cannot create `ResearchSliceOptionSet`, `ResearchSliceOption`, `PlanResearchSliceRun`, `N4ToN5Handoff`, slice selection, package, recheck, or any authority record;
  - prompt/cache identity MUST include frozen input hash, N2/N3 handoff hashes, N1 snapshot hash, N2 constraint profile hash, N3 readiness hash, planning-input hash, evidence role-bundle hash, evidence refs hash, constraint digest hash, claim ceiling hash, non-goals hash, accepted-risk/recheck/memory hashes, source hash bundle, output contract, profile hash, redaction policy, runtime modifiers, and compression identity when present;
  - compression MUST preserve N3 handoff lineage, intake snapshot identity, constraint profile, intake readiness, validated need, evidence role bundle/refs, claim ceiling, non-goals, accepted risks, risk/gap/blocker facts, recheck hints, memory suggestions, source-health warnings, and planning input structure;
  - L3 Prisma-backed local/dev smoke is implemented as `pnpm topic-selection:v1b-n4-runtime-smoke`;
  - current L3 coverage verifies runtime-verified product admission, exact replay/idempotency, source-hash drift blocking, runtime audit non-provider provenance, response non-reuse, and prompt packet cache metadata-only behavior;
  - L4 local and live provider/executor canary is implemented for OpenAI and DashScope over `AgentOrchestrator -> BackendLlmGateway`; live N4 provider canaries are explicit-gated by `T112_V1B_N4_PROVIDER_CANARY_LIVE=1` and provider keys;
  - L5 long-context/adversarial coverage blocks dropped N4 preserved facts and forbidden persisted payloads before compressed context can become prompt input;
  - N4 first-slice runtime closure evidence is complete for local/dev, local provider canary, live provider canary, and L5 adversarial compression.
- P2.4 v1b runtime closure:
  - focus stays on v1b runtime; no additional v1c rollout proceeds in this closure slice;
	  - D26-A is historical: v1b runtime closure originally completed around the promoted N4/N6/N7/N8 runtime surface only, and did not silently expand to every v1b LLM-like or delegated semantic support node;
	  - D26-B is superseded by D30: v1b N2 `n2_constraint_profile_semantic_support`, N3 `n3_readiness_classification`, and N5 `n5_slice_selection_review` were later explicitly promoted through `TopicSelectionV1bEarlySemanticSupportRuntimeService` and `TopicSelectionV1bEarlySemanticSupportAdmissionService`;
	  - D26-C remains applicable with D30 scope included: v1b closure acceptance is based on the combined runtime stress plus the per-node evidence for N2/N3/N4/N5/N6/N7/N8 promoted runtime/support slots, prompt-index metadata-only persistence, provider response non-reuse, runtime/admission compression self-checks where applicable, and unchanged deterministic gate/handoff/authority boundaries;
  - D27-A is locked: `pnpm topic-selection:v1b-runtime-stress` is the main v1b closure command for the promoted runtime surface;
  - D27-B is locked: per-node evidence floor remains required for promoted N4/N6/N7/N8 slots, including L1/L2 unit or harness policy coverage, L3 Prisma-backed smoke, applicable L4 provider/executor canaries, and L5 compression/adversarial blockers;
  - D27-C is locked: closure must preserve runtime authority invariants. Prompt packet index persistence is metadata-only, provider response reuse stays blocked, compression failure is blocked by runtime/admission self-checks, and deterministic gates/handoffs/authority writes are not bypassed by cache/compression/runtime artifacts;
	  - D27-D is superseded by D30: N2/N3/N5 are no longer deferred surfaces after their explicit runtime-promotion decision;
  - D27-E is locked: after v1b closure evidence is recorded, the next roadmap choice is either a separate delegated semantic support runtime-promotion decision or return to v1c/resource-sampling rollout;
	  - add `pnpm topic-selection:v1b-runtime-stress` as the combined Prisma-backed local/dev runtime stress entry for promoted v1b slots;
	  - after D30, the runner composes `early_semantic_runtime_smoke`, `n4_runtime_smoke`, `n6_runtime_smoke`, `n6_loopback_runtime_smoke`, `n7_runtime_smoke`, and `n8_runtime_smoke` harness scenarios, records child summaries, and asserts prompt packet index rows for N2/N3/N5 early semantic slots plus `n4_research_slice_option_draft`, `n6_question_candidate_draft`, `n6_loopback_triage`, all three N7 support slots, and `n8_value_assessment_draft`;
  - the stress runner remains a closure harness, not a new node-orchestration authority: existing node adapters still own context compilation, prompt/cache identity, compression self-check, draft/support admission, and deterministic gate boundaries;
  - P2.1b N6 loopback/regeneration rows now have L3 Prisma-backed smoke through `pnpm topic-selection:v1b-n6-loopback-runtime-smoke`; L5 compression coverage blocks dropped N7 loopback projection, N6 gate-failure projection, failed draft identity, blocked candidate context, regeneration hints, loopback target, and triage facts;
	  - v1b N2/N3/N5 are promoted runtime semantic support slots as of D30; HTTP route smoke fixtures may still use deterministic `fixture` authority input when the test scope is route compatibility rather than Codex delegated runtime evidence.
- P3.1 v1c N2 promotion support `llm_draft` runtime migration:
  - first v1c slice is limited to `promotion_support_generation.llm_draft`; bounded micro-debate roles, N3/N4 canaries, and N6 feedback normalization remain separate follow-up slots;
  - direct `BackendLlmGateway` is removed from the v1c N2 LLM draft path in favor of `TopicSelectionAgentOrchestratorService` with `v1c_n2_promotion_support` context profile and `topic-selection-promotion-decision-support` model profile;
  - prompt/cache identity includes promotion input snapshot hashes, support run key, prompt variant key, output contract, runtime invocation context hash, model option id, redaction policy, and context profile hash;
  - provider response reuse remains blocked; provider telemetry is stored as runtime telemetry/provenance, while raw provider response payload is not persisted in the support artifact;
  - deterministic N3 promotion gate remains authoritative; LLM draft output can only populate reviewer-facing support prose before the deterministic gate check.
- P3.2 v1c N4 delegated promotion decision candidate runtime:
  - first slice promotes only `n4_delegated_promotion_decision_candidate`; it does not automate N4 authority writes, does not create N5 bridge records, and does not change N3 gate semantics;
  - runtime output is `TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1`, a non-authority candidate for explicit human acceptance through the existing `TopicSelectionV1cHumanPromotionDecisionService`;
  - runtime context family is `v1c_n4_delegated_promotion_decision`; runtime MUST consume the latest N3 `PromotionGateHandoff` refs/hashes, dossier/readiness/support refs, accepted risks, required actions, loopback hints, snapshot hashes, and existing N4 decision constraints;
  - admission recomputes expected runtime identity from the runtime service and validates profile/prompt/runtime hashes, source hashes, snapshot hash, allowed refs, forbidden authority fields, decision/condition/loopback consistency, and no-N5/bridge side-effect intent before returning a safe `RecordHumanPromotionDecisionInput` candidate;
  - `WorkflowHarness` may orchestrate N4 runtime/admission and assert outcomes, but MUST NOT own N4 prompt/cache/compression/admission formulas or call provider-only canary paths;
  - L1-L3 local closure is implemented: shared contract/schema tests, runtime/admission unit tests, harness acceptance wiring, and Prisma smoke for prompt-index metadata, prompt-cache replay, prompt drift blocking, N4 authority no-bypass before human acceptance, and no N5 bridge creation from runtime/admission alone;
  - N4 is included in `pnpm topic-selection:v1c-runtime-stress`;
  - provider canary and long-context/adversarial compression follow after the current L1-L3 slice.
- P4.1 resource-sampling runtime promotion:
  - D32 promotes `resource_classification.batch` as the minimum resource-sampling runtime slice;
  - provider classification batches now route through `TopicSelectionAgentOrchestratorService` with registered context/model profiles instead of direct `BackendLlmGateway` calls from the service;
  - context family is `resource_sampling_literature_classification_batch`, prompt variant is `resource_classification.batch`, output contract is `TopicSelectionResourceSamplingLlmOutput@v1`, and runtime invocation identity is semantic over topic id, policy version, role targets, batch index/count, and candidate batch context hash;
  - app wiring shares the existing Prisma-backed prompt packet cache service, so resource-sampling prompt packet rows remain metadata-only and provider responses are never reused;
  - `TopicSelectionResourceSamplingService` creates a real control-plane workflow run before runtime invocation, records prompt/runtime audit/structured-output artifacts on the same workflow run, then updates the workflow status/telemetry/output summary;
  - request-level model/profile input is now constrained to the registered OpenAI/DashScope runtime model options so audit model refs cannot drift from actual provider execution;
  - deterministic guardrail assembly and `topic-selection.resource-sample-ready` remain the authority boundary; runtime output alone cannot select or persist resource sample authority;
  - L4 provider canary coverage is implemented through `TopicSelectionProviderCanaryService`: prompt packet cache hits still require two provider calls, over-budget preflight makes zero provider calls, malformed minimal outputs are schema-blocked, and optional OpenAI/DashScope live gates use `T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE=1`;
  - L5 compression adversarial fixtures are implemented for dropped resource-sampling classification facts and forbidden raw provider log payloads;
  - DB-backed context packet cache remains deferred pending broader retention/cost-governance evidence.

### Shared Rules
- Every promoted v1b LLM-like slot MUST pass through the shared runtime boundary for token-budget preflight, prompt packet identity/cache, compression report validation, runtime audit, provider telemetry separation, and response-reuse provenance.
- Context projections, prompt cache hits, compression artifacts, and runtime audits remain LLM-operable workflow-quality evidence only; they MUST NOT become business authority or skip deterministic gates.
- Provider-side cache telemetry remains telemetry only. Provider LLM paths MUST NOT silently reuse historical responses.
- Legacy direct generation for promoted slots MUST exit after replacement tests pass; do not leave a long-term soft-disabled dual path.
- Documentation and verification evidence MUST be updated per slice before promoting the next node.
