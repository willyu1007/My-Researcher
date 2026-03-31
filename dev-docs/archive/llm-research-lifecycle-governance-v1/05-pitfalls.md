# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- 规划任务必须在创建后立刻执行 governance `sync + lint`，否则任务索引会漂移。
- 写作/投稿模块不得直接写入研究版本对象（模块 4 到 7）。
- Prisma 在线烟测必须在 backend workspace 执行 `ts-node/esm`（`pnpm --filter @paper-engineering-assistant/backend ...`），避免 root loader 解析失败。
- `prisma db execute` 清理 schema 时不能同时传 `--url` 与 `--schema`；同时本地脚本要兼容 `pnpm <script> -- <args>` 传入的 `--` 分隔符。
- registry 中已归档任务若保留映射，必须保证 `dev_docs_path` 目录真实存在并带 `.ai-task.yaml`，否则会持续产生 governance warning。

## Pitfall log (append-only)

### 2026-02-21 - 初始化阶段无已解决坑点
- Symptom:
  - 当前无已解决故障。
- Context:
  - 任务处于规划初始化阶段。
- What we tried:
  - N/A
- Why it failed (or current hypothesis):
  - N/A
- Fix / workaround (if any):
  - N/A
- Prevention (how to avoid repeating it):
  - 后续出现问题后按模板补充完整记录。
- References (paths/commands/log keywords):
  - `dev-docs/active/llm-research-lifecycle-governance-v1/`

### 2026-02-22 - Prisma 烟测在 root 执行 `ts-node/esm` 失败（已解决）
- Symptom:
  - 在 repo root 直接执行 `node --loader ts-node/esm ...`，报错 `ERR_MODULE_NOT_FOUND: Cannot find package 'ts-node' imported from /Volumes/.../My-Researcher/`。
- Context:
  - 需要执行 Prisma 模式在线烟测，但 `ts-node` 仅安装在 `apps/backend` workspace。
- What we tried:
  - 先在 root 目录直接运行 loader 命令，失败后改为通过 workspace filter 调用。
- Why it failed (or current hypothesis):
  - Node 在 root 解析 loader 依赖，无法找到 backend 局部安装的 `ts-node`。
- Fix / workaround (if any):
  - 使用 `pnpm --filter @paper-engineering-assistant/backend test`（或在 `apps/backend` 目录执行同等命令）运行 smoke/test。
- Prevention (how to avoid repeating it):
  - 含 workspace 局部依赖的执行命令，统一通过 `pnpm --filter` 或切换到对应 workspace 目录运行。
- References (paths/commands/log keywords):
  - Archived Prisma smoke verification summary for run `20260222-203336-prisma-smoke` in `04-verification.md`

### 2026-02-22 - Prisma smoke 脚本参数与清理命令冲突（已解决）
- Symptom:
  - `pnpm ci:prisma-smoke -- --base-url ...` 首次运行报 `Unknown option: --`。
  - 清理步骤报错 `--url and --schema cannot be used at the same time`。
- Context:
  - 新增通用脚本 `ci/scripts/prisma-smoke.mjs` 并对接 CI workflow。
- What we tried:
  - 首先直接按 pnpm 透传参数执行；
  - 随后在 cleanup 中使用 `prisma db execute --stdin --url ... --schema ...`。
- Why it failed (or current hypothesis):
  - pnpm 透传参数会带入独立的 `--` token，脚本未忽略该 token。
  - `prisma db execute` 语义要求二选一：`--url` 或 `--schema`，不能同时传入。
- Fix / workaround (if any):
  - 在参数解析中显式忽略 `--` token；
  - cleanup 改为仅使用 `--url`（不传 `--schema`）。
- Prevention (how to avoid repeating it):
  - 所有可复用 CLI 脚本均应覆盖 `pnpm --` 透传场景；
  - 对 Prisma CLI 参数组合先以最小命令在本地验证，再固化到 CI 脚本。
- References (paths/commands/log keywords):
  - `ci/scripts/prisma-smoke.mjs`
  - Archived local Prisma smoke run `20260222-131721` summarized in `04-verification.md`

### 2026-02-22 - 历史归档任务路径缺失导致 governance warning（已解决）
- Symptom:
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` 持续提示 `T-001` 的 `dev_docs_path` 不存在。
- Context:
  - registry 保留了归档任务 `T-001`，但 `dev-docs/archive/unify-ci-verify-entrypoint` 目录在仓库中缺失。
- What we tried:
  - 保留 registry 记录，补建最小归档 task bundle。
- Why it failed (or current hypothesis):
  - 归档任务在 registry 中有明确路径约束，路径缺失会被 lint 识别为 warning。
- Fix / workaround (if any):
  - 新增 `dev-docs/archive/unify-ci-verify-entrypoint/.ai-task.yaml` 与 `00-overview.md`，恢复路径一致性。
- Prevention (how to avoid repeating it):
  - 清理或迁移历史任务时，必须同步维护 registry 与 archive 目录，避免单边删除。
- References (paths/commands/log keywords):
  - `dev-docs/archive/unify-ci-verify-entrypoint/`
  - `.ai/project/main/registry.yaml`
