import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
  type TopicSelectionContextPolicyProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import {
  topicSelectionRankedCandidateDraftBatchSchema,
  type TopicSelectionCandidateDraftAdmissionReport,
  type TopicSelectionGenerateNeedCandidateArtifactRefEntry,
  type TopicSelectionGenerateNeedCandidateNodeInput,
  type TopicSelectionNeedDiscoveryContextPacket,
  type TopicSelectionPersistNeedCandidateBatchCommand,
  type TopicSelectionRankedCandidateDraftBatch,
  type TopicSelectionRankedCandidateDraftBatchMinimumValidationReport,
  type TopicSelectionSupplementalRoundRoutingDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRunMode,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionExecutorKind,
  type TopicSelectionMockedAgentOutput,
  TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionCandidateDraftAdmissionService,
  type TopicSelectionCandidateDraftEvidenceRoleRefEntry,
} from './topic-selection-candidate-draft-admission-service.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import { TopicSelectionNeedDiscoveryContextCompilerService } from './topic-selection-need-discovery-context-compiler-service.js';
import {
  type TopicSelectionNeedDiscoveryDebateCodexResponses,
  type TopicSelectionNeedDiscoveryDebateLoopResult,
  TopicSelectionNeedDiscoveryDebateLoopService,
  type TopicSelectionNeedDiscoveryDebateMockedOutputs,
} from './topic-selection-need-discovery-debate-loop-service.js';
import type {
  TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan,
  TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides,
  TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import type {
  TopicSelectionAgentExecutionSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TopicSelectionPersistNeedCandidateBatchService,
  type TopicSelectionPersistNeedCandidateBatchResult,
} from './topic-selection-persist-need-candidate-batch-service.js';
import { TopicSelectionRankedCandidateDraftBatchValidatorService } from './topic-selection-ranked-candidate-draft-batch-validator-service.js';
import { TopicSelectionSupplementalRoundRoutingService } from './topic-selection-supplemental-round-routing-service.js';
import {
  TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS,
  type TopicSelectionResolvedContextPolicyProfile,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionCompressionRuntimeService,
  type TopicSelectionCompressionFactInventory,
  type TopicSelectionCompressionReportRuntimeResult,
} from './topic-selection-compression-runtime-service.js';
import { TopicSelectionTokenBudgetGateService } from './topic-selection-token-budget-gate-service.js';

const GENERATE_NEED_CANDIDATE_NODE_ID = 'topic-selection.v1a.generate-need-candidate.v1' as const;
const PROMPT_TEMPLATE_ID = 'topic-selection-generate-need-candidate';
const PROMPT_TEMPLATE_VERSION = 'v1';
const RANKED_BATCH_SCHEMA_NAME = 'topic_selection_ranked_candidate_draft_batch';
const RANKED_BATCH_PAYLOAD_SCHEMA = 'RankedCandidateDraftBatch@v1';
const MINIMUM_SCHEMA_VALIDATION_PAYLOAD_SCHEMA = 'RankedCandidateDraftBatchMinimumValidationReport@v1';
const CANDIDATE_DRAFT_ADMISSION_PAYLOAD_SCHEMA = 'CandidateDraftAdmissionReport@v1';
const SUPPLEMENTAL_ROUND_ROUTING_PAYLOAD_SCHEMA = 'SupplementalRoundRoutingDecision@v1';
const PERSIST_NEED_CANDIDATE_BATCH_PAYLOAD_SCHEMA = 'PersistNeedCandidateBatchCommand@v1';
const CONTEXT_COMPRESSION_REPORT_PAYLOAD_SCHEMA = 'TopicSelectionCompressionReportEnvelope@v1';

export type TopicSelectionGenerateNeedCandidatePersistenceContext = {
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionGenerateNeedCandidateRuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
  schema_overhead_tokens_after_compression_override?: number | null;
  compression_already_applied?: boolean;
};

type TopicSelectionGenerateNeedCandidateCompressedContext = {
  schema_version: 'topic-selection-v1a-n6-single-agent-compressed-context-v1';
  compression_report_ref: TopicSelectionFunctionalRef;
  source_context_packet_hashes: {
    exploration_context: string;
    arbiter_context: string;
  };
  exploration_context: unknown;
  arbiter_context: unknown;
  preserved_fact_inventory: TopicSelectionCompressionFactInventory;
  compression_notes: {
    strategy: string;
    retained_refs_are_authoritative: true;
    payload_is_not_business_authority: true;
  };
};

type TopicSelectionGenerateNeedCandidateSingleAgentInvocationResult = {
  invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionRankedCandidateDraftBatch>;
  context_compression_report_artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  compression_blocker_codes?: string[];
  compression_warning_codes?: string[];
  compression_error_code?: string | null;
};

export type TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  run_mode: TopicSelectionAgentRunMode;
  executor_kind?: TopicSelectionExecutorKind;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  model_option_id?: string | null;
  debate_loop_id?: string | null;
  debate_policy_id?: string | null;
  debate_execution_plan?: TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan | null;
  debate_slot_execution_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides | null;
  debate_slot_model_option_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides | null;
  debate_mocked_outputs?: TopicSelectionNeedDiscoveryDebateMockedOutputs | null;
  debate_codex_responses?: TopicSelectionNeedDiscoveryDebateCodexResponses | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionRankedCandidateDraftBatch> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionRankedCandidateDraftBatch> | null;
  runtime_token_budget_overrides?: TopicSelectionGenerateNeedCandidateRuntimeTokenBudgetOverrides | null;
  current_round_index?: number | null;
  remaining_round_budget?: number | null;
  persist_admitted_candidates?: boolean;
  persistence_context?: TopicSelectionGenerateNeedCandidatePersistenceContext | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
};

export type TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult = {
  schema_version: 'v1';
  node_id: typeof GENERATE_NEED_CANDIDATE_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  status: 'succeeded' | 'blocked' | 'require_human_review';
  ranked_candidate_draft_batch: TopicSelectionRankedCandidateDraftBatch | null;
  ranked_candidate_draft_batch_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  minimum_schema_validation_report: TopicSelectionRankedCandidateDraftBatchMinimumValidationReport | null;
  minimum_schema_validation_report_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  candidate_draft_admission_report: TopicSelectionCandidateDraftAdmissionReport | null;
  candidate_draft_admission_report_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  supplemental_round_routing_decision: TopicSelectionSupplementalRoundRoutingDecision | null;
  supplemental_round_routing_decision_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  context_compression_report_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  persist_need_candidate_batch_command: TopicSelectionPersistNeedCandidateBatchCommand | null;
  persist_need_candidate_batch_command_artifact?: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  persist_need_candidate_batch_result?: TopicSelectionPersistNeedCandidateBatchResult | null;
  exploration_context_packet: TopicSelectionNeedDiscoveryContextPacket;
  arbiter_context_packet: TopicSelectionNeedDiscoveryContextPacket;
  invocation_result: TopicSelectionAgentInvocationResult<unknown>;
  debate_result?: TopicSelectionNeedDiscoveryDebateLoopResult | null;
  replay_provenance?: {
    replayed: true;
    source_workflow_run_id: string;
    source_node_attempt_id: string;
    source_trace_artifact_ref: TopicSelectionFunctionalRef;
    input_hash: string;
  } | null;
  warning_codes: string[];
  blocker_codes: string[];
  error_code?: string | null;
};

