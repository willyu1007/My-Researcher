# 07 B10 Candidate Discovery

## Status
- State: implemented and used for local DB candidate staging.
- Latest DB-writing B10 run: D80 RAG/test-time exact arXiv refill.
- Current candidate pool: 642 records.
- Current `DISCOVERED` candidates: 0 after D81 promoted and completed the 3 D80 candidates.
- Current recommendation: continue candidate-pool scaleout, or run another narrow RAG/test-time source-backed refill if effective-literature growth is preferred.

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
- `B10_MIN_YEAR`: minimum publication year; default is frontier-oriented, but math-theory refills should set a deliberately low cutoff such as `1900`.
- `B10_ALLOW_MATH_FOUNDATION`: opt-in gate for canonical math-foundation refills; default `false`.
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
- Math-theory exact-ID refills can intentionally relax recency with `B10_MIN_YEAR=1900`; selection should prefer canonical formal relevance over publication recency.
- Math-theory group/action refills require `B10_ALLOW_MATH_FOUNDATION=true`; keep it off for broad frontier runs.

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
| D65 | RAG/test-time source-backed exact-ID refill | 1 clean RAG candidate staged | Promoted as `LIT-0550` and completed |
| D66 | Test-time exact-ID source-backed refill | 4 clean candidates staged | Promoted as `LIT-0551`-`LIT-0554` and completed |
| D69 | Narrow RAG source-backed exact-title refill | 2 clean candidates staged | B11 dry-run: 2 high-band ready |
| D70 | Test-time exact-title source-backed refill | 1 clean candidate staged | Promoted as `LIT-0581` and completed |
| D71 | RAG exact-ID source-backed refill | 2 clean candidates staged | B11 dry-run: 2 high-band ready |
| D72 | Test-time exact-ID source-backed refill | 3 clean candidates staged | Promoted as `LIT-0584`-`LIT-0586` in D73 and completed |
| D74 | Math-theory group/action exact-title refill | 4 clean candidates staged | Promoted as `LIT-0587`-`LIT-0590` and completed |
| D75 | Balanced RAG/test-time exact-title refill | 6 clean candidates staged | Promoted as `LIT-0591`-`LIT-0596` and completed |
| D76 | Curated catalog expansion from broad source-backed scout | 5 clean candidates staged | Promoted with D77 as `LIT-0597`-`LIT-0602` and completed |
| D77 | Serving Atom exact-source refill after test-time scout found no new clean rows | 1 clean serving candidate staged | Promoted with D76 and completed |
| D78 | Broad source-backed scaleout followed by serving clean2 curated apply | 2 clean serving candidates staged | Promoted as `LIT-0603`-`LIT-0604` in D79 and completed |
| D80 | RAG/test-time exact arXiv refill after broad scout found only a code-completion tail | 3 clean test-time candidates staged | Promoted as `LIT-0605`-`LIT-0607` in D81 and completed |

