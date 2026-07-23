# M7-I0 environment change intent

Add two non-secret, default-false configuration controls for the isolated M7 real-provider implementation:

- `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED` controls only creation of new real-provider Attempts.
- `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED` controls the independently composed worker that drains already committed real-provider commands.

This change does not enable either capability, supply credentials, call a provider, or modify any deployed environment.
