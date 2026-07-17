-- T-124 G5 FIX-A item 9: additive content-binding column on the human
-- confirmation record. When a confirmation carries the sha256 of the exact
-- claim_statement the reviewer approved, claim materialization asserts it
-- matches the claim being written (409 on mismatch). Nullable/additive — no
-- change to existing rows or reads.
ALTER TABLE "PaperImplementationHumanConfirmationRecord"
  ADD COLUMN "reviewedClaimStatementHash" TEXT;
