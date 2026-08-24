# 02 Architecture

## Boundary Model
| Layer | Owns | Must not own |
|---|---|---|
| `PaperImplementationHarness` | Scenario orchestration, fixtures, replay/stress assertions, artifact output | prompt identity, provider calls, admission semantics, authority writes |
| `PaperImplementationRuntimeSlot` | Slot-specific context construction, prompt/profile binding, context/prompt cache policy and keying, response-reuse guard, runtime identity, token/compression policy | domain authority persistence |
| `PaperImplementationRuntimeAdmission` | Runtime-verified artifact admission, identity/hash recomputation, forbidden-field checks, side-effect boundary | provider execution, prompt construction |
| `AgentOrchestrator` / `BackendLlmGateway` | Model execution, provider gateway, structured-output validation, telemetry, retry/escalation policy | PaperImplementation business context resolution |
| Domain services | Motive, validation, work order, trace, result/claim/dossier authority gates | direct provider calls or hidden prompt/cache decisions |
| `StateWriter` / admitted domain writer | Authority state mutation after gates, trace, confirmation, and risk checks | LLM execution or experiment execution |

Detailed boundary rules live in `10-harness-runtime-boundary.md`. That document is the review checklist for future implementation slices.

Runtime persistence envelope rules live in `12-runtime-persistence-envelope.md`. That document is the SSOT for how promoted runtime artifacts and admission records relate to existing harness tables.

## Topic-Selection Lessons To Reuse
- Node/slot is the primary unit of production evidence.
- Harness is not the production semantics owner.
- Runtime/admission services must recompute identity instead of trusting supplied hashes.
- Provider cache telemetry is not response reuse.
- `mocked_llm`, `codex_assisted`, and `provider_llm` must be explicit and queryable.
- Provider canary paths must hit the same production runtime slot, not a canary-only provider path.
- L1-L5 verification is the exit ladder:
  - L1: contract/unit
  - L2: service integration
  - L3: Prisma smoke
  - L4: provider canary
  - L5: long-context/adversarial/compression/stress
- L6 is the near-prod runtime gate: same HTTP routes, live provider, Prisma runtime/admission repository, replay/idempotency, minimal concurrency, and machine-readable no-skip evidence.

## Production Executability Bar
T-114 production executability is not the same as final production readiness. The minimum bar for continuing into semantic quality and remaining-node promotion is:
- Same path: evidence must traverse the controlled HTTP route, controller, runtime service, admission service, and Domain Gate where applicable.
- Fail closed: provider/schema errors, forbidden output, profile drift, over-budget input, and materialization drift must not create domain artifacts.
- Replayable: identical runtime/admission/domain identities must be idempotent.
- Persisted: runtime artifacts and admission records must be queryable through the Prisma runtime/admission repository when the gate claims near-prod evidence.
- Observable: gate summaries must contain step status, TAP totals, route/provider/Prisma/idempotency evidence, and redaction guardrails.
- No dual track: harness proposal artifacts, direct provider SDK calls, fixture replay, or arbitrary runtime-envelope write routes must not satisfy promoted-slot runtime/admission criteria.

The L5 gate proves deterministic runtime closure. The L6 gate proves near-prod execution equivalence for the promoted first-slice slots. Neither gate claims all PaperImplementation nodes are production-promoted.

## PaperImplementation-Specific Constraints
- Trace and failed-run retention are authority prerequisites, not optional observability.
- Agent output is proposal-only until admitted by deterministic gates and state-writing services.
- WorkOrder/live experiment runtime must remain ref/hash based and cannot copy experiment-foundation authority payloads.
- `WritingEntryPacket` remains a dossier projection, not runtime authority.
- Retired pre-writing control-plane artifacts are historical only and must not re-enter as wrappers.

## Harness Compatibility Strategy
The existing `PaperImplementationAgentWorkflowHarnessRun` / `PaperImplementationProposalArtifact` path remains a proposal-harness evidence lane. It should not be renamed, wrapped, or adapted into the production runtime lane.

Promotion is controlled by `slot_id`, not by `workflow_type` alone. A workflow family such as `trace_integrity_review` may still have unpromoted proposal-harness scenarios, while `trace_integrity_review.boundary_debate` is governed by the new runtime/admission contract once promoted.

For a promoted slot:
- Harness may select scenarios and record runtime refs after execution.
- Runtime produces role artifacts and the final runtime artifact.
- Admission verifies runtime identity and creates admission records.
- Domain Gate consumes only the admitted final runtime artifact.
- Harness proposal artifacts are rejected as promoted-slot domain inputs.

