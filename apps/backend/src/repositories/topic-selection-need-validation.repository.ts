import type {
  TopicSelectionCandidateDecisionMemorySuggestionRecord,
  TopicSelectionNeedCandidateDecisionStatus,
  TopicSelectionNeedCandidateFreshnessStatus,
  TopicSelectionNeedCandidateLifecycleStatus,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionNeedCandidateReviewStatus,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

export type TopicSelectionNeedCandidateStatusPatch = {
  lifecycle_status?: TopicSelectionNeedCandidateLifecycleStatus;
  decision_status?: TopicSelectionNeedCandidateDecisionStatus;
  review_status?: TopicSelectionNeedCandidateReviewStatus;
  freshness_status?: TopicSelectionNeedCandidateFreshnessStatus;
  result_adjudication_id?: string | null;
  result_validated_need_id?: string | null;
  merged_into_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  open_recheck_request_refs?: TopicSelectionFunctionalRef[];
  gap_codes?: string[];
  updated_at: string;
};

export type TopicSelectionNeedValidationAdjudicationWriteInput = {
  adjudication_result: TopicSelectionValidateNeedAdjudicationResultRecord;
  candidate_patch: TopicSelectionNeedCandidateStatusPatch;
  validated_need?: TopicSelectionValidatedNeedRecord | null;
  memory_suggestion?: TopicSelectionCandidateDecisionMemorySuggestionRecord | null;
  v1b_input_bundle?: TopicSelectionV1aToV1bInputBundleRecord | null;
};

export type TopicSelectionNeedValidationAdjudicationWriteResult = {
  adjudication_result: TopicSelectionValidateNeedAdjudicationResultRecord;
  need_candidate: TopicSelectionNeedCandidateRecord;
  validated_need?: TopicSelectionValidatedNeedRecord | null;
  memory_suggestion?: TopicSelectionCandidateDecisionMemorySuggestionRecord | null;
  v1b_input_bundle?: TopicSelectionV1aToV1bInputBundleRecord | null;
};

export type TopicSelectionNeedValidationHumanConfirmationWriteInput = {
  validated_need: TopicSelectionValidatedNeedRecord;
  candidate_patch: TopicSelectionNeedCandidateStatusPatch;
};

export type TopicSelectionNeedValidationHumanConfirmationWriteResult = {
  validated_need: TopicSelectionValidatedNeedRecord;
  need_candidate: TopicSelectionNeedCandidateRecord;
};

export interface TopicSelectionNeedValidationRepository {
  createNeedCandidate(record: TopicSelectionNeedCandidateRecord): Promise<TopicSelectionNeedCandidateRecord>;
  createNeedCandidatesBatch(records: TopicSelectionNeedCandidateRecord[]): Promise<TopicSelectionNeedCandidateRecord[]>;
  findNeedCandidateById(needCandidateId: string): Promise<TopicSelectionNeedCandidateRecord | null>;
  /**
   * T-087 D1 read-only projection — list NeedCandidates under a title-card.
   * Reverse-chronological order; intended to drive the reviewer workbench
   * v1a NeedCandidate surface without changing decision-chain semantics.
   */
  listNeedCandidatesByTitleCardId(titleCardId: string): Promise<TopicSelectionNeedCandidateRecord[]>;
  updateNeedCandidateStatus(
    needCandidateId: string,
    patch: TopicSelectionNeedCandidateStatusPatch,
  ): Promise<TopicSelectionNeedCandidateRecord>;

  createReadinessAssessment(
    record: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord>;
  findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord | null>;
  listReadinessAssessmentsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord[]>;

  createValidationDecisionSupportPacket(
    record: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord>;
  findValidationDecisionSupportPacketById(
    supportPacketId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord | null>;
  listValidationDecisionSupportPacketsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord[]>;

  adjudicateWithSideEffects(
    input: TopicSelectionNeedValidationAdjudicationWriteInput,
  ): Promise<TopicSelectionNeedValidationAdjudicationWriteResult>;
  findAdjudicationResultById(
    adjudicationResultId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord | null>;
  listAdjudicationResultsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]>;
  listAdjudicationResultsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]>;

  findValidatedNeedById(validatedNeedId: string): Promise<TopicSelectionValidatedNeedRecord | null>;
  confirmValidatedNeed(
    input: TopicSelectionNeedValidationHumanConfirmationWriteInput,
  ): Promise<TopicSelectionNeedValidationHumanConfirmationWriteResult>;
  /**
   * T-087 D1 read-only projection — list ValidatedNeeds under a title-card.
   * Reverse-chronological order; reviewer workbench v1a ValidatedNeed surface.
   */
  listValidatedNeedsByTitleCardId(titleCardId: string): Promise<TopicSelectionValidatedNeedRecord[]>;
  createV1aToV1bInputBundle(
    record: TopicSelectionV1aToV1bInputBundleRecord,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord>;
  findV1aToV1bInputBundleById(
    bundleId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord | null>;
  listV1aToV1bInputBundlesByValidatedNeedId(
    validatedNeedId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord[]>;

  createCandidateDecisionMemorySuggestion(
    record: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord>;
  findCandidateDecisionMemorySuggestionById(
    memorySuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord | null>;
  listCandidateDecisionMemorySuggestionsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord[]>;
}
