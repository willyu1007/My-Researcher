# Roadmap

## Scope and constraints

### In scope
- Make `.ai/llm` the repository and runtime authority for provider, model, native parameter, prompt-reference, and tool configuration used by existing production LLM workflows.
- Preserve the current secure user-settings path, provider protocol adapters, retries, telemetry, structured-output contracts, replay behavior, and workflow semantics while configuration moves.
- Align UI change guidance and the current UI design record with `manage-ui-style`, grounded in the desktop runtime's consumed tokens, components, and user tasks.
- Align packaging, CI checks, and maintained documentation with the resulting runtime contracts.

### Out of scope
- A visual redesign, UI framework replacement, or speculative design-system rewrite.
- Changing supported providers, model behavior, prompt meaning, workflow business policy, or user-visible secret-management behavior.
- Restoring deleted repository-local skills, legacy approval gates, or the former `.ai/llm-config` YAML tree.

### Constraints and dependencies
- Configuration files must be available from local development, tests, packaged backend execution, and deployment entry points.
- Existing persisted profile selections and encrypted provider secrets are product data and remain authoritative for user overrides.
- Prompt identifiers, schema contracts, hashes, and idempotency inputs must remain stable unless an intentional compatibility boundary is recorded and verified.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| LLM configuration authority | Restore legacy YAML; keep hardcoded runtime values; adopt `.ai/llm` | Adopt the `manage-llm-config` layout and connect it to runtime | decided | User | User instruction on 2026-08-24 | Runtime must load and validate the repository configuration; the old YAML mechanism stays deleted. |
| UI conformance depth | Rewrite current UI; restore legacy governance machinery; align the live authority and working rules | Preserve the current runtime and align its design/change record; use a static HTML mock only for later non-trivial visual changes | decided | User | User instruction plus `manage-ui-style` contract | This task introduces no visual redesign and no blanket framework migration. |
| Existing user model settings | Replace with repository-only configuration; preserve as controlled overrides | Repository config supplies shipped options/defaults while persisted user selections and secure secrets remain supported overrides | decided | Product/runtime evidence | Existing settings services and user-facing configuration behavior | Avoids data loss and a security regression while removing duplicated shipped defaults. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The current LLM gateway is the narrowest shared runtime seam for configuration loading. | Migration would leak into many workflow services or create a second dispatcher. | Trace all production LLM and embedding entry points before settling the loader interface. |
| Current UI tokens and desktop runtime styles are the consumed design authority. | Guidance could canonize dormant or generated assets. | Trace renderer imports and representative component usage from declaration to call site. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-145 | derived-from | T-145 converged repository governance and removed the stale `.ai/llm-config`; this task introduces the current `.ai/llm` runtime contract without restoring the legacy mechanism. | Preserve the governance boundaries and fixed assets established by T-145. |
| T-129 | sibling | T-129 owns externally gated topic-selection calibration and provider-debate activation; this task owns configuration location and loading only. | Do not activate or fabricate T-129 calibration outcomes during migration. |

## Implementation plan

### Phase 1 — Runtime and UI authority inventory
- Outcome: A complete, evidence-backed migration map with no unresolved implementation-blocking choice.
- Approach: Trace LLM calls, providers, prompts, selectable profiles, packaging paths, and current UI style consumption before changing behavior.
- Planned changes:
  1. Record the settled configuration, compatibility, and UI authority boundaries.
  2. Define focused verification for configuration loading, profile compatibility, prompt identity, packaging, and UI governance.
- Affected boundaries / entry points: backend composition, LLM gateway, settings services, topic-selection and paper-implementation workflow registries, renderer style entry point, maintained guidance.
- Dependencies: Existing tests and repository/package entry points must be discoverable.
- Exit criteria: Every production LLM call is assigned to a feature config or explicitly excluded as business logic; the first implementation slice is executable.
- Verification: Source inventory, positive-control UI style trace, existing test seam review, and governance lint.
- Recovery: Documentation-only checkpoint; revert the task plan without affecting runtime.

### Phase 2 — Configuration foundation and gateway integration
- Outcome: `.ai/llm` provider and feature configuration is validated and consumed through one shared loader while current behavior remains compatible.
- Approach: Add the smallest typed loader and tests, then replace shared hardcoded provider endpoints and shipped model defaults at the gateway/settings seams.
- Planned changes:
  1. Add provider and feature configuration using the current JSON contract and external prompt files.
  2. Wire the loader into backend composition and preserve secure runtime overrides.
  3. Prove local and packaged path resolution through focused tests.
