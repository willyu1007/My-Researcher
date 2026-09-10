# codex_cli execution line

This note fixes the current meaning of `codex_cli`, the fourth agent execution line beside
`mocked_llm`, `codex_assisted` and `provider_llm`: the backend drives the Codex CLI itself against
a product-served MCP tool surface and keeps the run's event trace as the provenance of record.
`codex_assisted` is unchanged and remains the operator-signed line; see
`codex-assisted-operator.md`.

## Current runtime truth

- The default registry admits product CLI for all 36 qualified topic-selection profiles, covering sampling, evidence/need discovery and convergence, optional Arena, all v1b roles, ordinary promotion support, required risk Debate, delegated decision candidates and downstream feedback.
  Canonical consumers compile their inputs, execute roles and preserve the deterministic gates;
  Human decisions remain explicit. See `codex-assisted-operator.md` for supported
  requests, Human stops and recovery. The separate `provider_llm` Debate dormancy gate and its
  historical `calibration_gate_release` scope remain deferred.
- Provenance carries an authoritative runner identity, not a metered gateway identity:
  `source_kind: codex_cli_response`, `provider_id: "codex"`, `model_id`, `runner_version` (read
  from the binary that ran, never declared), `thread_id`, and `trace_artifact_ref` / `_hash`.
  `model_option_id` and `normalized_params_hash` are pinned null. `non_provider` is `true`, which in
  this codebase means "not the `provider_llm` gateway path" rather than "no model ran". An
  invocation blocked before any run keeps the identity and has no run fields.
