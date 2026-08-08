import { createHash } from 'node:crypto';

import { Ajv } from 'ajv';
import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  experimentResultCellV2Schema,
  type EvidenceCandidateQualifiedV1,
  type EvidenceCandidateV2,
  type ExperimentFoundationScientificValidationReasonCodeV2,
  type ExperimentFoundationScientificValidationStatusV2,
  type ExperimentResultCellV2,
  type GenerateExperimentResultV2Request,
  type ScientificValidationReportV2,
  type ValidateScientificBatchV2Request,
  type ValidateScientificBatchV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  experimentFoundationSourceBoundResultCellV2Schema,
  type ExperimentFoundationSourceBoundResultCellV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import {
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificResult,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type EvidenceCandidateQualifiedEventV1,
  type ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  type ExperimentFoundationScientificValidationV2Outbox,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2Protocol,
  type ExperimentFoundationScientificValidationV2Run,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
  type ExperimentFoundationScientificResultGenerationAuthorityV2,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import {
  computeScientificValidatorProfileHashV2,
  executeScientificRequiredRulesV2,
  listUnsupportedRequiredRulesV2,
} from './experiment-foundation-v2-scientific-rule-engine.js';
import {
  executeScientificComparisonsV1,
} from './experiment-foundation-v2-scientific-comparison-engine.js';

export type RecordExperimentResultV2Input = Omit<
  ExperimentResultCellV2,
  'result_id' | 'content_hash'
>;

export type GenerateExperimentResultV2Input = GenerateExperimentResultV2Request;

export interface ExperimentFoundationScientificValidationV2ServiceOptions {
  repository: ExperimentFoundationScientificValidationV2Repository;
  enabled: () => boolean;
  /** Test/migration compatibility only; product composition must leave this disabled. */
  legacyObservationWriterEnabled?: () => boolean;
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
const GENERATE_RESULT_KEYS = [
  'run_cell_id',
  'scientific_source_output_id',
  'idempotency_key',
] as const;

const resultValidator = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
}).compile<ExperimentResultCellV2>(experimentResultCellV2Schema);
const sourceBoundResultValidator = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
}).compile<ExperimentFoundationSourceBoundResultCellV2>(
  experimentFoundationSourceBoundResultCellV2Schema,
);

export class ExperimentFoundationV2ScientificValidationService {
  private readonly repository: ExperimentFoundationScientificValidationV2Repository;
  private readonly enabled: () => boolean;
  private readonly legacyObservationWriterEnabled: () => boolean;
  private readonly now: () => string;

  constructor(options: ExperimentFoundationScientificValidationV2ServiceOptions) {
    this.repository = options.repository;
    this.enabled = options.enabled;
    this.legacyObservationWriterEnabled = options.legacyObservationWriterEnabled
      ?? (() => false);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordExperimentResult(
    input: RecordExperimentResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    return this.withRepositoryErrorMapping(() => this.recordExperimentResultValidated(input));
  }

  /** Product-safe command: callers can name identities, never scientific values. */
  async generateExperimentResult(
    input: GenerateExperimentResultV2Input,
  ): Promise<ExperimentFoundationSourceBoundResultCellV2> {
    return this.withRepositoryErrorMapping(() => this.generateExperimentResultValidated(input));
  }

  async validateScientificBatch(
    request: ValidateScientificBatchV2Request,
  ): Promise<ValidateScientificBatchV2Response> {
    return this.withRepositoryErrorMapping(() => this.validateScientificBatchValidated(request));
  }

  /** Durable reads remain available after intake is disabled. */
  async getScientificValidation(
    runId: string,
  ): Promise<ValidateScientificBatchV2Response | null> {
    const outcome = await this.repository.loadValidationByRunId(runId);
    return outcome ? responseFromOutcome(outcome) : null;
  }

  private async recordExperimentResultValidated(
    input: RecordExperimentResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    this.assertEnabled();
    if (!this.legacyObservationWriterEnabled()) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Caller-authored observation Result writing is sealed from product composition.',
      );
    }
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

