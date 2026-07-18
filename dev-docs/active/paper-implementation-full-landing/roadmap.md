# Paper Implementation Full Landing - Roadmap

## Decision
- New complex parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- User-facing carrier module: `论文管理`
- Supporting modules:
  - `选题管理` provides promoted topic/package/decision inputs.
  - `实验基座` provides reusable assets, recipes, execution jobs, results, facts, and evidence sidecars.
- Primary goal: 将论文实施阶段从 promoted topic 推进到可写作、可复核、可追踪的 implementation dossier，并用 roadmap 先完成决策点对齐。

## Why This Is A Parent Package
- 论文实施跨越 `选题管理 -> 论文管理 -> 实验基座 -> 写作入口`，不是单一 endpoint、单一 UI 页面或单一 backend service。
- 该工作需要统一 AI workflow、harness、gate、trace、实验执行证据、claim boundary、dossier readiness 和桌面工作台。
- `experiment-foundation-v1` 提供重要实验基座；论文实施闭环由 `PaperImplementation` 直接承载，不通过旧控制面 wrapper。
- 本包只做全功能落地治理与 roadmap 收口；可执行实现必须拆成 scoped child tasks。

## Module Ownership Decision Baseline
| Concern | Owner | Notes |
|---|---|---|
| User-facing implementation workspace | `论文管理` | 作为桌面模块承接论文实施工作流。 |
| Promoted topic authority | `选题管理` | 输出 `TopicPackage / PromotionDecision / PaperProjectBridge` 等 authority inputs；实施阶段不得静默覆盖。 |
| Motive, claim, readiness, risk, writing handoff | `论文管理` via `PaperImplementation` lane | `PaperImplementation` 是论文管理中的研究实施 operation lane，负责实施、验证、解释、claim trace 和 dossier readiness。 |
| Paper lifecycle and delivery | `PaperProject` | `PaperProject` 是 writing lifecycle / delivery container，负责论文容器、版本脊柱、写作包、artifact bundle 和 release/review gate。 |
| Dataset, baseline, benchmark, run recipe, execution result | `实验基座` | 作为实验资产与执行证据 owner。 |
| Writing-ready material package | `PaperImplementation` | `ImplementationDossier` 是写作前完整研究材料包；`WritingEntryPacket` 可作为下游写作入口摘要投影。 |
| Final writing/editing/LaTeX/Prism integration | downstream writing lane | 本母包只输出可写作材料，不实现正文编辑器。 |

## Confirmed Semantic Baseline
- `PaperProject` and `PaperImplementation` are separate semantic domains.
- `PaperProject` answers: "这篇论文作为交付物，生命周期走到哪里了？"
- `PaperImplementation` answers: "这篇论文想写的研究内容，是否已经被实施、验证、解释，并形成可追踪 claim？"
- `PaperProject` 的主要对象域是 writing lifecycle / delivery，不等同于正文编辑器或完整写作执行面。
- `PaperImplementation` 的主要操作域是 `论文管理` 中的研究实施 lane。
- Product organization may show both under `论文管理`, but implementation work must keep their authority models separate.

### Anti-drift Rules
1. `PaperImplementation` decides whether a claim is eligible for writing.
2. `PaperProject` manages the paper as a delivery artifact: version spine, snapshots, writing packages, artifact bundles, and release gates.
3. Downstream writing/editor surfaces consume dossier/packet outputs; they must not infer claim authority from loose evidence, run records, or LLM memo.
4. `实验基座` owns reusable assets and execution facts; `PaperImplementation` consumes them through WorkOrder and trace refs.
5. `选题管理` authority is immutable from implementation; implementation findings must be emitted as feedback/recheck events.
6. Retired pre-writing control-plane artifacts must not create, mutate, wrap, adapt, or decide authoritative implementation state.

## Confirmed Intake Decision
- Do not rename existing `PaperProjectBridge` contracts, routes, database model, or historical task docs.
- Treat `TopicSelectionPaperProjectBridgeHandoff` as the already implemented topic-selection promotion handoff carrier.
- Add `ImplementationIntakeSnapshot` as the neutral `PaperImplementation` intake object.
- `ImplementationIntakeSnapshot` is derived from an active `TopicSelectionPaperProjectBridgeHandoff`.
- `ImplementationProject` bootstraps from `ImplementationIntakeSnapshot`, not directly from `PaperProject` and not semantically from `PaperProjectBridge`.
- `ImplementationProject` must preserve immutable source refs and hashes:
  - `paper_project_bridge_id`
  - `bridge_payload_hash`
  - `promotion_decision_id`
  - `promotion_commitment_profile_id`
  - `promotion_input_snapshot_id`
  - `promotion_input_snapshot_hash`
  - `topic_package_id`
  - `package_version`
  - `title_card_id`
