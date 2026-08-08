import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type {
  ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import type {
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import { InMemoryPaperImplementationCycleReadinessV2Repository } from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import {
  InMemoryPaperImplementationValidationCycleClosureV2Repository,
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationScientificClosureEvidenceAuthorityV1,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import { AppError } from '../errors/app-error.js';
import { PaperImplementationCycleReadinessV2Service } from './paper-implementation-cycle-readiness-v2-service.js';
import { PaperImplementationScientificClosureContextService } from './paper-implementation-scientific-closure-context-service.js';

test('scientific context resolver deduplicates shared protocol authority across ordered REUs', async () => {
  const cycleId = 'cycle-scientific-context';
  const projectId = 'project-scientific-context';
  const branches = ['a', 'b'].map((suffix) => ({
    branch_id: `branch-${suffix}`,
    branch_key: `branch-${suffix}`,
    current_admitted_revision_id: `revision-${suffix}`,
    current_admitted_revision_hash: scientificHash(`revision-${suffix}`),
    current_admitted_revision_sequence: 1,
    head_revision_id: `revision-${suffix}`,
    head_revision_sequence: 1,
    head_run_id: `run-${suffix}`,
    head_run_manifest_hash: scientificHash(`run-${suffix}`),
  }));
  const evidenceUnits = branches.map((branch) => ({
    validation_cycle_id: cycleId,
    branch_id: branch.branch_id,
    work_order_revision_id: branch.current_admitted_revision_id,
    work_order_revision_hash: branch.current_admitted_revision_hash,
    branch_revision_sequence: branch.current_admitted_revision_sequence,
    run_id: branch.head_run_id!,
    run_manifest_hash: branch.head_run_manifest_hash!,
    run_evidence_unit_id: `reu-${branch.branch_key}`,
    content_hash: scientificHash(`reu-${branch.branch_key}`),
  }));
  const readinessRepository = new InMemoryPaperImplementationCycleReadinessV2Repository({
    cycles: [{
      validation_cycle_id: cycleId,
      implementation_project_id: projectId,
      lifecycle_status: 'admitted',
      expected_cycle_version: 0,
    }],
    branches: { [cycleId]: branches },
    runs: branches.map((branch) => ({
      validation_cycle_id: cycleId,
      run_id: branch.head_run_id!,
      run_manifest_hash: branch.head_run_manifest_hash!,
      external_pi_branch_id: branch.branch_id,
      external_pi_work_order_revision_id: branch.current_admitted_revision_id,
      external_pi_work_order_revision_hash: branch.current_admitted_revision_hash,
      external_pi_revision_sequence: branch.current_admitted_revision_sequence,
      head_acknowledged: true,
      cells: [{
        ordinal: 1,
        run_cell_id: `cell-${branch.branch_key}`,
        cell_key: `cell-${branch.branch_key}`,
        attempts: [{
          execution_attempt_id: `attempt-${branch.branch_key}`,
          attempt_sequence: 1,
          lifecycle_state: 'succeeded',
          execution_mode: 'real_provider',
          provenance: 'real_provider',
        }],
        complete_result: {
          result_id: `result-${branch.branch_key}`,
          result_content_hash: scientificHash(`result-${branch.branch_key}`),
          execution_attempt_id: `attempt-${branch.branch_key}`,
          provenance: 'real_provider',
        },
      }],
    })),
    evidence_units: evidenceUnits,
  });
  const sharedProtocol = {
    schema_version: 'v2',
    scientific_contract: { primary_comparison_key: 'primary' },
  } as unknown as ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
  const authorities: PaperImplementationScientificClosureEvidenceAuthorityV1[] =
    evidenceUnits.map((evidence, index) => ({
      run_evidence_unit_id: evidence.run_evidence_unit_id,
      content_hash: evidence.content_hash,
      validation_report_id: `report-${index + 1}`,
      validation_hash: scientificHash(`report-${index + 1}`),
      evaluation_protocol_revision_id: 'shared-protocol-revision',
      evaluation_protocol_content_hash: scientificHash('shared-protocol-revision'),
      primary_comparison_key: 'primary',
      decision_if_positive: 'positive-exit',
      decision_if_negative: 'negative-exit',
      decision_if_inconclusive: 'inconclusive-exit',
      validation_report: {
        run_id: evidence.run_id,
        status: 'passed',
      } as unknown as ScientificValidationReportV2,
      evaluation_protocol: sharedProtocol,
      primary_facts: index === 0 ? [{
        comparison_fact_id: 'primary-fact',
        comparison_fact_hash: scientificHash('primary-fact'),
        comparison_key: 'primary',
        registered_relation: 'supports_registered_expectation',
      }] : [],
    }));
  const repository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository,
    scientific_evidence_authorities: authorities,
  });
  const readiness = await new PaperImplementationCycleReadinessV2Service({
    repository: readinessRepository,
  }).evaluate(cycleId);
  const resolved = await new PaperImplementationScientificClosureContextService(repository)
    .resolve({
      implementation_project_id: projectId,
      validation_cycle_id: cycleId,
      expected_closure_watermark_hash: readiness.watermark.closure_input_hash,
      title_card_id: 'title-card-scientific-context',
    });

  assert.equal(resolved.context.ordered_evidence_refs.length, 2);
  assert.equal(resolved.authoritative_sources.length, 5);
  assert.equal(
    resolved.authoritative_sources.filter((source) => (
      source.source_ref.ref_type === 'evaluation_protocol_revision'
    )).length,
    1,
  );
});

test('scientific context resolver maps a missing Cycle to a stable 404', async () => {
  const readinessRepository = new InMemoryPaperImplementationCycleReadinessV2Repository({
    cycles: [],
    branches: {},
    runs: [],
    evidence_units: [],
  });
  const repository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository,
  });

  await assert.rejects(
    new PaperImplementationScientificClosureContextService(repository).resolve({
      implementation_project_id: 'missing-project',
      validation_cycle_id: 'missing-cycle',
      expected_closure_watermark_hash: scientificHash('missing-cycle'),
      title_card_id: null,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.errorCode, 'NOT_FOUND');
      assert.equal(error.details?.reason_code, 'VALIDATION_CYCLE_NOT_FOUND');
      return true;
    },
  );
});

