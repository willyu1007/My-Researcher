# Architecture

## Context and current state
The backend already centralizes provider protocol execution, retry, telemetry, and structured-output normalization in a shared LLM gateway. Shipped provider endpoints, model options, native parameters, prompt text, and prompt registries are nevertheless distributed across gateway, settings, profile-registry, and workflow service code. Persisted user profile selections and encrypted provider secrets are intentional product behavior, not repository configuration debt.

The desktop renderer consumes the repository's current token and runtime CSS through its application entry point. No evidence currently justifies a visual redesign or UI framework replacement. The relevant conformance gap is that maintained guidance must describe the live authority and the change workflow required by `manage-ui-style`.

## Settled design and boundaries
- `.ai/llm/providers.json` owns shipped provider protocol, base URL, and environment-key metadata.
- Each existing LLM-backed feature/workflow receives `.ai/llm/<feature-id>/config.json` and feature-local prompt files. These files own shipped provider/model routing, native parameters, prompt references, and tool lists.
- A single typed backend loader resolves the repository/application root, validates provider references and prompt paths, loads prompt text, and exposes immutable call configuration to runtime composition.
- The existing gateway remains the provider adapter and continues to own protocol translation, retries, telemetry, structured-output normalization, and error behavior.
- Secure user settings may override the effective provider secret and select among shipped model/profile options; they do not redefine provider protocol metadata or prompt content.
- Workflow control flow, admission/budget policy, structured-output schemas, persistence, and business decisions stay in code.
- Current UI tokens, shared CSS contracts, desktop runtime styles, and representative component usage are the authority order for this repository. Documentation records reuse-before-extension and a static HTML approval mock for future non-trivial visual composition changes; this task makes no visual redesign.

## Interfaces and contracts
- Provider entries contain `protocol`, `base_url`, and `api_key_env`.
- Feature call entries expose a stable logical call identifier, provider/model choice, native parameter object, prompt references relative to that feature config, and a tool list. Any minimal extension needed to represent existing selectable model variants must remain typed and validated rather than reintroducing a second code registry.
- Loader failures are startup/configuration errors with paths and logical IDs, never silent fallback to stale hardcoded configuration.
- Prompt identifiers used by telemetry, hashes, replay, or idempotency remain stable while content moves. Exact prompt-byte compatibility is verified for migrations where those bytes participate in identity.
- Repository configuration never contains API keys or other secrets.

## Migration and operation
Migration proceeds by workflow group so each slice has one active authority before the next begins. Persisted settings are not rewritten. The prior code defaults remain only until their matching configuration slice is proven loadable in every supported execution mode, then are removed in the same verified checkpoint. Packaging and CI must treat `.ai/llm` as runtime input, not documentation.
