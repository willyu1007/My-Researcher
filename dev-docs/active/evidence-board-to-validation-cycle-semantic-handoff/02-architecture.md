# T-142 Architecture

## Context and current state

- T-141 owns `ImplementationProject -> eligible current EvidenceBoard` composition.
- The existing `validation-planning` coordinator owns the fixed four-slot runtime chain and candidate selection/admission records.
- T-095 `PaperImplementationValidationCyclePlanningService` is the sole ValidationCycle draft/admission writer.
- T-139 can advance an already-persisted coordinator, but deliberately cannot create one or materialize domain authority.
- T-137 created a fixed ValidationCycle directly from SciFact task semantics; those values are canary-specific and are not reusable product defaults.

## Proposed design

### Components

- Shared strict owner-root request and semantic response.
- Thin `PaperImplementationValidationCycleHandoffService`.
- Existing project/motive/trace/runtime/validation repositories as owner readers.
- Existing `validation-planning` coordinator as the only LLM workflow.
- Existing T-095 service as the only ValidationCycle writer/admission gate.
- Thin controller/REST command: `POST /paper-implementation/validation-cycle-handoffs`.

### Request contract

- `implementation_project_id`
  - assigned by: Paper Implementation bootstrap owner;
  - supplied by: caller/LLM;
  - consumed by: T-142 owner resolver.
- No downstream id, hash, profile, prompt, budget, stage, scientific observation, or confirmation field is accepted.

### Runtime ownership

- Server assigns coordinator id, fixed lane, existing profile/prompt versions, product/provider execution mode, budget envelope, input refs/hashes, source packets, and technical lineage.
- Existing route/cycle/feasibility model roles propose scientific planning semantics only.
- The coordinator selects and admits one candidate key under its existing deterministic policy.
- T-142 must not select a different candidate or consume a non-admitted artifact.

### Domain write

- Target the current EvidenceBoard and its admitted CoreMotiveVersion.
- Use the selected cycle proposal for question, assumptions, assertions, decision exits, information gain, criteria, budget, context refs, and cycle type.
- Server assigns deterministic cycle/input snapshot/trace/gate ids, policy/actor fields, proposal ref/hash, and a non-human initial trigger classification.
- Create draft, create complete trace, then admit through the existing service; reread on every immutable-id conflict.

### Exact-once recovery

- Deterministic CoordinatorRun identity binds the project, motive version, board, server-owned slot payloads, profiles, and source hashes.
- Existing coordinator run/steps/runtime artifacts are proposal recovery authority.
- Deterministic ValidationCycle identity binds the admitted validation-planning artifact hash plus selected candidate key.
- Existing ValidationCycle/trace rows are recovered and compared; no T-142 continuation table is added.
- Per-service singleflight only reduces local duplication; durable repositories/coordinator leases arbitrate cross-instance races.

### Response

- `status` and `semantic_stage`: created/resumed/waiting/blocked and first incomplete semantic stage.
- `effects`: performed versus reused coordinator/runtime/trace/cycle effects.
- `next_action`: repeat, resolve blocker/review, or continue experiment specification.
- `blocker`: owner/domain/provider source plus retryability, including a semantic `cycle_write` stop when T-095 admission rejects the proposal.
- `semantic_context`: admitted motive, board, selected planning proposal, and current cycle summary.
- `lineage`: server-owned refs for audit/debug, never command input.
- `resume_policy`: repeat the same owner-root command and reuse persisted effects.

## Boundaries and dependency rules

- Allowed: application service -> existing owner repositories, Trace Kernel, coordinator, runtime artifact reader, ValidationCycle service.
- Forbidden: direct Prisma from route/controller/service; provider SDK calls; new lane/profile/prompt; WorkOrder/EF/PAI/result/claim/dossier writers.
- No DB migration is planned; repository lookup/race behavior changes only.

## Non-functional considerations

- Security: no credentials or secrets in request, response, logs, or task docs.
- Cost: one bounded existing ordinary-LLM lane for a stable board; replay is provider-free.
- Performance: exact-id artifact and CitationCandidate recovery reads are bounded; the only project list used by T-142 resolves competing or reusable ValidationCycles for the current owner and is sorted explicitly by persisted recency.
- Observability: existing runtime artifacts and coordinator steps retain provider/model/profile/prompt/cost telemetry.
- Rollback: revert additive T-142 code; never delete persisted board, coordinator, trace, or cycle authority.
