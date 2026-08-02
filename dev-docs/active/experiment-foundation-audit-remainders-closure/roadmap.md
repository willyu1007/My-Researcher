# T-134 Experiment Foundation Audit Remainders Closure — Roadmap

## Planning context

- Runtime signal: Default mode; the roadmap records scope and sequencing only.
- Delivery state: `in-progress`; Phase 0 and Phase 1 complete, Phase 2-4 not started.
- Mapping: `M-001 > F-001 > R-012 > T-134`.
- Source baseline: T-132 audit findings EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21.
- Precedence decision: the 2026-07-30 user decision supersedes the earlier T-132 wording that required these findings to close inside T-132. T-134 now owns them independently and does not block T-132's personal PAI completion.
- Host artifact: none. The planning change does not modify code, schema, configuration, local data or cloud resources.

## Goal

Close the four Experiment Foundation audit remainders as typed, server-owned and independently verifiable backend trust boundaries:

1. EF-P14: require a bound PaperProject at bootstrap and handle legacy null bindings safely.
2. EF-P06: make primary candidate promotion/canonicalization atomic and server-derived.
3. EF-P15: attach standalone EF work to a Paper WorkOrder only through full revalidation.
4. EF-P21: add project-scoped semantic retrieval while structured lineage remains the fallback authority.

## Non-goals

- The T-132 PAI sequence-8 submit/terminal/collect/replay loop.
- Desktop UI, renderer work, navigation, forms or Electron/DOM acceptance.
- Generalized BYOC, multi-user/tenant support, installer/distribution or managed-cloud delivery.
- A second project truth, generic policy engine or model-authored trust decision.
- Replacing the existing structured lineage authority or allowing semantic rank to drive control, trust or head selection.
- Applying schema migrations or enabling product capabilities during planning.

## Workstream order

| Phase | Finding | Ordering rationale | Exit signal |
|---|---|---|---|
| 0 | Cross-cutting census | Freeze current writers, routes, schema and tests before implementation | Complete 2026-08-02: reviewed modification allowlist and exact verification matrix |
| 1 | EF-P14 | Current bootstrap could persist a null binding, making EF-P14 the nearest admission-safety gap | Complete 2026-08-02: unbound bootstrap is zero-write rejected; bound bootstrap is idempotent; legacy null rows are diagnostics-only |
| 2 | EF-P06 | Promotion is the primary server-owned preparation boundary | One atomic decision/canonical/candidate/outbox outcome with crash and replay convergence |
| 3 | EF-P15 | Current v2 output is already PI-bound and legacy is ineligible; source-model choice must precede coding | Approved typed exploration source attaches to a new PI-bound lineage; prior output stays untrusted |
| 4 | EF-P21 semantic half | Retrieval depends on stable project and lineage ownership | Project filter precedes rank; stale candidates drop; index outage falls back to structured lineage |
| 5 | Convergence | Prevent four local fixes from creating a second authority | Full writer census, relational negatives, context/docs and governance gates pass |

## Structure-change preview

Potential implementation areas, subject to a separate implementation authorization and Phase 0 census:

- `packages/shared/`: typed commands, responses and stable failure codes.
- `apps/backend/`: services, routes, repositories and project-scoped retrieval.
- `prisma/schema.prisma`: only if an invariant cannot be enforced with current storage; use `sync-db-schema-from-code`.
- `docs/context/`: regenerate API/DB context only when its SSOT changes.
- `dev-docs/active/experiment-foundation-audit-remainders-closure/`: decisions, evidence and handoff.

No `apps/desktop/` or `ui/` implementation path belongs to T-134.

Phase 0 narrowed the preview: EF-P14 needs no migration; EF-P06 and EF-P21 need additive owned persistence; EF-P15 schema scope is intentionally unresolved until its source-model decision. See `06-phase0-census-and-freeze.md`.

## Verification strategy

- L0/L1: typed schema and deterministic canonicalization tests.
- L2: service/repository transaction, idempotency, replay and bypass negatives.
- L3: forced disposable PostgreSQL constraints, crash boundaries and zero-partial-write assertions.
- L5/L6: real HTTP/API project-scope and permission isolation.
- Retrieval: deterministic ranking fixtures, stale-index rejection and structured fallback under index outage.
- Governance: context regeneration where applicable, docs lint, project sync/lint and `git diff --check`.

## Risk and rollback

- Capabilities remain default off until their workstream has relational acceptance.
- Rollback disables new admission/attachment/retrieval entrances without deleting typed history or reopening legacy writers.
- Persisted changes, if required, are additive and must have an explicit schema/migration review.
- A failed semantic index never weakens structured project filters or becomes a product blocker.

## Planning checklist

- [x] Goal and non-goals reflect the 2026-07-30 scope split.
- [x] Four audit remainders have one named owner task.
- [x] Workstream order prioritizes the current null-binding safety gap.
- [x] Desktop UI is excluded explicitly.
- [x] Verification and rollback boundaries are defined.
- [x] Phase 0 writer/route/schema/test census and implementation freeze are complete.
- [x] Phase 1 EF-P14 implementation and verification are complete.
- [ ] Review and authorize Phase 2 EF-P06 before adding typed promotion persistence or product routes.
