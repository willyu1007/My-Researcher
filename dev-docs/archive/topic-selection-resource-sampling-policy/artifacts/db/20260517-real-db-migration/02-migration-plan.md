# Migration Plan

Strategy: versioned Prisma migration via `prisma migrate deploy`.

Commands:

```bash
pnpm exec prisma migrate status --schema prisma/schema.prisma
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma migrate status --schema prisma/schema.prisma
node .ai/scripts/ctl-db-ssot.mjs sync-to-context
```

Rollback expectation:

- No destructive SQL was applied.
- If rollback were needed in local dev, drop the three new resource-sampling tables and remove the migration record from the local schema only after preserving any sample-set evidence needed for debugging.
