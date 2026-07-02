# 07 B9 New Collection Round

## Decision
- State: imported.
- Batch ID: `B9-new-collection-round`.
- Scope: controlled metadata import only; content-processing is handled by later pipeline commands.

## Summary
| Metric | Value |
| --- | ---: |
| Query groups | 42 |
| Discovered candidates | 153 |
| Existing DB matches | 24 |
| Selected candidates | 22 |
| Import status code | 200 |
| New literature delta | 22 |
| New source delta | 22 |
| Pipeline/content/fulltext deltas | 0/0/0/0 |

## Track Coverage
| Track | Direction | Collection | Selected | Imported/New |
| --- | --- | --- | ---: | ---: |
| `rag-core-frontier` | `rag-aware-allocation` | `collection:core` | 7 | 7 |
| `rag-theory-bridge` | `rag-aware-allocation` | `collection:theory-support` | 1 | 1 |
| `serving-system-frontier` | `llm-serving-resource-allocation` | `collection:system-support` | 6 | 6 |
| `serving-theory-bridge` | `llm-serving-resource-allocation` | `collection:theory-support` | 0 | 0 |
| `ttc-strategy-frontier` | `test-time-compute-budgeting` | `collection:strategy-support` | 7 | 7 |
| `ttc-theory-bridge` | `test-time-compute-budgeting` | `collection:theory-support` | 1 | 1 |