  private async generateExperimentResultValidated(
    input: GenerateExperimentResultV2Input,
  ): Promise<ExperimentFoundationSourceBoundResultCellV2> {
    this.assertEnabled();
    assertExactInputKeys(input, GENERATE_RESULT_KEYS, 'GenerateExperimentResult command');
    if (
      input.run_cell_id.trim().length === 0
      || input.scientific_source_output_id.trim().length === 0
      || input.idempotency_key.trim().length === 0
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Result generation requires exact run-cell, scientific-source and idempotency identities.',
      );
    }
    if (
      input.idempotency_key
        !== `${input.scientific_source_output_id}:generate-scientific-result@v1`
    ) {
      throw validationError(
        'VALIDATION_IDEMPOTENCY_CONFLICT',
        'Result-generation idempotency identity is not the deterministic source-bound key.',
      );
    }
    const authority = await this.repository.loadScientificResultGenerationAuthority(
      input.run_cell_id,
      input.scientific_source_output_id,
    );
    if (!authority) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Committed scientific-source authority is absent.',
      );
    }
    const protocol = await this.repository.resolveEvaluationProtocol(authority.run_id);
    if (!protocol) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Scientific source no longer resolves its exact EvaluationProtocol.',
      );
    }
    assertSourceGenerationAuthority(authority, protocol);
    const manifest = authority.source_manifest;
    const derivationHash = serverHashExperimentV2SemanticContent({
      record_kind: 'ExperimentFoundationScientificResultDerivation',
      schema_version: 'v1',
      hash_profile: 'ef-scientific-derivation-json@v1',
      content: {
        projector_identity: 'scientific_source_to_result@v1',
        run_cell_id: authority.run_cell_id,
        scientific_source_output_id: authority.source_output_id,
        scientific_source_output_hash: authority.source_output_hash,
        evaluation_protocol_content_hash: protocol.evaluation_protocol.content_hash,
      },
    });
    const withoutContentHash: Omit<
      ExperimentFoundationSourceBoundResultCellV2,
      'content_hash'
    > = {
      result_id: deterministicId('ef_experiment_result_v2', authority.run_cell_id),
      schema_version: 'v2',
      run_id: authority.run_id,
      run_manifest_hash: authority.run_manifest_hash,
      run_cell_id: authority.run_cell_id,
      cell_key: authority.cell_key,
      training_task_spec_id: authority.training_task_spec_id,
      training_task_spec_hash: authority.training_task_spec_hash,
      execution_attempt_id: authority.execution_attempt_id,
      collection_attempt_id: authority.collection_attempt_id,
      source_output_id: authority.source_output_id,
      source_output_hash: authority.source_output_hash,
      source_output_kind: 'scientific_result_manifest',
      source_output_class: 'scientific_source',
      parser_profile_version:
        manifest.interpretation_binding.parser_profile_version,
      parser_profile_hash: manifest.interpretation_binding.parser_profile_hash,
      evaluation_protocol: structuredClone(protocol.evaluation_protocol),
      provenance: 'real_provider',
      metric_observations: structuredClone(manifest.ordered_observations),
      artifact_observations: structuredClone(manifest.ordered_artifacts),
      derivation_hash: derivationHash,
    };
    const result: ExperimentFoundationSourceBoundResultCellV2 = {
      ...withoutContentHash,
      content_hash: serverHashExperimentV2SemanticContent({
        record_kind: 'ExperimentFoundationExperimentResultV2',
        schema_version: 'v2',
        hash_profile: 'ef-scientific-result-json@v1',
        content: withoutContentHash,
      }),
    };
    if (!sourceBoundResultValidator(result)) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Generated source-bound Result does not match its shared contract.',
      );
    }
    return this.repository.persistSourceBoundExperimentResult({
      result,
      created_at: this.now(),
    });
  }

  private async validateScientificBatchValidated(
    request: ValidateScientificBatchV2Request,
  ): Promise<ValidateScientificBatchV2Response> {
    this.assertEnabled();
    assertExactInputKeys(request, VALIDATE_BATCH_KEYS, 'ValidateScientificBatch request');
    if (request.idempotency_key.trim().length === 0) {
      throw validationError('VALIDATION_SCOPE_DRIFT', 'idempotency_key is required.');
    }
    const run = await this.requireRun(request.run_id, request.expected_run_manifest_hash);
    const protocol = await this.repository.resolveEvaluationProtocol(run.run_id);
    if (!protocol) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Run does not resolve an exact typed EvaluationProtocol revision.',
      );
    }
    const legacyValidation = this.legacyObservationWriterEnabled();
    const orderedResults = legacyValidation
      ? await this.requireCompleteOrderedLegacyResults(run)
      : await this.requireCompleteOrderedSourceBoundResults(run, protocol);
    if (orderedResults.some((result) => result.provenance !== 'real_provider')) {
      throw validationError(
        'EVIDENCE_PROVENANCE_REJECTED',
        'Every scientific result in the batch must have real-provider provenance.',
      );
    }
    const requiredRules = protocol.protocol_snapshot.required_rules;
    if (requiredRules.length === 0) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'EvaluationProtocol required_rules must be non-empty for final validation.',
      );
    }

    const scientificContract = protocol.protocol_snapshot.scientific_contract;
    const comparisonRules = scientificContract?.comparison_rules ?? [];
    if (!legacyValidation && (!scientificContract || comparisonRules.length === 0)) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'P2 validation requires a non-empty preregistered CMP-B1 comparison contract.',
      );
    }
    if (!legacyValidation) {
      assertComparisonProtocolForRun(run, scientificContract!, requiredRules);
    }
    const unsupportedRules = listUnsupportedRequiredRulesV2(requiredRules);
    const evaluation = executeScientificRequiredRulesV2({
      required_rules: requiredRules,
      ordered_cell_results: orderedResults,
      ...(!legacyValidation
        ? { artifact_slots: scientificContract!.artifact_slots }
        : {}),
    });
    if (unsupportedRules.length > 0 && evaluation.status !== 'unsupported') {
      throw validationError(
        'VALIDATION_RESULT_CONFLICT',
        'Validator capability discovery and rule execution produced inconsistent status.',
      );
    }
    const comparisonEvaluation = legacyValidation
      ? null
      : executeScientificComparisonsV1({
        run_id: run.run_id,
        evaluation_protocol_revision_hash: protocol.evaluation_protocol.content_hash,
        ordered_cells: run.ordered_cells,
        ordered_cell_results: orderedResults as ExperimentFoundationSourceBoundResultCellV2[],
        observation_slots: scientificContract!.observation_slots,
        comparison_rules: comparisonRules,
      });
    const status: ExperimentFoundationScientificValidationStatusV2 =
      evaluation.status === 'unsupported'
      ? 'unsupported'
      : evaluation.status === 'failed' || comparisonEvaluation?.status === 'failed'
        ? 'failed'
        : 'passed';

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
    const validationHashInput = {
      run_id: run.run_id,
      run_manifest_hash: run.run_manifest_hash,
      ordered_cell_results: orderedCellRefs,
      evaluation_protocol: protocol.evaluation_protocol,
      validator_profile_version:
        EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
      validator_profile_hash: validatorProfileHash,
      ordered_rule_results: evaluation.ordered_rule_results,
      ...(comparisonEvaluation
        ? { ordered_comparison_results: comparisonEvaluation.ordered_comparison_results }
        : {}),
      status,
    };
    const validationHash = serverHashExperimentFoundationV2ScientificValidation(
      validationHashInput,
    );
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
      ...(comparisonEvaluation
        ? { ordered_comparison_results: comparisonEvaluation.ordered_comparison_results }
        : {}),
      status,
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

  private assertEnabled(): void {
    if (!this.enabled()) {
      throw validationError(
        'EF_V2_SCIENTIFIC_VALIDATION_DISABLED',
        'Experiment Foundation scientific validation is disabled.',
      );
    }
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

  private async requireCompleteOrderedLegacyResults(
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

  private async requireCompleteOrderedSourceBoundResults(
    run: ExperimentFoundationScientificValidationV2Run,
    protocol: ExperimentFoundationScientificValidationV2Protocol,
  ): Promise<ExperimentFoundationSourceBoundResultCellV2[]> {
    const results = await this.repository.loadSourceBoundRunResults(run.run_id);
    const resultsByCell = new Map<string, ExperimentFoundationSourceBoundResultCellV2[]>();
    for (const result of results) {
      const grouped = resultsByCell.get(result.run_cell_id) ?? [];
      grouped.push(result);
      resultsByCell.set(result.run_cell_id, grouped);
    }
    if (results.length !== run.ordered_cells.length) {
      throw validationError(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Every RunCell must have exactly one persisted source-bound v2 Result.',
      );
    }
    return run.ordered_cells.map((cell) => {
      const matches = resultsByCell.get(cell.run_cell_id) ?? [];
      const result = matches[0];
      if (
        matches.length !== 1
        || !result
        || result.schema_version !== 'v2'
        || result.run_id !== run.run_id
        || result.run_manifest_hash !== run.run_manifest_hash
        || result.cell_key !== cell.cell_key
        || result.training_task_spec_id !== cell.training_task_spec_id
        || result.training_task_spec_hash !== cell.training_task_spec_hash
        || !exactProtocolRefEquals(result.evaluation_protocol, protocol.evaluation_protocol)
      ) {
        throw validationError(
          'VALIDATION_SUBJECT_INCOMPLETE',
          'A source-bound Result is absent, duplicated, or drifts from its exact RunCell/protocol.',
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

function assertSourceGenerationAuthority(
  authority: ExperimentFoundationScientificResultGenerationAuthorityV2,
  protocol: ExperimentFoundationScientificValidationV2Protocol,
): void {
  const manifest = authority.source_manifest;
  if (
    manifest.authority.collection_attempt_id !== authority.collection_attempt_id
    || manifest.authority.execution_attempt_id !== authority.execution_attempt_id
    || manifest.authority.provenance !== 'real_provider'
    || manifest.execution_lineage.run_id !== authority.run_id
    || manifest.execution_lineage.run_manifest_hash !== authority.run_manifest_hash
    || manifest.execution_lineage.run_cell_id !== authority.run_cell_id
    || manifest.execution_lineage.cell_key !== authority.cell_key
    || manifest.execution_lineage.training_task_spec_id !== authority.training_task_spec_id
    || manifest.execution_lineage.training_task_spec_hash
      !== authority.training_task_spec_hash
    || manifest.evaluation_protocol.evaluation_protocol_id
      !== protocol.evaluation_protocol.logical_id
    || manifest.evaluation_protocol.revision_id
      !== protocol.evaluation_protocol.revision_id
    || manifest.evaluation_protocol.revision_sequence
      !== protocol.evaluation_protocol.revision_sequence
    || manifest.evaluation_protocol.content_hash
      !== protocol.evaluation_protocol.content_hash
  ) {
    throw validationError(
      'VALIDATION_SCOPE_DRIFT',
      'Scientific source does not bind the exact Result-generation authority.',
    );
  }
  const contract = protocol.protocol_snapshot.scientific_contract;
  const observations = manifest.ordered_observations;
  const artifacts = manifest.ordered_artifacts;
  if (
    !contract
    || observations.length !== contract.observation_slots.length
    || artifacts.length !== contract.artifact_slots.length
    || contract.observation_slots.some((slot, index) => {
      const observation = observations[index];
      if (
        !observation
        || observation.ordinal !== slot.ordinal
        || observation.observation_key !== slot.observation_key
        || observation.metric_key !== slot.metric_key
        || observation.split_key !== slot.split_key
        || observation.value_type !== slot.value_type
        || observation.unit !== slot.unit
        || observation.statistic.kind !== slot.statistic.kind
        || observation.uncertainty.kind !== slot.uncertainty.kind
      ) return true;
      if (slot.statistic.kind === 'quantile') {
        if (
          observation.statistic.kind !== 'quantile'
          || observation.statistic.probability !== slot.statistic.probability
        ) return true;
      }
      return slot.uncertainty.kind === 'confidence_interval'
        && (
          observation.uncertainty.kind !== 'confidence_interval'
          || observation.uncertainty.level !== slot.uncertainty.level
          || !slot.uncertainty.allowed_method_keys.includes(
            observation.uncertainty.method_key,
          )
        );
    })
    || contract.artifact_slots.some((slot, index) => {
      const artifact = artifacts[index];
      return !artifact
        || artifact.ordinal !== slot.ordinal
        || artifact.artifact_key !== slot.artifact_key
        || artifact.artifact_kind !== slot.artifact_kind;
    })
  ) {
    throw validationError(
      'VALIDATION_SCOPE_DRIFT',
      'Scientific source no longer matches the exact ordered protocol slots.',
    );
  }
}

function deterministicId(namespace: string, identity: string): string {
  const digest = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(identity)
    .digest('hex');
  return `${namespace}_${digest}`;
}

function exactProtocolRefEquals(
  left: ExperimentFoundationSourceBoundResultCellV2['evaluation_protocol'],
  right: ExperimentFoundationScientificValidationV2Protocol['evaluation_protocol'],
): boolean {
  return left.asset_type === right.asset_type
    && left.logical_id === right.logical_id
    && left.revision_id === right.revision_id
    && left.revision_sequence === right.revision_sequence
    && left.content_hash === right.content_hash;
}

function assertComparisonProtocolForRun(
  run: ExperimentFoundationScientificValidationV2Run,
  contract: NonNullable<
    ExperimentFoundationScientificValidationV2Protocol['protocol_snapshot']['scientific_contract']
  >,
  requiredRules: ExperimentFoundationScientificValidationV2Protocol['protocol_snapshot']['required_rules'],
): void {
  const cellOrdinals = new Set(run.ordered_cells.map((cell) => cell.ordinal));
  if (
    cellOrdinals.size !== run.ordered_cells.length
    || run.ordered_cells.some((cell, index) => cell.ordinal !== index + 1)
    || !hasCanonicalUniqueKeys(contract.observation_slots, (slot) => slot.observation_key)
    || !hasCanonicalUniqueKeys(contract.artifact_slots, (slot) => slot.artifact_key)
  ) {
    throw validationError(
      'VALIDATION_SCOPE_DRIFT',
      'EvaluationProtocol scientific slots or Run cells are not canonically ordered.',
    );
  }
  const observationSlots = new Map(
    contract.observation_slots.map((slot) => [slot.observation_key, slot]),
  );
  const comparisonKeys = new Set<string>();
  for (let index = 0; index < (contract.comparison_rules ?? []).length; index += 1) {
    const rule = contract.comparison_rules![index]!;
    const observationSlot = observationSlots.get(rule.observation_key);
    if (
      rule.ordinal !== index + 1
      || comparisonKeys.has(rule.comparison_key)
      || !cellOrdinals.has(rule.left_cell_ordinal)
      || !cellOrdinals.has(rule.right_cell_ordinal)
      || rule.left_cell_ordinal === rule.right_cell_ordinal
      || !observationSlot
      || !Number.isFinite(rule.support_min)
      || !Number.isFinite(rule.contradiction_max)
      || rule.contradiction_max >= rule.support_min
      || (
        rule.uncertainty_policy.kind === 'confidence_interval_guard'
        && (
          !Number.isFinite(rule.uncertainty_policy.confidence_level)
          || rule.uncertainty_policy.confidence_level <= 0
          || rule.uncertainty_policy.confidence_level >= 1
          || rule.uncertainty_policy.method_key.trim().length === 0
          || observationSlot.uncertainty.kind !== 'confidence_interval'
          || observationSlot.uncertainty.level
            !== rule.uncertainty_policy.confidence_level
          || !observationSlot.uncertainty.allowed_method_keys.includes(
            rule.uncertainty_policy.method_key,
          )
        )
      )
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'EvaluationProtocol CMP-B1 bindings are invalid for the exact Run.',
      );
    }
    comparisonKeys.add(rule.comparison_key);
  }
  if (
    !contract.primary_comparison_key
    || !comparisonKeys.has(contract.primary_comparison_key)
    || !contract.decision_if_positive?.trim()
    || !contract.decision_if_negative?.trim()
    || !contract.decision_if_inconclusive?.trim()
  ) {
    throw validationError(
      'VALIDATION_SCOPE_DRIFT',
      'EvaluationProtocol must freeze one primary comparison and all three scientific exits.',
    );
  }

  const artifactRules = new Map(
    requiredRules
      .filter((rule) => rule.rule_type === 'artifact_contract@v1')
      .map((rule) => [rule.rule_id, rule]),
  );
  const bindingCounts = new Map<string, number>();
  for (const slot of contract.artifact_slots) {
    if (!Object.hasOwn(slot, 'required_rule_id')) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Every scientific artifact slot must explicitly bind a required rule or trace-only null.',
      );
    }
    if (slot.required_rule_id === null) continue;
    const rule = artifactRules.get(slot.required_rule_id ?? '');
    if (
      !rule
      || rule.rule_type !== 'artifact_contract@v1'
      || rule.artifact_kind !== slot.artifact_kind
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'EvaluationProtocol contains an invalid scientific artifact rule binding.',
      );
    }
    bindingCounts.set(rule.rule_id, (bindingCounts.get(rule.rule_id) ?? 0) + 1);
  }
  for (const rule of artifactRules.values()) {
    if (
      rule.rule_type !== 'artifact_contract@v1'
      || bindingCounts.get(rule.rule_id) !== rule.required_cardinality
    ) {
      throw validationError(
        'VALIDATION_SCOPE_DRIFT',
        'Scientific artifact rule bindings do not match required cardinality.',
      );
    }
  }
}

function hasCanonicalUniqueKeys<T extends { ordinal: number }>(
  values: readonly T[],
  keyOf: (value: T) => string,
): boolean {
  const keys = new Set<string>();
  return values.every((value, index) => {
    const key = keyOf(value);
    if (value.ordinal !== index + 1 || key.trim().length === 0 || keys.has(key)) return false;
    keys.add(key);
    return true;
  });
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
