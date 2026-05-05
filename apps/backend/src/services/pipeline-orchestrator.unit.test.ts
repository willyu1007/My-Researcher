import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import { PipelineOrchestrator } from './pipeline-orchestrator.js';

async function seedLiterature(repository: LiteratureRepository, literatureId: string): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: literatureId,
    title: 'Pipeline Unit Test',
    abstractText: 'abstract',
    keyContentDigest: null,
    authors: ['Ada Lovelace'],
    year: 2025,
    doiNormalized: '10.1000/pipeline-unit',
    arxivId: null,
    normalizedTitle: 'pipeline unit test',
    titleAuthorsYearHash: 'hash-pipeline-unit',
    rightsClass: 'UNKNOWN',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function waitForTerminalRun(repository: LiteratureRepository, runId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const run = await repository.findPipelineRunById(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found.`);
    }
    if (run.status === 'SUCCESS' || run.status === 'FAILED' || run.status === 'PARTIAL' || run.status === 'SKIPPED') {
      return run;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
  throw new Error(`Timed out waiting run ${runId}.`);
}

test('PipelineOrchestrator drives run from PENDING to SUCCESS with step records', async () => {
  const repository = new InMemoryLiteratureRepository();
  await seedLiterature(repository, 'LIT-PIPE-1');

  const orchestrator = new PipelineOrchestrator(repository, {
    executeStage: async () => ({
      status: 'SUCCEEDED',
      detail: { ok: true },
      outputRef: { ok: true },
    }),
  });

  const run = await orchestrator.enqueueRun({
    literatureId: 'LIT-PIPE-1',
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    requestedStages: ['CITATION_NORMALIZED', 'ABSTRACT_READY'],
  });

  assert.equal(run.status, 'PENDING');

  const terminal = await waitForTerminalRun(repository, run.id);
  assert.equal(terminal.status, 'SUCCESS');

  const steps = await repository.listPipelineRunStepsByRunId(run.id);
  assert.equal(steps.length, 2);
  assert.equal(steps.every((step) => step.status === 'SUCCEEDED'), true);
});

test('PipelineOrchestrator marks run as PARTIAL when some stages fail', async () => {
  const repository = new InMemoryLiteratureRepository();
  await seedLiterature(repository, 'LIT-PIPE-2');

  const orchestrator = new PipelineOrchestrator(repository, {
    executeStage: async ({ stageCode }) => {
      if (stageCode === 'ABSTRACT_READY') {
        return {
          status: 'FAILED',
          detail: { ok: false },
          errorCode: 'ABSTRACT_MISSING',
          errorMessage: 'abstract is missing',
        };
      }
      return {
        status: 'SUCCEEDED',
        detail: { ok: true },
      };
    },
  });

  const run = await orchestrator.enqueueRun({
    literatureId: 'LIT-PIPE-2',
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    requestedStages: ['CITATION_NORMALIZED', 'ABSTRACT_READY'],
  });

  const terminal = await waitForTerminalRun(repository, run.id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'ABSTRACT_MISSING');

  const steps = await repository.listPipelineRunStepsByRunId(run.id);
  assert.equal(steps.length, 2);
  assert.equal(steps.some((step) => step.status === 'FAILED'), true);
});

test('PipelineOrchestrator marks run as FAILED when unhandled processing error occurs', async () => {
  class FailingStageStateRepository extends InMemoryLiteratureRepository {
    override async upsertPipelineStageState(record: Parameters<InMemoryLiteratureRepository['upsertPipelineStageState']>[0]): Promise<never> {
      void record;
      throw new Error('stage-state write failed');
    }
  }

  const repository = new FailingStageStateRepository();
  await seedLiterature(repository, 'LIT-PIPE-3');

  const orchestrator = new PipelineOrchestrator(repository, {
    executeStage: async () => ({
      status: 'SUCCEEDED',
      detail: { ok: true },
    }),
  });

  const run = await orchestrator.enqueueRun({
    literatureId: 'LIT-PIPE-3',
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    requestedStages: ['CITATION_NORMALIZED'],
  });

  const terminal = await waitForTerminalRun(repository, run.id);
  assert.equal(terminal.status, 'FAILED');
  assert.equal(terminal.errorCode, 'CONTENT_PROCESSING_RUN_PROCESSING_FAILED');
  assert.equal(terminal.errorMessage?.includes('stage-state write failed'), true);
});

test('PipelineOrchestrator skips new run when same literature already has in-flight run', async () => {
  const repository = new InMemoryLiteratureRepository();
  await seedLiterature(repository, 'LIT-PIPE-4');

  const orchestrator = new PipelineOrchestrator(repository, {
    executeStage: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        status: 'SUCCEEDED',
        detail: { ok: true },
      };
    },
  });

  const firstRun = await orchestrator.enqueueRun({
    literatureId: 'LIT-PIPE-4',
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    requestedStages: ['CITATION_NORMALIZED'],
  });

  const secondRun = await orchestrator.enqueueRun({
    literatureId: 'LIT-PIPE-4',
    triggerSource: 'CONTENT_PROCESSING_ACTION',
    requestedStages: ['ABSTRACT_READY'],
  });

  assert.equal(secondRun.status, 'SKIPPED');
  assert.equal(secondRun.errorCode, 'CONTENT_PROCESSING_RUN_SKIPPED_SINGLE_FLIGHT');

  const firstTerminal = await waitForTerminalRun(repository, firstRun.id);
  assert.equal(firstTerminal.status, 'SUCCESS');
});
