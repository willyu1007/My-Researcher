import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import type {
  TopicSelectionResearchArenaCalibrationMemberRecipe,
  TopicSelectionResearchArenaCalibrationProtocolV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-calibration-contracts';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaAdvisoryReviewHistory,
  TopicSelectionResearchStageManifest,
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
    getArenaAdvisoryReviewHistoryForSession(
      titleCardId: string,
      arenaSessionId: string,
    ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory | null>;
    getStageManifest(titleCardId: string): Promise<TopicSelectionResearchStageManifest>;
  };
} = {}) {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const offlineRepository = new InMemoryTopicSelectionOfflineEvaluationReplayRepository();
  const idCounts = new Map<string, number>();
  const offlineService = new TopicSelectionOfflineEvaluationReplayService(offlineRepository, {
    idFactory: (prefix) => {
      const count = (idCounts.get(prefix) ?? 0) + 1;
      idCounts.set(prefix, count);
      return `${prefix}_${count}`;
    },
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
      getArenaAdvisoryReviewHistoryForSession: async () => null,
      getStageManifest: async (titleCardId) => ({
        schema_version: 'TopicSelectionResearchStageManifest@v1',
        title_card_id: titleCardId,
        current_stage: null,
        next_human_decision_stage: null,
        stages: [],
        manifest_hash: sha256Text(`manifest:${titleCardId}`),
      }),
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

function phase10bMemberRecipe(
  memberRole: TopicSelectionResearchArenaCalibrationMemberRecipe['member_role'],
  suffix: string,
  titleSuffix = suffix,
  loopDelta: TopicSelectionResearchArenaCalibrationMemberRecipe['loop_delta'] = null,
): TopicSelectionResearchArenaCalibrationMemberRecipe {
  const titleCardId = `title_${titleSuffix}`;
  return {
    member_role: memberRole,
    session_key: `session-key-${suffix}`,
    title_card_id: titleCardId,
    input_snapshot_ref: ref('input_snapshot', `snapshot_${suffix}`, titleCardId, sha256Text(`snapshot:${suffix}`)),
    candidate_refs: [ref('need_candidate', `candidate_${titleSuffix}`, titleCardId, 'v1')],
    evidence_refs: [ref('evidence_map', `evidence_${suffix}`, titleCardId, 'v1')],
    label_slot_key: `label-${suffix}`,
    label_actor: { actor_type: 'human', actor_id: 'researcher_1' },
    loop_delta: loopDelta,
  };
}

function phase10bProtocol(): TopicSelectionResearchArenaCalibrationProtocolV2 {
  const causalDelta = ref('evidence_map', 'evidence_causal_variant', 'title_causal', 'v2');
  const irrelevantDelta = ref('evidence_map', 'evidence_irrelevant_variant', 'title_irrelevant', 'v2');
  const causalControl = phase10bMemberRecipe('control', 'causal_control', 'causal');
  const causalVariant = phase10bMemberRecipe('variant', 'causal_variant', 'causal', {
    delta_type: 'evidence',
    ref: causalDelta,
    classification: 'causal',
    rationale: 'Add the predeclared mechanism evidence only.',
  });
  causalVariant.evidence_refs = [...causalControl.evidence_refs, causalDelta];
  const irrelevantControl = phase10bMemberRecipe('control', 'irrelevant_control', 'irrelevant');
  const irrelevantVariant = phase10bMemberRecipe('variant', 'irrelevant_variant', 'irrelevant', {
    delta_type: 'evidence',
    ref: irrelevantDelta,
    classification: 'irrelevant',
    rationale: 'Add the predeclared unrelated evidence only.',
  });
  irrelevantVariant.evidence_refs = [...irrelevantControl.evidence_refs, irrelevantDelta];
  return {
    schema_version: 'TopicSelectionResearchArenaCalibrationProtocol@v2',
    slots: [{
      slot_key: 'dominance-1',
      case_type: 'arena_dominance_pair',
      tranche: 'first',
      members: [
        phase10bMemberRecipe('baseline', 'dominance_1_baseline'),
        phase10bMemberRecipe('preferred', 'dominance_1_preferred'),
      ],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'The preferred framing has the declared mechanism advantage.',
        dominance_axes: ['mechanism_identifiability'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'causal-perturbation',
      case_type: 'arena_causal_perturbation',
      tranche: 'first',
      members: [
        causalControl,
        causalVariant,
      ],
      expected_relation: {
        relation_kind: 'causal_perturbation',
        rationale: 'The mechanism evidence should change the disposition.',
        dominance_axes: [],
        sole_delta_ref: causalDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'non-advance',
      case_type: 'arena_successful_non_advance',
      tranche: 'first',
      members: [phase10bMemberRecipe('subject', 'non_advance')],
      expected_relation: {
        relation_kind: 'successful_non_advance',
        rationale: 'The justified stop avoids downstream work.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: ['research_question', 'value_feasibility', 'topic_package', 'promotion_review'],
    }, {
      slot_key: 'dominance-2',
      case_type: 'arena_dominance_pair',
      tranche: 'second',
      members: [
        phase10bMemberRecipe('baseline', 'dominance_2_baseline'),
        phase10bMemberRecipe('preferred', 'dominance_2_preferred'),
      ],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'The preferred framing has the declared evidence advantage.',
        dominance_axes: ['evidence_resolution'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'irrelevant-perturbation',
      case_type: 'arena_irrelevant_perturbation',
      tranche: 'second',
      members: [
        irrelevantControl,
        irrelevantVariant,
      ],
      expected_relation: {
        relation_kind: 'irrelevant_perturbation',
        rationale: 'The unrelated evidence should not change the disposition.',
        dominance_axes: [],
        sole_delta_ref: irrelevantDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'advancing',
      case_type: 'arena_advancing_case',
      tranche: 'second',
      members: [phase10bMemberRecipe('subject', 'advancing')],
      expected_relation: {
        relation_kind: 'advancing',
        rationale: 'The new process-selected lineage should advance.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }],
    selection_rule: 'ordered_exact_member_recipes',
    measurement_window: {
      start_event: 'case_registration_before_role_output',
      end_event: 'calibration_run_evaluation',
    },
    accounting_sources: {
      runtime: 'arena_transcript',
      authorization_pause: 'designated_advisory_review_operation_group',
      work_avoided: 'research_stage_manifest',
    },
    decision_difference_rule: 'advisory_outcome_changed',
    override_categories: [
      'explained_repair',
      'human_objective_difference',
      'possible_false_drop',
      'possible_false_continue',
    ],
    stop_rules: {
      hard_blocker: 'stop_immediately',
      first_tranche_redundancy: 'stop_when_no_decision_difference_and_no_work_avoided',
    },
    budgets: {
      max_case_count: 6,
      max_session_count: 10,
      max_role_invocation_count: 20,
      max_review_points_per_tranche: 2,
    },
    support_only: true,
  };
}

async function seedPhase10bRecipeSnapshot(
  repository: InMemoryTopicSelectionControlPlaneRepository,
  recipe: TopicSelectionResearchArenaCalibrationMemberRecipe,
): Promise<void> {
  await repository.createInputSnapshot({
    input_snapshot_id: recipe.input_snapshot_ref.ref_id,
    workspace_id: null,
    title_card_id: recipe.title_card_id,
    target_ref: recipe.candidate_refs[0]!,
    context_policy_version_id: null,
    policy_version: 'topic-selection-research-arena@v1',
    snapshot_hash: recipe.input_snapshot_ref.version_id!,
    source_refs: [...recipe.candidate_refs, ...recipe.evidence_refs],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  });
}

async function seedPhase10bArenaMember(input: {
  arenaRepository: InMemoryTopicSelectionResearchArenaRepository;
  controlPlaneRepository: InMemoryTopicSelectionControlPlaneRepository;
  recipe: TopicSelectionResearchArenaCalibrationMemberRecipe;
  outcome: 'selected' | 'evidence_expansion_required';
  productV2?: boolean;
  mismatchedAuditOutput?: boolean;
  invalidDropJustification?: boolean;
}) {
  await seedPhase10bRecipeSnapshot(input.controlPlaneRepository, input.recipe);
  return seedArena({
    arenaRepository: input.arenaRepository,
    controlPlaneRepository: input.controlPlaneRepository,
    suffix: input.recipe.session_key.replace('session-key-', ''),
    titleCardId: input.recipe.title_card_id,
    inputSnapshotId: input.recipe.input_snapshot_ref.ref_id,
    inputSnapshotHash: input.recipe.input_snapshot_ref.version_id!,
    targetRef: input.recipe.candidate_refs[0]!,
    sessionKey: input.recipe.session_key,
    loopDeltaRefs: input.recipe.loop_delta ? [{
      delta_type: input.recipe.loop_delta.delta_type,
      ref: input.recipe.loop_delta.ref,
      rationale: input.recipe.loop_delta.rationale,
    }] : [],
    outcome: input.outcome,
    productV2: input.productV2 ?? true,
    mismatchedAuditOutput: input.mismatchedAuditOutput,
    invalidDropJustification: input.invalidDropJustification,
  });
}

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
  titleCardId?: string;
  inputSnapshotId?: string;
  inputSnapshotHash?: string;
  targetRef?: TopicSelectionFunctionalRef;
  sessionKey?: string;
  loopDeltaRefs?: TopicSelectionResearchArenaSessionRecord['loop_delta_refs'];
  productV2?: boolean;
  mismatchedAuditOutput?: boolean;
  invalidDropJustification?: boolean;
}) {
  const titleCardId = input.titleCardId ?? `title_${input.suffix}`;
  const snapshotId = input.inputSnapshotId ?? `snapshot_${input.suffix}`;
  const snapshotHash = input.inputSnapshotHash ?? sha256Text(`snapshot:${input.suffix}`);
  const targetRef = input.targetRef
    ?? ref('need_candidate', `candidate_${input.suffix}`, titleCardId, 'v1');
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
  const openSessionInput: TopicSelectionResearchArenaSessionRecord = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: sessionId,
    session_key: input.sessionKey ?? `session-key-${input.suffix}`,
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
    loop_delta_refs: input.loopDeltaRefs ?? [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: null,
    superseded_at: null,
  };
  const openSession = await input.arenaRepository.replaceCurrentSession(openSessionInput);

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

function phase10bReviewHistory(
  recipe: TopicSelectionResearchArenaCalibrationMemberRecipe,
  response: 'accept' | 'override' | 'defer' = 'accept',
  reviewCount = 1,
): TopicSelectionResearchArenaAdvisoryReviewHistory {
  const checkpointId = `checkpoint_${recipe.session_key}`;
  const reviews = Array.from({ length: reviewCount }, (_, index) => {
    const reviewId = `review_${recipe.session_key}_${index}`;
    return {
      review_ref: ref(
        'artifact_ref',
        reviewId,
        recipe.title_card_id,
        'TopicSelectionResearchArenaAdvisoryReview@v1',
      ),
      review: {
        schema_version: 'TopicSelectionResearchArenaAdvisoryReview@v1' as const,
        review_id: reviewId,
        title_card_id: recipe.title_card_id,
        research_checkpoint_id: checkpointId,
        gap_input_snapshot_id: recipe.input_snapshot_ref.ref_id,
        confirmed_candidate_pool_hash: sha256Text(`pool:${recipe.session_key}`),
        advisory_snapshot_hash: sha256Text(`advisory:${recipe.session_key}`),
        response,
        rationale: `Human ${response} label for ${recipe.session_key}.`,
        reason_codes: response === 'accept'
          ? ['AGREES_WITH_ARENA' as const]
          : response === 'defer'
            ? ['REVIEW_DEFERRED' as const]
            : ['NON_SELECTED_DISPOSITION_CHANGED' as const],
        actor: recipe.label_actor,
        human_gap_selection_review: null,
        human_gap_selection_review_hash: null,
        selected_candidate_ref: null,
        human_confirm_need_intent: null,
        support_only: true as const,
        created_at: new Date(Date.parse(NOW) + index * 1_000).toISOString(),
      },
      advancement_binding: {
        status: 'proposed' as const,
        human_confirmed_decision_ref: null,
      },
    };
  });
  const body = {
    schema_version: 'TopicSelectionResearchArenaAdvisoryReviewHistory@v1' as const,
    research_checkpoint_id: checkpointId,
    title_card_id: recipe.title_card_id,
    gap_input_snapshot_id: recipe.input_snapshot_ref.ref_id,
    checkpoint_currentness: 'current' as const,
    reviews,
    projection_issues: [],
    reopen_signals: [],
  };
  return { ...body, history_hash: sha256Text(stableStringify(body)) };
}

function phase10bStageManifest(
  titleCardId: string,
  currentStage: 'research_question' | 'value_feasibility' | 'topic_package' | 'promotion_review' | null = null,
): TopicSelectionResearchStageManifest {
  const stages = [
    'research_question',
    'value_feasibility',
    'topic_package',
    'promotion_review',
  ] as const;
  const body = {
    schema_version: 'TopicSelectionResearchStageManifest@v1' as const,
    title_card_id: titleCardId,
    current_stage: currentStage,
    next_human_decision_stage: null,
    stages: stages.map((stage) => ({
      stage,
      state: stage === currentStage ? 'current' as const : 'unavailable' as const,
      current_selection_rule: 'derived_from_current_manifest' as const,
      authority_ref: null,
      checkpoint_ref: null,
      supersedes_ref: null,
      snapshot_hash: null,
      status: null,
      source_refs: [],
      artifact_refs: [],
      issue_codes: [],
    })),
  };
  return { ...body, manifest_hash: sha256Text(stableStringify(body)) };
}

async function preRegisterPhase10bCase(
  harness: ReturnType<typeof createCalibrationHarness>,
  slotIndex: number,
  datasetKey: string,
) {
  const protocol = phase10bProtocol();
  const slot = protocol.slots[slotIndex]!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, member)));
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: datasetKey,
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  const evaluationCase = await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: slot.slot_key,
    slot_key: slot.slot_key,
    tags: [],
  });
  return { protocol, slot, dataset, evaluationCase };
}

test('legacy v1 calibration records are read-only at every write boundary', async () => {
  const { offlineRepository, service } = createCalibrationHarness();
  const legacyDatasetId = 'dataset_legacy_read_only';
  const legacyRunId = 'run_legacy_read_only';
  const assertLegacyWriteRejected = (operation: Promise<unknown>) => assert.rejects(
    operation,
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /historical read-only/u.test(error.message),
  );

  await assertLegacyWriteRejected(Reflect.apply(service.createDataset, service, [{
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 'legacy-write',
    dataset_version: 'v1',
    description: null,
  }]));
  await offlineRepository.createDataset({
    offline_evaluation_dataset_id: legacyDatasetId,
    workspace_id: null,
    dataset_key: 'legacy-read-only',
    dataset_version: 'v1',
    stage: 'research_arena',
    source: 'frozen_snapshot',
    status: 'active',
    description: null,
    case_count: 0,
    case_type_coverage: [],
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v1',
      evaluation_mode: 'canonical_owner_reload',
      support_only: true,
    },
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  });
  await assertLegacyWriteRejected(Reflect.apply(service.addCase, service, [{
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: legacyDatasetId,
    case_key: 'legacy-case',
    case_type: 'arena_successful_non_advance',
    members: [{ member_role: 'subject', arena_session_id: 'arena_legacy', research_checkpoint_id: null }],
    tags: [],
  }]));
  await assertLegacyWriteRejected(service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: legacyDatasetId,
    run_key: 'legacy-run',
  }));

  await offlineRepository.createRun({
    offline_evaluation_run_id: legacyRunId,
    workspace_id: null,
    dataset_id: legacyDatasetId,
    run_key: 'legacy-running',
    status: 'running',
    workflow_profile_key: 'topic-selection-research-arena-calibration',
    workflow_profile_version: 'v1',
    model_profile_key: null,
    search_profile_key: null,
    policy_version_id: null,
    metric_keys: [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS],
    case_count: 0,
    run_payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationRun@v1',
      support_only: true,
    },
    created_by: 'system',
    started_at: NOW,
    finished_at: null,
  });
  await assertLegacyWriteRejected(service.evaluateRun(legacyRunId));
});

test('phase 10B freezes the six-slot protocol and pre-registers a case before role execution', async () => {
  const {
    controlPlaneRepository,
    arenaRepository,
    offlineRepository,
    service,
  } = createCalibrationHarness();
  const protocol = phase10bProtocol();
  const slot = protocol.slots.find((candidate) => candidate.slot_key === 'dominance-1')!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(controlPlaneRepository, member)));

  const dataset = await service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-preregistered-corpus',
    dataset_version: 'v2',
    description: 'Pre-registered Phase 10B calibration protocol.',
    protocol_manifest: protocol,
  });
  assert.deepEqual(dataset.payload, {
    schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v2',
    evaluation_mode: 'canonical_owner_reload',
    protocol_manifest: protocol,
    support_only: true,
  });

  const evaluationCase = await service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: slot.slot_key,
    slot_key: slot.slot_key,
    tags: ['phase10b', 'first-tranche'],
  });

  assert.equal(evaluationCase.case_type, slot.case_type);
  assert.equal(evaluationCase.title_card_id, null);
  assert.equal(evaluationCase.frozen_input_bundle.payload.schema_version,
    'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2');
  assert.deepEqual(evaluationCase.frozen_input_bundle.payload.protocol_slot, slot);
  assert.equal((await offlineRepository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id)).length, 1);
  for (const member of slot.members) {
    assert.equal(await arenaRepository.findSessionByKey(member.session_key), null);
  }
});

