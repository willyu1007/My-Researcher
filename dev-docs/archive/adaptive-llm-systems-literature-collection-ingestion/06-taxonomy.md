# 06 Taxonomy

## Status
- Version: `taxonomy.v1`
- State: frozen for Phase 1
- Owner task: `T-116 adaptive-llm-systems-literature-collection-ingestion`
- Storage decision: use existing `LiteratureRecord.tags` as flat namespaced tags.

## Purpose
- Provide a stable tag vocabulary for the current adaptive LLM systems collection round.
- Let Phase 2 seed catalog and Phase 3 query catalog use the same language.
- Preserve enough structure for later experiment-foundation and PaperImplementation screening without adding database schema.

## Tag Grammar
- Tags are lowercase ASCII strings.
- Format: `<namespace>:<value>`.
- Values use kebab-case.
- Do not use spaces, uppercase letters, commas, or free-text rationales in tags.
- Put rationale in seed catalogs, judgment cards, or task evidence artifacts, not in tags.

## Required Minimum Tags
Every intentionally imported or curated item in this task should have:
- exactly one primary `collection:*` tag.
- at least one `priority:*` tag.
- at least one topic-specific tag from `direction:*`, `subcluster:*`, or `theory:*`.
- `classification:low-confidence` when the assignment is uncertain.

If a paper bridges multiple layers, keep exactly one primary `collection:*` tag and add a `bridge:*` tag.

## Collection Tags
| Tag | Meaning | Include When | Exclude When |
|---|---|---|---|
| `collection:core` | Main research-problem literature. | The paper directly studies RAG-aware or retrieval-compute resource allocation, quality-cost-latency tradeoff, adaptive retrieval, RAG serving optimization, or RAG-specific budget decisions. | It is generic RAG, agentic RAG, GraphRAG, or long-context work without a resource/budget/scheduling decision. |
| `collection:system-support` | System substrate for experiments. | The paper explains LLM serving constraints, KV/prefix cache, batching, prefill/decode, P/D disaggregation, SLO scheduling, tail latency, or heterogeneous inference resources. | It is a generic systems paper that cannot map to RAG/LLM inference constraints. |
| `collection:strategy-support` | Adaptive decision policy layer. | The paper studies test-time compute, model routing, cascades, uncertainty gating, verifier budget, early stopping, or adaptive inference policies. | It is pure prompting/reasoning without a controllable budget or decision policy. |
| `collection:theory-support` | Mathematical or algorithmic foundation. | The paper provides a formalism that maps to retrieval, context, generation, cache, scheduling, stopping, risk, or quality-cost-latency tradeoff. | It is mathematically interesting but has no plausible mapping to this research program. |

## Bridge Tags
| Tag | Meaning |
|---|---|
| `bridge:core-system` | Core RAG allocation paper with serving-system implications. |
| `bridge:core-strategy` | Core RAG allocation paper driven by an adaptive policy. |
| `bridge:core-theory` | Core RAG allocation paper with explicit theoretical modeling. |
| `bridge:system-strategy` | Serving paper that makes adaptive budget/scheduling decisions. |
| `bridge:strategy-theory` | Test-time/adaptive policy paper with explicit theoretical guarantees or formalism. |
| `bridge:theory-to-chunking` | Theory item that may inspire RAG chunking or chunk-space design. |

## Direction Tags
| Tag | Meaning |
|---|---|
| `direction:rag-aware-allocation` | RAG-aware resource allocation or adaptive retrieval-compute allocation. |
| `direction:llm-serving-resource-allocation` | LLM serving scheduling and resource allocation. |
| `direction:test-time-compute-budgeting` | Test-time compute budgeting and adaptive inference budget policy. |
| `direction:adaptive-llm-systems` | Cross-direction adaptive LLM systems optimization. Use sparingly for bridge/survey items. |

