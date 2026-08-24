# v1b Current-State Mapping

Status: historical Phase 1 baseline. This file is retained as implementation history, not as the current live gap list. The accepted current state is recorded in `08-exit-gate-review.md`.

## Scope
- Phase: T-107 Phase 1 current-state mapping.
- Date: 2026-05-25.
- Constraint: read-only product-code review; no runtime or contract changes yet.

## Baseline Finding
v1b has substantial service-level implementation, route coverage, repository support, and quality tests. The main gap is not missing business authority objects. The gap is that v1b is still service/HTTP/replay oriented instead of normalized as `WorkflowHarness` node runners with explicit node policy, invocation provenance, stable blocked results, and replay/idempotency identity.

## Existing Implementation Surfaces
- Shared contracts:
  - `packages/shared/src/research-lifecycle/topic-selection-v1b-intake-contracts.ts`
  - `packages/shared/src/research-lifecycle/topic-selection-v1b-research-slice-contracts.ts`
  - `packages/shared/src/research-lifecycle/topic-selection-v1b-topic-question-contracts.ts`
  - `packages/shared/src/research-lifecycle/topic-selection-v1b-value-assessment-contracts.ts`
  - `packages/shared/src/research-lifecycle/topic-selection-v1b-topic-package-contracts.ts`
- Backend services:
  - `apps/backend/src/services/topic-selection-v1b-intake-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-research-slice-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-topic-question-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-value-assessment-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-topic-package-service.ts`
- Routes and controller:
  - `apps/backend/src/controllers/topic-selection-v1b-controller.ts`
  - `apps/backend/src/routes/topic-selection-v1b-routes.ts`
  - `apps/backend/src/routes/topic-selection-v1b-routes.integration.test.ts`
- Repositories:
  - in-memory and Prisma repositories exist for intake, research slice, topic question, value assessment, and topic package.
- Existing tests:
  - service-level negative and quality tests exist for intake, slice, topic question, value assessment, package, loopback, duplicate guards, and route smoke.
  - offline replay metrics exist for v1b, but replay is metric/diff oriented and intentionally does not drive production authority writes.

## Gap Matrix

| Node | Current implementation | Automation gap |
| --- | --- | --- |
| v1b input bundle intake | `createV1bIntakeSnapshot` freezes handoff and runs trace/currentness checks. | No `WorkflowHarness` runner or normalized success/blocked result. Live reads must be policy-limited to drift gates, not semantic repair. |
| research constraint profile | `createOrUpdateResearchConstraintProfile` records human-authored constraints. | Human/delegated authority semantics need node policy. No harness-level actor gate or replay hash. |
| intake readiness gate | `assessV1bIntakeReadiness` is deterministic and idempotent for same snapshot/profile version. | No harness runner, trace artifact shape, or blocked-result acceptance matrix. |
| research slice option generation | Calls `BackendLlmGateway` directly and validates option output. | Must use `TopicSelectionAgentExecutionSpec`, `AgentOrchestrator`, and profile registry. No invocation audit snapshot. |
| research slice selection | Deterministic selection writes `SliceSelectionDecision` and `ResearchSlice`; non-select outcomes create no slice. | Human/delegated authority needs stricter policy. No selected option hash or harness replay identity. |
| topic question candidate generation | Calls `BackendLlmGateway` directly with strong schema/domain/quality validators. | Must use invocation slot and profile registry. No invocation provenance or harness result shape. |
| topic question selection and contract materialization | Selection writes decision and materializes `TopicQuestionContract` deterministically after admission. | Needs node policy separating selection authority from deterministic contract materialization. Replay hash must include selected candidate/decision/contract payload. |
| value assessment | Calls `BackendLlmGateway` directly; has strong deterministic gates for refs, claims, answerability, scores, disposition, and risks. | Must use invocation slot/profile registry. Harness tests must prove residual risks/warnings are not silently dropped. |
| value disposition | Deterministic decision; non-advance outcomes create no package handoff. | Needs harness runner and replay identity for active/current decision and downstream loopback targets. |
| draft package creation | Deterministic narrative, trace/boundary/readiness checks, duplicate package guard, optional v1c bundle. | Needs harness runner and product acceptance. Duplicate policy is conflict-based, not normalized replay result. |
| v1c handoff publication | `publishV1cInputBundle` returns existing ready bundle. | Needs explicit terminal v1b node policy and handoff hash assertions. |

## Node 1 Locked Alignment
Node id: `topic-selection.v1b.create-intake-snapshot.v1`.

Node 1 remains deterministic. It must not perform new semantic understanding or semantic structure assignment.

Allowed:
- freeze/copy the v1a-to-v1b handoff;
- check existence/currentness/ref drift using upstream authority reads;
- derive trace status, blockers, warnings, and replay hashes.

Forbidden:
- reinterpret unmet need;
- re-score evidence;
- infer or overwrite constraints such as target community or claim ceiling;
- create ResearchSlice, TopicQuestion, ValueAssessment, package, or v1c promotion objects;
- call Codex, provider LLMs, mock LLMs, debate runtime, or `AgentOrchestrator`.

Open policy decision:
- Prefer stable reuse for same v1a bundle hash and same policy version, rather than append-only duplicate intake snapshots, unless a future audit requirement explicitly chooses append-only intake attempts.

## First Implementation Slices
1. Policy closure for all v1b nodes without runtime changes.
2. Deterministic harness runners for intake snapshot, constraint profile, and intake readiness.
3. First model-like harness runner for research-slice option generation using `AgentOrchestrator` and profile registry.
4. Harness acceptance for question/value gates, warning carry-forward, replay/idempotency, and non-advance package blocking.
