# Implementation Pack A/Pack B deep-cleanup closure

## Outcome

The authorized 2026-07-14 through 2026-07-15 Pack A/Pack B architecture review, defect remediation and deep cleanup are complete inside the bounded storage/control-plane scope. T-132 remains `in-progress`: scientific validation/evidence, D-18 closure, UI/search, real provider/cloud execution and product rollout are not part of this closure.

Final source-backed D-19 run `d19-deep-cleanup-final-20260715-r19` passed source policy plus A01-A04/B01-B10 with `blockers=[]`, standalone real-PostgreSQL relational tests 6/6 with 0 skipped, marker reset and cleanup. Final Pack B run `packb-deep-cleanup-final-20260715-r16` passed PB01-PB16 with shared 6/6, backend 89/89, Pack B relational 7/7 and embedded Pack A relational 6/6, both with 0 skipped, plus marker reset and cleanup. Final named-local read-only gate and app smoke remain `packb-deep-cleanup-final-local-20260714-r18`; the checked-in 62/62 v5/v4 evidence was strictly republished from those exact source artifacts.

Current named-local admission, cutover and simulation flags are all `false`. Product E1-E5, real provider/fetch/cloud execution, scientific result/validation/evidence, D-18 closure, non-local DB apply, UI/search and traffic cutover were not performed.

## Findings and final disposition

| Area | Finding | Final disposition |
|---|---|---|
| T2 readiness | readiness could drift between service precheck and commit | the same commit transaction performs one batched `FOR SHARE` fence over exact attestation, ordered dependencies, 23 lifecycle projections and Dataset location before any T2 write |
| typed identity | family key could be conflated with `logical_id` | each typed family has an independent immutable key and both adapters fail closed on relational/draft mismatch |
| duplicate storage | typed identities and VersionLock carried write-only placeholders | migration `20260714190000_remove_experiment_foundation_v2_placeholders` removed 12 columns and five indexes; relational exact dependencies plus server hashes remain authority |
| event authority | full envelope JSON duplicated structural columns | four integration tables now store payload-only JSON; repositories reconstruct typed envelopes from structural columns and verify both payload and full-envelope hashes |
| relational mutation | same-domain immutable FKs did not all express identical update/delete policy | all 38 Pack A foreign keys are `ON DELETE RESTRICT ON UPDATE RESTRICT`; cross-domain FK and cascade counts remain zero |
| version discriminators | fixed-v1 columns relied only on application writers | nine DB CHECK constraints and matching repository read fences reject unsupported values |
| numeric persistence | JavaScript integer schemas exceeded PostgreSQL `Int` | shared contracts and routes enforce `-2147483648..2147483647` before Prisma; stricter positive fields retain their lower bounds |
| internal numeric persistence | server-owned counters could still increment past PostgreSQL `Int` | revision/lifecycle/projection/state/head/relay/lease/attempt increments use one Int32 fence and reject the maximum value before partial mutation or dispatch |
| persisted redacted manifest | unknown JSON could be trusted through repository typing | replay, prerequisite resolution and worker dispatch parse the exact closed v1 manifest; nested tamper fails before write/transport |
| acknowledgement integrity | processed status plus partial scope did not prove the exact receipt | PI/EF inbox and final EF acknowledgement reconstruct event/outcome integrity and compare exact consumer/type/status/reason/Run/branch/revision/sequence/hashes |
| authority read integrity | valid-looking or self-consistently rehashed stored JSON could bypass write-time assumptions | every PI/EF/Pack B authority read validates a closed typed snapshot, code-owned schema/hash profile, canonical hash, relational mirrors, ordered bindings and enum allowlists before it returns a domain object; RunManifestFrozen TaskSpec bindings and later-head replay are included |
| public error stability | repository integrity failures on replay/read paths could escape as infrastructure errors | all PI admission/head, EF materialization/ack and execution service entrypoints map repository constraints to stable top-level codes plus `details.reason_code` |
| source-policy parser drift | the Node gate and TypeScript importer could interpret the same attestation differently | one portable ESM parser/digester is the semantic authority; the backend adapter only supplies types, reviewed digest and slot lookup |
| source-policy constants | reviewed digest or fixture slot order could still be copied or mutated by a consumer | one portable reviewed-digest constant and frozen ordered slots serve the gate and backend adapter |
| provider-command binding | a command could validate its own snapshot without proving the authoritative Attempt payload identity or cancel semantics | every read/claim/heartbeat/release/outcome/collection path compares exact Attempt payload id/hash and terminal reason; drift fails before write or transport |
| profile authority | stored event/command/provider-control profile strings could be cast into trusted discriminators | explicit frozen profile allowlists reject unknown or substituted historical values |
| evidence shape | a summary or publisher could accept required values while ignoring extra/missing zero/redaction fields | gate import and durable publication require exact keysets, including every zero-census and redaction key |
| E1/readiness scale | repeated per-cell and graph work could grow with cardinality | batched replay reads/writes, grouped latest-Attempt resolution, O(N) in-memory selection and transaction-local readiness cache are gated with a 48-cell relational case |
| evidence isolation | runners could inherit host input or drift in PostgreSQL image | explicit child environment allowlists, digest-pinned image and nonce databases are mandatory |
| duplicate gate infrastructure | D-19 and Pack B separately maintained disposable PostgreSQL lifecycle/identity/evidence code | both gates import `.ai/scripts/lib/disposable-postgres.mjs` and the generic `.ai/scripts/lib/experiment-v2-evidence.mjs`; one identity validator/marker assertion serves both reset paths, the Pack-B-specific helper is deleted, gate meta passes 70/70 and backend database identity/guard passes 10/10 with 0 skipped |
| timeout cleanup | killing only the direct child could leak descendants | POSIX commands own a detached process group; timeout kills the group and a live-grandchild test proves cleanup |
| dead shared surface | zero-consumer row schemas implied unsupported public validation boundaries | removed exactly 14 zero-consumer row schemas plus newly dead helpers; retained interfaces, request/event/error schemas and directly consumed IO schemas |
| API persistence bounds | runtime enforced PostgreSQL integer limits but OpenAPI did not own the same census | exactly 22 T-132 persisted fields use `int32` plus maximum, both seed fields include the signed minimum, and a drift test plus regenerated API index fix the population |
| 210000 upgrade precondition | required envelope columns assume empty event tables | read-only preflight reuses Pack A authority counts, names all four tables, blocks any nonzero census and treats partial hardening as failure; zero never grants apply authority |
| hash matching | SHA-256 regex copies could diverge between contracts, services and gates | one shared experiment-v2 limit constant is the production authority |
| current configuration | historical enabled probes could be mistaken for current eligibility | admission, cutover and simulation are all observed `false`; enabled composition remains an isolated guard probe only |

