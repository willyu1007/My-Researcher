# 05 Pitfalls

## Do-not-repeat Summary
- Do not count T-068 bridge creation as proof of downstream PaperProject consumption.
- Do not treat legacy title-card promotion as equivalent to consuming v1c `PaperProjectBridge`.
- Do not mutate `PaperProjectBridge` while recording downstream feedback/recheck artifacts.
- Do not create PaperProject from bridge payload without checking `bridge_payload_hash`.
- Do not treat a bridge with only one downstream ref as idempotently consumed; both `paper_project_intake_ref` and `target_paper_project_ref` must be present.
- Do not let PaperProject intake fall back to evidence-unit refs when `selected_literature_evidence_ids` exist upstream.
- Do not route all recheck requests to a generic backlog; preserve loopback target and cause.
- Do not detect search refs with broad `includes("search")`; `research_slice` contains that substring and will be misrouted.

## Historical Lessons
- 2026-05-18 route Prisma smoke env preload:
  - Symptom: route integration test passed all non-DB v1c cases but failed the Prisma smoke with `DATABASE_URL is required`.
  - Root cause: the current shell did not preload `.env.local`; the test intentionally requires a real migrated DB for the Prisma-backed route path.
  - What was tried: reran the same route test after loading `.env.local` as the local environment SSOT.
  - Fix: with `.env.local` loaded, all 8 route tests passed including the Prisma smoke.
  - Prevention: run v1c route/Prisma smoke commands with `.env.local` preloaded when treating them as a DB-backed acceptance gate.
- 2026-05-18 research-slice/search misroute:
  - Symptom: targeted T-082 tests showed `stale_evidence` feedback selecting `research_slice` as the evidence/search affected ref, and risk-memory affected stages drifting away from the intended target.
  - Root cause: both downstream feedback and risk-memory stage routing used broad `includes("search")`, which matched the `research_slice` ref type.
  - What was tried: route and service tests were tightened to assert concrete affected ref types and persisted affected stages for every downstream loopback signal.
  - Fix: search-ref matching now requires a real search token boundary such as `search_`, `_search_`, or `_search`; `research_*` no longer matches.
  - Prevention: keep loopback target tests tied to affected ref type, not just the high-level target string.
- 2026-05-18 selected-literature carry-forward gap:
  - Symptom: PaperProject intake E2E carried an `evidence_unit_*` id instead of the package's `selected_literature_evidence_ids`.
  - Root cause: v1c gate dossier exposed selected evidence refs but did not preserve explicit selected literature evidence IDs into the promotion commitment scope.
  - Fix: promotion gate dossier and human commitment profile now carry `selected_literature_evidence_ids`; bridge intake prefers those IDs.
  - Prevention: bridge-to-PaperProject tests must assert the exact literature evidence basket, not just a non-empty evidence list.
