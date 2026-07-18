import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ExperimentFoundationStoredRecord,
  ExternalTrainingJob,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { buildExperimentFoundationCapabilityHarness } from './experiment-foundation-capability-harness.js';
import {
  createExperimentFoundationMinimalGraph,
  completenessCheckFixture,
  datasetAssetCandidateFixture,
  duplicateCheckFixture,
  EXPERIMENT_FOUNDATION_SCENARIO_TIMESTAMP,
  experimentFoundationRef,
  type ExperimentFoundationMinimalGraph,
  experimentFoundationScenarioIds,
  promotionRequestFixture,
  promotionResultFixture,
  type ExperimentFoundationScenarioRecord,
} from './experiment-foundation-scenario-fixtures.js';
import {
  createLocalScriptExecutionRoot,
  installLocalScriptTestEnv,
} from './experiment-foundation-external-fakes.js';

type CapabilityHarness = Awaited<ReturnType<typeof buildExperimentFoundationCapabilityHarness>>;
type InjectResponse = Awaited<ReturnType<CapabilityHarness['app']['inject']>>;

test('experiment-foundation capability harness drives registry, readiness, submit, sync, and closed collect', async () => {
  const localRoot = await createLocalScriptExecutionRoot();
  const restoreEnv = installLocalScriptTestEnv(localRoot.root);
  let harness: CapabilityHarness | null = null;
  try {
    harness = await buildExperimentFoundationCapabilityHarness();
    const graph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'vertical_slice',
    });

    for (const item of graph.records) {
      await harness.createRecord(item.record_kind, item.payload);
    }

    const listedDatasets = await harness.listRecords({ record_kind: 'dataset_asset' });
    assert.equal(listedDatasets.records.length, 1);
    assert.equal(listedDatasets.records[0]?.record_id, graph.datasetAsset.dataset_asset_id);

    const datasetVersionReadiness = await harness.checkReadiness(
      experimentFoundationRef('dataset_version', graph.datasetVersion.dataset_version_id),
    );
    assert.equal(datasetVersionReadiness.readiness_status, 'passed');

    const submitBeforeTaskReadiness = await harness.app.inject({
      method: 'POST',
      url: '/experiment-foundation/execution/jobs/submit',
      payload: graph.submitRequest,
    });
    harness.expectError(submitBeforeTaskReadiness, 422, 'GATE_CONSTRAINT_FAILED');

    const taskReadiness = await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', graph.trainingTaskSpec.training_task_spec_id),
    );
    assert.equal(taskReadiness.readiness_status, 'passed');
    assert.deepEqual(taskReadiness.blockers, []);

    const latestTaskReadiness = await harness.getLatestReadiness(
      experimentFoundationRef('training_task_spec', graph.trainingTaskSpec.training_task_spec_id),
    );
    assert.equal(latestTaskReadiness.readiness_report_id, taskReadiness.readiness_report_id);

    const submitted = await harness.submitJob(graph.submitRequest);
    assert.equal(submitted.external_job.job_status, 'running');
    assert.equal(submitted.external_job.adapter_kind, 'local_script');
    assert.ok(submitted.external_job.stage_event_refs.length >= 1);
    assert.ok(submitted.external_job.adapter_metadata_refs.length >= 1);
    assert.equal('metadata' in submitted.external_job, false);

    const repeatedSubmit = await harness.submitJob(graph.submitRequest);
    assert.equal(repeatedSubmit.external_job.external_job_id, submitted.external_job.external_job_id);

    const conflictingSubmit = await harness.app.inject({
      method: 'POST',
      url: '/experiment-foundation/execution/jobs/submit',
      payload: {
        ...graph.submitRequest,
        materialization_result_hash: 'sha256:capability-materialization-conflict',
      },
    });
    harness.expectError(conflictingSubmit, 409, 'VERSION_CONFLICT');

    const synced = await harness.syncJobUntilTerminal(submitted.external_job.external_job_id);
    assert.equal(synced.external_job.job_status, 'succeeded');
    assert.ok(synced.external_job.stage_event_refs.length > submitted.external_job.stage_event_refs.length);

    const collect = await collectRaw(harness, submitted.external_job.external_job_id);
    assertLegacyScientificWriterClosed(harness, collect);
    const unchangedJob = await getJobRaw(harness, submitted.external_job.external_job_id);
    assert.deepEqual(unchangedJob.result_refs, []);
    assert.deepEqual(unchangedJob.partial_result_refs, []);

    const genericJobWrite = await harness.app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'external_training_job',
        payload: {
          external_job_id: submitted.external_job.external_job_id,
          training_task_spec_ref: graph.submitRequest.training_task_spec_ref,
        },
      },
    });
    harness.expectError(genericJobWrite, 400, 'INVALID_PAYLOAD');
  } finally {
    await harness?.close();
    restoreEnv();
    await localRoot.cleanup();
  }
});

