import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const NOW = '2026-08-25T10:00:00.000Z';

function createService() {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now: () => NOW },
  );
  const repository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const service = new TopicSelectionResearchCheckpointService(repository, controlPlane, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  return { repository, service };
}

async function materialize(
  service: TopicSelectionResearchCheckpointService,
  targetSnapshotHash = HASH_A,
) {
  return service.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_ref: {
      ref_type: 'evidence_map',
      ref_id: targetSnapshotHash === HASH_A ? 'evidence_1' : 'evidence_2',
      title_card_id: 'title_1',
    },
    target_snapshot_hash: targetSnapshotHash,
    source_refs: [{ ref_type: 'literature_record', ref_id: 'paper_1' }],
    allowed_actions: ['loopback', 'advance'],
    packet_payload: {
      nearest_work: [{ title: 'Closest baseline' }],
      disconfirming_evidence: [{ claim: 'Alternative explanation' }],
    },
  });
}

function advancingDecision(snapshotHash = HASH_A) {
  return {
    decision_key: `decision_${snapshotHash[0]}`,
    decision: 'advance' as const,
    actor: { actor_type: 'human' as const, actor_id: 'researcher_1' },
    confirmed_snapshot_hash: snapshotHash,
    rationale: 'Reviewed the current nearest work, challenges, and source quality.',
    review_payload: {
      review_kind: 'evidence_landscape' as const,
      nearest_work_reviewed: true,
      disconfirming_evidence_reviewed: true,
      source_quality_reviewed: true,
      limitations: [],
    },
  };
}

test('checkpoint lifecycle is recoverable, snapshot-bound, and fail-closed', async () => {
  const { service } = createService();
  const first = await materialize(service);
  const replay = await materialize(service);
  assert.equal(replay.research_checkpoint_id, first.research_checkpoint_id);

  const packet = await service.getPacket(first.research_checkpoint_id);
  assert.deepEqual(packet.packet_payload, {
    nearest_work: [{ title: 'Closest baseline' }],
    disconfirming_evidence: [{ claim: 'Alternative explanation' }],
  });
  await assert.rejects(
    service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape' }),
    /has not advanced/u,
  );

  const decision = await service.recordDecision(first.research_checkpoint_id, advancingDecision());
  const decisionReplay = await service.recordDecision(first.research_checkpoint_id, advancingDecision());
  assert.equal(decisionReplay.research_checkpoint_decision_id, decision.research_checkpoint_decision_id);
  await service.assertTransitionAllowed({
    title_card_id: 'title_1',
    checkpoint_kind: 'evidence_landscape',
    target_snapshot_hash: HASH_A,
  });

  const objection = await service.recordObjection(first.research_checkpoint_id, {
    objection_key: 'objection_1',
    severity: 'blocking',
    summary: 'The evidence does not rule out the main alternative.',
    rationale: 'The negative evidence is too weak to distinguish mechanisms.',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_snapshot_hash: HASH_A,
  });
  await assert.rejects(
    service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape' }),
    /open blocking objections/u,
  );
  await service.resolveObjection(objection.research_objection_id, {
    resolution_key: 'resolution_1',
    resolution_type: 'resolved_with_evidence',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    resolved_snapshot_hash: HASH_A,
    rationale: 'A discriminating negative result has been added and reviewed.',
    output_refs: [{ ref_type: 'evidence_unit', ref_id: 'evidence_unit_2' }],
  });
  await service.assertTransitionAllowed({ title_card_id: 'title_1', checkpoint_kind: 'evidence_landscape' });

  const second = await materialize(service, HASH_B);
  const history = await service.listCheckpoints('title_1');
  assert.equal(history.length, 2);
  assert.equal(history[0]?.status, 'superseded');
  assert.equal(history[0]?.superseded_by_checkpoint_id, second.research_checkpoint_id);
  assert.equal(history[1]?.status, 'pending');
  await assert.rejects(
    service.recordDecision(first.research_checkpoint_id, {
      ...advancingDecision(),
      decision_key: 'late_decision',
    }),
    /not current/u,
  );
  await assert.rejects(
    service.recordDecision(second.research_checkpoint_id, {
      ...advancingDecision(HASH_B),
      decision_key: decision.decision_key,
    }),
    /different checkpoint/u,
  );
});

test('advance requires all semantic evidence-review checks', async () => {
  const { service } = createService();
  const checkpoint = await materialize(service);
  await assert.rejects(
    service.recordDecision(checkpoint.research_checkpoint_id, {
      ...advancingDecision(),
      review_payload: {
        ...advancingDecision().review_payload,
        disconfirming_evidence_reviewed: false,
      },
    }),
    /every semantic review check/u,
  );
});
