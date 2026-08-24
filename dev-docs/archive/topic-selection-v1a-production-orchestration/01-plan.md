# Plan

## Phase 1: Contract And Policy
- Add shared v1a workflow harness contract with node ids, route decisions, route edge policy, node policy, invocation/result envelopes, and JSON schemas.
- Define N1-N9 route edges for forward, wait, blocked, loopback, stop/hold, and v1a-complete outcomes.
- Add schema/contract tests for invalid nodes, route decisions, targets, missing edges, and route completeness.

## Phase 2: Backend Native Runner
- Add a service-level route-policy resolver that maps each existing node scenario result to one canonical route edge.
- Add v1a native runner controller/routes mirroring v1b harness shape for node invocation and artifact read/write.
- Keep controllers thin; services own orchestration and route-policy decisions.

## Phase 3: Cleanup
- Migrate automatic harness scripts and tests to invoke the native runner entrypoint.
- Block retired automatic direct-write orchestration paths with a stable policy error.
- Preserve read-only projections and explicit human/manual review actions.

## Phase 4: Verification
- Add unit coverage for N4-N9 route mapping, including missing N7 positive routes.
- Add HTTP integration for happy path and nonlinear loopback/wait/blocked paths.
- Run deterministic local suite, Prisma smoke, OpenAI provider canary, DashScope provider canary, and provider-negative probes.
