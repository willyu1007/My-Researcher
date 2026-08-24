# Implementation Notes

Implementation is complete for T-107. v1b has shared harness contracts, policy/runtime admission, and harness-native N1-N11 runners from frozen v1a bundle intake through v1c input bundle publication.

## Initial Notes
- Created this package to carry v1a WorkflowHarness normalization standards into v1b.
- This task should start with code/current-state mapping before any runtime changes.

## 2026-05-25 Current-State Mapping
- Completed a read-only pass across v1b contracts, services, repositories, routes, tests, offline replay, and archived v1b task packages.
- Confirmed that v1b service-level authority coverage is substantial; the hardening work should not duplicate the legacy child packages.
- Confirmed primary gaps are normalized `WorkflowHarness` runners, node policy, invocation-slot alignment, profile-registry ownership, and harness-level replay/idempotency evidence.
- Locked initial Node 1 boundary: v1b intake snapshot is deterministic and must not perform new semantic understanding or semantic structure assignment.
- Captured the initial node inventory and gap matrix in `06-current-state-mapping.md`.

## 2026-05-25 Node 2 Policy Discussion
- Locked Node 2 as `topic-selection.v1b.record-research-constraint-profile.v1`.
- Classified Node 2 as human/delegated semantic assignment plus deterministic recording.
- Confirmed Node 2 may record semantic structure but must not autonomously generate final semantic authority.
- Confirmed Codex/provider output is allowed only as pre-node advisory material until a human/delegated actor accepts or edits it into the final payload.
- Defined `requires_human_review` behavior for missing accepted profile payload.
- Captured harness input, actor policy, deterministic gates, replay hash, idempotency, handoff, and acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 N2/N3 Provider Spec Discussion
- Added explicit provider-spec policy for deterministic nodes so N2/N3 cannot accidentally accept direct model provider settings.
- Locked N2 provider semantics around `authority_input_provider`; human/delegated providers can write product authority, fixtures are test/acceptance-only, and Codex/provider outputs remain advisory until accepted.
- Locked N3 provider semantics around `support_snapshot_provider_ref` and `policy_provider_id`; N3 does not call models and must not query mutable risk/recheck state as gate truth.
- Added the proposed `TopicSelectionV1bReadinessSupportSnapshot@v1` minimum content for N3 harness execution.
- Locked N3 as the gate that opens Node 4 invocation admission without resolving provider/model/timeout itself.

## 2026-05-25 N3 Machine Contract Simplification
- Simplified N3 classification to serve harness orchestration and Node 4 LLM context hygiene rather than human review display.
- Replaced detailed blocker/warning enums with five stable `block_reasons`, four `repair_route` values, and five `warning_context` values.
- Locked `can_invoke_next` as the primary N3 automation gate.
- Confirmed detailed causes belong in `details`, not expanded top-level state enums.
- Confirmed N3 warning context must enter the Node 4 context packet hash so LLM prompt construction cannot silently drop risks, gaps, memory, weak constraints, or evidence maturity context.

## 2026-05-25 Node 4 Policy Discussion
- Locked Node 4 as `topic-selection.v1b.generate-research-slice-options.v1`.
- Classified Node 4 as model-like candidate generation plus deterministic authority gate.
- Confirmed the LLM function is bounded `ResearchSliceOptionDraft` generation only; it cannot select the final slice, write authority, re-evaluate readiness, repair upstream context, or choose provider/model/timeout.
- Locked the three-layer boundary: `WorkflowHarness` validates node admission and replay, `AgentOrchestrator` owns mocked/Codex/provider invocation, and deterministic gate owns authority write admission.
- Locked profile id `topic-selection.research-slice-options.single-agent.v1`, with single-agent execution, no debate, no semantic retry, and no automatic provider fallback.
- Simplified N4 machine state to five block reasons, four repair routes, and four warning context values for harness/LLM use.
- Captured N4 deterministic domain gate, replay hash, idempotency, N5 handoff, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 Node 5 Policy Discussion
- Locked Node 5 as `topic-selection.v1b.select-research-slice.v1`.
- Classified Node 5 as selection authority boundary plus deterministic materialization.
- Confirmed N5 should stay simple: it does not generate options, does not run provider LLMs, and does not infer authority from N4 `recommended_option_ref`.
- Allowed human/delegated authority input, plus test/acceptance fixtures.
- Added the product exception requested in discussion: a human/delegated grant may authorize Codex as a delegated reviewer to inspect the frozen option set and provide an accepted selection payload.
- Kept Codex delegation scoped and auditable: delegation ref, review invocation ref, delegation scope hash, no provider LLM, no `model_option_id`, no fallback, no debate, and deterministic gate still required.
- Captured N5 allowed decisions, authority provider policy, deterministic gate, replay hash, idempotency, N6 handoff, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 N6-N8 Iteration Frame Discussion
- Classified N1-N5 as the mostly linear path to selected `ResearchSlice`.
- Classified N6-N8 as the argument viability loop where TopicQuestion formation, contract materialization, and value assessment can challenge earlier choices.
- Confirmed N6 and N8 are the two LLM-deep nodes in this segment; N7 is the selection/contract authority boundary and should stay deterministic by default.
- Locked the iteration rule: N6-N8 may emit typed append-only loopback signals, but must not mutate or rewrite N1-N5 authority.
- Defined compact loopback targets and reasons for harness routing rather than human review display.
- Confirmed ordinary N6/N8 semantic dissatisfaction should not loop back to N1; fresh intake is reserved for root lineage/hash/staleness failures.
- Captured the iteration frame, loopback signal contract, replay hash, and routing rules in `07-node-policy-alignment.md`.

## 2026-05-25 N6 Debate Admission Discussion
- Locked N6 default mode as single-agent candidate generation.
- Confirmed debate is supported only through explicit deterministic harness admission, not Codex/provider free-form semantic self-selection.
- Defined advisory `debate_recommendation` as non-authority metadata and `debate_admission` as the only mode-switching contract.
- Added compact hard-rule trigger reasons for debate admission.
- Locked sticky debate behavior: once an N6 lineage enters debate mode, retries stay debate until success, max-attempt policy, deterministic block, typed loopback, or explicit closure.
- Confirmed debate failure should route through typed loopback rather than automatic downgrade to single-agent.
- Captured debate execution boundary, failure routing, and replay hash components in `07-node-policy-alignment.md`.

## 2026-05-25 N6 Question Gate Discussion
- Confirmed N6 candidate quality cannot be fully protected by schema validation or purely structural deterministic checks.
- Split N6 gate into structural deterministic gate, semantic review slot, and final deterministic admission gate.
- Classified boundary fit, practical answerability, claim ceiling fit, evidence relevance, baseline/metric fit, and falsification usefulness as semantic-review concerns.
- Locked semantic review as an invocation slot that emits structured verdicts only; it cannot edit candidates, select questions, materialize contracts, or write candidate-set authority.
- Confirmed semantic review verdicts must enter replay/idempotency hashes and candidate-set warning context.
- Captured N6 question gate sequence, review output contract, final admission rules, block reasons, repair mapping, and replay hash components in `07-node-policy-alignment.md`.

## 2026-05-25 N6 Loopback Triage Discussion
- Accepted Codex participation in N6 failure routing as a scoped loopback triage slot.
- Classified Codex triage as advisory failure classification and route recommendation, not authority or route execution.
- Locked harness ownership over deterministic route normalization: route matrix validation, hard debate admission checks, max-attempt policy, sticky-debate policy, and append-only loopback creation.
- Confirmed Codex may judge candidate-level versus upstream-level failure, local versus systemic claim mismatch, boundary failure scope, evidence-gap scope, and whether debate admission appears applicable.
- Confirmed Codex may not modify candidates, mutate upstream authority, create attempts, override policy, or directly execute route transitions.
- Captured triage output contract, deterministic normalization rules, and replay hash additions in `07-node-policy-alignment.md`.

## 2026-05-25 N6 Candidate Surface Discussion
- Simplified N6 downstream surface for workflow robustness.
- Rejected promoting every blocked draft into a normal selectable workflow object.
- Locked candidate-set authority as the compact N7 selection surface: admissible candidates, warning context, candidate-set hash, and generation/review audit refs.
- Locked blocked drafts into compact failure context for LLM loopback triage: dominant reason, scope, affected refs, and generation/review hashes.
- Confirmed full structured LLM output remains traceable through invocation artifacts and hashes, but is not part of the default N7 prompt/context surface.
- Captured the candidate-set surface, failure context shape, and N7 consumption rules in `07-node-policy-alignment.md`.

## 2026-05-25 N6 Debate Model Pairing Discussion
- Confirmed v1a already defines two named debate model pairing profiles: `mixed-cost-control` and `provider-diverse-deep`.
- Locked N6 ordinary default as single-agent, not debate.
- Locked N6 debate default after hard admission as `mixed-cost-control`.
- Reserved `provider-diverse-deep` for explicit quality review/canary runs.
- Preserved the v1a boundary that Codex may participate heavily in explorer/deep-critic/issue-framing, while arbiter final synthesis remains provider-backed.
- Confirmed DeepSeek V4 thinking is a manual worker option for explorer/deep-critic only, not the default anchor and not arbiter final synthesis.
- Captured N6 debate pairing profiles and replay hash additions in `07-node-policy-alignment.md`.

## 2026-05-25 Node 7 Candidate Trial Coordination Discussion
- Expanded N7 from simple deterministic materialization into question-contract authority plus candidate trial coordination.
- Kept the main workflow single-contract: N6 may produce multiple candidates, but N7 admits one candidate per trial and N8 evaluates one active `TopicQuestionContract`.
- Accepted Codex participation only in two coordination slots: N7A candidate relation grouping and N7C failed-trial synthesis.
- Locked N7B as the only authority-write path; it remains deterministic and rejects provider LLM/model config, automatic fallback, and debate config.
- Added candidate relation classes: `near_duplicate`, `same_topic_variant`, and `distinct_sibling_topic`.
- Confirmed distinct sibling topics should be preserved as future opportunities, not automatically branched into package or v1c handoff authority.
- Added a trial ledger so N8 failure can route back to N7 for another candidate, while failed contracts remain historical and append-only.
- Locked all-candidate or max-trial exhaustion as the point where N7C synthesizes compact failure context for N6.
- Captured provider spec, required harness input, deterministic gates, N8 handoff, replay hash, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 Node 7 Machine Contract Discussion
- Converted the N7 sequential trial flow into a machine-consumable transition result for `WorkflowHarness` and the orchestration layer.
- Added explicit `machine_status`, `event`, `next_action`, `can_invoke_n8`, active/next candidate refs, trial ledger refs, loopback target, and orchestration cursor hash.
- Locked the consumption rule: orchestration must route by enum fields and refs/hashes, not by natural-language rationale.
- Confirmed `AgentOrchestrator` may be invoked only for N7A grouping and N7C failed-trial synthesis.
- Confirmed N7B contract materialization remains deterministic harness execution, and N8 may run only when `can_invoke_n8=true` with a non-null active contract ref.
- Added machine-result fields to replay hash and acceptance coverage in `07-node-policy-alignment.md`.

## 2026-05-25 Node 8 Handoff And Trial Policy Discussion
- Locked N8 as a single-active-contract evaluator: one invocation consumes one frozen N7-to-N8 handoff for one active `TopicQuestionContract`.
- Expanded the N7 handoff to include N8 handoff ref/hash, trial index/cap, remaining candidates, selected slice hash, answerability/method/evidence/baseline requirement refs, warnings, residual risks, sibling opportunities, and candidate trial policy.
- Confirmed N8 must not query latest candidate set, latest trial ledger, or current contract as mutable state.
- Added structured `N8ToN7Feedback` so N8 failures become typed trial-ledger events rather than natural-language routing.
- Locked the baseline candidate trial policy as `stop_on_first_pass`.
- Confirmed trial policy belongs to N7/harness, not N8; future multi-pass collection must be an explicit N7/harness policy and must not change N8's single-contract contract.
- Confirmed N8 pass advances to deterministic disposition handoff, while N8 failure routes through N7/N7C/N6 or upstream by typed scope/reason and route matrix.
- Captured N8 replay hash components and locked decision in `07-node-policy-alignment.md`.

