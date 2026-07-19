# Hand-written Prisma migrations — rules

Migrations originate in this repo (never mirror an external DB). CI replays this
directory onto an empty shadow database and diffs against `prisma/schema.prisma`
(`Prisma Migrate Drift` job, `pnpm ci:prisma-drift`); any non-empty diff fails.

## Index & constraint naming (the two ways drift happens)

PostgreSQL truncates identifiers longer than **63 bytes silently at creation**,
while Prisma's implied naming truncates differently (it shortens the middle to
preserve the `_idx` / `_key` suffix) — so an over-long name in SQL can never
match what Prisma expects. This caused 228 index renames reconciled on
2026-07-19 (81 truncation, 147 unpinned custom names).

Every index/constraint name in a hand-written migration — indexes, unique
constraints, **foreign keys, and primary keys** — must satisfy one of:

1. **Implied name, ≤ 63 bytes** — use Prisma's implied name
   (`Table_col1_col2_idx` for `@@index`, `Table_col_key` for `@@unique`/`@unique`,
   `Table_col_fkey` for relations, `Table_pkey` for primary keys)
   and keep it ≤ 63 bytes. Safest: generate the SQL with
   `prisma migrate dev --create-only` instead of writing names by hand.
2. **Custom name, pinned with `map:`** — if you pick your own (short) name in
   SQL, pin the exact same name in `schema.prisma` on the corresponding
   declaration: `@@index([...], map: "your_name")`, `@@unique([...], map: ...)`,
   `@unique(map: ...)`, `@relation(..., map: ...)` for foreign keys,
   `@id(map: ...)`/`@@id(map: ...)` for primary keys. (Pack C's `ef_*` names are
   the reference example.)

Never declare a name > 63 bytes anywhere — even with `map:`, PostgreSQL will
truncate it.

## Check locally before committing a migration

```bash
createdb -h 127.0.0.1 -U "$USER" drift_shadow_tmp
pnpm ci:prisma-drift -- --shadow-url "postgresql://$USER@127.0.0.1:5432/drift_shadow_tmp"
dropdb -h 127.0.0.1 -U "$USER" drift_shadow_tmp
```

The shadow database is **reset** by `prisma migrate diff` — only ever point the
check at a disposable database. The server needs pgvector installed (migrations
run `CREATE EXTENSION vector`).

## Background

Reconciliation migration (stable in-repo reference):
`20260719120000_reconcile_index_names_and_topic_research_record`. Full drift
inventory and attribution: `01-analysis.md` under
`artifacts/db/migrate-drift-reconciliation-20260719/` in the
`experiment-foundation-productization-closure` dev-docs package (in
`dev-docs/active/` until that package is archived, then `dev-docs/archive/`).
