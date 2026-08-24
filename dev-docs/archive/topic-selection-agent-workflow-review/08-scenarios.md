# 08 Scenarios

## Purpose
This file is the scenario registry for T-089. Scenarios describe acceptance orchestration only. Business semantics come from the SSOT matrix `docs/context/process/topic-selection-workflow-matrix.md`（原 `06-workflow-matrix.md`，已迁移）and `07-node-policies.md`.

Machine-checked（T-089 ③，2026-07-05 起）: `.ai/scripts/topic-selection-workflow-matrix-consistency.mjs`（进 backend 默认套件）双向校验本注册表——矩阵 `covered_scenarios` 引用的 scenario 必须在此注册、此处注册的 scenario 必须被矩阵引用、每个 scenario 的 `covered_nodes` 与矩阵行集合**相等**、covered_nodes 必须是契约已知 node id；并按 T-088 D-28 校验每个 `.ai/scripts/topic-selection-*.mjs` 已在本文件登记（见文末 Script Registration Map）。

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
execution_modes: [none, codex_assisted]
covered_nodes:
  - topic-selection.v1c.create-paper-project-bridge.v1
  - topic-selection.v1c.downstream-feedback-recheck.v1
  - topic-selection.downstream.paper-project-intake.v1
fixtures_or_data_source: active PaperProjectBridge and controlled downstream feedback payloads
assertion_scope: feedback source lineage, typed loopback target, recheck request creation, append-only feedback, and upstream immutability
artifact_expectations: feedback trace, recheck request refs, bridge hash comparison, and upstream immutability assertion evidence
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: 状态对齐 2026-07-06（T-089 ④ 复核确认项）——v1c N6 feedback-normalization 候选运行时已实装（codex_assisted 支持路径，pnpm 接线 + 单测在案），smoke runner=topic-selection-v1c-n6-runtime-smoke.mjs（见 Script Registration Map）；此前 status=planned_migration / execution_modes=[none] 为未建成时代的陈述。
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
status: planned_after_node_policy
purpose: Verify arbiter-led debate can deepen v1a need discovery and persist a bounded batch of grounded NeedCandidates into the existing candidate pool before adjudication.
scenario_type: debate
execution_modes: [codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.v1a.generate-need-candidate.v1
fixtures_or_data_source: controlled evidence map with multiple plausible need framings, support/challenge tension, and prior-art risk
assertion_scope: D-25 implementation slice coverage, deterministic-before-LLM verification order, mocked-before-provider/codex staged verification, GenerateNeedCandidateNodeInput validation, stable GenerateNeedCandidateNodeResult shape across execution modes, status versus terminal_result mapping, debate trigger, exploration_context versus arbiter_context separation, evidence signal extraction, candidate framing expansion, optional arbiter-scoped supplemental rounds up to 3 total rounds, SupplementalRoundRoutingDecision production, supplementable versus non-supplementable reason handling, no broad re-exploration, ranked candidate draft batch minimum schema validation, CandidateDraftAdmissionReport production, admission gate decisions, PersistNeedCandidateBatchCommand validation, idempotent all-or-none NeedCandidate persistence, candidate-pool projection refs/hash, downstream handoff refs only, candidate-pool comparison, draft-to-NeedCandidate mapping, bounded NeedCandidate persistence, per-candidate validation, rejected alternative artifacts, no raw debate transcript handoff, no NeedCandidateSet authority, no SearchPlan mutation, and no ValidatedNeed creation
artifact_expectations: D-25 implementation slice evidence, GenerateNeedCandidateNodeResult, context packet refs/hashes, shared context envelope, exploration_context digest, arbiter_context digest, cache hit/miss provenance, memory admission summary, role agent provenance, role-level summaries, SupplementalRoundRoutingDecision and supplemental-round requests when used, ranked candidate draft batch artifact, minimum schema validation report, CandidateDraftAdmissionReport, PersistNeedCandidateBatchCommand redacted snapshot, arbiter candidate batch synthesis, rejected/merged framing rationale, unresolved points, batch ranking, draft-to-record mapping report, candidate-pool projection refs/hash, validation report, persisted NeedCandidate refs, and candidate discovery audit refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: D-25 WorkflowHarness plumbing cases exist for finalize-persist, supplemental-routing, admission-blocked, duplicate merge-hint, malformed blocked output, execution-mode shape stability, and persistence-conflict rollback; the initial multi-agent debate role loop is implemented through TopicSelectionNeedDiscoveryDebateLoopService; the real E2E canary now routes v1a generate-need-candidate through WorkflowHarness, while full scenario-wrapper migration for remaining nodes and automated supplemental repair rounds remain pending.
```

### `topic-selection.debate.v1b-n6-topic-candidates.v1`
```yaml
scenario_id: topic-selection.debate.v1b-n6-topic-candidates.v1
status: runtime_implemented_prompts_gated
purpose: Verify the N6 divergent candidate debate loop (explorer/critic/arbiter fan-out) deepens topic-question candidate generation behind the deterministic N6 gate.
scenario_type: debate
execution_modes: [codex_assisted, mocked_llm, provider_llm]
covered_nodes:
  - topic-selection.v1b.generate-topic-question-candidates.v1
fixtures_or_data_source: controlled research-slice selection with candidate-quality tension triggering the n6_debate_escalation loopback
assertion_scope: debate trigger via deterministic gate codes, caller-side runtime execution, divergent loop `v1b_n6_divergent_candidate_debate` role fan-out, deterministic admission, arbiter draft funnel into the existing N6 gate, provisional-threshold tripwire emission, and loopback re-entry projection attachment
artifact_expectations: role outputs, arbiter draft batch, admission report, gate-failure retry-context projection refs, and harness trace refs
business_semantics_source: docs/context/process/topic-selection-workflow-matrix.md + 07-node-policies.md
implementation_note: runtime implemented T-127 W-07 (2026-06-20, caller-side debate + runDivergentLoop; JD D-T127-02); provider_llm debate path product-gated by W-14 dormancy (release owned by T-129 C-3); gated prompt bodies are T-129 C-2 scope. Registered 2026-07-05 (T-089 slice ③) because the SSOT matrix N6 row references this scenario id.
```

### `topic-selection.debate.v1b-value-tension.v1`
```yaml
scenario_id: topic-selection.debate.v1b-value-tension.v1
status: runtime_implemented_prompts_gated
purpose: Verify bounded debate can evaluate novelty versus feasibility tension in topic value assessment.
scenario_type: debate
execution_modes: [codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.v1b.assess-topic-value.v1
fixtures_or_data_source: controlled TopicQuestionContract and value input with novelty/feasibility disagreement
assertion_scope: debate trigger, novelty advocate output, feasibility skeptic output, reviewer arbiter result, disposition recommendation consistency, and blocker handling
artifact_expectations: role outputs, arbiter summary, value dimension deltas, validation report, and value assessment audit refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
implementation_note: 状态对齐 2026-07-06（T-089 ④ 复核确认项,原 status=planned_after_node_policy 为三方错位中最陈旧一方）——bounded_sequence 运行时 T-123 Phase 3 已实装并产品接线（N6 同形 gate 触发 T1/T3 → loopback n8_feedback_to_n7 → N7 debate_admission_review → 4 角色有界序列,coordinator 全闭环驱动,e2e 在案）；gated prompt 正文属 T-129 C-2,provider debate 路径受 W-14 dormancy(T-129 C-3)。角色词汇以实现为准（assessor/value_critic/assessor_repair/synthesizer_final,见矩阵 slot map）,本条目早期 novelty-advocate/feasibility-skeptic 表述为设计期语言。
```

### `topic-selection.debate.v1c-promotion-support-risk.v1`
```yaml
scenario_id: topic-selection.debate.v1c-promotion-support-risk.v1
status: planned_after_node_policy
purpose: Verify bounded debate can evaluate accepted-risk tension before deterministic promotion gate execution.
scenario_type: debate
execution_modes: [codex_assisted, provider_llm, mocked_llm]
covered_nodes:
  - topic-selection.v1c.generate-promotion-support.v1
fixtures_or_data_source: controlled PromotionInputSnapshot with accepted risks and promotion-readiness tension
assertion_scope: debate trigger, promotion advocate output, blocker reviewer output, support arbiter output, accepted-risk carry-forward, and gate-advisory boundary
artifact_expectations: role outputs, arbiter summary, accepted-risk coverage table, validation report, and support audit refs
business_semantics_source: 06-workflow-matrix.md + 07-node-policies.md
```

## Script Registration Map（T-088 D-28）

D-28（T-088 `06-joint-decisions.md`，2026-07-05）硬约束：任何新增 topic-selection acceptance 脚本必须在本文件登记；一致性脚本机器校验每个 `.ai/scripts/topic-selection-*.mjs` 文件名出现在本文件中。

| 脚本 | 角色 | 关联 scenario / 说明 |
|---|---|---|
| topic-selection-real-e2e.mjs | E2E 执行引擎 | `topic-selection.real-e2e.canary.v1` / `topic-selection.real-e2e.scale-quality.v1` 的底层执行引擎（由 scenario runner 编排） |
| topic-selection-workflow-scenario-runner.mjs | 注册 runner | canary + scale-quality 两注册 scenario 的入口 runner（承接旧 quality-gate 断言） |
| topic-selection-multisample-provider-batch.mjs | 批量编排 | `topic-selection.provider-stability.v1` 多样本批跑编排 |
| topic-selection-v1a-harness-e2e.mjs | E2E | canary v1a 腿；`topic-selection.debate.v1a-need-discovery.v1`；`topic-selection.v1a.replay-idempotency.real-db-smoke.v1`（runner `pnpm topic-selection:v1a-harness-replay-smoke`） |
| topic-selection-v1a-harness-negative-e2e.mjs | 负例 E2E | v1a 失败路径/负例诊断（canary 负例面） |
| topic-selection-v1a-runtime-stress.mjs | stress | scale-quality 支撑：v1a prompt-packet cache 压测 |
| topic-selection-v1b-harness-e2e.mjs | E2E | canary/scale-quality v1b 腿；`topic-selection.v1b.non-advance-negative.v1` |
| topic-selection-v1b-near-prod-deep-test.mjs | 深测编排 | scale-quality v1b 深度验收编排（spawn harness/stress） |
| topic-selection-v1b-runtime-stress.mjs | stress | scale-quality 支撑：v1b cache/并发压测 |
| topic-selection-v1c-harness-acceptance.mjs | acceptance | canary/scale-quality v1c 腿 |
| topic-selection-v1c-n2-runtime-smoke.mjs | smoke | v1c N2（`topic-selection.debate.v1c-promotion-support-risk.v1` runtime smoke） |
| topic-selection-v1c-n4-runtime-smoke.mjs | smoke | v1c N4 人工晋升决策路由 smoke |
| topic-selection-v1c-n6-runtime-smoke.mjs | smoke | `topic-selection.downstream.feedback-recheck.v1` smoke |
| topic-selection-v1c-production-depth.mjs | 深测 | scale-quality v1c 深度面 |
| topic-selection-v1c-real-codex-acceptance.mjs | acceptance | canary codex 档 v1c 验收 |
| topic-selection-v1c-runtime-stress.mjs | stress | v1c smoke 场景压测编排 |
| topic-selection-w15-s4-signoff-product-run.mjs | ~~product-run~~ 已退役 (2026-07-07) | 原 T-128 W-15 S4 签核摩擦产品跑；D-30 将 N6/N8 阈值重定性 advisory 并退役 sign_off_required 门后，其断言行为不复存在，脚本文件已删除（记录保留供追溯） |
| topic-selection-workflow-matrix-consistency.mjs | checker | 本机器校验自身（SSOT 矩阵 ↔ 契约 ↔ 本注册表） |
