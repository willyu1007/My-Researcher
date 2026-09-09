# T-152 codex-app-server-transport — summary

## Goal and outcome

Move the `codex_cli` execution line's runner from one `codex exec --json` process per invocation
attempt to the Codex App Server, so the product gains explicit thread lifecycle, compaction
visibility, an in-flow human-confirmation channel and account usage reads — without changing the
line's contract, the `codex_cli_response` provenance branch or the MCP tool surface.

Delivered in full (commits 7852ed01, dc13074d, 292b3bc3, beb45cef, 331cda82 on 2026-09-09):
`app_server` is the line's default transport; `exec` stays selectable as the fallback with a
recorded exit. Live truth: `docs/context/process/codex-cli-execution-line.md`.

## Delivered capability

- Protocol bindings generated from the installed binary (`codex app-server generate-ts`, 707 files
  pinned to codex-cli 0.153.4) by `apps/backend/scripts/codex-app-server-bindings-generate.mjs`;
  `--check` fails on drift; relative specifiers rewritten for NodeNext; `codex-version.ts` records
  the producing binary.
- `apps/backend/src/services/topic-selection-codex-app-server-client.ts`: newline-delimited JSON-RPC
  over the child's stdio, `initialize` with `capabilities.experimentalApi` (granular approval is
  gated on it), per-request timeout, exit detected on `exit` (not `close`) with a best-effort group
  sweep, `runTurn` collecting one thread's notifications until `turn/completed`, timeout →
  `turn/interrupt`, aborted turns carrying their partial collection. Server-initiated requests
  (`item/tool/requestUserInput`, approvals, MCP elicitation, permissions) are declined by policy and
  recorded with the answer given.
- Runner: `TOPIC_SELECTION_CODEX_TRANSPORT=app_server|exec` (default `app_server`); one child per
  runner instance, one ephemeral thread per attempt (`thread/start` → `turn/start` →
  `thread/unsubscribe`), child recycled after a bound (32) without cutting an in-flight attempt,
  concurrent first attempts share one spawn, `shutdown()` on the app's close hook. Outcome gains
  `transport`, the server-reported `codex_home`, and `CODEX_CLI_TURN_FAILED`; the trace carries the
  notifications minus streaming deltas of completed items, every answered server request, and an
  `account/rateLimits/read` record.
- Evidence: schema enforcement per turn, `config.mcp_servers` reachability, concurrency, close
  semantics, compaction (`contextCompaction` items) and `request_user_input` observed live; both
  transports pass the four T-151 live checks; unit tests over real pipes against a scripted server
  (`test-fixtures/codex-app-server-fake.mjs`) and against scripted sessions.
- The backend suite runner strips `TOPIC_SELECTION_CODEX_*` unless
  `BACKEND_TEST_PRESERVE_REAL_ENV=1`, so the default suite can never reach the product Codex home.

## Decisions that still constrain the design

- D-1 Process model: a dedicated `codex app-server` child per runner over stdio from the
  product-owned `CODEX_HOME` with `CODEX_HOME` and `PATH` only and a neutral cwd (a repository cwd
  loads project-local `.codex`). Never the developer's shared daemon.
- D-2 Bindings come from the installed binary, never from upstream fetches; regenerate and rerun
  the live checks after any Codex upgrade.
- D-3 Session rule (inherits T-151 D-4): one ephemeral thread per attempt, no `thread/resume` or
  `thread/fork`. An ephemeral thread has no rollout, so `thread/archive` and `thread/delete` both
  fail (-32600); `thread/unsubscribe` is the close and the loaded thread lives until the child
  exits — hence the recycle bound.
- D-4 Human-confirmation channel: recorded and declined by policy; plumbing a question to a
  researcher is the orchestration follow-up. `request_user_input` exists only behind the
  under-development feature `default_mode_request_user_input`, which the product does not enable
  for research threads.
- D-5 Compaction inside an attempt is allowed and visible in the trace (`contextCompaction` items;
  the `thread/compacted` notification is deprecated and not emitted). The line is trace-as-evidence,
  not hash replay (T-151 D-2).
- D-6 `exec` stays selectable as the fallback if the experimental server regresses; its removal is
  a registry Idea due once the next Codex upgrade re-validates the App Server path.

## Relationships and follow-ups

- Derived from T-151 (archived), which owns the line's contract, provenance branch and tool
  surface; T-153 consumes this transport for the real N6/N8 Codex workflow.
- Registry Ideas: remove the `exec` transport after the next Codex upgrade re-validates
  `app_server`; route a real research node to the line once the calibration gate lifts.

## Known limitations

- `codex app-server` is marked experimental on 0.153.4; one live canary turn stalled upstream for
  the full 600 s budget once and was ended as designed (`CODEX_CLI_TIMEOUT`); the canary check
  prints its trace histogram before asserting so a future stall shows where the turn stopped.
- The App Server writes its own sqlite state under `CODEX_HOME`; the product itself never does.
