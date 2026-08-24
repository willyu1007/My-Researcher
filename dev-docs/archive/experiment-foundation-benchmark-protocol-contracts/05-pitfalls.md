# 05 Pitfalls

## Do Not Repeat
- Do not make `BenchmarkAsset` a full protocol blob.
- Do not require benchmark_verified status for baseline catalog entry.
- Do not duplicate retired workspace-selection fields as canonical metadata.
- When a boundary relies on rejecting drift fields, forbid common alias variants explicitly; Fastify/Ajv can strip unknown properties before they surface as schema errors.

## 2026-05-17 - Forbidden-field Alias Drift
- Symptom: Review-only Fastify injection accepted `BaselineAsset.evaluation_protocol_refs`, `BaselineAsset.evaluation_protocol_id`, and `BenchmarkAsset.baseline_implementation_version_id`.
- Root cause: The initial schemas explicitly forbade the primary risky fields but missed common alias variants; unknown-field stripping meant `additionalProperties: false` was not enough to fail the request.
- What was tried: Direct schema inspection plus Fastify injection against the same validation path used by the schema tests.
- Fix: Added explicit forbidden properties for baseline implementation variants on `BenchmarkAsset` and protocol/evaluation-protocol variants on `BaselineAsset`; expanded negative tests to cover them.
- Prevention: For every ownership boundary, maintain a negative-test field list that includes singular/plural, `_id`/`_ids`, and `_ref`/`_refs` variants for high-risk concepts.
