import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  type PaperImplementationCrossBoardAnchor,
  type PaperImplementationCrossBoardScenarioProposal,
  type PaperImplementationCrossBoardSynthesisRoleOutput,
  type RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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
import { PaperImplementationCrossBoardSynthesisRuntimeService } from './paper-implementation-cross-board-synthesis-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_cross_board_synthesis_runtime_001';
const TITLE_CARD_ID = 'title_card_cross_board_synthesis_runtime_001';
const NOW = '2026-06-07T10:00:00.000Z';

type Outcome =
  | 'passed'
  | 'schema_failed'
  | 'missing_reuse'
  | 'missing_conflict_scenario'
  | 'board_hash_mismatch'
  | 'target_motive_mismatch'
  | 'source_locator_ref_mismatch'
  | 'transfer_binding_ref_mismatch'
  | 'conflict_ref_mismatch'
  | 'challenge_ref_mismatch'
  | 'viable_reuse_missing_transfer'
  | 'reuse_without_transfer_blocker_missing'
  | 'side_effect_guard_missing'
  | 'authority_field';

class StubCrossBoardSynthesisAgentOrchestrator {
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
    if (outcome === 'missing_reuse') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [parkScenarioProposal()],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_conflict_scenario') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [reuseScenarioProposal()],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'board_hash_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          source_board_version_hashes: [hash('board-version-001'), hash('drifted-board-version')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'target_motive_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          target_motive_refs: [ref('core_motive', 'drifted_core_motive')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'source_locator_ref_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          source_locator_refs: [ref('source_locator', 'invented_source_locator')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'transfer_binding_ref_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'invented_transfer_binding')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'conflict_ref_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          conflict_refs: [ref('motive_board_conflict', 'invented_conflict')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'challenge_ref_mismatch') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          challenge_refs: [ref('motive_board_challenge', 'invented_challenge')],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'viable_reuse_missing_transfer') {
      return invocationResult(crossBoardRoleOutput({
        scenario_proposals: [{
          ...reuseScenarioProposal(),
          evidence_transfer_binding_refs: [],
        }, parkScenarioProposal()],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'reuse_without_transfer_blocker_missing') {
      return invocationResult(crossBoardRoleOutput({
        reviewed_evidence_transfer_binding_refs: [],
        scenario_proposals: [{
          ...reuseScenarioProposal({
            disposition: 'needs_domain_review',
            evidence_transfer_binding_refs: [],
          }),
        }, parkScenarioProposal()],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'side_effect_guard_missing') {
      return invocationResult(crossBoardRoleOutput({
        no_portfolio_mutation_side_effect: false as unknown as true,
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'authority_field') {
      return invocationResult({
        ...crossBoardRoleOutput(),
        create_cross_board_review_request: { request_id: 'must_not_exist' },
      } as unknown as T, input.node_id, input.execution_mode);
    }
    return invocationResult(crossBoardRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('cross-board synthesis runtime records proposal-only artifacts without review, transfer, portfolio, queue, or Domain Gate writes', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, request);

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(result.workflow_type, 'cross_board_synthesis');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /cross-board merge\/split\/reuse scenario planning/);
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], request.board_anchors[0].board_version_ref),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], request.board_anchors[0].trace_manifest_ref),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], request.board_anchors[0].source_locator_refs[0]),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], request.reviewed_conflict_refs[0]),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], request.evidence_transfer_binding_refs[0]),
    true,
  );
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.scenario_proposals as unknown[] | undefined)?.length,
    2,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_cross_board_review_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_evidence_transfer_binding_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_portfolio_mutation_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('cross_board_review_id' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('create_cross_board_review_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('evidence_transfer_binding_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('motive_portfolio_decision_id' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('queue_action' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('create_cross_board_review_request'), false);
  assert.equal(stableStringify(result).includes('evidence_transfer_binding_request'), false);
});

test('cross-board synthesis runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'cross_board_synthesis_preflight_blocked_run_001',
    preflight_blocker_codes: ['board_version_not_admitted'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['board_version_not_admitted']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('cross-board synthesis runtime fails closed after same-profile semantic retry exhaustion', async () => {
  const { service, orchestrator } = serviceFixture(['missing_reuse', 'missing_reuse']);
  const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'cross_board_synthesis_missing_reuse_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'CROSS_BOARD_SYNTHESIS_SCENARIO_SET_INCOMPLETE');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

for (const scenario of [
  {
    name: 'missing conflict or challenge park/reject scenario',
    outcome: 'missing_conflict_scenario' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_CONFLICT_OR_CHALLENGE_SCENARIO_MISSING',
  },
  {
    name: 'board hash drift',
    outcome: 'board_hash_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_BOARD_HASH_MISMATCH',
  },
  {
    name: 'target motive drift',
    outcome: 'target_motive_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_TARGET_MOTIVE_MISMATCH',
  },
  {
    name: 'source locator ref outside request-owned anchors',
    outcome: 'source_locator_ref_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_REF_MISMATCH',
  },
  {
    name: 'transfer binding ref outside request-owned transfer refs',
    outcome: 'transfer_binding_ref_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REF_MISMATCH',
  },
  {
    name: 'conflict ref outside reviewed conflicts',
    outcome: 'conflict_ref_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_CONFLICT_REF_MISMATCH',
  },
  {
    name: 'challenge ref outside reviewed challenges',
    outcome: 'challenge_ref_mismatch' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_CHALLENGE_REF_MISMATCH',
  },
  {
    name: 'viable reuse without transfer binding',
    outcome: 'viable_reuse_missing_transfer' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_REUSE_TRANSFER_BINDING_MISSING',
  },
  {
    name: 'missing side-effect guard',
    outcome: 'side_effect_guard_missing' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_SIDE_EFFECT_GUARD_MISSING',
  },
  {
    name: 'authority field in output',
    outcome: 'authority_field' as const,
    failureCode: 'CROSS_BOARD_SYNTHESIS_AUTHORITY_FIELD_PRESENT',
  },
]) {
  test(`cross-board synthesis runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator } = serviceFixture([scenario.outcome, scenario.outcome]);
    const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: `cross_board_synthesis_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 2);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('cross-board synthesis runtime requires blocked reuse when request has no transfer binding refs', async () => {
  const { service, orchestrator } = serviceFixture([
    'reuse_without_transfer_blocker_missing',
    'reuse_without_transfer_blocker_missing',
  ]);
  const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'cross_board_synthesis_missing_transfer_blocker_run_001',
    evidence_transfer_binding_refs: [],
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'CROSS_BOARD_SYNTHESIS_REUSE_BLOCKER_MISSING');
});

test('cross-board synthesis runtime rejects product fixture modes, provider fixtures, and missing primary board sets', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runMergeSplitReuseScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'cross_board_synthesis_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: crossBoardRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runMergeSplitReuseScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'cross_board_synthesis_provider_fixture_payload_run_001',
      codex_role_outputs: crossBoardRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runMergeSplitReuseScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'cross_board_synthesis_missing_board_run_001',
      board_anchors: [boardAnchor('001')],
    }),
    /requires at least two board_anchors/,
  );

  await assert.rejects(
    () => service.runMergeSplitReuseScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'cross_board_synthesis_harness_primary_ref_run_001',
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

test('cross-board synthesis runtime blocks memo-like primary context before provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'cross_board_synthesis_memo_like_ref_run_001',
    source_refs: [
      ...providerRequest().source_refs,
      ref('board_summary_memo', 'memo_001'),
    ],
    source_hashes: [
      ...providerRequest().source_hashes,
      hash('memo'),
    ],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.blocker_codes.includes('CROSS_BOARD_SYNTHESIS_MEMO_LIKE_REF_REJECTED'), true);
});

test('cross-board synthesis runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runMergeSplitReuseScenarios(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runMergeSplitReuseScenarios(PROJECT_ID, providerRequest()),
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
  const orchestrator = new StubCrossBoardSynthesisAgentOrchestrator(outcomes);
  const service = new PaperImplementationCrossBoardSynthesisRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function crossBoardRoleOutputs():
  RunPaperImplementationCrossBoardSynthesisRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID]: crossBoardRoleOutput(),
  };
}

