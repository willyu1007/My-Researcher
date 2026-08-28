import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaRoleOutput,
  TopicSelectionResearchArenaShadowRunResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import {
  TopicSelectionResearchArenaShadowProofService,
  type TopicSelectionResearchArenaShadowProofAttempt,
  type TopicSelectionResearchArenaShadowProofCase,
} from './topic-selection-research-arena-shadow-proof-service.js';

const titleRef = (titleCardId: string, refType: string, refId: string): TopicSelectionFunctionalRef => ({
  ref_type: refType,
  ref_id: refId,
  title_card_id: titleCardId,
  version_id: 'v1',
});
const HASH = (seed: string) => sha256Text(seed);

function roleOutput(
  role: 'opportunity_scout' | 'prior_art_topic_killer',
  candidateRef: TopicSelectionFunctionalRef,
  disposition: 'selected' | 'parked' | 'dropped',
): TopicSelectionResearchArenaRoleOutput {
  const evidenceRef = titleRef(candidateRef.title_card_id!, 'evidence_unit', `evidence_${role}`);
  return {
    schema_version: 'TopicSelectionResearchArenaRoleOutput@v1',
    participant_role: role,
    semantic_position: {
      recommended_set_outcome: disposition === 'selected'
        ? 'selected'
        : disposition === 'dropped'
          ? 'none_viable'
          : 'evidence_expansion_required',
      summary: `${role} recommends ${disposition}.`,
      confidence: 0.8,
    },
    candidate_reviews: [{
      candidate_ref: candidateRef,
      recommended_disposition: disposition,
      rationale: `${role} inspected its own evidence packet.`,
      evidence_unit_refs: [evidenceRef],
      drop_reason_code: disposition === 'dropped' ? 'near_isomorphic_prior_art' : null,
      reopening_conditions: disposition === 'dropped' ? ['Show a mechanism-level distinction.'] : [],
    }],
    findings: [{
      finding_id: `finding_${candidateRef.ref_id}_${role}`,
      kind: 'fixture_finding',
      severity: 'material',
      statement: `${role} fixture finding.`,
      evidence_unit_refs: [evidenceRef],
      literature_refs: [titleRef(candidateRef.title_card_id!, 'literature_record', `literature_${role}`)],
    }],
    new_candidate_proposals: [],
    concessions: [],
    unresolved_minority_report: null,
  };
}

