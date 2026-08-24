# 05 Pitfalls

## Do Not Repeat
- Do not treat cache, compressed summaries, or provider-side cache telemetry as authority.
- Do not let `provider_llm` silently return a stored response; live provider execution and response reuse must remain distinguishable.
- Do not create node-local cache key formulas that bypass shared contract fields.
- Do not allow exploration context cache entries to satisfy arbiter context requests, or vice versa.
- Do not drop blocker facts, residual risks, source-health warnings, unresolved challenges, method-family gaps, or recheck hints during compression.
- Do not persist hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content.
- Do not use semantic-near cache for authority-bearing workflow decisions.
- Do not treat the slot inventory table as implementation-ready runtime configuration.
- Do not wire resource sampling, v1b, or v1c direct provider paths into T-112 semantics before their rows are promoted and registered.
- Do not add another local cache-key formula to the v1a N6 context compiler; route key building through shared runtime primitives.
- Do not accept Codex exact reuse without an approval ref or explicit local approved-reuse setting.
- Do not build provider-mode context cache keys with placeholder model metadata. Resolve the selected model profile first so `model_option_id` and `normalized_params_hash` are concrete key fields.
- Do not require a read-through context cache artifact ref to belong to the current workflow run. Cross-run exact cache hits are valid when source refs, hashes, context family, policy/schema/profile, execution mode, and payload hash are all validated.
- Do not require real provider N5 EvidenceMap extraction to materialize only as `ready`. `ready_with_warning` is production-valid when authority refs, EvidenceUnit refs, downstream handoff, runtime success, and warning codes are all present.
- Do not let v1a N7 validate recommendations drop `METHOD_FAMILY_COVERAGE_GAP` reported by the support packet; the recommendation must carry the gap code or an explicit method-family/coverage-gap required action.
- Do not classify v1a N1/N2/N3/N4/N9 as LLM compression/cache nodes. They are deterministic context producers and publish boundaries, so their stress coverage must focus on ref/hash lineage, source-health handoff, replay, and authority-write blocking.
- Do not interpret the v1a runtime stress runner as a live-provider canary. It is Prisma-backed and production-shaped, but defaults to deterministic mocked LLM execution so repeated local runs do not spend provider budget.
- Do not handcraft placeholder semantic artifacts for promoted runtime slots in service-level or HTTP tests. Use the owning runtime service for Codex delegated/support evidence, or keep the test on deterministic `fixture` authority input when the test scope is route compatibility.
- Do not let `fixture_replay` become a promoted-slot identity bypass. Even outside product mode, fixture replay must still bind profile, prompt, runtime invocation context, source hashes, payload hash, and compression identity.
- Do not reintroduce direct `BackendLlmGateway` calls for promoted resource-sampling classification batches. The service must route provider execution through `AgentOrchestrator` so prompt packet cache, token-budget preflight, runtime audit, and provider response non-reuse stay unified.
- Do not allow resource-sampling request `model.profile_id` or `model.model_id` to diverge from the registered runtime model profile/options; audit model refs must describe the actual runtime-selected provider option.
- Do not let resource-sampling compression drop candidate identity or guardrail-critical classification facts. `literature_ref`, candidate abstract/digest, role classification, rationale, method family, source count, and guardrail signal must remain preserved facts, and raw provider logs must never appear in compressed context payloads.
- Do not leave closure status or scope docs frozen at an earlier audit pass after later promoted surfaces land. Final closure must reconcile overview, architecture, acceptance matrix, verification, and project-governance status.

## Non-Blocking Future Decisions
- DB-backed context packet cache index remains deferred to a later retention/cost-governance decision.
- Any future direct/provider/Codex surface still needs its own implementation-ready matrix promotion before runtime wiring.
