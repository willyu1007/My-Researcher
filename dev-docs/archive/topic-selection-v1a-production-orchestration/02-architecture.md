# Architecture

## Boundaries
- Shared contracts define route-policy shape and wire envelopes.
- Backend WorkflowHarness service remains the node executor.
- New v1a native runner wraps existing node executor methods and attaches policy-derived route metadata.
- Routes only register schemas and delegate to controllers.
- Controllers normalize HTTP input and map errors; they do not make route decisions.

## Route Policy
- `invoke_next`: normal forward handoff.
- `loopback`: machine-actionable repair to an earlier/same v1a node.
- `wait`: human/operator review required; no automatic advance.
- `blocked`: current attempt cannot advance.
- `stop_no_advance`: terminal no-advance candidate state.
- `hold`: parked candidate state.
- `stop_v1a_complete`: N9 publication complete with v1b handoff.

## Cleanup Rule
Automatic orchestration must use the native runner. Direct v1a write routes may remain only for read-only projections or explicit human/manual actions and must not be used by harness automation.

## Risks
- Direct route cleanup can break desktop mutation surfaces if over-applied.
- Provider acceptance can be slow or environment-dependent.
- Route-policy drift can reappear unless every emitted node outcome is asserted against policy.