## 2026-05-25 Node 8 Responsibility And Gate Ownership Discussion
- Locked N8 execution as deterministic preflight, `AgentOrchestrator` value-assessment draft, then deterministic value gate.
- Defined the LLM responsibility boundary: produce a structured `N8ValueAssessmentDraft` for one frozen handoff, including value, answerability, evidence, method, risk, failure scope, reason code, carry-forward warnings/risks, affected refs, and rationale hash.
- Confirmed the LLM cannot write `TopicValueAssessment`, choose next candidate, decide final disposition, create package/v1c handoff, mutate upstream authority, or route by natural-language rationale.
- Clarified deterministic value gate ownership: `WorkflowHarness` N8 runner executes the gate through a pure deterministic gate component; `AgentOrchestrator` only invokes the model and returns draft/provenance.
- Confirmed provider LLM, Codex, routes, and repositories do not own the gate; repositories persist only after harness gate admission.
- Added gate checks for handoff integrity, required axes, warning/residual-risk carry-forward, affected refs, scope/reason consistency, authority overreach, and N9 handoff readiness.
- Added gate result shape, replay hash additions, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 N7/N8 Debate Admission Discussion
- Expanded N7 responsibilities to include N8 debate admission ownership in addition to question-contract authority and candidate-trial coordination.
- Added N7D as an optional Codex-assisted semantic admission review step; Codex may score axes, while `WorkflowHarness` deterministically normalizes the score into an N8 debate profile.
- Confirmed N8 must not decide its own debate level. It consumes frozen `N8DebateAdmission` from the N7 handoff or retry execution spec.
- Locked N8 default debate level as `compact_assessment_debate` with profile `topic-selection.value-assessment.debate.mixed-cost-control.v1`.
- Locked deep debate level as `provider_diverse_deep_debate` with profile `topic-selection.value-assessment.debate.provider-diverse-deep.v1`.
- Defined hard deep triggers: explicit run profile, provider canary, and repeated N8 nonconvergence.
- Reworked semantic admission axes to combine N6/N7 output signals with N8 goals: value upside potential, answerability/boundary instability, claim-ceiling sensitivity, evidence/method dependency, and risk carry-forward sensitivity.
- Added a high-value protection rule: `value_upside_potential=2` deepens the N8 debate to avoid premature rejection of high-upside but unstable topics.
- Confirmed debate admission affects only N8 model invocation profile; it does not alter N8 authority boundaries, disposition authority, or package creation rules.
- Captured N7 handoff additions, N8 debate policy, normalization thresholds, replay hash additions, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 Node 8 Machine Contract Discussion
- Converted N8 control flow into a machine-consumable contract for `WorkflowHarness` and orchestration.
- Kept the public status small: `ready`, `succeeded`, `feedback_ready`, `retry_ready`, and `blocked`.
- Added detailed machine statuses and next actions for model invocation, value gate execution, N9 handoff, N7 feedback, same-handoff retry, N7D debate readmission, and block.
- Locked failure separation: technical failure, gate rejection, and value-not-supported are distinct and must not share trial-ledger behavior.
- Confirmed technical failures and gate-rejected drafts do not mark the N7 candidate trial as semantically failed.
- Confirmed repeated compact gate rejection requests N7D debate readmission through harness, while N8 never upgrades itself.
- Added N9 invocation gate and N7 feedback gate so downstream orchestration consumes typed flags/refs/hashes only.
- Added baseline complexity caps: one technical retry, one gate retry, and one deep readmission per handoff.
- Added replay hash additions and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 Node 8 Retry And Readmission Discussion
- Locked N8 retry counters to the same `n8_handoff_hash`.
- Separated technical retry, gate retry, and debate readmission into distinct policies.
- Confirmed technical failures retry the same handoff with the same `N8DebateAdmission`; they do not write `TopicValueAssessment`, emit N7 feedback, update N7 trial ledger, or trigger debate readmission.
- Confirmed gate rejection retries the same handoff with deterministic gate feedback in prompt context, while preserving debate level and avoiding semantic trial failure.
- Confirmed repeated compact gate rejection may request N7D debate readmission and freeze a new retry execution spec with a new `N8DebateAdmission` hash.
- Confirmed provider timeout/error/unparseable response and route/repository failures are technical failures, not semantic deep-debate triggers.
- Locked terminal policy: exhausted technical retry blocks or requires external retry, exhausted compact gate retry may request N7D readmission, and deep debate gate rejection blocks or requires review rather than auto-escalating again.
- Added retry policy replay hash coverage in `07-node-policy-alignment.md`.

## 2026-05-25 Node 8 Downstream Routing Surface Discussion
- Simplified N8 downstream output for machine routing rather than human review or audit display.
- Locked the main workflow surface to exactly one `N8DownstreamOutput`: either `n9_handoff` or `n7_feedback`.
- Reduced N8-to-N9 handoff to disposition inputs required by N9: value assessment ref/hash, topic question contract ref/hash, trial ledger ref/hash, supported status, warning/risk context, gate result hash, and policy version.
- Reduced N8-to-N7 feedback to trial-routing inputs required by N7: trial result, failure scope, reason code, affected refs, value assessment ref/hash, gate result hash, and policy version.
- Confirmed raw LLM draft, debate transcript, detailed rationale, candidate alternatives, sibling opportunities, and full audit payload do not enter the normal routing surface.
- Confirmed technical failure and gate rejection do not emit N7 feedback.
- Added downstream output to the N8 machine result, replay hash, and acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 N8 Semantic Normalization For N9 Discussion
- Confirmed N8 has semantic output because value, evidence, method, answerability, and risk are semantic judgments.
- Locked the boundary that N9 must not call an LLM to interpret N8 raw semantic output or rationale.
- Required the N8 deterministic gate to normalize semantic assessment into machine-consumable `N8DispositionSignal` before emitting N9 handoff.
- Added `value_strength`, `risk_signal`, `condition_codes`, `warning_codes`, and `residual_risk_codes` to the N8-to-N9 handoff.
- Confirmed raw LLM draft, debate notes, and rationale remain outside the N9 routing surface.

## 2026-05-25 Node 9 Disposition Discussion
- Locked N9 as `topic-selection.v1b.decide-value-disposition.v1`.
- Classified N9 as deterministic value disposition authority.
- Confirmed N9 consumes only the frozen N8-to-N9 handoff and normalized `N8DispositionSignal`; it must not call LLMs or interpret raw N8 semantic output.
- Confirmed N9 writes `ValueDisposition` only and does not create package or v1c handoff authority.
- Added N9 scheduling gate: N9 can run only when N8 machine output is `n9_handoff_ready`, `can_invoke_n9=true`, and downstream output is `n9_handoff`.
- Defined deterministic disposition decisions: `advance_to_package_candidate`, `advance_with_conditions`, `park`, `reject`, and `loopback`.
- Added N9 machine result and N10 invocation gate, keeping non-advance outcomes from package creation.
- Confirmed N9 traceability through source handoff hash, value assessment hash, gate result hash, N8 debate admission hash, N7 handoff hash, N6 candidate set hash, and upstream lineage hashes.
- Captured provider spec, frozen input, deterministic rules, replay hash, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-25 N9/N10 Boundary Discussion
- Clarified the N9/N10 split: N9 decides deterministic value disposition, while N10 creates the draft topic package.
- Added `N9DownstreamOutput` and `N9ToN10PackageHandoff` so only `advance_to_package_candidate` and `advance_with_conditions` can schedule N10.
- Confirmed `park`, `reject`, and `loopback` produce no N10 handoff and cannot create package authority.
- Locked N10 as `topic-selection.v1b.create-draft-topic-package.v1`.
- Classified N10 as deterministic draft topic package authority.
- Confirmed N10 consumes only frozen N9-to-N10 package handoff and must not call LLMs, reinterpret value/risk, modify N8/N9 authority, or create v1c handoff authority.
- Added N10 package gate for advance decision, source hash matching, structured conditions, duplicate package guard, and no raw provider output.
- Added N10 machine result, v1c handoff invocation gate, traceability chain, replay hash, idempotency policy, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-26 Node 1 Full Policy Discussion
- Locked N1 as `topic-selection.v1b.create-intake-snapshot.v1`.
- Classified N1 as the deterministic frozen root for v1b.
- Confirmed N1 consumes only explicit v1a bundle refs/hashes and must not query latest v1a state for semantic repair.
- Confirmed N1 performs no semantic understanding, constraint assignment, model invocation, downstream planning, package creation, or v1c handoff creation.
- Added N1 provider spec, frozen input, snapshot authority shape, compact blocker/warning codes, machine result, N2 handoff, replay hash, idempotency policy, and harness acceptance cases in `07-node-policy-alignment.md`.

## 2026-05-26 Phase 4B Harness-Native N4 Runner
- Implemented the N4 runner for `topic-selection.v1b.generate-research-slice-options.v1` inside `TopicSelectionV1bWorkflowHarnessService`.
- N4 consumes only frozen N3/N2/N1 authority refs and hashes plus a frozen `n4_research_slice_option_draft` semantic artifact. `execution_spec` alone is admitted by runtime policy but cannot execute a live model in Phase 4B.
- Added shared DTO/schema coverage for `TopicSelectionV1bN4HarnessFrozenInputPayload` and `TopicSelectionV1bResearchSliceOptionSetDraftPayload`.
- N4 resolves persisted frozen ArtifactRefs for support, normalized output, and provenance; artifact checksums and normalized draft hashes must match semantic artifact provenance before deterministic gating.
- Added deterministic gates for upstream authority hash drift, readiness not ready, duplicate option keys, missing comparison axes, missing boundaries, target-community drift, non-goal leakage, missing/unknown inherited evidence refs, claim-ceiling violations, blocked recommended options, and no selectable option.
- Successful N4 writes `PlanResearchSliceRun`, `ResearchSliceOptionSet`, and `ResearchSliceOption` records through the existing v1b research-slice repository, then emits an `N4ToN5Handoff` with authority/handoff hashes.
- N4 warnings are machine-oriented and compact: high-risk option, human-review-required option, missing option type carry-forward, and unresolved option disagreement carry-forward.
- N4 does not call `TopicSelectionV1bResearchSliceService`, `BackendLlmGateway`, `AgentOrchestrator`, Codex, provider LLM, HTTP routes, or Prisma migrations.
- N5-N11 remained outside the Phase 4B runner slice after policy/runtime admission.
- Confirmed N2 must consume explicit N1 handoff and cannot read latest intake snapshot.

## 2026-05-26 Node 6 Formal Policy Discussion
- Consolidated N6 into `topic-selection.v1b.generate-topic-question-candidates.v1`.
- Classified N6 as topic-question candidate generation authority.
- Confirmed N6 consumes only frozen N5 selected-slice handoff and must not query latest selected slice, current constraint profile, latest readiness assessment, or mutable option-set state.
- Expanded the N5-to-N6 handoff with source option hashes, constraint profile refs/hashes, readiness assessment refs/hashes, and residual-risk context so N6 can run from frozen inputs.
- Locked N6 execution sequence: deterministic preflight, debate admission/profile resolution, `AgentOrchestrator` generation, structural gate, semantic review slot, final deterministic admission gate, then candidate-set authority or typed loopback.
- Confirmed N6 may use LLM/debate but cannot write `TopicQuestionContract`, value assessment, disposition, package, or v1c handoff authority.
- Locked the downstream surface to compact `TopicQuestionCandidateSet`: admissible candidates, warning context, invocation/review hashes, and compact blocked-candidate context.
- Confirmed N7 consumes only explicit N6 handoff and admissible candidate refs; blocked drafts are not selectable.
- Added N6 machine result, loopback policy, replay hash, idempotency policy, and harness acceptance cases in `07-node-policy-alignment.md`.
- Corrected the N6-N8 role table so N8 owns value assessment only and N9 owns disposition.

