# 09 Pack C implementation readiness review — Phase 4 scientific validation and trusted Cycle closure

## Status

- State: `authorized — implementation in progress`; OD-C1 through OD-C4 confirmed by the user on 2026-07-18, and Pack C implementation was separately authorized the same day after the execution plan was synced into `01-plan.md`. Baseline HEAD at authorization: `3d241127`. Execution begins with Slice C-EF; the C-cutover slice remains schedule-gated by OD-C3.
- Review target: `Implementation Pack C — Phase 4 exact-batch scientific validation, evidence gateway and D-16/D-17/D-18 trusted Cycle closure`.
- Prepared: 2026-07-18, after the zero-write cloud-preflight implementation checkpoint (`cloud-preflight-local-20260718-r9`).
- Precedents: `07-implementation-readiness-review.md` (Pack A), `08-pack-b-implementation-readiness-review.md` (Pack B). Pack C follows the same review → authorization → implementation → disposable-PostgreSQL gate sequence.
- Blocking dependency note: Pack C does NOT depend on the live Aliyun read-only acceptance window (EF-P16 remains `blocked` independently); Pack C work must not be sequenced behind it.

## Scope restatement

Pack C implements Phase 4 of the T-132 roadmap: the single scientific authority chain over one exact immutable batch Run, and the single execution-accounting path through the existing PI ValidationCycle closure. In the first release every scientific happy path remains production-disabled contract conformance; the only closure the product performs live is the D-14 no-evidence/control-only closure with `scientific_disposition=null`.

In scope:

- EF EvaluationProtocol v2 canonical ordered typed `required_rules` execution model with a code-local closed capability map; first supported slice is exactly `metric_contract@v1` and `artifact_contract@v1`; every other declared required rule returns stable `UNSUPPORTED_RULE` before Run freeze/dispatch and at final validation.
- EF batch-scoped ScientificValidation: one report binding exact Run ref/`run_manifest_hash`, canonically ordered cell/result refs+hashes, exact protocol revision/hash, `validator_profile_version/hash` and ordered rule results; overall status only `passed | failed | unsupported`; ScientificValidationService as the sole writer of report, generated validated facts and EvidenceCandidate; `passed`-only atomic report/Candidate/outbox mint.
- Removal of `accept_partial` and every partial-evidence branch; incomplete output remains Attempt diagnostics.
- PI Evidence Trust Gateway as the only RunEvidenceUnit writer: identity-only input, server-resolved EF lineage + PI scope, atomic REU/TraceManifest/outbox, idempotent consumption of one eligible EvidenceCandidate event; failed/cancelled/incomplete execution and all LocalScript/fake-provider provenance rejected.
- D-18 closure watermark and embedded immutable closure snapshot on the existing ValidationCycle closure record: canonical admitted-branch membership, per-branch current revision id/hash/sequence + matching effective head Run/manifest/cells/all Attempts + execution/eligibility state + eligible REU refs; `BRANCH_HEAD_NOT_FROZEN`, `CYCLE_ACTIVE_REAL_ATTEMPT`, `CYCLE_CLOSURE_SCOPE_DRIFT` semantics; closed-Cycle write seal; non-head history excluded; explicit `comparison_input_ref/hash` only.
- `CycleReadyForInterpretation` derived once from the exact closure-input hash; Result Analysis reduced to one exact-hash-bound proposal; the existing Cycle-closure AuthorityAction as the sole writer of closure kind, nullable `positive | negative | inconclusive` and the D-16 accounting snapshot/hash; server-derived selected exit from admission-frozen exit definitions; caller-authored `cycle_assessment`/`decision_exit` rejected.
- `ValidationCycleClosed` as the only ResultInterpretationPacket trigger; Packet/Claim/Dossier/motive/retrieval/next-step consumers require the exact closed Cycle; dossier readiness consumes only explicit closed-Cycle snapshot refs/hashes; Sidecar rebuildable/display-only.
- Atomic cutover of the superseded T-124 paths: trusted failed/cancelled REU creation, project-wide failed-like REU scans, caller-authored assessment/exit and direct Packet materialization are removed in the same release with no dual read, fallback or compatibility alias (audit rows/tests remain audit-only).
- Closure of `paper_experiment_sidecar` generic create/upsert authority (census finding: Sidecar is currently an independently writable generic EF record, not a projection); Sidecar becomes strictly rebuildable from closure authority.
- Service/repository-layer enforcement for the legacy scientific writers (census finding: the existing cutover guard is HTTP-only; `collectJob`, `createRecord`/`upsertRecord` for the three scientific kinds and the PI live-collect wrapper remain internally callable and must fail closed below the route layer).

