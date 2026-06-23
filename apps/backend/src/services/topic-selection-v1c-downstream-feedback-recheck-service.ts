import crypto from 'node:crypto';

import {
  TOPIC_SELECTION_ACTOR_TYPES,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionImpactLevel,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamFeedbackImpactSummary,
  TopicSelectionDownstreamLoopbackCause,
  TopicSelectionDownstreamLoopbackTarget,
  TopicSelectionDownstreamRecheckRequest,
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionDownstreamTopicFeedbackRecord,
  TopicSelectionLoopbackClassification,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import {
  TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS,
  TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES,
  computeDownstreamRecheckAdvisoryPriority,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1cDownstreamFeedbackRecheckRepository,
} from '../repositories/topic-selection-v1c-downstream-feedback-recheck.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  resolveTopicSelectionV1cDownstreamFeedbackPolicy,
} from './topic-selection-v1c-downstream-feedback-policy.js';

type IdFactory = (prefix: string) => string;

export type TopicSelectionPaperProjectBridgeHandoffProvider = {
  getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff>;
};

export type TopicSelectionDownstreamRecheckSink = {
  recordDownstreamFeedback(input: {
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
    /** T-127 W-08: optional deterministic advisory ranking score for the queue item (record-only). */
    priority?: number | null;
  }): Promise<{
    event: TopicSelectionRecheckEventRecord | null;
    impact: TopicSelectionRecheckImpactRecord | null;
    queue_item: TopicSelectionDecisionWorkQueueItemRecord | null;
  }>;
};

export type TopicSelectionV1cDownstreamFeedbackRecheckResult = {
  downstream_topic_feedback: TopicSelectionDownstreamTopicFeedbackRecord;
  classification: TopicSelectionLoopbackClassification;
  recheck_request: TopicSelectionDownstreamRecheckRequest | null;
  impact_summary: TopicSelectionDownstreamFeedbackImpactSummary;
};

export type TopicSelectionV1cDownstreamRecheckProjection = {
  downstream_topic_feedback: TopicSelectionDownstreamTopicFeedbackRecord;
  recheck_request: TopicSelectionDownstreamRecheckRequest;
};

export type TopicSelectionV1cDownstreamFeedbackRecheckServiceOptions = {
  repository: TopicSelectionV1cDownstreamFeedbackRecheckRepository;
  paperProjectBridgeService: TopicSelectionPaperProjectBridgeHandoffProvider;
  recheckRiskMemoryService: TopicSelectionDownstreamRecheckSink;
  idFactory?: IdFactory;
  now?: () => string;
};

const TOPIC_SELECTION_SEVERITIES: readonly TopicSelectionSeverity[] = [
  'info',
  'warning',
  'blocking',
  'critical',
];
const TOPIC_SELECTION_ACTOR_TYPE_SET: readonly TopicSelectionActorType[] = [
  ...TOPIC_SELECTION_ACTOR_TYPES,
];