- The trace artifact (`topic-selection-codex-cli-trace-v1`) holds the full event stream of the
  transport that ran (`exec`: the `--json` lines; `app_server`: the App Server notifications plus
  every server request with the product's answer), the `usage` totals, the tool-call list, the
  `transport`, and on `app_server` the `codex_home` the server reported in `initialize`. It is
  recorded on success and on failure alike.
  `prompt_packet_hash` asserts what the product authored, not what the model consumed; Codex's
  own intra-turn context management is accepted. A hash alone cannot reproduce model output.
  The orchestrator can reuse a protected, completed attempt with matching input and execution
  identity. Canonical consumers separately bind their domain completion receipts to exact frozen
  input and current authority. An interrupted model claim requires an explicit new attempt;
  an interrupted domain commit requires authority inspection before any retry.

## Deployment

Configuration is environment-based on purpose: the Codex home has to be provisioned by whoever runs
the process, because it is where the credential lives, and the line is not a `.ai/llm` route.

```
TOPIC_SELECTION_CODEX_HOME              product-owned CODEX_HOME; absent disables the line
TOPIC_SELECTION_CODEX_MODEL             model slug, e.g. gpt-6-astra
TOPIC_SELECTION_CODEX_REASONING_EFFORT  low | medium | high | xhigh | max (default high)
TOPIC_SELECTION_CODEX_BINARY            optional path to the codex binary
TOPIC_SELECTION_CODEX_TIMEOUT_MS        optional per-invocation timeout
TOPIC_SELECTION_CODEX_TRANSPORT         app_server (default) | exec
```

Provision the home once with its own login; nothing is copied from a developer's `~/.codex`:

```bash
mkdir -p ~/.codex-my-researcher && chmod 700 ~/.codex-my-researcher
CODEX_HOME=~/.codex-my-researcher codex login
```

A run never writes into that directory. Everything per-invocation travels as `-c` overrides (or
`thread/start` parameters on `app_server`) and a per-run scratch directory that is removed
afterwards; the App Server keeps its own sqlite state there, as any Codex process does. Isolation
comes from the product-owned home, not from flags: `--ignore-user-config` suppresses a user's
config but not their skills, and a probe run read a developer skill out of `~/.codex` and changed
behaviour because of it.

## Invocation

One fresh thread per invocation attempt on either transport; the runner has no resume or fork
path, cross-round carry-over stays product-authored (`delta_hash`, `prior_role_artifact_hashes`),
and forking was measured to amortise nothing.

- `exec`: one `codex exec` per attempt, `--ephemeral`, `--json`, `-s read-only`,
  `--output-schema`, an explicit model and reasoning effort. Kept selectable as the fallback if the
  experimental App Server regresses; its removal is a recorded follow-up (registry Idea, T-152
  D-6) due once the next Codex upgrade re-validates the App Server path.
- `app_server` (default): one `codex app-server` child per runner instance, spawned from the product home
  with `CODEX_HOME` and `PATH` only and a neutral working directory, handshaken with
  `initialize` (`capabilities.experimentalApi`, which the granular approval policy needs) — the
  response's `codexHome` is what the trace records as the isolation proof. Per attempt:
  `thread/start` (`ephemeral`, granular no-approvals, `sandbox: read-only`, the attempt's MCP
  servers under `config.mcp_servers`, a per-attempt scratch `cwd`) → `turn/start` (`input`,
  `outputSchema`, `effort`) → notifications until `turn/completed` → `thread/unsubscribe`. An
  ephemeral thread has no rollout, so `thread/archive` and `thread/delete` do not apply and the
  finished thread stays loaded in the child; the runner therefore replaces the child after a
  bounded number of attempts (32), without cutting an attempt still running on the old one. The
  child is detached so a timeout can signal its process group, and it exits on its own when the
  backend dies because that closes its stdin. Server-initiated requests (`item/tool/requestUserInput`,
  approvals, MCP elicitation) are declined by product policy and recorded in the trace with the
  answer given; nothing is approved and nothing is left hanging. Two threads on one child run
  concurrently. After each turn the runner reads `account/rateLimits/read` into the trace as the
  account state beside the usage.
- Two capabilities the App Server makes visible, both observed end to end in a runner trace:
  a compaction inside an attempt appears as `contextCompaction` items (the `thread/compacted`
  notification is deprecated and was not emitted) — accepted, since the line is not replayed by
  input hash; and a model question via `request_user_input` arrives as an
  `item/tool/requestUserInput` server request, declined with `{answers: {}}` and recorded. That
  tool only exists behind the under-development feature `default_mode_request_user_input`, which
  the product does not enable for research threads: plumbing a question to a researcher is the
  orchestration follow-up, and until then a model that asks would only be declined.

- The output schema is prepared exactly as the gateway prepares it — the fail-closed encodability
  guardrail, then strict normalisation — because the CLI enforces the same OpenAI structured-output
  subset. `--output-schema` is a hard constraint on shape only; a clamped value is a legal value,
  not the semantically nearest one, so scores still need a product-side gate.
- Both transports apply a native tool policy that disables account Apps, shell, browser,
  computer use, image tools, multi-agent, plugins, skill discovery and hooks, plus web search.
  `native_tool_policy` is part of execution identity, so an older policy cannot silently supply a
  reused result. Product MCP grants remain explicit and scoped; a read-only filesystem sandbox
  alone does not restrict account tools. Recheck this policy against the installed CLI after an
  upgrade.
- Tool access is granted per server with `approval_policy = { granular = { sandbox_approval =
  false, rules = false, mcp_elicitations = false } }` and
  `mcp_servers.<name>.default_tools_approval_mode = "approve"`. The working value is `approve`;
  `auto` does not work despite its name. This keeps the sandbox read-only and adds no
  `codex-auto-review` call, unlike `--approve-for-me`.
- A failed run is a result, not an exception, and keeps its trace. Configuration problems throw
  before any gate. On `exec` a timeout settles the caller itself, signals the process group and
  escalates to SIGKILL; a large prompt against a child that exits early is a failed result, not a
  crash. On `app_server` a timeout interrupts the turn (`CODEX_CLI_TIMEOUT`), a turn that ends
  `failed` or `interrupted` is `CODEX_CLI_TURN_FAILED`, a child that dies fails the attempt at
  once and is respawned for the next, and every other request has its own 60 s timeout so a
  silent server cannot hang an attempt. Aborted turns keep the partial trace.
- Protocol bindings for the App Server are generated from the installed binary
  (`node apps/backend/scripts/codex-app-server-bindings-generate.mjs`, `--check` for drift) into
  `apps/backend/src/generated/codex-app-server/`, with the producing version in `codex-version.ts`.
  Regenerate after a Codex upgrade; the live checks below re-establish behaviour.

## Tool surface

The backend serves MCP at `POST /topic-selection/mcp` (JSON-RPC) with a `GET` stream on the same
path. Codex health-checks `GET /health` at the origin and will not initialise until it returns
200, then holds the `GET` open for server-to-client notifications; both present as a hang when
missing.

- The server speaks MCP `2026-07-28` natively — stateless, `server/discover`, per-request version in
  `_meta`, `resultType: "complete"` — and accepts the handshake-based revisions through a shim at
  the envelope only. A request that declares no version is treated as an older client. Codex
  0.153.4 negotiates `2025-06-18`; the shim can go once it negotiates the native revision.
- Reaching the endpoint is not reaching data. Every tool call carries a handle that the product
  mints per invocation attempt over that attempt's frozen evidence, authors into its own prompt,
  and releases in a finally. A handle reaches only its own scope: a research-role handle is refused
  a workflow-advancing tool before the handler runs. Discovery and listing are open and expose only
  the tool catalogue. The backend has no auth infrastructure; the handle is the gate.
- The read budget is enforced here, because an agentic loop cannot be pre-estimated and this server
  is the only component that sees every call. Reservation precedes the handler and is refunded if it
  throws, so concurrent calls cannot both be served against one unit of budget. A refusal reaches
  the model as a tool result naming the remaining budget; wording is functional — an unactionable
  refusal made a real agent give up, an actionable one made it retry within budget.
- The research-role scope has two tools: a free `list_evidence` index and a charged, batched
  `read_evidence`. The index must carry the fields the node's question actually discriminates on;
  with a flat index a real agent read all forty units one at a time (four times the cost, twenty
  times the wall clock of a stuffed prompt), with a discriminating one it read exactly the relevant
  units in two calls. These are bounded canary measurements, not a requirement that every CLI
  role use tools. Consumers supply verified evidence bodies directly when already available;
  additional reads remain restricted to the admitted scope.

## Live checks

Four live checks call a paid model and are skipped unless opted in; the default suites stay fast and
deterministic. The backend suite runner strips every `TOPIC_SELECTION_CODEX_*` variable before
running tests (the app composes a real runner from them at build time), so run live checks with
`node --test` and an explicit environment as below, or through the suite runner with
`BACKEND_TEST_PRESERVE_REAL_ENV=1`. Re-run them after any Codex upgrade — they are what
re-establish schema enforcement and tool reachability on the binary actually installed.

```bash
cd apps/backend && TOPIC_SELECTION_CODEX_LIVE=1 node --test --import tsx --env-file=../../.env.local \
  src/services/topic-selection-codex-cli-runner.live.test.ts \
  src/routes/topic-selection-mcp-codex.live.test.ts \
  src/services/topic-selection-provider-canary-codex-cli.live.test.ts
```

Run them once per transport (`TOPIC_SELECTION_CODEX_TRANSPORT=exec` for the second pass); their
assertions are transport-neutral. `src/services/topic-selection-codex-app-server.live.test.ts`
is the App Server spike: it re-answers the protocol questions (schema enforcement per turn,
`config.mcp_servers` reachability, concurrency, what closing an ephemeral thread does) on the
binary actually installed.
