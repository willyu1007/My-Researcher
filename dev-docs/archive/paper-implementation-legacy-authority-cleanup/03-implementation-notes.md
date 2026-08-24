# Implementation Notes

## 2026-06-01 - Task Start
- Created T-113 to execute the previously planned `research-argument` decommission from PaperImplementation follow-up lists.
- Initial scope is decommission, not compatibility maintenance: do not keep a wrapper or alias that can be mistaken for a second writing-readiness authority.

## 2026-06-01 - Cleanup Landing
- Removed shared public exports and aggregate barrel aliases for the retired control plane, including the former writing-entry packet bridge alias.
- Deleted backend service, repository, mapper, runtime helper, and unit-test files tied only to the retired authority lane.
- Removed `ResearchArgument*` models from Prisma SSOT and added a drop-table migration SQL preview without applying destructive DB writes to a live database.
- Refreshed `docs/context/db/schema.json`, removed current glossary/registry/architecture context entries, and updated project overview docs so forward authority points to `PaperImplementation`.
- Archived the prior active legacy task bundles and marked R-011 as cut so governance cannot treat that lane as forward work.
- Updated active PaperImplementation and experiment-foundation task notes that still described legacy/transition or wrapper paths; current wording permits archived history and negative guards only.
- Kept PaperImplementation negative guard tests that search for retired authority refs; those strings are intentional verification, not runtime or public contract surface.
