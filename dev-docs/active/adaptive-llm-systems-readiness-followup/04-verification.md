# 04 Verification

## Verification Log

### 2026-06-04 - Task Setup
- Status: passed.
- Checks:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed.

### 2026-06-04 - F1 Classic RAG Anchor Import
- Status: passed.
- Checks:
  - Syntax:
    - `node --check dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f1-import-missing-core-classic.mjs`
      - Result: passed.
  - Check-only:
    - `node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f1-import-missing-core-classic.mjs`
      - Result: passed; no DB writes, all deltas 0.
  - Apply:
    - `node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f1-import-missing-core-classic.mjs --apply`
      - Result: passed after adding arXiv fetch retry.
      - Imported/reconciled ID: `LIT-0283`.
      - Import route status: 200.
      - `LiteratureRecord` delta: 1.
      - `LiteratureSource` delta: 1.
      - `LiteraturePipelineRun` delta: 0.
      - `LiteratureContentAsset` delta: 0.
      - `LiteratureContentProcessingBatchJob` delta: 0.
      - `LiteratureFulltextAcquisitionJob` delta: 0.
      - Acceptance: anchor exists, source provenance present, required tags present, no content-processing side effects.

### 2026-06-04 - F2 Fulltext/Code/Protocol Readiness
- Status: passed.
- Checks:
  - Syntax:
    - `node --check dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f2-fulltext-code-readiness.mjs`
      - Result: passed.
  - Readiness generation:
    - `node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f2-fulltext-code-readiness.mjs`
      - Result: passed.
      - Target count: 39.
      - Experiment-foundation candidates: 15.
      - P0 research seeds: 24.
      - F1 anchor targets: 1.
      - Verified code repositories: 11.
      - High runnable-feasibility candidates: 10.
      - Needs manual follow-up: 16.
      - `LiteraturePipelineRun` count: 0.
      - `LiteratureContentAsset` count: 0.
      - `LiteratureContentProcessingBatchJob` count: 0.
      - `LiteratureFulltextAcquisitionJob` count: 0.

### 2026-06-04 - Corpus Artifact Boundary Cleanup
- Status: passed.
- Checks:
  - Syntax:
    - `node --check dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f2-fulltext-code-readiness.mjs`
      - Result: passed.
  - Manifest migration:
    - Result: passed; migrated former repo detailed snapshots to lightweight manifests and ignored `.ai/.tmp` local copies.
    - Manifest files:
      - `artifacts/f2-readiness-targets-manifest.json`.
      - `artifacts/f2-fulltext-code-readiness-manifest.json`.
  - Readiness generation after deleting repo detailed snapshots:
    - `node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs dev-docs/active/adaptive-llm-systems-readiness-followup/tools/f2-fulltext-code-readiness.mjs`
      - Result: passed.
      - Target count: 39.
      - Verified code repositories: 11.
      - High runnable-feasibility candidates: 10.
      - Needs manual follow-up: 16.
      - Detailed local JSON paths:
        - `.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-readiness-targets.json`.
        - `.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-fulltext-code-readiness.json`.
  - Repo detailed snapshot absence:
    - Result: passed; `artifacts/f2-readiness-targets.json` and `artifacts/f2-fulltext-code-readiness.json` are not present in the task bundle.
  - Governance:
    - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
      - Result: passed.
    - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
      - Result: passed.

### 2026-06-04 - Governance Closure
- Status: passed.
- Checks:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed with no warnings.
