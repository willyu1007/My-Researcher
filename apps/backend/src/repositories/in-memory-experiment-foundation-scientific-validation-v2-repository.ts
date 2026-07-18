import { isDeepStrictEqual } from 'node:util';

import type { ExperimentResultCellV2 } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';

import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type ExperimentFoundationScientificValidationV2ExecutionAttempt,
  type ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  type ExperimentFoundationScientificValidationV2Outbox,
  type ExperimentFoundationScientificValidationV2Protocol,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2Run,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
  type PersistExperimentFoundationScientificResultV2Input,
  type PersistExperimentFoundationScientificValidationV2Input,
} from './experiment-foundation-scientific-validation-v2.repository.js';

interface StoredResult {
  result: ExperimentResultCellV2;
  metric_observation_count: number;
  artifact_observation_count: number;
  created_at: string;
}

interface State {
  results: Map<string, StoredResult>;
  resultByRunCell: Map<string, string>;
  resultByAttempt: Map<string, string>;
  outcomesByRun: Map<string, ExperimentFoundationScientificValidationV2StoredOutcome>;
  outcomeRunByIdempotencyKey: Map<string, string>;
  outboxes: Map<string, ExperimentFoundationScientificValidationV2Outbox>;
}

export interface InMemoryExperimentFoundationScientificValidationV2RepositoryOptions {
  runs?: readonly ExperimentFoundationScientificValidationV2Run[];
  protocols?: Readonly<Record<string, ExperimentFoundationScientificValidationV2Protocol>>;
  headAcknowledgements?: readonly ExperimentFoundationScientificValidationV2HeadAcknowledgement[];
  executionAttempts?: readonly ExperimentFoundationScientificValidationV2ExecutionAttempt[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source.entries()].map(([key, value]) => [key, clone(value)]));
}

function cloneState(source: State): State {
  return {
    results: cloneMap(source.results),
    resultByRunCell: new Map(source.resultByRunCell),
    resultByAttempt: new Map(source.resultByAttempt),
    outcomesByRun: cloneMap(source.outcomesByRun),
    outcomeRunByIdempotencyKey: new Map(source.outcomeRunByIdempotencyKey),
    outboxes: cloneMap(source.outboxes),
  };
}

function constraint(
  reasonCode: ConstructorParameters<
    typeof ExperimentFoundationScientificValidationV2ConstraintError
  >[0],
  message: string,
): ExperimentFoundationScientificValidationV2ConstraintError {
  return new ExperimentFoundationScientificValidationV2ConstraintError(reasonCode, message);
}

