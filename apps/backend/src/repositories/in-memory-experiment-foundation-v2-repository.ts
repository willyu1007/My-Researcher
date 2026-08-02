import type {
  ExperimentFoundationAssetLifecycleEventV2,
  ExperimentFoundationAssetLifecycleProjectionV2,
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationReadinessDependencyV2,
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2AssetRevisionRecord,
  type ExperimentFoundationV2FreezeReplayRecord,
  type ExperimentFoundationV2ReadinessIdentity,
  type ExperimentFoundationV2ReadinessScope,
  type ExperimentFoundationV2Repository,
  type ExperimentFoundationV2UnitOfWork,
} from './experiment-foundation-v2.repository.js';
import {
  ExperimentFoundationPromotionV2RepositoryConstraintError,
  type ExperimentFoundationPreparationCandidateV2Record,
  type ExperimentFoundationPromotionCommandReceiptV2Record,
  type ExperimentFoundationPromotionDecisionV2Record,
  type ExperimentFoundationPromotionOutboxV2Record,
  type ExperimentFoundationPromotionV2Repository,
  type ExperimentFoundationPromotionV2UnitOfWork,
} from './experiment-foundation-promotion-v2.repository.js';

interface InMemoryExperimentFoundationV2State {
  assets: Map<string, ExperimentFoundationV2AssetIdentityRecord>;
  assetLogicalIdByFamilyKey: Map<string, string>;
  revisions: Map<string, ExperimentFoundationV2AssetRevisionRecord>;
  revisionByLogicalHash: Map<string, string>;
  revisionByLogicalSequence: Map<string, string>;
  freezeReplays: Map<string, ExperimentFoundationV2FreezeReplayRecord>;
  lifecycleEvents: Map<string, ExperimentFoundationAssetLifecycleEventV2>;
  lifecycleProjections: Map<string, ExperimentFoundationAssetLifecycleProjectionV2>;
  readinessAttestations: Map<string, ExperimentFoundationReadinessAttestationV2>;
  readinessByIdentity: Map<string, string>;
  readinessDependencies: Map<string, ExperimentFoundationReadinessDependencyV2[]>;
  promotionCandidates: Map<string, ExperimentFoundationPreparationCandidateV2Record>;
  promotionDecisions: Map<string, ExperimentFoundationPromotionDecisionV2Record>;
  promotionDecisionByCandidate: Map<string, string>;
  promotionReceipts: Map<string, ExperimentFoundationPromotionCommandReceiptV2Record>;
  promotionOutboxByDecision: Map<string, ExperimentFoundationPromotionOutboxV2Record>;
}

/**
 * Injection-only fake. Each callback mutates a private copy and becomes visible
 * only after successful completion, matching an EF-local database transaction.
 */
export class InMemoryExperimentFoundationV2Repository
implements ExperimentFoundationV2Repository, ExperimentFoundationPromotionV2Repository {
  private state = emptyState();
  private transactionTail: Promise<void> = Promise.resolve();

  async runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    let releaseTransaction!: () => void;
    const previousTransaction = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    await previousTransaction;
    const workingState = cloneState(this.state);
    try {
      const result = await operation(new InMemoryExperimentFoundationV2UnitOfWork(workingState));
      this.state = workingState;
      return result;
    } finally {
      releaseTransaction();
    }
  }

  async runPromotionInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationPromotionV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.runSerializedTransaction(operation);
  }

  private async runSerializedTransaction<T>(
    operation: (unitOfWork: InMemoryExperimentFoundationV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    let releaseTransaction!: () => void;
    const previousTransaction = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    await previousTransaction;
    const workingState = cloneState(this.state);
    try {
      const unitOfWork = new InMemoryExperimentFoundationV2UnitOfWork(workingState);
      const result = await operation(unitOfWork);
      this.state = workingState;
      return result;
    } finally {
      releaseTransaction();
    }
  }
}

