import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const openapiSource = fs.readFileSync(path.join(repoRoot, 'docs/context/api/openapi.yaml'), 'utf8');

test('research arena session routes and OpenAPI expose support-only open and recovery', () => {
  assert.match(openapiSource, /\/topic-selection\/research\/arena\/sessions:/u);
  assert.match(openapiSource, /operationId: openTopicSelectionResearchArenaSession/u);
  assert.match(openapiSource, /\/topic-selection\/research\/arena\/sessions\/\{arenaSessionId\}:/u);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchArenaSession/u);
  assert.match(openapiSource, /TopicSelectionResearchArenaOpenSessionRequest:/u);
  assert.match(openapiSource, /support_only: \{ type: boolean, const: true \}/u);
});
