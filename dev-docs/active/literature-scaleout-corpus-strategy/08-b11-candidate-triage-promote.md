# 08 B11 Candidate Triage And Promote

## Status
- State: first B11 triage/promote entrypoint implemented and pilot-verified.
- Pilot apply/promote: completed for the B10 OpenAlex pilot batch.
- Full 200-300 promotion run: pending broader B10 scaleout and B12 readiness.

## Entrypoint
- Script: `tools/b11-candidate-triage-promote.mjs`
- Default mode: dry-run.
- Triage apply mode: pass `--apply`.
- Promote mode: pass `--apply --promote`.
- Writes in `--apply`:
  - `LiteratureDiscoveryCandidate.status`
  - duplicate match fields
  - decision reason/time
  - touched batch summary status counts
- Additional writes in `--apply --promote`:
  - `LiteratureRecord`
  - `LiteratureSource`
  - `LiteratureDiscoveryCandidate.promotedLiteratureId`
- Does not write:
  - content assets
  - fulltext documents
  - key-content dossiers
  - embedding/index rows

## Configuration
- `B11_TRIAGE_RUN_ID`: run id used in artifacts and decision reasons.
- `B11_BATCH_ID`: optional candidate batch id filter.
- `B11_BATCH_CODE`: optional candidate batch code filter.
- `B11_CANDIDATE_IDS`: optional comma-separated explicit candidate id allowlist.
- `B11_CANDIDATE_STATUS`: comma-separated source statuses, default `DISCOVERED`.
- `B11_MAX_CANDIDATES`: maximum candidates to evaluate.
- `B11_MAX_PROMOTIONS`: maximum candidates to promote when `--promote` is enabled.
- `B11_READY_THRESHOLD`: score threshold for `READY_FOR_PROMOTION`.
- `B11_DEFER_THRESHOLD`: score threshold for `DEFERRED` versus `REJECTED`.

## Triage Rules
- Existing `LiteratureRecord` matches are authoritative duplicates.
- Existing `LiteratureSource` matches are authoritative duplicates for promotion safety.
- Existing non-discovered candidate matches are duplicate signals.
- Same-run candidate duplicates are marked and linked before promotion.
- High-fit candidates become `READY_FOR_PROMOTION`.
- Domain-specific RAG tails, benchmark/survey tails, and position papers are held as `DEFERRED` unless later rules promote them.
- Application recipe tails are `REJECTED`.

## Promote Boundary
- Promotion reuses `LiteratureService.collectionImport`.
- Source provider mapping:
  - arXiv candidates use `provider=arxiv`.
  - OpenAlex and Semantic Scholar candidates use `provider=web` with a source item id prefix.
- Promoted literature receives:
  - `corpus:managed`
  - one `direction:*` tag
  - one `collection:*` tag
  - one `batch:*` tag
  - one `triage:*` tag
- If promotion finds an existing literature match, the candidate is marked `DUPLICATE` rather than `PROMOTED`.

## Pilot Dry Run
- Artifact: `artifacts/20260606T-b11-tight-triage-dry-run-b11-candidate-triage-report.json`
- Input:
  - batch id: `0caeeefb-735f-410d-aa88-7fedc187c6f3`
  - source status: `DISCOVERED`
  - candidates evaluated: 54
- Result:
  - `READY_FOR_PROMOTION`: 41.
  - `DEFERRED`: 9.
  - `DUPLICATE`: 2.
  - `REJECTED`: 2.
  - DB delta: 0.

## Pilot Apply And Promote
- Artifact: `artifacts/20260606T-b11-pilot-apply-promote-b11-candidate-triage-report.json`
- Command:

```bash
TS_NODE_TRANSPILE_ONLY=true B11_TRIAGE_RUN_ID=20260606T-b11-pilot-apply-promote \
  B11_BATCH_ID=0caeeefb-735f-410d-aa88-7fedc187c6f3 \
  B11_CANDIDATE_STATUS=DISCOVERED B11_MAX_CANDIDATES=80 B11_MAX_PROMOTIONS=10 \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  dev-docs/active/literature-scaleout-corpus-strategy/tools/b11-candidate-triage-promote.mjs \
  --apply --promote
```

- Result:
  - candidates evaluated: 54.
  - status decisions before promotion:
    - `READY_FOR_PROMOTION`: 41.
    - `DEFERRED`: 9.
    - `DUPLICATE`: 2.
    - `REJECTED`: 2.
  - promotions attempted: 10.
  - promotions succeeded: 10.
  - DB delta:
    - `LiteratureRecord`: +10.
    - `LiteratureSource`: +10.
    - candidate rows: 0.

## Promoted Records
- `LIT-0153`: BudgetThinker: Empowering Budget-aware LLM Reasoning with Control Tokens.
- `LIT-0154`: Token-Budget-Aware LLM Reasoning.
- `LIT-0155`: Inference Scaling Laws: An Empirical Analysis of Compute-Optimal Inference for Problem-Solving with Language Models.
- `LIT-0156`: Cloud Native System for LLM Inference Serving.
- `LIT-0157`: Efficient LLM Serving Under Variable Cloud Traffic Loads.
- `LIT-0158`: ElasticMM: Efficient Multimodal LLMs Serving with Elastic Multimodal Parallelism.
- `LIT-0159`: HexAGenT: Efficient Agentic LLM Serving via Workflow- and Heterogeneity-Aware Scheduling.
- `LIT-0160`: Infinite-LLM: Efficient LLM Service for Long Context with DistAttention and Distributed KVCache.
- `LIT-0161`: KVDirect: Distributed Disaggregated LLM Inference.
- `LIT-0162`: NetKV: Network-Aware Decode Instance Selection for Disaggregated LLM Inference.

