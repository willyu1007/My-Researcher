# 03 Implementation Notes

## 2026-06-03 - Planning Task Created
- Created T-114 for PaperImplementation harness/runtime production hardening planning.
- The task started as planning-only, then moved into the shared runtime/admission contract first slice after user confirmation.
- Initial comparison shows PaperImplementation has V1 closure and proposal-only harness coverage, while topic-selection has deeper production-grade runtime/admission/canary/stress coverage.

## Current Findings
- T-099 provides `ImplementationHarness`, `ImplementationInputSnapshot`, harness runs, proposal artifacts, gate results, transition attempts, quality signals, and queue items.
- T-104 provides live experiment adapter behavior for WorkOrder-to-experiment-foundation execution.
- T-105 provides deterministic fake-provider variance and live-provider preflight, but no live provider execution.
- T-109 replay is route-level in-memory and explicitly does not prove local Postgres parity, browser E2E, true cloud execution, live provider output variance, or writing ingestion.
- Topic-selection T-112 proves a higher bar: runtime/admission services, prompt/cache identity, provider canaries, compression/token gates, stress runners, and no-side-effect-bypass checks.

## 2026-06-04 P0 Model Profile Eligibility Cleanup
- Closed the cross-cutting PaperImplementation profile eligibility risk before the next node promotion.
- The unified backend model-profile registry now gives promoted PaperImplementation runtime profiles an explicit PaperImplementation eligibility policy instead of inheriting the shared default.
- Product mode for promoted PaperImplementation runtime profiles is provider-only: `provider_llm` may run in `acceptance` and `product`, while `mocked_llm` and `codex_assisted` are limited to `test` / `acceptance`.
- Topic-selection profile semantics remain unchanged; this is a domain-specific registry policy for PaperImplementation slots, not a second runtime entrypoint or wrapper.

## 2026-06-04 Cross-Cutting Harness Runtime Boundary Decision
- Confirmed this boundary applies to every remaining node promotion, not only trace/P1/P2 promoted slots.
- Harness is a verifier and stress orchestrator: it may construct deterministic, replay, drift, compression, adversarial, and multi-branch cases, then assert machine-checkable invariants against the real runtime route/service path.
- Harness must not own production semantics: no prompt compilation, model selection, cache keying, compression decision, semantic blocker invention, output repair, runtime artifact generation, admission override, or domain gate bypass.
- Runtime owns production-capable slot execution: context packet, prompt/profile/model-option resolution, product eligibility, cache identity, token/compression gates, executor routing, same-profile technical retry, fail-closed runtime status, and role/final runtime artifacts.
- Runtime must not write authority. Domain Gate and deterministic services own route/cycle/WorkOrder/claim/dossier/motive/evidence/trace/queue/live-experiment state transitions after admission.
- Promotion evidence is machine-verifiable. Human-readable summaries and audit narratives are optional diagnostics and must not become node-promotion acceptance criteria.

## 2026-06-03 Harness Coverage Audit
- Added `08-harness-coverage-audit.md` after checking contracts, service, unit tests, Prisma models, runnable replay, and T-099 docs.
- Conclusion: current `PaperImplementationHarness` covers proposal-only integrity, input snapshots, trace/reference/memo guards, mock/product isolation, gate/transition recording, blocker queueing, and multi-artifact output within one run.
- Partial coverage: loop exists in T-109 deterministic replay and queue vocabulary, while retry/failure/supersede exist mostly as schema or persisted fields.
- Missing production orchestration: fallback/profile escalation, debate/multi-agent review, multi-scenario orchestration, provider execution/canary, runtime identity, token/compression/cache gates, retry execution, rollback/supersede state transitions.
- Planning implication: keep harness as coverage/assertion shell; add runtime slot and admission services before claiming production orchestration.

## 2026-06-03 Node Capability Matrix
- Added `09-node-capability-matrix.md` to classify all 14 `PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES` plus deterministic surrounding flow nodes.
- Matrix defines capability expectations for loop, retry, fallback, debate, multi-scenario output, provider canary, admission, and authority boundary.
- First implementation-ready targets remain `trace_integrity_review.boundary_debate`, `claim_boundary_review.boundary_debate`, and `dossier_readiness_prep.readiness_audit`.
- Global fallback rule: product-mode provider/runtime failure must fail closed into admitted blockers or `failed_runtime`; later queue/human repair is a Domain Gate decision and must not be satisfied by mock output, fixture replay, prompt cache, or historical response reuse.

## 2026-06-03 Harness Runtime Boundary
- Added `10-harness-runtime-boundary.md` to make the harness/runtime/admission/domain/state-writer split reviewable before code.
- Boundary decision: harness owns scenario fixtures, replay/stress assertions, proposal capture, and coverage reporting only.
- Runtime slot owns context compilation, prompt/profile identity, context/prompt cache policy and keying, response-reuse guard, token budget, compression, provider/Codex/mock execution routing, and runtime audit.
- Admission owns recomputed identity, provenance class, forbidden-field checks, normalized proposal/support artifacts, normalized blocker sets, and admission rejections.
- Domain services and state writers remain the only authority mutation path after deterministic gates, trace, confirmation, and accepted-risk checks.

## 2026-06-03 RuntimeSlot Cache Ownership Correction
- Clarified that `PaperImplementationRuntimeSlot` owns runtime caching, specifically context packet cache and prompt packet cache keying, lookup result classification, stale/drift policy, metadata-only persistence, and response-reuse guard.
- Provider responses remain outside business cache semantics. A provider-required live slot may reuse context/prompt metadata on exact identity hit, but exact response reuse must miss or block and still require a live provider call when execution proceeds.

## 2026-06-03 Trace Integrity Debate Design
- Added `11-trace-integrity-debate-design.md` and renamed the first trace runtime target from `trace_integrity_review.primary_audit` to `trace_integrity_review.boundary_debate`.
- The first node is now defined as bounded semantic trace debate, not just trace-manifest validation.
- Debate shape is deterministic preflight plus four fixed semantic role slots: support mapper, skeptic, targeted reconcile, and arbiter final.
- Complexity controls: no open-ended rounds, no dynamic agents, bounded retrieval packet, no human-audit summary, no automatic trace repair, and unresolved disagreement becomes a blocker.

## 2026-06-03 Trace Debate Executor Decision
- Confirmed debate execution belongs to `PaperImplementationRuntimeSlot` through a future `PaperImplementationTraceIntegrityDebateRuntimeService` or equivalent runtime facade.
- Harness selects scenario/profile only. It must not execute prompts, choose provider SDKs, compute cache keys, or repair role outputs.
- First-slice execution modes are `mocked_llm` for deterministic fixtures, `codex_assisted` for local acceptance/diagnosis, and `provider_llm` for product-capable runtime/canary through `AgentOrchestrator -> BackendLlmGateway`.
- First-slice trace debate uses one execution mode across all four semantic roles in a debate attempt; mixed-role execution modes are deferred.
- Default first-slice semantic execution mode is `codex_assisted` for all four role slots. `provider_llm` remains an explicit L4 canary/product-capable profile and cannot be silently downgraded to Codex or mock.

## 2026-06-03 Statement Extraction Boundary
- Confirmed deterministic reviewed-statement extraction is structural only.
- The extractor must not judge sentence compoundness, split natural-language text into semantic claims, rewrite claim text, or infer missing support refs.
- Raw claim fields enter the debate with `statement_granularity_status=not_assessed`; debate roles may emit `statement_decomposition_required` when semantic support cannot be judged as one stable unit.

## 2026-06-03 Retrieval Service Caller Boundary
- Confirmed `PaperImplementationTraceIntegrityRetrievalService` is independent and deterministic/read-only.
- Product-path `buildRetrievalPacket` is called only by `PaperImplementationTraceIntegrityDebateRuntimeService`.
- Harness calls the debate runtime service, not the retrieval service; Admission may verify/read an existing retrieval packet but must not build a new runtime context.

## 2026-06-03 Blocker And Queue Ownership Boundary
- Adopted the complexity-control rule: Runtime owns discovery, Admission owns verification, Domain Gate owns state transition.
- Runtime service returns `passed`, `blocked`, or `failed_runtime`; provider/schema/parse exhaustion is a technical runtime failure, not a semantic paper-quality blocker.
- Admission verifies identity, schema, forbidden fields, retrieval/source hashes, role lineage, and blocker taxonomy. It must not invent semantic blockers, build retrieval context, or materialize queue items.
- Domain gate consumes admitted blockers and runtime status to create queue items, loopback work, or state transitions.

## 2026-06-03 First-Slice Retry Boundary
- Retry is limited to provider/schema/parse technical failures, with max one same-profile retry for the same role and same prompt/context identity.
- Retrieval drift, stale trace, source hash drift, target mismatch, missing source families, and semantic disagreement do not retry.
- First slice disables second debate rounds, automatic profile escalation, mixed-role execution modes, and fallback from `provider_llm` to Codex/mock/replay/cache output.

## 2026-06-03 Prompt Token Compression Runtime Boundary
- RuntimeSlot owns prompt packet construction, prompt template/version/variant binding, redaction policy, token-budget gates, compression policy/reporting, compressed context refs, and prompt/cache identity.
- Harness may select registered scenario/profile/slot inputs, but it must not provide rendered prompts, prompt packet hashes, token decisions, or compression decisions as trusted facts.
- Admission verifies prompt packet, token-budget, compression, redaction, cache, and output identities. It must not rebuild prompts, recompress context, or alter cache decisions.
- Token over-budget without allowed compression and compression quality failure are `failed_runtime` outcomes with zero provider calls when they happen before executor invocation.

## 2026-06-03 Per-Role Artifact Admission Boundary
- Every semantic role emits a ref-backed role runtime artifact with prompt/cache/token/compression identity and executor provenance.
- Per-role admission is a chaining gate only: it verifies whether a role artifact can feed the next role, and must not create semantic blockers, queue items, or domain transitions.
- Only the admitted final `TraceIntegrityDebateArtifact@v1` enters Domain Gate. Intermediate role artifacts are for replay, debugging, runtime audit, cache identity, and final-admission lineage verification.
- Per-role admission rejection stops the debate before the next role and produces no domain-facing final artifact.

## 2026-06-03 Existing Harness Compatibility Boundary
- Current `PaperImplementationAgentWorkflowHarnessRun` and `PaperImplementationProposalArtifact` definitions are useful as the proposal-harness evidence lane, but they do not define runtime role artifacts, runtime admission records, prompt packet identity, token/compression identity, or final runtime artifacts.
- Promotion is controlled by concrete `slot_id`, not `workflow_type` alone. For example, `trace_integrity_review.boundary_debate` is the promoted runtime slot under the existing `trace_integrity_review` workflow family.
- Existing harness records may reference runtime artifacts for replay/evidence after execution, but must not be wrapped or projected as `PaperImplementationRuntimeArtifactEnvelope`, `PaperImplementationRuntimeRoleArtifact`, `PaperImplementationRuntimeAdmissionRecord`, `TraceIntegrityRoleArtifact@v1`, or `TraceIntegrityDebateArtifact@v1`.
- Domain Gate must reject promoted-slot inputs that arrive as harness proposal artifacts instead of admitted final runtime artifacts.

## 2026-06-03 Runtime Persistence Envelope Boundary
- Added `12-runtime-persistence-envelope.md` to define the logical persistence envelope before any Prisma migration.
- Recommended two generic envelopes: `PaperImplementationRuntimeArtifactEnvelope` for `artifact_scope=role|final`, and `PaperImplementationRuntimeAdmissionRecord` for `admission_scope=role|final`.
- First-slice implementation should not create one table per semantic role and should not reuse `PaperImplementationAgentWorkflowHarnessRun` or `PaperImplementationProposalArtifact` as runtime persistence.
- Prisma migration remains an approval-gated implementation step after shared contracts and queryability requirements are confirmed.

## 2026-06-03 Shared Runtime Contract First Slice
- Added `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts`.
- Added `PaperImplementationRuntimeArtifactEnvelope@v1` and `PaperImplementationRuntimeAdmissionRecord@v1` schemas with role/final scopes, prompt/cache/token/compression identity, runtime/admission hashes, and forbidden additional properties.
- Added schema tests for role and final envelopes, role and final admissions, provider-mode response-reuse rejection, required admitted refs, rejected-admission issue codes, and prompt/provider payload leakage.
- Extracted PaperImplementation agent workflow/run/execution enum constants into `paper-implementation-agent-common-contracts.ts` so runtime and provider-variance contracts no longer depend on the harness contract for common enum semantics.
- Existing `paper-implementation-ai-workflow-harness-contracts.ts` still re-exports the same common enum constants for compatibility, but runtime/admission semantics live only in `paper-implementation-runtime-contracts.ts`.
- No Prisma schema, runtime service, route wiring, provider gateway, or production state mutation path was added.

## 2026-06-03 Runtime Contract Review Fixes
- Tightened runtime artifact schemas so legacy harness/proposal contract ids and ref types cannot be used as runtime target, payload, source, prior-role, final, or admission refs.
- Tightened provider semantics so `execution_mode=provider_llm` with `runtime_status=passed` requires `provider_call_count >= 1`; zero-call provider paths must be blocked or failed instead.
- Tightened cache semantics so context or prompt cache `hit` requires a ref-backed cache result and hash.
- Tightened admission identity with a recursive forbidden-key guard for prompt text, hidden reasoning, raw provider responses/logs, queue payloads, and authority mutation fields.
- Added a direct package export for `paper-implementation-agent-common-contracts` so consumers do not need to import common workflow/run/execution enums through the harness contract.

## 2026-06-03 In-Memory Runtime Admission First Slice
- Added `PaperImplementationRuntimeRepository` with generic runtime artifact and admission record methods, scoped list filters, and no harness/proposal compatibility methods.
- Added `InMemoryPaperImplementationRuntimeRepository` as an isolated test/runtime store for `PaperImplementationRuntimeArtifactEnvelope` and `PaperImplementationRuntimeAdmissionRecord`.
- Added `PaperImplementationRuntimeAdmissionService` with shared-schema validation, runtime artifact recording, role/final admission, expected-versus-observed identity checks, final-artifact lineage checks, and rejected-admission persistence.
- Admission consumes only ref-backed runtime envelopes. It does not build retrieval packets, prompts, compressed contexts, queue items, domain blockers, or authority state transitions.
- Admitted role records expose the role artifact payload ref/hash; admitted final records expose the final artifact ref/hash. The runtime envelope remains provenance, not a replacement for the domain-facing artifact.
- Legacy harness/proposal wrappers are rejected by shared schema before repository persistence; no new route, Prisma model, provider gateway, or state-writer entrypoint was added.

## 2026-06-03 Runtime Admission Review Fixes
- Fixed admission status handling so `runtime_status=blocked` with typed `blocker_codes` can be admitted and carried forward for Domain Gate consumption.
- Kept `runtime_status=failed_runtime` as an admission rejection because provider/schema/parse/runtime failures are technical failures, not semantic blocker evidence.
- Added a guard that rejects `runtime_status=blocked` artifacts with empty blocker codes, preventing empty blocker packets from becoming domain-facing evidence.
- Converted `AdmitPaperImplementationRuntimeArtifactRequest` into a role/final discriminated union and added runtime guards so final admission requires `expected_final_artifact_hash`, while role admission cannot carry a final hash.
- Removed the misleading `runtime_artifact_ref.version_id = artifact_contract_version` assignment; runtime artifact refs now identify the runtime artifact id without pretending the contract version is an artifact version.
- Added service coverage for forbidden legacy ref types, blocked-runtime admission, blocked-without-codes rejection, failed-runtime rejection, final expected-hash request validation, and runtime-artifact ref lineage.

