# 02 Architecture

## Context & current state
- 仓库已完成 init，具备 monorepo、TypeScript、CI、local-first、环境与上下文基础设施。
- 当前重点是“规划可执行任务包”，不是直接实现模块代码。

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
  - TBD（按任务包逐个定义）
- Data models / schemas:
  - 以 claims/evidence/repro/issue 为核心对象，细节 TBD
- Events / jobs (if any):
  - 自动化任务编排、外部 API 调用、同步任务（细节 TBD）

### Boundaries & dependency rules
- Allowed dependencies:
  - 上层模块依赖底座模块（文献、项目、追溯）
  - 写作模块依赖研究执行模块输出
- Forbidden dependencies:
  - 写作模块反向依赖训练执行内部细节
  - 外部 API 层绕过权限与审计边界

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
