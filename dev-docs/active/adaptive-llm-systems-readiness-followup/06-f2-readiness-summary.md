# 06 F2 Fulltext And Code Readiness Summary

## Status
- State: completed
- Date: 2026-06-04
- Scope: T-116 experiment-foundation candidates, T-116 current-round P0 seeds, and the F1 classic RAG anchor.
- This pass records readiness signals only; it does not create experiment-foundation assets or enqueue content processing.

## Summary
| Metric | Value |
| --- | --- |
| Targets | 39 |
| Experiment-foundation candidates | 15 |
| P0 research seeds | 24 |
| F1 classic anchor targets | 1 |
| Verified code repositories | 11 |
| High runnable feasibility | 10 |
| Needs manual follow-up | 16 |

## Promotion-Ready Candidates
| Literature ID | Title | Repo | License | Protocol | Feasibility |
| --- | --- | --- | --- | --- | --- |
| `LIT-0181` | Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity | https://github.com/starsuzi/Adaptive-RAG | Apache-2.0 | code-backed-method-protocol-candidate | high |
| `LIT-0189` | RAGPulse: An Open-Source RAG Workload Trace to Optimize RAG Serving Systems | https://github.com/flashserve/RAGPulse | MIT | workload-trace-protocol-candidate | high |
| `LIT-0195` | FlashRAG: A Modular Toolkit for Efficient Retrieval-Augmented Generation Research | https://github.com/RUC-NLPIR/FlashRAG | MIT | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0197` | RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation | https://github.com/amazon-science/RAGChecker | Apache-2.0 | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0198` | RAGLAB: A Modular and Research-Oriented Unified Framework for Retrieval-Augmented Generation | https://github.com/fate-ubw/RAGLAB | MIT | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0204` | RAGPerf: An End-to-End Benchmarking Framework for Retrieval-Augmented Generation Systems | https://github.com/platformxlab/RAGPerf | Apache-2.0 | benchmark-protocol-candidate | high |
| `LIT-0215` | BurstGPT: A Real-world Workload Dataset to Optimize LLM Serving Systems | https://github.com/HPMLL/BurstGPT | CC-BY-4.0 | workload-trace-protocol-candidate | high |
| `LIT-0218` | Vidur: A Large-Scale Simulation Framework For LLM Inference | https://github.com/microsoft/vidur | MIT | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0234` | RouteLLM: Learning to Route LLMs with Preference Data | https://github.com/lm-sys/RouteLLM | Apache-2.0 | code-backed-method-protocol-candidate | high |
| `LIT-0273` | LoongServe: Efficiently Serving Long-Context Large Language Models with Elastic Sequence Parallelism | https://github.com/LoongServe/LoongServe | Apache-2.0 | code-backed-method-protocol-candidate | high |