## 2026-06-03 Prisma And Controlled HTTP Runtime Admission Slice
- Added Prisma SSOT models and migration for `PaperImplementationRuntimeArtifact` and `PaperImplementationRuntimeAdmissionRecord`.
- Runtime/admission persistence is generic by envelope scope (`role|final`) and admission scope (`role|final`), not one table per semantic role.
- Added queryable columns for project, slot, scope, workflow/status, target ref, runtime/admission identity hashes, source/prompt/output hashes, schema ids, and policy ids while keeping the validated envelope/record JSON for exact replay.
- Added `PrismaPaperImplementationRuntimeRepository` behind the same `PAPER_IMPLEMENTATION_REPOSITORY` strategy as the other PaperImplementation repositories; in-memory injection remains available for tests.
- Wired `PaperImplementationRuntimeAdmissionService` into `buildApp()` and the existing PaperImplementation route group.
- Kept `PaperImplementationRuntimeAdmissionService` as a required `PaperImplementationController` dependency so route registration cannot silently create a runtime-admission route without the service behind it.
- Added controlled HTTP routes:
  - `GET /paper-implementation/projects/:implementation_project_id/runtime-artifacts`
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/admit`
  - `GET /paper-implementation/projects/:implementation_project_id/runtime-admission-records`
- The POST route takes the runtime artifact id only from the URL and accepts only admission policy plus expected identity hashes in the body.
- No route was added for arbitrary runtime envelope recording; promoted runtime services must construct and persist envelopes internally after context/prompt/cache/token/compression identity is built.
- The shared admission request schema explicitly rejects body-owned `implementation_project_id` and `runtime_artifact_id` so callers cannot create a second selection path inside the request payload.

## 2026-06-03 Trace Integrity Debate Runtime And Provider Canary Slice
- Added trace-integrity debate role/final payload contracts and a runtime run request contract in `paper-implementation-runtime-contracts.ts`.
- The runtime request is slot-input only: URL owns `implementation_project_id`; runtime services own `runtime_artifact_id`; provider mode rejects fixture role outputs; non-provider modes require role outputs.
- Added `PaperImplementationTraceIntegrityDebateRuntimeService` as the first promoted runtime facade for `trace_integrity_review.boundary_debate`.
- The service executes deterministic preflight first. Preflight blockers produce admitted blocked role/final artifacts and zero provider/orchestrator calls.
- On executable requests, the service runs exactly four fixed semantic roles: support mapper, skeptic, reconcile, and arbiter final.
- Each role is recorded as a runtime artifact and admitted before the final artifact is recorded/admitted.
- The service depends on `PaperImplementationRuntimeAdmissionService` plus `TopicSelectionAgentOrchestratorService` as the current shared orchestrator implementation; it does not call provider SDKs directly and does not write PaperImplementation authority state.
- Added a PaperImplementation-specific model profile id, `paper-implementation.trace-integrity.boundary-debate.v1`, in the existing unified model-profile registry. The provider canary does not borrow topic-selection business profiles and does not create a second registry.
- Wired a controlled runtime run route through the existing PaperImplementation route group: `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/trace-integrity-boundary-debate/run`.
- Added `paper-implementation:provider-canary`, which runs the same route/service integration file with live-provider env gates enabled. The live provider test still skips when required provider credentials are absent.
- Added LLM registry entries for the PaperImplementation trace-integrity profile, prompt template, and provider-canary env keys.
- Provider canary success is an execution-path criterion, not a semantic paper-quality pass criterion: the minimal canary payload may produce `runtime_status=blocked` because it contains refs/hashes but not reviewed statement/source content. The canary passes when the live provider path completes four role calls, records no `failed_runtime` artifacts, and admits all role/final artifacts.
- Fixed the shared agent orchestrator provider-schema adaptation so provider requests flatten `allOf` and drop provider-incompatible `not` / `propertyNames` constraints before `BackendLlmGateway` execution. The original schema still validates returned structured output after provider execution.
- Fixed role artifact `call_index` identity so the four semantic role artifacts record `1, 2, 3, 4` rather than starting at `2`.

## 2026-06-03 Trace Integrity Runtime Review Fixes
- Added `PaperImplementationTraceIntegrityRetrievalService` as the deterministic retrieval packet builder for `trace_integrity_review.boundary_debate`.
- Runtime request packets now accept `reviewed_statement_packets` and `source_packets`; extractor output remains structural and semantic granularity remains debate-owned.
- Retrieval packet identity binds reviewed statements, source packets, source hashes, freshness, blockers, and warnings before role execution. The runtime service owns packet construction; admission verifies the already-built packet and never rebuilds retrieval context.
- Role and final runtime envelopes now persist a JSON-safe `artifact_payload`, not only refs and hashes. Role payloads include retrieval packet, role output, and prior role outputs; the final payload is the admitted debate artifact including the retrieval packet.
- Prompt packet cache result semantics are surfaced from `TopicSelectionAgentOrchestratorService` into runtime provenance instead of using placeholder cache hashes.
- Runtime token-budget identity now uses the orchestrator token-budget result hash where available; non-role/preflight/final envelopes mark token gates as `not_applicable` instead of fabricating a passing budget gate.
- Provider execution context is caller-owned: PaperImplementation role calls pass `feature_id=paper_implementation` while topic-selection callers continue to default to `topic_selection`.
- Added a small common topic-selection runtime contract module for shared cache result enums to avoid ESM circular dependency and semantic drift between invocation and runtime contracts.
- Admission idempotency is now identity-hash based. In-memory and Prisma repositories can find an existing admission record by `(implementationProjectId, admissionIdentityHash)`, and Prisma has a unique index on that pair.
- `artifact_payload` is normalized through JSON serialization before schema validation so optional refs cannot persist as `undefined` and fail later under Ajv/Prisma JSON semantics.
- No second runtime route, second provider gateway, or harness-wrapper compatibility path was added. The controlled run route remains the only PaperImplementation trace-integrity runtime entrypoint.

## 2026-06-03 P1 Remaining Runtime Slots And Domain Gate Slice
- Added the remaining first-slice P1 runtime review contracts for `claim_boundary_review.boundary_debate` and `dossier_readiness_prep.readiness_audit`.
- Both slots use the same generic `PaperImplementationRuntimeArtifactEnvelope` and `PaperImplementationRuntimeAdmissionRecord` contracts; no harness proposal wrapper, one-table-per-role model, or alternate runtime persistence path was added.
- Added `PaperImplementationP1RuntimeReviewService` as a bounded semantic debate/audit runtime facade. It records fixed role artifacts, admits each role, records one final artifact, and returns `passed`, `blocked`, or `failed_runtime`.
- Claim-boundary uses three fixed role slots: boundary critic, evidence skeptic, and adjudicator final.
- Dossier-readiness uses three fixed role slots: readiness reviewer, blocker skeptic, and scenario adjudicator final.
- Runtime owns prompt/context/cache/token/compression identity and forwards `feature_id=paper_implementation` through the existing `TopicSelectionAgentOrchestratorService`.
- Non-provider fixture modes require all role outputs in the runtime request; provider mode rejects fixtures and must traverse the shared orchestrator/gateway path.
- Preflight blockers produce admitted blocked role/final artifacts with zero provider calls. They do not create queue items or domain state changes.
- Added controlled runtime run routes:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/claim-boundary-debate/run`
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/dossier-readiness-audit/run`
- Added PaperImplementation-specific model profiles and prompt templates for both P1 slots inside the existing unified LLM registry.
- Added `PaperImplementationRuntimeDomainGateService` as the deterministic consumer of admitted final P1 runtime artifacts.
- Domain Gate accepts only admitted final artifacts for the supported P1 slots and delegates materialization to the existing deterministic claim/dossier service.
- Domain Gate rejects role artifacts, blocked final artifacts, unsupported slots, missing `domain_gate_request`, and non-admitted runtime outputs.
- Domain Gate is idempotent against existing claim/dossier ids and does not create a second authority writer.
- Added controlled Domain Gate route:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate`
- `PaperImplementationController` now requires `PaperImplementationP1RuntimeReviewService` and `PaperImplementationRuntimeDomainGateService` at construction time, matching `buildApp()` production wiring and avoiding route-registered-but-service-optional drift.

## 2026-06-03 Harness Runtime Cooperation Test
- Added a service-composition test that runs `PaperImplementationP1RuntimeReviewService` through runtime admission, then passes the admitted final artifact ref into `PaperImplementationAiWorkflowHarnessService` as a proposal artifact ref.
- The positive path proves harness can record runtime-backed proposal evidence without becoming a runtime artifact, admission record, or authority writer.
- The negative path proves the same runtime final artifact is blocked when supplied through `direct_authority_mutation_refs`.
- The test keeps semantic interpretation packets out of `source_refs`; runtime final artifacts belong in `artifact_ref`, while proposal `source_refs` must remain covered by the input snapshot and memo/evidence rules.
- This preserves the boundary: Runtime produces admitted support artifacts, Harness records proposal-only evidence, and Domain Gate remains the only bridge into deterministic authority materialization.
- Direct route-test controller fixtures now explicitly provide P1 runtime and Domain Gate dependencies, so tests cannot silently register the new HTTP routes with missing production services.

## 2026-06-03 P1 Runtime And Domain Gate Review Fixes
- P1 runtime requests now fail before provider/orchestrator calls when `model_profile_id` is present and does not match the route-owned runtime slot profile.
- Provider-mode P1 requests now fail before provider/orchestrator calls when `model_option_id` is present but does not belong to the route-owned slot profile id.
- Domain Gate now compiles and applies the existing shared `createClaimCandidateRequestSchema` and `createImplementationDossierRequestSchema` before calling the deterministic domain service.
- Malformed `domain_gate_request` payloads now return `INVALID_PAYLOAD` and do not invoke claim/dossier materialization.
- Domain Gate idempotency is now same-id plus same materialization identity. Existing claim/dossier records are treated as `already_materialized` only when the normalized request identity matches the existing domain artifact.
- Same claim/dossier id with different materialization payload now returns `VERSION_CONFLICT` instead of silently attaching the runtime artifact to an unrelated domain record.
- The Domain Gate test fake now consumes runtime-provided mocked role outputs and constructs fake domain objects from the request shape, so malformed/drifted runtime final payloads cannot be hidden by a hardcoded test double.

## 2026-06-03 P1 Provider Canary And Prisma Smoke Gate
- Extended the existing `paper-implementation:provider-canary` command to enable trace-integrity, claim-boundary, and dossier-readiness live canaries in one route integration run.
- P1 provider canaries use the same controlled runtime routes as deterministic coverage:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/claim-boundary-debate/run`
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/dossier-readiness-audit/run`
- Both P1 live canaries traverse `PaperImplementationP1RuntimeReviewService`, the shared `TopicSelectionAgentOrchestratorService`, `BackendLlmGateway`, `PaperImplementationRuntimeAdmissionService`, and the in-memory runtime repository used by route integration.
- P1 live canary success requires three provider role calls, four runtime artifacts, no `failed_runtime` artifacts, and admitted role/final artifacts. It does not require semantic paper-quality `passed` beyond non-runtime-failure execution.
- Added `paper-implementation:runtime-prisma-smoke`, gated by `T114_RUNTIME_PRISMA_SMOKE=1`, `DATABASE_URL`, and `PAPER_IMPLEMENTATION_REPOSITORY=prisma`.
- The Prisma smoke first verifies the target DB has `PaperImplementationRuntimeArtifact` and `PaperImplementationRuntimeAdmissionRecord` tables. This is intentional fail-fast behavior before executing a runtime path against an unmigrated database.
- The first local smoke failed before runtime execution because the configured local DB had not applied `20260601090000_drop_research_argument_legacy_models` or `20260603100000_add_paper_implementation_runtime_admission`.
- Legacy `ResearchArgument*` tables were checked before applying migrations and were absent in the local dev schema, so the legacy drop migration had no rows to delete locally.
- After user-directed repair, `pnpm db:dev:migrate` applied both pending migrations to the local dev schema and `paper-implementation:runtime-prisma-smoke` passed.
- The successful smoke persisted runtime/admission rows through the Prisma-backed `PAPER_IMPLEMENTATION_REPOSITORY=prisma` path and read them back through the controlled HTTP list routes.

## 2026-06-03 L5 Stress/Compression/Adversarial
- Added `apps/backend/src/services/paper-implementation-runtime-l5-stress.unit.test.ts` as deterministic L5 coverage for the current first-slice runtime slots.
- Added `paper-implementation:runtime-stress`, backed by `.ai/scripts/paper-implementation-runtime-stress.mjs`. The runner does not introduce a new runtime entrypoint; it only executes service/route tests and writes `.ai/.tmp/paper-implementation-runtime-stress/<run-id>/90-summary.json`.
- Trace-integrity L5 now covers long retrieval context over budget, adversarial prompt contamination (`raw_provider_log`/`api_key`), and forbidden provider output fields. All three fail through the same role runtime artifact plus rejected admission path, with no final artifact.
- P1 L5 now covers over-budget source bundles, forbidden provider output fields, and compression provenance carry-through into role/final artifacts.
- Trace failed-runtime role artifacts no longer persist the full retrieval packet. They keep `retrieval_packet_ref`, `retrieval_packet_hash`, and an excerpt-free summary, while successful role artifacts keep the full retrieval packet payload for semantic consumption.
- The stress runner summary now derives L5 case coverage from parsed TAP subtest status. Missing, skipped, failed, or renamed required L5 cases make the runner summary fail instead of relying on static assertion booleans.
- This keeps complexity bounded: runtime discovers/blockers and records minimal evidence, admission verifies/rejects, and Domain Gate still only consumes admitted final P1 artifacts.

## 2026-06-04 L6 Near-Prod Runtime Gate
- Added `.ai/scripts/paper-implementation-near-prod-runtime-gate.mjs` and `paper-implementation:near-prod-runtime-gate`.
- The L6 runner emits `.ai/.tmp/paper-implementation-near-prod-runtime-gate/<run-id>/90-summary.json` with `NearProdRuntimeGateSummary@v1`.
- L6 status is `passed | blocked | failed`: missing `DATABASE_URL`, provider key, or migration readiness is `blocked`; route/runtime/admission/domain behavior failures are `failed`; skipped TAP tests cannot produce `passed`.
- Added `apps/backend/src/routes/paper-implementation-near-prod-runtime-gate.integration.test.ts` as the L6 route-level gate. It is skipped by default and enabled only with `T114_NEAR_PROD_RUNTIME_GATE=1`.
- The L6 route gate uses `buildApp()`, live provider execution through `TopicSelectionAgentOrchestratorService -> BackendLlmGateway`, Prisma runtime/admission persistence through `PAPER_IMPLEMENTATION_REPOSITORY=prisma`, and controlled PaperImplementation HTTP routes.
- The L6 evidence covers trace-integrity, claim-boundary, and dossier-readiness live provider canaries, plus claim-boundary Domain Gate materialization through the HTTP route.
- The Domain Gate path now treats same-payload create conflicts as idempotent replay: if concurrent materialization races on the same claim/dossier id, the loser re-reads the existing domain artifact, verifies the same materialization identity, and returns `already_materialized`.
- Different-payload materialization for the same claim/dossier id still returns `VERSION_CONFLICT`; this remains a semantic drift failure, not idempotent replay.
- The L6 runner does not create runtime artifacts, call provider SDKs, or wrap harness proposal artifacts. It only runs preflight checks and the route-level gate, then records sanitized route/provider/Prisma/idempotency evidence.

## 2026-06-04 L6 Gate Review Fixes
- `paper-implementation:near-prod-runtime-gate` now starts the runner directly instead of relying on Node's `--env-file=.env.local` pre-loader.
- The runner now loads `.env.local` itself when present and records only env-file status/count metadata in the summary. Missing env files now produce a `blocked` summary instead of exiting before the runner can report status.
- The runner now validates route-gate evidence after `02-near-prod-route-gate` passes. Missing or incomplete route/provider/Prisma/idempotency/no-dual-track/redaction evidence makes the L6 summary `failed`.
- `no_dual_track_evidence` and `redaction_guardrails` are no longer filled with static defaults when the evidence file is absent; they remain `null` unless the route gate writes them.
- The summary includes `evidence_validation` so future audits can distinguish skipped evidence from verified route-level evidence.
- Child step timeout handling now records `timed_out`/`timeout_ms`, sends `SIGTERM`, and then sends `SIGKILL` after a bounded grace window if the child process does not exit.
- These fixes did not add a second runtime entrypoint. The runner still only performs preflight checks and invokes the existing route-level test through `node --test`.

## 2026-06-04 L6 Runner Meta-Tests
- Added `.ai/scripts/paper-implementation-near-prod-runtime-gate.meta.test.mjs`.
- Added `paper-implementation:near-prod-runtime-gate-meta` as a deterministic runner-only test command.
- The meta-tests import runner state-machine helpers without executing `main()`. This required a CLI main guard and exported pure helper functions, but it does not create an alternate runtime, provider, Prisma, or harness path.
- Covered cases:
  - passed TAP with missing route evidence produces `failed` summary and no static no-dual-track/redaction fallback;
  - passed TAP with incomplete provider/no-dual-track evidence produces `failed` summary;
  - timed-out child step records `timed_out=true`, writes a timeout log, and exits the child;
  - missing env-file package entry reaches the runner and writes a `blocked` summary.
- `writeSummary()` now ensures the artifact directory exists, so summary persistence is robust even when tested or called independently from `main()`.

## 2026-06-04 Fail-Closed Provider/Runtime Negative Paths
- Extended L5 deterministic stress coverage with provider gateway failure for trace-integrity and P1, plus schema-invalid provider output for P1.
- Provider failure and schema-invalid output now assert the same fail-closed runtime path: one provider-mode role artifact, rejected runtime admission, no final runtime artifact, no `domain_gate_request`, and no fallback to `mocked_llm` or `codex_assisted`.
- Extended `.ai/scripts/paper-implementation-runtime-stress.mjs` so required L5 cases include the provider failure and schema-invalid subtests. Missing, skipped, failed, or renamed cases still fail the runner summary.
- Added HTTP route negative coverage proving provider gateway failure fails closed for all three promoted product slots: trace-integrity, claim-boundary, and dossier-readiness.
- Added HTTP route negative coverage proving schema-invalid provider output fails closed on the claim-boundary slot before any final/domain artifact is created.
- Added HTTP Domain Gate negative coverage for blocked and failed runtime artifacts. The route returns `GATE_CONSTRAINT_FAILED` and does not materialize claim/dossier authority.
- This remains single-path runtime execution: route tests call `buildApp()` runtime routes; runtime services call the shared `TopicSelectionAgentOrchestratorService`; the L5 runner only invokes tests and parses TAP.

## 2026-06-04 Bounded Retry And Replay Idempotency
- Added same-profile bounded technical retry to `PaperImplementationTraceIntegrityDebateRuntimeService` and `PaperImplementationP1RuntimeReviewService`.
- Retry is limited to provider-mode technical failures: `TimeoutError`, `TransientError`, `RateLimitError`, `UpstreamError`, and `SCHEMA_VALIDATION_FAILED`.
- Retry does not change execution mode, executor path, model profile, model option, prompt template/version, prompt variant, context identity, or role node identity. It only changes the `invocation_attempt_id` with a `.retry-1` suffix while keeping `node_attempt_id` stable.
- Retry is role-local. Already admitted prior role artifacts remain the lineage input for later roles and are not re-executed.
- Runtime records only the final role attempt as a runtime artifact. Recovered roles record `retry_attempt_index=1`, cumulative provider calls, and `RUNTIME_TECHNICAL_RETRY_RECOVERED`; exhausted roles record `retry_attempt_index=1`, cumulative provider calls, and `RUNTIME_TECHNICAL_RETRY_EXHAUSTED`.
- Retry exhaustion still fails closed: one failed role runtime artifact, rejected admission, no final runtime artifact, no Domain Gate payload, and no fallback to mocked/Codex/replay/cache output.
- L5 now covers trace transient retry recovery, trace retry exhaustion, P1 current-role retry without prior-role rerun, P1 retry exhaustion, and P1 schema-invalid retry exhaustion.
- Runtime route integration now expects provider/schema failures to retry once before returning the same fail-closed runtime response shape.
- Runtime admission service now has replay coverage for rejected failed-runtime admissions, not only admitted role/final records.
- Removed an unused retry outcome field during review so there is no unconsumed semantic surface that could drift from persisted runtime evidence.
- The stress runner required L5 case list now includes 11 parsed TAP-bound cases and remains a runner-only verification wrapper, not a runtime entrypoint.

