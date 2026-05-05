import assert from 'node:assert/strict';
import test from 'node:test';
import type { RightsClass } from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import { LiteratureFlowService, PIPELINE_STAGE_CODES } from './literature-flow-service.js';

async function seedLiterature(
  repository: LiteratureRepository,
  literatureId: string,
  rightsClass: RightsClass,
  options: {
    abstractText?: string | null;
    keyContentDigest?: string | null;
  } = {},
): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: literatureId,
    title: `Pipeline ${literatureId}`,
    abstractText: options.abstractText ?? null,
    keyContentDigest: options.keyContentDigest ?? null,
    authors: ['Ada Lovelace'],
    year: 2025,
    doiNormalized: `10.1000/${literatureId.toLowerCase()}`,
    arxivId: null,
    normalizedTitle: `pipeline ${literatureId.toLowerCase()}`,
    titleAuthorsYearHash: `hash-${literatureId.toLowerCase()}`,
    rightsClass,
    tags: ['pipeline-test'],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });

  await repository.upsertLiteratureSource({
    id: `${literatureId}-source`,
    literatureId,
    provider: 'manual',
    sourceItemId: `${literatureId}-source-item`,
    sourceUrl: `https://example.test/${literatureId.toLowerCase()}`,
    rawPayload: {},
    fetchedAt: now,
  });
}

async function waitForTerminalRun(repository: LiteratureRepository, runId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const run = await repository.findPipelineRunById(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found.`);
    }
    if (run.status === 'SUCCESS' || run.status === 'FAILED' || run.status === 'PARTIAL' || run.status === 'SKIPPED') {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for run ${runId}.`);
}

test('literature flow executes all seven stages and persists stage artifacts', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-1', 'OA', {
    abstractText: 'Trusted abstract for pipeline execution.',
    keyContentDigest: 'Trusted key content digest for pipeline execution.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-1', [...PIPELINE_STAGE_CODES]);

  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'SUCCESS');

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-1');
  const statusMap = new Map(stageStates.map((item) => [item.stageCode, item.status]));
  for (const stageCode of PIPELINE_STAGE_CODES) {
    assert.equal(statusMap.get(stageCode), 'SUCCEEDED');
  }

  const artifacts = await repository.listPipelineArtifactsByLiteratureId('LIT-FLOW-1');
  const artifactTypes = artifacts.map((item) => item.artifactType).sort();
  assert.deepEqual(artifactTypes, ['CHUNKS', 'EMBEDDINGS', 'LOCAL_INDEX', 'PREPROCESSED_TEXT']);

  const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-1']);
  assert.equal(versions.length, 2);
  assert.equal(versions[0]?.versionNo, 1);
  assert.equal(versions[1]?.versionNo, 2);

  const literature = await repository.findLiteratureById('LIT-FLOW-1');
  assert.ok(literature);
  assert.equal(literature.activeEmbeddingVersionId, versions[1]?.id ?? null);

  const activeChunkRows = await repository.listEmbeddingChunksByEmbeddingVersionId(versions[1]!.id);
  assert.equal(activeChunkRows.length > 0, true);
  const activeTokenRows = await repository.listEmbeddingTokenIndexesByEmbeddingVersionId(versions[1]!.id);
  assert.equal(activeTokenRows.length > 0, true);
});

test('literature flow blocks deep stages for RESTRICTED rights class', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-RESTRICTED', 'RESTRICTED', {
    abstractText: 'Trusted abstract for restricted rights gate.',
    keyContentDigest: 'Trusted key content digest for restricted rights gate.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-RESTRICTED', [...PIPELINE_STAGE_CODES]);

  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'RIGHTS_RESTRICTED');

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-RESTRICTED');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
});

test('literature flow blocks ABSTRACT_READY when no trusted abstract source exists', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-NO-ABSTRACT', 'OA');

  const run = await service.triggerContentProcessingRun('LIT-FLOW-NO-ABSTRACT', ['ABSTRACT_READY']);
  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'FAILED');
  assert.equal(terminal.errorCode, 'ABSTRACT_SOURCE_MISSING');

  const literature = await repository.findLiteratureById('LIT-FLOW-NO-ABSTRACT');
  assert.equal(literature?.abstractText, null);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-NO-ABSTRACT');
  const abstractStage = stageStates.find((item) => item.stageCode === 'ABSTRACT_READY');
  assert.equal(abstractStage?.status, 'BLOCKED');
});

