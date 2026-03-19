# 05-pitfalls

## Do-not-repeat summary
- CSS 文件拆分后，不要只依赖 `build`；必须补做旧 class 集合与新模块 class 集合的对比，才能抓到 `literature-defaults-grid` 这种静默丢失。
- 当目录名与 barrel 文件同名时，不要把 re-export 写成目录短路径；`normalizers.ts` 在 `./normalizers` 这种写法下会先解析回自身文件。

## Historical log
- Date: 2026-03-19
  Symptom:
  - 拆分后 `manual-import` 少了 `literature-defaults-grid`，编译通过但布局样式丢失。
  Root cause:
  - 通过大段提取 CSS 子模块时，单个低频 selector 没有被带过去。
  What was tried:
  - 先跑 `build/typecheck`，均未暴露该问题；随后补做旧文件与新模块的 class 集合对比，才定位缺口。
  Fix/workaround:
  - 将 `literature-defaults-grid` 补回 `review.css`，并把 class 集合对比加入本轮验证。
  Prevention:
  - 后续所有 CSS 拆分都要执行 class 集合对比，不仅看编译结果。
- Date: 2026-03-19
  Symptom:
  - `normalizers.ts` 改为 `export * from './normalizers'` 后，desktop typecheck 大面积报“missing export”。
  Root cause:
  - 同目录同时存在 `normalizers.ts` 文件和 `normalizers/` 目录，短路径解析优先命中文件自身，形成自引用。
  What was tried:
  - 将 barrel 改为目录短路径以追求“更简洁”的写法。
  Fix/workaround:
  - 回退为显式 `export * from './normalizers/index';`。
  Prevention:
  - 目录名与 barrel 文件同名时，统一使用显式 `index` 路径，避免自解析循环。
