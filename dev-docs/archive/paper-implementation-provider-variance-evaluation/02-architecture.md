# Architecture

## Boundary
| Area | Rule |
|---|---|
| AI authority | T-099 `AgentWorkflowHarnessRun` remains proposal-only; T-105 does not write domain authority. |
| Evaluation owner | T-105 owns provider variance metrics and artifacts. |
| Provider profile | T-105 implements live-provider preflight only; live provider execution is future work and must not be default CI. |
| Input | Fixed `ImplementationInputSnapshot` plus workflow spec/prompt/model profile. |
| Output | Evaluation report, quality signals, and optional queue blockers; no motive/claim/dossier writes. |
| Secrets | Provider credentials stay in environment/config; never in artifacts. |
| Persistence | No new Prisma fields or DB authority. T-105 materializes through existing T-099 harness objects and returns the aggregate report from the route response. |

## Provider Mode Boundary
| Mode | T-105 status | Behavior | Closure meaning |
|---|---|---|---|
| `deterministic_fake` | Implemented | Runs deterministic fake-provider cases through the T-099 proposal-only harness. | Verifies contract, guardrail, queue, metric, and recommendation behavior without credentials. |
| `live_provider_preflight` | Implemented | Reports provider/profile readiness as `passed`, `skipped`, or `blocked`; enabled live profiles are blocked because execution is not part of T-105. | Verifies opt-in wiring and reporting semantics only. |
| `live_provider_execution` | Not implemented | Would call a real provider and measure real output variance. | Must be a future explicit task with credential, replay, observability, and queryability decisions. |

## Proposed Flow
```text
ImplementationInputSnapshot
  -> ProviderVarianceRun(profile, workflow_type, repeat_count)
  -> AgentWorkflowHarness proposal-only execution
  -> ProposalArtifact validation
  -> Variance aggregation
  -> Evaluation report / quality signals
```

## Implemented Interfaces
- Shared contract: `paper-implementation-provider-variance-contracts`.
- Harness vocabulary extension: `evaluation_report` proposal artifact kind and provider-variance quality signal types.
- Service: `PaperImplementationProviderVarianceEvaluationService`.
- REST route: `POST /paper-implementation/projects/:implementation_project_id/provider-variance-evaluations/run`.
- Default runner: deterministic fake-provider replay through T-099 `createAgentWorkflowHarnessRun`.
- Live-provider profile: preflight-only `passed/skipped/blocked` report; no live provider call or real output variance benchmark in T-105.

## Flow-Oriented Metrics
T-105 metrics are not a generic model benchmark. They answer whether provider output can safely and consistently advance the PaperImplementation automation workflow.

A metric belongs in the T-105 closure gate only if it is consumed by a concrete workflow decision: auto-advance, block, human-review escalation, provider/profile enablement, or follow-up tuning. Metrics without a consumer are diagnostics only.

| Metric | Consumer | Decision |
|---|---|---|
| `contract_validity_rate` | T-099 harness / EvaluationHarness | Accept as proposal artifact or reject as invalid provider output. |
| `handoff_readiness_rate` | Workflow scheduler / DecisionWorkQueue | Auto-advance to next node or create missing-input queue item. |
| `authority_violation_rate` | GateService / DecisionWorkQueue | Create critical blocker and prevent direct authority mutation. |
| `traceability_violation_rate` | TraceHarness / GateService | Block or repair outputs with missing lineage, invalid refs, or evidence misuse. |
| `claim_safety_violation_rate` | ClaimBoundaryGate / human review queue | Block overclaim/scope drift or require human review. |
| `workflow_stability_rate` | Workflow scheduler / PortfolioCoordinator | Allow repeated automation or downgrade provider/profile to human-reviewed mode. |
| `human_review_burden_rate` | Product/workflow ops | Decide whether automation is useful enough or needs tuning before use. |
| `provider_operability_rate` | Runtime/config owner | Enable, pause, or demote a provider/profile. |

Token, cost, latency, and model telemetry may be recorded as diagnostics. They are not first-class closure metrics except where they cause provider operability failure.

## Hard Invariants
- Provider output cannot bypass T-099 proposal artifact validation.
- Provider output cannot directly create or mutate motive, validation, WorkOrder, run evidence, trace, claim, dossier, or writing packet authority.
- Live provider profiles must be explicit, opt-in, and separately reported.
- Enabling a live-provider profile in T-105 must not silently become live execution; it remains a preflight result unless a future task adds an explicit execution mode.
- Deterministic fake-provider tests must be enough to close the task by default.
- Topic-selection provider canary infrastructure patterns may be reused, but topic-selection business semantics, node policies, ref allowlists, output shapes, and success criteria must not be reused.
- If implementation discovers current T-099 columnized fields cannot support a required gate/query, stop and record a blocker. Do not add JSON-only query fields in T-105.

## Allowed Outputs
| Output | Consumer | Purpose |
|---|---|---|
| Evaluation artifact / report | EvaluationHarness | Preserve provider variance evidence. |
| Quality signal | workflow ops / harness | Mark provider/profile or workflow risk. |
| Decision work queue blocker | GateService / human reviewer | Route invalid, unsafe, unstable, or untraceable output for review. |
| Provider/profile recommendation | Runtime/config owner | Suggest enable, pause, demote, or tune. |

## Forbidden Outputs
T-105 must not create or mutate:
- `CoreMotiveVersion`
- `ValidationCycle`
- `ResearchWorkOrder`
- `RunEvidenceUnit`
- `ClaimCandidate`
- `ImplementationDossier`
- `WritingEntryPacket`
- any other PaperImplementation authority object

## Reuse Boundary
| Reusable from topic-selection canaries | Not reusable |
|---|---|
| Opt-in provider profile | Topic-selection node semantics |
| Credential preflight | Topic-selection ref allowlists |
| Skipped / blocked / passed reporting | Topic-selection success criteria |
| Redacted artifact directory | Topic-selection provider output shape |
| Fixed input snapshot repeat runs | Topic-selection business routing rules |
| Provider/model/prompt metadata | Topic-selection-specific quality thresholds |