## Full Target Matrix
| Literature ID | Reasons | Fulltext | Code | Protocol | Feasibility |
| --- | --- | --- | --- | --- | --- |
| `LIT-0178` | p0-research-seed | https://arxiv.org/pdf/2305.06983 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0179` | p0-research-seed | https://arxiv.org/pdf/2310.11511 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0181` | p0-research-seed | https://arxiv.org/pdf/2403.14403 | https://github.com/starsuzi/Adaptive-RAG | code-backed-method-protocol-candidate | high |
| `LIT-0182` | p0-research-seed | https://arxiv.org/pdf/2405.16444 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0183` | p0-research-seed | https://arxiv.org/pdf/2412.10543 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0184` | p0-research-seed | https://arxiv.org/pdf/2502.01142 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0185` | p0-research-seed | https://arxiv.org/pdf/2503.14649 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0186` | p0-research-seed | https://arxiv.org/pdf/2507.05633 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0187` | p0-research-seed | https://arxiv.org/pdf/2510.14337 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0188` | p0-research-seed | https://arxiv.org/pdf/2511.09803 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0189` | experiment-foundation-candidate | https://arxiv.org/pdf/2511.12979 | https://github.com/flashserve/RAGPulse | workload-trace-protocol-candidate | high |
| `LIT-0190` | experiment-foundation-candidate, p0-research-seed | https://arxiv.org/pdf/2602.00296 | not_found_in_structured_pass | benchmark-protocol-candidate | needs-manual-followup |
| `LIT-0194` | p0-research-seed | https://arxiv.org/pdf/2404.12457 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0195` | experiment-foundation-candidate | https://arxiv.org/pdf/2405.13576 | https://github.com/RUC-NLPIR/FlashRAG | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0196` | experiment-foundation-candidate | https://arxiv.org/pdf/2407.11005 | https://github.com/rungalileo/ragbench | benchmark-protocol-candidate | medium |
| `LIT-0197` | experiment-foundation-candidate | https://arxiv.org/pdf/2408.08067 | https://github.com/amazon-science/RAGChecker | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0198` | experiment-foundation-candidate | https://arxiv.org/pdf/2408.11381 | https://github.com/fate-ubw/RAGLAB | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0199` | p0-research-seed | https://arxiv.org/pdf/2410.07590 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0200` | p0-research-seed | https://arxiv.org/pdf/2502.15734 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0201` | p0-research-seed | https://arxiv.org/pdf/2510.10129 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0202` | p0-research-seed | https://arxiv.org/pdf/2601.12904 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0203` | p0-research-seed | https://arxiv.org/pdf/2602.02579 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0204` | experiment-foundation-candidate | https://arxiv.org/pdf/2603.10765 | https://github.com/platformxlab/RAGPerf | benchmark-protocol-candidate | high |
| `LIT-0205` | p0-research-seed | https://arxiv.org/pdf/2603.23049 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0215` | experiment-foundation-candidate | https://arxiv.org/pdf/2401.17644 | https://github.com/HPMLL/BurstGPT | workload-trace-protocol-candidate | high |
| `LIT-0218` | experiment-foundation-candidate | https://arxiv.org/pdf/2405.05465 | https://github.com/microsoft/vidur | toolkit-or-simulator-protocol-candidate | high |
| `LIT-0234` | p0-research-seed | https://arxiv.org/pdf/2406.18665 | https://github.com/lm-sys/RouteLLM | code-backed-method-protocol-candidate | high |
| `LIT-0235` | p0-research-seed | https://arxiv.org/pdf/2407.21787 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0236` | p0-research-seed | https://arxiv.org/pdf/2408.03314 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0237` | p0-research-seed | https://arxiv.org/pdf/2504.01005 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0238` | p0-research-seed | https://arxiv.org/pdf/2505.16122 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0239` | p0-research-seed | https://arxiv.org/pdf/2505.18404 | not_found_in_structured_pass | paper-method-protocol-only | medium-paper-only |
| `LIT-0267` | experiment-foundation-candidate | https://arxiv.org/pdf/2504.15302 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0269` | experiment-foundation-candidate | https://arxiv.org/pdf/2512.02281 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0270` | experiment-foundation-candidate | https://arxiv.org/pdf/2502.20969 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0272` | experiment-foundation-candidate | https://arxiv.org/pdf/2404.07947 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0273` | experiment-foundation-candidate | https://arxiv.org/pdf/2404.09526 | https://github.com/LoongServe/LoongServe | code-backed-method-protocol-candidate | high |
| `LIT-0277` | experiment-foundation-candidate | https://arxiv.org/pdf/2310.09949 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |
| `LIT-0283` | f1-classic-rag-anchor | https://arxiv.org/pdf/2005.11401 | not_found_in_structured_pass | paper-method-protocol-only | needs-manual-followup |

## Safety Counters
| Counter | Value |
| --- | --- |
| `literature_count` | 288 |
| `source_count` | 292 |
| `pipeline_run_count` | 0 |
| `content_asset_count` | 0 |
| `content_processing_batch_job_count` | 0 |
| `fulltext_acquisition_job_count` | 0 |

## Notes
- `verified-api` code means GitHub API metadata was captured; `verified-url` means the repository URL was reachable but API metadata was rate-limited or unavailable.
- Detailed target/readiness manifests: `dev-docs/active/adaptive-llm-systems-readiness-followup/artifacts/f2-readiness-targets-manifest.json`, `dev-docs/active/adaptive-llm-systems-readiness-followup/artifacts/f2-fulltext-code-readiness-manifest.json`; detailed local JSON is generated outside repo under `.ai/.tmp/adaptive-llm-systems-readiness-followup`.
- `needs-manual-followup` items should be checked via project pages, author pages, supplemental material, or benchmark hosting before experiment-foundation promotion.
- License is taken from GitHub API metadata where available, or from the static verified-repo mapping when API calls are rate-limited; `unknown` requires manual review.
