# 11 Corpus Readiness Review

## Decision
- State: completed
- Date: 2026-06-04
- Decision: current 89-record corpus is ready as a research seed corpus and follow-up planning substrate.
- Not ready for automatic evidence-active promotion or 5000-record bulk expansion without the follow-up tasks below.
- Scope: current B1-B6 batch records only. The broader 281-record literature database is not the denominator for this review.
- Content processing enqueued: `false`

## Completion Signal
- Taxonomy, seed catalog, query catalog, import evidence, tag distribution, and P0/P1 triage cards are documented.
- P0/P1 current-round records have `classification:judgment-card-ready`; B5 theory records have `classification:theory-inclusion-card-ready`.
- Remaining gaps are split into explicit follow-up tasks and do not block closing the current collection round.

## Coverage Summary
| Metric | Value |
| --- | --- |
| Current-round records | 89 |
| All literature DB records | 288 |
| Judgment-card-ready records | 77 |
| Theory-inclusion-card-ready records | 13 |
| Needs-judgment-card records | 0 |
| Low-confidence records | 0 |
| No abstract records | 9 |
| No arXiv ID records | 10 |
| High experiment-foundation candidates | 15 |
| Multi-priority records | 0 |

## Layer Distribution
| Collection Layer | Records |
| --- | --- |
| `collection:core` | 34 |
| `collection:strategy-support` | 21 |
| `collection:system-support` | 21 |
| `collection:theory-support` | 13 |

## Direction Distribution
| Direction | Records |
| --- | --- |
| `direction:llm-serving-resource-allocation` | 21 |
| `direction:rag-aware-allocation` | 30 |
| `direction:test-time-compute-budgeting` | 21 |

## Effective Priority Distribution
| Effective Priority | Records |
| --- | --- |
| `priority:p0` | 24 |
| `priority:p1` | 51 |
| `priority:p2` | 2 |
| `priority:p3` | 12 |

## Time Distribution
| Band | Records |
| --- | --- |
| `classic_pre_2023` | 16 |
| `frontier_2025_2026` | 33 |
| `transition_2023_2024` | 40 |

## Experiment-Foundation Candidate Set
- These are candidates for a follow-up promotion task, not assets created by this task.
| Literature ID | Year | Title | Signals |
| --- | --- | --- | --- |
| `LIT-0189` | 2025 | RAGPulse: An Open-Source RAG Workload Trace to Optimize RAG Serving Systems | `metric:p95-latency`, `metric:ttft`, `resource:context-window`, `resource:decode`, `resource:prefill` |
| `LIT-0190` | 2026 | RAGRouter-Bench: A Dataset and Benchmark for Adaptive RAG Routing | `metric:answer-quality`, `metric:cost-per-query`, `resource:model-choice` |
| `LIT-0195` | 2024 | FlashRAG: A Modular Toolkit for Efficient Retrieval-Augmented Generation Research | `fit:experiment-foundation`, `metric:answer-quality`, `metric:faithfulness`, `metric:p95-latency`, `metric:ttft` |
| `LIT-0196` | 2024 | RAGBench: Explainable Benchmark for Retrieval-Augmented Generation Systems | `fit:experiment-foundation`, `metric:answer-quality`, `metric:faithfulness`, `metric:p95-latency`, `metric:ttft` |
| `LIT-0197` | 2024 | RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation | `fit:experiment-foundation`, `metric:answer-quality`, `metric:faithfulness`, `metric:p95-latency`, `metric:ttft` |
| `LIT-0198` | 2024 | RAGLAB: A Modular and Research-Oriented Unified Framework for Retrieval-Augmented Generation | `fit:experiment-foundation`, `metric:answer-quality`, `metric:faithfulness`, `metric:p95-latency`, `metric:ttft` |
| `LIT-0204` | 2026 | RAGPerf: An End-to-End Benchmarking Framework for Retrieval-Augmented Generation Systems | `fit:experiment-foundation`, `metric:answer-quality`, `metric:faithfulness`, `metric:p95-latency`, `metric:ttft`, `resource:context-window`, `resource:decode`, `resource:prefill` |
| `LIT-0215` | 2024 | BurstGPT: A Real-world Workload Dataset to Optimize LLM Serving Systems | `fit:experiment-foundation`, `metric:gpu-utilization`, `metric:tpot`, `metric:ttft` |
| `LIT-0218` | 2024 | Vidur: A Large-Scale Simulation Framework For LLM Inference | `fit:experiment-foundation`, `metric:gpu-utilization`, `metric:tpot`, `metric:ttft` |
| `LIT-0267` | 2025 | RAGDoll: Efficient Offloading-based Online RAG System on a Single GPU | `fit:experiment-foundation`, `metric:cost-per-query`, `metric:p95-latency`, `resource:gpu-memory`, `resource:retrieval-depth` |
| `LIT-0269` | 2025 | Trinity: Disaggregating Vector Search from Prefill-Decode Disaggregation in LLM Serving | `fit:experiment-foundation`, `metric:cost-per-query`, `metric:p95-latency`, `resource:decode`, `resource:prefill`, `resource:retrieval-depth` |
| `LIT-0270` | 2025 | TeleRAG: Efficient Retrieval-Augmented Generation Inference with Lookahead Retrieval | `fit:experiment-foundation`, `metric:cost-per-query`, `metric:p95-latency`, `resource:gpu-memory`, `resource:retrieval-depth` |
| `LIT-0272` | 2024 | ExeGPT: Constraint-Aware Resource Scheduling for LLM Inference | `fit:experiment-foundation`, `metric:gpu-utilization`, `metric:p95-latency`, `resource:batch-slots`, `resource:gpu-memory`, `resource:latency-budget` |
| `LIT-0273` | 2024 | LoongServe: Efficiently Serving Long-Context Large Language Models with Elastic Sequence Parallelism | `fit:experiment-foundation`, `metric:p95-latency`, `metric:p99-latency`, `resource:context-window`, `resource:decode`, `resource:gpu-memory`, `resource:prefill` |
| `LIT-0277` | 2023 | Chameleon: a Heterogeneous and Disaggregated Accelerator System for Retrieval-Augmented Language Models | `fit:experiment-foundation`, `metric:gpu-utilization`, `metric:p95-latency`, `resource:gpu-memory`, `resource:retrieval-depth` |

