import assert from 'node:assert/strict';
import test from 'node:test';
import { TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { TopicSelectionNeedCandidateRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionCoverageAssessmentRecord,
  TopicSelectionCoverageRowIntentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionTopicValueEvidenceRefRecord,
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionValueReasoningMemoRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type { TopicSelectionTopicQuestionContractRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const HASH_D = 'd'.repeat(64);
const NOW = '2026-08-25T10:00:00.000Z';

type StageProjectionSources = NonNullable<
  ConstructorParameters<typeof TopicSelectionResearchCheckpointService>[2]
>['stageProjectionSources'];

function createService(
  stageProjectionSources?: StageProjectionSources,
  arenaRepository?: Pick<TopicSelectionResearchArenaRepository, 'findCurrentSession'>,
) {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now: () => NOW },
  );
  const repository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const options = {
    idFactory: (prefix: string) => `${prefix}_${++sequence}`,
    now: () => NOW,
    stageProjectionSources,
    arenaRepository,
  };
  const service = new TopicSelectionResearchCheckpointService(repository, controlPlane, options);
  return { controlPlane, repository, service };
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

async function materializeSelectedArenaGap(service: TopicSelectionResearchCheckpointService) {
  const firstRef = {
    ref_type: 'need_candidate',
    ref_id: 'candidate_selected',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const alternativeRef = {
    ref_type: 'need_candidate',
    ref_id: 'candidate_parked',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const rolePositions = (disposition: 'selected' | 'parked') => [
    { participant_role: 'opportunity_scout' as const, recommended_disposition: disposition },
    { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: disposition },
  ];
  const advisory = {
    schema_version: 'TopicSelectionResearchGapArenaAdvisory@v1' as const,
    arena_session_ref: { ref_type: 'research_arena_session', ref_id: 'arena_1', title_card_id: 'title_1' },
    arena_input_snapshot_ref: { ref_type: 'input_snapshot', ref_id: 'arena_input_1', title_card_id: 'title_1' },
    arena_synthesis_ref: { ref_type: 'artifact_ref', ref_id: 'arena_synthesis_1', title_card_id: 'title_1' },
    arena_synthesis_hash: HASH_B,
    outcome: 'selected' as const,
    summary: 'Select the stronger candidate while keeping one viable alternative parked.',
    candidate_dispositions: [
      {
        candidate_ref: firstRef,
        disposition: 'selected' as const,
        rationale: 'Best current evidence-grounded path.',
        drop_reason_code: null,
        reopening_conditions: [],
        selected_against_candidate_ref: null,
        role_positions: rolePositions('selected'),
      },
      {
        candidate_ref: alternativeRef,
        disposition: 'parked' as const,
        rationale: 'Keep available if the selected mechanism fails.',
        drop_reason_code: null,
        reopening_conditions: ['Selected mechanism becomes infeasible.'],
        selected_against_candidate_ref: firstRef,
        role_positions: rolePositions('parked'),
      },
    ],
    risk_finding_refs: [],
    preserved_finding_ids: [],
    unresolved_dissent: [],
    required_next_delta: null,
    support_only: true as const,
  };
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_1', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_C,
    source_refs: [firstRef, alternativeRef],
    allowed_actions: ['advance', 'hold', 'loopback', 'reject'],
    packet_payload: {
      candidate_entries: [
        { need_candidate_ref: firstRef, semantic_group_key: 'group_selected', machine_viable: true },
        { need_candidate_ref: alternativeRef, semantic_group_key: 'group_parked', machine_viable: true },
      ],
      arena_advisory: advisory,
      arena_advisory_issue_codes: [],
    },
  });
  const humanReview = {
    research_checkpoint_id: checkpoint.research_checkpoint_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    selected_candidate_ref: firstRef,
    direct_prior_art_pressure_reviewed: true,
    disconfirming_evidence_reviewed: true,
    candidate_reviews: [
      {
        need_candidate_ref: firstRef,
        disposition: 'selected' as const,
        distinct_from_selected_axes: [],
        rationale: 'Best current path.',
      },
      {
        need_candidate_ref: alternativeRef,
        disposition: 'viable_alternative' as const,
        distinct_from_selected_axes: ['mechanism' as const],
        rationale: 'Substantively distinct fallback.',
      },
    ],
  };
  return { advisory, alternativeRef, checkpoint, firstRef, humanReview };
}

function humanConfirmNeedIntent(
  humanReview: Awaited<ReturnType<typeof materializeSelectedArenaGap>>['humanReview'],
  actorId = 'researcher_1',
) {
  return {
    schema_version: 'TopicSelectionHumanConfirmNeedIntent@v1' as const,
    adjudication_result_ref: {
      ref_type: 'validate_need_adjudication_result',
      ref_id: 'adjudication_1',
      title_card_id: 'title_1',
    },
    output_validated_need_ref: {
      ref_type: 'validated_need',
      ref_id: 'validated_need_1',
      title_card_id: 'title_1',
    },
    confirmation_input: {
      schema_version: 'HumanConfirmationInput@v1' as const,
      actor_mode: 'human' as const,
      accountable_human_ref: { actor_type: 'human' as const, actor_id: actorId },
      rationale: 'Advance after reviewing the complete frozen candidate portfolio.',
      accepted_risk_refs: [],
      required_check_results: [],
      delegated_executor: null,
      gap_selection_review: humanReview,
      arena_advisory_review_ref: null,
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

test('stage manifest is deterministic and exposes only the current checkpoint head', async () => {
  const { service } = createService();
  const first = await materialize(service, HASH_A);
  const second = await materialize(service, HASH_B);

  const manifest = await service.getStageManifest('title_1');
  const replay = await service.getStageManifest('title_1');
  const evidenceStage = manifest.stages.find((stage) => stage.stage === 'evidence_landscape');

  assert.deepEqual(replay, manifest);
  assert.match(manifest.manifest_hash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(manifest.stages.map((stage) => stage.stage), [
    'overview',
    'evidence_landscape',
    'research_gap',
    'research_question',
    'value_feasibility',
    'topic_package',
    'promotion_review',
  ]);
  assert.equal(evidenceStage?.state, 'current');
  assert.equal(evidenceStage?.authority_ref?.ref_id, second.target_ref.ref_id);
  assert.equal(evidenceStage?.supersedes_ref?.ref_id, first.research_checkpoint_id);
  assert.equal(
    manifest.stages.some((stage) => stage.authority_ref?.ref_id === first.target_ref.ref_id),
    false,
  );
});

test('human and LLM stage views share one current manifest while keeping different reading surfaces', async () => {
  const { service } = createService();
  await materialize(service, HASH_A);
  const priorView = await service.getStageView('title_1', 'evidence_landscape', 'llm');
  await materialize(service, HASH_B);

  const human = await service.getStageView('title_1', 'evidence_landscape', 'human');
  const llm = await service.getStageView('title_1', 'evidence_landscape', 'llm');
  const humanReplay = await service.getStageView('title_1', 'evidence_landscape', 'human');

  assert.equal(human.manifest_hash, llm.manifest_hash);
  assert.notEqual(priorView.manifest_hash, llm.manifest_hash);
  assert.notEqual(priorView.view_hash, llm.view_hash);
  assert.equal(priorView.source_snapshot_hash, HASH_A);
  assert.equal(human.source_snapshot_hash, HASH_B);
  assert.equal(llm.source_snapshot_hash, HASH_B);
  assert.deepEqual(humanReplay, human);
  assert.equal('working_set' in human, false);
  assert.equal('markdown' in llm, false);
  assert.match(human.markdown, /证据版图/u);
  assert.match(human.markdown, /Closest baseline/u);
  assert.match(human.markdown, /下一次人工判断/u);
  const currentPacket = llm.working_set.current_packet;
  assert.ok(currentPacket);
  assert.equal(currentPacket.target_snapshot_hash, HASH_B);
  assert.equal(llm.working_set.checkpoint_history.length, 2);
  assert.deepEqual(currentPacket.packet_payload.nearest_work, [
    { title: 'Closest baseline' },
  ]);
});

test('current Human rejection is terminal in research views and supersession clears only its projection', async () => {
  const { service } = createService();
  const checkpoint = await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [evidenceUnit('support', 'support'), evidenceUnit('baseline', 'baseline'), evidenceUnit('challenge', 'challenge')],
    conflict_sets: [], coverage_row_intents: [], coverage_assessments: [],
  });
  const input = {
    ...advancingDecision(checkpoint.target_snapshot_hash), decision: 'reject' as const,
    rationale: 'The nearest work already solves this topic.',
  };
  const decision = await service.recordDecision(checkpoint.research_checkpoint_id, input);
  const rejected = (await service.getResearchStatus('title_1')).research_rejection;
  assert.equal(rejected?.checkpoint_ref.ref_id, checkpoint.research_checkpoint_id);
  assert.equal(rejected?.decision_ref.ref_id, decision.research_checkpoint_decision_id);
  assert.equal(rejected?.rationale, input.rationale);
  assert.equal((await service.getResearchStatus('title_1')).next_authorized_transition, null);
  const manifest = await service.getStageManifest('title_1');
  assert.equal(manifest.stages[0]?.status, 'rejected');
  assert.equal(manifest.next_human_decision_stage, null);
  const envelope = await service.getContinuationEnvelope('title_1');
  assert.equal(envelope.boundary_reached, true);
  assert.equal((await service.evaluateContinuationEnvelope('title_1', {
    schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1',
    envelope_hash: envelope.envelope_hash, manifest_hash: envelope.manifest_hash,
    proposed_effects: ['deterministic_local_write'],
  })).decision, 'stop_for_human');
  for (const stage of ['overview', 'evidence_landscape', 'research_gap', 'research_question', 'value_feasibility', 'topic_package', 'promotion_review'] as const) {
    const view = await service.getStageView('title_1', stage, 'human');
    assert.match(view.markdown, /研究已拒绝/u);
    assert.match(view.markdown, /The nearest work already solves this topic/u);
    assert.match(view.markdown, /本轮研究已停止/u);
    assert.doesNotMatch(view.markdown, /请审阅本阶段并选择/u);
  }
  const frozen = await service.getPacket(checkpoint.research_checkpoint_id);
  await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: { ...evidenceMap(), evidence_map_id: 'new_evidence_map', evidence_map_version: 'v2' },
    evidence_units: [], conflict_sets: [], coverage_row_intents: [], coverage_assessments: [],
  });
  assert.equal((await service.getResearchStatus('title_1')).research_rejection, null);
  assert.equal((await service.getStageManifest('title_1')).stages[0]?.status, 'in_progress');
  assert.deepEqual((await service.getPacket(checkpoint.research_checkpoint_id)).decision, frozen.decision);
  assert.deepEqual(await service.recordDecision(checkpoint.research_checkpoint_id, input), decision);
});

test('question rejection requires the connected current upstream chain and clears after upstream replacement', async () => {
  const { service } = createService();
  const evidence = await materialize(service);
  await service.recordDecision(evidence.research_checkpoint_id, advancingDecision());
  const gap = await service.materializeCheckpoint({
    title_card_id: 'title_1', checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'validated_need', ref_id: 'need_1', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_B, allowed_actions: ['advance'], packet_payload: {},
  });
  await service.adaptExistingStageDecision(gap.research_checkpoint_id, {
    decision_authority_ref: { ref_type: 'human_confirmed_decision', ref_id: 'gap_decision', title_card_id: 'title_1' },
    confirmed_snapshot_hash: HASH_B,
  });
  const question = await service.materializeCheckpoint({
    title_card_id: 'title_1', checkpoint_kind: 'question_contract',
    target_ref: { ref_type: 'topic_question_contract', ref_id: 'question_1', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_C, allowed_actions: ['reject'], packet_payload: {},
  });
  const rejection = await service.recordDecision(question.research_checkpoint_id, {
    decision_key: 'reject_question', decision: 'reject',
    actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    confirmed_snapshot_hash: HASH_C, rationale: 'The question cannot distinguish the proposed mechanism.',
    review_payload: {
      review_kind: 'question_contract', mechanism_identifiable: true, proxy_operationalized: true,
      confounds_reviewed: true, falsification_reviewed: true, claim_ceiling_reviewed: true,
      objections_reviewed: true, review_notes: [],
    },
  });
  assert.equal((await service.getResearchRejection('title_1'))?.decision_ref.ref_id, rejection.research_checkpoint_decision_id);
  assert.equal((await service.getResearchStatus('title_1')).next_authorized_transition, null);
  const gapView = await service.getStageView('title_1', 'research_gap', 'llm');
  assert.match(gapView.working_set.human_summary.recommendation, /本轮研究已停止/u);
  assert.equal(gapView.working_set.human_summary.decision_requested, '当前没有待确认的人工决定。');
  const successor = await materialize(service, HASH_D);
  await service.recordDecision(successor.research_checkpoint_id, advancingDecision(HASH_D));
  assert.equal((await service.getCheckpoint(question.research_checkpoint_id)).status, 'decided');
  assert.equal(await service.getResearchRejection('title_1'), null);
  assert.equal((await service.getResearchStatus('title_1')).research_rejection, null);
});

for (const disposition of ['hold', 'loopback'] as const) {
  test(`${disposition} does not become a terminal research rejection`, async () => {
    const { service } = createService();
    const checkpoint = await service.materializeCheckpoint({
      title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape',
      target_ref: { ref_type: 'evidence_map', ref_id: 'evidence_1', title_card_id: 'title_1' },
      target_snapshot_hash: HASH_A, allowed_actions: [disposition], packet_payload: {},
    });
    await service.recordDecision(checkpoint.research_checkpoint_id, {
      ...advancingDecision(), decision: disposition,
      ...(disposition === 'loopback' ? { loopback_target: 'evidence_landscape' as const } : {}),
    });
    assert.equal(await service.getResearchRejection('title_1'), null);
    assert.notEqual((await service.getStageManifest('title_1')).stages[0]?.status, 'rejected');
  });
}

test('question Human view preserves the question, design boundaries, and answerability risks', async () => {
  const { service } = createService();
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_question',
    checkpoint_kind: 'question_contract',
    target_ref: { ref_type: 'topic_question_contract', ref_id: 'contract_1', title_card_id: 'title_question' },
    target_snapshot_hash: HASH_A,
    allowed_actions: ['advance', 'loopback', 'hold'],
    packet_payload: {
      main_question: 'Can retrieval depth improve recall under a fixed latency budget?',
      answerability_verdict: 'answerable_with_risk',
      mechanism_design: { intervention_or_approach: 'Increase retrieval depth', comparison_baseline: 'Fixed top-k 5' },
      operationalization: { observable_outcome: 'Recall at fixed latency', metrics: ['Recall', 'P95 latency'] },
      evaluation_design: {
        datasets_or_resources: ['Frozen evaluation corpus'],
        baselines: ['Fixed top-k 5'],
        ablations_or_comparisons: ['Top-k 10 versus top-k 5'],
        evaluation_setting: 'One frozen retriever',
        open_dependencies: ['Dataset access is pending'],
        known_gaps: ['Weak-drift coverage is limited'],
      },
      risk_notes: ['Baseline collapse remains possible'],
      dependency_risks: ['Dataset licensing may prevent replication'],
      confounds_and_alternatives: ['Corpus composition may explain the observed gain'],
      falsification_conditions: [{ statement: 'Stop if quality falls below the accepted margin', expected_action: 'reframe' }],
      claim_boundary: { claim_ceiling: 'This frozen retrieval setup only', prohibited_claims: ['Universal superiority'] },
    },
  });
  const frozen = await service.getPacket(checkpoint.research_checkpoint_id);
  const human = await service.getStageView('title_question', 'research_question', 'human');
  const llm = await service.getStageView('title_question', 'research_question', 'llm');
  for (const text of [
    'Can retrieval depth improve recall under a fixed latency budget?',
    'Recall at fixed latency', 'P95 latency', 'Top-k 10 versus top-k 5',
    'Stop if quality falls below the accepted margin', 'This frozen retrieval setup only',
    'Universal superiority',
  ]) assert.ok(human.markdown.includes(text), text);
  for (const text of [
    'Dataset access is pending', 'Weak-drift coverage is limited',
    'Baseline collapse remains possible', 'Dataset licensing may prevent replication',
    'Corpus composition may explain the observed gain',
  ]) assert.ok(llm.working_set.human_summary.open_risks.some((risk) => risk.includes(text)), text);
  assert.match(human.markdown, /可回答，但仍有风险/u);
  assert.deepEqual(await service.getPacket(checkpoint.research_checkpoint_id), frozen);
});

test('backfilled question view retains its top-level frozen claim boundaries', async () => {
  const { service } = createService();
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_question', checkpoint_kind: 'question_contract', provenance_class: 'backfilled',
    target_ref: { ref_type: 'topic_question_contract', ref_id: 'backfilled_contract', title_card_id: 'title_question' },
    target_snapshot_hash: HASH_A, allowed_actions: ['advance', 'loopback'],
    packet_payload: {
      main_question: 'Does a frozen intervention improve recall?',
      expected_claim: 'A bounded local improvement', fallback_claim: 'An informative null result',
      max_claim_strength: 'One controlled comparison', claim_ceiling: 'The frozen corpus only',
      prohibited_claims: ['Universal superiority'],
    },
  });
  const frozen = await service.getPacket(checkpoint.research_checkpoint_id);
  const human = await service.getStageView('title_question', 'research_question', 'human');
  for (const text of ['A bounded local improvement', 'An informative null result', 'One controlled comparison', 'The frozen corpus only', 'Universal superiority']) {
    assert.ok(human.markdown.includes(text), text);
  }
  assert.deepEqual(await service.getPacket(checkpoint.research_checkpoint_id), frozen);
});

