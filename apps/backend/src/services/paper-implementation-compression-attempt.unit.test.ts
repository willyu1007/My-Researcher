import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
  type TopicSelectionContextPolicyProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';

import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  buildPaperImplementationCompressionAttempt,
  PAPER_IMPLEMENTATION_COMPRESSION_L1_CONTENT_SUMMARY_EXCERPT_CHARS,
  PAPER_IMPLEMENTATION_COMPRESSION_L1_KEY_FACT_EXCERPT_CHARS,
  PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS,
  PAPER_IMPLEMENTATION_COMPRESSION_L2_BODY_REMOVED_MARKER,
  PAPER_IMPLEMENTATION_COMPRESSION_LEVELS,
  PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER,
  trimPaperImplementationPacketsToLevel,
  type PaperImplementationCompressiblePacket,
} from './paper-implementation-compression-attempt.js';

const FAT_TEXT = 'Neutral benchmark evidence sentence with cited source support and no secrets. '.repeat(400);

interface TestPacket extends PaperImplementationCompressiblePacket {
  packet_ref: { ref_type: string; ref_id: string };
  packet_hash: string;
  source_hash: string;
  covered_evidence_refs: Array<{ ref_type: string; ref_id: string }>;
}

function packet(index: number, overrides: Partial<TestPacket> = {}): TestPacket {
  return {
    source_ref: { ref_type: 'source_locator', ref_id: `source_locator_${index}` },
    evidence_kind: 'source_locator',
    content_summary: FAT_TEXT,
    key_facts: [FAT_TEXT, `bounded fact ${index}`],
    packet_ref: { ref_type: 'source_context_packet', ref_id: `packet_${index}` },
    packet_hash: sha256Text(`packet-${index}`),
    source_hash: sha256Text(`source-${index}`),
    covered_evidence_refs: [{ ref_type: 'evidence_unit', ref_id: `evidence_${index}` }],
    ...overrides,
  };
}

function profile(tokenBudget: {
  estimated_input_token_target: number;
  estimated_output_token_budget?: number;
  context_window_tokens?: number | null;
}): TopicSelectionContextPolicyProfile {
  return {
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
    context_policy_profile_id: 'paper-implementation.compression-attempt-test.context-policy.v1',
    context_policy_profile_version: 'v1',
    invocation_slot_id: 'compression_attempt_test.slot',
    functional_template: 'delegated_payload_candidate',
    execution_modifiers: ['provider_required_live'],
    context_family: 'paper_implementation_trace_integrity_review',
    allowed_source_kinds: ['ref_backed_artifact'],
    memory_policy: {
      allowed_memory_families: [],
      required_use_labels: [],
      stale_behavior: 'block',
      missing_required_memory_behavior: 'allow',
      durable_memory_as_standalone_evidence: false,
    },
    compression_policy: {
      compression_mode: 'required_when_over_budget',
      allowed_executor_kinds: ['deterministic_structural'],
      compression_strategy_id: 'compression_attempt_test.context-compression',
      compression_strategy_version: 'v1',
      preserved_fact_kinds: ['source_locator_ref'],
      forbidden_payload_classes: ['raw_provider_response'],
      quality_gate_required: true,
    },
    cache_policy: {
      cache_enabled: false,
      cache_scope: 'context_identity_preprocessing',
      exact_key_fields: [],
      stale_behavior: 'block',
      post_cache_gates: [],
    },
    token_budget_policy: {
      estimated_input_token_target: tokenBudget.estimated_input_token_target,
      estimated_output_token_budget: tokenBudget.estimated_output_token_budget ?? 1_000,
      context_window_tokens: tokenBudget.context_window_tokens === undefined
        ? 128_000
        : tokenBudget.context_window_tokens,
      token_estimate_safety_margin: 1.25,
      unknown_estimate_behavior: 'blocked_over_budget',
    },
    reuse_policy: {
      provider_llm_response_reuse: 'blocked',
      codex_exact_reuse_requires_approval: true,
      mock_replay_allowed: true,
      provider_required_live_behavior: 'live_call_required',
    },
    post_reuse_gates: [],
    provenance_policy: {
      runtime_audit_envelope_required: true,
      operator_audit_summary_required: false,
      human_trust_summary_required: false,
      forbidden_persisted_payload_classes: ['raw_provider_response'],
    },
    redaction_policy: 'compression_attempt_test.redaction.v1',
  };
}

