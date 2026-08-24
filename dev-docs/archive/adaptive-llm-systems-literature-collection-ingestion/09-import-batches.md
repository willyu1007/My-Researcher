# 09 Import Batches

## Status
- Version: `import-batches.v1`
- State: Phase 4 completed; Phase 5 judgment-card tags applied
- Owner task: `T-116 adaptive-llm-systems-literature-collection-ingestion`
- Query catalog source: `08-query-catalog.md`

## Purpose
- Record controlled metadata import batches for the adaptive LLM systems literature collection round.
- Preserve batch source, query purpose, default tags, resulting literature IDs, duplicate behavior, and safety checks.
- Keep import evidence separate from content processing and experiment activation.

## Phase 4 Safety Rules
- Use `/literature/collections/import` for controlled metadata import unless a later batch explicitly documents another route.
- Do not call `/literature/:literatureId/content-processing*`.
- Do not enqueue fulltext acquisition, key-content extraction, chunking, embedding, indexing, retrieval, or evidence activation as part of Phase 4 import.
- Add `classification:needs-judgment-card` to new P0/P1 imports until their lightweight judgment cards are created; Phase 5 converted the current covered records to `classification:judgment-card-ready`.
- Add `classification:low-confidence` instead of forcing a strong assignment when source metadata or abstract evidence is weak.

## B1 - Core High Precision

### Batch Summary
- Batch ID: `B1-core-high-precision`
- Status: completed
- Date: 2026-06-03
- Batch kind: `seed-anchor-import`
- Source route: `arxiv:auto-exact-id`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-core-high-precision-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-core-high-precision-import-report.json`
- Purpose: import high-confidence core RAG-aware allocation seed anchors before wider keyword expansion.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Query Coverage

| Query ID | Query Family | Imported arXiv IDs |
|---|---|---|
| `Q-COR-01` | Adaptive Retrieve-Or-Not / Retrieval Gating | `2305.06983`, `2310.11511`, `2401.15884`, `2511.09803` |
| `Q-COR-02` | Retrieval Depth / Top-k Budget | `2007.01282`, `2403.14403`, `2412.10543` |
| `Q-COR-03` | Context Budget / Evidence Packing / Compression | `2007.01282`, `2507.05633` |
| `Q-COR-04` | RAG Serving / Configuration Adaptation | `2405.16444`, `2412.10543`, `2503.14649`, `2511.12979` |
| `Q-COR-06` | RAG Routing / Query-Corpus Compatibility | `2403.14403`, `2602.00296` |
| `Q-COR-07` | Iterative / Multi-hop RAG Stopping | `2305.06983`, `2502.01142`, `2510.14337` |

### Import Result

| Metric | Value |
|---|---:|
| Planned unique arXiv IDs | 14 |
| Fetched/importable records | 14 |
| Import response status | 200 |
| Imported result count | 14 |
| New literature records | 14 |
| Duplicate/merged records | 0 |
| Missing arXiv IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 14 |
| `LiteratureSource` | 14 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Metadata Caveat
- arXiv exact-id API returned `429` during this batch.
- The import script therefore used `07-seed-catalog.md` exact title/year fallback metadata.
- Result before `B1-refresh-arxiv-metadata`: records had stable title, year, arXiv ID, source URL, and tags, but author and abstract metadata were empty.
- Result after `B1-refresh-arxiv-metadata`: all B1 records have author and abstract metadata; see the refresh batch below.

### Default Tags Applied
- `collection:core`
- `direction:rag-aware-allocation`
- `priority:p0`
- `classification:rule-derived`
- `classification:needs-judgment-card`
- `batch:b1-core-high-precision`
- Query-specific tags such as `query:q-cor-01`, `query:q-cor-02`, `query:q-cor-03`, `query:q-cor-04`, `query:q-cor-06`, `query:q-cor-07`
- Subcluster/resource/decision/metric tags from `08-query-catalog.md`.

### Imported Literature IDs

| Literature ID | arXiv ID | Title | Query IDs | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0177` | `2007.01282` | Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering | `Q-COR-02`, `Q-COR-03` | true | `none` |
| `LIT-0178` | `2305.06983` | Active Retrieval Augmented Generation | `Q-COR-01`, `Q-COR-07` | true | `none` |
| `LIT-0179` | `2310.11511` | Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection | `Q-COR-01` | true | `none` |
| `LIT-0180` | `2401.15884` | Corrective Retrieval Augmented Generation | `Q-COR-01` | true | `none` |
| `LIT-0181` | `2403.14403` | Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity | `Q-COR-02`, `Q-COR-06` | true | `none` |
| `LIT-0182` | `2405.16444` | CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion | `Q-COR-04` | true | `none` |
| `LIT-0183` | `2412.10543` | METIS: Fast Quality-Aware RAG Systems with Configuration Adaptation | `Q-COR-02`, `Q-COR-04` | true | `none` |
| `LIT-0184` | `2502.01142` | DeepRAG: Thinking to Retrieve Step by Step for Large Language Models | `Q-COR-07` | true | `none` |
| `LIT-0185` | `2503.14649` | RAGO: Systematic Performance Optimization for Retrieval-Augmented Generation Serving | `Q-COR-04` | true | `none` |
| `LIT-0186` | `2507.05633` | SARA: Selective and Adaptive Retrieval-augmented Generation with Context Compression | `Q-COR-03` | true | `none` |
| `LIT-0187` | `2510.14337` | Stop-RAG: Value-Based Retrieval Control for Iterative RAG | `Q-COR-07` | true | `none` |
| `LIT-0188` | `2511.09803` | Retrieval as a Decision: Training-Free Adaptive Gating for Efficient RAG | `Q-COR-01` | true | `none` |
| `LIT-0189` | `2511.12979` | RAGPulse: An Open-Source RAG Workload Trace to Optimize RAG Serving Systems | `Q-COR-04` | true | `none` |
| `LIT-0190` | `2602.00296` | RAGRouter-Bench: A Dataset and Benchmark for Adaptive RAG Routing | `Q-COR-06` | true | `none` |

## B1 Refresh - arXiv Metadata