- If a target `PaperProject` already exists, the project may be linked as `target_paper_project_ref`, but the project is not the implementation authority root.
- If the upstream bridge is superseded or hash-mismatched, implementation must enter upstream recheck / intake refresh instead of silently updating authority state.

### D2 Landing Rules
1. Existing `PaperProjectBridge` names stay in topic-selection code, storage, API/context docs, desktop topic-selection UI, and historical task records.
2. New paper-implementation contracts must not introduce new public names that imply `PaperProjectBridge` is the implementation aggregate root.
3. Child tasks that need implementation intake must define or consume `ImplementationIntakeSnapshot` in the `paper-implementation` boundary.
4. `ImplementationIntakeSnapshot` is a snapshot, not a mutable join table. The snapshot captures the selected upstream authority state and source hashes at bootstrap time.
5. `ImplementationProject` identity and state transitions are owned by `PaperImplementation`; bridge ids are lineage refs only.
6. Any upstream correction from `选题管理` must be modeled as intake refresh / recheck, not in-place mutation of admitted implementation state.
7. If a child task touches existing `PaperProjectBridge` code, the child task must declare the work as compatibility maintenance, not semantic expansion.

## Confirmed Motive Kernel Decision
- `CoreMotiveVersion` is a first-class `PaperImplementation` domain object.
- `PaperImplementation` owns motive identity/version, validation cycle, claim trace, dossier readiness, and writing-prep authority.
- Former research-argument graph/readiness/code/docs are retired historical artifacts, not migration inputs or compatibility adapters.
- `PaperImplementation` is the only current authority root for motive, claim, trace, dossier, and writing-ready decisions.
- Do not add wrappers, bridge DTOs, read-model adapters, or planner/runtime paths around the retired control plane.

### D3 Landing Rules
1. New implementation contracts must hang `CoreMotiveVersion`, `ValidationCycle`, `ClaimTracePacket`, and `ImplementationDossier` from `ImplementationProject`.
2. Retired control-plane identifiers must not appear in PaperImplementation API, DB, shared-contract, UI, or context surfaces.
3. No child task may add wrappers, read-model adapters, planner/critic runtime, desktop surfaces, authority writes, or readiness gates around retired control-plane artifacts.
4. `WritingEntryPacket` is a downstream projection from `ImplementationDossier`, not a compatibility projection from retired readiness objects.
5. Writing readiness is decided by `ImplementationDossierReadinessGate`.
6. Archived historical docs may mention retired terms, but active implementation plans must not depend on them.

## Confirmed Dossier / Writing Packet Decision
- `ImplementationDossier` is the full, authoritative, traceable pre-writing research material package owned by `PaperImplementation`.
- `WritingEntryPacket` is a downstream writing-entry projection derived from an `ImplementationDossier`.
- `WritingEntryPacket` must not decide writing readiness, weaken dossier blockers, or become a second claim authority.
- `ImplementationDossierReadinessGate` is the only gate that can mark implementation material writing-ready.
- `WritingEntryPacket` behavior is defined directly as an `ImplementationDossier` projection; no retired packet shape is a compatibility source.

### D4 Landing Rules
1. Every exported `WritingEntryPacket` must carry `implementation_dossier_id`, `implementation_dossier_version`, `dossier_readiness_gate_result_ref`, `trace_manifest_ref`, and a projection timestamp/hash.
2. A packet may summarize, reorder, or omit fields for writing ergonomics, but the packet must expose any omitted blockers, risks, failed-run notes, or projection limitations.
3. Packet regeneration must be deterministic from the source dossier version and projection policy version.
4. If the source dossier changes, existing packets become stale unless their source dossier version/hash still matches.
5. Downstream writing/editor surfaces may consume packets for convenience, but must link back to the dossier and trace refs for authority.
6. Child tasks must not create a standalone packet persistence model that can outlive or override its source dossier authority.

## Confirmed WorkOrder / Experiment Foundation Decision
- `ResearchWorkOrder` is the `PaperImplementation`-owned command and governance envelope for all implementation experiments.
- `experiment-foundation` owns reusable assets, `RunRecipe`, `TrainingTaskSpec`, `ExternalTrainingJob`, `ExperimentResult`, `ResultValidationReport`, `EvaluationFact`, and `EvidenceCandidate`.
- `ResearchWorkOrder` wraps experiment-foundation refs and hashes; `ResearchWorkOrder` must not copy or own experiment-foundation objects.
- `RunRecipe` remains a locked, deterministic, platform-neutral experiment plan; `RunRecipe` must not contain paper claim text, claim readiness, or dossier state.
- `EvidenceCandidate` is an experiment-foundation candidate result, not final paper evidence. Claim/dossier implications are decided only after `PaperImplementation` ingests outputs into `RunEvidenceUnit`, `ResultInterpretationPacket`, and `ClaimTracePacket`.
- All run outcomes remain visible, but T-132 D-16 supersedes the original all-outcomes-as-REU rule: failed/cancelled/aborted/incomplete execution is retained by exact Run/Attempt ref in the immutable ValidationCycle closure snapshot/hash, while only complete protocol-compliant validation-passed EvidenceCandidate may produce RunEvidenceUnit. Complete valid negative/inconclusive results remain REU-eligible on a separate scientific-disposition axis.