test('literature flow blocks KEY_CONTENT_READY when no validated key content source exists', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-NO-KEY', 'OA', {
    abstractText: 'Trusted abstract for key-content prerequisite.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-NO-KEY', [
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
    'KEY_CONTENT_READY',
  ]);
  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'KEY_CONTENT_SOURCE_MISSING');

  const literature = await repository.findLiteratureById('LIT-FLOW-NO-KEY');
  assert.equal(literature?.keyContentDigest, null);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-NO-KEY');
  const keyStage = stageStates.find((item) => item.stageCode === 'KEY_CONTENT_READY');
  assert.equal(keyStage?.status, 'BLOCKED');
});

test('literature flow treats STALE as artifact-present and exposes rerun actions', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-STALE', 'OA');
  const now = new Date().toISOString();
  await repository.upsertPipelineState({
    id: 'state-stale',
    literatureId: 'LIT-FLOW-STALE',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-fulltext-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'FULLTEXT_PREPROCESSED',
    status: 'STALE',
    lastRunId: null,
    detail: { reason_code: 'INPUT_STALE' },
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-embedded-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'EMBEDDED',
    status: 'SUCCEEDED',
    lastRunId: null,
    detail: {},
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-indexed-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'INDEXED',
    status: 'STALE',
    lastRunId: null,
    detail: { reason_code: 'UPSTREAM_STALE' },
    updatedAt: now,
  });

  const state = await repository.findPipelineStateByLiteratureId('LIT-FLOW-STALE');
  assert.ok(state);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-STALE');
  const dto = service.buildPipelineStateDTO(state, stageStates);
  const statusMap = service.buildStageStatusMap(stageStates);
  const actions = service.buildOverviewPipelineActions({
    topicScopeStatus: 'in_scope',
    rightsClass: 'OA',
    pipelineState: dto,
    stageStatusMap: statusMap,
  });

  assert.equal(dto.fulltext_preprocessed, true);
  assert.equal(dto.indexed, true);
  assert.equal(actions.process_content.enabled, true);
  assert.equal(actions.rebuild_index.enabled, true);
  assert.deepEqual(actions.retry_failed.requested_stages, ['FULLTEXT_PREPROCESSED', 'INDEXED']);
  assert.equal(actions.view_reason.enabled, true);
});

test('literature flow rerun overwrites existing stage artifact instead of duplicating it', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-RERUN', 'OA', {
    abstractText: 'Trusted abstract for rerun artifact overwrite validation.',
  });

  const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-RERUN', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
  assert.equal(firstTerminal.status, 'SUCCESS');

  const firstArtifact = await repository.findPipelineArtifact(
    'LIT-FLOW-RERUN',
    'FULLTEXT_PREPROCESSED',
    'PREPROCESSED_TEXT',
  );
  assert.ok(firstArtifact);

  const literature = await repository.findLiteratureById('LIT-FLOW-RERUN');
  assert.ok(literature);
  await repository.updateLiterature({
    ...literature,
    keyContentDigest: 'Updated digest for rerun artifact overwrite validation.',
    updatedAt: new Date().toISOString(),
  });

  const secondRun = await service.triggerContentProcessingRun('LIT-FLOW-RERUN', ['FULLTEXT_PREPROCESSED']);
  const secondTerminal = await waitForTerminalRun(repository, secondRun.run_id);
  assert.equal(secondTerminal.status, 'SUCCESS');

  const secondArtifact = await repository.findPipelineArtifact(
    'LIT-FLOW-RERUN',
    'FULLTEXT_PREPROCESSED',
    'PREPROCESSED_TEXT',
  );
  assert.ok(secondArtifact);
  assert.equal(secondArtifact.id, firstArtifact.id);
  assert.notEqual(secondArtifact.checksum, firstArtifact.checksum);

  const artifacts = await repository.listPipelineArtifactsByLiteratureId('LIT-FLOW-RERUN');
  const preprocessedArtifacts = artifacts.filter(
    (item) => item.stageCode === 'FULLTEXT_PREPROCESSED' && item.artifactType === 'PREPROCESSED_TEXT',
  );
  assert.equal(preprocessedArtifacts.length, 1);
});

