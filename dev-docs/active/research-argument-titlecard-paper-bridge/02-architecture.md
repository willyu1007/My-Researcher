# 02 Architecture

## Ownership split
- Source owners:
  - `title-card` bounded context
- Middle-layer owner:
  - research-argument workspace / readiness / decision
- Destination owner:
  - existing `paper-project` contracts

## Frozen bridge rules
- seed/init 只能读取 `title-card` canonical surface。
- readiness verify 结果必须来自 research-argument workspace，而不是直接读取 `title-card` value assessment。
- `ReadyForWritingEntry` 检查必须覆盖 claim/evidence、baseline/protocol、repro readiness。
- research-argument 域必须先生成：
  - `WritingEntryPacket`
  - `SubmissionRiskReport`
- promote bridge 必须保留 evidence / claim / decision traceability。
- bridge 只向 `createPaperProject` 传递现有兼容字段；`paper-project` 通过 ref/audit link 回链到 packet/report。
- 非 `ReadyForWritingEntry` workspace 不得进入 `paper-project` 创建流。

## Public bridge surfaces
- Commands:
  - `SeedWorkspaceFromTitleCardRequest` / `Response`
  - `ReadinessVerifyRequest` / `Response`
  - `DecisionActionRequest` / `Response`
  - `PromoteToPaperProjectRequest` / `Response`
- Queries:
  - `get workspace summary`
  - `get abstract state snapshot`
  - `get writing entry packet`
  - `get submission risk report`
- Minimum request/response semantics:
  - seed/init 必须至少接受 `title_card_id`、source refs、selected literature evidence refs，并返回 `workspace_id` / `branch_id` / seed trace。
  - readiness verify 必须返回 `WorthContinuing` / `ReadyForWritingEntry`、blockers、dimension verdicts、missing items。
  - decision action 必须记录 action、reason、actor、audit note；高风险动作必须要求 confirmation note。
  - promote bridge 必须返回 `paper_id`、packet ref、report ref，并保留 traceability。

## Out of scope
- rewriting title-card CRUD
- rewriting paper-project DTOs
- planner / critic ranking logic
