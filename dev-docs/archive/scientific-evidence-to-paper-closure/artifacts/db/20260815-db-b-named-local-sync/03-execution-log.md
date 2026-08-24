# Migration execution log

- Applied at: `2026-08-14T22:43Z` (UTC minute)
- Target: database `postgres`, schema `my_researcher_dev`, `127.0.0.1:5432`
- Toolchain: Node 20, pnpm, Prisma 5.22.0, PostgreSQL 17.7
- Command class: `prisma migrate deploy` with `.env.local` loaded in process memory
- Applied migration: `20260808090000_add_scientific_source_and_packet_closure_binding`
- Result: success; no other pending migration existed or was applied.

No connection credential was printed or written to this evidence. The migration source was already
tracked and was not modified. No `db push`, manual DDL, runtime-row repair or revision-17 replay was
performed.

## State preservation

Exact pre/post revision-17 counts were identical:

| Relation | Before | After |
|---|---:|---:|
| Execution Attempts | 2 | 2 |
| Provider commands | 5 | 5 |
| Collection attempts | 1 | 1 |
| Provisional outputs | 0 | 0 |
| Scientific Results | 0 | 0 |
| ResultInterpretationPackets | 1 | 1 |
| ValidationCycle closures | 1 | 1 |
