# Pack A implementation-start source population lock

## Snapshot

- Recorded: 2026-07-13
- Git HEAD: `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- Readiness population digest: `ea9673af733a6216342c0e42e6056c6d80232b2b0f00974a70639ef6c2d0f976`
- Expanded integration population digest: `3e9fa09d1fdf8cba60402a94c2391a9abd4962887877a13633acb1ee47b4711d`
- Pre-edit `git diff --check`: passed

The readiness digest was recomputed with the original locked population and matched exactly. The expanded digest additionally includes the shared barrel/package export integration points accepted at implementation authorization.

## Expanded deterministic population

The expanded digest is the SHA-256 of the `sha256sum` output, in this exact order:

```text
prisma/schema.prisma
env/contract.yaml
packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts
packages/shared/src/research-lifecycle/paper-implementation-workorder-contracts.ts
packages/shared/src/research-lifecycle/index.ts
packages/shared/package.json
apps/backend/src/app.ts
apps/backend/src/routes/experiment-foundation-routes.ts
apps/backend/src/routes/experiment-foundation-execution-routes.ts
apps/backend/src/routes/paper-implementation-routes.ts
apps/backend/src/controllers/experiment-foundation-controller.ts
apps/backend/src/controllers/experiment-foundation-execution-controller.ts
apps/backend/src/controllers/paper-implementation-controller.ts
apps/backend/src/services/experiment-foundation-service.ts
apps/backend/src/services/experiment-foundation-execution-service.ts
apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts
apps/backend/src/repositories/experiment-foundation.repository.ts
apps/backend/src/repositories/experiment-foundation-execution.repository.ts
apps/backend/src/repositories/paper-implementation-workorder.repository.ts
apps/backend/src/repositories/prisma/prisma-experiment-foundation-repository.ts
apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-repository.ts
apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts
prisma/migrations/20260518090000_add_experiment_foundation_core/migration.sql
prisma/migrations/20260518130000_add_experiment_foundation_external_training_jobs/migration.sql
prisma/migrations/20260521180000_add_paper_implementation_workorder_experiment_bridge/migration.sql
```

Equivalent verification:

```bash
sha256sum <the ordered paths above> | sha256sum
```

The four readiness anchor hashes before implementation were:

- `prisma/schema.prisma`: `01683681554fa9d9960466f82794c2f84685b15bc880f250f3175cc4e28263b0`
- `env/contract.yaml`: `df10ac5a9b4f838ca7c208504fc70074456f7f7208e22dcec5edffad59de0ef9`
- legacy EF contract: `b77b57cb8d59341b96d19516f64e44120699d918b179ed571437ac1c3be7788b`
- legacy PI WorkOrder contract: `24b61817dd038ac0e1b74d590fa0b33f391d3444cb09b63950327ded5890eb8d`

No existing local/dev/staging/prod database was queried or changed while recording this source lock.