export class TopicSelectionV1cDownstreamFeedbackRecheckService {
  private readonly repository: TopicSelectionV1cDownstreamFeedbackRecheckRepository;
  private readonly paperProjectBridgeService: TopicSelectionPaperProjectBridgeHandoffProvider;
  private readonly recheckRiskMemoryService: TopicSelectionDownstreamRecheckSink;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1cDownstreamFeedbackRecheckServiceOptions) {
    this.repository = options.repository;
    this.paperProjectBridgeService = options.paperProjectBridgeService;
    this.recheckRiskMemoryService = options.recheckRiskMemoryService;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordDownstreamTopicFeedback(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
  ): Promise<TopicSelectionV1cDownstreamFeedbackRecheckResult> {
    this.assertValidCreateInput(input);
    const bridgeHandoff = await this.paperProjectBridgeService.getPaperProjectBridgeHandoff(
      input.paper_project_bridge_id,
    );
    this.assertActiveBridgeHandoff(bridgeHandoff);
    this.assertWorkspace(input.workspace_id ?? null, bridgeHandoff);

    const now = this.now();
    const createdBy = input.created_by ?? 'system';
    const feedbackId = this.idFactory('downstream_topic_feedback');
    const feedbackRef = this.ref(
      'downstream_topic_feedback',
      feedbackId,
      bridgeHandoff.bridge.title_card_id,
      bridgeHandoff.bridge_payload_hash,
    );
    const bridgeRef = bridgeHandoff.paper_project_bridge_ref;
    const loopbackPolicy = resolveTopicSelectionV1cDownstreamFeedbackPolicy({
      feedback_signal: input.feedback_signal,
      bridge_handoff: bridgeHandoff,
    });
    const loopbackTarget = loopbackPolicy.loopback_target;
    const requiresRecheck = loopbackPolicy.requires_recheck;
    const affectedRef = loopbackPolicy.affected_ref;
    const requiredActions = this.resolveRequiredActions(input, requiresRecheck);
    const fingerprint = sha256Text(stableStringify({
      paper_project_bridge_id: bridgeHandoff.paper_project_bridge_id,
      downstream_source_kind: input.downstream_source_kind,
      downstream_source_ref: input.downstream_source_ref,
      feedback_signal: input.feedback_signal,
      affected_ref: affectedRef,
      summary: input.summary.trim(),
      required_actions: requiredActions,
    }));
    const existing = await this.repository.findFeedbackByFingerprint(fingerprint);
    if (existing) {
      return {
        downstream_topic_feedback: existing,
        classification: existing.classification,
        recheck_request: existing.recheck_request ?? null,
        impact_summary: existing.impact_summary,
      };
    }
    const sourceRefs = this.uniqueRefs([
      bridgeRef,
      input.downstream_source_ref,
      ...(input.source_feedback_refs ?? []),
      bridgeHandoff.source_promotion_decision_ref,
      bridgeHandoff.promotion_commitment_profile_ref,
      bridgeHandoff.promotion_input_snapshot_ref,
      ...bridgeHandoff.source_refs,
    ]);
    const classification: TopicSelectionLoopbackClassification = {
      loopback_target: loopbackTarget,
      loopback_cause: input.feedback_signal,
      severity: input.severity,
      requires_recheck: requiresRecheck,
      affected_ref: affectedRef,
      affected_stage: loopbackPolicy.affected_stage,
      source_refs: sourceRefs,
      rationale: this.classificationRationale(input.feedback_signal, loopbackTarget),
      required_actions: requiredActions,
    };
    const impactLevel = this.impactLevelFor(input.severity, requiresRecheck);
    // T-127 W-08: deterministic recheck advisory ranking (record-only) — computed ONLY when a recheck is
    // required; it ranks recheck candidates for a human operator to read, it never routes a loopback or
    // mutates forward state (T-108 forward-only preserved).
    const advisory = requiresRecheck
      ? computeDownstreamRecheckAdvisoryPriority(input.severity, impactLevel, input.feedback_signal)
      : null;
    let recheckRequest: TopicSelectionDownstreamRecheckRequest | null = null;
    let recheckEventRef: TopicSelectionFunctionalRef | null = null;
    let recheckImpactRef: TopicSelectionFunctionalRef | null = null;
    let queueItemRef: TopicSelectionFunctionalRef | null = null;

    if (requiresRecheck) {
      recheckRequest = {
        downstream_recheck_request_id: this.idFactory('downstream_recheck_request'),
        feedback_ref: feedbackRef,
        loopback_target: loopbackTarget,
        loopback_cause: input.feedback_signal,
        affected_ref: affectedRef,
        required_actions: requiredActions,
        reason_codes: [input.feedback_signal],
        source_refs: sourceRefs,
        created_at: now,
      };
      const recheck = await this.recheckRiskMemoryService.recordDownstreamFeedback({
        workspace_id: bridgeHandoff.bridge.workspace_id ?? null,
        title_card_id: bridgeHandoff.bridge.title_card_id,
        source_ref: feedbackRef,
        affected_ref: affectedRef,
        feedback_type: `${input.downstream_source_kind}:${input.feedback_signal}`,
        reason_codes: [input.feedback_signal],
        summary: input.summary.trim(),
        impact_level: impactLevel,
        severity: input.severity,
        required_actions: requiredActions,
        artifact_refs: input.artifact_refs ?? [],
        policy_version_id: input.policy_version_id ?? null,
        // W-08: thread the deterministic advisory score onto the queue item (replaces the prior binary
        // 100/85 default for W-08-emitted rechecks; absent -> the sink keeps the binary default).
        priority: advisory?.advisory_priority ?? null,
        payload: {
          downstream_source_kind: input.downstream_source_kind,
          downstream_source_ref: input.downstream_source_ref,
          paper_project_bridge_ref: bridgeRef,
          classification,
          feedback_payload: input.feedback_payload ?? {},
        },
      });
      recheckEventRef = recheck.event
        ? this.ref('recheck_event', recheck.event.recheck_event_id, recheck.event.title_card_id ?? null)
        : null;
      recheckImpactRef = recheck.impact
        ? this.ref('recheck_impact', recheck.impact.recheck_impact_id, recheck.impact.title_card_id ?? null)
        : null;
      queueItemRef = recheck.queue_item
        ? this.ref(
          'decision_work_queue_item',
          recheck.queue_item.decision_work_queue_item_id,
          recheck.queue_item.title_card_id ?? null,
        )
        : null;
    }

    const impactSummary: TopicSelectionDownstreamFeedbackImpactSummary = {
      impact_level: impactLevel,
      severity: input.severity,
      loopback_target: loopbackTarget,
      loopback_cause: input.feedback_signal,
      requires_recheck: requiresRecheck,
      affected_ref: affectedRef,
      recheck_event_ref: recheckEventRef,
      recheck_impact_ref: recheckImpactRef,
      decision_work_queue_item_ref: queueItemRef,
      summary: requiresRecheck
        ? `Downstream feedback requires ${loopbackTarget} recheck.`
        : 'Downstream feedback recorded with no upstream recheck required.',
      // W-08: the same deterministic score, mirrored here so the read projection ranks without re-deriving.
      advisory_priority: advisory?.advisory_priority ?? null,
      advisory_rank_reason: advisory?.advisory_rank_reason ?? null,
    };
    const record: TopicSelectionDownstreamTopicFeedbackRecord = {
      downstream_topic_feedback_id: feedbackId,
      feedback_fingerprint: fingerprint,
      workspace_id: bridgeHandoff.bridge.workspace_id ?? null,
      title_card_id: bridgeHandoff.bridge.title_card_id,
      paper_project_bridge_id: bridgeHandoff.paper_project_bridge_id,
      paper_project_bridge_ref: bridgeRef,
      source_promotion_decision_ref: bridgeHandoff.source_promotion_decision_ref,
      promotion_commitment_profile_ref: bridgeHandoff.promotion_commitment_profile_ref,
      promotion_input_snapshot_id: bridgeHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: bridgeHandoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: bridgeHandoff.promotion_input_snapshot_hash,
      topic_package_id: bridgeHandoff.topic_package_id,
      package_version: bridgeHandoff.package_version,
      downstream_source_kind: input.downstream_source_kind,
      downstream_source_ref: input.downstream_source_ref,
      source_feedback_refs: input.source_feedback_refs ?? [],
      observed_blocker_refs: input.observed_blocker_refs ?? [],
      feedback_signal: input.feedback_signal,
      severity: input.severity,
      summary: input.summary.trim(),
      required_action: input.required_action?.trim() || null,
      classification,
      recheck_request: recheckRequest,
      impact_summary: impactSummary,
      recheck_event_ref: recheckEventRef,
      recheck_impact_ref: recheckImpactRef,
      decision_work_queue_item_ref: queueItemRef,
      artifact_refs: input.artifact_refs ?? [],
      payload: {
        feedback_payload: input.feedback_payload ?? {},
        bridge_payload_hash: bridgeHandoff.bridge_payload_hash,
        working_copy_payload_hash: bridgeHandoff.working_copy_payload_hash,
      },
      policy_version_id: input.policy_version_id ?? null,
      created_by: createdBy,
      created_at: now,
    };
    const created = await this.repository.createFeedback(record);
    return {
      downstream_topic_feedback: created,
      classification,
      recheck_request: recheckRequest,
      impact_summary: impactSummary,
    };
  }

  async getDownstreamTopicFeedback(
    downstreamTopicFeedbackId: string,
  ): Promise<TopicSelectionDownstreamTopicFeedbackRecord> {
    const record = await this.repository.findFeedbackById(downstreamTopicFeedbackId);
    if (!record) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `DownstreamTopicFeedback ${downstreamTopicFeedbackId} not found.`,
      );
    }
    return record;
  }

  async listDownstreamTopicFeedbackByBridge(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionDownstreamTopicFeedbackRecord[]> {
    return this.repository.listFeedbackByBridgeId(paperProjectBridgeId);
  }

  /**
   * T-127 W-08: the scoped, RANKED, record-only recheck-advisory read projection. Returns the bridge's
   * feedback records that require a recheck, ordered by advisory_priority (desc) then created_at (asc) as a
   * stable tie-break. Pure read — no writes, no loopback routing, no forward-state mutation (T-108 preserved).
   * This is the v1c-scoped surface the global, unsorted risk-memory queue does not provide.
   */
  async listDownstreamRecheckAdvisoriesByBridge(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionDownstreamTopicFeedbackRecord[]> {
    const records = await this.listDownstreamTopicFeedbackByBridge(paperProjectBridgeId);
    return records
      .filter((record) => record.impact_summary.requires_recheck)
      .sort((left, right) => {
        const leftPriority = left.impact_summary.advisory_priority ?? 0;
        const rightPriority = right.impact_summary.advisory_priority ?? 0;
        if (rightPriority !== leftPriority) {
          return rightPriority - leftPriority; // higher advisory_priority first
        }
        if (left.created_at === right.created_at) {
          return 0;
        }
        return left.created_at < right.created_at ? -1 : 1; // stable tie-break: older first
      });
  }

  async getDownstreamRecheckRequestByFeedback(
    downstreamTopicFeedbackId: string,
  ): Promise<TopicSelectionV1cDownstreamRecheckProjection> {
    const record = await this.getDownstreamTopicFeedback(downstreamTopicFeedbackId);
    if (!record.recheck_request) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `DownstreamTopicFeedback ${downstreamTopicFeedbackId} has no downstream recheck request.`,
      );
    }
    return {
      downstream_topic_feedback: record,
      recheck_request: record.recheck_request,
    };
  }

  async getDownstreamRecheckRequest(
    downstreamRecheckRequestId: string,
  ): Promise<TopicSelectionV1cDownstreamRecheckProjection> {
    const record = await this.repository.findFeedbackByRecheckRequestId(downstreamRecheckRequestId);
    if (!record?.recheck_request) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `DownstreamRecheckRequest ${downstreamRecheckRequestId} not found.`,
      );
    }
    return {
      downstream_topic_feedback: record,
      recheck_request: record.recheck_request,
    };
  }

  private assertValidCreateInput(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
  ): void {
    if (!this.hasText(input.paper_project_bridge_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Downstream feedback requires paper_project_bridge_id.');
    }
    if (input.workspace_id !== undefined && input.workspace_id !== null && !this.hasText(input.workspace_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'workspace_id must be non-empty when provided.');
    }
    if (!TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS.includes(input.downstream_source_kind)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported downstream source kind: ${input.downstream_source_kind}.`);
    }
    if (!TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES.includes(input.feedback_signal)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported downstream feedback signal: ${input.feedback_signal}.`);
    }
    if (!TOPIC_SELECTION_SEVERITIES.includes(input.severity)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported downstream feedback severity: ${input.severity}.`);
    }
    if (input.created_by !== undefined && !TOPIC_SELECTION_ACTOR_TYPE_SET.includes(input.created_by)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported downstream feedback actor: ${input.created_by}.`);
    }
    if (!this.hasText(input.summary)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Downstream feedback requires a summary.');
    }
    this.assertRef(input.downstream_source_ref, 'downstream_source_ref');
    for (const sourceRef of input.source_feedback_refs ?? []) {
      this.assertRef(sourceRef, 'source_feedback_refs');
    }
    for (const blockerRef of input.observed_blocker_refs ?? []) {
      this.assertRef(blockerRef, 'observed_blocker_refs');
    }
    for (const artifactRef of input.artifact_refs ?? []) {
      this.assertRef(artifactRef, 'artifact_refs');
    }
  }

  private assertActiveBridgeHandoff(
    bridgeHandoff: TopicSelectionPaperProjectBridgeHandoff,
  ): void {
    if (
      bridgeHandoff.bridge_status !== 'active'
      || bridgeHandoff.bridge.bridge_status !== 'active'
      || bridgeHandoff.paper_project_bridge_id !== bridgeHandoff.bridge.paper_project_bridge_id
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${bridgeHandoff.paper_project_bridge_id} is not an active downstream feedback source.`,
      );
    }
  }

  private assertWorkspace(
    requestedWorkspaceId: string | null,
    bridgeHandoff: TopicSelectionPaperProjectBridgeHandoff,
  ): void {
    const bridgeWorkspaceId = bridgeHandoff.bridge.workspace_id ?? null;
    if (requestedWorkspaceId && requestedWorkspaceId !== bridgeWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge workspace mismatch: requested ${requestedWorkspaceId}, bridge ${bridgeWorkspaceId}.`,
      );
    }
    if (requestedWorkspaceId && !bridgeWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge workspace mismatch: requested ${requestedWorkspaceId}, bridge has no workspace_id.`,
      );
    }
  }

  private resolveRequiredActions(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
    requiresRecheck: boolean,
  ): string[] {
    const requiredAction = input.required_action?.trim() ?? '';
    if (requiresRecheck && !requiredAction) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Downstream feedback ${input.feedback_signal} requires a non-empty required_action.`,
      );
    }
    return requiredAction ? [requiredAction] : [];
  }

  private classificationRationale(
    cause: TopicSelectionDownstreamLoopbackCause,
    target: TopicSelectionDownstreamLoopbackTarget,
  ): string {
    return cause === 'no_recheck_needed'
      ? 'Feedback is recorded for replay and lineage without opening an upstream recheck.'
      : `Feedback signal ${cause} deterministically routes to ${target}.`;
  }

  private impactLevelFor(
    severity: TopicSelectionSeverity,
    requiresRecheck: boolean,
  ): TopicSelectionImpactLevel {
    if (!requiresRecheck) {
      return 'no_impact';
    }
    if (severity === 'critical') {
      return 'invalidated';
    }
    if (severity === 'warning') {
      return 'stale';
    }
    return 'recheck_required';
  }

  private assertRef(ref: TopicSelectionFunctionalRef | undefined, label: string): void {
    if (!ref || !this.hasText(ref.ref_type) || !this.hasText(ref.ref_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${label} must be a valid functional ref.`);
    }
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref || !this.hasText(ref.ref_type) || !this.hasText(ref.ref_id)) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ref);
      }
    }
    return result;
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

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