## 2026-05-26 Node 11 Terminal Publication Discussion
- Locked N11 as `topic-selection.v1b.publish-v1c-input-bundle.v1`.
- Classified N11 as deterministic terminal v1b handoff publication.
- Confirmed N11 consumes a ready `DraftTopicPackage` from N10 and publishes a frozen `V1cInputBundle`.
- Confirmed N11 is not v1c promotion, gate support, bridge creation, paper-project intake, or implementation authority.
- Renamed N10 next action to `invoke_n11_v1c_handoff_publication` to make the N10/N11 boundary explicit.
- Added N11 provider spec, scheduling gate, frozen input, deterministic publication gate, output authority, machine result, traceability chain, replay hash, idempotency policy, and harness acceptance cases in `07-node-policy-alignment.md`.
- Confirmed N11 stops v1b and v1c owns promotion/bridge/downstream authority.

## 2026-05-26 Global Harness Route Matrix Discussion
- Locked the v1b route matrix as a `WorkflowHarness` finite-state policy rather than an advisory process diagram.
- Confirmed node runners must return machine statuses, next actions, handoff refs/hashes, route reason codes, and budget cursor data, but must not call downstream nodes directly.
- Confirmed `WorkflowHarness` is the only scheduler; route handlers, services, repositories, `AgentOrchestrator`, Codex, and provider LLMs must not choose ad hoc downstream nodes.
- Added a route decision shape with `route_id`, source attempt, source output hash, target node, handoff hash, route reason code, budget key, policy version, and route hash.
- Added the mainline allowlist from N1 through N11 and the terminal v1c entry edge.
- Added the repair and loopback allowlist, including N3 snapshot/profile repair, N4/N5 regeneration loops, N6 debate escalation, N7 candidate trials, N8 feedback, N9 typed loopback, and N10/N11 duplicate handling.
- Locked the N6-N8 region as the only controlled iterative state machine in v1b, with N7 as the coordinator and N8 returning only typed feedback.
- Added route budgets and acceptance cases so retry, debate escalation, candidate trials, regeneration, and loopback behavior remains bounded and replayable.

## 2026-05-26 Codex Semantic Support Matrix Discussion
- Reframed Codex as the default semantic support provider for v1b semantic work, while keeping `WorkflowHarness` as the only scheduler and deterministic gates as the only authority admission path.
- Added `semantic_support_provider` as a separate provider class from `model_invocation_provider`.
- Locked mutually exclusive semantic execution modes: `none`, `codex_assisted`, `provider_llm`, `mocked_llm`, and `human_delegated`.
- Added `CodexSemanticSupportArtifact` as the normalized support artifact shape consumed by deterministic gates and route policy.
- Added the global invocation/profile matrix for N1-N11, making Codex the default support path for N2/N3/N4/N5/N6/N7/N8 where semantic processing exists.
- Confirmed `model_option_id` remains valid only under `provider_llm`, with provider/model/timeout resolved from the profile registry.
- Updated N2 so Codex may draft or repair constraint profiles under scoped delegation, but `ResearchConstraintProfile` authority still requires accepted payload plus deterministic gate.
- Updated N3 so Codex may classify blocker/warning/repair-route context, but `can_invoke_next` remains deterministic.
- Updated N5 so Codex may be the default semantic reviewer for selection under delegation, while provider LLM remains invalid.
- Updated N7 so Codex is the default processor for grouping, failed-trial synthesis, and N8 debate admission scoring, while N7B materialization remains deterministic.
- Updated N8 so Codex-assisted compact debate is the default value assessment path; provider LLM is reserved for admitted canary/deep profiles.

## 2026-05-26 Codex Semantic Support Adapter Contract Discussion
- Locked a single v1b Codex adapter contract so individual nodes do not create bespoke Codex/provider paths.
- Defined the required call path: `WorkflowHarness -> SemanticSupportAdapter or AgentOrchestrator -> Codex -> deterministic normalizer -> node deterministic gate`.
- Separated N4/N6/N8 model-like Codex drafts through `AgentOrchestrator` from N2/N3/N5/N7 lighter semantic support through `SemanticSupportAdapter`.
- Added `SemanticSupportSlotSpec` with slot id, node id, profile id, input refs/hash, output contract, allowed effect, target gate, fallback policy, and slot policy version.
- Limited Codex effects to `support_only`, `delegated_payload_candidate`, and `model_draft_for_gate`.
- Added a T-107 slot allowlist for N2, N3, N4, N5, N6, N7, and N8.
- Defined `SemanticSupportAdapterResult` as a non-authority artifact that must be admitted by a node gate before it affects authority or routing.
- Added deterministic normalization rules, replay/idempotency components, failure semantics, and adapter-level harness acceptance cases.

## 2026-05-26 Deterministic Gate And Recovery Matrix Discussion
- Confirmed deterministic gates must cover success and recovery/blocking outcomes, not only happy-path validation.
- Added `DeterministicGateResult` with `admitted`, `admitted_with_warnings`, `blocked`, `retryable_failure`, `requires_human_review`, and `terminal_no_advance`.
- Locked the boundary that gates consume frozen input and normalized semantic artifacts, but do not call Codex/provider, generate semantic content, schedule downstream nodes, or write downstream authority.
- Added per-node gate matrix for N1-N11, including each gate's inputs, admitted authority, route signal, and recovery/block outcomes.
- Clarified that semantic non-pass is not automatically technical failure; for example N8 may write a valid `TopicValueAssessment` with `value_not_supported` and route typed feedback to N7.
- Added recovery rules aligning gate outcomes with route matrix budgets, typed loopbacks, human/delegated wait states, terminal no-advance, and warning carry-forward.
- Added gate-level harness acceptance cases for single gate result emission, warning carry-forward, missing payload waits, unusable draft retry budgets, N9 non-advance blocking N10, N10/N11 idempotency, and gate hash drift detection.

## 2026-05-26 Replay And Attempt Identity Discussion
- Reframed replay/attempt identity as the `WorkflowHarness` idempotency and drift-control plane, not primarily a UI, human-review, or audit feature.
- Reduced the T-107 baseline to three execution identities: `workflow_run_id`, `node_attempt_id`, and `attempt_family_key`.
- Reduced stable replay state to five hashes: `node_replay_key`, `semantic_artifact_hash`, `gate_result_hash`, `authority_hash`, and `handoff_hash`.
- Kept `route_hash` as a derived value from gate result, next action, target node, handoff hash, route policy, and budget cursor rather than a separate primary identity.
- Locked the rule that event ids, timestamps, generated ids, trace ids, and repository ids do not enter authority or handoff content hashes.
- Added exact replay behavior: reuse frozen Codex/provider/mock artifacts and do not re-invoke semantic processors by default.
- Added `attempt_family_key` budget scopes for N4 retry, N5 more-options, N6 debate/regeneration, N7 candidate trials, N8 retry/readmission, and N9 loopback.
- Added drift policy for frozen input drift, source hash drift, semantic artifact drift, policy/schema drift, authority conflicts, handoff conflicts, candidate ordering drift, and route policy drift.
- Added the minimal control chain `NodeAttempt -> SemanticArtifact? -> DeterministicGateResult -> Authority? -> Handoff? -> RouteDecision`.

## 2026-05-26 Authority Write Transaction Boundary Discussion
- Rechecked the transaction strategy against complexity and robustness, then reduced the baseline to `Transactional Gate Outcome Bundle + Derived Route Cursor`.
- Confirmed the transaction core is `DeterministicGateResult -> AttemptOutcome -> Authority? -> Handoff?`.
- Confirmed route scheduling should be a derived cursor from committed gate/outcome/handoff/budget state rather than a required strong transaction object.
- Added `AttemptOutcome` as the stable stop/resume record for advanced, blocked, retry-ready, waiting, terminal, and loopback outcomes.
- Locked the write sequence: create/load node attempt, create/load semantic artifact, run pure deterministic gate, persist gate/outcome/authority/handoff in one transaction, then derive route cursor.
- Added outcome write policy for admitted, admitted-with-warnings, blocked, retryable, human-review, and terminal outcomes.
- Preserved special authority boundaries for N5 non-select decisions, N8 value-not-supported, N9 non-advance, and N10/N11 duplicate returns.
- Reduced baseline idempotency constraints to `node_replay_key + authority_kind`, `authority_hash`, and `handoff_hash`.
- Added recovery rules for missing route cursor, duplicate replay, authority conflict, and persistence failure after semantic artifact creation.

## 2026-05-26 Handoff Schema Minimum Contract Discussion
- Locked handoffs as frozen machine inputs for the next node, not audit bundles, UI summaries, or raw LLM/provenance carriers.
- Added `V1bHandoffEnvelope` with handoff ref/hash, source node/attempt, source authority ref/hash, upstream lineage hash, warning/residual-risk context, gate result hash, policy version, and schema version.
- Confirmed `handoff_hash` is the downstream replay root and downstream nodes must consume explicit handoff refs/hashes rather than latest/current upstream state.
- Required warning and residual-risk context to carry forward, escalate, or resolve explicitly; silent cleanup is forbidden.
- Added node-specific typed payload requirements for N1 -> N2 through N11 -> v1c.
- Explicitly excluded raw Codex/provider output, debate transcripts, long rationale, hidden reasoning, provider config, and v1c side-effect requests from normal handoff payloads.
- Defined the default Codex/LLM context surface as compact refs/hashes plus warning/risk context, with any detailed context loaded only through frozen refs from the handoff.
- Added handoff hash components and handoff-level acceptance cases for mismatch rejection, mutable ref rejection, N8 signal/feedback surfaces, N10/N11 authority boundary protection, and hash drift detection.

## 2026-05-26 Error And Failure Taxonomy Discussion
- Added a shared failure taxonomy so `WorkflowHarness` can distinguish retry, block, wait, loopback, and terminal behavior without reading raw rationale.
- Locked five failure classes: `technical_failure`, `policy_block`, `semantic_non_pass`, `human_or_delegated_required`, and `terminal_no_advance`.
- Mapped each failure class to gate status, authority-write behavior, and harness behavior.
- Added `V1bFailureSignal` with failure class, reason code, affected refs, retry budget key, loopback target, human-action flag, authority-write flag, downstream-handoff flag, and signal hash.
- Confirmed `semantic_non_pass` is not a technical failure and does not consume technical retry budget.
- Confirmed `policy_block` cannot be bypassed by switching provider/model/execution mode inside the same attempt.
- Added node examples for N2 through N11, including N8 `value_not_supported`, N5 request-more-options, N7 trial exhaustion, N9 reject, and N11 side-effect payload block.
- Added failure-taxonomy acceptance cases for authority writes, retry budget consumption, human wait states, terminal no-advance, and route consumption of typed reason codes.

## 2026-05-26 Harness Acceptance Fixture Matrix Discussion
- Confirmed v1b acceptance must be harness-level product acceptance, not route-only HTTP smoke.
- Expanded the test strategy from minimal fixture groups into coverage axes plus representative fixtures, avoiding full combinatorial explosion while keeping coverage deep.
- Added three test tiers: `core_acceptance`, `deep_harness_acceptance`, and `provider_canary`.
- Added coverage axes for orchestration, gate outcomes, semantic modes, failure taxonomy, replay/idempotency, transaction recovery, warning/risk carry-forward, and authority boundaries.
- Added fixture groups for mainline product acceptance, per-node gate depth, N6-N8 iteration, Codex support slots, replay/drift/idempotency, transaction recovery, provider/mode safety, and quality baseline.
- Required N6-N8 deep cases for first-pass success, second-candidate success, all-candidate failure, technical retry, gate readmission, value-not-supported, trial-cap exhaustion, and high-value unstable deep debate.
- Required Codex slot tests proving support artifacts cannot write authority or route directly, and exact replay reuses frozen Codex artifacts.
- Required quality baseline tests to reject schema-valid but semantically invalid N4/N6/N7/N8/N9/N10/N11 outputs.
- Defined compact harness evidence fields for fixture id, frozen refs/hashes, semantic artifacts, attempts, gate hashes, authority/handoff hashes, route cursor, and failure reason codes.

