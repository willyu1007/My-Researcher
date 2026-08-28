import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaRoleEvidencePreparation,
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaRoleOutput,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionAgentInvocationRequest,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionResearchArenaShadowRunnerService } from './topic-selection-research-arena-shadow-runner-service.js';

const HASH = 'a'.repeat(64);
const NOW = '2026-08-29T00:00:00.000Z';
const candidateRef: TopicSelectionFunctionalRef = {
  ref_type: 'topic_question_candidate',
  ref_id: 'candidate_1',
  title_card_id: 'title_1',
  version_id: 'v1',
};
const evidenceUnitRef: TopicSelectionFunctionalRef = {
  ref_type: 'evidence_unit',
  ref_id: 'unit_1',
  title_card_id: 'title_1',
  version_id: 'v1',
};
const literatureRef: TopicSelectionFunctionalRef = {
  ref_type: 'literature_record',
  ref_id: 'lit_1',
};
const queryIntent = {
  intent_type: 'context' as const,
  query: 'Does the nearest prior art collapse the candidate distinction?',
  rationale: 'Test whether the candidate is worth continued investment.',
  target_claim: 'The candidate isolates a distinct mechanism.',
};

function roleOutput(
  role: 'opportunity_scout' | 'prior_art_topic_killer',
  disposition: 'selected' | 'parked' | 'dropped',
): TopicSelectionResearchArenaRoleOutput {
  return {
    schema_version: 'TopicSelectionResearchArenaRoleOutput@v1',
    participant_role: role,
    semantic_position: {
      recommended_set_outcome: disposition === 'selected'
        ? 'selected'
        : disposition === 'dropped'
          ? 'none_viable'
          : 'evidence_expansion_required',
      summary: `${role} first-pass position`,
      confidence: 0.8,
    },
    candidate_reviews: [{
      candidate_ref: candidateRef,
      recommended_disposition: disposition,
      rationale: `${role} reviewed the candidate against its own packet.`,
      evidence_unit_refs: [evidenceUnitRef],
      drop_reason_code: disposition === 'dropped' ? 'near_isomorphic_prior_art' : null,
      reopening_conditions: disposition === 'dropped' ? ['Show a discriminating mechanism.'] : [],
    }],
    findings: [{
      finding_id: `finding_${role}`,
      kind: 'candidate_value',
      severity: 'material',
      statement: `${role} material finding`,
      evidence_unit_refs: [evidenceUnitRef],
      literature_refs: [literatureRef],
    }],
    new_candidate_proposals: [],
    concessions: [],
    unresolved_minority_report: null,
  };
}

function preparation(
  role: 'opportunity_scout' | 'prior_art_topic_killer',
): TopicSelectionResearchArenaRoleEvidencePreparation {
  return {
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1',
    status: 'ready',
    title_card_id: 'title_1',
    participant_role: role,
    query_intent: queryIntent,
    evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: 'title_1', version_id: 'v1' },
    search_run_ref: { ref_type: 'search_run', ref_id: `search_${role}`, title_card_id: 'title_1' },
    retrieval_provenance: {
      participant_role: role,
      query_intent: queryIntent,
      search_run_ref: { ref_type: 'search_run', ref_id: `search_${role}`, title_card_id: 'title_1' },
      hits: [{
        literature_ref: literatureRef,
        embedding_version_id: 'embedding_v1',
        chunk_id: `chunk_${role}`,
        chunk_hash: HASH,
        rank: 1,
        hybrid_score: 0.9,
        vector_score: 0.8,
        lexical_score: 0.7,
        is_stale: false,
      }],
      provenance_hash: HASH,
    },
    selected_evidence_unit_refs: [evidenceUnitRef],
    unresolved_literature_refs: [],
    evidence_packet_artifact_ref: {
      ref_type: 'artifact_ref',
      ref_id: `packet_${role}`,
      title_card_id: 'title_1',
    },
    evidence_packet_hash: HASH,
  };
}

