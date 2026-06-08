# 07 B10 Candidate Discovery

## Status
- State: first entrypoint implemented, provider-hardened, and pilot-applied.
- Pilot apply: completed for 60 OpenAlex candidates.
- Scaleout run: pending for 500-800 candidates.

## Entrypoint
- Script: `tools/b10-candidate-discovery.mjs`
- Default mode: dry-run.
- Apply mode: pass `--apply`.
- Output boundary:
  - lightweight discovery report: `dev-docs/active/literature-scaleout-corpus-strategy/artifacts/`
  - raw candidate dump, query ledger, and detail payload: `.ai/.tmp/literature-scaleout-corpus-strategy/`
- Writes:
  - `LiteratureDiscoveryBatch`
  - `LiteratureDiscoveryCandidate`
- Does not write:
  - `LiteratureRecord`
  - content assets
  - fulltext documents
  - key-content dossiers
  - embedding/index rows

## Provider Support
- OpenAlex works search:
  - implemented.
  - canary apply succeeded.
  - pilot apply succeeded.
- arXiv API:
  - implemented.
  - explicit-only in default `auto` mode after local canary requests produced provider-level `ECONNRESET`/fetch failures.
- Semantic Scholar Graph API:
  - implemented.
  - skipped in default `auto` mode unless `SEMANTIC_SCHOLAR_API_KEY` is configured.
  - explicit no-key canary returned `429`.

## Configuration
- `B10_PROVIDERS`: comma-separated provider list.
  - default: `auto`.
  - `auto`: run OpenAlex, run Semantic Scholar only when an API key is configured, and keep arXiv explicit-only.
  - `all`: run all implemented providers.
  - explicit example: `openalex,arxiv,semantic_scholar`.
- `B10_TRACK_LIMIT`: number of tracks to run.
- `B10_TRACK_IDS`: optional comma-separated explicit track id allowlist.
- `B10_QUERY_LIMIT`: queries per track.
- `B10_PROVIDER_RESULT_LIMIT`: provider results per query.
- `B10_MAX_CANDIDATES`: maximum candidates staged from one run.
- `B10_REQUEST_TIMEOUT_MS`: per-request timeout.
- `B10_PROVIDER_RETRIES`: retry count per provider request.
- `B10_REQUEST_DELAY_MS`: non-arXiv provider delay.
- `B10_ARXIV_DELAY_MS`: arXiv provider delay.
- `B10_MIN_YEAR`: minimum publication year.
- `B10_REQUIRE_SOURCE_AVAILABLE`: optional boolean; when true, keep only candidates with an arXiv path.
- `B10_TITLE_ALLOWLIST_REGEX`: optional case-insensitive title regex for curated small applies.
- `B10_TITLE_EXCLUDE_REGEX`: optional case-insensitive title plus abstract regex for excluding obvious tails.
- `OPENALEX_MAILTO`: optional OpenAlex contact email.
- `OPENALEX_API_KEY`: optional OpenAlex API key.
- `SEMANTIC_SCHOLAR_API_KEY`: optional Semantic Scholar API key.

## Canary Runs

### Dry Run
- Command:

```bash
TS_NODE_TRANSPILE_ONLY=true B10_DISCOVERY_RUN_ID=20260606T-b10-dry-run \
  B10_TRACK_LIMIT=1 B10_QUERY_LIMIT=1 B10_PROVIDER_RESULT_LIMIT=3 \
  B10_MAX_CANDIDATES=12 B10_REQUEST_TIMEOUT_MS=7000 B10_PROVIDER_RETRIES=1 \
  B10_REQUEST_DELAY_MS=300 B10_ARXIV_DELAY_MS=300 \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs
```

- Result:
  - OpenAlex returned 2 initial candidates.
  - arXiv timed out/aborted under the shortened canary timeout.
  - Semantic Scholar returned `429` without API key.
  - DB delta: 0 batches, 0 candidates.

### OpenAlex Apply Smoke
- Command:

```bash
TS_NODE_TRANSPILE_ONLY=true B10_DISCOVERY_RUN_ID=20260606T-b10-openalex-apply \
  B10_PROVIDERS=openalex B10_TRACK_LIMIT=1 B10_QUERY_LIMIT=1 \
  B10_PROVIDER_RESULT_LIMIT=3 B10_MAX_CANDIDATES=2 \
  B10_REQUEST_TIMEOUT_MS=10000 B10_PROVIDER_RETRIES=1 B10_REQUEST_DELAY_MS=300 \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/literature-scaleout-corpus-strategy/tools/b10-candidate-discovery.mjs --apply
```

