/**
 * DP-3.3 N8 debate-threshold calibration — option-A runner.
 *
 * Option A (the locked STEP-1 decision): keep N8 `codex_assisted`; calibrate by having a content-grounded
 * assessor (an external Codex agent with file access, or any agent that reads the corpus bodies) produce a
 * real TopicValueAssessmentDraft per labeled topic — NOT score-pinned. This runner is the push-button glue
 * that ties the scaffold together:
 *
 *   corpus entry → (optional) materialize + gate pre-flight → assessor(entry) → captured draft → analysis record
 *   → analyzeN8DebateThresholdCalibration(records, thresholds)
 *
 * The assessor is PLUGGABLE: for a real run, supply one that reads the entry bodies (topic_question /
 * question_contract / answerability_plan / research_slice / evidence) and returns a draft — that is the
 * content-grounded act option A requires. For self-test, supply a deterministic mock. The runner itself never
 * produces scores and never sets thresholds — it only orchestrates capture + hands the records to the analyzer.
 *
 * Calibration TOOLING — not wired into any product route. See
 * dev-docs/archive/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/README.md.
 */
import type {
  TopicSelectionV1bN8DebateTriggerThresholds,
  TopicSelectionV1bTopicValueAssessmentDraftPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  analyzeN8DebateThresholdCalibration,
  DEFAULT_N8_CALIBRATION_VERDICT_GATES,
  type TopicSelectionN8CalibrationAnalysis,
  type TopicSelectionN8CalibrationRecord,
  type TopicSelectionN8CalibrationVerdictGates,
} from './topic-selection-v1b-n8-calibration-analysis.js';
import {
  buildN8CalibrationMockDraft,
  materializeN8CalibrationRunRequest,
  verifyN8CalibrationRunRequest,
  type MaterializeN8CalibrationResult,
  type TopicSelectionN8CalibrationCorpusEntry,
} from './topic-selection-v1b-n8-calibration-materializer.js';

export interface N8CalibrationAssessorInput {
  entry: TopicSelectionN8CalibrationCorpusEntry;
  /** The gate-valid N8 RunRequest + recorded artifacts (for assessors that want the production-shaped input). */
  materialized: MaterializeN8CalibrationResult;
}

export interface N8CalibrationAssessorOutput {
  status: 'succeeded' | 'blocked' | 'error';
  draft?: TopicSelectionV1bTopicValueAssessmentDraftPayload | null;
  blocker_codes?: string[];
}

/**
 * The content-grounded assessment step option A delegates to an external Codex agent (or any agent that reads
 * the real corpus bodies and returns a draft). MUST NOT be score-pinned and MUST be independent of the labeler
 * for the calibration to be valid (single-rater label+assess is circular — see README).
 */
export type N8CalibrationAssessor = (input: N8CalibrationAssessorInput) => Promise<N8CalibrationAssessorOutput>;

export interface N8CalibrationRunOptions {
  thresholds: TopicSelectionV1bN8DebateTriggerThresholds;
  verdictGates?: TopicSelectionN8CalibrationVerdictGates;
  /** Run materialize + a mocked gate pre-flight per entry to reject malformed corpus entries early (default true). */
  preflightGates?: boolean;
}

export interface N8CalibrationEntryDiagnostic {
  corpus_entry_id: string;
  expected_band: TopicSelectionN8CalibrationCorpusEntry['expected_band'];
  preflight: 'passed' | 'failed' | 'skipped';
  preflight_error?: string;
  assessor_status: N8CalibrationAssessorOutput['status'];
}

export interface N8CalibrationRunResult {
  records: TopicSelectionN8CalibrationRecord[];
  analysis: TopicSelectionN8CalibrationAnalysis;
  per_entry: N8CalibrationEntryDiagnostic[];
}

/** Raw corpus file shape: { entries: [...] } with placeholder markers. */
interface RawCorpus {
  entries?: Array<TopicSelectionN8CalibrationCorpusEntry & { __placeholder?: boolean }>;
}

/**
 * Parse + validate a corpus file. Rejects placeholder entries from a real run (calibrating on
 * `__placeholder: true` rows would be the circular guessing DP-3.3 forbids).
 */
