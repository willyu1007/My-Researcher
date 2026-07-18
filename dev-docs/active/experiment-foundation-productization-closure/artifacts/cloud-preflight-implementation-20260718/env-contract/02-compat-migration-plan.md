# Compatibility and rollout

This is an additive, non-breaking contract change. Existing environments require no migration because the capability defaults to `false`. A future separately reviewed preflight window must provide all exact profile refs, a temporary STS credential triplet, current repo-external policy evidence, and the independently reviewed `sha256:<lowercase-hex>` digest of that exact file before enabling the capability. No long-lived credential, caller-authored evidence digest, or partial configuration is accepted.
