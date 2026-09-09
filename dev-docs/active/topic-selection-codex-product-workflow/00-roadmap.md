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
| Codex activation evidence | Keep C-2's same-corpus dependency versus qualify each enabled role using actual inputs and failure cases | Replace the inherited blanket corpus dependency for Codex with the qualification criteria below; retain optional calibration separately | decided | User approval, 2026-09-09 | Historical D-30 already removed C-1 sign-off from C-3; C-2's corpus coupling remains the explicit change proposed here | No constant-only flip, fabricated corpus or broad scientific-quality claim. |
| Role and stage integration | Shared invocation adapter with stage-specific composition versus bespoke executors | Reuse orchestrator/runner, resolve evidence and role bodies, deterministically derive final drafts, claim attempts in existing artifacts | decided | User-approved source-backed design | Architecture and 36-profile inventory, including v1a final synthesis and ordinary promotion | Open integrated slices; no global enum/profile widening without consumers and recovery. |
| Evidence convergence adoption | All downstream rounds gain retrieval versus connect the existing evidence-stage owner | Connect Codex execution at evidence convergence; keep downstream frozen input and existing loopback contracts | decided | Existing T-150 design; bounded opening scope | T-150 architecture and product evidence lineage | Additional downstream retrieval scenarios are not required to call the selection workflow complete. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Existing runner outcomes are enough for sequential model roles and product-owned round carry-over. | Consumer work may require a coordinated interface change. | T-152 completed at a5263023; source interface supports fresh attempts and shutdown. Still prove actual N6/N8 consumer runs. |
| Canonical APIs can compose the complete selection flow with bounded additions. | “Usable” could remain a set of internal services with no operating entry point. | Trace actual public callers and recovery endpoints for every stage; expose only missing composition needed by the workflow. |
| Existing artifact stable-key uniqueness can exclude duplicate metered attempts without a new persistence model. | A naïve idempotent create can let two callers both believe they own execution. | Verify winner ownership and duplicate/restart behavior against the relational repository before enabling CLI. |

### Codex qualification criteria

Apply one readiness rule to every enabled model/support role; adapt semantic assertions to its actual job. N6/N8 are not the only roles subject to it.

1. **Executable product contract:** canonical API compiles actual scoped input, consumes execution settings and launches Codex without externally supplied role answers. Deterministic and strict-human steps retain their owners.
2. **Role semantics:** the production prompt states the research task, evidence use, disagreement/insufficiency behavior and authority boundary. Review current text before changing it; preserve substantive later work such as promotion conditions and exact-delta refinement. Keep the existing prompt hash/version/drift discipline.
3. **Content evidence:** inspect real-input Codex outputs for each enabled semantic role, including normal sufficient evidence, insufficient evidence and a material disagreement/contradiction. A shared fixture or run may cover multiple roles when their distinct outputs are inspected. Record input/evidence refs, prompt/profile/model identity, expected behavior, actual findings and remaining limitations. Fixture-only/shape-only success cannot qualify model reasoning.
4. **Integrity and failure:** verify source/ref/hash checks, prior-output bodies, schema and semantic admission, no invented/erased material evidence, deterministic derived-draft provenance, exact Human stops, budget/tool scope and interruption/replay. Resolve material findings before activation.
5. **Honest rollout:** open only the proved consumer/profile slice and update its permanent contracts/docs together. A bounded qualification is evidence of supported behavior, not a statistical accuracy estimate, calibrated threshold, multi-provider diversity result or ResearchArena decision-quality activation.

