# 01 Plan

## Phases

1. [x] Confirm the missing seam and bound the supported scientific envelope.
2. [x] Add the strict shared owner-root command/status contract.
3. [x] Add the persisted owner-state reader and pure stage resolver.
4. [x] Add the thin continuation service with existing-coordinator recovery only.
5. [x] Wire controller, route, app composition, tests, and canonical API context.
6. [x] Complete full verification, land the implementation, confirm CI, and close T-139 as done.

## Implemented sequence

1. Validate the one caller-owned `implementation_project_id` field.
2. Rebuild a bounded projection from ImplementationProject, CoreMotive, coordinator, ValidationCycle, experiment lineage, provider Attempt, Result/validation, Closure/Packet, Claim, and Dossier owners.
3. Resolve the first incomplete semantic boundary through a fixed code-level decision ladder.
4. Return terminal `ready_for_writing` before considering any action.
5. If one eligible coordinator run already exists, advance it once, reread owner state, and report the performed lane.
6. Otherwise return the exact next action or blocker. Never create a new coordinator run or synthesize missing authority commands.
7. Enforce the current D-19 dependency counts and two unique executable cells before advertising the paid-execution boundary.
8. Keep real-provider execution behind its existing credential-and-cost-gated API.
9. Prove malformed input, bare-project replay, coordinator recovery, state ordering, supported-envelope checks, and real T-137 terminal replay.

## Phase acceptance

- Contract: one owner root and a stable semantic response, with no stage parameter bag.
- State resolution: the same persisted owner state resolves the same first incomplete boundary.
- Recovery: only an already-persisted coordinator run may be advanced; completed runs and authorities are reused.
- Authority: T-139 owns no domain repository write, transaction, provider intake, retry queue, or scientific value.
- Cost: the continuation contract has no credential or paid authorization payload and never starts PAI.
- Truthfulness: missing composition is returned as an explicit blocker rather than advertised as generic automation.

## Risks and mitigations

- A status surface could drift into a generic workflow engine.
  - Keep one pure ordered resolver and no persisted continuation state or dynamic graph.
- A bare T-138 project could be incorrectly advertised as auto-runnable.
  - Return `CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED`; track Topic semantics to CoreMotive as a separate authority-design task.
- Existing fixed T-137 behavior could be mistaken for general product composition.
  - Distinguish fixed-script real execution from reusable product services and expose uncomposed downstream boundaries.
- Paid work could be hidden behind “continue”.
  - Stop at `waiting_for_paid_execution_authorization`; do not accept credentials or call provider intake.
- Replay could duplicate authority or LLM/provider effects.
  - Read terminal owners first, resume only persisted coordinator runs, and validate real terminal replay with `performed=[]`.
