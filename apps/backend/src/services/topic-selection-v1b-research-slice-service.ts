import crypto from 'node:crypto';

import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
  TopicSelectionGateVerdict,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceRoleBundle } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { TopicSelectionV1bResearchSlicePlanningInput } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import {
  topicSelectionResearchSliceOptionSetLlmOutputSchema,
  type TopicSelectionPlanResearchSliceRunRecord,
  type TopicSelectionRejectedSliceOptionReason,
  type TopicSelectionResearchSliceAssumptionRecord,
  type TopicSelectionResearchSliceBoundaryRecord,
  type TopicSelectionResearchSliceEvidenceRefRecord,
  type TopicSelectionResearchSliceOptionDraft,
  type TopicSelectionResearchSliceOptionRecord,
  type TopicSelectionResearchSliceOptionSetLlmOutput,
  type TopicSelectionResearchSliceOptionSetRecord,
  type TopicSelectionResearchSliceRecord,
  type TopicSelectionSliceSelectionDecision,
  type TopicSelectionSliceSelectionDecisionRecord,
  type TopicSelectionV1bTopicQuestionFormationInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionResearchSliceCreation,
  TopicSelectionV1bResearchSliceRepository,
} from '../repositories/topic-selection-v1b-research-slice.repository.js';
import {
  BackendLlmGateway,
  DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS,
  LlmGatewayError,
  type LlmCallTelemetry,
  type LlmModelRef,
} from './llm-gateway.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

const WORKFLOW_PROFILE_KEY = 'topic-selection-research-slice-planning';
const PROMPT_TEMPLATE_ID = 'topic-selection-research-slice-planning';
const PROMPT_TEMPLATE_VERSION = '1';
const DEFAULT_MODEL: LlmModelRef = {
  providerId: 'openai',
  modelId: 'gpt-5.5',
  profileId: WORKFLOW_PROFILE_KEY,
};

type IdFactory = (prefix: string) => string;

export type TopicSelectionV1bResearchSlicePlanningInputProvider = {
  buildResearchSlicePlanningInput(input: {
    readiness_assessment_id: string;
  }): Promise<TopicSelectionV1bResearchSlicePlanningInput>;
};

export type TopicSelectionV1bResearchSliceLlmGateway = Pick<
  BackendLlmGateway,
  'createStructuredOutput'
>;

export type PlanResearchSliceOptionsInput = {
  readiness_assessment_id: string;
  workspace_id?: string | null;
  triggered_by?: TopicSelectionActorType;
  workflow_profile_version?: string | null;
  prompt_template_version?: string | null;
  policy_version_id?: string | null;
  model?: LlmModelRef;
};

export type PlanResearchSliceOptionsResult = {
  plan_run: TopicSelectionPlanResearchSliceRunRecord;
  option_set: TopicSelectionResearchSliceOptionSetRecord;
  options: TopicSelectionResearchSliceOptionRecord[];
};

export type SelectResearchSliceInput = {
  option_set_id: string;
  decision: TopicSelectionSliceSelectionDecision;
  selected_option_id?: string | null;
  decided_by?: TopicSelectionActorType;
  selection_policy_version?: string;
  selection_rationale: string;
  decision_basis?: Record<string, unknown>;
  rejected_option_reasons?: TopicSelectionRejectedSliceOptionReason[];
  required_actions?: string[];
  loopback_target?: TopicSelectionSliceSelectionDecisionRecord['loopback_target'];
  loopback_target_ref?: TopicSelectionFunctionalRef | null;
  loopback_reason_code?: string | null;
  source_downstream_object_ref?: TopicSelectionFunctionalRef | null;
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  confidence?: number | null;
  requires_human_review?: boolean;
  human_review_reason?: string | null;
  policy_version_id?: string | null;
};

export type SelectResearchSliceResult = {
  decision: TopicSelectionSliceSelectionDecisionRecord;
  research_slice?: TopicSelectionResearchSliceRecord;
  evidence_refs?: TopicSelectionResearchSliceEvidenceRefRecord[];
  boundaries?: TopicSelectionResearchSliceBoundaryRecord[];
  assumptions?: TopicSelectionResearchSliceAssumptionRecord[];
};

export type TopicSelectionV1bResearchSliceServiceOptions = {
  repository: TopicSelectionV1bResearchSliceRepository;
  intakeService: TopicSelectionV1bResearchSlicePlanningInputProvider;
  controlPlaneService: TopicSelectionControlPlaneService;
  llmGateway?: TopicSelectionV1bResearchSliceLlmGateway;
  idFactory?: IdFactory;
  now?: () => string;
};

type OptionValidationResult = {
  options: TopicSelectionResearchSliceOptionRecord[];
  highRiskOptionCount: number;
  requiresHumanReview: boolean;
  qualityFlags: string[];
  recommendedOptionId: string | null;
};

type InheritedConstraints = {
  claim_ceiling: string;
  non_goals: string[];
  method_constraints: string[];
  resource_constraints: string[];
  available_assets: string[];
  feasibility_budget: Record<string, unknown>;
};

