# 04 Verification

## Verification Log

### 2026-06-04 - Task Package Setup
- Status: passed.
- Checks:
  - Task package created under `dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion`.

### 2026-06-04 - B7 Frontier Three-Direction Expansion
- Status: passed.
- Checks:
  - `node --check dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b7-frontier-three-direction-expansion.mjs`
    - Result: passed.
  - `git diff --check -- dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion`
    - Result: passed.
  - Dry-run:
    - `B7_USE_EXACT_PLAN=1 B7_IMPORT_PER_DIRECTION_LIMIT=6 ARXIV_B7_DELAY_MS=700 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b7-frontier-three-direction-expansion.mjs --exact-plan`
    - Result: passed.
    - Discovered candidates: 20.
    - Existing DB matches: 2.
    - Selected candidates: 15.
    - DB deltas: 0/0/0/0/0/0.
  - Controlled import:
    - `B7_USE_EXACT_PLAN=1 B7_IMPORT_PER_DIRECTION_LIMIT=6 ARXIV_B7_DELAY_MS=900 ARXIV_B7_TIMEOUT_MS=30000 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b7-frontier-three-direction-expansion.mjs --exact-plan --apply`
    - Result: passed.
    - Import status: 200.
    - Discovered candidates: 21.
    - Existing DB matches: 2.
    - Selected/imported candidates: 16.
    - Direction coverage: RAG-aware 5, LLM serving 5, test-time compute 6.
    - New records: `LIT-0290` through `LIT-0305`.
    - Safety deltas: LiteratureRecord +16, LiteratureSource +16, LiteraturePipelineRun 0, LiteratureContentAsset 0, LiteratureContentProcessingBatchJob 0, LiteratureFulltextAcquisitionJob 0.
  - DB spot-check:
    - Result: passed; all 16 B7 records have `batch:b7-frontier-three-direction-expansion`, one `collection:*` tag, one direction tag, a priority tag, non-empty authors, and abstract metadata.
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed; registered T-119 under `M-000/F-000`.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed.

### 2026-06-04 - B8 OpenAlex Discovery-Pool Scaleout
- Status: passed.
- Checks:
  - `node --check dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b8-direction-balanced-scaleout.mjs`
    - Result: passed.
  - `git diff --check -- dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion`
    - Result: passed.
  - Dry-run:
    - `OPENALEX_B8_QUERY_PER_PAGE=80 B8_IMPORT_PER_DIRECTION_LIMIT=8 OPENALEX_B8_DELAY_MS=500 OPENALEX_B8_TIMEOUT_MS=30000 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b8-direction-balanced-scaleout.mjs`
    - Result: passed.
    - Discovery candidates after strict filtering: 190.
    - Existing DB matches: 20.
    - Selected candidates: 19.
    - DB deltas: 0/0/0/0/0/0.
  - Controlled import:
    - `OPENALEX_B8_QUERY_PER_PAGE=80 B8_IMPORT_PER_DIRECTION_LIMIT=8 OPENALEX_B8_DELAY_MS=500 OPENALEX_B8_TIMEOUT_MS=30000 node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion/tools/b8-direction-balanced-scaleout.mjs --apply`
    - Result: passed.
    - Import status: 200.
    - Discovered candidates: 190.
    - Existing DB matches: 20.
    - Selected/imported candidates: 19.
    - Direction coverage: RAG-aware 3, LLM serving 8, test-time compute 8.
    - New records: `LIT-0306` through `LIT-0324`.
    - Safety deltas: LiteratureRecord +19, LiteratureSource +19, LiteraturePipelineRun 0, LiteratureContentAsset 0, LiteratureContentProcessingBatchJob 0, LiteratureFulltextAcquisitionJob 0.
  - DB spot-check:
    - Result: passed; all 19 B8 records have `batch:b8-direction-balanced-scaleout`, one `collection:*` tag, one direction tag, a priority tag, non-empty authors, abstract metadata, and one source row.
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed.