- Result:
  - DB delta: 1 batch, 2 candidates.
  - Both candidates were later marked `REJECTED` after canary review because they failed the tightened direction/role focus filter.
  - No `LiteratureRecord` rows were created.
  - Managed corpus stayed 146.
  - Effective literature stayed 144.

## Hardening From Canary
- Symptom:
  - a wide OpenAlex query admitted weakly related candidates.
  - `rag` substring matching admitted false positives such as words containing `rag`.
  - default all-provider execution caused predictable local noise from arXiv connection resets and Semantic Scholar no-key rate limits.
- Fix:
  - raised the relevance threshold.
  - added direction-specific focus checks.
  - excluded survey/review/resource-center/database-like titles from B10 staging.
  - changed RAG-core title matching to word-boundary `RAG` or complete retrieval-augmented-generation signals.
  - changed default provider selection to conservative `auto` mode with skipped-provider ledger entries.
- Verification:
  - same OpenAlex canary query after hardening produced 0 candidates.
  - B13 after cleanup reports 2 candidate-pool rows, both `REJECTED`.

## Provider/Query Hardening

### Auto Default Dry Run
- Artifact: `artifacts/20260606T-b10-auto-default-dry-run-b10-candidate-discovery-report.json`
- Result:
  - enabled providers: OpenAlex.
  - skipped providers: Semantic Scholar without API key, arXiv explicit-only after local `ECONNRESET`.
  - executed provider queries: 1.
  - skipped-provider ledger entries: 2.
  - candidates: 6 RAG-core candidates.
  - DB delta: 0 batches, 0 candidates.

### Coverage Dry Run
- Artifact: `artifacts/20260606T-b10-rag-boundary-dry-run-b10-candidate-discovery-report.json`
- Result:
  - enabled providers: OpenAlex.
  - executed provider queries: 16.
  - skipped-provider ledger entries: 2.
  - provider errors: 0.
  - provider results scanned: 800.
  - provider candidates before run cap: 126.
  - staged candidates in dry-run: 108.
  - discovered in dry-run: 88.
  - duplicates in dry-run: 20.
  - direction split:
    - RAG-aware allocation: 56.
    - LLM serving resource allocation: 43.
    - test-time compute budgeting: 9.
  - DB delta: 0 batches, 0 candidates.

### OpenAlex Pilot Apply
- Artifact: `artifacts/20260606T-b10-openalex-pilot-apply-b10-candidate-discovery-report.json`
- Batch ID: `0caeeefb-735f-410d-aa88-7fedc187c6f3`
- Result:
  - DB delta: 1 batch, 60 candidates.
  - candidate status split:
    - `DISCOVERED`: 54.
    - `DUPLICATE`: 6.
  - direction split:
    - RAG-aware allocation: 41.
    - LLM serving resource allocation: 15.
    - test-time compute budgeting: 4.
  - No `LiteratureRecord` rows were created.
  - No content/fulltext/key-content/embedding/index rows were created.

## B10 Counting Snapshot
- Superseded by B11 counting in `08-b11-candidate-triage-promote.md`.
- Artifact: `artifacts/20260606T-after-b10-openalex-pilot-apply-counting.json`
- Metrics:
  - candidate batches: 2.
  - candidate pool records: 62.
  - candidate discovered records: 54.
  - candidate duplicate records: 6.
  - candidate rejected records: 2.
  - managed corpus records: 146.
  - effective literature records: 144.
  - pipeline blockers: 2.

## Scaleout Gate
- 500-800 candidate scaleout is now enabled for local dev with the expanded B10 catalog, subject to:
  - run B13 counting before and after any `--apply`.
  - keep default `auto` provider mode unless Semantic Scholar or arXiv reliability is explicitly revalidated.
  - use `B10_TRACK_IDS` for direction-targeted runs when one direction, especially LLM serving, would dominate the global top-k.
  - run B11 dry-run before any promotion.

