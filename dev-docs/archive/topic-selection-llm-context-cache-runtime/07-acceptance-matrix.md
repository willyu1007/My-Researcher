# 07 Acceptance Matrix

## Contract Tests
| Case | Expected Result |
|---|---|
| Unknown context family | schema rejects |
| Cache key missing policy/schema/profile fields | schema rejects |
| Cache key missing context identity/preprocessing scope marker | schema rejects |
| Context cache hit envelope missing artifact ref, artifact hash, cache key hash, source refs hash, freshness status, or provenance ref | schema rejects |
| Context cache result outside `hit`, `miss`, `blocked_stale`, `blocked_drift`, `bypassed`, `not_applicable` | schema rejects |
| Context cache index stores business payload or provider response payload | schema rejects |
| Context-family drift | cache miss or block |
| Source ref/hash drift | cache miss or block |
| Prompt template drift | response reuse rejected |
| Prompt packet key missing `prompt_variant_key` for multi-role/stage slot | schema rejects |
| Prompt packet hash omits context refs/hashes, dynamic material refs/hashes, output contract, profile/model params, runtime modifiers, or redaction policy | schema rejects |
| Prompt packet identity omits compression report ref/hash or compressed context hash fields | schema rejects |
| Persisted prompt payload is not redacted/ref-backed | schema rejects |
| Persisted prompt artifact contains hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content | schema rejects |
| Dynamic prompt material lacks schema, artifact ref, hash, source refs, producer slot, or provenance | schema rejects |
| Dynamic prompt material attempts to override executable template, output contract, authority boundary, or provider-required-live policy | schema rejects or quality gate blocks |
| `PromptQualityReport` missing decision, blocker/warning codes, prompt hash, variant key, context hashes, dynamic material refs, output contract, redaction policy, or provenance | schema rejects |
| Runtime audit envelope missing workflow/node/slot/attempt identity, execution mode, profile/schema/policy/template hashes, context/cache/prompt/token/reuse/gate outcomes, or blocker/warning codes | schema rejects |
| Provider telemetry appears in audit envelope without live provider call | schema rejects |
| Audit projection missing source envelope ref/hash | schema rejects |
| Audit projection rewrites execution mode, live-provider status, reuse status, blocker/warning codes, or authority-boundary outcome | schema rejects |
| Human-facing audit projection includes raw cache keys, prompt payload details, raw provider telemetry, hidden reasoning, raw provider logs, credentials, secrets, or unredacted private content | schema rejects |
| Model option/profile drift | response reuse rejected |
| `provider_llm` response reuse attempt | blocked or treated as miss |
| `codex_assisted` response reuse missing approval ref or local approval setting | schema rejects |
| `codex_assisted` or `mocked_llm` reused response missing `non_provider=true` | schema rejects |
| Mocked response reuse missing fixture id/version or replay hash | schema rejects |
| Response reuse index stores business authority payload or provider telemetry as payload | schema rejects |
| Response reuse provenance missing source workflow/node/attempt, prompt/context/profile/schema/policy versions, or response hash | schema rejects |
| Compression report missing source refs or hashes | schema rejects |
| Compression report with forbidden raw provider/hidden reasoning fields | schema rejects |
| Compression report missing executor kind, strategy version, before/after token estimate, or quality gate result | schema rejects |
| Token-budget gate missing decision | schema rejects |
| Token-budget profile missing output budget, safety margin, or unknown-estimate behavior | schema rejects |
| `ContextPolicyProfile` missing source, memory, compression, cache, token-budget, reuse, or provenance policy | schema rejects |
| Cache/reuse key missing `invocation_slot_id` | schema rejects |
| Runtime implementation attempts to wire a slot that is inventory-only and not implementation-ready | registry or readiness lint rejects |
| v1a N6 first-slice profile missing registered id/version/hash | registry lint rejects |
| v1a N6 first-slice profile omits prompt variant, token budget, compression, cache, reuse, audit, or test obligations | readiness lint rejects |
| Memory policy allows durable memory as standalone evidence | schema rejects |
| Profile registry contains slot/profile mismatch | schema or registry lint rejects |
| Profile registry contains unsupported functional template or execution modifier | schema rejects |
| Stage adapter attempts to define independent cache/reuse/token-budget provenance semantics | contract or registry lint rejects |