## Non-Blocking Gaps
| Gap | Impact | Follow-up |
| --- | --- | --- |
| Missing canonical classic RAG anchor | No current impact; record exists outside this specific gap. | F1-import-missing-core-classic |
| Fulltext/code/protocol not verified | Judgment cards are metadata-level; experiment and paper promotion need evidence checks. | F2-fulltext-and-code-readiness-pass |
| Experiment assets not created | 15 candidates are ready for review, but experiment-foundation owns asset creation. | F3-experiment-foundation-promotion-candidates |
| PaperImplementation shortlist not selected | The corpus is broad; claim-specific paper selection should wait for topic/argument choice. | F4-paper-implementation-shortlist |
| B6 citation-expansion backlog | 807 staged candidates require review before any next expansion. | F5-b6-stage-review-backlog |
| Classic theory metadata caveat | 9 records have no abstract; all are manual/classic theory records and should remain seed-bank only until enriched. | F7-classic-theory-metadata-enrichment |
| Scale-up classification design | Flat tags are workable now but fragile for thousands of records. | F8-scale-up-classifier-and-taxonomy-schema-decision |

## Follow-up Split
| ID | Priority | Owner Boundary | Purpose | Acceptance |
| --- | --- | --- | --- | --- |
| `F1-import-missing-core-classic` | `p0` | `literature` | Import or reconcile the missing classic RAG anchor `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks` (`arxiv:2005.11401`) so the core layer has the canonical foundation paper. | Canonical record exists with source provenance, `collection:core`, `direction:rag-aware-allocation`, baseline tags, and no content-processing side effects. |
| `F2-fulltext-and-code-readiness-pass` | `p0` | `literature` | Acquire or verify fulltext/code/protocol only for the 15 experiment-foundation candidate records and the highest-priority P0 research seeds. | For each selected item, record fulltext status, repository/protocol URL if available, license caveat, and runnable-baseline feasibility. |
| `F3-experiment-foundation-promotion-candidates` | `p0` | `experiment-foundation` | Turn selected benchmark/workload/toolkit records into reusable dataset, benchmark, baseline, metric, or RunRecipe candidates. | Each promoted item has an experiment-foundation asset type, expected inputs/outputs, baseline recipe, and verification command or skip reason. |
| `F4-paper-implementation-shortlist` | `p1` | `PaperImplementation` | Create a shortlist of claim-supporting papers after topic selection chooses the concrete argument direction. | Shortlist groups papers by claim role: direct baseline, contrast, limitation, metric, or theory support. |
| `F5-b6-stage-review-backlog` | `p1` | `literature` | Review staged citation-expansion candidates before any next import batch. | Human/LLM-assisted review produces an allowlist with explicit seed relation, query fit, source URL, and expected tags; no bulk import without review. |
| `F7-classic-theory-metadata-enrichment` | `p2` | `literature` | Enrich classic theory records that were imported manually without abstracts. | Each selected theory record has abstract/source notes or a documented reason why abstract import is not required. |
| `F8-scale-up-classifier-and-taxonomy-schema-decision` | `p2` | `literature` | Decide whether automated classifier support or structured taxonomy tables are needed before scaling toward thousands of records. | Decision note chooses: keep tags only, add classifier artifact, or introduce taxonomy schema, with migration and evaluation criteria. |

## Safety Verification
| Counter | Value |
| --- | --- |
| `literature_count` | 288 |
| `source_count` | 292 |
| `pipeline_run_count` | 0 |
| `content_asset_count` | 0 |
| `content_processing_batch_job_count` | 0 |
| `fulltext_acquisition_job_count` | 0 |

## Notes
- Use the effective priority distribution for readiness reporting; `12-priority-reconciliation.md` preserves the one-priority tag invariant for this round.
- Detailed readiness manifest: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase6-corpus-readiness-manifest.json`; detailed local JSON is generated outside repo at `.ai/.tmp/adaptive-llm-systems-literature-collection-ingestion/phase6-corpus-readiness.json`.
- The missing classic RAG anchor is a targeted correction, not a reason to restart collection.
- Classic theory records without abstracts are acceptable for seed-bank use, but not for evidence-active use.
- B6 staged candidates should be reviewed before another citation-expansion import; this task deliberately avoided bulk import.
