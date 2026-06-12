import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  TOPIC_SELECTION_OUTPUT_SCHEMA_NAMES,
  TOPIC_SELECTION_PROMPT_TEMPLATE_IDS,
} from './topic-selection-llm-invocation-registry.js';

// T-123 Phase 1 lint guard. Static counterpart of the runtime gateway enforcement:
//  - every topic-selection prompt-template / output-schema literal must be registered in
//    topic-selection-llm-invocation-registry.ts;
//  - no hardcoded provider/model object literals outside the model-profile registry
//    (model selection must flow through TopicSelectionModelProfileRegistryService);
//  - no direct provider SDK imports outside the LLM gateway.

const servicesDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(servicesDir, '..', '..', '..', '..');
const sharedResearchLifecycleDir = path.join(repoRoot, 'packages', 'shared', 'src', 'research-lifecycle');

const MODEL_LITERAL_ALLOWLIST = new Set(['topic-selection-model-profile-registry-service.ts']);

type SourceFile = { name: string; content: string };

function topicSelectionSources(dir: string): SourceFile[] {
  return readdirSync(dir)
    .filter((name) => name.startsWith('topic-selection') && name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, content: readFileSync(path.join(dir, name), 'utf8') }));
}

function collectMatches(sources: SourceFile[], pattern: RegExp, group: number): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const source of sources) {
    for (const match of source.content.matchAll(pattern)) {
      const value = match[group]!;
      const existing = found.get(value) ?? [];
      existing.push(source.name);
      found.set(value, existing);
    }
  }
  return found;
}

const backendSources = topicSelectionSources(servicesDir);
const sharedSources = topicSelectionSources(sharedResearchLifecycleDir);
const allSources = [...backendSources, ...sharedSources];

test('every topic-selection prompt template literal is registered', () => {
  const pattern = /(promptTemplateId|prompt_template_id|PROMPT_TEMPLATE_ID|template_id)(?: =|:) '(topic-selection[^']*)'/g;
  const found = collectMatches(allSources, pattern, 2);
  const unregistered = [...found.entries()].filter(([id]) => !TOPIC_SELECTION_PROMPT_TEMPLATE_IDS.has(id));
  assert.deepEqual(
    unregistered,
    [],
    `unregistered topic-selection prompt templates: ${JSON.stringify(unregistered)} — register them in topic-selection-llm-invocation-registry.ts`,
  );
});

test('every topic-selection output schema literal is registered', () => {
  const pattern = /(schemaName|schema_name)(?: =|:) '([^']+)'/g;
  const found = collectMatches(allSources, pattern, 2);
  const topicScoped = [...found.entries()].filter(
    ([name]) => name.startsWith('topic_selection') || name.startsWith('TopicSelection'),
  );
  const unregistered = topicScoped.filter(([name]) => !TOPIC_SELECTION_OUTPUT_SCHEMA_NAMES.has(name));
  assert.deepEqual(
    unregistered,
    [],
    `unregistered topic-selection output schemas: ${JSON.stringify(unregistered)} — register them in topic-selection-llm-invocation-registry.ts`,
  );
});

test('no hardcoded provider/model object literals outside the model-profile registry', () => {
  const providerPattern = /(providerId|provider_id): '(openai|dashscope|deepseek)'\s*[,}]/g;
  const modelPattern = /(modelId|model_id): '[^']+'\s*[,}]/g;
  const offenders: Array<{ file: string; match: string }> = [];
  for (const source of allSources) {
    if (MODEL_LITERAL_ALLOWLIST.has(source.name)) {
      continue;
    }
    for (const match of source.content.matchAll(providerPattern)) {
      offenders.push({ file: source.name, match: match[0] });
    }
    for (const match of source.content.matchAll(modelPattern)) {
      offenders.push({ file: source.name, match: match[0] });
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `hardcoded provider/model literals found (resolve through TopicSelectionModelProfileRegistryService instead): ${JSON.stringify(offenders)}`,
  );
});

test('no provider SDK imports outside the llm gateway', () => {
  const offenders: string[] = [];
  for (const name of readdirSync(servicesDir)) {
    if (!name.endsWith('.ts') || name.endsWith('.test.ts') || name === 'llm-gateway.ts') {
      continue;
    }
    const content = readFileSync(path.join(servicesDir, name), 'utf8');
    if (/from 'openai'|require\('openai'\)/.test(content)) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, [], `provider SDK imported outside llm-gateway: ${JSON.stringify(offenders)}`);
});
