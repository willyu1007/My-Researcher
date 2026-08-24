# 02 Architecture

## Boundary Baseline
| Module | Owns | Does not own |
|---|---|---|
| `选题管理` | Topic package, promotion decision, bridge authority, upstream recheck | implementation experiment state |
| `论文管理` | user-facing carrier for paper implementation and paper lifecycle lanes | reusable experiment asset registry; final writing editor |
| `PaperImplementation` | research implementation operation lane: motive validation, experiment work orders, result interpretation, claim trace, dossier readiness | paper version spine, writing package delivery, release gate |
| `PaperProject` | writing lifecycle / delivery container: paper id, version spine, snapshots, writing package, artifact bundle, release/review gate | motive evolution, experiment interpretation, claim authority |
| `实验基座` | dataset/baseline/benchmark/recipe/job/result/evidence substrate | final claim authority |
| downstream writing lane | paper text drafting/editing/export | source evidence inference; claim readiness decisions |

## PaperProject vs PaperImplementation
| Dimension | `PaperProject` | `PaperImplementation` |
|---|---|---|
| Core question | 这篇论文作为交付物，生命周期走到哪里了？ | 这篇论文想写的研究内容，是否已经被实施、验证、解释，并形成可追踪 claim？ |
| Primary object domain | writing lifecycle / delivery | research implementation operation lane under `论文管理` |
| Core objects | `PaperProject`, version spine, snapshot, writing package, artifact bundle, release gate | `ImplementationProject`, `CoreMotiveVersion`, `ValidationCycle`, `ResearchWorkOrder`, `ClaimTracePacket`, `ImplementationDossier` |
| Authority over claim readiness | consumes ready claims through dossier/packet | owns claim boundary, trace, and dossier readiness |
| Relationship to editor | provides lifecycle/package boundary for writing surfaces | provides evidence-qualified material for writing surfaces |
| Must not do | infer claims from loose evidence, runs, or LLM memo | manage paper delivery version spine or release gate |

Product organization may place both lanes under `论文管理`, but their authority models must remain separate.

## Target Control Loop
```text
PromotionDecision / PaperProjectBridge
  -> ImplementationIntakeSnapshot
  -> ImplementationProject / implementation workspace
  -> CoreMotiveVersion + MotiveAssertion
  -> MotiveEvidenceBoardVersion
  -> ValidationCycle
  -> TechnicalRouteCandidate / FeasibilityProbe / ExperimentPlanLight
  -> ResearchWorkOrder
  -> exact Run/Attempt/result facts + eligible EvidenceCandidate
  -> PI Evidence Trust Gateway / RunEvidenceUnit
  -> whole-Cycle readiness
  -> one Result Analysis proposal, or no-evidence interpretation skip
  -> existing ValidationCycle closure assessment + accounting snapshot/hash + derived exit
  -> ResultInterpretationPacket
  -> ClaimCandidateLight
  -> ClaimTracePacket
  -> ImplementationDossier
  -> WritingEntryPacket / downstream writing lane
```

## Intake Boundary
`PaperProjectBridge` remains the current topic-selection v1c promotion handoff carrier. `PaperProjectBridge` is not renamed and is not treated as the semantic root of `PaperImplementation`.

```text
TopicSelectionPaperProjectBridgeHandoff
  -> ImplementationIntakeSnapshot
  -> ImplementationProject
```

Rules:
- `ImplementationIntakeSnapshot` is derived from an active `TopicSelectionPaperProjectBridgeHandoff`.
- `ImplementationProject` bootstraps from `ImplementationIntakeSnapshot`.
- `ImplementationProject` must store immutable upstream refs and hashes, including `paper_project_bridge_id`, `bridge_payload_hash`, `promotion_input_snapshot_hash`, `topic_package_id`, `package_version`, and `title_card_id`.
- `PaperProject` may be linked as `target_paper_project_ref` when present, but `PaperProject` is not the implementation authority root.
- Upstream bridge supersession or hash mismatch triggers intake refresh / upstream recheck, not silent state mutation.
- Existing `PaperProjectBridge` routes, DB model, shared contracts, and historical docs remain stable to avoid a broad breaking rename.

Naming and authority contract:

