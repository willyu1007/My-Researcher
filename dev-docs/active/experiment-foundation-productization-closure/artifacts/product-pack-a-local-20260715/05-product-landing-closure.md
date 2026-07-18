# Formal PI scope → Pack A product landing closure

## Outcome

The formal named-local PaperImplementation scope reached the Pack A terminal state on 2026-07-15. The operation started from a real active PaperProject and used normal PI product routes through an admitted ValidationCycle, then drained the v2 PI→EF→PI chain to the sole durable EF acknowledgement.

This is a Pack A control-plane product landing. It is not Pack B execution, provider execution, scientific validation/evidence, ValidationCycle closure, UI/search delivery, or a non-local rollout.

## Reviewed target and source

| Item | Exact value |
|---|---|
| Database | `127.0.0.1:5432/postgres?schema=my_researcher_dev` |
| Target fingerprint | `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0` |
| PaperProject | `P313` (`active`) |
| Active bridge | `paper_project_bridge_d956e811-7042-4f26-9f28-afba3d5258fa` |
| Bridge payload hash | `289694536b10e426a15355577ac40117ead4b5805257a54c318ec7011485ee3a` |
| ImplementationProject | `implementation_project_642a1879-1137-40f5-b340-330b66509975` |
| ValidationCycle | `validation_cycle_t132_packa_product_p313_v1` (`admitted`) |

The PI prefix was created through the normal bootstrap, CoreMotive draft/admission, trace, evidence-board/binding and ValidationCycle draft/admission routes. The complete trace uses actual upstream evidence ref `evidence_unit_480c7962-a1fa-4207-b42a-673ae560c7a9`; no synthetic lineage or direct repository bootstrap was accepted.

## Exact Pack A authority

| Authority | Final state |
|---|---|
| WorkOrder revision | `pi_experiment_revision_v2_fed4f563-4717-4bb3-89d6-1295a1b751db` |
| Revision hash | `sha256:a5be97e94ecc9e1b817b42016473f169834ac18ec6c53e24ecce8305b019e81b` |
| Ordered cells | `retriever-top-k-5`, `retriever-top-k-10` |
| Admission | `pi_experiment_admission_v2_94d06378-f6d2-401b-8c39-8edb3f3080ff` |
| VersionLock | `ef_version_lock_v2_910b1e41-ed4d-42ab-b455-b20faa9fe8c9` with 23 dependencies |
| RunRecipe | `ef_run_recipe_v2_99542326-db54-4fb1-88fe-757a9da5f074` |
| TrainingTaskSpecs | 2, one per admitted cell |
| Run | `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca` with 2 RunCells |
| Run manifest hash | `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915` |
| PI branch head | exact Run above |
| Final acknowledgement | `ef_integration_inbox_v2_366831a8-fe25-4361-a701-e83a85004ce8`, count 1 |
| Integration rows | PI inbox/outbox 1/2; EF inbox/outbox 2/1 |

All three events were delivered and the committed saga is fully drained. There is no Attempt, provider payload/command, Collection, provisional output, scientific result/evidence or Cycle closure associated with this landing.

## Configuration terminal state

| Key | Value |
|---|---:|
| `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED` | `true` |
| `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` | `false` |
| `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED` | `false` |

The explicit admission-on window was compiled only for T1. After T4, admission was compiled off while the one-way v2 cutover remained committed. These values are in the gitignored named-local override and compiled `.env.local`; source defaults remain fail-closed.

## Safety fences

- Legacy five-table census remained 257 rows with aggregate digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d` before/after.
- The selected scientific four-table sentinel remained 4 rows with aggregate digest `sha256:45b14c69cb36a4b43f7096b4523fe030c27c12e71bde706f2d140292ecbe88b2` before/after.
- All six Pack B tables remained empty.
- No external fetch, provider request, `CreateJob`, scientific evidence generation, D-18 closure, legacy fallback or non-local database operation occurred.
- One early incomplete trace remains immutable audit history. Its repair queue item was resolved through the formal route as superseded by the complete trace; final open repair count is zero.

## Durable evidence

| Artifact | Purpose | SHA-256 |
|---|---|---|
| [`00-prereq-check.md`](00-prereq-check.md) | named-local env doctor and target preflight | recorded in file |
| [`01-admission-window-config.md`](01-admission-window-config.md) | explicit admission-on compile | recorded in file |
| [`02-product-landing-apply.json`](02-product-landing-apply.json) | product mutation and T1-T4 drain, run `formal-pi-scope-packa-product-20260715-r1` | `ffc579842c2d4a3a55d61d31e6a5aa70657e32ea32acaf103711e76540873355` |
| [`03-post-landing-config.md`](03-post-landing-config.md) | admission-off/cutover-on terminal compile | recorded in file |
| [`04-product-landing-verify.json`](04-product-landing-verify.json) | read-only final verifier, run `formal-pi-scope-packa-product-20260715-verify-r5` | `341eba9ae1e38ce282947d9d9554102f04ff5c93fa7cb5564a7152b0c245ee48` |

The producer `apps/backend/scripts/run-experiment-foundation-packa-product-landing.ts` has SHA-256 `be16d2066e84fa79709c13a57c323829178e75dcb2742528cb4a87f6d1e09e6d`.

## Regression gates

- Pack A product script TypeScript gate: passed.
- Backend typecheck: passed after Prisma client generation.
- Targeted cutover/import/spine tests: 48 passed, 0 failed, 0 skipped.
- Prisma schema validate against the named-local environment contract: passed.
- T-132 strict docs lint: 53/53 passed.
- T-124 strict docs lint: 12/12 passed.
- Project governance lint and `git diff --check`: passed.
- The final product verifier also parses persisted PI board and trace JSON through closed runtime validators; no Prisma-JSON-to-domain double assertion remains in the producer.

## Next gate

The next product slice is a separately authorized named-local Pack B E1-E5 run against the exact acknowledged Run above. It must keep Pack A admission closed, use the deterministic no-network simulation transport, preserve legacy/scientific digests, and leave Run/RunCell scientific state `not_started`. Real provider/cloud, D-16/D-17/D-18 scientific closure, UI/search and every non-local rollout remain independent gates.