test('phase 10B rejects reused members and undeclared extra perturbation deltas', async () => {
  const { service } = createCalibrationHarness();
  const reusedMemberProtocol = structuredClone(phase10bProtocol());
  reusedMemberProtocol.slots[3]!.members[0]!.session_key =
    reusedMemberProtocol.slots[0]!.members[0]!.session_key;
  await assert.rejects(
    service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: 'phase10b-reused-member',
      dataset_version: 'v2',
      description: null,
      protocol_manifest: reusedMemberProtocol,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && /reused across slots/u.test(error.message),
  );

  const reusedLabelSlotProtocol = structuredClone(phase10bProtocol());
  reusedLabelSlotProtocol.slots[3]!.members[0]!.label_slot_key =
    reusedLabelSlotProtocol.slots[0]!.members[0]!.label_slot_key;
  await assert.rejects(
    service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: 'phase10b-reused-label-slot',
      dataset_version: 'v2',
      description: null,
      protocol_manifest: reusedLabelSlotProtocol,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && /label slot .* reused/u.test(error.message),
  );

  const multiDeltaProtocol = structuredClone(phase10bProtocol());
  const variant = multiDeltaProtocol.slots[1]!.members[1]!;
  variant.evidence_refs.push(ref('evidence_map', 'evidence_extra', variant.title_card_id, 'v1'));
  await assert.rejects(
    service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: 'phase10b-multi-delta',
      dataset_version: 'v2',
      description: null,
      protocol_manifest: multiDeltaProtocol,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && /only its declared evidence delta/u.test(error.message),
  );
});