test('legacy question view reads only its exact contract and leaves the frozen packet unchanged', async () => {
  const contract: TopicSelectionTopicQuestionContractRecord = {
    topic_question_contract_id: 'legacy_contract', title_card_id: 'title_question',
    topic_question_id: 'question_1', version: 'v1', answerability_plan_id: 'plan_1',
    source_research_slice_id: 'slice_1', source_research_slice_version: 'v1',
    source_candidate_id: 'candidate_1', selection_decision_id: 'selection_1',
    input_snapshot_ref: { ref_type: 'input_snapshot', ref_id: 'snapshot_1' }, contract_hash: HASH_A,
    main_question: 'Does the fixed intervention improve recall?', question_type: 'method',
    contribution_hypothesis: 'method', target_setting: 'Frozen retrieval setup', target_community: 'IR',
    expected_claim: 'Local recall improvement', fallback_claim: 'No detectable improvement',
    max_claim_strength: 'Local comparison', evaluation_route: 'Frozen benchmark',
    claim_ceiling: 'Frozen setup only', prohibited_claims: ['Universal superiority'],
    required_evidence_categories: [], allowed_refinements: [], stop_reopen_conditions: [],
    accepted_risk_refs: [], risk_notes: ['Benchmark validity remains unresolved'],
    status: 'active', artifact_refs: [], created_at: NOW, updated_at: NOW,
  };
  let returnedContract = contract;
  const { service } = createService({
    topicPackageRepository: { listPackagesByTitleCardId: async () => [] },
    valueAssessmentRepository: {
      listAssessmentsByTitleCardId: async () => [], listDispositionDecisionsByTitleCardId: async () => [],
    },
    questionRepository: { findTopicQuestionContractById: async () => returnedContract },
  });
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_question', checkpoint_kind: 'question_contract',
    target_ref: { ref_type: 'topic_question_contract', ref_id: 'legacy_contract', title_card_id: 'title_question', version_id: 'v1' },
    target_snapshot_hash: HASH_A, allowed_actions: ['advance', 'loopback'],
    packet_payload: { answerability_verdict: 'answerable_with_risk' },
  });
  const frozen = await service.getPacket(checkpoint.research_checkpoint_id);
  const human = await service.getStageView('title_question', 'research_question', 'human');
  assert.ok(human.markdown.includes(contract.main_question));
  assert.ok(human.markdown.includes('Benchmark validity remains unresolved'));
  assert.deepEqual(await service.getPacket(checkpoint.research_checkpoint_id), frozen);
  returnedContract = { ...contract, version: 'v2', main_question: 'A different question' };
  await assert.rejects(service.getStageView('title_question', 'research_question', 'human'),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT');
  returnedContract = { ...contract, title_card_id: 'another_title' };
  await assert.rejects(service.getStageView('title_question', 'research_question', 'human'),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT');
  assert.deepEqual(await service.getPacket(checkpoint.research_checkpoint_id), frozen);
});

test('pending evidence Human view presents substantive evidence and exact unresolved gate risks', async () => {
  const { service } = createService();
  const rows = [
    coverageRow('coverage_support', 'support'),
    coverageRow('coverage_challenge', 'challenge'),
    coverageRow('coverage_baseline', 'baseline'),
  ];
  const units = [
    evidenceUnit('support', 'support'),
    evidenceUnit('challenge', 'challenge'),
    evidenceUnit('baseline', 'baseline'),
    evidenceUnit('context', 'context'),
  ];
  const conflict: TopicSelectionEvidenceConflictSetRecord = {
    evidence_conflict_set_id: 'conflict_material',
    workspace_id: null,
    title_card_id: 'title_1',
    evidence_map_id: 'evidence_map_1',
    evidence_map_version: 'v1',
    conflict_type: 'claim_conflict',
    severity: 'material',
    support_unit_refs: [{ ref_type: 'evidence_unit', ref_id: 'support', title_card_id: 'title_1', version_id: 'v1' }],
    challenge_unit_refs: [{ ref_type: 'evidence_unit', ref_id: 'challenge', title_card_id: 'title_1', version_id: 'v1' }],
    baseline_unit_refs: [],
    context_unit_refs: [],
    issue_codes: ['DIRECT_PRIOR_ART_PRESSURE'],
    created_at: NOW,
  };
  await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: {
      ...evidenceMap(),
      digest_payload: {
        working_claim: 'Adaptive retrieval should improve calibrated evidence use.',
        mechanism: 'Allocate retrieval depth from uncertainty.',
        falsification_condition: 'No gain over a fixed-depth baseline.',
        claim_ceiling: 'Evidence supports calibration, not universal accuracy gains.',
      },
    },
    evidence_units: units,
    conflict_sets: [conflict],
    coverage_row_intents: rows,
    coverage_assessments: [
      coverageAssessment('assessment_support', 'coverage_support', 'satisfied', NOW),
      coverageAssessment('assessment_challenge', 'coverage_challenge', 'missing', NOW),
      coverageAssessment('assessment_baseline', 'coverage_baseline', 'satisfied', NOW),
    ],
  });

  const view = await service.getStageView('title_1', 'evidence_landscape', 'human');

  assert.match(view.markdown, /Adaptive retrieval should improve calibrated evidence use\./u);
  assert.match(view.markdown, /支持：support claim/u);
  assert.match(view.markdown, /反证：challenge claim/u);
  assert.match(view.markdown, /基线：baseline claim/u);
  assert.match(view.markdown, /背景：context claim/u);
  assert.match(view.markdown, /Allocate retrieval depth from uncertainty\./u);
  assert.match(view.markdown, /No gain over a fixed-depth baseline\./u);
  assert.match(view.markdown, /Evidence supports calibration, not universal accuracy gains\./u);
  assert.match(view.markdown, /challenge coverage/u);
  assert.match(view.markdown, /NO_DIRECT_EVIDENCE/u);
  assert.match(view.markdown, /实质证据冲突/u);
  assert.match(view.markdown, /DIRECT_PRIOR_ART_PRESSURE/u);
  assert.match(view.markdown, /接受并推进/u);
  assert.match(view.markdown, /回环补强/u);
  assert.match(view.markdown, /拒绝当前结果/u);
  assert.match(view.markdown, /暂缓决定/u);
  assert.doesNotMatch(view.markdown, /## 开放风险\n- 暂无/u);
});