test('experiment-foundation capability harness validates candidate promotion gates', async () => {
  const localRoot = await createLocalScriptExecutionRoot('experiment-foundation-promotion-');
  let harness: CapabilityHarness | null = null;
  try {
    harness = await buildExperimentFoundationCapabilityHarness();

    const successIds = experimentFoundationScenarioIds('promotion_success');
    const successGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'promotion_success',
    });
    await seedPromotionCanonicalRecords(harness, successGraph.records);
    await harness.createRecord('dataset_asset_candidate', payload(datasetAssetCandidateFixture({}, successIds)));

    const promoted = await harness.promoteCandidate(successIds.datasetAssetCandidateId, {
      promotion_request: promotionRequestFixture({}, successIds),
      promotion_result: promotionResultFixture({}, successIds),
    });
    assert.equal(promoted.candidate_record.status, 'promoted');
    assert.equal(promoted.promotion_request_record.record_kind, 'asset_promotion_request');
    assert.equal(promoted.promotion_result_record.record_kind, 'asset_promotion_result');

    const updatedCandidate = await harness.getRecord('dataset_asset_candidate', successIds.datasetAssetCandidateId);
    assert.equal(updatedCandidate.status, 'promoted');
    assert.equal(updatedCandidate.payload.candidate_status, 'promoted');

    const lowConfidenceIds = experimentFoundationScenarioIds('promotion_low_confidence');
    const lowConfidenceGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'promotion_low_confidence',
    });
    await seedPromotionCanonicalRecords(harness, lowConfidenceGraph.records);
    await harness.createRecord(
      'dataset_asset_candidate',
      payload(datasetAssetCandidateFixture({ confidence_score: 0.7 }, lowConfidenceIds)),
    );
    const lowConfidence = await harness.app.inject({
      method: 'POST',
      url: `/experiment-foundation/candidates/${lowConfidenceIds.datasetAssetCandidateId}/promotion`,
      payload: {
        promotion_request: promotionRequestFixture({}, lowConfidenceIds),
        promotion_result: promotionResultFixture({}, lowConfidenceIds),
      },
    });
    harness.expectError(lowConfidence, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(
      lowConfidence.json().error.details.blockers.some((blocker: string) => blocker.includes('confidence_score')),
    );

    const duplicateIds = experimentFoundationScenarioIds('promotion_duplicate');
    const duplicateGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'promotion_duplicate',
    });
    await seedPromotionCanonicalRecords(harness, duplicateGraph.records);
    await harness.createRecord(
      'dataset_asset_candidate',
      payload(datasetAssetCandidateFixture({
        duplicate_check: duplicateCheckFixture({
          duplicate_status: 'possible_duplicate',
          possible_duplicate_refs: [experimentFoundationRef('dataset_asset', duplicateIds.datasetAssetId)],
        }, duplicateIds),
      }, duplicateIds)),
    );
    const duplicate = await harness.app.inject({
      method: 'POST',
      url: `/experiment-foundation/candidates/${duplicateIds.datasetAssetCandidateId}/promotion`,
      payload: {
        promotion_request: promotionRequestFixture({}, duplicateIds),
        promotion_result: promotionResultFixture({}, duplicateIds),
      },
    });
    harness.expectError(duplicate, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(
      duplicate.json().error.details.blockers.some((blocker: string) => blocker.includes('duplicate_status')),
    );

    const missingCanonicalIds = experimentFoundationScenarioIds('promotion_missing_canonical');
    const missingCanonicalGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'promotion_missing_canonical',
    });
    await seedPromotionCanonicalRecords(
      harness,
      missingCanonicalGraph.records.filter((item) => item.record_kind !== 'evaluation_protocol'),
    );
    await harness.createRecord(
      'dataset_asset_candidate',
      payload(datasetAssetCandidateFixture({}, missingCanonicalIds)),
    );
    const missingCanonical = await harness.app.inject({
      method: 'POST',
      url: `/experiment-foundation/candidates/${missingCanonicalIds.datasetAssetCandidateId}/promotion`,
      payload: {
        promotion_request: promotionRequestFixture({}, missingCanonicalIds),
        promotion_result: promotionResultFixture({}, missingCanonicalIds),
      },
    });
    harness.expectError(missingCanonical, 404, 'NOT_FOUND');
  } finally {
    await harness?.close();
    await localRoot.cleanup();
  }
});

