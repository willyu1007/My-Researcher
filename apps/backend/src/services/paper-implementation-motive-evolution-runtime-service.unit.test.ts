import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  type PaperImplementationMotiveEvolutionChallengeCheck,
  type PaperImplementationMotiveEvolutionDecisionOption,
  type PaperImplementationMotiveEvolutionDesignedOption,
  type PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  type PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  type PaperImplementationMotiveEvolutionRoleSlotId,
  type RunPaperImplementationMotiveEvolutionRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationMotiveEvolutionRuntimeService } from './paper-implementation-motive-evolution-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_motive_evolution_runtime_001';
const TITLE_CARD_ID = 'title_card_motive_evolution_runtime_001';
const NOW = '2026-06-09T10:00:00.000Z';
const OPTION_SET_HASH = hash('motive-evolution-option-set-001');

type Outcome =
  | 'passed'
  | 'no_evolution_needed'
  | 'blocked'
  | 'schema_failed'
  | 'designer_invented_ref'
  | 'designer_missing_human_gate'
  | 'designer_authority_field'
  | 'challenger_missing_coverage'
  | 'challenger_option_set_mismatch'
  | 'challenger_blocked_without_reason'
  | 'challenger_side_effect_guard_missing'
  | 'challenger_authority_field';

type ProvenanceDriftKind = true | 'identity' | 'source' | 'run_mode';

interface StubCall {
  node_id: string;
  workflow_run_id?: string;
  node_attempt_id?: string | null;
  invocation_attempt_id?: string | null;
  execution_mode: string;
  executor_kind: string;
  run_mode?: string;
  feature_id?: string | null;
  profile_id?: string;
  output_contract?: string;
  model_option_id?: string | null;
  prompt?: {
    promptTemplateId: string;
    version: string;
  };
  schema_name?: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  input_refs?: TopicSelectionFunctionalRef[];
  runtime_token_budget?: unknown;
  debate_extension?: {
    role?: string;
    round_index?: number;
    parent_invocation_attempt_ids?: string[];
  } | null;
}

class StubMotiveEvolutionAgentOrchestrator {
  readonly calls: StubCall[] = [];

  constructor(
    private readonly outcomes: Partial<Record<PaperImplementationMotiveEvolutionRoleSlotId, Outcome[]>> = {},
    private readonly provenanceDrifts: Partial<Record<PaperImplementationMotiveEvolutionRoleSlotId, ProvenanceDriftKind>> = {},
  ) {}