test('continuation envelope advances routine local work only until the next human boundary', async () => {
  const { service } = createService();
  const initialEnvelope = await service.getContinuationEnvelope('title_1');
  assert.equal(initialEnvelope.boundary_reached, false);
  assert.equal(initialEnvelope.target_human_decision_stage, 'evidence_landscape');
  const routineInput = {
    schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1' as const,
    envelope_hash: initialEnvelope.envelope_hash,
    manifest_hash: initialEnvelope.manifest_hash,
    proposed_effects: [
      'local_read',
      'deterministic_local_write',
      'bounded_non_provider_job',
      'verification',
      'recoverable_retry',
      'selected_local_backend_lifecycle',
    ] as const,
  };
  const routine = await service.evaluateContinuationEnvelope('title_1', routineInput);
  assert.equal(routine.decision, 'continue');
  assert.deepEqual(await service.evaluateContinuationEnvelope('title_1', routineInput), routine);

  const confirmationRequired = await service.evaluateContinuationEnvelope('title_1', {
    ...routineInput,
    proposed_effects: [
      'research_meaning_change',
      'human_authority_write',
      'material_risk_acceptance',
      'provider_or_material_cost',
      'external_acquisition',
      'destructive_or_control_sensitive',
      'target_environment_change',
      'material_scope_expansion',
      'ambiguous_recovery',
    ],
  });
  assert.equal(confirmationRequired.decision, 'stop_for_human');
  assert.equal(confirmationRequired.blocking_effects.length, 9);
  assert.equal((await service.listCheckpoints('title_1')).length, 0);

  const checkpoint = await materialize(service, HASH_A);
  const stale = await service.evaluateContinuationEnvelope('title_1', routineInput);
  assert.equal(stale.decision, 'refresh_envelope');
  assert.deepEqual(stale.reason_codes, ['ENVELOPE_STALE']);
  const pendingEnvelope = await service.getContinuationEnvelope('title_1');
  assert.equal(pendingEnvelope.boundary_reached, true);
  const pending = await service.evaluateContinuationEnvelope('title_1', {
    ...routineInput,
    envelope_hash: pendingEnvelope.envelope_hash,
    manifest_hash: pendingEnvelope.manifest_hash,
  });
  assert.equal(pending.decision, 'stop_for_human');
  assert.deepEqual(pending.reason_codes, ['HUMAN_DECISION_BOUNDARY_REACHED']);

  await service.recordDecision(checkpoint.research_checkpoint_id, advancingDecision());
  const advancedEnvelope = await service.getContinuationEnvelope('title_1');
  assert.equal(advancedEnvelope.boundary_reached, false);
  assert.equal(advancedEnvelope.target_human_decision_stage, 'research_gap');
  const advanced = await service.evaluateContinuationEnvelope('title_1', {
    ...routineInput,
    envelope_hash: advancedEnvelope.envelope_hash,
    manifest_hash: advancedEnvelope.manifest_hash,
  });
  assert.equal(advanced.decision, 'continue');
});

test('multi-run current dispositions resolve by the current question contract instead of failing', async () => {
  const titleCardId = 'title_multi_run';
  const riskRef = (id: string) => ({
    ref_type: 'artifact_ref',
    ref_id: id,
    title_card_id: titleCardId,
    version_id: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  });
  const assessmentFor = (suffix: string, contractId: string) => ({
    topic_value_assessment_id: `assessment_${suffix}`,
    title_card_id: titleCardId,
    topic_question_contract_id: contractId,
    value_reasoning_memo_id: `memo_${suffix}`,
    readiness_status: 'ready',
    freshness_status: 'current',
    value_summary: 'The mechanism stays testable in this run lineage.',
    artifact_refs: [riskRef(`risk_${suffix}`)],
    risk_finding_refs: [riskRef(`risk_${suffix}`)],
  }) as unknown as TopicSelectionTopicValueAssessmentRecord;
  const decisionFor = (suffix: string, createdAt: string) => ({
    value_disposition_decision_id: `decision_${suffix}`,
    title_card_id: titleCardId,
    topic_value_assessment_id: `assessment_${suffix}`,
    decision: 'advance_to_package',
    status: 'active',
    is_current: true,
    decision_rationale: 'Advance inside this run lineage.',
    artifact_refs: [riskRef(`risk_${suffix}`)],
    risk_finding_refs: [riskRef(`risk_${suffix}`)],
    created_at: createdAt,
  }) as unknown as TopicSelectionValueDispositionDecisionRecord;
  const assessments = [
    assessmentFor('superseded_run', 'question_contract_old'),
    assessmentFor('current_run', 'question_contract_live'),
  ];
  const decisions = [
    // The superseded run is newer; current contract scoping must beat recency.
    decisionFor('superseded_run', '2026-08-30T10:00:00Z'),
    decisionFor('current_run', '2026-08-28T10:00:00Z'),
  ];
  const { service, controlPlane } = createService({
    topicPackageRepository: { listPackagesByTitleCardId: async () => [] },
    valueAssessmentRepository: {
      listAssessmentsByTitleCardId: async () => assessments,
      listDispositionDecisionsByTitleCardId: async () => decisions,
      findReasoningMemoById: async () => null,
      listEvidenceRefsByAssessmentId: async () => [],
    },
  });
  await service.materializeCheckpoint({
    title_card_id: titleCardId,
    checkpoint_kind: 'question_contract',
    target_ref: {
      ref_type: 'topic_question_contract',
      ref_id: 'question_contract_live',
      title_card_id: titleCardId,
    },
    target_snapshot_hash: HASH_A,
    allowed_actions: ['advance', 'loopback'],
  });

  const status = await service.getResearchStatus(titleCardId);
  assert.deepEqual(status.material_risk_finding_refs, [riskRef('risk_current_run')]);
  const manifest = await service.getStageManifest(titleCardId);
  const valueStage = manifest.stages.find((stage) => stage.stage === 'value_feasibility');
  assert.equal(valueStage?.authority_ref?.ref_id, 'assessment_current_run');
  assert.deepEqual(valueStage?.issue_codes, []);

  assessments.push({
    ...assessmentFor('pending', 'question_contract_live'),
    readiness_status: 'needs_refinement', total_score: 66,
    risk_notes: ['Coverage remains insufficient'], created_at: '2026-09-07T10:00:00Z',
  });
  const pendingStatus = await service.getResearchStatus(titleCardId);
  assert.equal(pendingStatus.current_value?.authority_ref?.ref_id, 'assessment_pending');
  assert.equal(pendingStatus.current_value?.status, 'needs_refinement:awaiting_disposition');
  assert.deepEqual(pendingStatus.material_risk_finding_refs, [riskRef('risk_pending')]);
  assert.equal(pendingStatus.current_value?.source_refs.some((ref) => ref.ref_type === 'value_disposition_decision'), false);
  const pendingHuman = await service.getStageView(titleCardId, 'value_feasibility', 'human');
  assert.match(pendingHuman.markdown, /Coverage remains insufficient/u);
  assert.match(pendingHuman.markdown, /66/u);

  const payload = {
    schema_version: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
    title_card_id: titleCardId, summary: 'Benchmark validity needs an independent check',
  };
  const artifact = await controlPlane.recordArtifactRef({
    title_card_id: titleCardId, artifact_kind: 'structured_output', storage_kind: 'inline',
    payload, checksum: sha256Text(stableStringify(payload)), created_by: 'system',
  });
  assessments[2]!.risk_finding_refs = [riskRef(artifact.artifact_ref_id)];
  assessments[2]!.artifact_refs = [riskRef(artifact.artifact_ref_id)];
  decisions.push({
    ...decisionFor('pending', '2026-09-07T11:00:00Z'), decision: 'refine_question',
    decision_rationale: 'Refine the metric contract before packaging',
    required_actions: ['Define the primary metric'],
    artifact_refs: [riskRef(artifact.artifact_ref_id)], risk_finding_refs: [riskRef(artifact.artifact_ref_id)],
  });
  for (const kind of ['evidence_landscape', 'gap_selection'] as const) {
    const checkpoint = await service.materializeCheckpoint({
      title_card_id: titleCardId, checkpoint_kind: kind,
      target_ref: { ref_type: kind === 'evidence_landscape' ? 'evidence_map' : 'need_candidate_arena', ref_id: kind, title_card_id: titleCardId },
      target_snapshot_hash: HASH_A, allowed_actions: ['advance', 'loopback'],
    });
    if (kind === 'evidence_landscape') {
      await service.recordDecision(checkpoint.research_checkpoint_id, advancingDecision());
    } else {
      await service.adaptExistingStageDecision(checkpoint.research_checkpoint_id, {
        confirmed_snapshot_hash: HASH_A,
        decision_authority_ref: { ref_type: 'human_confirmed_decision', ref_id: 'confirmed_need', title_card_id: titleCardId },
      });
    }
  }
  const questionPacket = (await service.getStageView(titleCardId, 'research_question', 'llm')).working_set.current_packet!;
  await service.recordDecision(questionPacket.research_checkpoint_id, questionDecision(HASH_A, 'confirmed_question'));
  const frozen = (await service.getStageView(titleCardId, 'research_question', 'llm')).working_set.current_packet;
  for (const stage of ['research_question', 'value_feasibility', 'overview'] as const) {
    const view = await service.getStageView(titleCardId, stage, 'human');
    assert.match(view.markdown, /66/u);
    assert.match(view.markdown, /Benchmark validity needs an independent check/u);
    assert.match(view.markdown, /Refine the metric contract before packaging/u);
    assert.match(view.markdown, /Define the primary metric/u);
    assert.match(view.markdown, /先修订研究问题/u);
    assert.doesNotMatch(view.markdown, /下一次人工判断位于“晋级审阅”|请在“晋级审阅”|先处理“晋级审阅”/u);
  }
  assert.deepEqual((await service.getStageView(titleCardId, 'research_question', 'llm')).working_set.current_packet, frozen);
});

