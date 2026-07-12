import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  type PaperImplementationEvidenceBoardBindingCandidateProposal,
  type PaperImplementationEvidenceBoardCurationRoleOutput,
  type PaperImplementationEvidenceBoardGapCandidateProposal,
  type RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from './paper-implementation-evidence-board-curation-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_evidence_board_curation_runtime_001';
const TITLE_CARD_ID = 'title_card_evidence_board_curation_runtime_001';
const NOW = '2026-06-08T10:00:00.000Z';

type Outcome =
  | 'passed'
  | 'blocked_gap_only'
  | 'schema_failed'
  | 'empty_binding_set'
  | 'missing_challenge'
  | 'missing_locator'
  | 'duplicate_existing'
  | 'stale_viable'
  | 'citation_unreviewed'
  | 'invented_ref'
  | 'side_effect_guard_missing'
  | 'authority_field'
  | 'blocked_authority_field';

class StubEvidenceBoardCurationAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    input_refs?: TopicSelectionFunctionalRef[];
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(private readonly outcomes: Outcome[] = ['passed']) {}

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      executor_kind: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      input_refs?: TopicSelectionFunctionalRef[];
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'blocked_gap_only') {
      return invocationResult(evidenceBoardRoleOutput({
        role_status: 'blocked',
        binding_candidate_proposals: [],
        gap_candidate_proposals: [gapCandidateProposal('gap_missing_locator')],
        blocker_codes: ['missing_locator'],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'empty_binding_set') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_challenge') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('binding_candidate_001'),
          challenge_check: {
            ...bindingCandidateProposal('binding_candidate_001').challenge_check,
            memo_or_summary_rejected: false,
          },
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_locator') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('binding_candidate_001'),
          source_locator_refs: [],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'duplicate_existing') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('duplicate_existing_bound_evidence_candidate_001', {
            evidence_ref: ref('evidence_unit', 'existing_bound_evidence_001'),
          }),
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'stale_viable') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('binding_candidate_001'),
          freshness_status: 'stale',
          challenge_check: {
            ...bindingCandidateProposal('binding_candidate_001').challenge_check,
            freshness_status: 'stale',
          },
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'citation_unreviewed') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('binding_candidate_001'),
          citation_candidate_refs: [],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'invented_ref') {
      return invocationResult(evidenceBoardRoleOutput({
        binding_candidate_proposals: [{
          ...bindingCandidateProposal('binding_candidate_001'),
          target_assertion_ref: ref('motive_assertion', 'invented_assertion'),
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'side_effect_guard_missing') {
      return invocationResult(evidenceBoardRoleOutput({
        no_evidence_binding_side_effect: false as unknown as true,
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'authority_field') {
      return invocationResult({
        ...evidenceBoardRoleOutput(),
        create_evidence_binding_request: { request_id: 'must_not_exist' },
      } as unknown as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'blocked_authority_field') {
      return invocationResult({
        ...evidenceBoardRoleOutput({
          role_status: 'blocked',
          binding_candidate_proposals: [],
          gap_candidate_proposals: [gapCandidateProposal('gap_missing_locator')],
          blocker_codes: ['missing_locator'],
        }),
        create_evidence_binding_request: { request_id: 'must_not_exist' },
      } as unknown as T, input.node_id, input.execution_mode);
    }
    return invocationResult(evidenceBoardRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('evidence-board curation runtime records append-only binding/gap candidates without domain writes', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runBindingGapCandidates(PROJECT_ID, request);

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(result.workflow_type, 'evidence_board_curation');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /binding\/gap candidate curation/);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.target_assertion_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.source_locator_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.citation_candidate_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.evidence_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.existing_evidence_binding_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.existing_bound_evidence_refs[0]), true);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.binding_candidate_proposals as unknown[] | undefined)?.length,
    1,
  );
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.gap_candidate_proposals as unknown[] | undefined)?.length,
    0,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_evidence_transfer_binding_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_citation_candidate_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
  for (const forbiddenField of [
    'domain_gate_request',
    'queue_action',
    'board_draft',
    'board_summary',
    'board_state',
    'bindings',
    'create_motive_evidence_board_version_request',
    'create_evidence_binding_request',
    'evidence_transfer_binding_request',
    'citation_candidate_request',
    'trace_repair_queue_item',
  ]) {
    assert.equal(forbiddenField in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  }
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('create_evidence_binding_request'), false);
});

test('evidence-board curation runtime records blocked gap-only output as admitted evidence', async () => {
  const { service, orchestrator } = serviceFixture(['blocked_gap_only']);
  const result = await service.runBindingGapCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'evidence_board_curation_gap_only_run_001',
  });

  assert.equal(result.status, 'blocked');
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.runtime_control as { terminal_code?: string } | undefined)
      ?.terminal_code,
    'admitted_blocked',
  );
});

