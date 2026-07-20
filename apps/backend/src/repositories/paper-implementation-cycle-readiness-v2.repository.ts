export const PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_INITIAL_VERSION = 0 as const;

export const PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES = [
  'prepared',
  'submitted',
  'running',
] as const;

export const PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES = [
  'real',
  'real_provider',
] as const;

export class PaperImplementationCycleReadinessV2RepositoryIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaperImplementationCycleReadinessV2RepositoryIntegrityError';
  }
}

export interface PaperImplementationCycleReadinessV2Cycle {
  validation_cycle_id: string;
  implementation_project_id: string;
  lifecycle_status: string;
  expected_cycle_version: number;
}

export interface PaperImplementationCycleReadinessV2Branch {
  branch_id: string;
  branch_key: string;
  current_admitted_revision_id: string;
  current_admitted_revision_hash: string;
  current_admitted_revision_sequence: number;
  head_revision_id: string | null;
  head_revision_sequence: number | null;
  head_run_id: string | null;
  head_run_manifest_hash: string | null;
}

export interface PaperImplementationCycleReadinessV2HeadReference {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  current_admitted_revision_id: string;
  current_admitted_revision_hash: string;
  current_admitted_revision_sequence: number;
  head_run_id: string;
  head_run_manifest_hash: string;
}

export interface PaperImplementationCycleReadinessV2Attempt {
  execution_attempt_id: string;
  attempt_sequence: number;
  lifecycle_state: string;
  execution_mode: string;
  provenance: string;
}

export interface PaperImplementationCycleReadinessV2CompleteResult {
  result_id: string;
  result_content_hash: string;
  execution_attempt_id: string;
  provenance: string;
}

export interface PaperImplementationCycleReadinessV2Cell {
  ordinal: number;
  run_cell_id: string;
  cell_key: string;
  attempts: PaperImplementationCycleReadinessV2Attempt[];
  complete_result: PaperImplementationCycleReadinessV2CompleteResult | null;
}

export interface PaperImplementationCycleReadinessV2HeadRun {
  run_id: string;
  run_manifest_hash: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  head_acknowledged: boolean;
  cells: PaperImplementationCycleReadinessV2Cell[];
}

export interface PaperImplementationCycleReadinessV2ActiveRealAttempt {
  execution_attempt_id: string;
  validation_cycle_id: string;
  run_id: string;
  execution_mode: (typeof PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES)[number];
  provenance: 'real_provider';
  lifecycle_state: (typeof PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES)[number];
}

export interface PaperImplementationCycleReadinessV2EvidenceUnit {
  validation_cycle_id: string;
  branch_id: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  run_evidence_unit_id: string;
  content_hash: string;
}

export interface PaperImplementationCycleReadinessV2Closure {
  closure_id: string;
  validation_cycle_id: string;
  cycle_version_at_closure: number;
  closure_input_hash: string;
}

