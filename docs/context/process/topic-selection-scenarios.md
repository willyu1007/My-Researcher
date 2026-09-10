# Topic Selection Workflow Scenarios

> Maintained scenario registry migrated from the historical T-089 bundle during T-145. Task paths and `.ai/scripts` registration rules in historical prose are provenance only; current executable checks live under `apps/backend/scripts/`.

## Purpose
This file is the maintained acceptance-scenario registry, originally established by T-089. Scenarios describe acceptance orchestration only. Business semantics come from the SSOT matrix `docs/context/process/topic-selection-workflow-matrix.md`（原 `06-workflow-matrix.md`，已迁移）and `07-node-policies.md`.

Machine-checked（T-089 ③，2026-07-05 起）: `apps/backend/scripts/topic-selection-workflow-matrix-consistency.mjs`（进 backend 默认套件）双向校验本注册表——矩阵 `covered_scenarios` 引用的 scenario 必须在此注册、此处注册的 scenario 必须被矩阵引用、每个 scenario 的 `covered_nodes` 与矩阵行集合**相等**、covered_nodes 必须是契约已知 node id。

## Required Fields
- `scenario_id`
- `status`
- `purpose`
- `scenario_type`
- `execution_modes`
- `covered_nodes`
- `fixtures_or_data_source`
- `assertion_scope`
- `artifact_expectations`
- `business_semantics_source`

## Test Tier Naming
Use these tier names in verification notes and script summaries to avoid mixing DB, harness, and provider evidence.

| Tier | Meaning | Provider requirement |
|---|---|---|
| `unit_mocked_dependencies` | Service or contract tests with in-memory/mocked dependencies. | none |
| `harness_mocked_llm` | WorkflowHarness execution with deterministic mocked or Codex-supplied structured outputs. | none |
| `real_db_harness_smoke` | Local real DB plus WorkflowHarness, using existing resource/sample authorities and controlled model-like outputs. | none unless the scenario explicitly sets `provider_llm` |
| `real_db_replay_smoke` | Local real DB replay/idempotency check over existing durable traces and authorities. | none |
| `real_provider_canary` | Small, explicit-cost run against registered provider LLMs to test structured output quality, latency, telemetry, and failure shape. | provider credentials required |

## Registry

Execution modes below describe each scenario's covered product paths, not automatic admission
for every slot or generic scenario-runner dispatch. The typed policies and default model profiles
remain authoritative. T-153 qualifies all 36 product Codex profiles; compatibility modes retain
their existing contracts and other-provider Debate activation remains deferred. Whole HTTP
composition and PostgreSQL reconstruction are verified by the CLI product test in
`topic-selection-v1b-routes.integration.test.ts`; this controlled chain starts with managed
literature preparation, while sampling, convergence, optional support and loopbacks have separate
stage checks and real-model qualifications recorded in T-153 verification.

### `topic-selection.real-e2e.canary.v1`
```yaml
scenario_id: topic-selection.real-e2e.canary.v1
status: partial_runner_migrated
purpose: Full-chain small-sample happy path from resource sampling through PaperProject intake.
scenario_type: real_db_harness_smoke
execution_modes: [codex_assisted, mocked_llm, provider_llm]
covered_nodes:
  - topic-selection.resource-sampling.create-sample-set.v1
  - topic-selection.v1a.create-topic-seed.v1
  - topic-selection.v1a.snapshot-literature-resource-pool.v1
  - topic-selection.v1a.create-search-plan.v1
  - topic-selection.v1a.record-search-run.v1
  - topic-selection.v1a.build-evidence-map.v1
  - topic-selection.v1a.generate-need-candidate.v1
  - topic-selection.v1a.validate-need-adjudication.v1
  - topic-selection.v1a.human-confirm-need.v1
  - topic-selection.v1a.publish-v1b-input-bundle.v1
  - topic-selection.v1b.create-intake-snapshot.v1
  - topic-selection.v1b.record-research-constraint-profile.v1
  - topic-selection.v1b.assess-intake-readiness.v1
  - topic-selection.v1b.generate-research-slice-options.v1
  - topic-selection.v1b.select-research-slice.v1
  - topic-selection.v1b.generate-topic-question-candidates.v1
  - topic-selection.v1b.materialize-topic-question-contract.v1
  - topic-selection.v1b.assess-topic-value.v1
  - topic-selection.v1b.decide-value-disposition.v1
  - topic-selection.v1b.create-draft-topic-package.v1
  - topic-selection.v1b.publish-v1c-input-bundle.v1
  - topic-selection.v1c.create-promotion-input-snapshot.v1
  - topic-selection.v1c.generate-promotion-support.v1
  - topic-selection.v1c.run-promotion-gate.v1
  - topic-selection.v1c.record-human-promotion-decision.v1
  - topic-selection.v1c.create-paper-project-bridge.v1
  - topic-selection.downstream.paper-project-intake.v1
fixtures_or_data_source: real resource pool sample such as ai-rag-finetuning-2022-2026 plus human decision fixtures where required
assertion_scope: happy-path authority creation, handoff refs, bridge intake idempotency, hash stability, and artifact generation
artifact_expectations: real-e2e summary with scenario_id, harness run summary for generate-need-candidate, node traces, redacted prompt/response packets where model-like execution occurs, authority refs, and selected evidence refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
```