test('stage manifest selects the current value disposition and latest package inside that lineage', async () => {
  const titleCardId = 'title_projection';
  const riskFindingRef = {
    ref_type: 'artifact_ref',
    ref_id: 'risk_finding_projection_001',
    title_card_id: titleCardId,
    version_id: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  };
  const assessment = {
    topic_value_assessment_id: 'assessment_current',
    title_card_id: titleCardId,
    topic_question_contract_id: 'question_contract_current',
    value_reasoning_memo_id: 'memo_current',
    readiness_status: 'ready',
    freshness_status: 'current',
    value_summary: 'The mechanism is valuable if the discriminating test succeeds.',
    artifact_refs: [riskFindingRef],
    risk_finding_refs: [riskFindingRef],
  } as unknown as TopicSelectionTopicValueAssessmentRecord;
  const currentDecision = {
    value_disposition_decision_id: 'decision_current',
    title_card_id: titleCardId,
    topic_value_assessment_id: assessment.topic_value_assessment_id,
    decision: 'advance_to_package',
    status: 'active',
    is_current: true,
    decision_rationale: 'Advance because the mechanism remains distinguishable and feasible.',
    artifact_refs: [riskFindingRef],
    risk_finding_refs: [riskFindingRef],
  } as unknown as TopicSelectionValueDispositionDecisionRecord;
  const topicPackage = (
    id: string,
    decisionId: string,
    createdAt: string,
  ) => ({
    topic_package_id: id,
    title_card_id: titleCardId,
    value_disposition_decision_id: decisionId,
    value_disposition_decision_ref: {
      ref_type: 'value_disposition_decision',
      ref_id: decisionId,
      title_card_id: titleCardId,
    },
    topic_value_assessment_ref: {
      ref_type: 'topic_value_assessment',
      ref_id: assessment.topic_value_assessment_id,
      title_card_id: titleCardId,
    },
    topic_question_contract_ref: {
      ref_type: 'topic_question_contract',
      ref_id: assessment.topic_question_contract_id,
      title_card_id: titleCardId,
    },
    research_slice_ref: {
      ref_type: 'research_slice',
      ref_id: 'slice_current',
      title_card_id: titleCardId,
    },
    topic_package_ref: { ref_type: 'topic_package', ref_id: id, title_card_id: titleCardId },
    package_readiness_status: 'ready',
    contribution_summary: 'A falsifiable mechanism contribution with a bounded claim.',
    research_background: 'Nearest work leaves one discriminating mechanism unresolved.',
    title_candidates: ['Primary title', 'Alternative title'],
    candidate_methods: ['Signed intervention analysis'],
    evaluation_plan: 'Compare the intervention against the nearest baseline.',
    key_risks: ['The local pipeline may limit external validity.'],
    non_goals: ['Universal ranking claims'],
    trace_boundary_check_id: 'trace_current',
    readiness_assessment_id: 'readiness_current',
    validated_need_refs: [],
    selected_evidence_refs: [],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    artifact_refs: [riskFindingRef],
    risk_finding_refs: [riskFindingRef],
    created_at: createdAt,
  }) as unknown as TopicSelectionTopicPackageRecord;
  const packages = [
    topicPackage('package_current_old', currentDecision.value_disposition_decision_id, '2026-08-25T10:00:00Z'),
    topicPackage('package_current_new', currentDecision.value_disposition_decision_id, '2026-08-25T11:00:00Z'),
    topicPackage('package_stale_newer', 'decision_stale', '2026-08-25T12:00:00Z'),
  ];
  const memo = {
    value_reasoning_memo_id: 'memo_current',
    value_thesis: 'The topic earns continuation only if the signed intervention separates mechanisms.',
  } as unknown as TopicSelectionValueReasoningMemoRecord;
  const valueEvidence = [{
    topic_value_evidence_ref_id: 'value_evidence_current',
    rationale: 'Nearest-work comparison supports the discriminating test.',
  }] as unknown as TopicSelectionTopicValueEvidenceRefRecord[];
  const traceBoundary = {
    package_trace_boundary_check_id: 'trace_current',
    check_status: 'passed',
  } as unknown as TopicSelectionPackageTraceBoundaryCheckRecord;
  const readiness = {
    package_readiness_assessment_id: 'readiness_current',
    package_readiness_status: 'ready_for_promotion_review',
    blockers: [],
    warnings: [],
    required_actions: [],
  } as unknown as TopicSelectionTopicPackageReadinessAssessmentRecord;
  const v1cBundle = {
    v1b_to_v1c_input_bundle_id: 'bundle_current',
    topic_package_id: 'package_current_new',
  } as unknown as TopicSelectionV1bToV1cInputBundleRecord;
  const { service } = createService({
    valueAssessmentRepository: {
      listAssessmentsByTitleCardId: async () => [assessment],
      listDispositionDecisionsByTitleCardId: async () => [currentDecision],
      findReasoningMemoById: async () => memo,
      listEvidenceRefsByAssessmentId: async () => valueEvidence,
    },
    topicPackageRepository: {
      listPackagesByTitleCardId: async () => packages,
      findTraceBoundaryCheckById: async () => traceBoundary,
      findReadinessAssessmentById: async () => readiness,
      findV1cInputBundleByPackageId: async () => v1cBundle,
    },
  });
  await service.materializeCheckpoint({
    title_card_id: titleCardId,
    checkpoint_kind: 'question_contract',
    target_ref: {
      ref_type: 'topic_question_contract',
      ref_id: assessment.topic_question_contract_id,
      title_card_id: titleCardId,
    },
    target_snapshot_hash: HASH_A,
    allowed_actions: ['advance', 'loopback'],
  });

  const manifest = await service.getStageManifest(titleCardId);
  const valueStage = manifest.stages.find((stage) => stage.stage === 'value_feasibility');
  const packageStage = manifest.stages.find((stage) => stage.stage === 'topic_package');

  assert.equal(valueStage?.authority_ref?.ref_id, assessment.topic_value_assessment_id);
  assert.equal(packageStage?.authority_ref?.ref_id, 'package_current_new');
  assert.deepEqual(valueStage?.artifact_refs, [riskFindingRef]);
  assert.deepEqual(packageStage?.artifact_refs, [riskFindingRef]);
  assert.equal(
    manifest.stages.some((stage) => stage.authority_ref?.ref_id === 'package_stale_newer'),
    false,
  );
  const valueLlmView = await service.getStageView(titleCardId, 'value_feasibility', 'llm');
  const packageLlmView = await service.getStageView(titleCardId, 'topic_package', 'llm');
  const valueHumanView = await service.getStageView(titleCardId, 'value_feasibility', 'human');
  const packageHumanView = await service.getStageView(titleCardId, 'topic_package', 'human');
  assert.deepEqual(valueLlmView.working_set.related_records.reasoning_memo, memo);
  assert.deepEqual(valueLlmView.working_set.related_records.evidence_refs, valueEvidence);
  assert.equal(
    (packageLlmView.working_set.canonical_owner as TopicSelectionTopicPackageRecord).topic_package_id,
    'package_current_new',
  );
  assert.deepEqual(packageLlmView.working_set.related_records.package_trace_boundary_check, traceBoundary);
  assert.deepEqual(packageLlmView.working_set.related_records.package_readiness_assessment, readiness);
  assert.deepEqual(packageLlmView.working_set.related_records.v1c_input_bundle, v1cBundle);
  assert.match(valueHumanView.markdown, /signed intervention separates mechanisms/u);
  assert.match(packageHumanView.markdown, /falsifiable mechanism contribution/u);
  assert.match(valueHumanView.markdown, /risk_finding_projection_001/u);
  assert.match(packageHumanView.markdown, /risk_finding_projection_001/u);
  assert.deepEqual(
    (await service.getResearchStatus(titleCardId)).material_risk_finding_refs,
    [riskFindingRef],
  );

  const staleSubject = createService({
    valueAssessmentRepository: {
      listAssessmentsByTitleCardId: async () => [assessment],
      listDispositionDecisionsByTitleCardId: async () => [currentDecision],
    },
    topicPackageRepository: {
      listPackagesByTitleCardId: async () => packages,
    },
  });
  await staleSubject.service.materializeCheckpoint({
    title_card_id: titleCardId,
    checkpoint_kind: 'question_contract',
    target_ref: {
      ref_type: 'topic_question_contract',
      ref_id: 'question_contract_revised',
      title_card_id: titleCardId,
    },
    target_snapshot_hash: HASH_B,
    allowed_actions: ['advance', 'loopback'],
  });
  const staleManifest = await staleSubject.service.getStageManifest(titleCardId);
  const staleValueStage = staleManifest.stages.find((stage) => stage.stage === 'value_feasibility');
  assert.equal(staleValueStage?.state, 'unavailable');
  assert.deepEqual(staleValueStage?.issue_codes, ['CURRENT_VALUE_UPSTREAM_STALE']);
  assert.equal(
    staleManifest.stages.some((stage) => stage.authority_ref?.ref_id === 'package_current_new'),
    false,
  );
  assert.deepEqual((await staleSubject.service.getResearchStatus(titleCardId)).material_risk_finding_refs, []);
  assert.equal((await staleSubject.service.getResearchStatus(titleCardId)).current_value?.state, 'unavailable');
});

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
      objections_reviewed: true,
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

test('question advance requires explicit human objection review', async () => {
  const { service } = createService();
  const checkpoint = await materializeQuestion(service, {
    snapshotHash: HASH_A,
    contractId: 'question_contract_review',
    sliceVersion: 'v1',
  });
  const decision = questionDecision(HASH_A, 'question_decision_without_objection_review');
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...decision,
      review_payload: {
        ...decision.review_payload,
        objections_reviewed: false,
      },
    }),
    /objection review/u,
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

function coverageAssessment(
  id: string,
  rowId: string,
  verdict: TopicSelectionCoverageAssessmentRecord['verdict'],
  createdAt: string,
): TopicSelectionCoverageAssessmentRecord {
  return {
    coverage_assessment_id: id,
    search_plan_id: 'search_plan_1',
    coverage_row_intent_id: rowId,
    verdict,
    issue_codes: verdict === 'missing' ? ['NO_DIRECT_EVIDENCE'] : [],
    confidence: 0.9,
    assessed_by: 'system',
    created_at: createdAt,
  };
}

function evidenceUnit(
  id: string,
  role: 'support' | 'challenge' | 'baseline' | 'context',
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
    semantic_group_key: 'a'.repeat(64),
    current_arena_advisory: null,
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
    coverage_assessments: [],
  });
  assert.equal(abstractCheckpoint.allowed_actions.includes('advance'), false);
  assert.equal(abstractCheckpoint.required_action_refs.length > 0, true);

  const missingContext = createService();
  const missingCheckpoint = await missingContext.service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [evidenceUnit('support', 'support')],
    conflict_sets: [],
    coverage_row_intents: rows,
    coverage_assessments: [],
  });
  const packet = await missingContext.service.getPacket(missingCheckpoint.research_checkpoint_id);
  const issueCodes = (packet.packet_payload.policy_issues as Array<{ code: string }>).map((issue) => issue.code);
  assert.deepEqual(issueCodes, ['DIRECT_NEIGHBOR_COVERAGE_REQUIRED', 'DISCONFIRMING_EVIDENCE_REQUIRED']);
});

test('evidence policy emits exact required-row refs from the latest missing coverage assessments', async () => {
  const { service } = createService();
  const rows = [
    coverageRow('coverage_support', 'support'),
    coverageRow('coverage_challenge', 'challenge'),
    coverageRow('coverage_baseline', 'baseline'),
  ];
  const checkpoint = await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [
      evidenceUnit('support', 'support'),
      evidenceUnit('challenge', 'challenge'),
      evidenceUnit('baseline', 'baseline'),
    ],
    conflict_sets: [],
    coverage_row_intents: rows,
    coverage_assessments: [
      coverageAssessment('assessment_support_old', 'coverage_support', 'missing', '2026-08-25T09:00:00.000Z'),
      coverageAssessment('assessment_challenge', 'coverage_challenge', 'missing', '2026-08-25T10:00:00.000Z'),
      coverageAssessment('assessment_support_latest', 'coverage_support', 'satisfied', '2026-08-25T11:00:00.000Z'),
    ],
  });

  const packet = await service.getPacket(checkpoint.research_checkpoint_id);
  assert.deepEqual(packet.packet_payload.policy_issues, [{
    code: 'REQUIRED_COVERAGE_MISSING',
    message: 'Every required missing coverage row needs exact Human acceptance before advancement.',
    refs: [{ ref_type: 'coverage_row_intent', ref_id: 'coverage_challenge', title_card_id: 'title_1' }],
  }]);
  assert.deepEqual(packet.packet_payload.latest_coverage_assessments, [
    {
      coverage_assessment_ref: {
        ref_type: 'coverage_assessment',
        ref_id: 'assessment_support_latest',
        title_card_id: 'title_1',
      },
      coverage_row_intent_ref: {
        ref_type: 'coverage_row_intent',
        ref_id: 'coverage_support',
        title_card_id: 'title_1',
      },
      verdict: 'satisfied',
      issue_codes: [],
      confidence: 0.9,
      assessed_by: 'system',
      created_at: '2026-08-25T11:00:00.000Z',
    },
    {
      coverage_assessment_ref: {
        ref_type: 'coverage_assessment',
        ref_id: 'assessment_challenge',
        title_card_id: 'title_1',
      },
      coverage_row_intent_ref: {
        ref_type: 'coverage_row_intent',
        ref_id: 'coverage_challenge',
        title_card_id: 'title_1',
      },
      verdict: 'missing',
      issue_codes: ['NO_DIRECT_EVIDENCE'],
      confidence: 0.9,
      assessed_by: 'system',
      created_at: '2026-08-25T10:00:00.000Z',
    },
  ]);
  assert.equal(checkpoint.allowed_actions.includes('advance'), true);
  assert.equal(checkpoint.required_action_refs.length, 1);
});

