import { promotionDebateRoleOutputs as allRoleOutputs, promotionConditionCandidates } from './test-fixtures/topic-selection-v1c-promotion-debate.fixture.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
  TopicSelectionPromotionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionV1cN2BoundedDebateAdmissionService,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import { TopicSelectionV1cN2BoundedDebateRuntimeService } from './topic-selection-v1c-n2-bounded-debate-runtime-service.js';
import { TopicSelectionV1cPromotionGateService } from './topic-selection-v1c-promotion-gate-service.js';
import { TopicSelectionV1cN2BoundedDebateCoordinatorService } from './topic-selection-v1c-n2-bounded-debate-coordinator-service.js';

const NOW = '2026-06-02T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_card_001', version_id: versionId };
}

function makeEvidenceRef() {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    evidence_ref: ref('evidence_unit', 'evidence_unit_001'),
    evidence_role: 'support' as const,
    mapped_question_part: 'main_question',
    rationale: 'supports the package',
    source_locator_snapshot: {},
    created_at: NOW,
  };
}

function makeHandoff(): TopicSelectionPromotionInputSnapshotHandoff {
  const promotionInputSnapshotRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  const recheckRef = ref('recheck_request', 'recheck_request_001');
  const snapshot: TopicSelectionPromotionInputSnapshotRecord = {
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    closure_status: 'ready_for_gate',
    stop_condition_code: null,
    required_actions: [],
    blockers: [],
    warnings: [],
    check_details: [],
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    source_bundle_ref: ref('v1b_to_v1c_input_bundle', 'v1b_to_v1c_input_bundle_001'),
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    topic_package_ref: ref('topic_package', 'topic_package_001', 'v1'),
    package_trace_boundary_check_ref: ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
    package_readiness_assessment_ref: ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    topic_value_assessment_ref: ref('topic_value_assessment', 'topic_value_assessment_001'),
    value_reasoning_memo_ref: ref('value_reasoning_memo', 'value_reasoning_memo_001'),
    value_disposition_decision_ref: ref('value_disposition_decision', 'value_disposition_decision_001'),
    topic_question_ref: ref('topic_question', 'topic_question_001'),
    topic_question_contract_ref: ref('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: ref('topic_question_answerability_plan', 'answerability_plan_001'),
    research_slice_ref: ref('research_slice', 'research_slice_001', 'v1'),
    validated_need_refs: [ref('validated_need', 'validated_need_001')],
    evidence_refs: [makeEvidenceRef()],
    accepted_risk_refs: [acceptedRiskRef],
    blocker_refs: [ref('blocker', 'blocker_001')],
    memory_suggestion_refs: [ref('memory_suggestion', 'memory_suggestion_001')],
    recheck_request_refs: [recheckRef],
    readiness_check_refs: [
      ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
      ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    ],
    replacement_bundle_ref: null,
    source_bundle_snapshot: {} as never,
    package_snapshot: {
      topic_package_id: 'topic_package_001',
      title_card_id: 'title_card_001',
      package_version: 'v1',
      package_readiness_status: 'ready_for_promotion_review',
      contribution_summary: 'A focused contribution summary.',
      evaluation_plan: 'A bounded evaluation plan.',
      claim_ceiling: 'Correlation and mechanism claims only.',
      selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      package_payload: { claim_ceiling_summary: 'Correlation and mechanism claims only.' },
    } as never,
    package_draft_input_snapshot: {
      question_contract: { claim_ceiling: 'Correlation and mechanism claims only.' },
    } as never,
    input_snapshot_id: 'input_snapshot_source_001',
    workflow_run_id: 'workflow_run_source_001',
    gate_result_id: 'gate_result_source_001',
    transition_attempt_id: 'transition_attempt_source_001',
    trace_snapshot_id: 'trace_snapshot_source_001',
    artifact_refs: [ref('artifact_ref', 'artifact_ref_source_001')],
    created_by: 'system',
    created_at: NOW,
  };
  return {
    promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    v1b_to_v1c_input_bundle_id: snapshot.v1b_to_v1c_input_bundle_id,
    topic_package_id: snapshot.topic_package_id,
    package_version: snapshot.package_version,
    closure_status: 'ready_for_gate',
    topic_package_ref: snapshot.topic_package_ref,
    package_trace_boundary_check_ref: snapshot.package_trace_boundary_check_ref,
    package_readiness_assessment_ref: snapshot.package_readiness_assessment_ref,
    topic_value_assessment_ref: snapshot.topic_value_assessment_ref,
    value_reasoning_memo_ref: snapshot.value_reasoning_memo_ref,
    value_disposition_decision_ref: snapshot.value_disposition_decision_ref,
    topic_question_ref: snapshot.topic_question_ref,
    topic_question_contract_ref: snapshot.topic_question_contract_ref,
    answerability_plan_ref: snapshot.answerability_plan_ref,
    research_slice_ref: snapshot.research_slice_ref,
    validated_need_refs: snapshot.validated_need_refs,
    evidence_refs: snapshot.evidence_refs,
    accepted_risk_refs: snapshot.accepted_risk_refs,
    blocker_refs: snapshot.blocker_refs,
    memory_suggestion_refs: snapshot.memory_suggestion_refs,
    recheck_request_refs: snapshot.recheck_request_refs,
    readiness_check_refs: snapshot.readiness_check_refs,
    snapshot_hashes: {
      bundle_hash: snapshot.bundle_hash,
      package_snapshot_hash: snapshot.package_snapshot_hash,
      package_draft_input_snapshot_hash: snapshot.package_draft_input_snapshot_hash,
      promotion_input_snapshot_hash: snapshot.promotion_input_snapshot_hash,
    },
    snapshot,
  };
}

function makeIdFactory(): (prefix: string) => string {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

class StubPromotionInputService {
  calls = 0;
  constructor(private readonly handoff: TopicSelectionPromotionInputSnapshotHandoff) {}
  async getPromotionInputHandoff(): Promise<TopicSelectionPromotionInputSnapshotHandoff> {
    this.calls += 1;
    return this.handoff;
  }
}

function makeSubject() {
  const handoff = makeHandoff();
  const controlPlane = new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository(), {
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const runtime = new TopicSelectionV1cN2BoundedDebateRuntimeService(controlPlane);
  const admission = new TopicSelectionV1cN2BoundedDebateAdmissionService(runtime);
  const promotionInputService = new StubPromotionInputService(handoff);
  const gateService = new TopicSelectionV1cPromotionGateService({
    repository: new InMemoryTopicSelectionV1cPromotionGateRepository(),
    promotionInputService,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const coordinator = new TopicSelectionV1cN2BoundedDebateCoordinatorService({
    runtime,
    admission,
    gateService,
    promotionInputService,
  });
  return { coordinator, handoff, promotionInputService, gateService, controlPlane, runtime, admission };
}

function baseInput(handoff: TopicSelectionPromotionInputSnapshotHandoff) {
  return {
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
    workspace_id: 'workspace_001',
    workflow_run_id: 'workflow_run_n2_coordinator_001',
    node_attempt_id: 'node_attempt_n2_coordinator_001',
    debate_role_outputs: allRoleOutputs(handoff),
  };
}

test('v1c N2 coordinator: 4 codex_assisted role outputs -> admitted -> persists promotion-decision-support via the verified-runtime-draft gate entry', async () => {
  const { coordinator, handoff, promotionInputService } = makeSubject();
  const result = await coordinator.createPromotionDecisionSupportFromBoundedDebate(baseInput(handoff));

  assert.ok(result.promotion_decision_support, 'support persisted');
  assert.equal(result.promotion_decision_support.promotion_input_snapshot_id, handoff.promotion_input_snapshot_id);
  // verified-runtime-draft branch persists as an llm_draft support (NOT the deterministic fallback).
  assert.equal(result.promotion_decision_support.support_generation_mode, 'llm_draft');
  assert.ok(result.promotion_decision_support.support_run_key, 'support_run_key minted');
  // the coordinator pre-fetched the handoff (proves it reached the runtime/admit path, not a bypass).
  assert.ok(promotionInputService.calls >= 1);
});

test('material findings must be covered by Debate before support can reach the deterministic gate', async () => {
  const { coordinator, handoff, gateService } = makeSubject();
  const finding = ref('artifact_ref', 'risk_finding_001', TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION);
  handoff.snapshot.source_bundle_snapshot.risk_finding_refs = [finding];
  const input = baseInput(handoff);
  await assert.rejects(coordinator.createPromotionDecisionSupportFromBoundedDebate(input),
    (error: unknown) => error instanceof AppError
      && error.details?.blocker_code === 'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED');
  const final = input.debate_role_outputs['n2_bounded_micro_debate.synthesizer_final'];
  final.n3_semantic_layer = {
    ...final.n3_semantic_layer as Record<string, unknown>,
    material_risk_acknowledgements: { status: 'addressed', risk_refs: [finding] },
  };
  const support = await coordinator.createPromotionDecisionSupportFromBoundedDebate(input);
  assert.deepEqual(support.promotion_decision_support.risk_finding_refs, [finding]);
  const gate = await gateService.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: support.promotion_decision_support.promotion_decision_support_id,
  });
  assert.deepEqual(gate.handoff.risk_finding_refs, [finding]);
  assert.equal(gate.promotion_gate_check.promote_allowed, false, 'Debate cannot override existing blockers');
});

test('completed Debate replays one support and four product role audits; changed attempt input conflicts', async () => {
  const { coordinator, handoff, controlPlane, gateService, promotionInputService, runtime, admission } = makeSubject();
  const input = baseInput(handoff);
  const [first, concurrent] = await Promise.all([
    coordinator.createPromotionDecisionSupportFromBoundedDebate(input),
    coordinator.createPromotionDecisionSupportFromBoundedDebate(input),
  ]);
  assert.deepEqual(concurrent, first);
  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const restored = new TopicSelectionV1cN2BoundedDebateCoordinatorService({ runtime, admission, gateService, promotionInputService });
  const replay = await restored.createPromotionDecisionSupportFromBoundedDebate(input);
  assert.deepEqual(replay, first);
  assert.deepEqual(await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), artifacts);
  const execution = first.promotion_dossier.dossier_payload.debate_execution as {
    role_artifacts: Array<{ execution_mode: string; run_mode: string }>;
  };
  assert.equal(execution.role_artifacts.length, 4);
  assert.ok(execution.role_artifacts.every((role) => role.execution_mode === 'codex_assisted' && role.run_mode === 'product'));
  await assert.rejects(coordinator.createPromotionDecisionSupportFromBoundedDebate({
    ...input, operator_label: 'changed-input',
  }), (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT');
});

test('v1c N2 coordinator: a role output with a wrong schema_version is REJECTED at admit (proves admit is reached — the canary bypassed it)', async () => {
  const { coordinator, handoff } = makeSubject();
  const outputs = allRoleOutputs(handoff);
  outputs['n2_bounded_micro_debate.promotion_supporter_draft'] = {
    ...outputs['n2_bounded_micro_debate.promotion_supporter_draft'],
    schema_version: 'topic-selection.v1c.n2.bounded-debate.role.WRONG@v1',
  } as TopicSelectionV1cN2BoundedDebateRoleOutput;

  await assert.rejects(
    () => coordinator.createPromotionDecisionSupportFromBoundedDebate({ ...baseInput(handoff), debate_role_outputs: outputs }),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).errorCode, 'GATE_CONSTRAINT_FAILED');
      assert.match(String((err as AppError).details?.blocker_code), /SCHEMA_VERSION/);
      return true;
    },
  );
});

test('v1c N2 coordinator: a forbidden authority field in a role output is REJECTED at admit', async () => {
  const { coordinator, handoff } = makeSubject();
  const outputs = allRoleOutputs(handoff);
  outputs['n2_bounded_micro_debate.synthesizer_final'] = {
    ...outputs['n2_bounded_micro_debate.synthesizer_final'],
    promotion_decision_id: 'promotion_decision_smuggled_001',
  } as TopicSelectionV1cN2BoundedDebateRoleOutput;

  await assert.rejects(
    () => coordinator.createPromotionDecisionSupportFromBoundedDebate({ ...baseInput(handoff), debate_role_outputs: outputs }),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).errorCode, 'GATE_CONSTRAINT_FAILED');
      return true;
    },
  );
});

