# 02 Architecture

## Context and current state

- Topic Selection owns the active PaperProjectBridge, immutable bridge hash, working-copy research semantics, and idempotent PaperProject intake.
- Paper Implementation owns the idempotent ImplementationProject bootstrap and all later motive, validation, experiment, result, claim, and dossier authority.
- Both writer paths are already implemented and tested; the missing functional seam is their caller-side composition.
- ImplementationFeedbackEvent to downstream feedback to recheck/risk-memory is already connected and has real database evidence, so it is outside this task.

## Proposed design

### Components and modules

- Shared contract: extend the existing Paper Implementation intake contract family with one request and one continuation response.
- Application service: a thin PaperImplementationTopicHandoffService composes the existing Topic bridge/intake owner and Paper Implementation bootstrap owner.
- Controller/route: one POST /paper-implementation/topic-handoffs command delegates to the service.
- Existing repositories and services remain the only authority writers.

### Interfaces and contracts

- Request:
  - paper_project_bridge_id: required, assigned by Topic Selection, consumed by the handoff service.
- Response:
  - status: created when either downstream root was newly created, otherwise resumed.
  - semantic_context: verbatim bridge working-copy fields and obligations for the LLM consumer.
  - lineage: bridge, title-card, TopicPackage, PaperProject intake/project, ImplementationProject, and intake-snapshot refs or ids.
  - resume_policy: fixed semantic instruction to read persisted owner state and continue the first incomplete domain step.
- No request-side hash, PaperProject id, ImplementationProject id, model option, execution parameter, or scientific value.

### State and recovery

- The bridge is read first; its owner-issued hash and workspace are passed directly to both existing writers.
- PaperProject intake may complete before ImplementationProject bootstrap. That is accepted persisted progress, not a rollback condition.
- Repeating the command resumes from the existing intake and project; no task-local checkpoint or secondary status table is added.
- Existing stale, inactive, workspace, hash, and lineage gates remain authoritative and are not reimplemented.

### Boundaries and dependency rules

- Allowed dependencies:
  - handoff service to Topic bridge handoff/intake service;
  - handoff service to Paper Implementation intake bootstrap service;
  - response projection to returned owner records only.
- Forbidden dependencies:
  - direct repository or Prisma writes from the handoff service;
  - caller-authored hashes or synthetic project/scientific ids;
  - automatic coordinator-run, WorkOrder, PAI, ResultAnalysis, Claim, Dossier, or feedback dispatch;
  - generic navigation, stage graph, plugin, policy registry, or workflow authority.

## Data migration

- Migration steps: none.
- Backward compatibility: all current intake/bootstrap routes remain unchanged; the new route is a smaller composition face.
- Rollout: local backend command only; no capability or traffic cutover.

## Non-functional considerations

- Security/auth/permissions: reuse current local backend policy; add no auth or approval gate.
- Performance: one bridge read plus at most two idempotent writes.
- Observability: response status and existing owner errors are sufficient; no new telemetry system.
- LLM clarity: semantic context and technical lineage are separate response objects with fixed meanings.

## Open questions

- None for the minimum handoff.
- Stop condition: if implementation requires semantic search, multi-bridge selection policy, automatic downstream stage execution, or a new persistence model, exclude it and create a later explicit task.
