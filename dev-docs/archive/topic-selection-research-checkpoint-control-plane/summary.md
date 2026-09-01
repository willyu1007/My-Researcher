# T-147 — Topic Selection Research Checkpoint Control Plane

## Goal and outcome

Make topic selection a product-governed research process: current evidence, gap, question, and promotion checkpoints — not client behavior — control academic-quality review, human participation, loopbacks, honest stopping, and downstream eligibility, with an evidence-grounded divergence seam ahead of convergence at the gap decision.

Delivered outcome (accepted 2026-08-31 as A14, hardened 2026-09-01 as A15):

- **A1–A8 delivered in full**: product-owned checkpoint authorities, snapshot-bound strict-human decisions, durable objections, central transition guards, academic policy as hard semantics with configurable tripwires, legacy `/title-cards/*` semantic-write cutover (reads and intake preserved), versioned backfill (2,295 anchors), API-first recovery projections, and the top-k academic-objection full-chain negative regression.
- **The ResearchArena divergence seam exists but is optional and `support_only`** — the researcher chose `remain_advisory` because calibration evidence was honestly `insufficient_evidence` (zero product-v2 members, zero strict-human labels). Activation was never claimed.
- **A9–A13 are explicit closed limitations, not failures**: A9 (post-bridge objection + exactly-once handoff) was intentionally not forced and belongs to the next genuinely worthwhile topic; A10–A12 delivered their contract/carry machinery without a qualifying live product-v2 lineage; A13 (decision-quality evidence) is unproven and is precisely why the Arena stays advisory.

## Delivered capabilities

- Four-stage checkpoint control (`TopicSelectionResearchCheckpoint` + decision/objection/resolution authorities) with content-addressed packets, one-current-per-stage keys, supersession, predecessor-lineage validation, and fail-closed guards at every authority writer (both NeedCandidate writers, HumanConfirmNeed, N8 entry, promotion, bridge, intake).
- Read-time projections only — research-status, stage manifest, Chinese human stage views, LLM working sets, continuation envelope with effect-class authorization; no writable summary authority exists.
- Two-layer dispositions (set-level `selected`/`none_viable`/`evidence_expansion_required`/`reframe_required` routed by the checkpoint; per-candidate `selected`/`parked`/`dropped` with five enumerated evidence-backed drop-reason codes); N4/N6 no longer force non-empty candidates.
- Machine-owned risk findings minted from material N8 output and carried by stable ref through N9→N10→N11→v1c into promotion mapping; `TopicSelectionAcceptedRisk` remains strict-human (actor + expiry/recheck condition), and mappings validate usability (status, expiry, target, scope).
- EvidencePacket resolution: keyed locator→text over durable fulltext rows (paragraph/anchor/abstract direct; section/document by concatenation), quote-integrity validation, typed role/query-intent retrieval with chunk-granular provenance bound to the frozen Arena snapshot lineage.
- `TopicSelectionResearchArenaSession` + v2 role executions: snapshot-bound session root with one-current key, supersession, enumerated termination, loop-delta-gated retry (third attempt forbidden), exposure-set independence admission, transcript byte-verification, deterministic partial-write recovery, and structured 409 race convergence. Advisory reviews are immutable strict-human labels with server-derived classification; advancing labels bind the exact server-hashed HumanConfirmNeed intent (idempotency = intent hash + live snapshot).
- Arena calibration owner over OfflineEvaluation: v2 pre-registration (six-slot/two-tranche protocol, frozen case sets, one-designated-label-per-member), v1 historical read-only; generic v1a/v1b offline-eval ingress is stage-bound and cannot touch `research_arena` lineage; reports are support-only and cannot activate anything.

## Key decisions that still constrain behavior

