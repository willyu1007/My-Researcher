import {
  CreateJobResponse,
  GetJobResponse,
  ListJobsResponse,
  StopJobResponse,
} from '@alicloud/pai-dlc20201203';
import type { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
  ExperimentFoundationExecutionBundleOutputContractV1,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ExperimentFoundationExecutionV2Repository,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import {
  PrismaExperimentFoundationExecutionBundleV2Repository,
} from '../repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import {
  ExperimentFoundationAliyunRealProviderTransportV2,
  type ExperimentFoundationAliyunPaiDlcSdkClientV2,
} from '../services/experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  ExperimentFoundationExecutionBundleV2Service,
} from '../services/experiment-foundation-execution-bundle-v2-service.js';
import {
  ExperimentFoundationRealProviderCommandV2Worker,
} from '../services/experiment-foundation-real-provider-command-v2-worker.js';
import {
  ExperimentFoundationRealProviderIntakeV2Service,
} from '../services/experiment-foundation-real-provider-intake-v2-service.js';
import {
  createRealProviderV2TestFixture,
} from '../services/experiment-foundation-real-provider-v2-test-fixture.js';

const SOURCE_BINDING_ENV_KEY = 'EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON';
type CreateJobInput = Parameters<
  ExperimentFoundationAliyunPaiDlcSdkClientV2['createJobWithOptions']
>[0];

interface StoredJob {
  jobId: string;
  workspaceId: string;
  resourceId?: string;
  displayName: string;
  accessibility: string;
  jobType: string;
  userCommand: string;
  envs: Record<string, string>;
  dataSources: Array<{ uri?: string; mountPath?: string }>;
  credentialConfig: NonNullable<CreateJobInput['credentialConfig']>;
  jobSpecs: NonNullable<CreateJobInput['jobSpecs']>;
  settings: NonNullable<CreateJobInput['settings']>;
  status: string;
}

class SucceedingPaiDlcSdkFake {
  private sequence = 0;
  readonly jobs = new Map<string, StoredJob>();

  readonly createJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['createJobWithOptions'] =
    async (request) => {
      const jobId = `job-${++this.sequence}`;
      this.jobs.set(jobId, {
        jobId,
        workspaceId: request.workspaceId!,
        resourceId: request.resourceId,
        displayName: request.displayName!,
        accessibility: request.accessibility!,
        jobType: request.jobType!,
        userCommand: request.userCommand!,
        envs: { ...(request.envs ?? {}) },
        dataSources: (request.dataSources ?? []).map((source) => ({
          uri: source.uri,
          mountPath: source.mountPath,
        })),
        credentialConfig: request.credentialConfig!,
        jobSpecs: request.jobSpecs!,
        settings: request.settings!,
        status: 'Creating',
      });
      return new CreateJobResponse({ statusCode: 200, body: { jobId } });
    };

  readonly listJobsWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['listJobsWithOptions'] =
    async () => new ListJobsResponse({
      statusCode: 200,
      body: {
        jobs: [...this.jobs.values()].map(({ jobId, displayName, status }) => ({
          jobId,
          displayName,
          status,
        })),
        totalCount: this.jobs.size,
      },
    });

  readonly getJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['getJobWithOptions'] =
    async (jobId) => {
      const job = this.jobs.get(jobId);
      return new GetJobResponse({
        statusCode: job ? 200 : 404,
        body: job,
      });
    };

  readonly stopJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['stopJobWithOptions'] =
    async () => new StopJobResponse({ statusCode: 200, body: {} });

  succeedAll(): void {
    for (const job of this.jobs.values()) job.status = 'Succeeded';
  }
}

