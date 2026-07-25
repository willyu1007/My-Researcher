# T-132 M6 workflow usage-fit rubric (agent/API surface, per D-24)

Date: 2026-07-24

Instrument authority: roadmap Phase 6 "human usage-fit rubric confirms preparation cost, decision clarity and traceability", reworded by D-24 to the agent/API interaction surface. Form precedent: T-124 L7 usage-fit (AI-assessed, human-override provision, scored record archived).

## Dimensions and anchors

Scores 1-5 per dimension; a release-gate pass requires every dimension ≥ 4 with no unresolved override.

| Dimension | Question | 5 anchor | 3 anchor | 1 anchor |
|---|---|---|---|---|
| D1 preparation cost | How much work stands between "I hold one implementation-project id" and "I hold a submittable, exact closure request"? | A fixed short chain of typed GETs ends in a verbatim-submittable prepared request; zero manually assembled identities/hashes/JSON | Some intermediate identities must be copied between calls, but no hash/JSON assembly | Caller must assemble hashes/refs or consult raw tables |
| D2 decision clarity | At each workflow state, does the surface say exactly what is legal next and why not otherwise? | available-actions enumerates precisely the legal actions with gating/confirmation scopes; blockers carry stable codes with owning resources | Legal actions discoverable but require inference from several reads | Next steps only knowable from source code or trial requests |
| D3 traceability | Can every fact in the closure preparation be traced back to its authoritative source through the read surface alone? | Every ref/hash in the prepared request and lineage tree resolves via the read endpoints down to protocol/revision/run/attempt identities without leaving the API | Most refs resolve; occasional detour into diagnostics or raw JSON | Trace requires database access |

## Method

One assessment run over the live named-local product chain (P313 → `validation_cycle_t132_packa_product_p313_v1`), read-only, service-level, zero writes:

1. list project cycles → 2. cycle experiment lineage → 3. branch revision history → 4. available-actions → 5. closure preparation; then reverse-trace the prepared request's scope refs back through steps 2-3 facts.

The runner records: call count, every identity the caller had to supply (must be path ids only), every identity/hash the caller received but never had to re-type, blockers/actions inventory, and the reverse-trace resolution table. Assessment is AI-scored with rationale; the human owner may override any score (override + reason recorded here; an unresolved override below 4 fails the release gate).

## Assessment record — t132-m6-usage-fit@v1 (2026-07-25)

Runner: `apps/backend/scripts/run-m6-usage-fit-assessment.ts` over the live named-local P313 chain (`implementation_project_642a1879…`), read-only service-level, zero writes. Evidence: `15-m6-usage-fit-evidence-v1.json`.

| Dimension | Score | Evidence |
|---|---|---|
| D1 preparation cost | **5** | Exactly 5 typed GET calls from one supplied project id to a verbatim-submittable no-evidence closure request (`prepared_request_present=true`); `manually_assembled_identities=[]`; every intermediate identity (cycle, branch, revision, run) was received from a previous response |
| D2 decision clarity | **5** | available-actions enumerated exactly the legal set for the state (`admit_work_order_revision`, `close_validation_cycle` — no start/cancel entries because both Attempts are terminal), with capability gating and confirmation scopes attached; preparation readiness (`ready`, `control_flow_validated_no_paper_evidence`) is consistent with the closure action's presence (asserted, not assumed) |
| D3 traceability | **5** | Reverse trace fully resolved (5/5): the prepared request's cycle resolves through the lineage list; the branch's current-revision hash resolves to the `is_current_admitted` history entry; the head Run resolves to the `is_head_run_source` revision; Attempt terminality and readiness↔actions consistency verified — all through the read API alone |

AI-assessed (Claude, this session) per the method above; human override provision open — any owner override recorded here supersedes the AI score, and an unresolved override below 4 fails the release gate.

Verdict: **usage-fit passed** (all dimensions ≥ 4).