export class TopicSelectionV1bResearchSliceService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly repository: TopicSelectionV1bResearchSliceRepository;
  private readonly intakeService: TopicSelectionV1bResearchSlicePlanningInputProvider;
  private readonly controlPlane: TopicSelectionControlPlaneService;
  private readonly llmGateway: TopicSelectionV1bResearchSliceLlmGateway;

  constructor(options: TopicSelectionV1bResearchSliceServiceOptions) {
    this.repository = options.repository;
    this.intakeService = options.intakeService;
    this.controlPlane = options.controlPlaneService;
    this.llmGateway = options.llmGateway ?? new BackendLlmGateway();
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async planResearchSliceOptions(
    input: PlanResearchSliceOptionsInput,
  ): Promise<PlanResearchSliceOptionsResult> {
    const planningInput = await this.intakeService.buildResearchSlicePlanningInput({
      readiness_assessment_id: input.readiness_assessment_id,
    });
    const titleCardId = this.requireTitleCardId(planningInput.validated_need_ref);
    const workspaceId = input.workspace_id ?? null;
    const triggeredBy = input.triggered_by ?? 'system';
    const model = input.model ?? DEFAULT_MODEL;
    const promptVersion = input.prompt_template_version ?? PROMPT_TEMPLATE_VERSION;
    const planRunId = this.idFactory('plan_research_slice_run');
    const optionSetId = this.idFactory('research_slice_option_set');
    const planRunRef = this.ref('plan_research_slice_run', planRunId, titleCardId);
    const optionSetRef = this.ref('research_slice_option_set', optionSetId, titleCardId);
    const sourceRefs = this.compilePlanningSourceRefs(planningInput);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      target_ref: planRunRef,
      source_refs: sourceRefs,
      payload: {
        readiness_assessment_id: input.readiness_assessment_id,
        planning_input: planningInput,
      },
      policy_version: input.policy_version_id ?? null,
      created_by: triggeredBy,
    });

    let llmOutput: TopicSelectionResearchSliceOptionSetLlmOutput;
    let telemetry: LlmCallTelemetry | null = null;
    try {
      const response =
        await this.llmGateway.createStructuredOutput<TopicSelectionResearchSliceOptionSetLlmOutput>({
          executionContext: {
            feature: 'topic_selection',
            operation: 'research_slice_option_planning',
            traceId: planRunId,
            metadata: {
              readiness_assessment_id: input.readiness_assessment_id,
              research_constraint_profile_id: planningInput.research_constraint_profile_ref.ref_id,
              validated_need_id: planningInput.validated_need_ref.ref_id,
            },
          },
          model,
          prompt: {
            promptTemplateId: PROMPT_TEMPLATE_ID,
            version: promptVersion,
          },
          messages: [
            {
              role: 'system',
              content: [
                'Plan bounded v1b ResearchSlice options from the supplied ready intake handoff.',
                'Do not create TopicQuestion, value assessment, package, promotion, or PaperProject bridge objects.',
                'Copy upstream refs exactly; do not introduce new unmet-need proof.',
                'Use hard_blockers only for absolute impossibility; put ordinary risks or caveats in dependency_risks and main_risks.',
                'For every option, copy each planning_input.non_goals string verbatim into excluded_boundaries.',
                'Only use refs from planning_input.evidence_role_bundle.*_unit_refs inside support_evidence_refs, challenge_evidence_refs, baseline_evidence_refs, and context_evidence_refs.',
                'Do not place v1b_intake_snapshot_ref, readiness_assessment_ref, research_constraint_profile_ref, search refs, or literature snapshot refs in evidence ref arrays; mention those refs in details_payload or dependency_risks only when needed.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify({ planning_input_json: planningInput }, null, 2),
            },
          ],
          schemaName: 'topic_selection_research_slice_option_set',
          schema:
            topicSelectionResearchSliceOptionSetLlmOutputSchema as unknown as Record<
              string,
              unknown
            >,
          normalizedParams: DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS,
        });
      llmOutput = response.parsed;
      telemetry = response.telemetry;
    } catch (error) {
      const failed = await this.persistFailedPlanRun({
        input,
        planningInput,
        planRunId,
        titleCardId,
        workspaceId,
        triggeredBy,
        model,
        promptVersion,
        inputSnapshotId: inputSnapshot.input_snapshot_id,
        sourceRefs,
        error,
      });
      throw this.planRunError(error, failed.plan_research_slice_run_id);
    }

    let validation: OptionValidationResult;
    try {
      validation = this.validateAndBuildOptions({
        output: llmOutput,
        planningInput,
        optionSetId,
        titleCardId,
        workspaceId,
      });
    } catch (error) {
      const failed = await this.persistFailedPlanRun({
        input,
        planningInput,
        planRunId,
        titleCardId,
        workspaceId,
        triggeredBy,
        model,
        promptVersion,
        inputSnapshotId: inputSnapshot.input_snapshot_id,
        sourceRefs,
        error,
        telemetry,
        artifacts: [
          {
            artifact_kind: 'structured_output',
            payload: llmOutput as unknown as Record<string, unknown>,
          },
        ],
      });
      throw this.planRunError(error, failed.plan_research_slice_run_id);
    }

    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      workflow_key: 'topic-selection.v1b-plan-research-slice-options',
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: input.workflow_profile_version ?? null,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      status: 'succeeded',
      provider_id: model.providerId,
      model_id: model.modelId,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: promptVersion,
      telemetry: this.telemetryRecord(telemetry),
      output_summary: {
        option_count: validation.options.length,
        high_risk_option_count: validation.highRiskOptionCount,
        requires_human_review: validation.requiresHumanReview,
        recommended_option_id: validation.recommendedOptionId,
        quality_flags: validation.qualityFlags,
      },
      artifacts: [
        {
          artifact_kind: 'structured_output',
          payload: llmOutput as unknown as Record<string, unknown>,
        },
      ],
      created_by: triggeredBy,
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      gate_key: 'topic-selection.v1b-research-slice-options-domain-validation',
      target_ref: planRunRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      warnings: validation.qualityFlags.map((flag) =>
        this.warning(flag, `ResearchSlice option planning emitted ${flag}.`, [planRunRef]),
      ),
      accepted_risk_refs: planningInput.accepted_risk_refs,
      created_by: triggeredBy,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      transition_key: 'v1b-readiness-to-research-slice-option-set',
      source_ref: planningInput.readiness_assessment_ref,
      target_ref: optionSetRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: triggeredBy },
      accepted_risk_refs: planningInput.accepted_risk_refs,
      created_authority_refs: [planRunRef, optionSetRef],
    });

    const now = this.now();
    const planRun: TopicSelectionPlanResearchSliceRunRecord = {
      plan_research_slice_run_id: planRunId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      v1b_intake_readiness_assessment_id: input.readiness_assessment_id,
      v1b_intake_snapshot_id: planningInput.v1b_intake_snapshot_ref.ref_id,
      research_constraint_profile_id: planningInput.research_constraint_profile_ref.ref_id,
      v1b_input_bundle_id: planningInput.v1b_input_bundle_ref.ref_id,
      validated_need_id: planningInput.validated_need_ref.ref_id,
      status: 'succeeded',
      triggered_by: triggeredBy,
      v1b_input_bundle_ref: planningInput.v1b_input_bundle_ref,
      v1b_intake_snapshot_ref: planningInput.v1b_intake_snapshot_ref,
      research_constraint_profile_ref: planningInput.research_constraint_profile_ref,
      readiness_assessment_ref: planningInput.readiness_assessment_ref,
      validated_need_ref: planningInput.validated_need_ref,
      evidence_map_ref: planningInput.evidence_map_ref,
      search_run_ref: planningInput.search_run_ref,
      search_plan_ref: planningInput.search_plan_ref,
      literature_snapshot_ref: planningInput.literature_snapshot_ref,
      accepted_risk_refs: planningInput.accepted_risk_refs,
      memory_suggestion_refs: planningInput.memory_suggestion_refs,
      recheck_request_refs: planningInput.recheck_request_refs,
      gap_codes: planningInput.gap_codes,
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: input.workflow_profile_version ?? null,
      provider_id: model.providerId,
      model_id: model.modelId,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: promptVersion,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      option_set_id: optionSetId,
      artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
      quality_flags: [
        ...validation.qualityFlags,
        `transition:${transition.result}`,
      ],
      failure_reason: null,
      created_at: now,
      updated_at: now,
    };
    const optionSet: TopicSelectionResearchSliceOptionSetRecord = {
      research_slice_option_set_id: optionSetId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      plan_research_slice_run_id: planRunId,
      v1b_intake_readiness_assessment_id: input.readiness_assessment_id,
      v1b_intake_snapshot_id: planningInput.v1b_intake_snapshot_ref.ref_id,
      research_constraint_profile_id: planningInput.research_constraint_profile_ref.ref_id,
      v1b_input_bundle_id: planningInput.v1b_input_bundle_ref.ref_id,
      validated_need_ids: this.uniqueStrings([
        planningInput.validated_need_ref.ref_id,
        ...validation.options.flatMap((option) =>
          option.source_validated_need_refs.map((ref) => ref.ref_id),
        ),
      ]),
      status: 'ready_for_selection',
      recommended_option_id: validation.recommendedOptionId,
      selected_option_id: null,
      option_count: validation.options.length,
      high_risk_option_count: validation.highRiskOptionCount,
      requires_human_review: validation.requiresHumanReview,
      comparison_axes: llmOutput.comparison_axes,
      comparison_summary: llmOutput.comparison_summary,
      missing_option_types: llmOutput.missing_option_types,
      unresolved_disagreements: llmOutput.unresolved_disagreements,
      human_review_triggers: llmOutput.human_review_triggers,
      options_payload: { options: llmOutput.options },
      comparison_payload: {
        recommended_option_key: llmOutput.recommended_option_key ?? null,
        comparison_axes: llmOutput.comparison_axes,
        comparison_summary: llmOutput.comparison_summary,
      },
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
      created_at: now,
      updated_at: now,
    };

    const persisted = await this.repository.createPlanRunWithOptionSet({
      plan_run: planRun,
      option_set: optionSet,
      options: validation.options,
    });
    return {
      plan_run: persisted.plan_run,
      option_set: persisted.option_set,
      options: persisted.options,
    };
  }

  async selectResearchSlice(input: SelectResearchSliceInput): Promise<SelectResearchSliceResult> {
    const optionSet = await this.requireOptionSet(input.option_set_id);
    if (optionSet.status !== 'ready_for_selection') {
      throw new AppError(
        409,
        optionSet.status === 'selected' ? 'VERSION_CONFLICT' : 'GATE_CONSTRAINT_FAILED',
        `ResearchSliceOptionSet status ${optionSet.status} cannot create a new SliceSelectionDecision.`,
      );
    }
    const options = await this.repository.listOptionsByOptionSetId(optionSet.research_slice_option_set_id);
    const planRun = await this.requirePlanRun(optionSet.plan_research_slice_run_id);
    const titleCardId = optionSet.title_card_id;
    const workspaceId = optionSet.workspace_id ?? null;
    const decidedBy = input.decided_by ?? 'system';
    const decisionId = this.idFactory('slice_selection_decision');
    const decisionRef = this.ref('slice_selection_decision', decisionId, titleCardId);
    const optionSetRef = this.ref(
      'research_slice_option_set',
      optionSet.research_slice_option_set_id,
      titleCardId,
    );
    const decisionBasis = input.decision_basis ?? {
      option_count: options.length,
      option_set_status: optionSet.status,
    };

    if (input.decision !== 'select') {
      const { workflow, gate, transition } = await this.recordSelectionControlPlane({
        workspaceId,
        titleCardId,
        actor: decidedBy,
        decisionRef,
        sourceRef: optionSetRef,
        targetRef: decisionRef,
        sourceRefs: [optionSetRef, ...planRun.artifact_refs],
        payload: {
          decision: input.decision,
          option_set: optionSet,
          required_actions: input.required_actions ?? [],
        },
        outputSummary: {
          decision: input.decision,
          loopback_target: input.loopback_target ?? this.defaultLoopback(input.decision),
        },
        policyVersionId: input.policy_version_id ?? input.selection_policy_version ?? null,
        acceptedRiskRefs: input.accepted_risk_refs ?? [],
        createdAuthorityRefs: [decisionRef],
      });
      const now = this.now();
      const decision: TopicSelectionSliceSelectionDecisionRecord = {
        slice_selection_decision_id: decisionId,
        workspace_id: workspaceId,
        title_card_id: titleCardId,
        research_slice_option_set_id: optionSet.research_slice_option_set_id,
        selected_option_id: null,
        decision: input.decision,
        decided_by: decidedBy,
        selection_policy_version: input.selection_policy_version ?? '1',
        decision_basis: decisionBasis,
        selection_rationale: input.selection_rationale,
        rejected_option_reasons: input.rejected_option_reasons ?? [],
        hard_blockers: [],
        open_risks: [],
        unresolved_disagreements: optionSet.unresolved_disagreements,
        loopback_target: input.loopback_target ?? this.defaultLoopback(input.decision),
        loopback_target_ref: input.loopback_target_ref ?? null,
        required_actions: input.required_actions ?? [],
        loopback_reason_code: input.loopback_reason_code ?? input.decision,
        source_downstream_object_ref: input.source_downstream_object_ref ?? null,
        creates_new_run_or_version: input.decision === 'request_more_options',
        confidence: input.confidence ?? null,
        requires_human_review: input.requires_human_review ?? false,
        human_review_reason: input.human_review_reason ?? null,
        output_research_slice_ref: null,
        input_snapshot_id: workflow.workflow_run.input_snapshot_id,
        workflow_run_id: workflow.workflow_run.workflow_run_id,
        gate_result_id: gate.readiness_gate_result_id,
        transition_attempt_id: transition.chain_transition_attempt_id,
        artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
        created_at: now,
      };
      const persistedDecision = await this.repository.createSelectionDecision(decision);
      await this.repository.updateOptionSet(optionSet.research_slice_option_set_id, {
        status: this.optionSetStatusForNonSelectDecision(input.decision),
        selected_option_id: null,
        updated_at: now,
      });
      return { decision: persistedDecision };
    }

    const selectedOption = this.requireSelectedOption(input.selected_option_id, options);
    this.assertOptionSelectable(selectedOption, decidedBy, input.accepted_risk_refs ?? []);

    const sliceId = this.idFactory('research_slice');
    const sliceVersion = this.versionFromId(sliceId);
    const sliceRef = this.ref('research_slice', sliceId, titleCardId, sliceVersion);
    const selectedOptionRef = this.ref(
      'research_slice_option',
      selectedOption.research_slice_option_id,
      titleCardId,
    );
    const inherited = this.inheritedConstraints(selectedOption);
    const sourceRefs = this.uniqueRefs([
      optionSetRef,
      selectedOptionRef,
      planRun.v1b_input_bundle_ref,
      planRun.v1b_intake_snapshot_ref,
      planRun.research_constraint_profile_ref,
      planRun.readiness_assessment_ref,
      planRun.validated_need_ref,
      planRun.evidence_map_ref,
      planRun.search_run_ref,
      planRun.search_plan_ref,
      planRun.literature_snapshot_ref,
      ...selectedOption.source_validated_need_refs,
      ...this.optionEvidenceRefs(selectedOption),
      ...planRun.accepted_risk_refs,
      ...(input.accepted_risk_refs ?? []),
    ]);
    const outputSummary = {
      decision: 'select',
      selected_option_id: selectedOption.research_slice_option_id,
      research_slice_id: sliceId,
      requires_human_review: selectedOption.requires_human_review,
    };
    const { workflow, gate, transition } = await this.recordSelectionControlPlane({
      workspaceId,
      titleCardId,
      actor: decidedBy,
      decisionRef,
      sourceRef: selectedOptionRef,
      targetRef: sliceRef,
      sourceRefs,
      payload: {
        decision: input.decision,
        option_set: optionSet,
        selected_option: selectedOption,
        accepted_risk_refs: input.accepted_risk_refs ?? [],
      },
      outputSummary,
      policyVersionId: input.policy_version_id ?? input.selection_policy_version ?? null,
      acceptedRiskRefs: input.accepted_risk_refs ?? [],
      createdAuthorityRefs: [decisionRef, sliceRef],
      verdict: (input.accepted_risk_refs ?? []).length > 0 ? 'pass_with_risk' : undefined,
    });
    const trace = await this.controlPlane.buildTraceSnapshot({
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      target_ref: sliceRef,
      object_refs: [sliceRef, decisionRef, optionSetRef, selectedOptionRef, ...sourceRefs],
      artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
      transition_attempt_refs: [
        this.ref('chain_transition_attempt', transition.chain_transition_attempt_id, titleCardId),
      ],
      payload: {
        claim_ceiling: inherited.claim_ceiling,
        non_goals: inherited.non_goals,
        memory_suggestion_ref_count: planRun.memory_suggestion_refs.length,
        recheck_request_ref_count: planRun.recheck_request_refs.length,
        included_boundaries: selectedOption.included_boundaries,
        excluded_boundaries: selectedOption.excluded_boundaries,
      },
      created_by: decidedBy,
    });

    const now = this.now();
    const decision: TopicSelectionSliceSelectionDecisionRecord = {
      slice_selection_decision_id: decisionId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      research_slice_option_set_id: optionSet.research_slice_option_set_id,
      selected_option_id: selectedOption.research_slice_option_id,
      decision: 'select',
      decided_by: decidedBy,
      selection_policy_version: input.selection_policy_version ?? '1',
      decision_basis: decisionBasis,
      selection_rationale: input.selection_rationale,
      rejected_option_reasons: input.rejected_option_reasons ?? this.defaultRejectedReasons(options, selectedOption),
      hard_blockers: selectedOption.hard_blockers,
      open_risks: selectedOption.main_risks,
      unresolved_disagreements: optionSet.unresolved_disagreements,
      loopback_target: null,
      loopback_target_ref: null,
      required_actions: input.required_actions ?? [],
      loopback_reason_code: null,
      source_downstream_object_ref: input.source_downstream_object_ref ?? null,
      creates_new_run_or_version: false,
      confidence: input.confidence ?? selectedOption.confidence ?? null,
      requires_human_review: input.requires_human_review ?? selectedOption.requires_human_review,
      human_review_reason: input.human_review_reason ?? this.humanReviewReason(selectedOption),
      output_research_slice_ref: sliceRef,
      input_snapshot_id: workflow.workflow_run.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
      created_at: now,
    };
    const researchSlice: TopicSelectionResearchSliceRecord = {
      research_slice_id: sliceId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      v1b_intake_snapshot_id: planRun.v1b_intake_snapshot_id,
      research_constraint_profile_id: planRun.research_constraint_profile_id,
      v1b_input_bundle_id: planRun.v1b_input_bundle_id,
      validated_need_id: planRun.validated_need_id,
      slice_version: sliceVersion,
      status: 'selected',
      v1b_intake_snapshot_ref: planRun.v1b_intake_snapshot_ref,
      research_constraint_profile_ref: planRun.research_constraint_profile_ref,
      readiness_assessment_ref: planRun.readiness_assessment_ref,
      v1b_input_bundle_ref: planRun.v1b_input_bundle_ref,
      validated_need_ref: planRun.validated_need_ref,
      evidence_map_ref: planRun.evidence_map_ref,
      search_run_ref: planRun.search_run_ref,
      search_plan_ref: planRun.search_plan_ref,
      literature_snapshot_ref: planRun.literature_snapshot_ref,
      source_option_set_ref: optionSetRef,
      source_option_ref: selectedOptionRef,
      slice_selection_decision_ref: decisionRef,
      problem_space: selectedOption.problem_space,
      slice_statement: selectedOption.slice_statement,
      target_setting: selectedOption.target_setting,
      target_community: selectedOption.target_community,
      included_boundaries: selectedOption.included_boundaries,
      excluded_boundaries: selectedOption.excluded_boundaries,
      candidate_contribution_types: [selectedOption.contribution_type_candidate],
      preferred_contribution_type: selectedOption.contribution_type_candidate,
      contribution_rationale: input.selection_rationale,
      expected_claim: selectedOption.expected_claim,
      fallback_claim: selectedOption.fallback_claim,
      observable_success_criteria: selectedOption.observable_success_criteria,
      resource_assumptions: selectedOption.resource_assumptions,
      data_assumptions: selectedOption.data_assumptions,
      evaluation_path: selectedOption.evaluation_path,
      baseline_assumptions: selectedOption.baseline_assumptions,
      dependency_risks: selectedOption.dependency_risks,
      slice_budget: selectedOption.slice_budget,
      topic_question_guardrails: this.topicQuestionGuardrails(selectedOption, inherited),
      value_assessment_inputs: this.valueAssessmentInputs(selectedOption),
      must_preserve_boundaries: this.mustPreserveBoundaries(selectedOption, inherited),
      accepted_risk_refs: this.uniqueRefs([
        ...planRun.accepted_risk_refs,
        ...(input.accepted_risk_refs ?? []),
      ]),
      memory_suggestion_refs: planRun.memory_suggestion_refs,
      recheck_request_refs: planRun.recheck_request_refs,
      gap_codes: planRun.gap_codes,
      non_goals: inherited.non_goals,
      claim_ceiling: inherited.claim_ceiling,
      decision_reason: input.selection_rationale,
      supersedes_research_slice_ref: null,
      superseded_by_research_slice_ref: null,
      input_snapshot_id: workflow.workflow_run.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      trace_snapshot_id: trace.trace_snapshot_id,
      artifact_refs: this.artifactRefs(workflow.artifact_refs, titleCardId),
      created_by: decidedBy,
      created_at: now,
      updated_at: now,
    };
    const creation: TopicSelectionResearchSliceCreation = {
      decision,
      research_slice: researchSlice,
      evidence_refs: this.buildEvidenceRows(researchSlice, selectedOption),
      boundaries: this.buildBoundaryRows(researchSlice, selectedOption, inherited),
      assumptions: this.buildAssumptionRows(researchSlice, selectedOption),
      option_set_patch: {
        status: 'selected',
        selected_option_id: selectedOption.research_slice_option_id,
        updated_at: now,
      },
    };
    return this.repository.createSelectionDecisionWithSlice(creation);
  }

  async buildTopicQuestionFormationInput(input: {
    research_slice_id: string;
  }): Promise<TopicSelectionV1bTopicQuestionFormationInput> {
    const researchSlice = await this.repository.findResearchSliceById(input.research_slice_id);
    if (!researchSlice) {
      throw new AppError(404, 'NOT_FOUND', `ResearchSlice ${input.research_slice_id} not found.`);
    }
    if (researchSlice.status !== 'selected') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only selected ResearchSlice records can form T-059 input.');
    }
    const optionSet = await this.requireOptionSet(researchSlice.source_option_set_ref.ref_id);
    if (optionSet.status !== 'selected' || optionSet.selected_option_id !== researchSlice.source_option_ref.ref_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchSlice is not the current selected slice for its option set.');
    }
    const [evidenceRefs, boundaries, assumptions] = await Promise.all([
      this.repository.listEvidenceRefsByResearchSliceId(input.research_slice_id),
      this.repository.listBoundariesByResearchSliceId(input.research_slice_id),
      this.repository.listAssumptionsByResearchSliceId(input.research_slice_id),
    ]);
    return {
      research_slice_ref: this.ref(
        'research_slice',
        researchSlice.research_slice_id,
        researchSlice.title_card_id,
        researchSlice.slice_version,
      ),
      slice_selection_decision_ref: researchSlice.slice_selection_decision_ref,
      source_option_set_ref: researchSlice.source_option_set_ref,
      source_option_ref: researchSlice.source_option_ref,
      validated_need_ref: researchSlice.validated_need_ref,
      v1b_intake_snapshot_ref: researchSlice.v1b_intake_snapshot_ref,
      research_constraint_profile_ref: researchSlice.research_constraint_profile_ref,
      readiness_assessment_ref: researchSlice.readiness_assessment_ref,
      evidence_map_ref: researchSlice.evidence_map_ref,
      search_run_ref: researchSlice.search_run_ref,
      search_plan_ref: researchSlice.search_plan_ref,
      literature_snapshot_ref: researchSlice.literature_snapshot_ref,
      target_community: researchSlice.target_community,
      problem_space: researchSlice.problem_space,
      slice_statement: researchSlice.slice_statement,
      included_boundaries: researchSlice.included_boundaries,
      excluded_boundaries: researchSlice.excluded_boundaries,
      evidence_refs: evidenceRefs,
      boundaries,
      assumptions,
      candidate_contribution_types: researchSlice.candidate_contribution_types,
      preferred_contribution_type: researchSlice.preferred_contribution_type,
      expected_claim: researchSlice.expected_claim,
      fallback_claim: researchSlice.fallback_claim,
      observable_success_criteria: researchSlice.observable_success_criteria,
      resource_assumptions: researchSlice.resource_assumptions,
      data_assumptions: researchSlice.data_assumptions,
      evaluation_path: researchSlice.evaluation_path,
      baseline_assumptions: researchSlice.baseline_assumptions,
      dependency_risks: researchSlice.dependency_risks,
      slice_budget: researchSlice.slice_budget,
      accepted_risk_refs: researchSlice.accepted_risk_refs,
      memory_suggestion_refs: researchSlice.memory_suggestion_refs,
      recheck_request_refs: researchSlice.recheck_request_refs,
      gap_codes: researchSlice.gap_codes,
      non_goals: researchSlice.non_goals,
      claim_ceiling: researchSlice.claim_ceiling,
      topic_question_guardrails: researchSlice.topic_question_guardrails,
      value_assessment_inputs: researchSlice.value_assessment_inputs,
      must_preserve_boundaries: researchSlice.must_preserve_boundaries,
    };
  }

  private validateAndBuildOptions(input: {
    output: TopicSelectionResearchSliceOptionSetLlmOutput;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    optionSetId: string;
    titleCardId: string;
    workspaceId: string | null;
  }): OptionValidationResult {
    const { output, planningInput, optionSetId, titleCardId, workspaceId } = input;
    if (!output || !Array.isArray(output.options) || output.options.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchSlice planning returned no options.');
    }
    const canonicalEvidenceRefs = this.flattenEvidenceRoleBundle(planningInput.evidence_role_bundle);
    const knownEvidenceIds = new Set(canonicalEvidenceRefs.map((ref) => ref.ref_id));
    const canonicalEvidenceById = new Map(canonicalEvidenceRefs.map((ref) => [ref.ref_id, ref]));
    const knownSourceIds = new Set(
      this.compilePlanningSourceRefs(planningInput).map((ref) => ref.ref_id),
    );
    const knownNonEvidenceIds = new Set(
      [...knownSourceIds].filter((refId) => !knownEvidenceIds.has(refId)),
    );
    const qualityFlags: string[] = [];
    const now = this.now();
    let highRiskOptionCount = 0;
    const options = output.options.map((draft, index) => {
      const normalizedEvidence = this.normalizeDraftEvidenceRefs(
        draft,
        knownEvidenceIds,
        knownNonEvidenceIds,
        canonicalEvidenceById,
      );
      const normalizedDraft = normalizedEvidence.draft;
      const droppedNonEvidenceRefs = normalizedEvidence.droppedNonEvidenceRefs;
      const canonicalizedEvidenceRefs = normalizedEvidence.canonicalizedEvidenceRefs;
      this.validateDraft(normalizedDraft, planningInput, knownEvidenceIds, index);
      const optionId = this.idFactory('research_slice_option');
      const hasHardBlocker = normalizedDraft.hard_blockers.length > 0;
      const isHighRisk = this.isHighRiskDraft(normalizedDraft);
      const explicitClaimViolations = this.explicitClaimCeilingViolations(
        planningInput.claim_ceiling,
        [normalizedDraft.expected_claim, normalizedDraft.fallback_claim],
      );
      if (
        normalizedDraft.claim_ceiling_alignment.status === 'exceeds'
        || explicitClaimViolations.length > 0
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `ResearchSlice option ${index + 1} exceeds the ResearchConstraintProfile claim ceiling.`,
        );
      }
      const uncertainClaimAlignment =
        normalizedDraft.claim_ceiling_alignment.status === 'uncertain'
        || normalizedDraft.claim_ceiling_alignment.confidence === null
        || normalizedDraft.claim_ceiling_alignment.confidence === undefined
        || normalizedDraft.claim_ceiling_alignment.confidence < 0.6;
      const requiresHumanReview =
        normalizedDraft.requires_human_review ||
        isHighRisk ||
        uncertainClaimAlignment ||
        normalizedDraft.confidence === null ||
        normalizedDraft.confidence === undefined ||
        normalizedDraft.confidence < 0.6 ||
        droppedNonEvidenceRefs.length > 0 ||
        canonicalizedEvidenceRefs.length > 0;
      if (hasHardBlocker) {
        qualityFlags.push('HARD_BLOCKED_OPTIONS_PRESENT');
      }
      if (droppedNonEvidenceRefs.length > 0) {
        qualityFlags.push('NON_EVIDENCE_REFS_REMOVED_FROM_SLICE_OPTION');
      }
      if (canonicalizedEvidenceRefs.length > 0) {
        qualityFlags.push('EVIDENCE_REFS_CANONICALIZED');
      }
      if (requiresHumanReview) {
        qualityFlags.push('HUMAN_REVIEW_REQUIRED');
      }
      if (isHighRisk) {
        highRiskOptionCount += 1;
      }
      const status = hasHardBlocker
        ? 'blocked'
        : normalizedDraft.option_key === output.recommended_option_key
          ? 'recommended'
          : 'candidate';
      return {
        research_slice_option_id: optionId,
        workspace_id: workspaceId,
        title_card_id: titleCardId,
        research_slice_option_set_id: optionSetId,
        option_ordinal: index + 1,
        option_key: normalizedDraft.option_key,
        status,
        source_validated_need_refs: normalizedDraft.source_validated_need_refs,
        slice_statement: normalizedDraft.slice_statement,
        problem_space: normalizedDraft.problem_space,
        target_setting: normalizedDraft.target_setting,
        target_community: normalizedDraft.target_community,
        included_boundaries: normalizedDraft.included_boundaries,
        excluded_boundaries: normalizedDraft.excluded_boundaries,
        contribution_type_candidate: normalizedDraft.contribution_type_candidate,
        support_evidence_refs: normalizedDraft.support_evidence_refs,
        challenge_evidence_refs: normalizedDraft.challenge_evidence_refs,
        baseline_evidence_refs: normalizedDraft.baseline_evidence_refs,
        context_evidence_refs: normalizedDraft.context_evidence_refs,
        resource_assumptions: normalizedDraft.resource_assumptions,
        data_assumptions: normalizedDraft.data_assumptions,
        evaluation_path: normalizedDraft.evaluation_path,
        baseline_assumptions: normalizedDraft.baseline_assumptions,
        hard_blockers: normalizedDraft.hard_blockers,
        dependency_risks: normalizedDraft.dependency_risks,
        slice_budget: normalizedDraft.slice_budget,
        expected_claim: normalizedDraft.expected_claim,
        fallback_claim: normalizedDraft.fallback_claim,
        observable_success_criteria: normalizedDraft.observable_success_criteria,
        main_risks: normalizedDraft.main_risks,
        baseline_risk: normalizedDraft.baseline_risk,
        execution_risk: normalizedDraft.execution_risk,
        scope_risk: normalizedDraft.scope_risk,
        claim_ceiling_alignment: normalizedDraft.claim_ceiling_alignment,
        confidence: normalizedDraft.confidence ?? null,
        requires_human_review: requiresHumanReview,
        human_review_triggers: [
          ...normalizedDraft.human_review_triggers,
          ...(isHighRisk ? ['high_risk_option'] : []),
          ...(uncertainClaimAlignment ? ['uncertain_claim_ceiling_alignment'] : []),
          ...(normalizedDraft.confidence === null || normalizedDraft.confidence === undefined || normalizedDraft.confidence < 0.6
            ? ['low_option_confidence']
            : []),
          ...(droppedNonEvidenceRefs.length > 0 ? ['non_evidence_refs_removed'] : []),
          ...(canonicalizedEvidenceRefs.length > 0 ? ['evidence_refs_canonicalized'] : []),
        ],
        details_payload: {
          ...normalizedDraft.details_payload,
          inherited_constraints: {
            claim_ceiling: planningInput.claim_ceiling,
            non_goals: planningInput.non_goals,
            method_constraints: planningInput.method_constraints,
            resource_constraints: planningInput.resource_constraints,
            available_assets: planningInput.available_assets,
            feasibility_budget: planningInput.feasibility_budget,
          },
          ...(droppedNonEvidenceRefs.length > 0
            ? { evidence_ref_normalization: { dropped_non_evidence_refs: droppedNonEvidenceRefs } }
            : {}),
          ...(canonicalizedEvidenceRefs.length > 0
            ? { evidence_ref_canonicalization: { canonicalized_evidence_refs: canonicalizedEvidenceRefs } }
            : {}),
        },
        created_at: now,
      } satisfies TopicSelectionResearchSliceOptionRecord;
    });

    const recommendedOption =
      output.recommended_option_key
        ? options.find((option) => option.option_key === output.recommended_option_key)
        : null;
    if (output.recommended_option_key && !recommendedOption) {
      qualityFlags.push('RECOMMENDED_OPTION_KEY_NOT_FOUND');
    }
    if (recommendedOption?.status === 'blocked') {
      qualityFlags.push('RECOMMENDED_OPTION_BLOCKED');
    }
    return {
      options,
      highRiskOptionCount,
      requiresHumanReview: options.some((option) => option.requires_human_review),
      qualityFlags: this.uniqueStrings(qualityFlags),
      recommendedOptionId: recommendedOption?.status === 'blocked'
        ? null
        : recommendedOption?.research_slice_option_id ?? null,
    };
  }

  private validateDraft(
    draft: TopicSelectionResearchSliceOptionDraft,
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
    knownEvidenceIds: Set<string>,
    index: number,
  ): void {
    const ordinal = index + 1;
    if (draft.source_validated_need_refs.every((ref) => ref.ref_id !== planningInput.validated_need_ref.ref_id)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} does not reference the inherited ValidatedNeed.`,
      );
    }
    if (draft.included_boundaries.length === 0 || draft.excluded_boundaries.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} must include both included and excluded boundaries.`,
      );
    }
    if (!this.aligns(draft.target_community, planningInput.target_community)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} target community drifts from ResearchConstraintProfile.`,
      );
    }
    if (!this.nonGoalsRemainExcluded(draft, planningInput.non_goals)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} does not preserve ResearchConstraintProfile non-goals.`,
      );
    }
    const optionEvidenceRefs = this.draftEvidenceRefs(draft);
    if (optionEvidenceRefs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} must cite inherited evidence refs.`,
      );
    }
    const unknownEvidence = optionEvidenceRefs.find((ref) => !knownEvidenceIds.has(ref.ref_id));
    if (unknownEvidence) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResearchSlice option ${ordinal} cites unknown evidence ref ${unknownEvidence.ref_id}.`,
      );
    }
  }

  private normalizeDraftEvidenceRefs(
    draft: TopicSelectionResearchSliceOptionDraft,
    knownEvidenceIds: Set<string>,
    knownNonEvidenceIds: Set<string>,
    canonicalEvidenceById: Map<string, TopicSelectionFunctionalRef>,
  ): {
    draft: TopicSelectionResearchSliceOptionDraft;
    droppedNonEvidenceRefs: TopicSelectionFunctionalRef[];
    canonicalizedEvidenceRefs: TopicSelectionFunctionalRef[];
  } {
    const droppedNonEvidenceRefs: TopicSelectionFunctionalRef[] = [];
    const canonicalizedEvidenceRefs: TopicSelectionFunctionalRef[] = [];
    const keepEvidenceRefs = (refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] =>
      refs.flatMap((ref) => {
        if (knownEvidenceIds.has(ref.ref_id)) {
          const canonical = canonicalEvidenceById.get(ref.ref_id) ?? ref;
          if (this.refKey(canonical) !== this.refKey(ref)) {
            canonicalizedEvidenceRefs.push(canonical);
          }
          return [canonical];
        }
        if (knownNonEvidenceIds.has(ref.ref_id)) {
          droppedNonEvidenceRefs.push(ref);
          return [];
        }
        return [ref];
      });

    return {
      draft: {
        ...draft,
        support_evidence_refs: keepEvidenceRefs(draft.support_evidence_refs),
        challenge_evidence_refs: keepEvidenceRefs(draft.challenge_evidence_refs),
        baseline_evidence_refs: keepEvidenceRefs(draft.baseline_evidence_refs),
        context_evidence_refs: keepEvidenceRefs(draft.context_evidence_refs),
      },
      droppedNonEvidenceRefs: this.uniqueRefs(droppedNonEvidenceRefs),
      canonicalizedEvidenceRefs: this.uniqueRefs(canonicalizedEvidenceRefs),
    };
  }

  private async persistFailedPlanRun(input: {
    input: PlanResearchSliceOptionsInput;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    planRunId: string;
    titleCardId: string;
    workspaceId: string | null;
    triggeredBy: TopicSelectionActorType;
    model: LlmModelRef;
    promptVersion: string;
    inputSnapshotId: string;
    sourceRefs: TopicSelectionFunctionalRef[];
    error: unknown;
    telemetry?: LlmCallTelemetry | null;
    artifacts?: Array<{ artifact_kind: 'structured_output' | 'diagnostic'; payload: Record<string, unknown> }>;
  }): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    const planRunRef = this.ref('plan_research_slice_run', input.planRunId, input.titleCardId);
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      workflow_key: 'topic-selection.v1b-plan-research-slice-options',
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: input.input.workflow_profile_version ?? null,
      input_snapshot_id: input.inputSnapshotId,
      status: 'failed',
      provider_id: input.model.providerId,
      model_id: input.model.modelId,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: input.promptVersion,
      telemetry: this.telemetryRecord(input.telemetry ?? this.errorTelemetry(input.error)),
      output_summary: {
        failure_reason: this.errorMessage(input.error),
      },
      error_code: this.errorCode(input.error),
      error_message: this.errorMessage(input.error),
      artifacts: [
        ...(input.artifacts ?? []),
        {
          artifact_kind: 'diagnostic',
          payload: this.errorPayload(input.error),
        },
      ],
      created_by: input.triggeredBy,
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      gate_key: 'topic-selection.v1b-research-slice-options-domain-validation',
      target_ref: planRunRef,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.input.policy_version_id ?? null,
      blockers: [
        this.blocker(
          'RESEARCH_SLICE_OPTION_PLANNING_FAILED',
          this.errorMessage(input.error),
          input.sourceRefs,
        ),
      ],
      created_by: input.triggeredBy,
    });
    await this.controlPlane.attemptTransition({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      transition_key: 'v1b-readiness-to-research-slice-option-set',
      source_ref: input.planningInput.readiness_assessment_ref,
      target_ref: planRunRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: input.inputSnapshotId,
      policy_version_id: input.input.policy_version_id ?? null,
      actor: { actor_type: input.triggeredBy },
    });
    const now = this.now();
    return this.repository.createPlanRun({
      plan_research_slice_run_id: input.planRunId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      v1b_intake_readiness_assessment_id: input.input.readiness_assessment_id,
      v1b_intake_snapshot_id: input.planningInput.v1b_intake_snapshot_ref.ref_id,
      research_constraint_profile_id: input.planningInput.research_constraint_profile_ref.ref_id,
      v1b_input_bundle_id: input.planningInput.v1b_input_bundle_ref.ref_id,
      validated_need_id: input.planningInput.validated_need_ref.ref_id,
      status: 'failed',
      triggered_by: input.triggeredBy,
      v1b_input_bundle_ref: input.planningInput.v1b_input_bundle_ref,
      v1b_intake_snapshot_ref: input.planningInput.v1b_intake_snapshot_ref,
      research_constraint_profile_ref: input.planningInput.research_constraint_profile_ref,
      readiness_assessment_ref: input.planningInput.readiness_assessment_ref,
      validated_need_ref: input.planningInput.validated_need_ref,
      evidence_map_ref: input.planningInput.evidence_map_ref,
      search_run_ref: input.planningInput.search_run_ref,
      search_plan_ref: input.planningInput.search_plan_ref,
      literature_snapshot_ref: input.planningInput.literature_snapshot_ref,
      accepted_risk_refs: input.planningInput.accepted_risk_refs,
      memory_suggestion_refs: input.planningInput.memory_suggestion_refs,
      recheck_request_refs: input.planningInput.recheck_request_refs,
      gap_codes: input.planningInput.gap_codes,
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: input.input.workflow_profile_version ?? null,
      provider_id: input.model.providerId,
      model_id: input.model.modelId,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: input.promptVersion,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      option_set_id: null,
      artifact_refs: this.artifactRefs(workflow.artifact_refs, input.titleCardId),
      quality_flags: ['RESEARCH_SLICE_OPTION_PLANNING_FAILED'],
      failure_reason: this.errorMessage(input.error),
      created_at: now,
      updated_at: now,
    });
  }

  private async recordSelectionControlPlane(input: {
    workspaceId: string | null;
    titleCardId: string;
    actor: TopicSelectionActorType;
    decisionRef: TopicSelectionFunctionalRef;
    sourceRef: TopicSelectionFunctionalRef;
    targetRef: TopicSelectionFunctionalRef;
    sourceRefs: TopicSelectionFunctionalRef[];
    payload: Record<string, unknown>;
    outputSummary: Record<string, unknown>;
    policyVersionId?: string | null;
    acceptedRiskRefs: TopicSelectionFunctionalRef[];
    createdAuthorityRefs: TopicSelectionFunctionalRef[];
    verdict?: TopicSelectionGateVerdict;
  }): Promise<{
    workflow: Awaited<ReturnType<TopicSelectionControlPlaneService['recordWorkflowRun']>>;
    gate: Awaited<ReturnType<TopicSelectionControlPlaneService['runDeterministicGate']>>;
    transition: Awaited<ReturnType<TopicSelectionControlPlaneService['attemptTransition']>>;
  }> {
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      target_ref: input.decisionRef,
      source_refs: input.sourceRefs,
      payload: input.payload,
      policy_version: input.policyVersionId ?? null,
      created_by: input.actor,
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      workflow_key: 'topic-selection.v1b-slice-selection-decision',
      workflow_profile_key: 'deterministic-slice-selection-policy',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      status: 'succeeded',
      output_summary: input.outputSummary,
      artifacts: [
        {
          artifact_kind: 'structured_output',
          payload: input.outputSummary,
        },
      ],
      created_by: input.actor,
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      gate_key: 'topic-selection.v1b-slice-selection-policy',
      target_ref: input.decisionRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policyVersionId ?? null,
      verdict: input.verdict,
      accepted_risk_refs: input.acceptedRiskRefs,
      created_by: input.actor,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      transition_key: 'v1b-research-slice-option-selection',
      source_ref: input.sourceRef,
      target_ref: input.targetRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policyVersionId ?? null,
      actor: { actor_type: input.actor },
      accepted_risk_refs: input.acceptedRiskRefs,
      created_authority_refs: input.createdAuthorityRefs,
    });
    return { workflow, gate, transition };
  }

  private buildEvidenceRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionResearchSliceEvidenceRefRecord[] {
    const rows: TopicSelectionResearchSliceEvidenceRefRecord[] = [];
    const pushRows = (
      refs: TopicSelectionFunctionalRef[],
      role: TopicSelectionResearchSliceEvidenceRefRecord['evidence_role'],
      rationale: string,
    ) => {
      for (const ref of refs) {
        rows.push({
          research_slice_evidence_ref_id: this.idFactory('research_slice_evidence_ref'),
          workspace_id: researchSlice.workspace_id ?? null,
          title_card_id: researchSlice.title_card_id,
          research_slice_id: researchSlice.research_slice_id,
          evidence_ref: ref,
          evidence_role: role,
          rationale,
          evidence_strength_snapshot: {},
          source_locator_snapshot: {},
          created_at: researchSlice.created_at,
        });
      }
    };
    pushRows(option.support_evidence_refs, 'support', 'Inherited support evidence for the selected ResearchSlice.');
    pushRows(option.challenge_evidence_refs, 'challenge', 'Inherited challenge evidence for the selected ResearchSlice.');
    pushRows(option.baseline_evidence_refs, 'baseline', 'Inherited baseline evidence for the selected ResearchSlice.');
    pushRows(option.context_evidence_refs, 'context', 'Inherited context evidence for the selected ResearchSlice.');
    return rows;
  }

  private buildBoundaryRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): TopicSelectionResearchSliceBoundaryRecord[] {
    return [
      ...option.included_boundaries.map((statement) =>
        this.boundaryRow(researchSlice, 'included', 'scope', statement, 'Selected option included boundary.'),
      ),
      ...option.excluded_boundaries.map((statement) =>
        this.boundaryRow(researchSlice, 'excluded', 'scope', statement, 'Selected option excluded boundary.'),
      ),
      ...inherited.non_goals.map((statement) =>
        this.boundaryRow(researchSlice, 'excluded', 'non_goal', statement, 'Inherited ResearchConstraintProfile non-goal.'),
      ),
    ];
  }

  private buildAssumptionRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionResearchSliceAssumptionRecord[] {
    return [
      ...option.resource_assumptions.map((statement) =>
        this.assumptionRow(researchSlice, 'resource', statement, 'open', 'medium'),
      ),
      ...option.data_assumptions.map((statement) =>
        this.assumptionRow(researchSlice, 'data', statement, 'open', 'medium'),
      ),
      ...option.baseline_assumptions.map((statement) =>
        this.assumptionRow(researchSlice, 'baseline', statement, 'open', option.baseline_risk),
      ),
      ...option.dependency_risks.map((statement) =>
        this.assumptionRow(researchSlice, 'dependency', statement, 'open', 'high'),
      ),
      this.assumptionRow(researchSlice, 'evaluation', option.evaluation_path, 'open', option.execution_risk),
    ];
  }

  private boundaryRow(
    researchSlice: TopicSelectionResearchSliceRecord,
    boundaryKind: TopicSelectionResearchSliceBoundaryRecord['boundary_kind'],
    boundaryType: string,
    statement: string,
    reason: string,
  ): TopicSelectionResearchSliceBoundaryRecord {
    return {
      research_slice_boundary_id: this.idFactory('research_slice_boundary'),
      workspace_id: researchSlice.workspace_id ?? null,
      title_card_id: researchSlice.title_card_id,
      research_slice_id: researchSlice.research_slice_id,
      boundary_kind: boundaryKind,
      boundary_type: boundaryType,
      statement,
      reason,
      evidence_refs: [],
      created_at: researchSlice.created_at,
    };
  }

  private assumptionRow(
    researchSlice: TopicSelectionResearchSliceRecord,
    assumptionType: TopicSelectionResearchSliceAssumptionRecord['assumption_type'],
    statement: string,
    status: string,
    riskLevel: TopicSelectionResearchSliceAssumptionRecord['risk_level'],
  ): TopicSelectionResearchSliceAssumptionRecord {
    return {
      research_slice_assumption_id: this.idFactory('research_slice_assumption'),
      workspace_id: researchSlice.workspace_id ?? null,
      title_card_id: researchSlice.title_card_id,
      research_slice_id: researchSlice.research_slice_id,
      assumption_type: assumptionType,
      statement,
      status,
      evidence_refs: [],
      risk_level: riskLevel,
      created_at: researchSlice.created_at,
    };
  }

  private assertOptionSelectable(
    option: TopicSelectionResearchSliceOptionRecord,
    decidedBy: TopicSelectionActorType,
    acceptedRiskRefs: TopicSelectionFunctionalRef[],
  ): void {
    if (option.status === 'blocked' || option.hard_blockers.length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Hard-blocked ResearchSlice options cannot be selected.');
    }
    const highRisk = this.isHighRiskOption(option) || option.requires_human_review;
    const hasHumanHandling = decidedBy === 'human' || decidedBy === 'hybrid';
    if (highRisk && !hasHumanHandling && acceptedRiskRefs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'High-risk or human-review ResearchSlice options require human handling or accepted risk refs.',
      );
    }
  }

  private requireSelectedOption(
    selectedOptionId: string | null | undefined,
    options: TopicSelectionResearchSliceOptionRecord[],
  ): TopicSelectionResearchSliceOptionRecord {
    if (!selectedOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'selected_option_id is required for select decisions.');
    }
    const option = options.find((candidate) => candidate.research_slice_option_id === selectedOptionId);
    if (!option) {
      throw new AppError(404, 'NOT_FOUND', `ResearchSliceOption ${selectedOptionId} not found.`);
    }
    return option;
  }

  private async requirePlanRun(planRunId: string): Promise<TopicSelectionPlanResearchSliceRunRecord> {
    const planRun = await this.repository.findPlanRunById(planRunId);
    if (!planRun) {
      throw new AppError(404, 'NOT_FOUND', `PlanResearchSliceRun ${planRunId} not found.`);
    }
    return planRun;
  }

  private async requireOptionSet(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    const optionSet = await this.repository.findOptionSetById(optionSetId);
    if (!optionSet) {
      throw new AppError(404, 'NOT_FOUND', `ResearchSliceOptionSet ${optionSetId} not found.`);
    }
    return optionSet;
  }

  private compilePlanningSourceRefs(
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      planningInput.v1b_input_bundle_ref,
      planningInput.v1b_intake_snapshot_ref,
      planningInput.research_constraint_profile_ref,
      planningInput.readiness_assessment_ref,
      planningInput.validated_need_ref,
      planningInput.evidence_map_ref,
      planningInput.search_run_ref,
      planningInput.search_plan_ref,
      planningInput.literature_snapshot_ref,
      ...this.flattenEvidenceRoleBundle(planningInput.evidence_role_bundle),
      ...planningInput.accepted_risk_refs,
      ...planningInput.memory_suggestion_refs,
      ...planningInput.recheck_request_refs,
    ]);
  }

  private flattenEvidenceRoleBundle(
    roleBundle: TopicSelectionEvidenceRoleBundle,
  ): TopicSelectionFunctionalRef[] {
    return [
      ...roleBundle.support_unit_refs,
      ...roleBundle.challenge_unit_refs,
      ...roleBundle.baseline_unit_refs,
      ...roleBundle.context_unit_refs,
    ];
  }

  private draftEvidenceRefs(draft: TopicSelectionResearchSliceOptionDraft): TopicSelectionFunctionalRef[] {
    return [
      ...draft.support_evidence_refs,
      ...draft.challenge_evidence_refs,
      ...draft.baseline_evidence_refs,
      ...draft.context_evidence_refs,
    ];
  }

  private optionEvidenceRefs(option: TopicSelectionResearchSliceOptionRecord): TopicSelectionFunctionalRef[] {
    return [
      ...option.support_evidence_refs,
      ...option.challenge_evidence_refs,
      ...option.baseline_evidence_refs,
      ...option.context_evidence_refs,
    ];
  }

  private inheritedConstraints(option: TopicSelectionResearchSliceOptionRecord): InheritedConstraints {
    const payload = option.details_payload.inherited_constraints;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchSliceOption is missing inherited constraint payload.');
    }
    const record = payload as Record<string, unknown>;
    const claimCeiling = typeof record.claim_ceiling === 'string' ? record.claim_ceiling : '';
    const nonGoals = this.stringArray(record.non_goals);
    if (!claimCeiling.trim() || nonGoals.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchSliceOption inherited constraints are incomplete.');
    }
    return {
      claim_ceiling: claimCeiling,
      non_goals: nonGoals,
      method_constraints: this.stringArray(record.method_constraints),
      resource_constraints: this.stringArray(record.resource_constraints),
      available_assets: this.stringArray(record.available_assets),
      feasibility_budget: this.recordValue(record.feasibility_budget),
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private isHighRiskDraft(draft: TopicSelectionResearchSliceOptionDraft): boolean {
    return draft.baseline_risk === 'high'
      || draft.execution_risk === 'high'
      || draft.scope_risk === 'high';
  }

  private isHighRiskOption(option: TopicSelectionResearchSliceOptionRecord): boolean {
    return option.baseline_risk === 'high'
      || option.execution_risk === 'high'
      || option.scope_risk === 'high';
  }

  private nonGoalsRemainExcluded(
    draft: TopicSelectionResearchSliceOptionDraft,
    nonGoals: string[],
  ): boolean {
    const excludedText = draft.excluded_boundaries.map((value) => this.normalize(value)).join(' ');
    return nonGoals.every((nonGoal) => excludedText.includes(this.normalize(nonGoal)));
  }

  private explicitClaimCeilingViolations(claimCeiling: string, claims: string[]): string[] {
    const claimText = claims.map((claim) => this.normalize(claim)).join(' ');
    const ceilingText = this.normalize(claimCeiling);
    const blockedPhrases = [
      ...ceilingText.matchAll(/\b(?:not|cannot|can't|do not|should not)\s+([^.;,]+)/g),
    ]
      .map((match) => match[1]?.trim() ?? '')
      .filter((phrase) => phrase.length >= 4);
    return blockedPhrases.filter((phrase) => claimText.includes(phrase));
  }

  private aligns(left: string, right: string): boolean {
    const normalizedLeft = this.normalize(left);
    const normalizedRight = this.normalize(right);
    return normalizedLeft === normalizedRight
      || normalizedLeft.includes(normalizedRight)
      || normalizedRight.includes(normalizedLeft);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private defaultRejectedReasons(
    options: TopicSelectionResearchSliceOptionRecord[],
    selectedOption: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionRejectedSliceOptionReason[] {
    return options
      .filter((option) => option.research_slice_option_id !== selectedOption.research_slice_option_id)
      .map((option) => ({
        option_id: option.research_slice_option_id,
        reason: option.status === 'blocked'
          ? 'Option carried hard blockers.'
          : 'Option was not selected in this decision.',
        reason_code: option.status === 'blocked' ? 'hard_blocker' : 'weaker_fit',
      }));
  }

  private topicQuestionGuardrails(
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): string[] {
    return this.uniqueStrings([
      `Do not exceed claim ceiling: ${inherited.claim_ceiling}`,
      ...option.excluded_boundaries.map((boundary) => `Exclude: ${boundary}`),
      ...inherited.non_goals.map((nonGoal) => `Non-goal: ${nonGoal}`),
    ]);
  }

  private valueAssessmentInputs(option: TopicSelectionResearchSliceOptionRecord): string[] {
    return this.uniqueStrings([
      option.expected_claim,
      option.fallback_claim,
      option.evaluation_path,
      ...option.observable_success_criteria,
    ]);
  }

  private mustPreserveBoundaries(
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): string[] {
    return this.uniqueStrings([
      inherited.claim_ceiling,
      ...option.included_boundaries,
      ...option.excluded_boundaries,
      ...inherited.non_goals,
    ]);
  }

  private humanReviewReason(option: TopicSelectionResearchSliceOptionRecord): string | null {
    if (!option.requires_human_review) {
      return null;
    }
    return this.uniqueStrings(option.human_review_triggers).join('; ') || 'ResearchSlice option requires human review.';
  }

  private optionSetStatusForNonSelectDecision(
    decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
  ): TopicSelectionResearchSliceOptionSetRecord['status'] {
    if (decision === 'request_more_options') {
      return 'needs_more_options';
    }
    if (decision === 'park') {
      return 'parked';
    }
    return 'rejected';
  }

  private defaultLoopback(
    decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
  ): TopicSelectionSliceSelectionDecisionRecord['loopback_target'] {
    if (decision === 'request_more_options') {
      return 'plan_research_slice_run';
    }
    if (decision === 'park') {
      return 'research_constraint_profile';
    }
    return 'validated_need';
  }

  private artifactRefs(
    artifacts: Array<{ artifact_ref_id: string }>,
    titleCardId: string,
  ): TopicSelectionFunctionalRef[] {
    return artifacts.map((artifact) =>
      this.ref('artifact_ref', artifact.artifact_ref_id, titleCardId),
    );
  }

  private warning(
    code: string,
    message: string,
    refs?: TopicSelectionFunctionalRef[],
  ) {
    return { code, message, severity: 'warning' as const, refs };
  }

  private blocker(
    code: string,
    message: string,
    refs?: TopicSelectionFunctionalRef[],
  ) {
    return { code, message, severity: 'blocking' as const, refs };
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string | null,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
      version_id: versionId ?? null,
    };
  }

  private requireTitleCardId(ref: TopicSelectionFunctionalRef): string {
    if (!ref.title_card_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Upstream ref is missing title_card_id.');
    }
    return ref.title_card_id;
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = [
        ref.ref_type,
        ref.ref_id,
        ref.version_id ?? '',
        ref.title_card_id ?? '',
      ].join(':');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private versionFromId(id: string): string {
    return `v_${id.split('_').at(-1) ?? '1'}`;
  }

  private telemetryRecord(telemetry: LlmCallTelemetry | null | undefined): Record<string, unknown> {
    return telemetry ? telemetry as unknown as Record<string, unknown> : {};
  }

  private errorTelemetry(error: unknown): LlmCallTelemetry | null {
    return error instanceof LlmGatewayError ? error.telemetry ?? null : null;
  }

  private errorCode(error: unknown): string {
    if (error instanceof AppError) {
      return error.errorCode;
    }
    if (error instanceof LlmGatewayError) {
      return error.code;
    }
    return 'RESEARCH_SLICE_OPTION_PLANNING_FAILED';
  }

  private errorPayload(error: unknown): Record<string, unknown> {
    return {
      code: this.errorCode(error),
      message: this.errorMessage(error),
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'ResearchSlice planning failed.';
  }

  private planRunError(error: unknown, planRunId: string): AppError {
    if (error instanceof AppError) {
      return new AppError(error.statusCode, error.errorCode, error.message, {
        ...(error.details ?? {}),
        plan_research_slice_run_id: planRunId,
      });
    }
    return new AppError(502, 'INTERNAL_ERROR', this.errorMessage(error), {
      plan_research_slice_run_id: planRunId,
    });
  }

  /**
   * T-087 Phase 3.1 read-only projection — list ResearchSliceOptionSets under
   * a title-card. Pure repository delegation; no decision-chain semantics
   * changed.
   */
  async listOptionSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    return this.repository.listOptionSetsByTitleCardId(titleCardId);
  }

  /**
   * T-115 — single ResearchSliceOptionSet by id. Lets the human N5 selection
   * service read back the persisted N4 authority + handoff hashes from
   * `comparison_payload` to assemble a valid harness frozen_input.
   */
  async findOptionSetById(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord | null> {
    return this.repository.findOptionSetById(optionSetId);
  }

  /**
   * T-087 Phase 3.2 read-only projection — list ResearchSliceOptions for an
   * OptionSet so the reviewer workbench's selection form can render a
   * proper picker instead of a free-text id field.
   */
  async listOptionsByOptionSetId(
    optionSetId: string,
  ): Promise<TopicSelectionResearchSliceOptionRecord[]> {
    return this.repository.listOptionsByOptionSetId(optionSetId);
  }
}