test('evidence-board curation runtime preflight blocks memo-like and missing locator context before provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const result = await service.runBindingGapCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'evidence_board_curation_preflight_run_001',
    source_locator_refs: [],
    source_refs: [
      ...providerRequest().source_refs,
      ref('board_summary_memo', 'memo_001'),
    ],
    source_hashes: [
      ...providerRequest().source_hashes,
      hash('memo'),
    ],
  });

  // S2-C C3: preflight blockers are a reviewable blocked final (admitted), not
  // a failed_runtime terminal without a final artifact.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.runtime_artifacts[0]?.runtime_status, 'blocked');
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, null);
  assert.equal(result.runtime_artifacts[0]?.executor_kind, 'deterministic_preflight');
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(result.admission_records.map((item) => item.admission_status), ['admitted', 'admitted']);
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SOURCE_LOCATOR_MISSING'), true);
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(
    result.final_runtime_artifact?.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SOURCE_LOCATOR_MISSING'),
    true,
  );
});

test('evidence-board curation runtime preflight validates source-context packet hashes and coverage before provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runBindingGapCandidates(PROJECT_ID, {
    ...request,
    run_id: 'evidence_board_curation_source_context_packet_preflight_run_001',
    source_context_packets: [
      {
        packet_ref: ref('source_context_packet', 'packet_hash_mismatch_001'),
        packet_hash: hash('packet-hash-mismatch-001'),
        source_ref: request.source_refs[0],
        source_hash: hash('wrong-source-hash'),
        evidence_kind: 'source_locator',
        content_summary: 'Packet source hash must match request source authority.',
        key_facts: ['Packet facts are usable only when ref/hash authority matches.'],
        covered_evidence_refs: [ref('evidence_unit', 'invented_evidence_001')],
        covered_source_locator_refs: [],
        covered_citation_candidate_refs: [],
        covered_trace_manifest_refs: [],
      },
      {
        packet_ref: ref('source_context_packet', 'packet_uncovered_001'),
        packet_hash: hash('packet-uncovered-001'),
        source_ref: request.source_refs[0],
        source_hash: request.source_hashes[0],
        evidence_kind: 'source_locator',
        content_summary: 'Packet must declare at least one covered request ref.',
        key_facts: ['Uncovered packets are not runtime authority.'],
        covered_evidence_refs: [],
        covered_source_locator_refs: [],
        covered_citation_candidate_refs: [],
        covered_trace_manifest_refs: [],
      },
    ],
  });

  // S2-C C3: unified preflight terminal — blocked final, admitted.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.runtime_artifacts[0]?.runtime_status, 'blocked');
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, null);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SOURCE_CONTEXT_PACKET_HASH_MISMATCH'), true);
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SOURCE_CONTEXT_PACKET_REF_MISMATCH'), true);
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SOURCE_CONTEXT_PACKET_UNCOVERED'), true);
});

test('evidence-board curation runtime preflight rejects seed mode current-board binding context before provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runBindingGapCandidates(PROJECT_ID, {
    ...request,
    run_id: 'evidence_board_curation_seed_current_board_context_preflight_run_001',
    curation_mode: 'seed_initial_board_candidates',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_board_ref: null,
    target_board_hash: null,
  });

  // S2-C C3: unified preflight terminal — blocked final, admitted.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.runtime_artifacts[0]?.runtime_status, 'blocked');
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, null);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_SEED_MODE_CURRENT_BOARD_CONTEXT_REJECTED'), true);
});

