# 08 B11 Candidate Triage And Promote

## Status
- State: implemented and used for local DB promotion.
- Latest B11 DB-writing run: D79 D78 serving clean2 promote.
- Latest B11 dry-run: D79 D78 serving clean2 validation.
- Current candidate state:
  - 0 `DISCOVERED`
  - 81 `READY_FOR_PROMOTION`
  - 275 `PROMOTED`
  - 139 `DUPLICATE`
  - 126 `DEFERRED`
  - 18 `REJECTED`
- Current recommendation: continue B10 scaleout, or run a narrow RAG/test-time refill before the next B11/B12 tranche.

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
- `B11_INCLUDE_CANDIDATE_IDS`: compatibility alias for `B11_CANDIDATE_IDS`.
- `B11_CANDIDATE_STATUS`: comma-separated source statuses, default `DISCOVERED`.
- `B11_MAX_CANDIDATES`: maximum candidates to evaluate.
- `B11_MAX_PROMOTIONS`: maximum candidates to promote.
- `B11_READY_THRESHOLD`: score threshold for `READY_FOR_PROMOTION`.
- `B11_DEFER_THRESHOLD`: score threshold for `DEFERRED` versus `REJECTED`.
- `B11_ALLOW_MATH_FOUNDATION`: opt-in math-foundation scoring and fine-grained `theory:*` tagging for canonical theory refills; default `false`.

## Triage Rules
- Existing `LiteratureRecord` matches are authoritative duplicates.
- Existing `LiteratureSource` matches are authoritative duplicates for promotion safety.
- Existing non-discovered candidate matches are duplicate signals.
- Same-run candidate duplicates are marked and linked before promotion.
- High-fit candidates become `READY_FOR_PROMOTION`.
- Domain-specific RAG tails, benchmark/survey tails, and position papers are held as `DEFERRED` unless later rules promote them.
- Application recipe tails are `REJECTED`.
- Test-time strategy signals include explicit budget/compute terms plus `best-of-n`, `best of n`, `inference-aware`, `fast and slow`, `sampling`, and `thinking`; application-tail gates still apply.

## Promote Boundary
- Promotion reuses `LiteratureService.collectionImport`.
- Promoted literature receives:
  - `corpus:managed`
  - one `direction:*` tag
  - one `collection:*` tag
  - one `batch:*` tag
  - one `triage:*` tag
  - opt-in math-foundation `theory:*` tags when `B11_ALLOW_MATH_FOUNDATION=true`
- If promotion finds an existing literature match, the candidate is marked `DUPLICATE` rather than `PROMOTED`.
- Promotion alone does not make literature effective; B12 must complete through `INDEXED`.

## Selector Lessons
- Broad `DISCOVERED` dry-runs can identify many ready candidates, but source-backed ready candidates may still be application-tail or direction-tail.
- D53 strict source-backed selector selected 0 candidates from the broad pool after tail filtering.
- D54 and D55 showed that exact-title/source-backed B10 refill produces cleaner B11 promotion input than direct broad-pool promotion.
- D64 codified the D63 manual exclusions for chart/table/text-to-image/test-time-finetuning test-time tails in the source-available selector.
- D67 broad selector again selected 0 from a noisy READY pool; explicit source-backed candidate-id promotion was cleaner than `assume-source-available`.
- D68 repaired DOI source gating with `source_access`, likely PDF URL checks, blocked current-downloader hosts, and stricter hard/soft tail separation.
- D68 showed OpenAlex/Unpaywall OA is not enough for current B12 success; default broad apply must exclude known blocked PDF hosts until downloader behavior changes.
- D76 showed broad source-backed B10 discovery still needs curated apply filtering: the full scout had 12 new rows but only 5 were clean enough for B11 high-band validation.

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
| D65 | RAG singleton source-backed refill | 1 promoted | `LIT-0550` | completed |
| D66 | test-time exact-ID source-backed refill | 4 promoted | `LIT-0551`-`LIT-0554` | completed |
| D67 | test-time existing source-backed subset | 4 promoted | `LIT-0555`-`LIT-0558` | completed |
| D68 | source/tail-gated broad source-available pass | 19 promoted, 15 soft-excluded | `LIT-0559`-`LIT-0577` | 4 completed |
| D69 | narrow RAG source-backed refill validation | 2 high-band ready in dry-run | candidates only | not promoted |
| D70 | D69 RAG plus test-time balance | 4 promoted, 1 soft-excluded | `LIT-0578`-`LIT-0581` | 3 completed |
| D71 | narrow RAG exact-ID source-backed refill validation | 2 high-band ready in dry-run | candidates only | not promoted |
| D72 | D71 RAG promote plus test-time exact-ID validation | 2 promoted; 3 high-band ready in dry-run | `LIT-0582`-`LIT-0583` | 2 completed |
| D73 | D72 test-time exact-ID promote | 3 promoted | `LIT-0584`-`LIT-0586` | completed |
| D74 | math-theory group/action exact-title promote | 4 promoted | `LIT-0587`-`LIT-0590` | completed |
| D75 | balanced RAG/test-time exact-title promote | 6 promoted | `LIT-0591`-`LIT-0596` | completed |
| D76 | curated catalog expansion validation | 5 high-band ready in dry-run | promoted with D77 as `LIT-0597`-`LIT-0602` | completed |
| D77 | D76 curated catalog plus Atom promote | 6 promoted | `LIT-0597`-`LIT-0602` | completed |
| D78 | serving clean2 validation | 2 high-band ready in dry-run | candidates only | promoted in D79 |
| D79 | D78 serving clean2 promote | 2 promoted | `LIT-0603`-`LIT-0604` | completed |

