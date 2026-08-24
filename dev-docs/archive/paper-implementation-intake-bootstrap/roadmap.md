# Roadmap - Intake Bootstrap

## Decision
Create a neutral implementation intake layer from active topic-selection handoff output.

## Deliverables
- [x] `ImplementationIntakeSnapshot` contract.
- [x] `ImplementationProject` bootstrap command/service.
- [x] Stale/superseded upstream handling.
- [x] Bootstrap read model for downstream motive setup.
- [x] Append-only `ImplementationFeedbackEvent` with topic-selection downstream recheck bridge.
- [x] REST surface for bootstrap/read/feedback.

## Done When
- T-094 can create motive/evidence-board drafts from an admitted implementation project with immutable upstream lineage.

## Closure
- Done on 2026-05-20.
- Next recommended flow: T-094, consuming `handoff_to_motive` from the bootstrap response.
