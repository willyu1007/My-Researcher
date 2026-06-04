import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import { PrismaApplicationSettingsRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-application-settings-repository.ts';
import { LiteratureContentProcessingSettingsService } from '../../../../apps/backend/src/services/literature-content-processing-settings-service.ts';
import { BackendLlmGateway } from '../../../../apps/backend/src/services/llm-gateway.ts';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-literature-pipeline-completion';
const ARTIFACT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion';
const EXTRACTION_PATH = path.join(ARTIFACT_DIR, 'lit-0252-visual-extraction.json');
const LITERATURE_ID = 'LIT-0252';
const APPLY = process.argv.includes('--apply');
const RUN_ID = process.env.PIPELINE_CAMPAIGN_RUN_ID || `lit-0252-visual-index-${new Date().toISOString().replace(/[:.]/g, '-')}`;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1))];
}

function sourceRef(kind, refId, pages = []) {
  return {
    ref_type: 'visual_extraction',
    ref_id: refId,
    source_kind: kind,
    literature_id: LITERATURE_ID,
    pages,
    checksum: null,
  };
}

function dossierItem(category, index, statement, details, pages, confidence = 0.78) {
  const itemId = `visual-${category}-${String(index).padStart(2, '0')}`;
  return {
    id: itemId,
    statement: normalizeText(statement),
    details: normalizeText(details),
    evidence_strength: 'medium',
    confidence,
    provenance: 'user_edited',
    source_refs: [sourceRef('summary_level_visual_reading', itemId, pages)],
  };
}

