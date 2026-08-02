# DB workflow execution log

## 2026-07-13 — DB-free validation

```bash
DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:1/placeholder?schema=public' \
  pnpm --filter @paper-engineering-assistant/backend prisma:validate
pnpm --filter @paper-engineering-assistant/backend prisma:generate
node .ai/scripts/ctl-db-ssot.mjs sync-to-context
```

Outcomes:

- Prisma schema valid.
- Prisma Client 5.22.0 generated.
- `docs/context/db/schema.json` regenerated from `prisma/schema.prisma`.
- Final DB context artifact checksum: `565ec7fcba6bffeee409cd9ca07d6d2fb7381fd650cb8e8805c65a33202dee34`.
- The placeholder URL was not contacted; no database migration was applied.

## 2026-07-13 — Disposable PostgreSQL migration apply

An isolated `pgvector/pgvector:pg16` container was started with a tmpfs data
directory, a generated loopback-only port and throwaway credentials. The
repository's complete migration history was applied with `prisma migrate
deploy`, then read back with `prisma migrate status` and SQL schema censuses.

Outcomes:

- all 58 migrations applied, including `20260713180000_add_experiment_foundation_d19_v2_spine`;
- Prisma reported the disposable schema up to date;
- the final Pack A census found 34 v2 tables: 6 PI and 28 EF;
- the cross-domain foreign-key census returned 0;
- the container was stopped and removed after verification;
- no existing environment database was connected to or changed.

## 2026-07-13 — Final D-19 disposable PostgreSQL gate

Run id: `packa-d19-final-20260713-r2`

Outcomes:

- A01-A04 and B01-B10 all passed;
- all four domain-owned Units of Work committed; T1-T3 rollback probes passed and T4 produced the single final receipt only;
- all three integration events were delivered once and converged under replay;
- all five legacy sentinels and all 197 non-v2 application tables retained identical before/after digests;
- the final v2 census contained exactly the 34 approved tables and zero excluded writes;
- migration SHA-256 was `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`;
- the disposable `pgvector/pgvector:pg16` container was removed;
- no existing environment database was read or changed.

The gate summary status is `blocked` only because the two original-source dataset license/access attestations were not supplied (`SOURCE_POLICY_UNRESOLVED`). This does not invalidate the passed technical checks and must not be converted into a default pass.

## 2026-07-13 — Source-policy closure rerun

The historical blocker above was resolved by a separate exact-attestation rerun; the earlier run remains unchanged evidence of the technical-only state.

Run id: `packa-d19-source-policy-20260713-r2`

Outcomes:

- overall and source-policy status were `passed`, `reason_code=null` and `blockers=[]`;
- A01-A04 and B01-B10 all remained passed;
- canonical attestation digest was `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`;
- migration digest remained `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`;
- the disposable image was the pinned `pgvector/pgvector:0.8.0-pg16`; the container was cleaned up;
- no existing database URL was used, all 197 non-v2 application tables had zero changed-table/write delta and external fetch count was 0.

The rerun closes only control-plane source binding. Full-source download/re-hash, extraction, scientific alignment, provider execution, existing-environment DB apply and product cutover were not performed.