function buildMessages(
  packets: readonly TestPacket[],
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: 'Return only structured JSON.' },
    { role: 'user', content: stableStringify({ source_context_packets: packets }) },
  ];
}

function buildInput(packets: TestPacket[], targetTokens: number) {
  return {
    packets,
    buildMessages,
    contextPolicyProfile: profile({ estimated_input_token_target: targetTokens }),
    schema: { type: 'object', additionalProperties: false, properties: {} },
    extraPayloads: [{ packet_count: packets.length }],
    sourceRefs: packets.map((item) => item.source_ref),
    requiredPreservedFacts: {
      source_locator_ref: packets.map((item) => item.source_ref.ref_id),
    },
  };
}

test('level constants declare exactly the two v1 levels in trim order', () => {
  assert.deepEqual([...PAPER_IMPLEMENTATION_COMPRESSION_LEVELS], [
    'L1_packet_body_excerpt',
    'L2_packet_body_removed',
  ]);
});

test('L1 trims packet body fields to marked excerpts and preserves the ref skeleton verbatim', () => {
  const original = packet(1, {
    key_facts: Array.from({ length: PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS + 3 }, () => FAT_TEXT),
  });
  const [trimmed] = trimPaperImplementationPacketsToLevel([original], 'L1_packet_body_excerpt');
  assert.ok(trimmed);
  assert.equal(
    trimmed.content_summary,
    `${FAT_TEXT.slice(0, PAPER_IMPLEMENTATION_COMPRESSION_L1_CONTENT_SUMMARY_EXCERPT_CHARS)} ${PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER}`,
  );
  // Kept facts are excerpted, plus one explicit drop marker for the overflow.
  assert.equal(trimmed.key_facts.length, PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS + 1);
  assert.equal(
    trimmed.key_facts[0],
    `${FAT_TEXT.slice(0, PAPER_IMPLEMENTATION_COMPRESSION_L1_KEY_FACT_EXCERPT_CHARS)} ${PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER}`,
  );
  assert.equal(
    trimmed.key_facts[PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS],
    `${PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER} 3 key_facts dropped`,
  );
  // Never trimmed: refs, hashes, covered refs, evidence kind.
  assert.deepEqual(trimmed.source_ref, original.source_ref);
  assert.deepEqual(trimmed.packet_ref, original.packet_ref);
  assert.equal(trimmed.packet_hash, original.packet_hash);
  assert.equal(trimmed.source_hash, original.source_hash);
  assert.deepEqual(trimmed.covered_evidence_refs, original.covered_evidence_refs);
  assert.equal(trimmed.evidence_kind, original.evidence_kind);
  // Short bodies survive L1 unmarked.
  const [short] = trimPaperImplementationPacketsToLevel(
    [packet(2, { content_summary: 'short', key_facts: ['tiny'] })],
    'L1_packet_body_excerpt',
  );
  assert.equal(short?.content_summary, 'short');
  assert.deepEqual(short?.key_facts, ['tiny']);
});

test('L2 removes packet bodies entirely while keeping the refs/hashes manifest skeleton', () => {
  const original = packet(1);
  const [trimmed] = trimPaperImplementationPacketsToLevel([original], 'L2_packet_body_removed');
  assert.ok(trimmed);
  assert.equal(trimmed.content_summary, PAPER_IMPLEMENTATION_COMPRESSION_L2_BODY_REMOVED_MARKER);
  assert.deepEqual(trimmed.key_facts, []);
  assert.deepEqual(trimmed.source_ref, original.source_ref);
  assert.equal(trimmed.packet_hash, original.packet_hash);
  assert.equal(trimmed.source_hash, original.source_hash);
  assert.deepEqual(trimmed.covered_evidence_refs, original.covered_evidence_refs);
});