test('v1c N2 coordinator: a missing role output is rejected with INVALID_PAYLOAD before any runtime call', async () => {
  const { coordinator, handoff, controlPlane } = makeSubject();
  const outputs = allRoleOutputs(handoff);
  delete (outputs as Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>>)['n2_bounded_micro_debate.reviewer_critic_review'];

  await assert.rejects(
    () => coordinator.createPromotionDecisionSupportFromBoundedDebate({ ...baseInput(handoff), debate_role_outputs: outputs as Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput> }),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).errorCode, 'INVALID_PAYLOAD');
      return true;
    },
  );
  assert.deepEqual(await controlPlane.listArtifactRefsByWorkflowRunId(baseInput(handoff).workflow_run_id), []);
});

test('FIND-028: 25 material findings retain five editable condition groups and early checks through N2/N3', async () => {
  const { coordinator, handoff, gateService } = makeSubject();
  handoff.accepted_risk_refs = [];
  handoff.memory_suggestion_refs = [];
  handoff.recheck_request_refs = [];
  handoff.blocker_refs = [];
  const findings = Array.from({ length: 25 }, (_, index) =>
    ref('artifact_ref', `risk_finding_${index + 1}`, TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION));
  handoff.snapshot.source_bundle_snapshot.risk_finding_refs = findings;
  const groups = Array.from({ length: 5 }, (_, index) => ({
    condition_id: `condition_${index + 1}`,
    condition_code: `verify_risk_group_${index + 1}`,
    refs: findings.slice(index * 5, index * 5 + 5),
    required_action: {
      action_code: `check_risk_group_${index + 1}`,
      severity: 'warning',
      loopback_target: 'none',
      refs: findings.slice(index * 5, index * 5 + 5),
      reason: `Validate the evidence boundary for risk group ${index + 1}.`,
    },
    early_check_obligations: [`Before outline lock, verify group ${index + 1} against the selected evidence.`],
    verification_note: 'Human must assign the owner and confirm this check.',
  }));
  const input = baseInput(handoff);
  const final = input.debate_role_outputs['n2_bounded_micro_debate.synthesizer_final'];
  final.condition_candidates = groups;
  final.n3_semantic_layer = {
    ...final.n3_semantic_layer as Record<string, unknown>,
    material_risk_acknowledgements: { status: 'addressed', risk_refs: findings },
  };
  const support = await coordinator.createPromotionDecisionSupportFromBoundedDebate(input);
  assert.deepEqual(support.promotion_dossier.dossier_payload.condition_candidates, groups);
  assert.deepEqual(support.promotion_decision_support.llm_draft_payload?.condition_candidates, groups);
  const gate = await gateService.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: support.promotion_decision_support.promotion_decision_support_id,
  });
  assert.equal(gate.handoff.disposition, 'ready_for_human_decision');
  assert.deepEqual(gate.handoff.dossier.dossier_payload.condition_candidates, groups);
  assert.deepEqual(await coordinator.createPromotionDecisionSupportFromBoundedDebate(input), support);
});

