import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/research-lifecycle-routes.ts');
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

test('paper-project create route stays aligned with title-card origin semantics', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(routeSource, /\/paper-projects/);
  assert.match(openapiSource, /\/paper-projects:/);

  const createPaperProjectBlock = extractSchemaBlock(openapiSource, 'CreatePaperProjectRequest');
  assert.match(createPaperProjectBlock, /required: \[title_card_id, title, created_by, initial_context\]/);
  assert.match(createPaperProjectBlock, /title_card_id:\n\s+type: string/);
  assert.doesNotMatch(createPaperProjectBlock, /\btopic_id:\b/);
});