| Name | Boundary | Role | Authority level |
|---|---|---|---|
| `TopicSelectionPaperProjectBridgeHandoff` | `选题管理` / topic-selection v1c | Existing promotion handoff payload | Upstream handoff authority |
| `PaperProjectBridge` | `选题管理` compatibility surface | Existing persisted/API bridge naming | Compatibility and lineage only for implementation |
| `ImplementationIntakeSnapshot` | `PaperImplementation` | Neutral intake snapshot derived from active handoff | Bootstrap authority for `ImplementationProject` |
| `ImplementationProject` | `PaperImplementation` | Implementation aggregate / workspace | Implementation state authority |
| `target_paper_project_ref` | cross-boundary link | Optional link to delivery lifecycle container | Reference only |

Child task rule: implementation child tasks may read bridge lineage and hashes, but must hang new implementation behavior from `ImplementationIntakeSnapshot` or `ImplementationProject`.

## Retired Historical Boundary
The former research-argument control plane is retired. Current code, Prisma SSOT, LLM-readable context, active planning, and PaperImplementation runtime surfaces must not depend on the retired control plane as a wrapper, adapter, migration lane, or compatibility authority.

Allowed uses:
- archived historical documentation;
- negative guards that assert PaperImplementation evidence and UI paths do not use retired authority refs.

Disallowed uses:
- creating new `ResearchArgumentWorkspace` authority flows;
- using `ArgumentObjectGraph` as the source of truth for `CoreMotiveVersion`;
- deciding writing readiness through legacy `ReadyForWritingEntry`;
- adding planner/critic generation or desktop control surfaces under `research-argument`;
- writing back from legacy projections into `PaperImplementation` authority state.

## ImplementationDossier / WritingEntryPacket Boundary
`ImplementationDossier` is the authoritative pre-writing material package. The dossier contains the complete implementation state needed for writing: motive, assertions, evidence board, validation cycles, work orders, run evidence, result interpretation, claim candidates, claim trace packets, citation candidates, failed/negative paths, accepted risks, boundaries, and trace manifests.

`WritingEntryPacket` is a projection from a specific dossier version into a form that downstream writing/editor surfaces can consume. The packet exists for ergonomics, not authority.

| Object | Owner | Role | Authority |
|---|---|---|---|
| `ImplementationDossier` | `PaperImplementation` | Complete pre-writing research material package | authoritative writing-prep package |
| `ImplementationDossierReadinessGate` | `PaperImplementation` | Decides whether dossier material is writing-ready | only writing-ready gate |
| `WritingEntryPacket` | downstream projection | Summarizes selected dossier material for writing entry | non-authoritative projection |

Rules:
- A packet must point to its source dossier id, version/hash, readiness gate result, trace manifest, and projection policy version.
- A packet can never make material more ready than the source dossier.
- A packet can become stale; the dossier remains the authority.
- Writing surfaces may use packet summaries, but claim/citation/evidence authority must trace back to the dossier.
- Dossier export requires trace-complete claim packets; packet export alone is insufficient.

## ResearchWorkOrder / ExperimentFoundation Boundary
`ResearchWorkOrder` is the implementation-side governance envelope for running experiments. The WorkOrder answers why the work is being run, which motive/assertion/validation cycle the work serves, which policy bounds apply, and how outputs are ingested into implementation evidence.

`experiment-foundation` owns the experimental substrate. ExperimentFoundation answers which assets are selected, how a run is locked, how the run is materialized for a platform, how job lifecycle is tracked, and how structured result/fact/candidate records are produced.

| Object | Owner | Role | Must not own |
|---|---|---|---|
| `ResearchWorkOrder` | `PaperImplementation` | Command/governance envelope for implementation experiments | reusable asset metadata; platform execution payload; raw experiment result authority |
| `ResearchWorkOrderHarness` | `PaperImplementation` | Forces admission, trace, policy, and ingestion around experiment-foundation calls | low-level platform retries or adapter-private payloads |
| `RunRecipe` | `experiment-foundation` | Locked, deterministic, platform-neutral experiment plan | paper claim text; dossier readiness; adapter-private fields |
| `TrainingTaskSpec` | `experiment-foundation` | Normalized execution payload materialized from `RunRecipe` | implementation claim/evidence decisions |
| `ExternalTrainingJob` | `experiment-foundation` | External job lifecycle snapshot | claim readiness; motive state |
| `ExperimentResult` / `ResultValidationReport` | `experiment-foundation` | Structured result and protocol validation | final paper evidence acceptance |
| `EvidenceCandidate` | `experiment-foundation` | Candidate result that may support a later claim | final claim support or publication wording |
| `RunEvidenceUnit` | `PaperImplementation` | Gateway projection of a complete protocol-compliant validation-passed EvidenceCandidate; eligible evidence lineage only | failed/cancelled/incomplete execution, platform job lifecycle or scientific disposition |
| Result Analysis proposal | `PaperImplementation` runtime support | One exact-hash-bound proposed scientific disposition plus evidence roles, uncertainty, limitations and claim ceiling | Cycle assessment, selected exit or direct packet writer payload |
| ValidationCycle closure assessment + snapshot/hash | `PaperImplementation` | Sole nullable scientific-disposition/selected-exit authority plus embedded immutable exact Run/Attempt execution accounting; dossier scope authority and Sidecar source | scientific evidence minting, caller-authored exit, packet-before-closure or independently mutable Sidecar ledger |

