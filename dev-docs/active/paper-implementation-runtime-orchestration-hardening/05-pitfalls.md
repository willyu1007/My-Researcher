# 05 Pitfalls

## Do Not Repeat
- Do not let harness scripts become the owner of production semantics.
- Do not let Result Analysis, runtime admission or Domain Gate become the scientific-conclusion writer. Under D-17 they produce/admit one support proposal only; the existing ValidationCycle closure writes the authoritative disposition and selected exit.
- Do not require positive/negative/inconclusive/failed-run scenarios as four coequal conclusions. Counterfactual scenarios may support analysis, but execution failure is never a scientific disposition and only one exact-hash proposal enters closure.
- Do not directly materialize `ResultInterpretationPacket` from a Result Analysis final artifact. T-098 packet creation is downstream of the exact closed Cycle; the landed materializer is superseded migration debt, not a fallback.
- Do not add direct provider calls outside `AgentOrchestrator -> BackendLlmGateway`.
- Do not use `mocked_llm` or replay fixtures as product runtime decisions.
- Do not store prompt payloads, raw provider responses, hidden reasoning, secrets, or provider-private traces in DB tables.
- Do not hide runtime identity or admission blockers in JSON-only payloads if they must be queried.
- Do not allow cache, compression, or replay to bypass deterministic gates or authority services.
- Do not expand every node at once; prove the runtime pattern on a high-risk first slice.
- Do not equate `runtime_status=blocked` with admission rejection; typed semantic blockers must be admissible evidence for Domain Gate.
- Do not put URL-owned identity fields such as `implementation_project_id` or `runtime_artifact_id` in runtime admission request bodies.
- Do not rely on `additionalProperties: false` alone for forbidden body fields when Fastify/Ajv may remove additional properties before controller code sees them.
- Do not run provider canary through provider-only scripts or direct SDK calls; canary evidence must traverse the same controlled runtime run route/service/admission path as production.
- Do not reuse topic-selection business model profiles for PaperImplementation canaries; PaperImplementation slots need PaperImplementation-specific profile ids inside the unified registry.
- Do not let promoted PaperImplementation profiles inherit the shared default `codex_assisted -> product` eligibility; PaperImplementation product runtime profiles must bind an explicit provider-only product policy.
- Do not double-count provider calls by adding final artifact telemetry to role artifact telemetry. The final artifact should summarize role calls, not represent an additional model call.
- Do not require a minimal refs-only provider canary to reach semantic `passed`. Canary success proves live runtime/provider/admission execution; semantic pass requires a retrieval packet with sufficient reviewed statement and source content.
- Do not persist only artifact refs/hashes when a runtime consumer needs the semantic payload; role and final runtime artifacts must carry JSON-safe `artifact_payload`.
- Do not use synthetic retrieval, cache, token-budget, or compression hashes. Runtime provenance must come from the service that built the packet or gate result.
- Do not hardcode `topic_selection` in shared LLM execution context when PaperImplementation is the caller; `feature_id` must be caller-owned.
- Do not create an admission record on every retry when the runtime/admission identity is identical. Identity-based idempotency is part of the persistence contract.
- Do not leave optional ref properties as `undefined` inside JSON payloads. Normalize before schema validation and persistence.
- Do not import shared runtime primitives across mutually dependent contract files when a small common contract module avoids an ESM temporal-dead-zone risk.
- Do not put result interpretation or other semantic summary packets into harness `source_refs` to make runtime cooperation pass. Runtime final artifacts belong in `artifact_ref`; `source_refs` must remain input-snapshot-covered, evidence-safe refs.
- Do not let Domain Gate accept role artifacts or blocked final artifacts. Runtime/admission can preserve blocker evidence, but deterministic authority materialization requires an admitted final artifact with a valid `domain_gate_request`.
- Do not register new PaperImplementation runtime HTTP routes behind optional controller dependencies. Route registration and production service wiring must fail at construction/typecheck time, not at first request.
- Do not treat an unmigrated local DB as a runtime-code failure. L3 Prisma smoke should fail before runtime execution when required runtime/admission tables are missing.
- Do not let stress-runner summaries restate expected L5 behavior as static booleans. Closure evidence must be derived from the actual test output or persisted artifacts.
- Do not treat sequential Domain Gate replay as enough for production idempotency. Near-prod evidence needs at least one concurrent same-identity materialization check.
- Do not handwrite invalid runtime envelopes for Domain Gate negative tests. Use a real runtime artifact template when the test is meant to exercise Domain Gate status constraints rather than shared schema rejection.
- Do not turn technical retry into fallback. Same-profile retry must keep the execution mode, model option, prompt identity, role node identity, and prior admitted role lineage stable.
- Do not rerun already admitted prior roles when retrying the current role. Retry is local to the failed role invocation, not a debate-chain restart.
- Do not record unused retry metadata that is not persisted or asserted. If a retry field does not participate in runtime artifacts, admission, or tests, it becomes a semantic drift risk.
- Do not treat retry-exhausted provider/schema failure as semantic blocker evidence. It remains `failed_runtime`, rejected admission, and no final/domain artifact.
- Do not let live canary flags leak into deterministic stress runners. L5 closure must explicitly clear provider keys and every live/Prisma canary flag.
- Do not prove live fail-closed behavior with a provider-only script. The negative canary must traverse the same runtime HTTP routes, runtime services, orchestrator, gateway, and admission service as production.
- Do not treat operational telemetry as admission or Domain Gate authority. It is a backend-only derived view over runtime artifacts/admission records, not a source of blocker, retry, cache, or materialization truth.
- Do not count retry recovered/exhausted warnings from final artifacts. Final artifacts may summarize role warnings; retry telemetry must count role artifacts only.
- Do not infer no-fallback from executor kind. A deterministic preflight artifact in a provider-mode request can still carry `execution_mode=provider_llm`; no-fallback telemetry should compare runtime artifact execution modes, not executor labels.
- Do not promote a remaining node by copying P1 runtime shape without naming the node-specific semantic artifact and Domain Gate materializer. Each promoted slot needs its own role/final schema, route-owned profile identity, and deterministic materialization target.
- Do not rely only on provider-compatible role schemas for result-analysis completeness. Runtime semantic gates must still reject passed outputs that omit required scenario kinds or Domain Gate requests before any final artifact is recorded.
- The preceding required-scenario/Domain Gate rule is historical T-114 behavior. D-17 productization must replace it, not keep it as a second valid path; this documentation update does not claim the runtime has been migrated.

