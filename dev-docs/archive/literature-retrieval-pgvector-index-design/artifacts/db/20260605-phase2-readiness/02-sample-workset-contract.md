# Sample Workset Contract

## Purpose
- Phase 2 validates semantics on a small fixed workset before any broad backfill.
- The workset must be materialized before mutation so JSONB baseline and pgvector shadow evidence compare the same records.

## Required Roles
- `partial_visual_surface`: exactly `LIT-0252` if present and evidence-ready.
- `standard_fulltext_semantic`: at least one active/evidence-ready standard fulltext literature record.
- `metadata_title_lexical`: at least one active/evidence-ready record selected to exercise lexical/title metadata rerank.
- `unscoped_corpus_control`: at least one active/evidence-ready record that can appear in unscoped retrieval.
- `stale_policy_diagnostic_optional`: one stale or superseded diagnostic version if available; this record is used only for stale policy checks.

## Selection Rules
- Select only records with a compatible active embedding profile for the 3072-dimensional native column unless the role is `stale_policy_diagnostic_optional`.
- Select records with at least one embedding chunk and at least one non-empty raw JSONB vector.
- Prefer evidence-ready literature records already used by current retrieval smoke coverage.
- Exclude stale versions from normal roles.
- Order deterministic candidates by `literature_id ASC`, then `embedding_version_id ASC`, then role-specific tie breaker.
- Do not select more than the minimum needed to satisfy the roles unless the Phase 2 operator records why.

## Manifest Schema
Phase 2 execution MUST write `sample-workset-manifest.json` with:

```json
{
  "schema_version": 1,
  "generated_at": "ISO-8601 timestamp",
  "target_db_ref": "redacted local/dev target reference",
  "migration_id": "20260605104000_add_literature_pgvector_phase1",
  "items": [
    {
      "sample_role": "partial_visual_surface",
      "literature_id": "LIT-0252",
      "embedding_version_id": "string",
      "embedding_profile_id": "string",
      "provider": "string",
      "model": "string",
      "dimension": 3072,
      "chunk_count": 0,
      "vector_count": 0,
      "stale_status": "current",
      "evidence_scope": "partial_visual",
      "selection_reason": "string"
    }
  ]
}
```

## Validation Gates
- `LIT-0252` missing from the manifest blocks Phase 2 unless the operator records that the local/dev DB does not contain it.
- Any normal-role item with dimension other than `3072` blocks backfill.
- Any normal-role item with `chunk_count = 0` or `vector_count = 0` blocks backfill.
- Any normal-role item marked stale blocks backfill.