## 2026-05-26 Artifact Retention And Audit Surface Discussion
- Locked artifact retention as support for harness recovery, replay, deterministic gates, and LLM context reconstruction, not a heavy human-review UI requirement.
- Added three retention layers: `route_surface`, `semantic_artifact_surface`, and `debug_audit_surface`.
- Confirmed route surface stays compact and consumes only statuses, signals, reason codes, refs/hashes, warning/risk context, and policy/schema versions.
- Confirmed semantic artifact surface stores structured Codex/provider/mock output, normalized output hash, prompt/profile/input hashes, and output contract for replay/gates.
- Confirmed debug audit surface may store raw prompt/response/debate notes/provider metadata, but it is optional, controlled, and excluded from handoff and route hashes.
- Added retention policy by node type for deterministic nodes, human/delegated semantic nodes, Codex support nodes, and model-like nodes.
- Added prompt context rules so downstream LLM/Codex uses frozen refs/hashes and allowed summaries, not latest/current state or raw debug audit by default.
- Added retention acceptance cases ensuring route derivation and exact replay do not depend on raw transcripts, and redacting optional debug audit does not alter product authority/handoff hashes.

## 2026-05-26 Run Mode And Profile Activation Discussion
- Locked run mode/profile activation as a pre-invocation harness decision that cannot change inside the same node attempt.
- Added run modes: `frozen_replay`, `mocked_llm`, `codex_assisted`, `human_delegated`, `provider_canary`, and `provider_deep`.
- Set activation priority so exact frozen replay wins before fixtures, human/delegated payload, Codex default, provider canary, or provider deep.
- Confirmed product semantic nodes default to Codex while acceptance can use frozen/mock artifacts and provider canary remains controlled supplemental validation.
- Added profile resolution rules: registry-only provider/model/timeout, `model_option_id` only for provider modes, no mixed Codex/provider/mock modes, no automatic fallback.
- Added node activation matrix for N1-N11.
- Added provider canary and provider deep activation requirements, including N6/N8 deterministic deep admission and N8 not selecting its own debate level.
- Added invalid activation outcomes and harness acceptance cases for replay, default Codex, fixture CI, canary, deep debate, mode drift, and provider failure behavior.

## 2026-05-26 Phase 1 S0/S1 Harness Foundation Implementation
- Added shared v1b WorkflowHarness contracts in `packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts`.
- The shared contract defines the 11 normalized v1b node ids, node-policy metadata, execution kind, gate status, failure class, route decision, replay identity, hashes, blocker/warning surface, authority refs, handoff refs, and trace payload shape.
- Exported the new contract through `packages/shared/src/research-lifecycle/index.ts` and the shared package subpath export map.
- Added schema coverage for canonical request/result envelopes, invalid node ids, invalid gate statuses, missing replay hash fields, and invalid non-provider `model_option_id`.
- Added `TopicSelectionV1bWorkflowHarnessService` as a service-level shell, intentionally without HTTP route or Prisma migration.
- The shell reuses existing `TopicSelectionControlPlaneService` primitives: input snapshots, readiness gate results, transition attempts, trace snapshots, and trace artifacts.
- The shell performs request boundary validation, node policy validation, frozen input hashing, execution spec hashing, node replay key calculation, exact replay lookup, drift blocking, and Phase 1 placeholder blocked outcomes.
- Deterministic/delegated nodes reject execution specs and provider/model/debate-shaped inputs before authority writes.
- Model-like nodes N4/N6/N8 accept valid provider-mode `TopicSelectionAgentExecutionSpec` shape but used placeholder blocked outcomes in the Phase 1 shell; Phase 1 does not invoke Codex, provider LLM, mock LLM, AgentOrchestrator, or v1b business services.
- Blocked shell outcomes write gate/trace/transition evidence with empty `created_authority_refs`; no v1b business authority or downstream handoff is created in this slice.
- Added backend unit coverage for node policy registry coverage, deterministic provider-spec blocking, raw provider field rejection, provider-mode shape acceptance on model-like nodes, exact replay, changed input drift blocking, and no-authority writes.

## 2026-05-26 Phase 1 S0/S1 Code Quality Fixes
- Tightened the v1b harness service runtime boundary validation so manual validation matches the shared envelope contract more closely before any control-plane persistence.
- Added validation for request object shape, optional string ids, frozen-input additional fields, frozen source refs, semantic artifact refs, actor refs, `created_by`, execution-spec object shape, and execution-spec `model_option_id`.
- Kept validation service-local to avoid introducing a second Ajv dependency path while existing backend Ajv import resolution remains unresolved outside this slice.
- Removed generated `gate_result_id` from `gate_result_hash` so blocked shell hashes are derived from semantic gate content, policy, replay key, blockers, warnings, and route decision rather than persistence ids.
- Split node-attempt replay drift into typed blocker codes for frozen input, execution spec, semantic artifact, attempt family, policy version, and multi-field replay identity mismatch.
- Tightened replay provenance schema so `replay_provenance.node_replay_key` must be a sha256 hash when present.
- Strengthened backend tests for invalid actor metadata, malformed source refs, execution-spec replay drift classification, stable semantic hashes across fresh persistence ids, and corrected replay-key comparison in the input-drift test.

## 2026-05-26 Phase 2 Node Policy Closure Implementation
- Added the Phase 2 executable node-policy surface to the shared v1b WorkflowHarness contract, plus a dedicated `topic-selection-v1b-node-policy-contracts.ts` export wrapper.
- Expanded N1-N11 policy metadata with input contract, required frozen snapshot kind, authority kind, handoff kind, gate id, allowed execution modes, semantic support slots, route edges, blocker/warning/loopback codes, and replay hash components.
- Added harness-facing DTO contracts for semantic support artifacts, authority refs, common handoff envelopes, handoffs, v1c publication handoff, gate policy/outcome, and route policy decision.
- Replaced the legacy single `semantic_artifact_ref` request surface with typed `semantic_artifacts[]` and aggregate semantic artifact hashing.
- Kept Phase 2 service-only: no N1-N11 business runner implementation, no Codex/provider/AgentOrchestrator invocation, no HTTP route, and no Prisma migration.
- Updated `TopicSelectionV1bWorkflowHarnessService` to enforce semantic artifact admission before runner execution: deterministic-only nodes reject semantic artifacts, unknown slots block, wrong node/effect/execution mode/contract blocks, and support artifact input hash must match the frozen input hash.
- Preserved deterministic/delegated provider protection: non-model-like nodes reject `execution_spec`, and `model_option_id` remains valid only under `provider_llm`.
- Added backend unit coverage for complete node policy metadata, deterministic-only semantic rejection, delegated/support Codex artifact acceptance, model-like semantic artifact acceptance, slot/node/effect blockers, semantic artifact replay drift, and empty authority writes.

## 2026-05-26 Phase 2 Code Review Fixes
- Closed the frozen-input admission gap by adding explicit `input_contract` and `snapshot_kind` fields to the v1b harness frozen input DTO and hash calculation.
- Updated the harness shell to block node invocations when the frozen input contract, snapshot kind, or source-ref kind does not match the invoked node policy.
- Replaced the generic handoff payload surface with edge-constrained payload DTOs for N1 -> N2 through N10 -> N11 and N11 -> v1c, including source node, target node, route signal, schema version, and required ref/hash fields.
- Added `TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS` so harness/编排层 can consume the same source/target/route/payload matrix as the schema.
- Tightened semantic support artifact refs to strict functional refs that reject `legacy_ref`, closing the raw provider/debug payload side channel inside semantic artifact refs.
- Changed the v1b schema tests to disable Fastify/Ajv `removeAdditional`, so unknown fields are rejected rather than silently stripped during contract tests.
- Renamed persisted gate/transition evidence keys from `phase1-harness-*` to `phase2-harness-*` for Phase 2 blocked shell outcomes.
- Added regression coverage for frozen-input mismatch blockers, semantic `legacy_ref` rejection, handoff source/target/payload mismatch rejection, arbitrary raw payload leakage, and the expanded schema test surface.

## 2026-05-26 Phase 3 Runtime Alignment Shell Implementation
- Kept Phase 3 admission-only: no N1-N11 business runner implementation, no Codex/provider/mock execution, no AgentOrchestrator call, no HTTP route, and no Prisma migration.
- Replaced backend deep Ajv imports with package-level `ajv` named imports and typed the existing audit-schema error mapping so backend typecheck can serve as a Phase 3 signal.
- Extended the shared v1b WorkflowHarness contract with run-mode/profile fields, profile-bound semantic slot policy, semantic artifact `run_mode`/`model_option_id`, and `runtime_admission_hash`.
- Bound every v1b semantic slot to a registry profile id. N4/N6/N8 use model-like single-agent profiles; N2/N3/N5/N7 and N6/N7 support slots use Codex/mock support profiles with no provider options.
- Added v1b profiles to `TopicSelectionModelProfileRegistryService`, including registry-resolved provider options for N4/N6/N8 and support-only profiles for semantic assistance slots.
- Updated `TopicSelectionV1bWorkflowHarnessService` so model-like N4/N6/N8 require either a valid `execution_spec` admission or a matching frozen semantic artifact for the required model-draft slot.
- Enforced registry-backed admission before the runner boundary: profile id defaults from the slot policy, supplied profiles must be allowed by the slot, provider mode requires `model_option_id`, non-provider modes require `model_option_id=null`, and resolved profile output contracts must match the slot contract.
- Preserved deterministic/delegated boundaries: deterministic-only nodes reject runtime/profile fields, non-model-like nodes still reject provider execution specs, and Codex/provider/mock/human artifact modes cannot be mixed against a conflicting top-level execution spec.
- Added `runtime_admission_hash` to node replay identity and result hashes so same `node_attempt_id` detects runtime/profile drift separately from frozen-input, execution-spec, and semantic-artifact drift.
- Phase 3 blocked/not-implemented outcomes still write only control-plane evidence with empty `created_authority_refs`; no v1b authority refs or downstream handoff refs are created.

## 2026-05-26 Phase 3 Code Review Fixes
- Fixed the N3 semantic-support admission mismatch by narrowing `INVALID_NODE_RUNTIME_SPEC` to true deterministic-only nodes: deterministic nodes without semantic support slots.
- N3 can now use the same frozen Codex/mock semantic artifact admission path as N2/N5/N7 when the top-level `run_mode/profile_id` matches the artifact and slot policy.
- Kept N1/N9/N10/N11 deterministic-only behavior unchanged: runtime/profile fields, execution specs, and semantic artifacts remain blocked before runner execution.
- Corrected the N7 failed-trial synthesis slot from globally `required_for_progress` to conditional support-only; it is only meaningful on the N8 failure/loopback path and should not be required for ordinary N7 progress.
- Added regression coverage for support-node runtime admission with semantic artifacts and for the required model-draft slot set being limited to N4/N6/N8.