Flow:

```text
ExperimentPlanLight
  -> ResearchWorkOrder
  -> ResearchWorkOrderHarness
  -> RunRecipe
  -> TrainingTaskSpec
  -> ExternalTrainingJob
  -> ExperimentResult / ResultValidationReport
  -> eligible EvidenceCandidate -> RunEvidenceUnit
  -> exact Run/Attempt/evidence facts -> CycleReadyForInterpretation
  -> eligible evidence: one Result Analysis proposal; no evidence/control-only: skip analysis
  -> existing ValidationCycle closure assessment + snapshot/hash + derived exit
  -> post-closure ResultInterpretationPacket
  -> ClaimTracePacket / ImplementationDossier
```

Rules:
- `ResearchWorkOrder` stores experiment-foundation refs and hashes, not copied payloads.
- `RunRecipe` remains claim-agnostic and platform-neutral.
- `EvidenceCandidate` is not sufficient for claim support until PaperImplementation ingests and interprets the candidate.
- Failed/cancelled/aborted/incomplete execution must be retained in the immutable Cycle closure snapshot and creates no RunEvidenceUnit. Results later assigned negative/inconclusive by Cycle closure remain on the same eligible-REU path, but that disposition is neither execution nor REU state.
- Dossier consumes explicit closed-Cycle snapshot refs/hashes; project-wide failed-like REU scans and Sidecar accounting authority are forbidden by D-16.
- T-132 D-17 is the canonical executable-protocol/conclusion-authority decision. PI control plane derives whole-Cycle readiness, Result Analysis proposes only, and the existing Cycle closure action alone writes nullable `positive | negative | inconclusive`, closure kind and server-derived selected exit. No caller, REU/run status, runtime scenario, Domain Gate or packet may become a second conclusion writer.
- `ResultInterpretationPacket`, Claim, Dossier, retrieval/motive projections and next-step drafts require the exact closed Cycle. A no-evidence/control-only closure has null scientific disposition and does not fabricate `inconclusive` or a scientific packet.
- The D-17 contract is documentation-only and not implemented in the landed T-095/T-098/T-114/T-104 surfaces; direct packet materialization and caller-authored assessment/exit are mandatory atomic migration debt, not compatibility paths.
- Confirmatory runs require frozen config and locked recipe hashes.
- Exploratory runs can inform planning, but cannot directly support strong claims.

## Trace Kernel Boundary
Trace is a runtime invariant, not a writing-stage repair step. `PaperImplementation` must attach trace before an object can influence claim readiness, dossier readiness, citation generation, or writing export.

| Object | Owner | Role | Authority |
|---|---|---|---|
| `TraceManifest` | `PaperImplementation` | Mandatory lineage attachment for writing-affecting objects | trace completeness authority |
| `ClaimTracePacket` | `PaperImplementation` | Claim-specific trace package for support/challenge/scope/citation/artifact/boundary lineage | required claim-to-dossier gate |
| `CitationCandidate` | `PaperImplementation` / literature lineage | Citable source candidate with valid source locator | citation eligibility only |
| `MemoAsEvidenceGuard` | `PaperImplementation` | Blocks non-citable memo/rationale/summary/interpretation from becoming evidence/citation | evidence hygiene gate |

Lineage categories:
- literature lineage: citable literature evidence and source locators;
- experiment lineage: experiment plans, work orders, run evidence, results, validation reports, metrics, and facts;
- artifact lineage: datasets, baselines, code, configs, checkpoints, logs, figures, and tables;
- decision lineage: gates, human decisions, accepted risks, motive evolution, and policy versions;
- internal interpretation lineage: LLM rationale, board summaries, result interpretations, and other non-citable context.

