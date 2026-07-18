# 01 Plan

## Phases
1. [x] Review `RunEvidenceUnit` and trace outputs from T-096/T-097.
2. [x] Define `ResultInterpretationPacket`.
3. [x] Define `ClaimCandidate`, `ClaimBoundaryGate`, and `ClaimTracePacket` usage.
4. [x] Define `ImplementationDossier`, readiness gate, and dossier statuses.
5. [x] Define upstream feedback triggers from claim ceiling, invalidated evidence, and unanswerable topic question.
6. [x] Define queryable readiness/lifecycle/trace fields required for gate, queue, and evaluation.
7. [x] Define `PaperImplementationWritingEntryPacket` projection contract.

## Review Before Next Flow
- Historical AI harness behavior can only propose interpretation/claim boundaries, not write readiness; claim/dossier authority writes remain in the result/claim/dossier service.
- Under T-132 D-17, Result Analysis also remains proposal-only. Result Analysis cannot directly materialize `ResultInterpretationPacket` or write the Cycle assessment/selected exit; T-098 receives only an exact closed Cycle plus the accepted proposal.
- Desktop can display dossier blockers and commands from read-models through columnized status, trace, gate, and count fields.
- Feedback events are emitted through T-093 `ImplementationFeedbackEvent`; T-098 does not mutate topic-selection authority.
- Downstream writing consumes only ready `ImplementationDossier` and derived `PaperImplementationWritingEntryPacket` projections.

## D-17 Productized Follow-up (docs-only; not implemented)
- Replace the mixed `failed_run_refs`/`inconclusive_run_refs` conclusion path: current-head execution failure comes from the D-16 watermark-bound closed-Cycle snapshot, while scientific inconclusive comes only from the authoritative Cycle assessment.
- Require packet input to bind the exact Cycle closure/assessment/current-effective snapshot and accepted Result Analysis proposal refs/hashes; open Cycle, proposal-only input, missing-head blocker, CAS identity drift or implicit non-head history fails closed.
- Accept non-head historical Run material only when the closed current revision explicitly declares `comparison_input_ref`; preserve the referenced Run as comparison/interpretation lineage without adding the Run to execution-accounting scope or restoring head membership.
- Preserve packet purpose as interpretation lineage: evidence roles, rationale, uncertainty, limitations and claim ceiling. Packet fields cannot change the Cycle disposition or selected exit.
- Keep packet linkage one-way to the immutable closed Cycle, then let Claim/Dossier/next-step consumers resolve that exact authority. No new conclusion aggregate or user action is introduced.

## Verification
- Contract/schema tests passed.
- Gate tests cover overclaim, missing failed runs, missing trace, strong-claim confirmation, non-ready packet projection, memo-as-evidence, queryable readiness refs, and feedback-event triggers.
- Future D-17 tests must cover open-Cycle/proposal-only rejection, watermark/Cycle/branch/head hash drift, stable no-head blocker propagation, mixed run-status rejection, non-head default exclusion, explicit comparison refs without scope promotion, packet conclusion mismatch and closed-Cycle-only claim/dossier consumption.
