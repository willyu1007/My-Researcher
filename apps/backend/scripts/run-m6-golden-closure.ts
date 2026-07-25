/**
 * T-132 M6-R4 golden no-evidence closure runner.
 *
 * Executes the single user-approved production write of the M6 release
 * closure: submits the M5 closure-preparation skeleton verbatim (plus the one
 * caller-owned business idempotency key) to the v2 closure authority for the
 * named ValidationCycle. The capability window is process-scoped: this runner
 * refuses to construct any client unless BOTH product gate keys are exactly
 * 'true' in its own environment, and nothing is persisted to .env files.
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationExperimentLineageV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  PaperImplementationAgentActionsV2Service,
} from '../src/services/paper-implementation-agent-actions-v2-service.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationExperimentLineageV2Service,
} from '../src/services/paper-implementation-experiment-lineage-v2-service.js';
import {
  PaperImplementationValidationCycleClosureV2Service,
} from '../src/services/paper-implementation-validation-cycle-closure-v2-service.js';

function requireTrueEnv(name: string): void {
  if (process.env[name]?.trim().toLowerCase() !== 'true') {
    throw new Error(`${name} must be exactly 'true' in the approved window environment.`);
  }
}

async function main(): Promise<void> {
  const implementationProjectId = process.argv[2];
  const validationCycleId = process.argv[3];
  const businessIdempotencyKey = process.argv[4];
  const outputPath = process.argv[5];
  if (!implementationProjectId || !validationCycleId || !businessIdempotencyKey || !outputPath) {
    throw new Error('usage: run-m6-golden-closure.ts <project_id> <cycle_id> <business_key> <output.json>');
  }
  requireTrueEnv('PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED');
  requireTrueEnv('PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED');

  const prisma = new PrismaClient();
  const lineage = new PaperImplementationExperimentLineageV2Service({
    repository: new PrismaPaperImplementationExperimentLineageV2Repository(prisma),
  });
  const readiness = new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  });
  const actions = new PaperImplementationAgentActionsV2Service({ readiness, lineage });
  const closure = new PaperImplementationValidationCycleClosureV2Service({
    repository: new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
    enabled: () => true,
  });

  const preparation = await actions.prepareValidationCycleClosure(validationCycleId);
  if (
    preparation.readiness.outcome !== 'ready'
    || preparation.derived_closure_kind !== 'control_flow_validated_no_paper_evidence'
    || preparation.prepared_request === null
  ) {
    throw new Error(`Cycle is not ready for the no-evidence closure: ${JSON.stringify(preparation.readiness)}`);
  }
  const preparedBody = preparation.prepared_request.body;
  if (preparedBody.validation_cycle_id !== validationCycleId) {
    throw new Error('Prepared request cycle does not match the approved target cycle.');
  }

  const response = await closure.close({
    ...preparedBody,
    idempotency_key: businessIdempotencyKey,
  });

  const record = {
    runner: 't132-m6-golden-closure@v1',
    approved_window: 'process-scoped PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
    implementation_project_id: implementationProjectId,
    validation_cycle_id: validationCycleId,
    business_idempotency_key: businessIdempotencyKey,
    submitted_request: { ...preparedBody, idempotency_key: businessIdempotencyKey },
    closure_response: response,
  };
  writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify({
    closed: true,
    closure_id: (response as { closure?: { closure_id?: string } }).closure?.closure_id
      ?? (response as { closure_id?: string }).closure_id ?? 'see-record',
    output: outputPath,
  }));
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
