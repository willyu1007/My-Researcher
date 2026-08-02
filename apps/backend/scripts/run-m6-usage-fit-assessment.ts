/**
 * T-132 M6-R3 workflow usage-fit assessment runner (read-only).
 *
 * Walks the agent/API golden flow over one live implementation project using
 * the M5 service layer directly (no HTTP server, no schedulers, zero writes)
 * and emits the evidence JSON consumed by the usage-fit rubric
 * (15-m6-usage-fit-rubric.md). Every identity the "agent" supplies beyond the
 * initial project id must have been received from a previous response; the
 * runner fails if any step would require an externally assembled identity.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationExperimentLineageV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PaperImplementationAgentActionsV2Service,
} from '../src/services/paper-implementation-agent-actions-v2-service.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationExperimentLineageV2Service,
} from '../src/services/paper-implementation-experiment-lineage-v2-service.js';

interface TraceEntry {
  fact: string;
  value: string;
  resolved_via: string;
  resolved: boolean;
}

async function main(): Promise<void> {
  const implementationProjectId = process.argv[2];
  const outputPath = process.argv[3];
  if (!implementationProjectId || !outputPath) {
    throw new Error('usage: run-m6-usage-fit-assessment.ts <implementation_project_id> <output.json>');
  }
  const prisma = new PrismaClient();
  const lineage = new PaperImplementationExperimentLineageV2Service({
    repository: new PrismaPaperImplementationExperimentLineageV2Repository(prisma),
  });
  const readiness = new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  });
  const actions = new PaperImplementationAgentActionsV2Service({
    readiness,
    lineage,
  });

  const suppliedIdentities = [implementationProjectId];
  let callCount = 0;

  callCount += 1;
  const cycles = await lineage.listProjectValidationCycles(implementationProjectId);
  const cycle = cycles.validation_cycles.find((entry) => !entry.closure.closed)
    ?? cycles.validation_cycles[0];
  if (!cycle) throw new Error('No ValidationCycle visible for the project.');

  callCount += 1;
  const tree = await lineage.getValidationCycleExperimentLineage(
    implementationProjectId,
    cycle.validation_cycle_id,
  );
  const branch = tree.branches[0];
  if (!branch) throw new Error('No branch visible in the cycle lineage.');

  callCount += 1;
  const history = await lineage.getWorkOrderBranchRevisionHistory(
    implementationProjectId,
    branch.branch_id,
  );

  callCount += 1;
  const availableActions = await actions.listValidationCycleAvailableActions(
    implementationProjectId,
    cycle.validation_cycle_id,
  );

  callCount += 1;
  const preparation = await actions.prepareValidationCycleClosure(cycle.validation_cycle_id);

  const currentRevision = history.revisions.find((revision) => revision.is_current_admitted);
  const headRun = branch.effective_head_run;
  const trace: TraceEntry[] = [
    {
      fact: 'preparation.cycle',
      value: cycle.validation_cycle_id,
      resolved_via: 'listProjectValidationCycles → getValidationCycleExperimentLineage',
      resolved: tree.validation_cycle.validation_cycle_id === cycle.validation_cycle_id,
    },
    {
      fact: 'branch.current_admitted_revision.hash',
      value: branch.current_admitted_revision.work_order_revision_hash ?? 'null',
      resolved_via: 'revision-history entry with is_current_admitted=true',
      resolved: currentRevision !== undefined
        && currentRevision.content_hash === branch.current_admitted_revision.work_order_revision_hash,
    },
    {
      fact: 'effective_head_run.run_id',
      value: headRun?.run_id ?? 'null',
      resolved_via: 'revision-history entry with is_head_run_source=true',
      resolved: headRun !== null
        && history.revisions.some((revision) => (
          revision.is_head_run_source && revision.run_ref?.run_id === headRun.run_id
        )),
    },
    {
      fact: 'attempts terminal for closure readiness',
      value: (headRun?.ordered_attempts ?? [])
        .map((attempt) => `${attempt.execution_attempt_id}:${attempt.lifecycle_state}`)
        .join(','),
      resolved_via: 'cycle experiment lineage ordered_attempts',
      resolved: (headRun?.ordered_attempts ?? []).every(
        (attempt) => attempt.lifecycle_state === 'succeeded',
      ),
    },
    {
      fact: 'preparation readiness consistent with available-actions closure entry',
      value: preparation.readiness.outcome,
      resolved_via: 'available-actions close_validation_cycle presence',
      resolved: (preparation.readiness.outcome === 'ready')
        === availableActions.actions.some(
          (action) => action.action_kind === 'close_validation_cycle',
        ),
    },
  ];

  const evidence = {
    assessment: 't132-m6-usage-fit@v1',
    generated_for: 'dev-docs/archive/experiment-foundation-productization-closure/artifacts/implementation/15-m6-usage-fit-rubric.md',
    implementation_project_id: implementationProjectId,
    call_count: callCount,
    supplied_identities: suppliedIdentities,
    identities_received_not_retyped: [
      cycle.validation_cycle_id,
      branch.branch_id,
      branch.current_admitted_revision.work_order_revision_id,
      headRun?.run_id ?? null,
    ].filter((value): value is string => value !== null),
    manually_assembled_identities: [] as string[],
    cycle_summary: {
      validation_cycle_id: cycle.validation_cycle_id,
      status: cycle.status,
      closure: cycle.closure,
      branch_count: cycle.branch_count,
    },
    available_actions: availableActions.actions.map((action) => ({
      action_kind: action.action_kind,
      method: action.method,
      capability_gated: action.capability_gated,
      required_human_confirmation_scope: action.required_human_confirmation_scope,
    })),
    preparation: {
      readiness_outcome: preparation.readiness.outcome,
      blockers: preparation.readiness.blockers,
      derived_closure_kind: preparation.derived_closure_kind,
      prepared_request_present: preparation.prepared_request !== null,
      prepared_request: preparation.prepared_request,
    },
    reverse_trace: trace,
    reverse_trace_fully_resolved: trace.every((entry) => entry.resolved),
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({
    call_count: callCount,
    readiness: preparation.readiness.outcome,
    derived_closure_kind: evidence.preparation.derived_closure_kind,
    prepared_request_present: evidence.preparation.prepared_request_present,
    actions: evidence.available_actions.map((action) => action.action_kind),
    reverse_trace_fully_resolved: evidence.reverse_trace_fully_resolved,
  }, null, 2));
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