### D5 Landing Rules
1. Every experiment, probe, baseline reproduction, training run, ablation, robustness check, data check, and error analysis must enter through `ResearchWorkOrderHarness`.
2. A `ResearchWorkOrder` must bind to `ImplementationProject` plus at least one relevant `ValidationCycle` or `ExperimentPlanLight`.
3. A `ResearchWorkOrder` must record source motive/assertion refs, run type, retry budget, compute limit, stop conditions, allowed mutations, and auto-tune policy.
4. Confirmatory work orders require frozen config, locked `RunRecipe`, source hashes, explicit stop conditions, and `auto_tune_allowed = false` unless a later policy explicitly narrows an exception.
5. Exploratory work orders may create new validation cycles or experiment plans, but cannot directly support strong claims without confirmatory/trace gates.
6. Implementation child tasks must model experiment-foundation links as refs/hashes: `recipe_draft_ref`, `run_recipe_ref/hash`, `training_task_spec_ref/hash`, `materialization_result_ref/hash`, `external_job_ref/hash`, `experiment_result_ref/hash`, `validation_report_ref/hash`, and optional `evidence_candidate_refs`.
7. Future/productized ingestion uses two explicit authorities: `RunEvidenceUnit` preserves eligible scientific result/validation/trace lineage, while the ValidationCycle closure record's embedded immutable snapshot/hash preserves exact execution-accounting Run/Attempt refs, states and eligibility codes. Sidecar is display-only and dossier consumes declared closed-Cycle snapshots.

## Confirmed Trace Kernel Decision
- `TraceManifest` is the mandatory trace kernel for all writing-affecting `PaperImplementation` objects.
- `TraceManifest` must separate literature lineage, experiment lineage, artifact lineage, decision lineage, and internal interpretation lineage.
- `ClaimTracePacket` is required for every claim included in an `ImplementationDossier`.
- `CitationCandidate` may only be created from citable literature evidence with valid source locators.
- LLM memo, rationale, board summary, human discussion notes, and result interpretation are non-citable internal interpretation artifacts; they must never become evidence or citation authority.
- `ImplementationDossierReadinessGate` must check trace completeness before claim/dossier readiness.

### D6 Landing Rules
1. Writing-affecting objects without `TraceManifest` may exist only as draft/internal objects and must not be exported as writing-ready.
2. The minimum writing-affecting set includes `CoreMotiveVersion`, `MotiveEvidenceBoardVersion`, `ValidationCycle`, `ResearchWorkOrder`, `RunEvidenceUnit`, `ResultInterpretationPacket`, `ClaimCandidate`, `ClaimTracePacket`, `CitationCandidate`, and `ImplementationDossier`.
3. `TraceManifest` must not collapse all provenance into one loose `evidence_refs` list; lineage categories must stay explicit.
4. A claim without `ClaimTracePacket` cannot enter `ImplementationDossier` or `WritingEntryPacket`.
5. `CitationCandidate` must carry source locator refs and cannot be generated from LLM summaries, board summaries, human notes, or result interpretations.
6. `ResultInterpretationPacket` is interpretation lineage only; claim support must trace back to `RunEvidenceUnit`, `ExperimentResult`, `ResultValidationReport`, `EvaluationFact`, or citable literature evidence.
7. Failed, negative, inconclusive, crashed, cancelled, and aborted runs must remain traceable, not only successful runs.
8. Missing, stale, broken, invalidated, or non-citable trace refs must block or downgrade dossier readiness.

## Confirmed Agent Workflow Harness Decision
- `PaperImplementation` should reuse a domain-neutral agent runtime kernel extracted from topic-selection patterns.
- `PaperImplementation` owns its own `ImplementationControlPlane`, `ImplementationInputSnapshot`, `PaperImplementationAgentWorkflowHarness`, gates, `TransitionAttempt`, and `StateWriter`.
- Reusable runtime semantics include `execution_mode`, run mode, model profile registry, profile resolution, LLM gateway boundary, structured-output validation, invocation audit/provenance, mock/product isolation, artifact refs, and scenario evaluation.
- Topic-selection workflow harnesses, need-candidate adapters, control-plane objects, context packets, and node contracts must not become `PaperImplementation` business dependencies.
- Agent outputs are proposal artifacts only. They may draft motive assertions, validation cycles, route plans, work order drafts, result interpretations, claim boundaries, trace repair suggestions, or quality signals.
- Formal state changes require deterministic/semantic gates, `TransitionAttempt`, required human confirmation where applicable, trace checks, and `StateWriter`.
- Agents must not directly create writing-ready claims, submit experiments, mutate admitted motive versions, mark dossier readiness, or bypass `ResearchWorkOrderHarness`.
- No paper-implementation child task may create a second LLM router, model profile store, prompt runtime, cache layer, transcript store, or authority write path.

