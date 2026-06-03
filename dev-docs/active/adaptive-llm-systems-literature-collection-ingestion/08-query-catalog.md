# 08 Query Catalog

## Status
- Version: `query-catalog.v1`
- State: frozen for Phase 3
- Owner task: `T-116 adaptive-llm-systems-literature-collection-ingestion`
- Date: 2026-06-03
- Taxonomy source: `06-taxonomy.md`
- Seed source: `07-seed-catalog.md`

## Purpose
- Turn Phase 2 seed papers into executable collection queries.
- Keep the collection focused on adaptive LLM systems, not generic RAG/LLM engineering.
- Provide default tags, source routing, time windows, inclusion rules, and exclusion rules before Phase 4 import batches.
- Keep collection separate from content processing: query execution may import metadata and tags, but must not auto-trigger fulltext acquisition, extraction, chunking, embedding, or indexing.

## Research Brief
- Question: which query families should drive the first controlled expansion from the curated seed papers?
- Decision context: the corpus should support research on large-model system optimization plus adaptive resource allocation, with three main directions and theory support.
- Recency requirement:
  - Core, system, and strategy frontier sweeps should emphasize 2023-2026.
  - Classic RAG, serving, reasoning, and mathematical foundations should be imported by exact seed/title/citation expansion rather than broad old-year sweeps.
  - 2026 preprints should be accepted as frontier seeds only when source, title, and relevance are explicit; otherwise mark `classification:low-confidence`.

## Source Evidence

| Claim | Source | Why Trusted | Usage |
|---|---|---|---|
| arXiv supports fielded API search and is the primary source for CS preprints. | https://info.arxiv.org/help/api/user-manual.html | Official arXiv API manual. | Use for high-recall recent preprint queries and exact arXiv seed imports. |
| Crossref REST API supports bibliographic metadata discovery. | https://api.crossref.org/swagger-ui/index.html | Official Crossref API reference. | Use for DOI/manual source backfill and classic theory metadata. |
| Semantic Scholar Graph API supports paper search and metadata fields. | https://api.semanticscholar.org/api-docs/ | Official Semantic Scholar API docs. | Use for citation expansion and missing venue/code/context metadata when repo support allows. |
| OpenAlex provides works search and filters for scholarly metadata. | https://docs.openalex.org/api-entities/works/search-works | Official OpenAlex docs. | Use as an auxiliary cross-source metadata and citation/related-work expansion source. |
| OpenReview hosts conference submissions and reviews for recent LLM work. | https://openreview.net/ | Primary venue platform. | Use for manual import of OpenReview-only papers such as ICLR test-time compute work. |
| ACL Anthology is the primary source for ACL-family NLP proceedings. | https://aclanthology.org/ | Primary ACL anthology. | Use for accepted NLP/RAG papers where arXiv title differs or venue metadata matters. |
| USENIX and ACM are primary systems venues. | https://www.usenix.org/conferences, https://dl.acm.org/ | Primary venue libraries. | Use for systems papers where arXiv is absent, incomplete, or preprint title differs from proceedings title. |

## Query Grammar

Use query strings as templates, not literal one-shot searches. Start with exact phrase variants, then relax one term at a time.

```text
exact seed title -> exact phrase family -> constrained keyword family -> citation expansion
```

Recommended metadata fields per collected item:
```text
title
authors
year
source
source_url
doi_or_arxiv_id
venue
abstract
tags
query_id
query_family
seed_anchors
import_batch
classification_notes
```

Default imported-item tags:
```text
classification:rule-derived
classification:low-confidence   # only when assignment is uncertain
```

## Global Inclusion Rules
- Include papers with an explicit resource, budget, scheduling, routing, stopping, cache, context, retrieval-depth, latency, cost, or quality tradeoff.
- Include papers that can map to at least one `resource:*`, one `decision:*`, or one `metric:*` tag from `06-taxonomy.md`.
- Include benchmark/workload/evaluation papers when they provide reusable experimental baselines, metrics, or failure analysis for adaptive allocation.
- Include theory papers only when a theory inclusion card can map the concept to retrieval, context, generation, cache, scheduling, stopping, risk, or quality-cost-latency tradeoff.

## Global Exclusion Rules
- Exclude generic RAG, GraphRAG, agentic RAG, long-context, prompt engineering, or survey papers unless they expose an adaptive resource decision or measurable tradeoff.
- Exclude generic LLM serving papers that cannot map to KV/prefix cache, batching, prefill/decode, SLO, tail latency, heterogeneous resources, or workload characterization.
- Exclude pure reasoning papers without controllable test-time budget, routing, stopping, verifier, sampling, or cascade policy.
- Exclude broad mathematics papers without a concrete mapping to chunk space, retrieval stability, context budget, online policy, or serving allocation.
- Mark papers `classification:low-confidence` instead of forcing a layer when the abstract only weakly matches the query family.

## Time Windows

