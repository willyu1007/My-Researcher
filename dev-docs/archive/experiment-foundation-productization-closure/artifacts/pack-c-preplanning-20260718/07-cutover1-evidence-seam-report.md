# T-132 Pack C C-cutover increment 1 report

Date: 2026-07-21  
Scope: D-16 evidence-seam cutover only  
Status: implemented; in-scope compilation and modified-file tests passed

## Outcome

The v2 PaperImplementation Evidence Trust Gateway is now the only production `RunEvidenceUnit` writer. Legacy monitor/manual attachment and live-adapter paths persist monitor or lifecycle facts only, and explicit legacy REU/trace minting parameters fail with `LEGACY_SCIENTIFIC_WRITER_CLOSED` before provider or repository side effects.

Dossier readiness no longer scans project REUs or infers supersession. A ready dossier requires explicit closed-Cycle snapshot refs and verifies the exact v2 closure id, snapshot hash and project owner with no fallback. Both pre-closure `ResultInterpretationPacket` triggers are closed with `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`; packet materialization returns in a later increment consuming `ValidationCycleClosed`.

## Files changed

### Product and composition

- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts`
- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts`
- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts`
- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts`
- `apps/backend/src/services/paper-implementation-domain-gate-assembly.ts`
- `apps/backend/src/app.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-live-experiment-adapter-contracts.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts`

### Tests