## Backend Unit Tests
| Area | Case | Expected Result |
|---|---|---|
| Profile registry | unknown profile id or version | blocks before context compilation/provider invocation |
| Profile registry | profile hash drift | blocks before cache/reuse lookup |
| Profile registry | slot/profile mismatch | blocks before token-budget preflight |
| Readiness gate | non-v1a-N6 inventory slot requests runtime activation | blocks until row is promoted to implementation-ready status |
| Readiness gate | all v1a N6 first-slice profiles registered | runtime may proceed to context compilation/key building |
| Context cache | exact same packet request | returns existing artifact ref with `cache_hit=true` |
| Context cache | stale source hash | creates miss or blocks by policy |
| Context cache | exact cross-provider context packet hit | returns existing artifact ref without provider response reuse |
| Context cache | provider response presented as cross-provider cache hit | rejected or treated as miss |
| Context cache | miss compiles and persists new context artifact | cache index row is inserted idempotently with artifact ref and provenance only |
| Context cache | v1a process restart loses the process-local context cache entry | treated as a safe miss; context packet recompiles and deterministic/authority gates still run |
| Context cache | stage adapter tries local read-through cache outside runtime | rejected or detected by runtime integration test |
| Context cache | context-family mismatch with identical source refs | returns miss/block, never a hit |
| Prompt cache | same system prompt with different debate role/stage prompt | produces distinct prompt packet hashes and no cross-role hit |
| Prompt cache | same rendered slot with different compression report hash or compressed context hash | produces distinct prompt packet hashes and no cross-compression hit |
| Prompt cache | Codex-assisted invocation supplies stale prompt packet hash after compression identity changes | rejected as prompt hash drift |
| Prompt cache | prompt payload persisted inline in index | rejected by contract or persistence validation |
| Prompt cache | exact prompt packet hash already indexed | returns existing redacted prompt artifact ref and prompt quality report ref only |
| Prompt cache | Prisma-backed persistent index row | stores exact identity metadata, artifact refs, hashes, freshness, quality decision, blockers, warnings, and provenance only |
| Prompt cache | persisted prompt index row attempts to store prompt payload, provider response, or provider telemetry payload | rejected by design/test; no such fields exist in the Prisma model |
| Prompt cache | exact prompt packet cache hit in `provider_llm` mode | provider call still executes live; only prompt artifact refs are reused and response cache remains `not_applicable` |
| Provider canary harness | OpenAI/DashScope prompt-cache exact hit over existing gateway boundary | local canary records two gateway calls for two invocations, reuses only prompt artifact refs, and keeps response cache status `not_applicable` |
| Provider canary harness | OpenAI/DashScope over-budget fixture | local canary records provider call count `0` and `blocked_over_budget` before gateway execution |
| Production-shaped Prisma smoke | provider-required prompt cache exact hit over migrated local/dev DB | real Prisma prompt index stores one row, prompt artifacts are reused, provider gateway is called twice, and response reuse remains null |
| Production-shaped Prisma smoke | provider over-budget fixture over migrated local/dev DB | token-budget gate blocks with provider call count `0` and no authority writes |
| Production-shaped v1a harness | v1a N1-N9 main flow with balanced local/dev resource sample | Prisma-backed harness passes, no external provider calls occur, and N6 prompt index row is persisted |
| Production-shaped v1a replay | exact replay and drift-negative replay branch | Prisma-backed replay smoke passes with the balanced sample fixture; exact replay adds no authority writes and no LLM calls, while drifted N6-N9 inputs surface `REPLAY_INPUT_HASH_MISMATCH` without provider calls |
| Production-shaped v1a replay | default deterministic mock sample underfills harness roles | harness records the underfilled sample artifact and falls back to the T-112 balanced replay fixture without weakening production sampling guardrails |
| Prompt cache | exact prompt cache hit but cached quality report differs from current runtime quality decision | blocks as prompt packet cache drift before provider/Codex/mock execution |
| Prompt cache | stale prompt packet index entry | blocks or misses according to slot profile stale policy |
| Prompt cache | stored entry drifts on profile, slot, output contract, redaction policy, compression identity, model option, params, or runtime modifiers | `blocked_drift` |
| Prompt cache | provider response is presented as prompt packet cache artifact | rejected or treated as miss; prompt cache never returns response payloads |
| Dynamic prompt material | arbiter-generated issue frame is valid | final synthesis renders it through fixed template and includes material hash in prompt hash |
| Dynamic prompt material | stale or schema-invalid issue frame | prompt quality gate blocks before provider/Codex/mock execution |
| Prompt quality | required context refs missing | `PromptQualityReport` decision is `block` and provider call count remains zero |
| Prompt quality | rendered prompt contains governance markers such as `no_hidden_reasoning` or natural terms such as `risk-aware` | quality gate warns/passes without false-positive secret or hidden-reasoning blocker |
| Prompt quality | rendered prompt contains raw provider log or secret-shaped payload | blocks before provider/Codex/mock execution and records prompt-quality provenance |
| Prompt artifacts | runtime-enabled invocation succeeds | redacted prompt artifact and prompt-quality report refs are recorded without persisted prompt text |
| Prompt quality | effectiveness telemetry shows schema failure or gate rejection | telemetry is recorded as review signal without mutating prior authority decisions |
| Audit envelope | provider live invocation | records provider telemetry and live execution provenance |
| Audit envelope | Codex-approved reuse | records `non_provider=true`, approval ref, reuse provenance, and no provider telemetry |
| Audit projection | operator summary generated | includes cache/compression/token/prompt/schema/gate status and envelope ref/hash |
| Audit projection | human trust summary generated | includes source refs, risks/gaps/recheck hints, live/non-provider label, gate status, and envelope ref/hash without low-level internals |
| Memory policy | stale or source-drifted memory | misses, blocks, or downgrades to warning according to profile policy |
| Runtime integration | direct gateway caller uses provider without runtime preflight | test blocks or detects provider call count violation |
| Runtime integration | any direct provider path claims T-112 runtime semantics before profile/matrix promotion | test fails |
| Runtime integration | external artifact admission bypasses runtime provenance/reuse validation | admission rejected |
| v1a runtime/harness boundary | `WorkflowHarness` calls promoted v1a node adapters/shared runtime collaborators and asserts outcomes | accepted; harness remains flow controller and verification surface |
| v1a runtime/harness boundary | `WorkflowHarness` owns a production prompt/cache/compression/admission formula for a promoted v1a node | rejected or flagged by boundary review/test |
| v1a runtime/harness boundary | N6 runtime context-cache identity is constructed in a node adapter/context compiler facade | accepted; harness supplies scenario facts and replay/test overrides only |
| v1b N7 context hub | missing required N6/N8 feedback/grouping context refs | context admission blocks or records explicit blocker |
| v1b N7 context hub | valid support artifacts and frozen refs | produces ref-backed N7 handoff for N8/loopback without treating support as authority |
| v1b N7 profile registry | D19-approved N7 profiles resolve by slot/profile id/version | profile hash is stable and registry blocks unknown, mismatch, or drifted profiles |
| v1b N7 context family | N7 support slots use the locked first-slice runtime input family | `v1b_n7_topic_question_hardening` is accepted only with matching slot/profile/prompt-variant/frozen-input identity |
| v1b N7 context packet persistence | process restarts or runtime cache misses occur | N7 recompiles ref-backed context packets from artifacts; no DB-backed context packet index is required and no authority changes |
| v1b N7 context packet persistence | implementation attempts to store context packet payloads or authority payloads in a DB context cache | rejected; only prompt packet metadata has a persistent index in this slice |
| v1b N7 support generation | production/provider/Codex support generation bypasses `AgentOrchestrator` or equivalent shared runtime facade | support artifact is not T-112-compliant and cannot be admitted as promoted-slot production output |
| v1b N7 support generation | v1b `SemanticSupportAdapter` compiles context and invokes shared runtime facade | prompt identity, token-budget, prompt cache, compression, provider telemetry, response reuse guard, and runtime audit are recorded before support admission |
| v1b N7 support generation | runtime-backed Codex/mocked support generation emits a support artifact | artifact is classified `runtime_verified` only when output hash, prompt packet hash, runtime invocation context hash, context profile hash, source hashes, and runtime audit ref/hash match the shared runtime result |
| v1b N7 legacy path | runtime-backed N7 support generation/admission L1-L3 tests have passed | promoted-slot direct provider/script support-generation path is removed and fully exits the promoted-slot path |
| v1b N7 legacy path | direct provider/script output appears during migration | classified as `legacy_unverified` diagnostics only and blocked from product admission |
| v1b N7 legacy path | legacy path remains as an alternate promoted-slot generation path after replacement tests pass | test/governance check fails |
| v1b N7 legacy exit verification | v1b harness e2e needs N7 support in a promoted path | it uses `TopicSelectionV1bN7SupportRuntimeService`; direct script-side support artifact writer is absent from `.ai/scripts` |
| v1b N7 D22 L1 | profile/key/admission/provenance/compression unit tests run | profile drift, prompt identity drift, provenance class, preserved facts, and provider-live guards are covered |
| v1b N7 D22 L2 | harness policy stress runs | exact replay, frozen input drift, support hash drift, optional absent/malformed present, required support missing, and no authority bypass are covered |
| v1b N7 D22 L3 | Prisma-backed local/dev runtime smoke runs | N6->N7->N8, N8->N7 feedback, N7->N6 loopback context, prompt-cache metadata-only behavior, and no response reuse are covered |
| v1b N7 D22 L2 closure | runtime-verified support exact replay, source drift, deterministic gate bypass attempt, missing required support, and compression fact drop are tested | all block/pass according to policy without hidden authority writes or LLM-like reinvocation |
| v1b N7 D22 L3 closure | `pnpm topic-selection:v1b-n7-runtime-smoke` runs over Prisma-backed local/dev DB | one prompt index row is created for each N7 support slot; runtime audit provenance is non-provider and response reuse remains null/not-applicable |
| v1b N7 D22 L4 | executor/canary checks run when executor path is enabled | Codex/provider-capable generation passes through shared runtime and direct provider legacy generation is non-compliant or removed |
| v1b N7 D22 L5 | adversarial/long-context suite runs | large candidate sets, long feedback, failed-trial history, placeholder identity, provenance-class misuse, raw logs/secrets, and compression fact drops are covered |
| v1b expansion gate | v1b N4/N6/N8 runtime work starts | N7 L1-L3 and minimum L5 coverage have passed and legacy promoted-slot generation has exited |
| v1b N7 support admission | frozen/external support artifact resolves to a control-plane artifact and all payload/runtime hashes match | artifact is admitted as non-authority support context only, then N7 deterministic gates still run |
| v1b N7 support admission | frozen/external support artifact lacks prompt packet hash, runtime invocation context hash, profile hash, output contract, prompt variant, redaction policy, execution provenance, or slot-specific source hashes | N7 blocks before deterministic gates |
| v1b N7 support admission | admission code attempts to infer missing runtime identity by rehashing or downgrade missing provenance to warning | test fails |
| v1b N7 provenance class | support artifact has `runtime_provenance_class=runtime_verified` and matching runtime identity | eligible for production admission as non-authority support context |
| v1b N7 provenance class | support artifact has `runtime_provenance_class=fixture_replay` | accepted only in test/acceptance fixture mode, never as product admission or real prompt packet cache evidence |
| v1b N7 provenance class | support artifact has `runtime_provenance_class=legacy_unverified` | usable only as migration diagnostics, never as promoted-slot admission, response reuse, prompt cache row, or LLM workflow optimization evidence |
| v1b N7 provenance class | placeholder runtime identity appears without `runtime_provenance_class=fixture_replay` | N7 blocks before deterministic gates |
| v1b N7 admission failure | optional `n7_candidate_grouping` support is absent | N7 may continue with a machine-readable support-absent warning/context note |
| v1b N7 admission failure | optional `n7_candidate_grouping` support is present but malformed, drifted, legacy, or provenance-incomplete | N7 blocks before deterministic gates |
| v1b N7 admission failure | `n7_failed_trial_synthesis` is absent on candidate-trial exhaustion/N6 loopback path | N7 blocks with `N7_REQUIRED_SUPPORT_ARTIFACT_MISSING` |
| v1b N7 admission failure | `n7_n8_debate_admission_review` is absent on N8 gate-rejected readmission path | N7 blocks with `N7_REQUIRED_SUPPORT_ARTIFACT_MISSING` |
| v1b N7 admission failure | support admission fails due to provenance/profile/prompt/runtime/source/payload drift | emits machine-readable blocker code and does not run N7 deterministic gates |
| v1b N7 admission failure | admission failure attempts implicit provider/Codex regeneration | test fails; regeneration requires an explicit support-generation path |
| v1b N7 prompt identity | production/provider support artifact carries placeholder prompt packet/profile/slot hashes | support admission rejects it unless D23 marks it as fixture-only provenance |
| v1b N7 prompt identity | frozen input, N6 handoff, candidate set, selected candidate, failed-trial ledger, or N8 feedback hash changes | prompt/cache identity changes and old support artifacts are not reused |
| v1b N7 support admission | semantic support artifact normalized output hash differs from structured output hash or artifact payload hash | support admission blocks before N7 deterministic gates |
| v1b N7 replay | exact replay of frozen N7 context and admitted support artifacts | no provider/Codex/mock reinvocation and N7 deterministic gates still run |
| v1b N7 drift | frozen input or support artifact hash drift | no support reuse, no N7->N8 handoff mutation, and no authority write |
| v1b N7 output context | N7 admits a topic-question contract for N8 | records a non-authority diagnostic `v1b_n7_to_n8_topic_question_contract_context` artifact tied to the existing `N7ToN8Handoff@v1` refs/hashes and trace payload |
| v1b N7 output context | N7 exhausts candidate trials and loops back to N6 | records a non-authority diagnostic `v1b_n7_to_n6_failed_trial_loopback_context` artifact with failed-trial synthesis and regeneration context, without pretending it is N8 forward handoff authority |
| v1b N7 candidate grouping | accepted risks, residual gaps, or recheck hints are present in memory | may enter only as labeled hints and cannot become candidate evidence or authority |
| v1b N7 candidate grouping | candidate set hash is unchanged but candidate order/hash list changes | prompt/cache identity changes and old grouping support is not reused |
| v1b N7 failed-trial synthesis | failure history or blocker memory is reused | remains repair context only and cannot create new candidate, loopback, or recheck authority without deterministic gates |
| v1b N7 failed-trial synthesis | failed-trial ledger, N8 feedback, previous N7 handoff, or failed candidate hash changes | prompt/cache identity changes and old synthesis support is not reused |
| v1b N7 debate admission | unrelated long-term memory is available | excluded from context or blocks if it would influence N8 readmission |
| v1b N7 debate admission | selected candidate, failed contract, N8 feedback, previous handoff, or value assessment hash changes | prompt/cache identity changes and old debate-admission support is not reused |
| v1b N7 compression | compressed support context drops candidate identity, failed-trial reason, N6 handoff conclusion, N8 feedback, risk/gap/recheck hint, selected-candidate rationale, or accepted residual risk | compression quality gate blocks |
| v1b N7 compression executor | provider LLM compression is attempted for a first-slice support slot | compression quality/runtime gate blocks; provider compression is disallowed by default |
| v1b N7 compression executor | `codex_assisted` compression is requested but the slot profile does not explicitly permit semantic long-context compression | compression runtime blocks before support generation or support admission |
| v1b N7 compression identity | compression report ref/hash or compressed context hash is omitted from prompt identity | prompt packet schema/key validation rejects the packet or old support admission blocks as drift |
| v1b N7 candidate grouping compression | compression drops candidate ids/hashes, candidate order, overlap groups, grouping rationale, priority signals, candidate relationship hints, or risk/gap/recheck hints | compression quality gate blocks |
| v1b N7 failed-trial compression | compression drops failure reasons, failed candidate ids/hashes, affected refs, previous N7 handoff refs/hashes, N8 feedback hash, regeneration hints, loopback target, accepted/residual risks, blockers, or recheck hints | compression quality gate blocks |
| v1b N7 debate-admission compression | compression drops N8 gate rejection reason, debate/admission need, selected/failed candidate identity, failed contract identity, value/risk facts, blockers, accepted/residual risks, or recheck hints | compression quality gate blocks |
| v1b N7 compression boundary | compressed context attempts to generate or override executable prompt content, deterministic gate inputs, support authority, loopback authority, downstream recheck authority, or ref/hash lineage | runtime blocks before deterministic gates |
| v1b N7 authority boundary | prompt/cache/reuse hit returns valid support metadata | candidate selection, trial ledger, N8 admission, loopback, and persistence gates still execute deterministically |
| v1b N6 D24 profile registry | `n6_question_candidate_draft.initial_from_n5` resolves by slot/profile id/version | profile hash is stable and registry blocks unknown, mismatch, or drifted profiles |
| v1b N6 D24 prompt identity | frozen input hash, `n5_handoff_hash`, selected slice/option/option-set/selection/profile/readiness refs and hashes, prompt variant, output contract, profile hash, model/runtime params, redaction policy, and compression identity are unchanged | prompt packet identity is stable and reusable as LLM-operable workflow evidence |
| v1b N6 D24 prompt identity drift | any frozen N5 lineage ref/hash or generation mode changes | prompt/cache identity changes and old draft artifacts cannot be admitted for the promoted initial path |
| v1b N6 D24 runtime draft generation | node adapter compiles context and invokes shared runtime for `initial_from_n5` | prompt cache, token-budget, compression, provider telemetry separation, response-reuse guard, and runtime audit are recorded before draft admission |
| v1b N6 D24 draft admission | `runtime_verified` draft has matching output hash, prompt packet hash, runtime invocation context hash, profile hash, source hash bundle, redaction policy, and runtime audit ref/hash | draft may enter `N6TopicQuestionCandidateGate` as non-authority gate input |
| v1b N6 D24 draft admission | draft is `legacy_unverified`, fixture-only in product mode, missing runtime audit identity, or has placeholder prompt hash | admission blocks before N6 deterministic gate |
| v1b N6 D24 authority boundary | prompt/cache/compression/replay/audit succeeds | N6 deterministic gate, authority write, and `N6ToN7Handoff@v1` emission still determine business success |
| v1b N6 D24 compression | compression drops selected slice identity, N5 handoff hash, selected option identity, evidence refs, boundary refs, assumption refs, claim ceiling, non-goals, source-health warnings, or risk/gap/recheck hints | compression quality gate blocks before draft generation/admission continues |
| v1b N6 D24 replay | exact replay of the promoted initial path | LLM-like call delta is `0`, and frozen input identity, runtime/admission identity, deterministic gate replay, authority refs/hashes, and `N6ToN7Handoff@v1` hash are equivalent |
| v1b N6 D24 legacy exit | replacement L1/L2 tests pass for the promoted initial path | product/acceptance promoted paths no longer submit direct frozen semantic drafts to N6 gate; only explicit `fixture_replay` helpers remain outside product admission |
| v1b N6 D24 L3 | `pnpm topic-selection:v1b-n6-runtime-smoke` runs over Prisma-backed local/dev DB | runtime-verified product-mode N6 draft is admitted, exact replay creates no extra artifact refs, source-hash drift blocks, and N6 prompt packet index rows are metadata-only |
| v1b N6 D24 L4 | local and gated live provider canaries run for OpenAI/DashScope using `TopicQuestionCandidateSetDraft@v1` | provider-required prompt-cache hits still make live provider calls, provider response reuse remains null/not-applicable, and over-budget canaries call zero providers |
| v1b N6 D24 L5 | long-context/adversarial compression tests run | dropped N5 handoff/option/evidence/boundary/claim/recheck facts and forbidden raw provider logs block before draft generation/admission continues |
| v1b N6 P2.1b N7 loopback regeneration | N7 exhausts candidate trials and emits `v1b_n7_to_n6_failed_trial_loopback_context`; N6 runs `n6_question_candidate_draft.regeneration_after_n7_loopback` | projection context is ref-backed, checksum-verified, non-authority, selected-slice anchored, and included in runtime/prompt identity before the existing N6 deterministic candidate gate and authority write path run |
| v1b N6 P2.1b projection drift | projection checksum, selected-slice hash, N6 handoff hash, candidate set hash, failed-trial synthesis hash, prompt variant, or source hash bundle drifts | N6 blocks before deterministic gate and before authority/handoff writes |
| v1b N6 P2.1b malformed projection | regeneration is requested without projection, with multiple projections, or with exhausted candidate refs missing from projection sources | runtime/admission blocks before draft generation or before the N6 candidate gate sees a draft |
| v1b N6 P2.1b compression | compression drops N7 loopback projection, failed-trial synthesis, exhausted candidate ref/hash, candidate order, failure reason, regeneration hint, or N8 feedback | compression quality gate blocks before draft generation/admission continues |
| v1b N6 P2.1b loopback triage runtime | N6 draft passes runtime admission but fails deterministic candidate gate and present triage is `runtime_verified` | triage may influence support-only loopback routing, but N6 remains blocked, creates no candidate authority, emits no `N6ToN7Handoff@v1`, and records ref/hash-bound runtime audit identity |
| v1b N6 P2.1b loopback triage admission drift | triage prompt packet hash, profile hash, runtime invocation context hash, audit ref/hash, failed draft hash, failed draft prompt hash, source hash bundle, or output hash drifts | N6 blocks before loopback routing and before authority/handoff writes |
| v1b N6 P2.1b loopback triage provenance | triage is `legacy_unverified` or fixture replay in product mode | admission blocks; fixture replay remains limited to explicit non-product fixture tests |
| v1b N6 P2.1b loopback triage compression | compression drops failed draft identity, blocked candidate context, dominant reason code, affected ref, regeneration hint, debate escalation, upstream rollback, or loopback target | compression quality gate blocks before triage admission can continue |
| v1b N6 P2.1b gate-failure retry projection | N6 deterministic gate rejects all candidates with `n6_regenerate_candidates` loopback | N6 emits `v1b_n6_gate_failure_retry_context` as non-authority runtime context with failed draft, blocked-candidate, reason, hint, selected-slice, and N5 handoff identity |
| v1b N6 P2.1b gate-failure regeneration | retry N6 consumes exactly one `v1b_n6_gate_failure_retry_context` and runs `n6_question_candidate_draft.regeneration_after_n6_gate_failure` | regenerated draft can enter the existing N6 deterministic gate; runtime success still cannot create authority without deterministic gate and handoff success |
| v1b N6 P2.1b gate-failure drift | retry projection is absent, duplicated, malformed, internally source/support-hash drifted, or prompt variant does not match `regeneration_after_n6_gate_failure` | runtime/admission blocks before deterministic candidate gate and before authority/handoff writes |
| v1b N6 P2.1b gate-failure compression | compression drops N6 gate-failure projection, failed draft identity, blocked-candidate context, failure reason code, regeneration hint, selected slice identity, N5 handoff, or loopback target | compression quality gate blocks before retry draft generation/admission continues |
| v1b N6 P2.1b L3 loopback runtime smoke | `pnpm topic-selection:v1b-n6-loopback-runtime-smoke` runs against Prisma-backed local/dev DB | N7 failed-trial projection regenerates N6 through `regeneration_after_n7_loopback`, N6 gate failure emits retry projection, runtime `n6_loopback_triage` is admitted as support-only, retry N6 runs through `regeneration_after_n6_gate_failure`, prompt index rows are metadata-only, and no authority is written without deterministic N6 admission |
| v1b N6 P2.1b combined stress | `pnpm topic-selection:v1b-runtime-stress` includes `n6_loopback_runtime_smoke` | combined closure covers N4, N6 initial, N6 loopback/regeneration, N7, and N8 promoted runtime slots in one local/dev Prisma pass |
| v1b N8 P2.2 prompt/context identity | N8 consumes `N7ToN8Handoff@v1` plus exactly one `v1b_n7_to_n8_topic_question_contract_context` projection | prompt/cache identity binds N7 handoff, projection, topic question/contract, active candidate, answerability plan, trial ledger, selected slice, candidate set, source bundle, output contract, redaction policy, runtime modifiers, and compression identity |
| v1b N8 P2.2 projection drift | N7->N8 projection is missing, duplicated, wrong-route, wrong-lineage, checksum-drifted, or source-hash-drifted | N8 blocks before draft generation/admission and before any authority or handoff write |
| v1b N8 P2.2 compression | compression drops N7 handoff/projection lineage, topic question or contract refs/hashes, active candidate, answerability plan, trial ledger, value rationale, support quality, uncertainty, risk/gap/blocker fact, source-health warning, or feedback/recheck hint | compression quality gate blocks before draft generation/admission continues |
| v1b N8 P2.2 compression structure | compressed context is missing required arrays/maps/refs/hashes or fails the compact N8 context schema | runtime blocks before prompt packet creation or draft admission; the compressed artifact cannot become an admissible prompt/cache hit |
| v1b N8 P2.2 authority boundary | runtime draft, prompt cache hit, compression success, or reuse metadata is valid | deterministic N8 value gate still controls `topic_value_assessment` and `N8ToN9Handoff@v1`; runtime artifacts cannot create feedback, route decisions, trial-ledger updates, or candidate mutations |
| v1b N8 P2.2 feedback boundary | deterministic N8 gate rejects a runtime-verified draft | no value authority or N8->N9 handoff is written; deterministic harness logic may create ref/hash-bound N8->N7 feedback from validated gate blockers and failed draft context |
| v1b N8 P2.2 malformed feedback prevention | runtime output, compressed context, or cache/reuse hit is malformed but attempts to create N8->N7 feedback | admission blocks; malformed runtime/compression/reuse cannot create feedback or downstream recheck work |
| v1b N8 P2.2 runtime compression self-check | compression report has invalid schema, source refs/hashes drift, compressed context hash mismatch, forbidden payload class, or over-budget compressed context | shared runtime blocks before prompt packet creation and provider execution |
| v1b N8 P2.2 required-structure manifest | compressed context omits a manifest-required path, id, ref, hash, fact group, or allowed-authority-field constraint | N8 adapter/admission blocks before draft generation/admission; `WorkflowHarness` only asserts the blocker |
| v1b N8 P2.2 harness boundary | harness-only logic detects missing trial ledger, dropped risk fact, hash drift, schema-invalid compact context, or rejected compression artifact | test must fail unless runtime/admission services independently return the blocker |
| v1b N8 P2.2 rejected compression cache exclusion | a rejected compression artifact is presented as a prompt packet cache hit or runtime draft input | prompt cache/admission rejects the artifact and no deterministic gate or feedback path executes |
| v1b N8 P2.2 L3 Prisma runtime smoke | `pnpm topic-selection:v1b-n8-runtime-smoke` runs against Prisma-backed control plane and prompt cache index | product-mode runtime-verified N8 draft is admitted, exact replay creates no extra N8 artifacts, projection source-hash drift blocks before authority/handoff writes, and N8 prompt index rows remain metadata-only |
| v1b N8 P2.2 L4 provider canary | local and gated live OpenAI/DashScope canaries run for `TopicValueAssessmentDraft@v1` | provider-required prompt-cache hits still make live provider calls, provider response reuse remains null/not-applicable, and over-budget canaries call zero providers |
| v1b N8 P2.2 L5 long-context adversarial | long N7 value context is compressed before value draft generation or admission | dropped N7 handoff/projection/question/contract/active-candidate/plan/ledger/value/risk/recheck facts and forbidden raw provider logs block before the N8 deterministic value gate sees a draft |
| v1b P2.4 combined runtime stress | `pnpm topic-selection:v1b-runtime-stress` runs against the Prisma-backed local/dev stack | N4/N6 initial/N6 loopback/N7/N8 runtime smoke scenarios pass as child runs, prompt packet index remains metadata-only, expected prompt rows appear for all promoted v1b runtime slots, and no prompt quality blockers are recorded |
| v1b P2.4 closure boundary | combined stress observes runtime/cache/compression/replay evidence | stress runner does not own node semantics, does not create authority, and does not replace adapter admission, deterministic gates, or handoff validation |
| v1b D26 historical closure scope | v1b closure was originally evaluated after promoted N4/N6/N7/N8 runtime stress passed | superseded by D30: N2/N3/N5 frozen/delegated semantic support were later explicitly promoted and verified |
| v1b D26 closure acceptance | promoted N4/N6/N7/N8 runtime evidence is complete | prompt index remains metadata-only, provider response reuse remains blocked, compression self-check remains runtime/admission-owned, and deterministic gates/handoffs/authority writes remain workflow-owned |
| v1b D27 closure command | `pnpm topic-selection:v1b-runtime-stress` runs in local/dev Prisma mode | promoted N4/N6/N7/N8 runtime slots pass through child smokes, child prompt-index deltas, global prompt-index slot minimums, and no prompt quality blockers |
| v1b near-production deep test | `pnpm topic-selection:v1b-near-prod-deep-test` composes existing harness/runtime/provider entries | Prisma full-chain fixture behavior, promoted runtime stress, compression/admission unit coverage, and provider-required-live slot canaries pass without reintroducing a second runtime or legacy write-route path |
| v1b D27 per-node evidence floor | closure evidence is reviewed for promoted N4/N6/N7/N8 slots | each promoted slot keeps L1/L2 unit or harness coverage, L3 Prisma smoke, applicable L4 provider/executor canary, and L5 compression/adversarial blockers |
| v1b D27 runtime invariants | prompt cache, provider telemetry, compression, runtime audit, and deterministic gates interact during closure stress | prompt index remains metadata-only, provider response reuse remains blocked, compression failures are runtime/admission-owned, and cache/compression/runtime artifacts cannot bypass gates, handoffs, route decisions, or authority writes |
| v1b D27 post-closure route | v1b promoted runtime closure evidence is accepted | next work is a separate decision: either delegated semantic support runtime promotion for N2/N3/N5 or return to v1c/resource-sampling rollout |
| Token budget | over budget, compression disallowed | blocks before provider call |
| Token budget | over budget, compression allowed | runs compression and records report |
| v1a N6 compression | over target before compression and within target after compression | records `context_compression_report`, re-renders compressed prompt, performs one provider call, and still runs schema/admission/persistence gates |
| Token budget | estimate unknown and profile blocks unknown | blocks before provider call |
| Token budget | provider actual token count differs from estimate | records calibration telemetry without mutating prior gate decision |
| Token budget | provider-aware tokenizer is absent | still uses conservative estimator and produces auditable gate result |
| Compression executor | Codex-assisted compression output missing preserved blocker/risk/gap/recheck facts | quality gate blocks |
| Compression executor | provider-required live-call slot tries default Codex pre-compression | blocks unless compressed-context canary policy explicitly allows it |
| Response reuse | Codex-approved exact reuse | accepted with `non_provider=true` and source provenance |
| Response reuse | Codex exact reuse without approval | rejected before schema/deterministic gate admission |
| Response reuse | mocked fixture replay in acceptance | accepted only with fixture/replay provenance and `non_provider=true` |
| Response reuse | reused response bypasses schema validation or deterministic gate | test fails |
| Response reuse | reuse index contains payload instead of artifact ref | rejected by contract or persistence validation |
| Response reuse | provider-required scenario | live call required; cache not accepted as provider output |
| Compression | drops required risk/gap/recheck facts | quality gate blocks |