export function loadN8CalibrationCorpus(raw: unknown): TopicSelectionN8CalibrationCorpusEntry[] {
  const corpus = raw as RawCorpus;
  if (!corpus || !Array.isArray(corpus.entries)) {
    throw new Error('N8 calibration corpus must be an object with an `entries` array.');
  }
  const placeholders = corpus.entries.filter((e) => e.__placeholder === true).map((e) => e.corpus_entry_id);
  if (placeholders.length > 0) {
    throw new Error(
      `Refusing to calibrate on placeholder corpus entries (${placeholders.join(', ')}). `
      + 'Replace every __placeholder entry with a human-curated, ground-truth-labeled real topic first.',
    );
  }
  const ids = new Set<string>();
  for (const entry of corpus.entries) {
    if (!entry.corpus_entry_id) throw new Error('Every corpus entry needs a corpus_entry_id.');
    if (ids.has(entry.corpus_entry_id)) throw new Error(`Duplicate corpus_entry_id: ${entry.corpus_entry_id}.`);
    ids.add(entry.corpus_entry_id);
  }
  return corpus.entries.map((entry) => {
    const { __placeholder, ...rest } = entry;
    void __placeholder;
    return rest;
  });
}

/**
 * Run option-A calibration over a labeled corpus with a supplied assessor, then analyze.
 * Evaluates the EXACT thresholds passed (call once with the provisional set + once per candidate set).
 */
export async function runN8Calibration(
  corpus: readonly TopicSelectionN8CalibrationCorpusEntry[],
  assessor: N8CalibrationAssessor,
  options: N8CalibrationRunOptions,
): Promise<N8CalibrationRunResult> {
  const preflightGates = options.preflightGates ?? true;
  const records: TopicSelectionN8CalibrationRecord[] = [];
  const perEntry: N8CalibrationEntryDiagnostic[] = [];

  for (const entry of corpus) {
    const materialized = await materializeN8CalibrationRunRequest(entry);

    let preflight: N8CalibrationEntryDiagnostic['preflight'] = 'skipped';
    let preflightError: string | undefined;
    if (preflightGates) {
      try {
        const probe = buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, { total_score: 80, confidence: 0.8 });
        const verified = await verifyN8CalibrationRunRequest(materialized, probe);
        preflight = verified.status === 'succeeded' ? 'passed' : 'failed';
        if (verified.status !== 'succeeded') preflightError = `gate pre-flight blocked: ${verified.error_code ?? 'unknown'}`;
      } catch (error) {
        preflight = 'failed';
        preflightError = error instanceof Error ? error.message : String(error);
      }
    }

    let assessment: N8CalibrationAssessorOutput;
    if (preflight === 'failed') {
      // a corpus entry that cannot produce a gate-valid request is not assessable — record as error, do not assess.
      assessment = { status: 'error', blocker_codes: ['CORPUS_ENTRY_GATE_PREFLIGHT_FAILED'] };
    } else {
      assessment = await assessor({ entry, materialized });
    }

    const draft = assessment.status === 'succeeded' ? assessment.draft ?? null : null;
    records.push({
      topic_id: entry.corpus_entry_id,
      executor: 'codex_assisted',
      provider: entry.provenance.derived_from ?? null,
      status: assessment.status,
      blocker_codes: assessment.blocker_codes,
      total_score: draft?.total_score,
      confidence: draft?.confidence,
      dimension_scores: draft?.dimension_scores?.map((d) => ({ dimension_key: d.dimension_key, score: d.score })),
      // the corpus expected_band IS the 4-value ground-truth label the analysis scores against.
      ground_truth_label: entry.expected_band,
    });
    perEntry.push({
      corpus_entry_id: entry.corpus_entry_id,
      expected_band: entry.expected_band,
      preflight,
      preflight_error: preflightError,
      assessor_status: assessment.status,
    });
  }

  const analysis = analyzeN8DebateThresholdCalibration(
    records,
    options.thresholds,
    options.verdictGates ?? DEFAULT_N8_CALIBRATION_VERDICT_GATES,
  );
  return { records, analysis, per_entry: perEntry };
}

/** Deterministic mock assessor (self-test only): returns a canned draft per corpus_entry_id. */
export function mockN8CalibrationAssessor(
  scoresById: Record<string, { total_score: number; confidence: number; reviewerRiskScore?: number; otherDimScore?: number } | 'blocked'>,
): N8CalibrationAssessor {
  return async ({ entry, materialized }) => {
    const spec = scoresById[entry.corpus_entry_id];
    if (!spec || spec === 'blocked') {
      return { status: 'blocked', blocker_codes: ['MOCK_ASSESSOR_BLOCKED'] };
    }
    return {
      status: 'succeeded',
      draft: buildN8CalibrationMockDraft(materialized.bodyRefs.topic_question_contract, spec),
    };
  };
}
