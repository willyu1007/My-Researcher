# 02 Architecture

## Candidate Flow
```text
Literature key content / manual source
  -> ExperimentAssetCandidate
  -> deterministic triage
  -> needs_info | manual_review_required | rejected | ready_for_promotion
  -> promote to canonical asset + version/protocol/policy refs
```

## Candidate Families
- `DatasetAssetCandidate`
- `BenchmarkAssetCandidate`
- `BaselineAssetCandidate`
- `EvaluationProtocolCandidate`
- `MethodComponentCandidate`
- `BaseModelCandidate`

## Required Promotion Inputs
- source refs and extraction provenance
- canonical name and aliases
- version/protocol/license/policy fields where applicable
- duplicate check result
- risk level and confidence
- reviewer or deterministic rule trace

## Auto-promotion Rules
- Auto-promotion MAY occur only for low-risk candidates with sufficient source refs, version/policy/license data, duplicate checks, and confidence.
- Restricted, privacy-sensitive, model-weight, fine-tuning, unclear license, or low-confidence candidates MUST go to manual review or needs_info.

## Negative Schema Tests
- Reject auto-promotion without source refs.
- Reject auto-promotion without license/policy/version data.
- Reject candidate promotion into canonical `candidate` asset status.
- Reject high-risk candidate auto-promotion.
