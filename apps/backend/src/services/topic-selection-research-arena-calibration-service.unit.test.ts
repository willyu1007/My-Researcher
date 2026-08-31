import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaAdvisoryReviewHistory,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/in-memory-topic-selection-offline-evaluation-replay-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionResearchArenaCalibrationService } from './topic-selection-research-arena-calibration-service.js';

const NOW = '2026-08-31T07:00:00.000Z';

type ControlPlaneReads = Pick<
  InMemoryTopicSelectionControlPlaneRepository,
  'findInputSnapshotById' | 'findArtifactRefById' | 'findHumanConfirmedDecisionById'
>;

function createCalibrationHarness(options: {
  controlPlaneReads?: (
    repository: InMemoryTopicSelectionControlPlaneRepository,
  ) => ControlPlaneReads;
  now?: () => string;
  advisoryReviewHistoryReader?: {
    getArenaAdvisoryReviewHistory(
      checkpointId: string,
    ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory>;
  };
} = {}) {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const offlineRepository = new InMemoryTopicSelectionOfflineEvaluationReplayRepository();
  const offlineService = new TopicSelectionOfflineEvaluationReplayService(offlineRepository, {
    idFactory: (prefix) => `${prefix}_1`,
    now: () => NOW,
  });
  const service = new TopicSelectionResearchArenaCalibrationService({
    offlineRepository,
    offlineService,
    arenaRepository,
    controlPlaneRepository: options.controlPlaneReads?.(controlPlaneRepository)
      ?? controlPlaneRepository,
    advisoryReviewHistoryReader: options.advisoryReviewHistoryReader ?? {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('No checkpoint review should be read for an unlabeled calibration member.');
      },
    },
  }, { now: options.now ?? (() => NOW) });
  return { controlPlaneRepository, arenaRepository, offlineRepository, service };
}

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

function invocationProvenance(
  role: 'opportunity_scout' | 'prior_art_topic_killer',
  outputHash: string,
  suffix: string,
): TopicSelectionAgentInvocationProvenance {
  return {
    workflow_run_id: `workflow_${suffix}`,
    node_id: `topic_selection_research_arena_${role}`,
    node_attempt_id: `attempt_${suffix}:${role}`,
    invocation_attempt_id: `attempt_${suffix}:${role}:invocation`,
    execution_mode: 'codex_assisted',
    executor_kind: 'multi_agent_debate',
    source_kind: 'codex_response',
    non_provider: true,
    run_mode: 'acceptance',
    profile_id: `profile_${role}`,
    profile_version: 'v1',
    profile_hash: sha256Text(`profile:${role}`),
    model_option_id: null,
    normalized_params_hash: null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'TopicSelectionResearchArenaRoleOutput@v1',
    prompt_template_id: `prompt_${role}`,
    prompt_template_version: 'v2',
    schema_name: 'TopicSelectionResearchArenaRoleOutput@v1',
    prompt_packet_hash: sha256Text(`prompt:${suffix}:${role}`),
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    operator_label: `agent_${role}`,
    operator_approval_ref: null,
    local_approval_setting_ref: null,
    response_source: 'operator_supplied',
    telemetry: null,
  };
}

function invocationAudit(
  provenance: TopicSelectionAgentInvocationProvenance,
): TopicSelectionAgentInvocationAuditSnapshot {
  return {
    schema_version: 'topic-selection-agent-invocation-audit-v1',
    node_id: provenance.node_id,
    workflow_run_id: provenance.workflow_run_id,
    node_attempt_id: provenance.node_attempt_id,
    status: 'succeeded',
    provenance,
    token_budget_gate_result: null,
    validation: { valid: true, error_count: 0, errors: [] },
    warning_codes: [],
    blocker_codes: [],
    created_at: NOW,
  };
}

