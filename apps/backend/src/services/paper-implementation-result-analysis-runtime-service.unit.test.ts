import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  type PaperImplementationResultAnalysisRoleOutput,
  type RunPaperImplementationResultAnalysisRuntimeRequest,
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
import { PaperImplementationResultAnalysisRuntimeService } from './paper-implementation-result-analysis-runtime-service.js';
import type {
  PaperImplementationScientificClosureContextResolution,
} from './paper-implementation-scientific-closure-context-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_result_analysis_runtime_001';
const TITLE_CARD_ID = 'title_card_result_analysis_runtime_001';
const NOW = '2026-06-04T09:00:00.000Z';

class StubResultAnalysisAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(
    private readonly outcomes: Array<
      'passed'
      | 'schema_failed'
      | 'incomplete_scenarios'
      | 'missing_semantic_blocks'
      | 'malformed_semantic_content'
      | 'assertion_ref_type_invalid'
    > = ['passed'],
  ) {}

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      executor_kind: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_scenarios') {
      return invocationResult(roleOutput({
        scenario_outputs: [resultAnalysisScenarioOutput('positive')],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_semantic_blocks') {
      // T-124 G4.6: a passed output without the typed semantic blocks cannot be
      // assembled into a CreateResultInterpretationPacketRequest.
      return invocationResult(roleOutput({
        interpretation: null,
        reliability: null,
        claim_implications: null,
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'malformed_semantic_content') {
      // T-124 G4.6: semantic content present but schema-invalid (empty
      // result_summary) — the ASSEMBLED request fails the Domain Gate ajv
      // pre-check (retryable), never a 400 at materialize.
      return invocationResult(roleOutput({
        interpretation: {
          ...interpretationBlock(),
          result_summary: '',
        },
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'assertion_ref_type_invalid') {
      // T-124 G5 FIX-A item 12: an evidence ref in the assertion position (the
      // run 013 / gs-002 recurrence) — retryable semantic failure.
      return invocationResult(roleOutput({
        interpretation: {
          ...interpretationBlock(),
          supports_assertion_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
        },
      }) as T, input.node_id, input.execution_mode);
    }
    return invocationResult(roleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('result analysis runtime records role and final artifacts with telemetry', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const result = await service.runInterpretationScenarios(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID);
  assert.equal(result.workflow_type, 'result_analysis');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /Interpretations are not evidence/);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.admission_records.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.scenario_outputs as unknown[] | undefined)?.length,
    4,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request !== null, true);
  assert.equal(result.operational_telemetry.provider_call_count, 1);
  assert.equal(result.operational_telemetry.role_provider_call_count, 1);
  assert.equal(result.operational_telemetry.final_provider_call_count, 1);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.runtime_artifact_count, 2);
  assert.equal(result.operational_telemetry.role_artifact_count, 1);
  assert.equal(result.operational_telemetry.final_artifact_count, 1);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('rendered_prompt_text'), false);
});

test('result analysis rejects prefixed runtime hashes before provider calls', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const request = providerRequest();
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      input_snapshot_hash: `sha256:${request.input_snapshot_hash}`,
      source_hashes: request.source_hashes.map((hashValue) => `sha256:${hashValue}`),
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.equal(
        error.message,
        'input_snapshot_hash and source_hashes must be bare SHA-256 hashes.',
      );
      return true;
    },
  );
  assert.equal(orchestrator.calls.length, 0);
  assert.equal((await repository.listRuntimeArtifacts(PROJECT_ID)).length, 0);
});