class InMemoryExperimentFoundationV2UnitOfWork
implements ExperimentFoundationV2UnitOfWork, ExperimentFoundationPromotionV2UnitOfWork {
  constructor(private readonly state: InMemoryExperimentFoundationV2State) {}

  async lockPreparationCandidate(): Promise<void> {
    // runPromotionInTransaction already serializes the in-memory aggregate.
  }

  async findAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord | null> {
    return cloneNullable(this.state.assets.get(assetKey(assetType, logicalId)));
  }

  async insertAssetIdentity(record: ExperimentFoundationV2AssetIdentityRecord): Promise<void> {
    const key = assetKey(record.asset_type, record.asset.logical_id);
    const familyKey = assetFamilyKey(record);
    const familyKeyIndex = assetFamilyKeyIndex(record.asset_type, familyKey);
    if (
      assetDraftFamilyKey(record) !== familyKey
      || familyKey.length === 0
      || this.state.assets.has(key)
      || this.state.assetLogicalIdByFamilyKey.has(familyKeyIndex)
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'ASSET_IDENTITY_CONFLICT',
        `Asset identity or semantic family key already exists: ${key}:${familyKey}`,
      );
    }
    this.state.assets.set(key, clone(record));
    this.state.assetLogicalIdByFamilyKey.set(familyKeyIndex, record.asset.logical_id);
  }

  async compareAndSwapAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationV2AssetIdentityRecord,
  ): Promise<boolean> {
    const key = assetKey(assetType, logicalId);
    const current = this.state.assets.get(key);
    if (
      !current
      || current.asset.draft_state_version !== expectedStateVersion
      || next.asset_type !== assetType
      || next.asset.logical_id !== logicalId
    ) {
      return false;
    }
    if (
      assetFamilyKey(current) !== assetFamilyKey(next)
      || assetDraftFamilyKey(next) !== assetFamilyKey(next)
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'ASSET_IDENTITY_CONFLICT',
        `Asset semantic family key cannot be renamed: ${key}`,
      );
    }
    this.state.assets.set(key, clone(next));
    return true;
  }

  async findAssetRevisionById(
    assetType: ExperimentFoundationV2AssetType,
    revisionId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null> {
    return cloneNullable(this.state.revisions.get(revisionIdKey(assetType, revisionId)));
  }

  async findAssetRevisionByContentHash(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null> {
    const revisionId = this.state.revisionByLogicalHash.get(
      revisionLogicalHashKey(assetType, logicalId, contentHash),
    );
    if (!revisionId) {
      return null;
    }
    return this.findAssetRevisionById(assetType, revisionId);
  }

  async listAssetRevisions(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord[]> {
    return [...this.state.revisions.values()]
      .filter((record) => (
        record.asset_type === assetType && record.revision.logical_id === logicalId
      ))
      .sort((left, right) => left.revision.revision_sequence - right.revision.revision_sequence)
      .map((record) => clone(record));
  }

  async insertAssetRevision(record: ExperimentFoundationV2AssetRevisionRecord): Promise<void> {
    const idKey = revisionIdKey(record.asset_type, record.revision.revision_id);
    const hashKey = revisionLogicalHashKey(
      record.asset_type,
      record.revision.logical_id,
      record.revision.content_hash,
    );
    const sequenceKey = revisionLogicalSequenceKey(
      record.asset_type,
      record.revision.logical_id,
      record.revision.revision_sequence,
    );
    if (
      this.state.revisions.has(idKey)
      || this.state.revisionByLogicalHash.has(hashKey)
      || this.state.revisionByLogicalSequence.has(sequenceKey)
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'ASSET_REVISION_CONFLICT',
        `Asset revision uniqueness conflict: ${idKey}`,
      );
    }
    this.state.revisions.set(idKey, clone(record));
    this.state.revisionByLogicalHash.set(hashKey, record.revision.revision_id);
    this.state.revisionByLogicalSequence.set(sequenceKey, record.revision.revision_id);
  }

  async findFreezeReplay(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationV2FreezeReplayRecord | null> {
    return cloneNullable(this.state.freezeReplays.get(
      freezeReplayKey(assetType, logicalId, businessIdempotencyKey),
    ));
  }

  async insertFreezeReplay(record: ExperimentFoundationV2FreezeReplayRecord): Promise<void> {
    const key = freezeReplayKey(
      record.asset_type,
      record.logical_id,
      record.business_idempotency_key,
    );
    const current = this.state.freezeReplays.get(key);
    if (current) {
      if (current.content_hash !== record.content_hash || current.revision_id !== record.revision_id) {
        throw new ExperimentFoundationV2RepositoryConstraintError(
          'FREEZE_IDEMPOTENCY_CONFLICT',
          `Freeze idempotency key was reused with changed content: ${key}`,
        );
      }
      return;
    }
    this.state.freezeReplays.set(key, clone(record));
  }

  async listLifecycleEvents(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleEventV2[]> {
    const key = exactRevisionKey(asset);
    return [...this.state.lifecycleEvents.values()]
      .filter((event) => exactRevisionKey(event.asset) === key)
      .sort((left, right) => left.lifecycle_sequence - right.lifecycle_sequence)
      .map((event) => clone(event));
  }

  async findLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleProjectionV2 | null> {
    return cloneNullable(this.state.lifecycleProjections.get(exactRevisionKey(asset)));
  }

  async appendLifecycleEvent(event: ExperimentFoundationAssetLifecycleEventV2): Promise<void> {
    if (this.state.lifecycleEvents.has(event.lifecycle_event_id)) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'LIFECYCLE_EVENT_CONFLICT',
        `Lifecycle event already exists: ${event.lifecycle_event_id}`,
      );
    }
    const duplicateSequence = [...this.state.lifecycleEvents.values()].some((candidate) => (
      exactRevisionKey(candidate.asset) === exactRevisionKey(event.asset)
      && candidate.lifecycle_sequence === event.lifecycle_sequence
    ));
    if (duplicateSequence) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'LIFECYCLE_EVENT_CONFLICT',
        `Lifecycle sequence already exists for ${exactRevisionKey(event.asset)}`,
      );
    }
    this.state.lifecycleEvents.set(event.lifecycle_event_id, clone(event));
  }

  async compareAndSwapLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
    expectedStateVersion: number | null,
    next: ExperimentFoundationAssetLifecycleProjectionV2,
  ): Promise<boolean> {
    const key = exactRevisionKey(asset);
    const current = this.state.lifecycleProjections.get(key);
    if (
      exactRevisionKey(next.asset) !== key
      || (expectedStateVersion === null && current)
      || (expectedStateVersion !== null && current?.projection_state_version !== expectedStateVersion)
    ) {
      return false;
    }
    this.state.lifecycleProjections.set(key, clone(next));
    return true;
  }

  async findReadinessAttestation(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    return cloneNullable(this.state.readinessAttestations.get(readinessAttestationId));
  }

  async findReadinessAttestationByIdentity(
    identity: ExperimentFoundationV2ReadinessIdentity,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    const attestationId = this.state.readinessByIdentity.get(readinessIdentityKey(identity));
    if (!attestationId) {
      return null;
    }
    return this.findReadinessAttestation(attestationId);
  }

  async findPassedReadinessAttestationForExactScope(
    scope: ExperimentFoundationV2ReadinessScope,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    const matching = [...this.state.readinessAttestations.values()]
      .filter((attestation) => (
        attestation.status === 'passed'
        && exactRevisionKey(attestation.target) === exactRevisionKey(scope.target)
        && attestation.evaluator_profile_hash === scope.evaluator_profile_hash
        && attestation.dependency_manifest_hash === scope.dependency_manifest_hash
      ))
      .sort((left, right) => {
        const byCreatedAt = right.created_at.localeCompare(left.created_at);
        return byCreatedAt || right.readiness_attestation_id.localeCompare(left.readiness_attestation_id);
      });
    return cloneNullable(matching[0]);
  }

  async listReadinessDependencies(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessDependencyV2[]> {
    return (this.state.readinessDependencies.get(readinessAttestationId) ?? [])
      .map((dependency) => clone(dependency))
      .sort((left, right) => left.ordinal - right.ordinal);
  }

  async insertReadinessAttestation(
    attestation: ExperimentFoundationReadinessAttestationV2,
    dependencies: ExperimentFoundationReadinessDependencyV2[],
  ): Promise<void> {
    const identity: ExperimentFoundationV2ReadinessIdentity = {
      target: attestation.target,
      evaluator_profile_hash: attestation.evaluator_profile_hash,
      dependency_manifest_hash: attestation.dependency_manifest_hash,
      attestation_hash: readinessAttestationHash(attestation),
    };
    const identityKey = readinessIdentityKey(identity);
    if (
      this.state.readinessAttestations.has(attestation.readiness_attestation_id)
      || this.state.readinessByIdentity.has(identityKey)
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'READINESS_ATTESTATION_CONFLICT',
        `Readiness attestation already exists: ${attestation.readiness_attestation_id}`,
      );
    }

    const ordered = [...dependencies].sort((left, right) => left.ordinal - right.ordinal);
    const exactKeys = new Set<string>();
    for (let index = 0; index < ordered.length; index += 1) {
      const dependency = ordered[index];
      const expectedOrdinal = index + 1;
      const key = exactRevisionKey(dependency.dependency);
      if (
        dependency.readiness_attestation_id !== attestation.readiness_attestation_id
        || dependency.ordinal !== expectedOrdinal
        || exactKeys.has(key)
      ) {
        throw new ExperimentFoundationV2RepositoryConstraintError(
          'READINESS_DEPENDENCY_CONFLICT',
          `Invalid readiness dependency at ordinal ${dependency.ordinal}`,
        );
      }
      exactKeys.add(key);
    }

    this.state.readinessAttestations.set(attestation.readiness_attestation_id, clone(attestation));
    this.state.readinessByIdentity.set(identityKey, attestation.readiness_attestation_id);
    this.state.readinessDependencies.set(
      attestation.readiness_attestation_id,
      ordered.map((dependency) => clone(dependency)),
    );
  }

  async findPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPreparationCandidateV2Record | null> {
    return cloneNullable(this.state.promotionCandidates.get(
      promotionCandidateKey(candidateId, candidateRevision),
    ));
  }

  async insertPreparationCandidate(
    record: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<void> {
    const key = promotionCandidateKey(
      record.candidate.candidate_id,
      record.candidate.candidate_revision,
    );
    const duplicateAssetRevision = [...this.state.promotionCandidates.values()].some((candidate) => (
      candidate.candidate.asset_type === record.candidate.asset_type
      && candidate.candidate.logical_id === record.candidate.logical_id
      && candidate.candidate.candidate_revision === record.candidate.candidate_revision
    ));
    if (this.state.promotionCandidates.has(key) || duplicateAssetRevision) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_CANDIDATE_CONFLICT',
        `Preparation candidate already exists: ${key}`,
      );
    }
    this.state.promotionCandidates.set(key, clone(record));
  }

  async compareAndSwapPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
    expectedStateVersion: number,
    next: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<boolean> {
    const key = promotionCandidateKey(candidateId, candidateRevision);
    const current = this.state.promotionCandidates.get(key);
    if (
      !current
      || current.state_version !== expectedStateVersion
      || next.candidate.candidate_id !== candidateId
      || next.candidate.candidate_revision !== candidateRevision
    ) {
      return false;
    }
    this.state.promotionCandidates.set(key, clone(next));
    return true;
  }

  async findPromotionDecisionByCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null> {
    const decisionId = this.state.promotionDecisionByCandidate.get(
      promotionCandidateKey(candidateId, candidateRevision),
    );
    return decisionId ? cloneNullable(this.state.promotionDecisions.get(decisionId)) : null;
  }

  async findPromotionDecisionById(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null> {
    return cloneNullable(this.state.promotionDecisions.get(promotionDecisionId));
  }

  async insertPromotionDecision(record: ExperimentFoundationPromotionDecisionV2Record): Promise<void> {
    const candidateKey = promotionCandidateKey(
      record.decision.candidate_id,
      record.decision.candidate_revision,
    );
    if (
      this.state.promotionDecisions.has(record.decision.promotion_decision_id)
      || this.state.promotionDecisionByCandidate.has(candidateKey)
    ) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_DECISION_CONFLICT',
        `Promotion decision already exists: ${candidateKey}`,
      );
    }
    this.state.promotionDecisions.set(record.decision.promotion_decision_id, clone(record));
    this.state.promotionDecisionByCandidate.set(
      candidateKey,
      record.decision.promotion_decision_id,
    );
  }

  async findPromotionCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationPromotionCommandReceiptV2Record | null> {
    return cloneNullable(this.state.promotionReceipts.get(businessIdempotencyKey));
  }

  async insertPromotionCommandReceipt(
    record: ExperimentFoundationPromotionCommandReceiptV2Record,
  ): Promise<void> {
    const current = this.state.promotionReceipts.get(record.business_idempotency_key);
    if (current) {
      if (
        current.command_hash === record.command_hash
        && current.promotion_decision_id === record.promotion_decision_id
      ) {
        return;
      }
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_IDEMPOTENCY_CONFLICT',
        `Promotion idempotency key has drifted: ${record.business_idempotency_key}`,
      );
    }
    this.state.promotionReceipts.set(record.business_idempotency_key, clone(record));
  }

  async findPromotionOutboxByDecision(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionOutboxV2Record | null> {
    return cloneNullable(this.state.promotionOutboxByDecision.get(promotionDecisionId));
  }

  async insertPromotionOutbox(record: ExperimentFoundationPromotionOutboxV2Record): Promise<void> {
    if (this.state.promotionOutboxByDecision.has(record.promotion_decision_id)) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_OUTBOX_CONFLICT',
        `Promotion outbox already exists: ${record.promotion_decision_id}`,
      );
    }
    this.state.promotionOutboxByDecision.set(record.promotion_decision_id, clone(record));
  }

  bindPromotionCanonicalRevision(): void {
    // In-memory revisions have no pending commit guard. Prisma clears its
    // pending-revision invariant through the same method.
  }
}

