import type {
  ExperimentFoundationExecutionReasonCodeV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import { AppError } from '../errors/app-error.js';

type ExecutionErrorPolicy = {
  status: number;
  code: 'INVALID_PAYLOAD'
    | 'NOT_FOUND'
    | 'VERSION_CONFLICT'
    | 'GATE_CONSTRAINT_FAILED'
    | 'CONCURRENT_ADVANCE';
};

const EXPERIMENT_FOUNDATION_EXECUTION_V2_ERROR_POLICY = {
  EF_V2_WORKFLOW_SIMULATION_DISABLED: { status: 409, code: 'VERSION_CONFLICT' },
  EXECUTION_HEAD_ACK_REQUIRED: { status: 404, code: 'NOT_FOUND' },
  EXECUTION_RUN_NOT_CURRENT_HEAD: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  EXECUTION_SCOPE_DRIFT: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  EXECUTION_READINESS_DRIFT: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  EXECUTION_ATTEMPT_NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  PROVIDER_PAYLOAD_INVALID: { status: 400, code: 'INVALID_PAYLOAD' },
  PROVIDER_PAYLOAD_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  EXECUTION_ATTEMPT_LIMIT_EXHAUSTED: { status: 409, code: 'VERSION_CONFLICT' },
  EXECUTION_ATTEMPT_STATE_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  PROVIDER_COMMAND_LEASE_CONFLICT: { status: 409, code: 'CONCURRENT_ADVANCE' },
  PROVIDER_RESPONSE_INVALID: { status: 422, code: 'GATE_CONSTRAINT_FAILED' },
  COLLECTION_ATTEMPT_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
} as const satisfies Record<ExperimentFoundationExecutionReasonCodeV2, ExecutionErrorPolicy>;

export function createExperimentFoundationExecutionV2Error(
  reasonCode: ExperimentFoundationExecutionReasonCodeV2,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): AppError {
  const policy = EXPERIMENT_FOUNDATION_EXECUTION_V2_ERROR_POLICY[reasonCode];
  return new AppError(policy.status, policy.code, message, {
    ...details,
    reason_code: reasonCode,
  });
}
