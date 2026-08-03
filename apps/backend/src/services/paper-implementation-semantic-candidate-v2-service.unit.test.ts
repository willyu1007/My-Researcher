import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticSourceV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ProjectValidationCyclesLineageV2Response,
  ValidationCycleExperimentLineageV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

import {
  PaperImplementationSemanticCandidateV2Service,
  PaperImplementationSemanticCandidateV2ServiceError,
  type PaperImplementationSemanticStructuredLineageV2Reader,
} from './paper-implementation-semantic-candidate-v2-service.js';

const PROJECT_ID = 'project-a';
const CYCLE_ID = 'cycle-a';
const BRANCH_ID = 'branch-a';
const hash = (character: string) => `sha256:${character.repeat(64)}`;
const openClosure = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
} as const;

function projectCycles(): ProjectValidationCyclesLineageV2Response {
  return {
    implementation_project_id: PROJECT_ID,
    validation_cycles: [{
      validation_cycle_id: CYCLE_ID,
      status: 'admitted',
      target_ref: {
        type: 'paper_project',
        id: 'paper-a',
        version: 'version-2',
      },
      created_at: '2026-08-03T01:00:00.000Z',
      closure: openClosure,
      branch_count: 2,
      admitted_branch_count: 2,
      total_run_count: 1,
      active_real_attempt_count: 1,
    }],
  };
}

function cycleLineage(attemptState = 'running'): ValidationCycleExperimentLineageV2Response {
  const summary = projectCycles().validation_cycles[0]!;
  return {
    implementation_project_id: PROJECT_ID,
    validation_cycle: {
      validation_cycle_id: summary.validation_cycle_id,
      status: summary.status,
      target_ref: summary.target_ref,
      created_at: summary.created_at,
      closure: summary.closure,
    },
    branches: [{
      ordinal: 2,
      branch_id: BRANCH_ID,
      branch_key: 'main',
      parent_branch_key: null,
      current_admitted_revision: {
        work_order_revision_id: 'revision-2',
        work_order_revision_hash: hash('a'),
        revision_sequence: 2,
      },
      effective_head_run: {
        run_id: 'run-2',
        run_manifest_hash: hash('b'),
        ordered_cells: [{
          ordinal: 1,
          cell_key: 'cell-1',
          training_task_spec_id: 'task-1',
          training_task_spec_hash: hash('c'),
        }],
        ordered_attempts: [{
          execution_attempt_id: 'attempt-1',
          attempt_sequence: 1,
          execution_mode: 'real_provider',
          lifecycle_state: attemptState,
          terminal_reason_code: null,
          updated_at: '2026-08-03T02:00:00.000Z',
        }],
        collection_summaries: [],
      },
      head_blocker: null,
    }, {
      ordinal: 1,
      branch_id: 'branch-blocked',
      branch_key: 'blocked',
      parent_branch_key: null,
      current_admitted_revision: {
        work_order_revision_id: 'revision-blocked',
        work_order_revision_hash: hash('d'),
        revision_sequence: 1,
      },
      effective_head_run: null,
      head_blocker: 'BRANCH_HEAD_NOT_FROZEN',
    }],
  };
}

function reader(options: {
  project?: ProjectValidationCyclesLineageV2Response;
  cycle?: ValidationCycleExperimentLineageV2Response;
  calls?: string[];
  } = {}): PaperImplementationSemanticStructuredLineageV2Reader {
  return {
    async listProjectSemanticLineageSnapshot(projectId) {
      options.calls?.push(`snapshot:${projectId}`);
      const project = options.project ?? projectCycles();
      return structuredClone({
        implementation_project_id: project.implementation_project_id,
        validation_cycles: project.validation_cycles.map((summary) => ({
          summary,
          lineage: options.cycle ?? cycleLineage(),
        })),
      });
    },
  };
}