test('literature flow enforces USER_AUTH gate by global env switch', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-USER-AUTH', 'USER_AUTH', {
    abstractText: 'Trusted abstract for user-auth rights gate.',
  });

  const previous = process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED;
  process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = 'false';

  try {
    const blockedRun = await service.triggerContentProcessingRun('LIT-FLOW-USER-AUTH', ['FULLTEXT_PREPROCESSED']);
    const blockedTerminal = await waitForTerminalRun(repository, blockedRun.run_id);
    assert.equal(blockedTerminal.status, 'FAILED');
    assert.equal(blockedTerminal.errorCode, 'USER_AUTH_DISABLED');

    process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = 'true';
    const allowedRun = await service.triggerContentProcessingRun('LIT-FLOW-USER-AUTH', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
    const allowedTerminal = await waitForTerminalRun(repository, allowedRun.run_id);
    assert.equal(allowedTerminal.status, 'SUCCESS');
  } finally {
    if (previous === undefined) {
      delete process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED;
    } else {
      process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = previous;
    }
  }
});

test('literature flow creates new embedding versions on rerun and switches active version after INDEXED success', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-VERSIONING', 'OA', {
    abstractText: 'Trusted abstract for embedding versioning.',
    keyContentDigest: 'Trusted key content digest for embedding versioning.',
  });

  const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
  const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
  assert.equal(firstTerminal.status, 'SUCCESS');

  const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-VERSIONING');
  assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
  const activeAfterFirst = literatureAfterFirst.activeEmbeddingVersionId!;

  const literature = await repository.findLiteratureById('LIT-FLOW-VERSIONING');
  assert.ok(literature);
  await repository.updateLiterature({
    ...literature,
    keyContentDigest: 'Versioning test digest updated for rerun.',
    updatedAt: new Date().toISOString(),
  });

  const secondRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
  const secondTerminal = await waitForTerminalRun(repository, secondRun.run_id);
  assert.equal(secondTerminal.status, 'SUCCESS');

  const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-VERSIONING']);
  assert.equal(versions.length, 4);
  assert.equal(versions[3]?.versionNo, 4);

  const literatureAfterSecond = await repository.findLiteratureById('LIT-FLOW-VERSIONING');
  assert.ok(literatureAfterSecond?.activeEmbeddingVersionId);
  assert.notEqual(literatureAfterSecond?.activeEmbeddingVersionId, activeAfterFirst);

  const oldVersion = await repository.findEmbeddingVersionById(activeAfterFirst);
  assert.ok(oldVersion);
});

test('literature flow keeps active embedding version unchanged when INDEXED stage fails', async () => {
  class FailingTokenIndexRepository extends InMemoryLiteratureRepository {
    failTokenWrite = false;

    override async createEmbeddingTokenIndexes(records: Parameters<InMemoryLiteratureRepository['createEmbeddingTokenIndexes']>[0]) {
      if (this.failTokenWrite) {
        throw new Error('token-index write failed');
      }
      return super.createEmbeddingTokenIndexes(records);
    }
  }

  const repository = new FailingTokenIndexRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-ACTIVE-GUARD', 'OA', {
    abstractText: 'Trusted abstract for active version guard.',
    keyContentDigest: 'Trusted key content digest for active version guard.',
  });

  const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-ACTIVE-GUARD', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
  const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
  assert.equal(firstTerminal.status, 'SUCCESS');

  const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
  assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
  const activeVersionBeforeFailure = literatureAfterFirst.activeEmbeddingVersionId;

  repository.failTokenWrite = true;
  const failedRun = await service.triggerContentProcessingRun('LIT-FLOW-ACTIVE-GUARD', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
  const failedTerminal = await waitForTerminalRun(repository, failedRun.run_id);
  assert.equal(failedTerminal.status, 'PARTIAL');

  const literatureAfterFailure = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
  assert.equal(literatureAfterFailure?.activeEmbeddingVersionId, activeVersionBeforeFailure);
});