test('P3 scientific context versions one admitted actual-result closure proposal', async () => {
  const { service, orchestrator } = serviceFixture();
  const context = scientificContextResolution().context;
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_scientific_closure_run_001',
    target_ref: {
      ...ref('Validation-Cycle', 'validation_cycle_001'),
      version_id: 'cycle-domain-version-7',
    },
    target_version_id: 'runtime-input-snapshot-version-13',
    source_context_packets: undefined,
    scientific_closure_intent: {
      schema_version: 'PaperImplementationScientificClosureIntent@v1',
      expected_closure_watermark_hash: context.closure_watermark_hash,
    },
  });

  const artifact = result.final_runtime_artifact;
  assert.ok(artifact);
  assert.equal(
    artifact.output_schema_id,
    PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
  );
  assert.equal(artifact.artifact_contract_version, 'v2');
  assert.equal(artifact.target_ref.ref_type, 'validation_cycle');
  assert.equal(artifact.target_ref.version_id, 'cycle-domain-version-7');
  assert.equal(artifact.target_version_id, 'runtime-input-snapshot-version-13');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.final_admission_record?.target_ref.ref_type, 'validation_cycle');
  assert.equal(result.final_admission_record?.target_ref.version_id, 'cycle-domain-version-7');
  assert.equal(
    result.final_admission_record?.admitted_artifact_hash,
    artifact.final_artifact_hash,
  );
  assert.deepEqual(artifact.artifact_payload.scientific_closure_proposal, {
    schema_version: 'PaperImplementationScientificClosureProposal@v1',
    validation_cycle_id: context.validation_cycle_id,
    closure_watermark_hash: context.closure_watermark_hash,
    primary_comparison_fact_ref: context.primary_comparison_fact_ref,
    ordered_evidence_refs: context.ordered_evidence_refs,
    interpretation_summary: 'The trusted run supports the bounded assertion.',
    reliability_assessment: roleOutput().reliability,
    limitations: {
      limitation_refs: roleOutput().reliability?.limitation_refs,
      reliability_notes: roleOutput().reliability?.reliability_notes,
    },
    claim_ceiling: 'moderate',
  });
  assert.match(
    orchestrator.calls[0]?.messages[1]?.content ?? '',
    /PaperImplementationScientificClosureContext@v1/,
  );
});

