import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionEvidenceConvergenceRoundRole,
  TopicSelectionEvidenceConvergenceRoundRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionResearchArenaSessionRecord,
  TopicSelectionResearchEvidencePacket,
  TopicSelectionResearchEvidencePacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionBoundedDebateCoreService } from './topic-selection-bounded-debate-core-service.js';
import { TopicSelectionContextPolicyProfileRegistryService } from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionEvidenceConvergenceRoundService,
  type TopicSelectionRunEvidenceConvergenceRoundInput,
} from './topic-selection-evidence-convergence-round-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

const NOW = '2026-09-03T08:00:00.000Z';
const TITLE_CARD_ID = 'title_1';

function ref(refType: string, refId: string, versionId?: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function roleOutput(
  role: TopicSelectionEvidenceConvergenceRoundRole,
  issueRef: TopicSelectionFunctionalRef,
  mapRef: TopicSelectionFunctionalRef,
  deltaRef: TopicSelectionFunctionalRef,
  evidenceUnitRef: TopicSelectionFunctionalRef,
): TopicSelectionEvidenceConvergenceRoundRoleOutput {
  return {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1',
    participant_role: role,
    issue_ref: issueRef,
    evidence_map_ref: mapRef,
    evidence_delta_ref: deltaRef,
    semantic_position: {
      summary: `${role} supports rechecking the same evidence-landscape gate.`,
      recommended_disposition: 'recheck_same_gate',
      confidence: 0.8,
    },
    cited_evidence_unit_refs: [evidenceUnitRef],
    unresolved_issue_codes: [],
    support_only: true,
  };
}

function evidenceUnit(
  id: string,
  role: 'support' | 'challenge' | 'baseline',
  evidenceMap: TopicSelectionEvidenceMapRecord,
  issueRef: TopicSelectionFunctionalRef,
): TopicSelectionEvidenceUnitRecord {
  return {
    evidence_unit_id: id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: evidenceMap.evidence_map_id,
    evidence_map_version: evidenceMap.evidence_map_version,
    search_run_ref: evidenceMap.search_run_ref,
    search_plan_ref: evidenceMap.search_plan_ref,
    literature_snapshot_ref: evidenceMap.literature_snapshot_ref,
    coverage_row_intent_ref: role === 'challenge' ? issueRef : null,
    literature_ref: ref('literature_record', `lit_${role}`),
    source_refs: [ref('literature_fulltext', `source_${role}`)],
    locator: {
      locator_type: 'section',
      locator_ref: ref('literature_section', `locator_${role}`),
      literature_ref: ref('literature_record', `lit_${role}`),
      source_ref: ref('literature_source', `source_${role}`),
      document_ref: ref('literature_document', `document_${role}`),
      section_ref: ref('literature_section', `section_${role}`),
    },
    evidence_role: role,
    source_attribution_kind: role === 'challenge' ? 'counter_evidence' : 'source_claim',
    source_statement: `${role} claim-bearing evidence`,
    normalized_statement: null,
    interpretation_payload: {},
    extraction_confidence: 0.9,
    abstract_only: false,
    review_status: 'machine_checked',
    freshness_status: 'current',
    issue_codes: [],
    created_by: 'system',
    created_at: NOW,
  };
}

test('material successor runs one linked frozen Arena round before the fresh checkpoint', async () => {
  let sequence = 0;
  const controlRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlRepository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const arena = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: controlRepository,
  }, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  const issueRef = ref('coverage_row_intent', 'coverage_child');
  const predecessorMapRef = ref('evidence_map', 'map_1', 'v1');
  const mapRef = ref('evidence_map', 'map_2', 'v2');
  const evidenceUnitRef = ref('evidence_unit', 'unit_2', 'v2');
  const deltaPayload = {
    schema_version: 'TopicSelectionEvidenceDelta@v1' as const,
    issue_refs: [issueRef],
    predecessor_evidence_map_ref: predecessorMapRef,
    admitted_evidence_unit_refs: [evidenceUnitRef],
    changed_claim_refs: [evidenceUnitRef],
    negative_coverage_changes: [],
    source_health_changes: [],
    conflict_changes: [],
    decision_relevance: 'The new challenge claim may satisfy required coverage.',
    material: true,
  };
  const deltaArtifact = await controlPlane.recordEvidenceConvergenceArtifact({
    title_card_id: TITLE_CARD_ID,
    workflow_run_id: 'workflow_1',
    artifact_type: 'evidence_delta',
    payload: deltaPayload,
  });
  const deltaRef = ref('artifact_ref', deltaArtifact.artifact_ref_id, deltaArtifact.checksum!);
  const snapshot = await controlPlane.compileInputSnapshot({
    title_card_id: TITLE_CARD_ID,
    target_ref: mapRef,
    source_refs: [predecessorMapRef, deltaRef, ref('search_run', 'run_2')],
    payload: { evidence_delta_ref: deltaRef },
    created_by: 'system',
  });
  const evidenceMap: TopicSelectionEvidenceMapRecord = {
    evidence_map_id: 'map_2',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    evidence_map_version: 'v2',
    status: 'ready',
    review_status: 'machine_checked',
    freshness_status: 'current',
    search_run_ref: ref('search_run', 'run_2'),
    search_plan_ref: ref('search_plan', 'plan_2', 'v2'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'manifest_1'),
    unit_count: 3,
    support_unit_count: 1,
    challenge_unit_count: 1,
    baseline_unit_count: 1,
    context_unit_count: 0,
    digest_payload: {},
    stale_reason_codes: [],
    input_snapshot_id: snapshot.input_snapshot_id,
    workflow_run_id: 'workflow_1',
    gate_result_id: 'gate_1',
    transition_attempt_id: 'transition_1',
    trace_snapshot_id: 'trace_1',
    artifact_refs: [deltaRef],
    predecessor_evidence_map_ref: predecessorMapRef,
    successor_evidence_map_ref: null,
    material_evidence_delta_ref: deltaRef,
    lineage_revision: 0,
    created_by: 'system',
    created_at: NOW,
  };
  const evidenceUnits = [
    evidenceUnit('unit_support', 'support', evidenceMap, issueRef),
    evidenceUnit(evidenceUnitRef.ref_id, 'challenge', evidenceMap, issueRef),
    evidenceUnit('unit_baseline', 'baseline', evidenceMap, issueRef),
  ];
  const searchRun = {
    search_run_id: 'run_2',
    title_card_id: TITLE_CARD_ID,
    query_provenance: [{
      hits: [{
        query: 'failure under shift',
        literature_ref: ref('literature_record', 'lit_1'),
        embedding_version_id: 'embedding_1',
        chunk_ref: ref('fulltext_paragraph', 'paragraph_1'),
        chunk_id: 'chunk_1',
        chunk_hash: 'a'.repeat(64),
        hybrid_score: 0.9,
        vector_score: 0.8,
        lexical_score: 0.7,
        is_stale: false,
        rank: 1,
      }],
    }],
  } as unknown as TopicSelectionSearchRunRecord;
  const parentTranscriptPayload = {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundTranscript@v1',
    arena_session_id: 'arena_parent',
    support_only: true,
  };
  const parentTranscriptHash = sha256Text(stableStringify(parentTranscriptPayload));
  const parentSnapshot = await controlPlane.compileInputSnapshot({
    title_card_id: TITLE_CARD_ID,
    target_ref: predecessorMapRef,
    source_refs: [ref('search_run', 'run_1')],
    payload: { evidence_map_ref: predecessorMapRef },
    created_by: 'system',
  });
  const parentTranscriptArtifact = await controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_parent',
    input_snapshot_id: parentSnapshot.input_snapshot_id,
    payload: parentTranscriptPayload,
    checksum: parentTranscriptHash,
    mime_type: 'application/json',
    created_by: 'system',
  });
  const parent = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_parent',
    session_key: 'parent-key',
    current_arena_key: `${TITLE_CARD_ID}:evidence_landscape`,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    arena_kind: 'evidence_landscape',
    target_ref: predecessorMapRef,
    input_snapshot_id: parentSnapshot.input_snapshot_id,
    input_snapshot_hash: parentSnapshot.snapshot_hash,
    participant_plan_hash: 'c'.repeat(64),
    participant_roles: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'],
    execution_plan_ref: ref('artifact_ref', 'parent_plan'),
    status: 'synthesized',
    termination_reason: 'recommendation_ready',
    loop_transcript_ref: ref(
      'artifact_ref',
      parentTranscriptArtifact.artifact_ref_id,
      parentTranscriptArtifact.checksum!,
    ),
    loop_transcript_hash: parentTranscriptHash,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: NOW,
    superseded_at: null,
  } satisfies TopicSelectionResearchArenaSessionRecord;
  await arenaRepository.replaceCurrentSession(parent);

  const roles = ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'] as const;
  const packets = await Promise.all(roles.map(async (role) => {
    const packetBody = {
      schema_version: 'TopicSelectionResearchEvidencePacket@v1' as const,
      title_card_id: TITLE_CARD_ID,
      participant_role: role,
      query_intent: {
        intent_type: 'challenge' as const,
        query: 'failure under shift',
        rationale: 'Assess the newly admitted challenge claim.',
        target_claim: 'The required challenge row is now directly supported.',
      },
      items: [{
        evidence_unit_ref: evidenceUnitRef,
        evidence_map_ref: mapRef,
        literature_ref: ref('literature_record', 'lit_1'),
        evidence_role: 'challenge' as const,
        relation_to_target_claim: 'challenges' as const,
        source_statement: 'The reported failure persists under distribution shift.',
        resolved_excerpt: 'The reported failure persists under distribution shift.',
        excerpt_hash: 'e'.repeat(64),
        resolved_locator: {
          locator_type: 'paragraph' as const,
          literature_id: 'lit_1',
          document_id: 'doc_1',
          content_row_id: 'paragraph_1',
          parser_ref_id: 'paragraph_1',
          checksum: 'paragraph-checksum',
        },
        freshness: { status: 'current' as const, retrieval_readiness_reason: 'ready' },
        quote_integrity: 'exact_match' as const,
        issue_codes: [],
      }],
      source_refs: [evidenceUnitRef, mapRef, ref('literature_record', 'lit_1')],
      total_excerpt_chars: 58,
    };
    const packet: TopicSelectionResearchEvidencePacket = {
      ...packetBody,
      packet_hash: sha256Text(stableStringify(packetBody)),
    };
    const artifact = await controlPlane.recordArtifactRef({
      title_card_id: TITLE_CARD_ID,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      input_snapshot_id: snapshot.input_snapshot_id,
      workflow_run_id: 'workflow_1',
      payload: packet as unknown as Record<string, unknown>,
      checksum: packet.packet_hash,
      mime_type: 'application/json',
      created_by: 'system',
    });
    return { role, artifact, packet };
  }));
  const checkpoints: unknown[] = [];
  let currentAssessmentId = 'assessment_1';
  let currentAssessmentVerdict: 'satisfied' | 'missing' = 'satisfied';
  const checkpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const checkpointService = new TopicSelectionResearchCheckpointService(
    checkpointRepository,
    controlPlane,
    {
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => NOW,
    },
  );
  const orchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane, now: () => NOW });
  const getCoverageMatrix = async () => ({
    search_plan_ref: evidenceMap.search_plan_ref,
    generated_at: NOW,
    rows: [{
      coverage_row_intent: {
        coverage_row_intent_id: issueRef.ref_id,
        search_plan_id: 'plan_2',
        coverage_key: 'challenge',
        intent_type: 'challenge' as const,
        query: 'failure under shift',
        rationale: 'Required challenge coverage.',
        required: true,
        priority: 1,
        target_source_types: [],
        expected_evidence_role: 'challenge' as const,
        refs: [],
        created_at: NOW,
      },
      evidence_bindings: [],
      risk_acceptances: [],
      latest_assessment: {
        coverage_assessment_id: currentAssessmentId,
        search_plan_id: 'plan_2',
        coverage_row_intent_id: issueRef.ref_id,
        verdict: currentAssessmentVerdict,
        issue_codes: [],
        confidence: 0.9,
        assessed_by: 'system' as const,
        created_at: NOW,
      },
    }],
    summary: {
      row_count: 1,
      satisfied_count: currentAssessmentVerdict === 'satisfied' ? 1 : 0,
      partial_count: 0,
      missing_count: currentAssessmentVerdict === 'missing' ? 1 : 0,
      accepted_risk_count: 0,
      unassessed_count: 0,
    },
  });
  const evidencePacketResolver = {
    resolve: async (request: TopicSelectionResearchEvidencePacketRequest) => {
      const packet = packets.find(({ role }) => role === request.participant_role)?.packet;
      if (!packet) throw new Error(`Missing packet fixture for ${request.participant_role}.`);
      return packet;
    },
  };
  const service = new TopicSelectionEvidenceConvergenceRoundService({
    controlPlane,
    evidenceMaps: {
      findEvidenceMapById: async (id) => id === evidenceMap.evidence_map_id ? evidenceMap : null,
      listEvidenceUnitsByEvidenceMapId: async () => evidenceUnits,
      listConflictSetsByEvidenceMapId: async () => [],
    },
    searchResources: {
      getSearchRunById: async (id) => id === searchRun.search_run_id ? searchRun : null,
      getCoverageMatrix,
    },
    arena,
    debateCore: new TopicSelectionBoundedDebateCoreService({
      controlPlane,
      agentOrchestrator: orchestrator,
    }),
    contextProfiles: new TopicSelectionContextPolicyProfileRegistryService(),
    evidencePacketResolver,
    checkpoints: {
      materializeEvidenceLandscapeCheckpoint: async (input) => {
        checkpoints.push(input);
        const current = await arenaRepository.findCurrentSession(TITLE_CARD_ID, 'evidence_landscape');
        assert.equal(current?.status, 'synthesized', 'checkpoint must be materialized after the linked round');
        return checkpointService.materializeEvidenceLandscapeCheckpoint(input);
      },
    },
    nowMs: () => 100,
  });

  const runInput = {
    title_card_id: TITLE_CARD_ID,
    predecessor_arena_session_id: parent.arena_session_id,
    successor_evidence_map_id: evidenceMap.evidence_map_id,
    evidence_delta_ref: deltaRef,
    issue_ref: issueRef,
    execution_mode: 'mocked_llm',
    role_inputs: packets.map(({ role, artifact }) => ({
      participant_role: role,
      evidence_packet_artifact_ref: ref('artifact_ref', artifact.artifact_ref_id, artifact.checksum!),
      structured_output: roleOutput(role, issueRef, mapRef, deltaRef, evidenceUnitRef),
      fixture_id: `fixture_${role}`,
      operator_label: null,
    })),
    accounting: {
      orchestration_steps: 1,
      linked_rounds: 0,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  } satisfies TopicSelectionRunEvidenceConvergenceRoundInput;
  await assert.rejects(service.runLinkedRound({
    ...runInput,
    workspace_id: 'workspace_other',
  }), /workspace scope/u);
  assert.equal(checkpoints.length, 0);

  const getSession = arena.getSession.bind(arena);
  arena.getSession = async (sessionId) => ({
    ...await getSession(sessionId),
    target_ref: ref('evidence_map', 'unrelated_map', 'unrelated_version'),
  });
  await assert.rejects(service.runLinkedRound(runInput), /parent arena lineage is invalid/u);
  arena.getSession = getSession;
  assert.equal(checkpoints.length, 0);

  const { packet_hash: _packetHash, ...firstPacketBody } = packets[0]!.packet;
  const forgedPacketBody = {
    ...firstPacketBody,
    items: firstPacketBody.items.map((item) => ({
      ...item,
      source_statement: 'A forged statement that was never admitted.',
    })),
  };
  const forgedPacket = {
    ...forgedPacketBody,
    packet_hash: sha256Text(stableStringify(forgedPacketBody)),
  };
  const forgedPacketArtifact = await controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    input_snapshot_id: snapshot.input_snapshot_id,
    workflow_run_id: 'workflow_1',
    payload: forgedPacket,
    checksum: forgedPacket.packet_hash,
    mime_type: 'application/json',
    created_by: 'system',
  });
  await assert.rejects(service.runLinkedRound({
    ...runInput,
    role_inputs: runInput.role_inputs.map((roleInput, index) => index === 0
      ? {
          ...roleInput,
          evidence_packet_artifact_ref: ref(
            'artifact_ref',
            forgedPacketArtifact.artifact_ref_id,
            forgedPacketArtifact.checksum!,
          ),
        }
      : roleInput),
  }), /packet .*authority/u);
  assert.equal(checkpoints.length, 0);

  const exhausted = await service.runLinkedRound({
    ...runInput,
    accounting: {
      ...runInput.accounting,
      linked_rounds: 4,
    },
  });
  assert.equal(exhausted.status, 'boundary_exhausted_unresolved');
  assert.equal(checkpoints.length, 0);

  const blockedArenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  await blockedArenaRepository.replaceCurrentSession(parent);
  const blockedArena = new TopicSelectionResearchArenaService({
    arenaRepository: blockedArenaRepository,
    controlPlaneRepository: controlRepository,
  }, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  const blockedService = new TopicSelectionEvidenceConvergenceRoundService({
    controlPlane,
    evidenceMaps: {
      findEvidenceMapById: async (id) => id === evidenceMap.evidence_map_id ? evidenceMap : null,
      listEvidenceUnitsByEvidenceMapId: async () => evidenceUnits,
      listConflictSetsByEvidenceMapId: async () => [],
    },
    searchResources: {
      getSearchRunById: async (id) => id === searchRun.search_run_id ? searchRun : null,
      getCoverageMatrix,
    },
    arena: blockedArena,
    debateCore: new TopicSelectionBoundedDebateCoreService({
      controlPlane,
      agentOrchestrator: orchestrator,
    }),
    contextProfiles: new TopicSelectionContextPolicyProfileRegistryService(),
    evidencePacketResolver,
    checkpoints: {
      materializeEvidenceLandscapeCheckpoint: async () => {
        throw new Error('a blocked round must not materialize a checkpoint');
      },
    },
    nowMs: () => 100,
  });
  const blockedInput = {
    ...runInput,
    role_inputs: runInput.role_inputs.map((roleInput, index) => index === 0
      ? {
          ...roleInput,
          structured_output: {
            ...roleInput.structured_output,
            unexpected_field: 'schema validation must fail closed',
          } as TopicSelectionEvidenceConvergenceRoundRoleOutput,
        }
      : roleInput),
  };
  const blocked = await blockedService.runLinkedRound(blockedInput);
  assert.equal(blocked.status, 'role_blocked_unresolved');
  if (blocked.status !== 'role_blocked_unresolved') return;
  assert.equal(blocked.arena_session.status, 'blocked');
  const blockedReplay = await blockedService.runLinkedRound(blockedInput);
  assert.deepEqual(blockedReplay, blocked, 'a blocked exact retry must reuse its frozen terminal outcome');
  assert.equal(
    (await blockedArenaRepository.listRoleExecutionsBySessionId(blocked.arena_session.arena_session_id)).length,
    0,
  );

  const claimSessionExecution = arena.claimSessionExecution.bind(arena);
  arena.claimSessionExecution = async () => null;
  const preopened = await service.runLinkedRound(runInput);
  assert.equal(preopened.status, 'execution_interrupted_unresolved');
  assert.equal(preopened.arena_session.status, 'open');
  assert.equal(checkpoints.length, 0);
  arena.claimSessionExecution = claimSessionExecution;

  const [result, concurrentReplay] = await Promise.all([
    service.runLinkedRound(runInput),
    service.runLinkedRound(runInput),
  ]);

  assert.equal(result.status, 'linked_round_completed');
  if (result.status !== 'linked_round_completed') return;
  assert.deepEqual(concurrentReplay, result, 'concurrent exact calls must share one claimed round execution');
  assert.equal(result.role_executions.length, 3);
  assert.equal(result.arena_session.supersedes_arena_session_id, parent.arena_session_id);
  assert.equal(result.arena_session.status, 'synthesized');
  assert.equal(result.round_link.parent_transcript_hash, parent.loop_transcript_hash);
  assert.equal(result.round_link.evidence_delta_hash, deltaArtifact.checksum);
  assert.equal(result.accounting.linked_rounds, 1);
  assert.equal(checkpoints.length, 1);
  const checkpointPacket = await checkpointService.getPacket(result.checkpoint.research_checkpoint_id);
  assert.equal(checkpointPacket.packet_payload.policy_result, 'eligible_for_human_review');
  assert.deepEqual(checkpointPacket.packet_payload.policy_issues, []);
  assert.equal((await arenaRepository.findSessionById(parent.arena_session_id))?.status, 'superseded');

  currentAssessmentId = 'assessment_later';
  currentAssessmentVerdict = 'missing';
  const replay = await service.runLinkedRound(runInput);
  assert.deepEqual(replay, result, 'an exact replay must reuse the completed linked round and its accounting');
  assert.equal(checkpoints.length, 2, 'an exact replay must reuse the frozen checkpoint input');
  assert.equal(
    (await checkpointRepository.listCheckpointsByTitleCardId(TITLE_CARD_ID)).length,
    1,
    'checkpoint materialization must remain durably idempotent',
  );
  assert.equal(
    (await arenaRepository.listRoleExecutionsBySessionId(result.arena_session.arena_session_id)).length,
    3,
    'an exact replay must not execute or persist the three roles again',
  );
  await arenaRepository.replaceCurrentSession({
    ...result.arena_session,
    arena_session_id: 'arena_later_round',
    session_key: 'later-round-key',
    supersedes_arena_session_id: result.arena_session.arena_session_id,
    superseded_by_arena_session_id: null,
  });
  evidenceMap.status = 'stale';
  evidenceMap.freshness_status = 'superseded';
  evidenceMap.successor_evidence_map_ref = ref('evidence_map', 'map_3', 'v3');
  evidenceMap.lineage_revision = (evidenceMap.lineage_revision ?? 0) + 1;
  const historicalReplay = await service.runLinkedRound(runInput);
  assert.equal(historicalReplay.status, 'linked_round_completed');
  assert.equal(historicalReplay.arena_session.status, 'superseded');
  assert.deepEqual(historicalReplay.accounting, result.accounting);
  assert.equal(historicalReplay.checkpoint.research_checkpoint_id, result.checkpoint.research_checkpoint_id);
  assert.equal(checkpoints.length, 3);
  await assert.rejects(service.runLinkedRound({
    ...runInput,
    role_inputs: runInput.role_inputs.map((roleInput, index) => index === 0
      ? {
          ...roleInput,
          structured_output: {
            ...roleInput.structured_output,
            semantic_position: {
              ...roleInput.structured_output.semantic_position,
              summary: 'A changed output must not inherit the completed round transcript.',
            },
          },
        }
      : roleInput),
  }), /transcript identifies a different request/u);
  assert.equal(checkpoints.length, 3);
  assert.equal(
    (await arenaRepository.listRoleExecutionsBySessionId(result.arena_session.arena_session_id)).length,
    3,
  );
});
