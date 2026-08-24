-- T-130 W-09 (D9, L-13): drop the dead literature discovery tables.
-- Dry-run evidence was recorded by T-130 on 2026-07-08.
--   * zero code consumers repo-wide (services/repositories/scripts) — only Prisma schema relations remained;
--   * row data was historical import traces only: 119 batches / 2312 candidates, latest write 2026-06-17,
--     predating T-130; no writer exists in the codebase.
-- Candidate first (FK to batch + self/literature relations), then batch.
DROP TABLE IF EXISTS "LiteratureDiscoveryCandidate";
DROP TABLE IF EXISTS "LiteratureDiscoveryBatch";