## Subcluster Tags
### Core
| Tag | Meaning |
|---|---|
| `subcluster:rag-serving-optimization` | RAG pipeline serving optimization, system-level RAG serving, or RAG configuration optimization. |
| `subcluster:retrieval-gating` | Retrieve-or-not decisions, uncertainty gates, or fallback-to-parametric decisions. |
| `subcluster:retrieval-depth` | Dynamic top-k, retrieval depth, or retrieval round allocation. |
| `subcluster:context-budget` | Context length, evidence packing, chunk budget, or context compression decisions. |
| `subcluster:rerank-budget` | Rerank depth, reranker invocation, or reranker compute allocation. |
| `subcluster:multi-hop-rag` | Multi-step retrieve/reason/stop decisions. |
| `subcluster:rag-routing` | Query routing, corpus routing, RAG mode routing, or query-corpus compatibility. |
| `subcluster:rag-workload` | RAG workload traces, benchmarks, or workload characterization. |
| `subcluster:rag-evaluation-quality` | Faithfulness, grounding, citation quality, and answer quality under resource constraints. |

### System Support
| Tag | Meaning |
|---|---|
| `subcluster:kv-cache` | KV cache memory, paging, eviction, or reuse. |
| `subcluster:prefix-cache` | Prefix/prompt/radix/chunk cache reuse. |
| `subcluster:continuous-batching` | Continuous batching and request-level scheduling. |
| `subcluster:prefill-decode` | Prefill/decode tradeoff, chunked prefill, or phase-aware scheduling. |
| `subcluster:pd-disaggregation` | Prefill/decode disaggregation and allocation. |
| `subcluster:slo-scheduling` | TTFT/TPOT/SLO-aware scheduling or allocation. |
| `subcluster:heterogeneous-serving` | Multi-GPU, heterogeneous models, heterogeneous workloads, or mixed hardware. |
| `subcluster:tail-latency` | p95/p99 latency control, queueing, admission, or overload behavior. |
| `subcluster:serving-workload` | LLM serving workload traces and benchmark harnesses. |

### Strategy Support
| Tag | Meaning |
|---|---|
| `subcluster:test-time-scaling` | Scaling test-time compute for reasoning or generation. |
| `subcluster:adaptive-compute` | Query-level compute allocation or dynamic inference. |
| `subcluster:difficulty-aware-budget` | Difficulty prediction and budget assignment. |
| `subcluster:confidence-gating` | Confidence, uncertainty, calibration, abstention, or escalation decisions. |
| `subcluster:model-routing` | Model routing, multi-model routing, or cheap-to-expensive selection. |
| `subcluster:cascade` | LLM cascades, staged inference, or fallback chains. |
| `subcluster:verifier-budget` | Verifier, critic, self-check, or refinement pass allocation. |
| `subcluster:early-stopping` | Stop/continue policies for reasoning, retrieval, verification, or sampling. |

## Resource Tags
| Tag | Meaning |
|---|---|
| `resource:retrieval-depth` | Number of retrieved docs/chunks or retrieval rounds. |
| `resource:top-k` | Top-k retrieval or top-k reranking decision. |
| `resource:context-window` | Context length, token budget, or prompt packing capacity. |
| `resource:chunk-size` | Chunk granularity or split/merge size. |
| `resource:rerank-depth` | Number of candidates sent to reranking. |
| `resource:generation-tokens` | Output/reasoning token budget. |
| `resource:reasoning-steps` | Number of reasoning/search steps. |
| `resource:verifier-passes` | Number of verifier or refinement passes. |
| `resource:model-choice` | Model selection as a resource/cost lever. |
| `resource:kv-cache` | KV cache memory. |
| `resource:prefix-cache` | Prefix/chunk/prompt cache. |
| `resource:prefill` | Prefill compute or workers. |
| `resource:decode` | Decode compute or workers. |
| `resource:gpu-memory` | GPU memory or memory pressure. |
| `resource:batch-slots` | Batch slots or admission capacity. |
| `resource:latency-budget` | Latency or SLO budget. |
| `resource:cost-budget` | Monetary or compute cost budget. |

## Decision Tags
| Tag | Meaning |
|---|---|
| `decision:retrieve-or-not` | Decide whether to retrieve at all. |
| `decision:top-k-selection` | Decide retrieval/rerank k. |
| `decision:context-packing` | Decide what evidence enters context. |
| `decision:rerank-depth` | Decide how much reranking to perform. |
| `decision:multi-hop-continue-stop` | Decide whether multi-hop retrieval/reasoning continues. |
| `decision:reason-continue-stop` | Decide whether generation/reasoning continues. |
| `decision:model-route` | Decide which model or model tier handles the request. |
| `decision:cache-admit-evict` | Decide cache admission, reuse, or eviction. |
| `decision:batch-schedule` | Decide request batching/scheduling. |
| `decision:prefill-decode-allocate` | Decide prefill/decode resource allocation. |
| `decision:budget-allocate` | Decide budget distribution across retrieval, context, generation, verification, or serving. |

