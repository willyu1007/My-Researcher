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
