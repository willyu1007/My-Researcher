# Roadmap

## Objective
- Build a repeatable 5000-level literature scaleout workflow without overloading the full literature pipeline.

## Milestone 1 - Layered Counting Contract
- Define candidate, managed, effective, blocked, and excluded metrics.
- Update reporting so every status answer names the layer being counted.
- Preserve current adaptive corpus continuity for historical comparison.
- Include candidate staging metrics before B10 writes at scale.
- Lock the minimal two-table schema and ordinary lookup indexes before implementation.
- Prisma SSOT has been updated; the scoped local-dev migration has been applied and excludes unrelated live-DB drift.

## Milestone 2 - B10 Broad Discovery
- Build a metadata-first discovery runner.
- Target 500-800 candidates per run.
- Write candidate staging rows and lightweight batch summaries.
- Run lightweight obvious-duplicate checks before or during candidate staging.
- Use the simple six-status candidate lifecycle.
- Cover all three main directions and all four collection roles.
- Current status:
  - OpenAlex pilot apply wrote 60 candidate rows.
  - current candidate pool is 62 rows.
  - full 500-800 candidate run remains gated on B11 triage and provider/query expansion.

## Milestone 3 - B11 Automated Triage
- Score direction relevance, implementation usefulness, theory value, and source quality.
- Reuse existing `LiteratureRecord` deduplication at the promotion boundary.
- Reverse-mark duplicate candidates with matched candidate or literature links.
- Promote 200-300 candidates per run into managed pipeline corpus.
- Preserve rejected/deferred candidates for future citation expansion.
- Current status:
  - B11 entrypoint is implemented.
  - pilot triage evaluated 54 candidates.
  - pilot promote created 10 managed `LiteratureRecord` rows.
  - full 200-300 promotion run remains gated on B10 scaleout size and B12 throughput.

## Milestone 4 - B12 Core Promotion
- Select 80-120 high-value managed-corpus papers per run.
- Run rights-safe full literature pipeline only for selected papers.
- Record blockers separately from collection growth.
- Current status:
  - B12 standard-pipeline pilot runner is implemented.
  - B12 fulltext acquisition runner is implemented.
  - B12 content-backfill runner is implemented.
  - the 10 B11-promoted records have citation, abstract, raw fulltext, and fulltext preprocessing ready.
  - `LIT-0153`, `LIT-0154`, `LIT-0155`, `LIT-0156`, `LIT-0157`, `LIT-0158`, `LIT-0159`, `LIT-0160`, `LIT-0161`, and `LIT-0162` completed through `INDEXED`.
  - no non-blocked records from the initial 10-record B11 promote pilot remain in the key-content queue.
  - opportunity tranche2 promoted 4 additional serving records and completed `LIT-0164` and `LIT-0165` through `INDEXED`.
  - `LIT-0252` was cleared from OCR blocker by replacing the scanned source with a public title-matched PDF, then importing a source-grounded `codex_curated` dossier.
  - effective literature is now 157.
  - `LIT-0163`, `LIT-0166`, and `LIT-0257` were soft-excluded from the resource pool after source audit found no rights-safe automatically downloadable fulltext.
  - managed and effective literature are both now 157, with 0 managed-corpus blockers.
  - the next B12 expansion should select the next promoted tranche with stronger fulltext availability signals; source-access records require authenticated/user-provided fulltext before re-entering the resource pool.

## Milestone 5 - Iterative Scaleout
- Repeat B10-B12 by direction and role.
- Target:
  - candidate pool: 5000-8000.
  - managed pipeline corpus: 2000-2500.
  - effective literature: 800-1000.

## Recommended Next Step
- Continue opportunity-first B11/B12 with candidates that have arXiv or verified direct-PDF fulltext signals.