Out of scope (unchanged decisions):

- No real-provider execution, no real ExperimentResult/EvidenceCandidate/REU production claims (M7).
- No `FailureEvidenceUnit`, second gateway, `ScientificConclusion` aggregate, rule DSL/plugin registry, LLM rule interpretation or human waiver of `UNSUPPORTED_RULE`.
- No UI/search work (Phase 5), no cloud-preflight coupling (independent M6 lane), no legacy revalidation (D-08), no non-local DB apply.

Audit-matrix closure targets: EF-P02, EF-P03, EF-P07, EF-P18 (closure half), EF-P22, EF-P23, EF-P24; EF-P06 partially (validation/evidence half); EF-P17 gains the closure-action evidence.

## Internal slicing — confirmed by OD-C1

Phase 4 spans two domains and one joint cutover seam. Confirmed delivery order inside one Pack C authorization:

1. **C-EF slice** — protocol v2 required-rules kernel, ScientificValidationService, EvidenceCandidate mint, `accept_partial` removal. Independently gateable on disposable PostgreSQL (production-disabled fixtures).
2. **C-PI slice** — Evidence Trust Gateway, D-18 watermark/snapshot, readiness trigger, proposal-only Result Analysis, sole closure writer, closed-Cycle seal, Packet one-way materialization.
3. **C-cutover slice** — atomic removal of superseded T-124 S3/assessment/exit/Packet paths plus dossier switch to declared closed snapshots; joint T-124/T-132 contract tests.

Each slice gets its own PC-check subrange and disposable-PostgreSQL lane; the pack closes only when all three converge in one final gate run. Alternative (rejected by default): splitting C-cutover into a separate task package — rejected because D-16/D-17 name the cutover as one mandatory atomic migration debt and a package boundary would invite a dual-read interim.

## Frozen implementation decisions — signed off with OD-C1..C4 on 2026-07-18

### Domain and writer boundary