## D80 Details
- RAG/test-time source-backed scout:
  - artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d80-rag-testtime-sourcebacked-scout-b10-candidate-discovery-report.json`
  - found 15 source-backed candidates: 1 `DISCOVERED`, 14 duplicates.
  - the only new row was `Prompt-based Code Completion via Multi-Retrieval Augmented Generation`, rejected as an application tail.
- Exact arXiv dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d80-rag-testtime-exact-arxiv-dry-run-b10-candidate-discovery-report.json`
  - found 5 source-backed rows: 3 `DISCOVERED`, 2 duplicates.
  - duplicates:
    - `When Knowledge Is Not Free: Cost-Aware Evidence Selection in Retrieval-Augmented Generation` matched `LIT-0480`.
    - `Not All Errors Are Equal: Consequence-Aware Reasoning Compute Allocation` matched `LIT-0460`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d80-rag-testtime-exact-arxiv-apply-b10-candidate-discovery-report.json`
- Batch id: `cb0ad728-afe1-4802-8102-3ef97b1a4601`.
- Batch code: `B10-D80-rag-testtime-exact-arxiv-refill`.
- Persisted 3 `DISCOVERED` candidates and created no `LiteratureRecord` rows:
  - `0fead777-2f24-4407-93e4-88df06885db3`: `Dual-Dimensional Consistency: Balancing Budget and Quality in Adaptive Inference-Time Scaling`.
  - `e5b7846b-d75b-44dc-856f-fe77c029b951`: `The Shadow Price of Reasoning: Economic Perspective on Optimal Budget Allocation for LLMs`.
  - `5bf225f4-7090-4bda-bff6-8de03a965de5`: `ThinkBooster: A Unified Framework for Seamless Test-Time Scaling of LLM Reasoning`.
- These candidates were promoted and completed in D81.

## D78 Details
- Broad source-backed OpenAlex scout:
  - artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d78-broad-sourcebacked-scaleout-dry-run-b10-candidate-discovery-report.json`
  - ran 8 tracks, 40 queries, and 0 provider errors.
  - inspected 800 provider results.
  - found 81 source-backed B10 candidates: 8 `DISCOVERED`, 73 duplicates.
  - direction split: 60 serving, 14 RAG, 7 test-time.
- Manual curation rejected 6 of the 8 new rows as code-completion, quantitative-finance, edge-sensor, model-family, or generic ML-serving tail.
- Curated exact-title dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d78-serving-clean2-curated-dry-run-b10-candidate-discovery-report.json`
  - found 3 source-backed rows: 2 `DISCOVERED` and 1 same-title duplicate.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d78-serving-clean2-curated-apply-b10-candidate-discovery-report.json`
- Batch id: `bf0f9bb1-5601-4cd4-be78-c8d2bf8521d9`.
- Batch code: `B10-D78-serving-clean2-curated`.
- Persisted 2 `DISCOVERED` candidates and created no `LiteratureRecord` rows:
  - `591a5d62-6b43-4755-ad2d-ef82053c691b`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `274d1ff4-258a-4a70-b541-99a65d21975f`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- These candidates were promoted and completed in D79.

## D77 Details
- Test-time exact-source scout:
  - artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-testtime-foundation-exact-source-dry-run-b10-candidate-discovery-report.json`
  - found 1 source-backed candidate and it was a duplicate of existing `LIT-0227`.
- arXiv test-time foundation/search scouts:
  - artifacts:
    - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-testtime-arxiv-foundation-dry-run-b10-candidate-discovery-report.json`
    - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-testtime-arxiv-search-scout-b10-candidate-discovery-report.json`
  - returned no new clean candidates under the existing test-time focus gate.
- Accepted small refill:
  - dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-serving-atom-exact-source-dry-run-b10-candidate-discovery-report.json`
  - apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-serving-atom-exact-source-apply-b10-candidate-discovery-report.json`
  - batch id: `51492d3e-4cd1-4593-afe7-5401f747b016`.
  - batch code: `B10-D77-serving-atom-exact-source-refill`.
  - persisted 1 `DISCOVERED` candidate and created no `LiteratureRecord` rows:
    - `b2184f84-b11c-4164-bc6c-a25ae8abc167`: `Atom: Low-bit Quantization for Efficient and Accurate LLM Serving`.

## D76 Details
- Broad source-backed OpenAlex scout:
  - artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d76-broad-catalog-expansion-scout-b10-candidate-discovery-report.json`
  - found 87 source-backed candidates: 12 `DISCOVERED`, 75 duplicates.
  - new rows were noisy as a full apply set: code-completion, financial-agent, foreground-segmentation, model-family, and other application tails appeared.
