import crypto from 'node:crypto';

import type {
  AdmitCoreMotiveVersionRequest,
  AdmitCoreMotiveVersionResponse,
  ApplyMotivePortfolioDecisionRequest,
  CoreMotiveDraftResponse,
  CoreMotiveIdentity,
  CoreMotiveSet,
  CoreMotiveVersion,
  CoreMotiveVersionOrigin,
  CoreMotiveVersionState,
  CreateCoreMotiveDraftRequest,
  CreateCrossBoardReviewRequest,
  CreateEvidenceTransferBindingRequest,
  CreateMotiveEvidenceBoardVersionRequest,
  CreateMotiveEvidenceBoardVersionResponse,
  CreateMotiveEvolutionDecisionRequest,
  CrossBoardReview,
  EvidenceBinding,
  EvidenceTransferBinding,
  MotiveAssertion,
  MotiveEvidenceBoardState,
  MotiveEvidenceBoardVersion,
  MotiveEvolutionDecision,
  MotivePortfolioDecision,
  MotivePortfolioRoles,
  PaperImplementationMotivePortfolioRole,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import type {
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationMotiveEvidenceBoardServiceOptions = {
  projectRepository: PaperImplementationRepository;
  motiveRepository: PaperImplementationMotiveRepository;
  traceRepository: PaperImplementationTraceRepository;
  confirmationRepository: PaperImplementationHumanConfirmationRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

const DEFAULT_MAX_ACTIVE_MOTIVES = 3;
const DEFAULT_MAX_PRIMARY_MOTIVES = 1;
const DEFAULT_MAX_PARALLEL_ROUTES = 2;
const MEMO_LIKE_EVIDENCE_REF_TYPES = new Set([
  'boardsummary',
  'displaysummary',
  'llmsummary',
  'llmrationale',
  'rationalememo',
  'resultinterpretation',
]);
const TRANSFER_REQUIRED_EVIDENCE_REF_TYPES = new Set([
  'coremotive',
  'coremotiveversion',
  'motiveassertion',
  'motiveevidenceboardversion',
  'evidencebinding',
  'evidencetransferbinding',
]);

export class PaperImplementationMotiveEvidenceBoardService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly motiveRepository: PaperImplementationMotiveRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly confirmationRepository: PaperImplementationHumanConfirmationRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationMotiveEvidenceBoardServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.motiveRepository = options.motiveRepository;
    this.traceRepository = options.traceRepository;
    this.confirmationRepository = options.confirmationRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createCoreMotiveDraft(
    implementationProjectId: string,
    request: CreateCoreMotiveDraftRequest,
  ): Promise<CoreMotiveDraftResponse> {
    const project = await this.requireActiveProject(implementationProjectId);
    this.assertCoreMotiveContract(request);
    this.assertAssertions(request.assertions);
    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const motiveId = request.motive_id ?? this.idFactory('core_motive');
    const existingIdentity = await this.motiveRepository.findMotiveIdentityById(
      project.implementation_project_id,
      motiveId,
    );
    const existingSet = await this.motiveRepository.findMotiveSet(project.implementation_project_id);
    const versionOrigin = this.resolveVersionOrigin(request, existingIdentity);
    if (this.requiresEvolutionDecision(versionOrigin, request.evolution_decision_id)) {
      const decision = await this.requireEvolutionDecision(
        project.implementation_project_id,
        request.evolution_decision_id ?? versionOrigin.created_by_decision_id ?? null,
      );
      if (!decision || !['approved', 'applied'].includes(decision.application_status)) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Semantic CoreMotive version changes require an approved MotiveEvolutionDecision.',
        );
      }
      await this.requireTraceReadyEvolutionDecision(project.implementation_project_id, decision);
    }
    if (versionOrigin.previous_version_id) {
      const previous = await this.motiveRepository.findCoreMotiveVersionById(
        project.implementation_project_id,
        versionOrigin.previous_version_id,
      );
      if (!previous || previous.motive_id !== motiveId) {
        throw new AppError(404, 'NOT_FOUND', `Previous CoreMotiveVersion ${versionOrigin.previous_version_id} not found.`);
      }
    }

    const nextVersionNumber = existingIdentity
      ? (await this.motiveRepository.listCoreMotiveVersions(project.implementation_project_id, motiveId)).length + 1
      : 1;
    const policyVersionId = request.policy_version_id ?? project.policy_version_id ?? null;
    if (!existingIdentity && request.portfolio_role && request.portfolio_role !== 'parked') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Draft CoreMotive objects cannot enter active portfolio roles before admission.',
      );
    }
    if (existingIdentity && request.portfolio_role && request.portfolio_role !== existingIdentity.portfolio_role.role) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CoreMotive portfolio role changes must use admission or MotivePortfolioDecision, not draft creation.',
      );
    }
    const initialRole = existingIdentity?.portfolio_role.role ?? 'parked';
    const motiveIdentity: CoreMotiveIdentity = existingIdentity
      ? {
        ...existingIdentity,
        updated_at: createdAt,
      }
      : {
        motive_id: motiveId,
        implementation_project_id: project.implementation_project_id,
        current_version_id: null,
        origin: {
          source_topic_package_id: request.origin?.source_topic_package_id ?? 'unknown',
          source_validated_need_ids: request.origin?.source_validated_need_ids ?? [],
          source_topic_question_contract_id: request.origin?.source_topic_question_contract_id ?? null,
          created_from_motive_ids: request.origin?.created_from_motive_ids ?? [],
        },
        portfolio_role: {
          role: initialRole,
          role_since: createdAt,
          role_decision_ref: null,
        },
        lifecycle_status: this.lifecycleForRole(initialRole),
        lineage: {
          merged_into_motive_id: null,
          split_into_motive_ids: [],
          superseded_by_motive_id: null,
          parent_motive_ids: [],
          child_motive_ids: [],
        },
        control: {
          owner: null,
          human_confirmation_required_for_major_change: true,
        },
        policy_version_id: policyVersionId,
        created_by: createdBy,
        created_at: createdAt,
        updated_at: createdAt,
      };
    const motiveSet = existingIdentity
      ? existingSet ?? this.initialMotiveSet(project.implementation_project_id, createdAt, policyVersionId)
      : this.addMotiveToSet(
        existingSet ?? this.initialMotiveSet(project.implementation_project_id, createdAt, policyVersionId),
        motiveId,
        initialRole,
        createdAt,
      );
    const coreMotiveVersion: CoreMotiveVersion = {
      core_motive_version_id: request.core_motive_version_id ?? this.idFactory('core_motive_version'),
      motive_id: motiveId,
      implementation_project_id: project.implementation_project_id,
      version_number: nextVersionNumber,
      version_status: 'draft',
      version_origin: versionOrigin,
      motive_contract: request.motive_contract,
      scope_contract: request.scope_contract,
      boundary_to_upstream: {
        topic_question_contract_id: request.boundary_to_upstream?.topic_question_contract_id ?? null,
        research_slice_id: request.boundary_to_upstream?.research_slice_id ?? null,
        within_upstream_boundary: request.boundary_to_upstream?.within_upstream_boundary ?? true,
        boundary_risk_notes: request.boundary_to_upstream?.boundary_risk_notes ?? [],
        upstream_recheck_required: request.boundary_to_upstream?.upstream_recheck_required ?? false,
      },
      falsification_contract: request.falsification_contract,
      claim_boundary: request.claim_boundary,
      route_interface: {
        plausible_route_families: request.route_interface?.plausible_route_families ?? [],
        disallowed_route_families: request.route_interface?.disallowed_route_families ?? [],
        required_route_properties: request.route_interface?.required_route_properties ?? [],
        cheapest_validation_route_hint: request.route_interface?.cheapest_validation_route_hint ?? null,
      },
      source_refs: request.source_refs ?? [],
      source_result_packet_refs: request.source_result_packet_refs ?? [],
      source_human_judgment_refs: request.source_human_judgment_refs ?? [],
      trace_manifest_ref: null,
      trace_manifest_id: null,
      admission_gate_result_id: null,
      evolution_decision_id: request.evolution_decision_id ?? versionOrigin.created_by_decision_id ?? null,
      hypothesis_only: request.hypothesis_only ?? false,
      policy_version_id: policyVersionId,
      created_by: createdBy,
      created_at: createdAt,
      admitted_at: null,
    };
    const motiveVersionState: CoreMotiveVersionState = {
      motive_version_state_id: this.idFactory('motive_version_state'),
      implementation_project_id: project.implementation_project_id,
      motive_id: motiveId,
      core_motive_version_id: coreMotiveVersion.core_motive_version_id,
      review_status: 'unreviewed',
      freshness_status: 'fresh',
      maturity_level: 'L0_hypothesis',
      board_readiness_status: 'not_ready',
      evidence_status: 'insufficient',
      feasibility_status: 'not_checked',
      result_status: 'no_results',
      current_board_version_id: null,
      latest_validation_cycle_id: null,
      latest_evolution_decision_id: coreMotiveVersion.evolution_decision_id,
      blocker_refs: [],
      accepted_risk_refs: [],
      updated_at: createdAt,
    };
    const assertions = request.assertions.map((assertion): MotiveAssertion => ({
      assertion_id: assertion.assertion_id ?? this.idFactory('motive_assertion'),
      implementation_project_id: project.implementation_project_id,
      motive_id: motiveId,
      core_motive_version_id: coreMotiveVersion.core_motive_version_id,
      assertion_type: assertion.assertion_type,
      assertion_text: assertion.assertion_text.trim(),
      importance: assertion.importance,
      validation_requirements: assertion.validation_requirements,
      falsification: assertion.falsification,
      status: assertion.expected_initial_status,
      created_by: createdBy,
      created_at: createdAt,
    }));
    return this.motiveRepository.createCoreMotiveDraft({
      motive_identity: motiveIdentity,
      motive_set: motiveSet,
      core_motive_version: coreMotiveVersion,
      motive_version_state: motiveVersionState,
      assertions,
    });
  }

  async admitCoreMotiveVersion(
    implementationProjectId: string,
    motiveId: string,
    coreMotiveVersionId: string,
    request: AdmitCoreMotiveVersionRequest,
  ): Promise<AdmitCoreMotiveVersionResponse> {
    const project = await this.requireActiveProject(implementationProjectId);
    const motive = await this.requireMotive(project.implementation_project_id, motiveId);
    const version = await this.requireCoreMotiveVersion(
      project.implementation_project_id,
      coreMotiveVersionId,
    );
    if (version.motive_id !== motive.motive_id) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveVersion ${coreMotiveVersionId} not found for motive ${motiveId}.`);
    }
    if (version.version_status !== 'draft') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only draft CoreMotiveVersion objects can be admitted.');
    }
    this.assertAdmissibleVersion(version);
    const assertions = await this.motiveRepository.listAssertionsByVersion(
      project.implementation_project_id,
      version.core_motive_version_id,
    );
    this.assertAdmissibleAssertions(assertions);
    const manifest = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'core_motive_version',
      version.core_motive_version_id,
    );
    const existingSet = await this.requireMotiveSet(project.implementation_project_id);
    const requestedRole = request.portfolio_role
      ?? this.defaultAdmittedRole(existingSet, motive.motive_id);
    const confirmationLevel = request.confirmation_level ?? 'not_required';
    const createdAt = this.now();
    const admissionPortfolio = await this.buildAdmissionPortfolioSet(
      project.implementation_project_id,
      existingSet,
      motive.motive_id,
      requestedRole,
      confirmationLevel,
      request.confirmed_by ?? null,
      createdAt,
    );
    const primaryPromotion = requestedRole === 'primary'
      && !existingSet.primary_motive_ids.includes(motive.motive_id)
      && existingSet.primary_motive_ids.length > 0;
    if (admissionPortfolio.demotedFromPrimaryIds.length > 0 || primaryPromotion) {
      if (!request.confirmation_ref) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Primary motive replacement or promotion into a non-empty primary set requires a resolvable confirmation_ref.',
        );
      }
      await this.requireActiveHumanConfirmation(
        project.implementation_project_id,
        request.confirmation_ref.ref_id,
        'motive_portfolio_decision',
        'CoreMotiveVersion admission',
      );
    }
    const policyVersionId = version.policy_version_id ?? motive.policy_version_id ?? project.policy_version_id ?? null;
    const portfolioDecision = this.buildPortfolioDecision({
      implementationProjectId: project.implementation_project_id,
      motiveSet: admissionPortfolio.nextSet,
      changes: {
        promoted_to_primary: requestedRole === 'primary' && !existingSet.primary_motive_ids.includes(motive.motive_id)
          ? [motive.motive_id]
          : [],
        demoted_from_primary: admissionPortfolio.demotedFromPrimaryIds,
        merged_motives: [],
        split_motives: [],
        newly_parked: requestedRole === 'parked' ? [motive.motive_id] : [],
        newly_abandoned: requestedRole === 'abandoned' ? [motive.motive_id] : [],
      },
      rationale: { admission: 'CoreMotiveVersion admitted through T-094 motive gate.' },
      proposedBy: request.created_by ?? 'system',
      confirmedBy: request.confirmed_by ?? null,
      confirmationLevel,
      policyVersionId,
      createdAt,
      appliedAt: createdAt,
    });
    const nextSet = {
      ...portfolioDecision.motiveSet,
      latest_portfolio_decision_id: portfolioDecision.decision.portfolio_decision_id,
    };
    const decisionRef = this.ref(
      'motive_portfolio_decision',
      portfolioDecision.decision.portfolio_decision_id,
      project.title_card_id,
    );
    const nextMotive: CoreMotiveIdentity = {
      ...motive,
      current_version_id: version.core_motive_version_id,
      portfolio_role: {
        role: requestedRole,
        role_since: createdAt,
        role_decision_ref: decisionRef,
      },
      lifecycle_status: this.lifecycleForRole(requestedRole),
      updated_at: createdAt,
    };
    const demotedMotiveUpdates = admissionPortfolio.demotedMotiveIdentities.map((demotedMotive): CoreMotiveIdentity => ({
      ...demotedMotive,
      portfolio_role: {
        role: 'secondary',
        role_since: createdAt,
        role_decision_ref: decisionRef,
      },
      lifecycle_status: 'active',
      updated_at: createdAt,
    }));
    const nextVersion: CoreMotiveVersion = {
      ...version,
      version_status: 'admitted',
      trace_manifest_id: manifest.trace_manifest_id,
      trace_manifest_ref: this.ref('trace_manifest', manifest.trace_manifest_id, project.title_card_id),
      admission_gate_result_id: request.admission_gate_result_id ?? this.idFactory('motive_admission_gate_result'),
      admitted_at: createdAt,
    };
    const currentState = await this.requireVersionState(
      project.implementation_project_id,
      version.core_motive_version_id,
    );
    const nextState: CoreMotiveVersionState = {
      ...currentState,
      review_status: 'reviewed',
      maturity_level: version.hypothesis_only ? 'L0_hypothesis' : 'L1_evidence_backed',
      board_readiness_status: 'not_ready',
      evidence_status: version.hypothesis_only ? 'insufficient' : 'weak',
      freshness_status: 'fresh',
      updated_at: createdAt,
    };
    const persisted = await this.motiveRepository.admitCoreMotiveVersion({
      motive_identity: nextMotive,
      additional_motive_identities: demotedMotiveUpdates,
      motive_set: nextSet,
      core_motive_version: nextVersion,
      motive_version_state: nextState,
      portfolio_decision: portfolioDecision.decision,
    });
    return {
      motive_identity: persisted.motive_identity,
      motive_set: persisted.motive_set,
      core_motive_version: persisted.core_motive_version,
      motive_version_state: persisted.motive_version_state,
      assertions,
      portfolio_decision: persisted.portfolio_decision,
    };
  }

  async listCoreMotives(
    implementationProjectId: string,
  ): Promise<CoreMotiveIdentity[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.motiveRepository.listMotiveIdentities(implementationProjectId);
  }

  async getCoreMotive(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveIdentity> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireMotive(implementationProjectId, motiveId);
  }

  async listCoreMotiveVersions(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveVersion[]> {
    await this.requireActiveProject(implementationProjectId);
    await this.requireMotive(implementationProjectId, motiveId);
    return this.motiveRepository.listCoreMotiveVersions(implementationProjectId, motiveId);
  }

  async createMotiveEvidenceBoardVersion(
    implementationProjectId: string,
    request: CreateMotiveEvidenceBoardVersionRequest,
  ): Promise<CreateMotiveEvidenceBoardVersionResponse> {
    const project = await this.requireActiveProject(implementationProjectId);
    const version = await this.requireCoreMotiveVersion(
      project.implementation_project_id,
      request.core_motive_version_id,
    );
    if (version.motive_id !== request.motive_id) {
      throw new AppError(404, 'NOT_FOUND', 'CoreMotiveVersion does not belong to the requested motive.');
    }
    if (version.version_status !== 'admitted') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Motive evidence boards require an admitted CoreMotiveVersion.');
    }
    const motive = await this.requireMotive(project.implementation_project_id, request.motive_id);
    const assertions = await this.motiveRepository.listAssertionsByVersion(
      project.implementation_project_id,
      version.core_motive_version_id,
    );
    const assertionIds = new Set(assertions.map((assertion) => assertion.assertion_id));
    const boardVersionId = request.board_version_id ?? this.idFactory('motive_evidence_board_version');
    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const boardTrace = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'motive_evidence_board_version',
      boardVersionId,
    );
    const evidenceBindings = await Promise.all(request.bindings.map(async (binding): Promise<EvidenceBinding> => {
      if (!assertionIds.has(binding.assertion_id)) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `EvidenceBinding assertion_id ${binding.assertion_id} does not belong to the CoreMotiveVersion.`);
      }
      this.assertEvidenceRefCanSupportBoard(binding.evidence_ref);
      const bindingId = binding.binding_id ?? this.idFactory('evidence_binding');
      const bindingTrace = await this.requireCompleteTraceManifest(
        project.implementation_project_id,
        binding.trace_manifest_id,
        'evidence_binding',
        bindingId,
      );
      return {
        binding_id: bindingId,
        implementation_project_id: project.implementation_project_id,
        motive_id: motive.motive_id,
        core_motive_version_id: version.core_motive_version_id,
        board_version_id: boardVersionId,
        assertion_id: binding.assertion_id,
        evidence_ref: binding.evidence_ref,
        role: binding.role,
        scope: binding.scope,
        strength: binding.strength,
        support_state: binding.support_state,
        challenge_status: binding.challenge_status,
        freshness_status: binding.strength.freshness,
        interpretation: binding.interpretation,
        trace_manifest_ref: this.ref('trace_manifest', bindingTrace.trace_manifest_id, project.title_card_id),
        trace_manifest_id: bindingTrace.trace_manifest_id,
        created_by: createdBy,
        created_at: createdAt,
      };
    }));
    const boardState = this.resolveBoardState(request.board_state, evidenceBindings);
    this.assertBoardHasRequiredAssertionPaths(assertions, evidenceBindings, boardState);
    const boardVersion: MotiveEvidenceBoardVersion = {
      board_version_id: boardVersionId,
      implementation_project_id: project.implementation_project_id,
      motive_id: motive.motive_id,
      core_motive_version_id: version.core_motive_version_id,
      assertion_refs: assertions.map((assertion) => this.ref('motive_assertion', assertion.assertion_id, project.title_card_id)),
      evidence_binding_refs: evidenceBindings.map((binding) => this.ref('evidence_binding', binding.binding_id, project.title_card_id)),
      board_summary: request.board_summary,
      board_state: boardState,
      trace_manifest_ref: this.ref('trace_manifest', boardTrace.trace_manifest_id, project.title_card_id),
      trace_manifest_id: boardTrace.trace_manifest_id,
      created_by: createdBy,
      created_at: createdAt,
    };
    const currentState = await this.requireVersionState(
      project.implementation_project_id,
      version.core_motive_version_id,
    );
    const nextState: CoreMotiveVersionState = {
      ...currentState,
      current_board_version_id: boardVersion.board_version_id,
      board_readiness_status: boardState.readiness_status,
      evidence_status: boardState.support_state === 'strong' ? 'strong' : boardState.support_state === 'partial' ? 'partial' : 'weak',
      freshness_status: boardState.freshness_status,
      updated_at: createdAt,
    };
    return this.motiveRepository.createMotiveEvidenceBoardVersion({
      board_version: boardVersion,
      evidence_bindings: evidenceBindings,
      motive_version_state: nextState,
    });
  }

  async listMotiveEvidenceBoards(
    implementationProjectId: string,
  ): Promise<MotiveEvidenceBoardVersion[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.motiveRepository.listMotiveEvidenceBoards(implementationProjectId);
  }

  async createEvidenceTransferBinding(
    implementationProjectId: string,
    request: CreateEvidenceTransferBindingRequest,
  ): Promise<EvidenceTransferBinding> {
    const project = await this.requireActiveProject(implementationProjectId);
    const transferId = request.transfer_id ?? this.idFactory('evidence_transfer_binding');
    const sourceBoard = await this.requireMotiveEvidenceBoard(
      project.implementation_project_id,
      request.source.board_version_id,
    );
    const targetBoard = await this.requireMotiveEvidenceBoard(
      project.implementation_project_id,
      request.target.board_version_id,
    );
    const sourceBinding = await this.requireEvidenceBinding(
      project.implementation_project_id,
      request.source.evidence_binding_id,
    );
    this.assertEvidenceTransferSource(request, sourceBoard, sourceBinding);
    this.assertEvidenceTransferTarget(request, targetBoard);
    this.assertEvidenceTransferPolicy(request);
    const traceManifest = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'evidence_transfer_binding',
      transferId,
    );
    const transfer: EvidenceTransferBinding = {
      transfer_id: transferId,
      implementation_project_id: project.implementation_project_id,
      source: request.source,
      target: request.target,
      transfer_role: request.transfer_role,
      transfer_validity: request.transfer_validity,
      scope_match: request.scope_match,
      rationale: request.rationale.trim(),
      reviewed_by: request.reviewed_by ?? null,
      trace_manifest_ref: this.ref('trace_manifest', traceManifest.trace_manifest_id, project.title_card_id),
      trace_manifest_id: traceManifest.trace_manifest_id,
      created_at: this.now(),
    };
    return this.motiveRepository.createEvidenceTransferBinding(transfer);
  }

  async listEvidenceTransferBindings(
    implementationProjectId: string,
  ): Promise<EvidenceTransferBinding[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.motiveRepository.listEvidenceTransferBindings(implementationProjectId);
  }

  async createCrossBoardReview(
    implementationProjectId: string,
    request: CreateCrossBoardReviewRequest,
  ): Promise<CrossBoardReview> {
    const project = await this.requireActiveProject(implementationProjectId);
    for (const ref of request.motive_refs) {
      await this.requireMotive(project.implementation_project_id, ref.ref_id);
    }
    const review: CrossBoardReview = {
      cross_board_review_id: this.idFactory('cross_board_review'),
      implementation_project_id: project.implementation_project_id,
      motive_refs: request.motive_refs,
      shared_evidence_suggestions: request.shared_evidence_suggestions ?? [],
      conflict_warnings: request.conflict_warnings ?? [],
      merge_suggestions: request.merge_suggestions ?? [],
      split_suggestions: request.split_suggestions ?? [],
      route_reuse_suggestions: request.route_reuse_suggestions ?? [],
      experiment_reuse_suggestions: request.experiment_reuse_suggestions ?? [],
      portfolio_update_recommendations: request.portfolio_update_recommendations ?? [],
      recommendation_payload: request.recommendation_payload ?? {},
      created_by: request.created_by ?? 'system',
      created_at: this.now(),
    };
    return this.motiveRepository.createCrossBoardReview(review);
  }

  async applyMotivePortfolioDecision(
    implementationProjectId: string,
    request: ApplyMotivePortfolioDecisionRequest,
  ): Promise<MotivePortfolioDecision> {
    const project = await this.requireActiveProject(implementationProjectId);
    const currentSet = await this.requireMotiveSet(project.implementation_project_id);
    const maxActiveMotives = request.max_active_motives ?? currentSet.max_active_motives;
    const maxPrimaryMotives = request.max_primary_motives ?? currentSet.max_primary_motives;
    const maxParallelRoutes = request.max_parallel_routes ?? currentSet.max_parallel_routes;
    const roles = request.motive_roles_after_decision;
    this.assertPortfolioRolesAreCoherent(roles);
    this.assertPortfolioDecisionCoversCurrentSet(currentSet, roles);
    const activeCount = this.activeMotiveCount(roles);
    this.assertPortfolioLimits(activeCount, roles.primary_motive_ids.length, maxActiveMotives, maxPrimaryMotives, maxParallelRoutes);
    const allMotiveIds = this.allRoleMotiveIds(roles);
    const motives = await Promise.all(allMotiveIds.map((motiveId) =>
      this.requireMotive(project.implementation_project_id, motiveId)));
    const confirmationLevel = request.confirmation_level ?? 'not_required';
    const majorStructuralChange = this.assertPortfolioDecisionConfirmation(currentSet, request, activeCount, confirmationLevel);
    if (majorStructuralChange) {
      if (!request.confirmation_ref) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Major structural MotivePortfolioDecision must include a resolvable confirmation_ref.',
        );
      }
      await this.requireActiveHumanConfirmation(
        project.implementation_project_id,
        request.confirmation_ref.ref_id,
        'motive_portfolio_decision',
        'MotivePortfolioDecision',
      );
    }
    const createdAt = this.now();
    const decision: MotivePortfolioDecision = {
      portfolio_decision_id: this.idFactory('motive_portfolio_decision'),
      implementation_project_id: project.implementation_project_id,
      motive_roles_after_decision: roles,
      changes: request.changes,
      rationale: request.rationale,
      active_motive_count: activeCount,
      max_active_motives: maxActiveMotives,
      max_primary_motives: maxPrimaryMotives,
      max_parallel_routes: maxParallelRoutes,
      proposed_by: request.proposed_by ?? 'system',
      confirmed_by: request.confirmed_by ?? null,
      confirmation_level: confirmationLevel,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_at: createdAt,
      applied_at: createdAt,
    };
    const decisionRef = this.ref('motive_portfolio_decision', decision.portfolio_decision_id, project.title_card_id);
    const motiveUpdates = motives.map((motive): CoreMotiveIdentity => {
      const nextRole = this.roleForMotive(roles, motive.motive_id);
      return {
        ...motive,
        portfolio_role: {
          role: nextRole,
          role_since: createdAt,
          role_decision_ref: decisionRef,
        },
        lifecycle_status: request.changes.merged_motives.includes(motive.motive_id)
          ? 'merged'
          : request.changes.split_motives.includes(motive.motive_id)
            ? 'split'
            : this.lifecycleForRole(nextRole),
        updated_at: createdAt,
      };
    });
    const nextSet: CoreMotiveSet = {
      ...currentSet,
      active_motive_ids: this.activeMotiveIds(roles),
      primary_motive_ids: roles.primary_motive_ids,
      secondary_motive_ids: roles.secondary_motive_ids,
      fallback_motive_ids: roles.fallback_motive_ids,
      supporting_motive_ids: roles.supporting_motive_ids,
      parked_motive_ids: roles.parked_motive_ids,
      abandoned_motive_ids: roles.abandoned_motive_ids,
      active_motive_count: activeCount,
      max_active_motives: maxActiveMotives,
      max_primary_motives: maxPrimaryMotives,
      max_parallel_routes: maxParallelRoutes,
      latest_portfolio_decision_id: decision.portfolio_decision_id,
      policy_version_id: decision.policy_version_id,
      updated_at: createdAt,
    };
    const persisted = await this.motiveRepository.createMotivePortfolioDecision({
      portfolio_decision: decision,
      motive_set: nextSet,
      motive_identities: motiveUpdates,
    });
    return persisted.portfolio_decision;
  }

  async listMotivePortfolioDecisions(
    implementationProjectId: string,
  ): Promise<MotivePortfolioDecision[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.motiveRepository.listMotivePortfolioDecisions(implementationProjectId);
  }

  async createMotiveEvolutionDecision(
    implementationProjectId: string,
    request: CreateMotiveEvolutionDecisionRequest,
  ): Promise<MotiveEvolutionDecision> {
    const project = await this.requireActiveProject(implementationProjectId);
    if (request.source_motive_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_motive_refs is required.');
    }
    const sourceMotives = await Promise.all(
      request.source_motive_refs.map((ref) =>
        this.requireMotive(project.implementation_project_id, ref.ref_id)),
    );
    const controlRequiresConfirmation = request.effect_class === 'structural_evolution'
      && sourceMotives.some((motive) => motive.control.human_confirmation_required_for_major_change);
    const humanConfirmationRequired = (request.human_confirmation_required ?? false) || controlRequiresConfirmation;
    if (humanConfirmationRequired) {
      if (!request.confirmation_ref) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Human-required MotiveEvolutionDecision must include a resolvable confirmation_ref.',
          controlRequiresConfirmation
            ? { required_by: 'motive_control_human_confirmation_required_for_major_change' }
            : undefined,
        );
      }
      await this.requireActiveHumanConfirmation(
        project.implementation_project_id,
        request.confirmation_ref.ref_id,
        'motive_evolution_decision',
        'MotiveEvolutionDecision',
      );
    }
    const decisionId = request.motive_evolution_decision_id ?? this.idFactory('motive_evolution_decision');
    const applicationStatus = request.application_status ?? 'approved';
    if (['approved', 'applied'].includes(applicationStatus) && !request.trace_manifest_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Approved or applied MotiveEvolutionDecision objects require a complete trace_manifest_id.',
      );
    }
    if (request.trace_manifest_id) {
      await this.requireCompleteTraceManifest(
        project.implementation_project_id,
        request.trace_manifest_id,
        'motive_evolution_decision',
        decisionId,
      );
    }
    const decision: MotiveEvolutionDecision = {
      motive_evolution_decision_id: decisionId,
      implementation_project_id: project.implementation_project_id,
      source_motive_refs: request.source_motive_refs,
      triggering_validation_cycle_refs: request.triggering_validation_cycle_refs ?? [],
      triggering_result_packet_refs: request.triggering_result_packet_refs ?? [],
      triggering_cross_board_review_refs: request.triggering_cross_board_review_refs ?? [],
      triggering_human_request_refs: request.triggering_human_request_refs ?? [],
      evolution_type: request.evolution_type,
      effect_class: request.effect_class,
      decision_summary: request.decision_summary.trim(),
      decision_rationale: request.decision_rationale.trim(),
      change_set: request.change_set,
      proposed_outputs: request.proposed_outputs ?? {},
      evidence_basis: request.evidence_basis ?? {},
      impact_analysis: request.impact_analysis ?? {},
      gate: request.gate ?? {},
      proposed_by: request.proposed_by ?? 'system',
      confirmed_by: request.confirmed_by ?? null,
      human_confirmation_required: humanConfirmationRequired,
      confirmation_ref: request.confirmation_ref ?? null,
      application_status: applicationStatus,
      trace_manifest_ref: request.trace_manifest_id
        ? this.ref('trace_manifest', request.trace_manifest_id, project.title_card_id)
        : request.trace_manifest_ref ?? null,
      trace_manifest_id: request.trace_manifest_id ?? null,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_at: this.now(),
    };
    return this.motiveRepository.createMotiveEvolutionDecision(decision);
  }

  private async requireActiveProject(implementationProjectId: string) {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (project.lifecycle_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ImplementationProject must be active.');
    }
    return project;
  }

  private async requireMotive(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveIdentity> {
    if (!this.hasText(motiveId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'motive_id is required.');
    }
    const motive = await this.motiveRepository.findMotiveIdentityById(implementationProjectId, motiveId);
    if (!motive) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveIdentity ${motiveId} not found.`);
    }
    return motive;
  }

  private async requireCoreMotiveVersion(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersion> {
    if (!this.hasText(coreMotiveVersionId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'core_motive_version_id is required.');
    }
    const version = await this.motiveRepository.findCoreMotiveVersionById(
      implementationProjectId,
      coreMotiveVersionId,
    );
    if (!version) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveVersion ${coreMotiveVersionId} not found.`);
    }
    return version;
  }

  private async requireVersionState(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersionState> {
    const state = await this.motiveRepository.findMotiveVersionStateByVersionId(
      implementationProjectId,
      coreMotiveVersionId,
    );
    if (!state) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveVersionState for ${coreMotiveVersionId} not found.`);
    }
    return state;
  }

  private async requireMotiveEvidenceBoard(
    implementationProjectId: string,
    boardVersionId: string,
  ): Promise<MotiveEvidenceBoardVersion> {
    if (!this.hasText(boardVersionId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'board_version_id is required.');
    }
    const board = await this.motiveRepository.findMotiveEvidenceBoardById(
      implementationProjectId,
      boardVersionId,
    );
    if (!board) {
      throw new AppError(404, 'NOT_FOUND', `MotiveEvidenceBoardVersion ${boardVersionId} not found.`);
    }
    return board;
  }

  private async requireEvidenceBinding(
    implementationProjectId: string,
    evidenceBindingId: string,
  ): Promise<EvidenceBinding> {
    if (!this.hasText(evidenceBindingId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'evidence_binding_id is required.');
    }
    const binding = await this.motiveRepository.findEvidenceBindingById(
      implementationProjectId,
      evidenceBindingId,
    );
    if (!binding) {
      throw new AppError(404, 'NOT_FOUND', `EvidenceBinding ${evidenceBindingId} not found.`);
    }
    return binding;
  }

  private async requireMotiveSet(implementationProjectId: string): Promise<CoreMotiveSet> {
    const motiveSet = await this.motiveRepository.findMotiveSet(implementationProjectId);
    if (!motiveSet) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveSet is missing.');
    }
    return motiveSet;
  }

  private async requireEvolutionDecision(
    implementationProjectId: string,
    decisionId: string | null,
  ): Promise<MotiveEvolutionDecision | null> {
    if (!decisionId) {
      return null;
    }
    const decision = await this.motiveRepository.findMotiveEvolutionDecisionById(
      implementationProjectId,
      decisionId,
    );
    if (!decision) {
      throw new AppError(404, 'NOT_FOUND', `MotiveEvolutionDecision ${decisionId} not found.`);
    }
    return decision;
  }

  private async requireTraceReadyEvolutionDecision(
    implementationProjectId: string,
    decision: MotiveEvolutionDecision,
  ): Promise<void> {
    if (!decision.trace_manifest_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Semantic CoreMotive version changes require a trace-ready MotiveEvolutionDecision.',
      );
    }
    await this.requireCompleteTraceManifest(
      implementationProjectId,
      decision.trace_manifest_id,
      'motive_evolution_decision',
      decision.motive_evolution_decision_id,
    );
  }

  private async requireCompleteTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    targetRefType: string,
    targetRefId: string,
  ): Promise<TraceManifest> {
    if (!this.hasText(traceManifestId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'trace_manifest_id is required.');
    }
    const manifest = await this.traceRepository.findTraceManifestById(implementationProjectId, traceManifestId);
    if (!manifest) {
      throw new AppError(404, 'NOT_FOUND', `TraceManifest ${traceManifestId} not found.`);
    }
    if (manifest.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Writing-affecting motive objects require a complete TraceManifest.');
    }
    if (
      this.normalizedRefType(manifest.target_ref.ref_type) !== this.normalizedRefType(targetRefType)
      || manifest.target_ref.ref_id !== targetRefId
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `TraceManifest ${traceManifestId} does not target ${targetRefType}:${targetRefId}.`,
      );
    }
    return manifest;
  }

  private resolveVersionOrigin(
    request: CreateCoreMotiveDraftRequest,
    existingIdentity: CoreMotiveIdentity | null,
  ): CoreMotiveVersionOrigin {
    return {
      created_by_decision_id: request.evolution_decision_id
        ?? request.version_origin?.created_by_decision_id
        ?? null,
      previous_version_id: request.version_origin?.previous_version_id
        ?? existingIdentity?.current_version_id
        ?? null,
      derived_from_motive_version_ids: request.version_origin?.derived_from_motive_version_ids ?? [],
      derivation_type: request.version_origin?.derivation_type ?? (existingIdentity ? 'refine' : 'initial'),
    };
  }

  private requiresEvolutionDecision(
    origin: CoreMotiveVersionOrigin,
    explicitDecisionId?: string | null,
  ): boolean {
    return Boolean(
      origin.previous_version_id
      || origin.derivation_type !== 'initial'
      || explicitDecisionId
    );
  }

  private assertCoreMotiveContract(request: CreateCoreMotiveDraftRequest): void {
    const contract = request.motive_contract;
    if (!this.hasText(contract.unmet_or_failure_mechanism)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive requires an unmet_or_failure_mechanism.');
    }
    if (
      request.falsification_contract.invalidation_conditions.length === 0
      || request.falsification_contract.minimum_evidence_to_continue.length === 0
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive requires falsification and continuation conditions.');
    }
    if (
      !this.hasText(request.claim_boundary.maximum_allowed_claim)
      || !this.hasText(request.claim_boundary.minimum_defensible_contribution_claim)
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive requires claim boundary text.');
    }
  }

  private assertAssertions(assertions: CreateCoreMotiveDraftRequest['assertions']): void {
    if (assertions.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive requires assertions.');
    }
    if (!assertions.some((assertion) => assertion.importance.role === 'core')) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive requires at least one core assertion.');
    }
    for (const assertion of assertions) {
      if (!this.hasText(assertion.assertion_text)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'assertion_text is required.');
      }
      if (assertion.validation_requirements.required_evidence_types.length === 0) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'MotiveAssertion requires required_evidence_types.');
      }
    }
  }

  private assertAdmissibleVersion(version: CoreMotiveVersion): void {
    this.assertCoreMotiveContract({
      motive_contract: version.motive_contract,
      scope_contract: version.scope_contract,
      falsification_contract: version.falsification_contract,
      claim_boundary: version.claim_boundary,
      assertions: [],
    });
    const sourceRefCount =
      version.source_refs.length
      + version.source_result_packet_refs.length
      + version.source_human_judgment_refs.length;
    if (!version.hypothesis_only && sourceRefCount === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CoreMotiveVersion admission requires source refs or explicit hypothesis_only.',
      );
    }
  }

  private assertAdmissibleAssertions(assertions: MotiveAssertion[]): void {
    if (assertions.length === 0 || !assertions.some((assertion) => assertion.importance.role === 'core')) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveVersion admission requires core assertions.');
    }
  }

  private async buildAdmissionPortfolioSet(
    implementationProjectId: string,
    currentSet: CoreMotiveSet,
    motiveId: string,
    requestedRole: PaperImplementationMotivePortfolioRole,
    confirmationLevel: string,
    confirmedBy: TopicSelectionActorType | null,
    updatedAt: string,
  ): Promise<{
    nextSet: CoreMotiveSet;
    demotedFromPrimaryIds: string[];
    demotedMotiveIdentities: CoreMotiveIdentity[];
  }> {
    const demotedFromPrimaryIds = requestedRole === 'primary'
      ? currentSet.primary_motive_ids.filter((primaryMotiveId) => primaryMotiveId !== motiveId)
      : [];
    if (demotedFromPrimaryIds.length > 0 && (confirmationLevel !== 'human_confirmed' || !confirmedBy)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Primary motive replacement requires human confirmation.',
      );
    }
    const nextSet = requestedRole === 'primary' && demotedFromPrimaryIds.length > 0
      ? this.replacePrimaryMotiveInSet(currentSet, motiveId, demotedFromPrimaryIds, updatedAt)
      : this.addMotiveToSet(currentSet, motiveId, requestedRole, updatedAt);
    this.assertPortfolioLimits(
      nextSet.active_motive_count,
      nextSet.primary_motive_ids.length,
      nextSet.max_active_motives,
      nextSet.max_primary_motives,
      nextSet.max_parallel_routes,
    );
    const demotedMotiveIdentities = await Promise.all(demotedFromPrimaryIds.map((demotedMotiveId) =>
      this.requireMotive(implementationProjectId, demotedMotiveId)));
    return {
      nextSet,
      demotedFromPrimaryIds,
      demotedMotiveIdentities,
    };
  }

  private assertPortfolioRolesAreCoherent(roles: MotivePortfolioRoles): void {
    const allIds = this.allRoleMotiveIds(roles);
    if (new Set(allIds).size !== allIds.length) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'A motive can appear in only one portfolio role.');
    }
  }

  private assertPortfolioDecisionCoversCurrentSet(
    currentSet: CoreMotiveSet,
    nextRoles: MotivePortfolioRoles,
  ): void {
    const nextIds = new Set(this.allRoleMotiveIds(nextRoles));
    const missingIds = this.allRoleMotiveIds(this.rolesFromSet(currentSet))
      .filter((motiveId) => !nextIds.has(motiveId));
    if (missingIds.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'MotivePortfolioDecision must assign every existing motive to exactly one post-decision role.',
        { missing_motive_ids: missingIds },
      );
    }
  }

  private assertPortfolioLimits(
    activeCount: number,
    primaryCount: number,
    maxActiveMotives: number,
    maxPrimaryMotives: number,
    maxParallelRoutes: number,
  ): void {
    if (activeCount > maxActiveMotives) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Active motive count exceeds max_active_motives.');
    }
    if (primaryCount > maxPrimaryMotives) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Primary motive count exceeds max_primary_motives.');
    }
    if (activeCount > maxParallelRoutes) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Active motive count exceeds max_parallel_routes.');
    }
  }

  private assertPortfolioDecisionConfirmation(
    currentSet: CoreMotiveSet,
    request: ApplyMotivePortfolioDecisionRequest,
    nextActiveCount: number,
    confirmationLevel: string,
  ): boolean {
    const primaryChanged = !this.sameStringSet(currentSet.primary_motive_ids, request.motive_roles_after_decision.primary_motive_ids);
    const majorStructuralChange =
      primaryChanged
      || request.changes.merged_motives.length > 0
      || request.changes.split_motives.length > 0
      || request.changes.newly_abandoned.length > 0
      || nextActiveCount > currentSet.active_motive_count;
    if (majorStructuralChange && (confirmationLevel !== 'human_confirmed' || !request.confirmed_by)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Primary replacement, merge, split, abandon, or broadened active portfolio requires human confirmation.',
      );
    }
    return majorStructuralChange;
  }

  private async requireActiveHumanConfirmation(
    implementationProjectId: string,
    confirmationRecordId: string,
    expectedScope: HumanConfirmationRecord['confirmation_scope'],
    gateLabel: string,
  ): Promise<void> {
    const record = await this.confirmationRepository.findHumanConfirmationRecordById(
      implementationProjectId,
      confirmationRecordId,
    );
    if (!record) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${gateLabel} confirmation_ref must resolve to an existing HumanConfirmationRecord.`,
        { confirmation_record_id: confirmationRecordId },
      );
    }
    if (record.status !== 'active') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${gateLabel} human confirmation must be active.`,
        { confirmation_record_id: record.confirmation_record_id, status: record.status },
      );
    }
    if (record.confirmation_scope !== expectedScope) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${gateLabel} human confirmation must carry scope ${expectedScope}.`,
        { confirmation_record_id: record.confirmation_record_id, scope: record.confirmation_scope },
      );
    }
  }

  private assertEvidenceRefCanSupportBoard(ref: TopicSelectionFunctionalRef): void {
    if (!this.hasText(ref.ref_type) || !this.hasText(ref.ref_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'evidence_ref requires ref_type and ref_id.');
    }
    const normalizedRefType = this.normalizedRefType(ref.ref_type);
    if (MEMO_LIKE_EVIDENCE_REF_TYPES.has(normalizedRefType)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Board summaries, LLM summaries, rationale, and interpretation records cannot be evidence bindings.',
      );
    }
    if (TRANSFER_REQUIRED_EVIDENCE_REF_TYPES.has(normalizedRefType)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Cross-motive or cross-version evidence reuse must use EvidenceTransferBinding, not direct evidence_ref.',
      );
    }
  }

  private assertEvidenceTransferSource(
    request: CreateEvidenceTransferBindingRequest,
    sourceBoard: MotiveEvidenceBoardVersion,
    sourceBinding: EvidenceBinding,
  ): void {
    if (
      sourceBinding.board_version_id !== sourceBoard.board_version_id
      || sourceBinding.board_version_id !== request.source.board_version_id
      || sourceBinding.assertion_id !== request.source.assertion_id
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'EvidenceTransferBinding source must point to an evidence binding on the source board and assertion.',
      );
    }
    if (!sourceBoard.evidence_binding_refs.some((ref) => ref.ref_id === sourceBinding.binding_id)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'EvidenceTransferBinding source binding is not listed on the source board.',
      );
    }
  }

  private assertEvidenceTransferTarget(
    request: CreateEvidenceTransferBindingRequest,
    targetBoard: MotiveEvidenceBoardVersion,
  ): void {
    if (!targetBoard.assertion_refs.some((ref) => ref.ref_id === request.target.assertion_id)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'EvidenceTransferBinding target assertion is not listed on the target board.',
      );
    }
  }

  private assertEvidenceTransferPolicy(request: CreateEvidenceTransferBindingRequest): void {
    if (!this.hasText(request.rationale)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'EvidenceTransferBinding requires rationale.');
    }
    const scopeMatches = Object.values(request.scope_match);
    if (request.transfer_validity === 'valid' && scopeMatches.some((value) => value === 'mismatch')) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'A valid EvidenceTransferBinding cannot contain scope mismatches.',
      );
    }
    if (request.transfer_validity === 'invalid' && request.transfer_role === 'transfer_support') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Invalid transferred evidence cannot be recorded as transfer_support.',
      );
    }
  }

  private assertBoardHasRequiredAssertionPaths(
    assertions: MotiveAssertion[],
    bindings: EvidenceBinding[],
    boardState: MotiveEvidenceBoardState,
  ): void {
    const acceptableRoles = new Set(['support', 'challenge', 'contradict', 'qualify']);
    for (const assertion of assertions) {
      if (!assertion.importance.must_hold_for_motive_to_continue && assertion.importance.role !== 'core') {
        continue;
      }
      const hasPath = bindings.some((binding) =>
        binding.assertion_id === assertion.assertion_id && acceptableRoles.has(binding.role));
      if (!hasPath && boardState.accepted_risk_refs.length === 0) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `Core assertion ${assertion.assertion_id} requires support, challenge, risk, or evolution path.`,
        );
      }
    }
  }

  private resolveBoardState(
    input: Partial<MotiveEvidenceBoardState> | undefined,
    bindings: EvidenceBinding[],
  ): MotiveEvidenceBoardState {
    const freshnessStatus = input?.freshness_status
      ?? (bindings.some((binding) => binding.freshness_status !== 'fresh') ? 'recheck_required' : 'fresh');
    const challengeStatus = input?.challenge_status
      ?? (bindings.some((binding) => binding.challenge_status === 'blocking') ? 'blocking' : 'none');
    const supportState = input?.support_state
      ?? (bindings.some((binding) => binding.support_state === 'strong') ? 'strong' : 'partial');
    return {
      readiness_status: input?.readiness_status ?? 'evidence_ready',
      blocker_status: input?.blocker_status ?? (challengeStatus === 'blocking' ? 'hard_blocked' : 'none'),
      freshness_status: freshnessStatus,
      support_state: supportState,
      challenge_status: challengeStatus,
      accepted_risk_refs: input?.accepted_risk_refs ?? [],
    };
  }

  private buildPortfolioDecision(input: {
    implementationProjectId: string;
    motiveSet: CoreMotiveSet;
    changes: MotivePortfolioDecision['changes'];
    rationale: MotivePortfolioDecision['rationale'];
    proposedBy: TopicSelectionActorType;
    confirmedBy: TopicSelectionActorType | null;
    confirmationLevel: MotivePortfolioDecision['confirmation_level'];
    policyVersionId: string | null;
    createdAt: string;
    appliedAt: string | null;
  }): {
    decision: MotivePortfolioDecision;
    motiveSet: CoreMotiveSet;
  } {
    const decision: MotivePortfolioDecision = {
      portfolio_decision_id: this.idFactory('motive_portfolio_decision'),
      implementation_project_id: input.implementationProjectId,
      motive_roles_after_decision: this.rolesFromSet(input.motiveSet),
      changes: input.changes,
      rationale: input.rationale,
      active_motive_count: input.motiveSet.active_motive_count,
      max_active_motives: input.motiveSet.max_active_motives,
      max_primary_motives: input.motiveSet.max_primary_motives,
      max_parallel_routes: input.motiveSet.max_parallel_routes,
      proposed_by: input.proposedBy,
      confirmed_by: input.confirmedBy,
      confirmation_level: input.confirmationLevel,
      policy_version_id: input.policyVersionId,
      created_at: input.createdAt,
      applied_at: input.appliedAt,
    };
    return { decision, motiveSet: input.motiveSet };
  }

  private initialMotiveSet(
    implementationProjectId: string,
    createdAt: string,
    policyVersionId: string | null,
  ): CoreMotiveSet {
    return {
      motive_set_id: this.idFactory('core_motive_set'),
      implementation_project_id: implementationProjectId,
      active_motive_ids: [],
      primary_motive_ids: [],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
      active_motive_count: 0,
      max_active_motives: DEFAULT_MAX_ACTIVE_MOTIVES,
      max_primary_motives: DEFAULT_MAX_PRIMARY_MOTIVES,
      max_parallel_routes: DEFAULT_MAX_PARALLEL_ROUTES,
      latest_portfolio_decision_id: null,
      policy_version_id: policyVersionId,
      created_at: createdAt,
      updated_at: createdAt,
    };
  }

  private addMotiveToSet(
    motiveSet: CoreMotiveSet,
    motiveId: string,
    role: PaperImplementationMotivePortfolioRole,
    updatedAt: string,
  ): CoreMotiveSet {
    const roles = this.rolesFromSet(motiveSet);
    const withoutMotive: MotivePortfolioRoles = {
      primary_motive_ids: roles.primary_motive_ids.filter((id) => id !== motiveId),
      secondary_motive_ids: roles.secondary_motive_ids.filter((id) => id !== motiveId),
      fallback_motive_ids: roles.fallback_motive_ids.filter((id) => id !== motiveId),
      supporting_motive_ids: roles.supporting_motive_ids.filter((id) => id !== motiveId),
      parked_motive_ids: roles.parked_motive_ids.filter((id) => id !== motiveId),
      abandoned_motive_ids: roles.abandoned_motive_ids.filter((id) => id !== motiveId),
    };
    this.roleBucket(withoutMotive, role).push(motiveId);
    const activeMotiveIds = this.activeMotiveIds(withoutMotive);
    return {
      ...motiveSet,
      active_motive_ids: activeMotiveIds,
      primary_motive_ids: withoutMotive.primary_motive_ids,
      secondary_motive_ids: withoutMotive.secondary_motive_ids,
      fallback_motive_ids: withoutMotive.fallback_motive_ids,
      supporting_motive_ids: withoutMotive.supporting_motive_ids,
      parked_motive_ids: withoutMotive.parked_motive_ids,
      abandoned_motive_ids: withoutMotive.abandoned_motive_ids,
      active_motive_count: activeMotiveIds.length,
      updated_at: updatedAt,
    };
  }

  private replacePrimaryMotiveInSet(
    motiveSet: CoreMotiveSet,
    motiveId: string,
    demotedFromPrimaryIds: string[],
    updatedAt: string,
  ): CoreMotiveSet {
    const roles = this.rolesFromSet(motiveSet);
    const demotedSet = new Set(demotedFromPrimaryIds);
    const nextRoles: MotivePortfolioRoles = {
      primary_motive_ids: roles.primary_motive_ids
        .filter((id) => id !== motiveId && !demotedSet.has(id)),
      secondary_motive_ids: roles.secondary_motive_ids.filter((id) => id !== motiveId),
      fallback_motive_ids: roles.fallback_motive_ids.filter((id) => id !== motiveId),
      supporting_motive_ids: roles.supporting_motive_ids.filter((id) => id !== motiveId),
      parked_motive_ids: roles.parked_motive_ids.filter((id) => id !== motiveId),
      abandoned_motive_ids: roles.abandoned_motive_ids.filter((id) => id !== motiveId),
    };
    for (const demotedMotiveId of demotedFromPrimaryIds) {
      this.appendUnique(nextRoles.secondary_motive_ids, demotedMotiveId);
    }
    this.appendUnique(nextRoles.primary_motive_ids, motiveId);
    const activeMotiveIds = this.activeMotiveIds(nextRoles);
    return {
      ...motiveSet,
      active_motive_ids: activeMotiveIds,
      primary_motive_ids: nextRoles.primary_motive_ids,
      secondary_motive_ids: nextRoles.secondary_motive_ids,
      fallback_motive_ids: nextRoles.fallback_motive_ids,
      supporting_motive_ids: nextRoles.supporting_motive_ids,
      parked_motive_ids: nextRoles.parked_motive_ids,
      abandoned_motive_ids: nextRoles.abandoned_motive_ids,
      active_motive_count: activeMotiveIds.length,
      updated_at: updatedAt,
    };
  }

  private rolesFromSet(motiveSet: CoreMotiveSet): MotivePortfolioRoles {
    return {
      primary_motive_ids: [...motiveSet.primary_motive_ids],
      secondary_motive_ids: [...motiveSet.secondary_motive_ids],
      fallback_motive_ids: [...motiveSet.fallback_motive_ids],
      supporting_motive_ids: [...motiveSet.supporting_motive_ids],
      parked_motive_ids: [...motiveSet.parked_motive_ids],
      abandoned_motive_ids: [...motiveSet.abandoned_motive_ids],
    };
  }

  private roleBucket(
    roles: MotivePortfolioRoles,
    role: PaperImplementationMotivePortfolioRole,
  ): string[] {
    switch (role) {
      case 'primary':
        return roles.primary_motive_ids;
      case 'secondary':
        return roles.secondary_motive_ids;
      case 'fallback':
        return roles.fallback_motive_ids;
      case 'supporting':
        return roles.supporting_motive_ids;
      case 'abandoned':
        return roles.abandoned_motive_ids;
      case 'parked':
      default:
        return roles.parked_motive_ids;
    }
  }

  private roleForMotive(
    roles: MotivePortfolioRoles,
    motiveId: string,
  ): PaperImplementationMotivePortfolioRole {
    if (roles.primary_motive_ids.includes(motiveId)) {
      return 'primary';
    }
    if (roles.secondary_motive_ids.includes(motiveId)) {
      return 'secondary';
    }
    if (roles.fallback_motive_ids.includes(motiveId)) {
      return 'fallback';
    }
    if (roles.supporting_motive_ids.includes(motiveId)) {
      return 'supporting';
    }
    if (roles.abandoned_motive_ids.includes(motiveId)) {
      return 'abandoned';
    }
    return 'parked';
  }

  private lifecycleForRole(
    role: PaperImplementationMotivePortfolioRole,
  ): CoreMotiveIdentity['lifecycle_status'] {
    if (role === 'abandoned') {
      return 'abandoned';
    }
    if (role === 'parked') {
      return 'parked';
    }
    return 'active';
  }

  private defaultAdmittedRole(
    motiveSet: CoreMotiveSet,
    motiveId: string,
  ): PaperImplementationMotivePortfolioRole {
    const currentRole = this.roleForMotive(this.rolesFromSet(motiveSet), motiveId);
    if (currentRole !== 'parked' && currentRole !== 'abandoned') {
      return currentRole;
    }
    return motiveSet.primary_motive_ids.length === 0 ? 'primary' : 'secondary';
  }

  private activeMotiveIds(roles: MotivePortfolioRoles): string[] {
    return [
      ...roles.primary_motive_ids,
      ...roles.secondary_motive_ids,
      ...roles.fallback_motive_ids,
      ...roles.supporting_motive_ids,
    ];
  }

  private activeMotiveCount(roles: MotivePortfolioRoles): number {
    return this.activeMotiveIds(roles).length;
  }

  private allRoleMotiveIds(roles: MotivePortfolioRoles): string[] {
    return [
      ...roles.primary_motive_ids,
      ...roles.secondary_motive_ids,
      ...roles.fallback_motive_ids,
      ...roles.supporting_motive_ids,
      ...roles.parked_motive_ids,
      ...roles.abandoned_motive_ids,
    ];
  }

  private sameStringSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
  }

  private normalizedRefType(refType: string): string {
    return refType.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private appendUnique(values: string[], value: string): void {
    if (!values.includes(value)) {
      values.push(value);
    }
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
