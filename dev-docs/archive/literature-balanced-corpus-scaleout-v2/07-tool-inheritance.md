# 07 Tool Inheritance

## Archived Summary
- T-125 reused the staged collection approach from T-122.
- The reusable responsibilities were candidate discovery, candidate triage/status, candidate promotion, B12 completion, and counting.
- Task-owned helper scripts and generated reports were removed during archive cleanup.

## Rule
Future collection work should recreate only the minimum task-local helper needed for the new objective, then remove it during archive.
