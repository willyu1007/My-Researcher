import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import type {
  DatasetAsset,
  DatasetAssetCandidate,
  DatasetMirror,
  DatasetVersion,
  DataPolicy,
  EvaluationProtocol,
  ExperimentAssetCandidateCompletenessCheck,
  ExperimentAssetCandidateDuplicateCheck,
  ExperimentAssetCandidatePolicyCheck,
  ExperimentAssetCandidateRiskAssessment,
  ExperimentAssetCandidateSourceTrace,
  ExperimentAssetPromotionRequest,
  ExperimentAssetPromotionResult,
  ExperimentFoundationRecordKind,
  ExperimentFoundationExternalLockRef,
  ExperimentFoundationStoredRecord,
  FineTuningResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { buildApp } from '../app.js';
import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationRepository } from '../repositories/in-memory-experiment-foundation-repository.js';
import type { ExperimentFoundationRepository } from '../repositories/experiment-foundation.repository.js';
import { PrismaExperimentFoundationRepository } from '../repositories/prisma/prisma-experiment-foundation-repository.js';
import { ExperimentFoundationService } from './experiment-foundation-service.js';

const timestamp = '2026-05-18T00:00:00.000Z';

function sourceRef(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
  };
}

function asPayload(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function storedRecord(
  recordKind: ExperimentFoundationRecordKind,
  recordId: string,
  payload: Record<string, unknown>,
): ExperimentFoundationStoredRecord {
  return {
    id: `record_${recordKind}_${recordId}`,
    record_kind: recordKind,
    record_id: recordId,
    record_hash: typeof payload.candidate_hash === 'string'
      ? payload.candidate_hash
      : typeof payload.request_hash === 'string'
        ? payload.request_hash
        : typeof payload.promotion_hash === 'string'
          ? payload.promotion_hash
          : 'sha256:record',
    status: typeof payload.candidate_status === 'string'
      ? payload.candidate_status
      : typeof payload.result_status === 'string'
        ? payload.result_status
        : null,
    family: typeof payload.candidate_family === 'string' ? payload.candidate_family : null,
    parent_record_kind: null,
    parent_record_id: null,
    owner_ref_type: null,
    owner_ref_id: null,
    payload,
    source_refs: [],
    traceability_refs: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function datasetAssetPayload(): DatasetAsset {
  return {
    dataset_asset_id: 'dataset_asset_001',
    name: 'AG News',
    aliases: ['ag_news'],
    description: 'News classification benchmark dataset.',
    source_refs: [sourceRef('manual_observation', 'observation_001')],
    task_types: ['text_classification'],
    schema_summary: { columns: ['text', 'label'] },
    default_version_id: 'dataset_version_001',
    catalog_status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function dataPolicyPayload(): DataPolicy {
  return {
    data_policy_id: 'data_policy_001',
    license: 'CC BY-SA 4.0',
    access_level: 'open',
    privacy_level: 'public',
    allowed_use_cases: ['benchmarking'],
    mirror_policy: 'allowed',
    approval_refs: [],
    policy_hash: 'sha256:data-policy',
    retention_notes: null,
    created_at: timestamp,
  };
}

function datasetVersionPayload(
  readinessStatus: DatasetVersion['readiness_status'] = 'ready',
): DatasetVersion {
  return {
    dataset_version_id: 'dataset_version_001',
    dataset_asset_id: 'dataset_asset_001',
    version_label: 'v1',
    checksum_manifest_id: 'checksum_manifest_001',
    checksum_manifest_hash: 'sha256:checksum-manifest',
    split_protocol_id: 'split_protocol_001',
    split_protocol_hash: 'sha256:split-protocol',
    data_policy_id: 'data_policy_001',
    data_policy_hash: 'sha256:data-policy',
    processing_recipe_ref: null,
    location_ids: ['dataset_location_001'],
    access_status: 'available',
    readiness_status: readinessStatus,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function datasetMirrorPayload(): DatasetMirror {
  return {
    dataset_mirror_id: 'dataset_mirror_001',
    dataset_version_id: 'dataset_version_001',
    mirror_role: 'execution_mirror',
    provider: 'local_execution_cache',
    mirror_ref: sourceRef('execution_mirror', 'dataset_mirror_001'),
    mirror_status: 'stale',
    source_checksum_manifest_hash: 'sha256:checksum-manifest',
    freshness_status: 'stale',
    approval_ref: null,
    run_scope_ref: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function evaluationProtocolPayload(): EvaluationProtocol {
  return {
    evaluation_protocol_id: 'evaluation_protocol_001',
    benchmark_asset_id: 'benchmark_asset_001',
    protocol_version: 'v1',
    protocol_hash: 'sha256:evaluation-protocol',
    metric_definition_refs: [sourceRef('metric_definition', 'metric_accuracy')],
    evaluator_refs: [sourceRef('evaluator', 'accuracy_evaluator')],
    aggregation: { primary_metric: 'accuracy' },
    seed_policy: { seed: 42 },
    repeat_policy: { repeats: 3 },
    reporting_protocol: { report_splits: ['test'] },
    comparison_policy: { compare_to: 'baseline' },
    statistical_protocol: { test: 'bootstrap' },
    budget_fairness_policy: { same_budget: true },
    tuning_fairness_policy: { same_search_space: true },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function candidateSourceTracePayload(): ExperimentAssetCandidateSourceTrace {
  return {
    source_trace_id: 'source_trace_001',
    source_kind: 'literature_key_content',
    source_ref: sourceRef('literature_key_content', 'key_content_001'),
    extraction_ref: sourceRef('candidate_extraction', 'extraction_001'),
    evidence_locator_snapshot: { quote: 'AG News' },
    confidence_score: 0.92,
    extracted_at: timestamp,
    created_at: timestamp,
  };
}

function duplicateCheckPayload(
  status: ExperimentAssetCandidateDuplicateCheck['duplicate_status'] = 'no_duplicate',
): ExperimentAssetCandidateDuplicateCheck {
  return {
    duplicate_check_id: 'duplicate_check_001',
    duplicate_status: status,
    checked_refs: [sourceRef('dataset_asset', 'dataset_asset_001')],
    possible_duplicate_refs: status === 'no_duplicate' ? [] : [sourceRef('dataset_asset', 'dataset_asset_001')],
    rationale: 'Checked normalized name and source refs.',
    checked_at: timestamp,
  };
}

function completenessCheckPayload(
  status: ExperimentAssetCandidateCompletenessCheck['completeness_status'] = 'complete',
): ExperimentAssetCandidateCompletenessCheck {
  return {
    completeness_check_id: 'completeness_check_001',
    completeness_status: status,
    required_fields: ['canonical_name', 'source_refs'],
    missing_fields: status === 'complete' ? [] : ['policy_check'],
    checked_at: timestamp,
  };
}

function policyCheckPayload(
  status: ExperimentAssetCandidatePolicyCheck['policy_status'] = 'clear',
): ExperimentAssetCandidatePolicyCheck {
  return {
    policy_check_id: 'policy_check_001',
    policy_status: status,
    license: status === 'clear' ? 'CC BY-SA 4.0' : 'unknown',
    policy_ref: status === 'clear' ? sourceRef('data_policy', 'data_policy_001') : null,
    policy_hash: status === 'clear' ? 'sha256:data-policy' : null,
    restricted_reasons: status === 'clear' ? [] : ['license unclear'],
    checked_at: timestamp,
  };
}

function riskAssessmentPayload(
  riskLevel: ExperimentAssetCandidateRiskAssessment['risk_level'] = 'low',
): ExperimentAssetCandidateRiskAssessment {
  return {
    risk_assessment_id: 'risk_assessment_001',
    risk_level: riskLevel,
    risk_reasons: riskLevel === 'low' ? [] : ['manual review required'],
    privacy_sensitive: riskLevel === 'restricted',
    model_weight_sensitive: false,
    requires_manual_review: riskLevel !== 'low',
    assessed_at: timestamp,
  };
}

function datasetCandidatePayload(overrides: Partial<DatasetAssetCandidate> = {}): DatasetAssetCandidate {
  return {
    dataset_asset_candidate_id: 'dataset_asset_candidate_001',
    candidate_family: 'dataset',
    candidate_status: 'ready_for_promotion',
    canonical_name: 'AG News',
    aliases: ['ag_news'],
    description: 'Extracted dataset candidate.',
    dataset_usage: 'benchmark_dataset',
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    source_traces: [candidateSourceTracePayload()],
    extraction_provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    confidence_score: 0.92,
    duplicate_check: duplicateCheckPayload(),
    completeness_check: completenessCheckPayload(),
    policy_check: policyCheckPayload(),
    risk_assessment: riskAssessmentPayload(),
    deterministic_rule_trace_refs: [sourceRef('candidate_rule_trace', 'rule_trace_001')],
    existing_canonical_refs: [],
    task_types: ['text_classification'],
    schema_summary: { columns: ['text', 'label'] },
    version_label: 'candidate-v1',
    proposed_version_refs: [sourceRef('dataset_version_candidate', 'dataset_version_candidate_001')],
    proposed_policy_refs: [sourceRef('data_policy_candidate', 'data_policy_candidate_001')],
    proposed_location_refs: [sourceRef('dataset_location_candidate', 'dataset_location_candidate_001')],
    candidate_hash: 'sha256:asset-candidate',
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function promotionRequestPayload(
  candidateHash = 'sha256:asset-candidate',
): ExperimentAssetPromotionRequest {
  return {
    promotion_request_id: 'promotion_request_001',
    candidate_ref: sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001'),
    candidate_hash: candidateHash,
    candidate_family: 'dataset',
    decision_kind: 'auto_promote',
    candidate_status: 'ready_for_promotion',
    confidence_score: 0.92,
    duplicate_status: 'no_duplicate',
    completeness_status: 'complete',
    policy_status: 'clear',
    risk_level: 'low',
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    deterministic_rule_trace_refs: [sourceRef('candidate_rule_trace', 'rule_trace_001')],
    required_version_refs: [sourceRef('dataset_version', 'dataset_version_001')],
    required_policy_refs: [sourceRef('data_policy', 'data_policy_001')],
    required_protocol_refs: [sourceRef('evaluation_protocol', 'evaluation_protocol_001')],
    triage_report_ref: sourceRef('asset_candidate_triage_report', 'candidate_triage_report_001'),
    triage_report_hash: 'sha256:candidate-triage-report',
    reviewer_ref: null,
    requested_by_ref: sourceRef('user', 'user_001'),
    requested_at: timestamp,
    request_hash: 'sha256:auto-promote-request',
  };
}

function promotionResultPayload(
  candidateHash = 'sha256:asset-candidate',
): ExperimentAssetPromotionResult {
  return {
    promotion_result_id: 'promotion_result_001',
    promotion_request_id: 'promotion_request_001',
    candidate_ref: sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001'),
    candidate_hash: candidateHash,
    candidate_family: 'dataset',
    result_status: 'promoted',
    canonical_asset_refs: [sourceRef('dataset_asset', 'dataset_asset_001')],
    canonical_version_refs: [sourceRef('dataset_version', 'dataset_version_001')],
    canonical_protocol_refs: [sourceRef('evaluation_protocol', 'evaluation_protocol_001')],
    canonical_policy_refs: [sourceRef('data_policy', 'data_policy_001')],
    blockers: [],
    warnings: [],
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    promotion_hash: 'sha256:promotion-result',
    created_at: timestamp,
  };
}

function externalLockRef(refKind: ExperimentFoundationExternalLockRef['ref_kind']): ExperimentFoundationExternalLockRef {
  return {
    ref_kind: refKind,
    ref: sourceRef(refKind, `${refKind}_001`),
    ref_hash: `sha256:${refKind}`,
  };
}

function fineTuningResultPayload(): FineTuningResult {
  return {
    fine_tuning_result_id: 'fine_tuning_result_001',
    experiment_result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    experiment_result_hash: 'sha256:experiment-result',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    base_model_ref: externalLockRef('base_model'),
    fine_tuning_dataset_refs: [externalLockRef('fine_tuning_dataset')],
    adapter_artifact_ref: sourceRef('artifact', 'adapter_001'),
    adapter_artifact_hash: 'sha256:adapter-artifact',
    checkpoint_artifact_refs: [],
    merged_model_artifact_ref: null,
    merged_model_artifact_hash: null,
    train_metrics: [],
    eval_metrics: [],
    training_curve_refs: [],
    model_card_ref: sourceRef('model_card', 'model_card_001'),
    model_card_hash: 'sha256:model-card',
    validation_status: 'invalid',
    blockers: ['metric bundle missing'],
    traceability_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
    result_hash: 'sha256:fine-tuning-result',
    created_at: timestamp,
  };
}

async function seedCanonicalRecords(service: ExperimentFoundationService) {
  await service.createRecord({ record_kind: 'dataset_asset', payload: asPayload(datasetAssetPayload()) });
  await service.createRecord({ record_kind: 'dataset_version', payload: asPayload(datasetVersionPayload()) });
  await service.createRecord({ record_kind: 'data_policy', payload: asPayload(dataPolicyPayload()) });
  await service.createRecord({ record_kind: 'evaluation_protocol', payload: asPayload(evaluationProtocolPayload()) });
}

test('in-memory experiment-foundation repository supports create/read/list/update', async () => {
  const repository = new InMemoryExperimentFoundationRepository();
  const record: ExperimentFoundationStoredRecord = {
    id: 'record_001',
    record_kind: 'dataset_asset',
    record_id: 'dataset_asset_001',
    record_hash: 'sha256:dataset-asset',
    status: 'active',
    family: 'dataset',
    parent_record_kind: null,
    parent_record_id: null,
    owner_ref_type: null,
    owner_ref_id: null,
    payload: datasetAssetPayload() as unknown as Record<string, unknown>,
    source_refs: [sourceRef('manual_observation', 'observation_001')],
    traceability_refs: [],
    created_at: timestamp,
    updated_at: timestamp,
  };

  await repository.createRecord(record);
  assert.equal((await repository.findRecord('dataset_asset', 'dataset_asset_001'))?.record_id, 'dataset_asset_001');
  assert.equal((await repository.listRecords({ recordKind: 'dataset_asset' })).records.length, 1);
  assert.equal(
    (await repository.updateRecordStatus('dataset_asset', 'dataset_asset_001', 'deprecated'))?.status,
    'deprecated',
  );
});

test('experiment-foundation service validates kind, schema, and alias/private leakage', async () => {
  const service = new ExperimentFoundationService(new InMemoryExperimentFoundationRepository());

  await assert.rejects(
    () => service.createRecord({
      record_kind: 'dataset' as never,
      payload: asPayload(datasetAssetPayload()),
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => service.createRecord({
      record_kind: 'dataset_asset',
      payload: {
        ...datasetAssetPayload(),
        storage_ref: sourceRef('storage', 'storage_001'),
      },
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('legacy scientific create and upsert writers fail closed before repository access', async () => {
  const backingRepository = new InMemoryExperimentFoundationRepository();
  let repositoryAccessCount = 0;
  const repository = new Proxy(backingRepository, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }
      return (...args: unknown[]) => {
        repositoryAccessCount += 1;
        return Reflect.apply(value, target, args);
      };
    },
  }) as ExperimentFoundationRepository;
  const service = new ExperimentFoundationService(repository);
  const closedKinds = [
    'experiment_result',
    'result_validation_report',
    'evidence_candidate',
  ] as const;

  for (const recordKind of closedKinds) {
    const assertClosed = (error: unknown) => (
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED'
    );
    await assert.rejects(
      () => service.createRecord({ record_kind: recordKind, payload: {} }),
      assertClosed,
    );
    await assert.rejects(
      () => service.upsertRecord(recordKind, `${recordKind}_closed`, {
        record_kind: recordKind,
        payload: {},
      }),
      assertClosed,
    );
  }

  assert.equal(repositoryAccessCount, 0);
  assert.equal((await backingRepository.listRecords({})).records.length, 0);

  const created = await service.createRecord({
    record_kind: 'dataset_asset',
    payload: asPayload(datasetAssetPayload()),
  });
  const upserted = await service.upsertRecord('dataset_asset', created.record_id, {
    record_kind: 'dataset_asset',
    payload: asPayload({ ...datasetAssetPayload(), description: 'Updated non-scientific record.' }),
  });
  assert.equal(upserted.payload.description, 'Updated non-scientific record.');
  assert.ok(repositoryAccessCount > 0);
});

test('cutover-off generic HTTP routes surface the closed scientific writer reason', async () => {
  const app = buildApp({ paperImplementationExperimentV2CutoverCommitted: () => false });
  await app.ready();
  try {
    for (const method of ['POST', 'PUT'] as const) {
      const recordKind = 'experiment_result';
      const response = await app.inject({
        method,
        url: method === 'POST'
          ? '/experiment-foundation/records'
          : `/experiment-foundation/records/${recordKind}/${recordKind}_closed`,
        payload: { record_kind: recordKind, payload: {} },
      });
      assert.equal(response.statusCode, 409, response.body);
      assert.equal(response.json().error.code, 'GATE_CONSTRAINT_FAILED');
      assert.equal(
        response.json().error.details.reason_code,
        'LEGACY_SCIENTIFIC_WRITER_CLOSED',
      );
    }
  } finally {
    await app.close();
  }
});

test('experiment-foundation readiness blocks non-ready versions, stale mirrors, and invalid fine-tuning results', async () => {
  const repository = new InMemoryExperimentFoundationRepository();
  const service = new ExperimentFoundationService(repository);

  await service.createRecord({
    record_kind: 'dataset_version',
    payload: asPayload(datasetVersionPayload('metadata_complete')),
  });
  await service.createRecord({ record_kind: 'dataset_mirror', payload: asPayload(datasetMirrorPayload()) });

  const datasetReadiness = await service.checkReadiness({
    target_ref: sourceRef('dataset_version', 'dataset_version_001'),
    source_refs: [sourceRef('system_check', 'readiness')],
  });
  assert.equal(datasetReadiness.readiness_status, 'blocked');
  assert.ok(datasetReadiness.blockers.some((blocker) => blocker.includes('readiness_status')));
  assert.ok(datasetReadiness.blockers.some((blocker) => blocker.includes('stale')));

  await repository.createRecord({
    id: 'record_fine_tuning_result_001',
    record_kind: 'fine_tuning_result',
    record_id: 'fine_tuning_result_001',
    record_hash: 'sha256:fine-tuning-result',
    status: 'invalid',
    family: 'evidence',
    parent_record_kind: null,
    parent_record_id: null,
    owner_ref_type: null,
    owner_ref_id: null,
    payload: asPayload(fineTuningResultPayload()),
    source_refs: [],
    traceability_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
    created_at: timestamp,
    updated_at: timestamp,
  });
  const resultReadiness = await service.checkReadiness({
    target_ref: sourceRef('fine_tuning_result', 'fine_tuning_result_001'),
    source_refs: [sourceRef('system_check', 'readiness')],
  });
  assert.equal(resultReadiness.readiness_status, 'blocked');
  assert.ok(resultReadiness.blockers.some((blocker) => blocker.includes('validation_status')));
});

test('experiment-foundation promotion gate rejects unsafe candidates and promotes existing canonical refs', async () => {
  const service = new ExperimentFoundationService(new InMemoryExperimentFoundationRepository());

  await seedCanonicalRecords(service);
  await service.createRecord({
    record_kind: 'dataset_asset_candidate',
    payload: asPayload(datasetCandidatePayload({
      confidence_score: 0.7,
      candidate_hash: 'sha256:low-confidence-candidate',
    })),
  });

  await assert.rejects(
    () => service.decidePromotion('dataset_asset_candidate_001', {
      promotion_request: promotionRequestPayload('sha256:low-confidence-candidate'),
      promotion_result: promotionResultPayload('sha256:low-confidence-candidate'),
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const repository = new InMemoryExperimentFoundationRepository();
  const passingService = new ExperimentFoundationService(repository);
  await seedCanonicalRecords(passingService);
  await passingService.createRecord({
    record_kind: 'dataset_asset_candidate',
    payload: asPayload(datasetCandidatePayload()),
  });

  const result = await passingService.decidePromotion('dataset_asset_candidate_001', {
    promotion_request: promotionRequestPayload(),
    promotion_result: promotionResultPayload(),
  });
  assert.equal(result.candidate_record.status, 'promoted');
  assert.equal(result.promotion_request_record.record_kind, 'asset_promotion_request');
  assert.equal(result.promotion_result_record.record_kind, 'asset_promotion_result');
});

test('experiment-foundation promotion gate rejects candidate kind and family drift', async () => {
  const service = new ExperimentFoundationService(new InMemoryExperimentFoundationRepository());
  await seedCanonicalRecords(service);
  await service.createRecord({
    record_kind: 'dataset_asset_candidate',
    payload: asPayload(datasetCandidatePayload()),
  });

  await assert.rejects(
    () => service.decidePromotion('dataset_asset_candidate_001', {
      promotion_request: {
        ...promotionRequestPayload(),
        candidate_ref: sourceRef('benchmark_asset_candidate', 'dataset_asset_candidate_001'),
      },
      promotion_result: promotionResultPayload(),
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  await assert.rejects(
    () => service.decidePromotion('dataset_asset_candidate_001', {
      promotion_request: {
        ...promotionRequestPayload(),
        candidate_family: 'benchmark',
      },
      promotion_result: {
        ...promotionResultPayload(),
        candidate_family: 'benchmark',
      },
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('in-memory promotion persistence rolls back partial writes on failure', async () => {
  const repository = new InMemoryExperimentFoundationRepository();
  const promotionRequestRecord = storedRecord(
    'asset_promotion_request',
    'promotion_request_001',
    asPayload(promotionRequestPayload()),
  );
  const promotionResultRecord = storedRecord(
    'asset_promotion_result',
    'promotion_result_001',
    asPayload(promotionResultPayload()),
  );
  await repository.createRecord(promotionResultRecord);

  await assert.rejects(
    () => repository.recordPromotionDecision({
      promotionRequestRecord,
      promotionResultRecord,
      candidateRecord: storedRecord(
        'dataset_asset_candidate',
        'dataset_asset_candidate_001',
        asPayload(datasetCandidatePayload({ candidate_status: 'promoted' })),
      ),
    }),
    /already exists/,
  );

  assert.equal(await repository.findRecord('asset_promotion_request', 'promotion_request_001'), null);
  assert.equal(
    (await repository.findRecord('asset_promotion_result', 'promotion_result_001'))?.record_id,
    'promotion_result_001',
  );
});

test('Prisma experiment-foundation duplicate record create maps to VERSION_CONFLICT', async () => {
  const prisma = {
    experimentFoundationRecord: {
      create: async () => {
        throw new Prisma.PrismaClientKnownRequestError('duplicate record', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['recordKind', 'recordId'] },
        });
      },
    },
  };
  const repository = new PrismaExperimentFoundationRepository(prisma as never);

  await assert.rejects(
    () => repository.createRecord(storedRecord('dataset_asset', 'dataset_asset_001', asPayload(datasetAssetPayload()))),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('experiment-foundation routes create/list/read records and return service validation errors', async () => {
  const app = buildApp();
  try {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'dataset_asset',
        payload: datasetAssetPayload(),
      },
    });
    assert.equal(createResponse.statusCode, 201);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/records?record_kind=dataset_asset',
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.json().records.length, 1);

    const readResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/records/dataset_asset/dataset_asset_001',
    });
    assert.equal(readResponse.statusCode, 200);
    assert.equal(readResponse.json().record_id, 'dataset_asset_001');

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'dataset_asset',
        payload: {
          ...datasetAssetPayload(),
          uri: 'https://example.test/raw-dataset',
        },
      },
    });
    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(invalidResponse.json().error.code, 'INVALID_PAYLOAD');

    const jobRegistryResponse = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'external_training_job',
        payload: {
          external_job_id: 'external_job_001',
        },
      },
    });
    assert.equal(jobRegistryResponse.statusCode, 400);
    assert.equal(jobRegistryResponse.json().error.code, 'INVALID_PAYLOAD');
  } finally {
    await app.close();
  }
});

test('experiment-foundation readiness route persists and reads latest report', async () => {
  const app = buildApp();
  try {
    await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'dataset_version',
        payload: datasetVersionPayload('metadata_complete'),
      },
    });

    const readinessResponse = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/readiness/check',
      payload: {
        target_ref: sourceRef('dataset_version', 'dataset_version_001'),
        source_refs: [sourceRef('system_check', 'readiness')],
      },
    });
    assert.equal(readinessResponse.statusCode, 201);
    assert.equal(readinessResponse.json().readiness_status, 'blocked');

    const latestResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness/dataset_version/dataset_version_001/latest',
    });
    assert.equal(latestResponse.statusCode, 200);
    assert.equal(latestResponse.json().readiness_report_id, readinessResponse.json().readiness_report_id);
  } finally {
    await app.close();
  }
});

test('experiment-foundation candidate promotion route records request/result and updates candidate status', async () => {
  const app = buildApp();
  try {
    for (const [recordKind, payload] of [
      ['dataset_asset', datasetAssetPayload()],
      ['dataset_version', datasetVersionPayload()],
      ['data_policy', dataPolicyPayload()],
      ['evaluation_protocol', evaluationProtocolPayload()],
      ['dataset_asset_candidate', datasetCandidatePayload()],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/experiment-foundation/records',
        payload: {
          record_kind: recordKind,
          payload,
        },
      });
      assert.equal(response.statusCode, 201);
    }

    const promotionResponse = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/candidates/dataset_asset_candidate_001/promotion',
      payload: {
        promotion_request: promotionRequestPayload(),
        promotion_result: promotionResultPayload(),
      },
    });
    assert.equal(promotionResponse.statusCode, 201);
    assert.equal(promotionResponse.json().candidate_record.status, 'promoted');

    const candidateResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/records/dataset_asset_candidate/dataset_asset_candidate_001',
    });
    assert.equal(candidateResponse.statusCode, 200);
    assert.equal(candidateResponse.json().status, 'promoted');
  } finally {
    await app.close();
  }
});

test('experiment-foundation readiness list route filters by status and target_kind', async () => {
  const app = buildApp();
  try {
    // Two metadata_complete dataset_version records → two readiness reports.
    await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'dataset_version',
        payload: datasetVersionPayload('metadata_complete'),
      },
    });
    await app.inject({
      method: 'POST',
      url: '/experiment-foundation/readiness/check',
      payload: {
        target_ref: sourceRef('dataset_version', 'dataset_version_001'),
        source_refs: [sourceRef('system_check', 'readiness')],
      },
    });

    const allResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness',
    });
    assert.equal(allResponse.statusCode, 200);
    const allBody = allResponse.json();
    assert.ok(Array.isArray(allBody.reports));
    assert.ok(allBody.reports.length >= 1);

    const blockedResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness?status=blocked',
    });
    assert.equal(blockedResponse.statusCode, 200);
    const blockedBody = blockedResponse.json();
    for (const report of blockedBody.reports) {
      assert.equal(report.readiness_status, 'blocked');
    }
    assert.ok(blockedBody.reports.length >= 1);

    const targetFilterResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness?target_kind=dataset_version&limit=5',
    });
    assert.equal(targetFilterResponse.statusCode, 200);
    for (const report of targetFilterResponse.json().reports) {
      assert.equal(report.target_ref.ref_type, 'dataset_version');
    }

    // Invalid status value → schema-level 400.
    const invalidStatusResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness?status=not_a_status',
    });
    assert.equal(invalidStatusResponse.statusCode, 400);

    // Invalid target_kind → schema-level 400.
    const invalidTargetResponse = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/readiness?target_kind=not_a_kind',
    });
    assert.equal(invalidTargetResponse.statusCode, 400);
  } finally {
    await app.close();
  }
});