test('scientific closure intent rejects caller-supplied scientific source bodies', async () => {
  const { service, orchestrator } = serviceFixture();
  const request = providerRequest();
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      scientific_closure_intent: {
        schema_version: 'PaperImplementationScientificClosureIntent@v1',
        expected_closure_watermark_hash: scientificHash('closure-watermark'),
      },
      source_context_packets: [{
        source_ref: request.source_refs[0]!,
        source_hash: request.source_hashes[0]!,
        evidence_kind: 'caller_scientific_fact',
        content_summary: 'Untrusted caller body.',
        key_facts: ['must-not-reach-provider'],
      }],
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /without caller-supplied source bodies/.test(error.message),
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('result analysis service rejects the retired caller scientific context even without route validation', async () => {
  const { service, orchestrator } = serviceFixture();
  const legacyRequest = {
    ...providerRequest(),
    scientific_closure_context: scientificContextResolution().context,
  } as unknown as RunPaperImplementationResultAnalysisRuntimeRequest;
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, legacyRequest),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /Caller-authored scientific_closure_context/.test(error.message),
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('T-124 G4.6: result analysis assembles the domain_gate_request deterministically from request context + semantic blocks', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(orchestrator.calls.length, 1);
  // Provider mode uses the single canonical schema — no wire carrier residue.
  const serialized = stableStringify(result);
  assert.equal(serialized.includes('domain_gate_request_json'), false);
  const domainGate = result.final_runtime_artifact?.artifact_payload.domain_gate_request as Record<string, unknown> | null;
  assert.ok(domainGate);
  // Structural fields come from the request context (target + source refs).
  assert.equal(domainGate?.result_interpretation_packet_id, 'result_interpretation_packet_001');
  assert.equal(domainGate?.validation_cycle_id, 'validation_cycle_001');
  assert.equal(domainGate?.trace_manifest_id, 'trace_manifest_result_001');
  const source = domainGate?.source as Record<string, unknown>;
  assert.deepEqual(
    (source.run_evidence_refs as Array<{ ref_id: string }>).map((item) => item.ref_id),
    ['run_evidence_unit_001'],
  );
  assert.deepEqual(
    (source.metric_refs as Array<{ ref_id: string }>).map((item) => item.ref_id),
    ['metric_001'],
  );
  // Semantic fields come verbatim from the role's typed blocks.
  const resultSummary = domainGate?.result_summary as Record<string, unknown>;
  assert.equal(resultSummary.result_summary, 'The trusted run supports the bounded assertion.');
  const claimImplications = domainGate?.claim_implications as Record<string, unknown>;
  assert.equal(claimImplications.allowed_claim_ceiling, 'moderate');
  // created_by reflects the executing actor (provider_llm -> llm).
  assert.equal(domainGate?.created_by, 'llm');
});

test('T-124 G4.6: result analysis rejects an incomplete Domain Gate structural context with 400 before any provider call', async () => {
  const { service, orchestrator } = serviceFixture();
  const request = providerRequest();
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      run_id: 'result_analysis_missing_structural_context_run_001',
      source_refs: request.source_refs.filter((item) => item.ref_type !== 'result_interpretation_packet'),
      source_hashes: request.source_hashes.slice(0, request.source_refs.length - 1),
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /result_interpretation_packet/.test(error.message),
  );
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      run_id: 'result_analysis_wrong_target_type_run_001',
      target_ref: ref('experiment_result', 'experiment_result_001'),
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /validation_cycle/.test(error.message),
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('result analysis runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_preflight_blocked_run_001',
    preflight_blocker_codes: ['run_evidence_missing'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['run_evidence_missing']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('result analysis runtime fails closed after same-profile provider retry exhaustion', async () => {
  const { service, orchestrator } = serviceFixture(['schema_failed', 'schema_failed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_retry_exhausted_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.operational_telemetry.runtime_failure_codes, ['SCHEMA_VALIDATION_FAILED']);
  assert.deepEqual(result.operational_telemetry.warning_codes, ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED']);
});

test('result analysis runtime fails closed when passed output omits required scenario kinds', async () => {
  const { service, orchestrator } = serviceFixture(['incomplete_scenarios', 'incomplete_scenarios']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_missing_scenarios_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.operational_telemetry.runtime_failure_codes, [
    'RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE',
  ]);
});

test('T-124 G4.6: result analysis fails closed when a passed output omits the semantic content blocks', async () => {
  const { service, orchestrator } = serviceFixture(['missing_semantic_blocks', 'missing_semantic_blocks']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_missing_domain_gate_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_DOMAIN_GATE_REQUEST_MISSING');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

test('T-124 G4.5 Fix 2 (under G4.6 assembly): result analysis fails closed (retryable) when the ASSEMBLED request cannot satisfy the target Create schema', async () => {
  const { service, orchestrator } = serviceFixture(['malformed_semantic_content', 'malformed_semantic_content']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_malformed_domain_gate_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  // Retryable: one same-profile retry, then terminal failed_runtime (2 calls).
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_DOMAIN_GATE_REQUEST_MALFORMED');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

test('T-124 G5 FIX-A item 12: result analysis fails closed (retryable) when an assertion ref carries a source-bundle evidence type', async () => {
  const { service, orchestrator } = serviceFixture(['assertion_ref_type_invalid', 'assertion_ref_type_invalid']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_assertion_ref_invalid_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_ASSERTION_REF_TYPE_INVALID');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

test('T-124 G4.5 Fix 2 (under G4.6 assembly): result analysis retry recovers when malformed semantic content is followed by a valid output', async () => {
  const { service, orchestrator } = serviceFixture(['malformed_semantic_content', 'passed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_malformed_then_valid_run_001',
  });

  assert.equal(result.status, 'passed');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request !== null, true);
});

test('T-124 G4.5 Fix 1: result analysis injects hash-fenced source_context_packets into the role prompt', async () => {
  const { service, orchestrator } = serviceFixture();
  const request = providerRequest();
  const packets = [
    {
      source_ref: request.source_refs[0]!,
      source_hash: request.source_hashes[0]!,
      evidence_kind: 'run_evidence_unit',
      content_summary: 'Confirmatory run: LoRA r=8 reaches parity on SST-2 95.1 vs 94.8.',
      key_facts: ['SST-2 95.1 vs 94.8', 'MRPC 89.7 vs 90.2', 'CoLA 63.4 vs 63.6'],
    },
  ];
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...request,
    run_id: 'result_analysis_context_packets_run_001',
    source_context_packets: packets,
  });

  assert.equal(result.status, 'passed');
  const userMessage = orchestrator.calls[0]?.messages.find((message) => message.role === 'user')?.content ?? '';
  assert.match(userMessage, /source_context_packets/);
  assert.match(userMessage, /SST-2 95\.1 vs 94\.8/);
  const systemMessage = orchestrator.calls[0]?.messages[0]?.content ?? '';
  assert.match(systemMessage, /three semantic blocks/);
  assert.match(systemMessage, /Do not emit a request envelope/);
});

test('T-124 G4.5 Fix 1: result analysis rejects a source_context_packet whose hash does not match the declared source', async () => {
  const { service } = serviceFixture();
  const request = providerRequest();
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      run_id: 'result_analysis_fence_hash_mismatch_run_001',
      source_context_packets: [
        {
          source_ref: request.source_refs[0]!,
          source_hash: hash('a-different-body'),
          evidence_kind: 'run_evidence_unit',
          content_summary: 'body',
          key_facts: [],
        },
      ],
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /source_hash .* does not match/.test(error.message),
  );
});

test('T-124 G4.5 Fix 1: result analysis rejects a source_context_packet for an undeclared source_ref', async () => {
  const { service } = serviceFixture();
  const request = providerRequest();
  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...request,
      run_id: 'result_analysis_fence_unknown_ref_run_001',
      source_context_packets: [
        {
          source_ref: ref('experiment_result', 'not_declared_001'),
          source_hash: hash('body'),
          evidence_kind: 'experiment_result',
          content_summary: 'body',
          key_facts: [],
        },
      ],
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /is not among the declared source_refs/.test(error.message),
  );
});

test('result analysis runtime rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'result_analysis_product_codex_mode_run_001',
      execution_mode: 'codex_assisted',
      model_option_id: null,
      codex_role_outputs: resultAnalysisRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'result_analysis_provider_fixture_payload_run_001',
      mocked_role_outputs: resultAnalysisRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('result analysis runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runInterpretationScenarios(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runInterpretationScenarios(PROJECT_ID, providerRequest()),
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
  outcomes?: Array<
    'passed'
    | 'schema_failed'
    | 'incomplete_scenarios'
    | 'missing_semantic_blocks'
    | 'malformed_semantic_content'
    | 'assertion_ref_type_invalid'
  >,
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
  const orchestrator = new StubResultAnalysisAgentOrchestrator(outcomes);
  const service = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    scientificClosureContextResolver: {
      resolve: async () => scientificContextResolution(),
    },
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function scientificContextResolution(): PaperImplementationScientificClosureContextResolution {
  const context = {
    schema_version: 'PaperImplementationScientificClosureContext@v1' as const,
    validation_cycle_id: 'validation_cycle_001',
    closure_watermark_hash: scientificHash('closure-watermark'),
    primary_comparison_fact_ref: {
      comparison_fact_id: 'comparison-fact-primary',
      comparison_fact_hash: scientificHash('comparison-fact-primary'),
    },
    ordered_evidence_refs: [{
      ordinal: 1,
      run_evidence_unit_id: 'run_evidence_unit_001',
      content_hash: scientificHash('run-evidence-unit-001'),
    }],
  };
  const sources = [
    {
      source_ref: {
        ...ref('run_evidence_unit', 'run_evidence_unit_001'),
        version_id: context.ordered_evidence_refs[0]!.content_hash,
      },
      source_hash: hash('run-evidence-unit-001'),
      evidence_kind: 'run_evidence_unit',
      content_summary: 'Authoritative RunEvidenceUnit.',
      key_facts: ['report=result_validation_report_001'],
    },
    {
      source_ref: {
        ...ref('result_validation_report', 'result_validation_report_001'),
        version_id: scientificHash('validation-report-001'),
      },
      source_hash: hash('validation-report-001'),
      evidence_kind: 'scientific_validation_report',
      content_summary: 'Authoritative validation report.',
      key_facts: ['status=valid'],
    },
  ];
  return {
    context,
    authoritative_sources: sources.map((source) => ({
      source_ref: source.source_ref,
      source_hash: source.source_hash,
      source_context_packet: {
        source_ref: source.source_ref,
        source_hash: source.source_hash,
        evidence_kind: source.evidence_kind,
        content_summary: source.content_summary,
        key_facts: source.key_facts,
      },
    })),
  };
}

function resultAnalysisRoleOutputs(): RunPaperImplementationResultAnalysisRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]: roleOutput(),
  };
}

function providerRequest(): RunPaperImplementationResultAnalysisRuntimeRequest {
  return {
    run_id: 'result_analysis_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.openai-balanced`,
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
      // T-124 G4.6 structural context: pre-authorized packet ref + trace
      // manifest ref + metric ref — assembled by the service, never the LLM.
      ref('result_interpretation_packet', 'result_interpretation_packet_001'),
      ref('trace_manifest', 'trace_manifest_result_001'),
      ref('metric', 'metric_001'),
    ],
    source_hashes: [
      hash('run-evidence'),
      hash('validation-report'),
      hash('result-packet'),
      hash('trace-manifest'),
      hash('metric'),
    ],
    preflight_blocker_codes: [],
  };
}

function resultAnalysisScenarioOutput(
  kind: PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number]['scenario_kind'],
): PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number] {
  return {
    scenario_id: `${kind}_scenario`,
    scenario_kind: kind,
    summary: `${kind} interpretation with bounded claim implications.`,
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [ref('result_validation_report', 'result_validation_report_001')],
    limitation_refs: [ref('limitation', 'limitation_001')],
    forbidden_overclaims: ['broad generalization'],
    recommended_claim_refs: [ref('claim_candidate', `${kind}_claim_candidate_001`)],
    required_followup_refs: [ref('validation_feedback_item', `${kind}_followup_001`)],
  };
}

function roleOutput(
  overrides: Partial<PaperImplementationResultAnalysisRoleOutput> = {},
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Result analysis scenarios passed.',
    cited_source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) =>
      resultAnalysisScenarioOutput(kind as PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number]['scenario_kind'])),
    interpretation: interpretationBlock(),
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', 'limitation_001')],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    ...overrides,
  };
}

function interpretationBlock(): NonNullable<PaperImplementationResultAnalysisRoleOutput['interpretation']> {
  return {
    result_summary: 'The trusted run supports the bounded assertion.',
    supports_assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
    challenges_assertion_refs: [],
    unexpected_findings: [],
    failed_run_refs: [],
    inconclusive_run_refs: [],
    stale_or_invalidated_evidence_refs: [],
    failed_runs_accounted_for: true,
    inconclusive_runs_accounted_for: true,
    exploratory_confirmatory_separated: true,
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
    workflow_run_id: 'result_analysis_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationResultAnalysisRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-result-analysis-scenarios',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_result_analysis_role_output',
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
    workflow_run_id: 'result_analysis_runtime_run_001',
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
      workflow_run_id: 'result_analysis_runtime_run_001',
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
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 1800,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1000,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-result-analysis-context-compression'),
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

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

function scientificHash(value: unknown): string {
  return `sha256:${hash(value)}`;
}

test('result analysis runtime token budget counts message-embedded context once (S2-A N3)', async () => {
  const { service, orchestrator } = serviceFixture();
  await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_token_budget_run_001',
  });

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
  assert.equal(
    budget.estimated_input_tokens_override,
    Math.ceil(stableStringify({ messages }).length / 4),
  );
  assert.deepEqual(budget.context_payloads, []);
  assert.equal(budget.compression_attempt ?? null, null);
});
