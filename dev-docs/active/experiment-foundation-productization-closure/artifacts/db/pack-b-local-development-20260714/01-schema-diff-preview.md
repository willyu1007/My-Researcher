# Pack B local-development schema diff preview

## Reviewed artifact

- Migration: `prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql`
- SHA-256: `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`
- Prisma schema SHA-256 at review: `b9da7073fe971fb71cb12893e2542786671e8cb1f55c6a37a0c33a7705be159f`

## Static census

| SQL category | Count |
|---|---:|
| New EF-owned Pack B tables | 6 |
| Indexes | 40 |
| `ALTER TABLE` statements | 12 |
| Same-domain EF foreign keys | 15 |
| DML statements | 0 |
| `DROP` statements | 0 |
| `ON DELETE CASCADE` | 0 |
| PI-domain foreign keys | 0 |
| Legacy-table references | 0 |

The first five composite unique indexes are additive reference targets on existing Pack A EF tables; every tuple includes the existing primary-key `id`, so current data cannot collide. The remaining structures belong to the six Pack B families. Execution mode is constrained to `simulation`, provider provenance to `non_production_fake_provider`, and provisional outputs to `diagnostic_only`.
## Safety decision

The target has known unrelated historical datamodel drift. Apply must therefore use only the reviewed versioned SQL through `prisma migrate deploy`. `prisma migrate dev` and `prisma db push` are prohibited for this landing.
