import test from 'node:test';
import assert from 'node:assert/strict';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationExperimentLineageV2Repository } from '../repositories/paper-implementation-experiment-lineage-v2.repository.js';
import type { PaperImplementationExperimentSpineV2Repository } from '../repositories/experiment-spine-v2.repository.js';
import type { ExperimentFoundationScientificValidationV2Repository } from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import type { PaperImplementationResultClaimDossierRepository } from '../repositories/paper-implementation-result-claim-dossier.repository.js';
import {
  PaperImplementationScientificContinuationOwnerStateReader,
  type PaperImplementationScientificContinuationOwnerStateReaderOptions,
} from './paper-implementation-scientific-continuation-owner-state-reader.js';

const PROJECT_ID = 'implementation_project_001';
const CYCLE_ID = 'validation_cycle_001';

type Project = Awaited<ReturnType<PaperImplementationRepository['findProjectById']>>;
type MotiveSet = Awaited<ReturnType<PaperImplementationMotiveRepository['findMotiveSet']>>;
type ValidationCycles = Awaited<
  ReturnType<PaperImplementationValidationRepository['listValidationCycles']>
>;
type SemanticLineage = Awaited<
  ReturnType<PaperImplementationExperimentLineageV2Repository['findProjectSemanticLineageSnapshot']>
>;
type RevisionBundle = Awaited<
  ReturnType<PaperImplementationExperimentSpineV2Repository['findRevisionBundle']>
>;
type SourceBoundResults = Awaited<
  ReturnType<ExperimentFoundationScientificValidationV2Repository['loadSourceBoundRunResults']>
>;
type ValidationOutcome = Awaited<
  ReturnType<ExperimentFoundationScientificValidationV2Repository['loadValidationByRunId']>
>;
type Packets = Awaited<
  ReturnType<PaperImplementationResultClaimDossierRepository['listResultInterpretationPackets']>
>;
type Claims = Awaited<
  ReturnType<PaperImplementationResultClaimDossierRepository['listClaimCandidates']>
>;
type Dossiers = Awaited<
  ReturnType<PaperImplementationResultClaimDossierRepository['listImplementationDossiers']>
>;

function assetDependencies() {
  const counts = [
    ['Dataset', 2],
    ['DataPolicy', 2],
    ['MetricDefinition', 17],
    ['Benchmark', 1],
    ['EvaluationProtocol', 1],
  ] as const;
  return counts.flatMap(([assetType, count]) => Array.from({ length: count }, (_, index) => ({
    asset_type: assetType,
    logical_id: `${assetType.toLowerCase()}_${index + 1}`,
    revision_id: `${assetType.toLowerCase()}_revision_${index + 1}`,
    revision_sequence: 1,
    content_hash: `sha256:${assetType.toLowerCase()}_${index + 1}`,
  })));
}

function readerOptions(overrides: {
  project?: Project;
  revisionBundle?: RevisionBundle;
  motiveRead?: () => void;
  validationCycles?: ValidationCycles;
  packets?: Packets;
  claims?: Claims;
  dossiers?: Dossiers;
} = {}): PaperImplementationScientificContinuationOwnerStateReaderOptions {
  const project = overrides.project === undefined
    ? ({
      implementation_project_id: PROJECT_ID,
      lifecycle_status: 'active',
    } as Project)
    : overrides.project;
  const revisionBundle = overrides.revisionBundle === undefined
    ? ({
      revision: {
        work_order_revision: {
          work_order_schema_version: 'v2',
          asset_dependencies: assetDependencies(),
        },
      },
      cells: [{ cell_key: 'baseline' }, { cell_key: 'candidate' }],
    } as unknown as RevisionBundle)
    : overrides.revisionBundle;

  return {
    projectRepository: {
      findProjectById: async () => project,
    },
    motiveRepository: {
      findMotiveSet: async () => {
        overrides.motiveRead?.();
        return { active_motive_count: 1 } as MotiveSet;
      },
    },
    validationRepository: {
      listValidationCycles: async () => overrides.validationCycles ?? ([{
        validation_cycle_id: CYCLE_ID,
        lifecycle_status: 'completed',
        created_at: '2026-08-20T00:00:00.000Z',
      }] as ValidationCycles),
    },
    coordinatorReader: {
      listCoordinatorRunsByProject: async () => [],
    },
    experimentLineageRepository: {
      findProjectSemanticLineageSnapshot: async () => ({
        project_cycles: { implementation_project_id: PROJECT_ID, cycles: [] },
        cycle_lineages: [{
          implementation_project_id: PROJECT_ID,
          validation_cycle_id: CYCLE_ID,
          branches: [{
            branch_id: 'branch_001',
            current_admitted_revision_id: 'revision_001',
            head_run: {
              run_id: 'run_001',
              cells: [
                { run_cell_id: 'cell_001' },
                { run_cell_id: 'cell_002' },
              ],
              attempts: [
                {
                  execution_attempt_id: 'attempt_001',
                  run_cell_id: 'cell_001',
                  execution_mode: 'real_provider',
                  lifecycle_state: 'succeeded',
                  collection: { collection_state: 'collected', output_kinds: [] },
                },
                {
                  execution_attempt_id: 'attempt_002',
                  run_cell_id: 'cell_002',
                  execution_mode: 'real_provider',
                  lifecycle_state: 'succeeded',
                  collection: { collection_state: 'collected', output_kinds: [] },
                },
              ],
            },
          }],
        }],
      } as unknown as SemanticLineage),
    },
    experimentSpineRepository: {
      findRevisionBundle: async () => revisionBundle,
    },
    scientificValidationRepository: {
      loadSourceBoundRunResults: async () => ([
        { result_id: 'result_001' },
        { result_id: 'result_002' },
      ] as SourceBoundResults),
      loadValidationByRunId: async () => ({
        report: { report_id: 'report_001' },
      } as ValidationOutcome),
    },
    closureReader: {
      findStoredClosureByCycle: async () => ({
        closure: { closure_id: 'closure_001' },
      } as unknown as NonNullable<
        Awaited<ReturnType<
          PaperImplementationScientificContinuationOwnerStateReaderOptions[
            'closureReader'
          ]['findStoredClosureByCycle']
        >>
      >),
    },
    resultClaimDossierRepository: {
      listResultInterpretationPackets: async () => overrides.packets ?? ([{
        result_interpretation_packet_id: 'packet_001',
        validation_cycle_id: CYCLE_ID,
        created_at: '2026-08-20T01:00:00.000Z',
      }] as Packets),
      listClaimCandidates: async () => overrides.claims ?? ([{
        claim_candidate_id: 'claim_001',
        result_interpretation_packet_refs: [{ ref_type: 'packet', ref_id: 'packet_001' }],
        human_confirmation_required: false,
        boundary: { human_confirmation_ref: null },
        created_at: '2026-08-20T02:00:00.000Z',
      }] as Claims),
      listImplementationDossiers: async () => overrides.dossiers ?? ([{
        dossier_id: 'dossier_001',
        dossier_version: 1,
        dossier_status: 'ready_for_writing',
        dossier_trace_status: 'complete',
        source: {
          result_interpretation_packet_refs: [{ ref_type: 'packet', ref_id: 'packet_001' }],
        },
        created_at: '2026-08-20T03:00:00.000Z',
      }] as Dossiers),
    },
  };
}

