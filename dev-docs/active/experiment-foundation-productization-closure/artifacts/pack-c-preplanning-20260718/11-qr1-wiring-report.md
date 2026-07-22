# T-132 Pack C QR-1 implementation report

Date: 2026-07-22  
Scope: quality-remediation increment QR-1 for review finding R1

## Outcome

The Pack C integration events are now strict members of the shared experiment-v2 event vocabulary, both domain outbox adapters decode them with the existing canonical payload/envelope integrity checks, and the relay has an explicit durable destination for each event. The application composes the scientific-validation service, Evidence Trust Gateway, projection-feed inbox consumer, and readiness evaluator. Closure callers can read the server-derived `expected_closure_input_hash` through the new readiness GET.

No Prisma schema or migration was changed. The protected Aliyun-stream environment files were not edited by QR-1.

## Event wiring map

| Event | Producer and outbox | Typed row mapper | Relay route | Consumer and durable outcome |
|---|---|---|---|---|
| `EvidenceCandidateQualified` | `ExperimentFoundationV2ScientificValidationService` commits the EF validation report, EvidenceCandidate, and EF outbox row atomically | EF Prisma and in-memory spine adapters reconstruct `EvidenceCandidateQualifiedEventV1` and verify the stored payload hash and envelope hash | `ExperimentV2IntegrationRelayService` dispatches the typed event to `evidenceTrustGatewayConsumer` | `PaperImplementationEvidenceTrustGatewayService.consume()` records its idempotent PI inbox outcome and, when qualified, atomically creates the REU, trace, and `RunEvidenceUnitRegistered` PI outbox row |
| `RunEvidenceUnitRegistered` | The Evidence Trust Gateway commits the PI outbox row with the REU/trace transaction | PI Prisma and in-memory spine adapters reconstruct `RunEvidenceUnitRegisteredEventV1` and verify the stored payload hash and envelope hash | relay dispatches to `runEvidenceProjectionConsumer` | `PaperImplementationProjectionFeedV2Consumer` records one processed `pi-projection-feed-v2` inbox receipt and performs zero projection/domain writes |
| `ValidationCycleClosed@v1` | `PaperImplementationValidationCycleClosureV2Service` commits the closure and PI outbox row atomically | PI Prisma and in-memory spine adapters reconstruct `ValidationCycleClosedEventV1` and verify the stored payload hash and envelope hash | relay dispatches to `validationCycleClosedProjectionConsumer` | the same projection-feed consumer records one processed `pi-projection-feed-v2` inbox receipt and performs zero projection/domain writes |

Exact re-delivery converges on the existing `(consumer_name, source_event_id)` inbox identity and existing stored hash checks. The projection-feed receipt is an intentional durable pending-consumer boundary for later Phase 5/scientific projection consumers; it does not claim that a downstream projection was materialized.

The existing PI inbox table requires non-null Run mirror columns. For the runless closure event only, the adapter uses `closure_id` and `closure_snapshot_hash` as exact structural mirrors in the inbox and accepts no other substitute; the PI outbox remains null/null for those columns. This preserves the event envelope and requires no schema change.

## Composition inventory

- `buildApp` selects Prisma or in-memory scientific-validation, evidence, and readiness repositories using the existing repository-strategy selection.
- `ExperimentFoundationV2ScientificValidationService` is constructed with the selected scientific repository. Its capability follows the existing strict experiment-v2 boolean idiom and reads `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` directly from `process.env`; it is default-off and also requires the committed cutover/durable production composition.
- `PaperImplementationEvidenceTrustGatewayService` is constructed with the PI evidence repository and the EF scientific-validation read port.
- `PaperImplementationProjectionFeedV2Consumer` is constructed over the PI spine inbox port.
- `PaperImplementationCycleReadinessV2Service` and its repository are shared by the closure composition and the read controller.
- The existing relay and scheduler receive all three new consumer ports. The services and relay are decorated on the app for composed-boundary verification.
- `GET /paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/readiness` validates the cycle id, performs a pure read with no write-capability gate, returns the strict shared `ValidationCycleReadinessEvaluationV2` schema on success, maps a missing Cycle to 404, and maps a non-evaluable Cycle to the existing typed 422 envelope.

The environment-contract registration for `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` is deliberately deferred until the unrelated Aliyun stream releases the environment files. QR-1 therefore makes no change to `env/contract.yaml`, `docs/context/env/*`, `docs/env.md`, or `env/.env.example`.

