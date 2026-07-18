# 03 Implementation Notes

> D-16 supersession (2026-07-12): statements below that all terminal outcomes were ingested as RunEvidenceUnit remain accurate historical T-091 implementation decisions, but no longer define the productized target. Future acceptance uses eligible EvidenceCandidate→REU and exact failed/cancelled/incomplete execution→immutable Cycle closure snapshot/hash, with no dual-track fallback.

## 2026-05-20 - Parent Package Created
- Created `T-091 paper-implementation-full-landing` as the parent task package for paper implementation full landing.
- Recorded user-confirmed module decisions:
  - `论文管理` carries the paper implementation workflow.
  - `选题管理` and `实验基座` support the implementation workflow.
- Set package state to `planned`.
- No product code changes were made.

## 2026-05-20 - PaperProject / PaperImplementation Semantics
- Landed the first roadmap decision baseline:
  - `PaperProject` is the writing lifecycle / delivery container.
  - `PaperImplementation` is the research implementation operation lane under `论文管理`.
  - `PaperProject` consumes dossier/packet outputs; `PaperProject` does not decide claim readiness from loose evidence.
  - `PaperImplementation` owns motive validation, experiment work orders, result interpretation, claim trace, and implementation dossier readiness; `PaperImplementation` does not own paper version spine or release gates.
- Updated `roadmap.md` D1 status to `confirmed`.
- Added architecture guardrails for avoiding dual-track claim-readiness authority.

## 2026-05-20 - Implementation Intake Decision
- Landed D2 as confirmed.
- Decided not to rename existing `PaperProjectBridge` because the name is already embedded in shared contracts, backend routes/services, Prisma schema, OpenAPI/context docs, desktop UI, and historical task records.
- Confirmed the compatibility pattern:
  - keep `TopicSelectionPaperProjectBridgeHandoff` as the current topic-selection promotion handoff carrier;
  - add `ImplementationIntakeSnapshot` as the neutral `PaperImplementation` intake object;
  - bootstrap `ImplementationProject` from `ImplementationIntakeSnapshot`;
  - store `paper_project_bridge_id + bridge_payload_hash` and related upstream refs as immutable source lineage;
  - treat optional `target_paper_project_ref` as a link, not the implementation authority root.
- Finalized the landing rule: existing bridge surfaces stay stable; new implementation behavior must attach to `ImplementationIntakeSnapshot` / `ImplementationProject`, and any bridge touch in child tasks is compatibility maintenance only.

## 2026-05-20 - CoreMotive / Retired Control Plane Decision
- Landed D3 as confirmed.
- Decided `CoreMotiveVersion` is a first-class `PaperImplementation` object.
- Superseded on 2026-06-01 by T-113: the former control plane is retired historical material only, not a migration input, wrapper, adapter, or compatibility authority.
- Future writing readiness must be decided by `ImplementationDossierReadinessGate`.

## 2026-05-20 - Dossier / Writing Packet Decision
- Landed D4 as confirmed.
- Decided `ImplementationDossier` is the full authoritative pre-writing research material package owned by `PaperImplementation`.
- Decided `WritingEntryPacket` is a downstream projection from a specific dossier version, not an independent writing-readiness authority.
- Required future packet projections to carry source dossier id/version/hash, dossier readiness gate result, trace manifest ref, and projection policy/version metadata.
- `WritingEntryPacket` is defined directly as a projection from `ImplementationDossier`, with no retired packet compatibility source.

## 2026-05-20 - WorkOrder / Experiment Foundation Decision
- Landed D5 as confirmed.
- Decided `ResearchWorkOrder` is the `PaperImplementation` command/governance envelope for every implementation experiment.
- Decided `experiment-foundation` owns reusable assets, locked recipes, materialized task specs, external jobs, structured results, validation reports, facts, and evidence candidates.
- Required `ResearchWorkOrder` to store experiment-foundation refs/hashes rather than copying or owning `RunRecipe`, `TrainingTaskSpec`, `ExternalTrainingJob`, or `ExperimentResult`.
- Required all run outcomes, including failed/crashed/cancelled/aborted/inconclusive/negative runs, to be ingested as `RunEvidenceUnit`.
- Confirmed `EvidenceCandidate` is not final claim evidence until `PaperImplementation` creates `RunEvidenceUnit`, result interpretation, and claim trace.