### Batch Summary
- Batch ID: `B1-refresh-arxiv-metadata`
- Status: completed
- Date: 2026-06-03
- Batch kind: `metadata-refresh`
- Source route: `arxiv:html-exact-id-sequential`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-refresh-arxiv-metadata.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-refresh-arxiv-metadata-report.json`
- Purpose: refresh author and abstract metadata for B1 records imported with seed fallback metadata.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Refresh Result

| Metric | Value |
|---|---:|
| Target B1 records | 14 |
| arXiv HTML records fetched | 14 |
| Fetch failures | 0 |
| Import response status | 200 |
| Refreshed existing records | 14 |
| New literature records | 0 |
| New sources | 0 |
| Metadata ready before refresh | 0 |
| Metadata ready after refresh | 14 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 0 |
| `LiteratureSource` | 0 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Metadata Readiness

| Literature ID | arXiv ID | Author Count | Abstract Length | Tags Preserved |
|---|---|---:|---:|---|
| `LIT-0177` | `2007.01282` | 2 | 711 | yes |
| `LIT-0178` | `2305.06983` | 9 | 1358 | yes |
| `LIT-0179` | `2310.11511` | 5 | 1532 | yes |
| `LIT-0180` | `2401.15884` | 4 | 1321 | yes |
| `LIT-0181` | `2403.14403` | 5 | 1595 | yes |
| `LIT-0182` | `2405.16444` | 9 | 1864 | yes |
| `LIT-0183` | `2412.10543` | 8 | 959 | yes |
| `LIT-0184` | `2502.01142` | 9 | 961 | yes |
| `LIT-0185` | `2503.14649` | 6 | 1140 | yes |
| `LIT-0186` | `2507.05633` | 7 | 1249 | yes |
| `LIT-0187` | `2510.14337` | 3 | 1123 | yes |
| `LIT-0188` | `2511.09803` | 3 | 1434 | yes |
| `LIT-0189` | `2511.12979` | 7 | 1351 | yes |
| `LIT-0190` | `2602.00296` | 6 | 1641 | yes |

## B1 Title Reconciliation

### Batch Summary
- Batch ID: `B1-title-reconciliation`
- Status: completed
- Date: 2026-06-03
- Batch kind: `metadata-title-reconciliation`
- Source route: `arxiv:html-exact-id`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-title-reconciliation.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b1-title-reconciliation-report.json`
- Purpose: replace B1 seed fallback display titles with arXiv canonical titles while preserving source provenance and seed aliases in the reconciliation report.
- Content processing enqueued: `false`

### Reconciliation Result

| Literature ID | arXiv ID | Previous Seed Title | Canonical arXiv Title | Alias Note |
|---|---|---|---|---|
| `LIT-0178` | `2305.06983` | FLARE: Forward-Looking Active Retrieval Augmented Generation | Active Retrieval Augmented Generation | `FLARE` is the method acronym and seed display alias; the arXiv title omits the acronym prefix. |
| `LIT-0188` | `2511.09803` | TARG: Retrieval-Augmented Generation with Cost-Effective Textual Uncertainty Estimation | Retrieval as a Decision: Training-Free Adaptive Gating for Efficient RAG | `TARG` is the method acronym and seed display alias; the arXiv title is the decision/gating formulation. |

### Updated Identity Fields

| Literature ID | Normalized Title | Title Authors Year Hash |
|---|---|---|
| `LIT-0178` | `active retrieval augmented generation` | `6191c4234d38ea53cb00f3b7eca64541c18b2d19` |
| `LIT-0188` | `retrieval as a decision training free adaptive gating for efficient rag` | `571b52e185c28b33345bcbfa70462d2d6bfb0501` |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 0 |
| `LiteratureSource` | 0 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### DB Spot Check
- `LIT-0178` keeps `batch:b1-core-high-precision` and `classification:needs-judgment-card`; author count is 9 and abstract length is 1358.
- `LIT-0188` keeps `batch:b1-core-high-precision` and `classification:needs-judgment-card`; author count is 3 and abstract length is 1434.
- Content-processing related counters remain zero: `LiteraturePipelineRun`, `LiteratureContentAsset`, `LiteratureContentProcessingBatchJob`, and `LiteratureFulltextAcquisitionJob`.

### Source Confirmation

| Literature ID | Source URL |
|---|---|
| `LIT-0178` | `https://arxiv.org/abs/2305.06983` |
| `LIT-0188` | `https://arxiv.org/abs/2511.09803` |

## B2 - Core System Bridge

