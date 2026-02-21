<!-- INIT:STAGE-A:NFR -->

# Non-functional Requirements (NFR)

## Conclusions (read first)
- Security/privacy: 默认按研究数据保密场景设计，支持项目级隐私策略与日志脱敏。
- Performance: 交互检查保持秒级反馈，自动化任务与高频 API 调用在限流条件下稳定吞吐。
- Availability: 桌面端长时间运行稳定，关键任务可重试且可恢复。
- Compliance: 以个人本地使用为主，默认本地化优先；企业场景作为后续扩展能力。

## Security and privacy
- Data classification: 项目正文、实验日志、审稿意见按敏感研究资料处理。
- Authentication/authorization: 首发默认单用户本地身份，保留扩展到多角色权限模型的能力。
- Audit/logging: 记录结构化操作日志与任务元数据，默认本地存储且不记录未经授权的正文明文。
- Threat model notes: 重点防护账号越权、导出泄漏、LaTeX 编译逃逸、提示注入导致错误建议。
- Secrets management: 外部 API 密钥必须加密存储，支持轮换与最小权限访问。
- Data sync security: 跨设备同步链路必须全程加密，并支持设备级密钥与令牌吊销。
- Compliance: 企业版预留私有化部署和内容不用于训练配置。

## Performance and scalability
- Target latency: 单章节规则检查与建议生成目标 3 秒内返回首屏结果。
- Throughput: 支持个人用户多项目并行处理且不明显降级，并支持高频 API 编排调用。
- Data size expectations: 单项目支持大于 50 页 LaTeX 主文档并包含多图表与附录。
- Scaling assumptions: 解析、报告、导出与自动化任务采用异步队列与水平扩展 worker，并按供应商配额做限流。
- Retrieval efficiency: 文献检索需具备查询指纹缓存与去重注册表，避免重复抓取与重复向量化。
- Sync scalability: 同一用户多设备同步在常见设备数量下保持增量同步与可恢复传输。

## Availability and resilience
- Availability target: 核心自动化流程具备长期稳定执行能力，目标运行可用性不低于 99.9%。
- Backup/restore expectations: 本地元数据与项目文件支持快照备份，并可结合 Git 历史恢复关键变更。
- Failure modes and degradation: LLM 服务不可用时保留规则引擎能力与历史报告访问；外部 API 故障时自动退避重试并支持降级运行。
- Runtime reliability: 长时任务需支持断点续跑、进程异常自动恢复与任务去重。
- Retrieval resilience: 文献检索故障时优先回退到本地文献注册表与历史缓存，并标记结果时效。
- Local-first resilience: 网络断开时核心本地流程保持可用，联网能力恢复后执行增量同步。
- Git remote resilience: 远程 Git 不可用时，本地提交与历史浏览不受影响，待网络恢复后再执行同步。
- Sync conflict resilience: 设备间并发编辑时，结构化数据支持自动合并，文本冲突保留双版本待人工确认。

## Operability
- Observability: 必须具备结构化日志、请求指标、任务队列指标与错误追踪。
- Support workflows: 提供可重试、可取消、可追踪 run_id 的诊断链路。
- API governance: 必须具备限流、熔断、调用成本统计和告警机制。
- Platform support: 桌面端以 macOS 为首发平台，同时保持跨平台构建与适配能力。
- Git integration reliability: Git 操作需保证可回滚、可审计，避免破坏用户既有仓库状态。
- Git safety boundary (M0): 远程操作限定为 fetch、pull --ff-only、push；默认禁用 force push 与历史改写操作。
- Retrieval governance: 外部文献源需白名单管理，记录来源、抓取时间、版本和授权状态。
- RAG traceability: RAG 回答必须附带文献引用锚点，缺少来源锚点时禁止输出为事实性结论。
- Multi-device governance: 维护设备信任列表，支持单设备吊销与同步会话审计。
- Vector-store governance: Qdrant 仅存授权可同步内容；禁止写入 `RESTRICTED` 文献全文向量。

## Verification
- Each section has either measurable targets or explicit pending decisions with owner and due date.
