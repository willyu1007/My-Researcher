import type {
  ExperimentFoundationPreparationCandidateV2,
  ExperimentFoundationPromotionDecisionV2,
  ExperimentFoundationPromotionV2Decision,
  ExperimentFoundationPromotionV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-promotion-v2-contracts';
import type {
  ExperimentFoundationV2AssetType,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import type {
  ExperimentFoundationV2UnitOfWork,
} from './experiment-foundation-v2.repository.js';

export interface ExperimentFoundationPreparationCandidateV2Record {
  candidate: Omit<ExperimentFoundationPreparationCandidateV2, 'status'> & {
    status: 'pending' | ExperimentFoundationPreparationCandidateV2['status'];
  };
  content_schema_version: string;
  candidate_snapshot: unknown;
  state_version: number;
}

export interface ExperimentFoundationPromotionDecisionV2Record {
  decision: ExperimentFoundationPromotionDecisionV2;
  candidate_content_hash: string;
  command_hash: string;
}

export interface ExperimentFoundationPromotionCommandReceiptV2Record {
  receipt_id: string;
  business_idempotency_key: string;
  command_hash: string;
  promotion_decision_id: string;
  created_at: string;
}

export interface ExperimentFoundationPromotionOutboxV2Record {
  outbox_id: string;
  event_id: string;
  promotion_decision_id: string;
  aggregate_type: 'ExperimentFoundationPreparationCandidateV2';
  aggregate_id: string;
  transition_key: 'terminal-promotion-decision';
  event_type: 'ExperimentFoundationPreparationCandidatePromotionDecidedV2';
  schema_version: 'v1';
  producer_domain: 'experiment-foundation';
  occurred_at: string;
  correlation_id: string;
  causation_id: string;
  business_idempotency_key: string;
  event_payload: ExperimentFoundationPromotionV2EventPayload;
  payload_hash: string;
  event_envelope_hash: string;
  created_at: string;
  updated_at: string;
}

export class ExperimentFoundationPromotionV2RepositoryConstraintError extends Error {
  constructor(
    public readonly reasonCode:
      | 'PROMOTION_CANDIDATE_CONFLICT'
      | 'PROMOTION_DECISION_CONFLICT'
      | 'PROMOTION_IDEMPOTENCY_CONFLICT'
      | 'PROMOTION_OUTBOX_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationPromotionV2RepositoryConstraintError';
  }
}

export interface ExperimentFoundationPromotionV2UnitOfWork
  extends ExperimentFoundationV2UnitOfWork {
  lockPreparationCandidate(candidateId: string, candidateRevision: number): Promise<void>;
  findPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPreparationCandidateV2Record | null>;
  insertPreparationCandidate(
    record: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<void>;
  compareAndSwapPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
    expectedStateVersion: number,
    next: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<boolean>;

  findPromotionDecisionByCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null>;
  findPromotionDecisionById(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null>;
  insertPromotionDecision(record: ExperimentFoundationPromotionDecisionV2Record): Promise<void>;

  findPromotionCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationPromotionCommandReceiptV2Record | null>;
  insertPromotionCommandReceipt(
    record: ExperimentFoundationPromotionCommandReceiptV2Record,
  ): Promise<void>;

  findPromotionOutboxByDecision(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionOutboxV2Record | null>;
  insertPromotionOutbox(record: ExperimentFoundationPromotionOutboxV2Record): Promise<void>;

  bindPromotionCanonicalRevision(
    assetType: ExperimentFoundationV2AssetType,
    revisionId: string,
  ): void;
}

export interface ExperimentFoundationPromotionV2Repository {
  runPromotionInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationPromotionV2UnitOfWork) => Promise<T>,
  ): Promise<T>;
}

export function promotionDecisionMatches(
  record: ExperimentFoundationPromotionDecisionV2Record,
  decision: ExperimentFoundationPromotionV2Decision,
  commandHash: string,
): boolean {
  return record.decision.decision === decision && record.command_hash === commandHash;
}