## 2026-06-04 Live Fail-Closed Provider Canary
- Added `T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE` as an opt-in live negative canary flag in the LLM config key registry.
- Added `paper-implementation:provider-fail-closed-canary` as a package script that runs the existing PaperImplementation runtime route integration file with only the fail-closed canary flag enabled.
- Added a route integration test that uses the real `BackendLlmGateway` while temporarily replacing the selected provider API key with an explicit invalid key inside the test scope.
- The canary runs the same promoted runtime routes for trace-integrity, claim-boundary, and dossier-readiness. It does not call provider SDKs directly and does not create a provider-only script path.
- The canary accepts canonical provider failure codes such as `AuthError`, `TimeoutError`, `TransientError`, `RateLimitError`, `UpstreamError`, or `InvalidRequestError`, because the production invariant is fail-closed behavior rather than a provider-specific error text.
- Required fail-closed assertions: `failed_runtime` status, one provider-mode role artifact, no `mocked_llm`/`codex_assisted` fallback artifact, rejected admission, no final runtime artifact, no final admission, and no `domain_gate_request`.
- The test restores real provider environment variables after execution, so invalid-key canary state cannot leak into positive canaries.
- Updated `.ai/scripts/paper-implementation-runtime-stress.mjs` so deterministic L5/stress runs explicitly clear `T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE` and list it in runner guardrails.

## 2026-06-04 Promoted Slot Operational Telemetry
- Added `PaperImplementationRuntimeOperationalTelemetry@v1` as a backend-only result envelope in `apps/backend/src/services/paper-implementation-runtime-operational-telemetry.ts`.
- Trace-integrity, claim-boundary, and dossier-readiness runtime results now include `operational_telemetry` generated from the same in-memory result artifacts and admission records returned by the promoted runtime services.
- The telemetry envelope records provider-call consistency without double-counting final artifacts: `provider_call_count` is compared to role-provider calls when no final exists, or final-provider calls when a final artifact exists.
- Runtime/admission cardinalities are reported as derived counts: runtime artifact count, role/final artifact counts, admission count, admitted/rejected count, failed-runtime artifact count, blocked artifact count, and final artifact/admission presence.
- Retry telemetry counts only role artifacts. `retry_recovered_role_count` and `retry_exhausted_role_count` ignore final artifact warnings so recovered/exhausted retries are not counted twice.
- The envelope also reports response-reuse status counts, context-cache status counts, prompt-cache status counts, non-provider artifact count, runtime failure codes, blocker/warning codes, and admission issue codes.
- This does not add a new HTTP route, persistence table, shared schema authority, admission policy, harness wrapper, or provider execution path. Existing runtime run routes return the telemetry because they already return the service result.
- Tests assert telemetry on passed provider routes, blocked preflight, deterministic fail-closed retry exhaustion, transient retry recovery, live fail-closed canary responses, and near-prod provider canary responses.

## 2026-06-04 Result Analysis Interpretation Scenarios Promotion
- Promoted `result_analysis.interpretation_scenarios` as the first remaining-node production slice after the P1 runtime pattern stabilized.
- Added result-analysis slot constants, request schema, role output schema, final interpretation-scenario artifact schema, and Domain Gate payload validation to the shared PaperImplementation runtime contracts.
- The promoted output is scenario-oriented: positive, negative, inconclusive, and failed-run interpretations are first-class outputs, but they remain interpretation packets and do not become evidence or claim authority by themselves.
- Added `PaperImplementationResultAnalysisRuntimeService` as a single-role runtime facade. It uses the same runtime/admission repository, the same `PaperImplementationRuntimeAdmissionService`, and the same `TopicSelectionAgentOrchestratorService -> BackendLlmGateway` execution path as the already promoted slots.
- Preflight blockers record blocked role/final artifacts with zero provider calls. Provider/schema failures perform at most one same-profile technical retry, then fail closed with a rejected role admission, no final artifact, and no Domain Gate payload.
- Added a controlled runtime run route:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/result-analysis-scenarios/run`
- The route is wired through `buildApp()` and `PaperImplementationController`; it is not a generic runtime-envelope write route and it does not expose a second provider, harness, or admission entrypoint.
- Added PaperImplementation-specific model profile and prompt-template registry entries for `paper-implementation.result-analysis.interpretation-scenarios.v1`.
- Extended `PaperImplementationRuntimeDomainGateService` so an admitted final result-analysis artifact materializes through the deterministic result-claim/dossier service as a `result_interpretation_packet`.
- Domain Gate validates the runtime final artifact, validates the `createResultInterpretationPacket` request shape, handles same-identity replay as `already_materialized`, and returns conflict on same-id/different-payload drift.
- Extended route integration, service tests, L5 stress, L6 near-prod route-gate evidence, L6 runner evidence validation, and runner meta-tests so result-analysis is covered by the same production-grade closure pattern as the P1 slots.
- This keeps the harness/runtime boundary clean: the harness may later reference the admitted runtime final artifact as proposal evidence, but the runtime final artifact is not a harness proposal wrapper and cannot directly mutate claim/dossier/result authority outside Domain Gate.

## 2026-06-04 Result Analysis Review Fixes
- Tightened result-analysis passed semantics so a passed final artifact must carry all four required scenario kinds: `positive`, `negative`, `inconclusive`, and `failed_run`.
- Passed result-analysis role output must include a `domain_gate_request`; the runtime service also performs semantic checks before recording a final artifact so schema-compatible but incomplete role output cannot be admitted as passed final evidence.
- Added retryable semantic failure codes for result-analysis role output: `RESULT_ANALYSIS_DOMAIN_GATE_REQUEST_MISSING` and `RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE`.
- Semantic incompleteness now follows the same fail-closed product path as provider/schema failure: one same-profile retry, one failed role runtime artifact after retry exhaustion, rejected admission, no final artifact, no Domain Gate payload, and no fallback to mock/Codex/replay/cache output.
- Added HTTP route coverage for result-analysis slot profile/model-option drift before gateway calls.
- Added HTTP Domain Gate coverage proving result-analysis final artifacts materialize into `result_interpretation_packet` through the existing materialize route, replay as `already_materialized`, reject malformed payloads as `INVALID_PAYLOAD`, and reject same-id/different-payload drift as `VERSION_CONFLICT`.
- Added route-test domain seeds for result-analysis materialization: active project, validation cycle, trusted run evidence unit, result trace manifest, and in-memory domain repositories. This keeps the test aligned with production Domain Gate constraints instead of relying on a pre-existing object or bypass.
- Extended L5 required-case coverage with `result_analysis_incomplete_scenario_set_retry_exhausted_no_domain_gate_payload`.
- Extended L6 route-gate evidence and runner validation with `result_analysis_domain_gate_evidence`, requiring materialized result packet status, replay status, drift conflict, and `result_interpretation_packet` domain ref.

## 2026-06-04 Experiment Design / Critique P2 Promotion
- Promoted `experiment_design.work_order_draft` and `experiment_critique.plan_critique` as the next P2 production slice after result-analysis.
- Added shared runtime constants, request schema, role output schema, final artifact schema, and schema tests for experiment planning outputs.
- `experiment_design.work_order_draft` produces admitted WorkOrder draft candidates with route/probe, metric, dataset, baseline, code, config, run policy, budget, stop-rule, and confirmatory/exploratory refs. It does not create WorkOrders.
- `experiment_critique.plan_critique` produces admitted critique findings and a `critique_decision` with `no_execution_side_effect=true`. It does not call the live experiment adapter, create WorkOrders, or submit experiment runs.
- Added `PaperImplementationExperimentPlanningRuntimeService` as a shared two-slot runtime facade using the existing `PaperImplementationRuntimeAdmissionService` and `TopicSelectionAgentOrchestratorService -> BackendLlmGateway` execution path.
- Provider/schema failures perform at most one same-profile technical retry, then fail closed with one rejected role artifact, no final artifact, and no Domain Gate or WorkOrder/live-adapter side effect.
- Added controlled runtime run routes:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-design-work-order-draft/run`
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-critique-plan-critique/run`
- Added PaperImplementation-specific model profiles, prompt templates, config keys, and default backend model-profile registry entries for both P2 slots.
- HTTP route tests prove both routes use the production service/admission path, reject slot profile/model-option drift before gateway calls, fail closed on provider gateway failure, and reject Domain Gate materialization for experiment planning artifacts.
- L5 stress now includes required P2 cases for experiment-planning provider failure and critique dimension incompleteness; deterministic stress disables both new live canary flags.
- L6 near-prod route-gate evidence now requires both P2 runtime routes, one live provider call per P2 slot, and proof that admitted P2 final artifacts carry no `domain_gate_request` and are rejected by the HTTP Domain Gate materialization route with `GATE_CONSTRAINT_FAILED`.
- The harness/runtime boundary remains clean: harness records may later reference admitted P2 runtime final artifacts as proposal evidence, but runtime artifacts are not harness wrappers and cannot directly mutate WorkOrder or live experiment authority.

## 2026-06-04 Experiment Planning Review Fixes
- Tightened `work_order_draft_request` from a generic JSON payload to the real shared `CreateResearchWorkOrderDraftRequest` type/schema, so admitted WorkOrder draft candidates must be directly consumable by deterministic WorkOrder draft validation.
- Updated shared schema, service, and route fixtures to include complete run policy, experiment bridge, trace manifest, dataset, baseline, code, and config references.
- Added negative schema coverage proving minimal malformed `work_order_draft_request` payloads are rejected instead of being admitted as generic runtime payloads.
- Removed executor-kind semantic drift for `experiment_critique.plan_critique`: runtime profile/artifact evidence now records `single_agent`, matching the actual `TopicSelectionAgentOrchestratorService` invocation. Independent critique semantics remain in the role slot id, profile, and prompt, not in a fake executor path.
- Tightened P2 live canary and L6 evidence so experiment-design and experiment-critique boundary evidence must reach `status=passed` before no-Domain-Gate/no-WorkOrder/no-live-adapter evidence is accepted.
- These fixes do not add a second runtime path. The HTTP routes still call the same experiment-planning runtime service, the service still calls the shared orchestrator/gateway path, and the near-prod runner still validates route-written evidence rather than producing runtime artifacts itself.

## 2026-06-04 Live L6 Provider/Prisma Gate Fixes
- First live OpenAI L6 run reached Prisma readiness but failed result-analysis with provider `InvalidRequestError`. Root cause was provider-compatible schema drift: internal schemas with `allOf/if/then` were being passed through to OpenAI strict structured output.
- `TopicSelectionAgentOrchestratorService` now strips conditional JSON-schema keywords (`if`, `then`, `else`, `dependentRequired`, `dependentSchemas`) only from the provider-compatible schema. The original internal schema remains unchanged for AJV validation and runtime semantic gates.
- Experiment-planning runtime requests now support optional `source_context_packets` with explicit source ref, evidence kind, content summary, and key facts. These packets are included in source identity hashing, prompt material, and token-budget context so live critique can inspect plan content instead of opaque refs.
- The near-prod and route live payloads now provide reviewable experiment-plan context for P2 critique without creating WorkOrders, invoking the live experiment adapter, or adding a Domain Gate path.
- L6 provider-call assertions now accept bounded same-profile retry recovery: trace-integrity `4..8`, P1 slots `3..6`, and single-role slots `1..2`. Runner evidence validation checks the same bounded ranges.
- The bounded range keeps production retry semantics honest: retry recovery is allowed, but unlimited provider calls, fallback execution, or missing live calls still fail L6.
- OpenAI L6 reruns exposed real provider variability: after schema fix, one run passed through result-analysis and P2 design but critique hit a provider `TransientError` retry exhaustion. This is recorded as live provider instability, not deterministic runtime closure.
- DashScope live L6 passed end to end with provider id `dashscope`: live provider calls, Prisma runtime/admission repository, HTTP runtime routes, HTTP Domain Gate materialization/replay/drift, result-analysis Domain Gate evidence, P2 no-Domain-Gate boundary evidence, no-dual-track evidence, and redaction guardrails all validated through runner evidence.

## 2026-06-04 Deep Cleanup / Product Fixture Boundary Fix
- Deep cleanup review found one remaining semantic ambiguity: the new runtime services rejected provider fixture fallback at the orchestrator/schema path, but direct service callers could still submit `run_mode=product` with `mocked_llm` or `codex_assisted` and receive admitted runtime artifacts.
- Tightened all promoted runtime service request guards so `product` mode requires `provider_llm` before any role invocation. The same guard now exists in the shared runtime artifact envelope schema and all four runtime run request schemas.
- Added service-level negative coverage for trace-integrity, P1 claim/dossier, result-analysis, and experiment design/critique proving product fixture modes and provider-mode fixture payloads are rejected before orchestrator calls.
- Updated schema tests so non-provider fixture examples are `dry_run` examples, not product examples; added explicit negative coverage for product non-provider runtime artifacts and P1 product non-provider requests.
- Normalized runtime repository and admission-service positive fixtures from `product + codex_assisted` to `dry_run + codex_assisted`; `product + mocked_llm/codex_assisted` now appears only as intentional negative coverage.
- Deleted ignored T-114 temporary run outputs under `.ai/.tmp/paper-implementation-runtime-stress` and `.ai/.tmp/paper-implementation-near-prod-runtime-gate`. Source scripts, tests, task docs, LLM registry entries, Prisma migration, and shared/backend implementation files remain intact.
- Follow-up no-dual-track scans found only intended test negative fixtures: provider-only wording inside L5 leakage tests, harness refs inside schema rejection tests, and experiment-planning tests asserting no `domain_gate_request`.

## Decisions To Confirm
- Whether local Prisma smoke should be promoted to a default CI check after runtime/admission rows are stable, or remain an explicit local/prod-readiness verification.
- Whether `paper-implementation:runtime-stress` should become the default deterministic T-114 closure gate for all newly promoted slots, or stay a local/prod-readiness command until every remaining node is promoted.

## 2026-06-07 Route Slice Cross-Cutting Alignment
- Locked the first route-slice documentation decision in `13-pending-node-processing-matrix.md`: do not extract a full shared debate execution helper before promoting `route_architecture.route_candidates` and `route_skeptic_review.route_risk_critique`.
- Route-slice runtime work should stay slot-local for execution semantics and may only share small pure helpers that do not own slot execution, prompt/profile resolution, retry/fallback policy, admission, or Domain Gate behavior.
- Added a required profile resolution block template for every future promoted slot. The block forces each slot to state profile id, prompt template, role slots, output contracts, YAML candidate source, backend registry source, provider options, normalized params, timeout, retry/fallback policy, product eligibility, request policy, and required negative tests.
- The template keeps model option visibility machine-checkable: implementation acceptance still depends on schema/service/route/registry tests proving route-owned profile identity, explicit model-option membership when supplied, resolved provider option lineage, and `product -> provider_llm`.
- No runtime service, route, schema, registry, Prisma, or runner code changed in this pass. The next step is to use the new template to align `route_architecture.route_candidates` before adding code.

## 2026-06-07 Route Architecture Node Alignment
- Added the concrete `route_architecture.route_candidates` alignment block to `13-pending-node-processing-matrix.md`.
- Locked first-slice scope as proposal-only runtime: the node may produce admitted route candidate proposal artifacts, but it must not create `TechnicalRouteCandidate`, mutate `ValidationCycle`, create queue items, or emit Domain Gate payloads.
- Profile resolution is now explicit for the node: `paper-implementation.route-architecture.route-candidates.v1`, prompt template `paper-implementation-route-architecture-route-candidates`, role `route_architecture.route_candidate_designer`, provider-only product mode, medium default output budget, and max-one same-profile technical retry.
- Output contract minimum is machine-checkable: passed outputs need at least two runtime-local route candidate proposals with route summary, expected information gain, baseline gap status, metric/data/baseline/code/config refs, scope boundary, confirmatory marker, trace ref, blockers, and warnings.
- Added forbidden authority fields for this node: persisted `route_candidate_id`, validation-cycle patches, deterministic create requests, Domain Gate requests, queue actions, WorkOrder requests, and live experiment requests.
- Added the node's minimum L5 list: product non-provider rejection, provider fixture rejection, model-option drift rejection, over-budget zero-call, provider failure retry exhaustion, schema-invalid retry exhaustion, route/cycle mutation rejection, source/cycle drift blocking, and harness proposal artifact no-dual-track coverage.
- No code was changed in this pass. The next discussion point is whether `route_skeptic_review.route_risk_critique` should consume only the admitted route proposal final artifact or also accept deterministic `TechnicalRouteCandidate` refs as secondary context.

## 2026-06-07 Route Skeptic Review Node Alignment
- Added the concrete `route_skeptic_review.route_risk_critique` alignment block to `13-pending-node-processing-matrix.md`.
- Locked input policy as the recommended route-slice option: an admitted `route_architecture.route_candidates` final artifact is required as primary input; deterministic `TechnicalRouteCandidate` refs are optional secondary context only and cannot start the skeptic slot by themselves.
- Kept the first slice critique-only: the slot produces admitted risk critique artifacts, but it must not create queue items, mutate route/cycle authority, update `TechnicalRouteCandidate`, or emit Domain Gate payloads.
- Profile resolution is now explicit for the node: `paper-implementation.route-skeptic-review.route-risk-critique.v1`, prompt template `paper-implementation-route-skeptic-review-route-risk-critique`, role `route_skeptic_review.independent_route_critic`, provider-only product mode, medium default output budget, and max-one same-profile technical retry.
- Output contract minimum is machine-checkable: reviewed candidate key, proposal ref/hash, risk level/codes, blocker/warning codes, scope/budget/baseline/metric/dataset-code-config findings, confirmatory/exploratory findings, repair suggestions, recommended disposition, and `no_queue_side_effect=true`.
- Added forbidden authority fields for this node: queue actions, validation-cycle patches, deterministic route create/update requests, Domain Gate requests, WorkOrder requests, and live experiment requests.
- Added the node's minimum L5 list: missing admitted route proposal rejection, deterministic route primary-input rejection, harness proposal primary-input rejection, product non-provider rejection, provider fixture rejection, model-option drift rejection, missing critique dimension retry exhaustion, provider failure retry exhaustion, mutation field rejection, and proposal hash/source drift blocking.
- No code was changed in this pass. The route slice is now aligned enough to discuss implementation sequencing for shared route-planning contracts and `PaperImplementationRoutePlanningRuntimeService`.

## 2026-06-07 Route Planning Runtime Slice Promotion
- Promoted `route_architecture.route_candidates` and `route_skeptic_review.route_risk_critique` through a slot-local `PaperImplementationRoutePlanningRuntimeService`.
- Added shared route-planning runtime contracts: slot/profile/prompt/role constants, request schema, role output schema, final artifact schema, route candidate proposal schema, skeptic finding schema, and source context packet schema. The two slots share `PaperImplementationRoutePlanningRoleArtifact@v1` and `PaperImplementationRoutePlanningArtifact@v1`, but execution semantics remain slot-local.
- Added the context family `paper_implementation_route_planning` to the shared topic-selection LLM runtime contract so route planning can use the existing prompt/context/cache/compression pipeline without a side entrance.
- Added controlled HTTP runtime routes:
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/route-architecture-route-candidates/run`
  - `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/route-skeptic-review-route-risk-critique/run`