test('scientific context resolver maps a Cycle without admitted branches to a stable 409', async () => {
  const readinessRepository = new InMemoryPaperImplementationCycleReadinessV2Repository({
    cycles: [{
      validation_cycle_id: 'cycle-without-branches',
      implementation_project_id: 'project-without-branches',
      lifecycle_status: 'admitted',
      expected_cycle_version: 0,
    }],
    branches: {},
    runs: [],
    evidence_units: [],
  });
  const repository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository,
  });

  await assert.rejects(
    new PaperImplementationScientificClosureContextService(repository).resolve({
      implementation_project_id: 'project-without-branches',
      validation_cycle_id: 'cycle-without-branches',
      expected_closure_watermark_hash: scientificHash('cycle-without-branches'),
      title_card_id: null,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.errorCode, 'GATE_CONSTRAINT_FAILED');
      assert.equal(error.details?.reason_code, 'VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES');
      return true;
    },
  );
});

test('scientific context resolver retries serializable conflicts twice before returning 409', async () => {
  let transactionAttempts = 0;
  const conflictingRepository: PaperImplementationValidationCycleClosureV2Repository = {
    isCycleClosed: async () => false,
    withTransaction: async () => {
      transactionAttempts += 1;
      throw new PaperImplementationValidationCycleClosureV2RepositoryError(
        'CLOSURE_CONCURRENT_CONFLICT',
        'simulated serializable conflict',
      );
    },
  };

  await assert.rejects(
    new PaperImplementationScientificClosureContextService(conflictingRepository).resolve({
      implementation_project_id: 'project-concurrent',
      validation_cycle_id: 'cycle-concurrent',
      expected_closure_watermark_hash: scientificHash('cycle-concurrent'),
      title_card_id: null,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.errorCode, 'VERSION_CONFLICT');
      assert.equal(error.details?.reason_code, 'CLOSURE_CONCURRENT_CONFLICT');
      return true;
    },
  );
  assert.equal(transactionAttempts, 3);
});

function scientificHash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