| Window | Use For | Rule |
|---|---|---|
| `classic-pre-2023` | Classic RAG, serving, CoT, bandit, submodular, information theory, ANN/LSH, geometry. | Prefer exact seed import, citation expansion, or manual DOI import. Avoid broad old-year sweeps. |
| `transition-2023-2024` | Self-RAG, adaptive RAG, vLLM, SGLang, P/D disaggregation, modern reasoning budget. | Run source queries with moderate breadth and strict inclusion rules. |
| `frontier-2025-2026` | RAG serving optimizers, RAG routing, adaptive retrieval gates, test-time compute surveys, SLO allocation. | Run source queries with higher recall, then tag uncertain items low-confidence. |

## Source Routing

| Source Route | Best For | Phase 4 Handling |
|---|---|---|
| `arxiv:auto` | Recent CS preprints, exact arXiv IDs, high-recall query sweeps. | Use first for most core/system/strategy frontier queries. |
| `crossref:auto` | DOI, journal/proceedings metadata, classic theory. | Use for metadata backfill and manual DOI targets. |
| `zotero:manual` | Papers from OpenReview, ACL, USENIX, ACM, IEEE when automatic import misses metadata. | Stage manually after arXiv/Crossref pass. |
| `openreview:manual` | ICLR/NeurIPS workshop/conference submissions not reliably mirrored elsewhere. | Import by exact URL/title; preserve review-page URL as source. |
| `acl:manual` | ACL-family accepted NLP/RAG papers. | Use when venue authority matters or arXiv title differs. |
| `usenix-acm-ieee:manual` | Systems papers with proceedings-specific metadata. | Use for final metadata correction after arXiv preprint import. |
| `semantic-scholar-or-openalex:aux` | Citation expansion, related-paper discovery, missing venue/code metadata. | Use for expansion suggestions first; import through repo-supported source when possible. |

## Core Query Families

### `Q-COR-01` Adaptive Retrieve-Or-Not / Retrieval Gating
- Seed anchors: `COR-004`, `COR-006`, `COR-007`, `COR-016`
- Query strings:
  - `"adaptive retrieval" "retrieval augmented generation" "large language model"`
  - `"retrieve or not" "RAG" "LLM"`
  - `"retrieval gating" "retrieval-augmented generation"`
  - `"uncertainty" "retrieval" "RAG" "cost"`
- Sources: `arxiv:auto`, `acl:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-strategy`, `direction:rag-aware-allocation`, `subcluster:retrieval-gating`, `decision:retrieve-or-not`, `resource:retrieval-depth`, `metric:answer-quality`, `metric:cost-per-query`, `priority:p0`
- Include when: the paper decides whether to retrieve, skip retrieval, correct retrieval, or escalate retrieval based on uncertainty, confidence, complexity, or quality.
- Exclude when: retrieval is always-on and no budget/policy decision is exposed.

### `Q-COR-02` Retrieval Depth / Top-k Budget
- Seed anchors: `COR-002`, `COR-008`, `COR-012`
- Query strings:
  - `"retrieval depth" "RAG" "LLM"`
  - `"dynamic top-k" "retrieval augmented generation"`
  - `"adaptive top-k" "dense retrieval" "large language model"`
  - `"retrieval budget" "RAG"`
- Sources: `arxiv:auto`, `acl:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `direction:rag-aware-allocation`, `subcluster:retrieval-depth`, `resource:top-k`, `resource:retrieval-depth`, `decision:top-k-selection`, `metric:answer-quality`, `metric:recall-at-k`, `priority:p0`
- Include when: top-k, retrieval rounds, or number of evidence candidates is varied or learned.
- Exclude when: top-k is a fixed hyperparameter without analysis or adaptive policy.

### `Q-COR-03` Context Budget / Evidence Packing / Compression
- Seed anchors: `COR-002`, `COR-015`, `THY-001`, `THY-005`, `THY-012`
- Query strings:
  - `"context budget" "RAG" "LLM"`
  - `"context compression" "retrieval augmented generation"`
  - `"evidence selection" "RAG" "token budget"`
  - `"context packing" "large language model" "retrieval"`
- Sources: `arxiv:auto`, `acl:manual`, `crossref:auto`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-theory`, `direction:rag-aware-allocation`, `subcluster:context-budget`, `resource:context-window`, `resource:chunk-size`, `decision:context-packing`, `metric:faithfulness`, `metric:citation-quality`, `priority:p0`
- Include when: the paper allocates, compresses, ranks, packs, or prunes evidence under token/context constraints.
- Exclude when: it only uses long context without measuring selection or budget behavior.

### `Q-COR-04` RAG Serving / Configuration Adaptation
- Seed anchors: `COR-009`, `COR-012`, `COR-013`, `COR-018`
- Query strings:
  - `"RAG serving" "configuration adaptation"`
  - `"retrieval augmented generation" "serving" "latency" "quality"`
  - `"RAG systems" "quality aware" "latency"`
  - `"RAG serving optimization" "large language model"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-system`, `direction:rag-aware-allocation`, `subcluster:rag-serving-optimization`, `resource:context-window`, `resource:prefill`, `resource:decode`, `decision:budget-allocate`, `metric:ttft`, `metric:p95-latency`, `priority:p0`
- Include when: the system jointly reasons about RAG configuration and quality/cost/latency.
- Exclude when: it is generic serving with no retrieval/context-specific behavior.

