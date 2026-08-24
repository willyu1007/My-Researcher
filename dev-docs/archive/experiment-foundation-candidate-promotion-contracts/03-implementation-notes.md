# 03 Implementation Notes

## 2026-05-18
- Post-review fix:
  - Candidate/promotion schemas now explicitly reject `_dto` aliases and result/materialization DTO-copy fields that Fastify/Ajv may otherwise strip as unknown fields.
  - Promoted `ExperimentAssetPromotionResult` now requires non-empty canonical asset, version, protocol, and policy refs.
  - Added regression tests for DTO alias leakage and missing promoted canonical refs.
- Completed `T-075 experiment-foundation-candidate-promotion-contracts` as a shared-contract-only slice.
- Added support records for source/provenance trace, duplicate check, completeness check, policy/license check, risk assessment, and deterministic rule trace.
- Added candidate payload contracts for dataset, benchmark, baseline, evaluation protocol, method component, and base model candidates.
- Dataset candidates cover benchmark datasets and fine-tuning datasets through `dataset_usage`; no separate fine-tuning dataset candidate family was introduced.
- Added `ExperimentAssetCandidateTriageReport`, `ExperimentAssetPromotionRequest`, and `ExperimentAssetPromotionResult`.
- Auto-promotion is contract-gated by grounded source/provenance refs, `ready_for_promotion`, confidence >= `0.8`, low risk, no duplicate, complete fields, clear policy, and deterministic rule traces.
- Promotion outputs canonical refs/hashes only; it does not embed canonical DTOs or create product-layer assets.
- Added explicit forbidden candidate lifecycle fields to canonical asset/protocol/method schemas because the repo validation stack may strip unknown fields.
- Mainline next owner is `T-076 experiment-foundation-persistence-api-readiness`.

## 2026-05-17
- Created to separate candidate state from canonical asset lifecycle and define low-risk auto-promotion constraints.
- Initial design decision: canonical assets do not use `candidate` as lifecycle state; candidates are separate review objects.
