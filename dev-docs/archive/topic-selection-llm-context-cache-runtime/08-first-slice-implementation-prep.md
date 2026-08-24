# 08 First-Slice Implementation Prep

## Status
This file prepares the first implementation round. It does not authorize full rollout across resource sampling, v1b, or v1c.

First implementation round: shared contracts and runtime primitives for the v1a N6 first slice.

Contract-first slice status: implemented and verified on 2026-05-29.

Backend registry/key primitive slice status: implemented and verified on 2026-05-30.

Token estimator and token-budget gate primitive slice status: implemented and verified on 2026-05-30.

Context packet cache primitive slice status: implemented and verified on 2026-05-30.

Production-shaped local context cache tests status: implemented and verified on 2026-05-30.

Production-shaped token-budget harness layer status: implemented and targeted-tested on 2026-05-30.

Backend compression runtime primitive status: implemented and targeted-tested on 2026-05-30.

WorkflowHarness token-gate production-shaped verification status: implemented and targeted-tested on 2026-05-30.

Readiness review findings fix slice status: implemented and targeted-tested on 2026-05-30.

v1a N6 single-agent compression-and-rerender slice status: implemented and full backend-tested on 2026-05-30.

v1a N6 compression negative closure status: implemented and full backend-tested on 2026-05-30.

## LLM Engineering Procedure
Selected procedure: `standardize-calling-wrapper`.

Rationale:
- no new provider is being added;
- no new provider secrets, env keys, or SDK paths are needed;
- T-112 standardizes the topic-selection LLM invocation boundary before provider/Codex/mock execution;
- existing `BackendLlmGateway` remains the only provider API path.

Required API surface for the first slice:
- structured output only;
- no streaming;
- no embeddings;
- no new model-routing registry files;
- no desktop UI;
- no Prisma schema change in round 1.

## Round 1 Scope
Round 1 prepares contracts and backend primitives. Node wiring is allowed only after these pieces exist and pass tests.

In scope:
- shared runtime contracts and schema tests;
- hardcoded first-slice `ContextPolicyProfile` registry skeleton for v1a N6 rows;
- stable runtime key builders;
- `ConservativeTokenEstimator`;
- token-budget gate result contract;
- context packet cache result envelope contract and read-through service boundary;
- prompt packet identity and `PromptQualityReport` contract;
- compression report envelope contract;
- exact response reuse provenance and approval contract;
- runtime audit envelope plus `operator_audit_summary` and `human_trust_summary` projection contracts.

Out of scope for round 1:
- resource sampling runtime wiring;
- v1b runtime wiring;
- v1c runtime wiring;
- provider canary execution;
- OpenAI/DashScope provider changes;
- database schema changes;
- desktop UI changes;
- semantic-similarity response cache.

## Proposed File Map
Shared contracts:
- `packages/shared/src/research-lifecycle/topic-selection-llm-runtime-contracts.ts` - implemented
- `packages/shared/src/research-lifecycle/topic-selection-llm-runtime-contracts.schema.test.ts` - implemented
- `packages/shared/src/research-lifecycle/index.ts` - exported
- `packages/shared/package.json` - export path added

Backend runtime primitives:
- `apps/backend/src/services/topic-selection-context-policy-profile-registry-service.ts` - implemented
- `apps/backend/src/services/topic-selection-context-policy-profile-registry-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-context-packet-cache-service.ts` - implemented
- `apps/backend/src/services/topic-selection-context-packet-cache-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-conservative-token-estimator-service.ts` - implemented
- `apps/backend/src/services/topic-selection-conservative-token-estimator-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-llm-runtime-key-builder-service.ts` - implemented
- `apps/backend/src/services/topic-selection-llm-runtime-key-builder-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-token-budget-gate-service.ts` - implemented
- `apps/backend/src/services/topic-selection-token-budget-gate-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-compression-runtime-service.ts` - implemented
- `apps/backend/src/services/topic-selection-compression-runtime-service.unit.test.ts` - implemented
- `apps/backend/src/services/topic-selection-llm-runtime-service.ts`
- `apps/backend/src/services/topic-selection-llm-runtime-service.unit.test.ts`