test('experiment-foundation capability harness validates mocked Aliyun mirror and policy gates', async () => {
  const localRoot = await createLocalScriptExecutionRoot('experiment-foundation-aliyun-');
  let harness: CapabilityHarness | null = null;
  try {
    harness = await buildExperimentFoundationCapabilityHarness();

    const successGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_success',
      adapterKind: 'aliyun_pai_dlc',
    });
    await seedGraphRecords(harness, successGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', successGraph.trainingTaskSpec.training_task_spec_id),
    );
    const submitted = await harness.submitJob(successGraph.submitRequest);
    assert.equal(submitted.external_job.adapter_kind, 'aliyun_pai_dlc');
    assert.equal(submitted.external_job.job_status, 'running');
    assert.equal('provider' in submitted.external_job.platform_ref, false);
    assert.equal('region' in submitted.external_job.platform_ref, false);
    assert.equal('credentials' in submitted.external_job.platform_ref, false);
    assert.equal('sdk_payload' in submitted.external_job, false);
    assert.ok(submitted.external_job.adapter_metadata_refs.every((ref) => ref.ref_type === 'adapter_metadata_ref'));

    const missingMirrorGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_missing_mirror',
      adapterKind: 'aliyun_pai_dlc',
      taskSpecOverrides: { input_refs: [] },
    });
    await seedGraphRecords(harness, missingMirrorGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', missingMirrorGraph.trainingTaskSpec.training_task_spec_id),
    );
    const missingMirror = await submitRaw(harness, missingMirrorGraph.submitRequest);
    harness.expectError(missingMirror, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(missingMirror.json().error.message.includes('dataset_mirror'));

    const staleMirrorGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_stale_mirror',
      adapterKind: 'aliyun_pai_dlc',
      datasetMirrorOverrides: { freshness_status: 'stale' },
    });
    await seedGraphRecords(harness, staleMirrorGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', staleMirrorGraph.trainingTaskSpec.training_task_spec_id),
    );
    const staleMirror = await submitRaw(harness, staleMirrorGraph.submitRequest);
    harness.expectError(staleMirror, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(staleMirror.json().error.message.includes('ready and fresh'));

    const checksumMismatchGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_checksum_mismatch',
      adapterKind: 'aliyun_pai_dlc',
      datasetMirrorOverrides: { source_checksum_manifest_hash: 'sha256:other-checksum' },
    });
    await seedGraphRecords(harness, checksumMismatchGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', checksumMismatchGraph.trainingTaskSpec.training_task_spec_id),
    );
    const checksumMismatch = await submitRaw(harness, checksumMismatchGraph.submitRequest);
    harness.expectError(checksumMismatch, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(checksumMismatch.json().error.message.includes('checksum'));

    const restrictedPolicyGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_restricted_policy',
      adapterKind: 'aliyun_pai_dlc',
      dataPolicyOverrides: {
        access_level: 'restricted',
        mirror_policy: 'approval_required',
        approval_refs: [],
      },
    });
    await seedGraphRecords(harness, restrictedPolicyGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', restrictedPolicyGraph.trainingTaskSpec.training_task_spec_id),
    );
    const restrictedPolicy = await submitRaw(harness, restrictedPolicyGraph.submitRequest);
    harness.expectError(restrictedPolicy, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(restrictedPolicy.json().error.message.includes('requires approval_ref'));

    const privatePayloadIds = experimentFoundationScenarioIds('aliyun_private_payload');
    const privatePayloadGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'aliyun_private_payload',
      adapterKind: 'aliyun_pai_dlc',
      taskSpecOverrides: {
        selected_platform: {
          platform_id: `aliyun_pai_dlc_${privatePayloadIds.suffix}`,
          platform_kind: 'aliyun_pai_dlc',
          adapter_kind: 'aliyun_pai_dlc',
          adapter_version: 'capability-aliyun-v1',
          capability_refs: [experimentFoundationRef('capability', 'aliyun_pai_dlc')],
          region: 'cn-hangzhou',
        } as never,
      },
    });
    const privatePayloadWrite = await harness.app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {
        record_kind: 'training_task_spec',
        payload: privatePayloadGraph.trainingTaskSpec,
      },
    });
    harness.expectError(privatePayloadWrite, 400, 'INVALID_PAYLOAD');
  } finally {
    await harness?.close();
    await localRoot.cleanup();
  }
});

