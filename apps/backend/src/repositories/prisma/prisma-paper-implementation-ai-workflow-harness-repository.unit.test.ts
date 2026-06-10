import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import type {
  AgentWorkflowHarnessRun,
  AgentWorkflowHarnessSpec,
  DecisionWorkQueueItem,
  ImplementationGateResult,
  ImplementationHarness,
  ImplementationInputSnapshot,
  ImplementationProposalArtifact,
  ImplementationQualitySignal,
  ImplementationTransitionAttempt,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import { PrismaPaperImplementationAiWorkflowHarnessRepository } from './prisma-paper-implementation-ai-workflow-harness-repository.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

type StoredRow = Record<string, unknown> & { id: string };

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeHarness(): ImplementationHarness {
  return {
    harness_id: 'implementation_harness_001',
    implementation_project_id: PROJECT_ID,
    harness_status: 'active',
    policy_pack: {
      context_policy_version_id: 'context_policy_v1',
      trace_policy_version_id: 'trace_policy_v1',
      evidence_policy_version_id: 'evidence_policy_v1',
      experiment_policy_version_id: 'experiment_policy_v1',
      retention_policy_version_id: 'retention_policy_v1',
      evaluation_policy_version_id: 'evaluation_policy_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_001',
      artifact_store_ref: ref('artifact_store', 'artifact_store_001'),
      evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_001'),
      work_order_broker_ref: ref('work_order_broker', 'broker_001'),
      run_monitor_ref: ref('run_monitor', 'monitor_001'),
    },
    invariants: {
      require_input_snapshot: true,
      require_trace_manifest: true,
      require_artifact_refs: true,
      forbid_untraced_claims: true,
      forbid_memo_as_evidence: true,
      retain_failed_runs: true,
      separate_exploratory_and_confirmatory: true,
    },
    audit: {
      harness_run_refs: [],
      quality_signal_refs: [],
      evaluation_run_refs: [],
    },
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeInputSnapshot(): ImplementationInputSnapshot {
  return {
    input_snapshot_id: 'input_snapshot_001',
    implementation_project_id: PROJECT_ID,
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_v1',
    included_context: {
      motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
      board_version_refs: [],
      assertion_refs: [],
      evidence_binding_refs: [],
      route_refs: [],
      probe_refs: [],
      experiment_plan_refs: [],
      work_order_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      accepted_risk_refs: [],
      human_decision_refs: [],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    },
    excluded_context: {
      excluded_refs: [],
      exclusion_reasons: [],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:source'],
    snapshot_hash: 'sha256:snapshot',
    freshness_status: 'fresh',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeSpec(): AgentWorkflowHarnessSpec {
  return {
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.v1',
    input_policy: {
      required_input_snapshot: true,
      allowed_context_types: ['core_motive_version'],
      forbidden_context_types: ['display_summary'],
      max_context_tokens: 12000,
    },
    prompt_policy: {
      prompt_template_version_id: 'prompt_v1',
      system_instruction_version_id: 'system_v1',
      output_schema_version_id: 'schema_v1',
    },
    model_policy: {
      model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
      temperature: 0.1,
      allowed_tools: [],
    },
    output_policy: {
      required_schema: 'schema_v1',
      natural_language_field_contract_version_id: 'nl_policy_v1',
      required_ref_fields: ['trace_manifest_refs'],
      forbidden_outputs: ['authority_write'],
    },
    validation_policy: {
      schema_validation: true,
      reference_validation: true,
      trace_validation: true,
      claim_boundary_validation: true,
    },
    retry_policy: {
      max_retries: 1,
      retry_on_schema_failure: true,
      retry_on_missing_refs: true,
    },
    audit_policy: {
      save_prompt: true,
      save_input_snapshot: true,
      save_raw_output: true,
      save_parsed_output: true,
      save_validator_results: true,
    },
  };
}

function makeRun(): AgentWorkflowHarnessRun {
  return {
    harness_run_id: 'harness_run_001',
    implementation_project_id: PROJECT_ID,
    harness_id: 'implementation_harness_001',
    input_snapshot_id: 'input_snapshot_001',
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.v1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
    prompt_template_version_id: 'prompt_v1',
    output_schema_version_id: 'schema_v1',
    raw_output_artifact_ref: ref('artifact', 'raw_output_001'),
    parsed_output_artifact_ref: ref('artifact', 'parsed_output_001'),
    schema_validation_status: 'passed',
    reference_validation_status: 'passed',
    trace_validation_status: 'passed',
    nl_field_role_validation_status: 'passed',
    memo_as_evidence_detected: false,
    direct_state_mutation_detected: false,
    blocked_reasons: [],
    run_status: 'completed',
    proposal_artifact_ids: ['proposal_artifact_001'],
    quality_signal_ids: ['quality_signal_001'],
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeProposal(): ImplementationProposalArtifact {
  return {
    proposal_artifact_id: 'proposal_artifact_001',
    implementation_project_id: PROJECT_ID,
    harness_run_id: 'harness_run_001',
    artifact_kind: 'proposal_object',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    artifact_ref: ref('artifact', 'proposal_artifact_001'),
    source_refs: [ref('core_motive_version', 'core_motive_version_001')],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    payload: { proposal_only: true },
    proposal_status: 'proposed',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeQualitySignal(): ImplementationQualitySignal {
  return {
    quality_signal_id: 'quality_signal_001',
    implementation_project_id: PROJECT_ID,
    harness_run_id: 'harness_run_001',
    signal_type: 'gate_blocker',
    severity: 'info',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    summary: 'No blocker.',
    source_refs: [ref('agent_workflow_harness_run', 'harness_run_001')],
    payload: {},
    policy_version_id: 'context_policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeGateResult(): ImplementationGateResult {
  return {
    gate_result_id: 'gate_result_001',
    implementation_project_id: PROJECT_ID,
    gate_type: 'paper_implementation_agent_workflow_harness',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    result: 'pass',
    checks: [{
      check_id: 'proposal_only_trace_ready',
      check_name: 'Proposal-only output is trace-ready',
      result: 'pass',
      message: 'ok',
      blocking: false,
    }],
    blockers: [],
    warnings: [],
    accepted_risk_refs: [],
    required_actions: [],
    policy_version_id: 'context_policy_v1',
    created_at: NOW,
  };
}

function makeTransition(): ImplementationTransitionAttempt {
  return {
    transition_id: 'transition_attempt_001',
    implementation_project_id: PROJECT_ID,
    transition_key: 'agent_workflow_harness.validation_cycle_planning',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    input_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    output_refs: [ref('implementation_proposal_artifact', 'proposal_artifact_001')],
    actor_type: 'system',
    actor_id: null,
    transition_policy_version_id: 'context_policy_v1',
    context_policy_version_id: 'context_policy_v1',
    trace_policy_version_id: 'trace_policy_v1',
    gate_result_refs: [ref('implementation_gate_result', 'gate_result_001')],
    outcome: 'pass',
    blockers: [],
    accepted_risk_refs: [],
    harness_run_refs: [ref('agent_workflow_harness_run', 'harness_run_001')],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    created_at: NOW,
  };
}

function makeQueueItem(): DecisionWorkQueueItem {
  return {
    queue_item_id: 'decision_queue_item_001',
    implementation_project_id: PROJECT_ID,
    queue_type: 'trace_repair',
    stage: 'agent_workflow_harness_validation',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    priority: 'high',
    status: 'open',
    blocking_transition_keys: ['agent_workflow_harness.validation_cycle_planning'],
    dedup_key: 'agent_workflow_harness:harness_run_001:trace',
    allowed_handlers: ['human', 'system'],
    recommended_actions: ['repair_trace_or_context'],
    created_from_refs: [ref('agent_workflow_harness_run', 'harness_run_001')],
    policy_version_id: 'context_policy_v1',
    retry_count: 0,
    retry_budget: 1,
    cooldown_until: null,
    resolved_at: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function normalizeRow(row: StoredRow): StoredRow {
  const normalized: StoredRow = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if ((key.endsWith('At') || key === 'cooldownUntil') && typeof value === 'string') {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push(normalizeRow(data));
      return rows.at(-1);
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where?: Partial<StoredRow> }) =>
      rows.filter((row) => matchesWhere(row, where ?? {})),
    update: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const index = rows.findIndex((row) => matchesWhere(row, where));
      if (index < 0) {
        throw new Error('row not found');
      }
      rows[index] = normalizeRow({ ...rows[index], ...data });
      return rows[index];
    },
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): PrismaClient {
  const client = {
    paperImplementationHarness: makeModel([]),
    paperImplementationInputSnapshot: makeModel([]),
    paperImplementationAgentWorkflowHarnessRun: makeModel([]),
    paperImplementationProposalArtifact: makeModel([]),
    paperImplementationQualitySignal: makeModel([]),
    paperImplementationGateResult: makeModel([]),
    paperImplementationTransitionAttempt: makeModel([]),
    paperImplementationDecisionWorkQueueItem: makeModel([]),
  };
  return {
    ...client,
    $transaction: async (
      input: ((tx: typeof client) => Promise<unknown>) | Array<Promise<unknown>>,
    ) => (typeof input === 'function' ? input(client) : Promise.all(input)),
  } as unknown as PrismaClient;
}

test('DecisionWorkQueue Prisma resolution replays terminal status and rejects terminal drift', async () => {
  const repository = new PrismaPaperImplementationAiWorkflowHarnessRepository(makeFakePrismaClient());
  const harness = await repository.createHarness(makeHarness());
  assert.equal(harness.policy_pack.trace_policy_version_id, 'trace_policy_v1');
  assert.equal((await repository.findHarnessById(PROJECT_ID, 'implementation_harness_001'))?.harness_status, 'active');

  const snapshot = await repository.createInputSnapshot(makeInputSnapshot());
  assert.equal(snapshot.snapshot_hash, 'sha256:snapshot');
  assert.equal((await repository.listInputSnapshots(PROJECT_ID))[0]?.target_ref.ref_id, 'validation_cycle_001');

  const persisted = await repository.createAgentWorkflowHarnessRun({
    spec: makeSpec(),
    harness_run: makeRun(),
    proposal_artifacts: [makeProposal()],
    quality_signals: [makeQualitySignal()],
    gate_result: makeGateResult(),
    transition_attempt: makeTransition(),
    queue_items: [makeQueueItem()],
  });
  assert.equal(persisted.harness_run.run_status, 'completed');
  assert.equal(persisted.proposal_artifacts[0]?.artifact_ref?.ref_id, 'proposal_artifact_001');
  assert.equal(persisted.gate_result.result, 'pass');
  assert.equal(persisted.transition_attempt.outcome, 'pass');
  assert.equal(persisted.queue_items[0]?.queue_type, 'trace_repair');
  assert.equal((await repository.listAgentWorkflowHarnessRuns(PROJECT_ID))[0]?.gate_result_id, 'gate_result_001');
  assert.equal((await repository.listProposalArtifacts(PROJECT_ID))[0]?.proposal_status, 'proposed');

  const resolved = await repository.resolveDecisionWorkQueueItem(
    PROJECT_ID,
    'decision_queue_item_001',
    { status: 'resolved', resolution_note: 'trace fixed', resolved_by: 'human', resolved_at: NOW },
  );
  const replayed = await repository.resolveDecisionWorkQueueItem(
    PROJECT_ID,
    'decision_queue_item_001',
    { status: 'resolved', resolution_note: 'same terminal replay', resolved_by: 'system', resolved_at: NOW },
  );
  await assert.rejects(
    () => repository.resolveDecisionWorkQueueItem(
      PROJECT_ID,
      'decision_queue_item_001',
      { status: 'dismissed', resolution_note: 'terminal drift', resolved_by: 'system', resolved_at: NOW },
    ),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(resolved.status, 'resolved');
  assert.equal(replayed.status, 'resolved');
  assert.equal((await repository.listDecisionWorkQueueItems(PROJECT_ID))[0]?.resolved_at, NOW);

  const secondRun = {
    ...makeRun(),
    harness_run_id: 'harness_run_002',
    raw_output_artifact_ref: ref('artifact', 'raw_output_002'),
    parsed_output_artifact_ref: ref('artifact', 'parsed_output_002'),
    proposal_artifact_ids: ['proposal_artifact_002'],
    quality_signal_ids: ['quality_signal_002'],
    gate_result_id: 'gate_result_002',
    transition_attempt_id: 'transition_attempt_002',
  };
  const reopened = await repository.createAgentWorkflowHarnessRun({
    spec: makeSpec(),
    harness_run: secondRun,
    proposal_artifacts: [{
      ...makeProposal(),
      proposal_artifact_id: 'proposal_artifact_002',
      harness_run_id: secondRun.harness_run_id,
      artifact_ref: ref('artifact', 'proposal_artifact_002'),
    }],
    quality_signals: [{
      ...makeQualitySignal(),
      quality_signal_id: 'quality_signal_002',
      harness_run_id: secondRun.harness_run_id,
      source_refs: [ref('agent_workflow_harness_run', secondRun.harness_run_id)],
    }],
    gate_result: {
      ...makeGateResult(),
      gate_result_id: 'gate_result_002',
    },
    transition_attempt: {
      ...makeTransition(),
      transition_id: 'transition_attempt_002',
      harness_run_refs: [ref('agent_workflow_harness_run', secondRun.harness_run_id)],
    },
    queue_items: [{
      ...makeQueueItem(),
      queue_item_id: 'decision_queue_item_002',
      created_from_refs: [ref('agent_workflow_harness_run', secondRun.harness_run_id)],
    }],
  });

  assert.equal(reopened.queue_items[0]?.queue_item_id, 'decision_queue_item_001');
  assert.equal(reopened.queue_items[0]?.status, 'open');
  assert.equal(reopened.queue_items[0]?.resolved_at, null);
  assert.deepEqual(
    reopened.queue_items[0]?.created_from_refs.map((item) => item.ref_id),
    ['harness_run_001', 'harness_run_002'],
  );
});

test('AI workflow harness migration declares queryable runtime gate and queue indexes', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260521230000_add_paper_implementation_ai_workflow_harness/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pi_harness_project_created_idx',
    'pi_harness_project_status_idx',
    'pi_input_target_idx',
    'pi_awhr_workflow_status_idx',
    'pi_awhr_trace_status_idx',
    'pi_proposal_target_idx',
    'pi_quality_type_severity_idx',
    'pi_gate_type_result_idx',
    'pi_transition_key_outcome_idx',
    'pi_queue_project_dedup_key',
    'pi_queue_type_status_idx',
    'pi_queue_target_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
});
