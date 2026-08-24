# 07 Seed Catalog

## Status
- Version: `seed-catalog.v1`
- State: frozen for Phase 2
- Owner task: `T-116 adaptive-llm-systems-literature-collection-ingestion`
- Date: 2026-06-03
- Taxonomy source: `06-taxonomy.md`

## Purpose
- Provide a curated seed catalog for the current adaptive LLM systems literature collection round.
- Anchor the four collection layers before broader query expansion and metadata import.
- Prefer papers that can become either experiment-foundation baselines, PaperImplementation candidates, or theory-support seeds.
- Keep this catalog source-oriented: every item has a stable source URL and initial tags, but no database schema change is required.

## Selection Rules
- Include papers that directly support the main axis: large-model system optimization plus adaptive resource allocation.
- Prioritize primary scholarly sources: arXiv, OpenReview, ACL Anthology, USENIX, ACM, IEEE, PMLR, NeurIPS, or DOI landing pages.
- Assign exactly one primary `collection:*` tag per seed.
- Use `bridge:*` tags for cross-layer papers.
- Mark P0/P1 seeds as `classification:needs-judgment-card` until Phase 5 adds the lightweight judgment cards.
- Do not auto-trigger fulltext acquisition, extraction, chunking, embedding, or indexing from this catalog alone.

## Catalog Summary

| Layer | Seed Count | Main Role |
|---|---:|---|
| `collection:core` | 19 | RAG-aware allocation, adaptive retrieval, RAG serving, RAG workload/evaluation |
| `collection:system-support` | 10 | Serving substrate, KV cache, batching, prefill/decode, SLO allocation |
| `collection:strategy-support` | 8 | Test-time compute, reasoning budget, model routing, cascade policies |
| `collection:theory-support` | 12 | Queueing, bandit, submodular selection, information theory, geometry, measure, group/space seeds |
| Total | 49 | Phase 2 seed catalog for Phase 3 query expansion |

## Priority Interpretation
- `priority:p0`: strongest direct fit to the current research direction; judgment card required.
- `priority:p1`: important baseline, substrate, or bridge; judgment card required.
- `priority:p2`: benchmark/evaluation/survey/background seed.
- `priority:p3`: theory or inspiration seed requiring mapping before activation.

## Core Seeds

