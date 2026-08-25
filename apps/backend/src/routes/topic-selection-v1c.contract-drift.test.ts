import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-selection-v1c-routes.ts');
const openapiPath = path.join(repoRoot, 'docs/context/api/openapi.yaml');

function extractSchemaBlock(source: string, schemaName: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === `    ${schemaName}:`);
  assert.notEqual(start, -1, `Schema block ${schemaName} should exist in OpenAPI.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('    ') && !lines[index].startsWith('      ')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

test('v1c human promotion actor requirements stay aligned across HTTP and OpenAPI contracts', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(routeSource, /human_actor: topicSelectionHumanActorRefSchema/);

  const requestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1cHumanPromotionDecisionRequest',
  );
  assert.match(requestBlock, /human_actor:\n\s+\$ref: '#\/components\/schemas\/TopicSelectionHumanActorRef'/);

  const humanActorBlock = extractSchemaBlock(openapiSource, 'TopicSelectionHumanActorRef');
  assert.match(humanActorBlock, /required: \[actor_type, actor_id\]/);
  assert.match(humanActorBlock, /actor_type:\n\s+type: string\n\s+enum: \[human\]/);
  assert.match(humanActorBlock, /actor_id:\n\s+type: string\n\s+minLength: 1/);
});