## Resolved Failures / Lessons
- Symptom: promoted PaperImplementation profiles could appear Codex-product eligible in the shared model-profile registry even though runtime routes/schema already enforced product-provider execution.
  Root cause: PaperImplementation profile definitions inherited `DEFAULT_RUN_MODE_ELIGIBILITY`, which intentionally keeps `codex_assisted -> product` available for topic-selection profiles.
  What was tried: runtime guards prevented behavior drift, but registry semantics still risked misleading future slot implementation.
  Fix: bind all promoted PaperImplementation runtime profiles to an explicit eligibility policy: `provider_llm` supports `acceptance` / `product`, while `mocked_llm` and `codex_assisted` support only `test` / `acceptance`.
  Prevention: every future PaperImplementation promoted profile must set domain-specific run-mode eligibility explicitly and include a registry test for product-mode execution.
- Symptom: the first admission service rejected every runtime artifact whose `runtime_status` was not `passed`, including `blocked`.
  Root cause: admission conflated technical runtime failure with admissible semantic blocker evidence.
  What was tried: initial service tests covered `failed_runtime` but not `blocked`.
  Fix: allow `blocked` artifacts with non-empty typed `blocker_codes`, reject empty blocker packets, and keep `failed_runtime` rejected.
  Prevention: every runtime/admission service slice needs separate tests for `passed`, `blocked`, and `failed_runtime`.
