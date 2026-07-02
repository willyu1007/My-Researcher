# 00 Overview

## Status
- State: done
- Archived: 2026-07-02
- Closure: B7 (16 records) and B8 (19 records) delivered with every acceptance criterion checked. Both declared follow-ups are closed as superseded: further high-precision source expansion continued via the `T-122 -> T-125 -> T-126` collection mainline (final 1540 retrieval-ready records after T-126 D56), and the B7/B8 judgment-card tail is retired — those records entered the managed corpus and passed T-122 B11 triage/promotion plus T-126 D56 semantic quality treatment, which replaced the T-116-era judgment-card mechanism for post-T-116 batches.
- Next step: none; see `dev-docs/archive/literature-rag-frontier-tech-radar/` for the corpus end state.

## Goal
- Return to the literature collection mainline.
- Use the standard literature pipeline to expand the adaptive LLM systems corpus around:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- Preserve the T-116 safety boundary: controlled metadata import and tags only; no fulltext/content-processing/evidence activation.

## Scope
- Search arXiv using direction-specific query groups.
- Deduplicate against existing `LiteratureRecord.arxivId`.
- Import a controlled subset through `/literature/collections/import`.
- Apply namespaced tags following the T-116 taxonomy.
- Produce batch report, import evidence, and safety counter deltas.

## Non-goals
- Do not run experiment-foundation promotion or RAGPerf S0/S1.
- Do not enqueue fulltext acquisition, key-content extraction, chunking, embedding, indexing, retrieval, or evidence activation.
- Do not bulk import thousands of records.
- Do not create new taxonomy schema or DB tables.

## Acceptance Criteria
- [x] B7 discovery/import script exists and passes syntax checks.
- [x] B8 OpenAlex discovery-pool script exists and passes syntax checks.
- [x] Controlled import report records query groups, candidates, duplicates, imported IDs, tags, and safety deltas.
- [x] Imported records cover all three agreed directions.
- [x] Content-processing related safety counters remain unchanged.
- [x] Governance sync/lint passes.

## B7 Import Summary
- Imported 16 new records: `LIT-0290` through `LIT-0305`.
- Direction coverage:
  - `direction:rag-aware-allocation`: 5.
  - `direction:llm-serving-resource-allocation`: 5.
  - `direction:test-time-compute-budgeting`: 6.
- Duplicate/existing records skipped:
  - `LIT-0220` Preble.
  - `LIT-0266` Grounded Cache Routing.
- Safety deltas:
  - `LiteratureRecord`: +16.
  - `LiteratureSource`: +16.
  - `LiteraturePipelineRun`: 0.
  - `LiteratureContentAsset`: 0.
  - `LiteratureContentProcessingBatchJob`: 0.
  - `LiteratureFulltextAcquisitionJob`: 0.

## B8 Import Summary
- Imported 19 new records: `LIT-0306` through `LIT-0324`.
- Direction coverage:
  - `direction:rag-aware-allocation`: 3.
  - `direction:llm-serving-resource-allocation`: 8.
  - `direction:test-time-compute-budgeting`: 8.
- Discovery and filtering:
  - OpenAlex works search produced 190 focused candidates after strict title/focus filtering.
  - Existing DB matches: 20.
  - Selected/imported: 19.
  - RAG-aware allocation was not force-filled to 8 because high-signal RAG serving/cache papers were already present from earlier batches.
- Safety deltas:
  - `LiteratureRecord`: +19.
  - `LiteratureSource`: +19.
  - `LiteraturePipelineRun`: 0.
  - `LiteratureContentAsset`: 0.
  - `LiteratureContentProcessingBatchJob`: 0.
  - `LiteratureFulltextAcquisitionJob`: 0.