## 2026-05-26 Phase 4A Harness-Native N1-N3 Runner Foundation
- Shifted Phase 4A from route/test-only acceptance toward runner-first acceptance: N1, N2, and N3 now execute inside `TopicSelectionV1bWorkflowHarnessService` after the existing policy, runtime-admission, replay, and hash checks.
- Added harness-facing frozen payload DTOs and schemas for N1 input bundle intake, N2 accepted constraint profile payload, and N3 readiness input refs/hashes.
- Kept N1 deterministic: it loads the explicit v1a->v1b bundle and required upstream refs, verifies expected bundle/source hashes, performs trace/currentness checks, writes `V1bIntakeSnapshot`, and emits an `N1ToN2Handoff`.
- Kept N2 delegated but authority-safe: it writes `ResearchConstraintProfile` only from the frozen accepted payload. `codex_delegated` requires matching `n2_constraint_profile_semantic_support` provenance; a Codex support artifact alone cannot write authority.
- Kept N3 deterministic: it loads frozen N1/N2 authority refs, verifies hashes, computes readiness from snapshot/profile/recheck/risk state, writes readiness authority, and emits `N3ToN4Handoff` only when ready.
- N3 non-ready results preserve deterministic blocker semantics and produce no N4 handoff; missing constraints loop back with `RESEARCH_CONSTRAINT_PROFILE_INCOMPLETE`, while accepted risk coverage carries `ACCEPTED_RISK_CARRIED_FORWARD` into warnings and handoff evidence.
- Added generic admitted-result persistence for runner outcomes: control-plane input snapshot, gate, transition, trace snapshot, handoff artifact, trace artifact, authority hash, handoff hash, route hash, and replay payload.
- N4-N11 intentionally remained outside the Phase 4A runner slice after successful admission; Phase 4A still does not add routes, live model calls, AgentOrchestrator calls, or migrations.

## 2026-05-26 Phase 4C Harness-Native N5 Runner Foundation
- Added harness-facing frozen payload DTO/schema for N5 accepted research-slice selection payloads and extended `N5ToN6Handoff` with selected `ResearchSlice` ref/hash, `SliceSelectionDecision` ref/hash, source option-set ref/hash, and selected option ref/hash.
- N5 now executes inside `TopicSelectionV1bWorkflowHarnessService` after the existing policy, runtime-admission, replay, and frozen input hash checks.
- N5 consumes only the frozen N4 option-set ref/hash and a frozen accepted selection payload. It does not infer authority from N4 recommendation, generate options, call Codex/provider live, or invoke `AgentOrchestrator`.
- `codex_delegated` N5 authority input requires matching `n5_slice_selection_review` semantic artifact provenance. A Codex support artifact alone cannot write `SliceSelectionDecision` authority.
- `select` writes `SliceSelectionDecision` plus `ResearchSlice`, updates the option set to `selected`, and emits `N5ToN6Handoff`.
- `request_more_options`, `park`, and `reject` write only `SliceSelectionDecision`; they do not create `ResearchSlice` or N6 handoff. `request_more_options` routes back to N4 in the harness route hash.
- Deterministic gates block option-set hash drift, selected option ref/hash drift, blocked selected options, and high-risk/human-review selections without human delegation or frozen accepted risk refs.
- N6-N11 intentionally remained outside the Phase 4C runner slice after successful admission; Phase 4C still does not add routes, live model calls, AgentOrchestrator calls, or migrations.

## 2026-05-26 Phase 4 Code Quality Fixes
- Split admitted-result persistence into `prepareAdmittedControlPlane` and `finalizeAdmittedResult` inside `TopicSelectionV1bWorkflowHarnessService`.
- Successful replay trace artifacts are now finalized only after the domain authority write callback succeeds. If N1-N5 authority persistence throws, the harness may leave pre-authority input/gate/handoff evidence, but it does not leave a replayable admitted trace/result.
- Added replay-time authority verification for existing admitted traces: primary authority refs and handoff `required_refs` are checked against available repositories before exact replay is returned. Missing authority refs block with replay-specific blocker codes instead of silently returning a stale success.
- Updated N1-N5 runners to write authorities from the prepared control-plane context, then finalize transition/trace evidence after the authority write succeeds.
- Added an audit-only control-plane option so blocked transitions can record created authority refs when a deterministic node intentionally writes a non-advancing authority, such as N3 blocked readiness assessment. Ordinary blocked shell outcomes still create no authority refs.
- Extended N4 option-set comparison payload with `constraint_profile_hash`, and extended `N5ToN6Handoff` with `constraint_profile_ref/hash` and `intake_readiness_ref/hash`.
- N5 now blocks selected-slice handoff creation if the N4 option-set lineage hashes are missing, preventing N6 from needing mutable upstream reads to reconstruct core frozen lineage.
- Added regression coverage for N3 blocked readiness authority traceability, N5 handoff lineage hashes, and N5 authority-write failure not producing a replayable admitted trace.

## 2026-05-26 Phase 5 Harness-Native N6 Candidate Runner
- Added harness-facing N6 frozen input and candidate-draft DTO/schema coverage. `TopicSelectionV1bN6HarnessFrozenInputPayload` carries the N5 handoff hash, selected `ResearchSlice`, `SliceSelectionDecision`, option-set, selected option, constraint-profile, and readiness refs/hashes; `TopicQuestionCandidateSetDraft@v1` reuses the normalized topic-question LLM output contract.
- Extended `N6ToN7Handoff` with candidate-set ref/hash, admissible candidate ref/hash pairs, selected research-slice ref/hash, frozen generation artifact ref/hash, deterministic candidate-gate hash, and nullable grouping fields reserved for N7.
- Added N6 dispatch to `TopicSelectionV1bWorkflowHarnessService`; N7-N11 were implemented by later runner slices.
- N6 now requires a frozen `n6_question_candidate_draft` semantic artifact. A valid `execution_spec` still passes registry-backed admission, but Phase 5 never executes Codex/provider/mock live and never treats `execution_spec` alone as authority input.
- N6 loads only explicit frozen refs from `N5ToN6Handoff`: selected research slice, selection decision, option set, selected option, evidence refs, boundaries, and assumptions. It does not query latest/current selection state to repair input.
- N6 lineage validation checks the N5 handoff artifact, research-slice hash, selection decision hash, option-set authority hash, selected option hash, constraint-profile hash, readiness hash, and matching handoff payload. The selected-option hash comparison is normalized to the pre-selection option status because N5 legitimately mutates the persisted selected option status after publishing the frozen selected-option hash.
- Deterministic candidate gates block duplicate keys, malformed frame/candidate structures, unknown evidence or boundary refs, weak/broad questions, missing falsification conditions, claim-ceiling drift, missing method/evaluation path, and missing required evidence roles.
- Semantic-fail candidates are excluded from the admitted candidate set. If at least one candidate is admissible, N6 writes `FormTopicQuestionRun`, `QuestionFrame`, `TopicQuestionCandidateSet`, and candidate authorities, then emits `N6ToN7Handoff`.
- If every candidate fails semantic gates, N6 records a blocked loopback outcome with `semantic_non_pass`, no authority refs, and no N7 handoff. This keeps the automated route explicit without creating selectable candidate-set authority.
- N6 uses the existing admitted-result `prepare -> writeAuthority -> finalize` pattern, so replayable admitted traces are finalized only after topic-question authority persistence succeeds.
- Added replay authority checks for `form_topic_question_run`, `topic_question_frame`, `topic_question_candidate_set`, and `topic_question_candidate` refs so exact replay cannot return a stale admitted N6 result when domain authorities are missing.
- Added backend coverage for N1->N6 fixture smoke, missing frozen draft artifact, duplicate candidate keys, unknown evidence refs, all-candidate semantic failure loopback, warning/risk carry-forward, semantic replay drift, and prevention of N7-N11 authority side effects.

## 2026-05-26 Phase 5 Code Quality Review Fixes
- Tightened N6 frozen draft provenance: `resolveN6DraftPayload` now requires both `normalized_output_hash` and `structured_output_hash` to equal the normalized `TopicQuestionCandidateSetDraft` payload hash. A structured-output hash drift now blocks before any candidate authority write.
- Tightened the shared `N6ToN7Handoff` payload schema so `admissible_candidate_refs` cannot be empty. This keeps the handoff contract aligned with the runner rule that zero admissible candidates must loop back without creating selectable candidate-set authority.
- Added backend happy-path assertion that N6 emitted admissible candidate refs and hashes have equal cardinality.
- Added schema/backend regression coverage for empty N6 admissible refs and N6 structured-output hash drift.

## 2026-05-26 Phase 6 Harness-Native N7 Trial Coordinator
- Added harness-facing N7 frozen input DTOs for `initial_from_n6` and `feedback_from_n8` modes. N7 policy now admits both `N6ToN7Handoff@v1` and `N8ToN7Feedback@v1` while keeping deterministic materialization as the only authority-write path.
- Expanded `N7ToN8Handoff` with candidate set, active candidate, materialized topic question, `TopicQuestionContract`, answerability plan, trial ledger, selected slice, candidate grouping, and N8 debate admission refs/hashes.
- Added production-shaped frozen support DTOs for `CandidateGroupingSupport@v1`, `N8DebateAdmissionReviewSupport@v1`, and `N8FailedTrialSynthesisSupport@v1`. These artifacts may influence ordering, debate admission, or compact failed-trial synthesis, but they cannot directly write authority.
- Added `N8ToN7Feedback@v1` so future N8 semantic failures can return failed contract/candidate refs, gate hash, affected refs, previous N7 handoff/ledger refs, and feedback hash without relying on natural-language routing.
- Added N7 dispatch to `TopicSelectionV1bWorkflowHarnessService`; N8-N11 were implemented by later runner slices. N7 requires `topicQuestionRepository` and does not call live Codex/provider/mock, `AgentOrchestrator`, HTTP routes, or Prisma migrations.
- Initial N7 trials load only the explicit frozen N6 handoff and candidate-set refs. Candidate selection uses valid Codex grouping support first, then candidate-set recommendation order, then the N6 admissible candidate order.
- N7 writes selection-decision trial ledger, `TopicQuestion`, `TopicQuestionContract`, `AnswerabilityPlan`, materialized refs, and `N7ToN8Handoff` through `createSelectionDecisionWithMaterializations` after deterministic gates pass.
- Initial trials mark the candidate set as `selected`, the active candidate as `admitted`, and untried candidates as `candidate`; semantic N8 feedback marks failed candidates as `rejected` and may admit the next untried candidate.
- All-candidate exhaustion requires frozen failed-trial synthesis support, writes a no-advance trial ledger, emits no N8 handoff, and routes loopback to N6. Technical N8 failures sent to N7 block deterministically because they should be retried by the N8/harness retry path instead of consuming candidate trials.
- Gate-rejection feedback may re-emit the same contract handoff only with legal debate admission support. N7 never creates `TopicValueAssessment`, `ValueDisposition`, draft package, v1c handoff, or N9+ authority refs.
- Replay authority checks now include topic-question selection decisions, topic questions, contracts, answerability plans, and N7 handoff refs; replay hash components include active candidate, trial ledger, debate admission, and feedback hashes.
- Added backend coverage for N1->N7 happy path, Codex grouping support selection, wrong grouping artifact blockers, N8 semantic feedback next-candidate trial, exhausted-trial loopback, technical feedback block, exact replay, and N7 side-effect boundaries.

