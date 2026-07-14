export const EXPERIMENT_V2_EVENT_TABLES = Object.freeze([
  'PaperImplementationExperimentIntegrationInboxV2',
  'PaperImplementationExperimentIntegrationOutboxV2',
  'ExperimentFoundationIntegrationInboxV2',
  'ExperimentFoundationIntegrationOutboxV2',
]);

export const EXPERIMENT_V2_FIXED_VERSION_CHECKS = Object.freeze({
  pi_ewo_branch_frame_schema_check: 'branchFrameSchemaVersion',
  pi_ewo_revision_snapshot_schema_check: 'workOrderSnapshotSchemaVersion',
  pi_ewo_cell_parameters_schema_check: 'parametersSchemaVersion',
  pi_ewo_cell_required_result_schema_check: 'requiredResultSchemaVersion',
  ef_asset_lifecycle_event_schema_check: 'eventSchemaVersion',
  ef_run_recipe_schema_check: 'recipeSchemaVersion',
  ef_task_spec_schema_check: 'taskSpecSchemaVersion',
  ef_attempt_event_schema_check: 'eventSchemaVersion',
  ef_provider_command_schema_check: 'commandSchemaVersion',
});

export const PACK_A_EXPECTED_FOREIGN_KEY_COUNT = 38;
