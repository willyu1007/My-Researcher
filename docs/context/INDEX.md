# Project context index

This directory contains maintained context, not a generated discovery registry.

- `api/openapi.yaml` — HTTP contract.
- `db/schema.json` — compact database context snapshot.
- `env/` — environment contract, effective development projection, and integration notes.
- `glossary.json` — domain terminology.
- `architecture-principles.md` — standing cross-cutting constraints, including canonical lifecycle terminology and the project-wide diverge-before-converge rule for research-semantic decisions.
- `paper-implementation/` — maintained paper-implementation runtime manifests.
- `process/` — current process matrices, scenarios, calibration notes, and operational playbooks;
  `process/codex-assisted-operator.md` defines the current Codex-operated rehearsal boundary and
  the deferred product integration direction.
- `ui/` — current desktop UI alignment and surface-specific notes.

There is no repository-wide checksum registry. When a source contract changes, update the directly
affected context document and verify it through the source area's focused tests.
