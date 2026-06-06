# Shadow Query Set Contract

## Purpose
- The query set fixes JSONB baseline and pgvector shadow comparison inputs.
- Query text, scopes, and request options must be identical between baseline and shadow runs.

## Required Query Classes

| Query ID | Class | Required Behavior |
| --- | --- | --- |
| `q_lit_0252_visual_scoped` | scoped partial visual | Scoped to `LIT-0252`; proves partial visual surface remains retrievable |
| `q_standard_semantic_scoped` | standard semantic | Scoped to a standard fulltext sample record |
| `q_metadata_lexical` | lexical/title metadata | Exercises lexical and metadata rerank after vector candidate retrieval |
| `q_stale_default_excluded` | stale policy default | Runs with `include_stale = false`; stale versions must not enter pgvector candidate input |
| `q_stale_include_diagnostic` | stale include diagnostic | Runs with `include_stale = true` only if a stale diagnostic item exists |
| `q_unscoped_bounded` | sample bounded-corpus compatibility | Runs across the whole Phase 2 sample workset and records bounded candidate telemetry |

## Query Record Schema
Each query record MUST include:

```json
{
  "query_id": "q_lit_0252_visual_scoped",
  "query": "operator-provided fixed query text",
  "profile": "general",
  "top_k": 5,
  "evidence_per_literature": 3,
  "include_stale": false,
  "literature_scope": ["LIT-0252"],
  "expected_sample_roles": ["partial_visual_surface"],
  "baseline_required": true,
  "normalized_query_vector": [0.0, 1.0]
}
```

## Baseline Requirements
- Capture JSONB baseline before writing native vectors for the sample workset.
- Baseline artifacts MUST store a deterministic `query_set_checksum`, `query_count`, and per-query `query_fingerprint`.
- Per-query fingerprints MUST cover query text, request options, scope, stale policy, baseline requirement, and a hash of `normalized_query_vector`.
- Preserve baseline response identifiers, final scores, stale warnings, evidence grouping, same-work dedup decisions, and latency.
- In Phase 2, sample-corpus parity compares JSONB and pgvector over the same materialized workset; true global unscoped/public-scale evidence is deferred to later large-scale/cutover phases.

## Shadow Requirements
- Run pgvector shadow against the same query records after sample backfill.
- `run-shadow` MUST reject stale or mismatched artifacts when baseline target, query-set checksum, or per-query fingerprint does not match the supplied sample workset/query set.
- `normalized_query_vector` is required for `run-shadow` unless a later runner mode adds provider-side query embedding capture.
- Query vectors are runner inputs and are omitted from output artifacts; do not store corpus chunk vectors in query or shadow artifacts.
- Shadow output must be artifact-only.
- Public API response payloads remain JSONB and must not include shadow details.