test('FIND-028: N2 rejects an incomplete condition mapping before support publication', async () => {
  const { coordinator, handoff } = makeSubject();
  const input = baseInput(handoff);
  input.debate_role_outputs['n2_bounded_micro_debate.synthesizer_final'].condition_candidates = [];
  await assert.rejects(coordinator.createPromotionDecisionSupportFromBoundedDebate(input),
    (error: unknown) => error instanceof AppError
      && error.details?.blocker_code === 'N2_BOUNDED_DEBATE_CONDITION_CANDIDATES_INVALID');
});

test('FIND-028: invalid, ambiguous and incomplete condition proposals never publish N2 support', async (t) => {
  const changes = [
    ['missing memory group', (groups: ReturnType<typeof promotionConditionCandidates>) => {
      groups[0]!.refs = groups[0]!.refs.filter((item) => item.ref_type !== 'memory_suggestion');
      groups[0]!.required_action.refs = groups[0]!.refs;
    }],
    ['missing recheck group', (groups: ReturnType<typeof promotionConditionCandidates>) => {
      groups[0]!.refs = groups[0]!.refs.filter((item) => item.ref_type !== 'recheck_request');
      groups[0]!.required_action.refs = groups[0]!.refs;
    }],
    ['mismatched action refs', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups[0]!.required_action.refs = [groups[0]!.refs[0]!]; }],
    ['duplicate groups', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups.push(structuredClone(groups[0]!)); }],
    ['overlapping groups', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups.push({ ...structuredClone(groups[0]!), condition_id: 'other', condition_code: 'other', required_action: { ...groups[0]!.required_action, action_code: 'other' } }); }],
    ['empty early checks', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups[0]!.early_check_obligations = []; }],
    ['blank action', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups[0]!.required_action.reason = '   '; }],
    ['stale risk version', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups[0]!.refs[0]!.version_id = 'stale'; }],
    ['invented ref', (groups: ReturnType<typeof promotionConditionCandidates>) => { groups[0]!.refs[0]!.ref_id = 'invented'; }],
    ['model assigns owner', (groups: ReturnType<typeof promotionConditionCandidates>) => { Object.assign(groups[0]!, { owner: { actor_type: 'human', actor_id: 'invented-owner' } }); }],
  ] as const;
  for (const [label, change] of changes) {
    await t.test(label, async () => {
      const { coordinator, handoff, gateService } = makeSubject();
      const input = baseInput(handoff);
      const groups = promotionConditionCandidates(structuredClone([...handoff.accepted_risk_refs, ...handoff.memory_suggestion_refs, ...handoff.recheck_request_refs]));
      change(groups);
      input.debate_role_outputs['n2_bounded_micro_debate.synthesizer_final'].condition_candidates = groups;
      await assert.rejects(coordinator.createPromotionDecisionSupportFromBoundedDebate(input),
        (error: unknown) => error instanceof AppError && error.statusCode === 422);
      await assert.rejects(gateService.getPromotionDecisionSupport('promotion_decision_support_001'),
        (error: unknown) => error instanceof AppError && error.statusCode === 404);
    });
  }
});


