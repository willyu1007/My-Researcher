import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CitationCandidate,
  ClaimTracePacket,
  NaturalLanguageFieldRoleRecord,
  TraceLineageBundle,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import { PrismaPaperImplementationTraceRepository } from './prisma-paper-implementation-trace-repository.js';

const NOW = '2026-05-20T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function makeManifest(): TraceManifest {
  return {
    trace_manifest_id: 'trace_manifest_001',
    implementation_project_id: PROJECT_ID,
    target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    lineage: emptyLineage(),
    integrity: {
      missing_refs: [ref('source_locator', 'source_locator_missing')],
      broken_refs: [],
      stale_refs: [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: 'broken',
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: 1,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeQueueItem(manifest: TraceManifest): TraceRepairQueueItem {
  return {
    queue_item_id: 'trace_repair_queue_item_001',
    implementation_project_id: manifest.implementation_project_id,
    trace_manifest_id: manifest.trace_manifest_id,
    target_ref: manifest.target_ref,
    lineage_type: 'literature',
    blocker_code: 'missing_ref',
    severity: 'blocking',
    status: 'open',
    source_ref: ref('source_locator', 'source_locator_missing'),
    created_by: 'system',
    created_at: NOW,
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
  };
}

function makeCandidate(manifest: TraceManifest): CitationCandidate {
  return {
    citation_candidate_id: 'citation_candidate_001',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: manifest.trace_manifest_id,
    trace_manifest_ref: ref('trace_manifest', manifest.trace_manifest_id),
    source_kind: 'literature_evidence_unit',
    source_type: 'paper',
    source_id: 'literature_source_001',
    source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
    source_locator_id: 'source_locator_001',
    locator_quality: 'exact',
    locator: {
      section: '3.1',
      paragraph: '2',
    },
    cited_for: ['method_prior_art'],
    linked_target_refs: [manifest.target_ref],
    status: 'candidate',
    normalized_source_statement: 'The prior paper establishes the comparison point.',
    citation_limitation: null,
    created_by: 'system',
    created_at: NOW,
  };
}

function makeClaimPacket(manifest: TraceManifest, candidate: CitationCandidate): ClaimTracePacket {
  return {
    claim_trace_packet_id: 'claim_trace_packet_001',
    implementation_project_id: PROJECT_ID,
    claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
    claim_statement: 'The implementation supports the bounded workflow.',
    trace_manifest_id: manifest.trace_manifest_id,
    trace_manifest_ref: ref('trace_manifest', manifest.trace_manifest_id),
    lineage: {
      ...emptyLineage(),
      literature: {
        ...emptyLineage().literature,
        citation_candidate_refs: [ref('citation_candidate', candidate.citation_candidate_id)],
      },
    },
    challenge: {
      challenging_result_refs: [],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      task_scope: 'bounded workflow',
    },
    boundary: {
      forbidden_overclaims: ['Do not claim broad superiority.'],
      claim_strength: 'tentative',
      human_confirmation_required: true,
    },
    created_by: 'system',
    created_at: NOW,
  };
}

function makeFieldRole(): NaturalLanguageFieldRoleRecord {
  return {
    field_role_record_id: 'natural_language_field_role_001',
    implementation_project_id: PROJECT_ID,
    field_owner_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    field_name: 'problem_statement',
    field_role: 'semantic_contract',
    can_feed_workflow: true,
    can_feed_hard_gate: true,
    can_be_cited: false,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

type StoredRow = Record<string, unknown> & { id: string };

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push({ ...data });
      return rows.at(-1);
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.filter((row) => matchesWhere(row, where)),
    update: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const index = rows.findIndex((row) => matchesWhere(row, where));
      if (index < 0) {
        throw new Error('row not found');
      }
      rows[index] = { ...rows[index], ...data };
      return rows[index];
    },
  };
}

function makeCreateManyModel(rows: StoredRow[]) {
  return {
    ...makeModel(rows),
    createMany: async ({ data }: { data: StoredRow[] }) => {
      rows.push(...data.map((row) => ({ ...row })));
      return { count: data.length };
    },
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): PrismaClient {
  const traceRows: StoredRow[] = [];
  const queueRows: StoredRow[] = [];
  const citationRows: StoredRow[] = [];
  const claimRows: StoredRow[] = [];
  const fieldRoleRows: StoredRow[] = [];
  const client = {
    paperImplementationTraceManifest: makeModel(traceRows),
    paperImplementationTraceRepairQueueItem: makeCreateManyModel(queueRows),
    paperImplementationCitationCandidate: makeModel(citationRows),
    paperImplementationClaimTracePacket: makeModel(claimRows),
    paperImplementationNaturalLanguageFieldRole: makeModel(fieldRoleRows),
  };
  return {
    ...client,
    $transaction: async (callback: (tx: typeof client) => Promise<unknown>) => callback(client),
  } as unknown as PrismaClient;
}

test('Prisma PaperImplementationTrace repository round-trips trace objects and repair queue resolution', async () => {
  const repository = new PrismaPaperImplementationTraceRepository(makeFakePrismaClient());
  const manifest = makeManifest();
  const queueItem = makeQueueItem(manifest);

  const createdManifest = await repository.createTraceManifest(manifest, [queueItem]);
  assert.equal(createdManifest.trace_manifest_id, manifest.trace_manifest_id);
  assert.equal(
    (await repository.findTraceManifestById(PROJECT_ID, manifest.trace_manifest_id))?.missing_ref_count,
    1,
  );
  assert.equal((await repository.listTraceManifests(PROJECT_ID)).length, 1);

  const candidate = await repository.createCitationCandidate(makeCandidate(manifest));
    assert.equal(candidate.source_locator_id, 'source_locator_001');
  assert.equal(candidate.source_evidence_unit_ref.ref_id, 'literature_evidence_unit_001');
  assert.equal((await repository.listCitationCandidates(PROJECT_ID))[0]?.citation_candidate_id, candidate.citation_candidate_id);

  const packet = await repository.createClaimTracePacket(makeClaimPacket(manifest, candidate));
  assert.equal(packet.claim_ref.ref_id, 'claim_candidate_001');
  assert.equal((await repository.listClaimTracePackets(PROJECT_ID))[0]?.claim_trace_packet_id, packet.claim_trace_packet_id);

  const fieldRole = await repository.createNaturalLanguageFieldRole(makeFieldRole());
  assert.equal(fieldRole.field_role, 'semantic_contract');
  assert.equal(fieldRole.can_be_cited, false);
  const foundFieldRole = await repository.findNaturalLanguageFieldRoleByIdentity(
    PROJECT_ID,
    fieldRole.field_owner_ref,
    fieldRole.field_name,
    fieldRole.policy_version_id ?? null,
  );
  assert.equal(foundFieldRole?.field_role_record_id, fieldRole.field_role_record_id);

  const queue = await repository.listTraceRepairQueueItems(PROJECT_ID);
  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.blocker_code, 'missing_ref');

  const resolved = await repository.resolveTraceRepairQueueItem(PROJECT_ID, queueItem.queue_item_id, {
    resolved_by: 'human',
    resolved_at: NOW,
    resolution_note: 'Superseded by a later trace manifest.',
  });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolved_by, 'human');

  const byManifest = await repository.listTraceRepairQueueItemsByManifest(PROJECT_ID, manifest.trace_manifest_id);
  assert.equal(byManifest[0]?.status, 'resolved');
});

test('Prisma PaperImplementationTrace repository maps CitationCandidate unique races to VERSION_CONFLICT', async () => {
  const client = {
    paperImplementationCitationCandidate: {
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('simulated citation race', {
          code: 'P2002',
          clientVersion: '5.22.0',
        });
      },
    },
  } as unknown as PrismaClient;
  const repository = new PrismaPaperImplementationTraceRepository(client);

  await assert.rejects(
    repository.createCitationCandidate(makeCandidate(makeManifest())),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('trace kernel migration declares query indexes for gate queue dossier and evaluation lookups', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260520130000_add_paper_implementation_trace_kernel/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pitm_target_idx',
    'pitm_trace_status_idx',
    'pitm_broken_count_idx',
    'pitm_stale_count_idx',
    'pitm_missing_count_idx',
    'picc_trace_manifest_idx',
    'picc_source_locator_idx',
    'picc_source_evidence_ref_idx',
    'picc_linked_target_idx',
    'picp_claim_ref_idx',
    'pinl_owner_ref_idx',
    'pinl_owner_field_policy_unique',
    'pinl_field_role_idx',
    'pitrq_manifest_status_idx',
    'pitrq_blocker_code_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
});