## Catalog v2b Scaleout Dry Runs
- Full mixed-catalog dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-catalog-v2-dry-run-b10-candidate-discovery-report.json`
  - Query catalog: `b10-scaleout-v2`.
  - Executed OpenAlex queries: 120.
  - Provider errors: 0.
  - Provider candidates before global cap: 2664.
  - Staged dry-run candidates: 1000.
  - Discovered in dry-run: 560.
  - Duplicates in dry-run: 440.
  - Discovered with arXiv id: 311.
  - Discovered with DOI: 436.
  - Direction split:
    - LLM serving resource allocation: 640.
    - RAG-aware allocation: 321.
    - Test-time compute budgeting: 39.
  - DB delta: 0 batches, 0 candidates.
- Test-time targeted dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-catalog-v2b-testtime-dry-run-b10-candidate-discovery-report.json`
  - Query catalog: `b10-scaleout-v2b`.
  - Track ids:
    - `test-time-compute-budgeting-strategy`
    - `test-time-compute-budgeting-search`
    - `test-time-compute-budgeting-theory`
  - Executed OpenAlex queries: 60.
  - Provider errors: 0.
  - Staged dry-run candidates: 103.
  - Discovered in dry-run: 76.
  - Duplicates in dry-run: 27.
  - Discovered with arXiv id: 45.
  - Discovered with DOI: 70.
  - DB delta: 0 batches, 0 candidates.
- Operational decision:
  - Use full mixed-catalog runs to raise total candidate volume.
  - Use `B10_TRACK_IDS` targeted runs to rebalance undercovered directions before B11 promotion.

## Catalog v2b Test-Time Apply
- Artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-catalog-v2b-testtime-apply-b10-candidate-discovery-report.json`
- Batch ID: `0a9edeac-9cd4-48c9-95cb-03d6e2f9a72b`
- Input:
  - provider mode: `auto` (`openalex` enabled; Semantic Scholar and arXiv skipped).
  - track ids:
    - `test-time-compute-budgeting-strategy`
    - `test-time-compute-budgeting-search`
    - `test-time-compute-budgeting-theory`
  - max candidates: 400.
- Result:
  - DB delta: 1 batch, 103 candidates.
  - candidate status split:
    - `DISCOVERED`: 76.
    - `DUPLICATE`: 27.
  - direction split:
    - test-time compute budgeting: 103.
  - collection role split:
    - `collection:strategy-support`: 98.
    - `collection:theory-support`: 5.
  - No `LiteratureRecord` rows were created.
  - No content/fulltext/key-content/embedding/index rows were created.
- Counting after apply:
  - candidate pool records: 535.
  - candidate discovered records: 341.
  - candidate duplicate records: 141.
  - managed corpus records: 163.
  - effective literature records: 163.
  - pipeline incomplete/blocker/not-started: 0.

## Source-Available Targeted Expansion
- Broad RAG/test-time dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-source-available-dry-run-b10-candidate-discovery-report.json`
  - Input filters:
    - `B10_REQUIRE_SOURCE_AVAILABLE=true`.
    - no title allowlist or exclude regex.
  - Track ids:
    - `rag-aware-allocation-core`
    - `rag-aware-allocation-theory`
    - `test-time-compute-budgeting-strategy`
    - `test-time-compute-budgeting-search`
    - `test-time-compute-budgeting-theory`
  - Executed OpenAlex queries: 100.
  - Provider errors: 0.
  - Provider results scanned: 2500.
  - Source-available candidates kept: 46.
  - Discovered in dry-run: 4.
  - Duplicates in dry-run: 42.
  - Direction split:
    - RAG-aware allocation: 19.
    - Test-time compute budgeting: 27.
  - New discovered title review:
    - kept for apply: `SF-RAG`, `PrefRAG`.
    - not applied: `Prompt-based Code Completion via Multi-Retrieval Augmented Generation`, `Reinforcement Learning for Optimizing RAG for Domain Chatbots`.
- Clean RAG-core allowlist dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-source-available-allowlist-dry-run-b10-candidate-discovery-report.json`
  - Input filters:
    - `B10_REQUIRE_SOURCE_AVAILABLE=true`.
    - `B10_TITLE_ALLOWLIST_REGEX='^(SF-RAG|PrefRAG)'`.
  - Candidate count: 2.
  - Discovered: 2.
  - Duplicates: 0.
  - DB delta: 0 batches, 0 candidates.
- Clean RAG-core allowlist apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-source-available-allowlist-apply-b10-candidate-discovery-report.json`
  - Batch ID: `c9b19682-58f8-4c9b-89e8-369ab1d58f4d`.
  - Candidate count: 2.
  - Discovered: 2.
  - Duplicates: 0.
  - Source-available: 2.
  - Titles:
    - `SF-RAG: Structure-Fidelity Retrieval-Augmented Generation for Academic Question Answering`.
    - `PrefRAG: Preference-Driven Multi-Source Retrieval Augmented Generation`.
  - DB delta: 1 batch, 2 candidates.
  - No `LiteratureRecord` rows were created.
  - Counting after apply:
    - candidate pool records: 537.
    - candidate discovered records: 261.
    - managed corpus records: 240.
    - effective literature records: 240.
    - pipeline incomplete/blocker/not-started: 0.

