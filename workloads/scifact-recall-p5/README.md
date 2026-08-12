# SciFact recall P5 workload (T-136)

This is the new scientific workload for the bounded `M0-SCI` P5 acceptance.
It does not modify or trust-upgrade the historical T-132 diagnostic workload.

The provider receives three exact read-only inputs: the complete 5,183-document
BEIR SciFact corpus, the 300 test queries selected by `qrels/test.tsv`, and the
339 positive test qrels. Qrels are benchmark input, not imported experiment
results. The only cell factor is `retrieval_top_k`: ordinal 1 uses 10 and
ordinal 2 uses 5. Everything else is frozen by one ExecutionBundle revision.

The stdlib-only entrypoint builds deterministic SHA-256-hashed TF-IDF vectors,
ranks by cosine score with source-order tie breaking, and emits one structural
scientific observation: `micro_recall_ppm`. It is an integer-scaled proportion,
so the provider envelope has no cross-runtime floating-point serialization
drift. The parser remains the product's sole
`scientific_result_parser@v1`; this workload does not create another parser.

The authoritative dataset archive, checksums, input counts, license sources and
metric definition are frozen in `manifests/source-authority-v1.json`.

For an isolated local smoke, use the fixture directories as all three inputs,
provide an exact source-binding JSON, and run both cell keys. The top-10 fixture
result is `1000000` ppm and top-5 is `0` ppm. The fixture is test-only and never
enters a WorkOrder, Run, Result, REU or scientific conclusion.

Cloud execution requires a fresh, exact acceptance whose package, attempt and
time guards all pass; a manifest reference alone is never authority. The
control-plane design separates the locally assumed role
`pea-m7-canary-controller` from the PAI workload runtime role
`pea-m7-canary-runtime`. Before any product capability is enabled, a bounded
qualification phase must verify the assumed-role caller, exact workspace and
official image while recording zero `CreateJob` calls. A qualification pass is
evidence only and does not authorize paid execution. The later acceptance must
bind the exact package, two `CreateJob` operations, the process-local capability
window and expiry-based STS cleanup.

The retained revision-12 prepared/acceptance manifests are historical audit and
deterministic-test fixtures. Their window and credential are expired, the
profile's paid/capability authority booleans are false, and they cannot be
reused. Revisions 1-11 survive only as hashes/outcomes in the workload profile
and task documentation; their generated manifests and retired runtime hash/
timeline compatibility branches have been removed. Any future attempt needs a
new package/attempt identity and a new exact authorization.