## Files changed by QR-1

### Shared contracts and tests

- `packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts`
- `packages/shared/src/research-lifecycle/experiment-v2-contracts.schema.test.ts`

### Backend composition, routes, repositories, and services

- `apps/backend/src/app.ts`
- `apps/backend/src/controllers/paper-implementation-experiment-v2-controller.ts`
- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts`
- `apps/backend/src/repositories/experiment-spine-v2.repository.ts`
- `apps/backend/src/repositories/experiment-v2-stored-integration-event.ts`
- `apps/backend/src/repositories/in-memory-experiment-spine-v2-repository.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts`
- `apps/backend/src/repositories/experiment-foundation-scientific-validation-v2.repository.ts`
- `apps/backend/src/repositories/paper-implementation-evidence-v2.repository.ts`
- `apps/backend/src/repositories/paper-implementation-validation-cycle-closure-v2.repository.ts`
- `apps/backend/src/services/experiment-foundation-v2-scientific-validation-service.ts`
- `apps/backend/src/services/experiment-v2-integration-relay-service.ts`
- `apps/backend/src/services/paper-implementation-projection-feed-v2-consumer.ts` (new)
- `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts`

The three repository contract files above now alias their event envelopes to the shared union rather than maintaining local duplicate envelope types.

### Backend tests

- `apps/backend/src/services/experiment-v2-integration-relay-service.unit.test.ts` (new)
- `apps/backend/src/routes/paper-implementation-pack-c-composition.integration.test.ts` (new)
- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.integration.test.ts`
- `apps/backend/src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts`
- `apps/backend/src/services/experiment-v2-integration-spine.unit.test.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-v2-repositories.unit.test.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-relational.integration.test.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts`

### Task documentation

- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/report.md` (new)

## Verification

| Check | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 on the final source |
| every new/modified QR-1 backend test file via `node --test --loader ts-node/esm` | 97 total; 90 passed; 0 failed; 7 conditional PostgreSQL skips |
| modified shared integration-event schema test via `node --test --loader ts-node/esm` | 18/18 passed; 0 failed/skipped |
| focused relay/readiness/closure/gateway/stored-codec regression group | 41/41 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | 386/386 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/backend test` | 2,350 total; 2,279 passed; 14 failed; 57 skipped; 0 todo; duration `507928.63425ms`; command exit 1 |
| `git diff --check` | passed after source and report updates |

The targeted tests cover all six event-union members, payload/envelope tampering and producer-domain rejection; EF and PI mapper decoding; gateway routing; projection-feed receipt creation; idempotent exact redelivery; absence of unknown-event terminalization; a strict successful readiness response; and an all-flags-off `buildApp` composition that returns a typed zero-branch readiness error and delivers a seeded Pack C outbox row.

All QR-1 tests passed inside the full backend population. The 14 full-suite failures match the established sandbox-dependent baseline already recorded for the task and are not treated as passing evidence:

- Eight local-PostgreSQL failures cannot connect to `127.0.0.1:5432`: topic-selection rollback N4/N5/N6/N7/N8/N10 and the T-054/T-067 Prisma HTTP smokes.
- Six Literature environment/network failures cover key-content curation export/import, workflow import/topic/paper-link/citation update, rerun artifact overwrite, the global-environment USER_AUTH gate, explicit fulltext processing/metadata-stale registration, and remote download/registration (`getaddrinfo ENOTFOUND arxiv.org`).

## Residual risks and deferred work

- `RunEvidenceUnitRegistered` and `ValidationCycleClosed@v1` are durably accepted but intentionally have no projection/domain side effect in QR-1. The future Phase 5/scientific consumers must either build from this durable feed boundary or introduce an explicitly reviewed successor without reinterpreting these receipts as completed projections.
- Registration of `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` in the environment SSOT remains deferred to the Aliyun-stream-free window. Until then, deployment tooling generated from that SSOT will not advertise the key even though runtime parsing is strict and default-off.
- QR-1 does not change closure authority, ordering, proposal selection, or replay semantics. Those review findings remain assigned to QR-2/QR-3.
- Conditional real-PostgreSQL tests require the repository's opt-in database environment. Skips or unrelated full-suite environmental failures are reported as such and are not treated as passing evidence.
- No commit or push was performed.
