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
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
  TopicSelectionV1cN2BoundedDebateAdmissionService,
  type TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate,
  type TopicSelectionV1cN2BoundedDebateRoleArtifact,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import {
  TopicSelectionV1cN2BoundedDebateRuntimeService,
} from './topic-selection-v1c-n2-bounded-debate-runtime-service.js';

const NOW = '2026-06-02T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
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
      package_payload: {
        claim_ceiling_summary: 'Correlation and mechanism claims only.',
      },
    } as never,
    package_draft_input_snapshot: {
      question_contract: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
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

function makeSubject() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (() => {
      const counts = new Map<string, number>();
      return (prefix: string) => {
        const next = (counts.get(prefix) ?? 0) + 1;
        counts.set(prefix, next);
        return `${prefix}_${String(next).padStart(3, '0')}`;
      };
    })(),
    now: () => NOW,
  });
  const runtime = new TopicSelectionV1cN2BoundedDebateRuntimeService(controlPlane);
  const admission = new TopicSelectionV1cN2BoundedDebateAdmissionService(runtime);
  return { runtime, admission };
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
      claim_ceiling_alignment: {
        status: 'addressed',
        summary: 'Correlation and mechanism claims only.',
        source_refs: [handoff.topic_package_ref],
      },
      contribution_summary: {
        status: 'addressed',
        summary: 'A focused contribution summary.',
        source_refs: [handoff.topic_package_ref],
      },
      evaluation_plan_summary: {
        status: 'addressed',
        summary: 'A bounded evaluation plan.',
        source_refs: [handoff.topic_package_ref],
      },
      evidence_support_map: {
        status: 'addressed',
        evidence_refs: [evidenceRef],
      },
      accepted_risk_acknowledgements: {
        status: 'addressed',
        risk_refs: [riskRef],
      },
      recheck_obligation_summary: {
        status: 'addressed',
        recheck_refs: [recheckRef],
      },
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

async function generateCandidates(input: {
  runtime: TopicSelectionV1cN2BoundedDebateRuntimeService;
  handoff: TopicSelectionPromotionInputSnapshotHandoff;
  outputOverrides?: Partial<Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput>>;
}): Promise<TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[]> {
  const priorArtifacts: TopicSelectionV1cN2BoundedDebateRoleArtifact[] = [];
  const candidates: TopicSelectionV1cN2BoundedDebateRoleAdmissionCandidate[] = [];
  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    const output = input.outputOverrides?.[slot] ?? roleOutput(slot, input.handoff);
    const generated = await input.runtime.generateRoleArtifact({
      handoff: input.handoff,
      slot_id: slot,
      prior_role_artifacts: priorArtifacts,
      workflow_run_id: 'workflow_run_n2_bounded_debate_001',
      node_attempt_id: 'node_attempt_n2_bounded_debate_001',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output,
        operator_label: 'unit-test',
      },
      created_by: 'system',
    });
    assert.equal(generated.status, 'succeeded');
    if (generated.status !== 'succeeded') {
      throw new Error('Expected N2 runtime role generation to succeed.');
    }
    candidates.push({
      artifact: generated.role_artifact,
      structured_output: generated.structured_output,
    });
    priorArtifacts.push(generated.role_artifact);
  }
  return candidates;
}

async function generatePriorArtifactsThroughRepair(input: {
  runtime: TopicSelectionV1cN2BoundedDebateRuntimeService;
  handoff: TopicSelectionPromotionInputSnapshotHandoff;
}): Promise<TopicSelectionV1cN2BoundedDebateRoleArtifact[]> {
  const priorArtifacts: TopicSelectionV1cN2BoundedDebateRoleArtifact[] = [];
  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER.slice(0, 3)) {
    const generated = await input.runtime.generateRoleArtifact({
      handoff: input.handoff,
      slot_id: slot,
      prior_role_artifacts: priorArtifacts,
      workflow_run_id: 'workflow_run_n2_bounded_debate_compression_001',
      node_attempt_id: 'node_attempt_n2_bounded_debate_compression_001',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: roleOutput(slot, input.handoff),
        operator_label: 'unit-test',
      },
      created_by: 'system',
    });
    assert.equal(generated.status, 'succeeded');
    if (generated.status !== 'succeeded') {
      throw new Error('Expected N2 prior role generation to succeed.');
    }
    priorArtifacts.push(generated.role_artifact);
  }
  return priorArtifacts;
}