async function seedArena(input: {
  arenaRepository: InMemoryTopicSelectionResearchArenaRepository;
  controlPlaneRepository: InMemoryTopicSelectionControlPlaneRepository;
  suffix: string;
  outcome: 'selected' | 'evidence_expansion_required';
  productV2?: boolean;
  mismatchedAuditOutput?: boolean;
  invalidDropJustification?: boolean;
}) {
  const titleCardId = `title_${input.suffix}`;
  const snapshotId = `snapshot_${input.suffix}`;
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

  const executionPlanPayload = { schema_version: 'ExecutionPlan@v1', suffix: input.suffix };
  const executionPlan = await recordArtifact(input.controlPlaneRepository, {
    artifact_ref_id: `execution_plan_${input.suffix}`,
    title_card_id: titleCardId,
    input_snapshot_id: snapshotId,
    payload: executionPlanPayload,
  });
  const sessionId = `arena_${input.suffix}`;
  const openSession: TopicSelectionResearchArenaSessionRecord = {
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
    execution_plan_ref: ref('artifact_ref', executionPlan.artifact_ref_id, titleCardId),
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
  await input.arenaRepository.replaceCurrentSession(openSession);

  const executions: TopicSelectionResearchArenaRoleExecutionRecord[] = [];
  for (const [index, role] of ['opportunity_scout', 'prior_art_topic_killer'].entries()) {
    const queryIntent = {
      intent_type: 'support' as const,
      query: `${role} query`,
      rationale: `${role} rationale`,
      target_claim: `${role} target`,
    };
    const evidencePacketBase = {
      schema_version: 'TopicSelectionResearchEvidencePacket@v1',
      title_card_id: titleCardId,
      participant_role: role,
      query_intent: queryIntent,
      items: [{
        evidence_unit_ref: ref('evidence_unit', `unit_${input.suffix}_${index}`, titleCardId),
        literature_ref: ref('literature_record', `literature_${input.suffix}_${index}`, titleCardId),
      }],
      source_refs: [],
      total_excerpt_chars: 64,
    };
    const packetHash = sha256Text(stableStringify(evidencePacketBase));
    const evidencePacketPayload = { ...evidencePacketBase, packet_hash: packetHash };
    const packet = await recordArtifact(input.controlPlaneRepository, {
      artifact_ref_id: `packet_${input.suffix}_${index}`,
      title_card_id: titleCardId,
      input_snapshot_id: snapshotId,
      payload: evidencePacketPayload,
      checksum: packetHash,
    });
    const output = await recordArtifact(input.controlPlaneRepository, {
      artifact_ref_id: `output_${input.suffix}_${index}`,
      title_card_id: titleCardId,
      input_snapshot_id: snapshotId,
      payload: { semantic_position: { summary: `${role} position` } },
    });
    const provenance = input.productV2
      ? invocationProvenance(
        role as 'opportunity_scout' | 'prior_art_topic_killer',
        input.mismatchedAuditOutput ? sha256Text(`wrong-output:${input.suffix}:${index}`) : output.checksum!,
        input.suffix,
      )
      : null;
    const audit = provenance
      ? await recordArtifact(input.controlPlaneRepository, {
        artifact_ref_id: `audit_${input.suffix}_${index}`,
        title_card_id: titleCardId,
        input_snapshot_id: snapshotId,
        payload: { ...invocationAudit(provenance) },
        artifact_kind: 'diagnostic',
        workflow_run_id: provenance.workflow_run_id,
      })
      : null;
    const executionBase = {
      arena_role_execution_id: `execution_${input.suffix}_${index}`,
      arena_session_id: sessionId,
      title_card_id: titleCardId,
      role_slot_id: `slot_${index}`,
      instance_index: index,
      participant_role: role as 'opportunity_scout' | 'prior_art_topic_killer',
      pass_kind: 'first_pass' as const,
      input_snapshot_id: snapshotId,
      input_snapshot_hash: snapshotHash,
      query_intent: queryIntent,
      evidence_packet_artifact_ref: ref('artifact_ref', packet.artifact_ref_id, titleCardId),
      evidence_packet_hash: packet.checksum!,
      evidence_partition_refs: [ref('evidence_unit', `unit_${input.suffix}_${index}`, titleCardId)],
      retrieval_provenance: {
        participant_role: role as 'opportunity_scout' | 'prior_art_topic_killer',
        query_intent: queryIntent,
        search_run_ref: ref('search_run', `search_${input.suffix}_${index}`, titleCardId),
        hits: [{
          literature_ref: ref('literature_record', `literature_${input.suffix}_${index}`, titleCardId),
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
      prior_role_hashes: [],
      runtime_identity_hash: sha256Text(`runtime:${input.suffix}:${index}`),
      created_at: NOW,
    };
    const execution: TopicSelectionResearchArenaRoleExecutionRecord = provenance && audit
      ? {
        ...executionBase,
        schema_version: 'TopicSelectionResearchArenaRoleExecution@v2',
        execution_identity_status: 'product_invocation_verified',
        agent_invocation_audit_artifact_ref: ref('artifact_ref', audit.artifact_ref_id, titleCardId),
        agent_invocation_audit_artifact_hash: audit.checksum!,
        execution_provenance_hash: sha256Text(stableStringify(provenance)),
      }
      : {
        ...executionBase,
        schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
        execution_identity_status: 'legacy_unverified',
        agent_invocation_audit_artifact_ref: null,
        agent_invocation_audit_artifact_hash: null,
        execution_provenance_hash: null,
      };
    executions.push(await input.arenaRepository.createRoleExecution(execution));
  }

  const independentFirstPass = executions.map((execution) => {
    const legacyIdentity = {
      participant_role: execution.participant_role,
      evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
      evidence_packet_hash: execution.evidence_packet_hash,
      exposure_set_hash: execution.exposure_set_hash,
      output_artifact_ref: execution.output_artifact_ref,
      output_artifact_hash: execution.output_artifact_hash,
      prior_role_hashes: execution.prior_role_hashes,
    };
    return execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
      ? {
        arena_role_execution_id: execution.arena_role_execution_id,
        ...legacyIdentity,
        agent_invocation_audit_artifact_ref: execution.agent_invocation_audit_artifact_ref,
        agent_invocation_audit_artifact_hash: execution.agent_invocation_audit_artifact_hash,
        execution_provenance_hash: execution.execution_provenance_hash,
      }
      : legacyIdentity;
  });
  const transcriptPayload = {
    schema_version: input.productV2
      ? 'TopicSelectionResearchArenaLoopTranscript@v2'
      : 'TopicSelectionResearchArenaLoopTranscript@v1',
    arena_session_id: sessionId,
    input_snapshot_id: snapshotId,
    independent_first_pass: independentFirstPass,
    advisory_synthesis: {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: input.outcome,
      summary: `${input.suffix} outcome`,
      candidate_dispositions: [{
        candidate_ref: targetRef,
        disposition: input.invalidDropJustification
          ? 'dropped'
          : input.outcome === 'selected' ? 'selected' : 'parked',
        rationale: `${input.suffix} disposition`,
        drop_reason_code: null,
        reopening_conditions: input.invalidDropJustification
          ? []
          : input.outcome === 'selected' ? [] : ['Material new evidence is required.'],
        selected_against_candidate_ref: null,
        role_positions: executions.map((execution) => ({
          participant_role: execution.participant_role,
          recommended_disposition: input.invalidDropJustification
            ? 'dropped'
            : input.outcome === 'selected' ? 'selected' : 'parked',
        })),
      }],
      preserved_finding_ids: [],
      unresolved_dissent: [],
      required_next_delta: input.outcome === 'selected' ? null : 'evidence',
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
    ...openSession,
    status: 'synthesized',
    termination_reason: input.outcome === 'selected' ? 'recommendation_ready' : 'evidence_expansion_required',
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
    artifact_kind?: TopicSelectionArtifactRefRecord['artifact_kind'];
    workflow_run_id?: string | null;
  },
): Promise<TopicSelectionArtifactRefRecord> {
  return repository.createArtifactRef({
    artifact_ref_id: input.artifact_ref_id,
    stable_key: input.artifact_ref_id,
    workspace_id: null,
    title_card_id: input.title_card_id,
    artifact_kind: input.artifact_kind ?? 'structured_output',
    storage_kind: 'inline',
    uri: null,
    payload: input.payload,
    checksum: input.checksum ?? sha256Text(stableStringify(input.payload)),
    byte_size: null,
    mime_type: 'application/json',
    workflow_run_id: input.workflow_run_id ?? null,
    input_snapshot_id: input.input_snapshot_id,
    created_by: 'system',
    created_at: NOW,
  });
}

test('current legacy Arena corpus is evaluated from canonical owners as insufficient evidence', async () => {
  let clockTick = 0;
  const {
    controlPlaneRepository,
    arenaRepository,
    offlineRepository,
    service,
  } = createCalibrationHarness({
    now: () => new Date(Date.parse(NOW) + clockTick++ * 1_000).toISOString(),
  });

  const baselineSessionId = await seedArena({
    arenaRepository,
    controlPlaneRepository,
    suffix: 'baseline',
    outcome: 'evidence_expansion_required',
  });
  const preferredSessionId = await seedArena({
    arenaRepository,
    controlPlaneRepository,
    suffix: 'preferred',
    outcome: 'selected',
  });

  const dataset = await service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-current-corpus',
    dataset_version: 'v1',
    description: 'Current legacy Arena evidence.',
  });
  await service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'dominance-pair-1',
    case_type: 'arena_dominance_pair',
    members: [
      { member_role: 'baseline', arena_session_id: baselineSessionId, research_checkpoint_id: null },
      { member_role: 'preferred', arena_session_id: preferredSessionId, research_checkpoint_id: null },
    ],
    tags: ['phase10a'],
  });
  const run = await service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-current-corpus-v1',
  });
  const [report, concurrentReport] = await Promise.all([
    service.evaluateRun(run.offline_evaluation_run_id),
    service.evaluateRun(run.offline_evaluation_run_id),
  ]);

  assert.deepEqual(concurrentReport, report);
  assert.equal(report.recommendation, 'insufficient_evidence');
  assert.equal(report.support_only, true);
  assert.equal(report.product_v2_member_count, 0);
  assert.equal(report.case_type_counts.arena_dominance_pair, 1);
  assert.ok(report.coverage_gaps.includes('MISSING_SECOND_DOMINANCE_PAIR'));
  assert.ok(report.coverage_gaps.includes('MISSING_PRODUCT_V2_EXECUTION'));
  assert.ok(report.coverage_gaps.includes('MISSING_ACCEPT_LABEL'));
  assert.equal(report.hard_blockers.length, 0);
  assert.match(report.human_markdown, /证据不足/u);
  assert.doesNotMatch(report.human_markdown, /MISSING_|CALIBRATION_/u);
  assert.ok(JSON.stringify(report.llm_working_set).length > report.human_markdown.length);

  const persistedRun = await offlineRepository.findRunById(run.offline_evaluation_run_id);
  assert.equal(persistedRun?.status, 'completed');
  assert.equal((await offlineRepository.listCaseResultsByRunId(run.offline_evaluation_run_id)).length, 1);
  assert.equal((await offlineRepository.listMetricResultsByRunId(run.offline_evaluation_run_id)).length, 6);
  assert.deepEqual(await service.getReport(run.offline_evaluation_run_id), report);
});

