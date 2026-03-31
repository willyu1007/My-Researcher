# Research Argument Control Plane UI v1 Roadmap

## Decision
- Child task: `T-027 research-argument-control-plane-ui-v1`
- Mapping: `M-001 > F-001 > R-011`
- Primary goal: 在桌面端实现 research-argument control plane V1，让用户看到 readiness、branch、blocker、coverage、protocol/baseline/repro 状态、risk report、writing handoff packet、action queue 与人工确认点。

## Phases
1. Read-model alignment
2. Control-plane IA and screen scope
3. Desktop implementation and verification

## Explicit defaults
- 复用现有 desktop shell、`data-ui` 合约和 Tailwind B1 layout-only。
- 不重做 `title-card` 工作台 IA；该任务只做 research-argument control plane。