test('v1c N2 bounded debate runtime emits runtime-verified role artifacts admitted only through final synthesis', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const candidates = await generateCandidates({ runtime, handoff });
  const [supporter, critic, repair, final] = candidates;

  assert.equal(supporter!.artifact.context_policy_profile_id, 'topic-selection.v1c.n2.bounded-debate.supporter-draft.context-runtime@v1');
  assert.equal(critic!.artifact.prior_role_artifact_hashes['n2_bounded_micro_debate.promotion_supporter_draft'], supporter!.artifact.role_artifact_hash);
  assert.equal(repair!.artifact.prior_role_artifact_hashes['n2_bounded_micro_debate.reviewer_critic_review'], critic!.artifact.role_artifact_hash);
  assert.equal(final!.artifact.prior_role_artifact_hashes['n2_bounded_micro_debate.promotion_supporter_repair'], repair!.artifact.role_artifact_hash);
  assert.match(final!.artifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.ok(final!.artifact.runtime_audit_ref);
  assert.ok(final!.artifact.runtime_audit_hash);

  const admitted = admission.admit({ handoff, role_results: candidates });
  assert.equal(admitted.admitted, true);
  if (!admitted.admitted) {
    throw new Error('Expected admission to pass.');
  }
  assert.equal(admitted.final_artifact.slot_id, 'n2_bounded_micro_debate.synthesizer_final');
  assert.equal(admitted.admission_identity.final_prompt_packet_hash, final!.artifact.prompt_packet_hash);
  assert.equal(admitted.admission_identity.final_runtime_audit_hash, final!.artifact.runtime_audit_hash);
  assert.match(admitted.admission_identity_hash, /^[a-f0-9]{64}$/);
  assert.equal(admitted.promotion_support_draft.summary, 'Final support is ready for N3 deterministic gate review.');
  assert.equal(admitted.promotion_support_draft.reviewer_questions?.length, 1);
  assert.equal(admitted.promotion_support_draft.risk_notes?.length, 1);
  assert.equal(admitted.promotion_support_draft.recheck_notes?.length, 1);
});

test('v1c N2 bounded debate admission blocks non-canonical role order', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const candidates = await generateCandidates({ runtime, handoff });
  const reordered = [candidates[1]!, candidates[0]!, ...candidates.slice(2)];

  const admitted = admission.admit({ handoff, role_results: reordered });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected admission to block reordered roles.');
  }
  assert.equal(admitted.blocker.code, 'N2_BOUNDED_DEBATE_ROLE_ORDER_INVALID');
});

test('v1c N2 bounded debate admission blocks prior-role hash drift', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const candidates = await generateCandidates({ runtime, handoff });
  candidates[3] = {
    ...candidates[3]!,
    artifact: {
      ...candidates[3]!.artifact,
      prior_role_artifact_hashes: {
        ...candidates[3]!.artifact.prior_role_artifact_hashes,
        'n2_bounded_micro_debate.reviewer_critic_review': '0'.repeat(64),
      },
    },
  };

  const admitted = admission.admit({ handoff, role_results: candidates });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected admission to block prior-role drift.');
  }
  assert.equal(admitted.blocker.code, 'N2_BOUNDED_DEBATE_PRIOR_ROLE_HASH_DRIFT');
});

