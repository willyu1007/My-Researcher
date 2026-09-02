# Architecture

## Context and current state

`POST /literature/retrieve` already searches all active, evidence-ready embedding versions when neither `topic_id` nor `paper_id` is supplied. Topic-selection SearchPlans and SearchRuns remain bound to a literature resource snapshot, and consumable evidence refs outside that snapshot are rejected. The current Arena role-evidence service demonstrates global retrieval plus durable SearchRun recording, but returns hits outside the current EvidenceMap as unresolved literature refs rather than admitting them as new evidence.

Current Debate runtimes consume frozen evidence and expose no typed RetrievalRequest. The shared Debate core performs one fixed-order, append-only role walk and hashes one transcript; the existing `max_rounds` field only bounds a caller-supplied round index and does not link transcript or evidence-delta history. EvidenceMap content is created from one SearchRun lineage, while its freshness can be updated directly and the persisted schema has no predecessor/successor relationship.

These facts came from the T-148 real-flow review. T-148 retains the concrete presentation, local-gate, contract, policy, condition-mapping, and terminology defects. T-150 owns the evidence-convergence problems exposed by that review and the retrieval/Debate/loopback adjustments subsequently agreed with the user; it is not a free-standing redesign program.

## Settled design and boundaries

- The complete accessible indexed, evidence-ready managed library is the default retrieval candidate universe. A topic snapshot is provenance and prioritization context, not an implicit corpus whitelist.
- EvidenceMap is a result authority, not a live retrieval workspace. RetrievalRequests, SearchRuns, candidate evidence, and Debate rounds represent the process.
- RetrievalRequest count is not a convergence rule. Equivalent requests reuse durable results; execution remains subject to one standing time/cost/environment policy.
- Existing deterministic gates and strict-human checkpoints remain authoritative. Retrieval and Debate produce support and obligations, not Human decisions.
- Historical map content, checkpoint packets, and Human decisions are preserved. A material evidence change must create explicit successor lineage.
- The first implementation is limited to the research-question candidate Debate scenario. Linked rounds, strategy-level saturation, the single-pilot boundary, and F-001 placement were approved on 2026-09-03; detailed field shapes still require Phase 1 contract verification before implementation expands beyond that pilot.

## Interfaces and contracts

The current planning candidates are:

- `RetrievalRequest`: issue-bound search intent, normalized equivalence identity, corpus/index and freshness requirements, candidate queries, expected decision effect, and originating Debate-round identity.
- `EvidenceDelta`: admitted claim-level additions or changes, negative coverage/source-health/conflict changes, affected issue refs, and decision relevance. A new paper without a relevant evidence change is not automatically material.
- `DebateRound`: new frozen input plus parent transcript hash and evidence-delta hash. The prior round is never resumed in place.
- `EvidenceMap` successor transition: predecessor and successor refs, material delta ref, atomic head transition, and monotonic supersession metadata while predecessor content remains unchanged.
- `ResolutionRoute`: issue identity, owning stage, route kind, target, required delta, recheck gate, and execution/Human boundary. The pilot receives one such route; existing unrelated loopbacks are not migrated.

These shapes are the approved planning direction. Their exact fields become implementation authority only through Phase 1 contract verification, and they must reuse existing functional refs, SearchRun authority, hash utilities, and gate results rather than creating parallel stores.

## Migration and operation

The pilot is additive and dormant until its route is explicitly selected. Existing SearchPlans, SearchRuns, EvidenceMaps, Debate artifacts, and Human decisions remain readable. A rollback disables the pilot coordinator while retaining its durable support artifacts; it never deletes a map or decision.

Managed-library retrieval is the only corpus boundary in this task. A new external acquisition source, provider activation, environment change, destructive effect, or Human decision remains a separate authorization boundary. Safe starts or restarts of the same local backend do not require repeated authorization during one already authorized implementation/replay operation.