## Final additive schema correction

Earlier migrations remain immutable. The final migration is:

- migration: `20260714210000_normalize_experiment_v2_event_payloads`;
- SHA-256: `37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`;
- event storage: four PI/EF inbox/outbox tables retain payload JSON only and add the structural fields needed for exact typed reconstruction;
- integrity: payload hash and canonical full-envelope hash are separately persisted and verified;
- relations: 38 Pack A same-domain FKs are double-`RESTRICT`;
- version fences: nine fixed-v1 DB CHECK constraints plus repository read fences;
- exclusions: no legacy semantic ALTER, backfill, cross-domain FK, generic family, cascade, persisted eligibility/status or non-local apply.

The migration was applied only to the reviewed named-local `my_researcher_dev`; the target is 62/62 migrations up to date.

## Disposable D-19 evidence

- Run: `d19-deep-cleanup-final-20260715-r19`.
- Status/blockers: `passed` / `[]`.
- Acceptance: source policy and A01-A04/B01-B10 all passed.
- Source-policy digest: `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`.
- Final authority: one admitted revision, two exact cells/TaskSpecs, one VersionLock, one RunRecipe, one Run/manifest, one PI head and one EF acknowledgement; excluded writes are zero.
- Event outcomes: exactly three (`WorkOrderRevisionAdmitted@v1`, `RunManifestFrozen@v1`, `BranchHeadAdvanced@v1`), each with `payload_only_storage=true`, `payload_hash_verified=true`, `envelope_hash_verified=true` and `delivered=true`.
- Storage census: four payload-only event tables, eight added structural columns, 38 hardened Pack A FKs, nine fixed-version CHECK constraints and zero cascade operations.
- Relational integrity: 6/6 passed, 0 skipped, including typed readiness drift rollback, self-hashed RunManifestFrozen binding drift rejection and PI exact branch/revision/admission bindings.
- Disposable integrity: marker verified before and after reset, container cleanup true and summary SHA-256 `9961eec956d216c65d1ac24be57214c05680dd7c1ae6d8ea510c8dbcef73a647`.

Run r13 used an obsolete attestation path and correctly returned overall `blocked` while A01-A04/B01-B10 and container cleanup passed. It is a fail-closed invocation negative, not a product failure; r19 with the canonical path, portable reviewed digest and frozen slots is current closure evidence.

## Disposable Pack B evidence

- Run: `packb-deep-cleanup-final-20260715-r16`.
- Status/blockers: `passed` / `[]`.
- Acceptance: PB01-PB16 all passed; shared targeted 6/6, backend targeted 89/89, forced real-PostgreSQL Pack B relational 7/7 with zero skipped, embedded Pack A relational 6/6 with zero skipped, marker reset and script typecheck passed.
- Isolation: exactly six Pack B families; real provider request, `CreateJob`, fetch, legacy write and scientific write counts are zero.
- Scientific boundary: Run/RunCells remain `scientific_execution_status=not_started`; no evidence eligibility is created.
- Disposable integrity: container cleanup true and summary SHA-256 `207450f7104b24542574f883ea2e851425e11412c03f21e65413444d3c2bfd6d`.

