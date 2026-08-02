# T-132 Pack C C-EF step 5b report

Date: 2026-07-20

## Outcome

The permanently closed legacy scientific collector no longer contains its unreachable collection/write implementation. The EF and PI collect request contracts no longer expose `accept_partial`, the PI adapter and desktop form no longer send it, and the step-5a `LEGACY_SCIENTIFIC_WRITER_CLOSED` failure remains the first observable behavior.

No Prisma schema/migration, database, env contract, app composition, v2 scientific-validation lane, submit/sync/cancel path or unrelated dirty file was changed.

## Files changed

- `apps/backend/src/services/experiment-foundation-execution-service.ts`
- `apps/backend/src/services/experiment-foundation-prisma-parity.integration.test.ts`
- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts`
- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts`
- `apps/desktop/src/renderer/modules/experiment-foundation/experiment-flow/JobActionForms.tsx`
- `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`
- `packages/shared/src/research-lifecycle/experiment-foundation-contracts.schema.test.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.schema.test.ts`
- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- this report

## Deleted-symbol inventory

Collection/write methods and analyzer:

- unreachable `collectJob` body below the permanent closure throw
- `createPartialResults`
- `createExperimentResult`
- `createMetricObservations`
- `createEvaluationFacts`
- `createValidationReport`
- `createFineTuningResult`
- `createEvidenceCandidate`
- `analyzeValidation`

Dead dependencies removed with them:

- `loadCollectContext`, `loadMetricDefinition`, `loadProtocolMetricContext`
- `findMetricDefinition`, `mapArtifactToPartialKind`, `buildSyntheticArtifact`
- `CollectContext`, `ProtocolMetricContext`, `ValidationAnalysis`
- the result/evidence/metric/partial-result/adapter-collect imports used only by that dead path

The frozen `collectJob(externalJobId, input)` signature and exact entry throw are unchanged. Two unreachable `void` references remain solely to satisfy strict `noUnusedParameters`; they perform no lookup, adapter call or write.

## Request vocabulary removed

- `CollectExternalTrainingJobRequest.accept_partial`
- `collectExternalTrainingJobRequestSchema.body.properties.accept_partial`
- `CollectLiveExperimentRunRequest.accept_partial`
- `collectLiveExperimentRunRequestSchema.properties.accept_partial`
- PI live adapter forwarding
- desktop collect-form checkbox and request assembly
- obsolete Prisma-parity request fixtures

## Preserved read-side vocabulary

The following immutable legacy shapes remain intentionally available for D-08 diagnostics/admin reads:

- validation status values `partial` and `accepted_partial`
- `ResultValidationReport.partial_acceptance_ref` type and stored-record schema
- stored accepted-partial `EvidenceCandidate` and fine-tuning validation compatibility
- `TrainingTaskPartialResultRef` type/schema and record kind
- `ExperimentResult.partial_result_refs`
- `ExternalTrainingJob.partial_result_refs`
- submit-time `TrainingTaskMaterializationResult.status='partial'` compatibility

No existing row is rewritten or made unreadable.

## OpenAPI/API-index regeneration

Repository census found no `accept_partial` or legacy collect request schema in `docs/context/api/openapi.yaml`, `api-index.json` or `API-INDEX.md`; therefore no regeneration command was required and no generated artifact changed.

Checks run:

- `node .ai/scripts/ctl-api-index.mjs verify` — passed, current checksum
- `node .ai/scripts/ctl-openapi-quality.mjs verify --strict` — passed

## Verification

| Command | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed, exit 0 |
| `cd packages/shared && npx tsc -p tsconfig.json --noEmit` | passed, exit 0 |
| `pnpm --filter @paper-engineering-assistant/shared test` | 374 tests; 374 passed; 0 failed; 0 skipped; 0 todo |
| `pnpm --filter @paper-engineering-assistant/backend test` | 2,292 tests; 2,228 passed; 14 failed; 50 skipped; 0 todo |
| focused EF execution + PI live adapter tests | 21 tests; 21 passed; 0 failed; 0 skipped |
| `pnpm --filter @paper-engineering-assistant/desktop typecheck` | passed, exit 0 |

Backend full-suite triage:

- Six `prisma-topic-selection-v1b-transaction-rollback` cases (N4, N5, N6, N7, N8 and N10) could not reach PostgreSQL at `127.0.0.1:5432`.
- T-054 v1b and T-067 v1c Prisma HTTP smokes failed for the same unreachable endpoint.
- The remaining pre-existing literature integration failures are outside this slice and the changed files; the exact 2,228/14/50 totals match the prior step-5a sandbox baseline. The unrelated dirty literature-settings and env-contract work was not touched.
- All changed-path focused tests pass.

## Unresolved risks

- Claude should re-run the backend suite on the host with the intended PostgreSQL service and unrestricted literature data-root access to distinguish the known environmental/pre-existing failures from a fully green host result.
- Clients that still send `accept_partial` no longer have a typed/schema field; Fastify's configured additional-property handling may strip unknown input rather than return a dedicated compatibility error. The removed flag cannot influence collection because collection fails at entry.
- Live submit-time partial materialization and legacy provenance vocabulary (census §8 items 9 and 15-17) remain unchanged by explicit scope and require separate authorization if they are to be removed later.