Rules:
- `TraceManifest` is required before writing-ready export.
- `ClaimTracePacket` is required before a claim enters `ImplementationDossier`.
- `CitationCandidate` can only come from citable source evidence with valid locator refs.
- Internal interpretation artifacts can inform reasoning, but cannot be evidence or citation authority.
- Trace status `broken`, `stale`, `invalidated`, or missing critical refs blocks or downgrades readiness.
- Failed and negative runs are part of trace, not disposable execution noise.

## Agent Workflow Harness Boundary
`PaperImplementation` should reuse the runtime lessons and shared infrastructure proven by topic-selection, but PaperImplementation must not inherit topic-selection business semantics. The reusable layer is an agent runtime kernel; the implementation layer owns its own control plane, snapshots, harnesses, gates, and state writer.

| Object | Owner | Role | Must not own |
|---|---|---|---|
| `AgentRuntimeKernel` | shared runtime infrastructure | Execution mode, run mode, model profile resolution, LLM gateway boundary, structured-output validation, provenance, artifact refs, and scenario evaluation | paper implementation domain state; topic-selection node semantics |
| `ImplementationControlPlane` | `PaperImplementation` | Decides the next implementation workflow step and coordinates agents, work orders, gates, trace, queue items, and dossier readiness | direct LLM/provider calls; direct experiment execution; authority writes |
| `ImplementationInputSnapshot` | `PaperImplementation` | Domain-specific snapshot for implementation agent workflows | raw unscoped history; stale refs; memo-as-evidence inputs |
| `PaperImplementationAgentWorkflowHarness` | `PaperImplementation` | Wraps implementation LLM workflows with snapshot, validation, audit, trace, and proposal-only output rules | direct authority mutation; experiment submission |
| `TransitionAttempt` | `PaperImplementation` | Formal state-transition envelope binding inputs, outputs, gates, trace, and actor | ad hoc state changes |
| `StateWriter` | `PaperImplementation` | Only component allowed to apply authority state changes | business reasoning, LLM execution, experiment execution |

Reusable runtime semantics:
- `execution_mode`: `mocked_llm`, `codex_assisted`, `provider_llm`;
- run mode and mock/product isolation;
- model profile registry and profile resolution;
- common invocation audit/provenance envelope;
- LLM gateway boundary;
- structured output schema validation;
- artifact refs and redaction policy;
- scenario/evaluation harness patterns.

Implementation-specific semantics:
- motive decomposition;
- evidence board curation;
- validation cycle planning;
- route and feasibility planning;
- experiment design and critique;
- result analysis;
- claim boundary review;
- motive evolution;
- trace integrity repair;
- dossier readiness preparation.

Rules:
- `PaperImplementation` child tasks must not depend on topic-selection workflow harnesses, need-candidate adapters, context packets, or node contracts.
- Every implementation LLM workflow must run through `PaperImplementationAgentWorkflowHarness`.
- Every workflow must use `ImplementationInputSnapshot` with included refs, excluded refs, source hashes, freshness policy, and memo-as-evidence guard.
- Agent outputs must normalize into draft/proposal/recommended-transition/quality-signal/gate-prep/queue-suggestion artifacts.
- Agent outputs cannot call repositories or authority state writers directly.
- `ResearchWorkOrderDraft` can be proposed by an agent, but only `ResearchWorkOrderBroker` and `ResearchWorkOrderHarness` can admit and execute a real work order.
- Product route exposure requires scenario coverage for schema failure, stale refs, missing trace, memo-as-evidence, forbidden state mutation, and mock/product isolation.

## Human Confirmation Boundary
Human confirmation is a bounded authorization artifact. The confirmation records that a human reviewed a specific transition under a specific policy and source snapshot; the confirmation does not itself mutate motive, claim, work order, dossier, or packet authority state.

| Object | Owner | Role | Must not own |
|---|---|---|---|
| `HumanConfirmationRecord` | `PaperImplementation` | Auditable human authorization bound to target refs, transition attempt, gate results, reviewed hashes, rationale, policy, and trace | direct authority mutation |
| `DecisionWorkQueueItem` | `PaperImplementation` | Product/API surface for human review tasks, blockers, trace repair, failed workflow, failed run review, stale recheck, and accepted-risk expiry | raw state mutation; unscoped approval |
| `GateResult` | `PaperImplementation` | Determines whether a transition passes, needs human review, or is blocked | human identity or confirmation rationale |
| `StateWriter` | `PaperImplementation` | Applies authority state only after gates, trace, confirmation, and accepted-risk checks pass | UI confirmation capture |

