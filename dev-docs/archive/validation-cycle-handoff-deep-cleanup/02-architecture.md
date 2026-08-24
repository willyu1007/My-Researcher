# T-144 Architecture

## Context & current state

`PaperImplementationValidationCycleHandoffService` is the only owner-root composition seam from a current EvidenceBoard to the existing validation-planning coordinator and T-095 writer. The service currently owns both orchestration and deterministic authority comparison. Persisted `artifact_payload` is a JSON object and therefore requires runtime validation even when its repository return type is a TypeScript interface.

## Proposed design

### Components / modules

- Existing handoff service: retains application sequencing, repository reads, coordinator calls, authority writers, blocker mapping, effects, and response assembly.
- New private handoff authority module: owns shared-schema parsing and pure deterministic comparisons/ref utilities.
- Existing test fixture builder: supplies a complete runtime artifact envelope; the handoff test overrides only workflow-specific fields.

### Dependency map

- `paper-implementation-validation-cycle-handoff-service.ts`
  - Incoming: app composition, controller type, route integration test, service unit test.
  - Outgoing: shared contracts, owner/runtime/validation repositories, coordinator, trace kernel, T-095 writer, private authority helper.
  - Public export remains unchanged.
- `paper-implementation-validation-cycle-handoff-authority.ts` (new, private)
  - Incoming: handoff service only.
  - Outgoing: Ajv, shared runtime/coordinator/validation/ref contracts, `AppError`, stable hash utilities.
  - No app wiring or barrel export.
- `paper-implementation-acceptance-bridge-test-fixtures.ts`
  - Incoming: existing acceptance fixture seeder and handoff unit test.
  - Change: separate envelope-build options from admission-service options so pure envelope construction needs no fake service cast.

### Interfaces & contracts

- REST endpoint remains `POST /paper-implementation/validation-cycle-handoffs`.
- Request and response schemas remain unchanged.
- Invalid persisted planning JSON maps to the existing immutable-authority `409 VERSION_CONFLICT` surface.
- No database or shared contract is added.

### Boundaries & dependency rules

- Allowed: application service imports private pure authority helpers.
- Forbidden: helper imports the application service, repositories, coordinator, trace kernel, writer, or app composition.
- Forbidden: direct provider SDK, credential, PAI, WorkOrder, Run, result, claim, or dossier effects.

## Data migration

- Migration steps: none.
- Backward compatibility: valid persisted authority and API responses are unchanged; invalid JSON now fails closed earlier.
- Rollout: focused tests, full Node 20 gates, commit/push `main`, and green CI.

## Non-functional considerations

- Security/auth/permissions: unchanged.
- Reliability: persisted JSON is validated before property access.
- Performance: Ajv validators compile once at module load; request-time validation is bounded to one selected artifact.
- Observability: existing `VERSION_CONFLICT` mapping remains the diagnostic surface.

## Open questions

- None. The cleanup uses existing schemas and private module boundaries.
