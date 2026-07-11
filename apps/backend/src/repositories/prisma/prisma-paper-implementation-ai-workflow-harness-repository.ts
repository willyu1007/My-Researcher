import type {
  PaperImplementationAgentWorkflowHarnessRun as AgentWorkflowHarnessRunRow,
  PaperImplementationDecisionWorkQueueItem as DecisionWorkQueueItemRow,
  PaperImplementationGateResult as GateResultRow,
  PaperImplementationInputSnapshot as InputSnapshotRow,
  PaperImplementationProposalArtifact as ProposalArtifactRow,
  PaperImplementationQualitySignal as QualitySignalRow,
  PaperImplementationHarness as HarnessRow,
  PaperImplementationTransitionAttempt as TransitionAttemptRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  AgentWorkflowHarnessRun,
  CreateAgentWorkflowHarnessRunResponse,
  DecisionWorkQueueItem,
  ImplementationGateCheck,
  ImplementationGateResult,
  ImplementationHarness,
  ImplementationHarnessAuditRefs,
  ImplementationHarnessInvariants,
  ImplementationHarnessPolicyPack,
  ImplementationHarnessRuntimeBindings,
  ImplementationInputEvidenceRules,
  ImplementationInputExcludedContext,
  ImplementationInputFreshnessConstraints,
  ImplementationInputIncludedContext,
  ImplementationInputSnapshot,
  ImplementationProposalArtifact,
  ImplementationQualitySignal,
  ImplementationTransitionAttempt,
  ResolveDecisionWorkQueueItemRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import {
  PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
  PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS,
  type AgentWorkflowHarnessRunPersistence,
  type PaperImplementationAiWorkflowHarnessRepository,
} from '../paper-implementation-ai-workflow-harness.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asFunctionalRef(value: unknown): TopicSelectionFunctionalRef {
  return asRecord(value) as unknown as TopicSelectionFunctionalRef;
}

function asNullableFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
  return value === null || value === undefined
    ? null
    : asFunctionalRef(value);
}

function refType(ref: TopicSelectionFunctionalRef): string {
  return ref.ref_type;
}

function refId(ref: TopicSelectionFunctionalRef): string {
  return ref.ref_id;
}

function refVersion(ref: TopicSelectionFunctionalRef): string | null {
  return ref.version_id ?? null;
}

function functionalRefKey(ref: TopicSelectionFunctionalRef): string {
  return [ref.ref_type, ref.ref_id, ref.version_id ?? ''].join(':');
}

