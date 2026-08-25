import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionCandidateDraftAdmissionReport,
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionPersistNeedCandidateBatchService } from './topic-selection-persist-need-candidate-batch-service.js';

function ref(refType: string, refId: string, versionId?: string | null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId ?? null,
    title_card_id: 'title_card_001',
  };
}

function artifactRef(refId: string): TopicSelectionFunctionalRef & { ref_type: 'artifact_ref' } {
  return {
    ...ref('artifact_ref', refId),
    ref_type: 'artifact_ref',
  };
}

function nodeInput(nodeAttemptId = 'node_attempt_001'): TopicSelectionGenerateNeedCandidateNodeInput {
  return {
    schema_version: 'v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: nodeAttemptId,
    topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
    resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
    candidate_pool_projection_ref: null,
    search_snapshot_refs: [ref('search_run', 'search_run_001')],
    resource_snapshot_refs: [ref('literature_snapshot', 'literature_snapshot_001')],
    exploration_context_ref: artifactRef('exploration_context_001'),
    arbiter_context_ref: artifactRef('arbiter_context_001'),
    execution_mode: 'mocked_llm',
    profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
    policy_version: 'v1',
    operator_reuse_approval_ref: null,
  };
}

function rankedBatch(nodeAttemptId = 'node_attempt_001'): TopicSelectionRankedCandidateDraftBatch {
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: `draft_batch_${nodeAttemptId}`,
      node_attempt_id: nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale: 'Two grounded drafts ranked by specificity.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: 'draft_001',
        rank: 1,
        candidate_need: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
        unmet_need_statement: 'Existing studies do not isolate retrieval-risk effects during fine-tuning.',
        mechanism_type: 'evaluation_gap',
        mechanism_summary: 'Risk-aware evaluation gap.',
        mechanism_payload: { axis: 'retrieval-risk' },
        scope_notes: 'CS literature workflow only.',
        non_goal_notes: null,
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: [ref('evidence_unit', 'support_001')],
          challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
          baseline_unit_refs: [ref('evidence_unit', 'baseline_001')],
          context_unit_refs: [],
        },
        conflict_refs: [ref('evidence_conflict', 'conflict_001')],
        strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
        accepted_risk_refs: [],
        gap_codes: ['risk_evaluation_gap'],
        speculative: false,
        confidence: 0.82,
      },
      {
        draft_id: 'draft_002',
        rank: 2,
        candidate_need: 'Need a benchmark protocol for retrieval-risk transfer.',
        unmet_need_statement: 'Current benchmarks do not compare transfer behavior after fine-tuning.',
        mechanism_type: 'evaluation_gap',
        mechanism_summary: 'Benchmark protocol gap.',
        mechanism_payload: { axis: 'transfer' },
        scope_notes: 'Benchmark design only.',
        non_goal_notes: null,
        prior_art_status: 'no_strong_solution_found',
        evidence_role_bundle: {
          support_unit_refs: [ref('evidence_unit', 'support_002')],
          challenge_unit_refs: [ref('evidence_unit', 'challenge_002')],
          baseline_unit_refs: [ref('evidence_unit', 'baseline_001')],
          context_unit_refs: [],
        },
        conflict_refs: [],
        strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
        accepted_risk_refs: [],
        gap_codes: ['benchmark_gap'],
        speculative: false,
        confidence: 0.76,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function admissionReport(
  batch = rankedBatch(),
  decisions: Array<'admit' | 'reject_artifact_only'> = ['admit', 'admit'],
): TopicSelectionCandidateDraftAdmissionReport {
  return {
    schema_version: 'v1',
    batch_id: batch.draft_batch.batch_id,
    node_attempt_id: batch.draft_batch.node_attempt_id,
    terminal_result: 'finalize',
    draft_results: batch.drafts.map((draft, index) => ({
      draft_id: draft.draft_id,
      rank: draft.rank,
      decision: decisions[index] ?? 'reject_artifact_only',
      reason_codes: decisions[index] === 'admit' ? ['grounded'] : ['PSEUDO_GAP_ONLY'],
      blocking_reason_codes: [],
      resolved_ref_counts: {
        support: draft.evidence_role_bundle.support_unit_refs.length,
        challenge: draft.evidence_role_bundle.challenge_unit_refs.length,
        baseline: draft.evidence_role_bundle.baseline_unit_refs.length,
        context: draft.evidence_role_bundle.context_unit_refs.length,
      },
      normalized_candidate_key: normalizedKey(draft.candidate_need, draft.unmet_need_statement),
      duplicate_candidate_refs: [],
      required_human_review_points: [],
      supplemental_questions: [],
      admitted_draft_ref: decisions[index] === 'admit' ? ref('candidate_draft', draft.draft_id) : null,
      merge_target_ref: null,
    })),
    valid_draft_count: decisions.filter((decision) => decision === 'admit').length,
    rejected_draft_count: decisions.filter((decision) => decision !== 'admit').length,
    merge_hint_count: 0,
    blocking_reason_codes: [],
  };
}

function normalizedKey(candidateNeed: string, unmetNeedStatement: string): string {
  return `${candidateNeed} ${unmetNeedStatement}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function makeService() {
  const repository = new InMemoryTopicSelectionNeedValidationRepository();
  const service = new TopicSelectionPersistNeedCandidateBatchService(repository, {
    now: () => '2026-05-19T00:00:00.000Z',
  });
  return { repository, service };
}

function persistInput(command: ReturnType<TopicSelectionPersistNeedCandidateBatchService['buildCommand']>) {
  return {
    command,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001'),
    literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_001'),
    persist_command_artifact_ref: artifactRef('persist_command_001'),
    created_by: 'system' as const,
  };
}

test('batch persistence cannot bypass a pending evidence checkpoint', async () => {
  const repository = new InMemoryTopicSelectionNeedValidationRepository();
  const service = new TopicSelectionPersistNeedCandidateBatchService(repository, {
    checkpointGuard: {
      async assertTransitionAllowed() {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Current evidence checkpoint has not advanced.');
      },
    },
  });
  const command = service.buildCommand({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: rankedBatch(),
    admission_report: admissionReport(),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
    admission_report_artifact_ref: artifactRef('admission_001'),
    supplemental_routing_artifact_refs: [],
  });

  await assert.rejects(service.persistBatch(persistInput(command)), /has not advanced/u);
  assert.equal(await repository.findNeedCandidateById('need_candidate_missing'), null);
});

test('persist need candidate batch command contains admitted drafts only and stable idempotency', () => {
  const { service } = makeService();
  const batch = rankedBatch();
  const first = service.buildCommand({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: batch,
    admission_report: admissionReport(batch, ['admit', 'reject_artifact_only']),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
    admission_report_artifact_ref: artifactRef('admission_report_001'),
    supplemental_routing_artifact_refs: [artifactRef('routing_001')],
  });
  const second = service.buildCommand({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: batch,
    admission_report: admissionReport(batch, ['admit', 'reject_artifact_only']),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
    admission_report_artifact_ref: artifactRef('admission_report_001'),
    supplemental_routing_artifact_refs: [artifactRef('routing_001')],
  });

  assert.equal(first.admitted_drafts.length, 1);
  assert.equal(first.admitted_drafts[0]?.draft_id, 'draft_001');
  assert.equal(first.admitted_drafts[0]?.source_admission_decision_ref.ref_type, 'candidate_draft_admission_result');
  assert.equal(first.idempotency_key, second.idempotency_key);
  assert.equal(first.ranked_candidate_draft_batch_artifact_ref.ref_type, 'artifact_ref');
});

test('persist need candidate batch writes admitted candidates idempotently', async () => {
  const { repository, service } = makeService();
  const batch = rankedBatch();
  const command = service.buildCommand({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: batch,
    admission_report: admissionReport(batch),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
    admission_report_artifact_ref: artifactRef('admission_report_001'),
    supplemental_routing_artifact_refs: [artifactRef('routing_001')],
  });

  const first = await service.persistBatch(persistInput(command));
  const replay = await service.persistBatch(persistInput(command));
  const stored = await repository.listNeedCandidatesByTitleCardId('title_card_001');

  assert.equal(first.persisted_candidate_refs.length, 2);
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.persisted_candidate_refs, first.persisted_candidate_refs);
  assert.equal(stored.length, 2);
  assert.equal(first.persisted_candidates[0]?.artifact_refs.some((item) => item.ref_id === 'persist_command_001'), true);
  assert.equal(first.candidate_pool_projection_ref.ref_type, 'candidate_pool_projection');
  assert.equal(first.candidate_pool_projection_hash.startsWith('sha256:'), true);
});

test('persist need candidate batch rejects duplicate normalized keys before writing', async () => {
  const { repository, service } = makeService();
  const firstBatch = rankedBatch('node_attempt_001');
  const firstCommand = service.buildCommand({
    node_input: nodeInput('node_attempt_001'),
    ranked_candidate_draft_batch: firstBatch,
    admission_report: admissionReport(firstBatch, ['admit', 'reject_artifact_only']),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
    admission_report_artifact_ref: artifactRef('admission_report_001'),
    supplemental_routing_artifact_refs: [artifactRef('routing_001')],
  });
  await service.persistBatch(persistInput(firstCommand));

  const duplicateBatch = rankedBatch('node_attempt_002');
  const duplicateCommand = service.buildCommand({
    node_input: nodeInput('node_attempt_002'),
    ranked_candidate_draft_batch: duplicateBatch,
    admission_report: admissionReport(duplicateBatch, ['admit', 'reject_artifact_only']),
    ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_002'),
    admission_report_artifact_ref: artifactRef('admission_report_002'),
    supplemental_routing_artifact_refs: [artifactRef('routing_002')],
  });

  await assert.rejects(
    () => service.persistBatch(persistInput(duplicateCommand)),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'VERSION_CONFLICT'
      && error.details?.reason_code === 'DUPLICATE_NEED_CANDIDATE',
  );
  const stored = await repository.listNeedCandidatesByTitleCardId('title_card_001');
  assert.equal(stored.length, 1);
});

test('persist need candidate batch refuses commands with zero admitted drafts', () => {
  const { service } = makeService();
  const batch = rankedBatch();

  assert.throws(
    () => service.buildCommand({
      node_input: nodeInput(),
      ranked_candidate_draft_batch: batch,
      admission_report: admissionReport(batch, ['reject_artifact_only', 'reject_artifact_only']),
      ranked_candidate_draft_batch_artifact_ref: artifactRef('ranked_batch_001'),
      admission_report_artifact_ref: artifactRef('admission_report_001'),
      supplemental_routing_artifact_refs: [artifactRef('routing_001')],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.details?.reason_code === 'NO_ADMITTED_DRAFTS',
  );
});

test('in-memory need validation repository batch create is all-or-none', async () => {
  const repository = new InMemoryTopicSelectionNeedValidationRepository();
  const first = candidateRecord('need_candidate_001', 'candidate-version-001');
  const duplicateVersion = candidateRecord('need_candidate_002', 'candidate-version-001');

  await assert.rejects(
    () => repository.createNeedCandidatesBatch([first, duplicateVersion]),
    /Duplicate NeedCandidate batch versions/,
  );
  assert.equal((await repository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

function candidateRecord(id: string, candidateVersion: string): TopicSelectionNeedCandidateRecord {
  return {
    need_candidate_id: id,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    evidence_map_id: 'evidence_map_001',
    candidate_version: candidateVersion,
    lifecycle_status: 'hypothesis',
    decision_status: 'hypothesis',
    review_status: 'machine_checked',
    freshness_status: 'current',
    candidate_need: `Need ${id}`,
    unmet_need_statement: `Need ${id}`,
    mechanism_type: 'evaluation_gap',
    mechanism_summary: null,
    mechanism_payload: {},
    scope_notes: null,
    non_goal_notes: null,
    prior_art_status: 'unknown',
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001'),
    literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_001'),
    evidence_role_bundle: {
      support_unit_refs: [ref('evidence_unit', 'support_001')],
      challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
      baseline_unit_refs: [],
      context_unit_refs: [],
    },
    conflict_refs: [],
    strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
    open_recheck_request_refs: [],
    unresolved_challenge_refs: [],
    accepted_risk_refs: [],
    gap_codes: ['test_gap'],
    speculative: false,
    confidence: 0.5,
    input_snapshot_id: null,
    workflow_run_id: 'workflow_run_001',
    gate_result_id: null,
    transition_attempt_id: null,
    trace_snapshot_id: null,
    artifact_refs: [],
    result_adjudication_id: null,
    result_validated_need_id: null,
    merged_into_need_candidate_ref: null,
    created_by: 'system',
    created_at: '2026-05-19T00:00:00.000Z',
    updated_at: '2026-05-19T00:00:00.000Z',
  };
}
