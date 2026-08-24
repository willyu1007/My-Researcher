# 02 Architecture

## Context

- T-138 ends with an existing `ImplementationProject` and preserved Topic semantic context.
- `PaperImplementationRunCoordinatorService` can resume its own durable runs, but does not write scientific/domain authority and cannot bootstrap the first CoreMotive from Topic semantics.
- PI-to-EF relay, real-provider execution, scientific validation, evidence closure, Claim, and Dossier owners already exist.
- T-137 ran that full path with fixed SciFact semantics and task-local coordination; that proves reality, not generic composition.

## Components

- Shared contract: strict request and semantic status response in the Paper Implementation contract family.
- Owner-state reader: bounded reads of existing owner repositories/services into a non-persisted projection.
- Stage resolver: pure ordered decision ladder returning one status/stage/action/blocker and diagnostic lineage.
- Continuation service: reads state; optionally advances one already-persisted coordinator run; rereads and returns. It creates no new run or authority.
- REST surface: `POST /paper-implementation/scientific-continuations`.

## Interface ownership

| Field | Assigned by | Consumed by |
|---|---|---|
| `implementation_project_id` | Paper Implementation/T-138; supplied by caller | owner-state reader and existing coordinator |
| `status`, `semantic_stage` | pure stage resolver | LLM/caller control loop |
| `effects.performed` | continuation service after an actual persisted-run advance | caller audit/telemetry |
| `effects.reused` | stage resolver from owner records | caller recovery explanation |
| `effects.llm_lane_id` | existing coordinator run; reported only when advanced | caller audit/telemetry |
| `next_action` | stage resolver | LLM/caller; paid and human boundaries remain explicit |
| `blocker` | stage resolver from continuation/domain/provider facts | caller remediation and retry decision |
| `lineage` | server-resolved owner records | diagnostics/tracing only; never caller input |
| `resume_policy` | contract constant | caller repeats the same owner-root command |

## Decision order

1. Missing/inactive project → owner blocker.
2. Trace-complete `ready_for_writing` Dossier → zero-write terminal replay.
3. Existing nonterminal coordinator run → review/budget/progress status or one persisted-run advance.
4. Missing CoreMotive or ValidationCycle planning → explicit uncomposed blocker.
5. Missing/ambiguous experiment selection → human selection boundary.
6. Non-D-19 or non-two-cell revision → unsupported-envelope blocker.
7. Missing relay-materialized Run → retryable materialization boundary.
8. No real Attempt → explicit paid authorization boundary.
9. Active/incomplete Attempt set → provider wait or retry boundary.
10. Missing Result/validation → explicit deterministic-composition blocker.
11. Missing Closure/Packet → explicit ResultAnalysis/Closure-composition blocker.
12. Claim confirmation, blocked Dossier, or missing Claim/Dossier → existing owner boundary.

## Supported envelope

- Exactly 23 admitted asset dependencies with counts: Dataset 2, DataPolicy 2, MetricDefinition 17, Benchmark 1, EvaluationProtocol 1.
- Exactly two unique executable WorkOrder cells.
- The check reads the exact admitted revision bundle; no caller assertion is trusted.

## Boundaries

- Allowed: read existing owner repositories; call `advance` once for an already-persisted coordinator run.
- Forbidden: direct Prisma/business writes, new coordinator creation, continuation persistence, dynamic stage graph, automatic scientific selection, caller-authored downstream ids/hashes/values, credentials, or paid provider intake.
- Migration: none.
- Backout: remove the additive route/service/contract; no T-139-owned data requires cleanup.

## Follow-ups

- T-140 candidate: governed Topic/T-138 semantic context to first CoreMotive LLM/acceptance/admission lane.
- Separate work: compose deterministic Result/validation, ResultAnalysis/Closure, and Claim/Dossier transitions only after their exact server-owned inputs and authority boundaries are designed.
- Separate EF work: generalize experiment shapes and Literature-to-Experiment asset discovery/selection.