for (const scenario of [
  {
    name: 'empty binding candidate set',
    outcome: 'empty_binding_set' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_BINDING_CANDIDATE_SET_EMPTY',
  },
  {
    name: 'missing challenge check',
    outcome: 'missing_challenge' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_CHALLENGE_CHECK_MISSING',
  },
  {
    name: 'viable binding without source locator',
    outcome: 'missing_locator' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_SOURCE_LOCATOR_MISSING',
  },
  {
    name: 'duplicate existing binding',
    outcome: 'duplicate_existing' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_DUPLICATE_EXISTING_BINDING',
  },
  {
    name: 'stale viable binding',
    outcome: 'stale_viable' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_STALE_VIABLE_BINDING',
  },
  {
    name: 'unreviewed citation candidate',
    outcome: 'citation_unreviewed' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_CITATION_UNREVIEWED',
  },
  {
    name: 'invented request-owned ref',
    outcome: 'invented_ref' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_REF_MISMATCH',
  },
  {
    name: 'missing side-effect guard',
    outcome: 'side_effect_guard_missing' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_SIDE_EFFECT_GUARD_MISSING',
  },
  {
    name: 'authority field in output',
    outcome: 'authority_field' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_AUTHORITY_FIELD_PRESENT',
  },
  {
    name: 'authority field in blocked output',
    outcome: 'blocked_authority_field' as const,
    failureCode: 'EVIDENCE_BOARD_CURATION_AUTHORITY_FIELD_PRESENT',
  },
]) {
  test(`evidence-board curation runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator } = serviceFixture([scenario.outcome, scenario.outcome]);
    const result = await service.runBindingGapCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: `evidence_board_curation_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 2);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.runtime_artifacts[0]?.retry_attempt_index, 1);
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('evidence-board curation runtime rejects product fixture modes, provider fixtures, model drift, and harness primary refs', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runBindingGapCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'evidence_board_curation_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: evidenceBoardRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runBindingGapCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'evidence_board_curation_provider_fixture_payload_run_001',
      codex_role_outputs: evidenceBoardRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runBindingGapCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'evidence_board_curation_model_option_drift_run_001',
      model_option_id: 'paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.openai-balanced',
    }),
    /model_option_id must belong to runtime slot profile/,
  );

  await assert.rejects(
    () => service.runBindingGapCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'evidence_board_curation_harness_primary_ref_run_001',
      source_refs: [
        ...providerRequest().source_refs,
        ref('agent_workflow_harness_run', 'harness_run_001'),
      ],
      source_hashes: [
        ...providerRequest().source_hashes,
        hash('harness'),
      ],
    }),
    /forbids primary input ref_type=agent_workflow_harness_run/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('evidence-board curation runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runBindingGapCandidates(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runBindingGapCandidates(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(inactiveProject.orchestrator.calls.length, 0);
});

function implementationProjectFixture(
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active',
): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}_intake_snapshot`,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}_bridge`,
    bridge_payload_hash: 'bridge_payload_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: lifecycleStatus,
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function projectRepositoryFixture(
  project: ImplementationProject | null,
): InMemoryPaperImplementationRepository {
  const repository = new InMemoryPaperImplementationRepository();
  if (project) {
    void repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: {
        intake_snapshot_id: project.intake_snapshot_id,
        implementation_project_id: project.implementation_project_id,
        workspace_id: project.workspace_id,
        title_card_id: project.title_card_id,
        paper_project_bridge_id: project.paper_project_bridge_id,
        paper_project_bridge_ref: {
          ref_type: 'paper_project_bridge',
          ref_id: project.paper_project_bridge_id,
          title_card_id: project.title_card_id,
          version_id: null,
        },
        bridge_payload_hash: project.bridge_payload_hash,
        promotion_decision_id: 'promotion_decision_001',
        promotion_decision_ref: {
          ref_type: 'promotion_decision',
          ref_id: 'promotion_decision_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_commitment_profile_id: 'promotion_commitment_profile_001',
        promotion_commitment_profile_ref: {
          ref_type: 'promotion_commitment_profile',
          ref_id: 'promotion_commitment_profile_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_id: 'promotion_input_snapshot_001',
        promotion_input_snapshot_ref: {
          ref_type: 'promotion_input_snapshot',
          ref_id: 'promotion_input_snapshot_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        source_status: 'active',
        snapshot_hashes: {
          bundle_hash: 'bundle_hash_001',
          package_snapshot_hash: 'package_snapshot_hash_001',
          package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
          promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        },
        source_refs: [],
        accepted_risk_refs: [],
        condition_refs: [],
        early_check_obligations: [],
        working_copy_payload: {
          editable_title: 'Working paper title',
          problem_statement: 'Problem statement.',
          contribution_summary: 'Contribution summary.',
          evaluation_plan: 'Evaluation plan.',
          initial_planning_notes: [],
          claim_ceiling: 'Bounded claim ceiling.',
          prohibited_claims: [],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_payload_hash_001',
        source_handoff: {} as never,
        target_paper_project_ref: null,
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'system',
        created_at: NOW,
      },
    });
  }
  return repository;
}

function serviceFixture(
  outcomes?: Outcome[],
  project: ImplementationProject | null = implementationProjectFixture(),
) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new StubEvidenceBoardCurationAgentOrchestrator(outcomes);
  const service = new PaperImplementationEvidenceBoardCurationRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function evidenceBoardRoleOutputs():
  RunPaperImplementationEvidenceBoardCurationRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID]: evidenceBoardRoleOutput(),
  };
}

