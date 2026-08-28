import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const NOW = '2026-08-28T00:00:00.000Z';

function ref(refType: string, refId: string) {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_1' };
}

function fixture() {
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_1',
    workspace_id: null,
    title_card_id: 'title_1',
    target_ref: ref('validated_need', 'need_1'),
    context_policy_version_id: null,
    policy_version: 'v1',
    snapshot_hash: 'a'.repeat(64),
    source_refs: [],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  };
  const packetBody = {
    schema_version: 'TopicSelectionResearchEvidencePacket@v1',
    title_card_id: 'title_1',
    participant_role: 'opportunity_scout',
    query_intent: {
      intent_type: 'context' as const,
      query: 'Which adjacent mechanisms are outside the inherited basket?',
      rationale: 'Search outside the inherited framing.',
      target_claim: 'A distinct mechanism exists outside the current basket.',
    },
    items: [{
      evidence_unit_ref: ref('evidence_unit', 'evidence_1'),
      literature_ref: ref('literature_record', 'lit_1'),
    }],
    source_refs: [ref('evidence_unit', 'evidence_1')],
    total_excerpt_chars: 1,
  };
  const packet = { ...packetBody, packet_hash: sha256Text(stableStringify(packetBody)) };
  const killerPacketBody = { ...packetBody, participant_role: 'prior_art_topic_killer' };
  const killerPacket = {
    ...killerPacketBody,
    packet_hash: sha256Text(stableStringify(killerPacketBody)),
  };
  const artifacts = new Map<string, TopicSelectionArtifactRefRecord>([
    ['plan_1', {
      artifact_ref_id: 'plan_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: { plan: 'scout-killer' },
      checksum: sha256Text(stableStringify({ plan: 'scout-killer' })),
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['packet_1', {
      artifact_ref_id: 'packet_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: packet,
      checksum: packet.packet_hash, input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['packet_2', {
      artifact_ref_id: 'packet_2', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: killerPacket,
      checksum: killerPacket.packet_hash, input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['scout_output', {
      artifact_ref_id: 'scout_output', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline',
      payload: { semantic_position: { recommendation: 'candidate-a' } },
      checksum: sha256Text(stableStringify({ semantic_position: { recommendation: 'candidate-a' } })),
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['killer_output', {
      artifact_ref_id: 'killer_output', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline',
      payload: { semantic_position: { objection: 'prior-art collision' } },
      checksum: sha256Text(stableStringify({ semantic_position: { objection: 'prior-art collision' } })),
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['transcript_1', {
      artifact_ref_id: 'transcript_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'trace', storage_kind: 'inline', payload: { recommendation: 'Stop without a candidate.' },
      checksum: sha256Text(stableStringify({ recommendation: 'Stop without a candidate.' })),
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
  ]);
  let id = 0;
  const service = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: {
      findInputSnapshotById: async (snapshotId) => snapshotId === snapshot.input_snapshot_id ? snapshot : null,
      findArtifactRefById: async (artifactId) => artifacts.get(artifactId) ?? null,
    },
  }, { idFactory: (prefix) => `${prefix}_${++id}`, now: () => NOW });
  return { arenaRepository, packet, service };
}

test('arena replaces the current stage only when a recorded loop delta explains the retry', async () => {
  const { arenaRepository, service } = fixture();
  const input = {
    session_key: 'arena-key-1',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio' as const,
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'] as const,
    execution_plan_ref: ref('topic_selection_artifact_ref', 'plan_1'),
  };
  const first = await service.openSession(input);
  assert.equal(first.current_arena_key, 'title_1:gap_portfolio');

  await assert.rejects(
    service.openSession({ ...input, arena_kind: 'question_design' }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  await assert.rejects(
    service.openSession({ ...input, session_key: 'arena-key-2' }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  const second = await service.openSession({
    ...input,
    session_key: 'arena-key-2',
    loop_delta_refs: [{
      delta_type: 'evidence' as const,
      ref: ref('evidence_unit', 'evidence_delta_1'),
      rationale: 'A newly reviewed counterexample changes the candidate ordering.',
    }],
  });
  const previous = await arenaRepository.findSessionById(first.arena_session_id);
  assert.equal(previous?.status, 'superseded');
  assert.equal(second.supersedes_arena_session_id, first.arena_session_id);
});

test('first-pass role execution records chunk provenance and rejects evidence-free or peer-contaminated exposure', async () => {
  const { packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-1',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('topic_selection_artifact_ref', 'plan_1'),
  });
  const retrieval = {
    participant_role: 'opportunity_scout' as const,
    query_intent: packet.query_intent,
    search_run_ref: ref('search_run', 'search_run_1'),
    hits: [{
      literature_ref: ref('literature_record', 'lit_1'),
      embedding_version_id: 'embedding_v1',
      chunk_id: 'chunk_1',
      chunk_hash: 'd'.repeat(64),
      rank: 1,
      hybrid_score: 0.92,
      vector_score: 0.9,
      lexical_score: 0.7,
      is_stale: false,
    }],
  };
  const scout = await service.recordRoleExecution({
    arena_session_id: session.arena_session_id,
    role_slot_id: 'scout',
    instance_index: 0,
    participant_role: 'opportunity_scout',
    pass_kind: 'first_pass',
    evidence_packet_artifact_ref: ref('topic_selection_artifact_ref', 'packet_1'),
    retrieval_provenance: retrieval,
    exposure_artifact_refs: [ref('topic_selection_artifact_ref', 'packet_1')],
    output_artifact_ref: ref('topic_selection_artifact_ref', 'scout_output'),
  });
  assert.equal(scout.evidence_partition_refs[0]?.ref_id, 'evidence_1');
  assert.equal(scout.retrieval_provenance.hits[0]?.chunk_id, 'chunk_1');

  await assert.rejects(
    service.recordRoleExecution({
      arena_session_id: session.arena_session_id,
      role_slot_id: 'killer',
      instance_index: 0,
      participant_role: 'prior_art_topic_killer',
      pass_kind: 'first_pass',
      evidence_packet_artifact_ref: ref('topic_selection_artifact_ref', 'packet_2'),
      retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer' },
      exposure_artifact_refs: [
        ref('topic_selection_artifact_ref', 'packet_2'),
        ref('topic_selection_artifact_ref', 'scout_output'),
      ],
      output_artifact_ref: ref('topic_selection_artifact_ref', 'killer_output'),
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  await assert.rejects(
    service.recordRoleExecution({
      arena_session_id: session.arena_session_id,
      role_slot_id: 'killer',
      instance_index: 0,
      participant_role: 'prior_art_topic_killer',
      pass_kind: 'first_pass',
      evidence_packet_artifact_ref: ref('topic_selection_artifact_ref', 'packet_2'),
      retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer', hits: [] },
      exposure_artifact_refs: [ref('topic_selection_artifact_ref', 'packet_2')],
      output_artifact_ref: ref('topic_selection_artifact_ref', 'killer_output'),
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const killer = await service.recordRoleExecution({
    arena_session_id: session.arena_session_id,
    role_slot_id: 'killer',
    instance_index: 0,
    participant_role: 'prior_art_topic_killer',
    pass_kind: 'first_pass',
    evidence_packet_artifact_ref: ref('topic_selection_artifact_ref', 'packet_2'),
    retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer' },
    exposure_artifact_refs: [ref('topic_selection_artifact_ref', 'packet_2')],
    output_artifact_ref: ref('topic_selection_artifact_ref', 'killer_output'),
  });
  assert.equal(killer.prior_role_hashes.length, 0);

  const synthesized = await service.synthesizeSession({
    arena_session_id: session.arena_session_id,
    termination_reason: 'none_viable',
    loop_transcript_artifact_ref: ref('topic_selection_artifact_ref', 'transcript_1'),
  });
  assert.equal(synthesized.status, 'synthesized');
  assert.equal(synthesized.termination_reason, 'none_viable');
  assert.match(synthesized.loop_transcript_hash ?? '', /^[a-f0-9]{64}$/);
  await assert.rejects(
    service.synthesizeSession({
      arena_session_id: session.arena_session_id,
      termination_reason: 'recommendation_ready',
      loop_transcript_artifact_ref: ref('topic_selection_artifact_ref', 'transcript_1'),
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});
