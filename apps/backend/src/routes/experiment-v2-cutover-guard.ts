import type {
  FastifyReply,
  FastifyRequest,
  onRequestHookHandler,
} from 'fastify';
import type {
  ExperimentV2ReasonCode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

const LEGACY_EXPERIMENT_CUTOVER_REASON_CODE: ExperimentV2ReasonCode =
  'LEGACY_RECORD_NOT_ELIGIBLE';

export type LegacyExperimentMutationRouteOptions = {
  cutoverCommitted?: boolean;
};

async function rejectLegacyExperimentMutation(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await reply.status(409).send({
    error: {
      code: 'GATE_CONSTRAINT_FAILED',
      message: 'Legacy experiment mutation is unavailable after the v2 cutover.',
      details: {
        reason_code: LEGACY_EXPERIMENT_CUTOVER_REASON_CODE,
      },
    },
  });
}

export function legacyExperimentMutationOnRequest(
  options: LegacyExperimentMutationRouteOptions,
): onRequestHookHandler | undefined {
  if (!options.cutoverCommitted) {
    return undefined;
  }

  // onRequest runs before schema validation and the controller. Once the
  // cutover is committed, legacy commands therefore cannot reach a service or
  // repository even when the supplied legacy payload is malformed.
  return rejectLegacyExperimentMutation;
}
