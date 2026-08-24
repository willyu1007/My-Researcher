# 仓库治理收敛 / Repository governance convergence — Architecture

## Final authority model

1. The fixed task-governance contract owns task metadata, active task records, archive summaries, and project-hub projections.
2. `.ai/project/registry.json` is the project graph authority; `dashboard.md` and `feature-map.md` are derived views.
3. `.ai/scripts/ctl-project-governance.mjs` and its four `governance-*.mjs` libraries are the only repository governance implementation retained under `.ai/`.
4. Repository-local skill trees and their wrapper/sync mechanisms have no compatibility role and are removed.
5. Runtime UI CSS is a compatibility asset under `ui/styles/`; removed UI approvals, codegen, token-source, and contract scaffolding are not runtime authority.
6. Archived task bundles are compact historical records. Live fixtures, scenario contracts, scripts, and process documentation belong to maintained module/docs paths.

## Final topology

```text
dev-docs active/archive task records
                |
                v
.ai/scripts/ctl-project-governance.mjs
                |
                v
.ai/project/registry.json
        +--> dashboard.md
        +--> feature-map.md

maintained runtime assets
        +--> apps/backend/scripts and test-fixtures
        +--> docs/context process/UI contracts
        +--> env/scripts
        +--> ui/styles runtime compatibility CSS
```

## Contracts and invariants

### Identity and lifecycle

- Task IDs remain stable and unique. The conversion preserves every existing `T-###` identity.
- T-043 and T-129 remain planned and active; T-145 remains active until this migration is verified and archived.
- All 142 archived bundles contain exactly `.ai-task.json` and `summary.md`.
- Active bundles retain their task metadata and maintained planning/status documents; the governance reader tolerates additional durable task documents.

### Project graph

- The semantic graph remains exactly M-000/M-001 and F-000/F-001/F-002 with the same edges and fields.
- The 13 retired Requirement records remain migration provenance only; they are not promoted into Features or retained as a parallel registry model.
- T-145 uses reserved inbox placement F-000/M-000.

### `.ai` boundary

- Allowed content is `.ai/project/**`, `.ai/scripts/ctl-project-governance.mjs`, and `.ai/scripts/lib/governance-*.mjs`.
- Product validation, fixtures, LLM routing, scenario harnesses, and repository-local skills must not regain authority under `.ai`.
- Independently supported checks live with their owning backend module; historical one-off gates are retired rather than preserved behind aliases.

### UI boundary

- `ui/styles/ui.css`, `tokens.css`, `contract.css`, and `desktop-runtime/**` remain loaded runtime compatibility CSS.
- The retained filenames do not imply that the retired UI governance/code-generation model remains authoritative.
- This migration intentionally makes no visual or component-architecture change. A later UI redesign may replace the compatibility layer as a separate task.
- Retired renderer style paths are not recreated.

### Archive and live-content boundary

- Archive compression is permitted only after consumer scans and relocation of live content.
- Maintained copies now own the D-19 and N8 fixtures, environment utilities, Topic Workbench contract, N8 calibration contract, and topic-selection scenario contract.
- Commit `5cf904fb` is the complete normalized old-contract recovery point if historical detail beyond a compact summary is needed.

## Interfaces and ownership

- Governance: `node .ai/scripts/ctl-project-governance.mjs lint --strict`, `sync`, `query`, and project queries supplied by the fixed assets.
- Task state: the active bundle's `01-status.md`; task identity: `.ai-task.json`.
- Project mapping and graph: `.ai/project/registry.json`; Markdown project views are regenerated.
- Backend validation: supported general-purpose checks under `apps/backend/scripts/` and root/package commands that point there.
- Environment control: `env/scripts/env_localctl.py` and `env/scripts/yaml_min.py`.
- UI runtime: renderer imports plus `ui/styles/**`; no separate governance manifest or approval path.

## Migration and recovery

- Application/database migration: none.
- Repository-record migration: 142 archived and three active task bundles plus the project hub.
- Backward compatibility: none for the retired task/skill/UI governance mechanisms. Recovery is Git-based, not a committed dual authority.
- Known coherent checkpoints:
  - `405c6049`: live assets detached from removal-bound historical paths.
  - `5cf904fb`: lifecycle normalized while the old contract remained complete and valid.
- Failure response: restore a coherent checkpoint and reclassify a disputed consumer; do not reintroduce broad compatibility machinery.

## Non-functional properties

- Auditability: stable IDs, normalized graph/task comparisons, task-linked commits, and durable verification evidence.
- Recoverability: old-contract Git checkpoint plus compact new archives.
- Simplicity: one governance authority, one project hub, module-owned runtime tools, and no repository-local skill framework.
- Runtime safety: no product feature, schema, API, LLM behavior, or visual redesign is part of the cutover.