export async function createPersistedRealProviderBundleV2(input: {
  prisma: PrismaClient;
  namespace: string;
  now: string;
  outputContractOverride?: Partial<ExperimentFoundationExecutionBundleOutputContractV1>;
}): Promise<{
  revision: ExperimentFoundationExecutionBundleRevisionV2;
  profile: ExperimentFoundationAliyunRealProviderProfileV2;
  resolver: {
    resolveActiveReadyExact(request: {
      execution_bundle_revision_id: string;
      content_hash: string;
    }): Promise<{ revision: ExperimentFoundationExecutionBundleRevisionV2 }>;
  };
}> {
  const base = createRealProviderV2TestFixture();
  const repository = new PrismaExperimentFoundationExecutionBundleV2Repository(input.prisma);
  let sequence = 0;
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => input.now,
    idGenerator: (kind) => `${input.namespace}:execution-bundle:${kind}:${++sequence}`,
  });
  const draftContent = structuredClone(base.bundle.revision_content);
  Object.assign(draftContent.output_contract, input.outputContractOverride ?? {});
  await service.putDraft({
    bundle_key: `${input.namespace}:execution-bundle`,
    display_name: 'Disposable real-provider execution bundle',
    expected_draft_version: null,
    draft_content: draftContent,
  });
  const frozen = await service.freezeActiveRevision({
    bundle_key: `${input.namespace}:execution-bundle`,
    expected_draft_version: 1,
  });
  return {
    revision: frozen.revision,
    profile: base.profile,
    resolver: {
      async resolveActiveReadyExact(request) {
        const exact = await repository.findActiveReadyExact(
          request.execution_bundle_revision_id,
          request.content_hash,
        );
        if (!exact) throw new Error('Exact active-ready ExecutionBundle is unavailable.');
        return { revision: exact.revision };
      },
    },
  };
}

export async function runSucceededRealProviderExecutionV2(input: {
  repository: ExperimentFoundationExecutionV2Repository;
  runId: string;
  businessIdempotencyKey: string;
  bundle: ExperimentFoundationExecutionBundleRevisionV2;
  profile: ExperimentFoundationAliyunRealProviderProfileV2;
  now: string;
}): Promise<string[]> {
  const resolver = {
    async resolveActiveReadyExact() {
      return { revision: input.bundle };
    },
  };
  const started = await new ExperimentFoundationRealProviderIntakeV2Service({
    repository: input.repository,
    cycleClosureLookup: { async isCycleClosed() { return false; } },
    executionBundleResolver: resolver,
    profileResolver: async () => input.profile,
    intakeEnabled: () => true,
    now: () => input.now,
  }).start(input.runId, input.businessIdempotencyKey);
  const client = new SucceedingPaiDlcSdkFake();
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client,
    resultReader: {
      async readExactResult({ job_id, result_object_name }) {
        const job = client.jobs.get(job_id);
        const source = job?.envs[SOURCE_BINDING_ENV_KEY];
        if (!source) throw new Error('Fake provider job lost its exact source binding.');
        const binding = JSON.parse(source) as Record<string, unknown>;
        return {
          object_locator: `oss://redacted-results/${job_id}/${result_object_name}`,
          canonical_result_bytes: canonicalizeExperimentV2Json({
            result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
            ...binding,
            outputs: { diagnostic_only: true },
          }),
        };
      },
    },
  });
  const worker = new ExperimentFoundationRealProviderCommandV2Worker({
    repository: input.repository,
    transport,
    executionBundleResolver: resolver,
    profileResolver: async () => input.profile,
    controlDrainEnabled: () => true,
    now: () => input.now,
  });
  const expected = started.attempts.length;
  const submitted = await worker.runOnce();
  if (submitted.completed_count !== expected) {
    throw new Error('Real-provider submit drain did not complete the exact Attempt batch.');
  }
  client.succeedAll();
  const reconciled = await worker.runOnce();
  const collected = await worker.runOnce();
  if (reconciled.completed_count !== expected || collected.completed_count !== expected) {
    throw new Error('Real-provider reconcile/collection did not complete the exact Attempt batch.');
  }
  const attempts = await input.repository.listRunAttempts(input.runId);
  const exact = attempts.filter((attempt) => (
    attempt.workflow_business_key === input.businessIdempotencyKey
    && attempt.execution_mode === 'real_provider'
    && attempt.provenance === 'real_provider'
    && attempt.lifecycle_state === 'succeeded'
    && attempt.terminal_reason_code === 'real_provider_succeeded'
  ));
  if (exact.length !== expected) {
    throw new Error('Real-provider execution did not freeze the exact succeeded Attempt batch.');
  }
  return exact
    .sort((left, right) => left.cell_key.localeCompare(right.cell_key))
    .map((attempt) => attempt.id);
}
