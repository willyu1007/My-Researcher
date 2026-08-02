# Prisma migrate drift — read-only analysis & reconciliation plan (2026-07-19)

> **Status: LANDED & VERIFIED 2026-07-19.** Option 1 approved in full (Part 1 + Part 2) and
> applied together with Pack C via `prisma migrate deploy` (migration
> `20260719120000_reconcile_index_names_and_topic_research_record`, 66/66 applied).
> Post-apply verification: `migrate diff --from-url … --to-schema-datamodel` returns an empty
> migration; a `migrate dev --create-only` probe generated `-- This is an empty migration.`
> (probe deleted); `TopicResearchRecord` now has pkey + both declared indexes and no
> `confidence` default. Note: the migration is future-dated ~11h (12:00) — avoid generating
> another migration before 2026-07-19 12:00 local so directory order matches apply order.

## Scope & method

Investigates the pre-existing drift that `prisma migrate dev --create-only` emits against the
named-local target (`127.0.0.1:5432/postgres?schema=my_researcher_dev`), previously noted in
`../pack-c-scientific-validation-20260718/01-schema-diff-preview.md` ("Excluded pre-existing
drift"). All analysis was read-only: `prisma migrate diff --from-url … --to-schema-datamodel
prisma/schema.prisma --script` (introspection only), `_prisma_migrations` / `pg_indexes` reads,
and offline replay of the 65 migration SQL files. No database was modified.

State at analysis time: 64/65 migrations applied, none failed; the only unapplied migration is
Pack C `20260718224543` (intentionally pending separate apply approval). The live schema is
therefore an exact replay of the migration history — the drift below is identically
history-vs-schema drift, and the counts here are exact (the "~170 RenameIndex" in the Pack C
preview was an estimate; the precise number is 228).

## Exact drift inventory (everything non-Pack-C in the diff)

| Item | Count | Nature |
|---|---|---|
| `ALTER INDEX … RENAME TO …` | 228 | Pure metadata renames; 223 topic-selection, 2 literature, 3 EF-legacy |
| `TopicResearchRecord.confidence` DROP DEFAULT | 1 | DB has `DEFAULT 0.500`; schema never declared it |
| `TopicResearchRecord` missing indexes | 2 | Declared in schema since day one, never created in DB |

Nothing else: no enum changes, no drops, no column-type changes. The Pack C portion of the diff
is statement-for-statement identical to migration `20260718224543` (the migration's 10 extra
CHECK constraints are invisible to Prisma diffing), so applying Pack C introduces no new drift.

## Root causes (fully attributed, 0 unmatched)

All 228 renames were attributed to their originating migration by offline replay of the
migration SQL (including PostgreSQL's silent 63-byte identifier truncation). Two classes:

**Class A — over-long names silently truncated by PostgreSQL (81 renames, 14 migrations).**
Hand-written migrations declared index names longer than 63 bytes. PostgreSQL truncated them at
creation (e.g. `…_adapterKind_jobStatus_i`), while Prisma's implied naming truncates the middle
to preserve the `_idx`/`_key` suffix (e.g. `…_adapterKind_jobStat_idx`). Main sources: the
2026-05-13 topic-selection wave (`add_topic_selection_need_validation` 26,
`…_search_resource_inputs` 9, `…_v1b_topic_package_draft` 9, `…_v1b_value_assessment` 8,
`…_v1b_intake` 7, `…_control_plane` 6, others 1–4 each), plus 1–2 each in
`upgrade_literature_pipeline_v2`, `add_literature_clusters`, `add_experiment_foundation_core`,
`…_external_training_jobs`.

**Class B — deliberate short custom names never pinned in schema (147 renames, 4 migrations).**
Migrations used hand-picked names (`tsrss_*`, `tsrsi_*`, `TopicQuestion_v1b_*`, …) but
`schema.prisma` declares the corresponding `@@index`/`@@unique` without `map:`, so Prisma
expects its implied names. Sources: `20260514160000_add_topic_selection_v1b_topic_question_contract`
(74), `20260514130000_add_topic_selection_v1b_research_slice` (58),
`20260517120000_add_topic_selection_resource_sampling` (9),
`20260530170000_add_topic_selection_prompt_packet_cache_index` (6).

(Pack C is the counter-example done right: its custom `ef_*` names are pinned with `map:` in
schema.prisma, hence zero renames from it.)

**TopicResearchRecord (born inconsistent, 2026-03-18).** Commit `cb69460e` added the model to
schema.prisma with no `@default` on `confidence` and with both `@@index([topicId, recordType,
recordStatus])` / `@@index([topicId, updatedAt(sort: Desc)])`, but the same commit's hand-written
migration `20260318120000_topic_management_v1` created the table with `DEFAULT 0.500` and no
indexes. The table today has only its pkey (2,690 rows in named-local dev) — the two declared
indexes have never existed anywhere.

## Safety assessment

- **228 renames**: metadata-only (`ALTER INDEX RENAME` needs only SHARE UPDATE EXCLUSIVE on
  PG ≥ 12; instant). Verified: 0 name collisions (no old name is any rename's target or any
  schema-implied name), 0 duplicate targets, all targets ≤ 63 bytes and present in the
  schema-implied name set. No code references any old name: repo-wide grep found no
  `ON CONFLICT ON CONSTRAINT`, no raw SQL naming these indexes; the only index-name assertion
  (`prisma-experiment-foundation-execution-v2-relational.integration.test.ts` Pack B
  `EXPECTED_PACK_B_INDEXES`) covers V2 tables untouched by the renames. **No behavior change.**
- **DROP DEFAULT on `confidence`**: every write path is prisma-client
  `titleCardResearchRecord.create` (7 call sites + tests); the client, generated from a schema
  with no `@default`, already requires `confidence` on every create. No raw-SQL insert paths
  exist. The DB default is dead weight; dropping it cannot change behavior. Existing rows are
  unaffected (DROP DEFAULT is prospective-only). *Needs topic-selection domain-owner ack.*
- **Two new indexes**: pure additive perf (current queries on `topicId` seq-scan a 2,690-row
  table); instant build at this size. *Needs topic-selection domain-owner ack.*

## Recommended plan

**Option 1 (recommended): one reconciliation migration** — drafted as
`02-reconciliation-migration-draft.sql`, later removed as redundant once landed verbatim as
`prisma/migrations/20260719120000_reconcile_index_names_and_topic_research_record/migration.sql`
(Part 1 = 228 renames, Part 2 =
TopicResearchRecord DROP DEFAULT + 2 CREATE INDEX). On approval:

1. Create `prisma/migrations/20260719<hhmmss>_reconcile_index_names_and_topic_research_record/migration.sql`
   with the draft content (timestamp after Pack C's `20260718224543` so replay order is
   Pack C → reconciliation).
2. Apply with `prisma migrate deploy` (applies Pack C + reconciliation verbatim, no re-diff) —
   or let the next approved `migrate dev` pick both up.
3. Verify: `prisma migrate diff --from-url … --to-schema-datamodel … --script` returns
   "empty migration" (and a later `migrate dev --create-only` produces no drift statements).

If the domain owner wants to keep the DB default / defer the indexes instead, the schema must
change to match (add `@default(0.5)` — which loosens the generated client's create type — and
delete the two `@@index` lines); otherwise that one-line + two-line drift will reappear in every
future diff. Aligning the DB to the schema (Part 2 as drafted) is the cleaner direction.

**Option 2 (rejected): pin 228 `map:` names in schema.prisma.** Zero DB changes, but it
permanently enshrines broken names (truncated identifiers that lost their `_idx` suffix) and
adds 228 noisy annotations. Only preferable if index names must stay stable for external
tooling — none exists (verified above).

**Going-forward rule** (worth adding to the migration playbook): hand-written migrations must
either use Prisma's implied index names (≤ 63 bytes — Prisma's truncation, not PG's) or pin
custom names in `schema.prisma` with `map:`, as Pack C did. A post-migration
`migrate diff --from-migrations --to-schema-datamodel` emptiness check in CI would catch both
classes at authoring time.

## Approval gates before landing

1. Topic-selection domain owner: Part 2 (DROP DEFAULT + 2 indexes) — Part 1 needs no sign-off
   beyond this report.
2. User approval for DB apply on named-local (per standing rule; step 2 above).
