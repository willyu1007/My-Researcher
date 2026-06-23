// T-127 W-13 — operator entry point for the DP-3.3 N8 debate-threshold calibration tooling.
//
// RECORD-AND-DEFER (T-127 D8). This is a DRY-RUN / readiness harness — it NEVER calibrates, NEVER adopts a
// threshold, and NEVER flips `provisional`. Real calibration is blocked on TWO human/operator inputs that
// cannot be fabricated without making the result circular (see the DP-3.3 README):
//   (3) a human-curated, ground-truth-labeled corpus, and
//   (5) running an INDEPENDENT content-grounded assessor (an external Codex agent reading the real bodies)
//       over it — the N8 production path is codex_assisted/out-of-band, so the assessor cannot run in-process.
// Until both exist AND the release bar is met (>=100 multi-provider labeled samples, false-positive rate < 5%
// — N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE), the N8 (and the mirrored N6) thresholds stay provisional
// and the tripwire keeps guarding product. NO verdict this script prints — not even 'separates' — authorizes a
// flip; that is a separate, human-gated, sign-off-recorded action.
//
// Modes:
//   --self-test                 (default) Prove the toolchain end-to-end on a SYNTHETIC 4-band corpus: write it
//                               to a temp file, load it back through loadN8CalibrationCorpus (real file path),
//                               run materialize -> real N8 gate pre-flight -> a deterministic MOCK assessor ->
//                               analyzeN8DebateThresholdCalibration against the DEPLOYED provisional thresholds,
//                               and emit the report. Synthetic data can NEVER calibrate (scores+labels are made
//                               up); this only proves the plumbing runs. The temp corpus is deleted afterward —
//                               no fabricated corpus is left in the tree (per the DP-3.3 README decision).
//   --corpus <path>             Validate a REAL corpus file's gate-readiness: load it (placeholder entries are
//                               rejected) and run the per-entry materialize + real N8 gate pre-flight, reporting
//                               which entries are gate-valid and ready for the out-of-band assessor step. It does
//                               NOT assess or compute calibration metrics (no assessor runs in-process).
//   --out <path>                Write the JSON report to a file instead of stdout.
//
// Run (no DB / env needed — fully in-memory):
//   node --loader ts-node/esm scripts/run-n8-calibration-dry-run.ts --self-test
//   node --loader ts-node/esm scripts/run-n8-calibration-dry-run.ts --corpus ./my-corpus.json
//
// See dev-docs/active/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/README.md.

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  type TopicSelectionV1bN8DebateTriggerThresholds,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionN8CalibrationCorpusEntry } from '../src/services/topic-selection-v1b-n8-calibration-materializer.js';
import {
  loadN8CalibrationCorpus,
  mockN8CalibrationAssessor,
  runN8Calibration,
  type N8CalibrationAssessor,
} from '../src/services/topic-selection-v1b-n8-calibration-runner.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;

interface ParsedArgs {
  selfTest: boolean;
  corpusPath: string | null;
  outPath: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { selfTest: false, corpusPath: null, outPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--self-test') {
      args.selfTest = true;
      continue;
    }
    if (token === '--corpus') {
      args.corpusPath = String(argv[index + 1] ?? '').trim() || null;
      index += 1;
      continue;
    }
    if (token === '--out') {
      args.outPath = String(argv[index + 1] ?? '').trim() || null;
      index += 1;
    }
  }
  // default to --self-test when no corpus is supplied so the script always does something honest.
  if (!args.corpusPath) args.selfTest = true;
  return args;
}

/** The DEPLOYED provisional thresholds the production N8 gate reads — evaluated as-is, never mutated. */
function deployedN8Thresholds(): TopicSelectionV1bN8DebateTriggerThresholds {
  const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === N8_NODE_ID);
  const thresholds = policy?.debate_trigger_thresholds;
  if (!thresholds) {
    throw new Error(`N8 node policy (${N8_NODE_ID}) has no debate_trigger_thresholds — cannot dry-run.`);
  }
  return thresholds;
}

/**
 * A synthetic 4-band corpus — NOT calibration data. Scores+labels are fabricated to exercise the chain only;
 * mirrors the shape proven in topic-selection-v1b-n8-calibration-runner.unit.test.ts. provenance.derived_from
 * is 'synthetic' so it can never be mistaken for a real labeled topic.
 */
function syntheticEntry(
  id: string,
  band: TopicSelectionN8CalibrationCorpusEntry['expected_band'],
  disposition: TopicSelectionN8CalibrationCorpusEntry['ground_truth_disposition'],
): TopicSelectionN8CalibrationCorpusEntry {
  return {
    corpus_entry_id: id,
    schema_version: 'TopicSelectionN8CalibrationCorpusEntry@v1',
    title_card_id: `title_card_${id}`,
    provenance: {
      author: 'w13-dry-run',
      created_at: '2026-06-15T00:00:00.000Z',
      source_note: 'SYNTHETIC — plumbing dry-run only, NOT calibration data',
      derived_from: 'synthetic',
    },
    topic_question: { main_question: `Synthetic Q for ${id}` },
    question_contract: { main_question: `Synthetic Q for ${id}`, claim_ceiling: 'bounded' },
    answerability_plan: { answerability_verdict: 'answerable', metrics: ['m'] },
    research_slice: { scope: 'narrow' },
    evidence: [{ evidence_role: 'support', rationale: 'r' }],
    n8_debate_admission: { debate_level: 'compact_assessment_debate', high_value_signal_codes: [], risk_signal_codes: [], rationale: 'synthetic' },
    ground_truth_disposition: disposition,
    expected_band: band,
    labeler_notes: `synthetic ${band} entry (dry-run)`,
  };
}