### `Q-COR-05` Cached RAG / Knowledge or Context Reuse
- Seed anchors: `COR-009`, `SYS-003`, `SYS-004`, `SYS-005`, `SYS-009`
- Query strings:
  - `"RAG" "KV cache"`
  - `"retrieval augmented generation" "cached context"`
  - `"knowledge fusion" "RAG" "cache"`
  - `"prefix cache" "retrieval augmented generation"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-system`, `direction:rag-aware-allocation`, `subcluster:rag-serving-optimization`, `subcluster:kv-cache`, `resource:kv-cache`, `resource:prefix-cache`, `decision:cache-admit-evict`, `metric:cache-hit-rate`, `metric:ttft`, `priority:p0`
- Include when: cached evidence, cached KV, cached prefix, or context reuse affects RAG latency/cost/quality.
- Exclude when: cache is a generic serving cache and not connected to retrieved evidence or context.

### `Q-COR-06` RAG Routing / Query-Corpus Compatibility
- Seed anchors: `COR-008`, `COR-019`, `STR-005`, `THY-008`
- Query strings:
  - `"RAG routing" "query corpus compatibility"`
  - `"adaptive RAG routing" "large language model"`
  - `"query routing" "retrieval augmented generation"`
  - `"corpus routing" "RAG" "cost"`
- Sources: `arxiv:auto`, `acl:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-strategy`, `direction:rag-aware-allocation`, `subcluster:rag-routing`, `resource:model-choice`, `decision:budget-allocate`, `decision:model-route`, `metric:answer-quality`, `metric:cost-per-query`, `priority:p0`
- Include when: the paper routes by query complexity, corpus compatibility, model/RAG mode, or retrieval strategy.
- Exclude when: routing is only a deployment load-balancing mechanism without retrieval or quality decision.

### `Q-COR-07` Iterative / Multi-hop RAG Stopping
- Seed anchors: `COR-004`, `COR-014`, `COR-017`, `THY-007`
- Query strings:
  - `"iterative RAG" "stopping"`
  - `"multi-hop RAG" "adaptive retrieval"`
  - `"retrieve reason stop" "RAG"`
  - `"MDP" "retrieval augmented generation" "large language model"`
- Sources: `arxiv:auto`, `acl:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-theory`, `direction:rag-aware-allocation`, `subcluster:multi-hop-rag`, `theory:mdp`, `theory:optimal-stopping`, `resource:reasoning-steps`, `decision:multi-hop-continue-stop`, `metric:answer-quality`, `priority:p0`
- Include when: the paper has explicit continue/stop decisions for retrieval, reasoning, or evidence acquisition.
- Exclude when: it is multi-hop QA without adaptive budget or stopping policy.

### `Q-COR-08` Rerank Budget / Retrieval Cascade
- Seed anchors: `COR-003`, `COR-008`, `STR-003`
- Query strings:
  - `"rerank budget" "RAG"`
  - `"adaptive reranking" "retrieval augmented generation"`
  - `"retrieval cascade" "large language model"`
  - `"reranker" "cost" "RAG"`
- Sources: `arxiv:auto`, `acl:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-strategy`, `direction:rag-aware-allocation`, `subcluster:rerank-budget`, `resource:rerank-depth`, `decision:rerank-depth`, `metric:mrr`, `metric:ndcg`, `metric:cost-per-query`, `priority:p1`
- Include when: reranker invocation, candidate depth, or staged retrieval is budgeted or adaptive.
- Exclude when: reranking is fixed and not analyzed as a resource.

### `Q-COR-09` RAG Workload / Trace / Benchmark for Systems
- Seed anchors: `COR-010`, `COR-011`, `COR-018`, `COR-019`
- Query strings:
  - `"RAG workload" "trace"`
  - `"RAG benchmark" "serving systems"`
  - `"retrieval augmented generation" "workload characterization"`
  - `"RAG" "latency" "benchmark" "quality"`
- Sources: `arxiv:auto`, `semantic-scholar-or-openalex:aux`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `bridge:core-system`, `subcluster:rag-workload`, `subcluster:rag-evaluation-quality`, `fit:experiment-foundation`, `metric:answer-quality`, `metric:ttft`, `metric:p95-latency`, `priority:p1`
- Include when: the paper provides traces, benchmark datasets, evaluation harnesses, or workload characterization reusable for experiment-foundation.
- Exclude when: it is only a benchmark leaderboard without resource or system measurements.

### `Q-COR-10` Faithfulness / Citation Quality Under Budget
- Seed anchors: `COR-005`, `COR-010`, `COR-011`, `COR-015`
- Query strings:
  - `"faithfulness" "RAG" "cost"`
  - `"citation quality" "retrieval augmented generation" "large language model"`
  - `"RAG evaluation" "context budget"`
  - `"hallucination" "retrieval budget" "RAG"`
- Sources: `arxiv:auto`, `acl:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:core`, `subcluster:rag-evaluation-quality`, `resource:context-window`, `decision:context-packing`, `metric:faithfulness`, `metric:citation-quality`, `metric:answer-quality`, `priority:p2`
- Include when: evaluation explicitly compares quality/faithfulness/citation behavior under evidence, retrieval, context, or compute variation.
- Exclude when: it only proposes an evaluator and does not connect to resource/budget decisions.