## 2026-05-27 v1b Harness-Native Functional Closure Through N11
- Extended the shared v1b harness contract with frozen payload DTOs/schemas for N8, N9, N10, and N11 plus `TopicValueAssessmentDraft@v1` schema coverage.
- Aligned N10/N11 node policy snapshot kinds to concrete authority ref kinds (`value_disposition_decision` and `topic_package`) so generic harness admission no longer depends on conceptual aliases.
- Added N8 dispatch to `TopicSelectionV1bWorkflowHarnessService`. N8 consumes only a frozen `N7ToN8Handoff@v1` and frozen normalized `n8_value_assessment_draft` semantic artifact; it does not live-call Codex/provider/mock or `AgentOrchestrator`.
- N8 deterministic gates validate N7 handoff lineage, value-draft payload/hash/provenance, complete hard-gate/dimension coverage, accepted-risk carry-forward, cited/frozen refs, readiness/disposition consistency, score thresholds, and memo citation coverage before writing `AssessTopicValueRun`, `TopicValueAssessmentInputSnapshot`, `TopicValueAssessment`, `ValueReasoningMemo`, and evidence refs.
- N8 avoids rehashing mutable candidate status after N7 admits the active candidate. Candidate drift is checked through the frozen N7 handoff payload and concrete active-candidate ref, while `TopicQuestion`, `TopicQuestionContract`, and `AnswerabilityPlan` hashes remain strict authority checks.
- Added N9 dispatch. N9 consumes only a frozen `N8ToN9Handoff@v1`, value assessment, and reasoning memo refs/hashes; it writes a `ValueDispositionDecision` and emits `N9ToN10Handoff` only for deterministic `advance_to_package`.
- N9 non-advance dispositions are terminal no-advance outcomes: they can write the disposition authority and trace evidence but produce no N10 handoff and cannot create a draft package.
- Added N10 dispatch and repository support for harness-native package authority persistence without duplicating control-plane writes. N10 validates frozen N9 handoff/disposition lineage, creates a trace-ready draft `TopicPackage`, trace boundary check, readiness assessment, and ready v1c input bundle, then emits `N10ToN11Handoff`.
- N10 duplicate handling is idempotent by value-disposition decision: an existing package is returned with stable package authority refs rather than creating another package.
- Added N11 dispatch. N11 validates frozen `N10ToN11Handoff@v1`, package hash, and v1c bundle hash, then publishes the terminal `V1cInputBundle` handoff. It performs no promotion decision, bridge creation, PaperProject creation, or PaperImplementation side effect.
- Extended replay authority verification for value assessment, value memo, value disposition, topic package, package trace/readiness, and v1c input bundle authority refs so exact replay cannot return a stale admitted result after domain authority loss.
- Added service-level N1->N11 E2E coverage through the harness shell, including N8 value draft admission, N9 advance and terminal no-advance, N10 package/v1c bundle creation, N11 terminal handoff publication, exact replay, and N8 risk-dropping negative gate coverage.
- No HTTP route, Prisma migration, live model/provider/Codex call, or second runtime/provider path was added.

## 2026-05-27 T-107 Exit Gate Fixes
- Tightened N8 deterministic value gates after product acceptance review found that runner-level checks rejected missing or duplicate required gates/dimensions but did not reject extra unknown gate/dimension entries when all required keys were present.
- N8 now enforces exact gate and dimension coverage at service gate time: every gate key must be one of the allowed value gate keys, every verdict/severity must be in the supported vocabulary, every dimension key must be supported, scores must be finite 0-100 numbers, refs must be functional refs, and extra fields are rejected before any value authority write.
- Added regression coverage for schema-valid-looking N8 normalized drafts that include unsupported extra value gate or dimension entries. Both cases block with typed N8 coverage errors and create no authority refs.
- Extended N10 acceptance coverage for duplicate package creation attempts. A second N10 invocation with the same frozen N9 disposition lineage returns the existing package authority with `N10_PACKAGE_EXISTING_RETURNED` instead of creating a duplicate package.
- Extended N11 terminal boundary coverage for downstream side-effect payload drift. Frozen N11 input containing PaperProject side-effect fields blocks as `N11_FROZEN_PAYLOAD_INVALID` and creates no authority refs.
- The exit-gate fixes stay inside the existing harness-native service/shared-contract surface. They do not add HTTP routes, migrations, live provider/Codex execution, or a second provider/runtime path.

## 2026-05-27 Post-Exit Cleanup
- Removed the obsolete runtime `NODE_RUNNER_NOT_IMPLEMENTED` fallback from `TopicSelectionV1bWorkflowHarnessService`. N1-N11 now dispatch through concrete harness-native runners; an unregistered node policy is treated as an internal registration error rather than a product-level blocked node.
- Updated canonical schema and service test fixtures from the early `topic-selection-v1b-phase1-policy-v1` placeholder to the current `topic-selection-v1b-node-policy-v1` policy version.
- Normalized runtime trace labels and missing-artifact messages so production trace evidence names final N1-N11 node semantics instead of implementation-slice phases.
- Marked `06-current-state-mapping.md` as a historical Phase 1 baseline and `07-node-policy-alignment.md` as a finalized policy discussion log. Executable shared contracts and `08-exit-gate-review.md` are the live authority when there is any conflict.
- Confirmed there are no temporary logs, coverage artifacts, `.tmp` files, `.bak` files, `.orig` files, or `tsbuildinfo` files created by this work.

## 2026-05-27 Deep Acceptance Matrix Supplement
- Added `09-deep-acceptance-matrix.md` to make the T-107 acceptance surface explicit after exit-gate acceptance.
- Matrix separates harness acceptance, per-node behavior, output-quality expectations, and non-blocking residual gaps.
- Clarified the original T-107 exit-gate boundary: frozen artifact plus deterministic gate behavior were accepted before route exposure, Prisma-backed route smoke, and v1c promotion/bridge authority. Later supplements added Prisma rollback coverage, full harness-native HTTP invocation, standalone runner coverage, DashScope/OpenAI provider-backed repeat coverage, and Prisma-backed harness HTTP route smoke while keeping external interactive Codex variance, broader multi-sample operational stability, and v1c promotion/bridge authority out of scope.

## 2026-05-27 Legacy V1b Write Route Freeze
- This was an intermediate stabilization step only. The temporary compatibility headers and opt-in route-freeze mechanism were superseded by the later hard-removal pass.
- The current accepted surface does not retain legacy v1b HTTP orchestration writes. Local automation uses harness-native node invocation and artifact routes only.

## 2026-05-27 Transaction Failure Matrix
- Added a reusable harness test helper that asserts an injected authority-write failure leaves no replayable admitted trace for the failed node attempt, leaves no captured authority rows, retries as a fresh successful invocation, and only exact-replays after that successful retry.
- Extended service-level failure injection beyond the existing N5 case to N4, N6, N7, N8, and N10 multi-record authority writes:
  - N4 `createPlanRunWithOptionSet`
  - N6 `createFormationRunWithCandidates`
  - N7 `createSelectionDecisionWithMaterializations`
  - N8 `createAssessmentWithMemo`
  - N10 `createDraftPackageAuthority`
- The matrix stays in harness unit fixtures. It strengthens T-107 service-level transaction consistency evidence but does not claim exhaustive Prisma-backed rollback coverage.

## 2026-05-27 Prisma Transaction Rollback Fix
- Added real Prisma-backed repository rollback coverage for every v1b multi-record authority write used by the harness:
  - N4 `createPlanRunWithOptionSet`
  - N5 `createSelectionDecisionWithSlice`
  - N6 `createFormationRunWithCandidates`
  - N7 `createSelectionDecisionWithMaterializations`
  - N8 `createAssessmentWithMemo`
  - N10 `createDraftPackageAuthority`
- Each test injects a real database failure after one or more earlier writes in the same repository method, verifies no partial authority rows or status patches remain, then retries with the same authority ids after correcting the failure input.
- The production implementation already had the required `$transaction` boundaries, so the fix is executable integration coverage rather than a transaction refactor.
- N10 coverage specifically verifies the late `ValueDispositionDecision` patch failure path: package research record, package, trace check, readiness assessment, and v1c bundle are all rolled back when the final disposition update fails, and the same package ids retry cleanly after the disposition row exists.

## 2026-05-27 Harness-Native HTTP Invocation Surface
- Added a topic-selection v1b WorkflowHarness-native HTTP invocation route: `POST /topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations`.
- The route is not marked as a legacy write route and does not emit the legacy deprecation/compatibility headers. It is the HTTP entrypoint for `TopicSelectionV1bWorkflowHarnessService.invokeNode`.
- The controller validates that route `nodeId` matches body `node_id` before calling the harness service, preventing accidental cross-node submission through a valid-looking request body.
- `buildApp` now constructs `TopicSelectionV1bWorkflowHarnessService` with the same v1b repositories already used by the product services, so the HTTP path uses the accepted harness authority and repository wiring rather than a parallel orchestration stack.
- Route-level regression coverage now creates a real in-memory v1a-to-v1b bundle, invokes N1 through the harness-native HTTP route, then invokes N2 through the same route with a `codex_assisted` semantic artifact. This proves Codex-assisted artifact admission can cross the HTTP boundary for delegated v1b support.
- The change deliberately does not add a separate v1b live-runner script or duplicate N1-N11 orchestration loop. Full HTTP N1-N11 chain coverage can be added later using the same route if automation needs a single command runner.

## 2026-05-27 Legacy Default Closure And Full HTTP Chain
- Added harness-native artifact routes for local automation: `POST /topic-selection/v1b/workflow-harness/artifacts` records frozen semantic/support artifacts through the control plane, and `GET /topic-selection/v1b/workflow-harness/artifacts/:artifactRefId` reads them back for downstream node requests.
- Extended `N8ToN9Handoff` and `N10ToN11Handoff` so HTTP clients can build downstream frozen inputs without repository-private reads. N8 now carries `value_reasoning_memo_ref`, `value_reasoning_memo_hash`, and `recommended_disposition`; N10 now carries `v1c_input_bundle_ref` and `v1c_input_bundle_hash`.
- Added full route-level N1-N11 harness HTTP coverage using the current in-memory app wiring. The test creates a v1a-to-v1b input bundle, invokes every v1b harness node through `/topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations`, records frozen Codex-assisted semantic artifacts through the harness artifact route for N2/N4/N6/N8, follows typed handoffs through N11, and verifies terminal `stop_v1b_complete` publication.
- The accepted local path is harness-native HTTP plus shared contracts. This section was originally paired with a disabled legacy-write compatibility mode; that compatibility mode has since been removed.

## 2026-05-27 Legacy Route Hard Removal And Phased V1b Testing
- Removed the legacy v1b HTTP orchestration write route registrations entirely, including intake snapshot, constraint profile, readiness assessment, slice option set/selection, question candidate set/selection, value assessment/disposition, draft package, and v1c bundle publication POST routes.
- Removed legacy route mode headers, env opt-in constants, marker middleware, and direct-write controller methods. Old POST route strings now exist only inside route integration tests that assert HTTP 404.
- Removed desktop workbench calls to the deleted v1b write APIs. The topic workbench cards now display persisted v1b projections and leave writes to the harness-native path.
- Retired the old direct-route T-068 decision-chain acceptance path and the direct v1b section of `.ai/scripts/topic-selection-real-e2e.mjs`. At this phase boundary, the accepted local automation path was the harness HTTP route plus artifact routes; the standalone harness runner was added in the following phase.
- Phase 1 v1b testing after hard removal covered shared schemas, the full N1-N11 harness service suite, real Prisma rollback tests, full N1-N11 harness HTTP route integration with `.env.local`, Prisma-backed harness HTTP smoke, desktop/shared/backend typechecks, and `git diff --check`.

## 2026-05-27 Standalone V1b Harness Runner
- Added `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` and package script `pnpm topic-selection:v1b-harness-e2e`.
- The runner creates a minimal v1a validated-need handoff through existing v1a HTTP routes, then invokes v1b N1-N11 exclusively through `/topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations`.
- Model-like/delegated v1b nodes receive frozen Codex-assisted semantic artifacts through `POST /topic-selection/v1b/workflow-harness/artifacts`; the runner does not call legacy v1b write routes and does not live-call provider models.
- The runner asserts every removed legacy v1b write route returns HTTP 404 before executing the harness chain.
- The runner writes machine-readable evidence under `.ai/.tmp/topic-selection-v1b-harness-e2e/<run-id>/result.json`, including node status, route decision, authority refs, handoff refs, and hashes for N1-N11.
- `TOPIC_SELECTION_V1B_HARNESS_REPEAT=<n>` can run repeated independent chains in one process to catch ID, route, and persistence collisions.

