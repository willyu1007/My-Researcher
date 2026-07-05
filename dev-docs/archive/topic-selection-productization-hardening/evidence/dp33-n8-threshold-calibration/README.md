# DP-3.3 — N8 debate-threshold calibration: investigation, blocker, corpus + analysis spec

> Status (2026-06-15): **NOT calibrated yet — STEP-1 DECIDED (option A), full A code path BUILT, blocked only on
> two human inputs.** Thresholds stay `provisional: true`; the `n8_debate_thresholds_provisional` product tripwire
> continues to guard product. The complete option-A pipeline is built + unit-tested (analysis harness, materialize
> utility, **runner**, corpus template — see "Scaffold (built)" + "STEP-1 decision" below). Remaining: a human-curated
> labeled corpus and running an independent content-grounded assessor over it — neither can be fabricated without
> making the calibration circular. This doc is the detailed home for the investigation; `03-implementation-notes.md`
> §DP-3.3 + `07-phase3-debate-skeleton-spec.md` carry pointers to it.
>
> _(History: the investigation below was first delivered document-only; then the scaffold was built under the
> "A + full scaffold" decision; then STEP-1 was decided **A** and the runner completed the pipeline. The scaffold is
> calibration TOOLING — not wired into any product route, does not change thresholds, cannot run end-to-end until a
> labeled corpus + an assessor run exist.)_

## TL;DR

Calibrating the N8 value-debate T1/T3 thresholds needs a distribution of **real, content-grounded** N8
value-assessment scores over a **labeled** spread of topics. That data does not exist, and — more importantly —
the investigation found it **cannot be produced by the path the earlier plan assumed** (a `provider_llm` sweep).
Two blockers, in priority order:

