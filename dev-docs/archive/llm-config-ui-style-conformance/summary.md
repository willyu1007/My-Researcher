# T-146 — LLM configuration and UI style conformance

## Goal and outcome

The task replaced distributed shipped LLM defaults with a validated runtime contract while keeping
existing workflow behavior stable. `.ai/llm` is now the sole shipped authority for provider
connections, model routes, provider-native parameters, tool declarations, and production prompt
catalogs used by Literature, Topic Selection, and Paper Implementation. The former
`.ai/llm-config` mechanism and repository-local `.codex/skills` / `.claude/skills` remain absent.

The desktop UI was aligned with the current `manage-ui-style` contract without a visual redesign.
Backend-returned profile labels replaced stale renderer model literals, and maintained guidance now
defines the consumed token/component authority, reuse order, accepted icon deviation, and the HTML
mock approval gate for future non-trivial composition changes.

## Durable contracts and decisions

- `.ai/llm/providers.json` owns shipped protocol, endpoint, base-URL override, and API-key
  environment metadata. Feature-local `config.json` and `prompts/**` own shipped routes and static
  production prompt bodies. Secrets are never repository configuration.
- The typed backend loader validates provider references, prompt containment, parameter/tool
  shapes, and runtime-root availability, then fails closed. The gateway continues to own protocol
  serialization, retries, telemetry, redaction, and structured-output normalization.
- Persisted user profile selections and encrypted credentials keep precedence as controlled product
  overrides. Dynamic payloads, schemas, admission and budget policy, replay/idempotency behavior,
  compression, and workflow business decisions remain code-owned.
- Multi-provider workflows use separate configured calls so provider-native parameter shapes are
  never synthesized across providers. Minimal provider-canary messages may remain inline because
  they are diagnostic probes, not production prompt authority.
- Prompt IDs, versions, rendered bytes, hashes, and runtime/admission identities were preserved.
  Remaining model literals are compatibility recognition, calibration/security annotations or
  allowlisting, stable config call IDs, or fixed historical P5 evidence validators—not live model
  routing.
- The renderer consumes `ui/styles/ui.css`, its tokens, shared `data-ui` contract, and desktop
  runtime compatibility styles. Reuse precedes extension and new primitives. The repository has no
  canonical icon system; five existing local inline-SVG files remain an explicit compatibility
  deviation rather than a pattern to expand.
- Current backend execution is repository-backed. Any future standalone package must include
  `.ai/llm` at its application root or provide an explicit loader root; absence is an error rather
  than permission to restore hardcoded fallbacks.

## Relationships and verification

This task derives from T-145's repository-governance convergence and preserves its removal of the
old configuration/skill mechanisms. T-129 remains the separate owner of externally gated Topic
Selection calibration and provider-debate activation. No Feature placement was confirmed, so T-146
remained in F-000 / M-000 instead of being inferred into F-001.

Completion was supported by root TypeScript checks, focused compatibility suites for configuration,
gateway/settings, Literature, Topic Selection, and Paper Implementation, the CI-facing
`pnpm llm:config:check`, strict governance lint, prompt/model authority scans, and UI residue scans.
The final checks found `.ai/llm` present, legacy skill/config directories absent, no renderer TSX
inline-style objects or raw hex colors, and no unresolved review finding or task-owned residue.