function attempt(input: {
  arenaSessionId: string;
  titleCardId: string;
  candidateRef: TopicSelectionFunctionalRef;
  scout: 'selected' | 'parked' | 'dropped';
  killer: 'selected' | 'parked' | 'dropped';
  supersedes?: string | null;
  deltas?: TopicSelectionResearchArenaShadowRunResponse['arena_session']['loop_delta_refs'];
}): TopicSelectionResearchArenaShadowProofAttempt {
  const outputs = [
    roleOutput('opportunity_scout', input.candidateRef, input.scout),
    roleOutput('prior_art_topic_killer', input.candidateRef, input.killer),
  ] as const;
  const disposition = input.scout === 'selected' && input.killer === 'selected'
    ? 'selected' as const
    : input.scout === 'dropped' && input.killer === 'dropped'
      ? 'dropped' as const
      : 'parked' as const;
  const outcome = disposition === 'selected'
    ? 'selected' as const
    : disposition === 'dropped'
      ? 'none_viable' as const
      : 'evidence_expansion_required' as const;
  const inputSnapshotHash = HASH(`snapshot:${input.arenaSessionId}`);
  const executions = outputs.map((output, index) => {
    const packetHash = HASH(`packet:${input.arenaSessionId}:${output.participant_role}`);
    const packetRef = titleRef(input.titleCardId, 'artifact_ref', `packet_${input.arenaSessionId}_${index}`);
    return {
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1' as const,
      arena_role_execution_id: `execution_${input.arenaSessionId}_${index}`,
      arena_session_id: input.arenaSessionId,
      title_card_id: input.titleCardId,
      role_slot_id: output.participant_role,
      instance_index: index,
      participant_role: output.participant_role,
      pass_kind: 'first_pass' as const,
      input_snapshot_id: `snapshot_${input.arenaSessionId}`,
      input_snapshot_hash: inputSnapshotHash,
      query_intent: {
        intent_type: 'context' as const,
        query: `${output.participant_role} fixture query`,
        rationale: 'Frozen shadow proof.',
        target_claim: 'The candidate is worth continued investment.',
      },
      evidence_packet_artifact_ref: packetRef,
      evidence_packet_hash: packetHash,
      evidence_partition_refs: output.candidate_reviews[0]!.evidence_unit_refs,
      retrieval_provenance: {
        participant_role: output.participant_role,
        query_intent: {
          intent_type: 'context' as const,
          query: `${output.participant_role} fixture query`,
          rationale: 'Frozen shadow proof.',
          target_claim: 'The candidate is worth continued investment.',
        },
        search_run_ref: titleRef(input.titleCardId, 'search_run', `search_${input.arenaSessionId}_${index}`),
        hits: [{
          literature_ref: output.findings[0]!.literature_refs[0]!,
          embedding_version_id: 'embedding_v1',
          chunk_id: `chunk_${input.arenaSessionId}_${index}`,
          chunk_hash: HASH(`chunk:${input.arenaSessionId}:${index}`),
          rank: 1,
          hybrid_score: 0.9,
          vector_score: 0.8,
          lexical_score: 0.7,
          is_stale: false,
        }],
        provenance_hash: HASH(`provenance:${input.arenaSessionId}:${index}`),
      },
      exposure_artifact_refs: [packetRef],
      exposure_set_hash: HASH(`exposure:${input.arenaSessionId}:${index}`),
      output_artifact_ref: titleRef(input.titleCardId, 'artifact_ref', `output_${input.arenaSessionId}_${index}`),
      output_artifact_hash: sha256Text(stableStringify(output)),
      semantic_position_hash: sha256Text(stableStringify(output.semantic_position)),
      prior_role_hashes: [],
      runtime_identity_hash: HASH(`runtime:${input.arenaSessionId}:${index}`),
      created_at: '2026-08-29T00:00:00.000Z',
    };
  });
  return {
    response: {
      schema_version: 'TopicSelectionResearchArenaShadowRunResponse@v1',
      arena_session: {
        schema_version: 'TopicSelectionResearchArenaSession@v1',
        arena_session_id: input.arenaSessionId,
        session_key: `key_${input.arenaSessionId}`,
        current_arena_key: `${input.titleCardId}:gap_portfolio`,
        workspace_id: null,
        title_card_id: input.titleCardId,
        arena_kind: 'gap_portfolio',
        target_ref: titleRef(input.titleCardId, 'validated_need', `need_${input.titleCardId}`),
        input_snapshot_id: `snapshot_${input.arenaSessionId}`,
        input_snapshot_hash: inputSnapshotHash,
        participant_plan_hash: HASH(`plan:${input.arenaSessionId}`),
        participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
        execution_plan_ref: titleRef(input.titleCardId, 'artifact_ref', `plan_${input.arenaSessionId}`),
        status: 'synthesized',
        termination_reason: outcome === 'selected' ? 'recommendation_ready' : outcome,
        loop_transcript_ref: titleRef(input.titleCardId, 'artifact_ref', `transcript_${input.arenaSessionId}`),
        loop_transcript_hash: HASH(`transcript:${input.arenaSessionId}`),
        loop_delta_refs: input.deltas ?? [],
        support_only: true,
        supersedes_arena_session_id: input.supersedes ?? null,
        superseded_by_arena_session_id: null,
        created_by: 'system',
        created_at: '2026-08-29T00:00:00.000Z',
        updated_at: '2026-08-29T00:00:00.000Z',
        synthesized_at: '2026-08-29T00:00:00.000Z',
        superseded_at: null,
      },
      role_executions: executions,
      synthesis_artifact_ref: titleRef(input.titleCardId, 'artifact_ref', `transcript_${input.arenaSessionId}`),
      synthesis_artifact_hash: HASH(`transcript:${input.arenaSessionId}`),
      advisory_synthesis: {
        schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
        outcome,
        summary: `${input.arenaSessionId} ${outcome}`,
        candidate_dispositions: [{
          candidate_ref: input.candidateRef,
          disposition,
          rationale: 'Deterministic fixture synthesis.',
          drop_reason_code: disposition === 'dropped' ? 'near_isomorphic_prior_art' : null,
          reopening_conditions: disposition === 'dropped' ? ['Show a mechanism-level distinction.'] : [],
          role_positions: [
            { participant_role: 'opportunity_scout', recommended_disposition: input.scout },
            { participant_role: 'prior_art_topic_killer', recommended_disposition: input.killer },
          ],
        }],
        preserved_finding_ids: outputs.flatMap((output) => output.findings.map((finding) => finding.finding_id)),
        unresolved_dissent: input.scout === input.killer ? [] : ['Independent roles disagree.'],
        required_next_delta: outcome === 'evidence_expansion_required' ? 'evidence' : null,
        support_only: true,
      },
      execution_accounting: {
        non_provider_role_invocation_count: 2,
        provider_call_count: 0,
        retrieval_run_count: 2,
        retrieval_hit_count: 2,
        evidence_excerpt_chars: 40,
        duration_ms: 10,
      },
      support_only: true,
    },
    role_outputs: [...outputs],
  };
}

