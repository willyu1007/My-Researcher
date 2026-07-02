# 06 B7 Frontier Three-Direction Expansion

## Decision
- State: imported.
- Batch ID: `B7-frontier-three-direction-expansion`.
- Scope: controlled metadata import only; no content-processing side effects.

## Summary
| Metric | Value |
| --- | ---: |
| Query groups | 21 |
| Unique discovered candidates | 21 |
| Existing DB matches | 2 |
| Selected import candidates | 16 |
| Import status code | 200 |
| New literature delta | 16 |
| New source delta | 16 |
| Pipeline/content/fulltext deltas | 0/0/0/0 |

## Direction Coverage
| Direction | Selected | Imported/New |
| --- | ---: | ---: |
| `rag-aware-allocation` | 5 | 5 |
| `llm-serving-resource-allocation` | 5 | 5 |
| `test-time-compute-budgeting` | 6 | 6 |

## Selected Records
| arXiv | Year | Direction | Title | New | Literature ID |
| --- | ---: | --- | --- | --- | --- |
| [2605.13734](https://arxiv.org/abs/2605.13734) | 2026 | `llm-serving-resource-allocation` | KVServe: Service-Aware KV Cache Compression for Communication-Efficient Disaggregated LLM Serving | true | `LIT-0290` |
| [2508.06133](https://arxiv.org/abs/2508.06133) | 2025 | `llm-serving-resource-allocation` | LLM Serving Optimization with Variable Prefill and Decode Lengths | true | `LIT-0291` |
| [2604.14853](https://arxiv.org/abs/2604.14853) | 2026 | `test-time-compute-budgeting` | Adaptive Test-Time Compute Allocation for Reasoning LLMs via Constrained Policy Optimization | true | `LIT-0292` |
| [2501.06709](https://arxiv.org/abs/2501.06709) | 2025 | `llm-serving-resource-allocation` | Mell: Memory-Efficient Large Language Model Serving via Multi-GPU KV Cache Management | true | `LIT-0293` |
| [2504.01281](https://arxiv.org/abs/2504.01281) | 2025 | `rag-aware-allocation` | Scaling Test-Time Inference with Policy-Optimized, Dynamic Retrieval-Augmented Generation via KV Caching and Decoding | true | `LIT-0294` |
| [2602.03975](https://arxiv.org/abs/2602.03975) | 2026 | `test-time-compute-budgeting` | Adaptive Test-Time Compute Allocation via Learned Heuristics over Categorical Structure | true | `LIT-0295` |
| [2602.03814](https://arxiv.org/abs/2602.03814) | 2026 | `test-time-compute-budgeting` | Conformal Thinking: Risk Control for Reasoning on a Compute Budget | true | `LIT-0296` |
| [2601.10644](https://arxiv.org/abs/2601.10644) | 2026 | `rag-aware-allocation` | RoutIR: Fast Serving of Retrieval Pipelines for Retrieval-Augmented Generation | true | `LIT-0297` |
| [2603.18411](https://arxiv.org/abs/2603.18411) | 2026 | `test-time-compute-budgeting` | TARo: Token-level Adaptive Routing for LLM Test-time Alignment | true | `LIT-0298` |
| [2504.11320](https://arxiv.org/abs/2504.11320) | 2025 | `llm-serving-resource-allocation` | Optimizing LLM Inference: Fluid-Guided Online Scheduling with Memory Constraints | true | `LIT-0299` |
| [2602.09574](https://arxiv.org/abs/2602.09574) | 2026 | `test-time-compute-budgeting` | Aligning Tree-Search Policies with Fixed Token Budgets in Test-Time Scaling of LLMs | true | `LIT-0300` |
| [2604.26176](https://arxiv.org/abs/2604.26176) | 2026 | `rag-aware-allocation` | CacheRAG: A Semantic Caching System for Retrieval-Augmented Generation in Knowledge Graph Question Answering | true | `LIT-0301` |
| [2604.22849](https://arxiv.org/abs/2604.22849) | 2026 | `rag-aware-allocation` | R$^3$AG: Retriever Routing for Retrieval-Augmented Generation | true | `LIT-0302` |
| [2511.02919](https://arxiv.org/abs/2511.02919) | 2025 | `rag-aware-allocation` | Cache Mechanism for Agent RAG Systems | true | `LIT-0303` |
| [2503.07572](https://arxiv.org/abs/2503.07572) | 2025 | `test-time-compute-budgeting` | Optimizing Test-Time Compute via Meta Reinforcement Fine-Tuning | true | `LIT-0304` |
| [2408.08147](https://arxiv.org/abs/2408.08147) | 2024 | `llm-serving-resource-allocation` | P/D-Serve: Serving Disaggregated Large Language Model at Scale | true | `LIT-0305` |

## Safety
- Content-processing enqueued: `false`.
- No raw fulltext, PDFs, embeddings, cloned repos, or experiment artifacts stored in repo.
- Detailed local evidence: `.ai/.tmp/adaptive-llm-systems-standard-pipeline-expansion/b7-frontier-three-direction-expansion-detail.json`.
