# Roadmap

> **2026-07-06 状态注记**:下方 Why/Exit 为立项期(2026-05)语境。现状——debate 已实装(v1a N6 divergent、v1b N6 divergent/N8 bounded、v1c N2 bounded micro,prompt 正文/provider 开启由 T-129 门控);矩阵/分类/场景绑定已成永久 SSOT 且机器校验(①②③+①尾巴,四 stage 全语义列);④穷举复核+⑤supplemental 裁决同日收口。**Exit Criteria 全部达成,包 State=done(收口 2026-07-06,不归档——一致性脚本读本包 08-scenarios 的路径依赖)。**

## Why This Exists
- Current backend can run ordinary LLM-backed decisions, but multi-agent debate is not yet well-defined enough to implement safely.
- The project needs a workflow review that says where debate improves decision quality, where it is unnecessary, and where Codex-assisted local acceptance is a better tool than direct provider calls.

## Target Outcome
- A complete topic-selection agent workflow matrix.
- Explicit debate candidates with roles, profiles, limits, and resolution rules.
- Clear implementation backlog that avoids ambiguous "just add agents" work.

## Exit Criteria
- Every topic-selection node has one recommended execution type.
- Debate nodes have product-grade contracts and audit expectations.
- Non-debate nodes have a rationale, so future work does not reintroduce semantic drift.