  async invokeStructuredOutput<T>(input: StubCall): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const roleSlotId = input.node_id as PaperImplementationMotiveEvolutionRoleSlotId;
    const outcome = this.outcomes[roleSlotId]?.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input);
    }
    const prior = this.priorRole(input);
    const provenanceDrift = this.provenanceDrifts[roleSlotId] ?? false;
    if (roleSlotId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID) {
      return invocationResult(this.designerOutputForOutcome(outcome) as T, input, provenanceDrift);
    }
    return invocationResult(this.challengerOutputForOutcome(outcome, prior) as T, input, provenanceDrift);
  }

  private designerOutputForOutcome(outcome: Outcome): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
    if (outcome === 'no_evolution_needed') {
      return designerRoleOutput({
        support_result_status: 'no_evolution_needed',
        designed_options: {},
      });
    }
    if (outcome === 'blocked') {
      return designerRoleOutput({
        role_status: 'blocked',
        support_result_status: 'blocked',
        designed_options: {},
        blocker_codes: ['motive_evolution_designer_blocked'],
      });
    }
    if (outcome === 'designer_invented_ref') {
      return designerRoleOutput({
        designed_options: designedOptionsByKey('evolution_option_001', {
          supporting_refs: [ref('invented_motive_ref', 'invented_001')],
        }),
      });
    }
    if (outcome === 'designer_missing_human_gate') {
      return designerRoleOutput({
        designed_options: designedOptionsByKey('evolution_option_001', {
          option_kind: 'supersede',
          portfolio_impact_class: 'semantic_version_change',
          human_confirmation_required: false,
          recommended_next_gate: 'none',
        }),
      });
    }
    if (outcome === 'designer_authority_field') {
      return {
        ...designerRoleOutput(),
        motive_evolution_decision_request: { must_not_exist: true },
      } as unknown as PaperImplementationMotiveEvolutionOptionDesignerRoleOutput;
    }
    return designerRoleOutput();
  }

  private challengerOutputForOutcome(
    outcome: Outcome,
    prior: PriorRoleMaterial,
  ): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
    if (outcome === 'no_evolution_needed') {
      return challengerRoleOutput(prior, {
        support_result_status: 'no_evolution_needed',
        challenged_option_keys: [],
        decision_options: {},
      });
    }
    if (outcome === 'blocked') {
      return challengerRoleOutput(prior, {
        role_status: 'blocked',
        support_result_status: 'blocked',
        challenged_option_keys: [],
        decision_options: {},
        blocker_codes: ['motive_evolution_requires_human_confirmation'],
      });
    }
    if (outcome === 'challenger_missing_coverage') {
      return challengerRoleOutput(prior, {
        challenged_option_keys: [],
        decision_options: {},
      });
    }
    if (outcome === 'challenger_option_set_mismatch') {
      return challengerRoleOutput(prior, {
        option_set_hash: hash('different-option-set'),
      });
    }
    if (outcome === 'challenger_blocked_without_reason') {
      return challengerRoleOutput(prior, {
        decision_options: decisionOptionsByKey('evolution_option_001', {
          challenge_check: {
            ...challengeCheck(),
            evidence_status: 'blocked',
            blocking_reason_codes: [],
          },
        }),
      });
    }
    if (outcome === 'challenger_side_effect_guard_missing') {
      return challengerRoleOutput(prior, {
        no_portfolio_mutation_side_effect: false as unknown as true,
      });
    }
    if (outcome === 'challenger_authority_field') {
      return {
        ...challengerRoleOutput(prior),
        ApplyMotivePortfolioDecisionRequest: { must_not_exist: true },
      } as unknown as PaperImplementationMotiveEvolutionRiskChallengerRoleOutput;
    }
    return challengerRoleOutput(prior);
  }

  private priorRole(input: StubCall): PriorRoleMaterial {
    const userMessage = input.messages.find((message) => message.role === 'user')?.content ?? '{}';
    const parsed = JSON.parse(userMessage) as {
      prior_role_artifacts?: Array<{
        artifact_ref: TopicSelectionFunctionalRef;
        artifact_hash: string;
        option_set_hash?: string | null;
      }>;
    };
    const prior = parsed.prior_role_artifacts?.[0];
    return {
      designer_role_artifact_ref: prior?.artifact_ref ?? ref('motive_evolution_role_artifact', 'designer_missing'),
      designer_role_artifact_hash: prior?.artifact_hash ?? hash('designer-missing'),
      option_set_hash: prior?.option_set_hash ?? OPTION_SET_HASH,
    };
  }
}

interface PriorRoleMaterial {
  designer_role_artifact_ref: TopicSelectionFunctionalRef;
  designer_role_artifact_hash: string;
  option_set_hash: string;
}