Existing files expected to be touched later, not in the first contracts-only commit:
- `apps/backend/src/services/topic-selection-agent-orchestrator-service.ts` - optional token-budget preflight binding implemented for first-slice invocations
- `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts` - optional local runtime cache binding implemented
- `apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.ts` - v1a N6 debate slot token-budget binding implemented
- `apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts` - v1a N6 single-agent token-budget binding implemented
- `apps/backend/src/app.ts`

## Contract Contents
The new shared contract file should define JSON schemas and TypeScript types for:
- `TopicSelectionContextPolicyProfile`;
- `TopicSelectionContextPolicyProfileRegistry`;
- `TopicSelectionRuntimeCacheResult`, including `hit`, `miss`, `blocked_stale`, `blocked_drift`, `bypassed`, and `not_applicable`;
- `TopicSelectionContextPacketCacheKey`;
- `TopicSelectionContextPacketCacheResultEnvelope`;
- `TopicSelectionTokenBudgetGateResult`;
- `TopicSelectionCompressionReportEnvelope`;
- `TopicSelectionPromptPacketIdentity`;
- `TopicSelectionPromptQualityReport`;
- `TopicSelectionExactResponseReuseProvenance`;
- `TopicSelectionRuntimeAuditEnvelope`;
- `TopicSelectionOperatorAuditSummary`;
- `TopicSelectionHumanTrustSummary`.

Required first-slice schema tests:
- unknown context family rejects;
- cache key missing slot/profile/schema/policy fields rejects;
- cache result outside allowed enum rejects;
- token-budget gate missing decision rejects;
- compression report missing source refs/hash/quality result rejects;
- prompt packet missing `prompt_variant_key` for multi-slot prompts rejects;
- persisted prompt payload without redaction/ref metadata rejects;
- Codex reuse without approval or local approved-reuse setting rejects;
- provider telemetry without live provider call rejects;
- audit projection missing source envelope ref/hash rejects.

## Backend Primitive Requirements
Profile registry skeleton:
- uses hardcoded TypeScript constants for first-slice v1a N6 profiles;
- computes stable profile hashes;
- resolves by profile id/version;
- verifies slot/profile compatibility;
- fails closed for unknown profile, version mismatch, unsupported modifier/template, or hash drift.

Key builder:
- includes `invocation_slot_id`;
- includes context family;
- includes input/source refs hash;
- includes context packet hashes;
- includes profile hash;
- includes schema/policy/template/compiler versions;
- includes prompt variant and dynamic material refs/hashes when present;
- includes model option and normalized params for provider execution;
- includes redaction policy.

Token estimator:
- deterministic and local;
- uses conservative CJK, English, JSON, and schema-overhead multipliers;
- applies profile safety margin, default `1.25`;
- never uses provider actual token telemetry to mutate an already emitted gate decision.

Runtime skeleton:
- resolves profile before key building;
- emits token-budget gate result before provider execution;
- treats context cache/reuse as artifact-ref only;
- blocks provider historical response reuse;
- requires Codex exact reuse approval;
- emits runtime audit envelope and projections from one source envelope.

## Backend Primitive Slice
Implemented and verified on 2026-05-30:
- hardcoded first-slice v1a N6 `ContextPolicyProfile` registry with five rows;
- profile registry validation for schema errors, duplicate profile/slot ids, provider-required-live reuse policy drift, compression quality gate drift, cache-key field drift, post-cache gate drift, forbidden payload class drift, and preserved fact drift;
- fail-closed resolver for unknown profile id, version mismatch, slot/profile mismatch, and expected hash drift;
- stable runtime key builder for context packet cache keys and prompt packet identity;
- key tests proving `invocation_slot_id`, `context_family`, profile hash, prompt variant, dynamic material hash, redaction policy, model option, and normalized params participate in stable hashes.

