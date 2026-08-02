# Change intent

Add a default-off, development-scoped environment contract for the T-132 Aliyun PAI zero-write cloud preflight. The contract declares exact region/workspace/quota/image refs, a repo-external identity-policy evidence path, an independently supplied SHA-256 digest for that exact file, and temporary STS credential refs. It does not add secret values, enable the capability, register a cloud deployment target, or authorize `CreateJob`.
