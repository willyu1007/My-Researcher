# Phase 10B-2 — 语料资格预检停止记录

日期：2026-08-31
结论：**在冻结六槽协议和注册首个案例之前停止。当前产品语料没有一条可直接用于新 product-v2 校准成员的题目链。**

这不是把 Arena 判为无效，也不是一次校准结果；它是预注册前的资格检查。继续凑案例会把不可解析证据、已经耗尽重试的历史链路或事后修补混入样本，违背 Phase 10B 的固定协议和 early-stop 规则。

## 实际检查了什么

本次只通过本地产品 HTTP API 读取 TitleCard、EvidenceMap、EvidenceUnit、NeedCandidate、checkpoint、Arena session 和 stage manifest，并使用只读的 EvidencePacket 解析接口逐条核对候选证据。没有直接读取数据库，没有运行角色、调用供应商、写人工标签或改变研究状态。

- TitleCard 库存：1,183 条。这个数字是产品 TitleCard 记录数，不是去重后的论文数或可研究题目数。
- 结构性预筛：703 条 TitleCard 同时具有至少一张 `ready/current` EvidenceMap 和至少一个 NeedCandidate。它只说明记录存在，不说明证据可被模型读取。
- 可定位证据：只有 5 张现行 EvidenceMap 含非 `manual` locator，共涉及 3 条 TitleCard 链路。
- 实际解析：上述 5 张 map 中，只有 1 张能把全部 EvidenceUnit 解析成 claim-bearing 文本；但它所在链路已经完成两次 Arena 尝试，且没有现行待决 gap checkpoint，不能成为新的 product-v2 成员。

## 五张非手工定位 EvidenceMap 的结果

| 题目链 / EvidenceMap | EvidenceUnit 解析 | 资格结论 |
|---|---:|---|
| T-147 positive repaired — `evidence_map_de5e35b6-48d9-4513-8aff-fd7e5894e1fc` | 11/11；9,328 字符；packet hash `bda7be262894dd69777fd1c406a6b50de800792e48234915a5be0990851e3f07` | 证据本身可用，但同一 TitleCard 还有另一张现行 map；现行 Arena 已是第二次尝试，服务禁止第三次尝试；没有现行待决 gap checkpoint。不能新建合格成员。 |
| T-147 positive original — `evidence_map_15a7c143-a26a-4059-98f7-9c9d8f2b71b8` | 0/5 | 五条 paragraph locator 均因 canonical quote integrity 不匹配而失败。 |
| T-147 negative — `evidence_map_92ba546b-f11c-4c45-8149-1556f3f41809` | 0/4 | 四条 paragraph locator 均因 canonical quote integrity 不匹配而失败。 |
| SciFact rehearsal new — `evidence_map_94d58347-d253-4dfb-aafb-1b5b8ea7cdc9` | 0/4 | 三条 abstract 与一条 paragraph locator 均未通过 canonical quote integrity。 |
| SciFact rehearsal old — `evidence_map_ebf32522-2798-4275-a7b9-6a26b92f7ee6` | 0/4 | 四条 abstract locator 均未通过 canonical quote integrity；同一 TitleCard 同时有两张现行 map。 |

已审阅的其他 SciFact v1/v2 与 RAG-vs-Fine-Tuning 候选仍使用 `manual` locator，不能充当可归因、可重放的模型可见证据。数据库中记录较多，因此不等于存在足够的校准语料。

## 额外发现的操作边界缺口

Phase 10B v2 recipe 要求：InputSnapshot 的 target 必须是某个 NeedCandidate，source 必须精确等于 recipe 的 candidate refs 与 evidence refs。当前公开 HTTP 面只提供“基于第一次 Arena 的 evidence-repair retry snapshot”准备接口；初始 v2 snapshot 的编译仍是内部服务能力。现有 gap checkpoint snapshot 的 target 是 `need_candidate_arena`，也不能直接替代。

因此，即使先修好语料，仍需要一个很小的产品化准备边界，或者明确修改 v2 recipe；不能由操作员绕过 API 直接拼装 InputSnapshot。这个缺口没有在本次预检中触发产品写入，但会阻断后续规范执行。

## 停止点和影响

- 六个 slot 尚未冻结为实际成员配方；十个精确 session/label recipe 尚未绑定。
- 第一 tranche 注册案例数：0；新建 Arena session：0；角色调用：0；人工标签：0；供应商调用：0。
- 没有创建 Phase 10B dataset、case、run 或 report，也没有改变 checkpoint、candidate、promotion、bridge 或 PaperProject authority。
- 现有 ambiguous promotion gate 与待决 evidence checkpoint 保持不变。

Phase 10B-2 按 `stop_before_protocol_freeze` 停止。下一步需要研究者单独审阅：可以接受这是一次决定性停止，并在 Phase 10C 选择继续 advisory；也可以授权一个有明确证据/协议差异的有限修复与重规划。恢复时不能沿用本次未完成批次静默补样，必须先说明新增证据或协议变化，再重新审阅并注册。
