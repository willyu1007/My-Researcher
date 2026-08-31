import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { PrismaTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/prisma/prisma-topic-selection-offline-evaluation-replay-repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionResearchArenaCalibrationService } from './topic-selection-research-arena-calibration-service.js';

const RUN_PRISMA = process.env.TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_PRISMA === '1'
  && Boolean(process.env.DATABASE_URL);
const NOW = '2026-08-31T08:00:00.000Z';

const ref = (
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef => ({
  ref_type: refType,
  ref_id: refId,
  version_id: versionId,
  title_card_id: titleCardId,
});

test('Prisma OfflineEvaluation owners converge under concurrent Arena calibration replay', {
  skip: RUN_PRISMA
    ? false
    : 'set TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_PRISMA=1 and DATABASE_URL to run the relational replay',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const offlineRepository = new PrismaTopicSelectionOfflineEvaluationReplayRepository(prisma);
  const offlineService = new TopicSelectionOfflineEvaluationReplayService(offlineRepository, {
    now: () => NOW,
  });
  let clockTick = 0;
  const service = new TopicSelectionResearchArenaCalibrationService({
    offlineRepository,
    offlineService,
    arenaRepository,
    controlPlaneRepository,
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('This relational fixture intentionally has no human label.');
      },
    },
  }, {
    now: () => new Date(Date.parse(NOW) + clockTick++ * 1_000).toISOString(),
  });
  let datasetId: string | null = null;

  try {
    const sessionId = await seedCanonicalLegacyMember({
      suffix,
      controlPlaneRepository,
      arenaRepository,
    });
    const dataset = await service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
      workspace_id: null,
      dataset_key: `phase10a-relational-${suffix}`,
      dataset_version: 'v1',
      description: 'Disposable relational convergence proof.',
    });
    datasetId = dataset.offline_evaluation_dataset_id;
    await service.addCase({
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
      dataset_id: datasetId,
      case_key: 'non-advance-control',
      case_type: 'arena_successful_non_advance',
      members: [{ member_role: 'subject', arena_session_id: sessionId, research_checkpoint_id: null }],
      tags: ['phase10a', 'relational'],
    });
    const run = await service.startRun({
      schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
      dataset_id: datasetId,
      run_key: `phase10a-relational-run-${suffix}`,
    });

    const reports = await Promise.all(Array.from(
      { length: 8 },
      () => service.evaluateRun(run.offline_evaluation_run_id),
    ));
    for (const report of reports.slice(1)) assert.deepEqual(report, reports[0]);
    assert.equal(reports[0]?.recommendation, 'insufficient_evidence');
    assert.equal((await offlineRepository.listCaseResultsByRunId(run.offline_evaluation_run_id)).length, 1);
    assert.equal((await offlineRepository.listMetricResultsByRunId(run.offline_evaluation_run_id)).length, 6);
    assert.equal((await offlineRepository.listReplayDiffsByRunId(run.offline_evaluation_run_id)).length, 1);
  } finally {
    if (datasetId) {
      await prisma.topicSelectionOfflineEvaluationMetricResult.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationCaseResult.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionReplayDiff.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationRun.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationCase.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationDataset.deleteMany({ where: { id: datasetId } });
    }
    await prisma.$disconnect();
  }
});