test('shadow proof replays AF-1, two dominance pairs, and PV-1 into human and LLM views', () => {
  const positiveTitle = 'title_card_6f4b268d-ba00-450d-a6be-ac083a32623f';
  const negativeTitle = 'title_card_fd55f127-1748-49f4-9340-654c37cc2650';
  const dp1Dominated = titleRef(positiveTitle, 'topic_question_contract', 'topic_question_contract_9a1aaa47-6931-4eb6-83e1-08be9e8d6d56');
  const dp1Preferred = titleRef(positiveTitle, 'topic_question_contract', 'topic_question_contract_fd208913-dde6-466b-a311-808d66c4ad02');
  const dp2Dominated = titleRef(negativeTitle, 'need_candidate', 'parameter_only_negative');
  const dp2Preferred = titleRef(positiveTitle, 'validated_need', 'validated_need_a58766a3-d482-4dc3-9b0b-cdeac9e3d095');
  const pvCandidate = dp1Preferred;
  const pvWithout = attempt({
    arenaSessionId: 'pv1_without_nearest_work', titleCardId: positiveTitle, candidateRef: pvCandidate,
    scout: 'selected', killer: 'parked',
  });
  const cases: TopicSelectionResearchArenaShadowProofCase[] = [
    {
      case_id: 'AF-1',
      case_kind: 'ambiguous_lineage',
      attempts: [attempt({
        arenaSessionId: 'af1_ambiguous', titleCardId: positiveTitle, candidateRef: pvCandidate,
        scout: 'selected', killer: 'parked',
      })],
      candidate_refs: [pvCandidate],
      expected_drop_reason_code: null,
    },
    {
      case_id: 'DP-1',
      case_kind: 'dominance_pair',
      attempts: [
        attempt({ arenaSessionId: 'dp1_dominated', titleCardId: positiveTitle, candidateRef: dp1Dominated, scout: 'dropped', killer: 'dropped' }),
        attempt({ arenaSessionId: 'dp1_preferred', titleCardId: positiveTitle, candidateRef: dp1Preferred, scout: 'selected', killer: 'selected' }),
      ],
      candidate_refs: [dp1Dominated, dp1Preferred],
      expected_drop_reason_code: null,
    },
    {
      case_id: 'DP-2',
      case_kind: 'dominance_pair',
      attempts: [
        attempt({ arenaSessionId: 'dp2_dominated', titleCardId: negativeTitle, candidateRef: dp2Dominated, scout: 'dropped', killer: 'dropped' }),
        attempt({ arenaSessionId: 'dp2_preferred', titleCardId: positiveTitle, candidateRef: dp2Preferred, scout: 'selected', killer: 'selected' }),
      ],
      candidate_refs: [dp2Dominated, dp2Preferred],
      expected_drop_reason_code: null,
    },
    {
      case_id: 'PV-1',
      case_kind: 'evidence_perturbation',
      attempts: [
        pvWithout,
        attempt({
          arenaSessionId: 'pv1_with_nearest_work', titleCardId: positiveTitle, candidateRef: pvCandidate,
          scout: 'parked', killer: 'dropped', supersedes: pvWithout.response.arena_session.arena_session_id,
          deltas: [{
            delta_type: 'evidence',
            ref: titleRef(positiveTitle, 'literature_record', '0c948144-88f4-4afa-b116-c0d908ff16d5'),
            rationale: 'Add the reviewed 2026 nearest-work paper.',
          }],
        }),
      ],
      candidate_refs: [pvCandidate],
      expected_drop_reason_code: 'near_isomorphic_prior_art',
    },
  ];

  const service = new TopicSelectionResearchArenaShadowProofService();
  const report = service.evaluate({
    proof_key: 't147-phase8d3-shadow-proof-v1',
    cases,
  });
  const replay = service.evaluate({ proof_key: 't147-phase8d3-shadow-proof-v1', cases });

  assert.equal(report.technical_trace_hash, replay.technical_trace_hash);
  assert.deepEqual(report.metrics.dominance_consistency, { passed: 2, total: 2 });
  assert.deepEqual(report.metrics.perturbation_sensitivity, { passed: 1, total: 1 });
  assert.equal(report.metrics.provider_call_count, 0);
  assert.equal(report.metrics.non_provider_role_invocation_count, 14);
  assert.equal(report.metrics.estimated_downstream_stages_avoided, 8);
  assert.equal(report.live_authority_write_count, 0);
  assert.equal(report.activation_recommendation, 'remain_shadow_only');
  assert.match(report.human_view_markdown, /证据独立性/u);
  assert.match(report.human_view_markdown, /暂不激活/u);
  assert.equal(report.llm_working_set.case_results.length, 4);
  assert.equal(report.case_results.find((candidate) => candidate.case_id === 'AF-1')?.status, 'inspect');
  assert.equal(report.case_results.find((candidate) => candidate.case_id === 'PV-1')?.status, 'passed');
});