- **Exactly one active research path; fork is out of scope.** Alternatives persist as snapshot-bound parked candidates with delta-gated serial return; a fork recommendation is recorded as `parked`.
- **Arena output is advisory forever until a separate activation decision.** Activation requires a new evidence/protocol delta, at most one separately reviewed collection batch, a new source-bound calibration report meeting the pre-declared rule (both dominance pairs, both perturbation directions, explained overrides, ≥1 real decision improvement or measured stage avoided), and an explicit researcher decision. Calibration uses no absolute value labels — dominance pairs, evidence-perturbation counterfactuals, and per-drop-reason-code override accounting; the target is decision-process quality, not outcome accuracy.
- **`promotion_gate_check_39bfb045-47d2-4e67-b6b4-f9a125aa88be` (snapshot `64ede7615c3c31ebaa7a5b9dfd558d2f7cbccd7700bd024b2e0b86b428cea36c`) is frozen as the ambiguous calibration fixture** with zero promotion decisions and zero bridges. Do not promote it to complete a process; gate readiness is not comparative research value. Current Arena session `research_arena_def21744-92fb-41cb-96f1-20798e76392a` (`synthesized`, `evidence_expansion_required`) and canonical calibration run `offline_eval_run_d64bd0c4-8074-4474-bf41-d9c6ef51bfe1` (trace `143a4639c8b8c0ba964d109226a5f3b9715ba3620e72ad9a54e5afc26cf8847f`) are its anchors; the refreshed evidence checkpoint `research_checkpoint_7925bb9a-9782-43ec-a5ec-86cda8f2573f` is intentionally pending.
- **Multi-run `is_current` value dispositions are per run lineage**; title-card-level projections resolve them against the current question contract with a newest-first fallback and a `MULTIPLE_CURRENT_VALUE_DISPOSITIONS` issue code — never by assuming one current per title card (pre-archive live-smoke repair, `dbb714d5`).
- **Server-owned identity at public ingress**: workflow-harness artifact routes cannot set `stable_key` or non-`system` provenance; reserved namespaces (advisory reviews, intents, risk findings) are mintable only by their owning services.
- Checkpoint replacement honors `preserve_decided_current` for support-only projections: advisory work can never supersede a decided human checkpoint or shrink the frozen candidate pool.
- Provenance never certifies review: `backfilled` anchors require the earliest unsatisfied current checkpoint before any new advance; pre-cutover records stay readable but non-advancing.
- Clients (Codex, future GUI) are executors; no client-specific semantic authority or rehearsal runtime mode exists, and tests exercise the same guarded contracts.

## Relationships and follow-up

- **T-129** owns provider/prompt calibration and live multi-provider debate; T-147 did not unblock it.
- Future Arena activation prerequisites are tracked as improvement-register items TS-I18/TS-I19 (fresh product-v2 corpus with resolvable quote-integrity evidence; operator API for NeedCandidate-targeted exact-source InputSnapshots). At the 10B-2 stop, only one EvidenceMap (`evidence_map_de5e35b6-48d9-4513-8aff-fd7e5894e1fc`, 11/11 units) passed canonical quote integrity; legacy maps carry non-verbatim statements.
- The deferred A9 proof (post-bridge objection invalidation + exactly-once handoff) runs with the next process-selected advancing topic under its own task.
- The 2026-09-01 audit's secondary/P2 hardening items (arena retry TOCTOU under concurrency, quote-window normalization before truncation, persisted disposition write-back on non-selected N4/N6 outcomes, N8/N9 blank-trigger materiality mismatch, continuation-envelope objection signals, artifact-route scoping before auth lands) were explicitly left unrepaired and must not be cited as activation evidence.

## Verification anchor

Final green state: backend suite 2,909 tests / 2,838 passed / 0 failed / 71 conditional skips; root typecheck, DB context, OpenAPI (217+ paths) contract/drift, workflow-matrix, and Prisma migration-drift checks pass. Independent adversarial audit (six-stream, 2026-09-01) plus pre-archive live smoke (2026-09-02) verified the guarantees against the real backend, including three rejected forgery/ingress probes and full recovery-surface reads on both frozen lineages.
