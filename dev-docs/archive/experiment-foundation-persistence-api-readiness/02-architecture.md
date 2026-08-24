# 02 Architecture

## Backend Layers
```text
routes -> controllers -> services -> repositories -> Prisma / filesystem refs
```

## Persistence Rules
- Postgres stores generic registry envelopes: metadata, ids, refs, statuses, hashes, policies, event summaries, sidecar refs, and frozen contract payload JSON.
- Filesystem stores raw/processed data, large manifests, split files, logs, predictions, checkpoints, and generated configs.
- Cloud stores execution mirrors and platform artifacts only.
- Repositories return domain DTOs and do not leak Prisma objects.
- The initial T-076 DB design intentionally avoids full per-contract table normalization; key indexed fields are extracted from payloads for lookup/readiness/promotion.

## API Surfaces
- registry create/upsert/search/detail for T-070~T-075 records
- readiness check and latest-readiness lookup
- candidate promotion decision persistence, consuming T-075 promotion request/result contracts
- materialization/result/evidence/sidecar records can be stored as domain payloads but execution behavior remains owned by later tasks

## Required Invariants
- DB schema changes use DB SSOT.
- Business layer does not import Prisma.
- No raw data blobs, secrets, access keys, or full adapter-private payloads in Postgres.
- Candidate status remains separate from canonical asset lifecycle; promoted records store canonical refs/hashes only.
- Readiness blocks incomplete locks and stale/broken assets before execution.

## Verification
- Repository/service tests for transaction boundaries and DTO mapping.
- API tests for valid/invalid payloads.
- DB context refresh after migrations.
