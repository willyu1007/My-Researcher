import crypto from 'node:crypto';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAcceptedRiskRecord,
  TopicSelectionAcceptedRiskSourceType,
  TopicSelectionCandidateDecisionMemoryRecord,
  TopicSelectionDecisionMemoryEffectPolicy,
  TopicSelectionDecisionMemoryEntryRecord,
  TopicSelectionDecisionMemoryType,
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionHumanOverrideRecord,
  TopicSelectionImpactLevel,
  TopicSelectionQueueHandlerKey,
  TopicSelectionQueueItemType,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckEventType,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionRecheckResolutionRecord,
  TopicSelectionRecheckResolutionType,
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type { TopicSelectionCandidateDecisionMemorySuggestionRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionNeedValidationRepository } from '../repositories/topic-selection-need-validation.repository.js';
import type { TopicSelectionRecheckRiskMemoryRepository } from '../repositories/topic-selection-recheck-risk-memory.repository.js';
import type { TopicSelectionSearchResourceRepository } from '../repositories/topic-selection-search-resource.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
  defaultCooldownMinutes?: number;
  defaultRetryBudget?: number;
};

type InterpretationResult = {
  event: TopicSelectionRecheckEventRecord | null;
  impact: TopicSelectionRecheckImpactRecord | null;
  queue_item: TopicSelectionDecisionWorkQueueItemRecord | null;
};

type AcceptedRiskInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  risk_type: string;
  source_type?: TopicSelectionAcceptedRiskSourceType;
  source_ref?: TopicSelectionFunctionalRef | null;
  target_ref: TopicSelectionFunctionalRef;
  scope_refs: TopicSelectionFunctionalRef[];
  affected_object_refs?: TopicSelectionFunctionalRef[];
  severity?: TopicSelectionSeverity;
  rationale: string;
  accepted_by: TopicSelectionActorRef;
  policy_version_id?: string | null;
  expiry_condition?: string | null;
  recheck_condition?: string | null;
  expires_at?: string | null;
};

type OverrideInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  overridden_ref?: TopicSelectionFunctionalRef | null;
  blocker_type: string;
  actor: TopicSelectionActorRef;
  rationale: string;
  policy_version_id?: string | null;
  scope?: Record<string, unknown>;
  accepted_risk_id?: string | null;
  accepted_risk?: AcceptedRiskInput | null;
};

const ACTIVE_QUEUE_STATUSES = ['open', 'in_progress'] as const;
const MEMORY_EFFECT_POLICIES: TopicSelectionDecisionMemoryEffectPolicy[] = [
  'none',
  'warn',
  'suppress_duplicate',
  'block_until_rechecked',
  'require_human_review',
];
const SEVERITIES: TopicSelectionSeverity[] = ['info', 'warning', 'blocking', 'critical'];

export function assertTopicSelectionAcceptedRiskUsableForTarget(
  risk: TopicSelectionAcceptedRiskRecord,
  targetRef: TopicSelectionFunctionalRef,
  context: {
    now: string;
    workspace_id?: string | null;
    title_card_id?: string | null;
  },
): void {
  if (risk.status !== 'active') {
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'AcceptedRisk must be active.');
  }
  if (risk.expires_at && risk.expires_at <= context.now) {
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'AcceptedRisk is expired.');
  }
  if (!topicSelectionFunctionalRefsMatch(risk.target_ref, targetRef)) {
    throw new AppError(409, 'VERSION_CONFLICT', 'AcceptedRisk target_ref does not match the protected target.');
  }
  if (risk.scope_refs.length === 0) {
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'AcceptedRisk has no scope refs.');
  }
  const expectedWorkspaceId = context.workspace_id ?? null;
  if (expectedWorkspaceId && risk.workspace_id && risk.workspace_id !== expectedWorkspaceId) {
    throw new AppError(409, 'VERSION_CONFLICT', 'AcceptedRisk belongs to a different workspace.');
  }
  const expectedTitleCardId = context.title_card_id ?? targetRef.title_card_id ?? null;
  if (expectedTitleCardId && risk.title_card_id && risk.title_card_id !== expectedTitleCardId) {
    throw new AppError(409, 'VERSION_CONFLICT', 'AcceptedRisk belongs to a different title card.');
  }
}

function topicSelectionFunctionalRefsMatch(
  left: TopicSelectionFunctionalRef,
  right: TopicSelectionFunctionalRef,
): boolean {
  return left.ref_type === right.ref_type
    && left.ref_id === right.ref_id
    && (left.version_id ?? null) === (right.version_id ?? null)
    && (!left.title_card_id || !right.title_card_id || left.title_card_id === right.title_card_id);
}

