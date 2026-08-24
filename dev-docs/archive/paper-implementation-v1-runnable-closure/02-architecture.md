# Architecture

## Boundary
| Area | Rule |
|---|---|
| Owner | T-109 owns runnable closure evidence, flow contract, fixture inventory, replay entrypoint, and operator checklist. |
| Product authority | Existing T-093 through T-105 services remain authority writers. T-109 does not create authority objects directly. |
| Persistence | In-memory replay is required for default closure. Local Postgres/disposable-schema is optional and non-blocking unless queryability, idempotency, or recovery parity cannot be trusted without real DB verification. No schema change by default. |
| Experiment foundation | T-109 must validate a deterministic PaperImplementation -> experiment-foundation seam -> evidence -> feedback/adjustment loop without moving experiment-foundation ownership. |
| Provider variance | T-105 remains deterministic fake-provider plus live-provider preflight only. |
| UI | T-100 remains command/read-model owner. T-109 uses restrained route/static boundary checks only by default; browser smoke and UI adaptation wait until backend flow closure unless drift is found. |
| Writing | T-098 `WritingEntryPacket` projection is the required V1 boundary. T-109 does not ingest into the writing module or mutate writing authority. |

## Canonical Flow Draft
```text
TopicSelectionPaperProjectBridgeHandoff
  -> ImplementationProject bootstrap
  -> TraceManifest kernel setup
  -> CoreMotive draft/admission and evidence board
  -> ValidationCycle draft/admission
  -> ResearchWorkOrder and experiment bridge
  -> RunMonitorIntake and RunEvidenceUnit
  -> ResultInterpretationPacket and ClaimTracePacket
  -> ClaimCandidate and ImplementationDossier
  -> WritingEntryPacket projection
  -> AI proposal/evaluation adjunct lanes
```

## Adjacent Lanes
| Lane | Status In T-109 | Rule |
|---|---|---|
| T-104 live experiment adapter | Required deterministic seam lane | Must prove submit/sync/collect/finalization semantics with fake/local external behavior and feed trusted evidence back into PaperImplementation. Real cloud stays opt-in/outside default closure. |
| T-105 provider variance | Optional evaluation lane | Can prove deterministic fake-provider replay and preflight reporting; no live provider execution. |
| T-100 desktop workbench | Restrained boundary proof | Verify backend command/read-model calls and forbidden client-local readiness statically or at route level. Browser smoke is optional and non-blocking by default. |
| T-106 experiment hardening | External dependency/evidence source | Consume relevant evidence opportunistically; do not block T-109 on T-106 closure or absorb experiment-foundation internal hardening. |

## Artifact Expectations
- Flow manifest: ordered steps, request refs, response refs, expected gates, and failure recovery notes.
- Fixture manifest: happy path and blocked path fixture IDs with required source objects.
- Verification report: command results, artifact locations, skipped optional lanes, and residual risks.
- Operator checklist: what can be run locally, what requires env/credentials, and what requires human decision.

Default artifact root:

```text
.ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>/
  manifest.json
  flow-steps.json
  fixture-inventory.json
  linked-loop-report.json
  blocked-path-report.json
  writing-packet-summary.json
  ui-boundary-report.json
  residual-risks.md
  operator-checklist.md
```

Default replay command:

```bash
node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/paper-implementation-v1-runnable-replay.mjs
```

Allowed artifact content:
- stable IDs and refs;
- step status and gate result status;
- blocker codes and redacted reasons;
- trace manifest IDs and claim/dossier readiness summaries;
- input/output hashes or checksums;
- command names, exit statuses, and sanitized durations.

Forbidden artifact content:
- provider credentials, raw env vars, or unredacted `DATABASE_URL`;
- cloud SDK secrets or raw external platform payloads;
- raw model hidden reasoning;
- full raw paper text, private manuscript content, or unredacted personal data;
- large experiment artifacts;
- raw logs that may contain secrets.

`.ai/.tmp` artifacts are not committed by default. If closure needs durable review evidence, promote only selected redacted summaries into dev-docs after review.