test('experiment-foundation capability harness closes scientific writers while preserving sidecar validation', async () => {
  const localRoot = await createLocalScriptExecutionRoot('experiment-foundation-result-');
  const restoreEnv = installLocalScriptTestEnv(localRoot.root);
  let harness: CapabilityHarness | null = null;
  try {
    harness = await buildExperimentFoundationCapabilityHarness();

    const validGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'result_evidence_valid',
    });
    await seedGraphRecords(harness, validGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', validGraph.trainingTaskSpec.training_task_spec_id),
    );
    const submitted = await harness.submitJob(validGraph.submitRequest);
    const synced = await harness.syncJobUntilTerminal(submitted.external_job.external_job_id);
    const closedCollect = await collectRaw(harness, submitted.external_job.external_job_id);
    assertLegacyScientificWriterClosed(harness, closedCollect);

    for (const recordKind of [
      'experiment_result',
      'result_validation_report',
      'evidence_candidate',
    ]) {
      const closedCreate = await createRecordRaw(harness, recordKind, {});
      assertLegacyScientificWriterClosed(harness, closedCreate);
    }

    const experimentResult = {
      experiment_result_id: 'historical_experiment_result_001',
      result_hash: 'sha256:historical-experiment-result',
    };
    const validationReport = {
      result_validation_report_id: 'historical_validation_report_001',
      validation_hash: 'sha256:historical-validation-report',
    };
    const evidenceCandidate = {
      evidence_candidate_id: 'historical_evidence_candidate_001',
      evidence_hash: 'sha256:historical-evidence-candidate',
    };
    const sidecarPayload = paperExperimentSidecarPayload({
      graph: validGraph,
      job: synced.external_job,
      experimentResult,
      validationReport,
      evidenceCandidate,
      metricObservationRecords: [],
      evaluationFactRecords: [],
      suffix: 'result_evidence_valid',
    });
    const sidecar = await harness.createRecord('paper_experiment_sidecar', sidecarPayload);
    assert.equal(sidecar.record_kind, 'paper_experiment_sidecar');
    assert.equal(sidecar.status, 'linked');

    const sidecarDtoCopy = await createRecordRaw(harness, 'paper_experiment_sidecar', {
      ...sidecarPayload,
      paper_experiment_sidecar_id: 'paper_experiment_sidecar_dto_copy',
      sidecar_hash: 'sha256:sidecar-dto-copy',
      run_recipe: validGraph.runRecipe,
    });
    harness.expectError(sidecarDtoCopy, 400, 'INVALID_PAYLOAD');

    const failedGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'result_evidence_failed',
      taskSpecOverrides: {
        args: ['-e', 'process.exit(1)'],
      },
    });
    await seedGraphRecords(harness, failedGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', failedGraph.trainingTaskSpec.training_task_spec_id),
    );
    const failedSubmitted = await harness.submitJob(failedGraph.submitRequest);
    await harness.syncJobUntilTerminal(failedSubmitted.external_job.external_job_id, { expectedStatus: 'failed' });
    const failedCollect = await collectRaw(harness, failedSubmitted.external_job.external_job_id);
    assertLegacyScientificWriterClosed(harness, failedCollect);
    const unchangedFailedJob = await getJobRaw(harness, failedSubmitted.external_job.external_job_id);
    assert.deepEqual(unchangedFailedJob.result_refs, []);
    assert.deepEqual(unchangedFailedJob.partial_result_refs, []);
  } finally {
    await harness?.close();
    restoreEnv();
    await localRoot.cleanup();
  }
});

