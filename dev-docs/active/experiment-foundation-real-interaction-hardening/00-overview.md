# T-106 Experiment Foundation Real-interaction Hardening

## Status
- State: in-progress
- Task: T-106
- Parent task: `T-043 experiment-foundation-v1`
- Current focus: Phase 8 UI-driven full-flow smoke landed via T-110 S5. By the bilateral 2026-07-23 handoff, T-132 M7 uniquely owns the provider-specific Aliyun implementation/execution; T-106 remains open as an acceptance consumer until T-106 imports the final redacted M7 evidence.

## Goal
Deepen the post-V1 validation of experiment foundation by proving automation, real or near-real external interaction boundaries, cross-flow handoffs, and recovery behavior under harder conditions than the T-090 capability suite and T-103 runner closure.

T-106 should consume the established T-070 through T-078 contracts and product surfaces, plus the T-090 scenario harness and T-103 full-flow runner. It must not create a second semantic track for readiness, promotion, materialization, execution, result validation, evidence, or desktop workbench behavior.

The product-level target is a usable tool surface that lets paper-implementation automation hand off into experiment-foundation smoothly, then consume refs, results, validation, and evidence without manual repair or semantic guesswork.

## Non-goals
- Do not add new experiment-foundation domain semantics by default.
- Do not make real cloud submission part of the default verification lane.
- Do not commit credentials, raw datasets, model weights, checkpoints, SDK payloads, or unredacted logs.
- Do not expand Prisma, REST, shared contracts, or desktop UI unless a hardening finding requires an explicit decision.
- Do not replace the T-103 full-flow runner; extend or integrate the runner only after the harness command contract is stable.

## Acceptance Criteria
- [x] A hardening matrix covers registry, readiness, promotion, materialization, execution, result/evidence, desktop, cross-flow integration, and external-canary boundaries.
- [x] LocalScript robustness tests cover allowlist, path containment, timeout, cancellation, idempotency, partial collection, invalid result payloads, and process cleanup.
- [x] API and persistence tests cover duplicate keys, stale refs, readiness transitions, materialization/job hash mismatches, promotion gates, and recovery-safe status updates.
- [x] Memory and disposable Postgres paths prove representative automation-facing parity for registry, readiness, promotion, execution, result, and evidence transitions.
- [x] UI-driven full-flow smoke covers registry, readiness, job submit/sync/cancel/collect, result/evidence detail, and error rendering without renderer-owned domain semantics. Landed as T-110 S5: `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` walks the new IA (Overview → 资产库 typed sub-tabs → 实验流 timeline → JobActionForms → ReadinessInspector → Facts/Sparkline), asserts canonical-source classifications, and exercises malformed-payload + invalid-status rejection. Map of legacy contract names to S2/S3 IA in `02-architecture.md` UI Flow Contract section.
- [x] Cross-flow tests verify PaperImplementation and adjacent evidence surfaces consume experiment-foundation refs and sidecars without copying canonical DTOs or claim fields.
- [x] External canary has a default safe lane plus a true opt-in prerequisite gate with credential, mirror, approval, budget, cleanup, and redaction checks.
- [ ] Provider-specific true external canary can verify real connectivity and the minimum real external flow when credentials, environment, budget, and cleanup approval are present. Implementation authority is T-132 M7; T-106 closes this item only by verifying the T-132 M7 verdict and redaction/cleanup contract.
- [x] Real-data policy uses synthetic deterministic fixtures by default, with controlled local real fixtures and true external samples only through explicit opt-in and redacted artifacts.
- [x] T-103 has either a stable hardening lane hook or a documented handoff command for running this suite.
- [x] Runner artifacts are redacted, stored under `.ai/.tmp/experiment-foundation-hardening/<run-id>/`, and governance lint passes for the current task state.

## Handoff
Use `pnpm experiment-foundation:hardening -- --mode deterministic` as the official T-106 post-V1 hardening entrypoint, and `--mode real-local-db --require-real-db` for the disposable Postgres parity lane. Do not treat `--mode external-gate --include-true-external-canary` as a real cloud pass; the mode remains a historical prerequisite-presence gate. Do not add provider calls to the T-106 gate. The sole implementation plan and final evidence source are T-132 `artifacts/implementation/11-m7-real-provider-readiness-review.md` and its future M7 gate output.