test('phase 10B rejects a registered snapshot with undeclared source evidence', async () => {
  const harness = createCalibrationHarness();
  const protocol = phase10bProtocol();
  const slot = protocol.slots[0]!;
  const [drifted, exact] = slot.members;
  await harness.controlPlaneRepository.createInputSnapshot({
    input_snapshot_id: drifted!.input_snapshot_ref.ref_id,
    workspace_id: null,
    title_card_id: drifted!.title_card_id,
    target_ref: drifted!.candidate_refs[0]!,
    context_policy_version_id: null,
    policy_version: 'topic-selection-research-arena@v1',
    snapshot_hash: drifted!.input_snapshot_ref.version_id!,
    source_refs: [
      ...drifted!.candidate_refs,
      ...drifted!.evidence_refs,
      ref('evidence_unit', 'undeclared-source', drifted!.title_card_id, 'v1'),
    ],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  });
  await seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, exact!);
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-undeclared-snapshot-source',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });

  await assert.rejects(
    harness.service.addCase({
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: slot.slot_key,
      slot_key: slot.slot_key,
      tags: [],
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /does not match its pre-registered member recipe/u.test(error.message),
  );
});

test('phase 10B rejects a protocol manifest frozen after a bound member produced output', async () => {
  const harness = createCalibrationHarness();
  const protocol = phase10bProtocol();
  const recipe = protocol.slots[0]!.members[0]!;
  await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe,
    outcome: 'evidence_expansion_required',
  });

  await assert.rejects(
    harness.service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: 'phase10b-post-hoc-protocol',
      dataset_version: 'v2',
      description: null,
      protocol_manifest: protocol,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /already has output/u.test(error.message),
  );
});

