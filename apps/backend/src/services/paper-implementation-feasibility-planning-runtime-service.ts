import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  paperImplementationFeasibilityPlanningRoleOutputSchema,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeExecutorKind,
  type PaperImplementationFeasibilityPlanningArtifact,
  type PaperImplementationFeasibilityPlanningRoleOutput,
  type PaperImplementationFeasibilityPlanningRoleSlotId,
  type PaperImplementationFeasibilityPlanningSlotId,
  type PaperImplementationFeasibilityPlanningSourceContextPacket,
  type RunPaperImplementationFeasibilityPlanningRuntimeRequest,
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
  buildPaperImplementationCompressionAttempt,
} from './paper-implementation-compression-attempt.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { requireAdmittedPassedFinalArtifact } from './paper-implementation-runtime-artifact-consumption.js';
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
import {
  functionalRefEquals,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  roleSlotEchoMismatchCode,
  sameStringSet,
} from './paper-implementation-runtime-utils.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationFeasibilityPlanningRuntimeResult {
  run_id: string;
  slot_id: PaperImplementationFeasibilityPlanningSlotId;
  workflow_type: 'feasibility_planning';
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

export type PaperImplementationFeasibilityPlanningAgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationFeasibilityPlanningAgentOrchestrator;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface SlotProfile {
  slotId: PaperImplementationFeasibilityPlanningSlotId;
  workflowType: 'feasibility_planning';
  profileId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  contextPolicyId: string;
  roleSlotId: PaperImplementationFeasibilityPlanningRoleSlotId;
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
  output: PaperImplementationFeasibilityPlanningRoleOutput | null;
}

