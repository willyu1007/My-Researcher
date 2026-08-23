# T-140 Implementation Notes

## Status

- Current status: `done`
- Last updated: 2026-08-23

## What changed

- Created the explicit T-140 requirements, roadmap, and task bundle after the user-approved implementation-readiness review.
- Added strict shared contracts for the owner-root command, semantic-only proposal, stages/effects/blocker/lineage, and resume policy.
- Registered `paper-implementation.core-motive-bootstrap.proposal.v1` and immutable prompt `paper-implementation-core-motive-bootstrap-proposal@1` on the existing LLM gateway.
- Persisted one admitted role artifact plus one admitted final proposal artifact in the existing Paper Implementation runtime authority. Final-artifact replay is checked before any LLM invocation.
- Added the fixed handoff application service: owner checks -> proposal -> deterministic draft -> complete trace -> first-primary admission -> owner reread. It stops before coordinator/validation planning.
- Hardened motive draft/admission and trace writes for unique-race/CAS recovery without introducing a new workflow or database schema.
- Added the REST route, OpenAPI/API index, Context checksums, and contract/service/route/concurrency/persisted-replay tests.

## Files/modules touched

- Shared contracts: `packages/shared/src/research-lifecycle/paper-implementation-*.ts` and schema tests.
- LLM SSOT/runtime registry: `.ai/llm-config/registry/{model_profiles,prompt_templates}.yaml` and `topic-selection-model-profile-registry-service.ts`.
- Proposal/composition: `paper-implementation-core-motive-bootstrap-proposal-service.ts` and `paper-implementation-core-motive-handoff-service.ts`.
- Exact-once seams: runtime admission read, trace `ensureTraceManifest`, in-memory/Prisma motive CAS, Prisma duplicate mapping, and acceptance-bridge workflow classification.
- HTTP composition: `app.ts`, Paper Implementation controller/routes, and route integration tests.
- Context/governance: OpenAPI-generated API indexes, Context registry, and the T-140 project/task records.

## Decisions and tradeoffs

- Decision: stop T-140 after first-primary CoreMotive admission.
  - Rationale: the existing coordinator requires an existing motive/version/assertion target; validation planning is a separate semantic transition.
  - Alternative rejected: create a synthetic bootstrap coordinator run.
- Decision: use a dedicated LLM proposal artifact followed by deterministic authority writers.
  - Rationale: T-138 semantics are necessary but insufficient for the rich CoreMotive contract, while the model must not own ids, refs, or admission.
  - Alternative rejected: direct shallow field copying or letting the model author the writer DTO.
- Decision: recover from stable identity and existing persisted owners.
  - Rationale: avoids a second workflow state while providing exact-once replay.
  - Alternative rejected: a task-local continuation/checkpoint table.
- Decision: persist a role proposal artifact before its final runtime artifact.
  - Rationale: the existing final-artifact contract requires admitted prior-role lineage; this also makes interruption after the LLM call recoverable without another provider call.
  - Alternative rejected: a standalone final artifact with no prior role ref/hash.
- Decision: use process-local singleflight only for the provider call and storage CAS for authority writes.
  - Rationale: the product is a local-first single backend process, while a durable distributed invocation lease would add schema and lifecycle machinery outside this task.
  - Alternative rejected: claim cross-process provider exact-once without a durable lease.

## Field assignment and consumption

| Field/group | Assigned by | Consumed by |
|---|---|---|
| request `implementation_project_id` | T-138 owner, supplied by LLM/client | handoff owner resolver only |
| accepted Topic semantics, risks, obligations, literature refs | persisted `ImplementationIntakeSnapshot` | proposal prompt and deterministic assembler |
| proposal motive/scope/falsification/route/assertion semantics | configured LLM under `CoreMotiveBootstrapProposal@v1` | proposal validator and deterministic CoreMotive draft writer |
| bootstrap key and runtime/motive/version/assertion/trace/gate ids | server deterministic hash/id derivation | runtime, motive, trace, and admission owners |
| claim ceiling, prohibited claims, evaluation scope | persisted Topic owner; server re-applies them | CoreMotive claim/scope authority |
| proposal refs/hashes, trace completeness, portfolio role, admission status | existing deterministic writers | downstream readers and T-139 owner-state resolver |
| response stage/effects/blocker/lineage/resume policy | handoff service after owner reread | LLM/client for the next semantic action; lineage is trace-only |

## Deviations from plan

- The persisted proposal uses an admitted role artifact plus an admitted final artifact, rather than one standalone final artifact, to satisfy the existing runtime lineage contract.
- Provider-call deduplication is process-local; durable cross-process exact-once was not claimed or added because it would require a lease owner/schema expansion.

## Known issues / follow-ups

- T-141 candidate: an owner-root validation-planning continuation after the admitted CoreMotive boundary. T-140 intentionally returns `continue_validation_planning` and creates no coordinator run.
- If deployment changes from one local backend process to multiple writers, assess a durable provider invocation lease as a separately governed task.

## Landing evidence

- Implementation commit: `40150423d56c4c5355a36683320622f0bbca8d2f` (`feat(paper-implementation): add motive handoff`).
- GitHub Actions run `32611209572` passed all Backend, Prisma drift, Desktop, and Governance jobs.

## Pitfalls / dead ends

- See `05-pitfalls.md`; the readiness-review blockers are captured there as do-not-repeat constraints.
