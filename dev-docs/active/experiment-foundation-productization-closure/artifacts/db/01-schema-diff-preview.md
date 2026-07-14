# Pack A additive schema diff preview

Migration draft:

- `prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql`
- SHA-256: `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`

Additive census:

- 1 closed enum: `ExperimentFoundationAssetTypeV2`
- 6 PI v2 tables
- 28 EF v2 tables
- 0 legacy-table `ALTER`
- 0 PI-to-EF or EF-to-PI foreign key
- 0 Attempt/provider/result/validation/evidence/closure/search/capability/eligibility table or column
- 0 generic v2 `kind/payload` authority table

The migration adds only Pack A identities, per-family freeze-command receipts, immutable revisions, exact relational dependencies, materialization/Run rows and domain-local inbox/outbox relay bookkeeping. Run manifest authority remains ordered `ExperimentFoundationRunCellV2` rows plus the derived hash; no manifest JSON column exists on the Run.