interface RoleInvocationOutcome {
  result: TopicSelectionAgentInvocationResult<PaperImplementationFeasibilityPlanningRoleOutput>;
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

const PROBE_PLAN_CANDIDATES_PROFILE: SlotProfile = {
  slotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  workflowType: 'feasibility_planning',
  profileId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  promptTemplateId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_ID,
  promptTemplateVersion: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_VERSION,
  contextPolicyId: 'paper-implementation.feasibility-planning.context-policy.v1',
  roleSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  roleExecutorKind: 'single_agent',
  promptVariantId: 'probe-plan-candidates.main',
  finalArtifactRefType: 'feasibility_planning_runtime_artifact',
  roleArtifactRefType: 'feasibility_planning_role_artifact',
  artifactContractId: 'FeasibilityPlanningProbePlanCandidatesArtifact',
  promptPolicyId: 'paper-implementation.feasibility-planning.prompt-redaction.v1',
};

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set<string>([
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  // T-124 S3-α4: a wrong role_slot_id echo is a retryable technical failure
  // (S2-C single-source constant), not an HTTP 400.
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  'FEASIBILITY_PLANNING_PRIMARY_INPUT_MISSING',
  'FEASIBILITY_PLANNING_VALIDATION_CYCLE_MISMATCH',
  'FEASIBILITY_PLANNING_ROUTE_PROPOSAL_MISMATCH',
  'FEASIBILITY_PLANNING_ROUTE_SKEPTIC_MISMATCH',
  'FEASIBILITY_PLANNING_CYCLE_CANDIDATE_KEY_MISMATCH',
  'FEASIBILITY_PLANNING_ROUTE_CANDIDATE_KEY_MISMATCH',
  'FEASIBILITY_PLANNING_CANDIDATE_SET_INCOMPLETE',
  'FEASIBILITY_PLANNING_CONFIRMATORY_BASELINE_GAP_OPEN',
  'FEASIBILITY_PLANNING_SIDE_EFFECT_GUARD_MISSING',
]);

export class PaperImplementationFeasibilityPlanningRuntimeService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationFeasibilityPlanningAgentOrchestrator;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runProbePlanCandidates(
    implementationProjectId: string,
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  ): Promise<PaperImplementationFeasibilityPlanningRuntimeResult> {
    this.assertRequest(request);
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    await requireAdmittedPassedFinalArtifact(
      this.runtimeAdmission,
      implementationProjectId,
      request.admitted_validation_cycle_artifact_ref,
      request.admitted_validation_cycle_artifact_hash,
      PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    );
    await requireAdmittedPassedFinalArtifact(
      this.runtimeAdmission,
      implementationProjectId,
      request.admitted_route_proposal_artifact_ref,
      request.admitted_route_proposal_artifact_hash,
      PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    );
    await requireAdmittedPassedFinalArtifact(
      this.runtimeAdmission,
      implementationProjectId,
      request.admitted_route_skeptic_artifact_ref,
      request.admitted_route_skeptic_artifact_hash,
      PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    );
    const profile = PROBE_PLAN_CANDIDATES_PROFILE;
    const runId = request.run_id?.trim() || this.idFactory('pi_feasibility_planning_runtime_run');
    const runtimeBase = this.runtimeBase(profile, implementationProjectId, request, runId);
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    const preflightBlockerCodes = this.uniqueStrings(request.preflight_blocker_codes ?? []);

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
      ...(roleArtifact.output?.probe_plan_candidate_proposals ?? []).flatMap((proposal) => proposal.blocker_codes),
      ...roleArtifact.artifact.blocker_codes,
    ]);
    const warningCodes = this.uniqueStrings([
      ...(roleArtifact.output?.warning_codes ?? []),
      ...(roleArtifact.output?.probe_plan_candidate_proposals ?? []).flatMap((proposal) => proposal.warning_codes),
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
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
    throw new AppError(500, 'INTERNAL_ERROR', 'Feasibility planning runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    retryAttemptIndex: number,
  ): Promise<TopicSelectionAgentInvocationResult<PaperImplementationFeasibilityPlanningRoleOutput>> {
    const output = this.fixtureOutputForMode(request);
    const messages = this.roleMessages(runtimeBase, request);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(runtimeBase.profile.roleSlotId)}.call-1`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    return this.agentOrchestrator.invokeStructuredOutput<PaperImplementationFeasibilityPlanningRoleOutput>({
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
      output_contract: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: runtimeBase.profile.promptTemplateId,
        version: runtimeBase.profile.promptTemplateVersion,
      },
      prompt_variant_key: runtimeBase.profile.promptVariantId,
      schema_name: 'paper_implementation_feasibility_planning_role_output',
      schema: paperImplementationFeasibilityPlanningRoleOutputSchema as unknown as Record<string, unknown>,
      messages,
      input_refs: [
        request.target_ref,
        request.admitted_validation_cycle_artifact_ref,
        request.admitted_route_proposal_artifact_ref,
        request.admitted_route_skeptic_artifact_ref,
        ...request.source_refs,
      ],
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    blockerCodes: string[],
  ): Promise<RecordedRuntimeArtifact> {
    const output: PaperImplementationFeasibilityPlanningRoleOutput = {
      role_slot_id: runtimeBase.profile.roleSlotId,
      role_status: 'blocked',
      summary: 'Deterministic feasibility planning preflight found blockers before semantic planning.',
      cited_source_refs: [...request.source_refs],
      blocker_codes: blockerCodes,
      warning_codes: [],
      reviewed_validation_cycle_artifact_ref: request.admitted_validation_cycle_artifact_ref,
      reviewed_validation_cycle_artifact_hash: request.admitted_validation_cycle_artifact_hash,
      reviewed_route_proposal_ref: request.admitted_route_proposal_artifact_ref,
      reviewed_route_proposal_hash: request.admitted_route_proposal_artifact_hash,
      reviewed_route_skeptic_artifact_ref: request.admitted_route_skeptic_artifact_ref,
      reviewed_route_skeptic_artifact_hash: request.admitted_route_skeptic_artifact_hash,
      reviewed_cycle_candidate_keys: this.uniqueStrings(request.reviewed_cycle_candidate_keys),
      reviewed_route_candidate_keys: this.uniqueStrings(request.reviewed_route_candidate_keys),
      probe_plan_candidate_proposals: [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_feasibility_probe_side_effect: true,
      no_experiment_plan_light_side_effect: true,
      no_validation_cycle_side_effect: true,
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: output.role_slot_id,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_OUTPUT_SCHEMA_ID,
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    roleInvocation: RoleInvocationOutcome,
  ): Promise<RecordedRuntimeArtifact> {
    const roleResult = roleInvocation.result;
    const output = roleResult.structured_output;
    const runtimeFailureCode = this.roleInvocationFailureCode(request, roleResult);
    const runtimeStatus = runtimeFailureCode
      ? 'failed_runtime'
      : output?.role_status === 'blocked' ? 'blocked' : 'passed';
    // T-124 S3-α4: a wrong role_slot_id echo is classified as a retryable
    // technical failure inside the bounded retry loop (single-source S2-C
    // constant) — it never surfaces as an HTTP 400 here.
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
      outputSchemaId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_OUTPUT_SCHEMA_ID,
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
        // Compression provenance warnings must survive into the role artifact even
        // when the role output carries its own warning list (D-T128-02 lineage).
        ...roleResult.warning_codes.filter((code) => code.startsWith('COMPRESSION_')),
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
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
      outputSchemaId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_FINAL_OUTPUT_SCHEMA_ID,
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    input: {
      roleArtifact: RecordedRuntimeArtifact;
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): PaperImplementationFeasibilityPlanningArtifact {
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
      reviewed_validation_cycle_artifact_ref: request.admitted_validation_cycle_artifact_ref,
      reviewed_validation_cycle_artifact_hash: request.admitted_validation_cycle_artifact_hash,
      reviewed_route_proposal_ref: request.admitted_route_proposal_artifact_ref,
      reviewed_route_proposal_hash: request.admitted_route_proposal_artifact_hash,
      reviewed_route_skeptic_artifact_ref: request.admitted_route_skeptic_artifact_ref,
      reviewed_route_skeptic_artifact_hash: request.admitted_route_skeptic_artifact_hash,
      reviewed_cycle_candidate_keys: this.uniqueStrings(request.reviewed_cycle_candidate_keys),
      reviewed_route_candidate_keys: this.uniqueStrings(request.reviewed_route_candidate_keys),
      probe_plan_candidate_proposals: roleOutput?.probe_plan_candidate_proposals ?? [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_feasibility_probe_side_effect: true,
      no_experiment_plan_light_side_effect: true,
      no_validation_cycle_side_effect: true,
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    runId: string,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile(profile);
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const sourceHashBundleHash = this.hash({
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      source_context_packets: request.source_context_packets ?? [],
      admitted_validation_cycle_artifact_ref: request.admitted_validation_cycle_artifact_ref,
      admitted_validation_cycle_artifact_hash: request.admitted_validation_cycle_artifact_hash,
      admitted_route_proposal_artifact_ref: request.admitted_route_proposal_artifact_ref,
      admitted_route_proposal_artifact_hash: request.admitted_route_proposal_artifact_hash,
      admitted_route_skeptic_artifact_ref: request.admitted_route_skeptic_artifact_ref,
      admitted_route_skeptic_artifact_hash: request.admitted_route_skeptic_artifact_hash,
      reviewed_cycle_candidate_keys: request.reviewed_cycle_candidate_keys,
      reviewed_route_candidate_keys: request.reviewed_route_candidate_keys,
      secondary_route_candidate_refs: request.secondary_route_candidate_refs ?? [],
      secondary_validation_cycle_refs: request.secondary_validation_cycle_refs ?? [],
      secondary_feasibility_probe_refs: request.secondary_feasibility_probe_refs ?? [],
      secondary_experiment_plan_light_refs: request.secondary_experiment_plan_light_refs ?? [],
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    packets: readonly PaperImplementationFeasibilityPlanningSourceContextPacket[]
      = request.source_context_packets ?? [],
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Return only structured JSON for PaperImplementation feasibility candidate planning.',
          'Use the admitted validation-cycle candidate artifact as primary input with route proposal and route skeptic artifacts only as lineage anchors.',
          'Produce at least two probe/plan candidate proposals with probe question, baseline gap status, metric/data/baseline/code/config refs, budget envelope, stop conditions, expected information gain, and trace refs.',
          'Do not create validation cycle records, feasibility probes, experiment plan-light objects, queue items, Domain Gate requests, WorkOrders, live experiment requests, prompt text, or raw provider output.',
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
          source_context_packets: packets,
          admitted_validation_cycle_artifact_ref: request.admitted_validation_cycle_artifact_ref,
          admitted_validation_cycle_artifact_hash: request.admitted_validation_cycle_artifact_hash,
          admitted_route_proposal_artifact_ref: request.admitted_route_proposal_artifact_ref,
          admitted_route_proposal_artifact_hash: request.admitted_route_proposal_artifact_hash,
          admitted_route_skeptic_artifact_ref: request.admitted_route_skeptic_artifact_ref,
          admitted_route_skeptic_artifact_hash: request.admitted_route_skeptic_artifact_hash,
          reviewed_cycle_candidate_keys: request.reviewed_cycle_candidate_keys,
          reviewed_route_candidate_keys: request.reviewed_route_candidate_keys,
          secondary_route_candidate_refs: request.secondary_route_candidate_refs ?? [],
          secondary_validation_cycle_refs: request.secondary_validation_cycle_refs ?? [],
          secondary_feasibility_probe_refs: request.secondary_feasibility_probe_refs ?? [],
          secondary_experiment_plan_light_refs: request.secondary_experiment_plan_light_refs ?? [],
          source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
        }),
      },
    ];
  }

  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    const extraPayloads = [{
      slot_id: runtimeBase.profile.slotId,
      role_slot_id: runtimeBase.profile.roleSlotId,
      admitted_validation_cycle_artifact_hash: request.admitted_validation_cycle_artifact_hash,
      admitted_route_proposal_artifact_hash: request.admitted_route_proposal_artifact_hash,
      admitted_route_skeptic_artifact_hash: request.admitted_route_skeptic_artifact_hash,
      reviewed_cycle_candidate_count: request.reviewed_cycle_candidate_keys.length,
      reviewed_route_candidate_count: request.reviewed_route_candidate_keys.length,
    }];
    // PC-S3 caller-side compression attempt: same roleMessages builder, degraded
    // packet views only — no second message template to drift.
    const compressionSelection = buildPaperImplementationCompressionAttempt({
      packets: request.source_context_packets ?? [],
      buildMessages: (trimmedPackets) => this.roleMessages(runtimeBase, request, trimmedPackets),
      contextPolicyProfile: runtimeBase.contextPolicyProfile,
      schema: paperImplementationFeasibilityPlanningRoleOutputSchema as unknown as Record<string, unknown>,
      extraPayloads,
      sourceRefs: request.source_refs,
      requiredPreservedFacts: this.requiredPreservedFacts(request),
    });
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      // N3 double-count fix: the request body is embedded verbatim in `messages`;
      // context_payloads must not re-carry the same content (single-source estimate).
      context_payloads: [],
      extra_payloads: extraPayloads,
      compression_attempt: compressionSelection?.attempt ?? null,
      estimated_input_tokens_override: this.estimatedInputTokens({ messages }),
      schema_overhead_tokens_override: 1_500,
    };
  }

  /** PC-S1: ref-skeleton facts (per this slot's preserved_fact_kinds) that survive
   *  every compression level; packet bodies are deliberately not listed. */
  private requiredPreservedFacts(
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  ): TopicSelectionCompressionFactInventory {
    return {
      validation_cycle_ref: [
        request.admitted_validation_cycle_artifact_ref.ref_id,
        ...(request.secondary_validation_cycle_refs ?? []).map((item) => item.ref_id),
      ],
      route_ref: [
        request.admitted_route_proposal_artifact_ref.ref_id,
        request.admitted_route_skeptic_artifact_ref.ref_id,
        ...(request.secondary_route_candidate_refs ?? []).map((item) => item.ref_id),
      ],
      validation_cycle_candidate_ref: [...request.reviewed_cycle_candidate_keys],
      route_candidate_proposal_ref: [...request.reviewed_route_candidate_keys],
      feasibility_probe_ref: (request.secondary_feasibility_probe_refs ?? []).map((item) => item.ref_id),
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
      context_family: 'paper_implementation_feasibility_planning',
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
          'validation_cycle_ref',
          'route_ref',
          'validation_cycle_candidate_ref',
          'route_candidate_proposal_ref',
          'risk_finding_ref',
          'feasibility_probe_ref',
          'experiment_plan_light_ref',
          'baseline_gap_ref',
          'metric_ref',
          'dataset_version_ref',
          'baseline_version_ref',
          'code_version_ref',
          'config_ref',
          'budget_ref',
          'stop_condition_ref',
          'scope_boundary_ref',
        ],
        forbidden_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
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
        estimated_input_token_target: 32_000,
        estimated_output_token_budget: 3_000,
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
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    output: unknown,
  ): Record<string, unknown> {
    return {
      artifact_kind: `${runtimeBase.profile.slotId}.role_artifact_payload`,
      target_ref: request.target_ref,
      admitted_validation_cycle_artifact_ref: request.admitted_validation_cycle_artifact_ref,
      admitted_route_proposal_artifact_ref: request.admitted_route_proposal_artifact_ref,
      admitted_route_skeptic_artifact_ref: request.admitted_route_skeptic_artifact_ref,
      reviewed_cycle_candidate_keys: request.reviewed_cycle_candidate_keys,
      reviewed_route_candidate_keys: request.reviewed_route_candidate_keys,
      source_refs: request.source_refs,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      role_output: output,
    };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  ): PaperImplementationFeasibilityPlanningRoleOutput | null {
    const fixture = request.execution_mode === 'mocked_llm'
      ? request.mocked_role_outputs?.[PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID] ?? null
      : request.execution_mode === 'codex_assisted'
        ? request.codex_role_outputs?.[PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID] ?? null
        : null;
    return fixture ? this.normalizeFixtureEchoes(fixture, request) : null;
  }

  /**
   * S2-C C4 (sunk from the coordinator's alignFixtureChainEchoes): in the
   * non-product fixture modes the slot owns the mocked echo semantics. Only
   * absent (undefined/null) echo fields are synthesized from the request's
   * injected admitted upstream values; a present-but-drifted fixture echo is
   * deliberately left intact so the semantic drift gates stay testable when
   * the slot is called directly.
   */
  private normalizeFixtureEchoes(
    fixture: PaperImplementationFeasibilityPlanningRoleOutput,
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  ): PaperImplementationFeasibilityPlanningRoleOutput {
    const normalized = structuredClone(fixture);
    if (normalized.reviewed_validation_cycle_artifact_ref == null) {
      normalized.reviewed_validation_cycle_artifact_ref = request.admitted_validation_cycle_artifact_ref ?? null;
    }
    if (normalized.reviewed_validation_cycle_artifact_hash == null) {
      normalized.reviewed_validation_cycle_artifact_hash = request.admitted_validation_cycle_artifact_hash ?? null;
    }
    if (normalized.reviewed_route_proposal_ref == null) {
      normalized.reviewed_route_proposal_ref = request.admitted_route_proposal_artifact_ref ?? null;
    }
    if (normalized.reviewed_route_proposal_hash == null) {
      normalized.reviewed_route_proposal_hash = request.admitted_route_proposal_artifact_hash ?? null;
    }
    if (normalized.reviewed_route_skeptic_artifact_ref == null) {
      normalized.reviewed_route_skeptic_artifact_ref = request.admitted_route_skeptic_artifact_ref ?? null;
    }
    if (normalized.reviewed_route_skeptic_artifact_hash == null) {
      normalized.reviewed_route_skeptic_artifact_hash = request.admitted_route_skeptic_artifact_hash ?? null;
    }
    if (normalized.reviewed_cycle_candidate_keys == null) {
      normalized.reviewed_cycle_candidate_keys = [...(request.reviewed_cycle_candidate_keys ?? [])];
    }
    if (normalized.reviewed_route_candidate_keys == null) {
      normalized.reviewed_route_candidate_keys = [...(request.reviewed_route_candidate_keys ?? [])];
    }
    return normalized;
  }

  private assertRequest(request: RunPaperImplementationFeasibilityPlanningRuntimeRequest): void {
    if (request.source_refs.length !== request.source_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_refs and source_hashes must have the same length.');
    }
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== PROBE_PLAN_CANDIDATES_PROFILE.profileId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${PROBE_PLAN_CANDIDATES_PROFILE.profileId}.`,
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
      && !requestedModelOptionId.startsWith(`${PROBE_PLAN_CANDIDATES_PROFILE.profileId}.`)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must belong to runtime slot profile ${PROBE_PLAN_CANDIDATES_PROFILE.profileId}.`,
      );
    }
    if (request.execution_mode === 'mocked_llm' && !request.mocked_role_outputs?.[PROBE_PLAN_CANDIDATES_PROFILE.roleSlotId]) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_role_outputs.${PROBE_PLAN_CANDIDATES_PROFILE.roleSlotId} is required.`);
    }
    if (request.execution_mode === 'codex_assisted' && !request.codex_role_outputs?.[PROBE_PLAN_CANDIDATES_PROFILE.roleSlotId]) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_role_outputs.${PROBE_PLAN_CANDIDATES_PROFILE.roleSlotId} is required.`);
    }
    if (!request.admitted_validation_cycle_artifact_ref || !request.admitted_validation_cycle_artifact_hash) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'feasibility_planning requires admitted_validation_cycle_artifact_ref and admitted_validation_cycle_artifact_hash.',
      );
    }
    if (!request.admitted_route_proposal_artifact_ref || !request.admitted_route_proposal_artifact_hash) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'feasibility_planning requires admitted_route_proposal_artifact_ref and admitted_route_proposal_artifact_hash.',
      );
    }
    if (!request.admitted_route_skeptic_artifact_ref || !request.admitted_route_skeptic_artifact_hash) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'feasibility_planning requires admitted_route_skeptic_artifact_ref and admitted_route_skeptic_artifact_hash.',
      );
    }
    if (!request.reviewed_cycle_candidate_keys || request.reviewed_cycle_candidate_keys.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'feasibility_planning requires at least one reviewed_cycle_candidate_keys entry.',
      );
    }
    if (!request.reviewed_route_candidate_keys || request.reviewed_route_candidate_keys.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'feasibility_planning requires at least one reviewed_route_candidate_keys entry.',
      );
    }
  }

  private hasRoleOutputs(
    outputs: RunPaperImplementationFeasibilityPlanningRuntimeRequest['mocked_role_outputs']
      | RunPaperImplementationFeasibilityPlanningRuntimeRequest['codex_role_outputs'],
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private result(
    runtimeBase: RuntimeBase,
    status: 'passed' | 'blocked' | 'failed_runtime',
    providerCallCount: number,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
    admissions: PaperImplementationRuntimeAdmissionRecord[],
    finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null,
    finalAdmission: PaperImplementationRuntimeAdmissionRecord | null,
  ): PaperImplementationFeasibilityPlanningRuntimeResult {
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
    result: TopicSelectionAgentInvocationResult<PaperImplementationFeasibilityPlanningRoleOutput>,
  ): string | null {
    return result.status === 'succeeded' && result.structured_output
      ? null
      : result.error_code ?? 'AGENT_EXECUTION_FAILED';
  }

  private roleInvocationFailureCode(
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    result: TopicSelectionAgentInvocationResult<PaperImplementationFeasibilityPlanningRoleOutput>,
  ): string | null {
    const runtimeFailureCode = this.runtimeFailureCode(result);
    if (runtimeFailureCode) {
      return runtimeFailureCode;
    }
    // T-124 S3-α4 (S2-C single-source pattern) + 复审 F3-5: a wrong role_slot_id
    // echo is a retryable technical failure, not an HTTP 400.
    const echoCode = roleSlotEchoMismatchCode(result.structured_output, PROBE_PLAN_CANDIDATES_PROFILE.roleSlotId);
    if (echoCode) {
      return echoCode;
    }
    return this.semanticOutputFailureCode(request, result.structured_output);
  }

  private semanticOutputFailureCode(
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    output: PaperImplementationFeasibilityPlanningRoleOutput | null,
  ): string | null {
    if (!output) {
      return null;
    }
    if (output.role_status !== 'passed') {
      // T-124 S3 复审 F3-3: reconcile present-but-drifted upstream echo on blocked
      // outputs too (absent fields skipped; other blocked semantics unchanged).
      return this.blockedUpstreamEchoDriftCode(request, output);
    }
    if (
      !output.reviewed_validation_cycle_artifact_ref
      || !output.reviewed_validation_cycle_artifact_hash
      || !output.reviewed_route_proposal_ref
      || !output.reviewed_route_proposal_hash
      || !output.reviewed_route_skeptic_artifact_ref
      || !output.reviewed_route_skeptic_artifact_hash
      || !output.reviewed_cycle_candidate_keys
      || output.reviewed_cycle_candidate_keys.length === 0
      || !output.reviewed_route_candidate_keys
      || output.reviewed_route_candidate_keys.length === 0
    ) {
      return 'FEASIBILITY_PLANNING_PRIMARY_INPUT_MISSING';
    }
    if (
      output.reviewed_validation_cycle_artifact_hash !== request.admitted_validation_cycle_artifact_hash
      || !functionalRefEquals(
        output.reviewed_validation_cycle_artifact_ref,
        request.admitted_validation_cycle_artifact_ref,
      )
    ) {
      return 'FEASIBILITY_PLANNING_VALIDATION_CYCLE_MISMATCH';
    }
    if (
      output.reviewed_route_proposal_hash !== request.admitted_route_proposal_artifact_hash
      || !functionalRefEquals(
        output.reviewed_route_proposal_ref,
        request.admitted_route_proposal_artifact_ref,
      )
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_PROPOSAL_MISMATCH';
    }
    if (
      output.reviewed_route_skeptic_artifact_hash !== request.admitted_route_skeptic_artifact_hash
      || !functionalRefEquals(
        output.reviewed_route_skeptic_artifact_ref,
        request.admitted_route_skeptic_artifact_ref,
      )
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_SKEPTIC_MISMATCH';
    }
    if (
      !sameStringSet(output.reviewed_cycle_candidate_keys, request.reviewed_cycle_candidate_keys)
      || !this.candidateProposalsMatchReviewedCycleKeys(output, request.reviewed_cycle_candidate_keys)
    ) {
      return 'FEASIBILITY_PLANNING_CYCLE_CANDIDATE_KEY_MISMATCH';
    }
    if (
      !sameStringSet(output.reviewed_route_candidate_keys, request.reviewed_route_candidate_keys)
      || !this.candidateProposalsMatchReviewedRouteKeys(output, request.reviewed_route_candidate_keys)
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_CANDIDATE_KEY_MISMATCH';
    }
    if (!output.probe_plan_candidate_proposals || output.probe_plan_candidate_proposals.length < 2) {
      return 'FEASIBILITY_PLANNING_CANDIDATE_SET_INCOMPLETE';
    }
    if (this.hasUnblockedHighCostConfirmatoryOpenBaselineGap(output)) {
      return 'FEASIBILITY_PLANNING_CONFIRMATORY_BASELINE_GAP_OPEN';
    }
    if (
      output.no_domain_gate_request !== true
      || output.no_queue_side_effect !== true
      || output.no_feasibility_probe_side_effect !== true
      || output.no_experiment_plan_light_side_effect !== true
      || output.no_validation_cycle_side_effect !== true
    ) {
      return 'FEASIBILITY_PLANNING_SIDE_EFFECT_GUARD_MISSING';
    }
    return null;
  }

  /**
   * T-124 S3 复审 F3-3: present-but-drifted upstream echo reconciliation shared
   * by passed and blocked outputs — an absent field on a blocked output is
   * skipped, a present-but-drifted field fails closed with the matching code.
   */
  private blockedUpstreamEchoDriftCode(
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    output: PaperImplementationFeasibilityPlanningRoleOutput,
  ): string | null {
    if (
      output.reviewed_validation_cycle_artifact_ref
      && output.reviewed_validation_cycle_artifact_hash
      && (
        output.reviewed_validation_cycle_artifact_hash !== request.admitted_validation_cycle_artifact_hash
        || !functionalRefEquals(
          output.reviewed_validation_cycle_artifact_ref,
          request.admitted_validation_cycle_artifact_ref,
        )
      )
    ) {
      return 'FEASIBILITY_PLANNING_VALIDATION_CYCLE_MISMATCH';
    }
    if (
      output.reviewed_route_proposal_ref
      && output.reviewed_route_proposal_hash
      && (
        output.reviewed_route_proposal_hash !== request.admitted_route_proposal_artifact_hash
        || !functionalRefEquals(output.reviewed_route_proposal_ref, request.admitted_route_proposal_artifact_ref)
      )
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_PROPOSAL_MISMATCH';
    }
    if (
      output.reviewed_route_skeptic_artifact_ref
      && output.reviewed_route_skeptic_artifact_hash
      && (
        output.reviewed_route_skeptic_artifact_hash !== request.admitted_route_skeptic_artifact_hash
        || !functionalRefEquals(
          output.reviewed_route_skeptic_artifact_ref,
          request.admitted_route_skeptic_artifact_ref,
        )
      )
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_SKEPTIC_MISMATCH';
    }
    if (
      output.reviewed_cycle_candidate_keys
      && output.reviewed_cycle_candidate_keys.length > 0
      && !sameStringSet(output.reviewed_cycle_candidate_keys, request.reviewed_cycle_candidate_keys)
    ) {
      return 'FEASIBILITY_PLANNING_CYCLE_CANDIDATE_KEY_MISMATCH';
    }
    if (
      output.reviewed_route_candidate_keys
      && output.reviewed_route_candidate_keys.length > 0
      && !sameStringSet(output.reviewed_route_candidate_keys, request.reviewed_route_candidate_keys)
    ) {
      return 'FEASIBILITY_PLANNING_ROUTE_CANDIDATE_KEY_MISMATCH';
    }
    return null;
  }

  private candidateProposalsMatchReviewedCycleKeys(
    output: PaperImplementationFeasibilityPlanningRoleOutput,
    reviewedCandidateKeys: string[],
  ): boolean {
    const allowedKeys = new Set(reviewedCandidateKeys);
    return (output.probe_plan_candidate_proposals ?? []).every(
      (proposal) => allowedKeys.has(proposal.reviewed_cycle_candidate_key),
    );
  }

  private candidateProposalsMatchReviewedRouteKeys(
    output: PaperImplementationFeasibilityPlanningRoleOutput,
    reviewedCandidateKeys: string[],
  ): boolean {
    const allowedKeys = new Set(reviewedCandidateKeys);
    return (output.probe_plan_candidate_proposals ?? []).every(
      (proposal) => allowedKeys.has(proposal.reviewed_route_candidate_key),
    );
  }

  private hasUnblockedHighCostConfirmatoryOpenBaselineGap(
    output: PaperImplementationFeasibilityPlanningRoleOutput,
  ): boolean {
    return (output.probe_plan_candidate_proposals ?? []).some((proposal) =>
      proposal.confirmatory_marker === true
      && proposal.budget_envelope.estimated_cost_class === 'high'
      && proposal.baseline_gap_status === 'open'
      && proposal.blocker_codes.length === 0);
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

  private titleCardId(request: RunPaperImplementationFeasibilityPlanningRuntimeRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.input_snapshot_ref.title_card_id
      ?? request.admitted_validation_cycle_artifact_ref.title_card_id
      ?? request.admitted_route_proposal_artifact_ref.title_card_id
      ?? request.admitted_route_skeptic_artifact_ref.title_card_id
      ?? request.source_refs.find((ref) => ref.title_card_id)?.title_card_id
      ?? null;
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationFeasibilityPlanningRuntimeRequest,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: this.titleCardId(request),
      version_id: versionId,
    };
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
