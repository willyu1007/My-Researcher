# 01 Plan

## Phases
1. Define candidate payload families and source refs.
2. Define review status machine: `needs_info`, `manual_review_required`, `ready_for_promotion`, `promoted`, `rejected`.
3. Define deterministic low-risk auto-promotion conditions.
4. Define duplicate detection and risk reasons.
5. Add negative tests for ungrounded, restricted, low-confidence, no-license, no-version, and no-policy candidates.

## Acceptance Criteria
- Candidate state never appears as canonical `DatasetAsset`, `BenchmarkAsset`, or `BaselineAsset` lifecycle state.
- Promotion produces canonical asset refs and required version/protocol/policy refs.
- High-risk or incomplete candidates cannot auto-promote.
- Literature source refs remain traceable after promotion.

## Review Gate
- Close after canonical asset contracts settle.
- Close before candidate API or automated import implementation.
