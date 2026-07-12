import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  paperImplementationMotiveDecompositionRoleOutputSchema,
  type PaperImplementationMotiveDecompositionArtifact,
  type PaperImplementationMotiveDecompositionAssertionContextPacket,
  type PaperImplementationMotiveDecompositionDraftAssertionCandidate,
  type PaperImplementationMotiveDecompositionRoleOutput,
  type PaperImplementationMotiveDecompositionRoleSlotId,
  type PaperImplementationMotiveDecompositionSlotId,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeExecutorKind,
  type RunPaperImplementationMotiveDecompositionRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  PaperImplementationAgentExecutionMode,
  PaperImplementationAgentRunMode,
  PaperImplementationAgentWorkflowType,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-agent-common-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionRuntimeCacheResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionAgentTokenBudgetGateResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
import {
  PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
} from './paper-implementation-runtime-utils.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationMotiveDecompositionRuntimeResult {
  run_id: string;
  slot_id: PaperImplementationMotiveDecompositionSlotId;
  workflow_type: 'motive_decomposition';
  status: 'passed' | 'blocked' | 'failed_runtime';
  provider_call_count: number;
  runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admission_records: PaperImplementationRuntimeAdmissionRecord[];
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  blocker_codes: string[];
  warning_codes: string[];
  operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
}

export type PaperImplementationMotiveDecompositionAgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationMotiveDecompositionAgentOrchestrator;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface SlotProfile {
  slotId: PaperImplementationMotiveDecompositionSlotId;
  workflowType: 'motive_decomposition';
  profileId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  contextPolicyId: string;
  roleSlotId: PaperImplementationMotiveDecompositionRoleSlotId;
  roleExecutorKind: PaperImplementationRuntimeExecutorKind;
  promptVariantId: string;
  finalArtifactRefType: string;
  roleArtifactRefType: string;
  artifactContractId: string;
  promptPolicyId: string;
}

interface RecordedRuntimeArtifact {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
  output: PaperImplementationMotiveDecompositionRoleOutput | null;
}

interface RoleInvocationOutcome {
  result: TopicSelectionAgentInvocationResult<PaperImplementationMotiveDecompositionRoleOutput>;
  retryAttemptIndex: number;
  providerCallCount: number;
}

interface RuntimeBase {
  implementationProjectId: string;
  runId: string;
  titleCardId: string | null;
  profile: SlotProfile;
  sourceHashBundleHash: string;
  modelProfileId: string;
  modelOptionId: string | null;
  contextPolicyProfile: TopicSelectionContextPolicyProfile;
  contextPolicyProfileHash: string;
  cachePolicyProfileHash: string;
  promptRedactionPolicyHash: string;
  compressionPolicyProfileHash: string;
}

interface BuildArtifactInput {
  artifactScope: 'role' | 'final';
  roleSlotId: string | null;
  callIndex: number | null;
  executorKind: PaperImplementationRuntimeExecutorKind;
  artifactContractId: string;
  artifactContractVersion: string;
  outputSchemaId: string;
  artifactPayloadRefType: string;
  artifactPayloadSeed: string;
  promptPacketHash: string;
  promptVariantId: string;
  runtimeStatus: 'passed' | 'blocked' | 'failed_runtime';
  runtimeFailureCode: string | null;
  retryAttemptIndex?: number;
  providerCallCount: number;
  blockerCodes: string[];
  warningCodes: string[];
  output: unknown;
  artifactPayload: Record<string, unknown>;
  priorRoleArtifacts: RecordedRuntimeArtifact[];
  finalArtifactHash?: string | null;
  finalArtifactRefType?: string;
  modelOptionId?: string | null;
  responseReuseRef?: string | null;
  responseHash?: string | null;
  tokenBudgetGateResult?: TopicSelectionAgentTokenBudgetGateResult | null;
  promptPacketCacheStatus?: TopicSelectionRuntimeCacheResult | null;
  promptPacketCacheResultRef?: TopicSelectionFunctionalRef | null;
  promptPacketCacheResultHash?: string | null;
  compressionReportRef?: TopicSelectionFunctionalRef | null;
  compressionReportHash?: string | null;
  compressedContextHash?: string | null;
  auditHash?: string | null;
}

type RuntimeControl = {
  terminal_code: 'preflight_blocked' | 'runtime_retry_exhausted';
  reason_kind: string;
  details: Record<string, unknown>;
};

const DRAFT_ASSERTION_CANDIDATES_PROFILE: SlotProfile = {
  slotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  workflowType: 'motive_decomposition',
  profileId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  promptTemplateId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_ID,
  promptTemplateVersion: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_VERSION,
  contextPolicyId: 'paper-implementation.motive-decomposition.context-policy.v1',
  roleSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  roleExecutorKind: 'single_agent',
  promptVariantId: 'draft-assertion-candidates.main',
  finalArtifactRefType: 'motive_decomposition_runtime_artifact',
  roleArtifactRefType: 'motive_decomposition_role_artifact',
  artifactContractId: 'MotiveDecompositionDraftAssertionCandidatesArtifact',
  promptPolicyId: 'paper-implementation.motive-decomposition.prompt-redaction.v1',
};

