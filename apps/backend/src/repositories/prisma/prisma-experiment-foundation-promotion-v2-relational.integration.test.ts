import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { openVerifiedDisposablePostgresTestDatabase } from '../../test-support/disposable-postgres-test-database.js';
import { ExperimentFoundationPromotionV2Service } from '../../services/experiment-foundation-promotion-v2-service.js';
import { buildExperimentFoundationD19TypedFixture } from '../../services/experiment-foundation-d19-fixture.js';
import { ExperimentFoundationV2Service } from '../../services/experiment-foundation-v2-service.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';

const RUN_REAL_POSTGRES = process.env.EXPERIMENT_FOUNDATION_PROMOTION_V2_RELATIONAL_PRISMA === '1';
const SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_PROMOTION_V2_RELATIONAL_PRISMA=1 with the explicit randomized disposable database identity variables';

test(
  'Prisma promotion UoW rolls back crashes and converges concurrent exact decisions',
  { skip: RUN_REAL_POSTGRES ? false : SKIP_REASON, timeout: 120_000 },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const assets = new ExperimentFoundationV2Service(repository);

    try {
      const crashId = `promotion-crash-${randomUUID()}`;
      await createPolicy(assets, crashId);
      const crashing = new ExperimentFoundationPromotionV2Service(repository, {
        enabled: () => true,
        failpoint(point) {
          if (point === 'after-canonical') throw new Error('promotion relational crash');
        },
      });
      await assert.rejects(
        crashing.decide(target(crashId), request('promote', `${crashId}-key`)),
        /promotion relational crash/,
      );
      assert.deepEqual(await counts(prisma, crashId), {
        candidates: 0,
        decisions: 0,
        canonicalRevisions: 0,
        receipts: 0,
        outbox: 0,
      });

      const promotion = new ExperimentFoundationPromotionV2Service(repository, {
        enabled: () => true,
      });
      const recovered = await promotion.decide(
        target(crashId),
        request('promote', `${crashId}-key`),
      );
      assert.equal(recovered.replayed, false);
      assert.deepEqual(await counts(prisma, crashId), {
        candidates: 1,
        decisions: 1,
        canonicalRevisions: 1,
        receipts: 1,
        outbox: 1,
      });

      const raceId = `promotion-race-${randomUUID()}`;
      await createPolicy(assets, raceId);
      const [left, right] = await Promise.all([
        promotion.decide(target(raceId), request('promote', `${raceId}-left`)),
        promotion.decide(target(raceId), request('promote', `${raceId}-right`)),
      ]);
      assert.equal(left.event_id, right.event_id);
      assert.deepEqual(new Set([left.replayed, right.replayed]), new Set([false, true]));
      assert.deepEqual(await counts(prisma, raceId), {
        candidates: 1,
        decisions: 1,
        canonicalRevisions: 1,
        receipts: 2,
        outbox: 1,
      });

      const rejectId = `promotion-reject-${randomUUID()}`;
      await createPolicy(assets, rejectId);
      const rejected = await promotion.decide(
        target(rejectId),
        request('reject', `${rejectId}-key`),
      );
      assert.equal(rejected.candidate.canonical_revision, null);
      assert.deepEqual(await counts(prisma, rejectId), {
        candidates: 1,
        decisions: 1,
        canonicalRevisions: 0,
        receipts: 1,
        outbox: 1,
      });

      const typedFixture = await buildExperimentFoundationD19TypedFixture(assets);
      const refs = [
        typedFixture.data_policies[0]!,
        typedFixture.datasets[0]!,
        typedFixture.metric_definitions[0]!,
        typedFixture.benchmark,
        typedFixture.evaluation_protocol,
      ];
      for (const ref of refs) {
        const result = await promotion.decide({
          asset_type: ref.asset_type,
          logical_id: ref.logical_id,
          candidate_revision: 2,
        }, request('promote', `relational-family-${ref.asset_type}`));
        assert.equal(result.promotion_decision.canonicalization_outcome, 'reused');
        assert.deepEqual(result.promotion_decision.canonical_revision, ref);
      }

      const relayNow = new Date().toISOString();
      const claims = await repository.claimOutbox({
        lease_owner: 'promotion-relational-relay',
        claimed_at: relayNow,
        lease_expires_at: new Date(Date.parse(relayNow) + 30_000).toISOString(),
        limit: 100,
      });
      assert.equal(claims.length, 8);
      for (const claim of claims) {
        await repository.markOutboxDelivered(
          claim.outbox_id,
          claim.lease_owner,
          new Date().toISOString(),
        );
      }
      assert.equal(await prisma.experimentFoundationPromotionOutboxV2.count({
        where: { relayStatus: 'pending' },
      }), 0);
      assert.equal(await prisma.experimentFoundationPromotionOutboxV2.count({
        where: { relayStatus: 'delivered' },
      }), 8);

      const integrityLeft = `promotion-integrity-left-${randomUUID()}`;
      const integrityRight = `promotion-integrity-right-${randomUUID()}`;
      await createPolicy(assets, integrityLeft);
      await createPolicy(assets, integrityRight);
      const leftResult = await promotion.decide(
        target(integrityLeft),
        request('promote', `${integrityLeft}-key`),
      );
      const rightResult = await promotion.decide(
        target(integrityRight),
        request('promote', `${integrityRight}-key`),
      );
      const leftRef = leftResult.candidate.canonical_revision!;
      const rightRef = rightResult.candidate.canonical_revision!;
      await prisma.experimentFoundationPreparationCandidateV2.updateMany({
        where: { assetLogicalId: integrityLeft },
        data: {
          canonicalRevisionId: rightRef.revision_id,
          canonicalRevisionHash: rightRef.content_hash,
        },
      });
      await assert.rejects(
        promotion.decide(target(integrityLeft), request('promote', `${integrityLeft}-key`)),
        /canonical ref has drifted/,
      );
      await prisma.experimentFoundationPreparationCandidateV2.updateMany({
        where: { assetLogicalId: integrityLeft },
        data: {
          canonicalRevisionId: leftRef.revision_id,
          canonicalRevisionHash: leftRef.content_hash,
        },
      });

      const leftDecision = await prisma.experimentFoundationPromotionDecisionV2.findFirstOrThrow({
        where: { candidateId: leftResult.candidate.candidate_id },
      });
      await prisma.experimentFoundationPromotionDecisionV2.update({
        where: { id: leftDecision.id },
        data: { commandHash: `sha256:${'f'.repeat(64)}` },
      });
      await assert.rejects(
        promotion.decide(target(integrityLeft), request('promote', `${integrityLeft}-key`)),
        /exact Candidate outcome/,
      );
      await prisma.experimentFoundationPromotionDecisionV2.update({
        where: { id: leftDecision.id },
        data: { commandHash: leftDecision.commandHash },
      });

      await prisma.experimentFoundationPromotionOutboxV2.updateMany({
        where: { promotionDecisionId: leftDecision.id },
        data: { aggregateId: 'cross-aggregate-drift' },
      });
      const integrityRelayNow = new Date(Date.now() + 1_000).toISOString();
      const integrityClaims = await repository.claimOutbox({
        lease_owner: 'promotion-integrity-relay',
        claimed_at: integrityRelayNow,
        lease_expires_at: new Date(Date.parse(integrityRelayNow) + 30_000).toISOString(),
        limit: 100,
      });
      assert.equal(integrityClaims.length, 1);
      assert.equal(integrityClaims[0]?.event.payload.logical_id, integrityRight);
      await repository.markOutboxDelivered(
        integrityClaims[0]!.outbox_id,
        integrityClaims[0]!.lease_owner,
        new Date().toISOString(),
      );
      assert.equal(await prisma.experimentFoundationPromotionOutboxV2.count({
        where: { promotionDecisionId: leftDecision.id, relayStatus: 'failed' },
      }), 1);
    } finally {
      await prisma.$disconnect();
    }
  },
);

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