- Symptom: final admission with a missing expected final hash failed late through admission-record schema validation.
  Root cause: the service request type allowed `string | null` for final admission while the shared admission record required a final hash.
  What was tried: review surfaced the mismatch before Prisma or route wiring.
  Fix: make admission requests a role/final discriminated union and add runtime guards for untyped callers.
  Prevention: request types should encode admission-scope invariants before repository persistence.
- Symptom: the first HTTP negative test expected a body `runtime_artifact_id` override to fail, but Fastify accepted the request because the extra body field was stripped before controller execution.
  Root cause: `additionalProperties: false` did not produce the desired fail-closed behavior under the app's validation behavior.
  What was tried: a schema-level `not` rule rejected the request but produced an unhelpful generic validation message.
  Fix: define path-owned identity fields as boolean-false properties in the shared admission request schema.
  Prevention: for security/authority-sensitive forbidden request fields, add explicit schema tests and HTTP route tests instead of assuming unknown-field rejection semantics.
- Symptom: provider canary planning initially risked becoming a canary-only provider path.
  Root cause: a direct provider script is easier to write than a production-equivalent runtime route, but it would not prove runtime/admission behavior.
  What was tried: canary route design was compared against the topic-selection lesson that canaries must hit the same runtime slot.
  Fix: add a controlled `trace-integrity-boundary-debate/run` route backed by `PaperImplementationTraceIntegrityDebateRuntimeService`, and make the canary command execute the route integration test with live env gates.
  Prevention: future canaries must cite the runtime slot route/service they exercise before being accepted as production evidence.
- Symptom: the first live provider canary returned `failed_runtime` with `InvalidRequestError`.
  Root cause: OpenAI strict structured-output schema rejected `allOf` in the role output schema's functional-ref array item.
  What was tried: a minimal gateway call proved the model/profile worked; wrapping the gateway exposed the provider error text without printing prompts, raw provider output, or secrets.
  Fix: provider-compatible schema adaptation now flattens `allOf` and strips provider-incompatible `not` / `propertyNames` before provider execution, while preserving original schema validation after output returns.
  Prevention: orchestrator tests now assert provider schemas sent to the gateway do not contain those incompatible constructs.
- Symptom: after schema adaptation, the live canary returned semantic `blocked` even though provider execution completed.
  Root cause: the minimal canary request intentionally carries refs and hashes, but not reviewed statement text or source content.
  What was tried: sanitized runtime diagnostics showed four provider calls, all role/final artifacts admitted, and blocker codes for missing semantic content.
  Fix: canary assertion now requires non-`failed_runtime`, four provider role calls, no failed runtime artifacts, and admitted role/final artifacts instead of semantic `passed`.
  Prevention: future provider canaries must state whether they prove execution health or semantic paper-quality pass.
- Symptom: role runtime artifacts recorded `call_index` starting at `2`.
  Root cause: the runtime loop passed a one-based call index into `recordRoleArtifact`, then the record method added another `+1`.
  What was tried: local review scanned runtime identity fields after provider canary wiring.
  Fix: store the passed one-based `callIndex` directly and assert role artifacts record `1, 2, 3, 4`.
  Prevention: runtime service tests should assert identity fields, not only status and artifact counts.
- Symptom: trace-integrity debate artifacts could be admitted with refs/hashes but without runtime-consumable semantic payload.
  Root cause: the first runtime envelope treated artifact identity as enough and did not persist role/final `artifact_payload`.
  What was tried: route and service tests proved status/admission, but did not assert downstream-consumable payload shape.
  Fix: require `artifact_payload` in the shared runtime envelope schema and persist role/final payloads through the runtime service.
  Prevention: every promoted slot must have tests that inspect persisted runtime payload, not only result status and admission refs.