## Metric Tags
| Tag | Meaning |
|---|---|
| `metric:answer-quality` | Accuracy, EM/F1, task success, or human quality. |
| `metric:faithfulness` | Faithfulness or hallucination risk. |
| `metric:citation-quality` | Citation precision, recall, attribution, or grounding. |
| `metric:recall-at-k` | Retrieval recall at k. |
| `metric:mrr` | Mean reciprocal rank. |
| `metric:ndcg` | nDCG or ranked relevance quality. |
| `metric:ttft` | Time to first token. |
| `metric:tpot` | Time per output token. |
| `metric:p95-latency` | p95 latency. |
| `metric:p99-latency` | p99 latency. |
| `metric:cost-per-query` | Cost per query/request. |
| `metric:tokens-per-query` | Token budget or tokens consumed per query. |
| `metric:gpu-utilization` | GPU utilization or occupancy. |
| `metric:cache-hit-rate` | Cache hit rate. |
| `metric:retrieval-stability` | Retrieval stability under paraphrase, reorder, split/merge, or noise perturbations. |
| `metric:regret` | Bandit/online regret or decision loss. |
| `metric:pareto-frontier` | Multi-objective Pareto frontier or tradeoff curve. |

## Theory Tags
| Tag | Meaning |
|---|---|
| `theory:queueing` | Queueing models for latency, SLO, admission, or serving phases. |
| `theory:online-scheduling` | Online scheduling, competitive analysis, dispatch, or preemption. |
| `theory:bandit` | Multi-armed/contextual bandit policy selection. |
| `theory:mdp` | MDP/RL formulation for stepwise retrieval/reasoning decisions. |
| `theory:optimal-stopping` | Continue/stop decisions under uncertainty and cost. |
| `theory:constrained-optimization` | Resource allocation under cost/latency/quality constraints. |
| `theory:submodular` | Submodular selection, coverage, diversity, or diminishing returns. |
| `theory:knapsack` | Budgeted selection and context packing. |
| `theory:measure` | Probability measure, distribution mismatch, density, or risk measure. |
| `theory:optimal-transport` | Distribution matching, Wasserstein distance, corpus-query alignment, or domain shift. |
| `theory:information-theory` | Mutual information, rate-distortion, information bottleneck, compression, or noisy channel modeling. |
| `theory:metric-space` | Metric geometry, semantic neighborhoods, distance design, or embedding spaces. |
| `theory:topology` | Topological structure, connectedness, covers, or persistent structures. |
| `theory:high-dimensional-geometry` | Concentration, hubness, nearest-neighbor effects, or random projection. |
| `theory:group-action` | Symmetry, invariance, equivariance, transformations acting on query/chunk/evidence space. |
| `theory:quotient-space` | Equivalence classes, orbit spaces, or deduplicated semantic/evidence classes. |
| `theory:field-coding` | Finite fields, coding theory, hashing, sketches, or robust evidence packing. |
| `theory:lattice` | Lattices, quantization, indexing, refinement, or partial-order structure. |
| `theory:ultrametric` | Hierarchical or p-adic style distance models. |
| `theory:category` | Compositional structures, morphisms, or evidence transformation pipelines. |
| `theory:monoid-semigroup` | Non-invertible composition such as split/merge/refine operations. |

## Fit Tags
| Tag | Meaning | Assignment Rule |
|---|---|---|
| `fit:experiment-foundation` | Candidate can feed reusable assets, workloads, baselines, metrics, run recipes, or evaluation protocols. | Assign when there is a dataset, benchmark, workload trace, baseline, metric, code, or reproducible protocol. |
| `fit:paper-implementation` | Candidate can support a future paper implementation or claim. | Assign when it provides a plausible method, system, theorem, baseline, failure mode, or experiment direction for our selected research program. |

## Priority Tags
| Tag | Meaning |
|---|---|
| `priority:p0` | Directly defines or strongly advances the main research problem; must receive a lightweight judgment card. |
| `priority:p1` | Important baseline, system primitive, strategy, benchmark, workload, or theory bridge; should receive a lightweight judgment card when imported. |
| `priority:p2` | Survey, taxonomy, benchmark, evaluator, or important background with medium downstream value. |
| `priority:p3` | Theory/background/adjacent literature with possible inspiration but no immediate implementation path. |
| `priority:p4` | Collected for traceability but not activated for this research program. |

