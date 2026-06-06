# Backfill Runner Contract

## Decision
- Phase 2 needs a runner above the repository write primitive.
- The runner owns planning, validation, normalization, write orchestration, quarantine, coverage, resume, and artifacts.
- The repository method `writeEmbeddingRetrievalVectors` remains a low-level normalized-vector write operation.

## Commands Or Modes
The Phase 2 implementation MUST provide equivalent modes:
- `plan`: read the sample manifest and report intended rows without mutation.
- `capture-jsonb-baseline`: run the fixed query set through JSONB retrieval before backfill writes.
- `backfill-sample --dry-run`: validate raw vectors and projected writes without mutation.
- `backfill-sample --execute`: write normalized `retrievalVector` for valid sample rows.
- `run-shadow`: run pgvector candidate shadow and write parity artifacts.
- `verify`: evaluate gates from artifacts and DB state.

## Entrypoint
- Use `pnpm literature:pgvector:phase2 -- --mode <mode>`.
- `backfill-sample --execute` MUST include:
  - `--target-db-approved`.
  - `--target-db-ref <local-dev-ref>`.
- The runner does not apply Prisma migrations; target DB apply remains a separate gate.

## Validation
For every selected chunk vector:
- observed dimension must equal `3072`.
- every value must be finite.
- raw norm must be nonzero.
- normalized output norm must satisfy `abs(norm - 1) <= 1e-5`.
- normalized vector must not be stored in logs or quarantine details.

## Quarantine
- Invalid rows create `LiteratureEmbeddingVectorQuarantineIssue` records.
- Quarantine records include identifiers, issue code, severity, observed dimension, observed norm, compact details, and status.
- Quarantine records do not include full vectors.
- Unresolved quarantine affecting sample active/evidence-ready versions blocks Phase 2 exit.

## Coverage
The runner must report:
- selected literature count.
- selected embedding version count.
- selected chunk count.
- raw vector count.
- valid normalized vector count.
- written native vector count.
- skipped count by reason.
- quarantine count by reason and severity.
- coverage ratio for active/evidence-ready sample versions.

## Idempotency And Resume
- Re-running `backfill-sample --execute` for the same sample manifest and target column must be safe.
- Existing native vectors for the same chunk may be updated if they match the same raw vector checksum or equivalent source identity.
- A resumed run must not create duplicate unresolved quarantine issues for the same chunk and issue code.
- The run artifact must record whether it is a fresh run or resume.

## Rollback Boundary
- Phase 2 rollback is operational, not destructive by default:
  - keep user-visible reads on JSONB.
  - retain native vectors for investigation unless explicit cleanup is approved.
  - record a follow-up repair task if native sample vectors need to be cleared.
- Do not drop the pgvector column or migration tables as part of Phase 2 rollback without a separate DB approval.
