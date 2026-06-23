import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  type TopicSelectionV1bN8DebateTriggerThresholds,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionN8CalibrationCorpusEntry } from './topic-selection-v1b-n8-calibration-materializer.js';
import {
  loadN8CalibrationCorpus,
  mockN8CalibrationAssessor,
  runN8Calibration,
} from './topic-selection-v1b-n8-calibration-runner.js';

const THRESHOLDS: TopicSelectionV1bN8DebateTriggerThresholds = {
  provisional: true,
  t1_total_score_min: 60,
  t1_total_score_max_exclusive: 72,
  t1_confidence_min: 0.55,
  t3_dimension_spread_min: 40,
  t3_single_dimension_floor: 35,
  t3_total_score_min: 60,
};

function entry(
  id: string,
  band: TopicSelectionN8CalibrationCorpusEntry['expected_band'],
  disposition: TopicSelectionN8CalibrationCorpusEntry['ground_truth_disposition'],
): TopicSelectionN8CalibrationCorpusEntry {
  return {
    corpus_entry_id: id,
    schema_version: 'TopicSelectionN8CalibrationCorpusEntry@v1',
    title_card_id: `title_card_${id}`,
    provenance: { author: 'test', created_at: '2026-06-15T00:00:00.000Z', source_note: 'synthetic', derived_from: 'synthetic' },
    topic_question: { main_question: `Q for ${id}` },
    question_contract: { main_question: `Q for ${id}`, claim_ceiling: 'bounded' },
    answerability_plan: { answerability_verdict: 'answerable', metrics: ['m'] },
    research_slice: { scope: 'narrow' },
    evidence: [{ evidence_role: 'support', rationale: 'r' }],
    n8_debate_admission: { debate_level: 'compact_assessment_debate', high_value_signal_codes: [], risk_signal_codes: [], rationale: 'baseline' },
    ground_truth_disposition: disposition,
    expected_band: band,
    labeler_notes: `synthetic ${band} entry`,
  };
}

const CORPUS: TopicSelectionN8CalibrationCorpusEntry[] = [
  entry('clear_pass_1', 'clear_pass', 'advance_to_package'),
  entry('borderline_1', 'borderline', 'refine_question'),
  entry('conflict_1', 'dimension_conflict', 'refine_slice'),
  entry('clear_fail_1', 'clear_fail', 'drop'),
];

test('runner drives corpus → assessor → analysis; correct ground-truth wiring + separating verdict', async () => {
  // a content-grounded assessor would read the bodies; here a mock returns scores that SHOULD map to each band.
  const assessor = mockN8CalibrationAssessor({
    clear_pass_1: { total_score: 83, confidence: 0.82, reviewerRiskScore: 72, otherDimScore: 84 }, // spread 12 → no trigger
    borderline_1: { total_score: 65, confidence: 0.9, reviewerRiskScore: 80, otherDimScore: 82 }, // total in band → T1
    conflict_1: { total_score: 83, confidence: 0.9, reviewerRiskScore: 40, otherDimScore: 84 }, // spread 44, total≥60 → T3
    clear_fail_1: { total_score: 40, confidence: 0.9, reviewerRiskScore: 35, otherDimScore: 50 }, // total < 60 → no trigger
  });

  const result = await runN8Calibration(CORPUS, assessor, { thresholds: THRESHOLDS });

  assert.equal(result.records.length, 4);
  // ground_truth_label is wired straight from expected_band
  assert.deepEqual(
    result.records.map((r) => [r.topic_id, r.ground_truth_label]).sort(),
    [['borderline_1', 'borderline'], ['clear_fail_1', 'clear_fail'], ['clear_pass_1', 'clear_pass'], ['conflict_1', 'dimension_conflict']],
  );
  assert.equal(result.analysis.overall.tp, 2);
  assert.equal(result.analysis.overall.tn, 2);
  assert.equal(result.analysis.overall.fp, 0);
  assert.equal(result.analysis.overall.fn, 0);
  assert.equal(result.analysis.band_separation_verdict, 'separates');
  assert.equal(result.analysis.per_trigger.borderline_caught_by_t1, 1);
  assert.equal(result.analysis.per_trigger.dimension_conflict_caught_by_t3, 1);
  // pre-flight ran the REAL gate per entry and passed for all
  assert.ok(result.per_entry.every((d) => d.preflight === 'passed'));
});