test('motive evolution runtime records two-role decision support without domain writes', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const request = providerRequest();
  const result = await service.runEvolutionDecisionSupport(PROJECT_ID, request);

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(result.workflow_type, 'motive_evolution');
  assert.equal(result.provider_call_count, 2);
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[1]?.node_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(orchestrator.calls[0]?.profile_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID);
  assert.equal(orchestrator.calls[0]?.model_option_id, `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`);
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(Boolean(orchestrator.calls[1]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension?.role, 'explorer');
  assert.equal(orchestrator.calls[1]?.debate_extension?.role, 'deep_critic');
  assert.equal(orchestrator.calls[0]?.debate_extension?.round_index, 1);
  assert.equal(orchestrator.calls[1]?.debate_extension?.round_index, 2);
  assert.equal(orchestrator.calls[1]?.debate_extension?.parent_invocation_attempt_ids?.length, 1);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /motive evolution decision support/);
  assert.match(orchestrator.calls[1]?.messages[0]?.content ?? '', /Challenge every designer option key/);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.target_motive_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.portfolio_snapshot_ref), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.evidence_board_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.trace_manifest_refs[0]), true);
  assert.equal(result.runtime_artifacts.length, 3);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    Object.keys(result.final_runtime_artifact?.artifact_payload.decision_options as Record<string, unknown>).length,
    1,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_motive_write_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_portfolio_mutation_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.cache_identity as Record<string, unknown>).option_set_hash,
    OPTION_SET_HASH,
  );
  for (const forbiddenField of [
    'motive_evolution_decision_request',
    'ApplyMotivePortfolioDecisionRequest',
    'motive_roles_after_decision',
    'core_motive_version_patch',
    'domain_gate_request',
    'queue_action',
    'writer_dto_payload',
    'rendered_prompt_text',
    'raw_provider_output',
    'debate_transcript',
  ]) {
    assert.equal(forbiddenField in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  }
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 3);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 3);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('motive_evolution_decision_request'), false);
});

test('motive evolution runtime admits no-evolution-needed and semantic blocked support', async () => {
  const noEvolution = serviceFixture({
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: ['no_evolution_needed'],
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]: ['no_evolution_needed'],
  });
  const noEvolutionResult = await noEvolution.service.runEvolutionDecisionSupport(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_evolution_no_evolution_needed_run_001',
  });

  assert.equal(noEvolutionResult.status, 'passed');
  assert.equal(noEvolutionResult.runtime_artifacts.length, 3);
  assert.equal(noEvolutionResult.final_admission_record?.admission_status, 'admitted');
  assert.equal(noEvolutionResult.final_runtime_artifact?.artifact_payload.support_result_status, 'no_evolution_needed');
  assert.equal(
    Object.keys(noEvolutionResult.final_runtime_artifact?.artifact_payload.decision_options as Record<string, unknown>).length,
    0,
  );

  const blocked = serviceFixture({
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]: ['blocked'],
  });
  const blockedResult = await blocked.service.runEvolutionDecisionSupport(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_evolution_semantic_blocked_run_001',
  });

  assert.equal(blockedResult.status, 'blocked');
  assert.equal(blocked.orchestrator.calls.length, 2);
  assert.equal(blockedResult.runtime_artifacts.length, 3);
  assert.equal(blockedResult.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(blockedResult.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(blockedResult.final_admission_record?.admission_status, 'admitted');
});