- Added PaperImplementation-specific backend model-profile registry entries and YAML registry entries for both route profiles. Product mode remains provider-only, provider fixtures are rejected, and model option ids must belong to the resolved slot profile.
- Route architecture final artifacts are proposal-only: no `TechnicalRouteCandidate` create request, no validation-cycle mutation, no queue action, and no Domain Gate request.
- Route skeptic final artifacts are critique-only and require an admitted route architecture final artifact as primary input. Deterministic `TechnicalRouteCandidate` refs remain secondary context only.
- Extended HTTP runtime route coverage to prove both route slots use production runtime/admission paths, reject Domain Gate materialization, and participate in every-product-slot provider-failure fail-closed coverage.
- Extended L5 stress so route provider failure, incomplete route candidate set, and incomplete skeptic dimension coverage are required cases. The stress runner also now loads the route planning service unit test in the runtime service/route regression step.
- No shared bounded-debate execution helper was extracted. This slice only added shared contracts and registry identity; orchestration, retry, admission, and no-side-effect assertions stay owned by the route planning runtime service.

## 2026-06-07 Validation Cycle Planning Alignment
- Added the concrete `validation_cycle_planning.cycle_candidates` alignment block to `13-pending-node-processing-matrix.md`.
- Locked the first slice as route-bound and proposal-only. The runtime slot must consume admitted `route_architecture.route_candidates` and admitted `route_skeptic_review.route_risk_critique` final artifacts with matching proposal hash and reviewed candidate key.
- Kept deterministic authority in `PaperImplementationValidationCyclePlanningService`: runtime must not produce a submit-ready `CreateValidationCycleDraftRequest`, create/admit `ValidationCycle`, create `TechnicalRouteCandidate`, create `FeasibilityProbe`, create `ExperimentPlanLight`, create queue items, or emit Domain Gate payloads.
- Profile resolution is now explicit for the node: `paper-implementation.validation-cycle-planning.cycle-candidates.v1`, prompt template `paper-implementation-validation-cycle-planning-cycle-candidates`, role `validation_cycle_planning.cycle_candidate_designer`, provider-only product mode, large default output budget, and max-one same-profile technical retry.
- Output contract minimum is machine-checkable: passed outputs need at least two runtime-local cycle candidate proposals with target frame, reviewed route candidate key, trigger refs, validation question, assumptions/assertions, pass/fail/inconclusive decisions, expected information gain, criteria, budget envelope, included context refs, confirmatory marker, blockers, and warnings.
- Added forbidden authority fields for this node: persisted `validation_cycle_id`, validation-cycle draft/admission requests, route/probe/plan-light create requests, Domain Gate requests, queue actions, WorkOrder requests, and live experiment requests.
- Added the node's minimum L5 list: missing route architecture artifact rejection, missing route skeptic artifact rejection, proposal hash mismatch rejection, candidate key mismatch rejection, deterministic route primary-input rejection, product non-provider rejection, provider fixture rejection, model-option drift rejection, over-budget zero-call, provider failure retry exhaustion, schema-invalid criteria/budget retry exhaustion, `expected_information_gain=none` rejection, mutation field rejection, and harness artifact no-dual-track coverage.
- Confirmed implementation sequencing: promote `validation_cycle_planning.cycle_candidates` alone first through a dedicated `PaperImplementationValidationCyclePlanningRuntimeService` with only `runCycleCandidates(...)`.
- Do not introduce a broad `ValidationPlanningRuntimeService` facade in this slice, and do not pair feasibility planning in the same implementation pass. `feasibility_planning.probe_plan_candidates` remains the immediate follow-up after validation-cycle has its own closed runtime/admission evidence.
- Follow-up implementation completed in the same single-node scope; feasibility planning remains the next node and was not bundled into this slice.

## 2026-06-07 Validation Cycle Planning Implementation
- Added runtime contracts for `validation_cycle_planning.cycle_candidates`: slot/profile/prompt constants, proposal DTOs, role output schema, final artifact schema, and run request schema.
- Added `PaperImplementationValidationCyclePlanningRuntimeService` as a dedicated single-slot facade. It accepts admitted route proposal and admitted route skeptic artifacts as primary inputs, executes one provider role, records role/final runtime artifacts, admits artifacts through `PaperImplementationRuntimeAdmissionService`, and returns `passed`, `blocked`, or `failed_runtime`.
- Added slot-local lineage guards: passed role output must match the request-owned admitted route proposal ref/hash, admitted route skeptic ref/hash, and reviewed candidate keys; proposal-level `reviewed_route_candidate_key` values must stay inside the reviewed candidate set. Mismatch fails closed before final artifact admission.
- Kept complexity bounded: no broad validation-planning facade, no feasibility pairing, no debate helper extraction, no second role chain, no product fallback to mock/Codex/cache replay, and max one same-profile technical retry.
- Kept authority bounded: final artifacts contain `cycle_candidate_proposals` plus `no_domain_gate_request`, `no_queue_side_effect`, and `no_validation_cycle_side_effect`; they do not contain `CreateValidationCycleDraftRequest`, queue actions, Domain Gate requests, route/probe/workorder writes, prompt text, or raw provider output.
- Wired the production route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/validation-cycle-planning-cycle-candidates/run` through the existing PaperImplementation controller/app route group.
- Added profile and prompt registry entries for `paper-implementation.validation-cycle-planning.cycle-candidates.v1` and `paper-implementation-validation-cycle-planning-cycle-candidates`; product mode remains provider-only via the shared PaperImplementation runtime eligibility policy.
- Extended L1-L5 tests: shared schema tests, service unit tests, route integration, model-profile registry unit coverage, and L5 stress required-case parsing.

## 2026-06-07 Feasibility Planning Alignment
- Added the concrete `feasibility_planning.probe_plan_candidates` alignment block to `13-pending-node-processing-matrix.md`.
- Locked the first slice as validation-cycle-bound and proposal-only. The runtime slot must consume an admitted `validation_cycle_planning.cycle_candidates` final artifact and route proposal / route skeptic lineage anchors inherited from that artifact.
- Kept deterministic authority in `PaperImplementationValidationCyclePlanningService`: runtime must not produce submit-ready `CreateFeasibilityProbeRequest`, `CreateExperimentPlanLightRequest`, `CreateValidationCycleDraftRequest`, queue action, Domain Gate request, WorkOrder request, or live adapter payload.
- Documented the three-dimensional assessment: robust fail-closed lineage and semantic guards; one-role, one-method complexity; and a clear split where runtime proposes, admission verifies, deterministic service creates, Domain Gate stays absent, and harness only validates.
- Checked the existing similar harness surface. Generic `AgentWorkflowHarnessRun` can record `workflow_type=feasibility_planning` proposal evidence, but it cannot compile prompts, choose models, compute cache/compression identity, repair outputs, emit runtime artifacts, or satisfy primary admitted runtime artifact inputs.
- Profile resolution is now explicit for the node: `paper-implementation.feasibility-planning.probe-plan-candidates.v1`, prompt template `paper-implementation-feasibility-planning-probe-plan-candidates`, role `feasibility_planning.probe_plan_designer`, provider-only product mode, large default output budget, and max-one same-profile technical retry.
- Output contract minimum is machine-checkable: passed outputs need at least two runtime-local probe/plan candidate proposals with reviewed cycle and route keys, probe question, expected information gain, baseline gap status, metric/data/baseline/code/config refs, budget envelope, stop conditions, trace refs, confirmatory marker, blockers, and warnings.
- Added forbidden authority fields and side-effect guards for this node: no persisted probe/plan ids, no create requests, no Domain Gate request, no queue action, no WorkOrder/live request, `no_feasibility_probe_side_effect`, `no_experiment_plan_light_side_effect`, and `no_validation_cycle_side_effect`.
- No runtime service, route, schema, registry, Prisma, or runner code changed in this pass. The next step is to discuss exact request/response contract and implementation sequencing before code.

## 2026-06-07 Feasibility Planning Implementation
- Added runtime contracts for `feasibility_planning.probe_plan_candidates`: slot/profile/prompt constants, role output schema, final artifact schema, run request schema, budget/source context DTOs, and probe/plan candidate proposal DTOs.
- Added `PaperImplementationFeasibilityPlanningRuntimeService` as a dedicated single-slot runtime service with only `runProbePlanCandidates(...)`. It consumes an admitted validation-cycle planning final artifact as primary input and requires route architecture / route skeptic artifacts as lineage anchors.
- Added fail-closed lineage guards for validation-cycle artifact ref/hash, route proposal ref/hash, route skeptic ref/hash, reviewed cycle keys, and reviewed route keys. Drift, incomplete candidate sets, missing side-effect guards, and unblocked high-cost confirmatory candidates with open baseline gaps fail before final admission.
- Kept authority bounded: final artifacts contain `probe_plan_candidate_proposals` plus `no_domain_gate_request`, `no_queue_side_effect`, `no_feasibility_probe_side_effect`, `no_experiment_plan_light_side_effect`, and `no_validation_cycle_side_effect`; they do not contain probe/plan-light/cycle create requests, queue actions, Domain Gate requests, WorkOrder/live payloads, prompt text, or raw provider output.
- Wired the production route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/feasibility-planning-probe-plan-candidates/run` through the existing PaperImplementation controller/app route group.
- Added profile and prompt registry entries for `paper-implementation.feasibility-planning.probe-plan-candidates.v1` and `paper-implementation-feasibility-planning-probe-plan-candidates`; product mode remains provider-only via the shared PaperImplementation runtime eligibility policy.
- Extended L1-L5 evidence: shared schema tests, service unit tests, route integration, model-profile registry unit coverage, and L5 required cases for over-budget zero provider calls, provider failure retry exhaustion, and incomplete proposal sets with no probe/plan-light/cycle/queue/Domain Gate payload.

## 2026-06-07 Cross Board Synthesis Alignment
- Added the concrete `cross_board_synthesis.merge_split_reuse_scenarios` alignment block to `13-pending-node-processing-matrix.md`.
- Locked the first slice as single-node, proposal-only, and no-Domain-Gate. Runtime may produce typed merge/split/reuse/park/reject scenario proposals, but it must not call `createCrossBoardReview(...)`, `createEvidenceTransferBinding(...)`, `applyMotivePortfolioDecision(...)`, motive evolution writers, queue writers, or Domain Gate materializers.
- Kept deterministic authority in the existing motive/evidence-board services: cross-board review records, EvidenceTransferBinding creation, motive evolution, and motive portfolio state transitions remain domain-owned.
- Documented the three-dimensional assessment: robust board/hash/trace/source/conflict/transfer-binding guards; one-role, one-method complexity; and a clear split where runtime proposes, admission verifies, domain services mutate, Domain Gate stays absent, and harness only validates.
- Checked the existing similar surfaces. Generic `AgentWorkflowHarnessRun` can record `workflow_type=cross_board_synthesis` evidence, but it cannot compile prompts, choose models, compute cache/compression identity, repair outputs, emit runtime artifacts, or satisfy primary admitted runtime artifact inputs. `CreateCrossBoardReviewRequest` is intentionally not reused as the runtime output contract because its string-array suggestions are too weak for machine-verifiable admission.
- Locked the runtime request input shape around `board_anchors[]`: every primary board anchor must carry board version ref/hash, motive/core motive version refs, trace manifest ref/hash, evidence binding refs, source locator refs, conflict refs, challenge refs, and freshness status. Reviewed board/conflict/challenge sets and `evidence_transfer_binding_refs` are request-owned so admission can detect drift and compression loss.
- Profile resolution is now explicit for the node: `paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1`, prompt template `paper-implementation-cross-board-synthesis-merge-split-reuse-scenarios`, role `cross_board_synthesis.merge_split_reuse_scenario_designer`, provider-only product mode, large default output budget, and max-one same-profile technical retry.
- Output contract minimum is machine-checkable: role output wraps `scenario_proposals[]`, reviewed board/conflict/challenge/transfer-binding refs, blocker/warning codes, and no-side-effect guards. Each scenario proposal binds board version refs/hashes, motive refs, EvidenceTransferBinding refs, conflict/challenge refs, freshness blockers, source locator refs, `scenario_kind`, `disposition`, expected benefit, risk/blocker/warning codes, and `recommended_next_gate`.
- Locked Admission as non-semantic validation only. It may validate request-owned refs, hashes, schema fields, enumerated coverage rules, forbidden authority fields, side-effect guards, replay, idempotency, and drift; it must not decide merge/split/reuse correctness, rewrite scenario kinds, promote blocked scenarios, infer missing evidence from summaries, synthesize EvidenceTransferBinding refs, or create review/portfolio/evolution payloads.
- Scenario coverage is conditional rather than forced: reuse is required only when transfer-binding refs exist; park/reject is required when unresolved conflict or challenge refs exist; merge is required for scope-overlap hints; split is required for scope-divergence hints.
- Added forbidden authority fields and side-effect guards for this node: no cross-board review create payload, no EvidenceTransferBinding request, no motive portfolio decision, no motive roles mutation, no motive evolution request, no Domain Gate request, no queue action, `no_cross_board_review_side_effect`, `no_evidence_transfer_binding_side_effect`, `no_portfolio_mutation_side_effect`, and `no_motive_evolution_side_effect`.
- Locked the implementation boundary: use a dedicated `PaperImplementationCrossBoardSynthesisRuntimeService.runMergeSplitReuseScenarios(...)`, not a broad motive-board runtime facade. The service may own structural preflight, profile/prompt/model-option resolution, context/compression identity, provider invocation, role/final runtime artifact assembly, runtime admission, and same-profile technical retry. It must not own review creation, transfer binding creation, portfolio mutation, motive evolution, queue creation, Domain Gate materialization, or semantic repair.
- Locked implementation order: shared contracts/schemas first; then dedicated runtime service; then route/controller/app wiring; then profile/prompt registry; then L1-L5 tests and runtime-stress required cases.
- Locked the test matrix: L1 request/role/final schema and forbidden-payload negatives; L2 runtime service happy/preflight/admission/retry/no-side-effect tests; L3 narrow route integration; profile registry/provider-only checks; five L5 required cases for over-budget, provider failure, conflict/challenge preservation or incomplete scenario coverage, invalid reuse without EvidenceTransferBinding, and memo-as-evidence; plus no-dual-track scans. Prisma smoke and live provider canary remain opt-in unless a later slice changes persistence or live-provider release policy.

