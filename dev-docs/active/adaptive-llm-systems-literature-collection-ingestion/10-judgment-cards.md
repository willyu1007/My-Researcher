# 10 Judgment Cards

## Status
- State: completed
- Date: 2026-06-03
- Storage: DB is the corpus SSOT; repo keeps lightweight task evidence only.
- Detailed card manifest: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-cards-manifest.json`
- Detailed local JSON, generated outside repo: `.ai/.tmp/adaptive-llm-systems-literature-collection-ingestion/phase5-judgment-cards.json`
- Execution report: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-cards-report.json`
- Content processing enqueued: `false`

## Scope
- Lightweight judgment cards generated: 77.
- Theory inclusion cards generated: 13.
- Judgment-card-ready DB count: 77.
- Theory-inclusion-card-ready DB count: 13.
- Initial Phase 5 tag-apply evidence: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-card-tag-apply-report.json`.
- These cards are triage artifacts. They do not promote records to evidence-active status.

## Judgment Card Fields
| Field | Meaning |
|---|---|
| `why_relevant` | Why the item matters to adaptive LLM systems and resource allocation. |
| `resource_variable` | Resource knobs exposed by the paper or baseline. |
| `decision_variable` | Allocation/routing/scheduling decisions mapped from tags. |
| `quality_metric` | Answer/retrieval/citation/faithfulness metrics. |
| `system_metric` | Latency, throughput, cache, GPU, cost, or token metrics. |
| `benchmark_or_dataset` | Metadata-level benchmark/dataset/workload/tool signal. |
| `code_available` | Metadata-level code signal; repository must be verified before promotion. |
| `experiment_foundation_fit` | Whether the item can plausibly become a benchmark, baseline, protocol, workload, metric, or run recipe input. |
| `paper_implementation_fit` | Whether the item can plausibly support claims, baselines, limitations, or research problem framing. |

## Coverage By Batch
| Batch | Judgment Cards |
|---|---:|
| `batch:b1-core-high-precision` | 14 |
| `batch:b2-core-system-bridge` | 12 |
| `batch:b3-system-substrate` | 19 |
| `batch:b4-strategy-policy` | 19 |
| `batch:b5-theory-mapping` | 1 |
| `batch:b6-citation-expansion` | 12 |

## Judgment Card Index
| Literature ID | Priority | Collection | Resource Variable | Decision Variable | Quality Metric | System Metric | Experiment Fit | Paper Fit |
|---|---|---|---|---|---|---|---|---|
| `LIT-0177` | `p1` | `core` | chunk-size, context-window, retrieval-depth, top-k | context-packing, top-k-selection | answer-quality, citation-quality, faithfulness, recall-at-k | not-specified | medium | medium |
| `LIT-0178` | `p0` | `core` | reasoning-steps, retrieval-depth | multi-hop-continue-stop, retrieve-or-not | answer-quality | cost-per-query | medium | high |
| `LIT-0179` | `p0` | `core` | retrieval-depth | retrieve-or-not | answer-quality | cost-per-query | medium | high |
| `LIT-0180` | `p1` | `core` | retrieval-depth | retrieve-or-not | answer-quality | cost-per-query | medium | medium |
| `LIT-0181` | `p0` | `core` | model-choice, retrieval-depth, top-k | budget-allocate, model-route, top-k-selection | answer-quality, recall-at-k | cost-per-query | medium | high |
| `LIT-0182` | `p0` | `core` | context-window, decode, prefill | budget-allocate | not-specified | p95-latency, ttft | medium | high |
| `LIT-0183` | `p0` | `core` | context-window, decode, prefill, retrieval-depth, top-k | budget-allocate, top-k-selection | answer-quality, recall-at-k | p95-latency, ttft | medium | high |
| `LIT-0184` | `p0` | `core` | reasoning-steps | multi-hop-continue-stop | answer-quality | not-specified | medium | high |
| `LIT-0185` | `p0` | `core` | context-window, decode, prefill | budget-allocate | not-specified | p95-latency, ttft | medium | high |
| `LIT-0186` | `p0` | `core` | chunk-size, context-window | context-packing | citation-quality, faithfulness | not-specified | medium | high |
| `LIT-0187` | `p0` | `core` | reasoning-steps | multi-hop-continue-stop | answer-quality | not-specified | medium | high |
| `LIT-0188` | `p0` | `core` | retrieval-depth | retrieve-or-not | answer-quality | cost-per-query | medium | high |
| `LIT-0189` | `p1` | `core` | context-window, decode, prefill | budget-allocate | not-specified | p95-latency, ttft | high | medium |
| `LIT-0190` | `p0` | `core` | model-choice | budget-allocate, model-route | answer-quality | cost-per-query | high | high |
| `LIT-0194` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0195` | `p1` | `core` | not-specified | not-specified | answer-quality, faithfulness | p95-latency, ttft | high | medium |
| `LIT-0196` | `p1` | `core` | not-specified | not-specified | answer-quality, faithfulness | p95-latency, ttft | high | medium |
| `LIT-0197` | `p1` | `core` | not-specified | not-specified | answer-quality, faithfulness | p95-latency, ttft | high | medium |
| `LIT-0198` | `p1` | `core` | not-specified | not-specified | answer-quality, faithfulness | p95-latency, ttft | high | medium |
| `LIT-0199` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0200` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0201` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0202` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0203` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0204` | `p1` | `core` | context-window, decode, prefill | budget-allocate | answer-quality, faithfulness | p95-latency, ttft | high | medium |
| `LIT-0205` | `p0` | `core` | context-window, decode, kv-cache, prefill, prefix-cache | budget-allocate, cache-admit-evict, context-packing | not-specified | cache-hit-rate, p95-latency, ttft | medium | high |
| `LIT-0207` | `p1` | `system-support` | batch-slots, latency-budget | batch-schedule | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0208` | `p1` | `system-support` | batch-slots, gpu-memory | not-specified | not-specified | cost-per-query, gpu-utilization | medium | medium |
| `LIT-0209` | `p1` | `system-support` | batch-slots, gpu-memory, latency-budget | batch-schedule | not-specified | cost-per-query, gpu-utilization, p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0210` | `p1` | `system-support` | batch-slots, gpu-memory, kv-cache | batch-schedule, cache-admit-evict | not-specified | cache-hit-rate, gpu-utilization, tpot, ttft | medium | medium |
| `LIT-0211` | `p1` | `system-support` | gpu-memory, kv-cache | cache-admit-evict | not-specified | cache-hit-rate, gpu-utilization | medium | medium |
| `LIT-0212` | `p1` | `system-support` | batch-slots, decode, gpu-memory, prefill | batch-schedule, prefill-decode-allocate | not-specified | cost-per-query, gpu-utilization, tpot, ttft | medium | medium |
| `LIT-0213` | `p1` | `system-support` | batch-slots, prefix-cache | batch-schedule, cache-admit-evict | not-specified | cache-hit-rate, tpot, ttft | medium | medium |
| `LIT-0214` | `p1` | `system-support` | decode, latency-budget, prefill | batch-schedule, prefill-decode-allocate | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0215` | `p1` | `system-support` | not-specified | not-specified | not-specified | gpu-utilization, tpot, ttft | high | medium |
| `LIT-0216` | `p1` | `system-support` | batch-slots, decode, latency-budget, prefill | batch-schedule, prefill-decode-allocate | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0217` | `p1` | `system-support` | batch-slots, gpu-memory, kv-cache | cache-admit-evict | not-specified | cache-hit-rate, cost-per-query, gpu-utilization | medium | medium |
| `LIT-0218` | `p1` | `system-support` | not-specified | not-specified | not-specified | gpu-utilization, tpot, ttft | high | medium |
| `LIT-0219` | `p1` | `system-support` | batch-slots, latency-budget | batch-schedule | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0220` | `p1` | `system-support` | latency-budget, prefix-cache | batch-schedule, cache-admit-evict | not-specified | cache-hit-rate, p95-latency, p99-latency, ttft | medium | medium |
| `LIT-0221` | `p1` | `system-support` | batch-slots, decode, gpu-memory, kv-cache, prefill | cache-admit-evict, prefill-decode-allocate | not-specified | cache-hit-rate, cost-per-query, gpu-utilization, tpot, ttft | medium | medium |
| `LIT-0222` | `p1` | `system-support` | batch-slots, latency-budget | batch-schedule | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0223` | `p1` | `system-support` | batch-slots, latency-budget | batch-schedule | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0224` | `p1` | `system-support` | decode, latency-budget, prefill | batch-schedule, prefill-decode-allocate | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0225` | `p1` | `system-support` | decode, latency-budget, prefill | batch-schedule, prefill-decode-allocate | not-specified | p95-latency, p99-latency, tpot, ttft | medium | medium |
| `LIT-0226` | `p1` | `strategy-support` | generation-tokens, reasoning-steps | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0227` | `p1` | `strategy-support` | generation-tokens, reasoning-steps, verifier-passes | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0228` | `p1` | `strategy-support` | reasoning-steps, verifier-passes | budget-allocate, reason-continue-stop | answer-quality | cost-per-query | medium | medium |
| `LIT-0229` | `p1` | `strategy-support` | reasoning-steps, verifier-passes | budget-allocate, reason-continue-stop | answer-quality | cost-per-query | medium | medium |
| `LIT-0230` | `p1` | `strategy-support` | cost-budget, model-choice | model-route | answer-quality | cost-per-query | medium | medium |
| `LIT-0231` | `p1` | `strategy-support` | reasoning-steps | budget-allocate, reason-continue-stop | answer-quality | cost-per-query | medium | medium |
| `LIT-0232` | `p1` | `strategy-support` | generation-tokens, reasoning-steps, verifier-passes | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0233` | `p1` | `strategy-support` | reasoning-steps | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0234` | `p0` | `strategy-support` | cost-budget, model-choice | model-route | answer-quality | cost-per-query | medium | medium |
| `LIT-0235` | `p0` | `strategy-support` | generation-tokens, reasoning-steps, verifier-passes | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0236` | `p0` | `strategy-support` | generation-tokens, reasoning-steps, verifier-passes | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0237` | `p0` | `strategy-support` | generation-tokens, reasoning-steps, verifier-passes | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0238` | `p0` | `strategy-support` | generation-tokens, reasoning-steps | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0239` | `p0` | `strategy-support` | cost-budget, reasoning-steps | budget-allocate, model-route, reason-continue-stop, retrieve-or-not | answer-quality | cost-per-query | medium | medium |
| `LIT-0240` | `p2` | `strategy-support` | reasoning-steps | budget-allocate, reason-continue-stop | answer-quality | cost-per-query | medium | medium |
| `LIT-0241` | `p1` | `strategy-support` | generation-tokens, reasoning-steps | budget-allocate | answer-quality | not-specified | medium | medium |
| `LIT-0242` | `p1` | `strategy-support` | cost-budget, reasoning-steps, verifier-passes | budget-allocate, model-route, reason-continue-stop, retrieve-or-not | answer-quality | cost-per-query | medium | medium |
| `LIT-0243` | `p2` | `strategy-support` | cost-budget, model-choice | model-route | answer-quality | cost-per-query | medium | medium |
| `LIT-0244` | `p1` | `strategy-support` | generation-tokens, reasoning-steps | budget-allocate, reason-continue-stop | answer-quality | cost-per-query | medium | medium |
| `LIT-0261` | `p1` | `theory-support` | latency-budget | batch-schedule | regret | p95-latency, ttft | medium | theory-support |
| `LIT-0266` | `p1` | `core` | context-window, kv-cache, prefix-cache | budget-allocate, cache-admit-evict | not-specified | cache-hit-rate, cost-per-query, ttft | medium | medium |
| `LIT-0267` | `p1` | `core` | gpu-memory, retrieval-depth | budget-allocate | not-specified | cost-per-query, p95-latency | high | medium |
| `LIT-0268` | `p1` | `core` | retrieval-depth | budget-allocate | answer-quality, pareto-frontier, recall-at-k | not-specified | medium | medium |
| `LIT-0269` | `p1` | `core` | decode, prefill, retrieval-depth | budget-allocate, prefill-decode-allocate | not-specified | cost-per-query, p95-latency | high | medium |
| `LIT-0270` | `p1` | `core` | gpu-memory, retrieval-depth | budget-allocate | not-specified | cost-per-query, p95-latency | high | medium |
| `LIT-0271` | `p1` | `core` | context-window, cost-budget | budget-allocate, model-route, retrieve-or-not | answer-quality | cost-per-query | medium | medium |
| `LIT-0272` | `p1` | `system-support` | batch-slots, gpu-memory, latency-budget | batch-schedule, budget-allocate | not-specified | gpu-utilization, p95-latency | high | medium |
| `LIT-0273` | `p1` | `system-support` | context-window, decode, gpu-memory, prefill | prefill-decode-allocate | not-specified | p95-latency, p99-latency | high | medium |
| `LIT-0274` | `p1` | `strategy-support` | cost-budget, model-choice | budget-allocate, model-route | answer-quality | cost-per-query | medium | medium |
| `LIT-0275` | `p1` | `strategy-support` | cost-budget, model-choice, reasoning-steps | budget-allocate, model-route | answer-quality | cost-per-query | medium | medium |
| `LIT-0276` | `p1` | `core` | context-window, generation-tokens, retrieval-depth | budget-allocate, context-packing | answer-quality | tokens-per-query | medium | medium |
| `LIT-0277` | `p1` | `core` | gpu-memory, retrieval-depth | budget-allocate | not-specified | gpu-utilization, p95-latency | high | medium |

## Theory Inclusion Cards
| Literature ID | Priority | Theory Concept | LLM/RAG Phenomenon | Experimental Variable | Metric Or Bound | Inclusion Status |
|---|---|---|---|---|---|---|
| `LIT-0249` | `p3` | Submodular set maximization under budget constraints | Evidence selection and context packing under token budget | chunk budget, diversity penalty, context order | answer quality, citation coverage, approximation-style Pareto frontier | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0250` | `p3` | Document resemblance, containment, and sketching | Chunk overlap, deduplication, and semantic equivalence | chunk size, overlap, sketch/hash rule | retrieval stability, duplicate rate, citation support | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0251` | `p3` | Approximate nearest neighbor search and LSH | Retrieval latency-quality tradeoff in embedding indexes | ANN recall target, probes, hash/index parameter | recall-at-k, retrieval latency, answer quality | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0252` | `p3` | Distance concentration and nearest-neighbor meaningfulness | Embedding-space retrieval instability under high-dimensional noise | embedding dimension, corpus size, noise level, top-k | retrieval stability, nDCG, answer quality | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0253` | `p3` | Random projection and distance preservation | Low-cost semantic projection for approximate retrieval or routing | projection dimension, index type, rerank depth | recall-at-k, latency, routing agreement | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0254` | `p3` | Finite-time multi-armed bandit regret | Online selection of retrieval, model, verifier, or reasoning policies | arms as RAG strategies, exploration rate, reward shaping | regret, answer quality, cost per query | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0255` | `p3` | Entropy-regularized optimal transport | Query-corpus alignment and corpus routing under distribution shift | transport cost, regularization strength, corpus partition | answer quality, compatibility, retrieval cost | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0256` | `p3` | Entropy, redundancy, channel capacity, and coding | Evidence compression and context-window allocation | context length, redundancy removal, chunk coding rule | faithfulness, citation coverage, answer quality | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0257` | `p3` | Online computation and competitive analysis | Online serving, admission, batching, and SLO-aware scheduling | arrival rate, admission threshold, batch policy, SLO target | competitive ratio proxy, p95 latency, regret | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0258` | `p3` | Information bottleneck | Context compression and answer-relevant evidence retention | compression ratio, selected spans, bottleneck objective | faithfulness, citation quality, answer quality | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0259` | `p3` | Group equivariance | Invariant retrieval under chunk transformations | transformation operator, chunk grouping rule, invariant scorer | retrieval stability, faithfulness, citation support | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0260` | `p3` | Geometric deep learning, quotient spaces, and hierarchy | Structured chunk space, semantic equivalence, and evidence hierarchy | equivalence relation, hierarchy level, grouping rule | retrieval stability, citation support, answer quality | `theory-seed-bank-only-not-evidence-active` |
| `LIT-0261` | `p1` | Queueing under variable token length | LLM serving latency with variable input/output length and adaptive context budget | input length, output length, arrival rate, batching policy | TTFT, p95 latency, tail overload threshold | `theory-bridge-and-p1-judgment-card-ready` |

## Promotion Guardrails
- `classification:judgment-card-ready` means the lightweight card exists; it does not mean the paper is evidence-active.
- `classification:theory-inclusion-card-ready` means the theory mapping exists; P3 theory items remain seed-bank material until a concrete modeling task selects them.
- Before experiment-foundation promotion, verify fulltext claims, code/repository availability, benchmark protocol, license, and runnable baseline feasibility.
- Before PaperImplementation promotion, verify the paper supports a concrete claim, limitation, negative result, or experimental contrast for the selected topic.

## Open Follow-ups
- Review the B6 staged but non-imported citation candidates before another citation expansion batch.
- Phase 6 should summarize layer/year/card coverage and split follow-up tasks for fulltext acquisition, experiment-foundation promotion, and PaperImplementation candidate selection.
