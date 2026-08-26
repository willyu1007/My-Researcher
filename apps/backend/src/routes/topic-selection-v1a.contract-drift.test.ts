import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-selection-v1a-routes.ts');
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

function extractOperationBlock(source: string, operationId: string): string {
  const start = source.indexOf(`      operationId: ${operationId}\n`);
  assert.notEqual(start, -1, `Operation ${operationId} should exist in OpenAPI.`);
  const nextOperation = source.indexOf('\n      operationId:', start + 1);
  const nextPath = source.indexOf('\n  /', start + 1);
  const candidates = [nextOperation, nextPath].filter((index) => index !== -1);
  return source.slice(start, candidates.length > 0 ? Math.min(...candidates) : source.length);
}

test('v1a HumanConfirmNeed runtime route is fully documented in OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(
    routeSource,
    /\/topic-selection\/v1a\/adjudications\/:adjudicationResultId\/human-confirmations/,
  );
  assert.match(
    openapiSource,
    /\/topic-selection\/v1a\/adjudications\/\{adjudicationResultId\}\/human-confirmations:/,
  );
  assert.match(openapiSource, /operationId: confirmTopicSelectionV1aValidatedNeed/);

  const operationBlock = extractOperationBlock(
    openapiSource,
    'confirmTopicSelectionV1aValidatedNeed',
  );
  assert.match(operationBlock, /TopicSelectionV1aHumanConfirmationResponse/);
  assert.match(operationBlock, /'422':\n\s+\$ref: '#\/components\/responses\/UnprocessableEntity'/);

  const adjudicationRequestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1aAdjudicationRequest',
  );
  assert.match(adjudicationRequestBlock, /adjudicated_by:/);
  assert.doesNotMatch(adjudicationRequestBlock, /human_actor:/);

  const requestBlock = extractSchemaBlock(openapiSource, 'TopicSelectionV1aHumanConfirmationRequest');
  assert.match(requestBlock, /TopicSelectionHumanConfirmationInput/);

  const responseBlock = extractSchemaBlock(openapiSource, 'TopicSelectionV1aHumanConfirmationResponse');
  assert.match(responseBlock, /required: \[adjudication_result, need_candidate, validated_need\]/);

  const confirmationBlock = extractSchemaBlock(openapiSource, 'TopicSelectionHumanConfirmationInput');
  assert.match(confirmationBlock, /TopicSelectionGapSelectionReview/);
  assert.match(confirmationBlock, /allOf:/);
  assert.match(confirmationBlock, /actor_mode: \{ const: human_delegated \}/);
  assert.match(confirmationBlock, /required: \[delegated_executor\]/);

  const gapReviewBlock = extractSchemaBlock(openapiSource, 'TopicSelectionGapSelectionReview');
  assert.match(gapReviewBlock, /confirmed_candidate_pool_hash/);
  assert.match(gapReviewBlock, /direct_prior_art_pressure_reviewed/);
  assert.match(gapReviewBlock, /disconfirming_evidence_reviewed/);
  assert.match(gapReviewBlock, /candidate_reviews/);
});
