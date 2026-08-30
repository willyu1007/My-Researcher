import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionAgentInvocationProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
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
import { TopicSelectionResearchArenaShadowProofService } from './topic-selection-research-arena-shadow-proof-service.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionRiskFindingService } from './topic-selection-risk-finding-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const HASH = 'a'.repeat(64);
const packetHash = (role: 'opportunity_scout' | 'prior_art_topic_killer') => (
  role === 'opportunity_scout' ? 'a'.repeat(64) : 'b'.repeat(64)
);
const NOW = '2026-08-29T00:00:00.000Z';
const candidateRef: TopicSelectionFunctionalRef = {
  ref_type: 'need_candidate',
  ref_id: 'candidate_1',
  title_card_id: 'title_1',
  version_id: 'v1',
};
const candidateRef2: TopicSelectionFunctionalRef = {
  ref_type: 'need_candidate',
  ref_id: 'candidate_2',
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
      reopening_conditions: disposition === 'selected' ? [] : ['Show a discriminating mechanism.'],
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
    retrieval_execution_mode: 'local_snapshot_lexical',
    provider_call_count: 0,
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
    evidence_packet_hash: packetHash(role),
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
    source_refs: [candidateRef, candidateRef2],
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
      packet_hash: packetHash(role),
    },
    checksum: packetHash(role),
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
  const synthesizedInputs: Array<Record<string, unknown>> = [];
  const recordedArtifacts: TopicSelectionArtifactRefRecord[] = [];
  const candidateRows = new Map([
    ['candidate_1', {
      need_candidate_id: 'candidate_1',
      title_card_id: 'title_1',
      candidate_version: 'v1',
      semantic_group_key: '1'.repeat(64),
      decision_status: 'ready_for_validation' as const,
    }],
    ['candidate_2', {
      need_candidate_id: 'candidate_2',
      title_card_id: 'title_1',
      candidate_version: 'v1',
      semantic_group_key: '2'.repeat(64),
      decision_status: 'ready_for_validation' as const,
    }],
  ]);
  let artifactIndex = 0;
  const clock = [100, 125];
  let riskArtifactIndex = 0;
  const riskFindingRecorder = new TopicSelectionRiskFindingService(
    new TopicSelectionControlPlaneService(
      new InMemoryTopicSelectionControlPlaneRepository(),
      {
        idFactory: (prefix) => `${prefix}_risk_${++riskArtifactIndex}`,
        now: () => NOW,
      },
    ),
  );

  const service = new TopicSelectionResearchArenaShadowRunnerService({
    arenaRepository: {
      findSessionById: async () => session,
    },
    snapshotReader: {
      getInputSnapshot: async () => snapshot,
    },
    candidateReader: {
      findNeedCandidateById: async (id: string) => candidateRows.get(id) ?? null,
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
        const structuredOutput = input.mocked_output?.output ?? null;
        const outputHash = sha256Text(stableStringify(structuredOutput));
        const provenance: TopicSelectionAgentInvocationProvenance = {
          workflow_run_id: input.workflow_run_id,
          node_id: input.node_id,
          node_attempt_id: input.node_attempt_id,
          invocation_attempt_id: `${input.node_attempt_id}:invocation`,
          execution_mode: input.execution_mode,
          executor_kind: input.executor_kind,
          source_kind: 'mock_fixture',
          non_provider: true,
          run_mode: input.run_mode,
          profile_id: input.profile_id,
          profile_version: 'v1',
          profile_hash: HASH,
          model_option_id: null,
          normalized_params_hash: null,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract,
          prompt_template_id: input.prompt.promptTemplateId,
          prompt_template_version: input.prompt.version,
          schema_name: input.schema_name,
          prompt_packet_hash: HASH,
          response_hash: outputHash,
          structured_output_hash: outputHash,
          cache_status: 'not_applicable',
          response_reuse_ref: null,
          fixture_id: input.mocked_output?.fixture_id ?? null,
          fixture_hash: outputHash,
          mock_profile: input.mocked_output?.mock_profile ?? null,
          telemetry: null,
        };
        return {
          status: 'succeeded' as const,
          structured_output: structuredOutput,
          provenance,
          audit_artifact_ref: {
            ref_type: 'artifact_ref',
            ref_id: `audit_${input.node_id}`,
            title_card_id: 'title_1',
          },
        };
      },
    },
    arenaService: {
      recordRoleExecution: async (input) => {
        admittedInputs.push(input as unknown as Record<string, unknown>);
        const outputArtifact = await Promise.resolve(artifacts.get(input.output_artifact_ref.ref_id)!);
        return {
          schema_version: 'TopicSelectionResearchArenaRoleExecution@v2',
          execution_identity_status: 'product_invocation_verified',
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
          evidence_packet_hash: artifacts.get(input.evidence_packet_artifact_ref.ref_id)!.checksum!,
          evidence_partition_refs: [evidenceUnitRef],
          retrieval_provenance: { ...input.retrieval_provenance, provenance_hash: HASH },
          exposure_artifact_refs: input.exposure_artifact_refs,
          exposure_set_hash: HASH,
          output_artifact_ref: input.output_artifact_ref,
          output_artifact_hash: outputArtifact.checksum!,
          semantic_position_hash: HASH,
          agent_invocation_audit_artifact_ref: input.agent_invocation_audit_artifact_ref,
          agent_invocation_audit_artifact_hash: HASH,
          execution_provenance_hash: HASH,
          prior_role_hashes: [],
          runtime_identity_hash: HASH,
          created_at: NOW,
        } satisfies TopicSelectionResearchArenaRoleExecutionRecord;
      },
      synthesizeSession: async (input) => {
        synthesizedInputs.push(input as unknown as Record<string, unknown>);
        return {
          ...session,
          current_arena_key: null,
          status: 'synthesized' as const,
          termination_reason: input.termination_reason,
          loop_transcript_ref: input.loop_transcript_artifact_ref,
          loop_transcript_hash: HASH,
          synthesized_at: NOW,
        };
      },
    },
    riskFindingRecorder,
    now: () => clock.shift() ?? 125,
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
  assert.equal(candidateRows.get('candidate_1')?.decision_status, 'ready_for_validation');
  const initialProjection = Reflect.get(synthesizedInputs[0] ?? {}, 'candidate_projections');
  assert.ok(Array.isArray(initialProjection));
  assert.equal(initialProjection.length, 1);
  assert.equal(Reflect.get(initialProjection[0] ?? {}, 'semantic_group_key'), '1'.repeat(64));
  const initialAdvisory = Reflect.get(initialProjection[0] ?? {}, 'advisory');
  assert.equal(Reflect.get(initialAdvisory ?? {}, 'disposition'), 'parked');
  assert.equal(Reflect.get(initialAdvisory ?? {}, 'selected_against_candidate_ref'), null);
  assert.equal(result.risk_finding_refs?.length, 2);
  assert.equal(
    result.risk_finding_refs?.every((ref) => ref.version_id === 'TopicSelectionRiskFinding@v1'),
    true,
  );
  assert.deepEqual(result.execution_accounting, {
    non_provider_role_invocation_count: 2,
    provider_call_count: 0,
    retrieval_run_count: 2,
    retrieval_hit_count: 2,
    evidence_excerpt_chars: 40,
    duration_ms: 25,
  });
  assert.equal(recordedArtifacts.every((artifact) => artifact.input_snapshot_id === 'snapshot_1'), true);
  for (const call of invocationCalls) {
    const userMessage = call.messages.find((message) => message.role === 'user')?.content ?? '';
    assert.match(userMessage, /candidate_1/u);
    assert.doesNotMatch(userMessage, /finding_opportunity_scout|finding_prior_art_topic_killer/u);
    assert.equal(call.context_packet_refs?.length, 1);
    assert.equal(Reflect.get(call, 'input_snapshot_id'), 'snapshot_1');
  }
  for (const admitted of admittedInputs) {
    assert.deepEqual(admitted.exposure_artifact_refs, [admitted.evidence_packet_artifact_ref]);
    assert.deepEqual(admitted.prior_role_hashes, []);
    assert.equal(
      Reflect.get(admitted, 'agent_invocation_audit_artifact_ref') !== undefined,
      true,
    );
    assert.equal(Reflect.get(admitted, 'execution_provenance') !== undefined, true);
  }
  const transcript = recordedArtifacts.find(
    (artifact) => artifact.payload?.schema_version === 'TopicSelectionResearchArenaLoopTranscript@v2',
  );
  assert.ok(transcript);
  const firstPass = Reflect.get(transcript.payload ?? {}, 'independent_first_pass');
  assert.ok(Array.isArray(firstPass));
  assert.equal(
    firstPass.every((entry: unknown) => (
      typeof entry === 'object'
      && entry !== null
      && Reflect.get(entry, 'agent_invocation_audit_artifact_hash') === HASH
    )),
    true,
  );

  const proof = new TopicSelectionResearchArenaShadowProofService().evaluate({
    proof_key: 'runner-integration-proof',
    cases: [{
      case_id: 'runner-AF',
      case_kind: 'ambiguous_lineage',
      attempts: [{
        response: result,
        role_outputs: [
          roleOutput('opportunity_scout', 'selected'),
          roleOutput('prior_art_topic_killer', 'dropped'),
        ],
      }],
      candidate_refs: [candidateRef],
      expected_drop_reason_code: null,
    }],
  });
  assert.equal(proof.case_results[0]?.status, 'inspect');
  assert.equal(proof.metrics.evidence_independent_attempt_count, 1);
  assert.match(proof.human_view_markdown, /证据独立性/u);

  const providerPreparation = preparation('opportunity_scout');
  providerPreparation.retrieval_execution_mode = 'provider_hybrid';
  providerPreparation.provider_call_count = 1;
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_provider',
    node_attempt_id: 'attempt_provider',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout', participant_role: 'opportunity_scout',
        evidence_preparation: providerPreparation,
        structured_output: roleOutput('opportunity_scout', 'selected'),
        fixture_id: 'fixture_provider', operator_label: null,
      },
      {
        role_slot_id: 'killer', participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: roleOutput('prior_art_topic_killer', 'dropped'),
        fixture_id: 'fixture_killer', operator_label: null,
      },
    ],
  }), /provider-free local-snapshot/u);

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

  const parkedWithoutReopening = roleOutput('opportunity_scout', 'parked');
  parkedWithoutReopening.candidate_reviews[0]!.reopening_conditions = [];
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_missing_reopening',
    node_attempt_id: 'attempt_missing_reopening',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: parkedWithoutReopening,
        fixture_id: 'fixture_scout_missing_reopening',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: roleOutput('prior_art_topic_killer', 'parked'),
        fixture_id: 'fixture_killer_parked',
        operator_label: null,
      },
    ],
  }), /require reopening conditions/u);

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

  const multiSelectedScout = roleOutput('opportunity_scout', 'selected');
  multiSelectedScout.candidate_reviews.push({
    ...multiSelectedScout.candidate_reviews[0]!,
    candidate_ref: candidateRef2,
  });
  const twoCandidateKiller = roleOutput('prior_art_topic_killer', 'parked');
  twoCandidateKiller.candidate_reviews.push({
    ...twoCandidateKiller.candidate_reviews[0]!,
    candidate_ref: candidateRef2,
  });
  await assert.rejects(service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_multi_select',
    node_attempt_id: 'attempt_multi_select',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef, candidateRef2],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: multiSelectedScout,
        fixture_id: 'fixture_scout_multi_select',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: twoCandidateKiller,
        fixture_id: 'fixture_killer_two_candidates',
        operator_label: null,
      },
    ],
  }), /at most one canonical candidate/u);

  const scoutWithParkedAlternative = roleOutput('opportunity_scout', 'selected');
  scoutWithParkedAlternative.candidate_reviews.push({
    ...scoutWithParkedAlternative.candidate_reviews[0]!,
    candidate_ref: candidateRef2,
    recommended_disposition: 'parked',
    reopening_conditions: ['Reopen after a typed evidence delta.'],
  });
  const killerWithParkedAlternative = roleOutput('prior_art_topic_killer', 'selected');
  killerWithParkedAlternative.candidate_reviews.push({
    ...killerWithParkedAlternative.candidate_reviews[0]!,
    candidate_ref: candidateRef2,
    recommended_disposition: 'parked',
    reopening_conditions: ['Reopen after a typed evidence delta.'],
  });
  const oneActivePath = await service.run({
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_one_active_path',
    node_attempt_id: 'attempt_one_active_path',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef, candidateRef2],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: scoutWithParkedAlternative,
        fixture_id: 'fixture_scout_one_active_path',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: killerWithParkedAlternative,
        fixture_id: 'fixture_killer_one_active_path',
        operator_label: null,
      },
    ],
  });
  assert.equal(oneActivePath.advisory_synthesis.outcome, 'selected');
  assert.deepEqual(
    oneActivePath.advisory_synthesis.candidate_dispositions.map((candidate) => candidate.disposition),
    ['selected', 'parked'],
  );
  assert.equal(oneActivePath.arena_session.termination_reason, 'recommendation_ready');
  const oneActiveProjection = Reflect.get(
    synthesizedInputs[synthesizedInputs.length - 1] ?? {},
    'candidate_projections',
  );
  assert.ok(Array.isArray(oneActiveProjection));
  const parkedAdvisory = Reflect.get(oneActiveProjection[1] ?? {}, 'advisory');
  assert.equal(Reflect.get(parkedAdvisory ?? {}, 'disposition'), 'parked');
  assert.equal(
    Reflect.get(Reflect.get(parkedAdvisory ?? {}, 'selected_against_candidate_ref') ?? {}, 'ref_id'),
    'candidate_1',
  );

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
