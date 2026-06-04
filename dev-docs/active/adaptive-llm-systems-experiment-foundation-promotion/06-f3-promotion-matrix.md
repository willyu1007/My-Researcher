# 06 F3 Promotion Matrix

## Status
- State: in-progress
- Date: 2026-06-04
- Scope: 10 high runnable-feasibility candidates from T-117 F2 readiness.
- Boundary: candidate promotion planning only; no canonical experiment-foundation assets are created.

## Summary
| Metric | Value |
| --- | --- |
| Candidates | 10 |
| Auto-promotion allowed | 0 |
| Manual review required | 10 |
| Dataset primary candidates | 2 |
| Benchmark primary candidates | 1 |
| Baseline primary candidates | 3 |
| Evaluation-protocol primary candidates | 1 |
| Method-component primary candidates | 3 |

## Promotion Matrix
| Rank | Literature ID | Primary Family | Secondary Families | Lane | Status | Risk | Proposed Output | Next Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `LIT-0204` | `benchmark` | `evaluation_protocol`, `dataset` | rag-systems-benchmark | `manual_review_required` | `low` | End-to-end RAG systems benchmark candidate for quality/latency/cost tradeoff evaluation. | Inspect RAGPerf benchmark protocol, datasets, metrics, and minimal smoke command. |
| 2 | `LIT-0189` | `dataset` | `benchmark`, `evaluation_protocol` | rag-serving-workload-trace | `manual_review_required` | `medium` | RAG serving workload-trace dataset candidate for retrieval/prefill/decode load modeling. | Inspect trace schema, license text, and replay instructions before dataset candidate promotion. |
| 3 | `LIT-0195` | `method_component` | `baseline`, `evaluation_protocol` | rag-toolkit-baseline-harness | `manual_review_required` | `low` | Reusable RAG toolkit/method component candidate for benchmark harness integration. | Identify a minimal FlashRAG pipeline and its dataset/evaluator dependencies. |
| 4 | `LIT-0197` | `evaluation_protocol` | `benchmark`, `method_component` | rag-quality-diagnosis-protocol | `manual_review_required` | `low` | Fine-grained RAG diagnosis/evaluation protocol candidate. | Extract metric definitions and evaluator entrypoints for protocol candidate payload. |
| 5 | `LIT-0198` | `method_component` | `baseline`, `evaluation_protocol` | rag-framework-baseline-harness | `manual_review_required` | `low` | Research-oriented RAG framework candidate for modular baseline construction. | Identify RAGLAB runnable examples and supported evaluation datasets. |
| 6 | `LIT-0181` | `baseline` | `method_component` | rag-aware-allocation-policy-baseline | `manual_review_required` | `low` | Adaptive RAG policy baseline for query-complexity-aware retrieval/generation allocation. | Inspect repository entrypoint and identify minimal benchmark-compatible run command. |
| 7 | `LIT-0215` | `dataset` | `benchmark` | llm-serving-workload-trace | `manual_review_required` | `medium` | LLM serving workload dataset candidate for queueing/scheduling substrate experiments. | Inspect workload format, license constraints, and replay compatibility with serving simulators. |
| 8 | `LIT-0218` | `method_component` | `baseline` | llm-serving-simulator | `manual_review_required` | `low` | LLM inference simulator component candidate for serving policy experiments. | Identify a minimal Vidur simulation run using a local or synthetic workload. |
| 9 | `LIT-0234` | `baseline` | `method_component` | test-time-routing-baseline | `manual_review_required` | `low` | LLM routing baseline candidate for adaptive model-choice cost/quality experiments. | Inspect RouteLLM examples and define a provider-independent smoke path. |
| 10 | `LIT-0273` | `baseline` | `method_component` | long-context-serving-baseline | `manual_review_required` | `low` | Long-context LLM serving baseline candidate for context-window/prefill/decode resource allocation. | Inspect LoongServe minimum hardware assumptions and decide whether to keep as local-smoke or external-run candidate. |

## Auto-Promotion Gate
- Current decision: `auto_promotion_allowed=false` for all candidates.
- Reason: F2 verified repository reachability/license signals, but F3 still needs duplicate, completeness, policy, version/protocol, and smoke checks.
- Promotion should use `manual_review_required` until candidate payloads satisfy the existing experiment-foundation gates.

## Recommended First Lane
- Start with `LIT-0204` RAGPerf because it is directly aligned with RAG-aware resource allocation and can provide benchmark/protocol structure for other RAG candidates.
- Then review `LIT-0189` RAGPulse and `LIT-0195` FlashRAG so the benchmark has workload/toolkit anchors.

## Artifact Boundary
- Matrix JSON: `dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/artifacts/f3-promotion-matrix.json`.
- Source F2 detail: `.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-fulltext-code-readiness.json` (ignored local detail; regenerate via T-117 tool if absent).
