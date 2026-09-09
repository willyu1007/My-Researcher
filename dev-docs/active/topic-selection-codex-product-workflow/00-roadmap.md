# Roadmap

## Scope and constraints

### In scope
- Complete the topic-selection product workflow with `codex_cli` as the model execution line, including existing ordinary model roles, Debate roles, semantic support and their recovery paths. N6/N8 are the first milestone, not the task boundary.
- Reconcile execution admission using the existing node policies, role/scenario policies, model-profile registry and maintained workflow matrix. Add no parallel policy registry or task-owned runtime gate.
- Execute model-backed Debate roles through Codex. The user's phrase “provider debate 要开 codex cli” selects product-driven `codex_cli`, not activation of the separate `provider_llm` gateway or reuse of operator-signed provenance.
- Replace the historical T-129 work organization for this route: qualify current prompts and complete runtime wiring under explicit, role-appropriate evidence requirements. Keep any remaining provider-specific work explicitly deferred.
- Reuse T-147's checkpoints, T-148's regular/recovery Debate and promotion support, T-150's evidence-convergence owners and T-151/T-152's runner boundary.
- Make the canonical API/operator flow usable without a human or external client supplying every model-role response. Include deployment composition and recovery guidance necessary for that outcome.

### Out of scope
- Activating or optimizing other LLM generation providers, multi-provider diversity, or requiring their rollout as a prerequisite for Codex.
- Reimplementing the Codex transport owned by T-152, building an autonomous conversational workflow owner, or sharing the developer's Codex sessions/home.
- Replacing deterministic gates or strict-human decisions with model authority; automatically accepting risk, selecting a research direction, or promoting a topic to satisfy a test.
- Inventing new Debate scenarios at reserved/rejected nodes, redesigning the selection DAG, or broadly moving mutable evidence convergence into downstream frozen question/value/promotion rounds.
- New external acquisition systems, retriever/embedding-provider replacement, full GUI redesign, and PaperImplementation/experiment/writing execution after topic-selection bridge/intake.
- Treating optional threshold calibration or ResearchArena decision-quality activation as a blanket release condition for all Codex roles. Their independent evidence claims are not established by executor integration.