test('required missing coverage advances only through exact persisted Human acceptance', async () => {
  const { service } = createService();
  const rows = [
    coverageRow('coverage_support', 'support'),
    coverageRow('coverage_challenge', 'challenge'),
    coverageRow('coverage_baseline', 'baseline'),
  ];
  const checkpoint = await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [
      evidenceUnit('support', 'support'),
      evidenceUnit('challenge', 'challenge'),
      evidenceUnit('baseline', 'baseline'),
    ],
    conflict_sets: [],
    coverage_row_intents: rows,
    coverage_assessments: [
      coverageAssessment('assessment_support', 'coverage_support', 'satisfied', NOW),
      coverageAssessment('assessment_challenge', 'coverage_challenge', 'missing', NOW),
      coverageAssessment('assessment_baseline', 'coverage_baseline', 'missing', NOW),
    ],
  });
  const challengeRef = {
    ref_type: 'coverage_row_intent',
    ref_id: 'coverage_challenge',
    title_card_id: 'title_1',
  };
  const baselineRef = {
    ref_type: 'coverage_row_intent',
    ref_id: 'coverage_baseline',
    title_card_id: 'title_1',
  };

  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, advancingDecision(checkpoint.target_snapshot_hash)),
    /requires exact Human acceptance/u,
  );
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...advancingDecision(checkpoint.target_snapshot_hash),
      decision_key: 'decision_incomplete_coverage',
      review_payload: {
        ...advancingDecision(checkpoint.target_snapshot_hash).review_payload,
        accepted_coverage: {
          coverage_row_refs: [challengeRef],
          rationale: 'Accept only one of two rows.',
        },
      },
    }),
    /exact current missing coverage rows/u,
  );
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...advancingDecision(checkpoint.target_snapshot_hash),
      decision_key: 'decision_stale_coverage',
      review_payload: {
        ...advancingDecision(checkpoint.target_snapshot_hash).review_payload,
        accepted_coverage: {
          coverage_row_refs: [{ ...challengeRef, version_id: 'stale' }, baselineRef],
          rationale: 'This includes a stale row representation.',
        },
      },
    }),
    /exact current missing coverage rows/u,
  );

  const acceptedInput = {
    ...advancingDecision(checkpoint.target_snapshot_hash),
    decision_key: 'decision_exact_coverage',
    review_payload: {
      ...advancingDecision(checkpoint.target_snapshot_hash).review_payload,
      accepted_coverage: {
        coverage_row_refs: [challengeRef, baselineRef],
        rationale: 'Accept both exact current missing rows while retaining their risk downstream.',
      },
    },
  };
  const decision = await service.recordDecision(checkpoint.research_checkpoint_id, acceptedInput);
  assert.deepEqual(decision.review_payload, acceptedInput.review_payload);
  assert.deepEqual((await service.getPacket(checkpoint.research_checkpoint_id)).decision, decision);
  const acceptedView = await service.getStageView('title_1', 'evidence_landscape', 'human');
  assert.match(acceptedView.markdown, /人工已接受未解决覆盖风险/u);
  assert.match(acceptedView.markdown, /coverage_challenge、coverage_baseline|coverage_baseline、coverage_challenge/u);
  assert.match(acceptedView.markdown, /Accept both exact current missing rows while retaining their risk downstream\./u);
  assert.deepEqual((await service.getCheckpoint(checkpoint.research_checkpoint_id)).required_action_refs, []);
  await service.assertTransitionAllowed({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_snapshot_hash: checkpoint.target_snapshot_hash,
  });
  const gapCheckpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: checkpoint.target_ref,
    candidates: [],
  });
  assert.ok(gapCheckpoint.source_refs.some((ref) =>
    ref.ref_type === 'research_checkpoint_decision'
    && ref.ref_id === decision.research_checkpoint_decision_id));
  assert.equal(
    (await service.recordDecision(checkpoint.research_checkpoint_id, acceptedInput)).research_checkpoint_decision_id,
    decision.research_checkpoint_decision_id,
  );
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...acceptedInput,
      review_payload: {
        ...acceptedInput.review_payload,
        accepted_coverage: {
          ...acceptedInput.review_payload.accepted_coverage,
          rationale: 'Changed after the decision was recorded.',
        },
      },
    }),
    /different decision content/u,
  );
});

test('current evidence with satisfied rows still exposes unverified recent literature at exact Human review', async () => {
  const { service } = createService();
  const rows = [coverageRow('coverage_support', 'support'), coverageRow('coverage_challenge', 'challenge'), coverageRow('coverage_baseline', 'baseline')];
  const checkpoint = await service.materializeEvidenceLandscapeCheckpoint({
    evidence_map: evidenceMap(),
    evidence_units: [evidenceUnit('support', 'support'), evidenceUnit('challenge', 'challenge'), evidenceUnit('baseline', 'baseline')],
    conflict_sets: [],
    coverage_row_intents: rows,
    coverage_assessments: rows.map((row) => coverageAssessment(`assessment_${row.coverage_key}`, row.coverage_row_intent_id, 'satisfied', NOW)),
  });
  const packet = await service.getPacket(checkpoint.research_checkpoint_id);
  assert.deepEqual(packet.packet_payload.policy_issues, []);
  const limitations = packet.packet_payload.literature_coverage_limitations as Array<{ code: string; message: string; refs: unknown[] }>;
  assert.deepEqual(limitations?.map((item) => item.code), ['RECENT_LITERATURE_COVERAGE_UNVERIFIED', 'NEAR_DUPLICATE_RISK_UNRESOLVED']);
  assert.deepEqual(limitations[0]?.refs, [evidenceMap().literature_snapshot_ref, evidenceMap().search_plan_ref, evidenceMap().search_run_ref]);
  const human = await service.getStageView('title_1', 'evidence_landscape', 'human');
  assert.match(human.markdown, /近期直接重叠研究/u);
  assert.match(human.markdown, /近重复/u);
  assert.equal(human.source_snapshot_hash, checkpoint.target_snapshot_hash);
  const llm = await service.getStageView('title_1', 'evidence_landscape', 'llm');
  assert.deepEqual(llm.working_set.current_packet?.packet_payload.literature_coverage_limitations, limitations);
  assert.deepEqual(await service.getPacket(checkpoint.research_checkpoint_id), packet);
  assert.equal((await service.getResearchStatus('title_1')).next_authorized_transition, null);
  await assert.rejects(service.recordDecision(checkpoint.research_checkpoint_id, advancingDecision(HASH_A)), /snapshot/u);
  await assert.rejects(service.recordDecision(checkpoint.research_checkpoint_id, {
    ...advancingDecision(checkpoint.target_snapshot_hash),
    review_payload: { ...advancingDecision().review_payload, nearest_work_reviewed: false },
  }), /semantic review/u);
  const input = {
    ...advancingDecision(checkpoint.target_snapshot_hash),
    review_payload: {
      ...advancingDecision().review_payload,
      limitations: ['近期检索仍局限于当前资料库，保留直接重叠研究遗漏风险。'],
    },
  };
  const decision = await service.recordDecision(checkpoint.research_checkpoint_id, input);
  assert.deepEqual(decision.review_payload, input.review_payload);
  assert.equal((await service.recordDecision(checkpoint.research_checkpoint_id, input)).research_checkpoint_decision_id, decision.research_checkpoint_decision_id);
  const decidedView = await service.getStageView('title_1', 'evidence_landscape', 'human');
  assert.match(decidedView.markdown, /近期检索仍局限于当前资料库/u);
  assert.match(decidedView.markdown, /近重复/u);
  assert.deepEqual((await service.getPacket(checkpoint.research_checkpoint_id)).packet_payload, packet.packet_payload);
});

test('legacy evidence replay preserves a superseded checkpoint and shows unrecorded literature limits without rewriting history', async () => {
  const input = {
    evidence_map: evidenceMap(),
    evidence_units: [evidenceUnit('support', 'support'), evidenceUnit('challenge', 'challenge'), evidenceUnit('baseline', 'baseline')],
    conflict_sets: [], coverage_row_intents: [], coverage_assessments: [],
  };
  const fixture = createService();
  const current = await fixture.service.materializeEvidenceLandscapeCheckpoint(input);
  const currentPacket = await fixture.service.getPacket(current.research_checkpoint_id);
  const { literature_coverage_limitations: _limitations, ...legacyPayload } = currentPacket.packet_payload;
  const { service } = createService();
  const legacy = await service.materializeCheckpoint({
    title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape', target_ref: current.target_ref,
    target_snapshot_hash: sha256Text(stableStringify(legacyPayload)),
    source_refs: current.source_refs, allowed_actions: current.allowed_actions,
    required_action_refs: current.required_action_refs, policy_version_id: current.policy_version_id,
    packet_payload: legacyPayload,
  });
  const decisionInput = advancingDecision(legacy.target_snapshot_hash);
  await service.recordDecision(legacy.research_checkpoint_id, decisionInput);
  const human = await service.getStageView('title_1', 'evidence_landscape', 'human');
  assert.match(human.markdown, /原审阅快照未记录近期文献覆盖验证/u);
  const historicalPacket = await service.getPacket(legacy.research_checkpoint_id);
  assert.equal('literature_coverage_limitations' in historicalPacket.packet_payload, false);
  const successor = await service.materializeEvidenceLandscapeCheckpoint({
    ...input, evidence_map: { ...input.evidence_map, evidence_map_id: 'evidence_map_successor', evidence_map_version: 'v2' },
  });
  const replay = await service.materializeEvidenceLandscapeCheckpoint(input);
  assert.equal(replay.research_checkpoint_id, legacy.research_checkpoint_id);
  assert.equal(replay.status, 'superseded');
  assert.deepEqual((await service.getPacket(legacy.research_checkpoint_id)).packet_payload, historicalPacket.packet_payload);
  assert.equal((await service.getStageManifest('title_1')).stages.find((stage) => stage.stage === 'evidence_landscape')?.authority_ref?.ref_id, successor.target_ref.ref_id);
  assert.equal((await service.listCheckpoints('title_1')).length, 2);
  assert.deepEqual((await service.getPacket(legacy.research_checkpoint_id)).decision, historicalPacket.decision);
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
    coverage_assessments: [],
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

test('gap projection omits mixed arena advice without changing human actions', async () => {
  const { service } = createService();
  const first = candidate('candidate_1', 'evaluation_gap', { outcome: 'calibration error' });
  const alternative = candidate('candidate_3', 'system_gap', { intervention: 'adaptive evidence routing' });
  first.current_arena_advisory = {
    schema_version: 'TopicSelectionNeedCandidateArenaAdvisory@v1',
    arena_session_id: 'arena_1',
    arena_synthesis_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'arena_synthesis_1',
      title_card_id: 'title_1',
    },
    arena_synthesis_hash: HASH_D,
    disposition: 'parked',
    rationale: 'More evidence is required before selection.',
    drop_reason_code: null,
    reopening_conditions: ['Add a direct signed-utility comparison.'],
    selected_against_candidate_ref: null,
    support_only: true,
  };

  const checkpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first, alternative],
  });
  const packet = await service.getPacket(checkpoint.research_checkpoint_id);

  assert.deepEqual(checkpoint.allowed_actions, ['advance', 'hold', 'loopback', 'reject']);
  assert.equal(packet.packet_payload.arena_advisory, null);
  assert.deepEqual(packet.packet_payload.arena_advisory_issue_codes, ['ARENA_ADVISORY_MIXED']);
});