function providerRequest(): RunPaperImplementationCrossBoardSynthesisRuntimeRequest {
  return {
    run_id: 'cross_board_synthesis_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID}.openai-balanced`,
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [
      hash('board-version-001'),
      hash('board-version-002'),
      hash('trace'),
    ],
    board_anchors: [
      boardAnchor('001'),
      boardAnchor('002'),
    ],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    reuse_policy: {
      require_transfer_binding_for_viable_reuse: true,
      allow_blocked_reuse_without_transfer_binding: true,
    },
    secondary_cross_board_review_refs: [
      ref('cross_board_review', 'cross_board_review_001'),
    ],
    secondary_evidence_transfer_binding_refs: [
      ref('evidence_transfer_binding', 'transfer_binding_001'),
    ],
    secondary_motive_assertion_refs: [
      ref('motive_assertion', 'motive_assertion_001'),
    ],
    secondary_evidence_binding_refs: [
      ref('evidence_binding', 'evidence_binding_001'),
    ],
    secondary_route_refs: [
      ref('technical_route_candidate', 'technical_route_candidate_001'),
    ],
    secondary_experiment_refs: [
      ref('experiment_run', 'experiment_run_001'),
    ],
    preflight_blocker_codes: [],
  };
}

function boardAnchor(id: string): PaperImplementationCrossBoardAnchor {
  return {
    board_version_ref: ref('motive_evidence_board_version', `board_version_${id}`),
    board_version_hash: hash(`board-version-${id}`),
    motive_ref: ref('core_motive', `core_motive_${id}`),
    core_motive_version_ref: ref('core_motive_version', `core_motive_version_${id}`),
    trace_manifest_ref: ref('trace_manifest', `trace_manifest_${id}`),
    trace_manifest_hash: hash(`trace-manifest-${id}`),
    evidence_binding_refs: [ref('evidence_binding', `evidence_binding_${id}`)],
    source_locator_refs: [ref('source_locator', `source_locator_${id}`)],
    conflict_refs: id === '001' ? [ref('motive_board_conflict', 'conflict_001')] : [],
    challenge_refs: id === '001' ? [ref('motive_board_challenge', 'challenge_001')] : [],
    freshness_status: 'fresh',
  };
}

