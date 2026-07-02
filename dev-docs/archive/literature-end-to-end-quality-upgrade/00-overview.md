# 00 Overview

## Status
- State: done
- Archived: 2026-07-02
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Related: `T-011 literature-management-flow`, `T-029 literature-collection-content-processing-boundary`, `T-037 literature-backfill-operations-workbench`, `T-040 literature-content-processing-closure-fixes`
- Closure: all roadmap milestones (0-9) and all acceptance criteria below are complete. The formerly-declared "Evidence Activation semantic cleanup / centralized consumption gates / next commit set" step was overtaken by events — it landed in commit `0745d9b6` (2026-05-14) with `LiteratureEvidenceActivationService` as the single consumption-gate owner, and everything is committed.
- Follow-on lineage: corpus operations continued in T-116/T-117/T-118/T-119/T-120 and closed via `T-122 -> T-125 -> T-126` (final downstream-ready corpus: 1540 retrieval-ready records after T-126 D56); retrieval storage moved to pgvector in T-121. The evaluator harness (`.ai/scripts/literature-e2e-v2-runner.mjs` + cutover-gate/ops/report-audit siblings) remains active; its default fixture was relocated to `.ai/scripts/fixtures/t041-evaluator-v2-fixtures.json` at archive time.
- Next step: none in this package. Note the recorded evaluator metric baseline (recall@5 1.0 / MRR@5 0.9347 / nDCG@5 0.9511, 2026-05-11) predates the pgvector cutover and the 1540-record corpus; a re-baseline on the current stack should be a new task.

## Goal
- Upgrade the literature module from "functionally complete" to "reliable full-chain operation" across web discovery, metadata import, fulltext acquisition, parsing, semantic extraction, chunking, embedding, indexing, retrieval, stale handling, backfill, and cutover verification.
- Turn the current manual E2E evidence into repeatable local and temporary-Postgres E2E suites with quality gates.
- Harden the weakest links found during real-flow testing: source rate limits, quality scoring, URL download safety, PDF discovery, batch reliability, observability, and retrieval quality measurement.

## Current Baseline
- Collection and content-processing are separated at public boundaries.
- Auto-pull can query Crossref/arXiv/Zotero through rule runs.
- Content assets support local-path registration and now URL download into local raw-file storage.
- GROBID-backed PDF preprocessing works when a local GROBID service is running.
- Explicit content-processing runs can reach `INDEXED` and retrieval with OpenAI embeddings.
- Backfill and cleanup dry-runs exist and protect active versions/raw assets.

## Quality Assessment Baseline
- Strong:
  - citation/abstract readiness, explicit stage ordering, local asset registration, stage state visibility, retrieval against active embedding versions.
- Adequate:
  - GROBID PDF preprocessing, key-content/chunk/embedding/index implementation, backfill dry-runs.
- Weak:
  - arXiv rate-limit handling, real quality scorer setup, fulltext URL discovery, synchronous remote download robustness, SSRF/redirect controls, large-batch E2E, retrieval relevance metrics, production run observability.

## Non-goals
- Do not merge collection and content-processing semantics.
- Do not replace the seven-stage content-processing model.
- Do not make OpenAI Vector Store the primary retrieval SSOT.
- Do not auto-start Docker/GROBID from backend business logic.
- Do not implement broad cloud sync or multi-user permissions in this task.
- Do not ship destructive cleanup automation without dry-run and active-version protection.

## Scope
- Web discovery and import reliability.
- Remote fulltext acquisition and URL/PDF resolver quality.
- Download security and rights-aware asset registration.
- GROBID/parser/OCR readiness policy.
- Key-content extraction quality and provenance gates.
- Chunk/embedding/index/retrieve quality evaluation.
- Batch backfill reliability, cost/rate controls, and observability.
- Local E2E and temporary Postgres E2E harnesses.

