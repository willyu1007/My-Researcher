import type {
  PaperImplementationCoreMotiveIdentity as CoreMotiveIdentityRow,
  PaperImplementationCoreMotiveSet as CoreMotiveSetRow,
  PaperImplementationCoreMotiveVersion as CoreMotiveVersionRow,
  PaperImplementationCoreMotiveVersionState as CoreMotiveVersionStateRow,
  PaperImplementationCrossBoardReview as CrossBoardReviewRow,
  PaperImplementationEvidenceBinding as EvidenceBindingRow,
  PaperImplementationEvidenceTransferBinding as EvidenceTransferBindingRow,
  PaperImplementationMotiveAssertion as MotiveAssertionRow,
  PaperImplementationMotiveEvidenceBoardVersion as MotiveEvidenceBoardVersionRow,
  PaperImplementationMotiveEvolutionDecision as MotiveEvolutionDecisionRow,
  PaperImplementationMotivePortfolioDecision as MotivePortfolioDecisionRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CoreMotiveControl,
  CoreMotiveDraftResponse,
  CoreMotiveIdentity,
  CoreMotiveLineage,
  CoreMotiveOrigin,
  CoreMotiveSet,
  CoreMotiveVersion,
  CoreMotiveVersionOrigin,
  CoreMotiveVersionState,
  CrossBoardReview,
  EvidenceBinding,
  EvidenceTransferBinding,
  MotiveAssertion,
  MotiveEvidenceBoardVersion,
  MotiveEvolutionDecision,
  MotivePortfolioDecision,
  MotivePortfolioDecisionChanges,
  MotivePortfolioRoles,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  AdmitCoreMotiveVersionPersistence,
  MotiveEvidenceBoardPersistence,
  MotivePortfolioDecisionPersistence,
  PaperImplementationMotiveRepository,
} from '../paper-implementation-motive.repository.js';

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