export class TopicSelectionGenerateNeedCandidateOrchestratorAdapterService {
  private readonly draftBatchValidator: TopicSelectionRankedCandidateDraftBatchValidatorService;
  private readonly candidateDraftAdmission: TopicSelectionCandidateDraftAdmissionService;
  private readonly supplementalRouting: TopicSelectionSupplementalRoundRoutingService;
  private readonly needCandidateBatchPersistence: TopicSelectionPersistNeedCandidateBatchService | null;
  private readonly debateLoop: TopicSelectionNeedDiscoveryDebateLoopService;
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly tokenBudgetGate: TopicSelectionTokenBudgetGateService;
  private readonly compressionRuntime: TopicSelectionCompressionRuntimeService;

  constructor(
    private readonly dependencies: {
      contextCompiler: TopicSelectionNeedDiscoveryContextCompilerService;
      agentOrchestrator: TopicSelectionAgentOrchestratorService;
      artifactBoundary: TopicSelectionNeedDiscoveryArtifactBoundaryService;
      draftBatchValidator?: TopicSelectionRankedCandidateDraftBatchValidatorService;
      candidateDraftAdmission?: TopicSelectionCandidateDraftAdmissionService;
      supplementalRouting?: TopicSelectionSupplementalRoundRoutingService;
      needCandidateBatchPersistence?: TopicSelectionPersistNeedCandidateBatchService | null;
      debateLoop?: TopicSelectionNeedDiscoveryDebateLoopService;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      tokenBudgetGate?: TopicSelectionTokenBudgetGateService;
      compressionRuntime?: TopicSelectionCompressionRuntimeService;
    },
  ) {
    this.draftBatchValidator = dependencies.draftBatchValidator
      ?? new TopicSelectionRankedCandidateDraftBatchValidatorService();
    this.candidateDraftAdmission = dependencies.candidateDraftAdmission
      ?? new TopicSelectionCandidateDraftAdmissionService();
    this.supplementalRouting = dependencies.supplementalRouting
      ?? new TopicSelectionSupplementalRoundRoutingService();
    this.needCandidateBatchPersistence = dependencies.needCandidateBatchPersistence ?? null;
    this.debateLoop = dependencies.debateLoop
      ?? new TopicSelectionNeedDiscoveryDebateLoopService({
        agentOrchestrator: dependencies.agentOrchestrator,
        artifactBoundary: dependencies.artifactBoundary,
      });
    this.contextPolicyProfileRegistry = dependencies.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.tokenBudgetGate = dependencies.tokenBudgetGate ?? new TopicSelectionTokenBudgetGateService();
    this.compressionRuntime = dependencies.compressionRuntime ?? new TopicSelectionCompressionRuntimeService();
  }

