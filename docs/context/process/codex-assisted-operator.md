# Codex-assisted research operator

This note fixes the current meaning of `codex_assisted` for API-first research operation and
separates the immediate rehearsal from a later product integration.

## Current runtime truth

- `codex_assisted` is a product execution mode, not a requirement to run inside the Codex desktop
  app. The backend accepts an externally produced, contract-shaped `codex_response` and records its
  workflow, attempt, hash, approval, and reuse provenance.
- The backend does not currently launch `codex exec`, resume a Codex session, or persist a Codex
  thread/session identifier. The active Codex client owns conversation history; persisted product
  owner state and artifacts remain the recovery authority.
- The current operator path is Codex calling the canonical local HTTP APIs directly. GUI actions,
  writing-center work, direct database access, and a parallel workflow state file are outside this
  path.

## Regular N6 question candidates

A fresh N5 selection now receives one bounded review: two Explorer responses, one Critic response,
and one Arbiter response over the same frozen N5 evidence. The Arbiter supplies
`synthesized_candidate_set`; the existing deterministic N6 gate still owns candidate admission.

- Through coordinator `advance`, use `node_inputs[N6].debate` with `kind: n6_divergent`,
  `generation_mode: initial_from_n5`, `execution_mode: codex_assisted` and `role_outputs`.
  A bare initial `draft_payload` halts before recording a candidate attempt.
- Through `/topic-selection/v1b/workflow-harness/nodes/{nodeId}/codex-assisted-invocations`,
  N6 accepts `{ request, role_outputs }`. The three keys are `n6_debate_explorer` (two items),
  `n6_debate_critic` (one) and `n6_debate_arbiter` (one). Each item carries `codex_response`
  with `output` and `operator_label`; `output.role_slot` matches its key and
  `output.schema_version` is `TopicSelectionV1bN6DivergentDebateRoleOutput@v1`.
- Reuse the exact attempt, frozen input, execution settings and role responses for replay.
  A completed receipt retains all four role audits, the transcript and the gate-facing draft;
  changed input under that attempt conflicts. Correct a blocked review before retrying.

The four role audits and existing draft-bridge audit are non-provider work; they do not claim
retrieval or provider calls. Provider Debate remains dormant. N7 still stops at the question Human
checkpoint, and role responses cannot author a Human decision. Regeneration/escalation and
refinement delta retain their existing recovery contracts. Low-level acceptance/test draft fixtures
and historical harness replay remain available; new initial product drafts require a Debate receipt.

## Current rehearsal

The first small real-project rehearsal uses one fresh lineage and the maintained SciFact assets.
Historical owner records are precedent only.

```text
profile: scifact-retrieval-depth
intent: compare retrieval top-k 10 with top-k 5 under the frozen SciFact setup
metric: micro_recall_ppm
support: top-k 10 minus top-k 5 >= 10,000 ppm
contradiction: top-k 10 minus top-k 5 <= -10,000 ppm
otherwise: inconclusive
claim ceiling: fixed SciFact exact-token retrieval setup only
literature scope: ai-rag-finetuning-2022-2026
initial evidence basket: LIT-0328, LIT-0190, LIT-0252, LIT-0765
```

The route is:

```text
retrieval-ready literature snapshot
  -> v1a validated need
  -> v1b topic package
  -> v1c human-promoted topic and PaperProject bridge
  -> CoreMotive and Evidence Board
  -> ValidationCycle and WorkOrder
  -> fresh two-cell Run and local workflow simulation
  -> separately authorized provider execution, if requested
  -> scientific validation and bounded Claim/Dossier state
```

Codex may prepare structured semantic support. It must stop for v1a need adjudication, v1b
constraint and slice acceptance, v1c promotion, confirmatory review, every provider/cost action,
and destructive/control actions. The rehearsal stops before writing-center or prose-generation
work.

## Deferred product integration

A later product slice may replace the client-owned conversational boundary with a transport-neutral
Codex operator adapter. The preferred durable integration is Codex App Server or the Codex SDK,
with `codex exec` retained for bounded one-shot nodes rather than treated as the workflow owner.

The minimum correlation contract is:

```text
operator_run_id
codex_thread_id
codex_turn_id
title_card_id or paper_project_id
workflow_run_id
node_attempt_id
last_completed_node
pending_human_decision
selected_artifact_refs
updated_at
```

The adapter may start, resume, or fork Codex threads, but it must reconstruct research truth from
product owners and immutable artifacts. Codex conversation history is execution context, never a
second source of research authority. This adapter is deliberately outside the current rehearsal;
open a bounded implementation task only after the API-first flow has produced concrete recovery
and operability evidence.