## Non-Tail RAG/Test-Time Replenishment Probes
- Strict OpenAlex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-nontail-source-available-dry-run-b10-candidate-discovery-report.json`
  - Input filters:
    - `B10_REQUIRE_SOURCE_AVAILABLE=true`.
    - `B10_TITLE_EXCLUDE_REGEX` covered the application/direction tails surfaced by tranche10 selector review.
  - Track ids:
    - `rag-aware-allocation-core`
    - `rag-aware-allocation-theory`
    - `test-time-compute-budgeting-strategy`
    - `test-time-compute-budgeting-search`
    - `test-time-compute-budgeting-theory`
  - Executed OpenAlex queries: 100.
  - Provider errors: 0.
  - Provider results scanned: 2500.
  - Source-available candidates kept: 38.
  - Discovered in dry-run: 1.
  - Duplicates in dry-run: 37.
  - New discovered title review:
    - not applied: `Prompt-based Code Completion via Multi-Retrieval Augmented Generation`.
  - DB delta: 0 batches, 0 candidates.
- Explicit arXiv dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-arxiv-nontail-dry-run-b10-candidate-discovery-report.json`
  - Input filters:
    - `B10_REQUIRE_SOURCE_AVAILABLE=true`.
    - same tail-exclude regex as the strict OpenAlex probe.
  - Executed arXiv queries: 25.
  - Provider errors: 0.
  - Provider results scanned: 500.
  - Candidates kept: 2.
  - Discovered in dry-run: 2.
  - Duplicates in dry-run: 0.
  - New discovered title review:
    - not applied: `MLEvolve: A Self-Evolving Framework for Automated Machine Learning Algorithm Discovery`.
    - not applied: `You Only Index Once: Cross-Layer Sparse Attention with Shared Routing`.
  - DB delta: 0 batches, 0 candidates.
- Decision:
  - no B10 apply was executed in D40.
  - current clean non-tail RAG/test-time replenishment needs either a narrower query catalog or a curated title allowlist before writing new candidate rows.

## Narrow Query Override Allowlist
- Runner changes:
  - `QUERY_CATALOG_VERSION`: `b10-scaleout-v2c`.
  - `B10_QUERY_ALLOWLIST_REGEX`: optional regex filter for base catalog queries.
  - `B10_QUERY_EXCLUDE_REGEX`: optional regex exclusion for base catalog queries.
  - `B10_QUERY_OVERRIDES_JSON`: optional JSON object/array that replaces selected track queries with exact-title or curated query allowlists.
  - `B10_PERSIST_STATUSES`: optional status allowlist for apply persistence, used to avoid writing duplicate rows.
- Narrow OpenAlex query-regex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-narrow-catalog-openalex-dry-run-b10-candidate-discovery-report.json`
  - Executed provider queries: 48.
  - Provider errors: 0.
  - Provider results scanned: 1200.
  - Candidate count: 18.
  - Discovered: 0.
  - Duplicates: 18.
  - DB delta: 0 batches, 0 candidates.
- Narrow arXiv query-regex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-narrow-catalog-arxiv-dry-run-b10-candidate-discovery-report.json`
  - Candidate count: 0.
  - Discovered: 0.
  - DB delta: 0 batches, 0 candidates.
- Exact-title OpenAlex override dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-testtime-title-override-openalex-dry-run-b10-candidate-discovery-report.json`
  - Query overrides:
    - `rag-aware-allocation-core`: 6 exact-title/curated queries.
    - `test-time-compute-budgeting-strategy`: 4 exact-title/curated queries.
    - `test-time-compute-budgeting-search`: 4 exact-title/curated queries.
    - `test-time-compute-budgeting-theory`: 3 exact-title/curated queries.
  - Executed provider queries: 17.
  - Provider errors: 0.
  - Provider results scanned: 170.
  - Candidate count: 11.
  - Discovered: 2.
  - Duplicates: 9.
  - New discovered titles:
    - `Open-Source Reproduction and Explainability Analysis of Corrective Retrieval Augmented Generation`.
    - `DRAGIN: Dynamic Retrieval Augmented Generation based on the Information Needs of Large Language Models`.
  - DB delta: 0 batches, 0 candidates.
- Clean RAG title allowlist dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-title-allowlist-dry-run-b10-candidate-discovery-report.json`
  - Candidate count: 3.
  - Discovered: 2.
  - Duplicate: 1 same-batch DOI/abs duplicate for the Corrective RAG title.
  - DB delta: 0 batches, 0 candidates.
