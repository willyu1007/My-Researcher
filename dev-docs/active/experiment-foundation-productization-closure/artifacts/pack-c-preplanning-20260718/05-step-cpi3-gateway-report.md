# T-132 Pack C C-PI Step 3 — PI Evidence Trust Gateway implementation report

Date: 2026-07-20

## Outcome

Implemented the PI Evidence Trust Gateway as the only new production lane that can create `PaperImplementationRunEvidenceUnitV2` and `PaperImplementationEvidenceTraceManifestV2`. The sole write trigger is one consumed EF `EvidenceCandidateQualified@v1` envelope. `IngestQualifiedEvidenceCandidateV2Request` is exposed only through the read-only `getIngestedEvidence` lookup and cannot author evidence fields, statuses or hashes.

The gateway verifies the producer payload hash, exact PI branch/admitted-revision scope, EF Candidate/report canonical hashes, exact Run/manifest/report/protocol bindings and `report.status === 'passed'`. The gateway derives deterministic PI ids, both PI canonical hashes, the ordered five-ref trace and one `RunEvidenceUnitRegistered` outbox event server-side.

The EF read port required no change: the existing `loadValidationByRunId` returns the canonical-hash-checked report and its passed-only Candidate through the EF-owned repository boundary. No EF table or EF production source was modified.

## Files changed

- `apps/backend/src/repositories/paper-implementation-evidence-v2.repository.ts`
  - PI evidence port, local event/receipt/outbox contracts, exact commit-bundle validator and repository constraint errors.
- `apps/backend/src/repositories/in-memory-paper-implementation-evidence-v2-repository.ts`
  - copy-on-commit atomic test implementation, fault injection, receipt/idempotency indexes and duplicate-Candidate convergence.
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.ts`
  - admitted branch/revision reads, defensive stored-row reconstruction, rejected-receipt transaction and atomic inbox + REU + trace + outbox transaction.
- `apps/backend/src/services/paper-implementation-evidence-trust-gateway-service.ts`
  - event-only ingestion, replay/conflict handling, EF read-side resolution, deterministic PI record materialization and identity-only readback.
- `apps/backend/src/services/paper-implementation-evidence-trust-gateway-service.unit.test.ts`
  - 19 deterministic in-memory assertions across nine top-level tests.
- T-132 task notes/verification and `report.md`.

No Prisma schema/migration, shared package, environment contract, `app.ts`, EF service/repository, T-124 legacy REU/monitor/dossier source or listed unrelated dirty file was modified.

## Resolution and rejection matrix

| Input/resolution state | Durable PI inbox result | REU / trace / outbox writes | Caller outcome |
|---|---|---:|---|
| First exact qualified event; admitted PI scope; canonical EF Candidate/report; passed report | `processed`, reason `null` | 1 / 1 / 1 atomically | server-derived evidence returned |
| Exact event replay | stored outcome returned | 0 new writes | `replayed=true`; EF is not re-read |
| Same Candidate in a second exact event with a different event/business key | second `processed` receipt | 0 new domain/outbox writes | existing Candidate-unique evidence returned |
| Same event id or scoped business key with changed envelope | no new receipt | 0 / 0 / 0 | terminal `INTEGRATION_EVENT_PAYLOAD_CONFLICT` |
| First-seen payload/hash tamper | no receipt because the source envelope is not authentic | 0 / 0 / 0 | terminal `INTEGRATION_EVENT_PAYLOAD_CONFLICT` |
| Missing/drifted PI branch, revision id, sequence, revision hash, branch key, cell-plan hash or approved-plan hash | `terminal_conflict`, `BRANCH_HEAD_SCOPE_CONFLICT` | 0 / 0 / 0 | stored rejection |
| Candidate absent or Candidate id/content/run/manifest/report/validation binding mismatch | `terminal_conflict`, `EVIDENCE_CANDIDATE_NOT_ELIGIBLE` | 0 / 0 / 0 | stored rejection |
| Report absent, non-canonical, wrong id/hash/Run/manifest, or status other than exactly `passed` | `terminal_conflict`, `EVIDENCE_CANDIDATE_NOT_ELIGIBLE` | 0 / 0 / 0 | stored rejection |
| EvaluationProtocol revision/hash differs from the qualified provenance envelope, or the EF read port reports provenance rejection | `terminal_conflict`, `EVIDENCE_PROVENANCE_REJECTED` | 0 / 0 / 0 | stored rejection |
| Injected commit failure | transaction rollback; no receipt | 0 / 0 / 0 | original infrastructure error propagates |

The exact trace order is: (1) evidence Candidate, (2) scientific validation report, (3) Run, (4) WorkOrder revision and (5) EvaluationProtocol revision. Every ref id/hash is rechecked by the repository before commit.

## `RunEvidenceUnitRegistered` registry addendum

C-PI step 3 adds a PI-domain projection-feed event that is not in the previously frozen three-event Pack A registry:

- event type: `RunEvidenceUnitRegistered`
- schema version: `v1`
- producer: `PaperImplementation`
- aggregate: `PaperImplementationRunEvidenceUnitV2` / exact REU id
- payload: `{ run_evidence_unit_id, content_hash, validation_cycle_id, run_id, run_manifest_hash, evidence_candidate_id }`
- hashes: shared `integration-event-payload-json@v1` and `integration-event-envelope-json@v1`

The event is deliberately defined within the PI evidence port because shared contracts and application composition were frozen by the request. The registry extension therefore requires Claude's review addendum before relay/composition work treats `RunEvidenceUnitRegistered` as part of the global event union.

## Verification

| Command | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| `cd apps/backend && node --test --loader ts-node/esm src/services/paper-implementation-evidence-trust-gateway-service.unit.test.ts` | passed 19/19; 0 failed, 0 skipped, 0 todo |
| `cd packages/shared && npx tsc -p tsconfig.json --noEmit` | not run; no shared file changed |
| `git diff --check` | passed before documentation finalization |
| optional whole-bundle strict docs lint | 0 errors; 10 pre-existing vague-reference warnings; no warning in the new report |

Coverage includes exact hash bindings, replay without EF re-resolution, first-seen payload tamper, consumed-event envelope conflict, four PI scope drifts, six Candidate/report/hash/status mismatches, provenance rejection, injected atomic rollback, identity-only readback and duplicate-Candidate convergence.

## Risks and follow-ups

- Per scope, C-PI step 3 does not modify `app.ts` or relay composition. The service/repositories are ready for the later reviewed wiring increment, but no runtime consumer is activated here.
- The new projection event is intentionally outside the frozen shared Pack A event union until the review addendum. Existing Pack A relay reconstruction must not be assumed to support `RunEvidenceUnitRegistered` yet.
- The Prisma implementation is strict-TypeScript verified; the requested verification did not include a disposable PostgreSQL relational test for the new four-write transaction. The in-memory fault test proves the intended transaction contract, while a later DB gate should exercise FK/unique races and injected outbox rollback against PostgreSQL.
- `getIngestedEvidence` is read-only and recognizes the original ingest key or any processed duplicate-Candidate receipt key. The method returns `null` for identity/hash/key mismatch and never repairs or creates evidence.
