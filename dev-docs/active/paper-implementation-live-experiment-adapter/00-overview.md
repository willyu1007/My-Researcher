# T-104 Paper Implementation Live Experiment Adapter

## Status
- State: done
- Task ID: `T-104`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Current focus: T-104 implementation closed; next infrastructure task is T-105.
- ID note: `T-103` is already assigned to `experiment-foundation-full-flow-validation-runner`; this PaperImplementation follow-up uses `T-104`.
- Semantic supersession (2026-07-12): T-132 D-16 replaces the historical “all terminal external outcomes finalize trusted REU” rule. Current target sends failed/cancelled/incomplete terminal facts to Cycle closure accounting and permits REU only for complete validation-passed EvidenceCandidate; T-104's historical tests remain audit-only for this boundary.
- Semantic supersession (2026-07-12, T-132 D-17; docs-only, not implemented): T-104 ends at exact Run/Attempt/validation facts and eligible REU gateway handoff. Exact terminal fact publication drives PI-owned idempotent whole-Cycle readiness evaluation; one job callback cannot trigger Result Analysis, assign a scientific disposition/selected exit or create `ResultInterpretationPacket`. Those steps are PI control-plane/closure/T-098 responsibilities.

## Goal
- Connect `ResearchWorkOrder` to the existing experiment-foundation execution surface so PaperImplementation can submit, sync, collect, and ingest real experiment jobs through the trusted WorkOrder path.
- Preserve `ResearchWorkOrder -> external job -> RunMonitorIntake -> eligible EvidenceCandidate -> RunEvidenceUnit` as the only trusted scientific-evidence ingress, alongside exact terminal Run/Attempt facts for whole-Cycle readiness and closure accounting. Scientific interpretation then follows `CycleReadyForInterpretation -> Result Analysis proposal -> ValidationCycle closure -> ResultInterpretationPacket` outside T-104.
- Convert only complete protocol-compliant validation-passed outcomes into target-specific, trace-ready `RunEvidenceUnit`; failed/cancelled/incomplete outcomes remain monitor/Attempt/Cycle closure facts.

## Non-goals
- Do not create a parallel experiment authority root inside PaperImplementation.
- Do not bypass `ResearchWorkOrder` or write trusted `RunEvidenceUnit` directly from experiment-foundation callbacks.
- Do not add live LLM/provider variance evaluation; that remains a separate follow-up.
- Do not make cloud credentials, external spend, or provider availability part of default CI.
- Do not change experiment-foundation canonical objects except through existing experiment-foundation services and contracts.

## Acceptance Criteria
- [x] A PaperImplementation adapter service submits admitted WorkOrders to experiment-foundation execution using refs/hashes from the WorkOrder.
- [x] Submission records a harness/external job link and remains idempotent for the same WorkOrder attempt.
- [x] Sync/collect paths map experiment-foundation status into `RunMonitorIntake` without bypassing monitor trust rules.
- [x] Final trusted evidence pre-allocates `run_evidence_unit_id` and target-specific trace manifest before `RunEvidenceUnit` creation.
- [x] Historical T-104 mapped failed/cancelled/succeeded external outcomes through monitor/evidence gates; D-16 supersedes failed/cancelled REU finalization for productized migration while preserving the historical completion fact.
- [x] Default verification uses deterministic in-memory execution/record fakes; real external/cloud checks are opt-in.
- [x] Tests prove no naked external job trust and no alternate claim/evidence path.
- Product-target follow-up (pending implementation): D-17 removes any direct `create_result_interpretation_packet` or caller-driven readiness handoff, lets the PI control plane re-evaluate whole-Cycle readiness automatically from published facts, and proves T-104 cannot assign/consume scientific disposition. Historical T-104 acceptance remains unchanged.

## Handoff
- Start with boundary review and existing experiment-foundation execution API inspection.
- Do not implement code until route/service ownership and trace lifecycle decisions in `roadmap.md` are confirmed.
