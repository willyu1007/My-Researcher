# T-140 Architecture

## Context and current state

- T-138 persists an accepted intake snapshot whose working-copy payload contains the Topic problem, contribution, evaluation plan, claim ceiling, prohibited claims, conditions, accepted risks, and early-check obligations.
- CoreMotive draft and admission services already own motive identity/version/assertion/portfolio state.
- Trace Kernel already owns completeness and literature-lineage validation for `core_motive_version` targets.
- The existing Paper Implementation coordinator starts after a motive/version/assertion target exists; it is not a bootstrap surface.
- T-139 derives downstream stage from persisted owners and currently reports an explicit missing-bootstrap blocker.

## Delivered design

### Components

- Shared bootstrap contracts:
  - strict owner-root request;
  - semantic-only `CoreMotiveBootstrapProposal@v1`;
  - semantic continuation response.
- Proposal runtime:
  - one registered profile and immutable prompt;
  - existing gateway/provider abstraction;
  - existing persisted runtime artifact as the replay authority.
- Deterministic assembler:
  - derives ids and writer payload from owner semantics plus validated proposal;
  - enforces topic claim/obligation ceilings before writes.
- Application service:
  - fixed owner-state recovery sequence: proposal, motive draft, trace, admission, reread;
  - no workflow row or dynamic stage graph.
- Thin HTTP face:
  - `POST /paper-implementation/core-motive-handoffs`.

### Request contract

- `implementation_project_id`
  - assigned by: T-138/Paper Implementation bootstrap owner;
  - supplied by: LLM client;
  - consumed by: handoff service owner-state resolver.
- No other request field is allowed.

### Proposal contract

- The LLM assigns only scientific language needed by the existing motive contracts: motive statement/rationale, scope/falsification, bounded claim wording, and assertion semantics.
- The server supplies accepted Topic semantics and obligations in the prompt.
- The LLM cannot assign ids, refs, hashes, version/admission state, trace completeness, portfolio role, provider/model, or execution parameters.
- Invalid or constraint-weakening proposals become a blocker before any CoreMotive authority write.

### Response contract

- `status` and `semantic_stage`: created/resumed/blocked and the current CoreMotive bootstrap stage.
- `effects`: performed versus reused proposal/draft/trace/admission effects.
- `next_action`: first executable action after rereading owner state.
- `blocker`: explicit owner, code, message, and retryability when progress cannot continue.
- `semantic_context`: accepted Topic constraints plus admitted CoreMotive summary.
- `lineage`: technical refs returned for trace/debug only, never echoed as command input.
- `resume_policy`: repeat the same owner-root command; persisted completed effects are reused and provider calls are not rerun.

### Exact-once identity and recovery

- Stable key: canonical hash of `(implementation_project_id, intake_snapshot_hash, bootstrap_profile_version)`.
- Motive/version/assertion ids are deterministic derivatives of the key.
- Proposal recovery reads the existing persisted runtime artifact keyed to the stable bootstrap identity before invoking the gateway.
- CoreMotive draft recovery first reads deterministic ids/current set; unique/conflict results are reread and validated against the expected source proposal.
- Trace recovery uses one internal ensure operation keyed by the target CoreMotiveVersion and expected manifest semantics.
- Admission recovery accepts an already-admitted expected first primary as success; conflicting primary authority is a blocker, not an overwrite.
- Each request rereads owners after at most one effect boundary where an external/provider action can occur; completed effects are never blindly replayed.
- A process-local singleflight prevents duplicate first-call LLM work inside the local backend. Durable deterministic artifact ids, unique constraints, and conflict rereads converge all authority writes. A multi-process provider lease would require new persisted lease state and is intentionally outside this local-first task.

### Boundaries and dependency rules

- Allowed:
  - application service to Paper Implementation project/intake readers, proposal runtime, CoreMotive writer/reader, Trace Kernel, and admission owner;
  - proposal runtime to the existing LLM wrapper and runtime artifact repository.
- Forbidden:
  - direct Prisma writes from route/controller/application service;
  - coordinator, Experiment Foundation, PAI, evidence closure, Claim, or Dossier dependency;
  - caller/model-authored ids, hashes, refs, scientific authority state, or provider selection;
  - second workflow/continuation table.

## Data migration

- Migration: none; existing runtime, motive, trace, and admission tables are reused.
- Backward compatibility: additive profile/prompt/contracts/endpoint; existing routes and authority stay unchanged.
- Stop condition: if exact-once proposal/trace recovery cannot use existing persisted owners, report the invariant gap before introducing schema changes.

## Non-functional considerations

- Security: reuse local backend access policy; do not accept credentials or authorization payloads.
- Cost: at most one ordinary LLM proposal for a stable bootstrap key; no PAI or paid experiment.
- Observability: existing LLM telemetry must record requested profile and resolved provider/model; response effects expose performed/reused behavior.
- Robustness: deterministic keying plus owner reread, not request-memory or `.ai/.tmp`, is recovery authority.
- Performance: one proposal call only on first creation; replay is owner reads plus response projection.

## Open questions

- None for T-140. A future multi-process deployment must decide whether provider-call exact-once warrants a durable invocation lease; do not imply that process-local singleflight provides cross-process provider deduplication.