| ID | Title | Year | Source URL | Initial Tags | Why Relevant | Import Hint |
|---|---|---:|---|---|---|---|
| `COR-001` | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | 2020 | https://arxiv.org/abs/2005.11401 | `collection:core`, `direction:rag-aware-allocation`, `subcluster:rag-evaluation-quality`, `metric:answer-quality`, `priority:p1`, `era:classic-pre-2023`, `classification:seed`, `classification:needs-judgment-card` | Foundational RAG formulation; needed as baseline for any adaptive retrieval-compute argument. | `arxiv` |
| `COR-002` | Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering | 2020 | https://arxiv.org/abs/2007.01282 | `collection:core`, `subcluster:retrieval-depth`, `resource:retrieval-depth`, `metric:answer-quality`, `priority:p1`, `era:classic-pre-2023`, `classification:seed`, `classification:needs-judgment-card` | Classic evidence that increasing retrieved passages changes quality; useful for retrieval-depth budget baselines. | `arxiv` |
| `COR-003` | BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models | 2021 | https://arxiv.org/abs/2104.08663 | `collection:core`, `subcluster:rag-evaluation-quality`, `metric:recall-at-k`, `metric:mrr`, `metric:ndcg`, `fit:experiment-foundation`, `priority:p2`, `era:classic-pre-2023`, `classification:seed` | Retrieval benchmark substrate for query/corpus behavior and zero-shot retrieval quality. | `arxiv` |
| `COR-004` | FLARE: Forward-Looking Active Retrieval Augmented Generation | 2023 | https://arxiv.org/abs/2305.06983 | `collection:core`, `direction:rag-aware-allocation`, `subcluster:retrieval-gating`, `subcluster:multi-hop-rag`, `decision:retrieve-or-not`, `decision:multi-hop-continue-stop`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Introduces active, generation-time retrieval decisions; directly supports adaptive retrieve/stop policy design. | `arxiv` |
| `COR-005` | Enabling Large Language Models to Generate Text with Citations | 2023 | https://arxiv.org/abs/2305.14627 | `collection:core`, `subcluster:rag-evaluation-quality`, `metric:citation-quality`, `metric:faithfulness`, `fit:experiment-foundation`, `priority:p2`, `era:transition-2023-2024`, `classification:seed` | Citation quality and grounding evaluation seed; useful when adaptive allocation affects evidence support. | `arxiv` |
| `COR-006` | Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection | 2023 | https://arxiv.org/abs/2310.11511 | `collection:core`, `bridge:core-strategy`, `direction:rag-aware-allocation`, `subcluster:retrieval-gating`, `subcluster:confidence-gating`, `decision:retrieve-or-not`, `metric:faithfulness`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | On-demand retrieval and critique tokens map cleanly to retrieve/generate/critic budget decisions. | `arxiv` |
| `COR-007` | Corrective Retrieval Augmented Generation | 2024 | https://arxiv.org/abs/2401.15884 | `collection:core`, `bridge:core-strategy`, `subcluster:retrieval-gating`, `subcluster:rag-evaluation-quality`, `decision:retrieve-or-not`, `metric:faithfulness`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Retrieval evaluator and corrective action provide a practical gate for low-quality evidence. | `arxiv` |
| `COR-008` | Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity | 2024 | https://arxiv.org/abs/2403.14403 | `collection:core`, `direction:rag-aware-allocation`, `subcluster:rag-routing`, `subcluster:difficulty-aware-budget`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Direct seed for routing between retrieval strategies by question complexity. | `arxiv`; `acl-anthology` optional |
| `COR-009` | CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion | 2024 | https://arxiv.org/abs/2405.16444 | `collection:core`, `bridge:core-system`, `direction:rag-aware-allocation`, `subcluster:rag-serving-optimization`, `subcluster:kv-cache`, `resource:kv-cache`, `resource:context-window`, `metric:ttft`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | RAG-specific cached-context serving seed; bridges chunk context reuse with TTFT/resource tradeoffs. | `arxiv` |
| `COR-010` | RAGBench: Explainable Benchmark for Retrieval-Augmented Generation Systems | 2024 | https://arxiv.org/abs/2407.11005 | `collection:core`, `subcluster:rag-evaluation-quality`, `metric:answer-quality`, `metric:faithfulness`, `fit:experiment-foundation`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:judgment-card-ready` | Benchmark/evaluation seed for grounded quality labels and production-like RAG examples; promoted to P1 for experiment-foundation readiness. | `arxiv` |
| `COR-011` | RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation | 2024 | https://arxiv.org/abs/2408.08067 | `collection:core`, `subcluster:rag-evaluation-quality`, `metric:faithfulness`, `metric:answer-quality`, `fit:experiment-foundation`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:judgment-card-ready` | Diagnostic metric seed; useful for measuring which module fails under budget changes; promoted to P1 for experiment-foundation readiness. | `arxiv` |
| `COR-012` | METIS: Fast Quality-Aware RAG Systems with Configuration Adaptation | 2024 | https://arxiv.org/abs/2412.10543 | `collection:core`, `bridge:core-system`, `direction:rag-aware-allocation`, `subcluster:rag-serving-optimization`, `resource:retrieval-depth`, `resource:context-window`, `decision:budget-allocate`, `metric:ttft`, `metric:p95-latency`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Closest current seed for joint RAG configuration adaptation and query scheduling under quality/latency tradeoff. | `arxiv` |
| `COR-013` | RAGO: Systematic Performance Optimization for Retrieval-Augmented Generation Serving | 2025 | https://arxiv.org/abs/2503.14649 | `collection:core`, `bridge:core-system`, `direction:rag-aware-allocation`, `subcluster:rag-serving-optimization`, `resource:prefill`, `resource:decode`, `metric:ttft`, `metric:cost-per-query`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | RAGSchema and RAG serving optimizer seed; important for systematizing RAG workload variants. | `arxiv` |
| `COR-014` | DeepRAG: Thinking to Retrieve Step by Step for Large Language Models | 2025 | https://arxiv.org/abs/2502.01142 | `collection:core`, `bridge:core-theory`, `direction:rag-aware-allocation`, `subcluster:multi-hop-rag`, `theory:mdp`, `decision:retrieve-or-not`, `decision:multi-hop-continue-stop`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Models retrieval-augmented reasoning as an MDP; strong bridge from policy theory to adaptive retrieval. | `arxiv` |
| `COR-015` | SARA: Selective and Adaptive Retrieval-augmented Generation with Context Compression | 2025 | https://arxiv.org/abs/2507.05633 | `collection:core`, `direction:rag-aware-allocation`, `subcluster:context-budget`, `resource:context-window`, `decision:context-packing`, `metric:answer-quality`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Context-budget seed for adaptive evidence selection and compression under tight context limits. | `arxiv` |
| `COR-016` | TARG: Retrieval-Augmented Generation with Cost-Effective Textual Uncertainty Estimation | 2025 | https://arxiv.org/abs/2511.09803 | `collection:core`, `bridge:core-strategy`, `direction:rag-aware-allocation`, `subcluster:retrieval-gating`, `decision:retrieve-or-not`, `metric:cost-per-query`, `metric:answer-quality`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Training-free retrieve-or-not gate using uncertainty from a short draft; highly aligned with lightweight allocation policy. | `arxiv` |
| `COR-017` | Stop-RAG: Value-Based Retrieval Control for Iterative RAG | 2025 | https://arxiv.org/abs/2510.14337 | `collection:core`, `bridge:core-theory`, `direction:rag-aware-allocation`, `subcluster:multi-hop-rag`, `theory:mdp`, `theory:optimal-stopping`, `decision:multi-hop-continue-stop`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Direct seed for adaptive stopping in iterative RAG; maps to finite-horizon control under latency/cost risk. | `arxiv` |
| `COR-018` | RAGPulse: An Open-Source RAG Workload Trace to Optimize RAG Serving Systems | 2025 | https://arxiv.org/abs/2511.12979 | `collection:core`, `bridge:core-system`, `subcluster:rag-workload`, `subcluster:rag-serving-optimization`, `metric:cache-hit-rate`, `fit:experiment-foundation`, `priority:p1`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | RAG-specific workload trace; useful for experiment-foundation workloads and cache/batching studies. | `arxiv` |
| `COR-019` | RAGRouter-Bench: A Dataset and Benchmark for Adaptive RAG Routing | 2026 | https://arxiv.org/abs/2602.00296 | `collection:core`, `direction:rag-aware-allocation`, `subcluster:rag-routing`, `subcluster:rag-evaluation-quality`, `decision:budget-allocate`, `metric:answer-quality`, `metric:cost-per-query`, `fit:experiment-foundation`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Current frontier seed for adaptive RAG routing from query-corpus compatibility and effectiveness-efficiency tradeoffs. | `arxiv` |

