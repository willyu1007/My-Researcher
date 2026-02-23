# Roadmap

## Milestones
1. API contract freeze and repository/service boundary alignment
2. Read-model and endpoint implementation
3. Release-review gate write path + audit trace
4. Event emission and verification closure

## Scope
- Deliver backend contract implementation for:
  - `GET /paper-projects/:id/timeline`
  - `GET /paper-projects/:id/resource-metrics`
  - `GET /paper-projects/:id/artifact-bundle`
  - `POST /paper-projects/:id/release-gate/review`
- Emit incremental governance events defined in `T-005`.
- Keep compatibility with existing field groups (`lineage_meta`, `value_judgement_payload`, `snapshot_pointer_payload`).

## Out of scope
- Desktop UI implementation (belongs to `T-006`).
- Core training/experiment execution pipeline rewrite.
- Non-governance unrelated API refactors.

## Dependencies
- Contract source: `dev-docs/archive/analemma-borrowing-governance-v1/08-interface-delta-spec.md`
- Baseline governance semantics: `dev-docs/active/llm-research-lifecycle-governance-v1/`
- DB SSOT mode: `prisma/schema.prisma` + migration flow

## Risks
- New endpoints can drift from delta contract during implementation.
- Read-model queries may introduce performance regression under high event volume.
- Release-review write path may bypass audit guarantees if validation is weak.