### Batch Summary
- Batch ID: `B2-core-system-bridge`
- Status: completed
- Date: 2026-06-03
- Batch kind: `core-system-bridge-import`
- Source route: `arxiv:html-exact-id-sequential`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b2-core-system-bridge-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b2-core-system-bridge-import-report.json`
- Purpose: import RAG serving/cache/workload bridge records that can support experiment-foundation workloads, baselines, and metrics.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Query Coverage

| Query ID | Query Family | Imported arXiv IDs |
|---|---|---|
| `Q-COR-04` | RAG Serving / Configuration Adaptation | `2404.12457`, `2410.07590`, `2502.15734`, `2510.10129`, `2601.12904`, `2602.02579`, `2603.10765`, `2603.23049` |
| `Q-COR-05` | Cached RAG / Knowledge or Context Reuse | `2404.12457`, `2410.07590`, `2502.15734`, `2510.10129`, `2601.12904`, `2602.02579`, `2603.23049` |
| `Q-COR-09` | RAG Workload / Trace / Benchmark for Systems | `2405.13576`, `2407.11005`, `2408.08067`, `2408.11381`, `2603.10765` |

### Import Result

| Metric | Value |
|---|---:|
| Planned unique arXiv IDs | 12 |
| arXiv HTML records fetched | 12 |
| Fetch failures | 0 |
| Import response status | 200 |
| Imported result count | 12 |
| New literature records | 12 |
| Duplicate/merged records | 0 |
| Missing arXiv IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 12 |
| `LiteratureSource` | 12 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Default Tags Applied
- `collection:core`
- `bridge:core-system`
- `classification:rule-derived`
- `classification:needs-judgment-card`
- `batch:b2-core-system-bridge`
- Query-specific tags: `query:q-cor-04`, `query:q-cor-05`, `query:q-cor-09`
- RAG serving/cache tags: `subcluster:rag-serving-optimization`, `subcluster:kv-cache`, `resource:kv-cache`, `resource:prefix-cache`, `resource:prefill`, `resource:decode`, `decision:cache-admit-evict`, `metric:cache-hit-rate`, `metric:ttft`, `metric:p95-latency`
- Experiment-foundation tags for benchmark/tooling records: `subcluster:rag-workload`, `subcluster:rag-evaluation-quality`, `fit:experiment-foundation`

### Imported Literature IDs

| Literature ID | arXiv ID | Title | Query IDs | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0194` | `2404.12457` | RAGCache: Efficient Knowledge Caching for Retrieval-Augmented Generation | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0195` | `2405.13576` | FlashRAG: A Modular Toolkit for Efficient Retrieval-Augmented Generation Research | `Q-COR-09` | true | `none` |
| `LIT-0196` | `2407.11005` | RAGBench: Explainable Benchmark for Retrieval-Augmented Generation Systems | `Q-COR-09` | true | `none` |
| `LIT-0197` | `2408.08067` | RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation | `Q-COR-09` | true | `none` |
| `LIT-0198` | `2408.11381` | RAGLAB: A Modular and Research-Oriented Unified Framework for Retrieval-Augmented Generation | `Q-COR-09` | true | `none` |
| `LIT-0199` | `2410.07590` | TurboRAG: Accelerating Retrieval-Augmented Generation with Precomputed KV Caches for Chunked Text | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0200` | `2502.15734` | Cache-Craft: Managing Chunk-Caches for Efficient Retrieval-Augmented Generation | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0201` | `2510.10129` | CacheClip: Accelerating RAG with Effective KV Cache Reuse | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0202` | `2601.12904` | From Prefix Cache to Fusion RAG Cache: Accelerating LLM Inference in Retrieval-Augmented Generation | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0203` | `2602.02579` | ProphetKV: User-Query-Driven Selective Recomputation for Efficient KV Cache Reuse in Retrieval-Augmented Generation | `Q-COR-04`, `Q-COR-05` | true | `none` |
| `LIT-0204` | `2603.10765` | RAGPerf: An End-to-End Benchmarking Framework for Retrieval-Augmented Generation Systems | `Q-COR-04`, `Q-COR-09` | true | `none` |
| `LIT-0205` | `2603.23049` | PCR: A Prefetch-Enhanced Cache Reuse System for Low-Latency RAG Serving | `Q-COR-04`, `Q-COR-05` | true | `none` |

### Source Confirmation

| Role | Source URLs |
|---|---|
| RAG serving/cache bridge | `https://arxiv.org/abs/2404.12457`, `https://arxiv.org/abs/2410.07590`, `https://arxiv.org/abs/2502.15734`, `https://arxiv.org/abs/2510.10129`, `https://arxiv.org/abs/2601.12904`, `https://arxiv.org/abs/2602.02579`, `https://arxiv.org/abs/2603.23049` |
| RAG workload/benchmark/tooling bridge | `https://arxiv.org/abs/2405.13576`, `https://arxiv.org/abs/2407.11005`, `https://arxiv.org/abs/2408.08067`, `https://arxiv.org/abs/2408.11381`, `https://arxiv.org/abs/2603.10765` |

## B3 - System Substrate

