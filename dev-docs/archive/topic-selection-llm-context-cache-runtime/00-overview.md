# T-112 Topic Selection LLM Context Cache Runtime

## Status
- State: done
- Task ID: `T-112`
- Mapping: `M-001 > F-001 > R-009 > T-112`
- Depends on:
  - `T-088 topic-selection-workflow-runtime-foundation`
  - `T-089 topic-selection-agent-workflow-review`
  - `T-107 topic-selection-v1b-workflow-hardening`
  - `T-108 topic-selection-v1c-workflow-hardening`
  - `T-111 topic-selection-v1a-production-orchestration`
- Trigger: review of current LLM agent workflow showed context packet metadata, prompt hashes, replay hashes, and telemetry exist, but production-grade context compression, cache reuse, token-budget gating, and provider-cache provenance are not yet unified across the full topic-selection workflow.

## Goal
- Define and implement a shared LLM context/cache/token-budget runtime for the entire topic-selection management flow.
- Cover resource sampling, v1a, v1b, v1c, downstream feedback/recheck, and provider/Codex-assisted harness execution paths.
- Preserve existing authority boundaries, route-policy semantics, replay/idempotency behavior, and audit provenance while reducing provider cost and long-context failure risk.

## Non-goals
- Do not use semantic-similarity or approximate response cache for authority-bearing decisions.
- Do not make cache, summaries, compressed context, or chat history into business authority.
- Do not weaken v1a/v1b/v1c route policies, deterministic gates, schema validation, or replay drift checks.
- Do not introduce a second LLM gateway or provider SDK path.
- Do not require new provider secrets or commit local environment files.
- Do not add desktop UI in this package; UI hints may be a later follow-up after runtime contracts settle.

## Scope
- Shared contracts for context packets, prompt packets, invocation cache keys, token-budget gate results, compression reports, and cache/reuse provenance.
- Backend runtime support in `AgentOrchestrator`, `BackendLlmGateway`, context compiler services, and WorkflowHarness node adapters.
- Node-level policy coverage for resource sampling, v1a N5/N6/N7/N8, v1b LLM-backed semantic nodes, v1c advisory/promotion support nodes, and downstream feedback normalization/recheck.
- Tests and provider canaries proving cache, compression, and token-budget behavior.
- Current v1c closure command: `pnpm topic-selection:v1c-runtime-stress`, which combines N2/N4/N6 Prisma runtime smokes, v1c harness acceptance, local provider canary, prompt-index assertions, replay/drift checks, and no-side-effect-bypass checks. Current v1c production-depth command: `pnpm topic-selection:v1c-production-depth`, which adds higher iteration count, concurrent runtime stress, prompt-index first-writer race, provider profile drift guards, retention/cleanup observation, focused runtime/compression/admission unit coverage, and local provider slot canary coverage without restoring a full-chain provider harness.

## Final Closure Scope
- D33 final closure evaluates the promoted runtime surface:
  - v1a N5/N6/N7/N8 plus deterministic N1-N4/N9 replay and publish boundaries;
  - v1b promoted N2/N3/N4/N5/N6/N7/N8 semantic/runtime slots;
  - v1c promoted N2 bounded micro-debate, N4 delegated promotion decision, and N6 downstream feedback normalization slots;
  - resource-sampling `resource_classification.batch`.
- Runtime owns context/cache/compression/context-memory/token-budget/reuse/audit semantics. Harness owns orchestration, fixtures, replay/stress/drift evidence, and assertions that runtime/admission/deterministic services behaved correctly.
- Explicit deferrals are non-blocking future governance decisions:
  - DB-backed context packet cache index;
  - any future direct/provider/Codex surface outside the registered runtime profiles, unless a later matrix decision promotes it.