test('phase 10B rejects post-execution case registration and duplicate slot use', async () => {
  const {
    controlPlaneRepository,
    arenaRepository,
    offlineRepository,
    service,
  } = createCalibrationHarness();
  const protocol = phase10bProtocol();
  const slot = protocol.slots[0]!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(controlPlaneRepository, member)));
  const dataset = await service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-post-execution',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  await seedArena({
    arenaRepository,
    controlPlaneRepository,
    suffix: 'dominance_1_baseline',
    outcome: 'evidence_expansion_required',
    productV2: true,
  });

  await assert.rejects(
    service.addCase({
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: slot.slot_key,
      slot_key: slot.slot_key,
      tags: [],
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /already has output/u.test(error.message),
  );
  assert.equal((await offlineRepository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id)).length, 0);

  const freshHarness = createCalibrationHarness();
  const freshProtocol = phase10bProtocol();
  const freshSlot = freshProtocol.slots[0]!;
  await Promise.all(freshSlot.members.map((member) =>
    seedPhase10bRecipeSnapshot(freshHarness.controlPlaneRepository, member)));
  const freshDataset = await freshHarness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-duplicate-slot',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: freshProtocol,
  });
  const request = {
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2' as const,
    dataset_id: freshDataset.offline_evaluation_dataset_id,
    case_key: 'dominance-1',
    slot_key: freshSlot.slot_key,
    tags: [] as string[],
  };
  const firstRegistration = await freshHarness.service.addCase(request);
  assert.deepEqual(await freshHarness.service.addCase(request), firstRegistration);
  await assert.rejects(
    freshHarness.service.addCase({ ...request, tags: ['replacement'] }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /already registered/u.test(error.message),
  );
});

