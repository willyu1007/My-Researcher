# T-106 Experiment Foundation Real-interaction Hardening

## Status
- State: done
- Task: T-106
- Parent task: `T-043 experiment-foundation-v1`
- Current focus: closure reconciliation is complete. T-132 remained the sole provider implementation owner and its 2026-08-02 immutable sequence-9 live window created exactly two PAI Jobs, observed both terminal `Succeeded`, collected two distinct exact `diagnostic_only` outputs, proved zero duplicate Jobs/rows on replay and completed credential cleanup. T-106 consumes that final verdict and does not add a second provider transport, schema or live runner.
- Next step: none inside T-106. The residual v2 semantic API/runtime and named-local activation work is split to T-135; archive this completed hardening bundle.

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
- [x] Provider-specific true external canary verified real connectivity and the minimum real external flow through the T-132-owned 2026-08-02 sequence-9 two-cell window. T-106 verified the T-132 verdict and redaction/cleanup contract without creating a second provider implementation.
- [x] Real-data policy uses synthetic deterministic fixtures by default, with controlled local real fixtures and true external samples only through explicit opt-in and redacted artifacts.
- [x] T-103 has either a stable hardening lane hook or a documented handoff command for running the suite.
- [x] Runner artifacts are redacted, stored under `.ai/.tmp/experiment-foundation-hardening/<run-id>/`, and governance lint passes for the current task state.

## Handoff
Use `pnpm experiment-foundation:hardening -- --mode deterministic` as the official T-106 post-V1 hardening entrypoint, and `--mode real-local-db --require-real-db` for the disposable Postgres parity lane. Do not treat `--mode external-gate --include-true-external-canary` as a real cloud pass; the mode remains a historical prerequisite-presence gate. Do not add provider calls to the T-106 gate. T-132 `artifacts/implementation/11-m7-real-provider-readiness-review.md` and `.ai/.tmp/experiment-foundation-productization/t132-m7-offline-20260724-v3/summary.json` (durable copy `12-m7-qr-gate-summary-v3.json`) are the sole M7 implementation plan/evidence sources. The imported gate uses injected official-SDK fakes plus disposable PostgreSQL and records zero live jobs, provider/OSS calls, cloud cost, named-database apply and scientific/evidence writes; it is not a live canary verdict.