### Constraints and dependencies
- Latest confirmed scope: user, 2026-09-09 — create a new task; prioritize Codex for model-backed Debate; N6/N8 may land first; completion must cover all topic-selection stages; other generation providers can wait.
- Existing node/slot restrictions are current runtime truth until deliberately reconciled. A new task record does not lift a guard, establish prompt quality or authorize incomplete activation.
- Frozen evidence, successor maps, checkpoint currentness, material objections and exact human intent remain owned by existing product services. A new role response cannot change those authorities by itself.
- T-152 owns runner transport and generated protocol bindings; this task owns consumers, policies and product composition. Coordinate interface changes before editing shared runner/orchestrator seams.
- Existing literature retrieval/embedding dependencies remain explicit. “Codex execution” does not imply that retrieval is free, offline, or implemented by Codex.
- Project placement: F-003, Agent Execution Lines & Tool Surface; the integration consumes F-001 research lifecycle contracts without opening another Feature.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Task-level outcome | One canary/node versus complete topic-selection operation | Full workflow; N6/N8 first | decided | User | 2026-09-09 scope correction | Later phases are required completion work, not optional follow-ups. |
| Model execution line | Gateway provider, externally authored Codex, product-driven Codex | `codex_cli`; defer other generation-provider activation | decided | User | 2026-09-09 explicit direction | Do not demand a separate provider path or mislabel CLI output as `provider_llm`/`codex_assisted`. |
| Policy authority | New universal registry versus alignment of existing policies | Reuse current node/slot/profile/scenario authorities and matrix checks | decided | Existing repository authorities; opening design | `topic-selection-workflow-matrix.md` and its passing consistency check | Readiness evidence belongs in verification, not a second writable product authority. |
| Human and deterministic steps | Automate model work versus automate research authority | Automate model work; compose existing deterministic steps and stop for exact human decisions | decided | Existing product contract, retained in user-approved scope | T-147/T-148 and continuation-envelope contracts | Full flow is human-in-the-loop, not a forced advancing topic. |
| Codex activation evidence | Keep the historical corpus/sign-off dependency wholesale versus role-appropriate checks | Audit inherited conditions; retain supported semantic checks and complete wiring, distinguish them from optional threshold tuning | proposed | Planning review grounded in current prompts and consumers | Phase 1 prompt inventory and activation criteria | No constant-only flip and no assertion that installing Codex makes prompt quality proven. |
| Role and stage integration | Shared invocation adapter with stage-specific composition versus bespoke executors | Reuse orchestrator/runner; resolve input/output and admission differences per role | proposed | Phase 1 design | Node/slot inventory including v1a final synthesis, evidence-convergence roles and promotion caller | Do not globally widen all enums/profiles without live consumers and recovery. |
| Evidence convergence adoption | All downstream rounds gain retrieval versus connect the existing evidence-stage owner | Connect Codex execution at evidence convergence; keep downstream frozen input and existing loopback contracts | decided | Existing T-150 design; bounded opening scope | T-150 architecture and product evidence lineage | Additional downstream retrieval scenarios are not required to call the selection workflow complete. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Existing runner outcomes are enough for sequential model roles and product-owned round carry-over. | Consumer work may require a coordinated T-152 contract change. | Inspect the settled runner interface and prove N6/N8 attempts before upstream rollout. |
| Canonical APIs can compose the complete selection flow with bounded additions. | “Usable” could remain a set of internal services with no operating entry point. | Trace actual public callers and recovery endpoints for every stage; expose only missing composition needed by the workflow. |
| The historical six-prompt list and release rationale may not match current role families. | A stale count could omit refinement/promotion roles or require obsolete work. | Resolve current `.ai/llm` prompt IDs, role schemas, source-context construction and quality checks in Phase 1. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-129 | successor for Codex execution and prompt-readiness work | Historical C-2/C-3 obligations are reconciled below; other gateway-provider activation is deferred | Complete the obligation disposition before retiring the old record; no false calibration or activation completion. |
| T-147 | builds-on | Checkpoint, human, objection, Arena advisory and downstream eligibility authorities | Executor changes must preserve existing decision/currentness semantics. |
| T-148 | builds-on | Regular N6, refinement delta, promotion support, risk conditions and supported recovery flows | Replace externally supplied model work without bypassing admission or changing the human decisions. |
| T-150 | integrates | Managed-library request, SearchRun, EvidenceDelta, successor map and linked-round owners | Evidence-stage integration only; do not mutate a frozen downstream bundle in place. |
| T-151 | derived-from | CLI execution contract, attempt trace, MCP evidence scope and canary foundations | Reuse real provenance; canary-local profile admission is not product readiness. |
| T-152 | coordinates-with | Runner transport/protocol lifecycle versus this task's product consumers and routing | Agree any shared interface edit and consume verified changes; do not duplicate transport implementation. |

### T-129 obligation disposition

| Historical obligation | Disposition in this task | Completion evidence / remaining boundary |
|---|---|---|
| C-1 optional N6/N8 threshold tuning | Remains optional; not an acceptance requirement here | No invented labels, benchmark results, calibrated thresholds or ResearchArena activation. |
| C-2 six gated prompts | Carry prompt-readiness responsibility, re-inventory against current roles and full-workflow scope | Role-specific real-input checks, inspectable evidence, stable drift anchors and no unresolved material review finding for enabled roles. Exact corpus/assessment requirements are settled in Phase 1, not waived by this opening. |
| C-3 live role outputs and bridge provenance | Carry for `codex_cli` across N6/N8 and the remaining workflow | Product starts the roles and preserves CLI provenance through deterministic admission and domain artifacts. |
| C-3 run mode and execution-spec handling | Carry wherever the Codex product route consumes these contracts | Canonical callers, profile admission and runtime input agree; no accepted-but-unconsumed configuration parameter. |
| C-3 activation of other `provider_llm` Debate paths | Explicitly deferred by the user | Remains disabled where disabled today; record the deferred intent when T-129 is retired, without forcing implementation into this task. |
| Old `calibration_gate_release` references | Reconcile as each Codex path becomes ready | Separate Codex readiness from deferred gateway activation; update affected code/tests/docs atomically, preserving actual semantic protections. |

