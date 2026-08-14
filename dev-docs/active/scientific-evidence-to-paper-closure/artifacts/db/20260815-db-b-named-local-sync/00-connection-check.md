# Named-local DB connection check

- Checked at: `2026-08-14T22:38:50Z`
- Environment: `dev`
- Direction: repo Prisma SSOT → named-local PostgreSQL
- Target: database `postgres`, schema `my_researcher_dev`, `127.0.0.1:5432`
- PostgreSQL: `17.7 (Homebrew)`
- Target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`
- SSOT mode: `repo-prisma`
- Connection credentials were read from `.env.local` and were not printed or persisted.
- `prisma migrate status` found exactly one pending migration:
  `20260808090000_add_scientific_source_and_packet_closure_binding`.

## Recovery point

- Directory: `/Users/yurui/Desktop/My-Researcher-Recovery/T-136/db-sync-20260815-0631/`
- Full schema dump: 1,101,926 bytes, 2,038 selected TOC entries, including both `vector` extension entries.
- Affected-table data dump: 8,256 bytes, five exact `TABLE DATA` entries.
- All three recovery files are mode `0600`; the manifest contains no credential.