test('gap projection admits only the checksum-valid current arena synthesis', async () => {
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const { controlPlane, service } = createService(undefined, arenaRepository);
  const first = candidate('candidate_1', 'evaluation_gap', { outcome: 'calibration error' });
  const alternative = candidate('candidate_3', 'system_gap', { intervention: 'adaptive evidence routing' });
  first.candidate_need = 'Uncertainty-conditioned signed-depth utility';
  alternative.candidate_need = 'Adaptive evidence routing after shallow retrieval';
  const candidateRefs = [first, alternative].map((item) => ({
    ref_type: 'need_candidate',
    ref_id: item.need_candidate_id,
    title_card_id: item.title_card_id,
    version_id: item.candidate_version,
  }));
  const candidateDispositions = candidateRefs.map((candidateRef, index) => ({
    candidate_ref: candidateRef,
    disposition: 'parked' as const,
    rationale: index === 0
      ? 'Direct signed-utility evidence is still missing.'
      : 'The alternative remains viable but does not yet dominate.',
    drop_reason_code: null,
    reopening_conditions: ['Add a direct signed-utility comparison.'],
    selected_against_candidate_ref: null,
    role_positions: [
      { participant_role: 'opportunity_scout' as const, recommended_disposition: 'parked' as const },
      { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: 'parked' as const },
    ],
  }));
  const riskFindingPayload = {
    schema_version: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
    summary: 'No direct evidence yet measures signed adjacent-depth utility.',
    evidence_refs: [{ ref_type: 'evidence_unit', ref_id: 'evidence_1', title_card_id: 'title_1' }],
  };
  const riskFinding = await controlPlane.recordArtifactRef({
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload: riskFindingPayload,
    checksum: sha256Text(stableStringify(riskFindingPayload)),
    mime_type: 'application/json',
    input_snapshot_id: 'arena_input_1',
    created_by: 'system',
  });
  const riskFindingRef = {
    ref_type: 'artifact_ref',
    ref_id: riskFinding.artifact_ref_id,
    title_card_id: 'title_1',
    version_id: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  };
  const advisorySynthesis = {
    schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1' as const,
    outcome: 'evidence_expansion_required' as const,
    summary: 'Current evidence cannot safely select either candidate.',
    candidate_dispositions: candidateDispositions,
    preserved_finding_ids: ['finding_1'],
    unresolved_dissent: ['The scout sees upside while the killer sees missing direct evidence.'],
    required_next_delta: 'evidence' as const,
    support_only: true as const,
  };
  const transcriptPayload = {
    schema_version: 'TopicSelectionResearchArenaLoopTranscript@v2',
    arena_session_id: 'arena_1',
    input_snapshot_id: 'arena_input_1',
    independent_first_pass: [],
    advisory_synthesis: advisorySynthesis,
    risk_finding_refs: [riskFindingRef],
    execution_accounting: {},
    support_only: true,
  };
  const transcriptHash = sha256Text(stableStringify(transcriptPayload));
  const transcript = await controlPlane.recordArtifactRef({
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload: transcriptPayload,
    checksum: transcriptHash,
    mime_type: 'application/json',
    input_snapshot_id: 'arena_input_1',
    created_by: 'system',
  });
  const transcriptRef = {
    ref_type: 'artifact_ref',
    ref_id: transcript.artifact_ref_id,
    title_card_id: 'title_1',
  };
  await arenaRepository.replaceCurrentSession({
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_1',
    session_key: 'arena-key-1',
    current_arena_key: 'title_1:gap_portfolio',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_1', title_card_id: 'title_1' },
    input_snapshot_id: 'arena_input_1',
    input_snapshot_hash: HASH_C,
    participant_plan_hash: HASH_B,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: { ref_type: 'artifact_ref', ref_id: 'execution_plan_1', title_card_id: 'title_1' },
    status: 'synthesized',
    termination_reason: 'evidence_expansion_required',
    loop_transcript_ref: transcriptRef,
    loop_transcript_hash: transcriptHash,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: NOW,
    superseded_at: null,
  });
  for (const [index, item] of [first, alternative].entries()) {
    const disposition = candidateDispositions[index]!;
    item.current_arena_advisory = {
      schema_version: 'TopicSelectionNeedCandidateArenaAdvisory@v1',
      arena_session_id: 'arena_1',
      arena_synthesis_ref: transcriptRef,
      arena_synthesis_hash: transcriptHash,
      disposition: disposition.disposition,
      rationale: disposition.rationale,
      drop_reason_code: disposition.drop_reason_code,
      reopening_conditions: disposition.reopening_conditions,
      selected_against_candidate_ref: disposition.selected_against_candidate_ref,
      support_only: true,
    };
  }

  const checkpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first, alternative],
  });
  const packet = await service.getPacket(checkpoint.research_checkpoint_id);

  assert.deepEqual(packet.packet_payload.arena_advisory_issue_codes, []);
  assert.deepEqual(packet.packet_payload.arena_advisory, {
    schema_version: 'TopicSelectionResearchGapArenaAdvisory@v1',
    arena_session_ref: {
      ref_type: 'research_arena_session',
      ref_id: 'arena_1',
      title_card_id: 'title_1',
      version_id: HASH_C,
    },
    arena_input_snapshot_ref: {
      ref_type: 'input_snapshot',
      ref_id: 'arena_input_1',
      title_card_id: 'title_1',
      version_id: HASH_C,
    },
    arena_synthesis_ref: transcriptRef,
    arena_synthesis_hash: transcriptHash,
    outcome: 'evidence_expansion_required',
    summary: advisorySynthesis.summary,
    candidate_dispositions: candidateDispositions,
    risk_finding_refs: [riskFindingRef],
    preserved_finding_ids: ['finding_1'],
    unresolved_dissent: advisorySynthesis.unresolved_dissent,
    required_next_delta: 'evidence',
    support_only: true,
  });
  assert.equal(
    checkpoint.source_refs.some((ref) => ref.ref_id === transcript.artifact_ref_id),
    true,
  );
  assert.equal(checkpoint.source_refs.some((ref) => ref.ref_id === riskFindingRef.ref_id), true);

  const human = await service.getStageView('title_1', 'research_gap', 'human');
  const llm = await service.getStageView('title_1', 'research_gap', 'llm');
  assert.match(human.markdown, /多视角评议建议：证据不足，补充证据后再判断/u);
  assert.match(human.markdown, /Uncertainty-conditioned signed-depth utility/u);
  assert.doesNotMatch(human.markdown, /candidate_1/u);
  assert.match(human.markdown, /Add a direct signed-utility comparison/u);
  assert.match(human.markdown, /No direct evidence yet measures signed adjacent-depth utility/u);
  assert.match(human.markdown, /The scout sees upside while the killer sees missing direct evidence/u);
  assert.deepEqual(llm.working_set.related_records.arena_advisory, packet.packet_payload.arena_advisory);
  assert.deepEqual(llm.working_set.related_records.arena_risk_findings, [riskFinding]);

  const currentSession = await arenaRepository.findCurrentSession('title_1', 'gap_portfolio');
  assert.ok(currentSession);
  await arenaRepository.replaceCurrentSession({
    ...currentSession,
    arena_session_id: 'arena_2',
    session_key: 'arena-key-2',
    input_snapshot_id: 'arena_input_2',
    input_snapshot_hash: HASH_D,
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    synthesized_at: null,
  });
  const staleCheckpoint = await service.materializeGapSelectionCheckpoint({
    title_card_id: 'title_1',
    evidence_map_ref: first.evidence_map_ref,
    candidates: [first, alternative],
  });
  const stalePacket = await service.getPacket(staleCheckpoint.research_checkpoint_id);
  assert.equal(stalePacket.packet_payload.arena_advisory, null);
  assert.deepEqual(stalePacket.packet_payload.arena_advisory_issue_codes, ['ARENA_ADVISORY_NOT_CURRENT']);
  assert.deepEqual(staleCheckpoint.allowed_actions, checkpoint.allowed_actions);
});

test('Arena advisory defer is an idempotent non-advancing human label', async () => {
  const { service } = createService();
  const { advisory, checkpoint } = await materializeSelectedArenaGap(service);
  const input = {
    idempotency_key: 'defer_once',
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'defer' as const,
    rationale: 'I need to inspect the nearest-work evidence before deciding.',
    human_gap_selection_review: null,
  };

  const first = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, input);
  const replay = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, input);
  const packet = await service.getPacket(checkpoint.research_checkpoint_id);

  assert.equal(first.review.response, 'defer');
  assert.deepEqual(first.review.reason_codes, ['REVIEW_DEFERRED']);
  assert.equal(first.review.human_gap_selection_review_hash, null);
  assert.equal(replay.review_ref.ref_id, first.review_ref.ref_id);
  assert.equal(packet.decision, null);
  assert.equal((await service.getCheckpoint(checkpoint.research_checkpoint_id)).status, 'pending');
  await assert.rejects(
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
      ...input,
      idempotency_key: 'accept_selected_without_human_review',
      response: 'accept',
    }),
    /requires the exact proposed human candidate review/u,
  );
  await assert.rejects(
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
      ...input,
      rationale: 'Changed content cannot reuse the same idempotency key.',
    }),
    (error: unknown) => error instanceof Error && error.message.includes('idempotency or binding content changed'),
  );
});

test('Arena advisory review history recovers a deferred label without advancing authority', async () => {
  const { service } = createService();
  const { advisory, checkpoint } = await materializeSelectedArenaGap(service);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'recover_defer_once',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'defer',
    rationale: 'I need to inspect the evidence first.',
    human_gap_selection_review: null,
  });

  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);

  assert.equal(history.checkpoint_currentness, 'current');
  assert.equal(history.gap_input_snapshot_id, checkpoint.input_snapshot_id);
  assert.deepEqual(history.reviews.map((item) => item.review_ref), [recorded.review_ref]);
  assert.deepEqual(history.reviews[0]?.advancement_binding, {
    status: 'proposed',
    human_confirmed_decision_ref: null,
  });
  assert.deepEqual(history.projection_issues, []);
  assert.deepEqual(history.reopen_signals, []);
  assert.match(history.history_hash, /^[a-f0-9]{64}$/u);
});

test('Arena advisory review history resolves the exact historical session binding for calibration', async () => {
  const { service } = createService();
  const { checkpoint } = await materializeSelectedArenaGap(service);

  const byCheckpoint = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  const bySession = await service.getArenaAdvisoryReviewHistoryForSession('title_1', 'arena_1');

  assert.deepEqual(bySession, byCheckpoint);
  assert.equal(await service.getArenaAdvisoryReviewHistoryForSession('title_1', 'arena_absent'), null);
});

test('Arena advisory review history orders multiple immutable labels deterministically', async () => {
  const { service } = createService();
  const { advisory, checkpoint } = await materializeSelectedArenaGap(service);
  const recordDefer = (idempotencyKey: string, rationale: string) => service.recordArenaAdvisoryReview(
    checkpoint.research_checkpoint_id,
    {
      idempotency_key: idempotencyKey,
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
      confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
      advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
      response: 'defer',
      rationale,
      human_gap_selection_review: null,
    },
  );
  const first = await recordDefer('multi_label_1', 'First pause for evidence review.');
  const second = await recordDefer('multi_label_2', 'Second pause after another reading pass.');

  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  const expectedIds = [first.review_ref.ref_id, second.review_ref.ref_id].sort();

  assert.deepEqual(history.reviews.map((item) => item.review_ref.ref_id), expectedIds);
  assert.deepEqual(await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id), history);
});

