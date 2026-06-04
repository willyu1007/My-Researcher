# T-114 Paper Implementation Runtime Orchestration Hardening

## Status
- State: in-progress
- Task ID: `T-114`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Current focus: trace-integrity, claim-boundary, dossier-readiness, result-analysis, experiment-design, and experiment-critique runtime slots now use controlled runtime/admission paths; experiment planning artifacts are admitted evidence only and cannot create WorkOrders, Domain Gate payloads, or live experiment adapter side effects.
- Next step: use `13-pending-node-processing-matrix.md` to promote the remaining P2 route slice with `route_architecture` / `route_skeptic_review`, with PaperImplementation product-mode profile eligibility aligned to the runtime guard.

## Problem
- PaperImplementation V1 has strong domain contracts, route-level replay, proposal-only AI harness, live experiment adapter, and deterministic provider-variance preflight.
- It does not yet have the production-grade runtime orchestration standard now proven in topic-selection: per-slot runtime/admission services, prompt/runtime identity, provider canaries, compression/token gates, replay/drift stress, and node-by-node production evidence.
- Without this hardening, PaperImplementation can pass deterministic V1 closure while still lacking operational proof for provider-backed or Codex-assisted implementation workflows.

## Goal
- Inspect and plan PaperImplementation harness/runtime orchestration node by node.
- Produce an implementation-ready hardening plan that uses topic-selection runtime lessons while keeping PaperImplementation semantics domain-owned.
- Define and implement the first shared-contract slice before service/runtime/Prisma/provider promotion.

## Non-Goals
- Do not add provider canaries or live provider execution to the default test path.
- Do not expose a generic public HTTP route that accepts arbitrary runtime artifact envelopes.
- Do not apply Prisma migrations to a live database without explicit approval.
- Do not add provider secrets or make live provider checks part of default CI.
- Do not introduce a second LLM gateway or model-profile registry.
- Do not let agent output write motive, validation, work-order, claim, dossier, or trace authority directly.
- Do not use topic-selection business node contracts as PaperImplementation contracts.