### D7 Landing Rules
1. If shared runtime extraction is not yet available, implementation children may use temporary wrappers, but the wrappers must not import topic-selection domain contracts into `PaperImplementation`.
2. The reusable kernel must be named and bounded as agent runtime infrastructure, not as topic-selection infrastructure.
3. `PaperImplementationAgentWorkflowHarness` must require `ImplementationInputSnapshot` for every LLM workflow.
4. `ImplementationInputSnapshot` must include refs/hashes for motive, evidence board, validation cycle, route/probe/experiment plan, work order, run evidence, result packet, accepted risks, human decisions, claim/dossier refs, plus explicit excluded refs and exclusion reasons.
5. Snapshot policy must block stale evidence, invalidated refs, raw unscoped history, rejected claims as fact, and memo-as-evidence usage.
6. Harness runs must persist prompt/input/output/audit refs, schema validation result, reference validation result, trace validation result, model/profile provenance, and quality signals; hidden reasoning, provider secrets, and raw private logs must not be persisted as business artifacts.
7. Agent workflow types should be registered by implementation function, such as motive decomposition, evidence board curation, validation cycle planning, route architecture, experiment design/critique, result analysis, claim boundary review, motive evolution, and trace integrity review.
8. Agent outputs must normalize into one of: draft object, proposal object, recommended transition, quality signal, gate-prep report, or decision-work-queue suggestion.
9. Agent outputs cannot call repositories or authority state writers directly. Domain services may consume validated outputs only after gates pass.
10. Experiment-related agents can produce `ResearchWorkOrderDraft`; only `ResearchWorkOrderBroker` and `ResearchWorkOrderHarness` can admit and execute a real work order.
11. Claims, dossier readiness, citation readiness, motive abandonment, and scope broadening remain gate/state-writer decisions, not agent decisions.
12. AI workflow child tasks must include scenario/evaluation coverage for schema failure, stale ref, missing trace, memo-as-evidence, forbidden state mutation, and mock/product isolation before product route exposure.

## Confirmed Human Confirmation Decision
- Human confirmation is an explicit authorization record for high-risk transitions, not a direct state write.
- `HumanConfirmationRecord` must attach to `TransitionAttempt` and relevant `GateResult` refs.
- `DecisionWorkQueueItem(queue_type=human_review)` is the product/API surface for pending confirmations.
- `StateWriter` is still the only component that applies authority state after confirmation, gates, trace checks, and accepted-risk checks pass.
- Human confirmation must never be inferred from provider output, Codex-assisted output, mock output, cached output, LLM memo, or operator notes outside a confirmation route.
- Draft/internal implementation artifacts can be generated without human confirmation. Writing-ready export and irreversible/high-risk transitions require explicit confirmation.

### D8 Confirmation Levels
| Level | Meaning | Examples |
|---|---|---|
| `agent-actionable` | Agent may create draft/proposal artifacts; no authority transition. | motive assertion draft, evidence binding proposal, wording refine, trace repair proposal, secondary/fallback park proposal with reopen condition |
| `policy-confirmed` | Deterministic policy/gates may proceed without human confirmation if refs are fresh and risk is low. | low-cost validation cycle, reversible narrow scope, low-risk maturity upgrade, low-cost feasibility probe |
| `human-reviewed` | Human review must be recorded, but the transition may remain cautious/non-final. | negative result claim, failed-run blocker review, high-risk accepted risk, dossier blocker disposition |
| `human-confirmed` | Human authorization is required before `StateWriter` can apply the transition or export. | primary motive merge/split/demote/abandon, broaden scope, route beyond upstream topic boundary, expensive probe/experiment cycle, strong claim, writing-ready dossier export |

### D8 Landing Rules
1. A `HumanConfirmationRecord` must include confirmation target refs, transition attempt ref, gate result refs, reviewed source refs/hashes, decision, human rationale, confirmer identity, policy version, created timestamp, and trace manifest ref.
2. Confirmation may unlock a `require_human_review` transition, but confirmation must not override a hard `blocked` gate without a new gate result or accepted-risk path explicitly allowed by policy.
3. Source ref/hash drift after confirmation invalidates or supersedes the confirmation.
4. Confirmation scope must be narrow: confirming an expensive run does not confirm the later claim; confirming a strong claim does not confirm dossier export.
5. `DecisionWorkQueueItem` must deduplicate human review tasks by target transition and gate result.
6. UI/API routes must write confirmation records only; they must not write motive, claim, work order, dossier, or packet authority state directly.
7. `ImplementationDossier` may be assembled as draft/internal without confirmation, but `writing_ready` or exported `WritingEntryPacket` requires confirmation when dossier policy says so.
8. Confirmation records must preserve reviewed blockers, warnings, accepted risks, failed/negative/inconclusive run refs, and known limitations.
9. Human confirmation cannot be satisfied by empty rationale, unchecked generated text, or a generic approval detached from source refs.
10. Product tests must cover missing confirmation, stale confirmation, wrong target, duplicate confirmation, mock/codex/provider output misused as confirmation, and direct-write bypass attempts.

