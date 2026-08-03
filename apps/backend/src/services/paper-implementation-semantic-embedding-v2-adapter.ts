import type {
  PaperImplementationSemanticEmbeddingV2Port,
  PaperImplementationSemanticEmbeddingResultV2,
} from './paper-implementation-semantic-index-v2-service.js';
import type {
  PaperImplementationSemanticQueryEmbeddingV2Port,
} from './paper-implementation-semantic-retrieval-v2-service.js';
import type { BackendLlmGateway } from './llm-gateway.js';
import { splitEmbeddingInputBatches } from './literature-content-processing-utils.js';

export interface PaperImplementationSemanticEmbeddingV2AdapterOptions {
  gateway: Pick<BackendLlmGateway, 'createEmbeddings'>;
}

/**
 * Reuses the application-wide embedding gateway used by literature/topic workflows.
 * Project authorization remains outside this adapter and must complete first.
 */
export class PaperImplementationSemanticEmbeddingV2Adapter
implements PaperImplementationSemanticEmbeddingV2Port,
PaperImplementationSemanticQueryEmbeddingV2Port {
  constructor(private readonly options: PaperImplementationSemanticEmbeddingV2AdapterOptions) {}

  async embedDocuments(
    input: Parameters<PaperImplementationSemanticEmbeddingV2Port['embedDocuments']>[0],
  ): Promise<PaperImplementationSemanticEmbeddingResultV2[]> {
    const texts = input.documents.map((document) => document.semantic_text);
    const batches = splitEmbeddingInputBatches(texts);
    const vectors: number[][] = new Array(input.documents.length);
    for (const batch of batches) {
      const response = await this.options.gateway.createEmbeddings({
        executionContext: {
          feature: 'paper_implementation_semantic_retrieval_v2',
          operation: 'rebuild_project_projection',
          metadata: {
            document_count: input.documents.length,
            batch_count: batches.length,
            batch_size: batch.length,
          },
        },
        model: {
          providerId: 'openai',
          modelId: input.profile.model,
          profileId: input.profile.profile_id,
        },
        input: batch.map((index) => texts[index]!),
        dimensions: input.profile.dimension,
        signal: input.signal,
      });
      for (let position = 0; position < batch.length; position += 1) {
        vectors[batch[position]!] = response.vectors[position]!;
      }
    }
    return input.documents.map((document, index) => ({
      document_id: document.document_id,
      vector: vectors[index] ?? [],
    }));
  }

  async embedQuery(
    input: Parameters<PaperImplementationSemanticQueryEmbeddingV2Port['embedQuery']>[0],
  ): Promise<number[]> {
    const response = await this.options.gateway.createEmbeddings({
      executionContext: {
        feature: 'paper_implementation_semantic_retrieval_v2',
        operation: 'embed_query',
        budget: { timeout_ms: 30_000 },
        metadata: { profile_id: input.profile.profile_id },
      },
      model: {
        providerId: 'openai',
        modelId: input.profile.model,
        profileId: input.profile.profile_id,
      },
      input: input.query,
      dimensions: input.profile.dimension,
      policy: { maxRetries: 0 },
      signal: input.signal,
    });
    return response.vectors[0] ?? [];
  }
}