test('experiment-foundation Phase 3 recovery path exposes actionable state for automated retries', async () => {
  const localRoot = await createLocalScriptExecutionRoot('experiment-foundation-recovery-');
  const restoreEnv = installLocalScriptTestEnv(localRoot.root);
  let harness: CapabilityHarness | null = null;
  try {
    harness = await buildExperimentFoundationCapabilityHarness();

    const readinessGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'recovery_readiness',
      datasetMirrorOverrides: { freshness_status: 'stale' },
    });
    await seedGraphRecords(harness, readinessGraph.records);
    const blockedReadiness = await harness.checkReadiness(
      experimentFoundationRef('dataset_version', readinessGraph.datasetVersion.dataset_version_id),
    );
    assert.equal(blockedReadiness.readiness_status, 'blocked');
    assert.ok(blockedReadiness.blockers.some((blocker) => blocker.includes('stale')));
    assert.ok(blockedReadiness.required_actions.some((action) => action.includes('stale')));
    const latestBlocked = await harness.getLatestReadiness(
      experimentFoundationRef('dataset_version', readinessGraph.datasetVersion.dataset_version_id),
    );
    assert.equal(latestBlocked.readiness_report_id, blockedReadiness.readiness_report_id);

    await harness.upsertRecord(
      'dataset_mirror',
      readinessGraph.datasetMirror.dataset_mirror_id,
      payload({
        ...readinessGraph.datasetMirror,
        freshness_status: 'fresh',
      }),
    );
    const recoveredReadiness = await harness.checkReadiness(
      experimentFoundationRef('dataset_version', readinessGraph.datasetVersion.dataset_version_id),
    );
    assert.equal(recoveredReadiness.readiness_status, 'passed');
    assert.deepEqual(recoveredReadiness.blockers, []);

    const promotionIds = experimentFoundationScenarioIds('recovery_promotion');
    const promotionGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'recovery_promotion',
    });
    await seedPromotionCanonicalRecords(harness, promotionGraph.records);
    await harness.createRecord(
      'dataset_asset_candidate',
      payload(datasetAssetCandidateFixture({
        completeness_check: completenessCheckFixture({
          completeness_status: 'incomplete',
          missing_fields: ['policy_check'],
        }, promotionIds),
      }, promotionIds)),
    );
    const failedPromotion = await harness.app.inject({
      method: 'POST',
      url: `/experiment-foundation/candidates/${promotionIds.datasetAssetCandidateId}/promotion`,
      payload: {
        promotion_request: promotionRequestFixture({}, promotionIds),
        promotion_result: promotionResultFixture({}, promotionIds),
      },
    });
    harness.expectError(failedPromotion, 422, 'GATE_CONSTRAINT_FAILED');
    assert.ok(
      failedPromotion.json().error.details.blockers.some((blocker: string) =>
        blocker.includes('completeness_check.completeness_status')),
    );
    const candidateAfterFailedPromotion = await harness.getRecord(
      'dataset_asset_candidate',
      promotionIds.datasetAssetCandidateId,
    );
    assert.equal(candidateAfterFailedPromotion.status, 'ready_for_promotion');
    assert.equal(
      (await harness.listRecords({ record_kind: 'asset_promotion_request' })).records
        .some((record) => record.record_id === promotionIds.promotionRequestId),
      false,
    );

    await harness.upsertRecord(
      'dataset_asset_candidate',
      promotionIds.datasetAssetCandidateId,
      payload(datasetAssetCandidateFixture({}, promotionIds)),
    );
    const recoveredPromotion = await harness.promoteCandidate(promotionIds.datasetAssetCandidateId, {
      promotion_request: promotionRequestFixture({}, promotionIds),
      promotion_result: promotionResultFixture({}, promotionIds),
    });
    assert.equal(recoveredPromotion.candidate_record.status, 'promoted');

    const submitGraph = createExperimentFoundationMinimalGraph({
      outputRoot: localRoot.root,
      scenarioId: 'recovery_submit_cancel',
      taskSpecOverrides: {
        args: ['-e', 'setTimeout(() => {}, 5000)'],
        timeout_seconds: 10,
      },
    });
    await seedGraphRecords(harness, submitGraph.records);
    await harness.checkReadiness(
      experimentFoundationRef('training_task_spec', submitGraph.trainingTaskSpec.training_task_spec_id),
    );
    const mismatchedSubmit = await submitRaw(harness, {
      ...submitGraph.submitRequest,
      materialization_result_hash: 'sha256:recovery-submit-mismatch',
    });
    harness.expectError(mismatchedSubmit, 422, 'GATE_CONSTRAINT_FAILED');
    assert.equal(
      (await listJobsRaw(harness, `training_task_spec_id=${submitGraph.trainingTaskSpec.training_task_spec_id}`))
        .jobs.length,
      0,
    );

    const submitted = await harness.submitJob(submitGraph.submitRequest);
    assert.equal(submitted.external_job.job_status, 'running');
    const cancelled = await cancelRaw(harness, submitted.external_job.external_job_id, 'recovery-cancel-key');
    assert.equal(cancelled.statusCode, 200, cancelled.body);
    const repeatedCancel = await cancelRaw(harness, submitted.external_job.external_job_id, 'recovery-cancel-key');
    assert.equal(repeatedCancel.statusCode, 200, repeatedCancel.body);
    assert.equal(
      repeatedCancel.json().external_job.stage_event_refs.length,
      cancelled.json().external_job.stage_event_refs.length,
    );
    const cancelledTerminal = await harness.syncJobUntilTerminal(
      submitted.external_job.external_job_id,
      { expectedStatus: 'cancelled', timeoutMs: 5000, pollMs: 50 },
    );
    assert.equal(cancelledTerminal.external_job.job_status, 'cancelled');

    const cancelledList = await listJobsRaw(harness, 'status=cancelled');
    assert.ok(
      cancelledList.jobs.some((job) =>
        job.external_job_id === submitted.external_job.external_job_id),
    );
    const collectedCancelled = await collectRaw(harness, submitted.external_job.external_job_id);
    assertLegacyScientificWriterClosed(harness, collectedCancelled);
    const unchangedCancelledJob = await getJobRaw(harness, submitted.external_job.external_job_id);
    assert.equal(unchangedCancelledJob.job_status, 'cancelled');
    assert.deepEqual(unchangedCancelledJob.result_refs, []);
    assert.deepEqual(unchangedCancelledJob.partial_result_refs, []);
  } finally {
    await harness?.close();
    restoreEnv();
    await localRoot.cleanup();
  }
});

