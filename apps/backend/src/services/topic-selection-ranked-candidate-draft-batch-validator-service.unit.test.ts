import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { TopicSelectionRankedCandidateDraftBatchValidatorService } from './topic-selection-ranked-candidate-draft-batch-validator-service.js';

const validator = new TopicSelectionRankedCandidateDraftBatchValidatorService({
  now: () => '2026-05-19T00:00:00.000Z',
});

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function nodeInput(): TopicSelectionGenerateNeedCandidateNodeInput {
  return {
    schema_version: 'v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
    resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
    candidate_pool_projection_ref: null,
    search_snapshot_refs: [ref('search_run', 'search_run_001')],
    resource_snapshot_refs: [ref('literature_snapshot', 'literature_snapshot_001')],
    exploration_context_ref: {
      ...ref('artifact_ref', 'exploration_context_001'),
      ref_type: 'artifact_ref',
    },
    arbiter_context_ref: {
      ...ref('artifact_ref', 'arbiter_context_001'),
      ref_type: 'artifact_ref',
    },
    execution_mode: 'mocked_llm',
    profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
    policy_version: 'v1',
    operator_reuse_approval_ref: null,
  };
}

function rankedBatch(): TopicSelectionRankedCandidateDraftBatch {
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      ranking_rationale: 'Grounded in evidence and ranked by expected research value.',
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
          baseline_unit_refs: [],
          context_unit_refs: [],
        },
        conflict_refs: [ref('evidence_conflict', 'conflict_001')],
        strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
        accepted_risk_refs: [],
        gap_codes: ['risk_evaluation_gap'],
        speculative: false,
        confidence: 0.82,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

test('ranked candidate draft batch validator accepts a grounded finalize batch', () => {
  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: rankedBatch(),
    max_persisted_candidates: 5,
  });

  assert.equal(report.valid, true);
  assert.equal(report.checked_at, '2026-05-19T00:00:00.000Z');
  assert.equal(report.draft_count, 1);
  assert.match(report.batch_payload_hash, /^sha256:/);
  assert.deepEqual(report.blocking_reason_codes, []);
  assert.equal(report.issue_count, 0);
});

test('ranked candidate draft batch validator blocks semantic drift before admission gates', () => {
  const invalidBatch = rankedBatch();
  invalidBatch.schema_version = 'v2';
  invalidBatch.draft_batch.node_attempt_id = 'node_attempt_other';
  invalidBatch.draft_batch.max_persisted_candidates = 6;
  const ungroundedDraft = {
    ...invalidBatch.drafts[0],
    evidence_role_bundle: {
      support_unit_refs: [],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
    },
    strength_assessment_refs: [],
    gap_codes: [],
    confidence: 1.2,
  };
  invalidBatch.drafts = [
    ungroundedDraft,
    {
      ...ungroundedDraft,
      rank: 1,
    },
  ];

  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: invalidBatch,
    max_persisted_candidates: 5,
  });
  const issueCodes = report.issues.map((issue) => issue.issue_code);

  assert.equal(report.valid, false);
  assert.equal(report.blocking_reason_codes[0], 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH');
  assert.ok(issueCodes.includes('SCHEMA_VERSION_MISMATCH'));
  assert.ok(issueCodes.includes('NODE_ATTEMPT_MISMATCH'));
  assert.ok(issueCodes.includes('TOO_MANY_NEED_CANDIDATES'));
  assert.ok(issueCodes.includes('DUPLICATE_DRAFT_ID'));
  assert.ok(issueCodes.includes('DUPLICATE_DRAFT_RANK'));
  assert.ok(issueCodes.includes('DRAFT_MISSING_EVIDENCE_REFS'));
  assert.ok(issueCodes.includes('DRAFT_MISSING_STRENGTH_REFS'));
  assert.ok(issueCodes.includes('DRAFT_WITHOUT_GAP_CODE'));
  assert.ok(issueCodes.includes('INVALID_DRAFT_CONFIDENCE'));
  assert.ok(issueCodes.includes('NO_GROUNDED_NEED_CANDIDATE'));
});

test('ranked candidate draft batch validator allows explained empty blocked batches', () => {
  const blockedBatch = rankedBatch();
  blockedBatch.draft_batch.terminal_result = 'blocked';
  blockedBatch.drafts = [];
  blockedBatch.unresolved_points = [
    {
      unresolved_point_id: 'unresolved_001',
      reason_code: 'missing_grounding',
      summary: 'No grounded candidate can be proposed from current evidence.',
      routed_to: 'blocked',
      refs: [ref('evidence_map', 'evidence_map_001')],
    },
  ];

  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: blockedBatch,
    max_persisted_candidates: 5,
  });

  assert.equal(report.valid, true);
  assert.equal(report.draft_count, 0);
  assert.deepEqual(report.blocking_reason_codes, []);
});

