import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { PrismaTopicSelectionResearchArenaRepository } from './prisma-topic-selection-research-arena-repository.js';

const RUN_PRISMA = Boolean(process.env.DATABASE_URL);
const HASH = 'a'.repeat(64);
const NOW = '2026-08-28T00:00:00.000Z';

test('Prisma arena repository enforces one-current session and role execution identities', {
  skip: RUN_PRISMA ? false : 'set DATABASE_URL to run Prisma arena integration tests',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const repository = new PrismaTopicSelectionResearchArenaRepository(prisma);
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const titleCardId = `title_arena_${suffix}`;
  const artifactRef = (id: string) => ({
    ref_type: 'topic_selection_artifact_ref',
    ref_id: `${id}_${suffix}`,
    title_card_id: titleCardId,
  });
  const session = (version: number): TopicSelectionResearchArenaSessionRecord => ({
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: `arena_${version}_${suffix}`,
    session_key: `session_${version}_${suffix}`,
    current_arena_key: `${titleCardId}:gap_portfolio`,
    workspace_id: null,
    title_card_id: titleCardId,
    arena_kind: 'gap_portfolio',
    target_ref: { ref_type: 'validated_need', ref_id: `need_${suffix}`, title_card_id: titleCardId },
    input_snapshot_id: `snapshot_${version}_${suffix}`,
    input_snapshot_hash: String(version).repeat(64),
    participant_plan_hash: HASH,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: artifactRef('plan'),
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    loop_delta_refs: version === 1 ? [] : [{
      delta_type: 'evidence',
      ref: { ref_type: 'evidence_unit', ref_id: `delta_${suffix}`, title_card_id: titleCardId },
      rationale: 'New counterevidence changes the portfolio.',
    }],
    support_only: true,
    supersedes_arena_session_id: version === 1 ? null : `arena_1_${suffix}`,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: new Date(Date.parse(NOW) + version * 1_000).toISOString(),
    updated_at: new Date(Date.parse(NOW) + version * 1_000).toISOString(),
    synthesized_at: null,
    superseded_at: null,
  });

  try {
    const first = await repository.replaceCurrentSession(session(1));
    const second = await repository.replaceCurrentSession(session(2));
    assert.equal(second.supersedes_arena_session_id, first.arena_session_id);
    assert.equal((await repository.findSessionById(first.arena_session_id))?.status, 'superseded');
    assert.equal(await prisma.topicSelectionResearchArenaSession.count({
      where: { titleCardId, currentArenaKey: { not: null } },
    }), 1);

    const role: TopicSelectionResearchArenaRoleExecutionRecord = {
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
      arena_role_execution_id: `role_1_${suffix}`,
      arena_session_id: second.arena_session_id,
      title_card_id: titleCardId,
      role_slot_id: 'scout',
      instance_index: 0,
      participant_role: 'opportunity_scout',
      pass_kind: 'first_pass',
      input_snapshot_id: second.input_snapshot_id,
      input_snapshot_hash: second.input_snapshot_hash,
      query_intent: {
        intent_type: 'context',
        query: 'Find adjacent mechanisms.',
        rationale: 'Search outside the inherited basket.',
        target_claim: 'A distinct mechanism exists.',
      },
      evidence_packet_artifact_ref: artifactRef('packet'),
      evidence_packet_hash: 'b'.repeat(64),
      evidence_partition_refs: [{ ref_type: 'evidence_unit', ref_id: `evidence_${suffix}` }],
      retrieval_provenance: {
        participant_role: 'opportunity_scout',
        query_intent: {
          intent_type: 'context',
          query: 'Find adjacent mechanisms.',
          rationale: 'Search outside the inherited basket.',
          target_claim: 'A distinct mechanism exists.',
        },
        search_run_ref: { ref_type: 'search_run', ref_id: `search_${suffix}` },
        hits: [{
          literature_ref: { ref_type: 'literature_record', ref_id: `lit_${suffix}` },
          embedding_version_id: `embedding_${suffix}`,
          chunk_id: `chunk_${suffix}`,
          chunk_hash: 'c'.repeat(64),
          rank: 1,
          hybrid_score: 0.9,
          vector_score: 0.8,
          lexical_score: 0.7,
          is_stale: false,
        }],
        provenance_hash: 'd'.repeat(64),
      },
      exposure_artifact_refs: [artifactRef('packet')],
      exposure_set_hash: 'e'.repeat(64),
      output_artifact_ref: artifactRef('output'),
      output_artifact_hash: 'f'.repeat(64),
      semantic_position_hash: '1'.repeat(64),
      prior_role_hashes: [],
      runtime_identity_hash: '2'.repeat(64),
      created_at: NOW,
    };
    await repository.createRoleExecution(role);
    await assert.rejects(
      repository.createRoleExecution({
        ...role,
        arena_role_execution_id: `role_2_${suffix}`,
        runtime_identity_hash: '3'.repeat(64),
        semantic_position_hash: '4'.repeat(64),
      }),
      /identity already exists/u,
    );
    assert.equal((await repository.listRoleExecutionsBySessionId(second.arena_session_id)).length, 1);

    const synthesized: TopicSelectionResearchArenaSessionRecord = {
      ...second,
      status: 'synthesized',
      termination_reason: 'none_viable',
      loop_transcript_ref: artifactRef('transcript'),
      loop_transcript_hash: '5'.repeat(64),
      updated_at: new Date(Date.parse(NOW) + 3_000).toISOString(),
      synthesized_at: new Date(Date.parse(NOW) + 3_000).toISOString(),
    };
    await repository.updateSession(synthesized);
    await assert.rejects(repository.updateSession({
      ...synthesized,
      termination_reason: 'recommendation_ready',
    }), /changed concurrently/u);
    await assert.rejects(repository.createRoleExecution({
      ...role,
      arena_role_execution_id: `role_after_synthesis_${suffix}`,
      role_slot_id: 'killer',
      participant_role: 'prior_art_topic_killer',
      runtime_identity_hash: '6'.repeat(64),
      semantic_position_hash: '7'.repeat(64),
    }), /not current and open/u);
  } finally {
    await prisma.topicSelectionResearchArenaRoleExecution.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchArenaSession.deleteMany({ where: { titleCardId } });
    await prisma.$disconnect();
  }
});
