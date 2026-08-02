# 03 Implementation Notes

## 2026-07-30 — Task creation and scope transfer

- Created T-134 as the independent owner of EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21.
- The latest user decision supersedes the older T-132 statement that these findings had to close inside T-132. Their transfer is explicit, so they no longer block T-132.
- Workstream order starts with EF-P14 because current bootstrap behavior can persist a null PaperProject binding; admission must remain default off until that boundary has relational evidence.
- EF-P06 owns the atomic typed promotion/canonicalization path; EF-P15 owns standalone attachment plus full revalidation; EF-P21 owns backend semantic retrieval with structured fallback.
- Desktop UI is excluded from all four workstreams. EF-P21 does not include screens, forms, renderer navigation or DOM/Electron tests.
- No code, configuration, schema, database or cloud state was changed while creating this package.

## Open implementation decisions

- EF-P15 source model remains open and blocks Phase 3 only. Recommended choice: attach a typed exploration specification, then execute a new PI-bound Run; do not trust-reuse prior output.
- Exact embedding provider/profile and vector dimension for EF-P21 remain a Phase 4 implementation detail, but storage ownership and structured-first filtering are frozen.

## 2026-08-02 — Phase 0 census and implementation freeze

- Completed the shared contract, HTTP, service, repository, Prisma, capability and test census without product/schema/data/runtime effects.
- Froze EF-P14 to a service/repository entrance guard using the existing paired bridge refs and existing atomic bootstrap transaction; no schema migration is planned.
- Froze legacy-null behavior to `LEGACY_RECORD_NOT_ELIGIBLE` reject-only. No named-local census, backfill or repair was run.
- Confirmed the legacy EF promotion route remains closed after v2 cutover and that typed v2 has canonical assets/materialization but no preparation Candidate/promotion aggregate. EF-P06 therefore requires a new additive typed UoW and default-off entrance.
- Confirmed all current typed v2 scientific results are already PI-bound. This invalidates the original assumption that an eligible typed standalone output already exists and creates a mandatory Phase 3 architecture decision.
- Confirmed PI structured lineage already filters by project in repository queries and that the only native vector table is literature-owned. EF-P21 must own a separate rebuildable projection and rank only pre-authorized candidates.
- Recorded the complete modification allowlist, prohibited surface, named verification matrix and rollback table in `06-phase0-census-and-freeze.md`.
