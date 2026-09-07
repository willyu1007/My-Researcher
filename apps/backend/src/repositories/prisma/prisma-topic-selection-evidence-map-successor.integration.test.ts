import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceMapRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { TopicSelectionSearchPlanRecheckRequestRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { PrismaTopicSelectionEvidenceMapRepository } from './prisma-topic-selection-evidence-map-repository.js';
import type {
  TopicSelectionEvidenceMapRecords,
  TopicSelectionInitialEvidenceMapRecord,
} from '../topic-selection-evidence-map.repository.js';
import { PrismaTopicSelectionSearchResourceRepository } from './prisma-topic-selection-search-resource-repository.js';

const RUN_PRISMA = process.env.TOPIC_SELECTION_EVIDENCE_CONVERGENCE_PRISMA === '1'
  && Boolean(process.env.DATABASE_URL);

test('Prisma EvidenceMap successor publication is one transactional compare-and-swap', {
  skip: RUN_PRISMA
    ? false
    : 'set TOPIC_SELECTION_EVIDENCE_CONVERGENCE_PRISMA=1 and DATABASE_URL to run',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const repository = new PrismaTopicSelectionEvidenceMapRepository(prisma);
  const searchRepository = new PrismaTopicSelectionSearchResourceRepository(prisma);
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const titleCardId = `title_convergence_${suffix}`;
  const ref = (refType: string, refId: string): TopicSelectionFunctionalRef => ({
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
  });
  const map = (id: string): TopicSelectionInitialEvidenceMapRecord => ({
    evidence_map_id: `${id}_${suffix}`,
    title_card_id: titleCardId,
    evidence_map_version: `${id}_${suffix}`,
    status: 'ready',
    review_status: 'machine_checked',
    freshness_status: 'current',
    search_run_ref: ref('search_run', `run_${id}_${suffix}`),
    search_plan_ref: ref('search_plan', `plan_${suffix}`),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', `manifest_${suffix}`),
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
  });
  const records = <Map extends TopicSelectionEvidenceMapRecord>(
    evidenceMap: Map,
  ): TopicSelectionEvidenceMapRecords<Map> => ({
    evidence_map: evidenceMap,
    evidence_units: [],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  });
  const predecessor = map('map_1');
  const deltaRef = ref('artifact_ref', `delta_1_${suffix}`);

  try {
    await repository.createEvidenceMapWithRecords(records(predecessor));
    await repository.publishEvidenceMapSuccessorWithRecords({
      expected_predecessor_id: predecessor.evidence_map_id,
      expected_lineage_revision: 0,
      material_evidence_delta_ref: deltaRef,
      successor_records: records({
        ...map('map_2'),
        predecessor_evidence_map_ref: ref('evidence_map', predecessor.evidence_map_id),
        material_evidence_delta_ref: deltaRef,
        lineage_revision: 42,
      }),
    });

    const advanced = await repository.findEvidenceMapById(predecessor.evidence_map_id);
    assert.equal(advanced?.freshness_status, 'superseded');
    assert.equal(advanced?.lineage_revision, 1);
    assert.equal((await repository.findEvidenceMapById(`map_2_${suffix}`))?.lineage_revision, 0);
    await assert.rejects(
      () => repository.publishEvidenceMapSuccessorWithRecords({
        expected_predecessor_id: predecessor.evidence_map_id,
        expected_lineage_revision: 0,
        material_evidence_delta_ref: ref('artifact_ref', `delta_2_${suffix}`),
        successor_records: records({
          ...map('map_3'),
          predecessor_evidence_map_ref: ref('evidence_map', predecessor.evidence_map_id),
          material_evidence_delta_ref: ref('artifact_ref', `delta_2_${suffix}`),
        }),
      }),
      /EvidenceMap successor compare-and-swap failed/u,
    );
    assert.equal(await repository.findEvidenceMapById(`map_3_${suffix}`), null);

    const requestKey = `request_${suffix}`;
    const recheck = (id: string): TopicSelectionSearchPlanRecheckRequestRecord => ({
      search_plan_recheck_request_id: `${id}_${suffix}`,
      title_card_id: titleCardId,
      source_ref: ref('coverage_row_intent', `coverage_${suffix}`),
      target_search_plan_ref: ref('search_plan', `plan_${suffix}`),
      target_literature_snapshot_ref: ref('literature_resource_pool_snapshot', `manifest_${suffix}`),
      request_key: requestKey,
      strategy_key: `strategy_${suffix}`,
      issue_ref: ref('coverage_row_intent', `coverage_${suffix}`),
      originating_arena_session_ref: ref('research_arena_session', `arena_${suffix}`),
      retrieval_intent: null,
      expected_decision_effect: 'Recheck the missing row.',
      execution_policy: null,
      corpus_manifest_ref: ref('literature_resource_pool_snapshot', `manifest_${suffix}`),
      corpus_manifest_hash: `manifest_hash_${suffix}`,
      supporting_artifact_refs: [],
      reason: 'Resolve missing challenge coverage.',
      gap_codes: ['REQUIRED_COVERAGE_MISSING'],
      requested_by: 'system',
      status: 'open',
      decision_summary: null,
      policy_version_id: null,
      accepted_risk_refs: [],
      resulting_search_plan_ref: null,
      resulting_search_run_ref: null,
      created_at: '2026-09-03T00:00:00.000Z',
      resolved_at: null,
    });
    const [firstRequest, replayedRequest] = await Promise.all([
      searchRepository.createSearchPlanRecheckRequest(recheck('recheck_1')),
      searchRepository.createSearchPlanRecheckRequest(recheck('recheck_2')),
    ]);
    assert.equal(replayedRequest.search_plan_recheck_request_id, firstRequest.search_plan_recheck_request_id);
    const [claimedRequest, humanResolvedRequest] = await Promise.all([
      searchRepository.claimSearchPlanRecheckRequestExecution(firstRequest.search_plan_recheck_request_id),
      searchRepository.transitionSearchPlanRecheckRequest(
        firstRequest.search_plan_recheck_request_id,
        'open',
        {
          status: 'accepted',
          decision_summary: 'Human resolution won the race.',
          resolved_at: '2026-09-03T00:01:00.000Z',
        },
      ),
    ]);
    assert.equal(Number(claimedRequest !== null) + Number(humanResolvedRequest !== null), 1);

    if (claimedRequest) {
      const [automaticCompletion, staleHumanResolution] = await Promise.all([
        searchRepository.transitionSearchPlanRecheckRequest(
          firstRequest.search_plan_recheck_request_id,
          'executing',
          {
            status: 'materialized',
            decision_summary: 'The claimed automatic execution completed.',
            resolved_at: '2026-09-03T00:02:00.000Z',
          },
        ),
        searchRepository.transitionSearchPlanRecheckRequest(
          firstRequest.search_plan_recheck_request_id,
          'open',
          {
            status: 'rejected',
            decision_summary: 'This stale human write must lose.',
            resolved_at: '2026-09-03T00:02:00.000Z',
          },
        ),
      ]);
      assert.equal(automaticCompletion?.status, 'materialized');
      assert.equal(staleHumanResolution, null);
    }
  } finally {
    await prisma.topicSelectionSearchPlanRecheckRequest.deleteMany({ where: { titleCardId } });
    await prisma.topicSelectionEvidenceMap.deleteMany({ where: { titleCardId } });
    await prisma.$disconnect();
  }
});
