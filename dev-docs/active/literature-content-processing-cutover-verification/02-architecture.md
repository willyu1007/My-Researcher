# 02 Architecture

## Cutover Policy
- Direct replacement is the default.
- Avoid dual semantics, duplicate action paths, or compatibility layers that preserve the old mental model.

## Verification Coverage
- Collection does not enqueue processing.
- Explicit processing creates runs.
- Stage order matches the agreed order.
- Fulltext/key content/chunk/embedding/index outputs use new contracts.
- Retrieve reads active indexed versions and warns on stale.
- Backfill dry-run is safe.

## DB Boundary
- This task validates migrations and cleanup outcomes; it should not introduce new schema by itself.
