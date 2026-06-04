# 07 B8 Direction-Balanced Scaleout

## Decision
- State: imported.
- Batch ID: `B8-direction-balanced-scaleout`.
- Scope: OpenAlex discovery pool plus controlled metadata import; no content-processing side effects.

## Summary
| Metric | Value |
| --- | ---: |
| Query groups | 15 |
| Discovery candidates | 190 |
| Existing DB matches | 20 |
| Selected candidates | 19 |
| Import status code | 200 |
| New literature delta | 19 |
| New source delta | 19 |
| Pipeline/content/fulltext deltas | 0/0/0/0 |

## Direction Coverage
| Direction | Selected | Imported/New |
| --- | ---: | ---: |
| `rag-aware-allocation` | 3 | 3 |
| `llm-serving-resource-allocation` | 8 | 8 |
| `test-time-compute-budgeting` | 8 | 8 |

## Selected Records
| ID | Year | Direction | Score | Title | New |
| --- | ---: | --- | ---: | --- | --- |
| [2510.13223](https://arxiv.org/abs/2510.13223) | 2026 | `llm-serving-resource-allocation` | 30 | BanaServe: Unified KV Cache and Dynamic Module Migration for Balancing Disaggregated LLM Serving in AI Infrastructure | true |
| [2504.07494](https://arxiv.org/abs/2504.07494) | 2025 | `llm-serving-resource-allocation` | 29 | Apt-Serve: Adaptive Request Scheduling on Hybrid Cache for Scalable LLM Inference Serving | true |
| [2507.17120](https://arxiv.org/abs/2507.17120) | 2025 | `llm-serving-resource-allocation` | 29 | BucketServe: Bucket-Based Dynamic Batching for Smart and Efficient LLM Inference Serving | true |
| [10.1145/3759441.3759444](https://doi.org/10.1145/3759441.3759444) | 2025 | `llm-serving-resource-allocation` | 29 | Efficient LLM Inference via Chunked Prefills | true |
| [2512.04013](https://arxiv.org/abs/2512.04013) | 2025 | `llm-serving-resource-allocation` | 28 | AugServe: Adaptive Request Scheduling for Augmented Large Language Model Inference Serving | true |
| [2505.12658](https://arxiv.org/abs/2505.12658) | 2025 | `llm-serving-resource-allocation` | 28 | HydraInfer: Hybrid Disaggregated Scheduling for Multimodal Large Language Model Serving | true |
| [10.1145/3779212.3790135](https://doi.org/10.1145/3779212.3790135) | 2026 | `llm-serving-resource-allocation` | 27 | Bullet: Boosting GPU Utilization for LLM Serving via Dynamic Spatial-Temporal Orchestration | true |
| [2605.02329](https://arxiv.org/abs/2605.02329) | 2026 | `llm-serving-resource-allocation` | 27 | Taming Request Imbalance: SLO-Aware Scheduling for Disaggregated LLM Inference | true |
| [2506.04301](https://arxiv.org/abs/2506.04301) | 2025 | `test-time-compute-budgeting` | 23 | The Cost of Dynamic Reasoning: Demystifying AI Agents and Test-Time Scaling from an AI Infrastructure Perspective | true |
| [2502.05078](https://arxiv.org/abs/2502.05078) | 2025 | `test-time-compute-budgeting` | 22 | Adaptive Graph of Thoughts: Test-Time Adaptive Reasoning Unifying Chain, Tree, and Graph Structures | true |
| [2511.03475](https://arxiv.org/abs/2511.03475) | 2025 | `rag-aware-allocation` | 22 | RAGBoost: Efficient Retrieval-Augmented Generation with Accuracy-Preserving Context Reuse | true |
| [2505.10951](https://arxiv.org/abs/2505.10951) | 2026 | `rag-aware-allocation` | 21 | SubGCache: Accelerating Graph-based RAG with Subgraph-level KV Cache | true |
| [10.1145/3721146.3721953](https://doi.org/10.1145/3721146.3721953) | 2025 | `test-time-compute-budgeting` | 21 | Beyond Test-Time Compute Strategies: Advocating Energy-per-Token in LLM Inference | true |
| [10.18653/v1/2025.emnlp-main.573](https://doi.org/10.18653/v1/2025.emnlp-main.573) | 2025 | `test-time-compute-budgeting` | 20 | DEL-ToM: Inference-Time Scaling for Theory-of-Mind Reasoning via Dynamic Epistemic Logic | true |
| [2502.06703](https://arxiv.org/abs/2502.06703) | 2025 | `test-time-compute-budgeting` | 19 | Can 1B LLM Surpass 405B LLM? Rethinking Compute-Optimal Test-Time Scaling | true |
| [10.18653/v1/2025.findings-emnlp.1322](https://doi.org/10.18653/v1/2025.findings-emnlp.1322) | 2025 | `test-time-compute-budgeting` | 19 | Think Right, Not More: Test-Time Scaling for Numerical Claim Verification | true |
| [10.18653/v1/2025.emnlp-main.574](https://doi.org/10.18653/v1/2025.emnlp-main.574) | 2025 | `test-time-compute-budgeting` | 18 | Collaborative Beam Search: Enhancing LLM Reasoning via Collective Consensus | true |
| [2504.02495](https://arxiv.org/abs/2504.02495) | 2025 | `test-time-compute-budgeting` | 18 | Inference-Time Scaling for Generalist Reward Modeling | true |
| [2602.23374](https://arxiv.org/abs/2602.23374) | 2025 | `rag-aware-allocation` | 17 | Higress-RAG: A Holistic Optimization Framework for Enterprise Retrieval-Augmented Generation via Dual Hybrid Retrieval, Adaptive Routing, and CRAG | true |

## Safety
- Content-processing enqueued: `false`.
- No raw fulltext, PDFs, embeddings, cloned repos, or experiment artifacts stored in repo.
- Detailed local evidence: `.ai/.tmp/adaptive-llm-systems-standard-pipeline-expansion/b8-direction-balanced-scaleout-detail.json`.