1. **Content-visibility / execution-mode blocker (the real unblock — confirmed a *gap* per joint decision).**
   The N8 model prompt is built from **refs + content-hashes + the decision-memory packet only** — the
   value-bearing bodies (`main_question`, `claim_ceiling`, answerability datasets/metrics, slice text, evidence)
   are **never inlined**. Production N8 draft generation runs **`codex_assisted` (or `mocked_llm`), never
   `provider_llm`**; content-grounding is therefore *delegated to the external Codex agent's out-of-band file
   access*, not the prompt. A raw `provider_llm` API has no such access → it is content-blind. So the original
   "provider_llm sweep across gpt-5.5 / qwen3.6-plus / deepseek-v4-pro" plan is invalid on two counts
   (content-blind **and** not N8's production execution path), and no content-grounded N8 assessment has ever
   actually been run (every observed N8 output is a hand-authored fixture or a score-pinned variance probe).

2. **No labeled corpus.** Even with the execution path fixed, calibration needs a human-curated, labeled corpus
   of distinct topics spanning the value spectrum. None exists; fabricating labels is the circular guessing DP-3.3 forbids.

Credentials (`OPENAI_API_KEY` / `DASHSCOPE_API_KEY` / `DEEPSEEK_API_KEY`) are present — they are **not** the
constraint. The constraints are the content-visibility design decision and the labeled corpus.

## Verified findings (code-grounded)

| # | Finding | Evidence (file:line) |
|---|---------|----------------------|
| F1 | The N8 model prompt = `system instruction + stableStringify(context_packet)`, and the context packet embeds only `frozen_input_payload` (refs+hashes), `n7_to_n8_projection` (refs+hashes+`preserved_fact_kinds` names), and the resolved `decision_memory` packet. **No artifact bodies are inlined.** | `topic-selection-v1b-n8-value-assessment-runtime-service.ts:476-547` (buildContextPacket + messages); `topic-selection-v1b-workflow-harness-contracts.ts:1278-1297` (N7ToN8HandoffPayload = pure refs/hashes), `:1356-1380` (projection = refs/hashes + `preserved_fact_kinds`, no body field) |
| F2 | The only resolved free-text the model reads inline is the **decision-memory packet** (clipped historical main_questions + negative-decision rationale), and only when title-card history exists. It drives `negative_memory_check` + reviewer-risk; the other 8 dimensions have no inlined content signal. | runtime-service `:210` (resolveDecisionMemoryPacket), `:515` (inlined), `:532-534` (system-prompt clause) |
| F3 | Production N8 draft generation is typed **`codex_assisted` / `mocked_llm` only** — `provider_llm` is excluded at the type level. `codex_assisted` requires an **operator-supplied** `codex_response.output` (no LLM call in-service); the draft is produced by an *external* Codex CLI agent run separately. | runtime-service `:136` (`execution_mode` is `Extract<…, 'codex_assisted' \| 'mocked_llm'>`); orchestrator `:473-534` (`codex_response is required`, `response_source: 'operator_supplied'`) |
| F4 | `provider_llm` N8 exists **only in the transport canary** (`runV1bN8PromptCacheLiveRequiredCanary` → orchestrator with a synthetic *echo* input), which **discards** the scores. It is a prompt-cache/transport probe, not a production or content-grounded path. | provider-canary-service `:338-361`, `:933-1005` (synthetic echo request), `:1234-1274` (liveRequiredEvidence never reads `structured_output`) |
| F5 | The external-Codex N8 runs that *do* exist (`external-codex-n8-variance`) are **score-pinned variance probes**: the prompt says *"Do not inspect files, do not run shell commands"* and hands a template with `total_score must stay 83`, varying only prose. So even the codex path has never produced a real content-grounded assessment. | `.ai/.tmp/topic-selection-v1b-harness-e2e/t112-v1b-deep-review-external-codex-n8-20260601/external-codex-n8-variance/sample-1/prompt.md:1-20` |
| F6 | **deepseek is not a registered N8 single-agent model option** — only `…openai-balanced` + `…dashscope-thinking-budget` exist on the profile; deepseek is gated to debate-worker profiles. A 3-provider sweep would throw `INVALID_PAYLOAD` at `selectModelOption`. (Moot given F3, but corrects the earlier plan.) | model-profile-registry `:197-311` (provider options), `:179-182` (DEBATE_WORKER_DEEPSEEK_ELIGIBLE_PROFILE_IDS), `:1368-1385` (selectModelOption throws) |

**Sibling-node context (why F1 is a "gap", not an isolated quirk):** N4/N6 model-draft nodes use the same
refs+hashes `frozen_input_payload` design (the harness's replay-determinism philosophy). N4 carries *some*
inline text (`selection_rationale`, `decision_basis`, `rejected_option_reasons`); N6 carries loopback hints;
**N8 carries zero inline content** — it is the extreme case. Across all three, the upstream artifact *bodies*
are never inlined. The fix pattern already exists in-tree: `decision_memory` is the one ref that is
*resolved-and-inlined* into the packet (runtime-service `:210→515`). Enriching N8 to inline the value-bearing
bodies would extend that same precedent.

## The design decision this surfaces (joint-decision territory)

Per the 2026-06-15 scope decision, the content-visibility property is treated as a **gap to fix**, not by-design.
Resolving it is the true prerequisite for DP-3.3 and is **D3-sensitive**: inlining bodies into the N8 context
packet changes `prompt_packet_hash` → changes replay/admission identity → requires a **joint decision with T-088**
and the replay-identity guard. Two coherent resolutions (a design choice for the team):

- **(A) Keep N8 codex_assisted; calibrate via the codex path.** Production N8 stays an external-Codex draft;
  the codex agent is given **file access** (NOT score-pinned) so it resolves the refs and reads real artifacts.
  Calibration = run that path over a labeled corpus. No harness contract change; the "enrichment" is operational
  (the codex run must actually read the artifacts). Risk: codex drafts are operator-supplied and harder to run at scale.
- **(B) Enrich the N8 context packet to inline value-bearing bodies.** Resolve `topic_question_contract` /
  `answerability_plan` / `selected_research_slice` / evidence refs into a redacted/clipped content sub-packet
  (mirroring `decision_memory`), so **any** executor — codex *or* `provider_llm` — sees content. This makes a
  raw-API `provider_llm` N8 viable (and cheaper/scalable for calibration). Cost: a byte-bearing harness-runtime
  change (D3 joint decision + replay-identity guard + would also need the N8 runtime to implement `provider_llm`,
  which it currently does not — F3).

Until (A) or (B) is decided and implemented, there is **no valid path to a representative N8 score distribution**,
so the thresholds stay provisional and the tripwire stays.

## Corpus-entry schema (for when a calibration run becomes possible)

The smallest thing that is both runnable through N8 and human-labelable. Split into (A) human-authored substance,
(B) machine-derivable lineage envelope the (future) scaffold materializes into control-plane artifacts, (C) labels.

```
TopicSelectionN8CalibrationCorpusEntry@v1 = {
  corpus_entry_id: string
  schema_version: 'TopicSelectionN8CalibrationCorpusEntry@v1'
  title_card_id: string                  // synthetic but stable
  provenance: { author, created_at, source_note, derived_from?: string /* real run id | 'synthetic' */ }

  // (A) MATERIALIZED N8 INPUT BODIES — the labelable substance the executor must be able to read
  topic_question:      { main_question, sub_questions[], question_type, contribution_hypothesis }
  question_contract:   { main_question, question_type, contribution_hypothesis, target_setting, target_community,
                         expected_claim, fallback_claim, max_claim_strength, evaluation_route, claim_ceiling,
                         prohibited_claims[], required_evidence_categories[], allowed_refinements[],
                         stop_reopen_conditions[], risk_notes[] }
  answerability_plan:  { answerability_verdict, datasets_or_resources[], metrics[], baselines[],
                         ablations_or_comparisons[], evaluation_setting, dependency_risks[],
                         open_dependencies[], known_gaps[] }
  research_slice_snapshot: Record<string,unknown>   // scope/boundaries the question inherits
  evidence_refs:       Array<{ evidence_role, mapped_question_part, rationale, source_locator_snapshot }>
  n8_debate_admission: { debate_level: 'compact_assessment_debate'|'provider_diverse_deep_debate',
                         high_value_signal_codes[], risk_signal_codes[], rationale }
  decision_memory_seed?: Array<{ decision_kind, summary, rationale, normalized_text_key }>  // negative-memory coverage

  // (B) LINEAGE-ONLY STUBS — scaffold fills; minimal valid placeholders OK (checksum-match only)
  lineage_stubs: { trial_ledger: {...}, topic_question_candidate_set: {...}, candidate_grouping?: {...}|null }

  // (C) GROUND TRUTH
  ground_truth_disposition: 'advance_to_package'|'refine_question'|'refine_slice'|'recheck_evidence_or_search'|'park'|'drop'
  expected_band: 'clear_pass' | 'borderline' | 'clear_fail' | 'dimension_conflict'
  expected_dimension_hints?: Partial<Record<ValueDimension,'low'|'mid'|'high'>>  // for dimension_conflict cases
  labeler_notes: string
}
```

**Materialize step (future scaffold):** record each (A)/(B) body as a control-plane artifact, compute checksums,
assemble the `N7ToN8HandoffPayload` (9 ref/hash pairs), build the **one** required
`v1b_n7_to_n8_topic_question_contract_context` projection (matching hashes + `preserved_fact_kinds` incl.
`topic_question_contract`/`answerability_plan`/`trial_ledger`/`risk_gap_recheck_hints` + an exact-key
`source_hashes` set incl. `n6_handoff_hash`/`frozen_input_hash`), wrap into a
`TopicSelectionV1bWorkflowHarnessRunRequest@v1` for node `topic-selection.v1b.assess-topic-value.v1`. N8 enforces
these lineage gates *before* any model call (`assertN7ToN8ProjectionPolicy` runtime-service `:949-1038`;
`assertRequiredStructureManifest` `:810-840`), so the materialize step must be a **tested utility** or every
entry fails `INVALID_PAYLOAD`. **Label/disposition bucketing must be pinned**: 6 dispositions → bands
(advance→clear_pass; refine_*/recheck→borderline-or-clear_fail by labeler; park/drop→clear_fail), and
`expected_band` must be validated against `ground_truth_disposition` or precision/recall is computed against a corrupt gold set.

## Analysis-algorithm spec (pure, executor-agnostic, fully self-testable)

Reuses the **already-exported** trigger function — no re-implementation of the T1/T3 boolean algebra:

```
analyzeN8DebateThresholdCalibration(records: N8CalibrationRecord[],
                                    thresholds: TopicSelectionV1bN8DebateTriggerThresholds,
                                    verdictGates = { precision_min: 0.85, recall_min: 0.90 })
  : N8CalibrationAnalysis

N8CalibrationRecord = {
  topic_id; executor: 'codex_assisted'|'provider_llm'|'mocked'; provider?: string;   // record how the score was produced
  status: 'succeeded'|'blocked'|'error'; blocker_codes?: string[];                    // EXCLUDE non-succeeded from metrics
  total_score; confidence; dimension_scores: {dimension_key; score}[];                // the captured draft
  ground_truth_label: 'clear_pass'|'clear_fail'|'borderline'|'dimension_conflict'; expected_band
}

per record (succeeded only):
  codes          = computeTopicSelectionV1bN8DebateTriggers({total_score,confidence,dimension_scores}, thresholds).map(i=>i.code)
  predicted      = codes.length > 0
  predicted_t1   = codes.includes('N8_VALUE_BORDERLINE_DEBATE_TRIGGER')
  predicted_t3   = codes.includes('N8_DIMENSION_CONFLICT_DEBATE_TRIGGER')
  should_debate  = expected_band ∈ {borderline, dimension_conflict}

confusion (positive = should_debate): TP/FP/FN/TN
metrics: precision=TP/(TP+FP), recall=TP/(TP+FN), f1, accuracy   (pin the 0/0 convention in the self-test)
band attribution: t1_coverage_on_borderline, t3_coverage_on_conflict, cross_misfire_count (borderline caught only by T3, or conflict only by T1)
per-executor / per-provider: same metrics + mean_total_score / mean_confidence / mean_spread (surfaces score-scale skew)
verdict: 'separates' iff recall≥recall_min ∧ precision≥precision_min ∧ cross_misfire==0; else 'leaky'|'insufficient'
recommendation: keep-provisional | tighten t1_confidence_min | widen/narrow t1 band | adjust t3 floor — with the offending FP/FN topic_ids
```

**Critical:** the analysis MUST also evaluate the *exact provisional set* (the deployed gate reads
`getNodePolicy('…assess-topic-value.v1').debate_trigger_thresholds`, harness-service `:5336`), not only swept
candidates, so the conclusion maps to what production runs. Exclude `status!='succeeded'` records (null drafts);
do not coerce them to `total_score=0`. Per-provider F1 variance must be reported, not collapsed to a global number
— a global "separates" can hide a provider where it "leaks".

## Scaffold (built 2026-06-15, option A — calibration tooling, not wired into product)

The "A + full scaffold" decision built the three pieces below. They are pure/test-only TOOLING: they import the
deployed trigger function and the real N8 runtime but are **not referenced by any product route, do not change the
node policy, and never set thresholds**. They cannot run end-to-end until a labeled corpus + the STEP-1 decision exist.

- **Analysis harness** — `apps/backend/src/services/topic-selection-v1b-n8-calibration-analysis.ts`
  (`analyzeN8DebateThresholdCalibration`). Pure: reuses the production `computeTopicSelectionV1bN8DebateTriggers`,
  emits confusion matrix / precision / recall / f1 / per-executor + per-provider breakdown / T1-T3 band attribution
  (cross-misfire) / `separates|leaky|insufficient_data` verdict + a recommendation. Excludes `status!='succeeded'`
  records (never coerces a blocked draft to `0`); 0/0 metrics return `null`, never a misleading `1.0`. Test:
  `…-calibration-analysis.unit.test.ts` (8/8) — clean separation, missed-borderline → leaky, needless-debate →
  precision drop, cross-misfire, exclusion, insufficient-data, per-provider skew, exact-threshold sensitivity.
- **Materialize utility** — `apps/backend/src/services/topic-selection-v1b-n8-calibration-materializer.ts`
  (`materializeN8CalibrationRunRequest` + `verifyN8CalibrationRunRequest` + `buildN8CalibrationMockDraft`). Turns a
  corpus entry into a gate-passing N8 RunRequest by hand-constructing against an in-memory control plane (records the
  bodies + the N7→N8 projection; derives the frozen payload off the projection so the 9 ref/hash pairs are byte-equal).
  It **mirrors** the SSOT projection builder (`buildN7ToN8TopicQuestionContractContextProjection`,
  harness-service.ts:8236) rather than importing it — the harness is D3-sensitive, so we do not touch it; the verify
  helper invokes the REAL `generateDraftArtifact` (mocked executor, no provider call) and is the **drift guardrail**:
  if a harness change makes our construction stop passing the gates, the test fails. Test:
  `…-calibration-materializer.unit.test.ts` (5/5) — valid entry passes the real lineage gates + capture reads the
  draft scores; 3 negatives (tampered lineage hash / wrong node_id / dropped projection) rejected with `INVALID_PAYLOAD`.
- **Corpus template** — `corpus-template.json` (this dir). Two clearly-marked `__placeholder: true` entries
  (`clear_pass`, `borderline`) showing the `TopicSelectionN8CalibrationCorpusEntry@v1` shape. Replace with
  human-curated, ground-truth-labeled real topics before any run.
- **Option-A runner** — `apps/backend/src/services/topic-selection-v1b-n8-calibration-runner.ts`
  (`runN8Calibration` + `loadN8CalibrationCorpus` + `mockN8CalibrationAssessor`). The push-button glue: corpus →
  per-entry materialize + mocked gate pre-flight → **pluggable assessor** → captured draft → analysis record →
  `analyzeN8DebateThresholdCalibration`. The assessor is the only human/operator-supplied piece: for a real option-A
  run it reads the entry bodies (the content the corpus carries) and returns a draft — that is the content-grounded,
  NOT-score-pinned act option A requires, and it MUST be independent of the labeler (single-rater label+assess is
  circular). `loadN8CalibrationCorpus` **refuses placeholder entries** so no run can calibrate on the template. Test:
  `…-calibration-runner.unit.test.ts` (5/5) — full corpus → separating verdict + correct band wiring, blocked
  assessment excluded, placeholder rejection (incl. the real `corpus-template.json`), duplicate/malformed rejection.

Verified: backend `tsc` 0; the 4 N8 suites (analysis 8 + materializer 5 + runner 5 + existing trigger 8) = 26/26 green.

## STEP-1 decision: **A — LOCKED (2026-06-15)**

Option **A** (keep N8 `codex_assisted`; calibrate via a content-grounded, not-score-pinned assessor reading the real
bodies; **no harness contract change, no D3 joint decision required**) is the chosen direction. **B is not pursued**
(it would move N8 to a content-inlined packet + raw `provider_llm` — a byte-bearing harness change requiring a T-088
joint decision; revisit only if the team later decides raw-API should become N8's production executor). Everything
the A path needs in code is now built; what remains is human-gated.

## What is needed to actually calibrate (checklist)

1. ✅ **STEP-1 design decision** — **DECIDED: A** (2026-06-15). No harness change; B shelved.
2. ~~If (B): N8 packet enrichment + provider_llm support~~ — **N/A** (A chosen).
3. **Human-curated labeled corpus** of N distinct topics per band, non-anecdotal sample size, each a
   `TopicSelectionN8CalibrationCorpusEntry@v1` (template provided). _(open — human curation; cannot be fabricated)_
4. ✅ **Tested materialize utility** (corpus entry → gate-passing N8 RunRequest, mock-verified) — **BUILT**.
5. ✅ **Option-A runner** (`runN8Calibration`) — **BUILT**. Supply a content-grounded assessor (external Codex
   reading the entry bodies, independent of the labeler) and run it over the corpus. _(open — needs 3 + an assessor run)_
6. ✅ **Analysis harness** — **BUILT**. The runner already invokes it; evaluate the provisional set + candidate sets,
   then set T1/T3 **or** confirm provisional empirically and flip `provisional → false` (drop the tripwire). Record the
   distribution + precision/recall in `03-implementation-notes.md` DP-3.3, `07-phase3-debate-skeleton-spec.md`, `04-verification.md`. _(open — needs 5)_

**Net: the entire A code path is built + tested. Calibration is now blocked on exactly TWO human/operator inputs —
a labeled corpus (3) and running an independent content-grounded assessor over it (5). No thresholds guessed.**

## Mock-corpus testing (pipeline validated) vs calibration (still blocked) — the load-bearing boundary

**A mock corpus tests the PIPELINE; it can NEVER calibrate the thresholds.** In a mock corpus both the scores AND
the labels are fabricated, so any verdict only says "given these made-up numbers, the thresholds would do X" — it
says nothing about the real N8 score distribution, which is the unknown calibration exists to measure. Flipping
`provisional → false` off a mock run would be the circular guessing DP-3.3 forbids. The two real inputs (a
human-labeled corpus + scores from an independent content-grounded assessor) cannot be mocked away.

- **Validated 2026-06-15:** the pipeline was demonstrated end-to-end on a 10-entry mock corpus (3 clear_pass /
  3 borderline / 2 dimension_conflict / 2 clear_fail) with one deliberately-missed borderline and one needless-trigger
  clear_fail. It returned **`leaky`** (not a trivial `separates`): TP 4 / FP 1 / FN 1 / TN 4, precision/recall 0.80,
  correctly flagged the FP (`clear_fail_b_LEAK`) + FN (`borderline_c_LEAK`), and emitted an actionable tuning
  recommendation — confirming the analysis discriminates a good threshold set from a leaky one. The demo was a
  throwaway (removed; no fabricated corpus left in the tree); the committed mock-corpus proof is
  `topic-selection-v1b-n8-calibration-runner.unit.test.ts` (which also asserts the loader REJECTS the placeholder
  `corpus-template.json`, so no run can accidentally calibrate on mock/placeholder data).

## W-13 (T-127) — record-and-defer registered (2026-06-24)

T-127 W-13 (Phase 5, the deferred tail — does **not** block the already-signed-off core segment Phase 0–4) registered
this calibration as **record-and-defer** per locked decision **D8**. It added operational glue + a machine-enforced
deferral guard around the W-01 scaffold above; it did **not** calibrate, fabricate a corpus, or flip `provisional`.

- **Operator entry point (report-only):** `apps/backend/scripts/run-n8-calibration-dry-run.ts`, npm
  `v1b:n8-calibration-dry-run` (pure in-memory, no DB/env). `--self-test` (default) writes a SYNTHETIC 4-band corpus to a
  real temp file, loads it back through `loadN8CalibrationCorpus`, runs materialize → real N8 gate pre-flight → a mock
  assessor → `analyzeN8DebateThresholdCalibration` against the **deployed** provisional thresholds, emits the report, then
  deletes the temp file (no fabricated corpus left in the tree — honouring the decision above). `--corpus <path>` validates
  a real corpus file's gate-readiness only (no assessor runs in-process; the content-grounded assessor is operator-supplied
  and out-of-band). The script reads the deployed thresholds, **never mutates node policy / flips `provisional` / adopts a
  threshold**, prints a banner that no verdict (not even `separates`) authorises a flip, and fails loudly if the deployed
  gate is somehow non-provisional after a run.
- **Deferral invariant guard (new test):** `…-calibration-runner.unit.test.ts` now pins that a synthetic run — even one
  whose verdict is `separates` — leaves the deployed `debate_trigger_thresholds.provisional === true` and that the runner
  result exposes no adopt/flip surface. This complements the placeholder-rejection guard and the W-06 (N8) / W-07 (N6)
  flip tripwires.
- **Both gates held:** `N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE` and the mirrored
  `N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE` share `released_by: 'W-13 calibration'` and stay held.

### Single-source flip checklist (when a real corpus + assessor finally exist)

A flip is a separate, human-gated action. ALL must hold before `provisional → false`:

1. **Human-curated labeled corpus** — ≥100 multi-provider labeled samples spanning the 4 bands (non-anecdotal), each a
   `TopicSelectionN8CalibrationCorpusEntry@v1`, every `__placeholder` replaced. (Note the **F6 tension** recorded in the
   Verified-findings table above: the N8 single-agent profile's provider diversity is bounded — deepseek is debate-worker-only,
   so "multi-provider" resolves to the two distinct providers F6 names (openai / dashscope), not three. Either register an
   additional N8 provider option or re-interpret "multi-provider" against what the N8 profile actually exposes — do **not**
   silently assume three providers. Re-confirm F6 against the live `model-profile-registry` before a real run.)
2. **Independent content-grounded assessor run** — an external Codex agent that reads the real bodies (NOT score-pinned,
   independent of the labeler), captured into calibration records.
3. **Analysis meets the bar** — `analyzeN8DebateThresholdCalibration` on the **deployed provisional set** AND candidate sets
   shows false-positive rate < 5% with no per-executor/per-provider leak (a global `separates` must not hide a provider leak).
4. **Recorded stakeholder sign-off** — the record contract is now defined (T-128 W-16):
   `TopicSelectionStakeholderSignOff@v1` (`topic-selection-v1b-workflow-harness-contracts.ts`, scope
   `calibration_gate_release`). The schema encodes THIS checklist's bar structurally (>=100 labeled samples,
   >=2 distinct providers, false-positive rate strictly < 0.05, per-provider leak check, independent assessor
   + corpus/report refs) — an under-bar sign-off cannot validate. Record it via the control-plane artifact
   channel; the flip itself stays this checklist's separate human-gated edit (no auto-flip path exists, D8).
5. **The edits, together:** set `provisional: false` on the N8 (and, if calibrated, N6) `debate_trigger_thresholds`, set the
   final T1/T3 values, remove the `n8_debate_thresholds_provisional` (and N6 mirror) tripwire warning, and **update the W-06/W-07
   flip-tripwire guard tests** accordingly — then record the distribution + precision/recall here, in
   `03-implementation-notes.md` §DP-3.3, and in `04-verification.md`.

**Caveat — materializer mirror drift:** `materializeN8CalibrationRunRequest` MIRRORS (does not import) the SSOT projection
builder `buildN7ToN8TopicQuestionContractContextProjection` (private method in
`apps/backend/src/services/topic-selection-v1b-workflow-harness-service.ts` — grep the symbol; line numbers drift).
`verifyN8CalibrationRunRequest` is the only guardrail; if the real harness projection shape drifts, re-verify the
materializer before trusting a calibration run.
