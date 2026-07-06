# 00 Overview

## Status
- State: in-progress
- Progress: **S1 决策已拍板并落地（2026-07-06）**——用户选定**最小适配器**路径（faithful GPU 环境留作外部依赖项）；S1 CPU/retrieval 烟测 **pass**（run `ragperf-s1-20260706T141503Z`，verdict `protocol_executable_cpu_smoke_pass`，13 最小补丁+合成 50 文档语料，insert/query 双过，RAGPerf 自身 stats 产出；工件 `artifacts/lit-0204-ragperf-s1-cpu-adapter.json`，留痕 03/04 §2026-07-06）。RAGPerf 维持 candidate 级。**同窗合并项**：文献 evaluator re-baseline 完成——当前栈（pgvector + text-embedding-3-large）vs 2026-05-11 基线：recall@5 1.0 持平、MRR@5 +0.020、nDCG@5 +0.015、blind 9/9，不劣于且略优（04 §2026-07-06）。
- Next step: 以 S1 证据回填 `07-lit-0204-ragperf-candidate-payload.md` 缺字段（`entrypoint_smoke_result`/`local_smoke_command` 现已可填；`protocol_hash`/dataset 政策字段仍缺），然后做 candidate 晋升裁决；faithful 基准执行依赖外部 Linux/CUDA/vLLM 环境（S1 工件 blockers_remaining 已列）。

## Goal
- Start `F3-experiment-foundation-promotion-candidates`.
- Turn the T-117 high runnable-feasibility literature set into grounded experiment-foundation asset candidates.
- Produce a promotion matrix that tells us which papers/tools/traces should become dataset, benchmark, baseline, evaluation protocol, or method-component candidates.

## Upstream Context
- T-116 closed the current adaptive LLM systems seed corpus:
  - 89 current-round B1-B6 records.
  - 15 experiment-foundation candidates.
  - 77 judgment-card-ready records.
- T-117 closed F1/F2:
  - imported the classic RAG anchor `LIT-0283`.
  - reviewed 39 readiness targets.
  - found 11 verified code repositories.
  - identified 10 high runnable-feasibility candidates.

## Scope
- Use the 10 high runnable-feasibility candidates from `06-f2-readiness-summary.md`.
- Assign each candidate to one or more experiment-foundation candidate families:
  - `dataset`
  - `benchmark`
  - `baseline`
  - `evaluation_protocol`
  - `method_component`
  - `base_model`
- Record source refs, repo/license evidence, expected asset outputs, missing fields, risk, and required verification.

## Non-goals
- Do not create canonical experiment-foundation assets in this task.
- Do not register RunRecipe locks, materialization specs, execution jobs, experiment results, or evidence candidates.
- Do not import more literature unless F3 reveals a narrow missing dependency.
- Do not put raw datasets, repository clones, traces, checkpoints, logs, or full corpus snapshots in repo.

## Acceptance Criteria
- [x] F3 promotion matrix exists with all 10 high-runnable candidates.
- [x] Each row has candidate family, source refs, expected asset output, missing fields, risk, and next verification action.
- [x] `LIT-0204` RAGPerf has a concrete candidate-payload requirement split for benchmark, evaluation protocol, and dataset candidates.
- [x] `LIT-0204` RAGPerf S0/S1 preflight is recorded with S0 passed and S1 blocked before execution.
- [x] Auto-promotion is explicitly blocked unless source/provenance, duplicate, completeness, policy, risk, and confidence gates are satisfied.
- [x] Governance sync/lint passes.

## Boundaries
- `literature` owns metadata, source provenance, and readiness evidence.
- `experiment-foundation` owns candidate review/promotion gates and canonical reusable assets.
- `PaperImplementation` will consume promoted refs after a concrete research argument is selected.