## System Support Seeds

| ID | Title | Year | Source URL | Initial Tags | Why Relevant | Import Hint |
|---|---|---:|---|---|---|---|
| `SYS-001` | Orca: A Distributed Serving System for Transformer-Based Generative Models | 2022 | https://www.usenix.org/conference/osdi22/presentation/yu | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:continuous-batching`, `decision:batch-schedule`, `metric:tokens-per-query`, `metric:p95-latency`, `priority:p1`, `era:classic-pre-2023`, `classification:seed`, `classification:needs-judgment-card` | Iteration-level scheduling and selective batching are baseline primitives for LLM serving allocation. | `manual:usenix` |
| `SYS-002` | FlexGen: High-Throughput Generative Inference of Large Language Models with a Single GPU | 2023 | https://arxiv.org/abs/2303.06865 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:heterogeneous-serving`, `resource:gpu-memory`, `metric:tokens-per-query`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Memory/offload configuration seed for constrained inference resources. | `arxiv` |
| `SYS-003` | Efficient Memory Management for Large Language Model Serving with PagedAttention | 2023 | https://arxiv.org/abs/2309.06180 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:kv-cache`, `resource:kv-cache`, `resource:batch-slots`, `metric:gpu-utilization`, `metric:cache-hit-rate`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | vLLM/PagedAttention is the practical serving baseline for KV cache and batching experiments. | `arxiv` |
| `SYS-004` | CacheGen: KV Cache Compression and Streaming for Fast Large Language Model Serving | 2023 | https://arxiv.org/abs/2310.07240 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:kv-cache`, `resource:kv-cache`, `metric:ttft`, `metric:cost-per-query`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | KV cache compression/streaming seed for long-context and repeated-context serving. | `arxiv` |
| `SYS-005` | SGLang: Efficient Execution of Structured Language Model Programs | 2023 | https://arxiv.org/abs/2312.07104 | `collection:system-support`, `bridge:system-strategy`, `direction:llm-serving-resource-allocation`, `subcluster:prefix-cache`, `subcluster:continuous-batching`, `resource:prefix-cache`, `decision:cache-admit-evict`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Runtime substrate for multi-call LLM programs, RadixAttention, and structured generation workloads. | `arxiv` |
| `SYS-006` | Sarathi-Serve: Tackling Stall-Free Scheduling in LLM Inference | 2024 | https://arxiv.org/abs/2403.02310 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:prefill-decode`, `subcluster:continuous-batching`, `resource:prefill`, `resource:decode`, `decision:batch-schedule`, `metric:ttft`, `metric:tpot`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Chunked prefill and scheduling baseline for balancing prefill/decode interference. | `arxiv` |
| `SYS-007` | DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving | 2024 | https://arxiv.org/abs/2401.09670 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:pd-disaggregation`, `subcluster:slo-scheduling`, `resource:prefill`, `resource:decode`, `decision:prefill-decode-allocate`, `metric:ttft`, `metric:tpot`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Strong substrate for phase-aware resource allocation under TTFT/TPOT constraints. | `arxiv`; `manual:usenix` optional |
| `SYS-008` | Splitwise: Efficient Generative LLM Inference Using Phase Splitting | 2023 | https://arxiv.org/abs/2311.18677 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:prefill-decode`, `subcluster:heterogeneous-serving`, `resource:prefill`, `resource:decode`, `metric:cost-per-query`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Phase-splitting baseline for separate prompt compute and token generation resource profiles. | `arxiv`; `manual:acm` optional |
| `SYS-009` | Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving | 2024 | https://arxiv.org/abs/2407.00079 | `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:kv-cache`, `subcluster:pd-disaggregation`, `subcluster:slo-scheduling`, `resource:kv-cache`, `decision:cache-admit-evict`, `metric:cache-hit-rate`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Production-scale KV cache/disaggregation seed with long-context workload implications. | `arxiv` |
| `SYS-010` | SLO-Aware Compute Resource Allocation for Prefill-Decode Disaggregated LLM Inference | 2026 | https://arxiv.org/abs/2603.04716 | `collection:system-support`, `bridge:system-strategy`, `direction:llm-serving-resource-allocation`, `subcluster:pd-disaggregation`, `subcluster:slo-scheduling`, `theory:queueing`, `resource:prefill`, `resource:decode`, `decision:prefill-decode-allocate`, `metric:ttft`, `metric:tpot`, `priority:p1`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Current seed for explicit P/D resource allocation under throughput and SLO constraints. | `arxiv` |

