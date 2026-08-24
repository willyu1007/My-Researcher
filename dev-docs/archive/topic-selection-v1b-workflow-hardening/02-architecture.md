# Architecture

## Boundary
v1b consumes only frozen v1a outputs, primarily `V1bInputBundle` and its referenced authority objects. It must not re-read mutable v1a live state to reinterpret the need, evidence, or human confirmation.

v1b produces draft-topic authority and handoff objects, not promotion authority. Promotion remains owned by v1c.

## Workflow Standard Inherited From v1a
- Every node must be callable by WorkflowHarness without route-only assumptions.
- Every semantic/model-like output must pass deterministic gates before authority writes.
- Every model-like call uses an invocation slot:
  - `execution_mode`;
  - optional `model_option_id` only for `provider_llm`;
  - profile/model resolution through registry only.
- Codex output is non-authority until deterministic gates accept it.
- Provider failure blocks; no automatic fallback to Codex, mock, or cached output.
- Replay hashes must include frozen input refs, execution spec, profile/model option when applicable, and scenario id.

## Expected v1b Node Categories
| Node Area | Initial Category | Notes |
| --- | --- | --- |
| Intake snapshot | deterministic | Must freeze v1a handoff and reject drift. |
| Constraint profile | human/delegated deterministic | Human/Codex may help draft review text, but authority is explicit. |
| Intake readiness | deterministic gate | No LLM required. |
| Research-slice options | single-agent or Codex-assisted | Needs semantic breadth, but not multi-agent by default. |
| Slice selection | human/delegated | May use Codex for auditable recommendation, not authority bypass. |
| Topic-question candidates | single-agent or Codex-assisted | Strong semantic quality gate required. |
| Topic-question contract | deterministic materialization after selection | Contract fields must be stable and downstream consumable. |
| Value assessment | single-agent or Codex-assisted plus deterministic gate | Provider/Codex can reason, but gate owns disposition constraints. |
| Draft package / v1c handoff | deterministic | Must be replayable and idempotent. |

## Multi-Agent Debate Default
No v1b node is assumed to need debate at task creation. Debate may be introduced only if a node-level review proves that multiple independent perspectives materially improve outcome quality and deterministic gates can keep complexity bounded.

## Key Risks
- Reintroducing route-only happy-path tests instead of harness-callable nodes.
- Treating schema-valid topic questions as quality-valid.
- Allowing value assessment to drop residual risks or method coverage warnings from v1a.
- Mixing human, Codex, and provider authority semantics.
- Re-reading live upstream state instead of frozen handoff payloads.
