# Phase 2 Verification Checklist

## Readiness Verification
- `git diff --check -- dev-docs/active/literature-retrieval-pgvector-index-design apps/backend/src/repositories`
- `node --test --loader ts-node/esm src/services/literature-retrieval-pgvector-phase2-runner-service.unit.test.ts src/repositories/prisma/literature/prisma-literature-embedding-store.unit.test.ts src/services/literature-retrieval-vector-settings-service.unit.test.ts`
- `node --check .ai/scripts/literature-pgvector-phase2-runner.mjs`
- `pnpm literature:pgvector:phase2 -- --help`
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
- `pnpm --filter @paper-engineering-assistant/backend prisma:validate`
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Target DB Apply Verification
Only after explicit approval:
- apply migration to the named local/dev DB.
- record target DB apply log.
- check pgvector extension.
- check `retrievalVector vector(3072)` exists.
- check migration-only run/quarantine tables exist.
- check JSONB `vector` still exists.
- check rollout mode remains `jsonb_only`.

## Phase 2 Execution Verification
- sample workset manifest exists before mutation.
- shadow query set exists before mutation.
- JSONB baseline exists before native vector writes.
- backfill dry-run passes validation or records quarantine blockers.
- backfill execute writes only valid normalized vectors.
- coverage is `100%` for sample active/evidence-ready versions.
- unresolved quarantine is `0` for sample active/evidence-ready versions.
- shadow parity artifact satisfies threshold gates.
- shadow parity rejects stale/mismatched JSONB baseline artifacts by target DB, query-set checksum, and per-query fingerprint.
- final verify is run with `--sample-workset`, `--target-db-approved`, and `--target-db-ref`; it must compare the approved ref to the redacted `DATABASE_URL` fingerprint before live checks.
- final verify requires completed execute backfill evidence; dry-run coverage must not satisfy the final gate.
- final verify live checks confirm backfill run completion, native vector coverage, unresolved quarantine count, and public rollout mode.
- sample bounded-corpus query records candidate-limit telemetry and does not pretend to prove global unscoped scale.
- public retrieve response remains unchanged.

## Rejection Conditions
- Any persistent DB mutation without explicit target approval.
- Any fake or hand-authored passing shadow result.
- Any target DB label that does not match the sample workset or redacted `DATABASE_URL` fingerprint.
- Any baseline/shadow/query-set artifact combination that does not pass checksum/fingerprint lineage checks.
- Any final verification attempt based only on stale artifacts without live DB checks.
- Any full vector payload written to artifacts or quarantine.
- Any stale-ineligible version ID passed to pgvector candidate query with `include_stale = false`.
- Any public API contract change for Phase 2 shadow telemetry.
