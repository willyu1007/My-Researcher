# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| `--output-schema` hard-enforces the response shape, so a product-defined artifact contract can be trusted. | Run `codex exec --output-schema` with a prompt that deliberately demands an out-of-enum value, an out-of-range number and an extra property. | passed (2026-09-07) | Returned `{"verdict":"accept","confidence":0}`: enum, `maximum` and `additionalProperties:false` all clamped. Shape only — the clamped value was not the semantically nearest one, so scoring outputs still need a product-side gate. `probe-evidence.md` §1. |
| The trace carries enough to serve as provenance. | Inspect the `--json` event stream of a tool-using run. | passed (2026-09-07) | `thread.started` carries `thread_id`; `mcp_tool_call` items carry server, tool, arguments, status and error; `turn.completed` carries a five-field `usage` object. `probe-evidence.md` §2, §4. |
| Thread reuse does not amortize cost, so per-attempt threads are free. | Compare three independent invocations against one base invocation plus three `codex exec fork` calls, same corpus and roles. | passed (2026-09-07) | Independent 64,563 input tokens total; base plus forks 86,258. `cached_input_tokens` was 0 on all seven calls. Forking cost more and saved nothing. `probe-evidence.md` §3. |
| The product's MCP tool surface is reachable and observable from a product-driven run. | Run `codex exec` against a minimal stdio MCP server exposing two research tools. | passed (2026-09-07) | Tool calls appear as first-class `mcp_tool_call` events. Required `--approve-for-me`; every other authorization route tried was refused. `probe-evidence.md` §4, §5. |
| Index quality, not tool count, decides whether the agent selects or enumerates. | Run the same role prompt against a flat index and against an index carrying the field the question discriminates on. | passed (2026-09-07) | Flat index: 41 calls, whole corpus read, 456,890 input tokens. Discriminating index: 7 calls hitting exactly the 6 relevant units, 104,314 input tokens. `probe-evidence.md` §6. |
| The line's cost relative to a bundle-fed provider call. | Compare four variants at gpt-6-astra list prices. | measured (2026-09-07) | Best tool-using variant ≈ $0.55 versus ≈ $0.22 bundle-fed: about 2.5x. Batching cut wall clock by half but barely moved tokens, contradicting a round-trip-driven cost model. `probe-evidence.md` §6. |
| A product MCP server can be granted without loosening the sandbox. | Run a tool-using invocation under `-s read-only` with a granular approval policy and a per-server approval mode, without `--approve-for-me`. | passed (2026-09-08) | `approval_policy = { granular = { sandbox_approval = false, rules = false, mcp_elicitations = false } }` plus `default_tools_approval_mode = "approve"` completed the tool call. `auto` and an unset mode both failed, so the mode name is not a reliable guide. Closes D-6. `probe-evidence.md` §7. |
| `--ignore-user-config` is insufficient for isolation. | Inspect the command executions in a probe run's trace. | failed as isolation (2026-09-07) | The agent read `~/.codex/skills/research/SKILL.md` and changed behaviour, despite `--ignore-user-config --ignore-rules`. Drives D-7. `probe-evidence.md` §5. |
| D-3: `model_hint` currently enters hashes it was documented not to enter. | Inspect every hash site that consumes the invocation provenance or the `codex_response` object. | confirmed (2026-09-07) | Six sites: `topic-selection-research-arena-service.ts:244` hashes the whole provenance into `runtime_identity_hash`; the audit snapshot embeds provenance and its artifact hash feeds the same identity; `topic-selection-workflow-harness-service.ts` hashes the whole `codex_response` at four replay-input sites. No caller sets the field today, so no live hash has changed. |

## Outstanding verification

- Phase 4's in-flow human confirmation is blocked by a client-side gap, not an unknown. MCP
  `2026-07-28` defines the correct shape — Multi Round-Trip Requests returning
  `resultType: "input_required"` — but Codex 0.153.4 speaks `2025-06-18` and offers only the
  superseded server-initiated `elicitation/create`. Re-check when Codex adopts a newer revision;
  until then Phase 4 must either use the old elicitation knowingly or break out to a separate
  surface.
- When will a Codex build speak MCP `2026-07-28`? D-9 targets that revision with no compatibility
  path, and Codex 0.153.4 — the latest published build as of 2026-09-08 — negotiates `2025-06-18`.
  Until that changes, the tool-surface phases cannot run against Codex. Check the negotiated
  revision on each Codex upgrade.
- Does the granular approval configuration behave the same when supplied through a product-owned
  `CODEX_HOME` config file rather than `-c` overrides? The `-c` path was verified; the file path is
  what the runner will actually use, and `-c` could not express the `granular` policy until every
  required field was supplied.
- Does a shared thread prefix reduce role diversity? A single fork run produced identical evidence
  selections for two roles that differed under independent invocation. One observation only; it does
  not affect the current route because D-4 already forbids cross-role reuse, but it would matter if
  that decision were revisited.
- Do the `app-server` / `exec-server` transports amortize the per-invocation scaffolding? Untested;
  the only amortization route not yet excluded, and the transport named by `.ideas[0]`.
- Does a `compacted` event surface in the `--json` stream, or only in the on-disk rollout? Not
  required by the current route, since D-2 accepts compaction, but it would be needed if compaction
  ever had to be detected.