test('changed canonical snapshot identity fails before any evaluation result is written', async () => {
  let tamperSnapshot = false;
  const {
    controlPlaneRepository,
    arenaRepository,
    offlineRepository,
    service,
  } = createCalibrationHarness({
    controlPlaneReads: (repository) => ({
      findInputSnapshotById: async (inputSnapshotId) => {
        const snapshot = await repository.findInputSnapshotById(inputSnapshotId);
        if (!snapshot || !tamperSnapshot) return snapshot;
        return {
          ...snapshot,
          source_refs: [
            ...snapshot.source_refs,
            ref('evidence_unit', 'forged_after_case_freeze', snapshot.title_card_id ?? 'forged_title'),
          ],
        };
      },
      findArtifactRefById: (artifactRefId) => repository.findArtifactRefById(artifactRefId),
      findHumanConfirmedDecisionById: (decisionId) =>
        repository.findHumanConfirmedDecisionById(decisionId),
    }),
  });
  const sessionId = await seedArena({
    arenaRepository,
    controlPlaneRepository,
    suffix: 'drift',
    outcome: 'evidence_expansion_required',
  });
  const dataset = await service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-drift',
    dataset_version: 'v1',
    description: 'Source drift guard.',
  });
  await service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'non-advance-drift',
    case_type: 'arena_successful_non_advance',
    members: [{ member_role: 'subject', arena_session_id: sessionId, research_checkpoint_id: null }],
    tags: ['phase10a'],
  });
  const run = await service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-drift-v1',
  });

  tamperSnapshot = true;
  await assert.rejects(
    service.evaluateRun(run.offline_evaluation_run_id),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /source identity drifted/u.test(error.message),
  );
  assert.equal((await offlineRepository.findRunById(run.offline_evaluation_run_id))?.status, 'running');
  assert.equal((await offlineRepository.listCaseResultsByRunId(run.offline_evaluation_run_id)).length, 0);
  assert.equal((await offlineRepository.listMetricResultsByRunId(run.offline_evaluation_run_id)).length, 0);
  assert.equal((await offlineRepository.listReplayDiffsByRunId(run.offline_evaluation_run_id)).length, 0);
});