export interface PaperImplementationCycleReadinessV2Repository {
  findValidationCycle(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2Cycle | null>;

  listAdmittedBranches(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2Branch[]>;

  listHeadRunAccounting(
    references: readonly PaperImplementationCycleReadinessV2HeadReference[],
  ): Promise<PaperImplementationCycleReadinessV2HeadRun[]>;

  listCycleActiveRealAttempts(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2ActiveRealAttempt[]>;

  listEligibleRunEvidenceUnits(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2EvidenceUnit[]>;

  findCycleClosure(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2Closure | null>;
}

export interface InMemoryPaperImplementationCycleReadinessV2RepositoryOptions {
  cycles?: readonly PaperImplementationCycleReadinessV2Cycle[];
  branches?: Readonly<Record<string, readonly PaperImplementationCycleReadinessV2Branch[]>>;
  runs?: readonly (PaperImplementationCycleReadinessV2HeadRun & {
    validation_cycle_id: string;
  })[];
  evidence_units?: readonly PaperImplementationCycleReadinessV2EvidenceUnit[];
  closures?: readonly PaperImplementationCycleReadinessV2Closure[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function compareAttempts(
  left: PaperImplementationCycleReadinessV2Attempt,
  right: PaperImplementationCycleReadinessV2Attempt,
): number {
  return left.attempt_sequence - right.attempt_sequence
    || left.execution_attempt_id.localeCompare(right.execution_attempt_id);
}

function compareCells(
  left: PaperImplementationCycleReadinessV2Cell,
  right: PaperImplementationCycleReadinessV2Cell,
): number {
  return left.ordinal - right.ordinal || left.run_cell_id.localeCompare(right.run_cell_id);
}

export class InMemoryPaperImplementationCycleReadinessV2Repository
implements PaperImplementationCycleReadinessV2Repository {
  private readonly cycles: readonly PaperImplementationCycleReadinessV2Cycle[];
  private readonly branches: Readonly<
    Record<string, readonly PaperImplementationCycleReadinessV2Branch[]>
  >;
  private readonly runs: readonly (PaperImplementationCycleReadinessV2HeadRun & {
    validation_cycle_id: string;
  })[];
  private readonly evidenceUnits: readonly PaperImplementationCycleReadinessV2EvidenceUnit[];
  private readonly closures: readonly PaperImplementationCycleReadinessV2Closure[];

  constructor(options: InMemoryPaperImplementationCycleReadinessV2RepositoryOptions = {}) {
    this.cycles = clone(options.cycles ?? []);
    this.branches = clone(options.branches ?? {});
    this.runs = clone(options.runs ?? []);
    this.evidenceUnits = clone(options.evidence_units ?? []);
    this.closures = clone(options.closures ?? []);
  }

  async findValidationCycle(validationCycleId: string) {
    return clone(this.cycles.find((cycle) => (
      cycle.validation_cycle_id === validationCycleId
    )) ?? null);
  }

  async listAdmittedBranches(validationCycleId: string) {
    return clone([...(this.branches[validationCycleId] ?? [])]
      .sort((left, right) => (
        left.branch_key.localeCompare(right.branch_key)
        || left.branch_id.localeCompare(right.branch_id)
      )));
  }

  async listHeadRunAccounting(
    references: readonly PaperImplementationCycleReadinessV2HeadReference[],
  ) {
    const requestedRunIds = new Set(references.map((reference) => reference.head_run_id));
    return clone(this.runs
      .filter((run) => requestedRunIds.has(run.run_id))
      .map((run) => ({
        ...run,
        cells: [...run.cells]
          .sort(compareCells)
          .map((cell) => ({
            ...cell,
            attempts: [...cell.attempts].sort(compareAttempts),
          })),
      }))
      .sort((left, right) => left.run_id.localeCompare(right.run_id))
      .map(({ validation_cycle_id: _validationCycleId, ...run }) => run));
  }

  async listCycleActiveRealAttempts(validationCycleId: string) {
    const activeStates = new Set<string>(
      PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES,
    );
    const realModes = new Set<string>(
      PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES,
    );
    return clone(this.runs
      .filter((run) => run.validation_cycle_id === validationCycleId)
      .flatMap((run) => run.cells.flatMap((cell) => cell.attempts.map((attempt) => ({
        execution_attempt_id: attempt.execution_attempt_id,
        validation_cycle_id: validationCycleId,
        run_id: run.run_id,
        execution_mode: attempt.execution_mode,
        provenance: attempt.provenance,
        lifecycle_state: attempt.lifecycle_state,
      }))))
      .filter((attempt): attempt is PaperImplementationCycleReadinessV2ActiveRealAttempt => (
        realModes.has(attempt.execution_mode)
        && attempt.provenance === 'real_provider'
        && activeStates.has(attempt.lifecycle_state)
      ))
      .sort((left, right) => (
        left.run_id.localeCompare(right.run_id)
        || left.execution_attempt_id.localeCompare(right.execution_attempt_id)
      )));
  }

  async listEligibleRunEvidenceUnits(validationCycleId: string) {
    return clone(this.evidenceUnits
      .filter((unit) => unit.validation_cycle_id === validationCycleId)
      .sort((left, right) => (
        left.branch_id.localeCompare(right.branch_id)
        || left.run_evidence_unit_id.localeCompare(right.run_evidence_unit_id)
        || left.content_hash.localeCompare(right.content_hash)
      )));
  }

  async findCycleClosure(validationCycleId: string) {
    return clone(this.closures.find((closure) => (
      closure.validation_cycle_id === validationCycleId
    )) ?? null);
  }
}