### Batch Summary
- Batch ID: `B3-system-substrate`
- Status: completed
- Date: 2026-06-03
- Batch kind: `system-substrate-import`
- Source route: `arxiv:html-exact-id-sequential+usenix:manual`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b3-system-substrate-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b3-system-substrate-import-report.json`
- Purpose: import LLM serving substrate records for scheduling, cache, prefill/decode, SLO, heterogeneous serving, and workload baselines.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Query Coverage

| Query ID | Query Family | Imported Sources |
|---|---|---|
| `Q-SYS-01` | Continuous Batching / Request Scheduling | `usenix:osdi22-yu`, `2305.05920`, `2309.06180`, `2312.07104`, `2403.02310`, `2406.03243`, `2504.08784`, `2504.20068` |
| `Q-SYS-02` | KV Cache / Paged Attention / Cache Eviction | `2309.06180`, `2310.07240`, `2405.04437`, `2407.00079` |
| `Q-SYS-03` | Prefix / Prompt / Radix Cache | `2312.07104`, `2407.00023` |
| `Q-SYS-04` | Prefill / Decode Interference and Chunked Prefill | `2311.18677`, `2401.09670`, `2403.02310`, `2507.06608`, `2603.04716` |
| `Q-SYS-05` | P/D Disaggregation and Resource Allocation | `2311.18677`, `2401.09670`, `2407.00079`, `2507.06608`, `2603.04716` |
| `Q-SYS-06` | SLO / Tail Latency / Admission Control | `usenix:osdi22-yu`, `2305.05920`, `2401.09670`, `2403.02310`, `2406.03243`, `2407.00023`, `2504.08784`, `2504.20068`, `2507.06608`, `2603.04716` |
| `Q-SYS-07` | Heterogeneous Serving / GPU Memory / Offload | `2303.06865`, `2305.05920`, `2311.18677`, `2405.04437`, `2407.00079` |
| `Q-SYS-08` | Serving Workloads / Benchmarks / Traces | `2401.17644`, `2405.05465` |

### Import Result

| Metric | Value |
|---|---:|
| Planned unique items | 19 |
| Planned arXiv IDs | 18 |
| Planned manual sources | 1 |
| arXiv HTML records fetched | 18 |
| Manual records staged | 1 |
| Fetch failures | 0 |
| Import response status | 200 |
| Imported result count | 19 |
| New literature records | 19 |
| Duplicate/merged records | 0 |
| Missing source IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 19 |
| `LiteratureSource` | 19 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Default Tags Applied
- `collection:system-support`
- `direction:llm-serving-resource-allocation`
- `classification:rule-derived`
- `classification:needs-judgment-card`
- `batch:b3-system-substrate`
- Query-specific tags: `query:q-sys-01` through `query:q-sys-08`
- Resource/decision tags: `resource:batch-slots`, `resource:kv-cache`, `resource:gpu-memory`, `resource:prefix-cache`, `resource:prefill`, `resource:decode`, `resource:latency-budget`, `decision:batch-schedule`, `decision:cache-admit-evict`, `decision:prefill-decode-allocate`
- Metric/fit tags: `metric:ttft`, `metric:tpot`, `metric:cache-hit-rate`, `metric:gpu-utilization`, `metric:p95-latency`, `metric:p99-latency`, `metric:cost-per-query`, `fit:experiment-foundation`

### Imported Literature IDs

| Literature ID | Source ID | Title | Query IDs | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0207` | `usenix:osdi22-yu` | Orca: A Distributed Serving System for Transformer-Based Generative Models | `Q-SYS-01`, `Q-SYS-06` | true | `none` |
| `LIT-0208` | `2303.06865` | FlexGen: High-Throughput Generative Inference of Large Language Models with a Single GPU | `Q-SYS-07` | true | `none` |
| `LIT-0209` | `2305.05920` | Fast Distributed Inference Serving for Large Language Models | `Q-SYS-01`, `Q-SYS-06`, `Q-SYS-07` | true | `none` |
| `LIT-0210` | `2309.06180` | Efficient Memory Management for Large Language Model Serving with PagedAttention | `Q-SYS-01`, `Q-SYS-02` | true | `none` |
| `LIT-0211` | `2310.07240` | CacheGen: KV Cache Compression and Streaming for Fast Large Language Model Serving | `Q-SYS-02` | true | `none` |
| `LIT-0212` | `2311.18677` | Splitwise: Efficient generative LLM inference using phase splitting | `Q-SYS-04`, `Q-SYS-05`, `Q-SYS-07` | true | `none` |
| `LIT-0213` | `2312.07104` | SGLang: Efficient Execution of Structured Language Model Programs | `Q-SYS-01`, `Q-SYS-03` | true | `none` |
| `LIT-0214` | `2401.09670` | DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving | `Q-SYS-04`, `Q-SYS-05`, `Q-SYS-06` | true | `none` |
| `LIT-0215` | `2401.17644` | BurstGPT: A Real-world Workload Dataset to Optimize LLM Serving Systems | `Q-SYS-08` | true | `none` |
| `LIT-0216` | `2403.02310` | Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve | `Q-SYS-01`, `Q-SYS-04`, `Q-SYS-06` | true | `none` |
| `LIT-0217` | `2405.04437` | vAttention: Dynamic Memory Management for Serving LLMs without PagedAttention | `Q-SYS-02`, `Q-SYS-07` | true | `none` |
| `LIT-0218` | `2405.05465` | Vidur: A Large-Scale Simulation Framework For LLM Inference | `Q-SYS-08` | true | `none` |
| `LIT-0219` | `2406.03243` | Llumnix: Dynamic Scheduling for Large Language Model Serving | `Q-SYS-01`, `Q-SYS-06` | true | `none` |
| `LIT-0220` | `2407.00023` | Preble: Efficient Distributed Prompt Scheduling for LLM Serving | `Q-SYS-03`, `Q-SYS-06` | true | `none` |
| `LIT-0221` | `2407.00079` | Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving | `Q-SYS-02`, `Q-SYS-05`, `Q-SYS-07` | true | `none` |
| `LIT-0222` | `2504.08784` | SLOs-Serve: Optimized Serving of Multi-SLO LLMs | `Q-SYS-01`, `Q-SYS-06` | true | `none` |
| `LIT-0223` | `2504.20068` | JITServe: SLO-aware LLM Serving with Imprecise Request Information | `Q-SYS-01`, `Q-SYS-06` | true | `none` |
| `LIT-0224` | `2507.06608` | Nexus:Proactive Intra-GPU Disaggregation of Prefill and Decode in LLM Serving | `Q-SYS-04`, `Q-SYS-05`, `Q-SYS-06` | true | `none` |
| `LIT-0225` | `2603.04716` | SLO-Aware Compute Resource Allocation for Prefill-Decode Disaggregated LLM Inference | `Q-SYS-04`, `Q-SYS-05`, `Q-SYS-06` | true | `none` |

### Source Confirmation

| Role | Source URLs |
|---|---|
| Classic scheduling seed | `https://www.usenix.org/conference/osdi22/presentation/yu` |
| Core arXiv serving substrate | `https://arxiv.org/abs/2303.06865`, `https://arxiv.org/abs/2305.05920`, `https://arxiv.org/abs/2309.06180`, `https://arxiv.org/abs/2310.07240`, `https://arxiv.org/abs/2311.18677`, `https://arxiv.org/abs/2312.07104`, `https://arxiv.org/abs/2401.09670`, `https://arxiv.org/abs/2403.02310`, `https://arxiv.org/abs/2405.04437`, `https://arxiv.org/abs/2406.03243`, `https://arxiv.org/abs/2407.00023`, `https://arxiv.org/abs/2407.00079`, `https://arxiv.org/abs/2504.08784`, `https://arxiv.org/abs/2504.20068`, `https://arxiv.org/abs/2507.06608`, `https://arxiv.org/abs/2603.04716` |
| Workload/simulator support | `https://arxiv.org/abs/2401.17644`, `https://arxiv.org/abs/2405.05465` |

## B4 - Strategy Policy

