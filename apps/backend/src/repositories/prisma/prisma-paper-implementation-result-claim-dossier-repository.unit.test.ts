import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  ClaimCandidate,
  ClosedResultInterpretationPacketV2,
  ImplementationDossier,
  ResultInterpretationPacket,
  PaperImplementationWritingEntryPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import {
  serverHashPaperImplementationResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { PrismaPaperImplementationResultClaimDossierRepository } from './prisma-paper-implementation-result-claim-dossier-repository.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

type StoredRow = Record<string, unknown> & { id: string };

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeResultPacket(): ResultInterpretationPacket {
  return {
    result_interpretation_packet_id: 'result_interpretation_packet_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: 'experiment_plan_light_001',
    source: {
      run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      validation_report_refs: [ref('result_validation_report', 'report_001')],
      metric_refs: [ref('metric', 'metric_001')],
      failed_run_refs: [ref('run_evidence_unit', 'run_evidence_unit_failed_001')],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'Bounded evidence supports the assertion.',
      supports_assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    interpretation_gate_status: 'passed_with_risk',
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_result_001'),
    trace_manifest_id: 'trace_manifest_result_001',
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeClaimCandidate(): ClaimCandidate {
  return {
    claim_candidate_id: 'claim_candidate_001',
    implementation_project_id: PROJECT_ID,
    claim_type: 'empirical_finding',
    claim_statement: 'The method improves the admitted benchmark metric.',
    claim_strength: 'moderate',
    claim_status: 'supported',
    boundary_gate_status: 'allow_moderate',
    result_interpretation_packet_refs: [ref('result_interpretation_packet', 'result_interpretation_packet_001')],
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [],
    scope: {
      population_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      metric_scope: 'Primary metric.',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary: {
      rationale: 'Bounded to available run evidence.',
      forbidden_overclaims: ['broad generalization'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
      human_confirmation_ref: ref('human_decision', 'human_decision_001'),
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_claim_001'),
    trace_manifest_id: 'trace_manifest_claim_001',
    claim_trace_packet_ref: ref('claim_trace_packet', 'claim_trace_packet_001'),
    claim_trace_packet_id: 'claim_trace_packet_001',
    human_confirmation_required: false,
    forbidden_overclaim_count: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeDossier(): ImplementationDossier {
  return {
    dossier_id: 'implementation_dossier_001',
    implementation_project_id: PROJECT_ID,
    dossier_version: 1,
    dossier_status: 'ready_for_writing',
    dossier_trace_status: 'complete',
    source: {
      result_interpretation_packet_refs: [ref('result_interpretation_packet', 'result_interpretation_packet_001')],
      claim_candidate_refs: [ref('claim_candidate', 'claim_candidate_001')],
      claim_trace_packet_refs: [ref('claim_trace_packet', 'claim_trace_packet_001')],
      run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
      validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_001')],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_dossier_001')],
    },
    experiment_section: {
      failed_run_refs: [ref('run_evidence_unit', 'run_evidence_unit_failed_001')],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_001')],
      rejected_claim_refs: [],
      forbidden_overclaims: ['broad generalization'],
      claim_ceiling: 'moderate',
    },
    readiness: {
      readiness_gate_result_id: 'dossier_readiness_gate_001',
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_dossier_001'),
    trace_manifest_id: 'trace_manifest_dossier_001',
    failed_run_count: 1,
    forbidden_overclaim_count: 1,
    readiness_gate_result_id: 'dossier_readiness_gate_001',
    projection_policy_version_id: 'writing_projection_policy_v1',
    dossier_hash: 'sha256:dossier_hash_001',
    reopen_condition: null,
    abandon_reason: null,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeWritingPacket(): PaperImplementationWritingEntryPacket {
  return {
    writing_entry_packet_id: 'writing_entry_packet_001',
    implementation_project_id: PROJECT_ID,
    dossier_id: 'implementation_dossier_001',
    dossier_version: 1,
    dossier_hash: 'sha256:dossier_hash_001',
    dossier_status: 'ready_for_writing',
    readiness_gate_result_id: 'dossier_readiness_gate_001',
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_dossier_001'),
    trace_manifest_id: 'trace_manifest_dossier_001',
    projection_policy_version_id: 'writing_projection_policy_v1',
    packet_status: 'current',
    writing_target_ref: ref('paper_project_section', 'results_section_001'),
    packet_payload: {
      target_section: 'results',
    },
    created_by: 'system',
    created_at: NOW,
  };
}

function normalizeRow(row: StoredRow): StoredRow {
  const normalized: StoredRow = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if (key.endsWith('At') && typeof value === 'string') {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push(normalizeRow(data));
      return rows.at(-1);
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findUnique: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where?: Partial<StoredRow> }) =>
      rows.filter((row) => matchesWhere(row, where ?? {})),
  };
}

function makeMaterializationPrismaClient(): PrismaClient {
  const packetRows: StoredRow[] = [];
  const closureRows: StoredRow[] = [{
    id: 'closure_001',
    closureSnapshotHash: `sha256:${'1'.repeat(64)}`,
    validationCycleId: 'validation_cycle_001',
    implementationProjectId: PROJECT_ID,
    closureKind: 'scientific_evidence_assessed',
  }];
  const client = {
    paperImplementationResultInterpretationPacket: makeModel(packetRows),
    paperImplementationValidationCycleClosureV2: makeModel(closureRows),
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
  };
  return client as unknown as PrismaClient;
}

function makeUniqueRacePrismaClient(): PrismaClient {
  const packetRows: StoredRow[] = [];
  const closureRows: StoredRow[] = [{
    id: 'closure_001',
    closureSnapshotHash: `sha256:${'1'.repeat(64)}`,
    validationCycleId: 'validation_cycle_001',
    implementationProjectId: PROJECT_ID,
    closureKind: 'scientific_evidence_assessed',
  }];
  const packetModel = makeModel(packetRows);
  const ordinaryCreate = packetModel.create;
  let injectUniqueRace = true;
  packetModel.create = async ({ data }: { data: StoredRow }) => {
    if (!injectUniqueRace) return ordinaryCreate({ data });
    injectUniqueRace = false;
    packetRows.push(normalizeRow(data));
    throw new Prisma.PrismaClientKnownRequestError('simulated unique race', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['closureId'] },
    });
  };
  const client = {
    paperImplementationResultInterpretationPacket: packetModel,
    paperImplementationValidationCycleClosureV2: makeModel(closureRows),
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
  };
  return client as unknown as PrismaClient;
}

function makeClosedResultPacket(): ClosedResultInterpretationPacketV2 {
  const legacy = makeResultPacket();
  const withoutHash = {
    ...legacy,
    schema_version: 'PaperImplementationResultInterpretationPacket@v2' as const,
    closure_id: 'closure_001',
    closure_snapshot_hash: `sha256:${'1'.repeat(64)}`,
  };
  const { created_at: createdAt, ...hashInput } = withoutHash;
  return {
    ...withoutHash,
    packet_content_hash: serverHashPaperImplementationResultInterpretationPacketV2(hashInput),
    created_at: createdAt,
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): PrismaClient {
  return {
    paperImplementationResultInterpretationPacket: makeModel([]),
    paperImplementationClaimCandidate: makeModel([]),
    paperImplementationDossier: makeModel([]),
    paperImplementationWritingEntryPacket: makeModel([]),
  } as unknown as PrismaClient;
}

test('Prisma PaperImplementationResultClaimDossier repository round-trips all result claim objects', async () => {
  const repository = new PrismaPaperImplementationResultClaimDossierRepository(makeFakePrismaClient());

  const resultPacket = await repository.createResultInterpretationPacket(makeResultPacket());
  assert.equal(resultPacket.interpretation_gate_status, 'passed_with_risk');
  assert.equal(
    (await repository.findResultInterpretationPacketById(PROJECT_ID, 'result_interpretation_packet_001'))
      ?.source.failed_run_refs[0]?.ref_id,
    'run_evidence_unit_failed_001',
  );
  assert.equal((await repository.listResultInterpretationPackets(PROJECT_ID))[0]?.trace_manifest_id, 'trace_manifest_result_001');

  const claim = await repository.createClaimCandidate(makeClaimCandidate());
  assert.equal(claim.claim_trace_packet_id, 'claim_trace_packet_001');
  assert.equal((await repository.listClaimCandidates(PROJECT_ID))[0]?.boundary.human_confirmation_ref?.ref_id, 'human_decision_001');

  const dossier = await repository.createImplementationDossier(makeDossier());
  assert.equal(dossier.dossier_status, 'ready_for_writing');
  assert.equal((await repository.findImplementationDossierById(PROJECT_ID, 'implementation_dossier_001'))?.failed_run_count, 1);

  const writingPacket = await repository.createWritingEntryPacket(makeWritingPacket());
  assert.equal(writingPacket.projection_policy_version_id, 'writing_projection_policy_v1');
  assert.equal((await repository.listWritingEntryPackets(PROJECT_ID))[0]?.writing_target_ref?.ref_id, 'results_section_001');
});

test('Prisma Packet v2 materialization inserts once and returns exact replay', async () => {
  const repository = new PrismaPaperImplementationResultClaimDossierRepository(
    makeMaterializationPrismaClient(),
  );
  const packet = makeClosedResultPacket();
  const first = await repository.materializeClosedResultInterpretationPacket(packet);
  const replay = await repository.materializeClosedResultInterpretationPacket(packet);
  assert.deepEqual(first, packet);
  assert.deepEqual(replay, packet);
  assert.equal((await repository.listResultInterpretationPackets(PROJECT_ID)).length, 1);
});

test('Prisma Packet v2 materialization reconciles an identical concurrent unique winner', async () => {
  const repository = new PrismaPaperImplementationResultClaimDossierRepository(
    makeUniqueRacePrismaClient(),
  );
  const packet = makeClosedResultPacket();
  assert.deepEqual(
    await repository.materializeClosedResultInterpretationPacket(packet),
    packet,
  );
  assert.equal((await repository.listResultInterpretationPackets(PROJECT_ID)).length, 1);
});

test('result claim dossier migration declares queryable gate trace and projection indexes', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260521220000_add_paper_implementation_result_claim_dossier/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pirip_cycle_idx',
    'pirip_gate_status_idx',
    'pirip_trace_manifest_idx',
    'piccl_claim_trace_idx',
    'piccl_boundary_status_idx',
    'pid_status_idx',
    'pid_readiness_gate_idx',
    'pid_projection_policy_idx',
    'piwep_dossier_version_idx',
    'piwep_projection_policy_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
  const pktSql = await readFile(
    new URL('../../../../../prisma/migrations/20260808090000_add_scientific_source_and_packet_closure_binding/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pirip_scientific_v2_contract_check',
    'pi_cycle_closure_packet_exact_unique',
    'pirip_closure_unique',
    'pirip_closure_exact_fkey',
  ]) assert.match(pktSql, new RegExp(expected));
});
