import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import type { TopicSelectionInitialEvidenceMapRecord } from '../repositories/topic-selection-evidence-map.repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchArenaRetrySnapshotService } from './topic-selection-research-arena-retry-snapshot-service.js';

const TITLE_CARD_ID = 'title-retry-1';
const NOW = '2026-08-29T00:00:00.000Z';

function ref(refType: string, refId: string, versionId?: string) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

test('retry snapshot binds repaired evidence, canonical candidates, and a provider-free execution plan', async () => {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  let id = 0;
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    now: () => NOW,
    idFactory: (prefix) => `${prefix}_retry_${++id}`,
  });
  const evidenceMaps = new InMemoryTopicSelectionEvidenceMapRepository();
  const arenas = new InMemoryTopicSelectionResearchArenaRepository();
  const targetRef = ref('need_candidate_arena', 'arena-target-1', 'v1');
  const candidateRefs = [
    ref('need_candidate', 'candidate-a', 'v1'),
    ref('need_candidate', 'candidate-b', 'v1'),
  ];
  const predecessorSnapshot = await controlPlane.compileInputSnapshot({
    title_card_id: TITLE_CARD_ID,
    target_ref: targetRef,
    source_refs: candidateRefs,
    payload: { candidate_refs: candidateRefs },
    created_by: 'system',
  });
  await arenas.replaceCurrentSession({
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena-session-1',
    session_key: 'arena-session-key-1',
    current_arena_key: `${TITLE_CARD_ID}:gap_portfolio`,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    arena_kind: 'gap_portfolio',
    target_ref: targetRef,
    input_snapshot_id: predecessorSnapshot.input_snapshot_id,
    input_snapshot_hash: predecessorSnapshot.snapshot_hash,
    participant_plan_hash: 'a'.repeat(64),
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'old-plan'),
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: null,
    superseded_at: null,
  });

  const evidenceMap = {
    evidence_map_id: 'evidence-map-repaired',
    title_card_id: TITLE_CARD_ID,
    evidence_map_version: 'v2',
    status: 'ready',
    review_status: 'machine_checked',
    freshness_status: 'current',
  } as TopicSelectionInitialEvidenceMapRecord;
  const evidenceUnit = {
    evidence_unit_id: 'evidence-unit-repaired',
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: evidenceMap.evidence_map_id,
    evidence_map_version: evidenceMap.evidence_map_version,
    literature_ref: ref('literature_record', 'lit-1'),
    freshness_status: 'current',
    review_status: 'machine_checked',
  } as TopicSelectionEvidenceUnitRecord;
  await evidenceMaps.createEvidenceMapWithRecords({
    evidence_map: evidenceMap,
    evidence_units: [evidenceUnit],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  });

  const service = new TopicSelectionResearchArenaRetrySnapshotService({
    arenaRepository: arenas,
    evidenceMapRepository: evidenceMaps,
    controlPlane,
  });
  const prepared = await service.prepare({
    arena_session_id: 'arena-session-1',
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: evidenceMap.evidence_map_id,
    candidate_refs: candidateRefs,
  });

  assert.equal(prepared.support_only, true);
  assert.equal(prepared.target_ref.ref_id, targetRef.ref_id);
  assert.deepEqual(prepared.loop_delta_refs, [{
    delta_type: 'evidence',
    ref: ref('evidence_map', evidenceMap.evidence_map_id, evidenceMap.evidence_map_version),
    rationale: 'A current reviewed EvidenceMap replaces the inadmissible evidence bound to the predecessor arena snapshot.',
  }]);
  const snapshot = await controlPlane.getInputSnapshot(prepared.input_snapshot_id);
  assert.ok(snapshot);
  assert.notEqual(snapshot.snapshot_hash, predecessorSnapshot.snapshot_hash);
  assert.equal(snapshot.source_refs.some((sourceRef) => sourceRef.ref_id === 'candidate-a'), true);
  assert.equal(snapshot.source_refs.some((sourceRef) => sourceRef.ref_id === evidenceMap.evidence_map_id), true);
  assert.equal(snapshot.source_refs.some((sourceRef) => sourceRef.ref_id === evidenceUnit.evidence_unit_id), true);
  const executionPlan = await controlPlane.getArtifactRef(prepared.execution_plan_ref.ref_id);
  assert.equal(executionPlan?.input_snapshot_id, snapshot.input_snapshot_id);
  assert.deepEqual(executionPlan?.payload, {
    schema_version: 'TopicSelectionResearchArenaRetryExecutionPlan@v1',
    predecessor_arena_session_id: 'arena-session-1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    retrieval_execution_mode: 'local_snapshot_lexical',
    provider_calls_allowed: false,
    support_only: true,
  });
});