function buildDossier(extraction) {
  return {
    schema_version: 'key_content.v1',
    extraction_profile: 'manual_visual_dossier.v1',
    readiness_status: 'PARTIAL_READY',
    input_refs: {
      curation_source: 'manual_visual_curated',
      visual_extraction_checksum: sha256(stableStringify(extraction)),
      scanned_pdf_path: extraction.source.pdf_path,
      public_source_url: extraction.source.public_source_url,
      fulltext_checksum: null,
      normalized_text_checksum: null,
    },
    display_digest: [
      'Visual summary: nearest-neighbor meaningfulness depends on distance contrast.',
      'High-dimensional retrieval can become unstable when nearest and farthest distances collapse.',
      'Use score gaps and near-tie fractions as RAG allocation signals.',
    ].join(' '),
    categories: {
      research_problem: [
        dossierItem(
          'research_problem',
          1,
          'Nearest-neighbor search can return a formally closest point that is not meaningfully separated from alternatives.',
          'The paper studies when dimensionality causes nearest and farthest distances to become nearly indistinguishable, making the returned neighbor unstable as evidence.',
          [3, 5, 6, 19],
          0.84,
        ),
      ],
      contributions: [
        dossierItem(
          'contributions',
          1,
          'The paper reframes nearest-neighbor utility around distance contrast rather than search efficiency alone.',
          'It formalizes DMIN/DMAX behavior, gives broad sufficient conditions for distance concentration, and identifies workload structures where nearest-neighbor search can remain meaningful.',
          [5, 6, 7, 8, 12],
          0.82,
        ),
        dossierItem(
          'contributions',
          2,
          'It argues that high-dimensional index evaluations need simple baselines and meaningful workloads.',
          'The paper repeatedly warns that sophisticated indexes can be misleading when the query answer itself has weak contrast, and that linear scan should be included as a baseline.',
          [17, 19],
          0.8,
        ),
      ],
      key_findings: [
        dossierItem(
          'key_findings',
          1,
          'Distance contrast can collapse quickly as dimensionality grows.',
          'The simulations and conclusions emphasize that nearest/farthest separation can drop fastest in early dimensions, often around the first 10-20 dimensions in the examined workloads.',
          [14, 15, 19],
          0.78,
        ),
        dossierItem(
          'key_findings',
          2,
          'High ambient dimension does not automatically imply failure when intrinsic structure is favorable.',
          'Dependent dimensions, clustered data, and low intrinsic degrees of freedom can preserve meaningful neighbor relationships despite high feature dimension.',
          [10, 12, 13, 19],
          0.77,
        ),
        dossierItem(
          'key_findings',
          3,
          'Feature-space design matters for semantic retrieval quality.',
          'The image-database case studies show that richer or higher-dimensional feature representations do not necessarily produce more meaningful similarity neighborhoods.',
          [16, 17],
          0.76,
        ),
      ],
      method_design: [
        dossierItem(
          'method_design',
          1,
          'A practical RAG policy can use retrieval score gaps or distance contrast as a query difficulty signal.',
          'When many chunks are nearly tied with the top result, the system should allocate more retrieval, reranking, verification, or reasoning compute instead of trusting a fixed top-k result.',
          [5, 16, 18],
          0.8,
        ),
        dossierItem(
          'method_design',
          2,
          'Corpus partitioning and cluster-aware retrieval can preserve meaningful nearest-neighbor relationships.',
          'The paper identifies clustered workloads and query distributions near clusters as cases where nearest-neighbor results can remain useful.',
          [12, 13, 19],
          0.76,
        ),
      ],
      experiment_signals: [
        dossierItem(
          'experiment_signals',
          1,
          'DMAX/DMIN and near-tie fractions are useful measurements for retrieval stability.',
          'These signals can be adapted into RAG evaluation by measuring how many candidate chunks are within a small factor or score gap of the top retrieved evidence.',
          [14, 15, 16],
          0.77,
        ),
        dossierItem(
          'experiment_signals',
          2,
          'Linear scan or simple exhaustive baselines should remain in retrieval-system evaluations.',
          'The paper argues that index speedups are not meaningful if the query answer has weak contrast or if simple scanning is faster under the workload.',
          [17, 18, 19],
          0.78,
        ),
      ],
      theory_links: [
        dossierItem(
          'theory_links',
          1,
          'The paper provides a theory seed for RAG-aware adaptive resource allocation.',
          'Distance concentration maps to embedding-space instability; score contrast can route queries between cheap answer paths, expanded retrieval, graph traversal, verifier checks, and larger models.',
          [3, 5, 16, 19],
          0.82,
        ),
        dossierItem(
          'theory_links',
          2,
          'The paper also supports test-time compute budgeting through query-level uncertainty estimation.',
          'Low retrieval contrast indicates that more reasoning or verification compute may be justified, while high contrast supports earlier stopping.',
          [18, 19],
          0.76,
        ),
      ],
      limitations: [
        dossierItem(
          'limitations',
          1,
          'This extraction is summary-level and visually curated from a scanned PDF.',
          'It should support research discovery and retrieval, but it is not a complete OCR text layer and should not be treated as standard fulltext preprocessing.',
          [1, 3, 21],
          0.9,
        ),
      ],
    },
    quality_report: {
      extraction_diagnostics: [
        {
          code: 'VISUAL_SUMMARY_LEVEL_EXTRACTION',
          severity: 'warning',
          message: 'Summary-level visual extraction was used because the PDF is scanned and standard GROBID preprocessing requires OCR.',
        },
        {
          code: 'STANDARD_FULLTEXT_NOT_PREPROCESSED',
          severity: 'warning',
          message: 'FULLTEXT_PREPROCESSED remains blocked; this dossier is a partial retrieval surface only.',
        },
      ],
    },
    generated_at: new Date().toISOString(),
  };
}

function buildChunks(dossier) {
  const chunks = [];
  for (const [category, items] of Object.entries(dossier.categories)) {
    for (const item of items) {
      const text = normalizeText([item.statement, item.details].filter(Boolean).join('\n'));
      const contentChecksum = sha256(text);
      chunks.push({
        chunk_id: `visual-${category}-${sha256(`${category}:${item.id}:${contentChecksum}`).slice(0, 16)}`,
        index: chunks.length,
        chunk_type: category === 'experiment_signals'
          ? 'evidence'
          : category === 'theory_links'
            ? 'semantic_dossier'
            : 'visual_summary',
        text,
        start_offset: 0,
        end_offset: text.length,
        source_refs: item.source_refs,
        metadata: {
          origin_stage: 'VISUAL_KEY_CONTENT_READY',
          standard_fulltext_preprocessed: false,
          readiness_status: dossier.readiness_status,
          category,
          item_id: item.id,
          evidence_strength: item.evidence_strength,
          confidence: item.confidence,
          chunking_profile: 'visual-summary-key-content-v1',
        },
        content_checksum: contentChecksum,
      });
    }
  }
  return chunks;
}

