# T-143 Implementation Notes

## Status

- Current status: `done`
- Last updated: 2026-08-24

## What changed

- Created the post-T-142 hardening task from an evidence-based architecture review.
- Made pre-owner failures return the already-declared `owner_resolution` semantic blocker with nullable unresolved context/lineage.
- Added a bounded ValidationCycle owner-scope query to the repository interface, in-memory implementation, and Prisma implementation.
- Hardened deterministic coordinator recovery across project/id/lane/mode/model/budget/payload semantics and made retryable `failed_runtime` blocked runs resumable by the same command.
- Classified terminal failed and budget-exhausted runs as nonretryable by the owner-only handoff instead of promising an impossible retry.
- Enforced exactly one admitted selected planning step and exact runtime project/workflow/slot/final-ref/target/profile/hash ownership.
- Stopped confirmatory candidates before trace/cycle writes and discarded unresolved model-authored iteration-budget refs.
- Added exact board/binding/cycle trace target checks and deterministic cycle context/trace/gate recovery checks.
- Updated the shared schema, OpenAPI context, service/repository tests, and route integration coverage.

## Files/modules touched (high level)

- Shared Paper Implementation handoff contract and schema tests.
- Validation repository interface plus in-memory/Prisma implementations and tests.
- ValidationCycle handoff service and focused service tests.
- Paper Implementation route integration test and OpenAPI context.
- T-143 task governance/docs.

## Decisions & tradeoffs

- Decision: harden T-142 in place under a new task rather than reopen T-142 or add a second semantic endpoint.
  - Rationale: the product seam is correct; the defects are authority, recovery, and bounded-read edge cases.
  - Alternatives considered: remove unused blocker/stage variants or create a new continuation state entity. Both would weaken the advertised semantic contract or add unnecessary authority.
- Decision: keep the request owner-only and represent unresolved owner state with nullable response fields.
  - Rationale: `owner_resolution` and `owner_state` already existed in the contract, while requiring caller lineage would violate the product boundary.
  - Alternatives considered: keep returning 404/409 for every prerequisite or remove the unused stage. Both leave the semantic command unable to express its first incomplete stage.
- Decision: do not resolve a model-proposed `iteration_budget_ref` in T-143.
  - Rationale: no bounded persisted owner for that ref is available at this seam; null is safer than converting LLM text into technical authority.
- Decision: accept monotonic coordinator budget raises only when their persisted audit chain starts at the deterministic T-142 budget and ends at the current envelope.
  - Rationale: exact initial equality would reject a legitimate operator raise, while ignoring the budget would accept run-identity drift.

## Deviations from plan

- None.

## Known issues / follow-ups

- No implementation issue remains from the T-143 review scope.
- The task bundle remains under `dev-docs/active/` until explicit archival approval; this is a documentation lifecycle action, not unfinished implementation.
- A future ValidationCycle-to-experiment-specification continuation remains a separate product task and was not pulled into T-143.

## Pitfalls / dead ends (do not repeat)

- Keep the detailed log in `05-pitfalls.md` (append-only).
