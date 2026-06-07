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
- Output boundary:
  - lightweight triage report: `dev-docs/active/literature-scaleout-corpus-strategy/artifacts/`
  - per-candidate decision list and detail payload: `.ai/.tmp/literature-scaleout-corpus-strategy/`
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

## Test-Time Targeted Batch Dry Run
- Artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-v2b-testtime-batch-dry-run-b11-candidate-triage-report.json`
- Decision artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-v2b-testtime-batch-dry-run-b11-candidate-decisions.json`
- Input:
  - batch id: `0a9edeac-9cd4-48c9-95cb-03d6e2f9a72b`
  - source status: `DISCOVERED`
  - candidates evaluated: 76
  - max promotions in dry-run planning: 20
- Result:
  - `READY_FOR_PROMOTION`: 47.
  - `DEFERRED`: 24.
  - `DUPLICATE`: 3.
  - `REJECTED`: 2.
  - ready candidates with arXiv URL: 27.
  - ready candidates with DOI URL: 20.
  - DB delta: 0.
- Decision:
  - Do not promote all 47 ready candidates as a single tranche.
  - Prefer explicit arXiv-backed candidate ids first, because the ready set still includes medical, multimodal, and MCTS application tails that should be reviewed before entering `LiteratureRecord`.

## Test-Time ArXiv Tranche
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-v2b-testtime-arxiv-tranche-dry-run-b11-candidate-triage-report.json`
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-v2b-testtime-arxiv-tranche-apply-promote-b11-candidate-triage-report.json`
- Input:
  - batch id: `0a9edeac-9cd4-48c9-95cb-03d6e2f9a72b`
  - source status: `DISCOVERED`
  - explicit candidate ids: 12 arXiv-backed test-time compute/reasoning candidates.
  - max promotions: 12.
- Result:
  - dry-run kept all 12 candidates at `READY_FOR_PROMOTION`.
  - apply/promote attempted 12 promotions.
  - apply/promote succeeded for all 12.
  - DB delta: 12 `LiteratureRecord` rows and 12 `LiteratureSource` rows.
- Promoted records:
  - `LIT-0350`: Rethinking the Role of Prompting Strategies in LLM Test-Time Scaling: A Perspective of Probability Theory.
  - `LIT-0351`: Avoiding Overthinking and Underthinking: Curriculum-Aware Budget Scheduling for LLMs.
  - `LIT-0352`: Just Enough Thinking: Efficient Reasoning with Adaptive Length Penalties Reinforcement Learning.
  - `LIT-0353`: CMCTS: A Constrained Monte Carlo Tree Search Framework for Mathematical Reasoning in Large Language Model.
  - `LIT-0354`: Monte Carlo Tree Search Boosts Reasoning via Iterative Preference Learning.
  - `LIT-0355`: Rewarding Progress: Scaling Automated Process Verifiers for LLM Reasoning.
  - `LIT-0356`: rStar-Math: Small LLMs Can Master Math Reasoning with Self-Evolved Deep Thinking.
  - `LIT-0357`: Reasoning Aware Self-Consistency: Leveraging Reasoning Paths for Efficient LLM Sampling.
  - `LIT-0358`: Beyond Chinchilla-Optimal: Accounting for Inference in Language Model Scaling Laws.
  - `LIT-0359`: Optimizing Anytime Reasoning via Budget Relative Policy Optimization.
  - `LIT-0360`: Wider or Deeper? Scaling LLM Inference-Time Compute with Adaptive Branching Tree Search.
  - `LIT-0361`: Certainty-Guided Reasoning in Large Language Models: A Dynamic Thinking Budget Approach.
- Counting after promotion:
  - candidate pool records: 535.
  - promoted candidates: 32.
  - managed corpus records: 175.
  - effective literature records: 163.
  - pipeline incomplete records: 12.
  - pipeline not-started records: 12.
  - pipeline blocked records: 0.

