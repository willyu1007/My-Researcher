import type {
  LiteratureEmbeddingProfileDTO,
  LiteratureEmbeddingProfileId,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';

import {
  defaultLlmConfig,
  type LlmConfigReader,
} from './llm-config-loader.js';

const EMBEDDING_CALL_BY_PROFILE: Record<LiteratureEmbeddingProfileId, string> = {
  default: 'embedding-default',
  economy: 'embedding-economy',
};

/** Resolves a shipped embedding profile without creating a second fallback authority. */
export function configuredLiteratureEmbeddingProfile(
  profileId: LiteratureEmbeddingProfileId,
  llmConfig: LlmConfigReader = defaultLlmConfig(),
): LiteratureEmbeddingProfileDTO {
  const call = llmConfig.getCall('literature-processing', EMBEDDING_CALL_BY_PROFILE[profileId]);
  if (call.provider.id !== 'openai') {
    throw new Error(`literature-processing/${call.id} must use the supported openai embedding provider.`);
  }
  const dimensions = call.parameters.dimensions;
  if (dimensions !== null && dimensions !== undefined && (!Number.isInteger(dimensions) || Number(dimensions) <= 0)) {
    throw new Error(`literature-processing/${call.id} dimensions must be null or a positive integer.`);
  }
  return {
    profile_id: profileId,
    provider: 'openai',
    model: call.model,
    dimensions: dimensions === null || dimensions === undefined ? null : Number(dimensions),
  };
}
