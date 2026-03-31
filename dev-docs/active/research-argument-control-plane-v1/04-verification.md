# 04 Verification

## Planned checks
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- `rg -n "R-011|T-023|T-024|T-025|T-026|T-027|T-028" .ai/project/main/registry.yaml`
- `Get-ChildItem dev-docs/active/research-argument-*`

## Executed checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result:
    - `[ok] Sync complete.`
    - regenerated:
      - `.ai/project/main/dashboard.md`
      - `.ai/project/main/feature-map.md`
      - `.ai/project/main/task-index.md`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result:
    - `[ok] Lint passed.`
- [pass] `rg -n "R-011|T-023|T-024|T-025|T-026|T-027|T-028" .ai/project/main/registry.yaml .ai/project/main/dashboard.md .ai/project/main/feature-map.md .ai/project/main/task-index.md`
  - Result:
    - `R-011` 与 `T-023` 到 `T-028` 已出现在 registry / derived views。
- [pass] `Get-ChildItem dev-docs/active/research-argument-*`
  - Result:
    - 6 个 research-argument active bundle 目录均已创建。

## Umbrella close review
- [ ] `T-024` 到 `T-028` 的 entry / exit review 都已执行并记录。
- [ ] 端到端 walkthrough 已验证 `title-card -> workspace -> readiness -> risk report / writing packet -> paper-project`。
- [ ] 所有 external dependency 都已在 coverage matrix 或 task docs 中显式标注 owner。
