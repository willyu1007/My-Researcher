# 02 Architecture

## Boundary
- Default backend tests should exercise in-memory app wiring unless a test explicitly switches to Prisma.
- Prisma route smoke tests should set repository env vars inside the test and use a migrated, isolated schema.
- `.env.local` is for running the app and real-flow checks, not for leaking persistent development DB state into all unit/integration tests.

## Test Environment Invariant
- `pnpm --filter @paper-engineering-assistant/backend test` must be reproducible:
  - no reliance on existing DB rows;
  - no reliance on user provider keys;
  - no reliance on public network availability;
  - no cross-test persistence unless intentionally scoped inside a test.
- The backend test runner preserves `DATABASE_URL` so explicit Prisma smoke tests can still exercise real Postgres, but removes repository strategy env vars and LLM provider API keys unless `BACKEND_TEST_PRESERVE_REAL_ENV=1` is set.

## Risk Areas
- Existing Prisma smoke subtests intentionally require `DATABASE_URL`.
- Some tests mutate `process.env`; the runner must not break tests that snapshot and restore env internally.
- Background resume hooks can pick up persisted jobs if tests accidentally run against Prisma repositories.
