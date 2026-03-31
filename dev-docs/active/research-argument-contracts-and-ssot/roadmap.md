# Research Argument Contracts And SSOT Roadmap

## Decision
- Child task: `T-024 research-argument-contracts-and-ssot`
- Mapping: `M-001 > F-001 > R-011`
- Primary goal: 把 `research-varify` 的四份输入文档规范化为仓库正式 SSOT，并补齐 shared domain contracts、glossary/context 落点、requirements 映射与 cross-link。

## Why this task comes first
- graph/state、bridge、UI、planner 都依赖统一的命名、文档和 contracts。
- 若先写 runtime，再回头整理 SSOT，后续很容易出现双写和语义漂移。

## Phases
1. Intake normalization and source mapping
2. Canonical docs landing
3. Shared contracts and glossary/context
4. Verification and handoff

## Explicit defaults
- `research-varify/` 保留为 intake 目录，不作为长期 SSOT。
- Canonical 命名使用 `Research Argument Control Plane`。
- 本任务只落 docs / contracts / context，不改 runtime 行为。
- risk report / writing handoff 相关合同与术语在本任务内定稿。
