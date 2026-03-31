# 05 Pitfalls

## P-001 Graph Truth And Abstract State Can Drift Apart
- Symptom:
  - UI or bridge consumers observe stale state after graph mutations.
- Prevention:
  - Every graph mutation must trigger recompute in the same repository transaction or service call.

## P-002 V1 Can Get Blocked By Planner-First Overreach
- Symptom:
  - Planner or critic work starts redefining graph/state semantics before the base layer stabilizes.
- Prevention:
  - T-028 may consume T-025 outputs, but must not redefine the T-025 source-of-truth contract.

## P-003 Object Discrimination Order Matters For Mixed Graph Payloads
- Symptom:
  - `EvidenceRequirement` records silently disappear from the branch graph and `EvidenceCompleteness` falls to zero.
- Root cause:
  - `EvidenceRequirement` contains `claim_id`, so a naive discriminator that checks `claim_id` first will misclassify it as `Claim`.
- Fix / workaround:
  - Check `evidence_requirement_id` before `claim_id` when reconstructing the branch graph.
- Prevention:
  - Any future graph-object discriminator should be reviewed for overlapping field names before new object kinds are added.

## P-004 Backend Test Execution Must Not Depend On Shell Glob Expansion
- Symptom:
  - `pnpm --filter @paper-engineering-assistant/backend test` fails in PowerShell because `src/**/*.test.ts` is treated as a literal path.
- Root cause:
  - The original script assumed shell-side glob expansion.
- Fix / workaround:
  - Use a Node runner that enumerates `.test.ts` files and passes explicit paths to `node --test`.
- Prevention:
  - Keep repo scripts shell-agnostic unless the package explicitly targets one shell.

## P-005 Graph Object Ids Are Not Globally Unique Across Branches
- Symptom:
  - Writing an object with the same id in another branch overwrites the first branch's graph truth.
- Root cause:
  - The first implementation keyed graph storage only by `object_id`.
- Fix / workaround:
  - Key graph storage and lookups by `workspace_id + branch_id + object_id`.
- Prevention:
  - Treat branch isolation as part of object identity unless a contract explicitly guarantees global uniqueness.

## P-006 Recomputing An Inactive Branch Must Not Rewrite Workspace Surface
- Symptom:
  - Recomputing or initializing an inactive branch changes workspace `current_stage` and report pointers away from the active branch.
- Root cause:
  - Workspace summary fields were refreshed unconditionally inside recompute.
- Fix / workaround:
  - Only refresh workspace-level stage/report pointers when the recomputed branch is the active branch, or when no active branch exists yet.
- Prevention:
  - Keep branch-local state and workspace-active summary state separate whenever a workspace can own multiple branches.
