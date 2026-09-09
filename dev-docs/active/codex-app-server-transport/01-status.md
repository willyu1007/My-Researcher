# Status

## Goal
Move the `codex_cli` line's runner from one `codex exec` process per invocation to the Codex App
Server, so the product gains explicit thread lifecycle, compaction visibility, an in-flow
human-confirmation channel and account usage reads — without changing the line's contract,
provenance shape or MCP tool surface.

## Progress
- State: in-progress
- Current phase: Phase 3 — capability proofs and transition exit. Phase 2 landed: the runner
  drives the App Server behind `TOPIC_SELECTION_CODEX_TRANSPORT=app_server`, the four T-151 live
  checks pass on it with assertions unchanged, D-3 is pinned by a unit test, and every trace on
  that path records the server-reported `codex_home`.
- Next step: Force a compaction and provoke a `requestUserInput` on live threads and assert both
  land in the trace with the policy answer; then execute the `exec` exit per D-6.
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
- [ ] The two capabilities the swap exists for are each observed end to end: a `thread/compacted`
      event recorded in a trace, and an `item/tool/requestUserInput` request recorded and answered by
      product policy rather than left hanging.
