# 04 Verification

## Planning and registration
- [x] T-137 has a complete task bundle.
- [x] T-137 maps to `M-001 > F-001 > R-009 + R-012 + R-013`.
- [x] The simplified roadmap uses three stages, one real-PAI authorization, semantic handoffs, key lineage, and resume-first recovery.
- [x] Final governance sync/lint and scoped diff checks pass after simplification.

## Prepare checks
- [x] Resume task context:
  - `node .ai/scripts/ctl-project-governance.mjs resume --task T-137 --json`
- [x] Read-only source and existing-path discovery:
  - Result: selected `LIT-0328` plus `LIT-0190`/`LIT-0252`/`LIT-0765` and the existing SciFact `top-k 10` versus `top-k 5` comparison.
  - Result: no paid/provider call, capability change, or product/database mutation occurred. Prisma consumed existing local connection config without displaying or copying secret values.
- [x] Parameter ownership review:
  - Result: task-visible inputs are the semantic intent/source choice and the later compact `ExecutionPolicy`; technical ids/hashes and scientific values remain server-owned.
- [x] Existing-path composition review:
  - Result: product services cover the chain, but fixture/P313/T132/T136-specific runners cannot carry the new semantics directly; a fixed-sequence task-local coordinator is justified.
- [x] Historical-authority isolation:
  - Result: existing P313 and T-136 records are excluded as lineage inputs; Run must create fresh T-137 authority.

## Run checks
- [x] Fixed semantic profile and source lane:
  - Result: persisted Topic summary contains exactly four sources with support/baseline/challenge/context roles and V1B semantic mode `t137_scifact_retrieval_depth`.
- [x] Fresh Topic → PaperProject:
  - Result: TitleCard `title_card_ace91629-d086-4c6d-82f3-679ac86d03c1`, TopicPackage `topic_package_71af732b-51b6-42c0-9ac1-e96241e1694e`, PaperProject `P429`.
- [x] Fresh PI → EF preflight:
  - Result: new ImplementationProject, admitted motive/evidence board/validation cycle, WorkOrder revision, two task specs, and EF Run `ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c`.
- [x] Pre-PAI boundary:
  - Result: provider payloads `0`, execution attempts `0`, experiment results `0`, scientific validation reports `0`, evidence candidates `0` for the new Run.
- [x] Resume check:
  - Result: second `pnpm t137:pre-pai` invocation reused both passed stage summaries and returned the same anchors without stage mutation.
- Ordinary configured LLM calls:
  - Expected: use existing model profiles/budgets with no new authorization.
- [x] Real PAI execution policy and offline entry:
  - Result: `pnpm t137:pai --mode offline-preflight` passed with a 2-Job ceiling, CNY 50 ceiling, execute-time STS expiry, and an at-most-48-minute window ending at least 6 minutes before expiry.
  - Result: before execution, owner counts were zero and no temporary Alibaba credential was present.
- [x] Real PAI execution:
  - Result: one authorized 3,600-second controller STS session made exactly 2 `CreateJob` calls and produced 2 successful Attempts, 2 server-owned Results, 1 passed validation report, 1 EvidenceCandidate, and 1 trusted REU.
  - Result: relay reached idle with zero failures, built-in replay added zero rows, the execution window ended before credential expiry, and the CNY 50 / 2-Job ceiling was not exceeded.
- [x] Resume and terminal checks:
  - Result: completed provider work and accepted authority are not repeated.
  - Result: PAI preflight reports `scientific_evidence_consumed_by_closed_cycle`; PAI execute rejects the closed Cycle before credential access.
- [x] Hard-boundary checks:
  - server-owned scientific Results only
  - idempotent paid Job creation
  - current project/version/head ownership
  - valid WorkOrder/Run/Result/Closure/Dossier authority
  - enforced claim ceiling and credential/cost bounds

