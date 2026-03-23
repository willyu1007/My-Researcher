import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-management.ts');
const openapiPath = path.join(repoRoot, 'docs/context/api/openapi.yaml');

const canonicalRoutePaths = [
  '/title-cards',
  '/title-cards/:titleCardId',
  '/title-cards/:titleCardId/evidence-basket',
  '/title-cards/:titleCardId/evidence-candidates',
  '/title-cards/:titleCardId/needs',
  '/title-cards/:titleCardId/needs/:needId',
  '/title-cards/:titleCardId/research-questions',
  '/title-cards/:titleCardId/research-questions/:researchQuestionId',
  '/title-cards/:titleCardId/value-assessments',
  '/title-cards/:titleCardId/value-assessments/:valueAssessmentId',
  '/title-cards/:titleCardId/packages',
  '/title-cards/:titleCardId/packages/:packageId',
  '/title-cards/:titleCardId/promotion-decisions',
  '/title-cards/:titleCardId/promotion-decisions/:decisionId',
  '/title-cards/:titleCardId/promote-to-paper-project',
];

const canonicalOpenApiPaths = [
  '/title-cards:',
  '/title-cards/{titleCardId}:',
  '/title-cards/{titleCardId}/evidence-basket:',
  '/title-cards/{titleCardId}/evidence-candidates:',
  '/title-cards/{titleCardId}/needs:',
  '/title-cards/{titleCardId}/needs/{needId}:',
  '/title-cards/{titleCardId}/research-questions:',
  '/title-cards/{titleCardId}/research-questions/{researchQuestionId}:',
  '/title-cards/{titleCardId}/value-assessments:',
  '/title-cards/{titleCardId}/value-assessments/{valueAssessmentId}:',
  '/title-cards/{titleCardId}/packages:',
  '/title-cards/{titleCardId}/packages/{packageId}:',
  '/title-cards/{titleCardId}/promotion-decisions:',
  '/title-cards/{titleCardId}/promotion-decisions/{decisionId}:',
  '/title-cards/{titleCardId}/promote-to-paper-project:',
];

const deprecatedOpenApiPaths = [
  '/topics/{topicId}/need-reviews:',
  '/topics/{topicId}/questions:',
  '/topics/{topicId}/promotion-decisions:',
];

test('title-card management canonical paths stay aligned between routes and OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  for (const routePathValue of canonicalRoutePaths) {
    assert.match(routeSource, new RegExp(routePathValue.replaceAll('/', '\\/')));
  }

  for (const openApiPathValue of canonicalOpenApiPaths) {
    assert.match(openapiSource, new RegExp(openApiPathValue.replaceAll('/', '\\/')));
  }

  for (const deprecatedPathValue of deprecatedOpenApiPaths) {
    assert.doesNotMatch(openapiSource, new RegExp(deprecatedPathValue.replaceAll('/', '\\/')));
  }
});
