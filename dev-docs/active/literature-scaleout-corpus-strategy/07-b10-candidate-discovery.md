# 07 B10 Candidate Discovery

## Status
- State: implemented and used for local DB candidate staging.
- Latest DB-writing B10 run: D57 OpenAlex serving exact-title source-backed apply.
- Current candidate pool: 600 records.
- Current recommendation: use narrow source-backed exact-title or arXiv-ID refills for promotion-bound tranches; use the next narrow run to rebalance RAG/test-time after D57's serving-heavy tranche.

## Entrypoint
- Script: `tools/b10-candidate-discovery.mjs`
- Default mode: dry-run.
- Apply mode: pass `--apply`.
- Writes:
  - `LiteratureDiscoveryBatch`
  - `LiteratureDiscoveryCandidate`
- Does not write:
  - `LiteratureRecord`
  - `LiteratureSource`
  - content assets
  - fulltext documents
  - key-content dossiers
  - embedding/index rows

## Output Boundary
- Lightweight report artifacts belong under `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts`.
- Raw candidate dumps, query ledgers, and detail payloads stay out of versioned dev-docs.
- B10 apply should be followed by B11 dry-run before any promotion.

## Provider Support
- OpenAlex:
  - primary stable provider for current exact-title/source-backed runs.
  - supports broad catalog and curated exact-title queries.
- arXiv:
  - implemented.
  - useful for exact arXiv ID allowlists.
  - can return HTTP 429 under repeated/broad requests; keep broad arXiv probes diagnostic unless provider health is revalidated.
- Semantic Scholar:
  - implemented.
  - skipped in default `auto` mode without `SEMANTIC_SCHOLAR_API_KEY`.

## Configuration
- `B10_PROVIDERS`: `auto`, `all`, or explicit comma-separated provider list.
- `B10_TRACK_LIMIT`: number of tracks to run.
- `B10_TRACK_IDS`: optional explicit track allowlist.
- `B10_QUERY_LIMIT`: queries per track.
- `B10_PROVIDER_RESULT_LIMIT`: provider results per query.
- `B10_MAX_CANDIDATES`: maximum candidates staged from one run.
- `B10_REQUEST_TIMEOUT_MS`: per-request timeout.
- `B10_PROVIDER_RETRIES`: retry count per provider request.
- `B10_REQUEST_DELAY_MS`: non-arXiv provider delay.
- `B10_ARXIV_DELAY_MS`: arXiv provider delay.
- `B10_MIN_YEAR`: minimum publication year.
- `B10_REQUIRE_SOURCE_AVAILABLE`: when true, keep only candidates with an arXiv/source path.
- `B10_TITLE_ALLOWLIST_REGEX`: optional case-insensitive curated title filter.
- `B10_TITLE_EXCLUDE_REGEX`: optional case-insensitive title/abstract exclusion filter.
- `B10_QUERY_OVERRIDES_JSON`: explicit query/title/arXiv allowlist input.
- `B10_PERSIST_STATUSES`: statuses to persist during apply, commonly `DISCOVERED`.
- `OPENALEX_MAILTO`: optional OpenAlex contact email.
- `OPENALEX_API_KEY`: optional OpenAlex API key.
- `SEMANTIC_SCHOLAR_API_KEY`: optional Semantic Scholar API key.

## Current Query Capabilities
- Broad OpenAlex catalog discovery.
- Direction-targeted track runs with `B10_TRACK_IDS`.
- Exact-title/query override allowlists with `B10_QUERY_OVERRIDES_JSON`.
- Clean apply filtering with `B10_PERSIST_STATUSES=DISCOVERED`.
- Source-backed filtering with `B10_REQUIRE_SOURCE_AVAILABLE=true`.
- arXiv ID allowlists using `arxiv:<id>` or bare arXiv IDs.

## Recent Run Ledger

| Run | Scope | B10 result | Follow-up |
| --- | --- | --- | --- |
| D37 | RAG/test-time source-backed refill | 2 clean RAG-core candidates staged | Later promoted in D42 |
| D41 | RAG-core exact-title allowlist | 2 clean candidates staged | Promoted as `LIT-0450`-`LIT-0451` |
| D42 | Test-time exact-title allowlist | 3 clean candidates staged | Promoted as `LIT-0452`-`LIT-0454` |
| D45 | Theory-support exact-title apply | 21 clean candidates staged | 19 ready, 2 deferred |
| D47 | RAG/test-time theory refill | 1 clean RAG theory candidate staged | `CARROT` promoted in D48 |
| D52 | Exact-title theory target closure | 7 clean theory candidates staged | Promoted as `LIT-0477`-`LIT-0483` |
| D54 | Balanced RAG/test-time source-backed | 6 clean candidates staged | Promoted as `LIT-0484`-`LIT-0489` |
| D55 | OpenAlex exact-title source-backed | 11 clean candidates staged | Promoted as `LIT-0490`-`LIT-0500` |
| D57 | Serving/resource-allocation exact-title | 12 clean candidates staged | Promoted as `LIT-0501`-`LIT-0512` |

## D55 Details
- Diagnostic broad arXiv dry-run and arXiv-ID dry-run were kept read-only after arXiv HTTP 429s.
- Accepted path used OpenAlex exact-title queries with source-available filtering.
- Dry-run found 16 source-available candidates:
  - 11 `DISCOVERED`
  - 5 same-batch duplicates
- Apply persisted:
  - batch id `763d15b8-0620-4b4a-a8d0-265f7b602578`
  - 11 `DISCOVERED` candidates
- B10 created no `LiteratureRecord` rows.

## D57 Details
- Read-only scouting artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d57-source-backed-scout-dry-run-b10-candidate-discovery-report.json`
  - scanned OpenAlex source-backed candidates across RAG, test-time, and serving tracks.
  - found 87 source-available candidates: 19 `DISCOVERED` and 68 duplicates.
  - clean newly discovered titles were serving-heavy, so D57 used a serving-focused exact-title allowlist.
- Exact-title dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d57-serving-exact-title-dry-run-b10-candidate-discovery-report.json`
  - candidate count: 18.
  - discovered: 12.
  - duplicates: 6.
  - source-available candidates: 18.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d57-serving-exact-title-apply-b10-candidate-discovery-report.json`
  - batch id: `e43a90e7-81d2-425d-a54a-5a3ac7b91d49`.
  - batch code: `B10-20260608T-d57-serving-exact-title-apply`.
  - persisted 12 `DISCOVERED` candidates and skipped same-batch duplicate rows.
  - DB delta: 1 batch, 12 candidates.
  - no `LiteratureRecord` rows were created by B10.

## Guardrails
- Run a dry-run first.
- Prefer `B10_PERSIST_STATUSES=DISCOVERED` for curated applies so duplicate rows are not persisted.
- Do not let broad application-tail candidates bypass B11 selector review.
- Keep arXiv broad pressure low after 429s; use exact-ID retries only when needed.
- Keep generated artifacts out of versioned docs.

## Next B10 Path
- Quality-first: a RAG/test-time exact-title or arXiv-ID source-backed refill to rebalance after D57.
- Recall-first: broader B10 catalog expansion, then strict source-backed B11 selection before promotion.
