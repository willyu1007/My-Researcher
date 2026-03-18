# Research Argument Framework Package

本压缩包包含一份总文档和三份面向实现的拆分文档，便于直接纳入仓库。

## 文件说明

- `00_research_argument_framework_rchr.md`  
  总文档，完整记录本轮关于研究论证框架、算法、系统架构的讨论收束结果。

- `01_research_argument_data_schema.md`  
  数据建模与对象层规格，重点包括：抽象状态、论证对象图、Decision/Lesson、落库条件、对象存储与同步边界。

- `02_research_argument_planner_spec.md`  
  规划器与算法规格，重点包括：两段式收敛、动作空间、启发式搜索、bundle 规划、停滞检测、退出/回退/转向与 critic 协同。

- `03_research_argument_control_plane_ui.md`  
  控制面与交互规格，重点包括：用户可见状态、控制面视图、人工确认点、可解释性要求、长时任务反馈与本地优先控制。

## 建议落库位置

- `docs/architecture/research_argument_framework_rchr.md`
- `docs/architecture/research_argument_data_schema.md`
- `docs/architecture/research_argument_planner_spec.md`
- `docs/product/research_argument_control_plane_ui.md`

## 推荐阅读顺序

1. 先读总文档 `00_research_argument_framework_rchr.md`
2. 再读 `01_research_argument_data_schema.md`
3. 然后读 `02_research_argument_planner_spec.md`
4. 最后读 `03_research_argument_control_plane_ui.md`

## 本次拆分的原则

- 不改动总文档主结论，只做按实现职责的重组。
- 允许不同文档间少量重复，以保证单独阅读时也能成立。
- 文件名全部采用 ASCII，便于跨平台和仓库使用。