test('ranked candidate draft batch validator accepts an evidence-backed none-viable portfolio', () => {
  const noneViableBatch = Object.assign(rankedBatch(), {
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'Every inspected framing collides with direct prior art.',
      confidence: 0.88,
      evidence_refs: [ref('evidence_unit', 'challenge_001')],
      rejection_reasons: [
        {
          reason_code: 'near_isomorphic_prior_art',
          summary: 'The remaining contribution differs only in wording.',
          evidence_refs: [ref('evidence_unit', 'challenge_001')],
        },
      ],
      reopening_conditions: ['A new mechanism-level distinction is supported by claim-bearing evidence.'],
      candidate_dispositions: [],
    },
  }) as TopicSelectionRankedCandidateDraftBatch;
  noneViableBatch.drafts = [];
  noneViableBatch.rejected_framings = [
    {
      framing_id: 'framing_001',
      reason_code: 'near_isomorphic_prior_art',
      summary: 'The inspected framing does not establish a contribution difference.',
      refs: [ref('evidence_unit', 'challenge_001')],
    },
  ];

  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: noneViableBatch,
    max_persisted_candidates: 5,
  });

  assert.equal(report.valid, true);
  assert.equal(report.draft_count, 0);
  assert.deepEqual(report.blocking_reason_codes, []);
});

test('ranked candidate draft batch validator accepts exactly one selected candidate with complete coverage', () => {
  const selectedBatch = rankedBatch();
  selectedBatch.portfolio_disposition = {
    outcome: 'selected',
    rationale: 'The selected framing has the strongest evidence-backed mechanism gap.',
    confidence: 0.82,
    evidence_refs: [ref('evidence_unit', 'support_001')],
    rejection_reasons: [],
    reopening_conditions: [],
    candidate_dispositions: [
      {
        candidate_key: 'draft_001',
        disposition: 'selected',
        rationale: 'The draft remains viable under direct challenge evidence.',
        evidence_refs: [ref('evidence_unit', 'support_001')],
        drop_reason_code: null,
        reopening_conditions: [],
      },
    ],
  };

  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: selectedBatch,
    max_persisted_candidates: 5,
  });

  assert.equal(report.valid, true);
  assert.equal(report.portfolio_outcome, 'selected');
});

test('ranked candidate draft batch validator rejects ungrounded drop and park dispositions', () => {
  const invalidBatch = rankedBatch();
  invalidBatch.draft_batch.terminal_result = 'blocked';
  invalidBatch.portfolio_disposition = {
    outcome: 'evidence_expansion_required',
    rationale: 'The current evidence does not distinguish the remaining framing.',
    confidence: 0.61,
    evidence_refs: [ref('evidence_unit', 'challenge_001')],
    rejection_reasons: [
      {
        reason_code: 'evidence_coverage_insufficient',
        summary: 'The mechanism is not yet identifiable.',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
      },
    ],
    reopening_conditions: ['Retrieve evidence that makes the mechanism falsifiable.'],
    candidate_dispositions: [
      {
        candidate_key: 'draft_001',
        disposition: 'dropped',
        rationale: 'The current framing is not falsifiable.',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
        drop_reason_code: null,
        reopening_conditions: [],
      },
      {
        candidate_key: 'draft_001',
        disposition: 'parked',
        rationale: 'Wait for discriminating evidence.',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
        reopening_conditions: [],
      },
    ],
  };

  const report = validator.validate({
    node_input: nodeInput(),
    ranked_candidate_draft_batch: invalidBatch,
    max_persisted_candidates: 5,
  });
  const issueCodes = report.issues.map((issue) => issue.issue_code);

  assert.equal(report.valid, false);
  assert.ok(issueCodes.includes('DROPPED_CANDIDATE_REASON_CODE_REQUIRED'));
  assert.ok(issueCodes.includes('PARKED_CANDIDATE_REOPENING_CONDITION_REQUIRED'));
  assert.ok(issueCodes.includes('DUPLICATE_CANDIDATE_DISPOSITION_KEY'));
  assert.ok(issueCodes.includes('PORTFOLIO_DISPOSITION_REQUIRES_FINALIZE_TERMINAL_RESULT'));
});