export class TopicSelectionRecheckRiskMemoryService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly defaultCooldownMinutes: number;
  private readonly defaultRetryBudget: number;

  constructor(
    private readonly repository: TopicSelectionRecheckRiskMemoryRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    private readonly searchResources: TopicSelectionSearchResourceRepository,
    private readonly needValidation: TopicSelectionNeedValidationRepository,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.defaultCooldownMinutes = options.defaultCooldownMinutes ?? 30;
    this.defaultRetryBudget = options.defaultRetryBudget ?? 3;
  }

  async interpretQualitySignal(input: {
    quality_signal_id: string;
    affected_ref?: TopicSelectionFunctionalRef;
    cooldown_minutes?: number;
  }): Promise<InterpretationResult> {
    const signal = await this.controlPlane.getQualitySignal(input.quality_signal_id);
    if (!signal) {
      throw new AppError(404, 'NOT_FOUND', `QualitySignal ${input.quality_signal_id} not found.`);
    }
    if (signal.verdict === 'pass') {
      return { event: null, impact: null, queue_item: null };
    }

    const affectedRef = input.affected_ref ?? signal.target_ref;
    const impactLevel: TopicSelectionImpactLevel = signal.verdict === 'fail' ? 'recheck_required' : 'stale';
    const reasonCodes = signal.issue_codes.length > 0 ? signal.issue_codes : [signal.check_type];
    const sourceRef = this.ref('quality_signal', signal.quality_signal_id, signal.title_card_id ?? signal.target_ref.title_card_id ?? null);
    return this.recordSignalDrivenInterpretation({
      workspace_id: signal.workspace_id ?? null,
      title_card_id: signal.title_card_id ?? signal.target_ref.title_card_id ?? null,
      event_type: 'quality_signal',
      origin_stage: signal.stage,
      source_ref: sourceRef,
      affected_ref: affectedRef,
      affected_stage: this.stageForRef(affectedRef),
      impact_level: impactLevel,
      severity: signal.verdict === 'fail' ? 'blocking' : 'warning',
      reason_codes: reasonCodes,
      required_actions: [signal.recommended_action ?? 'review_quality_signal'],
      summary: `Quality signal ${signal.check_type} returned ${signal.verdict}.`,
      state_signal_refs: [sourceRef],
      evidence_refs: signal.refs,
      artifact_refs: signal.artifact_refs,
      blocked_transition_keys: signal.blocking_transition_keys,
      queue_item_type: 'recheck',
      handler_key: 'resolve_recheck',
      priority: signal.verdict === 'fail' ? 80 : 40,
      policy_version_id: null,
      payload: { quality_signal: signal },
      cooldown_minutes: input.cooldown_minutes,
    });
  }

  async interpretGateResult(input: {
    readiness_gate_result_id: string;
    cooldown_minutes?: number;
  }): Promise<InterpretationResult> {
    const gate = await this.controlPlane.getReadinessGateResult(input.readiness_gate_result_id);
    if (!gate) {
      throw new AppError(404, 'NOT_FOUND', `ReadinessGateResult ${input.readiness_gate_result_id} not found.`);
    }
    if (gate.verdict === 'pass') {
      return { event: null, impact: null, queue_item: null };
    }

    const reasonCodes = this.gateReasonCodes(gate);
    const sourceRef = this.ref('readiness_gate_result', gate.readiness_gate_result_id, gate.title_card_id ?? gate.target_ref.title_card_id ?? null);
    const isBlock = gate.verdict === 'block';
    const isHuman = gate.verdict === 'needs_human_review';
    const isPassWithRisk = gate.verdict === 'pass_with_risk';
    return this.recordSignalDrivenInterpretation({
      workspace_id: gate.workspace_id ?? null,
      title_card_id: gate.title_card_id ?? gate.target_ref.title_card_id ?? null,
      event_type: 'gate_result',
      origin_stage: this.stageForRef(gate.target_ref),
      source_ref: sourceRef,
      affected_ref: gate.target_ref,
      affected_stage: this.stageForRef(gate.target_ref),
      impact_level: isBlock ? 'recheck_required' : 'stale',
      severity: isBlock ? 'blocking' : 'warning',
      reason_codes: reasonCodes,
      required_actions: gate.required_actions.length > 0
        ? gate.required_actions
        : isPassWithRisk
          ? ['accept_risk']
          : reasonCodes,
      summary: `Gate ${gate.gate_key} returned ${gate.verdict}.`,
      state_signal_refs: gate.quality_signal_refs,
      evidence_refs: [],
      artifact_refs: [],
      blocked_transition_keys: [],
      queue_item_type: isHuman || isPassWithRisk ? 'human_review' : 'blocker',
      handler_key: isPassWithRisk ? 'accept_risk' : isHuman ? 'human_review' : 'resolve_recheck',
      priority: isBlock ? 90 : isPassWithRisk ? 70 : 60,
      policy_version_id: gate.policy_version_id ?? null,
      payload: { gate_result: gate },
      cooldown_minutes: input.cooldown_minutes,
    });
  }

  async interpretWorkflowFailure(input: {
    workflow_run_id: string;
    target_ref: TopicSelectionFunctionalRef;
    reason_codes?: string[];
    required_actions?: string[];
    impact_level?: TopicSelectionImpactLevel;
    cooldown_minutes?: number;
  }): Promise<InterpretationResult> {
    const workflowRun = await this.controlPlane.getWorkflowRun(input.workflow_run_id);
    if (!workflowRun) {
      throw new AppError(404, 'NOT_FOUND', `WorkflowRun ${input.workflow_run_id} not found.`);
    }
    if (!['failed', 'blocked', 'cancelled'].includes(workflowRun.status)) {
      return { event: null, impact: null, queue_item: null };
    }

    const reasonCodes = input.reason_codes ?? [workflowRun.error_code ?? workflowRun.status];
    const sourceRef = this.ref('workflow_run', workflowRun.workflow_run_id, workflowRun.title_card_id ?? input.target_ref.title_card_id ?? null);
    return this.recordSignalDrivenInterpretation({
      workspace_id: workflowRun.workspace_id ?? null,
      title_card_id: workflowRun.title_card_id ?? input.target_ref.title_card_id ?? null,
      event_type: 'workflow_failure',
      origin_stage: this.stageForWorkflow(workflowRun),
      source_ref: sourceRef,
      affected_ref: input.target_ref,
      affected_stage: this.stageForRef(input.target_ref),
      impact_level: input.impact_level ?? 'stale',
      severity: workflowRun.status === 'blocked' ? 'blocking' : 'warning',
      reason_codes: reasonCodes,
      required_actions: input.required_actions ?? ['inspect_workflow_failure'],
      summary: `Workflow ${workflowRun.workflow_key} ended with ${workflowRun.status}.`,
      state_signal_refs: [sourceRef],
      evidence_refs: [],
      artifact_refs: [],
      blocked_transition_keys: [],
      queue_item_type: 'workflow_failure',
      handler_key: 'rerun_workflow',
      priority: workflowRun.status === 'blocked' ? 75 : 50,
      policy_version_id: null,
      payload: { workflow_run: workflowRun },
      cooldown_minutes: input.cooldown_minutes,
    });
  }

  async queueSearchPlanRecheckRequest(input: {
    search_plan_recheck_request_id: string;
    cooldown_minutes?: number;
  }): Promise<InterpretationResult> {
    const request = await this.searchResources.findSearchPlanRecheckRequestById(input.search_plan_recheck_request_id);
    if (!request) {
      throw new AppError(404, 'NOT_FOUND', `SearchPlanRecheckRequest ${input.search_plan_recheck_request_id} not found.`);
    }
    const sourceRef = this.ref('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id);
    return this.recordSignalDrivenInterpretation({
      workspace_id: request.workspace_id ?? null,
      title_card_id: request.title_card_id,
      event_type: 'searchplan_recheck_request',
      origin_stage: 'v1a',
      source_ref: sourceRef,
      affected_ref: request.target_search_plan_ref,
      affected_stage: 'v1a',
      impact_level: 'recheck_required',
      severity: 'blocking',
      reason_codes: request.gap_codes.length > 0 ? request.gap_codes : ['SEARCHPLAN_RECHECK_REQUESTED'],
      required_actions: ['review_searchplan_recheck_request'],
      summary: request.reason,
      state_signal_refs: [sourceRef],
      evidence_refs: [request.source_ref, request.target_search_plan_ref],
      artifact_refs: [],
      blocked_transition_keys: ['need-candidate-ready-for-validation'],
      queue_item_type: 'searchplan_recheck',
      handler_key: 'revise_search_plan',
      priority: 85,
      policy_version_id: request.policy_version_id ?? null,
      payload: { search_plan_recheck_request: request },
      cooldown_minutes: input.cooldown_minutes,
    });
  }

  async materializeCandidateMemorySuggestion(input: {
    memory_suggestion_id: string;
  }): Promise<{
    memory_entry: TopicSelectionDecisionMemoryEntryRecord;
    candidate_memory: TopicSelectionCandidateDecisionMemoryRecord;
  }> {
    const suggestion = await this.needValidation.findCandidateDecisionMemorySuggestionById(input.memory_suggestion_id);
    if (!suggestion) {
      throw new AppError(404, 'NOT_FOUND', `CandidateDecisionMemorySuggestion ${input.memory_suggestion_id} not found.`);
    }
    const existing = await this.repository.findCandidateDecisionMemoryBySuggestionId(input.memory_suggestion_id);
    if (existing) {
      const memoryEntry = await this.repository.findDecisionMemoryEntryById(existing.decision_memory_entry_ref.ref_id);
      if (!memoryEntry) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Candidate memory points to a missing DecisionMemoryEntry.');
      }
      return { memory_entry: memoryEntry, candidate_memory: existing };
    }

    const now = this.now();
    const suggestionRef = this.ref('candidate_decision_memory_suggestion', suggestion.memory_suggestion_id, suggestion.title_card_id);
    const memoryEntryRef = this.ref('decision_memory_entry', this.idFactory('decision_memory_entry'), suggestion.title_card_id);
    const memoryEntry = await this.repository.createDecisionMemoryEntry({
      decision_memory_entry_id: memoryEntryRef.ref_id,
      workspace_id: suggestion.workspace_id ?? null,
      title_card_id: suggestion.title_card_id,
      source_stage: 'v1a',
      source_ref: suggestionRef,
      target_scope_ref: suggestion.target_ref,
      memory_type: this.memoryTypeForSuggestion(suggestion),
      effect_policy: this.effectPolicyForSuggestion(suggestion),
      severity: this.severityFromPayload(suggestion.suggestion_payload),
      confidence: this.numberFromPayload(suggestion.suggestion_payload, 'confidence'),
      status: 'active',
      rationale: suggestion.rationale,
      applicability_scope: this.recordPayload(suggestion.suggestion_payload, 'applicability_scope'),
      payload: suggestion.suggestion_payload,
      evidence_policy: 'not_evidence',
      created_by: suggestion.created_by,
      created_at: now,
      expires_at: this.stringFromPayload(suggestion.suggestion_payload, 'expires_at'),
      recheck_condition: this.stringFromPayload(suggestion.suggestion_payload, 'recheck_condition'),
    });
    const candidateMemory = await this.repository.createCandidateDecisionMemory({
      candidate_decision_memory_id: this.idFactory('candidate_decision_memory'),
      workspace_id: suggestion.workspace_id ?? null,
      title_card_id: suggestion.title_card_id,
      decision_memory_entry_ref: memoryEntryRef,
      source_suggestion_ref: suggestionRef,
      need_candidate_ref: suggestion.target_ref,
      status: 'active',
      reason_codes: this.reasonCodesFromSuggestion(suggestion),
      evidence_policy: 'not_evidence',
      created_at: now,
    });
    return { memory_entry: memoryEntry, candidate_memory: candidateMemory };
  }

  async recordDownstreamFeedback(input: {
    workspace_id?: string | null;
    title_card_id?: string | null;
    source_ref: TopicSelectionFunctionalRef;
    affected_ref: TopicSelectionFunctionalRef;
    feedback_type: string;
    reason_codes: string[];
    summary: string;
    impact_level?: TopicSelectionImpactLevel;
    severity?: TopicSelectionSeverity;
    required_actions?: string[];
    artifact_refs?: TopicSelectionFunctionalRef[];
    policy_version_id?: string | null;
    payload?: Record<string, unknown>;
    /** T-127 W-08: optional deterministic advisory ranking score for the queue item. Absent -> the
     *  prior binary default (invalidated→100 / else→85), so existing callers are byte-unchanged. */
    priority?: number | null;
  }): Promise<InterpretationResult> {
    return this.recordSignalDrivenInterpretation({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? input.source_ref.title_card_id ?? null,
      event_type: 'downstream_feedback',
      origin_stage: 'downstream',
      source_ref: input.source_ref,
      affected_ref: input.affected_ref,
      affected_stage: this.stageForRef(input.affected_ref),
      impact_level: input.impact_level ?? 'recheck_required',
      severity: input.severity ?? (input.impact_level === 'invalidated' ? 'critical' : 'blocking'),
      reason_codes: input.reason_codes,
      required_actions: input.required_actions ?? ['review_downstream_feedback'],
      summary: input.summary,
      state_signal_refs: [input.source_ref],
      evidence_refs: [input.affected_ref],
      artifact_refs: input.artifact_refs ?? [],
      blocked_transition_keys: [],
      queue_item_type: 'downstream_feedback',
      handler_key: 'human_review',
      priority: input.priority ?? (input.impact_level === 'invalidated' ? 100 : 85),
      policy_version_id: input.policy_version_id ?? null,
      payload: {
        feedback_type: input.feedback_type,
        ...(input.payload ?? {}),
      },
    });
  }

  async acceptRisk(input: AcceptedRiskInput): Promise<TopicSelectionAcceptedRiskRecord> {
    if (input.scope_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'AcceptedRisk requires an explicit scope ref.');
    }
    if (!input.expires_at && !input.recheck_condition && !input.expiry_condition) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'AcceptedRisk requires expiry or recheck condition.');
    }
    if (!this.isHumanActor(input.accepted_by)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'AcceptedRisk requires a human or hybrid actor.');
    }
    const now = this.now();
    return this.repository.createAcceptedRisk({
      accepted_risk_id: this.idFactory('accepted_risk'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      risk_type: input.risk_type,
      source_type: input.source_type ?? 'manual',
      source_ref: input.source_ref ?? null,
      target_ref: input.target_ref,
      scope_refs: input.scope_refs,
      affected_object_refs: input.affected_object_refs ?? [input.target_ref],
      severity: input.severity ?? 'warning',
      status: 'active',
      rationale: input.rationale,
      accepted_by: input.accepted_by,
      policy_version_id: input.policy_version_id ?? null,
      expiry_condition: input.expiry_condition ?? null,
      recheck_condition: input.recheck_condition ?? null,
      expires_at: input.expires_at ?? null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });
  }

  /** Read projection: accepted risks recorded against a title-card (reviewer surface). */
  async listAcceptedRisksByTitleCardId(titleCardId: string): Promise<TopicSelectionAcceptedRiskRecord[]> {
    return this.repository.listAcceptedRisksByTitleCardId(titleCardId);
  }

  async recordHumanOverride(input: OverrideInput): Promise<TopicSelectionHumanOverrideRecord> {
    if (!this.isHumanActor(input.actor)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'HumanOverride requires a human or hybrid actor.');
    }
    const blockerPolicy = await this.repository.findActiveBlockerPolicyByCode(
      input.blocker_type,
      input.policy_version_id ?? null,
    );
    if (blockerPolicy?.category === 'non_overridable') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Blocker policy is non-overridable.');
    }
    const acceptedRisk = input.accepted_risk_id
      ? await this.requireUsableAcceptedRisk(input.accepted_risk_id, input.target_ref, {
          workspace_id: input.workspace_id ?? null,
          title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
        })
      : input.accepted_risk
        ? await this.createOverrideAcceptedRisk(input)
        : null;
    if (!acceptedRisk) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'HumanOverride requires an AcceptedRisk.');
    }
    const acceptedRiskRef = this.ref('accepted_risk', acceptedRisk.accepted_risk_id, acceptedRisk.title_card_id ?? input.target_ref.title_card_id ?? null);
    return this.repository.createHumanOverride({
      human_override_id: this.idFactory('human_override'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      target_ref: input.target_ref,
      overridden_ref: input.overridden_ref ?? null,
      blocker_type: input.blocker_type,
      accepted_risk_ref: acceptedRiskRef,
      actor: input.actor,
      rationale: input.rationale,
      policy_version_id: input.policy_version_id ?? null,
      scope: input.scope ?? {},
      status: 'active',
      created_at: this.now(),
    });
  }

  async interpretAcceptedRiskExpiry(input: {
    accepted_risk_id: string;
  }): Promise<InterpretationResult> {
    const risk = await this.requireAcceptedRisk(input.accepted_risk_id);
    if (risk.status !== 'active') {
      return { event: null, impact: null, queue_item: null };
    }
    const now = this.now();
    if (!risk.expires_at || risk.expires_at > now) {
      return { event: null, impact: null, queue_item: null };
    }
    const expiredRisk = await this.repository.updateAcceptedRiskStatus(risk.accepted_risk_id, {
      status: 'expired',
      updated_at: now,
    });
    const riskRef = this.ref('accepted_risk', expiredRisk.accepted_risk_id, expiredRisk.title_card_id ?? expiredRisk.target_ref.title_card_id ?? null);
    return this.recordSignalDrivenInterpretation({
      workspace_id: expiredRisk.workspace_id ?? null,
      title_card_id: expiredRisk.title_card_id ?? expiredRisk.target_ref.title_card_id ?? null,
      event_type: 'accepted_risk_expiry',
      origin_stage: this.stageForRef(expiredRisk.target_ref),
      source_ref: riskRef,
      affected_ref: expiredRisk.target_ref,
      affected_stage: this.stageForRef(expiredRisk.target_ref),
      impact_level: 'recheck_required',
      severity: expiredRisk.severity === 'critical' ? 'critical' : 'blocking',
      reason_codes: ['ACCEPTED_RISK_EXPIRED'],
      required_actions: ['review_expired_accepted_risk'],
      summary: `Accepted risk expired: ${expiredRisk.rationale}`,
      state_signal_refs: [riskRef],
      evidence_refs: expiredRisk.affected_object_refs,
      artifact_refs: [],
      blocked_transition_keys: [],
      queue_item_type: 'accepted_risk_expiry',
      handler_key: 'human_review',
      priority: 95,
      policy_version_id: expiredRisk.policy_version_id ?? null,
      payload: { accepted_risk: expiredRisk },
    });
  }

  async reopenExpiredAcceptedRisks(input: { as_of?: string } = {}): Promise<InterpretationResult[]> {
    const asOf = input.as_of ?? this.now();
    const risks = await this.repository.listActiveAcceptedRisksDueForRecheck(asOf);
    const results: InterpretationResult[] = [];
    for (const risk of risks) {
      results.push(await this.interpretAcceptedRiskExpiry({ accepted_risk_id: risk.accepted_risk_id }));
    }
    return results;
  }

  async resolveRecheckImpact(input: {
    recheck_impact_id: string;
    resolution_type: TopicSelectionRecheckResolutionType;
    resolved_by: TopicSelectionActorRef;
    rationale: string;
    output_refs?: TopicSelectionFunctionalRef[];
    accepted_risk_ref?: TopicSelectionFunctionalRef | null;
  }): Promise<TopicSelectionRecheckResolutionRecord> {
    const impact = await this.repository.findRecheckImpactById(input.recheck_impact_id);
    if (!impact) {
      throw new AppError(404, 'NOT_FOUND', `RecheckImpact ${input.recheck_impact_id} not found.`);
    }
    if (input.resolution_type === 'accepted_risk' && !input.accepted_risk_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'accepted_risk resolution requires accepted_risk_ref.');
    }
    if (input.accepted_risk_ref) {
      if (input.accepted_risk_ref.ref_type !== 'accepted_risk') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'accepted_risk_ref must reference an AcceptedRisk.');
      }
      await this.requireUsableAcceptedRisk(input.accepted_risk_ref.ref_id, impact.affected_ref, {
        workspace_id: impact.workspace_id ?? null,
        title_card_id: impact.title_card_id ?? impact.affected_ref.title_card_id ?? null,
      });
    }
    const resolution = await this.repository.createRecheckResolution({
      recheck_resolution_id: this.idFactory('recheck_resolution'),
      workspace_id: impact.workspace_id ?? null,
      title_card_id: impact.title_card_id ?? null,
      recheck_impact_ref: this.ref('recheck_impact', impact.recheck_impact_id, impact.title_card_id ?? impact.affected_ref.title_card_id ?? null),
      resolution_type: input.resolution_type,
      resolved_by: input.resolved_by,
      rationale: input.rationale,
      output_refs: input.output_refs ?? [],
      accepted_risk_ref: input.accepted_risk_ref ?? null,
      created_at: this.now(),
    });
    await this.repository.updateRecheckImpact(impact.recheck_impact_id, {
      status: 'resolved',
      accepted_risk_refs: input.accepted_risk_ref
        ? this.uniqueRefs([...impact.accepted_risk_refs, input.accepted_risk_ref])
        : impact.accepted_risk_refs,
      updated_at: this.now(),
    });
    return resolution;
  }

  async listOpenQueueItems(): Promise<TopicSelectionDecisionWorkQueueItemRecord[]> {
    return this.repository.listDecisionWorkQueueItemsByStatuses([...ACTIVE_QUEUE_STATUSES]);
  }

  private async recordSignalDrivenInterpretation(input: {
    workspace_id?: string | null;
    title_card_id?: string | null;
    event_type: TopicSelectionRecheckEventType;
    origin_stage: string;
    source_ref: TopicSelectionFunctionalRef;
    affected_ref: TopicSelectionFunctionalRef;
    affected_stage: string;
    impact_level: TopicSelectionImpactLevel;
    severity: TopicSelectionSeverity;
    reason_codes: string[];
    required_actions: string[];
    summary: string;
    state_signal_refs: TopicSelectionFunctionalRef[];
    evidence_refs: TopicSelectionFunctionalRef[];
    artifact_refs: TopicSelectionFunctionalRef[];
    blocked_transition_keys: string[];
    queue_item_type: TopicSelectionQueueItemType;
    handler_key: TopicSelectionQueueHandlerKey;
    priority: number;
    policy_version_id?: string | null;
    payload: Record<string, unknown>;
    cooldown_minutes?: number;
  }): Promise<InterpretationResult> {
    const now = this.now();
    const cooldownUntil = this.addMinutes(now, input.cooldown_minutes ?? this.defaultCooldownMinutes);
    const fingerprint = this.fingerprint({
      source_ref: input.source_ref,
      event_type: input.event_type,
      reason_codes: input.reason_codes,
      affected_scope_ref: input.affected_ref,
      evidence_refs: input.evidence_refs,
    });
    const existingEvent = await this.repository.findOpenRecheckEventByFingerprint(fingerprint);
    const event = existingEvent
      ? await this.repository.mergeRecheckEvent(existingEvent.recheck_event_id, {
          severity: this.maxSeverity(existingEvent.severity, input.severity),
          reason_codes: this.uniqueStrings([...existingEvent.reason_codes, ...input.reason_codes]),
          state_signal_refs: this.uniqueRefs([...existingEvent.state_signal_refs, ...input.state_signal_refs]),
          evidence_refs: this.uniqueRefs([...existingEvent.evidence_refs, ...input.evidence_refs]),
          artifact_refs: this.uniqueRefs([...existingEvent.artifact_refs, ...input.artifact_refs]),
          last_seen_at: now,
          cooldown_until: cooldownUntil,
          payload: { ...existingEvent.payload, latest: input.payload },
        })
      : await this.repository.createRecheckEvent({
          recheck_event_id: this.idFactory('recheck_event'),
          workspace_id: input.workspace_id ?? null,
          title_card_id: input.title_card_id ?? input.source_ref.title_card_id ?? input.affected_ref.title_card_id ?? null,
          origin_stage: input.origin_stage,
          event_type: input.event_type,
          source_ref: input.source_ref,
          affected_scope_ref: input.affected_ref,
          event_fingerprint: fingerprint,
          severity: input.severity,
          reason_codes: input.reason_codes,
          summary: input.summary,
          state_signal_refs: input.state_signal_refs,
          evidence_refs: input.evidence_refs,
          artifact_refs: input.artifact_refs,
          policy_version_id: input.policy_version_id ?? null,
          status: 'open',
          observation_count: 1,
          first_seen_at: now,
          last_seen_at: now,
          cooldown_until: cooldownUntil,
          payload: input.payload,
        });

    const impactDedupKey = this.impactDedupKey(event, input.affected_ref, input.impact_level, input.required_actions);
    const existingImpact = await this.repository.findOpenRecheckImpactByDedupKey(impactDedupKey);
    const impact = existingImpact ?? await this.repository.createRecheckImpact({
      recheck_impact_id: this.idFactory('recheck_impact'),
      workspace_id: input.workspace_id ?? event.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? event.title_card_id ?? null,
      recheck_event_ref: this.ref('recheck_event', event.recheck_event_id, event.title_card_id ?? input.affected_ref.title_card_id ?? null),
      affected_ref: input.affected_ref,
      affected_stage: input.affected_stage,
      impact_level: input.impact_level,
      impact_dedup_key: impactDedupKey,
      required_actions: input.required_actions,
      status: input.impact_level === 'no_impact' ? 'resolved' : 'open',
      retry_count: 0,
      retry_budget: this.defaultRetryBudget,
      cooldown_until: cooldownUntil,
      accepted_risk_refs: [],
      queue_item_refs: [],
      assessment_payload: { event_fingerprint: event.event_fingerprint },
      created_at: now,
      updated_at: now,
    });

    if (input.impact_level === 'no_impact') {
      return { event, impact, queue_item: null };
    }

    const queueDedupKey = this.queueDedupKey(input.queue_item_type, input.affected_ref, input.source_ref, input.handler_key);
    const existingQueueItem = await this.repository.findOpenDecisionWorkQueueItemByDedupKey(queueDedupKey);
    const queueItem = existingQueueItem ?? await this.repository.createDecisionWorkQueueItem({
      decision_work_queue_item_id: this.idFactory('decision_work_queue_item'),
      workspace_id: input.workspace_id ?? event.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? input.source_ref.title_card_id ?? null,
      queue_item_type: input.queue_item_type,
      handler_key: input.handler_key,
      target_ref: input.affected_ref,
      source_ref: input.source_ref,
      queue_dedup_key: queueDedupKey,
      priority: input.priority,
      status: 'open',
      required_actions: input.required_actions,
      reason_codes: input.reason_codes,
      blocked_transition_keys: input.blocked_transition_keys,
      retry_count: 0,
      retry_budget: this.defaultRetryBudget,
      cooldown_until: cooldownUntil,
      policy_version_id: input.policy_version_id ?? null,
      payload: {
        recheck_event_ref: this.ref('recheck_event', event.recheck_event_id, event.title_card_id ?? null),
        recheck_impact_ref: this.ref('recheck_impact', impact.recheck_impact_id, impact.title_card_id ?? null),
      },
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });

    const linkedImpact = impact.queue_item_refs.some((ref) => ref.ref_id === queueItem.decision_work_queue_item_id)
      ? impact
      : await this.repository.updateRecheckImpact(impact.recheck_impact_id, {
        status: 'queued',
        queue_item_refs: [
          ...impact.queue_item_refs,
          this.ref('decision_work_queue_item', queueItem.decision_work_queue_item_id, queueItem.title_card_id ?? null),
        ],
        updated_at: now,
      });

    return { event, impact: linkedImpact, queue_item: queueItem };
  }

  private async requireAcceptedRisk(acceptedRiskId: string): Promise<TopicSelectionAcceptedRiskRecord> {
    const risk = await this.repository.findAcceptedRiskById(acceptedRiskId);
    if (!risk) {
      throw new AppError(404, 'NOT_FOUND', `AcceptedRisk ${acceptedRiskId} not found.`);
    }
    return risk;
  }

  private async requireUsableAcceptedRisk(
    acceptedRiskId: string,
    targetRef: TopicSelectionFunctionalRef,
    context: { workspace_id?: string | null; title_card_id?: string | null } = {},
  ): Promise<TopicSelectionAcceptedRiskRecord> {
    const risk = await this.requireAcceptedRisk(acceptedRiskId);
    this.assertAcceptedRiskUsableForTarget(risk, targetRef, context);
    return risk;
  }

  private async createOverrideAcceptedRisk(input: OverrideInput): Promise<TopicSelectionAcceptedRiskRecord> {
    if (!input.accepted_risk) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'HumanOverride requires an AcceptedRisk.');
    }
    if (!this.isSameFunctionalRef(input.accepted_risk.target_ref, input.target_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'HumanOverride AcceptedRisk target_ref must match override target_ref.');
    }
    if (input.accepted_risk.expires_at && input.accepted_risk.expires_at <= this.now()) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'HumanOverride cannot create an already-expired AcceptedRisk.');
    }
    const risk = await this.acceptRisk({
      ...input.accepted_risk,
      workspace_id: input.accepted_risk.workspace_id ?? input.workspace_id ?? null,
      title_card_id: input.accepted_risk.title_card_id ?? input.title_card_id ?? input.target_ref.title_card_id ?? null,
      source_type: 'human_override',
      source_ref: input.overridden_ref ?? input.target_ref,
      accepted_by: input.actor,
    });
    this.assertAcceptedRiskUsableForTarget(risk, input.target_ref, {
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
    });
    return risk;
  }

  private assertAcceptedRiskUsableForTarget(
    risk: TopicSelectionAcceptedRiskRecord,
    targetRef: TopicSelectionFunctionalRef,
    context: { workspace_id?: string | null; title_card_id?: string | null },
  ): void {
    assertTopicSelectionAcceptedRiskUsableForTarget(risk, targetRef, {
      ...context,
      now: this.now(),
    });
  }

  private gateReasonCodes(gate: TopicSelectionReadinessGateResultRecord): string[] {
    const issueCodes = [...gate.blockers, ...gate.warnings].map((issue) => issue.code);
    return issueCodes.length > 0 ? issueCodes : [gate.verdict];
  }

  private stageForWorkflow(workflowRun: TopicSelectionLlmWorkflowRunRecord): string {
    return workflowRun.workflow_key.startsWith('topic-selection.') ? 'v1a' : 'unknown';
  }

  private stageForRef(ref: TopicSelectionFunctionalRef): string {
    const refType = ref.ref_type;
    if (refType.includes('research_slice')) {
      return 'research_slice';
    }
    if (this.isSearchRefType(refType) || refType.includes('evidence')) {
      return 'evidence_or_search';
    }
    if (refType.includes('need') || refType.includes('validation')) {
      return 'validated_need';
    }
    if (refType.includes('topic_question')) {
      return 'topic_question';
    }
    if (refType.includes('value_assessment') || refType.includes('topic_value_assessment')) {
      return 'value_assessment';
    }
    if (refType.includes('topic_package') || refType === 'package') {
      return 'topic_package';
    }
    if (refType.includes('promotion')) {
      return 'promotion';
    }
    if (refType.includes('paper_project_bridge')) {
      return 'paper_project_bridge';
    }
    if (refType.includes('merge_candidate')) {
      return 'merge_candidate';
    }
    if (refType.includes('paper_project_intake')) {
      return 'paper_project_intake';
    }
    return 'unknown';
  }

  private isSearchRefType(refType: string): boolean {
    return refType === 'search'
      || refType.startsWith('search_')
      || refType.endsWith('_search')
      || refType.includes('_search_');
  }

  private ref(refType: string, refId: string, titleCardId?: string | null): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
    };
  }

  private fingerprint(input: {
    source_ref: TopicSelectionFunctionalRef;
    event_type: TopicSelectionRecheckEventType;
    reason_codes: string[];
    affected_scope_ref: TopicSelectionFunctionalRef;
    evidence_refs: TopicSelectionFunctionalRef[];
  }): string {
    return sha256Text(stableStringify({
      affected_scope_ref: this.refKey(input.affected_scope_ref),
      event_type: input.event_type,
      evidence_refs: input.evidence_refs.map((ref) => this.refKey(ref)).sort(),
      reason_codes: input.reason_codes.map((value) => value.toLowerCase()).sort(),
      source_ref: this.refKey(input.source_ref),
    }));
  }

  private impactDedupKey(
    event: TopicSelectionRecheckEventRecord,
    affectedRef: TopicSelectionFunctionalRef,
    impactLevel: TopicSelectionImpactLevel,
    requiredActions: string[],
  ): string {
    return sha256Text(stableStringify({
      affected_ref: this.refKey(affectedRef),
      event_id: event.recheck_event_id,
      impact_level: impactLevel,
      required_action_class: [...requiredActions].sort()[0] ?? 'none',
    }));
  }

  private queueDedupKey(
    queueItemType: TopicSelectionQueueItemType,
    targetRef: TopicSelectionFunctionalRef,
    sourceRef: TopicSelectionFunctionalRef,
    handlerKey: TopicSelectionQueueHandlerKey,
  ): string {
    return sha256Text(stableStringify({
      handler_key: handlerKey,
      queue_item_type: queueItemType,
      source_ref: this.refKey(sourceRef),
      target_ref: this.refKey(targetRef),
    }));
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
  }

  private isSameFunctionalRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (!left.title_card_id || !right.title_card_id || left.title_card_id === right.title_card_id);
  }

  private addMinutes(timestamp: string, minutes: number): string {
    return new Date(new Date(timestamp).getTime() + minutes * 60_000).toISOString();
  }

  private maxSeverity(left: TopicSelectionSeverity, right: TopicSelectionSeverity): TopicSelectionSeverity {
    const rank = new Map<TopicSelectionSeverity, number>([
      ['info', 0],
      ['warning', 1],
      ['blocking', 2],
      ['critical', 3],
    ]);
    return (rank.get(right) ?? 0) > (rank.get(left) ?? 0) ? right : left;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private uniqueRefs(values: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const value of values) {
      const key = this.refKey(value);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      refs.push(value);
    }
    return refs;
  }

  private isHumanActor(actor: TopicSelectionActorRef): boolean {
    return actor.actor_type === 'human' || actor.actor_type === 'hybrid';
  }

  private memoryTypeForSuggestion(
    suggestion: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): TopicSelectionDecisionMemoryType {
    switch (suggestion.suggestion_type) {
      case 'duplicate_candidate':
        return 'duplicate_candidate';
      case 'parked_candidate':
        return 'parked_candidate';
      case 'recheck_learning':
        return 'recheck_learning';
      case 'merge_note':
        return 'merge_note';
      case 'rejection_reason':
        return this.stringFromPayload(suggestion.suggestion_payload, 'memory_type') === 'already_solved'
          ? 'already_solved'
          : 'rejection_reason';
    }
  }

  private effectPolicyForSuggestion(
    suggestion: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): TopicSelectionDecisionMemoryEffectPolicy {
    const raw = this.stringFromPayload(suggestion.suggestion_payload, 'effect_policy');
    if (raw && MEMORY_EFFECT_POLICIES.includes(raw as TopicSelectionDecisionMemoryEffectPolicy)) {
      return raw as TopicSelectionDecisionMemoryEffectPolicy;
    }
    if (suggestion.suggestion_type === 'duplicate_candidate') {
      return 'suppress_duplicate';
    }
    return 'warn';
  }

  private severityFromPayload(payload: Record<string, unknown>): TopicSelectionSeverity {
    const raw = this.stringFromPayload(payload, 'severity');
    return raw && SEVERITIES.includes(raw as TopicSelectionSeverity)
      ? raw as TopicSelectionSeverity
      : 'warning';
  }

  private numberFromPayload(payload: Record<string, unknown>, key: string): number | null {
    const value = payload[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private stringFromPayload(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private recordPayload(payload: Record<string, unknown>, key: string): Record<string, unknown> {
    const value = payload[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private reasonCodesFromSuggestion(suggestion: TopicSelectionCandidateDecisionMemorySuggestionRecord): string[] {
    const reasonCodes = suggestion.suggestion_payload.reason_codes;
    if (Array.isArray(reasonCodes)) {
      return reasonCodes.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }
    return [suggestion.suggestion_type.toUpperCase()];
  }
}