Confirmation levels:
- `agent-actionable`: draft/proposal only, no authority transition.
- `policy-confirmed`: deterministic gates can proceed when risk is low and refs are fresh.
- `human-reviewed`: human review is recorded, often for negative results, failed-run blockers, or accepted-risk disposition.
- `human-confirmed`: human authorization is required before `StateWriter` can apply high-risk or irreversible transitions.

Human-confirmed transitions include:
- primary motive merge, split, demotion, or abandon;
- scope broadening or route changes beyond upstream topic boundary;
- expensive probe, expensive experiment cycle, or expensive confirmatory run;
- strong claim acceptance;
- writing-ready dossier export or writing-entry packet export when policy requires export authorization.

Rules:
- Confirmation must attach to `TransitionAttempt` and `GateResult` refs.
- Confirmation must record reviewed source refs/hashes; source drift invalidates or supersedes the confirmation.
- Confirmation scope must not expand implicitly. Confirming an expensive run does not confirm a later claim, and confirming a strong claim does not confirm dossier export.
- Confirmation may resolve `require_human_review`; confirmation cannot override a hard `blocked` gate without a new gate result or explicit accepted-risk path.
- UI/API confirmation routes write `HumanConfirmationRecord` only. `StateWriter` applies authority state in a separate step.
- Human confirmation cannot be inferred from LLM/provider/Codex/mock/cached output, generated rationale, or generic operator notes.
- Draft/internal dossier assembly does not require confirmation; writing-ready status and export must obey confirmation policy.

## Desktop Workbench Boundary
`PaperImplementationWorkbench` is the desktop surface for operating the implementation loop inside `论文管理`. The workbench helps the user inspect, decide, repair, and command implementation workflows, but all authority remains in backend contracts, gates, traces, and `StateWriter`.

The workbench decision is intentionally coarse. Component layout, exact fields, and detailed interaction design should follow backend contract/read-model landing work.

| Surface | Role | Must not become |
|---|---|---|
| Queue-first workspace | Prioritize actionable items from `DecisionWorkQueueItem` | passive dashboard with hidden blockers |
| Motive / evidence board | Inspect motive assertions, evidence bindings, conflicts, gaps, and trace | source-of-truth graph editor |
| Validation cycle view | Show cycles, gates, transitions, budgets, and next actions | autonomous planner that bypasses gates |
| Work order / run evidence view | Show work orders, run outcomes, failures, refs, metrics, and ingestion status | experiment asset registry or execution console |
| Trace repair view | Show broken/stale/missing trace and memo-as-evidence blockers | manual citation/evidence authority editor |
| Claim / dossier readiness view | Show claim boundaries, risks, failed runs, blockers, and dossier/export readiness | writing editor or second readiness authority |
| Confirmation surface | Capture scoped `HumanConfirmationRecord` commands | generic approval modal detached from refs |

Rules:
- The workbench lives under `论文管理` / paper module product grouping, not under downstream writing/editor.
- The first screen should be queue-first. A selected queue item drives detail panes, trace context, gate status, blockers, and available commands.
- UI emits commands to backend routes; the UI does not apply state, infer readiness, or persist authority locally.
- Command surfaces must show source refs, trace status, gate result, blockers, risks, and stale/hash status before submission when authority may be affected.
- Dossier and writing-entry packet status may be displayed, but body writing, LaTeX editing, Prism/Overleaf execution, submission strategy, and rebuttal authoring are out of scope.
- Experiment refs and run evidence may be displayed, but reusable asset ownership and platform execution remain in `experiment-foundation`.
- Queue/readiness badges must come from backend read-models and gate results.
- Desktop implementation work must follow the repo `data-ui` + token/contract path and must not recreate retired desktop style layers.

## Child Task Boundary
Implementation child tasks are split by flow node and decision point, not by UI screen alone and not by one object per package. Each child package must be independently verifiable and must preserve the authority boundaries confirmed in the parent roadmap.