Live checks use an explicit input set and recorded execution accounting policy. The user removed aggregate attempt/token/time ceilings on 2026-09-09; retain the product runtime timeout and actual/unknown usage. No arbitrary 100-example or multi-provider requirement carries over to this Codex route. Real research input/operational budget selection belongs to live verification preparation; it does not block local implementation and offline checks.

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
| C-2 six gated prompts | Carry prompt-readiness responsibility; replace same-corpus dependency for Codex approved 2026-09-09 | Historical six include ordinary N8 and promotion N2; later refinement is additional. Apply the approved qualification criteria to all enabled roles. No corpus or prompt-quality pass is claimed by planning. |
| C-3 live role outputs and bridge provenance | Carry for `codex_cli` across N6/N8 and the remaining workflow | Product starts the roles and preserves CLI provenance through deterministic admission and domain artifacts. |
| C-3 run mode and execution-spec handling | Carry wherever the Codex product route consumes these contracts | Canonical callers, profile admission and runtime input agree; no accepted-but-unconsumed configuration parameter. |
| C-3 activation of other `provider_llm` Debate paths | Explicitly deferred by the user | Remains disabled where disabled today; record the deferred intent when T-129 is retired, without forcing implementation into this task. |
| Old `calibration_gate_release` references | Reconcile as each Codex path becomes ready | Separate Codex readiness from deferred gateway activation; update affected code/tests/docs atomically, preserving actual semantic protections. |

T-129's successor handoff is recorded in e44e862c. Its current main-worktree record directs implementation here and preserves original C-2/C-3 non-completion and deferred gateway activation. Physical archival awaits reconciliation of its second checked-out occurrence; that administrative boundary does not block T-153 implementation.

## Implementation plan

### Phase 1 — Align full-workflow execution admission and settle the first slice
- Outcome: An exhaustive, source-backed node/role inventory and executable N6/N8 design, with the T-129 obligations assigned and the full-task completion boundary preserved.
- Approach: Trace current public caller → input/context → policy/profile → prompt → runner → admission → artifact → next checkpoint/recovery. Use the existing matrix and slot authorities.
- Planned changes:
  1. Inventory ordinary model, Debate and support roles across all stages, distinguishing deterministic and strict-human operations; identify every provider-only or external-output-only product dependency.
  2. Inspect current prompts/evidence packets and specify the concrete semantic and engineering checks for Codex admission, including insufficient evidence and disagreement.
  3. Design N6/N8 role execution and provenance bridges, configuration composition, failure/replay behavior and coordination with T-152.
  4. Review the now-drafted inventory, qualification decision and N6/N8 design. The approved T-129 successor handoff and deferred provider scope are now reconciled in its task records; runtime/policy activation waits for integrated implementation. Preserve original unmet claims when retiring the old record.
- Affected boundaries / entry points: existing workflow matrix/scenarios; node/slot policies; model-profile registry; `.ai/llm/topic-selection`; agent orchestrator; N6/N8 runtimes and run coordinator; T-129 records.
- Dependencies: Current source inventory and the runner interface; no new calibration corpus is presumed available.
- Exit criteria: No unidentified required model role; explicit Codex quality/admission criteria; first implementation slice executable; later stages remain required in status and roadmap.
- Verification: Focused source review, matrix consistency, task lint and reviewed design/acceptance traceability.
- Recovery: Keep all runtime gates unchanged until a reviewed integrated change is ready.

### Phase 2 — Deliver N6/N8 Codex execution and local recovery
- Closeout: Complete. Real regular/conditional/regeneration/refinement roles and default-profile product admission verified through attempt 91. CX-02 and this phase’s CX-06/CX-07/CX-08 boundary hold; scientific and Human-fixture limitations remain explicit in verification.md.
- Outcome: Product-driven ordinary N6 Debate, N8 assessment/conditional Debate and applicable regeneration/refinement paths, with complete provenance and honest failure handling.
- Approach: Reuse the existing role sequence and deterministic gates; replace operator-authored role responses at the product boundary with fresh Codex attempts.
- Entry points: v1b public runtime/coordinator APIs, N6/N8/refinement services, profiles, prompts and domain draft bridges.
- Revertible implementation units:
  1. Compile actual frozen evidence and prior-role bodies; extract deterministic draft recording/projection with accurate role-derived provenance. Add focused contract tests for the missing-body and extra-invocation hazards.
  2. Compose the app-owned runner/MCP lifecycle and stable attempt claims; prove duplicate requests and restart ambiguity cannot silently launch another call.
  3. Wire the discriminated canonical CLI request, consumed execution specification and regular N6 role sequence with aligned policy/profile/prompt contracts. Qualify normal, insufficient and conflicting evidence before opening the slice.
  4. Connect ordinary N8, conditional four-role Debate, N8 admission support, regeneration and exact-delta refinement; add the corresponding replay receipts and qualification evidence.
  5. Verify product-entry progression to the proper Human checkpoint and recovery/loopback; update operating guidance and affected permanent matrix/config/API documentation.