test('shadow proof rejects a third attempt and a retry without an evidence delta', () => {
  const candidateRef = titleRef('title_1', 'topic_question_candidate', 'candidate_1');
  const first = attempt({
    arenaSessionId: 'first', titleCardId: 'title_1', candidateRef, scout: 'selected', killer: 'parked',
  });
  const retryWithoutDelta = attempt({
    arenaSessionId: 'retry', titleCardId: 'title_1', candidateRef, scout: 'parked', killer: 'dropped',
    supersedes: 'first',
  });
  const third = attempt({
    arenaSessionId: 'third', titleCardId: 'title_1', candidateRef, scout: 'dropped', killer: 'dropped',
    supersedes: 'retry',
    deltas: [{ delta_type: 'evidence', ref: titleRef('title_1', 'evidence_unit', 'delta_2'), rationale: 'Third delta.' }],
  });
  const service = new TopicSelectionResearchArenaShadowProofService();

  assert.throws(() => service.evaluate({
    proof_key: 'missing-delta',
    cases: [{
      case_id: 'PV-missing-delta', case_kind: 'evidence_perturbation',
      attempts: [first, retryWithoutDelta], candidate_refs: [candidateRef],
      expected_drop_reason_code: 'near_isomorphic_prior_art',
    }],
  }), /exactly one typed evidence delta/u);
  assert.throws(() => service.evaluate({
    proof_key: 'third-attempt',
    cases: [{
      case_id: 'PV-third', case_kind: 'evidence_perturbation',
      attempts: [first, retryWithoutDelta, third], candidate_refs: [candidateRef],
      expected_drop_reason_code: 'near_isomorphic_prior_art',
    }],
  }), /at most one retry/u);
});
