import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';

test('evidence activation classifies auto-pull scores with import and activation thresholds', () => {
  const service = new LiteratureEvidenceActivationService(new InMemoryLiteratureRepository());

  assert.deepEqual(service.classifyAutoPullScore(54), {
    importable: false,
    qualityStatus: 'low_confidence',
    activationStatus: 'excluded',
    reason: 'AUTO_PULL_SCORE_LT_IMPORT_THRESHOLD',
  });
  assert.deepEqual(service.classifyAutoPullScore(60), {
    importable: true,
    qualityStatus: 'medium_confidence',
    activationStatus: 'needs_review',
    reason: 'AUTO_PULL_SCORE_LT_ACTIVATION_THRESHOLD',
  });
  assert.deepEqual(service.classifyAutoPullScore(80), {
    importable: true,
    qualityStatus: 'high_confidence',
    activationStatus: 'eligible',
    reason: 'AUTO_PULL_SCORE_GTE_ACTIVATION_THRESHOLD',
  });
});

test('evidence activation promotes only indexed and key-content-ready eligible scopes to active', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureEvidenceActivationService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature({
    id: 'LIT-ACTIVE-1',
    title: 'Evidence Ready Work',
    abstractText: null,
    keyContentDigest: null,
    authors: ['Tester'],
    year: 2026,
    doiNormalized: '10.1000/evidence-ready',
    arxivId: null,
    normalizedTitle: 'evidence ready work',
    titleAuthorsYearHash: 'hash-evidence-ready',
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: 'EV-ACTIVE-1',
    createdAt: now,
    updatedAt: now,
  });
  await repository.createEmbeddingVersion({
    id: 'EV-ACTIVE-1',
    literatureId: 'LIT-ACTIVE-1',
    versionNo: 1,
    status: 'INDEXED',
    profileId: 'default',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimension: 3,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 4,
    inputChecksum: 'input',
    chunkArtifactChecksum: 'chunk',
    embeddingArtifactChecksum: 'embedding',
    indexArtifactChecksum: 'index',
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertPipelineState({
    id: 'pipeline-active-1',
    literatureId: 'LIT-ACTIVE-1',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  await repository.upsertQualityAssessment({
    id: 'quality-active-1',
    literatureId: 'LIT-ACTIVE-1',
    qualityStatus: 'high_confidence',
    qualityScore: 95,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertTopicScope({
    id: 'scope-active-1',
    topicId: 'topic-active',
    literatureId: 'LIT-ACTIVE-1',
    scopeStatus: 'in_scope',
    reason: 'test',
    activationStatus: 'eligible',
    activationReason: 'TEST_ELIGIBLE',
    activationScore: 95,
    activatedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await service.refreshAfterIndexed('LIT-ACTIVE-1');

  const [scope] = await repository.listTopicScopesByTopicId('topic-active');
  assert.equal(scope?.activationStatus, 'active');
  assert.equal(scope?.activationReason, 'EVIDENCE_READY');
  assert.notEqual(scope?.activatedAt, null);
});

test('evidence activation keeps medium-confidence eligible scopes out of active retrieval', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureEvidenceActivationService(repository);
  const now = new Date().toISOString();

  await repository.upsertQualityAssessment({
    id: 'quality-medium-1',
    literatureId: 'LIT-MEDIUM-1',
    qualityStatus: 'medium_confidence',
    qualityScore: 60,
    qualityComponents: { auto_pull_quality_score: 60 },
    blockerCodes: [],
    source: 'auto_pull',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertPipelineState({
    id: 'pipeline-medium-1',
    literatureId: 'LIT-MEDIUM-1',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });

  const readyIds = await service.filterEvidenceReadyLiteratureIds(['LIT-MEDIUM-1']);

  assert.equal(readyIds.has('LIT-MEDIUM-1'), false);
});

test('indexed assessment is a processing_complete marker, not a quality endorsement (T-130 W-10 D10)', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureEvidenceActivationService(repository);
  const now = new Date().toISOString();

  // Missing assessment → needs_review marker (previously high_confidence/100).
  const marker = await service.ensureIndexedAssessment('LIT-D10-UNSCORED');
  assert.equal(marker.qualityStatus, 'needs_review');
  assert.equal(marker.qualityScore, null);
  assert.equal(marker.source, 'content_processing');
  assert.equal(marker.qualityComponents.kind, 'processing_complete_marker');
  // The marker does not make the literature quality-active.
  assert.equal((await service.isEvidenceReady('LIT-D10-UNSCORED')).reason, 'QUALITY_NOT_ACTIVE');

  // Existing low_confidence rows are no longer resurrected to high/100.
  await repository.upsertQualityAssessment({
    id: 'quality-LIT-D10-LOW',
    literatureId: 'LIT-D10-LOW',
    qualityStatus: 'low_confidence',
    qualityScore: 30,
    qualityComponents: { auto_pull_quality_score: 30 },
    blockerCodes: [],
    source: 'auto_pull',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const kept = await service.ensureIndexedAssessment('LIT-D10-LOW');
  assert.equal(kept.qualityStatus, 'low_confidence');
  assert.equal(kept.qualityScore, 30);
  assert.equal(kept.source, 'auto_pull');
});

test('resolveRetrievalReadiness is the single source: reason chain + INDEXED-STALE freshness marker', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureEvidenceActivationService(repository);
  const now = new Date().toISOString();

  const seedReady = async (literatureId: string) => {
    await repository.createLiterature({
      id: literatureId,
      title: `Readiness fixture ${literatureId}`,
      abstractText: null,
      keyContentDigest: null,
      authors: ['Tester'],
      year: 2026,
      doiNormalized: `10.1000/${literatureId.toLowerCase()}`,
      arxivId: null,
      normalizedTitle: `readiness fixture ${literatureId.toLowerCase()}`,
      titleAuthorsYearHash: `hash-${literatureId}`,
      rightsClass: 'OA',
      tags: [],
      activeEmbeddingVersionId: `ev-${literatureId}`,
      createdAt: now,
      updatedAt: now,
    });
    await repository.upsertQualityAssessment({
      id: `quality-${literatureId}`,
      literatureId,
      qualityStatus: 'high_confidence',
      qualityScore: 90,
      qualityComponents: { test_fixture: true },
      blockerCodes: [],
      source: 'test_fixture',
      assessedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await repository.upsertPipelineState({
      id: `pipeline-${literatureId}`,
      literatureId,
      citationComplete: true,
      abstractReady: true,
      keyContentReady: true,
      dedupStatus: 'unique',
      updatedAt: now,
    });
    await repository.createEmbeddingVersion({
      id: `ev-${literatureId}`,
      literatureId,
      versionNo: 1,
      status: 'ACTIVE',
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimension: 3,
      chunkCount: 1,
      vectorCount: 1,
      tokenCount: 4,
      inputChecksum: 'input',
      chunkArtifactChecksum: 'chunk',
      embeddingArtifactChecksum: 'embedding',
      indexArtifactChecksum: 'index',
      indexedAt: now,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  };

  // Fully ready + fresh.
  await seedReady('LIT-READY-FRESH');
  // Fully ready but INDEXED marked STALE by a content-invalidation chain.
  await seedReady('LIT-READY-STALE');
  await repository.upsertPipelineStageState({
    id: 'stage-lit-ready-stale',
    literatureId: 'LIT-READY-STALE',
    stageCode: 'INDEXED',
    status: 'STALE',
    lastRunId: null,
    detail: { reason_code: 'CITATION_UPDATED', reason_message: 'Citation fields changed after indexing.' },
    updatedAt: now,
  });
  // Quality gate fails first in the chain.
  await repository.upsertQualityAssessment({
    id: 'quality-LIT-QUALITY-BLOCKED',
    literatureId: 'LIT-QUALITY-BLOCKED',
    qualityStatus: 'medium_confidence',
    qualityScore: 60,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  // Quality passes but key content is not ready.
  await repository.upsertQualityAssessment({
    id: 'quality-LIT-NO-KEY-CONTENT',
    literatureId: 'LIT-NO-KEY-CONTENT',
    qualityStatus: 'high_confidence',
    qualityScore: 90,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertPipelineState({
    id: 'pipeline-LIT-NO-KEY-CONTENT',
    literatureId: 'LIT-NO-KEY-CONTENT',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: false,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  // Quality + key content pass but no activated embedding version.
  await repository.upsertQualityAssessment({
    id: 'quality-LIT-NO-INDEX',
    literatureId: 'LIT-NO-INDEX',
    qualityStatus: 'high_confidence',
    qualityScore: 90,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertPipelineState({
    id: 'pipeline-LIT-NO-INDEX',
    literatureId: 'LIT-NO-INDEX',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });

  const readiness = await service.resolveRetrievalReadiness([
    'LIT-READY-FRESH',
    'LIT-READY-STALE',
    'LIT-QUALITY-BLOCKED',
    'LIT-NO-KEY-CONTENT',
    'LIT-NO-INDEX',
    'LIT-UNKNOWN',
  ]);

  assert.deepEqual(readiness.get('LIT-READY-FRESH'), {
    ready: true,
    reason: 'EVIDENCE_READY',
    freshness: 'fresh',
    freshness_detail: null,
  });
  assert.deepEqual(readiness.get('LIT-READY-STALE'), {
    ready: true,
    reason: 'EVIDENCE_READY',
    freshness: 'stale',
    freshness_detail: {
      reason_code: 'CITATION_UPDATED',
      reason_message: 'Citation fields changed after indexing.',
    },
  });
  assert.equal(readiness.get('LIT-QUALITY-BLOCKED')?.reason, 'QUALITY_NOT_ACTIVE');
  assert.equal(readiness.get('LIT-NO-KEY-CONTENT')?.reason, 'KEY_CONTENT_NOT_READY');
  assert.equal(readiness.get('LIT-NO-INDEX')?.reason, 'INDEX_NOT_ACTIVE');
  assert.equal(readiness.get('LIT-UNKNOWN')?.ready, false);

  // Stale stays retrieval-ready (D7): the filter keeps it, only the marker travels.
  const readyIds = await service.filterEvidenceReadyLiteratureIds([
    'LIT-READY-FRESH',
    'LIT-READY-STALE',
    'LIT-QUALITY-BLOCKED',
  ]);
  assert.deepEqual([...readyIds].sort(), ['LIT-READY-FRESH', 'LIT-READY-STALE']);

  // isEvidenceReady delegates to the same source.
  assert.deepEqual(await service.isEvidenceReady('LIT-READY-STALE'), { active: true, reason: 'EVIDENCE_READY' });
  assert.deepEqual(await service.isEvidenceReady('LIT-QUALITY-BLOCKED'), { active: false, reason: 'QUALITY_NOT_ACTIVE' });
});

test('evidence activation centralizes retrieval and automatic processing workset policies', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureEvidenceActivationService(repository);
  const now = new Date().toISOString();

  for (const [literatureId, activationStatus] of [
    ['LIT-POLICY-ACTIVE', 'active'],
    ['LIT-POLICY-ELIGIBLE', 'eligible'],
    ['LIT-POLICY-REVIEW', 'needs_review'],
  ] as const) {
    await repository.upsertTopicScope({
      id: `scope-${literatureId}`,
      topicId: 'topic-policy',
      literatureId,
      scopeStatus: 'in_scope',
      reason: 'test',
      activationStatus,
      activationReason: 'TEST',
      activationScore: null,
      activatedAt: activationStatus === 'active' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    await repository.upsertPaperLiteratureLink({
      id: `paper-link-${literatureId}`,
      paperId: 'paper-policy',
      topicId: 'topic-policy',
      literatureId,
      citationStatus: 'seeded',
      note: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const [literatureId, qualityStatus] of [
    ['LIT-POLICY-GLOBAL-HIGH', 'high_confidence'],
    ['LIT-POLICY-GLOBAL-MEDIUM', 'medium_confidence'],
  ] as const) {
    await repository.upsertQualityAssessment({
      id: `quality-${literatureId}`,
      literatureId,
      qualityStatus,
      qualityScore: qualityStatus === 'high_confidence' ? 90 : 60,
      qualityComponents: { test_fixture: true },
      blockerCodes: [],
      source: 'test_fixture',
      assessedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await repository.upsertPaperLiteratureLink({
      id: `paper-link-${literatureId}`,
      paperId: 'paper-policy',
      topicId: null,
      literatureId,
      citationStatus: 'seeded',
      note: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  assert.deepEqual(
    [...await service.resolveTopicEvidenceActiveLiteratureIds('topic-policy')].sort(),
    ['LIT-POLICY-ACTIVE'],
  );
  assert.deepEqual(
    [...await service.resolveTopicAutomaticProcessingLiteratureIds('topic-policy')].sort(),
    ['LIT-POLICY-ACTIVE', 'LIT-POLICY-ELIGIBLE'],
  );
  assert.deepEqual(
    [...await service.filterGlobalAutomaticProcessingLiteratureIds([
      'LIT-POLICY-GLOBAL-HIGH',
      'LIT-POLICY-GLOBAL-MEDIUM',
    ])].sort(),
    ['LIT-POLICY-GLOBAL-HIGH'],
  );
  assert.deepEqual(
    [...await service.resolvePaperEvidenceCandidateLiteratureIds('paper-policy')].sort(),
    ['LIT-POLICY-ACTIVE', 'LIT-POLICY-GLOBAL-HIGH', 'LIT-POLICY-GLOBAL-MEDIUM'],
  );
  assert.deepEqual(
    [...await service.resolvePaperAutomaticProcessingLiteratureIds('paper-policy')].sort(),
    ['LIT-POLICY-ACTIVE', 'LIT-POLICY-ELIGIBLE', 'LIT-POLICY-GLOBAL-HIGH'],
  );
});
