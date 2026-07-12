// PC-S1..S3 (T-124 S2-A, D3/D-T128-02): shared caller-side deterministic structural
// compression attempt builder for paper-implementation runtime slots.
//
// The shared orchestrator (T-128 W-11) recovers a `requires_compression` token-gate
// decision ONLY from a caller-prebuilt `compression_attempt.compressed_messages`
// (single attempt, deterministic quality gate, re-gate, then continue). This module
// is the paper-implementation caller half: a pure function that
//   1. takes the slot's role-message builder (parameterized by packet view — single
//      source, no mirrored message template),
//   2. degrades the packet face level by level (v1 static levels below),
//   3. re-estimates each level with the SAME conservative estimator the orchestrator
//      uses for the post-compression re-gate, and stops at the first sufficient level
//      (smallest sufficient trim), and
//   4. emits the orchestrator-contract `TopicSelectionAgentRuntimeCompressionAttemptInput`.
//
// Degradation levels (v1, static single source — PC-S1):
//   L1 `packet_body_excerpt` — per-packet body fields (`content_summary`, `key_facts`)
//      are cut to fixed-length excerpts with an explicit truncation marker; the packet
//      skeleton (source_ref / packet_ref / hashes / covered_* ref lists / evidence_kind)
//      is preserved verbatim.
//   L2 `packet_body_removed` — packet bodies are dropped entirely; the refs/hashes
//      skeleton stays as a manifest of what was removed.
// NEVER trimmed at any level: authority/conflict/challenge refs and every
// `preserved_fact_kinds` skeleton fact — levels only touch the two packet body fields,
// so `compressed_preserved_facts` always equals `required_preserved_facts`.
//
// When even L2 does not fit, the deepest attempt is still returned: the orchestrator
// records the compression report and fail-closes with
// TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION (single-attempt, no retry loop). When
// there is no packet face at all (authority-only over-budget input), this returns
// null so the caller supplies no attempt and the legacy record-and-block semantics
// (TOKEN_BUDGET_REQUIRES_COMPRESSION) stay byte-identical — that is the L5
// "uncompressible" branch.

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionContextPolicyProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';

