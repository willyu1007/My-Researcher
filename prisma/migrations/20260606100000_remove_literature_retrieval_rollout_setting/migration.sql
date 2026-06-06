-- T-121 Phase 5 data cleanup.
-- Removes the obsolete migration rollout setting after pgvector became the only retrieval path.

DELETE FROM "ApplicationSetting"
WHERE "namespace" = 'literature_retrieval_vector'
  AND "key" = 'rollout';
