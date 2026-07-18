import { createHash } from 'node:crypto';

import { Ajv } from 'ajv';
import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  experimentResultCellV2Schema,
  type EvidenceCandidateQualifiedV1,
  type EvidenceCandidateV2,
  type ExperimentFoundationScientificValidationReasonCodeV2,
  type ExperimentResultCellV2,
  type ScientificValidationReportV2,
  type ValidateScientificBatchV2Request,
  type ValidateScientificBatchV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificResult,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type EvidenceCandidateQualifiedEventV1,
  type ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  type ExperimentFoundationScientificValidationV2Outbox,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2Run,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import {
  computeScientificValidatorProfileHashV2,
  executeScientificRequiredRulesV2,
  listUnsupportedRequiredRulesV2,
} from './experiment-foundation-v2-scientific-rule-engine.js';

export type RecordExperimentResultV2Input = Omit<
  ExperimentResultCellV2,
  'result_id' | 'content_hash'
>;

export interface ExperimentFoundationScientificValidationV2ServiceOptions {
  repository: ExperimentFoundationScientificValidationV2Repository;
  now?: () => string;
}

type ScientificValidationErrorPolicy = {
  status: number;
  code: 'INVALID_PAYLOAD' | 'VERSION_CONFLICT' | 'GATE_CONSTRAINT_FAILED';
};

const ERROR_POLICY = {
  EF_V2_SCIENTIFIC_VALIDATION_DISABLED: { status: 409, code: 'VERSION_CONFLICT' },
  UNSUPPORTED_RULE: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  VALIDATION_SUBJECT_INCOMPLETE: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  VALIDATION_SCOPE_DRIFT: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  VALIDATION_RESULT_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  VALIDATION_IDEMPOTENCY_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  EVIDENCE_CANDIDATE_NOT_ELIGIBLE: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  EVIDENCE_PROVENANCE_REJECTED: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
} as const satisfies Record<
  ExperimentFoundationScientificValidationReasonCodeV2,
  ScientificValidationErrorPolicy
>;

const RECORD_RESULT_KEYS = [
  'schema_version',
  'run_id',
  'run_manifest_hash',
  'run_cell_id',
  'cell_key',
  'training_task_spec_id',
  'training_task_spec_hash',
  'execution_attempt_id',
  'provenance',
  'metric_observations',
  'artifact_observations',
] as const;

const VALIDATE_BATCH_KEYS = [
  'run_id',
  'expected_run_manifest_hash',
  'idempotency_key',
] as const;

const resultValidator = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
}).compile<ExperimentResultCellV2>(experimentResultCellV2Schema);

export class ExperimentFoundationV2ScientificValidationService {
  private readonly repository: ExperimentFoundationScientificValidationV2Repository;
  private readonly now: () => string;

