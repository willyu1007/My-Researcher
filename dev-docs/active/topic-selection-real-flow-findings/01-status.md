# Status

## Goal
Make topic selection trustworthy in real use by closing the decision-presentation and contract gaps exposed by the 2026-09-01 end-to-end rehearsal, while preserving the strict-human authority boundary.

## Progress
- State: in-progress
- Current phase: Replanning the evidence-convergence architecture after the completed real-flow review
- Next step: Confirm the external-discovery fallback and the exact convergence/invalidations contract, then approve the first full-library RetrievalRequest implementation slice.
- Blocker: The new route is intentionally not implementation-ready until those top-level choices and the first slice are approved. Existing provider activation remains separate. Unrelated T-149 implementation and shared governance changes remain foreign work and must not be modified or committed with T-148.

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
- [x] TSRF-13: A substantive N9 question refinement receives exactly one bounded delta Debate over the changed question/claim/metric/evaluation fields before N7 rematerialization; mechanical edits may bypass it, and a strict-human question loopback exposes this route instead of leaving N8 executable.
- [x] TSRF-14: An N10 package cannot become promotion-review-ready unless it has bounded title-shaped candidates, canonical non-duplicated non-goals, and normalized sentence punctuation; a recovery replay atomically supersedes the prior package and v1c bundle before N11 publication.
- [ ] TSRF-15: The regular promotion-review support path has an explicit bounded-Debate policy, and the runtime route, OpenAPI, operator runbook, support provenance, and deterministic gate agree with it.
- [ ] TSRF-16: Conditional-promotion support presents a decision-ready grouped mapping that covers every pass-with-risk finding and its early check; the human confirms the exact conditions, and any unmapped finding still fails closed without a partial authority write.
- [ ] TSRF-17: Every accessible indexed literature record is eligible for topic retrieval by default; topic snapshots and ranking signals preserve reproducibility and priority without silently becoming hard corpus whitelists.
- [ ] TSRF-18: Debate roles may issue typed `RetrievalRequest`s without a fixed count limit; equivalent requests are deduplicated or replayed from durable results, and every executed request records evidence delta and decision effect.
- [ ] TSRF-19: EvidenceMap is an immutable result snapshot that references the SearchRuns, Debate resolutions, included evidence, exclusions, conflicts, coverage state, and unresolved obligations that produced it; new convergence creates a successor rather than mutating history.
- [ ] TSRF-20: Every material gate failure exposes a supported loopback to the owning evidence or semantic boundary with an explicit target delta and recheck condition; a gate cannot strand the workflow with only a blocker or indefinitely carried warning.
- [ ] TSRF-21: Literature coverage, research-gap, research-question, value, and promotion Debates can request and consume shared retriever evidence, while purely mechanical changes explicitly reuse the frozen evidence state rather than inflating retrieval counts.
- [ ] TSRF-22: User-facing workflow surfaces and operating guidance use human-readable research-stage names instead of internal version labels, while technical diagnostics retain exact node and API identities.
