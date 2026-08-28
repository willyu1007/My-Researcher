import type {
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchArenaRoleEvidencePreparation,
  TopicSelectionResearchArenaRoleEvidencePreparationRequest,
  TopicSelectionResearchEvidencePacket,
  TopicSelectionResearchEvidencePacketRequest,
  TopicSelectionResearchRetrievalProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type { TopicSelectionSearchRunRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

type SearchRunInput = {
  workspace_id?: string | null;
  title_card_id: string;
  search_plan_id: string;
  literature_resource_pool_snapshot_id: string;
  run_kind: 'planned_search';
  run_status: 'succeeded' | 'partial';
  query_provenance: Array<Record<string, unknown>>;
  result_accounting: {
    total_result_count: number;
    unique_literature_count: number;
    duplicate_result_count: number;
    failed_source_count: number;
    skipped_source_count: number;
  };
  source_health_summary: Record<string, unknown>;
  dedup_summary: Record<string, unknown>;
  evidence_map_input_refs: TopicSelectionFunctionalRef[];
  raw_log_artifact: Record<string, unknown>;
  coverage_observations: Array<{
    coverage_row_intent_id: string;
    status: 'succeeded' | 'partial';
    result_count: number;
    source_count: number;
    missing_reason_codes: string[];
    notes: string;
  }>;
  created_by: 'system';
};

type ArtifactInput = {
  workspace_id?: string | null;
  title_card_id: string;
  artifact_kind: 'structured_output';
  storage_kind: 'inline';
  payload: Record<string, unknown>;
  checksum: string;
  mime_type: 'application/json';
  input_snapshot_id: string;
  created_by: 'system';
};

export class TopicSelectionResearchArenaRetrievalService {
  constructor(private readonly dependencies: {
    retriever: { retrieve(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> };
    snapshotReader: {
      getInputSnapshot(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null>;
    };
    evidenceMapRepository: Pick<
      TopicSelectionEvidenceMapRepository,
      'listEvidenceMapsByTitleCardId' | 'listEvidenceUnitsByEvidenceMapId'
    >;
    searchRunRecorder: {
      recordSearchRun(input: SearchRunInput): Promise<{ search_run: TopicSelectionSearchRunRecord }>;
    };
    evidencePacketResolver: {
      resolve(input: TopicSelectionResearchEvidencePacketRequest): Promise<TopicSelectionResearchEvidencePacket>;
    };
    artifactRecorder: {
      recordArtifactRef(input: ArtifactInput): Promise<TopicSelectionArtifactRefRecord>;
    };
  }) {}

  async prepare(
    input: TopicSelectionResearchArenaRoleEvidencePreparationRequest,
  ): Promise<TopicSelectionResearchArenaRoleEvidencePreparation> {
    this.assertInput(input);
    await this.assertSnapshotBinding(input);
    const evidenceMap = await this.requireCurrentEvidenceMap(input.title_card_id);
    const response = await this.dependencies.retriever.retrieve({
      query: input.query_intent.query,
      profile: 'topic_exploration',
      top_k: input.top_k ?? 12,
      evidence_per_literature: input.evidence_per_literature ?? 3,
      include_stale: false,
    });
    if (response.items.some((item) => item.is_stale)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena retrieval returned stale literature despite a fresh-only request.');
    }
    if (response.items.some((item) => item.evidence_chunks.length === 0)) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Arena retrieval returned literature without claim-bearing chunks.',
      );
    }
    const evidenceMapRef = this.ref(
      'evidence_map',
      evidenceMap.evidence_map_id,
      input.title_card_id,
      evidenceMap.evidence_map_version,
    );
    const units = await this.dependencies.evidenceMapRepository.listEvidenceUnitsByEvidenceMapId(
      evidenceMap.evidence_map_id,
    );
    const selectedUnits = this.selectUnits(units, response, input.participant_role);
    const selectedLiteratureIds = new Set(selectedUnits.map((unit) => unit.literature_ref.ref_id));
    const evidenceUnitRefs = selectedUnits.slice(0, 12).map((unit) => this.ref(
      'evidence_unit',
      unit.evidence_unit_id,
      input.title_card_id,
      unit.evidence_map_version,
    ));
    const unresolvedLiteratureRefs = response.items
      .filter((item) => !selectedLiteratureIds.has(item.literature_id))
      .map((item) => this.ref('literature_record', item.literature_id, input.title_card_id));
    const evidenceMapInputRefs = this.evidenceMapInputRefs(units);
    if (evidenceMapInputRefs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Arena retrieval requires at least one current reviewed EvidenceMap locator.',
      );
    }
    const provenanceBody = {
      participant_role: input.participant_role,
      query_intent: input.query_intent,
      search_run_ref: this.ref('search_run', 'pending', input.title_card_id),
      hits: this.toHitProvenance(response, input.title_card_id),
    };
    const searchRun = await this.recordSearchRun(
      input,
      response,
      provenanceBody.hits,
      evidenceMapInputRefs,
      {
        requiresEvidenceMaterialization: unresolvedLiteratureRefs.length > 0,
        retrievalDegraded: response.meta.degraded_mode
          || response.meta.skipped_profiles.length > 0
          || response.meta.freshness_warnings.length > 0,
      },
    );
    const searchRunRef = this.ref('search_run', searchRun.search_run_id, input.title_card_id);
    const retrievalBody = { ...provenanceBody, search_run_ref: searchRunRef };
    const retrievalProvenance: TopicSelectionResearchRetrievalProvenance = {
      ...retrievalBody,
      provenance_hash: sha256Text(stableStringify(retrievalBody)),
    };
    if (response.items.length === 0) {
      return this.result(input, evidenceMapRef, searchRunRef, retrievalProvenance, 'no_retrieval_hits');
    }

    if (unresolvedLiteratureRefs.length > 0) {
      return {
        ...this.result(
          input,
          evidenceMapRef,
          searchRunRef,
          retrievalProvenance,
          'requires_evidence_materialization',
        ),
        selected_evidence_unit_refs: evidenceUnitRefs,
        unresolved_literature_refs: unresolvedLiteratureRefs,
      };
    }

    const packet = await this.dependencies.evidencePacketResolver.resolve({
      schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1',
      title_card_id: input.title_card_id,
      participant_role: input.participant_role,
      query_intent: input.query_intent,
      evidence_unit_refs: evidenceUnitRefs,
    });
    const artifact = await this.dependencies.artifactRecorder.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: packet as unknown as Record<string, unknown>,
      checksum: packet.packet_hash,
      mime_type: 'application/json',
      input_snapshot_id: input.arena_input_snapshot_id,
      created_by: 'system',
    });
    return {
      ...this.result(input, evidenceMapRef, searchRunRef, retrievalProvenance, 'ready'),
      selected_evidence_unit_refs: evidenceUnitRefs,
      evidence_packet_artifact_ref: this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id),
      evidence_packet_hash: packet.packet_hash,
    };
  }

  private async requireCurrentEvidenceMap(titleCardId: string): Promise<TopicSelectionEvidenceMapRecord> {
    const current = (await this.dependencies.evidenceMapRepository.listEvidenceMapsByTitleCardId(titleCardId))
      .filter((map) => map.status === 'ready'
        && map.freshness_status === 'current'
        && ['machine_checked', 'human_reviewed'].includes(map.review_status));
    if (current.length !== 1) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Arena retrieval requires exactly one current reviewed EvidenceMap; found ${current.length}.`,
      );
    }
    return current[0]!;
  }

  private async assertSnapshotBinding(
    input: TopicSelectionResearchArenaRoleEvidencePreparationRequest,
  ): Promise<void> {
    const snapshot = await this.dependencies.snapshotReader.getInputSnapshot(input.arena_input_snapshot_id);
    if (!snapshot) {
      throw new AppError(404, 'NOT_FOUND', `Arena input snapshot ${input.arena_input_snapshot_id} not found.`);
    }
    if (snapshot.title_card_id !== input.title_card_id
      || (input.workspace_id !== undefined && snapshot.workspace_id !== input.workspace_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena input snapshot belongs to a different scope.');
    }
  }

  private async recordSearchRun(
    input: TopicSelectionResearchArenaRoleEvidencePreparationRequest,
    response: LiteratureRetrieveResponse,
    hits: TopicSelectionResearchRetrievalProvenance['hits'],
    evidenceMapInputRefs: TopicSelectionFunctionalRef[],
    partialReasons: {
      requiresEvidenceMaterialization: boolean;
      retrievalDegraded: boolean;
    },
  ): Promise<TopicSelectionSearchRunRecord> {
    const runStatus = partialReasons.requiresEvidenceMaterialization || partialReasons.retrievalDegraded
      ? 'partial'
      : 'succeeded';
    const record = await this.dependencies.searchRunRecorder.recordSearchRun({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      search_plan_id: input.search_plan_id,
      literature_resource_pool_snapshot_id: input.literature_snapshot_id,
      run_kind: 'planned_search',
      run_status: runStatus,
      query_provenance: [{
        schema_version: 'TopicSelectionResearchArenaRetrievalProvenance@v1',
        participant_role: input.participant_role,
        query_intent: input.query_intent,
        retrieval_profile: response.meta.profile,
        hits,
      }],
      result_accounting: {
        total_result_count: response.items.length,
        unique_literature_count: new Set(response.items.map((item) => item.literature_id)).size,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        degraded_mode: response.meta.degraded_mode,
        freshness_warning_count: response.meta.freshness_warnings.length,
        profile: response.meta.profile,
        profiles_used: response.meta.profiles_used,
        skipped_profiles: response.meta.skipped_profiles,
      },
      dedup_summary: { duplicate_result_count: 0 },
      evidence_map_input_refs: evidenceMapInputRefs,
      raw_log_artifact: {
        schema_version: 'TopicSelectionResearchArenaRetrievalLog@v1',
        participant_role: input.participant_role,
        query_intent: input.query_intent,
        response,
      },
      coverage_observations: [{
        coverage_row_intent_id: input.coverage_row_intent_id,
        status: runStatus,
        result_count: response.items.length,
        source_count: new Set(response.items.map((item) => item.literature_id)).size,
        missing_reason_codes: [
          ...(partialReasons.requiresEvidenceMaterialization ? ['EVIDENCE_MATERIALIZATION_REQUIRED'] : []),
          ...(partialReasons.retrievalDegraded ? ['RETRIEVAL_DEGRADED'] : []),
        ],
        notes: 'Arena role-specific product retrieval.',
      }],
      created_by: 'system',
    });
    return record.search_run;
  }

  private selectUnits(
    units: TopicSelectionEvidenceUnitRecord[],
    response: LiteratureRetrieveResponse,
    participantRole: TopicSelectionResearchArenaRoleEvidencePreparationRequest['participant_role'],
  ): TopicSelectionEvidenceUnitRecord[] {
    const rankByLiterature = new Map(response.items.map((item, index) => [item.literature_id, index]));
    const hitByLiterature = new Map(response.items.map((item) => [item.literature_id, item]));
    const rolePriority = participantRole === 'prior_art_topic_killer'
      ? ['challenge', 'baseline', 'support', 'context']
      : participantRole === 'empirical_skeptic'
        ? ['challenge', 'baseline', 'context', 'support']
        : ['support', 'context', 'baseline', 'challenge'];
    return units.filter((unit) => rankByLiterature.has(unit.literature_ref.ref_id)
      && this.unitMatchesRetrievedChunks(unit, hitByLiterature.get(unit.literature_ref.ref_id))
      && unit.freshness_status === 'current'
      && ['machine_checked', 'human_reviewed'].includes(unit.review_status)
      && ['source_claim', 'counter_evidence'].includes(unit.source_attribution_kind)
      && ['support', 'challenge', 'baseline', 'context'].includes(unit.evidence_role)
      && unit.locator.locator_type !== 'manual')
      .sort((left, right) => {
        const rankDelta = (rankByLiterature.get(left.literature_ref.ref_id) ?? Number.MAX_SAFE_INTEGER)
          - (rankByLiterature.get(right.literature_ref.ref_id) ?? Number.MAX_SAFE_INTEGER);
        if (rankDelta !== 0) return rankDelta;
        const roleDelta = rolePriority.indexOf(left.evidence_role)
          - rolePriority.indexOf(right.evidence_role);
        if (roleDelta !== 0) return roleDelta;
        const confidenceDelta = (right.extraction_confidence ?? 0) - (left.extraction_confidence ?? 0);
        return confidenceDelta !== 0
          ? confidenceDelta
          : left.evidence_unit_id.localeCompare(right.evidence_unit_id);
      });
  }

  private unitMatchesRetrievedChunks(
    unit: TopicSelectionEvidenceUnitRecord,
    hit: LiteratureRetrieveResponse['items'][number] | undefined,
  ): boolean {
    if (!hit) return false;
    const locatorIds = new Set([
      unit.locator.locator_ref,
      unit.locator.content_ref,
      unit.locator.document_ref,
      unit.locator.section_ref,
      unit.locator.paragraph_ref,
      unit.locator.anchor_ref,
    ].flatMap((ref) => ref?.ref_id ? [ref.ref_id] : []));
    const normalizedStatements = [unit.source_statement, unit.normalized_statement]
      .flatMap((statement) => statement ? [this.normalizeAlignmentText(statement)] : [])
      .filter((statement) => statement.length >= 12);
    return hit.evidence_chunks.some((chunk) => {
      const chunkRefIds = new Set([
        ...chunk.source_refs,
        chunk.metadata,
      ].flatMap((record) => Object.entries(record)
        .filter(([key, value]) => (key === 'ref_id' || key.endsWith('_id'))
          && typeof value === 'string'
          && value.length > 0)
        .map(([, value]) => value as string)));
      if ([...locatorIds].some((id) => chunkRefIds.has(id))) return true;
      const normalizedChunk = this.normalizeAlignmentText(chunk.text);
      return normalizedStatements.some((statement) => normalizedChunk.includes(statement));
    });
  }

  private normalizeAlignmentText(value: string): string {
    return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  private evidenceMapInputRefs(units: TopicSelectionEvidenceUnitRecord[]): TopicSelectionFunctionalRef[] {
    const refs = new Map<string, TopicSelectionFunctionalRef>();
    for (const unit of units) {
      if (unit.freshness_status !== 'current'
        || !['machine_checked', 'human_reviewed'].includes(unit.review_status)
        || !['source_claim', 'counter_evidence'].includes(unit.source_attribution_kind)
        || unit.locator.locator_type === 'manual') {
        continue;
      }
      const ref = unit.locator.locator_ref;
      refs.set(`${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`, ref);
      if (refs.size === 24) break;
    }
    return [...refs.values()];
  }

  private toHitProvenance(
    response: LiteratureRetrieveResponse,
    titleCardId: string,
  ): TopicSelectionResearchRetrievalProvenance['hits'] {
    let rank = 0;
    return response.items.flatMap((item) => item.evidence_chunks.map((chunk) => ({
      literature_ref: this.ref('literature_record', item.literature_id, titleCardId),
      embedding_version_id: item.embedding_version_id,
      chunk_id: chunk.chunk_id,
      chunk_hash: sha256Text(chunk.text),
      rank: ++rank,
      hybrid_score: chunk.hybrid_score,
      vector_score: chunk.vector_score,
      lexical_score: chunk.lexical_score,
      is_stale: item.is_stale,
    }))).slice(0, 60);
  }

  private result(
    input: TopicSelectionResearchArenaRoleEvidencePreparationRequest,
    evidenceMapRef: TopicSelectionFunctionalRef,
    searchRunRef: TopicSelectionFunctionalRef,
    retrievalProvenance: TopicSelectionResearchRetrievalProvenance,
    status: TopicSelectionResearchArenaRoleEvidencePreparation['status'],
  ): TopicSelectionResearchArenaRoleEvidencePreparation {
    return {
      schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1',
      status,
      title_card_id: input.title_card_id,
      participant_role: input.participant_role,
      query_intent: input.query_intent,
      evidence_map_ref: evidenceMapRef,
      search_run_ref: searchRunRef,
      retrieval_provenance: status === 'no_retrieval_hits' ? null : retrievalProvenance,
      selected_evidence_unit_refs: [],
      unresolved_literature_refs: [],
      evidence_packet_artifact_ref: null,
      evidence_packet_hash: null,
    };
  }

  private assertInput(input: TopicSelectionResearchArenaRoleEvidencePreparationRequest): void {
    if (input.schema_version !== 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1'
      || !input.title_card_id.trim() || !input.arena_input_snapshot_id.trim()
      || !input.search_plan_id.trim() || !input.literature_snapshot_id.trim()
      || !input.coverage_row_intent_id.trim()
      || !input.query_intent.query.trim() || !input.query_intent.rationale.trim()
      || !input.query_intent.target_claim.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena role retrieval requires non-empty snapshot, search, and query-intent fields.');
    }
    if ((input.top_k !== undefined && (!Number.isInteger(input.top_k) || input.top_k < 1 || input.top_k > 12))
      || (input.evidence_per_literature !== undefined
        && (!Number.isInteger(input.evidence_per_literature)
          || input.evidence_per_literature < 1
          || input.evidence_per_literature > 5))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena role retrieval exceeds the bounded retrieval limits.');
    }
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId, title_card_id: titleCardId, version_id: versionId };
  }
}