## 2026-06-07 Cross Board Synthesis Implementation
- Added shared runtime contracts for `cross_board_synthesis.merge_split_reuse_scenarios`: slot/profile/prompt constants, request schema with `board_anchors[]`, role output schema, final artifact schema, forbidden domain-writer payload guards, and the `paper_implementation_cross_board_synthesis` runtime context family.
- Added `PaperImplementationCrossBoardSynthesisRuntimeService.runMergeSplitReuseScenarios(...)` as a dedicated single-slot runtime service. It owns structural preflight, profile/prompt/model-option resolution, context/cache/compression identity, provider invocation through the shared orchestrator, same-profile retry, role/final artifact assembly, and runtime admission.
- Kept authority bounded: final artifacts are proposal-only and carry no cross-board review create payload, EvidenceTransferBinding request, motive portfolio decision, motive evolution request, queue action, or Domain Gate request. Domain services remain the only path for review, transfer binding, portfolio, motive evolution, and queue/domain state changes.
- Added fail-closed machine checks for board version refs/hashes, motive refs, reviewed conflict/challenge/transfer-binding refs, source locator refs, memo-like evidence refs, conditional scenario coverage, viable reuse without transfer bindings, no-side-effect guards, provider fixture payloads, product non-provider execution, and model-option drift.
- Wired the production route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run` through the PaperImplementation controller/app route group.
- Added profile and prompt registry entries for `paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1` and `paper-implementation-cross-board-synthesis-merge-split-reuse-scenarios`; product mode remains provider-only via the shared PaperImplementation runtime eligibility policy.
- Extended L1-L5 evidence: shared schema tests, service unit tests, route integration, model-profile registry unit coverage, and L5 required cases for over-budget zero provider calls, provider failure retry exhaustion, missing conflict/challenge scenario coverage, memo-like evidence rejection, and viable reuse without transfer-binding fail-closed with no review/transfer/portfolio/queue/Domain Gate payload.

## 2026-06-07 Cross Board Synthesis Review Fixes
- Tightened scenario-local source locator, transfer binding, conflict, and challenge refs to request-owned or reviewed refs before final admission. Provider output can no longer invent those refs and still pass.
- Expanded orchestrator `input_refs` to the full de-duplicated primary ref set, including board trace/source locator refs, reviewed board/conflict/challenge refs, and request-owned EvidenceTransferBinding refs.
- Reused the same full primary ref helper for memo-like primary-context rejection so preflight and orchestrator provenance cannot drift as primary ref classes expand.
- Extended L2 service tests, L5 stress tests, and the runtime stress required-case list for scenario-ref drift with no final artifact, review, transfer, portfolio, queue, or Domain Gate payload.

## 2026-06-08 Evidence Board Curation Alignment
- Added the concrete `evidence_board_curation.binding_gap_candidates` alignment block to `13-pending-node-processing-matrix.md`.
- Locked this node as a proposal-only runtime slice for binding/gap candidates. Runtime may propose evidence-binding candidates and gap candidates, but it must not create `MotiveEvidenceBoardVersion`, `EvidenceBinding`, `EvidenceTransferBinding`, `CitationCandidate`, trace repair queue items, decision queue items, or Domain Gate payloads.
- Kept deterministic authority in `PaperImplementationMotiveEvidenceBoardService` and `PaperImplementationTraceKernelService`: board/evidence mutation, transfer binding, citation creation, and trace repair remain domain-owned.
- Resolved debate scope as a single-role controlled challenge runtime. The first slice uses one role call, `evidence_board_curation.binding_gap_candidate_curator`, and requires each binding candidate to include a structured `challenge_check`; it does not introduce proposer/critic/arbiter roles, full debate transcripts, shared debate execution helpers, or multi-round semantic rewrite.
- Locked the five runtime phases: preflight, context build, single controlled role call, machine gate plus max-one same-profile retry, and artifact/admission finalize.
- Documented the machine gate: request-owned refs only, non-empty source locator refs for viable binding candidates, memo-like evidence rejection, stale or unreviewed citation downgrade to gap/blocker, required challenge checks, forbidden writer fields, and no semantic repair by runtime or admission.
- Refined input/output complexity: request schema must use explicit `curation_mode` values (`curate_existing_board` or `seed_initial_board_candidates`) instead of optional board semantics. `curate_existing_board` is append-only and may only emit new binding candidates and gap candidates; it must not update/remove existing bindings, patch board summaries/state, or output board update requests.
- Added the duplicate-existing-binding guard for `curate_existing_board`: evidence already represented by current-board binding context can only become a gap/warning/blocker, not a new viable binding candidate.
- Added the four-dimensional review for responsibility boundary, no-dual-track risk, robustness, and complexity. Runtime owns candidate proposal and challenge checks only; admission owns machine verification only; deterministic board/trace services own any state mutation.
- Tightened `seed_initial_board_candidates`: it can seed binding/gap candidate proposals for a later deterministic board path, but it must not emit board-shaped content, board drafts, `board_summary`, `board_state`, `bindings`, board create requests, or persisted board/binding objects.
- Tightened `source_context_packets`: they are secondary provider-review material only, are not primary evidence authority, must be covered by `source_refs` and hashes, must participate in cache/prompt identity, and cannot replace source locator, citation candidate, evidence, trace, or source refs as authority.
- Updated the next-slice pointer to keep `evidence_board_curation.binding_gap_candidates` as the active unpromoted node and to make exact request schema, source-context optionality, issue codes, and no-dual-track scan scope the next discussion targets.
- Locked the request schema direction as a discriminated union: a shared base with motive/version/assertion/source/trace/source-locator/citation/evidence/freshness/risk refs, plus `curate_existing_board` requiring `target_board_ref`, `target_board_hash`, and `existing_evidence_binding_refs`, while `seed_initial_board_candidates` forbids current-board authority fields.
- Kept `source_context_packets` optional for the first slice. When present they must carry packet/source hashes, source ref, evidence kind, content summary, key facts, and covered evidence/source-locator/citation/trace refs.
- Rejected text-only evidence review as a runtime entrypoint. Evidence text or source packets without request-owned source locator, citation candidate, evidence, source, and trace refs fail preflight or can only lead to gap/blocker candidates, never viable binding candidates.
- Simplified issue-code policy for this node: do not introduce fine-grained audit-oriented enums. Runtime/admission control uses `terminal_code + reason_kind + details`, where `terminal_code` is limited to `preflight_blocked`, `runtime_retry_exhausted`, `admission_rejected`, and `admitted_blocked`.
- Kept candidate routing codes small and payload-local: `missing_locator`, `missing_citation`, `stale_or_unreviewed`, `duplicate_existing`, `memo_like_evidence`, `scope_or_trace_gap`, and `downstream_review_required`. Specific refs, paths, and modes belong in `details`, not new enums.
- Reconfirmed Admission remains non-semantic: it rejects machine-boundary failures only and must not create semantic blocker codes, upgrade gaps to bindings, downgrade bindings to gaps, or judge evidence support.
- Locked no-dual-track scan scope as four small machine checks: service scan for no harness/proposal primary input and no domain-writer calls; contract scan for rejected harness/domain/board-shaped payloads; route scan for a single controlled runtime route with no wrapper/generic writer route; and whitelist scan for forbidden fields limited to negative fixtures or documentation.
- No runtime service, route, schema, registry, Prisma, or runner code changed in this pass. The next step is to align the implementation sequence and minimal code slice.

## 2026-06-08 Evidence Board Curation Readiness Fixes
- Resolved the implementation-readiness issue-code gap: `terminal_code + reason_kind + details` is payload-local for evidence-board curation role/final artifacts only. The generic `PaperImplementationRuntimeArtifactEnvelope`, `runtime_failure_code`, `PaperImplementationRuntimeAdmissionRecord`, and admission `issue_codes` remain unchanged for this slice.
- Locked generic mapping: `preflight_blocked` and `runtime_retry_exhausted` map to `runtime_status=failed_runtime` role artifacts with coarse evidence-board runtime failure codes; `admitted_blocked` maps to `runtime_status=blocked`, `runtime_failure_code=null`, and admitted final artifact payload blockers.
- Updated the no-dual-track scan scope to use real implementation surfaces: scan for forbidden harness/proposal primary inputs, forbidden imports/dependencies on motive/trace services or repositories, forbidden calls to `createMotiveEvidenceBoardVersion`, `createEvidenceTransferBinding`, `createCitationCandidate`, trace repair queue writers, decision queue writers, or Domain Gate materializers.
- Updated `06-node-runtime-matrix.md` so route architecture, route skeptic review, validation-cycle planning, feasibility planning, and cross-board synthesis are marked promoted, while `evidence_board_curation.binding_gap_candidates` is the active first-slice implementation target.
- No runtime service, route, schema, registry, Prisma, or runner code changed in this pass. The evidence-board curation implementation can start with shared contracts/schema tests.

## 2026-06-08 Evidence Board Curation Implementation
- Added shared runtime contracts for `evidence_board_curation.binding_gap_candidates`: slot/profile/prompt constants, discriminated request schema, role output schema, final artifact schema, binding candidate DTOs, gap candidate DTOs, source context packet DTOs, runtime-control payload, and the `paper_implementation_evidence_board_curation` context family.
- Added `PaperImplementationEvidenceBoardCurationRuntimeService.runBindingGapCandidates(...)` as a dedicated single-slot runtime service. It owns structural preflight, profile/prompt/model-option resolution, context/cache/compression identity, provider invocation through the shared orchestrator, max-one same-profile retry, role/final artifact assembly, and runtime admission.
- Kept the runtime proposal-only and append-only. Final artifacts carry binding candidate proposals and gap candidate proposals plus explicit no-side-effect guards. They do not carry board drafts, board summaries/state, persisted bindings, board write requests, evidence-binding create/update/remove requests, transfer binding requests, citation requests, trace repair queue items, decision queue actions, Domain Gate payloads, prompt text, or raw provider output.
- Kept deterministic authority in existing domain services. Board creation/update, evidence binding creation, evidence transfer binding creation, citation candidate creation, trace repair queue creation, decision queue creation, and Domain Gate materialization remain outside this runtime service.
- Added fail-closed machine gates for source locator preflight, memo-like primary refs, request-owned assertion/evidence/source-locator/citation refs, reviewed citation refs, duplicate existing bindings, stale viable bindings, missing `challenge_check`, missing side-effect guards, authority fields in provider output, product non-provider execution, provider fixture payloads, and model-option drift.
- Wired the production route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/evidence-board-curation-binding-gap-candidates/run` through the PaperImplementation controller/app route group.
- Added profile and prompt registry entries for `paper-implementation.evidence-board-curation.binding-gap-candidates.v1` and `paper-implementation-evidence-board-curation-binding-gap-candidates`; product mode remains provider-only through the shared PaperImplementation runtime eligibility policy.
- Extended L1-L5 evidence: shared schema tests, service unit tests, route integration, model-profile registry unit coverage, L5 required cases for over-budget, provider failure, missing challenge, missing locator, duplicate existing binding, invented refs, and memo-like evidence, plus no-dual-track service/route/whitelist scans.
- Updated the node runtime matrix and pending-node pointer so `evidence_board_curation.binding_gap_candidates` is promoted and the next recommended agent workflow slice is `motive_decomposition.draft_assertion_candidates`.

## 2026-06-08 Evidence Board Curation Review Fixes
- Tightened the current-board duplicate guard by separating `existing_evidence_binding_refs` from `existing_bound_evidence_refs`. Binding refs identify current binding records; bound evidence refs identify evidence that is already bound and must not be emitted as a new viable binding candidate.
- Made `existing_bound_evidence_refs` a required request field, part of source/cache/prompt/artifact identity, and part of orchestrator `input_refs`; seed mode must carry empty current-board binding context.
- Strengthened `source_context_packets` into ref/hash covered provider-review material: each packet carries packet/source refs and hashes plus covered evidence, source locator, citation candidate, and trace refs. Runtime preflight rejects packet hash drift, uncovered packets, and covered refs outside request-owned sets before provider calls.
- Moved forbidden authority field checks before role-status handling so blocked provider outputs cannot carry board/binding/Domain Gate/queue payloads and still finalize as admitted blocked evidence.
- Extended regressions for duplicate bound evidence, packet hash/coverage drift, seed-mode current-board context rejection, blocked-output authority payload rejection, and route/L5 fixtures using the strengthened request shape.

## 2026-06-08 Motive Decomposition Node Alignment
- Locked `motive_decomposition.draft_assertion_candidates` as the next slice discussion target. The node proposes draft assertion decomposition candidates for existing motive/version/assertion context; it does not create or admit `CoreMotiveVersion`, `MotiveAssertion`, `MotiveEvolutionDecision`, board state, evidence bindings, trace repair queue items, decision queue items, or Domain Gate payloads.
- Accepted that this node needs controlled semantic processing. Runtime may identify compound support obligations, propose smaller draft assertion candidates, bind candidates to request-owned evidence/source/trace refs, and mark evidence gaps, trace drift, scope drift, or human-confirmation needs.
- Rejected authority-level semantic decisions inside runtime/admission. Runtime must not decide a candidate is proven or admitted, rewrite motive state, upgrade candidates into persisted assertions, or infer missing evidence from summaries/harness output/LLM rationale. Admission remains machine-verification only and must not judge scientific correctness.
- Chose a single-role controlled challenge instead of full debate for the first slice. Do not add proposer/skeptic/arbiter roles, debate transcripts, shared debate execution helper, or semantic reconciliation logic in this slice.
- Required every `draft_assertion_candidate` to carry a structured `decomposition_check` covering compoundness, scope-change status, evidence coverage, trace alignment, new-claim risk, human-confirmation requirement, blocker codes, and recommended next gate.
- Locked the first-slice flow as four steps: preflight, one provider role candidate generation, same-output controlled challenge, then machine gate plus admission. High-impact split/merge/supersession/portfolio implications route to `motive_evolution_review` or `human_confirmation`; this node emits blockers/gate recommendations only.

## 2026-06-08 Motive Decomposition Input Contract Alignment
- Locked the first-slice input mode to `decompose_existing_assertions`. The runtime targets explicit existing `MotiveAssertion` refs under an admitted `CoreMotiveVersion`; it does not perform whole-motive free exploration, missing-assertion discovery, motive rewrite, assertion creation, portfolio decision, or motive evolution decision.
- Required `target_assertion_refs` to be non-empty. A request without explicit assertion refs is too broad for the first slice and would turn the runtime into an unbounded motive reader.
- Kept authority ref/hash owned: primary request authority includes target motive/version/assertion refs, input snapshot ref/hash, trace manifest refs/hashes, evidence refs, source refs/hashes, source locator refs, citation candidate refs, accepted-risk refs, and admitted upstream blocker/review refs when present.
- Allowed provider-visible assertion text only through bounded `assertion_context_packets`. Each packet must carry packet/assertion refs and hashes, assertion text, scope boundary summary, and covered evidence/trace/source refs.
- Clarified the text boundary: the rule is not "no text"; it is "no unbound text". Assertion text may support provider semantic processing only when it is ref/hash-bound and covered by request-owned refs.
- Locked preflight blockers for assertion packets outside `target_assertion_refs`, assertion hash drift, covered refs outside request-owned evidence/trace/source sets, free-form assertion text outside packets, and harness/memo/LLM-rationale/board-summary/free-form motive notes as authority.

## 2026-06-08 Motive Decomposition Output Schema Alignment
- Rejected `source_assertion_reviews[]` as an audit-shaped output. The machine need is input coverage, not per-assertion review prose.
- Chose top-level `reviewed_assertion_refs` as the coverage mechanism. It must cover `target_assertion_refs`; if an assertion has no candidate, the machine meaning is that it was reviewed and no draft candidate was emitted.
- Kept downstream consumption centered on `draft_assertion_candidates[]`. Later human/domain gates can consume an admitted runtime artifact ref plus `candidate_key`; runtime must not fabricate a persisted `motive_assertion` ref.
- Required each draft candidate to carry `candidate_key`, `source_assertion_ref`, a small `candidate_kind`, draft assertion text, scope/support summaries, covered evidence/source/source-locator/citation/trace refs, `decomposition_check`, blocker/warning codes, and a recommended next gate.
- Limited `candidate_kind` to `split_child`, `scope_clarification`, and `support_obligation` for the first slice. Merge/rewrite/new-claim risks belong in `decomposition_check`, blockers, and gate routing, not in candidate kinds that imply motive evolution authority.
- Forbade output fields that look like domain mutation DTOs: `assertion_id`, candidate assertion refs, `CreateMotiveAssertionInput`, assertion importance/validation/falsification payloads, `CoreMotiveVersion` patches, motive evolution requests, Domain Gate requests, and queue actions.

## 2026-06-08 Motive Decomposition Admission / Machine Gate Alignment
- Confirmed the actual consumption chain: validation cycles, WorkOrders, result interpretation, and evidence-board curation consume persisted `motive_assertion` refs. This runtime must only emit proposal data inside an admitted runtime artifact; later human/domain gates may consume `runtime_artifact_ref + candidate_key` and call deterministic motive services if accepted.
- Assigned candidate-level boundary checks to the runtime gate: reviewed assertion coverage, request-owned source assertion refs, request-owned covered evidence/source/source-locator/citation/trace refs, complete `decomposition_check`, small `candidate_kind` enum, new-claim/human-confirmation gating, and absence of persisted assertion ids/refs or write payloads.
- Locked the new-claim rule: `new_claim_risk=true` must require `human_confirmation_required=true` and route to `motive_evolution_review` or `human_confirmation`; it must not look directly materializable as a normal decomposition candidate.
- Kept admission non-semantic and structural: schema, runtime identity, refs/hashes, reviewed assertion coverage, assertion packet coverage, no-side-effect guards, forbidden fields, replay, idempotency, and drift.
- Rejected admission behaviors that would create semantic authority: it must not judge decomposition correctness, prove draft assertions, decide evidence sufficiency, rewrite candidates, synthesize missing refs, infer evidence from text, or materialize motive/domain/queue/Domain Gate state.

## 2026-06-08 Motive Decomposition Retry / Result Status Alignment
- Added top-level `decomposition_result_status` as the only result-state enum for the first slice. It has three values: `candidates_proposed`, `no_decomposition_needed`, and `blocked`.
- Kept the status machine-facing only. It disambiguates empty candidate output; it is not an audit layer and does not introduce per-assertion reviews or human-readable reasoning requirements.
- Locked result invariants: `reviewed_assertion_refs` must cover `target_assertion_refs`; `candidates_proposed` requires at least one draft candidate; `no_decomposition_needed` requires zero candidates and zero blockers; `blocked` requires at least one blocker and may have zero candidates.
- Restricted retry to max-one same-profile technical retry for provider failures, schema-invalid output, coverage failures, forbidden authority fields, side-effect guard failures, ref/hash drift, and missing required `decomposition_check` fields. If retry still fails, runtime records `failed_runtime`, final admission is rejected, and no final artifact is emitted.
- Confirmed semantic blockers are not retry targets. New-claim risk, trace drift, missing evidence coverage, scope drift, human-confirmation requirements, and no-decomposition-needed outcomes should finalize as structured result status plus blocker/gate recommendations when structurally valid.
- Rejected fallback paths in product mode: no mock, Codex, generic harness, cached prior output, or deterministic domain-writer output can substitute for provider output.
- Rejected added complexity for this slice: no per-assertion status, no-op candidates, reason objects, `source_assertion_reviews[]`, retry reason taxonomies, semantic severity ladders, candidate graphs, or multiple status fields per candidate.

