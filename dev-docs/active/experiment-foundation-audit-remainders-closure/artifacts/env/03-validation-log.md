# Env Contract Validation

- Timestamp (UTC): `2026-08-02T11:28:18Z`
- Root: `/Volumes/DataDisk/Project/My-Researcher`
- Envs: `dev, dev.local, prod, staging`
- Status: **PASS**

## Errors
- (none)

## Warnings
- (none)

## Summary (redacted)
```json
{
  "per_env": {
    "dev": {
      "secret_ref_keys": [
        "alibaba_cloud_access_key_id",
        "alibaba_cloud_access_key_secret",
        "alibaba_cloud_security_token",
        "dashscope_api_key",
        "dashscope_api_key_coding",
        "database_url",
        "deepseek_api_key",
        "openai_api_key",
        "openalex_api_key",
        "semantic_scholar_api_key"
      ],
      "secrets_ref_file": "/Volumes/DataDisk/Project/My-Researcher/env/secrets/dev.ref.yaml",
      "used_secret_refs": [
        "alibaba_cloud_access_key_id",
        "alibaba_cloud_access_key_secret",
        "alibaba_cloud_security_token",
        "dashscope_api_key",
        "dashscope_api_key_coding",
        "database_url",
        "deepseek_api_key",
        "openai_api_key",
        "openalex_api_key",
        "semantic_scholar_api_key"
      ],
      "values_file": "/Volumes/DataDisk/Project/My-Researcher/env/values/dev.yaml",
      "values_keys": [
        "APPLICATION_SETTINGS_REPOSITORY",
        "AUTO_PULL_REPOSITORY",
        "AUTO_PULL_SCHEDULER_ENABLED",
        "DASHSCOPE_BASE_URL",
        "EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED",
        "EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT",
        "EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS",
        "HOST",
        "LITERATURE_KEY_CONTENT_READY_METHOD",
        "LITERATURE_PIPELINE_EMBEDDING_MODEL",
        "LITERATURE_USER_AUTH_PIPELINE_ENABLED",
        "PORT",
        "RESEARCH_LIFECYCLE_REPOSITORY",
        "SERVICE_NAME",
        "TITLE_CARD_REPOSITORY"
      ]
    },
    "dev.local": {
      "secret_ref_keys": [],
      "secrets_ref_file": null,
      "used_secret_refs": [],
      "values_file": "/Volumes/DataDisk/Project/My-Researcher/env/values/dev.local.yaml",
      "values_keys": [
        "EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED",
        "PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED",
        "PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED"
      ]
    },
    "prod": {
      "secret_ref_keys": [],
      "secrets_ref_file": "/Volumes/DataDisk/Project/My-Researcher/env/secrets/prod.ref.yaml",
      "used_secret_refs": [],
      "values_file": "/Volumes/DataDisk/Project/My-Researcher/env/values/prod.yaml",
      "values_keys": [
        "LITERATURE_KEY_CONTENT_READY_METHOD",
        "LITERATURE_PIPELINE_EMBEDDING_MODEL",
        "LITERATURE_USER_AUTH_PIPELINE_ENABLED",
        "PORT",
        "SERVICE_NAME"
      ]
    },
    "staging": {
      "secret_ref_keys": [],
      "secrets_ref_file": "/Volumes/DataDisk/Project/My-Researcher/env/secrets/staging.ref.yaml",
      "used_secret_refs": [],
      "values_file": "/Volumes/DataDisk/Project/My-Researcher/env/values/staging.yaml",
      "values_keys": [
        "LITERATURE_KEY_CONTENT_READY_METHOD",
        "LITERATURE_PIPELINE_EMBEDDING_MODEL",
        "LITERATURE_USER_AUTH_PIPELINE_ENABLED",
        "PORT",
        "SERVICE_NAME"
      ]
    }
  },
  "variables_non_secret": 38,
  "variables_secret": 10,
  "variables_total": 48
}
```

## Notes
- This report never includes secret values.
- If this is used in CI, treat any ERROR as a merge blocker.
