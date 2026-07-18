# 00 Overview — T-133 paper-implementation debate 停驻出口收尾

## Status
- State: **in-progress（2026-07-18 开）**。承接 T-124 尾巴 tracker（`../paper-implementation-productization-hardening/15-t124-tail-tracker.md`）的 N2 + N6，独立成包。
- 前置：T-124 已 DONE（D10 五项验收签核，`../paper-implementation-productization-hardening/06-d10-acceptance-report.md`）；N1 已 DONE（gs-003 改 moderate claim 场景）。
- **P0 勘察 + 决策：DONE（2026-07-18）**。勘察事实=`01-p0-survey.md`；D-133-1/2/3 定案 + 用户四点裁定=本文 §决策；P1 工单=`02-p1-workorder.md`。
- **P1（N2 skeptic revise 出口）：代码面 DONE（2026-07-18）**；**P2（N6 evolution confirm-and-continue）：代码面 DONE（2026-07-18）**——实施记录=`03-implementation-notes.md`，P2 工单=`04-p2-workorder.md`。两阶段验证全绿（tsc / 全量 2261 例 0 fail / stress 461 passed 含 10 个 T-133 L5 / 三场景 smoke completed）。
- **P3（D7 收口）：DONE（2026-07-18，`05-p3-closeout.md`）**——三场景 live 重跑（N2 两种出口 live 行使、gs-003 目标闭环、P2 红线 live 实证、runner 权威链 bug live 抓获并修复）+ 8 角度代评审（13 项 CONFIRMED 全修复：含阻断级"校验 409 毁停驻"、治理级"零确认绕过 confirm"、shared 契约测试红灯等）+ 修复轮全绿（backend 2277/0、shared 374/0、stress 11 must-case、smoke ×3）。待提交。

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

## 决策（P0 定案，2026-07-18，用户签核）

勘察事实基础见 `01-p0-survey.md`（五条 load-bearing 事实 + file:line 锚）。

- **D-133-1（N2 修法）＝ A 的语义 + curation 式确定性实现，取"形状 2（passed-final）"**。判定：skeptic 对可修缺口的正确形状是 `passed + recommended_disposition=revise`（S3 正交轴 + D10 判断点②签核的抽象"debate 角色非 proceed disposition → waiting_review"）；gs-003 实际 artifact 已带 `disposition=revise`，缺陷在表达层与推导层，非状态机。但**纯 prompt 修不成立**——route-planning `finalStatus` 是双扳机（`blocker_codes 非空 || role_status=blocked → blocked`），passed 输出带 codes 仍会落终态。定案修法三层：① route-planning 对 skeptic 槽改**单扳机**推导（`final blocked ⇔ role_status='blocked'`；passed + blocking findings → final **passed**，codes 保留在 artifact 作审计实体，同 curation "gap codes 是批判的实体"先例）；② disposition 结构钳制（见 D-133-2）；③ 契约补 D2-pre2 式正交语义注释 + prompt 补 role_status 分类指引（辅助层，不承重）。**coordinator 零改动**——既有 `passed+非proceed→waiting_review` 分支（coordinator:1559-1564，设计好但从未触发）即是出口。弃"形状 1（curation 同构 blocked-final + 泛化 coordinator 例外分支）"：blocked 语义与 D2-pre2 形式化（blocker=输出不可用/技术性）相抵，且多改一处 coordinator。残余风险诚实登记：LLM 仍可能把可修缺口答成 `role_status=blocked` → 落终态 blocked 队列（诚实形态，人工 re-advance 重跑即可），不为此开 blocked→waiting_review 新路（即原 B 案，弃）。
- **D-133-2（revise/block 判定归属）＝ 确定性，形态是"结构钳制"而非 blocker-code taxonomy**。事实前提：可修 vs 硬阻断的 code taxonomy 不存在，gs-003 三码与 N6 停驻码全是 LLM 自产自由字符串，无法确定性分类。定案：确定性层完全基于**结构化字段**——skeptic 侧 `proceed ⇔ 无 blocking finding`（LLM 报 blocking finding 却答 proceed → 服务端赢、改判 revise + echo drift warning，照搬 curation:952-960 先例；无 blocking finding 而答 revise → 尊重，错误只朝安全方向=送人审）；evolution 侧 `human_decision_required` 由 option_kind/impact_class 确定性推导（PORTFOLIO_CHANGING 判定集合已存在于 evolution:333-339，现仅用于强制打旗守卫，提升为 final artifact 推导字段）。LLM 永远无法用任何字段把自己路由绕过治理门。
- **D-133-3（N6 续链语义）＝ stop-kind + 双动词，confirm 不重跑**。共用 waiting_review 机器，靠停驻类别字段区分：`disposition_revise`（skeptic/curation）→ 动词 **revise-and-retry**（现有 `slot_request_payload_overrides` 改输入 → re-advance 整槽重跑，disposition 从不伪造）；`human_decision_required`（evolution）→ 动词 **confirm-and-continue**（人先走权威链建确认+决策——机器 100% 现成，advance 带 decision/confirmation ref，coordinator 确定性校验 ref（决策存在、approved/applied、target 覆盖槽 artifact motives、确认已消费）→ step 记 confirmed 通过，**不重跑**）。理由：人已决策完，重跑 decision support 是语义倒置 + 多付 provider 费 + 引入非确定性；step 记录"human-confirmed continuation"而非伪造 role 产出（四点集#2"确认是一等记录被权威写消费"同族，签核已把 motive 确认类停驻归入语义停驻家族）。coordinator 做动词↔停驻类别确定性校验，两动词永不混淆。弃备选"decision refs 注入 payload 重跑"。
- **用户四点裁定（2026-07-18）**：① D-133-1 取形状 2；② confirm 动词取 ref 校验直通不重跑；③ gs-003 重跑诚实预期=`waiting_review → 一次载荷不变 override → 大概率仍 revise → waiting_review_terminal`（GT-9 缺口是素材故意埋的，血缘不追 20/20）；revise-and-retry 全链行使证据放 **integration 测试或 scratch 副本素材**，canonical gs-003 素材语义不动；④ 审计面：P2 给**两种动词都补最小审计**（step/stop 元数据记 actor+refs，不新增表；迁移如确需单独审批）。
- **附带更正（登记）**：① T-124 尾巴 tracker 所引 `HUMAN_CONFIRMATION_REQUIRED_FOR_LINEAGE_CHANGE` 非后端常量，是 LLM 自产 blocking code（全 backend/packages 零命中，仅存于 golden 落盘 fixture）——本包文档一律按"LLM 自产码"表述；② `dossier_export` 确认 scope 在契约存在但全后端无消费方（四点集#3 目前纯靠 runner 自律）——跨包事实，登记备查，不在本包修。

## 原待议决策（P0 勘察前的框定，留档；已被上节定案取代）
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
