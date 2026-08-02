# EF-P06 migration plan

1. Review the additive SQL and Prisma model parity.
2. Validate and generate Prisma Client without connecting to a product database.
3. Apply full migration history only to a randomized disposable pgvector PostgreSQL database.
4. Verify crash rollback, concurrent convergence and reject/no-canonical behavior.
5. Keep the named-local/staging/production migration pending until a separate target-specific apply authorization.

Rollback before enablement: keep `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED=false`; revert product code/migration from deployment if no environment has applied it. After an environment has committed typed outcomes, disable intake and preserve immutable Candidate/decision/outbox history rather than deleting it or reopening legacy promotion.
