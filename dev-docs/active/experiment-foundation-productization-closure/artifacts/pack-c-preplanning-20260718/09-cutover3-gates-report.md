# T-132 Pack C C-cutover increment 3 implementation report

Date: 2026-07-22  
Status: implementation complete; host PostgreSQL convergence pending

## Outcome

The final C-cutover increment adds a no-database PC17/PC18 gate and a three-child Pack C convergence gate. The standalone cutover gate passes locally. The final gate correctly returns `blocked` when the C-EF/C-PI disposable PostgreSQL lanes cannot start, while preserving child SHAs, per-PC statuses and the independently non-green backend full-suite result.

No product source, Prisma schema/migration, env contract, capability value, existing database or provider was changed.

## Files changed

Gate code and meta-tests:

- `.ai/scripts/experiment-foundation-packc-cutover-gate.mjs`
- `.ai/scripts/experiment-foundation-packc-cutover-gate.unit.test.mjs`
- `.ai/scripts/experiment-foundation-packc-final-gate.mjs`
- `.ai/scripts/experiment-foundation-packc-final-gate.unit.test.mjs`
- `.ai/scripts/experiment-foundation-packc-ef-gate.mjs`
- `.ai/scripts/experiment-foundation-packc-ef-gate.unit.test.mjs`

The existing EF gate/meta change only advances its frozen closed-kind census from three to the already-landed four-kind set by adding `paper_experiment_sidecar`; the first final attempt exposed the stale expectation.

Closure and handoff documents:

- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/02-architecture.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `dev-docs/active/experiment-foundation-productization-closure/05-pitfalls.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/08-pack-c-cutover-technical-closure.md`
- this report

## PC17 evidence mapping

| Evidence | Proof |
|---|---|
| Packet/dossier/runtime unit group | Direct packet service and runtime Domain Gate both reject with `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`; dossier readiness accepts only explicit closed-Cycle snapshot refs and rejects open/tampered/foreign closures. |
| Shared contract group | Closed snapshot refs are required by new dossier writes; historical packet/read shapes remain readable. |
| Static census | Exactly two packet-closure entrances, zero service-to-packet-repository calls, one `ValidationCycleClosed@v1` event producer, zero `PROJECT_ACCOUNTABLE_RUN_STATUSES`, `assertProjectRunEvidenceAccounting` or supersession-heuristic markers, and exact closed-snapshot consumption. |

## PC18 evidence mapping

| Evidence | Proof |
|---|---|
| Bridge/live-adapter unit group | Monitor/live terminal paths mint zero legacy REU/Trace; explicit legacy ids fail before side effects; no fallback artifact is produced. |
| Closure/seal unit group | Legacy completion fails below HTTP; product Cycle synchronization and four required Cycle-seal consumers retain their behavior. |
| Shared contract group | `cycle_assessment` and `decision_exit` occur only in stored/read interface/schema shapes; all write DTO/schema windows contain zero occurrences. |
| Route integration group | The stable legacy route returns closure semantics and the rewritten route population remains green. |
| Static census | REU construction is limited to the v2 gateway/service repository lane; legacy `/complete` route/controller remain one stable rejected entrance with zero success writes; all 70 sealed-service constructor sites provide `cycleClosureLookup`; `NEVER_CLOSED`, optional lookup, dual-read and fallback markers are zero. |

## Final-gate composition semantics

- `packc-final-<date>-r<N>` derives `packc-ef-<date>-r<N>`, `packc-pi-<date>-r<N>` and `packc-cutover-<date>-r<N>` and executes them as child processes under the hermetic environment policy.
- Each child summary identity, exit code and canonical SHA are verified before its check statuses are trusted.
- PC01-PC07 map to C-EF; PC08-PC16 and PC20 map to C-PI; PC17/PC18 map to cutover; PC19 requires both `PC19-EF` and `PC19-PI`.
- The final summary embeds all three child SHAs and exact backend totals. It exits 0 only when all children and the backend full suite pass.
- Valid child summaries preserve each owned PC status even when another check blocks the child overall. Any blocked child prevents final pass. When relational children are blocked, final status remains `blocked` even if the separately recorded backend suite is also non-green; the backend failure remains an explicit blocker/evidence record.

## Verification totals

| Population | Result |
|---|---|
| New cutover + final meta-tests | 13/13 passed, zero failed/skipped |
| EF regression meta plus both new meta files after the four-kind correction | 19/19 passed, zero failed/skipped |
| Direct packet/dossier/runtime group | 30/30 passed, zero failed/skipped |
| Direct bridge/live-adapter group | 29/29 passed, zero failed/skipped |
| Direct closure/seal group | 55/55 passed, zero failed/skipped |
| Direct shared contracts group | 11/11 passed, zero failed/skipped |
| Direct route integration group | 6/6 passed, zero failed/skipped |
| Standalone cutover `packc-cutover-20260722-r1` | passed; 131/131; PC17/PC18 passed; SHA `sha256:2a1c6eebe062e6ddeb0b96602bb7d705f07b87768d7360588d6cb96d3fd3ac8d` |
| Final `packc-final-20260722-r3` | exit 2 / blocked; 11 PC passed, 9 relational PC blocked; final SHA `sha256:da3d482995fad2d4dbdbde3bebb3c0718cf878be03dd484724c141c480f18fde` |
| Backend full suite inside final r3 | 2,340 total; 2,269 passed; 14 failed; 57 skipped; output SHA `sha256:46622b213754d4669f61896633069814598aafbd7c3f767661a50e42b3b9f77e` |

## Host run commands

```sh
node .ai/scripts/experiment-foundation-packc-cutover-gate.mjs --run-id packc-cutover-20260722-r4
node .ai/scripts/experiment-foundation-packc-final-gate.mjs --run-id packc-final-20260722-r5
```

The final command is the closure authority because it creates and verifies its own fresh cutover child. Publish the final summary and its three child summaries only after status is `passed`, every required relational suite has zero skips, disposable markers/cleanup are verified, and the backend full suite has zero failures.

## Risks and follow-up

- The host run cannot pass unless Docker can run the reviewed digest-pinned image and both relational suites execute without skips.
- The backend full suite is independently non-green in the current environment: eight established PostgreSQL-dependent tests cannot reach `127.0.0.1:5432`, and six established literature environment/network cases fail. Once the two Pack C children pass, any remaining backend failure will make the final gate `failed`.
- The 70-site constructor census is intentionally frozen. Adding/removing a sealed-service construction site requires an explicit gate/meta update after verifying the dependency remains required.
- Reusing a final run id overwrites ephemeral `.ai/.tmp` evidence. Host closure must use a fresh date/revision.
- Scientific-kind closure, post-closure Packet materialization, M7 real-provider execution, named-local `20260720141000` apply and Aliyun live acceptance remain outside this increment.