### `topic-selection.v1a.replay-idempotency.real-db-smoke.v1`
```yaml
scenario_id: topic-selection.v1a.replay-idempotency.real-db-smoke.v1
status: runner_migrated
purpose: Verify N6-N9 exact replay and input-hash drift blocking against local real DB traces and authorities.
scenario_type: real_db_replay_smoke
execution_modes: [mocked_llm, codex_assisted, provider_llm]
covered_nodes:
  - topic-selection.v1a.generate-need-candidate.v1
  - topic-selection.v1a.validate-need-adjudication.v1
  - topic-selection.v1a.human-confirm-need.v1
  - topic-selection.v1a.publish-v1b-input-bundle.v1
fixtures_or_data_source: v1a harness run over a local real DB and existing or newly created ResourceSampleSet
assertion_scope: same `workflow_run_id + node_attempt_id + input_hash` returns replay provenance with no authority writes and no model invocation; changed input hash blocks with `REPLAY_INPUT_HASH_MISMATCH` and no authority writes
artifact_expectations: `03-v1a-replay-smoke.json` plus summary fields showing exact replay counts, LLM call count stability, drift blocker codes, and artifact deltas
business_semantics_source: 07-node-policies.md Current v1a Replay / Idempotency Matrix
runner: `pnpm topic-selection:v1a-harness-replay-smoke`
```

### `topic-selection.real-e2e.scale-quality.v1`
```yaml
scenario_id: topic-selection.real-e2e.scale-quality.v1
status: runner_migrated
purpose: Larger-sample quality and stability acceptance over the real resource pool.
scenario_type: scale_quality_gate
execution_modes: [provider_llm, codex_assisted, mocked_llm]
covered_nodes:
  - topic-selection.resource-sampling.create-sample-set.v1
  - topic-selection.v1a.create-topic-seed.v1
  - topic-selection.v1a.snapshot-literature-resource-pool.v1
  - topic-selection.v1a.create-search-plan.v1
  - topic-selection.v1a.record-search-run.v1
  - topic-selection.v1a.build-evidence-map.v1
  - topic-selection.v1a.generate-need-candidate.v1
  - topic-selection.v1a.validate-need-adjudication.v1
  - topic-selection.v1a.human-confirm-need.v1
  - topic-selection.v1a.publish-v1b-input-bundle.v1
  - topic-selection.v1b.create-intake-snapshot.v1
  - topic-selection.v1b.record-research-constraint-profile.v1
  - topic-selection.v1b.assess-intake-readiness.v1
  - topic-selection.v1b.generate-research-slice-options.v1
  - topic-selection.v1b.select-research-slice.v1
  - topic-selection.v1b.generate-topic-question-candidates.v1
  - topic-selection.v1b.materialize-topic-question-contract.v1
  - topic-selection.v1b.assess-topic-value.v1
  - topic-selection.v1b.decide-value-disposition.v1
  - topic-selection.v1b.create-draft-topic-package.v1
  - topic-selection.v1b.publish-v1c-input-bundle.v1
  - topic-selection.v1c.create-promotion-input-snapshot.v1
  - topic-selection.v1c.generate-promotion-support.v1
  - topic-selection.v1c.run-promotion-gate.v1
  - topic-selection.v1c.record-human-promotion-decision.v1
  - topic-selection.v1c.create-paper-project-bridge.v1
  - topic-selection.downstream.paper-project-intake.v1
fixtures_or_data_source: expanded real resource sample set
assertion_scope: sampling stability, role-count stability, selected-set stability, quality degradation checks, and downstream intake invariants
artifact_expectations: quality summary from topic-selection-workflow-scenario-runner, sampled-resource audit table, node traces, selected evidence refs, covered child scenario ids, and comparison metrics
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
```