## Closure Standard
T-109 is not closed by scattered unit tests alone.

Required closure evidence:
- one repeatable replay entrypoint, initially allowed to be route-level replay;
- one happy-path flow manifest from intake to `WritingEntryPacket` projection;
- P0 blocked-path evidence;
- deterministic linked-loop evidence from experiment seam through feedback/adjustment;
- writing packet projection evidence;
- restrained UI boundary proof;
- residual-risk report with owners for uncovered P1/P2 items;
- operator checklist explaining default, optional, skipped, and manual lanes.

CLI smoke is preferred after the route-level replay sequence stabilizes, but it is not required before the first T-109 closure if the route-level replay and evidence package are repeatable.

## Writing Boundary
T-109 verifies writing readiness by validating the `WritingEntryPacket` projection only.

Required:
- dossier readiness admits only supported, trace-ready claims;
- writing packet contains claim refs, evidence refs, citation candidate refs, trace refs, and consumer-facing source refs needed by the writing module;
- packet excludes `support_pending_trace` claims and unsupported evidence;
- packet does not treat memo, display summary, rationale, or interpretation text as citation source;
- packet names the writing consumer boundary without creating or mutating writing-module authority.

Out of scope:
- paragraph or section placement;
- citation insertion into a document;
- LaTeX, Prism, Overleaf, or manuscript export;
- writing module state transitions, revisions, or ingestion lifecycle.

## UI Boundary Proof
T-109 should keep UI testing intentionally narrow until the backend flow is closed.

Required:
- list the T-100 pages/panels that consume PaperImplementation runnable state;
- list backend GET read-model calls and POST command calls used by those surfaces;
- verify status/readiness/blocked states come from backend read models, not client-local synthesis;
- verify no retired desktop style layer is reintroduced;
- verify `research-argument` is not used as PaperImplementation authority.

Optional and non-blocking:
- minimal browser smoke after backend replay is stable;
- screenshot evidence for a single happy-path read-model state;
- UI adaptation for new read-model fields discovered by T-109.

## Deterministic Linked Loop
T-109 must prove the V1 flow can progress after an experiment-facing step, not only submit and collect an isolated job.

```text
Admitted ValidationCycle / ExperimentPlanLight
  -> ResearchWorkOrder
  -> T-104 fake/local external job submit/sync/collect
  -> trusted RunEvidenceUnit with target-specific trace
  -> ResultInterpretationPacket / ClaimCandidate / Dossier gate
  -> feedback candidate, review item, or decision queue item when evidence is insufficient
  -> adjusted next-step planning or admitted follow-up cycle/work order
```

Required assertions:
- `sync` remains non-final and does not create trusted evidence.
- `collect` or finalization uses the existing run-monitor authority path.
- Final evidence uses a `run_evidence_unit` target-specific trace.
- Failed, negative, or inconclusive evidence can create feedback/review/queue signals without mutating upstream authority directly.
- The next-step adjustment is explicit and traceable; it must not be an implicit overwrite of motive, validation, WorkOrder, claim, or topic-selection authority.
- Real cloud execution is optional/manual evidence and cannot be required for T-109 closure.

## T-106 Relationship
T-109 and T-106 are related but not nested.

| Finding type | Owner |
|---|---|
| PaperImplementation WorkOrder, adapter request, trace, run evidence, feedback, or next-step seam defect | T-109 may fix or document directly. |
| Experiment-foundation internal runner, provider, cloud, persistence, recovery, or external canary defect | T-106 or a future experiment-foundation task owns the fix. |
| Ambiguous ownership | T-109 records the failing seam evidence and splits a follow-up instead of silently expanding scope. |

T-109 closure must not wait for T-106 closure unless the failing seam invalidates PaperImplementation V1 runnable behavior.

## Governance Result
T-109 is a post-closure runnable package.

Default behavior:
- keep `T-091` and `T-101` closed;
- do not reopen D1-D10;
- record runnable closure evidence inside T-109;
- use project governance only to track T-109's own status and mapping.