- Exit criteria: CX-02 and this slice of CX-06/CX-07/CX-08 hold; N6/N8-only success does not close the task.
- Verification: Focused role/admission/replay tests, real-input Codex checks and product-entry runs through the next human checkpoint, including non-advance and failure.
- Recovery: Disable only the new route while retaining trace/domain history and existing truthful operator paths.

Completed Phase 2 execution order:
1. Prepare a repeatable qualification entry using the canonical consumers: materialize pinned source bodies through existing evidence owners, inspect exact rendered requests, and account for aggregate attempts/tokens/time. This preparation can proceed without live calls.
2. Under the user-confirmed uncapped accounting policy, inspect actual role outputs for ordinary, insufficient, apparent-conflict and exact-delta cases. Exercise conditional/regeneration routes from actual producer results, or disclose isolated controlled setup; do not force an advancing verdict.
3. Open only qualified profiles with permanent policy/scenario/operator documentation, then verify canonical progression, Human stops and recovery. Keep ambiguous partial domain commits fail-closed pending authority inspection. The user has authorized Phase 3 after this closeout; Phases 4–5 require the next authorization.

### Phase 3 — Connect upstream evidence and need discovery (integration detail provisional)
- Current implementation: Sampling is enabled with stable submission recovery and real qualification. Original-abstract extraction and single/complete Debate need discovery are enabled after two real source cases and exact receipt replay; Need adjudication and exact Human-confirmation support now pass real qualification and JSON receipt replay; the three-role convergence chain now passes source-grounded CLI qualification, policy-boundary checks and exact replay; optional Arena also passes original-abstract qualification and exact replay. Original-paragraph extraction now composes real candidate admission through a fresh v1b consumer bundle. Full app checkpoint composition still requires correction of the restrictive portfolio wording and the empty CLI mechanism-payload schema, followed by comparative-candidate qualification.
- Outcome: Resource sampling, extraction, evidence convergence, need discovery/final synthesis, adjudication and human-confirmation support use Codex through product callers.
- Approach: Reuse canonical evidence/retrieval owners; re-evaluate provider-only final synthesis against the unified admission criteria; preserve human confirmation and successor-map boundaries.
- Revertible implementation units after Phase 2 closeout:
  1. Resource sampling and extraction: connect canonical request execution settings through `topic-selection-resource-sampling-service.ts` and `topic-selection-workflow-harness-service.ts` (using existing `topic-selection-v1a-llm-runtime-binding-service.ts` prompt/context bindings) to the app-owned runner. Sampling now has an enabled CLI profile, complete-ref guards and prepared-commit recovery; extraction compiles repository original abstracts through the same runner. Preserve deterministic filtering and stop ambiguous CLI attempts without automatic provider fallback.
  2. Need discovery and decision support: integrate single-agent generation, Explorer/DeepCritic/framing/final synthesis, adjudication and confirmation support. Single-agent and Debate need-discovery now compile source/strength/conflict bodies and carry prior-role outputs through the final CLI slot. Both original-abstract qualification cases pass with evidence-expansion outcomes and matching default profile hashes; adjudication and exact Human-confirmation support now pass bounded/overclaim and positive/incomplete qualification. Frozen source bodies, exact Human input, complete references and JSON persistence recovery are verified; remaining convergence/fresh-lineage work is below.
  3. Evidence convergence and optional Arena support: supply actual Codex outputs to the existing round/coordinator owners. The product CLI branch now generates three actual role outputs from verified packets, admits exact references, and preserves managed-library retrieval, EvidenceDelta, successor-map and linked-round authority. It rechecks execution boundaries and preserves exact blocked/completed replay; optional Arena now generates both independent roles from candidate bodies and verified original packets, with exclusive session claims and completion receipts. Optional Arena remains advisory and does not acquire decision-quality activation.
  4. Qualify each opened upstream role and compose canonical upstream progression into a fresh frozen v1b bundle. Verify material/no-delta/failed retrieval, quote integrity, non-advance, Human stops and recovery before enabling the proved profile slices and updating permanent operating contracts.
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