## Strategy Support Seeds

| ID | Title | Year | Source URL | Initial Tags | Why Relevant | Import Hint |
|---|---|---:|---|---|---|---|
| `STR-001` | Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | 2022 | https://arxiv.org/abs/2201.11903 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `resource:reasoning-steps`, `metric:answer-quality`, `priority:p1`, `era:classic-pre-2023`, `classification:seed`, `classification:needs-judgment-card` | Foundational reasoning-step baseline; needed to compare fixed vs adaptive reasoning budget. | `arxiv` |
| `STR-002` | Self-Consistency Improves Chain of Thought Reasoning in Language Models | 2022 | https://arxiv.org/abs/2203.11171 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `resource:generation-tokens`, `resource:verifier-passes`, `metric:answer-quality`, `priority:p1`, `era:classic-pre-2023`, `classification:seed`, `classification:needs-judgment-card` | Sampling/aggregation seed for spending more inference compute at test time. | `arxiv` |
| `STR-003` | FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance | 2023 | https://arxiv.org/abs/2305.05176 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:cascade`, `subcluster:model-routing`, `resource:model-choice`, `resource:cost-budget`, `decision:model-route`, `metric:cost-per-query`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Early cost-aware cascade/routing seed; useful for policy baselines beyond retrieval. | `arxiv` |
| `STR-004` | Tree of Thoughts: Deliberate Problem Solving with Large Language Models | 2023 | https://arxiv.org/abs/2305.10601 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `subcluster:adaptive-compute`, `resource:reasoning-steps`, `decision:reason-continue-stop`, `metric:answer-quality`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Search-style reasoning seed for allocating branch/depth budget. | `arxiv` |
| `STR-005` | RouteLLM: Learning to Route LLMs with Preference Data | 2024 | https://arxiv.org/abs/2406.18665 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:model-routing`, `resource:model-choice`, `resource:cost-budget`, `decision:model-route`, `metric:cost-per-query`, `metric:answer-quality`, `priority:p0`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Direct seed for dynamic quality-cost routing between model tiers. | `arxiv` |
| `STR-006` | Scaling LLM Test-Time Compute Optimally Can be More Effective than Scaling Parameters for Reasoning | 2025 | https://openreview.net/forum?id=4FWAwZtd2n | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `subcluster:difficulty-aware-budget`, `resource:reasoning-steps`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p0`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Core test-time compute scaling seed; motivates adaptive compute allocation per prompt. | `manual:openreview` |
| `STR-007` | Reasoning on a Budget: A Survey of Adaptive and Controllable Test-Time Compute in LLMs | 2025 | https://arxiv.org/abs/2507.02076 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:adaptive-compute`, `subcluster:difficulty-aware-budget`, `subcluster:early-stopping`, `priority:p2`, `era:frontier-2025-2026`, `classification:seed` | Survey seed for Phase 3 query expansion and method taxonomy around controllability/adaptiveness. | `arxiv` |
| `STR-008` | The Art of Scaling Test-Time Compute for Large Language Models | 2025 | https://arxiv.org/abs/2512.02008 | `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `subcluster:difficulty-aware-budget`, `resource:generation-tokens`, `resource:reasoning-steps`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p1`, `era:frontier-2025-2026`, `classification:seed`, `classification:needs-judgment-card` | Large-scale comparative TTS seed; useful for difficulty/model/budget recipe extraction. | `arxiv` |