T-129 remains historical/current evidence until its successor handoff is reconciled. This bundle does not mark its original completion claims as passed. Its eventual retirement must preserve the deferred gateway work and the reason its original release route was superseded.

## Implementation plan

### Phase 1 — Align full-workflow execution admission and settle the first slice
- Outcome: An exhaustive, source-backed node/role inventory and executable N6/N8 design, with the T-129 obligations assigned and the full-task completion boundary preserved.
- Approach: Trace current public caller → input/context → policy/profile → prompt → runner → admission → artifact → next checkpoint/recovery. Use the existing matrix and slot authorities.
- Planned changes:
  1. Inventory ordinary model, Debate and support roles across all stages, distinguishing deterministic and strict-human operations; identify every provider-only or external-output-only product dependency.
  2. Inspect current prompts/evidence packets and specify the concrete semantic and engineering checks for Codex admission, including insufficient evidence and disagreement.
  3. Design N6/N8 role execution and provenance bridges, configuration composition, failure/replay behavior and coordination with T-152.
  4. Reconcile T-129's successor handoff and deferred provider scope, then update only directly affected task/policy documentation. Runtime activation waits for the integrated implementation.
- Affected boundaries / entry points: existing workflow matrix/scenarios; node/slot policies; model-profile registry; `.ai/llm/topic-selection`; agent orchestrator; N6/N8 runtimes and run coordinator; T-129 records.
- Dependencies: Current source inventory and the runner interface; no new calibration corpus is presumed available.
- Exit criteria: No unidentified required model role; explicit Codex quality/admission criteria; first implementation slice executable; later stages remain required in status and roadmap.
- Verification: Focused source review, matrix consistency, task lint and reviewed design/acceptance traceability.
- Recovery: Keep all runtime gates unchanged until a reviewed integrated change is ready.

### Phase 2 — Deliver N6/N8 Codex execution and local recovery
- Outcome: Product-driven ordinary N6 Debate, N8 assessment/conditional Debate and applicable regeneration/refinement paths, with complete provenance and honest failure handling.
- Approach: Reuse the existing role sequence and deterministic gates; replace operator-authored role responses at the product boundary with fresh Codex attempts.
- Entry points: v1b public runtime/coordinator APIs, N6/N8/refinement services, profiles, prompts and domain draft bridges.
- Exit criteria: CX-02 and this slice of CX-06/CX-07/CX-08 hold; N6/N8-only success does not close the task.
- Verification: Focused role/admission/replay tests, real-input Codex checks and product-entry runs through the next human checkpoint, including non-advance and failure.
- Recovery: Disable only the new route while retaining trace/domain history and existing truthful operator paths.

### Phase 3 — Connect upstream evidence and need discovery (integration detail provisional)
- Outcome: Resource sampling, extraction, evidence convergence, need discovery/final synthesis, adjudication and human-confirmation support use Codex through product callers.
- Approach: Reuse canonical evidence/retrieval owners; re-evaluate provider-only final synthesis against the unified admission criteria; preserve human confirmation and successor-map boundaries.
- Exit criteria: CX-03 holds and a fresh approved upstream lineage can supply the frozen v1b input without manually authored model outputs.
- Verification: Evidence scope/quote integrity, material/no-delta/failed retrieval, linked-round recovery, role output admission, no-topic disposition and strict-human stops; real Codex evidence for enabled roles.
- Recovery: Preserve predecessors and exact Human decisions; route unresolved evidence to the existing owning stage.

