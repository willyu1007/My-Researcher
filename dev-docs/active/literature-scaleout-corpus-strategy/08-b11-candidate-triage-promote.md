# 08 B11 Candidate Triage And Promote

## Status
- State: implemented and used for local DB promotion.
- Latest B11 DB-writing run: D64 wide source-available apply/promote.
- Current candidate state:
  - 216 `DISCOVERED`
  - 14 `READY_FOR_PROMOTION`
  - 220 `PROMOTED`
  - 139 `DUPLICATE`
  - 15 `DEFERRED`
  - 4 `REJECTED`
- Current recommendation: refill RAG/test-time source-backed candidates before the next apply; current clean ready supply is serving-weighted.

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
- `B11_MAX_PROMOTIONS`: maximum candidates to promote.
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
- Promoted literature receives:
  - `corpus:managed`
  - one `direction:*` tag
  - one `collection:*` tag
  - one `batch:*` tag
  - one `triage:*` tag
- If promotion finds an existing literature match, the candidate is marked `DUPLICATE` rather than `PROMOTED`.
- Promotion alone does not make literature effective; B12 must complete through `INDEXED`.

## Selector Lessons
- Broad `DISCOVERED` dry-runs can identify many ready candidates, but source-backed ready candidates may still be application-tail or direction-tail.
- D53 strict source-backed selector selected 0 candidates from the broad pool after tail filtering.
- D54 and D55 showed that exact-title/source-backed B10 refill produces cleaner B11 promotion input than direct broad-pool promotion.
- D64 codified the D63 manual exclusions for chart/table/text-to-image/test-time-finetuning test-time tails in the source-available selector.

## Recent Promotion Ledger

| Run | Input | B11 result | Literature range | B12 result |
| --- | --- | --- | --- | --- |
| D39 | selector-filtered source-available tranche9 | 14 promoted | `LIT-0427`-`LIT-0440` | completed |
| D40 | near-threshold high-signal tranche10 | 9 promoted | `LIT-0441`-`LIT-0449` | completed |
| D42 | RAG-core allowlist | 2 promoted | `LIT-0450`-`LIT-0451` | completed |
| D43 | test-time exact-title allowlist | 3 promoted | `LIT-0452`-`LIT-0454` | completed |
| D46 | theory-support small tranche | 6 promoted | `LIT-0455`-`LIT-0460` | completed |
| D48 | CARROT plus Relative-Budget theory | 2 promoted | `LIT-0461`-`LIT-0462` | completed |
| D49 | serving/RAG theory tranche | 6 promoted | `LIT-0463`-`LIT-0468` | completed |
| D50 | serving theory closure | 4 promoted | `LIT-0469`-`LIT-0472` | completed |
| D51 | RAG/test-time/math theory tranche | 4 promoted | `LIT-0473`-`LIT-0476` | completed |
| D52 | exact-title theory target closure | 7 promoted | `LIT-0477`-`LIT-0483` | completed |
| D54 | balanced RAG/test-time source-backed | 6 promoted | `LIT-0484`-`LIT-0489` | completed |
| D55 | source-backed exact-title | 11 promoted | `LIT-0490`-`LIT-0500` | completed |
| D57 | serving/resource-allocation exact-title | 12 promoted | `LIT-0501`-`LIT-0512` | completed |
| D58 | RAG/test-time duplicate-loop cleanup | 4 promoted | `LIT-0513`-`LIT-0516` | completed |
| D59 | serving source-backed curated expansion | 4 promoted, 4 deferred | `LIT-0517`-`LIT-0520` | completed |
| D60 | RAG/test-time direction-balance clean6 | 6 promoted | `LIT-0521`-`LIT-0526` | completed |
| D61 | duplicate-anchor fix clean3 | 3 promoted | `LIT-0527`-`LIT-0529` | completed |
| D63 | RAG/test-time clean9 | 9 promoted | `LIT-0530`-`LIT-0538` | completed |
| D64 | wide source-available serving-weighted | 11 promoted | `LIT-0539`-`LIT-0549` | completed |

## D55 Details
- Input batch: `B10-20260608T-d55-openalex-exact-title-apply`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d55-source-backed-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d55-source-backed-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified all 11 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 11 promotions and succeeded for all 11.
- Direction split:
  - 6 LLM-serving/resource allocation
  - 2 RAG-aware allocation
  - 3 test-time compute budgeting
- Collection role split:
  - 5 system-support
  - 4 strategy-support
  - 2 core
- DB delta:
  - `LiteratureRecord`: +11
  - `LiteratureSource`: +11

## D55 Promoted Records
- `LIT-0490`: `Uncertainty-Aware Budget Allocation for Adaptive Test-Time Reasoning`
- `LIT-0491`: `FastCache: Optimizing Multimodal LLM Serving through Lightweight KV-Cache Compression Framework`
- `LIT-0492`: `FineServe: Precision-Aware KV Slab and Two-Level Scheduling for Heterogeneous Precision LLM Serving`
- `LIT-0493`: `MorphServe: Efficient and Workload-Aware LLM Serving via Runtime Quantized Layer Swapping and KV Cache Resizing`
- `LIT-0494`: `RedKnot: Efficient Long-Context LLM Serving with Head-Aware KV Reuse and SegPagedAttention`
- `LIT-0495`: `Tangram: Unlocking Non-Uniform KV Cache for Efficient Multi-turn LLM Serving`
- `LIT-0496`: `ExpertRAG: Efficient RAG with Mixture of Experts -- Optimizing Context Retrieval for Adaptive LLM Responses`
- `LIT-0497`: `Self-Routing RAG: Binding Selective Retrieval with Knowledge Verbalization`
- `LIT-0498`: `An Interpretable Latency Model for Speculative Decoding in LLM Serving`
- `LIT-0499`: `Stop When Enough: Adaptive Early-Stopping for Chain-of-Thought Reasoning`
- `LIT-0500`: `CGES: Confidence-Guided Early Stopping for Efficient and Accurate Self-Consistency`

