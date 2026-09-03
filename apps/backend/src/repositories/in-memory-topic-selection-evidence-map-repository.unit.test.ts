import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionEvidenceMapRecords,
  TopicSelectionInitialEvidenceMapCreateRecords,
  TopicSelectionInitialEvidenceMapRecord,
} from './topic-selection-evidence-map.repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from './in-memory-topic-selection-evidence-map-repository.js';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_1' };
}

function evidenceMap(id: string): TopicSelectionInitialEvidenceMapRecord {
  return {
    evidence_map_id: id,
    title_card_id: 'title_1',
    evidence_map_version: id,
    status: 'ready',
    review_status: 'machine_checked',
    freshness_status: 'current',
    search_run_ref: ref('search_run', `run_${id}`),
    search_plan_ref: ref('search_plan', 'plan_1'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'manifest_1'),
    unit_count: 0,
    support_unit_count: 0,
    challenge_unit_count: 0,
    baseline_unit_count: 0,
    context_unit_count: 0,
    digest_payload: {},
    stale_reason_codes: [],
    artifact_refs: [],
    predecessor_evidence_map_ref: null,
    successor_evidence_map_ref: null,
    material_evidence_delta_ref: null,
    lineage_revision: 0,
    created_by: 'system',
    created_at: '2026-09-03T00:00:00.000Z',
  };
}

function records<Map extends TopicSelectionEvidenceMapRecord>(map: Map): TopicSelectionEvidenceMapRecords<Map> {
  return {
    evidence_map: map,
    evidence_units: [],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  };
}

test('successor publication atomically advances one EvidenceMap head and rejects a stale competing writer', async () => {
  const repository = new InMemoryTopicSelectionEvidenceMapRepository();
  const predecessor = evidenceMap('map_1');
  await repository.createEvidenceMapWithRecords(records(predecessor));
  const deltaRef = ref('artifact_ref', 'delta_1');
  const successor = {
    ...evidenceMap('map_2'),
    predecessor_evidence_map_ref: ref('evidence_map', 'map_1'),
    material_evidence_delta_ref: deltaRef,
    lineage_revision: 42,
  };

  await repository.publishEvidenceMapSuccessorWithRecords({
    expected_predecessor_id: 'map_1',
    expected_lineage_revision: 0,
    material_evidence_delta_ref: deltaRef,
    successor_records: records(successor),
  });

  const advanced = await repository.findEvidenceMapById('map_1');
  assert.equal(advanced?.successor_evidence_map_ref?.ref_id, 'map_2');
  assert.equal(advanced?.freshness_status, 'superseded');
  assert.equal(advanced?.lineage_revision, 1);
  assert.equal((await repository.findEvidenceMapById('map_2'))?.predecessor_evidence_map_ref?.ref_id, 'map_1');
  assert.equal((await repository.findEvidenceMapById('map_2'))?.lineage_revision, 0);

  await assert.rejects(
    () => repository.publishEvidenceMapSuccessorWithRecords({
      expected_predecessor_id: 'map_1',
      expected_lineage_revision: 0,
      material_evidence_delta_ref: ref('artifact_ref', 'delta_2'),
      successor_records: records({
        ...evidenceMap('map_3'),
        predecessor_evidence_map_ref: ref('evidence_map', 'map_1'),
        material_evidence_delta_ref: ref('artifact_ref', 'delta_2'),
      }),
    }),
    /EvidenceMap successor compare-and-swap failed/u,
  );
  assert.equal(await repository.findEvidenceMapById('map_3'), null);
});

test('initial EvidenceMap creation cannot bypass successor compare-and-swap lineage', async () => {
  const repository = new InMemoryTopicSelectionEvidenceMapRepository();
  const orphanSuccessor = {
    ...evidenceMap('map_orphan'),
    predecessor_evidence_map_ref: ref('evidence_map', 'map_missing'),
    material_evidence_delta_ref: ref('artifact_ref', 'delta_orphan'),
  };

  await assert.rejects(
    () => repository.createEvidenceMapWithRecords(
      records(orphanSuccessor) as unknown as TopicSelectionInitialEvidenceMapCreateRecords,
    ),
    /initial creation cannot carry successor lineage/u,
  );
  assert.equal(await repository.findEvidenceMapById('map_orphan'), null);
});

test('ordinary freshness updates cannot claim successor-only supersession', async () => {
  const repository = new InMemoryTopicSelectionEvidenceMapRepository();
  await repository.createEvidenceMapWithRecords(records(evidenceMap('map_1')));

  await assert.rejects(
    () => repository.updateEvidenceMapFreshness(
      'map_1',
      'superseded' as never,
      ['MANUAL_SUPERSESSION'],
    ),
    /requires successor compare-and-swap/u,
  );
  assert.equal((await repository.findEvidenceMapById('map_1'))?.freshness_status, 'current');
});

test('in-memory successor preflights child identities before advancing the predecessor', async () => {
  const repository = new InMemoryTopicSelectionEvidenceMapRepository();
  const predecessorRecords = records(evidenceMap('map_1'));
  predecessorRecords.evidence_units = [{ evidence_unit_id: 'unit_shared' } as TopicSelectionEvidenceUnitRecord];
  await repository.createEvidenceMapWithRecords(predecessorRecords);

  const deltaRef = ref('artifact_ref', 'delta_1');
  const successorRecords = records({
    ...evidenceMap('map_2'),
    predecessor_evidence_map_ref: ref('evidence_map', 'map_1'),
    material_evidence_delta_ref: deltaRef,
  });
  successorRecords.evidence_units = [{ evidence_unit_id: 'unit_shared' } as TopicSelectionEvidenceUnitRecord];

  await assert.rejects(
    () => repository.publishEvidenceMapSuccessorWithRecords({
      expected_predecessor_id: 'map_1',
      expected_lineage_revision: 0,
      material_evidence_delta_ref: deltaRef,
      successor_records: successorRecords,
    }),
    /record identity conflict/u,
  );
  assert.equal((await repository.findEvidenceMapById('map_1'))?.freshness_status, 'current');
  assert.equal(await repository.findEvidenceMapById('map_2'), null);
});