test('a blocked assessment is excluded from metrics but recorded in diagnostics', async () => {
  const assessor = mockN8CalibrationAssessor({
    clear_pass_1: { total_score: 83, confidence: 0.82, reviewerRiskScore: 72, otherDimScore: 84 },
    borderline_1: 'blocked',
    conflict_1: { total_score: 83, confidence: 0.9, reviewerRiskScore: 40, otherDimScore: 84 },
    clear_fail_1: { total_score: 40, confidence: 0.9 },
  });
  const result = await runN8Calibration(CORPUS, assessor, { thresholds: THRESHOLDS });
  assert.equal(result.analysis.n_records_excluded, 1);
  assert.deepEqual(result.analysis.excluded_topic_ids, ['borderline_1']);
  assert.equal(result.analysis.overall.n, 3);
  const borderlineDiag = result.per_entry.find((d) => d.corpus_entry_id === 'borderline_1');
  assert.equal(borderlineDiag?.assessor_status, 'blocked');
});

test('loadN8CalibrationCorpus rejects placeholder entries (no calibrating on placeholders)', () => {
  const raw = { entries: [{ ...entry('p1', 'clear_pass', 'advance_to_package'), __placeholder: true }] };
  assert.throws(() => loadN8CalibrationCorpus(raw), /placeholder/i);
});

test('loadN8CalibrationCorpus strips the marker and rejects duplicates / malformed input', () => {
  const loaded = loadN8CalibrationCorpus({ entries: [entry('real_1', 'borderline', 'refine_question')] });
  assert.equal(loaded.length, 1);
  assert.equal((loaded[0] as { __placeholder?: boolean }).__placeholder, undefined);
  assert.throws(() => loadN8CalibrationCorpus({}), /entries/);
  assert.throws(
    () => loadN8CalibrationCorpus({ entries: [entry('dup', 'borderline', 'refine_question'), entry('dup', 'clear_pass', 'advance_to_package')] }),
    /Duplicate/,
  );
});

test('record-and-defer invariant: a synthetic run — even a clean "separates" verdict — never flips the deployed provisional gate (T-127 W-13 / D8)', async () => {
  const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1';
  const n8Policy = () =>
    TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((p) => p.node_id === N8_NODE_ID);

  // the DEPLOYED gate is provisional BEFORE the run.
  assert.equal(n8Policy()?.debate_trigger_thresholds?.provisional, true);
  const deployed: TopicSelectionV1bN8DebateTriggerThresholds = n8Policy()!.debate_trigger_thresholds!;
  // snapshot the FULL deployed set so we catch an in-place VALUE mutation too, not just a provisional flip.
  const beforeSnapshot = JSON.parse(JSON.stringify(n8Policy()!.debate_trigger_thresholds));

  const assessor = mockN8CalibrationAssessor({
    clear_pass_1: { total_score: 83, confidence: 0.82, reviewerRiskScore: 72, otherDimScore: 84 },
    borderline_1: { total_score: 65, confidence: 0.9, reviewerRiskScore: 80, otherDimScore: 82 },
    conflict_1: { total_score: 83, confidence: 0.9, reviewerRiskScore: 40, otherDimScore: 84 },
    clear_fail_1: { total_score: 40, confidence: 0.9, reviewerRiskScore: 35, otherDimScore: 50 },
  });
  // run against the DEPLOYED provisional thresholds — exactly what the v1b:n8-calibration-dry-run script does.
  const result = await runN8Calibration(CORPUS, assessor, { thresholds: deployed });

  // a clean 'separates' on SYNTHETIC data must NOT be acted on: flipping provisional off a mock/synthetic run is
  // the circular guessing D8 forbids. The calibration path is policy-inert — it reports, it never mutates.
  assert.equal(result.analysis.band_separation_verdict, 'separates');
  assert.equal(n8Policy()?.debate_trigger_thresholds?.provisional, true);
  // neither provisional NOR any threshold value moved — the whole deployed set is byte-identical after the run.
  assert.deepEqual(n8Policy()!.debate_trigger_thresholds, beforeSnapshot);
  // the runner result exposes ONLY report data — no threshold-adopt / flip surface to wire a gate change to.
  assert.deepEqual(Object.keys(result).sort(), ['analysis', 'per_entry', 'records']);
});

test('the real placeholder corpus-template.json is rejected by the loader (guard against accidental calibration on it)', async () => {
  const fs = await import('node:fs/promises');
  const url = await import('node:url');
  const path = url.fileURLToPath(new URL(
    '../../../../dev-docs/active/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/corpus-template.json',
    import.meta.url,
  ));
  const raw = JSON.parse(await fs.readFile(path, 'utf8'));
  assert.throws(() => loadN8CalibrationCorpus(raw), /placeholder/i);
});