## Theory Support Seeds

| ID | Title | Year | Source URL | Initial Tags | Why Relevant | Import Hint |
|---|---|---:|---|---|---|---|
| `THY-001` | An analysis of approximations for maximizing submodular set functions - I | 1978 | https://doi.org/10.1007/BF01588971 | `collection:theory-support`, `theory:submodular`, `theory:knapsack`, `resource:context-window`, `decision:context-packing`, `metric:pareto-frontier`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Formal support for budgeted evidence selection, diversity, and diminishing returns in context packing. | `manual:doi` |
| `THY-002` | On the Resemblance and Containment of Documents | 1997 | https://doi.org/10.1109/SEQUEN.1997.666900 | `collection:theory-support`, `bridge:theory-to-chunking`, `theory:measure`, `theory:field-coding`, `resource:chunk-size`, `metric:retrieval-stability`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | MinHash/document resemblance seed; useful for chunk equivalence, overlap, and dedup-inspired retrieval spaces. | `manual:doi` |
| `THY-003` | Approximate Nearest Neighbors: Towards Removing the Curse of Dimensionality | 1998 | https://dl.acm.org/doi/10.1145/276698.276876 | `collection:theory-support`, `theory:metric-space`, `theory:field-coding`, `theory:lattice`, `metric:recall-at-k`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | LSH/ANN seed for embedding retrieval efficiency and approximate search tradeoffs. | `manual:acm` |
| `THY-004` | When Is Nearest Neighbor Meaningful? | 1999 | https://doi.org/10.1007/3-540-49257-7_15 | `collection:theory-support`, `theory:high-dimensional-geometry`, `theory:measure`, `theory:metric-space`, `metric:retrieval-stability`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Supports analysis of high-dimensional embedding failure modes and distance concentration. | `manual:doi` |
| `THY-005` | The Information Bottleneck Method | 2000 | https://arxiv.org/abs/physics/0004057 | `collection:theory-support`, `theory:information-theory`, `theory:constrained-optimization`, `resource:context-window`, `decision:context-packing`, `metric:answer-quality`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Information compression seed for context selection and lossy/lossless evidence tradeoffs. | `arxiv` |
| `THY-006` | Random Projection in Dimensionality Reduction: Applications to Image and Text Data | 2001 | https://dl.acm.org/doi/10.1145/502512.502546 | `collection:theory-support`, `theory:high-dimensional-geometry`, `theory:metric-space`, `theory:measure`, `metric:retrieval-stability`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Johnson-Lindenstrauss/random projection seed for embedding-space simplification and stability. | `manual:acm` |
| `THY-007` | Finite-time Analysis of the Multiarmed Bandit Problem | 2002 | https://doi.org/10.1023/A:1013689704352 | `collection:theory-support`, `theory:bandit`, `decision:budget-allocate`, `decision:model-route`, `metric:regret`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Regret-bound seed for adaptive routing/retrieval policy selection under uncertainty. | `manual:doi` |
| `THY-008` | Sinkhorn Distances: Lightspeed Computation of Optimal Transport | 2013 | https://papers.nips.cc/paper/4927-sinkhorn-distances-lightspeed-computation-of-optimal-transport | `collection:theory-support`, `theory:optimal-transport`, `theory:measure`, `metric:retrieval-stability`, `metric:pareto-frontier`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Optimal transport seed for query-corpus distribution alignment and domain-shift-aware routing. | `manual:neurips` |
| `THY-009` | Group Equivariant Convolutional Networks | 2016 | https://arxiv.org/abs/1602.07576 | `collection:theory-support`, `bridge:theory-to-chunking`, `theory:group-action`, `theory:quotient-space`, `metric:retrieval-stability`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Group-action seed for invariance/equivariance ideas in chunk transformations and semantic equivalence classes. | `arxiv`; `manual:pmlr` optional |
| `THY-010` | Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges | 2021 | https://arxiv.org/abs/2104.13478 | `collection:theory-support`, `bridge:theory-to-chunking`, `theory:group-action`, `theory:topology`, `theory:metric-space`, `theory:quotient-space`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Broad spatial/symmetry framework for defining chunk spaces, evidence transformations, and invariant retrieval signals. | `arxiv` |
| `THY-011` | A Queueing Theoretic Perspective on Low-Latency LLM Inference with Variable Token Length | 2024 | https://arxiv.org/abs/2407.05347 | `collection:theory-support`, `bridge:system-strategy`, `theory:queueing`, `resource:latency-budget`, `metric:ttft`, `metric:p95-latency`, `priority:p1`, `era:transition-2023-2024`, `classification:seed`, `classification:needs-judgment-card` | Theory bridge for variable token length, latency, and LLM serving queue behavior. | `arxiv` |
| `THY-012` | A Mathematical Theory of Communication | 1948 | https://doi.org/10.1002/j.1538-7305.1948.tb01338.x | `collection:theory-support`, `theory:information-theory`, `theory:measure`, `theory:field-coding`, `resource:context-window`, `metric:pareto-frontier`, `priority:p3`, `era:classic-pre-2023`, `classification:seed` | Entropy/coding seed for measuring information loss, redundancy, and evidence packing under context budget. | `manual:doi` |

