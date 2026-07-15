import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema,
  paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema,
  paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema,
  paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema,
  type PaperImplementationMotiveEvolutionArtifact,
  type PaperImplementationMotiveEvolutionDecisionOption,
  type PaperImplementationMotiveEvolutionDecisionOptionEntry,
  type PaperImplementationMotiveEvolutionDesignedOptionEntry,
  type PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  type PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  type PaperImplementationMotiveEvolutionRoleOutput,
  type PaperImplementationMotiveEvolutionRoleSlotId,
  type PaperImplementationMotiveEvolutionSlotId,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeExecutorKind,
  type PaperImplementationRuntimeResponseReuseStatus,
  type RunPaperImplementationMotiveEvolutionRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  PaperImplementationAgentExecutionMode,
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
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  roleSlotEchoMismatchCode,
  semanticRefKey,
} from './paper-implementation-runtime-utils.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationMotiveEvolutionRuntimeResult {
  run_id: string;
  slot_id: PaperImplementationMotiveEvolutionSlotId;
  workflow_type: 'motive_evolution';
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

export type PaperImplementationMotiveEvolutionAgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationMotiveEvolutionAgentOrchestrator;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface SlotProfile {
  slotId: PaperImplementationMotiveEvolutionSlotId;
  workflowType: 'motive_evolution';
  profileId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  contextPolicyId: string;
  roleExecutorKind: PaperImplementationRuntimeExecutorKind;
  finalArtifactRefType: string;
  roleArtifactRefType: string;
  artifactContractId: string;
  promptPolicyId: string;
}

interface RoleProfile {
  roleSlotId: PaperImplementationMotiveEvolutionRoleSlotId;
  promptVariantId: string;
  schemaName: string;
  schema: Record<string, unknown>;
  /**
   * T-124 S3-β1: provider wire encoding of the role output — identical
   * guardrails, but the designed/decision option maps are transported as
   * entry arrays because dynamic-key maps are unrepresentable in OpenAI
   * strict structured output (the gateway normalizer degrades them to
   * always-empty objects; see gs001-lora-live-004).
   */
  wireSchemaName: string;
  wireSchema: Record<string, unknown>;
}

interface RecordedRuntimeArtifact<TOutput extends PaperImplementationMotiveEvolutionRoleOutput | null> {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
  output: TOutput;
}