## Confirmed Desktop Workbench Decision
- Add a `PaperImplementationWorkbench` under the user-facing `论文管理` area.
- The workbench is an implementation decision/action surface, not a writing editor, experiment console, or authority state writer.
- UI details may stay coarse until backend contracts and read-models land; D9 freezes only ownership, workflow shape, view priorities, command boundaries, and non-goals.
- The first-class entry surface is `DecisionWorkQueue`, with queues for human review, trace repair, gate blockers, failed workflow, failed run review, stale evidence recheck, and accepted-risk expiry.
- The workbench consumes backend read-models and emits commands. The workbench must not infer authority from loose UI state, local component state, LLM text, or copied experiment data.
- Existing `topic-workbench` staged workflow and queue-panel patterns may be used as UI pattern references, but topic-selection business semantics must not be reused.

### D9 Coarse Surface Model
| Surface | Purpose | Primary authority source |
|---|---|---|
| Queue-first workspace | Show actionable implementation decisions and blockers | `DecisionWorkQueueItem` read-model |
| Motive / evidence board | Inspect motive, assertions, evidence bindings, conflicts, and gaps | `CoreMotiveVersion`, `MotiveEvidenceBoardVersion`, trace refs |
| Validation cycle view | Inspect active/planned cycles and gate status | `ValidationCycle`, `GateResult`, `TransitionAttempt` |
| Work order / run evidence view | Inspect work orders, run status, failures, and result ingestion | `ResearchWorkOrder`, experiment-foundation refs, `RunEvidenceUnit` |
| Trace repair view | Resolve broken/stale/missing trace and memo-as-evidence blockers | `TraceManifest`, `ClaimTracePacket`, `MemoAsEvidenceGuard` |
| Claim / dossier readiness view | Inspect claim boundaries, dossier blockers, risks, and export readiness | `ClaimCandidate`, `ImplementationDossier`, readiness gate refs |
| Confirmation surface | Capture scoped human authorization | `HumanConfirmationRecord` command route |

### D9 Landing Rules
1. `PaperImplementationWorkbench` belongs under `论文管理` / paper module product grouping, not under downstream writing/editor surfaces.
2. The initial UI should be queue-first: selected queue item drives detail panes, evidence/trace context, recommended actions, and available commands.
3. UI commands may request confirmation, request trace repair, accept risk, create work order draft, submit confirmation, request gate rerun, trigger intake refresh, or generate dossier/packet projection commands.
4. UI commands must call backend command routes; UI components must not write authority state or synthesize readiness locally.
5. The workbench may display `ImplementationDossier` and `WritingEntryPacket` projection status, but the workbench must not provide body writing, LaTeX editing, Prism/Overleaf execution, or submission/rebuttal authoring.
6. The workbench may display experiment-foundation refs, run state, metrics, logs, and evidence ingestion status, but the workbench must not duplicate the experiment asset registry or become a platform execution console.
7. Queue/readiness badges must be derived from backend read-models and gate results, not client-only heuristics.
8. Every action that can affect authority must expose source refs, trace status, gate result, blockers, known risks, and stale/hash status before command submission.
9. Desktop implementation child tasks must use the repo's `data-ui` + token/contract path and must not recreate retired desktop runtime style layers.
10. UI completion is not the acceptance boundary; backend contracts/read-models/gates must be proven first, and UI is complete only when the workbench drives those commands without bypass.

## Confirmed Child Task Granularity Decision
- Child tasks should be split by the paper-implementation flow and key decision nodes.
- Child tasks must still preserve kernel boundaries: authority writer, gate, trace, command/read-model, and verification must be explicit in every package.
- Do not split by UI screen alone, and do not merge the full landing into one broad implementation package.
- Trace is a cross-cutting kernel. The trace kernel may have a dedicated child task, but every flow-node child must integrate trace rather than treating trace as a later repair pass.
- UI and AI workflow tasks must depend on backend contracts, gates, trace, and read-model/command boundaries.