function reuseScenarioProposal(
  overrides: Partial<PaperImplementationCrossBoardScenarioProposal> = {},
): PaperImplementationCrossBoardScenarioProposal {
  return {
    scenario_key: 'reuse_scenario_001',
    scenario_kind: 'reuse',
    disposition: 'viable_candidate',
    source_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    source_board_version_hashes: [
      hash('board-version-001'),
      hash('board-version-002'),
    ],
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    freshness_blockers: [],
    source_locator_refs: [
      ref('source_locator', 'source_locator_001'),
      ref('source_locator', 'source_locator_002'),
    ],
    expected_benefit: 'Reuse traced evidence across compatible board versions without mutating domain state.',
    risk_codes: ['scope_transfer_risk'],
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'cross_board_review',
    ...overrides,
  };
}

function parkScenarioProposal(): PaperImplementationCrossBoardScenarioProposal {
  return {
    ...reuseScenarioProposal(),
    scenario_key: 'park_conflict_scenario_001',
    scenario_kind: 'park',
    disposition: 'needs_domain_review',
    evidence_transfer_binding_refs: [],
    blocker_codes: [],
    warning_codes: ['conflict_needs_review'],
    recommended_next_gate: 'trace_repair',
  };
}

function crossBoardRoleOutput(
  overrides: Partial<PaperImplementationCrossBoardSynthesisRoleOutput> = {},
): PaperImplementationCrossBoardSynthesisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Cross-board synthesis proposed bounded merge, split, reuse, park, and reject scenarios.',
    cited_source_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    scenario_proposals: [
      reuseScenarioProposal(),
      parkScenarioProposal(),
    ],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_cross_board_review_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_motive_evolution_side_effect: true,
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
    workflow_run_id: 'cross_board_synthesis_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationCrossBoardSynthesisRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-cross-board-synthesis-merge-split-reuse-scenarios',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_cross_board_synthesis_role_output',
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
    workflow_run_id: 'cross_board_synthesis_runtime_run_001',
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
      workflow_run_id: 'cross_board_synthesis_runtime_run_001',
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
    profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1700,
    estimated_output_tokens: 3500,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1600,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-cross-board-synthesis-context-compression'),
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
