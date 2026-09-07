# Architecture

## Context and current state

The research lifecycle recognises exactly three execution modes today
(`TOPIC_SELECTION_AGENT_EXECUTION_MODES`) and three matching output source kinds
(`TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS`):

| Line | Source kind | Who runs the model | What carries authority |
|---|---|---|---|
| `provider_llm` | `provider_response` | the product, through `BackendLlmGateway` | metered model identity: `provider_id`, `model_id`, `model_option_id`, `normalized_params_hash`, pre-flight token budget, pricing telemetry |
| `codex_assisted` | `codex_response` | a human operator, outside the product | the operator's signature: `operator_label`, `prompt_packet_hash`, `response_hash`, approval refs |
| `mocked_llm` | `mock_fixture` | nobody; a fixture | `fixture_id` |

The `codex_assisted` line is deliberately model-agnostic. Its routes pin
`execution_spec.model_option_id` to `null` and reject any request that supplies it, and its
provenance branch pins `model_option_id` and `normalized_params_hash` to `null` with
`non_provider: true`. Nothing in that line records which model produced the artifact.

Two capabilities already exist and are relevant:

- Debate fan-out is modelled per role and per instance (`role_outputs[slot][instanceIndex]`), and
  `execution_plan` is role-family keyed, so a debate can already be heterogeneous across roles.
- `provider_llm` inside Debate is representable but dormant behind
  `TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant`.

## Settled design and boundaries

### The fourth line

`codex_cli` / `codex_cli_response`. The product runs the Codex CLI itself, against a product-owned
MCP tool surface, and keeps the run's event stream as provenance.

It is a separate line rather than a fourth provider because its cost model, budget mechanism and
replay semantics all differ from a single structured provider call. It is not a reuse of
`codex_assisted`, because that line's authority is an operator's signature, and this line removes
the operator.

### Ownership boundary

The product owns three things and delegates the rest:

1. **What goes in** — the prompt packet, authored and hashed by the product.
2. **What comes out** — an artifact constrained by `--output-schema`, admitted by the existing
   deterministic gate, which remains the admission authority.
3. **What happened** — the `--json` event stream, persisted by the product as the trace of record.

Everything between those points, including Codex's own intra-turn context management and
compaction, is delegated. `prompt_packet_hash` on this line asserts *the product authored this
input*, never *the model consumed exactly this*. That is already true of `codex_assisted` today;
this line states it explicitly.

Consequently this line is **not replayable by input hash**. Re-execution produces a new attempt
with its own trace. The trace, not a recomputable hash, is the evidence.

### Session and thread lifecycle

One fresh Codex thread per invocation attempt, `--ephemeral`, never resumed or forked across roles,
attempts, nodes or runs.

Within a single attempt the thread is free to do whatever it needs; a single measured invocation
used 41 internal round-trips inside one thread, and that is exactly the working scratch the line is
buying.

Across attempts, reuse is forbidden for two independent reasons:

- It buys nothing. Forking a thread was measured to amortize no input tokens at all, and a base plus
  three forks cost more than three independent calls.
- It would falsify a live claim. Cross-round carry-over is already product-authored and hashed
  through `delta_hash`, `previous_topic_question_contract_hash` and `prior_role_artifact_hashes`.
  Those fields assert that they are the whole of what carries between rounds. A reused thread would
  open a second, unsigned carry-over channel and make that assertion false.

Note the distinction from the compaction decision: `prompt_packet_hash` never claimed to describe
the model's true input, so intra-attempt compaction breaks nothing; `delta_hash` does claim to
describe cross-round carry-over, so cross-attempt thread reuse breaks it.

Under a stdio transport Codex spawns one MCP server process per invocation, so process lifetime
happens to equal attempt lifetime. That is a convenience, not the mechanism: MCP `2026-07-28`
removes protocol-level sessions entirely and directs servers that need cross-call state to use
explicit, server-minted handles passed as ordinary tool arguments. This line therefore scopes an
attempt with such a handle, which holds across transports and survives a later move to Streamable
HTTP.

### Budget enforcement point