function target(logicalId: string) {
  return {
    asset_type: 'DataPolicy' as const,
    logical_id: logicalId,
    candidate_revision: 1,
  };
}

function request(decision: 'promote' | 'reject', key: string) {
  return { decision, business_idempotency_key: key };
}

async function counts(prisma: Awaited<ReturnType<typeof openVerifiedDisposablePostgresTestDatabase>>['prisma'], logicalId: string) {
  const candidateRows = await prisma.experimentFoundationPreparationCandidateV2.findMany({
    where: { assetLogicalId: logicalId },
    select: { id: true },
  });
  const candidateIds = candidateRows.map((row) => row.id);
  const decisionRows = await prisma.experimentFoundationPromotionDecisionV2.findMany({
    where: { candidateId: { in: candidateIds } },
    select: { id: true },
  });
  const decisionIds = decisionRows.map((row) => row.id);
  return {
    candidates: candidateRows.length,
    decisions: decisionRows.length,
    canonicalRevisions: await prisma.experimentFoundationDataPolicyRevisionV2.count({
      where: { dataPolicyId: logicalId },
    }),
    receipts: await prisma.experimentFoundationPromotionCommandReceiptV2.count({
      where: { promotionDecisionId: { in: decisionIds } },
    }),
    outbox: await prisma.experimentFoundationPromotionOutboxV2.count({
      where: { promotionDecisionId: { in: decisionIds } },
    }),
  };
}
