# 03 Implementation Notes

## Initial decisions
- 决定先把 `research-varify` 规范化为正式 SSOT，再进入 runtime 实现。
- 决定 glossary 和 shared contracts 一起落，避免“文档名已定、代码类型未定”的双写窗口。
- 决定该任务不定义第二套 `title-card` 或 `paper-project` DTO，只定义 research-argument domain 自身接口。
- 决定 `SubmissionRiskReport` 与 `WritingEntryPacket` 在本任务内定稿为正式合同。
- 决定 canonical docs 必须带 requirements 映射，而不是只做设计搬运。
- 决定 canonical docs 实际落到 `docs/project/architecture/` 与 `docs/project/product/`，并通过 `docs/context/registry.json` 注册为 markdown artifact。
- 决定公开根对象统一使用 `ResearchArgumentWorkspace / workspace_id`，不导出 `ResearchArgumentProject / project_id`。
- 决定 shared export 采用 `1` 个公开 barrel + `4` 个内部 slice，而不是多 public subpath。
- 决定 `ActionQueueItem` 在 T-024 先冻结为 read-model 合同，避免 `T-027` 等待 `T-028` 才定义 action queue shape。
- 决定 bridge slice 现在就提供 request/response schema constants，冻结后续 Fastify route body 边界。

## Dependency notes
- 依赖 `research-varify/` 作为唯一设计输入目录。
- 依赖 `docs/context/` 作为 context artifact 与 glossary 的正式落点。
- 依赖 `packages/shared/src/research-lifecycle/` 作为 shared contract landing area。

## Implementation summary
- 已新增 canonical docs：
  - `docs/project/architecture/research-argument-framework.md`
  - `docs/project/architecture/research-argument-data-schema.md`
  - `docs/project/architecture/research-argument-planner-spec.md`
  - `docs/project/product/research-argument-control-plane-ui.md`
- 已更新：
  - `docs/project/overview/requirements.md`
  - `docs/context/glossary.json`
  - `docs/context/registry.json`
- 已新增 shared contracts：
  - `research-argument-domain-contracts.ts`
  - `research-argument-read-model-contracts.ts`
  - `research-argument-bridge-contracts.ts`
  - `research-argument-advisory-contracts.ts`
  - `research-argument-contracts.ts`
- 已把 shared schema smoke 扩展到 research-argument barrel、bridge schema 与 `workspace_id` canonical payload。
- 在 code-quality follow-up 中补强了 contract strictness：
  - `WritingEntryPacket.claim_strength` 现在受 `ClaimStrength` 枚举约束
  - `SubmissionRiskFinding.finding_group` 现在是必填且枚举化
  - `PromoteToPaperProjectResponse.packet_ref/report_ref` 现在固定到 sidecar artifact kind

## Open hooks
- 后续 `T-025` 仍需决定 persistence model 如何映射到这些 frozen contracts。
- 后续 `T-026` 仍需决定实际 route path 和 runtime bridge orchestration。