  async generateRankedCandidateDraftBatch(
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput,
  ): Promise<TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult> {
    this.assertNodeInput(input.node_input);
    const explorationContext = await this.dependencies.contextCompiler.resolveContextPacket(
      input.node_input.exploration_context_ref,
      {
        title_card_id: input.title_card_id,
        context_family: 'exploration_context',
        policy_version: input.node_input.policy_version,
        output_schema_version: input.node_input.schema_version,
        profile_id: input.node_input.profile_id,
        execution_mode: input.node_input.execution_mode,
      },
    );
    const arbiterContext = await this.dependencies.contextCompiler.resolveContextPacket(
      input.node_input.arbiter_context_ref,
      {
        title_card_id: input.title_card_id,
        context_family: 'arbiter_context',
        policy_version: input.node_input.policy_version,
        output_schema_version: input.node_input.schema_version,
        profile_id: input.node_input.profile_id,
        execution_mode: input.node_input.execution_mode,
      },
    );

    const debateResult = input.executor_kind === 'multi_agent_debate'
      ? await this.debateLoop.runNeedDiscoveryDebate({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? null,
        node_input: input.node_input,
        run_mode: input.run_mode,
        exploration_context_packet: explorationContext,
        arbiter_context_packet: arbiterContext,
        debate_loop_id: input.debate_loop_id ?? null,
        debate_policy_id: input.debate_policy_id ?? null,
        round_index: input.current_round_index ?? 1,
        execution_plan: input.debate_execution_plan ?? null,
        slot_execution_overrides: input.debate_slot_execution_overrides ?? null,
        slot_model_option_overrides: input.debate_slot_model_option_overrides ?? null,
        mocked_outputs: input.debate_mocked_outputs ?? null,
        codex_responses: input.debate_codex_responses ?? null,
        model_option_id: input.model_option_id ?? null,
        created_by: input.created_by ?? 'system',
      })
      : null;
    const singleAgentResult = debateResult
      ? null
      : await this.invokeSingleAgent(input, explorationContext, arbiterContext);
    const invocationResult = debateResult?.final_invocation_result
      ?? singleAgentResult!.invocation_result;
    const contextCompressionReportArtifact = singleAgentResult?.context_compression_report_artifact ?? null;
    const rankedCandidateDraftBatch = debateResult?.ranked_candidate_draft_batch
      ?? invocationResult.structured_output as TopicSelectionRankedCandidateDraftBatch | null;

    if (invocationResult.status !== 'succeeded' || !rankedCandidateDraftBatch) {
      return {
        schema_version: 'v1',
        node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
        workflow_run_id: input.node_input.workflow_run_id,
        node_attempt_id: input.node_input.node_attempt_id,
        status: 'blocked',
        ranked_candidate_draft_batch: null,
        ranked_candidate_draft_batch_artifact: null,
        minimum_schema_validation_report: null,
        minimum_schema_validation_report_artifact: null,
        candidate_draft_admission_report: null,
        candidate_draft_admission_report_artifact: null,
        supplemental_round_routing_decision: null,
        supplemental_round_routing_decision_artifact: null,
        context_compression_report_artifact: contextCompressionReportArtifact,
        persist_need_candidate_batch_command: null,
        persist_need_candidate_batch_command_artifact: null,
        persist_need_candidate_batch_result: null,
        exploration_context_packet: explorationContext,
        arbiter_context_packet: arbiterContext,
        invocation_result: invocationResult,
        debate_result: debateResult,
        blocker_codes: this.uniqueStrings([
          ...(singleAgentResult?.compression_blocker_codes ?? []),
          ...invocationResult.blocker_codes,
        ]),
        warning_codes: this.uniqueStrings([
          ...(singleAgentResult?.compression_warning_codes ?? []),
          ...invocationResult.warning_codes,
        ]),
        error_code: singleAgentResult?.compression_error_code
          ?? invocationResult.error_code
          ?? 'AGENT_INVOCATION_BLOCKED',
      };
    }

    const minimumSchemaValidationReport = this.draftBatchValidator.validate({
      node_input: input.node_input,
      ranked_candidate_draft_batch: rankedCandidateDraftBatch,
      max_persisted_candidates: arbiterContext.context_family === 'arbiter_context'
        ? arbiterContext.payload.max_persisted_candidates
        : undefined,
    });
    const minimumSchemaValidationArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: 'minimum_schema_validation_report',
      payload_schema: MINIMUM_SCHEMA_VALIDATION_PAYLOAD_SCHEMA,
      payload: minimumSchemaValidationReport as unknown as Record<string, unknown>,
      source_refs: [
        input.node_input.exploration_context_ref,
        input.node_input.arbiter_context_ref,
        ...this.inputRefs(input.node_input),
      ],
      created_by: input.created_by ?? 'system',
    });

    if (!minimumSchemaValidationReport.valid) {
      return {
        schema_version: 'v1',
        node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
        workflow_run_id: input.node_input.workflow_run_id,
        node_attempt_id: input.node_input.node_attempt_id,
        status: 'blocked',
        ranked_candidate_draft_batch: null,
        ranked_candidate_draft_batch_artifact: null,
        minimum_schema_validation_report: minimumSchemaValidationReport,
        minimum_schema_validation_report_artifact: minimumSchemaValidationArtifact.artifact_entry,
        candidate_draft_admission_report: null,
        candidate_draft_admission_report_artifact: null,
        supplemental_round_routing_decision: null,
        supplemental_round_routing_decision_artifact: null,
        context_compression_report_artifact: contextCompressionReportArtifact,
        persist_need_candidate_batch_command: null,
        persist_need_candidate_batch_command_artifact: null,
        persist_need_candidate_batch_result: null,
        exploration_context_packet: explorationContext,
        arbiter_context_packet: arbiterContext,
        invocation_result: invocationResult,
        debate_result: debateResult,
        blocker_codes: minimumSchemaValidationReport.blocking_reason_codes,
        warning_codes: this.uniqueStrings([
          ...invocationResult.warning_codes,
          ...minimumSchemaValidationReport.warning_codes,
        ]),
        error_code: 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH',
      };
    }

    const rankedBatchArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: 'ranked_candidate_draft_batch',
      payload_schema: RANKED_BATCH_PAYLOAD_SCHEMA,
      payload: rankedCandidateDraftBatch as unknown as Record<string, unknown>,
      source_refs: [
        ...this.debateArtifactRefs(debateResult).map((artifact) => artifact.artifact_ref),
        input.node_input.exploration_context_ref,
        input.node_input.arbiter_context_ref,
        ...this.inputRefs(input.node_input),
      ],
      created_by: input.created_by ?? 'system',
    });

    const candidateDraftAdmissionReport = this.candidateDraftAdmission.createAdmissionReport({
      node_input: input.node_input,
      ranked_candidate_draft_batch: rankedCandidateDraftBatch,
      minimum_validation_report: minimumSchemaValidationReport,
      resolvable_refs: this.contextResolvableRefs(input.node_input, explorationContext, arbiterContext),
      evidence_role_ref_entries: this.evidenceRoleRefEntries(arbiterContext),
      method_family_counts: this.methodFamilyCounts(explorationContext),
      method_family_targets: this.methodFamilyTargets(explorationContext),
      candidate_pool_entries: this.candidatePoolEntries(arbiterContext),
      max_persisted_candidates: minimumSchemaValidationReport.max_persisted_candidates,
      remaining_round_budget: input.remaining_round_budget ?? 0,
    });
    const candidateDraftAdmissionArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: 'candidate_draft_admission_report',
      payload_schema: CANDIDATE_DRAFT_ADMISSION_PAYLOAD_SCHEMA,
      payload: candidateDraftAdmissionReport as unknown as Record<string, unknown>,
      source_refs: [
        rankedBatchArtifact.artifact_entry.artifact_ref,
        minimumSchemaValidationArtifact.artifact_entry.artifact_ref,
        input.node_input.exploration_context_ref,
        input.node_input.arbiter_context_ref,
      ],
      created_by: input.created_by ?? 'system',
    });

    const supplementalRoundRoutingDecision = this.supplementalRouting.createRoutingDecision({
      admission_report: candidateDraftAdmissionReport,
      current_round_index: input.current_round_index ?? 1,
      remaining_round_budget: input.remaining_round_budget ?? 0,
    });
    const supplementalRoundRoutingArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: 'supplemental_round_routing_decision',
      payload_schema: SUPPLEMENTAL_ROUND_ROUTING_PAYLOAD_SCHEMA,
      payload: supplementalRoundRoutingDecision as unknown as Record<string, unknown>,
      source_refs: [
        rankedBatchArtifact.artifact_entry.artifact_ref,
        minimumSchemaValidationArtifact.artifact_entry.artifact_ref,
        candidateDraftAdmissionArtifact.artifact_entry.artifact_ref,
        input.node_input.exploration_context_ref,
        input.node_input.arbiter_context_ref,
      ],
      created_by: input.created_by ?? 'system',
    });

    const adapterStatus = this.adapterStatusForRoutingDecision(supplementalRoundRoutingDecision);
    const blockerCodes = this.blockerCodesForRoutingDecision(
      supplementalRoundRoutingDecision,
      candidateDraftAdmissionReport,
    );
    const persistenceResult = await this.maybePersistAdmittedCandidates({
      input,
      rankedBatch: rankedCandidateDraftBatch,
      admissionReport: candidateDraftAdmissionReport,
      rankedBatchArtifact,
      candidateDraftAdmissionArtifact,
      supplementalRoundRoutingDecision,
      supplementalRoundRoutingArtifact,
    });

    return {
      schema_version: 'v1',
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      status: adapterStatus,
      ranked_candidate_draft_batch: rankedCandidateDraftBatch,
      ranked_candidate_draft_batch_artifact: rankedBatchArtifact.artifact_entry,
      minimum_schema_validation_report: minimumSchemaValidationReport,
      minimum_schema_validation_report_artifact: minimumSchemaValidationArtifact.artifact_entry,
      candidate_draft_admission_report: candidateDraftAdmissionReport,
      candidate_draft_admission_report_artifact: candidateDraftAdmissionArtifact.artifact_entry,
      supplemental_round_routing_decision: supplementalRoundRoutingDecision,
      supplemental_round_routing_decision_artifact: supplementalRoundRoutingArtifact.artifact_entry,
      context_compression_report_artifact: contextCompressionReportArtifact,
      persist_need_candidate_batch_command: persistenceResult?.command ?? null,
      persist_need_candidate_batch_command_artifact: persistenceResult?.commandArtifact ?? null,
      persist_need_candidate_batch_result: persistenceResult?.result ?? null,
      exploration_context_packet: explorationContext,
      arbiter_context_packet: arbiterContext,
      invocation_result: invocationResult,
      debate_result: debateResult,
      blocker_codes: blockerCodes,
      warning_codes: this.adapterWarningCodes(
        invocationResult.warning_codes,
        minimumSchemaValidationReport.warning_codes,
        candidateDraftAdmissionReport,
      ),
      error_code: this.errorCodeForRoutingDecision(supplementalRoundRoutingDecision, candidateDraftAdmissionReport),
    };
  }

  private async invokeSingleAgent(
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput,
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): Promise<TopicSelectionGenerateNeedCandidateSingleAgentInvocationResult> {
    const resolvedRuntimeProfile = this.resolveSingleAgentRuntimeProfile();
    const baseMessages = this.buildMessages(input.node_input, explorationContext, arbiterContext);
    const preflight = this.tokenBudgetGate.evaluate({
      context_policy_profile: resolvedRuntimeProfile.profile,
      messages: baseMessages,
      schema: topicSelectionRankedCandidateDraftBatchSchema as unknown as Record<string, unknown>,
      estimated_input_tokens_override:
        input.runtime_token_budget_overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override:
        input.runtime_token_budget_overrides?.schema_overhead_tokens_override,
      compression_already_applied:
        input.runtime_token_budget_overrides?.compression_already_applied ?? false,
    });

    if (
      preflight.result.decision !== 'requires_compression'
      || input.runtime_token_budget_overrides?.compression_already_applied === true
    ) {
      return {
        invocation_result: await this.invokeSingleAgentWithMessages({
          input,
          explorationContext,
          arbiterContext,
          messages: baseMessages,
          runtimeProfile: resolvedRuntimeProfile,
          runtimeOptions: {},
        }),
        context_compression_report_artifact: null,
      };
    }

    const compression = await this.createSingleAgentCompressionReport({
      input,
      explorationContext,
      arbiterContext,
      runtimeProfile: resolvedRuntimeProfile,
      estimatedInputTokensBefore: preflight.result.estimated_input_tokens,
    });
    if (compression.result.quality_gate_result === 'blocked') {
      return {
        invocation_result: await this.invokeSingleAgentWithMessages({
          input,
          explorationContext,
          arbiterContext,
          messages: baseMessages,
          runtimeProfile: resolvedRuntimeProfile,
          runtimeOptions: {
            compressionReportRef: compression.artifact.artifact_ref,
            compressionReportHash: compression.artifact.artifact_hash,
            compressedContextHash: compression.result.report.compressed_context_hash,
            compressionAlreadyApplied: true,
          },
        }),
        context_compression_report_artifact: compression.artifact,
        compression_blocker_codes: this.uniqueStrings([
          'COMPRESSION_QUALITY_GATE_BLOCKED',
          ...compression.result.blocker_codes,
        ]),
        compression_warning_codes: compression.result.warning_codes,
        compression_error_code: 'COMPRESSION_QUALITY_GATE_BLOCKED',
      };
    }

    const compressedMessages = this.buildMessages(
      input.node_input,
      explorationContext,
      arbiterContext,
      compression.compressedContext,
    );
    const invocationResult = await this.invokeSingleAgentWithMessages({
      input,
      explorationContext,
      arbiterContext,
      messages: compressedMessages,
      runtimeProfile: resolvedRuntimeProfile,
      runtimeOptions: {
        compressionReportRef: compression.artifact.artifact_ref,
        compressionReportHash: compression.artifact.artifact_hash,
        compressedContextHash: compression.result.report.compressed_context_hash,
        compressionAlreadyApplied: true,
        estimatedInputTokensOverride:
          input.runtime_token_budget_overrides?.estimated_input_tokens_after_compression_override,
        schemaOverheadTokensOverride:
          input.runtime_token_budget_overrides?.schema_overhead_tokens_after_compression_override,
      },
    });
    return {
      invocation_result: invocationResult,
      context_compression_report_artifact: compression.artifact,
    };
  }

  private async invokeSingleAgentWithMessages(input: {
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput;
    explorationContext: TopicSelectionNeedDiscoveryContextPacket;
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeOptions: {
      compressionReportRef?: TopicSelectionFunctionalRef | null;
      compressionReportHash?: string | null;
      compressedContextHash?: string | null;
      compressionAlreadyApplied?: boolean;
      estimatedInputTokensOverride?: number | null;
      schemaOverheadTokensOverride?: number | null;
    };
  }): Promise<TopicSelectionAgentInvocationResult<TopicSelectionRankedCandidateDraftBatch>> {
    return this.dependencies.agentOrchestrator.invokeStructuredOutput<TopicSelectionRankedCandidateDraftBatch>({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id ?? null,
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workflow_run_id: input.input.node_input.workflow_run_id,
      node_attempt_id: input.input.node_input.node_attempt_id,
      execution_mode: input.input.node_input.execution_mode,
      execution_spec: input.input.execution_spec ?? null,
      executor_kind: input.input.executor_kind ?? 'single_agent',
      run_mode: input.input.run_mode,
      profile_id: input.input.node_input.profile_id,
      output_contract: RANKED_BATCH_PAYLOAD_SCHEMA,
      model_option_id: input.input.model_option_id ?? null,
      prompt: {
        promptTemplateId: PROMPT_TEMPLATE_ID,
        version: PROMPT_TEMPLATE_VERSION,
      },
      schema_name: RANKED_BATCH_SCHEMA_NAME,
      schema: topicSelectionRankedCandidateDraftBatchSchema as unknown as Record<string, unknown>,
      messages: input.messages,
      input_refs: this.inputRefs(input.input.node_input),
      context_packet_refs: [
        input.input.node_input.exploration_context_ref,
        input.input.node_input.arbiter_context_ref,
      ],
      context_packet_hashes: [
        input.explorationContext.payload_hash,
        input.arbiterContext.payload_hash,
      ],
      runtime_token_budget: this.runtimeTokenBudgetInput(
        input.input,
        input.runtimeProfile,
        input.runtimeOptions,
      ),
      mocked_output: input.input.mocked_output ?? null,
      codex_response: input.input.codex_response ?? null,
      created_by: input.input.created_by ?? 'system',
    });
  }

  private async createSingleAgentCompressionReport(input: {
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput;
    explorationContext: TopicSelectionNeedDiscoveryContextPacket;
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    estimatedInputTokensBefore: number | null;
  }): Promise<{
    artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry;
    compressedContext: TopicSelectionGenerateNeedCandidateCompressedContext;
    result: TopicSelectionCompressionReportRuntimeResult;
  }> {
    const sourceRefs = this.uniqueRefs([
      input.input.node_input.exploration_context_ref,
      input.input.node_input.arbiter_context_ref,
      ...input.explorationContext.input_refs,
      ...input.arbiterContext.input_refs,
      ...this.inputRefs(input.input.node_input),
    ]);
    const factInventory = this.compressionFactInventory(
      input.runtimeProfile.profile,
      input.explorationContext,
      input.arbiterContext,
    );
    const compressionReportRef = this.syntheticCompressionReportRef(
      input.input,
      input.explorationContext,
      input.arbiterContext,
    );
    const compressedContext: TopicSelectionGenerateNeedCandidateCompressedContext = {
      schema_version: 'topic-selection-v1a-n6-single-agent-compressed-context-v1',
      compression_report_ref: compressionReportRef,
      source_context_packet_hashes: {
        exploration_context: input.explorationContext.payload_hash,
        arbiter_context: input.arbiterContext.payload_hash,
      },
      exploration_context: this.compactPayload(input.explorationContext.payload),
      arbiter_context: this.compactPayload(input.arbiterContext.payload),
      preserved_fact_inventory: factInventory,
      compression_notes: {
        strategy: 'deterministic structural compaction; refs remain authoritative',
        retained_refs_are_authoritative: true,
        payload_is_not_business_authority: true,
      },
    };
    const reportResult = this.compressionRuntime.createReport({
      context_policy_profile: input.runtimeProfile.profile,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      compression_report_ref: compressionReportRef,
      source_refs: sourceRefs,
      input_context: {
        exploration_context: input.explorationContext.payload,
        arbiter_context: input.arbiterContext.payload,
      },
      compressed_context: compressedContext,
      summary: {
        schema_version: 'topic-selection-v1a-n6-compression-summary-v1',
        node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
        context_family: input.runtimeProfile.profile.context_family,
        preserved_fact_inventory: factInventory,
        source_context_packet_hashes: compressedContext.source_context_packet_hashes,
        authority_note: 'Compression is advisory context only and cannot create or satisfy authority writes.',
      },
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: factInventory,
      compressed_preserved_facts: factInventory,
      redaction_policy: input.runtimeProfile.profile.redaction_policy,
      estimated_input_tokens_before_override: input.estimatedInputTokensBefore,
      estimated_input_tokens_after_override:
        input.input.runtime_token_budget_overrides?.estimated_input_tokens_after_compression_override,
    });
    const artifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id ?? null,
      workflow_run_id: input.input.node_input.workflow_run_id,
      node_attempt_id: input.input.node_input.node_attempt_id,
      artifact_key: 'context_compression_report',
      payload_schema: CONTEXT_COMPRESSION_REPORT_PAYLOAD_SCHEMA,
      payload: {
        payload_schema: CONTEXT_COMPRESSION_REPORT_PAYLOAD_SCHEMA,
        report: reportResult.report,
        compressed_context: compressedContext,
      },
      source_refs: sourceRefs,
      created_by: input.input.created_by ?? 'system',
    });

    return {
      artifact: artifact.artifact_entry,
      compressedContext,
      result: reportResult,
    };
  }

  private async maybePersistAdmittedCandidates(input: {
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput;
    rankedBatch: TopicSelectionRankedCandidateDraftBatch;
    admissionReport: TopicSelectionCandidateDraftAdmissionReport;
    rankedBatchArtifact: { artifact_entry: TopicSelectionGenerateNeedCandidateArtifactRefEntry };
    candidateDraftAdmissionArtifact: { artifact_entry: TopicSelectionGenerateNeedCandidateArtifactRefEntry };
    supplementalRoundRoutingDecision: TopicSelectionSupplementalRoundRoutingDecision;
    supplementalRoundRoutingArtifact: { artifact_entry: TopicSelectionGenerateNeedCandidateArtifactRefEntry };
  }): Promise<{
    command: TopicSelectionPersistNeedCandidateBatchCommand;
    commandArtifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry;
    result: TopicSelectionPersistNeedCandidateBatchResult;
  } | null> {
    if (
      !input.input.persist_admitted_candidates
      || input.supplementalRoundRoutingDecision.routing_decision !== 'finalize_with_admitted_batch'
    ) {
      return null;
    }
    if (!this.needCandidateBatchPersistence) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'persist_admitted_candidates requires needCandidateBatchPersistence dependency.',
      );
    }
    if (!input.input.persistence_context) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'persist_admitted_candidates requires persistence_context.',
      );
    }

    const command = this.needCandidateBatchPersistence.buildCommand({
      node_input: input.input.node_input,
      ranked_candidate_draft_batch: input.rankedBatch,
      admission_report: input.admissionReport,
      ranked_candidate_draft_batch_artifact_ref: input.rankedBatchArtifact.artifact_entry.artifact_ref,
      admission_report_artifact_ref: input.candidateDraftAdmissionArtifact.artifact_entry.artifact_ref,
      supplemental_routing_artifact_refs: [input.supplementalRoundRoutingArtifact.artifact_entry.artifact_ref],
    });
    const commandArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id ?? null,
      workflow_run_id: input.input.node_input.workflow_run_id,
      node_attempt_id: input.input.node_input.node_attempt_id,
      artifact_key: 'persist_need_candidate_batch_command',
      payload_schema: PERSIST_NEED_CANDIDATE_BATCH_PAYLOAD_SCHEMA,
      payload: command as unknown as Record<string, unknown>,
      source_refs: [
        input.rankedBatchArtifact.artifact_entry.artifact_ref,
        input.candidateDraftAdmissionArtifact.artifact_entry.artifact_ref,
        input.supplementalRoundRoutingArtifact.artifact_entry.artifact_ref,
      ],
      created_by: input.input.created_by ?? 'system',
    });
    const result = await this.needCandidateBatchPersistence.persistBatch({
      command,
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id ?? null,
      search_run_ref: input.input.persistence_context.search_run_ref,
      search_plan_ref: input.input.persistence_context.search_plan_ref,
      literature_snapshot_ref: input.input.persistence_context.literature_snapshot_ref,
      persist_command_artifact_ref: commandArtifact.artifact_entry.artifact_ref,
      created_by: input.input.created_by ?? 'system',
    });

    return {
      command,
      commandArtifact: commandArtifact.artifact_entry,
      result,
    };
  }

  private adapterStatusForRoutingDecision(
    decision: TopicSelectionSupplementalRoundRoutingDecision,
  ): TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult['status'] {
    if (decision.routing_decision === 'require_human_review') {
      return 'require_human_review';
    }
    if (decision.routing_decision === 'block' || decision.routing_decision === 'reject_without_supplement') {
      return 'blocked';
    }
    return 'succeeded';
  }

  private blockerCodesForRoutingDecision(
    decision: TopicSelectionSupplementalRoundRoutingDecision,
    admissionReport: TopicSelectionCandidateDraftAdmissionReport,
  ): string[] {
    if (
      decision.routing_decision === 'finalize_with_admitted_batch'
      || decision.routing_decision === 'run_supplemental_round'
    ) {
      return [];
    }
    return this.uniqueStrings([
      ...admissionReport.blocking_reason_codes,
      ...decision.trigger_reason_codes,
    ]);
  }

  private errorCodeForRoutingDecision(
    decision: TopicSelectionSupplementalRoundRoutingDecision,
    admissionReport: TopicSelectionCandidateDraftAdmissionReport,
  ): string | null {
    if (
      decision.routing_decision === 'finalize_with_admitted_batch'
      || decision.routing_decision === 'run_supplemental_round'
      || decision.routing_decision === 'require_human_review'
    ) {
      return null;
    }
    return admissionReport.blocking_reason_codes[0]
      ?? decision.trigger_reason_codes[0]
      ?? 'NO_ADMISSIBLE_NEED_CANDIDATE';
  }

  private runtimeTokenBudgetInput(
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput,
    resolvedProfile: TopicSelectionResolvedContextPolicyProfile = this.resolveSingleAgentRuntimeProfile(),
    options: {
      compressionReportRef?: TopicSelectionFunctionalRef | null;
      compressionReportHash?: string | null;
      compressedContextHash?: string | null;
      compressionAlreadyApplied?: boolean;
      estimatedInputTokensOverride?: number | null;
      schemaOverheadTokensOverride?: number | null;
    } = {},
  ) {
    const overrides = input.runtime_token_budget_overrides ?? {};
    return {
      context_policy_profile: resolvedProfile.profile,
      context_policy_profile_hash: resolvedProfile.profile_hash,
      runtime_invocation_context_hash: this.runtimeInvocationContextHash(input, resolvedProfile),
      compression_report_ref: options.compressionReportRef ?? null,
      compression_report_hash: options.compressionReportHash ?? null,
      compressed_context_hash: options.compressedContextHash ?? null,
      compression_already_applied: options.compressionAlreadyApplied ?? overrides.compression_already_applied ?? false,
      estimated_input_tokens_override: options.estimatedInputTokensOverride
        ?? overrides.estimated_input_tokens_override,
      schema_overhead_tokens_override: options.schemaOverheadTokensOverride
        ?? overrides.schema_overhead_tokens_override,
    };
  }

  private runtimeInvocationContextHash(
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput,
    resolvedProfile: TopicSelectionResolvedContextPolicyProfile,
  ): string {
    const currentRoundIndex = input.current_round_index ?? 1;
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: resolvedProfile.profile.invocation_slot_id,
      scenario_context: {
        identity_policy: 'not_semantic',
        scenario_id: null,
        scenario_case_id: null,
        semantic_scenario_key: null,
      },
      loop_context: {
        loop_kind: currentRoundIndex > 1 ? 'supplemental_round' : 'initial',
        loop_stage: 'need_candidate_generation',
        current_round_index: currentRoundIndex,
        remaining_round_budget: input.remaining_round_budget ?? null,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: {
        debate_loop_id: null,
        debate_policy_id: null,
        round_index: null,
        role: null,
        stage: null,
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: null,
        dynamic_material_refs_hash: null,
      },
    });
  }

  private resolveSingleAgentRuntimeProfile(): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id:
        TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.need_candidate_generation,
      invocation_slot_id:
        TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.need_candidate_generation,
    });
  }

  private buildMessages(
    nodeInput: TopicSelectionGenerateNeedCandidateNodeInput,
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
    compressedContext?: TopicSelectionGenerateNeedCandidateCompressedContext | null,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'You are the v1a need-candidate drafting agent: turn EvidenceMap-grounded evidence signals into a ranked batch of validation-ready NeedCandidate drafts (artifacts only, never authority records).',
          'Generate a RankedCandidateDraftBatch for the v1a topic-selection generate-need-candidate node.',
          'Use only the supplied refs and context packets.',
          'The candidate_pool_digest and sibling_candidate_digest describe existing sibling candidates for duplicate awareness only; an empty pool means there are no known duplicates, not that generation should stop.',
          'Generate new candidate drafts from the evidence signals, evidence_ref_table, resource sample digest, and challenge prompts.',
          'For every candidate draft, include non-empty scope_notes that state the exact population, technique, evidence boundary, and validation boundary; candidates without scope_notes are not validation-ready.',
          'Set speculative=false unless the supplied evidence directly forces uncertainty; speculative candidates are intentionally blocked before validation.',
          'Rank drafts 1-based by descending need strength; for each draft give a candidate_need with a distinct unmet_need_statement, a mechanism_type, prior_art_status, and gap_codes, plus mechanism_summary and non_goal_notes where applicable.',
          'Set draft_batch.terminal_result to reflect whether any admissible draft exists and give a ranking_rationale for the order; record discarded angles in rejected_framings and anything unsettled in unresolved_points (routed_to = supplemental_round, human_review, or blocked).',
          'Role bundle refs must be role-specific evidence_unit refs only: support_unit_refs use support units, challenge_unit_refs use challenge units, baseline_unit_refs use baseline units, and context_unit_refs use context units.',
          'Before returning, check every role-bundle ref against role_ref_constraints; if a role has no allowed evidence_unit refs, return an empty array for that role rather than borrowing another role.',
          'Do not use baseline, challenge, or context units in support_unit_refs to mean they support the written argument; EvidenceMap role is authoritative.',
          'Do not place evidence_conflict/evidence_conflict_set or evidence_strength_assessment refs in the role bundle; put them only in conflict_refs or strength_assessment_refs.',
          'Do not create NeedCandidate, ValidatedNeed, TopicQuestionContract, SearchPlan, or any authority record.',
          'Do not include hidden reasoning, raw transcripts, provider logs, credentials, or secrets.',
          'Return only the structured output matching the ranked candidate draft batch schema.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          node_input: nodeInput,
          context_packets: this.messageContextPackets(explorationContext, arbiterContext, compressedContext ?? null),
          output_constraints: {
            schema_name: RANKED_BATCH_SCHEMA_NAME,
            max_persisted_candidates: arbiterContext.context_family === 'arbiter_context'
              ? arbiterContext.payload.max_persisted_candidates
              : 5,
            authority_write_boundary: 'artifact-only ranked draft batch; no authority writes',
            candidate_pool_digest_role: 'existing_sibling_candidates_for_duplicate_awareness',
            empty_candidate_pool_meaning: 'no known duplicate candidates; still generate new drafts from evidence',
            generation_source: 'evidence signals and refs, not pre-existing candidate pool entries',
            readiness_required_fields: {
              scope_notes: 'required non-empty string for every draft',
              speculative: 'false unless evidence explicitly requires uncertainty',
            },
            role_bundle_ref_rule: 'support/challenge/baseline/context_unit_refs accept only evidence_unit refs whose EvidenceMap role matches the field name',
            role_ref_constraints: this.roleRefConstraints(arbiterContext),
            strength_conflict_ref_rule: 'evidence_strength_assessment refs belong in strength_assessment_refs; evidence_conflict/evidence_conflict_set refs belong in conflict_refs',
          },
        }),
      },
    ];
  }

  private messageContextPackets(
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
    compressedContext: TopicSelectionGenerateNeedCandidateCompressedContext | null,
  ): Record<string, unknown> {
    if (compressedContext) {
      return {
        compressed_context: compressedContext,
        source_context_packets: {
          exploration_context: {
            input_refs_hash: explorationContext.input_refs_hash,
            payload_hash: explorationContext.payload_hash,
            cache_key: explorationContext.cache_key,
          },
          arbiter_context: {
            input_refs_hash: arbiterContext.input_refs_hash,
            payload_hash: arbiterContext.payload_hash,
            cache_key: arbiterContext.cache_key,
          },
        },
      };
    }
    return {
      exploration_context: {
        input_refs_hash: explorationContext.input_refs_hash,
        payload_hash: explorationContext.payload_hash,
        cache_key: explorationContext.cache_key,
        payload: explorationContext.payload,
      },
      arbiter_context: {
        input_refs_hash: arbiterContext.input_refs_hash,
        payload_hash: arbiterContext.payload_hash,
        cache_key: arbiterContext.cache_key,
        payload: arbiterContext.payload,
      },
    };
  }

  private compressionFactInventory(
    profile: TopicSelectionContextPolicyProfile,
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const inventory: TopicSelectionCompressionFactInventory = {};
    const add = (kind: string, value: string | null | undefined) => {
      if (!value?.trim() || !profile.compression_policy.preserved_fact_kinds.includes(kind)) {
        return;
      }
      inventory[kind] = this.uniqueStrings([...(inventory[kind] ?? []), value.trim()]);
    };

    const explorationPayload = explorationContext.context_family === 'exploration_context'
      ? explorationContext.payload
      : null;
    const arbiterPayload = arbiterContext.context_family === 'arbiter_context'
      ? arbiterContext.payload
      : null;

    if (explorationPayload) {
      const coverage = this.recordAt(explorationPayload, ['search_coverage_digest']);
      const coverageStatus = this.stringAt(coverage, ['coverage']);
      if (coverageStatus && coverageStatus !== 'complete') {
        add('source_health_warning', `search_coverage:${coverageStatus}`);
      }
      const challengePrompts = Array.isArray(explorationPayload.challenge_prompts)
        ? explorationPayload.challenge_prompts
        : [];
      for (const prompt of challengePrompts) {
        if (typeof prompt === 'string') {
          add('unresolved_challenge', prompt);
        }
      }
      const decisionMemory = this.recordAt(explorationPayload, ['decision_memory_digest']);
      const requiredChallenges = this.arrayOfStringsAt(decisionMemory, ['required_challenges']);
      for (const challenge of requiredChallenges) {
        add('residual_risk', challenge);
        add('unresolved_challenge', challenge);
      }
    }

    const targets = this.methodFamilyTargets(explorationContext);
    const counts = this.methodFamilyCounts(explorationContext);
    for (const target of targets) {
      if ((counts[target] ?? 0) <= 0) {
        add('method_family_gap', target);
      }
    }

    if (arbiterPayload) {
      for (const rule of Array.isArray(arbiterPayload.failure_rules) ? arbiterPayload.failure_rules : []) {
        if (typeof rule === 'string') {
          add('blocker', rule);
        }
      }
      for (const point of Array.isArray(arbiterPayload.unresolved_points) ? arbiterPayload.unresolved_points : []) {
        const label = typeof point === 'string'
          ? point
          : this.isRecord(point)
            ? this.stringAt(point, ['label']) ?? this.stringAt(point, ['summary']) ?? stableStringify(point)
            : null;
        add('unresolved_challenge', label);
      }
    }

    return inventory;
  }

  private compactPayload(value: unknown, depth = 0): unknown {
    if (typeof value === 'string') {
      return value.length > 700
        ? {
          truncated_text: true,
          preview: value.slice(0, 700),
          original_length: value.length,
          full_hash: sha256Text(value),
        }
        : value;
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      const maxItems = depth <= 2 ? 18 : 10;
      const keptItems = value.slice(0, maxItems).map((item) => this.compactPayload(item, depth + 1));
      if (value.length <= maxItems) {
        return keptItems;
      }
      return {
        truncated_array: true,
        kept_items: keptItems,
        omitted_count: value.length - maxItems,
        full_hash: sha256Text(stableStringify(value)),
      };
    }
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = depth >= 5
        ? {
          truncated_object: true,
          full_hash: sha256Text(stableStringify(child)),
        }
        : this.compactPayload(child, depth + 1);
    }
    return output;
  }

  private syntheticCompressionReportRef(
    input: TopicSelectionGenerateNeedCandidateOrchestratorAdapterInput,
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'compression_report',
      ref_id: `compression_report_${sha256Text(stableStringify({
        node_attempt_id: input.node_input.node_attempt_id,
        exploration_payload_hash: explorationContext.payload_hash,
        arbiter_payload_hash: arbiterContext.payload_hash,
        profile_id: input.node_input.profile_id,
      })).slice(0, 32)}`,
      title_card_id: input.title_card_id ?? null,
    };
  }

  private contextResolvableRefs(
    nodeInput: TopicSelectionGenerateNeedCandidateNodeInput,
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): TopicSelectionFunctionalRef[] {
    const arbiterPayload = arbiterContext.context_family === 'arbiter_context'
      ? arbiterContext.payload
      : null;
    return this.uniqueRefs([
      ...this.inputRefs(nodeInput),
      ...explorationContext.input_refs,
      ...arbiterContext.input_refs,
      ...this.extractFunctionalRefs(arbiterPayload?.evidence_ref_table),
      ...this.extractFunctionalRefs(arbiterPayload?.rejected_framing_table),
      ...this.extractFunctionalRefs(arbiterPayload?.unresolved_points),
    ]);
  }

  private candidatePoolEntries(
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): Array<{ normalized_candidate_key: string; candidate_ref: TopicSelectionFunctionalRef }> {
    if (arbiterContext.context_family !== 'arbiter_context') {
      return [];
    }
    const digest = arbiterContext.payload.candidate_pool_digest;
    if (!this.isRecord(digest) || !Array.isArray(digest.candidate_entries)) {
      return [];
    }
    return digest.candidate_entries
      .map((entry) => {
        if (!this.isRecord(entry) || typeof entry.normalized_candidate_key !== 'string') {
          return null;
        }
        const candidateRef = this.readFunctionalRef(entry.candidate_ref);
        if (!candidateRef) {
          return null;
        }
        return {
          normalized_candidate_key: entry.normalized_candidate_key,
          candidate_ref: candidateRef,
        };
      })
      .filter((entry): entry is { normalized_candidate_key: string; candidate_ref: TopicSelectionFunctionalRef } =>
        Boolean(entry),
      );
  }

  private evidenceRoleRefEntries(
    arbiterContext: TopicSelectionNeedDiscoveryContextPacket,
  ): TopicSelectionCandidateDraftEvidenceRoleRefEntry[] {
    if (arbiterContext.context_family !== 'arbiter_context') {
      return [];
    }
    const table = arbiterContext.payload.evidence_ref_table;
    if (!Array.isArray(table)) {
      return [];
    }
    return table
      .map((entry) => {
        if (!this.isRecord(entry) || typeof entry.role !== 'string') {
          return null;
        }
        const evidenceRef = this.readFunctionalRef(entry.evidence_ref);
        if (!evidenceRef) {
          return null;
        }
        return {
          evidence_ref: evidenceRef,
          role: entry.role,
        };
      })
      .filter((entry): entry is TopicSelectionCandidateDraftEvidenceRoleRefEntry => Boolean(entry));
  }

  private roleRefConstraints(arbiterContext: TopicSelectionNeedDiscoveryContextPacket): Record<string, unknown> {
    const empty = {
      support_unit_refs: [],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
      conflict_refs: [],
      strength_assessment_refs: [],
      hard_rules: [
        'Each role-bundle field may contain only refs from the same-named allowed list.',
        'If no allowed refs exist for a role-bundle field, return an empty array for that field.',
        'Do not duplicate an evidence_unit into a different role field.',
      ],
    };
    if (arbiterContext.context_family !== 'arbiter_context') {
      return empty;
    }
    const constraints: Record<string, TopicSelectionFunctionalRef[]> = {
      support_unit_refs: [],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
      conflict_refs: [],
      strength_assessment_refs: [],
    };
    const table = arbiterContext.payload.evidence_ref_table;
    if (!Array.isArray(table)) {
      return empty;
    }
    for (const entry of table) {
      if (!this.isRecord(entry)) {
        continue;
      }
      const evidenceRef = this.readFunctionalRef(entry.evidence_ref);
      if (!evidenceRef) {
        continue;
      }
      const role = typeof entry.evidence_role === 'string'
        ? entry.evidence_role
        : typeof entry.role === 'string'
          ? entry.role
          : null;
      if (
        evidenceRef.ref_type === 'evidence_unit'
        && (role === 'support' || role === 'challenge' || role === 'baseline' || role === 'context')
      ) {
        constraints[`${role}_unit_refs`]?.push(evidenceRef);
        continue;
      }
      if (evidenceRef.ref_type === 'evidence_conflict' || evidenceRef.ref_type === 'evidence_conflict_set') {
        constraints.conflict_refs?.push(evidenceRef);
        continue;
      }
      if (evidenceRef.ref_type === 'evidence_strength_assessment') {
        constraints.strength_assessment_refs?.push(evidenceRef);
      }
    }
    return {
      support_unit_refs: this.uniqueRefs(constraints.support_unit_refs ?? []),
      challenge_unit_refs: this.uniqueRefs(constraints.challenge_unit_refs ?? []),
      baseline_unit_refs: this.uniqueRefs(constraints.baseline_unit_refs ?? []),
      context_unit_refs: this.uniqueRefs(constraints.context_unit_refs ?? []),
      conflict_refs: this.uniqueRefs(constraints.conflict_refs ?? []),
      strength_assessment_refs: this.uniqueRefs(constraints.strength_assessment_refs ?? []),
      hard_rules: empty.hard_rules,
    };
  }

  private methodFamilyCounts(
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
  ): Record<string, number> {
    if (explorationContext.context_family !== 'exploration_context') {
      return {};
    }
    const digest = explorationContext.payload.resource_sample_digest;
    if (!this.isRecord(digest) || !this.isRecord(digest.method_family_counts)) {
      return {};
    }
    return Object.entries(digest.method_family_counts).reduce<Record<string, number>>((counts, [family, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        counts[family] = value;
      }
      return counts;
    }, {});
  }

  private methodFamilyTargets(
    explorationContext: TopicSelectionNeedDiscoveryContextPacket,
  ): string[] {
    if (explorationContext.context_family !== 'exploration_context') {
      return [];
    }
    const resourceDigest = explorationContext.payload.resource_sample_digest;
    const searchDigest = explorationContext.payload.search_coverage_digest;
    const targets = this.isRecord(searchDigest) && Array.isArray(searchDigest.method_family_targets)
      ? searchDigest.method_family_targets
      : this.isRecord(resourceDigest) && Array.isArray(resourceDigest.topic_method_family_targets)
        ? resourceDigest.topic_method_family_targets
        : [];
    return this.uniqueStrings(targets
      .filter((target): target is string => typeof target === 'string' && target.trim().length > 0)
      .map((target) => target.trim()));
  }

  private adapterWarningCodes(
    invocationWarnings: string[],
    minimumValidationWarnings: string[],
    admissionReport: TopicSelectionCandidateDraftAdmissionReport,
  ): string[] {
    return this.uniqueStrings([
      ...invocationWarnings,
      ...minimumValidationWarnings,
      ...admissionReport.draft_results.flatMap((result) =>
        result.decision === 'admit'
          ? result.reason_codes.filter((code) => code === 'METHOD_FAMILY_COVERAGE_GAP')
          : [],
      ),
    ]);
  }

  private debateArtifactRefs(
    debateResult: TopicSelectionNeedDiscoveryDebateLoopResult | null,
  ): TopicSelectionGenerateNeedCandidateArtifactRefEntry[] {
    if (!debateResult) {
      return [];
    }
    return [
      ...debateResult.role_output_artifacts,
      ...debateResult.role_level_summary_artifacts,
      debateResult.issue_frame_artifact,
      debateResult.final_synthesis_artifact,
    ].filter((artifact): artifact is TopicSelectionGenerateNeedCandidateArtifactRefEntry => Boolean(artifact));
  }

  private inputRefs(input: TopicSelectionGenerateNeedCandidateNodeInput): TopicSelectionFunctionalRef[] {
    return [
      input.topic_scope_ref,
      input.evidence_map_ref,
      input.evidence_strength_ref,
      input.resource_sample_set_ref,
      input.candidate_pool_projection_ref,
      ...input.search_snapshot_refs,
      ...input.resource_snapshot_refs,
      input.operator_reuse_approval_ref,
    ].filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref));
  }

  private extractFunctionalRefs(value: unknown): TopicSelectionFunctionalRef[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractFunctionalRefs(item));
    }
    const ref = this.readFunctionalRef(value);
    if (ref) {
      return [ref];
    }
    if (!this.isRecord(value)) {
      return [];
    }
    return Object.values(value).flatMap((item) => this.extractFunctionalRefs(item));
  }

  private readFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
    if (!this.isRecord(value)) {
      return null;
    }
    if (typeof value.ref_type !== 'string' || typeof value.ref_id !== 'string') {
      return null;
    }
    return value as unknown as TopicSelectionFunctionalRef;
  }

  private recordAt(value: unknown, path: string[]): Record<string, unknown> | null {
    let current = value;
    for (const segment of path) {
      if (!this.isRecord(current)) {
        return null;
      }
      current = current[segment];
    }
    return this.isRecord(current) ? current : null;
  }

  private stringAt(value: unknown, path: string[]): string | null {
    let current = value;
    for (const segment of path) {
      if (!this.isRecord(current)) {
        return null;
      }
      current = current[segment];
    }
    return typeof current === 'string' && current.trim() ? current.trim() : null;
  }

  private arrayOfStringsAt(value: unknown, path: string[]): string[] {
    let current = value;
    for (const segment of path) {
      if (!this.isRecord(current)) {
        return [];
      }
      current = current[segment];
    }
    if (!Array.isArray(current)) {
      return [];
    }
    return current
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = `${ref.ref_type}:${ref.ref_id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(ref);
    }
    return unique;
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const value of values) {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      unique.push(normalized);
    }
    return unique;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private assertNodeInput(input: TopicSelectionGenerateNeedCandidateNodeInput): void {
    this.assertNonEmpty(input.schema_version, 'schema_version');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertNonEmpty(input.profile_id, 'profile_id');
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertArtifactRef(input.exploration_context_ref, 'exploration_context_ref');
    this.assertArtifactRef(input.arbiter_context_ref, 'arbiter_context_ref');
    for (const [index, ref] of this.inputRefs(input).entries()) {
      this.assertFunctionalRef(ref, `input_ref[${index}]`);
    }
  }

  private assertArtifactRef(value: TopicSelectionFunctionalRef, fieldName: string): void {
    this.assertFunctionalRef(value, fieldName);
    if (value.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.ref_type must be artifact_ref.`);
    }
  }

  private assertFunctionalRef(value: TopicSelectionFunctionalRef, fieldName: string): void {
    if (!value || typeof value !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a functional ref.`);
    }
    this.assertNonEmpty(value.ref_type, `${fieldName}.ref_type`);
    this.assertNonEmpty(value.ref_id, `${fieldName}.ref_id`);
  }

  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
  }
}