function emptyState(): InMemoryExperimentFoundationV2State {
  return {
    assets: new Map(),
    assetLogicalIdByFamilyKey: new Map(),
    revisions: new Map(),
    revisionByLogicalHash: new Map(),
    revisionByLogicalSequence: new Map(),
    freezeReplays: new Map(),
    lifecycleEvents: new Map(),
    lifecycleProjections: new Map(),
    readinessAttestations: new Map(),
    readinessByIdentity: new Map(),
    readinessDependencies: new Map(),
    promotionCandidates: new Map(),
    promotionDecisions: new Map(),
    promotionDecisionByCandidate: new Map(),
    promotionReceipts: new Map(),
    promotionOutboxByDecision: new Map(),
  };
}

function cloneState(state: InMemoryExperimentFoundationV2State): InMemoryExperimentFoundationV2State {
  return {
    assets: cloneMap(state.assets),
    assetLogicalIdByFamilyKey: new Map(state.assetLogicalIdByFamilyKey),
    revisions: cloneMap(state.revisions),
    revisionByLogicalHash: new Map(state.revisionByLogicalHash),
    revisionByLogicalSequence: new Map(state.revisionByLogicalSequence),
    freezeReplays: cloneMap(state.freezeReplays),
    lifecycleEvents: cloneMap(state.lifecycleEvents),
    lifecycleProjections: cloneMap(state.lifecycleProjections),
    readinessAttestations: cloneMap(state.readinessAttestations),
    readinessByIdentity: new Map(state.readinessByIdentity),
    readinessDependencies: cloneMap(state.readinessDependencies),
    promotionCandidates: cloneMap(state.promotionCandidates),
    promotionDecisions: cloneMap(state.promotionDecisions),
    promotionDecisionByCandidate: new Map(state.promotionDecisionByCandidate),
    promotionReceipts: cloneMap(state.promotionReceipts),
    promotionOutboxByDecision: cloneMap(state.promotionOutboxByDecision),
  };
}

