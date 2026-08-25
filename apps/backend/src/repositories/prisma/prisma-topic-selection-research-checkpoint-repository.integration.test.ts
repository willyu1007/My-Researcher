import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaTopicSelectionControlPlaneRepository } from './prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionResearchCheckpointRepository } from './prisma-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from '../../services/topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from '../../services/topic-selection-research-checkpoint-service.js';

const RUN_PRISMA = Boolean(process.env.DATABASE_URL);
const HASH = 'a'.repeat(64);

test('Prisma checkpoint decisions are atomic under concurrent human submissions', {
  skip: RUN_PRISMA ? false : 'set DATABASE_URL to run Prisma checkpoint integration tests',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const titleCardId = `title_t147_${suffix}`;
  const checkpointRepository = new PrismaTopicSelectionResearchCheckpointRepository(prisma);
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const service = new TopicSelectionResearchCheckpointService(checkpointRepository, controlPlane);

  try {
    const materialize = () => service.materializeCheckpoint({
      title_card_id: titleCardId,
      checkpoint_kind: 'evidence_landscape',
      target_ref: {
        ref_type: 'evidence_map',
        ref_id: `evidence_${suffix}`,
        title_card_id: titleCardId,
      },
      target_snapshot_hash: HASH,
      allowed_actions: ['advance', 'loopback'],
      packet_payload: { nearest_work: [], disconfirming_evidence: [] },
    });
    const [checkpoint, checkpointReplay] = await Promise.all([materialize(), materialize()]);
    assert.equal(checkpointReplay.research_checkpoint_id, checkpoint.research_checkpoint_id);
    assert.equal(await prisma.topicSelectionInputSnapshot.count({
      where: { titleCardId, policyVersion: 'v1' },
    }), 1);
    const decision = (decisionKey: string) => ({
      decision_key: decisionKey,
      decision: 'advance' as const,
      actor: { actor_type: 'human' as const, actor_id: 'researcher_t147' },
      confirmed_snapshot_hash: HASH,
      rationale: 'Exact current evidence review.',
      review_payload: {
        review_kind: 'evidence_landscape' as const,
        nearest_work_reviewed: true,
        disconfirming_evidence_reviewed: true,
        source_quality_reviewed: true,
        limitations: [],
      },
    });
    const results = await Promise.allSettled([
      service.recordDecision(checkpoint.research_checkpoint_id, decision(`decision_a_${suffix}`)),
      service.recordDecision(checkpoint.research_checkpoint_id, decision(`decision_b_${suffix}`)),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    assert.equal(fulfilled.length, 1, JSON.stringify(results));
    assert.equal(rejected.length, 1, JSON.stringify(results));

    const stored = await prisma.topicSelectionResearchCheckpointDecision.findMany({
      where: { titleCardId },
    });
    assert.equal(stored.length, 1);
    const replay = await service.recordDecision(
      checkpoint.research_checkpoint_id,
      decision(stored[0]!.decisionKey),
    );
    assert.equal(replay.research_checkpoint_decision_id, stored[0]!.id);
  } finally {
    await prisma.topicSelectionResearchObjectionResolution.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchObjection.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchCheckpointDecision.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchCheckpoint.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionHumanConfirmedDecision.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionInputSnapshot.deleteMany({ where: { titleCardId } });
    await prisma.$disconnect();
  }
});
