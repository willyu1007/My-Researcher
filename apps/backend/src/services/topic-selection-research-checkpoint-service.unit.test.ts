import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { TopicSelectionNeedCandidateRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionCoverageRowIntentRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const NOW = '2026-08-25T10:00:00.000Z';

function createService() {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now: () => NOW },
  );
  const repository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const service = new TopicSelectionResearchCheckpointService(repository, controlPlane, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  return { repository, service };
}

async function materialize(
  service: TopicSelectionResearchCheckpointService,
  targetSnapshotHash = HASH_A,
) {
  return service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_ref: {
      ref_type: 'evidence_map',
      ref_id: targetSnapshotHash === HASH_A ? 'evidence_1' : 'evidence_2',
      title_card_id: 'title_1',
    },
    target_snapshot_hash: targetSnapshotHash,
    source_refs: [{ ref_type: 'literature_record', ref_id: 'paper_1' }],
    allowed_actions: ['loopback', 'advance'],
    packet_payload: {
      nearest_work: [{ title: 'Closest baseline' }],
      disconfirming_evidence: [{ claim: 'Alternative explanation' }],
    },
  });
}

function advancingDecision(snapshotHash = HASH_A) {
  return {
    decision_key: `decision_${snapshotHash[0]}`,
    decision: 'advance' as const,
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_snapshot_hash: snapshotHash,
    rationale: 'Reviewed the current nearest work, challenges, and source quality.',
    review_payload: {
      review_kind: 'evidence_landscape' as const,
      nearest_work_reviewed: true,
      disconfirming_evidence_reviewed: true,
      source_quality_reviewed: true,
      limitations: [],
    },
  };
}

async function materializeQuestion(
  service: TopicSelectionResearchCheckpointService,
  input: { snapshotHash: string; contractId: string; sliceVersion: string },
) {
  return service.materializeCheckpoint({
    title_card_id: 'title_question',
    checkpoint_kind: 'question_contract',
    target_ref: {
      ref_type: 'topic_question_contract',
      ref_id: input.contractId,
      title_card_id: 'title_question',
      version_id: input.contractId,
    },
    target_snapshot_hash: input.snapshotHash,
    source_refs: [
      {
        ref_type: 'research_slice',
        ref_id: 'research_slice_1',
        title_card_id: 'title_question',
        version_id: input.sliceVersion,
      },
      {
        ref_type: 'evidence_map',
        ref_id: 'evidence_map_question',
        title_card_id: 'title_question',
        version_id: 'v1',
      },
    ],
    allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
    packet_payload: { semantic_design_snapshot: input.snapshotHash },
  });
}

function questionDecision(snapshotHash: string, decisionKey: string) {
  return {
    decision_key: decisionKey,
    decision: 'advance' as const,
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_snapshot_hash: snapshotHash,
    rationale: 'Reviewed the current research design and its claim boundary.',
    review_payload: {
      review_kind: 'question_contract' as const,
      mechanism_identifiable: true,
      proxy_operationalized: true,
      confounds_reviewed: true,
      falsification_reviewed: true,
      claim_ceiling_reviewed: true,
      review_notes: ['Exact-snapshot question confirmation.'],
    },
  };
}

