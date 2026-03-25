import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePromotionDecisionLoopbackTarget,
  normalizeReviewRefs,
} from './title-card-management-normalizers.js';

test('normalizeReviewRefs maps legacy record types to canonical title-card semantics', () => {
  const normalized = normalizeReviewRefs([
    { record_id: 'record_1', record_type: 'question' },
    { record_id: 'record_2', record_type: 'topic_package' },
    { record_id: 'record_3', record_type: 'need_review' },
  ]);

  assert.deepEqual(normalized, [
    { record_id: 'record_1', record_type: 'research_question' },
    { record_id: 'record_2', record_type: 'package' },
    { record_id: 'record_3', record_type: 'need_review' },
  ]);
});

test('normalizePromotionDecisionLoopbackTarget maps legacy values and drops invalid ones', () => {
  assert.equal(normalizePromotionDecisionLoopbackTarget('question'), 'research_question');
  assert.equal(normalizePromotionDecisionLoopbackTarget('topic_package'), 'package');
  assert.equal(normalizePromotionDecisionLoopbackTarget('package'), 'package');
  assert.equal(normalizePromotionDecisionLoopbackTarget('unknown'), undefined);
});