## Source-Available Tranche3
- Ready-pool audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-ready-audit.json`
- Discovered-pool audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-discovered-audit.json`
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche3-dry-run-b11-candidate-triage-report.json`
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche3-apply-promote-b11-candidate-triage-report.json`
- Candidate link artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche3-promoted-links.json`
- Input:
  - ready-pool audit found 20 remaining `READY_FOR_PROMOTION` candidates, all DOI resolver records.
  - discovered-pool audit found 185 arXiv-backed `DISCOVERED` candidates.
  - explicit candidate ids: 10 arXiv-backed records selected from `DISCOVERED`.
  - max promotions: 6.
- Result:
  - dry-run decisions: 6 `READY_FOR_PROMOTION`, 4 `DUPLICATE`.
  - apply/promote attempted 6 promotions and succeeded for all 6.
  - DB delta: 6 `LiteratureRecord` rows and 6 `LiteratureSource` rows.
  - duplicate candidates were reverse-marked `DUPLICATE` and did not enter the managed corpus.
- Promoted records:
  - `LIT-0362`: Accelerating Adaptive Retrieval Augmented Generation via Instruction-Driven Representation Reduction of Retrieval Overlaps.
  - `LIT-0363`: DAT: Dynamic Alpha Tuning for Hybrid Retrieval in Retrieval-Augmented Generation.
  - `LIT-0364`: SeaKR: Self-aware Knowledge Retrieval for Adaptive Retrieval Augmented Generation.
  - `LIT-0365`: ZebraLogic: On the Scaling Limits of LLMs for Logical Reasoning.
  - `LIT-0366`: Evolving Deeper LLM Thinking.
  - `LIT-0367`: Entropy-Regularized Process Reward Model.
- Counting after B12 completion:
  - candidate pool records: 535.
  - promoted candidates: 38.
  - duplicate candidates: 145.
  - managed corpus records: 181.
  - effective literature records: 181.
  - pipeline incomplete records: 0.
  - pipeline not-started records: 0.
  - pipeline blocked records: 0.

## Source-Available Tranche4
- Discovered-pool audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche4-discovered-audit.json`
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche4-dry-run-b11-candidate-triage-report.json`
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche4-apply-promote-b11-candidate-triage-report.json`
- Candidate link artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche4-promoted-links.json`
- Input:
  - discovered-pool audit found 175 arXiv-backed `DISCOVERED` candidates.
  - explicit candidate ids: 10 arXiv-backed records selected from `DISCOVERED`.
  - max promotions: 9.
- Result:
  - dry-run decisions: 9 `READY_FOR_PROMOTION`, 1 `DUPLICATE`.
  - apply/promote attempted 9 promotions and succeeded for all 9.
  - DB delta: 9 `LiteratureRecord` rows and 9 `LiteratureSource` rows.
  - duplicate `DualPath` candidate was reverse-marked `DUPLICATE` and did not enter the managed corpus.
- Promoted records:
  - `LIT-0368`: Certifiably Robust RAG against Retrieval Corruption.
  - `LIT-0369`: MAO-ARAG: Multi-Agent Orchestration for Adaptive Retrieval-Augmented Generation.
  - `LIT-0370`: TAdaRAG: Task Adaptive Retrieval-Augmented Generation via On-the-Fly Knowledge Graph Construction.
  - `LIT-0371`: UltraRAG: A Modular and Automated Toolkit for Adaptive Retrieval-Augmented Generation.
  - `LIT-0372`: EconoServe: Maximizing Multi-Resource Utilization with SLO Guarantees in LLM Serving.
  - `LIT-0373`: HexGen-2: Disaggregated Generative Inference of LLMs in Heterogeneous Environment.
  - `LIT-0374`: Beyond Examples: High-level Automated Reasoning Paradigm in In-Context Learning via MCTS.
  - `LIT-0375`: General Purpose Verification for Chain of Thought Prompting.
  - `LIT-0376`: Improving the Reliability of LLMs: Combining CoT, RAG, Self-Consistency, and Self-Verification.
- Counting after B12 completion:
  - candidate pool records: 535.
  - promoted candidates: 47.
  - duplicate candidates: 146.
  - managed corpus records: 190.
  - effective literature records: 190.
  - pipeline incomplete records: 0.
  - pipeline not-started records: 0.
  - pipeline blocked records: 0.

## Source-Available Tranche5
- ArXiv-backed discovered audit artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/20260607T-b11-source-available-tranche5-arxiv-audit.json`
- ArXiv-pool dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche5-arxiv-pool-dry-run-b11-candidate-triage-report.json`
- Explicit dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche5-dry-run-b11-candidate-triage-report.json`
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260607T-b11-source-available-tranche5-apply-promote-b11-candidate-triage-report.json`
- Candidate link artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/20260607T-b11-source-available-tranche5-promoted-links.json`
- Input:
  - arXiv-backed `DISCOVERED` pool audit found 165 candidates: 53 RAG-aware allocation, 81 LLM-serving/resource allocation, and 31 test-time compute.
  - B11 dry-run over the 165-candidate arXiv pool found 77 `READY_FOR_PROMOTION`, 78 `DEFERRED`, 8 `DUPLICATE`, and 2 `REJECTED`.
  - explicit tranche ids: 10 arXiv-backed records selected after filtering obvious application-tail ready candidates.
  - max promotions: 10.
- Result:
  - explicit dry-run decisions: 10 `READY_FOR_PROMOTION`.
  - apply/promote attempted 10 promotions and succeeded for all 10.
  - DB delta: 10 `LiteratureRecord` rows and 10 `LiteratureSource` rows.
- Promoted records:
  - `LIT-0377`: MAIN-RAG: Multi-Agent Filtering Retrieval-Augmented Generation.
  - `LIT-0378`: RetrievalQA: Assessing Adaptive Retrieval-Augmented Generation for Short-form Open-Domain Question Answering.
  - `LIT-0379`: Rowen: Adaptive Retrieval-Augmented Generation for Hallucination Mitigation in LLMs.
  - `LIT-0380`: WeKnow-RAG: An Adaptive Approach for Retrieval-Augmented Generation Integrating Web Search and Knowledge Graphs.
  - `LIT-0381`: Does Inference Scaling Improve Reasoning Faithfulness? A Multi-Model Analysis of Self-Consistency Tradeoffs.
  - `LIT-0382`: Compute Or Load KV Cache? Why Not Both?
  - `LIT-0383`: Inference without Interference: Disaggregate LLM Inference for Mixed Downstream Workloads.
  - `LIT-0384`: Aladdin: Joint Placement and Scaling for SLO-Aware LLM Serving.
  - `LIT-0385`: No Train Still Gain. Unleash Mathematical Reasoning of Large Language Models with Monte Carlo Tree Search Guided by Energy Function.
  - `LIT-0386`: Efficient LLM Scheduling by Learning to Rank.
- Counting after B12 completion:
  - candidate pool records: 535.
  - discovered candidates: 299.
  - promoted candidates: 57.
  - managed corpus records: 200.
  - effective literature records: 200.
  - pipeline incomplete records: 0.
  - pipeline not-started records: 0.
  - pipeline blocked records: 0.