### Batch Summary
- Batch ID: `B4-strategy-policy`
- Status: completed
- Date: 2026-06-03
- Batch kind: `strategy-policy-import`
- Source route: `arxiv:html-exact-id-sequential`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b4-strategy-policy-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b4-strategy-policy-import-report.json`
- Purpose: import test-time compute budgeting, model routing, confidence gating, early stopping, verifier/reflection, and search-style reasoning policy records.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Query Coverage

| Query ID | Query Family | Imported arXiv IDs |
|---|---|---|
| `Q-STR-01` | Test-Time Compute Scaling | `2201.11903`, `2203.11171`, `2305.20050`, `2407.21787`, `2408.03314`, `2504.01005`, `2505.16122`, `2512.02008`, `2604.10739` |
| `Q-STR-02` | Difficulty-Aware Budget Allocation | `2408.03314`, `2504.01005`, `2505.16122`, `2505.18404`, `2507.02076`, `2512.02008`, `2604.10739` |
| `Q-STR-03` | Model Routing / Cascades | `2305.05176`, `2406.18665`, `2603.04445` |
| `Q-STR-04` | Confidence Gating / Uncertainty / Abstention | `2505.18404`, `2602.08948` |
| `Q-STR-05` | Early Stopping / Continue-Stop Policies | `2303.11366`, `2303.17651`, `2305.10601`, `2505.18404`, `2507.02076`, `2602.08948`, `2604.10739` |
| `Q-STR-06` | Verifier / Critic / Reflection Budget | `2203.11171`, `2303.11366`, `2303.17651`, `2305.20050`, `2407.21787`, `2408.03314`, `2504.01005`, `2602.08948` |
| `Q-STR-07` | Search-Style Reasoning Budget | `2305.10601`, `2308.09687` |
| `Q-STR-08` | Budgeted Adaptive Inference Surveys | `2507.02076`, `2512.02008`, `2603.04445` |

### Import Result

| Metric | Value |
|---|---:|
| Planned unique arXiv IDs | 19 |
| arXiv HTML records fetched | 19 |
| Fetch failures | 0 |
| Import response status | 200 |
| Imported result count | 19 |
| New literature records | 19 |
| Duplicate/merged records | 0 |
| Missing arXiv IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 19 |
| `LiteratureSource` | 19 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Default Tags Applied
- `collection:strategy-support`
- `direction:test-time-compute-budgeting`
- `classification:rule-derived`
- `classification:needs-judgment-card`
- `batch:b4-strategy-policy`
- Query-specific tags: `query:q-str-01` through `query:q-str-08`
- Policy tags: `subcluster:test-time-scaling`, `subcluster:difficulty-aware-budget`, `subcluster:adaptive-compute`, `subcluster:model-routing`, `subcluster:cascade`, `subcluster:confidence-gating`, `subcluster:early-stopping`, `subcluster:verifier-budget`
- Resource/decision tags: `resource:generation-tokens`, `resource:reasoning-steps`, `resource:verifier-passes`, `resource:model-choice`, `resource:cost-budget`, `decision:budget-allocate`, `decision:model-route`, `decision:reason-continue-stop`, `decision:retrieve-or-not`
- Metric tags: `metric:answer-quality`, `metric:cost-per-query`

### Imported Literature IDs

| Literature ID | arXiv ID | Title | Query IDs | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0226` | `2201.11903` | Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | `Q-STR-01` | true | `none` |
| `LIT-0227` | `2203.11171` | Self-Consistency Improves Chain of Thought Reasoning in Language Models | `Q-STR-01`, `Q-STR-06` | true | `none` |
| `LIT-0228` | `2303.11366` | Reflexion: Language Agents with Verbal Reinforcement Learning | `Q-STR-05`, `Q-STR-06` | true | `none` |
| `LIT-0229` | `2303.17651` | Self-Refine: Iterative Refinement with Self-Feedback | `Q-STR-05`, `Q-STR-06` | true | `none` |
| `LIT-0230` | `2305.05176` | FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance | `Q-STR-03` | true | `none` |
| `LIT-0231` | `2305.10601` | Tree of Thoughts: Deliberate Problem Solving with Large Language Models | `Q-STR-05`, `Q-STR-07` | true | `none` |
| `LIT-0232` | `2305.20050` | Let's Verify Step by Step | `Q-STR-01`, `Q-STR-06` | true | `none` |
| `LIT-0233` | `2308.09687` | Graph of Thoughts: Solving Elaborate Problems with Large Language Models | `Q-STR-07` | true | `none` |
| `LIT-0234` | `2406.18665` | RouteLLM: Learning to Route LLMs with Preference Data | `Q-STR-03` | true | `none` |
| `LIT-0235` | `2407.21787` | Large Language Monkeys: Scaling Inference Compute with Repeated Sampling | `Q-STR-01`, `Q-STR-06` | true | `none` |
| `LIT-0236` | `2408.03314` | Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters | `Q-STR-01`, `Q-STR-02`, `Q-STR-06` | true | `none` |
| `LIT-0237` | `2504.01005` | When To Solve, When To Verify: Compute-Optimal Problem Solving and Generative Verification for LLM Reasoning | `Q-STR-01`, `Q-STR-02`, `Q-STR-06` | true | `none` |
| `LIT-0238` | `2505.16122` | Plan and Budget: Effective and Efficient Test-Time Scaling on Reasoning Large Language Models | `Q-STR-01`, `Q-STR-02` | true | `none` |
| `LIT-0239` | `2505.18404` | Thought calibration: Efficient and confident test-time scaling | `Q-STR-02`, `Q-STR-04`, `Q-STR-05` | true | `none` |
| `LIT-0240` | `2507.02076` | Reasoning on a Budget: A Survey of Adaptive and Controllable Test-Time Compute in LLMs | `Q-STR-02`, `Q-STR-05`, `Q-STR-08` | true | `none` |
| `LIT-0241` | `2512.02008` | The Art of Scaling Test-Time Compute for Large Language Models | `Q-STR-01`, `Q-STR-02`, `Q-STR-08` | true | `none` |
| `LIT-0242` | `2602.08948` | CoRefine: Confidence-Guided Self-Refinement for Adaptive Test-Time Compute | `Q-STR-04`, `Q-STR-05`, `Q-STR-06` | true | `none` |
| `LIT-0243` | `2603.04445` | Dynamic Model Routing and Cascading for Efficient LLM Inference: A Survey | `Q-STR-03`, `Q-STR-08` | true | `none` |
| `LIT-0244` | `2604.10739` | When More Thinking Hurts: Overthinking in LLM Test-Time Compute Scaling | `Q-STR-01`, `Q-STR-02`, `Q-STR-05` | true | `none` |

### Source Confirmation

