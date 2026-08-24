# 05 Pitfalls

## Do Not Repeat
- Do not change Prisma before contracts are reviewed.
- Do not store raw data or large artifacts in DB blobs.
- Do not expose adapter-private metadata through public DTOs.
- Do not rely only on `additionalProperties: false` for high-risk wrapper aliases; Fastify/Ajv configurations may strip unknown fields before handlers. Add explicit forbidden properties for alias drift.
- Do not set a fake `DATABASE_URL` when running the full backend suite unless the target database is intentionally reachable and migrated; existing Prisma smoke tests will fail against dummy URLs.
- Do not let promotion request/result refs identify only by candidate id. Ref type and candidate family must also match the stored candidate record.
- Do not persist promotion request/result/candidate status as independent service writes; keep them inside the repository transaction boundary.

## 2026-05-18 - Wrapper Alias Drift
- Symptom: a negative shared schema test expected `canonical_payload` to be rejected on a stored registry record, but Fastify validation returned 200.
- Root cause: unknown-field rejection can be hidden by route-level Ajv behavior that strips additional fields.
- Fix: added explicit forbidden wrapper alias fields (`canonical_payload`, `domain_payload`, `dto`) to the create and stored record schemas.
- Prevention: high-risk API wrapper drift fields should be modeled as forbidden properties, not only as unknown additional fields.

## 2026-05-18 - Full Backend Suite Requires Live DB
- Symptom: `pnpm --filter @paper-engineering-assistant/backend test` failed on T-054/T-067 Prisma HTTP smoke tests both with no `DATABASE_URL` and with a dummy unreachable URL.
- Root cause: those pre-existing tests intentionally require a reachable Postgres database with repo migrations applied.
- Fix/workaround: verified T-076 through targeted backend tests and typecheck; did not apply the new migration to a live DB because this task explicitly owns repo migration generation only.
- Prevention: record full-suite DB smoke limitations separately from T-076-specific verification unless a migrated dev DB is intentionally provisioned.

## 2026-05-18 - Promotion Persistence Atomicity
- Symptom: post-review found promotion persistence could create request/result records and update candidate status in separate service calls.
- Root cause: the initial minimum slice reused generic record writes rather than making promotion a single state transition.
- Fix: added `recordPromotionDecision` to the repository contract, with Prisma `$transaction` and in-memory rollback behavior.
- Prevention: future promotion lifecycle changes should be expressed as atomic repository operations, not as service-level write sequences.