test('checkpoint lifecycle is recoverable, snapshot-bound, and fail-closed', async () => {
  const { service } = createService();
  const first = await materialize(service);
  const replay = await materialize(service);
  assert.equal(replay.research_checkpoint_id, first.research_checkpoint_id);

  const packet = await service.getPacket(first.research_checkpoint_id);
  assert.deepEqual(packet.packet_payload, {
    nearest_work: [{ title: 'Closest baseline' }],
    disconfirming_evidence: [{ claim: 'Alternative explanation' }],
  });
  await assert.rejects(
    service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape' }),
    /has not advanced/u,
  );

  const decision = await service.recordDecision(first.research_checkpoint_id, advancingDecision());
  const decisionReplay = await service.recordDecision(first.research_checkpoint_id, advancingDecision());
  assert.equal(decisionReplay.research_checkpoint_decision_id, decision.research_checkpoint_decision_id);
  await service.assertTransitionAllowed({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_snapshot_hash: HASH_A,
  });

  const objection = await service.recordObjection(first.research_checkpoint_id, {
    objection_key: 'objection_1',
    severity: 'blocking',
    summary: 'The evidence does not rule out the main alternative.',
    rationale: 'The negative evidence is too weak to distinguish mechanisms.',
    required_loopback: 'evidence_landscape',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_snapshot_hash: HASH_A,
  });
  await assert.rejects(
    service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape' }),
    /open blocking objections/u,
  );
  const second = await materialize(service, HASH_B);
  await assert.rejects(
    service.resolveObjection(objection.research_objection_id, {
      resolution_key: 'resolution_same_snapshot',
      resolution_type: 'resolved_with_evidence',
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      resolved_snapshot_hash: HASH_A,
      rationale: 'A wording-only change must not resolve the objection.',
      output_refs: [first.target_ref],
    }),
    /current checkpoint snapshot/u,
  );
  await service.resolveObjection(objection.research_objection_id, {
    resolution_key: 'resolution_1',
    resolution_type: 'resolved_with_evidence',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    resolved_snapshot_hash: HASH_B,
    rationale: 'A revised evidence landscape now contains the discriminating negative result.',
    output_refs: [
      second.target_ref,
      { ref_type: 'literature_record', ref_id: 'paper_1' },
    ],
  });
  await service.recordDecision(second.research_checkpoint_id, advancingDecision(HASH_B));
  await service.assertTransitionAllowed({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_snapshot_hash: HASH_B,
  });

  const history = await service.listCheckpoints('title_1');
  assert.equal(history.length, 2);
  assert.equal(history[0]?.status, 'superseded');
  assert.equal(history[0]?.superseded_by_checkpoint_id, second.research_checkpoint_id);
  assert.equal(history[1]?.status, 'decided');
  await assert.rejects(
    service.recordDecision(first.research_checkpoint_id, {
      ...advancingDecision(),
      decision_key: 'late_decision',
    }),
    /not current/u,
  );
  await assert.rejects(
    service.recordDecision(second.research_checkpoint_id, {
      ...advancingDecision(HASH_B),
      decision_key: decision.decision_key,
    }),
    /different checkpoint/u,
  );
});

test('advance requires all semantic evidence-review checks', async () => {
  const { service } = createService();
  const checkpoint = await materialize(service);
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...advancingDecision(),
      review_payload: {
        ...advancingDecision().review_payload,
        disconfirming_evidence_reviewed: false,
      },
    }),
    /every semantic review check/u,
  );
});

test('blocking academic-sufficiency objections survive question rewording until the requested slice loopback changes', async () => {
  const { service } = createService();
  const first = await materializeQuestion(service, {
    snapshotHash: HASH_A,
    contractId: 'question_contract_v1',
    sliceVersion: 'v1',
  });
  await service.recordDecision(first.research_checkpoint_id, questionDecision(HASH_A, 'question_decision_v1'));
  const objection = await service.recordObjection(first.research_checkpoint_id, {
    objection_key: 'academic_sufficiency_objection',
    severity: 'critical',
    summary: 'The research object is a parameter choice rather than an academic contribution.',
    rationale: 'Changing top-k wording does not introduce a distinct mechanism or research object.',
    required_loopback: 'research_slice',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_snapshot_hash: HASH_A,
  });

  const upstreamEvidence = await service.materializeCheckpoint({
    title_card_id: 'title_question',
    checkpoint_kind: 'evidence_landscape',
    target_ref: {
      ref_type: 'evidence_map',
      ref_id: 'evidence_map_revised_for_question',
      title_card_id: 'title_question',
      version_id: 'v2',
    },
    target_snapshot_hash: HASH_B,
    source_refs: [{ ref_type: 'literature_record', ref_id: 'paper_revised' }],
    allowed_actions: ['advance', 'loopback'],
    packet_payload: { revised_for_question_objection: true },
  });
  await service.recordDecision(upstreamEvidence.research_checkpoint_id, {
    ...advancingDecision(HASH_B),
    decision_key: 'upstream_evidence_revision',
  });
  await service.assertTransitionAllowed({
    title_card_id: 'title_question',
    checkpoint_kind: 'evidence_landscape',
    target_ref: upstreamEvidence.target_ref,
  });

  const reworded = await materializeQuestion(service, {
    snapshotHash: HASH_B,
    contractId: 'question_contract_reworded',
    sliceVersion: 'v1',
  });
  await assert.rejects(
    service.resolveObjection(objection.research_objection_id, {
      resolution_key: 'rewording_resolution',
      resolution_type: 'resolved_with_revision',
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      resolved_snapshot_hash: HASH_B,
      rationale: 'The question wording changed.',
      output_refs: [reworded.target_ref],
    }),
    /revised research_slice authority/u,
  );
  await assert.rejects(
    service.recordDecision(reworded.research_checkpoint_id, questionDecision(HASH_B, 'question_decision_reworded')),
    /unresolved blocking human objection/u,
  );

  const revised = await materializeQuestion(service, {
    snapshotHash: HASH_C,
    contractId: 'question_contract_revised_object',
    sliceVersion: 'v2',
  });
  const revisedSliceRef = revised.source_refs.find((ref) => ref.ref_type === 'research_slice');
  const revisedEvidenceRef = revised.source_refs.find((ref) => ref.ref_type === 'evidence_map');
  assert.ok(revisedSliceRef);
  assert.ok(revisedEvidenceRef);
  await service.resolveObjection(objection.research_objection_id, {
    resolution_key: 'substantive_resolution',
    resolution_type: 'resolved_with_revision',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    resolved_snapshot_hash: HASH_C,
    rationale: 'The selected research slice now changes the research object and mechanism.',
    output_refs: [revised.target_ref, revisedSliceRef, revisedEvidenceRef],
  });
  await service.recordDecision(revised.research_checkpoint_id, questionDecision(HASH_C, 'question_decision_v2'));
  await service.assertTransitionAllowed({
    title_card_id: 'title_question',
    checkpoint_kind: 'question_contract',
    target_ref: revised.target_ref,
  });
});