| Role | Source URLs |
|---|---|
| Classic reasoning and verifier seeds | `https://arxiv.org/abs/2201.11903`, `https://arxiv.org/abs/2203.11171`, `https://arxiv.org/abs/2305.20050` |
| Routing, cascade, and model selection | `https://arxiv.org/abs/2305.05176`, `https://arxiv.org/abs/2406.18665`, `https://arxiv.org/abs/2603.04445` |
| Reflection, stopping, and search-style reasoning | `https://arxiv.org/abs/2303.11366`, `https://arxiv.org/abs/2303.17651`, `https://arxiv.org/abs/2305.10601`, `https://arxiv.org/abs/2308.09687`, `https://arxiv.org/abs/2505.18404`, `https://arxiv.org/abs/2507.02076`, `https://arxiv.org/abs/2602.08948`, `https://arxiv.org/abs/2604.10739` |
| Frontier test-time compute scaling | `https://arxiv.org/abs/2407.21787`, `https://arxiv.org/abs/2408.03314`, `https://arxiv.org/abs/2504.01005`, `https://arxiv.org/abs/2505.16122`, `https://arxiv.org/abs/2512.02008` |

## B5 - Theory Mapping

### Batch Summary
- Batch ID: `B5-theory-mapping`
- Status: completed
- Date: 2026-06-03
- Batch kind: `theory-mapping-import`
- Source route: `arxiv:html-exact-id-sequential+manual:doi-book-neurips`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b5-theory-mapping-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b5-theory-mapping-import-report.json`
- Purpose: import theory-support records only when an explicit theory inclusion mapping connects the work to RAG/LLM resource variables, decisions, metrics, or experimental phenomena.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Query Coverage

| Query ID | Query Family | Imported Sources |
|---|---|---|
| `Q-THY-01` | Queueing for LLM Serving and Variable Tokens | `2407.05347` |
| `Q-THY-02` | Online Scheduling / Competitive Allocation | `2407.05347`, `isbn:9780521563925` |
| `Q-THY-03` | Bandits / Contextual Bandits for Routing | `10.1023/A:1013689704352` |
| `Q-THY-04` | MDP / RL / Optimal Stopping for RAG | `10.1023/A:1013689704352` |
| `Q-THY-05` | Submodular / Knapsack Evidence Selection | `10.1007/BF01588971`, `physics/0004057` |
| `Q-THY-06` | Information Theory / Bottleneck / Rate-Distortion | `physics/0004057`, `10.1002/j.1538-7305.1948.tb01338.x` |
| `Q-THY-07` | Measure / Distribution Shift / Risk | `10.1109/SEQUEN.1997.666900`, `10.1007/3-540-49257-7_15`, `neurips:2013:4927` |
| `Q-THY-08` | Optimal Transport for Query-Corpus Alignment | `neurips:2013:4927` |
| `Q-THY-09` | High-Dimensional Geometry / Metric Space / ANN | `10.1145/276698.276876`, `10.1007/3-540-49257-7_15`, `10.1145/502512.502546`, `2104.13478` |
| `Q-THY-10` | Group Action / Quotient Space for Chunking | `1602.07576`, `2104.13478` |
| `Q-THY-11` | Coding / Sketching / MinHash / LSH for Evidence Space | `10.1109/SEQUEN.1997.666900`, `10.1145/276698.276876`, `10.1002/j.1538-7305.1948.tb01338.x` |
| `Q-THY-12` | Lattice / Ultrametric / Hierarchical Evidence Spaces | `2104.13478` |

### Import Result

| Metric | Value |
|---|---:|
| Planned unique items | 13 |
| Planned arXiv IDs | 4 |
| Planned manual sources | 9 |
| arXiv HTML records fetched | 4 |
| Manual records staged | 9 |
| Fetch failures | 0 |
| Import response status | 200 |
| Imported result count | 13 |
| New literature records | 13 |
| Duplicate/merged records | 0 |
| Missing source IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 13 |
| `LiteratureSource` | 13 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Default Tags Applied
- `collection:theory-support`
- `classification:rule-derived`
- `batch:b5-theory-mapping`
- Query-specific tags: `query:q-thy-01` through `query:q-thy-12`
- Theory tags: `theory:queueing`, `theory:online-scheduling`, `theory:bandit`, `theory:mdp`, `theory:optimal-stopping`, `theory:constrained-optimization`, `theory:submodular`, `theory:knapsack`, `theory:measure`, `theory:optimal-transport`, `theory:information-theory`, `theory:metric-space`, `theory:high-dimensional-geometry`, `theory:group-action`, `theory:quotient-space`, `theory:field-coding`, `theory:lattice`, `theory:ultrametric`, `theory:topology`
- Resource/decision/metric tags: `resource:context-window`, `resource:retrieval-depth`, `resource:chunk-size`, `resource:latency-budget`, `decision:context-packing`, `decision:budget-allocate`, `decision:model-route`, `decision:batch-schedule`, `decision:multi-hop-continue-stop`, `decision:reason-continue-stop`, `metric:ttft`, `metric:p95-latency`, `metric:regret`, `metric:cost-per-query`, `metric:recall-at-k`, `metric:retrieval-stability`, `metric:pareto-frontier`
- `classification:needs-judgment-card` was applied only to the P1 queueing-theory LLM serving record.

### Imported Literature IDs

| Literature ID | Source ID | Title | Query IDs | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0249` | `10.1007/BF01588971` | An analysis of approximations for maximizing submodular set functions - I | `Q-THY-05` | true | `none` |
| `LIT-0250` | `10.1109/SEQUEN.1997.666900` | On the Resemblance and Containment of Documents | `Q-THY-07`, `Q-THY-11` | true | `none` |
| `LIT-0251` | `10.1145/276698.276876` | Approximate Nearest Neighbors: Towards Removing the Curse of Dimensionality | `Q-THY-09`, `Q-THY-11` | true | `none` |
| `LIT-0252` | `10.1007/3-540-49257-7_15` | When Is "Nearest Neighbor" Meaningful? | `Q-THY-07`, `Q-THY-09` | true | `none` |
| `LIT-0253` | `10.1145/502512.502546` | Random Projection in Dimensionality Reduction: Applications to Image and Text Data | `Q-THY-09` | true | `none` |
| `LIT-0254` | `10.1023/A:1013689704352` | Finite-time Analysis of the Multiarmed Bandit Problem | `Q-THY-03`, `Q-THY-04` | true | `none` |
| `LIT-0255` | `neurips:2013:4927` | Sinkhorn Distances: Lightspeed Computation of Optimal Transport | `Q-THY-07`, `Q-THY-08` | true | `none` |
| `LIT-0256` | `10.1002/j.1538-7305.1948.tb01338.x` | A Mathematical Theory of Communication | `Q-THY-06`, `Q-THY-11` | true | `none` |
| `LIT-0257` | `isbn:9780521563925` | Online Computation and Competitive Analysis | `Q-THY-02` | true | `none` |
| `LIT-0258` | `physics/0004057` | The information bottleneck method | `Q-THY-05`, `Q-THY-06` | true | `none` |
| `LIT-0259` | `1602.07576` | Group Equivariant Convolutional Networks | `Q-THY-10` | true | `none` |
| `LIT-0260` | `2104.13478` | Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges | `Q-THY-09`, `Q-THY-10`, `Q-THY-12` | true | `none` |
| `LIT-0261` | `2407.05347` | A Queueing Theoretic Perspective on Low-Latency LLM Inference with Variable Token Length | `Q-THY-01`, `Q-THY-02` | true | `none` |

