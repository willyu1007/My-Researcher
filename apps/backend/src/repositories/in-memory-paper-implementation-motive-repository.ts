import type {
  CoreMotiveDraftResponse,
  CoreMotiveIdentity,
  CoreMotiveSet,
  CoreMotiveVersion,
  CoreMotiveVersionState,
  CrossBoardReview,
  EvidenceBinding,
  EvidenceTransferBinding,
  MotiveAssertion,
  MotiveEvidenceBoardVersion,
  MotiveEvolutionDecision,
  MotivePortfolioDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  AdmitCoreMotiveVersionPersistence,
  MotiveEvidenceBoardPersistence,
  MotivePortfolioDecisionPersistence,
  PaperImplementationMotiveRepository,
} from './paper-implementation-motive.repository.js';

export class InMemoryPaperImplementationMotiveRepository
implements PaperImplementationMotiveRepository {
  private readonly motiveIdentities = new Map<string, CoreMotiveIdentity>();
  private readonly motiveIdentityIdsByProject = new Map<string, string[]>();
  private readonly motiveSetsByProject = new Map<string, CoreMotiveSet>();
  private readonly coreMotiveVersions = new Map<string, CoreMotiveVersion>();
  private readonly versionIdsByMotive = new Map<string, string[]>();
  private readonly motiveVersionStatesByVersion = new Map<string, CoreMotiveVersionState>();
  private readonly assertions = new Map<string, MotiveAssertion>();
  private readonly assertionIdsByVersion = new Map<string, string[]>();
  private readonly boardVersions = new Map<string, MotiveEvidenceBoardVersion>();
  private readonly boardVersionIdsByProject = new Map<string, string[]>();
  private readonly evidenceBindings = new Map<string, EvidenceBinding>();
  private readonly evidenceTransferBindings = new Map<string, EvidenceTransferBinding>();
  private readonly evidenceTransferBindingIdsByProject = new Map<string, string[]>();
  private readonly crossBoardReviews = new Map<string, CrossBoardReview>();
  private readonly portfolioDecisions = new Map<string, MotivePortfolioDecision>();
  private readonly portfolioDecisionIdsByProject = new Map<string, string[]>();
  private readonly evolutionDecisions = new Map<string, MotiveEvolutionDecision>();

  async createCoreMotiveDraft(
    draft: CoreMotiveDraftResponse,
  ): Promise<CoreMotiveDraftResponse> {
    const existingIdentity = this.motiveIdentities.get(draft.motive_identity.motive_id);
    if (
      existingIdentity
      && existingIdentity.implementation_project_id !== draft.motive_identity.implementation_project_id
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CoreMotiveIdentity ${draft.motive_identity.motive_id} already exists for a different project.`,
      );
    }
    this.assertNewId(this.coreMotiveVersions, draft.core_motive_version.core_motive_version_id, 'CoreMotiveVersion');
    this.assertNoMotiveSetConflict(draft.motive_set);
    if (this.motiveVersionStatesByVersion.has(draft.motive_version_state.core_motive_version_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CoreMotiveVersionState already exists for this version.');
    }
    for (const assertion of draft.assertions) {
      this.assertNewId(this.assertions, assertion.assertion_id, 'MotiveAssertion');
    }

    this.motiveIdentities.set(draft.motive_identity.motive_id, structuredClone(draft.motive_identity));
    if (!existingIdentity) {
      this.pushId(
        this.motiveIdentityIdsByProject,
        draft.motive_identity.implementation_project_id,
        draft.motive_identity.motive_id,
      );
    }
    this.motiveSetsByProject.set(draft.motive_set.implementation_project_id, structuredClone(draft.motive_set));
    this.coreMotiveVersions.set(
      draft.core_motive_version.core_motive_version_id,
      structuredClone(draft.core_motive_version),
    );
    this.pushId(
      this.versionIdsByMotive,
      draft.core_motive_version.motive_id,
      draft.core_motive_version.core_motive_version_id,
    );
    this.motiveVersionStatesByVersion.set(
      draft.motive_version_state.core_motive_version_id,
      structuredClone(draft.motive_version_state),
    );
    for (const assertion of draft.assertions) {
      this.assertions.set(assertion.assertion_id, structuredClone(assertion));
      this.pushId(this.assertionIdsByVersion, assertion.core_motive_version_id, assertion.assertion_id);
    }
    return structuredClone(draft);
  }

  async findMotiveIdentityById(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveIdentity | null> {
    const motive = this.motiveIdentities.get(motiveId);
    if (!motive || motive.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(motive);
  }

  async listMotiveIdentities(
    implementationProjectId: string,
  ): Promise<CoreMotiveIdentity[]> {
    return (this.motiveIdentityIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.motiveIdentities.get(id))
      .filter((motive): motive is CoreMotiveIdentity => Boolean(motive))
      .map((motive) => structuredClone(motive));
  }

  async findMotiveSet(
    implementationProjectId: string,
  ): Promise<CoreMotiveSet | null> {
    const motiveSet = this.motiveSetsByProject.get(implementationProjectId);
    return motiveSet ? structuredClone(motiveSet) : null;
  }

  async findCoreMotiveVersionById(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersion | null> {
    const version = this.coreMotiveVersions.get(coreMotiveVersionId);
    if (!version || version.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(version);
  }

  async listCoreMotiveVersions(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveVersion[]> {
    return (this.versionIdsByMotive.get(motiveId) ?? [])
      .map((id) => this.coreMotiveVersions.get(id))
      .filter((version): version is CoreMotiveVersion => Boolean(version))
      .filter((version) => version.implementation_project_id === implementationProjectId)
      .map((version) => structuredClone(version));
  }

  async findMotiveVersionStateByVersionId(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersionState | null> {
    const state = this.motiveVersionStatesByVersion.get(coreMotiveVersionId);
    if (!state || state.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(state);
  }

  async listAssertionsByVersion(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<MotiveAssertion[]> {
    return (this.assertionIdsByVersion.get(coreMotiveVersionId) ?? [])
      .map((id) => this.assertions.get(id))
      .filter((assertion): assertion is MotiveAssertion => Boolean(assertion))
      .filter((assertion) => assertion.implementation_project_id === implementationProjectId)
      .map((assertion) => structuredClone(assertion));
  }

  async admitCoreMotiveVersion(
    persistence: AdmitCoreMotiveVersionPersistence,
  ): Promise<AdmitCoreMotiveVersionPersistence> {
    this.assertExistingCoreObjects(persistence);
    const storedVersion = this.coreMotiveVersions.get(
      persistence.core_motive_version.core_motive_version_id,
    );
    if (storedVersion?.version_status !== 'draft') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only one CoreMotiveVersion admission may win.');
    }
    this.assertNewId(
      this.portfolioDecisions,
      persistence.portfolio_decision.portfolio_decision_id,
      'MotivePortfolioDecision',
    );

    this.motiveIdentities.set(
      persistence.motive_identity.motive_id,
      structuredClone(persistence.motive_identity),
    );
    for (const motive of persistence.additional_motive_identities ?? []) {
      if (!this.motiveIdentities.has(motive.motive_id)) {
        throw new AppError(404, 'NOT_FOUND', `CoreMotiveIdentity ${motive.motive_id} not found.`);
      }
      this.motiveIdentities.set(motive.motive_id, structuredClone(motive));
    }
    this.motiveSetsByProject.set(
      persistence.motive_set.implementation_project_id,
      structuredClone(persistence.motive_set),
    );
    this.coreMotiveVersions.set(
      persistence.core_motive_version.core_motive_version_id,
      structuredClone(persistence.core_motive_version),
    );
    this.motiveVersionStatesByVersion.set(
      persistence.motive_version_state.core_motive_version_id,
      structuredClone(persistence.motive_version_state),
    );
    this.storePortfolioDecision(persistence.portfolio_decision);
    return structuredClone(persistence);
  }

  async createMotiveEvidenceBoardVersion(
    persistence: MotiveEvidenceBoardPersistence,
  ): Promise<MotiveEvidenceBoardPersistence> {
    this.assertNewId(this.boardVersions, persistence.board_version.board_version_id, 'MotiveEvidenceBoardVersion');
    for (const binding of persistence.evidence_bindings) {
      this.assertNewId(this.evidenceBindings, binding.binding_id, 'EvidenceBinding');
    }
    if (!this.motiveVersionStatesByVersion.has(persistence.motive_version_state.core_motive_version_id)) {
      throw new AppError(404, 'NOT_FOUND', 'CoreMotiveVersionState not found.');
    }

    this.boardVersions.set(persistence.board_version.board_version_id, structuredClone(persistence.board_version));
    this.pushId(
      this.boardVersionIdsByProject,
      persistence.board_version.implementation_project_id,
      persistence.board_version.board_version_id,
    );
    for (const binding of persistence.evidence_bindings) {
      this.evidenceBindings.set(binding.binding_id, structuredClone(binding));
    }
    this.motiveVersionStatesByVersion.set(
      persistence.motive_version_state.core_motive_version_id,
      structuredClone(persistence.motive_version_state),
    );
    return structuredClone(persistence);
  }

  async listMotiveEvidenceBoards(
    implementationProjectId: string,
  ): Promise<MotiveEvidenceBoardVersion[]> {
    return (this.boardVersionIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.boardVersions.get(id))
      .filter((board): board is MotiveEvidenceBoardVersion => Boolean(board))
      .map((board) => structuredClone(board));
  }

  async findMotiveEvidenceBoardById(
    implementationProjectId: string,
    boardVersionId: string,
  ): Promise<MotiveEvidenceBoardVersion | null> {
    const board = this.boardVersions.get(boardVersionId);
    if (!board || board.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(board);
  }

  async findEvidenceBindingById(
    implementationProjectId: string,
    evidenceBindingId: string,
  ): Promise<EvidenceBinding | null> {
    const binding = this.evidenceBindings.get(evidenceBindingId);
    if (!binding || binding.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(binding);
  }

  async createEvidenceTransferBinding(
    transfer: EvidenceTransferBinding,
  ): Promise<EvidenceTransferBinding> {
    this.assertNewId(this.evidenceTransferBindings, transfer.transfer_id, 'EvidenceTransferBinding');
    this.evidenceTransferBindings.set(transfer.transfer_id, structuredClone(transfer));
    this.pushId(
      this.evidenceTransferBindingIdsByProject,
      transfer.implementation_project_id,
      transfer.transfer_id,
    );
    return structuredClone(transfer);
  }

  async listEvidenceTransferBindings(
    implementationProjectId: string,
  ): Promise<EvidenceTransferBinding[]> {
    return (this.evidenceTransferBindingIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.evidenceTransferBindings.get(id))
      .filter((transfer): transfer is EvidenceTransferBinding => Boolean(transfer))
      .map((transfer) => structuredClone(transfer));
  }

  async createCrossBoardReview(
    review: CrossBoardReview,
  ): Promise<CrossBoardReview> {
    this.assertNewId(this.crossBoardReviews, review.cross_board_review_id, 'CrossBoardReview');
    this.crossBoardReviews.set(review.cross_board_review_id, structuredClone(review));
    return structuredClone(review);
  }

  async createMotivePortfolioDecision(
    persistence: MotivePortfolioDecisionPersistence,
  ): Promise<MotivePortfolioDecisionPersistence> {
    this.assertNewId(
      this.portfolioDecisions,
      persistence.portfolio_decision.portfolio_decision_id,
      'MotivePortfolioDecision',
    );
    this.motiveSetsByProject.set(
      persistence.motive_set.implementation_project_id,
      structuredClone(persistence.motive_set),
    );
    for (const motive of persistence.motive_identities) {
      if (!this.motiveIdentities.has(motive.motive_id)) {
        throw new AppError(404, 'NOT_FOUND', `CoreMotiveIdentity ${motive.motive_id} not found.`);
      }
      this.motiveIdentities.set(motive.motive_id, structuredClone(motive));
    }
    this.storePortfolioDecision(persistence.portfolio_decision);
    return structuredClone(persistence);
  }

  async listMotivePortfolioDecisions(
    implementationProjectId: string,
  ): Promise<MotivePortfolioDecision[]> {
    return (this.portfolioDecisionIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.portfolioDecisions.get(id))
      .filter((decision): decision is MotivePortfolioDecision => Boolean(decision))
      .map((decision) => structuredClone(decision));
  }

  async createMotiveEvolutionDecision(
    decision: MotiveEvolutionDecision,
  ): Promise<MotiveEvolutionDecision> {
    this.assertNewId(
      this.evolutionDecisions,
      decision.motive_evolution_decision_id,
      'MotiveEvolutionDecision',
    );
    this.evolutionDecisions.set(decision.motive_evolution_decision_id, structuredClone(decision));
    return structuredClone(decision);
  }

  async findMotiveEvolutionDecisionById(
    implementationProjectId: string,
    motiveEvolutionDecisionId: string,
  ): Promise<MotiveEvolutionDecision | null> {
    const decision = this.evolutionDecisions.get(motiveEvolutionDecisionId);
    if (!decision || decision.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(decision);
  }

  private assertExistingCoreObjects(persistence: AdmitCoreMotiveVersionPersistence): void {
    if (!this.motiveIdentities.has(persistence.motive_identity.motive_id)) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveIdentity ${persistence.motive_identity.motive_id} not found.`);
    }
    if (!this.coreMotiveVersions.has(persistence.core_motive_version.core_motive_version_id)) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveVersion ${persistence.core_motive_version.core_motive_version_id} not found.`);
    }
    if (!this.motiveVersionStatesByVersion.has(persistence.motive_version_state.core_motive_version_id)) {
      throw new AppError(404, 'NOT_FOUND', 'CoreMotiveVersionState not found.');
    }
  }

  private assertNoMotiveSetConflict(next: CoreMotiveSet): void {
    const existing = this.motiveSetsByProject.get(next.implementation_project_id);
    if (!existing) {
      return;
    }
    if (existing.motive_set_id !== next.motive_set_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CoreMotiveSet already exists for ImplementationProject ${next.implementation_project_id}.`,
      );
    }
  }

  private storePortfolioDecision(decision: MotivePortfolioDecision): void {
    this.portfolioDecisions.set(decision.portfolio_decision_id, structuredClone(decision));
    this.pushId(
      this.portfolioDecisionIdsByProject,
      decision.implementation_project_id,
      decision.portfolio_decision_id,
    );
  }

  private assertNewId<T>(map: Map<string, T>, id: string, label: string): void {
    if (map.has(id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
    }
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }
}