test('motive evolution runtime accepts registry default provider model option', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runEvolutionDecisionSupport(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_evolution_default_provider_option_run_001',
    model_option_id: null,
  });

  assert.equal(result.status, 'passed');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(orchestrator.calls[0]?.model_option_id, null);
  assert.equal(result.runtime_artifacts[0]?.model_option_id, `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`);
  assert.equal(result.runtime_artifacts[1]?.model_option_id, `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`);
  assert.equal(result.final_runtime_artifact?.model_option_id, `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('motive evolution runtime preflight blocks memo refs and uncovered context packets before provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  const request = providerRequest();
  const result = await service.runEvolutionDecisionSupport(PROJECT_ID, {
    ...request,
    run_id: 'motive_evolution_preflight_run_001',
    source_refs: [
      ...request.source_refs,
      ref('motive_summary_memo', 'memo_001'),
    ],
    source_hashes: [
      ...request.source_hashes,
      hash('memo'),
    ],
    motive_context_packets: [{
      ...request.motive_context_packets![0],
      covered_evidence_refs: [],
      covered_trace_manifest_refs: [],
      covered_source_refs: [],
    }],
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'MOTIVE_EVOLUTION_PREFLIGHT_BLOCKED');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.blocker_codes.includes('MOTIVE_EVOLUTION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(result.blocker_codes.includes('MOTIVE_EVOLUTION_CONTEXT_PACKET_UNCOVERED'), true);
});

for (const scenario of [
  {
    name: 'designer schema failure',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    outcome: 'schema_failed' as const,
    failureCode: 'SCHEMA_VALIDATION_FAILED',
    expectedCalls: 2,
    expectedArtifacts: 1,
  },
  {
    name: 'designer invented ref',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    outcome: 'designer_invented_ref' as const,
    failureCode: 'MOTIVE_EVOLUTION_REF_MISMATCH',
    expectedCalls: 2,
    expectedArtifacts: 1,
  },
  {
    name: 'designer missing human confirmation gate',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    outcome: 'designer_missing_human_gate' as const,
    failureCode: 'MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING',
    expectedCalls: 2,
    expectedArtifacts: 1,
  },
  {
    name: 'designer authority field',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    outcome: 'designer_authority_field' as const,
    failureCode: 'MOTIVE_EVOLUTION_AUTHORITY_FIELD_PRESENT',
    expectedCalls: 2,
    expectedArtifacts: 1,
  },
  {
    name: 'challenger missing coverage',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    outcome: 'challenger_missing_coverage' as const,
    failureCode: 'MOTIVE_EVOLUTION_CHALLENGE_COVERAGE_MISSING',
    expectedCalls: 3,
    expectedArtifacts: 2,
  },
  {
    name: 'challenger option set mismatch',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    outcome: 'challenger_option_set_mismatch' as const,
    failureCode: 'MOTIVE_EVOLUTION_OPTION_SET_MISMATCH',
    expectedCalls: 3,
    expectedArtifacts: 2,
  },
  {
    name: 'challenger blocked check without reason',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    outcome: 'challenger_blocked_without_reason' as const,
    failureCode: 'MOTIVE_EVOLUTION_BOUNDARY_BLOCKER_MISSING',
    expectedCalls: 3,
    expectedArtifacts: 2,
  },
  {
    name: 'challenger missing side-effect guard',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    outcome: 'challenger_side_effect_guard_missing' as const,
    failureCode: 'MOTIVE_EVOLUTION_SIDE_EFFECT_GUARD_MISSING',
    expectedCalls: 3,
    expectedArtifacts: 2,
  },
  {
    name: 'challenger authority field',
    role: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    outcome: 'challenger_authority_field' as const,
    failureCode: 'MOTIVE_EVOLUTION_AUTHORITY_FIELD_PRESENT',
    expectedCalls: 3,
    expectedArtifacts: 2,
  },
]) {
  test(`motive evolution runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator } = serviceFixture({
      [scenario.role]: [scenario.outcome, scenario.outcome],
    });
    const result = await service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: `motive_evolution_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, scenario.expectedCalls);
    assert.equal(result.provider_call_count, scenario.expectedCalls);
    assert.equal(result.runtime_artifacts.length, scenario.expectedArtifacts);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts.at(-1)?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.runtime_artifacts.at(-1)?.retry_attempt_index, 1);
    assert.equal(result.runtime_artifacts.at(-1)?.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
    assert.equal(result.admission_records.at(-1)?.admission_status, 'rejected');
    assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
    assert.deepEqual(result.operational_telemetry.admission_issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  });
}

test('motive evolution runtime rejects provider provenance drift before final admission', async () => {
  const { service, orchestrator } = serviceFixture(
    {},
    { [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: true },
  );
  const result = await service.runEvolutionDecisionSupport(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_evolution_provider_provenance_drift_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(result.provider_call_count, 1);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'MOTIVE_EVOLUTION_PROVENANCE_DRIFT');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

for (const drift of ['source', 'run_mode'] as const) {
  test(`motive evolution runtime rejects provider ${drift} provenance drift before final admission`, async () => {
    const { service, orchestrator } = serviceFixture(
      {},
      { [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: drift },
    );
    const result = await service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: `motive_evolution_provider_${drift}_drift_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 1);
    assert.equal(result.provider_call_count, 1);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'MOTIVE_EVOLUTION_PROVENANCE_DRIFT');
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('motive evolution runtime rejects product fixture modes, provider fixtures, model drift, and harness primary refs', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: motiveRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_provider_fixture_payload_run_001',
      codex_role_outputs: motiveRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_model_option_drift_run_001',
      model_option_id: 'paper-implementation.motive-decomposition.draft-assertion-candidates.v1.openai-balanced',
    }),
    /model_option_id must be defined by runtime slot profile/,
  );

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_unknown_same_profile_model_option_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.unknown-provider-option`,
    }),
    /model_option_id must be defined by runtime slot profile/,
  );

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_harness_id_field_run_001',
      agent_workflow_harness_run_id: 'harness_run_001',
    } as unknown as RunPaperImplementationMotiveEvolutionRuntimeRequest),
    /must not include production authority or raw-provider fields/,
  );

  await assert.rejects(
    () => service.runEvolutionDecisionSupport(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_evolution_harness_primary_ref_run_001',
      human_request_refs: [ref('agent_workflow_harness_run', 'harness_run_001')],
      human_request_hashes: [hash('harness')],
    }),
    /forbids primary input ref_type=agent_workflow_harness_run/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

function serviceFixture(
  outcomes?: Partial<Record<PaperImplementationMotiveEvolutionRoleSlotId, Outcome[]>>,
  provenanceDrifts?: Partial<Record<PaperImplementationMotiveEvolutionRoleSlotId, ProvenanceDriftKind>>,
) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new StubMotiveEvolutionAgentOrchestrator(outcomes, provenanceDrifts);
  const service = new PaperImplementationMotiveEvolutionRuntimeService({
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function motiveRoleOutputs(): RunPaperImplementationMotiveEvolutionRuntimeRequest['mocked_role_outputs'] {
  const prior = {
    designer_role_artifact_ref: ref('motive_evolution_role_artifact', 'designer_role_001'),
    designer_role_artifact_hash: hash('designer-role-001'),
    option_set_hash: OPTION_SET_HASH,
  };
  return {
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: designerRoleOutput(),
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]: challengerRoleOutput(prior),
  };
}

function providerRequest(): RunPaperImplementationMotiveEvolutionRuntimeRequest {
  return {
    run_id: 'motive_evolution_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_version_id: 'v1',
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    target_motive_hashes: [hash('core-motive-001')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    target_core_motive_version_hashes: [hash('core-motive-version-001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'portfolio_snapshot_001'),
    portfolio_snapshot_hash: hash('portfolio-snapshot-001'),
    evidence_board_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    evidence_board_hashes: [hash('board-version-001')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_001')],
    evidence_binding_hashes: [hash('evidence-binding-001')],
    challenge_refs: [ref('motive_challenge', 'challenge_001')],
    conflict_refs: [ref('motive_conflict', 'conflict_001')],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hash('trace-manifest-001')],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'policy_001'),
    human_confirmation_policy_hash: hash('human-confirmation-policy-001'),
    source_refs: [
      ref('source', 'source_001'),
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('evidence_binding', 'evidence_binding_001'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [
      hash('source-001'),
      hash('board-version-001'),
      hash('evidence-binding-001'),
      hash('trace-manifest-001'),
    ],
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'motive_context_packet_001'),
      packet_hash: hash('motive-context-packet-001'),
      packet_kind: 'motive_version_state',
      content_summary: 'Provider-readable motive version state summary bound to refs and hashes.',
      key_facts: ['Current motive version has unresolved challenge evidence.'],
      covered_target_refs: [
        ref('core_motive_version', 'core_motive_version_001'),
        ref('core_motive', 'core_motive_001'),
      ],
      covered_evidence_refs: [
        ref('motive_evidence_board_version', 'board_version_001'),
        ref('evidence_binding', 'evidence_binding_001'),
      ],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      covered_source_refs: [ref('source', 'source_001')],
    }],
    validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_001')],
    validation_cycle_hashes: [hash('validation-cycle-001')],
    result_packet_refs: [ref('result_interpretation_packet', 'result_packet_001')],
    result_packet_hashes: [hash('result-packet-001')],
    cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_001')],
    cross_board_review_hashes: [hash('cross-board-review-001')],
    prior_evolution_decision_refs: [ref('motive_evolution_decision', 'prior_evolution_001')],
    prior_evolution_decision_hashes: [hash('prior-evolution-001')],
    prior_portfolio_decision_refs: [ref('motive_portfolio_decision', 'portfolio_decision_001')],
    prior_portfolio_decision_hashes: [hash('portfolio-decision-001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    accepted_risk_hashes: [hash('accepted-risk-001')],
    human_request_refs: [ref('human_request', 'human_request_001')],
    human_request_hashes: [hash('human-request-001')],
    preflight_blocker_codes: [],
  };
}

function designedOption(
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): PaperImplementationMotiveEvolutionDesignedOption {
  return {
    option_kind: 'repair_evidence_board_first',
    supporting_refs: [
      ref('core_motive_version', 'core_motive_version_001'),
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('evidence_binding', 'evidence_binding_001'),
    ],
    challenging_refs: [
      ref('motive_challenge', 'challenge_001'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    portfolio_impact_class: 'evidence_board_only',
    human_confirmation_required: false,
    recommended_next_gate: 'evidence_board_curation',
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function decisionOption(
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): PaperImplementationMotiveEvolutionDecisionOption {
  return {
    ...designedOption(),
    challenge_check: challengeCheck(),
    ...overrides,
  };
}

function challengeCheck(
  overrides: Partial<PaperImplementationMotiveEvolutionChallengeCheck> = {},
): PaperImplementationMotiveEvolutionChallengeCheck {
  return {
    evidence_status: 'partial',
    trace_status: 'satisfied',
    portfolio_status: 'satisfied',
    human_confirmation_status: 'not_applicable',
    downstream_impact_status: 'partial',
    blocking_reason_codes: [],
    ...overrides,
  };
}

function designedOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDesignedOption> {
  return {
    [optionKey]: designedOption(overrides),
  };
}

function decisionOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDecisionOption> {
  return {
    [optionKey]: decisionOption(overrides),
  };
}

function designerRoleOutput(
  overrides: Partial<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput> = {},
): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Designed motive evolution support options for deterministic review.',
    cited_source_refs: [ref('source', 'source_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    reviewed_target_motive_refs: [ref('core_motive', 'core_motive_001')],
    reviewed_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    designed_options: designedOptionsByKey('evolution_option_001'),
    option_set_hash: OPTION_SET_HASH,
    ...overrides,
  };
}

function challengerRoleOutput(
  prior: PriorRoleMaterial,
  overrides: Partial<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput> = {},
): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Challenged every motive evolution support option for deterministic review.',
    cited_source_refs: [ref('source', 'source_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    designer_role_artifact_ref: prior.designer_role_artifact_ref,
    designer_role_artifact_hash: prior.designer_role_artifact_hash,
    option_set_hash: prior.option_set_hash,
    challenged_option_keys: ['evolution_option_001'],
    decision_options: decisionOptionsByKey('evolution_option_001'),
    ...overrides,
  };
}

function invocationResult<T>(
  output: T,
  call: StubCall,
  provenanceDrift: ProvenanceDriftKind | false = false,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult({
    output,
    call,
    provenanceDrift,
    status: 'succeeded',
    errorCode: null,
    blockerCodes: [],
  });
}

function failedInvocationResult<T>(
  call: StubCall,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult<T>({
    output: null,
    call,
    provenanceDrift: false,
    status: 'blocked',
    errorCode: 'SCHEMA_VALIDATION_FAILED',
    blockerCodes: ['SCHEMA_VALIDATION_FAILED'],
  });
}

function baseInvocationResult<T>(input: {
  output: T | null;
  call: StubCall;
  provenanceDrift: ProvenanceDriftKind | false;
  status: 'succeeded' | 'blocked';
  errorCode: string | null;
  blockerCodes: string[];
}): TopicSelectionAgentInvocationResult<T> {
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const workflowRunId = input.call.workflow_run_id ?? 'motive_evolution_runtime_run_001';
  const nodeAttemptId = input.call.node_attempt_id ?? `${input.call.node_id}.attempt-0`;
  const invocationAttemptId = input.call.invocation_attempt_id ?? `${input.call.node_id}.call-1`;
  const identityDrifted = input.provenanceDrift === true || input.provenanceDrift === 'identity';
  const sourceDrifted = input.provenanceDrift === 'source';
  const runModeDrifted = input.provenanceDrift === 'run_mode';
  const profileId = identityDrifted
    ? 'paper-implementation.route-architecture.route-candidates.v1'
    : input.call.profile_id ?? PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID;
  const modelOptionId = identityDrifted
    ? `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.unknown-provider-option`
    : input.call.execution_mode === 'provider_llm'
      ? input.call.model_option_id ?? `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`
      : null;
  const sourceKind = sourceDrifted
    ? 'mock_fixture'
    : input.call.execution_mode === 'provider_llm' ? 'provider_response' : 'mock_fixture';
  const nonProvider = sourceDrifted
    ? true
    : input.call.execution_mode !== 'provider_llm';
  const runMode = runModeDrifted
    ? 'acceptance'
    : input.call.run_mode ?? (input.call.execution_mode === 'provider_llm' ? 'product' : 'acceptance');
  const provenance = {
    workflow_run_id: workflowRunId,
    node_id: input.call.node_id,
    node_attempt_id: nodeAttemptId,
    invocation_attempt_id: invocationAttemptId,
    execution_mode: input.call.execution_mode,
    executor_kind: input.call.executor_kind,
    source_kind: sourceKind,
    non_provider: nonProvider,
    run_mode: runMode,
    profile_id: profileId,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: modelOptionId,
    normalized_params_hash: input.call.execution_mode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: input.call.output_contract ?? 'PaperImplementationMotiveEvolutionRoleArtifact@v1',
    prompt_template_id: input.call.prompt?.promptTemplateId ?? 'paper-implementation-motive-evolution-decision-support',
    prompt_template_version: input.call.prompt?.version ?? 'v1',
    schema_name: input.call.schema_name ?? (
      input.call.node_id.endsWith('risk_challenger')
        ? 'paper_implementation_motive_evolution_risk_challenger_role_output'
        : 'paper_implementation_motive_evolution_option_designer_role_output'
    ),
    prompt_packet_hash: hash(`prompt:${input.call.node_id}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: input.call.execution_mode === 'provider_llm' ? { request_count: 1 } : null,
  };
  return {
    schema_version: 'v1',
    node_id: input.call.node_id,
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(input.call.node_id),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.call.node_id,
      workflow_run_id: workflowRunId,
      node_attempt_id: nodeAttemptId,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(input.call.node_id),
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

function tokenBudgetGateResult(nodeId: string) {
  return {
    provider_id: null,
    model_id: null,
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1600,
    estimated_output_tokens: 4096,
    context_window_tokens: 128000,
    schema_overhead_tokens: 2000,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', `paper-implementation-motive-evolution-context-compression-${nodeId}`),
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
