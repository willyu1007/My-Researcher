# LLM runtime configuration

`.ai/llm/` is deployed runtime data, not agent instruction or project-governance state.

## Authority

- `providers.json` owns shipped provider protocol, base URL, base-URL override name, and API-key
  environment-variable name. Never commit a secret value.
- Each feature `config.json` independently owns shipped call routes, model IDs, provider-native
  parameters, tool declarations, and its prompt catalog.
- Prompt paths are feature-relative and must remain inside that feature directory.
- Persisted user selections and encrypted provider credentials keep their documented precedence;
  this directory supplies shipped defaults and routing metadata.

Typed runtime code continues to own dynamic user/context payloads, output schemas, protocol
serialization, retries, telemetry, admission, redaction, compression, replay, and safety checks.
Provider-canary minimal messages may stay inline when they are diagnostic probes rather than
production prompt authority.

## Change rules

1. Reuse an existing provider or feature call before adding another route.
2. Keep provider-native parameter names native; do not translate them into a second generic config.
3. Keep production prompt bodies in `prompts/**`. When a persisted prompt contract exists, the
   configured ID/version must match it; a semantic prompt change updates both deliberately.
4. Do not place model routing or prompt bodies back into UI code or production service literals.
5. Do not add skills, approval workflows, generated wrappers, or agent-execution instructions here.

Run `pnpm llm:config:check`, backend typecheck, and the affected feature/runtime tests after a
change. A packaging or deployment flow must include `.ai/llm/` at the application root or provide
an explicit loader root.
