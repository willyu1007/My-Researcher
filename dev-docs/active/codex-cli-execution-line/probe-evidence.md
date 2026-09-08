# Codex CLI probe evidence

Measured behaviour of the Codex CLI as a product-driven execution target. This is version-pinned
external evidence, not a claim about this repository's code. It exists so the numbers behind the
decisions in `00-roadmap.md` do not have to be re-derived; the probes cost roughly USD 2.5 and six
minutes of model time to produce.

**Environment.** codex-cli `0.153.4`; model catalog `~/.codex/models_cache.json` fetched
`2026-09-06T23:48Z`; model `gpt-6-astra` at `model_reasoning_effort=low`; MCP protocol `2025-06-18`
negotiated by client `codex-mcp-client`. All runs used
`--ignore-user-config --ignore-rules --skip-git-repo-check`. Re-run everything here after a Codex
upgrade before trusting it.

**Pricing used for the dollar figures.** gpt-6-astra list: USD 10 / 1M input, USD 1 / 1M cached
input, USD 50 / 1M output. Long-context (>272K) and cache-write tiers are not modelled.

## 1. `--output-schema` is hard-enforced

A schema requiring `verdict` in `["accept","reject"]`, an integer `confidence` in `[0,10]`, and
`additionalProperties: false`, against a prompt explicitly demanding `verdict: "maybe"`,
`confidence: 99`, and an extra `notes` field:

```json
{"verdict":"accept","confidence":  0}
```

All three constraints held. **Limitation:** enforcement is structural, not semantic. `99` became
`0`, not the nearest legal value `10`. A schema-valid score is not a trustworthy score, so ranking
and confidence outputs still need a product-side gate.

## 2. Usage accounting is per turn and granular

`turn.completed` carries:

```json
{"input_tokens":17049,"cached_input_tokens":0,"cache_write_input_tokens":0,
 "output_tokens":22,"reasoning_output_tokens":0}
```

This run's prompt was two sentences, so **~17K input tokens is the per-invocation scaffolding floor**
— Codex's system prompt, built-in tool definitions and environment context. It is not reducible from
the CLI, and it grows when MCP tool definitions are added. The accounting separates cached input and
cache writes, which is finer than `config/llm-pricing.json` currently models.

## 3. Thread reuse amortizes nothing

Three debate roles over a shared ~4.3K-token evidence bundle, run two ways.

| Arm | input | cached | output |
|---|---|---|---|
| A — three independent invocations | 21,520 / 21,519 / 21,524 | 0 / 0 / 0 | 90 / 82 / 63 |
| **A total** | **64,563** | **0** | 235 |
| B — base invocation establishing shared context | 21,527 | 0 | 23 |
| B — three `codex exec fork` calls from that base | 21,576 / 21,575 / 21,580 | 0 / 0 / 0 | 101 / 133 / 81 |
| **B total** | **86,258** | **0** | 338 |

Forking cost **more** and saved nothing: the shared context is re-sent as conversation history at
full price, plus an extra base invocation.

`cached_input_tokens` was 0 on all seven calls even though the ~17K scaffolding prefix was identical
across them. Caching was later observed *within* a single turn's internal loop (up to 92%), never
across separate invocations. Either cross-invocation caching does not happen or it is not reported;
in both cases the product cannot plan on a discount it cannot observe.

**Validity check:** the forked runs cited `EVIDENCE-0xx` ids that appeared only in the base
invocation's bundle and not in the forked role prompt, so the fork did inherit context and the
comparison is sound.

## 4. The product tool surface is reachable and fully observable

Against a minimal stdio MCP server exposing `list_evidence` and `read_evidence`, the `--json` stream
carried every action as first-class events:

```
thread.started    thread_id=01a07c2f-…
item.completed    agent_message      "I'll read note.txt…"
item.started      command_execution  /bin/zsh -lc 'cat note.txt'   in_progress
item.completed    command_execution  → "EVIDENCE-42: … 118 participants."  completed
item.started      mcp_tool_call      server=research tool=list_evidence  in_progress
item.completed    mcp_tool_call      server=research tool=list_evidence  completed
turn.completed    usage{…}
```

