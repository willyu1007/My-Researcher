# Topic Selection N8 Calibration

## Purpose

The N8 calibration tools evaluate whether the deployed provisional debate-routing thresholds separate four operator-labeled bands: clear pass, borderline, dimension conflict, and clear fail. They are advisory tuning tools, not a release gate and not an authority for changing production thresholds.

## Safety contract

- A synthetic corpus may prove the plumbing only. It must never authorize threshold adoption.
- A real calibration run requires a human-curated, ground-truth-labeled corpus and an independent content-grounded assessor.
- The runner records results and defers any threshold change. It never mutates the deployed policy or flips `provisional`.
- Placeholder corpus entries are rejected.
- Threshold adoption, if ever chosen, is a separate human-reviewed change with its own evidence.

## Maintained entry points

- Runner: `apps/backend/scripts/run-n8-calibration-dry-run.ts`
- Runtime and analysis: `apps/backend/src/services/topic-selection-v1b-n8-calibration-*.ts`
- Placeholder-shape fixture: `apps/backend/src/services/test-fixtures/topic-selection-v1b-n8-calibration-corpus-template.fixture.json`

Run from `apps/backend`:

```bash
pnpm v1b:n8-calibration-dry-run -- --self-test
pnpm v1b:n8-calibration-dry-run -- --corpus <human-curated-corpus.json>
```

The corpus path is operator-supplied. Calibration artifacts belong under the repository-level ignored `artifacts/` directory or another explicit operator path, never inside task documentation.

## Historical provenance

The original decision and evidence were produced by T-123 and T-127. Those task records remain historical provenance; this document owns the maintained operational contract.