## Counting At B11 Promotion
- Artifact: `artifacts/20260606T-after-b11-pilot-apply-promote-counting.json`
- Metrics:
  - candidate pool records: 62.
  - candidate discovered records: 0.
  - candidate ready-for-promotion records: 31.
  - candidate promoted records: 10.
  - candidate duplicate records: 8.
  - candidate rejected records: 4.
  - candidate deferred records: 9.
  - managed corpus records at checkpoint: 156.
  - effective literature records: 144.
  - pipeline incomplete records: 12.
  - pipeline blocked records: 2.
  - pipeline not-started records: 10.

## Next Gate
- Superseded by B12 pilot in `09-b12-standard-pipeline-pilot.md`.
- B12 acquired and preprocessed fulltext for all 10 promoted records.
- `LIT-0153` through `LIT-0162` completed through `INDEXED` and now count as effective literature.
- Current B12 managed-corpus blockers are 0; source-access records `LIT-0163`, `LIT-0166`, and `LIT-0257` remain soft-excluded from the resource pool.
- `LIT-0167` through `LIT-0172` completed through `INDEXED` in the arXiv-ready RAG tranche.
- Current B13 checkpoint: 20 promoted candidates, 20 ready candidates, managed corpus 163, effective literature 163, and 0 incomplete/blocker/not-started records.

## Opportunity Tranche2
- Artifact: `artifacts/20260607T-b11-opportunity-tranche2-apply-promote-b11-candidate-triage-report.json`
- Dry-run artifact: `artifacts/20260607T-b11-opportunity-tranche2-dry-run-b11-candidate-triage-report.json`
- Input:
  - source status: `READY_FOR_PROMOTION`.
  - candidates evaluated: 31.
  - max promotions: 4.
- Result:
  - decisions: 30 `READY_FOR_PROMOTION`, 1 `DUPLICATE`.
  - promotions attempted: 4.
  - promotions succeeded: 4.
  - DB delta: 4 `LiteratureRecord` rows and 4 `LiteratureSource` rows.
- Promoted records:
  - `LIT-0163`: NeuStream: Bridging Deep Learning Serving and Stream Processing.
  - `LIT-0164`: Observation, Not Prediction: Conversation-Level Disaggregated Scheduling for Agentic Serving.
  - `LIT-0165`: RTP-LLM: High-Performance Alibaba LLM Inference Engine.
  - `LIT-0166`: WindServe: Efficient Phase-Disaggregated LLM Serving with Stream-based Dynamic Scheduling.
- After B12 opportunity processing:
  - `LIT-0164` and `LIT-0165` completed through `INDEXED`.
  - `LIT-0163` and `LIT-0166` were later soft-excluded because no rights-safe automatically downloadable fulltext was available.

## ArXiv-Ready RAG Tranche
- Artifacts:
  - `artifacts/20260607T-b11-arxiv-ready-tranche-dry-run-b11-candidate-triage-report.json`
  - `artifacts/20260607T-b11-arxiv-ready-tranche-apply-promote-b11-candidate-triage-report.json`
  - `artifacts/20260607T-b11-arxiv-ready-tranche-vendi-reconcile.json`
  - `artifacts/20260607T-after-b11-arxiv-ready-tranche-reconcile.json`
- Input:
  - source status: `READY_FOR_PROMOTION`.
  - explicit candidate ids: six arXiv-backed RAG-aware allocation candidates.
  - max promotions: 6.
- Result:
  - dry-run kept all six candidates at `READY_FOR_PROMOTION`.
  - apply/promote created `LIT-0167` through `LIT-0172`.
  - five promotions completed normally.
  - `LIT-0172` was reconciled after a sparse-ID source collision left the `LiteratureRecord` without source/pipeline/candidate link.
  - code now allocates `LIT-*` and `LSRC-*` from existing high-water marks to prevent repeat `count+1` collisions.
- Promoted records:
  - `LIT-0167`: Adaptive Retrieval-Augmented Generation for Conversational Systems.
  - `LIT-0168`: CDF-RAG: Causal Dynamic Feedback for Adaptive Retrieval-Augmented Generation.
  - `LIT-0169`: CtrlA: Adaptive Retrieval-Augmented Generation via Inherent Control.
  - `LIT-0170`: Embedding-Informed Adaptive Retrieval-Augmented Generation of Large Language Models.
  - `LIT-0171`: MBA-RAG: a Bandit Approach for Adaptive Retrieval-Augmented Generation through Question Complexity.
  - `LIT-0172`: Vendi-RAG: Adaptively Trading-Off Diversity And Quality Significantly Improves Retrieval Augmented Generation With LLMs.
- After B12 processing:
  - all six records completed through `INDEXED` via arXiv fulltext acquisition and source-grounded `codex_curated` dossiers.
  - B13 after completion reports 20 promoted candidates, 20 ready candidates, managed corpus 163, effective literature 163, and 0 incomplete/blocker/not-started records.
