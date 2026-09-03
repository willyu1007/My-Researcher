import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import type {
  TopicSelectionResearchArenaSessionRecord,
  TopicSelectionResearchArenaRoleExecutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { TopicSelectionResearchArenaConflictError } from '../repositories/topic-selection-research-arena.repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const NOW = '2026-08-28T00:00:00.000Z';

function ref(refType: string, refId: string) {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_1' };
}

function invocationProvenance(
  role: 'opportunity_scout' | 'prior_art_topic_killer',
  outputHash: string,
): TopicSelectionAgentInvocationProvenance {
  return {
    workflow_run_id: 'workflow_1',
    node_id: `topic_selection_research_arena_${role}`,
    node_attempt_id: `attempt_1:${role}`,
    invocation_attempt_id: `attempt_1:${role}:invocation`,
    execution_mode: 'codex_assisted',
    executor_kind: 'multi_agent_debate',
    source_kind: 'codex_response',
    non_provider: true,
    run_mode: 'acceptance',
    profile_id: `profile_${role}`,
    profile_version: 'v1',
    profile_hash: 'c'.repeat(64),
    model_option_id: null,
    normalized_params_hash: null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'TopicSelectionResearchArenaRoleOutput@v1',
    prompt_template_id: `prompt_${role}`,
    prompt_template_version: 'v2',
    schema_name: 'TopicSelectionResearchArenaRoleOutput@v1',
    prompt_packet_hash: 'd'.repeat(64),
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

function fixture(
  arenaRepository = new InMemoryTopicSelectionResearchArenaRepository(),
) {
  const arenaCandidateRef = {
    ...ref('need_candidate', 'candidate_1'),
    version_id: 'v1',
  };
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_1',
    workspace_id: null,
    title_card_id: 'title_1',
    target_ref: ref('validated_need', 'need_1'),
    context_policy_version_id: null,
    policy_version: 'v1',
    snapshot_hash: 'a'.repeat(64),
    source_refs: [arenaCandidateRef],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  };
  const retrySnapshot: TopicSelectionInputSnapshotRecord = {
    ...snapshot,
    input_snapshot_id: 'snapshot_2',
    snapshot_hash: 'b'.repeat(64),
    source_refs: [ref('evidence_unit', 'evidence_delta_1')],
    payload: { delta_refs: [ref('evidence_unit', 'evidence_delta_1')] },
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
  const scoutOutputPayload = { semantic_position: { recommendation: 'candidate-a' } };
  const scoutOutputHash = sha256Text(stableStringify(scoutOutputPayload));
  const changedScoutOutputPayload = { semantic_position: { recommendation: 'candidate-b' } };
  const changedScoutOutputHash = sha256Text(stableStringify(changedScoutOutputPayload));
  const killerOutputPayload = { semantic_position: { objection: 'prior-art collision' } };
  const killerOutputHash = sha256Text(stableStringify(killerOutputPayload));
  const scoutProvenance = invocationProvenance('opportunity_scout', scoutOutputHash);
  const changedScoutProvenance = invocationProvenance('opportunity_scout', changedScoutOutputHash);
  const killerProvenance = invocationProvenance('prior_art_topic_killer', killerOutputHash);
  const scoutAudit = invocationAudit(scoutProvenance);
  const changedScoutAudit = invocationAudit(changedScoutProvenance);
  const killerAudit = invocationAudit(killerProvenance);
  const transcriptPayload = {
    schema_version: 'TopicSelectionResearchArenaLoopTranscript@v2',
    arena_session_id: 'research_arena_1',
    input_snapshot_id: 'snapshot_1',
    independent_first_pass: [],
    advisory_synthesis: {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: 'evidence_expansion_required',
      summary: 'The candidate remains parked pending evidence.',
      candidate_dispositions: [{
        candidate_ref: arenaCandidateRef,
        disposition: 'parked',
        rationale: 'Current evidence does not support selection or rejection.',
        drop_reason_code: null,
        reopening_conditions: ['Add a direct-comparison evidence delta.'],
        selected_against_candidate_ref: null,
        role_positions: [],
      }],
      preserved_finding_ids: [],
      unresolved_dissent: [],
      required_next_delta: 'evidence',
      support_only: true,
    },
    risk_finding_refs: [],
    execution_accounting: {},
    support_only: true,
  };
  const transcriptHash = sha256Text(stableStringify(transcriptPayload));
  const artifacts = new Map<string, TopicSelectionArtifactRefRecord>([
    ['plan_1', {
      artifact_ref_id: 'plan_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: { plan: 'scout-killer' },
      checksum: sha256Text(stableStringify({ plan: 'scout-killer' })),
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['plan_2', {
      artifact_ref_id: 'plan_2', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: { plan: 'scout-killer-retry' },
      checksum: sha256Text(stableStringify({ plan: 'scout-killer-retry' })),
      input_snapshot_id: 'snapshot_2', created_by: 'system', created_at: NOW,
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
      payload: scoutOutputPayload,
      checksum: scoutOutputHash,
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['scout_output_changed', {
      artifact_ref_id: 'scout_output_changed', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline',
      payload: changedScoutOutputPayload,
      checksum: changedScoutOutputHash,
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['scout_audit', {
      artifact_ref_id: 'scout_audit', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'diagnostic', storage_kind: 'inline',
      payload: scoutAudit as unknown as Record<string, unknown>,
      checksum: sha256Text(stableStringify(scoutAudit)), workflow_run_id: 'workflow_1',
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['scout_audit_changed', {
      artifact_ref_id: 'scout_audit_changed', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'diagnostic', storage_kind: 'inline',
      payload: changedScoutAudit as unknown as Record<string, unknown>,
      checksum: sha256Text(stableStringify(changedScoutAudit)), workflow_run_id: 'workflow_1',
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['killer_output', {
      artifact_ref_id: 'killer_output', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline',
      payload: killerOutputPayload,
      checksum: killerOutputHash,
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['killer_audit', {
      artifact_ref_id: 'killer_audit', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'diagnostic', storage_kind: 'inline',
      payload: killerAudit as unknown as Record<string, unknown>,
      checksum: sha256Text(stableStringify(killerAudit)), workflow_run_id: 'workflow_1',
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
    ['transcript_1', {
      artifact_ref_id: 'transcript_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: transcriptPayload,
      checksum: transcriptHash,
      input_snapshot_id: 'snapshot_1', created_by: 'system', created_at: NOW,
    }],
  ]);
  let id = 0;
  const service = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: {
      findInputSnapshotById: async (snapshotId) => (
        [snapshot, retrySnapshot].find((candidate) => candidate.input_snapshot_id === snapshotId) ?? null
      ),
      findArtifactRefById: async (artifactId) => artifacts.get(artifactId) ?? null,
    },
  }, { idFactory: (prefix) => `${prefix}_${++id}`, now: () => NOW });
  const bindTranscriptExecutions = (
    executions: Awaited<ReturnType<typeof service.recordRoleExecution>>[],
    overrides: { output_hash?: string } = {},
  ) => {
    const current = artifacts.get('transcript_1');
    assert.ok(current?.payload);
    const payload = {
      ...current.payload,
      independent_first_pass: executions.map((execution, index) => ({
        arena_role_execution_id: execution.arena_role_execution_id,
        participant_role: execution.participant_role,
        evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
        evidence_packet_hash: execution.evidence_packet_hash,
        exposure_set_hash: execution.exposure_set_hash,
        output_artifact_ref: execution.output_artifact_ref,
        output_artifact_hash: index === 0 && overrides.output_hash
          ? overrides.output_hash
          : execution.output_artifact_hash,
        agent_invocation_audit_artifact_ref: execution.agent_invocation_audit_artifact_ref,
        agent_invocation_audit_artifact_hash: execution.agent_invocation_audit_artifact_hash,
        execution_provenance_hash: execution.execution_provenance_hash,
        prior_role_hashes: execution.prior_role_hashes,
      })),
    };
    const checksum = sha256Text(stableStringify(payload));
    artifacts.set('transcript_1', { ...current, payload, checksum });
    return checksum;
  };
  return { arenaCandidateRef, arenaRepository, bindTranscriptExecutions, packet, service };
}

function auditedScoutInput(
  packet: ReturnType<typeof fixture>['packet'],
  arenaSessionId: string,
): Parameters<TopicSelectionResearchArenaService['recordRoleExecution']>[0] {
  return {
    arena_session_id: arenaSessionId,
    role_slot_id: 'scout',
    instance_index: 0,
    participant_role: 'opportunity_scout',
    pass_kind: 'first_pass',
    evidence_packet_artifact_ref: ref('artifact_ref', 'packet_1'),
    retrieval_provenance: {
      participant_role: 'opportunity_scout',
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
    },
    exposure_artifact_refs: [ref('artifact_ref', 'packet_1')],
    output_artifact_ref: ref('artifact_ref', 'scout_output'),
    agent_invocation_audit_artifact_ref: ref('artifact_ref', 'scout_audit'),
    execution_provenance: invocationProvenance(
      'opportunity_scout',
      sha256Text(stableStringify({ semantic_position: { recommendation: 'candidate-a' } })),
    ),
  };
}

test('open session maps repository current-session races to a structured conflict', async () => {
  class ConflictingOpenRepository extends InMemoryTopicSelectionResearchArenaRepository {
    override async replaceCurrentSession(): Promise<never> {
      throw new TopicSelectionResearchArenaConflictError('Current Arena session changed concurrently.');
    }
  }
  const { service } = fixture(new ConflictingOpenRepository());

  await assert.rejects(
    () => service.openSession({
      session_key: 'arena-key-open-conflict',
      title_card_id: 'title_1',
      arena_kind: 'gap_portfolio',
      target_ref: ref('validated_need', 'need_1'),
      input_snapshot_id: 'snapshot_1',
      participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
      execution_plan_ref: ref('artifact_ref', 'plan_1'),
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('open session rejects a conflicting same-key row returned by repository race recovery', async () => {
  class ConflictingReplayRepository extends InMemoryTopicSelectionResearchArenaRepository {
    override async replaceCurrentSession(
      record: TopicSelectionResearchArenaSessionRecord,
    ): Promise<TopicSelectionResearchArenaSessionRecord> {
      return { ...record, participant_plan_hash: 'f'.repeat(64) };
    }
  }
  const { service } = fixture(new ConflictingReplayRepository());

  await assert.rejects(
    () => service.openSession({
      session_key: 'arena-key-conflicting-replay',
      title_card_id: 'title_1',
      arena_kind: 'gap_portfolio',
      target_ref: ref('validated_need', 'need_1'),
      input_snapshot_id: 'snapshot_1',
      participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
      execution_plan_ref: ref('artifact_ref', 'plan_1'),
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('role execution binds the product invocation audit and rejects a conflicting output replay', async () => {
  const { packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-audit',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
  });
  const auditedInput = auditedScoutInput(packet, session.arena_session_id);
  const first = await service.recordRoleExecution(auditedInput);
  assert.equal(first.schema_version, 'TopicSelectionResearchArenaRoleExecution@v2');
  assert.equal(
    Reflect.get(first, 'agent_invocation_audit_artifact_ref')?.ref_id,
    'scout_audit',
  );
  assert.match(Reflect.get(first, 'execution_provenance_hash') ?? '', /^[a-f0-9]{64}$/);

  const exactReplay = await service.recordRoleExecution(auditedInput);
  assert.equal(exactReplay.arena_role_execution_id, first.arena_role_execution_id);

  await assert.rejects(
    service.recordRoleExecution({
      ...auditedInput,
      output_artifact_ref: ref('artifact_ref', 'scout_output_changed'),
      agent_invocation_audit_artifact_ref: ref('artifact_ref', 'scout_audit_changed'),
      execution_provenance: invocationProvenance(
        'opportunity_scout',
        sha256Text(stableStringify({ semantic_position: { recommendation: 'candidate-b' } })),
      ),
    } as unknown as Parameters<typeof service.recordRoleExecution>[0]),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('role execution rejects a conflicting record returned by a concurrent repository replay', async () => {
  const { arenaRepository, packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-concurrent-replay',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
  });
  const createRoleExecution = arenaRepository.createRoleExecution.bind(arenaRepository);
  arenaRepository.createRoleExecution = async (record) => ({
    ...await createRoleExecution(record),
    pass_kind: 'supplemental',
  });

  await assert.rejects(
    service.recordRoleExecution(auditedScoutInput(packet, session.arena_session_id)),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('role execution replays an exact v2 record minted with the previous runtime hash profile', async () => {
  const { arenaRepository, packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-previous-runtime-hash',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
  });
  const input = auditedScoutInput(packet, session.arena_session_id);
  const first = await service.recordRoleExecution(input);
  const previousRuntimeHash = '0'.repeat(64);
  const findRoleExecutionBySlot = arenaRepository.findRoleExecutionBySlot.bind(arenaRepository);
  arenaRepository.findRoleExecutionBySlot = async (...args) => {
    const existing = await findRoleExecutionBySlot(...args);
    return existing ? { ...existing, runtime_identity_hash: previousRuntimeHash } : null;
  };

  const replay = await service.recordRoleExecution(input);

  assert.equal(replay.arena_role_execution_id, first.arena_role_execution_id);
  assert.equal(replay.runtime_identity_hash, previousRuntimeHash);
});

test('role runtime identity changes with pass kind and exact retrieval provenance', async () => {
  const { arenaRepository, packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-runtime-identity',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
  });
  arenaRepository.createRoleExecution = async (record) => record;
  const input = auditedScoutInput(packet, session.arena_session_id);

  const firstPass = await service.recordRoleExecution(input);
  const supplemental = await service.recordRoleExecution({ ...input, pass_kind: 'supplemental' });
  const changedRetrieval = await service.recordRoleExecution({
    ...input,
    retrieval_provenance: {
      ...input.retrieval_provenance,
      search_run_ref: ref('search_run', 'search_run_2'),
    },
  });

  assert.notEqual(firstPass.runtime_identity_hash, supplemental.runtime_identity_hash);
  assert.notEqual(firstPass.runtime_identity_hash, changedRetrieval.runtime_identity_hash);
});

test('arena replaces the current stage only when a recorded loop delta explains the retry', async () => {
  const { arenaRepository, service } = fixture();
  const input = {
    session_key: 'arena-key-1',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio' as const,
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'] as const,
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
  };
  await assert.rejects(service.openSession({
    ...input,
    session_key: 'workspace-mismatch',
    workspace_id: 'workspace_other',
  }), /workspace scope/u);
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
  await assert.rejects(
    service.openSession({
      ...input,
      session_key: 'arena-key-2',
      loop_delta_refs: [{
        delta_type: 'evidence' as const,
        ref: ref('evidence_unit', 'evidence_delta_1'),
        rationale: 'A claimed delta that is absent from a new snapshot must not admit a retry.',
      }],
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  const second = await service.openSession({
    ...input,
    session_key: 'arena-key-2',
    input_snapshot_id: 'snapshot_2',
    execution_plan_ref: ref('artifact_ref', 'plan_2'),
    loop_delta_refs: [{
      delta_type: 'evidence' as const,
      ref: ref('evidence_unit', 'evidence_delta_1'),
      rationale: 'A newly reviewed counterexample changes the candidate ordering.',
    }],
  });
  const previous = await arenaRepository.findSessionById(first.arena_session_id);
  assert.equal(previous?.status, 'superseded');
  assert.equal(second.supersedes_arena_session_id, first.arena_session_id);
  await assert.rejects(
    service.openSession({
      ...input,
      session_key: 'arena-key-3',
      input_snapshot_id: 'snapshot_2',
      execution_plan_ref: ref('artifact_ref', 'plan_2'),
      loop_delta_refs: [{
        delta_type: 'evidence' as const,
        ref: ref('evidence_unit', 'evidence_delta_1'),
        rationale: 'A third attempt is outside the one-retry shadow proof budget.',
      }],
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

async function evidenceLandscapeSynthesisFixture(options: {
  tamperRoundLinkHash?: boolean;
  synthesisDisposition?: 'recheck_same_gate' | 'remain_unresolved';
} = {}) {
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const mapRef = ref('evidence_map', 'map_2');
  const predecessorMapRef = ref('evidence_map', 'map_1');
  const deltaRef = { ...ref('artifact_ref', 'delta_1'), version_id: '' };
  const parentSnapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_parent', workspace_id: null, title_card_id: 'title_1',
    target_ref: predecessorMapRef, context_policy_version_id: null, policy_version: null,
    snapshot_hash: '1'.repeat(64), source_refs: [], permission_refs: [], payload: {},
    created_by: 'system', created_at: NOW,
  };
  const snapshot: TopicSelectionInputSnapshotRecord = {
    ...parentSnapshot,
    input_snapshot_id: 'snapshot_current',
    target_ref: mapRef,
    snapshot_hash: '2'.repeat(64),
    source_refs: [deltaRef],
  };
  const parentTranscriptPayload = { schema_version: 'ParentTranscript@v1', support_only: true };
  const parentTranscriptHash = sha256Text(stableStringify(parentTranscriptPayload));
  const parentTranscriptRef = {
    ...ref('artifact_ref', 'parent_transcript'),
    version_id: parentTranscriptHash,
  };
  const parent = {
    schema_version: 'TopicSelectionResearchArenaSession@v1', arena_session_id: 'arena_parent',
    session_key: 'parent', current_arena_key: 'title_1:evidence_landscape', workspace_id: null,
    title_card_id: 'title_1', arena_kind: 'evidence_landscape', target_ref: predecessorMapRef,
    input_snapshot_id: parentSnapshot.input_snapshot_id, input_snapshot_hash: parentSnapshot.snapshot_hash,
    participant_plan_hash: '3'.repeat(64),
    participant_roles: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'],
    execution_plan_ref: ref('artifact_ref', 'parent_plan'), status: 'synthesized',
    termination_reason: 'recommendation_ready', loop_transcript_ref: parentTranscriptRef,
    loop_transcript_hash: parentTranscriptHash, loop_delta_refs: [], support_only: true,
    supersedes_arena_session_id: null, superseded_by_arena_session_id: null, created_by: 'system',
    created_at: NOW, updated_at: NOW, synthesized_at: NOW, superseded_at: null,
  } satisfies TopicSelectionResearchArenaSessionRecord;
  await arenaRepository.replaceCurrentSession(parent);
  const current = {
    ...parent,
    arena_session_id: 'arena_current',
    session_key: 'current',
    target_ref: mapRef,
    input_snapshot_id: snapshot.input_snapshot_id,
    input_snapshot_hash: snapshot.snapshot_hash,
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    loop_delta_refs: [{ delta_type: 'evidence' as const, ref: deltaRef, rationale: 'Material delta.' }],
    synthesized_at: null,
  } satisfies TopicSelectionResearchArenaSessionRecord;
  const persistedCurrent = await arenaRepository.replaceCurrentSession(current);

  const execution = (
    participantRole: 'opportunity_scout' | 'empirical_skeptic' | 'synthesis_arbiter',
    passKind: 'first_pass' | 'synthesis',
  ) => ({
    arena_role_execution_id: `execution_${participantRole}`,
    participant_role: participantRole,
    pass_kind: passKind,
    evidence_packet_artifact_ref: ref('artifact_ref', `packet_${participantRole}`),
    evidence_packet_hash: '4'.repeat(64),
    exposure_set_hash: '5'.repeat(64),
    output_artifact_ref: ref('artifact_ref', `output_${participantRole}`),
    output_artifact_hash: '6'.repeat(64),
    agent_invocation_audit_artifact_ref: ref('artifact_ref', `audit_${participantRole}`),
    agent_invocation_audit_artifact_hash: '7'.repeat(64),
    execution_provenance_hash: '8'.repeat(64),
    prior_role_hashes: [],
  }) as unknown as TopicSelectionResearchArenaRoleExecutionRecord;
  const executions = [
    execution('opportunity_scout', 'first_pass'),
    execution('empirical_skeptic', 'first_pass'),
    execution('synthesis_arbiter', 'synthesis'),
  ];
  arenaRepository.listRoleExecutionsBySessionId = async () => executions;
  const identity = (item: TopicSelectionResearchArenaRoleExecutionRecord) => ({
    arena_role_execution_id: item.arena_role_execution_id,
    participant_role: item.participant_role,
    evidence_packet_artifact_ref: item.evidence_packet_artifact_ref,
    evidence_packet_hash: item.evidence_packet_hash,
    exposure_set_hash: item.exposure_set_hash,
    output_artifact_ref: item.output_artifact_ref,
    output_artifact_hash: item.output_artifact_hash,
    agent_invocation_audit_artifact_ref: item.agent_invocation_audit_artifact_ref,
    agent_invocation_audit_artifact_hash: item.agent_invocation_audit_artifact_hash,
    execution_provenance_hash: item.execution_provenance_hash,
    prior_role_hashes: item.prior_role_hashes,
  });
  const transcriptPayload = {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundTranscript@v1',
    arena_session_id: persistedCurrent.arena_session_id,
    input_snapshot_id: snapshot.input_snapshot_id,
    independent_first_pass: executions.slice(0, 2).map(identity),
    synthesis_execution: identity(executions[2]!),
    support_only: true,
  };
  const transcriptHash = sha256Text(stableStringify(transcriptPayload));
  const transcriptRef = { ...ref('artifact_ref', 'transcript_current'), version_id: transcriptHash };
  const evidenceDeltaPayload = {
    schema_version: 'TopicSelectionEvidenceDelta@v1',
    issue_refs: [ref('coverage_row_intent', 'issue_1')],
    material: true,
  };
  const evidenceDeltaHash = sha256Text(stableStringify(evidenceDeltaPayload));
  deltaRef.version_id = evidenceDeltaHash;
  snapshot.source_refs = [deltaRef];
  const roundLinkPayload = {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundLink@v1',
    arena_session_ref: ref('research_arena_session', persistedCurrent.arena_session_id),
    supersedes_arena_session_ref: ref('research_arena_session', parent.arena_session_id),
    parent_transcript_hash: parentTranscriptHash,
    evidence_delta_ref: deltaRef,
    evidence_delta_hash: evidenceDeltaHash,
  };
  const roundLinkHash = sha256Text(stableStringify(roundLinkPayload));
  const roundLinkRef = {
    ...ref('artifact_ref', 'round_link'),
    version_id: options.tamperRoundLinkHash ? '9'.repeat(64) : roundLinkHash,
  };
  const synthesisOutput = {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1',
    participant_role: 'synthesis_arbiter',
    issue_ref: ref('coverage_row_intent', 'issue_1'),
    evidence_map_ref: mapRef,
    evidence_delta_ref: deltaRef,
    semantic_position: {
      summary: 'Bounded support-only recommendation.',
      recommended_disposition: options.synthesisDisposition ?? 'recheck_same_gate',
      confidence: 0.8,
    },
    cited_evidence_unit_refs: [],
    unresolved_issue_codes: [],
    support_only: true,
  };
  const synthesisOutputHash = sha256Text(stableStringify(synthesisOutput));
  executions[2] = {
    ...executions[2]!,
    output_artifact_hash: synthesisOutputHash,
  };
  transcriptPayload.synthesis_execution = identity(executions[2]);
  const finalTranscriptHash = sha256Text(stableStringify(transcriptPayload));
  transcriptRef.version_id = finalTranscriptHash;
  const artifacts = new Map<string, TopicSelectionArtifactRefRecord>([
    ['parent_transcript', {
      artifact_ref_id: 'parent_transcript', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: parentTranscriptPayload,
      checksum: parentTranscriptHash, input_snapshot_id: parentSnapshot.input_snapshot_id,
      created_by: 'system', created_at: NOW,
    }],
    ['transcript_current', {
      artifact_ref_id: 'transcript_current', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: transcriptPayload,
      checksum: finalTranscriptHash, input_snapshot_id: snapshot.input_snapshot_id,
      created_by: 'system', created_at: NOW,
    }],
    ['delta_1', {
      artifact_ref_id: 'delta_1', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: evidenceDeltaPayload,
      checksum: evidenceDeltaHash, input_snapshot_id: snapshot.input_snapshot_id,
      created_by: 'system', created_at: NOW,
    }],
    ['round_link', {
      artifact_ref_id: 'round_link', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: roundLinkPayload,
      checksum: options.tamperRoundLinkHash ? '9'.repeat(64) : roundLinkHash,
      input_snapshot_id: snapshot.input_snapshot_id, created_by: 'system', created_at: NOW,
    }],
    ['output_synthesis_arbiter', {
      artifact_ref_id: 'output_synthesis_arbiter', workspace_id: null, title_card_id: 'title_1',
      artifact_kind: 'structured_output', storage_kind: 'inline', payload: synthesisOutput,
      checksum: synthesisOutputHash, input_snapshot_id: snapshot.input_snapshot_id,
      created_by: 'system', created_at: NOW,
    }],
  ]);
  const service = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: {
      findInputSnapshotById: async (id) => id === snapshot.input_snapshot_id
        ? snapshot
        : id === parentSnapshot.input_snapshot_id ? parentSnapshot : null,
      findArtifactRefById: async (id) => artifacts.get(id) ?? null,
    },
  }, { now: () => NOW });
  return { service, arenaSessionId: persistedCurrent.arena_session_id, transcriptRef, roundLinkRef };
}

test('evidence-landscape synthesis rejects a self-consistent-looking but tampered round link', async () => {
  const fixture = await evidenceLandscapeSynthesisFixture({ tamperRoundLinkHash: true });
  await assert.rejects(fixture.service.synthesizeEvidenceLandscapeSession({
    arena_session_id: fixture.arenaSessionId,
    loop_transcript_artifact_ref: fixture.transcriptRef,
    round_link_artifact_ref: fixture.roundLinkRef,
  }), /round link artifact checksum/u);
});

test('evidence-landscape synthesis preserves an unresolved synthesis disposition', async () => {
  const fixture = await evidenceLandscapeSynthesisFixture({ synthesisDisposition: 'remain_unresolved' });
  const result = await fixture.service.synthesizeEvidenceLandscapeSession({
    arena_session_id: fixture.arenaSessionId,
    loop_transcript_artifact_ref: fixture.transcriptRef,
    round_link_artifact_ref: fixture.roundLinkRef,
  });
  assert.equal(result.termination_reason, 'evidence_expansion_required');
});

test('evidence-landscape synthesis replay revalidates the round-link authority', async () => {
  const fixture = await evidenceLandscapeSynthesisFixture();
  await fixture.service.synthesizeEvidenceLandscapeSession({
    arena_session_id: fixture.arenaSessionId,
    loop_transcript_artifact_ref: fixture.transcriptRef,
    round_link_artifact_ref: fixture.roundLinkRef,
  });
  await assert.rejects(fixture.service.synthesizeEvidenceLandscapeSession({
    arena_session_id: fixture.arenaSessionId,
    loop_transcript_artifact_ref: fixture.transcriptRef,
    round_link_artifact_ref: ref('artifact_ref', 'missing_round_link'),
  }), /missing_round_link was not found/u);
});

async function evidenceLandscapeRetryFixture(nextIssueId: string) {
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const artifacts = new Map<string, TopicSelectionArtifactRefRecord>();
  const snapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  for (let index = 0; index <= 4; index += 1) {
    const deltaId = `historical_delta_${index}`;
    const deltaPayload = {
      schema_version: 'TopicSelectionEvidenceDelta@v1',
      issue_refs: [ref('coverage_row_intent', 'issue_a')],
      material: true,
    };
    const deltaHash = sha256Text(stableStringify(deltaPayload));
    const historicalDeltaRef = { ...ref('artifact_ref', deltaId), version_id: deltaHash };
    if (index > 0) {
      artifacts.set(deltaId, {
        artifact_ref_id: deltaId, workspace_id: null, title_card_id: 'title_1',
        artifact_kind: 'structured_output', storage_kind: 'inline', payload: deltaPayload,
        checksum: deltaHash, input_snapshot_id: `search_run_snapshot_${index}`,
        created_by: 'system', created_at: NOW,
      });
    }
    snapshots.set(`historical_snapshot_${index}`, {
      input_snapshot_id: `historical_snapshot_${index}`,
      workspace_id: null,
      title_card_id: 'title_1',
      target_ref: ref('evidence_map', `map_${index}`),
      context_policy_version_id: null,
      policy_version: null,
      snapshot_hash: String(index + 1).repeat(64),
      source_refs: index === 0 ? [] : [historicalDeltaRef],
      permission_refs: [],
      payload: {},
      created_by: 'system',
      created_at: NOW,
    });
    await arenaRepository.replaceCurrentSession({
      schema_version: 'TopicSelectionResearchArenaSession@v1',
      arena_session_id: `historical_arena_${index}`,
      session_key: `historical-${index}`,
      current_arena_key: 'title_1:evidence_landscape',
      workspace_id: null,
      title_card_id: 'title_1',
      arena_kind: 'evidence_landscape',
      target_ref: ref('evidence_map', `map_${index}`),
      input_snapshot_id: `historical_snapshot_${index}`,
      input_snapshot_hash: String(index + 1).repeat(64),
      participant_plan_hash: 'a'.repeat(64),
      participant_roles: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'],
      execution_plan_ref: ref('artifact_ref', `historical_plan_${index}`),
      status: 'synthesized',
      termination_reason: 'recommendation_ready',
      loop_transcript_ref: ref('artifact_ref', `historical_transcript_${index}`),
      loop_transcript_hash: 'b'.repeat(64),
      loop_delta_refs: index === 0 ? [] : [{
        delta_type: 'evidence',
        ref: historicalDeltaRef,
        rationale: 'Historical issue A evidence delta.',
      }],
      support_only: true,
      supersedes_arena_session_id: null,
      superseded_by_arena_session_id: null,
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
      synthesized_at: NOW,
      superseded_at: null,
    });
  }
  const nextDeltaPayload = {
    schema_version: 'TopicSelectionEvidenceDelta@v1',
    issue_refs: [ref('coverage_row_intent', nextIssueId)],
    material: true,
  };
  const nextDeltaHash = sha256Text(stableStringify(nextDeltaPayload));
  const nextDeltaRef = { ...ref('artifact_ref', 'next_delta'), version_id: nextDeltaHash };
  const targetRef = ref('evidence_map', 'map_next');
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_next', workspace_id: null, title_card_id: 'title_1',
    target_ref: targetRef, context_policy_version_id: null, policy_version: null,
    snapshot_hash: 'f'.repeat(64), source_refs: [nextDeltaRef], permission_refs: [], payload: {},
    created_by: 'system', created_at: NOW,
  };
  const planPayload = { schema_version: 'Plan@v1', issue_ref: ref('coverage_row_intent', nextIssueId) };
  const planHash = sha256Text(stableStringify(planPayload));
  artifacts.set('next_delta', {
    artifact_ref_id: 'next_delta', workspace_id: null, title_card_id: 'title_1',
    artifact_kind: 'structured_output', storage_kind: 'inline', payload: nextDeltaPayload,
    checksum: nextDeltaHash, input_snapshot_id: snapshot.input_snapshot_id,
    created_by: 'system', created_at: NOW,
  });
  artifacts.set('next_plan', {
    artifact_ref_id: 'next_plan', workspace_id: null, title_card_id: 'title_1',
    artifact_kind: 'structured_output', storage_kind: 'inline', payload: planPayload,
    checksum: planHash, input_snapshot_id: snapshot.input_snapshot_id,
    created_by: 'system', created_at: NOW,
  });
  const service = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: {
      findInputSnapshotById: async (id) => id === snapshot.input_snapshot_id
        ? snapshot
        : snapshots.get(id) ?? null,
      findArtifactRefById: async (id) => artifacts.get(id) ?? null,
    },
  }, { now: () => NOW });
  return {
    service,
    input: {
      session_key: `next-${nextIssueId}`,
      title_card_id: 'title_1',
      arena_kind: 'evidence_landscape' as const,
      target_ref: targetRef,
      input_snapshot_id: snapshot.input_snapshot_id,
      participant_roles: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'] as const,
      execution_plan_ref: { ...ref('artifact_ref', 'next_plan'), version_id: planHash },
      loop_delta_refs: [{
        delta_type: 'evidence' as const,
        ref: nextDeltaRef,
        rationale: `New evidence for ${nextIssueId}.`,
      }],
    },
  };
}

test('evidence-landscape linked-round limit is isolated by durable issue lineage', async () => {
  const differentIssue = await evidenceLandscapeRetryFixture('issue_b');
  const admitted = await differentIssue.service.openSession(differentIssue.input);
  assert.equal(admitted.status, 'open');

  const exhaustedIssue = await evidenceLandscapeRetryFixture('issue_a');
  await assert.rejects(exhaustedIssue.service.openSession(exhaustedIssue.input),
    /linked-round boundary is exhausted/u);
});

test('first-pass role execution records chunk provenance and rejects evidence-free or peer-contaminated exposure', async () => {
  const { arenaCandidateRef, arenaRepository, bindTranscriptExecutions, packet, service } = fixture();
  const session = await service.openSession({
    session_key: 'arena-key-1',
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: ref('validated_need', 'need_1'),
    input_snapshot_id: 'snapshot_1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'plan_1'),
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
    evidence_packet_artifact_ref: ref('artifact_ref', 'packet_1'),
    retrieval_provenance: retrieval,
    exposure_artifact_refs: [ref('artifact_ref', 'packet_1')],
    output_artifact_ref: ref('artifact_ref', 'scout_output'),
    agent_invocation_audit_artifact_ref: ref('artifact_ref', 'scout_audit'),
    execution_provenance: invocationProvenance(
      'opportunity_scout',
      sha256Text(stableStringify({ semantic_position: { recommendation: 'candidate-a' } })),
    ),
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
      evidence_packet_artifact_ref: ref('artifact_ref', 'packet_2'),
      retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer' },
      exposure_artifact_refs: [
        ref('artifact_ref', 'packet_2'),
        ref('artifact_ref', 'scout_output'),
      ],
      output_artifact_ref: ref('artifact_ref', 'killer_output'),
      agent_invocation_audit_artifact_ref: ref('artifact_ref', 'killer_audit'),
      execution_provenance: invocationProvenance(
        'prior_art_topic_killer',
        sha256Text(stableStringify({ semantic_position: { objection: 'prior-art collision' } })),
      ),
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
      evidence_packet_artifact_ref: ref('artifact_ref', 'packet_2'),
      retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer', hits: [] },
      exposure_artifact_refs: [ref('artifact_ref', 'packet_2')],
      output_artifact_ref: ref('artifact_ref', 'killer_output'),
      agent_invocation_audit_artifact_ref: ref('artifact_ref', 'killer_audit'),
      execution_provenance: invocationProvenance(
        'prior_art_topic_killer',
        sha256Text(stableStringify({ semantic_position: { objection: 'prior-art collision' } })),
      ),
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const killer = await service.recordRoleExecution({
    arena_session_id: session.arena_session_id,
    role_slot_id: 'killer',
    instance_index: 0,
    participant_role: 'prior_art_topic_killer',
    pass_kind: 'first_pass',
    evidence_packet_artifact_ref: ref('artifact_ref', 'packet_2'),
    retrieval_provenance: { ...retrieval, participant_role: 'prior_art_topic_killer' },
    exposure_artifact_refs: [ref('artifact_ref', 'packet_2')],
    output_artifact_ref: ref('artifact_ref', 'killer_output'),
    agent_invocation_audit_artifact_ref: ref('artifact_ref', 'killer_audit'),
    execution_provenance: invocationProvenance(
      'prior_art_topic_killer',
      sha256Text(stableStringify({ semantic_position: { objection: 'prior-art collision' } })),
    ),
  });
  assert.equal(killer.prior_role_hashes.length, 0);

  const projectionFor = (arenaSynthesisHash: string) => ({
    candidate_ref: arenaCandidateRef,
    semantic_group_key: '1'.repeat(64),
    advisory: {
      schema_version: 'TopicSelectionNeedCandidateArenaAdvisory@v1' as const,
      arena_session_id: session.arena_session_id,
      arena_synthesis_ref: ref('artifact_ref', 'transcript_1'),
      arena_synthesis_hash: arenaSynthesisHash,
      disposition: 'parked' as const,
      rationale: 'Current evidence does not support selection or rejection.',
      drop_reason_code: null,
      reopening_conditions: ['Add a direct-comparison evidence delta.'],
      selected_against_candidate_ref: null,
      support_only: true as const,
    },
  });
  const forgedTranscriptHash = bindTranscriptExecutions([scout, killer], { output_hash: 'f'.repeat(64) });
  await assert.rejects(
    service.synthesizeSession({
      arena_session_id: session.arena_session_id,
      termination_reason: 'evidence_expansion_required',
      loop_transcript_artifact_ref: ref('artifact_ref', 'transcript_1'),
      candidate_projections: [projectionFor(forgedTranscriptHash)],
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  const transcriptHash = bindTranscriptExecutions([scout, killer]);

  const synthesizeSessionWithCandidateProjections = arenaRepository
    .synthesizeSessionWithCandidateProjections.bind(arenaRepository);
  arenaRepository.synthesizeSessionWithCandidateProjections = async () => {
    throw new TopicSelectionResearchArenaConflictError('Arena synthesis changed concurrently.');
  };
  await assert.rejects(
    service.synthesizeSession({
      arena_session_id: session.arena_session_id,
      termination_reason: 'evidence_expansion_required',
      loop_transcript_artifact_ref: ref('artifact_ref', 'transcript_1'),
      candidate_projections: [projectionFor(transcriptHash)],
    }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  arenaRepository.synthesizeSessionWithCandidateProjections = synthesizeSessionWithCandidateProjections;

  const synthesized = await service.synthesizeSession({
    arena_session_id: session.arena_session_id,
    termination_reason: 'evidence_expansion_required',
    loop_transcript_artifact_ref: ref('artifact_ref', 'transcript_1'),
    candidate_projections: [projectionFor(transcriptHash)],
  });
  assert.equal(synthesized.status, 'synthesized');
  assert.equal(synthesized.termination_reason, 'evidence_expansion_required');
  assert.match(synthesized.loop_transcript_hash ?? '', /^[a-f0-9]{64}$/);
  const projectionReader = arenaRepository as InMemoryTopicSelectionResearchArenaRepository & {
    findCandidateProjectionById(candidateId: string): Promise<unknown>;
  };
  const projection = await projectionReader.findCandidateProjectionById('candidate_1');
  assert.equal(Reflect.get(projection ?? {}, 'semantic_group_key'), '1'.repeat(64));
  assert.equal(Reflect.get(Reflect.get(projection ?? {}, 'advisory') ?? {}, 'disposition'), 'parked');
  await assert.rejects(
    service.synthesizeSession({
      arena_session_id: session.arena_session_id,
      termination_reason: 'recommendation_ready',
      loop_transcript_artifact_ref: ref('artifact_ref', 'transcript_1'),
      candidate_projections: [],
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});