## System Support Query Families

### `Q-SYS-01` Continuous Batching / Request Scheduling
- Seed anchors: `SYS-001`, `SYS-003`, `SYS-006`
- Query strings:
  - `"LLM serving" "continuous batching"`
  - `"large language model serving" "scheduling"`
  - `"iteration-level scheduling" "LLM serving"`
  - `"request scheduling" "generative inference"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:continuous-batching`, `resource:batch-slots`, `decision:batch-schedule`, `metric:ttft`, `metric:tpot`, `priority:p1`
- Include when: scheduling changes latency, throughput, batching, or queue behavior.
- Exclude when: it is only model compression or kernel optimization without scheduling/resource policy.

### `Q-SYS-02` KV Cache / Paged Attention / Cache Eviction
- Seed anchors: `SYS-003`, `SYS-004`, `SYS-009`
- Query strings:
  - `"KV cache" "LLM serving"`
  - `"PagedAttention" "large language model serving"`
  - `"KV cache eviction" "large language model"`
  - `"KV cache compression" "LLM inference"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:kv-cache`, `resource:kv-cache`, `resource:gpu-memory`, `decision:cache-admit-evict`, `metric:cache-hit-rate`, `metric:gpu-utilization`, `priority:p1`
- Include when: KV memory allocation, reuse, paging, compression, or eviction is a first-class resource decision.
- Exclude when: the cache is unrelated to inference serving or not evaluated.

### `Q-SYS-03` Prefix / Prompt / Radix Cache
- Seed anchors: `SYS-005`, `COR-009`
- Query strings:
  - `"prefix cache" "LLM serving"`
  - `"radix cache" "large language model"`
  - `"prompt cache" "LLM inference" "scheduling"`
  - `"structured language model programs" "cache"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `bridge:system-strategy`, `direction:llm-serving-resource-allocation`, `subcluster:prefix-cache`, `resource:prefix-cache`, `decision:cache-admit-evict`, `metric:cache-hit-rate`, `metric:ttft`, `priority:p1`
- Include when: prefix/prompt reuse affects scheduling, admission, latency, or cost.
- Exclude when: caching is only a product feature with no systems measurement.

### `Q-SYS-04` Prefill / Decode Interference and Chunked Prefill
- Seed anchors: `SYS-006`, `SYS-007`, `SYS-008`, `SYS-010`
- Query strings:
  - `"prefill decode" "LLM serving"`
  - `"chunked prefill" "large language model inference"`
  - `"prefill decode interference" "LLM"`
  - `"stall-free scheduling" "LLM inference"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:prefill-decode`, `resource:prefill`, `resource:decode`, `decision:batch-schedule`, `decision:prefill-decode-allocate`, `metric:ttft`, `metric:tpot`, `priority:p1`
- Include when: prefill/decode phase behavior is modeled, scheduled, split, or allocated.
- Exclude when: it only reports token throughput without phase analysis.

### `Q-SYS-05` P/D Disaggregation and Resource Allocation
- Seed anchors: `SYS-007`, `SYS-008`, `SYS-009`, `SYS-010`, `THY-011`
- Query strings:
  - `"prefill decode disaggregation" "LLM serving"`
  - `"disaggregated serving" "large language model" "prefill"`
  - `"P/D disaggregation" "LLM inference"`
  - `"SLO-aware" "prefill decode" "resource allocation"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `bridge:system-strategy`, `direction:llm-serving-resource-allocation`, `subcluster:pd-disaggregation`, `subcluster:slo-scheduling`, `resource:prefill`, `resource:decode`, `decision:prefill-decode-allocate`, `metric:ttft`, `metric:tpot`, `priority:p1`
- Include when: compute allocation between prefill/decode workers or clusters is optimized or modeled.
- Exclude when: disaggregation is only architectural and no allocation/SLO decision appears.

### `Q-SYS-06` SLO / Tail Latency / Admission Control
- Seed anchors: `SYS-001`, `SYS-007`, `SYS-010`, `THY-011`
- Query strings:
  - `"SLO-aware" "LLM serving"`
  - `"tail latency" "large language model serving"`
  - `"admission control" "LLM inference"`
  - `"TTFT" "TPOT" "scheduling" "LLM"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:slo-scheduling`, `subcluster:tail-latency`, `resource:latency-budget`, `decision:batch-schedule`, `metric:ttft`, `metric:p95-latency`, `metric:p99-latency`, `priority:p1`
- Include when: SLO satisfaction, admission, tail latency, or deadline constraints affect serving policy.
- Exclude when: latency is reported but not controlled or optimized.

