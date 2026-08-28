import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-checkpoint-routes.ts');
const openapiPath = path.join(repoRoot, 'docs/context/api/openapi.yaml');

test('research stage manifest and artifact resolver routes stay aligned with OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(routeSource, /\/topic-selection\/title-cards\/:titleCardId\/stage-manifest/);
  assert.match(routeSource, /\/topic-selection\/artifacts\/:artifactRefId/);
  assert.match(routeSource, /\/topic-selection\/title-cards\/:titleCardId\/stage-views\/:stage/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/stage-manifest:/);
  assert.match(openapiSource, /\/topic-selection\/artifacts\/\{artifactRefId\}:/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/stage-views\/\{stage\}:/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchStageManifest/);
  assert.match(openapiSource, /operationId: getTopicSelectionArtifact/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchStageView/);
  assert.match(openapiSource, /TopicSelectionResearchStageManifest:/);
  assert.match(openapiSource, /TopicSelectionResearchStageManifestEntry:/);
  assert.match(openapiSource, /TopicSelectionArtifactRefRecord:/);
  assert.match(openapiSource, /TopicSelectionResearchStageView:/);
  assert.match(openapiSource, /minItems: 7/);
  assert.match(openapiSource, /maxItems: 7/);
});