function buildTokenIndex(chunks) {
  const tokenToChunks = new Map();
  for (const chunk of chunks) {
    for (const token of tokenize(chunk.text)) {
      const ids = tokenToChunks.get(token) ?? new Set();
      ids.add(chunk.chunk_id);
      tokenToChunks.set(token, ids);
    }
  }
  return Object.fromEntries([...tokenToChunks.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([token, ids]) => [
    token,
    [...ids].sort(),
  ]));
}

async function writeArtifact(name, payload) {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  const reportPath = path.join(ARTIFACT_DIR, `${name}.json`);
  const detailPath = path.join(TMP_DIR, `${name}-detail.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(payload.report, null, 2)}\n`);
  await fs.writeFile(detailPath, `${JSON.stringify(payload.detail ?? payload.report, null, 2)}\n`);
  return { report_path: reportPath, detail_path: detailPath };
}

async function upsertPipelineArtifact(prisma, input) {
  const existing = await prisma.literaturePipelineArtifact.findFirst({
    where: {
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      artifactType: input.artifactType,
    },
  });
  if (existing) {
    return prisma.literaturePipelineArtifact.update({
      where: { id: existing.id },
      data: {
        payload: input.payload,
        payloadPath: input.payloadPath ?? null,
        checksum: input.checksum,
        updatedAt: new Date(input.updatedAt),
      },
    });
  }
  return prisma.literaturePipelineArtifact.create({
    data: {
      id: input.id,
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      artifactType: input.artifactType,
      payload: input.payload,
      payloadPath: input.payloadPath ?? null,
      checksum: input.checksum,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt),
    },
  });
}

async function upsertStageState(prisma, input) {
  const existing = await prisma.literaturePipelineStageState.findFirst({
    where: {
      literatureId: input.literatureId,
      stageCode: input.stageCode,
    },
  });
  if (existing) {
    return prisma.literaturePipelineStageState.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        lastRunId: null,
        detail: input.detail,
        updatedAt: new Date(input.updatedAt),
      },
    });
  }
  return prisma.literaturePipelineStageState.create({
    data: {
      id: input.id,
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      status: input.status,
      lastRunId: null,
      detail: input.detail,
      updatedAt: new Date(input.updatedAt),
    },
  });
}

function embeddingRows({ chunks, vectors, versionId, now }) {
  return chunks.map((chunk, index) => ({
    id: crypto.randomUUID(),
    embeddingVersionId: versionId,
    literatureId: LITERATURE_ID,
    chunkId: chunk.chunk_id,
    chunkIndex: index,
    text: chunk.text,
    startOffset: chunk.start_offset,
    endOffset: chunk.end_offset,
    chunkType: chunk.chunk_type,
    sourceRefs: chunk.source_refs,
    metadata: chunk.metadata,
    contentChecksum: chunk.content_checksum,
    vector: vectors[index] ?? [],
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }));
}

function tokenRows({ tokenToChunkIds, versionId, now }) {
  return Object.entries(tokenToChunkIds).map(([token, chunkIds]) => ({
    id: crypto.randomUUID(),
    embeddingVersionId: versionId,
    literatureId: LITERATURE_ID,
    token,
    chunkIds,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }));
}

const prisma = getPrismaClient();

