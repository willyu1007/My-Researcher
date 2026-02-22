# Roadmap

## Milestones
1. Desktop scaffold baseline (Electron + React + Vite + TypeScript)
2. Brand theme landing (morethan tokens + logo assets)
3. Research lifecycle UI shell (module navigation + workspace panels)
4. Integration hardening (IPC contracts, local persistence, packaging prep)

## Scope
- Build a local-first desktop shell under `apps/desktop`.
- Reuse repo UI contract (`ui/tokens`, `ui/styles`, `ui/contract`) and add brand theme.
- Produce frontend task packages with clear delivery batches.

## Out of scope
- Full production release packaging/signing in this task.
- Replacing backend architecture or adding cloud deployment.

## Risks
- Electron main/preload security drift.
- Theme landing deviating from existing data-ui contract constraints.
- Desktop runtime scripts conflicting with monorepo conventions.
