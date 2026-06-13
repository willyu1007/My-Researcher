# 05 Pitfalls

> 本任务包实施中踩坑后追加（symptom / root cause / tried / fix / prevention）。以下为从相关任务包继承的 do-not-repeat 事项。

## Do-not-repeat（继承自 T-107/T-112/T-115 及审计）
- **不要新建第二个 hash 实现**：canonical hash 单源于 `topic-selection-v1b-harness-authority-hash.ts`（T-115 D1 consolidation 的成果）；coordinator/debate/memory 一律复用。
- **不要重新引入 v1b legacy direct-write 路由**：404 测试钉死；人审只走 harness `human_delegated`。
- **UI gate `contract-dynamic` 规则**：动态 `data-tone={fn()}` 会被拒——用字面 tone 的条件渲染（T-087/T-115 两次踩中）。
- **`mocked_llm` 永不进 product**：fixture 失败不是产品恢复路径；任何"先用 mock 顶一下"的捷径都违反 DMP-09。
- **provider 参数名不得泄漏出 gateway/adapter 边界**（DMP-06）：typed overrides（Phase 1.3）只收紧校验，不把 `enable_thinking` 之类带进契约/域层。
- **矩阵类 SSOT 文档改完必跑一致性脚本**（Phase 0.2 交付后）：本任务包的起因之一就是矩阵与实现静默漂移了一个大版本。
- **改 harness 本体前先做 T-088 联合决策**（D3）：T-088 in-progress，无协调的并行改动会在 540KB 单文件上制造严重冲突。
- **schema 迁移走 `sync-db-schema-from-code` skill**：业务层不得 import Prisma（repo 规则）。

## 约定登记（2026-06-12 代码审查 #8/#10）
- **invocation lint 的正则只识别单引号字面量**：prompt 模板 id / schema 名必须写成 `'topic-selection…'` 单引号字面量（不要用反引号模板串或跨行拼接），否则 lint 静默放行、问题推迟到运行时 gateway 强校验才暴露。该约定已写入本条；如出现合法的反引号场景，先扩 lint 正则再写代码。
- **两套文本归一化器的作用域**：`normalizeDecisionMemoryTextKey`（decision-memory dedup，Unicode 字母数字+空格折叠）与 v1a admission 的 `normalizedCandidateKey`（候选池比对）算法不同。跨面判重行为可能不一致——若未来需要对齐，统一到一个共享 normalizer 并同步迁移两侧已存 key；在此之前不要混用两者的输出做比对。

## Promise 链身份与 void-finally（2026-06-13，Phase 2 审查）
- `promise.catch(fn)` 每次调用**新建**派生 promise——把 `p.catch(...)` 存进 Map 后再用第二次 `p.catch(...)` 做身份比较恒 false（清理永不执行）。要比较就先存变量。
- `void promise.finally(...)` 在源 promise reject 时产生**无 handler 的派生 reject** → Node ≥15 默认 unhandledRejection 直接崩进程，即使调用方已 catch 源 promise。守卫链一律从"已 catch 化"的 promise 派生（`const guarded = p.catch(() => undefined)`）。
- 测试盲区教训：所有停驻路径都正常 return 时，throw 路径（400/500）一次都没走到——崩溃缺陷在 7/7 绿的单测下潜伏。为 throw 路径补一条专用单测。

## harness run_mode 守卫（2026-06-13）
- `run_mode`/`profile_id` 只在携带语义工件/execution_spec 的请求上合法；对裸确定性节点下发会触发 `RUNTIME_FIELDS_REQUIRE_SEMANTIC_ARTIFACT` blocked。组装方按"有 caller 输入才设 run_mode"处理。