Escalation triggers:
- a true contradiction between the closed design and the runnable flow;
- a P0 blocked path that cannot be closed within the existing authority model;
- evidence that T-101 parent closure was materially incorrect.

When escalation is required, add a scoped closure addendum to the affected parent/evaluation package instead of rewriting historical decisions.

## Required Blocked Paths
P0 paths are closure blockers for T-109. P1 paths should be covered when cheap or already supported by existing tests; otherwise assign an owner. P2 paths are residual risks unless a concrete defect appears during T-109.

### P0 - Closure Required
| ID | Blocked path | Required proof |
|---|---|---|
| BP0-01 | Upstream bridge hash drift | Bootstrap/replay returns conflict and does not mutate admitted implementation state. |
| BP0-02 | Missing or broken trace for writing-affecting object | Gate blocks readiness and produces repair/review signal. |
| BP0-03 | Memo, display summary, rationale, or interpretation text used as evidence/citation | Gate blocks citation/evidence use. |
| BP0-04 | Orphan monitor callback or external job not belonging to WorkOrder | Block before external side effects or trusted evidence write. |
| BP0-05 | Final run evidence missing target-specific `run_evidence_unit` trace | Final evidence admission blocks. |
| BP0-06 | Claim without claim trace | Claim remains `support_pending_trace` and cannot enter ready dossier. |
| BP0-07 | Unsupported or overclaim claim | Dossier/writing packet readiness blocks. |
| BP0-08 | AI proposal direct authority mutation | Harness blocks and emits queue/quality signal. |
| BP0-09 | T-105 live-provider preflight treated as live execution | Evaluation reports skipped/blocked and performs no live call. |
| BP0-10 | `research-argument` used as PaperImplementation authority fixture/source | Replay rejects or excludes it as authority input. |

### P1 - Include Where Cheap Or Already Covered
| ID | Blocked path | Handling |
|---|---|---|
| BP1-01 | Duplicate bootstrap with same hash | Prefer direct replay assertion or existing T-093 test reference. |
| BP1-02 | Same bridge with different hash | Prefer direct replay assertion or existing T-093 test reference. |
| BP1-03 | Repeated collect/cancel finalization | Prefer direct T-104 seam assertion. |
| BP1-04 | `expected_information_gain = none` without override | Prefer existing T-095 test reference unless replay naturally covers it. |
| BP1-05 | Portfolio role violation for next validation/workorder | Include if fixture setup is cheap; otherwise assign T-094/T-095 owner. |
| BP1-06 | Failed or inconclusive run disappearing without review/feedback path | Include in linked-loop replay if possible. |

### P2 - Residual Risk By Default
| ID | Risk | Default owner |
|---|---|---|
| BP2-01 | Local Postgres transaction/repository parity | Optional local DB lane; upgrade only if needed. |
| BP2-02 | UI stale state race | Future UI/browser task unless static proof finds drift. |
| BP2-03 | True cloud job partial failure | T-106 or future real external canary task. |
| BP2-04 | Live provider output instability | Future live provider execution task; T-105 remains preflight. |
| BP2-05 | Writing module ingestion mismatch | Future writing ingestion task. |

## Persistence Lanes
| Lane | Required For Default Closure | Purpose | Upgrade Trigger |
|---|---|---|---|
| In-memory replay | Yes | Stabilize flow semantics, fixture construction, blocked paths, and authority boundaries quickly. | None; this is the default lane. |
| Local Postgres / disposable schema | No by default | Verify Prisma repository parity, columnized queryability, idempotency constraints, transaction behavior, and recovery/read-model behavior in a real local product stack. | Becomes required if implementation finds a queryability, idempotency, unique-constraint, transaction, or read-model risk that cannot be closed by existing T-101/T-102/T-104 coverage plus in-memory replay. |

## Anti-Drift Rules
- Do not add helper-only state that looks like product authority.
- Do not copy experiment-foundation DTOs into PaperImplementation as new contracts.
- Do not use JSON-only payloads for any newly discovered gate/query requirement.
- Do not call provider or cloud services by default.
- Do not turn UI readiness into client-local state.
