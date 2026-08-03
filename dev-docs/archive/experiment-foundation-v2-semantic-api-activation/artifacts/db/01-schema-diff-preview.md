# Schema diff preview

Reviewed the complete SQL of the four pending migrations before apply:

1. `20260802150000_add_experiment_foundation_promotion_v2`: four additive promotion/candidate/receipt/outbox tables plus indexes and restrictive foreign keys.
2. `20260802203000_add_exploration_spec_v2`: three additive immutable exploration-spec tables plus indexes and restrictive foreign keys.
3. `20260802220000_add_pi_exploration_attachment_v2`: two additive attachment/receipt tables, two exact unique indexes on existing v2 authority tables and restrictive same-domain foreign keys.
4. `20260803070000_add_pi_semantic_projection_v2`: one rebuildable PI semantic projection table, pgvector extension guard, project/profile/hash indexes and one halfvec HNSW index.

Review outcome:

- Ten new tables; no table/column/schema/index drop, truncate, delete, rename, backfill or update statement.
- Existing authority rows are not rewritten.
- The semantic projection has `ON DELETE CASCADE` from `PaperImplementationProject`; this affects only future project deletion and is appropriate because the projection is rebuildable, not authoritative.
- The new composite unique indexes include already-unique primary ids and do not collapse existing business identities.
- No new migration or Prisma SSOT edit is required.
