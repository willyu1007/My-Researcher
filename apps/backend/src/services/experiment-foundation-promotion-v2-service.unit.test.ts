import assert from 'node:assert/strict';
import test from 'node:test';

import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationV2Repository } from '../repositories/in-memory-experiment-foundation-v2-repository.js';
import { buildExperimentFoundationD19TypedFixture } from './experiment-foundation-d19-fixture.js';
import { ExperimentFoundationPromotionV2Service } from './experiment-foundation-promotion-v2-service.js';
import { ExperimentFoundationV2Service } from './experiment-foundation-v2-service.js';

const NOW = '2026-08-02T08:00:00.000Z';

test('promote creates one canonical/Candidate/decision/outbox and exact replay is zero-new', async () => {
  const { promotion } = await fixture('policy_promote');
  const first = await promotion.decide(target('policy_promote', 1), request('promote', 'key-1'));
  const replay = await promotion.decide(target('policy_promote', 1), request('promote', 'key-1'));
  const secondKey = await promotion.decide(
    target('policy_promote', 1),
    request('promote', 'key-2'),
  );

  assert.equal(first.replayed, false);
  assert.equal(first.candidate.status, 'promoted');
  assert.equal(first.promotion_decision.canonicalization_outcome, 'created');
  assert.ok(first.candidate.canonical_revision);
  assert.equal(replay.replayed, true);
  assert.equal(secondKey.replayed, true);
  assert.equal(replay.event_id, first.event_id);
  assert.deepEqual(secondKey.promotion_decision, first.promotion_decision);
});

test('reject creates no canonical revision and the candidate cannot receive another terminal decision', async () => {
  const { promotion } = await fixture('policy_reject');
  const rejected = await promotion.decide(
    target('policy_reject', 1),
    request('reject', 'reject-key'),
  );

  assert.equal(rejected.candidate.status, 'rejected');
  assert.equal(rejected.candidate.canonical_revision, null);
  assert.equal(rejected.promotion_decision.canonicalization_outcome, null);
  await assert.rejects(
    promotion.decide(target('policy_reject', 1), request('promote', 'changed-key')),
    reason('PROMOTION_DECISION_CONFLICT'),
  );
});

test('same idempotency key with changed decision conflicts before new writes', async () => {
  const { promotion } = await fixture('policy_drift');
  await promotion.decide(target('policy_drift', 1), request('reject', 'same-key'));
  await assert.rejects(
    promotion.decide(target('policy_drift', 1), request('promote', 'same-key')),
    reason('PROMOTION_IDEMPOTENCY_CONFLICT'),
  );
});

test('crash after canonical insert rolls back Candidate, canonical revision, decision and outbox', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const assets = new ExperimentFoundationV2Service(repository, { now: () => NOW });
  await createPolicy(assets, 'policy_crash');
  const crashing = new ExperimentFoundationPromotionV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
    failpoint(point) {
      if (point === 'after-canonical') throw new Error('injected crash');
    },
  });
  await assert.rejects(
    crashing.decide(target('policy_crash', 1), request('promote', 'crash-key')),
    /injected crash/,
  );

  const recovered = await new ExperimentFoundationPromotionV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
  }).decide(target('policy_crash', 1), request('promote', 'crash-key'));
  assert.equal(recovered.replayed, false);
  assert.equal(recovered.promotion_decision.canonicalization_outcome, 'created');
});

test('concurrent exact decisions converge on one terminal outcome and event', async () => {
  const { promotion } = await fixture('policy_race');
  const [left, right] = await Promise.all([
    promotion.decide(target('policy_race', 1), request('promote', 'race-left')),
    promotion.decide(target('policy_race', 1), request('promote', 'race-right')),
  ]);
  assert.deepEqual(new Set([left.replayed, right.replayed]), new Set([false, true]));
  assert.equal(left.event_id, right.event_id);
  assert.deepEqual(left.promotion_decision, right.promotion_decision);
});

