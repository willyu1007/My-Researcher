# 02 Architecture

## Boundary
- This task owns semantic contracts and orchestration state shape.
- Product behavior is still implemented by later child tasks.

## Key Decisions From Parent
- Keep seven stage codes.
- Change semantic order so `FULLTEXT_PREPROCESSED` precedes `KEY_CONTENT_READY`.
- `STALE` is a first-class stage status; details hold reason codes and recommendations.
- Direct replacement is required; no old/new dual-track compatibility layer.

## Contract Outputs
- Stage status enum includes `STALE`.
- Stage detail includes stale/block/retry metadata.
- Overview action set can express content processing, retrieval readiness, rebuild, reextract, retry, and reason inspection.

## DB Boundary
- Confirmed during implementation: stage codes/statuses are stored as strings in the existing literature pipeline records.
- No Prisma migration is required for this task.
- `STALE` is introduced at shared/API/backend/desktop contract boundaries and persisted through the existing string-backed status field.