### `topic-selection.v1b.non-advance-negative.v1`
```yaml
scenario_id: topic-selection.v1b.non-advance-negative.v1
status: runner_migrated
purpose: Verify weak value assessment stops before package, v1c, bridge, and PaperProject intake.
scenario_type: negative
execution_modes: [codex_assisted, mocked_llm, provider_llm]
covered_nodes:
  - topic-selection.v1a.create-topic-seed.v1
  - topic-selection.v1a.snapshot-literature-resource-pool.v1
  - topic-selection.v1a.create-search-plan.v1
  - topic-selection.v1a.record-search-run.v1
  - topic-selection.v1a.build-evidence-map.v1
  - topic-selection.v1a.generate-need-candidate.v1
  - topic-selection.v1a.validate-need-adjudication.v1
  - topic-selection.v1a.human-confirm-need.v1
  - topic-selection.v1a.publish-v1b-input-bundle.v1
  - topic-selection.v1b.create-intake-snapshot.v1
  - topic-selection.v1b.record-research-constraint-profile.v1
  - topic-selection.v1b.assess-intake-readiness.v1
  - topic-selection.v1b.generate-research-slice-options.v1
  - topic-selection.v1b.select-research-slice.v1
  - topic-selection.v1b.generate-topic-question-candidates.v1
  - topic-selection.v1b.materialize-topic-question-contract.v1
  - topic-selection.v1b.assess-topic-value.v1
  - topic-selection.v1b.decide-value-disposition.v1
fixtures_or_data_source: controlled weak-value v1b input or real-flow fork with low value outcome
assertion_scope: non-advance disposition, package_draft_input=null, output_topic_package_id=null, no v1c bundle, no promotion, no bridge, no PaperProject intake
artifact_expectations: scenario summary from topic-selection-workflow-scenario-runner, stop-node trace, non-advance disposition artifact, absence assertions for downstream authority refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
```

### `topic-selection.provider-stability.v1`
```yaml
scenario_id: topic-selection.provider-stability.v1
status: partial_runner_migrated
purpose: Exercise real provider execution for model-like nodes without changing default provider-required policy.
scenario_type: real_provider_canary
execution_modes: [provider_llm]
covered_nodes:
  - topic-selection.resource-sampling.create-sample-set.v1
  - topic-selection.v1a.build-evidence-map.v1
  - topic-selection.v1a.generate-need-candidate.v1
  - topic-selection.v1a.validate-need-adjudication.v1
  - topic-selection.v1b.generate-research-slice-options.v1
  - topic-selection.v1b.generate-topic-question-candidates.v1
  - topic-selection.v1b.assess-topic-value.v1
  - topic-selection.v1c.generate-promotion-support.v1
fixtures_or_data_source: real or deterministic resource sample plus provider credentials from local environment
assertion_scope: structured output validity, retry/escalation behavior, provider telemetry capture, provenance separation, and guardrail consistency
artifact_expectations: provider prompt/response packet refs, telemetry summaries, schema validation reports, and node-level audit refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
current_runner_coverage:
  - v1a harness canary covers provider-backed `generate-need-candidate` and `validate-need-adjudication`.
  - v1b/v1c provider-backed nodes remain planned coverage and must not be inferred from the v1a canary.
```