function providerRequest(): RunPaperImplementationEvidenceBoardCurationRuntimeRequest {
  return {
    run_id: 'evidence_board_curation_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID}.openai-balanced`,
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_board_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_board_hash: hash('board-version-001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('source_locator', 'source_locator_001'),
      ref('citation_candidate', 'citation_candidate_001'),
      ref('evidence_unit', 'evidence_001'),
    ],
    source_hashes: [
      hash('source-locator-001'),
      hash('citation-candidate-001'),
      hash('evidence-001'),
    ],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hash('trace-manifest-001')],
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    evidence_refs: [
      ref('evidence_unit', 'evidence_001'),
      ref('evidence_unit', 'existing_bound_evidence_001'),
    ],
    existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    existing_bound_evidence_refs: [ref('evidence_unit', 'existing_bound_evidence_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_001')],
    secondary_trace_repair_queue_refs: [],
    preflight_blocker_codes: [],
  };
}

function bindingCandidateProposal(
  candidateKey: string,
  overrides: Partial<PaperImplementationEvidenceBoardBindingCandidateProposal> = {},
): PaperImplementationEvidenceBoardBindingCandidateProposal {
  return {
    candidate_key: candidateKey,
    target_assertion_ref: ref('motive_assertion', 'assertion_001'),
    evidence_ref: ref('evidence_unit', 'evidence_001'),
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    proposed_role: 'supporting_evidence',
    proposed_scope: 'assertion_local',
    proposed_strength: 'moderate',
    support_state: 'viable_binding',
    challenge_status: 'passed',
    freshness_status: 'fresh',
    interpretation: 'Candidate is reviewable and append-only; deterministic board services own binding creation.',
    challenge_check: {
      memo_or_summary_rejected: true,
      locator_quality: 'verified',
      citation_status: 'reviewed',
      scope_match_status: 'matched',
      freshness_status: 'fresh',
      should_downgrade_to_gap: false,
      downgrade_reason_codes: [],
      blocking_reason_codes: [],
    },
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'motive_evidence_board_review',
    ...overrides,
  };
}

function gapCandidateProposal(gapKey: string): PaperImplementationEvidenceBoardGapCandidateProposal {
  return {
    gap_key: gapKey,
    target_assertion_ref: ref('motive_assertion', 'assertion_001'),
    gap_kind: 'missing_source_locator',
    missing_evidence_need: 'Need source locator review before deterministic evidence binding can occur.',
    source_locator_blockers: ['missing_locator'],
    citation_blockers: [],
    freshness_blockers: [],
    recommended_next_gate: 'trace_repair',
    blocker_codes: ['missing_locator'],
    warning_codes: [],
  };
}

function evidenceBoardRoleOutput(
  overrides: Partial<PaperImplementationEvidenceBoardCurationRoleOutput> = {},
): PaperImplementationEvidenceBoardCurationRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Evidence-board curation proposed append-only binding and gap candidates.',
    cited_source_refs: [ref('source_locator', 'source_locator_001')],
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    reviewed_source_locator_refs: [ref('source_locator', 'source_locator_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    reviewed_evidence_refs: [
      ref('evidence_unit', 'evidence_001'),
      ref('evidence_unit', 'existing_bound_evidence_001'),
    ],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    binding_candidate_proposals: [bindingCandidateProposal('binding_candidate_001')],
    gap_candidate_proposals: [],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_citation_candidate_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    ...overrides,
  };
}

function invocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult({
    output,
    nodeId,
    executionMode,
    status: 'succeeded',
    errorCode: null,
    blockerCodes: [],
  });
}

function failedInvocationResult<T>(
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult<T>({
    output: null,
    nodeId,
    executionMode,
    status: 'blocked',
    errorCode: 'SCHEMA_VALIDATION_FAILED',
    blockerCodes: ['SCHEMA_VALIDATION_FAILED'],
  });
}