## 2026-06-08 Motive Decomposition Profile Resolution Alignment
- Locked the slot-local profile block for `motive_decomposition.draft_assertion_candidates`: profile `paper-implementation.motive-decomposition.draft-assertion-candidates.v1`, prompt template `paper-implementation-motive-decomposition-draft-assertion-candidates@v1`, role `motive_decomposition.draft_assertion_candidate_designer`, low creativity, high reasoning, structured output, and large default output budget.
- Required this node to reuse the existing promoted PaperImplementation runtime profile registry path. Do not add a node-local model-selection mechanism or a second model-option visibility path.
- Kept product mode provider-only through `PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY`. Non-provider modes may be used by test/acceptance fixtures through registry policy, but they must not become product fallbacks.
- Locked model option resolution as `explicit_or_default_profile_option`: explicit `model_option_id` is accepted only with `execution_mode=provider_llm`, and the option must belong to the motive-decomposition profile. Otherwise runtime fails before provider invocation.
- Required role/final runtime artifacts to record resolved `model_profile_id`, provider `model_option_id`, prompt template id/version, context policy hash, cache policy hash, and compression policy hash so admission can verify replay and drift.
- Added cache/admission identity requirements: bind resolved profile id, provider model option id, prompt template id/version, output schema version, target assertion refs, assertion/source packet hashes, source hashes, and compression identity.
- Rejected request-side prompt text overrides, raw model parameter overrides, provider id overrides, prompt template overrides, request-supplied cache/compression hashes, and harness-owned model selection. Admission verifies identity only and must not judge semantic quality of model parameters.

## 2026-06-08 Motive Decomposition Context / Cache / Compression Identity Alignment
- Confirmed identity is required for this node, but only as a machine replay/cache/admission boundary. It is not a human audit layer.
- Required runtime identity to bind slot/role, execution mode, resolved profile, provider model option, prompt template id/version, role/final schema versions, target motive/version/assertion refs, input snapshot ref/hash, assertion packet refs/hashes, assertion refs/hashes, packet-covered refs, evidence/source/source-locator/citation/trace refs and hashes, accepted-risk/upstream artifact refs, and context/cache/compression policy hashes.
- Required any slot/profile/prompt/model-option/schema/input/hash/compression identity change to cause a cache miss or new runtime execution. Older final artifacts must not be silently reused across identity drift.
- Locked preflight/admission rejection for missing identity fields, target ref mismatch, assertion packet hash drift, packet-covered refs outside request-owned sets, source/trace/input/compression drift, profile/prompt/model-option drift, request-supplied cache/compression hashes, and production artifacts whose identity depends on harness run ids, cached prior outputs, mock/Codex execution, LLM rationale, memo text, board summaries, or unbound assertion text.
- Required compression to preserve identity-bearing refs/hashes plus blocker-critical evidence: evidence gaps, trace drift refs, accepted-risk refs, and human-confirmation markers. Assertion text summaries are allowed only when bound to packet/assertion refs and hashes.
- Rejected extra identity complexity for the first slice: no raw model parameter snapshots, provider reasoning hashes, human-readable audit summary hashes, per-candidate identity graphs, or harness run identity.

## 2026-06-08 Motive Decomposition Service Control Alignment
- Chose a dedicated single-slot service boundary: `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)`.
- Assigned slot execution orchestration to that service: structural preflight, request-owned ref/hash validation, profile/prompt/model-option registry resolution, context/cache/compression identity, token budget gating, one provider role invocation, max-one same-profile technical retry, machine gate, final artifact assembly, runtime artifact recording, admission calls, and `passed | blocked | failed_runtime` status mapping.
- Explicitly withheld all domain authority from the runtime service. It must not create/update `CoreMotiveVersion` or `MotiveAssertion`, create motive evolution decisions, create board/evidence bindings, create trace repair or decision queue items, materialize Domain Gate payloads, choose prompts/models outside the registry, or semantically repair provider output.
- Kept the route/controller as entrypoint-only: it dispatches the production slot route and must not compile prompts, select models, compute identity, repair output, judge decomposition correctness, or mutate domain state.
- Kept admission as verification-only: schema, refs/hashes, identity, no-side-effect guards, replay, idempotency, and drift. Admission does not invoke providers, control retry, rewrite candidates, or decide scientific correctness.
- Kept domain services as mutation owners. A later human/domain gate may consume `runtime_artifact_ref + candidate_key` and call deterministic motive services if mutation is approved.
- Kept harness as validation-only: fixtures may call the real route/service path, but harness must not compile prompts, choose model options, calculate production identity, create runtime artifacts directly, or stand in for provider execution in product.

## 2026-06-08 Motive Decomposition Test Matrix / Readiness Alignment
- Locked readiness to L1-L5 plus no-dual-track scans. This is a machine runtime closure matrix, not a human audit suite.
- L1 shared schema must cover request mode, non-empty target assertions, assertion packet ref/hash binding, `decomposition_result_status`, result-status invariants, required `decomposition_check`, candidate kind enum, proposal-only final artifact shape, and forbidden review/domain-writer fields.
- L2 runtime service tests must cover happy path, `no_decomposition_needed`, admitted `blocked`, zero-call preflight blockers, same-profile provider retry exhaustion, schema/machine-boundary retry exhaustion, semantic blocker no-retry behavior, new-claim human-confirmation gating, product provider-only rejection, model-option ownership, identity drift rejection, and absence of motive/assertion/board/trace/queue/Domain Gate side effects.
- L3 route integration stays narrow: one production route happy path through real controller/service/admission, plus ref drift, provider fixture, product non-provider, authority payload rejection, response-shape guard, and no generic harness wrapper route.
- Profile/registry tests must cover profile and prompt registration, provider-only product eligibility, profile-owned explicit model options, and LLM registry validation.
- L5 required cases are capped at eight: over-budget zero-call, provider retry exhaustion, missing `decomposition_check`, invalid `decomposition_result_status`, missing reviewed assertion coverage, candidate refs outside request-owned sets, new-claim risk without human-confirmation gate, and memo/harness/unbound-text authority preflight block.
- No-dual-track scans must prove the service has no motive/board/trace/queue/Domain Gate writer calls, no direct provider-wrapper bypass, only one slot-specific route, forbidden fields only in negative fixtures/docs, and no harness artifact as primary runtime input.
- Promotion readiness requires the planned schema/service/route/registry/L5 tests, no-dual-track scans, backend typecheck, unified runtime stress runner, scoped diff check, and governance sync/lint. Prisma smoke and live provider canaries stay opt-in unless later implementation changes persistence or release policy.

## 2026-06-08 Motive Decomposition Shared Contracts Implementation
- Implemented the first sequencing step only: shared runtime contracts and L1 schema tests for `motive_decomposition.draft_assertion_candidates`.
- Added shared constants for slot, role, profile, prompt template, prompt version, role output schema id, final artifact schema id, and runtime request schema version.
- Added contract enums and schemas for `decompose_existing_assertions`, `decomposition_result_status`, draft assertion candidate kinds, controlled `decomposition_check` statuses, recommended next gates, and assertion context packets.
- Added role output and final artifact schemas with result-status invariants, required `decomposition_check`, proposal-only draft candidates, reviewed assertion coverage fields, no-side-effect guards, and forbidden domain-writer payload rejection.
- Tightened role output status consistency: `blocked` decomposition results must carry `role_status=blocked`, while `candidates_proposed` and `no_decomposition_needed` must carry `role_status=passed`, preventing runtime/admission status drift before service implementation.
- Added runtime request schema requiring non-empty target assertion refs, ref/hash-bound assertion context packets, trace/source/evidence authority refs and hashes, and non-provider fixture gating. Product mode remains provider-only through the existing shared run-mode rule.
- Added L1 schema tests covering result-status invariants, missing `decomposition_check`, invalid candidate kinds, `source_assertion_reviews[]` rejection, motive assertion/domain/queue/Domain Gate writer payload rejection, request mode restriction, non-empty target assertions, assertion packet hash requirements, unbound assertion text rejection, and provider fixture rejection.
- No backend runtime service, route/controller/app wiring, registry/prompt YAML, L2 service tests, L3 route tests, L5 stress cases, or Domain Gate behavior changed in this step.

## 2026-06-08 Motive Decomposition Registry / Prompt / Context Family Implementation
- Implemented the second sequencing step only: model profile registry, prompt template registry, backend profile-resolution mirror, and shared context family for `motive_decomposition.draft_assertion_candidates`.
- Added `.ai/llm-config/registry/model_profiles.yaml` entry `paper-implementation.motive-decomposition.draft-assertion-candidates.v1` with the promoted PaperImplementation provider candidate pattern.
- Added `.ai/llm-config/registry/prompt_templates.yaml` entry `paper-implementation-motive-decomposition-draft-assertion-candidates@v1`, requiring slot/role identity, decomposition mode, motive/version/assertion refs, assertion context packets, source hash bundle, trace/source-locator/citation/evidence refs, and proposal-only output notes.
- Added backend registry mirror coverage in `TopicSelectionModelProfileRegistryService`: profile function `paper_implementation_motive_decomposition_draft_assertion_candidates`, stage family `paper_implementation_motive_decomposition`, output contract `PaperImplementationMotiveDecompositionRoleArtifact@v1`, low creativity, high reasoning, and large output budget.
- Added shared context family `paper_implementation_motive_decomposition` so the future runtime service can use the existing prompt/context/cache/compression pipeline without a second entrance.
- Added registry tests for product-mode provider-only eligibility, explicit model-option ownership, motive profile resolution, and context family availability.
- No runtime service, route/controller/app wiring, L2 service tests, L3 route tests, L5 stress cases, Domain Gate behavior, or domain mutation service behavior changed in this step.

## 2026-06-08 Motive Decomposition Runtime Service Implementation
- Implemented the third sequencing step only: `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)` plus L2 service tests.
- Kept the service as the single slot execution owner for structural preflight, request-owned ref checks, profile/prompt/model-option resolution, context/cache/compression identity, token-budget input, one role invocation, max-one same-profile technical retry, machine gate, runtime artifact assembly, and admission calls.
- Kept production mode provider-only. The service rejects product non-provider execution, provider requests carrying mock/Codex fixtures, non-provider `model_option_id`, explicit model options outside `paper-implementation.motive-decomposition.draft-assertion-candidates.v1`, and primary harness/proposal/queue/trace-repair refs.
- Added preflight blockers for memo-like primary refs and invalid assertion context packets before provider invocation. Provider calls stay at zero for these cases and only a rejected `failed_runtime` role artifact is recorded.
- Added machine gates for role slot identity, reviewed assertion coverage, result-status invariants, request-owned candidate refs, complete `decomposition_check`, new-claim human-confirmation routing, trace/evidence boundary blockers, no-side-effect guards, and forbidden production-authority fields.
- Preserved semantic-blocker behavior: structurally valid `blocked` and `no_decomposition_needed` outputs do not retry; they become admitted runtime evidence. Provider/schema/machine-boundary failures retry once only in `provider_llm` mode and then fail closed with no final artifact.
- Final artifacts remain proposal-only: draft assertion candidates, `decomposition_result_status`, blocker/warning codes, reviewed assertion refs, side-effect guards, role artifact refs/hashes, prompt/token/compression refs, runtime/cache identity, and source hash bundle. The service does not call motive/assertion writers, board/evidence writers, trace repair, queue, Domain Gate materializers, or direct provider wrappers.
- No route/controller/app wiring, L3 route tests, L5 stress cases, unified runtime stress runner, live provider canary, Domain Gate behavior, or domain mutation service behavior changed in this step.

## 2026-06-08 Motive Decomposition Runtime Service Review Fixes
- Tightened role output authority gating: `cited_source_refs` must now be contained in request-owned `source_refs`, matching candidate covered-source behavior and preventing provider-invented source refs from being persisted inside role artifact payloads.
- Aligned service-only request rejection with the shared request schema for harness/proposal authority fields by adding direct recursive rejection for `implementation_project_id`, `runtime_artifact_id`, `agent_workflow_harness_run_id`, and `implementation_proposal_artifact`, plus raw provider response and hidden reasoning fields.
- Replaced prefix-only explicit `model_option_id` checking with a bounded allowlist of the slot profile's registered default/manual provider options, so same-profile but undefined model options fail before provider orchestration.
- Expanded L2 service tests to cover invented cited-source refs, same-profile unknown model options, and direct service-only harness id fields.