Required child-task declaration:
- parent task reference: `parent-task:T-091`;
- flow / decision node;
- primary owner and cross-module dependencies;
- input objects and output objects;
- authority writer;
- gates and human-confirmation requirements;
- trace requirements and trace repair behavior;
- command/read-model/API surface;
- verification plan and residual risks.

Confirmed child sequence:
1. contracts and gap map;
2. intake bootstrap;
3. motive/evidence board;
4. validation-cycle planning;
5. workorder/experiment bridge;
6. trace kernel;
7. result/claim/dossier;
8. AI workflow harness;
9. desktop workbench;
10. contract evaluation suite.

Rules:
- Flow-node tasks may define the local DTOs/read-models they need, but must not create alternate authority roots.
- The trace kernel is dedicated and cross-cutting; later flow-node tasks must wire trace as acceptance, not defer trace.
- The AI workflow harness task depends on trace, gates, and WorkOrder boundaries.
- The desktop workbench task depends on backend command/read-model contracts.
- The evaluation suite must convert D1-D10 frozen rules into repeatable checks.
- Any conflict with D1-D10 must be brought back to the parent roadmap before implementation continues.

## Runtime Rules
- Orchestrator controls flow.
- Harness controls execution integrity.
- GateService controls admission and blockers.
- StateWriter is the only authority state writer.
- Agent runtime infrastructure is shared; implementation authority semantics are not shared with topic-selection.
- `ImplementationControlPlane` coordinates implementation workflows but does not directly call LLM providers or experiment adapters.
- `PaperImplementationAgentWorkflowHarness` produces proposal artifacts, not authority writes.
- Human confirmation is an input to `StateWriter`, not a substitute for `StateWriter`.
- `PaperImplementationWorkbench` emits commands and consumes read-models; the workbench does not write authority state.
- TraceHarness runs before writing readiness, not after writing starts.
- `PaperImplementation` writes claim/dossier readiness; `PaperProject` consumes that readiness through dossier/packet projections.
- No wrapper or adapter may route PaperImplementation authority through retired pre-writing control-plane artifacts.
- `WritingEntryPacket` is regenerated from dossier state and must never be the write target for implementation authority.
- `ResearchWorkOrderHarness` is the only path from implementation planning into experiment-foundation execution.
- `TraceHarness` must run before `ImplementationDossierReadinessGate` can pass.

## AI Boundary
AI may:
- draft semantic contracts;
- propose motive assertions;
- curate evidence bindings;
- propose validation cycles;
- design routes and probes;
- interpret results;
- propose claim boundaries;
- critique readiness;
- propose trace repair and decision-work-queue items.

AI may not:
- directly mutate admitted motive versions;
- directly call `StateWriter`;
- directly submit experiments without WorkOrder harness;
- create citation candidates from memo text;
- mark claims as writing-ready without trace and gate results;
- satisfy or fabricate human confirmation;
- abandon/promote primary research direction without required confirmation.

## Key Integration Risks
- `论文管理` becoming a backend catch-all instead of a user-facing module label.
- `PaperProject` and `PaperImplementation` both making claim readiness decisions.
- Treating `WritingEntryPacket` as a second source of writing-ready truth.
- Duplicating experiment asset ownership already present in `实验基座`.
- Copying `RunRecipe`, `TrainingTaskSpec`, or `ExperimentResult` into `PaperImplementation` authority state instead of storing refs/hashes.
- Treating `EvidenceCandidate` as final paper evidence without `RunEvidenceUnit`, result interpretation, and claim trace.
- Treating result interpretation text as evidence.
- Treating LLM memo, rationale, board summary, or human discussion notes as evidence or citation.
- Creating citation candidates without source locators.
- Creating a second agent runtime for paper implementation instead of extracting/reusing the shared runtime kernel.
- Importing topic-selection workflow/node semantics into `PaperImplementation`.
- Letting agent proposal artifacts become authority writes without gates, transition attempts, and `StateWriter`.
- Treating human confirmation as a direct state write or generic approval detached from source refs.
- Requiring confirmation for every draft/internal artifact and turning the workflow into a modal approval chain.
- Building `PaperImplementationWorkbench` as a writing editor, experiment console, or local readiness engine.
- Hard-freezing detailed UI fields before backend read-models and command contracts exist.
- Reintroducing a retired pre-writing control plane as a parallel claim-readiness authority.
- Building desktop UI before trace and gate contracts exist.
- Letting child tasks bypass the parent roadmap decisions.
