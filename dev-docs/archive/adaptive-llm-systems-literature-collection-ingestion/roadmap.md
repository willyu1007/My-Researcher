# Adaptive LLM Systems Literature Collection And Ingestion - Roadmap

## Decision
- New task package: `adaptive-llm-systems-literature-collection-ingestion`
- Initial mapping: `M-000 > F-000` until the project hub gains a dedicated literature-corpus / research-corpus requirement.
- Related tasks:
  - `T-041 literature-end-to-end-quality-upgrade`
  - `T-043 experiment-foundation-v1`
  - `T-106 experiment-foundation-real-interaction-hardening`
  - `T-091 paper-implementation-full-landing`
- Primary objective: execute the current literature collection round around adaptive LLM systems, tag the imported corpus with a stable four-layer taxonomy, and produce a seed catalog suitable for later experiment-foundation and PaperImplementation consumption.

## Research Scope Decision
- Main axis: `large-model systems optimization + adaptive resource allocation`.
- Four collection layers:
  - Core: `RAG-aware resource allocation / adaptive retrieval-compute allocation`.
  - System support: `LLM Serving scheduling and resource allocation`.
  - Strategy support: `Test-time Compute Budgeting`.
  - Theory support: mathematical, algorithmic, spatial, measure, and algebraic foundations.
- The task is a collection and ingestion task, not a content-processing rewrite.

## Why This Is A Separate Task
- `T-041` hardens the literature pipeline, but does not own a new research corpus expansion campaign.
- This work spans collection taxonomy, query planning, source runs, manual/LLM-assisted triage, tags, import evidence, and corpus readiness decisions.
- The output must preserve context for multiple sessions and must remain auditable when later used by topic selection, experiment foundation, and paper implementation workflows.

## Roadmap Principles
- Treat collection as metadata/source acquisition plus coarse triage; do not auto-run expensive content-processing stages from collection.
- Use the existing `LiteratureRecord.tags` field for namespaced taxonomy before adding any structured taxonomy tables.
- Prioritize papers that can become experiment-foundation assets, baselines, workloads, metrics, or PaperImplementation candidates.
- Keep theory collection small and mapped: every theory item needs a concrete relation to retrieval, context, inference, cache, scheduling, stopping, or quality/cost/latency tradeoff.
- Prefer primary scholarly sources and official paper pages; use secondary sources only for discovery or code/benchmark confirmation.

## Milestone 1 - Taxonomy And Seed Catalog
- Define the four-layer taxonomy and namespaced tag vocabulary.
- Create the seed catalog for the agreed directions:
  - Core: RAG-aware adaptive retrieval-compute allocation.
  - System support: LLM serving scheduling and resource allocation.
  - Strategy support: test-time compute budgeting.
  - Theory support: queueing, online optimization, bandit, MDP/optimal stopping, constrained optimization, measure/OT/information theory, metric/high-dimensional geometry, group/field/algebraic chunking.
- Output:
  - seed paper list with source links.
  - tag vocabulary.
  - screening rubric.

## Milestone 2 - Query Catalog And Source Strategy
- Build query catalogs for arXiv, Crossref, OpenReview, ACL Anthology, ACM/USENIX/IEEE, Semantic Scholar-style citation expansion, and Zotero/manual import where appropriate.
- Define time policy:
  - pre-2023: only classic, foundational, or frequently cited anchors.
  - 2023-2024: system and modern-RAG transition papers.
  - 2025-2026: main collection target for the core direction.
- Output:
  - query catalog by layer and subcluster.
  - source strategy and inclusion/exclusion rules.

## Milestone 3 - Collection Runs And Ingestion
- Run controlled collection/import batches.
- Attach coarse namespaced tags during import whenever the source query or seed catalog makes the classification clear.
- Preserve provenance through existing literature source records.
- Avoid automatic fulltext acquisition, extraction, embedding, or indexing unless explicitly requested as a later processing phase.
- Output:
  - import batch report.
  - duplicate/merge observations.
  - top-tag and layer distribution summary.

## Milestone 4 - Triage And Lightweight Judgment Cards
- Only P0/P1 items need full lightweight judgment cards in this task.
- Judgment card fields:
  - `why_relevant`
  - `resource_variable`
  - `decision_variable`
  - `quality_metric`
  - `system_metric`
  - `benchmark_or_dataset`
  - `code_available`
  - `experiment_foundation_fit`
  - `paper_implementation_fit`
- Output:
  - P0/P1 triage table.
  - low-confidence classification queue.
  - candidates for later content processing and fulltext acquisition.

## Milestone 5 - Corpus Readiness Review
- Review whether the imported corpus covers the four collection layers and the three main directions.
- Identify gaps before any large-scale expansion.
- Decide whether a follow-up task is needed for:
  - automated literature classifier,
  - structured taxonomy tables,
  - large-scale fulltext acquisition,
  - experiment-foundation asset candidate promotion,
  - PaperImplementation candidate selection.

## Completion Signal
- The task is complete when the current collection round has a documented taxonomy, seed catalog, query catalog, import evidence, tag distribution, and P0/P1 triage cards, with remaining gaps split into explicit follow-up work.
