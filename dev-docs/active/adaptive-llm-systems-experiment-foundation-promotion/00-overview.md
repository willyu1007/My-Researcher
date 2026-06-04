# 00 Overview

## Status
- State: in-progress
- Next step: decide whether `LIT-0204` RAGPerf S1 should proceed through a faithful Linux/Python3.10/CUDA/vLLM environment or through an experiment-foundation minimal adapter for CPU/retrieval smoke.

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
