# 02 Architecture

## Context & current state
- 仓库已完成 init，具备 monorepo、TypeScript、CI、local-first、环境与上下文基础设施。
- 当前重点是“规划可执行任务包”，不是直接实现模块代码。

## Task ownership boundary (with T-003)
- 本任务是“模块定义与任务包优先级”的 SSOT。
- `T-003` 是“4 阶段门禁 + LLM 自动化策略 + 模块 4~7 版本治理”的 SSOT。
- 共享边界契约: `dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`。

## Proposed design

### Components / modules
- Core foundation:
  - Paper Management
  - Literature Management
  - Research Direction Pool
- Research execution:
  - Theoretical Framework & Research Design
  - Experiment Design
  - Model & Training
  - Data Analysis & Discussion
- Delivery lifecycle:
  - Writing / Submission / Revision

### Interfaces & contracts
- API endpoints:
  - 仅维护任务包级接口占位，不维护阶段门禁或版本对象字段细节
- Data models / schemas:
  - 以模块包范围对象为核心，阶段门禁和版本主线字段由 `T-003` 定义
- Events / jobs (if any):
  - 仅记录需要的事件类型，不定义 LLM 编排策略细则

### Boundaries & dependency rules
- Allowed dependencies:
  - 上层模块依赖底座模块（文献、项目、追溯）
  - 写作模块依赖研究执行模块输出
- Forbidden dependencies:
  - 写作模块反向依赖训练执行内部细节
  - 外部 API 层绕过权限与审计边界
  - 在本任务中定义 4 阶段门禁和 4~7 版本冻结规则

## Data migration (if applicable)
- Migration steps:
  - 当前为规划阶段，暂无迁移执行
- Backward compatibility strategy:
  - 规划文档保持与现有蓝图兼容
- Rollout plan:
  - 按模块分批进入实现

## Non-functional considerations
- Security/auth/permissions:
  - local-first + 单用户优先 + 多设备同步授权边界
- Performance:
  - 高自动化 + 高频 API 调用需限流与重试策略
- Observability (logs/metrics/traces):
  - 关键流程需 run_id 可追踪

## Open questions
- 8 个任务包第一批是否先只做 3 个基础模块。
- 写作模块在 M0 是否只做集成编排而不做编辑器能力。