test('CLI promotion Debate reads prior bodies and recovers all four turns after a failed support commit', async t => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { TopicSelectionCodexCliRunnerService } = await import('./topic-selection-codex-cli-runner-service.js');
  const { TopicSelectionAgentOrchestratorService } = await import('./topic-selection-agent-orchestrator-service.js');
  const { createDefaultTopicSelectionModelProfileRegistry, TopicSelectionModelProfileRegistryService } = await import('./topic-selection-model-profile-registry-service.js');
  const home = mkdtempSync(join(tmpdir(), 'promotion-cli-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const handoff = makeHandoff();
  const outputs = allRoleOutputs(handoff);
  (outputs['n2_bounded_micro_debate.synthesizer_final'].n3_semantic_layer as Record<string, unknown>).material_risk_acknowledgements = { status: 'none', risk_refs: [] };
  const controlPlane = new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository());
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const profile = registry.profiles.find(row => row.profile_id === 'topic-selection.v1c.promotion-support.bounded-micro-debate.v1')!;
  profile.allowed_execution_modes.push('codex_cli'); profile.run_mode_eligibility.codex_cli = ['product'];
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  const slots = Object.keys(outputs) as TopicSelectionV1cN2BoundedDebateRoleSlotId[];
  let calls = 0;
  let corruptRef = false;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    assert.match(options.stdin, /Original evidence contradicts broad superiority/);
    if (!corruptRef && calls % 4 > 0) assert.match(options.stdin, /Support draft preserves bounded claim/);
    const output = structuredClone(outputs[corruptRef ? slots[0]! : slots[calls % 4]!]);
    calls += 1;
    if (corruptRef) {
      const points = output.support_points as Array<{ source_refs: TopicSelectionFunctionalRef[] }>;
      points[0]!.source_refs[0]!.legacy_ref = { ref_id: 'foreign-legacy-object' };
    }
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: `promotion-debate-${calls}` }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const repository = new InMemoryTopicSelectionV1cPromotionGateRepository();
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane, modelProfileRegistry, codexCliRunner: runner, codexCliModelId: 'gpt-6-astra' });
  const promotionInputService = new StubPromotionInputService(handoff);
  const gateService = new TopicSelectionV1cPromotionGateService({ repository, promotionInputService, modelProfileRegistry });
  const coordinator = () => {
    const runtime = new TopicSelectionV1cN2BoundedDebateRuntimeService(controlPlane, { modelProfileRegistry, agentOrchestrator,
      resolveResearchContext: async () => ({ original_evidence: 'Original evidence contradicts broad superiority.' }) });
    return new TopicSelectionV1cN2BoundedDebateCoordinatorService({ runtime, admission: new TopicSelectionV1cN2BoundedDebateAdmissionService(runtime), gateService, promotionInputService });
  };
  const input = { promotion_input_snapshot_id: handoff.promotion_input_snapshot_id, workflow_run_id: 'cli-debate', node_attempt_id: 'n2',
    execution_spec: { execution_mode: 'codex_cli' as const } };
  const create = repository.createSupportBundle.bind(repository);
  let interrupt = true;
  repository.createSupportBundle = async bundle => { if (interrupt) { interrupt = false; throw new Error('interrupted before support commit'); } return create(bundle); };
  await assert.rejects(coordinator().createPromotionDecisionSupportFromBoundedDebate(input), /interrupted before support commit/);
  assert.equal(calls, 4);
  const recovered = await coordinator().createPromotionDecisionSupportFromBoundedDebate(input);
  assert.equal(recovered.promotion_decision_support.support_generation_mode, 'llm_draft');
  assert.deepEqual(await coordinator().createPromotionDecisionSupportFromBoundedDebate(input), recovered);
  await assert.rejects(coordinator().createPromotionDecisionSupportFromBoundedDebate({ ...input, debate_role_outputs: outputs }), /external|supplied|CLI/i);
  await assert.rejects(coordinator().createPromotionDecisionSupportFromBoundedDebate({ ...input, policy_version_id: 'changed' }), /changed|different|drift/i);
  assert.equal(calls, 4);
  corruptRef = true;
  await assert.rejects(coordinator().createPromotionDecisionSupportFromBoundedDebate({ ...input, node_attempt_id: 'bad-first-role' }), /CLI reference/);
  assert.equal(calls, 5, 'Invalid first-role refs stop before paying for later roles.');
});
