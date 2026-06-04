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
- Whether the next P2 promotion group should pair `route_architecture` with `route_skeptic_review` in one bounded slice, or promote the skeptic first as the safer semantic blocker path.
