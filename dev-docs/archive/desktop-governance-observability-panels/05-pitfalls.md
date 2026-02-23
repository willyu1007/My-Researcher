# 05 Pitfalls

## Do-not-repeat summary
- 不要直接把 API 响应对象绑定到渲染层，必须经 DTO 适配。
- 不要在 flag 关闭路径中残留不可达按钮或空白占位。
- 不要把 `T-007` 的接口未定项硬编码为必填字段。

## Append-only resolved log
### 2026-02-23 — 防止任务边界漂移
- Symptom:
  - 前端观测能力容易与 `T-004` 壳层任务混写，导致目标分散。
- Root cause:
  - 两任务都在 `apps/desktop` 修改，边界天然接近。
- What was tried:
  - 评估在 `T-004` 继续扩展 vs 独立拆包。
- Fix / workaround:
  - 新建 `T-006`，仅承载治理观测面板与契约消费。
- Prevention:
  - 任何新增页面先标注 `belongs-to: T-006`，再进入实现。

### 2026-02-23 — 浏览器回退联调 CORS 失败
- Symptom:
  - 在非 Electron bridge 路径下，治理面板请求出现 `Failed to fetch`。
- Root cause:
  - renderer 直连 `127.0.0.1:3000`，浏览器开发态触发跨域限制。
- What was tried:
  - 先验证后端可达，再复查请求路径与环境变量。
- Fix / workaround:
  - 在 `apps/desktop/vite.config.ts` 增加 dev proxy（`/paper-projects`、`/health`）并让回退基地址指向 dev server。
- Prevention:
  - 任何前端回退请求路径都先走同源代理，避免把 CORS 当成业务故障。