## Harness And HTTP Tests
| Flow | Required Coverage |
|---|---|
| v1a N6 exact replay | no extra LLM call, no duplicate authority writes, deterministic gates still run |
| v1a N6 Codex-approved exact reuse | no provider call, `non_provider=true`, candidate admission and persistence gates still run |
| v1a N6 provider mode historical response hit | treated as miss/block and cannot satisfy provider output |
| v1a N6 stale context | cache miss/block and no unsafe authority writes |
| v1a N6 read-through cache hit | existing context artifact ref is reused and candidate admission/persistence gates still run |
| v1a N6 supplemental runtime identity | same context/model/input refs but `current_round_index > 1` | context packet cache misses because `runtime_invocation_context_hash` changes, and deterministic gates still run |
| v1a N6 semantic scenario identity | same context/model/input refs but scenario is marked semantic-runtime-sensitive | context packet cache misses because semantic scenario identity participates in runtime hash |
| v1a N6 Codex compression | long exploration context can be compressed only when profile allows it; arbiter/gate required facts remain preserved |
| v1a N6 deterministic compression | over-target single-agent context records compression artifact, carries report provenance, re-renders compressed context, and does not skip deterministic gates |
| v1a N6 compression identity | compression report artifact hash and compressed context hash are carried into prompt hash and invocation provenance |
| v1a N6 compressed over budget | compression report is recorded and trace-visible, provider call count remains zero, and no ranked/admission/routing/authority write occurs |
| v1a N6 compression quality block | missing required preserved facts surfaces `COMPRESSION_QUALITY_GATE_BLOCKED`, provider call count remains zero, and no authority write occurs |
| v1a N6 slot isolation | single-agent, explorer, critic, arbiter framing, and arbiter final do not satisfy each other's cache/reuse keys |
| v1a N6 dynamic issue frame | arbiter final synthesis uses fixed template plus issue-frame artifact ref; prompt hash changes when issue-frame hash changes |
| v1a N6 debate dynamic material | role summaries or issue-frame refs change | prompt packet identity changes through bounded dynamic material refs; prompt template id/version stays fixed |
| v1a N6 prompt quality gate | arbiter/final prompt missing blocker/risk/gap/recheck material blocks or warns according to profile |
| v1a N6 debate prompt quality | governance markers and `risk-aware` domain text appear in debate context | prompt quality gate does not mask successful mocked debate execution |
| v1a N6 duplicate merge hint | deterministic admission returns merge-hint/no-admissible result with `risk-aware` context | prompt quality gate does not mask deterministic admission blocker |
| v1a N6 audit projection | human-facing summary | exposes source/risk/gap/gate/live-or-non-provider status without prompt payloads or raw telemetry |
| v1a N6 first-slice readiness | profiles, key fields, prompt variants, token budgets, compression/reuse policies, audit projections, and focused tests are present | implementation gate passes |
| v1a N7 reused recommendation | residual risks/gaps still enforced |
| v1b N4/N6/N8 | frozen input hash participates in reuse key |
| v1b N6 initial runtime draft | N5->N6 initial path uses `TopicSelectionV1bN6DraftRuntimeService` or equivalent node adapter | runtime-verified draft is produced/admitted, then existing N6 deterministic gate and authority write run |
| v1b N6 initial exact replay | same frozen N5 lineage and same runtime identity are replayed | no extra LLM-like call, no duplicate authority writes, deterministic gate replay matches, and `N6ToN7Handoff@v1` hash is equivalent |
| v1b N6 initial frozen-input drift | selected slice, selected option, option set, selection decision, constraint profile, intake readiness, or `n5_handoff_hash` changes | old prompt/cache/runtime draft identity is rejected before N6 deterministic gate |
| v1b N6 initial prompt cache hit | prompt cache returns existing prompt artifact and quality report refs | draft execution/admission, schema validation, N6 deterministic gate, authority write, and handoff emission still run |
| v1b N6 initial authority-write failure | deterministic gate passed but persistence fails | no replayable N6 success trace and no `N6ToN7Handoff@v1` is emitted |
| v1b N6 initial legacy exit | replacement L1/L2 tests pass | promoted product/acceptance path no longer directly feeds legacy frozen semantic draft artifacts to N6 gate |
| v1b N6 initial provider canary | OpenAI/DashScope provider canaries are explicitly enabled | shared runtime validates the real N6 output contract, records prompt/cache/audit provenance, live calls still execute, and no provider response becomes business authority |
| v1b N6 initial long-context adversarial | long selected-slice context is compressed before draft generation | compression quality gate blocks fact drops and forbidden persisted payloads before the N6 deterministic gate sees a draft |
| v1b N8 value draft runtime | product-mode N8 receives a `runtime_verified` Codex value draft from `TopicSelectionV1bN8ValueAssessmentRuntimeService` | admission recomputes prompt/profile/runtime/source identity, then the existing N8 deterministic value gate creates `topic_value_assessment` and `N8ToN9Handoff@v1` only after gate pass |
| v1b N8 projection drift | N7->N8 projection hash/source identity drifts or the projection is missing before runtime generation | runtime/admission blocks before N8 deterministic gate and before authority/handoff writes |
| v1b N8 fixture replay boundary | product-mode N8 receives a fixture-replay value draft | admission blocks with provenance-class error; fixture replay remains non-product test/acceptance only |
| v1b N8 Prisma runtime smoke | the promoted initial-from-N7 slot runs through Prisma-backed runtime smoke | exact replay has no extra N8 artifacts, projection drift is blocked, and prompt index rows bind `n8_value_assessment_draft.initial_from_n7` without storing prompt/provider payloads |
| v1b N8 provider canary | OpenAI/DashScope provider canaries are explicitly enabled | shared runtime validates the real N8 output contract, records prompt/cache/audit provenance, live calls still execute on prompt-cache hits, and no provider response becomes business authority |
| v1b N8 long-context adversarial | long value/risk context is compressed before draft generation | compression quality gate blocks fact drops and forbidden persisted payloads before the N8 deterministic value gate sees a draft |
| v1b N7 | high-quality topic-question-contract context is admitted and produces N7->N8/loopback handoff refs |
| v1b N7 exact replay | no extra LLM-like call, no duplicate topic-question-contract authority writes, and deterministic N7 gates still run |
| v1b N7 frozen input drift | support reuse is rejected before candidate selection, N8 admission, loopback, or persistence |
| v1b N7 support hash drift | semantic support artifact admission blocks before N7 deterministic gates |
| v1b N7 placeholder prompt identity | production/provider support artifact with placeholder prompt packet metadata is rejected unless it is explicit fixture-only provenance |
| v1b N7 compression preservation | risk/gap/recheck, failed-trial, N8 feedback, selected-candidate, and accepted-risk facts survive compression or the report blocks |
| v1b N7 N7->N8 handoff | support artifacts are preserved as refs/hashes and remain non-authority in the handoff |
| v1b N7 N7->N6 loopback context | failed-trial synthesis and regeneration hints are preserved as refs/hashes and remain non-authority repair context for N6 |
| v1c N2 llm_draft runtime | promotion support LLM draft runs through shared runtime instead of direct provider gateway |
| v1c N2 | promotion support compression cannot bypass deterministic promotion gate |
| v1c N4 delegated decision runtime | N4 candidate generation runs through shared runtime/admission before any human authority write | runtime emits a `runtime_verified` candidate, admission returns a safe `recordHumanPromotionDecision` candidate input, and no `HumanPromotionDecision`, `PromotionDecision`, or `PaperProjectBridge` is written until explicit human acceptance |
| v1c N4 prompt replay | same latest N3 gate handoff and same runtime identity are replayed | prompt packet cache reuses prompt artifacts only; response reuse remains bounded by execution mode, admission reruns, and no authority/bridge write occurs from replay alone |
| v1c N4 prompt/source drift | prompt packet hash, runtime invocation context hash, N3 gate handoff hash, snapshot hash, or allowed-ref set drifts | N4 admission blocks before human decision input is accepted |
| v1c N4 no-N5 bypass | runtime/admission candidate recommends bridge authorization | N4 runtime/admission still creates no N5 bridge; existing N4 human authority writer may later emit a bridge handoff, and N5 bridge creation remains separate |
| v1c N4 L4 provider canary | OpenAI/DashScope local and gated live canaries run for `TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1` | provider-required prompt-cache hits still make provider calls, provider response reuse remains null/not-applicable, provider telemetry stays telemetry-only, over-budget canaries call zero providers, malformed minimal output blocks, and canary output cannot create N4 authority or N5 bridge records |
| v1c N4 L5 compression adversarial | long N3 gate handoff and delegated-decision context is compressed before candidate generation/admission | dropped gate handoff, snapshot, disposition, promote-allowed status, support/dossier/readiness refs, condition/action/loopback facts, accepted risks, claim ceiling, early-check obligations, allowed refs, human authority boundary, no-bridge boundary, or forbidden raw provider logs block before human acceptance or N5 bridge creation |
| v1c production-depth | `pnpm topic-selection:v1c-production-depth` runs after runtime closure | higher-iteration serial stress, concurrent runtime stress, prompt-index first-writer race, provider profile drift guards, retention/cleanup observation, focused runtime/compression/admission units, and local provider slot canary all pass without restoring full-chain provider harness semantics |
| v1c feedback normalization | malformed reused packet cannot create downstream recheck |

