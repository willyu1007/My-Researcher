# Phase 10A — 当前语料校准报告

日期：2026-08-31
结论：**当前证据不足，Research Arena 继续保持建议模式。**

## 这次校准实际读取了什么

- 现有 `OfflineEvaluation` 数据集：`offline_eval_dataset_db8f792d-9c20-4df5-9b68-53719ca77f02`
- 当前语料案例：`offline_eval_case_fa12cf40-a3a5-4c9c-bb46-1118e051dcad`
- 确定性回放：`offline_eval_run_d64bd0c4-8074-4474-bf41-d9c6ef51bfe1`
- 技术追踪哈希：`143a4639c8b8c0ba964d109226a5f3b9715ba3620e72ad9a54e5afc26cf8847f`
- 来源 Arena：`research_arena_def21744-92fb-41cb-96f1-20798e76392a`

校准器重新读取并核对了 Arena 的 InputSnapshot、两个 EvidencePacket、两个角色执行、
v1 transcript、输出校验和与执行计数，没有使用调用方提供的观察结果。写入仅发生在既有
OfflineEvaluation owner；没有运行角色、调用供应商或改变研究状态。

## 已经证明的部分

- 这个历史案例确实是一次成功的“不继续推进”：关系检查通过。
- 两个角色使用的 EvidencePacket 都能重新解析到对应文献与检索记录：1/1 通过。
- transcript 与持久化角色执行可以一致回放：1/1 通过。
- 未发现来源漂移、权限越界、供应商调用、同轮角色相互暴露或无变化重试等硬阻断。

## 为什么仍然不能进入激活判断

- 当前只有 1 个历史非推进案例，没有两组优劣对照。
- 没有“关键证据应改变结论”和“无关证据不应改变结论”的正反扰动案例。
- 没有经改进流程产生并继续推进的正向案例。
- 现有两个角色执行是历史 v1 记录，不含可验证的 product-v2 调用审计，因此不能证明认知独立性。
- 没有严格人工的 accept、override 或确认非推进标签。
- 历史计数没有记录人工暂停次数，也没有测量避免了多少后续工作。

这些是“缺证据”，不是“机制已经失败”。因此报告返回 `insufficient_evidence`，而不是
`eligible_for_activation`，也没有把缺少样本平均进一个看似精确的总分。

## 读取方式与边界

完整的人读 Markdown 和更大的 LLM working set 可从以下只读接口重建：

`GET /topic-selection/research/arena/calibration/runs/offline_eval_run_d64bd0c4-8074-4474-bf41-d9c6ef51bfe1/report`

Phase 10A 到此只建立“能诚实说证据不足”的产品能力。收集最多六个 product-v2 案例属于
Phase 10B，需要单独授权；本报告本身不能激活策略。