- Status: ready
- Authorized boundary: through phase 3
- [x] Decisions: Full-workflow outcome, Codex-only generation rollout and N6/N8-first sequencing were confirmed by the user on 2026-09-09.
- [x] Design: Source inventory, N6/N8 technical design and role-specific Codex qualification were approved by the user on 2026-09-09.
- [x] Route: Five phases reach the complete workflow; later integration details are explicitly provisional rather than descoped.
- [x] Verification: Stage coverage, real-model evidence and composed failure/recovery checks are specified in verification.md.

The user authorized Phase 2 closeout followed by Phase 3 implementation on 2026-09-09. Phases 4–5 remain required task work outside the current implementation authorization. Live-run accounting is recorded separately; this authorization does not claim completed model verification or Human research decisions.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| N6/N8 become an accidental completion boundary | Uncovered required roles remain in the inventory | Keep CX-01 and later phases required | Continue at the first unconnected stage. |
| CLI is admitted by a blanket enum/constant change | No public consumer or source-correct output bridge | Activate one integrated slice with policy/prompt/provenance checks | Disable that route while retaining attempt evidence. |
| Role packets contain hashes without reviewable content | Critic cannot cite supplied drafts/evidence despite passing shape checks | Resolve verified bodies before model calls; test role-specific context | Fail preparation and keep the route closed. |
| Final synthesis is regenerated or relabeled as external authoring | Extra runner call or incorrect source/output hash in the draft | Deterministic projection with explicit parent role/audit identity | Reject draft admission; retain valid role results for repair. |
| Duplicate or interrupted requests repeat metered work | Same logical attempt has multiple runner starts | Stable-key claim with exclusive ownership and terminal receipts | Expose ambiguity; new explicit attempt identity for retry. |
| Old corpus gating is either copied everywhere or silently removed | Prompt-quality claims have no role-specific rationale/evidence | Resolve inherited conditions explicitly in Phase 1 | Keep unsupported paths unavailable and preserve the unresolved obligation. |
| Fresh evidence invalidates downstream human decisions | In-place map or frozen-bundle changes | Reuse successor/linked-round owners and existing loopback | Preserve old decisions and require the next exact research decision. |
| External authoring or retrieval cost is hidden as non-provider work | Manual role outputs or missing operation-class accounting | Product launches roles; distinguish CLI generation from retrieval dependencies | Report an incomplete stage and retain failed trace/accounting. |
| T-152 and this task edit the same runtime files | Overlapping runner/orchestrator changes | Agree file ownership before concurrent implementation; no duplicate transport | Integrate verified interface changes before consumer rollout. |

## Phase closeout

- Review: Check the phase's real product outcome, role/evidence quality, strict-human boundary and no unresolved material findings; no automatic multi-agent panel is required for ordinary record work.
- Record update: Update current acceptance evidence, first unfinished action, inherited-obligation disposition and directly affected permanent docs.
- Checkpoint: Commit each verified, revertible unit with this task's single trailer; stage only owned paths and preserve concurrent T-152 work.