### Phase 4 — Complete remaining selection, promotion and feedback roles (detail provisional)
- Outcome: Remaining v1b support and option-generation roles plus v1c promotion/conditions/feedback operate with Codex, and deterministic package/bridge/intake joins remain usable.
- Approach: Complete the Phase 1 inventory; preserve optional support and deterministic fast paths, required risk-bearing Debate and exact human decisions.
- Exit criteria: CX-04/CX-05 hold; no required stage depends on manually supplied role responses or another generation provider.
- Verification: Product-entry checks for human support versus authority, risk/no-risk promotion, grouped condition coverage, non-promote outcomes, downstream invalidation and feedback/recheck.
- Recovery: Keep decisions immutable; retain explicit failed support and route repairs through existing authorities.

### Phase 5 — Verify the complete human-in-the-loop product workflow
- Outcome: A recoverable, documented whole-flow Codex operating path from literature/evidence to topic promotion/bridge/intake and feedback, with all acceptance references closed by appropriate evidence.
- Approach: Compose the canonical APIs and check the entire node/role inventory; distinguish controlled fixtures, live model results, genuine human decisions and optional calibration claims.
- Exit criteria: CX-01 through CX-09 and the repository completion contract hold. No remaining stage is deferred merely because N6/N8 work; no temporary competing policy or configuration authority remains.
- Verification: Whole-flow composed execution, representative real-model stage coverage, rejection/no-topic and loopback cases, interruption/recovery, policy/schema/type checks, relevant API tests and updated operating guidance. Do not force a real research candidate to advance for coverage.
- Recovery: Keep stage-level verified checkpoints and traces; report the exact unresolved stage instead of claiming full-flow completion from a partial canary.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [x] Decisions: Full-workflow outcome, Codex-only generation rollout and N6/N8-first sequencing were confirmed by the user on 2026-09-09.
- [ ] Design: Current role inventory, Codex activation evidence and N6/N8 consumer/runner interfaces must be settled before implementation.
- [x] Route: Five phases reach the complete workflow; later integration details are explicitly provisional rather than descoped.
- [x] Verification: Stage coverage, real-model evidence and composed failure/recovery checks are specified in verification.md.

The current request authorizes opening this full-scope task package. Runtime implementation starts only after the pending design is resolved and an implementation boundary is recorded; no paid live run, Human research decision or environment change is implied by task creation.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| N6/N8 become an accidental completion boundary | Uncovered required roles remain in the inventory | Keep CX-01 and later phases required | Continue at the first unconnected stage. |
| CLI is admitted by a blanket enum/constant change | No public consumer or source-correct output bridge | Activate one integrated slice with policy/prompt/provenance checks | Disable that route while retaining attempt evidence. |
| Old corpus gating is either copied everywhere or silently removed | Prompt-quality claims have no role-specific rationale/evidence | Resolve inherited conditions explicitly in Phase 1 | Keep unsupported paths unavailable and preserve the unresolved obligation. |
| Fresh evidence invalidates downstream human decisions | In-place map or frozen-bundle changes | Reuse successor/linked-round owners and existing loopback | Preserve old decisions and require the next exact research decision. |
| External authoring or retrieval cost is hidden as non-provider work | Manual role outputs or missing operation-class accounting | Product launches roles; distinguish CLI generation from retrieval dependencies | Report an incomplete stage and retain failed trace/accounting. |
| T-152 and this task edit the same runtime files | Overlapping runner/orchestrator changes | Agree file ownership before concurrent implementation; no duplicate transport | Integrate verified interface changes before consumer rollout. |

## Phase closeout

- Review: Check the phase's real product outcome, role/evidence quality, strict-human boundary and no unresolved material findings; no automatic multi-agent panel is required for ordinary record work.
- Record update: Update current acceptance evidence, first unfinished action, inherited-obligation disposition and directly affected permanent docs.
- Checkpoint: Commit each verified, revertible unit with this task's single trailer; stage only owned paths and preserve concurrent T-152 work.
