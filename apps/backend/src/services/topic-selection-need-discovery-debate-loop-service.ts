import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  type TopicSelectionAgentExecutionMode,
  topicSelectionNeedDiscoveryDebateIssueFrameSchema,
  topicSelectionNeedDiscoveryDeepCriticNotesSchema,
  topicSelectionNeedDiscoveryExplorerNotesSchema,
  topicSelectionRankedCandidateDraftBatchSchema,
  type TopicSelectionArtifactFunctionalRef,
  type TopicSelectionGenerateNeedCandidateArtifactRefEntry,
  type TopicSelectionGenerateNeedCandidateNodeInput,
  type TopicSelectionNeedDiscoveryDebateFinalSynthesisArtifact,
  type TopicSelectionNeedDiscoveryDebateIssueFrame,
  type TopicSelectionNeedDiscoveryDeepCriticNotes,
  type TopicSelectionNeedDiscoveryExplorerNotes,
  type TopicSelectionNeedDiscoveryRoleLevelSummary,
  type TopicSelectionNeedDiscoveryContextPacket,
  type TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
  type TopicSelectionDynamicPromptMaterialRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import {
  createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract,
  TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_POLICY_ID,
  TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_NODE_ID,
  type TopicSelectionDebateInstancePolicy,
  type TopicSelectionDebateRoleStageSlot,
  type TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan,
  type TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides,
  type TopicSelectionV1aGenerateNeedCandidateDebateSlotId,
  type TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionAgentRunMode,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
  TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  TopicSelectionAgentExecutionSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import {
  TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
const NEED_DISCOVERY_DEBATE_CONTRACT =
  createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract();

const NODE_ID = TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_NODE_ID;
const DEBATE_POLICY_ID = TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_POLICY_ID;

const ROLE_LEVEL_SUMMARY_PAYLOAD_SCHEMA = 'NeedDiscoveryRoleLevelSummary@v1' as const;
const FINAL_SYNTHESIS_PAYLOAD_SCHEMA = 'NeedDiscoveryDebateFinalSynthesisArtifact@v1' as const;

function roleStageSlot(slotId: string): TopicSelectionDebateRoleStageSlot {
  const slot = NEED_DISCOVERY_DEBATE_CONTRACT.role_stage_slots.find((item) => item.slot_id === slotId);
  if (!slot) {
    throw new Error(`Missing debate role/stage slot: ${slotId}`);
  }
  return slot;
}

const EXPLORER_SLOT = roleStageSlot('explorer.round_1_discovery');
const DEEP_CRITIC_SLOT = roleStageSlot('deep_critic.round_1_discovery');
const ISSUE_FRAME_SLOT = roleStageSlot('arbiter.issue_framing');
const FINAL_SYNTHESIS_SLOT = roleStageSlot('arbiter.final_synthesis');

function configuredPrompt(slot: TopicSelectionDebateRoleStageSlot) {
  const prompt = defaultLlmConfig().getPrompt('topic-selection', slot.prompt_template_id);
  if (prompt.version !== slot.prompt_template_version) {
    throw new Error(
      `Prompt version drift for ${slot.slot_id}: scenario=${slot.prompt_template_version}, config=${prompt.version}.`,
    );
  }
  return prompt;
}

export type TopicSelectionNeedDiscoveryDebateMockedOutputs = {
  explorer: Array<TopicSelectionMockedAgentOutput<TopicSelectionNeedDiscoveryExplorerNotes>>;
  deep_critic: Array<TopicSelectionMockedAgentOutput<TopicSelectionNeedDiscoveryDeepCriticNotes>>;
  arbiter_issue_frame: TopicSelectionMockedAgentOutput<TopicSelectionNeedDiscoveryDebateIssueFrame>;
  arbiter_final: TopicSelectionMockedAgentOutput<TopicSelectionRankedCandidateDraftBatch>;
};

export type TopicSelectionNeedDiscoveryDebateCodexResponses = {
  explorer?: Array<TopicSelectionCodexAssistedAgentOutput<TopicSelectionNeedDiscoveryExplorerNotes>>;
  deep_critic?: Array<TopicSelectionCodexAssistedAgentOutput<TopicSelectionNeedDiscoveryDeepCriticNotes>>;
  arbiter_issue_frame?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionNeedDiscoveryDebateIssueFrame>;
  arbiter_final?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionRankedCandidateDraftBatch>;
};

export type TopicSelectionNeedDiscoveryDebateLoopInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  run_mode: TopicSelectionAgentRunMode;
  exploration_context_packet: TopicSelectionNeedDiscoveryContextPacket;
  arbiter_context_packet: TopicSelectionNeedDiscoveryContextPacket;
  debate_loop_id?: string | null;
  debate_policy_id?: string | null;
  round_index?: number | null;
  execution_plan?: TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan | null;
  slot_execution_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides | null;
  slot_model_option_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides | null;
  mocked_outputs?: TopicSelectionNeedDiscoveryDebateMockedOutputs | null;
  codex_responses?: TopicSelectionNeedDiscoveryDebateCodexResponses | null;
  model_option_id?: string | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
};

export type TopicSelectionNeedDiscoveryDebateLoopResult = {
  schema_version: 'v1';
  debate_loop_id: string;
  debate_policy_id: string;
  round_index: number;
  status: 'succeeded' | 'blocked';
  ranked_candidate_draft_batch: TopicSelectionRankedCandidateDraftBatch | null;
  final_invocation_result: TopicSelectionAgentInvocationResult<unknown>;
  role_invocation_results: Array<TopicSelectionAgentInvocationResult<unknown>>;
  role_output_artifacts: TopicSelectionGenerateNeedCandidateArtifactRefEntry[];
  role_level_summary_artifacts: TopicSelectionGenerateNeedCandidateArtifactRefEntry[];
  issue_frame_artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  final_synthesis_artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
  blocker_codes: string[];
  error_code?: string | null;
};

type RoleInvocationRecord<T> = {
  output: T | null;
  invocation: TopicSelectionAgentInvocationResult<T>;
  artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null;
};

type CompletedRoleInvocationRecord<T> = {
  output: T;
  invocation: TopicSelectionAgentInvocationResult<T>;
  artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry;
};

type ResolvedAgentExecutionSpec = Required<Pick<TopicSelectionAgentExecutionSpec, 'execution_mode'>> & {
  model_option_id: string | null;
};

export class TopicSelectionNeedDiscoveryDebateLoopService {
  constructor(
    private readonly dependencies: {
      agentOrchestrator: TopicSelectionAgentOrchestratorService;
      artifactBoundary: TopicSelectionNeedDiscoveryArtifactBoundaryService;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
    },
  ) {
    this.contextPolicyProfileRegistry = dependencies.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
  }

  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;

  async runNeedDiscoveryDebate(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
  ): Promise<TopicSelectionNeedDiscoveryDebateLoopResult> {
    this.assertInput(input);
    const debateLoopId = input.debate_loop_id?.trim() || `${input.node_input.node_attempt_id}.debate_loop_001`;
    const debatePolicyId = input.debate_policy_id?.trim() || DEBATE_POLICY_ID;
    const roundIndex = input.round_index ?? 1;

    const explorerRecords = await this.invokeExplorerRole(input, debateLoopId, debatePolicyId, roundIndex);
    const explorerBlocked = this.firstBlocked(explorerRecords.map((record) => record.invocation));
    if (explorerBlocked) {
      return this.blockedResult(debateLoopId, debatePolicyId, roundIndex, explorerBlocked, explorerRecords);
    }
    const deepCriticRecords = await this.invokeDeepCriticRole(input, debateLoopId, debatePolicyId, roundIndex);
    const allWorkerRecords = [...explorerRecords, ...deepCriticRecords];
    const deepCriticBlocked = this.firstBlocked(deepCriticRecords.map((record) => record.invocation));
    if (deepCriticBlocked) {
      return this.blockedResult(debateLoopId, debatePolicyId, roundIndex, deepCriticBlocked, allWorkerRecords);
    }
    const completedExplorerRecords = this.completedRecords(explorerRecords, 'explorer');
    const completedDeepCriticRecords = this.completedRecords(deepCriticRecords, 'deep_critic');

    const explorerSummary = this.explorerSummary(debateLoopId, roundIndex, completedExplorerRecords);
    const deepCriticSummary = this.deepCriticSummary(debateLoopId, roundIndex, completedDeepCriticRecords);
    const roleLevelSummaries = [explorerSummary, deepCriticSummary];
    const explorerSummaryArtifact = await this.recordRoleLevelSummary(input, explorerSummary);
    const deepCriticSummaryArtifact = await this.recordRoleLevelSummary(input, deepCriticSummary);
    const summaryArtifacts = [explorerSummaryArtifact, deepCriticSummaryArtifact];

    const issueFrameRecord = await this.invokeIssueFrame({
      input,
      debateLoopId,
      debatePolicyId,
      roundIndex,
      roleLevelSummaryRefs: summaryArtifacts.map((artifact) => artifact.artifact_ref),
      roleLevelSummaries,
      parentInvocationAttemptIds: allWorkerRecords.map((record) => record.invocation.provenance.invocation_attempt_id),
    });
    if (
      issueFrameRecord.invocation.status !== 'succeeded'
      || !issueFrameRecord.invocation.structured_output
      || !issueFrameRecord.artifact
    ) {
      return this.blockedResult(
        debateLoopId,
        debatePolicyId,
        roundIndex,
        issueFrameRecord.invocation,
        allWorkerRecords,
        summaryArtifacts,
        issueFrameRecord.artifact,
        [issueFrameRecord.invocation],
      );
    }

    const finalInvocation = await this.invokeFinalSynthesis({
      input,
      debateLoopId,
      debatePolicyId,
      roundIndex,
      issueFrameRef: issueFrameRecord.artifact.artifact_ref,
      issueFrame: issueFrameRecord.invocation.structured_output,
      roleLevelSummaryRefs: summaryArtifacts.map((artifact) => artifact.artifact_ref),
      roleLevelSummaries,
      parentInvocationAttemptIds: [
        ...allWorkerRecords.map((record) => record.invocation.provenance.invocation_attempt_id),
        issueFrameRecord.invocation.provenance.invocation_attempt_id,
      ],
    });
    if (finalInvocation.status !== 'succeeded' || !finalInvocation.structured_output) {
      return this.blockedResult(
        debateLoopId,
        debatePolicyId,
        roundIndex,
        finalInvocation,
        allWorkerRecords,
        summaryArtifacts,
        issueFrameRecord.artifact,
        [issueFrameRecord.invocation],
      );
    }

    const finalSynthesisArtifact = await this.recordFinalSynthesisArtifact({
      input,
      debateLoopId,
      roundIndex,
      finalInvocation,
      issueFrameRef: issueFrameRecord.artifact.artifact_ref,
      roleLevelSummaryRefs: summaryArtifacts.map((artifact) => artifact.artifact_ref),
    });

    return {
      schema_version: 'v1',
      debate_loop_id: debateLoopId,
      debate_policy_id: debatePolicyId,
      round_index: roundIndex,
      status: 'succeeded',
      ranked_candidate_draft_batch: finalInvocation.structured_output,
      final_invocation_result: finalInvocation,
      role_invocation_results: [
        ...allWorkerRecords.map((record) => record.invocation),
        issueFrameRecord.invocation,
      ],
      role_output_artifacts: this.presentArtifacts(allWorkerRecords.map((record) => record.artifact)),
      role_level_summary_artifacts: summaryArtifacts,
      issue_frame_artifact: issueFrameRecord.artifact,
      final_synthesis_artifact: finalSynthesisArtifact,
      blocker_codes: [],
      error_code: null,
    };
  }

  private async invokeExplorerRole(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    debateLoopId: string,
    debatePolicyId: string,
    roundIndex: number,
  ): Promise<Array<RoleInvocationRecord<TopicSelectionNeedDiscoveryExplorerNotes>>> {
    const outputs = input.mocked_outputs?.explorer ?? [];
    const codexResponses = input.codex_responses?.explorer ?? [];
    const instanceCount = this.instanceCount(
      input,
      EXPLORER_SLOT,
      'explorer',
      outputs.length,
      codexResponses.length,
      EXPLORER_SLOT.instance_policy,
    );
    const records: Array<RoleInvocationRecord<TopicSelectionNeedDiscoveryExplorerNotes>> = [];
    for (let index = 0; index < instanceCount; index += 1) {
      const agentInstanceId = `explorer_${index + 1}`;
      const executionSpec = this.resolvedExecutionSpec(input, EXPLORER_SLOT, agentInstanceId);
      const invocation = await this.dependencies.agentOrchestrator.invokeStructuredOutput<TopicSelectionNeedDiscoveryExplorerNotes>({
        ...this.baseInvocation(input, debateLoopId, debatePolicyId, roundIndex, 'explorer', 'round_1_discovery', agentInstanceId, executionSpec),
        profile_id: EXPLORER_SLOT.profile_id,
        output_contract: EXPLORER_SLOT.output_contract,
        prompt: {
          promptTemplateId: configuredPrompt(EXPLORER_SLOT).id,
          version: configuredPrompt(EXPLORER_SLOT).version,
        },
        schema_name: EXPLORER_SLOT.schema_name,
        schema: topicSelectionNeedDiscoveryExplorerNotesSchema as unknown as Record<string, unknown>,
        messages: this.roleMessages(input, 'explorer'),
        mocked_output: this.mockedRoleOutput(executionSpec.execution_mode, outputs[index], `explorer[${index}]`),
        codex_response: this.codexRoleResponse(executionSpec.execution_mode, codexResponses[index], `explorer[${index}]`),
      });
      const artifact = invocation.structured_output
        ? await this.recordRoleOutput(input, invocation, EXPLORER_SLOT.output_contract, invocation.structured_output)
        : null;
      if (!artifact) {
        records.push({ output: null, invocation, artifact: null });
        continue;
      }
      records.push({ output: invocation.structured_output, invocation, artifact });
    }
    return records;
  }

  private async invokeDeepCriticRole(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    debateLoopId: string,
    debatePolicyId: string,
    roundIndex: number,
  ): Promise<Array<RoleInvocationRecord<TopicSelectionNeedDiscoveryDeepCriticNotes>>> {
    const outputs = input.mocked_outputs?.deep_critic ?? [];
    const codexResponses = input.codex_responses?.deep_critic ?? [];
    const instanceCount = this.instanceCount(
      input,
      DEEP_CRITIC_SLOT,
      'deep_critic',
      outputs.length,
      codexResponses.length,
      DEEP_CRITIC_SLOT.instance_policy,
    );
    const records: Array<RoleInvocationRecord<TopicSelectionNeedDiscoveryDeepCriticNotes>> = [];
    for (let index = 0; index < instanceCount; index += 1) {
      const agentInstanceId = `deep_critic_${index + 1}`;
      const executionSpec = this.resolvedExecutionSpec(input, DEEP_CRITIC_SLOT, agentInstanceId);
      const invocation = await this.dependencies.agentOrchestrator.invokeStructuredOutput<TopicSelectionNeedDiscoveryDeepCriticNotes>({
        ...this.baseInvocation(input, debateLoopId, debatePolicyId, roundIndex, 'deep_critic', 'round_1_discovery', agentInstanceId, executionSpec),
        profile_id: DEEP_CRITIC_SLOT.profile_id,
        output_contract: DEEP_CRITIC_SLOT.output_contract,
        prompt: {
          promptTemplateId: configuredPrompt(DEEP_CRITIC_SLOT).id,
          version: configuredPrompt(DEEP_CRITIC_SLOT).version,
        },
        schema_name: DEEP_CRITIC_SLOT.schema_name,
        schema: topicSelectionNeedDiscoveryDeepCriticNotesSchema as unknown as Record<string, unknown>,
        messages: this.roleMessages(input, 'deep_critic'),
        mocked_output: this.mockedRoleOutput(executionSpec.execution_mode, outputs[index], `deep_critic[${index}]`),
        codex_response: this.codexRoleResponse(executionSpec.execution_mode, codexResponses[index], `deep_critic[${index}]`),
      });
      const artifact = invocation.structured_output
        ? await this.recordRoleOutput(input, invocation, DEEP_CRITIC_SLOT.output_contract, invocation.structured_output)
        : null;
      if (!artifact) {
        records.push({ output: null, invocation, artifact: null });
        continue;
      }
      records.push({ output: invocation.structured_output, invocation, artifact });
    }
    return records;
  }

  private async invokeIssueFrame(input: {
    input: TopicSelectionNeedDiscoveryDebateLoopInput;
    debateLoopId: string;
    debatePolicyId: string;
    roundIndex: number;
    roleLevelSummaryRefs: TopicSelectionArtifactFunctionalRef[];
    roleLevelSummaries: TopicSelectionNeedDiscoveryRoleLevelSummary[];
    parentInvocationAttemptIds: string[];
  }): Promise<RoleInvocationRecord<TopicSelectionNeedDiscoveryDebateIssueFrame>> {
    const executionSpec = this.resolvedExecutionSpec(input.input, ISSUE_FRAME_SLOT, 'arbiter_issue_frame');
    const invocation = await this.dependencies.agentOrchestrator.invokeStructuredOutput<TopicSelectionNeedDiscoveryDebateIssueFrame>({
      ...this.baseInvocation(
        input.input,
        input.debateLoopId,
        input.debatePolicyId,
        input.roundIndex,
        'arbiter',
        'issue_framing',
        'arbiter_issue_frame',
        executionSpec,
        input.parentInvocationAttemptIds,
        {
          role_level_summary_refs: input.roleLevelSummaryRefs,
        },
      ),
      profile_id: ISSUE_FRAME_SLOT.profile_id,
      output_contract: ISSUE_FRAME_SLOT.output_contract,
      prompt: {
        promptTemplateId: configuredPrompt(ISSUE_FRAME_SLOT).id,
        version: configuredPrompt(ISSUE_FRAME_SLOT).version,
      },
      schema_name: ISSUE_FRAME_SLOT.schema_name,
      schema: topicSelectionNeedDiscoveryDebateIssueFrameSchema as unknown as Record<string, unknown>,
      messages: this.arbiterMessages(input.input, 'issue_framing', {
        role_level_summary_refs: input.roleLevelSummaryRefs,
      }, {
        role_level_summaries: input.roleLevelSummaries,
      }),
      mocked_output: this.mockedRoleOutput(executionSpec.execution_mode, input.input.mocked_outputs?.arbiter_issue_frame, 'arbiter_issue_frame'),
      codex_response: this.codexRoleResponse(executionSpec.execution_mode, input.input.codex_responses?.arbiter_issue_frame, 'arbiter_issue_frame'),
    });
    const artifact = invocation.structured_output
      ? await this.recordRoleOutput(input.input, invocation, ISSUE_FRAME_SLOT.output_contract, invocation.structured_output)
      : null;
    return {
      output: invocation.structured_output,
      invocation,
      artifact,
    };
  }

  private async invokeFinalSynthesis(input: {
    input: TopicSelectionNeedDiscoveryDebateLoopInput;
    debateLoopId: string;
    debatePolicyId: string;
    roundIndex: number;
    issueFrameRef: TopicSelectionArtifactFunctionalRef;
    issueFrame: TopicSelectionNeedDiscoveryDebateIssueFrame;
    roleLevelSummaryRefs: TopicSelectionArtifactFunctionalRef[];
    roleLevelSummaries: TopicSelectionNeedDiscoveryRoleLevelSummary[];
    parentInvocationAttemptIds: string[];
  }): Promise<TopicSelectionAgentInvocationResult<TopicSelectionRankedCandidateDraftBatch>> {
    const executionSpec = this.resolvedExecutionSpec(input.input, FINAL_SYNTHESIS_SLOT, 'arbiter_final');
    return this.dependencies.agentOrchestrator.invokeStructuredOutput<TopicSelectionRankedCandidateDraftBatch>({
      ...this.baseInvocation(
        input.input,
        input.debateLoopId,
        input.debatePolicyId,
        input.roundIndex,
        'arbiter',
        'final_synthesis',
        'arbiter_final',
        executionSpec,
        input.parentInvocationAttemptIds,
        {
          arbiter_issue_frame_ref: input.issueFrameRef,
          role_level_summary_refs: input.roleLevelSummaryRefs,
        },
      ),
      profile_id: FINAL_SYNTHESIS_SLOT.profile_id,
      output_contract: FINAL_SYNTHESIS_SLOT.output_contract,
      prompt: {
        promptTemplateId: configuredPrompt(FINAL_SYNTHESIS_SLOT).id,
        version: configuredPrompt(FINAL_SYNTHESIS_SLOT).version,
      },
      schema_name: FINAL_SYNTHESIS_SLOT.schema_name,
      schema: topicSelectionRankedCandidateDraftBatchSchema as unknown as Record<string, unknown>,
      messages: this.arbiterMessages(input.input, 'final_synthesis', {
        issue_frame_ref: input.issueFrameRef,
        role_level_summary_refs: input.roleLevelSummaryRefs,
      }, {
        issue_frame: input.issueFrame,
        role_level_summaries: input.roleLevelSummaries,
      }),
      mocked_output: this.mockedRoleOutput(executionSpec.execution_mode, input.input.mocked_outputs?.arbiter_final, 'arbiter_final'),
      codex_response: this.codexRoleResponse(executionSpec.execution_mode, input.input.codex_responses?.arbiter_final, 'arbiter_final'),
    });
  }

  private baseInvocation(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    debateLoopId: string,
    debatePolicyId: string,
    roundIndex: number,
    role: 'explorer' | 'deep_critic' | 'arbiter',
    stage: string,
    agentInstanceId: string,
    executionSpec: ResolvedAgentExecutionSpec,
    parentInvocationAttemptIds: string[] = [],
    refs: {
      role_level_summary_ref?: TopicSelectionFunctionalRef | null;
      role_level_summary_refs?: TopicSelectionFunctionalRef[] | null;
      arbiter_issue_frame_ref?: TopicSelectionFunctionalRef | null;
      arbiter_final_artifact_ref?: TopicSelectionFunctionalRef | null;
    } = {},
  ) {
    const invocationAttemptId = `${input.node_input.node_attempt_id}.${debateLoopId}.${role}.${stage}.${agentInstanceId}`;
    const debateExtension = {
      debate_loop_id: debateLoopId,
      debate_policy_id: debatePolicyId,
      round_index: roundIndex,
      role,
      stage,
      agent_instance_id: agentInstanceId,
      parent_invocation_attempt_ids: parentInvocationAttemptIds,
      role_level_summary_ref: refs.role_level_summary_ref ?? null,
      arbiter_issue_frame_ref: refs.arbiter_issue_frame_ref ?? null,
      arbiter_final_artifact_ref: refs.arbiter_final_artifact_ref ?? null,
    };
    const dynamicMaterialRefs = this.dynamicPromptMaterialRefsForDebateSlot(input, role, stage, refs);
    return {
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      node_id: NODE_ID,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      invocation_attempt_id: invocationAttemptId,
      execution_mode: executionSpec.execution_mode,
      execution_spec: {
        execution_mode: executionSpec.execution_mode,
        ...(executionSpec.model_option_id ? { model_option_id: executionSpec.model_option_id } : {}),
      },
      executor_kind: 'multi_agent_debate' as const,
      run_mode: input.run_mode,
      model_option_id: executionSpec.model_option_id,
      runtime_token_budget: this.runtimeTokenBudgetInput(role, stage, debateExtension, dynamicMaterialRefs),
      input_refs: this.inputRefs(input.node_input),
      context_packet_refs: this.contextPacketRefsForSlot(input, role),
      context_packet_hashes: this.contextPacketHashesForSlot(input, role),
      debate_extension: debateExtension,
      created_by: input.created_by ?? 'system',
    };
  }

  private runtimeTokenBudgetInput(
    role: 'explorer' | 'deep_critic' | 'arbiter',
    stage: string,
    debateExtension: {
      debate_loop_id: string;
      debate_policy_id: string;
      round_index: number;
      role: 'explorer' | 'deep_critic' | 'arbiter';
      stage: string;
      agent_instance_id: string;
      parent_invocation_attempt_ids: string[];
      role_level_summary_ref?: TopicSelectionFunctionalRef | null;
      arbiter_issue_frame_ref?: TopicSelectionFunctionalRef | null;
      arbiter_final_artifact_ref?: TopicSelectionFunctionalRef | null;
    },
    dynamicMaterialRefs: TopicSelectionDynamicPromptMaterialRecord[],
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    const resolvedProfile = this.contextPolicyProfileRegistry.resolveProfile(
      this.contextRuntimeProfileForSlot(role, stage),
    );
    const dynamicMaterialRefsHash = dynamicMaterialRefs.length > 0
      ? this.hash(dynamicMaterialRefs)
      : null;
    return {
      context_policy_profile: resolvedProfile.profile,
      context_policy_profile_hash: resolvedProfile.profile_hash,
      runtime_invocation_context_hash: this.hash({
        schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
        invocation_slot_id: resolvedProfile.profile.invocation_slot_id,
        scenario_context: {
          identity_policy: 'not_semantic',
          scenario_id: null,
          scenario_case_id: null,
          semantic_scenario_key: null,
        },
        loop_context: {
          loop_kind: 'debate_round',
          loop_stage: debateExtension.stage,
          current_round_index: debateExtension.round_index,
          remaining_round_budget: null,
          loopback_source_node_id: null,
          repair_origin_ref: null,
          repair_origin_hash: null,
        },
        debate_context: {
          debate_loop_id: debateExtension.debate_loop_id,
          debate_policy_id: debateExtension.debate_policy_id,
          round_index: debateExtension.round_index,
          role: debateExtension.role,
          stage: debateExtension.stage,
          agent_instance_id: debateExtension.agent_instance_id,
          parent_invocation_attempt_ids_hash: debateExtension.parent_invocation_attempt_ids.length > 0
            ? this.hash(debateExtension.parent_invocation_attempt_ids)
            : null,
          dynamic_material_refs_hash: dynamicMaterialRefsHash,
        },
      }),
      dynamic_material_refs: dynamicMaterialRefs,
    };
  }

  private dynamicPromptMaterialRefsForDebateSlot(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    role: 'explorer' | 'deep_critic' | 'arbiter',
    stage: string,
    refs: {
      role_level_summary_ref?: TopicSelectionFunctionalRef | null;
      role_level_summary_refs?: TopicSelectionFunctionalRef[] | null;
      arbiter_issue_frame_ref?: TopicSelectionFunctionalRef | null;
      arbiter_final_artifact_ref?: TopicSelectionFunctionalRef | null;
    },
  ): TopicSelectionDynamicPromptMaterialRecord[] {
    const materialRefs = this.uniqueRefs([
      refs.role_level_summary_ref,
      ...(refs.role_level_summary_refs ?? []),
      refs.arbiter_issue_frame_ref,
      refs.arbiter_final_artifact_ref,
    ].filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref)));
    return materialRefs.map((materialRef) => ({
      material_ref: materialRef,
      material_hash: this.hash(materialRef),
      generated_by_invocation_slot_id: `${role}.${stage}`,
      generation_policy_ref: {
        ref_type: 'debate_dynamic_material_policy',
        ref_id: `${role}.${stage}.runtime-v1`,
        title_card_id: input.title_card_id ?? null,
      },
      allowed_to_influence_prompt: true,
      cannot_override_prompt_template: true,
    }));
  }

  private contextPacketRefsForSlot(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    role: 'explorer' | 'deep_critic' | 'arbiter',
  ): TopicSelectionArtifactFunctionalRef[] {
    if (role === 'arbiter') {
      return [input.node_input.arbiter_context_ref];
    }
    return [input.node_input.exploration_context_ref];
  }

  private contextPacketHashesForSlot(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    role: 'explorer' | 'deep_critic' | 'arbiter',
  ): string[] {
    if (role === 'arbiter') {
      return [input.arbiter_context_packet.payload_hash];
    }
    return [input.exploration_context_packet.payload_hash];
  }

  private contextRuntimeProfileForSlot(
    role: 'explorer' | 'deep_critic' | 'arbiter',
    stage: string,
  ): {
    context_policy_profile_id: string;
    invocation_slot_id: string;
  } {
    if (role === 'explorer' && stage === 'round_1_discovery') {
      return {
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.explorer_round_1_discovery,
        invocation_slot_id:
          TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.explorer_round_1_discovery,
      };
    }
    if (role === 'deep_critic' && stage === 'round_1_discovery') {
      return {
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.deep_critic_round_1_discovery,
        invocation_slot_id:
          TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.deep_critic_round_1_discovery,
      };
    }
    if (role === 'arbiter' && stage === 'issue_framing') {
      return {
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.arbiter_issue_framing,
        invocation_slot_id:
          TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.arbiter_issue_framing,
      };
    }
    if (role === 'arbiter' && stage === 'final_synthesis') {
      return {
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.arbiter_final_synthesis,
        invocation_slot_id:
          TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.arbiter_final_synthesis,
      };
    }
    throw new AppError(500, 'INTERNAL_ERROR', `No context runtime profile for debate slot ${role}.${stage}.`);
  }

  private async recordRoleOutput<T>(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    invocation: TopicSelectionAgentInvocationResult<T>,
    payloadSchema: string,
    payload: T,
  ): Promise<TopicSelectionGenerateNeedCandidateArtifactRefEntry> {
    const artifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: payloadSchema === ISSUE_FRAME_SLOT.output_contract ? 'debate_issue_frame' : 'debate_role_output',
      payload_schema: payloadSchema,
      payload: payload as Record<string, unknown>,
      source_refs: this.uniqueRefs([
        input.node_input.exploration_context_ref,
        input.node_input.arbiter_context_ref,
        invocation.audit_artifact_ref ?? null,
      ]),
      created_by: input.created_by ?? 'system',
    });
    return artifact.artifact_entry;
  }

  private async recordRoleLevelSummary(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    summary: TopicSelectionNeedDiscoveryRoleLevelSummary,
  ): Promise<TopicSelectionGenerateNeedCandidateArtifactRefEntry> {
    const artifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      artifact_key: 'debate_role_level_summary',
      payload_schema: ROLE_LEVEL_SUMMARY_PAYLOAD_SCHEMA,
      payload: summary as unknown as Record<string, unknown>,
      source_refs: summary.source_artifact_refs,
      created_by: input.created_by ?? 'system',
    });
    return artifact.artifact_entry;
  }

  private async recordFinalSynthesisArtifact(input: {
    input: TopicSelectionNeedDiscoveryDebateLoopInput;
    debateLoopId: string;
    roundIndex: number;
    finalInvocation: TopicSelectionAgentInvocationResult<TopicSelectionRankedCandidateDraftBatch>;
    issueFrameRef: TopicSelectionArtifactFunctionalRef;
    roleLevelSummaryRefs: TopicSelectionArtifactFunctionalRef[];
  }): Promise<TopicSelectionGenerateNeedCandidateArtifactRefEntry> {
    const batch = input.finalInvocation.structured_output;
    if (!batch) {
      throw new AppError(500, 'INTERNAL_ERROR', 'final synthesis artifact requires ranked candidate draft batch.');
    }
    const payload: TopicSelectionNeedDiscoveryDebateFinalSynthesisArtifact = {
      schema_version: 'v1',
      debate_loop_id: input.debateLoopId,
      round_index: input.roundIndex,
      role: 'arbiter',
      stage: 'final_synthesis',
      final_invocation_attempt_id: input.finalInvocation.provenance.invocation_attempt_id,
      final_invocation_audit_ref: input.finalInvocation.audit_artifact_ref ?? null,
      issue_frame_ref: input.issueFrameRef,
      role_level_summary_refs: input.roleLevelSummaryRefs,
      ranked_candidate_draft_batch_hash: this.hash(batch),
      terminal_result: batch.draft_batch.terminal_result,
      draft_count: batch.drafts.length,
      rejected_framing_count: batch.rejected_framings.length,
      unresolved_point_count: batch.unresolved_points.length,
    };
    const artifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id ?? null,
      workflow_run_id: input.input.node_input.workflow_run_id,
      node_attempt_id: input.input.node_input.node_attempt_id,
      artifact_key: 'debate_final_synthesis',
      payload_schema: FINAL_SYNTHESIS_PAYLOAD_SCHEMA,
      payload: payload as unknown as Record<string, unknown>,
      source_refs: this.uniqueRefs([
        input.issueFrameRef,
        ...input.roleLevelSummaryRefs,
        input.finalInvocation.audit_artifact_ref ?? null,
      ]),
      created_by: input.input.created_by ?? 'system',
    });
    return artifact.artifact_entry;
  }

  private explorerSummary(
    debateLoopId: string,
    roundIndex: number,
    records: Array<CompletedRoleInvocationRecord<TopicSelectionNeedDiscoveryExplorerNotes>>,
  ): TopicSelectionNeedDiscoveryRoleLevelSummary {
    const candidateNeedSignals = records.flatMap((record) =>
      record.output.candidate_angles.map((angle) => angle.candidate_need_hint ?? angle.summary),
    );
    return {
      schema_version: 'v1',
      debate_loop_id: debateLoopId,
      round_index: roundIndex,
      role: 'explorer',
      source_invocation_attempt_ids: records.map((record) => record.invocation.provenance.invocation_attempt_id),
      source_artifact_refs: records.map((record) => record.artifact.artifact_ref),
      summary: `Explorer surfaced ${candidateNeedSignals.length} candidate angle(s).`,
      candidate_need_signals: this.uniqueStrings(candidateNeedSignals),
      risk_signals: this.uniqueStrings(records.flatMap((record) => record.output.warnings)),
      evidence_refs: this.uniqueRefs(records.flatMap((record) => [
        ...record.output.evidence_refs,
        ...record.output.candidate_angles.flatMap((angle) => angle.evidence_refs),
      ])),
      unresolved_questions: this.uniqueStrings(records.flatMap((record) => record.output.unresolved_questions)),
    };
  }

  private deepCriticSummary(
    debateLoopId: string,
    roundIndex: number,
    records: Array<CompletedRoleInvocationRecord<TopicSelectionNeedDiscoveryDeepCriticNotes>>,
  ): TopicSelectionNeedDiscoveryRoleLevelSummary {
    const riskSignals = records.flatMap((record) => [
      ...record.output.critique_points.map((point) => point.summary),
      ...record.output.failure_modes,
      ...record.output.warnings,
    ]);
    return {
      schema_version: 'v1',
      debate_loop_id: debateLoopId,
      round_index: roundIndex,
      role: 'deep_critic',
      source_invocation_attempt_ids: records.map((record) => record.invocation.provenance.invocation_attempt_id),
      source_artifact_refs: records.map((record) => record.artifact.artifact_ref),
      summary: `Deep critic surfaced ${riskSignals.length} risk signal(s).`,
      candidate_need_signals: [],
      risk_signals: this.uniqueStrings(riskSignals),
      evidence_refs: this.uniqueRefs(records.flatMap((record) => [
        ...record.output.evidence_refs,
        ...record.output.critique_points.flatMap((point) => point.evidence_refs),
      ])),
      unresolved_questions: this.uniqueStrings(records.flatMap((record) => record.output.missing_evidence_questions)),
    };
  }

  private blockedResult(
    debateLoopId: string,
    debatePolicyId: string,
    roundIndex: number,
    blockingInvocation: TopicSelectionAgentInvocationResult<unknown>,
    records: Array<RoleInvocationRecord<unknown>>,
    roleLevelSummaryArtifacts: TopicSelectionGenerateNeedCandidateArtifactRefEntry[] = [],
    issueFrameArtifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry | null = null,
    additionalRoleInvocations: Array<TopicSelectionAgentInvocationResult<unknown>> = [],
  ): TopicSelectionNeedDiscoveryDebateLoopResult {
    return {
      schema_version: 'v1',
      debate_loop_id: debateLoopId,
      debate_policy_id: debatePolicyId,
      round_index: roundIndex,
      status: 'blocked',
      ranked_candidate_draft_batch: null,
      final_invocation_result: blockingInvocation,
      role_invocation_results: [
        ...records.map((record) => record.invocation),
        ...additionalRoleInvocations,
      ],
      role_output_artifacts: records
        .map((record) => record.artifact)
        .filter((artifact): artifact is TopicSelectionGenerateNeedCandidateArtifactRefEntry => Boolean(artifact)),
      role_level_summary_artifacts: roleLevelSummaryArtifacts,
      issue_frame_artifact: issueFrameArtifact,
      final_synthesis_artifact: null,
      blocker_codes: blockingInvocation.blocker_codes.length > 0
        ? blockingInvocation.blocker_codes
        : ['DEBATE_INVOCATION_BLOCKED'],
      error_code: blockingInvocation.error_code ?? 'DEBATE_INVOCATION_BLOCKED',
    };
  }

  private completedRecords<T>(
    records: Array<RoleInvocationRecord<T>>,
    roleLabel: string,
  ): Array<CompletedRoleInvocationRecord<T>> {
    return records.map((record, index) => {
      if (!record.output || !record.artifact) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `succeeded debate ${roleLabel}[${index}] invocation is missing structured output artifact.`,
        );
      }
      return {
        output: record.output,
        invocation: record.invocation,
        artifact: record.artifact,
      };
    });
  }

  private presentArtifacts(
    artifacts: Array<TopicSelectionGenerateNeedCandidateArtifactRefEntry | null>,
  ): TopicSelectionGenerateNeedCandidateArtifactRefEntry[] {
    return artifacts.filter((artifact): artifact is TopicSelectionGenerateNeedCandidateArtifactRefEntry => Boolean(artifact));
  }

  private firstBlocked(
    invocations: Array<TopicSelectionAgentInvocationResult<unknown>>,
  ): TopicSelectionAgentInvocationResult<unknown> | null {
    return invocations.find((invocation) => invocation.status !== 'succeeded') ?? null;
  }

  private instanceCount(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slot: TopicSelectionDebateRoleStageSlot,
    fieldName: 'explorer' | 'deep_critic',
    mockedCount: number,
    codexCount: number,
    instancePolicy: TopicSelectionDebateInstancePolicy,
  ): number {
    const slotExecutionMode = this.slotLevelExecutionSpec(input, slot).execution_mode;
    const plannedCount = this.plannedInstanceCount(input, slot);
    if (plannedCount === 0 && slotExecutionMode === 'mocked_llm') {
      if (mockedCount < instancePolicy.min_instances) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `mocked_outputs.${fieldName} must include at least ${instancePolicy.min_instances} role invocation output(s).`,
        );
      }
      if (mockedCount > instancePolicy.max_instances) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `mocked_outputs.${fieldName} must include at most ${instancePolicy.max_instances} role invocation output(s).`,
        );
      }
      return mockedCount;
    }
    if (plannedCount === 0 && slotExecutionMode === 'codex_assisted') {
      if (codexCount < instancePolicy.min_instances) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `codex_responses.${fieldName} must include at least ${instancePolicy.min_instances} role invocation response(s).`,
        );
      }
      if (codexCount > instancePolicy.max_instances) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `codex_responses.${fieldName} must include at most ${instancePolicy.max_instances} role invocation response(s).`,
        );
      }
      return codexCount;
    }
    const count = Math.max(
      instancePolicy.default_instances,
      mockedCount,
      codexCount,
      plannedCount,
    );
    if (count < instancePolicy.min_instances) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} must include at least ${instancePolicy.min_instances} role invocation(s).`,
      );
    }
    if (count > instancePolicy.max_instances) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} must include at most ${instancePolicy.max_instances} role invocation(s).`,
      );
    }
    return count;
  }

  private mockedRoleOutput<T>(
    executionMode: TopicSelectionAgentExecutionMode,
    output: TopicSelectionMockedAgentOutput<T> | undefined,
    fieldName: string,
  ): TopicSelectionMockedAgentOutput<T> | null {
    if (executionMode !== 'mocked_llm') {
      return null;
    }
    if (!output) {
      throw new AppError(400, 'INVALID_PAYLOAD', `mocked_outputs.${fieldName} is required for debate mocked_llm.`);
    }
    return output;
  }

  private codexRoleResponse<T>(
    executionMode: TopicSelectionAgentExecutionMode,
    response: TopicSelectionCodexAssistedAgentOutput<T> | undefined,
    fieldName: string,
  ): TopicSelectionCodexAssistedAgentOutput<T> | null {
    if (executionMode !== 'codex_assisted') {
      return null;
    }
    if (!response) {
      throw new AppError(400, 'INVALID_PAYLOAD', `codex_responses.${fieldName} is required for debate codex_assisted.`);
    }
    return response;
  }

  // Role-branched explorer/deep_critic prompt (T-128 W-04). Round-1 divergent discovery: the two
  // roles run in parallel off the SAME exploration_context (the critic does not see explorer output).
  // Each role gets a role-specific persona + output contract + boundary block; the generic
  // grounding / structured-only / no-authority lines stay shared. USER payload shape is unchanged.
  private roleMessages(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    role: 'explorer' | 'deep_critic',
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const prompt = configuredPrompt(role === 'explorer' ? EXPLORER_SLOT : DEEP_CRITIC_SLOT);
    return [
      {
        role: 'system',
        content: prompt.system,
      },
      {
        role: 'user',
        content: stableStringify({
          role,
          node_input: input.node_input,
          exploration_context: input.exploration_context_packet.payload,
        }),
      },
    ];
  }

  // Stage-branched arbiter prompt (T-128 W-04). issue_framing and final_synthesis share this
  // builder but emit DIFFERENT contracts: issue_framing produces a DebateIssueFrame (no ranked
  // batch, no role-bundles); final_synthesis produces the external RankedCandidateDraftBatch that
  // feeds NeedCandidate admission, so it keeps the evidence-role-bundle / role_ref_constraints
  // safety clauses verbatim and adds the ranking/terminal contract. The final_synthesis USER
  // payload (incl. output_constraints.role_ref_constraints) is load-bearing for downstream gating
  // and is asserted byte-for-byte by the debate loop unit test; do not reshape it casually.
  private arbiterMessages(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    stage: 'issue_framing' | 'final_synthesis',
    refs: Record<string, unknown>,
    debatePayloads: Record<string, unknown> = {},
  ): Array<{ role: 'system' | 'user'; content: string }> {
    if (stage === 'issue_framing') {
      return [
        {
          role: 'system',
          content: configuredPrompt(ISSUE_FRAME_SLOT).system,
        },
        {
          role: 'user',
          content: stableStringify({
            node_input: input.node_input,
            arbiter_context: input.arbiter_context_packet.payload,
            refs,
            debate_payloads: debatePayloads,
          }),
        },
      ];
    }
    return [
      {
        role: 'system',
        content: configuredPrompt(FINAL_SYNTHESIS_SLOT).system,
      },
      {
        role: 'user',
        content: stableStringify({
          node_input: input.node_input,
          arbiter_context: input.arbiter_context_packet.payload,
          refs,
          debate_payloads: debatePayloads,
          output_constraints: {
            role_bundle_ref_rule: 'support/challenge/baseline/context_unit_refs accept only evidence_unit refs whose EvidenceMap role matches the field name',
            role_ref_constraints: this.roleRefConstraints(input.arbiter_context_packet),
            strength_conflict_ref_rule: 'evidence_strength_assessment refs belong in strength_assessment_refs; evidence_conflict/evidence_conflict_set refs belong in conflict_refs',
          },
        }),
      },
    ];
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

  private readFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
    if (!this.isRecord(value)) {
      return null;
    }
    if (typeof value.ref_type !== 'string' || typeof value.ref_id !== 'string') {
      return null;
    }
    return value as unknown as TopicSelectionFunctionalRef;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private inputRefs(input: TopicSelectionGenerateNeedCandidateNodeInput): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      input.topic_scope_ref,
      input.evidence_map_ref,
      input.evidence_strength_ref,
      input.resource_sample_set_ref ?? null,
      input.candidate_pool_projection_ref ?? null,
      ...input.search_snapshot_refs,
      ...input.resource_snapshot_refs,
      input.operator_reuse_approval_ref ?? null,
    ]);
  }

  private uniqueRefs<T extends TopicSelectionFunctionalRef>(
    refs: Array<T | null | undefined>,
  ): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  }

  private assertInput(input: TopicSelectionNeedDiscoveryDebateLoopInput): void {
    this.assertNoMixedExecutionPlanAndLegacyOverrides(input);
    this.assertExecutionPlan(input);
    this.assertKnownSlotExecutionOverrides(input);
    this.assertSlotModelOptionOverrides(input);
    if (input.exploration_context_packet.context_family !== 'exploration_context') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'exploration_context_packet must be exploration_context.');
    }
    if (input.arbiter_context_packet.context_family !== 'arbiter_context') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'arbiter_context_packet must be arbiter_context.');
    }
    if (input.round_index !== undefined && input.round_index !== null && input.round_index < 1) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'round_index must be positive.');
    }
    if (
      input.round_index !== undefined
      && input.round_index !== null
      && input.round_index > NEED_DISCOVERY_DEBATE_CONTRACT.failure_policy.max_rounds
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `round_index must be less than or equal to ${NEED_DISCOVERY_DEBATE_CONTRACT.failure_policy.max_rounds}.`,
      );
    }
  }

  private resolvedExecutionSpec(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slot: TopicSelectionDebateRoleStageSlot,
    agentInstanceId: string,
  ): ResolvedAgentExecutionSpec {
    const slotSpec = this.slotLevelExecutionSpec(input, slot);
    const instanceSpec = input.execution_plan?.instances?.[this.executionPlanInstanceKey(slot, agentInstanceId)] ?? null;
    const executionMode = instanceSpec?.execution_mode ?? slotSpec.execution_mode;
    const instanceModelOptionId = instanceSpec?.model_option_id?.trim() ?? null;
    const modelOptionId = executionMode === 'provider_llm'
      ? instanceModelOptionId ?? slotSpec.model_option_id ?? null
      : instanceModelOptionId;
    this.assertSlotExecutionSpec(input, slot, executionMode, modelOptionId);
    return {
      execution_mode: executionMode,
      model_option_id: executionMode === 'provider_llm' ? modelOptionId : null,
    };
  }

  private slotLevelExecutionSpec(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slot: TopicSelectionDebateRoleStageSlot,
  ): ResolvedAgentExecutionSpec {
    const slotId = slot.slot_id as TopicSelectionV1aGenerateNeedCandidateDebateSlotId;
    const executionPlanSpec = input.execution_plan?.slots?.[slotId]
      ?? input.execution_plan?.default
      ?? null;
    const legacyExecutionMode = input.slot_execution_overrides?.[slotId] ?? input.node_input.execution_mode;
    const executionMode = executionPlanSpec?.execution_mode ?? legacyExecutionMode;
    const modelOptionId = executionPlanSpec?.model_option_id?.trim()
      ?? this.legacySlotModelOptionId(input, slotId, executionMode)
      ?? null;
    this.assertSlotExecutionSpec(input, slot, executionMode, modelOptionId);
    return {
      execution_mode: executionMode,
      model_option_id: executionMode === 'provider_llm' ? modelOptionId : null,
    };
  }

  private assertSlotExecutionSpec(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slot: TopicSelectionDebateRoleStageSlot,
    executionMode: TopicSelectionAgentExecutionMode,
    modelOptionId: string | null,
  ): void {
    if (!slot.allowed_execution_modes.includes(executionMode)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} does not allow execution_mode=${executionMode}.`,
      );
    }
    if (executionMode === 'codex_assisted' && !slot.codex_substitution_policy.allowed) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} does not allow codex_assisted substitution.`,
      );
    }
    if (
      executionMode === 'codex_assisted'
      && !slot.codex_substitution_policy.allowed_run_modes.includes(input.run_mode)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} does not allow codex_assisted in run_mode=${input.run_mode}.`,
      );
    }
    if (executionMode !== 'provider_llm' && modelOptionId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `${slot.slot_id} model_option_id requires execution_mode=provider_llm.`,
      );
    }
  }

  private legacySlotModelOptionId(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slotId: TopicSelectionV1aGenerateNeedCandidateDebateSlotId,
    executionMode: TopicSelectionAgentExecutionMode,
  ): string | null {
    if (executionMode !== 'provider_llm') {
      return null;
    }
    return input.slot_model_option_overrides?.[slotId]?.trim()
      || input.model_option_id?.trim()
      || null;
  }

  private plannedInstanceCount(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
    slot: TopicSelectionDebateRoleStageSlot,
  ): number {
    const instanceSpecs = input.execution_plan?.instances ?? {};
    const prefix = `${slot.slot_id}#`;
    let count = 0;
    for (const key of Object.keys(instanceSpecs)) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const instanceId = key.slice(prefix.length);
      const match = instanceId.match(/_(\d+)$/u);
      if (!match) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `debate execution instance key must end with a numeric instance id: ${key}.`,
        );
      }
      count = Math.max(count, Number.parseInt(match[1] ?? '0', 10));
    }
    return count;
  }

  private executionPlanInstanceKey(
    slot: TopicSelectionDebateRoleStageSlot,
    agentInstanceId: string,
  ): string {
    return `${slot.slot_id}#${agentInstanceId}`;
  }

  private assertKnownSlotExecutionOverrides(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
  ): void {
    const overrides = input.slot_execution_overrides ?? {};
    const knownSlotIds = new Set(NEED_DISCOVERY_DEBATE_CONTRACT.role_stage_slots.map((slot) => slot.slot_id));
    for (const slotId of Object.keys(overrides)) {
      if (!knownSlotIds.has(slotId)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unknown debate slot execution override: ${slotId}.`);
      }
    }
  }

  private assertNoMixedExecutionPlanAndLegacyOverrides(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
  ): void {
    if (
      input.execution_plan
      && (
        input.slot_execution_overrides
        || input.slot_model_option_overrides
      )
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'execution_plan cannot be combined with legacy slot execution/model option overrides.',
      );
    }
  }

  private assertExecutionPlan(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
  ): void {
    const executionPlan = input.execution_plan;
    if (!executionPlan) {
      return;
    }
    if (typeof executionPlan !== 'object' || Array.isArray(executionPlan)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_plan must be an object.');
    }
    const knownSlotIds = new Set(NEED_DISCOVERY_DEBATE_CONTRACT.role_stage_slots.map((slot) => slot.slot_id));
    for (const slotId of Object.keys(executionPlan.slots ?? {})) {
      if (!knownSlotIds.has(slotId)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unknown debate execution plan slot: ${slotId}.`);
      }
      const spec = executionPlan.slots?.[slotId as TopicSelectionV1aGenerateNeedCandidateDebateSlotId];
      this.assertExecutionSpecShape(spec, `execution_plan.slots.${slotId}`);
    }
    for (const [key, spec] of Object.entries(executionPlan.instances ?? {})) {
      const [slotId, agentInstanceId] = key.split('#');
      if (!slotId || !agentInstanceId || !knownSlotIds.has(slotId)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unknown debate execution plan instance: ${key}.`);
      }
      const slot = roleStageSlot(slotId);
      if (slot.instance_policy.max_instances === 1) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `debate execution plan instances are only allowed for repeatable slots: ${key}.`,
        );
      }
      if (!agentInstanceId.match(/_(\d+)$/u)) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `debate execution instance key must end with a numeric instance id: ${key}.`,
        );
      }
      this.assertExecutionSpecShape(spec, `execution_plan.instances.${key}`);
    }
    this.assertExecutionSpecShape(executionPlan.default ?? null, 'execution_plan.default', false);
  }

  private assertExecutionSpecShape(
    spec: TopicSelectionAgentExecutionSpec | null | undefined,
    path: string,
    required = true,
  ): void {
    if (!spec) {
      if (required) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${path} must define an execution spec.`);
      }
      return;
    }
    if (typeof spec !== 'object' || Array.isArray(spec)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${path} must be an object.`);
    }
    if (!['mocked_llm', 'codex_assisted', 'provider_llm'].includes(spec.execution_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${path}.execution_mode is invalid.`);
    }
    if (
      spec.model_option_id !== undefined
      && spec.model_option_id !== null
      && (typeof spec.model_option_id !== 'string' || !spec.model_option_id.trim())
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${path}.model_option_id must be a non-empty string.`);
    }
  }

  private assertSlotModelOptionOverrides(
    input: TopicSelectionNeedDiscoveryDebateLoopInput,
  ): void {
    const overrides = input.slot_model_option_overrides ?? {};
    if (typeof overrides !== 'object' || Array.isArray(overrides)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'slot_model_option_overrides must be an object keyed by debate slot id.');
    }
    const knownSlotIds = new Set(NEED_DISCOVERY_DEBATE_CONTRACT.role_stage_slots.map((slot) => slot.slot_id));
    for (const [slotId, modelOptionId] of Object.entries(overrides)) {
      if (!knownSlotIds.has(slotId)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unknown debate slot model option override: ${slotId}.`);
      }
      if (typeof modelOptionId !== 'string' || !modelOptionId.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${slotId} model_option_id override must be a non-empty string.`);
      }
      const slot = roleStageSlot(slotId);
      const executionMode = this.slotLevelExecutionSpec(input, slot).execution_mode;
      if (executionMode !== 'provider_llm') {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `${slotId} model_option_id override requires execution_mode=provider_llm.`,
        );
      }
    }
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
