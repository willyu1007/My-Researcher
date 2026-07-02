# 01 Plan

## Phase 1 - Alignment And Test Matrix
- Status: completed. Deterministic mock coverage and repeatable local/temporary-Postgres E2E modes are in place.
- Confirm roadmap scope and milestone order.
- Convert the quality baseline into a test matrix:
  - source discovery
  - metadata import
  - fulltext acquisition
  - content processing stages
  - retrieve
  - stale/backfill/cleanup
- Decide which real external dependencies are allowed in CI-like local runs.

## Phase 2 - Source And Scorer Hardening
- Status: completed for the T-041 scope. Acquisition settings carry source throttles and scorer profiles; Crossref, arXiv, Zotero, Unpaywall, explicit URL, and download runtime state share cooldown/health semantics.
- Add source-specific rate/backoff behavior.
- Improve run summaries and alert taxonomy for fetch/import/scoring boundaries.
- Implement or integrate a real scorer profile with deterministic fallback behavior.
- Add unit and route tests for source/scorer failures.

## Phase 3 - Fulltext Acquisition Hardening
- Status: foundation implemented. Durable fulltext acquisition APIs, Prisma persistence, arXiv/Unpaywall/explicit URL planning, and download safety tests are in place.
- Extend URL resolver and download safety.
- Add SSRF/redirect/size/mime/timeout tests.
- Add asset acquisition diagnostics and UI-visible status.
- Decide whether batch downloads are synchronous or durable jobs.

## Phase 4 - Parser And Extraction Quality Gates
- Status: completed for v1. GROBID health/OCR blockers, parser-quality diagnostics, key-content provenance, and real E2E parser/extraction evidence are covered.
- Harden GROBID health/version diagnostics.
- Add parser failure fixtures.
- Add key-content evaluator and real OpenAI smoke path.
- Preserve user edits through extraction reruns.

## Phase 5 - Retrieval Evaluation
- Status: completed. Retrieval evaluation covers stale isolation, seeded and blind queries, recall/MRR/nDCG, degraded-mode evidence, and duplicate-work guards.
- Create seeded retrieval evaluation set.
- Add evaluator script and thresholds.
- Tune retrieve profiles without changing the physical index split.
- Record relevance, provenance, and degraded-mode evidence.

## Phase 6 - Temporary Postgres Batch E2E
- Status: completed. Lightweight and full E2E modes run against temporary schemas and record reports under `.ai/.tmp/literature-e2e/`.
- Create a temporary schema test harness.
- Run batch ingestion/download/process/index/retrieve.
- Cover stale propagation, retry, partial failure, and cleanup dry-run.
- Record artifacts under `04-verification.md`.

## Phase 7 - Desktop And Operator UX
- Status: partially completed. Cluster-review and operator diagnostics are surfaced; Evidence Activation review UI remains a follow-on task.
- Surface missing prerequisites and recovery actions.
- Surface acquisition/download/parser/scorer status.
- Keep UI changes on the data-ui/token path; do not extend frozen legacy CSS.

## Phase 8 - Cutover Review
- Status: completed for broad-cutover evidence gates; default cutover remains an explicit operation artifact rather than an implicit code path.
- Run final verification suite.
- Update OpenAPI/API index/context.
- Split remaining non-blocking work into explicit follow-on tasks.
- Mark this task complete only after the roadmap's release gate passes.

## Post-Cutover-Readiness Optimization Batches

### Batch 1 - Quality Gates And Diagnostics
- Status: completed.
- Add parser-quality scoring to GROBID success diagnostics and evaluator reports.
- Make report audit flag low parser-quality rows separately from parser hard failures.
- Keep this batch additive: no schema migration and no change to parser success/failure semantics.

### Batch 2 - Retrieval Robustness
- Status: completed for backend scoring/explanation baseline.
- Add hybrid retrieval signals for lexical/BM25-style exact term support alongside embeddings.
- Add optional rerank/score explanations after the baseline remains stable.
- Keep stale/index-version isolation intact and make active-version lineage easier to inspect.

### Batch 3 - Acquisition Reliability And Storage Operations
- Status: completed for backend/API/evaluator observability baseline.
- Add provider health summaries for arXiv, Crossref, Unpaywall, and explicit PDF downloads.
- Add raw-PDF manifest/retention checks under `/Volumes/DataDisk/Paper/Auto`.
- Keep storage coalescing non-destructive until review/retention policy is explicit.

### Batch 4 - Cluster Consumption And Review
- Status: completed for additive backend contract, validation, retrieval consumption semantics, and desktop operator review baseline.
- Add an operator-consumable review surface for candidate same-work and related-topic clusters.
- Keep candidate clusters inert until confirmed; confirmed same-work clusters remain the only retrieval dedup signal.
- Add structured review outcomes so future clustering work cannot drift into implicit merges.

### Batch 5 - Cutover Operations
- Status: completed for local operational tooling and evidence gates. Full E2E evidence and cutover preflight artifacts are recorded in `04-verification.md`.
- Add a preflight/cutover/rollback playbook and automate evidence checks around the existing cutover gate.
- Keep lightweight, smoke, duplicate-stress, and full E2E modes explicitly separated.
- Treat broad cutover as blocked unless consecutive full real E2E and CI mock suites both pass.
- Gate retrieval quality on recall@5, MRR@5, nDCG@5, blind recall@5, degraded retrieval count, and duplicate-work top5 count.
- Require explicit `--confirm <latest-run-id>` plus CI/mock evidence for cutover operation artifacts.

### Batch 6 - Auto-Pull Source Pacing
- Status: completed for Crossref, arXiv, and Zotero fetch surfaces.
- Reuse `/settings/literature-acquisition.source_throttle` for collection-source request pacing.
- Reuse `LiteratureSourceRuntimeState` for source cooldown and request/success/failure health instead of creating a second auto-pull runtime table.
- Keep invalid source config and auth-style 4xx failures non-retryable; only rate-limit/unreachable source failures enter cooldown.

### Batch 7 - Raw PDF Lifecycle
- Status: completed for non-destructive local storage workflow.
- Add a raw PDF lifecycle script with dry-run/apply modes.
- Protect active-manifest paths from quarantine.
- Only quarantine stale duplicate PDFs when another checksum-identical retained copy exists; stale single-copy PDFs remain review-only.

### Batch 8 - Retrieval Generalization Fixture Expansion
- Status: completed for fixture/audit/gate expansion.
- Require `blind` query-set coverage in the evaluator-v2 fixture.
- Add additional blind/paraphrase/adversarial queries for DOI/Unpaywall and explicit-PDF samples.
- Keep formal broad cutover blocked when fixture query coverage or blind recall is incomplete.

## Initial Acceptance Gates
- Gate A: roadmap accepted.
- Gate B: local E2E harness accepted.
- Gate C: source/scorer/download hardening accepted.
- Gate D: real PDF + real OpenAI processing accepted.
- Gate E: temporary Postgres batch E2E accepted.
- Gate F: release/cutover evidence accepted.
