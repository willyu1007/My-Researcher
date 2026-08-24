# 05 Pitfalls

## Do-not-repeat Summary
- Do not run the default backend test suite against a shared development DB and treat existing rows as test fixtures.
- Do not fix this by deleting real development data.
- Do not skip Prisma smoke coverage; isolate it.
- Do not let provider keys or persisted settings change default test expectations.
- Do not set `BACKEND_TEST_PRESERVE_REAL_ENV=1` for routine full-suite runs; it is only for intentional debugging against the unsanitized local shell.
