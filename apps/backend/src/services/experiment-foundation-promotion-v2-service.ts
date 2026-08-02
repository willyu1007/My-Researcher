import {
  EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS,
  type ExperimentFoundationPreparationCandidateV2,
  type ExperimentFoundationPromotionDecisionV2,
  type ExperimentFoundationPromotionV2Decision,
  type ExperimentFoundationPromotionV2EventPayload,
  type ExperimentFoundationPromotionV2Request,
  type ExperimentFoundationPromotionV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-promotion-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_V2_ASSET_TYPES,
  type ExperimentFoundationV2AssetType,
  type ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverExperimentFoundationPromotionV2Id,
  serverHashExperimentFoundationPromotionV2Command,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationPromotionV2RepositoryConstraintError,
  promotionDecisionMatches,
  type ExperimentFoundationPreparationCandidateV2Record,
  type ExperimentFoundationPromotionDecisionV2Record,
  type ExperimentFoundationPromotionOutboxV2Record,
  type ExperimentFoundationPromotionV2Repository,
  type ExperimentFoundationPromotionV2UnitOfWork,
} from '../repositories/experiment-foundation-promotion-v2.repository.js';
import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2AssetRevisionRecord,
} from '../repositories/experiment-foundation-v2.repository.js';
import {
  advanceAssetCurrentRevision,
  assetDraftContent,
  createAssetRevisionRecord,
  exactRefFromRevision,
  hashAssetContent,
} from './experiment-foundation-v2-service.js';
import {
  assertExperimentV2PositiveInt32,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

export interface ExperimentFoundationPromotionV2Target {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  candidate_revision: number;
}

export interface ExperimentFoundationPromotionV2ServiceOptions {
  enabled: () => boolean;
  now?: () => string;
  failpoint?: (point: 'after-candidate' | 'after-canonical' | 'before-commit') => void;
}

export class ExperimentFoundationPromotionV2Service {
  private readonly now: () => string;

  constructor(
    private readonly repository: ExperimentFoundationPromotionV2Repository,
    private readonly options: ExperimentFoundationPromotionV2ServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async decide(
    target: ExperimentFoundationPromotionV2Target,
    request: ExperimentFoundationPromotionV2Request,
  ): Promise<ExperimentFoundationPromotionV2Response> {
    this.assertEnabled();
    assertTarget(target);
    assertRequest(request);

    const commandHash = serverHashExperimentFoundationPromotionV2Command({
      asset_type: target.asset_type,
      logical_id: target.logical_id,
      candidate_revision: target.candidate_revision,
      decision: request.decision,
    });

    try {
      return await this.repository.runPromotionInTransaction(async (unitOfWork) => {
        const replay = await this.resolveIdempotencyReplay(
          unitOfWork,
          request.business_idempotency_key,
          commandHash,
        );
        if (replay) return replay;

        const candidateId = candidateIdFor(target);
        await unitOfWork.lockPreparationCandidate(candidateId, target.candidate_revision);
        const terminal = await unitOfWork.findPromotionDecisionByCandidate(
          candidateId,
          target.candidate_revision,
        );
        if (terminal) {
          if (!promotionDecisionMatches(terminal, request.decision, commandHash)) {
            throw conflict(
              'PROMOTION_DECISION_CONFLICT',
              'The exact candidate revision already has a different terminal decision.',
            );
          }
          await unitOfWork.insertPromotionCommandReceipt({
            receipt_id: serverExperimentFoundationPromotionV2Id('receipt', {
              business_idempotency_key: request.business_idempotency_key,
            }),
            business_idempotency_key: request.business_idempotency_key,
            command_hash: commandHash,
            promotion_decision_id: terminal.decision.promotion_decision_id,
            created_at: this.now(),
          });
          return this.responseFor(unitOfWork, terminal, true);
        }

        const asset = await unitOfWork.findAssetIdentity(target.asset_type, target.logical_id);
        if (!asset) {
          throw notFound('PROMOTION_CANDIDATE_NOT_FOUND', 'Typed asset candidate was not found.');
        }
        if (asset.asset.draft_state_version !== target.candidate_revision) {
          throw conflict(
            'PROMOTION_CANDIDATE_REVISION_STALE',
            'Candidate revision no longer matches the current typed asset draft.',
          );
        }
        const draft = assetDraftContent(asset);
        if (!draft) {
          throw conflict(
            'PROMOTION_CANDIDATE_REVISION_STALE',
            'Candidate revision has no typed draft snapshot.',
          );
        }

        const now = this.now();
        const contentHash = hashAssetContent(target.asset_type, draft);
        const pendingCandidate = createPendingCandidate(
          target,
          candidateId,
          draft,
          contentHash,
          now,
        );
        await unitOfWork.insertPreparationCandidate(pendingCandidate);
        this.options.failpoint?.('after-candidate');

        const canonical = request.decision === 'promote'
          ? await this.canonicalize(unitOfWork, asset, target, draft, contentHash, now)
          : null;
        this.options.failpoint?.('after-canonical');

        const terminalCandidate = terminateCandidate(
          pendingCandidate,
          request.decision,
          canonical?.ref ?? null,
          now,
        );
        const transitioned = await unitOfWork.compareAndSwapPreparationCandidate(
          candidateId,
          target.candidate_revision,
          0,
          terminalCandidate,
        );
        if (!transitioned) {
          throw conflict(
            'PROMOTION_CANDIDATE_CONFLICT',
            'Candidate state changed concurrently.',
          );
        }

        const decision = createDecision(
          target,
          request.decision,
          candidateId,
          contentHash,
          commandHash,
          canonical,
          now,
        );
        await unitOfWork.insertPromotionDecision(decision);
        await unitOfWork.insertPromotionCommandReceipt({
          receipt_id: serverExperimentFoundationPromotionV2Id('receipt', {
            business_idempotency_key: request.business_idempotency_key,
          }),
          business_idempotency_key: request.business_idempotency_key,
          command_hash: commandHash,
          promotion_decision_id: decision.decision.promotion_decision_id,
          created_at: now,
        });
        const outbox = createOutbox(
          terminalCandidate,
          decision,
          request.business_idempotency_key,
          now,
        );
        await unitOfWork.insertPromotionOutbox(outbox);
        if (canonical?.created) {
          unitOfWork.bindPromotionCanonicalRevision(
            target.asset_type,
            canonical.ref.revision_id,
          );
        }
        this.options.failpoint?.('before-commit');

        return {
          candidate: asTerminalCandidate(terminalCandidate),
          promotion_decision: decision.decision,
          event_id: outbox.event_id,
          replayed: false,
        };
      });
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }

  private async canonicalize(
    unitOfWork: ExperimentFoundationPromotionV2UnitOfWork,
    asset: ExperimentFoundationV2AssetIdentityRecord,
    target: ExperimentFoundationPromotionV2Target,
    draft: NonNullable<ReturnType<typeof assetDraftContent>>,
    contentHash: string,
    now: string,
  ): Promise<{
    ref: ExperimentFoundationV2ExactAssetRevisionRef;
    outcome: 'created' | 'reused';
    created: boolean;
  }> {
    const existing = await unitOfWork.findAssetRevisionByContentHash(
      target.asset_type,
      target.logical_id,
      contentHash,
    );
    let revision: ExperimentFoundationV2AssetRevisionRecord;
    let created = false;
    if (existing) {
      revision = existing;
    } else {
      const revisions = await unitOfWork.listAssetRevisions(target.asset_type, target.logical_id);
      const revisionSequence = nextExperimentV2Int32Sequence(
        revisions.map((item) => item.revision.revision_sequence),
        'Promotion canonical revision sequence',
        (message) => conflict('PROMOTION_CANONICAL_CONFLICT', message),
      );
      revision = createAssetRevisionRecord(
        target.asset_type,
        target.logical_id,
        draft,
        serverExperimentFoundationPromotionV2Id('revision', {
          asset_type: target.asset_type,
          logical_id: target.logical_id,
          content_hash: contentHash,
        }),
        revisionSequence,
        contentHash,
        now,
      );
      await unitOfWork.insertAssetRevision(revision);
      created = true;
    }

    const nextIdentity = advanceAssetCurrentRevision(asset, revision.revision.revision_id, now);
    const advanced = await unitOfWork.compareAndSwapAssetIdentity(
      target.asset_type,
      target.logical_id,
      target.candidate_revision,
      nextIdentity,
    );
    if (!advanced) {
      throw conflict(
        'PROMOTION_CANDIDATE_REVISION_STALE',
        'Candidate draft changed during canonicalization.',
      );
    }
    return {
      ref: exactRefFromRevision(revision),
      outcome: created ? 'created' : 'reused',
      created,
    };
  }

  private async resolveIdempotencyReplay(
    unitOfWork: ExperimentFoundationPromotionV2UnitOfWork,
    businessIdempotencyKey: string,
    commandHash: string,
  ): Promise<ExperimentFoundationPromotionV2Response | null> {
    const receipt = await unitOfWork.findPromotionCommandReceipt(businessIdempotencyKey);
    if (!receipt) return null;
    if (receipt.command_hash !== commandHash) {
      throw conflict(
        'PROMOTION_IDEMPOTENCY_CONFLICT',
        'Promotion idempotency key was reused with different input.',
      );
    }
    const decision = await unitOfWork.findPromotionDecisionById(receipt.promotion_decision_id);
    if (!decision) {
      throw conflict(
        'PROMOTION_REPLAY_DRIFT',
        'Promotion receipt no longer resolves to its terminal decision.',
      );
    }
    return this.responseFor(unitOfWork, decision, true);
  }

  private async responseFor(
    unitOfWork: ExperimentFoundationPromotionV2UnitOfWork,
    decision: ExperimentFoundationPromotionDecisionV2Record,
    replayed: boolean,
  ): Promise<ExperimentFoundationPromotionV2Response> {
    const [candidate, outbox] = await Promise.all([
      unitOfWork.findPreparationCandidate(
        decision.decision.candidate_id,
        decision.decision.candidate_revision,
      ),
      unitOfWork.findPromotionOutboxByDecision(decision.decision.promotion_decision_id),
    ]);
    if (!candidate || !outbox) {
      throw conflict(
        'PROMOTION_REPLAY_DRIFT',
        'Promotion replay no longer resolves to its atomic Candidate/outbox outcome.',
      );
    }
    return {
      candidate: asTerminalCandidate(candidate),
      promotion_decision: decision.decision,
      event_id: outbox.event_id,
      replayed,
    };
  }

  private assertEnabled(): void {
    if (!this.options.enabled()) {
      throw conflict(
        'EF_V2_PROMOTION_DISABLED',
        'Experiment Foundation v2 promotion intake is disabled.',
      );
    }
  }
}

function candidateIdFor(target: ExperimentFoundationPromotionV2Target): string {
  return serverExperimentFoundationPromotionV2Id('candidate', {
    asset_type: target.asset_type,
    logical_id: target.logical_id,
  });
}

function createPendingCandidate(
  target: ExperimentFoundationPromotionV2Target,
  candidateId: string,
  draft: NonNullable<ReturnType<typeof assetDraftContent>>,
  contentHash: string,
  now: string,
): ExperimentFoundationPreparationCandidateV2Record {
  return {
    candidate: {
      candidate_id: candidateId,
      candidate_revision: target.candidate_revision,
      asset_type: target.asset_type,
      logical_id: target.logical_id,
      content_hash: contentHash,
      status: 'pending',
      canonical_revision: null,
      created_at: now,
      updated_at: now,
    },
    content_schema_version: draft.schema_version,
    candidate_snapshot: structuredClone(draft),
    state_version: 0,
  };
}

function terminateCandidate(
  candidate: ExperimentFoundationPreparationCandidateV2Record,
  decision: ExperimentFoundationPromotionV2Decision,
  canonicalRevision: ExperimentFoundationV2ExactAssetRevisionRef | null,
  now: string,
): ExperimentFoundationPreparationCandidateV2Record {
  return {
    ...candidate,
    candidate: {
      ...candidate.candidate,
      status: decision === 'promote' ? 'promoted' : 'rejected',
      canonical_revision: canonicalRevision,
      updated_at: now,
    },
    state_version: 1,
  };
}

function createDecision(
  target: ExperimentFoundationPromotionV2Target,
  decisionValue: ExperimentFoundationPromotionV2Decision,
  candidateId: string,
  contentHash: string,
  commandHash: string,
  canonical: {
    ref: ExperimentFoundationV2ExactAssetRevisionRef;
    outcome: 'created' | 'reused';
  } | null,
  now: string,
): ExperimentFoundationPromotionDecisionV2Record {
  const decision: ExperimentFoundationPromotionDecisionV2 = {
    promotion_decision_id: serverExperimentFoundationPromotionV2Id('decision', {
      candidate_id: candidateId,
      candidate_revision: target.candidate_revision,
    }),
    candidate_id: candidateId,
    candidate_revision: target.candidate_revision,
    decision: decisionValue,
    canonicalization_outcome: canonical?.outcome ?? null,
    canonical_revision: canonical?.ref ?? null,
    decided_at: now,
  };
  return { decision, candidate_content_hash: contentHash, command_hash: commandHash };
}

function createOutbox(
  candidate: ExperimentFoundationPreparationCandidateV2Record,
  decision: ExperimentFoundationPromotionDecisionV2Record,
  businessIdempotencyKey: string,
  now: string,
): ExperimentFoundationPromotionOutboxV2Record {
  const payload: ExperimentFoundationPromotionV2EventPayload = {
    candidate_id: candidate.candidate.candidate_id,
    candidate_revision: candidate.candidate.candidate_revision,
    asset_type: candidate.candidate.asset_type,
    logical_id: candidate.candidate.logical_id,
    content_hash: candidate.candidate.content_hash,
    decision: decision.decision.decision,
    canonicalization_outcome: decision.decision.canonicalization_outcome,
    canonical_revision: decision.decision.canonical_revision,
  };
  const eventType = 'ExperimentFoundationPreparationCandidatePromotionDecidedV2' as const;
  const eventId = serverExperimentFoundationPromotionV2Id('event', {
    promotion_decision_id: decision.decision.promotion_decision_id,
  });
  const payloadHash = serverHashExperimentV2EventPayload(eventType, 'v1', payload);
  const envelopeHash = serverHashExperimentV2EventEnvelope({
    event_id: eventId,
    event_type: eventType,
    schema_version: 'v1',
    producer_domain: 'experiment-foundation',
    occurred_at: now,
    correlation_id: eventId,
    causation_id: decision.decision.promotion_decision_id,
    business_idempotency_key: businessIdempotencyKey,
    payload_hash: payloadHash,
    payload,
  });
  return {
    outbox_id: serverExperimentFoundationPromotionV2Id('outbox', { event_id: eventId }),
    event_id: eventId,
    promotion_decision_id: decision.decision.promotion_decision_id,
    aggregate_type: 'ExperimentFoundationPreparationCandidateV2',
    aggregate_id: `${candidate.candidate.candidate_id}:${candidate.candidate.candidate_revision}`,
    transition_key: 'terminal-promotion-decision',
    event_type: eventType,
    schema_version: 'v1',
    producer_domain: 'experiment-foundation',
    occurred_at: now,
    correlation_id: eventId,
    causation_id: decision.decision.promotion_decision_id,
    business_idempotency_key: businessIdempotencyKey,
    event_payload: payload,
    payload_hash: payloadHash,
    event_envelope_hash: envelopeHash,
    created_at: now,
    updated_at: now,
  };
}

function asTerminalCandidate(
  record: ExperimentFoundationPreparationCandidateV2Record,
): ExperimentFoundationPreparationCandidateV2 {
  if (record.candidate.status === 'pending') {
    throw conflict('PROMOTION_REPLAY_DRIFT', 'Preparation Candidate is not terminal.');
  }
  return structuredClone(record.candidate) as ExperimentFoundationPreparationCandidateV2;
}

function assertTarget(target: ExperimentFoundationPromotionV2Target): void {
  if (
    !(EXPERIMENT_FOUNDATION_V2_ASSET_TYPES as readonly unknown[]).includes(target.asset_type)
    || typeof target.logical_id !== 'string'
    || target.logical_id.length === 0
  ) {
    throw invalid('PROMOTION_TARGET_INVALID', 'Promotion target is invalid.');
  }
  assertExperimentV2PositiveInt32(
    target.candidate_revision,
    'candidate_revision',
    () => invalid('PROMOTION_TARGET_INVALID', 'Promotion target is invalid.'),
  );
}

function assertRequest(request: ExperimentFoundationPromotionV2Request): void {
  if (
    !(EXPERIMENT_FOUNDATION_PROMOTION_V2_DECISIONS as readonly unknown[])
      .includes(request.decision)
    || typeof request.business_idempotency_key !== 'string'
    || request.business_idempotency_key.length === 0
  ) {
    throw invalid('PROMOTION_COMMAND_INVALID', 'Promotion command is invalid.');
  }
}

function mapRepositoryError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  if (error instanceof ExperimentFoundationPromotionV2RepositoryConstraintError) {
    return conflict(error.reasonCode, error.message);
  }
  if (error instanceof ExperimentFoundationV2RepositoryConstraintError) {
    return conflict('PROMOTION_CANONICAL_CONFLICT', error.message);
  }
  return error;
}

function invalid(reasonCode: string, message: string): AppError {
  return new AppError(400, 'INVALID_PAYLOAD', message, { reason_code: reasonCode });
}

function notFound(reasonCode: string, message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message, { reason_code: reasonCode });
}

function conflict(reasonCode: string, message: string): AppError {
  return new AppError(409, 'VERSION_CONFLICT', message, { reason_code: reasonCode });
}