## D79 Details
- Input candidates came from `B10-D78-serving-clean2-curated`:
  - `591a5d62-6b43-4755-ad2d-ef82053c691b`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `274d1ff4-258a-4a70-b541-99a65d21975f`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d79-d78-serving-clean2-b11-dry-run-b11-candidate-triage-report.json`.
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d79-d78-serving-clean2-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified both candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 2 promotions and succeeded for both.
- Direction split:
  - 2 LLM-serving/resource allocation.
- Collection role split:
  - 2 system-support.
- DB delta:
  - `LiteratureRecord`: +2.
  - `LiteratureSource`: +2.

## D79 Promoted Records
- `LIT-0603`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
- `LIT-0604`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.

## D78 Details
- Input candidates came from `B10-D78-serving-clean2-curated`:
  - `591a5d62-6b43-4755-ad2d-ef82053c691b`: `C2CServe: Leveraging NVLink-C2C for Elastic Serverless LLM Serving on MIG`.
  - `274d1ff4-258a-4a70-b541-99a65d21975f`: `PIM Is All You Need: A CXL-Enabled GPU-Free System for Large Language Model Inference`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d78-serving-clean2-b11-dry-run-b11-candidate-triage-report.json`.
- Dry-run classified both candidates as high-band `READY_FOR_PROMOTION`.
- Direction split:
  - 2 LLM-serving/resource allocation.
- Collection role split:
  - 2 system-support.
- DB delta:
  - `LiteratureDiscoveryCandidate`: 0.
  - `LiteratureRecord`: 0.
  - `LiteratureSource`: 0.
- These candidates were promoted in D79.

## D77 Details
- Input candidates:
  - 5 from `B10-D76-curated-catalog-expansion`.
  - 1 from `B10-D77-serving-atom-exact-source-refill`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-d76-plus-atom-b11-dry-run-b11-candidate-triage-report.json`.
- Apply/promote artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d77-d76-plus-atom-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified all 6 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 6 promotions and succeeded for all 6.
- Direction split:
  - 4 LLM-serving/resource allocation.
  - 2 RAG-aware allocation.
- Collection role split:
  - 4 system-support.
  - 2 theory-support.
- DB delta:
  - `LiteratureRecord`: +6.
  - `LiteratureSource`: +6.

## D77 Promoted Records
- `LIT-0597`: `EPIC: Efficient Position-Independent Caching for Serving Large Language Models`.
- `LIT-0598`: `KunServe: Parameter-centric Memory Management for Efficient Memory Overloading Handling in LLM Serving`.
- `LIT-0599`: `Atom: Low-bit Quantization for Efficient and Accurate LLM Serving`.
- `LIT-0600`: `Efficient Heterogeneous Large Language Model Decoding with Model-Attention Disaggregation`.
- `LIT-0601`: `Context Attribution with Multi-Armed Bandit Optimization`.
- `LIT-0602`: `Retrieval-Enhanced Machine Learning`.

## D76 Details
- Input batch: `B10-D76-curated-catalog-expansion`.
- Batch id: `a16bc1f4-36d5-4d70-a2ef-8aa65a55e085`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d76-curated-catalog-b11-dry-run-b11-candidate-triage-report.json`.
- Dry-run classified all 5 candidates as high-band `READY_FOR_PROMOTION`.
- Direction split:
  - 3 LLM-serving/resource allocation.
  - 2 RAG-aware allocation.
- Collection role split:
  - 3 system-support.
  - 2 theory-support.