## Classification Tags
| Tag | Meaning |
|---|---|
| `classification:seed` | Manually curated seed paper for Phase 2. |
| `classification:rule-derived` | Tags were assigned from query/source rules. |
| `classification:llm-assisted` | Tags were assigned or refined with LLM assistance. |
| `classification:human-reviewed` | Tags were reviewed by a human. |
| `classification:low-confidence` | Assignment is uncertain and needs review. |
| `classification:needs-judgment-card` | P0/P1 item missing the lightweight judgment card. |
| `classification:judgment-card-ready` | Lightweight judgment card exists as a task evidence artifact; not evidence-active by itself. |
| `classification:theory-inclusion-card-ready` | Theory inclusion card exists as a task evidence artifact; theory item remains seed-bank material until selected by a modeling task. |

## Era Tags
Use era tags only when the time layer matters for curation.

| Tag | Meaning |
|---|---|
| `era:classic-pre-2023` | Classic/foundational pre-2023 anchor. |
| `era:transition-2023-2024` | Modern RAG/serving transition layer. |
| `era:frontier-2025-2026` | Current frontier layer for this collection round. |

## Theory Inclusion Card
Every `collection:theory-support` item should have a mapping card in seed/query/triage evidence.

Required fields:
```text
theory_concept:
llm_rag_phenomenon:
possible_research_question:
experimental_variable:
metric_or_bound:
risk:
```

Inclusion rule:
```text
Keep the theory item only if it maps to retrieval, context, generation,
cache, scheduling, stopping, risk, or quality-cost-latency tradeoff.
```

## Example Tag Recipes

### Adaptive RAG Retrieval Gate
```text
collection:core
direction:rag-aware-allocation
subcluster:retrieval-gating
resource:retrieval-depth
decision:retrieve-or-not
metric:answer-quality
metric:cost-per-query
priority:p0
classification:seed
```

### RAG Serving Optimizer
```text
collection:core
bridge:core-system
direction:rag-aware-allocation
subcluster:rag-serving-optimization
resource:context-window
resource:prefill
resource:decode
decision:budget-allocate
metric:ttft
metric:p95-latency
fit:experiment-foundation
priority:p0
classification:seed
```

### LLM Serving KV Cache Primitive
```text
collection:system-support
direction:llm-serving-resource-allocation
subcluster:kv-cache
resource:kv-cache
decision:cache-admit-evict
metric:cache-hit-rate
metric:ttft
fit:experiment-foundation
priority:p1
```

### Test-Time Compute Budget Policy
```text
collection:strategy-support
direction:test-time-compute-budgeting
subcluster:difficulty-aware-budget
resource:reasoning-steps
decision:reason-continue-stop
metric:answer-quality
metric:tokens-per-query
priority:p1
```

### Measure-Theoretic RAG Theory Seed
```text
collection:theory-support
bridge:core-theory
theory:measure
theory:optimal-transport
theory:information-theory
resource:context-window
decision:context-packing
metric:faithfulness
metric:pareto-frontier
priority:p3
```

### Group-Action Chunking Theory Seed
```text
collection:theory-support
bridge:theory-to-chunking
theory:group-action
theory:quotient-space
theory:monoid-semigroup
resource:chunk-size
decision:context-packing
metric:retrieval-stability
priority:p3
```

## Anti-Drift Rules
1. Do not use `collection:core` for generic RAG papers without an explicit resource or budget decision.
2. Do not use `collection:system-support` for distributed systems papers unless they map to LLM/RAG inference constraints.
3. Do not use `collection:strategy-support` for reasoning papers unless the compute budget or stopping/routing decision is explicit.
4. Do not use `collection:theory-support` for broad math reading unless there is a theory inclusion card.
5. Do not use multiple `collection:*` tags for one item; use `bridge:*` instead.
6. Do not infer `fit:experiment-foundation` from popularity alone; require a reusable asset, workload, metric, protocol, or baseline path.
7. Do not infer `fit:paper-implementation` from topical relevance alone; require a plausible method, claim, baseline, failure mode, or experiment direction.
8. Do not treat tags as evidence activation.
