# 05 Pitfalls

## Do-not-repeat Summary
- Do not store durable runners under `.ai/.tmp`; that path is ignored and for transient evidence only.
- Do not make provider credentials required for default test suites.
- Do not mutate existing user data for negative checks; only touch records created by the current run.