- No DB writes were made by B11 in D76; the candidates were later promoted in D77.

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

## D67 Details
- Input:
  - broad read-only B11 dry-run over current `DISCOVERED` candidates.
  - explicit candidate-id apply set selected from arXiv-backed high-band test-time candidates.
- Broad dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d67-source-available-b11-dry-run-b11-candidate-triage-report.json`.
- Selector artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d67-source-available-selector-dry-run-b11-source-available-selector.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260609T-d67-testtime-existing-sourcebacked-b11-apply-promote-b11-candidate-triage-report.json`.
- Broad dry-run produced 91 high-band `READY_FOR_PROMOTION` decisions, but strict selector selected 0 candidates.
- Apply/promote attempted 4 explicit candidate-id promotions and succeeded for all 4.
- Direction split:
  - 4 test-time compute budgeting.
- Collection role split:
  - 4 strategy-support.
- DB delta:
  - `LiteratureRecord`: +4
  - `LiteratureSource`: +4

## D67 Promoted Records
- `LIT-0555`: `Expanding Performance Boundaries of Open-Source Multimodal Models with Model, Data, and Test-Time Scaling`
- `LIT-0556`: `Test-Time Computing for Referring Multimodal Large Language Models`
- `LIT-0557`: `TabTracer: Monte Carlo Tree Search for Complex Table Reasoning with Large Language Models`
- `LIT-0558`: `Alpha-SQL: Zero-Shot Text-to-SQL using Monte Carlo Tree Search`

## D70 Details
- D69 RAG promote:
  - dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-d69-rag-b11-dry-run-b11-candidate-triage-report.json`.
  - apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-d69-rag-b11-apply-promote-b11-candidate-triage-report.json`.
  - promoted `2712769b-65e6-4e94-945a-ddba9d6df6c5` as `LIT-0578`.
  - promoted `4c383b35-d27c-44f7-9a3a-d4f8b069255f` as `LIT-0579`.
- Direction-balance selector:
  - current B11 dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-current-balance-b11-dry-run-b11-candidate-triage-report.json`.
  - strict selector selected 0 test-time targets without `preprint_doi`.
  - selector with `preprint_doi` selected a TechRxiv singleton, but B12 acquisition hit HTTP 403.
  - `LIT-0580` was soft-excluded after the TechRxiv/Cloudflare source-access failure.
- Clean test-time exact-title promote:
  - B10 batch: `B10-D70-testtime-sample-compute-allocation`.
  - dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-testtime-sample-compute-allocation-b11-dry-run-b11-candidate-triage-report.json`.
  - apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d70-testtime-sample-compute-allocation-b11-apply-promote-b11-candidate-triage-report.json`.
  - promoted `daaa560a-d1e2-44c3-a826-b7ea8c2d6860` as `LIT-0581`.

## D71 Details
- Input batch: `B10-D71-rag-exact-id-sourcebacked-refill`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d71-rag-exact-id-sourcebacked-b11-dry-run-b11-candidate-triage-report.json`.
- Dry-run classified both D71 candidates as high-band `READY_FOR_PROMOTION`:
  - `16580c5d-e876-469c-9b33-bed96a055eec`: `Cluster-based Adaptive Retrieval: Dynamic Context Selection for RAG Applications`, score `0.922`.
  - `943c9d4a-e998-4471-a8dd-d1eccffef0fa`: `Fast or Better? Balancing Accuracy and Cost in Retrieval-Augmented Generation with Flexible User Control`, score `0.922`.
- Dry-run only:
  - candidate DB delta: 0.
  - `LiteratureRecord` DB delta: 0.
  - `LiteratureSource` DB delta: 0.
- Promotion recommendation: use explicit `B11_CANDIDATE_IDS` for these 2 rows, then run B12 arXiv acquisition and `codex_curated` completion.

## D72 Details
- D71 RAG promote:
  - dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d72-d71-rag-b11-dry-run-b11-candidate-triage-report.json`.
  - apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d72-d71-rag-b11-apply-promote-b11-candidate-triage-report.json`.
  - promoted `16580c5d-e876-469c-9b33-bed96a055eec` as `LIT-0582`.
  - promoted `943c9d4a-e998-4471-a8dd-d1eccffef0fa` as `LIT-0583`.
