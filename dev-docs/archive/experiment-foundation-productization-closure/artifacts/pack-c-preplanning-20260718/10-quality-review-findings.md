## 1. Blocker — Pack C events are written into an outbox pipeline that cannot decode or deliver them

Files: [app.ts](../../../../../apps/backend/src/app.ts#L470), [experiment-v2-integration-relay-service.ts](../../../../../apps/backend/src/services/experiment-v2-integration-relay-service.ts#L222), [paper-implementation-experiment-v2-contracts.ts](../../../../../packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts#L332), [prisma-experiment-foundation-spine-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts#L334), [prisma-paper-implementation-experiment-spine-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts#L469)

The scientific service, evidence gateway, and closure repository insert `EvidenceCandidateQualified`, `RunEvidenceUnitRegistered`, and `ValidationCycleClosed@v1` into the existing EF/PI integration outbox tables. However:

- The shared integration-event union/schema still recognizes only `WorkOrderRevisionAdmitted`, `RunManifestFrozen`, and `BranchHeadAdvanced`.
- The relay only has consumers for those three event types.
- EF and PI claimers deserialize every pending row through the old union. Their mapping failures are caught and the rows are immediately marked `terminal` with `INTEGRATION_EVENT_PAYLOAD_CONFLICT`.
- `app.ts` does not construct the scientific-validation repository/service or evidence repository/gateway, and does not register a readiness endpoint or Pack C event consumers.

Thus, if the new writers are invoked directly, their outbox rows are terminalized rather than delivered. In normal app composition, the scientific and gateway paths are unreachable in the first place. `ValidationCycleClosed` has no consumer anywhere, leaving the post-closure packet path permanently closed.

The HTTP closure route also requires `expected_closure_input_hash`, but production routing exposes no readiness-evaluation operation from which a caller can obtain it ([paper-implementation-experiment-v2-routes.ts](../../../../../apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts#L124)).

Fix direction: extend the shared event union, stored-event codecs, spine outbox mappers, relay consumer ports, and delivery routing for all three Pack C events. Compose the scientific service and trust gateway in `app.ts`, expose the pure-read readiness preview, and add an actual `ValidationCycleClosed` consumer/post-closure path. Test the real `buildApp` scheduler, not just direct service calls.

## 2. Blocker — Any cycle containing qualified evidence is permanently unclosable

File: [paper-implementation-validation-cycle-closure-v2-service.ts](../../../../../apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts#L49)

`scientific_evidence_assessed` is rejected as “not implemented” at lines 53–57. The same service rejects control-only closure whenever any eligible REU exists at lines 133–137.

Consequently, once the trust gateway creates a valid REU, neither advertised closure kind can close that cycle. This leaves the D-18 authority transition incomplete even though the shared contract and database constraints advertise scientific closure.

Fix direction: implement proposal resolution, proposal-hash verification, disposition correction, and server-derived exit selection inside the same Serializable closure transaction. The closure row, product Cycle transition, and one `ValidationCycleClosed` outbox event must remain atomic.

## 3. High — The D-18 cycle-version CAS and closed-cycle seal are not transactional

Files: [prisma-paper-implementation-cycle-readiness-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.ts#L44), [prisma-paper-implementation-validation-cycle-closure-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.ts#L118), [prisma-paper-implementation-experiment-spine-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts#L112), [prisma-experiment-foundation-spine-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts#L126), [prisma-experiment-foundation-execution-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.ts#L180)

`expected_cycle_version` is always the constant initial value `0`; there is no mutable Cycle version. The product Cycle update CASes only `cycleStatus` and `completedAt`.

Admission, head advance, EF materialization, and simulation start call `isCycleClosed` in their services, but none rechecks that condition inside the transaction that performs the writes. A valid interleaving is therefore:

1. Writer observes “not closed” and builds its mutation.
2. Closure transaction evaluates and commits the closure.
3. Writer transaction starts or continues and commits after closure.

This can create a post-closure revision, head, Run, Attempt, command, or outbox row. Simulation attempts are especially clear: readiness only counts active `real_provider` attempts, while simulation creates `non_production_fake_provider` attempts, so the two transactions need not contend on the same readiness predicate.

Fix direction: introduce a real, incrementing Cycle authority version or equivalent fence. In each mutation repository transaction, lock/CAS the Cycle authority and verify closure absence before any insert/update. The closure transaction must lock/CAS the same authority using both version and rebuilt `closure_input_hash`.

## 4. High — Closed-cycle checks break idempotent replay and relay redelivery

Files: [paper-implementation-experiment-v2-admission-service.ts](../../../../../apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts#L161), [paper-implementation-experiment-v2-head-service.ts](../../../../../apps/backend/src/services/paper-implementation-experiment-v2-head-service.ts#L194), [experiment-foundation-v2-materialization-service.ts](../../../../../apps/backend/src/services/experiment-foundation-v2-materialization-service.ts#L309), [experiment-foundation-execution-v2-service.ts](../../../../../apps/backend/src/services/experiment-foundation-execution-v2-service.ts#L115), [experiment-v2-integration-relay-service.ts](../../../../../apps/backend/src/services/experiment-v2-integration-relay-service.ts#L86)

All four services check closure before looking for an already-committed replay.

If a consumer commit succeeds but marking the producer outbox delivered fails, and the cycle closes before redelivery, the exact redelivery now throws `CYCLE_ALREADY_CLOSED`. The relay treats every such `AppError` as terminal and terminalizes the source outbox, even though the consumer state already exists. HTTP admission and execution retries similarly stop converging to their stored results after closure.

Fix direction: resolve and validate exact read-only replays first. Only a genuinely new mutation should enter a transaction that atomically checks the closure fence and writes. Add tests for “consumer committed → delivery marker failed → cycle closed → exact redelivery.”

## 5. High — The Evidence Trust Gateway accepts superseded and already-closed PI scope

File: [prisma-paper-implementation-evidence-v2-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.ts#L190)

`loadAuthority` at lines 257–283 verifies only that the referenced revision once had an admission. It does not require:

- `branch.currentRevisionId/currentRevisionSequence` to equal the event revision;
- `branch.headRevisionId/headRunId/headRunManifestHash` to equal the candidate event’s Run;
- the validation cycle to remain unclosed.

The commit transaction repeats this same weak check, then writes the inbox, REU, trace manifest, and outbox at lines 218–247.

A delayed `EvidenceCandidateQualified` event can therefore mint evidence for a superseded revision, or mint a REU after the cycle has already committed a `control_flow_validated_no_paper_evidence` closure. The immutable closure then says there was no eligible evidence while the same cycle contains a later REU.

Fix direction: make current revision, exact head Run, and closure absence members of the gateway’s transactional authority check. A first delivery after closure or head advance should record a terminal rejected inbox and create zero evidence. Closure should also fence pending qualified-candidate delivery or otherwise account for it before control-only closure.

## 6. High — Closure authority IDs and hashes are nondeterministic

File: [paper-implementation-validation-cycle-closure-v2-service.ts](../../../../../apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts#L42)

The default ID factory uses `randomUUID()`. It supplies the closure ID at line 159, event ID at line 186, and outbox ID at line 216. More importantly, `closure_id` is included in `closureWithoutHash`, so `closure_snapshot_hash` changes on every pre-commit retry of the same semantic request.

This violates the deterministic authority/hash invariant. A serialization abort followed by a retry constructs a different closure identity and snapshot hash even though the input watermark and idempotency key are identical.

Fix direction: derive the closure ID from stable semantic inputs such as cycle ID, expected cycle version, closure-input hash, closure kind, accepted proposal identity/hash, disposition, and idempotency key. Derive event/outbox IDs from that committed closure identity. Keep timestamps and randomness outside authority hashes.

## 7. High — Legacy REU write/read authority remains active, and v2 REUs are invisible to claims

Files: [prisma-paper-implementation-workorder-repository.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-workorder-repository.ts#L249), [paper-implementation-result-claim-dossier-service.ts](../../../../../apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts#L587), [paper-implementation-workorder-experiment-bridge-service.ts](../../../../../apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts#L324)

The monitor service now passes `run_evidence_unit: null`, but the legacy repository port and Prisma implementation still accept a non-null legacy REU and execute `paperImplementationRunEvidenceUnit.create()`.

More immediately, claim support still resolves every `run_evidence_unit` reference through the legacy work-order repository/table. A newly created `PaperImplementationRunEvidenceUnitV2` therefore fails claim-support resolution, while a historical legacy REU continues to be accepted. The bridge also retains legacy list/get APIs.

This is an operational dual-read and leaves a second REU writer capability outside the trust gateway.

Fix direction: remove the legacy REU member from monitor persistence and delete/fail the legacy Prisma mutation itself. Replace dossier claim resolution with a v2 evidence read port bound to exact closure/current scope. Migrate or explicitly reject historical legacy references rather than silently retaining both authorities.

## 8. Medium — Pack C gates can pass while all of the above regressions remain

Files: [experiment-foundation-packc-pi-gate.mjs](../../../../../.ai/scripts/experiment-foundation-packc-pi-gate.mjs#L207), [experiment-foundation-packc-cutover-gate.mjs](../../../../../.ai/scripts/experiment-foundation-packc-cutover-gate.mjs#L245), [prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts](../../../../../apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts#L242), [experiment-foundation-packc-ef-gate.mjs](../../../../../.ai/scripts/experiment-foundation-packc-ef-gate.mjs#L42)

The gates check that constructors contain a `cycleClosureLookup` property, but not that the check occurs inside the write transaction. The relational seal test closes first and invokes each writer afterward; it does not race closure against a writer.

The cutover REU census searches only for selected object-literal constructor patterns, so it misses both the legacy Prisma `create()` and the dossier’s legacy point lookup. The relational closure helper injects deterministic IDs, hiding the nondeterministic production default. There are no real relay tests for any new Pack C event, delayed candidate delivery, post-close gateway ingestion, or exact redelivery after closure.

The EF gate also declares the unrelated `20260719120000_reconcile_index_names_and_topic_research_record` migration as required Pack C evidence, coupling this slice’s result to an explicitly unrelated work stream.

Fix direction: add two-client concurrency tests for closure versus every sealed writer and the evidence gateway; run all three Pack C event types through the actual Prisma claimers and app relay; test default ID generation; statically census actual Prisma model mutations and legacy read ports. Remove the unrelated migration from the Pack C-specific evidence registry.

Core EF validation logic otherwise correctly rejects simulation/fake provenance and atomically pairs a `passed` report with exactly one Candidate/outbox. `git diff --check` passed. I did not run the Pack C gates because they write evidence artifacts and provision disposable Docker databases, which is incompatible with this read-only review.