## 2026-05-20 - Trace Kernel Decision
- Landed D6 as confirmed.
- Decided `TraceManifest` is mandatory for all writing-affecting `PaperImplementation` objects.
- Required trace lineage to stay separated into literature, experiment, artifact, decision, and internal interpretation categories.
- Required every claim entering `ImplementationDossier` to have a `ClaimTracePacket`.
- Required `CitationCandidate` to come only from citable literature evidence with valid source locator refs.
- Confirmed LLM memo, rationale, board summary, human discussion note, and result interpretation are non-citable internal interpretation artifacts and must not become evidence/citation authority.
- Required trace completeness to be checked before `ImplementationDossierReadinessGate` can pass.

## 2026-05-20 - Agent Workflow Harness Decision
- Landed D7 as confirmed.
- Decided paper implementation should reuse a domain-neutral agent runtime kernel extracted from topic-selection patterns.
- Decided `PaperImplementation` owns its own `ImplementationControlPlane`, `ImplementationInputSnapshot`, `PaperImplementationAgentWorkflowHarness`, gates, `TransitionAttempt`, and `StateWriter`.
- Confirmed reusable runtime semantics include execution mode, run mode, model profile registry, profile resolution, LLM gateway boundary, structured-output validation, invocation audit/provenance, mock/product isolation, artifact refs, and scenario evaluation.
- Prohibited paper-implementation child tasks from depending on topic-selection workflow harnesses, need-candidate adapters, context packets, or node contracts.
- Required implementation agent outputs to remain proposal artifacts until validated by gates and applied by `StateWriter`.
- Required experiment-related agent outputs to stop at `ResearchWorkOrderDraft`; admitted work orders must go through `ResearchWorkOrderBroker` and `ResearchWorkOrderHarness`.
- Required future AI workflow child tasks to include scenario/evaluation coverage for schema failure, stale refs, missing trace, memo-as-evidence, forbidden state mutation, and mock/product isolation.

## 2026-05-20 - Human Confirmation Decision
- Landed D8 as confirmed.
- Decided human confirmation is an authorization record for high-risk transitions, not a direct state write.
- Required `HumanConfirmationRecord` to attach to `TransitionAttempt` and relevant `GateResult` refs.
- Required pending human confirmation to surface through `DecisionWorkQueueItem(queue_type=human_review)`.
- Confirmed `StateWriter` remains the only authority state writer after gates, trace, confirmation, and accepted-risk checks pass.
- Confirmed human confirmation cannot be inferred from provider output, Codex-assisted output, mock output, cached output, LLM memo, or generic operator notes.
- Defined confirmation levels: `agent-actionable`, `policy-confirmed`, `human-reviewed`, and `human-confirmed`.
- Required human-confirmed treatment for primary motive merge/split/demote/abandon, scope broadening, route changes beyond upstream topic boundary, expensive probe/experiment cycles, strong claim acceptance, and writing-ready dossier/export authorization.
- Confirmed draft/internal dossier assembly does not require human confirmation; writing-ready status and export must obey confirmation policy.

## 2026-05-20 - Desktop Workbench Decision
- Landed D9 as confirmed at coarse UI level.
- Decided `PaperImplementationWorkbench` lives under the user-facing `论文管理` area as an implementation decision/action surface.
- Confirmed the workbench is not a writing editor, experiment console, or authority state writer.
- Required a queue-first shape around `DecisionWorkQueueItem` for human review, trace repair, gate blockers, failed workflow, failed run review, stale evidence recheck, and accepted-risk expiry.
- Confirmed UI should consume backend read-models and emit backend commands rather than synthesize readiness or write authority state locally.
- Allowed topic-workbench staged workflow and queue-panel patterns as UI references, while prohibiting reuse of topic-selection business semantics.
- Deferred detailed UI fields, layout, and component structure until backend contracts and read-models land.