function cloneMap<T>(input: Map<string, T>): Map<string, T> {
  return new Map([...input.entries()].map(([key, value]) => [key, clone(value)]));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : clone(value);
}

function assetKey(assetType: ExperimentFoundationV2AssetType, logicalId: string): string {
  return `${assetType}:${logicalId}`;
}

function promotionCandidateKey(candidateId: string, candidateRevision: number): string {
  return `${candidateId}:${candidateRevision}`;
}

function assetFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_key;
    case 'DataPolicy': return record.asset.policy_key;
    case 'MetricDefinition': return record.asset.metric_key;
    case 'Benchmark': return record.asset.benchmark_key;
    case 'EvaluationProtocol': return record.asset.protocol_key;
  }
}

function assetDraftFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string | null {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_draft?.dataset_key ?? null;
    case 'DataPolicy': return record.asset.data_policy_draft?.policy_key ?? null;
    case 'MetricDefinition': return record.asset.metric_definition_draft?.metric_key ?? null;
    case 'Benchmark': return record.asset.benchmark_draft?.benchmark_key ?? null;
    case 'EvaluationProtocol': return record.asset.evaluation_protocol_draft?.protocol_key ?? null;
  }
}

function assetFamilyKeyIndex(
  assetType: ExperimentFoundationV2AssetType,
  familyKey: string,
): string {
  return `${assetType}:${familyKey}`;
}