### `Q-SYS-07` Heterogeneous Serving / GPU Memory / Offload
- Seed anchors: `SYS-002`, `SYS-008`, `SYS-009`
- Query strings:
  - `"heterogeneous" "LLM serving" "GPU"`
  - `"LLM inference" "offloading" "scheduling"`
  - `"GPU memory" "large language model serving"`
  - `"resource allocation" "heterogeneous" "LLM inference"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `direction:llm-serving-resource-allocation`, `subcluster:heterogeneous-serving`, `resource:gpu-memory`, `resource:batch-slots`, `metric:gpu-utilization`, `metric:cost-per-query`, `priority:p1`
- Include when: hardware/memory/resource placement affects serving cost, latency, or throughput.
- Exclude when: the paper is only about training or offline inference.

### `Q-SYS-08` Serving Workloads / Benchmarks / Traces
- Seed anchors: `COR-018`, `SYS-001`, `SYS-003`, `SYS-010`
- Query strings:
  - `"LLM serving" "workload trace"`
  - `"large language model inference" "benchmark" "serving"`
  - `"serving workload" "generative inference"`
  - `"RAG workload trace" "LLM serving"`
- Sources: `arxiv:auto`, `usenix-acm-ieee:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:system-support`, `subcluster:serving-workload`, `fit:experiment-foundation`, `metric:ttft`, `metric:tpot`, `metric:gpu-utilization`, `priority:p1`
- Include when: workload traces, realistic benchmarks, load patterns, or trace-driven evaluation are available.
- Exclude when: benchmark lacks reproducible workload shape or serving metric.

## Strategy Support Query Families

### `Q-STR-01` Test-Time Compute Scaling
- Seed anchors: `STR-001`, `STR-002`, `STR-006`, `STR-008`
- Query strings:
  - `"test-time compute" "large language model" "reasoning"`
  - `"test time scaling" "LLM" "reasoning"`
  - `"inference compute" "reasoning" "large language models"`
  - `"scaling test-time compute" "LLM"`
- Sources: `arxiv:auto`, `openreview:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `resource:generation-tokens`, `resource:reasoning-steps`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p0`
- Include when: the paper studies how extra inference compute changes quality and how budget should be assigned.
- Exclude when: it only improves prompting without compute/budget comparison.

### `Q-STR-02` Difficulty-Aware Budget Allocation
- Seed anchors: `COR-008`, `STR-006`, `STR-007`, `STR-008`
- Query strings:
  - `"difficulty aware" "test-time compute" "LLM"`
  - `"adaptive compute" "question complexity" "large language model"`
  - `"budget allocation" "reasoning" "LLM"`
  - `"query difficulty" "inference budget" "LLM"`
- Sources: `arxiv:auto`, `openreview:manual`, `acl:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `bridge:core-strategy`, `direction:test-time-compute-budgeting`, `subcluster:difficulty-aware-budget`, `subcluster:adaptive-compute`, `resource:reasoning-steps`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p0`
- Include when: prompt/query difficulty controls reasoning, retrieval, model, verifier, or sampling budget.
- Exclude when: difficulty is only used for dataset analysis, not allocation.

### `Q-STR-03` Model Routing / Cascades
- Seed anchors: `STR-003`, `STR-005`, `COR-019`
- Query strings:
  - `"model routing" "large language models" "cost"`
  - `"LLM cascade" "cost quality"`
  - `"route LLM" "preference data"`
  - `"adaptive model selection" "large language model"`
- Sources: `arxiv:auto`, `openreview:manual`, `semantic-scholar-or-openalex:aux`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:model-routing`, `subcluster:cascade`, `resource:model-choice`, `resource:cost-budget`, `decision:model-route`, `metric:cost-per-query`, `metric:answer-quality`, `priority:p0`
- Include when: a model tier, route, or cascade is selected under cost/quality constraints.
- Exclude when: the paper compares models but does not learn or apply a routing policy.

### `Q-STR-04` Confidence Gating / Uncertainty / Abstention
- Seed anchors: `COR-006`, `COR-007`, `COR-016`, `STR-007`
- Query strings:
  - `"confidence gating" "large language model" "cost"`
  - `"uncertainty estimation" "adaptive inference" "LLM"`
  - `"abstention" "large language model" "routing"`
  - `"textual uncertainty" "retrieval augmented generation"`
- Sources: `arxiv:auto`, `acl:manual`, `openreview:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `bridge:core-strategy`, `direction:test-time-compute-budgeting`, `subcluster:confidence-gating`, `resource:cost-budget`, `decision:retrieve-or-not`, `decision:model-route`, `metric:answer-quality`, `metric:cost-per-query`, `priority:p1`
- Include when: confidence/uncertainty drives retrieval, model escalation, verification, abstention, or stopping.
- Exclude when: uncertainty is estimated but not used in a decision.

### `Q-STR-05` Early Stopping / Continue-Stop Policies
- Seed anchors: `COR-017`, `STR-004`, `STR-007`, `THY-007`
- Query strings:
  - `"early stopping" "LLM reasoning"`
  - `"continue stop" "test-time compute" "LLM"`
  - `"adaptive stopping" "large language model" "reasoning"`
  - `"optimal stopping" "adaptive inference" "LLM"`
- Sources: `arxiv:auto`, `openreview:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `bridge:strategy-theory`, `direction:test-time-compute-budgeting`, `subcluster:early-stopping`, `resource:reasoning-steps`, `decision:reason-continue-stop`, `metric:answer-quality`, `metric:cost-per-query`, `priority:p1`
- Include when: the paper explicitly decides when to stop reasoning, sampling, refinement, or retrieval.
- Exclude when: it uses a fixed number of steps without stopping analysis.

