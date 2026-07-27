# Migration plan

1. Require an exact user authorization that names the reviewed named-local
   migration and the subsequent six-row SciFact bundle freeze.
2. Reconfirm the reviewed named-local fingerprint and current zero-row bundle
   census.
3. Run versioned Prisma migration deploy; do not use `db push`.
4. Verify `prisma migrate status` and both new CHECK definitions.
5. Run the restart-safe bundle importer once. Expected scoped result: exactly
   one identity, draft, revision, lifecycle event, lifecycle projection and
   readiness row.
6. Run the same importer again. Expected result: zero new rows and six exact
   reuses.
7. Reconfirm protected-table row-version digests and zero external fetch,
   cloud/provider/`CreateJob`/scientific writes.

Rollback posture: do not rewrite or delete an immutable bundle after freeze.
Before the freeze, the CHECK change can be reverted only if no v2 row exists.
After a v2 row exists, rollback is capability/default-off containment plus a
forward migration; reverting to the v1-only constraint would be invalid.
