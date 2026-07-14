import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const openapiPath = path.join(repoRoot, 'docs/context/api/openapi.yaml');
const INT32_MIN = -2_147_483_648;
const INT32_MAX = 2_147_483_647;
const T132_SCHEMA_NAMES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationWorkflowSimulationV2Status',
  'ExperimentV2ExactAssetRevisionRef',
  'PaperImplementationExperimentV2RequiredResultContract',
  'PaperImplementationExperimentV2ExactCellInput',
  'PaperImplementationExperimentV2AdmissionRequest',
  'PaperImplementationExperimentV2AdmissionResponse',
] as const;

function extractSchemaBlock(source: string, schemaName: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === `    ${schemaName}:`);
  assert.notEqual(start, -1, `Schema block ${schemaName} should exist in OpenAPI.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index]!.startsWith('    ') && !lines[index]!.startsWith('      ')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

test('T-132 OpenAPI integer fields match PostgreSQL Int and shared contract bounds', () => {
  const source = fs.readFileSync(openapiPath, 'utf8');
  const blocks = T132_SCHEMA_NAMES.map((name) => extractSchemaBlock(source, name)).join('\n');
  const integerLines = blocks.split('\n').filter((line) => /\btype: integer\b/.test(line));

  assert.equal(integerLines.length, 22, 'The reviewed T-132 integer field census drifted.');
  for (const line of integerLines) {
    assert.match(line, /format: int32/);
    assert.match(line, new RegExp(`maximum: ${INT32_MAX}`));
  }

  const seedLines = integerLines.filter((line) => /\bseed:/.test(line));
  assert.equal(seedLines.length, 2);
  for (const line of seedLines) {
    assert.match(line, new RegExp(`minimum: ${INT32_MIN}`));
  }
});
