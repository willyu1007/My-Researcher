# EF-P06 environment contract intent

Add `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` as a non-secret boolean capability. It defaults to `false`, gates only new typed promotion intake, requires `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true`, and never reopens the legacy promotion route.
