# T-142 Implementation Notes

## Status

- Current status: `done`
- Last updated: 2026-08-24

## What changed

- Hardened T-141 recovery: fresh owner-state checks, exact EvidenceUnit identity, bounded CitationCandidate reads, recoverable Prisma unique races, and legal zero-binding board responses.
- Added `POST /paper-implementation/validation-cycle-handoffs` with a request containing only `implementation_project_id`.
- Added one application service that resolves persisted owners, composes the existing four-slot `validation-planning` coordinator, consumes only the admitted selected proposal, and delegates draft/admission to T-095.
- Added deterministic CoordinatorRun, input snapshot, ValidationCycle, trace, gate, and budget identities without a continuation table or workflow engine.
- Added semantic waiting/blocker/replay responses, including a `cycle_write` blocker for T-095 admission rejection.
- Added owner-drift, historical-cycle ordering, interruption, local/cross-instance concurrency, credential-free replay, contract, repository, and route tests.

## Decisions and tradeoffs

- Decision: reuse the full existing `validation-planning` lane instead of adding a three-slot lane or calling the cycle runtime directly.
  - Rationale: the cycle proposal contract requires admitted route architecture and skeptic artifacts; the fixed coordinator already owns that chain and its candidate-selection policy.
- Decision: persist only the selected admitted ValidationCycle in T-142.
  - Rationale: feasibility output remains planning proposal authority; WorkOrder/Experiment Foundation specification is the next explicit boundary.
- Decision: fold T-141 quality hardening into T-142 prerequisite work without changing T-141's completed governance state.
  - Rationale: the fixes are required for safe EvidenceBoard consumption and durable T-142 concurrency.
- Decision: select reusable completed cycles by explicit persisted recency.
  - Rationale: Prisma returns newest-first while the in-memory repository preserves insertion order; service-level sorting keeps recovery semantics identical.
- Decision: return a semantic blocker when T-095 rejects admission but keep integrity drift as an HTTP conflict.
  - Rationale: a scientific Domain Gate stop is a resumable product state, while owner/hash drift indicates corrupted or stale command authority.

## Field ownership and consumers

| Field | Assigned or supplied by | Consumer |
|---|---|---|
| Request `implementation_project_id` | Paper Implementation bootstrap assigns; caller supplies the existing owner id | T-142 owner resolver |
| `schema_version` | Shared T-142 contract constant | API client/LLM response parser |
| `status`, `semantic_stage` | T-142 derives from persisted coordinator/cycle state | LLM or product orchestrator |
| `effects.performed`, `effects.reused` | T-142 records actual writes versus owner-state reuse | LLM retry/recovery logic |
| `next_action` | T-142 maps the first incomplete semantic boundary | LLM or product orchestrator |
| `blocker` | Existing coordinator or T-095 supplies the cause; T-142 maps source and retryability | LLM/operator resolution path |
| `semantic_context` | Persisted motive, board, binding, and cycle authority | LLM planning context |
| `lineage` | Owner repositories, coordinator admission records, and deterministic server ids | Audit/debug consumers; never command authoring |
| `resume_policy` | Shared T-142 contract constant | Caller retry policy |

Server-owned lineage assignments are also explicit: owner repositories assign project/snapshot/motive/version/assertion/board/binding ids; the coordinator assigns admitted runtime-artifact and selected-candidate records; T-142 deterministically assigns CoordinatorRun/cycle/input/trace/gate/budget ids; Trace Kernel and T-095 consume those ids at their existing writer boundaries.

## Files/modules touched

- Shared Paper Implementation contracts and schema tests.
- T-142 handoff service and service tests.
- Paper Implementation app composition, controller, route, and route integration tests.
- Trace repository/kernel bounded CitationCandidate recovery.
- T-141 Evidence Board handoff owner/recovery validation and regression tests.
- Prisma motive/validation repository conflict mapping and tests.
- OpenAPI, generated API index, Context registry, and project governance records.

## Deviations from plan

- No real ordinary-LLM or PAI execution was needed for verification. Automated tests use the existing coordinator contract with deterministic fakes; credential-free reuse of persisted admitted authority is covered without provider calls.

## Known issues / follow-ups

- T-143 or a later explicit task may own ValidationCycle/feasibility proposal to experiment specification and WorkOrder admission.

## Pitfalls / dead ends

- Keep resolved issues in `05-pitfalls.md`.
