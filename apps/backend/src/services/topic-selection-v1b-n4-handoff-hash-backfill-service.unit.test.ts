import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import { optionSetLacksN4HandoffHash } from '../repositories/topic-selection-v1b-research-slice.repository.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import {
  TopicSelectionV1bN4HandoffHashBackfillService,
} from './topic-selection-v1b-n4-handoff-hash-backfill-service.js';

const N5_TARGET_NODE_ID = 'topic-selection.v1b.select-research-slice.v1';

/** A persisted N4->N5 handoff object (only the fields the guard checks need to be realistic; the hash is
 *  over the whole object — `seed` makes distinct option-sets hash differently). */
function makeHandoffPayload(seed: string): Record<string, unknown> {
  return {
    envelope: {
      handoff_kind: 'N4ToN5Handoff',
      source_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
      source_node_attempt_id: `attempt_${seed}`,
      source_authority_hash: `${seed}`.repeat(8),
      source_gate_result_hash: `g_${seed}`,
      upstream_lineage_hash: `u_${seed}`,
      policy_version: 'topic-selection-v1b-node-policy-v1',
      schema_version: 'N4ToN5Handoff@v1',
      warning_codes: [],
      residual_risk_refs: [],
    },
    target_node_id: N5_TARGET_NODE_ID,
    route_signal: 'slice_options_generated',
    payload_hash: `ph_${seed}`,
    required_refs: [],
    payload: { research_slice_option_set_id: `os_${seed}` },
  };
}