## D57 Details
- Input batch: `B10-20260608T-d57-serving-exact-title-apply`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d57-serving-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d57-serving-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified all 12 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 12 promotions and succeeded for all 12.
- Direction split:
  - 12 LLM-serving/resource allocation
- Collection role split:
  - 10 system-support
  - 2 strategy-support
- DB delta:
  - `LiteratureRecord`: +12
  - `LiteratureSource`: +12

## D57 Promoted Records
- `LIT-0501`: `Analytical Provisioning for Attention-FFN Disaggregated LLM Serving under Stochastic Workloads`
- `LIT-0502`: `Arrow: Adaptive Scheduling Mechanisms for Disaggregated LLM Inference Architecture`
- `LIT-0503`: `ConServe: Fine-Grained GPU Harvesting for LLM Online and Offline Co-Serving`
- `LIT-0504`: `DuetServe: Harmonizing Prefill and Decode for LLM Serving via Adaptive GPU Multiplexing`
- `LIT-0505`: `EcoServe: Enabling Cost-effective LLM Serving with Proactive Intra- and Inter-Instance Orchestration`
- `LIT-0506`: `Efficient Multi-round LLM Inference over Disaggregated Serving`
- `LIT-0507`: `Frontier: Towards Comprehensive and Accurate LLM Inference Simulation`
- `LIT-0508`: `Not All Prefills Are Equal: PPD Disaggregation for Multi-turn LLM Serving`
- `LIT-0509`: `PrefillShare: A Shared Prefill Module for KV Reuse in Multi-LLM Disaggregated Serving`
- `LIT-0510`: `SplitZip: Ultra Fast Lossless KV Compression for Disaggregated LLM Serving`
- `LIT-0511`: `ENOVA: Autoscaling towards Cost-effective and Stable Serverless LLM Serving`
- `LIT-0512`: `No Request Left Behind: Tackling Heterogeneity in Long-Context LLM Inference with Medha`

## D58 Details
- Input:
  - source-backed candidates already present in candidate staging.
  - selected candidates covered `DioR`, `Query-Adaptive Semantic Chunking`, `Provable Scaling Laws`, and `Reasoning in Token Economies`.
  - selected companion candidates were included so B11 could canonicalize early duplicate-loop pairs in one run.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d58-rag-testtime-duplicate-loop-v2-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d58-rag-testtime-duplicate-loop-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified 4 candidates as high-band `READY_FOR_PROMOTION` and 5 companions as same-run duplicates.
- Apply/promote attempted 4 promotions and succeeded for all 4.
- Direction split:
  - 2 RAG-aware allocation
  - 2 test-time compute budgeting
- Collection role split:
  - 2 core
  - 2 strategy-support
- Cleanup:
  - after `Reasoning in Token Economies` was promoted from the arXiv-backed candidate, the leftover DOI candidate was marked `DUPLICATE`.
- DB delta:
  - `LiteratureRecord`: +4
  - `LiteratureSource`: +4

## D58 Promoted Records
- `LIT-0513`: `Provable Scaling Laws for the Test-Time Compute of Large Language Models`
- `LIT-0514`: `Reasoning in Token Economies: Budget-Aware Evaluation of LLM Reasoning Strategies`
- `LIT-0515`: `DioR: Adaptive Cognitive Detection and Contextual Retrieval Optimization for Dynamic Retrieval-Augmented Generation`
- `LIT-0516`: `Query-Adaptive Semantic Chunking for Retrieval-Augmented Generation: A Dynamic Strategy with Contextual Window Expansion`

## D59 Details
- Input batch: `B10-D59-serving-source-backed-curated`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d59-serving-curated-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260608T-d59-serving-curated-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified 4 candidates as high-band `READY_FOR_PROMOTION` and 4 candidates as medium-band `DEFERRED`.
- Apply/promote attempted 4 promotions and succeeded for all 4.
- Direction split:
  - 8 LLM-serving/resource allocation decisions.
- Collection role split:
  - 3 system-support
  - 1 strategy-support
  - 4 theory-support deferred
- DB delta:
  - `LiteratureRecord`: +4
  - `LiteratureSource`: +4

## D59 Promoted Records
- `LIT-0517`: `DynaServe: Unified and Elastic Execution for Dynamic Disaggregated LLM Serving`
- `LIT-0518`: `semi-PD: Towards Efficient LLM Serving via Phase-Wise Disaggregated Computation and Unified Storage`
- `LIT-0519`: `Chameleon: Adaptive Caching and Scheduling for Many-Adapter LLM Inference Environments`
- `LIT-0520`: `Injecting Adrenaline into LLM Serving: Boosting Resource Utilization and Throughput via Attention Disaggregation`

## Next B11 Path
- For direction balance, prioritize a stricter RAG/test-time source-backed refill next.
- For immediate effective-literature growth, continue source-backed high-band subsets but label serving-heavy tranches explicitly.
- For larger scaleout, expand B10 first, then apply source availability and tail filters before B11 promotion.
