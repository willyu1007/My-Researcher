# 03 Implementation Notes

## 2026-05-17
- Created to own S2/S3/S5/S6 backend and persistence work after contracts settle.
- Initial design decision: persistence stores metadata and references only; large artifacts stay behind filesystem/cloud refs.

## 2026-05-18
- Implemented T-076 as the selected minimum closed-loop persistence design: a generic `ExperimentFoundationRecord` registry plus `ExperimentFoundationReadinessReport`.
- Added repo-only Prisma migration `20260518090000_add_experiment_foundation_core`; no live database migration was applied.
- Refreshed `docs/context/db/schema.json` through DB SSOT.
- Added shared API wrapper contracts for record create/store/list, readiness check response, and candidate promotion decision response without redefining T-070~T-075 domain DTOs.
- Added backend `ajv` direct dependency and service-side schema compilation with `removeAdditional: false`; wrapper alias fields such as `canonical_payload` are explicitly forbidden to avoid Fastify/Ajv strip behavior hiding drift.
- Added `ExperimentFoundationRepository`, in-memory and Prisma implementations, and `ExperimentFoundationService`.
- Added REST routes under `/experiment-foundation`:
  - `POST /experiment-foundation/records`
  - `PUT /experiment-foundation/records/:record_kind/:record_id`
  - `GET /experiment-foundation/records/:record_kind/:record_id`
  - `GET /experiment-foundation/records`
  - `POST /experiment-foundation/readiness/check`
  - `GET /experiment-foundation/readiness/:target_kind/:target_id/latest`
  - `POST /experiment-foundation/candidates/:candidate_id/promotion`
- Added `EXPERIMENT_FOUNDATION_REPOSITORY=memory|prisma`; when unset it follows the existing repository strategy fallback chain.
- Candidate promotion persists promotion request/result records, verifies existing canonical refs for promoted results, and updates candidate status without synthesizing canonical DTOs.
- Mainline next owner is `T-077 experiment-foundation-execution-adapters`.

## 2026-05-18 Post-Review Fixes
- Tightened candidate promotion traceability: promotion request/result candidate refs must match the persisted candidate record kind and candidate family.
- Moved promotion request/result/candidate status persistence behind `ExperimentFoundationRepository.recordPromotionDecision` so Prisma can commit the state transition in one transaction and the in-memory repository can roll back partial writes.
- Mapped Prisma unique constraint races on experiment-foundation record create to `409 VERSION_CONFLICT`, preserving the T-076 API error contract beyond the pre-check path.