  constructor(options: ExperimentFoundationScientificValidationV2ServiceOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordExperimentResult(
    input: RecordExperimentResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    return this.withRepositoryErrorMapping(() => this.recordExperimentResultValidated(input));
  }

  async validateScientificBatch(
    request: ValidateScientificBatchV2Request,
  ): Promise<ValidateScientificBatchV2Response> {
    return this.withRepositoryErrorMapping(() => this.validateScientificBatchValidated(request));
  }

  private async recordExperimentResultValidated(
    input: RecordExperimentResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    assertExactInputKeys(input, RECORD_RESULT_KEYS, 'ExperimentResult envelope');
    const run = await this.requireRun(input.run_id, input.run_manifest_hash);
    const cell = run.ordered_cells.find((candidate) => candidate.run_cell_id === input.run_cell_id);
    if (
      !cell
      || cell.run_id !== run.run_id
      || input.cell_key !== cell.cell_key
      || input.training_task_spec_id !== cell.training_task_spec_id
      || input.training_task_spec_hash !== cell.training_task_spec_hash
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'ExperimentResult envelope does not bind the exact RunCell and TrainingTaskSpec.',
      );
    }

    const attempt = await this.repository.loadExecutionAttempt(input.execution_attempt_id);
    if (!attempt) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'ExperimentResult requires a durable terminal ExecutionAttempt.',
      );
    }
    if (
      attempt.run_id !== run.run_id
      || attempt.run_manifest_hash !== run.run_manifest_hash
      || attempt.run_cell_id !== cell.run_cell_id
      || attempt.cell_key !== cell.cell_key
      || attempt.training_task_spec_id !== cell.training_task_spec_id
      || attempt.training_task_spec_hash !== cell.training_task_spec_hash
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'ExecutionAttempt does not belong to the exact RunCell lineage.',
      );
    }
    if (attempt.lifecycle_state !== 'succeeded') {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'ExecutionAttempt must be succeeded before recording scientific results.',
      );
    }
    if (attempt.execution_mode !== 'real_provider' || attempt.provenance !== 'real_provider') {
      throw validationError(
        'EVIDENCE_PROVENANCE_REJECTED',
        'Simulation and non-production fake-provider Attempts cannot produce scientific evidence.',
      );
    }
    if (input.provenance !== 'real_provider') {
      throw validationError(
        'EVIDENCE_PROVENANCE_REJECTED',
        'ExperimentResult envelope provenance must be real_provider.',
      );
    }

    const resultWithoutHash: Omit<ExperimentResultCellV2, 'content_hash'> = {
      result_id: deterministicId('ef_experiment_result_v2', cell.run_cell_id),
      schema_version: input.schema_version,
      run_id: input.run_id,
      run_manifest_hash: input.run_manifest_hash,
      run_cell_id: input.run_cell_id,
      cell_key: input.cell_key,
      training_task_spec_id: input.training_task_spec_id,
      training_task_spec_hash: input.training_task_spec_hash,
      execution_attempt_id: input.execution_attempt_id,
      provenance: input.provenance,
      metric_observations: structuredClone(input.metric_observations),
      artifact_observations: structuredClone(input.artifact_observations),
    };
    const result: ExperimentResultCellV2 = {
      ...resultWithoutHash,
      content_hash: serverHashExperimentFoundationV2ScientificResult(resultWithoutHash),
    };
    if (!resultValidator(result)) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'ExperimentResult envelope does not match the shared typed contract.',
      );
    }
    return this.repository.persistExperimentResult({ result, created_at: this.now() });
  }

  private async validateScientificBatchValidated(
    request: ValidateScientificBatchV2Request,
  ): Promise<ValidateScientificBatchV2Response> {
    assertExactInputKeys(request, VALIDATE_BATCH_KEYS, 'ValidateScientificBatch request');
    if (request.idempotency_key.trim().length === 0) {
      throw validationError('VALIDATION_SCOPE_DRIFT', 'idempotency_key is required.');
    }
    const run = await this.requireRun(request.run_id, request.expected_run_manifest_hash);
    const orderedResults = await this.requireCompleteOrderedResults(run);
    if (orderedResults.some((result) => result.provenance !== 'real_provider')) {
      throw validationError(
        'EVIDENCE_PROVENANCE_REJECTED',
        'Every scientific result in the batch must have real-provider provenance.',
      );
    }

    const protocol = await this.repository.resolveEvaluationProtocol(run.run_id);
    if (!protocol) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Run does not resolve an exact typed EvaluationProtocol revision.',
      );
    }
    const requiredRules = protocol.protocol_snapshot.required_rules;
    if (requiredRules.length === 0) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'EvaluationProtocol required_rules must be non-empty for final validation.',
      );
    }

    const unsupportedRules = listUnsupportedRequiredRulesV2(requiredRules);
    const evaluation = executeScientificRequiredRulesV2({
      required_rules: requiredRules,
      ordered_cell_results: orderedResults,
    });
    if (unsupportedRules.length > 0 && evaluation.status !== 'unsupported') {
      throw validationError(
        'VALIDATION_RESULT_CONFLICT',
        'Validator capability discovery and rule execution produced inconsistent status.',
      );
    }

    const acknowledgement = await this.requireHeadAcknowledgement(run);
    const validatorProfileHash = computeScientificValidatorProfileHashV2();
    const orderedCellRefs = run.ordered_cells.map((cell, index) => {
      const result = orderedResults[index]!;
      return {
        ordinal: cell.ordinal,
        run_cell_id: cell.run_cell_id,
        cell_key: cell.cell_key,
        result_id: result.result_id,
        result_content_hash: result.content_hash,
      };
    });
    const validationHash = serverHashExperimentFoundationV2ScientificValidation({
      run_id: run.run_id,
      run_manifest_hash: run.run_manifest_hash,
      ordered_cell_results: orderedCellRefs,
      evaluation_protocol: protocol.evaluation_protocol,
      validator_profile_version:
        EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
      validator_profile_hash: validatorProfileHash,
      ordered_rule_results: evaluation.ordered_rule_results,
      status: evaluation.status,
    });
    const report: ScientificValidationReportV2 = {
      report_id: deterministicId('ef_scientific_validation_report_v2', run.run_id),
      schema_version: 'v1',
      run_id: run.run_id,
      run_manifest_hash: run.run_manifest_hash,
      ordered_cell_results: orderedCellRefs,
      evaluation_protocol: structuredClone(protocol.evaluation_protocol),
      validator_profile_version:
        EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
      validator_profile_hash: validatorProfileHash,
      ordered_rule_results: evaluation.ordered_rule_results,
      status: evaluation.status,
      validation_hash: validationHash,
    };

    const byKey = await this.repository.loadValidationByIdempotencyKey(request.idempotency_key);
    if (byKey) {
      if (byKey.report.validation_hash !== validationHash) {
        throw validationError(
          'VALIDATION_IDEMPOTENCY_CONFLICT',
          'Scientific validation idempotency key was reused for a changed subject.',
        );
      }
      return responseFromOutcome(byKey);
    }
    const byRun = await this.repository.loadValidationByRunId(run.run_id);
    if (byRun) {
      if (byRun.report.validation_hash !== validationHash) {
        throw validationError(
          'VALIDATION_RESULT_CONFLICT',
          'Run already has a scientific report with a different validation hash.',
        );
      }
      return responseFromOutcome(byRun);
    }

    const now = this.now();
    const evidenceCandidate = report.status === 'passed'
      ? buildEvidenceCandidate(report)
      : null;
    const outbox = evidenceCandidate
      ? buildEvidenceCandidateOutbox(
        evidenceCandidate,
        report,
        acknowledgement,
        request.idempotency_key,
        now,
      )
      : null;
    const committed = await this.repository.persistValidationOutcome({
      report,
      evidence_candidate: evidenceCandidate,
      outbox,
      idempotency_key: request.idempotency_key,
      created_at: now,
    });
    return responseFromOutcome(committed);
  }

  private async requireRun(
    runId: string,
    expectedRunManifestHash: string,
  ): Promise<ExperimentFoundationScientificValidationV2Run> {
    const run = await this.repository.loadRun(runId, expectedRunManifestHash);
    if (!run || run.run_manifest_hash !== expectedRunManifestHash) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Run is absent or its immutable manifest hash does not match.',
      );
    }
    return run;
  }

  private async requireCompleteOrderedResults(
    run: ExperimentFoundationScientificValidationV2Run,
  ): Promise<ExperimentResultCellV2[]> {
    const results = await this.repository.loadRunResults(run.run_id);
    const resultsByCell = new Map<string, ExperimentResultCellV2[]>();
    for (const result of results) {
      const grouped = resultsByCell.get(result.run_cell_id) ?? [];
      grouped.push(result);
      resultsByCell.set(result.run_cell_id, grouped);
    }
    if (results.length !== run.ordered_cells.length) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Every RunCell must have exactly one persisted ExperimentResult.',
      );
    }
    return run.ordered_cells.map((cell) => {
      const matches = resultsByCell.get(cell.run_cell_id) ?? [];
      const result = matches[0];
      if (
        matches.length !== 1
        || !result
        || result.run_id !== run.run_id
        || result.run_manifest_hash !== run.run_manifest_hash
        || result.cell_key !== cell.cell_key
        || result.training_task_spec_id !== cell.training_task_spec_id
        || result.training_task_spec_hash !== cell.training_task_spec_hash
      ) {
        throw validationError(
          'VALIDATION_SUBJECT_INCOMPLETE',
          'A RunCell result is absent, duplicated, or does not bind its exact frozen cell.',
        );
      }
      return result;
    });
  }

  private async requireHeadAcknowledgement(
    run: ExperimentFoundationScientificValidationV2Run,
  ): Promise<ExperimentFoundationScientificValidationV2HeadAcknowledgement> {
    const acknowledgement = await this.repository.loadHeadAcknowledgement(run.run_id);
    if (
      !acknowledgement
      || acknowledgement.run_id !== run.run_id
      || acknowledgement.run_manifest_hash !== run.run_manifest_hash
      || acknowledgement.branch_id !== run.external_pi_branch_id
      || acknowledgement.work_order_revision_id !== run.external_pi_work_order_revision_id
      || acknowledgement.work_order_revision_hash !== run.external_pi_work_order_revision_hash
      || acknowledgement.revision_sequence !== run.external_pi_revision_sequence
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Exact durable head acknowledgement is required before scientific validation writes.',
      );
    }
    return acknowledgement;
  }

  private async withRepositoryErrorMapping<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ExperimentFoundationScientificValidationV2ConstraintError) {
        throw validationError(error.reasonCode, error.message);
      }
      throw error;
    }
  }
}