test('phase 10B evaluates registered stable sessions with one designated label per member', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels from the registered Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => ({
        schema_version: 'TopicSelectionResearchStageManifest@v1',
        title_card_id: titleCardId,
        current_stage: null,
        next_human_decision_stage: null,
        stages: [],
        manifest_hash: sha256Text(`manifest:${titleCardId}`),
      }),
    },
  });
  const protocol = phase10bProtocol();
  const slot = protocol.slots[0]!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, member)));
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-evaluation',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'dominance-1',
    slot_key: slot.slot_key,
    tags: ['phase10b'],
  });
  const outcomes = ['evidence_expansion_required', 'selected'] as const;
  for (const [index, recipe] of slot.members.entries()) {
    const sessionId = await seedPhase10bArenaMember({
      arenaRepository: harness.arenaRepository,
      controlPlaneRepository: harness.controlPlaneRepository,
      recipe,
      outcome: outcomes[index]!,
    });
    histories.set(sessionId, phase10bReviewHistory(recipe));
  }
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-dominance-1',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);

  assert.equal(
    report.case_results[0]?.relation_passed,
    true,
    JSON.stringify(report.case_results[0]),
  );
  assert.equal(report.product_v2_member_count, 2);
  assert.equal(report.coverage_gaps.includes('MISSING_MEMBER_LABEL_COVERAGE'), false);
  for (const member of report.case_results[0]!.members) {
    assert.deepEqual(member.human_label_responses, ['accept']);
    assert.equal(member.execution_accounting.authorization_pause_count, 1);
    assert.equal(member.execution_accounting.work_avoided_stage_count, 0);
    assert.equal(member.cost_latency_accounting_passed, true);
  }

  const laterSlot = protocol.slots[3]!;
  await Promise.all(laterSlot.members.map((member) =>
    seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, member)));
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: laterSlot.slot_key,
    slot_key: laterSlot.slot_key,
    tags: ['phase10b', 'second-tranche'],
  });
  assert.deepEqual(await harness.service.getReport(run.offline_evaluation_run_id), report);
});