test('Arena advisory review history distinguishes proposed and confirmed candidate reopening after supersession', async () => {
  const { controlPlane, service } = createService();
  const { advisory, alternativeRef, checkpoint, firstRef, humanReview } =
    await materializeSelectedArenaGap(service);
  const overrideReview = {
    ...humanReview,
    selected_candidate_ref: alternativeRef,
    candidate_reviews: [
      {
        need_candidate_ref: firstRef,
        disposition: 'viable_alternative' as const,
        distinct_from_selected_axes: ['mechanism' as const],
        rationale: 'Keep the original recommendation as a fallback.',
      },
      {
        need_candidate_ref: alternativeRef,
        disposition: 'selected' as const,
        distinct_from_selected_axes: [],
        rationale: 'The parked mechanism is now preferred.',
      },
    ],
  };
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'recover_override_once',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'override',
    rationale: 'New evidence favors the parked candidate.',
    human_gap_selection_review: overrideReview,
    human_confirm_need_intent: humanConfirmNeedIntent(overrideReview),
  });

  const proposed = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  const proposedManifest = await service.getStageManifest('title_1');
  assert.deepEqual(proposed.reopen_signals.map((signal) => [signal.signal_type, signal.status]), [
    ['candidate_reopened', 'proposed'],
  ]);

  const validatedNeedRef = {
    ref_type: 'validated_need',
    ref_id: 'validated_need_1',
    title_card_id: 'title_1',
  };
  const humanDecision = await controlPlane.recordHumanDecision({
    title_card_id: 'title_1',
    target_ref: validatedNeedRef,
    decision_type: 'confirm',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    artifact_refs: [recorded.review_ref],
    resulting_authority_refs: [validatedNeedRef],
  });
  const confirmed = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  const confirmedManifest = await service.getStageManifest('title_1');
  assert.equal(confirmed.reviews[0]?.advancement_binding.status, 'confirmed');
  assert.equal(
    confirmed.reviews[0]?.advancement_binding.human_confirmed_decision_ref?.ref_id,
    humanDecision.human_confirmed_decision_id,
  );
  assert.equal(confirmed.reopen_signals[0]?.status, 'confirmed');
  assert.notEqual(confirmedManifest.manifest_hash, proposedManifest.manifest_hash);
  assert.equal(
    confirmedManifest.stages.find((stage) => stage.stage === 'research_gap')?.snapshot_hash,
    proposedManifest.stages.find((stage) => stage.stage === 'research_gap')?.snapshot_hash,
  );

  const packet = await service.getPacket(checkpoint.research_checkpoint_id);
  await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_2', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_D,
    source_refs: checkpoint.source_refs,
    allowed_actions: checkpoint.allowed_actions,
    packet_payload: packet.packet_payload,
  });
  const superseded = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  assert.equal(superseded.checkpoint_currentness, 'superseded');
  assert.deepEqual(await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id), superseded);
});

test('Arena advisory review history isolates corrupt and lookalike artifacts from valid labels', async () => {
  const { controlPlane, service } = createService();
  const { advisory, checkpoint } = await materializeSelectedArenaGap(service);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'valid_defer_for_issue_isolation',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'defer',
    rationale: 'Keep one valid review readable.',
    human_gap_selection_review: null,
  });
  const { created_at: _createdAt, ...payload } = recorded.review;
  await controlPlane.recordArtifactRef({
    stable_key: 'generic-lookalike',
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    payload,
    input_snapshot_id: checkpoint.input_snapshot_id,
    created_by: 'human',
  });
  await controlPlane.recordArtifactRef({
    stable_key: 'topic-selection-arena-advisory-review:corrupt',
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    payload,
    checksum: HASH_A,
    input_snapshot_id: checkpoint.input_snapshot_id,
    created_by: 'human',
  });
  await controlPlane.recordArtifactRef({
    stable_key: 'unrelated-generic-artifact',
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    payload: { schema_version: 'UnrelatedArtifact@v1' },
    input_snapshot_id: checkpoint.input_snapshot_id,
  });

  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);

  assert.deepEqual(history.reviews.map((item) => item.review_ref.ref_id), [recorded.review_ref.ref_id]);
  assert.deepEqual(history.projection_issues.map((issue) => issue.issue_code), [
    'LOOKALIKE_REVIEW_ARTIFACT',
    'INVALID_REVIEW_CHECKSUM',
  ]);
  assert.equal(history.reopen_signals.length, 0);
});

test('Arena advisory review history rejects historical binding and classification drift', async () => {
  const { controlPlane, service } = createService();
  const { advisory, checkpoint, humanReview } = await materializeSelectedArenaGap(service);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'valid_accept_for_drift_checks',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'accept',
    rationale: 'Keep one valid accepted review.',
    human_gap_selection_review: humanReview,
    human_confirm_need_intent: humanConfirmNeedIntent(humanReview),
  });
  const { created_at: _createdAt, ...basePayload } = recorded.review;
  const addDrifted = async (suffix: string, patch: Record<string, unknown>, createdBy: 'human' | 'llm' = 'human') => {
    const stableKey = `topic-selection-arena-advisory-review:drift-${suffix}`;
    await controlPlane.recordArtifactRef({
      stable_key: stableKey,
      title_card_id: 'title_1',
      artifact_kind: 'structured_output',
      payload: {
        ...basePayload,
        review_id: `topic_selection_research_arena_advisory_review_${sha256Text(stableStringify({ stable_key: stableKey }))}`,
        ...patch,
      },
      input_snapshot_id: checkpoint.input_snapshot_id,
      created_by: createdBy,
    });
  };
  await addDrifted('checkpoint', { research_checkpoint_id: 'checkpoint_other' });
  await addDrifted('title', { title_card_id: 'title_other' });
  await addDrifted('snapshot', { gap_input_snapshot_id: 'input_snapshot_other' });
  await addDrifted('candidate-pool', { confirmed_candidate_pool_hash: HASH_D });
  await addDrifted('advisory', { advisory_snapshot_hash: HASH_D });
  await addDrifted('review-hash', { human_gap_selection_review_hash: HASH_D });
  await addDrifted('classification', { reason_codes: ['REVIEW_DEFERRED'] });
  await addDrifted('identity', { review_id: 'review_identity_drifted' });
  await addDrifted('provenance', {}, 'llm');

  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);

  assert.equal(history.reviews.length, 1);
  const issueCounts = history.projection_issues.reduce<Record<string, number>>((counts, issue) => ({
    ...counts,
    [issue.issue_code]: (counts[issue.issue_code] ?? 0) + 1,
  }), {});
  assert.deepEqual(issueCounts, {
    INVALID_REVIEW_BINDING: 6,
    INVALID_REVIEW_CLASSIFICATION: 1,
    INVALID_REVIEW_PROVENANCE: 2,
  });
});

test('Arena review labels invalidate the research-gap manifest and appear in both stage views', async () => {
  const { service } = createService();
  const { advisory, checkpoint } = await materializeSelectedArenaGap(service);
  const before = await service.getStageManifest('title_1');
  const beforeGap = before.stages.find((stage) => stage.stage === 'research_gap');
  await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'manifest_visible_defer',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'defer',
    rationale: 'Read more before choosing.',
    human_gap_selection_review: null,
  });

  const after = await service.getStageManifest('title_1');
  const afterGap = after.stages.find((stage) => stage.stage === 'research_gap');
  assert.notEqual(after.manifest_hash, before.manifest_hash);
  assert.equal(afterGap?.snapshot_hash, beforeGap?.snapshot_hash);
  assert.equal(afterGap?.artifact_refs.length, (beforeGap?.artifact_refs.length ?? 0) + 1);

  const human = await service.getStageView('title_1', 'research_gap', 'human');
  const llm = await service.getStageView('title_1', 'research_gap', 'llm');
  assert.match(human.markdown, /暂缓决定/u);
  assert.match(human.markdown, /尚未形成正式推进决定/u);
  const histories = llm.working_set.related_records.arena_advisory_review_histories;
  assert.equal(Array.isArray(histories) ? histories.length : 0, 1);
});

test('Arena advisory review derives override from the exact human candidate choice', async () => {
  const { service } = createService();
  const { advisory, alternativeRef, checkpoint, firstRef, humanReview } =
    await materializeSelectedArenaGap(service);
  const overrideReview = {
    ...humanReview,
    selected_candidate_ref: alternativeRef,
    candidate_reviews: [
      {
        need_candidate_ref: firstRef,
        disposition: 'viable_alternative' as const,
        distinct_from_selected_axes: ['mechanism' as const],
        rationale: 'Keep the original recommendation as the fallback.',
      },
      {
        need_candidate_ref: alternativeRef,
        disposition: 'selected' as const,
        distinct_from_selected_axes: [],
        rationale: 'New feasibility evidence favors the parked candidate.',
      },
    ],
  };
  const base = {
    idempotency_key: 'override_parked_candidate',
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    rationale: 'New feasibility evidence changes the preferred active path.',
    human_gap_selection_review: overrideReview,
    human_confirm_need_intent: humanConfirmNeedIntent(overrideReview),
  };

  await assert.rejects(
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
      ...base,
      response: 'accept',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 422
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    ...base,
    response: 'override',
  });
  assert.deepEqual(recorded.review.reason_codes, [
    'SELECTED_PARKED_CANDIDATE',
    'NON_SELECTED_DISPOSITION_CHANGED',
  ]);
  assert.equal(recorded.review.selected_candidate_ref?.ref_id, alternativeRef.ref_id);
  assert.match(recorded.review.human_gap_selection_review_hash ?? '', /^[a-f0-9]{64}$/u);
});

test('advancing Arena advisory labels require and persist the complete HumanConfirmNeed intent', async () => {
  const { service } = createService();
  const { advisory, checkpoint, humanReview } = await materializeSelectedArenaGap(service);
  const base = {
    idempotency_key: 'intent_bound_accept',
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'accept' as const,
    rationale: 'The recommendation matches the reviewed candidate portfolio.',
    human_gap_selection_review: humanReview,
  };

  await assert.rejects(
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, base),
    /complete HumanConfirmNeed intent/u,
  );

  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    ...base,
    human_confirm_need_intent: {
      schema_version: 'TopicSelectionHumanConfirmNeedIntent@v1',
      adjudication_result_ref: {
        ref_type: 'validate_need_adjudication_result',
        ref_id: 'adjudication_1',
        title_card_id: 'title_1',
      },
      output_validated_need_ref: {
        ref_type: 'validated_need',
        ref_id: 'validated_need_1',
        title_card_id: 'title_1',
      },
      confirmation_input: {
        schema_version: 'HumanConfirmationInput@v1',
        actor_mode: 'human',
        accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
        rationale: 'Advance the selected candidate after reviewing the complete frozen portfolio.',
        accepted_risk_refs: [],
        required_check_results: [],
        delegated_executor: null,
        gap_selection_review: humanReview,
        arena_advisory_review_ref: null,
      },
    },
  });
  const persistedIntent = (recorded.review as unknown as {
    human_confirm_need_intent: { intent_hash: string; confirmation_input: { arena_advisory_review_ref: null } };
  }).human_confirm_need_intent;

  assert.match(persistedIntent.intent_hash, /^[a-f0-9]{64}$/u);
  assert.equal(persistedIntent.confirmation_input.arena_advisory_review_ref, null);
});

test('legacy advancing Arena review remains readable but cannot authorize without its intent', async () => {
  const { controlPlane, service } = createService();
  const { advisory, checkpoint, humanReview } = await materializeSelectedArenaGap(service);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'legacy_missing_intent',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'accept',
    rationale: 'The historical label predates mandatory intent binding.',
    human_gap_selection_review: humanReview,
    human_confirm_need_intent: humanConfirmNeedIntent(humanReview),
  });
  const submittedIntent = recorded.review.human_confirm_need_intent!;
  const artifact = await controlPlane.getArtifactRef(recorded.review_ref.ref_id);
  assert.ok(artifact?.payload);
  delete artifact.payload.human_confirm_need_intent;
  artifact.checksum = sha256Text(stableStringify(artifact.payload));

  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  assert.equal(history.reviews.length, 1);
  assert.equal(history.reviews[0]?.review.human_confirm_need_intent, undefined);
  await assert.rejects(
    () => service.assertGapArenaAdvisoryReviewBinding({
      checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: checkpoint.title_card_id,
      review_ref: recorded.review_ref,
      human_gap_selection_review: humanReview,
      accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
      human_confirm_need_intent: submittedIntent,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /requires the complete HumanConfirmNeed intent/u.test(error.message),
  );
});