### `Q-STR-06` Verifier / Critic / Reflection Budget
- Seed anchors: `COR-006`, `STR-002`, `STR-004`, `STR-007`
- Query strings:
  - `"verifier budget" "large language model"`
  - `"self verification" "test-time compute" "LLM"`
  - `"critic" "adaptive compute" "LLM"`
  - `"reflection" "budget" "large language model"`
- Sources: `arxiv:auto`, `openreview:manual`, `acl:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:verifier-budget`, `resource:verifier-passes`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p1`
- Include when: verifier/critic/reflection passes are budgeted, routed, or stopped adaptively.
- Exclude when: reflection is always fixed and not compared as a costed resource.

### `Q-STR-07` Search-Style Reasoning Budget
- Seed anchors: `STR-004`, `STR-006`, `STR-008`
- Query strings:
  - `"tree of thoughts" "compute budget"`
  - `"search" "test-time compute" "large language model"`
  - `"MCTS" "LLM reasoning" "budget"`
  - `"beam search" "LLM reasoning" "adaptive"`
- Sources: `arxiv:auto`, `openreview:manual`
- Time window: `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:test-time-scaling`, `subcluster:adaptive-compute`, `resource:reasoning-steps`, `decision:budget-allocate`, `metric:answer-quality`, `priority:p1`
- Include when: search breadth/depth/samples are treated as an inference-time budget.
- Exclude when: the search procedure is not budgeted or adaptive.

### `Q-STR-08` Budgeted Adaptive Inference Surveys
- Seed anchors: `STR-007`
- Query strings:
  - `"adaptive test-time compute" "survey" "large language models"`
  - `"controllable test-time compute" "LLM" "survey"`
  - `"adaptive inference" "large language models" "survey"`
- Sources: `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `frontier-2025-2026`
- Default tags: `collection:strategy-support`, `direction:test-time-compute-budgeting`, `subcluster:adaptive-compute`, `priority:p2`
- Include when: the survey gives taxonomies, benchmarks, or references that expand query families.
- Exclude when: it is only a generic reasoning or prompting survey.

## Theory Support Query Families

### `Q-THY-01` Queueing for LLM Serving and Variable Tokens
- Seed anchors: `THY-011`, `SYS-010`
- Query strings:
  - `"queueing" "LLM inference" "variable token length"`
  - `"queueing theory" "large language model serving"`
  - `"latency" "queueing" "LLM serving"`
  - `"SLO" "queueing" "prefill decode"`
- Sources: `arxiv:auto`, `crossref:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:system-strategy`, `theory:queueing`, `resource:latency-budget`, `metric:ttft`, `metric:p95-latency`, `priority:p1`
- Theory inclusion rule: map queue state, arrival rate, service time, or token-length distribution to serving latency or adaptive context budget.
- Exclude when: queueing is unrelated to LLM/RAG inference or cannot define an experiment variable.

### `Q-THY-02` Online Scheduling / Competitive Allocation
- Seed anchors: `SYS-001`, `SYS-006`, `SYS-010`
- Query strings:
  - `"online scheduling" "LLM serving"`
  - `"competitive analysis" "scheduling" "inference"`
  - `"online resource allocation" "large language model"`
  - `"deadline scheduling" "LLM serving"`
- Sources: `arxiv:auto`, `crossref:auto`, `usenix-acm-ieee:manual`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:system-strategy`, `theory:online-scheduling`, `theory:constrained-optimization`, `decision:batch-schedule`, `metric:regret`, `metric:p95-latency`, `priority:p3`
- Theory inclusion rule: map scheduling theorem or heuristic to request batching, admission, SLO, or P/D allocation.
- Exclude when: scheduling model cannot represent variable token generation or GPU batching constraints.

### `Q-THY-03` Bandits / Contextual Bandits for Routing
- Seed anchors: `THY-007`, `COR-008`, `STR-005`
- Query strings:
  - `"contextual bandit" "model routing" "LLM"`
  - `"bandit" "retrieval augmented generation"`
  - `"bandit" "adaptive inference" "large language model"`
  - `"multi-armed bandit" "resource allocation" "LLM"`
- Sources: `arxiv:auto`, `crossref:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:strategy-theory`, `theory:bandit`, `decision:model-route`, `decision:budget-allocate`, `metric:regret`, `metric:cost-per-query`, `priority:p3`
- Theory inclusion rule: map arms to retrieval strategies, model tiers, rerank depth, context budgets, or verifier policies.
- Exclude when: bandit is used only as a metaphor without regret/policy framing.

### `Q-THY-04` MDP / RL / Optimal Stopping for RAG
- Seed anchors: `COR-014`, `COR-017`, `THY-007`
- Query strings:
  - `"MDP" "retrieval augmented generation"`
  - `"optimal stopping" "RAG" "LLM"`
  - `"reinforcement learning" "adaptive retrieval" "large language model"`
  - `"sequential decision" "retrieval" "LLM"`
- Sources: `arxiv:auto`, `acl:manual`, `crossref:auto`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:core-theory`, `theory:mdp`, `theory:optimal-stopping`, `decision:multi-hop-continue-stop`, `decision:reason-continue-stop`, `metric:regret`, `priority:p3`
- Theory inclusion rule: define state/action/reward/cost around retrieval, reasoning, or stopping.
- Exclude when: RL is only used for model training and not test-time resource allocation.

