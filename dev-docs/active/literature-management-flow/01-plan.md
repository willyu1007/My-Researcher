# 01 Plan

## Phases
1. 流程建模与契约冻结
2. 数据模型与后端能力实现
3. 桌面端入口与联动接入
4. 验收、回归与交接

## Detailed steps
1. 对齐文献管理范围与边界：明确 in/out-scope、依赖 M2/M3 的接口。
2. 输出流程图与状态机：检索、导入、去重、注册、关联、刷新。
3. 设计数据模型：文献主表、来源表、标签关系、项目关联表、引用状态字段。
4. 设计并实现 API：检索导入、列表查询、关联与状态更新。
5. 更新 shared contracts：请求/响应结构、错误码、字段约束。
6. 桌面端接入：文献管理列表、筛选、选择并关联到论文项目。
7. 完成自动化验证：typecheck/test/prisma smoke。
8. 完成人工 smoke：从检索到关联闭环，验证去重与来源追溯。

## Risks & mitigations
- Risk: 外部检索源字段不一致导致去重失效。
  - Mitigation: 先做规范化层，再做去重；保留原始 source payload 以便追溯。
- Risk: 流程过早耦合写作模块导致范围失控。
  - Mitigation: M0 只做文献管理到 paper/topic 的必要联动，写作联动保持只读接口。
- Risk: UI 变更影响当前深浅主题稳定性。
  - Mitigation: 坚持 token 驱动，新增 UI 走浅/深主题双矩阵回归。