- Symptom: retrieval, cache, and token-budget provenance looked present but could be synthetic.
  Root cause: the runtime service initially filled provenance hashes locally instead of binding them to retrieval service and orchestrator outputs.
  What was tried: code-quality review compared runtime identity fields against the actual services that should own them.
  Fix: add deterministic retrieval packet construction, pass prompt cache provenance out of the orchestrator, and use real token-budget result hashes where available.
  Prevention: runtime identity fields should be traced back to their owner service in unit assertions.
- Symptom: PaperImplementation provider calls risked being recorded under the topic-selection feature namespace.
  Root cause: `TopicSelectionAgentOrchestratorService` hardcoded `executionContext.feature` as `topic_selection`.
  What was tried: trace debate service tests checked role execution payloads but not the provider execution context feature.
  Fix: add optional `feature_id` to orchestrator requests and pass `paper_implementation` from the trace debate runtime service.
  Prevention: shared runtime wrappers must default only for their native domain and let cross-domain callers pass feature identity explicitly.
- Symptom: duplicate runtime admission attempts could create parallel admission records for the same identity.
  Root cause: repository/service APIs had duplicate-id handling but no identity-hash lookup/idempotency path.
  What was tried: admission service tests covered duplicate record ids, not duplicate semantic identities.
  Fix: add repository lookup by `(implementationProjectId, admissionIdentityHash)`, return the existing record in the service, and add a Prisma unique index for the same identity.
  Prevention: every runtime/admission persistence slice should include replay/idempotency tests before product promotion.
- Symptom: final artifact payload validation failed when optional ref fields were present with `undefined`.
  Root cause: TypeScript object construction retained undefined optional properties that are invalid under JSON schema validation and Prisma JSON semantics.
  What was tried: schema and route tests exposed the mismatch after payload persistence was added.
  Fix: normalize artifact payloads through JSON serialization before envelope validation and persistence.
  Prevention: runtime payload builders should construct JSON-safe objects before schema validation, especially for optional provenance refs.
- Symptom: the first harness/runtime cooperation test was blocked by `memo_or_summary_source_ref_forbidden`.
  Root cause: the test put a result interpretation packet into harness `source_refs`, treating a semantic interpretation artifact like evidence input.
  What was tried: adding the ref to the input snapshot made the reference covered but did not change memo/evidence semantics.
  Fix: keep the admitted runtime final artifact in the proposal `artifact_ref` and keep `source_refs` on non-memo refs already covered by the input snapshot.
  Prevention: cooperation tests must distinguish artifact provenance refs from evidence-bearing source refs.
- Symptom: a negative cooperation test failed before reaching the direct-authority blocker.
  Root cause: it reused the same `proposal_artifact_id` in the in-memory harness repository, causing duplicate-id rejection.
  What was tried: the same runtime final artifact was intentionally reused to verify blocked direct mutation.
  Fix: reuse the runtime artifact ref but issue a new proposal artifact id for the second harness run.
  Prevention: replay/idempotency tests should reuse semantic identity only where the target repository/service is expected to be idempotent.
- Symptom: new P1 runtime routes could be registered by direct controller tests without P1 runtime or Domain Gate services.
  Root cause: the controller constructor initially kept the new dependencies optional to avoid updating older direct route tests.
  What was tried: route handlers failed closed with an internal configuration error if the service was missing.
  Fix: make P1 runtime and Domain Gate required controller dependencies and update direct route tests with explicit fixtures.
  Prevention: promoted runtime routes should require their service dependencies in controller construction just like production `buildApp()` wiring.
- Symptom: malformed and drifted Domain Gate request tests initially did not fail.
  Root cause: the P1 runtime test orchestrator ignored `mocked_role_outputs` and always returned a hardcoded role output, so the malformed final payload never reached Domain Gate.
  What was tried: the failing assertions showed no rejection even though the Domain Gate validation code was present.
  Fix: make the test orchestrator consume the runtime-provided mocked output and make the fake claim/dossier service construct domain objects from the request payload.
  Prevention: runtime tests must verify that fixture executors consume the same input channel as the production runtime service, especially when testing malformed provider/Codex outputs.
