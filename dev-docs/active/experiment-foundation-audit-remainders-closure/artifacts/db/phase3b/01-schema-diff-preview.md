# Phase 3B Schema Diff Preview

- Add PI-owned immutable exploration-spec attachment and business command-receipt tables.
- Add only supporting exact composite unique indexes to existing PI branch/admission tables.
- Composite foreign keys bind exact project/Cycle/branch, revision/approved-plan, admission and receipt/attachment authority.
- EF specification refs remain scalar; there is no cross-domain foreign key, destructive change, rename or data rewrite.