test('no packet face -> null (caller must fall back to the legacy fail-closed path)', () => {
  assert.equal(buildPaperImplementationCompressionAttempt(buildInput([], 2_000)), null);
});

test('selects L1 as the smallest sufficient level and emits the orchestrator attempt contract', () => {
  const packets = [packet(1), packet(2)];
  const selection = buildPaperImplementationCompressionAttempt(buildInput(packets, 4_000));
  assert.ok(selection);
  assert.equal(selection.compression_level, 'L1_packet_body_excerpt');
  assert.equal(selection.fits_within_budget, true);
  assert.ok(selection.estimated_input_tokens_after < selection.estimated_input_tokens_before);

  const attempt = selection.attempt;
  assert.equal(attempt.compression_executor_kind, 'deterministic_structural');
  assert.deepEqual(attempt.compressed_messages, buildMessages(
    trimPaperImplementationPacketsToLevel(packets, 'L1_packet_body_excerpt'),
  ));
  assert.deepEqual(attempt.source_refs, packets.map((item) => item.source_ref));
  // Refs are never trimmed, so compressed facts == required facts by construction.
  assert.deepEqual(attempt.compressed_preserved_facts, attempt.required_preserved_facts);
  assert.deepEqual(attempt.required_preserved_facts, {
    source_locator_ref: ['source_locator_1', 'source_locator_2'],
  });
  assert.equal(attempt.estimated_input_tokens_before_override, selection.estimated_input_tokens_before);
  assert.equal(attempt.estimated_input_tokens_after_override, selection.estimated_input_tokens_after);

  const compressedContext = attempt.compressed_context as {
    payload_schema: string;
    compression_level: string;
    packet_count: number;
    packet_manifest_hash: string;
    compressed_messages_hash: string;
  };
  assert.equal(compressedContext.payload_schema, 'PaperImplementationCompressedContextDescriptor@v1');
  assert.equal(compressedContext.compression_level, 'L1_packet_body_excerpt');
  assert.equal(compressedContext.packet_count, 2);
  // Recomputable manifest hash of the never-trimmed refs/hashes skeleton.
  assert.equal(
    compressedContext.packet_manifest_hash,
    sha256Text(stableStringify(packets.map((item) => ({
      source_ref: item.source_ref,
      evidence_kind: item.evidence_kind,
      packet_ref: item.packet_ref,
      packet_hash: item.packet_hash,
      source_hash: item.source_hash,
    })))),
  );
  assert.equal(
    compressedContext.compressed_messages_hash,
    sha256Text(stableStringify(attempt.compressed_messages)),
  );
  const summary = attempt.summary as { payload_schema: string; compression_level: string };
  assert.equal(summary.payload_schema, 'PaperImplementationCompressionAttemptSummary@v1');
  assert.equal(summary.compression_level, 'L1_packet_body_excerpt');
});

test('falls through to L2 when the L1 excerpts still exceed the budget', () => {
  // 120 packets keep ~38k estimated tokens of excerpted body after L1 — still over
  // the 25k target — while the L2 skeleton (refs/hashes only, ~20k) fits.
  const packets = Array.from({ length: 120 }, (_, index) => packet(index));
  const selection = buildPaperImplementationCompressionAttempt(buildInput(packets, 25_000));
  assert.ok(selection);
  assert.equal(selection.compression_level, 'L2_packet_body_removed');
  assert.equal(selection.fits_within_budget, true);
  const sentText = stableStringify(selection.attempt.compressed_messages);
  assert.equal(sentText.includes(PAPER_IMPLEMENTATION_COMPRESSION_L2_BODY_REMOVED_MARKER), true);
});

test('returns the deepest attempt marked not-fitting when even L2 exceeds the budget', () => {
  const packets = Array.from({ length: 50 }, (_, index) => packet(index));
  const selection = buildPaperImplementationCompressionAttempt(buildInput(packets, 100));
  assert.ok(selection);
  assert.equal(selection.compression_level, 'L2_packet_body_removed');
  assert.equal(selection.fits_within_budget, false);
  assert.ok(selection.estimated_input_tokens_after > 100);
});