test('product-v2 coverage requires an exact non-provider audit identity', async () => {
  const valid = createCalibrationHarness();
  const validSessionId = await seedArena({
    arenaRepository: valid.arenaRepository,
    controlPlaneRepository: valid.controlPlaneRepository,
    suffix: 'product_v2',
    outcome: 'selected',
    productV2: true,
  });
  const dataset = await valid.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-product-v2',
    dataset_version: 'v1',
    description: 'Product-v2 provenance fixture.',
  });
  await valid.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'advancing-product-v2',
    case_type: 'arena_advancing_case',
    members: [{ member_role: 'subject', arena_session_id: validSessionId, research_checkpoint_id: null }],
    tags: ['phase10a'],
  });
  const run = await valid.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-product-v2-v1',
  });
  const report = await valid.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.product_v2_member_count, 1);
  assert.equal(report.coverage_gaps.includes('MISSING_PRODUCT_V2_EXECUTION'), false);
  assert.equal(report.case_results[0]?.members[0]?.execution_independence_passed, true);

  const mismatched = createCalibrationHarness();
  const mismatchedSessionId = await seedArena({
    arenaRepository: mismatched.arenaRepository,
    controlPlaneRepository: mismatched.controlPlaneRepository,
    suffix: 'mismatched_audit',
    outcome: 'selected',
    productV2: true,
    mismatchedAuditOutput: true,
  });
  const mismatchedDataset = await mismatched.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-mismatched-audit',
    dataset_version: 'v1',
    description: 'Mismatched product audit fixture.',
  });
  await assert.rejects(
    mismatched.service.addCase({
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
      dataset_id: mismatchedDataset.offline_evaluation_dataset_id,
      case_key: 'mismatched-product-audit',
      case_type: 'arena_advancing_case',
      members: [{
        member_role: 'subject',
        arena_session_id: mismatchedSessionId,
        research_checkpoint_id: null,
      }],
      tags: ['phase10a'],
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /audit identity does not match/u.test(error.message),
  );
  assert.equal(
    (await mismatched.offlineRepository.listCasesByDatasetId(
      mismatchedDataset.offline_evaluation_dataset_id,
    )).length,
    0,
  );
});

