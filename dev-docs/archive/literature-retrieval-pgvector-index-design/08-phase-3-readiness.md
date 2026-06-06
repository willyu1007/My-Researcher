# 08 Phase 3 Readiness

## Conclusion
- Phase 2 quality findings are resolved enough to serve as a Phase 3 foundation:
  - approved target binding is enforced by target ref plus redacted `DATABASE_URL` fingerprint.
  - JSONB baseline and shadow artifacts now carry query-set checksum and per-query fingerprints.
  - final verify now includes live DB gates and rejects dry-run-only evidence.
- Phase 3 readiness findings F1-F5 are now addressed by implementation:
  - broad workset/backfill/verify runner and CLI.
  - repository-level full-corpus native-vector coverage query.
  - new embedding native-vector materialization and activation blocker.
  - target approval, batch checkpoint, retry, quarantine, and verification artifact contracts.
- Phase 3 broad local data migration execution has now completed on the approved local target; staging/prod and public read-path cutover remain separate approval-gated operations.
- Phase 3 remains data migration only; user-visible retrieval must stay JSONB and must not promote to `shadow_pgvector`, `pgvector_canary`, or `pgvector_default` during this phase.

## Reviewed Evidence
- Phase 2 final verify: `artifacts/db/20260605-phase2-readiness/phase2-verification-phase2-target-local-20260605-verify.json`.
- Phase 2 execution log: `artifacts/db/20260605-phase2-readiness/phase2-execution-log.md`.
- Low-level pgvector write/query primitive:
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-embedding-store.ts`.
- Current indexing activation path:
  - `apps/backend/src/services/literature-flow/literature-flow-artifact-runtime.ts`.
- Rollout mode guard:
  - `apps/backend/src/services/literature-retrieval-vector-settings-service.ts`.

## Findings

### F1 - Phase 3 Broad Backfill Runner Is Missing
- Severity: blocker for Phase 3 execution.
- Resolution:
  - Implemented `LiteratureRetrievalPgvectorPhase3RunnerService`.
  - Added CLI `pnpm literature:pgvector:phase3`.
  - Added plan, dry-run backfill, execute backfill, and verify modes.
  - Broad mutation requires a `phase3_workset` manifest before writes.
  - Backfill artifacts record batch size, attempted/projected writes, written rows, skipped/quarantined rows, throughput, retry count, and recovery checkpoints.
- Remaining boundary:
  - Rollback drill remains a later cutover/ops exercise; this fix supplies resumable batch checkpoints and keeps public mode `jsonb_only`.

### F2 - Dual-Write And Activation Blockers Are Missing
- Severity: blocker for Phase 3 execution.
- Resolution:
  - `LiteratureFlowArtifactRuntime.persistEmbeddingVersionSnapshot` now materializes normalized native `retrievalVector` rows immediately after embedding chunk persistence.
  - Existing matching embedding versions are also rematerialized idempotently when their current artifacts are reused.
  - `activateLatestReadyEmbeddingVersion` now blocks activation unless native-vector coverage equals the version chunk count and no open blocking quarantine issue exists for the version.
  - Added regression tests for successful materialization and fail-closed activation behavior.
- Remaining boundary:
  - Native write uses the current target column contract; public retrieval still uses JSONB until later rollout phases.

### F3 - Full-Corpus Coverage Verification Is Not Implemented
- Severity: blocker for Phase 3 execution.
- Resolution:
  - Added repository contract `summarizeEmbeddingRetrievalVectorCoverage`.
  - Prisma implementation uses aggregate SQL over `retrievalVector IS NOT NULL` and does not read vector payloads.
  - In-memory implementation supports deterministic runner and flow tests.
  - Phase 3 verify gates on full selected-corpus coverage, open blocking quarantine count, and public mode hold.
- Completion evidence:
  - Full verification passed against the approved local target after the broad execute run.

### F4 - Large-Scope Target Approval And Recovery Runbook Are Missing
- Severity: major.
- Resolution:
  - Phase 3 CLI and service require `--target-db-approved --target-db-ref` for execute and verify.
  - The runner rejects target ref mismatches between supplied target and workset.
  - The CLI verifies the redacted `DATABASE_URL` fingerprint matches the approved target ref before execute/verify.
  - Added target approval and recovery runbook under `artifacts/db/20260605-phase3-readiness/`.
- Remaining boundary:
  - Staging and production remain explicitly out of scope unless separately approved with their own target refs and artifacts.

### F5 - Throughput, Retry, And Recovery Evidence Shape Is Missing
- Severity: major.
- Resolution:
  - Phase 3 backfill artifacts include throughput, retry count, batch evidence, and recovery checkpoints.
  - Invalid vectors produce blocking quarantine rows with redacted vector payloads.
  - Verification artifacts include hard gates for full coverage, unresolved quarantine, target lineage, execute completion, migration lineage, and public mode hold.
- Completion evidence:
  - Approved broad execute recorded throughput, batch, retry, recovery checkpoint, coverage, and quarantine evidence.

## Entry Checklist For Phase 3 Implementation
- [x] Phase 2 final verification passes with target lineage and live DB gates.
- [x] Public retrieval mode remains `jsonb_only`.
- [x] Low-level native vector write/query primitive exists.
- [x] Phase 3 broad workset contract exists.
- [x] Phase 3 backfill runner exists and is tested.
- [x] Dual-write or equivalent native materialization exists for new embedding versions.
- [x] Activation blocker prevents incomplete native coverage from becoming active.
- [x] Full-corpus coverage/quarantine verification exists.
- [x] Large-scope target approval gate exists.
- [x] Retry/recovery/throughput evidence artifacts exist.

## Readiness Decision
- Completed next work: Phase 3 broad local execute and verify completed on the approved local target.
- Approved next work: Phase 4 implementation readiness review for public read-path cutover.
- Blocked next work: promoting public pgvector reads or mutating staging/prod without separate approval and Phase 4 gates.
- Explicitly not approved: public pgvector reads, canary/default rollout, staging/prod mutation, or cleanup.
