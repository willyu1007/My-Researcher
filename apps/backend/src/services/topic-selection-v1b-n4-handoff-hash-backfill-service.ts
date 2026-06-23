// T-127 W-11 — one-time backfill of comparison_payload.n4_handoff_hash onto research-slice option-sets
// that predate T-115 Phase 2 (when the N4 runner began persisting the field). Old records lack the field,
// which makes human N5 selection 409 (V1bSliceHumanSelectionService requires it to assemble the frozen
// input). This service RECOMPUTES the hash from persisted state — never re-runs N4, never fabricates.
//
// RECOMPUTE: the full N4->N5 handoff object is persisted verbatim as a control-plane artifact, referenced
// from the option-set's artifact_refs. The stored hash was canonicalHash(handoff); reading that same
// artifact payload and applying the same canonicalHash reproduces the byte-identical value (the hash folds
// run-specific fields — source_node_attempt_id, gate_result_hash — that are NOT in comparison_payload, so a
// scalar reconstruction is impossible; the persisted object is the only faithful source).

import type {
  TopicSelectionArtifactRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  optionSetLacksN4HandoffHash,
  type TopicSelectionV1bResearchSliceRepository,
} from '../repositories/topic-selection-v1b-research-slice.repository.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

const N4_TO_N5_HANDOFF_KIND = 'N4ToN5Handoff';
const N5_TARGET_NODE_ID = 'topic-selection.v1b.select-research-slice.v1';

/** The narrow control-plane capability the backfill needs (read an artifact by ref id). */
export type V1bN4HandoffHashBackfillArtifactReader = {
  getArtifactRef(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null>;
};

/** The narrow research-slice repository capability the backfill needs. */
export type V1bN4HandoffHashBackfillSliceRepository = Pick<
  TopicSelectionV1bResearchSliceRepository,
  'findOptionSetById' | 'listOptionSetsMissingN4HandoffHash' | 'updateOptionSetComparisonPayload'
>;

export type V1bN4HandoffHashBackfillOutcome =
  | 'updated'
  | 'skipped_already_present'
  | 'unrecoverable';

export interface V1bN4HandoffHashBackfillReport {
  scanned: number;
  updated: number;
  skipped_already_present: number;
  unrecoverable: number;
  dry_run: boolean;
  details: Array<{
    option_set_id: string;
    outcome: V1bN4HandoffHashBackfillOutcome;
    n4_handoff_hash?: string;
    reason?: string;
  }>;
}

export interface V1bN4HandoffHashBackfillRunInput {
  /** When given, backfill exactly these option-sets (present ones are skipped). Else a global sweep. */
  optionSetIds?: string[];
  /** When given (and no optionSetIds), restrict the global sweep to these title-cards. */
  titleCardIds?: string[];
  /** Dry run = classify + count, write nothing. */
  dryRun: boolean;
}

export class TopicSelectionV1bN4HandoffHashBackfillService {
  constructor(
    private readonly researchSlice: V1bN4HandoffHashBackfillSliceRepository,
    private readonly controlPlane: V1bN4HandoffHashBackfillArtifactReader,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async run(input: V1bN4HandoffHashBackfillRunInput): Promise<V1bN4HandoffHashBackfillReport> {
    const candidates = await this.resolveCandidates(input);
    const report: V1bN4HandoffHashBackfillReport = {
      scanned: candidates.length,
      updated: 0,
      skipped_already_present: 0,
      unrecoverable: 0,
      dry_run: input.dryRun,
      details: [],
    };

    for (const optionSet of candidates) {
      const optionSetId = optionSet.research_slice_option_set_id;
      // Authoritative skip rule — the enumerator is coarse; an explicitly-listed id may already carry the hash.
      if (!optionSetLacksN4HandoffHash(optionSet)) {
        report.skipped_already_present += 1;
        report.details.push({ option_set_id: optionSetId, outcome: 'skipped_already_present' });
        continue;
      }
      const recomputed = await this.recomputeN4HandoffHash(optionSet);
      if (recomputed === null) {
        report.unrecoverable += 1;
        report.details.push({
          option_set_id: optionSetId,
          outcome: 'unrecoverable',
          reason: 'no retrievable N4ToN5Handoff artifact in artifact_refs',
        });
        continue;
      }
      if (!input.dryRun) {
        await this.researchSlice.updateOptionSetComparisonPayload(
          optionSetId,
          { ...optionSet.comparison_payload, n4_handoff_hash: recomputed },
          this.now(),
        );
      }
      report.updated += 1;
      report.details.push({ option_set_id: optionSetId, outcome: 'updated', n4_handoff_hash: recomputed });
    }

    return report;
  }

  private async resolveCandidates(
    input: V1bN4HandoffHashBackfillRunInput,
  ): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
    if (input.optionSetIds && input.optionSetIds.length > 0) {
      const records = await Promise.all(
        input.optionSetIds.map((optionSetId) => this.researchSlice.findOptionSetById(optionSetId)),
      );
      return records.filter((record): record is TopicSelectionResearchSliceOptionSetRecord => record !== null);
    }
    const missing = await this.researchSlice.listOptionSetsMissingN4HandoffHash();
    if (input.titleCardIds && input.titleCardIds.length > 0) {
      const titleCardIds = new Set(input.titleCardIds);
      return missing.filter((record) => titleCardIds.has(record.title_card_id));
    }
    return missing;
  }

  /**
   * Recompute n4_handoff_hash from persisted state: find the option-set's N4->N5 handoff artifact and hash
   * its payload with the SAME canonicalHash the N4 runner used. Returns null (unrecoverable) when no such
   * artifact is retrievable — never fabricates a value, never re-runs N4.
   */
  private async recomputeN4HandoffHash(
    optionSet: TopicSelectionResearchSliceOptionSetRecord,
  ): Promise<string | null> {
    for (const ref of optionSet.artifact_refs) {
      const artifact = await this.controlPlane.getArtifactRef(ref.ref_id);
      const payload = artifact?.payload ?? null;
      if (payload && isN4ToN5HandoffPayload(payload)) {
        return canonicalHash(payload);
      }
    }
    return null;
  }
}

/** Guard: the artifact payload is the N4->N5 handoff (artifact_refs can hold several refs — pick the right
 *  one, and never hash a wrong artifact). Checks both the envelope kind and the routed target node. */
function isN4ToN5HandoffPayload(payload: Record<string, unknown>): boolean {
  const envelope = payload.envelope;
  return (
    typeof envelope === 'object'
    && envelope !== null
    && (envelope as Record<string, unknown>).handoff_kind === N4_TO_N5_HANDOFF_KIND
    && payload.target_node_id === N5_TARGET_NODE_ID
  );
}
