# Phase 3B Database Post-Verification

- Prisma format, placeholder-URL validate, client generation and backend typecheck passed.
- Full migration history reproducibility and zero drift passed on disposable PostgreSQL.
- Crash after attachment insert left zero branch, revision, admission, outbox, attachment and receipt rows.
- Concurrent exact commands produced one authority bundle and two receipts; later different-key replay added only one receipt.
- Corrupted durable attachment content failed deterministic identity verification.
- DB context regeneration passed; named database state remained unchanged.