- Clean RAG title allowlist apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-rag-title-allowlist-apply-b10-candidate-discovery-report.json`
  - Batch ID: `f7a1b5dc-1f8a-4f29-89c8-5b14757283ec`.
  - Persist filter: `B10_PERSIST_STATUSES=DISCOVERED`.
  - Persisted 2 discovered candidates and skipped the same-batch duplicate row.
  - DB delta: 1 batch, 2 candidates.
  - No `LiteratureRecord` rows were created.
  - Counting after apply:
    - candidate pool records: 539.
    - candidate discovered records: 240.
    - managed corpus records: 263.
    - effective literature records: 263.
    - pipeline incomplete/blocker/not-started: 0.

## Test-Time Exact-Title Allowlist
- Local duplicate preflight:
  - `The Art of Scaling Test-Time Compute for Large Language Models` already exists as `LIT-0241`, so it was left out of the apply set.
- OpenAlex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-testtime-title-allowlist-dry-run-b10-candidate-discovery-report.json`
  - Query override track: `test-time-compute-budgeting-strategy`.
  - Query override count: 5 exact-title queries.
  - Title allowlist: `Budget-aware Test-time Scaling|Is That Your Final Answer|AgentTTS|SETS: Leveraging|Representation Consistency`.
  - Candidate count: 3.
  - Discovered: 3.
  - Duplicates: 0.
  - Source-available candidates: 3.
  - DB delta: 0 batches, 0 candidates.
- ArXiv dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-testtime-title-allowlist-arxiv-dry-run-b10-candidate-discovery-report.json`
  - Candidate count: 0.
  - Discovered: 0.
  - DB delta: 0 batches, 0 candidates.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b10-testtime-title-allowlist-apply-b10-candidate-discovery-report.json`
  - Batch ID: `1a6c1e1a-2aa2-4a04-bde3-a69df42497ea`.
  - Batch code: `B10-20260607T-b10-testtime-title-allowlist-apply`.
  - Persist filter: `B10_PERSIST_STATUSES=DISCOVERED`.
  - Persisted 3 discovered candidates:
    - `AgentTTS: Large Language Model Agent for Test-time Compute-optimal Scaling Strategy in Complex Tasks`.
    - `Budget-aware Test-time Scaling via Discriminative Verification`.
    - `SETS: Leveraging Self-Verification and Self-Correction for Improved Test-Time Scaling`.
  - DB delta: 1 batch, 3 candidates.
  - No `LiteratureRecord` rows were created.
  - Counting after apply:
    - candidate pool records: 542.
    - candidate discovered records: 241.
    - managed corpus records: 265.
    - effective literature records: 265.
    - pipeline incomplete/blocker/not-started: 0.

## Theory-Support Expansion Gate
- D44 baseline:
  - audited effective `collection:theory-support` records: 19.
  - target-qualified records: 17.
  - scope-borderline records: 2, not counted toward target 50.
  - remaining gap: 33 records.
- Slot gaps after D44:
  - serving scheduling: 11.
  - RAG allocation: 10.
  - test-time budget: 10.
  - math foundation: 2.
- D45 B10 priority:
  - add a dedicated serving-scheduling theory track before using another broad mixed-catalog run. Completed in `b10-scaleout-v2d`.
  - run narrow query/title allowlists for RAG allocation and test-time budgeting theory-support.
  - keep math-foundation applies small and bridge-justified; do not import broad mathematics that lacks a direct allocation/budgeting bridge.
- Apply gate:
  - dry-run first and review new titles before writing candidates.
  - use source-available filters when the immediate goal is B11/B12 throughput.
  - persist only clean `DISCOVERED` rows for exact-title allowlists.

## D45 Theory-Support Apply
- Catalog:
  - query catalog version: `b10-scaleout-v2d`.
  - new track: `llm-serving-resource-allocation-theory`.
