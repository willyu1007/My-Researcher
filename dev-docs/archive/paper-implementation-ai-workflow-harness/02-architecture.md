# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | implementation read-model refs, `ImplementationInputSnapshot`, workflow registry |
| Output objects | `ImplementationHarness`, `ContextCompiler` output, harness run, validated proposal artifact, audit/provenance refs, `GateResult`, `TransitionAttempt` draft, `DecisionWorkQueueItem` candidates, quality signals |
| Authority writer | none for agent outputs; `StateWriter` invocation contract is defined but domain services apply state after gates |
| Gates | harness invariants, schema, reference, trace, natural-language field role, run-mode isolation, proposal-only output |
| Trace | prompt/input/output artifact refs and source refs; no hidden reasoning as business artifact |
| Handoff | T-100 displays proposals/queue items; T-101 evaluates replay/variance/adversarial behavior |

## Contract Review
- Runtime infrastructure is shared; implementation semantics are domain-owned.
- Agents can create work-order drafts but cannot admit or execute real work orders.
- Human confirmation cannot be satisfied by model output.
- `ImplementationHarness` enforces input snapshot, trace manifest, artifact refs, failed-run retention, exploratory/confirmatory separation, and memo-as-evidence prohibition.
- `ContextCompiler` must record included refs, excluded refs, freshness constraints, and evidence rules before any LLM workflow runs.
- Harness can emit quality signals and queue candidates, but it cannot abandon motives, promote claims, or mark dossier readiness.

## Implemented Backend Surface
- Shared contract: `paper-implementation-ai-workflow-harness-contracts`.
- Persistence: `PaperImplementationHarness`, `PaperImplementationInputSnapshot`, `PaperImplementationAgentWorkflowHarnessRun`, `PaperImplementationProposalArtifact`, `PaperImplementationQualitySignal`, `PaperImplementationGateResult`, `PaperImplementationTransitionAttempt`, and `PaperImplementationDecisionWorkQueueItem`.
- Service boundary: `PaperImplementationAiWorkflowHarnessService` validates active projects, harness invariants, input snapshots, run-mode isolation, spec alignment, trace-manifest completeness, memo-as-evidence, and forbidden direct authority mutation.
- REST surface:
  - `POST/GET /paper-implementation/projects/:implementation_project_id/implementation-harnesses`
  - `POST/GET /paper-implementation/projects/:implementation_project_id/implementation-input-snapshots`
  - `POST/GET /paper-implementation/projects/:implementation_project_id/agent-workflow-harness-runs`
  - `GET /paper-implementation/projects/:implementation_project_id/implementation-proposal-artifacts`
  - `GET /paper-implementation/projects/:implementation_project_id/decision-work-queue`
  - `POST /paper-implementation/projects/:implementation_project_id/decision-work-queue/:queue_item_id/resolve`

## Authority Boundary
- T-099 persists AI outputs only as proposal artifacts, quality signals, gate results, transition attempts, and queue items.
- T-099 does not admit motives, mutate validation cycles, create work orders, ingest experiment results, admit claims, write dossiers, or dispatch topic-selection feedback.