## Immediate P0/P1 Judgment Queue

Phase 5 generated lightweight judgment cards for the imported counterparts of these P0/P1 seeds before promotion to experiment or paper-implementation candidates:

```text
COR-001
COR-002
COR-004
COR-006
COR-007
COR-008
COR-009
COR-010
COR-011
COR-012
COR-013
COR-014
COR-015
COR-016
COR-017
COR-018
COR-019
SYS-001
SYS-002
SYS-003
SYS-004
SYS-005
SYS-006
SYS-007
SYS-008
SYS-009
SYS-010
STR-001
STR-002
STR-003
STR-004
STR-005
STR-006
STR-008
THY-011
```

`STR-007` is a survey seed and remains `priority:p2`; use it to derive query terms rather than to create an experiment card.

## Theory Inclusion Cards - Required Mappings

These are concise mapping notes for Phase 5. They are not final judgment cards.

| ID | theory_concept | llm_rag_phenomenon | possible_research_question | experimental_variable | metric_or_bound | risk |
|---|---|---|---|---|---|---|
| `THY-001` | Submodular maximization under cardinality/budget constraints | Evidence selection and context packing | Can context packing be treated as submodular coverage under token budget? | chunk budget, diversity penalty, context order | answer quality, citation coverage, approximation-style frontier | Real evidence utility may not be submodular. |
| `THY-002` | Document resemblance and containment | Chunk overlap, dedup, semantic equivalence | Can chunk definitions preserve containment/resemblance under split/merge transforms? | chunk size, overlap, hashing sketch | retrieval stability, duplicate rate | Shingle similarity may miss semantic equivalence. |
| `THY-003` | Approximate nearest neighbor / LSH | Fast retrieval under embedding index constraints | How much retrieval quality can be traded for latency in adaptive RAG? | ANN recall target, index parameter | recall-at-k, latency, regret proxy | Modern dense retrieval may not match classic LSH assumptions. |
| `THY-004` | Distance concentration | Embedding-space retrieval failures | When does nearest-neighbor retrieval become unstable under high-dimensional semantic noise? | embedding dimension, corpus size, noise level | retrieval stability, nDCG | Hard to isolate geometry from model training artifacts. |
| `THY-005` | Information bottleneck | Context compression and evidence sufficiency | Can context budget be allocated by preserving answer-relevant information while dropping nuisance text? | compression ratio, selected spans | faithfulness, citation quality | Mutual information is hard to estimate robustly. |
| `THY-006` | Random projection and distance preservation | Low-cost semantic projection / index simplification | Can lower-dimensional projections preserve routing decisions while reducing retrieval cost? | projection dimension, index type | recall-at-k, latency | Projection may preserve distances but not task relevance. |
| `THY-007` | Bandit regret | Online selection of retrieval/generation/model policies | Can query-level RAG strategy selection be learned with regret guarantees? | arms as RAG strategies, exploration rate | regret, answer quality, cost-per-query | Non-stationary user/corpus distribution may break assumptions. |
| `THY-008` | Optimal transport | Query-corpus/domain alignment | Can corpus routing use distribution distance between query type and corpus structure? | transport regularization, corpus partitions | answer quality, cost, compatibility | OT cost definition may dominate conclusions. |
| `THY-009` | Group action and equivariance | Chunk transformations and invariant retrieval | Can we define a group/semigroup of chunk transforms where retrieval remains invariant or controlled? | split/merge/reorder/paraphrase transforms | retrieval stability, faithfulness | True chunk transforms may be non-invertible, requiring semigroup treatment. |
| `THY-010` | Geometric deep learning / quotient spaces | Structured chunk space and evidence transformations | Can quotient-space thinking define semantic equivalence classes for chunks? | equivalence relation, grouping rule | retrieval stability, citation support | Abstraction may be too broad without concrete operator design. |
| `THY-011` | Queueing under variable token length | LLM request latency and token-length variability | Can queueing explain when adaptive retrieval/context budgets overload serving? | input length, output length, arrival rate | TTFT, p95 latency | Simplified queue assumptions may diverge from GPU batching. |
| `THY-012` | Entropy, redundancy, and coding | Evidence compression and context budget | Can RAG context selection be modeled as preserving task-relevant information under a token-rate constraint? | context length, redundancy removal, chunk coding rule | answer quality, faithfulness, citation coverage | Classic source-level theory is not task-aware without a relevance model. |

