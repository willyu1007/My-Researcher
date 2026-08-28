import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routeSource = fs.readFileSync(
  path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-evidence-packet-routes.ts'),
  'utf8',
);
const openapiSource = fs.readFileSync(path.join(repoRoot, 'docs/context/api/openapi.yaml'), 'utf8');

test('EvidencePacket route, schemas, and OpenAPI preserve the read-time integrity boundary', () => {
  assert.match(routeSource, /\/topic-selection\/research\/evidence-packets\/resolve/);
  assert.match(openapiSource, /\/topic-selection\/research\/evidence-packets\/resolve:/);
  assert.match(openapiSource, /operationId: resolveTopicSelectionResearchEvidencePacket/);
  assert.match(openapiSource, /TopicSelectionResearchEvidencePacketRequest:/);
  assert.match(openapiSource, /TopicSelectionResearchResolvedEvidenceLocator:/);
  assert.match(openapiSource, /TopicSelectionResearchEvidencePacketItem:/);
  assert.match(openapiSource, /TopicSelectionResearchEvidencePacket:/);
  assert.match(openapiSource, /quote_integrity: \{ type: string, enum: \[exact_match, normalized_match\] \}/);
  assert.match(openapiSource, /maxItems: 12/);
  assert.match(openapiSource, /maximum: 96000/);
});