test('an uncoded or non-reopenable drop is a hard blocker rather than an activation signal', async () => {
  const harness = createCalibrationHarness();
  const sessionId = await seedArena({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    suffix: 'invalid_drop',
    outcome: 'evidence_expansion_required',
    invalidDropJustification: true,
  });
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-invalid-drop',
    dataset_version: 'v1',
    description: 'Invalid drop blocker fixture.',
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'invalid-drop-control',
    case_type: 'arena_successful_non_advance',
    members: [{ member_role: 'subject', arena_session_id: sessionId, research_checkpoint_id: null }],
    tags: ['phase10a'],
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-invalid-drop-v1',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.recommendation, 'remain_advisory');
  assert.ok(report.hard_blockers.some((blocker) => blocker.code === 'INVALID_DROP_JUSTIFICATION'));
});

test('an override of a non-advance recommendation does not satisfy non-advance label coverage', async () => {
  const suffix = 'override_label';
  const titleCardId = `title_${suffix}`;
  const checkpointId = `checkpoint_${suffix}`;
  const candidateRef = ref('need_candidate', `candidate_${suffix}`, titleCardId, 'v1');
  const gapSelectionReview = {
    research_checkpoint_id: checkpointId,
    confirmed_candidate_pool_hash: sha256Text(`pool:${suffix}`),
    selected_candidate_ref: candidateRef,
    direct_prior_art_pressure_reviewed: true,
    disconfirming_evidence_reviewed: true,
    candidate_reviews: [{
      need_candidate_ref: candidateRef,
      disposition: 'selected' as const,
      distinct_from_selected_axes: ['mechanism' as const],
      rationale: 'The researcher intentionally advances against the Arena stop.',
      rejection_reason: null,
    }],
  };
  const reviewRef = ref('artifact_ref', `review_${suffix}`, titleCardId);
  const history: TopicSelectionResearchArenaAdvisoryReviewHistory = {
    schema_version: 'TopicSelectionResearchArenaAdvisoryReviewHistory@v1',
    research_checkpoint_id: checkpointId,
    title_card_id: titleCardId,
    gap_input_snapshot_id: `snapshot_${suffix}`,
    checkpoint_currentness: 'current',
    reviews: [{
      review_ref: reviewRef,
      review: {
        schema_version: 'TopicSelectionResearchArenaAdvisoryReview@v1',
        review_id: `review_${suffix}`,
        title_card_id: titleCardId,
        research_checkpoint_id: checkpointId,
        gap_input_snapshot_id: `snapshot_${suffix}`,
        confirmed_candidate_pool_hash: gapSelectionReview.confirmed_candidate_pool_hash,
        advisory_snapshot_hash: sha256Text(`advisory:${suffix}`),
        response: 'override',
        rationale: 'Advance despite the evidence-expansion recommendation.',
        reason_codes: ['ADVANCE_BEFORE_EVIDENCE_EXPANSION'],
        actor: { actor_type: 'human', actor_id: 'researcher_1' },
        human_gap_selection_review: gapSelectionReview,
        human_gap_selection_review_hash: sha256Text(stableStringify(gapSelectionReview)),
        selected_candidate_ref: candidateRef,
        human_confirm_need_intent: null,
        support_only: true,
        created_at: NOW,
      },
      advancement_binding: { status: 'proposed', human_confirmed_decision_ref: null },
    }],
    projection_issues: [],
    reopen_signals: [{
      signal_type: 'advanced_against_stop',
      status: 'proposed',
      review_ref: reviewRef,
      selected_candidate_ref: candidateRef,
      reason_codes: ['ADVANCE_BEFORE_EVIDENCE_EXPANSION'],
      human_confirmed_decision_ref: null,
    }],
    history_hash: sha256Text(`history:${suffix}`),
  };
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => history,
    },
  });
  const sessionId = await seedArena({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    suffix,
    outcome: 'evidence_expansion_required',
  });
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-override-label',
    dataset_version: 'v1',
    description: 'Non-advance label semantics fixture.',
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'overridden-non-advance',
    case_type: 'arena_successful_non_advance',
    members: [{ member_role: 'subject', arena_session_id: sessionId, research_checkpoint_id: checkpointId }],
    tags: ['phase10a'],
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-override-label-v1',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.human_label_counts.override, 1);
  assert.equal(report.human_label_counts.non_advance, 0);
  assert.ok(report.coverage_gaps.includes('MISSING_NON_ADVANCE_LABEL'));
});

