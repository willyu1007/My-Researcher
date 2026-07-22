# T-132 Pack C QR-1 implementation report

Date: 2026-07-22  
Scope: quality-remediation increment QR-1 for review finding R1

## Outcome

The Pack C integration events are now strict members of the shared experiment-v2 event vocabulary, both domain outbox adapters decode them with the existing canonical payload/envelope integrity checks, and the relay has an explicit durable destination for each event. The application composes the scientific-validation service, Evidence Trust Gateway, projection-feed inbox consumer, and readiness evaluator. Closure callers can read the server-derived `expected_closure_input_hash` through the new readiness GET.

No Prisma schema or migration was changed. QR-1 did not edit the then-concurrent Aliyun environment files; the later integration pass registered the scientific-validation capability in the env SSOT once the two streams were merged.

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
- `ExperimentFoundationV2ScientificValidationService` is constructed with the selected scientific repository. Its capability follows the existing strict experiment-v2 boolean idiom, is registered default-off as `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` in the env SSOT, and also requires the committed cutover/durable production composition.
- `PaperImplementationEvidenceTrustGatewayService` is constructed with the PI evidence repository and the EF scientific-validation read port.
- `PaperImplementationProjectionFeedV2Consumer` is constructed over the PI spine inbox port.
- `PaperImplementationCycleReadinessV2Service` and its repository are shared by the closure composition and the read controller.
- The existing relay and scheduler receive all three new consumer ports. The services and relay are decorated on the app for composed-boundary verification.
- `GET /paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/readiness` validates the cycle id, performs a pure read with no write-capability gate, returns the strict shared `ValidationCycleReadinessEvaluationV2` schema on success, maps a missing Cycle to 404, and maps a non-evaluable Cycle to the existing typed 422 envelope.

The QR-1 implementation initially left environment-contract registration to the concurrent Aliyun stream. The integration pass subsequently added the non-secret default-false key to `env/contract.yaml`, regenerated `env/.env.example`, `docs/env.md`, and `docs/context/env/contract.json`, and passed the environment suite.

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
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/pack-c-preplanning-20260718/11-qr1-wiring-report.md` (new)

## Verification

| Check | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 on the final source |
| `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` | passed; D-19/Pack A/Pack B runner composition remains valid |
| every new/modified QR-1 backend test file via `node --test --loader ts-node/esm` | 97 total; 90 passed; 0 failed; 7 conditional PostgreSQL skips |
| modified shared integration-event schema test via `node --test --loader ts-node/esm` | 18/18 passed; 0 failed/skipped |
| focused relay/readiness/closure/gateway/stored-codec regression group | 41/41 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | 386/386 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/backend test` | final merged population: 2,352 total; 2,295 passed; 0 failed; 57 skipped; 0 todo; duration `473471.691916ms`; command exit 0 |
| `git diff --check` | passed after source and report updates |

The targeted tests cover all six event-union members, payload/envelope tampering and producer-domain rejection; EF and PI mapper decoding; gateway routing; projection-feed receipt creation; idempotent exact redelivery; absence of unknown-event terminalization; a strict successful readiness response; and an all-flags-off `buildApp` composition that returns a typed zero-branch readiness error and delivers a seeded Pack C outbox row.

All QR-1 tests passed inside the final full backend population. An earlier sandbox run recorded 14 environment failures, but the controlled host rerun completed with zero failures. The 57 final skips are explicit conditional relational/live-provider lanes and remain excluded from passing acceptance evidence.

## Residual risks and deferred work

- `RunEvidenceUnitRegistered` and `ValidationCycleClosed@v1` are durably accepted but intentionally have no projection/domain side effect in QR-1. The future Phase 5/scientific consumers must either build from this durable feed boundary or introduce an explicitly reviewed successor without reinterpreting these receipts as completed projections.
- The current PI integration inbox schema requires non-null Run mirror columns. QR-1 uses exact closure identity/hash mirrors for the runless `ValidationCycleClosed@v1` receipt; this is checked and replay-safe, but remains a semantic storage debt. Before a real post-closure projection cutover, use a reviewed nullable/dedicated receipt migration instead of extending this compatibility mapping.
- QR-1 does not change closure authority, ordering, proposal selection, or replay semantics. Those review findings remain assigned to QR-2/QR-3.
- Product `buildApp` always supplies the three Pack C consumers. The specialized D-19/Pack A/Pack B runners may omit them because those runners cannot produce Pack C events; an unexpected Pack C claim is released for retry with `INTEGRATION_RELAY_CONSUMER_NOT_CONFIGURED`, never delivered, terminalized, or swallowed by a no-op.
- Conditional real-PostgreSQL tests require the repository's opt-in database environment. Skips or unrelated full-suite environmental failures are reported as such and are not treated as passing evidence.
- QR-1 was committed locally as `8772cf6c`; no push was performed. The subsequent public-resource/env integration changes remain uncommitted in this checkpoint.