## Accept checks
- [x] Offline continuation entry:
  - Result: `pnpm t137:accept --mode offline-preflight` passed, resolved the configured OpenAI `gpt-5.6-sol` ResultAnalysis option, and reported `waiting_for_real_scientific_evidence` without writes or external calls.
- [x] Credential-free acceptance:
  - Result: configured ResultAnalysis produced admitted artifacts, then Closure/Packet/Claim/Dossier completed with zero Alibaba calls and zero pending scoped outboxes.
  - Result: Claim is `supported / moderate`; Dossier is `ready_for_writing / complete`.
- [x] Semantic coherence:
  - Literature supports the bounded retrieval-depth intent.
  - ExperimentQuestion tests exactly `top-k 10` versus `top-k 5` with fixed non-top-k inputs.
  - EvidenceSummary uses the server-owned `+61,947 ppm` registered difference.
  - Claim wording remains inside the fixed SciFact exact-token claim ceiling.
- [x] Terminal replay:
  - Result: acceptance execute replay passed with `OPENAI_API_KEY=` and retained exactly 1 Closure, 1 Packet, 1 Claim, and 1 Dossier.
- [x] Scoped effects and cleanup:
  - paid Job calls: `2`
  - persistent capability changes: `0`
  - undelivered scoped outboxes: `0`
  - local and Cloud Shell credential files: overwritten and removed
  - secrets in repository evidence: `0`

## LineageSummary
- Literature intent: `LIT-0328` support, `LIT-0190` baseline, `LIT-0252` challenge, and `LIT-0765` measurement guardrail support one bounded SciFact retrieval-depth question.
- Topic/PaperProject: TitleCard `title_card_ace91629-d086-4c6d-82f3-679ac86d03c1` → TopicPackage `topic_package_71af732b-51b6-42c0-9ac1-e96241e1694e` → PaperProject `P429`.
- PI/EF: ImplementationProject `implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b` → WorkOrder revision `pi_experiment_revision_v2_180802cd-d195-444f-a3e5-ab7c869c1f39` → Run `ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c`.
- Scientific evidence: 2 successful real-provider Attempts → 2 server-owned Results → passed report `ef_scientific_validation_report_v2_737194740626aa61d91a7d87d88107e87a201ea95102cb5ab8b97fa17681364c` → EvidenceCandidate `ef_evidence_candidate_v2_cacb22d37169c2c1dce42bf68805ed43cb057bfbc5b21af97f8b7036934a0a55` → REU `pi_run_evidence_unit_v2_907354745636009e698b20a3bb6e496d6af69586694a9631a899b4fe26b324cc`.
- Interpretation: the registered difference is `+61,947 ppm`, above the `+10,000 ppm` support threshold; this supports only the fixed SciFact exact-token comparison.
- Paper closure: Packet `result_interpretation_packet_t137_t137_pre_pai_20260817_v2` → supported moderate Claim `claim_candidate_t137_t137_pre_pai_20260817_v2` → trace-complete Dossier `implementation_dossier_t137_t137_pre_pai_20260817_v2`, hash `sha256:308c3975673d637dd866fbb5f3f673f9ea422c2aa0f931f1df5951c36fa2c1f6`.
- Effects: exactly 2 paid Job submissions, zero replay writes, zero pending scoped outboxes, default capability state, and no retained credential material.

## Code verification policy
- Run targeted tests and typechecks for every changed implementation surface.
- Use Node 20 for `ts-node/esm`-dependent verification.
- Run full shared/backend suites only when the actual change breadth or completion risk warrants them.
- Always run:
  - `node .ai/scripts/ctl-project-governance.mjs lint --check`
  - applicable context/project-state/API-index checks when their sources change
  - `git diff --check`
- Do not run a build or development server unless separately requested/authorized.

## Rollout / backout
- Rollout: one task-local canary; no persistent capability enablement or traffic cutover.
- Backout before paid execution: revert task-owned code/docs.
- Recovery during/after execution: stop before the next effect, clear credentials, restore capabilities, preserve accepted history, and resume from it.

