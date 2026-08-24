# 仓库治理收敛 / Repository governance convergence — Pitfalls (do not repeat)

## Do-not-repeat summary

- Do not guess or hand-write a Task ID; let the current governance CLI allocate it.
- Do not map this task by inventing a Milestone, Feature, or Requirement; use `F-000` / `M-000`.
- Do not apply the new contract while the old contract still owns an unregistered opening bundle.
- Do not archive by directory age or name; derive lifecycle from the authoritative status field.
- Do not archive `T-043` or `T-129`.
- Do not treat an archived location as proof that a fixture or contract is dead.
- Do not compress archives until every live consumer has moved and passed focused checks.
- Do not remove `ui/styles/ui.css` or required desktop-runtime CSS with UI governance scaffolding.
- Do not leave two task-governance authorities active after cutover.
- Do not make global Git configuration changes to work around a local ownership guard.

## Pitfall log (append-only)

### 2026-08-24 — Git ownership guard rejected the initial status command

- Symptom: plain `git status --short --branch` failed with a dubious-ownership error for `D:/Else/My-Researcher`.
- Context: read-only worktree baseline check before creating the task bundle.
- What we tried: the plain Git status command only.
- Why it failed: the repository directory owner is the local Administrators group while the process user is the Administrator account SID; Git requires an explicit safe-directory decision.
- Fix / workaround: use the per-command read-only override `git -c safe.directory='D:/Else/My-Researcher' ...`.
- Prevention: keep the override scoped to individual Git commands in this environment; do not edit global configuration.
- References: `git status`, `safe.directory`, opening verification.

### Template for future resolved pitfalls

- Symptom:
- Context:
- What we tried:
- Why it failed (or current hypothesis):
- Fix / workaround:
- Prevention:
- References:

### 2026-08-24 — Staged diff check warning did not stop the opening commit

- Symptom: `git diff --cached --check` reported a blank line at EOF in `05-pitfalls.md`, but the following commit still ran.
- Context: the opening checkpoint command used PowerShell semicolons, so a non-zero check did not stop the later `git commit` command.
- What we tried: staged diff check, stat, and commit in one shell invocation.
- Why it failed: command sequencing did not enforce fail-fast behavior.
- Fix / workaround: remove the extra EOF line in this planning checkpoint and run check and commit as separate invocations.
- Prevention: never place a commit after a verification command in the same semicolon-separated shell command; inspect the check result first.
- References: `git diff --cached --check`, commit `3e0a07fd`.
