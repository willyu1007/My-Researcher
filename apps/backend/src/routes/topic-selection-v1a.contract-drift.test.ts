import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildApp } from '../app.js';

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

test('public EvidenceMap request documents the registered fields, required inputs and enums', async () => {
  type Schema = {
    properties?: Record<string, Schema>;
    items?: Schema;
    required?: readonly string[];
    enum?: readonly string[];
    additionalProperties?: boolean;
  };
  const app = buildApp();
  let requestSchema: Schema | undefined;
  app.addHook('onRoute', (route) => {
    if (route.method === 'POST' && route.url === '/topic-selection/v1a/evidence-maps') {
      requestSchema = route.schema?.body as Schema;
    }
  });
  try {
    await app.ready();
    assert.ok(requestSchema, 'The documented EvidenceMap POST must be registered.');
    const unitSchema = requestSchema.properties?.evidence_units?.items;
    const schemas = [
      ['TopicSelectionV1aEvidenceMapRequest', requestSchema],
      ['TopicSelectionEvidenceUnitInput', unitSchema],
      ['TopicSelectionEvidenceSourceLocator', unitSchema?.properties?.locator],
      ['TopicSelectionEvidenceTypedLinkInput', requestSchema.properties?.typed_links?.items],
      ['TopicSelectionEvidenceClusterInput', requestSchema.properties?.clusters?.items],
      ['TopicSelectionEvidencePatternInput', requestSchema.properties?.patterns?.items],
      ['TopicSelectionEvidenceConflictSetInput', requestSchema.properties?.conflict_sets?.items],
    ] as const;
    const source = fs.readFileSync(openapiPath, 'utf8');
    const operation = extractOperationBlock(source, 'createTopicSelectionV1aEvidenceMap');
    assert.match(operation, /TopicSelectionV1aEvidenceMapRequest/);
    for (const [name, schema] of schemas) {
      assert.ok(schema?.properties, `${name} has a runtime schema.`);
      const block = extractSchemaBlock(source, name);
      const documentedFields = [...block.matchAll(/^        (\w+):/gm)].map((match) => match[1]);
      assert.deepEqual(documentedFields.sort(), Object.keys(schema.properties).sort(), `${name} properties`);
      const required = block.match(/^      required: \[([^\]]*)\]/m)?.[1]?.split(',').map((field) => field.trim()) ?? [];
      assert.deepEqual(required.sort(), [...(schema.required ?? [])].sort(), `${name} required fields`);
      assert.ok(block.includes(`additionalProperties: ${schema.additionalProperties}`), `${name} additional properties`);
      for (const [field, property] of Object.entries(schema.properties)) {
        if (!property.enum) continue;
        const propertyBlock = block.split(`        ${field}:`)[1]?.split(/\n        \w+:/)[0];
        assert.ok(propertyBlock?.includes(`enum: [${property.enum.join(', ')}]`), `${name}.${field} enum`);
      }
    }
    const request = extractSchemaBlock(source, 'TopicSelectionV1aEvidenceMapRequest');
    for (const name of ['TopicSelectionEvidenceUnitInput', 'TopicSelectionEvidenceTypedLinkInput',
      'TopicSelectionEvidenceClusterInput', 'TopicSelectionEvidencePatternInput', 'TopicSelectionEvidenceConflictSetInput']) {
      assert.ok(request.includes(`$ref: '#/components/schemas/${name}'`), `Request references ${name}.`);
    }
  } finally {
    await app.close();
  }
});

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
  assert.match(requestBlock, /legacy request compatibility/);
  assert.match(requestBlock, /cannot satisfy/);
  assert.match(requestBlock, /candidate-pool review guard/);

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

  const intentInputBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionHumanConfirmNeedIntentInput',
  );
  assert.match(intentInputBlock, /TopicSelectionHumanConfirmNeedIntent@v1/);
  assert.match(intentInputBlock, /adjudication_result_ref/);
  assert.match(intentInputBlock, /output_validated_need_ref/);
  assert.match(intentInputBlock, /TopicSelectionHumanConfirmationInput/);

  const intentBlock = extractSchemaBlock(openapiSource, 'TopicSelectionHumanConfirmNeedIntent');
  assert.match(intentBlock, /intent_hash/);
  assert.match(intentBlock, /pattern: '\^\[a-f0-9\]\{64\}\$'/);
});
