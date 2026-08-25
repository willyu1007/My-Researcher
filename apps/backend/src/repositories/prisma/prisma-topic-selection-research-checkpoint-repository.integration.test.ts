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

    const gapHash = 'b'.repeat(64);
    const gapCheckpoint = await service.materializeCheckpoint({
      title_card_id: titleCardId,
      checkpoint_kind: 'gap_selection',
      target_ref: {
        ref_type: 'need_candidate_arena',
        ref_id: `arena_${suffix}`,
        title_card_id: titleCardId,
      },
      target_snapshot_hash: gapHash,
      allowed_actions: ['advance', 'loopback'],
      packet_payload: { candidate_entries: [] },
    });
    const existingAuthority = await controlPlane.recordHumanDecision({
      title_card_id: titleCardId,
      target_ref: { ref_type: 'validated_need', ref_id: `validated_need_${suffix}`, title_card_id: titleCardId },
      decision_type: 'confirm',
      actor: { actor_type: 'human', actor_id: 'researcher_t147' },
      rationale: 'HumanConfirmNeed authority for the frozen candidate pool.',
      resulting_authority_refs: [],
    });
    const adapted = await service.adaptExistingStageDecision(gapCheckpoint.research_checkpoint_id, {
      decision_authority_ref: {
        ref_type: 'human_confirmed_decision',
        ref_id: existingAuthority.human_confirmed_decision_id,
        title_card_id: titleCardId,
      },
      confirmed_snapshot_hash: gapHash,
    });
    assert.equal(adapted.status, 'decided');
    assert.equal(adapted.decision_authority_ref?.ref_id, existingAuthority.human_confirmed_decision_id);
    await service.assertTransitionAllowed({ title_card_id: titleCardId, checkpoint_kind: 'gap_selection' });

    const questionCheckpoint = async (input: {
      contractId: string;
      snapshotHash: string;
      sliceVersion: string;
    }) => service.materializeCheckpoint({
      title_card_id: titleCardId,
      checkpoint_kind: 'question_contract',
      target_ref: {
        ref_type: 'topic_question_contract',
        ref_id: input.contractId,
        title_card_id: titleCardId,
        version_id: input.contractId,
      },
      target_snapshot_hash: input.snapshotHash,
      source_refs: [
        {
          ref_type: 'research_slice',
          ref_id: `research_slice_${suffix}`,
          title_card_id: titleCardId,
          version_id: input.sliceVersion,
        },
        {
          ref_type: 'evidence_map',
          ref_id: `evidence_${suffix}`,
          title_card_id: titleCardId,
        },
      ],
      allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
      packet_payload: { contract_id: input.contractId, slice_version: input.sliceVersion },
    });
    const questionDecision = (snapshotHash: string, decisionKey: string) => ({
      decision_key: decisionKey,
      decision: 'advance' as const,
      actor: { actor_type: 'human' as const, actor_id: 'researcher_t147' },
      confirmed_snapshot_hash: snapshotHash,
      rationale: 'Exact current question-design review.',
      review_payload: {
        review_kind: 'question_contract' as const,
        mechanism_identifiable: true,
        proxy_operationalized: true,
        confounds_reviewed: true,
        falsification_reviewed: true,
        claim_ceiling_reviewed: true,
        review_notes: ['Prisma integration confirmation.'],
      },
    });
    const questionV1 = await questionCheckpoint({
      contractId: `question_contract_v1_${suffix}`,
      snapshotHash: 'c'.repeat(64),
      sliceVersion: 'v1',
    });
    await service.recordDecision(
      questionV1.research_checkpoint_id,
      questionDecision(questionV1.target_snapshot_hash, `question_decision_v1_${suffix}`),
    );
    const objection = await service.recordObjection(questionV1.research_checkpoint_id, {
      objection_key: `academic_objection_${suffix}`,
      severity: 'critical',
      summary: 'Parameter-only framing is academically insufficient.',
      rationale: 'A top-k rewrite does not revise the research object or mechanism.',
      required_loopback: 'research_slice',
      actor: { actor_type: 'human', actor_id: 'researcher_t147' },
      confirmed_snapshot_hash: questionV1.target_snapshot_hash,
    });
    const reworded = await questionCheckpoint({
      contractId: `question_contract_reworded_${suffix}`,
      snapshotHash: 'd'.repeat(64),
      sliceVersion: 'v1',
    });
    await assert.rejects(
      service.resolveObjection(objection.research_objection_id, {
        resolution_key: `reworded_resolution_${suffix}`,
        resolution_type: 'resolved_with_revision',
        actor: { actor_type: 'human', actor_id: 'researcher_t147' },
        resolved_snapshot_hash: reworded.target_snapshot_hash,
        rationale: 'Only the question wording changed.',
        output_refs: [reworded.target_ref],
      }),
      /revised research_slice authority/u,
    );
    const revised = await questionCheckpoint({
      contractId: `question_contract_v2_${suffix}`,
      snapshotHash: 'e'.repeat(64),
      sliceVersion: 'v2',
    });
    const revisedSlice = revised.source_refs.find((ref) => ref.ref_type === 'research_slice');
    const currentEvidence = revised.source_refs.find((ref) => ref.ref_type === 'evidence_map');
    assert.ok(revisedSlice && currentEvidence);
    await service.resolveObjection(objection.research_objection_id, {
      resolution_key: `substantive_resolution_${suffix}`,
      resolution_type: 'resolved_with_revision',
      actor: { actor_type: 'human', actor_id: 'researcher_t147' },
      resolved_snapshot_hash: revised.target_snapshot_hash,
      rationale: 'The revised slice changes the research object and cites the current evidence authority.',
      output_refs: [revised.target_ref, revisedSlice, currentEvidence],
    });
    await service.recordDecision(
      revised.research_checkpoint_id,
      questionDecision(revised.target_snapshot_hash, `question_decision_v2_${suffix}`),
    );
    await service.assertTransitionAllowed({
      title_card_id: titleCardId,
      checkpoint_kind: 'question_contract',
      target_ref: revised.target_ref,
    });
    assert.equal(await prisma.topicSelectionResearchObjectionResolution.count({ where: { titleCardId } }), 1);
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