test('phase 10B exposes missing member labels and blocks repeated semantic reviews', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels by Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const protocol = phase10bProtocol();
  const slot = protocol.slots[0]!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, member)));
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-label-cardinality',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: slot.slot_key,
    slot_key: slot.slot_key,
    tags: [],
  });
  const outcomes = ['evidence_expansion_required', 'selected'] as const;
  for (const [index, recipe] of slot.members.entries()) {
    const sessionId = await seedPhase10bArenaMember({
      arenaRepository: harness.arenaRepository,
      controlPlaneRepository: harness.controlPlaneRepository,
      recipe,
      outcome: outcomes[index]!,
    });
    if (index === 1) histories.set(sessionId, phase10bReviewHistory(recipe, 'accept', 2));
  }
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-label-cardinality',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);

  assert.ok(report.coverage_gaps.includes('MISSING_MEMBER_LABEL_COVERAGE'));
  assert.ok(report.coverage_gaps.includes('MISSING_COST_LATENCY_ACCOUNTING'));
  assert.ok(report.hard_blockers.some((blocker) => blocker.code === 'EXTRA_HUMAN_STOP'));
  assert.equal(report.case_results[0]!.members[0]!.execution_accounting.authorization_pause_count, null);
  assert.equal(report.case_results[0]!.members[1]!.execution_accounting.authorization_pause_count, null);
});

test('phase 10B verifies a causal retry from the declared sole evidence delta', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels by Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const protocol = phase10bProtocol();
  const slot = protocol.slots[1]!;
  await Promise.all(slot.members.map((member) =>
    seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, member)));
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-causal-retry',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: slot.slot_key,
    slot_key: slot.slot_key,
    tags: [],
  });
  const [controlRecipe, variantRecipe] = slot.members;
  const controlSessionId = await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe: controlRecipe!,
    outcome: 'evidence_expansion_required',
  });
  histories.set(controlSessionId, phase10bReviewHistory(controlRecipe!));
  const variantSessionId = await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe: variantRecipe!,
    outcome: 'selected',
  });
  histories.set(variantSessionId, phase10bReviewHistory(variantRecipe!));
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-causal-retry',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);

  assert.equal(
    report.case_results[0]?.relation_passed,
    true,
    JSON.stringify(report.case_results[0]),
  );
  assert.equal(report.case_results[0]?.hard_blockers.length, 0);
  assert.equal(report.case_results[0]?.members[0]?.arena_session_ref.ref_id, controlSessionId);
  assert.equal(report.case_results[0]?.members[1]?.arena_session_ref.ref_id, variantSessionId);
});

