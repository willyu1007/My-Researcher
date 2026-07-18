import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationV2AliyunCreateJobPayloadService,
  type ExperimentFoundationAliyunCreateJobMaterializationV2,
} from './experiment-foundation-v2-aliyun-create-job-payload-service.js';

export const EXPERIMENT_FOUNDATION_ALIYUN_SAME_PAYLOAD_FAKE_ADAPTER_IDENTITY =
  'deterministic_fake_aliyun_pai_dlc_exact_create_job_payload@v1' as const;

export type ExperimentFoundationAliyunSamePayloadFakeOperation =
  | 'submit'
  | 'sync'
  | 'cancel'
  | 'collect'
  | 'reconcile';

export interface ExperimentFoundationAliyunSamePayloadFakeLedgerEntry {
  sequence: number;
  operation: ExperimentFoundationAliyunSamePayloadFakeOperation;
  scenario: 'success' | 'cancel_recovery';
  payload_hash: string;
  prior_state: string;
  next_state: string;
  response_hash: string;
  replay: boolean;
}

export interface ExperimentFoundationAliyunSamePayloadFakeLifecycleOutcome {
  adapter_identity: typeof EXPERIMENT_FOUNDATION_ALIYUN_SAME_PAYLOAD_FAKE_ADAPTER_IDENTITY;
  status: 'workflow_simulation_passed';
  payload_hash: string;
  canonical_payload_replay_hash: string;
  success_terminal_state: 'collected';
  cancel_terminal_state: 'cancelled_collected';
  operation_ledger: ExperimentFoundationAliyunSamePayloadFakeLedgerEntry[];
  network_requests: 0;
  provider_writes: 0;
  scientific_writes: 0;
}

interface ScenarioState {
  state: string;
  submitted: boolean;
}

export class ExperimentFoundationV2AliyunSamePayloadFakeLifecycle {
  private readonly payloadService = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  private readonly ledger: ExperimentFoundationAliyunSamePayloadFakeLedgerEntry[] = [];
  private readonly scenarios = new Map<'success' | 'cancel_recovery', ScenarioState>();

  run(
    materialized: ExperimentFoundationAliyunCreateJobMaterializationV2,
  ): ExperimentFoundationAliyunSamePayloadFakeLifecycleOutcome {
    this.payloadService.verify(materialized);
    this.ledger.length = 0;
    this.scenarios.clear();

    this.apply('success', 'submit', materialized.payload_hash);
    this.apply('success', 'submit', materialized.payload_hash);
    this.apply('success', 'sync', materialized.payload_hash);
    this.apply('success', 'reconcile', materialized.payload_hash);
    this.apply('success', 'collect', materialized.payload_hash);

    this.apply('cancel_recovery', 'submit', materialized.payload_hash);
    this.apply('cancel_recovery', 'sync', materialized.payload_hash);
    this.apply('cancel_recovery', 'cancel', materialized.payload_hash);
    this.apply('cancel_recovery', 'reconcile', materialized.payload_hash);
    this.apply('cancel_recovery', 'collect', materialized.payload_hash);

    return {
      adapter_identity: EXPERIMENT_FOUNDATION_ALIYUN_SAME_PAYLOAD_FAKE_ADAPTER_IDENTITY,
      status: 'workflow_simulation_passed',
      payload_hash: materialized.payload_hash,
      canonical_payload_replay_hash: hashLifecycleValue('CanonicalPayloadReplay', {
        payload_hash: materialized.payload_hash,
        canonical_payload_bytes: materialized.canonical_payload_bytes,
      }),
      success_terminal_state: 'collected',
      cancel_terminal_state: 'cancelled_collected',
      operation_ledger: structuredClone(this.ledger),
      network_requests: 0,
      provider_writes: 0,
      scientific_writes: 0,
    };
  }

  private apply(
    scenario: 'success' | 'cancel_recovery',
    operation: ExperimentFoundationAliyunSamePayloadFakeOperation,
    payloadHash: string,
  ): void {
    const current = this.scenarios.get(scenario) ?? {
      state: 'prepared',
      submitted: false,
    };
    const priorState = current.state;
    let replay = false;

    switch (operation) {
      case 'submit':
        if (current.submitted) {
          replay = true;
        } else if (current.state === 'prepared') {
          current.state = 'submitted';
          current.submitted = true;
        } else {
          throw new Error(`FAKE_ALIYUN_SUBMIT_INVALID_STATE:${current.state}`);
        }
        break;
      case 'sync':
        if (current.state !== 'submitted') {
          throw new Error(`FAKE_ALIYUN_SYNC_INVALID_STATE:${current.state}`);
        }
        current.state = 'running';
        break;
      case 'cancel':
        if (scenario !== 'cancel_recovery' || current.state !== 'running') {
          throw new Error(`FAKE_ALIYUN_CANCEL_INVALID_STATE:${current.state}`);
        }
        current.state = 'cancel_requested';
        break;
      case 'reconcile':
        if (scenario === 'success' && current.state === 'running') {
          current.state = 'succeeded';
        } else if (scenario === 'cancel_recovery' && current.state === 'cancel_requested') {
          current.state = 'cancelled';
        } else {
          throw new Error(`FAKE_ALIYUN_RECONCILE_INVALID_STATE:${current.state}`);
        }
        break;
      case 'collect':
        if (current.state === 'succeeded') {
          current.state = 'collected';
        } else if (current.state === 'cancelled') {
          current.state = 'cancelled_collected';
        } else {
          throw new Error(`FAKE_ALIYUN_COLLECT_INVALID_STATE:${current.state}`);
        }
        break;
    }

    this.scenarios.set(scenario, current);
    const responseSnapshot = {
      adapter_identity: EXPERIMENT_FOUNDATION_ALIYUN_SAME_PAYLOAD_FAKE_ADAPTER_IDENTITY,
      operation,
      scenario,
      payload_hash: payloadHash,
      prior_state: priorState,
      next_state: current.state,
      replay,
    };
    this.ledger.push({
      sequence: this.ledger.length + 1,
      operation,
      scenario,
      payload_hash: payloadHash,
      prior_state: priorState,
      next_state: current.state,
      response_hash: hashLifecycleValue('SamePayloadFakeResponse', responseSnapshot),
      replay,
    });
  }
}

function hashLifecycleValue(recordKind: string, value: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: 'ef-provider-control-json@v1',
    content: JSON.parse(canonicalizeExperimentV2Json(value)),
  });
}
