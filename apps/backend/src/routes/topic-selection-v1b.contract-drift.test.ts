import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildApp } from '../app.js';
import {
  topicSelectionV1bWorkflowHarnessRunRequestSchema,
  topicSelectionV1bN9QuestionRefinementPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

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

test('workflow state/advance and deterministic invocation restrictions stay aligned with the public contract', async () => {
  type Schema = {
    properties?: Record<string, Schema>;
    required?: readonly string[];
    anyOf?: Schema[];
    additionalProperties?: Schema | boolean;
    type?: string;
    minimum?: number;
    maximum?: number;
  };
  const app = buildApp();
  let advance: Schema | undefined;
  let stateRegistered = false;
  app.addHook('onRoute', (route) => {
    if (route.url === '/topic-selection/v1b/workflow-runs/:workflowRunId/advance' && route.method === 'POST') {
      advance = route.schema?.body as Schema;
    }
    if (route.url === '/topic-selection/v1b/workflow-runs/:workflowRunId/state' && route.method === 'GET') {
      stateRegistered = true;
    }
  });
  try {
    await app.ready();
    assert.ok(stateRegistered);
    assert.ok(advance);
    const source = fs.readFileSync(openapiPath, 'utf8');
    const stateOperation = extractOperationBlock(source, 'getTopicSelectionV1bWorkflowRunState');
    assert.match(stateOperation, /TopicSelectionV1bWorkflowRunState/);
    assert.match(stateOperation, /'404':/);
    const advanceOperation = extractOperationBlock(source, 'advanceTopicSelectionV1bWorkflowRun');
    assert.match(advanceOperation, /TopicSelectionV1bWorkflowRunAdvanceRequest/);
    assert.match(advanceOperation, /TopicSelectionV1bWorkflowRunAdvanceReport/);
    assert.match(advanceOperation, /retry_node_id: topic-selection\.v1b\.materialize-topic-question-contract\.v1/);
    const nodeInput = advance.properties?.node_inputs?.anyOf?.[0]?.additionalProperties;
    assert.ok(nodeInput && typeof nodeInput === 'object');
    for (const [name, schema] of [
      ['TopicSelectionV1bWorkflowRunAdvanceRequest', advance],
      ['TopicSelectionV1bCoordinatorNodeInput', nodeInput],
      ['TopicSelectionV1bN9QuestionRefinementPayload', topicSelectionV1bN9QuestionRefinementPayloadSchema],
      ['TopicSelectionV1bWorkflowHarnessNodeInvocationRequest', topicSelectionV1bWorkflowHarnessRunRequestSchema],
    ] as const) {
      const block = extractSchemaBlock(source, name);
      const fields = [...block.matchAll(/^        (\w+):/gm)].map((match) => match[1]);
      assert.deepEqual(fields.sort(), Object.keys(schema.properties ?? {}).sort(), `${name} fields`);
      const required = block.match(/^      required: \[([^\]]*)\]/m)?.[1]?.split(',').map((field) => field.trim()) ?? [];
      assert.deepEqual(required.sort(), [...(schema.required ?? [])].sort(), `${name} required`);
    }
    const advanceBlock = extractSchemaBlock(source, 'TopicSelectionV1bWorkflowRunAdvanceRequest');
    for (const field of ['max_steps', 'loopback_budget_per_node', 'node_timeout_ms', 'run_timeout_ms']) {
      const property = advance.properties?.[field];
      const block = advanceBlock.split(`        ${field}:`)[1]?.split(/\n        \w+:/)[0];
      assert.ok(block?.includes(`minimum: ${property?.minimum}`), `${field} minimum`);
      assert.ok(block?.includes(`maximum: ${property?.maximum}`), `${field} maximum`);
    }
    const invocation = extractSchemaBlock(source, 'TopicSelectionV1bWorkflowHarnessNodeInvocationRequest');
    const conditional = invocation.split('      allOf:')[1];
    assert.ok(conditional);
    const nodes = [...conditional.matchAll(/topic-selection\.v1b\.[\w-]+\.v1/g)].map((match) => match[0]);
    assert.deepEqual(nodes, topicSelectionV1bWorkflowHarnessRunRequestSchema.allOf[0].if.properties.node_id.enum);
    for (const field of ['run_mode', 'profile_id']) {
      assert.match(conditional, new RegExp(`${field}: \\{type: ['"]?null['"]?\\}`));
    }
    const coordinator = fs.readFileSync(path.join(repoRoot,
      'apps/backend/src/services/topic-selection-v1b-run-coordinator-service.ts'), 'utf8');
    for (const [schemaName, typeName] of [
      ['TopicSelectionV1bWorkflowRunState', 'TopicSelectionV1bRunStateProjection'],
      ['TopicSelectionV1bRunNodeState', 'TopicSelectionV1bRunNodeState'],
      ['TopicSelectionV1bRunNodeAttempt', 'TopicSelectionV1bRunNodeAttemptSnapshot'],
      ['TopicSelectionV1bRunRecoveryFrontier', 'TopicSelectionV1bRunRecoveryFrontier'],
      ['TopicSelectionV1bWorkflowRunAdvanceReport', 'TopicSelectionV1bRunAdvanceReport'],
    ]) {
      const type = coordinator.split(`export type ${typeName} = {\n`)[1]?.split('\n};')[0];
      assert.ok(type, `${typeName} runtime type`);
      const fields = [...type.matchAll(/^  (\w+):/gm)].map((match) => match[1]).sort();
      const block = extractSchemaBlock(source, schemaName);
      const documented = [...block.matchAll(/^        (\w+):/gm)].map((match) => match[1]).sort();
      assert.deepEqual(documented, fields, `${schemaName} response fields`);
      const required = block.match(/^      required: \[([^\]]*)\]/m)?.[1]?.split(',').map((field) => field.trim()).sort();
      assert.deepEqual(required, fields, `${schemaName} required response fields`);
    }
    const haltType = coordinator.split('export type TopicSelectionV1bRunCoordinatorHaltReason =')[1]?.split('\nexport type ')[0];
    assert.ok(haltType);
    const reasons = [...haltType.matchAll(/^  \| '([^']+)'/gm)].map((match) => match[1]);
    assert.ok(extractSchemaBlock(source, 'TopicSelectionV1bWorkflowRunAdvanceReport')
      .includes(`enum: [${reasons.join(', ')}]`), 'Every coordinator halt reason is documented.');
  } finally {
    await app.close();
  }
});

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