- Affected boundaries / entry points: `.ai/llm`, backend bootstrap/composition, gateway, settings/profile services.
- Dependencies: Phase 1 inventory and settled compatibility contract.
- Exit criteria: Provider/model/parameter configuration for the migrated slice has one repository authority and no parallel hardcoded default.
- Verification: Loader schema/path tests, gateway/settings tests, typecheck, and focused lint.
- Recovery: Revert the integration commit to restore the previous hardcoded defaults without changing persisted settings.

### Phase 3 — Prompt and workflow convergence
- Outcome: Existing production prompt and tool configuration is externalized by feature without changing semantic or replay contracts.
- Approach: Migrate workflow groups incrementally, retaining code-owned control flow and structured-output schemas.
- Planned changes:
  1. Move prompt text and tool lists into feature-owned `.ai/llm` files.
  2. Replace duplicate workflow registries/defaults with typed config lookups.
  3. Remove superseded inline prompt/configuration authority after each verified slice.
- Affected boundaries / entry points: literature processing, topic selection, paper implementation, invocation registries, semantic hash inputs.
- Dependencies: Phase 2 loader and compatibility tests.
- Exit criteria: All in-scope production calls resolve configuration from `.ai/llm`; business policy and schemas remain code-owned.
- Verification: Focused workflow tests, prompt/config completeness check, replay/hash compatibility checks, typecheck, and lint.
- Recovery: Workflow-group commits provide independent rollback points.

### Phase 4 — UI, CI, packaging, and documentation closure
- Outcome: The repository explains and enforces the live LLM/UI contracts without restoring obsolete governance machinery.
- Approach: Update the smallest maintained UI record and repository guidance; add only CI/package checks that prevent concrete runtime drift.
- Planned changes:
  1. Record actual UI users/tasks, authority order, reuse rules, icon source, accepted deviations, and the static-mock gate for future non-trivial visual work.
  2. Ensure `.ai/llm` ships to every supported runtime and is validated by an existing verification entry point.
  3. Reconcile README, AGENTS guidance, task evidence, and project hub.
- Affected boundaries / entry points: UI context record, root guidance, package/deploy inputs, CI verification, task governance.
- Dependencies: Runtime migration complete.
- Exit criteria: Maintained docs and checks describe the same active contracts as the code and configuration.
- Verification: CI-equivalent checks without a build, governance lint, focused documentation/source review, and clean residue scan.
- Recovery: Revert documentation/check changes independently from the working runtime.

## Kickoff gate

- Status: ready
- [x] Decisions: the user confirmed `.ai/llm` adaptation, preservation of product behavior, and `manage-ui-style` conformance without a visual rewrite.
- [x] Design: the shared loader, feature boundaries, compatibility ordering, and UI authority are settled in `02-architecture.md`.
- [x] Route: the phased route reaches one runtime authority and starts with a focused literature/configuration slice that can be independently rolled back.
- [x] Verification: exact configuration, compatibility, UI, type, and governance checks are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Externalized prompt bytes change cache, replay, or idempotency behavior. | Hash/replay fixture or focused workflow regression differs. | Preserve exact prompt content and stable logical IDs; verify before removing inline sources. | Roll back the affected workflow-group commit. |
| `.ai/llm` is present in the repository but absent from a packaged runtime. | Packaged-path resolution test or artifact inspection fails. | Resolve from an explicit application root and add the directory to packaging inputs. | Keep the prior defaults until packaging evidence passes. |
| Repository config accidentally displaces encrypted user secrets or persisted selections. | Settings/gateway tests fail or effective profile differs. | Treat repository values as shipped defaults and preserve controlled overrides. | Revert integration without mutating persisted data. |
| UI rules trigger an unjustified visual rewrite. | Proposed change lacks a demonstrated divergence and consequence. | Limit this task to the consumed authority and working record; require a static mock for later non-trivial visual changes. | Drop visual changes and retain documentation-only conformance. |

## Phase closeout

- Review: Review each phase for duplicate authority, behavior drift, secret exposure, and unintended UI scope.
- Record update: Keep status, architecture, implementation map, and verification aligned with the first unfinished action and decisive evidence.
- Checkpoint: Commit each verified migration unit with exactly one `Task: T-###` trailer.
