# 03 Implementation Notes

## Log
- 2026-05-05: Created child task package from T-030 readiness review to close the early-stage ownership gap for `CITATION_NORMALIZED` and `ABSTRACT_READY`.
- 2026-05-05: Closed DB boundary through Prisma SSOT with normalized `LiteratureCitationProfile` and `LiteratureAbstractProfile` tables.
- 2026-05-05: Implemented deterministic citation normalization service for DOI, arXiv ID, title, authors, year, source URL, dedup hash, completeness, reason codes, source refs, checksum, and confidence.
- 2026-05-05: Implemented trusted abstract resolver with priority order: collection metadata, parsed fulltext abstract section, user-entered abstract, trusted external metadata fields. Generated summaries are not produced or accepted as original abstracts.
- 2026-05-05: `CITATION_NORMALIZED` and `ABSTRACT_READY` now persist profile ids/checksums/provenance in run output refs and stage details.
- 2026-05-05: Metadata patch now marks affected stages `STALE` without creating content-processing runs.
- 2026-05-05: Post-implementation quality review tightened readiness semantics so `citation_complete` and `abstract_ready` require the explicit profile-backed stage to be `SUCCEEDED` or `STALE`; raw collection/display metadata no longer acts as a parallel processing-ready path.
- 2026-05-05: Collection upserts that touch existing literature now mark citation/abstract-dependent stages `STALE` without enqueueing runs.

## Resolved Decisions
- Citation reason codes are machine-readable strings in `incompleteReasonCodes`; first codes are `MISSING_TITLE`, `MISSING_AUTHORS`, `MISSING_YEAR`, and `MISSING_LOCATOR`.
- Abstract provenance moved into `LiteratureAbstractProfile`; `LiteratureRecord.abstractText` remains display/edit text.
- Trusted external metadata v1 uses already-collected source payload fields and does not introduce network lookup adapters.
- Citation normalization succeeds even when incomplete; completeness and reason codes drive downstream status/action detail.