test('missing project returns a bounded missing projection without reading downstream owners', async () => {
  let motiveReads = 0;
  const reader = new PaperImplementationScientificContinuationOwnerStateReader(readerOptions({
    project: null,
    motiveRead: () => { motiveReads += 1; },
  }));
  const state = await reader.read('missing_project');
  assert.equal(state.project_lifecycle_status, 'missing');
  assert.equal(state.validation_cycle_id, null);
  assert.equal(motiveReads, 0);
});

test('owner reader reconstructs a terminal D-19 two-cell authority chain', async () => {
  const reader = new PaperImplementationScientificContinuationOwnerStateReader(readerOptions());
  const state = await reader.read(PROJECT_ID);
  assert.equal(state.has_admitted_motive, true);
  assert.equal(state.validation_cycle_id, CYCLE_ID);
  assert.equal(state.experiment?.supported_envelope, true);
  assert.equal(state.experiment?.successful_cell_count, 2);
  assert.deepEqual(state.experiment?.scientific_result_ids, ['result_001', 'result_002']);
  assert.equal(state.experiment?.scientific_validation_report_id, 'report_001');
  assert.equal(state.closure_id, 'closure_001');
  assert.equal(state.result_packet_id, 'packet_001');
  assert.equal(state.claim_id, 'claim_001');
  assert.equal(state.dossier_status, 'ready_for_writing');
  assert.equal(state.dossier_trace_status, 'complete');
});

test('owner reader rejects an admitted revision outside the D-19 dependency shape', async () => {
  const unsupported = {
    revision: {
      work_order_revision: {
        work_order_schema_version: 'v2',
        asset_dependencies: assetDependencies().slice(0, 22),
      },
    },
    cells: [{ cell_key: 'baseline' }, { cell_key: 'candidate' }],
  } as unknown as RevisionBundle;
  const reader = new PaperImplementationScientificContinuationOwnerStateReader(readerOptions({
    revisionBundle: unsupported,
  }));
  const state = await reader.read(PROJECT_ID);
  assert.equal(state.experiment?.supported_envelope, false);
});

test('owner reader never treats a historical Cycle Dossier as the current terminal owner', async () => {
  const oldCycleId = 'validation_cycle_old';
  const reader = new PaperImplementationScientificContinuationOwnerStateReader(readerOptions({
    validationCycles: [{
      validation_cycle_id: CYCLE_ID,
      lifecycle_status: 'running',
      created_at: '2026-08-20T00:00:00.000Z',
    }, {
      validation_cycle_id: oldCycleId,
      lifecycle_status: 'completed',
      created_at: '2026-08-19T00:00:00.000Z',
    }] as ValidationCycles,
    packets: [{
      result_interpretation_packet_id: 'packet_old',
      validation_cycle_id: oldCycleId,
      created_at: '2026-08-19T01:00:00.000Z',
    }] as Packets,
    claims: [{
      claim_candidate_id: 'claim_old',
      result_interpretation_packet_refs: [{ ref_type: 'packet', ref_id: 'packet_old' }],
      human_confirmation_required: false,
      boundary: { human_confirmation_ref: null },
      created_at: '2026-08-19T02:00:00.000Z',
    }] as Claims,
    dossiers: [{
      dossier_id: 'dossier_old',
      dossier_version: 1,
      dossier_status: 'ready_for_writing',
      dossier_trace_status: 'complete',
      source: {
        result_interpretation_packet_refs: [{ ref_type: 'packet', ref_id: 'packet_old' }],
      },
      created_at: '2026-08-19T03:00:00.000Z',
    }] as Dossiers,
  }));

  const state = await reader.read(PROJECT_ID);
  assert.equal(state.validation_cycle_id, CYCLE_ID);
  assert.equal(state.result_packet_id, null);
  assert.equal(state.claim_id, null);
  assert.equal(state.dossier_id, null);
  assert.equal(state.dossier_status, null);
});