function buildEvidenceCandidate(report: ScientificValidationReportV2): EvidenceCandidateV2 {
  const contentHash = serverHashExperimentFoundationV2EvidenceCandidate({
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
  });
  return {
    candidate_id: deterministicId('ef_evidence_candidate_v2', contentHash),
    schema_version: 'v1',
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
    content_hash: contentHash,
  };
}

function buildEvidenceCandidateOutbox(
  candidate: EvidenceCandidateV2,
  report: ScientificValidationReportV2,
  acknowledgement: ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  idempotencyKey: string,
  now: string,
): ExperimentFoundationScientificValidationV2Outbox {
  const payload: EvidenceCandidateQualifiedV1 = {
    event_schema: EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
    candidate_id: candidate.candidate_id,
    candidate_content_hash: candidate.content_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    evaluation_protocol_revision_id: report.evaluation_protocol.revision_id,
    evaluation_protocol_content_hash: report.evaluation_protocol.content_hash,
  };
  const payloadHash = serverHashExperimentV2EventPayload(
    'EvidenceCandidateQualified',
    'v1',
    payload,
  );
  const event: EvidenceCandidateQualifiedEventV1 = {
    event_id: deterministicId('ef_integration_event_v2', candidate.content_hash),
    event_type: 'EvidenceCandidateQualified',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: now,
    correlation_id: acknowledgement.correlation_id,
    causation_id: acknowledgement.event_id,
    business_idempotency_key: idempotencyKey,
    implementation_project_id: acknowledgement.implementation_project_id,
    validation_cycle_id: acknowledgement.validation_cycle_id,
    branch_id: acknowledgement.branch_id,
    branch_key: acknowledgement.branch_key,
    work_order_revision_id: acknowledgement.work_order_revision_id,
    work_order_revision_hash: acknowledgement.work_order_revision_hash,
    branch_revision_sequence: acknowledgement.revision_sequence,
    cell_plan_hash: acknowledgement.cell_plan_hash,
    approved_plan_hash: acknowledgement.approved_plan_hash,
    payload_hash: payloadHash,
    payload,
  };
  return {
    outbox_id: deterministicId('ef_integration_outbox_v2', event.event_id),
    aggregate_type: 'ExperimentFoundationEvidenceCandidateV2',
    aggregate_id: candidate.candidate_id,
    transition_key: `${candidate.candidate_id}:evidence-candidate-qualified@v1`,
    event,
    event_envelope_hash: serverHashExperimentV2EventEnvelope(event),
    created_at: now,
  };
}

function responseFromOutcome(
  outcome: ExperimentFoundationScientificValidationV2StoredOutcome,
): ValidateScientificBatchV2Response {
  return {
    report: outcome.report,
    evidence_candidate: outcome.evidence_candidate,
  };
}

function deterministicId(namespace: string, identity: string): string {
  const digest = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(identity)
    .digest('hex');
  return `${namespace}_${digest}`;
}

function assertExactInputKeys(
  value: object,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw validationError(
      'VALIDATION_SCOPE_DRIFT',
      `${label} must be identity/observation-only and cannot carry server-owned fields.`,
    );
  }
}

function validationError(
  reasonCode: ExperimentFoundationScientificValidationReasonCodeV2,
  message: string,
): AppError {
  const policy = ERROR_POLICY[reasonCode];
  return new AppError(policy.status, policy.code, message, { reason_code: reasonCode });
}
