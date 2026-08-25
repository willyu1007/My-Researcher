import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionNeedCandidateDraft,
  TopicSelectionRankedCandidateDraftBatch,
  TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue,
  TopicSelectionRankedCandidateDraftBatchMinimumValidationReport,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const DEFAULT_MAX_PERSISTED_CANDIDATES = 5;
const INVALID_BATCH_CODE = 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH';

export type TopicSelectionRankedCandidateDraftBatchValidationInput = {
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  ranked_candidate_draft_batch: TopicSelectionRankedCandidateDraftBatch;
  max_persisted_candidates?: number | null;
};

export class TopicSelectionRankedCandidateDraftBatchValidatorService {
  private readonly now: () => string;

  constructor(options: { now?: () => string } = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  validate(
    input: TopicSelectionRankedCandidateDraftBatchValidationInput,
  ): TopicSelectionRankedCandidateDraftBatchMinimumValidationReport {
    const batch = input.ranked_candidate_draft_batch;
    const issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[] = [];
    const maxPersistedCandidates = this.maxPersistedCandidates(input.max_persisted_candidates);
    const batchMaxPersistedCandidates = batch.draft_batch.max_persisted_candidates;

    this.validateBatchMetadata(input.node_input, batch, maxPersistedCandidates, issues);
    this.validateEmptyBatchSemantics(batch, issues);
    this.validateDrafts(batch.drafts, batchMaxPersistedCandidates, maxPersistedCandidates, issues);
    this.validateUnresolvedPoints(batch, issues);

    const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
    const warningIssues = issues.filter((issue) => issue.severity === 'warning');
    return {
      schema_version: 'v1',
      batch_id: batch.draft_batch.batch_id,
      node_attempt_id: batch.draft_batch.node_attempt_id,
      valid: blockingIssues.length === 0,
      terminal_result: batch.draft_batch.terminal_result,
      batch_payload_hash: `sha256:${sha256Text(stableStringify(batch))}`,
      draft_count: batch.drafts.length,
      max_persisted_candidates: maxPersistedCandidates,
      checked_at: this.now(),
      issue_count: issues.length,
      blocking_issue_count: blockingIssues.length,
      warning_issue_count: warningIssues.length,
      blocking_reason_codes: blockingIssues.length > 0
        ? this.unique([INVALID_BATCH_CODE, ...blockingIssues.map((issue) => issue.issue_code)])
        : [],
      warning_codes: this.unique(warningIssues.map((issue) => issue.issue_code)),
      issues,
    };
  }

  private validateBatchMetadata(
    nodeInput: TopicSelectionGenerateNeedCandidateNodeInput,
    batch: TopicSelectionRankedCandidateDraftBatch,
    maxPersistedCandidates: number,
    issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[],
  ): void {
    if (batch.schema_version !== nodeInput.schema_version) {
      this.addBlockingIssue(issues, {
        issue_code: 'SCHEMA_VERSION_MISMATCH',
        message: 'RankedCandidateDraftBatch schema_version must match GenerateNeedCandidateNodeInput.',
        field_path: 'schema_version',
      });
    }
    if (batch.draft_batch.node_attempt_id !== nodeInput.node_attempt_id) {
      this.addBlockingIssue(issues, {
        issue_code: 'NODE_ATTEMPT_MISMATCH',
        message: 'RankedCandidateDraftBatch node_attempt_id must match GenerateNeedCandidateNodeInput.',
        field_path: 'draft_batch.node_attempt_id',
      });
    }
    if (!Number.isInteger(batch.draft_batch.max_persisted_candidates) || batch.draft_batch.max_persisted_candidates < 1) {
      this.addBlockingIssue(issues, {
        issue_code: 'INVALID_MAX_PERSISTED_CANDIDATES',
        message: 'draft_batch.max_persisted_candidates must be a positive integer.',
        field_path: 'draft_batch.max_persisted_candidates',
      });
      return;
    }
    if (batch.draft_batch.max_persisted_candidates > maxPersistedCandidates) {
      this.addBlockingIssue(issues, {
        issue_code: 'TOO_MANY_NEED_CANDIDATES',
        message: 'draft_batch.max_persisted_candidates exceeds the arbiter policy maximum.',
        field_path: 'draft_batch.max_persisted_candidates',
      });
    }
  }

  private validateEmptyBatchSemantics(
    batch: TopicSelectionRankedCandidateDraftBatch,
    issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[],
  ): void {
    if (batch.draft_batch.terminal_result === 'finalize' && batch.drafts.length === 0) {
      this.addBlockingIssue(issues, {
        issue_code: 'FINALIZE_WITHOUT_DRAFTS',
        message: 'terminal_result finalize requires at least one grounded candidate draft.',
        field_path: 'drafts',
      });
    }
    if (
      batch.drafts.length === 0
      && (batch.rejected_framings?.length ?? 0) === 0
      && batch.unresolved_points.length === 0
    ) {
      this.addBlockingIssue(issues, {
        issue_code: 'UNEXPLAINED_EMPTY_BATCH',
        message: 'empty candidate draft batches must include rejected_framings or unresolved_points.',
        field_path: 'drafts',
      });
    }
  }

  private validateDrafts(
    drafts: TopicSelectionNeedCandidateDraft[],
    batchMaxPersistedCandidates: number,
    policyMaxPersistedCandidates: number,
    issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[],
  ): void {
    if (drafts.length > policyMaxPersistedCandidates || drafts.length > batchMaxPersistedCandidates) {
      this.addBlockingIssue(issues, {
        issue_code: 'TOO_MANY_NEED_CANDIDATES',
        message: 'ranked candidate draft count exceeds the configured maximum.',
        field_path: 'drafts',
      });
    }

    const draftIds = new Set<string>();
    const ranks = new Set<number>();
    let groundedDraftCount = 0;
    let previousRank = 0;

    drafts.forEach((draft, index) => {
      if (draftIds.has(draft.draft_id)) {
        this.addBlockingIssue(issues, {
          issue_code: 'DUPLICATE_DRAFT_ID',
          message: 'draft_id must be unique inside a RankedCandidateDraftBatch.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].draft_id`,
        });
      }
      draftIds.add(draft.draft_id);

      if (!Number.isInteger(draft.rank) || draft.rank < 1) {
        this.addBlockingIssue(issues, {
          issue_code: 'INVALID_DRAFT_RANK',
          message: 'draft rank must be a positive integer.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].rank`,
        });
      }
      if (ranks.has(draft.rank)) {
        this.addBlockingIssue(issues, {
          issue_code: 'DUPLICATE_DRAFT_RANK',
          message: 'draft rank must be unique inside a RankedCandidateDraftBatch.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].rank`,
        });
      }
      ranks.add(draft.rank);
      if (index > 0 && draft.rank <= previousRank) {
        this.addBlockingIssue(issues, {
          issue_code: 'UNSORTED_DRAFT_RANK',
          message: 'drafts must be sorted by ascending rank.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].rank`,
        });
      }
      if (draft.rank !== index + 1) {
        this.addBlockingIssue(issues, {
          issue_code: 'NON_CONTIGUOUS_DRAFT_RANK',
          message: 'draft ranks must be contiguous from 1.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].rank`,
        });
      }
      previousRank = draft.rank;

      const evidenceRefs = this.evidenceRefs(draft);
      if (evidenceRefs.length === 0) {
        this.addBlockingIssue(issues, {
          issue_code: 'DRAFT_MISSING_EVIDENCE_REFS',
          message: 'each candidate draft must cite at least one evidence role ref.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].evidence_role_bundle`,
        });
      }
      if (draft.strength_assessment_refs.length === 0) {
        this.addBlockingIssue(issues, {
          issue_code: 'DRAFT_MISSING_STRENGTH_REFS',
          message: 'each candidate draft must cite at least one evidence strength assessment ref.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].strength_assessment_refs`,
        });
      }
      if (draft.gap_codes.length === 0) {
        this.addBlockingIssue(issues, {
          issue_code: 'DRAFT_WITHOUT_GAP_CODE',
          message: 'each candidate draft must expose at least one gap code before admission.',
          draft_id: draft.draft_id,
          field_path: `drafts[${index}].gap_codes`,
        });
      }
      if (draft.confidence !== null && draft.confidence !== undefined) {
        if (!Number.isFinite(draft.confidence) || draft.confidence < 0 || draft.confidence > 1) {
          this.addBlockingIssue(issues, {
            issue_code: 'INVALID_DRAFT_CONFIDENCE',
            message: 'draft confidence must be between 0 and 1 when provided.',
            draft_id: draft.draft_id,
            field_path: `drafts[${index}].confidence`,
          });
        }
      }
      if (evidenceRefs.length > 0 && draft.strength_assessment_refs.length > 0 && draft.gap_codes.length > 0) {
        groundedDraftCount += 1;
      }
    });

    if (drafts.length > 0 && groundedDraftCount === 0) {
      this.addBlockingIssue(issues, {
        issue_code: 'NO_GROUNDED_NEED_CANDIDATE',
        message: 'at least one candidate draft must cite evidence, strength assessment, and gap code refs.',
        field_path: 'drafts',
      });
    }
  }

  private validateUnresolvedPoints(
    batch: TopicSelectionRankedCandidateDraftBatch,
    issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[],
  ): void {
    if (batch.draft_batch.terminal_result !== 'finalize') {
      return;
    }
    batch.unresolved_points.forEach((point, index) => {
      if (point.routed_to === 'blocked') {
        this.addBlockingIssue(issues, {
          issue_code: 'FINALIZE_WITH_BLOCKING_UNRESOLVED_POINT',
          message: 'terminal_result finalize cannot carry unresolved points routed_to blocked.',
          field_path: `unresolved_points[${index}].routed_to`,
          refs: point.refs,
        });
      }
    });
  }

  private maxPersistedCandidates(value?: number | null): number {
    if (Number.isInteger(value) && value !== null && value !== undefined && value > 0) {
      return value;
    }
    return DEFAULT_MAX_PERSISTED_CANDIDATES;
  }

  private evidenceRefs(draft: TopicSelectionNeedCandidateDraft): TopicSelectionFunctionalRef[] {
    return [
      ...draft.evidence_role_bundle.support_unit_refs,
      ...draft.evidence_role_bundle.challenge_unit_refs,
      ...draft.evidence_role_bundle.baseline_unit_refs,
      ...draft.evidence_role_bundle.context_unit_refs,
    ];
  }

  private addBlockingIssue(
    issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[],
    input: {
      issue_code: string;
      message: string;
      draft_id?: string | null;
      field_path?: string | null;
      refs?: TopicSelectionFunctionalRef[];
    },
  ): void {
    issues.push({
      issue_code: input.issue_code,
      severity: 'blocking',
      message: input.message,
      draft_id: input.draft_id ?? null,
      field_path: input.field_path ?? null,
      refs: input.refs ?? [],
    });
  }

  private unique(values: string[]): string[] {
    return [...new Set(values)];
  }
}
