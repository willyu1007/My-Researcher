import type {
  TopicSelectionCandidateDecisionMemorySuggestionRecord,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionNeedCandidateStatusPatch,
  TopicSelectionNeedValidationAdjudicationWriteInput,
  TopicSelectionNeedValidationAdjudicationWriteResult,
  TopicSelectionNeedValidationHumanConfirmationWriteInput,
  TopicSelectionNeedValidationHumanConfirmationWriteResult,
  TopicSelectionNeedValidationRepository,
} from './topic-selection-need-validation.repository.js';

export class InMemoryTopicSelectionNeedValidationRepository implements TopicSelectionNeedValidationRepository {
  private readonly needCandidates = new Map<string, TopicSelectionNeedCandidateRecord>();
  private readonly readinessAssessments = new Map<string, TopicSelectionNeedCandidateReadinessAssessmentRecord>();
  private readonly supportPackets = new Map<string, TopicSelectionValidationDecisionSupportPacketRecord>();
  private readonly adjudicationResults = new Map<string, TopicSelectionValidateNeedAdjudicationResultRecord>();
  private readonly validatedNeeds = new Map<string, TopicSelectionValidatedNeedRecord>();
  private readonly memorySuggestions = new Map<string, TopicSelectionCandidateDecisionMemorySuggestionRecord>();
  private readonly v1bInputBundles = new Map<string, TopicSelectionV1aToV1bInputBundleRecord>();

  async createNeedCandidate(record: TopicSelectionNeedCandidateRecord): Promise<TopicSelectionNeedCandidateRecord> {
    this.needCandidates.set(record.need_candidate_id, record);
    return record;
  }

  async createNeedCandidatesBatch(
    records: TopicSelectionNeedCandidateRecord[],
  ): Promise<TopicSelectionNeedCandidateRecord[]> {
    const existingIds = records.filter((record) => this.needCandidates.has(record.need_candidate_id));
    if (existingIds.length > 0) {
      throw new Error(`NeedCandidate already exists: ${existingIds.map((record) => record.need_candidate_id).join(', ')}.`);
    }
    const seenIds = new Set<string>();
    const duplicateIds = records.filter((record) => {
      if (seenIds.has(record.need_candidate_id)) {
        return true;
      }
      seenIds.add(record.need_candidate_id);
      return false;
    });
    if (duplicateIds.length > 0) {
      throw new Error(`Duplicate NeedCandidate batch ids: ${duplicateIds.map((record) => record.need_candidate_id).join(', ')}.`);
    }
    const existingVersions = new Set(
      [...this.needCandidates.values()].map((record) => `${record.evidence_map_id}:${record.candidate_version}`),
    );
    const seenVersions = new Set<string>();
    const duplicateVersions = records.filter((record) => {
      const key = `${record.evidence_map_id}:${record.candidate_version}`;
      if (existingVersions.has(key) || seenVersions.has(key)) {
        return true;
      }
      seenVersions.add(key);
      return false;
    });
    if (duplicateVersions.length > 0) {
      throw new Error(
        `Duplicate NeedCandidate batch versions: ${
          duplicateVersions.map((record) => `${record.evidence_map_id}:${record.candidate_version}`).join(', ')
        }.`,
      );
    }
    for (const record of records) {
      this.needCandidates.set(record.need_candidate_id, record);
    }
    return records;
  }

  async findNeedCandidateById(needCandidateId: string): Promise<TopicSelectionNeedCandidateRecord | null> {
    return this.needCandidates.get(needCandidateId) ?? null;
  }

