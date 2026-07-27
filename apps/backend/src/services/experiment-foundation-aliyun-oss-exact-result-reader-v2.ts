import { createRequire } from 'node:module';
import { TextDecoder } from 'node:util';

import type {
  ExperimentFoundationAliyunExactResultReaderV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';

const require = createRequire(import.meta.url);

interface AliyunOssGetResultV2 {
  content?: Buffer | Uint8Array | string;
}

export interface ExperimentFoundationAliyunOssSdkClientV2 {
  get(
    objectName: string,
    options: {
      timeout: number;
      headers: { Range: string };
    },
  ): Promise<AliyunOssGetResultV2>;
}

interface ExperimentFoundationAliyunOssExactResultReaderOptionsV2 {
  client: ExperimentFoundationAliyunOssSdkClientV2;
  bucket_name: string;
  region_id: string;
  maximum_result_bytes?: number;
  request_timeout_ms?: number;
}

interface ExperimentFoundationAliyunOssTemporaryCredentialV2 {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
}

const DEFAULT_MAXIMUM_RESULT_BYTES = 4 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u;
const REGION_PATTERN = /^[a-z0-9-]{3,64}$/u;
const RESULT_OBJECT_PATTERN = /^[A-Za-z0-9_.-]{1,255}$/u;

export function createExperimentFoundationAliyunOssSdkClientV2(
  input: {
    bucket_name: string;
    region_id: string;
    credential: ExperimentFoundationAliyunOssTemporaryCredentialV2;
  },
): ExperimentFoundationAliyunOssSdkClientV2 {
  assertClientBinding(input.bucket_name, input.region_id);
  if (
    input.credential.access_key_id.length === 0
    || input.credential.access_key_secret.length === 0
    || input.credential.security_token.length === 0
  ) {
    throw new Error('Aliyun OSS exact result reader requires an STS credential triplet.');
  }
  const OssClientConstructor = require('ali-oss') as new (
    options: Record<string, unknown>,
  ) => ExperimentFoundationAliyunOssSdkClientV2;
  return new OssClientConstructor({
    accessKeyId: input.credential.access_key_id,
    accessKeySecret: input.credential.access_key_secret,
    stsToken: input.credential.security_token,
    bucket: input.bucket_name,
    region: `oss-${input.region_id}`,
    internal: false,
    secure: true,
    retryMax: 0,
    timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  });
}

export class ExperimentFoundationAliyunOssExactResultReaderV2
implements ExperimentFoundationAliyunExactResultReaderV2 {
  private readonly client: ExperimentFoundationAliyunOssSdkClientV2;
  private readonly bucketName: string;
  private readonly regionId: string;
  private readonly maximumResultBytes: number;
  private readonly requestTimeoutMs: number;

  constructor(options: ExperimentFoundationAliyunOssExactResultReaderOptionsV2) {
    assertClientBinding(options.bucket_name, options.region_id);
    this.client = options.client;
    this.bucketName = options.bucket_name;
    this.regionId = options.region_id;
    this.maximumResultBytes = Math.max(
      1,
      Math.min(
        DEFAULT_MAXIMUM_RESULT_BYTES,
        Math.floor(options.maximum_result_bytes ?? DEFAULT_MAXIMUM_RESULT_BYTES),
      ),
    );
    this.requestTimeoutMs = Math.max(
      1_000,
      Math.min(60_000, Math.floor(options.request_timeout_ms ?? DEFAULT_REQUEST_TIMEOUT_MS)),
    );
  }

  async readExactResult(input: {
    job_id: string;
    result_object_name: string;
    output_directory_uri: string;
  }): Promise<{
    object_locator: string;
    canonical_result_bytes: string;
  }> {
    if (
      input.job_id.trim().length === 0
      || !RESULT_OBJECT_PATTERN.test(input.result_object_name)
      || input.result_object_name === '.'
      || input.result_object_name === '..'
    ) {
      throw new Error('Aliyun OSS exact result input is invalid.');
    }
    const prefix = parseExactOutputDirectory(
      input.output_directory_uri,
      this.bucketName,
      this.regionId,
    );
    const objectName = `${prefix}${input.result_object_name}`;
    const response = await this.client.get(objectName, {
      timeout: this.requestTimeoutMs,
      headers: { Range: `bytes=0-${this.maximumResultBytes}` },
    });
    const content = toBuffer(response.content);
    if (content.length < 1 || content.length > this.maximumResultBytes) {
      throw new Error('Aliyun OSS result object exceeds the exact byte-size boundary.');
    }
    let canonicalResultBytes: string;
    try {
      canonicalResultBytes = new TextDecoder('utf-8', { fatal: true }).decode(content);
    } catch {
      throw new Error('Aliyun OSS result object is not valid UTF-8.');
    }
    return {
      object_locator: `oss://${this.bucketName}.oss-${this.regionId}-internal.aliyuncs.com/${objectName}`,
      canonical_result_bytes: canonicalResultBytes,
    };
  }
}

function assertClientBinding(bucketName: string, regionId: string): void {
  if (!BUCKET_PATTERN.test(bucketName) || !REGION_PATTERN.test(regionId)) {
    throw new Error('Aliyun OSS exact result reader binding is invalid.');
  }
}

function parseExactOutputDirectory(
  value: string,
  bucketName: string,
  regionId: string,
): string {
  const match = /^oss:\/\/([a-z0-9][a-z0-9-]{1,61}[a-z0-9])\.oss-([a-z0-9-]+)-internal\.aliyuncs\.com\/([A-Za-z0-9._/-]+\/)$/u.exec(
    value,
  );
  if (
    !match
    || match[1] !== bucketName
    || match[2] !== regionId
    || match[3]!.startsWith('/')
    || match[3]!.includes('//')
    || match[3]!.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Aliyun OSS output directory drifted from the exact internal URI binding.');
  }
  return match[3]!;
}

function toBuffer(value: AliyunOssGetResultV2['content']): Buffer {
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new Error('Aliyun OSS GetObject returned no supported body.');
}