test('v1b N4/N6/N8 Codex-assisted product runtime route is fully documented in OpenAPI', () => {
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const openapiSource = fs.readFileSync(openapiPath, 'utf8');

  assert.match(
    routeSource,
    /\/topic-selection\/v1b\/workflow-harness\/nodes\/:nodeId\/codex-assisted-invocations/,
  );
  assert.match(
    openapiSource,
    /\/topic-selection\/v1b\/workflow-harness\/nodes\/\{nodeId\}\/codex-assisted-invocations:/,
  );

  const operationBlock = extractOperationBlock(
    openapiSource,
    'invokeTopicSelectionV1bCodexAssisted',
  );
  assert.match(operationBlock, /TopicSelectionV1bCodexAssistedInvocationRequest/);
  assert.match(operationBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationResult/);
  assert.match(operationBlock, /'400':\n\s+\$ref: '#\/components\/responses\/BadRequest'/);
  assert.match(operationBlock, /'409':\n\s+\$ref: '#\/components\/responses\/Conflict'/);

  const unionRequestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bCodexAssistedInvocationRequest',
  );
  assert.match(unionRequestBlock, /TopicSelectionV1bN4CodexAssistedInvocationRequest/);
  assert.match(unionRequestBlock, /TopicSelectionV1bN6CodexAssistedInvocationRequest/);
  assert.match(unionRequestBlock, /TopicSelectionV1bN8CodexAssistedInvocationRequest/);

  const requestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN4CodexAssistedInvocationRequest',
  );
  assert.match(requestBlock, /required: \[request, codex_response\]/);
  assert.match(requestBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationRequest/);
  assert.match(requestBlock, /TopicSelectionV1bN4CodexAssistedResponse/);

  const responseBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN4CodexAssistedResponse',
  );
  assert.match(responseBlock, /required: \[output, operator_label\]/);
  assert.match(responseBlock, /TopicSelectionV1bResearchSliceOptionSetDraft/);

  const n6RequestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN6CodexAssistedInvocationRequest',
  );
  assert.match(n6RequestBlock, /required: \[request, role_outputs\]/);
  assert.match(n6RequestBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationRequest/);
  assert.match(n6RequestBlock, /TopicSelectionV1bN6CodexDebateRoleInput/);

  const n6ResponseBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN6CodexAssistedResponse',
  );
  assert.match(n6ResponseBlock, /required: \[output, operator_label\]/);
  assert.match(n6ResponseBlock, /TopicSelectionV1bTopicQuestionCandidateSetDraft/);

  const n8RequestBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN8CodexAssistedInvocationRequest',
  );
  assert.match(n8RequestBlock, /required: \[request, codex_response\]/);
  assert.match(n8RequestBlock, /TopicSelectionV1bWorkflowHarnessNodeInvocationRequest/);
  assert.match(n8RequestBlock, /TopicSelectionV1bN8CodexAssistedResponse/);

  const n8ResponseBlock = extractSchemaBlock(
    openapiSource,
    'TopicSelectionV1bN8CodexAssistedResponse',
  );
  assert.match(n8ResponseBlock, /required: \[output, operator_label\]/);
  assert.match(n8ResponseBlock, /TopicSelectionV1bTopicValueAssessmentDraft/);
});