## Acceptance Criteria
- [x] A roadmap exists.
- [x] The relevant PaperImplementation and topic-selection runtime task packages were inspected.
- [x] A node/runtime matrix identifies first-slice and later-slice promotion candidates.
- [x] The production verification ladder is defined.
- [x] User confirmed the first shared runtime/admission contract slice.
- [x] Shared runtime artifact/admission schemas exist without reusing harness proposal artifacts.
- [x] In-memory runtime/admission repository and service tests exist without Prisma, routes, provider execution, or state mutation.
- [x] Prisma/queryability scope is confirmed and implemented as generic runtime artifact/admission tables, not one table per role.
- [x] Controlled HTTP admission route exists through `buildApp()` without exposing runtime envelope write bypass.
- [x] Provider-canary scope is confirmed before L4 work.
- [x] Trace-integrity boundary debate has a controlled runtime run route through the production runtime/admission service path.
- [x] Provider-canary command is env-gated and uses the same runtime run route/service path as deterministic integration tests.
- [x] Live provider canary has passed with explicit provider credentials under the non-`failed_runtime`, four-provider-call, admitted-final-artifact criteria.
- [x] Review fixes closed the trace-integrity retrieval, artifact-payload persistence, prompt-cache provenance, runtime token-budget, provider feature id, and admission-idempotency gaps without adding a parallel runtime entrypoint.
- [x] P1 claim-boundary and dossier-readiness runtime slots produce role/final artifacts through `PaperImplementationP1RuntimeReviewService` and `PaperImplementationRuntimeAdmissionService`.
- [x] Runtime Domain Gate materializes only admitted final P1 artifacts into deterministic claim/dossier services; role, blocked, unsupported, malformed, or same-id/different-payload runtime artifacts fail closed.
- [x] Harness/runtime cooperation is tested: admitted runtime final artifacts may be referenced as proposal artifacts, while direct authority mutation through harness remains blocked.
- [x] P1 claim-boundary and dossier-readiness provider canaries are env-gated and pass through the same runtime route/service/admission path as deterministic tests.
- [x] L3 Prisma smoke command is env-gated and fail-fast when runtime/admission migrations are not applied.
- [x] L3 Prisma smoke passes after applying pending local/dev migrations and persists runtime/admission rows through the Prisma repository path.
- [x] L5 stress/compression/adversarial coverage proves over-budget inputs, adversarial prompt payloads, forbidden provider outputs, provider gateway failures, and schema-invalid provider outputs fail closed through runtime artifacts/admission without producing final/domain artifacts.
- [x] L5 `paper-implementation:runtime-stress` is the deterministic runtime closure gate and derives required L5 case status from parsed TAP output.
- [x] L6 `paper-implementation:near-prod-runtime-gate` exists as a near-prod runtime gate with `passed | blocked | failed` status semantics and machine-readable summary evidence.
- [x] L6 passes locally through live provider, Prisma runtime/admission repository, HTTP runtime routes, HTTP Domain Gate materialization, replay/idempotency, minimal concurrency, and drift conflict checks.
- [x] L6 runner meta-tests cover missing route evidence, incomplete route/provider/no-dual-track evidence, child timeout handling, and missing env-file blocked-summary behavior.
- [x] HTTP runtime routes fail closed on provider gateway failure for trace-integrity, claim-boundary, and dossier-readiness slots without falling back to mocked/Codex outputs.
- [x] HTTP Domain Gate route rejects blocked and failed runtime artifacts instead of materializing claim/dossier authority.
- [x] Trace-integrity and P1 runtime slots perform at most one same-profile technical retry for provider/schema runtime failures without changing execution mode, model option, prompt template, role node identity, or admitted prior-role lineage.
- [x] L5 coverage proves retry exhaustion records one failed role artifact with `retry_attempt_index=1`, cumulative provider call count, rejected admission, and no final/domain artifact.
- [x] L5 coverage proves transient retry recovery records one passed role artifact with recovered warning, cumulative provider call count, no non-provider fallback, and no rerun of already admitted prior roles.
- [x] Runtime admission replay is idempotent for rejected failed-runtime admissions as well as admitted records.
- [x] Env-gated live provider fail-closed canary exists and has passed through the same runtime HTTP routes, `BackendLlmGateway`, runtime services, and admission service while forcing invalid provider credentials.
- [x] Deterministic runtime-stress explicitly disables the live fail-closed canary flag so L5 closure cannot accidentally depend on live provider state.
- [x] Promoted runtime slot responses include backend-only `PaperImplementationRuntimeOperationalTelemetry@v1`, derived from the same runtime artifacts and admission records without changing runtime/admission/domain decisions.
- [x] Operational telemetry covers provider-call consistency, role/final artifact counts, admission outcomes, retry recovered/exhausted counts, response-reuse/cache status counts, runtime failure codes, blocker/warning codes, and admission issue codes.
- [x] Service, route, L5 stress, and near-prod route tests assert telemetry on passed, blocked, recovered-retry, retry-exhausted, deterministic fail-closed, live fail-closed, and provider-canary paths.
- [x] Result-analysis `interpretation_scenarios` is promoted through a controlled runtime slot route, shared runtime/admission persistence, existing orchestrator/gateway path, deterministic Domain Gate materialization into result interpretation packets, provider canary hooks, L5 stress coverage, and L6 evidence requirements.
- [x] Experiment-design `work_order_draft` and experiment-critique `plan_critique` are promoted through controlled runtime slot routes, shared runtime/admission persistence, existing orchestrator/gateway path, provider canary hooks, L5 stress coverage, L6 near-prod evidence requirements, and explicit no-Domain-Gate/no-WorkOrder/no-live-adapter authority boundaries.
- [x] Experiment-planning review fixes tightened WorkOrder draft candidate shape to the real `CreateResearchWorkOrderDraftRequest`, removed critique executor-kind drift, and require P2 live boundary evidence to pass rather than merely return a blocked response.
- [x] Pending node processing matrix exists for all unpromoted agent workflow nodes and deterministic/operational lanes that still need runtime, profile, context, loop, fallback, debate, admission, or stress treatment.