`mcp_tool_call` items carry server, tool, arguments, status and error. The product can therefore
record what the agent decided, what it invoked, and what came back — which is what makes
trace-as-evidence viable.

MCP `initialize` from Codex:

```json
{"client_protocol":"2025-06-18",
 "client":{"name":"codex-mcp-client","title":"Codex","version":"0.153.4"},
 "capabilities":{"elicitation":{"form":{},"url":{}}}}
```

The advertised `elicitation` capability means a server-side tool can request human input mid-call.
Note that `2025-06-18` is **two revisions behind** the current MCP specification: `2025-11-25`
followed it, and the current `2026-07-28` revision removed protocol-level sessions and the
`initialize` handshake outright, and replaced every server-initiated request — `elicitation/create`
included — with the Multi Round-Trip Requests pattern. Codex's handshake-based negotiation observed
here is therefore a compatibility surface, not the shape a new product server should be designed
around.

## 5. Isolation and authorization gaps

**Tool calls are refused by default in non-interactive exec:**

```
MCP tool call requires approval, but approval policy is never
```

Three authorization routes were tried:

| Route | Result |
|---|---|
| `--approve-for-me` | tool call **completed** |
| `-c approval_policy="on-failure"` | refused |
| `-c projects."<dir>".trust_level="trusted"` | refused |

`--approve-for-me` is documented as routing approvals through automatic review using the
workspace-write sandbox, so it both loosens the sandbox from read-only and adds a
`codex-auto-review` model call per approval. No per-server or per-tool allowlist was found.

**`--ignore-user-config` does not suppress user skills.** A probe run read
`/Users/yurui/.codex/skills/research/SKILL.md` and announced it was "using the research skill",
changing its behaviour, despite both `--ignore-user-config` and `--ignore-rules`. A productized
runner therefore needs a dedicated, product-owned `CODEX_HOME`; otherwise agent behaviour depends on
files the product does not control and runs are not reproducible across machines.

## 6. Tool-surface cost comparison

Same role prompt and same 40-unit corpus, four surfaces:

| Variant | tool calls | input | cached | cost | wall clock |
|---|---|---|---|---|---|
| Bundle stuffed into the prompt, no tools | 0 | 21,520 | 0 | **$0.22** | ~10s |
| Flat index — headlines with no discriminating field | 41 | 456,890 | 419,584 | $0.84 | 3m35s |
| Discriminating index — exposes `followup_months` | 7 | 104,314 | 45,568 | $0.65 | 60s |
| Discriminating index + batch fetch | 2 | 104,199 | 56,320 | **$0.55** | 31s |

**The flat index caused exhaustive enumeration.** Its headlines were near-identical, giving the model
no basis to choose, so it read all 40 units one at a time. With `followup_months` exposed — the field
that actually answers a durability question — it read exactly the 6 relevant units and nothing else.

**Batching helps latency, not tokens.** Collapsing 7 calls into 2 halved wall clock but moved input
tokens by 0.1%. A round-trip-driven cost model is wrong; there is a per-task floor around 104K for
this shape.

**On-demand retrieval is not cheaper than bundle-feeding.** Even with perfect selection and batching
the tool path cost about 2.5x the stuffed path. The reason to pay it is capability, not efficiency.

**Not a quality comparison.** The stuffed baseline ran against the earlier corpus, which had no
`followup_months` field at all. The verdict differing between variants reflects the corpus, not the
method.

## 7. Per-server tool approval, and how to discover config shapes

`--approve-for-me` is **not** the right way to grant a product MCP server. A granular approval
policy plus a per-server approval mode grants exactly one server while leaving the sandbox at
`read-only` and adding no `codex-auto-review` call:

```toml
approval_policy = { granular = { sandbox_approval = false, rules = false, mcp_elicitations = false } }

[mcp_servers.research]
default_tools_approval_mode = "approve"
```

Measured under `-s read-only`, without `--approve-for-me`:

