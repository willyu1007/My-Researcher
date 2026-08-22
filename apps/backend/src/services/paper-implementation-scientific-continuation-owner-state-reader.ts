import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationExperimentLineageV2Repository } from '../repositories/paper-implementation-experiment-lineage-v2.repository.js';
import type { PaperImplementationExperimentSpineV2Repository } from '../repositories/experiment-spine-v2.repository.js';
import type { ExperimentFoundationScientificValidationV2Repository } from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import type {
  PaperImplementationExactClosureReader,
  PaperImplementationResultClaimDossierRepository,
} from '../repositories/paper-implementation-result-claim-dossier.repository.js';
import type { PaperImplementationCoordinatorRunListItem } from './paper-implementation-run-coordinator-service.js';
import type {
  PaperImplementationScientificContinuationOwnerState,
  ScientificContinuationExperimentState,
} from './paper-implementation-scientific-continuation-stage-resolver.js';

export interface PaperImplementationScientificContinuationCoordinatorReader {
  listCoordinatorRunsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationCoordinatorRunListItem[]>;
}

export interface PaperImplementationScientificContinuationOwnerStateReaderOptions {
  projectRepository: Pick<PaperImplementationRepository, 'findProjectById'>;
  motiveRepository: Pick<PaperImplementationMotiveRepository, 'findMotiveSet'>;
  validationRepository: Pick<PaperImplementationValidationRepository, 'listValidationCycles'>;
  coordinatorReader: PaperImplementationScientificContinuationCoordinatorReader;
  experimentLineageRepository: Pick<
    PaperImplementationExperimentLineageV2Repository,
    'findProjectSemanticLineageSnapshot'
  >;
  experimentSpineRepository: Pick<
    PaperImplementationExperimentSpineV2Repository,
    'findRevisionBundle'
  >;
  scientificValidationRepository: Pick<
    ExperimentFoundationScientificValidationV2Repository,
    'loadSourceBoundRunResults' | 'loadValidationByRunId'
  >;
  closureReader: PaperImplementationExactClosureReader;
  resultClaimDossierRepository: Pick<
    PaperImplementationResultClaimDossierRepository,
    'listResultInterpretationPackets' | 'listClaimCandidates' | 'listImplementationDossiers'
  >;
}

const ACTIVE_CYCLE_STATUSES = new Set(['proposed', 'admitted', 'running', 'interpreting']);
const ACTIVE_ATTEMPT_STATUSES = new Set(['prepared', 'submitted', 'running']);
const D19_DEPENDENCY_COUNTS = new Map<string, number>([
  ['Dataset', 2],
  ['DataPolicy', 2],
  ['MetricDefinition', 17],
  ['Benchmark', 1],
  ['EvaluationProtocol', 1],
]);

function descendingByCreatedAt<T extends { created_at: string }>(left: T, right: T): number {
  const byTime = right.created_at.localeCompare(left.created_at);
  return byTime || JSON.stringify(right).localeCompare(JSON.stringify(left));
}

function supportsCurrentScientificEnvelope(
  bundle: Awaited<ReturnType<PaperImplementationExperimentSpineV2Repository['findRevisionBundle']>>,
): boolean | null {
  if (!bundle) return null;
  const snapshot = bundle.revision.work_order_revision;
  if (snapshot.work_order_schema_version !== 'v2') return false;
  if (snapshot.asset_dependencies.length !== 23 || bundle.cells.length !== 2) return false;
  if (new Set(bundle.cells.map((cell) => cell.cell_key)).size !== 2) return false;

  const counts = new Map<string, number>();
  for (const dependency of snapshot.asset_dependencies) {
    counts.set(dependency.asset_type, (counts.get(dependency.asset_type) ?? 0) + 1);
  }
  if (counts.size !== D19_DEPENDENCY_COUNTS.size) return false;
  for (const [assetType, expectedCount] of D19_DEPENDENCY_COUNTS) {
    if (counts.get(assetType) !== expectedCount) return false;
  }
  return true;
}

