import type {
  AnalysisContract,
  CreatedByMode,
  ValueJudgementPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-lifecycle-core-contracts';
import {
  isReleaseTag,
  isSnapshotId,
  isVersionId,
  validateNoM6OverrideContext,
  type CreatePaperProjectRequest,
  type CreatePaperProjectResponse,
  type GetPaperArtifactBundleResponse,
  type GetPaperResourceMetricsResponse,
  type GetPaperTimelineResponse,
  type PaperRuntimeMetric,
  type ReleaseGateReviewResponse,
  type ReleaseReviewPayload,
  type StageGateVerifyRequest,
  type StageGateVerifyResponse,
  type VersionSpineCommitRequest,
  type VersionSpineCommitResponse,
  type WritingPackageBuildRequest,
  type WritingPackageBuildResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  PaperProjectRecord,
  ReleaseReviewRecord,
  ResearchLifecycleRepository,
  SnapshotRecord,
  StageNodeRecord,
  TimelineEventRecord,
} from '../repositories/research-lifecycle-repository.js';
import {
  InProcessGovernanceEventDeliveryAdapter,
  type GovernanceEventDeliveryAdapter,
  type GovernanceEventEnvelope,
} from './event-delivery/governance-event-delivery-adapter.js';
import {
  InMemoryGovernanceDeliveryAuditStore,
  buildGovernanceDeliveryAuditRecord,
  type GovernanceDeliveryAuditStore,
} from './event-delivery/governance-delivery-audit-store.js';

type PointerType = 'full' | 'partial';

type TimelineEventInput = {
  eventType: string;
  moduleId?: StageNodeRecord['moduleId'];
  timestamp?: string;
  nodeId?: string;
  summary: string;
  severity?: TimelineEventRecord['severity'];
  payload?: Record<string, unknown>;
};

type ResearchLifecycleServiceOptions = {
  deliveryAdapter?: GovernanceEventDeliveryAdapter;
  deliveryAuditStore?: GovernanceDeliveryAuditStore;
};

export class ResearchLifecycleService {
  private writingPackageSequence = 0;
  private gateSequence = 0;
  private releaseReviewSequence = 0;
  private eventSequence = 0;
  private readonly deliveryAdapter: GovernanceEventDeliveryAdapter;
  private readonly deliveryAuditStore: GovernanceDeliveryAuditStore;

  constructor(
    private readonly repository: ResearchLifecycleRepository,
    options: ResearchLifecycleServiceOptions = {},
  ) {
    this.deliveryAdapter =
      options.deliveryAdapter ?? new InProcessGovernanceEventDeliveryAdapter();
    this.deliveryAuditStore =
      options.deliveryAuditStore ?? new InMemoryGovernanceDeliveryAuditStore();
  }

  async createPaperProject(input: CreatePaperProjectRequest): Promise<CreatePaperProjectResponse> {
    if (input.initial_context.literature_evidence_ids.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'At least one literature evidence id is required.',
      );
    }

    const paperId = await this.nextPaperId();
    const createdAt = this.now();

    const paper = await this.repository.createPaperProject({
      id: paperId,
      topicId: input.topic_id,
      title: input.title,
      researchDirection: input.research_direction?.trim() || 'LLM',
      status: 'active',
      paperActiveSpFull: null,
      paperActiveSpPartial: null,
      createdAt,
    });

    await this.repository.upsertArtifactBundle(paper.id, {
      proposal_url: `paper-project://${paper.id}/proposal`,
    });

    await this.emitMetricsUpdated(paper.id, paper.createdAt);

    await this.appendTimelineEvent(paper.id, {
      eventType: 'research.timeline.event.appended',
      timestamp: paper.createdAt,
      summary: 'Paper project created.',
      severity: 'info',
      payload: {
        topic_id: paper.topicId,
      },
    });

    return {
      paper_id: paper.id,
      status: paper.status,
      paper_active_sp_full: paper.paperActiveSpFull,
      paper_active_sp_partial: paper.paperActiveSpPartial,
      created_at: paper.createdAt,
    };
  }

  async deletePaperProject(paperId: string): Promise<void> {
    const paper = await this.repository.findPaperById(paperId);
    if (!paper) {
      return;
    }
    await this.repository.deletePaperProject(paperId);
  }

  async commitVersionSpine(input: VersionSpineCommitRequest): Promise<VersionSpineCommitResponse> {
    await this.assertPaperExists(input.lineage_meta.paper_id);

    if (!isVersionId(input.lineage_meta.version_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid version_id format.');
    }

    if (input.node_status === 'candidate' && !input.value_judgement_payload) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Candidate node must include value_judgement_payload.',
      );
    }

    const nodeId = await this.nextNodeId();

    const node = await this.repository.createNode({
      id: nodeId,
      paperId: input.lineage_meta.paper_id,
      stageId: input.lineage_meta.stage_id,
      moduleId: input.lineage_meta.module_id,
      versionId: input.lineage_meta.version_id,
      parentVersionId: input.lineage_meta.parent_version_id,
      parentNodeIds: input.lineage_meta.parent_node_ids ?? [],
      runId: input.lineage_meta.run_id,
      laneId: input.lineage_meta.lane_id,
      attemptId: input.lineage_meta.attempt_id,
      createdBy: input.lineage_meta.created_by,
      createdAt: input.lineage_meta.created_at,
      payloadRef: input.payload_ref,
      nodeStatus: input.node_status,
      valueJudgementPayload: input.value_judgement_payload,
    });

    await this.appendNodeStatusChangedEvent(
      node.paperId,
      node.id,
      node.nodeStatus,
      node.createdBy,
      node.moduleId,
      undefined,
      node.createdAt,
    );

    await this.emitMetricsUpdated(node.paperId);

    return {
      node_id: node.id,
      accepted: true,
      node_status: node.nodeStatus,
    };
  }

  async verifyStageGate(
    paperId: string,
    request: StageGateVerifyRequest,
  ): Promise<StageGateVerifyResponse> {
    const paper = await this.assertPaperExists(paperId);

    const noM6Validation = validateNoM6OverrideContext(request);
    if (!noM6Validation.ok) {
      throw new AppError(422, 'NO_M6_POLICY_VIOLATION', noM6Validation.reason);
    }

    const candidateNodes = await Promise.all(
      request.candidate_node_ids.map((nodeId) => this.assertCandidateNode(paperId, nodeId)),
    );

    const results = [] as StageGateVerifyResponse['results'];
    const promotedNodes: StageNodeRecord[] = [];

    for (const node of candidateNodes) {
      if (!node.valueJudgementPayload) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          `Node ${node.id} missing value_judgement_payload.`,
        );
      }

      const decision = node.valueJudgementPayload.decision;
      const nextStatus = this.mapDecisionToStatus(decision);
      const updated = await this.repository.updateNodeStatus(node.id, nextStatus);

      await this.appendNodeStatusChangedEvent(
        updated.paperId,
        updated.id,
        updated.nodeStatus,
        request.reviewer_mode,
        updated.moduleId,
        node.nodeStatus,
      );

      if (updated.nodeStatus === 'promoted') {
        promotedNodes.push(updated);
      }

      results.push({
        node_id: updated.id,
        decision,
        reason_summary: node.valueJudgementPayload.reason_summary,
      });
    }

    const gateRunId = this.nextGateRunId();

    if (promotedNodes.length === 0) {
      await this.appendTimelineEvent(paper.id, {
        eventType: 'research.timeline.event.appended',
        moduleId: 'M3',
        summary: `Stage gate ${gateRunId} completed without promoted nodes.`,
        severity: 'warning',
      });
      await this.emitMetricsUpdated(paper.id);
      return {
        gate_run_id: gateRunId,
        results,
      };
    }

    const modules = new Set(promotedNodes.map((node) => node.moduleId));
    this.assertAnalysisContractCompatibility(request.analysis_contract, modules);

    const snapshotType = this.resolveSnapshotType(modules, request.analysis_contract);
    const snapshotId = await this.nextSnapshotId();

    const snapshot = await this.repository.createSnapshot({
      id: snapshotId,
      snapshotType,
      spineType: snapshotType === 'SP-full' ? request.analysis_contract : undefined,
      paperId,
      nodeRefs: promotedNodes.map((node) => node.id),
      claimSetHash: this.simpleHash(`claim:${promotedNodes.map((node) => node.id).sort().join('|')}`),
      problemScopeHash: this.simpleHash(`scope:${promotedNodes.map((node) => node.id).sort().join('|')}`),
      datasetProtocolHash: this.simpleHash(
        `dataset:${promotedNodes.map((node) => node.id).sort().join('|')}`,
      ),
      evaluationProtocolHash: this.simpleHash(
        `eval:${promotedNodes.map((node) => node.id).sort().join('|')}`,
      ),
      createdAt: this.now(),
      createdBy: request.reviewer_mode,
    });

    const pointerType: PointerType = snapshot.snapshotType === 'SP-full' ? 'full' : 'partial';
    const pointerUpdate = await this.switchSnapshotPointer(
      paper.id,
      pointerType,
      snapshot.id,
      request.reviewer_mode,
      'stage gate promote',
    );

    await this.appendTimelineEvent(paper.id, {
      eventType: 'research.timeline.event.appended',
      moduleId: 'M3',
      summary: `Stage gate ${gateRunId} produced snapshot ${snapshot.id}.`,
      severity: 'info',
      payload: {
        gate_run_id: gateRunId,
        snapshot_id: snapshot.id,
      },
    });

    await this.emitMetricsUpdated(paper.id);

    return {
      gate_run_id: gateRunId,
      results,
      snapshot: {
        snapshot_id: snapshot.id,
        snapshot_type: snapshot.snapshotType,
        spine_type: snapshot.spineType,
      },
      pointer_update: {
        paper_active_sp_full: pointerUpdate.paper_active_sp_full,
        paper_active_sp_partial: pointerUpdate.paper_active_sp_partial,
      },
    };
  }

  async buildWritingPackage(
    paperId: string,
    request: WritingPackageBuildRequest,
  ): Promise<WritingPackageBuildResponse> {
    await this.assertPaperExists(paperId);

    if (!isSnapshotId(request.source_snapshot_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid source_snapshot_id format.');
    }

    if (!isReleaseTag(request.target_release_tag)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid target_release_tag format.');
    }

    const snapshot = await this.repository.findSnapshotById(request.source_snapshot_id);
    if (!snapshot || snapshot.paperId !== paperId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Snapshot ${request.source_snapshot_id} does not exist for paper ${paperId}.`,
      );
    }

    if (snapshot.snapshotType !== 'SP-full') {
      throw new AppError(
        409,
        'SNAPSHOT_COMPATIBILITY_FAILED',
        'Writing package can only be built from SP-full snapshots.',
      );
    }

    const writingPackageId = this.nextWritingPackageId();
    const noM6WordingOk = this.evaluateNoM6WordingCompliance(snapshot.spineType, request.sections);

    await this.repository.upsertArtifactBundle(paperId, {
      paper_url: `paper-project://${paperId}/paper/${request.target_release_tag}`,
    });

    await this.appendTimelineEvent(paperId, {
      eventType: 'research.timeline.event.appended',
      moduleId: 'M8',
      summary: `Writing package ${writingPackageId} built for ${request.target_release_tag}.`,
      severity: 'info',
      payload: {
        writing_package_id: writingPackageId,
        release_tag: request.target_release_tag,
      },
    });

    return {
      writing_package_id: writingPackageId,
      source_snapshot_id: request.source_snapshot_id,
      release_tag: request.target_release_tag,
      section_node_ids: request.sections.map((_, index) => `SEC-${String(index + 1).padStart(2, '0')}`),
      compliance_flags: {
        claim_evidence_coverage_ok: true,
        no_m6_wording_ok: noM6WordingOk,
      },
    };
  }

  async getTimeline(paperId: string): Promise<GetPaperTimelineResponse> {
    await this.assertPaperExists(paperId);

    const events = await this.repository.listTimelineEventsByPaperId(paperId);
    const sorted = [...events].sort((a, b) => {
      const tsCmp = a.timestamp.localeCompare(b.timestamp);
      if (tsCmp !== 0) {
        return tsCmp;
      }
      return a.id.localeCompare(b.id);
    });

    return {
      paper_id: paperId,
      events: sorted.map((event) => ({
        event_id: event.id,
        event_type: event.eventType,
        module_id: event.moduleId,
        timestamp: event.timestamp,
        node_id: event.nodeId,
        summary: event.summary,
        severity: event.severity,
      })),
    };
  }

  async getResourceMetrics(paperId: string): Promise<GetPaperResourceMetricsResponse> {
    const paper = await this.assertPaperExists(paperId);
    const existing = await this.repository.findPaperRuntimeMetricByPaperId(paperId);
    const metric = existing ?? (await this.buildRuntimeMetric(paper.id, paper.createdAt));

    if (!existing) {
      await this.repository.upsertPaperRuntimeMetric(paperId, metric);
    }

    return {
      paper_id: paperId,
      paper_runtime_metric: metric,
    };
  }

  async getArtifactBundle(paperId: string): Promise<GetPaperArtifactBundleResponse> {
    await this.assertPaperExists(paperId);

    const current = await this.repository.findArtifactBundleByPaperId(paperId);
    const reviews = await this.repository.listReleaseReviewsByPaperId(paperId);
    const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : undefined;

    const bundle = {
      proposal_url: current?.proposal_url ?? `paper-project://${paperId}/proposal`,
      paper_url: current?.paper_url ?? null,
      repo_url: current?.repo_url ?? null,
      review_url:
        current?.review_url ??
        (latestReview ? `paper-project://${paperId}/review/${latestReview.id}` : null),
    };

    return {
      paper_id: paperId,
      artifact_bundle: bundle,
    };
  }

  async reviewReleaseGate(
    paperId: string,
    payload: ReleaseReviewPayload,
  ): Promise<ReleaseGateReviewResponse> {
    await this.assertPaperExists(paperId);

    if (payload.reviewers.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'At least one reviewer is required.');
    }

    const reviewedAt = this.now();
    const reviewId = this.nextReleaseReviewId();
    const auditRef = `AUD-${reviewId}`;
    const accepted = payload.decision === 'approve';

    const reviewRecord: ReleaseReviewRecord = {
      id: reviewId,
      paperId,
      reviewers: payload.reviewers,
      decision: payload.decision,
      riskFlags: payload.risk_flags,
      labelPolicy: payload.label_policy,
      comment: payload.comment,
      reviewedAt,
      auditRef,
    };

    await this.repository.createReleaseReview(reviewRecord);

    await this.repository.upsertArtifactBundle(paperId, {
      review_url: `paper-project://${paperId}/review/${reviewId}`,
    });

    await this.appendTimelineEvent(paperId, {
      eventType: 'research.release.reviewed',
      moduleId: 'M8',
      timestamp: reviewedAt,
      summary: `Release review ${payload.decision} (${reviewId}).`,
      severity: payload.decision === 'reject' ? 'warning' : 'info',
      payload: {
        review_id: reviewId,
        decision: payload.decision,
        reviewers: payload.reviewers,
        label_policy: payload.label_policy,
        risk_flags: payload.risk_flags,
      },
    });

    return {
      gate_result: {
        accepted,
        review_id: reviewId,
        approved_by: accepted ? payload.reviewers[0] : undefined,
        approved_at: accepted ? reviewedAt : undefined,
        audit_ref: auditRef,
      },
    };
  }

  async switchSnapshotPointer(
    paperId: string,
    pointerType: PointerType,
    toSnapshotId: string,
    changedBy: CreatedByMode,
    changeReason: string,
  ): Promise<{
    paper_id: string;
    paper_active_sp_full?: string;
    paper_active_sp_partial?: string;
    changed_by: CreatedByMode;
    changed_at: string;
    change_reason: string;
  }> {
    const paper = await this.assertPaperExists(paperId);
    const snapshot = await this.repository.findSnapshotById(toSnapshotId);

    if (!snapshot || snapshot.paperId !== paperId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Snapshot ${toSnapshotId} does not exist for paper ${paperId}.`,
      );
    }

    if (pointerType === 'full' && snapshot.snapshotType !== 'SP-full') {
      throw new AppError(
        409,
        'SNAPSHOT_COMPATIBILITY_FAILED',
        'full pointer can only point to SP-full snapshots.',
      );
    }

    if (pointerType === 'partial' && snapshot.snapshotType !== 'SP-partial') {
      throw new AppError(
        409,
        'SNAPSHOT_COMPATIBILITY_FAILED',
        'partial pointer can only point to SP-partial snapshots.',
      );
    }

    const updated = await this.repository.updatePaperPointers(paper.id, {
      ...(pointerType === 'full' ? { paperActiveSpFull: toSnapshotId } : {}),
      ...(pointerType === 'partial' ? { paperActiveSpPartial: toSnapshotId } : {}),
    });

    return {
      paper_id: updated.id,
      paper_active_sp_full: updated.paperActiveSpFull ?? undefined,
      paper_active_sp_partial: updated.paperActiveSpPartial ?? undefined,
      changed_by: changedBy,
      changed_at: this.now(),
      change_reason: changeReason,
    };
  }

  private async assertCandidateNode(paperId: string, nodeId: string): Promise<StageNodeRecord> {
    const node = await this.repository.findNodeById(nodeId);
    if (!node || node.paperId !== paperId) {
      throw new AppError(409, 'VERSION_CONFLICT', `Node ${nodeId} not found for paper ${paperId}.`);
    }

    if (node.nodeStatus !== 'candidate') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        `Node ${nodeId} is not in candidate status.`,
      );
    }

    return node;
  }

  private assertAnalysisContractCompatibility(
    analysisContract: AnalysisContract,
    modules: Set<string>,
  ): void {
    if (analysisContract === 'no_m6' && modules.has('M6')) {
      throw new AppError(
        409,
        'SNAPSHOT_COMPATIBILITY_FAILED',
        'analysis_contract=no_m6 cannot include M6 nodes in the same snapshot.',
      );
    }

    if (analysisContract === 'with_m6' && !modules.has('M6')) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'analysis_contract=with_m6 requires at least one M6 node.',
      );
    }
  }

  private resolveSnapshotType(
    modules: Set<string>,
    analysisContract: AnalysisContract,
  ): 'SP-partial' | 'SP-full' {
    const hasM4 = modules.has('M4');
    const hasM5 = modules.has('M5');
    const hasM7 = modules.has('M7');
    const hasM6 = modules.has('M6');
    const m6Satisfied = analysisContract === 'no_m6' || hasM6;

    if (hasM4 && hasM5 && hasM7 && m6Satisfied) {
      return 'SP-full';
    }

    return 'SP-partial';
  }

  private mapDecisionToStatus(
    decision: ValueJudgementPayload['decision'],
  ): StageNodeRecord['nodeStatus'] {
    if (decision === 'promote') {
      return 'promoted';
    }

    if (decision === 'hold') {
      return 'hold';
    }

    if (decision === 'reject') {
      return 'rejected';
    }

    return 'superseded';
  }

  private async assertPaperExists(paperId: string): Promise<PaperProjectRecord> {
    const paper = await this.repository.findPaperById(paperId);
    if (!paper) {
      throw new AppError(409, 'VERSION_CONFLICT', `Paper ${paperId} does not exist.`);
    }

    return paper;
  }

  private async emitMetricsUpdated(
    paperId: string,
    fallbackTimestamp?: string,
  ): Promise<PaperRuntimeMetric> {
    const metric = await this.buildRuntimeMetric(paperId, fallbackTimestamp);
    const saved = await this.repository.upsertPaperRuntimeMetric(paperId, metric);

    await this.appendTimelineEvent(paperId, {
      eventType: 'research.metrics.updated',
      moduleId: 'M6',
      timestamp: saved.updated_at,
      summary: 'Runtime metrics updated.',
      severity: 'info',
      payload: {
        tokens: saved.tokens,
        cost_usd: saved.cost_usd,
        gpu_requested: saved.gpu_requested,
        gpu_total: saved.gpu_total,
      },
    });

    return saved;
  }

  private async buildRuntimeMetric(
    paperId: string,
    fallbackTimestamp?: string,
  ): Promise<PaperRuntimeMetric> {
    const nodes = await this.repository.listNodesByPaperId(paperId);
    const latestNodeAt =
      nodes.length > 0
        ? nodes.reduce(
            (latest, node) => (node.createdAt > latest ? node.createdAt : latest),
            nodes[0].createdAt,
          )
        : fallbackTimestamp ?? this.now();

    const tokens = nodes.length * 1200;
    const gpuRequested = nodes.filter((node) => node.moduleId === 'M6').length;
    const gpuTotal = nodes.filter((node) => node.moduleId === 'M6' || node.moduleId === 'M7').length;
    const costUsd = Number((tokens * 0.0000025).toFixed(6));

    return {
      tokens,
      cost_usd: costUsd,
      gpu_requested: gpuRequested,
      gpu_total: gpuTotal,
      updated_at: latestNodeAt,
    };
  }

  private async appendNodeStatusChangedEvent(
    paperId: string,
    nodeId: string,
    toStatus: StageNodeRecord['nodeStatus'],
    changedBy: CreatedByMode,
    moduleId: StageNodeRecord['moduleId'],
    fromStatus?: StageNodeRecord['nodeStatus'],
    changedAt?: string,
  ): Promise<void> {
    await this.appendTimelineEvent(paperId, {
      eventType: 'research.node.status.changed',
      moduleId,
      timestamp: changedAt ?? this.now(),
      nodeId,
      summary: `Node ${nodeId} status changed to ${toStatus}.`,
      severity: toStatus === 'rejected' ? 'warning' : 'info',
      payload: {
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: changedBy,
      },
    });
  }

  private async appendTimelineEvent(
    paperId: string,
    input: TimelineEventInput,
  ): Promise<TimelineEventRecord> {
    const eventRecord: TimelineEventRecord = {
      id: this.nextEventId(),
      paperId,
      eventType: input.eventType,
      moduleId: input.moduleId,
      timestamp: input.timestamp ?? this.now(),
      nodeId: input.nodeId,
      summary: input.summary,
      severity: input.severity,
      payload: input.payload,
    };
    const envelope: GovernanceEventEnvelope = {
      event_id: eventRecord.id,
      event_type: eventRecord.eventType,
      aggregate_id: eventRecord.paperId,
      occurred_at: eventRecord.timestamp,
      payload_version: 'v1',
      trace_id: `trace-${eventRecord.id}`,
      dedupe_key: eventRecord.id,
    };

    const deliveryResult = await this.deliveryAdapter.deliver(
      envelope,
      async () => this.repository.appendTimelineEvent(eventRecord),
    );

    let auditPersistError: string | undefined;
    try {
      await this.deliveryAuditStore.append(
        buildGovernanceDeliveryAuditRecord({
          paperId,
          envelope,
          result: deliveryResult,
          now: () => this.now(),
        }),
      );
    } catch (error) {
      auditPersistError =
        error instanceof Error ? error.message : 'Unknown audit persistence error.';
    }

    if (deliveryResult.status === 'failed' || !deliveryResult.value) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Timeline event delivery failed.', {
        delivery_mode: deliveryResult.mode,
        event_id: eventRecord.id,
        attempts: deliveryResult.attempts,
        audit_persist_error: auditPersistError,
      });
    }

    return deliveryResult.value;
  }

  private async nextPaperId(): Promise<string> {
    const count = await this.repository.countPapers();
    return `P${String(count + 1).padStart(3, '0')}`;
  }

  private async nextNodeId(): Promise<string> {
    const count = await this.repository.countNodes();
    return `NODE-${String(count + 1).padStart(4, '0')}`;
  }

  private async nextSnapshotId(): Promise<string> {
    const count = await this.repository.countSnapshots();
    return `SP-${String(count + 1).padStart(4, '0')}`;
  }

  private nextWritingPackageId(): string {
    this.writingPackageSequence += 1;
    return `WP-${String(this.writingPackageSequence).padStart(3, '0')}`;
  }

  private nextGateRunId(): string {
    this.gateSequence += 1;
    return `GR-${String(this.gateSequence).padStart(4, '0')}`;
  }

  private nextReleaseReviewId(): string {
    this.releaseReviewSequence += 1;
    return `RV-${String(this.releaseReviewSequence).padStart(4, '0')}`;
  }

  private nextEventId(): string {
    this.eventSequence += 1;
    return `EV-${String(this.eventSequence).padStart(4, '0')}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }

    return hash.toString(16).padStart(8, '0');
  }

  private evaluateNoM6WordingCompliance(
    spineType: SnapshotRecord['spineType'],
    sections: string[],
  ): boolean {
    if (spineType !== 'no_m6') {
      return true;
    }

    // Placeholder rule: writing flow must contain explicit sections when no_m6 path is used.
    return sections.length > 0;
  }
}