### `topic-selection.downstream.feedback-recheck.v1`
```yaml
scenario_id: topic-selection.downstream.feedback-recheck.v1
status: partial_runner_migrated
purpose: Verify downstream feedback creates typed loopback/recheck records without mutating upstream topic-selection authority.
scenario_type: downstream_loopback
execution_modes: [none, codex_cli, codex_assisted]
covered_nodes:
  - topic-selection.v1c.create-paper-project-bridge.v1
  - topic-selection.v1c.downstream-feedback-recheck.v1
  - topic-selection.downstream.paper-project-intake.v1
fixtures_or_data_source: active PaperProjectBridge and controlled downstream feedback payloads
assertion_scope: feedback source lineage, typed loopback target, recheck request creation, append-only feedback, and upstream immutability
artifact_expectations: feedback trace, recheck request refs, bridge hash comparison, and upstream immutability assertion evidence
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: T-153 product Codex reads the complete bridge and raw report, produces a validated normalization candidate and calls the existing record-only feedback/recheck owner. Real overclaim and no-recheck cases, full HTTP composition and persisted replay pass; ambiguous partial recheck writes remain fail-closed.
```

### `topic-selection.debate.resource-sampling-polarity.v1`
```yaml
scenario_id: topic-selection.debate.resource-sampling-polarity.v1
status: planned_after_node_policy
purpose: Verify arbiter-led internal debate can resolve resource-sampling polarity and role conflicts before sample-set finalization.
scenario_type: debate
execution_modes: [codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.resource-sampling.create-sample-set.v1
fixtures_or_data_source: controlled candidate pool with evidence-polarity ambiguity
assertion_scope: debate trigger, arbiter issue framing, explorer expansion, deep critic pressure test, terminal exit, no automatic re-entry, deterministic guardrail application, and sample-set status
artifact_expectations: role agent provenance, role-level summaries, arbiter final structured output, trigger codes, terminal reason codes, validation report, and final selected item refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
```

### `topic-selection.debate.v1a-need-discovery.v1`
```yaml
scenario_id: topic-selection.debate.v1a-need-discovery.v1
status: implemented
purpose: Verify arbiter-led debate can deepen v1a need discovery and persist a bounded batch of grounded NeedCandidates into the existing candidate pool before adjudication.
scenario_type: debate
execution_modes: [codex_cli, codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.v1a.generate-need-candidate.v1
fixtures_or_data_source: controlled evidence map with multiple plausible need framings, support/challenge tension, and prior-art risk
assertion_scope: D-25 implementation slice coverage, deterministic-before-LLM verification order, mocked-before-provider/codex staged verification, GenerateNeedCandidateNodeInput validation, stable GenerateNeedCandidateNodeResult shape across execution modes, status versus terminal_result mapping, debate trigger, exploration_context versus arbiter_context separation, evidence signal extraction, candidate framing expansion, optional arbiter-scoped supplemental rounds up to 3 total rounds, SupplementalRoundRoutingDecision production, supplementable versus non-supplementable reason handling, no broad re-exploration, ranked candidate draft batch minimum schema validation, CandidateDraftAdmissionReport production, admission gate decisions, PersistNeedCandidateBatchCommand validation, idempotent all-or-none NeedCandidate persistence, candidate-pool projection refs/hash, downstream handoff refs only, candidate-pool comparison, draft-to-NeedCandidate mapping, bounded NeedCandidate persistence, per-candidate validation, rejected alternative artifacts, no raw debate transcript handoff, no NeedCandidateSet authority, no SearchPlan mutation, and no ValidatedNeed creation
artifact_expectations: D-25 implementation slice evidence, GenerateNeedCandidateNodeResult, context packet refs/hashes, shared context envelope, exploration_context digest, arbiter_context digest, cache hit/miss provenance, memory admission summary, role agent provenance, role-level summaries, SupplementalRoundRoutingDecision and supplemental-round requests when used, ranked candidate draft batch artifact, minimum schema validation report, CandidateDraftAdmissionReport, PersistNeedCandidateBatchCommand redacted snapshot, arbiter candidate batch synthesis, rejected/merged framing rationale, unresolved points, batch ranking, draft-to-record mapping report, candidate-pool projection refs/hash, validation report, persisted NeedCandidate refs, and candidate discovery audit refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: The canonical WorkflowHarness executes two Explorers, DeepCritic, Arbiter framing and final synthesis through product Codex, validates complete role refs and persists admitted batches with exact replay. T-153 real-model cases cover insufficient evidence, disagreement and non-advance. Supplemental routing and successor/linked-round owners retain their existing boundaries; generic scenario-wrapper coverage is separate.
```