- Symptom: `paper-implementation:runtime-prisma-smoke` failed before executing the runtime route.
  Root cause: the configured local DB had not applied `20260603100000_add_paper_implementation_runtime_admission`, so the runtime/admission tables did not exist.
  What was tried: the smoke test first checked table readiness, then read-only `prisma migrate status` confirmed pending migrations without applying them.
  Fix: keep the smoke fail-fast and require an explicit migration step before using it as L3 pass evidence.
  Prevention: run migration status before L3 smoke in environments where DB state may lag repo Prisma SSOT.
- Symptom: L5 trace over-budget/adversarial tests failed because failed-runtime role artifacts still persisted the full retrieval packet, including long excerpts or prompt-contaminating text.
  Root cause: trace role payload construction treated failed-runtime outputs like successful semantic role outputs and embedded `runtimeBase.retrievalPacket`.
  What was tried: the L5 tests asserted zero provider calls and no leaked `api_key`/raw-log content; the zero-call behavior worked, but payload minimization failed.
  Fix: failed-runtime trace role artifacts now persist only retrieval packet ref/hash and an excerpt-free retrieval summary; successful semantic artifacts still retain the full packet for downstream role consumption.
  Prevention: runtime fail-closed tests must inspect persisted artifact payloads, not just provider call counts and final status.
- Symptom: the L5 runner summary could claim stress/compression/adversarial assertions were true even if a required subtest was removed, skipped, or renamed.
  Root cause: the runner wrote static assertion booleans after command success instead of deriving case coverage from TAP subtest names and statuses.
  What was tried: the runner still executed the right tests, but the machine-readable `90-summary.json` was weaker than the TAP logs.
  Fix: parse TAP output for each step, aggregate test totals, and require the six named L5 subtests to be observed as `passed`; missing, skipped, failed, or renamed required cases make the summary fail.
  Prevention: near-prod harness summaries should bind every claimed production property to either parsed test output or inspected persisted evidence.
- Symptom: L6 minimal concurrency could allow two Domain Gate materialization requests to race after both observed no existing claim/dossier.
  Root cause: Domain Gate was sequentially idempotent but did not turn same-payload create conflicts into replay after a concurrent create won.
  What was tried: previous unit tests called materialization twice sequentially and proved replay, but not create-race behavior.
  Fix: if claim/dossier creation returns `VERSION_CONFLICT`, Domain Gate re-reads the existing artifact, verifies the same materialization identity, and returns `already_materialized`; different-payload conflicts still fail with `VERSION_CONFLICT`.
  Prevention: every promoted Domain Gate materializer should include route-level same-identity replay and minimal concurrency evidence before L6 pass is accepted.
- Symptom: L6 could theoretically report `passed` while route/provider/Prisma/idempotency evidence was absent or incomplete.
  Root cause: the runner originally derived status from preflight and TAP results, then treated the route evidence JSON as optional summary decoration with static no-dual-track defaults.
  What was tried: review compared the L6 status code path against the machine-readable evidence claims and checked the package script's behavior when `.env.local` is missing.
  Fix: the runner now validates the route evidence file whenever `02-near-prod-route-gate` passes, removes static no-dual-track/redaction fallbacks, loads `.env.local` inside the runner, and records missing env as a `blocked` summary.
  Prevention: near-prod gate summaries must make claimed production properties required evidence, not static summary fields; command wrappers must not bypass the runner's own blocked/failed summary semantics.
