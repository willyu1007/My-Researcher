# 02 Migration Plan

## Strategy
- Versioned Prisma migration.
- Migration file: `prisma/migrations/20260530170000_add_topic_selection_prompt_packet_cache_index/migration.sql`.

## Rollout
1. Review the migration SQL.
2. Apply to the intended dev/staging/prod database only after explicit approval for that target environment.
3. Run `npx prisma migrate deploy` for staging/prod or `npx prisma migrate dev` for an approved local/dev target.
4. Run post-verify: `npx prisma migrate status`, backend typecheck, focused prompt cache tests, and relevant harness smoke tests.

## Local/Dev Apply Result
- Approved local/dev target was applied through the repo script `pnpm db:dev:migrate`, which runs `prisma migrate deploy` after loading `.env.local`.
- Applied migration: `20260530170000_add_topic_selection_prompt_packet_cache_index`.
- Post-apply status reported the database schema is up to date.

## Rollback
- Since this migration only creates a new cache/index table, rollback can drop `TopicSelectionPromptPacketCacheIndex` if the deployment must be reverted before any later migration depends on it.
- Dropping the table removes acceleration/index metadata only; it does not remove business authority records or provider responses.

## Approval Gate
- Local/dev DB write approval was granted before apply.
- No staging/prod DB write was requested or executed.
- Before any staging/prod write, confirm environment, target database, backup/snapshot readiness or explicit risk acceptance, and migration strategy.
