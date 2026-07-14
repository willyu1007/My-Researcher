# Pack B local-development connection and pre-apply check

- Run ID: `packb-local-landing-20260714-r1`
- Authorization: user authorized the ordered Pack B local landing operations on 2026-07-14.
- Git HEAD at start: `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- DB SSOT: `repo-prisma`
- Env SSOT: `repo-env-contract`
- Sanitized target: PostgreSQL `127.0.0.1:5432/postgres`, schema `my_researcher_dev`
- Target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`
- Observed server: PostgreSQL `17.7`; effective schema `my_researcher_dev`; read-only preflight transaction verified.
- Scope: named loopback local-development target only. Dev/staging/prod/cloud/provider/scientific execution remain excluded.

## Pre-apply result

- Read-only Pack A landing gate: `packb-local-preapply-20260714-r1`, `status=passed`, `failures=[]`, `blockers=[]`.
- Migration history: 59 source migrations, 58 applied; the only pending migration is `20260713210000_add_experiment_foundation_pack_b_provider_control_v2`.
- Existing Pack A v2 table census: 34/34 exact; PI to EF cross-domain FK count remains 0.
- Current schema table count before Pack B: 232.
- Existing Pack B table count: 0.
- Pack A cutover/admission local overrides: `true/true`.
- Pack B workflow-simulation capability: absent/default `false`.
- Local-env doctor: passed; the existing no-credential warning is expected because Pack B uses a deterministic no-network fake transport.

## Fresh authority baseline

The pre-apply gate uses the existing server-side, id-ordered canonical-row digest implementation and stores no row payloads or credentials.

| Authority population | Rows | Digest |
|---|---:|---|
| Five legacy sentinel tables | 257 | `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d` |
| PI v2 tables | 0 | recorded per table in the machine summary |
| EF typed asset/readiness population | 23 identities, 23 revisions, 48 lifecycle events, 23 attestations | source-backed fixture verified by the pre-apply gate |

Machine evidence: `.ai/.tmp/experiment-foundation-productization/packb-local-preapply-20260714-r1/local-landing-gate.json`.

## Recovery point

- Directory: `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-local-landing-20260714-r1/`
- Dump: `pre-packb-my_researcher_dev.dump`
- Format/client: PostgreSQL 17 custom format, schema `my_researcher_dev`
- Size: `7.8G`
- SHA-256: `0b167c08ad461e98fd25f5592bbc31dfb01b67e2f1fa49bb02d753fa95588987`
- `/opt/homebrew/opt/postgresql@17/bin/pg_restore --list`: passed; archive reports 2,062 TOC entries and the saved list has 2,072 lines. The PATH-default PostgreSQL 14 client is incompatible with the archive's v1.16 header and is not valid verification evidence.
- Permissions: backup directory `0700`; dump and list `0600`