## Provider Canaries
| Provider | Slot / Case | Expected Result |
|---|---|---|
| OpenAI | v1a N6 provider-required prompt-cache canary | live provider evidence passed: exact prompt cache hit still performs two gateway calls, prompt refs are reused, response reuse stays null |
| DashScope | v1a N6 provider-required prompt-cache canary | live provider evidence passed: exact prompt cache hit still performs two gateway calls, prompt refs are reused, response reuse stays null |
| OpenAI or DashScope | token over-budget canary | live evidence passed with provider call count zero before gateway execution |
| OpenAI | v1b N8 provider-required prompt-cache canary | live provider evidence passed: exact prompt cache hit still performs live gateway calls, prompt/cache/audit provenance is recorded, response reuse stays null |
| DashScope | v1b N8 provider-required prompt-cache canary | live provider evidence passed: exact prompt cache hit still performs live gateway calls, prompt/cache/audit provenance is recorded, response reuse stays null |
| OpenAI | v1c N2 bounded micro-debate four-call workflow | live evidence passed on 2026-06-02 for all bounded role slots after OpenAI schema/transport stabilization; prompt-cache hits still perform provider calls, response reuse stays null, and telemetry is recorded. |
| DashScope | v1c N2 bounded micro-debate four-call workflow | live evidence passed on 2026-06-02 for all bounded role slots; prompt-cache hits still perform provider calls, response reuse stays null, and telemetry is recorded. |
| OpenAI | v1c N4 delegated promotion decision production runtime slot | live evidence passed on 2026-06-02 after OpenAI schema/transport stabilization; prompt-cache hits still perform provider calls, malformed/cached/over-budget provider output cannot create N4 authority or N5 bridge records, and response reuse remains null/not-applicable. |
| DashScope | v1c N4 delegated promotion decision production runtime slot | live evidence passed on 2026-06-02; prompt-cache hits still perform provider calls, malformed/cached/over-budget provider output cannot create N4 authority or N5 bridge records, and response reuse remains null/not-applicable. |
| OpenAI | v1c N6 downstream feedback normalization production runtime slot | live evidence passed on 2026-06-02 after OpenAI schema/transport stabilization; prompt-cache hit still performs live provider calls, and malformed, cached, or over-budget provider output cannot create downstream recheck authority. |
| DashScope | v1c N6 downstream feedback normalization production runtime slot | live evidence passed on 2026-06-02; prompt-cache hit still performs live provider calls, and malformed, cached, or over-budget provider output cannot create downstream recheck authority. |
| OpenAI or DashScope | live token over budget fixture | provider call count remains zero |