## Verification log
- 2026-08-16 — Initial task registration: governance sync/lint and `git diff --check` passed; T-137 was allocated and mapped.
- 2026-08-16 — Simplification completed: replaced compliance-heavy phases/gates/manifest/replay with the project-aligned semantic and resume-first model.
- 2026-08-16 — Final docs verification: governance sync/lint, scoped whitespace/secret scans, task query, and `git diff --check` passed. No application code, API, database, UI, or provider configuration changed.
- 2026-08-16 — Prepare discovery completed: 410/410 scoped literature rows were hard-eligible; the default four-source lane and SciFact retrieval-depth question were selected; existing service coverage and runner semantic mismatches were confirmed by source and read-only database inspection. No product row, provider resource, capability, or secret was changed.
- 2026-08-17 — `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend run typecheck:experiment-foundation-scripts` passed after adding the T-137 scripts.
- 2026-08-17 — `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm scripts/t137-scientific-dossier-canary-profile.unit.test.ts` passed `2/2`.
- 2026-08-17 — Node 20 `node --check` passed for the coordinator and both modified Topic runner scripts.
- 2026-08-17 — First corrected end-to-end `pnpm t137:pre-pai` completed Topic/PaperProject but exposed the required PI MotiveEvidenceBoard gate. After adding the owner-required board, the valid v2 HTTP admission command exposed Fastify mutating-union validation; the canonical admission service path completed the same request.
- 2026-08-17 — Final `pnpm t137:pre-pai` passed and stopped at pre-PAI with all five downstream scientific/provider counts at zero. Immediate replay also passed with identical anchors.
- 2026-08-17 — WorkOrder v2 validation fix: Node 20 shared schema test passed `19/19`; the backend route integration lane passed `11/11`, including preservation of `execution_bundle` and `resource_snapshot` under Fastify defaults.
- 2026-08-17 — Shared typecheck, backend typecheck, and the ExperimentFoundation script typecheck passed after the route fix and both T-137 continuations.
- 2026-08-17 — Exact T-137 preflight rerun used `persisted_owner_reader`, compared branch/revision/cells exactly, replayed the existing WorkOrder and retained zero provider/scientific rows.
- 2026-08-17 — `pnpm t137:pai --mode offline-preflight` passed with zero cloud calls/database writes/capability changes and all scoped post-PAI counts at zero.
- 2026-08-17 — A no-credential `pnpm t137:pai --mode execute` probe failed before capability enablement or provider/database effects; immediate offline readback again returned all scoped post-PAI counts at zero.
- 2026-08-17 — `pnpm t137:accept --mode offline-preflight` passed with zero external calls/database writes/capability changes and correctly waited for 2 Results, 1 passed report, and 1 REU.
- 2026-08-17 — Browser-authenticated Cloud Shell readback confirmed RAM user `user_0002`, the existing controller role trust, the PAI-only runtime role trust, and the 3,600-second maximum session duration. No RAM role, trust, or policy changed.
- 2026-08-17 — One least-privilege controller STS session was issued and `pnpm t137:pai --mode execute` passed: exactly 2 `CreateJob` calls, 2 successful Attempts, 2 Results, 1 passed report, 1 EvidenceCandidate, 1 REU, relay idle, zero failures, and zero replay rows.
- 2026-08-17 — `pnpm t137:accept --mode execute` passed and produced the registered `+61,947 ppm` fact, a supported moderate Claim, and Dossier `implementation_dossier_t137_t137_pre_pai_20260817_v2` in `ready_for_writing / complete` state.
- 2026-08-17 — Local and Cloud Shell credential files were overwritten and removed. No Alibaba credential was written to the repository or `.env.local`; process-scoped capabilities returned to defaults.
- 2026-08-17 — Terminal-state repair and replay passed: PAI offline reports `scientific_evidence_consumed_by_closed_cycle`, PAI execute rejects the closed Cycle before credential access, acceptance offline reports `ready_for_writing`, and acceptance execute replays successfully with `OPENAI_API_KEY=`.
