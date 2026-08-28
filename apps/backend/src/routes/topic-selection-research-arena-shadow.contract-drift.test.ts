import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routeSource = fs.readFileSync(
  path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-arena-shadow-routes.ts'),
  'utf8',
);
const openapiSource = fs.readFileSync(path.join(repoRoot, 'docs/context/api/openapi.yaml'), 'utf8');

test('research arena shadow route and OpenAPI preserve non-provider support-only execution', () => {
  assert.match(routeSource, /\/topic-selection\/research\/arena\/shadow\/run/u);
  assert.match(openapiSource, /\/topic-selection\/research\/arena\/shadow\/run:/u);
  assert.match(openapiSource, /operationId: runTopicSelectionResearchArenaShadow/u);
  assert.match(openapiSource, /TopicSelectionResearchArenaShadowRunRequest:/u);
  assert.match(openapiSource, /TopicSelectionResearchArenaShadowRunResponse:/u);
  assert.match(openapiSource, /TopicSelectionResearchArenaRoleOutput:/u);
  assert.doesNotMatch(routeSource, /provider_llm/u);
});