## D33 Final Closure Classification
| Decision Area | Disposition | Evidence |
|---|---|---|
| Closure scope | satisfied for promoted runtime surface | Promoted surface is v1a N5/N6/N7/N8 plus deterministic N1-N4/N9 boundaries, v1b N2/N3/N4/N5/N6/N7/N8 semantic/runtime surfaces, v1c N2/N4/N6, and resource-sampling `resource_classification.batch`. |
| Node-scope matrix | satisfied | `06-node-scope-matrix.md` identifies LLM-capable nodes/slots at invocation-slot granularity and records context/cache/compression/token-budget policy. |
| Runtime/harness boundary | satisfied | v1b/v1c production-depth, near-prod runners, and resource-sampling service coverage compose service-owned runtime/admission checks; harnesses do not own prompt keys, compression preserved facts, provider calls, response reuse, or authority admission formulas. |
| Provider-required live-call semantics | satisfied for promoted local/provider-canary surfaces | v1c OpenAI/DashScope N2/N4/N6 live canaries passed during D29; resource-sampling L4 local provider canaries prove prompt-cache hits reuse prompt artifacts only and still perform provider calls. Resource-sampling live provider canaries are optional env-gated acceptance checks through `T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE=1`. |
| Token-budget preflight | satisfied for promoted provider-backed slots | Local provider canaries and live slot canaries cover over-budget zero-call behavior; production-depth and near-prod stress cover promoted v1b/v1c slots; resource-sampling L4 covers over-budget zero-call behavior for `resource_classification.batch`. |
| Prompt packet cache persistence | satisfied | Prisma prompt packet index remains metadata/ref/hash/provenance-only; production-depth first-writer race inserted one row, shared one winning prompt artifact ref, and cleaned up to zero rows. |
| Context packet cache | satisfied for promoted process-local exact-key surfaces; DB-backed index deferred | v1a context-cache exact hit/stale/drift tests and runtime stress cover exact key semantics. A DB-backed context packet cache index remains a non-blocking future decision. |
| Compression | satisfied for promoted over-budget surfaces | v1a/v1b/v1c/resource-sampling compression/adversarial suites preserve required facts and block dropped facts or forbidden raw provider payloads before deterministic gates. |
| Authority boundaries | satisfied | v1a/v1b/v1c replay/stress/smoke evidence and resource-sampling service tests show cache/replay/prompt-cache hits do not create duplicate authority writes and do not skip deterministic gates. |
| Explicit deferrals | non-blocking | DB-backed context packet cache index and any still-unpromoted direct-provider surfaces require later explicit decisions. Resource-sampling batch classification and v1b N2/N3/N5 semantic support were promoted by later explicit decisions. |

## Closure Checks
- Shared typecheck and schema tests pass.
- Backend typecheck and focused unit tests pass.
- v1a/v1b/v1c filtered harness smokes pass.
- v1c production-depth passes or records a specific blocked condition with no authority-boundary regression.
- Provider canaries pass or are recorded as provider/environment-blocked with diagnostic evidence and no runtime boundary regression. Current v1c OpenAI and DashScope N2/N4/N6 live slot canaries have passing evidence.
- Governance sync/lint passes.
- D33 final closure evidence passed on 2026-06-02 for the promoted runtime surface, with explicit non-blocking future decisions recorded above.