function revisionIdKey(assetType: ExperimentFoundationV2AssetType, revisionId: string): string {
  return `${assetType}:${revisionId}`;
}

function revisionLogicalHashKey(
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  contentHash: string,
): string {
  return `${assetType}:${logicalId}:${contentHash}`;
}

function revisionLogicalSequenceKey(
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  revisionSequence: number,
): string {
  return `${assetType}:${logicalId}:${revisionSequence}`;
}

function freezeReplayKey(
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  businessIdempotencyKey: string,
): string {
  return `${assetType}:${logicalId}:${businessIdempotencyKey}`;
}

function exactRevisionKey(ref: ExperimentFoundationV2ExactAssetRevisionRef): string {
  return [
    ref.asset_type,
    ref.logical_id,
    ref.revision_id,
    String(ref.revision_sequence),
    ref.content_hash,
  ].join(':');
}

function readinessIdentityKey(identity: ExperimentFoundationV2ReadinessIdentity): string {
  return [
    exactRevisionKey(identity.target),
    identity.evaluator_profile_hash,
    identity.dependency_manifest_hash,
    identity.attestation_hash,
  ].join(':');
}

function readinessAttestationHash(attestation: ExperimentFoundationReadinessAttestationV2): string {
  const candidate = attestation as ExperimentFoundationReadinessAttestationV2 & {
    attestation_hash?: string;
  };
  return candidate.attestation_hash ?? JSON.stringify({
    status: attestation.status,
    blockers: attestation.blockers,
  });
}