export class InMemoryExperimentFoundationScientificValidationV2Repository
implements ExperimentFoundationScientificValidationV2Repository {
  private state: State = {
    results: new Map(),
    resultByRunCell: new Map(),
    resultByAttempt: new Map(),
    outcomesByRun: new Map(),
    outcomeRunByIdempotencyKey: new Map(),
    outboxes: new Map(),
  };

  private readonly runs = new Map<string, ExperimentFoundationScientificValidationV2Run>();
  private readonly protocols = new Map<string, ExperimentFoundationScientificValidationV2Protocol>();
  private readonly acknowledgements = new Map<
    string,
    ExperimentFoundationScientificValidationV2HeadAcknowledgement
  >();
  private readonly attempts = new Map<
    string,
    ExperimentFoundationScientificValidationV2ExecutionAttempt
  >();
  private transactionTail: Promise<void> = Promise.resolve();
  private validationCommitFault: Error | null = null;

  constructor(
    options: InMemoryExperimentFoundationScientificValidationV2RepositoryOptions = {},
  ) {
    for (const run of options.runs ?? []) this.runs.set(run.run_id, clone(run));
    for (const [runId, protocol] of Object.entries(options.protocols ?? {})) {
      this.protocols.set(runId, clone(protocol));
    }
    for (const acknowledgement of options.headAcknowledgements ?? []) {
      this.acknowledgements.set(acknowledgement.run_id, clone(acknowledgement));
    }
    for (const attempt of options.executionAttempts ?? []) {
      this.attempts.set(attempt.execution_attempt_id, clone(attempt));
    }
  }

  failNextValidationCommit(
    error: Error = new Error('INJECTED_SCIENTIFIC_VALIDATION_COMMIT_FAILURE'),
  ): void {
    this.validationCommitFault = error;
  }

  snapshot() {
    return {
      results: [...this.state.results.values()].map(clone),
      outcomes: [...this.state.outcomesByRun.values()].map(clone),
      outboxes: [...this.state.outboxes.values()].map(clone),
    };
  }

  async loadRun(
    runId: string,
    expectedRunManifestHash: string,
  ): Promise<ExperimentFoundationScientificValidationV2Run | null> {
    const run = this.runs.get(runId);
    return run?.run_manifest_hash === expectedRunManifestHash ? clone(run) : null;
  }

  async resolveEvaluationProtocol(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2Protocol | null> {
    const protocol = this.protocols.get(runId);
    return protocol ? clone(protocol) : null;
  }

  async loadHeadAcknowledgement(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2HeadAcknowledgement | null> {
    const acknowledgement = this.acknowledgements.get(runId);
    return acknowledgement ? clone(acknowledgement) : null;
  }

  async loadExecutionAttempt(
    executionAttemptId: string,
  ): Promise<ExperimentFoundationScientificValidationV2ExecutionAttempt | null> {
    const attempt = this.attempts.get(executionAttemptId);
    return attempt ? clone(attempt) : null;
  }

  async persistExperimentResult(
    input: PersistExperimentFoundationScientificResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    return this.transact((state) => {
      const existingId = state.resultByRunCell.get(input.result.run_cell_id);
      if (existingId) {
        const existing = state.results.get(existingId);
        if (!existing) {
          throw constraint('VALIDATION_RESULT_CONFLICT', 'Result index lost its stored row.');
        }
        if (existing.result.content_hash !== input.result.content_hash) {
          throw constraint(
            'VALIDATION_RESULT_CONFLICT',
            'Run cell already has a result with different scientific content.',
          );
        }
        return existing.result;
      }

      const attemptResultId = state.resultByAttempt.get(input.result.execution_attempt_id);
      if (attemptResultId) {
        const attemptResult = state.results.get(attemptResultId);
        if (!attemptResult || !isDeepStrictEqual(attemptResult.result, input.result)) {
          throw constraint(
            'VALIDATION_RESULT_CONFLICT',
            'Execution Attempt is already bound to a different scientific result.',
          );
        }
        return attemptResult.result;
      }

      state.results.set(input.result.result_id, {
        result: clone(input.result),
        metric_observation_count: input.result.metric_observations.length,
        artifact_observation_count: input.result.artifact_observations.length,
        created_at: input.created_at,
      });
      state.resultByRunCell.set(input.result.run_cell_id, input.result.result_id);
      state.resultByAttempt.set(input.result.execution_attempt_id, input.result.result_id);
      return input.result;
    });
  }

  async loadRunResults(runId: string): Promise<ExperimentResultCellV2[]> {
    return [...this.state.results.values()]
      .filter((stored) => stored.result.run_id === runId)
      .map((stored) => clone(stored.result));
  }

  async loadValidationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null> {
    const runId = this.state.outcomeRunByIdempotencyKey.get(idempotencyKey);
    if (!runId) return null;
    const outcome = this.state.outcomesByRun.get(runId);
    return outcome ? clone(outcome) : null;
  }

  async loadValidationByRunId(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null> {
    const outcome = this.state.outcomesByRun.get(runId);
    return outcome ? clone(outcome) : null;
  }

  async persistValidationOutcome(
    input: PersistExperimentFoundationScientificValidationV2Input,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome> {
    return this.transact((state) => {
      const idempotentRunId = state.outcomeRunByIdempotencyKey.get(input.idempotency_key);
      if (idempotentRunId) {
        const existing = state.outcomesByRun.get(idempotentRunId);
        if (!existing || existing.report.validation_hash !== input.report.validation_hash) {
          throw constraint(
            'VALIDATION_IDEMPOTENCY_CONFLICT',
            'Scientific validation idempotency key was reused with changed content.',
          );
        }
        return existing;
      }

      const runOutcome = state.outcomesByRun.get(input.report.run_id);
      if (runOutcome) {
        if (runOutcome.report.validation_hash !== input.report.validation_hash) {
          throw constraint(
            'VALIDATION_RESULT_CONFLICT',
            'Run already has a different scientific validation report.',
          );
        }
        return runOutcome;
      }

      const passed = input.report.status === 'passed';
      if (
        passed !== (input.evidence_candidate !== null)
        || passed !== (input.outbox !== null)
        || (input.evidence_candidate
          && input.outbox?.aggregate_id !== input.evidence_candidate.candidate_id)
      ) {
        throw constraint(
          'VALIDATION_RESULT_CONFLICT',
          'Passed-only Candidate/outbox atomicity invariant was violated.',
        );
      }

      const outcome: ExperimentFoundationScientificValidationV2StoredOutcome = {
        report: clone(input.report),
        evidence_candidate: clone(input.evidence_candidate),
        idempotency_key: input.idempotency_key,
      };
      state.outcomesByRun.set(input.report.run_id, outcome);
      state.outcomeRunByIdempotencyKey.set(input.idempotency_key, input.report.run_id);
      if (input.outbox) state.outboxes.set(input.outbox.outbox_id, clone(input.outbox));

      if (this.validationCommitFault) {
        const error = this.validationCommitFault;
        this.validationCommitFault = null;
        throw error;
      }
      return outcome;
    });
  }

  private async transact<T>(operation: (state: State) => T | Promise<T>): Promise<T> {
    let release: () => void = () => undefined;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const working = cloneState(this.state);
      const result = await operation(working);
      this.state = working;
      return clone(result);
    } finally {
      release();
    }
  }
}
