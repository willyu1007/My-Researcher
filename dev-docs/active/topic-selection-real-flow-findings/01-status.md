# Status

## Goal
Make topic selection trustworthy in real use by closing the decision-presentation and contract gaps exposed by the 2026-09-01 end-to-end rehearsal, while preserving the strict-human authority boundary.

## Progress
- State: in-progress
- Current phase: Phase 5 FIND-024 executable delta-Debate route planned and approved for implementation
- Next step: Begin the authorized TDD slice with a failing coordinator test proving that decision `research_checkpoint_decision_c7c82712-8b2e-4d91-a123-37de25ea84e2` exposes a delta-Debate recovery frontier and never N8, then implement the typed support route through N7 current-contract reuse.
- Blocker: None for the approved local implementation slice. N8 remains intentionally blocked until the new route passes focused checks and the real decision is recovered. Provider execution, a new strict-human decision, Phase 4 regular-N6 routing, and other Phase 5 owner routes remain outside authorization. Unrelated T-149 implementation and shared governance changes remain foreign work and must not be modified or committed with T-148.

## Done when
- [ ] TSRF-01: The human evidence-landscape view presents the working claim, mechanism, support, challenge, baseline, context, falsifiers, claim ceiling, and available decisions in decision-ready language rather than primarily exposing record IDs.
- [ ] TSRF-02: Human-visible risk and conflict summaries remain semantically consistent with the checkpoint packet; a material conflict cannot be rendered as “no open risks.”
- [ ] TSRF-03: The public EvidenceMap request contract documents the runtime-supported evidence-unit, locator, review-status, relationship, conflict, and digest fields and their enums.
- [ ] TSRF-04: A focused real-flow verification covers topic rejection and replacement, fresh lineage, paragraph-level evidence locators, strict-human checkpoint blocking, and idempotent decision recovery.
- [ ] TSRF-05: Operational and experiment-asset findings that are not topic-selection defects receive an explicit disposition and, when still material, a separately owned follow-up proposal.
- [ ] TSRF-06: Before an evidence-landscape checkpoint is eligible to advance, the workflow either covers directly overlapping recent work or visibly records the unresolved literature-freshness and near-duplicate risk for the human decision.
- [ ] TSRF-07: The real-flow record distinguishes retriever operations from provider calls and captures query intent, mode, hits/evidence delta, and decision effect at every literature-dependent convergence step; an ungrounded step cannot look equivalent to a retriever-backed step.
- [ ] TSRF-08: Evidence-landscape eligibility consumes required SearchPlan coverage outcomes; a required `missing` row cannot appear satisfied or advancement-ready without an explicit, human-visible accepted risk or research obligation.
- [ ] TSRF-09: The human research-question view presents the actual main question and its decision-relevant warnings, gaps, dependencies, and risks; an `answerable_with_risk` contract cannot be rendered as having no open risks.
- [ ] TSRF-10: N6 uses a bounded Debate as a regular candidate-convergence component rather than reserving Explorer/Critic/Arbiter review only for failure-triggered escalation, while preserving deterministic admission and replayable provenance.
- [x] TSRF-11: A non-advance N9 disposition such as `refine_question` exposes a supported, replay-safe recovery route to the owning upstream boundary instead of leaving the workflow stranded at a terminal decision with only an internal loopback ref.
- [ ] TSRF-12: N8 value assessments, material risk findings, and N9 dispositions are reflected in research status and the human stage view; a terminal `refine_question` with 25 material risk findings cannot still appear as “开放风险：暂无” with promotion as the next review.
- [ ] TSRF-13: A substantive N9 question refinement receives exactly one bounded delta Debate over the changed question/claim/metric/evaluation fields before N7 rematerialization; mechanical edits may bypass it, and a strict-human question loopback exposes this route instead of leaving N8 executable.
