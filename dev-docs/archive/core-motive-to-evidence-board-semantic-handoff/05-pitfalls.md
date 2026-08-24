# T-141 Pitfalls (do not repeat)

## Do-not-repeat summary

- Do not copy T-137's fixed SciFact binding semantics into a generic product service.
- Do not ask the caller or model to provide motive/assertion/evidence ids, hashes, locators, citations, stage, model, or writer fields.
- Do not create an `evidence_ready` board from gap-only, stale, blocked, weakly traceable, or incomplete assertion coverage.
- Do not introduce a second curation runtime/coordinator when `seed_initial_board_candidates` already exists.
- Do not start validation planning, Experiment Foundation, or PAI in T-141.
- Do not claim exact-once based only on a deterministic response; prove persisted owner recovery and concurrency behavior.

## Pitfall log

### 2026-08-23 - Initial next-step label skipped the actual board prerequisite

- Symptom: T-140 initially described its follow-up as validation planning.
- Context: implementation-readiness review after T-140.
- What we inspected: T-095 validation planning context gate, T-137 real canary history, current curation runtime, and Evidence Board writer.
- Why the label was wrong: validation planning rejects an admitted CoreMotive that lacks a current fresh, trace-complete Evidence Board; T-137 had encountered the same blocker and repaired it with fixed script coordination.
- Fix: scope T-141 to the generic CoreMotive-to-Evidence-Board seam and leave validation planning to T-142.
- Prevention: trace every downstream writer's domain gate before naming the next semantic stage.

### 2026-08-23 - Fixed canary script is not a generic source resolver

- Symptom: T-137's `ensureEvidenceBoard` appears to demonstrate board creation from literature evidence.
- Context: reuse analysis for T-141.
- Why direct reuse is unsafe: it hardcodes the SciFact research question, evidence roles, and interpretations; those values are scientific semantics, not infrastructure defaults.
- Fix: reuse only the generic curation runtime and deterministic board/trace writers; resolve source lineage from persisted owners and block when insufficient.
- Prevention: distinguish a real execution proof from an arbitrary-project product entrypoint.

### 2026-08-23 - Reviewed upstream evidence is not automatically a reviewed citation

- Symptom: the standard Topic Selection pipeline persists reviewed EvidenceUnits, while the public Trace Kernel command intentionally creates CitationCandidates in `candidate` state.
- Risk: either asking the caller to review a server-resolvable citation or silently treating an unreviewed candidate as reviewed would break the semantic handoff.
- Fix: add one internal exact-once projection restricted to current upstream `machine_checked`/`human_reviewed` EvidenceUnits; preserve the public command's behavior and reject semantic drift.
- Prevention: when joining two authority models, make the smallest explicit compatibility rule and pin its provenance and replay behavior.

### 2026-08-23 - Fast board replay must restore the full semantic projection

- Symptom: returning immediately from `current_board_version_id` avoided provider work but initially omitted source/citation/curation lineage present on the first response.
- Risk: callers would see different lineage after restart even though authority was unchanged.
- Fix: recover cited authority and reconstruct curation lineage from complete persisted board/binding traces before returning; perform zero authority writes and zero coordinator/provider work.
- Prevention: exact-once means stable observable owner projection as well as no duplicate writes.

### 2026-08-24 - Module-level singleflight crossed app-composition boundaries

- Symptom: two service instances using the same project id could share one module-level in-flight promise.
- Risk: tests, embedded app instances, or separately composed repository contexts in one process could receive another instance's response and skip their own owner reads.
- Fix: keep the singleflight map on each `PaperImplementationEvidenceBoardHandoffService` instance; durable repositories still arbitrate cross-instance races.
- Prevention: process-local optimization state must never outlive the service dependencies being coalesced.

### 2026-08-24 - Viable curation status did not imply sufficient assertion strength

- Symptom: a fresh, traceable candidate with `proposed_strength=weak` could pass the generic viable-candidate filter even when its assertion required `moderate` support.
- Risk: the service could write an `evidence_ready` board below the admitted assertion's scientific floor.
- Fix: compare candidate strength with the persisted assertion `minimum_support_level`; below-floor candidates become explicit coverage gaps and produce no board.
- Prevention: composition gates must enforce owner-specific scientific thresholds in addition to generic runtime admission status.