function toHarness(row: HarnessRow): ImplementationHarness {
  return {
    harness_id: row.id,
    implementation_project_id: row.implementationProjectId,
    harness_status: row.harnessStatus as ImplementationHarness['harness_status'],
    policy_pack: asRecord(row.policyPack) as unknown as ImplementationHarnessPolicyPack,
    runtime_bindings: asRecord(row.runtimeBindings) as unknown as ImplementationHarnessRuntimeBindings,
    invariants: asRecord(row.invariants) as unknown as ImplementationHarnessInvariants,
    audit: asRecord(row.auditRefs) as unknown as ImplementationHarnessAuditRefs,
    created_by: row.createdBy as ImplementationHarness['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toInputSnapshot(row: InputSnapshotRow): ImplementationInputSnapshot {
  return {
    input_snapshot_id: row.id,
    implementation_project_id: row.implementationProjectId,
    target_ref: asFunctionalRef(row.targetRef),
    workflow_type: row.workflowType as ImplementationInputSnapshot['workflow_type'],
    context_policy_version_id: row.contextPolicyVersionId,
    included_context: asRecord(row.includedContext) as unknown as ImplementationInputIncludedContext,
    excluded_context: asRecord(row.excludedContext) as unknown as ImplementationInputExcludedContext,
    freshness_constraints: {
      exclude_stale_evidence: row.excludeStaleEvidence,
      exclude_invalidated_refs: row.excludeInvalidatedRefs,
    } satisfies ImplementationInputFreshnessConstraints,
    evidence_rules: {
      memo_as_evidence_forbidden: row.memoAsEvidenceForbidden,
      citation_requires_source_locator: row.citationRequiresLocator,
    } satisfies ImplementationInputEvidenceRules,
    source_hashes: row.sourceHashes,
    snapshot_hash: row.snapshotHash,
    freshness_status: row.freshnessStatus as ImplementationInputSnapshot['freshness_status'],
    created_by: row.createdBy as ImplementationInputSnapshot['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toAgentWorkflowHarnessRun(row: AgentWorkflowHarnessRunRow): AgentWorkflowHarnessRun {
  return {
    harness_run_id: row.id,
    implementation_project_id: row.implementationProjectId,
    harness_id: row.harnessId,
    input_snapshot_id: row.inputSnapshotId,
    workflow_type: row.workflowType as AgentWorkflowHarnessRun['workflow_type'],
    workflow_version: row.workflowVersion,
    run_mode: row.runMode as AgentWorkflowHarnessRun['run_mode'],
    execution_mode: row.executionMode as AgentWorkflowHarnessRun['execution_mode'],
    model_profile_id: row.modelProfileId,
    prompt_template_version_id: row.promptTemplateVersionId,
    output_schema_version_id: row.outputSchemaVersionId,
    raw_output_artifact_ref: asFunctionalRef(row.rawOutputArtifactRef),
    parsed_output_artifact_ref: asNullableFunctionalRef(row.parsedOutputArtifactRef),
    schema_validation_status: row.schemaValidationStatus as AgentWorkflowHarnessRun['schema_validation_status'],
    reference_validation_status: row.referenceValidationStatus as AgentWorkflowHarnessRun['reference_validation_status'],
    trace_validation_status: row.traceValidationStatus as AgentWorkflowHarnessRun['trace_validation_status'],
    nl_field_role_validation_status: row.nlFieldRoleValidationStatus as AgentWorkflowHarnessRun['nl_field_role_validation_status'],
    memo_as_evidence_detected: row.memoAsEvidenceDetected,
    direct_state_mutation_detected: row.directStateMutationDetected,
    blocked_reasons: row.blockedReasons,
    run_status: row.runStatus as AgentWorkflowHarnessRun['run_status'],
    proposal_artifact_ids: row.proposalArtifactIds,
    quality_signal_ids: row.qualitySignalIds,
    gate_result_id: row.gateResultId ?? null,
    transition_attempt_id: row.transitionAttemptId ?? null,
    created_by: row.createdBy as AgentWorkflowHarnessRun['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toProposalArtifact(row: ProposalArtifactRow): ImplementationProposalArtifact {
  return {
    proposal_artifact_id: row.id,
    implementation_project_id: row.implementationProjectId,
    harness_run_id: row.harnessRunId,
    artifact_kind: row.artifactKind as ImplementationProposalArtifact['artifact_kind'],
    target_ref: asFunctionalRef(row.targetRef),
    artifact_ref: asNullableFunctionalRef(row.artifactRef),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefPayloads),
    trace_manifest_refs: asArray<TopicSelectionFunctionalRef>(row.traceManifestRefPayloads),
    payload: asRecord(row.payload),
    proposal_status: row.proposalStatus as ImplementationProposalArtifact['proposal_status'],
    created_by: row.createdBy as ImplementationProposalArtifact['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toQualitySignal(row: QualitySignalRow): ImplementationQualitySignal {
  return {
    quality_signal_id: row.id,
    implementation_project_id: row.implementationProjectId,
    harness_run_id: row.harnessRunId ?? null,
    signal_type: row.signalType as ImplementationQualitySignal['signal_type'],
    severity: row.severity as ImplementationQualitySignal['severity'],
    target_ref: asFunctionalRef(row.targetRef),
    summary: row.summary,
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefPayloads),
    payload: asRecord(row.payload),
    policy_version_id: row.policyVersionId ?? null,
    created_by: row.createdBy as ImplementationQualitySignal['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toGateResult(row: GateResultRow): ImplementationGateResult {
  return {
    gate_result_id: row.id,
    implementation_project_id: row.implementationProjectId,
    gate_type: row.gateType,
    target_ref: asFunctionalRef(row.targetRef),
    result: row.result as ImplementationGateResult['result'],
    checks: asArray<ImplementationGateCheck>(row.checks),
    blockers: row.blockers,
    warnings: row.warnings,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefPayloads),
    required_actions: row.requiredActions,
    policy_version_id: row.policyVersionId ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

function toTransitionAttempt(row: TransitionAttemptRow): ImplementationTransitionAttempt {
  return {
    transition_id: row.id,
    implementation_project_id: row.implementationProjectId,
    transition_key: row.transitionKey,
    target_ref: asFunctionalRef(row.targetRef),
    input_refs: asArray<TopicSelectionFunctionalRef>(row.inputRefPayloads),
    output_refs: asArray<TopicSelectionFunctionalRef>(row.outputRefPayloads),
    actor_type: row.actorType as ImplementationTransitionAttempt['actor_type'],
    actor_id: row.actorId ?? null,
    transition_policy_version_id: row.transitionPolicyVersionId,
    context_policy_version_id: row.contextPolicyVersionId ?? null,
    trace_policy_version_id: row.tracePolicyVersionId,
    gate_result_refs: asArray<TopicSelectionFunctionalRef>(row.gateResultRefPayloads),
    outcome: row.outcome as ImplementationTransitionAttempt['outcome'],
    blockers: row.blockers,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefPayloads),
    harness_run_refs: asArray<TopicSelectionFunctionalRef>(row.harnessRunRefPayloads),
    trace_manifest_refs: asArray<TopicSelectionFunctionalRef>(row.traceManifestRefPayloads),
    created_at: row.createdAt.toISOString(),
  };
}

function toQueueItem(row: DecisionWorkQueueItemRow): DecisionWorkQueueItem {
  return {
    queue_item_id: row.id,
    implementation_project_id: row.implementationProjectId,
    queue_type: row.queueType as DecisionWorkQueueItem['queue_type'],
    stage: row.stage,
    target_ref: asFunctionalRef(row.targetRef),
    priority: row.priority as DecisionWorkQueueItem['priority'],
    status: row.status as DecisionWorkQueueItem['status'],
    blocking_transition_keys: row.blockingTransitionKeys,
    dedup_key: row.dedupKey,
    allowed_handlers: row.allowedHandlers as DecisionWorkQueueItem['allowed_handlers'],
    recommended_actions: row.recommendedActions,
    created_from_refs: asArray<TopicSelectionFunctionalRef>(row.createdFromRefPayloads),
    policy_version_id: row.policyVersionId ?? null,
    retry_count: row.retryCount,
    retry_budget: row.retryBudget,
    cooldown_until: row.cooldownUntil?.toISOString() ?? null,
    source_coordinator_run_ref: asNullableFunctionalRef(row.sourceCoordinatorRunRef),
    source_step_index: row.sourceStepIndex ?? null,
    resolved_at: row.resolvedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

const TERMINAL_DECISION_QUEUE_STATUSES = new Set<DecisionWorkQueueItem['status']>([
  'resolved',
  'dismissed',
  'superseded',
]);

export class PrismaPaperImplementationAiWorkflowHarnessRepository
implements PaperImplementationAiWorkflowHarnessRepository {
  private readonly reopenCooldownMs: number;

  constructor(
    private readonly prisma: PrismaClient,
    options: { reopenCooldownMs?: number } = {},
  ) {
    this.reopenCooldownMs = options.reopenCooldownMs
      ?? PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS;
  }

  async createHarness(harness: ImplementationHarness): Promise<ImplementationHarness> {
    const row = await this.prisma.paperImplementationHarness.create({
      data: this.toHarnessCreateInput(harness),
    });
    return toHarness(row);
  }

  async findHarnessById(
    implementationProjectId: string,
    harnessId: string,
  ): Promise<ImplementationHarness | null> {
    const row = await this.prisma.paperImplementationHarness.findFirst({
      where: { id: harnessId, implementationProjectId },
    });
    return row ? toHarness(row) : null;
  }

  async listHarnesses(implementationProjectId: string): Promise<ImplementationHarness[]> {
    const rows = await this.prisma.paperImplementationHarness.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toHarness);
  }

  async createInputSnapshot(
    snapshot: ImplementationInputSnapshot,
  ): Promise<ImplementationInputSnapshot> {
    const row = await this.prisma.paperImplementationInputSnapshot.create({
      data: this.toInputSnapshotCreateInput(snapshot),
    });
    return toInputSnapshot(row);
  }

  async findInputSnapshotById(
    implementationProjectId: string,
    inputSnapshotId: string,
  ): Promise<ImplementationInputSnapshot | null> {
    const row = await this.prisma.paperImplementationInputSnapshot.findFirst({
      where: { id: inputSnapshotId, implementationProjectId },
    });
    return row ? toInputSnapshot(row) : null;
  }

  async listInputSnapshots(implementationProjectId: string): Promise<ImplementationInputSnapshot[]> {
    const rows = await this.prisma.paperImplementationInputSnapshot.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toInputSnapshot);
  }

  async createAgentWorkflowHarnessRun(
    persistence: AgentWorkflowHarnessRunPersistence,
  ): Promise<CreateAgentWorkflowHarnessRunResponse> {
    return this.prisma.$transaction(async (tx) => {
      const gateRow = await tx.paperImplementationGateResult.create({
        data: this.toGateCreateInput(persistence.gate_result),
      });
      const transitionRow = await tx.paperImplementationTransitionAttempt.create({
        data: this.toTransitionCreateInput(persistence.transition_attempt),
      });
      const runRow = await tx.paperImplementationAgentWorkflowHarnessRun.create({
        data: this.toRunCreateInput(persistence.harness_run, persistence.spec),
      });
      const proposalRows = await Promise.all(persistence.proposal_artifacts.map((proposal) =>
        tx.paperImplementationProposalArtifact.create({
          data: this.toProposalCreateInput(proposal),
        })));
      const qualityRows = await Promise.all(persistence.quality_signals.map((signal) =>
        tx.paperImplementationQualitySignal.create({
          data: this.toQualitySignalCreateInput(signal),
        })));
      const queueRows: DecisionWorkQueueItemRow[] = [];
      for (const item of persistence.queue_items) {
        queueRows.push(await this.upsertQueueItemRow(tx, item));
      }

      return {
        harness_run: toAgentWorkflowHarnessRun(runRow),
        proposal_artifacts: proposalRows.map(toProposalArtifact),
        quality_signals: qualityRows.map(toQualitySignal),
        gate_result: toGateResult(gateRow),
        transition_attempt: toTransitionAttempt(transitionRow),
        queue_items: queueRows.map(toQueueItem),
      };
    });
  }

  async listAgentWorkflowHarnessRuns(
    implementationProjectId: string,
  ): Promise<AgentWorkflowHarnessRun[]> {
    const rows = await this.prisma.paperImplementationAgentWorkflowHarnessRun.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAgentWorkflowHarnessRun);
  }

  async listProposalArtifacts(
    implementationProjectId: string,
  ): Promise<ImplementationProposalArtifact[]> {
    const rows = await this.prisma.paperImplementationProposalArtifact.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProposalArtifact);
  }

  async listDecisionWorkQueueItems(
    implementationProjectId: string,
  ): Promise<DecisionWorkQueueItem[]> {
    const rows = await this.prisma.paperImplementationDecisionWorkQueueItem.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toQueueItem);
  }

  async findDecisionWorkQueueItemById(
    implementationProjectId: string,
    queueItemId: string,
  ): Promise<DecisionWorkQueueItem | null> {
    const row = await this.prisma.paperImplementationDecisionWorkQueueItem.findFirst({
      where: { id: queueItemId, implementationProjectId },
    });
    return row ? toQueueItem(row) : null;
  }

  async enqueueDecisionWorkQueueItem(item: DecisionWorkQueueItem): Promise<DecisionWorkQueueItem> {
    const row = await this.prisma.$transaction((tx) => this.upsertQueueItemRow(tx, item));
    return toQueueItem(row);
  }

  async resolveDecisionWorkQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: ResolveDecisionWorkQueueItemRequest & { resolved_at: string },
  ): Promise<DecisionWorkQueueItem> {
    const existingRow = await this.prisma.paperImplementationDecisionWorkQueueItem.findFirst({
      where: { id: queueItemId, implementationProjectId },
    });
    if (!existingRow) {
      throw new AppError(404, 'NOT_FOUND', `DecisionWorkQueueItem ${queueItemId} not found.`);
    }
    const existing = toQueueItem(existingRow);
    if (TERMINAL_DECISION_QUEUE_STATUSES.has(existing.status)) {
      if (existing.status === resolution.status) {
        return existing;
      }
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `DecisionWorkQueueItem ${queueItemId} is already ${existing.status}.`,
      );
    }
    // Explicit raise only — an override can never lower the budget.
    const retryBudget = resolution.retry_budget_override
      ? Math.max(existing.retry_budget, resolution.retry_budget_override)
      : existing.retry_budget;
    const recommendedActions = retryBudget > existing.retry_count
      ? existing.recommended_actions.filter(
        (action) => action !== PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
      )
      : existing.recommended_actions;
    const row = await this.prisma.paperImplementationDecisionWorkQueueItem.update({
      where: { id: queueItemId },
      data: {
        status: resolution.status,
        retryBudget,
        recommendedActions,
        resolutionNote: resolution.resolution_note ?? null,
        resolvedBy: resolution.resolved_by ?? 'system',
        resolvedAt: new Date(resolution.resolved_at),
        updatedAt: new Date(resolution.resolved_at),
      },
    });
    return toQueueItem(row);
  }

  private async upsertQueueItemRow(
    client: Pick<PrismaClient, 'paperImplementationDecisionWorkQueueItem'>,
    item: DecisionWorkQueueItem,
  ): Promise<DecisionWorkQueueItemRow> {
    const existing = await client.paperImplementationDecisionWorkQueueItem.findFirst({
      where: {
        implementationProjectId: item.implementation_project_id,
        dedupKey: item.dedup_key,
      },
    });
    if (existing) {
      if (TERMINAL_DECISION_QUEUE_STATUSES.has(existing.status as DecisionWorkQueueItem['status'])) {
        return client.paperImplementationDecisionWorkQueueItem.update({
          where: { id: existing.id },
          data: this.toQueueReopenUpdateInput(existing, item),
        });
      }
      return existing;
    }
    return client.paperImplementationDecisionWorkQueueItem.create({
      data: this.toQueueCreateInput(item),
    });
  }

  private toHarnessCreateInput(harness: ImplementationHarness): Prisma.PaperImplementationHarnessCreateInput {
    return {
      id: harness.harness_id,
      implementationProjectId: harness.implementation_project_id,
      harnessStatus: harness.harness_status,
      contextPolicyVersionId: harness.policy_pack.context_policy_version_id,
      tracePolicyVersionId: harness.policy_pack.trace_policy_version_id,
      evidencePolicyVersionId: harness.policy_pack.evidence_policy_version_id,
      experimentPolicyVersionId: harness.policy_pack.experiment_policy_version_id,
      retentionPolicyVersionId: harness.policy_pack.retention_policy_version_id,
      evaluationPolicyVersionId: harness.policy_pack.evaluation_policy_version_id,
      policyPack: toJsonValue(harness.policy_pack),
      controlPlaneId: harness.runtime_bindings.control_plane_id,
      artifactStoreRef: toJsonValue(harness.runtime_bindings.artifact_store_ref),
      evidenceLedgerRef: toJsonValue(harness.runtime_bindings.evidence_ledger_ref),
      workOrderBrokerRef: toJsonValue(harness.runtime_bindings.work_order_broker_ref),
      runMonitorRef: toJsonValue(harness.runtime_bindings.run_monitor_ref),
      runtimeBindings: toJsonValue(harness.runtime_bindings),
      invariants: toJsonValue(harness.invariants),
      auditRefs: toJsonValue(harness.audit),
      createdBy: harness.created_by,
      createdAt: new Date(harness.created_at),
      updatedAt: new Date(harness.updated_at),
    };
  }

  private toInputSnapshotCreateInput(
    snapshot: ImplementationInputSnapshot,
  ): Prisma.PaperImplementationInputSnapshotCreateInput {
    return {
      id: snapshot.input_snapshot_id,
      implementationProjectId: snapshot.implementation_project_id,
      targetRefType: refType(snapshot.target_ref),
      targetRefId: refId(snapshot.target_ref),
      targetVersionId: refVersion(snapshot.target_ref),
      targetRef: toJsonValue(snapshot.target_ref),
      workflowType: snapshot.workflow_type,
      contextPolicyVersionId: snapshot.context_policy_version_id,
      includedContext: toJsonValue(snapshot.included_context),
      excludedContext: toJsonValue(snapshot.excluded_context),
      freshnessStatus: snapshot.freshness_status,
      excludeStaleEvidence: snapshot.freshness_constraints.exclude_stale_evidence,
      excludeInvalidatedRefs: snapshot.freshness_constraints.exclude_invalidated_refs,
      memoAsEvidenceForbidden: snapshot.evidence_rules.memo_as_evidence_forbidden,
      citationRequiresLocator: snapshot.evidence_rules.citation_requires_source_locator,
      sourceHashes: snapshot.source_hashes,
      snapshotHash: snapshot.snapshot_hash,
      createdBy: snapshot.created_by,
      createdAt: new Date(snapshot.created_at),
    };
  }

  private toRunCreateInput(
    run: AgentWorkflowHarnessRun,
    spec: unknown,
  ): Prisma.PaperImplementationAgentWorkflowHarnessRunCreateInput {
    return {
      id: run.harness_run_id,
      implementationProjectId: run.implementation_project_id,
      harnessId: run.harness_id,
      inputSnapshotId: run.input_snapshot_id,
      workflowType: run.workflow_type,
      workflowVersion: run.workflow_version,
      runMode: run.run_mode,
      executionMode: run.execution_mode,
      modelProfileId: run.model_profile_id,
      promptTemplateVersionId: run.prompt_template_version_id,
      outputSchemaVersionId: run.output_schema_version_id,
      rawOutputArtifactRef: toJsonValue(run.raw_output_artifact_ref),
      parsedOutputArtifactRef: run.parsed_output_artifact_ref
        ? toJsonValue(run.parsed_output_artifact_ref)
        : Prisma.JsonNull,
      specPayload: toJsonValue(spec),
      schemaValidationStatus: run.schema_validation_status,
      referenceValidationStatus: run.reference_validation_status,
      traceValidationStatus: run.trace_validation_status,
      nlFieldRoleValidationStatus: run.nl_field_role_validation_status,
      memoAsEvidenceDetected: run.memo_as_evidence_detected,
      directStateMutationDetected: run.direct_state_mutation_detected,
      blockedReasons: run.blocked_reasons,
      runStatus: run.run_status,
      proposalArtifactIds: run.proposal_artifact_ids,
      qualitySignalIds: run.quality_signal_ids,
      gateResultId: run.gate_result_id ?? null,
      transitionAttemptId: run.transition_attempt_id ?? null,
      createdBy: run.created_by,
      createdAt: new Date(run.created_at),
    };
  }

  private toProposalCreateInput(
    proposal: ImplementationProposalArtifact,
  ): Prisma.PaperImplementationProposalArtifactCreateInput {
    return {
      id: proposal.proposal_artifact_id,
      implementationProjectId: proposal.implementation_project_id,
      harnessRunId: proposal.harness_run_id,
      artifactKind: proposal.artifact_kind,
      targetRefType: refType(proposal.target_ref),
      targetRefId: refId(proposal.target_ref),
      targetVersionId: refVersion(proposal.target_ref),
      targetRef: toJsonValue(proposal.target_ref),
      artifactRef: proposal.artifact_ref ? toJsonValue(proposal.artifact_ref) : Prisma.JsonNull,
      sourceRefPayloads: toJsonValue(proposal.source_refs),
      traceManifestRefPayloads: toJsonValue(proposal.trace_manifest_refs),
      proposalStatus: proposal.proposal_status,
      payload: toJsonValue(proposal.payload),
      createdBy: proposal.created_by,
      createdAt: new Date(proposal.created_at),
    };
  }

  private toQualitySignalCreateInput(
    signal: ImplementationQualitySignal,
  ): Prisma.PaperImplementationQualitySignalCreateInput {
    return {
      id: signal.quality_signal_id,
      implementationProjectId: signal.implementation_project_id,
      harnessRunId: signal.harness_run_id ?? null,
      signalType: signal.signal_type,
      severity: signal.severity,
      targetRefType: refType(signal.target_ref),
      targetRefId: refId(signal.target_ref),
      targetVersionId: refVersion(signal.target_ref),
      targetRef: toJsonValue(signal.target_ref),
      summary: signal.summary,
      sourceRefPayloads: toJsonValue(signal.source_refs),
      payload: toJsonValue(signal.payload),
      policyVersionId: signal.policy_version_id ?? null,
      createdBy: signal.created_by,
      createdAt: new Date(signal.created_at),
    };
  }

  private toGateCreateInput(gate: ImplementationGateResult): Prisma.PaperImplementationGateResultCreateInput {
    return {
      id: gate.gate_result_id,
      implementationProjectId: gate.implementation_project_id,
      gateType: gate.gate_type,
      targetRefType: refType(gate.target_ref),
      targetRefId: refId(gate.target_ref),
      targetVersionId: refVersion(gate.target_ref),
      targetRef: toJsonValue(gate.target_ref),
      result: gate.result,
      checks: toJsonValue(gate.checks),
      blockers: gate.blockers,
      warnings: gate.warnings,
      acceptedRiskRefPayloads: toJsonValue(gate.accepted_risk_refs),
      requiredActions: gate.required_actions,
      policyVersionId: gate.policy_version_id ?? null,
      createdAt: new Date(gate.created_at),
    };
  }

  private toTransitionCreateInput(
    transition: ImplementationTransitionAttempt,
  ): Prisma.PaperImplementationTransitionAttemptCreateInput {
    return {
      id: transition.transition_id,
      implementationProjectId: transition.implementation_project_id,
      transitionKey: transition.transition_key,
      targetRefType: refType(transition.target_ref),
      targetRefId: refId(transition.target_ref),
      targetVersionId: refVersion(transition.target_ref),
      targetRef: toJsonValue(transition.target_ref),
      inputRefPayloads: toJsonValue(transition.input_refs),
      outputRefPayloads: toJsonValue(transition.output_refs),
      actorType: transition.actor_type,
      actorId: transition.actor_id ?? null,
      transitionPolicyVersionId: transition.transition_policy_version_id,
      contextPolicyVersionId: transition.context_policy_version_id ?? null,
      tracePolicyVersionId: transition.trace_policy_version_id,
      gateResultRefPayloads: toJsonValue(transition.gate_result_refs),
      outcome: transition.outcome,
      blockers: transition.blockers,
      acceptedRiskRefPayloads: toJsonValue(transition.accepted_risk_refs),
      harnessRunRefPayloads: toJsonValue(transition.harness_run_refs),
      traceManifestRefPayloads: toJsonValue(transition.trace_manifest_refs),
      createdAt: new Date(transition.created_at),
    };
  }

  private toQueueCreateInput(
    item: DecisionWorkQueueItem,
  ): Prisma.PaperImplementationDecisionWorkQueueItemCreateInput {
    return {
      id: item.queue_item_id,
      implementationProjectId: item.implementation_project_id,
      queueType: item.queue_type,
      stage: item.stage,
      targetRefType: refType(item.target_ref),
      targetRefId: refId(item.target_ref),
      targetVersionId: refVersion(item.target_ref),
      targetRef: toJsonValue(item.target_ref),
      priority: item.priority,
      status: item.status,
      blockingTransitionKeys: item.blocking_transition_keys,
      dedupKey: item.dedup_key,
      allowedHandlers: item.allowed_handlers,
      recommendedActions: item.recommended_actions,
      createdFromRefPayloads: toJsonValue(item.created_from_refs),
      policyVersionId: item.policy_version_id ?? null,
      retryCount: item.retry_count,
      retryBudget: item.retry_budget,
      cooldownUntil: item.cooldown_until ? new Date(item.cooldown_until) : null,
      sourceCoordinatorRunRef: item.source_coordinator_run_ref
        ? toJsonValue(item.source_coordinator_run_ref)
        : Prisma.JsonNull,
      sourceStepIndex: item.source_step_index ?? null,
      resolvedAt: item.resolved_at ? new Date(item.resolved_at) : null,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    };
  }

  private toQueueReopenUpdateInput(
    existing: DecisionWorkQueueItemRow,
    item: DecisionWorkQueueItem,
  ): Prisma.PaperImplementationDecisionWorkQueueItemUpdateInput {
    // W4 real retry/cooldown semantics: a reopen is one consumed retry —
    // accumulate on the stored row instead of overwriting with the fresh
    // item's zeroed counters (the pre-W4 overwrite bug) — and start a fixed
    // reopen cooldown window.
    const retryCount = existing.retryCount + 1;
    const retryBudget = Math.max(existing.retryBudget, item.retry_budget);
    const recommendedActions = retryCount >= retryBudget
      ? this.uniqueStrings([
        ...item.recommended_actions,
        PAPER_IMPLEMENTATION_DECISION_QUEUE_RAISE_RETRY_BUDGET_ACTION,
      ])
      : item.recommended_actions;
    const sourceCoordinatorRunRef = item.source_coordinator_run_ref
      ?? asNullableFunctionalRef(existing.sourceCoordinatorRunRef);
    return {
      queueType: item.queue_type,
      stage: item.stage,
      targetRefType: refType(item.target_ref),
      targetRefId: refId(item.target_ref),
      targetVersionId: refVersion(item.target_ref),
      targetRef: toJsonValue(item.target_ref),
      priority: item.priority,
      status: 'open',
      blockingTransitionKeys: this.uniqueStrings([
        ...existing.blockingTransitionKeys,
        ...item.blocking_transition_keys,
      ]),
      allowedHandlers: item.allowed_handlers,
      recommendedActions,
      createdFromRefPayloads: toJsonValue(this.mergeCreatedFromRefs(existing, item)),
      policyVersionId: item.policy_version_id ?? null,
      retryCount,
      retryBudget,
      cooldownUntil: new Date(Date.parse(item.updated_at) + this.reopenCooldownMs),
      sourceCoordinatorRunRef: sourceCoordinatorRunRef
        ? toJsonValue(sourceCoordinatorRunRef)
        : Prisma.JsonNull,
      sourceStepIndex: item.source_step_index ?? existing.sourceStepIndex ?? null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
      updatedAt: new Date(item.updated_at),
    };
  }

  private mergeCreatedFromRefs(
    existing: DecisionWorkQueueItemRow,
    item: DecisionWorkQueueItem,
  ): TopicSelectionFunctionalRef[] {
    const refs = new Map<string, TopicSelectionFunctionalRef>();
    for (const ref of [
      ...asArray<TopicSelectionFunctionalRef>(existing.createdFromRefPayloads),
      ...item.created_from_refs,
    ]) {
      refs.set(functionalRefKey(ref), ref);
    }
    return [...refs.values()];
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }
}