async function seedPromotionCanonicalRecords(
  harness: CapabilityHarness,
  records: ExperimentFoundationScenarioRecord[],
): Promise<void> {
  for (const item of records) {
    if (
      item.record_kind === 'dataset_asset'
      || item.record_kind === 'dataset_version'
      || item.record_kind === 'data_policy'
      || item.record_kind === 'evaluation_protocol'
    ) {
      await harness.createRecord(item.record_kind, item.payload);
    }
  }
}

async function seedGraphRecords(
  harness: CapabilityHarness,
  records: ExperimentFoundationScenarioRecord[],
): Promise<void> {
  for (const item of records) {
    await harness.createRecord(item.record_kind, item.payload);
  }
}

async function submitRaw(
  harness: CapabilityHarness,
  submitRequest: unknown,
): Promise<InjectResponse> {
  return harness.app.inject({
    method: 'POST',
    url: '/experiment-foundation/execution/jobs/submit',
    payload: payload(submitRequest),
  });
}

async function cancelRaw(
  harness: CapabilityHarness,
  externalJobId: string,
  idempotencyKey: string,
): Promise<InjectResponse> {
  return harness.app.inject({
    method: 'POST',
    url: `/experiment-foundation/execution/jobs/${externalJobId}/cancel`,
    payload: {
      reason: 'T-106 recovery hardening cancellation',
      idempotency_key: idempotencyKey,
      requested_by_ref: experimentFoundationRef('user', 'capability_tester'),
      source_refs: [experimentFoundationRef('test_case', 'recovery_cancel')],
    },
  });
}