| `default_tools_approval_mode` | tool call |
|---|---|
| `"approve"` | **completed** |
| `"auto"` | failed — `MCP tool call requires approval` |
| unset | failed — same |

**The working value is `approve`, not `auto`.** Secondary write-ups describe `auto` as "approve
everything silently" and `approve` as "block unless pre-approved"; for 0.153.4 the observed
behaviour is the reverse. Do not infer these modes from their names or from blog posts.

### Discovering config shapes without spending model calls

`--strict-config` validates `config.toml` — not `-c` overrides — and its errors enumerate the valid
values. Point `CODEX_HOME` at a scratch directory holding only a `config.toml`; the parse happens
before any model call and before authentication, so an unauthenticated scratch home is enough:

```bash
CODEX_HOME=/tmp/probe codex exec --strict-config --skip-git-repo-check "x"
```

Values recovered this way for 0.153.4:

- `approval_policy`: `untrusted`, `on-failure`, `on-request`, `granular`, `never`. `granular` is a
  newtype variant requiring three booleans: `sandbox_approval`, `rules`, `mcp_elicitations`.
- `mcp_servers.<name>.default_tools_approval_mode`: `auto`, `prompt`, `writes`, `approve`.

Two cautions. `-c` overrides bypass `--strict-config` entirely — a deliberately invalid key passed
with `-c` produced no error at all — so key names cannot be validated that way. And unknown fields
*inside* the `granular` table are ignored rather than rejected, so only the top-level key names are
actually checked.

## 8. The tool surface can be served over HTTP by the product itself

Codex accepts a `url`-configured MCP server, so Phase 2 does not need a spawned stdio subprocess
that would require its own database access. A probe endpoint received the full sequence:

```
GET  /health                      <- origin health check, before anything else
POST /mcp  initialize
POST /mcp  notifications/initialized
GET  /mcp                         <- held open for server-to-client notifications
POST /mcp  tools/list             (carries _meta even on 2025-06-18)
```

Two mechanics are worth knowing because both present as an unexplained hang rather than an error:

- **Codex health-checks `GET /health` at the endpoint's origin — not under the endpoint path — and
  will not initialize until it returns 200.** A 202 with an empty body is not enough; the probe sat
  silent for ten minutes until the health route returned a 200 JSON body.
- Codex then holds a `GET` stream open on the endpoint for the duration.

**MCP connectivity and model authentication are independent.** The same probe reached `tools/list`
successfully and then failed the model call with `401 Unauthorized` on
`wss://api.openai.com/v1/responses`, because the product-owned `CODEX_HOME` used for the probe held
no credential. The earlier stdio probes succeeded only because they ran against the developer's
default `CODEX_HOME` with `--ignore-user-config`, which skips the config but keeps the auth.

The practical consequence is good news for sequencing: the tool surface can be built and verified
end to end without provisioning any credential. Only the model call needs one.

## Reproduction

The probe MCP server was ~110 lines of dependency-free Node implementing JSON-RPC over stdio
(`initialize`, `tools/list`, `tools/call`) over a synthetic 40-unit evidence corpus, with a
server-enforced read budget. Invocation shape:

```bash
codex exec --ignore-user-config --ignore-rules --skip-git-repo-check --approve-for-me \
  -m gpt-6-astra -c model_reasoning_effort=low \
  -c mcp_servers.research.command=node \
  -c 'mcp_servers.research.args=["/path/server.mjs"]' \
  --output-schema schema.json --json - < prompt.txt
```

## CLI ergonomics worth knowing

- `codex exec fork` accepts a **different option set** from `codex exec`; notably it has no
  `-s/--sandbox`. Sandbox policy is inherited from the forked session and can only be overridden with
  `-c sandbox_mode=…`.
- Options must precede the positional `<SESSION_ID>`; otherwise the parser treats a flag as the
  positional `PROMPT` argument.
- `--ephemeral` suppresses the on-disk rollout file. Anything observable only in the rollout, such as
  `compacted` events, is invisible under `--ephemeral`.
