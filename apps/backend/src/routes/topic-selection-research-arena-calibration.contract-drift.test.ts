import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../../../');
const routeSource = fs.readFileSync(
  path.join(repoRoot, 'apps/backend/src/routes/topic-selection-research-arena-calibration-routes.ts'),
  'utf8',
);
const openapiSource = fs.readFileSync(path.join(repoRoot, 'docs/context/api/openapi.yaml'), 'utf8');

test('research Arena calibration routes and OpenAPI expose the same five support-only operations', () => {
  const operations = [
    ['/topic-selection/research/arena/calibration/datasets', 'createTopicSelectionResearchArenaCalibrationDataset'],
    ['/topic-selection/research/arena/calibration/cases', 'createTopicSelectionResearchArenaCalibrationCase'],
    ['/topic-selection/research/arena/calibration/runs', 'createTopicSelectionResearchArenaCalibrationRun'],
    ['/topic-selection/research/arena/calibration/runs/{runId}/evaluate', 'evaluateTopicSelectionResearchArenaCalibrationRun'],
    ['/topic-selection/research/arena/calibration/runs/{runId}/report', 'getTopicSelectionResearchArenaCalibrationReport'],
  ] as const;
  for (const [routePath, operationId] of operations) {
    assert.ok(openapiSource.includes(`${routePath}:`));
    assert.ok(openapiSource.includes(`operationId: ${operationId}`));
  }
  assert.match(routeSource, /topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema/u);
  assert.match(routeSource, /topicSelectionResearchArenaCalibrationCaseCreateRequestSchema/u);
  assert.match(routeSource, /topicSelectionResearchArenaCalibrationRunCreateRequestSchema/u);
  assert.match(routeSource, /topicSelectionResearchArenaCalibrationReportSchema/u);
});

test('calibration API has no execution, provider, or policy-activation surface', () => {
  assert.doesNotMatch(routeSource, /provider|activate_policy|human_confirmed_decision|checkpoint.*write/iu);
  assert.match(openapiSource, /recommendation: \{ type: string, enum: \[insufficient_evidence, remain_advisory, eligible_for_activation\] \}/u);
  assert.match(openapiSource, /support_only: \{ type: boolean, const: true \}/u);
  assert.match(openapiSource, /TopicSelectionResearchArenaCalibrationCaseResult:/u);
});