function syntheticCorpus(): TopicSelectionN8CalibrationCorpusEntry[] {
  return [
    syntheticEntry('clear_pass_1', 'clear_pass', 'advance_to_package'),
    syntheticEntry('borderline_1', 'borderline', 'refine_question'),
    syntheticEntry('conflict_1', 'dimension_conflict', 'refine_slice'),
    syntheticEntry('clear_fail_1', 'clear_fail', 'drop'),
  ];
}

/** Deterministic mock scores that map each band correctly — proves the analysis discriminates (verdict 'separates'). */
function syntheticAssessor(): N8CalibrationAssessor {
  return mockN8CalibrationAssessor({
    clear_pass_1: { total_score: 83, confidence: 0.82, reviewerRiskScore: 72, otherDimScore: 84 },
    borderline_1: { total_score: 65, confidence: 0.9, reviewerRiskScore: 80, otherDimScore: 82 },
    conflict_1: { total_score: 83, confidence: 0.9, reviewerRiskScore: 40, otherDimScore: 84 },
    clear_fail_1: { total_score: 40, confidence: 0.9, reviewerRiskScore: 35, otherDimScore: 50 },
  });
}

const DEFERRAL_BANNER = [
  'DRY RUN — adopts NO thresholds, flips NOTHING. The N8 (and mirrored N6) debate thresholds remain',
  "provisional:true regardless of the verdict above. Real calibration is blocked on a human-curated labeled",
  'corpus + an independent content-grounded assessor (T-127 D8 record-and-defer); a flip additionally requires',
  'the release bar (>=100 multi-provider labeled samples, FP<5%) and a recorded stakeholder sign-off.',
].join('\n');

async function runSelfTest(thresholds: TopicSelectionV1bN8DebateTriggerThresholds): Promise<unknown> {
  // Round-trip through a REAL temp file to exercise the operator's file->report path, then delete it
  // (no fabricated corpus left in the tree — per the DP-3.3 README "removed; no fabricated corpus" decision).
  const dir = await mkdtemp(join(tmpdir(), 'n8-calibration-dry-run-'));
  const corpusFile = join(dir, 'synthetic-corpus.json');
  try {
    await writeFile(corpusFile, JSON.stringify({ entries: syntheticCorpus() }, null, 2), 'utf8');
    const raw = JSON.parse(await readFile(corpusFile, 'utf8'));
    const corpus = loadN8CalibrationCorpus(raw);
    const result = await runN8Calibration(corpus, syntheticAssessor(), { thresholds });
    return {
      mode: 'self-test',
      corpus_is: 'SYNTHETIC — NOT calibration data',
      thresholds_evaluated: thresholds,
      n_entries: corpus.length,
      per_entry: result.per_entry,
      analysis: result.analysis,
      provisional_after_run: deployedN8Thresholds().provisional,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runCorpusReadiness(
  corpusPath: string,
  thresholds: TopicSelectionV1bN8DebateTriggerThresholds,
): Promise<unknown> {
  const raw = JSON.parse(await readFile(corpusPath, 'utf8'));
  const corpus = loadN8CalibrationCorpus(raw); // throws on placeholder / duplicate / malformed
  // No assessor runs in-process (the content-grounded assessor is operator-supplied, out-of-band). Use a
  // pseudo-assessor that records 'error' for every entry so NO metrics are computed — we only surface the
  // per-entry gate pre-flight readiness. This validates the corpus is well-formed before the operator spends
  // assessor budget on it.
  const noAssessor: N8CalibrationAssessor = async () => ({ status: 'error', blocker_codes: ['ASSESSOR_NOT_RUN_IN_DRY_RUN'] });
  const result = await runN8Calibration(corpus, noAssessor, { thresholds });
  return {
    mode: 'corpus-readiness',
    corpus_path: corpusPath,
    thresholds_evaluated: thresholds,
    n_entries: corpus.length,
    n_gate_preflight_passed: result.per_entry.filter((d) => d.preflight === 'passed').length,
    per_entry: result.per_entry,
    note: 'No assessment was run — the content-grounded assessor is operator-supplied and out-of-band. '
      + 'This only validates corpus shape + N8 gate readiness; it computes no calibration metrics.',
    provisional_after_run: deployedN8Thresholds().provisional,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const thresholds = deployedN8Thresholds();

  const report = args.corpusPath
    ? await runCorpusReadiness(args.corpusPath, thresholds)
    : await runSelfTest(thresholds);

  const serialized = JSON.stringify(report, null, 2);
  if (args.outPath) {
    await writeFile(args.outPath, `${serialized}\n`, 'utf8');
    console.error(`Report written to ${args.outPath}`);
  } else {
    console.log(serialized);
  }
  console.error(`\n${DEFERRAL_BANNER}`);

  // Safety backstop: the dry-run must NEVER leave the deployed gate non-provisional. If this ever fails, the
  // calibration path mutated node policy — a record-and-defer violation — so fail loudly.
  if (deployedN8Thresholds().provisional !== true) {
    console.error('FATAL: deployed N8 thresholds are no longer provisional after a dry-run — aborting.');
    process.exitCode = 3;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