- Symptom: the first HTTP Domain Gate failed-runtime negative fixture returned `400` before reaching the expected `409` status gate.
  Root cause: the manually constructed failed final artifact was not a valid P1 final runtime envelope, so shared runtime schema validation failed before Domain Gate could check `runtime_status`.
  What was tried: a hand-written minimal final artifact was inserted into the in-memory runtime repository.
  Fix: derive the failed-runtime fixture from a real blocked final artifact produced by the route, then change only status/failure fields needed for the negative case.
  Prevention: when a test targets a downstream gate, fixture construction must keep upstream schemas valid or it will mask the behavior under test.
- Symptom: provider/schema runtime negatives were fail-closed but had no bounded retry proof.
  Root cause: the first fail-closed slice asserted no fallback and no final/domain artifact, but accepted one-call provider failure as sufficient.
  What was tried: extending route and L5 negatives with provider timeout and schema-invalid output exposed the need for same-profile retry semantics without changing the service entrypoint.
  Fix: add one same-profile technical retry in Trace/P1 runtime services, record only the final role attempt with cumulative provider calls and `retry_attempt_index=1`, and keep retry exhaustion as rejected `failed_runtime`.
  Prevention: first-slice runtime retry tests must cover recovery, exhaustion, same-profile identity, no non-provider fallback, no prior-role rerun, and rejected-admission replay idempotency.
- Symptom: live provider success canaries proved the real gateway path, but live provider failure was still represented only by deterministic fake gateways.
  Root cause: the existing live canaries were positive-path opt-in tests, while L5 fail-closed tests used scripted gateways.
  What was tried: a new opt-in flag temporarily overrides the selected provider key with an invalid value and runs the same runtime routes through `BackendLlmGateway`.
  Fix: add `T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE`, the `paper-implementation:provider-fail-closed-canary` script, and route assertions for trace, claim, and dossier fail-closed behavior under canonical live provider errors.
  Prevention: deterministic stress runners now clear the live fail-closed canary flag, while production-readiness reviews can run the opt-in negative canary explicitly.
- Symptom: result-analysis promotion initially risked looking like a P1 copy because it used the same generic runtime/admission envelope and Domain Gate service.
  Root cause: the generic envelope is intentionally shared, but the semantic artifact and materialization target are node-specific.
  What was tried: service and route wiring were compared against P1 to find whether a second entrypoint or wrapper was being introduced.
  Fix: add result-analysis-specific role/final schemas, profile/prompt ids, runtime service, route path, and Domain Gate branch that materializes only a `result_interpretation_packet`.
  Prevention: every remaining-node promotion should explicitly name the semantic artifact type, final Domain Gate request schema, and deterministic service method it uses before route wiring is accepted.
- Symptom: result-analysis HTTP Domain Gate coverage first failed with `404` after adding materialization assertions.
  Root cause: the route test created runtime artifacts but did not seed the active project, validation cycle, trusted run evidence unit, and trace manifest required by the deterministic `createResultInterpretationPacket` service.
  What was tried: the result-analysis final artifact and admission path were valid, but Domain Gate correctly refused to create domain authority without the surrounding domain context.
  Fix: route and near-prod gate fixtures now seed the same domain prerequisites that the production Domain Gate requires, then materialize through the existing HTTP route.
  Prevention: when a promoted runtime final artifact materializes a domain object, tests must seed the real deterministic domain prerequisites instead of assuming runtime admission alone is enough.
- Symptom: result-analysis passed role output could be schema-compatible while still semantically incomplete.
  Root cause: role schemas are intentionally provider-friendly and can accept a nonempty scenario array, but production semantics require all four result-analysis scenario kinds before a final artifact is safe to admit.
  What was tried: final artifact schema was tightened, but a malformed role output still needed to fail before final artifact creation rather than later at Domain Gate.
  Fix: `PaperImplementationResultAnalysisRuntimeService` checks passed role output for `domain_gate_request` and all required scenario kinds, treats missing pieces as retryable runtime failures, and fails closed after same-profile retry exhaustion.
  Prevention: every provider-friendly role schema that has stronger domain semantics needs a runtime semantic gate plus L5 fail-closed coverage.