interface RoleInvocationOutcome<TOutput extends PaperImplementationMotiveEvolutionRoleOutput> {
  result: TopicSelectionAgentInvocationResult<TOutput>;
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
  priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput | null>[];
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

const EVOLUTION_DECISION_SUPPORT_PROFILE: SlotProfile = {
  slotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  workflowType: 'motive_evolution',
  profileId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  promptTemplateId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
  promptTemplateVersion: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
  contextPolicyId: 'paper-implementation.motive-evolution.context-policy.v1',
  roleExecutorKind: 'single_agent',
  finalArtifactRefType: 'motive_evolution_runtime_artifact',
  roleArtifactRefType: 'motive_evolution_role_artifact',
  artifactContractId: 'MotiveEvolutionDecisionSupportArtifact',
  promptPolicyId: 'paper-implementation.motive-evolution.prompt-redaction.v1',
};

/**
 * S2-B B1: role schema names are sent verbatim as the OpenAI structured-output
 * `text.format.name`, whose hard limit is 64 characters — the previous
 * `..._role_output` names were 65 characters and made every provider_llm call
 * of this slot fail with InvalidRequestError (gs001-lora-live-002/003).
 * Both names stay unique per role and within the provider constraint
 * (`^[a-zA-Z0-9_-]{1,64}$`).
 */
const OPTION_DESIGNER_ROLE: RoleProfile = {
  roleSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  promptVariantId: 'evolution-option-designer.main',
  schemaName: 'paper_implementation_motive_evolution_option_designer_output',
  schema: paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema as unknown as Record<string, unknown>,
  wireSchemaName: 'paper_implementation_motive_evolution_option_designer_wire',
  wireSchema: paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema as unknown as Record<string, unknown>,
};

const RISK_CHALLENGER_ROLE: RoleProfile = {
  roleSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  promptVariantId: 'evolution-risk-challenger.main',
  schemaName: 'paper_implementation_motive_evolution_risk_challenger_output',
  schema: paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema as unknown as Record<string, unknown>,
  wireSchemaName: 'paper_implementation_motive_evolution_risk_challenger_wire',
  wireSchema: paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema as unknown as Record<string, unknown>,
};

const EVOLUTION_DECISION_SUPPORT_MODEL_OPTION_IDS = new Set([
  `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
  `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-quality`,
  `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-deep-reasoning`,
  `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.dashscope-thinking-budget`,
  `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.dashscope-budget`,
]);

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set<string>([
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  // T-124 S3-α4: a wrong role_slot_id echo is a retryable technical failure
  // (S2-C single-source constant), not an HTTP 400.
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  // T-124 S3-β1: a wire entry array with duplicate option_key values is a
  // provider-output quality defect at the transport layer — retried once on
  // the same profile like every other schema-shaped technical failure.
  'MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE',
  'MOTIVE_EVOLUTION_REQUIRED_REFS_MISSING',
  'MOTIVE_EVOLUTION_CONTEXT_PACKET_REF_MISMATCH',
  'MOTIVE_EVOLUTION_CONTEXT_PACKET_UNCOVERED',
  'MOTIVE_EVOLUTION_REVIEW_SET_MISMATCH',
  'MOTIVE_EVOLUTION_REF_MISMATCH',
  'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID',
  'MOTIVE_EVOLUTION_OPTION_SET_MISMATCH',
  'MOTIVE_EVOLUTION_CHALLENGE_COVERAGE_MISSING',
  'MOTIVE_EVOLUTION_BOUNDARY_BLOCKER_MISSING',
  'MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING',
  'MOTIVE_EVOLUTION_SIDE_EFFECT_GUARD_MISSING',
  'MOTIVE_EVOLUTION_AUTHORITY_FIELD_PRESENT',
]);

const FORBIDDEN_AUTHORITY_FIELDS = [
  'implementation_project_id',
  'runtime_artifact_id',
  'agent_workflow_harness_run_id',
  'implementation_proposal_artifact',
  'CreateMotiveEvolutionDecisionRequest',
  'create_motive_evolution_decision_request',
  'motive_evolution_decision_request',
  'ApplyMotivePortfolioDecisionRequest',
  'apply_motive_portfolio_decision_request',
  'motive_roles_after_decision',
  'change_set',
  'core_motive_version_patch',
  'application_status',
  'domain_gate_request',
  'queue_action',
  'writer_dto_payload',
  'board_draft',
  'board_summary',
  'board_state',
  'create_motive_evidence_board_version_request',
  'create_evidence_binding_request',
  'evidence_binding_id',
  'trace_repair_queue_item',
  'rendered_prompt_text',
  'raw_provider_output',
  'raw_provider_response',
  'cached_prior_output',
  'hidden_reasoning',
  'debate_transcript',
  'source_by_source_reviews',
] as const;

const FORBIDDEN_PRIMARY_REF_TYPES = new Set([
  'agent_workflow_harness_run',
  'implementation_proposal_artifact',
  'paper_implementation_proposal_artifact',
  'decision_work_queue_item',
  'trace_repair_queue_item',
]);

const PORTFOLIO_CHANGING_OPTION_KINDS = new Set(['supersede', 'merge', 'split', 'park', 'abandon']);
const PORTFOLIO_CHANGING_IMPACT_CLASSES = new Set([
  'semantic_version_change',
  'portfolio_role_change',
  'primary_or_active_set_change',
  'lineage_change',
]);

export class PaperImplementationMotiveEvolutionRuntimeService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationMotiveEvolutionAgentOrchestrator;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runEvolutionDecisionSupport(
    implementationProjectId: string,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
  ): Promise<PaperImplementationMotiveEvolutionRuntimeResult> {
    this.assertRequest(request);
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    const profile = EVOLUTION_DECISION_SUPPORT_PROFILE;
    const runId = request.run_id?.trim() || this.idFactory('pi_motive_evolution_runtime_run');
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
      const final = await this.recordPreflightBlockedFinalArtifact(
        runtimeBase,
        request,
        preflight,
        preflightBlockerCodes,
      );
      artifacts.push(final.artifact);
      admissions.push(final.admission);
      return this.result(runtimeBase, 'blocked', 0, artifacts, admissions, final.artifact, final.admission);
    }

    const designerInvocation = await this.invokeRoleWithBoundedRetry<
      PaperImplementationMotiveEvolutionOptionDesignerRoleOutput
    >(runtimeBase, request, OPTION_DESIGNER_ROLE, []);
    const designerArtifact = await this.recordRoleArtifact(
      runtimeBase,
      request,
      OPTION_DESIGNER_ROLE,
      designerInvocation,
      [],
    );
    artifacts.push(designerArtifact.artifact);
    admissions.push(designerArtifact.admission);

    if (
      designerArtifact.admission.admission_status !== 'admitted'
      || designerArtifact.artifact.runtime_status === 'failed_runtime'
      || !designerArtifact.output
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
    const admittedDesignerArtifact =
      designerArtifact as RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput>;

    const challengerInvocation = await this.invokeRoleWithBoundedRetry<
      PaperImplementationMotiveEvolutionRiskChallengerRoleOutput
    >(runtimeBase, request, RISK_CHALLENGER_ROLE, [admittedDesignerArtifact]);
    const challengerArtifact = await this.recordRoleArtifact(
      runtimeBase,
      request,
      RISK_CHALLENGER_ROLE,
      challengerInvocation,
      [admittedDesignerArtifact],
    );
    artifacts.push(challengerArtifact.artifact);
    admissions.push(challengerArtifact.admission);

    if (
      challengerArtifact.admission.admission_status !== 'admitted'
      || challengerArtifact.artifact.runtime_status === 'failed_runtime'
      || !challengerArtifact.output
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
    const admittedChallengerArtifact =
      challengerArtifact as RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput>;

    const blockerCodes = this.outputBlockerCodes(admittedChallengerArtifact.output, admittedChallengerArtifact.artifact.blocker_codes);
    const warningCodes = this.outputWarningCodes(admittedChallengerArtifact.output, admittedChallengerArtifact.artifact.warning_codes);
    const finalStatus = blockerCodes.length > 0 || admittedChallengerArtifact.output.role_status === 'blocked'
      ? 'blocked'
      : 'passed';
    const final = await this.recordFinalArtifact(runtimeBase, request, {
      roleArtifacts: [admittedDesignerArtifact, admittedChallengerArtifact],
      status: finalStatus,
      runtimeFailureCode: null,
      providerCallCount: this.totalProviderCalls(artifacts),
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

  private async invokeRoleWithBoundedRetry<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): Promise<RoleInvocationOutcome<TOutput>> {
    let providerCallCount = 0;
    for (let retryAttemptIndex = 0; retryAttemptIndex <= MAX_TECHNICAL_RETRY_ATTEMPT_INDEX; retryAttemptIndex += 1) {
      const result = await this.invokeRole<TOutput>(runtimeBase, request, role, retryAttemptIndex, priorRoleArtifacts);
      providerCallCount += this.providerCallCount(result);
      const runtimeFailureCode = this.roleInvocationFailureCode(runtimeBase, request, role, result, priorRoleArtifacts);
      const shouldRetry = request.execution_mode === 'provider_llm'
        && retryAttemptIndex < MAX_TECHNICAL_RETRY_ATTEMPT_INDEX
        && runtimeFailureCode !== null
        && RETRYABLE_RUNTIME_FAILURE_CODES.has(runtimeFailureCode);
      if (!shouldRetry) {
        return { result, retryAttemptIndex, providerCallCount };
      }
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'Motive-evolution runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    retryAttemptIndex: number,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): Promise<TopicSelectionAgentInvocationResult<TOutput>> {
    const output = this.fixtureOutputForMode(request, role.roleSlotId) as TOutput | null;
    const messages = this.roleMessages(runtimeBase, request, role, priorRoleArtifacts);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(role.roleSlotId)}.call-1`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    const invocationResult = await this.agentOrchestrator.invokeStructuredOutput<TOutput>({
      title_card_id: runtimeBase.titleCardId,
      feature_id: 'paper_implementation',
      node_id: role.roleSlotId,
      workflow_run_id: runtimeBase.runId,
      node_attempt_id: `${runtimeBase.runId}.${this.safeId(role.roleSlotId)}.attempt-0`,
      invocation_attempt_id: invocationAttemptId,
      execution_mode: request.execution_mode,
      executor_kind: 'single_agent',
      run_mode: this.topicRunMode(request.run_mode),
      profile_id: runtimeBase.modelProfileId,
      output_contract: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: runtimeBase.profile.promptTemplateId,
        version: runtimeBase.profile.promptTemplateVersion,
      },
      prompt_variant_key: role.promptVariantId,
      // S3-β1: provider_llm sends the wire encoding (option entry arrays);
      // mocked/codex fixtures keep the canonical by-key-map schema.
      schema_name: this.roleSchemaName(request, role),
      schema: request.execution_mode === 'provider_llm' ? role.wireSchema : role.schema,
      messages,
      input_refs: this.primaryInputRefs(request),
      context_packet_refs: [{
        ref_type: 'artifact_ref',
        ref_id: `${runtimeBase.runId}.source-bundle`,
        title_card_id: runtimeBase.titleCardId,
      }],
      context_packet_hashes: [
        runtimeBase.sourceHashBundleHash,
        ...priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      ],
      runtime_token_budget: this.runtimeTokenBudget(runtimeBase, request, role, messages, priorRoleArtifacts),
      debate_extension: {
        debate_loop_id: runtimeBase.runId,
        debate_policy_id: 'paper-implementation.motive-evolution.two-role-controlled-debate.v1',
        round_index: priorRoleArtifacts.length + 1,
        role: role.roleSlotId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID
          ? 'explorer'
          : 'deep_critic',
        stage: role.roleSlotId,
        agent_instance_id: role.roleSlotId,
        parent_invocation_attempt_ids: priorRoleArtifacts.map((item) => item.artifact.runtime_artifact_id),
      },
      mocked_output: request.execution_mode === 'mocked_llm' && output
        ? {
          fixture_id: `${runtimeBase.runId}.${this.safeId(role.roleSlotId)}.fixture`,
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
    return request.execution_mode === 'provider_llm'
      ? this.canonicalizedWireInvocationResult(invocationResult)
      : invocationResult;
  }

  /** S3-β1: mode-dependent output schema name (wire for provider_llm). */
  private roleSchemaName(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
  ): string {
    return request.execution_mode === 'provider_llm' ? role.wireSchemaName : role.schemaName;
  }

  /**
   * S3-β1: canonicalize a provider wire output — rebuild the by-key option
   * maps from the transported entry arrays so every recorded artifact,
   * admission expectation, and semantic check keeps the canonical shape.
   * Duplicate option_key values fail closed as a retryable technical failure.
   * Outputs without a wire entry array pass through untouched (fixture stubs
   * that bypass the orchestrator's ajv gate; a real provider output cannot
   * reach here in canonical form because the wire schema forbids the map
   * fields via additionalProperties: false).
   */
  private canonicalizedWireInvocationResult<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    result: TopicSelectionAgentInvocationResult<TOutput>,
  ): TopicSelectionAgentInvocationResult<TOutput> {
    const output = result.structured_output;
    if (!output || typeof output !== 'object') {
      return result;
    }
    const record = output as unknown as Record<string, unknown>;
    const isDesignerWire = 'designed_option_entries' in record;
    const isChallengerWire = 'decision_option_entries' in record;
    if (!isDesignerWire && !isChallengerWire) {
      return result;
    }
    const entriesKey = isDesignerWire ? 'designed_option_entries' : 'decision_option_entries';
    const mapKey = isDesignerWire ? 'designed_options' : 'decision_options';
    const entries = record[entriesKey];
    if (!Array.isArray(entries)) {
      return this.wireCanonicalizationFailure(result, 'SCHEMA_VALIDATION_FAILED');
    }
    // T-124 S3 复审 F3-1: a null-prototype map so option_key values that collide
    // with Object.prototype members ('__proto__', 'constructor', …) become plain
    // own properties — Object.hasOwn dedup and assignment both stay well-defined,
    // and the recorded canonical map carries no prototype pollution.
    const optionsByKey = Object.create(null) as Record<string, unknown>;
    for (const entry of entries as Array<
      PaperImplementationMotiveEvolutionDesignedOptionEntry | PaperImplementationMotiveEvolutionDecisionOptionEntry
    >) {
      if (!entry || typeof entry !== 'object' || typeof entry.option_key !== 'string' || entry.option_key.length === 0) {
        return this.wireCanonicalizationFailure(result, 'SCHEMA_VALIDATION_FAILED');
      }
      if (Object.hasOwn(optionsByKey, entry.option_key)) {
        return this.wireCanonicalizationFailure(result, 'MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE');
      }
      const { option_key: _optionKey, ...optionValue } = entry;
      optionsByKey[entry.option_key] = optionValue;
    }
    const { [entriesKey]: _entries, ...rest } = record;
    const canonical = { ...rest, [mapKey]: optionsByKey } as unknown as TOutput;
    return { ...result, structured_output: canonical };
  }

  private wireCanonicalizationFailure<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    result: TopicSelectionAgentInvocationResult<TOutput>,
    failureCode: string,
  ): TopicSelectionAgentInvocationResult<TOutput> {
    return {
      ...result,
      structured_output: null,
      error_code: failureCode,
      blocker_codes: this.uniqueStrings([...result.blocker_codes, failureCode]),
    };
  }

  private async recordPreflightBlockedArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    blockerCodes: string[],
  ): Promise<RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput>> {
    const runtimeControl: RuntimeControl = {
      terminal_code: 'preflight_blocked',
      reason_kind: 'missing_or_invalid_required_refs',
      details: { blocker_codes: blockerCodes },
    };
    // S2-C C3: the preflight terminal is a blocked (admitted) role output, not
    // a failed_runtime artifact — unified preflight semantics across slots.
    const output: PaperImplementationMotiveEvolutionOptionDesignerRoleOutput = {
      role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
      role_status: 'blocked',
      summary: 'Deterministic motive-evolution preflight found blockers before provider execution.',
      cited_source_refs: [...request.source_refs],
      support_result_status: 'blocked',
      blocker_codes: blockerCodes,
      warning_codes: [],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_motive_write_side_effect: true,
      no_motive_evolution_side_effect: true,
      no_portfolio_mutation_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_trace_repair_queue_side_effect: true,
      reviewed_target_motive_refs: [],
      reviewed_core_motive_version_refs: [],
      designed_options: {},
      option_set_hash: this.hash({ designed_options: {} }),
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output, runtimeControl, []);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: 'preflight_blocked',
      promptPacketHash: this.hash({
        run_id: runtimeBase.runId,
        role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
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

  /**
   * S2-C C3: builds the blocked final artifact for the preflight-blocked path.
   * The regular final builder requires the designer+challenger role tuple; the
   * preflight terminal has only the deterministic preflight role artifact, so
   * the blocked final payload is assembled directly here (same envelope
   * discipline: blocked status, blocker codes, admitted via final admission).
   */
  private async recordPreflightBlockedFinalArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    preflight: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput>,
    blockerCodes: string[],
  ): Promise<{ artifact: PaperImplementationRuntimeArtifactEnvelope; admission: PaperImplementationRuntimeAdmissionRecord }> {
    const finalPayload: PaperImplementationMotiveEvolutionArtifact = {
      status: 'blocked',
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      target_ref: request.target_ref,
      target_motive_refs: [...request.target_motive_refs],
      target_core_motive_version_refs: [...request.target_core_motive_version_refs],
      preflight_blockers: this.uniqueStrings(blockerCodes),
      support_result_status: 'blocked',
      role_summary: preflight.output.summary,
      role_blocker_codes: [...preflight.output.blocker_codes],
      role_warning_codes: [],
      blockers: this.uniqueStrings(blockerCodes),
      warnings: [],
      runtime_failure_code: null,
      decision_options: {},
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_motive_write_side_effect: true,
      no_motive_evolution_side_effect: true,
      no_portfolio_mutation_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_trace_repair_queue_side_effect: true,
      role_artifact_refs: [preflight.artifact.artifact_payload_ref],
      role_artifact_hashes: [preflight.artifact.artifact_payload_hash],
      admitted_role_artifact_refs: preflight.admission.admitted_artifact_ref
        ? [preflight.admission.admitted_artifact_ref]
        : [],
      admitted_role_artifact_hashes: preflight.admission.admitted_artifact_hash
        ? [preflight.admission.admitted_artifact_hash]
        : [],
      role_prompt_packet_refs: [preflight.artifact.prompt_packet_ref],
      role_prompt_packet_hashes: [preflight.artifact.prompt_packet_hash],
      role_token_budget_gate_result_refs: [preflight.artifact.token_budget_gate_result_ref],
      role_compression_report_refs: [],
      runtime_identity: {
        run_id: runtimeBase.runId,
        slot_id: runtimeBase.profile.slotId,
        preflight_role_artifact_hash: preflight.artifact.artifact_payload_hash,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      },
      cache_identity: {
        context_cache_key_hashes: [preflight.artifact.context_cache_key_hash],
        prompt_packet_cache_key_hashes: [preflight.artifact.prompt_packet_cache_key_hash],
      },
      source_refs: [...request.source_refs],
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
    };
    const finalArtifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'final',
      roleSlotId: null,
      callIndex: null,
      executorKind: runtimeBase.profile.roleExecutorKind,
      artifactContractId: runtimeBase.profile.artifactContractId,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_FINAL_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.finalArtifactRefType,
      artifactPayloadSeed: 'final',
      promptPacketHash: preflight.artifact.prompt_packet_hash,
      promptVariantId: 'final',
      runtimeStatus: 'blocked',
      runtimeFailureCode: null,
      retryAttemptIndex: 0,
      providerCallCount: 0,
      blockerCodes,
      warningCodes: [],
      output: finalPayload,
      artifactPayload: finalPayload as unknown as Record<string, unknown>,
      priorRoleArtifacts: [preflight],
      finalArtifactHash: this.hash(finalPayload),
      finalArtifactRefType: runtimeBase.profile.finalArtifactRefType,
      modelOptionId: runtimeBase.modelOptionId,
      auditHash: this.hash({
        run_id: runtimeBase.runId,
        final_payload_hash: this.hash(finalPayload),
        role_artifact_hash: preflight.artifact.artifact_payload_hash,
      }),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(finalArtifact);
    const admission = await this.admit(stored, 'final');
    return { artifact: stored, admission };
  }

  private async recordRoleArtifact<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    roleInvocation: RoleInvocationOutcome<TOutput>,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): Promise<RecordedRuntimeArtifact<TOutput | null>> {
    const roleResult = roleInvocation.result;
    const output = roleResult.structured_output;
    const runtimeFailureCode = this.roleInvocationFailureCode(runtimeBase, request, role, roleResult, priorRoleArtifacts);
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
    const artifactPayload = this.roleArtifactPayload(
      runtimeBase,
      request,
      artifactOutput,
      runtimeControl,
      priorRoleArtifacts,
    );
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: role.roleSlotId,
      callIndex: priorRoleArtifacts.length + 1,
      executorKind: runtimeBase.profile.roleExecutorKind,
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: role.roleSlotId,
      promptPacketHash: roleResult.provenance.prompt_packet_hash,
      promptVariantId: role.promptVariantId,
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
      priorRoleArtifacts,
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
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    input: {
      roleArtifacts: [
        RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput>,
        RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput>,
      ];
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
      outputSchemaId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_FINAL_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.finalArtifactRefType,
      artifactPayloadSeed: 'final',
      promptPacketHash: input.roleArtifacts[1].artifact.prompt_packet_hash,
      promptVariantId: 'final',
      runtimeStatus: input.status,
      runtimeFailureCode: input.runtimeFailureCode,
      retryAttemptIndex: 0,
      providerCallCount: input.providerCallCount,
      blockerCodes: input.blockerCodes,
      warningCodes: input.warningCodes,
      output: finalPayload,
      artifactPayload: finalPayload as unknown as Record<string, unknown>,
      priorRoleArtifacts: input.roleArtifacts,
      finalArtifactHash: this.hash(finalPayload),
      finalArtifactRefType: runtimeBase.profile.finalArtifactRefType,
      modelOptionId: input.roleArtifacts[1].artifact.model_option_id ?? runtimeBase.modelOptionId,
      auditHash: this.hash({
        run_id: runtimeBase.runId,
        final_payload_hash: this.hash(finalPayload),
        role_artifact_hashes: input.roleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      }),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(finalArtifact);
    const admission = await this.admit(stored, 'final');
    return { artifact: stored, admission };
  }

  private buildRuntimeArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
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
    const optionSetHash = this.optionSetHashFromArtifacts(input.priorRoleArtifacts, input.output);
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
      target_motive_refs: request.target_motive_refs,
      target_core_motive_version_refs: request.target_core_motive_version_refs,
      prompt_packet_hash: promptPacketHash,
      output_schema_id: input.outputSchemaId,
      execution_mode: request.execution_mode,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      option_set_hash: optionSetHash,
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
        prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
        option_set_hash: optionSetHash,
      }),
      context_cache_status: 'miss',
      context_cache_result_ref: null,
      context_cache_result_hash: null,
      prompt_packet_cache_key_hash: this.hash({
        cache: 'prompt',
        prompt_packet_hash: promptPacketHash,
        role_slot_id: input.roleSlotId,
        prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
        option_set_hash: optionSetHash,
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
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    input: {
      roleArtifacts: [
        RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput>,
        RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput>,
      ];
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): PaperImplementationMotiveEvolutionArtifact {
    const [designerArtifact, challengerArtifact] = input.roleArtifacts;
    const challengerOutput = challengerArtifact.output;
    const admittedRoleRefs = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_ref)
      .filter((item): item is TopicSelectionFunctionalRef => item !== null);
    const admittedRoleHashes = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_hash)
      .filter((item): item is string => item !== null);
    return {
      status: input.status,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      target_ref: request.target_ref,
      target_motive_refs: [...request.target_motive_refs],
      target_core_motive_version_refs: [...request.target_core_motive_version_refs],
      preflight_blockers: this.uniqueStrings(request.preflight_blocker_codes ?? []),
      support_result_status: challengerOutput.support_result_status,
      role_summary: challengerOutput.summary,
      role_blocker_codes: challengerOutput.blocker_codes,
      role_warning_codes: challengerOutput.warning_codes,
      blockers: this.uniqueStrings(input.blockerCodes),
      warnings: this.uniqueStrings(input.warningCodes),
      runtime_failure_code: input.runtimeFailureCode,
      decision_options: challengerOutput.decision_options,
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_motive_write_side_effect: true,
      no_motive_evolution_side_effect: true,
      no_portfolio_mutation_side_effect: true,
      no_board_write_side_effect: true,
      no_evidence_binding_side_effect: true,
      no_trace_repair_queue_side_effect: true,
      role_artifact_refs: input.roleArtifacts.map((item) => item.artifact.artifact_payload_ref),
      role_artifact_hashes: input.roleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      admitted_role_artifact_refs: admittedRoleRefs,
      admitted_role_artifact_hashes: admittedRoleHashes,
      role_prompt_packet_refs: input.roleArtifacts.map((item) => item.artifact.prompt_packet_ref),
      role_prompt_packet_hashes: input.roleArtifacts.map((item) => item.artifact.prompt_packet_hash),
      role_token_budget_gate_result_refs: input.roleArtifacts.map((item) => item.artifact.token_budget_gate_result_ref),
      role_compression_report_refs: input.roleArtifacts
        .map((item) => item.artifact.compression_report_ref)
        .filter((item): item is TopicSelectionFunctionalRef => item !== null),
      runtime_identity: {
        run_id: runtimeBase.runId,
        slot_id: runtimeBase.profile.slotId,
        designer_role_artifact_hash: designerArtifact.artifact.artifact_payload_hash,
        challenger_role_artifact_hash: challengerArtifact.artifact.artifact_payload_hash,
        option_set_hash: challengerOutput.option_set_hash,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      },
      cache_identity: {
        context_cache_key_hashes: input.roleArtifacts.map((item) => item.artifact.context_cache_key_hash),
        prompt_packet_cache_key_hashes: input.roleArtifacts.map((item) => item.artifact.prompt_packet_cache_key_hash),
        designer_role_artifact_hash: designerArtifact.artifact.artifact_payload_hash,
        option_set_hash: challengerOutput.option_set_hash,
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
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    runId: string,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile(profile);
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const sourceHashBundleHash = this.hash({
      target_ref: request.target_ref,
      target_motive_refs: request.target_motive_refs,
      target_motive_hashes: request.target_motive_hashes,
      target_core_motive_version_refs: request.target_core_motive_version_refs,
      target_core_motive_version_hashes: request.target_core_motive_version_hashes,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      portfolio_snapshot_ref: request.portfolio_snapshot_ref,
      portfolio_snapshot_hash: request.portfolio_snapshot_hash,
      evidence_board_refs: request.evidence_board_refs,
      evidence_board_hashes: request.evidence_board_hashes,
      evidence_binding_refs: request.evidence_binding_refs,
      evidence_binding_hashes: request.evidence_binding_hashes,
      challenge_refs: request.challenge_refs,
      conflict_refs: request.conflict_refs,
      trace_manifest_refs: request.trace_manifest_refs,
      trace_manifest_hashes: request.trace_manifest_hashes,
      human_confirmation_policy_ref: request.human_confirmation_policy_ref,
      human_confirmation_policy_hash: request.human_confirmation_policy_hash,
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      motive_context_packets: request.motive_context_packets ?? [],
      validation_cycle_refs: request.validation_cycle_refs ?? [],
      validation_cycle_hashes: request.validation_cycle_hashes ?? [],
      result_packet_refs: request.result_packet_refs ?? [],
      result_packet_hashes: request.result_packet_hashes ?? [],
      cross_board_review_refs: request.cross_board_review_refs ?? [],
      cross_board_review_hashes: request.cross_board_review_hashes ?? [],
      prior_evolution_decision_refs: request.prior_evolution_decision_refs ?? [],
      prior_evolution_decision_hashes: request.prior_evolution_decision_hashes ?? [],
      prior_portfolio_decision_refs: request.prior_portfolio_decision_refs ?? [],
      prior_portfolio_decision_hashes: request.prior_portfolio_decision_hashes ?? [],
      accepted_risk_refs: request.accepted_risk_refs ?? [],
      accepted_risk_hashes: request.accepted_risk_hashes ?? [],
      human_request_refs: request.human_request_refs ?? [],
      human_request_hashes: request.human_request_hashes ?? [],
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
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const isChallenger = role.roleSlotId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID;
    // T-124 S3 复审 F3-2: the option payload shape differs by execution mode, so
    // the prompt wording must match the schema each mode actually validates
    // against — provider_llm sends the wire entry arrays; mocked_llm and
    // codex_assisted keep the canonical by-key maps. Describing entry arrays to a
    // canonical-map mode (or vice versa) contradicts the enforced schema.
    const isWireEncoding = request.execution_mode === 'provider_llm';
    const optionShapeNoun = isWireEncoding ? 'option entry array' : 'option map';
    const designerInstruction = isWireEncoding
      ? 'Propose evolution options as designed_option_entries: an array where every entry carries a unique runtime-local option_key (not a MotiveEvolutionDecision id) plus the full option fields, and set option_set_hash to a stable identity of exactly 64 lowercase hex characters.'
      : 'Propose evolution options as designed_options: an object keyed by a unique runtime-local option_key (not a MotiveEvolutionDecision id) whose value carries the full option fields, and set option_set_hash to a stable identity of exactly 64 lowercase hex characters.';
    const challengerInstruction = isWireEncoding
      ? 'Challenge every designer option key: echo designer_role_artifact_ref, designer_role_artifact_hash, and option_set_hash exactly from prior_role_artifacts, list every designer option key in challenged_option_keys, and return decision_option_entries as an array with exactly one entry per challenged option key; each entry repeats its option_key and carries a complete challenge_check.'
      : 'Challenge every designer option key: echo designer_role_artifact_ref, designer_role_artifact_hash, and option_set_hash exactly from prior_role_artifacts, list every designer option key in challenged_option_keys, and return decision_options as an object keyed by option_key with exactly one entry per challenged option key; each entry carries a complete challenge_check.';
    return [
      {
        role: 'system',
        // Prompt template v2 (T-124 S3-β1/复审 F3-2): the option payload travels
        // as an entry array (wire encoding) only for provider_llm; other modes use
        // the canonical by-key maps. Result-status invariants are stated
        // explicitly instead of being left to schema inference.
        content: [
          'Return only structured JSON for PaperImplementation motive evolution decision support.',
          'Use request-owned refs as the only authority and preserve motive, core motive version, portfolio, evidence, trace, validation, result, accepted-risk, human-confirmation, and source refs exactly.',
          isChallenger ? challengerInstruction : designerInstruction,
          `Result-status invariants: support_result_status="options_proposed" requires role_status="passed" and a non-empty ${optionShapeNoun}; "no_evolution_needed" requires role_status="passed", an empty ${optionShapeNoun}, and empty blocker_codes; "blocked" requires role_status="blocked" and at least one blocker_codes entry.`,
          'Do not create motive evolution decisions, portfolio decisions, motive role changes, board/evidence writes, trace repair queue items, queue items, Domain Gate requests, prompt text, debate transcripts, or raw provider output.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          slot_id: runtimeBase.profile.slotId,
          role_slot_id: role.roleSlotId,
          target_ref: request.target_ref,
          target_motive_refs: request.target_motive_refs,
          target_core_motive_version_refs: request.target_core_motive_version_refs,
          input_snapshot_ref: request.input_snapshot_ref,
          input_snapshot_hash: request.input_snapshot_hash,
          portfolio_snapshot_ref: request.portfolio_snapshot_ref,
          portfolio_snapshot_hash: request.portfolio_snapshot_hash,
          evidence_board_refs: request.evidence_board_refs,
          evidence_binding_refs: request.evidence_binding_refs,
          challenge_refs: request.challenge_refs,
          conflict_refs: request.conflict_refs,
          trace_manifest_refs: request.trace_manifest_refs,
          human_confirmation_policy_ref: request.human_confirmation_policy_ref,
          source_refs: request.source_refs,
          motive_context_packets: request.motive_context_packets ?? [],
          trigger_refs: {
            validation_cycle_refs: request.validation_cycle_refs ?? [],
            result_packet_refs: request.result_packet_refs ?? [],
            cross_board_review_refs: request.cross_board_review_refs ?? [],
            prior_evolution_decision_refs: request.prior_evolution_decision_refs ?? [],
            prior_portfolio_decision_refs: request.prior_portfolio_decision_refs ?? [],
            accepted_risk_refs: request.accepted_risk_refs ?? [],
            human_request_refs: request.human_request_refs ?? [],
          },
          prior_role_artifacts: priorRoleArtifacts.map((item) => ({
            role_slot_id: item.artifact.role_slot_id,
            artifact_ref: item.artifact.artifact_payload_ref,
            artifact_hash: item.artifact.artifact_payload_hash,
            option_set_hash: this.optionSetHashFromOutput(item.output),
          })),
          source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
        }),
      },
    ];
  }

  // S2-A / PC-S4 boundary note: the motive slots are documented-as-within-budget —
  // their expected product inputs (portfolio refs + bounded motive context packets)
  // sit well inside the 36k input target, so the caller-side compression attempt
  // (PC-S1..S3) is deliberately NOT wired here. NOTE the request DOES carry a
  // `motive_context_packets` body face; if product telemetry ever shows this slot
  // hitting `TOKEN_BUDGET_REQUIRES_COMPRESSION`, wire the shared
  // `buildPaperImplementationCompressionAttempt` builder exactly like the six packet
  // slots. Until then over-budget stays fail-closed
  // (L5 `motive_evolution_over_budget_zero_provider_calls`). The N3 token
  // double-count fix below applies here regardless.
  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      // N3 double-count fix: the request body (incl. motive_context_packets and prior
      // role artifact identity) is already embedded verbatim in `messages`;
      // context_payloads must not re-carry the same content — the estimate below is
      // the single source of truth.
      context_payloads: [],
      extra_payloads: [{
        slot_id: runtimeBase.profile.slotId,
        role_slot_id: role.roleSlotId,
        target_motive_ref_count: request.target_motive_refs.length,
        target_core_motive_version_ref_count: request.target_core_motive_version_refs.length,
        evidence_board_ref_count: request.evidence_board_refs.length,
        evidence_binding_ref_count: request.evidence_binding_refs.length,
        trace_manifest_ref_count: request.trace_manifest_refs.length,
        context_packet_count: request.motive_context_packets?.length ?? 0,
        prior_role_artifact_count: priorRoleArtifacts.length,
      }],
      estimated_input_tokens_override: this.estimatedInputTokens({ messages }),
      schema_overhead_tokens_override: 2_000,
    };
  }

  private contextPolicyProfile(profile: SlotProfile): TopicSelectionContextPolicyProfile {
    return {
      schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
      context_policy_profile_id: profile.contextPolicyId,
      context_policy_profile_version: 'v1',
      invocation_slot_id: profile.slotId,
      functional_template: 'support_only_semantic',
      execution_modifiers: [
        'provider_required_live',
        'codex_exact_reuse_allowed',
        'mock_replay_allowed',
        'compression_allowed_with_quality_gate',
      ],
      context_family: 'paper_implementation_motive_evolution',
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
          'portfolio_snapshot_ref',
          'evidence_board_ref',
          'evidence_binding_ref',
          'challenge_ref',
          'conflict_ref',
          'trace_manifest_ref',
          'trace_manifest_hash',
          'validation_cycle_ref',
          'result_packet_ref',
          'prior_decision_ref',
          'accepted_risk_ref',
          'human_confirmation_policy_ref',
          'option_key',
          'option_set_hash',
          'blocker_code',
        ],
        forbidden_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
          'writer_dto_payload',
          'debate_transcript',
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
          'designer_role_artifact_hash',
          'option_set_hash',
        ],
        stale_behavior: 'block',
        post_cache_gates: [
          'schema_validation',
          'role_artifact_admission',
          'runtime_admission',
          'authority_boundary',
        ],
      },
      token_budget_policy: {
        estimated_input_token_target: 36_000,
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
        'role_artifact_admission',
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
          'writer_dto_payload',
          'debate_transcript',
        ],
      },
      redaction_policy: `${profile.slotId}.redaction.v1`,
    };
  }

  private roleArtifactPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    output: unknown,
    runtimeControl: RuntimeControl | null,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): Record<string, unknown> {
    return {
      artifact_kind: `${runtimeBase.profile.slotId}.role_artifact_payload`,
      target_ref: request.target_ref,
      target_motive_refs: request.target_motive_refs,
      target_core_motive_version_refs: request.target_core_motive_version_refs,
      portfolio_snapshot_ref: request.portfolio_snapshot_ref,
      evidence_board_refs: request.evidence_board_refs,
      evidence_binding_refs: request.evidence_binding_refs,
      challenge_refs: request.challenge_refs,
      conflict_refs: request.conflict_refs,
      trace_manifest_refs: request.trace_manifest_refs,
      human_confirmation_policy_ref: request.human_confirmation_policy_ref,
      source_refs: request.source_refs,
      motive_context_packets: request.motive_context_packets ?? [],
      prior_role_artifact_refs: priorRoleArtifacts.map((item) => item.artifact.artifact_payload_ref),
      prior_role_artifact_hashes: priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      runtime_control: runtimeControl,
      role_output: output,
    };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    roleSlotId: PaperImplementationMotiveEvolutionRoleSlotId,
  ): PaperImplementationMotiveEvolutionRoleOutput | null {
    if (request.execution_mode === 'mocked_llm') {
      return request.mocked_role_outputs?.[roleSlotId] ?? null;
    }
    if (request.execution_mode === 'codex_assisted') {
      return request.codex_role_outputs?.[roleSlotId] ?? null;
    }
    return null;
  }

  private assertRequest(request: RunPaperImplementationMotiveEvolutionRuntimeRequest): void {
    this.assertRefHashLengths(request);
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== EVOLUTION_DECISION_SUPPORT_PROFILE.profileId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${EVOLUTION_DECISION_SUPPORT_PROFILE.profileId}.`,
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
      && !EVOLUTION_DECISION_SUPPORT_MODEL_OPTION_IDS.has(requestedModelOptionId)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must be defined by runtime slot profile ${EVOLUTION_DECISION_SUPPORT_PROFILE.profileId}.`,
      );
    }
    if (
      request.execution_mode === 'mocked_llm'
      && !request.mocked_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_role_outputs.${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID} is required.`);
    }
    if (
      request.execution_mode === 'mocked_llm'
      && !request.mocked_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_role_outputs.${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID} is required.`);
    }
    if (
      request.execution_mode === 'codex_assisted'
      && !request.codex_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_role_outputs.${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID} is required.`);
    }
    if (
      request.execution_mode === 'codex_assisted'
      && !request.codex_role_outputs?.[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_role_outputs.${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID} is required.`);
    }
    if (this.hasForbiddenAuthorityField(request)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'motive_evolution runtime request must not include production authority or raw-provider fields.');
    }
    const forbiddenPrimaryRef = this.primaryInputRefs(request).find((ref) => FORBIDDEN_PRIMARY_REF_TYPES.has(ref.ref_type));
    if (forbiddenPrimaryRef) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `motive_evolution forbids primary input ref_type=${forbiddenPrimaryRef.ref_type}.`,
      );
    }
  }

  private assertRefHashLengths(request: RunPaperImplementationMotiveEvolutionRuntimeRequest): void {
    const pairs: Array<[string, TopicSelectionFunctionalRef[] | undefined, string[] | undefined]> = [
      ['target_motive', request.target_motive_refs, request.target_motive_hashes],
      ['target_core_motive_version', request.target_core_motive_version_refs, request.target_core_motive_version_hashes],
      ['evidence_board', request.evidence_board_refs, request.evidence_board_hashes],
      ['evidence_binding', request.evidence_binding_refs, request.evidence_binding_hashes],
      ['trace_manifest', request.trace_manifest_refs, request.trace_manifest_hashes],
      ['source', request.source_refs, request.source_hashes],
      ['validation_cycle', request.validation_cycle_refs, request.validation_cycle_hashes],
      ['result_packet', request.result_packet_refs, request.result_packet_hashes],
      ['cross_board_review', request.cross_board_review_refs, request.cross_board_review_hashes],
      ['prior_evolution_decision', request.prior_evolution_decision_refs, request.prior_evolution_decision_hashes],
      ['prior_portfolio_decision', request.prior_portfolio_decision_refs, request.prior_portfolio_decision_hashes],
      ['accepted_risk', request.accepted_risk_refs, request.accepted_risk_hashes],
      ['human_request', request.human_request_refs, request.human_request_hashes],
    ];
    for (const [label, refs, hashes] of pairs) {
      const refLength = refs?.length ?? 0;
      const hashLength = hashes?.length ?? 0;
      if (refLength !== hashLength) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${label}_refs and ${label}_hashes must have the same length.`);
      }
    }
  }

  private hasRoleOutputs(
    outputs: RunPaperImplementationMotiveEvolutionRuntimeRequest['mocked_role_outputs']
      | RunPaperImplementationMotiveEvolutionRuntimeRequest['codex_role_outputs'],
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private requestBoundaryBlockerCodes(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
  ): string[] {
    const blockers: string[] = [];
    if (this.hasMemoLikeRefs(this.primaryInputRefs(request))) {
      blockers.push('MOTIVE_EVOLUTION_MEMO_LIKE_REF_REJECTED');
    }
    blockers.push(...this.contextPacketBlockerCodes(request));
    return this.uniqueStrings(blockers);
  }

  private contextPacketBlockerCodes(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
  ): string[] {
    const packets = request.motive_context_packets ?? [];
    if (packets.length === 0) {
      return ['MOTIVE_EVOLUTION_CONTEXT_PACKET_MISSING'];
    }
    const blockers: string[] = [];
    const targetKeys = new Set([
      this.refKey(request.target_ref),
      ...request.target_motive_refs.map((ref) => this.refKey(ref)),
      ...request.target_core_motive_version_refs.map((ref) => this.refKey(ref)),
    ]);
    const evidenceKeys = new Set([
      ...request.evidence_board_refs.map((ref) => this.refKey(ref)),
      ...request.evidence_binding_refs.map((ref) => this.refKey(ref)),
    ]);
    const traceManifestKeys = new Set(request.trace_manifest_refs.map((ref) => this.refKey(ref)));
    const sourceKeys = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    const coveredTargetKeys = new Set<string>();
    for (const packet of packets) {
      for (const coveredRef of packet.covered_target_refs) {
        coveredTargetKeys.add(this.refKey(coveredRef));
      }
      if (!this.refsWithinSet(packet.covered_target_refs, targetKeys)) {
        blockers.push('MOTIVE_EVOLUTION_CONTEXT_PACKET_REF_MISMATCH');
      }
      if (
        !this.refsWithinSet(packet.covered_evidence_refs, evidenceKeys)
        || !this.refsWithinSet(packet.covered_trace_manifest_refs, traceManifestKeys)
        || !this.refsWithinSet(packet.covered_source_refs, sourceKeys)
      ) {
        blockers.push('MOTIVE_EVOLUTION_CONTEXT_PACKET_REF_MISMATCH');
      }
      if (
        packet.covered_target_refs.length === 0
        || (
          packet.covered_evidence_refs.length === 0
          && packet.covered_trace_manifest_refs.length === 0
          && packet.covered_source_refs.length === 0
        )
      ) {
        blockers.push('MOTIVE_EVOLUTION_CONTEXT_PACKET_UNCOVERED');
      }
    }
    if (![...targetKeys].some((key) => coveredTargetKeys.has(key))) {
      blockers.push('MOTIVE_EVOLUTION_CONTEXT_PACKET_TARGET_MISSING');
    }
    return this.uniqueStrings(blockers);
  }

  private primaryInputRefs(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      request.target_ref,
      ...request.target_motive_refs,
      ...request.target_core_motive_version_refs,
      request.input_snapshot_ref,
      request.portfolio_snapshot_ref,
      ...request.evidence_board_refs,
      ...request.evidence_binding_refs,
      ...request.challenge_refs,
      ...request.conflict_refs,
      ...request.trace_manifest_refs,
      request.human_confirmation_policy_ref,
      ...request.source_refs,
      ...(request.motive_context_packets ?? []).map((packet) => packet.packet_ref),
      ...(request.validation_cycle_refs ?? []),
      ...(request.result_packet_refs ?? []),
      ...(request.cross_board_review_refs ?? []),
      ...(request.prior_evolution_decision_refs ?? []),
      ...(request.prior_portfolio_decision_refs ?? []),
      ...(request.accepted_risk_refs ?? []),
      ...(request.human_request_refs ?? []),
    ]);
  }

  private semanticOutputFailureCode(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    output: PaperImplementationMotiveEvolutionRoleOutput | null,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): string | null {
    if (!output) {
      return null;
    }
    if (this.hasForbiddenAuthorityField(output)) {
      return 'MOTIVE_EVOLUTION_AUTHORITY_FIELD_PRESENT';
    }
    // T-124 S3-α4 + 复审 F3-5: converge on the single-source echo-mismatch helper.
    const echoCode = roleSlotEchoMismatchCode(output, role.roleSlotId);
    if (echoCode) {
      return echoCode;
    }
    const sourceKeys = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    if (!this.refsWithinSet(output.cited_source_refs, sourceKeys)) {
      return 'MOTIVE_EVOLUTION_REF_MISMATCH';
    }
    if (!this.hasRequiredSideEffectGuards(output)) {
      return 'MOTIVE_EVOLUTION_SIDE_EFFECT_GUARD_MISSING';
    }
    const resultStatusFailure = this.supportResultStatusFailureCode(output);
    if (resultStatusFailure) {
      return resultStatusFailure;
    }
    if (this.isDesignerOutput(output)) {
      if (!this.sameFunctionalRefSet(output.reviewed_target_motive_refs, request.target_motive_refs)) {
        return 'MOTIVE_EVOLUTION_REVIEW_SET_MISMATCH';
      }
      if (!this.sameFunctionalRefSet(output.reviewed_core_motive_version_refs, request.target_core_motive_version_refs)) {
        return 'MOTIVE_EVOLUTION_REVIEW_SET_MISMATCH';
      }
      return this.designedOptionsFailureCode(request, output);
    }
    return this.challengerOutputFailureCode(request, output, priorRoleArtifacts);
  }

  private supportResultStatusFailureCode(output: PaperImplementationMotiveEvolutionRoleOutput): string | null {
    if (
      output.support_result_status === 'options_proposed'
      && output.role_status !== 'passed'
    ) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    if (
      output.support_result_status === 'no_evolution_needed'
      && (output.role_status !== 'passed' || output.blocker_codes.length > 0)
    ) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    if (
      output.support_result_status === 'blocked'
      && (output.role_status !== 'blocked' || output.blocker_codes.length === 0)
    ) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    return null;
  }

  private designedOptionsFailureCode(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    output: PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  ): string | null {
    const optionEntries = Object.entries(output.designed_options);
    if (output.support_result_status === 'options_proposed' && optionEntries.length === 0) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    if (output.support_result_status === 'no_evolution_needed' && optionEntries.length > 0) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    const refFailure = this.optionRefsFailureCode(request, optionEntries.map(([, option]) => option));
    if (refFailure) {
      return refFailure;
    }
    return this.optionHumanGateFailureCode(optionEntries.map(([, option]) => option));
  }

  private challengerOutputFailureCode(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    output: PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): string | null {
    const designerArtifact = priorRoleArtifacts[0];
    const designerOutput = designerArtifact?.output;
    if (!designerArtifact || !designerOutput || !this.isDesignerOutput(designerOutput)) {
      return 'MOTIVE_EVOLUTION_OPTION_SET_MISMATCH';
    }
    if (
      this.refKey(output.designer_role_artifact_ref) !== this.refKey(designerArtifact.artifact.artifact_payload_ref)
      || output.designer_role_artifact_hash !== designerArtifact.artifact.artifact_payload_hash
      || output.option_set_hash !== designerOutput.option_set_hash
    ) {
      return 'MOTIVE_EVOLUTION_OPTION_SET_MISMATCH';
    }
    const designerOptionKeys = Object.keys(designerOutput.designed_options).sort();
    const challengedOptionKeys = [...output.challenged_option_keys].sort();
    const decisionOptionKeys = Object.keys(output.decision_options).sort();
    if (
      output.support_result_status === 'options_proposed'
      && (
        !this.equalStringArrays(challengedOptionKeys, designerOptionKeys)
        || !this.equalStringArrays(decisionOptionKeys, designerOptionKeys)
      )
    ) {
      return 'MOTIVE_EVOLUTION_CHALLENGE_COVERAGE_MISSING';
    }
    if (
      output.support_result_status === 'no_evolution_needed'
      && (challengedOptionKeys.length > 0 || decisionOptionKeys.length > 0)
    ) {
      return 'MOTIVE_EVOLUTION_RESULT_STATUS_INVALID';
    }
    const decisionOptions = Object.values(output.decision_options);
    const refFailure = this.optionRefsFailureCode(request, decisionOptions);
    if (refFailure) {
      return refFailure;
    }
    const humanGateFailure = this.optionHumanGateFailureCode(decisionOptions);
    if (humanGateFailure) {
      return humanGateFailure;
    }
    if (decisionOptions.some((option) => this.challengeCheckMissingBlocker(option.challenge_check))) {
      return 'MOTIVE_EVOLUTION_BOUNDARY_BLOCKER_MISSING';
    }
    return null;
  }

  private optionRefsFailureCode(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    options: Array<Pick<PaperImplementationMotiveEvolutionDecisionOption, 'supporting_refs' | 'challenging_refs'>>,
  ): string | null {
    const allowedRefKeys = new Set(this.primaryInputRefs(request).map((ref) => this.refKey(ref)));
    for (const option of options) {
      if (
        !this.refsWithinSet(option.supporting_refs, allowedRefKeys)
        || !this.refsWithinSet(option.challenging_refs, allowedRefKeys)
      ) {
        return 'MOTIVE_EVOLUTION_REF_MISMATCH';
      }
    }
    return null;
  }

  private optionHumanGateFailureCode(
    options: Array<Pick<
      PaperImplementationMotiveEvolutionDecisionOption,
      'option_kind' | 'portfolio_impact_class' | 'human_confirmation_required' | 'recommended_next_gate'
    >>,
  ): string | null {
    for (const option of options) {
      const requiresHumanGate = PORTFOLIO_CHANGING_OPTION_KINDS.has(option.option_kind)
        || PORTFOLIO_CHANGING_IMPACT_CLASSES.has(option.portfolio_impact_class);
      if (requiresHumanGate && !option.human_confirmation_required) {
        return 'MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING';
      }
      if (
        option.human_confirmation_required
        && !['motive_evolution_review', 'portfolio_decision_review', 'human_confirmation'].includes(option.recommended_next_gate)
      ) {
        return 'MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING';
      }
    }
    return null;
  }

  private challengeCheckMissingBlocker(check: PaperImplementationMotiveEvolutionDecisionOption['challenge_check']): boolean {
    const hasBlockedStatus = [
      check.evidence_status,
      check.trace_status,
      check.portfolio_status,
      check.human_confirmation_status,
      check.downstream_impact_status,
    ].includes('blocked');
    return hasBlockedStatus && check.blocking_reason_codes.length === 0;
  }

  private hasRequiredSideEffectGuards(output: PaperImplementationMotiveEvolutionRoleOutput): boolean {
    return output.no_domain_gate_request === true
      && output.no_queue_side_effect === true
      && output.no_motive_write_side_effect === true
      && output.no_motive_evolution_side_effect === true
      && output.no_portfolio_mutation_side_effect === true
      && output.no_board_write_side_effect === true
      && output.no_evidence_binding_side_effect === true
      && output.no_trace_repair_queue_side_effect === true;
  }

  private roleInvocationFailureCode<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    result: TopicSelectionAgentInvocationResult<TOutput>,
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput>[],
  ): string | null {
    if (result.error_code) {
      return result.error_code;
    }
    if (result.status !== 'succeeded') {
      return result.blocker_codes[0] ?? 'AGENT_EXECUTION_FAILED';
    }
    if (this.roleProvenanceDrifted(runtimeBase, request, role, result)) {
      return 'MOTIVE_EVOLUTION_PROVENANCE_DRIFT';
    }
    const semanticFailureCode = this.semanticOutputFailureCode(
      request,
      role,
      result.structured_output,
      priorRoleArtifacts,
    );
    if (semanticFailureCode) {
      return semanticFailureCode;
    }
    return null;
  }

  private roleProvenanceDrifted<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    role: RoleProfile,
    result: TopicSelectionAgentInvocationResult<TOutput>,
  ): boolean {
    const provenance = result.provenance;
    return provenance.workflow_run_id !== runtimeBase.runId
      || provenance.node_id !== role.roleSlotId
      || provenance.execution_mode !== request.execution_mode
      || provenance.executor_kind !== runtimeBase.profile.roleExecutorKind
      || provenance.run_mode !== this.topicRunMode(request.run_mode)
      || !this.provenanceSourceMatches(request, provenance)
      || provenance.profile_id !== runtimeBase.modelProfileId
      || !this.provenanceModelOptionMatches(runtimeBase, request, provenance)
      || provenance.output_contract !== PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID
      || provenance.prompt_template_id !== runtimeBase.profile.promptTemplateId
      || provenance.prompt_template_version !== runtimeBase.profile.promptTemplateVersion
      // S3-β1: provider_llm rounds carry the wire schema name.
      || provenance.schema_name !== this.roleSchemaName(request, role);
  }

  private provenanceSourceMatches<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    provenance: TopicSelectionAgentInvocationResult<TOutput>['provenance'],
  ): boolean {
    const expectedNonProvider = request.execution_mode !== 'provider_llm';
    if (provenance.non_provider !== expectedNonProvider) {
      return false;
    }
    if (request.execution_mode === 'provider_llm') {
      return provenance.source_kind === 'provider_response';
    }
    return provenance.source_kind !== 'provider_response';
  }

  private provenanceModelOptionMatches<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    provenance: TopicSelectionAgentInvocationResult<TOutput>['provenance'],
  ): boolean {
    if (request.execution_mode !== 'provider_llm') {
      return provenance.model_option_id === null;
    }
    if (runtimeBase.modelOptionId) {
      return provenance.model_option_id === runtimeBase.modelOptionId;
    }
    return typeof provenance.model_option_id === 'string'
      && EVOLUTION_DECISION_SUPPORT_MODEL_OPTION_IDS.has(provenance.model_option_id);
  }

  private runtimeControlForFailure(
    runtimeFailureCode: string,
    details: Record<string, unknown>,
  ): RuntimeControl {
    return {
      terminal_code: 'runtime_retry_exhausted',
      reason_kind: runtimeFailureCode,
      details,
    };
  }

  private outputBlockerCodes(
    output: PaperImplementationMotiveEvolutionRoleOutput | null,
    fallback: string[],
  ): string[] {
    return this.uniqueStrings([
      ...fallback,
      ...(output?.blocker_codes ?? []),
      ...Object.values(this.decisionOptions(output)).flatMap((option) => option.blocker_codes),
    ]);
  }

  private outputWarningCodes(
    output: PaperImplementationMotiveEvolutionRoleOutput | null,
    fallback: string[],
  ): string[] {
    return this.uniqueStrings([
      ...fallback,
      ...(output?.warning_codes ?? []),
      ...Object.values(this.decisionOptions(output)).flatMap((option) => option.warning_codes),
    ]);
  }

  private decisionOptions(
    output: PaperImplementationMotiveEvolutionRoleOutput | null,
  ): Record<string, PaperImplementationMotiveEvolutionDecisionOption> {
    return output && !this.isDesignerOutput(output) ? output.decision_options : {};
  }

  private retryWarningCodes<TOutput extends PaperImplementationMotiveEvolutionRoleOutput>(
    roleInvocation: RoleInvocationOutcome<TOutput>,
    runtimeFailureCode: string | null,
  ): string[] {
    if (roleInvocation.retryAttemptIndex <= 0) {
      return [];
    }
    return runtimeFailureCode
      ? ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED']
      : ['RUNTIME_TECHNICAL_RETRY_RECOVERED'];
  }

  private providerCallCount<TOutput>(result: TopicSelectionAgentInvocationResult<TOutput>): number {
    const telemetry = result.provenance.telemetry as { request_count?: unknown } | null;
    return typeof telemetry?.request_count === 'number' ? telemetry.request_count : 0;
  }

  private totalProviderCalls(artifacts: PaperImplementationRuntimeArtifactEnvelope[]): number {
    return artifacts.reduce((total, artifact) => total + artifact.provider_call_count, 0);
  }

  private result(
    runtimeBase: RuntimeBase,
    status: 'passed' | 'blocked' | 'failed_runtime',
    providerCallCount: number,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
    admissions: PaperImplementationRuntimeAdmissionRecord[],
    finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null,
    finalAdmission: PaperImplementationRuntimeAdmissionRecord | null,
  ): PaperImplementationMotiveEvolutionRuntimeResult {
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
      blocker_codes: this.uniqueStrings(artifacts.flatMap((artifact) => artifact.blocker_codes)),
      warning_codes: this.uniqueStrings(artifacts.flatMap((artifact) => artifact.warning_codes)),
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

  private optionSetHashFromArtifacts(
    priorRoleArtifacts: RecordedRuntimeArtifact<PaperImplementationMotiveEvolutionRoleOutput | null>[],
    output: unknown,
  ): string | null {
    const fromOutput = this.optionSetHashFromUnknown(output);
    if (fromOutput) {
      return fromOutput;
    }
    for (const artifact of priorRoleArtifacts) {
      const fromPrior = this.optionSetHashFromOutput(artifact.output);
      if (fromPrior) {
        return fromPrior;
      }
    }
    return null;
  }

  private optionSetHashFromOutput(output: PaperImplementationMotiveEvolutionRoleOutput | null): string | null {
    return output ? this.optionSetHashFromUnknown(output) : null;
  }

  private optionSetHashFromUnknown(output: unknown): string | null {
    if (!output || typeof output !== 'object') {
      return null;
    }
    const value = (output as { option_set_hash?: unknown }).option_set_hash;
    return typeof value === 'string' ? value : null;
  }

  private isDesignerOutput(
    output: PaperImplementationMotiveEvolutionRoleOutput,
  ): output is PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
    return output.role_slot_id === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID;
  }

  private hasForbiddenAuthorityField(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((item) => this.hasForbiddenAuthorityField(item));
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if ((FORBIDDEN_AUTHORITY_FIELDS as readonly string[]).includes(key)) {
        return true;
      }
      if (this.hasForbiddenAuthorityField(nested)) {
        return true;
      }
    }
    return false;
  }

  private hasMemoLikeRefs(refs: TopicSelectionFunctionalRef[]): boolean {
    return refs.some((ref) => /memo|summary|harness|proposal|cached/i.test(ref.ref_type));
  }

  private refsWithinSet(refs: TopicSelectionFunctionalRef[], allowedKeys: Set<string>): boolean {
    return refs.every((ref) => allowedKeys.has(this.refKey(ref)));
  }

  private sameFunctionalRefSet(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    const leftKeys = left.map((ref) => this.refKey(ref)).sort();
    const rightKeys = right.map((ref) => this.refKey(ref)).sort();
    return this.equalStringArrays(leftKeys, rightKeys);
  }

  private equalStringArrays(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }
    return unique;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    // T-124 S3 收口 (gs-001 run 005 root-cause): this service was the sole
    // outlier using full-shape `stableStringify` ref identity while every sibling
    // slot service keyed on the semantic `ref_type:ref_id:title_card_id:version_id`
    // form. The live chain's model output echoes request refs through the output
    // schema, which materializes the optional `legacy_ref` as explicit `null`;
    // full-shape equality then read `legacy_ref: null` (present) vs the request's
    // omitted key as drift and raised MOTIVE_EVOLUTION_REF_MISMATCH on
    // semantically identical refs. Converge on the shared semantic key so
    // absent-vs-null optional keys are equal but real ref drift still fails closed.
    return semanticRefKey(ref);
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationMotiveEvolutionRuntimeRequest,
    contentHash?: string | null,
  ): TopicSelectionFunctionalRef {
    const functionalRef: TopicSelectionFunctionalRef = {
      ref_type: refType,
      ref_id: refId,
      title_card_id: request.target_ref.title_card_id ?? null,
    };
    if (contentHash) {
      functionalRef.version_id = contentHash;
    }
    return functionalRef;
  }

  private titleCardId(request: RunPaperImplementationMotiveEvolutionRuntimeRequest): string | null {
    return request.target_ref.title_card_id ?? null;
  }

  /**
   * S2-B B2: unified coordinator-wide run_mode mapping — identical to every
   * sibling slot service (mock→test, product→product, dry_run/replay→
   * acceptance). The previous dry_run→test fork conflicted with the
   * provider_llm profile run_mode_eligibility (acceptance|product) and made
   * dry_run + provider_llm deterministically INVALID_PAYLOAD for this slot
   * only (gs001-lora-live-001).
   */
  private topicRunMode(runMode: RunPaperImplementationMotiveEvolutionRuntimeRequest['run_mode']): 'test' | 'acceptance' | 'product' {
    if (runMode === 'mock') {
      return 'test';
    }
    if (runMode === 'product') {
      return 'product';
    }
    return 'acceptance';
  }

  private createdBy(executionMode: PaperImplementationAgentExecutionMode): TopicSelectionActorType {
    return executionMode === 'codex_assisted' ? 'hybrid' : executionMode === 'mocked_llm' ? 'system' : 'llm';
  }

  private responseReuseStatus(
    executionMode: PaperImplementationAgentExecutionMode,
    responseReuseRef?: string | null,
  ): PaperImplementationRuntimeResponseReuseStatus {
    if (responseReuseRef) {
      return executionMode === 'provider_llm' ? 'blocked_provider_live_required' : 'hit_non_provider';
    }
    return executionMode === 'provider_llm' ? 'miss' : 'not_applicable';
  }

  private promptPacketCacheStatus(
    status: TopicSelectionRuntimeCacheResult | null | undefined,
  ): PaperImplementationRuntimeCacheStatus {
    if (status === 'hit' || status === 'miss') {
      return status;
    }
    if (status?.startsWith('blocked')) {
      return 'blocked_drift';
    }
    return 'miss';
  }

  private estimatedInputTokens(input: unknown): number {
    return Math.ceil(stableStringify(input).length / 4);
  }

  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '_');
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private jsonSafeObject(value: Record<string, unknown>): Record<string, unknown> {
    return this.jsonSafeValue(value) as Record<string, unknown>;
  }

  private jsonSafeValue(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => {
        const safeItem = this.jsonSafeValue(item);
        return safeItem === undefined ? null : safeItem;
      });
    }
    const safeRecord: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const safeNested = this.jsonSafeValue(nested);
      if (safeNested !== undefined) {
        // T-124 S3 复审 F3-1: option_key values may collide with Object.prototype
        // members ('__proto__', 'constructor', …). A plain `safeRecord[key] = …`
        // would mutate the prototype and silently drop the entry, re-polluting the
        // persisted artifact after canonicalization. defineProperty always writes a
        // plain own property while keeping normal-key semantics unchanged.
        Object.defineProperty(safeRecord, key, {
          value: safeNested,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
    return safeRecord;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.length > 0))];
  }
}
