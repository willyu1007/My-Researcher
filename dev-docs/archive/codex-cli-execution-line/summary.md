# T-151 — codex_cli execution line

## Goal and outcome

Add a fourth agent execution line, `codex_cli`, in which the backend drives the Codex CLI itself
against a product-served MCP tool surface and keeps the run's tool-call trace as the provenance of
record. Delivered in full: the contract, the runner, the orchestrator branch with persisted trace,
the MCP tool surface with handle scoping and a server-enforced budget, and a canary that runs the
real N6 question-candidate contract through the product path on a real Codex.

One part was deliberately descoped. The first slice was to be an N6 divergent-debate role; both
N6 and N8 Debate paths are held closed by the T-128 W-14 dormancy gate (`calibration_gate_release`)
because their prompts are pre-calibration skeletons, and that reason applies to this line exactly
as it applies to `provider_llm`. Routing a debate role would have defeated the gate rather than
satisfied it, so the slice became a canary that grants admission only to itself. The line ships
inert: no profile admits it and no node routes to it.

Live truth for operating the line lives in `docs/context/process/codex-cli-execution-line.md`.

## Delivered capability

- Execution mode `codex_cli` and output source kind `codex_cli_response`, with a provenance branch
  carrying an authoritative runner identity (`provider_id: "codex"`, `model_id`, observed
  `runner_version`, `thread_id`, trace ref and hash) and no gateway model option.
- A runner that spawns one `codex exec` per invocation attempt from a product-owned `CODEX_HOME`,
  never writing into it, with a real-subprocess-tested lifecycle: a large prompt against an
  early-exiting child is a failed result, and a timeout settles the caller, signals the process
  group and escalates.
- A transport-neutral tool surface: per-attempt server-minted handles that reach only their own
  scope, a read budget reserved before the handler and refunded on throw, and two research-role
  tools (a free discriminating index, a charged batched fetch).
- An MCP protocol edge speaking `2026-07-28` natively with an envelope-only shim for the
  handshake-based revisions Codex still negotiates, served over HTTP by the backend at
  `/topic-selection/mcp`.
- Deployment through `TOPIC_SELECTION_CODEX_*` variables, and four live checks gated behind
  `TOPIC_SELECTION_CODEX_LIVE=1`.

## Decisions that still constrain the design

- **Its own line, not a fourth provider.** The cost model, budget mechanism and replay semantics
  all differ from a structured gateway call; reusing `codex_assisted` would have kept an operator
  signature after removing the operator.
- **Trace as evidence, not hash replay.** `prompt_packet_hash` asserts product-authored input, not
  what the model consumed; Codex's intra-turn context management is accepted. Cross-round
  carry-over stays product-authored through `delta_hash` and `prior_role_artifact_hashes`, so a
  thread is never reused across roles, attempts, nodes or runs — forking was also measured to
  amortise no tokens.
- **Scope on a handle, budget in the server.** Protocol-level sessions are gone in MCP
  `2026-07-28`; a handle passed as an ordinary tool argument holds across transports. The budget
  lives where every call is visible because an agentic loop cannot be pre-estimated.
- **Tool surface scoped per consumer.** A research role must never reach a workflow-advancing tool.
  The orchestration scope was moved out of this task: in-flow human confirmation belongs to the
  Multi Round-Trip Requests pattern, which no released Codex speaks.
- **Product-owned `CODEX_HOME`, provisioned by `codex login`.** `--ignore-user-config` does not
  suppress user skills; a probe read a developer skill and changed behaviour.
- **Authorization via a granular policy plus per-server `approve`.** Sandbox stays read-only and no
  review model is invoked per call; `auto` does not work. Everything travels as `-c` overrides so
  concurrent runs cannot overwrite each other's configuration.
- **Schema prepared as the gateway prepares it.** The CLI enforces the same OpenAI structured-output
  subset; skipping the gateway's guardrail and normalisation failed a real product contract with
  `invalid_json_schema` on a nested `anyOf`.
- **The advisory `model_hint` was removed** rather than kept: it entered six hashes and could never
  be advisory, and this line carries the authoritative identity it stood in for.

## Relationships and follow-ups

- Feature F-003 *Agent Execution Lines & Tool Surface*, created for this work.
- Depended on T-148's Codex-assisted rehearsal for operability evidence; the N6 surface it wires
  against settled in T-148's `f829d9fe`.
- Follow-up, deliberately outside this task: route a real research node (an N6/N8 debate role) to
  the line once the `calibration_gate_release` sign-off lifts the dormancy gate — a researcher
  decision, not a process-completion one.
- Follow-up candidate: the Codex App Server transport, which exposes thread lifecycle,
  compaction, `item/tool/requestUserInput` for in-flow human confirmation, and account usage; a
  sibling project runs it with generated protocol types. The tool surface and the provenance
  contract are transport-neutral, so the swap is contained to the runner.

## Limitations worth keeping

- The tool path costs about 2.5x a bundle-fed provider call even with perfect selection; every
  invocation carries roughly 17K tokens of Codex scaffolding, and prompt caching was never observed
  across separate invocations. Reserve the line for roles that need to act.
- `--output-schema` constrains shape only; scores still need a product-side gate.
- The backend has no auth infrastructure, so the handle is the only thing gating data; discovery
  and listing are open.
- Codex 0.153.4 negotiates MCP `2025-06-18`; the shim stays until it negotiates `2026-07-28`.