## Phase 3 Query Expansion Hints

Use this seed catalog to derive query families, not as a final corpus.

| Query Family | Seed Anchors | Default Tags |
|---|---|---|
| Adaptive retrieve-or-not / retrieval gating | `COR-004`, `COR-006`, `COR-007`, `COR-016` | `collection:core`, `direction:rag-aware-allocation`, `subcluster:retrieval-gating` |
| RAG serving and configuration adaptation | `COR-009`, `COR-012`, `COR-013`, `COR-018` | `collection:core`, `bridge:core-system`, `subcluster:rag-serving-optimization` |
| RAG routing and query-corpus compatibility | `COR-008`, `COR-019`, `STR-005`, `THY-008` | `collection:core`, `subcluster:rag-routing`, `decision:budget-allocate` |
| Context budget and evidence packing | `COR-002`, `COR-015`, `THY-001`, `THY-005` | `collection:core`, `subcluster:context-budget`, `decision:context-packing` |
| Iterative / multi-hop RAG stopping | `COR-004`, `COR-014`, `COR-017`, `THY-007` | `collection:core`, `subcluster:multi-hop-rag`, `decision:multi-hop-continue-stop` |
| LLM serving scheduling | `SYS-001`, `SYS-003`, `SYS-006`, `SYS-007` | `collection:system-support`, `direction:llm-serving-resource-allocation` |
| P/D disaggregation and SLO allocation | `SYS-006`, `SYS-007`, `SYS-008`, `SYS-009`, `SYS-010`, `THY-011` | `collection:system-support`, `subcluster:pd-disaggregation`, `subcluster:slo-scheduling` |
| Test-time compute scaling and routing | `STR-001`, `STR-002`, `STR-004`, `STR-005`, `STR-006`, `STR-008` | `collection:strategy-support`, `direction:test-time-compute-budgeting` |
| Theory for chunk/evidence spaces | `THY-002`, `THY-004`, `THY-009`, `THY-010` | `collection:theory-support`, `bridge:theory-to-chunking` |

## Defer For Later Expansion

These areas are adjacent but should not dilute Phase 2 seeds:
- Generic agentic RAG surveys without explicit budget/resource decisions.
- Long-context-only papers unless they expose measurable context budget failure modes.
- GraphRAG papers unless they include routing, context budget, retrieval depth, or cost/latency decisions.
- Generic world-model papers unless they provide an implementable policy or formalism for adaptive RAG/LLM resource allocation.
- Broad algebra/number-theory papers without a concrete mapping card to chunk space, retrieval stability, coding/sketching, or measure.

## Phase 2 Acceptance Check

- The seed catalog covers the three agreed research directions:
  - RAG-aware resource allocation / adaptive retrieval-compute allocation.
  - LLM serving scheduling and resource allocation.
  - Test-time compute budgeting.
- The seed catalog also covers theory support:
  - queueing, bandit, optimal stopping, submodular selection, measure, optimal transport, information theory, metric/high-dimensional geometry, group action, quotient space, field/coding, and lattice-related retrieval ideas.
- The seed catalog is ready to feed Phase 3 query catalog generation.