test('phase 10B derives work avoided from an accepted stop and absent canonical stages', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels by Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const protocol = phase10bProtocol();
  const slot = protocol.slots[2]!;
  const recipe = slot.members[0]!;
  await seedPhase10bRecipeSnapshot(harness.controlPlaneRepository, recipe);
  const dataset = await harness.service.createDataset({
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 'phase10b-work-avoided',
    dataset_version: 'v2',
    description: null,
    protocol_manifest: protocol,
  });
  const evaluationCase = await harness.service.addCase({
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: slot.slot_key,
    slot_key: slot.slot_key,
    tags: [],
  });
  assert.deepEqual(
    evaluationCase.frozen_input_bundle.payload.work_avoided_baseline,
    {
      title_card_id: recipe.title_card_id,
      manifest_hash: phase10bStageManifest(recipe.title_card_id).manifest_hash,
      unavailable_stage_keys: slot.work_avoided_stage_keys,
    },
  );
  const sessionId = await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe,
    outcome: 'evidence_expansion_required',
  });
  histories.set(sessionId, phase10bReviewHistory(recipe));
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-work-avoided',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);

  assert.equal(report.case_results[0]?.members[0]?.work_avoided_stage_count, 4);
  assert.equal(report.case_results[0]?.members[0]?.execution_accounting.work_avoided_stage_count, 4);
  assert.equal(report.coverage_gaps.includes('MISSING_MEASURED_WORK_AVOIDED'), false);
});

test('completed historical v1 calibration reports remain readable without reopening writes', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels by Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const { slot, dataset } = await preRegisterPhase10bCase(
    harness,
    0,
    'historical-v1-read-compatibility',
  );
  const outcomes = ['evidence_expansion_required', 'selected'] as const;
  for (const [index, recipe] of slot.members.entries()) {
    const sessionId = await seedPhase10bArenaMember({
      arenaRepository: harness.arenaRepository,
      controlPlaneRepository: harness.controlPlaneRepository,
      recipe,
      outcome: outcomes[index]!,
    });
    histories.set(sessionId, phase10bReviewHistory(recipe));
  }
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'historical-v1-read-compatibility',
  });
  await harness.service.evaluateRun(run.offline_evaluation_run_id);

  await harness.offlineRepository.updateDataset(dataset.offline_evaluation_dataset_id, {
    dataset_version: 'v1',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v1',
      evaluation_mode: 'canonical_owner_reload',
      support_only: true,
    },
    updated_at: NOW,
  });
  await harness.offlineRepository.updateRun(run.offline_evaluation_run_id, {
    workflow_profile_version: 'v1',
    run_payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationRun@v1',
      evaluation_mode: 'canonical_owner_reload',
      provider_execution_allowed: false,
      authority_writes_allowed: false,
      support_only: true,
      evaluated_from_canonical_owners: true,
    },
  });

  const report = await harness.service.getReport(run.offline_evaluation_run_id);
  assert.equal(report.support_only, true);
  assert.equal(report.recommendation, 'insufficient_evidence');
  assert.ok(report.coverage_gaps.includes('MISSING_PRE_REGISTERED_PROTOCOL'));
  assert.equal(report.case_type_counts.arena_dominance_pair, 1);
  assert.deepEqual(
    await harness.service.evaluateRun(run.offline_evaluation_run_id),
    report,
  );
});

test('changed canonical snapshot identity fails before any evaluation result is written', async () => {
  let tamperSnapshot = false;
  const harness = createCalibrationHarness({
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
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('The source-drift fixture has no checkpoint label.');
      },
      getArenaAdvisoryReviewHistoryForSession: async () => null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const { slot, dataset } = await preRegisterPhase10bCase(
    harness,
    2,
    'phase10b-source-drift',
  );
  await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe: slot.members[0]!,
    outcome: 'evidence_expansion_required',
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-source-drift',
  });

  tamperSnapshot = true;
  await assert.rejects(
    harness.service.evaluateRun(run.offline_evaluation_run_id),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /does not match its pre-registered member recipe/u.test(error.message),
  );
  assert.equal((await harness.offlineRepository.findRunById(run.offline_evaluation_run_id))?.status, 'running');
  assert.equal((await harness.offlineRepository.listCaseResultsByRunId(run.offline_evaluation_run_id)).length, 0);
  assert.equal((await harness.offlineRepository.listMetricResultsByRunId(run.offline_evaluation_run_id)).length, 0);
  assert.equal((await harness.offlineRepository.listReplayDiffsByRunId(run.offline_evaluation_run_id)).length, 0);
});

