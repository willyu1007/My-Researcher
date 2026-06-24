# Roadmap — 选题管理产品就绪收口（T-128）

> 宏观相位 + 外部门控尾巴。详细工作项见 `01-plan.md`，进度见 `03-implementation-notes.md` 矩阵。

## 里程碑
- **M-PRC-0 立项 + 台账**（Phase 0）：建包治理收口 + 撰写状态台账 + 孤儿开口认领。
- **M-PRC-1 非-debate prompt 产品化**（Phase 1）：v1a / v1b 非-debate / v1c / 资源采样 正文定稿（最大块，可并行）。
- **M-PRC-2 产品跑使能**（Phase 2）：live-surface 分类 + product model_option + 场景 + canary。
- **★ M-PRC-3 首次真跑 sign-off**（Phase 3）：非-debate 路径真实 `run_mode:'product'` 端到端跑通 = **产品级可达性核心 sign-off**。
- **M-PRC-4 结构硬化**（Phase 4，宽 DoD 主体）：P-01 压缩恢复（product-robust）+ N6 可达性 + v1c-N2 接线 + provider_llm debate 管路预接 + D5 HumanOverride/Trace + sign-off 工件 schema。
- **M-PRC-5 外部门控尾巴**（Phase 5，track-and-defer）：真标定翻门 + 语料耦合 debate 正文 + provider_llm debate 开启。

## 关键路径
```
M-PRC-0 → M-PRC-1 → M-PRC-2 → ★M-PRC-3   (可达性核心)
                M-PRC-4 (与 1–3 并行，宽 DoD 必收)
                              M-PRC-5 (外部门控，不阻塞前四相)
```

## 门控与外部依赖
- **product-reachable**（M-PRC-3）：仅需工程闭环（prompt 定稿 + model_option + 场景）。
- **product-robust**（M-PRC-4 / W-11）：超预算长上下文输入不再 fail-closed。
- **外部硬门**（M-PRC-5）：≥100 多 provider 人工标注语料 + FP<5% + 记录 stakeholder sign-off + 独立 content-grounded assessor —— **工程造不出，无排期承诺**；维持 N8/N6 provisional + tripwire 为无限期稳态，语料到位即一步翻门（W-16 sign-off schema 已备）。

## 与其它包
- 协调 **T-088**（harness 边界 + D6 JD）、**T-124**（P-01 压缩恢复跨包）。
- 写入 **T-089**（live-surface 切片），余穷举复核留 T-089 backlog。
- 承接 **T-127**（done）的 D5/D8/D6 决策与 W-13 标定尾巴。
