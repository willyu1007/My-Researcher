# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| The App Server enforces an output schema per turn. | Spike turn with the T-151 live-smoke schema demanding three violations. | not-run | Decides whether schema enforcement stays in the transport or moves product-side. |
| App Server usage carries the five fields the trace records today. | Compare `turn/completed` and `thread/tokenUsage/updated` against the `exec --json` usage object. | not-run | |
| A dedicated child serves concurrent attempts on separate threads. | Two concurrent spike turns on two threads. | not-run | Bears on D-1 and D-3. |
| Generated types match the installed binary. | Regenerate from upstream at the pinned version; expect no diff. | not-run | Bears on D-2. |
| `thread/compacted` and `item/tool/requestUserInput` are observable in a trace. | Force a compaction; provoke a user-input request via a tool that asks. | not-run | The two capabilities the swap exists for. |

## Outstanding verification

- All of the above; the spike in Phase 1 exists to run them before any production path moves.