function makeArtifact(refId: string, payload: Record<string, unknown> | null): TopicSelectionArtifactRefRecord {
  return {
    artifact_ref_id: refId,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload,
    created_by: 'system',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeOptionSet(
  overrides: Partial<TopicSelectionResearchSliceOptionSetRecord> = {},
): TopicSelectionResearchSliceOptionSetRecord {
  return {
    research_slice_option_set_id: 'os_default',
    workspace_id: null,
    title_card_id: 'tc_1',
    plan_research_slice_run_id: 'plan_run_1',
    v1b_intake_readiness_assessment_id: 'ira_1',
    v1b_intake_snapshot_id: 'snap_1',
    research_constraint_profile_id: 'rcp_1',
    v1b_input_bundle_id: 'bundle_1',
    validated_need_ids: ['ln_1'],
    status: 'ready_for_selection',
    recommended_option_id: 'rso_1',
    selected_option_id: null,
    option_count: 2,
    high_risk_option_count: 0,
    requires_human_review: false,
    comparison_axes: ['scope'],
    comparison_summary: 'slices',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options_payload: {},
    comparison_payload: { authority_hash: 'a'.repeat(64) },
    input_snapshot_id: null,
    workflow_run_id: null,
    artifact_refs: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** An old (missing-hash) option-set whose artifact_refs point at a retrievable N4->N5 handoff. */
function makeOldOptionSet(id: string, handoffRefId: string, titleCardId = 'tc_1'): TopicSelectionResearchSliceOptionSetRecord {
  return makeOptionSet({
    research_slice_option_set_id: id,
    title_card_id: titleCardId,
    comparison_payload: { authority_hash: 'a'.repeat(64) }, // no n4_handoff_hash
    artifact_refs: [
      { ref_type: 'topic_selection_artifact_unrelated', ref_id: `noise_${id}`, title_card_id: titleCardId, version_id: null },
      { ref_type: 'artifact_ref', ref_id: handoffRefId, title_card_id: titleCardId, version_id: null },
    ],
  });
}

class FakeSliceRepo {
  readonly records = new Map<string, TopicSelectionResearchSliceOptionSetRecord>();
  writeCount = 0;

  seed(record: TopicSelectionResearchSliceOptionSetRecord): void {
    this.records.set(record.research_slice_option_set_id, record);
  }

  async findOptionSetById(optionSetId: string): Promise<TopicSelectionResearchSliceOptionSetRecord | null> {
    return this.records.get(optionSetId) ?? null;
  }

  async listOptionSetsMissingN4HandoffHash(): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    return [...this.records.values()].filter(optionSetLacksN4HandoffHash);
  }

  async updateOptionSetComparisonPayload(
    optionSetId: string,
    comparisonPayload: Record<string, unknown>,
    updatedAt: string,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord> {
    this.writeCount += 1;
    const current = this.records.get(optionSetId)!;
    const next = { ...current, comparison_payload: comparisonPayload, updated_at: updatedAt };
    this.records.set(optionSetId, next);
    return next;
  }
}

class FakeArtifactReader {
  readonly artifacts = new Map<string, TopicSelectionArtifactRefRecord>();
  seed(refId: string, payload: Record<string, unknown> | null): void {
    this.artifacts.set(refId, makeArtifact(refId, payload));
  }
  async getArtifactRef(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null> {
    return this.artifacts.get(artifactRefId) ?? null;
  }
}

function makeSubject() {
  const repo = new FakeSliceRepo();
  const control = new FakeArtifactReader();
  const service = new TopicSelectionV1bN4HandoffHashBackfillService(repo, control, () => '2026-06-23T00:00:00.000Z');
  return { repo, control, service };
}

test('W-11 backfill: recomputes + persists n4_handoff_hash for old records, leaves present ones untouched', async () => {
  const { repo, control, service } = makeSubject();
  // Two old (missing) records, each with a retrievable handoff artifact, + one already-backfilled record.
  repo.seed(makeOldOptionSet('os_a', 'h_a'));
  repo.seed(makeOldOptionSet('os_b', 'h_b'));
  control.seed('h_a', makeHandoffPayload('a'));
  control.seed('h_b', makeHandoffPayload('b'));
  const present = makeOptionSet({ research_slice_option_set_id: 'os_present', comparison_payload: { authority_hash: 'a'.repeat(64), n4_handoff_hash: 'x'.repeat(64) } });
  repo.seed(present);

  const report = await service.run({ dryRun: false });

  // The global sweep scans only the missing records (the present one is excluded by the enumerator).
  assert.equal(report.scanned, 2);
  assert.equal(report.updated, 2);
  assert.equal(report.unrecoverable, 0);
  // The recomputed value equals canonicalHash of the SAME persisted handoff object the N4 runner wrote.
  assert.equal(repo.records.get('os_a')!.comparison_payload.n4_handoff_hash, canonicalHash(makeHandoffPayload('a')));
  assert.equal(repo.records.get('os_b')!.comparison_payload.n4_handoff_hash, canonicalHash(makeHandoffPayload('b')));
  // Distinct objects -> distinct hashes (the seed actually matters; not a constant).
  assert.notEqual(repo.records.get('os_a')!.comparison_payload.n4_handoff_hash, repo.records.get('os_b')!.comparison_payload.n4_handoff_hash);
  // The already-present record is byte-untouched.
  assert.equal(repo.records.get('os_present')!.comparison_payload.n4_handoff_hash, 'x'.repeat(64));
  // The merge preserves sibling comparison_payload keys.
  assert.equal(repo.records.get('os_a')!.comparison_payload.authority_hash, 'a'.repeat(64));
});

test('W-11 backfill: idempotent — a second run is a no-op', async () => {
  const { repo, control, service } = makeSubject();
  repo.seed(makeOldOptionSet('os_a', 'h_a'));
  control.seed('h_a', makeHandoffPayload('a'));

  const first = await service.run({ dryRun: false });
  assert.equal(first.updated, 1);
  const afterFirst = repo.records.get('os_a')!.comparison_payload.n4_handoff_hash;
  const writesAfterFirst = repo.writeCount;

  const second = await service.run({ dryRun: false });
  // The enumerator no longer returns the backfilled record -> nothing scanned, nothing written.
  assert.equal(second.scanned, 0);
  assert.equal(second.updated, 0);
  assert.equal(repo.writeCount, writesAfterFirst);
  assert.equal(repo.records.get('os_a')!.comparison_payload.n4_handoff_hash, afterFirst);
});

test('W-11 backfill: dry run classifies + counts but writes nothing', async () => {
  const { repo, control, service } = makeSubject();
  repo.seed(makeOldOptionSet('os_a', 'h_a'));
  control.seed('h_a', makeHandoffPayload('a'));

  const report = await service.run({ dryRun: true });
  assert.equal(report.dry_run, true);
  assert.equal(report.updated, 1);
  assert.equal(repo.writeCount, 0);
  // Still missing — no write happened.
  assert.equal(optionSetLacksN4HandoffHash(repo.records.get('os_a')!), true);
});

test('W-11 backfill: a record with no retrievable N4ToN5Handoff artifact is unrecoverable (never fabricated)', async () => {
  const { repo, control, service } = makeSubject();
  // Handoff artifact absent from the control plane (pruned / never written).
  repo.seed(makeOldOptionSet('os_missing_artifact', 'h_absent'));
  // A record whose only artifact is the WRONG kind -> must not be hashed.
  repo.seed(makeOldOptionSet('os_wrong_artifact', 'h_wrong'));
  control.seed('h_wrong', { envelope: { handoff_kind: 'N3ToN4Handoff' }, target_node_id: 'something-else' });

  const report = await service.run({ dryRun: false });
  assert.equal(report.updated, 0);
  assert.equal(report.unrecoverable, 2);
  assert.equal(repo.writeCount, 0);
  assert.equal(optionSetLacksN4HandoffHash(repo.records.get('os_missing_artifact')!), true);
  assert.equal(optionSetLacksN4HandoffHash(repo.records.get('os_wrong_artifact')!), true);
});

test('W-11 backfill: explicit option-set ids skip already-present records (skip rule)', async () => {
  const { repo, control, service } = makeSubject();
  const present = makeOptionSet({ research_slice_option_set_id: 'os_present', comparison_payload: { authority_hash: 'a'.repeat(64), n4_handoff_hash: 'x'.repeat(64) } });
  repo.seed(present);
  repo.seed(makeOldOptionSet('os_a', 'h_a'));
  control.seed('h_a', makeHandoffPayload('a'));

  const report = await service.run({ optionSetIds: ['os_present', 'os_a'], dryRun: false });
  assert.equal(report.scanned, 2);
  assert.equal(report.skipped_already_present, 1);
  assert.equal(report.updated, 1);
  assert.equal(repo.records.get('os_present')!.comparison_payload.n4_handoff_hash, 'x'.repeat(64));
  assert.equal(repo.records.get('os_a')!.comparison_payload.n4_handoff_hash, canonicalHash(makeHandoffPayload('a')));
});

test('W-11 backfill: title-card scoping restricts the global sweep', async () => {
  const { repo, control, service } = makeSubject();
  repo.seed(makeOldOptionSet('os_a', 'h_a', 'tc_1'));
  repo.seed(makeOldOptionSet('os_b', 'h_b', 'tc_2'));
  control.seed('h_a', makeHandoffPayload('a'));
  control.seed('h_b', makeHandoffPayload('b'));

  const report = await service.run({ titleCardIds: ['tc_1'], dryRun: false });
  assert.equal(report.scanned, 1);
  assert.equal(report.updated, 1);
  assert.equal(optionSetLacksN4HandoffHash(repo.records.get('os_a')!), false);
  assert.equal(optionSetLacksN4HandoffHash(repo.records.get('os_b')!), true); // tc_2 untouched
});
