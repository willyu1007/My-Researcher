# Pitfalls

## Do Not Repeat
- Do not treat provider output as authority just because it passes schema validation.
- Do not put provider credentials, raw secrets, or hidden reasoning into evaluation artifacts.
- Do not make live provider availability a default CI dependency.
- Do not describe T-105 as real live-provider variance execution. It is deterministic fake-provider evaluation plus live-provider preflight reporting.
- Do not treat `live_provider_enabled` as a switch that starts live model calls in T-105. Enabled live profiles are still reported as blocked until a future explicit execution task exists.
- Do not conflate proposal stability with scientific evidence quality.
- Do not reuse topic-selection provider metrics without checking PaperImplementation workflow semantics.
- Do not add Prisma fields opportunistically in T-105. If later live-provider execution needs new queryable state, record the gap and handle it through an explicit schema task.
- Do not treat the aggregate provider-variance report as a new authority object. It is route/test/governance evidence derived from existing harness artifacts.