## Token Budget Primitive Slice
Implemented and verified on 2026-05-30:
- deterministic local `ConservativeTokenEstimator` for CJK, Latin, JSON, and schema-overhead estimates;
- safety-margin multiplier validation with the first-slice default `1.25`;
- schema-validated token-budget gate service using the resolved `ContextPolicyProfile`;
- gate outcomes for `within_budget`, `requires_compression`, `blocked_over_budget`, and `budget_unknown_allow_with_warning`;
- blocker/warning codes for unknown estimates, compression-disallowed over-budget input, and over-budget input after compression.

Still deferred:
- response reuse/audit runtime skeleton.

## Context Packet Cache Primitive Slice
Implemented and verified on 2026-05-30:
- artifact-ref-only cache store/service boundary;
- shared-schema validation for cache keys and cache result envelopes;
- exact cache-key hit returns the existing artifact ref and artifact hash;
- stale entry policy returns `blocked_stale` or `miss`;
- context-family/profile/source-ref drift returns `blocked_drift`;
- put-if-absent recording preserves existing exact artifact refs.

Still deferred:
- broader v1a N6 harness/provider runtime wiring;
- response reuse/audit runtime skeleton.

## Production-Shaped Local Test Slice
Implemented and verified on 2026-05-30:
- optional runtime context cache binding in the v1a N6 context compiler;
- exact hit test using real v1a N6 exploration and arbiter context payloads plus artifact boundary;
- stale and context-family drift tests that block before context artifact writes;
- no live provider calls and no provider secret/config dependency.

## Production-Shaped Token Budget Harness Layer
Implemented and targeted-tested on 2026-05-30:
- optional runtime token-budget input in `AgentOrchestrator`;
- preflight evaluation before provider/mock/Codex source execution when a profile binding is supplied;
- v1a N6 single-agent adapter binding to the first-slice need-candidate-generation `ContextPolicyProfile`;
- over-budget provider fixtures block before gateway calls and do not write ranked draft artifacts;
- `requires_compression` is blocked until compression reports are wired into context rewrite and prompt re-render.

## Compression Runtime Primitive Slice
Implemented and targeted-tested on 2026-05-30:
- backend compression report creation from a resolved first-slice `ContextPolicyProfile`;
- shared-schema validation for `TopicSelectionCompressionReportEnvelope`;
- fail-closed checks for source refs, profile hash, redaction policy, strategy id/version, and allowed executor kind;
- quality-gate blocking for forbidden hidden reasoning, raw provider logs, credentials, secrets, API keys, and unredacted private content;
- quality-gate blocking for dropped blockers, residual risks, accepted risks, source-health warnings, method-family gaps, unresolved challenges, and recheck hints;
- token before/after estimates with warning when compression does not reduce the estimate.
- `AgentOrchestrator` records a diagnostic compression report artifact when token budget requires compression and the caller supplies compressed context/summary material.

## WorkflowHarness Token-Gate Production-Shaped Verification
Implemented and targeted-tested on 2026-05-30:
- v1a N6 WorkflowHarness input accepts runtime token-budget overrides;
- override values participate in the N6 scenario replay/input hash;
- WorkflowHarness passes overrides into the v1a N6 adapter and through the existing `AgentOrchestrator` token-budget preflight;
- provider-shaped over-budget fixture blocks with `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION`;
- fake provider gateway call count remains `0`;
- ranked draft, schema validation, admission, and supplemental routing artifacts are not written;
- NeedCandidate authority records are not created.

Still deferred:
- v1a N6 automatic context rewrite and prompt re-render after compression;
- Codex-assisted compression execution;
- compression artifact persistence/read-through reuse;
- provider canaries for compressed context.

