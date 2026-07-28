# Post verification

Outcome: **passed; schema-only apply with zero application-row change**.

Pre/post evidence was collected using the same server-enforced read-only,
repeatable-read snapshot procedure.

| Check | Before | After |
| --- | --- | --- |
| migration applied | `false` | `true` |
| application tables | 250 | 250 |
| application rows | 3,370,691 | 3,370,691 |
| application-table digest | `sha256:f0a58c6b836698a830a8b55df27435d2b9a70d763f5a47e1aa0ef72d4949679a` | identical |
| exact M7-L1 Run Attempt count | 0 | 0 |

The six Pack B table counts remained exactly:

- ProviderPayload: 2;
- ExecutionAttempt: 2;
- AttemptEvent: 12;
- ProviderCommand: 8;
- CollectionAttempt: 2;
- ProvisionalOutput: 2.

These are the pre-existing simulation rows; the migration created or modified
none of them. The unchanged primary-key/xmin digest across all 250 application
tables proves `changed_tables=[]`.

Constraint readback proves:

- JSON value must be an object;
- JSON `manifest_schema_version` equals relational
  `redactedManifestVersion`;
- `simulation` admits only v1;
- `real_provider` admits v1 or v2.

Additional verification:

- production `offline-preflight` passed for the exact Run and frozen
  ExecutionBundle;
- offline-preflight cloud calls 0 and database writes 0;
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context` passed;
- `node .ai/tests/run.mjs --suite database` passed.

No cloud credential was loaded, no provider call occurred, no capability was
enabled and no PAI Job was created.