- Narrow RAG/test-time scout:
  - artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d76-rag-testtime-narrow-catalog-scout-b10-candidate-discovery-report.json`
  - found 11 source-backed candidates: 2 `DISCOVERED`, 9 duplicates.
  - only `Retrieval-Enhanced Machine Learning` was clean enough from this scout; the `Polis` paper was treated as an application tail.
- Curated dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d76-curated-catalog-expansion-dry-run-b10-candidate-discovery-report.json`
  - candidate count: 6.
  - discovered: 6.
  - source-available candidates: 6.
  - direction split: 4 serving, 2 RAG.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d76-curated-catalog-expansion-apply-b10-candidate-discovery-report.json`
- Batch id: `a16bc1f4-36d5-4d70-a2ef-8aa65a55e085`.
- Batch code: `B10-D76-curated-catalog-expansion`.
- Persisted 5 `DISCOVERED` candidates and created no `LiteratureRecord` rows:
  - `8f14f322-ede3-4b85-a1bd-4446f0314268`: `Context Attribution with Multi-Armed Bandit Optimization`.
  - `a2c213f3-2cdc-4daf-9e32-f9bd0fe08810`: `Retrieval-Enhanced Machine Learning`.
  - `7c471a84-a8ae-45e9-a259-fcd5bbaccfcd`: `EPIC: Efficient Position-Independent Caching for Serving Large Language Models`.
  - `687d242a-0e2b-4b26-bfb6-0658d951a75c`: `Efficient Heterogeneous Large Language Model Decoding with Model-Attention Disaggregation`.
  - `9b936b74-343c-4436-b2f1-117964d32d90`: `KunServe: Parameter-centric Memory Management for Efficient Memory Overloading Handling in LLM Serving`.

## D75 Details
- Initial read-only scout:
  - narrow source-backed scout found 13 candidates with only 1 new `DISCOVERED`, a code-completion application tail.
  - wider source-backed scout found 7 new candidates.
  - test-time deep scout found 3 new candidates.
- Current READY-pool selector selected 0 candidates under strict source/tail gates, so D75 used exact-title B10 rather than broad READY-tail promotion.
- Final exact-title dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d75-rag-testtime-exact-title-final-dry-run-b10-candidate-discovery-report.json`
  - candidate count: 6.
  - discovered: 6.
  - source-available candidates: 6.
  - direction split: 4 RAG, 2 test-time.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d75-rag-testtime-exact-title-apply-b10-candidate-discovery-report.json`
- Batch id: `885ff54d-64eb-4b47-a240-4f180e8d99a1`.
- Batch code: `B10-D75-rag-testtime-exact-title-sourcebacked`.
- Persisted 6 `DISCOVERED` candidates and created no `LiteratureRecord` rows.

## D74 Details
- arXiv exact-ID dry-run stayed diagnostic because repeated exact-ID requests hit HTTP 429/abort provider errors.
- Accepted path used OpenAlex exact-title queries with:
  - `B10_ALLOW_MATH_FOUNDATION=true`
  - `B10_MIN_YEAR=1900`
  - `B10_REQUIRE_SOURCE_AVAILABLE=true`
  - `B10_PROVIDERS=openalex`
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d74-math-theory-openalex-exact-title-apply-b10-candidate-discovery-report.json`
- Batch id: `50a3ca87-0356-43c4-aba8-b1b51043b8ba`.
- Batch code: `B10-D74-math-theory-group-action-exact-title`.
- Persisted 4 `DISCOVERED` candidates and created no `LiteratureRecord` rows.

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

