# T-142 Plan

## Phases

1. [x] Harden the T-141 prerequisite read/recovery and Prisma race boundaries.
2. [x] Define the owner-root ValidationCycle handoff contract and deterministic identities.
3. [x] Compose current board context into the existing validation-planning coordinator.
4. [x] Consume the coordinator-selected admitted proposal through the existing ValidationCycle draft/trace/admission writers.
5. [x] Expose HTTP, recovery semantics, and the T-139 experiment-specification boundary.
6. [ ] Update Context/governance docs and run release gates.

## Detailed steps

1. Enforce fresh motive state and exact EvidenceUnit workspace/title-card/version ownership before T-141 reuse or provider work.
2. Add bounded CitationCandidate lookup and map Prisma board/cycle unique races to `VERSION_CONFLICT` for conflict reread.
3. Allow the response contract to represent a legal risk-only board with zero bindings.
4. Add strict T-142 request/response schemas with only `implementation_project_id` as caller input.
5. Resolve the one active admitted primary CoreMotiveVersion, current EvidenceBoard, assertions, bindings, and complete traces.
6. Build immutable source packets from persisted owner semantics; assign existing lane/profile/prompt/budget fields server-side.
7. Create or recover one deterministic `validation-planning` CoordinatorRun and advance it through the existing coordinator.
8. Stop truthfully on waiting review, budget exhaustion, provider/domain blocker, or missing admitted cycle proposal.
9. Read the validation-planning step's admitted artifact and `decision_record.selected_candidate_key`; reject drift or ambiguity.
10. Map only the selected proposal's scientific fields into a deterministic ValidationCycle draft request.
11. Create/recover the deterministic cycle trace and admit the proposed cycle through T-095; conflict-reread every writer boundary.
12. Prove replay, interruption, same-service concurrency, cross-service durable race handling, and zero downstream paid effects.

## Risks and mitigations

- Risk: persisting model output that was not selected/admitted by the coordinator.
  - Mitigation: require the exact step admission ref/hash and decision-record selected candidate key.
- Risk: leaving a completed runtime lane but a partially written ValidationCycle.
  - Mitigation: deterministic cycle/input/trace ids and owner reread after every conflict.
- Risk: accidentally treating feasibility proposals as executable experiment authority.
  - Mitigation: T-142 writes only ValidationCycle authority and stops before WorkOrder/EF.
- Risk: ordinary LLM retries create duplicate spend.
  - Mitigation: one deterministic CoordinatorRun plus persisted coordinator lease/recovery; replay never starts a second run for unchanged owners.
- Risk: validation admission requires a human confirmation for a broad/expensive plan.
  - Mitigation: do not attach or create ExperimentPlanLight in T-142; expose any existing coordinator human-review stop instead of auto-confirming.