function emptyOwnerState(
  implementationProjectId: string,
): PaperImplementationScientificContinuationOwnerState {
  return {
    implementation_project_id: implementationProjectId,
    project_lifecycle_status: 'missing',
    has_admitted_motive: false,
    coordinator_runs: [],
    active_validation_cycle_count: 0,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    claim_requires_human_confirmation: false,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  };
}

/**
 * Rebuilds the continuation projection from domain owners on every request.
 * Reads are bounded by the existing project-level list surfaces; no
 * continuation row, cache or temporary recovery authority is created.
 */
export class PaperImplementationScientificContinuationOwnerStateReader {
  constructor(
    private readonly options: PaperImplementationScientificContinuationOwnerStateReaderOptions,
  ) {}

  async read(
    implementationProjectId: string,
  ): Promise<PaperImplementationScientificContinuationOwnerState> {
    const project = await this.options.projectRepository.findProjectById(implementationProjectId);
    if (!project) return emptyOwnerState(implementationProjectId);

    const [
      motiveSet,
      coordinatorRuns,
      validationCycles,
      semanticLineage,
      packets,
      claims,
      dossiers,
    ] = await Promise.all([
      this.options.motiveRepository.findMotiveSet(implementationProjectId),
      this.options.coordinatorReader.listCoordinatorRunsByProject(implementationProjectId),
      this.options.validationRepository.listValidationCycles(implementationProjectId),
      this.options.experimentLineageRepository.findProjectSemanticLineageSnapshot(
        implementationProjectId,
      ),
      this.options.resultClaimDossierRepository.listResultInterpretationPackets(
        implementationProjectId,
      ),
      this.options.resultClaimDossierRepository.listClaimCandidates(implementationProjectId),
      this.options.resultClaimDossierRepository.listImplementationDossiers(
        implementationProjectId,
      ),
    ]);

    const usableCycles = validationCycles
      .filter((cycle) => !['aborted', 'superseded'].includes(cycle.lifecycle_status))
      .sort(descendingByCreatedAt);
    const activeCycles = usableCycles.filter((cycle) => (
      ACTIVE_CYCLE_STATUSES.has(cycle.lifecycle_status)
    ));
    const selectedCycle = activeCycles[0] ?? usableCycles[0] ?? null;
    const cycleLineage = selectedCycle
      ? semanticLineage?.cycle_lineages.find((candidate) => (
        candidate.validation_cycle_id === selectedCycle.validation_cycle_id
      )) ?? null
      : null;
    const selectedBranch = cycleLineage?.branches[0] ?? null;
    const revisionBundle = selectedBranch
      ? await this.options.experimentSpineRepository.findRevisionBundle(
        selectedBranch.branch_id,
        selectedBranch.current_admitted_revision_id,
      )
      : null;

    const experiment = await this.readExperiment(
      cycleLineage?.branches.length ?? 0,
      selectedBranch,
      revisionBundle,
    );
    const closure = selectedCycle
      ? await this.options.closureReader.findStoredClosureByCycle(
        selectedCycle.validation_cycle_id,
      )
      : null;

    const selectedPacket = selectedCycle
      ? packets
        .filter((packet) => packet.validation_cycle_id === selectedCycle.validation_cycle_id)
        .sort(descendingByCreatedAt)[0] ?? null
      : null;
    const selectedClaim = (selectedPacket
      ? claims.filter((claim) => claim.result_interpretation_packet_refs.some((ref) => (
        ref.ref_id === selectedPacket.result_interpretation_packet_id
      )))
      : [])
      .sort(descendingByCreatedAt)[0] ?? null;
    const orderedDossiers = [...dossiers].sort((left, right) => (
      right.dossier_version - left.dossier_version || descendingByCreatedAt(left, right)
    ));
    const scopedDossiers = selectedPacket
      ? orderedDossiers.filter((dossier) => (
        dossier.source.result_interpretation_packet_refs.some((ref) => (
          ref.ref_id === selectedPacket.result_interpretation_packet_id
        ))
      ))
      : [];
    const terminalDossier = scopedDossiers.find((dossier) => (
      dossier.dossier_status === 'ready_for_writing'
      && dossier.dossier_trace_status === 'complete'
    ));
    const selectedDossier = terminalDossier
      ?? scopedDossiers[0]
      ?? null;

    return {
      implementation_project_id: implementationProjectId,
      project_lifecycle_status: project.lifecycle_status,
      has_admitted_motive: (motiveSet?.active_motive_count ?? 0) > 0,
      coordinator_runs: coordinatorRuns.map((run) => ({
        coordinator_run_id: run.coordinator_run_id,
        lane_id: run.lane_id,
        run_status: run.run_status,
      })),
      active_validation_cycle_count: activeCycles.length,
      validation_cycle_id: selectedCycle?.validation_cycle_id ?? null,
      validation_cycle_status: selectedCycle?.lifecycle_status ?? null,
      experiment,
      closure_id: closure?.closure.closure_id ?? null,
      result_packet_id: selectedPacket?.result_interpretation_packet_id ?? null,
      claim_id: selectedClaim?.claim_candidate_id ?? null,
      claim_requires_human_confirmation: Boolean(
        selectedClaim?.human_confirmation_required
        && !selectedClaim.boundary.human_confirmation_ref,
      ),
      dossier_id: selectedDossier?.dossier_id ?? null,
      dossier_status: selectedDossier?.dossier_status ?? null,
      dossier_trace_status: selectedDossier?.dossier_trace_status ?? null,
    };
  }

