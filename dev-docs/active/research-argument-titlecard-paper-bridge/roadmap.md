# Research Argument Titlecard Paper Bridge Roadmap

## Decision
- Child task: `T-026 research-argument-titlecard-paper-bridge`
- Mapping: `M-001 > F-001 > R-011`
- Primary goal: 把 `title-card` 的 evidence / need / question / value 结构化为 research-argument workspace 输入，并在 readiness verify 通过后，以 sidecar handoff artifact 方式桥接到现有 `paper-project` 创建流。

## Phases
1. Title-card seed/init design
2. Readiness verify and decision write path
3. Promote bridge and guardrails
4. Verification and handoff

## Explicit defaults
- 不改 `title-card` source object ownership。
- 不改 `paper-project` downstream contract；只新增 bridge。
- `WritingEntryPacket` 与 `SubmissionRiskReport` 由 research-argument 域先生成，再通过 ref/audit link 交给 downstream。
