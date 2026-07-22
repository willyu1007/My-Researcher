# 09 Pack C quality remediation plan — 2026-07-22

## Status

- State: `authorized` (user approved 2026-07-22 after the joint quality review).
- Inputs: independent Codex (gpt-5.6-sol) review of `254e79b8..HEAD` plus Claude seam re-checks; all eight findings verified against source before this plan. Findings archive: `../pack-c-preplanning-20260718/10-quality-review-findings.md`.
- Posture: every Pack C capability remains default-off and the new writers are not reachable through the composed app today (finding R1), so production behavior is unchanged while remediation lands. The no-evidence closure live path stays gate-anchored throughout.

## Ordered remediation increments

| Inc | Findings | Scope |
|---|---|---|
| QR-1 | R1 (Blocker) | Wire the three Pack C events end to end: extend the shared integration-event union/codecs, spine outbox mappers and relay consumer routing (`EvidenceCandidateQualified` → Evidence Trust Gateway consume; `RunEvidenceUnitRegistered` / `ValidationCycleClosed` → durable projection-feed inbox receipts pending their Phase 5/scientific consumers — delivered, never terminalized, no domain writes). Compose the EF scientific-validation service/repository and PI gateway/repository in `app.ts`; expose the pure-read readiness-evaluation endpoint so `expected_closure_input_hash` is obtainable; buildApp-level tests. |
| QR-2 | R5, R6 (High) | Gateway transactional authority: require current admitted revision, exact head Run/manifest match and closure absence inside the commit transaction; first delivery against superseded/closed scope records a terminal rejected inbox with zero evidence. Deterministic closure identity: derive closure/event/outbox ids from stable semantic inputs; keep randomness/timestamps out of authority hashes; test the production default factory. |
| QR-3 | R4, R3 (High) | Replay-first ordering in all four sealed services (exact replay resolution precedes the closure fence; redelivery after closure converges to stored outcomes). Transactional closure fencing: writers CAS/lock the Cycle authority and verify closure absence inside their write transactions; closure CAS covers the same authority; two-client concurrency tests closure-vs-every-writer and closure-vs-gateway. |
| QR-4 | R7 (High) | Delete the legacy REU write capability from the workorder repository (port + Prisma + in-memory); switch dossier claim-support REU resolution to a v2 evidence read port (exact closure/current scope); historical legacy REU refs are explicitly rejected with a stable reason rather than silently resolved. |
| QR-5 | R8 (Medium) | Gate hardening: census actual Prisma model mutations and legacy read ports; verify seal position transactionally (not constructor-property presence); test production id defaults; add relay/delayed-delivery/post-closure-ingestion lanes; remove the unrelated reconcile migration from the packc-ef required-evidence registry. Rerun `packc-final` fresh. |

R2 (evidence-bearing cycles unclosable) is deliberately NOT fixed here: it is the scientific-closure increment's entry condition, recorded as a Pack C addendum in `09-pack-c-implementation-readiness-review.md`. Remediation closes when `packc-final` passes with the hardened gates and the backend full suite is green.

## QR-2 completion — 2026-07-22

- State: implementation complete; unit/type verification green, real-PostgreSQL lane compiled but skipped because the disposable Pack C-PI database identity was not available.
- R5: the Prisma and in-memory evidence repositories now re-read current revision, exact head revision/Run/manifest, and v2 closure absence inside the evidence commit transaction after replay resolution. Superseded-revision, head-advanced, and post-closure first deliveries persist one terminal `EVIDENCE_CANDIDATE_NOT_ELIGIBLE` inbox receipt and no REU, trace manifest, or registered outbox; exact redelivery returns the stored rejected receipt.
- R6: closure, `ValidationCycleClosed@v1` event, and closure outbox IDs are hash-namespaced deterministic derivations. The closure identity covers validation cycle, expected cycle version, closure input hash, closure kind, accepted proposal identity/hash (including nulls), and idempotency key. The closure service no longer has an ID factory or random UUID path.
- Coverage: in-memory tests change live authority after the service pre-read and before commit; relational coverage contains the same three rejection lanes and uses the production closure-ID derivation with no injected IDs. A production-default unit test reconstructs the same closure twice and proves identical closure ID, closure snapshot hash, event ID, and outbox ID.
- Verification: backend TypeScript and QR-2 targeted tests pass (37 total: 34 pass, 3 opt-in relational skips). After the shared host environment recovered, the final current-tree backend suite passed 2,358 tests: 2,301 pass, 0 fail, 57 conditional skips, duration `429955.191417ms`. The earlier 14-failure environment run remains historical diagnostic evidence only. See `report.md` for the detailed inventory and remaining relational risk.
