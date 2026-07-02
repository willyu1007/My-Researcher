# 01 Plan

## Phase 1 - Task Package And Governance
- Status: completed.
- Create T-119 task bundle.
- Map the task to the literature/research lifecycle governance track.

## Phase 2 - B7 Frontier Discovery
- Status: completed.
- Query arXiv with direction-specific search groups.
- Rank recent candidates by query fit, recency, and title/abstract signals.
- Exclude existing DB arXiv IDs.
- Note: arXiv API search returned `429`; this batch used the standard exact-id sequential fallback after targeted web/arXiv search.

## Phase 3 - Controlled Metadata Import
- Status: completed.
- Import a bounded subset through `/literature/collections/import`.
- Apply standard namespaced tags:
  - `collection:*`
  - `direction:*`
  - `batch:b7-frontier-three-direction-expansion`
  - query tags
  - priority/classification tags.
- Record safety counters before/after.
- Result: 16 new literature records and 16 new source records; no content-processing side effects.

## Phase 4 - Readiness Update
- Status: completed.
- Write a compact import batch summary.
- Verify no content-processing side effects.
- Identify remaining gaps and next batch candidates.

## Phase 5 - B8 OpenAlex Discovery-Pool Scaleout
- Status: completed.
- Query OpenAlex works search with direction-specific discovery groups.
- Apply high-precision direction gates:
  - title/focus gates for RAG-aware allocation to avoid generic application papers.
  - title deduplication for venue/preprint variants.
  - review/source exclusions for broad surveys, thesis proposals, and weak source routes.
  - arXiv ID recovery from `10.48550/arxiv.*` DOI and known high-confidence title overrides.
- Result: 190 focused candidates, 20 existing DB matches, 19 controlled imports.

## Phase 6 - B8 Import Verification And Documentation
- Status: completed.
- Import selected records through `/literature/collections/import`.
- Spot-check DB records for batch tags, collection/direction/priority tags, authors, abstracts, and source rows.
- Record safety counter deltas and update this task package.

## Acceptance Gates
- Gate A: script syntax and dry-run candidate report. Status: passed.
- Gate B: controlled import with no content-processing side effects. Status: passed.
- Gate C: documentation and governance lint. Status: passed.
- Gate D: B8 high-precision filtering and DB spot-check. Status: passed.
