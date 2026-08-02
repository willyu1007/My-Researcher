# EF-P06 DB execution log

- Named-local/staging/production apply: not executed; no target was authorized.
- Final disposable run: `d19_1d5fd15b61e7`, nonce prefix `1d5fd15b61e7`, loopback container using the repository-pinned pgvector image. The earlier successful `d19_94221898002a` run supplied the independent final count check before stored-read integrity assertions were added.
- `prisma migrate deploy`: passed for full history including `20260802150000_add_experiment_foundation_promotion_v2`.
- Relational test: passed; crash rollback, recovery, concurrent two-key convergence and reject/no-canonical were exercised.
- Relational assertions observe 3 terminal decisions across three independent scenarios and exact per-aggregate Candidate/canonical/receipt/outbox counts.
- Container: removed after the gate.
