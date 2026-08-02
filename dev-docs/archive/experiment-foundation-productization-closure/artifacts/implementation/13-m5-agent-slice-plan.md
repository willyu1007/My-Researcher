# T-132 M5-A agent-first workflow slice — plan

Date: 2026-07-24

Scope authority: D-24 (03-implementation-notes). Kept Phase 5 scope only: project-scoped lineage read model, typed action surface, workflow automation, typed gate actions. No UI, no semantic projection, no new scientific authority.

## Pre-implementation census verdict (2026-07-24)

Full inventory in the session record; the five load-bearing findings:

1. The only assembled lineage read model is the cycle-readiness evaluator (pull-only GET, cycle-scoped, admitted-heads-only). No project-scoped cycle→branch→revision→run tree exists.
2. Revision history (`parentRevisionId` chain, superseded revisions) is persisted but has no read surface at all.
3. Terminal sync/reconcile/collect automation ALREADY exists in both provider worker chains (submit→sync/reconcile→collect auto-enqueued; caller never issues them). This M5 step is closed by census, not new work.
4. The projection-feed consumer is a deliberate zero-write placeholder ("for future Phase-5 consumers") already wired to the relay for REU-registration and Cycle-closure events.
5. Human gates run through single-use `HumanConfirmationRecord` refs threaded into admit/complete/resolve routes; no enumerable typed action surface exists for an agent.

Existing v2 routes already hard-reject caller-authored authority fields (12/19/7-field rejection lists) — the no-manual-hash bar is the established pattern to extend, not new invention.

## Decisions (OD-M5-1..4, frozen with D-24 delegation; revisitable before gate closure)

- **OD-M5-1 read model shape**: three new project-scoped GET families, all server-scoped by `implementation_project_id`, read-only, deterministic ordering, no hash/ref request fields:
  - `GET /paper-implementation/projects/:implementation_project_id/experiment-lineage/validation-cycles` — cycles with workflow summary (status, closure state, branch/run/attempt counts, readiness headline);
  - `GET /paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-lineage` — branches → current admitted revision (id/hash/sequence server-reported), effective head Run + ordered cells + attempt/collection summaries + per-branch blockers (reusing the readiness evaluator's repository components; head semantics identical to D-18);
  - `GET /paper-implementation/projects/:implementation_project_id/workorder-branches/:branch_id/revision-history` — full revision chain (parent links, admission metadata, per-revision Run refs), non-head history explicitly labeled; exact lineage only, never a second head authority.
- **OD-M5-2 workflow projection — REVISED 2026-07-24 after A1: deferred, no persisted projection in M5-A.** A1's live project-scoped queries compute every summary the projection would have cached, cycle counts are small, and the D-24 "automation is event-replayable/idempotent" exit criterion is already carried by the provider worker chains (event-driven, replay-tested), the pull readiness evaluator (OD-M5-3) and the derived A3 endpoints. A persisted `PaperImplementationCycleWorkflowProjectionV2` table would add a migration + apply approval for no current need; the projection-feed consumer stays receipt-only (its exact-redelivery convergence is already gate-proven). Revisit only if cycle cardinality makes live summaries measurably expensive.
- **OD-M5-3 readiness/closure preparation**: Cycle-ready detection stays pull-derived from the existing evaluator (no persisted "ready" state); new `GET .../validation-cycles/:validation_cycle_id/closure/v2/preparation` returns the server-derived closure request skeleton (closure kind, exact scope refs, readiness blockers) that the unchanged closure POST accepts — zero new closure authority; scientific Result Analysis invocation remains M7-L2-gated, only the no-evidence/control-only preparation is served today.
- **OD-M5-4 action enumeration**: `GET .../validation-cycles/:validation_cycle_id/available-actions` derives (never persists) the currently legal typed actions (admission/closure/cancel/reconcile/queue-resolve) with target route + required human-confirmation scope; explicitly not a DecisionWorkQueue replacement — existing queues stay authoritative for their items.

## Slices

| Slice | Content | Verification |
|---|---|---|
| M5-A1 | shared contracts + repository queries + services + routes for the three read families — **DONE 2026-07-24 (`fda572ed`)** | unit + route tests; multi-project isolation relational test on real disposable PostgreSQL; zero-write assertion on all reads |
| ~~M5-A2~~ | ~~workflow projection table~~ — dropped by the OD-M5-2 revision; no schema change in M5-A | — |
| M5-A3 | closure preparation GET + available-actions GET (+ closure body cycle-id made optional-compat) | route tests incl. caller-authority rejection on any new POST-adjacent surface |
| M5-A4 | `experiment-foundation-m5-agent-gate.mjs` + convergence run | measured censuses per QR-1 standard: route inventory (no hash/ref request fields), isolation, zero-write read census, replay/automation tests wired into registry |

Exit = D-24 Phase 5 exit gate: typed API primary flow with zero manual id/hash beyond business keys and path ids; API-level project isolation; automation event-replayable and idempotent; zero new schema.

## Completion record (2026-07-24)

M5-A closed the same day it was planned. All slices Codex `gpt-5.6-sol` implementation + Claude review with host-decided verification:

- **A1** (`fda572ed`): three project-scoped read families; host verification included the disposable-PostgreSQL isolation test under the full nonce/marker identity protocol, which caught one fixture defect the sandbox could not (serverActorId mismatch).
- **A2**: dropped by the OD-M5-2 revision — zero new schema landed in M5-A.
- **A3** (`82a9f1e0`): closure preparation GET (no-evidence skeleton verbatim-acceptable by the unchanged closure POST; scientific path explicitly labeled M7-L2-gated), available-actions derived enumeration (capability_gated + human-confirmation scopes; reconcile only from submitted/running), closure POST body cycle-id optional-compat.
- **A4**: `experiment-foundation-m5-agent-gate.mjs` at the QR-1 measured standard — exact-count typed-request census over route sources, both relational lanes executed inside the gate's disposable container (d19 + packc_pi identities), mutation-call zero scan, automation-replay test registry, D-24 negative space (no embedding/semantic import, migration directory count pinned at 69, desktop untouched), transcript-free durable summary with redaction self-check.

Convergence: `t132-m5-agent-20260724-v1` **passed** (M5-01..M5-08 all passed; summary SHA-256 `0c840205c866747cca8e2124a0b79118a79c8be7394e8ffb60e5a91313496d51`; durable copy `13-m5-agent-gate-summary-v1.json`). Gate unit tests 17/17. Host full suites after the slice: shared 396/396; backend 2,407 tests / 2,346 pass / 0 fail / 61 conditional-skip.

M5 (as rescoped by D-24) is complete. The deferred UI journey and semantic projection remain outside T-132 per D-24; M6 workflow usage-fit consumes these endpoints as the agent/API interaction surface.
