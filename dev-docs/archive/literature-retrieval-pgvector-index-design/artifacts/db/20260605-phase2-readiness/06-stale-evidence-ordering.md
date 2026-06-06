# Stale And Evidence Ordering

## Decision
- Stale and evidence eligibility must be resolved before pgvector candidate SQL.
- The repository candidate query accepts `eligibleEmbeddingVersionIds`, not broad embedding version IDs.
- Per-literature candidate caps apply after ineligible stale versions have been removed from the candidate input set.

## Ordering
1. Resolve literature scope and compatible embedding profile.
2. Resolve active embedding versions and evidence-ready literature records.
3. Resolve stale status and request stale policy.
4. If `include_stale = false`, remove stale or superseded versions from `eligibleEmbeddingVersionIds`.
5. If `include_stale = true`, include stale diagnostic versions and mark them in the shadow artifact.
6. Call pgvector candidate query with `eligibleEmbeddingVersionIds`.
7. Apply DB-side per-literature cap and global candidate limit.
8. Apply service rerank, same-work dedup, evidence grouping, and final topK.

## Why This Matters
- The Phase 1 SQL uses `ROW_NUMBER() OVER (PARTITION BY literatureId)` for per-literature cap.
- If stale versions entered SQL first, stale candidates could consume the per-literature cap before service rerank.
- Excluding stale-ineligible versions before SQL preserves the existing default `include_stale = false` semantics.

## Required Assertions
- With `include_stale = false`, the captured repository input does not contain stale version IDs.
- With `include_stale = false`, captured SQL does not contain stale diagnostic version IDs.
- With `include_stale = true`, stale diagnostic candidates may appear and must be marked in artifacts.
- Partial active/evidence-ready versions, including `LIT-0252`, are eligible when they satisfy evidence gates.
- Repository SQL must not hard-code `status = 'INDEXED'`.

## Promotion Blockers
- Any stale-ineligible candidate returned from pgvector shadow blocks Phase 2 exit.
- Any stale version consuming per-literature cap with `include_stale = false` blocks Phase 2 exit.
- Any implementation that applies stale filtering only after repository candidate ranking is rejected.
