import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionCandidateDraftAdmissionDecision,
  TopicSelectionCandidateDraftAdmissionReport,
  TopicSelectionCandidateDraftAdmissionResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionSupplementalRoundRoutingService } from './topic-selection-supplemental-round-routing-service.js';

const routing = new TopicSelectionSupplementalRoundRoutingService();

function report(
  draftResults: TopicSelectionCandidateDraftAdmissionResult[],
  blockingReasonCodes: string[] = [],
): TopicSelectionCandidateDraftAdmissionReport {
  return {
    schema_version: 'v1',
    batch_id: 'draft_batch_001',
    node_attempt_id: 'node_attempt_001',
    terminal_result: 'finalize',
    draft_results: draftResults,
    valid_draft_count: draftResults.filter((result) => result.decision === 'admit').length,
    rejected_draft_count: draftResults.filter((result) =>
      result.decision === 'reject_artifact_only'
      || result.decision === 'require_human_review'
      || result.decision === 'return_for_supplemental_round'
    ).length,
    merge_hint_count: draftResults.filter((result) => result.decision === 'merge_hint_only').length,
    blocking_reason_codes: blockingReasonCodes,
  };
}

function result(input: {
  draft_id: string;
  rank: number;
  decision: TopicSelectionCandidateDraftAdmissionDecision;
  reason_codes?: string[];
  supplemental_questions?: string[];
}): TopicSelectionCandidateDraftAdmissionResult {
  return {
    draft_id: input.draft_id,
    rank: input.rank,
    decision: input.decision,
    reason_codes: input.reason_codes ?? [],
    blocking_reason_codes: [],
    resolved_ref_counts: {
      support: 1,
      challenge: 0,
      baseline: 0,
      context: 0,
    },
    normalized_candidate_key: `key-${input.draft_id}`,
    duplicate_candidate_refs: [],
    required_human_review_points: [],
    supplemental_questions: input.supplemental_questions ?? [],
    admitted_draft_ref: input.decision === 'admit'
      ? { ref_type: 'candidate_draft', ref_id: input.draft_id, title_card_id: 'title_card_001' }
      : null,
    merge_target_ref: null,
  };
}

test('supplemental routing finalizes when at least one draft is admitted', () => {
  const decision = routing.createRoutingDecision({
    admission_report: report([
      result({
        draft_id: 'draft_001',
        rank: 1,
        decision: 'admit',
        reason_codes: ['grounded'],
      }),
    ]),
    current_round_index: 1,
    remaining_round_budget: 2,
  });

  assert.equal(decision.routing_decision, 'finalize_with_admitted_batch');
  assert.deepEqual(decision.source_draft_ids, ['draft_001']);
  assert.deepEqual(decision.supplemental_questions, []);
  assert.deepEqual(decision.allowed_roles, []);
  assert.equal(decision.stop_condition, 'admitted_batch_ready');
});

test('supplemental routing runs a scoped supplemental round with capped questions', () => {
  const decision = routing.createRoutingDecision({
    admission_report: report([
      result({
        draft_id: 'draft_001',
        rank: 1,
        decision: 'return_for_supplemental_round',
        reason_codes: ['SPECULATIVE_DRAFT_NEEDS_RISK_BOUNDS'],
        supplemental_questions: [
          'Question 1',
          'Question 2',
          'Question 3',
        ],
      }),
      result({
        draft_id: 'draft_002',
        rank: 2,
        decision: 'return_for_supplemental_round',
        reason_codes: ['THIN_CHALLENGE_COVERAGE'],
        supplemental_questions: [
          'Question 4',
          'Question 5',
          'Question 6',
        ],
      }),
    ]),
    current_round_index: 1,
    remaining_round_budget: 2,
    max_questions: 5,
  });

  assert.equal(decision.routing_decision, 'run_supplemental_round');
  assert.deepEqual(decision.source_draft_ids, ['draft_001', 'draft_002']);
  assert.equal(decision.supplemental_questions.length, 5);
  assert.equal(decision.supplemental_questions[0]?.question_id, 'supplemental_draft_001_1');
  assert.equal(decision.supplemental_questions[4]?.source_draft_id, 'draft_002');
  assert.deepEqual(decision.allowed_roles, ['explorer', 'deep_critic']);
  assert.equal(decision.forbidden_actions.includes('persistence_write'), true);
  assert.equal(decision.forbidden_actions.includes('broad_re_exploration'), true);
});

test('supplemental routing blocks instead of starting a fourth round or using exhausted budget', () => {
  const admissionReport = report([
    result({
      draft_id: 'draft_001',
      rank: 1,
      decision: 'return_for_supplemental_round',
      reason_codes: ['SPECULATIVE_DRAFT_NEEDS_RISK_BOUNDS'],
      supplemental_questions: ['Clarify risk bounds.'],
    }),
  ]);

  const afterRoundThree = routing.createRoutingDecision({
    admission_report: admissionReport,
    current_round_index: 3,
    remaining_round_budget: 1,
  });
  const exhaustedBudget = routing.createRoutingDecision({
    admission_report: admissionReport,
    current_round_index: 2,
    remaining_round_budget: 0,
  });

  assert.equal(afterRoundThree.routing_decision, 'block');
  assert.equal(exhaustedBudget.routing_decision, 'block');
  assert.equal(afterRoundThree.trigger_reason_codes.includes('EXHAUSTED_SUPPLEMENTAL_ROUND_BUDGET'), true);
  assert.equal(exhaustedBudget.trigger_reason_codes.includes('EXHAUSTED_SUPPLEMENTAL_ROUND_BUDGET'), true);
});

test('supplemental routing sends grounded judgment gaps to human review', () => {
  const decision = routing.createRoutingDecision({
    admission_report: report([
      result({
        draft_id: 'draft_001',
        rank: 1,
        decision: 'require_human_review',
        reason_codes: ['SPECULATIVE_DRAFT_NEEDS_HUMAN_REVIEW'],
      }),
    ]),
    current_round_index: 2,
    remaining_round_budget: 0,
  });

  assert.equal(decision.routing_decision, 'require_human_review');
  assert.deepEqual(decision.source_draft_ids, ['draft_001']);
  assert.equal(decision.trigger_reason_codes.includes('HUMAN_REVIEW_REQUIRED'), true);
  assert.equal(decision.stop_condition, 'human_review_required');
});

test('supplemental routing rejects pure non-supplementable drafts without another round', () => {
  const decision = routing.createRoutingDecision({
    admission_report: report([
      result({
        draft_id: 'draft_001',
        rank: 1,
        decision: 'merge_hint_only',
        reason_codes: ['DUPLICATE_NEED_CANDIDATE'],
      }),
    ]),
    current_round_index: 1,
    remaining_round_budget: 2,
  });

  assert.equal(decision.routing_decision, 'reject_without_supplement');
  assert.deepEqual(decision.source_draft_ids, ['draft_001']);
  assert.equal(decision.supplemental_questions.length, 0);
});

test('supplemental routing treats an evidence-backed none-viable portfolio as a successful stop', () => {
  const admissionReport = report([]);
  admissionReport.portfolio_disposition = {
    outcome: 'none_viable',
    rationale: 'All inspected framings collide with direct prior art.',
    confidence: 0.88,
    evidence_refs: [{ ref_type: 'evidence_unit', ref_id: 'challenge_001', title_card_id: 'title_card_001' }],
    rejection_reasons: [
      {
        reason_code: 'near_isomorphic_prior_art',
        summary: 'No mechanism-level difference remains.',
        evidence_refs: [{ ref_type: 'evidence_unit', ref_id: 'challenge_001', title_card_id: 'title_card_001' }],
      },
    ],
    reopening_conditions: ['New claim-bearing evidence establishes a mechanism-level difference.'],
    candidate_dispositions: [],
  };

  const decision = routing.createRoutingDecision({
    admission_report: admissionReport,
    current_round_index: 1,
    remaining_round_budget: 2,
  });

  assert.equal(decision.routing_decision, 'stop_without_candidate');
  assert.deepEqual(decision.source_draft_ids, []);
  assert.deepEqual(decision.trigger_reason_codes, ['PORTFOLIO_NONE_VIABLE']);
  assert.equal(decision.stop_condition, 'portfolio_none_viable');
});

test('supplemental routing maps expansion and reframe outcomes without treating them as failures', () => {
  const admissionReport = report([]);
  const commonDisposition = {
    rationale: 'The current scope cannot support a selected candidate.',
    confidence: 0.72,
    evidence_refs: [{ ref_type: 'evidence_unit', ref_id: 'challenge_001', title_card_id: 'title_card_001' }],
    rejection_reasons: [
      {
        reason_code: 'candidate_space_incomplete' as const,
        summary: 'The present evidence does not cover a viable candidate space.',
        evidence_refs: [{ ref_type: 'evidence_unit', ref_id: 'challenge_001', title_card_id: 'title_card_001' }],
      },
    ],
    reopening_conditions: ['Change the evidence or research scope.'],
    candidate_dispositions: [],
  };

  admissionReport.portfolio_disposition = {
    ...commonDisposition,
    outcome: 'evidence_expansion_required',
  };
  const expand = routing.createRoutingDecision({ admission_report: admissionReport });

  admissionReport.portfolio_disposition = {
    ...commonDisposition,
    outcome: 'reframe_required',
  };
  const reframe = routing.createRoutingDecision({ admission_report: admissionReport });

  assert.equal(expand.routing_decision, 'expand_evidence');
  assert.equal(expand.stop_condition, 'portfolio_evidence_expansion_required');
  assert.equal(reframe.routing_decision, 'reframe_scope');
  assert.equal(reframe.stop_condition, 'portfolio_reframe_required');
});

test('supplemental routing rejects invalid round metadata', () => {
  assert.throws(
    () => routing.createRoutingDecision({
      admission_report: report([]),
      current_round_index: 4,
      remaining_round_budget: 0,
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});