  private async readExperiment(
    admittedBranchCount: number,
    branch: NonNullable<
      Awaited<ReturnType<
        PaperImplementationExperimentLineageV2Repository['findProjectSemanticLineageSnapshot']
      >>
    >['cycle_lineages'][number]['branches'][number] | null,
    revisionBundle: Awaited<
      ReturnType<PaperImplementationExperimentSpineV2Repository['findRevisionBundle']>
    >,
  ): Promise<ScientificContinuationExperimentState | null> {
    if (admittedBranchCount === 0 || !branch) return null;

    const headRun = branch.head_run;
    const realAttempts = headRun?.attempts.filter((attempt) => (
      attempt.execution_mode === 'real_provider'
    )) ?? [];
    const activeAttempts = realAttempts.filter((attempt) => (
      ACTIVE_ATTEMPT_STATUSES.has(attempt.lifecycle_state)
      || (
        attempt.lifecycle_state === 'succeeded'
        && attempt.collection?.collection_state !== 'collected'
      )
    ));
    const successfulCellIds = new Set(realAttempts
      .filter((attempt) => (
        attempt.lifecycle_state === 'succeeded'
        && attempt.collection?.collection_state === 'collected'
      ))
      .map((attempt) => attempt.run_cell_id));
    const failedCellIds = new Set(realAttempts
      .filter((attempt) => (
        ['failed', 'cancelled'].includes(attempt.lifecycle_state)
        || attempt.collection?.collection_state === 'failed'
      ))
      .map((attempt) => attempt.run_cell_id)
      .filter((runCellId) => !successfulCellIds.has(runCellId)));

    const [scientificResults, validation] = headRun
      ? await Promise.all([
        this.options.scientificValidationRepository.loadSourceBoundRunResults(headRun.run_id),
        this.options.scientificValidationRepository.loadValidationByRunId(headRun.run_id),
      ])
      : [[], null];

    return {
      admitted_branch_count: admittedBranchCount,
      branch_id: branch.branch_id,
      work_order_revision_id: branch.current_admitted_revision_id,
      supported_envelope: supportsCurrentScientificEnvelope(revisionBundle),
      run_id: headRun?.run_id ?? null,
      cell_count: headRun?.cells.length ?? revisionBundle?.cells.length ?? 0,
      attempt_count: realAttempts.length,
      active_attempt_count: activeAttempts.length,
      successful_cell_count: successfulCellIds.size,
      failed_cell_count: failedCellIds.size,
      scientific_result_ids: scientificResults.map((result) => result.result_id),
      scientific_validation_report_id: validation?.report.report_id ?? null,
    };
  }
}
