# 05 Pitfalls (do not repeat)

This file prevents repeated mistakes within T-138. Append resolved failures; do not rewrite history.

## Do-not-repeat summary
- Do not turn a one-bridge desktop handoff into a generic router, workflow engine, or new backend authority.
- Do not ask users or LLMs to author/copy bridge hashes, project ids, or scientific values.
- Do not edit production UI before presenting distinct static HTML mocks and receiving a selection.
- Do not run PAI, invoke LLMs, or modify T-137 terminal records for this UI task.
- Do not recreate retired desktop legacy styles; use `data-ui` and existing tokens.

## Pitfall log (append-only)

### 2026-08-17 — Legacy `tidy` is not a valid HTML5/UTF-8 gate
- Symptom: the system `tidy` binary reported Chinese UTF-8 bytes as invalid characters and rejected standard HTML5 semantic elements such as `main`, `header`, and `section`.
- Context: the self-contained mock uses UTF-8 and HTML5 semantic markup.
- What we tried: ran the installed `tidy -quiet -errors` as an additional optional validation.
- Why it failed: the installed validator uses legacy document/encoding assumptions and does not understand the mock's valid HTML5 surface.
- Fix / workaround: rely on explicit self-contained policy checks, file-size verification, and inline-script syntax validation; do not treat the legacy output as a product defect.
- Prevention: check a validator's HTML5 and UTF-8 support before using its findings as a gate.
- References: `t138-handoff-options.html`, `tidy -quiet -errors`.