function evidenceMap(): TopicSelectionEvidenceMapRecord {
  return {
    evidence_map_id: 'evidence_map_1',
    workspace_id: null,
    title_card_id: 'title_1',
    evidence_map_version: 'v1',
    status: 'ready',
    review_status: 'machine_checked',
    freshness_status: 'current',
    search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
    search_plan_ref: { ref_type: 'search_plan', ref_id: 'search_plan_1', title_card_id: 'title_1' },
    literature_snapshot_ref: { ref_type: 'literature_snapshot', ref_id: 'snapshot_1', title_card_id: 'title_1' },
    unit_count: 3,
    support_unit_count: 1,
    challenge_unit_count: 1,
    baseline_unit_count: 1,
    context_unit_count: 0,
    digest_payload: {},
    stale_reason_codes: [],
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  };
}

function coverageRow(id: string, role: 'support' | 'challenge' | 'baseline'): TopicSelectionCoverageRowIntentRecord {
  return {
    coverage_row_intent_id: id,
    search_plan_id: 'search_plan_1',
    workspace_id: null,
    title_card_id: 'title_1',
    coverage_key: id,
    intent_type: role,
    query: `${role} query`,
    rationale: `${role} coverage`,
    required: true,
    priority: 1,
    target_source_types: ['paper'],
    expected_evidence_role: role,
    refs: [],
    created_at: NOW,
  };
}

function evidenceUnit(
  id: string,
  role: 'support' | 'challenge' | 'baseline',
  abstractOnly = false,
): TopicSelectionEvidenceUnitRecord {
  return {
    evidence_unit_id: id,
    workspace_id: null,
    title_card_id: 'title_1',
    evidence_map_id: 'evidence_map_1',
    evidence_map_version: 'v1',
    search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
    search_plan_ref: { ref_type: 'search_plan', ref_id: 'search_plan_1', title_card_id: 'title_1' },
    literature_snapshot_ref: { ref_type: 'literature_snapshot', ref_id: 'snapshot_1', title_card_id: 'title_1' },
    coverage_row_intent_ref: { ref_type: 'coverage_row_intent', ref_id: `coverage_${role}`, title_card_id: 'title_1' },
    literature_ref: { ref_type: 'literature_record', ref_id: `paper_${id}` },
    source_refs: [{ ref_type: 'literature_fulltext', ref_id: `source_${id}` }],
    locator: {
      locator_type: abstractOnly ? 'abstract' : 'section',
      locator_ref: { ref_type: abstractOnly ? 'literature_abstract' : 'literature_section', ref_id: `locator_${id}` },
      literature_ref: { ref_type: 'literature_record', ref_id: `paper_${id}` },
      source_ref: { ref_type: 'literature_source', ref_id: `source_${id}` },
      document_ref: abstractOnly ? null : { ref_type: 'literature_document', ref_id: `document_${id}` },
      section_ref: abstractOnly ? null : { ref_type: 'literature_section', ref_id: `section_${id}` },
    },
    evidence_role: role,
    source_attribution_kind: role === 'challenge' ? 'counter_evidence' : 'source_claim',
    source_statement: `${role} claim`,
    normalized_statement: null,
    interpretation_payload: {},
    extraction_confidence: 0.9,
    abstract_only: abstractOnly,
    review_status: 'machine_checked',
    freshness_status: 'current',
    issue_codes: abstractOnly ? ['ABSTRACT_ONLY_SUPPORT'] : [],
    created_by: 'system',
    created_at: NOW,
  };
}

