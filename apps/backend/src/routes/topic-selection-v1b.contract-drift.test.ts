import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routePath = path.join(repoRoot, 'apps/backend/src/routes/topic-selection-v1b-routes.ts');
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

test('v1b human N2 constraint-profile runtime route is fully documented in OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(
    routeSource,
    /\/topic-selection\/v1b\/intake-snapshots\/:intakeSnapshotId\/constraint-profile\/human/,
  );
  assert.match(
    openapiSource,
    /\/topic-selection\/v1b\/intake-snapshots\/\{intakeSnapshotId\}\/constraint-profile\/human:/,
  );

  const operationBlock = extractOperationBlock(
    openapiSource,
    'recordTopicSelectionV1bHumanConstraintProfile',
  );
  assert.match(operationBlock, /TopicSelectionV1bHumanConstraintProfileRequest/);
  assert.match(operationBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationResult/);
  assert.match(operationBlock, /name: X-Coordinator-Attempt-Nonce/);
  assert.match(operationBlock, /'400':\n\s+\$ref: '#\/components\/responses\/BadRequest'/);

  const requestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bHumanConstraintProfileRequest',
  );
  assert.match(requestBlock, /required: \[actor, profile\]/);
  assert.match(requestBlock, /TopicSelectionV1bHumanOrHybridActorRef/);
  assert.match(requestBlock, /TopicSelectionV1bResearchConstraintProfileInput/);

  const profileBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bResearchConstraintProfileInput',
  );
  assert.match(profileBlock, /required: \[target_community, claim_ceiling\]/);
  assert.match(profileBlock, /method_constraints/);
  assert.match(profileBlock, /resource_constraints/);
  assert.match(profileBlock, /non_goals/);
});

test('v1b human N5 slice-selection runtime route is fully documented in OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(
    routeSource,
    /\/topic-selection\/v1b\/research-slice-option-sets\/:optionSetId\/human-selection/,
  );
  assert.match(
    openapiSource,
    /\/topic-selection\/v1b\/research-slice-option-sets\/\{optionSetId\}\/human-selection:/,
  );

  const operationBlock = extractOperationBlock(
    openapiSource,
    'selectTopicSelectionV1bHumanResearchSlice',
  );
  assert.match(operationBlock, /TopicSelectionV1bHumanSliceSelectionRequest/);
  assert.match(operationBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationResult/);
  assert.match(operationBlock, /name: X-Coordinator-Attempt-Nonce/);
  assert.match(operationBlock, /'400':\n\s+\$ref: '#\/components\/responses\/BadRequest'/);

  const requestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bHumanSliceSelectionRequest',
  );
  assert.match(requestBlock, /required: \[selected_option_id, selection_rationale, actor\]/);
  assert.match(requestBlock, /TopicSelectionV1bHumanOrHybridActorRef/);
  assert.match(requestBlock, /decision_basis/);
  assert.match(requestBlock, /required_actions/);
  assert.match(requestBlock, /accepted_risk_refs/);
});
