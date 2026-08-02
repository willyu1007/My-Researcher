# DB target and connection gate

> Historical Pack A implementation checkpoint. The later authorized named-local
> landing is recorded separately under `artifacts/db/local-development-20260713/`
> and `artifacts/db/pack-b-local-development-20260714/`.

- SSOT mode: `repo-prisma`
- Dialect: PostgreSQL
- Existing local/dev/staging/prod target: prohibited for Pack A implementation
- Authorized apply target: a newly created disposable pgvector PostgreSQL 16 instance only
- Disposable validation target: one newly created `pgvector/pgvector:pg16` container with a tmpfs data directory and an ephemeral loopback port
- Current phase: migration apply/readback completed on that disposable target; the container was then deleted
- Credential logging: disabled

The D-19 gate must use its own isolated database URL or pinned disposable Docker container. It must not read `DATABASE_URL`, `.env.local` or another existing-environment fallback.

No existing local/dev/staging/prod connection string was read or contacted during this validation.