## Acceptance Criteria
- [x] A node-scope matrix identifies every topic-selection LLM-capable node and its context/cache/compression/token-budget policy.
- [x] Shared contracts reject missing policy/schema/profile fields, context-family drift, malformed compression/prompt/reuse/audit envelopes, and missing token-budget decisions.
- [x] Backend token-budget primitive emits typed preflight decisions from first-slice `ContextPolicyProfile` policy.
- [x] Backend context packet cache primitive returns exact-hit, stale, drift, miss, and disabled-cache envelopes without storing payloads.
- [x] Backend compression runtime primitive creates ref-backed/hash-checked reports and blocks forbidden payloads or dropped required facts.
- [x] v1a N6 production-shaped local context cache tests verify artifact-ref reuse and stale/drift blocking without live providers.
- [x] v1a N6 single-agent provider path performs token-budget preflight in `AgentOrchestrator` and blocks over-budget fixtures before gateway calls.
- [x] v1a N6 WorkflowHarness provider over-budget fixture proves call-count `0`, no ranked/admission/routing artifacts, and no NeedCandidate authority write.
- [x] Agent invocation audit snapshots carry token-budget gate results when a runtime profile is supplied.
- [x] v1a N6 debate slots pass through the same runtime token-budget preflight as single-agent N6.
- [x] Provider-side cache telemetry is recorded as telemetry only and remains separate from business response reuse.
- [x] `codex_assisted` exact cached reuse requires approval plus non-provider reuse provenance before schema/deterministic gate admission.
- [x] Over-budget paths with supplied compression attempts record quality-gated compression report artifacts before blocking provider execution.
- [x] v1a N6 single-agent over-target provider path performs deterministic structural compression, records a `context_compression_report` artifact, re-renders the prompt with compressed context, and then still runs token/schema/admission/persistence gates.
- [x] v1a N7 adjudication over-target provider path records a quality-gated compression report, re-renders compressed recommendation context, reruns token gate through `AgentOrchestrator`, and still applies deterministic residual-risk/method-gap/adjudication authority gates.
- [x] Minimal OpenAI/DashScope provider-canary harness proves local provider-required prompt-cache hits still execute gateway calls, while over-budget fixtures execute zero provider calls.
- [x] Prompt packet cache has a Prisma-backed persistent exact index that stores artifact refs and hashes only, with no prompt payload or provider response payload.
- [x] v1a production boundary keeps context packet cache process-local and artifact-ref-only; restart/deploy cache misses are safe recompilation paths, not correctness dependencies.
- [x] Production-shaped local/dev Prisma smokes verify persistent prompt-index read-through semantics, provider-required non-response-reuse behavior, over-budget provider call count `0`, v1a N1-N9 main WorkflowHarness execution, N1-N4/N6-N9 exact replay/input-hash drift behavior, and default mock-sample fallback to the balanced T-112 fixture.
- [x] Prisma-backed v1a runtime stress runner repeatedly executes N1-N9 replay smoke, verifies prompt packet index growth/slot distribution, confirms exact replay and drift branches do not invoke the LLM gateway, and supports parameterized single-agent or multi-agent-debate N6 modes.
- [x] v1b N7 runtime first slice routes promoted support generation through `TopicSelectionV1bN7SupportRuntimeService`, emits `runtime_verified` support artifacts, and blocks fixture/legacy/product identity drift before deterministic gates.
- [x] Prisma-backed v1b N7 runtime smoke verifies N6->N7->N8, N8->N7 readmission, N7->N6 loopback projection, N7 prompt-index metadata rows, non-provider audit provenance, and provider-response non-reuse for all three N7 support slots.
- [x] v1b N7 quality closure verifies runtime audit artifact dereference/checksum/provenance binding, unknown failed-trial synthesis ref blocking, and post-authority-write runtime projection recording.
- [x] Live OpenAI/DashScope provider canaries verify provider-backed v1a N6 invocations perform token-budget preflight before gateway calls and do not treat prompt-cache hits as provider response reuse.
- [x] v1a WorkflowHarness runtime policy stress verifies N1-N4 context producer lineage/source-health/hash-drift behavior, N9 publish replay/lineage drift boundaries, N6 exact context-cache hit/drift/stale behavior, provider-required call counts, deterministic gate artifacts after cache hit, N6 compression/re-render, and N5/N7/N8 token-budget audit decisions.
- [x] v1a N5 EvidenceMap extraction over-target path records a quality-gated compression report, rerenders compressed context, reruns token gate through `AgentOrchestrator`, and preserves the deterministic materialization authority boundary.
- [x] v1a N8 human-confirmation semantic review over-target path records a quality-gated compression report, rerenders compressed advisory context, reruns token gate through `AgentOrchestrator`, and preserves the human confirmation authority boundary.
- [x] v1a provider-backed N5/N7/N8 invocations outside the original N6 first slice perform token-budget preflight before provider calls, route through `AgentOrchestrator -> BackendLlmGateway`, and preserve deterministic authority boundaries.
- [x] v1a cache/replay hits do not create duplicate authority writes and do not skip deterministic gates for N1-N4 producers, N6 candidate generation, N7 adjudication, N8 confirmation, or N9 publish.
- [x] Promoted provider-backed invocations across v1a/v1b/v1c perform token-budget preflight before calling OpenAI/DashScope-compatible gateways.
- [x] `provider_llm` execution in the promoted v1a N6 first slice never silently serves cached responses as live provider calls.
- [x] Exact response reuse is allowed only for explicit replay/test/acceptance or operator-approved Codex-assisted reuse with `non_provider=true` in the `AgentOrchestrator` Codex path.
- [x] Context packet read-through cache reuses compiled packets only when exact key fields match for promoted process-local context-cache surfaces.
- [x] Compression reports are wired into promoted over-budget context execution and preserve source refs, input hashes, summary hashes, redaction policy, compiler version, token estimates, and quality-gate result.
- [x] Cache hits do not create duplicate authority writes and do not skip deterministic gates on the promoted runtime surface.
- [x] v1a, v1b, and v1c harness smokes verify happy path, stale/drift cache, token-over-budget, and response-reuse boundaries for promoted runtime slots.
- [x] Live OpenAI/DashScope v1a N6 provider canaries record telemetry and prove provider-required scenarios still perform live provider calls.

