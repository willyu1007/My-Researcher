# 00 Overview — T-133 paper-implementation debate 停驻出口收尾

## Status
- State: **in-progress（2026-07-18 开）**。承接 T-124 尾巴 tracker（`../paper-implementation-productization-hardening/15-t124-tail-tracker.md`）的 N2 + N6，独立成包。
- 前置：T-124 已 DONE（D10 五项验收签核，`../paper-implementation-productization-hardening/06-d10-acceptance-report.md`）；N1 已 DONE（gs-003 改 moderate claim 场景）。

## 定位（诚实框定，2026-07-18 与用户确认）
- **本包是什么**：paper-implementation 模块的产品完整性硬化——补齐 debate 停驻的**语义出口**，使任何语义有效的停驻都有"可复审续路"，而非终态死堵。
- **本包不是什么**：① 不是闭环 T-124（已 DONE，自有验收）；② 不是闭环"整个实验实施"（后者需 T-132 experiment-foundation + T-124↔T-132 真实验执行集成 + 上游模块喂入，属程序级里程碑；当前 golden 的实验面仍是注入论文数字的 acceptance 假体，"真跑实验"半链未行使——是更大的独立前沿）。
- **目的钉死**：**产品语义正确**（skeptic/evolution 该有复审出口）。golden 血缘 20/20 是副产品——**不以血缘数字为验收目的**（重申 N1 的纪律：不为凑数字做 override）。

## 收敛的两个尾巴项（同族但续路动作不同）
| 子项 | 停驻原因 | 应有续路 | 现状缺陷 |
|---|---|---|---|
| **N2 skeptic** | 输入有可修缺口（如 gs-003 `MNLI_GRADIENT_SUBSAMPLING_PROTOCOL_UNSPECIFIED`——素材故意留的 GT-9 缺口） | **改输入→重跑**（revise-and-retry） | skeptic 返回 `role_status=blocked` → lane A 终态 blocked，无复审续路；下游 probe/cycle 血缘缺失 |
| **N6 evolution** | park/split 血缘变更需人工签核 | **确认→继续**（confirm-and-continue，四点集#2 同族） | golden 流程中该停驻无产品化续链出口，三 run 均停于此 |

两者共用 coordinator 的 waiting_review + override 机器，但 override 动作不同（revise vs confirm）——这是本包的设计张力。

## 待议决策（P0 勘察后定，产出 D-133-x 记录）
- **D-133-1（N2 修法方向，A vs B）**：gs-003 skeptic 对"可修缺口"返回 `role_status=blocked` 到底是——
  - **(A) 分类错**：按 S3 确立的正交轴（`role_status`=我能否干活 / `recommended_disposition`=对输入的裁决），可修缺口该是 `passed + recommended_disposition=revise`，skeptic 误判成 blocked。修法=skeptic 契约/prompt 教它正确分类，coordinator 对 `passed+非proceed→waiting_review` 的路**可能已有**（四点集#1）。**改动小、治本**。
  - **(B) 需新路由**：某些 blocked 也该能进 waiting_review。修法=coordinator 加路由层。**改状态机、面更大、易引洞**。
  - 倾向 A，但**须 P0 勘察 skeptic 现有 role_status/disposition 语义 + coordinator waiting_review 现有路由后判定**，不预设。
- **D-133-2（revise/block 判定归属）**：可 revise vs 硬 block 的判定归**确定性服务**（按 blocker code taxonomy，如 D2-pre2 curation 先例）还是 **LLM 自 report**？**倾向确定性**——本模块花多个切片才堵上"LLM 控制治理路由"的洞（N-系列），不在此重开。
- **D-133-3（N6 续链语义）**：evolution confirm-and-continue 的 override 语义如何与 N2 的 revise-and-retry 共用 waiting_review 机器而不混淆两种 override 动作。

## 阶段
- **P0 勘察 + 决策（无代码）**：摸清 skeptic 三态语义、coordinator waiting_review 路由、evolution confirmation 停驻现状；判定 D-133-1（A/B）、定调 D-133-2/3；产出决策记录（本 overview §决策 追加）。**产出=可执行的 P1/P2 修法定案，不写实现。**
- **P1 skeptic revise 出口（N2）**：按 P0 决策实现。含契约/服务/coordinator 改动 + 8 角度复审 + L5 先注册。红线：revise/block 判定确定性；不放松任何既有治理门；gs-001/002 强路径与四点集#1 现有语义不破。
- **P2 evolution 确认续链（N6）**：复用 P1 的 coordinator 复审面同族实现 confirm-and-continue 出口。
- **P3 收口（D7）**：全量 stress+smoke+tsc + gs-003 及相关 golden 重跑（血缘副产品如通到 20/20 记录、不作目的；诚实记录实际结局）+ 代评审 + near-prod + 提交。迁移若涉及单独审批。

## 移交边界
- 不碰 T-132 / experiment-foundation；不动 golden 素材论文数字；不重开 T-124 归档。
- N3（light 地板探针）/N4（D4）/N5（D6）/N7（partial 表述）仍留 T-124 尾巴 tracker，非本包。
