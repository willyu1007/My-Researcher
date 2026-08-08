# T-136 DB-B / PKT-S connection check

- Date: 2026-08-08 (Asia/Shanghai)
- SSOT mode: `repo-prisma`; source is `prisma/schema.prisma`.
- Verification target: disposable loopback PostgreSQL database `t136_db_b_pkt_s_verify_20260808_01` on `127.0.0.1:5432`, explicit role `yurui`, schema `public`.
- Server census: PostgreSQL `17.7`; `vector` extension `0.8.1` is available.
- Authorization boundary: the user requested implementation and disposable verification. No named-local database deployment, capability enablement, credential operation or cloud call was authorized or performed.
- Safety check: the target name is task-specific and disposable, not the product database `postgres?schema=my_researcher_dev`. It is dropped after verification and its absence is rechecked.

Connection strings in evidence intentionally omit passwords; local peer/trust authentication supplied access.