### Theory Inclusion Mapping

| Theory ID | Literature ID | Mapping |
|---|---|---|
| `THY-001` | `LIT-0249` | Submodular coverage and diminishing returns can model evidence/chunk selection under fixed context-window budget. |
| `THY-002` | `LIT-0250` | Resemblance and containment sketches can support chunk overlap, deduplication, and retrieval-stability measurements. |
| `THY-003` | `LIT-0251` | ANN and hashing guarantees map to retrieval-depth, recall-at-k, and latency-quality tradeoffs. |
| `THY-004` | `LIT-0252` | High-dimensional nearest-neighbor failure modes map to embedding retrieval stability and query-corpus risk. |
| `THY-006` | `LIT-0253` | Random projection stability can motivate embedding-space simplification and retrieval-stability experiments. |
| `THY-007` | `LIT-0254` | Bandit regret maps to model-route, retrieval-policy, verifier-policy, or budget-allocation decisions under uncertainty. |
| `THY-008` | `LIT-0255` | Optimal transport distances can model query-corpus alignment, corpus routing, and domain-shift-aware allocation. |
| `THY-012` | `LIT-0256` | Entropy, redundancy, and coding map to context-window information retention and evidence-packing Pareto frontiers. |
| `THY-013` | `LIT-0257` | Online competitive analysis maps to request scheduling, admission, batching, and SLO-aware policy evaluation. |
| `THY-005` | `LIT-0258` | Information bottleneck compression maps to lossy context selection and answer-quality retention under token budget. |
| `THY-009` | `LIT-0259` | Group actions and equivariance map to split, merge, reorder, and paraphrase transformations over chunk/evidence spaces. |
| `THY-010` | `LIT-0260` | Geometric spaces, groups, graphs, and gauges map to invariant chunk classes, hierarchical evidence spaces, and retrieval-stability tests. |
| `THY-011` | `LIT-0261` | Queueing state maps to LLM output-token distributions, batching policy, max-token clipping, TTFT, and p95 latency. |

### Metadata Caveat
- Manual classic theory records have stable titles, authors, years, source URLs, tags, and theory mappings, but no imported abstracts in this batch.
- arXiv theory records have author arrays and abstracts from exact-ID arXiv HTML metadata.
- Phase 5 created lightweight theory inclusion cards; B5 items still require a concrete modeling task before evidence-active use.

### Source Confirmation

| Role | Source URLs |
|---|---|
| Submodular, sketches, ANN, high-dimensional geometry, random projection, bandits, and Shannon anchors | `https://doi.org/10.1007/BF01588971`, `https://doi.org/10.1109/SEQUEN.1997.666900`, `https://doi.org/10.1145/276698.276876`, `https://doi.org/10.1007/3-540-49257-7_15`, `https://doi.org/10.1145/502512.502546`, `https://doi.org/10.1023/A:1013689704352`, `https://doi.org/10.1002/j.1538-7305.1948.tb01338.x` |
| Optimal transport and online computation anchors | `https://papers.neurips.cc/paper/4927-sinkhorn-distances-lightspeed-computation-of-optimal-transport`, `https://dblp.org/rec/books/daglib/0097013` |
| arXiv theory and LLM-serving-theory bridge | `https://arxiv.org/abs/physics/0004057`, `https://arxiv.org/abs/1602.07576`, `https://arxiv.org/abs/2104.13478`, `https://arxiv.org/abs/2407.05347` |

## B6 - Citation Expansion

### Batch Summary
- Batch ID: `B6-citation-expansion`
- Status: completed
- Date: 2026-06-03
- Batch kind: `citation-expansion-stage` plus `citation-expansion-controlled-import`
- Source route: `semantic-scholar:graph-api-references-citations+arxiv:html-exact-id-sequential`
- Execution artifact:
  - `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-stage.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-stage-report.json`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-candidates.md`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-import.mjs`
  - `.ai/.tmp/adaptive-llm-literature-phase4/b6-citation-expansion-import-report.json`
- Purpose: expand from P0/P1 B1-B5 seeds using citation/reference relations, stage candidates first, then import only a small triaged subset with explicit seed-relation rationale.
- Import route: `POST /literature/collections/import`
- Content processing enqueued: `false`

### Staging Result

| Metric | Value |
|---|---:|
| P0/P1 seeds selected | 12 |
| Seeds fetched by Semantic Scholar batch lookup | 12 |
| Relation fetch failures | 0 |
| Relation limit per seed/kind | 50 |
| Staged candidates | 807 |
| Existing candidates skipped | 26 |
| Automatic import-candidate suggestions | 393 |
| Stage-review candidates | 144 |
| Low-fit candidates skipped | 244 |
| Controlled import subset selected | 12 |

### Staging Policy
- `B6` did not bulk import the 393 automatic `import-candidate` suggestions.
- The controlled subset was selected for:
  - direct citation/reference relation to a P0/P1 seed,
  - clear fit to RAG-aware allocation, LLM serving allocation, or test-time compute/routing,
  - available arXiv exact-ID metadata,
  - no existing arXiv/DOI/title match in `LiteratureRecord`,
  - explicit resource/decision/metric tags.
- Remaining staged candidates stay in the report backlog and require another small triaged batch before import.

### Import Result

