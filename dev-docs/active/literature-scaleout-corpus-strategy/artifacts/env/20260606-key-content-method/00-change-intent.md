# Change Intent

- Run: `20260606-key-content-method`
- Scope: make `codex_curated` the default KEY_CONTENT_READY method.
- Env key: `LITERATURE_KEY_CONTENT_READY_METHOD`
- Default value: `codex_curated`
- Secret impact: none; the key is non-secret.
- Runtime intent: default B12 key-content runs should block for curated dossier import instead of calling the LLM gateway unless explicitly configured otherwise.
