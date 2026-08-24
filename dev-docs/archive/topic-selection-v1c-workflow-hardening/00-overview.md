# T-108 Topic Selection v1c Workflow Hardening

## Status
- State: done
- Task ID: `T-108`
- Mapping: `M-001 > F-001 > R-009 > T-108`
- Depends on: `T-088 topic-selection-workflow-runtime-foundation`, `T-089 topic-selection-agent-workflow-review`, `T-107 topic-selection-v1b-workflow-hardening`
- Trigger: v1a normalization exposed the need to make terminal promotion and bridge nodes as explicit, replayable, and automation-safe as upstream evidence/need nodes.

## Goal
- Refine and harden v1c from v1b draft package handoff through promotion support, deterministic promotion gate, human promotion decision, bridge creation, and v1c downstream feedback/recheck.
- Make v1c terminal decisions robust enough for automation while preserving human authority and avoiding accidental downstream side effects.
- Normalize every v1c node under WorkflowHarness standards: frozen inputs, authority boundary, deterministic gates, warning/blocker propagation, replay/idempotency, and explicit handoffs.
- Clarify Codex/provider LLM landing for v1c advisory support only, including profile/model selection, parameters, prompt packet, agent-workflow boundary, artifact schema, and deterministic admission rules.

## Non-Goals
- Do not redesign v1b.
- Do not enter PaperImplementation bootstrap, ImplementationProject, WorkOrder, experiment, writing, or PaperImplementation harness scope.
- Do not make explicit PaperProject/PaperImplementation intake or consumption a P0 T-108 acceptance boundary; existing downstream intake routes may be used only as optional compatibility smoke after v1c nodes are accepted.
- Do not add desktop UI.
- Do not introduce open-ended debate or promotion-decision debate. The only accepted debate lane is bounded N2 advisory micro-debate under deterministic admission.
- Do not allow provider/Codex output to directly promote, bridge, or mutate downstream state.

## Acceptance Criteria
- [x] A v1c node inventory exists and matches repo code/contracts.
- [x] Every v1c node has a node policy covering frozen inputs, authority writes, Codex/provider allowance where applicable, blockers, validators, replay, and handoff semantics.
- [x] Promotion input snapshot, promotion support, deterministic gate, human promotion decision, bridge creation, and downstream feedback/recheck are harness-callable without script-owned route choreography.
- [x] Human/delegated promotion authority is explicit and cannot be replaced by model output.
- [x] PaperProjectBridge creation is idempotent, traceable, and protected from stale or non-promote inputs.
- [x] Downstream feedback/recheck produces typed loopback signals without mutating historical authority objects.
- [x] v1c tests cover happy path, non-promote paths, stale inputs, duplicate bridge guards, downstream feedback, replay/idempotency, and Codex/provider semantic-review canaries where applicable.

## Closure Notes
- T-108 P0 is closed at the v1c boundary: N1 promotion input snapshot through N6 downstream feedback/recheck. PaperImplementation and downstream intake consumption remain outside this task.
- The canonical orchestration surface is the harness adapter node result: `routing_outcome`, `automation`, refs, actions, loopback hints, and hashes. Rich domain dispositions and compatibility wrappers are metadata/compatibility surfaces, not a second harness path.
- Final chain policy is forward-only for N1 -> N2 -> N3 -> N4 -> N5. N6 is record-only downstream ingress after N5; any repair/recheck creates typed work for a later explicit attempt rather than automatically looping back.