test('shadow runner completes both isolated first-pass invocations before admission and parks conflict', async () => {
  const session: TopicSelectionResearchArenaSessionRecord = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_1',
    session_key: 'arena-key',
    current_arena_key: 'title_1:gap_portfolio',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: { ref_type: 'validated_need', ref_id: 'need_1', title_card_id: 'title_1', version_id: 'v1' },
    input_snapshot_id: 'snapshot_1',
    input_snapshot_hash: HASH,
    participant_plan_hash: HASH,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: { ref_type: 'artifact_ref', ref_id: 'plan_1', title_card_id: 'title_1' },
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
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_1',
    workspace_id: null,
    title_card_id: 'title_1',
    target_ref: session.target_ref,
    snapshot_hash: HASH,
    source_refs: [candidateRef],
    permission_refs: [],
    payload: { candidate_refs: [candidateRef] },
    created_by: 'system',
    created_at: NOW,
  };
  const packetArtifact = (
    role: 'opportunity_scout' | 'prior_art_topic_killer',
  ): TopicSelectionArtifactRefRecord => ({
    artifact_ref_id: `packet_${role}`,
    workspace_id: null,
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload: {
      schema_version: 'TopicSelectionResearchEvidencePacket@v1',
      title_card_id: 'title_1',
      participant_role: role,
      query_intent: queryIntent,
      items: [{ evidence_unit_ref: evidenceUnitRef, literature_ref: literatureRef }],
      source_refs: [evidenceUnitRef],
      total_excerpt_chars: 20,
      packet_hash: HASH,
    },
    checksum: HASH,
    input_snapshot_id: 'snapshot_1',
    created_by: 'system',
    created_at: NOW,
  });
  const artifacts = new Map<string, TopicSelectionArtifactRefRecord>([
    ['packet_opportunity_scout', packetArtifact('opportunity_scout')],
    ['packet_prior_art_topic_killer', packetArtifact('prior_art_topic_killer')],
  ]);
  const invocationCalls: Array<TopicSelectionAgentInvocationRequest<unknown>> = [];
  const admittedInputs: Array<Record<string, unknown>> = [];
  const recordedArtifacts: TopicSelectionArtifactRefRecord[] = [];
  let artifactIndex = 0;

  const service = new TopicSelectionResearchArenaShadowRunnerService({
    arenaRepository: {
      findSessionById: async () => session,
    },
    snapshotReader: {
      getInputSnapshot: async () => snapshot,
    },
    artifactStore: {
      getArtifactRef: async (id) => artifacts.get(id) ?? null,
      recordArtifactRef: async (input) => {
        const artifact: TopicSelectionArtifactRefRecord = {
          artifact_ref_id: `output_${++artifactIndex}`,
          workspace_id: input.workspace_id ?? null,
          title_card_id: input.title_card_id ?? null,
          artifact_kind: input.artifact_kind,
          storage_kind: input.storage_kind ?? 'inline',
          uri: input.uri ?? null,
          payload: input.payload ?? null,
          checksum: input.checksum ?? HASH,
          byte_size: input.byte_size ?? null,
          mime_type: input.mime_type ?? 'application/json',
          workflow_run_id: input.workflow_run_id ?? null,
          input_snapshot_id: input.input_snapshot_id ?? null,
          created_by: input.created_by ?? 'system',
          created_at: NOW,
        };
        recordedArtifacts.push(artifact);
        artifacts.set(artifact.artifact_ref_id, artifact);
        return artifact;
      },
    },
    agentInvoker: {
      async invokeStructuredOutput<T>(input: TopicSelectionAgentInvocationRequest<T>) {
        invocationCalls.push(input as TopicSelectionAgentInvocationRequest<unknown>);
        if (invocationCalls.length === 2) {
          assert.equal(recordedArtifacts.length, 0, 'both role invocations must finish before durable admission starts');
        }
        return {
          status: 'succeeded' as const,
          structured_output: input.mocked_output?.output ?? null,
        };
      },
    },
    arenaService: {
      recordRoleExecution: async (input) => {
        admittedInputs.push(input as unknown as Record<string, unknown>);
        const outputArtifact = await Promise.resolve(artifacts.get(input.output_artifact_ref.ref_id)!);
        return {
          schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
          arena_role_execution_id: `execution_${input.participant_role}`,
          arena_session_id: input.arena_session_id,
          title_card_id: 'title_1',
          role_slot_id: input.role_slot_id,
          instance_index: input.instance_index,
          participant_role: input.participant_role,
          pass_kind: input.pass_kind,
          input_snapshot_id: 'snapshot_1',
          input_snapshot_hash: HASH,
          query_intent: input.retrieval_provenance.query_intent,
          evidence_packet_artifact_ref: input.evidence_packet_artifact_ref,
          evidence_packet_hash: HASH,
          evidence_partition_refs: [evidenceUnitRef],
          retrieval_provenance: { ...input.retrieval_provenance, provenance_hash: HASH },
          exposure_artifact_refs: input.exposure_artifact_refs,
          exposure_set_hash: HASH,
          output_artifact_ref: input.output_artifact_ref,
          output_artifact_hash: outputArtifact.checksum!,
          semantic_position_hash: HASH,
          prior_role_hashes: [],
          runtime_identity_hash: HASH,
          created_at: NOW,
        } satisfies TopicSelectionResearchArenaRoleExecutionRecord;
      },
      synthesizeSession: async (input) => ({
        ...session,
        current_arena_key: null,
        status: 'synthesized' as const,
        termination_reason: input.termination_reason,
        loop_transcript_ref: input.loop_transcript_artifact_ref,
        loop_transcript_hash: HASH,
        synthesized_at: NOW,
      }),
    },
  });

  const result = await service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_1',
    node_attempt_id: 'attempt_1',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: roleOutput('opportunity_scout', 'selected'),
        fixture_id: 'fixture_scout',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: roleOutput('prior_art_topic_killer', 'dropped'),
        fixture_id: 'fixture_killer',
        operator_label: null,
      },
    ],
  });

  assert.equal(invocationCalls.length, 2);
  assert.equal(admittedInputs.length, 2);
  assert.equal(result.advisory_synthesis.outcome, 'evidence_expansion_required');
  assert.equal(result.advisory_synthesis.candidate_dispositions[0]?.disposition, 'parked');
  assert.equal(result.arena_session.termination_reason, 'evidence_expansion_required');
  assert.equal(result.support_only, true);
  assert.equal(recordedArtifacts.every((artifact) => artifact.input_snapshot_id === 'snapshot_1'), true);
  for (const call of invocationCalls) {
    const userMessage = call.messages.find((message) => message.role === 'user')?.content ?? '';
    assert.match(userMessage, /candidate_1/u);
    assert.doesNotMatch(userMessage, /finding_opportunity_scout|finding_prior_art_topic_killer/u);
    assert.equal(call.context_packet_refs?.length, 1);
  }
  for (const admitted of admittedInputs) {
    assert.deepEqual(admitted.exposure_artifact_refs, [admitted.evidence_packet_artifact_ref]);
    assert.deepEqual(admitted.prior_role_hashes, []);
  }

  const noneViable = await service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_2',
    node_attempt_id: 'attempt_2',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: roleOutput('opportunity_scout', 'dropped'),
        fixture_id: 'fixture_scout_drop',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: roleOutput('prior_art_topic_killer', 'dropped'),
        fixture_id: 'fixture_killer_drop',
        operator_label: null,
      },
    ],
  });
  assert.equal(noneViable.advisory_synthesis.outcome, 'none_viable');
  assert.equal(noneViable.advisory_synthesis.candidate_dispositions[0]?.disposition, 'dropped');

  const killerWithProposal = roleOutput('prior_art_topic_killer', 'parked');
  killerWithProposal.new_candidate_proposals = [{
    proposal_key: 'repair-the-candidate',
    semantic_group_key: 'forbidden-killer-repair',
    title: 'Forbidden repair',
    research_object: 'A repaired object',
    mechanism: 'A repaired mechanism',
    expected_contribution: 'A repaired contribution',
    falsification_condition: 'A repaired falsification condition',
    evidence_unit_refs: [evidenceUnitRef],
  }];
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_3',
    node_attempt_id: 'attempt_3',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: roleOutput('opportunity_scout', 'parked'),
        fixture_id: 'fixture_scout_park',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: killerWithProposal,
        fixture_id: 'fixture_killer_repair',
        operator_label: null,
      },
    ],
  }), /cannot propose or repair candidates/u);

  const contradictoryScout = roleOutput('opportunity_scout', 'selected');
  contradictoryScout.semantic_position.recommended_set_outcome = 'evidence_expansion_required';
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_4',
    node_attempt_id: 'attempt_4',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: contradictoryScout,
        fixture_id: 'fixture_scout_contradiction',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: roleOutput('prior_art_topic_killer', 'parked'),
        fixture_id: 'fixture_killer_park',
        operator_label: null,
      },
    ],
  }), /set-level position contradicts/u);

  session.participant_roles = ['opportunity_scout', 'opportunity_scout'];
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_5',
    node_attempt_id: 'attempt_5',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [],
  }), /requires exactly the opportunity scout and prior-art topic killer/u);
});
