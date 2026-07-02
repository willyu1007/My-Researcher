# 全链路质量升级 Roadmap

## Objective
- Make the literature workflow dependable enough for repeated local E2E, batch backfill, and eventual production cutover.
- The target chain is:
  `web discovery -> metadata import/dedup -> topic scope -> fulltext URL resolution -> download/register raw asset -> citation -> abstract -> fulltext preprocessing -> key content -> chunk -> embedding -> index -> retrieve -> stale/backfill/cleanup`.

## Roadmap Principles
- Treat collection as metadata/source acquisition only; never auto-run expensive content stages from collection.
- Treat content-processing as explicit, observable, resumable work.
- Prefer deterministic validation before LLM/OCR/provider calls.
- Every external dependency must have:
  - health/status detection
  - source-specific error mapping
  - retry/backoff policy
  - isolated tests that do not require real credentials
  - one real-dependency smoke path for E2E
- Safety and provenance outrank convenience for downloaded fulltext.

## Milestone 0 - Baseline Inventory And Harness Design
- Inventory current implementation and tests for:
  - auto-pull source behavior
  - quality scorer configuration
  - URL download endpoint
  - GROBID parser path
  - OpenAI extraction/embedding settings
  - storage roots
  - temporary Postgres setup
  - backfill/cleanup operations
- Define E2E test data tiers:
  - synthetic deterministic fixtures
  - real Crossref metadata
  - real arXiv PDF fulltext
  - real OpenAI embedding/extraction smoke
  - temporary Postgres batch suite
- Output:
  - `E2E_RUNBOOK.md` or equivalent follow-on docs
  - pass/fail matrix for each chain segment

## Milestone 1 - Web Discovery Reliability
- Add source-specific pacing and retry policy.
  - arXiv: respect rate limits, add User-Agent/contact policy, exponential backoff, and cooldown after 429.
  - Crossref: tolerate incomplete records, improve query specificity, track partial import quality.
  - Zotero: keep auth/config failures explicit and avoid secret leakage.
- Separate source fetch success from import success in run summaries.
- Add source health diagnostics for configured sources.
- Acceptance:
  - arXiv 429 produces retryable/cooldown state, not only terminal failure.
  - Crossref partial results report incomplete/duplicate/signal filters accurately.
  - Auto-pull run summaries identify fetched, eligible, imported, rejected, duplicate, rate-limited, and retried counts.

## Milestone 2 - Quality Scoring And Selection
- Replace ad hoc/mock scorer assumptions with a configured real scorer profile.
- Decide scorer implementation:
  - local scorer endpoint backed by OpenAI
  - direct OpenAI scoring service inside backend
  - hybrid deterministic prefilter + LLM scorer
- Define scorer output schema, timeout, retry, cost/budget controls, and fallback policy.
- Acceptance:
  - tests cover scorer unavailable, malformed score, low score, high score, and retryable provider errors.
  - one real scorer smoke run imports relevant literature with recorded score provenance.

## Milestone 3 - Fulltext URL Resolution And Download Hardening
- Upgrade `content-assets/download` from "download the provided URL" to a safer acquisition layer.
- Add URL resolver policy:
  - arXiv abs URL -> PDF URL
  - direct PDF URL -> download
  - DOI/source landing page -> explicit resolver strategy, not blind scraping by default
  - optional future resolver providers such as Unpaywall/Semantic Scholar/OpenAlex behind config
- Add safety gates:
  - block non-http(s), localhost, private IPs, link-local, metadata IPs, and unsafe redirects
  - enforce redirect limit, byte limit, content-type allowlist, timeout, checksum, and filename sanitization
  - record final URL, redirect chain, source URL, checksum, byte size, mime type, and resolver method
- Decide sync vs async:
  - sync remains acceptable for small manual downloads
  - batch/auto acquisition SHOULD use durable jobs with progress and cancellation
- Acceptance:
  - SSRF tests cover blocked private/local URLs and redirect-to-private.
  - real arXiv PDF download succeeds and registers a raw asset.
  - oversized/empty/unsupported content returns stable 4xx/5xx errors.