### `Q-THY-05` Submodular / Knapsack Evidence Selection
- Seed anchors: `THY-001`, `COR-015`, `THY-005`
- Query strings:
  - `"submodular" "document selection" "retrieval"`
  - `"knapsack" "context selection" "large language model"`
  - `"budgeted maximum coverage" "RAG"`
  - `"submodular" "context packing"`
- Sources: `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:core-theory`, `theory:submodular`, `theory:knapsack`, `resource:context-window`, `decision:context-packing`, `metric:pareto-frontier`, `priority:p3`
- Theory inclusion rule: map coverage/diversity/diminishing returns to evidence/chunk selection under token budget.
- Exclude when: selection objective cannot connect to answer quality, faithfulness, or citation coverage.

### `Q-THY-06` Information Theory / Bottleneck / Rate-Distortion
- Seed anchors: `THY-005`, `THY-012`, `COR-015`
- Query strings:
  - `"information bottleneck" "context compression" "LLM"`
  - `"rate distortion" "retrieval augmented generation"`
  - `"mutual information" "evidence selection" "RAG"`
  - `"information theory" "context budget" "large language model"`
- Sources: `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:core-theory`, `theory:information-theory`, `theory:constrained-optimization`, `resource:context-window`, `decision:context-packing`, `metric:pareto-frontier`, `priority:p3`
- Theory inclusion rule: map entropy, compression, bottleneck, or rate-distortion to context/evidence retention under a token budget.
- Exclude when: information theory is unrelated to retrieval, context, compression, or uncertainty.

### `Q-THY-07` Measure / Distribution Shift / Risk
- Seed anchors: `THY-004`, `THY-008`, `COR-019`
- Query strings:
  - `"distribution shift" "retrieval augmented generation"`
  - `"measure" "embedding space" "retrieval"`
  - `"risk measure" "adaptive inference" "LLM"`
  - `"query corpus distribution" "RAG"`
- Sources: `arxiv:auto`, `crossref:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:core-theory`, `theory:measure`, `metric:retrieval-stability`, `decision:budget-allocate`, `priority:p3`
- Theory inclusion rule: map distributions to query classes, corpus partitions, embedding neighborhoods, or risk-aware allocation.
- Exclude when: distribution shift is generic model robustness without retrieval/resource decision.

### `Q-THY-08` Optimal Transport for Query-Corpus Alignment
- Seed anchors: `THY-008`, `COR-019`
- Query strings:
  - `"optimal transport" "retrieval" "large language model"`
  - `"Wasserstein" "query corpus" "retrieval"`
  - `"optimal transport" "domain adaptation" "RAG"`
  - `"distribution alignment" "retrieval augmented generation"`
- Sources: `arxiv:auto`, `crossref:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:core-theory`, `theory:optimal-transport`, `theory:measure`, `subcluster:rag-routing`, `metric:retrieval-stability`, `priority:p3`
- Theory inclusion rule: map transport cost to query-corpus compatibility, routing, corpus selection, or domain shift.
- Exclude when: OT is only an embedding-training loss with no routing/allocation implication.

### `Q-THY-09` High-Dimensional Geometry / Metric Space / ANN
- Seed anchors: `THY-003`, `THY-004`, `THY-006`
- Query strings:
  - `"nearest neighbor" "high dimensional" "retrieval"`
  - `"metric space" "embedding retrieval" "large language model"`
  - `"random projection" "dense retrieval"`
  - `"approximate nearest neighbor" "RAG" "latency"`
- Sources: `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:theory-to-chunking`, `theory:metric-space`, `theory:high-dimensional-geometry`, `resource:retrieval-depth`, `metric:recall-at-k`, `metric:retrieval-stability`, `priority:p3`
- Theory inclusion rule: map distance concentration, ANN recall, or projection stability to retrieval quality-latency tradeoffs.
- Exclude when: geometry is not tied to retrieval/index behavior.

### `Q-THY-10` Group Action / Quotient Space for Chunking
- Seed anchors: `THY-009`, `THY-010`
- Query strings:
  - `"group action" "representation" "retrieval"`
  - `"equivariance" "text representation" "retrieval"`
  - `"quotient space" "embedding" "retrieval"`
  - `"invariant representation" "chunking" "large language model"`
- Sources: `arxiv:auto`, `crossref:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:theory-to-chunking`, `theory:group-action`, `theory:quotient-space`, `theory:metric-space`, `resource:chunk-size`, `metric:retrieval-stability`, `priority:p3`
- Theory inclusion rule: map transformations such as split, merge, reorder, paraphrase, or normalization to invariant/equivalent chunk classes.
- Exclude when: the paper is vision/geometric-only and no text/retrieval/chunk-space mapping can be written.

### `Q-THY-11` Coding / Sketching / MinHash / LSH for Evidence Space
- Seed anchors: `THY-002`, `THY-003`, `THY-012`
- Query strings:
  - `"MinHash" "document resemblance" "retrieval"`
  - `"locality sensitive hashing" "dense retrieval" "RAG"`
  - `"sketching" "document retrieval" "large language model"`
  - `"coding theory" "context compression" "retrieval"`
