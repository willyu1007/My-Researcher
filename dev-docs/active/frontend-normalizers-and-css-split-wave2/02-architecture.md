# 02-architecture

## Purpose
- 固化 Wave 2 的 utility/style 拆分合同，重点约束 import order、兼容 barrel 与与其他活跃任务的交叉边界。

## Current-state signals
| File | Current signal | Consequence |
|---|---|---|
| `normalizers.ts` | `1475` 行，多域导出与解析逻辑混装 | 需要 domain barrel |
| `shell.css` | `3722` 行，含 shell 与 feature 样式 | 需要 base/feature 分层 |
| `literature-auto-import.css` | `1317` 行 | topic/rule/run/editor 需要拆分 |
| `literature-manual-import.css` | `901` 行 | upload/zotero/review/status 需要拆分 |

## Normalizer contract
- Candidate domain split:
  - `normalizers/manual-import.ts`
  - `normalizers/auto-pull.ts`
  - `normalizers/overview.ts`
  - `normalizers/metadata.ts`
  - `normalizers/common.ts`
  - `normalizers/index.ts`
- Compatibility rule:
  - 迁移期保留现有 `normalizers.ts` 作为兼容出口，内部 re-export 到新模块。
- Must not do:
  - 不借 normalizer 拆分引入新的业务语义
  - 不顺手重命名大量 consumer import path 而不保留过渡层

## CSS contract
### Base/shell layer
- `shell.css` 只应保留：
  - application shell
  - topbar/sidebar
  - governance 基础块
- 不应继续承载：
  - literature auto-import 细节样式
  - manual import review/upload/zotero 样式

### Feature style layer
- auto-import 样式按以下子域分层：
  - topic
  - rules
  - run detail / alerts
  - editors / preview
- manual-import 样式按以下子域分层：
  - upload
  - zotero
  - review table
  - status / feedback

### Aggregation/import-order rule
- 每个 feature 最多一个聚合入口负责 import order。
- 聚合入口必须记录其导入顺序原因。
- 若修改 import order，必须在 verification 中注明原因与回归检查结果。

## Coordination constraints
- 与 `T-011 literature-management-flow` 的重叠：
  - `normalizers.ts` 已被该任务用于 pipeline/overview 相关语义扩展。
  - 本包启动前必须吸收其最新 baseline，避免重复拆改。
- 与 Wave 1B 的重叠：
  - 若 controller/view 边界尚未稳定，style/utility 归属就不稳定，本包不得提前开始。

## Verification contract
- 必须证明：
  - normalizer 导出兼容
  - CSS import order 稳定
  - build 与 smoke 无回归
- 需要保存的证据：
  - 拆分前后聚合入口列表
  - 关键 selector 清单
  - smoke 结果

## Risks and controls
| Risk | Impact | Control |
|---|---|---|
| `normalizers.ts` 与 `T-011` 并发修改 | merge/conflict 和语义漂移 | 先吸收 `T-011` 基线再开工 |
| CSS 拆分打乱 cascade | UI 回归 | 先记录 import order，再保持兼容聚合入口 |
| 兼容 barrel 未保留 | 全仓 consumer 被迫一次性改写 | 保留 `normalizers.ts` 聚合出口 |
| shell 与 feature 样式边界反复摇摆 | 长期维护继续失焦 | 以 shell-only / feature-specific 为硬边界 |

## Decision checkpoints
- Checkpoint 1:
  - `normalizers.ts` 的 common helpers 与 domain helpers 如何分界。
- Checkpoint 2:
  - `shell.css` 中哪些 governance 样式保留在 base，哪些必须下沉。
- Checkpoint 3:
  - 聚合入口的 import order 是否已经文档化，不再依赖记忆。