## D65 Details
- OpenAlex narrow dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d65-rag-testtime-source-backed-refill-dry-run-b10-candidate-discovery-report.json`
  - selected RAG core/theory and test-time strategy/search/theory tracks.
  - executed 25 source-backed queries with 0 provider errors.
  - found 7 source-available candidates: 2 `DISCOVERED` and 5 duplicates.
  - `RAG-Verus` was not applied because it is a repository-level program-verification application tail.
- arXiv-ID dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d65-rag-testtime-arxiv-id-refill-dry-run-b10-candidate-discovery-report.json`
  - exact-ID allowlist found 4 source-backed candidates: 1 `DISCOVERED` and 3 duplicates.
  - duplicate test-time targets were already represented by `LIT-0238` and `LIT-0241`; the RAG gating target was already `LIT-0188`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d65-rag-testtime-arxiv-id-refill-apply-b10-candidate-discovery-report.json`
  - batch id: `bd1fae8b-08a6-4f1b-b5fd-980a50e94201`.
  - batch code: `B10-D65-rag-testtime-arxiv-id-refill`.
  - persisted 1 `DISCOVERED` candidate with `B10_PERSIST_STATUSES=DISCOVERED`.
  - candidate: `ff23d45c-54e6-4096-b2e1-55a467925641`, `Stronger Baselines for Retrieval-Augmented Generation with Long-Context Language Models`.
  - DB delta: 1 batch, 1 candidate.
  - no `LiteratureRecord` rows were created by B10.
  - follow-up B11 dry-run classified the candidate as high-band `READY_FOR_PROMOTION`.
  - follow-up B11/B12 completed the candidate as `LIT-0550`.

## D66 Details
- arXiv exact-ID dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d66-testtime-exact-id-refill-dry-run-b10-candidate-discovery-report.json`
  - selected test-time strategy/search tracks.
  - exact-ID allowlist found 5 source-backed candidates: 4 `DISCOVERED` and 1 duplicate.
  - duplicate: `Budget-aware Test-time Scaling via Discriminative Verification`, matched existing `LIT-0452`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d66-testtime-exact-id-refill-apply-b10-candidate-discovery-report.json`
  - batch id: `5b92ac9f-3164-4e97-a8a1-f292a85376c2`.
  - batch code: `B10-D66-testtime-exact-id-refill`.
  - persisted 4 `DISCOVERED` candidates with `B10_PERSIST_STATUSES=DISCOVERED`.
  - no `LiteratureRecord` rows were created by B10.
  - follow-up B11/B12 completed the candidates as `LIT-0551` through `LIT-0554`.

## D69 Details
- Pre-run count: candidate pool 613, `DISCOVERED` 0, managed/effective 376/376.
- Scout artifacts:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d69-narrow-rag-testtime-sourcebacked-scout-b10-candidate-discovery-report.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d69-narrow-method-gap-sourcebacked-scout-b10-candidate-discovery-report.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d69-narrow-testtime-arxiv-scout-b10-candidate-discovery-report.json`
- Exact-title dry-run artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d69-narrow-rag-sourcebacked-refill-dry-run-b10-candidate-discovery-report.json`
  - found 2 candidates, both `DISCOVERED`, source-backed, and RAG core.
- Apply artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d69-narrow-rag-sourcebacked-refill-apply-b10-candidate-discovery-report.json`
  - batch id: `3fa6f0fb-9764-47ca-a9bf-93ae8a45361b`.
  - batch code: `B10-D69-narrow-rag-sourcebacked-refill`.
  - persisted 2 `DISCOVERED` candidates with `B10_PERSIST_STATUSES=DISCOVERED`.
  - no `LiteratureRecord` rows were created by B10.
- Staged candidates:
  - `2712769b-65e6-4e94-945a-ddba9d6df6c5`: `MCTS-RAG: Enhancing Retrieval-Augmented Generation with Monte Carlo Tree Search`.
  - `4c383b35-d27c-44f7-9a3a-d4f8b069255f`: `The Power of Noise: Redefining Retrieval for RAG Systems`.
- Follow-up B11 dry-run classified both candidates as high-band `READY_FOR_PROMOTION`.

## D70 Details
- Direction-balance scout artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-testtime-balance-sourcebacked-scout-b10-candidate-discovery-report.json`
  - found 4 source-backed test-time candidates: 1 `DISCOVERED` and 3 duplicates.
  - the only new scout title was a scalable-deliberation tail and was not applied.
- Exact-title dry-run artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-testtime-sample-compute-allocation-dry-run-b10-candidate-discovery-report.json`
  - found 1 source-backed `DISCOVERED` test-time candidate and 0 duplicates.