| Metric | Value |
|---|---:|
| Planned unique items | 12 |
| Planned arXiv IDs | 12 |
| arXiv HTML records fetched | 12 |
| Fetch failures | 0 |
| Import response status | 200 |
| Imported result count | 12 |
| New literature records | 12 |
| Duplicate/merged records | 0 |
| Missing source IDs | 0 |

### Safety Counter Deltas

| Counter | Delta |
|---|---:|
| `LiteratureRecord` | 12 |
| `LiteratureSource` | 12 |
| `LiteraturePipelineRun` | 0 |
| `LiteratureContentAsset` | 0 |
| `LiteratureContentProcessingBatchJob` | 0 |
| `LiteratureFulltextAcquisitionJob` | 0 |

### Default Tags Applied
- `classification:rule-derived`
- `classification:needs-judgment-card`
- `batch:b6-citation-expansion`
- `priority:p1`
- Collection tags:
  - `collection:core`: 8 records
  - `collection:system-support`: 2 records
  - `collection:strategy-support`: 2 records
- Direction tags: `direction:rag-aware-allocation`, `direction:llm-serving-resource-allocation`, `direction:test-time-compute-budgeting`
- Bridge tags: `bridge:core-system`, `bridge:core-strategy`, `bridge:system-strategy`, `bridge:strategy-theory`
- Query-specific tags: `query:b6-*`

### Imported Literature IDs

| Literature ID | arXiv ID | Title | Primary Layer | New | Matched By |
|---|---|---|---|---|---|
| `LIT-0266` | `2605.27494` | Grounded Cache Routing for Retrieval-Augmented Generation: When Is It Safe to Reuse an Answer? | core | true | `none` |
| `LIT-0267` | `2504.15302` | RAGDoll: Efficient Offloading-based Online RAG System on a Single GPU | core | true | `none` |
| `LIT-0268` | `2605.31176` | Retriever Portfolios: A Principled Approach to Adaptive RAG | core | true | `none` |
| `LIT-0269` | `2512.02281` | Trinity: Disaggregating Vector Search from Prefill-Decode Disaggregation in LLM Serving | core | true | `none` |
| `LIT-0270` | `2502.20969` | TeleRAG: Efficient Retrieval-Augmented Generation Inference with Lookahead Retrieval | core | true | `none` |
| `LIT-0271` | `2605.10235` | Route Before Retrieve: Activating Latent Routing Abilities of LLMs for RAG vs. Long-Context Selection | core | true | `none` |
| `LIT-0272` | `2404.07947` | ExeGPT: Constraint-Aware Resource Scheduling for LLM Inference | system-support | true | `none` |
| `LIT-0273` | `2404.09526` | LoongServe: Efficiently Serving Long-Context Large Language Models with Elastic Sequence Parallelism | system-support | true | `none` |
| `LIT-0274` | `2605.18796` | UCCI: Calibrated Uncertainty for Cost-Optimal LLM Cascade Routing | strategy-support | true | `none` |
| `LIT-0275` | `2605.30898` | UniScale: Adaptive Unified Inference Scaling via Online Joint Optimization of Model Routing and Test-Time Scaling | strategy-support | true | `none` |
| `LIT-0276` | `2410.04343` | Inference Scaling for Long-Context Retrieval Augmented Generation | core | true | `none` |
| `LIT-0277` | `2310.09949` | Chameleon: a Heterogeneous and Disaggregated Accelerator System for Retrieval-Augmented Language Models | core | true | `none` |

### Seed-Relation Rationale

| Literature ID | Relation Rationale |
|---|---|
| `LIT-0266` | Cites RAGCache `2404.12457`; direct RAG answer/cache routing decision under TTFT and token-cost pressure. |
| `LIT-0267` | Cites RAGO `2503.14649`; online RAG serving under single-GPU memory and retrieval/offload constraints. |
| `LIT-0268` | Cites Adaptive-RAG `2403.14403`; adaptive retriever portfolio selection for heterogeneous query distributions. |
| `LIT-0269` | Cites RAGO `2503.14649`; vector search orchestration with prefill/decode disaggregation for heterogeneous RAG requests. |
| `LIT-0270` | Cites RAGO `2503.14649` and is cited by RAGCache `2404.12457`; lookahead retrieval for lower-latency RAG inference. |
| `LIT-0271` | Cites Adaptive-RAG `2403.14403` and FrugalGPT `2305.05176`; chooses RAG versus long-context mode before retrieval. |
| `LIT-0272` | Cited by SLOs-Serve `2504.08784`; constraint-aware LLM inference scheduling under latency requirements. |
| `LIT-0273` | Cited by METIS `2412.10543` and SLOs-Serve `2504.08784`; long-context request variance and elastic serving. |
| `LIT-0274` | Cites FrugalGPT `2305.05176` and RouteLLM `2406.18665`; calibrated uncertainty for cost-optimal cascade routing. |
| `LIT-0275` | Cites FrugalGPT `2305.05176` and RouteLLM `2406.18665`; joint model routing and test-time scaling allocation. |
| `LIT-0276` | Cited by RAGO `2503.14649`; studies inference scaling choices for long-context RAG. |
| `LIT-0277` | Cited by RAGO `2503.14649`; disaggregated accelerator system for retrieval-augmented language models. |

### Source Confirmation

| Role | Source URLs |
|---|---|
| Citation expansion API | `https://api.semanticscholar.org/api-docs/` |
| Controlled B6 import sources | `https://arxiv.org/abs/2605.27494`, `https://arxiv.org/abs/2504.15302`, `https://arxiv.org/abs/2605.31176`, `https://arxiv.org/abs/2512.02281`, `https://arxiv.org/abs/2502.20969`, `https://arxiv.org/abs/2605.10235`, `https://arxiv.org/abs/2404.07947`, `https://arxiv.org/abs/2404.09526`, `https://arxiv.org/abs/2605.18796`, `https://arxiv.org/abs/2605.30898`, `https://arxiv.org/abs/2410.04343`, `https://arxiv.org/abs/2310.09949` |

### Follow-up Queue
- `B6-stage-review-backlog`: review the non-imported staged candidates before any further citation expansion import.
- `Phase 6`: run corpus readiness review and split follow-up tasks for fulltext acquisition, experiment-foundation promotion, and PaperImplementation candidate selection.
