import { createHash } from 'node:crypto';

import type {
  CloseValidationCycleV2Request,
  CloseValidationCycleV2Response,
  ScientificDispositionV2,
  ValidationCycleClosedV1,
  ValidationCycleClosureV2,
  ValidationCycleClosureScientificAuthorityV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2CycleClosure,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationStoredValidationCycleClosureV2,
  type PaperImplementationScientificClosureEvidenceAuthorityV1,
  type PaperImplementationValidationCycleClosableStatus,
  type PaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationValidationCycleClosureV2Transaction,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
  PaperImplementationCycleReadinessV2ServiceError,
} from './paper-implementation-cycle-readiness-v2-service.js';

export interface PaperImplementationValidationCycleClosureV2ServiceOptions {
  repository: PaperImplementationValidationCycleClosureV2Repository;
  enabled: () => boolean;
  now?: () => string;
}

type ResolvedCloseValidationCycleV2Request =
  Omit<CloseValidationCycleV2Request, 'validation_cycle_id'>
  & { validation_cycle_id: string };

export class PaperImplementationValidationCycleClosureV2Service {
  private readonly repository: PaperImplementationValidationCycleClosureV2Repository;
  private readonly enabled: () => boolean;
  private readonly now: () => string;

  constructor(options: PaperImplementationValidationCycleClosureV2ServiceOptions) {
    this.repository = options.repository;
    this.enabled = options.enabled;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async close(
    request: CloseValidationCycleV2Request,
    serializationRetry = 0,
  ): Promise<CloseValidationCycleV2Response> {
    if (!this.enabled()) {
      throw closureDisabled('ValidationCycle v2 closure is disabled.');
    }
    if (request.validation_cycle_id === undefined) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'ValidationCycle id must be resolved from the request path.',
        { reason_code: 'V2_TYPED_SNAPSHOT_INVALID' },
      );
    }
    return this.closeResolved({
      ...request,
      validation_cycle_id: request.validation_cycle_id,
    }, serializationRetry);
  }

  private async closeResolved(
    request: ResolvedCloseValidationCycleV2Request,
    serializationRetry: number,
  ): Promise<CloseValidationCycleV2Response> {
    assertCloseRequest(request);

    try {
      return await this.repository.withTransaction((transaction) => (
        this.closeInTransaction(transaction, request)
      ));
    } catch (error) {
      if (error instanceof PaperImplementationCycleReadinessV2ServiceError) {
        if (error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND') {
          throw new AppError(404, 'NOT_FOUND', error.message, {
            reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT',
          });
        }
        throw closureError('CYCLE_CLOSURE_SCOPE_DRIFT', error.message);
      }
      if (!(error instanceof PaperImplementationValidationCycleClosureV2RepositoryError)) {
        throw error;
      }
      if (
        error.reasonCode === 'CYCLE_ALREADY_CLOSED'
        || error.reasonCode === 'CLOSURE_IDEMPOTENCY_CONFLICT'
      ) {
        return this.resolveConcurrentReplay(request);
      }
      if (error.reasonCode === 'CLOSURE_CONCURRENT_CONFLICT') {
        if (serializationRetry < 2) {
          // Closure authority IDs are deterministic, so a transaction aborted
          // by PostgreSQL SSI can safely rebuild the watermark and retry. If a
          // writer won, the rebuilt authority deterministically reports drift.
          return this.close(request, serializationRetry + 1);
        }
        throw closureError(
          'CYCLE_CLOSURE_SCOPE_DRIFT',
          'ValidationCycle closure scope changed during the closure transaction.',
        );
      }
      throw error;
    }
  }

  private async closeInTransaction(
    transaction: PaperImplementationValidationCycleClosureV2Transaction,
    request: ResolvedCloseValidationCycleV2Request,
  ): Promise<CloseValidationCycleV2Response> {
    const readiness = await new PaperImplementationCycleReadinessV2Service({
      repository: transaction,
    }).evaluate(request.validation_cycle_id);

    const existing = await transaction.findStoredClosureByCycle(request.validation_cycle_id);
    if (existing) {
      return replayOrAlreadyClosed(existing, request);
    }
    const idempotencyReplay = await transaction.findStoredClosureByIdempotencyKey(
      request.idempotency_key,
    );
    if (idempotencyReplay) {
      return replayOrAlreadyClosed(idempotencyReplay, request);
    }

    if (
      request.expected_cycle_version !== readiness.watermark.expected_cycle_version
      || request.expected_closure_input_hash !== readiness.watermark.closure_input_hash
    ) {
      throw closureError(
        'CYCLE_CLOSURE_SCOPE_DRIFT',
        'ValidationCycle closure expectation does not match the transactionally rebuilt watermark.',
      );
    }

    const scopeBlocker = readiness.ordered_blockers.find((blocker) => (
      blocker.code === 'BRANCH_HEAD_NOT_FROZEN'
      || blocker.code === 'CYCLE_ACTIVE_REAL_ATTEMPT'
    ));
    if (scopeBlocker) {
      throw closureError(
        scopeBlocker.code,
        scopeBlocker.code === 'BRANCH_HEAD_NOT_FROZEN'
          ? 'Every admitted branch must have its exact frozen and acknowledged current head.'
          : 'A non-terminal real-provider Attempt blocks ValidationCycle closure.',
      );
    }

    if (
      request.closure_kind === 'control_flow_validated_no_paper_evidence'
      && readiness.eligible_run_evidence_unit_count !== 0
    ) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Control-only closure cannot discard eligible scientific evidence; a scientific proposal is required.',
      );
    }

    const cycle = await transaction.findValidationCycle(request.validation_cycle_id);
    if (!cycle) {
      throw new AppError(404, 'NOT_FOUND', 'ValidationCycle does not exist.', {
        reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT',
      });
    }
    if (!isClosableProductCycleStatus(cycle.lifecycle_status)) {
      if (isTerminalProductCycleStatus(cycle.lifecycle_status)) {
        throw closureError(
          'CYCLE_ALREADY_CLOSED',
          'ValidationCycle product row is already terminal.',
        );
      }
      throw closureError(
        'CYCLE_CLOSURE_SCOPE_DRIFT',
        'ValidationCycle product row is not in a closable lifecycle state.',
      );
    }
    const scientificResolution = request.closure_kind === 'scientific_evidence_assessed'
      ? await this.resolveScientificClosure(
        transaction,
        request,
        readiness.watermark.closure_input_hash,
        readiness.watermark.ordered_branches.flatMap((branch) => (
          branch.eligible_run_evidence_unit_refs
        )),
        cycle.implementation_project_id,
      )
      : null;
    const createdAt = this.now();
    const closureId = deterministicId(
      'pi_validation_cycle_closure_v2',
      JSON.stringify({
        validation_cycle_id: request.validation_cycle_id,
        expected_cycle_version: request.expected_cycle_version,
        closure_input_hash: request.expected_closure_input_hash,
        closure_kind: request.closure_kind,
        accepted_proposal_id: request.accepted_proposal_id,
        accepted_proposal_hash: request.expected_proposal_hash,
        idempotency_key: request.idempotency_key,
      }),
    );
    const closureWithoutHash: Omit<ValidationCycleClosureV2, 'closure_snapshot_hash'> = {
      closure_id: closureId,
      schema_version: 'v1',
      validation_cycle_id: request.validation_cycle_id,
      cycle_version_at_closure: readiness.watermark.expected_cycle_version,
      closure_kind: request.closure_kind,
      scientific_disposition: scientificResolution?.scientific_disposition ?? null,
      selected_exit_key: scientificResolution?.selected_exit_key ?? null,
      accepted_proposal_id: request.accepted_proposal_id,
      accepted_proposal_hash: request.expected_proposal_hash,
      scientific_authority: scientificResolution?.scientific_authority ?? null,
      closure_watermark: readiness.watermark,
    };
    const closure: ValidationCycleClosureV2 = {
      ...closureWithoutHash,
      closure_snapshot_hash: serverHashPaperImplementationV2CycleClosure(closureWithoutHash),
    };
    const payload: ValidationCycleClosedV1 = {
      event_schema: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
      validation_cycle_id: closure.validation_cycle_id,
      closure_id: closure.closure_id,
      closure_snapshot_hash: closure.closure_snapshot_hash,
      closure_kind: closure.closure_kind,
      scientific_disposition: closure.scientific_disposition,
      closure_input_hash: closure.closure_watermark.closure_input_hash,
    };
    const event = {
      event_id: deterministicId('pi_validation_cycle_closed_event_v1', closure.closure_id),
      event_type: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
      schema_version: 'v1' as const,
      producer_domain: 'PaperImplementation' as const,
      occurred_at: createdAt,
      correlation_id: closure.closure_id,
      causation_id: closure.closure_watermark.closure_input_hash,
      business_idempotency_key: request.idempotency_key,
      implementation_project_id: cycle.implementation_project_id,
      validation_cycle_id: closure.validation_cycle_id,
      branch_id: `validation-cycle:${closure.validation_cycle_id}`,
      branch_key: 'validation-cycle-closure-v2',
      work_order_revision_id: closure.closure_id,
      work_order_revision_hash: closure.closure_snapshot_hash,
      branch_revision_sequence: closure.cycle_version_at_closure + 1,
      cell_plan_hash: closure.closure_watermark.closure_input_hash,
      approved_plan_hash: closure.closure_snapshot_hash,
      payload_hash: serverHashExperimentV2EventPayload(
        PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
        'v1',
        payload,
      ),
      payload,
    };
    await transaction.completeProductValidationCycle({
      validation_cycle_id: closure.validation_cycle_id,
      expected_lifecycle_status: cycle.lifecycle_status,
      lifecycle_status: 'completed',
      execution_status: 'completed',
      completed_at: createdAt,
    });
    const stored = await transaction.commitClosure({
      stored_closure: {
        implementation_project_id: cycle.implementation_project_id,
        closure,
        idempotency_key: request.idempotency_key,
        created_at: createdAt,
      },
      outbox: {
        outbox_id: deterministicId(
          'pi_validation_cycle_closure_outbox_v2',
          closure.closure_id,
        ),
        aggregate_transition_key: `${closure.closure_id}:closed@v1`,
        event,
        event_envelope_hash: serverHashExperimentV2EventEnvelope(event),
        created_at: createdAt,
      },
    });
    return { closure: stored.closure };
  }

  private async resolveScientificClosure(
    transaction: PaperImplementationValidationCycleClosureV2Transaction,
    request: ResolvedCloseValidationCycleV2Request,
    closureInputHash: string,
    eligibleEvidenceRefs: readonly { run_evidence_unit_id: string; content_hash: string }[],
    implementationProjectId: string,
  ): Promise<{
    scientific_disposition: ScientificDispositionV2;
    selected_exit_key: string;
    scientific_authority: ValidationCycleClosureScientificAuthorityV1;
  }> {
    if (request.accepted_proposal_id === null || request.expected_proposal_hash === null) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Scientific closure requires one exact proposal.', {
        reason_code: 'CLOSURE_PROPOSAL_STALE',
      });
    }
    const admitted = await transaction.findAdmittedScientificClosureProposal(
      request.accepted_proposal_id,
      request.expected_proposal_hash,
    );
    if (
      !admitted
      || admitted.implementation_project_id !== implementationProjectId
      || admitted.proposal.validation_cycle_id !== request.validation_cycle_id
      || admitted.proposal.closure_watermark_hash !== closureInputHash
    ) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Scientific closure proposal is absent, unadmitted, hash-mismatched, or stale.',
      );
    }
    const proposalEvidenceRefs = admitted.proposal.ordered_evidence_refs;
    if (
      proposalEvidenceRefs.length !== eligibleEvidenceRefs.length
      || proposalEvidenceRefs.some((ref, index) => {
        const eligible = eligibleEvidenceRefs[index];
        return ref.ordinal !== index + 1
          || !eligible
          || ref.run_evidence_unit_id !== eligible.run_evidence_unit_id
          || ref.content_hash !== eligible.content_hash;
      })
    ) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Scientific closure proposal does not bind the exact current eligible evidence order.',
      );
    }
    const authorities = await transaction.listScientificClosureEvidenceAuthorities(
      eligibleEvidenceRefs,
    );
    if (
      authorities.length !== eligibleEvidenceRefs.length
      || authorities.some((authority, index) => (
        authority.run_evidence_unit_id !== eligibleEvidenceRefs[index]?.run_evidence_unit_id
        || authority.content_hash !== eligibleEvidenceRefs[index]?.content_hash
      ))
    ) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Scientific evidence authority could not be reread from the exact current REUs.',
      );
    }
    const primaryAuthorities = authorities.flatMap((authority) => (
      authority.primary_facts.map((fact) => ({ authority, fact }))
    ));
    if (primaryAuthorities.length === 0) {
      throw closureError(
        'CLOSURE_PRIMARY_COMPARISON_MISSING',
        'Scientific closure requires exactly one protocol-designated primary comparison fact.',
      );
    }
    if (primaryAuthorities.length !== 1) {
      throw closureError(
        'CLOSURE_PRIMARY_COMPARISON_AMBIGUOUS',
        'Scientific closure found more than one protocol-designated primary comparison fact.',
      );
    }
    const { authority, fact } = primaryAuthorities[0]!;
    const proposedFact = admitted.proposal.primary_comparison_fact_ref;
    if (
      fact.comparison_fact_id !== proposedFact.comparison_fact_id
      || fact.comparison_fact_hash !== proposedFact.comparison_fact_hash
      || fact.comparison_key !== authority.primary_comparison_key
    ) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Scientific closure proposal does not bind the unique current primary comparison fact.',
      );
    }
    const projection = projectScientificDisposition(authority, fact.registered_relation);
    return {
      ...projection,
      scientific_authority: {
        schema_version: 'PaperImplementationValidationCycleScientificAuthority@v1',
        evaluation_protocol_revision_id: authority.evaluation_protocol_revision_id,
        evaluation_protocol_content_hash: authority.evaluation_protocol_content_hash,
        primary_comparison_fact_id: fact.comparison_fact_id,
        primary_comparison_fact_hash: fact.comparison_fact_hash,
        primary_comparison_key: fact.comparison_key,
        registered_relation: fact.registered_relation,
      },
    };
  }

  private async resolveConcurrentReplay(
    request: ResolvedCloseValidationCycleV2Request,
  ): Promise<CloseValidationCycleV2Response> {
    return this.repository.withTransaction(async (transaction) => {
      const stored = await transaction.findStoredClosureByCycle(request.validation_cycle_id)
        ?? await transaction.findStoredClosureByIdempotencyKey(request.idempotency_key);
      if (stored) {
        return replayOrAlreadyClosed(stored, request);
      }
      throw closureError(
        'CYCLE_ALREADY_CLOSED',
        'ValidationCycle closure authority conflicted with another committed closure.',
      );
    });
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

function isClosableProductCycleStatus(
  status: string,
): status is PaperImplementationValidationCycleClosableStatus {
  return status === 'admitted' || status === 'running' || status === 'interpreting';
}

function isTerminalProductCycleStatus(status: string): boolean {
  return status === 'completed' || status === 'aborted' || status === 'superseded';
}

function assertCloseRequest(request: ResolvedCloseValidationCycleV2Request): void {
  if (
    request.closure_kind === 'control_flow_validated_no_paper_evidence'
    && (request.accepted_proposal_id !== null || request.expected_proposal_hash !== null)
  ) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      'Control-only closure requires null proposal identity and hash.',
      { reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT' },
    );
  }
  if (
    request.closure_kind === 'scientific_evidence_assessed'
    && (request.accepted_proposal_id === null || request.expected_proposal_hash === null)
  ) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      'Scientific closure requires one exact admitted proposal identity and hash.',
      { reason_code: 'CLOSURE_PROPOSAL_STALE' },
    );
  }
}

