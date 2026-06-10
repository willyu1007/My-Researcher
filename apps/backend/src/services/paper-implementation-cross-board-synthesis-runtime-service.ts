import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  paperImplementationCrossBoardSynthesisRoleOutputSchema,
  type PaperImplementationCrossBoardScenarioProposal,
  type PaperImplementationCrossBoardSynthesisArtifact,
  type PaperImplementationCrossBoardSynthesisRoleOutput,
  type PaperImplementationCrossBoardSynthesisRoleSlotId,
  type PaperImplementationCrossBoardSynthesisSlotId,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeExecutorKind,
  type RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationCrossBoardSynthesisRuntimeResult {
  run_id: string;
  slot_id: PaperImplementationCrossBoardSynthesisSlotId;
  workflow_type: 'cross_board_synthesis';
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

export type PaperImplementationCrossBoardSynthesisAgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationCrossBoardSynthesisAgentOrchestrator;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface SlotProfile {
  slotId: PaperImplementationCrossBoardSynthesisSlotId;
  workflowType: 'cross_board_synthesis';
  profileId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  contextPolicyId: string;
  roleSlotId: PaperImplementationCrossBoardSynthesisRoleSlotId;
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
  output: PaperImplementationCrossBoardSynthesisRoleOutput | null;
}

interface RoleInvocationOutcome {
  result: TopicSelectionAgentInvocationResult<PaperImplementationCrossBoardSynthesisRoleOutput>;
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

const MERGE_SPLIT_REUSE_SCENARIOS_PROFILE: SlotProfile = {
  slotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  workflowType: 'cross_board_synthesis',
  profileId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  promptTemplateId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_ID,
  promptTemplateVersion: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_VERSION,
  contextPolicyId: 'paper-implementation.cross-board-synthesis.context-policy.v1',
  roleSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  roleExecutorKind: 'single_agent',
  promptVariantId: 'merge-split-reuse-scenarios.main',
  finalArtifactRefType: 'cross_board_synthesis_runtime_artifact',
  roleArtifactRefType: 'cross_board_synthesis_role_artifact',
  artifactContractId: 'CrossBoardSynthesisMergeSplitReuseScenariosArtifact',
  promptPolicyId: 'paper-implementation.cross-board-synthesis.prompt-redaction.v1',
};

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set([
  'TimeoutError',
  'TransientError',
  'RateLimitError',
  'UpstreamError',
  'SCHEMA_VALIDATION_FAILED',
  'CROSS_BOARD_SYNTHESIS_PRIMARY_INPUT_MISSING',
  'CROSS_BOARD_SYNTHESIS_BOARD_REVIEW_SET_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_CONFLICT_REVIEW_SET_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_CHALLENGE_REVIEW_SET_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REVIEW_SET_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_SCENARIO_SET_INCOMPLETE',
  'CROSS_BOARD_SYNTHESIS_BOARD_HASH_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_TARGET_MOTIVE_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_REF_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REF_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_CONFLICT_REF_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_CHALLENGE_REF_MISMATCH',
  'CROSS_BOARD_SYNTHESIS_REUSE_TRANSFER_BINDING_MISSING',
  'CROSS_BOARD_SYNTHESIS_REUSE_BLOCKER_MISSING',
  'CROSS_BOARD_SYNTHESIS_CONFLICT_OR_CHALLENGE_SCENARIO_MISSING',
  'CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_MISSING',
  'CROSS_BOARD_SYNTHESIS_SIDE_EFFECT_GUARD_MISSING',
  'CROSS_BOARD_SYNTHESIS_AUTHORITY_FIELD_PRESENT',
]);

const FORBIDDEN_AUTHORITY_FIELDS = [
  'cross_board_review_id',
  'create_cross_board_review_request',
  'evidence_transfer_binding_request',
  'motive_portfolio_decision_id',
  'motive_roles_after_decision',
  'merged_motives',
  'split_motives',
  'motive_evolution_decision_request',
  'domain_gate_request',
  'queue_action',
] as const;

const FORBIDDEN_PRIMARY_REF_TYPES = new Set([
  'agent_workflow_harness_run',
  'implementation_proposal_artifact',
  'cross_board_review',
  'motive_portfolio_decision',
  'motive_evolution_decision',
  'decision_work_queue_item',
]);

export class PaperImplementationCrossBoardSynthesisRuntimeService {
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationCrossBoardSynthesisAgentOrchestrator;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runMergeSplitReuseScenarios(
    implementationProjectId: string,
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  ): Promise<PaperImplementationCrossBoardSynthesisRuntimeResult> {
    this.assertRequest(request);
    const profile = MERGE_SPLIT_REUSE_SCENARIOS_PROFILE;
    const runId = request.run_id?.trim() || this.idFactory('pi_cross_board_synthesis_runtime_run');
    const runtimeBase = this.runtimeBase(profile, implementationProjectId, request, runId);
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    const preflightBlockerCodes = this.uniqueStrings([
      ...(request.preflight_blocker_codes ?? []),
      ...this.requestBoundaryBlockerCodes(request),
    ]);

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

    const blockerCodes = this.uniqueStrings([
      ...(roleArtifact.output?.blocker_codes ?? []),
      ...(roleArtifact.output?.scenario_proposals ?? []).flatMap((scenario) => scenario.blocker_codes),
      ...roleArtifact.artifact.blocker_codes,
    ]);
    const warningCodes = this.uniqueStrings([
      ...(roleArtifact.output?.warning_codes ?? []),
      ...(roleArtifact.output?.scenario_proposals ?? []).flatMap((scenario) => scenario.warning_codes),
      ...roleArtifact.artifact.warning_codes,
    ]);
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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
    throw new AppError(500, 'INTERNAL_ERROR', 'Cross-board synthesis runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    retryAttemptIndex: number,
  ): Promise<TopicSelectionAgentInvocationResult<PaperImplementationCrossBoardSynthesisRoleOutput>> {
    const output = this.fixtureOutputForMode(request);
    const messages = this.roleMessages(runtimeBase, request);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(runtimeBase.profile.roleSlotId)}.call-1`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    return this.agentOrchestrator.invokeStructuredOutput<PaperImplementationCrossBoardSynthesisRoleOutput>({
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
      output_contract: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: runtimeBase.profile.promptTemplateId,
        version: runtimeBase.profile.promptTemplateVersion,
      },
      prompt_variant_key: runtimeBase.profile.promptVariantId,
      schema_name: 'paper_implementation_cross_board_synthesis_role_output',
      schema: paperImplementationCrossBoardSynthesisRoleOutputSchema as unknown as Record<string, unknown>,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    blockerCodes: string[],
  ): Promise<RecordedRuntimeArtifact> {
    const output: PaperImplementationCrossBoardSynthesisRoleOutput = {
      role_slot_id: runtimeBase.profile.roleSlotId,
      role_status: 'blocked',
      summary: 'Deterministic cross-board synthesis preflight found blockers before semantic scenario planning.',
      cited_source_refs: [...request.source_refs],
      reviewed_board_version_refs: [...request.reviewed_board_version_refs],
      reviewed_conflict_refs: [...request.reviewed_conflict_refs],
      reviewed_challenge_refs: [...request.reviewed_challenge_refs],
      reviewed_evidence_transfer_binding_refs: [...request.evidence_transfer_binding_refs],
      scenario_proposals: [],
      blocker_codes: blockerCodes,
      warning_codes: [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_cross_board_review_side_effect: true,
      no_evidence_transfer_binding_side_effect: true,
      no_portfolio_mutation_side_effect: true,
      no_motive_evolution_side_effect: true,
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: output.role_slot_id,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: 'preflight_blocked',
      promptPacketHash: this.hash({
        run_id: runtimeBase.runId,
        role_slot_id: output.role_slot_id,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      }),
      promptVariantId: 'deterministic-preflight',
      runtimeStatus: 'blocked',
      runtimeFailureCode: null,
      providerCallCount: 0,
      blockerCodes: output.blocker_codes,
      warningCodes: output.warning_codes,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    roleInvocation: RoleInvocationOutcome,
  ): Promise<RecordedRuntimeArtifact> {
    const roleResult = roleInvocation.result;
    const output = roleResult.structured_output;
    const runtimeFailureCode = this.roleInvocationFailureCode(request, roleResult);
    const runtimeStatus = runtimeFailureCode
      ? 'failed_runtime'
      : output?.role_status === 'blocked' ? 'blocked' : 'passed';
    if (output && output.role_slot_id !== runtimeBase.profile.roleSlotId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Cross-board synthesis role output slot mismatch: expected ${runtimeBase.profile.roleSlotId}.`,
      );
    }
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
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, artifactOutput);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: runtimeBase.profile.roleSlotId,
      callIndex: 1,
      executorKind: runtimeBase.profile.roleExecutorKind,
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: runtimeBase.profile.roleSlotId,
      promptPacketHash: roleResult.provenance.prompt_packet_hash,
      promptVariantId: runtimeBase.profile.promptVariantId,
      runtimeStatus,
      runtimeFailureCode,
      retryAttemptIndex: roleInvocation.retryAttemptIndex,
      providerCallCount: roleInvocation.providerCallCount,
      blockerCodes: runtimeFailureCode ? [runtimeFailureCode] : output?.blocker_codes ?? [],
      warningCodes: this.uniqueStrings([
        ...(output?.warning_codes ?? roleResult.warning_codes),
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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
      outputSchemaId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_FINAL_OUTPUT_SCHEMA_ID,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: runtimeBase.profile.workflowType,
      slot_id: runtimeBase.profile.slotId,
      artifact_scope: input.artifactScope,
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      target_ref: request.target_ref,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    input: {
      roleArtifact: RecordedRuntimeArtifact;
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): PaperImplementationCrossBoardSynthesisArtifact {
    const roleArtifact = input.roleArtifact.artifact;
    const roleOutput = input.roleArtifact.output;
    const admittedRoleRef = input.roleArtifact.admission.admitted_artifact_ref;
    const admittedRoleHash = input.roleArtifact.admission.admitted_artifact_hash;
    return {
      status: input.status,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      target_ref: request.target_ref,
      preflight_blockers: this.uniqueStrings(request.preflight_blocker_codes ?? []),
      role_summary: roleOutput?.summary ?? null,
      role_blocker_codes: roleOutput?.blocker_codes ?? [],
      role_warning_codes: roleOutput?.warning_codes ?? [],
      blockers: this.uniqueStrings(input.blockerCodes),
      warnings: this.uniqueStrings(input.warningCodes),
      runtime_failure_code: input.runtimeFailureCode,
      board_anchors: [...request.board_anchors],
      reviewed_board_version_refs: [...request.reviewed_board_version_refs],
      reviewed_conflict_refs: [...request.reviewed_conflict_refs],
      reviewed_challenge_refs: [...request.reviewed_challenge_refs],
      reviewed_evidence_transfer_binding_refs: [...request.evidence_transfer_binding_refs],
      scenario_proposals: roleOutput?.scenario_proposals ?? [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_cross_board_review_side_effect: true,
      no_evidence_transfer_binding_side_effect: true,
      no_portfolio_mutation_side_effect: true,
      no_motive_evolution_side_effect: true,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    runId: string,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile(profile);
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const sourceHashBundleHash = this.hash({
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      source_context_packets: request.source_context_packets ?? [],
      board_anchors: request.board_anchors,
      reviewed_board_version_refs: request.reviewed_board_version_refs,
      reviewed_conflict_refs: request.reviewed_conflict_refs,
      reviewed_challenge_refs: request.reviewed_challenge_refs,
      evidence_transfer_binding_refs: request.evidence_transfer_binding_refs,
      reuse_policy: request.reuse_policy,
      secondary_cross_board_review_refs: request.secondary_cross_board_review_refs ?? [],
      secondary_evidence_transfer_binding_refs: request.secondary_evidence_transfer_binding_refs ?? [],
      secondary_motive_assertion_refs: request.secondary_motive_assertion_refs ?? [],
      secondary_evidence_binding_refs: request.secondary_evidence_binding_refs ?? [],
      secondary_route_refs: request.secondary_route_refs ?? [],
      secondary_experiment_refs: request.secondary_experiment_refs ?? [],
      target_ref: request.target_ref,
      input_snapshot_hash: request.input_snapshot_hash,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Return only structured JSON for PaperImplementation cross-board merge/split/reuse scenario planning.',
          'Use board_anchors as the primary runtime authority and preserve board refs, board hashes, conflicts, challenges, source locators, and evidence transfer binding refs exactly.',
          'Produce typed proposal scenarios only; scenario keys are runtime-local and not persisted domain ids.',
          'Do not create CrossBoardReview records, EvidenceTransferBinding records, motive portfolio decisions, motive evolution decisions, queue items, Domain Gate requests, prompt text, or raw provider output.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          slot_id: runtimeBase.profile.slotId,
          role_slot_id: runtimeBase.profile.roleSlotId,
          target_ref: request.target_ref,
          input_snapshot_ref: request.input_snapshot_ref,
          input_snapshot_hash: request.input_snapshot_hash,
          source_refs: request.source_refs,
          source_hashes: request.source_hashes,
          source_context_packets: request.source_context_packets ?? [],
          board_anchors: request.board_anchors,
          reviewed_board_version_refs: request.reviewed_board_version_refs,
          reviewed_conflict_refs: request.reviewed_conflict_refs,
          reviewed_challenge_refs: request.reviewed_challenge_refs,
          evidence_transfer_binding_refs: request.evidence_transfer_binding_refs,
          reuse_policy: request.reuse_policy,
          secondary_cross_board_review_refs: request.secondary_cross_board_review_refs ?? [],
          secondary_evidence_transfer_binding_refs: request.secondary_evidence_transfer_binding_refs ?? [],
          secondary_motive_assertion_refs: request.secondary_motive_assertion_refs ?? [],
          secondary_evidence_binding_refs: request.secondary_evidence_binding_refs ?? [],
          secondary_route_refs: request.secondary_route_refs ?? [],
          secondary_experiment_refs: request.secondary_experiment_refs ?? [],
          source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
        }),
      },
    ];
  }

  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    const contextPayloads = [{
      target_ref: request.target_ref,
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      board_anchors: request.board_anchors,
      reviewed_board_version_refs: request.reviewed_board_version_refs,
      reviewed_conflict_refs: request.reviewed_conflict_refs,
      reviewed_challenge_refs: request.reviewed_challenge_refs,
      evidence_transfer_binding_refs: request.evidence_transfer_binding_refs,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
    }];
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      context_payloads: contextPayloads,
      extra_payloads: [{
        slot_id: runtimeBase.profile.slotId,
        role_slot_id: runtimeBase.profile.roleSlotId,
        board_anchor_count: request.board_anchors.length,
        conflict_ref_count: request.reviewed_conflict_refs.length,
        challenge_ref_count: request.reviewed_challenge_refs.length,
        evidence_transfer_binding_ref_count: request.evidence_transfer_binding_refs.length,
      }],
      estimated_input_tokens_override: this.estimatedInputTokens({
        messages,
        context_payloads: contextPayloads,
      }),
      schema_overhead_tokens_override: 1_600,
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
      context_family: 'paper_implementation_cross_board_synthesis',
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
          'board_version_ref',
          'board_version_hash',
          'core_motive_version_ref',
          'trace_manifest_ref',
          'trace_manifest_hash',
          'evidence_binding_ref',
          'source_locator_ref',
          'board_conflict_ref',
          'evidence_challenge_ref',
          'evidence_transfer_binding_ref',
          'freshness_status',
          'motive_ref',
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
        estimated_input_token_target: 36_000,
        estimated_output_token_budget: 3_500,
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
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    output: unknown,
  ): Record<string, unknown> {
    return {
      artifact_kind: `${runtimeBase.profile.slotId}.role_artifact_payload`,
      target_ref: request.target_ref,
      board_anchors: request.board_anchors,
      reviewed_board_version_refs: request.reviewed_board_version_refs,
      reviewed_conflict_refs: request.reviewed_conflict_refs,
      reviewed_challenge_refs: request.reviewed_challenge_refs,
      evidence_transfer_binding_refs: request.evidence_transfer_binding_refs,
      source_refs: request.source_refs,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      role_output: output,
    };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  ): PaperImplementationCrossBoardSynthesisRoleOutput | null {
    if (request.execution_mode === 'mocked_llm') {
      return request.mocked_role_outputs?.[PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID] ?? null;
    }
    if (request.execution_mode === 'codex_assisted') {
      return request.codex_role_outputs?.[PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID] ?? null;
    }
    return null;
  }

  private assertRequest(request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest): void {
    if (request.source_refs.length !== request.source_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_refs and source_hashes must have the same length.');
    }
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.profileId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.profileId}.`,
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
      && !requestedModelOptionId.startsWith(`${MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.profileId}.`)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must belong to runtime slot profile ${MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.profileId}.`,
      );
    }
    if (
      request.execution_mode === 'mocked_llm'
      && !request.mocked_role_outputs?.[MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.roleSlotId]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_role_outputs.${MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.roleSlotId} is required.`);
    }
    if (
      request.execution_mode === 'codex_assisted'
      && !request.codex_role_outputs?.[MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.roleSlotId]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_role_outputs.${MERGE_SPLIT_REUSE_SCENARIOS_PROFILE.roleSlotId} is required.`);
    }
    if (request.board_anchors.length < 2) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'cross_board_synthesis requires at least two board_anchors.');
    }
    if (request.reviewed_board_version_refs.length < 2) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'cross_board_synthesis requires at least two reviewed_board_version_refs.');
    }
    const forbiddenPrimaryRef = this.primaryInputRefs(request).find((ref) => FORBIDDEN_PRIMARY_REF_TYPES.has(ref.ref_type));
    if (forbiddenPrimaryRef) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `cross_board_synthesis forbids primary input ref_type=${forbiddenPrimaryRef.ref_type}.`,
      );
    }
  }

  private hasRoleOutputs(
    outputs: RunPaperImplementationCrossBoardSynthesisRuntimeRequest['mocked_role_outputs']
      | RunPaperImplementationCrossBoardSynthesisRuntimeRequest['codex_role_outputs'],
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private requestBoundaryBlockerCodes(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  ): string[] {
    const blockers: string[] = [];
    if (!this.sameFunctionalRefSet(
      request.reviewed_board_version_refs,
      request.board_anchors.map((anchor) => anchor.board_version_ref),
    )) {
      blockers.push('CROSS_BOARD_SYNTHESIS_BOARD_REVIEW_SET_MISMATCH');
    }
    if (!this.refSetCovers(request.reviewed_conflict_refs, request.board_anchors.flatMap((anchor) => anchor.conflict_refs))) {
      blockers.push('CROSS_BOARD_SYNTHESIS_CONFLICT_REVIEW_SET_MISMATCH');
    }
    if (!this.refSetCovers(request.reviewed_challenge_refs, request.board_anchors.flatMap((anchor) => anchor.challenge_refs))) {
      blockers.push('CROSS_BOARD_SYNTHESIS_CHALLENGE_REVIEW_SET_MISMATCH');
    }
    if (request.board_anchors.some((anchor) => anchor.evidence_binding_refs.length > 0 && anchor.source_locator_refs.length === 0)) {
      blockers.push('CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_MISSING');
    }
    if (this.hasMemoLikeRefs(this.primaryInputRefs(request))) {
      blockers.push('CROSS_BOARD_SYNTHESIS_MEMO_LIKE_REF_REJECTED');
    }
    return blockers;
  }

  private primaryInputRefs(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      request.target_ref,
      request.input_snapshot_ref,
      ...request.source_refs,
      ...request.board_anchors.flatMap((anchor) => [
        anchor.board_version_ref,
        anchor.motive_ref,
        anchor.core_motive_version_ref,
        anchor.trace_manifest_ref,
        ...anchor.evidence_binding_refs,
        ...anchor.source_locator_refs,
        ...anchor.conflict_refs,
        ...anchor.challenge_refs,
      ]),
      ...request.reviewed_board_version_refs,
      ...request.reviewed_conflict_refs,
      ...request.reviewed_challenge_refs,
      ...request.evidence_transfer_binding_refs,
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
  ): PaperImplementationCrossBoardSynthesisRuntimeResult {
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

  private runtimeFailureCode(
    result: TopicSelectionAgentInvocationResult<PaperImplementationCrossBoardSynthesisRoleOutput>,
  ): string | null {
    return result.status === 'succeeded' && result.structured_output
      ? null
      : result.error_code ?? 'AGENT_EXECUTION_FAILED';
  }

  private roleInvocationFailureCode(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    result: TopicSelectionAgentInvocationResult<PaperImplementationCrossBoardSynthesisRoleOutput>,
  ): string | null {
    const runtimeFailureCode = this.runtimeFailureCode(result);
    if (runtimeFailureCode) {
      return runtimeFailureCode;
    }
    return this.semanticOutputFailureCode(request, result.structured_output);
  }

  private semanticOutputFailureCode(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    output: PaperImplementationCrossBoardSynthesisRoleOutput | null,
  ): string | null {
    if (!output || output.role_status !== 'passed') {
      return null;
    }
    if (this.hasForbiddenAuthorityField(output)) {
      return 'CROSS_BOARD_SYNTHESIS_AUTHORITY_FIELD_PRESENT';
    }
    if (
      !output.reviewed_board_version_refs
      || !output.reviewed_conflict_refs
      || !output.reviewed_challenge_refs
      || !output.reviewed_evidence_transfer_binding_refs
      || !output.scenario_proposals
    ) {
      return 'CROSS_BOARD_SYNTHESIS_PRIMARY_INPUT_MISSING';
    }
    if (!this.sameFunctionalRefSet(output.reviewed_board_version_refs, request.reviewed_board_version_refs)) {
      return 'CROSS_BOARD_SYNTHESIS_BOARD_REVIEW_SET_MISMATCH';
    }
    if (!this.refSetCovers(output.reviewed_conflict_refs, request.reviewed_conflict_refs)) {
      return 'CROSS_BOARD_SYNTHESIS_CONFLICT_REVIEW_SET_MISMATCH';
    }
    if (!this.refSetCovers(output.reviewed_challenge_refs, request.reviewed_challenge_refs)) {
      return 'CROSS_BOARD_SYNTHESIS_CHALLENGE_REVIEW_SET_MISMATCH';
    }
    if (!this.refSetCovers(output.reviewed_evidence_transfer_binding_refs, request.evidence_transfer_binding_refs)) {
      return 'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REVIEW_SET_MISMATCH';
    }
    if (output.scenario_proposals.length === 0) {
      return 'CROSS_BOARD_SYNTHESIS_SCENARIO_SET_INCOMPLETE';
    }
    if (
      output.no_domain_gate_request !== true
      || output.no_queue_side_effect !== true
      || output.no_cross_board_review_side_effect !== true
      || output.no_evidence_transfer_binding_side_effect !== true
      || output.no_portfolio_mutation_side_effect !== true
      || output.no_motive_evolution_side_effect !== true
    ) {
      return 'CROSS_BOARD_SYNTHESIS_SIDE_EFFECT_GUARD_MISSING';
    }
    const scenarioFailureCode = this.scenarioFailureCode(request, output.scenario_proposals);
    if (scenarioFailureCode) {
      return scenarioFailureCode;
    }
    if (
      request.evidence_transfer_binding_refs.length > 0
      && !output.scenario_proposals.some((scenario) => scenario.scenario_kind === 'reuse')
    ) {
      return 'CROSS_BOARD_SYNTHESIS_SCENARIO_SET_INCOMPLETE';
    }
    if (
      (request.reviewed_conflict_refs.length > 0 || request.reviewed_challenge_refs.length > 0)
      && !output.scenario_proposals.some((scenario) => scenario.scenario_kind === 'park' || scenario.scenario_kind === 'reject')
    ) {
      return 'CROSS_BOARD_SYNTHESIS_CONFLICT_OR_CHALLENGE_SCENARIO_MISSING';
    }
    return null;
  }

  private scenarioFailureCode(
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
    scenarios: PaperImplementationCrossBoardScenarioProposal[],
  ): string | null {
    const boardHashByRef = new Map(
      request.board_anchors.map((anchor) => [this.refKey(anchor.board_version_ref), anchor.board_version_hash]),
    );
    const motiveKeys = new Set(request.board_anchors.map((anchor) => this.refKey(anchor.motive_ref)));
    const sourceLocatorKeys = new Set(
      request.board_anchors.flatMap((anchor) => anchor.source_locator_refs).map((ref) => this.refKey(ref)),
    );
    const transferBindingKeys = new Set(
      request.evidence_transfer_binding_refs.map((ref) => this.refKey(ref)),
    );
    const conflictKeys = new Set(request.reviewed_conflict_refs.map((ref) => this.refKey(ref)));
    const challengeKeys = new Set(request.reviewed_challenge_refs.map((ref) => this.refKey(ref)));
    for (const scenario of scenarios) {
      if (scenario.source_locator_refs.length === 0) {
        return 'CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_MISSING';
      }
      if (!this.refsWithinSet(scenario.source_locator_refs, sourceLocatorKeys)) {
        return 'CROSS_BOARD_SYNTHESIS_SOURCE_LOCATOR_REF_MISMATCH';
      }
      if (!this.refsWithinSet(scenario.evidence_transfer_binding_refs, transferBindingKeys)) {
        return 'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REF_MISMATCH';
      }
      if (!this.refsWithinSet(scenario.conflict_refs, conflictKeys)) {
        return 'CROSS_BOARD_SYNTHESIS_CONFLICT_REF_MISMATCH';
      }
      if (!this.refsWithinSet(scenario.challenge_refs, challengeKeys)) {
        return 'CROSS_BOARD_SYNTHESIS_CHALLENGE_REF_MISMATCH';
      }
      if (
        scenario.source_board_version_refs.length !== scenario.source_board_version_hashes.length
        || scenario.source_board_version_refs.some((sourceRef, index) =>
          boardHashByRef.get(this.refKey(sourceRef)) !== scenario.source_board_version_hashes[index])
      ) {
        return 'CROSS_BOARD_SYNTHESIS_BOARD_HASH_MISMATCH';
      }
      if (scenario.target_motive_refs.some((motiveRef) => !motiveKeys.has(this.refKey(motiveRef)))) {
        return 'CROSS_BOARD_SYNTHESIS_TARGET_MOTIVE_MISMATCH';
      }
      if (
        scenario.scenario_kind === 'reuse'
        && scenario.disposition === 'viable_candidate'
        && scenario.evidence_transfer_binding_refs.length === 0
      ) {
        return 'CROSS_BOARD_SYNTHESIS_REUSE_TRANSFER_BINDING_MISSING';
      }
      if (
        scenario.scenario_kind === 'reuse'
        && request.evidence_transfer_binding_refs.length === 0
        && scenario.disposition !== 'blocked_missing_transfer_binding'
      ) {
        return 'CROSS_BOARD_SYNTHESIS_REUSE_BLOCKER_MISSING';
      }
    }
    return null;
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

  private titleCardId(request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.input_snapshot_ref.title_card_id
      ?? request.board_anchors.find((anchor) => anchor.board_version_ref.title_card_id)?.board_version_ref.title_card_id
      ?? request.source_refs.find((ref) => ref.title_card_id)?.title_card_id
      ?? null;
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
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

  private refSetCovers(
    observed: TopicSelectionFunctionalRef[] | null | undefined,
    required: TopicSelectionFunctionalRef[] | null | undefined,
  ): boolean {
    const observedKeys = new Set((observed ?? []).map((item) => this.refKey(item)));
    return (required ?? []).every((item) => observedKeys.has(this.refKey(item)));
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
