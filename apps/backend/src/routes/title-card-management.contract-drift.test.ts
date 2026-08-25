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

function extractOperationBlock(source: string, operationId: string): string {
  const start = source.indexOf(`      operationId: ${operationId}\n`);
  assert.notEqual(start, -1, `Operation ${operationId} should exist in OpenAPI.`);
  const nextOperation = source.indexOf('\n      operationId:', start + 1);
  const nextPath = source.indexOf('\n  /', start + 1);
  const candidates = [nextOperation, nextPath].filter((index) => index !== -1);
  return source.slice(start, candidates.length > 0 ? Math.min(...candidates) : source.length);
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

  const titleCardStatusBlock = extractSchemaBlock(openapiSource, 'TitleCardStatus');
  assert.match(titleCardStatusBlock, /enum: \[draft, active, promoted, parked\]/);

  const titleCardBlock = extractSchemaBlock(openapiSource, 'TitleCardResponse');
  assert.match(titleCardBlock, /TitleCardStatus/);
  assert.match(titleCardBlock, /- evidence_count/);
  assert.match(titleCardBlock, /- promotion_decision_count/);

  const titleCardListBlock = extractSchemaBlock(openapiSource, 'TitleCardListResponse');
  assert.match(titleCardListBlock, /required: \[items, summary\]/);
  assert.match(titleCardListBlock, /TitleCardResponse/);
  assert.match(titleCardListBlock, /TitleCardListSummary/);

  const createTitleCardBlock = extractSchemaBlock(openapiSource, 'CreateTitleCardRequest');
  assert.match(createTitleCardBlock, /required: \[working_title, brief\]/);

  const updateTitleCardBlock = extractSchemaBlock(openapiSource, 'UpdateTitleCardRequest');
  assert.match(updateTitleCardBlock, /minProperties: 1/);

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

test('title-card root operations publish their canonical request and response schemas', () => {
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');
  const listAndCreateStart = openapiSource.indexOf('  /title-cards:\n');
  const detailStart = openapiSource.indexOf('  /title-cards/{titleCardId}:\n');
  const evidenceBasketStart = openapiSource.indexOf('  /title-cards/{titleCardId}/evidence-basket:\n');

  assert.notEqual(listAndCreateStart, -1);
  assert.notEqual(detailStart, -1);
  assert.notEqual(evidenceBasketStart, -1);

  const listAndCreateBlock = openapiSource.slice(listAndCreateStart, detailStart);
  assert.match(listAndCreateBlock, /operationId: listTitleCards[\s\S]*TitleCardListResponse/);
  assert.match(listAndCreateBlock, /operationId: createTitleCard[\s\S]*CreateTitleCardRequest[\s\S]*TitleCardResponse/);

  const detailBlock = openapiSource.slice(detailStart, evidenceBasketStart);
  assert.match(detailBlock, /operationId: getTitleCard[\s\S]*TitleCardResponse/);
  assert.match(detailBlock, /operationId: updateTitleCard[\s\S]*UpdateTitleCardRequest[\s\S]*TitleCardResponse/);
});

test('legacy title-card semantic writers are documented as deprecated conflict-only recovery operations', () => {
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');
  for (const operationId of [
    'createNeedReview',
    'updateNeedReview',
    'createResearchQuestion',
    'updateResearchQuestion',
    'createValueAssessment',
    'updateValueAssessment',
    'createPackage',
    'updatePackage',
    'createPromotionDecision',
    'updatePromotionDecision',
    'promoteTitleCardToPaperProject',
  ]) {
    const block = extractOperationBlock(openapiSource, operationId);
    assert.match(block, /deprecated: true/);
    assert.match(block, /'409':/);
    assert.doesNotMatch(block, /'(200|201)':/);
  }
});
