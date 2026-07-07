import type {
  CreateLiteratureContentProcessingRunRequest,
  CreateLiteratureContentProcessingRunResponse,
  DryRunImportLiteratureKeyContentDossierResponse,
  DownloadLiteratureContentAssetRequest,
  DownloadLiteratureContentAssetResponse,
  GetLiteratureContentProcessingResponse,
  GetLiteratureMetadataResponse,
  GetPaperLiteratureResponse,
  ImportLiteratureKeyContentDossierRequest,
  ImportLiteratureKeyContentDossierResponse,
  LiteratureClusterCandidateGenerationRequest,
  LiteratureClusterCandidateGenerationResponse,
  LiteratureKeyContentCurationBundleResponse,
  LiteratureCollectionImportRequest,
  LiteratureCollectionImportResponse,
  ListLiteratureClustersQuery,
  ListLiteratureClustersResponse,
  LiteratureOverviewQuery,
  LiteratureOverviewResponse,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
  ListLiteratureContentProcessingRunsQuery,
  ListLiteratureContentProcessingRunsResponse,
  ListLiteratureContentAssetsResponse,
  SyncPaperLiteratureFromTopicRequest,
  SyncPaperLiteratureFromTopicResponse,
  TopicLiteratureScopeResponse,
  UpdateTopicLiteratureEvidenceActivationRequest,
  UpdateLiteratureClusterRequest,
  UpdateLiteratureClusterResponse,
  UpdateLiteratureMetadataRequest,
  UpdateLiteratureMetadataResponse,
  UpdatePaperLiteratureLinkRequest,
  UpdatePaperLiteratureLinkResponse,
  UpsertTopicLiteratureScopeRequest,
  RegisterLiteratureContentAssetRequest,
  RegisterLiteratureContentAssetResponse,
  ZoteroImportRequest,
  ZoteroImportResponse,
  ZoteroPreviewRequest,
  ZoteroPreviewResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import type { LiteratureAutoAdvanceService } from '../services/literature-auto-advance-service.js';
import { LiteratureClusterService } from '../services/literature-cluster-service.js';
import { LiteratureService } from '../services/literature-service.js';

type TopicParams = {
  topicId: string;
};

type PaperParams = {
  id: string;
};

type PaperLinkParams = {
  id: string;
  linkId: string;
};

type LiteratureParams = {
  literatureId: string;
};

type ClusterParams = {
  clusterId: string;
};

export class LiteratureController {
  constructor(
    private readonly service: LiteratureService,
    private readonly clusterService: LiteratureClusterService,
    // T-130 W-06 (D8): optional import auto-advance gate for manual/Zotero imports. These carry
    // no auto-pull quality score, so they follow the advance_unscored setting (default none).
    private readonly autoAdvanceService?: LiteratureAutoAdvanceService,
  ) {}

  async collectionImport(
    request: FastifyRequest<{ Body: LiteratureCollectionImportRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.collectionImport(request.body);
      await this.autoAdvanceAfterImport(result.results);
      reply.status(200).send(result satisfies LiteratureCollectionImportResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  // Best-effort (the auto-advance service never throws); the outcome is not part of the import
  // response contract — it lands in the created backfill job records.
  private async autoAdvanceAfterImport(results: LiteratureCollectionImportResponse['results']): Promise<void> {
    if (!this.autoAdvanceService || results.length === 0) {
      return;
    }
    await this.autoAdvanceService.advanceAfterImport({
      source: 'collection_import',
      imported: results.map((item) => ({
        literatureId: item.literature_id,
        qualityScore: null,
        isNew: item.is_new,
      })),
    });
  }

  async zoteroCollectionImport(
    request: FastifyRequest<{ Body: ZoteroImportRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.zoteroCollectionImport(request.body);
      await this.autoAdvanceAfterImport(result.results);
      reply.status(200).send(result satisfies ZoteroImportResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async zoteroCollectionPreview(
    request: FastifyRequest<{ Body: ZoteroPreviewRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.zoteroCollectionPreview(request.body);
      reply.status(200).send(result satisfies ZoteroPreviewResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getOverview(
    request: FastifyRequest<{ Querystring: LiteratureOverviewQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getOverview(request.query);
      reply.status(200).send(result satisfies LiteratureOverviewResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getTopicScope(
    request: FastifyRequest<{ Params: TopicParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getTopicScope(request.params.topicId);
      reply.status(200).send(result satisfies TopicLiteratureScopeResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async upsertTopicScope(
    request: FastifyRequest<{ Params: TopicParams; Body: UpsertTopicLiteratureScopeRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.upsertTopicScope(request.params.topicId, request.body);
      reply.status(200).send(result satisfies TopicLiteratureScopeResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateTopicEvidenceActivation(
    request: FastifyRequest<{ Params: TopicParams; Body: UpdateTopicLiteratureEvidenceActivationRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateTopicEvidenceActivation(request.params.topicId, request.body);
      reply.status(200).send(result satisfies TopicLiteratureScopeResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async syncPaperFromTopic(
    request: FastifyRequest<{ Params: PaperParams; Body: SyncPaperLiteratureFromTopicRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.syncPaperLiteratureFromTopic(request.params.id, request.body);
      reply.status(200).send(result satisfies SyncPaperLiteratureFromTopicResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getPaperLiterature(
    request: FastifyRequest<{ Params: PaperParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getPaperLiterature(request.params.id);
      reply.status(200).send(result satisfies GetPaperLiteratureResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updatePaperLiteratureLink(
    request: FastifyRequest<{ Params: PaperLinkParams; Body: UpdatePaperLiteratureLinkRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updatePaperLiteratureLink(
        request.params.id,
        request.params.linkId,
        request.body,
      );
      reply.status(200).send(result satisfies UpdatePaperLiteratureLinkResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateLiteratureMetadata(
    request: FastifyRequest<{ Params: LiteratureParams; Body: UpdateLiteratureMetadataRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.updateLiteratureMetadata(
        request.params.literatureId,
        request.body,
      );
      reply.status(200).send(result satisfies UpdateLiteratureMetadataResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getLiteratureMetadata(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getLiteratureMetadata(request.params.literatureId);
      reply.status(200).send(result satisfies GetLiteratureMetadataResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async registerContentAsset(
    request: FastifyRequest<{ Params: LiteratureParams; Body: RegisterLiteratureContentAssetRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.registerContentAsset(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies RegisterLiteratureContentAssetResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async downloadContentAsset(
    request: FastifyRequest<{ Params: LiteratureParams; Body: DownloadLiteratureContentAssetRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.downloadContentAsset(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies DownloadLiteratureContentAssetResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listContentAssets(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listContentAssets(request.params.literatureId);
      reply.status(200).send(result satisfies ListLiteratureContentAssetsResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async retrieve(
    request: FastifyRequest<{ Body: LiteratureRetrieveRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.retrieveLiterature(request.body);
      reply.status(200).send(result satisfies LiteratureRetrieveResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async generateClusterCandidates(
    request: FastifyRequest<{ Body: LiteratureClusterCandidateGenerationRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.clusterService.generateCandidates(request.body);
      reply.status(200).send(result satisfies LiteratureClusterCandidateGenerationResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listClusters(
    request: FastifyRequest<{ Querystring: ListLiteratureClustersQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.clusterService.listClusters(request.query);
      reply.status(200).send(result satisfies ListLiteratureClustersResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async updateCluster(
    request: FastifyRequest<{ Params: ClusterParams; Body: UpdateLiteratureClusterRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.clusterService.updateCluster(request.params.clusterId, request.body);
      reply.status(200).send(result satisfies UpdateLiteratureClusterResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getContentProcessing(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getContentProcessing(request.params.literatureId);
      reply.status(200).send(result satisfies GetLiteratureContentProcessingResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async getKeyContentCurationBundle(
    request: FastifyRequest<{ Params: LiteratureParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.getKeyContentCurationBundle(request.params.literatureId);
      reply.status(200).send(result satisfies LiteratureKeyContentCurationBundleResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async importKeyContentDossier(
    request: FastifyRequest<{ Params: LiteratureParams; Body: ImportLiteratureKeyContentDossierRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.importKeyContentDossier(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies ImportLiteratureKeyContentDossierResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async dryRunImportKeyContentDossier(
    request: FastifyRequest<{ Params: LiteratureParams; Body: ImportLiteratureKeyContentDossierRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.dryRunImportKeyContentDossier(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies DryRunImportLiteratureKeyContentDossierResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async createContentProcessingRun(
    request: FastifyRequest<{ Params: LiteratureParams; Body: CreateLiteratureContentProcessingRunRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.createContentProcessingRun(request.params.literatureId, request.body);
      reply.status(200).send(result satisfies CreateLiteratureContentProcessingRunResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  async listContentProcessingRuns(
    request: FastifyRequest<{ Params: LiteratureParams; Querystring: ListLiteratureContentProcessingRunsQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const result = await this.service.listContentProcessingRuns(request.params.literatureId, request.query);
      reply.status(200).send(result satisfies ListLiteratureContentProcessingRunsResponse);
    } catch (error) {
      this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): void {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
}