test('report reads fail closed on malformed persisted Arena observations', async () => {
  const harness = createCalibrationHarness();
  const sessionId = await seedArena({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    suffix: 'persisted_observation_drift',
    outcome: 'evidence_expansion_required',
  });
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'phase10a-persisted-observation-drift',
    dataset_version: 'v1',
    description: 'Persisted result integrity fixture.',
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'persisted-observation-drift',
    case_type: 'arena_successful_non_advance',
    members: [{ member_role: 'subject', arena_session_id: sessionId, research_checkpoint_id: null }],
    tags: ['phase10a'],
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10a-persisted-observation-drift-v1',
  });
  await harness.service.evaluateRun(run.offline_evaluation_run_id);

  const listCaseResults = harness.offlineRepository.listCaseResultsByRunId
    .bind(harness.offlineRepository);
  harness.offlineRepository.listCaseResultsByRunId = async (runId) => {
    const records = await listCaseResults(runId);
    return records.map((record) => {
      const observation = record.observed_output.payload.research_arena_calibration;
      assert.ok(observation && typeof observation === 'object' && !Array.isArray(observation));
      const members = Reflect.get(observation, 'members');
      assert.ok(Array.isArray(members) && members.length > 0);
      return {
        ...record,
        observed_output: {
          ...record.observed_output,
          payload: {
            ...record.observed_output.payload,
            research_arena_calibration: {
              ...observation,
              members: [{ ...members[0], source_hash: 'tampered' }, ...members.slice(1)],
            },
          },
        },
      };
    });
  };

  await assert.rejects(
    harness.service.getReport(run.offline_evaluation_run_id),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /case result is malformed/u.test(error.message),
  );
});
