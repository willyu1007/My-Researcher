import type { LlmPromptConfig } from './llm-config-loader.js';
import { defaultLlmConfig } from './llm-config-loader.js';

/** Loads prompt copy from `.ai/llm` while preserving persisted runtime identity contracts. */
export function paperImplementationPrompt(
  promptId: string,
  expectedVersion: string,
): LlmPromptConfig {
  const prompt = defaultLlmConfig().getPrompt('paper-implementation', promptId);
  if (prompt.version !== expectedVersion) {
    throw new Error(
      `Paper Implementation prompt version drift for ${promptId}: contract=${expectedVersion}, config=${prompt.version}.`,
    );
  }
  return prompt;
}