## 2026-05-20 - Child Task Granularity Decision
- Landed D10 as confirmed.
- Decided child tasks should be split by implementation flow and key decision nodes, not by UI screen alone and not as one broad full-landing package.
- Required every child task to declare `parent-task:T-091`, flow/decision node, primary owner, cross-module dependencies, input/output objects, authority writer, gates, trace requirements, command/read-model/API surface, verification plan, and residual risks.
- Confirmed the child package list:
  1. `paper-implementation-contracts-and-gap-map`
  2. `paper-implementation-intake-bootstrap`
  3. `paper-implementation-motive-evidence-board`
  4. `paper-implementation-validation-cycle-planning`
  5. `paper-implementation-workorder-experiment-bridge`
  6. `paper-implementation-trace-kernel`
  7. `paper-implementation-result-claim-dossier`
  8. `paper-implementation-ai-workflow-harness`
  9. `paper-implementation-desktop-workbench`
  10. `paper-implementation-contract-evaluation-suite`
- Confirmed trace remains a dedicated cross-cutting child and must be wired into every flow-node child as part of acceptance.
- Confirmed AI workflow and desktop workbench children must wait for backend gate/trace/command/read-model foundations.

## 2026-05-20 - Design-Doc Audit Supplement
- Re-reviewed the task package set against `paper_implementation_design_docs`.
- Strengthened child-task contracts for four implicit design-doc requirements:
  - `T-094` now owns portfolio governance objects: `CoreMotiveIdentity`, `CoreMotiveSet`, `CrossBoardReview`, `MotivePortfolioDecision`, and `PortfolioCoordinator` boundary.
  - `T-099` now owns project-level runtime governance contracts: `ImplementationHarness`, `ContextCompiler`, policy pack, runtime bindings, invariant checks, and proposal-only AI execution.
  - `T-093` now owns `ImplementationFeedbackEvent` as the implementation-to-topic-selection feedback boundary; `T-095`, `T-096`, and `T-098` define trigger points.
  - `T-092` now owns the minimum columnized-field/queryability matrix; data-bearing children and `T-101` must verify gate/queue/trace fields are not JSON-only.
- Updated `T-097` to make natural-language field roles and queryable trace refs explicit.
- Updated `T-100` to show portfolio, upstream feedback, and loop-budget review through backend read-models and commands only.
- Updated `T-101` to require design-doc component coverage, queryability tests, and blocked-path fixtures for portfolio/runtime/feedback/monitor gaps.

## 2026-05-20 - T-092 Closure
- Closed `T-092 paper-implementation-contracts-and-gap-map` as done.
- T-092 produced four planning artifacts:
  - `06-object-and-component-map.md`;
  - `07-current-state-gap-map.md`;
  - `08-queryability-field-matrix.md`;
  - `09-child-readiness-checklist.md`.
- Confirmed the current repo has reusable/adaptable surfaces for `PaperProjectBridge`, `experiment-foundation`, topic-selection runtime patterns, and desktop workbench patterns.
- Confirmed retired control-plane artifacts must not become PaperImplementation authority or compatibility wrappers.
- Confirmed PaperImplementation domain contracts are intentionally missing and assigned to T-093 through T-101.
- Confirmed next order: T-093, T-097, T-094, T-095, T-096, T-098, T-099, T-100, T-101.
- Clarified that the child package table is a coverage inventory; the implementation execution baseline starts T-093 then T-097 before T-094.
- Tightened T-092 verification so broad planning-doc scans are not treated as code-surface proof.

## Open Notes
- D1-D10 are confirmed and child task packages `T-092` through `T-101` have been created.
- Coverage review is recorded in `06-child-task-coverage-review.md`; after the design-doc audit supplement, no unowned functional gap remains.
- Closed child tasks: `T-092`, `T-093`, `T-097`, `T-094`, `T-095`, `T-096`, `T-098`, `T-099`, `T-100`.
- T-101 is closed; the parent package is ready to close.

## 2026-05-21 - T-094 Closure
- Closed `T-094 paper-implementation-motive-evidence-board` as backend minimum closure.
- Landed shared contracts, Prisma persistence, repository/service layers, REST routes, and tests for motive identity, motive set, motive version, assertions, evidence boards, evidence bindings, cross-board reviews, portfolio decisions, and motive evolution decisions.
- Confirmed no T-094 authority state was added under retired control-plane artifacts.
- Confirmed T-095 entry conditions: use admitted, trace-complete motive versions and board outputs; do not schedule validation from drafts or display summaries alone.

