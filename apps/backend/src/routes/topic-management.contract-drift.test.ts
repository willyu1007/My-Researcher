import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-management.ts');
const openapiPath = path.join(repoRoot, 'docs/context/api/openapi.yaml');

const canonicalRoutePaths = [
  '/topics/:topicId/need-reviews',
  '/topics/:topicId/questions',
  '/topics/:topicId/questions/:questionId/value-assessments',
  '/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-packages',
  '/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package',
  '/topics/:topicId/promotion-decisions',
  '/topics/:topicId/promote-to-paper-project',
];

const canonicalOpenApiPaths = [
  '/topics/{topicId}/need-reviews:',
  '/topics/{topicId}/questions:',
  '/topics/{topicId}/questions/{questionId}/value-assessments:',
  '/topics/{topicId}/questions/{questionId}/value-assessments/{valueAssessmentId}/topic-packages:',
  '/topics/{topicId}/questions/{questionId}/value-assessments/{valueAssessmentId}/topic-package:',
  '/topics/{topicId}/promotion-decisions:',
  '/topics/{topicId}/promote-to-paper-project:',
];

const deprecatedOpenApiPaths = [
  '/topics/{topicId}/research-record:',
  '/topics/{topicId}/value-assessments:',
  '/topics/{topicId}/packages:',
];

test('topic-management canonical paths stay aligned between routes and OpenAPI', () => {
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
