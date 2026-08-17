# 05 Pitfalls (do not repeat)

The file prevents repeated mistakes within T-138. Append resolved failures; do not rewrite history.

## Do-not-repeat summary

- Do not turn a one-bridge semantic handoff into a generic router, workflow engine, or new backend authority.
- Do not ask users or LLMs to author or copy bridge hashes, project ids, or scientific values.
- Do not add UI work to the corrected T-138 scope.
- Do not run PAI, invoke LLMs, or modify T-137 terminal records for the handoff task.
- Do not rebuild the already-connected Paper Implementation downstream feedback/recheck loop.

## Pitfall log (append-only)

### 2026-08-17 — Legacy tidy is not a valid HTML5/UTF-8 gate

- Symptom: the system tidy binary reported Chinese UTF-8 bytes as invalid characters and rejected standard HTML5 semantic elements such as main, header, and section.
- Context: the self-contained mock uses UTF-8 and HTML5 semantic markup.
- What we tried: ran the installed tidy -quiet -errors as an additional optional validation.
- Why the check failed: the installed validator uses legacy document/encoding assumptions and does not understand the mock's valid HTML5 surface.
- Fix/workaround: rely on explicit self-contained policy checks, file-size verification, and inline-script syntax validation; do not treat the legacy output as a product defect.
- Prevention: check a validator's HTML5 and UTF-8 support before using its findings as a gate.
- References: t138-handoff-options.html and tidy -quiet -errors.

### 2026-08-17 — UI-first planning targeted the wrong present bottleneck

- Symptom: T-138 paused on choosing among three desktop interaction mocks even though the user currently operates most of the workflow through LLM interaction.
- Context: T-137 proved the backend scientific path, and the first T-138 framing treated manual desktop navigation as the next product seam.
- What we tried: scoped a no-new-API desktop handoff and produced A/B/C static mocks outside the repository.
- Why the approach was wrong: the mock improved presentation before reducing the functional composition burden faced by the LLM caller.
- Fix/workaround: supersede the UI plan and implement one bridge-id-only backend handoff that reuses owner-issued hashes and existing idempotent writers.
- Prevention: after a real E2E canary, distinguish task-specific orchestration from reusable product composition before selecting the next UI surface.
- References: T-137 coordinator scripts; existing Topic bridge intake and Paper Implementation bootstrap services.

### 2026-08-17 — Fastify strips unknown body keys under the repository policy

- Symptom: an early schema test expected an extra caller field to produce HTTP 400, but Fastify removed the unknown key and admitted the supported bridge id.
- Context: the request schema has `additionalProperties: false`, and the repository uses Fastify's default Ajv behavior that removes extra object properties.
- What we tried: treated strict schema shape as an endpoint-specific hard rejection requirement.
- Why the expectation was wrong: all authority-sensitive inputs are absent from the supported request and are recomputed by the server, so stripped noise cannot override hashes, ids, workspace, or scientific state.
- Fix/workaround: test required-field and value validation, keep the one-field public contract, and retain the repository-wide Fastify policy.
- Prevention: distinguish a contract's supported fields from the framework's unknown-key handling before adding custom validation ceremony.
- References: createPaperImplementationTopicHandoffRequestSchema and Paper Implementation route integration tests.

### 2026-08-17 — Context verification uses the feature-local entrypoint

- Symptom: `node .ai/scripts/ctl-context.mjs verify --strict` failed because that root-level file does not exist.
- Context: API-index generation succeeded first and already touched context metadata.
- What we tried: used a stale shorthand instead of the registered Context Awareness script path.
- Why the command failed: the canonical verifier lives under `.ai/skills/features/context-awareness/scripts/`.
- Fix/workaround: run `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`.
- Prevention: follow `docs/context/AGENTS.md` and the Context Awareness skill command paths exactly.
- References: docs/context/AGENTS.md and Context Awareness SKILL.md.