- D72 test-time exact-ID validation:
  - B10 batch: `B10-D72-testtime-exact-id-sourcebacked-refill`.
  - dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d72-testtime-exact-id-b11-dry-run-b11-candidate-triage-report.json`.
  - classified all 3 D72 test-time candidates as high-band `READY_FOR_PROMOTION`.
  - candidate ids: `a11bd976-fd4a-4236-a5f5-940a434e7acd`, `67659b8a-6a13-4846-b4bb-9b8aa8fdc095`, and `74fda4f3-4c04-473c-80f6-22c1ebbcc5ff`.
  - dry-run only in D72; D73 later promoted and completed all 3 candidates.

## D73 Details
- Input: the 3 high-band D72 test-time candidates from `B10-D72-testtime-exact-id-sourcebacked-refill`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d73-d72-testtime-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d73-d72-testtime-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified all 3 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 3 promotions and succeeded for all 3:
  - `a11bd976-fd4a-4236-a5f5-940a434e7acd` promoted as `LIT-0584`.
  - `67659b8a-6a13-4846-b4bb-9b8aa8fdc095` promoted as `LIT-0585`.
  - `74fda4f3-4c04-473c-80f6-22c1ebbcc5ff` promoted as `LIT-0586`.
- Direction split:
  - 3 test-time compute budgeting.
- Collection role split:
  - 3 strategy-support.
- DB delta:
  - `LiteratureRecord`: +3.
  - `LiteratureSource`: +3.

## D74 Details
- Input: the 4 D74 math-theory candidates from `B10-D74-math-theory-group-action-exact-title`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d74-math-theory-b11-v2-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d74-math-theory-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run with `B11_ALLOW_MATH_FOUNDATION=true` classified all 4 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 4 promotions and succeeded for all 4:
  - `7b944aa7-8607-4ba3-b0e1-f26511cd892b` promoted as `LIT-0587`.
  - `78993dd5-9162-4c66-aa7c-80cbc2e0aab0` promoted as `LIT-0588`.
  - `1319b3d5-0da8-4c8c-98b9-54cc3ceb9dd4` promoted as `LIT-0589`.
  - `846f809d-4514-4066-91bc-6a4338814866` promoted as `LIT-0590`.
- Direction split:
  - 4 RAG-aware allocation.
- Collection role split:
  - 4 theory-support.
- DB delta:
  - `LiteratureRecord`: +4.
  - `LiteratureSource`: +4.
- D74-only tag backfill artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d74-math-theory-tag-backfill.json`.

## D75 Details
- Input: the 6 D75 exact-title candidates from `B10-D75-rag-testtime-exact-title-sourcebacked`.
- Dry-run artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d75-rag-testtime-b11-dry-run-b11-candidate-triage-report.json`.
- Apply artifact: `.ai/.tmp/literature-scaleout-corpus-strategy/artifacts/20260610T-d75-rag-testtime-b11-apply-promote-b11-candidate-triage-report.json`.
- Dry-run classified all 6 candidates as high-band `READY_FOR_PROMOTION`.
- Apply/promote attempted 6 promotions and succeeded for all 6:
  - `0d9ea04b-28eb-4c01-9c02-f50d98f1849e` promoted as `LIT-0591`.
  - `9bd8f94b-af7b-4292-926f-a58ed355e964` promoted as `LIT-0592`.
  - `f8cbdeef-f04e-4a58-949e-154134b8a2fd` promoted as `LIT-0593`.
  - `42501719-c52b-4ffa-a5d6-a418049f9867` promoted as `LIT-0594`.
  - `4a6988c0-ead8-4314-a3af-26b98a9901aa` promoted as `LIT-0595`.
  - `f3479b44-5387-4d28-9012-020d7558f05a` promoted as `LIT-0596`.
- Direction split:
  - 4 RAG-aware allocation.
  - 2 test-time compute budgeting.
- Collection role split:
  - 4 core.
  - 2 strategy-support.
- DB delta:
  - `LiteratureRecord`: +6.
  - `LiteratureSource`: +6.
- D75 scoring note:
  - added targeted test-time strategy signals for `best-of-n`, `inference-aware`, and `fast and slow` titles so source-backed sampling/reasoning papers are not misclassified solely because OpenAlex abstracts are sparse.
  - application-tail gates were not relaxed.

## Next B11 Path
- For direction balance, current D75 count is test-time 111, RAG 131, and serving 148 among managed records.
- For math-theory strengthening, group/action geometry is no longer the immediate gap; add only named formal gaps before touching broad READY tails.
- For immediate clean growth, use explicit source-backed candidate-id subsets only when selector output is empty or noisy.
- For immediate effective-literature growth, continue source-backed high-band subsets but label serving-heavy tranches explicitly.
- For larger scaleout, expand B10 first, then apply source availability and tail filters before B11 promotion.