function toMotiveIdentity(row: CoreMotiveIdentityRow): CoreMotiveIdentity {
  return {
    motive_id: row.id,
    implementation_project_id: row.implementationProjectId,
    current_version_id: row.currentVersionId,
    origin: asRecord(row.origin) as unknown as CoreMotiveOrigin,
    portfolio_role: {
      role: row.portfolioRole as CoreMotiveIdentity['portfolio_role']['role'],
      role_since: row.roleSince.toISOString(),
      role_decision_ref: asNullableFunctionalRef(row.roleDecisionRef),
    },
    lifecycle_status: row.lifecycleStatus as CoreMotiveIdentity['lifecycle_status'],
    lineage: asRecord(row.lineage) as unknown as CoreMotiveLineage,
    control: asRecord(row.control) as unknown as CoreMotiveControl,
    policy_version_id: row.policyVersionId,
    created_by: row.createdBy as CoreMotiveIdentity['created_by'],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toMotiveSet(row: CoreMotiveSetRow): CoreMotiveSet {
  return {
    motive_set_id: row.id,
    implementation_project_id: row.implementationProjectId,
    active_motive_ids: row.activeMotiveIds,
    primary_motive_ids: row.primaryMotiveIds,
    secondary_motive_ids: row.secondaryMotiveIds,
    fallback_motive_ids: row.fallbackMotiveIds,
    supporting_motive_ids: row.supportingMotiveIds,
    parked_motive_ids: row.parkedMotiveIds,
    abandoned_motive_ids: row.abandonedMotiveIds,
    active_motive_count: row.activeMotiveCount,
    max_active_motives: row.maxActiveMotives,
    max_primary_motives: row.maxPrimaryMotives,
    max_parallel_routes: row.maxParallelRoutes,
    latest_portfolio_decision_id: row.latestPortfolioDecisionId,
    policy_version_id: row.policyVersionId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toCoreMotiveVersion(row: CoreMotiveVersionRow): CoreMotiveVersion {
  return {
    core_motive_version_id: row.id,
    motive_id: row.motiveId,
    implementation_project_id: row.implementationProjectId,
    version_number: row.versionNumber,
    version_status: row.versionStatus as CoreMotiveVersion['version_status'],
    version_origin: asRecord(row.versionOrigin) as unknown as CoreMotiveVersionOrigin,
    motive_contract: asRecord(row.motiveContract) as unknown as CoreMotiveVersion['motive_contract'],
    scope_contract: asRecord(row.scopeContract) as unknown as CoreMotiveVersion['scope_contract'],
    boundary_to_upstream: asRecord(row.boundaryToUpstream) as unknown as CoreMotiveVersion['boundary_to_upstream'],
    falsification_contract: asRecord(row.falsificationContract) as unknown as CoreMotiveVersion['falsification_contract'],
    claim_boundary: asRecord(row.claimBoundary) as unknown as CoreMotiveVersion['claim_boundary'],
    route_interface: asRecord(row.routeInterface) as unknown as CoreMotiveVersion['route_interface'],
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    source_result_packet_refs: asArray<TopicSelectionFunctionalRef>(row.sourceResultPacketRefs),
    source_human_judgment_refs: asArray<TopicSelectionFunctionalRef>(row.sourceHumanJudgmentRefs),
    trace_manifest_ref: asNullableFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    admission_gate_result_id: row.admissionGateResultId,
    evolution_decision_id: row.evolutionDecisionId,
    hypothesis_only: row.hypothesisOnly,
    policy_version_id: row.policyVersionId,
    source_proposal_artifact_ref: asNullableFunctionalRef(row.sourceProposalArtifactRef),
    source_proposal_artifact_hash: row.sourceProposalArtifactHash,
    created_by: row.createdBy as CoreMotiveVersion['created_by'],
    created_at: row.createdAt.toISOString(),
    admitted_at: row.admittedAt?.toISOString() ?? null,
  };
}

function toVersionState(row: CoreMotiveVersionStateRow): CoreMotiveVersionState {
  return {
    motive_version_state_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_id: row.motiveId,
    core_motive_version_id: row.coreMotiveVersionId,
    review_status: row.reviewStatus as CoreMotiveVersionState['review_status'],
    freshness_status: row.freshnessStatus as CoreMotiveVersionState['freshness_status'],
    maturity_level: row.maturityLevel as CoreMotiveVersionState['maturity_level'],
    board_readiness_status: row.boardReadinessStatus as CoreMotiveVersionState['board_readiness_status'],
    evidence_status: row.evidenceStatus as CoreMotiveVersionState['evidence_status'],
    feasibility_status: row.feasibilityStatus as CoreMotiveVersionState['feasibility_status'],
    result_status: row.resultStatus as CoreMotiveVersionState['result_status'],
    current_board_version_id: row.currentBoardVersionId,
    latest_validation_cycle_id: row.latestValidationCycleId,
    latest_evolution_decision_id: row.latestEvolutionDecisionId,
    blocker_refs: asArray<TopicSelectionFunctionalRef>(row.blockerRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toAssertion(row: MotiveAssertionRow): MotiveAssertion {
  return {
    assertion_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_id: row.motiveId,
    core_motive_version_id: row.coreMotiveVersionId,
    assertion_type: row.assertionType as MotiveAssertion['assertion_type'],
    assertion_text: row.assertionText,
    importance: asRecord(row.importance) as unknown as MotiveAssertion['importance'],
    validation_requirements: asRecord(row.validationRequirements) as unknown as MotiveAssertion['validation_requirements'],
    falsification: asRecord(row.falsification) as unknown as MotiveAssertion['falsification'],
    status: row.status as MotiveAssertion['status'],
    created_by: row.createdBy as MotiveAssertion['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toBoardVersion(row: MotiveEvidenceBoardVersionRow): MotiveEvidenceBoardVersion {
  return {
    board_version_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_id: row.motiveId,
    core_motive_version_id: row.coreMotiveVersionId,
    assertion_refs: asArray<TopicSelectionFunctionalRef>(row.assertionRefs),
    evidence_binding_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceBindingRefs),
    board_summary: asRecord(row.boardSummary) as unknown as MotiveEvidenceBoardVersion['board_summary'],
    board_state: {
      readiness_status: row.readinessStatus as MotiveEvidenceBoardVersion['board_state']['readiness_status'],
      blocker_status: row.blockerStatus as MotiveEvidenceBoardVersion['board_state']['blocker_status'],
      freshness_status: row.freshnessStatus as MotiveEvidenceBoardVersion['board_state']['freshness_status'],
      support_state: row.supportState as MotiveEvidenceBoardVersion['board_state']['support_state'],
      challenge_status: row.challengeStatus as MotiveEvidenceBoardVersion['board_state']['challenge_status'],
      accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    },
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    created_by: row.createdBy as MotiveEvidenceBoardVersion['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toEvidenceBinding(row: EvidenceBindingRow): EvidenceBinding {
  return {
    binding_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_id: row.motiveId,
    core_motive_version_id: row.coreMotiveVersionId,
    board_version_id: row.boardVersionId,
    assertion_id: row.assertionId,
    evidence_ref: asFunctionalRef(row.evidenceRef),
    role: row.bindingRole as EvidenceBinding['role'],
    scope: asRecord(row.scope) as EvidenceBinding['scope'],
    strength: asRecord(row.strength) as unknown as EvidenceBinding['strength'],
    support_state: row.supportState as EvidenceBinding['support_state'],
    challenge_status: row.challengeStatus as EvidenceBinding['challenge_status'],
    freshness_status: row.freshnessStatus as EvidenceBinding['freshness_status'],
    interpretation: asRecord(row.interpretation) as unknown as EvidenceBinding['interpretation'],
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    created_by: row.createdBy as EvidenceBinding['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toEvidenceTransferBinding(row: EvidenceTransferBindingRow): EvidenceTransferBinding {
  return {
    transfer_id: row.id,
    implementation_project_id: row.implementationProjectId,
    source: asRecord(row.source) as unknown as EvidenceTransferBinding['source'],
    target: asRecord(row.target) as unknown as EvidenceTransferBinding['target'],
    transfer_role: row.transferRole as EvidenceTransferBinding['transfer_role'],
    transfer_validity: row.transferValidity as EvidenceTransferBinding['transfer_validity'],
    scope_match: asRecord(row.scopeMatch) as unknown as EvidenceTransferBinding['scope_match'],
    rationale: row.rationale,
    reviewed_by: row.reviewedBy as EvidenceTransferBinding['reviewed_by'],
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    created_at: row.createdAt.toISOString(),
  };
}

function toCrossBoardReview(row: CrossBoardReviewRow): CrossBoardReview {
  return {
    cross_board_review_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_refs: asArray<TopicSelectionFunctionalRef>(row.motiveRefs),
    shared_evidence_suggestions: asArray<TopicSelectionFunctionalRef>(row.sharedEvidenceSuggestions),
    conflict_warnings: row.conflictWarnings,
    merge_suggestions: row.mergeSuggestions,
    split_suggestions: row.splitSuggestions,
    route_reuse_suggestions: row.routeReuseSuggestions,
    experiment_reuse_suggestions: row.experimentReuseSuggestions,
    portfolio_update_recommendations: row.portfolioUpdateRecommendations,
    recommendation_payload: asRecord(row.recommendationPayload),
    created_by: row.createdBy as CrossBoardReview['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toPortfolioDecision(row: MotivePortfolioDecisionRow): MotivePortfolioDecision {
  return {
    portfolio_decision_id: row.id,
    implementation_project_id: row.implementationProjectId,
    motive_roles_after_decision: asRecord(row.motiveRolesAfterDecision) as unknown as MotivePortfolioRoles,
    changes: asRecord(row.changes) as unknown as MotivePortfolioDecisionChanges,
    rationale: asRecord(row.rationale) as Record<string, string>,
    active_motive_count: row.activeMotiveCount,
    max_active_motives: row.maxActiveMotives,
    max_primary_motives: row.maxPrimaryMotives,
    max_parallel_routes: row.maxParallelRoutes,
    proposed_by: row.proposedBy as MotivePortfolioDecision['proposed_by'],
    confirmed_by: row.confirmedBy as MotivePortfolioDecision['confirmed_by'],
    confirmation_level: row.confirmationLevel as MotivePortfolioDecision['confirmation_level'],
    policy_version_id: row.policyVersionId,
    created_at: row.createdAt.toISOString(),
    applied_at: row.appliedAt?.toISOString() ?? null,
  };
}

function toEvolutionDecision(row: MotiveEvolutionDecisionRow): MotiveEvolutionDecision {
  return {
    motive_evolution_decision_id: row.id,
    implementation_project_id: row.implementationProjectId,
    source_motive_refs: asArray<TopicSelectionFunctionalRef>(row.sourceMotiveRefs),
    triggering_validation_cycle_refs: asArray<TopicSelectionFunctionalRef>(row.triggeringValidationCycleRefs),
    triggering_result_packet_refs: asArray<TopicSelectionFunctionalRef>(row.triggeringResultPacketRefs),
    triggering_cross_board_review_refs: asArray<TopicSelectionFunctionalRef>(row.triggeringCrossBoardReviewRefs),
    triggering_human_request_refs: asArray<TopicSelectionFunctionalRef>(row.triggeringHumanRequestRefs),
    evolution_type: row.evolutionType as MotiveEvolutionDecision['evolution_type'],
    effect_class: row.effectClass as MotiveEvolutionDecision['effect_class'],
    decision_summary: row.decisionSummary,
    decision_rationale: row.decisionRationale,
    change_set: asRecord(row.changeSet),
    proposed_outputs: asRecord(row.proposedOutputs),
    evidence_basis: asRecord(row.evidenceBasis),
    impact_analysis: asRecord(row.impactAnalysis),
    gate: asRecord(row.gate),
    proposed_by: row.proposedBy as MotiveEvolutionDecision['proposed_by'],
    confirmed_by: row.confirmedBy as MotiveEvolutionDecision['confirmed_by'],
    human_confirmation_required: row.humanConfirmationRequired,
    confirmation_ref: asNullableFunctionalRef(row.confirmationRef),
    application_status: row.applicationStatus as MotiveEvolutionDecision['application_status'],
    trace_manifest_ref: asNullableFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    policy_version_id: row.policyVersionId,
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaPaperImplementationMotiveRepository
implements PaperImplementationMotiveRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCoreMotiveDraft(
    draft: CoreMotiveDraftResponse,
  ): Promise<CoreMotiveDraftResponse> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const existingSet = await tx.paperImplementationCoreMotiveSet.findUnique({
          where: { implementationProjectId: draft.motive_set.implementation_project_id },
        });
        const existingIdentity = await tx.paperImplementationCoreMotiveIdentity.findFirst({
          where: {
            id: draft.motive_identity.motive_id,
            implementationProjectId: draft.motive_identity.implementation_project_id,
          },
        });
        if (existingIdentity) {
          await tx.paperImplementationCoreMotiveIdentity.update({
            where: { id: draft.motive_identity.motive_id },
            data: this.toMotiveIdentityUpdateInput(draft.motive_identity),
          });
        } else {
          await tx.paperImplementationCoreMotiveIdentity.create({
            data: this.toMotiveIdentityCreateInput(draft.motive_identity),
          });
        }
        if (existingSet) {
          await tx.paperImplementationCoreMotiveSet.update({
            where: { implementationProjectId: draft.motive_set.implementation_project_id },
            data: this.toMotiveSetUpdateInput(draft.motive_set),
          });
        } else {
          await tx.paperImplementationCoreMotiveSet.create({
            data: this.toMotiveSetCreateInput(draft.motive_set),
          });
        }
        await tx.paperImplementationCoreMotiveVersion.create({
          data: this.toCoreMotiveVersionCreateInput(draft.core_motive_version),
        });
        await tx.paperImplementationCoreMotiveVersionState.create({
          data: this.toVersionStateCreateInput(draft.motive_version_state),
        });
        if (draft.assertions.length > 0) {
          await tx.paperImplementationMotiveAssertion.createMany({
            data: draft.assertions.map((assertion) => this.toAssertionCreateInput(assertion)),
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `CoreMotiveVersion ${draft.core_motive_version.core_motive_version_id} already exists.`,
        );
      }
      throw error;
    }
    return draft;
  }

  async findMotiveIdentityById(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveIdentity | null> {
    const row = await this.prisma.paperImplementationCoreMotiveIdentity.findFirst({
      where: { id: motiveId, implementationProjectId },
    });
    return row ? toMotiveIdentity(row) : null;
  }

  async listMotiveIdentities(
    implementationProjectId: string,
  ): Promise<CoreMotiveIdentity[]> {
    const rows = await this.prisma.paperImplementationCoreMotiveIdentity.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMotiveIdentity);
  }

  async findMotiveSet(
    implementationProjectId: string,
  ): Promise<CoreMotiveSet | null> {
    const row = await this.prisma.paperImplementationCoreMotiveSet.findUnique({
      where: { implementationProjectId },
    });
    return row ? toMotiveSet(row) : null;
  }

  async findCoreMotiveVersionById(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersion | null> {
    const row = await this.prisma.paperImplementationCoreMotiveVersion.findFirst({
      where: { id: coreMotiveVersionId, implementationProjectId },
    });
    return row ? toCoreMotiveVersion(row) : null;
  }

  async listCoreMotiveVersions(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveVersion[]> {
    const rows = await this.prisma.paperImplementationCoreMotiveVersion.findMany({
      where: { implementationProjectId, motiveId },
      orderBy: { versionNumber: 'asc' },
    });
    return rows.map(toCoreMotiveVersion);
  }

  async findMotiveVersionStateByVersionId(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersionState | null> {
    const row = await this.prisma.paperImplementationCoreMotiveVersionState.findFirst({
      where: { implementationProjectId, coreMotiveVersionId },
    });
    return row ? toVersionState(row) : null;
  }

  async listAssertionsByVersion(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<MotiveAssertion[]> {
    const rows = await this.prisma.paperImplementationMotiveAssertion.findMany({
      where: { implementationProjectId, coreMotiveVersionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAssertion);
  }

  async admitCoreMotiveVersion(
    persistence: AdmitCoreMotiveVersionPersistence,
  ): Promise<AdmitCoreMotiveVersionPersistence> {
    await this.prisma.$transaction(async (tx) => {
      const claimedVersion = await tx.paperImplementationCoreMotiveVersion.updateMany({
        where: {
          id: persistence.core_motive_version.core_motive_version_id,
          implementationProjectId: persistence.core_motive_version.implementation_project_id,
          versionStatus: 'draft',
        },
        data: this.toCoreMotiveVersionUpdateInput(persistence.core_motive_version),
      });
      if (claimedVersion.count !== 1) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Only one CoreMotiveVersion admission may win.');
      }
      await tx.paperImplementationMotivePortfolioDecision.create({
        data: this.toPortfolioDecisionCreateInput(persistence.portfolio_decision),
      });
      await tx.paperImplementationCoreMotiveIdentity.update({
        where: { id: persistence.motive_identity.motive_id },
        data: this.toMotiveIdentityUpdateInput(persistence.motive_identity),
      });
      for (const motive of persistence.additional_motive_identities ?? []) {
        await tx.paperImplementationCoreMotiveIdentity.update({
          where: { id: motive.motive_id },
          data: this.toMotiveIdentityUpdateInput(motive),
        });
      }
      await tx.paperImplementationCoreMotiveSet.update({
        where: { implementationProjectId: persistence.motive_set.implementation_project_id },
        data: this.toMotiveSetUpdateInput(persistence.motive_set),
      });
      await tx.paperImplementationCoreMotiveVersionState.update({
        where: { coreMotiveVersionId: persistence.motive_version_state.core_motive_version_id },
        data: this.toVersionStateUpdateInput(persistence.motive_version_state),
      });
    });
    return persistence;
  }

  async createMotiveEvidenceBoardVersion(
    persistence: MotiveEvidenceBoardPersistence,
  ): Promise<MotiveEvidenceBoardPersistence> {
    await this.prisma.$transaction(async (tx) => {
      await tx.paperImplementationMotiveEvidenceBoardVersion.create({
        data: this.toBoardVersionCreateInput(persistence.board_version),
      });
      if (persistence.evidence_bindings.length > 0) {
        await tx.paperImplementationEvidenceBinding.createMany({
          data: persistence.evidence_bindings.map((binding) => this.toEvidenceBindingCreateInput(binding)),
        });
      }
      await tx.paperImplementationCoreMotiveVersionState.update({
        where: { coreMotiveVersionId: persistence.motive_version_state.core_motive_version_id },
        data: this.toVersionStateUpdateInput(persistence.motive_version_state),
      });
    });
    return persistence;
  }

  async listMotiveEvidenceBoards(
    implementationProjectId: string,
  ): Promise<MotiveEvidenceBoardVersion[]> {
    const rows = await this.prisma.paperImplementationMotiveEvidenceBoardVersion.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toBoardVersion);
  }

  async findMotiveEvidenceBoardById(
    implementationProjectId: string,
    boardVersionId: string,
  ): Promise<MotiveEvidenceBoardVersion | null> {
    const row = await this.prisma.paperImplementationMotiveEvidenceBoardVersion.findFirst({
      where: { id: boardVersionId, implementationProjectId },
    });
    return row ? toBoardVersion(row) : null;
  }

  async findEvidenceBindingById(
    implementationProjectId: string,
    evidenceBindingId: string,
  ): Promise<EvidenceBinding | null> {
    const row = await this.prisma.paperImplementationEvidenceBinding.findFirst({
      where: { id: evidenceBindingId, implementationProjectId },
    });
    return row ? toEvidenceBinding(row) : null;
  }

  async createEvidenceTransferBinding(
    transfer: EvidenceTransferBinding,
  ): Promise<EvidenceTransferBinding> {
    const row = await this.prisma.paperImplementationEvidenceTransferBinding.create({
      data: this.toEvidenceTransferBindingCreateInput(transfer),
    });
    return toEvidenceTransferBinding(row);
  }

  async listEvidenceTransferBindings(
    implementationProjectId: string,
  ): Promise<EvidenceTransferBinding[]> {
    const rows = await this.prisma.paperImplementationEvidenceTransferBinding.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEvidenceTransferBinding);
  }

  async createCrossBoardReview(
    review: CrossBoardReview,
  ): Promise<CrossBoardReview> {
    const row = await this.prisma.paperImplementationCrossBoardReview.create({
      data: this.toCrossBoardReviewCreateInput(review),
    });
    return toCrossBoardReview(row);
  }

  async createMotivePortfolioDecision(
    persistence: MotivePortfolioDecisionPersistence,
  ): Promise<MotivePortfolioDecisionPersistence> {
    await this.prisma.$transaction(async (tx) => {
      await tx.paperImplementationMotivePortfolioDecision.create({
        data: this.toPortfolioDecisionCreateInput(persistence.portfolio_decision),
      });
      await tx.paperImplementationCoreMotiveSet.update({
        where: { implementationProjectId: persistence.motive_set.implementation_project_id },
        data: this.toMotiveSetUpdateInput(persistence.motive_set),
      });
      for (const motive of persistence.motive_identities) {
        await tx.paperImplementationCoreMotiveIdentity.update({
          where: { id: motive.motive_id },
          data: this.toMotiveIdentityUpdateInput(motive),
        });
      }
    });
    return persistence;
  }

  async listMotivePortfolioDecisions(
    implementationProjectId: string,
  ): Promise<MotivePortfolioDecision[]> {
    const rows = await this.prisma.paperImplementationMotivePortfolioDecision.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPortfolioDecision);
  }

  async createMotiveEvolutionDecision(
    decision: MotiveEvolutionDecision,
  ): Promise<MotiveEvolutionDecision> {
    const row = await this.prisma.paperImplementationMotiveEvolutionDecision.create({
      data: this.toEvolutionDecisionCreateInput(decision),
    });
    return toEvolutionDecision(row);
  }

  async findMotiveEvolutionDecisionById(
    implementationProjectId: string,
    motiveEvolutionDecisionId: string,
  ): Promise<MotiveEvolutionDecision | null> {
    const row = await this.prisma.paperImplementationMotiveEvolutionDecision.findFirst({
      where: { id: motiveEvolutionDecisionId, implementationProjectId },
    });
    return row ? toEvolutionDecision(row) : null;
  }

  private toMotiveIdentityCreateInput(
    motive: CoreMotiveIdentity,
  ): Prisma.PaperImplementationCoreMotiveIdentityCreateInput {
    return {
      id: motive.motive_id,
      implementationProjectId: motive.implementation_project_id,
      currentVersionId: motive.current_version_id ?? null,
      origin: toJsonValue(motive.origin),
      portfolioRole: motive.portfolio_role.role,
      roleSince: new Date(motive.portfolio_role.role_since),
      roleDecisionId: motive.portfolio_role.role_decision_ref?.ref_id ?? null,
      roleDecisionRef: motive.portfolio_role.role_decision_ref
        ? toJsonValue(motive.portfolio_role.role_decision_ref)
        : undefined,
      lifecycleStatus: motive.lifecycle_status,
      lineage: toJsonValue(motive.lineage),
      mergedIntoMotiveId: motive.lineage.merged_into_motive_id ?? null,
      supersededByMotiveId: motive.lineage.superseded_by_motive_id ?? null,
      control: toJsonValue(motive.control),
      policyVersionId: motive.policy_version_id ?? null,
      createdBy: motive.created_by,
      createdAt: new Date(motive.created_at),
      updatedAt: new Date(motive.updated_at),
    };
  }

  private toMotiveIdentityUpdateInput(
    motive: CoreMotiveIdentity,
  ): Prisma.PaperImplementationCoreMotiveIdentityUpdateInput {
    return {
      currentVersionId: motive.current_version_id ?? null,
      origin: toJsonValue(motive.origin),
      portfolioRole: motive.portfolio_role.role,
      roleSince: new Date(motive.portfolio_role.role_since),
      roleDecisionId: motive.portfolio_role.role_decision_ref?.ref_id ?? null,
      roleDecisionRef: motive.portfolio_role.role_decision_ref
        ? toJsonValue(motive.portfolio_role.role_decision_ref)
        : Prisma.JsonNull,
      lifecycleStatus: motive.lifecycle_status,
      lineage: toJsonValue(motive.lineage),
      mergedIntoMotiveId: motive.lineage.merged_into_motive_id ?? null,
      supersededByMotiveId: motive.lineage.superseded_by_motive_id ?? null,
      control: toJsonValue(motive.control),
      policyVersionId: motive.policy_version_id ?? null,
      updatedAt: new Date(motive.updated_at),
    };
  }

  private toMotiveSetCreateInput(
    motiveSet: CoreMotiveSet,
  ): Prisma.PaperImplementationCoreMotiveSetCreateInput {
    return {
      id: motiveSet.motive_set_id,
      implementationProjectId: motiveSet.implementation_project_id,
      activeMotiveIds: motiveSet.active_motive_ids,
      primaryMotiveIds: motiveSet.primary_motive_ids,
      secondaryMotiveIds: motiveSet.secondary_motive_ids,
      fallbackMotiveIds: motiveSet.fallback_motive_ids,
      supportingMotiveIds: motiveSet.supporting_motive_ids,
      parkedMotiveIds: motiveSet.parked_motive_ids,
      abandonedMotiveIds: motiveSet.abandoned_motive_ids,
      activeMotiveCount: motiveSet.active_motive_count,
      maxActiveMotives: motiveSet.max_active_motives,
      maxPrimaryMotives: motiveSet.max_primary_motives,
      maxParallelRoutes: motiveSet.max_parallel_routes,
      latestPortfolioDecisionId: motiveSet.latest_portfolio_decision_id ?? null,
      policyVersionId: motiveSet.policy_version_id ?? null,
      createdAt: new Date(motiveSet.created_at),
      updatedAt: new Date(motiveSet.updated_at),
    };
  }

  private toMotiveSetUpdateInput(
    motiveSet: CoreMotiveSet,
  ): Prisma.PaperImplementationCoreMotiveSetUpdateInput {
    return {
      activeMotiveIds: motiveSet.active_motive_ids,
      primaryMotiveIds: motiveSet.primary_motive_ids,
      secondaryMotiveIds: motiveSet.secondary_motive_ids,
      fallbackMotiveIds: motiveSet.fallback_motive_ids,
      supportingMotiveIds: motiveSet.supporting_motive_ids,
      parkedMotiveIds: motiveSet.parked_motive_ids,
      abandonedMotiveIds: motiveSet.abandoned_motive_ids,
      activeMotiveCount: motiveSet.active_motive_count,
      maxActiveMotives: motiveSet.max_active_motives,
      maxPrimaryMotives: motiveSet.max_primary_motives,
      maxParallelRoutes: motiveSet.max_parallel_routes,
      latestPortfolioDecisionId: motiveSet.latest_portfolio_decision_id ?? null,
      policyVersionId: motiveSet.policy_version_id ?? null,
      updatedAt: new Date(motiveSet.updated_at),
    };
  }

  private toCoreMotiveVersionCreateInput(
    version: CoreMotiveVersion,
  ): Prisma.PaperImplementationCoreMotiveVersionCreateInput {
    return {
      id: version.core_motive_version_id,
      implementationProjectId: version.implementation_project_id,
      motiveId: version.motive_id,
      versionNumber: version.version_number,
      versionStatus: version.version_status,
      versionOrigin: toJsonValue(version.version_origin),
      motiveContract: toJsonValue(version.motive_contract),
      scopeContract: toJsonValue(version.scope_contract),
      boundaryToUpstream: toJsonValue(version.boundary_to_upstream),
      falsificationContract: toJsonValue(version.falsification_contract),
      claimBoundary: toJsonValue(version.claim_boundary),
      routeInterface: toJsonValue(version.route_interface),
      sourceRefs: toJsonValue(version.source_refs),
      sourceResultPacketRefs: toJsonValue(version.source_result_packet_refs),
      sourceHumanJudgmentRefs: toJsonValue(version.source_human_judgment_refs),
      traceManifestId: version.trace_manifest_id ?? null,
      traceManifestRef: version.trace_manifest_ref
        ? toJsonValue(version.trace_manifest_ref)
        : undefined,
      admissionGateResultId: version.admission_gate_result_id ?? null,
      evolutionDecisionId: version.evolution_decision_id ?? null,
      hypothesisOnly: version.hypothesis_only,
      policyVersionId: version.policy_version_id ?? null,
      sourceProposalArtifactRef: version.source_proposal_artifact_ref
        ? toJsonValue(version.source_proposal_artifact_ref)
        : undefined,
      sourceProposalArtifactHash: version.source_proposal_artifact_hash ?? null,
      createdBy: version.created_by,
      createdAt: new Date(version.created_at),
      admittedAt: version.admitted_at ? new Date(version.admitted_at) : null,
    };
  }

  private toCoreMotiveVersionUpdateInput(
    version: CoreMotiveVersion,
  ): Prisma.PaperImplementationCoreMotiveVersionUpdateInput {
    return {
      versionStatus: version.version_status,
      versionOrigin: toJsonValue(version.version_origin),
      motiveContract: toJsonValue(version.motive_contract),
      scopeContract: toJsonValue(version.scope_contract),
      boundaryToUpstream: toJsonValue(version.boundary_to_upstream),
      falsificationContract: toJsonValue(version.falsification_contract),
      claimBoundary: toJsonValue(version.claim_boundary),
      routeInterface: toJsonValue(version.route_interface),
      sourceRefs: toJsonValue(version.source_refs),
      sourceResultPacketRefs: toJsonValue(version.source_result_packet_refs),
      sourceHumanJudgmentRefs: toJsonValue(version.source_human_judgment_refs),
      traceManifestId: version.trace_manifest_id ?? null,
      traceManifestRef: version.trace_manifest_ref
        ? toJsonValue(version.trace_manifest_ref)
        : Prisma.JsonNull,
      admissionGateResultId: version.admission_gate_result_id ?? null,
      evolutionDecisionId: version.evolution_decision_id ?? null,
      hypothesisOnly: version.hypothesis_only,
      policyVersionId: version.policy_version_id ?? null,
      admittedAt: version.admitted_at ? new Date(version.admitted_at) : null,
    };
  }

  private toVersionStateCreateInput(
    state: CoreMotiveVersionState,
  ): Prisma.PaperImplementationCoreMotiveVersionStateCreateInput {
    return {
      id: state.motive_version_state_id,
      implementationProjectId: state.implementation_project_id,
      motiveId: state.motive_id,
      coreMotiveVersionId: state.core_motive_version_id,
      reviewStatus: state.review_status,
      freshnessStatus: state.freshness_status,
      maturityLevel: state.maturity_level,
      boardReadinessStatus: state.board_readiness_status,
      evidenceStatus: state.evidence_status,
      feasibilityStatus: state.feasibility_status,
      resultStatus: state.result_status,
      currentBoardVersionId: state.current_board_version_id ?? null,
      latestValidationCycleId: state.latest_validation_cycle_id ?? null,
      latestEvolutionDecisionId: state.latest_evolution_decision_id ?? null,
      blockerRefs: toJsonValue(state.blocker_refs),
      acceptedRiskRefs: toJsonValue(state.accepted_risk_refs),
      updatedAt: new Date(state.updated_at),
    };
  }

  private toVersionStateUpdateInput(
    state: CoreMotiveVersionState,
  ): Prisma.PaperImplementationCoreMotiveVersionStateUpdateInput {
    return {
      reviewStatus: state.review_status,
      freshnessStatus: state.freshness_status,
      maturityLevel: state.maturity_level,
      boardReadinessStatus: state.board_readiness_status,
      evidenceStatus: state.evidence_status,
      feasibilityStatus: state.feasibility_status,
      resultStatus: state.result_status,
      currentBoardVersionId: state.current_board_version_id ?? null,
      latestValidationCycleId: state.latest_validation_cycle_id ?? null,
      latestEvolutionDecisionId: state.latest_evolution_decision_id ?? null,
      blockerRefs: toJsonValue(state.blocker_refs),
      acceptedRiskRefs: toJsonValue(state.accepted_risk_refs),
      updatedAt: new Date(state.updated_at),
    };
  }

  private toAssertionCreateInput(assertion: MotiveAssertion) {
    return {
      id: assertion.assertion_id,
      implementationProjectId: assertion.implementation_project_id,
      motiveId: assertion.motive_id,
      coreMotiveVersionId: assertion.core_motive_version_id,
      assertionType: assertion.assertion_type,
      assertionText: assertion.assertion_text,
      importance: toJsonValue(assertion.importance),
      importanceRole: assertion.importance.role,
      mustHoldForMotiveToContinue: assertion.importance.must_hold_for_motive_to_continue,
      validationRequirements: toJsonValue(assertion.validation_requirements),
      minimumSupportLevel: assertion.validation_requirements.minimum_support_level,
      falsification: toJsonValue(assertion.falsification),
      status: assertion.status,
      createdBy: assertion.created_by,
      createdAt: new Date(assertion.created_at),
    };
  }

  private toBoardVersionCreateInput(
    board: MotiveEvidenceBoardVersion,
  ): Prisma.PaperImplementationMotiveEvidenceBoardVersionCreateInput {
    return {
      id: board.board_version_id,
      implementationProjectId: board.implementation_project_id,
      motiveId: board.motive_id,
      coreMotiveVersionId: board.core_motive_version_id,
      assertionRefs: toJsonValue(board.assertion_refs),
      evidenceBindingRefs: toJsonValue(board.evidence_binding_refs),
      boardSummary: toJsonValue(board.board_summary),
      readinessStatus: board.board_state.readiness_status,
      blockerStatus: board.board_state.blocker_status,
      freshnessStatus: board.board_state.freshness_status,
      supportState: board.board_state.support_state,
      challengeStatus: board.board_state.challenge_status,
      acceptedRiskRefs: toJsonValue(board.board_state.accepted_risk_refs),
      traceManifestId: board.trace_manifest_id,
      traceManifestRef: toJsonValue(board.trace_manifest_ref),
      createdBy: board.created_by,
      createdAt: new Date(board.created_at),
    };
  }

  private toEvidenceBindingCreateInput(binding: EvidenceBinding) {
    return {
      id: binding.binding_id,
      implementationProjectId: binding.implementation_project_id,
      motiveId: binding.motive_id,
      coreMotiveVersionId: binding.core_motive_version_id,
      boardVersionId: binding.board_version_id,
      assertionId: binding.assertion_id,
      evidenceRef: toJsonValue(binding.evidence_ref),
      sourceRefType: binding.evidence_ref.ref_type,
      sourceRefId: binding.evidence_ref.ref_id,
      sourceVersionId: binding.evidence_ref.version_id ?? null,
      bindingRole: binding.role,
      scope: toJsonValue(binding.scope),
      strength: toJsonValue(binding.strength),
      supportState: binding.support_state,
      challengeStatus: binding.challenge_status,
      freshnessStatus: binding.freshness_status,
      interpretation: toJsonValue(binding.interpretation),
      traceManifestId: binding.trace_manifest_id,
      traceManifestRef: toJsonValue(binding.trace_manifest_ref),
      createdBy: binding.created_by,
      createdAt: new Date(binding.created_at),
    };
  }

  private toEvidenceTransferBindingCreateInput(
    transfer: EvidenceTransferBinding,
  ): Prisma.PaperImplementationEvidenceTransferBindingCreateInput {
    return {
      id: transfer.transfer_id,
      implementationProjectId: transfer.implementation_project_id,
      source: toJsonValue(transfer.source),
      sourceBoardVersionId: transfer.source.board_version_id,
      sourceAssertionId: transfer.source.assertion_id,
      sourceEvidenceBindingId: transfer.source.evidence_binding_id,
      target: toJsonValue(transfer.target),
      targetBoardVersionId: transfer.target.board_version_id,
      targetAssertionId: transfer.target.assertion_id,
      transferRole: transfer.transfer_role,
      transferValidity: transfer.transfer_validity,
      scopeMatch: toJsonValue(transfer.scope_match),
      rationale: transfer.rationale,
      reviewedBy: transfer.reviewed_by ?? null,
      traceManifestId: transfer.trace_manifest_id,
      traceManifestRef: toJsonValue(transfer.trace_manifest_ref),
      createdAt: new Date(transfer.created_at),
    };
  }

  private toCrossBoardReviewCreateInput(
    review: CrossBoardReview,
  ): Prisma.PaperImplementationCrossBoardReviewCreateInput {
    return {
      id: review.cross_board_review_id,
      implementationProjectId: review.implementation_project_id,
      motiveRefs: toJsonValue(review.motive_refs),
      sharedEvidenceSuggestions: toJsonValue(review.shared_evidence_suggestions),
      conflictWarnings: review.conflict_warnings,
      mergeSuggestions: review.merge_suggestions,
      splitSuggestions: review.split_suggestions,
      routeReuseSuggestions: review.route_reuse_suggestions,
      experimentReuseSuggestions: review.experiment_reuse_suggestions,
      portfolioUpdateRecommendations: review.portfolio_update_recommendations,
      recommendationPayload: toJsonValue(review.recommendation_payload),
      createdBy: review.created_by,
      createdAt: new Date(review.created_at),
    };
  }

  private toPortfolioDecisionCreateInput(
    decision: MotivePortfolioDecision,
  ): Prisma.PaperImplementationMotivePortfolioDecisionCreateInput {
    return {
      id: decision.portfolio_decision_id,
      implementationProjectId: decision.implementation_project_id,
      motiveRolesAfterDecision: toJsonValue(decision.motive_roles_after_decision),
      primaryMotiveIds: decision.motive_roles_after_decision.primary_motive_ids,
      activeMotiveCount: decision.active_motive_count,
      changes: toJsonValue(decision.changes),
      rationale: toJsonValue(decision.rationale),
      maxActiveMotives: decision.max_active_motives,
      maxPrimaryMotives: decision.max_primary_motives,
      maxParallelRoutes: decision.max_parallel_routes,
      proposedBy: decision.proposed_by,
      confirmedBy: decision.confirmed_by ?? null,
      confirmationLevel: decision.confirmation_level,
      policyVersionId: decision.policy_version_id ?? null,
      createdAt: new Date(decision.created_at),
      appliedAt: decision.applied_at ? new Date(decision.applied_at) : null,
    };
  }

  private toEvolutionDecisionCreateInput(
    decision: MotiveEvolutionDecision,
  ): Prisma.PaperImplementationMotiveEvolutionDecisionCreateInput {
    return {
      id: decision.motive_evolution_decision_id,
      implementationProjectId: decision.implementation_project_id,
      sourceMotiveRefs: toJsonValue(decision.source_motive_refs),
      triggeringValidationCycleRefs: toJsonValue(decision.triggering_validation_cycle_refs),
      triggeringResultPacketRefs: toJsonValue(decision.triggering_result_packet_refs),
      triggeringCrossBoardReviewRefs: toJsonValue(decision.triggering_cross_board_review_refs),
      triggeringHumanRequestRefs: toJsonValue(decision.triggering_human_request_refs),
      evolutionType: decision.evolution_type,
      effectClass: decision.effect_class,
      decisionSummary: decision.decision_summary,
      decisionRationale: decision.decision_rationale,
      changeSet: toJsonValue(decision.change_set),
      proposedOutputs: toJsonValue(decision.proposed_outputs),
      evidenceBasis: toJsonValue(decision.evidence_basis),
      impactAnalysis: toJsonValue(decision.impact_analysis),
      gate: toJsonValue(decision.gate),
      proposedBy: decision.proposed_by,
      confirmedBy: decision.confirmed_by ?? null,
      humanConfirmationRequired: decision.human_confirmation_required,
      confirmationRef: decision.confirmation_ref
        ? toJsonValue(decision.confirmation_ref)
        : undefined,
      applicationStatus: decision.application_status,
      traceManifestId: decision.trace_manifest_id ?? null,
      traceManifestRef: decision.trace_manifest_ref
        ? toJsonValue(decision.trace_manifest_ref)
        : undefined,
      policyVersionId: decision.policy_version_id ?? null,
      createdAt: new Date(decision.created_at),
    };
  }
}
