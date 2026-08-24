# Roadmap

## Task Identity
- Task ID: `T-112`
- Slug: `topic-selection-llm-context-cache-runtime`
- Mapping: `M-001 > F-001 > R-009 > T-112`
- Status: planned

## Why This Exists
- Topic-selection now has stronger v1a/v1b/v1c harness and agent execution semantics, but LLM context handling is still uneven across nodes.
- Existing code has context packet hashes, replay hashes, prompt packet hashes, telemetry, and some compression metadata. Those are necessary foundations, but they do not yet provide a shared production policy for context reuse, token-budget gates, provider response reuse, or compression quality.
- Without one cross-cutting runtime policy, each node can accidentally reinvent cache, context trimming, or response reuse semantics and create drift from authority/replay guarantees.

## Target Outcome
- All topic-selection LLM-like execution paths use one shared context/cache/token-budget policy.
- Context packets and prompt packets are reusable only through exact, policy-approved keys.
- Compression is explicit, ref-backed, auditable, and quality-gated.
- Provider-backed, Codex-assisted, and mocked execution modes share provenance and cache semantics without allowing cached data to masquerade as live provider output.

## Exit Criteria
- Every LLM-capable topic-selection node has a documented token-budget policy and cache/compression eligibility rule.
- Runtime contracts define `context_packet`, `prompt_packet`, `invocation_cache_key`, token-budget gate result, compression report, and response reuse provenance.
- Backend runtime has read-through context packet cache, exact response reuse support for approved replay/Codex-assisted paths, and provider-call preflight token-budget checks.
- v1a/v1b/v1c harness smokes prove cache hits do not create extra authority writes, stale cache blocks or misses, and provider-quality canaries remain live provider calls.

