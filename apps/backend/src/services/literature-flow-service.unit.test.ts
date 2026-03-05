import assert from 'node:assert/strict';
import test from 'node:test';
import type { RightsClass } from '@paper-engineering-assistant/shared';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import { LiteratureFlowService, PIPELINE_STAGE_CODES } from './literature-flow-service.js';

async function seedLiterature(
  repository: LiteratureRepository,
  literatureId: string,
  rightsClass: RightsClass,
): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: literatureId,
    title: `Pipeline ${literatureId}`,
    abstractText: null,
    keyContentDigest: null,
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
  await seedLiterature(repository, 'LIT-FLOW-1', 'OA');

  const run = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-1',
    triggerSource: 'MANUAL_IMPORT',
    requestedStages: [...PIPELINE_STAGE_CODES],
  });

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
  await seedLiterature(repository, 'LIT-FLOW-RESTRICTED', 'RESTRICTED');

  const run = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-RESTRICTED',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: [...PIPELINE_STAGE_CODES],
  });

  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'RIGHTS_RESTRICTED');

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-RESTRICTED');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
});

test('literature flow rerun overwrites existing stage artifact instead of duplicating it', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-RERUN', 'OA');

  const firstRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-RERUN',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED'],
  });
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

  const secondRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-RERUN',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['FULLTEXT_PREPROCESSED'],
  });
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
  await seedLiterature(repository, 'LIT-FLOW-USER-AUTH', 'USER_AUTH');

  const previous = process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED;
  process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED = 'false';

  try {
    const blockedRun = await service.handleLiteratureUpserted({
      literatureId: 'LIT-FLOW-USER-AUTH',
      triggerSource: 'OVERVIEW_ACTION',
      requestedStages: ['FULLTEXT_PREPROCESSED'],
    });
    const blockedTerminal = await waitForTerminalRun(repository, blockedRun.run_id);
    assert.equal(blockedTerminal.status, 'FAILED');
    assert.equal(blockedTerminal.errorCode, 'USER_AUTH_DISABLED');

    process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED = 'true';
    const allowedRun = await service.handleLiteratureUpserted({
      literatureId: 'LIT-FLOW-USER-AUTH',
      triggerSource: 'OVERVIEW_ACTION',
      requestedStages: ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED'],
    });
    const allowedTerminal = await waitForTerminalRun(repository, allowedRun.run_id);
    assert.equal(allowedTerminal.status, 'SUCCESS');
  } finally {
    if (previous === undefined) {
      delete process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED;
    } else {
      process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED = previous;
    }
  }
});

test('literature flow creates new embedding versions on rerun and switches active version after INDEXED success', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-VERSIONING', 'OA');

  const firstRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-VERSIONING',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
  });
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

  const secondRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-VERSIONING',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['FULLTEXT_PREPROCESSED', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
  });
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
  await seedLiterature(repository, 'LIT-FLOW-ACTIVE-GUARD', 'OA');

  const firstRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-ACTIVE-GUARD',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
  });
  const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
  assert.equal(firstTerminal.status, 'SUCCESS');

  const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
  assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
  const activeVersionBeforeFailure = literatureAfterFirst.activeEmbeddingVersionId;

  repository.failTokenWrite = true;
  const failedRun = await service.handleLiteratureUpserted({
    literatureId: 'LIT-FLOW-ACTIVE-GUARD',
    triggerSource: 'OVERVIEW_ACTION',
    requestedStages: ['FULLTEXT_PREPROCESSED', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
  });
  const failedTerminal = await waitForTerminalRun(repository, failedRun.run_id);
  assert.equal(failedTerminal.status, 'PARTIAL');

  const literatureAfterFailure = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
  assert.equal(literatureAfterFailure?.activeEmbeddingVersionId, activeVersionBeforeFailure);
});