function baseInvocationResult<T>(input: {
  output: T | null;
  nodeId: string;
  executionMode: string;
  status: 'succeeded' | 'blocked';
  errorCode: string | null;
  blockerCodes: string[];
}): TopicSelectionAgentInvocationResult<T> {
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const provenance = {
    workflow_run_id: 'evidence_board_curation_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationEvidenceBoardCurationRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-evidence-board-curation-binding-gap-candidates',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_evidence_board_curation_role_output',
    prompt_packet_hash: hash(`prompt:${input.nodeId}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: input.executionMode === 'provider_llm' ? { request_count: 1 } : null,
  };
  return {
    schema_version: 'v1',
    node_id: input.nodeId,
    workflow_run_id: 'evidence_board_curation_runtime_run_001',
    node_attempt_id: `${input.nodeId}.attempt-0`,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.nodeId,
      workflow_run_id: 'evidence_board_curation_runtime_run_001',
      node_attempt_id: `${input.nodeId}.attempt-0`,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(),
      validation: input.status === 'succeeded'
        ? { valid: true, error_count: 0, errors: [] }
        : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
      warning_codes: [],
      blocker_codes: input.blockerCodes,
      error_code: input.errorCode,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function tokenBudgetGateResult() {
  return {
    provider_id: null,
    model_id: null,
    profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1300,
    estimated_output_tokens: 2500,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1500,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-evidence-board-curation-context-compression'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: 'v1',
  };
}

function includesRef(refs: TopicSelectionFunctionalRef[], expected: TopicSelectionFunctionalRef): boolean {
  const expectedKey = stableStringify(expected);
  return refs.some((item) => stableStringify(item) === expectedKey);
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

test('evidence-board curation runtime token budget counts message-embedded context once and wires the compression attempt (S2-A)', async () => {
  const fatText = 'Neutral benchmark evidence sentence with cited source support and no secrets. '.repeat(200);
  const { service, orchestrator } = serviceFixture(['passed']);
  const base = providerRequest();
  const request = {
    ...base,
    run_id: 'evidence_board_curation_token_budget_run_001',
    source_context_packets: [{
      packet_ref: ref('source_context_packet', 'source_context_packet_token_budget_001'),
      packet_hash: hash('source-context-packet-token-budget-001'),
      source_ref: base.source_refs[0],
      source_hash: base.source_hashes[0],
      evidence_kind: 'source_locator',
      content_summary: fatText,
      key_facts: [fatText],
      covered_evidence_refs: [],
      covered_source_locator_refs: [base.source_locator_refs[0]],
      covered_citation_candidate_refs: [],
      covered_trace_manifest_refs: [],
    }],
  };
  await service.runBindingGapCandidates(PROJECT_ID, request);

  const call = orchestrator.calls[0];
  assert.ok(call);
  const budget = call.runtime_token_budget as {
    context_payloads: unknown[];
    estimated_input_tokens_override: number;
    compression_attempt?: {
      compression_executor_kind: string;
      compressed_messages?: Array<{ role: string; content: string }> | null;
    } | null;
  };
  const messages = call.messages;
  // N3 single-source estimate: exactly the messages that will be sent, counted once.
  assert.equal(
    budget.estimated_input_tokens_override,
    Math.ceil(stableStringify({ messages }).length / 4),
  );
  assert.deepEqual(budget.context_payloads, []);
  // Re-carrying the embedded packet bodies (the pre-fix shape) would roughly double
  // the estimate for packet-dominated inputs.
  const doubleCounted = Math.ceil(stableStringify({
    messages,
    context_payloads: [{ source_context_packets: request.source_context_packets }],
  }).length / 4);
  assert.equal(budget.estimated_input_tokens_override <= Math.ceil(doubleCounted * 0.6), true);
  // PC-S2/PC-S3: a packet face yields a caller-supplied deterministic attempt.
  assert.ok(budget.compression_attempt);
  assert.equal(budget.compression_attempt.compression_executor_kind, 'deterministic_structural');
  assert.equal((budget.compression_attempt.compressed_messages?.length ?? 0) > 0, true);

  // Without a packet face there is nothing deterministically trimmable: no attempt,
  // over-budget keeps the legacy fail-closed semantics.
  const noPackets = serviceFixture(['passed']);
  await noPackets.service.runBindingGapCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'evidence_board_curation_token_budget_run_002',
  });
  const noPacketBudget = noPackets.orchestrator.calls[0]?.runtime_token_budget as {
    compression_attempt?: unknown;
  };
  assert.equal(noPacketBudget.compression_attempt ?? null, null);
});