test('product-v2 coverage requires an exact non-provider audit identity', async () => {
  const valid = createCalibrationHarness();
  const validRegistration = await preRegisterPhase10bCase(
    valid,
    5,
    'phase10b-product-v2',
  );
  await seedPhase10bArenaMember({
    arenaRepository: valid.arenaRepository,
    controlPlaneRepository: valid.controlPlaneRepository,
    recipe: validRegistration.slot.members[0]!,
    outcome: 'selected',
  });
  const run = await valid.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: validRegistration.dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-product-v2',
  });
  const report = await valid.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.product_v2_member_count, 1);
  assert.equal(report.coverage_gaps.includes('MISSING_PRODUCT_V2_EXECUTION'), false);
  assert.equal(report.case_results[0]?.members[0]?.execution_independence_passed, true);

  const mismatched = createCalibrationHarness();
  const mismatchedRegistration = await preRegisterPhase10bCase(
    mismatched,
    5,
    'phase10b-mismatched-audit',
  );
  await seedPhase10bArenaMember({
    arenaRepository: mismatched.arenaRepository,
    controlPlaneRepository: mismatched.controlPlaneRepository,
    recipe: mismatchedRegistration.slot.members[0]!,
    outcome: 'selected',
    mismatchedAuditOutput: true,
  });
  const mismatchedRun = await mismatched.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: mismatchedRegistration.dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-mismatched-audit',
  });
  await assert.rejects(
    mismatched.service.evaluateRun(mismatchedRun.offline_evaluation_run_id),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && /audit identity does not match/u.test(error.message),
  );
  assert.equal(
    (await mismatched.offlineRepository.listCaseResultsByRunId(
      mismatchedRun.offline_evaluation_run_id,
    )).length,
    0,
  );
});

test('an uncoded or non-reopenable drop is a hard blocker rather than an activation signal', async () => {
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('The invalid-drop fixture has no checkpoint label.');
      },
      getArenaAdvisoryReviewHistoryForSession: async () => null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const { slot, dataset } = await preRegisterPhase10bCase(
    harness,
    2,
    'phase10b-invalid-drop',
  );
  await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe: slot.members[0]!,
    outcome: 'evidence_expansion_required',
    invalidDropJustification: true,
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-invalid-drop',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.recommendation, 'remain_advisory');
  assert.ok(report.hard_blockers.some((blocker) => blocker.code === 'INVALID_DROP_JUSTIFICATION'));
});

test('an override of a non-advance recommendation does not satisfy non-advance label coverage', async () => {
  const histories = new Map<string, TopicSelectionResearchArenaAdvisoryReviewHistory>();
  const harness = createCalibrationHarness({
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('Phase 10B resolves labels by Arena session.');
      },
      getArenaAdvisoryReviewHistoryForSession: async (_titleCardId, arenaSessionId) =>
        histories.get(arenaSessionId) ?? null,
      getStageManifest: async (titleCardId) => phase10bStageManifest(titleCardId),
    },
  });
  const { slot, dataset } = await preRegisterPhase10bCase(
    harness,
    2,
    'phase10b-override-label',
  );
  const recipe = slot.members[0]!;
  const sessionId = await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe,
    outcome: 'evidence_expansion_required',
  });
  histories.set(sessionId, phase10bReviewHistory(recipe, 'override'));
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-override-label',
  });

  const report = await harness.service.evaluateRun(run.offline_evaluation_run_id);
  assert.equal(report.human_label_counts.override, 1);
  assert.equal(report.human_label_counts.non_advance, 0);
  assert.ok(report.coverage_gaps.includes('MISSING_NON_ADVANCE_LABEL'));
});

test('report reads fail closed on malformed persisted Arena observations', async () => {
  const harness = createCalibrationHarness();
  const { slot, dataset } = await preRegisterPhase10bCase(
    harness,
    5,
    'phase10b-persisted-observation-drift',
  );
  await seedPhase10bArenaMember({
    arenaRepository: harness.arenaRepository,
    controlPlaneRepository: harness.controlPlaneRepository,
    recipe: slot.members[0]!,
    outcome: 'selected',
  });
  const run = await harness.service.startRun({
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: dataset.offline_evaluation_dataset_id,
    run_key: 'phase10b-persisted-observation-drift',
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
