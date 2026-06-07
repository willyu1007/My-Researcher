# 07 B10 Candidate Discovery

## Status
- State: first entrypoint implemented, provider-hardened, and pilot-applied.
- Pilot apply: completed for 60 OpenAlex candidates.
- Scaleout run: pending for 500-800 candidates.

## Entrypoint
- Script: `tools/b10-candidate-discovery.mjs`
- Default mode: dry-run.
- Apply mode: pass `--apply`.
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
- `B10_QUERY_LIMIT`: queries per track.
- `B10_PROVIDER_RESULT_LIMIT`: provider results per query.
- `B10_MAX_CANDIDATES`: maximum candidates staged from one run.
- `B10_REQUEST_TIMEOUT_MS`: per-request timeout.
- `B10_PROVIDER_RETRIES`: retry count per provider request.
- `B10_REQUEST_DELAY_MS`: non-arXiv provider delay.
- `B10_ARXIV_DELAY_MS`: arXiv provider delay.
- `B10_MIN_YEAR`: minimum publication year.
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
- Do not run 500-800 candidate scaleout until:
  - B11 triage can score and mark the 54 discovered pilot candidates.
  - Semantic Scholar API key or provider budget behavior is confirmed, or provider remains skipped in `auto`.
  - arXiv request reliability is rechecked with normal delay and timeout, or provider remains explicit-only.
  - OpenAlex query catalog is expanded beyond the current 108-candidate dry-run envelope.
  - B13 counting is run before and after the batch.
