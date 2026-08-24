# 05 Pitfalls

## Do Not Repeat
- Do not build a writing editor inside implementation workbench.
- Do not make UI badges from client-only heuristics.
- Do not bypass backend confirmation or state writer.
- Do not recreate retired desktop style layers.
- Do not let UI mutate portfolio roles or upstream topic-selection state directly.

## 2026-05-21 - Dynamic data-ui Attributes
- Symptom: UI governance gate failed with `contract-enum` / `contract-dynamic` errors on dynamic `data-state` and `data-tone` values.
- Root cause: the static UI contract auditor requires analyzable literal `data-*` values for contract roles and enums.
- What was tried: initial JSX used ternary expressions for tab state and badge tone.
- Fix: render explicit literal branches for tab state and switch-based literal badge tones.
- Prevention: new `data-ui` components should use literal enum attributes or conditional branches, not opaque dynamic values.

## 2026-05-21 - Read-model Endpoint Assumptions
- Symptom: the first loader shape assumed project-level GET endpoints for technical route candidates and experiment plan lights.
- Root cause: T-095 exposed create commands for these planning objects but not list routes.
- What was tried: broad load-all read-model call.
- Fix: T-100 now only calls existing project-level GET read-model endpoints and leaves route/probe/plan tables empty until backend list routes exist.
- Prevention: UI read-model loaders must be checked against `paper-implementation-routes.ts`, not inferred from create endpoints.

## 2026-05-21 - Chrome Executable Path
- Symptom: Chrome DevTools could not find `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Root cause: `/Applications/Google Chrome.app` pointed at Playwright's `Google Chrome for Testing.app`, whose executable is named `Google Chrome for Testing`; the standard Chrome app lived at `/Volumes/DataDisk/Google Chrome.app`.
- What was tried: searched Spotlight, `/Applications`, user app directories, and mounted volumes; verified standard Chrome bundle id `com.google.Chrome`.
- Fix: repointed `/Applications/Google Chrome.app` symlink to `/Volumes/DataDisk/Google Chrome.app`.
- Prevention: browser verification should check both app bundle path and `CFBundleExecutable` before marking Chrome unavailable.
