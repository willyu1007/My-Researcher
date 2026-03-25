import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/title-card-management.ts');
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

test('title-card component schemas stay aligned with canonical title-card semantics', () => {
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  const reviewRefBlock = extractSchemaBlock(openapiSource, 'TopicReviewRef');
  assert.match(reviewRefBlock, /enum: \[evidence_review, need_review, research_question, value_assessment, package, promotion_decision\]/);
  assert.doesNotMatch(reviewRefBlock, /topic_package|need_review, question/);

  const researchQuestionBlock = extractSchemaBlock(openapiSource, 'ResearchQuestionResponse');
  assert.match(researchQuestionBlock, /source_literature_evidence_ids:/);
  assert.doesNotMatch(researchQuestionBlock, /source_evidence_review_ids:/);

  const createResearchQuestionBlock = extractSchemaBlock(openapiSource, 'CreateResearchQuestionRequest');
  assert.match(createResearchQuestionBlock, /required: \[source_literature_evidence_ids\]/);
  assert.doesNotMatch(createResearchQuestionBlock, /source_evidence_review_ids/);

  const createValueAssessmentBlock = extractSchemaBlock(openapiSource, 'CreateValueAssessmentRequest');
  assert.match(createValueAssessmentBlock, /- research_question_id/);
  assert.match(createValueAssessmentBlock, /research_question_id:\n\s+type: string/);

  const createPackageBlock = extractSchemaBlock(openapiSource, 'CreatePackageRequest');
  assert.match(createPackageBlock, /- research_question_id/);
  assert.match(createPackageBlock, /- value_assessment_id/);
  assert.match(createPackageBlock, /research_question_id:\n\s+type: string/);
  assert.match(createPackageBlock, /value_assessment_id:\n\s+type: string/);

  const promotionDecisionBlock = extractSchemaBlock(openapiSource, 'PromotionDecisionResponse');
  assert.match(promotionDecisionBlock, /enum: \[need_review, research_question, value_assessment, package\]/);
  assert.match(promotionDecisionBlock, /- updated_at/);
  assert.doesNotMatch(promotionDecisionBlock, /topic_package|need_review, question/);

  const createPromotionDecisionBlock = extractSchemaBlock(openapiSource, 'CreatePromotionDecisionRequest');
  assert.match(createPromotionDecisionBlock, /enum: \[need_review, research_question, value_assessment, package\]/);
  assert.doesNotMatch(createPromotionDecisionBlock, /topic_package|need_review, question/);
});