## 2026-06-09 Motive Decomposition Runtime Route Wiring Implementation
- Implemented the fourth sequencing step for `motive_decomposition.draft_assertion_candidates`: production route/controller/app wiring plus L3 route integration coverage.
- Added the slot-specific runtime route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/motive-decomposition-draft-assertion-candidates/run`, bound directly to `runPaperImplementationMotiveDecompositionRuntimeRequestSchema` and `PaperImplementationMotiveDecompositionRuntimeService.runDraftAssertionCandidates(...)`.
- Added `PaperImplementationMotiveDecompositionRuntimeService` to `PaperImplementationController` as an entrypoint-only dependency. The controller only forwards project id and request body to the runtime service and does not compile prompts, select models, repair provider output, call admission directly, or mutate motive/board/trace/queue/Domain Gate state.
- Added `paperImplementationMotiveDecompositionLlmGateway` to `buildApp()` so tests and opt-in provider paths can inject the same shared orchestrator/gateway path used by promoted PaperImplementation slots. The app wiring keeps the runtime service behind `TopicSelectionAgentOrchestratorService` and does not add a direct provider wrapper or generic harness route.
- Added L3 route tests for the happy path and fail-closed cases: admitted draft assertion candidate final artifact, explicit no motive/board/trace/queue/Domain Gate write guards, Domain Gate materialization rejection, provider ref drift retry exhaustion, provider fixture rejection, authority payload rejection, and model-option drift rejection before gateway invocation.
- Updated legacy controller-construction tests with a non-executed motive runtime placeholder so unrelated live-experiment, provider-variance, and general PaperImplementation route tests keep their existing scope while matching the expanded constructor.
- This step does not add L5 stress cases, unified runtime-stress required-case parsing, live provider canary hooks, Prisma smoke changes, or Domain Gate materialization for motive decomposition. The slot remains unpromoted until stress/no-dual-track/final promotion verification is complete.

## 2026-06-09 Motive Decomposition L5 Stress / Promotion Verification Implementation
- Completed the final promotion slice for `motive_decomposition.draft_assertion_candidates`: L5 stress coverage, unified runtime-stress required-case parsing, runtime regression inclusion, final no-dual-track scans, and promotion matrix updates.
- Added eight required L5 cases: over-budget assertion context zero-call, provider retry exhaustion, missing `decomposition_check`, invalid result-status invariant, missing reviewed assertion coverage, candidate refs outside request-owned sets, new-claim risk without human-confirmation gate, and memo-like assertion context zero-call.
- Bound those cases into `.ai/scripts/paper-implementation-runtime-stress.mjs` so required coverage is parsed from TAP subtest names. Missing, skipped, failed, or renamed motive-decomposition L5 cases now fail the stress summary.
- Added `paper-implementation-motive-decomposition-runtime-service.unit.test.ts` to the unified runtime service/route regression step so the stress runner covers the L2 service matrix and the L3 route matrix together.
- Preserved the production path boundary: L5 uses the real `PaperImplementationMotiveDecompositionRuntimeService` through the shared `TopicSelectionAgentOrchestratorService`; the stress runner only invokes tests and parses TAP, and does not create runtime artifacts or carry production semantics.
- Confirmed the real provider structured-output path rejects some malformed outputs at schema validation before the service semantic gate. L5 treats these as `SCHEMA_VALIDATION_FAILED` retry-exhaustion cases, while schema-valid boundary drift still exercises service semantic guards such as reviewed-assertion coverage, request-owned refs, and new-claim/human-confirmation gating.
- Final no-dual-track verification found no direct motive/assertion/board/evidence/trace/queue writer calls, no Domain Gate materializer call, no direct provider wrapper call, one controlled runtime route, and forbidden writer fields limited to schema/service guard lists, prompt constraints, docs, and negative tests.
- `motive_decomposition.draft_assertion_candidates` is now promoted as a proposal-only runtime slot. It has no Domain Gate materialization; deterministic/human gates remain the only path to motive/assertion mutation.

## 2026-06-09 L4/L5 Review Fixes
- Fixed the L4 provider-canary coverage drift for promoted PaperImplementation slots. The route integration suite now has opt-in live provider canary hooks for route architecture, route skeptic, validation-cycle planning, feasibility planning, cross-board synthesis, evidence-board curation, and motive decomposition, in addition to the existing trace/P1/result/experiment hooks.
- Extended the `paper-implementation:provider-canary` command so one explicit provider-canary run enables all promoted slot canaries, including result/experiment and the proposal-only slots promoted after the first P1 slice.
- Registered the new T-114 canary flags in `.ai/llm-config/registry/config_keys.yaml`, matching the existing provider-canary flag pattern and avoiding ad-hoc environment keys.
- Extended the live fail-closed provider canary to exercise the newly promoted proposal-only routes with an invalid provider key, while preserving the existing deterministic every-product-slot fail-closed route test as the default non-live robustness gate.
- Updated the runtime-stress runner deterministic environment and summary guardrails to disable every live provider canary flag by default. The L5 runner still clears provider API keys and does not become a live-provider entrypoint.
- Tightened motive decomposition L5 no-leak checks so the forbidden-fragment scan now includes harness/proposal ids, persisted assertion identity fields, motive assertion creation DTOs, board/binding writer fields, trace repair items, raw provider output, and hidden reasoning. Legal runtime envelope identity fields remain outside this whole-result leak scan.
- No harness production path, generic runtime wrapper route, direct provider SDK path, or Domain Gate/domain writer path was added.

## 2026-06-09 Motive Evolution Role / Semantic / Debate Alignment
- Locked `motive_evolution.evolution_decision_support` as a high-authority decision-support runtime slot, not a motive evolution, portfolio, board, trace, queue, or Domain Gate writer.
- Confirmed bounded semantic processing is required for this node. The runtime may compare motive/version, evidence, trace, board, validation/result trigger, prior-decision, portfolio, human-confirmation, and accepted-risk pressure, but it must stop at support fields such as option kind, supporting/challenging refs, portfolio impact class, downstream impact, human-confirmation requirement, blocker/warning codes, and recommended next gate.
- Forbade writer-shaped output in the first slice: no `CreateMotiveEvolutionDecisionRequest`, `ApplyMotivePortfolioDecisionRequest`, `motive_roles_after_decision`, `change_set`, `core_motive_version_patch`, `application_status=approved|applied`, or direct domain mutation payloads.
- Locked controlled debate as two fixed provider roles plus a deterministic machine gate: `motive_evolution.evolution_option_designer` proposes ref-backed options, `motive_evolution.evolution_risk_challenger` challenges every option, and runtime machine gating drops uncovered or mutating options.
- Deferred LLM arbiter, open-ended transcript, shared debate execution helper, and semantic reconciliation. These add complexity and risk turning runtime output into a de facto domain decision.
- Kept admission verification-only: schema, refs/hashes, profile/prompt/model-option/cache/compression identity, role lineage, complete challenge coverage, human-confirmation flags, no-side-effect guards, replay, and drift. Admission must not judge scientific correctness, repair options, create queue items, or materialize domain state.
- Kept deterministic T-094 services plus human/domain gate as the only owners for `MotiveEvolutionDecision`, `MotivePortfolioDecision`, semantic `CoreMotiveVersion` changes, and primary/active-set portfolio transitions.

## 2026-06-09 Motive Evolution Output Schema / Admission Alignment
- Locked the first-slice final artifact as a small `evolution_decision_support_packet`, not a motive evolution decision, portfolio decision, queue item, or Domain Gate payload.
- Kept the output schema to three layers only: top-level support packet, `decision_options` keyed by option key, and per-option `challenge_check`.
- Top-level packet fields are limited to `support_result_status`, target motive/version refs, decision options, blocker/warning codes, and no-side-effect guards.
- Option identity is the map key. Option value fields are limited to option kind, supporting/challenging refs, portfolio impact class, human-confirmation flag, recommended next gate, blocker/warning codes, and the challenge check. Valid option kinds are `keep_current`, `repair_evidence_board_first`, `supersede`, `merge`, `split`, `park`, and `abandon`.
- Challenge checks remain compact and machine-verifiable: evidence status, trace status, portfolio status, human-confirmation status, downstream-impact status, and blocking reason codes.
- Rejected audit-oriented or writer-oriented expansion: no debate transcript, source-by-source prose review arrays, convenience writer fragments, `CreateMotiveEvolutionDecisionRequest`, `ApplyMotivePortfolioDecisionRequest`, `change_set`, `motive_roles_after_decision`, `core_motive_version_patch`, or approved/applied application status.
- Kept admission as a machine-boundary verifier only: request-owned refs/hashes, role lineage, option key uniqueness, complete challenge checks, portfolio-impact and human-confirmation invariants, recommended-gate consistency, no-side-effect guards, forbidden writer fields, replay, idempotency, and drift.
- Admission must not choose the best option, rank options semantically, repair missing challenge fields, infer refs from summaries, create queue items, or materialize Domain Gate/domain state.
- The first slice has no Domain Gate materialization. A later human/domain gate may consume `runtime_artifact_ref + option_key`, but only deterministic T-094 services can create or apply motive evolution and portfolio mutations.

## 2026-06-09 Motive Evolution Context / Cache / Compression Alignment
- Reframed complexity control for this node as necessary complexity, not low complexity. The node must keep enough context to produce high-quality evolution decision support across motive/version, portfolio, evidence, trace, triggers, prior decisions, human-confirmation policy, and accepted risks.
- Kept required core context broad enough for robust support: target motive refs, target core motive version refs plus version/state hashes, portfolio snapshot ref/hash, evidence board/binding refs and hashes, challenge/conflict refs, trace manifest refs/hashes, human-confirmation policy ref, and source hash bundle.
- Kept trigger context optional but strictly ref/hash-bound: validation cycle refs, result packet refs, cross-board review refs, prior evolution/portfolio decision refs, accepted-risk refs, and human request refs. Optional triggers can improve decision quality, but cannot be accepted as unbound summaries or writer DTOs.
- Added provider-readable `motive_context_packets[]` as prompt material only. Packets must carry packet refs/hashes, packet kind, covered target refs, covered evidence/trace refs where applicable, and source hash lineage. They cannot replace authority refs/hashes or become admission identity by themselves.
- Locked cache identity to slot/role/profile/model-option/prompt/schema identity plus input snapshot hash, required core refs/hashes, supplied trigger refs/hashes, context packet refs/hashes, compression policy id, and compression result hash.
- Added the debate-specific cache rule: challenger cache identity must include the designer role artifact ref/hash and option-set hash, preventing a risk challenge from being reused across different option sets.
- Locked compression as authority-preserving only. It may shorten provider-readable text, but must preserve refs/hashes, negative and challenging evidence markers, trace blockers, portfolio impact markers, human-confirmation requirements, accepted-risk refs, option keys, and prior-decision refs.
- Compression loss, packet coverage drift, authority hash drift, missing required core context, or harness/proposal/cached-output identity attempts must fail closed before provider invocation.
- Rejected invalid complexity sources: audit prose, debate transcripts, source-by-source prose reviews, writer DTO convenience payloads, automatic queue creation, Domain Gate materialization, and summary-derived refs.

## 2026-06-09 Motive Evolution Test Matrix / Implementation Readiness
- Locked the L1-L5/no-dual-track matrix around runtime quality and authority safety only, not human audit coverage.
- L1 shared schema must cover support packet shape, required core context, optional trigger ref/hash rules, context packet coverage, unique options, complete challenge checks, human-confirmation invariants, and forbidden writer/domain/harness/cache fields.
- L2 service tests must cover zero-call missing core context, harness/proposal/unbound-summary rejection, product provider-only, profile-owned model options, designer option set bounds, challenger coverage, designer/challenger cache identity, compression loss, packet coverage drift, portfolio-changing human-confirmation gating, and same-profile retry exhaustion.
- L3 route tests must prove a single slot-specific route, entrypoint-only controller behavior, provider fixture rejection, product provider-only, forbidden authority payload rejection, response-shape guards, and no Domain Gate/domain/queue side effects.
- L4 provider canary stays opt-in and only proves live provider execution through the same production route/service/orchestrator/admission path. It is not default CI and does not replace deterministic L5 stress.
- L5 stress must cover over-budget/compression-loss zero-call behavior, provider retry exhaustion, missing challenger coverage, cache identity drift, writer DTO/state-mutation payload rejection, missing human gate for portfolio-changing options, harness/proposal/cached-output identity rejection, and failed/blocked artifact no-side-effect behavior.
- No-dual-track scans must prove no harness production entrypoint, no direct provider wrapper, no motive/portfolio/board/evidence/trace/queue/Domain Gate writer calls, exactly one route, and forbidden fields limited to schemas, prompt constraints, negative fixtures, tests, or docs.
- Locked implementation sequencing to five steps: shared contracts/L1 schema; registry/prompt/context family; dedicated runtime service/L2 tests; route/controller/app wiring/L3 tests; L5 stress/runtime-stress/provider-canary hook/final verification.
- Implementation readiness status is ready for step 1 only. Do not start with route wiring, runtime service, provider canary, Domain Gate coupling, queue behavior, or T-094 writer integration before shared contracts and L1 schema tests land.
- Primary risks to watch during implementation: writer-shaped payload leakage, challenger reuse across option sets, compression dropping authority fields, admission semantic-ranking drift, and harness/proposal artifacts becoming runtime identity.

## 2026-06-09 Motive Evolution Shared Contracts / L1 Schema Implementation
- Completed implementation step 1 for `motive_evolution.evolution_decision_support`: shared slot/profile/prompt/role constants, runtime request DTO/schema, role output DTO/schemas, final support packet DTO/schema, context packet schema, forbidden-field guards, and L1 schema tests.
- Added two bounded role contracts: `motive_evolution.evolution_option_designer` emits ref-backed designed options and `motive_evolution.evolution_risk_challenger` emits challenged decision options with complete `challenge_check` coverage.
- Kept the final artifact support-only. It carries target motive/version refs, `support_result_status`, challenged `decision_options` keyed by option key, role lineage refs/hashes, runtime/cache identity, source hash bundle, and explicit no-side-effect guards. It cannot carry writer DTOs, queue payloads, Domain Gate requests, prompt text, raw provider output, cached prior output, audit transcript, or source-by-source review arrays.
- Added machine invariants for human-confirmation and portfolio impact: portfolio-changing option kinds or semantic/portfolio impact classes require `human_confirmation_required=true`, and human-confirmation options must route to motive evolution review, portfolio decision review, or human confirmation.
- Added machine invariants for robustness: blocked challenge checks require blocking reason codes; final support packets must keep `status`, `support_result_status`, and `runtime_failure_code` consistent.
- The runtime request is ref/hash-bound around target motive refs, core motive version refs, portfolio snapshot, evidence boards/bindings, challenge/conflict refs, trace manifests, human-confirmation policy, source refs/hashes, and optional trigger refs/hashes. `motive_context_packets[]` are provider prompt material only and must carry packet refs/hashes plus covered target/evidence/trace/source refs.
- Product mode remains provider-only through the shared `productRunModeRequiresProviderExecution` guard. Non-provider modes require slot-owned fixture outputs; provider mode rejects fixture outputs.
- No runtime service, route/controller/app wiring, registry YAML/profile mirror, prompt template registration, context family, provider canary, L5 stress, Domain Gate behavior, queue behavior, T-094 writer integration, or harness production path was added in this step.

## 2026-06-09 Motive Evolution Shared Contract Review Fixes
- Replaced array-shaped `designed_options` and `decision_options` with option-keyed maps. JSON object keys now carry option identity, so duplicate `option_key` ambiguity cannot pass through L1 schema, and option values cannot repeat a nested `option_key` convenience field.
- Tightened challenger coverage shape: `options_proposed` challenger outputs require non-empty, unique `challenged_option_keys`; `no_evolution_needed` requires empty challenged keys and empty decision option maps.
- Added optional trigger ref/hash pair invariants. Validation cycle, result packet, cross-board review, prior evolution decision, prior portfolio decision, accepted-risk, and human request context must supply refs and hashes together when present.
- Replaced shallow runtime/cache identity validation for the final support packet with a motive-evolution-specific recursive forbidden-key guard. Nested prompt/provider/cache/writer/Domain Gate/queue fields such as `raw_provider_output` and `cached_prior_output` are now rejected at any depth.
- No runtime service, route, registry, Domain Gate, queue, harness production path, or T-094 writer behavior changed in these review fixes.

## 2026-06-09 Motive Evolution Registry / Prompt / Context Family Implementation
- Implemented the second sequencing step only for `motive_evolution.evolution_decision_support`: model profile YAML, prompt template YAML, backend model-profile registry mirror, shared context family, and profile/context identity tests.
- Added `.ai/llm-config/registry/model_profiles.yaml` entry `paper-implementation.motive-evolution.evolution-decision-support.v1` with the promoted PaperImplementation provider candidate pattern.
- Added `.ai/llm-config/registry/prompt_templates.yaml` entry `paper-implementation-motive-evolution-decision-support@v1`, requiring slot/role identity, target motive/version refs, source hash bundle, motive context packets, portfolio snapshot, evidence board/binding refs, trace refs, human-confirmation policy, and optional ref-backed triggers.
- Added backend registry mirror coverage in `TopicSelectionModelProfileRegistryService`: profile function `paper_implementation_motive_evolution_evolution_decision_support`, stage family `paper_implementation_motive_evolution`, output contract `PaperImplementationMotiveEvolutionRoleArtifact@v1`, low creativity, high reasoning, and large output budget.
- Added shared context family `paper_implementation_motive_evolution` so the future runtime service can use the existing prompt/context/cache/compression identity pipeline without adding a second entrypoint.
- Added registry tests for product-mode provider-only eligibility, profile-owned explicit model options, motive-evolution profile resolution, and prompt/context packet identity using the slot's shared constants.
- No runtime service, route/controller/app wiring, L2 service tests, L3 route tests, L5 stress cases, provider canary hook, Domain Gate behavior, queue behavior, T-094 writer integration, or harness production path was added in this step.

## 2026-06-09 Motive Evolution Runtime Service / L2 Implementation
- Implemented the third sequencing step only for `motive_evolution.evolution_decision_support`: dedicated backend runtime service plus L2 service tests. No route/controller/app wiring, L5 stress, provider canary, Domain Gate, queue behavior, T-094 writer integration, or harness production path was added.
- Added `PaperImplementationMotiveEvolutionRuntimeService.runEvolutionDecisionSupport(...)` as a service-only runtime path. It owns request preflight, profile/prompt/context/cache/compression identity assembly, two role invocations, same-profile technical retry, machine boundary gating, role/final runtime artifact assembly, and admission calls.
- Kept the controlled debate bounded to two fixed roles: option designer first, then risk challenger with the admitted designer role artifact ref/hash and option-set hash in lineage/cache identity. The service has no arbiter, open transcript, shared debate execution helper, or semantic reconciliation.
- Runtime preflight fails closed before provider calls for memo/harness/proposal/cached-like primary refs, missing motive context packets, context packet ref mismatches, uncovered packets, or missing target coverage.
- Runtime machine gates reject non-owned refs, incomplete challenger coverage, option-set or role-artifact lineage drift, missing human-confirmation gates for portfolio-changing options, blocked challenge checks without reason codes, missing no-side-effect guards, forbidden writer/Domain Gate/queue/provider/prompt/cache fields, and provider provenance drift.
- Product mode remains provider-only: provider requests reject mocked/Codex role outputs, non-provider modes cannot carry `model_option_id`, and provider `model_option_id` must be in the slot profile allowlist.
- Final artifacts are support-only `evolution_decision_support_packet` payloads. They preserve role lineage, runtime/cache identity, decision options, source hash bundle, and no-side-effect guards, but cannot carry `MotiveEvolutionDecision`, portfolio request, board/binding/trace/queue payload, Domain Gate request, raw provider output, rendered prompt text, cached prior output, or audit transcript fields.
- Added JSON-safe artifact payload handling for this service so runtime artifacts do not persist explicit `undefined` values.
- Added L2 coverage for passed support packets, `no_evolution_needed`, semantic blocked support, zero-call preflight blockers, designer/challenger retry exhaustion, invented refs, human-gate failures, challenger coverage gaps, option-set mismatch, blocked-check reason requirements, side-effect guard failures, authority-field rejection, provider provenance drift, product fixture rejection, model-option drift, and harness primary-ref rejection.

## 2026-06-09 Motive Evolution Runtime Service Review Fixes
- Fixed the default provider model-option path. When the request omits `model_option_id`, the service now accepts an orchestrator-resolved provider option only if it belongs to the motive-evolution slot allowlist; explicit request options still require exact provenance equality.
- Tightened provider provenance drift checks. Product/provider role results must now keep `run_mode=product`, `source_kind=provider_response`, and `non_provider=false` in addition to matching run, role, execution mode, executor kind, profile, prompt, schema, and output contract identity.
- Added L2 regression coverage for omitted `model_option_id` resolving to the default slot-owned provider option, provider source-kind drift, and provider run-mode drift.
- No route/controller/app wiring, Domain Gate, queue, T-094 writer integration, direct provider wrapper, or harness production path was added in these review fixes.

## 2026-06-09 Motive Evolution Runtime Route Wiring Implementation
- Implemented the fourth sequencing step for `motive_evolution.evolution_decision_support`: one controlled route/controller/app wiring path plus L3 route coverage only.
- Added the slot-specific runtime route `POST /paper-implementation/projects/:implementation_project_id/runtime-slots/motive-evolution-decision-support/run`, bound to `runPaperImplementationMotiveEvolutionRuntimeRequestSchema` and `PaperImplementationMotiveEvolutionRuntimeService.runEvolutionDecisionSupport(...)`.
- Added `PaperImplementationMotiveEvolutionRuntimeService` to `PaperImplementationController` as an entrypoint-only dependency. The controller forwards only project id and request body; it does not compile prompts, select models, repair provider output, call Domain Gate, create queue items, or invoke T-094 motive/portfolio/board writers.
- Added `paperImplementationMotiveEvolutionLlmGateway` to `buildApp()` and wired it through the existing `TopicSelectionAgentOrchestratorService` path. The route does not add a direct provider wrapper, generic runtime-envelope write route, or harness production entrypoint.
- Added L3 route tests for controlled two-role provider execution, default provider model-option resolution through the profile registry, admitted support-only final artifacts, no motive/portfolio/board/evidence/trace/queue/Domain Gate side effects, Domain Gate materialization rejection, ref-drift retry exhaustion, product provider-only fixture rejection, authority payload rejection, and model-option drift rejection before gateway invocation.
- Extended the deterministic every-product-slot provider-failure route coverage to include motive evolution. Provider failures retry once, fail closed with one failed role artifact, one rejected admission record, no final support packet, and no non-provider fallback.
- Updated legacy controller-construction tests with a non-executed motive evolution runtime placeholder so unrelated live-experiment, provider-variance, and general PaperImplementation route tests keep their existing scope while matching the expanded constructor.
- Fixed two route-discovered runtime quality issues: controlled debate `round_index` is now 1-based to satisfy the shared agent invocation audit contract, and motive evolution retry telemetry now uses shared `RUNTIME_TECHNICAL_RETRY_EXHAUSTED/RECOVERED` warning codes so operational telemetry remains consistent with other promoted slots.
- This step does not add provider canary hooks, L5 stress cases, runtime-stress required-case parsing, Domain Gate materialization, queue behavior, Prisma changes, T-094 writer integration, or harness production semantics. The slot remains unpromoted until step 5 completes.

## 2026-06-09 PaperImplementation Controller Dependency Injection Refactor
- Closed the route-wiring maintenance risk discovered during motive evolution step-4 review: `PaperImplementationController` no longer accepts a long positional constructor parameter list.
- Added `PaperImplementationControllerDependencies` and changed the constructor to require a single named dependency object. This makes every runtime/admission/domain/live/evaluation dependency explicit at the call site and prevents future promoted slots from shifting later arguments silently.
- Updated the `buildApp()` controller construction path and all manual controller construction tests to pass named dependencies. Route tests now show the intended dependency surface directly, including optional `liveExperimentAdapter` and `providerVarianceEvaluation`.
- This refactor is structural only. It does not change any route path, request schema, runtime service behavior, admission behavior, Domain Gate behavior, provider gateway selection, queue behavior, or harness semantics.
- This maintenance refactor preceded motive evolution step 5. Step 5 is now complete and recorded below.

## 2026-06-09 Motive Evolution Step 5 Promotion Implementation
- Completed the final promotion slice for `motive_evolution.evolution_decision_support`: L5 stress coverage, unified runtime-stress required-case parsing, opt-in live provider canary hook, provider-canary config-key registration, final no-dual-track scans, and promotion matrix updates.
- Added eight motive-evolution L5 required cases: over-budget zero-call preflight, provider retry exhaustion, schema-valid missing challenger coverage, option-set drift, writer-shaped payload rejection, portfolio-changing option without human-confirmation gate rejection, blocked challenge without reason rejection, and memo-like context zero-call preflight.
- Bound the new cases into `.ai/scripts/paper-implementation-runtime-stress.mjs`. Missing, skipped, failed, or renamed motive-evolution L5 cases now fail the stress summary.
- Added `T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE` to the LLM config-key registry, deterministic runtime-stress disabled flags, and `paper-implementation:provider-canary`.
- Added an opt-in live provider canary for the motive-evolution route. The canary uses the same production route/service/orchestrator/admission path and asserts provider-only execution, admitted final support packet, no non-provider artifacts, and no motive/portfolio/board/trace/queue/Domain Gate writer payloads.
- The promotion does not add Domain Gate materialization, queue behavior, Prisma schema changes, T-094 writer integration, direct provider wrappers, or harness production semantics.
- All agent workflow slots in this matrix are now promoted. The next work should shift to deterministic/operational lane stress and Domain Gate/domain-service replay coverage, not another LLM runtime node.

## 2026-06-09 Domain Gate Consumption Matrix / Readiness Alignment
- Locked the next slice as deterministic Domain Gate / domain-service closure. This is not another LLM runtime promotion and does not add a generic materializer.
- Current materializable allowlist remains exactly three slot families: `claim_boundary_review.boundary_debate` to deterministic `ClaimCandidate`, `dossier_readiness_prep.readiness_audit` to deterministic `ImplementationDossier`, and `result_analysis.interpretation_scenarios` to deterministic `ResultInterpretationPacket`.
- Every other promoted runtime final artifact is support-only for this slice. It may inform deterministic services, human review, or later queue/domain decisions, but it cannot call Domain Gate directly and cannot carry writer-shaped payloads.
- Domain Gate owns only state-transition dispatch to deterministic domain services. Runtime owns provider orchestration and artifact production; admission owns machine verification; harness owns validation/replay only. Admission must not rebuild context, judge semantic correctness, or materialize domain writes.
- Replay semantics stay same-id plus same normalized materialization identity: same identity returns `already_materialized`; same id with different payload returns `VERSION_CONFLICT`; malformed materialization payloads return `INVALID_PAYLOAD` before domain-service calls.
- Blocked, failed-runtime, role-scope, unsupported-slot, non-admitted, or issue-bearing admissions fail closed with `GATE_CONSTRAINT_FAILED`. This rule applies before any deterministic writer call.
- Implementation readiness is limited to coverage hardening: add an explicit support-only rejection matrix, close trace-integrity Domain Gate rejection if not already covered by a real route fixture, add deterministic stress required-case parsing for Domain Gate support-only rejection/replay/drift, and keep no-dual-track scans focused on writer ownership.

## 2026-06-09 Domain Gate Support-Only Rejection Matrix Implementation
- Completed deterministic closure implementation step 1: added one required route integration matrix, `PaperImplementation Domain Gate rejects support-only runtime final artifacts`.
- The matrix drives every support-only promoted slot through its real product runtime route, verifies a `passed` admitted final artifact, then calls `/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate` and requires `409 GATE_CONSTRAINT_FAILED`.
- Explicitly covered support-only trace integrity through the real `trace-integrity-boundary-debate` route, plus route skeptic and experiment critique, so no support-only slot relies only on the generic unsupported-slot allowlist by implication.
- Kept the Domain Gate materializable allowlist unchanged: only claim-boundary, dossier-readiness, and result-analysis final artifacts can dispatch to deterministic result/claim/dossier writers.
- Updated `.ai/scripts/paper-implementation-runtime-stress.mjs` with `required_runtime_regression_cases`. The support-only rejection matrix is now parsed from the runtime service/route regression TAP output and fails the stress summary if missing, skipped, failed, or renamed.
- This step did not add a generic Domain Gate facade, broad runtime-envelope materializer, queue materializer, admission semantic logic, harness production path, or any route/validation/feasibility/board/motive/WorkOrder writer dispatch.

## 2026-06-09 Domain Gate Replay / Drift / Writer Ownership Implementation
- Completed deterministic closure implementation step 2 by strengthening machine gates around existing Domain Gate behavior instead of adding new runtime or admission semantics.
- Expanded `required_runtime_regression_cases` from one support-only matrix case to nine required cases. Runtime-stress now fails if claim, dossier, or result-analysis idempotency/replay tests disappear, if same-id drift conflict tests disappear, if blocked/failed final rejection disappears, or if the support-only rejection matrix disappears.
- Added `.ai/scripts/paper-implementation-domain-gate-writer-ownership-check.mjs` as a machine check for the Domain Gate service dependency and writer surface. The check allows only `PaperImplementationRuntimeAdmissionService`, `PaperImplementationResultClaimDossierService`, and `PaperImplementationRuntimeDomainGateService` class refs in the Domain Gate service, and only the three result/claim/dossier create calls as writer calls.
- Added the writer-ownership check as stress runner step `02-domain-gate-writer-ownership-scan`, so the full deterministic stress summary fails on writer-surface drift even if TAP tests still pass.
- This step kept the materializer allowlist unchanged and did not add route/validation/feasibility/board/motive/queue/live adapter writers, a generic Domain Gate facade, a broad runtime-envelope materializer, admission semantic processing, or harness production behavior.

## 2026-06-09 Deterministic Lane Regression Step 3 Implementation
- Completed deterministic closure implementation step 3 by moving intake bootstrap, trace manifest, and WorkOrder bridge evidence into the unified runtime-stress closure gate as non-LLM deterministic lanes.
- Added `03-deterministic-lane-regression` to `.ai/scripts/paper-implementation-runtime-stress.mjs`. The step runs focused existing route/service tests under deterministic env with all live provider keys and canary flags disabled.
- Added `required_deterministic_lane_cases` with 11 machine-parsed cases covering intake route replay, duplicate bootstrap idempotency, stale bridge hash no-mutation rejection, complete trace manifest no-queue behavior, stale trace repair queue behavior, immutable trace/citation/claim id conflicts, WorkOrder draft creation from admitted cycle/plan refs, stale WorkOrder trace rejection, WorkOrder admission replay/drift, harness-run idempotency replay/drift, and target-specific run-evidence trace identity.
- Hardened `PaperImplementationWorkOrderExperimentBridgeService`: `admitResearchWorkOrder(...)` now replays the same `admission_gate_result_id` idempotently and rejects drifted gate ids with `VERSION_CONFLICT`; `submitHarnessRun(...)` now consumes the repository idempotency-key lookup, returns the existing run for same external job identity, and rejects drifted external job identity/attempt/harness-run id with `VERSION_CONFLICT`.
- Added focused WorkOrder L2 tests for admission replay/drift and harness-run idempotency replay/drift.
- This step did not add a runtime slot, provider call path, Domain Gate materializer, queue materializer, live adapter call, admission semantic processing, or harness production path. Runtime experiment-design artifacts remain draft proposals only; deterministic T-096 still owns WorkOrder creation/admission/submission boundaries.

## 2026-06-10 DecisionWorkQueue Deterministic Stress Implementation
- Completed deterministic closure implementation step 4 by adding DecisionWorkQueue required-case coverage to the unified runtime-stress closure gate.
- Hardened the existing harness-backed queue identity. `PaperImplementationAiWorkflowHarnessService` no longer includes `harnessRunId` in `dedup_key`; queue identity is now scoped to `agent_workflow_harness`, transition key, queue type, target ref, and sorted blocker codes. Equivalent blocked reruns reuse one queue item instead of producing per-run duplicates.
- Kept queue scheduling semantics bounded. The current harness-generated queue item initializes with `retry_count=0`, `retry_budget=1`, and `cooldown_until=null`; this step does not add a queue scheduler, automatic cooldown mutation, scheduler-driven reopen behavior, or a new domain queue service.
- Hardened resolution replay semantics in both in-memory and Prisma repositories. Terminal statuses `resolved`, `dismissed`, and `superseded` replay idempotently when the same terminal status is supplied again, and reject different terminal statuses with `VERSION_CONFLICT`.
- Added focused tests for cross-rerun queue dedup, bounded retry/cooldown defaults, terminal resolution replay/drift rejection, and preserving blocked harness-run authority after queue resolution.
- Added `04-decision-work-queue-regression` to `.ai/scripts/paper-implementation-runtime-stress.mjs` with required cases for harness rerun dedup, service resolution replay/drift, Prisma resolution replay/drift, and runtime admission rejecting drift without queue payloads.
- Static scans show promoted runtime services mention `decision_work_queue_item` only as forbidden input/no-side-effect guard text; runtime/admission still do not create queue items or expose queue payloads.
- This step did not add a runtime slot, provider call path, Domain Gate materializer, broad queue materializer, admission semantic processing, live adapter call, or a second queue entrypoint. The existing AI workflow harness queue surface remains a validation blocker surface; any future T-099/T-100 domain queue service extraction must be a separate ownership decision to avoid dual-track queue creation.

## 2026-06-10 DecisionWorkQueue Review Fixes
- Fixed the main quality risk found after implementation: a recurring blocker could previously reuse a terminal queue item and return `status=resolved|dismissed|superseded` to a newly blocked harness run.
- The in-memory and Prisma repositories now reopen the existing semantic queue item when an equivalent blocker recurs after terminal resolution. Reopen keeps the same queue id and dedup key, sets `status=open`, clears resolved state, refreshes bounded retry/cooldown fields from the new blocker item, and appends the new harness run ref to `created_from_refs`.
- This preserves the single dedup identity and existing DB unique key without creating a second queue path, while preventing consumers from treating a newly blocked run as already resolved.
- Added service and Prisma regression coverage, and added the recurrent-blocker reopen case to `required_decision_work_queue_cases`.

## 2026-06-10 DecisionWorkQueue Quality Review And Live Adapter Entry
- Final quality review found no remaining DecisionWorkQueue implementation issue after the recurrent-blocker reopen fix. The in-memory path, Prisma path, focused tests, stress required-case parser, and documentation now share the same queue identity and reopen semantics.
- Full diff whitespace check and project governance sync/lint passed. The only governance warning is the pre-existing T-115 acceptance-criteria checkbox warning, outside this T-114 slice.
- Entered the next deterministic/operational slice: env-gated live experiment adapter operational stress. Existing live adapter service/route tests pass as the baseline, but they are not yet part of the T-114 unified runtime-stress required-case gate.
- Next-slice scope is operational, not an LLM runtime promotion: WorkOrder admission remains the prerequisite; the live adapter owns submit/sync/collect/cancel calls to experiment-foundation; runtime/admission/harness must not submit, sync, collect, cancel, or create trusted run evidence directly.
- First alignment point for the next slice is the machine contract for live adapter stress: submit idempotency/replay, wrong external-job rejection before side effects, sync terminal-observation without trusted evidence creation, collect/cancel final evidence creation through WorkOrder monitor intake, failure/backoff behavior, and no-dual-track scans proving no runtime/admission/harness live-experiment entrypoint.

## 2026-06-10 Live Experiment Adapter Operational Stress Implementation
- Completed the env-gated live experiment adapter operational stress slice without adding a runtime slot, admission semantic processing, Domain Gate materializer, harness production path, or live cloud/provider default path.
- Added `05-live-experiment-adapter-operational-regression` to `.ai/scripts/paper-implementation-runtime-stress.mjs`. The step runs focused live adapter service/route tests under deterministic env.
- Added `required_live_experiment_adapter_cases` with 12 machine-parsed cases covering admitted WorkOrder submit idempotency, unadmitted submit rejection before external execution, missing materialization ref rejection, wrong external job rejection before sync/collect/cancel side effects, running sync monitor-only behavior, terminal sync observation without trusted evidence creation, collect success final evidence idempotency, non-final cancel monitor-only behavior, terminal cancel final evidence idempotency, route schema/delegation, external execution failure no-partial-state/no-fallback behavior, and ownership/no-dual-track scan.
- Added a fake-execution failure injection test proving external submit/sync/collect/cancel failures do not create PaperImplementation harness runs, trusted run evidence, state-completing fallback, or semantic repair.
- Added `.ai/scripts/paper-implementation-live-adapter-ownership-check.mjs` as a TAP-emitting ownership scan. It verifies the live adapter service, controller, and route files own the live-experiment entrypoints, and scans promoted runtime services, runtime admission, runtime Domain Gate, and AI workflow harness for forbidden live adapter/execution/WorkOrder monitor calls.
- Runtime-stress summary now fails if any live adapter required case is missing, skipped, failed, or renamed. This makes the operational boundary machine-verifiable alongside L5, runtime regression, deterministic lane, and DecisionWorkQueue closure gates.

## 2026-06-10 Provider Variance Evaluation Evidence/Preflight Stress Implementation
- Completed provider variance evaluation hardening as an evidence/preflight lane, not as a runtime/provider execution lane and not as a product provider canary for promoted slots.
- Added `07-provider-variance-evaluation-regression` and `08-provider-variance-evaluation-ownership-scan` to `.ai/scripts/paper-implementation-runtime-stress.mjs`.
- Added `required_provider_variance_evaluation_cases` with six machine-parsed cases: deterministic fake replay materializes harness signals, live provider profiles skip/block without executing calls, schema/trace/authority/handoff guardrails, evaluation-only refs without runtime admission or Domain Gate authority, route schema/delegation, and ownership/no-dual-track scan.
- Added a focused service test proving provider variance response refs stay within harness/proposal artifacts and do not expose runtime artifact, admission, Domain Gate, WorkOrder, experiment, or deterministic domain authority refs.
- Added `.ai/scripts/paper-implementation-provider-variance-ownership-check.mjs` as a TAP-emitting ownership scan. It verifies provider variance service/controller/route/app own the evaluation entrypoint, and scans promoted runtime services, runtime admission, runtime Domain Gate, live adapter, WorkOrder bridge, result/claim/dossier, and AI workflow harness service for forbidden provider-variance evaluation references.
- Tightened the successful provider-variance recommendation reason so `enable` is explicitly evaluation/preflight-only and cannot be read as product runtime/provider canary or Domain Gate admission eligibility.
- This step did not add live provider execution, provider canary coverage for promoted slots, runtime artifacts, admission records, Domain Gate materialization, deterministic writer calls, queue materializers, live adapter calls, or a harness production path.

## 2026-06-10 Final Holistic Closure Review
- Reviewed T-114 closure state across runtime/admission/Domain Gate/deterministic/operational lanes after provider variance evaluation stress passed.
- Fixed documentation drift in `06-node-runtime-matrix.md`: deterministic/non-LLM rows now reflect that intake, trace, WorkOrder, Domain Gate writer ownership, DecisionWorkQueue, live adapter, and provider variance evaluation are closed through unified runtime-stress required cases instead of still being future stress candidates.
- Updated `00-overview.md` acceptance criteria to record that all agent workflow nodes are promoted and deterministic/operational lanes are covered by unified required-case stress without becoming LLM runtime slots.
- Re-ran boundary scans for stale pending text, runtime writer calls, provider variance cross-consumption, registry product eligibility, and ownership scripts. The remaining closure evidence is machine-verifiable through the runtime-stress summary and ownership scan exits.

## 2026-06-11 Closure Gates Re-Run And Task Closure
- Re-ran both closure gates on a clean baseline before opening the productization follow-up package.
- Deterministic runtime-stress passed: run id `t114-paper-implementation-runtime-stress-1781132291471`, 290 tests / 226 passed / 64 env-gated skips / 0 failed, 9/9 steps passed, 95/95 required cases passed across all six required-case groups, runner guardrails self-attested (provider keys unset, 16 live flags disabled).
- Near-prod runtime gate passed: run id `t114-paper-implementation-near-prod-runtime-gate-1781132560502`, live openai through the shared orchestrator/gateway path with 13 provider calls matching debate topology, Prisma repository evidence, exactly-once concurrent materialization, idempotent replay, drift `VERSION_CONFLICT`, planning no-Domain-Gate boundary enforced, no-dual-track and redaction guardrails all true.
- Marked T-114 `done`. Follow-up productization scope (compression execution closure, context-profile registry promotion, cross-run memory, run coordinator, conditional debate/complexity gating, slot parameter manifest, `T114_*` resource de-tasking, usage-fit cadence) is owned by `dev-docs/active/paper-implementation-productization-hardening/` (`T-124`) and is out of scope here.

## 2026-07-01 外部交叉修复留痕（T-128 `ad1aa8c4`）
- 归属本包的 replay 工具缺陷由 T-128（`topic-selection-product-readiness-closure`）在其 W-05 Commit-3 Bugbot review 中**顺修并单独提交 `ad1aa8c4`**（非本包 session 改动，此处补交叉引用留痕以补全归属 changelog）：`.ai/scripts/paper-implementation-v1-runnable-replay.mjs` 未随 `PaperImplementationController` 单依赖对象化（21 字段）更新，仍用旧 11 位置参数实例化 → 服务错位 + 缺 11 个 runtime service，bootstrap **500**（应 201）；`.mjs` 不过 tsc 故 CI 静默。修法：补 11 个 `PaperImplementation*RuntimeService` import + 依赖对象构造（未被 V1 route-replay 触达的 AI 节点共用 throwing stub orchestrator——构造需要、replay 不触达其端点）。验证：replay `status:passed` / `blockers:[]`。详见 `dev-docs/active/topic-selection-product-readiness-closure/04-verification.md` 2026-06-30 段。