test('promotion exact-reuses an existing canonical revision without a second canonical writer', async () => {
  const { promotion, assets } = await fixture('policy_reuse');
  const frozen = await assets.freezeAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'policy_reuse',
    expected_state_version: 1,
    business_idempotency_key: 'internal-freeze',
  });
  const result = await promotion.decide(
    target('policy_reuse', 2),
    request('promote', 'promotion-reuse'),
  );
  assert.equal(result.promotion_decision.canonicalization_outcome, 'reused');
  assert.equal(
    result.promotion_decision.canonical_revision?.revision_id,
    frozen.revision.revision.revision_id,
  );
});

test('promotion intake is default-off', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const promotion = new ExperimentFoundationPromotionV2Service(repository, {
    enabled: () => false,
  });
  await assert.rejects(
    promotion.decide(target('missing', 1), request('promote', 'disabled')),
    reason('EF_V2_PROMOTION_DISABLED'),
  );
});

test('promotion service rejects unsupported asset types and out-of-range candidate revisions', async () => {
  const { promotion } = await fixture('policy_invalid_target');
  await assert.rejects(
    promotion.decide(
      { ...target('policy_invalid_target', 1), asset_type: 'Unknown' as 'DataPolicy' },
      request('promote', 'invalid-type'),
    ),
    reason('PROMOTION_TARGET_INVALID'),
  );
  await assert.rejects(
    promotion.decide(
      target('policy_invalid_target', EXPERIMENT_V2_INT32_MAX + 1),
      request('promote', 'invalid-revision'),
    ),
    reason('PROMOTION_TARGET_INVALID'),
  );
  await assert.rejects(
    promotion.decide(
      target('policy_invalid_target', 1),
      { decision: 'promote', business_idempotency_key: 42 as unknown as string },
    ),
    reason('PROMOTION_COMMAND_INVALID'),
  );
});

test('promotion handles all five typed asset families through exact canonical reuse', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const assets = new ExperimentFoundationV2Service(repository, { now: () => NOW });
  const fixture = await buildExperimentFoundationD19TypedFixture(assets);
  const promotion = new ExperimentFoundationPromotionV2Service(repository, {
    enabled: () => true,
    now: () => NOW,
  });
  const refs = [
    fixture.data_policies[0]!,
    fixture.datasets[0]!,
    fixture.metric_definitions[0]!,
    fixture.benchmark,
    fixture.evaluation_protocol,
  ];

  for (const ref of refs) {
    const result = await promotion.decide({
      asset_type: ref.asset_type,
      logical_id: ref.logical_id,
      candidate_revision: 2,
    }, request('promote', `all-families-${ref.asset_type}`));
    assert.equal(result.promotion_decision.canonicalization_outcome, 'reused');
    assert.deepEqual(result.promotion_decision.canonical_revision, ref);
  }
});

async function fixture(logicalId: string) {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const assets = new ExperimentFoundationV2Service(repository, { now: () => NOW });
  await createPolicy(assets, logicalId);
  return {
    assets,
    promotion: new ExperimentFoundationPromotionV2Service(repository, {
      enabled: () => true,
      now: () => NOW,
    }),
  };
}

async function createPolicy(assets: ExperimentFoundationV2Service, logicalId: string) {
  await assets.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: logicalId,
    draft_content: {
      schema_version: 'v1',
      policy_key: logicalId,
      display_name: logicalId,
      license_expression: 'MIT',
      access_level: 'open',
      source_terms_uri: 'https://example.test/terms',
      redistribution_allowed: true,
      commercial_use_allowed: true,
      use_constraints: [],
    },
  });
}

function target(logicalId: string, candidateRevision: number) {
  return {
    asset_type: 'DataPolicy' as const,
    logical_id: logicalId,
    candidate_revision: candidateRevision,
  };
}

function request(decision: 'promote' | 'reject', key: string) {
  return { decision, business_idempotency_key: key };
}

function reason(reasonCode: string) {
  return (error: unknown) => (
    error instanceof AppError && error.details?.reason_code === reasonCode
  );
}
