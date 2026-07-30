# 03 Implementation Notes

## 2026-07-30 — Task creation and scope transfer

- Created T-134 as the independent owner of EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21.
- The latest user decision supersedes the older T-132 statement that these findings had to close inside T-132. Their transfer is explicit, so they no longer block T-132.
- Workstream order starts with EF-P14 because current bootstrap behavior can persist a null PaperProject binding; admission must remain default off until that boundary has relational evidence.
- EF-P06 owns the atomic typed promotion/canonicalization path; EF-P15 owns standalone attachment plus full revalidation; EF-P21 owns backend semantic retrieval with structured fallback.
- Desktop UI is excluded from all four workstreams. EF-P21 does not include screens, forms, renderer navigation or DOM/Electron tests.
- No code, configuration, schema, database or cloud state was changed while creating this package.

## Open implementation decisions

- Exact existing writer/routes to retain or close after the Phase 0 census.
- Whether any persisted invariant requires a Prisma schema change.
- Index implementation/profile for EF-P21, subject to deterministic document and fallback requirements.
- Whether legacy-null recovery is reject-only or includes a separately authorized explicit repair command.