### `topic-selection.debate.v1b-n6-topic-candidates.v1`
```yaml
scenario_id: topic-selection.debate.v1b-n6-topic-candidates.v1
status: implemented
purpose: Verify the N6 divergent candidate debate loop (explorer/critic/arbiter fan-out) deepens topic-question candidate generation behind the deterministic N6 gate.
scenario_type: debate
execution_modes: [codex_cli, codex_assisted, mocked_llm, provider_llm]
covered_nodes:
  - topic-selection.v1b.generate-topic-question-candidates.v1
fixtures_or_data_source: controlled frozen N5 selection for regular initial review, plus candidate-quality failure fixtures for conditional n6_debate_escalation recovery
assertion_scope: required initial-path Debate in coordinator and Codex product HTTP, exact receipt replay and drift rejection, conditional recovery via deterministic gate codes, caller-side runtime execution, divergent loop `v1b_n6_divergent_candidate_debate` role fan-out, deterministic admission, arbiter draft funnel into the existing N6 gate, no unreviewed initial product admission, and loopback re-entry projection attachment
artifact_expectations: four role outputs/audits, arbiter draft batch, input-bound Debate receipt with admission/transcript/gate draft, conditional gate-failure retry-context projection refs, and harness trace refs
business_semantics_source: docs/context/process/topic-selection-workflow-matrix.md + 07-node-policies.md
implementation_note: T-153 qualifies and enables regular, gate-failure regeneration and N7-loopback Codex Debate through canonical product callers, with four actual role outputs and a deterministic Arbiter-to-N6 bridge. T-129 C-2 corpus gating is superseded for Codex by approved role-specific qualification; other-provider activation remains deferred under its separate dormancy gate.
```

### `topic-selection.debate.v1b-value-tension.v1`
```yaml
scenario_id: topic-selection.debate.v1b-value-tension.v1
status: implemented
purpose: Verify bounded debate can evaluate novelty versus feasibility tension in topic value assessment.
scenario_type: debate
execution_modes: [codex_cli, codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.v1b.assess-topic-value.v1
fixtures_or_data_source: controlled TopicQuestionContract and value input with novelty/feasibility disagreement
assertion_scope: ordinary assessment and signal/operator-triggered Debate, N7 admission, four ordered assessor/value_critic/assessor_repair/synthesizer_final outputs, actual prior bodies, Critic finding resolution, deterministic value disposition, non-advance, exact replay and drift rejection
artifact_expectations: four role outputs and CLI audits, assessment draft, input-bound completion receipt, exact citations, Critic resolutions, validation report and value assessment refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: T-153 qualifies ordinary N8 and the four-role Codex sequence (assessor/value_critic/assessor_repair/synthesizer_final). Actual trigger feedback flows through N7 admission and the same bounded loopback guards. Both repair and final synthesis must resolve Critic findings; research deficits remain explicit. T-129 prompt obligations are superseded for Codex by role-specific qualification; other-provider activation remains deferred.
```

### `topic-selection.debate.v1c-promotion-support-risk.v1`
```yaml
scenario_id: topic-selection.debate.v1c-promotion-support-risk.v1
status: implemented
purpose: Require one bounded Debate for accepted risks or material RiskFinding refs before a new deterministic promotion gate.
scenario_type: debate
execution_modes: [codex_cli, codex_assisted]
covered_nodes:
  - topic-selection.v1c.generate-promotion-support.v1
fixtures_or_data_source: frozen PromotionInputSnapshot; in-memory runtime and HTTP fixtures with typed risks and a risk-free deterministic control
assertion_scope: required-risk trigger, risk-free fast path, four ordered product role audits, material-risk and accepted-risk coverage, complete typed condition groups and early checks, Human-edited exact mappings and unmapped-risk rejection without partial decision writes, deterministic N3 authority, exact replay and conflicting input, legacy support refusal and historical gate replay
artifact_expectations: support and dossier with support_policy, condition_candidates, admission identity and debate_execution containing four role artifacts; zero backend provider calls; N2/N3 author no N4 decision; explicit Human conditions alone reach the existing N4 authority
business_semantics_source: topic-selection-workflow-matrix.md + T-148 roadmap material-risk policy
implementation_note: T-148 established required risk Debate and exact Human condition mapping. T-153 qualifies all four Codex roles against original evidence and actual prior outputs, verifies N3/support commit recovery and composes promotion, bridge, intake and feedback. No generic scenario-registry dispatch or other-provider activation is implied.
```