- Apply artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-testtime-sample-compute-allocation-apply-b10-candidate-discovery-report.json`
  - batch id: `36d3538e-3c08-4e05-bb08-e5e6d7e7b8b2`.
  - batch code: `B10-D70-testtime-sample-compute-allocation`.
  - persisted 1 `DISCOVERED` candidate with `B10_PERSIST_STATUSES=DISCOVERED`.
  - no `LiteratureRecord` rows were created by B10.
- Staged candidate:
  - `daaa560a-d1e2-44c3-a826-b7ea8c2d6860`: `Scaling LLM Inference with Optimized Sample Compute Allocation`.
- Follow-up B11/B12 promoted and completed the candidate as `LIT-0581`.

## D71 Details
- Narrow OpenAlex scout artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d71-rag-testtime-narrow-sourcebacked-scout-b10-candidate-discovery-report.json`
  - found 3 source-backed candidates, all duplicates, so no scout rows were applied.
- arXiv exact-ID dry-run artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d71-rag-testtime-exact-id-sourcebacked-dry-run-b10-candidate-discovery-report.json`
  - found 4 source-backed candidates: 2 `DISCOVERED` and 2 duplicates.
  - duplicates:
    - `Plan and Budget: Effective and Efficient Test-Time Scaling on Reasoning Large Language Models` matched `LIT-0238`.
    - `Retrieval as a Decision: Training-Free Adaptive Gating for Efficient RAG` matched `LIT-0188`.
- Apply artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d71-rag-exact-id-sourcebacked-apply-b10-candidate-discovery-report.json`
  - batch id: `af25e7df-545a-4133-9e75-2d19c62c935b`.
  - batch code: `B10-D71-rag-exact-id-sourcebacked-refill`.
  - persisted 2 `DISCOVERED` candidates with `B10_PERSIST_STATUSES=DISCOVERED`.
  - no `LiteratureRecord` rows were created by B10.
- Staged candidates:
  - `16580c5d-e876-469c-9b33-bed96a055eec`: `Cluster-based Adaptive Retrieval: Dynamic Context Selection for RAG Applications`.
  - `943c9d4a-e998-4471-a8dd-d1eccffef0fa`: `Fast or Better? Balancing Accuracy and Cost in Retrieval-Augmented Generation with Flexible User Control`.
- Follow-up B11 dry-run classified both candidates as high-band `READY_FOR_PROMOTION`.

## D72 Details
- arXiv exact-ID dry-run artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d72-testtime-exact-id-sourcebacked-dry-run-b10-candidate-discovery-report.json`
  - found 5 source-backed test-time candidates: 3 `DISCOVERED` and 2 duplicates.
  - duplicates:
    - `s1: Simple test-time scaling` matched `LIT-0347`.
    - `BudgetThinker: Empowering Budget-aware LLM Reasoning with Control Tokens` matched `LIT-0153`.
- Apply artifact:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d72-testtime-exact-id-sourcebacked-apply-b10-candidate-discovery-report.json`
  - batch id: `f512863d-5868-466a-ba2c-0502418fe340`.
  - batch code: `B10-D72-testtime-exact-id-sourcebacked-refill`.
  - persisted 3 `DISCOVERED` candidates with `B10_PERSIST_STATUSES=DISCOVERED`.
  - no `LiteratureRecord` rows were created by B10.
- Staged candidates:
  - `a11bd976-fd4a-4236-a5f5-940a434e7acd`: `Learning When to Plan: Efficiently Allocating Test-Time Compute for LLM Agents`.
  - `67659b8a-6a13-4846-b4bb-9b8aa8fdc095`: `Adaptive Rectification Sampling for Test-Time Compute Scaling`.
  - `74fda4f3-4c04-473c-80f6-22c1ebbcc5ff`: `ATTS: Asynchronous Test-Time Scaling via Conformal Prediction`.
- Follow-up B11 dry-run classified all 3 candidates as high-band `READY_FOR_PROMOTION`.

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