## Current Focus
- Current v1a production-readiness focus is closed for the promoted T-112 runtime slice: D18.2/D18.3/D18.4/D18.5/D18.6, N1-N4 producer replay/drift smoke, N5/N7/N8 over-budget compression, and uneven provider slices for DashScope N7/N8 plus OpenAI N8 are complete. N5/N7/N8 runtime binding now lives outside `WorkflowHarness`, v1a runtime stress has separate `baseline` and `mocked_n5_n8` context modes with prompt-index assertions for N5/N6/N7/N8, and N1-N4 deterministic context producers have DB-backed exact replay/input-hash drift coverage.
- v1b N7 runtime first slice is closed for L1-L3 plus minimum adversarial quality coverage.
- D24 v1b N6 chain alignment is closed for first-slice planning.
- v1b N6 `n6_question_candidate_draft.initial_from_n5` is implemented through L3 Prisma-backed smoke, L4 provider canary, and L5 long-context/adversarial compression coverage.
- v1b N6 P2.1b has promoted the N7->N6 failed-trial regeneration path through L1-L3: `v1b_n7_to_n6_failed_trial_loopback_context` now enters N6 as ref-backed non-authority runtime context for `n6_question_candidate_draft.regeneration_after_n7_loopback`.
- v1b N6 P2.1b has promoted `n6_loopback_triage` through L1-L3 as an optional support-only runtime/admission slot for failed-draft routing, debate escalation advice, and rollback-to-N5 advice.
- v1b N6 P2.1b has promoted `n6_question_candidate_draft.regeneration_after_n6_gate_failure` through L1-L3: N6 deterministic gate failures now emit `v1b_n6_gate_failure_retry_context` as ref-backed non-authority retry context.
- v1c N6 downstream feedback normalization is implemented through L1-L5 closure: shared candidate contract, runtime/admission services, v1c harness acceptance wiring, `pnpm topic-selection:v1c-n6-runtime-smoke`, local/live provider canaries, and compression adversarial coverage. N6 admission and deterministic downstream feedback/recheck now share one canonical loopback/affected-ref policy, so missing affected lineage blocks before recheck side effects instead of falling back to synthetic refs.
- v1b N8 P2.2 has promoted `n8_value_assessment_draft.initial_from_n7` through L1-L5: runtime-verified Codex value drafts can enter product-mode N8 admission only when the N7 handoff and N7->N8 projection identity match, fixture replay is blocked in product, Prisma-backed smoke validates replay/drift/prompt-index behavior, provider canaries cover OpenAI/DashScope prompt-cache live-call semantics, and long-context/adversarial compression blocks dropped N8 value facts and raw provider logs.
- v1b N4 first-slice runtime closure is complete for the initial N3->N4 research-slice option path.
- D26 is historical and D30 supersedes its N2/N3/N5 deferral: v1b N2 `n2_constraint_profile_semantic_support`, N3 `n3_readiness_classification`, and N5 `n5_slice_selection_review` are now promoted runtime semantic support slots. Review fixes in D31 removed hand-built promoted-slot fixtures from service/HTTP tests and tightened non-product `fixture_replay` identity checks.
- D27 is locked: v1b closure acceptance uses the combined Prisma-backed runtime stress as the main entry, keeps per-node L3/L4/L5 evidence as the detailed floor, and requires prompt-index metadata-only persistence, provider response non-reuse, runtime/admission-owned compression self-checks, and unchanged deterministic authority boundaries.
- D27 closure evidence is recorded for the promoted N4/N6/N7/N8 runtime surface; current v1b focus is readiness/commit and post-closure route selection, not widening the promoted slot set.
- v1c runtime landing has completed the minimum registry/contracts foundation slice, N2 bounded micro-debate L1-L5 local/provider/compression slice, N4 delegated promotion decision L1-L5 local/provider/compression slice, N6 feedback-normalization L1-L5 local/provider/compression slice, combined v1c runtime stress, and production-depth default run. `TopicSelectionV1cN2BoundedDebateRuntimeService` now emits runtime-verified role artifacts for the four N2 slots through `AgentOrchestrator`; `TopicSelectionV1cN2BoundedDebateAdmissionService` recomputes expected runtime identity from the runtime service, validates role order, prior-role hashes, allowed refs, forbidden authority fields, runtime identity, and final semantic-layer coverage, then returns a sealed admission identity/hash. `TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService` now emits only non-authority delegated N4 decision candidates, and `TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService` produces safe `recordHumanPromotionDecision` input for explicit human acceptance without writing N4 or N5 authority. N4 L4 provider canaries now target the production runtime slot through `TopicSelectionProviderCanaryService`, while N4 L5 compression adversarial tests block dropped delegated-decision facts and raw provider logs. `TopicSelectionV1cN6FeedbackNormalizationRuntimeService` now emits runtime-verified record-only downstream feedback candidates, and `TopicSelectionV1cN6FeedbackNormalizationAdmissionService` validates bridge/source identity, prompt/runtime hashes, allowed refs, forbidden authority fields, no-upstream-mutation confirmation, recheck hints, and canonical downstream loopback policy before producing deterministic `recordDownstreamTopicFeedback` input. Prisma smokes `pnpm topic-selection:v1c-n2-runtime-smoke`, `pnpm topic-selection:v1c-n4-runtime-smoke`, and `pnpm topic-selection:v1c-n6-runtime-smoke` verify prompt-index metadata rows, prompt-cache read-through, replay/idempotency, prompt drift blocking, and authority no-bypass boundaries. DB-backed context packet cache remains deferred.
- v1c production-depth remains passed locally, and both OpenAI and DashScope live provider acceptance now have N2/N4/N6 slot evidence. OpenAI channel stabilization landed in `BackendLlmGateway`: OpenAI request schema normalization strips provider-unsupported schema keywords while preserving local validation semantics, and OpenAI connection-level `fetch failed` cases can fall back to the same gateway's curl transport without exposing credentials in command-line args. D29 closure audit evidence was recorded for the promoted v1c runtime surface before later D30/D32 promotions.
- D29 closure audit evidence is complete for the promoted runtime surface, and D30/D32 promoted the two previously non-blocking follow-up surfaces: v1b N2/N3/N5 semantic support and resource-sampling batch classification.
- D32 resource-sampling runtime promotion is now implemented for `resource_classification.batch`: `TopicSelectionResourceSamplingService` creates a real control-plane workflow run before batch classification, routes provider classification through `TopicSelectionAgentOrchestratorService`, binds the registered resource-sampling context/model profiles, emits prompt packet artifacts/cache metadata, token-budget gate decisions, runtime audit artifacts, and keeps deterministic resource-sampling guardrails/readiness gate as the authority boundary. Resource-sampling L4 provider canary coverage and L5 compression adversarial fixtures are implemented; DB-backed context packet cache remains deferred.
- D33 final closure pass marks T-112 done for the promoted runtime scope. The remaining DB-backed context packet cache index is explicitly non-blocking and should be evaluated only through a later retention/cost-governance decision.