An agentic tool loop cannot be estimated ahead of time, so the product's existing pre-flight token
budget gate is not the authority for this line. The product's MCP server is the only component that
observes every tool call, so it is the only place a runtime budget can be enforced. The server
refuses reads past the budget and the refusal is visible in the trace.

### Tool surface scoping

Two tool families with different consumers, never served by one scope:

- **Research-role scope** — a discriminating index plus a batch fetch. Two tools were sufficient for
  a complete debate role in the probe. The design effort belongs in the index fields, not in the
  tool count: the index must carry whatever the node's question actually discriminates on, or the
  agent enumerates the corpus instead of selecting from it.
- **Orchestration scope** — workflow visibility and gated advancement for the researcher-facing
  line. A research role must never reach these; otherwise a role that is an input to the workflow
  gains the ability to advance it.

Tools earn their place only where the agent must decide what to look at. Where the product already
assembles the answer set — as `evidence_role_bundle` does for `provider_llm` roles — supplying the
bundle is both simpler and cheaper than supplying tools.

Scoping requires attempt and role identity inside the tool-call context: injected as spawn
environment under stdio, or carried as a per-attempt token under Streamable HTTP.

## Interfaces and contracts

- **Invocation**: `codex exec` with a product-owned `CODEX_HOME`, `--ephemeral`, `--json`,
  `--output-schema`, an explicit model and reasoning effort, and exactly one product MCP server.
- **Structured output**: `--output-schema` is hard-enforced — enum, numeric range and
  `additionalProperties: false` were all observed to clamp a prompt that deliberately violated them.
  It constrains *shape only*; a clamped value is a legal value, not a semantically nearest one, so
  scoring and ranking outputs still need a product-side gate.
- **Trace**: the `--json` stream carries `thread.started` with a `thread_id`, `item.started` /
  `item.completed` for agent messages, command executions and `mcp_tool_call` entries with server,
  tool, arguments, status and error, and `turn.completed` with a `usage` object reporting
  `input_tokens`, `cached_input_tokens`, `cache_write_input_tokens`, `output_tokens` and
  `reasoning_output_tokens`.
- **MCP**: the current specification revision is `2026-07-28`, which is stateless — no
  `initialize` handshake, no `Mcp-Session-Id`, per-request protocol version and client capabilities
  in `_meta`, a mandatory `server/discover` RPC, and cross-call state carried by server-minted
  handles passed as tool arguments. Codex 0.153.4 negotiates `2025-06-18` as `codex-mcp-client`,
  two revisions behind, and advertises an `elicitation` capability with `form` and `url` variants.
  The product server targets `2026-07-28` with backward compatibility to the handshake-based
  revisions Codex still speaks.
- **Human confirmation in flow**: `2026-07-28` replaces every server-initiated request, including
  `elicitation/create`, with the Multi Round-Trip Requests pattern: the server returns an
  `InputRequiredResult` carrying `inputRequests`, and the client supplies `inputResponses` on a
  retry of the original request. This is the correct shape for a `human_actor` +
  `promote_reconfirmed` step, but Codex does not speak it yet, so Phase 4 cannot rely on it.

## Migration and operation

- **Isolation**: `--ignore-user-config` does not suppress user skills; a probe run read
  `~/.codex/skills/research/SKILL.md` and changed behaviour accordingly. A product-owned `CODEX_HOME`
  is therefore required, not optional, for reproducible runs.
- **Authorization**: in non-interactive `codex exec`, MCP tool calls are refused under the default
  approval policy. `--approve-for-me` was the only observed way to allow them, and it loosens the
  sandbox to workspace-write and routes each approval through an extra `codex-auto-review` model
  call. No per-server or per-tool allowlist was found.
- **Cost**: every invocation carries roughly 17K tokens of Codex scaffolding before any content.
  Prompt caching was observed only *within* a turn, never across separate invocations. Even with a
  perfectly selective agent and batched reads, the line cost about 2.5x the equivalent bundle-fed
  provider call. The line should be reserved for roles that genuinely need to act.
- **Security**: the orchestration scope must keep `human_actor` and `promote_reconfirmed` intact.
  The existing note that operator-only access is "by convention, not enforcement" becomes materially
  load-bearing once an agent, rather than a person, can reach those tools.
