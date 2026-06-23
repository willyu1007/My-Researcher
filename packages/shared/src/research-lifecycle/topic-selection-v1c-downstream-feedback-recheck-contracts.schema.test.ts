import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  computeDownstreamRecheckAdvisoryPriority,
  topicSelectionDownstreamFeedbackImpactSummarySchema,
} from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify();
  app.post('/v', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const r = await app.inject({ method: 'POST', url: '/v', payload: body as Record<string, unknown> });
    return r.statusCode === 200;
  } finally {
    await app.close();
  }
}

function impactSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    impact_level: 'invalidated',
    severity: 'critical',
    loopback_target: 'package',
    loopback_cause: 'need_invalidated',
    requires_recheck: true,
    affected_ref: { ref_type: 'topic_package', ref_id: 'pkg_1', title_card_id: 'tc_1', version_id: null },
    summary: 'Downstream feedback requires package recheck.',
    ...overrides,
  };
}

test('W-08 recheck advisory ranking: deterministic 0–100 composite (severity-weighted > impact > cause)', () => {
  // Top of the range: critical + invalidated + the most urgent cause = 60 + 30 + 10 = 100.
  assert.deepEqual(
    computeDownstreamRecheckAdvisoryPriority('critical', 'invalidated', 'downstream_mutation_attempt'),
    { advisory_priority: 100, advisory_rank_reason: 'critical+invalidated+downstream_mutation_attempt' },
  );
  // Pure + replay-stable: same inputs -> same output.
  assert.deepEqual(
    computeDownstreamRecheckAdvisoryPriority('warning', 'stale', 'stale_evidence'),
    computeDownstreamRecheckAdvisoryPriority('warning', 'stale', 'stale_evidence'),
  );
  // warning+stale+stale_evidence = 25 + 8 + 3 = 36.
  assert.equal(computeDownstreamRecheckAdvisoryPriority('warning', 'stale', 'stale_evidence').advisory_priority, 36);

  const score = (
    s: 'info' | 'warning' | 'blocking' | 'critical',
    i: 'no_impact' | 'stale' | 'recheck_required' | 'invalidated',
    c: 'need_invalidated' | 'stale_evidence' | 'downstream_mutation_attempt',
  ) => computeDownstreamRecheckAdvisoryPriority(s, i, c).advisory_priority;

  // Monotonic in each dimension (others fixed): raising severity / impact / cause strictly raises the score.
  assert.ok(score('critical', 'invalidated', 'need_invalidated') > score('blocking', 'invalidated', 'need_invalidated'));
  assert.ok(score('blocking', 'invalidated', 'need_invalidated') > score('blocking', 'recheck_required', 'need_invalidated'));
  assert.ok(score('blocking', 'recheck_required', 'need_invalidated') > score('blocking', 'recheck_required', 'stale_evidence'));

  // It is a COMPOSITE, not a strict lexicographic order: severity carries the most weight (span 50) but a
  // genuinely-invalidating lower-severity feedback can outrank a higher-severity-but-no-impact note —
  // span(severity)=50 > span(impact)=30 > span(cause)=10, so an impact gap CAN overcome a one-step severity gap.
  assert.ok(score('blocking', 'invalidated', 'need_invalidated') > score('critical', 'no_impact', 'stale_evidence'));
});

test('W-08 recheck advisory schema: accepts optional advisory fields and rejects an out-of-range priority', async () => {
  // Back-compat: a record WITHOUT the advisory fields still validates (they are optional).
  assert.equal(await validatesBody(topicSelectionDownstreamFeedbackImpactSummarySchema as Record<string, unknown>, impactSummary()), true);
  // With valid advisory fields.
  assert.equal(await validatesBody(topicSelectionDownstreamFeedbackImpactSummarySchema as Record<string, unknown>, impactSummary({
    advisory_priority: 100,
    advisory_rank_reason: 'critical+invalidated+need_invalidated',
  })), true);
  // Value constraint (integer 0–100) is enforced, not stripped: > 100 is rejected.
  assert.equal(await validatesBody(topicSelectionDownstreamFeedbackImpactSummarySchema as Record<string, unknown>, impactSummary({
    advisory_priority: 250,
  })), false);
  // Null is allowed (no-recheck records carry no score).
  assert.equal(await validatesBody(topicSelectionDownstreamFeedbackImpactSummarySchema as Record<string, unknown>, impactSummary({
    advisory_priority: null,
    advisory_rank_reason: null,
  })), true);
});
