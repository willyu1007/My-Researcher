# INIT-BOARD（初始化看板）

> 阶段状态看板。输入记录在 `init/START-HERE.md`。

## Focus now
- 初始化已完成，等待进入实现阶段。

## Next actions (human/LLM)
1. 视需要执行 `update-root-docs`（更新根目录 README/AGENTS）。
2. 视需要执行 `cleanup-init --archive`（归档并移除 init 套件）。
3. 进入实现阶段，按优先级讨论 8 个子功能边界并开始开发。

## Key paths
- `init/START-HERE.md`
- `init/_work/stage-a-docs/`
- `init/_work/project-blueprint.json`
- `init/_work/.init-state.json`

<!-- INIT-BOARD:MACHINE_SNAPSHOT:START -->
## Machine snapshot (pipeline)

- stage: complete
- pipelineLanguage: zh
- llm.language: 中文
- stateUpdatedAt: 2026-02-21T05:43:57.702Z
- lastExitCode: 0

- stageA: mustAsk 8/8; docs 4/4; validated yes; approved yes
- stageB: drafted yes; validated yes; packsReviewed yes; approved yes
- stageC: wrappersSynced yes; skillRetentionReviewed yes; approved yes

### Next (suggested)
- Migrate glossary: transfer terms from `init/_work/stage-a-docs/domain-glossary.md` to `docs/context/glossary.json`, then run `ctl-context touch`.
- Initialization complete. Optional: run `cleanup-init --apply --i-understand` to remove init/.

<!-- INIT-BOARD:MACHINE_SNAPSHOT:END -->