- EF owns: protocol rule execution, validation report, EvidenceCandidate. PI owns: REU/TraceManifest, readiness trigger, proposal, closure assessment/snapshot, Packet, dossier consumption. No cross-domain FK/ORM relation; cross-domain identity remains exact refs/hashes/sequences/events (D-20/D-21 unchanged).
- Sole writers: `ScientificValidationService` (EF), `EvidenceTrustGateway` (PI REU), `ValidationCycleClosureService` (PI disposition/snapshot). Generic record writers, adapters, monitors, routes and callers cannot construct these records.
- Integration events (additive): `EvidenceCandidateQualified` (EF outbox → PI inbox) is the only new cross-domain event required by the gateway; `ValidationCycleClosed` remains a PI-domain event consumed by PI-side materializers. Any additional event requires a named review addendum.
- **Addendum (2026-07-20, C-PI step 3)**: the gateway additionally emits one PI-domain projection-feed event `RunEvidenceUnitRegistered@v1` in its atomic commit (D-16's "gateway atomically writes REU/TraceManifest/outbox" acceptance). It is PI-internal (never crosses to EF), carries identity/hash refs only, and its consumers are the Phase 5 retrieval/motive projections. No other event is added.
- **Addendum (2026-07-21, C-PI step 5)**: reason code `PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED` is added beside `PI_EXPERIMENT_V2_ADMISSION_DISABLED` (capability-off rejection for the dedicated v2 closure lane; also currently returned for the production-disabled `scientific_evidence_assessed` kind). The closed-Cycle seal lookup is injected optionally with a never-closed default for test compatibility; the `packc-pi` gate must census the production composition wiring, and C-cutover makes the dependency required.
- **Addendum (2026-07-21, C-cutover increment 1)**: reason code `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED` marks both former pre-closure ResultInterpretationPacket triggers as permanently closed; packet materialization returns only as a `ValidationCycleClosed`-driven post-closure projection in a later increment. Legacy REU minting entries reuse `LEGACY_SCIENTIFIC_WRITER_CLOSED`. Dossier readiness input gains `closed_validation_cycle_snapshot_refs` (exact validation_cycle_id + closure_id + closure_snapshot_hash triplets verified against the v2 closure table); the project-wide REU scan vocabulary is deleted, not aliased.

### Additive schema families (exact Prisma names TBD via `sync-db-schema-from-code`)

- EF v2: ExperimentResult (per-cell complete result envelope), ScientificValidationReport (+ ordered rule results as named typed canonical JSON + server hash), EvidenceCandidate.
- PI v2: RunEvidenceUnit, TraceManifest, evidence inbox receipts; embedded closure snapshot + watermark + accepted-proposal ref/hash columns on the existing ValidationCycle closure record (embedded value, not a new aggregate).
- All structural invariants relational (identity/unique/CAS/order/event); frozen scientific values as named schema-versioned typed canonical JSON with server hashes; zero generic `kind/payload`, EAV or caller hashes. DB apply remains a separately approved named-local gate with recovery point, per Pack A/B precedent.

### Stable reason codes (minimum set)

`UNSUPPORTED_RULE`, `VALIDATION_SUBJECT_INCOMPLETE`, `EVIDENCE_CANDIDATE_NOT_ELIGIBLE`, `EVIDENCE_PROVENANCE_REJECTED` (simulation/LocalScript/fake), `BRANCH_HEAD_NOT_FROZEN`, `CYCLE_ACTIVE_REAL_ATTEMPT`, `CYCLE_CLOSURE_SCOPE_DRIFT`, `CYCLE_ALREADY_CLOSED`, `CLOSURE_PROPOSAL_STALE`, `LEGACY_RECORD_NOT_ELIGIBLE` (reused). Exact registry frozen at authorization.

### Capability posture

- Per confirmed OD-C2: two separate default-off configuration guards mirroring Pack A/B — `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` (EF slice) and `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED` (PI slice; also gates the only first-release live path, the no-evidence closure). Exact names finalized through the env-contract workflow at implementation.

## Acceptance matrix (proposed PC01–PC20)

| Check | Proves |
|---|---|
| PC01 | typed required-rules readiness: unsupported/malformed/missing rule blocks before Run freeze/dispatch with `UNSUPPORTED_RULE`, zero write |
| PC02 | frozen `validator_profile_version/hash` recheck at final validation; support drift fails closed |
| PC03 | batch subject completeness: missing/failed/cancelled required cell ⇒ no validation pass, exact eligibility code into closure accounting |
| PC04 | `metric_contract@v1` + `artifact_contract@v1` positive/negative fixtures over exact ordered cell results |
| PC05 | sole-writer census: no generic/route/adapter/caller path can write report/Candidate; `accept_partial` absent from contracts/API/DB |
| PC06 | `passed`-only atomic report/Candidate/outbox mint; idempotent replay; crash convergence on disposable PostgreSQL |
| PC07 | simulation/LocalScript/fake provenance rejected by every scientific writer (EF-P18 closure half) |
| PC08 | gateway identity-only input; caller-declared status/hash/candidate arrays cannot influence admission |
| PC09 | gateway atomic REU/TraceManifest/outbox; duplicate candidate event converges; failed/cancelled/incomplete ⇒ zero REU |
| PC10 | D-18 watermark: two-plus-branch fixtures prove deterministic membership/order/hash, current-revision/effective-head parity, complete cells/Attempts |
| PC11 | `BRANCH_HEAD_NOT_FROZEN` stable blocking; no-head branch visible in candidate; closure cannot commit |
| PC12 | `CYCLE_ACTIVE_REAL_ATTEMPT` blocks from any Run in the Cycle incl. non-head; terminal/cancelled unblocks |
| PC13 | `CYCLE_CLOSURE_SCOPE_DRIFT` on concurrent admission/head/manifest/Attempt drift: zero partial write, rebuild, same-watermark replay idempotent |
| PC14 | one closure action writes kind + nullable disposition + accepted proposal ref/hash + snapshot/hash atomically; server-derived selected exit; caller `cycle_assessment`/`decision_exit` rejected |
| PC15 | no-evidence closure: null disposition/selected exit, exact head-Run/terminal-simulation-Attempt refs, EF scientific state unchanged (`not_started`), zero evidence records |
| PC16 | closed-Cycle seal: admission/revise/fork/Run-freeze/head/Attempt/attachment/dispatch all fail closed with zero writes; successor-Cycle path works |
| PC17 | Packet only after `ValidationCycleClosed`, excluded from closure hash; Claim/Dossier/motive/retrieval reject open/proposal-only input; dossier consumes only declared closed snapshots, project-wide REU scan absent |
| PC18 | atomic cutover census: superseded failed-REU writers, project scans, caller assessment/exit and direct Packet paths removed; no dual read/fallback; legacy/audit digests unchanged |
| PC19 | below-HTTP writer closure: internal service-level calls to legacy scientific writers (`collectJob`, generic create/upsert for the three kinds, PI live collect, `paper_experiment_sidecar` create/upsert) fail closed regardless of route guards or cutover flag state |
| PC20 | readiness evaluator: D-18 watermark evaluation is server-derived, deterministic and rebuildable; no caller-writable readiness record; consumed by proposal admission and the one completion action without adding a human action |

Gate mechanics follow Pack A/B: one checked-in machine gate runner, disposable real-PostgreSQL lanes with skip=0, protected-table before/after digests, exact evidence keysets, durable closure artifact under `artifacts/`.

## Confirmed decisions — OD-C1 through OD-C4, user-confirmed 2026-07-18

| ID | Question | Confirmed decision |
|---|---|---|
| OD-C1 | Internal slicing inside one Pack C authorization | one pack, three gated slices C-EF → C-PI → C-cutover, single final convergence gate |
| OD-C2 | Capability-key granularity | two separate default-off keys: EF scientific validation and PI closure cutover; the first-release live path (no-evidence closure) is gated by the PI key only. Proposed names `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` and `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED`; exact names finalized through the env-contract workflow at implementation |
| OD-C3 | T-124/T-133 coordination for the cutover slice (live S3 dossier, closure route, Result Analysis code and superseded T-124 tests) | land C-EF and C-PI first; schedule C-cutover jointly with the T-124 tracker owner after T-133 N2+N6 converge, in one atomic release |
| OD-C4 | ExperimentResult envelope timing | lands in Pack C as production-disabled contract conformance; M7 only flips real-provider eligibility |

## Source population and modification boundary

Census source: two read-only code surveys executed 2026-07-18 (Codex gpt-5.6-sol, read-only sandbox), checked in as `artifacts/pack-c-preplanning-20260718/00-ef-side-writer-census.md` (exhaustive EF writer inventory + 20-item closure checklist) and `01-pi-side-closure-census.md` (exhaustive PI closure/REU/dossier inventory + atomic cutover checklist). File:line references below are as of commit `389fccbc`.

### EF-side population Pack C closes or replaces

- Legacy scientific kinds `experiment_result` / `result_validation_report` / `evidence_candidate` are rows in the single generic `ExperimentFoundationRecord` table (`prisma/schema.prisma:5923`), not dedicated tables.
- Two creation mechanisms: `ExperimentFoundationExecutionService.collectJob` (`apps/backend/src/services/experiment-foundation-execution-service.ts:260`, a 15-step NON-transactional write sequence with private `createExperimentResult:696` / `createValidationReport:851` / `createEvidenceCandidate:935`), and generic `ExperimentFoundationService.createRecord:411` / `upsertRecord:444` which accept caller-supplied payloads for all three kinds (`upsertRecord` can overwrite an existing evidence payload).
- Three HTTP entrances (generic record POST/PUT, legacy EF collect, PI live-experiment collect wrapper) all carry `legacyExperimentMutationOnRequest`; with named-local cutover the HTTP layer rejects, **but the guard is HTTP-only** — the services/repositories remain internally callable. Pack C enforcement must land at the service/repository layer, not another route hook.
- `accept_partial` is fully alive: caller-forwarded through the PI live wrapper (`paper-implementation-live-experiment-adapter-service.ts:197-204`), consumed by `analyzeValidation`, produces synthetic `partial_acceptance_ref` and accepted-partial EvidenceCandidate eligibility (`experiment-foundation-execution-service.ts:350-363,872-874`).
- Legacy EvaluationProtocol has eight opaque `Record<string, unknown>` policy blocks; the collector never executes them (heuristic metric/artifact/hash presence checks only). Pack A's typed v2 protocol snapshot with `required_rules` and closed union `metric_contract@v1 | artifact_contract@v1` already exists and is shape/readiness-validated but never executed — Pack C adds the execution engine to the existing authority, not a new rule representation.
- Provenance gap: no underlying legacy writer checks adapter kind or external-job ref type. LocalScript (`adapter_kind='local_script'`, ref `local_script_process`) and the legacy fake Aliyun client (`adapter_kind='aliyun_pai_dlc'` with only `{ mocked: true }` metadata) can mint scientific records through internal calls or cutover-off composition. Pack B v2's explicit fake provenance (`non_production_fake_provider`, `deterministic_fake_aliyun_pai_dlc@v1`) currently has no scientific writer to be rejected by.
- Confirmed absent (greenfield for Pack C): v2 tables for scientific result, validation report, EvidenceCandidate, REU, Cycle closure snapshot.
- Full 20-item closure checklist: `00-ef-side-writer-census.md` §8.

### PI-side population Pack C closes or replaces

All four superseded authorities named by D-16/D-17 are still live:

1. **Caller-authored conclusion**: callers author `cycle_assessment` and may select `decision_exit` at draft/admission and completion; closure row update is general non-CAS.
2. **Result Analysis over-authority**: produces four free-standing scenarios plus complete packet semantics and deterministically assembles `CreateResultInterpretationPacketRequest`; two pre-closure packet-creation triggers exist.
3. **Trusted failed/cancelled REU**: `PaperImplementationWorkOrderExperimentBridgeService.recordRunMonitorIntake` (`apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts:274`) is the sole low-level REU constructor with seven entry paths (standalone/monitor/recovery intake, live collect, live cancel, live finalization, trace side writer); it mints trusted REUs for `failed`, `cancelled`, `negative`, `inconclusive` and `succeeded` alike. No Evidence Trust Gateway exists.
4. **Project-wide dossier scan**: `PROJECT_ACCOUNTABLE_RUN_STATUSES` + `assertProjectRunEvidenceAccounting` perform an unbounded project-wide REU scan with newer-REU/WorkOrder-supersession exclusion heuristics; S3 tests lock these superseded semantics and must be replaced in the same slice.

Additional findings:

- **Sidecar is not a projection**: `paper_experiment_sidecar` is an independently writable/upsertable generic EF record with no builder/rebuilder/closure consumer anywhere in production code. Pack C must close its generic create/upsert authority and rebuild it strictly from closure authority (this extends the C-PI slice scope beyond the plan's assumption that Sidecar was already display-only).
- **Readiness evaluator is greenfield**: no `CycleReadyForInterpretation` contract, event, evaluator, repository or route exists. Pack C adds a PI-owned deterministic evaluator/read model for the D-18 watermark (server-derived readiness decision + exact candidate snapshot/hash), consumed by Result Analysis admission and the existing completion action; it must not become a caller-writable readiness record.
- Pack A v2 patterns to follow (typed contracts, server canonical hash, restrictive relational invariants, version-CAS, atomic inbox/domain/outbox, replay) are inventoried with file refs in `01-pi-side-closure-census.md` §6.
- Full atomic-cutover checklist: `01-pi-side-closure-census.md` final section.

### Preserved population

- The existing `/complete` route remains the sole human closure action (converted to server-derived output; no second confirmation).
- Project/Cycle scope enforcement, trace/confirmation/proposal lineage and runtime-artifact admission/hashing/replay machinery are preserved as transport/evidence, stripped of conclusion authority.
- Legacy rows remain byte-unchanged diagnostics/admin reads per D-08/D-21; historical T-104/T-124 tests that lock superseded semantics are replaced, not retained as second authorities.

## Verification artifacts

- Pre-planning census: `artifacts/pack-c-preplanning-20260718/` (this review's source population input).
- Frozen at review sign-off: gate id scheme `packc-ef-*` / `packc-pi-*` / `packc-cutover-*` with final convergence `packc-final-*`; durable artifact root `artifacts/implementation/06-pack-c-…` (next free ordinal after `05-pack-b-quality-remediation-closure.md`); the stable reason-code minimum set above is the frozen registry baseline (additions require a named review addendum).
- Defined at implementation authorization: disposable-PostgreSQL lane names (Pack C needs Pack A+B seeded lanes plus the new scientific/closure families), full-suite expectations and the exact Prisma family/DDL matrix via `sync-db-schema-from-code`.
