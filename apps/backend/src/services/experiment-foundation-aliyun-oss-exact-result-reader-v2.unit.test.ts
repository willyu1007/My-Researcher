import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExperimentFoundationAliyunOssExactResultReaderV2,
  type ExperimentFoundationAliyunOssSdkClientV2,
} from './experiment-foundation-aliyun-oss-exact-result-reader-v2.js';

const BUCKET = 'pea-m7-canary-test';
const REGION = 'cn-shanghai';

test('M7-10 OSS reader downloads one exact bounded result object', async () => {
  const calls: Array<{ objectName: string; range: string }> = [];
  const client: ExperimentFoundationAliyunOssSdkClientV2 = {
    get: async (objectName, options) => {
      calls.push({ objectName, range: options.headers.Range });
      return { content: Buffer.from('{"ok":true}', 'utf8') };
    },
  };
  const reader = new ExperimentFoundationAliyunOssExactResultReaderV2({
    client,
    bucket_name: BUCKET,
    region_id: REGION,
    maximum_result_bytes: 64,
  });

  const result = await reader.readExactResult({
    job_id: 'job-1',
    result_object_name: 'result.json',
    output_directory_uri:
      `oss://${BUCKET}.oss-${REGION}-internal.aliyuncs.com/output/run-1/cell-a/`,
  });

  assert.deepEqual(calls, [{
    objectName: 'output/run-1/cell-a/result.json',
    range: 'bytes=0-64',
  }]);
  assert.deepEqual(result, {
    object_locator:
      `oss://${BUCKET}.oss-${REGION}-internal.aliyuncs.com/output/run-1/cell-a/result.json`,
    canonical_result_bytes: '{"ok":true}',
  });
});

test('M7-10 OSS reader rejects cross-bucket, traversal, oversized and invalid UTF-8 results', async () => {
  const outputDirectory =
    `oss://${BUCKET}.oss-${REGION}-internal.aliyuncs.com/output/run-1/cell-a/`;
  const makeReader = (content: Buffer, maximumResultBytes = 64) => (
    new ExperimentFoundationAliyunOssExactResultReaderV2({
      client: { get: async () => ({ content }) },
      bucket_name: BUCKET,
      region_id: REGION,
      maximum_result_bytes: maximumResultBytes,
    })
  );

  await assert.rejects(
    () => makeReader(Buffer.from('{}')).readExactResult({
      job_id: 'job-1',
      result_object_name: 'result.json',
      output_directory_uri:
        `oss://other-bucket.oss-${REGION}-internal.aliyuncs.com/output/run-1/cell-a/`,
    }),
    /output directory drifted/u,
  );
  await assert.rejects(
    () => makeReader(Buffer.from('{}')).readExactResult({
      job_id: 'job-1',
      result_object_name: '../result.json',
      output_directory_uri: outputDirectory,
    }),
    /input is invalid/u,
  );
  await assert.rejects(
    () => makeReader(Buffer.alloc(65), 64).readExactResult({
      job_id: 'job-1',
      result_object_name: 'result.json',
      output_directory_uri: outputDirectory,
    }),
    /byte-size boundary/u,
  );
  await assert.rejects(
    () => makeReader(Buffer.from([0xc3, 0x28])).readExactResult({
      job_id: 'job-1',
      result_object_name: 'result.json',
      output_directory_uri: outputDirectory,
    }),
    /valid UTF-8/u,
  );
});
