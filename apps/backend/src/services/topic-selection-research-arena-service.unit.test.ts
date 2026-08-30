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

function fixture() {
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
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