## Expected Runtime Slot Shape
Each promoted runtime slot should define:
- `slot_id`
- `workflow_type`
- `target_ref`
- `input_refs`
- `source_hash_bundle`
- `context_packet_ref/hash`
- `context_policy_profile_ref/hash`
- `cache_policy_profile_ref/hash`
- `runtime_invocation_context_hash`
- `context_cache_key_hash`
- `context_cache_status`
- `context_cache_result_ref/hash`
- `prompt_packet_ref/hash`
- `prompt_template_id`
- `prompt_template_version_id`
- `prompt_variant_id`
- `prompt_redaction_policy_hash`
- `prompt_packet_cache_key_hash`
- `prompt_packet_cache_status`
- `prompt_packet_cache_result_ref/hash`
- `output_schema_version_id`
- `execution_mode`
- `executor_kind`
- `model_profile_id`
- `model_option_id` for provider mode
- `token_budget_gate_result_ref/hash`
- `compression_policy_profile_ref/hash`
- `compression_status`
- `compression_report_ref/hash` when used
- `compressed_context_packet_ref/hash` when compression is applied
- `response_reuse_decision_ref/hash`
- `runtime_audit_ref/hash`
- `allowed_side_effects`

Admission output, not the runtime slot artifact itself, should add `admission_identity` and `admission_identity_hash` after recomputing runtime, prompt, cache, token, compression, source, and output identity.

## First-Slice Architecture Recommendation
Start with writing-readiness slots because they carry the highest authority risk:
1. `trace_integrity_review`
2. `claim_boundary_review`
3. `dossier_readiness_prep`

These slots already map to T-097/T-098/T-099/T-101 concepts and can prove the runtime pattern without touching every motive/validation flow at once.

## DB/Schema Strategy
- First inspect current `PaperImplementationHarness`, `PaperImplementationAgentWorkflowHarnessRun`, `PaperImplementationProposalArtifact`, `PaperImplementationGateResult`, `PaperImplementationTransitionAttempt`, and `PaperImplementationDecisionWorkQueueItem` fields.
- Do not reuse current harness tables as runtime/admission tables. They remain proposal-harness evidence tables.
- Shared runtime/admission envelope contracts are the semantic SSOT. Prisma persists them through two generic models: `PaperImplementationRuntimeArtifact` and `PaperImplementationRuntimeAdmissionRecord`.
- Persist queryable columns for project, slot, scope, workflow/status, target ref, runtime/admission identity hashes, prompt/source/output hashes, schema ids, and policy ids; keep full validated envelope/record JSON for exact replay.
- Do not create one table per semantic role and do not project harness proposal artifacts into runtime artifact rows.
- Do not apply destructive DB writes without explicit approval.

## Route Strategy
- Prefer existing PaperImplementation route group.
- Add controlled runtime/admission routes through the existing PaperImplementation route group, not a separate runtime-only server.
- The first route slice admits an existing runtime artifact by URL-owned `runtime_artifact_id`; request body carries only admission policy and expected identity hashes.
- The first runtime execution slice adds a controlled command route for `trace_integrity_review.boundary_debate`:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/trace-integrity-boundary-debate/run`
  - URL owns `implementation_project_id`.
  - Request body carries only slot inputs, execution mode/profile selection, target refs, reviewed statement packet, source refs/hashes, and optional fixture role outputs for non-provider modes.
  - Request body must not carry `implementation_project_id`, `runtime_artifact_id`, raw runtime envelopes, rendered prompts, raw provider responses, or domain state mutations.
- Do not expose a public route that records arbitrary `PaperImplementationRuntimeArtifactEnvelope` payloads. Runtime services own artifact recording after constructing context/prompt/cache/token/compression identity.
- UI/workbench should consume read models and queue items, not call runtime internals directly.

## Trace Debate Runtime Service Strategy
- `PaperImplementationTraceIntegrityDebateRuntimeService` is the first promoted runtime facade.
- It owns deterministic retrieval/context packet construction for the first slice, prompt/profile binding, provider response-reuse policy, runtime artifact recording, and role/final admission chaining.
- It depends on `PaperImplementationRuntimeAdmissionService` and the existing `AgentOrchestrator -> BackendLlmGateway` path for model execution.
- It must not call provider SDKs directly, write PaperImplementation authority state, materialize queue items, or accept harness proposal artifacts as promoted-slot inputs.
- Provider canary evidence must run through this same service and route; provider-only scripts are not authoritative evidence.