## 2026-05-27 Provider-Backed Standalone V1b Harness Runner
- Extended `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` with `TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE=provider_llm` while keeping the default fixture mode for fast local smoke.
- Provider mode still uses the accepted harness HTTP route and artifact routes. It creates N4/N6/N8 semantic drafts through `BackendLlmGateway`, normalizes the provider JSON into the shared draft schemas, records the normalized artifact through the harness artifact route, then lets deterministic node gates decide authority.
- Provider/model selection is registry-backed. The runner resolves `openai` or `dashscope` provider options from `TopicSelectionModelProfileRegistryService`, supports explicit model override through env, and defaults to bounded timeouts/retries for canary use.
- The runner does not persist raw provider responses. Result artifacts keep normalized output summaries, provider/model provenance, and telemetry such as elapsed time, retry count, and token counts.
- Live canary failures drove prompt and allowlist hardening before acceptance:
  - N4 now constrains target community, contribution type, claim ceiling, selectable option shape, safe claim language, exact allowed evidence refs, and empty hard blockers.
  - N6 now constrains admissible question shape, answerability verdict, evidence-role coverage, claim ceiling, exact allowed refs, traceability evidence, and blocker-free candidate admission.
  - N8 now constrains value refs to topic question, contract, answerability plan, candidate, slice, and evidence refs, and explicitly excludes artifact, trace, transition, gate, intake, readiness, constraint, and selection refs from value citations.
- Added runner-level output-quality assertions for provider mode so a schema-valid provider draft is not enough: N4 must have a selected supported option, N6 must produce an answerable research question with falsification conditions and support evidence, and N8 must produce a ready or accepted-risk value assessment with the exact gate/dimension surface and sufficient score.
- DashScope provider repeat=2 passed as the first repeated live-provider canary. Initial OpenAI standalone provider attempts exposed two separate issues: N8 could recommend package advancement with too-low value scores, and OpenAI TLS connection resets could exhaust the previous low retry cap. Both are addressed in the follow-up OpenAI fix section below.

## 2026-05-27 OpenAI Provider Canary Fix
- Hardened the N8 provider prompt for the standalone v1b harness runner so OpenAI treats the canary as package-drafting readiness rather than promotion readiness. The prompt now explicitly requires `ready_with_accepted_risk`, `advance_to_package`, `total_score >= 72`, no blocking hard gates, dimension scores above the deterministic quality floor, and reviewer-risk scoring that treats explicit risk handling as value-positive.
- Increased `BackendLlmGateway` provider retry cap from 3 to 8 so caller-supplied retry budgets can absorb transient OpenAI transport failures such as TLS `ECONNRESET` before a secure connection is established.
- Set the standalone v1b harness OpenAI provider default retry budget to 6 while keeping DashScope/default provider canary retries lower unless explicitly overridden.
- Added `llm-gateway.unit.test.ts` coverage proving retry budgets above three attempts are honored.
- OpenAI provider canaries now pass both repeat=1 and repeat=2 through the full v1b N1-N11 harness path using `gpt-5.4-mini` for N4/N6/N8 semantic drafts. The fix does not bypass deterministic gates and does not mutate provider output after generation.

## 2026-05-27 Provider Soak And DashScope Schema-Adherence Fix
- Extended provider soak evidence to repeat=3 for both OpenAI and DashScope through the standalone v1b harness runner.
- A DashScope repeat=3 attempt exposed a schema-adherence edge in N8: the provider produced a high-quality value draft but emitted `reasoning_memo.effort_to_value_fit` instead of the exact contract field `reasoning_memo.effort_to_value`, causing the deterministic N8 gate to block before authority writes.
- Hardened the N8 prompt to explicitly require `reasoning_memo.effort_to_value` and forbid `effort_to_value_fit`.
- Added a conservative harness provider-output normalization step before semantic artifact admission for the known N8 alias only. The service gate remains strict: normalized artifacts must still pass the exact N8 value draft contract, hash checks, gate/dimension coverage, citation allowlists, and output-quality assertions.
- Provider provenance now records `normalization_repairs` alongside telemetry so any future repair is visible in the result evidence. The passing DashScope repeat=3 soak required zero repairs after the prompt hardening.

## 2026-05-27 Multi-Sample Provider Batch Entry
- Extended `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` so it can consume an existing persisted v1b input bundle through `TOPIC_SELECTION_V1B_HARNESS_INPUT_BUNDLE_ID` or `TOPIC_SELECTION_REAL_V1B_INPUT_BUNDLE_ID`.
- Added `.ai/scripts/topic-selection-multisample-provider-batch.mjs` and package script `pnpm topic-selection:multisample-provider-batch`.
- The batch runner discovers the latest ready or ready-with-warning resource sample sets, runs the existing v1a harness in Codex-assisted modes for each sample, extracts the published `v1b_input_bundle_id`, and invokes the v1b harness runner against that exact bundle.
- This gives a local one-command path for current-content v1a+v1b linked acceptance without resurrecting the retired direct v1b route runner or legacy v1b write routes.
- A real OpenAI batch attempt exposed another N8 provider adherence edge: a value draft cited allowed refs but added non-canonical ref fields, and an earlier attempt showed the same class can corrupt copied `title_card_id` strings. The deterministic N8 gate correctly rejected unknown/non-canonical frozen refs before authority writes.
- Added a conservative N8-only ref canonicalization pass in the provider runner: if a provider ref uniquely matches `allowed_functional_refs_json` by `ref_type`, `ref_id`, and compatible `version_id`, the runner replaces it with the exact frozen allowed ref object and records `N8_ALLOWED_REF_CANONICALIZED` in `normalization_repairs`.
- The repair does not weaken service gates or widen the ref allowlist. Ambiguous refs, wrong ids, and wrong explicit versions still pass through to the deterministic gate and fail normally.
- Hardened the provider prompt to require whole-object ref copying, including exact `title_card_id` and `version_id`.

## 2026-05-27 N6-N8 Closed-Loop Scenario Coverage
- Added a reusable `runTerminalPackageFromN8` helper to the v1b WorkflowHarness service test suite so loopback/readmission tests can prove downstream N9/N10/N11 closure instead of stopping at a branch decision.
- Added a closed-loop N6 semantic loopback scenario: an all-failed candidate draft blocks with `N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE`, leaves no candidate-set authority, then a regenerated N6 candidate set advances through N7, N8, N9, N10, and terminal N11 `stop_v1b_complete`.
- Added a closed-loop N7 semantic-trial switch scenario: N8 semantic feedback rejects the first active candidate, N7 records the failed trial and selects the second candidate, then that second candidate passes N8 and closes through N11.
- Added a closed-loop N8 gate-rejection readmission scenario: an invalid N8 draft blocks at the deterministic value gate, N7 consumes gate-rejected feedback, readmits the same candidate with a changed N8 debate-admission hash, and the same contract then passes N8 and closes through N11.
- Added a closed-loop exhausted-trials scenario: N7 exhausts all candidate trials with complete failed-trial synthesis and loops back to N6; a regenerated N6 candidate set then advances through N7/N8 and closes through N11.
- These tests keep the loopback/retry mechanics deterministic and service-level. Provider live batches still cover successful N4/N6/N8 semantic drafts, not all negative loopback variants.

## 2026-05-28 N6/N7 Loopback Policy Implementation Alignment
- Aligned N6 and N7 loopback trace payloads with the executable shared policy `loopback_target_codes` instead of free-text `loopback_target` values.
- N6 all-candidate semantic failure now emits `loopback_target_code: n6_regenerate_candidates`, matching the N6 shared policy allowlist. The baseline route target stays on `topic-selection.v1b.generate-topic-question-candidates.v1` so local regeneration does not imply an upstream N5 rollback.
- N7 all-trial exhaustion now emits and persists `loopback_target_code: n7_loopback_to_n6`, matching the N7 shared policy allowlist and the documented N7-to-N6 regeneration path.
- Added service-level assertions that read the persisted trace snapshot, verify `loopback_target_code`, verify legacy `loopback_target` is absent, and verify the emitted code exists in `TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES`.
- This alignment established the baseline `n6_regenerate_candidates`/`n7_loopback_to_n6` codes; the follow-up N6 triage implementation below adds the executable debate-escalation and N5 rollback variants.

## 2026-05-28 N6/N7/N8 Deep Variant Coverage
- Added N6 partial semantic-failure coverage: mixed failed/admissible candidates now prove the runner admits only passing candidates, carries `BLOCKED_CANDIDATES_PRESENT`, preserves compact blocked-candidate context in `admission_readiness`, emits no loopback target code, and leaves N5 selection authority unchanged.
- Added an explicit N6 guard for unsupported debate execution config. A request carrying `execution_spec.debate_config` is rejected by request validation before any control-plane or candidate-set persistence. This prevents policy-declared `n6_debate_escalation` from being accidentally treated as implemented debate execution.
- Tightened N7 gate-rejected feedback handling: `gate_rejected` feedback now requires frozen `n7_n8_debate_admission_review` support before readmission. Without that support, N7 blocks with `N7_GATE_READMISSION_DEBATE_ADMISSION_REQUIRED` instead of falling through to exhausted-trial synthesis semantics.
- Added N7 scheduler/coordination negative variants for duplicate grouping priority and illegal initial failed-trial synthesis. Both block before `TopicQuestionContract` materialization.
- Added N8 deterministic value-gate variants for memo/disposition mismatch, blocking gate with advance, non-ready advance, low-score advance, missing memo citations, and unknown frozen value refs. All block before value-assessment authority writes.
- Remaining scope after this slice was specifically N6 triage-backed debate-escalation and upstream rollback; both are now implemented in the policy/contract section below.

## 2026-05-28 N6 Loopback Triage Contract And Harness Routing
- Added executable shared contract `N6LoopbackTriageSupport@v1` for N6 all-candidate semantic failure triage. The payload declares `loopback_target_code`, failure scope, dominant reason codes, affected refs, regeneration hints, optional debate escalation, optional upstream rollback, and rationale.
- Expanded the N6 shared policy allowlist to three target codes: `n6_regenerate_candidates`, `n6_debate_escalation`, and `n6_loopback_to_n5_select_different_slice`.
- Added explicit N6 loopback route edges in `TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES`: default regeneration and debate escalation route back to N6; slice-level rollback routes to N5 `select-research-slice`.
- The N6 harness now consumes frozen `n6_loopback_triage` support only on all-candidate semantic failure. Without triage it preserves the deterministic default `n6_regenerate_candidates`; with valid triage it writes the target code, route target node id, debate escalation/upstream rollback payload, reason codes, and triage hashes into the trace snapshot and route hash.
- Inconsistent triage is blocked before routing and before any candidate-set authority write. Examples: `n6_debate_escalation` without `debate_escalation`, N5 rollback without `upstream_rollback`, target/scope mismatches, regeneration carrying debate/rollback side effects, or `affected_refs` outside the frozen N6 lineage.
- The shared schema now constrains target/scope combinations: N6 regeneration and debate escalation require `candidate_level` or `question_frame_level`; N5 rollback requires `slice_level` or `upstream_context_level`.
- The service now verifies `affected_refs` against the current frozen N6 lineage (`constraint_profile_ref`, `intake_readiness_ref`, `research_slice_ref`, `research_slice_selection_ref`, `research_slice_option_set_ref`, `selected_slice_option_ref`) and requires the selected `ResearchSlice` ref to be included.
- This implements route-level debate switching and upstream rollback signaling. It does not introduce a hidden live debate executor inside N6; the next N6 attempt must still arrive as a frozen semantic artifact through the existing harness admission boundary.

