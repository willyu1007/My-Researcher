# Status

## Goal
Move the `codex_cli` line's runner from one `codex exec` process per invocation to the Codex App
Server, so the product gains explicit thread lifecycle, compaction visibility, an in-flow
human-confirmation channel and account usage reads — without changing the line's contract,
provenance shape or MCP tool surface.

## Progress
- State: done
- Current phase: Complete. All three phases landed (7852ed01, dc13074d, 292b3bc3): bindings
  pinned to the installed binary with a drift check; the runner on the App Server by default with
  `exec` as the recorded-exit fallback; compaction and `request_user_input` observed in runner
  traces; both transports green on the four live checks; full backend suite 3063/2982/0.
- Next step: Archive the task; the `exec` removal lives on as a registry Idea due after the next
  Codex upgrade re-validates the App Server path.
- Blocker: none

## Done when
- [x] The `codex_cli` runner drives the App Server and the four existing live checks pass with
      their assertions unchanged: schema enforcement, tool reachability, server-enforced budget, and
      the product-path trace.
- [x] The T-151 session rule holds in App Server terms: every invocation attempt starts its own
      thread and that thread is closed with the attempt; a test pins that no attempt reuses another's.
- [x] Provenance carries the App Server thread id and the trace carries the App Server event
      stream, with the `codex_cli_response` provenance branch itself unchanged.
- [x] Protocol types are generated from the upstream `app-server-protocol` schema, pinned to the
      Codex version the product runs, with a check that regeneration yields no diff.
- [x] The two capabilities the swap exists for are each observed end to end: a compaction
      (`contextCompaction` items; the `thread/compacted` notification is deprecated and not emitted)
      recorded in a trace, and an `item/tool/requestUserInput` request recorded and answered by
      product policy rather than left hanging.