function replayOrAlreadyClosed(
  stored: PaperImplementationStoredValidationCycleClosureV2,
  request: ResolvedCloseValidationCycleV2Request,
): CloseValidationCycleV2Response {
  if (
    stored.closure.validation_cycle_id === request.validation_cycle_id
    && stored.idempotency_key === request.idempotency_key
    && stored.closure.closure_watermark.closure_input_hash
      === request.expected_closure_input_hash
    && stored.closure.closure_kind === request.closure_kind
    && stored.closure.accepted_proposal_id === request.accepted_proposal_id
    && stored.closure.accepted_proposal_hash === request.expected_proposal_hash
  ) {
    return { closure: stored.closure };
  }
  throw closureError(
    'CYCLE_ALREADY_CLOSED',
    'ValidationCycle already has an immutable v2 closure.',
  );
}

function closureDisabled(message: string): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, {
    reason_code: 'PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED',
  });
}

function closureError(
  reasonCode:
    | 'BRANCH_HEAD_NOT_FROZEN'
    | 'CYCLE_ACTIVE_REAL_ATTEMPT'
    | 'CYCLE_CLOSURE_SCOPE_DRIFT'
    | 'CYCLE_ALREADY_CLOSED'
    | 'CLOSURE_PROPOSAL_STALE'
    | 'CLOSURE_PRIMARY_COMPARISON_MISSING'
    | 'CLOSURE_PRIMARY_COMPARISON_AMBIGUOUS',
  message: string,
): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, {
    reason_code: reasonCode,
  });
}

function projectScientificDisposition(
  authority: PaperImplementationScientificClosureEvidenceAuthorityV1,
  relation: PaperImplementationScientificClosureEvidenceAuthorityV1[
    'primary_facts'
  ][number]['registered_relation'],
): { scientific_disposition: ScientificDispositionV2; selected_exit_key: string } {
  switch (relation) {
    case 'supports_registered_expectation':
      return {
        scientific_disposition: 'positive',
        selected_exit_key: authority.decision_if_positive,
      };
    case 'contradicts_registered_expectation':
      return {
        scientific_disposition: 'negative',
        selected_exit_key: authority.decision_if_negative,
      };
    case 'indeterminate':
      return {
        scientific_disposition: 'inconclusive',
        selected_exit_key: authority.decision_if_inconclusive,
      };
  }
}
