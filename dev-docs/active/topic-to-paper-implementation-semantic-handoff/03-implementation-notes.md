# 03 Implementation Notes

## Status

- Current status: done
- Last updated: 2026-08-17

## What changed

- Created T-138 as a new explicit follow-up after T-137 proved the real backend scientific-dossier path.
- Initially scoped T-138 to a desktop handoff and created one external comparison document with A/B/C interaction variants.
- Superseded that UI-first direction after the user clarified that the present product is primarily operated through LLM interaction and functional closure has priority.
- Verified that Paper Implementation upstream feedback is already wired to Topic Selection downstream feedback/recheck through persisted backend services, routes, tests, and real database evidence; the feedback loop is not the next missing seam.
- Identified the actual minimal seam: T-137's cross-module composition is fixed to one task profile, while the product owners already expose all necessary idempotent writers separately.
- Rescoped T-138 to one backend semantic-handoff command that composes only PaperProject intake and ImplementationProject bootstrap, then returns an LLM-readable continuation packet.
- Added `PaperImplementationTopicHandoff@v1`: its request contains only `paper_project_bridge_id`; its response separates verbatim bridge semantics, owner lineage, explicit create/reuse effects, and one fixed resume policy.
- Added `PaperImplementationTopicHandoffService`, which reads the Topic Selection owner handoff and passes its hash/workspace directly to the existing idempotent PaperProject-intake and PaperImplementation-bootstrap writers.
- Added `POST /paper-implementation/topic-handoffs`, thin controller delegation, and application composition wiring.
- Added focused schema, service, and route coverage for create/replay, stable semantics and lineage, malformed input, upstream owner rejection, and accepted PaperProject progress when downstream bootstrap fails.
- Added the endpoint to the OpenAPI context contract and regenerated the 210-endpoint API index.
- Replayed the command twice against the real T-137 bridge. Both calls resumed PaperProject `P429` and ImplementationProject `implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b` with zero new owner roots and stable lineage.
- Completed full regression verification: shared 416/416; backend 2625 passed with 69 explicit environment-gated skips and zero failures; shared/backend typechecks passed.
- No desktop code, database schema, provider, auth, approval, or runtime configuration changed under the corrected scope.

## Files and modules touched

- dev-docs/active/topic-to-paper-implementation-semantic-handoff/
- .ai/project/main/ after governance synchronization.
- packages/shared/src/research-lifecycle/paper-implementation-contracts.ts
- packages/shared/src/research-lifecycle/paper-implementation-contracts.schema.test.ts
- apps/backend/src/services/paper-implementation-topic-handoff-service.ts
- apps/backend/src/services/paper-implementation-topic-handoff-service.unit.test.ts
- apps/backend/src/controllers/paper-implementation-controller.ts
- apps/backend/src/routes/paper-implementation-routes.ts
- apps/backend/src/routes/paper-implementation-routes.integration.test.ts
- apps/backend/src/app.ts
- docs/context/api/openapi.yaml and generated API indexes/registry metadata.
- Superseded external draft retained outside the repository: /Users/yurui/Desktop/My-Researcher-T138-UI-Mocks/t138-handoff-options.html.

## Decisions and tradeoffs

- Decision: use T-138 rather than reopen T-137 or extend T-043.
  - Rationale: T-137 is complete and T-043 is an umbrella; a reusable functional handoff is a distinct follow-up.
- Decision: do not rebuild downstream feedback/recheck.
  - Rationale: the feedback loop already has backend service, REST, persistence, automated tests, real Prisma readback, and a real product-LLM run.
- Decision: introduce one small composition endpoint instead of generalizing the T-137 coordinator.
  - Rationale: existing domain writers already own correctness and idempotency; general workflow productization would expand the task beyond the confirmed seam.
- Decision: the request carries one bridge id, while the response carries semantics plus read-only lineage.
  - Rationale: Topic Selection assigns the bridge id; the handoff service consumes that id. Hashes and downstream ids remain server-owned.
- Decision: keep the external HTML mock but remove its authority over T-138.
  - Rationale: the mock is harmless draft history, but no UI selection or implementation remains in scope.
- Decision: preserve the repository's normal Fastify request policy for unknown object keys.
  - Rationale: the shared schema declares one supported field, while Fastify strips unknown keys by default. Adding endpoint-specific rejection machinery would add validation ceremony without protecting authority because every sensitive value is server-derived.
- Decision: treat a successful PaperProject intake followed by a failed PI bootstrap as resumable persisted progress.
  - Rationale: the two existing services retain their own authority and idempotency; a compensating delete would destroy valid upstream state.

## Deviations from plan

- The initial desktop plan, mock-selection gate, UI tests, and UI governance work are superseded by the user's explicit functional-first direction.

## Known issues and follow-ups

- T-138 does not generalize T-137's fixed experiment profile or automate later Paper Implementation stages.
- A future UI may consume the semantic handoff command, but no UI task should start until a concrete user need appears.
- A future general research-flow coordinator must be proposed separately and must justify its semantics without exposing the current coordinator's large slot payloads to users or LLMs.

## Pitfalls and dead ends

- Keep the detailed append-only record in 05-pitfalls.md.