test('advancing against a no-topic Arena recommendation is an explicit override', async () => {
  const { service } = createService();
  const { advisory, alternativeRef, firstRef, humanReview } = await materializeSelectedArenaGap(service);
  const noTopicAdvisory = {
    ...advisory,
    outcome: 'none_viable' as const,
    summary: 'Neither candidate currently clears the evidence bar.',
    candidate_dispositions: advisory.candidate_dispositions.map((disposition) => ({
      ...disposition,
      disposition: 'dropped' as const,
      drop_reason_code: 'no_viable_path_after_delta_expansion' as const,
      selected_against_candidate_ref: null,
      role_positions: disposition.role_positions.map((position) => ({
        ...position,
        recommended_disposition: 'dropped' as const,
      })),
    })),
  };
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_none', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_D,
    source_refs: [firstRef, alternativeRef],
    allowed_actions: ['advance', 'hold', 'loopback', 'reject'],
    packet_payload: {
      candidate_entries: [
        { need_candidate_ref: firstRef, semantic_group_key: 'group_selected', machine_viable: true },
        { need_candidate_ref: alternativeRef, semantic_group_key: 'group_parked', machine_viable: true },
      ],
      arena_advisory: noTopicAdvisory,
      arena_advisory_issue_codes: [],
    },
  });
  const advancingReview = {
    ...humanReview,
    research_checkpoint_id: checkpoint.research_checkpoint_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
  };
  const acceptedStop = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'accept_none_viable',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(noTopicAdvisory)),
    response: 'accept',
    rationale: 'I agree that this portfolio should not advance.',
    human_gap_selection_review: null,
  });
  assert.deepEqual(acceptedStop.review.reason_codes, ['AGREES_WITH_ARENA']);
  assert.equal(acceptedStop.review.selected_candidate_ref, null);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'advance_against_none_viable',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(noTopicAdvisory)),
    response: 'override',
    rationale: 'New feasibility evidence justifies one bounded human-selected attempt.',
    human_gap_selection_review: advancingReview,
    human_confirm_need_intent: humanConfirmNeedIntent(advancingReview),
  });
  assert.deepEqual(recorded.review.reason_codes, [
    'ADVANCE_AGAINST_NONE_VIABLE',
    'SELECTED_DROPPED_CANDIDATE',
    'NON_SELECTED_DISPOSITION_CHANGED',
  ]);
  const history = await service.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id);
  assert.deepEqual(history.reopen_signals.map((signal) => signal.signal_type), [
    'candidate_reopened',
    'advanced_against_stop',
  ]);
  assert.equal(history.reopen_signals.every((signal) => signal.status === 'proposed'), true);
});

test('Arena advisory review binding rejects changed, cross-title, and superseded content', async () => {
  const { controlPlane, service } = createService();
  const { advisory, alternativeRef, checkpoint, firstRef, humanReview } =
    await materializeSelectedArenaGap(service);
  const recorded = await service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
    idempotency_key: 'accept_current_review',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'accept',
    rationale: 'The recommendation matches my candidate review.',
    human_gap_selection_review: humanReview,
    human_confirm_need_intent: humanConfirmNeedIntent(humanReview),
  });
  const bound = await service.assertGapArenaAdvisoryReviewBinding({
    checkpoint_id: checkpoint.research_checkpoint_id,
    title_card_id: 'title_1',
    review_ref: recorded.review_ref,
    human_gap_selection_review: humanReview,
    accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
    human_confirm_need_intent: recorded.review.human_confirm_need_intent!,
  });
  assert.equal(bound?.review_id, recorded.review.review_id);

  const { created_at: _createdAt, ...copiedReviewPayload } = recorded.review;
  const genericArtifact = await controlPlane.recordArtifactRef({
    stable_key: 'generic-caller-artifact',
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    payload: copiedReviewPayload,
    input_snapshot_id: checkpoint.input_snapshot_id,
    created_by: 'human',
  });
  await assert.rejects(
    service.assertGapArenaAdvisoryReviewBinding({
      checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: 'title_1',
      review_ref: { ...recorded.review_ref, ref_id: genericArtifact.artifact_ref_id },
      human_gap_selection_review: humanReview,
      accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
      human_confirm_need_intent: recorded.review.human_confirm_need_intent!,
    }),
    /not a dedicated human Arena advisory review/u,
  );

  await assert.rejects(
    service.assertGapArenaAdvisoryReviewBinding({
      checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: 'title_1',
      review_ref: { ...recorded.review_ref, title_card_id: 'title_other' },
      human_gap_selection_review: humanReview,
      accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
      human_confirm_need_intent: recorded.review.human_confirm_need_intent!,
    }),
    /wrong type, version, or title card/u,
  );
  await assert.rejects(
    service.assertGapArenaAdvisoryReviewBinding({
      checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: 'title_1',
      review_ref: recorded.review_ref,
      human_gap_selection_review: humanReview,
      accountable_human_ref: { actor_type: 'hybrid', actor_id: 'researcher_1' },
      human_confirm_need_intent: recorded.review.human_confirm_need_intent!,
    }),
    /same accountable human actor/u,
  );
  await assert.rejects(
    service.assertGapArenaAdvisoryReviewBinding({
      checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: 'title_1',
      review_ref: recorded.review_ref,
      human_gap_selection_review: {
        ...humanReview,
        selected_candidate_ref: alternativeRef,
        candidate_reviews: [
          {
            need_candidate_ref: firstRef,
            disposition: 'viable_alternative',
            distinct_from_selected_axes: ['mechanism'],
            rationale: 'Changed after the label was written.',
          },
          {
            need_candidate_ref: alternativeRef,
            disposition: 'selected',
            distinct_from_selected_axes: [],
            rationale: 'Changed after the label was written.',
          },
        ],
      },
      accountable_human_ref: { actor_type: 'human', actor_id: 'researcher_1' },
      human_confirm_need_intent: recorded.review.human_confirm_need_intent!,
    }),
    /binding content changed/u,
  );

  await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_2', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_D,
    source_refs: [firstRef, alternativeRef],
    allowed_actions: ['hold', 'loopback'],
    packet_payload: {
      candidate_entries: [],
      arena_advisory: null,
      arena_advisory_issue_codes: ['ARENA_ADVISORY_NOT_CURRENT'],
    },
  });
  await assert.rejects(
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, {
      idempotency_key: 'stale_review_attempt',
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
      confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
      advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
      response: 'accept',
      rationale: 'A superseded checkpoint cannot receive a new label.',
      human_gap_selection_review: humanReview,
    }),
    /not current/u,
  );
});

test('concurrent exact Arena advisory review submissions converge on one artifact', async () => {
  let sequence = 0;
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 7, 30, 0, 0, 0, tick++)).toISOString();
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now },
  );
  const service = new TopicSelectionResearchCheckpointService(
    new InMemoryTopicSelectionResearchCheckpointRepository(),
    controlPlane,
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now },
  );
  const { advisory, checkpoint, humanReview } = await materializeSelectedArenaGap(service);
  const input = {
    idempotency_key: 'concurrent_exact_review',
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'accept' as const,
    rationale: 'Exact concurrent retries must converge.',
    human_gap_selection_review: humanReview,
    human_confirm_need_intent: humanConfirmNeedIntent(humanReview),
  };
  const [left, right] = await Promise.all([
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, input),
    service.recordArenaAdvisoryReview(checkpoint.research_checkpoint_id, input),
  ]);
  assert.equal(left.review_ref.ref_id, right.review_ref.ref_id);
  assert.equal(left.review.review_id, right.review.review_id);
  assert.equal(left.review.created_at, right.review.created_at);
});

test('promotion checkpoint requires the complete chain and maps every advancement risk before bridge eligibility', async () => {
  const { service } = createService();
  const promotionInputRef = {
    ref_type: 'promotion_input_snapshot',
    ref_id: 'promotion_input_1',
    title_card_id: 'title_1',
    version_id: HASH_D,
  };
  const questionContractRef = {
    ref_type: 'topic_question_contract',
    ref_id: 'question_contract_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const findingRef = {
    ref_type: 'topic_value_assessment',
    ref_id: 'value_assessment_1',
    title_card_id: 'title_1',
  };
  const basePromotionInput = {
    title_card_id: 'title_1',
    promotion_input_snapshot_ref: promotionInputRef,
    promotion_input_snapshot_hash: HASH_D,
    topic_question_contract_ref: questionContractRef,
    source_refs: [findingRef],
    gate_ready: true,
    accepted_risk_refs: [],
    required_actions: [],
    pass_with_risk_findings: [{
      finding_id: 'value_assessment_pass_with_risk',
      summary: 'Originality remains exposed to a direct-neighbor result.',
      refs: [findingRef],
    }],
    critic_findings: [],
    proposed_condition_actions: [],
  };

  const blocked = await service.materializePromotionCheckpoint(basePromotionInput);
  assert.equal(blocked.allowed_actions.includes('advance'), false);
  const blockedPacket = await service.getPacket(blocked.research_checkpoint_id);
  assert.deepEqual(
    (blockedPacket.packet_payload.policy_issue_codes as string[]).sort(),
    ['CHECKPOINT_CHAIN_INCOMPLETE', 'UNMAPPED_PASS_WITH_RISK_FINDING'],
  );

  const evidence = await materialize(service);
  await service.recordDecision(evidence.research_checkpoint_id, advancingDecision());
  const gap = await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_1', title_card_id: 'title_1' },
    target_snapshot_hash: HASH_B,
    source_refs: [evidence.target_ref],
    allowed_actions: ['advance', 'loopback'],
  });
  await service.adaptExistingStageDecision(gap.research_checkpoint_id, {
    decision_authority_ref: {
      ref_type: 'human_confirmed_decision',
      ref_id: 'gap_human_decision_1',
      title_card_id: 'title_1',
    },
    confirmed_snapshot_hash: HASH_B,
  });
  const question = await service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'question_contract',
    target_ref: questionContractRef,
    target_snapshot_hash: HASH_C,
    source_refs: [gap.target_ref],
    allowed_actions: ['advance', 'loopback'],
  });
  await service.recordDecision(
    question.research_checkpoint_id,
    questionDecision(HASH_C, 'question_decision_for_promotion'),
  );

  const unmapped = await service.materializePromotionCheckpoint(basePromotionInput);
  const unmappedPacket = await service.getPacket(unmapped.research_checkpoint_id);
  assert.deepEqual(
    unmappedPacket.packet_payload.policy_issue_codes,
    ['UNMAPPED_PASS_WITH_RISK_FINDING'],
  );

  const criticWithoutEvidence = await service.materializePromotionCheckpoint({
    ...basePromotionInput,
    proposed_condition_actions: [{
      action_code: 'verify_direct_neighbor_novelty',
      refs: [findingRef],
    }],
    critic_findings: [{
      finding_id: 'critic_finding_1',
      summary: 'The repair needs source-bound evidence.',
      resolution_status: 'accepted_and_repaired',
      mapping_refs: [],
    }],
  });
  const criticPacket = await service.getPacket(criticWithoutEvidence.research_checkpoint_id);
  assert.deepEqual(
    criticPacket.packet_payload.policy_issue_codes,
    ['UNRESOLVED_INDEPENDENT_CRITIC_FINDING'],
  );

  const qualified = await service.materializePromotionCheckpoint({
    ...basePromotionInput,
    proposed_condition_actions: [{
      action_code: 'verify_direct_neighbor_novelty',
      refs: [findingRef],
    }],
    critic_findings: [{
      finding_id: 'critic_finding_1',
      summary: 'The repair is bound to the inspected value evidence.',
      resolution_status: 'accepted_and_repaired',
      mapping_refs: [findingRef],
    }],
  });
  assert.equal(qualified.allowed_actions.includes('advance'), true);
  await service.adaptExistingStageDecision(qualified.research_checkpoint_id, {
    decision_authority_ref: {
      ref_type: 'human_promotion_decision',
      ref_id: 'human_promotion_decision_1',
      title_card_id: 'title_1',
    },
    confirmed_snapshot_hash: HASH_D,
  });
  await service.assertCompleteCheckpointChain({
    title_card_id: 'title_1',
    promotion_input_snapshot_ref: promotionInputRef,
    promotion_input_snapshot_hash: HASH_D,
  });

  const revisedEvidence = await materialize(service, HASH_D);
  await service.recordDecision(revisedEvidence.research_checkpoint_id, {
    ...advancingDecision(HASH_D),
    decision_key: 'revised_evidence_decision',
  });
  await assert.rejects(
    service.assertCompleteCheckpointChain({
      title_card_id: 'title_1',
      promotion_input_snapshot_ref: promotionInputRef,
      promotion_input_snapshot_hash: HASH_D,
    }),
    /stale upstream checkpoint lineage/u,
  );
});