## Selected Records
| ID | Year | Track | Direction | Score | Title | New | Literature ID |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| [2606.02581](https://arxiv.org/abs/2606.02581) | 2026 | `rag-core-frontier` | `rag-aware-allocation` | 33 | Cost-Aware Query Routing in RAG: Empirical Analysis of Retrieval Depth Tradeoffs | true | `LIT-0328` |
| [2511.07328](https://arxiv.org/abs/2511.07328) | 2025 | `rag-core-frontier` | `rag-aware-allocation` | 28 | Q-RAG: Long Context Multi-step Retrieval via Value-based Embedder Training | true | `LIT-0329` |
| [2604.14222](https://arxiv.org/abs/2604.14222) | 2026 | `rag-core-frontier` | `rag-aware-allocation` | 27 | Adaptive Query Routing: A Tier-Based Framework for Hybrid Retrieval Across Financial, Legal, and Medical Documents | true | `LIT-0330` |
| [2604.16401](https://arxiv.org/abs/2604.16401) | 2026 | `rag-core-frontier` | `rag-aware-allocation` | 27 | GraphRAG-Router: Learning Cost-Efficient Routing over GraphRAGs and LLMs with Reinforcement Learning | true | `LIT-0331` |
| [2604.15621](https://arxiv.org/abs/2604.15621) | 2026 | `rag-core-frontier` | `rag-aware-allocation` | 27 | Rethinking the Necessity of Adaptive Retrieval-Augmented Generation through the Lens of Adaptive Listwise Ranking | true | `LIT-0332` |
| [2505.23052](https://arxiv.org/abs/2505.23052) | 2025 | `rag-core-frontier` | `rag-aware-allocation` | 25 | RAGRouter: Learning to Route Queries to Multiple Retrieval-Augmented Language Models | true | `LIT-0333` |
| [2512.09487](https://arxiv.org/abs/2512.09487) | 2025 | `rag-core-frontier` | `rag-aware-allocation` | 25 | RouteRAG: Efficient Retrieval-Augmented Generation from Text and Graph via Reinforcement Learning | true | `LIT-0334` |
| [2512.25052](https://arxiv.org/abs/2512.25052) | 2025 | `rag-theory-bridge` | `rag-aware-allocation` | 22 | AdaGReS:Adaptive Greedy Context Selection via Redundancy-Aware Scoring for Token-Budgeted RAG | true | `LIT-0335` |
| [2602.02987](https://arxiv.org/abs/2602.02987) | 2026 | `serving-system-frontier` | `llm-serving-resource-allocation` | 40 | Large-Scale LLM Inference with Heterogeneous Workloads: Prefill-Decode Contention and Asymptotically Optimal Control | true | `LIT-0336` |
| [2604.21231](https://arxiv.org/abs/2604.21231) | 2026 | `serving-system-frontier` | `llm-serving-resource-allocation` | 35 | SparKV: Overhead-Aware KV Cache Loading for Efficient On-Device LLM Inference | true | `LIT-0337` |
| [2604.25080](https://arxiv.org/abs/2604.25080) | 2026 | `serving-system-frontier` | `llm-serving-resource-allocation` | 34 | CacheFlow: Efficient LLM Serving with 3D-Parallel KV Cache Restoration | true | `LIT-0338` |
| [2604.15039](https://arxiv.org/abs/2604.15039) | 2026 | `serving-system-frontier` | `llm-serving-resource-allocation` | 33 | Prefill-as-a-Service: KVCache of Next-Generation Models Could Go Cross-Datacenter | true | `LIT-0339` |
| [2511.02230](https://arxiv.org/abs/2511.02230) | 2025 | `serving-system-frontier` | `llm-serving-resource-allocation` | 33 | Continuum: Efficient and Robust Multi-Turn LLM Agent Scheduling with KV Cache Time-to-Live | true | `LIT-0340` |
| [2508.01002](https://arxiv.org/abs/2508.01002) | 2025 | `serving-system-frontier` | `llm-serving-resource-allocation` | 30 | Optimal Scheduling Algorithms for LLM Inference: Theory and Practice | true | `LIT-0341` |
| [2604.21018](https://arxiv.org/abs/2604.21018) | 2026 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 38 | Adaptive Test-Time Compute Allocation with Evolving In-Context Demonstrations | true | `LIT-0342` |
| [2602.01070](https://arxiv.org/abs/2602.01070) | 2026 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 36 | What If We Allocate Test-Time Compute Adaptively? | true | `LIT-0343` |
| [2502.05171](https://arxiv.org/abs/2502.05171) | 2025 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 34 | Scaling up Test-Time Compute with Latent Reasoning: A Recurrent Depth Approach | true | `LIT-0344` |
| [2606.01667](https://arxiv.org/abs/2606.01667) | 2026 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 32 | ATLAS: Agentic Test-time Learning-to-Allocate Scaling | true | `LIT-0345` |
| [2601.16486](https://arxiv.org/abs/2601.16486) | 2026 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 31 | Timely Machine: Awareness of Time Makes Test-Time Scaling Agentic | true | `LIT-0346` |
| [2501.19393](https://arxiv.org/abs/2501.19393) | 2025 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 31 | s1: Simple test-time scaling | true | `LIT-0347` |
| [2506.16043](https://arxiv.org/abs/2506.16043) | 2025 | `ttc-strategy-frontier` | `test-time-compute-budgeting` | 26 | DynScaling: Efficient Verifier-free Inference Scaling via Dynamic and Integrated Sampling | true | `LIT-0348` |
| [2601.19280](https://arxiv.org/abs/2601.19280) | 2026 | `ttc-theory-bridge` | `test-time-compute-budgeting` | 20 | Group Distributionally Robust Optimization-Driven Reinforcement Learning for LLM Reasoning | true | `LIT-0349` |

## Safety
- Content-processing enqueued by this script: `false`.
- No raw fulltext, PDFs, embeddings, cloned repos, or experiment artifacts are stored in repo by this script.
- Query ledger: `dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/b9-query-ledger.json`.
- Candidate manifest: `dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/b9-candidates-manifest.json`.
- Detailed local evidence: `.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion/b9-new-collection-round-detail.json`.

## Post-Import Exclusion
- `LIT-0337` / `2604.21231` was excluded from the adaptive corpus after import.
- Reason: arXiv marks the paper as withdrawn and `https://arxiv.org/pdf/2604.21231` returns 404.
- Corpus tags removed: `collection:system-support`, `direction:llm-serving-resource-allocation`, and `batch:b9-new-collection-round`.
- Exclusion artifact: `dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/b9-withdrawn-exclusion-report.json`.
- Valid B9 adaptive corpus records after exclusion: 21.
- Valid B9 records indexed after standard pipeline processing: 21/21.
- Pipeline status artifact: `dev-docs/active/adaptive-llm-systems-literature-pipeline-completion/artifacts/b9-pipeline-status.json`.