async function listJobsRaw(
  harness: CapabilityHarness,
  query: string,
): Promise<{ jobs: Array<Record<string, unknown>>; next_cursor?: string | null }> {
  const response = await harness.app.inject({
    method: 'GET',
    url: `/experiment-foundation/execution/jobs?${query}`,
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json() as { jobs: Array<Record<string, unknown>>; next_cursor?: string | null };
}

async function createRecordRaw(
  harness: CapabilityHarness,
  recordKind: string,
  recordPayloadValue: Record<string, unknown>,
): Promise<InjectResponse> {
  return harness.app.inject({
    method: 'POST',
    url: '/experiment-foundation/records',
    payload: {
      record_kind: recordKind,
      payload: recordPayloadValue,
    },
  });
}

async function collectRaw(
  harness: CapabilityHarness,
  externalJobId: string,
): Promise<InjectResponse> {
  return harness.app.inject({
    method: 'POST',
    url: `/experiment-foundation/execution/jobs/${externalJobId}/collect`,
    payload: {
      source_refs: [experimentFoundationRef('test_case', 'closed_legacy_collect')],
    },
  });
}

async function getJobRaw(
  harness: CapabilityHarness,
  externalJobId: string,
): Promise<ExternalTrainingJob> {
  const response = await harness.app.inject({
    method: 'GET',
    url: `/experiment-foundation/execution/jobs/${externalJobId}`,
  });
  assert.equal(response.statusCode, 200, response.body);
  return response.json().external_job as ExternalTrainingJob;
}

function assertLegacyScientificWriterClosed(
  harness: CapabilityHarness,
  response: InjectResponse,
): void {
  harness.expectError(response, 409, 'GATE_CONSTRAINT_FAILED');
  assert.equal(
    response.json().error.details.reason_code,
    'LEGACY_SCIENTIFIC_WRITER_CLOSED',
  );
}

function payload(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function recordPayload(record: ExperimentFoundationStoredRecord): Record<string, unknown> {
  return record.payload as Record<string, unknown>;
}

function paperExperimentSidecarPayload(input: {
  graph: ExperimentFoundationMinimalGraph;
  job: ExternalTrainingJob;
  experimentResult: Record<string, unknown>;
  validationReport: Record<string, unknown>;
  evidenceCandidate: Record<string, unknown>;
  metricObservationRecords: ExperimentFoundationStoredRecord[];
  evaluationFactRecords: ExperimentFoundationStoredRecord[];
  suffix: string;
}): Record<string, unknown> {
  const baselineLocks = input.graph.runRecipe.version_lock.baseline_implementation_locks;
  const methodLocks = input.graph.runRecipe.version_lock.method_component_locks;
  return {
    paper_experiment_sidecar_id: `paper_experiment_sidecar_${input.suffix}`,
    paper_project_id: `paper_project_${input.suffix}`,
    sidecar_status: 'linked',
    run_recipe_ref: experimentFoundationRef('run_recipe', input.graph.runRecipe.run_recipe_id),
    run_recipe_hash: input.graph.runRecipe.run_recipe_hash,
    version_lock_hash: input.graph.runRecipe.version_lock_hash,
    version_lock_snapshot_refs: [experimentFoundationRef('version_lock', input.graph.runRecipe.version_lock.version_lock_id)],
    dataset_version_lock_ref: experimentFoundationRef(
      'dataset_version_lock',
      input.graph.runRecipe.version_lock.dataset_version_lock.dataset_version_id,
    ),
    dataset_version_lock_hash: input.graph.runRecipe.version_lock.dataset_version_lock.checksum_manifest_hash,
    evaluation_protocol_lock_ref: experimentFoundationRef(
      'evaluation_protocol_lock',
      input.graph.runRecipe.version_lock.evaluation_protocol_lock.evaluation_protocol_id,
    ),
    evaluation_protocol_hash: input.graph.runRecipe.version_lock.evaluation_protocol_lock.protocol_hash,
    benchmark_asset_ref: experimentFoundationRef(
      'benchmark_asset',
      input.graph.runRecipe.version_lock.evaluation_protocol_lock.benchmark_asset_id,
    ),
    baseline_implementation_lock_refs: baselineLocks.map((lock) => experimentFoundationRef(
      'baseline_implementation_version',
      lock.baseline_implementation_version_id,
    )),
    baseline_implementation_hashes: baselineLocks.map((lock) => lock.implementation_hash),
    method_component_lock_refs: methodLocks.map((lock) => experimentFoundationRef(
      'method_recipe_component',
      lock.method_recipe_component_id,
    )),
    method_component_hashes: methodLocks.map((lock) => lock.component_hash),
    training_task_spec_ref: experimentFoundationRef(
      'training_task_spec',
      input.graph.trainingTaskSpec.training_task_spec_id,
    ),
    training_task_spec_hash: input.graph.materializationResult.training_task_spec_hash,
    materialization_result_ref: experimentFoundationRef(
      'training_task_materialization_result',
      input.graph.materializationResult.materialization_result_id,
    ),
    materialization_result_hash: input.graph.materializationResult.materialization_hash,
    adapter_metadata_refs: input.job.adapter_metadata_refs,
    adapter_metadata_hashes: input.job.adapter_metadata_hashes,
    external_job_ref: experimentFoundationRef('external_training_job', input.job.external_job_id),
    external_job_hash: input.job.external_job_hash,
    stage_event_refs: input.job.stage_event_refs,
    cancellation_request_refs: [],
    partial_result_refs: input.job.partial_result_refs,
    result_refs: [experimentFoundationRef('experiment_result', String(input.experimentResult.experiment_result_id))],
    result_hashes: [String(input.experimentResult.result_hash)],
    validation_report_refs: [
      experimentFoundationRef('result_validation_report', String(input.validationReport.result_validation_report_id)),
    ],
    validation_report_hashes: [String(input.validationReport.validation_hash)],
    evaluation_fact_refs: input.evaluationFactRecords.map((record) => (
      experimentFoundationRef('evaluation_fact', String(recordPayload(record).evaluation_fact_id))
    )),
    evaluation_fact_hashes: input.evaluationFactRecords.map((record) => String(recordPayload(record).fact_hash)),
    evidence_candidate_refs: [
      experimentFoundationRef('evidence_candidate', String(input.evidenceCandidate.evidence_candidate_id)),
    ],
    evidence_candidate_hashes: [String(input.evidenceCandidate.evidence_hash)],
    paper_table_fact_set_refs: [],
    paper_table_fact_set_hashes: [],
    status_snapshot_refs: [],
    event_log_refs: [],
    provenance_refs: [experimentFoundationRef('test_case', input.suffix)],
    sidecar_hash: `sha256:paper-experiment-sidecar-${input.suffix}`,
    created_at: EXPERIMENT_FOUNDATION_SCENARIO_TIMESTAMP,
    updated_at: EXPERIMENT_FOUNDATION_SCENARIO_TIMESTAMP,
  };
}
