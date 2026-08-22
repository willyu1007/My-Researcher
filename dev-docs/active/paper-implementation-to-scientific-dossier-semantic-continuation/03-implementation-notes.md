# 03 Implementation Notes

## 2026-08-22 — gap audit and decision

- Audited T-124/T-132/T-136/T-137/T-138 plus coordinator/runtime, Domain Gate, PI→EF relay, provider, Result/validation, Closure/Packet, Claim, and Dossier entrypoints.
- Confirmed the existing `motive` coordinator lane decomposes an already-existing CoreMotive; the lane cannot bootstrap the first CoreMotive from T-138 semantic context and explicitly has no motive authority writer.
- User approved the thin option: T-139 reports the bootstrap gap as a blocker; Topic-to-CoreMotive becomes a separately governed follow-up.
- Kept the current D-19 exact two-cell envelope. Generalizing the envelope would change scientific/domain semantics and is outside the T-139 composition seam.

## 2026-08-22 — implementation

- Added `PaperImplementationScientificContinuation@v1` request/response contracts and strict Fastify request schema.
- Added a pure stage resolver covering terminal replay, persisted coordinator recovery, selection ambiguity, D-19 support, paid/provider boundaries, human confirmation, and uncomposed downstream transitions.
- Added a bounded read-only owner-state reader over project, motive, coordinator, validation, experiment lineage/spine, scientific validation, closure, Packet, Claim, and Dossier owners.
- Added the continuation service. The service may call `advance` once for an existing run, then rereads owners; the service never calls coordinator creation, provider intake, or domain writers.
- Added controller/route/app wiring for `POST /paper-implementation/scientific-continuations`.
- Added shared contract, resolver, reader, service, and route integration coverage.
- Added the endpoint and full schemas to canonical OpenAPI; generated API indexes are refreshed during verification.
- Final diff review scoped Claim and Dossier selection to the current ValidationCycle's Packet, preventing an older completed Cycle from masking a newer active Cycle as terminal.

## Recovery and effects

- Terminal Dossier state wins before any coordinator action.
- Existing completed owners populate `effects.reused`; a coordinator lane appears in `performed` only when the current request actually advanced the persisted run.
- The response returns the exact WorkOrder revision id, not a logical caller-selected WorkOrder id.
- Repeating the request rereads owner authority and carries no T-139 idempotency row because T-139 itself owns no write.

## Real authority evidence

- Credential-free in-process replay used T-137 ImplementationProject `implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b`.
- Two identical requests returned `ready_for_writing`, stable terminal lineage, `performed=[]`, and `llm_lane_id=null`.
- The replay path invoked no provider, credential, PAI, LLM, or scientific authority writer.

## Known follow-ups

- T-140 candidate: Topic/T-138 semantics to admitted first CoreMotive.
- Deterministic Result/validation composition and semantic ResultAnalysis/Closure and Claim/Dossier composition remain explicit seams.
- Experiment envelope generalization and automatic Literature-to-EF asset discovery/selection remain separate work.