function candidate(
  id: string,
  mechanismType: TopicSelectionNeedCandidateRecord['mechanism_type'],
  mechanismPayload: Record<string, unknown>,
): TopicSelectionNeedCandidateRecord {
  const evidenceMapRef = { ref_type: 'evidence_map', ref_id: 'evidence_map_1', title_card_id: 'title_1', version_id: 'v1' };
  return {
    need_candidate_id: id,
    workspace_id: null,
    title_card_id: 'title_1',
    evidence_map_id: 'evidence_map_1',
    candidate_version: 'v1',
    lifecycle_status: 'hypothesis',
    decision_status: 'hypothesis',
    review_status: 'machine_checked',
    freshness_status: 'current',
    candidate_need: `Candidate wording ${id}`,
    unmet_need_statement: `Unmet need ${id}`,
    mechanism_type: mechanismType,
    mechanism_summary: null,
    mechanism_payload: mechanismPayload,
    scope_notes: 'Bounded scope',
    non_goal_notes: null,
    prior_art_status: 'no_strong_solution_found',
    evidence_map_ref: evidenceMapRef,
    search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
    search_plan_ref: { ref_type: 'search_plan', ref_id: 'search_plan_1', title_card_id: 'title_1' },
    literature_snapshot_ref: { ref_type: 'literature_snapshot', ref_id: 'snapshot_1', title_card_id: 'title_1' },
    evidence_role_bundle: {
      support_unit_refs: [],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
    },
    conflict_refs: [],
    strength_assessment_refs: [],
    open_recheck_request_refs: [],
    unresolved_challenge_refs: [],
    accepted_risk_refs: [],
    gap_codes: [],
    speculative: false,
    confidence: 0.8,
    artifact_refs: [],
    result_adjudication_id: null,
    result_validated_need_id: null,
    merged_into_need_candidate_ref: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

test('evidence policy blocks abstract-only core, missing neighbor, and missing disconfirming material', async () => {
  const rows = [coverageRow('coverage_support', 'support'), coverageRow('coverage_challenge', 'challenge'), coverageRow('coverage_baseline', 'baseline')];

  const abstractContext = createService();
  const abstractCheckpoint = await abstractContext.service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [
      evidenceUnit('support', 'support', true),
      evidenceUnit('challenge', 'challenge'),
      evidenceUnit('baseline', 'baseline'),
    ],
    conflict_sets: [],
    coverage_row_intents: rows,
  });
  assert.equal(abstractCheckpoint.allowed_actions.includes('advance'), false);
  assert.equal(abstractCheckpoint.required_action_refs.length > 0, true);

  const missingContext = createService();
  const missingCheckpoint = await missingContext.service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [evidenceUnit('support', 'support')],
    conflict_sets: [],
    coverage_row_intents: rows,
  });
  const packet = await missingContext.service.getPacket(missingCheckpoint.research_checkpoint_id);
  const issueCodes = (packet.packet_payload.policy_issues as Array<{ code: string }>).map((issue) => issue.code);
  assert.deepEqual(issueCodes, ['DIRECT_NEIGHBOR_COVERAGE_REQUIRED', 'DISCONFIRMING_EVIDENCE_REQUIRED']);
});