test('v1c N2 bounded debate admission blocks forbidden authority fields and out-of-bounds refs', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const forbiddenFinal = {
    ...roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff),
    promote_allowed: true,
  };
  const forbiddenCandidates = await generateCandidates({
    runtime,
    handoff,
    outputOverrides: {
      'n2_bounded_micro_debate.synthesizer_final': forbiddenFinal,
    },
  });
  const forbidden = admission.admit({ handoff, role_results: forbiddenCandidates });
  assert.equal(forbidden.admitted, false);
  if (forbidden.admitted) {
    throw new Error('Expected forbidden authority field to block.');
  }
  assert.equal(forbidden.blocker.code, 'N2_BOUNDED_DEBATE_FORBIDDEN_AUTHORITY_FIELD');

  const outOfBoundsFinal = {
    ...roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff),
    extra_refs: [ref('evidence_unit', 'evidence_unit_not_allowed')],
  };
  const outOfBoundsCandidates = await generateCandidates({
    runtime,
    handoff,
    outputOverrides: {
      'n2_bounded_micro_debate.synthesizer_final': outOfBoundsFinal,
    },
  });
  const outOfBounds = admission.admit({ handoff, role_results: outOfBoundsCandidates });
  assert.equal(outOfBounds.admitted, false);
  if (outOfBounds.admitted) {
    throw new Error('Expected out-of-bounds ref to block.');
  }
  assert.equal(outOfBounds.blocker.code, 'N2_BOUNDED_DEBATE_REF_OUT_OF_BOUNDS');
});

test('v1c N2 bounded debate admission blocks incomplete final semantic layer', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const incompleteFinal = roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff);
  delete (incompleteFinal.n3_semantic_layer as Record<string, unknown>).critic_finding_resolution_map;
  const candidates = await generateCandidates({
    runtime,
    handoff,
    outputOverrides: {
      'n2_bounded_micro_debate.synthesizer_final': incompleteFinal,
    },
  });

  const admitted = admission.admit({ handoff, role_results: candidates });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected incomplete semantic layer to block.');
  }
  assert.equal(admitted.blocker.code, 'N2_BOUNDED_DEBATE_FINAL_SEMANTIC_LAYER_INCOMPLETE');
});

test('v1c N2 bounded debate admission blocks dropped risk and recheck refs', async () => {
  const { runtime, admission } = makeSubject();
  const handoff = makeHandoff();
  const droppedRefsFinal = roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff);
  const layer = droppedRefsFinal.n3_semantic_layer as Record<string, Record<string, unknown>>;
  layer.accepted_risk_acknowledgements = { status: 'none_required', risk_refs: [] };
  layer.recheck_obligation_summary = { status: 'none_required', recheck_refs: [] };
  const candidates = await generateCandidates({
    runtime,
    handoff,
    outputOverrides: {
      'n2_bounded_micro_debate.synthesizer_final': droppedRefsFinal,
    },
  });

  const admitted = admission.admit({ handoff, role_results: candidates });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected dropped risk/recheck refs to block.');
  }
  assert.equal(admitted.blocker.code, 'N2_BOUNDED_DEBATE_REQUIRED_REF_DROPPED');
});

test('v1c N2 bounded debate runtime compression quality gate blocks dropped final facts before output', async () => {
  const { runtime } = makeSubject();
  const handoff = makeHandoff();
  const priorArtifacts = await generatePriorArtifactsThroughRepair({ runtime, handoff });
  const generated = await runtime.generateRoleArtifact({
    handoff,
    slot_id: 'n2_bounded_micro_debate.synthesizer_final',
    prior_role_artifacts: priorArtifacts,
    workflow_run_id: 'workflow_run_n2_bounded_debate_compression_001',
    node_attempt_id: 'node_attempt_n2_bounded_debate_compression_001',
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete v1c N2 final compressed context for quality-gate regression.',
        raw_provider_logs: ['provider request body must never persist in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['promotion_input_snapshot'],
      },
      compressed_preserved_facts: {
        promotion_input_snapshot: [handoff.snapshot_hashes.promotion_input_snapshot_hash],
      },
    },
    codex_response: {
      output: roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_CLAIM_CEILING_DROPPED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_ALLOWED_REF_MANIFEST_DROPPED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_CRITIC_RESOLUTION_MAP_DROPPED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_OBLIGATION_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});
