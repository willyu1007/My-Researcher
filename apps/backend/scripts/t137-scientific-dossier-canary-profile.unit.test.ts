import assert from 'node:assert/strict';
import test from 'node:test';

import {
  T137_RESEARCH_INTENT,
  T137_SOURCE_LANE,
  t137EvidenceRole,
  t137LiteratureIds,
} from './t137-scientific-dossier-canary-profile.js';

test('T-137 fixes one four-source semantic lane with one owner per evidence role', () => {
  assert.deepEqual(t137LiteratureIds(), ['LIT-0328', 'LIT-0190', 'LIT-0252', 'LIT-0765']);
  assert.deepEqual(
    T137_SOURCE_LANE.map((item) => item.evidence_role),
    ['support', 'baseline', 'challenge', 'context'],
  );
  assert.equal(t137EvidenceRole('LIT-0328'), 'support');
  assert.throws(() => t137EvidenceRole('LIT-0000'), /outside the fixed T-137 source lane/u);
});

test('T-137 keeps the experiment decision exact and the claim ceiling narrow', () => {
  assert.equal(T137_RESEARCH_INTENT.metric_key, 'micro_recall_ppm');
  assert.equal(T137_RESEARCH_INTENT.difference_direction, 'top_k_10_minus_top_k_5');
  assert.equal(T137_RESEARCH_INTENT.support_threshold_ppm, 10_000);
  assert.equal(T137_RESEARCH_INTENT.contradiction_threshold_ppm, -10_000);
  assert.match(T137_RESEARCH_INTENT.intervention, /retrieval_top_k=10/u);
  assert.match(T137_RESEARCH_INTENT.baseline, /retrieval_top_k=5/u);
  assert.ok(T137_RESEARCH_INTENT.prohibited_claims.includes('general RAG quality'));
  assert.ok(T137_RESEARCH_INTENT.prohibited_claims.includes('cost improvement'));
});
