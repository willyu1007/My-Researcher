-- T-130 W-10 (D10, L-11): staged transition for the quality-semantics change.
-- Pre-D10, content processing manufactured high_confidence/100 pseudo-scores; at cutover the
-- live corpus had 1539 such rows carrying essentially all retrieval-ready literature (auto-pull/
-- human sources: 1 row). Dropping them from retrieval would zero the product corpus, so they are
-- grandfathered: status stays high_confidence (still retrieval-active), components gain an
-- explicit marker so the ledger shows these are transitional, to be replaced by real scoring or
-- human review. New content_processing writes are needs_review processing_complete markers.
UPDATE "LiteratureQualityAssessment"
SET "qualityComponents" = "qualityComponents"
  || jsonb_build_object(
       'grandfathered_pseudo_score', true,
       'grandfathered_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       'grandfather_reason', 'T-130 W-10 D10 staged transition'
     )
WHERE "source" = 'content_processing'
  AND "qualityStatus" = 'high_confidence'
  AND NOT ("qualityComponents" ? 'grandfathered_pseudo_score');
