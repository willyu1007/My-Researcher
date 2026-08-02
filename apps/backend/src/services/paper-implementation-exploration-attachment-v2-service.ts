import { Ajv, type ValidateFunction } from 'ajv';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import {
  paperImplementationExplorationAttachmentV2ParamsSchema,
  paperImplementationExplorationAttachmentV2RequestSchema,
  type PaperImplementationExplorationAttachmentV2Params,
  type PaperImplementationExplorationAttachmentV2Request,
  type PaperImplementationExplorationAttachmentV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-exploration-attachment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationExplorationAttachmentV2AdmissionInput,
} from './paper-implementation-experiment-v2-admission-service.js';

const SERVER_ACTOR = 'system:paper-implementation-experiment-v2-admission';
const EXPECTED_READINESS_FAILURES = new Set([
  'EXACT_REVISION_NOT_FOUND',
  'EXACT_REVISION_REQUIRED',
  'READINESS_DEPENDENCY_DRIFT',
]);

export interface PaperImplementationExplorationAttachmentV2SpecReader {
  findExactRevision(
    specId: string,
    specRevision: number,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null>;
}

export interface PaperImplementationExplorationAttachmentV2ReadinessRevalidator {
  revalidate(input: {
    readiness_attestation_id: string;
    readiness_attestation_hash: string;
    target: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'EvaluationProtocol' };
    ordered_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  }): Promise<boolean>;
}

export interface PaperImplementationExplorationAttachmentV2AdmissionGateway {
  replayExplorationAttachment(
    input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  ): Promise<PaperImplementationExplorationAttachmentV2Response | null>;
  admitExplorationAttachment(
    input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  ): Promise<PaperImplementationExplorationAttachmentV2Response>;
}

export interface PaperImplementationExplorationAttachmentV2ServiceOptions {
  specReader: PaperImplementationExplorationAttachmentV2SpecReader;
  readinessRevalidator: PaperImplementationExplorationAttachmentV2ReadinessRevalidator;
  admission: PaperImplementationExplorationAttachmentV2AdmissionGateway;
  enabled: () => boolean;
}

export class PaperImplementationExplorationAttachmentV2Service {
  private readonly validateParams: ValidateFunction;
  private readonly validateRequest: ValidateFunction;

  constructor(private readonly options: PaperImplementationExplorationAttachmentV2ServiceOptions) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    this.validateParams = ajv.compile(paperImplementationExplorationAttachmentV2ParamsSchema);
    this.validateRequest = ajv.compile(paperImplementationExplorationAttachmentV2RequestSchema);
  }

  async attach(
    params: PaperImplementationExplorationAttachmentV2Params,
    request: PaperImplementationExplorationAttachmentV2Request,
  ): Promise<PaperImplementationExplorationAttachmentV2Response> {
    if (!this.options.enabled()) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'PaperImplementation exploration attachment is disabled.',
        { reason_code: 'PI_EXPLORATION_ATTACHMENT_DISABLED' },
      );
    }
    if (!this.validateParams(params) || !this.validateRequest(request)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Exploration attachment command is invalid.', {
        reason_code: 'EXPLORATION_ATTACHMENT_COMMAND_INVALID',
      });
    }

    const sourceRevision = await this.options.specReader.findExactRevision(
      params.spec_id,
      params.spec_revision,
    );
    if (
      !sourceRevision
      || sourceRevision.spec_id !== params.spec_id
      || sourceRevision.spec_revision !== params.spec_revision
    ) {
      throw new AppError(404, 'NOT_FOUND', 'Exact exploration specification revision not found.', {
        reason_code: 'EXPLORATION_SPEC_REVISION_NOT_FOUND',
      });
    }

    const admissionInput: PaperImplementationExplorationAttachmentV2AdmissionInput = {
      implementation_project_id: params.implementation_project_id,
      validation_cycle_id: params.validation_cycle_id,
      branch_key: request.branch_key,
      business_idempotency_key: request.business_idempotency_key,
      source_revision: sourceRevision,
      admitted_by: SERVER_ACTOR,
    };
    const replay = await this.options.admission.replayExplorationAttachment(admissionInput);
    if (replay) return replay;

    await this.assertExactReadiness(sourceRevision);
    return this.options.admission.admitExplorationAttachment(admissionInput);
  }

  private async assertExactReadiness(
    sourceRevision: ExperimentFoundationExplorationSpecRevisionV2,
  ): Promise<void> {
    const dependencies = sourceRevision.specification.work_order_revision.asset_dependencies;
    const protocolTargets = dependencies.filter(
      (dependency): dependency is ExperimentFoundationV2ExactAssetRevisionRef & {
        asset_type: 'EvaluationProtocol';
      } => dependency.asset_type === 'EvaluationProtocol',
    );
    if (protocolTargets.length !== 1) {
      throw readinessDrift('Exploration attachment requires one EvaluationProtocol target.');
    }
    let valid = false;
    try {
      valid = await this.options.readinessRevalidator.revalidate({
        readiness_attestation_id:
          sourceRevision.specification.work_order_revision.readiness_attestation_id,
        readiness_attestation_hash:
          sourceRevision.specification.work_order_revision.readiness_attestation_hash,
        target: protocolTargets[0]!,
        ordered_dependencies: dependencies.filter(
          (dependency) => dependency.asset_type !== 'EvaluationProtocol',
        ),
      });
    } catch (error) {
      if (
        error instanceof AppError
        && typeof error.details?.reason_code === 'string'
        && EXPECTED_READINESS_FAILURES.has(error.details.reason_code)
      ) {
        throw readinessDrift('Exploration attachment exact readiness has drifted.');
      }
      throw error;
    }
    if (!valid) {
      throw readinessDrift('Exploration attachment exact readiness has drifted.');
    }
  }
}

function readinessDrift(message: string): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, {
    reason_code: 'EXPLORATION_ATTACHMENT_READINESS_DRIFT',
  });
}