These are disposable fake-provider/control-plane results, not evidence of product E1-E5 or real-provider correctness.

## Named local-development evidence

The verified PostgreSQL 17 recovery point is:

- path: `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-quality-remediation-20260714-r1/my_researcher_dev.pre-cleanup.dump`;
- exact size: `8399040887` bytes;
- SHA-256: `0692d19e6e4ec2ea54389e229eae443b1c5f360e286a8203f9b4b979a4b00ecf`;
- format: PostgreSQL 17 custom format; PostgreSQL 17 `pg_restore --list` passed.

Final named-local read-only gate and app-composition run `packb-deep-cleanup-final-local-20260714-r18` passed with 40/40 approved v2 tables exact, unchanged legacy digest, all current flags false, all 238 application tables unchanged and prohibited effects zero. They established:

- migration history: 62/62;
- Pack A authority: 208 rows, digest `sha256:494cdf5a02e2379a66a12bc82411e8237f39e949a2f992f3e12a0e220f613d74` before and after;
- Pack B: six tables, zero rows;
- legacy sentinels: 257 rows, digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`;
- application-table smoke: 238 before/after, changed-table count zero, external fetch zero and provider-command row delta zero;
- configuration: admission=false, cutover=false, simulation=false.

Durable evidence:

- `artifacts/db/pack-b-local-development-20260714/05-app-composition-smoke.json`, schema `experiment-foundation-packb-local-app-smoke@v5`, source artifact SHA-256 `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9`, strict-republished checked-in SHA-256 `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e`;
- `artifacts/db/pack-b-local-development-20260714/06-final-gate-summary.json`, schema `experiment-foundation-packb-local-landing-summary@v4`, source artifact SHA-256 `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c`, strict-republished checked-in SHA-256 `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`, publisher producer SHA-256 `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`;
- operational detail: `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

## Verification handoff

- D-19 r19: source policy and A01-A04/B01-B10 passed; standalone real-PostgreSQL relational tests passed 6/6 with zero skipped; three event outcomes have all four integrity/delivery flags true, marker reset/cleanup passed and exact acknowledgement/inbox/RunManifestFrozen binding drift fails closed. r13 is an obsolete-path fail-closed negative only.
- Pack B r16: PB01-PB16 passed; shared 6/6, backend 89/89, Pack B relational 7/7 and embedded Pack A relational 6/6, all with zero skipped; prohibited effects are zero, marker reset/cleanup passed and persisted Attempt/command/manifest tamper is rejected before write or transport.
- Read integrity: typed/canonical/hash/mirror/order/allowlist validation covers every authority-returning repository path; explicit frozen profiles, exact ProviderCommand-to-Attempt payload id/hash and cancel-reason parity cover read/claim/heartbeat/release/outcome/collection; T2 repeats the full readiness proof under its PostgreSQL guard and services preserve stable public error reasons.
- Disposable/evidence helpers: gate meta 70/70, backend database identity/guard 10/10 with skip=0 and shared full 330/330 passed; one validator owns both marker-reset paths and exact evidence keysets protect gate import/publication.
- Contract/API cleanup: 14 zero-consumer row schemas/dead helpers removed with owned schemas preserved; public and internal PostgreSQL Int counters are fenced; 22 persisted OpenAPI integers own the int32 census; hash regex centralized; API index regenerated.
- Named-local r18: 40/40 tables exact, legacy 257-row digest unchanged, flags false, 238/238 table parity and prohibited effects zero. Durable v5/v4 artifacts are exact publications of the r18 source evidence and carry publisher provenance.
- `.ai/.tmp` summaries are ephemeral and are deleted after publication; this canonical closure plus checked-in artifacts are durable. Backend full suite completed with 2,083 tests: 2,034 passed, 0 failed, 49 conditional database/provider-canary skips, 0 todo, duration `396225.938458ms`. Those repository-wide conditional skips are not Pack A/Pack B database evidence; database acceptance comes from the forced disposable-PostgreSQL D-19 6/6 and Pack B 7/7 lanes, each with 0 skipped.

## Remaining authorized boundary

The next product operation is not another cleanup. A formal PaperProject/active ValidationCycle must enter Pack A and drain admission-to-ack before a separate named-local Pack B E1-E5 authorization. Real read-only cloud preflight, provider execution, scientific result/validation/evidence, D-18 closure, UI/search, non-local apply and product traffic cutover remain independent gates.