### D10 Child Package List
| Order | Child package | Flow / decision node | Primary owner |
|---|---|---|---|
| 1 | `paper-implementation-contracts-and-gap-map` | Object mapping, current gap map, dependency order, existing-code ownership | parent governance |
| 2 | `paper-implementation-intake-bootstrap` | `ImplementationIntakeSnapshot -> ImplementationProject` | `PaperImplementation` + topic-selection handoff |
| 3 | `paper-implementation-motive-evidence-board` | `CoreMotiveVersion`, motive assertions, evidence board | `PaperImplementation` |
| 4 | `paper-implementation-validation-cycle-planning` | `ValidationCycle`, route/probe planning, `ExperimentPlanLight` | `PaperImplementation` |
| 5 | `paper-implementation-workorder-experiment-bridge` | `ResearchWorkOrder -> experiment-foundation -> RunEvidenceUnit` | `PaperImplementation` + `experiment-foundation` |
| 6 | `paper-implementation-trace-kernel` | `TraceManifest`, `CitationCandidate`, memo guard, trace repair | `PaperImplementation` |
| 7 | `paper-implementation-result-claim-dossier` | result interpretation, claim boundary, claim trace, dossier readiness | `PaperImplementation` |
| 8 | `paper-implementation-ai-workflow-harness` | agent proposal runtime, `ImplementationInputSnapshot`, audit, scenario harness | shared runtime + `PaperImplementation` |
| 9 | `paper-implementation-desktop-workbench` | queue-first workbench, confirmation surfaces, command UX | desktop `论文管理` |
| 10 | `paper-implementation-contract-evaluation-suite` | replay, adversarial, trace integrity, dossier readiness tests | evaluation/governance |

### D10 Landing Rules
1. Every child task must reference `parent-task:T-091`.
2. Every child task must declare input objects, output objects, authority writer, gates, trace requirements, command/read-model/API surface, and verification plan.
3. Every child task must declare primary owner and cross-module dependencies before implementation begins.
4. Flow-node tasks may include local contract/schema/read-model work needed for that node, but must not silently redefine upstream or downstream authority.
5. The trace kernel child owns shared trace contracts and guards; flow-node tasks must wire their objects to trace as part of acceptance.
6. The AI workflow harness child depends on trace/gate/workorder foundations and must not introduce authority writes.
7. The desktop workbench child depends on backend command/read-model contracts and must not be accepted on mock UI alone.
8. The evaluation suite must convert frozen rules into contract/replay/adversarial/trace/dossier tests and record residual risk.
9. A child task must not touch retired pre-writing control-plane artifacts except to archive historical docs or strengthen negative guards.
10. If a child task discovers a decision conflict with D1-D10, the child task must return to the parent roadmap instead of creating an alternate local rule.

## Terminology Note
- 用户可见模块名使用 `论文管理`。
- 工程文档中必须精确区分：
  - `paper-project` lifecycle container；
  - `paper-implementation` implementation operation lane；
  - `experiment-foundation` execution and evidence substrate；
  - `paper-implementation-full-landing` as this parent-task umbrella phrase.
- 不使用 `论文管理` 作为 backend catch-all bounded context 名称；每个 child task 必须声明真实 owner。

## Input Sources
| Source | Path/reference | Used for | Trust |
|---|---|---|---|
| User instruction | chat, 2026-05-20 | carrier module, support modules, parent-package request | highest |
| Paper implementation design docs | `/Volumes/DataDisk/Project/_docs/Researcher/paper_implementation_design_docs/` | target lifecycle, frozen rules, gates, harnesses, roadmap | high |
| Project context and glossary | `docs/context/` | canonical naming and existing contracts | high |
| Experiment foundation package | `dev-docs/active/experiment-foundation-v1/` | experiment substrate and reusable asset baseline | high |
| Topic-selection packages | `dev-docs/active/topic-selection-*` | promoted topic, workflow harness, bridge loopback baseline | high |

## Non-goals
- 不在母包内直接实现产品代码。
- 不让 agent 裸跑实验或直接写入 research state。
- 不让 LLM memo、board summary 或 rationale 成为 evidence/citation。
- 不把 `实验基座` 的 reusable asset DTO 复制进 `论文管理` authority model。
- 不让实施阶段结果静默覆盖 `选题管理` authority object；只能发 feedback/recheck event。
- 不实现完整论文正文写作、投稿策略、rebuttal 生成或 Prism/Overleaf execution。

## Full Landing Capability Model
```text
论文实施全功能
  = promoted topic intake
  + core motive / assertion / evidence board
  + validation cycle and portfolio governance
  + project-level implementation harness and runtime governance
  + route / feasibility / experiment planning
  + research work order harness
  + run evidence and failed-run retention
  + upstream feedback event into topic selection
  + result interpretation
  + claim boundary and claim trace
  + trace manifest and citation readiness
  + implementation dossier
  + desktop decision workbench
  + contract / replay / adversarial / queryability tests
```

