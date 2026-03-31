# 01 Plan

## Phases
1. Object-set and persistence baseline
2. Repository / service scaffolding
3. State synthesis and recompute
4. Read models, audit logs, and verification

## Detailed steps
- Phase 1:
  - 固定 V1 对象集合：workspace、branch、problem、value hypothesis、contribution delta、claim、evidence requirement、evidence item、baseline set、protocol、repro item、run、artifact、boundary、analysis finding、issue finding、dimension state、report projection、decision、lesson。
  - 决定与现有 `title-card` / `paper-project` 的 foreign-key 或 bridge key 方案。
- Phase 2:
  - 新增 repository/service 边界。
  - 保持 business layer 不直接暴露 Prisma 细节。
  - 为 graph/report artifacts 增加 local-first classification、sync eligibility、authorization metadata、Git weak mapping refs 和 audit refs。
- Phase 3:
  - 实现 9 维 readiness state 的 manual / rule-driven synthesis。
  - 明确 `EvaluationSoundness` 由 `BaselineSet / Protocol / Run / Artifact / AnalysisFinding` 投影。
  - 明确 `ReproducibilityReadiness` 由 `Protocol / ReproItem / Run / Artifact` 投影。
  - 对对象变更挂 recompute trigger 或 queue-enqueue。
- Phase 4:
  - 暴露 `WorkspaceSummary`、`AbstractStateSnapshot`、`DecisionTimelineEntry`、`ClaimEvidenceCoverageRow`、`ProtocolBaselineReproReadiness`、`ReportProjection`。
  - 记录 typecheck / test / governance 验证。

## Entry criteria
- `T-024` 已冻结 shared nouns、DTO names 和 canonical requirements mapping。
- `title-card` / `paper-project` 现有 bridge keys 与 compatibility constraints 已完成 review。

## Exit review before `T-026` / `T-027`
- workspace / branch / object identity、upstream refs、downstream refs 已冻结。
- read-model DTO 和 projection 字段已冻结，`T-026` / `T-027` 不需要再发明新 shape。
- recompute trigger、queue 语义、audit refs 和 metadata hooks 已冻结。
- `EvaluationSoundness` / `ReproducibilityReadiness` 的投影来源已可解释且可测试。
