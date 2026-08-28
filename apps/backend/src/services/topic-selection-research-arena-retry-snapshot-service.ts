import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaLoopDeltaRef,
  TopicSelectionResearchArenaRetrySnapshot,
  TopicSelectionResearchArenaRetrySnapshotRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

type Dependencies = {
  arenaRepository: Pick<TopicSelectionResearchArenaRepository, 'findSessionById'>;
  evidenceMapRepository: Pick<
    TopicSelectionEvidenceMapRepository,
    'findEvidenceMapById' | 'listEvidenceUnitsByEvidenceMapId'
  >;
  controlPlane: Pick<
    TopicSelectionControlPlaneService,
    'compileInputSnapshot' | 'getInputSnapshot' | 'recordArtifactRef'
  >;
};

type PrepareInput = Omit<TopicSelectionResearchArenaRetrySnapshotRequest, 'schema_version'>;

export class TopicSelectionResearchArenaRetrySnapshotService {
  constructor(private readonly dependencies: Dependencies) {}

  async prepare(
    input: PrepareInput,
  ): Promise<TopicSelectionResearchArenaRetrySnapshot> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) {
      throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    }
    if (session.title_card_id !== input.title_card_id
      || session.status !== 'open'
      || !session.current_arena_key
      || session.supersedes_arena_session_id
      || !session.support_only) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Retry preparation requires the current first support-only arena attempt.');
    }
    if (input.candidate_refs.length === 0
      || new Set(input.candidate_refs.map((candidate) => this.refKey(candidate))).size !== input.candidate_refs.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Retry preparation requires unique canonical candidate refs.');
    }
    const predecessorSnapshot = await this.dependencies.controlPlane.getInputSnapshot(session.input_snapshot_id);
    if (!predecessorSnapshot || predecessorSnapshot.snapshot_hash !== session.input_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Predecessor arena snapshot is missing or changed.');
    }
    const predecessorRefKeys = new Set(
      [...predecessorSnapshot.source_refs, predecessorSnapshot.target_ref].map((ref) => this.refKey(ref)),
    );
    if (input.candidate_refs.some((candidate) => !predecessorRefKeys.has(this.refKey(candidate)))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Retry candidates must be bound to the predecessor arena snapshot.');
    }

    const evidenceMap = await this.dependencies.evidenceMapRepository.findEvidenceMapById(input.evidence_map_id);
    if (!evidenceMap
      || evidenceMap.title_card_id !== input.title_card_id
      || evidenceMap.status !== 'ready'
      || evidenceMap.freshness_status !== 'current'
      || !['machine_checked', 'human_reviewed'].includes(evidenceMap.review_status)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Retry preparation requires one current reviewed EvidenceMap.');
    }
    const evidenceUnits = await this.dependencies.evidenceMapRepository.listEvidenceUnitsByEvidenceMapId(
      evidenceMap.evidence_map_id,
    );
    if (evidenceUnits.length === 0 || evidenceUnits.some((unit) =>
      unit.freshness_status !== 'current'
      || !['machine_checked', 'human_reviewed'].includes(unit.review_status)
    )) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Retry preparation requires current reviewed EvidenceUnits.');
    }

    const evidenceMapRef = this.ref(
      'evidence_map',
      evidenceMap.evidence_map_id,
      input.title_card_id,
      evidenceMap.evidence_map_version,
    );
    const evidenceUnitRefs = evidenceUnits.map((unit) => this.ref(
      'evidence_unit',
      unit.evidence_unit_id,
      input.title_card_id,
      unit.evidence_map_version,
    ));
    const loopDeltaRefs: TopicSelectionResearchArenaLoopDeltaRef[] = [{
      delta_type: 'evidence',
      ref: evidenceMapRef,
      rationale: 'A current reviewed EvidenceMap replaces the inadmissible evidence bound to the predecessor arena snapshot.',
    }];
    const snapshot = await this.dependencies.controlPlane.compileInputSnapshot({
      workspace_id: session.workspace_id,
      title_card_id: input.title_card_id,
      target_ref: session.target_ref,
      source_refs: this.uniqueRefs([
        ...input.candidate_refs,
        evidenceMapRef,
        ...evidenceUnitRefs,
      ]),
      payload: {
        predecessor_arena_session_id: session.arena_session_id,
        predecessor_input_snapshot_id: session.input_snapshot_id,
        candidate_refs: input.candidate_refs,
        evidence_map_ref: evidenceMapRef,
        evidence_unit_refs: evidenceUnitRefs,
        loop_delta_refs: loopDeltaRefs,
        support_only: true,
      },
      policy_version: predecessorSnapshot.policy_version,
      created_by: 'hybrid',
    });
    const executionPlanPayload = {
      schema_version: 'TopicSelectionResearchArenaRetryExecutionPlan@v1',
      predecessor_arena_session_id: session.arena_session_id,
      participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
      retrieval_execution_mode: 'local_snapshot_lexical',
      provider_calls_allowed: false,
      support_only: true,
    };
    const executionPlan = await this.dependencies.controlPlane.recordArtifactRef({
      workspace_id: session.workspace_id,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: executionPlanPayload,
      checksum: sha256Text(stableStringify(executionPlanPayload)),
      mime_type: 'application/json',
      input_snapshot_id: snapshot.input_snapshot_id,
      created_by: 'hybrid',
    });
    return {
      schema_version: 'TopicSelectionResearchArenaRetrySnapshot@v1',
      input_snapshot_id: snapshot.input_snapshot_id,
      input_snapshot_hash: snapshot.snapshot_hash,
      target_ref: session.target_ref,
      execution_plan_ref: this.ref('artifact_ref', executionPlan.artifact_ref_id, input.title_card_id),
      loop_delta_refs: loopDeltaRefs,
      support_only: true,
    };
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId?: string,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      ...(versionId ? { version_id: versionId } : {}),
    };
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = this.refKey(ref);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