## Milestone 4 - Parser And OCR Readiness
- Harden GROBID operation:
  - health preflight
  - version visibility
  - timeout/retry policy
  - parser diagnostics persisted in stage detail
  - clear instructions for Docker/local service setup
- Define scanned PDF/OCR policy:
  - current blocker remains valid
  - decide whether OCR is in-scope for this upgrade or a child task
- Acceptance:
  - text/Markdown, normal PDF, scanned/no-text PDF, missing GROBID, and parser failure are all covered.
  - parser outputs include section/paragraph/anchor counts and artifact refs.

## Milestone 5 - Semantic Extraction Quality
- Define key-content quality gates:
  - required categories
  - source ref resolution
  - confidence/evidence strength expectations
  - partial-ready vs failed behavior
  - user override preservation
- Add a small evaluator for semantic dossier outputs.
- Ensure extraction prompts/schema are versioned and provider settings are visible.
- Acceptance:
  - real OpenAI extraction smoke passes on at least one real PDF.
  - malformed output and unresolved source refs are rejected deterministically.
  - user-edited fields survive reruns.

## Milestone 6 - Chunk, Embedding, Index, Retrieve Quality
- Build a retrieval evaluation set:
  - 5-20 real papers
  - 20-50 benchmark queries
  - expected relevant literature/chunks
  - expected provenance requirements
- Measure:
  - recall@k by literature
  - evidence chunk hit rate
  - provenance completeness
  - stale/degraded warning correctness
  - latency/cost envelope
- Strengthen retrieve profiles:
  - `general`
  - `topic_exploration`
  - `paper_management`
  - `writing_evidence`
- Acceptance:
  - retrieval evaluator has repeatable pass/fail thresholds.
  - active embedding profile consistency is enforced.
  - degraded retrieve behavior is tested when provider is unavailable.

## Milestone 7 - Batch Backfill And Operations
- Run temporary-Postgres batch E2E:
  - schema-scoped database
  - configurable storage roots
  - GROBID Docker service
  - real OpenAI key when available
  - 5-20 literature records
- Harden durable job operations:
  - dry-run estimates
  - pause/resume/cancel
  - retry failed stages
  - per-source/provider rate and budget limits
  - partial failure summaries
- Acceptance:
  - backfill can process a mixed batch with ready, stale, blocked, failed, and already-indexed items.
  - cleanup dry-run protects active versions and raw assets.
  - interrupted jobs resume without duplicating active outputs.

## Milestone 8 - Desktop UX And Operator Feedback
- Improve overview and operations UI for:
  - fulltext acquisition status
  - downloaded raw asset list
  - parser/GROBID health
  - source rate-limit/cooldown warnings
  - scorer/provider readiness
  - one-click process-to-retrievable after download
- Avoid adding new feature CSS to the frozen legacy CSS layer.
- Acceptance:
  - operator can understand what is missing for a literature item without reading logs.
  - every blocked action has a stable reason and recovery action.

## Milestone 9 - Cutover And Release Gate
- Run final cutover suite:
  - static contract checks
  - unit/integration tests
  - local real-dependency smoke
  - temporary Postgres batch E2E
  - context/OpenAPI/API index checks
  - manual desktop smoke
- Record release readiness:
  - known risks
  - rollback path
  - operational runbook
  - cost/rate expectations
- Acceptance:
  - no old `pipeline` public semantics resurface.
  - E2E evidence is attached to `04-verification.md`.
  - remaining limitations are explicit child tasks, not hidden gaps.

## Alignment Questions
- Should fulltext acquisition from DOI pages use a resolver provider in v1, or remain explicit URL only plus arXiv conversion?
- Should remote download become a durable job immediately, or stay sync for manual UI and async only for batch acquisition?
- Is OCR part of this upgrade, or should scanned PDFs remain blocked with a separate OCR task?
- Should auto-pull quality scoring be a direct backend OpenAI call or an external scorer endpoint?
- What minimum retrieval quality threshold is acceptable for the first batch E2E gate?
- How many real papers should the temporary Postgres batch suite use by default?