async function seedCanonicalLegacyMember(input: {
  suffix: string;
  controlPlaneRepository: InMemoryTopicSelectionControlPlaneRepository;
  arenaRepository: InMemoryTopicSelectionResearchArenaRepository;
}): Promise<string> {
  const titleCardId = `title_calibration_${input.suffix}`;
  const snapshotId = `snapshot_calibration_${input.suffix}`;
  const sessionId = `arena_calibration_${input.suffix}`;
  const snapshotHash = sha256Text(`snapshot:${input.suffix}`);
  const targetRef = ref('need_candidate', `candidate_${input.suffix}`, titleCardId, 'v1');
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: snapshotId,
    workspace_id: null,
    title_card_id: titleCardId,
    target_ref: targetRef,
    context_policy_version_id: null,
    policy_version: 'topic-selection-research-arena@v1',
    snapshot_hash: snapshotHash,
    source_refs: [targetRef],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  };
  await input.controlPlaneRepository.createInputSnapshot(snapshot);
  const session: TopicSelectionResearchArenaSessionRecord = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: sessionId,
    session_key: `session-key-${input.suffix}`,
    current_arena_key: `${titleCardId}:gap_portfolio`,
    workspace_id: null,
    title_card_id: titleCardId,
    arena_kind: 'gap_portfolio',
    target_ref: targetRef,
    input_snapshot_id: snapshotId,
    input_snapshot_hash: snapshotHash,
    participant_plan_hash: sha256Text(`plan:${input.suffix}`),
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', `plan_${input.suffix}`, titleCardId),
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: null,
    superseded_at: null,
  };
  await input.arenaRepository.replaceCurrentSession(session);

  const executions: TopicSelectionResearchArenaRoleExecutionRecord[] = [];
  for (const [index, participantRole] of ['opportunity_scout', 'prior_art_topic_killer'].entries()) {
    const role = participantRole as 'opportunity_scout' | 'prior_art_topic_killer';
    const queryIntent = {
      intent_type: 'support' as const,
      query: `${role} query`,
      rationale: `${role} rationale`,
      target_claim: `${role} target`,
    };
    const evidenceRef = ref('evidence_unit', `evidence_${input.suffix}_${index}`, titleCardId);
    const literatureRef = ref('literature_record', `literature_${input.suffix}_${index}`, titleCardId);
    const packetBase = {
      schema_version: 'TopicSelectionResearchEvidencePacket@v1',
      title_card_id: titleCardId,
      participant_role: role,
      query_intent: queryIntent,
      items: [{ evidence_unit_ref: evidenceRef, literature_ref: literatureRef }],
      source_refs: [evidenceRef],
      total_excerpt_chars: 64,
    };
    const packetHash = sha256Text(stableStringify(packetBase));
    const packet = await recordArtifact(input.controlPlaneRepository, {
      artifact_ref_id: `packet_${input.suffix}_${index}`,
      title_card_id: titleCardId,
      input_snapshot_id: snapshotId,
      payload: { ...packetBase, packet_hash: packetHash },
      checksum: packetHash,
    });
    const output = await recordArtifact(input.controlPlaneRepository, {
      artifact_ref_id: `output_${input.suffix}_${index}`,
      title_card_id: titleCardId,
      input_snapshot_id: snapshotId,
      payload: { semantic_position: { summary: `${role} position` } },
    });
    const execution: TopicSelectionResearchArenaRoleExecutionRecord = {
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
      execution_identity_status: 'legacy_unverified',
      arena_role_execution_id: `execution_${input.suffix}_${index}`,
      arena_session_id: sessionId,
      title_card_id: titleCardId,
      role_slot_id: `slot_${index}`,
      instance_index: index,
      participant_role: role,
      pass_kind: 'first_pass',
      input_snapshot_id: snapshotId,
      input_snapshot_hash: snapshotHash,
      query_intent: queryIntent,
      evidence_packet_artifact_ref: ref('artifact_ref', packet.artifact_ref_id, titleCardId),
      evidence_packet_hash: packetHash,
      evidence_partition_refs: [evidenceRef],
      retrieval_provenance: {
        participant_role: role,
        query_intent: queryIntent,
        search_run_ref: ref('search_run', `search_${input.suffix}_${index}`, titleCardId),
        hits: [{
          literature_ref: literatureRef,
          embedding_version_id: 'local-lexical-v1',
          chunk_id: `chunk_${index}`,
          chunk_hash: sha256Text(`chunk:${input.suffix}:${index}`),
          rank: 1,
          hybrid_score: 1,
          vector_score: 0,
          lexical_score: 1,
          is_stale: false,
        }],
        provenance_hash: sha256Text(`retrieval:${input.suffix}:${index}`),
      },
      exposure_artifact_refs: [ref('artifact_ref', packet.artifact_ref_id, titleCardId)],
      exposure_set_hash: sha256Text(`exposure:${input.suffix}:${index}`),
      output_artifact_ref: ref('artifact_ref', output.artifact_ref_id, titleCardId),
      output_artifact_hash: output.checksum!,
      semantic_position_hash: sha256Text(`position:${input.suffix}:${index}`),
      agent_invocation_audit_artifact_ref: null,
      agent_invocation_audit_artifact_hash: null,
      execution_provenance_hash: null,
      prior_role_hashes: [],
      runtime_identity_hash: sha256Text(`runtime:${input.suffix}:${index}`),
      created_at: NOW,
    };
    executions.push(await input.arenaRepository.createRoleExecution(execution));
  }
  const transcriptPayload = {
    schema_version: 'TopicSelectionResearchArenaLoopTranscript@v1',
    arena_session_id: sessionId,
    input_snapshot_id: snapshotId,
    independent_first_pass: executions.map((execution) => ({
      participant_role: execution.participant_role,
      evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
      evidence_packet_hash: execution.evidence_packet_hash,
      exposure_set_hash: execution.exposure_set_hash,
      output_artifact_ref: execution.output_artifact_ref,
      output_artifact_hash: execution.output_artifact_hash,
      prior_role_hashes: execution.prior_role_hashes,
    })),
    advisory_synthesis: {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: 'evidence_expansion_required',
      summary: 'The legacy control remains non-advancing.',
      candidate_dispositions: [{
        candidate_ref: targetRef,
        disposition: 'parked',
        rationale: 'The control needs a material evidence delta.',
        drop_reason_code: null,
        reopening_conditions: ['Material new evidence is required.'],
        selected_against_candidate_ref: null,
        role_positions: executions.map((execution) => ({
          participant_role: execution.participant_role,
          recommended_disposition: 'parked',
        })),
      }],
      preserved_finding_ids: [],
      unresolved_dissent: [],
      required_next_delta: 'evidence',
      support_only: true,
    },
    risk_finding_refs: [],
    execution_accounting: {
      non_provider_role_invocation_count: 2,
      provider_call_count: 0,
      retrieval_run_count: 2,
      retrieval_hit_count: 2,
      evidence_excerpt_chars: 128,
      duration_ms: 25,
    },
    support_only: true,
  };
  const transcript = await recordArtifact(input.controlPlaneRepository, {
    artifact_ref_id: `transcript_${input.suffix}`,
    title_card_id: titleCardId,
    input_snapshot_id: snapshotId,
    payload: transcriptPayload,
  });
  await input.arenaRepository.synthesizeSessionWithCandidateProjections({
    ...session,
    status: 'synthesized',
    termination_reason: 'evidence_expansion_required',
    loop_transcript_ref: ref('artifact_ref', transcript.artifact_ref_id, titleCardId),
    loop_transcript_hash: transcript.checksum!,
    updated_at: NOW,
    synthesized_at: NOW,
  }, []);
  return sessionId;
}

async function recordArtifact(
  repository: InMemoryTopicSelectionControlPlaneRepository,
  input: {
    artifact_ref_id: string;
    title_card_id: string;
    input_snapshot_id: string;
    payload: Record<string, unknown>;
    checksum?: string;
  },
): Promise<TopicSelectionArtifactRefRecord> {
  return repository.createArtifactRef({
    artifact_ref_id: input.artifact_ref_id,
    stable_key: input.artifact_ref_id,
    workspace_id: null,
    title_card_id: input.title_card_id,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    uri: null,
    payload: input.payload,
    checksum: input.checksum ?? sha256Text(stableStringify(input.payload)),
    byte_size: null,
    mime_type: 'application/json',
    workflow_run_id: null,
    input_snapshot_id: input.input_snapshot_id,
    created_by: 'system',
    created_at: NOW,
  });
}
