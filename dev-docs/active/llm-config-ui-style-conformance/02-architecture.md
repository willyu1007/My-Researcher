# Architecture

## Context and current state
The backend already centralizes provider protocol execution, retry, telemetry, and structured-output normalization in a shared LLM gateway. Shipped provider endpoints, model options, native parameters, prompt text, and prompt registries are nevertheless distributed across gateway, settings, profile-registry, and workflow service code. Persisted user profile selections and encrypted provider secrets are intentional product behavior, not repository configuration debt.

The desktop renderer consumes the repository's current token and runtime CSS through its application entry point. No evidence currently justifies a visual redesign or UI framework replacement. The relevant conformance gap is that maintained guidance must describe the live authority and the change workflow required by `manage-ui-style`.

Inventory evidence shows 42 active model-profile definitions, 31 registered topic-selection prompt IDs, and 94 production system-message constructions across 36 service files. Prompt messages participate in prompt-packet hashes, so prompt migration must preserve the fully rendered message sequence at the orchestration boundary rather than replacing text only inside the provider adapter.

## Settled design and boundaries
- `.ai/llm/providers.json` owns shipped provider protocol, base URL, and environment-key metadata.
- Existing LLM-backed workflow groups receive `.ai/llm/literature-processing/`, `.ai/llm/topic-selection/`, and `.ai/llm/paper-implementation/`. Each has `config.json` plus feature-local prompt files and owns shipped provider/model routing, native parameters, prompt references, and tool lists for that workflow group.
- A single typed backend loader resolves the repository/application root, validates provider references and prompt paths, loads prompt text, and exposes immutable call configuration to runtime composition.
- The existing gateway remains the provider adapter and continues to own protocol translation, retries, telemetry, structured-output normalization, and error behavior.
- Secure user settings may override the effective provider secret and select among shipped model/profile options; they do not redefine provider protocol metadata or prompt content.
- Workflow control flow, admission/budget policy, structured-output schemas, persistence, and business decisions stay in code.
- Current UI tokens, shared CSS contracts, desktop runtime styles, and representative component usage are the authority order for this repository. Documentation records reuse-before-extension and a static HTML approval mock for future non-trivial visual composition changes; this task makes no visual redesign.

## Interfaces and contracts
- Provider entries contain `protocol`, `base_url`, and `api_key_env`.
- Feature call entries start from the `manage-llm-config` shape: stable call key, provider, model, native `parameters`, prompt paths relative to `config.json`, and `tools`. Existing selectable model options are represented as separately keyed call entries and related to code-owned profile admission policy by their stable option IDs; config loading must not invent implicit provider fallback.
- The first slice contains literature embedding, extraction, and auto-pull quality calls. Topic-selection and paper-implementation entries land by workflow group after the loader contract is proven, because their prompt bytes and model-profile hashes are already persisted/audited identities.
- Loader failures are startup/configuration errors with paths and logical IDs, never silent fallback to stale hardcoded configuration.
- Prompt identifiers used by telemetry, hashes, replay, or idempotency remain stable while content moves. Exact prompt-byte compatibility is verified for migrations where those bytes participate in identity.
- Repository configuration never contains API keys or other secrets.

## Migration and operation
Migration proceeds by workflow group so each slice has one active authority before the next begins. Persisted settings are not rewritten. The prior code defaults remain only until their matching configuration slice is proven loadable in every supported execution mode, then are removed in the same verified checkpoint. Packaging and CI must treat `.ai/llm` as runtime input, not documentation.

The current executable backend runs TypeScript directly from the repository in development and tests; there is no backend packaging product yet. Root resolution therefore anchors on an explicit override when supplied and otherwise walks upward from the loader module to the repository `package.json` plus `.ai/llm`. A future packaged backend must supply the application root and include `.ai/llm`; the validation check makes absence fail closed instead of silently using stale defaults.
