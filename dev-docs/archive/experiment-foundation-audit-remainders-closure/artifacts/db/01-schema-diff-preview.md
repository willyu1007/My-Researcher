# EF-P06 schema diff preview

Migration: `prisma/migrations/20260802150000_add_experiment_foundation_promotion_v2/migration.sql`.

Additive objects only:

- `ExperimentFoundationPreparationCandidateV2`
- `ExperimentFoundationPromotionDecisionV2`
- `ExperimentFoundationPromotionCommandReceiptV2`
- `ExperimentFoundationPromotionOutboxV2`

The migration adds no column/table drop, rename, data rewrite, cross-domain foreign key or legacy-table mutation. Canonical refs remain exact scalar identities because they target one of five concrete EF asset revision tables. Candidate/decision/receipt/outbox ownership is enforced with same-domain composite/unique foreign keys and status/pairing checks.
