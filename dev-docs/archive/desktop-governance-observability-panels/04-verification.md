# 04 Verification

## Automated checks
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - Result: pass
- [pass] `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result: pass（renderer/main 均构建成功）

## Manual smoke checks
- [pass] 启动 renderer + backend 后，默认 flag 关闭时不展示新治理面板。
  - Steps:
    - `pnpm --filter @paper-engineering-assistant/backend dev`
    - `cd apps/desktop && VITE_API_BASE_URL=http://127.0.0.1:5180 pnpm exec vite --host 127.0.0.1 --port 5180 --strictPort`
  - Evidence:
    - 页面显示 `Governance OFF`、`治理面板默认关闭`、`启用治理面板`。
- [pass] 打开治理 flag 后，四个面板可进入且具备 loading/error/empty 回退。
  - Steps:
    - 点击 `启用治理面板`。
    - `Paper ID=P999` + `加载项目` 触发错误态。
    - 慢网条件下 `Paper ID=P001` + `加载项目` 触发 loading 态。
  - Evidence:
    - loading: `正在加载 timeline...`、`正在计算运行指标...`、`正在加载 artifact bundle...`
    - error: `VERSION_CONFLICT: Paper P999 does not exist.`
    - empty: `暂无待展示的审查事件。`（release queue 空态）
    - ready: Timeline/Runtime Metrics/Artifact Bundle/Release Review Queue 均有内容渲染。
- [pass] release-review 提交后显示回执（accepted/review_id/audit_ref）。
  - Steps:
    - `Decision=approve`，提交 `提交审查`。
  - Evidence:
    - 表单反馈：`已提交 RV-0001（audit: AUD-RV-0001）。`
    - 时间线新增：`research.release.reviewed` / `Release review approve (RV-0001).`
    - Artifact bundle 更新 `review_url=paper-project://P001/review/RV-0001`。

## Rollout / Backout
- Rollout:
  - 先灰度开启 feature flag 给内部用户。
- Backout:
  - 关闭前端治理 flag，保留代码但退出可见入口。

## Governance checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: pass
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass
