import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyTopicSelectionV1bRefinementDelta } from './topic-selection-v1b-refinement-delta-service.js';

const BASELINE = {
  main_question: 'Does recalibration improve Brier Score?',
  contribution_hypothesis: 'method' as const,
  expected_claim: 'Recalibration improves calibration.',
  fallback_claim: 'Recalibration identifies unsafe shifts.',
  evaluation_setting: 'Two replacement environments.',
  metrics: ['Brier Score'],
  baselines: ['Frozen router'],
  ablations_or_comparisons: ['No abstention'],
  dependency_risks: ['Replacement benchmark availability'],
  open_dependencies: ['Frozen router outputs'],
  known_gaps: ['No direct transfer study'],
  risk_notes: ['Benchmark realism remains bounded'],
};

test('refinement delta classifier treats every content-bearing changed field as substantive', () => {
  const result = classifyTopicSelectionV1bRefinementDelta(BASELINE, {
    schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
    refinement_id: 'refinement_delta_1',
    actor: { actor_type: 'human', actor_id: 'researcher' },
    rationale: 'Freeze the accepted primary metric and safety floor.',
    updates: {
      main_question: 'Does low-label recalibration improve Brier Score at at least 90% coverage?',
      metrics: ['Brier Score', 'harmful-routing rate at fixed coverage'],
    },
  });

  assert.equal(result.kind, 'substantive');
  assert.deepEqual(result.changed_fields, ['main_question', 'metrics']);
  assert.match(result.delta_hash, /^[a-f0-9]{64}$/);
});

test('refinement delta classifier bypasses only canonicalization-neutral no-ops', () => {
  const result = classifyTopicSelectionV1bRefinementDelta(BASELINE, {
    schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
    refinement_id: 'refinement_delta_no_op',
    actor: { actor_type: 'human', actor_id: 'researcher' },
    rationale: 'Normalize accidental surrounding whitespace only.',
    updates: {
      main_question: '  Does recalibration   improve Brier Score?  ',
      metrics: [' Brier Score '],
    },
  });

  assert.equal(result.kind, 'canonical_no_op');
  assert.deepEqual(result.changed_fields, []);
  assert.deepEqual(result.normalized_updates, {
    main_question: BASELINE.main_question,
    metrics: BASELINE.metrics,
  });
});
