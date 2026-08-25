# Status

## Goal
Make topic selection a product-governed research process in which current evidence, gap, question, and promotion checkpoints—and not client behavior—control academic-quality review, human participation, loopbacks, and downstream eligibility.

## Progress
- State: done
- Current phase: Complete — post-audit checkpoint hardening verified through PaperProject intake
- Next step: None; task is ready for a separate authorized archive transition.
- Blocker: none

## Latest checkpoint

- A post-completion implementation audit repaired six gaps before archive: every downstream checkpoint now carries and validates the exact current predecessor-checkpoint ref; question advancement requires an explicit `objections_reviewed: true`; concurrent input-snapshot creation converges on the unique winner; concurrent distinct objection resolutions yield one winner and one stable `409`; the matrix negative self-test removes a real parsed cell instead of relying on brittle string replacement; and v1a workflow fixtures now satisfy the production support/context/challenge/direct-neighbor evidence contract.
- The supported Node range is executable again on Node 26: backend/shared TypeScript entrypoints use `tsx` via `--import` instead of the incompatible `ts-node` ESM loader. Developer commands, operator scripts, canaries, the full-suite runner, and runtime-stress children use the same loader contract.
- Decisive post-audit verification is green: `pnpm typecheck`; root `pnpm test` on Node 26 (backend 2,776 tests: 2,707 passed, 69 conditional skips, 0 failed); three repeated real-Postgres checkpoint integration runs plus the full-suite run; workflow-matrix and injected-drift checks; LLM config, N8 dry-run, and slot-manifest operator checks; DB-context alignment; and disposable-shadow migration drift with an empty diff.
- Phase 5 closes promotion and intake. HumanPromotionDecision now materializes an exact hash-versioned promotion checkpoint, rejects an incomplete native evidence→gap→question chain, and requires every advancement-relevant warning or independent critic finding to map to an accepted risk, evidence-backed disposition, or owned condition/action.
- Promotion and bridge services require checkpoint control as a constructor dependency; omission is a type error rather than a silent runtime bypass. Bridge creation and every intake attempt re-run the complete current checkpoint chain before replay or any PaperProject write, so later objections, stale hashes, or open actions invalidate an unconsumed bridge.
- Non-promote human decisions remain durable and decided but non-advancing, with product-owned required actions. The bounded-debate N3 semantic layer and critic resolution map survive into the promotion dossier.
- Legacy title-card semantic writers for need, question, value, package, decision, and direct promotion now return only `409 GATE_CONSTRAINT_FAILED` with the canonical research-status recovery path. Title-card/evidence intake and historical reads remain available.
- A real HTTP product chain, real-Postgres full-chain persistence, incomplete-chain and post-bridge objection negatives, and the original top-k parameter-only academic objection regression pass. Full v1c route, focused checkpoint, legacy cutover, v1b compatibility, shared contract, type, OpenAPI, workflow-matrix, DB-context, migration-drift, and idempotent-backfill checks are green.
- Phase 4 closed the research-design path. N7 now derives a pending question-contract checkpoint from the exact selected candidate, contract, question frame, answerability plan, evidence/boundary/assumption/falsification rows, and upstream refs before publishing its handoff.
- Question advancement requires identifiable mechanism/comparison/claim, operational outcome plus metrics and success criteria, explicit confounds or alternative explanations, challenge evidence, resources/baselines/ablations/setting, active source-bound pre-value falsification, claim ceiling/prohibited claims, no boundary violation, and an answerable verdict. Aggregate scores or generic risk prose cannot substitute for a missing component.
- N8 independently invokes the central guard before draft resolution or provider work and accepts only a current strict-human `advance` decision bound to the exact TopicQuestionContract snapshot. A partial N7 authority-write failure is recoverable: retry supersedes the orphan preregistration and binds the current contract without weakening the guard.
- Blocking and critical objections now freeze their source checkpoint and required loopback. They block that checkpoint and its downstream while permitting the named upstream correction path; only strict-human, current-snapshot, evidence-backed resolution against a substantively revised expected authority can close them. Rewording the question while retaining the challenged ResearchSlice remains blocked.
- Phase 3 closed the evidence-to-gap path with native checkpoint assembly. Evidence review now requires current source authority, inspectable non-abstract core claims, complete required direct-neighbor coverage, complete required disconfirming coverage, and no blocking evidence conflict before `advance` is advertised.
- Candidate arenas now preserve admitted candidates and rejected framings, fail closed on a lone viable candidate or wording/parameter-only duplicates, and expose actionable candidate-generation loopbacks. Counts and semantic-group hashes remain tripwires; the strict-human gap review must name a genuinely distinct viable alternative and the substantive axes that differ.
- Both direct and batch candidate writers materialize the same current arena. Readiness/adjudication changes refresh meaningful candidate facts, stale pool hashes fail, and HumanConfirmNeed advances the gap checkpoint only through its existing human-confirmed decision authority. Exact confirmation replay is recoverable; drifted replay conflicts.
- v1b bundle publication now requires the current advancing gap checkpoint. API and native-harness route tests traverse the same evidence decision and competitive gap review rather than a test-only quality mode.
- Phase 2 closed with product-owned v1 checkpoint, missing-stage decision, objection, and objection-resolution authorities; canonical packet/history/status APIs; snapshot-bound strict-human decisions; deterministic supersession; and a central transition guard.
- Both NeedCandidate persistence paths now call the same evidence-checkpoint guard before any write. Pending, stale, non-advancing, required-action, and blocking-objection states fail closed.
- Migration `20260825120000_add_topic_selection_research_checkpoints` replayed without Prisma drift and is applied to the local development schema. DB context and OpenAPI are aligned.
- The versioned backfill initially produced 2,249 pending `backfilled` anchors across 1,080 title cards. Final replay after later local fixtures returned the same 2,295 anchors across 1,100 title cards twice: 665 evidence, 660 gap, 532 question, and 438 promotion.
- Focused contracts, service, route, bypass, and real-Postgres concurrency tests pass; one of two simultaneous distinct human decisions wins atomically and exact replay returns the winner.

## Done when
- [x] A1: Product-owned checkpoint state, packets, decisions, currentness, supersession, and transition guards cover evidence, gap, question, and promotion review through documented HTTP APIs.
- [x] A2: Evidence and gap advancement requires product-validated source quality, nearest-work/disconfirming coverage, and genuinely distinct candidate competition under current policy.
- [x] A3: TopicQuestion value assessment cannot begin without a current human question confirmation that includes mechanism identifiability, proxy/confound, falsification, claim-ceiling, and objection review.
- [x] A4: Durable blocking human objections invalidate affected downstream authority and cannot be cleared by rewording, client memory, or non-human action.
- [x] A5: Promotion and PaperProject intake fail closed on unresolved objections, incomplete required actions, stale decisions, or unmapped advancement-relevant risks.
- [x] A6: An API-first research-status projection lets any client recover completed work, alternatives, unresolved issues, current checkpoint, allowed decisions, and next authorized transition without reconstructing internal records.
- [x] A7: Production contains no rehearsal/reduced-quality runtime path and no Codex- or GUI-specific semantic authority; test scenarios exercise the same guarded product contracts.
- [x] A8: Versioned cutover, migration, replay/idempotency, OpenAPI/context alignment, and a full-chain negative regression based on the top-k academic-objection case are decisively verified.