test('qualified evidence and a genuinely distinct candidate arena advance through bound human review', async () => {
  const { service } = createService();
  const evidenceCheckpoint = await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [
      evidenceUnit('support', 'support'),
      evidenceUnit('challenge', 'challenge'),
      evidenceUnit('baseline', 'baseline'),
    ],
    conflict_sets: [],
    coverage_row_intents: [coverageRow('coverage_support', 'support'), coverageRow('coverage_challenge', 'challenge'), coverageRow('coverage_baseline', 'baseline')],
  });
  assert.equal(evidenceCheckpoint.allowed_actions.includes('advance'), true);

  const first = candidate('candidate_1', 'evaluation_gap', { outcome: 'calibration error' });
  const loneCheckpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first],
  });
  assert.equal(loneCheckpoint.allowed_actions.includes('advance'), false);

  const wordingDuplicate = candidate('candidate_2', 'evaluation_gap', { outcome: 'calibration error' });
  const duplicateCheckpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first, wordingDuplicate],
  });
  assert.equal(duplicateCheckpoint.allowed_actions.includes('advance'), false);

  const alternative = candidate('candidate_3', 'system_gap', { intervention: 'adaptive evidence routing' });
  const qualifiedCheckpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first, alternative],
    rejected_framings: [{
      framing_id: 'framing_1',
      reason_code: 'PSEUDO_GAP',
      summary: 'Only changes top-k.',
      refs: [],
    }],
  });
  assert.equal(qualifiedCheckpoint.allowed_actions.includes('advance'), true);
  await assert.rejects(
    service.assertGapSelectionConfirmation({
      title_card_id: 'title_1',
      selected_candidate: first,
      review: {
        research_checkpoint_id: qualifiedCheckpoint.research_checkpoint_id,
        confirmed_candidate_pool_hash: HASH_B,
        selected_candidate_ref: { ref_type: 'need_candidate', ref_id: first.need_candidate_id, title_card_id: 'title_1', version_id: 'v1' },
        direct_prior_art_pressure_reviewed: true,
        disconfirming_evidence_reviewed: true,
        candidate_reviews: [],
      },
    }),
    /snapshot is stale/u,
  );
  const review = {
    research_checkpoint_id: qualifiedCheckpoint.research_checkpoint_id,
    confirmed_candidate_pool_hash: qualifiedCheckpoint.target_snapshot_hash,
    selected_candidate_ref: { ref_type: 'need_candidate', ref_id: first.need_candidate_id, title_card_id: 'title_1', version_id: 'v1' },
    direct_prior_art_pressure_reviewed: true,
    disconfirming_evidence_reviewed: true,
    candidate_reviews: [
      {
        need_candidate_ref: { ref_type: 'need_candidate', ref_id: first.need_candidate_id, title_card_id: 'title_1', version_id: 'v1' },
        disposition: 'selected' as const,
        distinct_from_selected_axes: [],
        rationale: 'Best bounded research object.',
      },
      {
        need_candidate_ref: { ref_type: 'need_candidate', ref_id: alternative.need_candidate_id, title_card_id: 'title_1', version_id: 'v1' },
        disposition: 'viable_alternative' as const,
        distinct_from_selected_axes: ['intervention' as const],
        rationale: 'Changes the intervention rather than wording.',
      },
    ],
  };
  await assert.rejects(
    service.assertGapSelectionConfirmation({
      title_card_id: 'title_1',
      selected_candidate: first,
      review: {
        ...review,
        candidate_reviews: review.candidate_reviews.map((candidateReview) =>
          candidateReview.need_candidate_ref.ref_id === alternative.need_candidate_id
            ? {
              ...candidateReview,
              need_candidate_ref: { ...candidateReview.need_candidate_ref, version_id: 'stale-version' },
            }
            : candidateReview),
      },
    }),
    /uses a stale version/u,
  );
  await service.assertGapSelectionConfirmation({ title_card_id: 'title_1', selected_candidate: first, review });
  await assert.rejects(
    service.adaptExistingStageDecision(qualifiedCheckpoint.research_checkpoint_id, {
      decision_authority_ref: { ref_type: 'artifact_ref', ref_id: 'not_human_authority', title_card_id: 'title_1' },
      confirmed_snapshot_hash: qualifiedCheckpoint.target_snapshot_hash,
    }),
    /requires human_confirmed_decision authority/u,
  );
  await service.adaptExistingStageDecision(qualifiedCheckpoint.research_checkpoint_id, {
    decision_authority_ref: { ref_type: 'human_confirmed_decision', ref_id: 'human_decision_gap', title_card_id: 'title_1' },
    confirmed_snapshot_hash: qualifiedCheckpoint.target_snapshot_hash,
  });
  await service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'gap_selection' });
});
