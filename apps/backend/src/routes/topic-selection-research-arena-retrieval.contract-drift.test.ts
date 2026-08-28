import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routeSource = fs.readFileSync(
  path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-arena-retrieval-routes.ts'),
  'utf8',
);
const openapiSource = fs.readFileSync(path.join(repoRoot, 'docs/context/api/openapi.yaml'), 'utf8');

test('arena role-evidence route and OpenAPI preserve the advisory retrieval boundary', () => {
  assert.match(routeSource, /\/topic-selection\/research\/arena\/role-evidence\/prepare/);
  assert.match(openapiSource, /\/topic-selection\/research\/arena\/role-evidence\/prepare:/);
  assert.match(openapiSource, /operationId: prepareTopicSelectionResearchArenaRoleEvidence/);
  assert.match(openapiSource, /TopicSelectionResearchArenaRoleEvidencePreparationRequest:/);
  assert.match(openapiSource, /TopicSelectionResearchArenaRoleEvidencePreparation:/);
  assert.match(openapiSource, /requires_evidence_materialization/);
});