## 2026-05-21 - T-095 Closure
- Closed `T-095 paper-implementation-validation-cycle-planning` as backend minimum closure.
- Landed validation-cycle planning contracts, persistence, repository/service layers, REST routes, and tests for validation cycles, route candidates, probes, experiment plan lights, loop-budget review items, and upstream feedback candidates.
- Confirmed T-096 entry conditions: consume admitted validation cycles and work-order-ready planning refs; do not execute experiments directly from validation planning.

## 2026-05-21 - T-096 Closure
- Closed `T-096 paper-implementation-workorder-experiment-bridge` as backend minimum closure.
- Landed `ResearchWorkOrder`, harness run, monitor intake, and `RunEvidenceUnit` contracts, persistence, repositories, service gates, REST routes, and tests.
- Confirmed experiment-foundation remains referenced by refs/hashes only; no experiment-foundation asset/result payload is copied as PaperImplementation authority.
- Confirmed monitor callbacks without `work_order_id` are untrusted and cannot create run evidence.
- Confirmed failed, cancelled, inconclusive, and negative trusted runs are retained as `RunEvidenceUnit`.
- Confirmed T-098 entry conditions: interpret `RunEvidenceUnit` plus validation/trace refs; do not read raw platform output or bypass result interpretation.

## 2026-05-21 - T-098 Closure
- Closed `T-098 paper-implementation-result-claim-dossier` as backend minimum closure.
- Landed result interpretation, claim candidate, dossier, writing-entry packet projection, and result-driven feedback contracts, persistence, repositories, service gates, REST routes, and tests.
- Confirmed T-099 entry conditions: consume read-model refs and trace-ready result/claim/dossier objects as proposal context only; do not admit authority state from AI output.

## 2026-05-21 - T-099 Closure
- Closed `T-099 paper-implementation-ai-workflow-harness` as backend minimum closure.
- Landed `ImplementationHarness`, `ImplementationInputSnapshot`, agent workflow harness run, proposal artifact, quality signal, gate result, transition attempt, and `DecisionWorkQueueItem` contracts, persistence, repositories, service gates, REST routes, and tests.
- Confirmed proposal-only AI workflow behavior: model output cannot mutate motive, validation, work-order, result, claim, dossier, writing, or topic-selection authority.
- Confirmed T-100 entry conditions: desktop workbench consumes backend proposal/queue/readiness read models and emits backend commands only.

## 2026-05-21 - T-100 Closure
- Closed `T-100 paper-implementation-desktop-workbench` as desktop minimum closure.
- Landed `PaperImplementationWorkbench` under `论文管理` with backend-backed project lookup, queue aggregation, queue detail, read-model tables, and command panels.
- Confirmed the UI does not synthesize readiness and does not write authority state locally; the UI emits only existing backend commands.
- Confirmed T-101 entry conditions: evaluation should cover UI command/read-model paths, authority bypass prevention, and screenshot/browser verification once the browser test harness is available.

## 2026-05-22 - T-101 And Parent Closure
- Closed `T-101 paper-implementation-contract-evaluation-suite`.
- Added repeatable evaluation evidence for D1-D10, frozen rules FR-01 through FR-12, design-doc runtime components, full-flow replay, blocked/adversarial fixtures, queryability, and UI command/read-model boundaries.
- Confirmed no unowned high-risk gap remains for V1 paper implementation landing.
- T-091 parent package is closed with all child tasks done.

## 2026-05-22 - Final Cleanup And Commit Review
- Rechecked the full PaperImplementation task package set and confirmed the flow remains coherent from intake bootstrap through trace, motive, validation, work order, dossier, AI harness, desktop workbench, and final evaluation.
- Rechecked code boundaries for double-track risk: no PaperImplementation product path reintroduces a retired control-plane authority or treats `PaperProjectBridge` as the implementation aggregate root.
- T-101 quality repair is included in the parent closure evidence: failed-run evidence is modeled as a negative-result claim in the final replay, missing trace and confirmation bypass are blocked directly, and route-level command/read-model smoke is included.
