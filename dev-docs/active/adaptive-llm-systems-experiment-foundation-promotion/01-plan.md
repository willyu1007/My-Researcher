# 01 Plan

## Phase 1 - Task Package And Governance
- Status: completed.
- Create the T-118 task bundle.
- Map the task to `M-001 > F-001 > R-012`.
- Run governance sync/lint.

## Phase 2 - F3 Promotion Matrix
- Status: completed.
- Consume T-117 F2 readiness evidence.
- Build a 10-candidate promotion matrix.
- Assign candidate families and review status.
- Write:
  - `06-f3-promotion-matrix.md`.
  - `artifacts/f3-promotion-matrix.json`.

## Phase 3 - Candidate Payload Requirements
- Status: completed.
- For the top lane, define candidate payload fields needed by existing experiment-foundation contracts:
  - source traces.
  - duplicate check.
  - completeness check.
  - policy/license check.
  - risk assessment.
  - rule trace.
- Keep status at `manual_review_required` or `needs_info` until the gate is satisfied.
- Output:
  - `07-lit-0204-ragperf-candidate-payload.md`.
  - `artifacts/lit-0204-ragperf-candidate-payload.json`.

## Phase 4 - First Promotion Lane Decision
- Status: in-progress.
- Selected first lane: `LIT-0204` RAGPerf as the benchmark/protocol anchor for RAG-aware resource allocation experiments.
- Current priority:
  1. RAGPerf benchmark/protocol.
  2. RAGPulse workload trace.
  3. FlashRAG/RAGLAB/RAGChecker toolkit and evaluation protocol.
  4. Adaptive-RAG and RouteLLM adaptive policy baselines.
  5. BurstGPT/Vidur/LoongServe system substrate baselines.
- Remaining decision: choose whether the next action is S0/S1 smoke preflight or import-ready payload construction for the RAGPerf benchmark/evaluation-protocol candidates.

## Phase 5 - LIT-0204 S0/S1 Preflight
- Status: completed-with-blockers.
- S0 static protocol check passed:
  - source clone outside repo.
  - HEAD/license/source file verification.
  - requirements source inspection.
  - tiny config generation and YAML parse.
- S1 local LanceDB smoke is blocked before execution in the current environment:
  - no local `cmake`.
  - local Python is `3.12.6`, while README recommends Python `3.10`.
  - official entrypoint imports dependencies before argument handling.
  - text insert/query paths are coupled to CUDA/vLLM/generation.
- Output:
  - `08-lit-0204-ragperf-s0-s1-preflight.md`.
  - `artifacts/lit-0204-ragperf-s0-s1-preflight.json`.

## Acceptance Criteria
- [x] Matrix covers all 10 high runnable candidates from T-117.
- [x] Candidate statuses do not claim auto-promotion.
- [x] Each top candidate has concrete verification actions.
- [x] First lane has a candidate split, gate blockers, metric requirements, and smoke plan.
- [x] First lane has S0/S1 preflight evidence and a concrete S1 blocker list.
- [x] Repo artifacts remain lightweight.
