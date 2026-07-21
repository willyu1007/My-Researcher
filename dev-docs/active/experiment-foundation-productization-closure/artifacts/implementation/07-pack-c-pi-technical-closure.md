# Implementation Pack C C-PI technical closure skeleton

## Scope

- Slice: `T-132 Pack C C-PI step 6`
- Gate id scheme: `packc-pi-<YYYYMMDD>-r<N>`
- Acceptance registry: PC08-PC16, PC19-PI and PC20; PC17 is explicitly `deferred_to_cutover`
- PostgreSQL posture: digest-pinned disposable container only; an existing `DATABASE_URL` is not accepted
- Product/provider posture: no capability enable, named-local/non-local migration apply, provider request, external network request or scientific product write

## Check registry

| Check | Required evidence |
|---|---|
| PC08 | gateway unit + shared evidence/scientific schema suites: identity-only ingress and caller-authority negatives |
| PC09 | gateway unit + forced relational lane: inbox/REU/Trace/outbox atomicity, replay and tamper |
| PC10-PC13 | evaluator unit + closure unit + relational lane: deterministic membership, no-head, active-real and transactional drift fences |
| PC14 | closure unit + shared schema: caller assessment/exit authority is unrepresentable |
| PC15 | closure unit + relational lane: no-evidence control-only closure |
| PC16 | seal unit + relational lane + production-composition census for all four closure lookups |
| PC17 | static v2 negative space only: no v2 Packet writer and one `ValidationCycleClosed@v1` producer; legacy Packet/dossier removal remains C-cutover work |
| PC19-PI | Sidecar service closure tests + four-kind 5a guard census |
| PC20 | evaluator unit + zero-write service/repository census |

## Machine evidence contract

The summary always carries the exact registry, suite totals, both C-PI migration ids/source digests, the informational named-local status of `20260720141000`, disposable database state, all eight evidence keys, explicit zero/redaction censuses, blockers and `canonical_summary_sha256`. The hash is computed over canonical JSON with its own field set to `null`. PostgreSQL unavailability is exit 2 / `blocked`, never `passed`; PC17 can only be `deferred_to_cutover` after its static negative-space evidence passes.

## Sandbox checkpoint

- Run: `packc-pi-20260721-r1`
- Status: `blocked` (exit 2)
- Non-relational suites: 121/121 passed; 0 failed; 0 skipped
- Passed checks: PC08, PC14, PC19-PI, PC20
- Deferred check: PC17 (`deferred_to_cutover`; v2 negative-space evidence passed)
- Blocked checks: PC09-PC13, PC15, PC16
- Blocker: `DISPOSABLE_POSTGRES_UNAVAILABLE`
- Existing database used: no
- Canonical summary SHA-256: `sha256:cc169aeddc81d85df4378a2a0d823e288beca454f50d2dff0e70b22579c1bfd9`

## Host disposable-PostgreSQL gate result — 2026-07-21

Host run lineage: `r2` failed at provisioning — the disposable database prefix `packc-pi` violated the shared name validator (`^[a-z][a-z0-9_]{0,62}$`); fixed to `packc_pi`. `r3` ran the lane and surfaced one REAL product defect and one test-harness defect, both fixed: the closure outbox mirror wrote `revisionSequence = cycle_version_at_closure = 0`, violating the Pack A `pi_ei_outbox_sequence_attempt_check` (`> 0`) — the mirror now carries the 1-based closure ordinal (`cycle_version_at_closure + 1`); and the lane's admission id factory reset its sequence per service instantiation, colliding revision-2 cell ids in the drift scenario — the factory sequence is now monotonic per namespace. `r4` is the final clean run.

- Final gate id: `packc-pi-20260721-r4`
- Overall status: `passed` (exit 0)
- PC08-PC16, PC19-PI, PC20: all `passed`; PC17: `deferred_to_cutover` (v2-side negative space censused — no v2 packet writer, `ValidationCycleClosed@v1` sole closure event; legacy packet/dossier removal remains C-cutover work and is not claimed)
- Suite totals: 124/124, 0 failed, 0 skipped, 0 blocked (relational 3/3)
- Disposable identity: `packc_pi_49cc6642b3e2`, marker verified, digest-pinned pgvector image, cleanup succeeded
- Both Pack C-PI migrations applied to the disposable database; the CHECK-hardening migration `20260720141000` remains UNAPPLIED to named-local (informational; standard apply gate pending)
- Canonical summary SHA-256: `sha256:ad88de3da6ee6af9758db8c8b583e88faad6cc52205b210c1350d0e22ca4bddf`
- Durable evidence: `07-pack-c-pi-gate-summary-r4.json` (file SHA-256 `a2a5be7fe884d34dd125992086831ac89db1790b616390add8f2bc482cf93d16`); `.ai/.tmp` output remains ephemeral

This closes the C-PI slice (PC08-PC16, PC19-PI, PC20). It does not claim PC17/PC18 (C-cutover), scientific-kind closure, real-provider execution, product-Cycle-row synchronization, the pending env capability key, or any non-local rollout.

Required command from the repository root:

```sh
node .ai/scripts/experiment-foundation-packc-pi-gate.mjs --run-id packc-pi-20260721-r<N>
```

The host result must execute the relational lane with zero skips, verify `identity_marker_verified=true`, apply both C-PI migrations through full `prisma migrate deploy` history, clean up the container, and leave PC17 labeled `deferred_to_cutover`. Do not claim the legacy Packet/dossier cutover or C-PI closure from a sandbox `blocked` checkpoint.