const DRAFT_ASSERTION_CANDIDATES_MODEL_OPTION_IDS = new Set([
  `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
  `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-quality`,
  `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-deep-reasoning`,
  `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.dashscope-thinking-budget`,
  `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.dashscope-budget`,
]);

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set<string>([
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  'MOTIVE_DECOMPOSITION_REQUIRED_REFS_MISSING',
  'MOTIVE_DECOMPOSITION_REVIEW_SET_MISMATCH',
  'MOTIVE_DECOMPOSITION_REF_MISMATCH',
  'MOTIVE_DECOMPOSITION_RESULT_STATUS_INVALID',
  'MOTIVE_DECOMPOSITION_DECOMPOSITION_CHECK_MISSING',
  'MOTIVE_DECOMPOSITION_NEW_CLAIM_GATE_MISSING',
  'MOTIVE_DECOMPOSITION_BOUNDARY_BLOCKER_MISSING',
  'MOTIVE_DECOMPOSITION_SIDE_EFFECT_GUARD_MISSING',
  'MOTIVE_DECOMPOSITION_AUTHORITY_FIELD_PRESENT',
]);

const FORBIDDEN_AUTHORITY_FIELDS = [
  'implementation_project_id',
  'runtime_artifact_id',
  'agent_workflow_harness_run_id',
  'implementation_proposal_artifact',
  'source_assertion_reviews',
  'assertion_id',
  'candidate_assertion_ref',
  'create_motive_assertion_input',
  'CreateMotiveAssertionInput',
  'motive_assertion_create_request',
  'core_motive_version_patch',
  'motive_evolution_decision_request',
  'domain_gate_request',
  'queue_action',
  'board_draft',
  'board_summary',
  'board_state',
  'bindings',
  'create_board_request',
  'create_motive_evidence_board_version_request',
  'create_evidence_binding_request',
  'evidence_binding_id',
  'trace_repair_queue_item',
  'rendered_prompt_text',
  'raw_provider_output',
  'raw_provider_response',
  'hidden_reasoning',
] as const;

const FORBIDDEN_PRIMARY_REF_TYPES = new Set([
  'agent_workflow_harness_run',
  'implementation_proposal_artifact',
  'paper_implementation_proposal_artifact',
  'decision_work_queue_item',
  'trace_repair_queue_item',
]);

export class PaperImplementationMotiveDecompositionRuntimeService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationMotiveDecompositionAgentOrchestrator;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runDraftAssertionCandidates(
    implementationProjectId: string,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): Promise<PaperImplementationMotiveDecompositionRuntimeResult> {
    this.assertRequest(request);
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    const profile = DRAFT_ASSERTION_CANDIDATES_PROFILE;
    const runId = request.run_id?.trim() || this.idFactory('pi_motive_decomposition_runtime_run');
    const runtimeBase = this.runtimeBase(profile, implementationProjectId, request, runId);
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    const preflightBlockerCodes = this.uniqueStrings([
      ...(request.preflight_blocker_codes ?? []),
      ...this.requestBoundaryBlockerCodes(request),
    ]);

    // S2-C C3 (review F5/N6): preflight blockers land as a reviewable blocked
    // final that admission records as admitted — unified with the other slots
    // (route/skeptic/cycle/feasibility/cross-board), no more failed_runtime
    // preflight terminal without a final artifact.
    if (preflightBlockerCodes.length > 0) {
      const preflight = await this.recordPreflightBlockedArtifact(runtimeBase, request, preflightBlockerCodes);
      artifacts.push(preflight.artifact);
      admissions.push(preflight.admission);
      const final = await this.recordFinalArtifact(runtimeBase, request, {
        roleArtifact: preflight,
        status: 'blocked',
        runtimeFailureCode: null,
        providerCallCount: 0,
        blockerCodes: preflightBlockerCodes,
        warningCodes: [],
      });
      artifacts.push(final.artifact);
      admissions.push(final.admission);
      return this.result(runtimeBase, 'blocked', 0, artifacts, admissions, final.artifact, final.admission);
    }

    const roleInvocation = await this.invokeRoleWithBoundedRetry(runtimeBase, request);
    const roleArtifact = await this.recordRoleArtifact(runtimeBase, request, roleInvocation);
    artifacts.push(roleArtifact.artifact);
    admissions.push(roleArtifact.admission);

    if (
      roleArtifact.admission.admission_status !== 'admitted'
      || roleArtifact.artifact.runtime_status === 'failed_runtime'
    ) {
      return this.result(
        runtimeBase,
        'failed_runtime',
        this.totalProviderCalls(artifacts),
        artifacts,
        admissions,
        null,
        null,
      );
    }

    const blockerCodes = this.outputBlockerCodes(roleArtifact.output, roleArtifact.artifact.blocker_codes);
    const warningCodes = this.outputWarningCodes(roleArtifact.output, roleArtifact.artifact.warning_codes);
    const finalStatus = blockerCodes.length > 0 || roleArtifact.output?.role_status === 'blocked'
      ? 'blocked'
      : 'passed';
    const final = await this.recordFinalArtifact(runtimeBase, request, {
      roleArtifact,
      status: finalStatus,
      runtimeFailureCode: null,
      providerCallCount: roleArtifact.artifact.provider_call_count,
      blockerCodes,
      warningCodes,
    });
    artifacts.push(final.artifact);
    admissions.push(final.admission);
    return this.result(
      runtimeBase,
      finalStatus,
      final.artifact.provider_call_count,
      artifacts,
      admissions,
      final.artifact,
      final.admission,
    );
  }

  private async invokeRoleWithBoundedRetry(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): Promise<RoleInvocationOutcome> {
    let providerCallCount = 0;
    for (let retryAttemptIndex = 0; retryAttemptIndex <= MAX_TECHNICAL_RETRY_ATTEMPT_INDEX; retryAttemptIndex += 1) {
      const result = await this.invokeRole(runtimeBase, request, retryAttemptIndex);
      providerCallCount += this.providerCallCount(result);
      const runtimeFailureCode = this.roleInvocationFailureCode(request, result);
      const shouldRetry = request.execution_mode === 'provider_llm'
        && retryAttemptIndex < MAX_TECHNICAL_RETRY_ATTEMPT_INDEX
        && runtimeFailureCode !== null
        && RETRYABLE_RUNTIME_FAILURE_CODES.has(runtimeFailureCode);
      if (!shouldRetry) {
        return { result, retryAttemptIndex, providerCallCount };
      }
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'Motive-decomposition runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    retryAttemptIndex: number,
  ): Promise<TopicSelectionAgentInvocationResult<PaperImplementationMotiveDecompositionRoleOutput>> {
    const output = this.fixtureOutputForMode(request);
    const messages = this.roleMessages(runtimeBase, request);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(runtimeBase.profile.roleSlotId)}.call-1`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    return this.agentOrchestrator.invokeStructuredOutput<PaperImplementationMotiveDecompositionRoleOutput>({
      title_card_id: runtimeBase.titleCardId,
      feature_id: 'paper_implementation',
      node_id: runtimeBase.profile.roleSlotId,
      workflow_run_id: runtimeBase.runId,
      node_attempt_id: `${runtimeBase.runId}.${this.safeId(runtimeBase.profile.roleSlotId)}.attempt-0`,
      invocation_attempt_id: invocationAttemptId,
      execution_mode: request.execution_mode,
      executor_kind: 'single_agent',
      run_mode: this.topicRunMode(request.run_mode),
      profile_id: runtimeBase.modelProfileId,
      output_contract: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: runtimeBase.profile.promptTemplateId,
        version: runtimeBase.profile.promptTemplateVersion,
      },
      prompt_variant_key: runtimeBase.profile.promptVariantId,
      schema_name: 'paper_implementation_motive_decomposition_role_output',
      schema: paperImplementationMotiveDecompositionRoleOutputSchema as unknown as Record<string, unknown>,
      messages,
      input_refs: this.primaryInputRefs(request),
      context_packet_refs: [{
        ref_type: 'artifact_ref',
        ref_id: `${runtimeBase.runId}.source-bundle`,
        title_card_id: runtimeBase.titleCardId,
      }],
      context_packet_hashes: [runtimeBase.sourceHashBundleHash],
      runtime_token_budget: this.runtimeTokenBudget(runtimeBase, request, messages),
      debate_extension: null,
      mocked_output: request.execution_mode === 'mocked_llm' && output
        ? {
          fixture_id: `${runtimeBase.runId}.${this.safeId(runtimeBase.profile.roleSlotId)}.fixture`,
          output,
          mock_profile: runtimeBase.profile.slotId,
        }
        : null,
      codex_response: request.execution_mode === 'codex_assisted' && output
        ? {
          output,
          operator_label: 'codex-local',
          response_source: 'operator_supplied',
        }
        : null,
      created_by: this.createdBy(request.execution_mode),
    });
  }

  private async recordPreflightBlockedArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    blockerCodes: string[],
  ): Promise<RecordedRuntimeArtifact> {
    const runtimeControl: RuntimeControl = {
      terminal_code: 'preflight_blocked',
      reason_kind: 'missing_or_invalid_required_refs',
      details: { blocker_codes: blockerCodes },
    };
    // S2-C C3: the preflight terminal is a blocked (admitted) role output, not
    // a failed_runtime artifact — unified preflight semantics across slots.
    const output: PaperImplementationMotiveDecompositionRoleOutput = {
      role_slot_id: runtimeBase.profile.roleSlotId,
      role_status: 'blocked',
      summary: 'Deterministic motive-decomposition preflight found blockers before provider execution.',
      cited_source_refs: [...request.source_refs],
      decomposition_result_status: 'blocked',
      reviewed_assertion_refs: [],
      draft_assertion_candidates: [],
      blocker_codes: blockerCodes,
      warning_codes: [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_motive_write_side_effect: true,
      no_motive_evolution_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_trace_repair_queue_side_effect: true,
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output, runtimeControl);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: runtimeBase.profile.roleSlotId,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: 'preflight_blocked',
      promptPacketHash: this.hash({
        run_id: runtimeBase.runId,
        role_slot_id: runtimeBase.profile.roleSlotId,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      }),
      promptVariantId: 'deterministic-preflight',
      runtimeStatus: 'blocked',
      runtimeFailureCode: null,
      providerCallCount: 0,
      blockerCodes,
      warningCodes: [],
      output,
      artifactPayload,
      priorRoleArtifacts: [],
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(artifact);
    const admission = await this.admit(stored, 'role');
    return { artifact: stored, admission, output };
  }

  private async recordRoleArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    roleInvocation: RoleInvocationOutcome,
  ): Promise<RecordedRuntimeArtifact> {
    const roleResult = roleInvocation.result;
    const output = roleResult.structured_output;
    const runtimeFailureCode = this.roleInvocationFailureCode(request, roleResult);
    const runtimeStatus = runtimeFailureCode
      ? 'failed_runtime'
      : output?.role_status === 'blocked' ? 'blocked' : 'passed';
    const runtimeControl = runtimeFailureCode
      ? this.runtimeControlForFailure(runtimeFailureCode, {
        retry_attempt_index: roleInvocation.retryAttemptIndex,
      })
      : null;
    const artifactOutput = runtimeFailureCode
      ? {
        status: 'failed_runtime',
        error_code: runtimeFailureCode,
        blocker_codes: [runtimeFailureCode],
      }
      : output ?? {
        status: 'failed_runtime',
        error_code: 'AGENT_EXECUTION_FAILED',
        blocker_codes: roleResult.blocker_codes,
      };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, artifactOutput, runtimeControl);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: runtimeBase.profile.roleSlotId,
      callIndex: 1,
      executorKind: runtimeBase.profile.roleExecutorKind,
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: runtimeBase.profile.roleSlotId,
      promptPacketHash: roleResult.provenance.prompt_packet_hash,
      promptVariantId: runtimeBase.profile.promptVariantId,
      runtimeStatus,
      runtimeFailureCode,
      retryAttemptIndex: roleInvocation.retryAttemptIndex,
      providerCallCount: roleInvocation.providerCallCount,
      blockerCodes: runtimeFailureCode ? [runtimeFailureCode] : this.outputBlockerCodes(output, []),
      warningCodes: this.uniqueStrings([
        ...(output ? this.outputWarningCodes(output, []) : roleResult.warning_codes),
        ...this.retryWarningCodes(roleInvocation, runtimeFailureCode),
      ]),
      output: artifactOutput,
      artifactPayload,
      priorRoleArtifacts: [],
      modelOptionId: roleResult.provenance.model_option_id,
      responseReuseRef: roleResult.provenance.response_reuse_ref,
      responseHash: roleResult.provenance.structured_output_hash,
      tokenBudgetGateResult: roleResult.token_budget_gate_result,
      promptPacketCacheStatus: roleResult.provenance.prompt_packet_cache_status,
      promptPacketCacheResultRef: roleResult.provenance.prompt_packet_cache_result_ref,
      promptPacketCacheResultHash: roleResult.provenance.prompt_packet_cache_result_hash,
      compressionReportRef: roleResult.provenance.compression_report_ref,
      compressionReportHash: roleResult.provenance.compression_report_hash,
      compressedContextHash: roleResult.provenance.compressed_context_hash,
      auditHash: this.hash(roleResult.audit_snapshot),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(artifact);
    const admission = await this.admit(stored, 'role');
    return { artifact: stored, admission, output: runtimeFailureCode ? null : output ?? null };
  }

  private async recordFinalArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    input: {
      roleArtifact: RecordedRuntimeArtifact;
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      providerCallCount: number;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): Promise<{ artifact: PaperImplementationRuntimeArtifactEnvelope; admission: PaperImplementationRuntimeAdmissionRecord }> {
    const finalPayload = this.finalPayload(runtimeBase, request, input);
    const finalArtifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'final',
      roleSlotId: null,
      callIndex: null,
      executorKind: runtimeBase.profile.roleExecutorKind,
      artifactContractId: runtimeBase.profile.artifactContractId,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_FINAL_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.finalArtifactRefType,
      artifactPayloadSeed: 'final',
      promptPacketHash: input.roleArtifact.artifact.prompt_packet_hash,
      promptVariantId: 'final',
      runtimeStatus: input.status,
      runtimeFailureCode: input.runtimeFailureCode,
      retryAttemptIndex: 0,
      providerCallCount: input.providerCallCount,
      blockerCodes: input.blockerCodes,
      warningCodes: input.warningCodes,
      output: finalPayload,
      artifactPayload: finalPayload as unknown as Record<string, unknown>,
      priorRoleArtifacts: [input.roleArtifact],
      finalArtifactHash: this.hash(finalPayload),
      finalArtifactRefType: runtimeBase.profile.finalArtifactRefType,
      modelOptionId: input.roleArtifact.artifact.model_option_id ?? runtimeBase.modelOptionId,
      auditHash: this.hash({
        run_id: runtimeBase.runId,
        final_payload_hash: this.hash(finalPayload),
        role_artifact_hash: input.roleArtifact.artifact.artifact_payload_hash,
      }),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(finalArtifact);
    const admission = await this.admit(stored, 'final');
    return { artifact: stored, admission };
  }

  private buildRuntimeArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    input: BuildArtifactInput,
  ): PaperImplementationRuntimeArtifactEnvelope {
    const artifactPayload = this.jsonSafeObject(input.artifactPayload);
    const payloadHash = this.hash(artifactPayload);
    const promptPacketHash = input.promptPacketHash;
    const promptPacketRef = this.ref('runtime_prompt_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.prompt`, request);
    const contextPacketHash = this.hash({
      run_id: runtimeBase.runId,
      role_slot_id: input.roleSlotId,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      prior_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
    });
    const runtimeIdentity = {
      // S2-C C2: run_id pins the identity granularity explicitly to one runtime
      // run — replaying the same run_id (idempotent double-submit) collides on
      // the runtimeIdentityHash unique constraint (409), while a legitimate
      // re-advance/new run always carries a fresh run_id and never collides.
      run_id: runtimeBase.runId,
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: runtimeBase.profile.workflowType,
      slot_id: runtimeBase.profile.slotId,
      decomposition_mode: request.decomposition_mode,
      artifact_scope: input.artifactScope,
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      target_ref: request.target_ref,
      target_motive_ref: request.target_motive_ref,
      target_core_motive_version_ref: request.target_core_motive_version_ref,
      target_assertion_refs: request.target_assertion_refs,
      prompt_packet_hash: promptPacketHash,
      output_schema_id: input.outputSchemaId,
      execution_mode: request.execution_mode,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
    };
    const runtimeIdentityHash = this.hash(runtimeIdentity);
    const artifactPayloadRef = this.ref(
      input.artifactPayloadRefType,
      `${runtimeBase.runId}.${this.safeId(input.artifactPayloadSeed)}`,
      request,
      payloadHash,
    );
    const finalArtifactRef = input.artifactScope === 'final'
      ? this.ref(
        input.finalArtifactRefType ?? input.artifactPayloadRefType,
        `${runtimeBase.runId}.final`,
        request,
        input.finalArtifactHash ?? payloadHash,
      )
      : null;
    const tokenBudgetGateResult = input.tokenBudgetGateResult ?? {
      runtime_gate_status: 'not_applicable',
      role_slot_id: input.roleSlotId,
      context_packet_hash: contextPacketHash,
      prompt_packet_hash: promptPacketHash,
    };
    const tokenBudgetHash = this.hash(tokenBudgetGateResult);
    const promptPacketCacheStatus = this.promptPacketCacheStatus(input.promptPacketCacheStatus);
    const compressionApplied = Boolean(input.compressionReportRef && input.compressionReportHash && input.compressedContextHash);
    const artifactWithoutIdentity: Omit<PaperImplementationRuntimeArtifactEnvelope, 'artifact_identity_hash'> = {
      schema_version: PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
      runtime_artifact_id: this.idFactory(`pi_runtime_${input.artifactScope}`),
      runtime_identity_hash: runtimeIdentityHash,
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: runtimeBase.profile.workflowType as PaperImplementationAgentWorkflowType,
      slot_id: runtimeBase.profile.slotId,
      artifact_scope: input.artifactScope,
      artifact_contract_id: input.artifactContractId,
      artifact_contract_version: input.artifactContractVersion,
      target_ref: request.target_ref,
      target_version_id: request.target_version_id ?? null,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      created_by: this.createdBy(request.execution_mode),
      created_at: this.now(),
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      prior_role_artifact_refs: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_ref),
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      role_chain_hash: this.hash(input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash)),
      final_artifact_ref: finalArtifactRef,
      final_artifact_hash: input.artifactScope === 'final' ? input.finalArtifactHash ?? payloadHash : null,
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      executor_kind: input.executorKind,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      runtime_status: input.runtimeStatus,
      runtime_failure_code: input.runtimeFailureCode,
      retry_attempt_index: input.retryAttemptIndex ?? 0,
      provider_call_count: input.providerCallCount,
      response_reuse_status: this.responseReuseStatus(request.execution_mode, input.responseReuseRef),
      response_reuse_decision_ref: input.responseReuseRef
        ? this.ref('response_reuse_decision', input.responseReuseRef, request)
        : null,
      response_reuse_decision_hash: input.responseReuseRef ? this.hash(input.responseReuseRef) : null,
      allowed_side_effects: [],
      retrieval_packet_ref: null,
      retrieval_packet_hash: null,
      reviewed_statement_packet_ref: null,
      reviewed_statement_packet_hash: null,
      context_packet_ref: this.ref('runtime_context_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.context`, request),
      context_packet_hash: contextPacketHash,
      runtime_invocation_context_hash: this.hash(runtimeIdentity),
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      cache_policy_profile_hash: runtimeBase.cachePolicyProfileHash,
      source_refs: [...request.source_refs],
      source_hashes: [...request.source_hashes],
      prompt_packet_ref: promptPacketRef,
      prompt_packet_hash: promptPacketHash,
      prompt_template_id: runtimeBase.profile.promptTemplateId,
      prompt_template_version_id: runtimeBase.profile.promptTemplateVersion,
      prompt_variant_id: input.promptVariantId,
      prompt_redaction_policy_hash: runtimeBase.promptRedactionPolicyHash,
      output_schema_id: input.outputSchemaId,
      context_cache_key_hash: this.hash({
        cache: 'context',
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      }),
      context_cache_status: 'miss',
      context_cache_result_ref: null,
      context_cache_result_hash: null,
      prompt_packet_cache_key_hash: this.hash({
        cache: 'prompt',
        prompt_packet_hash: promptPacketHash,
        role_slot_id: input.roleSlotId,
      }),
      prompt_packet_cache_status: promptPacketCacheStatus,
      prompt_packet_cache_result_ref: input.promptPacketCacheResultRef ?? null,
      prompt_packet_cache_result_hash: input.promptPacketCacheResultHash ?? null,
      token_budget_gate_result_ref: this.ref(
        'token_budget_gate_result',
        `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.token-budget`,
        request,
        tokenBudgetHash,
      ),
      token_budget_gate_result_hash: tokenBudgetHash,
      compression_policy_profile_hash: runtimeBase.compressionPolicyProfileHash,
      compression_status: compressionApplied ? 'applied' : 'not_needed',
      compression_report_ref: input.compressionReportRef ?? null,
      compression_report_hash: input.compressionReportHash ?? null,
      compressed_context_packet_ref: input.compressedContextHash
        ? this.ref('compressed_context_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.compressed-context`, request, input.compressedContextHash)
        : null,
      compressed_context_packet_hash: input.compressedContextHash ?? null,
      artifact_payload: artifactPayload,
      artifact_payload_ref: artifactPayloadRef,
      artifact_payload_hash: payloadHash,
      output_hash: input.responseHash ?? payloadHash,
      runtime_audit_ref: this.ref('runtime_audit_envelope', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.audit`, request),
      runtime_audit_hash: input.auditHash ?? this.hash({ runtime_identity: runtimeIdentityHash, payload_hash: payloadHash }),
      blocker_codes: this.uniqueStrings(input.blockerCodes),
      warning_codes: this.uniqueStrings(input.warningCodes),
    };
    return {
      ...artifactWithoutIdentity,
      artifact_identity_hash: this.hash(artifactWithoutIdentity),
    };
  }

  private finalPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    input: {
      roleArtifact: RecordedRuntimeArtifact;
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): PaperImplementationMotiveDecompositionArtifact {
    const roleArtifact = input.roleArtifact.artifact;
    const roleOutput = input.roleArtifact.output;
    const admittedRoleRef = input.roleArtifact.admission.admitted_artifact_ref;
    const admittedRoleHash = input.roleArtifact.admission.admitted_artifact_hash;
    return {
      status: input.status,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      decomposition_mode: request.decomposition_mode,
      target_ref: request.target_ref,
      target_motive_ref: request.target_motive_ref,
      target_core_motive_version_ref: request.target_core_motive_version_ref,
      target_assertion_refs: [...request.target_assertion_refs],
      preflight_blockers: this.uniqueStrings(request.preflight_blocker_codes ?? []),
      decomposition_result_status: roleOutput?.decomposition_result_status ?? 'blocked',
      role_summary: roleOutput?.summary ?? null,
      role_blocker_codes: roleOutput?.blocker_codes ?? [],
      role_warning_codes: roleOutput?.warning_codes ?? [],
      blockers: this.uniqueStrings(input.blockerCodes),
      warnings: this.uniqueStrings(input.warningCodes),
      runtime_failure_code: input.runtimeFailureCode,
      reviewed_assertion_refs: roleOutput?.reviewed_assertion_refs ?? [],
      draft_assertion_candidates: roleOutput?.draft_assertion_candidates ?? [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_motive_write_side_effect: true,
      no_motive_evolution_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_trace_repair_queue_side_effect: true,
      role_artifact_refs: [roleArtifact.artifact_payload_ref],
      role_artifact_hashes: [roleArtifact.artifact_payload_hash],
      admitted_role_artifact_refs: admittedRoleRef ? [admittedRoleRef] : [],
      admitted_role_artifact_hashes: admittedRoleHash ? [admittedRoleHash] : [],
      role_prompt_packet_refs: [roleArtifact.prompt_packet_ref],
      role_prompt_packet_hashes: [roleArtifact.prompt_packet_hash],
      role_token_budget_gate_result_refs: [roleArtifact.token_budget_gate_result_ref],
      role_compression_report_refs: roleArtifact.compression_report_ref ? [roleArtifact.compression_report_ref] : [],
      runtime_identity: {
        run_id: runtimeBase.runId,
        slot_id: runtimeBase.profile.slotId,
        decomposition_mode: request.decomposition_mode,
        role_artifact_hash: roleArtifact.artifact_payload_hash,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      },
      cache_identity: {
        context_cache_key_hashes: [roleArtifact.context_cache_key_hash],
        prompt_packet_cache_key_hashes: [roleArtifact.prompt_packet_cache_key_hash],
      },
      source_refs: [...request.source_refs],
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
    };
  }

  private async admit(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admissionScope: 'role' | 'final',
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    const base = {
      implementation_project_id: artifact.implementation_project_id,
      runtime_artifact_id: artifact.runtime_artifact_id,
      admission_policy_id: admissionScope === 'final'
        ? `paper-implementation.${artifact.slot_id}.final-admission`
        : `paper-implementation.${artifact.slot_id}.role-admission`,
      admission_policy_version: 'v1',
      expected_runtime_identity_hash: artifact.runtime_identity_hash,
      expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
      expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
      expected_prompt_packet_hash: artifact.prompt_packet_hash,
      expected_output_schema_id: artifact.output_schema_id,
      expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    };
    if (admissionScope === 'final') {
      if (!artifact.final_artifact_hash) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Final runtime artifact is missing final_artifact_hash.');
      }
      return this.runtimeAdmission.admitRuntimeArtifact({
        ...base,
        admission_scope: 'final',
        expected_final_artifact_hash: artifact.final_artifact_hash,
      });
    }
    return this.runtimeAdmission.admitRuntimeArtifact({
      ...base,
      admission_scope: 'role',
      expected_final_artifact_hash: null,
    });
  }

  private runtimeBase(
    profile: SlotProfile,
    implementationProjectId: string,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    runId: string,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile(profile);
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const sourceHashBundleHash = this.hash({
      decomposition_mode: request.decomposition_mode,
      target_ref: request.target_ref,
      target_motive_ref: request.target_motive_ref,
      target_core_motive_version_ref: request.target_core_motive_version_ref,
      target_assertion_refs: request.target_assertion_refs,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      assertion_context_packets: request.assertion_context_packets,
      trace_manifest_refs: request.trace_manifest_refs,
      trace_manifest_hashes: request.trace_manifest_hashes,
      source_locator_refs: request.source_locator_refs,
      citation_candidate_refs: request.citation_candidate_refs,
      evidence_refs: request.evidence_refs,
      accepted_risk_refs: request.accepted_risk_refs ?? [],
      admitted_upstream_artifact_refs: request.admitted_upstream_artifact_refs ?? [],
      admitted_upstream_artifact_hashes: request.admitted_upstream_artifact_hashes ?? [],
    });
    return {
      implementationProjectId,
      runId,
      titleCardId: this.titleCardId(request),
      profile,
      sourceHashBundleHash,
      modelProfileId: request.model_profile_id?.trim() || profile.profileId,
      modelOptionId: request.execution_mode === 'provider_llm'
        ? request.model_option_id?.trim() || null
        : null,
      contextPolicyProfile,
      contextPolicyProfileHash,
      cachePolicyProfileHash: this.hash(contextPolicyProfile.cache_policy),
      promptRedactionPolicyHash: this.hash({
        policy_id: profile.promptPolicyId,
        store_rendered_prompt: false,
      }),
      compressionPolicyProfileHash: this.hash(contextPolicyProfile.compression_policy),
    };
  }

  private roleMessages(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Return only structured JSON for PaperImplementation motive decomposition draft assertion candidate generation.',
          'Use request-owned refs as the only authority and preserve target assertion, evidence, source locator, citation candidate, trace, and source refs exactly.',
          'Produce draft assertion candidates only; candidate keys are runtime-local and are not persisted motive assertion ids.',
          'Flag new-claim risk with human confirmation or motive evolution review. Do not write motive assertions, evolve motive versions, create evidence bindings, enqueue trace repair, request Domain Gate, persist prompt text, or include raw provider output.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          slot_id: runtimeBase.profile.slotId,
          role_slot_id: runtimeBase.profile.roleSlotId,
          decomposition_mode: request.decomposition_mode,
          target_ref: request.target_ref,
          target_motive_ref: request.target_motive_ref,
          target_core_motive_version_ref: request.target_core_motive_version_ref,
          target_assertion_refs: request.target_assertion_refs,
          input_snapshot_ref: request.input_snapshot_ref,
          input_snapshot_hash: request.input_snapshot_hash,
          source_refs: request.source_refs,
          source_hashes: request.source_hashes,
          assertion_context_packets: request.assertion_context_packets,
          trace_manifest_refs: request.trace_manifest_refs,
          trace_manifest_hashes: request.trace_manifest_hashes,
          source_locator_refs: request.source_locator_refs,
          citation_candidate_refs: request.citation_candidate_refs,
          evidence_refs: request.evidence_refs,
          accepted_risk_refs: request.accepted_risk_refs ?? [],
          admitted_upstream_artifact_refs: request.admitted_upstream_artifact_refs ?? [],
          admitted_upstream_artifact_hashes: request.admitted_upstream_artifact_hashes ?? [],
          source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
        }),
      },
    ];
  }

  // S2-A / PC-S4 boundary note: the motive slots are documented-as-within-budget —
  // their expected product inputs (assertion refs + bounded assertion context
  // packets) sit well inside the 30k input target, so the caller-side compression
  // attempt (PC-S1..S3) is deliberately NOT wired here. NOTE the request DOES carry
  // an `assertion_context_packets` body face; if product telemetry ever shows this
  // slot hitting `TOKEN_BUDGET_REQUIRES_COMPRESSION`, wire the shared
  // `buildPaperImplementationCompressionAttempt` builder exactly like the six packet
  // slots. Until then over-budget stays fail-closed
  // (L5 `motive_decomposition_over_budget_zero_provider_calls`). The N3 token
  // double-count fix below applies here regardless.
  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      // N3 double-count fix: the request body (incl. assertion_context_packets) is
      // already embedded verbatim in `messages`; context_payloads must not re-carry
      // the same content — the estimate below is the single source of truth.
      context_payloads: [],
      extra_payloads: [{
        slot_id: runtimeBase.profile.slotId,
        role_slot_id: runtimeBase.profile.roleSlotId,
        assertion_ref_count: request.target_assertion_refs.length,
        assertion_context_packet_count: request.assertion_context_packets.length,
        source_locator_ref_count: request.source_locator_refs.length,
        citation_candidate_ref_count: request.citation_candidate_refs.length,
        evidence_ref_count: request.evidence_refs.length,
      }],
      estimated_input_tokens_override: this.estimatedInputTokens({ messages }),
      schema_overhead_tokens_override: 1_500,
    };
  }

  private contextPolicyProfile(profile: SlotProfile): TopicSelectionContextPolicyProfile {
    return {
      schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
      context_policy_profile_id: profile.contextPolicyId,
      context_policy_profile_version: 'v1',
      invocation_slot_id: profile.slotId,
      functional_template: 'delegated_payload_candidate',
      execution_modifiers: [
        'provider_required_live',
        'codex_exact_reuse_allowed',
        'mock_replay_allowed',
        'compression_allowed_with_quality_gate',
      ],
      context_family: 'paper_implementation_motive_decomposition',
      allowed_source_kinds: [
        'authority_record',
        'ref_backed_artifact',
        'prior_llm_output',
      ],
      memory_policy: {
        allowed_memory_families: [],
        required_use_labels: [],
        stale_behavior: 'block',
        missing_required_memory_behavior: 'allow',
        durable_memory_as_standalone_evidence: false,
      },
      compression_policy: {
        compression_mode: 'required_when_over_budget',
        allowed_executor_kinds: ['deterministic_structural', 'codex_assisted'],
        compression_strategy_id: `${profile.slotId}.context-compression`,
        compression_strategy_version: 'v1',
        preserved_fact_kinds: [
          'target_motive_ref',
          'core_motive_version_ref',
          'motive_assertion_ref',
          'assertion_context_packet_ref',
          'assertion_context_packet_hash',
          'assertion_hash',
          'evidence_ref',
          'trace_manifest_ref',
          'trace_manifest_hash',
          'source_locator_ref',
          'citation_candidate_ref',
          'accepted_risk_ref',
          'human_confirmation_marker',
          'blocker_code',
        ],
        forbidden_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
          'memo_like_evidence',
        ],
        quality_gate_required: true,
      },
      cache_policy: {
        cache_enabled: true,
        cache_scope: 'context_identity_preprocessing',
        exact_key_fields: [
          'source_hash_bundle_hash',
          'prompt_variant_id',
          'model_profile_id',
          'model_option_id',
          'context_policy_profile_hash',
        ],
        stale_behavior: 'block',
        post_cache_gates: [
          'schema_validation',
          'runtime_admission',
          'authority_boundary',
        ],
      },
      token_budget_policy: {
        estimated_input_token_target: 30_000,
        estimated_output_token_budget: 4_096,
        context_window_tokens: 128_000,
        token_estimate_safety_margin: 1.25,
        unknown_estimate_behavior: 'blocked_over_budget',
      },
      reuse_policy: {
        provider_llm_response_reuse: 'blocked',
        codex_exact_reuse_requires_approval: true,
        mock_replay_allowed: true,
        provider_required_live_behavior: 'live_call_required',
      },
      post_reuse_gates: [
        'schema_validation',
        'runtime_admission',
        'authority_boundary',
      ],
      provenance_policy: {
        runtime_audit_envelope_required: true,
        operator_audit_summary_required: false,
        human_trust_summary_required: false,
        forbidden_persisted_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
        ],
      },
      redaction_policy: `${profile.slotId}.redaction.v1`,
    };
  }

  private roleArtifactPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    output: unknown,
    runtimeControl: RuntimeControl | null,
  ): Record<string, unknown> {
    return {
      artifact_kind: `${runtimeBase.profile.slotId}.role_artifact_payload`,
      decomposition_mode: request.decomposition_mode,
      target_ref: request.target_ref,
      target_motive_ref: request.target_motive_ref,
      target_core_motive_version_ref: request.target_core_motive_version_ref,
      target_assertion_refs: request.target_assertion_refs,
      source_refs: request.source_refs,
      assertion_context_packets: request.assertion_context_packets,
      trace_manifest_refs: request.trace_manifest_refs,
      source_locator_refs: request.source_locator_refs,
      citation_candidate_refs: request.citation_candidate_refs,
      evidence_refs: request.evidence_refs,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      runtime_control: runtimeControl,
      role_output: output,
    };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): PaperImplementationMotiveDecompositionRoleOutput | null {
    if (request.execution_mode === 'mocked_llm') {
      return request.mocked_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID] ?? null;
    }
    if (request.execution_mode === 'codex_assisted') {
      return request.codex_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID] ?? null;
    }
    return null;
  }

  private assertRequest(request: RunPaperImplementationMotiveDecompositionRuntimeRequest): void {
    if (request.source_refs.length !== request.source_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_refs and source_hashes must have the same length.');
    }
    if (request.trace_manifest_refs.length !== request.trace_manifest_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'trace_manifest_refs and trace_manifest_hashes must have the same length.');
    }
    const admittedRefsLength = request.admitted_upstream_artifact_refs?.length ?? 0;
    const admittedHashesLength = request.admitted_upstream_artifact_hashes?.length ?? 0;
    if ((admittedRefsLength > 0 || admittedHashesLength > 0) && admittedRefsLength !== admittedHashesLength) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admitted_upstream_artifact_refs and admitted_upstream_artifact_hashes must have the same length.');
    }
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== DRAFT_ASSERTION_CANDIDATES_PROFILE.profileId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${DRAFT_ASSERTION_CANDIDATES_PROFILE.profileId}.`,
      );
    }
    if (request.execution_mode !== 'provider_llm' && request.model_option_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires execution_mode=provider_llm.');
    }
    if (
      request.execution_mode === 'provider_llm'
      && (this.hasRoleOutputs(request.mocked_role_outputs) || this.hasRoleOutputs(request.codex_role_outputs))
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs.',
      );
    }
    const requestedModelOptionId = request.model_option_id?.trim() || null;
    if (
      request.execution_mode === 'provider_llm'
      && requestedModelOptionId
      && !DRAFT_ASSERTION_CANDIDATES_MODEL_OPTION_IDS.has(requestedModelOptionId)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must be defined by runtime slot profile ${DRAFT_ASSERTION_CANDIDATES_PROFILE.profileId}.`,
      );
    }
    if (
      request.execution_mode === 'mocked_llm'
      && !request.mocked_role_outputs?.[DRAFT_ASSERTION_CANDIDATES_PROFILE.roleSlotId]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_role_outputs.${DRAFT_ASSERTION_CANDIDATES_PROFILE.roleSlotId} is required.`);
    }
    if (
      request.execution_mode === 'codex_assisted'
      && !request.codex_role_outputs?.[DRAFT_ASSERTION_CANDIDATES_PROFILE.roleSlotId]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_role_outputs.${DRAFT_ASSERTION_CANDIDATES_PROFILE.roleSlotId} is required.`);
    }
    if (this.hasForbiddenAuthorityField(request)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'motive_decomposition runtime request must not include production authority or raw-provider fields.');
    }
    const forbiddenPrimaryRef = this.primaryInputRefs(request).find((ref) => FORBIDDEN_PRIMARY_REF_TYPES.has(ref.ref_type));
    if (forbiddenPrimaryRef) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `motive_decomposition forbids primary input ref_type=${forbiddenPrimaryRef.ref_type}.`,
      );
    }
  }

  private hasRoleOutputs(
    outputs: RunPaperImplementationMotiveDecompositionRuntimeRequest['mocked_role_outputs']
      | RunPaperImplementationMotiveDecompositionRuntimeRequest['codex_role_outputs'],
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private requestBoundaryBlockerCodes(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): string[] {
    const blockers: string[] = [];
    if (this.hasMemoLikeRefs(this.primaryInputRefs(request))) {
      blockers.push('MOTIVE_DECOMPOSITION_MEMO_LIKE_REF_REJECTED');
    }
    blockers.push(...this.assertionContextPacketBlockerCodes(request));
    return this.uniqueStrings(blockers);
  }

  private assertionContextPacketBlockerCodes(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): string[] {
    const blockers: string[] = [];
    const assertionKeys = new Set(request.target_assertion_refs.map((ref) => this.refKey(ref)));
    const evidenceKeys = new Set(request.evidence_refs.map((ref) => this.refKey(ref)));
    const traceManifestKeys = new Set(request.trace_manifest_refs.map((ref) => this.refKey(ref)));
    const sourceKeys = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    const coveredAssertionKeys = new Set<string>();
    for (const packet of request.assertion_context_packets) {
      const assertionKey = this.refKey(packet.assertion_ref);
      coveredAssertionKeys.add(assertionKey);
      if (!assertionKeys.has(assertionKey)) {
        blockers.push('MOTIVE_DECOMPOSITION_ASSERTION_CONTEXT_PACKET_REF_MISMATCH');
      }
      if (!this.hasAnyCoveredRef(packet)) {
        blockers.push('MOTIVE_DECOMPOSITION_ASSERTION_CONTEXT_PACKET_UNCOVERED');
      }
      if (
        !this.refsWithinSet(packet.covered_evidence_refs, evidenceKeys)
        || !this.refsWithinSet(packet.covered_trace_manifest_refs, traceManifestKeys)
        || !this.refsWithinSet(packet.covered_source_refs, sourceKeys)
      ) {
        blockers.push('MOTIVE_DECOMPOSITION_ASSERTION_CONTEXT_PACKET_REF_MISMATCH');
      }
    }
    if (![...assertionKeys].every((key) => coveredAssertionKeys.has(key))) {
      blockers.push('MOTIVE_DECOMPOSITION_ASSERTION_CONTEXT_PACKET_MISSING');
    }
    return this.uniqueStrings(blockers);
  }

  private hasAnyCoveredRef(packet: PaperImplementationMotiveDecompositionAssertionContextPacket): boolean {
    return (
      packet.covered_evidence_refs.length > 0
      || packet.covered_trace_manifest_refs.length > 0
      || packet.covered_source_refs.length > 0
    );
  }

  private primaryInputRefs(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      request.target_ref,
      request.target_motive_ref,
      request.target_core_motive_version_ref,
      ...request.target_assertion_refs,
      request.input_snapshot_ref,
      ...request.source_refs,
      ...request.trace_manifest_refs,
      ...request.source_locator_refs,
      ...request.citation_candidate_refs,
      ...request.evidence_refs,
      ...(request.accepted_risk_refs ?? []),
      ...(request.admitted_upstream_artifact_refs ?? []),
    ]);
  }

  private semanticOutputFailureCode(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    output: PaperImplementationMotiveDecompositionRoleOutput | null,
  ): string | null {
    if (!output) {
      return null;
    }
    if (this.hasForbiddenAuthorityField(output)) {
      return 'MOTIVE_DECOMPOSITION_AUTHORITY_FIELD_PRESENT';
    }
    if (output.role_slot_id !== DRAFT_ASSERTION_CANDIDATES_PROFILE.roleSlotId) {
      return 'MOTIVE_DECOMPOSITION_REF_MISMATCH';
    }
    const sourceKeys = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    if (!this.refsWithinSet(output.cited_source_refs, sourceKeys)) {
      return 'MOTIVE_DECOMPOSITION_REF_MISMATCH';
    }
    if (
      output.no_domain_gate_request !== true
      || output.no_queue_side_effect !== true
      || output.no_motive_write_side_effect !== true
      || output.no_motive_evolution_side_effect !== true
      || output.no_board_write_side_effect !== true
      || output.no_evidence_binding_side_effect !== true
      || output.no_trace_repair_queue_side_effect !== true
    ) {
      return 'MOTIVE_DECOMPOSITION_SIDE_EFFECT_GUARD_MISSING';
    }
    if (!this.sameFunctionalRefSet(output.reviewed_assertion_refs, request.target_assertion_refs)) {
      return 'MOTIVE_DECOMPOSITION_REVIEW_SET_MISMATCH';
    }
    const statusFailureCode = this.decompositionResultStatusFailureCode(output);
    if (statusFailureCode) {
      return statusFailureCode;
    }
    const candidateFailureCode = this.draftCandidateFailureCode(request, output.draft_assertion_candidates);
    if (candidateFailureCode) {
      return candidateFailureCode;
    }
    return null;
  }

  private decompositionResultStatusFailureCode(
    output: PaperImplementationMotiveDecompositionRoleOutput,
  ): string | null {
    if (
      output.decomposition_result_status === 'candidates_proposed'
      && (output.role_status !== 'passed' || output.draft_assertion_candidates.length === 0)
    ) {
      return 'MOTIVE_DECOMPOSITION_RESULT_STATUS_INVALID';
    }
    if (
      output.decomposition_result_status === 'no_decomposition_needed'
      && (
        output.role_status !== 'passed'
        || output.draft_assertion_candidates.length > 0
        || output.blocker_codes.length > 0
      )
    ) {
      return 'MOTIVE_DECOMPOSITION_RESULT_STATUS_INVALID';
    }
    if (
      output.decomposition_result_status === 'blocked'
      && (output.role_status !== 'blocked' || output.blocker_codes.length === 0)
    ) {
      return 'MOTIVE_DECOMPOSITION_RESULT_STATUS_INVALID';
    }
    return null;
  }

  private draftCandidateFailureCode(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    candidates: PaperImplementationMotiveDecompositionDraftAssertionCandidate[],
  ): string | null {
    const assertionKeys = new Set(request.target_assertion_refs.map((ref) => this.refKey(ref)));
    const evidenceKeys = new Set(request.evidence_refs.map((ref) => this.refKey(ref)));
    const sourceKeys = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    const sourceLocatorKeys = new Set(request.source_locator_refs.map((ref) => this.refKey(ref)));
    const citationCandidateKeys = new Set(request.citation_candidate_refs.map((ref) => this.refKey(ref)));
    const traceManifestKeys = new Set(request.trace_manifest_refs.map((ref) => this.refKey(ref)));
    for (const candidate of candidates) {
      if (!assertionKeys.has(this.refKey(candidate.source_assertion_ref))) {
        return 'MOTIVE_DECOMPOSITION_REF_MISMATCH';
      }
      if (
        !this.refsWithinSet(candidate.covered_evidence_refs, evidenceKeys)
        || !this.refsWithinSet(candidate.covered_source_refs, sourceKeys)
        || !this.refsWithinSet(candidate.covered_source_locator_refs, sourceLocatorKeys)
        || !this.refsWithinSet(candidate.covered_citation_candidate_refs, citationCandidateKeys)
        || !this.refsWithinSet(candidate.covered_trace_manifest_refs, traceManifestKeys)
      ) {
        return 'MOTIVE_DECOMPOSITION_REF_MISMATCH';
      }
      if (!candidate.decomposition_check) {
        return 'MOTIVE_DECOMPOSITION_DECOMPOSITION_CHECK_MISSING';
      }
      if (this.newClaimGateMissing(candidate)) {
        return 'MOTIVE_DECOMPOSITION_NEW_CLAIM_GATE_MISSING';
      }
      if (this.boundaryBlockerMissing(candidate)) {
        return 'MOTIVE_DECOMPOSITION_BOUNDARY_BLOCKER_MISSING';
      }
    }
    return null;
  }

  private newClaimGateMissing(candidate: PaperImplementationMotiveDecompositionDraftAssertionCandidate): boolean {
    const check = candidate.decomposition_check;
    if (!check.new_claim_risk && check.scope_change_status !== 'new_claim_risk') {
      return false;
    }
    const allowedGates = new Set(['human_confirmation', 'motive_evolution_review']);
    return check.human_confirmation_required !== true
      || !allowedGates.has(check.recommended_next_gate)
      || !allowedGates.has(candidate.recommended_next_gate);
  }

  private boundaryBlockerMissing(candidate: PaperImplementationMotiveDecompositionDraftAssertionCandidate): boolean {
    const check = candidate.decomposition_check;
    const boundaryGap = check.evidence_coverage_status === 'missing'
      || check.trace_alignment_status === 'drift';
    if (!boundaryGap) {
      return false;
    }
    return candidate.recommended_next_gate === 'none'
      || (
        candidate.blocker_codes.length === 0
        && check.blocking_reason_codes.length === 0
      );
  }

  private roleInvocationFailureCode(
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    result: TopicSelectionAgentInvocationResult<PaperImplementationMotiveDecompositionRoleOutput>,
  ): string | null {
    const runtimeFailureCode = this.runtimeFailureCode(result);
    if (runtimeFailureCode) {
      return runtimeFailureCode;
    }
    return this.semanticOutputFailureCode(request, result.structured_output);
  }

  private runtimeFailureCode(
    result: TopicSelectionAgentInvocationResult<PaperImplementationMotiveDecompositionRoleOutput>,
  ): string | null {
    return result.status === 'succeeded' && result.structured_output
      ? null
      : result.error_code ?? 'AGENT_EXECUTION_FAILED';
  }

  private runtimeControlForFailure(
    runtimeFailureCode: string,
    details: Record<string, unknown>,
  ): RuntimeControl {
    return {
      terminal_code: 'runtime_retry_exhausted',
      reason_kind: this.runtimeControlReasonKind(runtimeFailureCode),
      details: {
        runtime_failure_code: runtimeFailureCode,
        ...details,
      },
    };
  }

  private runtimeControlReasonKind(runtimeFailureCode: string): string {
    if ([
      'TimeoutError',
      'TransientError',
      'RateLimitError',
      'UpstreamError',
      'AGENT_EXECUTION_FAILED',
    ].includes(runtimeFailureCode)) {
      return 'provider_failed';
    }
    if (runtimeFailureCode === 'SCHEMA_VALIDATION_FAILED') {
      return 'output_invalid';
    }
    return 'machine_gate_failed';
  }

  private retryWarningCodes(
    roleInvocation: RoleInvocationOutcome,
    runtimeFailureCode: string | null,
  ): string[] {
    if (roleInvocation.retryAttemptIndex === 0) {
      return [];
    }
    return runtimeFailureCode
      ? ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED']
      : ['RUNTIME_TECHNICAL_RETRY_RECOVERED'];
  }

  private outputBlockerCodes(
    output: PaperImplementationMotiveDecompositionRoleOutput | null,
    fallback: string[],
  ): string[] {
    if (!output) {
      return this.uniqueStrings(fallback);
    }
    return this.uniqueStrings([
      ...output.blocker_codes,
      ...output.draft_assertion_candidates.flatMap((candidate) => candidate.blocker_codes),
      ...output.draft_assertion_candidates.flatMap((candidate) => candidate.decomposition_check.blocking_reason_codes),
      ...fallback,
    ]);
  }

  private outputWarningCodes(
    output: PaperImplementationMotiveDecompositionRoleOutput | null,
    fallback: string[],
  ): string[] {
    if (!output) {
      return this.uniqueStrings(fallback);
    }
    return this.uniqueStrings([
      ...output.warning_codes,
      ...output.draft_assertion_candidates.flatMap((candidate) => candidate.warning_codes),
      ...fallback,
    ]);
  }

  private result(
    runtimeBase: RuntimeBase,
    status: 'passed' | 'blocked' | 'failed_runtime',
    providerCallCount: number,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
    admissions: PaperImplementationRuntimeAdmissionRecord[],
    finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null,
    finalAdmission: PaperImplementationRuntimeAdmissionRecord | null,
  ): PaperImplementationMotiveDecompositionRuntimeResult {
    return {
      run_id: runtimeBase.runId,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      status,
      provider_call_count: providerCallCount,
      runtime_artifacts: artifacts,
      admission_records: admissions,
      final_runtime_artifact: finalArtifact,
      final_admission_record: finalAdmission,
      blocker_codes: this.uniqueStrings(artifacts.flatMap((item) => item.blocker_codes)),
      warning_codes: this.uniqueStrings(artifacts.flatMap((item) => item.warning_codes)),
      operational_telemetry: buildPaperImplementationRuntimeOperationalTelemetry({
        runId: runtimeBase.runId,
        workflowType: runtimeBase.profile.workflowType,
        slotId: runtimeBase.profile.slotId,
        status,
        providerCallCount,
        artifacts,
        admissions,
        finalArtifact,
        finalAdmission,
      }),
    };
  }

  private responseReuseStatus(
    executionMode: PaperImplementationAgentExecutionMode,
    responseReuseRef?: string | null,
  ): PaperImplementationRuntimeArtifactEnvelope['response_reuse_status'] {
    if (executionMode === 'provider_llm') {
      return 'miss';
    }
    if (responseReuseRef) {
      return 'hit_non_provider';
    }
    return 'not_applicable';
  }

  private promptPacketCacheStatus(
    status: TopicSelectionRuntimeCacheResult | null | undefined,
  ): PaperImplementationRuntimeCacheStatus {
    return status ?? 'not_applicable';
  }

  private estimatedInputTokens(value: unknown): number {
    return Math.ceil(stableStringify(value).length / 4);
  }

  private providerCallCount(result: TopicSelectionAgentInvocationResult<unknown>): number {
    if (result.provenance.execution_mode !== 'provider_llm') {
      return 0;
    }
    return result.provenance.telemetry?.request_count ?? (result.status === 'succeeded' ? 1 : 0);
  }

  private totalProviderCalls(artifacts: PaperImplementationRuntimeArtifactEnvelope[]): number {
    return artifacts.reduce((sum, artifact) => sum + artifact.provider_call_count, 0);
  }

  private topicRunMode(runMode: PaperImplementationAgentRunMode): 'test' | 'acceptance' | 'product' {
    if (runMode === 'mock') {
      return 'test';
    }
    if (runMode === 'product') {
      return 'product';
    }
    return 'acceptance';
  }

  private createdBy(executionMode: PaperImplementationAgentExecutionMode): TopicSelectionActorType {
    if (executionMode === 'provider_llm') {
      return 'llm';
    }
    if (executionMode === 'codex_assisted') {
      return 'hybrid';
    }
    return 'system';
  }

  private titleCardId(request: RunPaperImplementationMotiveDecompositionRuntimeRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.target_motive_ref.title_card_id
      ?? request.target_core_motive_version_ref.title_card_id
      ?? request.target_assertion_refs.find((ref) => ref.title_card_id)?.title_card_id
      ?? request.source_refs.find((ref) => ref.title_card_id)?.title_card_id
      ?? null;
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationMotiveDecompositionRuntimeRequest,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: this.titleCardId(request),
      version_id: versionId,
    };
  }

  private sameFunctionalRefSet(
    left: TopicSelectionFunctionalRef[] | null | undefined,
    right: TopicSelectionFunctionalRef[] | null | undefined,
  ): boolean {
    const leftKeys = new Set((left ?? []).map((item) => this.refKey(item)));
    const rightKeys = new Set((right ?? []).map((item) => this.refKey(item)));
    if (leftKeys.size !== rightKeys.size) {
      return false;
    }
    return [...leftKeys].every((key) => rightKeys.has(key));
  }

  private refsWithinSet(refs: TopicSelectionFunctionalRef[], allowedKeys: Set<string>): boolean {
    return refs.every((ref) => allowedKeys.has(this.refKey(ref)));
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const byKey = new Map<string, TopicSelectionFunctionalRef>();
    for (const ref of refs) {
      byKey.set(this.refKey(ref), ref);
    }
    return [...byKey.values()];
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.title_card_id ?? '',
      ref.version_id ?? '',
    ].join(':');
  }

  private hasMemoLikeRefs(refs: TopicSelectionFunctionalRef[]): boolean {
    return refs.some((ref) => /memo|summary|rationale|display/i.test(ref.ref_type));
  }

  private hasForbiddenAuthorityField(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((item) => this.hasForbiddenAuthorityField(item));
    }
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => (FORBIDDEN_AUTHORITY_FIELDS as readonly string[]).includes(key))) {
      return true;
    }
    return Object.values(record).some((item) => this.hasForbiddenAuthorityField(item));
  }

  private jsonSafeObject(value: Record<string, unknown>): Record<string, unknown> {
    const jsonSafeValue = JSON.parse(JSON.stringify(value)) as unknown;
    if (jsonSafeValue && typeof jsonSafeValue === 'object' && !Array.isArray(jsonSafeValue)) {
      return jsonSafeValue as Record<string, unknown>;
    }
    return { output: jsonSafeValue ?? null };
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