## Readiness Review Findings Fix Slice
Implemented and targeted-tested on 2026-05-30:
- invocation audit snapshots include the token-budget gate result field and reject snapshots missing it;
- v1a N6 debate slots bind their own first-slice runtime profiles and reach the same `AgentOrchestrator` token-budget preflight path;
- Codex cached exact reuse requires approval/local setting plus exact non-provider provenance, and records the reuse provenance as a diagnostic artifact;
- provider-side cache hit/read/write usage is captured by `BackendLlmGateway` telemetry and aggregated without becoming business response reuse;
- supplied compression attempts generate quality-gated report artifacts before provider execution remains blocked.

Still deferred:
- broader automatic compressed prompt/context rewrite beyond v1a N6 single-agent;
- broader response reuse index outside the Codex cached-exact orchestration path;
- live OpenAI/DashScope canaries.

## v1a N6 Single-Agent Compression-And-Rerender Slice
Implemented and full backend-tested on 2026-05-30:
- v1a N6 single-agent adapter now preflights the rendered prompt with the first-slice `ContextPolicyProfile` before calling `AgentOrchestrator`;
- `requires_compression` triggers deterministic structural compaction for the exploration and arbiter context packets instead of immediately blocking;
- the adapter records a `context_compression_report` artifact containing the shared compression report envelope plus the compressed context used for prompt rendering;
- compressed context preserves source context packet hashes, source refs, method-family gaps, source-health warnings, unresolved challenges, blockers, and residual-risk facts as the first-slice quality inventory;
- the adapter re-renders the N6 prompt with `compressed_context` and passes the compression report artifact ref into invocation provenance;
- the second token-budget gate still executes in `AgentOrchestrator`; if compressed context remains over budget, provider calls still block before the gateway;
- schema validation, candidate admission, supplemental routing, persistence gates, replay identity, and authority-write boundaries remain unchanged after compression.

Still deferred:
- Codex-assisted semantic compression execution;
- compression artifact read-through cache reuse;
- debate-slot compressed prompt rewrite;
- resource sampling, v1b, and v1c compression wiring;
- live OpenAI/DashScope canaries for compressed context.

## v1a N6 Compression Negative Closure
Implemented and full backend-tested on 2026-05-30:
- adapter-level compressed-context-still-over-budget fixture records the compression report, blocks before provider execution, and writes no ranked/admission/routing/persistence artifacts;
- adapter-level dropped-preserved-facts fixture returns `COMPRESSION_QUALITY_GATE_BLOCKED`, preserves compression blocker details, blocks provider execution, and writes no authority records;
- WorkflowHarness compressed-over-budget fixture keeps the report artifact in trace refs while provider call count and NeedCandidate authority writes remain zero.

## First Code Commit Boundary
The first code commit should be contract-first:
- add shared runtime contracts and schema tests;
- export the new contract module;
- run shared tests and typecheck.

Completed in the contract-first slice:
- added schemas/types for `ContextPolicyProfile`, `ContextPolicyProfileRegistry`, context cache key/result, token-budget gate result, compression report, prompt packet identity, redacted prompt artifact, `PromptQualityReport`, exact response reuse provenance, runtime audit envelope, `operator_audit_summary`, and `human_trust_summary`;
- added 12 schema tests covering unknown context family, missing key fields, cache hit/stale result shape, token-budget decision, compression source/hash constraints, prompt variant/redaction constraints, dynamic prompt material limits, non-provider response reuse, provider telemetry separation, and audit projection source refs;
- updated shared barrel and package export map.

It should not:
- wire `AgentOrchestrator`;
- modify v1a N6 execution behavior;
- add persistence fields;
- touch provider secrets/config;
- run provider canaries.

## Verification Commands
Run after the contracts commit:
```bash
pnpm --filter @paper-engineering-assistant/shared test
pnpm --filter @paper-engineering-assistant/shared typecheck
```

Run after backend primitive commits:
```bash
pnpm --filter @paper-engineering-assistant/backend test
pnpm --filter @paper-engineering-assistant/backend typecheck
```

Run before first v1a N6 wiring commit is considered ready:
```bash
pnpm test
pnpm topic-selection:v1a-harness-replay-smoke
```

Provider canaries are deferred until provider-required rows are promoted and environment availability is confirmed.