import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type {
  TopicSelectionAgentRuntimeCompressionAttemptInput,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import {
  TopicSelectionConservativeTokenEstimatorService,
} from './topic-selection-conservative-token-estimator-service.js';

/** Packet body face shared by every paper-implementation packet slot (and by the
 *  coordinator lane A `source_context_packets` injected via S2-B B3 — those packets
 *  carry the admitted upstream proposal body inside `key_facts`, so the same levels
 *  apply to them). Slot-specific packet extras (packet_ref/packet_hash/source_hash/
 *  covered_* refs) survive trims verbatim via object spread. */
export interface PaperImplementationCompressiblePacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export const PAPER_IMPLEMENTATION_COMPRESSION_LEVELS = [
  'L1_packet_body_excerpt',
  'L2_packet_body_removed',
] as const;
export type PaperImplementationCompressionLevel =
  (typeof PAPER_IMPLEMENTATION_COMPRESSION_LEVELS)[number];

/** v1 level constants (PC-S1: static, single source, machine-testable). */
export const PAPER_IMPLEMENTATION_COMPRESSION_L1_CONTENT_SUMMARY_EXCERPT_CHARS = 320;
export const PAPER_IMPLEMENTATION_COMPRESSION_L1_KEY_FACT_EXCERPT_CHARS = 240;
export const PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS = 8;
export const PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER =
  '[TRUNCATED:deterministic_structural]';
export const PAPER_IMPLEMENTATION_COMPRESSION_L2_BODY_REMOVED_MARKER =
  '[REMOVED:deterministic_structural_L2 packet body dropped; refs and hashes retained]';

export interface BuildPaperImplementationCompressionAttemptInput<
  P extends PaperImplementationCompressiblePacket,
> {
  packets: readonly P[];
  /** The slot's role-message builder parameterized by the packet view. MUST be the
   *  same function that produced the original request messages (single source). */
  buildMessages: (packets: readonly P[]) => Array<{ role: 'system' | 'user'; content: string }>;
  contextPolicyProfile: TopicSelectionContextPolicyProfile;
  /** Structured-output schema of the invocation (mirrors the orchestrator re-gate). */
  schema: Record<string, unknown>;
  /** Same extra_payloads the slot puts on runtime_token_budget (re-gate mirrors them). */
  extraPayloads?: unknown[];
  sourceRefs: readonly TopicSelectionFunctionalRef[];
  /** Ref-skeleton facts (per preserved_fact_kinds) that survive every level.
   *  Packet BODY content is deliberately never listed as required (PC-S1). */
  requiredPreservedFacts: TopicSelectionCompressionFactInventory;
  estimator?: TopicSelectionConservativeTokenEstimatorService;
}

export interface PaperImplementationCompressionAttemptSelection {
  attempt: TopicSelectionAgentRuntimeCompressionAttemptInput;
  compression_level: PaperImplementationCompressionLevel;
  estimated_input_tokens_before: number;
  estimated_input_tokens_after: number;
  /** false only when even the deepest level still exceeds the budget — the
   *  orchestrator will then record the report and hard-block AFTER_COMPRESSION. */
  fits_within_budget: boolean;
}

export function trimPaperImplementationPacketsToLevel<
  P extends PaperImplementationCompressiblePacket,
>(packets: readonly P[], level: PaperImplementationCompressionLevel): P[] {
  if (level === 'L2_packet_body_removed') {
    return packets.map((packet) => ({
      ...packet,
      content_summary: PAPER_IMPLEMENTATION_COMPRESSION_L2_BODY_REMOVED_MARKER,
      key_facts: [],
    }));
  }
  return packets.map((packet) => ({
    ...packet,
    content_summary: excerpt(
      packet.content_summary,
      PAPER_IMPLEMENTATION_COMPRESSION_L1_CONTENT_SUMMARY_EXCERPT_CHARS,
    ),
    key_facts: trimKeyFacts(packet.key_facts),
  }));
}

/** Builds the caller-supplied compression attempt, choosing the smallest sufficient
 *  level (estimate per level with the conservative estimator, stop when it fits).
 *  Returns null when the request has no packet face — nothing is deterministically
 *  trimmable, so the caller must NOT supply an attempt (legacy fail-closed path). */
export function buildPaperImplementationCompressionAttempt<
  P extends PaperImplementationCompressiblePacket,
>(
  input: BuildPaperImplementationCompressionAttemptInput<P>,
): PaperImplementationCompressionAttemptSelection | null {
  if (input.packets.length === 0) {
    return null;
  }
  const estimator = input.estimator ?? new TopicSelectionConservativeTokenEstimatorService();
  const policy = input.contextPolicyProfile.token_budget_policy;
  const originalMessages = input.buildMessages(input.packets);
  const estimatedBefore = estimator.estimateInputTokens({
    messages: originalMessages,
    schema: input.schema,
    extra_payloads: input.extraPayloads ?? [],
    safety_margin: policy.token_estimate_safety_margin,
  }).estimated_input_tokens;

  let selected: {
    level: PaperImplementationCompressionLevel;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    compressedContext: Record<string, unknown>;
    summary: Record<string, unknown>;
    estimatedAfter: number;
    fits: boolean;
  } | null = null;
  for (const level of PAPER_IMPLEMENTATION_COMPRESSION_LEVELS) {
    const trimmedPackets = trimPaperImplementationPacketsToLevel(input.packets, level);
    const messages = input.buildMessages(trimmedPackets);
    const compressedContext = compressedContextDescriptor(level, input.packets, messages);
    const summary = attemptSummary(level, input.packets.length);
    // Mirror of the orchestrator's post-compression re-gate estimate: compressed
    // messages + [compressed_context, summary] payloads + schema + extra payloads,
    // same safety margin, default (most conservative) provider calibration.
    const estimatedAfter = estimator.estimateInputTokens({
      messages,
      context_payloads: [compressedContext, summary],
      schema: input.schema,
      extra_payloads: input.extraPayloads ?? [],
      safety_margin: policy.token_estimate_safety_margin,
    }).estimated_input_tokens;
    const fits = estimatedAfter <= policy.estimated_input_token_target
      && (policy.context_window_tokens === null
        || estimatedAfter + policy.estimated_output_token_budget <= policy.context_window_tokens);
    selected = {
      level,
      messages,
      compressedContext,
      summary,
      estimatedAfter,
      fits,
    };
    if (fits) {
      break;
    }
  }
  if (!selected) {
    return null;
  }

  const sourceRefs = input.sourceRefs.length > 0
    ? [...input.sourceRefs]
    : input.packets.map((packet) => packet.source_ref);
  return {
    attempt: {
      source_refs: sourceRefs,
      input_context: { messages: originalMessages },
      compressed_context: selected.compressedContext,
      summary: selected.summary,
      compressed_messages: selected.messages,
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: input.requiredPreservedFacts,
      // Levels only touch packet body fields; every declared ref-skeleton fact
      // survives verbatim, so compressed == required by construction.
      compressed_preserved_facts: input.requiredPreservedFacts,
      estimated_input_tokens_before_override: estimatedBefore,
      estimated_input_tokens_after_override: selected.estimatedAfter,
    },
    compression_level: selected.level,
    estimated_input_tokens_before: estimatedBefore,
    estimated_input_tokens_after: selected.estimatedAfter,
    fits_within_budget: selected.fits,
  };
}

function trimKeyFacts(keyFacts: readonly string[]): string[] {
  const kept = keyFacts
    .slice(0, PAPER_IMPLEMENTATION_COMPRESSION_L1_MAX_KEY_FACTS)
    .map((fact) => excerpt(fact, PAPER_IMPLEMENTATION_COMPRESSION_L1_KEY_FACT_EXCERPT_CHARS));
  const droppedCount = keyFacts.length - kept.length;
  if (droppedCount > 0) {
    kept.push(`${PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER} ${droppedCount} key_facts dropped`);
  }
  return kept;
}

function excerpt(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)} ${PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER}`;
}

function compressedContextDescriptor(
  level: PaperImplementationCompressionLevel,
  packets: readonly PaperImplementationCompressiblePacket[],
  compressedMessages: Array<{ role: 'system' | 'user'; content: string }>,
): Record<string, unknown> {
  return {
    payload_schema: 'PaperImplementationCompressedContextDescriptor@v1',
    compression_level: level,
    packet_count: packets.length,
    // Hash (not body) of the refs/hashes packet manifest: the manifest itself is
    // preserved INSIDE the compressed messages (every level keeps the packet
    // skeleton), and the orchestrator re-gate counts [compressed_context, summary]
    // as payloads — re-listing per-packet refs here would double-count them exactly
    // the way N3 did. The hash keeps the lineage recomputable from the request.
    packet_manifest_hash: sha256Text(
      stableStringify(packets.map((packet) => packetManifestEntry(packet))),
    ),
    compressed_messages_hash: sha256Text(stableStringify(compressedMessages)),
  };
}

function packetManifestEntry(
  packet: PaperImplementationCompressiblePacket,
): Record<string, unknown> {
  const record = packet as unknown as Record<string, unknown>;
  const entry: Record<string, unknown> = {
    source_ref: packet.source_ref,
    evidence_kind: packet.evidence_kind,
  };
  for (const key of ['packet_ref', 'packet_hash', 'source_hash'] as const) {
    if (record[key] !== undefined) {
      entry[key] = record[key];
    }
  }
  return entry;
}

function attemptSummary(
  level: PaperImplementationCompressionLevel,
  packetCount: number,
): Record<string, unknown> {
  return {
    payload_schema: 'PaperImplementationCompressionAttemptSummary@v1',
    compression_level: level,
    packet_count: packetCount,
    trimmed_packet_fields: ['content_summary', 'key_facts'],
    truncation_marker: PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER,
    refs_and_hashes_preserved: true,
  };
}