## Acceptance Criteria
- [x] Roadmap is aligned with explicit milestone gates.
- [x] Local E2E harness can run from discovery/import through retrieval using real dependencies where configured.
- [x] Temporary Postgres E2E suite can run without contaminating default schemas.
- [x] Source rate limits are handled with retry/backoff and source-specific pacing.
- [x] Remote download has SSRF/redirect/size/type safety gates and repeatable tests.
- [x] Fulltext acquisition can resolve arXiv PDF URLs and has a documented DOI/fulltext strategy.
- [x] Real quality scorer and real OpenAI content-processing paths are tested separately from mocks.
- [x] Retrieval quality is measured with a seeded evaluation set and pass/fail thresholds.
- [x] Backfill/cutover verification covers multi-literature batches, stale states, partial failures, and cleanup protection for the current arXiv OA evaluator scope.
- [x] Evaluator-v2 fixture, report audit, and mode-specific cutover gate exist so current-scope evidence and broad-cutover evidence cannot be conflated.
- [x] Evaluator runner can emit stratified query evidence, source-group coverage, expected blocker results, stage timings, and embedding/query cost telemetry.
- [x] Evaluator-v2 smoke covers explicit PDF, parser-edge/OCR blocker, rights-gated blocker, negative retrieval, and processable-vs-blocked cutover denominators.
- [x] Broad cutover evidence includes DOI/Unpaywall/parser-edge samples in a full real run.
- [x] Consecutive full real runs pass broad-cutover gate, and fixture semantic overlap discovered during reliability testing has been corrected.
- [x] DOI/Unpaywall coverage is expanded to 5 real OA DOI samples, blind retrieval queries are included, and raw PDF files are stored under `/Volumes/DataDisk/Paper/Auto/<run-id>` during local E2E.
- [x] Low-risk dedup hardening exposes canonical work keys, refreshes derived identity keys on source merges, and deduplicates retrieval hits by work before `top_k`.
- [x] Duplicate-stress E2E verifies DOI/title-author-year/arXiv import merges and suppresses a historical split clone from retrieval top5.
- [x] Structured duplicate/cluster candidates persist PDF checksum, normalized-text checksum, title-author-year, and conservative fuzzy evidence without auto-confirming merges.
- [x] Confirmed same-work clusters are consumed by retrieval work grouping while unconfirmed candidate clusters remain inert.
- [x] Optimization points 2-6 have backend-first implementations: non-destructive PDF checksum coalescing metadata, embedding-similarity related-topic candidates, expanded retrieval evaluator metrics, unchanged-chunk embedding reuse/query embedding cache, and stronger GROBID extraction diagnostics.
- [x] Batch 1 parser-quality diagnostics are emitted by GROBID success paths and summarized by evaluator reports/audits without changing parser success semantics.
- [x] Batch 2 retrieval robustness adds exact-phrase lexical scoring, metadata term scoring, and evidence-level score explanations while preserving active-version and stale-index behavior.
- [x] Batch 3 acquisition/storage observability adds fulltext source-health summaries and local raw-PDF manifest/retention audit without destructive cleanup.
- [x] Batch 4 cluster consumption/review adds explicit review outcomes, inert candidate semantics, same-work-only retrieval dedup, and a desktop operator review surface.
- [x] Batch 5 cutover operations now have a preflight/cutover/rollback evidence script that checks consecutive E2E reports, report audits, CI/mock evidence, recall/MRR/nDCG, blind retrieval quality, and duplicate-work retrieval guards.
- [x] Auto-pull source fetches now reuse the shared source runtime state and acquisition source throttle settings for Crossref, arXiv, and Zotero pacing/cooldown.
- [x] Raw PDF lifecycle management has a non-destructive dry-run/apply quarantine workflow for stale duplicate PDFs with active-manifest protection.
- [x] Retrieval evaluator v2 requires blind query coverage and expands blind/adversarial DOI/Unpaywall and explicit-PDF queries.
- [x] Evidence Activation separates collected/topic-related/evidence-active literature, and retrieval/backfill/fulltext worksets no longer treat `scope_status=in_scope` as a consumption gate.