## Decision Points To Align Before Implementation
| ID | Decision point | Recommendation / decision | Status | Must decide before |
|---|---|---|---|---|
| D1 | `论文管理` internal domain split | Confirmed semantic split: `PaperImplementation` is the research implementation lane under `论文管理`; `PaperProject` is the writing lifecycle / delivery container; neither should become a catch-all backend context. | confirmed | shared contracts |
| D2 | `ImplementationProject` identity | Preserve current `PaperProjectBridge` contracts as the topic-selection promotion handoff carrier. Add neutral `ImplementationIntakeSnapshot` derived from an active `TopicSelectionPaperProjectBridgeHandoff`; bootstrap `ImplementationProject` only from that snapshot. Store `paper_project_bridge_id + bridge_payload_hash` as immutable source refs. | confirmed | persistence |
| D3 | `CoreMotiveVersion` location | Confirmed: `CoreMotiveVersion` and motive/claim/dossier authority live in `PaperImplementation`. Retired pre-writing control-plane artifacts are not wrappers, migration inputs, or compatibility adapters. | confirmed | motive kernel |
| D4 | `ImplementationDossier` vs `WritingEntryPacket` | Confirmed: `ImplementationDossier` is the full authoritative pre-writing material package; `WritingEntryPacket` is a derived downstream writing-entry projection and cannot decide readiness. | confirmed | bridge design |
| D5 | `ResearchWorkOrder` mapping | Confirmed: `ResearchWorkOrder` is the PaperImplementation-owned governance envelope; `experiment-foundation` owns reusable assets, recipes, execution jobs, structured results, and evidence candidates. WorkOrder stores refs/hashes and ingests outputs into `RunEvidenceUnit`. | confirmed | experiment harness |
| D6 | Trace kernel scope | Confirmed: implement `TraceManifest`, `ClaimTracePacket`, `CitationCandidate`, and memo-as-evidence guard before claim/dossier readiness; missing trace blocks writing-ready export. | confirmed | P0 |
| D7 | Agent workflow harness reuse | Confirmed: reuse a domain-neutral agent runtime kernel extracted from topic-selection patterns, but keep `PaperImplementation` control plane, input snapshots, workflow harnesses, gates, and state writer domain-owned. Agent outputs are proposal artifacts only. | confirmed | AI runtime |
| D8 | Human confirmation boundaries | Confirmed: human confirmation is an authorization record for high-risk transitions, not a state write. Use `DecisionWorkQueueItem(queue_type=human_review)` and `HumanConfirmationRecord`; final authority changes still require gates, trace, accepted-risk checks, and `StateWriter`. | confirmed | UI/API gates |
| D9 | Desktop workflow shape | Confirmed: add a coarse `PaperImplementationWorkbench` under `论文管理`; the workbench is a queue-first implementation decision/action surface that consumes backend read-models and emits commands, not a writing editor, experiment console, or authority state writer. | confirmed | UI child task |
| D10 | Child task granularity | Confirmed: split child tasks by implementation flow and key decision nodes, while each child must declare authority writer, gates, trace, command/read-model/API surface, owner, dependencies, and verification. | confirmed | roadmap freeze |

## Parent / Child Execution Plan
Confirmed child packages after decision alignment:

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

Each child must map back to `T-091` via `parent-task:T-091` keyword and must declare which module owns the changed files.

## Design-Doc Audit Supplement
The 2026-05-20 design-doc review found four areas that were covered only implicitly. They are now explicit child-task contracts:

| Design-doc requirement | Primary owner | Required child-task treatment |
|---|---|---|
| Portfolio governance for multiple motives | `T-094`, consumed by `T-095` | Define `CoreMotiveIdentity`, `CoreMotiveSet`, `CrossBoardReview`, `MotivePortfolioDecision`, and `PortfolioCoordinator` boundaries. |
| Project-level runtime governance | `T-099`, verified by `T-101` | Define `ImplementationHarness`, `ContextCompiler`, harness policy pack, runtime bindings, invariant checks, and proposal-only AI execution. |
| Upstream feedback to topic selection | `T-093`, emitted by `T-095`/`T-096`/`T-098` | Define `ImplementationFeedbackEvent`; never overwrite topic-selection authority objects from implementation findings. |
| Minimum queryable persistence fields | `T-092`, enforced by each data-bearing child and `T-101` | Produce a columnized-field matrix for gate, queue, trace, and contract-test queries; do not bury required state only in JSON. |

## Phases
### Phase 0 - Decision Alignment And Gap Map
- Objective: reconcile paper implementation design docs with current repo modules.
- Deliverables:
  - object mapping table;
  - design component ownership map;
  - minimum DB/queryability column matrix;
  - current implemented vs missing capability map;
  - confirmed child task list;
  - updated roadmap decision log.
- Acceptance:
  - D1-D10 are confirmed or explicitly deferred.

### Phase 1 - Contracts And Trace Kernel
- Objective: freeze minimum contracts before any AI workflow or experiment execution.
- Deliverables:
  - `TraceManifest`;
  - `ClaimTracePacket`;
  - `CitationCandidate`;
  - natural-language field role contract;
  - `MemoAsEvidenceGuard`.