- Source-available dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d45-theory-targeted-source-available-dry-run-b10-candidate-discovery-report.json`
  - candidate count: 131.
  - discovered: 55.
  - duplicates: 76.
  - collection role split: 131 `collection:theory-support`.
- Narrow title allowlist dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d45-theory-title-allowlist-narrow-dry-run-b10-candidate-discovery-report.json`
  - candidate count: 34.
  - discovered: 21.
  - duplicates: 13.
  - source-available candidates: 34.
  - DB delta: 0 batches, 0 candidates.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d45-theory-title-allowlist-apply-b10-candidate-discovery-report.json`
  - batch id: `e4813106-7d45-4a89-ae56-472caa87e551`.
  - batch code: `B10-20260608T-d45-theory-title-allowlist-apply`.
  - persisted 21 discovered candidates and skipped duplicate rows.
  - DB delta: 1 batch, 21 candidates.
  - no `LiteratureRecord` rows were created.
  - counting after B11 status apply:
    - candidate pool records: 563.
    - candidate discovered records: 238.
    - candidate ready-for-promotion records: 39.
    - managed corpus records: 268.
    - effective literature records: 268.
    - pipeline incomplete/blocker/not-started: 0.

## D47 RAG/Test-Time Theory Refill
- OpenAlex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d47-rag-testtime-theory-refill-dry-run-b10-candidate-discovery-report.json`
  - track ids: `rag-aware-allocation-theory`, `test-time-compute-budgeting-theory`.
  - source-available filter: enabled.
  - candidate count: 9.
  - discovered: 3.
  - duplicates: 6.
  - direction split: 5 RAG-aware allocation and 4 test-time compute budgeting.
  - collection role split: 9 `collection:theory-support`.
  - review result: only `CARROT: A Learned Cost-Constrained Retrieval Optimization System for RAG` was clean enough to apply.
- Test-time arXiv/query dry-run artifacts:
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d47-testtime-theory-arxiv-refill-dry-run-b10-candidate-discovery-report.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d47-testtime-exact-title-refill-dry-run-b10-candidate-discovery-report.json`
  - `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d47-testtime-exact-title-arxiv-refill-dry-run-b10-candidate-discovery-report.json`
  - result: no clean new test-time theory candidate was applied.
  - `Thinking with Imagination` was treated as off-target for compute-budget theory.
  - `Plan and Budget` was already in the formal corpus as `LIT-0238`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d47-rag-theory-carrot-apply-b10-candidate-discovery-report.json`
  - batch id: `a47a8726-f3d2-467d-85e3-05cc3b82e234`.
  - batch code: `B10-20260608T-d47-rag-theory-carrot-apply`.
  - persisted 1 discovered candidate and skipped duplicate rows.
  - persisted candidate id: `c12577e9-e76a-4dcc-b8ed-8a033f3638d4`.
  - DB delta: 1 batch, 1 candidate.
  - no `LiteratureRecord` rows were created.
  - counting after apply:
    - candidate pool records: 564.
    - candidate discovered records: 239.
    - managed corpus records: 274.
    - effective literature records: 274.
    - pipeline incomplete/blocker/not-started: 0.

## D48 Test-Time Theory Source Check
- Goal:
  - supplement test-time theory without importing weak or duplicate candidates into the pool.
  - prefer source-backed formal records or already-staged exact-title candidates over broad provider noise.
- Primary-source review:
  - selected `A Relative-Budget Theory for Reinforcement Learning with Verifiable Rewards in Large Language Model Reasoning` as a clean test-time theory target because it formalizes token budget, time-to-solution, and RLVR sample-efficiency regimes.
  - arXiv id: `2602.01523`.
- Exact-title B10 checks:
  - arXiv dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d48-testtime-theory-exact-title-dry-run-b10-candidate-discovery-report.json`
  - OpenAlex dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d48-testtime-theory-openalex-exact-title-dry-run-b10-candidate-discovery-report.json`
  - arXiv exact-title dry-run found 0 candidates.
  - OpenAlex exact-title dry-run found only duplicate rows for `A Relative-Budget Theory`; no new `DISCOVERED` row was written.
- Candidate-layer decision:
  - no D48 test-time B10 apply was needed.
  - the existing duplicate candidate pair was repaired and adjudicated in B11 so the candidate layer ended with one `PROMOTED` row and one `DUPLICATE` row matched to the promoted literature.
- Counting after D48 B11/B12/retag:
  - candidate pool records: 564.
  - candidate discovered records: 237.
  - candidate promoted records: 133.
  - managed corpus records: 276.
  - effective literature records: 276.
  - pipeline incomplete/blocker/not-started: 0.
