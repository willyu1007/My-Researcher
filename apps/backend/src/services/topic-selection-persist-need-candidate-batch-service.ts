import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArtifactFunctionalRef,
  TopicSelectionCandidateDraftAdmissionReport,
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionPersistNeedCandidateBatchCommand,
  TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionNeedValidationRepository } from '../repositories/topic-selection-need-validation.repository.js';
import { AppError } from '../errors/app-error.js';
import {
  normalizeWhitespace,
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

export type TopicSelectionPersistNeedCandidateBatchCommandBuildInput = {
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  ranked_candidate_draft_batch: TopicSelectionRankedCandidateDraftBatch;
  admission_report: TopicSelectionCandidateDraftAdmissionReport;
  ranked_candidate_draft_batch_artifact_ref: TopicSelectionArtifactFunctionalRef;
  admission_report_artifact_ref: TopicSelectionArtifactFunctionalRef;
  supplemental_routing_artifact_refs: TopicSelectionArtifactFunctionalRef[];
};

export type TopicSelectionPersistNeedCandidateBatchInput = {
  command: TopicSelectionPersistNeedCandidateBatchCommand;
  workspace_id?: string | null;
  title_card_id?: string | null;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  persist_command_artifact_ref?: TopicSelectionArtifactFunctionalRef | null;
  discovery_audit_ref?: TopicSelectionArtifactFunctionalRef | null;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionPersistNeedCandidateBatchResult = {
  schema_version: 'v1';
  idempotency_key: string;
  command: TopicSelectionPersistNeedCandidateBatchCommand;
  persisted_candidates: TopicSelectionNeedCandidateRecord[];
  persisted_candidate_refs: TopicSelectionFunctionalRef[];
  candidate_pool_projection_entries: Array<{
    need_candidate_ref: TopicSelectionFunctionalRef;
    draft_id: string;
    rank: number;
    normalized_candidate_key: string;
  }>;
  candidate_pool_projection_ref: TopicSelectionFunctionalRef;
  candidate_pool_projection_hash: string;
  replayed: boolean;
};

type CandidateRecordWithKey = {
  record: TopicSelectionNeedCandidateRecord;
  normalizedCandidateKey: string;
};

type ServiceOptions = {
  now?: () => string;
  checkpointGuard?: Pick<TopicSelectionResearchCheckpointService, 'assertTransitionAllowed'>
    & Partial<Pick<TopicSelectionResearchCheckpointService, 'materializeGapSelectionCheckpoint'>>;
};

export class TopicSelectionPersistNeedCandidateBatchService {
  private readonly now: () => string;
  private readonly checkpointGuard?: ServiceOptions['checkpointGuard'];

  constructor(
    private readonly repository: TopicSelectionNeedValidationRepository,
    options: ServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.checkpointGuard = options.checkpointGuard;
  }

  buildCommand(
    input: TopicSelectionPersistNeedCandidateBatchCommandBuildInput,
  ): TopicSelectionPersistNeedCandidateBatchCommand {
    this.assertBatchMetadataAligned(input);
    this.assertArtifactRef(input.ranked_candidate_draft_batch_artifact_ref, 'ranked_candidate_draft_batch_artifact_ref');
    this.assertArtifactRef(input.admission_report_artifact_ref, 'admission_report_artifact_ref');
    input.supplemental_routing_artifact_refs.forEach((ref, index) =>
      this.assertArtifactRef(ref, `supplemental_routing_artifact_refs[${index}]`),
    );

    const draftById = new Map(input.ranked_candidate_draft_batch.drafts.map((draft) => [draft.draft_id, draft]));
    const admittedDrafts = input.admission_report.draft_results
      .filter((result) => result.decision === 'admit')
      .sort((left, right) => left.rank - right.rank)
      .map((result) => {
        const draft = draftById.get(result.draft_id);
        if (!draft) {
          throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Admitted draft ${result.draft_id} is missing from RankedCandidateDraftBatch.`, {
            reason_code: 'DRAFT_NOT_ADMITTED',
          });
        }
        if (!result.normalized_candidate_key?.trim()) {
          throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Admitted draft ${result.draft_id} is missing normalized_candidate_key.`, {
            reason_code: 'DRAFT_NOT_ADMITTED',
          });
        }
        return {
          ...draft,
          gap_codes: this.uniqueStrings([
            ...draft.gap_codes,
            ...result.reason_codes.filter((code) => code === 'METHOD_FAMILY_COVERAGE_GAP'),
          ]),
          normalized_candidate_key: result.normalized_candidate_key,
          source_admission_decision_ref: this.ref(
            'candidate_draft_admission_result',
            `${input.admission_report.batch_id}:${result.draft_id}`,
            input.node_input.evidence_map_ref.title_card_id ?? null,
          ),
        };
      });

    if (admittedDrafts.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'PersistNeedCandidateBatchCommand requires at least one admitted draft.', {
        reason_code: 'NO_ADMITTED_DRAFTS',
      });
    }
    if (admittedDrafts.length > input.ranked_candidate_draft_batch.draft_batch.max_persisted_candidates) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Admitted draft count exceeds max_persisted_candidates.', {
        reason_code: 'TOO_MANY_NEED_CANDIDATES',
      });
    }

    const admissionReportHash = this.hash(input.admission_report);
    const idempotencyKey = this.idempotencyKey({
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      admitted_draft_ids: admittedDrafts.map((draft) => draft.draft_id),
      admission_report_hash: admissionReportHash,
    });

    return {
      schema_version: input.node_input.schema_version,
      node_attempt_id: input.node_input.node_attempt_id,
      workflow_run_id: input.node_input.workflow_run_id,
      topic_scope_ref: input.node_input.topic_scope_ref,
      evidence_map_ref: input.node_input.evidence_map_ref,
      resource_sample_set_ref: input.node_input.resource_sample_set_ref ?? null,
      ranked_candidate_draft_batch_artifact_ref: input.ranked_candidate_draft_batch_artifact_ref,
      admission_report_artifact_ref: input.admission_report_artifact_ref,
      supplemental_routing_artifact_refs: input.supplemental_routing_artifact_refs,
      admitted_drafts: admittedDrafts,
      rejected_framings: input.ranked_candidate_draft_batch.rejected_framings ?? [],
      idempotency_key: idempotencyKey,
    };
  }

  async persistBatch(
    input: TopicSelectionPersistNeedCandidateBatchInput,
  ): Promise<TopicSelectionPersistNeedCandidateBatchResult> {
    this.assertPersistInput(input);
    const titleCardId = this.titleCardId(input);
    await this.checkpointGuard?.assertTransitionAllowed({
      title_card_id: titleCardId,
      checkpoint_kind: 'evidence_landscape',
      target_ref: input.command.evidence_map_ref,
    });
    const records = input.command.admitted_drafts.map((draft) =>
      this.toNeedCandidateRecord({
        command: input.command,
        titleCardId,
        workspaceId: input.workspace_id ?? null,
        searchRunRef: input.search_run_ref,
        searchPlanRef: input.search_plan_ref,
        literatureSnapshotRef: input.literature_snapshot_ref,
        persistCommandArtifactRef: input.persist_command_artifact_ref ?? null,
        discoveryAuditRef: input.discovery_audit_ref ?? null,
        createdBy: input.created_by ?? 'system',
        draft,
      }),
    );

    const existingById = await Promise.all(
      records.map((item) => this.repository.findNeedCandidateById(item.record.need_candidate_id)),
    );
    const existingRecords = existingById.filter((record): record is TopicSelectionNeedCandidateRecord => Boolean(record));
    if (existingRecords.length === records.length) {
      await this.materializeGapCheckpoint(input, titleCardId);
      return this.result(input.command, existingRecords, true);
    }
    if (existingRecords.length > 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PersistNeedCandidateBatch replay is partial; refusing to create a mixed batch.',
        {
          reason_code: 'PERSIST_NEED_CANDIDATE_BATCH_FAILED',
          idempotency_key: input.command.idempotency_key,
        },
      );
    }

    await this.assertNoNormalizedKeyConflict(titleCardId, records);
    const persisted = await this.repository.createNeedCandidatesBatch(records.map((item) => item.record));
    await this.materializeGapCheckpoint(input, titleCardId);
    return this.result(input.command, persisted, false);
  }

  private async materializeGapCheckpoint(
    input: TopicSelectionPersistNeedCandidateBatchInput,
    titleCardId: string,
  ): Promise<void> {
    if (!this.checkpointGuard?.materializeGapSelectionCheckpoint) return;
    const candidates = (await this.repository.listNeedCandidatesByTitleCardId(titleCardId))
      .filter((candidate) => candidate.evidence_map_id === input.command.evidence_map_ref.ref_id);
    await this.checkpointGuard.materializeGapSelectionCheckpoint({
      workspace_id: input.workspace_id ?? null,
      title_card_id: titleCardId,
      evidence_map_ref: input.command.evidence_map_ref,
      candidates,
      rejected_framings: input.command.rejected_framings ?? [],
    });
  }

  private toNeedCandidateRecord(input: {
    command: TopicSelectionPersistNeedCandidateBatchCommand;
    titleCardId: string;
    workspaceId: string | null;
    searchRunRef: TopicSelectionFunctionalRef;
    searchPlanRef: TopicSelectionFunctionalRef;
    literatureSnapshotRef: TopicSelectionFunctionalRef;
    persistCommandArtifactRef: TopicSelectionArtifactFunctionalRef | null;
    discoveryAuditRef: TopicSelectionArtifactFunctionalRef | null;
    createdBy: TopicSelectionActorType;
    draft: TopicSelectionPersistNeedCandidateBatchCommand['admitted_drafts'][number];
  }): CandidateRecordWithKey {
    const candidateHash = this.candidateHash(input.command, input.draft);
    const candidateId = `need_candidate_${this.shortHash(`${input.command.idempotency_key}:${input.draft.draft_id}`, 24)}`;
    const artifactRefs = this.uniqueRefs([
      input.command.ranked_candidate_draft_batch_artifact_ref,
      input.command.admission_report_artifact_ref,
      ...input.command.supplemental_routing_artifact_refs,
      input.persistCommandArtifactRef,
      input.discoveryAuditRef,
    ]);
    const now = this.now();
    return {
      normalizedCandidateKey: input.draft.normalized_candidate_key,
      record: {
        need_candidate_id: candidateId,
        workspace_id: input.workspaceId,
        title_card_id: input.titleCardId,
        evidence_map_id: input.command.evidence_map_ref.ref_id,
        candidate_version: `v1-${this.shortHash(candidateHash, 16)}`,
        lifecycle_status: 'hypothesis',
        decision_status: 'hypothesis',
        review_status: 'machine_checked',
        freshness_status: 'current',
        candidate_need: input.draft.candidate_need,
        unmet_need_statement: input.draft.unmet_need_statement,
        mechanism_type: input.draft.mechanism_type,
        mechanism_summary: input.draft.mechanism_summary ?? null,
        mechanism_payload: input.draft.mechanism_payload,
        scope_notes: input.draft.scope_notes ?? null,
        non_goal_notes: input.draft.non_goal_notes ?? null,
        prior_art_status: input.draft.prior_art_status,
        evidence_map_ref: input.command.evidence_map_ref,
        search_run_ref: input.searchRunRef,
        search_plan_ref: input.searchPlanRef,
        literature_snapshot_ref: input.literatureSnapshotRef,
        evidence_role_bundle: input.draft.evidence_role_bundle,
        conflict_refs: input.draft.conflict_refs,
        strength_assessment_refs: input.draft.strength_assessment_refs,
        open_recheck_request_refs: [],
        unresolved_challenge_refs: [],
        accepted_risk_refs: input.draft.accepted_risk_refs,
        gap_codes: input.draft.gap_codes,
        speculative: input.draft.speculative,
        confidence: input.draft.confidence ?? null,
        input_snapshot_id: null,
        workflow_run_id: input.command.workflow_run_id,
        gate_result_id: null,
        transition_attempt_id: null,
        trace_snapshot_id: null,
        artifact_refs: artifactRefs,
        result_adjudication_id: null,
        result_validated_need_id: null,
        merged_into_need_candidate_ref: null,
        created_by: input.createdBy,
        created_at: now,
        updated_at: now,
      },
    };
  }

  private async assertNoNormalizedKeyConflict(
    titleCardId: string,
    records: CandidateRecordWithKey[],
  ): Promise<void> {
    const existing = await this.repository.listNeedCandidatesByTitleCardId(titleCardId);
    const existingKeys = new Map(
      existing.map((candidate) => [
        this.normalizedCandidateKey(candidate),
        candidate,
      ]),
    );
    for (const item of records) {
      const conflict = existingKeys.get(item.normalizedCandidateKey);
      if (!conflict) {
        continue;
      }
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NeedCandidate normalized key already exists: ${item.normalizedCandidateKey}.`,
        {
          reason_code: 'DUPLICATE_NEED_CANDIDATE',
          existing_need_candidate_id: conflict.need_candidate_id,
          normalized_candidate_key: item.normalizedCandidateKey,
        },
      );
    }
  }

  private result(
    command: TopicSelectionPersistNeedCandidateBatchCommand,
    persisted: TopicSelectionNeedCandidateRecord[],
    replayed: boolean,
  ): TopicSelectionPersistNeedCandidateBatchResult {
    const persistedCandidateRefs = persisted.map((candidate) => this.candidateRef(candidate));
    const projectionEntries = command.admitted_drafts.map((draft, index) => ({
      need_candidate_ref: persistedCandidateRefs[index] ?? this.ref(
        'need_candidate',
        `need_candidate_${this.shortHash(`${command.idempotency_key}:${draft.draft_id}`, 24)}`,
        persisted[0]?.title_card_id ?? command.evidence_map_ref.title_card_id ?? null,
      ),
      draft_id: draft.draft_id,
      rank: draft.rank,
      normalized_candidate_key: draft.normalized_candidate_key,
    }));
    const projectionHash = this.hash({
      workflow_run_id: command.workflow_run_id,
      node_attempt_id: command.node_attempt_id,
      persisted_candidate_refs: persistedCandidateRefs,
      candidate_pool_projection_entries: projectionEntries,
    });
    return {
      schema_version: 'v1',
      idempotency_key: command.idempotency_key,
      command,
      persisted_candidates: persisted,
      persisted_candidate_refs: persistedCandidateRefs,
      candidate_pool_projection_entries: projectionEntries,
      candidate_pool_projection_ref: this.ref(
        'candidate_pool_projection',
        `candidate_pool_projection_${this.shortHash(projectionHash, 24)}`,
        persisted[0]?.title_card_id ?? command.evidence_map_ref.title_card_id ?? null,
        projectionHash,
      ),
      candidate_pool_projection_hash: projectionHash,
      replayed,
    };
  }

  private assertPersistInput(input: TopicSelectionPersistNeedCandidateBatchInput): void {
    this.assertNonEmpty(input.command.idempotency_key, 'command.idempotency_key');
    if (input.command.admitted_drafts.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'PersistNeedCandidateBatch requires at least one admitted draft.', {
        reason_code: 'NO_ADMITTED_DRAFTS',
      });
    }
    this.assertFunctionalRef(input.command.topic_scope_ref, 'command.topic_scope_ref');
    this.assertFunctionalRef(input.command.evidence_map_ref, 'command.evidence_map_ref');
    this.assertFunctionalRef(input.search_run_ref, 'search_run_ref');
    this.assertFunctionalRef(input.search_plan_ref, 'search_plan_ref');
    this.assertFunctionalRef(input.literature_snapshot_ref, 'literature_snapshot_ref');
    this.assertArtifactRef(input.command.ranked_candidate_draft_batch_artifact_ref, 'command.ranked_candidate_draft_batch_artifact_ref');
    this.assertArtifactRef(input.command.admission_report_artifact_ref, 'command.admission_report_artifact_ref');
    input.command.supplemental_routing_artifact_refs.forEach((ref, index) =>
      this.assertArtifactRef(ref, `command.supplemental_routing_artifact_refs[${index}]`),
    );
    if (input.persist_command_artifact_ref) {
      this.assertArtifactRef(input.persist_command_artifact_ref, 'persist_command_artifact_ref');
    }
    if (input.discovery_audit_ref) {
      this.assertArtifactRef(input.discovery_audit_ref, 'discovery_audit_ref');
    }
    const keys = new Set<string>();
    for (const draft of input.command.admitted_drafts) {
      this.assertNonEmpty(draft.normalized_candidate_key, `admitted_drafts.${draft.draft_id}.normalized_candidate_key`);
      if (keys.has(draft.normalized_candidate_key)) {
        throw new AppError(409, 'VERSION_CONFLICT', `Duplicate admitted normalized key: ${draft.normalized_candidate_key}.`, {
          reason_code: 'DUPLICATE_NEED_CANDIDATE',
        });
      }
      keys.add(draft.normalized_candidate_key);
    }
  }

  private assertBatchMetadataAligned(input: TopicSelectionPersistNeedCandidateBatchCommandBuildInput): void {
    if (input.ranked_candidate_draft_batch.draft_batch.node_attempt_id !== input.node_input.node_attempt_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'RankedCandidateDraftBatch node_attempt_id does not match node input.', {
        reason_code: 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH',
      });
    }
    if (input.admission_report.node_attempt_id !== input.node_input.node_attempt_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CandidateDraftAdmissionReport node_attempt_id does not match node input.', {
        reason_code: 'CANDIDATE_DRAFT_ADMISSION_FAILED',
      });
    }
    if (input.admission_report.batch_id !== input.ranked_candidate_draft_batch.draft_batch.batch_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Admission report batch_id does not match ranked draft batch.', {
        reason_code: 'CANDIDATE_DRAFT_ADMISSION_FAILED',
      });
    }
    if (input.admission_report.blocking_reason_codes.length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Cannot persist a batch with admission blockers.', {
        reason_code: 'CANDIDATE_DRAFT_ADMISSION_FAILED',
      });
    }
  }

  private titleCardId(input: TopicSelectionPersistNeedCandidateBatchInput): string {
    const titleCardId = input.title_card_id
      ?? input.command.evidence_map_ref.title_card_id
      ?? input.command.topic_scope_ref.title_card_id
      ?? input.search_run_ref.title_card_id
      ?? input.search_plan_ref.title_card_id
      ?? input.literature_snapshot_ref.title_card_id
      ?? null;
    if (!titleCardId?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'title_card_id is required for NeedCandidate batch persistence.');
    }
    return titleCardId;
  }

  private candidateHash(
    command: TopicSelectionPersistNeedCandidateBatchCommand,
    draft: TopicSelectionPersistNeedCandidateBatchCommand['admitted_drafts'][number],
  ): string {
    return this.hash({
      schema_version: command.schema_version,
      topic_scope_ref: command.topic_scope_ref,
      evidence_map_ref: command.evidence_map_ref,
      resource_sample_set_ref: command.resource_sample_set_ref ?? null,
      candidate_need: draft.candidate_need,
      unmet_need_statement: draft.unmet_need_statement,
      mechanism_type: draft.mechanism_type,
      mechanism_summary: draft.mechanism_summary ?? null,
      mechanism_payload: draft.mechanism_payload,
      scope_notes: draft.scope_notes ?? null,
      non_goal_notes: draft.non_goal_notes ?? null,
      prior_art_status: draft.prior_art_status,
      evidence_role_bundle: draft.evidence_role_bundle,
      conflict_refs: draft.conflict_refs,
      strength_assessment_refs: draft.strength_assessment_refs,
      accepted_risk_refs: draft.accepted_risk_refs,
      gap_codes: draft.gap_codes,
      speculative: draft.speculative,
      confidence: draft.confidence ?? null,
      normalized_candidate_key: draft.normalized_candidate_key,
    });
  }

  private normalizedCandidateKey(candidate: TopicSelectionNeedCandidateRecord): string {
    const normalized = normalizeWhitespace(`${candidate.candidate_need} ${candidate.unmet_need_statement}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);
    return normalized || candidate.need_candidate_id;
  }

  private idempotencyKey(value: Record<string, unknown>): string {
    return `persist_need_candidate_batch:${this.hash(value)}`;
  }

  private candidateRef(candidate: TopicSelectionNeedCandidateRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'need_candidate',
      candidate.need_candidate_id,
      candidate.title_card_id,
      candidate.candidate_version,
    );
  }

  private hash(value: unknown): string {
    return `sha256:${sha256Text(stableStringify(value))}`;
  }

  private shortHash(value: string, length: number): string {
    return sha256Text(value).slice(0, length);
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

  private assertArtifactRef(value: TopicSelectionFunctionalRef, fieldName: string): asserts value is TopicSelectionArtifactFunctionalRef {
    this.assertFunctionalRef(value, fieldName);
    if (value.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.ref_type must be artifact_ref.`);
    }
  }

  private assertFunctionalRef(value: TopicSelectionFunctionalRef, fieldName: string): void {
    if (!value || typeof value !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a functional ref.`);
    }
    this.assertNonEmpty(value.ref_type, `${fieldName}.ref_type`);
    this.assertNonEmpty(value.ref_id, `${fieldName}.ref_id`);
  }

  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const value of values) {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      unique.push(normalized);
    }
    return unique;
  }
}
