# Status

## Goal
Move the `codex_cli` line's runner from one `codex exec` process per invocation to the Codex App
Server, so the product gains explicit thread lifecycle, compaction visibility, an in-flow
human-confirmation channel and account usage reads — without changing the line's contract,
provenance shape or MCP tool surface.

## Progress
- State: planned
- Current phase: Opened under F-003 with the process model (dedicated stdio child) and type
  generation (from the installed binary) decided.
- Next step: Plan the spike that establishes what the App Server actually gives a product runner
  at the pinned Codex version, then decide D-3 through D-6 on its evidence.
- Blocker: none

## Done when
- [ ] The `codex_cli` runner drives the App Server and the four existing live checks pass with
      their assertions unchanged: schema enforcement, tool reachability, server-enforced budget, and
      the product-path trace.
- [ ] The T-151 session rule holds in App Server terms: every invocation attempt starts its own
      thread and that thread is closed with the attempt; a test pins that no attempt reuses another's.
- [ ] Provenance carries the App Server thread id and the trace carries the App Server event
      stream, with the `codex_cli_response` provenance branch itself unchanged.
- [ ] Protocol types are generated from the upstream `app-server-protocol` schema, pinned to the
      Codex version the product runs, with a check that regeneration yields no diff.
- [ ] The two capabilities the swap exists for are each observed end to end: a `thread/compacted`
      event recorded in a trace, and an `item/tool/requestUserInput` request recorded and answered by
      product policy rather than left hanging.
