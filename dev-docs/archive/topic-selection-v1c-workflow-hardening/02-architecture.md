# Architecture

## Boundary
v1c consumes frozen v1b draft package handoff and produces promotion/bridge authority plus v1c downstream feedback/recheck projections. T-108 P0 scope stops at v1c-owned handoff and loopback artifacts; PaperImplementation bootstrap, ImplementationProject creation, WorkOrder, experiment, writing, and downstream intake consumption are outside the acceptance boundary.

Existing PaperProject/PaperImplementation intake routes may be used as optional compatibility smoke after v1c node acceptance, but they are not proof that T-108's WorkflowHarness, node orchestration, or Codex/provider landing is complete.

## Final Chain
The accepted v1c chain is:

`N1 create-promotion-input-snapshot -> N2 generate-promotion-support -> N3 run-promotion-gate -> N4 record-human-promotion-decision -> N5 create-paper-project-bridge`

`N6 record-downstream-feedback/recheck` is a record-only downstream ingress after N5. It may create typed recheck work and loopback hints, but it does not automatically re-enter N1-N5 or mutate historical N1-N5 authority artifacts.

## Canonical Orchestration Surface
The harness consumes only `TopicSelectionV1cHarnessNodeResult` from the v1c harness adapter:
- `routing_outcome`;
- `automation`;
- authority and diagnostic refs;
- required actions and loopback hints;
- source refs and snapshot hashes;
- provider involvement metadata.

Rich service dispositions, semantic-layer details, and compatibility wrapper responses are domain metadata. They may be persisted for diagnosis and harness tuning, but they are not a second orchestration path.

## Workflow Standard Inherited From v1a
- WorkflowHarness must be able to execute every node from frozen inputs.
- Node orchestration must be robust enough for automation and must not require script-owned route choreography.
- Deterministic gates must own promotion eligibility, bridge eligibility, and stale-input blocking.
- Any Codex/provider semantic review is advisory and non-authority, with explicit model profile, model option, parameters, prompt packet, output contract, and deterministic admission.
- Promotion authority remains human/delegated with auditable confirmation.
- Replay hashes must include frozen package refs, gate refs, decision refs, bridge refs, and execution specs for any semantic-review slot.

## Expected v1c Node Categories
| Node Area | Initial Category | Notes |
| --- | --- | --- |
| Promotion input snapshot | deterministic | Freeze v1b package and reject drift. |
| Promotion support/dossier | deterministic with optional bounded advisory LLM | N2 writes support artifacts only; review cannot bypass blockers. |
| Promotion gate check | deterministic | N3 owns `ArgumentReadinessMiniCheck`, readiness routing, and typed stop/park outcomes. |
| Human promotion decision | human/delegated authority | Codex may help draft auditable condition text only under policy. |
| Promotion commitment profile | deterministic projection | Derived from decision and gate constraints. |
| PaperProjectBridge | deterministic authority | Idempotent; no PaperProject creation side effect. |
| Downstream feedback/recheck | deterministic append-only | Emits typed loopback/recheck projections without mutating v1c history. |

## Multi-Agent Debate Default
v1c must not use open-ended debate or debate over promotion authority. The only accepted debate lane is N2 bounded micro-debate for advisory support generation. It uses fixed four-call orchestration and the same structured N2 output contract; N3 deterministic gate admission remains authoritative.

## Key Risks
- Allowing model-like output to own promotion or bridge authority.
- Treating downstream PaperProject/PaperImplementation intake as a T-108 P0 acceptance target.
- Treating downstream feedback as mutable correction of historical decisions instead of append-only recheck signal.
- Re-reading mutable v1b state instead of frozen package handoff.
- Duplicate current bridge creation or stale bridge reuse.