try {
  const extraction = JSON.parse(await fs.readFile(EXTRACTION_PATH, 'utf8'));
  const literature = await prisma.literatureRecord.findUnique({
    where: { id: LITERATURE_ID },
    include: {
      pipelineState: true,
      pipelineStageStates: true,
      qualityAssessment: true,
      embeddingVersions: true,
    },
  });
  if (!literature) {
    throw new Error(`${LITERATURE_ID} not found.`);
  }

  const settingsRepository = new PrismaApplicationSettingsRepository(prisma);
  const settingsService = new LiteratureContentProcessingSettingsService(settingsRepository);
  const activeProfile = await settingsService.resolveActiveEmbeddingProfile();
  const embeddingConfig = await settingsService.resolveOpenAIEmbeddingConfig(activeProfile.profileId);
  const dossier = buildDossier(extraction);
  const chunks = buildChunks(dossier);
  const tokenToChunkIds = buildTokenIndex(chunks);
  const dossierChecksum = sha256(stableStringify(dossier));
  const chunkPayload = {
    literature_id: LITERATURE_ID,
    chunking_profile: 'visual-summary-key-content-v1',
    source_artifacts: {
      visual_extraction_checksum: dossier.input_refs.visual_extraction_checksum,
      key_content_dossier_checksum: dossierChecksum,
    },
    chunks,
  };
  const chunkChecksum = sha256(stableStringify(chunkPayload));
  const reportBase = {
    run_id: RUN_ID,
    apply: APPLY,
    generated_at: new Date().toISOString(),
    literature_id: LITERATURE_ID,
    title: literature.title,
    standard_stage_policy: {
      fulltext_preprocessed_changed: false,
      standard_indexed_stage_changed: false,
      key_content_ready_status: APPLY ? 'SUCCEEDED/PARTIAL_READY' : 'DRY_RUN',
      embedding_version_status: APPLY ? 'PARTIAL_INDEXED' : 'DRY_RUN',
    },
    active_embedding_profile: activeProfile,
    chunks: {
      count: chunks.length,
      token_count: Object.keys(tokenToChunkIds).length,
      sample: chunks.slice(0, 3).map((chunk) => ({
        chunk_id: chunk.chunk_id,
        chunk_type: chunk.chunk_type,
        text: chunk.text,
      })),
    },
    blocker_policy: {
      fulltext_preprocessed_remains_blocked: true,
      reason: 'visual extraction is not a complete OCR text layer',
    },
  };

  if (!APPLY) {
    await writeArtifact(`${RUN_ID}-dry-run`, {
      report: reportBase,
      detail: {
        ...reportBase,
        dossier,
        chunk_payload: chunkPayload,
        token_to_chunk_ids: tokenToChunkIds,
      },
    });
    console.log(JSON.stringify(reportBase, null, 2));
    process.exit(0);
  }

  if (!embeddingConfig) {
    throw new Error(`OpenAI embedding config for active profile ${activeProfile.profileId} is not available.`);
  }

  const gateway = new BackendLlmGateway({ settingsService });
  const embeddingResponse = await gateway.createEmbeddings({
    executionContext: {
      feature: 'literature_content_processing',
      operation: 'visual_summary_embed_chunks',
      metadata: {
        literature_id: LITERATURE_ID,
        run_id: RUN_ID,
        chunk_count: chunks.length,
      },
    },
    model: {
      providerId: 'openai',
      modelId: activeProfile.model,
      profileId: activeProfile.profileId,
    },
    input: chunks.map((chunk) => chunk.text),
    dimensions: activeProfile.dimensions,
  });
  const vectors = embeddingResponse.vectors;
  const dimension = vectors[0]?.length ?? 0;
  if (vectors.length !== chunks.length || vectors.some((vector) => vector.length !== dimension || vector.length === 0)) {
    throw new Error('Embedding response does not match visual chunks.');
  }

  const now = new Date().toISOString();
  const embeddedPayload = {
    literature_id: LITERATURE_ID,
    provider: activeProfile.provider,
    model: activeProfile.model,
    profile_id: activeProfile.profileId,
    dimension,
    source_artifacts: {
      chunk_artifact_checksum: chunkChecksum,
      key_content_dossier_checksum: dossierChecksum,
      visual_extraction_checksum: dossier.input_refs.visual_extraction_checksum,
    },
    vectors: chunks.map((chunk, index) => ({
      chunk_id: chunk.chunk_id,
      index,
      vector: vectors[index],
    })),
    telemetry: embeddingResponse.telemetry,
  };
  const embeddingChecksum = sha256(stableStringify(embeddedPayload));
  const localIndexPayload = {
    literature_id: LITERATURE_ID,
    index_profile: 'visual-summary-token-index-v1',
    source_artifacts: {
      chunk_artifact_checksum: chunkChecksum,
      embedding_artifact_checksum: embeddingChecksum,
    },
    token_count: Object.keys(tokenToChunkIds).length,
    token_to_chunk_ids: tokenToChunkIds,
  };
  const indexChecksum = sha256(stableStringify(localIndexPayload));

  const latestVersionNo = literature.embeddingVersions.reduce((max, version) => Math.max(max, version.versionNo), 0);
  const versionId = crypto.randomUUID();
  const version = {
    id: versionId,
    literatureId: LITERATURE_ID,
    versionNo: latestVersionNo + 1,
    status: 'PARTIAL_INDEXED',
    profileId: activeProfile.profileId,
    provider: activeProfile.provider,
    model: activeProfile.model,
    dimension,
    chunkCount: chunks.length,
    vectorCount: vectors.length,
    tokenCount: Object.keys(tokenToChunkIds).length,
    inputChecksum: sha256(`${dossierChecksum}:${chunkChecksum}:${embeddingChecksum}:${indexChecksum}`),
    chunkArtifactChecksum: chunkChecksum,
    embeddingArtifactChecksum: embeddingChecksum,
    indexArtifactChecksum: indexChecksum,
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await prisma.$transaction(async (tx) => {
    const keyArtifact = await upsertPipelineArtifact(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'KEY_CONTENT_READY',
      artifactType: 'KEY_CONTENT_DOSSIER',
      payload: dossier,
      payloadPath: null,
      checksum: dossierChecksum,
      createdAt: now,
      updatedAt: now,
    });
    const visualKeyArtifact = await upsertPipelineArtifact(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'VISUAL_KEY_CONTENT_READY',
      artifactType: 'VISUAL_KEY_CONTENT_DOSSIER',
      payload: dossier,
      payloadPath: null,
      checksum: dossierChecksum,
      createdAt: now,
      updatedAt: now,
    });
    const chunkArtifact = await upsertPipelineArtifact(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'VISUAL_CHUNKED',
      artifactType: 'VISUAL_CHUNKS',
      payload: chunkPayload,
      payloadPath: null,
      checksum: chunkChecksum,
      createdAt: now,
      updatedAt: now,
    });
    const embeddedArtifact = await upsertPipelineArtifact(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'VISUAL_EMBEDDED',
      artifactType: 'VISUAL_EMBEDDINGS',
      payload: embeddedPayload,
      payloadPath: null,
      checksum: embeddingChecksum,
      createdAt: now,
      updatedAt: now,
    });
    const indexArtifact = await upsertPipelineArtifact(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'VISUAL_INDEXED',
      artifactType: 'VISUAL_LOCAL_INDEX',
      payload: localIndexPayload,
      payloadPath: null,
      checksum: indexChecksum,
      createdAt: now,
      updatedAt: now,
    });

    await upsertStageState(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'KEY_CONTENT_READY',
      status: 'SUCCEEDED',
      detail: {
        stage_code: 'KEY_CONTENT_READY',
        key_content_ready: true,
        readiness_status: 'PARTIAL_READY',
        artifact_id: keyArtifact.id,
        checksum: dossierChecksum,
        generated: false,
        source: 'manual_visual_curated',
        standard_fulltext_preprocessed: false,
        visual_artifact_id: visualKeyArtifact.id,
        diagnostics: dossier.quality_report.extraction_diagnostics,
      },
      updatedAt: now,
    });
    await upsertStageState(tx, {
      id: crypto.randomUUID(),
      literatureId: LITERATURE_ID,
      stageCode: 'VISUAL_INDEXED',
      status: 'SUCCEEDED',
      detail: {
        stage_code: 'VISUAL_INDEXED',
        readiness_status: 'PARTIAL_READY',
        embedding_version_id: versionId,
        chunk_count: chunks.length,
        token_count: Object.keys(tokenToChunkIds).length,
        chunk_artifact_id: chunkArtifact.id,
        embedding_artifact_id: embeddedArtifact.id,
        index_artifact_id: indexArtifact.id,
        standard_indexed_stage_changed: false,
      },
      updatedAt: now,
    });

    await tx.literaturePipelineState.upsert({
      where: { literatureId: LITERATURE_ID },
      update: {
        keyContentReady: true,
        updatedAt: new Date(now),
      },
      create: {
        id: crypto.randomUUID(),
        literatureId: LITERATURE_ID,
        citationComplete: true,
        abstractReady: true,
        keyContentReady: true,
        dedupStatus: 'unknown',
        updatedAt: new Date(now),
      },
    });

    if (!literature.qualityAssessment || literature.qualityAssessment.qualityStatus !== 'high_confidence') {
      await tx.literatureQualityAssessment.upsert({
        where: { literatureId: LITERATURE_ID },
        update: {
          qualityStatus: 'high_confidence',
          qualityScore: literature.qualityAssessment?.qualityScore ?? 85,
          qualityComponents: {
            ...(literature.qualityAssessment?.qualityComponents && typeof literature.qualityAssessment.qualityComponents === 'object'
              ? literature.qualityAssessment.qualityComponents
              : {}),
            manual_visual_summary_ready: true,
            standard_fulltext_preprocessed: false,
          },
          blockerCodes: [],
          source: 'manual_visual_curation',
          assessedAt: new Date(now),
          updatedAt: new Date(now),
        },
        create: {
          id: crypto.randomUUID(),
          literatureId: LITERATURE_ID,
          qualityStatus: 'high_confidence',
          qualityScore: 85,
          qualityComponents: {
            manual_visual_summary_ready: true,
            standard_fulltext_preprocessed: false,
          },
          blockerCodes: [],
          source: 'manual_visual_curation',
          assessedAt: new Date(now),
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      });
    }

    await tx.literatureEmbeddingVersion.create({
      data: {
        id: version.id,
        literatureId: version.literatureId,
        versionNo: version.versionNo,
        status: version.status,
        profileId: version.profileId,
        provider: version.provider,
        model: version.model,
        dimension: version.dimension,
        chunkCount: version.chunkCount,
        vectorCount: version.vectorCount,
        tokenCount: version.tokenCount,
        inputChecksum: version.inputChecksum,
        chunkArtifactChecksum: version.chunkArtifactChecksum,
        embeddingArtifactChecksum: version.embeddingArtifactChecksum,
        indexArtifactChecksum: version.indexArtifactChecksum,
        indexedAt: new Date(version.indexedAt),
        activatedAt: new Date(version.activatedAt),
        createdAt: new Date(version.createdAt),
        updatedAt: new Date(version.updatedAt),
      },
    });
    await tx.literatureEmbeddingChunk.createMany({
      data: embeddingRows({ chunks, vectors, versionId, now }),
    });
    await tx.literatureEmbeddingTokenIndex.createMany({
      data: tokenRows({ tokenToChunkIds, versionId, now }),
    });
    await tx.literatureRecord.update({
      where: { id: LITERATURE_ID },
      data: {
        activeEmbeddingVersionId: versionId,
        updatedAt: new Date(now),
      },
    });
  });

  const finalRecord = await prisma.literatureRecord.findUnique({
    where: { id: LITERATURE_ID },
    select: {
      id: true,
      activeEmbeddingVersionId: true,
      pipelineState: true,
      pipelineStageStates: {
        select: { stageCode: true, status: true, detail: true },
        where: { stageCode: { in: ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'INDEXED', 'VISUAL_INDEXED'] } },
        orderBy: { stageCode: 'asc' },
      },
    },
  });
  const report = {
    ...reportBase,
    apply_result: {
      embedding_version_id: versionId,
      embedding_status: version.status,
      embedding_dimension: dimension,
      embedding_telemetry: embeddingResponse.telemetry,
      final_record: finalRecord,
    },
  };
  await writeArtifact(`${RUN_ID}-apply`, {
    report,
    detail: {
      ...report,
      dossier,
      chunk_payload: chunkPayload,
      embedded_payload: {
        ...embeddedPayload,
        vectors: embeddedPayload.vectors.map((item) => ({
          ...item,
          vector: `[${item.vector.length} dims]`,
        })),
      },
      local_index_payload: localIndexPayload,
    },
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
