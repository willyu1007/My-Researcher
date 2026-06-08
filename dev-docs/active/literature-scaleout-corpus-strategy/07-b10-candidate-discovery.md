# 07 B10 Candidate Discovery

## Status
- State: implemented and used for local DB candidate staging.
- Latest DB-writing B10 run: D59 OpenAlex serving source-backed curated apply.
- Current candidate pool: 608 records.
- Current recommendation: use broad B10 for recall, but persist only curated source-backed `DISCOVERED` rows when promotion may follow.

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
| D58 | RAG/test-time source-backed scouting | read-only; no new candidates staged | promoted existing clean candidates as `LIT-0513`-`LIT-0516` |
| D59 | Serving source-backed curated expansion | 8 clean candidates staged | 4 promoted as `LIT-0517`-`LIT-0520`, 4 deferred |

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

## D58 Details
- Read-only scouting artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d58-rag-testtime-source-backed-scout-dry-run-b10-candidate-discovery-report.json`
  - selected tracks: RAG core/theory and test-time strategy/search/theory.
  - found 60 source-available candidates.
  - status split: 6 `DISCOVERED` and 54 duplicates.
  - newly discovered rows were mostly application-tail or off-mainline, so D58 did not apply a new B10 batch.
- Decision:
  - promote clean source-backed candidates already present in candidate staging but blocked by early duplicate-loop state.
  - avoid adding weak newly discovered candidates just to raise D58 volume.

## D59 Details
- Broad read-only scout artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d59-broad-source-backed-scout-b10-candidate-discovery-report.json`
  - selected all 8 B10 tracks with source-available filtering.
  - found 109 source-available candidates: 18 `DISCOVERED` and 91 duplicates.
  - new clean rows were serving-heavy; RAG/test-time rows remained weak or tail-heavy.
- Curated dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d59-serving-curated-dry-run-b10-candidate-discovery-report.json`
  - title allowlist retained 4 clean serving candidates in dry-run.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d59-serving-curated-apply-b10-candidate-discovery-report.json`
  - batch id: `be56a8f3-0d49-4f6d-9274-0e6f61cb3ec7`.
  - batch code: `B10-D59-serving-source-backed-curated`.
  - persisted 8 `DISCOVERED` candidates with `B10_PERSIST_STATUSES=DISCOVERED`.
  - DB delta: 1 batch, 8 candidates.
  - no `LiteratureRecord` rows were created by B10.

## Guardrails
- Run a dry-run first.
- Prefer `B10_PERSIST_STATUSES=DISCOVERED` for curated applies so duplicate rows are not persisted.
- Do not let broad application-tail candidates bypass B11 selector review.
- Keep arXiv broad pressure low after 429s; use exact-ID retries only when needed.
- Keep generated artifacts out of versioned docs.

## Next B10 Path
- Quality-first: continue source-backed exact-title/arXiv-ID refill or duplicate-loop cleanup only when candidate quality is clear.
- Recall-first: broader B10 catalog expansion, but apply only curated source-backed rows and let B11 defer medium-band candidates.
- RAG/test-time refill should use stricter query overrides because the latest broad source-backed pass was serving-heavy.
