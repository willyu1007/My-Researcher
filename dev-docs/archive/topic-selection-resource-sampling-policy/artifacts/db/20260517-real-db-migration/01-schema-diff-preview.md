# Schema Diff Preview

Pending migration before apply:

- `20260517120000_add_topic_selection_resource_sampling`

Migration creates:

- `TopicSelectionResourceSampleSet`
- `TopicSelectionResourceSampleItem`
- `TopicSelectionResourceSamplingAudit`

Migration adds indexes for topic/title/status/hash/sample-set lookup and cascading foreign keys from items/audits to sample sets.

Destructive operations: none.