- Acceptance:
  - writing-affecting objects without trace cannot be exported as writing-ready.

### Phase 2 - Motive And Validation Cycle Kernel
- Objective: support core motive identity/version/assertions/evidence board/validation cycle/evolution decision.
- Deliverables:
  - `CoreMotiveIdentity` and `CoreMotiveSet`;
  - motive semantic contract;
  - assertion-centered evidence board;
  - cross-board review and portfolio decision contracts;
  - validation cycle admission/completion gates;
  - motive evolution transaction boundary.
- Acceptance:
  - admitted motive versions are immutable; semantic changes require evolution decision; portfolio role changes follow explicit confirmation rules.

### Phase 3 - Experiment WorkOrder Bridge
- Objective: make all implementation experiments flow through a controlled WorkOrder harness backed by `实验基座`.
- Deliverables:
  - `ResearchWorkOrder`;
  - WorkOrder admission gate;
  - `RunEvidenceUnit`;
  - failed-run retention checks;
  - exploratory/confirmatory markers.
- Acceptance:
  - no run can become trusted implementation evidence without WorkOrder and trace refs.

### Phase 4 - Result, Claim, Dossier Kernel
- Objective: convert run evidence into bounded, traced claims and dossier readiness.
- Deliverables:
  - result interpretation packet;
  - claim candidate;
  - claim boundary gate;
  - implementation dossier;
  - dossier readiness gate.
- Acceptance:
  - ready dossier includes support, challenge, failed runs, forbidden overclaims, and trace manifests.

### Phase 5 - AI Workflow Harness And Runtime Governance
- Objective: allow AI to draft, critique, and plan while preventing authority bypass.
- Deliverables:
  - `ImplementationHarness`;
  - implementation `InputSnapshot`;
  - `ContextCompiler`;
  - agent workflow harness;
  - gate result and transition attempt model;
  - decision work queue;
  - budget/stop-rule service.
- Acceptance:
  - all implementation workflows run inside a policy-bound harness; agent output can propose transitions but cannot mutate authority state directly.

### Phase 6 - Desktop Workbench
- Objective: expose the implementation workflow inside `论文管理`.
- Deliverables:
  - motive/evidence board;
  - validation cycle and work order queue;
  - trace repair queue;
  - claim/dossier readiness view;
  - human confirmation surfaces.
- Acceptance:
  - user can drive implementation decisions without entering a writing editor.

### Phase 7 - Evaluation And Closure
- Objective: turn frozen rules into repeatable tests and close the parent package.
- Deliverables:
  - contract tests;
  - replay/mutation/adversarial test fixtures;
  - trace integrity and dossier readiness tests;
  - queryability tests for required gate/queue/trace fields;
  - child-task closure review.
- Acceptance:
  - parent package records which child tasks closed the full landing scope and what remains follow-up.

## P0 Recommended Order
1. Close `paper-implementation-contracts-and-gap-map`.
2. Build `paper-implementation-intake-bootstrap` so admitted implementation projects have stable upstream lineage.
3. Start `paper-implementation-trace-kernel` early and require every later flow-node child to wire trace.
4. Build motive/evidence-board and validation-cycle planning nodes.
5. Build WorkOrder/experiment bridge before any AI execution can trigger experiments.
6. Build result/claim/dossier after run evidence and trace contracts exist.
7. Add AI workflow harness after deterministic gates, trace, and WorkOrder boundaries exist.
8. Add desktop surfaces after command/read-model ownership is stable.
9. Close with contract/replay/adversarial evaluation.

## Acceptance Criteria
- [x] Roadmap decision points D1-D10 are reviewed and updated with confirmed decisions.
- [x] Child packages are created with clear ownership and `parent-task:T-091` keyword.
- [x] `论文管理` is documented as the user-facing carrier for implementation, with precise internal bounded contexts.
- [x] `选题管理` inputs and upstream feedback rules are frozen.
- [x] `实验基座` WorkOrder/result evidence integration rules are frozen.
- [ ] Portfolio governance, cross-board review, and primary-motive confirmation rules are implemented by T-094/T-095.
- [ ] `ImplementationHarness` and runtime governance contracts are implemented by T-099 and verified by T-101.
- [ ] `ImplementationFeedbackEvent` is implemented and wired to upstream recheck/feedback paths.
- [ ] Minimum queryable persistence fields are mapped by T-092 and tested by T-101.
- [ ] Trace-first, no-memo-as-evidence, failed-run-retention, and exploratory/confirmatory split are enforced in contracts/tests by T-097/T-101.
- [ ] Full implementation dossier path is proven by backend/API/read-model tests before UI is considered complete.

## Rollback
- If the package identity is wrong, remove `dev-docs/active/paper-implementation-full-landing/`, remove `T-091` and `R-013` from `.ai/project/main/registry.yaml`, then run governance sync.
