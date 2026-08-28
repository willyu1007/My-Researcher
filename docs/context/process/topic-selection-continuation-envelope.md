# Topic-selection continuation envelope

The continuation envelope lets a client interpret one researcher instruction—“advance to the next
human decision”—without asking for permission at every internal node. It is a deterministic,
read-only projection over the current stage manifest. It is not a human-decision record, research
authority, execution log, or permission to change environments or use external providers.

## Operating flow

1. Read `GET /topic-selection/title-cards/{titleCardId}/continuation-envelope`.
2. Bind the local run to the returned `manifest_hash`, `envelope_hash`, title card, and
   `selected_local_backend` environment scope.
3. Before each operation group, submit its effect classes to
   `POST /topic-selection/title-cards/{titleCardId}/continuation-envelope/evaluations`.
4. Continue only on `continue`. On `refresh_envelope`, discard the old plan and reread current
   state. On `stop_for_human`, show the current human stage Markdown and request the exact research
   decision or expanded authorization.

Elapsed time, HTTP method, internal node count, and implementation vocabulary do not determine the
result. A short provider call still stops; a multi-minute bounded local non-provider job can
continue.

## Effect boundary

| Continue inside the envelope | Stop for exact confirmation |
|---|---|
| Local reads | Research-meaning changes |
| Deterministic local writes that do not change research meaning or human authority | Human-authority writes |
| Bounded non-provider jobs | Material risk acceptance |
| Verification | Provider use or material cost |
| Exact, recoverable retry | External acquisition |
| Lifecycle actions for the already selected local backend | Destructive or control-sensitive actions |
|  | Target-environment changes |
|  | Material scope expansion |
|  | Ambiguous recovery |

Mixed operation groups stop when any proposed effect requires confirmation. A pending or otherwise
non-advancing current research checkpoint is also a hard human boundary. After an exact human
advance, routine work may resume toward the next checkpoint under a newly projected envelope.

## Currentness and recovery

- The envelope and each evaluation are hash-stable and are never persisted as a second authority.
- Any manifest or envelope mismatch returns `refresh_envelope`; it never silently widens scope.
- Exact replay under unchanged state returns the same evaluation hash.
- The client must report progress during long local work, but progress reporting does not create a
  new authorization boundary.
- A client cannot relabel a research decision as a deterministic write: product checkpoint and
  strict-human guards continue to control all authority-changing endpoints independently of this
  evaluator.