- Sources: `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:theory-to-chunking`, `theory:field-coding`, `theory:lattice`, `resource:chunk-size`, `metric:retrieval-stability`, `priority:p3`
- Theory inclusion rule: map hashing/sketching/coding to chunk dedup, evidence equivalence, retrieval approximation, or robust context packing.
- Exclude when: coding/sketching is unrelated to documents, retrieval, compression, or indexing.

### `Q-THY-12` Lattice / Ultrametric / Hierarchical Evidence Spaces
- Seed anchors: `THY-010`
- Query strings:
  - `"lattice" "information retrieval" "hierarchical"`
  - `"ultrametric" "document clustering" "retrieval"`
  - `"hierarchical metric" "embedding retrieval"`
  - `"partial order" "evidence selection" "retrieval"`
- Sources: `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux`
- Time window: `classic-pre-2023`, `transition-2023-2024`, `frontier-2025-2026`
- Default tags: `collection:theory-support`, `bridge:theory-to-chunking`, `theory:lattice`, `theory:ultrametric`, `theory:topology`, `resource:chunk-size`, `decision:context-packing`, `metric:retrieval-stability`, `priority:p3`
- Theory inclusion rule: map hierarchy, refinement, partial order, or ultrametric distance to chunk granularity and evidence selection.
- Exclude when: no plausible experimental variable can be defined.

## Phase 4 Import Batch Order

Use batches to observe dedup, metadata quality, and tag precision before widening.

| Batch | Purpose | Query IDs | Source Route | Default Action |
|---|---|---|---|---|
| `B1-core-high-precision` | Direct main-problem expansion. | `Q-COR-01`, `Q-COR-02`, `Q-COR-03`, `Q-COR-04`, `Q-COR-06`, `Q-COR-07` | `arxiv:auto`, then `acl:manual` and `semantic-scholar-or-openalex:aux` | Import metadata, assign default tags, do not enqueue content processing. |
| `B2-core-system-bridge` | RAG serving/cache/workload bridge for experiment-foundation. | `Q-COR-04`, `Q-COR-05`, `Q-COR-09` | `arxiv:auto`, then `usenix-acm-ieee:manual` | Import metadata, tag `bridge:core-system`, queue P0/P1 judgment cards. |
| `B3-system-substrate` | Serving substrate for experimental baselines. | `Q-SYS-01` to `Q-SYS-08` | `arxiv:auto`, then `usenix-acm-ieee:manual` | Import metadata, tag `collection:system-support`, mark ambiguous papers low-confidence. |
| `B4-strategy-policy` | Test-time budget, routing, stopping policy layer. | `Q-STR-01` to `Q-STR-08` | `arxiv:auto`, `openreview:manual`, `acl:manual` | Import metadata, tag `collection:strategy-support`, queue P0/P1 judgment cards. |
| `B5-theory-mapping` | Theory support with explicit mapping cards. | `Q-THY-01` to `Q-THY-12` | `crossref:auto`, `arxiv:auto`, `semantic-scholar-or-openalex:aux` | Import only papers with theory inclusion mapping or exact seed/citation relation. |
| `B6-citation-expansion` | Expand from P0/P1 seeds after initial import quality is known. | P0/P1 seed references and citations | `semantic-scholar-or-openalex:aux`, source-specific manual import | Stage candidates first; do not bulk import without triage. |

## Batch Evidence Template

Each Phase 4 batch should record:

```text
batch_id:
date:
source_route:
query_ids:
query_strings_executed:
time_window:
default_tags:
imported_literature_ids:
duplicate_or_merged_ids:
low_confidence_ids:
notable_misses:
manual_followups:
content_processing_enqueued: false
```

## Low-Confidence Rules

Apply `classification:low-confidence` when:
- The title matches a query but the abstract does not expose a resource/decision/metric.
- The paper is adjacent RAG, GraphRAG, long-context, agentic workflow, or prompting work without clear budget adaptation.
- The paper is systems-oriented but not specific enough to LLM serving, RAG serving, KV/prefix cache, prefill/decode, SLO, or workload behavior.
- The theory paper is mathematically relevant but lacks a concrete RAG/LLM mapping card.
- The source metadata is incomplete, venue/title disagree across sources, or the paper is a very recent preprint with unclear claims.

## Manual Review Triggers

Manual review is required before assigning P0/P1 when:
- A query result claims adaptive allocation but only reports static ablation.
- A system paper optimizes latency but does not include quality/cost/resource tradeoffs.
- A theory paper looks promising for chunk space or measure but needs a mapping card.
- A paper has multiple plausible primary collections.
- A source import yields duplicate records with different titles, venues, or years.

## Phase 3 Acceptance Check

- Query catalog covers core, system support, strategy support, and theory support.
- Every query family has:
  - seed anchors,
  - query strings,
  - intended source route,
  - time window,
  - default tags,
  - inclusion rule,
  - exclusion rule.
- Batch order is ready for Phase 4 controlled imports.
- No schema migration or content-processing behavior change is introduced.
