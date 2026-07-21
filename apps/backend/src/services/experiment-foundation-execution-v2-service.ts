import { randomUUID } from 'node:crypto';

import type {
  ControlExecutionAttemptV2Request,
  ExecutionAttemptV2,
  ProviderPayloadV2,
  StartWorkflowSimulationV2Request,
  StartWorkflowSimulationV2Response,
  WorkflowSimulationStatusV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import {
  serverHashExperimentFoundationExecutionAttemptEventV2,
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationProviderCommandV2,
  serverHashExperimentFoundationProviderControlV2Semantic,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import { isExecutionAttemptTerminal } from '../repositories/experiment-foundation-execution-v2-invariants.js';
import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationCollectionAttemptV2Record,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2Prerequisite,
  type ExperimentFoundationExecutionV2Repository,
  type ExperimentFoundationExecutionV2RunProjectionFacts,
  type ExperimentFoundationExecutionV2StartOutcome,
  type ExperimentFoundationProviderCommandKindV2,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
import {
  ExperimentFoundationV2ProviderPayloadService,
  type ExperimentFoundationV2HeadAcknowledgementBinding,
} from './experiment-foundation-v2-provider-payload-service.js';
import { createExperimentFoundationExecutionV2Error } from './experiment-foundation-execution-v2-errors.js';
import {
  incrementExperimentV2Int32Counter,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

export interface ExperimentFoundationExecutionV2ReadinessRevalidator {
  revalidateReadiness(input: {
    target: ExperimentFoundationExecutionV2Prerequisite['readiness']['target'];
    readiness_attestation_id: string;
    expected_dependencies: Array<
      ExperimentFoundationExecutionV2Prerequisite['readiness']['ordered_dependencies'][number]['dependency']
    >;
  }): Promise<{
    attestation: {
      status: string;
      attestation_hash: string;
      evaluator_profile_version: string;
      evaluator_profile_hash: string;
      dependency_manifest_hash: string;
    };
  }>;
}

export interface ExperimentFoundationExecutionV2ServiceOptions {
  repository: ExperimentFoundationExecutionV2Repository;
  readinessRevalidator: ExperimentFoundationExecutionV2ReadinessRevalidator;
  intakeEnabled: () => boolean;
  cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  payloadService?: ExperimentFoundationV2ProviderPayloadService;
  now?: () => string;
  idGenerator?: (kind: 'payload' | 'attempt' | 'event' | 'command') => string;
}

export class ExperimentFoundationExecutionV2Service {
  private readonly repository: ExperimentFoundationExecutionV2Repository;
  private readonly readinessRevalidator: ExperimentFoundationExecutionV2ReadinessRevalidator;
  private readonly intakeEnabled: () => boolean;
  private readonly cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  private readonly payloadService: ExperimentFoundationV2ProviderPayloadService;
  private readonly now: () => string;
  private readonly idGenerator: NonNullable<ExperimentFoundationExecutionV2ServiceOptions['idGenerator']>;

  constructor(options: ExperimentFoundationExecutionV2ServiceOptions) {
    this.repository = options.repository;
    this.readinessRevalidator = options.readinessRevalidator;
    this.intakeEnabled = options.intakeEnabled;
    this.cycleClosureLookup = options.cycleClosureLookup;
    this.payloadService = options.payloadService ?? new ExperimentFoundationV2ProviderPayloadService();
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator
      ?? ((kind) => `ef_v2_${kind}_${randomUUID()}`);
  }

  async startWorkflowSimulation(
    runId: string,
    request: StartWorkflowSimulationV2Request,
  ): Promise<StartWorkflowSimulationV2Response> {
    return this.withRepositoryErrorMapping(() =>
      this.startWorkflowSimulationValidated(runId, request));
  }

  private async startWorkflowSimulationValidated(
    runId: string,
    request: StartWorkflowSimulationV2Request,
  ): Promise<StartWorkflowSimulationV2Response> {
    assertId(runId, 'run_id');
    assertId(request.business_idempotency_key, 'business_idempotency_key');
    if (!this.intakeEnabled()) {
      throw errorForReason(
        'EF_V2_WORKFLOW_SIMULATION_DISABLED',
        'Pack B workflow-simulation intake is disabled.',
      );
    }

    const prerequisite = await this.requirePrerequisite(runId);
    if (await this.cycleClosureLookup.isCycleClosed(prerequisite.validation_cycle_id)) {
      throw errorForReason(
        'CYCLE_ALREADY_CLOSED',
        'A closed ValidationCycle cannot create or start another ExecutionAttempt.',
      );
    }
    assertExactPrerequisite(prerequisite);
    assertExactReadinessPrerequisite(prerequisite);
    await this.revalidateExactReadiness(prerequisite);

    const requestHash = serverHashExperimentFoundationProviderControlV2Semantic('ExperimentFoundationWorkflowSimulationRequestV2', {
      business_idempotency_key: request.business_idempotency_key,
      head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
      head_acknowledgement_payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
      readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
    });
    const atomicReplay = await this.repository.findWorkflowSimulationStart(
      runId,
      request.business_idempotency_key,
    );
    if (atomicReplay) {
      assertExactWorkflowReplay(
        atomicReplay,
        prerequisite,
        requestHash,
        request.business_idempotency_key,
      );
      return {
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        business_idempotency_key: request.business_idempotency_key,
        provider_payloads: atomicReplay.payloads.map((payload) =>
          toProviderPayload(payload, this.payloadService)),
        execution_attempts: atomicReplay.attempts.map(toExecutionAttempt),
        replayed: true,
        workflow_simulation_status: await this.deriveStatus(prerequisite),
      };
    }
    const [existingAttempts, existingPayloads] = await Promise.all([
      this.repository.listRunAttempts(runId),
      this.repository.listRunPayloads(runId),
    ]);
    const existingPayloadByMaterializationKey = new Map(
      existingPayloads.map((payload) => [payload.materialization_key, payload]),
    );
    const factsIndex = indexExecutionFacts({
      attempts: existingAttempts,
      events: [],
      collections: [],
    });
    const cellsToAttempt = selectExactAttemptCells(prerequisite, factsIndex);
    const now = this.now();
    const payloads: ExperimentFoundationProviderPayloadV2Record[] = [];
    const attempts: ExperimentFoundationExecutionAttemptV2Record[] = [];
    const events: ExperimentFoundationExecutionAttemptEventV2Record[] = [];
    const commands: ExperimentFoundationProviderCommandV2Record[] = [];

    for (const cell of [...cellsToAttempt].sort(
      (left, right) => left.run_cell.ordinal - right.run_cell.ordinal,
    )) {
      const priorCellAttempts = factsIndex.attemptsByCell.get(
        cell.run_cell.run_cell_id,
      ) ?? EMPTY_ATTEMPTS;
      const attemptSequence = nextExperimentV2Int32Sequence(
        priorCellAttempts.map((attempt) => attempt.attempt_sequence),
        'Execution Attempt sequence',
        stateConflict,
      );
      if (attemptSequence > cell.retry_ceiling) {
        throw errorForReason(
          'EXECUTION_ATTEMPT_LIMIT_EXHAUSTED',
          `Attempt ceiling is exhausted for run cell ${cell.run_cell.cell_key}.`,
        );
      }

      const materialized = this.payloadService.materialize({
        run: prerequisite.run,
        run_cell: cell.run_cell,
        task_spec: cell.task_spec,
        head_acknowledgement: acknowledgementBinding(prerequisite),
      });
      const existingPayload = existingPayloadByMaterializationKey.get(
        materialized.record.materialization_key,
      );
      if (
        existingPayload
        && serverHashExperimentFoundationProviderControlV2Semantic('ExperimentFoundationProviderPayloadV2Replay', {
          ...existingPayload,
          id: null,
          created_at: null,
        }) !== serverHashExperimentFoundationProviderControlV2Semantic('ExperimentFoundationProviderPayloadV2Replay', {
          ...materialized.record,
          id: null,
          created_at: null,
        })
      ) {
        throw errorForReason(
          'PROVIDER_PAYLOAD_CONFLICT',
          'Provider payload materialization identity has changed content.',
        );
      }
      const payloadId = existingPayload?.id ?? this.idGenerator('payload');
      const attemptId = this.idGenerator('attempt');
      const eventId = this.idGenerator('event');
      const commandId = this.idGenerator('command');
      const payload: ExperimentFoundationProviderPayloadV2Record = existingPayload ?? {
        id: payloadId,
        ...materialized.record,
        created_at: now,
      };
      const providerIdempotencyKey = `${attemptId}:submit:1`;
      const attempt: ExperimentFoundationExecutionAttemptV2Record = {
        id: attemptId,
        implementation_project_id: prerequisite.implementation_project_id,
        validation_cycle_id: prerequisite.validation_cycle_id,
        external_pi_branch_id: prerequisite.external_pi_branch_id,
        external_pi_work_order_revision_id:
          prerequisite.run.external_pi_work_order_revision_id,
        external_pi_work_order_revision_hash:
          prerequisite.run.external_pi_work_order_revision_hash,
        external_pi_revision_sequence:
          prerequisite.run.external_pi_branch_revision_sequence,
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: cell.run_cell.run_cell_id,
        cell_key: cell.run_cell.cell_key,
        training_task_spec_id: cell.task_spec.training_task_spec_id,
        training_task_spec_hash: cell.task_spec.task_spec_hash,
        provider_payload_id: payload.id,
        provider_payload_hash: payload.payload_hash,
        head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        attempt_sequence: attemptSequence,
        workflow_business_key: request.business_idempotency_key,
        workflow_request_hash: requestHash,
        execution_mode: 'simulation',
        provenance: 'non_production_fake_provider',
        provider_idempotency_key: providerIdempotencyKey,
        lifecycle_state: 'prepared',
        state_version: 0,
        external_job_ref: null,
        external_job_ref_hash: null,
        terminal_reason_code: null,
        created_at: now,
        updated_at: now,
        terminal_at: null,
      };
      const event = createExecutionAttemptEventV2Record({
        id: eventId,
        attempt,
        sequence: 1,
        eventType: 'created',
        priorState: null,
        nextState: 'prepared',
        commandId: null,
        reasonCode: null,
        observedProviderState: null,
        occurredAt: now,
      });
      const command = createProviderCommandV2Record({
        id: commandId,
        attempt,
        sequence: 1,
        operation: 'submit',
        providerIdempotencyKey,
        externalJobRef: null,
        collectionAttemptId: null,
        cancellationReason: null,
        now,
      });
      payloads.push(payload);
      attempts.push(attempt);
      events.push(event);
      commands.push(command);
    }

    const outcome = await this.repository.startWorkflowSimulation({
      run_id: runId,
      business_idempotency_key: request.business_idempotency_key,
      request_hash: requestHash,
      expected_run_manifest_hash: prerequisite.run.run_manifest_hash,
      expected_head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
      expected_head_acknowledgement_payload_hash:
        prerequisite.head_acknowledgement.event_payload_hash,
      expected_readiness_attestation_id:
        prerequisite.readiness.readiness_attestation_id,
      expected_readiness_attestation_hash:
        prerequisite.readiness.readiness_attestation_hash,
      payloads,
      attempts,
      events,
      commands,
    });
    const status = await this.deriveStatus(outcome.prerequisite);
    return {
      run_id: outcome.prerequisite.run.run_id,
      run_manifest_hash: outcome.prerequisite.run.run_manifest_hash,
      business_idempotency_key: request.business_idempotency_key,
      provider_payloads: outcome.payloads.map((payload) =>
        toProviderPayload(payload, this.payloadService)),
      execution_attempts: outcome.attempts.map(toExecutionAttempt),
      replayed: outcome.replayed,
      workflow_simulation_status: status,
    };
  }

  async cancelExecutionAttempt(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2> {
    return this.withRepositoryErrorMapping(() =>
      this.cancelExecutionAttemptValidated(attemptId, request));
  }

  private async cancelExecutionAttemptValidated(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2> {
    assertId(attemptId, 'attempt_id');
    assertId(request.business_idempotency_key, 'business_idempotency_key');
    const reasonCode = request.reason_code ?? 'operator_cancelled';
    if (reasonCode !== 'operator_cancelled') {
      throw errorForReason(
        'PROVIDER_PAYLOAD_INVALID',
        'Cancel requires reason_code=operator_cancelled.',
      );
    }
    const attempt = await this.requireAttempt(attemptId);
    const replayProviderKey = `${attempt.id}:cancel:${request.business_idempotency_key}`;
    const replayCommands = await this.repository.listAttemptCommands(attempt.id);
    const replayCommand = replayCommands.find(
      (command) => command.provider_idempotency_key === replayProviderKey,
    );
    if (replayCommand) {
      return toExecutionAttempt(attempt);
    }
    if (attempt.lifecycle_state === 'cancelled') {
      throw stateConflict('Cancelled Attempt control used a different business key.');
    }
    if (attempt.lifecycle_state === 'succeeded' || attempt.lifecycle_state === 'failed') {
      throw stateConflict('A terminal execution attempt cannot be cancelled.');
    }
    const now = this.now();
    const commands = await this.repository.listAttemptCommands(attemptId);
    const events = await this.repository.listAttemptEvents(attemptId);
    if (attempt.lifecycle_state === 'prepared') {
      const submit = commands.find((command) => command.operation === 'submit');
      if (submit?.state !== 'pending' && submit?.state !== 'claimed') {
        throw stateConflict(
          'Prepared Attempt does not have a pending or leased submit command to cancel.',
        );
      }
    }
    const nextState = attempt.lifecycle_state === 'prepared' ? 'cancelled' : attempt.lifecycle_state;
    const nextAttempt: ExperimentFoundationExecutionAttemptV2Record | undefined =
      nextState === 'cancelled'
      ? {
        ...attempt,
        lifecycle_state: 'cancelled' as const,
        state_version: incrementExperimentV2Int32Counter(
          attempt.state_version,
          'Execution Attempt state version',
          stateConflict,
        ),
        terminal_reason_code: 'operator_cancelled' as const,
        updated_at: now,
        terminal_at: now,
      }
      : undefined;
    const providerIdempotencyKey = replayProviderKey;
    const command = createProviderCommandV2Record({
      id: this.idGenerator('command'),
      attempt,
      sequence: nextExperimentV2Int32Sequence(
        commands.map((candidate) => candidate.command_sequence),
        'Provider command sequence',
        stateConflict,
      ),
      operation: 'cancel',
      providerIdempotencyKey,
      externalJobRef: attempt.external_job_ref,
      collectionAttemptId: null,
      cancellationReason: reasonCode,
      now,
    });
    const event = nextAttempt
      ? createExecutionAttemptEventV2Record({
        id: this.idGenerator('event'),
        attempt: nextAttempt,
        sequence: nextExperimentV2Int32Sequence(
          events.map((candidate) => candidate.event_sequence),
          'Execution Attempt event sequence',
          stateConflict,
        ),
        eventType: 'cancelled',
        priorState: attempt.lifecycle_state,
        nextState: 'cancelled',
        commandId: command.id,
        reasonCode,
        observedProviderState: null,
        occurredAt: now,
      })
      : undefined;
    await this.repository.enqueueControlCommand({
      attempt_id: attempt.id,
      expected_attempt_state_version: attempt.state_version,
      command,
      event,
      next_attempt: nextAttempt,
    });
    // Repository authority decides whether this is a zero-transport
    // pre-submit cancellation (pending submit) or a durable asynchronous
    // cancel intent (submit already leased). Re-read the authoritative row
    // so a claim/enqueue race cannot return a state that did not commit.
    const authoritative = await this.repository.findAttempt(attempt.id);
    if (!authoritative) {
      throw errorForReason(
        'EXECUTION_SCOPE_DRIFT',
        'Execution Attempt disappeared after cancel enqueue.',
      );
    }
    return toExecutionAttempt(authoritative);
  }

  async reconcileExecutionAttempt(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2> {
    return this.withRepositoryErrorMapping(() =>
      this.reconcileExecutionAttemptValidated(attemptId, request));
  }

  private async reconcileExecutionAttemptValidated(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2> {
    assertId(attemptId, 'attempt_id');
    assertId(request.business_idempotency_key, 'business_idempotency_key');
    const reasonCode = request.reason_code ?? 'manual_reconcile';
    if (reasonCode !== 'manual_reconcile') {
      throw errorForReason(
        'PROVIDER_PAYLOAD_INVALID',
        'Reconcile requires reason_code=manual_reconcile.',
      );
    }
    const attempt = await this.requireAttempt(attemptId);
    const providerIdempotencyKey =
      `${attempt.id}:reconcile:${request.business_idempotency_key}`;
    const replayCommands = await this.repository.listAttemptCommands(attempt.id);
    const replayCommand = replayCommands.find(
      (command) => command.provider_idempotency_key === providerIdempotencyKey,
    );
    if (replayCommand) {
      return toExecutionAttempt(attempt);
    }
    if (!['submitted', 'running'].includes(attempt.lifecycle_state)) {
      throw stateConflict('Only submitted or running attempts can be reconciled.');
    }
    const commands = await this.repository.listAttemptCommands(attemptId);
    const now = this.now();
    const command = createProviderCommandV2Record({
      id: this.idGenerator('command'),
      attempt,
      sequence: nextExperimentV2Int32Sequence(
        commands.map((candidate) => candidate.command_sequence),
        'Provider command sequence',
        stateConflict,
      ),
      operation: 'reconcile',
      providerIdempotencyKey,
      externalJobRef: attempt.external_job_ref,
      collectionAttemptId: null,
      cancellationReason: null,
      now,
    });
    await this.repository.enqueueControlCommand({
      attempt_id: attempt.id,
      expected_attempt_state_version: attempt.state_version,
      command,
    });
    return toExecutionAttempt(attempt);
  }

  async getExecutionAttempt(attemptId: string): Promise<ExecutionAttemptV2> {
    return this.withRepositoryErrorMapping(() =>
      this.getExecutionAttemptValidated(attemptId));
  }

  private async getExecutionAttemptValidated(attemptId: string): Promise<ExecutionAttemptV2> {
    assertId(attemptId, 'attempt_id');
    return toExecutionAttempt(await this.requireAttempt(attemptId));
  }

  async getWorkflowSimulationStatus(runId: string): Promise<WorkflowSimulationStatusV2> {
    return this.withRepositoryErrorMapping(() =>
      this.getWorkflowSimulationStatusValidated(runId));
  }

  private async getWorkflowSimulationStatusValidated(
    runId: string,
  ): Promise<WorkflowSimulationStatusV2> {
    assertId(runId, 'run_id');
    const prerequisite = await this.requirePrerequisite(runId);
    return this.deriveStatus(prerequisite);
  }

  private async requirePrerequisite(
    runId: string,
  ): Promise<ExperimentFoundationExecutionV2Prerequisite> {
    const prerequisite = await this.repository.resolveRunPrerequisite(runId);
    if (!prerequisite) {
      throw errorForReason('EXECUTION_HEAD_ACK_REQUIRED', 'Run is not executable.');
    }
    return prerequisite;
  }

  private async requireAttempt(
    attemptId: string,
  ): Promise<ExperimentFoundationExecutionAttemptV2Record> {
    const attempt = await this.repository.findAttempt(attemptId);
    if (!attempt) {
      throw errorForReason('EXECUTION_ATTEMPT_NOT_FOUND', 'Execution attempt was not found.');
    }
    return attempt;
  }

  private async revalidateExactReadiness(
    prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  ): Promise<void> {
    let result;
    try {
      result = await this.readinessRevalidator.revalidateReadiness({
        target: prerequisite.readiness.target,
        readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
        expected_dependencies: prerequisite.readiness.ordered_dependencies.map(
          (row) => row.dependency,
        ),
      });
    } catch {
      throw errorForReason(
        'EXECUTION_READINESS_DRIFT',
        'Exact execution readiness no longer passes.',
      );
    }
    const attestation = result.attestation;
    if (
      attestation.status !== 'passed'
      || attestation.attestation_hash !== prerequisite.readiness.readiness_attestation_hash
      || attestation.evaluator_profile_version !== prerequisite.readiness.evaluator_profile_version
      || attestation.evaluator_profile_hash !== prerequisite.readiness.evaluator_profile_hash
      || attestation.dependency_manifest_hash !== prerequisite.readiness.dependency_manifest_hash
    ) {
      throw errorForReason(
        'EXECUTION_READINESS_DRIFT',
        'Exact execution readiness identity has drifted.',
      );
    }
  }

  private async deriveStatus(
    prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  ): Promise<WorkflowSimulationStatusV2> {
    const facts = await this.repository.readRunProjectionFacts(prerequisite.run.run_id);
    const factsIndex = indexExecutionFacts(facts);
    const cells = [];
    let terminalCellCount = 0;
    let collectedCellCount = 0;
    let hasFailure = false;
    let hasBlocked = false;

    for (const cell of orderedPrerequisiteCells(prerequisite)) {
      const latest = factsIndex.attemptsByCell
        .get(cell.run_cell.run_cell_id)?.at(0) ?? null;
      const collections = latest
        ? factsIndex.collectionsByAttempt.get(latest.id) ?? EMPTY_COLLECTIONS
        : EMPTY_COLLECTIONS;
      const latestCollection = collections
        .at(0) ?? null;
      if (collections.length > 1) {
        throw errorForReason(
          'EXECUTION_SCOPE_DRIFT',
          'Execution Attempt has more than one CollectionAttempt.',
        );
      }
      const latestEvents = latest
        ? factsIndex.eventsByAttempt.get(latest.id) ?? EMPTY_EVENTS
        : EMPTY_EVENTS;
      const projectedState = latestEvents.at(-1)?.next_state ?? null;
      if (latest && projectedState !== latest.lifecycle_state) {
        throw errorForReason(
          'EXECUTION_SCOPE_DRIFT',
          'Attempt row does not match its immutable event projection.',
        );
      }
      if (projectedState && isExecutionAttemptTerminal(projectedState)) {
        terminalCellCount += 1;
      }
      if (latestCollection?.collection_state === 'collected') {
        collectedCellCount += 1;
      }
      if (projectedState === 'failed' || latestCollection?.collection_state === 'failed') {
        hasFailure = true;
      }
      if (
        projectedState === 'cancelled'
      ) {
        hasBlocked = true;
      }
      cells.push({
        run_cell_id: cell.run_cell.run_cell_id,
        cell_key: cell.run_cell.cell_key,
        latest_execution_attempt_id: latest?.id ?? null,
        latest_attempt_state: projectedState,
        latest_collection_state: latestCollection?.collection_state ?? null,
      });
    }

    const requiredCellCount = prerequisite.cells.length;
    const workflowStatus = factsIndex.attemptCount === 0
      ? 'not_started'
      : hasFailure
        ? 'workflow_simulation_failed'
        : hasBlocked
          ? 'workflow_simulation_blocked'
          : collectedCellCount === requiredCellCount
            && cells.every((cell) => cell.latest_attempt_state === 'succeeded')
            ? 'workflow_simulation_passed'
            : 'in_progress';
    return {
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      workflow_simulation_status: workflowStatus,
      required_cell_count: requiredCellCount,
      terminal_cell_count: terminalCellCount,
      collected_cell_count: collectedCellCount,
      cells,
      scientific_execution_status: 'not_started',
      evidence_eligibility: false,
      derived_at: this.now(),
    };
  }

  private async withRepositoryErrorMapping<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw mapRepositoryError(error);
    }
  }
}

interface ExperimentFoundationExecutionFactsIndex {
  attemptCount: number;
  attemptsByCell: Map<string, ExperimentFoundationExecutionAttemptV2Record[]>;
  eventsByAttempt: Map<string, ExperimentFoundationExecutionAttemptEventV2Record[]>;
  collectionsByAttempt: Map<string, ExperimentFoundationCollectionAttemptV2Record[]>;
}

const EMPTY_ATTEMPTS: ExperimentFoundationExecutionAttemptV2Record[] = [];
const EMPTY_EVENTS: ExperimentFoundationExecutionAttemptEventV2Record[] = [];
const EMPTY_COLLECTIONS: ExperimentFoundationCollectionAttemptV2Record[] = [];

function indexExecutionFacts(
  facts: ExperimentFoundationExecutionV2RunProjectionFacts,
): ExperimentFoundationExecutionFactsIndex {
  const attemptsByCell = new Map<string, ExperimentFoundationExecutionAttemptV2Record[]>();
  const eventsByAttempt = new Map<string, ExperimentFoundationExecutionAttemptEventV2Record[]>();
  const collectionsByAttempt = new Map<
    string,
    ExperimentFoundationCollectionAttemptV2Record[]
  >();

  for (const attempt of facts.attempts) {
    appendIndexed(attemptsByCell, attempt.run_cell_id, attempt);
  }
  for (const event of facts.events) {
    appendIndexed(eventsByAttempt, event.execution_attempt_id, event);
  }
  for (const collection of facts.collections) {
    appendIndexed(collectionsByAttempt, collection.execution_attempt_id, collection);
  }
  for (const attempts of attemptsByCell.values()) {
    attempts.sort((left, right) => right.attempt_sequence - left.attempt_sequence);
  }
  for (const events of eventsByAttempt.values()) {
    events.sort((left, right) => left.event_sequence - right.event_sequence);
  }

  return {
    attemptCount: facts.attempts.length,
    attemptsByCell,
    eventsByAttempt,
    collectionsByAttempt,
  };
}

function appendIndexed<T>(index: Map<string, T[]>, key: string, value: T): void {
  const rows = index.get(key);
  if (rows) {
    rows.push(value);
    return;
  }
  index.set(key, [value]);
}

function orderedPrerequisiteCells(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
): ExperimentFoundationExecutionV2Prerequisite['cells'] {
  return [...prerequisite.cells].sort(
    (left, right) => left.run_cell.ordinal - right.run_cell.ordinal,
  );
}

function selectExactAttemptCells(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  factsIndex: ExperimentFoundationExecutionFactsIndex,
): ExperimentFoundationExecutionV2Prerequisite['cells'] {
  const orderedCells = orderedPrerequisiteCells(prerequisite);
  if (factsIndex.attemptCount === 0) {
    return orderedCells;
  }
  const requiredIds = new Set(orderedCells.map((cell) => cell.run_cell.run_cell_id));
  if ([...factsIndex.attemptsByCell.keys()].some((cellId) => !requiredIds.has(cellId))) {
    throw errorForReason(
      'EXECUTION_SCOPE_DRIFT',
      'Attempt lineage contains a cell outside the exact Run manifest.',
    );
  }
  const retryCells = [];
  for (const cell of orderedCells) {
    const cellAttempts = factsIndex.attemptsByCell.get(cell.run_cell.run_cell_id)
      ?? EMPTY_ATTEMPTS;
    const sequenceSet = new Set(cellAttempts.map((attempt) => attempt.attempt_sequence));
    const contiguous = cellAttempts.every(
      (attempt, index) => attempt.attempt_sequence === cellAttempts.length - index,
    );
    if (
      cellAttempts.length === 0
      || sequenceSet.size !== cellAttempts.length
      || !contiguous
    ) {
      throw errorForReason(
        'EXECUTION_SCOPE_DRIFT',
        'Retry lineage is missing or duplicates a required cell Attempt.',
      );
    }
    const latest = cellAttempts[0];
    if (!['succeeded', 'failed', 'cancelled'].includes(latest.lifecycle_state)) {
      throw stateConflict('A nonterminal latest Attempt blocks a new workflow start.');
    }
    if (latest.lifecycle_state === 'succeeded') {
      continue;
    }
    if (latest.attempt_sequence >= cell.retry_ceiling) {
      throw errorForReason(
        'EXECUTION_ATTEMPT_LIMIT_EXHAUSTED',
        `Attempt ceiling is exhausted for run cell ${cell.run_cell.cell_key}.`,
      );
    }
    retryCells.push(cell);
  }
  if (retryCells.length === 0) {
    throw stateConflict('All required Run cells already succeeded.');
  }
  return retryCells;
}

function assertExactWorkflowReplay(
  outcome: ExperimentFoundationExecutionV2StartOutcome,
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  requestHash: string,
  businessKey: string,
): void {
  const cellById = new Map(
    prerequisite.cells.map((cell) => [cell.run_cell.run_cell_id, cell]),
  );
  const replayCellIds = outcome.attempts.map((attempt) => attempt.run_cell_id);
  const uniqueCellIds = new Set(replayCellIds);
  const payloadById = new Map(outcome.payloads.map((payload) => [payload.id, payload]));
  if (
    !outcome.replayed
    || outcome.attempts.length === 0
    || uniqueCellIds.size !== replayCellIds.length
    || outcome.payloads.length !== outcome.attempts.length
    || outcome.events.length !== outcome.attempts.length
    || outcome.commands.length !== outcome.attempts.length
    || outcome.prerequisite.run.run_id !== prerequisite.run.run_id
    || outcome.prerequisite.run.run_manifest_hash !== prerequisite.run.run_manifest_hash
    || outcome.prerequisite.head_acknowledgement.inbox_id
      !== prerequisite.head_acknowledgement.inbox_id
    || outcome.prerequisite.head_acknowledgement.event_payload_hash
      !== prerequisite.head_acknowledgement.event_payload_hash
  ) {
    throw errorForReason(
      'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
      'Committed workflow replay receipt is incomplete or has drifted.',
    );
  }
  const eventAttempts = new Set(
    outcome.events.map((event) => event.execution_attempt_id),
  );
  const commandAttempts = new Set(
    outcome.commands.map((command) => command.execution_attempt_id),
  );
  for (const attempt of outcome.attempts) {
    const cell = cellById.get(attempt.run_cell_id);
    const payload = payloadById.get(attempt.provider_payload_id);
    if (
      !cell
      || !payload
      || attempt.workflow_business_key !== businessKey
      || attempt.workflow_request_hash !== requestHash
      || attempt.implementation_project_id !== prerequisite.implementation_project_id
      || attempt.validation_cycle_id !== prerequisite.validation_cycle_id
      || attempt.external_pi_branch_id !== prerequisite.external_pi_branch_id
      || attempt.external_pi_work_order_revision_id
        !== prerequisite.run.external_pi_work_order_revision_id
      || attempt.external_pi_work_order_revision_hash
        !== prerequisite.run.external_pi_work_order_revision_hash
      || attempt.external_pi_revision_sequence
        !== prerequisite.run.external_pi_branch_revision_sequence
      || attempt.run_manifest_hash !== prerequisite.run.run_manifest_hash
      || attempt.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || attempt.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || attempt.head_acknowledgement_inbox_id
        !== prerequisite.head_acknowledgement.inbox_id
      || attempt.execution_mode !== 'simulation'
      || attempt.provenance !== 'non_production_fake_provider'
      || payload.run_id !== prerequisite.run.run_id
      || payload.run_manifest_hash !== prerequisite.run.run_manifest_hash
      || payload.run_cell_id !== cell.run_cell.run_cell_id
      || payload.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || payload.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || payload.payload_hash !== attempt.provider_payload_hash
      || payload.execution_mode !== 'simulation'
      || payload.provenance !== 'non_production_fake_provider'
      || !eventAttempts.has(attempt.id)
      || !commandAttempts.has(attempt.id)
    ) {
      throw errorForReason(
        'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
        'Committed workflow replay exact scope has drifted.',
      );
    }
  }
}

function acknowledgementBinding(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
): ExperimentFoundationV2HeadAcknowledgementBinding {
  return {
    inbox_id: prerequisite.head_acknowledgement.inbox_id,
    source_event_id: prerequisite.head_acknowledgement.event_id,
    run_id: prerequisite.head_acknowledgement.run_id,
    run_manifest_hash: prerequisite.head_acknowledgement.run_manifest_hash,
    payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
    processed_at: prerequisite.head_acknowledgement.processed_at,
  };
}

export function createExecutionAttemptEventV2Record(input: {
  id: string;
  attempt: ExperimentFoundationExecutionAttemptV2Record;
  sequence: number;
  eventType: ExperimentFoundationExecutionAttemptEventV2Record['event_type'];
  priorState: ExperimentFoundationExecutionAttemptV2Record['lifecycle_state'] | null;
  nextState: ExperimentFoundationExecutionAttemptV2Record['lifecycle_state'];
  commandId: string | null;
  reasonCode: string | null;
  observedProviderState: string | null;
  occurredAt: string;
}): ExperimentFoundationExecutionAttemptEventV2Record {
  const snapshot = {
    snapshot_schema_version: 'v1',
    reason_code: input.reasonCode,
    observed_provider_state: input.observedProviderState,
    note: null,
  };
  const content = {
    execution_attempt_id: input.attempt.id,
    event_sequence: input.sequence,
    event_type: input.eventType,
    prior_state: input.priorState,
    next_state: input.nextState,
    provider_command_id: input.commandId,
    payload_hash: input.attempt.provider_payload_hash,
    external_job_ref: input.attempt.external_job_ref,
    external_job_ref_hash: input.attempt.external_job_ref_hash,
    event_snapshot: snapshot,
    occurred_at: input.occurredAt,
  };
  return {
    id: input.id,
    ...content,
    event_hash: serverHashExperimentFoundationExecutionAttemptEventV2(content),
  };
}

export function createProviderCommandV2Record(input: {
  id: string;
  attempt: ExperimentFoundationExecutionAttemptV2Record;
  sequence: number;
  operation: ExperimentFoundationProviderCommandKindV2;
  providerIdempotencyKey: string;
  externalJobRef: string | null;
  collectionAttemptId: string | null;
  cancellationReason: string | null;
  now: string;
}): ExperimentFoundationProviderCommandV2Record {
  if (
    (input.operation === 'cancel' && input.cancellationReason !== 'operator_cancelled')
    || (input.operation !== 'cancel' && input.cancellationReason !== null)
  ) {
    throw errorForReason(
      'PROVIDER_RESPONSE_INVALID',
      'Cancel commands require cancellation_reason=operator_cancelled; every other operation forbids it.',
    );
  }
  const commandSnapshot = {
    command_schema_version: 'v1',
    operation: input.operation,
    provider_payload_id: input.attempt.provider_payload_id,
    provider_payload_hash: input.attempt.provider_payload_hash,
    external_job_ref: input.externalJobRef === null
      ? null
      : {
        ref_type: 'fake_aliyun_pai_dlc_job',
        ref_id: input.externalJobRef,
      },
    cancellation_reason: input.cancellationReason,
  };
  return {
    id: input.id,
    execution_attempt_id: input.attempt.id,
    collection_attempt_id: input.collectionAttemptId,
    command_sequence: input.sequence,
    operation: input.operation,
    command_snapshot: commandSnapshot,
    command_hash: serverHashExperimentFoundationProviderCommandV2({
      provider_idempotency_key: input.providerIdempotencyKey,
      command_snapshot: commandSnapshot,
    }),
    provider_idempotency_key: input.providerIdempotencyKey,
    payload_hash: input.attempt.provider_payload_hash,
    external_job_ref: input.externalJobRef,
    external_job_ref_hash: input.externalJobRef
      ? serverHashExperimentFoundationExternalJobRefV2(input.externalJobRef)
      : null,
    state: 'pending',
    lease_version: 0,
    lease_owner: null,
    lease_expires_at: null,
    last_heartbeat_at: null,
    attempt_count: 0,
    next_attempt_at: input.now,
    response_hash: null,
    last_error_code: null,
    created_at: input.now,
    updated_at: input.now,
    completed_at: null,
  };
}

function toProviderPayload(
  record: ExperimentFoundationProviderPayloadV2Record,
  payloadService: ExperimentFoundationV2ProviderPayloadService,
): ProviderPayloadV2 {
  const persisted = payloadService.toPersistenceRecord(record);
  return {
    provider_payload_id: record.id,
    materialization_key: record.materialization_key,
    run_id: record.run_id,
    run_manifest_hash: record.run_manifest_hash,
    run_cell_id: record.run_cell_id,
    cell_key: record.cell_key,
    training_task_spec_id: record.training_task_spec_id,
    training_task_spec_hash: record.training_task_spec_hash,
    payload_schema: record.payload_schema,
    adapter_identity: record.adapter_identity,
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    simulation_profile_version: record.simulation_profile_version,
    redacted_manifest: persisted.redacted_manifest,
    payload_hash: record.payload_hash,
    payload_byte_size: record.payload_byte_size,
    created_at: record.created_at,
  };
}

function toExecutionAttempt(record: ExperimentFoundationExecutionAttemptV2Record): ExecutionAttemptV2 {
  if (
    record.execution_mode !== 'simulation'
    || record.provenance !== 'non_production_fake_provider'
  ) {
    throw errorForReason(
      'EXECUTION_SCOPE_DRIFT',
      'Pack B cannot expose a real-provider Attempt as workflow simulation.',
    );
  }
  return {
    execution_attempt_id: record.id,
    external_pi_implementation_project_id: record.implementation_project_id,
    external_pi_validation_cycle_id: record.validation_cycle_id,
    external_pi_branch_id: record.external_pi_branch_id,
    external_pi_work_order_revision_id: record.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: record.external_pi_work_order_revision_hash,
    external_pi_revision_sequence: record.external_pi_revision_sequence,
    run_id: record.run_id,
    run_manifest_hash: record.run_manifest_hash,
    run_cell_id: record.run_cell_id,
    cell_key: record.cell_key,
    training_task_spec_id: record.training_task_spec_id,
    training_task_spec_hash: record.training_task_spec_hash,
    provider_payload_id: record.provider_payload_id,
    provider_payload_hash: record.provider_payload_hash,
    head_acknowledgement_inbox_id: record.head_acknowledgement_inbox_id,
    attempt_sequence: record.attempt_sequence,
    workflow_business_key: record.workflow_business_key,
    workflow_request_hash: record.workflow_request_hash,
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    provider_idempotency_key: record.provider_idempotency_key,
    lifecycle_state: record.lifecycle_state,
    state_version: record.state_version,
    terminal_reason_code: record.terminal_reason_code,
    external_job_ref: record.external_job_ref
      ? { ref_type: 'fake_aliyun_pai_dlc_job', ref_id: record.external_job_ref }
      : null,
    external_job_ref_hash: record.external_job_ref_hash,
    created_at: record.created_at,
    updated_at: record.updated_at,
    terminal_at: record.terminal_at,
  };
}

function assertExactPrerequisite(prerequisite: ExperimentFoundationExecutionV2Prerequisite): void {
  const run = prerequisite.run;
  const acknowledgement = prerequisite.head_acknowledgement;
  const latest = prerequisite.latest_branch_head_acknowledgement;
  const acknowledgementFields: Array<keyof typeof acknowledgement> = [
    'inbox_id',
    'event_id',
    'event_payload_hash',
    'implementation_project_id',
    'validation_cycle_id',
    'branch_id',
    'work_order_revision_id',
    'work_order_revision_hash',
    'revision_sequence',
    'run_id',
    'run_manifest_hash',
    'processed_at',
  ];
  if (
    prerequisite.cells.length !== run.cell_count
    || acknowledgement.implementation_project_id
      !== prerequisite.implementation_project_id
    || acknowledgement.validation_cycle_id !== prerequisite.validation_cycle_id
    || acknowledgement.branch_id !== prerequisite.external_pi_branch_id
    || acknowledgement.run_id !== run.run_id
    || acknowledgement.run_manifest_hash !== run.run_manifest_hash
    || acknowledgement.work_order_revision_id !== run.external_pi_work_order_revision_id
    || acknowledgement.work_order_revision_hash !== run.external_pi_work_order_revision_hash
    || acknowledgement.revision_sequence !== run.external_pi_branch_revision_sequence
    || acknowledgementFields.some(
      (field) => latest[field] !== acknowledgement[field],
    )
  ) {
    throw errorForReason(
      'EXECUTION_RUN_NOT_CURRENT_HEAD',
      'Run is not the exact acknowledged current branch head.',
    );
  }
  const ordered = orderedPrerequisiteCells(prerequisite);
  for (let index = 0; index < ordered.length; index += 1) {
    const cell = ordered[index];
    if (
      cell.run_cell.ordinal !== index + 1
      || cell.run_cell.run_id !== run.run_id
      || cell.run_cell.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || cell.run_cell.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || cell.task_spec.external_pi_work_order_revision_id
        !== run.external_pi_work_order_revision_id
      || cell.task_spec.external_pi_work_order_revision_hash
        !== run.external_pi_work_order_revision_hash
      || cell.task_spec.run_recipe_id !== prerequisite.run_recipe_id
      || cell.retry_ceiling !== cell.task_spec.retry_snapshot.max_attempts
    ) {
      throw errorForReason(
        'EXECUTION_SCOPE_DRIFT',
        'Run cell and TaskSpec bindings are not exact.',
      );
    }
  }
}

function assertExactReadinessPrerequisite(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
): void {
  if (
    prerequisite.readiness.outcome !== 'passed'
    || prerequisite.readiness.ordered_dependencies.length === 0
    || prerequisite.readiness.ordered_dependencies.some((row, index) => (
      row.ordinal !== index + 1
      || row.readiness_attestation_id
        !== prerequisite.readiness.readiness_attestation_id
    ))
  ) {
    throw errorForReason(
      'EXECUTION_READINESS_DRIFT',
      'Exact readiness outcome or ordered dependency identity has drifted.',
    );
  }
}

function assertId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw errorForReason('PROVIDER_PAYLOAD_INVALID', `${field} is required.`);
  }
}

function stateConflict(message: string): AppError {
  return errorForReason('EXECUTION_ATTEMPT_STATE_CONFLICT', message);
}

function errorForReason(
  reasonCode: Parameters<typeof createExperimentFoundationExecutionV2Error>[0],
  message: string,
): AppError {
  return createExperimentFoundationExecutionV2Error(reasonCode, message);
}

function mapRepositoryError(error: unknown): unknown {
  if (!(error instanceof ExperimentFoundationExecutionV2ConstraintError)) {
    return error;
  }
  return errorForReason(error.reasonCode, error.message);
}
