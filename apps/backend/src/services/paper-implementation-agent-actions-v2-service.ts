import type {
  PaperImplementationAvailableActionV2,
  ValidationCycleAvailableActionsV2Response,
  ValidationCycleClosurePreparationV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-closure-preparation-v2-contracts';
import type {
  ValidationCycleReadinessEvaluationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import type {
  PaperImplementationExperimentLineageV2ActionContext,
} from './paper-implementation-experiment-lineage-v2-service.js';

export interface PaperImplementationAgentActionsV2ReadinessUseCase {
  evaluate(validationCycleId: string): Promise<ValidationCycleReadinessEvaluationV2>;
}

export interface PaperImplementationAgentActionsV2LineageUseCase {
  getValidationCycleActionContext(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<PaperImplementationExperimentLineageV2ActionContext>;
}

export interface PaperImplementationAgentActionsV2ServiceOptions {
  readiness: PaperImplementationAgentActionsV2ReadinessUseCase;
  lineage: PaperImplementationAgentActionsV2LineageUseCase;
}

const NONTERMINAL_ATTEMPT_STATES = new Set([
  'prepared',
  'submitted',
  'running',
]);

const RECONCILABLE_ATTEMPT_STATES = new Set([
  'submitted',
  'running',
]);

const ACTIONABLE_CYCLE_STATES = new Set([
  'admitted',
  'running',
  'interpreting',
]);

function encodePathId(id: string): string {
  return encodeURIComponent(id);
}

function preparationFromReadiness(
  readiness: ValidationCycleReadinessEvaluationV2,
): ValidationCycleClosurePreparationV2Response {
  const readyForControlClosure = readiness.status === 'ready_no_evidence';
  const hasScientificEvidence = readiness.eligible_run_evidence_unit_count > 0;
  const readyForScientificClosure = readiness.status === 'ready_with_evidence'
    && hasScientificEvidence;
  const closureKind = readyForScientificClosure
    ? 'scientific_evidence_assessed' as const
    : readyForControlClosure
      ? 'control_flow_validated_no_paper_evidence' as const
      : null;
  return {
    readiness: {
      outcome: readiness.status === 'blocked' ? 'blocked' : 'ready',
      blockers: readiness.ordered_blockers,
    },
    derived_closure_kind: closureKind,
    prepared_request: closureKind
      ? {
        body: {
          validation_cycle_id: readiness.validation_cycle_id,
          expected_cycle_version: readiness.watermark.expected_cycle_version,
          expected_closure_input_hash: readiness.watermark.closure_input_hash,
          closure_kind: closureKind,
          accepted_proposal_id: null,
          expected_proposal_hash: null,
          idempotency_key: null,
        },
        required_template_fields: closureKind === 'scientific_evidence_assessed'
          ? [{
            field: 'accepted_proposal_id',
            semantic: 'admitted_scientific_proposal_id',
            required: true,
          }, {
            field: 'expected_proposal_hash',
            semantic: 'admitted_scientific_proposal_hash',
            required: true,
          }, {
            field: 'idempotency_key',
            semantic: 'business_idempotency_key',
            required: true,
          }]
          : [{
            field: 'idempotency_key',
            semantic: 'business_idempotency_key',
            required: true,
          }],
      }
      : null,
  };
}

export class PaperImplementationAgentActionsV2Service {
  constructor(
    private readonly options: PaperImplementationAgentActionsV2ServiceOptions,
  ) {}

  async prepareValidationCycleClosure(
    validationCycleId: string,
  ): Promise<ValidationCycleClosurePreparationV2Response> {
    const readiness = await this.options.readiness.evaluate(validationCycleId);
    if (readiness.validation_cycle_id !== validationCycleId) {
      throw new Error(
        `Readiness evaluator returned a different ValidationCycle: ${readiness.validation_cycle_id}`,
      );
    }
    return preparationFromReadiness(readiness);
  }

  async listValidationCycleAvailableActions(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycleAvailableActionsV2Response> {
    const context = await this.options.lineage.getValidationCycleActionContext(
      implementationProjectId,
      validationCycleId,
    );
    if (
      context.implementation_project_id !== implementationProjectId
      || context.validation_cycle_id !== validationCycleId
    ) {
      throw new Error('Lineage service returned a different project/cycle scope.');
    }
    const base = {
      implementation_project_id: context.implementation_project_id,
      validation_cycle_id: context.validation_cycle_id,
      closure: context.closure,
    };
    if (context.closure.closed || !ACTIONABLE_CYCLE_STATES.has(context.lifecycle_status)) {
      return {
        ...base,
        actions: [],
      };
    }

    const readiness = await this.options.readiness.evaluate(validationCycleId);
    if (readiness.validation_cycle_id !== validationCycleId) {
      throw new Error(
        `Readiness evaluator returned a different ValidationCycle: ${readiness.validation_cycle_id}`,
      );
    }

    const projectId = encodePathId(implementationProjectId);
    const cycleId = encodePathId(validationCycleId);
    const admissionActions: PaperImplementationAvailableActionV2[] =
      context.lifecycle_status === 'admitted'
        ? [{
          action_kind: 'admit_work_order_revision',
          method: 'POST',
          path: `/paper-implementation/projects/${projectId}/validation-cycles/${cycleId}/experiment-work-orders/v2/admissions`,
          capability_gated: true,
          required_human_confirmation_scope: 'work_order_admission',
          subject: {},
        }]
        : [];

    const headsMissingSucceededCells = context.effective_heads.filter((head) => {
      const succeededCellIds = new Set(
        head.attempts
          .filter((attempt) => attempt.lifecycle_state === 'succeeded')
          .map((attempt) => attempt.run_cell_id),
      );
      return head.run_cell_ids.some((runCellId) => !succeededCellIds.has(runCellId));
    });
    const simulationActions: PaperImplementationAvailableActionV2[] =
      headsMissingSucceededCells.map((head) => ({
        action_kind: 'start_workflow_simulation',
        method: 'POST',
        path: `/experiment-foundation/v2/runs/${encodePathId(head.run_id)}/workflow-simulations`,
        capability_gated: true,
        required_human_confirmation_scope: null,
        subject: {
          branch_id: head.branch_id,
          run_id: head.run_id,
        },
      }));
    const realProviderActions: PaperImplementationAvailableActionV2[] =
      headsMissingSucceededCells.map((head) => ({
        action_kind: 'start_real_provider_execution',
        method: 'POST',
        path: `/experiment-foundation/v2/runs/${encodePathId(head.run_id)}/real-provider-executions`,
        capability_gated: true,
        required_human_confirmation_scope: null,
        subject: {
          branch_id: head.branch_id,
          run_id: head.run_id,
        },
      }));

    const nonterminalAttempts = context.effective_heads.flatMap((head) => (
      head.attempts
        .filter((attempt) => NONTERMINAL_ATTEMPT_STATES.has(attempt.lifecycle_state))
        .map((attempt) => ({
          ...attempt,
          branch_id: head.branch_id,
          run_id: head.run_id,
        }))
    ));
    const cancelActions: PaperImplementationAvailableActionV2[] =
      nonterminalAttempts.map((attempt) => ({
        action_kind: 'cancel_execution_attempt',
        method: 'POST',
        path: `/experiment-foundation/v2/execution-attempts/${encodePathId(attempt.execution_attempt_id)}/cancel`,
        capability_gated: false,
        required_human_confirmation_scope: null,
        subject: {
          branch_id: attempt.branch_id,
          run_id: attempt.run_id,
          execution_attempt_id: attempt.execution_attempt_id,
        },
      }));
    const reconcileActions: PaperImplementationAvailableActionV2[] =
      nonterminalAttempts
        .filter((attempt) => RECONCILABLE_ATTEMPT_STATES.has(attempt.lifecycle_state))
        .map((attempt) => ({
          action_kind: 'reconcile_execution_attempt',
          method: 'POST',
          path: `/experiment-foundation/v2/execution-attempts/${encodePathId(attempt.execution_attempt_id)}/reconcile`,
          capability_gated: false,
          required_human_confirmation_scope: null,
          subject: {
            branch_id: attempt.branch_id,
            run_id: attempt.run_id,
            execution_attempt_id: attempt.execution_attempt_id,
          },
        }));

    const closurePreparation = preparationFromReadiness(readiness);
    const closureActions: PaperImplementationAvailableActionV2[] =
      closurePreparation.prepared_request === null
        ? []
        : [{
          action_kind: 'close_validation_cycle',
          method: 'POST',
          path: `/paper-implementation/validation-cycles/${cycleId}/closure/v2`,
          capability_gated: true,
          required_human_confirmation_scope: null,
          subject: {},
        }];

    return {
      ...base,
      actions: [
        ...admissionActions,
        ...simulationActions,
        ...realProviderActions,
        ...cancelActions,
        ...reconcileActions,
        ...closureActions,
      ],
    };
  }
}
