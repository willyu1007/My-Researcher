import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
  TopicSelectionPromotionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
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

function roleOutput(
  slot: TopicSelectionV1cN2BoundedDebateRoleSlotId,
  handoff: TopicSelectionPromotionInputSnapshotHandoff,
): TopicSelectionV1cN2BoundedDebateRoleOutput {
  const evidenceRef = handoff.evidence_refs[0]!.evidence_ref;
  const riskRef = handoff.accepted_risk_refs[0]!;
  const recheckRef = handoff.recheck_request_refs[0]!;
  if (slot === 'n2_bounded_micro_debate.promotion_supporter_draft') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      support_summary: 'Support draft preserves bounded claim and source refs.',
      support_points: [{
        point_id: 'support_point_001',
        point: 'The topic package has selected evidence and bounded evaluation plan.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      risk_acknowledgements: [{ risk_ref: riskRef, handling: 'Carry forward.' }],
      recheck_obligations: [{ recheck_ref: recheckRef, handling: 'Carry forward.' }],
    };
  }
  if (slot === 'n2_bounded_micro_debate.reviewer_critic_review') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      critic_findings: [{
        finding_id: 'critic_finding_001',
        severity: 'warning',
        issue: 'Final support must preserve claim ceiling, accepted risk, and recheck refs.',
        required_resolution: 'Address in final semantic layer.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      required_repairs: ['Preserve accepted risk and recheck refs.'],
    };
  }
  if (slot === 'n2_bounded_micro_debate.promotion_supporter_repair') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      repaired_summary: 'Repair addresses critic finding.',
      accepted_findings: ['critic_finding_001'],
      rebutted_findings: [],
      repair_actions: [{
        finding_id: 'critic_finding_001',
        resolution_status: 'accepted_and_repaired',
        repair_note: 'Added final semantic layer coverage.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
    };
  }
  return {
    schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
    role_slot: slot,
    final_support_summary: 'Final support is ready for N3 deterministic gate review.',
    dossier_markdown: 'Dossier preserves claim ceiling, selected evidence, accepted risk, and recheck obligations.',
    reviewer_questions: ['Are selected evidence refs still current before outline lock?'],
    risk_notes: [{ risk_ref: riskRef, note: 'Accepted risk preserved.' }],
    recheck_notes: [{ recheck_ref: recheckRef, note: 'Recheck preserved without automatic loopback.' }],
    n3_semantic_layer: {
      claim_ceiling_alignment: { status: 'addressed', summary: 'Correlation and mechanism claims only.', source_refs: [handoff.topic_package_ref] },
      contribution_summary: { status: 'addressed', summary: 'A focused contribution summary.', source_refs: [handoff.topic_package_ref] },
      evaluation_plan_summary: { status: 'addressed', summary: 'A bounded evaluation plan.', source_refs: [handoff.topic_package_ref] },
      evidence_support_map: { status: 'addressed', evidence_refs: [evidenceRef] },
      accepted_risk_acknowledgements: { status: 'addressed', risk_refs: [riskRef] },
      recheck_obligation_summary: { status: 'addressed', recheck_refs: [recheckRef] },
      critic_finding_resolution_map: [{
        finding_id: 'critic_finding_001',
        resolution_status: 'accepted_and_repaired',
        resolution_note: 'Handled in final semantic layer.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      readiness_coverage_items: [
        { slot: 'claim_ceiling', status: 'addressed', source_refs: [handoff.topic_package_ref] },
        { slot: 'selected_evidence', status: 'addressed', source_refs: [evidenceRef] },
      ],
    },
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
  return { coordinator, handoff, promotionInputService };
}

function allRoleOutputs(handoff: TopicSelectionPromotionInputSnapshotHandoff): Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput> {
  return {
    'n2_bounded_micro_debate.promotion_supporter_draft': roleOutput('n2_bounded_micro_debate.promotion_supporter_draft', handoff),
    'n2_bounded_micro_debate.reviewer_critic_review': roleOutput('n2_bounded_micro_debate.reviewer_critic_review', handoff),
    'n2_bounded_micro_debate.promotion_supporter_repair': roleOutput('n2_bounded_micro_debate.promotion_supporter_repair', handoff),
    'n2_bounded_micro_debate.synthesizer_final': roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff),
  };
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
  const { coordinator, handoff } = makeSubject();
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
});