  async listNeedCandidatesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionNeedCandidateRecord[]> {
    return [...this.needCandidates.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async updateNeedCandidateStatus(
    needCandidateId: string,
    patch: TopicSelectionNeedCandidateStatusPatch,
  ): Promise<TopicSelectionNeedCandidateRecord> {
    const next = this.applyCandidatePatch(needCandidateId, patch);
    this.needCandidates.set(needCandidateId, next);
    return next;
  }

  async createReadinessAssessment(
    record: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord> {
    this.readinessAssessments.set(record.readiness_assessment_id, record);
    return record;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord | null> {
    return this.readinessAssessments.get(readinessAssessmentId) ?? null;
  }

  async listReadinessAssessmentsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord[]> {
    return [...this.readinessAssessments.values()]
      .filter((record) => record.need_candidate_id === needCandidateId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createValidationDecisionSupportPacket(
    record: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord> {
    this.supportPackets.set(record.validation_support_packet_id, record);
    return record;
  }

  async findValidationDecisionSupportPacketById(
    supportPacketId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord | null> {
    return this.supportPackets.get(supportPacketId) ?? null;
  }

  async listValidationDecisionSupportPacketsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord[]> {
    return [...this.supportPackets.values()]
      .filter((record) => record.need_candidate_id === needCandidateId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async adjudicateWithSideEffects(
    input: TopicSelectionNeedValidationAdjudicationWriteInput,
  ): Promise<TopicSelectionNeedValidationAdjudicationWriteResult> {
    const candidate = this.applyCandidatePatch(
      input.adjudication_result.need_candidate_id,
      input.candidate_patch,
    );
    this.adjudicationResults.set(input.adjudication_result.adjudication_result_id, input.adjudication_result);
    this.needCandidates.set(candidate.need_candidate_id, candidate);
    if (input.validated_need) {
      this.validatedNeeds.set(input.validated_need.validated_need_id, input.validated_need);
    }
    if (input.memory_suggestion) {
      this.memorySuggestions.set(input.memory_suggestion.memory_suggestion_id, input.memory_suggestion);
    }
    if (input.v1b_input_bundle) {
      this.v1bInputBundles.set(input.v1b_input_bundle.v1b_input_bundle_id, input.v1b_input_bundle);
    }
    return {
      adjudication_result: input.adjudication_result,
      need_candidate: candidate,
      validated_need: input.validated_need ?? null,
      memory_suggestion: input.memory_suggestion ?? null,
      v1b_input_bundle: input.v1b_input_bundle ?? null,
    };
  }

  async findAdjudicationResultById(
    adjudicationResultId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord | null> {
    return this.adjudicationResults.get(adjudicationResultId) ?? null;
  }

  async listAdjudicationResultsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]> {
    return [...this.adjudicationResults.values()]
      .filter((record) => record.need_candidate_id === needCandidateId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async listAdjudicationResultsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord[]> {
    return [...this.adjudicationResults.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async findValidatedNeedById(validatedNeedId: string): Promise<TopicSelectionValidatedNeedRecord | null> {
    return this.validatedNeeds.get(validatedNeedId) ?? null;
  }

  async confirmValidatedNeed(
    input: TopicSelectionNeedValidationHumanConfirmationWriteInput,
  ): Promise<TopicSelectionNeedValidationHumanConfirmationWriteResult> {
    if (this.validatedNeeds.has(input.validated_need.validated_need_id)) {
      throw new Error(`ValidatedNeed ${input.validated_need.validated_need_id} already exists.`);
    }
    const candidate = this.applyCandidatePatch(input.validated_need.source_need_candidate_id, input.candidate_patch);
    this.needCandidates.set(candidate.need_candidate_id, candidate);
    this.validatedNeeds.set(input.validated_need.validated_need_id, input.validated_need);
    return {
      validated_need: input.validated_need,
      need_candidate: candidate,
    };
  }

  async listValidatedNeedsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionValidatedNeedRecord[]> {
    return [...this.validatedNeeds.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createV1aToV1bInputBundle(
    record: TopicSelectionV1aToV1bInputBundleRecord,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord> {
    this.v1bInputBundles.set(record.v1b_input_bundle_id, record);
    return record;
  }

  async findV1aToV1bInputBundleById(
    bundleId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord | null> {
    return this.v1bInputBundles.get(bundleId) ?? null;
  }

  async listV1aToV1bInputBundlesByValidatedNeedId(
    validatedNeedId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord[]> {
    return [...this.v1bInputBundles.values()]
      .filter((record) => record.validated_need_id === validatedNeedId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async createCandidateDecisionMemorySuggestion(
    record: TopicSelectionCandidateDecisionMemorySuggestionRecord,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord> {
    this.memorySuggestions.set(record.memory_suggestion_id, record);
    return record;
  }

  async findCandidateDecisionMemorySuggestionById(
    memorySuggestionId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord | null> {
    return this.memorySuggestions.get(memorySuggestionId) ?? null;
  }

  async listCandidateDecisionMemorySuggestionsByNeedCandidateId(
    needCandidateId: string,
  ): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord[]> {
    return [...this.memorySuggestions.values()]
      .filter((record) => record.source_need_candidate_id === needCandidateId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  private applyCandidatePatch(
    needCandidateId: string,
    patch: TopicSelectionNeedCandidateStatusPatch,
  ): TopicSelectionNeedCandidateRecord {
    const current = this.needCandidates.get(needCandidateId);
    if (!current) {
      throw new Error(`NeedCandidate ${needCandidateId} not found.`);
    }
    const hasPatchField = (field: keyof TopicSelectionNeedCandidateStatusPatch) =>
      Object.prototype.hasOwnProperty.call(patch, field);
    return {
      ...current,
      lifecycle_status: patch.lifecycle_status ?? current.lifecycle_status,
      decision_status: patch.decision_status ?? current.decision_status,
      review_status: patch.review_status ?? current.review_status,
      freshness_status: patch.freshness_status ?? current.freshness_status,
      result_adjudication_id: hasPatchField('result_adjudication_id')
        ? patch.result_adjudication_id ?? null
        : current.result_adjudication_id ?? null,
      result_validated_need_id: hasPatchField('result_validated_need_id')
        ? patch.result_validated_need_id ?? null
        : current.result_validated_need_id ?? null,
      merged_into_need_candidate_ref: hasPatchField('merged_into_need_candidate_ref')
        ? patch.merged_into_need_candidate_ref ?? null
        : current.merged_into_need_candidate_ref ?? null,
      open_recheck_request_refs: patch.open_recheck_request_refs ?? current.open_recheck_request_refs,
      gap_codes: patch.gap_codes ?? current.gap_codes,
      updated_at: patch.updated_at,
    };
  }
}
