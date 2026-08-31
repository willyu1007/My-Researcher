import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-checkpoint-routes.ts');
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

test('research stage manifest and artifact resolver routes stay aligned with OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(routeSource, /\/topic-selection\/title-cards\/:titleCardId\/stage-manifest/);
  assert.match(routeSource, /\/topic-selection\/artifacts\/:artifactRefId/);
  assert.match(routeSource, /\/topic-selection\/title-cards\/:titleCardId\/stage-views\/:stage/);
  assert.match(routeSource, /\/topic-selection\/title-cards\/:titleCardId\/continuation-envelope/);
  assert.match(routeSource, /\/topic-selection\/checkpoints\/:checkpointId\/arena-advisory-reviews/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/stage-manifest:/);
  assert.match(openapiSource, /\/topic-selection\/artifacts\/\{artifactRefId\}:/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/stage-views\/\{stage\}:/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/continuation-envelope:/);
  assert.match(openapiSource, /\/topic-selection\/title-cards\/\{titleCardId\}\/continuation-envelope\/evaluations:/);
  assert.match(openapiSource, /\/topic-selection\/checkpoints\/\{checkpointId\}\/arena-advisory-reviews:/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchStageManifest/);
  assert.match(openapiSource, /operationId: getTopicSelectionArtifact/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchStageView/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchContinuationEnvelope/);
  assert.match(openapiSource, /operationId: evaluateTopicSelectionResearchContinuationEnvelope/);
  assert.match(openapiSource, /operationId: recordTopicSelectionResearchArenaAdvisoryReview/);
  assert.match(openapiSource, /operationId: getTopicSelectionResearchArenaAdvisoryReviewHistory/);
  assert.match(openapiSource, /TopicSelectionResearchStageManifest:/);
  assert.match(openapiSource, /TopicSelectionResearchStageManifestEntry:/);
  assert.match(openapiSource, /TopicSelectionArtifactRefRecord:/);
  assert.match(openapiSource, /TopicSelectionResearchStageView:/);
  assert.match(openapiSource, /TopicSelectionResearchContinuationEnvelope:/);
  assert.match(openapiSource, /TopicSelectionResearchContinuationEnvelopeEvaluationInput:/);
  assert.match(openapiSource, /TopicSelectionResearchContinuationEnvelopeEvaluation:/);
  assert.match(openapiSource, /TopicSelectionResearchArenaAdvisoryReviewInput:/);
  assert.match(openapiSource, /TopicSelectionResearchArenaAdvisoryReviewResult:/);
  assert.match(openapiSource, /TopicSelectionResearchArenaAdvisoryReviewHistory:/);
  const reviewInputBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionResearchArenaAdvisoryReviewInput',
  );
  assert.match(reviewInputBlock, /human_confirm_need_intent:/);
  assert.match(reviewInputBlock, /TopicSelectionHumanConfirmNeedIntentInput/);

  const reviewBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionResearchArenaAdvisoryReview',
  );
  assert.match(reviewBlock, /human_confirm_need_intent:/);
  assert.match(reviewBlock, /TopicSelectionHumanConfirmNeedIntent/);
  assert.match(openapiSource, /minItems: 7/);
  assert.match(openapiSource, /maxItems: 7/);
});
