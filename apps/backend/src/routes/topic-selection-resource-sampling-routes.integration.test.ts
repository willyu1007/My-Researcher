import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from '../app.js';

test('topic-selection resource sampling routes create blocked empty sample and read it back', async () => {
  const app = buildApp();
  await app.ready();

  try {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/resource-samples',
      payload: {
        topic_id: 'topic_without_resources',
        sample_size: 4,
      },
    });
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();
    assert.equal(created.sample_set.status, 'blocked');
    assert.equal(created.sample_set.warnings.includes('NO_ELIGIBLE_RESOURCE_CANDIDATES'), true);

    const readResponse = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/resource-samples/${created.sample_set.resource_sample_set_id}`,
    });
    assert.equal(readResponse.statusCode, 200);
    const readBack = readResponse.json();
    assert.equal(readBack.sample_set.resource_sample_set_id, created.sample_set.resource_sample_set_id);
    assert.deepEqual(readBack.selected_items, []);
  } finally {
    await app.close();
  }
});

test('topic-selection resource sampling route rejects malformed payloads with INVALID_PAYLOAD', async () => {
  const app = buildApp();
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/resource-samples',
      payload: {
        sample_size: 4,
      },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_PAYLOAD');
  } finally {
    await app.close();
  }
});

test('resource sampling HTTP accepts the CLI contract but keeps its unqualified profile closed', async t => {
  const app = buildApp({ topicSelectionCodexCli: null });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/topic-selection/v1a/resource-samples',
    payload: { topic_id: 'topic_without_resources', execution_spec: { execution_mode: 'codex_cli', model_option_id: null } } });
  assert.equal(response.statusCode, 400);
  assert.match(response.json().error.message, /execution_mode is not allowed by model profile/);
  for (const execution_spec of [{ execution_mode: 'codex_assisted' }, { execution_mode: 'codex_cli', model_option_id: 'provider-option' }]) {
    const invalid = await app.inject({ method: 'POST', url: '/topic-selection/v1a/resource-samples',
      payload: { topic_id: 'topic_without_resources', execution_spec } });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, 'INVALID_PAYLOAD');
  }
});