- Symptom: experiment-design WorkOrder draft candidates could be admitted with a generic JSON object that was not directly consumable by the deterministic WorkOrder draft validator.
  Root cause: `work_order_draft_request` was typed as a generic runtime payload while fixtures used only minimal ids, so the runtime evidence shape could drift from the downstream WorkOrder contract.
  What was tried: route/service tests proved the P2 runtime path worked, but the shared schema did not force complete `run_policy`, `experiment_bridge`, trace, dataset, baseline, code, and config refs.
  Fix: bind `work_order_draft_request` to `CreateResearchWorkOrderDraftRequest`, update fixtures to complete contract-shaped requests, and add a negative schema test for malformed minimal requests.
  Prevention: promoted runtime artifacts that represent a downstream deterministic request must import and validate against that downstream request schema, not a generic payload object.
- Symptom: experiment-critique runtime evidence named `semantic_skeptic` even though the actual orchestrator call used the single-agent execution path.
  Root cause: critique semantics were encoded in `executor_kind` instead of staying in role slot/profile/prompt identity.
  What was tried: review compared runtime artifacts against the actual `TopicSelectionAgentOrchestratorService` invocation.
  Fix: align critique runtime profile/artifact `executor_kind` to `single_agent`; preserve independent critique semantics in slot id, model profile, prompt template, and output schema.
  Prevention: executor-kind fields must describe the actual execution mechanism. Role semantics belong in role/profile/prompt ids so runtime evidence cannot imply a non-existent executor.
- Symptom: OpenAI live L6 rejected result-analysis before any semantic output could be validated.
  Root cause: provider-compatible schema conversion stripped `allOf` wrappers but preserved conditional keywords from merged branches, so OpenAI strict structured output saw unsupported `if`/`then` schema constructs.
  What was tried: Prisma artifacts showed `InvalidRequestError` on result-analysis with no raw provider output persisted.
  Fix: strip conditional schema keywords from the provider-compatible schema only; keep the original internal schema for AJV validation and runtime semantic gates.
  Prevention: provider-compatible schema transformations must be tested with conditionals, not only `allOf` and `not`.
- Symptom: live experiment critique blocked with opaque-reference-only findings even after design passed.
  Root cause: L6 P2 payloads provided refs/hashes but no reviewable experiment-plan content for the independent critic.
  What was tried: the first stricter L6 P2 status gate correctly failed instead of accepting a blocked critique response.
  Fix: add explicit `source_context_packets` to experiment-planning runtime requests and bind them into source identity, prompt material, and token-budget context.
  Prevention: live provider gates that require semantic pass status need reviewable context packets, not only authority refs and hashes.
- Symptom: live L6 failed when trace-integrity recovered through bounded provider retries and returned more than the baseline provider call count.
  Root cause: L6 provider evidence asserted exact call counts even though production runtime permits one same-profile technical retry.
  What was tried: Prisma artifacts showed passed role/final artifacts with bounded provider call counts and no fallback artifacts.
  Fix: L6 route assertions and runner validation now require bounded ranges instead of exact counts.
  Prevention: near-prod evidence should assert live-call lower bounds and retry upper bounds when bounded retry is part of the production runtime contract.
- Symptom: runtime services could be called directly with `run_mode=product` and `execution_mode=mocked_llm` or `codex_assisted`, bypassing the intended product/provider boundary even though HTTP/provider tests did not use that path.
  Root cause: the product-mode invariant existed in docs and canary behavior but was not encoded in every promoted service and shared request/artifact schema.
  What was tried: deep cleanup scanned for dual-track and fixture fallback surfaces after L6/provider/Prisma gates passed.
  Fix: all promoted runtime services now reject product fixture modes and provider-mode fixture payloads before orchestrator calls; shared runtime artifact and run request schemas encode `product -> provider_llm`.
  Prevention: future promoted slots must add service-level and schema-level negative tests for product fixture modes, not only route-level provider canaries.