- `apps/backend/src/routes/paper-implementation-routes.integration.test.ts`
- `apps/backend/src/routes/paper-implementation-runtime-routes.integration.test.ts`
- `apps/backend/src/services/paper-implementation-contract-evaluation-suite.unit.test.ts`
- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-runtime-domain-gate-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.schema.test.ts`

### Handoff documentation

- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- this report

No Prisma schema/migration, env contract, capability value, legacy `/complete` route/service, closure-lookup optional-injection default, or v2 gateway/closure/readiness-evaluator service changed.

## Per-census-path disposition

| Census path | Disposition | Cutover evidence |
|---|---|---|
| 1. Standalone/manual attachment, monitor and recovery intake | rewritten/closed | `recordRunMonitorIntake` always records `RunMonitorIntake` with `run_evidence_unit: null`; its response carries a gateway handoff. Caller REU/trace ids reject with `LEGACY_SCIENTIFIC_WRITER_CLOSED`. |
| 2. Live collect | closed | The EF legacy collect writer remains permanently closed by the landed 5a guard. The PI adapter has no REU lookup/finalization fallback and cannot construct REU/trace authority. Explicit legacy ids reject before provider work. |
| 3. Live cancel | rewritten | Cancellation remains an external lifecycle action and monitor fact. Terminal cancellation records zero REUs and zero traces; caller-selected REU/trace ids reject before provider cancellation. |
| 4. Live finalization common path | deleted as an evidence writer | The common terminal path now maps external status into monitor/lifecycle facts only. Succeeded status directs callers to await the v2 gateway; failed/cancelled statuses never mint evidence. |
| 5. Live trace side writer | deleted | Existing-trace scan, caller-target trust and `createTraceManifest` choreography were removed from the adapter. Trace authority remains inside the v2 gateway transaction. |
| 6. Sync/recovery observation | preserved as monitor-only | Sync records external status and lifecycle recommendations only. Terminal observation does not finalize evidence or select a compatibility path. |
| 7. T-124 code/tests | replaced | Failed/negative/cancelled trusted-REU assertions were replaced with monitor-only, stable-closure and zero-writer assertions; unrelated cases remain in their files. |

## Dossier and packet disposition

- Removed `PROJECT_ACCOUNTABLE_RUN_STATUSES`, project-wide failed-like reconciliation, `assertProjectRunEvidenceAccounting`, newer-REU inference, WorkOrder-supersession inference and the unbounded dossier REU scan.
- Claim support validation now resolves only the explicitly named REU refs by keyed lookup; it does not scan the project.
- `closed_validation_cycle_snapshot_refs` is required on new dossier commands. For ready dossiers, each unique ref must resolve to a v2 stored closure with the same Cycle, closure id, exact snapshot hash and project owner. Empty, open, tampered and wrong-project inputs fail closed.
- Historical persisted dossier rows remain readable; there is no legacy accounting fallback for a new readiness decision.
- The direct packet service entry and the admitted runtime Domain Gate entry both return stable typed closure. Repository packet writes remain only as persistence/history infrastructure and test seeding for existing historical rows; no production trigger reaches them.

## Replaced-test inventory

| File | Superseded semantic replaced by |
|---|---|
| `paper-implementation-workorder-experiment-bridge-service.unit.test.ts` | failed/negative/succeeded terminal monitor cases assert monitor-only persistence and zero REU; explicit legacy ids assert permanent closure; unbound monitor remains untrusted and evidence-free |
| `paper-implementation-live-experiment-adapter-service.unit.test.ts` | terminal cancel asserts lifecycle-only zero REU/trace; collect/cancel legacy ids reject before provider effects; EF collect closure propagation remains covered |
| `paper-implementation-result-claim-dossier-service.unit.test.ts` | direct packet creation asserts stable closure; historical downstream objects are seeded through repository history; ready dossier asserts explicit closed snapshot success plus open, tampered and wrong-project rejection; project legacy failed-like rows are ignored |
| `paper-implementation-runtime-domain-gate-service.unit.test.ts` | result-analysis final artifact asserts stable packet-materialization closure and zero packet calls |
| `paper-implementation-runtime-routes.integration.test.ts` | both result-analysis materialization requests assert `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`, zero stored packets and retained malformed-output failure coverage |
| `paper-implementation-routes.integration.test.ts` | monitor route asserts gateway handoff/zero REU; direct packet POST asserts closure; downstream historical packet fixture plus explicit v2 closure snapshot preserve unrelated claim/dossier route coverage |
| `paper-implementation-contract-evaluation-suite.unit.test.ts` | golden path uses monitor-only intake, historical packet fixture and explicit closure snapshot; coverage anchors now require packet-closure and open-Cycle fail-closed tests |
| shared dossier schema test | dossier request fixture now requires explicit closed-Cycle snapshot refs |

## Verification

| Command | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| six initially modified backend test files via `node --test --loader ts-node/esm` | 65/65 passed; 0 failed/skipped |
| modified runtime-routes integration file via `node --test --loader ts-node/esm` | 54 total: 38 passed, 0 failed, 16 intentional skips |
| modified shared schema file via `node --test --loader ts-node/esm` | 5/5 passed |
| `pnpm --filter @paper-engineering-assistant/shared test` | 383/383 passed; 0 failed/skipped/todo |
| `pnpm --filter @paper-engineering-assistant/backend test` | 2,339 total: 2,268 passed, 14 failed, 57 skipped, 0 todo; `470125.795834ms` |
| `git diff --check` | passed |

The full backend status is non-green only on 14 unrelated sandbox-environmental cases. Eight require an unavailable PostgreSQL server at `127.0.0.1:5432`: Prisma rollback N4/N5/N6/N7/N8/N10 and the T-054/T-067 HTTP smokes. Six literature cases reproduce in focused runs outside the cutover population: five remain `PARTIAL` without the required content-processing environment, and one cannot resolve `arxiv.org`. No modified-file test failed.

## Risks and deferred work

- Packet creation is intentionally unavailable until the later closed-Cycle materializer consumes `ValidationCycleClosed`. This is a deliberate fail-closed interval, not a compatibility gap to fill with the old triggers.
- The monitor and live-adapter response shapes are breaking by design: consumers receive monitor/lifecycle facts and the gateway handoff, never a legacy REU or trace.
- Existing dossier and packet rows remain historical records. New ready-dossier commands cannot derive closure refs from them and cannot fall back to project scans.
- A pre-closure runtime dossier request has no authority to infer snapshot refs; ready materialization therefore fails closed until explicit closed-Cycle refs are supplied.
- Increment 2 still owns the legacy `/complete` conversion and the closure-lookup optional-injection default. Neither was modified here.
