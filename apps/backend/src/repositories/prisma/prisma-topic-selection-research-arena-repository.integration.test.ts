import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { sha256Text, stableStringify } from '../../services/literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from '../../services/topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from '../../services/topic-selection-research-checkpoint-service.js';
import {
  TopicSelectionResearchGapProjectionService,
} from '../../services/topic-selection-research-gap-projection-service.js';
import { PrismaTopicSelectionControlPlaneRepository } from './prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionNeedValidationRepository } from './prisma-topic-selection-need-validation-repository.js';
import {
  PrismaTopicSelectionResearchCheckpointRepository,
} from './prisma-topic-selection-research-checkpoint-repository.js';
import { PrismaTopicSelectionResearchArenaRepository } from './prisma-topic-selection-research-arena-repository.js';

const RUN_PRISMA = process.env.TOPIC_SELECTION_RESEARCH_ARENA_PRISMA === '1'
  && Boolean(process.env.DATABASE_URL);
const HASH = 'a'.repeat(64);
const NOW = '2026-08-28T00:00:00.000Z';

test('Prisma arena repository enforces execution identity and concurrent gap projection recovery', {
  skip: RUN_PRISMA
    ? false
    : 'set TOPIC_SELECTION_RESEARCH_ARENA_PRISMA=1 and DATABASE_URL to run the Prisma arena integration test',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const repository = new PrismaTopicSelectionResearchArenaRepository(prisma);
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const titleCardId = `title_arena_${suffix}`;
  const artifactRef = (id: string) => ({
    ref_type: 'artifact_ref',
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
    await repository.updateSession({
      ...first,
      status: 'blocked',
      termination_reason: 'policy_blocked',
      updated_at: new Date(Date.parse(NOW) + 1_500).toISOString(),
    });
    const second = await repository.replaceCurrentSession(session(2));
    assert.equal(second.supersedes_arena_session_id, first.arena_session_id);
    assert.equal((await repository.findSessionById(first.arena_session_id))?.status, 'superseded');
    assert.equal(await prisma.topicSelectionResearchArenaSession.count({
      where: { titleCardId, currentArenaKey: { not: null } },
    }), 1);

    const activeFence = await repository.replaceCurrentSession({
      ...session(1),
      arena_session_id: `arena_fence_${suffix}`,
      session_key: `session_fence_${suffix}`,
      arena_kind: 'comparative_value',
      current_arena_key: `${titleCardId}:comparative_value`,
      loop_delta_refs: [],
      supersedes_arena_session_id: null,
    });
    assert.equal((await repository.claimSessionExecution(activeFence.arena_session_id))?.status, 'executing');
    await assert.rejects(
      repository.replaceCurrentSession({
        ...activeFence,
        arena_session_id: `arena_fence_competing_${suffix}`,
        session_key: `session_fence_competing_${suffix}`,
        status: 'open',
        created_at: new Date(Date.parse(NOW) + 2_000).toISOString(),
        updated_at: new Date(Date.parse(NOW) + 2_000).toISOString(),
      }),
      /active arena cannot be superseded/u,
    );
    assert.equal(
      (await repository.findCurrentSession(titleCardId, 'comparative_value'))?.arena_session_id,
      activeFence.arena_session_id,
    );

    const role: TopicSelectionResearchArenaRoleExecutionRecord = {
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
      execution_identity_status: 'legacy_unverified',
      agent_invocation_audit_artifact_ref: null,
      agent_invocation_audit_artifact_hash: null,
      execution_provenance_hash: null,
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
    const verifiedRole: TopicSelectionResearchArenaRoleExecutionRecord = {
      ...role,
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v2',
      execution_identity_status: 'product_invocation_verified',
      arena_role_execution_id: `role_verified_${suffix}`,
      role_slot_id: 'killer',
      participant_role: 'prior_art_topic_killer',
      agent_invocation_audit_artifact_ref: artifactRef('invocation_audit'),
      agent_invocation_audit_artifact_hash: '3'.repeat(64),
      execution_provenance_hash: '4'.repeat(64),
      semantic_position_hash: '5'.repeat(64),
      runtime_identity_hash: '6'.repeat(64),
    };
    await repository.createRoleExecution(verifiedRole);
    const durableVerifiedRole = await repository.findRoleExecutionBySlot(
      second.arena_session_id,
      'killer',
      0,
    );
    assert.equal(durableVerifiedRole?.schema_version, 'TopicSelectionResearchArenaRoleExecution@v2');
    assert.equal(durableVerifiedRole?.execution_identity_status, 'product_invocation_verified');
    assert.equal(durableVerifiedRole?.agent_invocation_audit_artifact_hash, '3'.repeat(64));
    assert.equal((await repository.listRoleExecutionsBySessionId(second.arena_session_id)).length, 2);

    const candidateId = `candidate_${suffix}`;
    const candidateRef = {
      ref_type: 'need_candidate',
      ref_id: candidateId,
      title_card_id: titleCardId,
      version_id: 'v1',
    };
    await prisma.topicSelectionNeedCandidate.create({ data: {
      id: candidateId,
      titleCardId,
      evidenceMapId: `evidence_map_${suffix}`,
      candidateVersion: 'v1',
      lifecycleStatus: 'hypothesis',
      decisionStatus: 'hypothesis',
      reviewStatus: 'unreviewed',
      freshnessStatus: 'current',
      candidateNeed: 'A durable candidate projection is required.',
      unmetNeedStatement: 'The arena advisory is not yet recoverable from the candidate.',
      mechanismType: 'workflow_gap',
      mechanismPayload: {},
      priorArtStatus: 'no_strong_solution_found',
      evidenceMapRef: {
        ref_type: 'evidence_map', ref_id: `evidence_map_${suffix}`, title_card_id: titleCardId,
      },
      searchRunId: `search_run_${suffix}`,
      searchPlanId: `search_plan_${suffix}`,
      literatureSnapshotId: `literature_snapshot_${suffix}`,
      searchRunRef: { ref_type: 'search_run', ref_id: `search_run_${suffix}`, title_card_id: titleCardId },
      searchPlanRef: { ref_type: 'search_plan', ref_id: `search_plan_${suffix}`, title_card_id: titleCardId },
      literatureSnapshotRef: {
        ref_type: 'literature_snapshot', ref_id: `literature_snapshot_${suffix}`, title_card_id: titleCardId,
      },
      evidenceRoleBundle: {
        support_unit_refs: [], challenge_unit_refs: [], baseline_unit_refs: [], context_unit_refs: [],
      },
      createdBy: 'system',
      createdAt: new Date(NOW),
      updatedAt: new Date(NOW),
    } });

    const transcriptPayload = {
      schema_version: 'TopicSelectionResearchArenaLoopTranscript@v2',
      arena_session_id: second.arena_session_id,
      input_snapshot_id: second.input_snapshot_id,
      independent_first_pass: [],
      advisory_synthesis: {
        schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
        outcome: 'none_viable',
        summary: 'The exact audited synthesis found no viable candidate.',
        candidate_dispositions: [{
          candidate_ref: candidateRef,
          disposition: 'dropped',
          rationale: 'The exact audited synthesis found a coded stop.',
          drop_reason_code: 'near_isomorphic_prior_art',
          reopening_conditions: ['A materially distinct mechanism is documented.'],
          selected_against_candidate_ref: null,
          role_positions: [
            { participant_role: 'opportunity_scout', recommended_disposition: 'dropped' },
            { participant_role: 'prior_art_topic_killer', recommended_disposition: 'dropped' },
          ],
        }],
        preserved_finding_ids: [],
        unresolved_dissent: [],
        required_next_delta: null,
        support_only: true,
      },
      risk_finding_refs: [],
      execution_accounting: {
        non_provider_role_invocation_count: 2,
        provider_call_count: 0,
        retrieval_run_count: 2,
        retrieval_hit_count: 2,
        evidence_excerpt_chars: 120,
        duration_ms: 25,
      },
      support_only: true,
    };
    const transcriptHash = sha256Text(stableStringify(transcriptPayload));
    const controlPlaneRepository = new PrismaTopicSelectionControlPlaneRepository(prisma);
    await controlPlaneRepository.createInputSnapshot({
      input_snapshot_id: second.input_snapshot_id,
      workspace_id: null,
      title_card_id: titleCardId,
      target_ref: second.target_ref,
      context_policy_version_id: null,
      policy_version: null,
      snapshot_hash: second.input_snapshot_hash,
      source_refs: [candidateRef],
      permission_refs: [],
      payload: { candidate_refs: [candidateRef] },
      created_by: 'system',
      created_at: NOW,
    });
    await controlPlaneRepository.createArtifactRef({
      artifact_ref_id: artifactRef('transcript').ref_id,
      stable_key: null,
      workspace_id: null,
      title_card_id: titleCardId,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      uri: null,
      payload: transcriptPayload,
      checksum: transcriptHash,
      byte_size: null,
      mime_type: 'application/json',
      workflow_run_id: null,
      input_snapshot_id: second.input_snapshot_id,
      created_by: 'system',
      created_at: NOW,
    });
    const synthesized: TopicSelectionResearchArenaSessionRecord = {
      ...second,
      status: 'synthesized',
      termination_reason: 'none_viable',
      loop_transcript_ref: artifactRef('transcript'),
      loop_transcript_hash: transcriptHash,
      updated_at: new Date(Date.parse(NOW) + 3_000).toISOString(),
      synthesized_at: new Date(Date.parse(NOW) + 3_000).toISOString(),
    };
    await repository.synthesizeSessionWithCandidateProjections(synthesized, [{
      candidate_ref: candidateRef,
      semantic_group_key: '8'.repeat(64),
      advisory: {
        schema_version: 'TopicSelectionNeedCandidateArenaAdvisory@v1',
        arena_session_id: synthesized.arena_session_id,
        arena_synthesis_ref: artifactRef('transcript'),
        arena_synthesis_hash: transcriptHash,
        disposition: 'dropped',
        rationale: 'The exact audited synthesis found a coded stop.',
        drop_reason_code: 'near_isomorphic_prior_art',
        reopening_conditions: ['A materially distinct mechanism is documented.'],
        selected_against_candidate_ref: null,
        support_only: true,
      },
    }]);
    const projectedCandidate = await prisma.topicSelectionNeedCandidate.findUniqueOrThrow({
      where: { id: candidateId },
    });
    assert.equal(projectedCandidate.semanticGroupKey, '8'.repeat(64));
    assert.ok(projectedCandidate.currentArenaAdvisory
      && typeof projectedCandidate.currentArenaAdvisory === 'object'
      && !Array.isArray(projectedCandidate.currentArenaAdvisory));
    assert.equal(Reflect.get(projectedCandidate.currentArenaAdvisory, 'disposition'), 'dropped');
    assert.equal(projectedCandidate.decisionStatus, 'hypothesis');
    assert.equal(projectedCandidate.lifecycleStatus, 'hypothesis');
    assert.equal(projectedCandidate.reviewStatus, 'unreviewed');
    assert.equal(projectedCandidate.freshnessStatus, 'current');
    await assert.rejects(repository.updateSession({
      ...synthesized,
      termination_reason: 'recommendation_ready',
    }), /changed concurrently/u);
    await assert.rejects(repository.createRoleExecution({
      ...role,
      arena_role_execution_id: `role_after_synthesis_${suffix}`,
      role_slot_id: 'killer',
      participant_role: 'prior_art_topic_killer',
      runtime_identity_hash: '9'.repeat(64),
      semantic_position_hash: 'a'.repeat(64),
    }), /not current and open/u);

    const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository);
    const checkpointService = new TopicSelectionResearchCheckpointService(
      new PrismaTopicSelectionResearchCheckpointRepository(prisma),
      controlPlane,
      { arenaRepository: repository },
    );
    const gapProjectionService = new TopicSelectionResearchGapProjectionService({
      arenaRepository: repository,
      candidateRepository: new PrismaTopicSelectionNeedValidationRepository(prisma),
      checkpointService,
      controlPlane,
    });
    const recovered = await Promise.all([
      gapProjectionService.recoverSynthesizedSession(synthesized.arena_session_id),
      gapProjectionService.recoverSynthesizedSession(synthesized.arena_session_id),
    ]);
    assert.equal(recovered[0].research_checkpoint_id, recovered[1].research_checkpoint_id);
    assert.equal(await prisma.topicSelectionResearchCheckpoint.count({ where: { titleCardId } }), 1);
    assert.equal((await checkpointService.getPacket(recovered[0].research_checkpoint_id))
      .packet_payload.arena_advisory_issue_codes instanceof Array, true);
    assert.equal((await repository.listRoleExecutionsBySessionId(synthesized.arena_session_id)).length, 2);
  } finally {
    await prisma.topicSelectionResearchCheckpoint.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionNeedCandidate.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchArenaRoleExecution.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionResearchArenaSession.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionArtifactRef.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionInputSnapshot.deleteMany({ where: { titleCardId } });
    await prisma.$disconnect();
  }
});
