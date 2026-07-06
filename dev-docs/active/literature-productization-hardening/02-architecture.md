# 02 Architecture(关键设计决策,随切片补充)

## D1 孤儿 run 恢复(W-01)
- 单实例部署假设(与 auto-pull scheduler 一致)下,启动清扫可安全关闭全部遗留 in-flight run;为兼容未来多实例,入队路径同时做 stale 阈值兜底(updatedAt 超阈值才判孤儿)。阈值取常量(初值 15min),W-10 再议配置面。

## D2 enqueue 互斥(W-01)
- 方案:`pg_advisory_xact_lock(hashtext('lit-pipeline:'||literatureId))` 包裹「查 in-flight + 插入」事务——零 schema 迁移、锁随事务释放;in-memory 仓储以进程内 keyed-mutex 等价。备选(部分唯一索引)记录但不选:Prisma 不原生支持 partial unique,raw migration 维护成本高。

## D3 retrieval-ready 单一化(W-05,待定稿)
- 候选:以 `LiteratureEvidenceActivationService.isEvidenceReady` 为唯一函数,扩展 STALE 语义(fresh|stale_ok|blocked 三态?),UI 的 process_to_retrievable 与选题 eligibility 改为消费方。STALE 对选题采样是排除还是降权,留用户裁决。

## D4 自动衔接(W-06,设计先行)
- 触发点:collectionImport 成功后按规则入队(非 auto-pull 内部),规则=质量门(auto-pull 分≥阈值)+成本闸(日预算/并发限流,复用 backfill limiter)+全局开关(settings,默认关,灰度开)。与 T-029「collection 不触发 processing」边界决策的关系:本包显式修订该边界并留痕,不静默背离。