test('semantic candidate service produces deterministic current-only ranking input', async () => {
  const calls: string[] = [];
  const service = new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ calls }),
  });
  const first = await service.prepareAuthorizedRankingInput(PROJECT_ID, '  compare runs  ');
  const second = await service.prepareAuthorizedRankingInput(PROJECT_ID, 'compare runs');

  assert.deepEqual(second, first);
  assert.equal(first.query, 'compare runs');
  assert.deepEqual(first.candidates.map((document) => document.source.source_type), [
    'validation_cycle',
    'effective_branch_head',
  ]);
  assert.deepEqual(first.candidates.map((document) => document.source.source_id), [
    CYCLE_ID,
    BRANCH_ID,
  ]);
  assert.equal(first.candidates.some((document) => (
    document.source.source_id === 'branch-blocked'
  )), false);
  assert.deepEqual(calls, [
    `snapshot:${PROJECT_ID}`,
    `snapshot:${PROJECT_ID}`,
  ]);

  for (const document of first.candidates) {
    assert.equal(document.implementation_project_id, PROJECT_ID);
    assert.equal(document.semantic_text, canonicalizeExperimentV2Json(document.content));
    assert.equal(
      document.source.source_hash,
      serverHashPaperImplementationSemanticSourceV2(document.content),
    );
    assert.equal(document.document_hash, serverHashPaperImplementationSemanticDocumentV2({
      implementation_project_id: PROJECT_ID,
      source: document.source,
      semantic_text: document.semantic_text,
      content: document.content,
    }));
  }
});

test('semantic candidate service resolves project scope before cycle candidates', async () => {
  const calls: string[] = [];
  const service = new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({
      calls,
      project: {
        ...projectCycles(),
        implementation_project_id: 'project-foreign',
      },
    }),
  });
  await assert.rejects(
    service.prepareAuthorizedRankingInput(PROJECT_ID, 'query'),
    (error) => (
      error instanceof PaperImplementationSemanticCandidateV2ServiceError
      && error.reasonCode === 'SEMANTIC_SOURCE_INTEGRITY_ERROR'
    ),
  );
  assert.deepEqual(calls, [`snapshot:${PROJECT_ID}`]);
});

test('semantic candidate service fails closed on structured source drift', async () => {
  const mismatchedCycle = cycleLineage();
  mismatchedCycle.validation_cycle.status = 'completed';
  const service = new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ cycle: mismatchedCycle }),
  });
  await assert.rejects(
    service.prepareAuthorizedRankingInput(PROJECT_ID, 'query'),
    (error) => (
      error instanceof PaperImplementationSemanticCandidateV2ServiceError
      && error.reasonCode === 'SEMANTIC_SOURCE_INTEGRITY_ERROR'
    ),
  );
});

test('semantic candidate service rejects duplicate effective source identities', async () => {
  const duplicateHeadCycle = cycleLineage();
  duplicateHeadCycle.branches.push(structuredClone(duplicateHeadCycle.branches[0]!));
  const service = new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ cycle: duplicateHeadCycle }),
  });
  await assert.rejects(
    service.prepareAuthorizedRankingInput(PROJECT_ID, 'query'),
    (error) => (
      error instanceof PaperImplementationSemanticCandidateV2ServiceError
      && error.reasonCode === 'SEMANTIC_SOURCE_INTEGRITY_ERROR'
    ),
  );
});

test('effective head source hash changes on state drift while document identity stays stable', async () => {
  const running = await new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ cycle: cycleLineage('running') }),
  }).prepareAuthorizedRankingInput(PROJECT_ID, 'query');
  const succeeded = await new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ cycle: cycleLineage('succeeded') }),
  }).prepareAuthorizedRankingInput(PROJECT_ID, 'query');
  const runningHead = running.candidates.find((candidate) => (
    candidate.source.source_type === 'effective_branch_head'
  ));
  const succeededHead = succeeded.candidates.find((candidate) => (
    candidate.source.source_type === 'effective_branch_head'
  ));
  assert.ok(runningHead);
  assert.ok(succeededHead);
  assert.equal(succeededHead.document_id, runningHead.document_id);
  assert.equal(succeededHead.source.source_version, runningHead.source.source_version);
  assert.notEqual(succeededHead.source.source_hash, runningHead.source.source_hash);
  assert.notEqual(succeededHead.document_hash, runningHead.document_hash);
});

test('invalid semantic query is rejected before the structured reader runs', async () => {
  const calls: string[] = [];
  const service = new PaperImplementationSemanticCandidateV2Service({
    structuredLineageReader: reader({ calls }),
  });
  await assert.rejects(
    service.prepareAuthorizedRankingInput(PROJECT_ID, '   '),
    (error) => (
      error instanceof PaperImplementationSemanticCandidateV2ServiceError
      && error.reasonCode === 'SEMANTIC_QUERY_INVALID'
    ),
  );
  assert.deepEqual(calls, []);
});