## 2026-05-28 Provider-Backed Negative Loopback Runner
- Status as of 2026-06-01: superseded and active entry removed by T-112 v1b runtime closure. Historical evidence remains recorded, but `provider_negative_loopbacks` is no longer an accepted harness scenario because promoted N6 draft runtime admission rejects provider `model_option_id` by design.
- Extended `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` with `TOPIC_SELECTION_V1B_HARNESS_SCENARIO=provider_negative_loopbacks` and package script `pnpm topic-selection:v1b-provider-negative-loopbacks`.
- The new scenario keeps the default positive N1-N11 runner unchanged. It builds a fixture-backed N1-N5 setup, then uses live provider artifacts for negative N6/N8 semantic outputs while retaining deterministic harness gates as the authority boundary.
- Covered provider-backed N6 all-failed candidate variants for default `n6_regenerate_candidates`, Codex-triage-backed `n6_debate_escalation`, and Codex-triage-backed `n6_loopback_to_n5_select_different_slice`.
- Covered provider-backed N8 blocking-gate rejection followed by N7 gate-rejected feedback readmission with frozen `n7_n8_debate_admission_review` support.
- Covered provider-backed N8 non-advance assessments across two candidate trials, N7 semantic feedback scheduling of the second candidate, complete failed-trial synthesis, and final `n7_loopback_to_n6` exhaustion.
- Fixed the runner admission shape for mixed provider/Codex support artifacts: mixed-artifact node invocations omit global `execution_spec/profile_id/run_mode` and let each frozen semantic artifact admit against its own slot policy. This avoids a false `RUNTIME_ADMISSION_ARTIFACT_MISMATCH` when provider N6 drafts are combined with Codex N6 triage support.
- Added runner assertions against persisted N6 trace snapshots so provider-negative N6 cases prove the exact `loopback_target_code`, `route_target_node_id`, and debate/upstream rollback payload presence, not just a generic blocked loopback result.

## 2026-05-28 Repeat Semantics And LLM-Facing Runner Guidance

- Kept the low-level v1b harness runner default at `TOPIC_SELECTION_V1B_HARNESS_REPEAT=1`. This remains the right local smoke default. The provider-negative loopback probe default is historical only because that active entry was removed on 2026-06-01.
- Added package script `pnpm topic-selection:v1b-provider-canary` as the explicit provider acceptance entry. This originally ran the N1-N11 harness in `provider_llm` mode with `TOPIC_SELECTION_V1B_HARNESS_REPEAT=3`; the 2026-06-01 T-112 runtime closure retired that interpretation and repointed the command to slot-level provider canaries.
- Added `docs/context/process/topic-selection-v1b-harness-runner.md` as the LLM-facing runner guide and routed `docs/context/AGENTS.md` / `docs/context/INDEX.md` to it. The guide states that `repeat` is exact independent-chain count and fail-fast, not retry budget or an upper bound.
- Added a compact v1b desktop workbench hint that mirrored the original operational口径: UI displays harness-written authority, local smoke defaults to one run, provider canary acceptance used three independent runs, and provider transport retries were configured separately. The 2026-06-01 T-112 repair supersedes the provider-canary part with slot-level live checks.

## 2026-05-28 External Codex CLI N6 Variance Entry

- Added `TOPIC_SELECTION_V1B_HARNESS_SCENARIO=external_codex_n6_variance` and package script `pnpm topic-selection:v1b-external-codex-n6-variance`. The initial generic N6 entry was renamed during final cleanup so N4/N6/N8 variance probes cannot be confused.
- The scenario keeps setup deterministic through N5, then asks independent external `codex exec` sessions to produce N6 `TopicQuestionCandidateSetDraft` JSON. Each result is parsed, frozen as a `codex_assisted` semantic artifact, admitted through the same harness artifact path, and invoked through deterministic N6 gates.
- The external Codex sample count is controlled by `TOPIC_SELECTION_V1B_HARNESS_CODEX_VARIANCE_COUNT` and defaults to 3. This is intentionally separate from `TOPIC_SELECTION_V1B_HARNESS_REPEAT`, which remains the whole-run repeat count.
- External Codex CLI calls prefer the Codex app bundled CLI at `/Applications/Codex.app/Contents/Resources/codex` when present, falling back to `CODEX_CLI_PATH` or `codex`. This avoids stale PATH CLIs that reject current ChatGPT-account model ids. Calls also override local global reasoning effort with `TOPIC_SELECTION_V1B_HARNESS_CODEX_REASONING_EFFORT` (default `high`; `minimal` is avoided because the bundled CLI rejects it when default tools such as web search/image generation are present). `TOPIC_SELECTION_V1B_HARNESS_CODEX_MODEL` is optional and should be set only when a compatible CLI model override is known.
- Evidence is stored under `.ai/.tmp/topic-selection-v1b-harness-e2e/<run-id>/external-codex-n6-variance/sample-<n>/`, including prompt, last message, stdout, stderr, prompt hash, output hash, parsed payload hash, and the N6 gate result.
- This is an external Codex CLI exec-session variance probe for N6 draft quality and harness admission. It does not yet claim full multi-turn human-interactive Codex session variance or live Codex execution for N4/N8.

## 2026-05-28 External Codex CLI N4 Variance Entry

- Added `TOPIC_SELECTION_V1B_HARNESS_SCENARIO=external_codex_n4_variance` and package script `pnpm topic-selection:v1b-external-codex-n4-variance`.
- The scenario creates a deterministic N1-N3 setup, then asks independent external bundled `codex exec` sessions to produce N4 `ResearchSliceOptionSetDraft` JSON.
- Each external N4 result is parsed, frozen as a `codex_assisted` `n4_research_slice_option_draft` semantic artifact, submitted through the harness artifact path, and admitted only by deterministic N4 gates before any `ResearchSliceOptionSet` authority write.
- The N4 prompt keeps refs, option keys, risk enums, selectable conditions, non-goal exclusions, blockers, and `details_payload` structurally strict while allowing bounded natural-language variation in slice statements, expected/fallback claims, evidence-trace rationale, and assumptions.
- A first 3-sample attempt exposed the useful negative edge: Codex paraphrased `excluded_boundaries`, so N4 blocked with `N4_NON_GOAL_NOT_EXCLUDED` before authority writes. The prompt was tightened to preserve excluded non-goals byte-for-byte; the follow-up 1-sample canary and 3-sample run both passed.
- Evidence is stored under `.ai/.tmp/topic-selection-v1b-harness-e2e/<run-id>/external-codex-n4-variance/sample-<n>/`, including prompt, last message, stdout, stderr, prompt hash, output hash, parsed payload hash, and the N4 gate result.
- This is an external Codex CLI exec-session variance probe for N4 slice-option draft quality and harness admission. It still does not claim full multi-turn human-interactive Codex session variance.

## 2026-05-28 External Codex CLI N8 Variance Entry

- Added `TOPIC_SELECTION_V1B_HARNESS_SCENARIO=external_codex_n8_variance` and package script `pnpm topic-selection:v1b-external-codex-n8-variance`.
- The scenario reuses the deterministic N1-N5 setup and creates an independent fixture N6/N7 contract per sample, then asks external bundled `codex exec` sessions to produce N8 `TopicValueAssessmentDraft` JSON.
- Each external N8 result is parsed, frozen as a `codex_assisted` `n8_value_assessment_draft` semantic artifact, submitted through the harness artifact path, and admitted only by deterministic N8 value gates.
- The prompt keeps N8 structurally strict: exact hard-gate order, exact dimension order, exact refs, exact numeric scores, exact `reasoning_memo.effort_to_value`, no `effort_to_value_fit`, and no added/removed memo fields. Only natural-language rationales and memo text may vary.
- Evidence is stored under `.ai/.tmp/topic-selection-v1b-harness-e2e/<run-id>/external-codex-n8-variance/sample-<n>/`, including prompt, last message, stdout, stderr, prompt hash, output hash, parsed payload hash, and the N8 gate result.
- A first N8 run exposed local dev DB schema drift rather than an N8 issue: `.env.local` selected Prisma repositories, but the target schema had not applied repo migrations. Running `pnpm db:dev:migrate` applied the missing migrations before the passing N8 variance run.
- This is an external Codex CLI exec-session variance probe for N8 value-draft quality and harness admission. It still does not claim full multi-turn human-interactive Codex session variance.

## 2026-05-28 Final Cleanup And Dual-Track Risk Review

- Removed obsolete `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`. Its cross-stage acceptance shape depended on retired direct v1b write routes; retained coverage now lives in per-stage route tests, offline replay route tests, v1c route tests, and the v1b harness HTTP N1-N11 smoke.
- Renamed the ambiguous N6 external Codex entry to `topic-selection:v1b-external-codex-n6-variance` and `external_codex_n6_variance`; no generic `external_codex_variance` or `v1b-external-codex-variance` entry remains.
- Rewired `.ai/scripts/topic-selection-real-e2e.mjs` so the v1b leg invokes `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` with `TOPIC_SELECTION_V1B_HARNESS_INPUT_BUNDLE_ID` instead of recreating retired direct write-route orchestration. The quality-negative direct-route mode originally pointed to provider-negative loopbacks; as of 2026-06-01 it points to `pnpm topic-selection:v1b-runtime-stress` and `pnpm topic-selection:v1b-provider-canary`.
- Updated `.ai/scripts/topic-selection-workflow-scenario-runner.mjs` so the `topic-selection.v1b.non-advance-negative.v1` child scenario used the provider-backed v1b harness negative loopback runner instead of setting retired real-e2e quality-negative direct-route env vars. As of 2026-06-01 that child scenario is removed from the active WorkflowScenario runner.
- Removed desktop v1b direct write helpers and inline submit forms. The v1b workbench now displays read-only authority written by the WorkflowHarness path and uses copy that points reviewers to N5/N7/N9/N10 harness-owned progression.
- Tightened N6 loopback triage integrity: the service now requires support, normalized, and provenance artifact refs to exist, and verifies support/normalized artifact checksums against semantic artifact hashes before applying triage routing. A mismatched support artifact blocks with `N6_LOOPBACK_TRIAGE_ARTIFACT_HASH_MISMATCH` before routing or authority writes.
- Cleaned stale local v1b tmp run directories that were unreferenced failed/no-result probes or redundant generated fixture runs. Deliberately documented acceptance evidence under `.ai/.tmp/topic-selection-v1b-harness-e2e/` was preserved.

## 2026-05-28 Follow-Up Cleanup Of Generated Contracts And Dist

- Removed retired v1b direct write routes from the OpenAPI SSOT and regenerated `docs/context/api/API-INDEX.md` / `docs/context/api/api-index.json`. The only formal v1b write/invocation surface in API context is now the harness trio: node invocation, artifact record, and artifact read.
- Removed obsolete OpenAPI request/response schemas for the old direct route path (`TopicSelectionV1bIntakeSnapshotRequest`, direct slice/question/value/package request schemas, and direct creation response schemas). The API context now models harness request/result/artifact contracts instead.
- Rebuilt the tracked desktop renderer bundle from a clean HEAD worktree outside the repo to avoid embedding unrelated dirty experiment-foundation source changes into T-107 dist artifacts. The new tracked bundle no longer contains old v1b submit forms or direct route strings.
- Old direct-route strings intentionally remain only in the v1b harness e2e script and backend route integration test as 404 negative assertions. They are not formal API, UI, package, shared-contract, or process-context entrypoints.

## 2026-06-01 Provider Canary Entrypoint Retirement

- Retired the old interpretation of `pnpm topic-selection:v1b-provider-canary` as an N1-N11 provider-backed repeat harness.
- Root cause: T-112 first-slice runtime admission now deliberately rejects provider `model_option_id` values for promoted N4/N6/N8 semantic artifacts. The fail-closed blocker is correct; the stale package script and runner guide were the drift.
- Repointed `pnpm topic-selection:v1b-provider-canary` to the supported `TopicSelectionProviderCanaryService` live slot tests for v1b N4/N6/N8.
- Updated runner guidance and acceptance wording so deterministic full-chain evidence comes from `pnpm topic-selection:v1b-harness-e2e`, while provider-required-live semantics come from the slot canary entry.
