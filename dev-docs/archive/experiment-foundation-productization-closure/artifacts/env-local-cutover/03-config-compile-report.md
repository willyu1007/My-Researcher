# Local Environment Compile Report

- Timestamp (UTC): `2026-07-13T11:35:22Z`
- Env: `dev`
- Runtime target: `local`
- Workload: `api`
- Status: **PASS**
- Env file: `/Volumes/DataDisk/Project/My-Researcher/.env.local`
- Effective context: `/Volumes/DataDisk/Project/My-Researcher/docs/context/env/effective-dev.json`

## Warnings
- Preflight warning: No credential signals detected

## Key summary (redacted)
```json
{
  "APPLICATION_SETTINGS_REPOSITORY": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "APP_ENV": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "AUTO_PULL_REPOSITORY": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "AUTO_PULL_SCHEDULER_ENABLED": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "DASHSCOPE_API_KEY": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "DASHSCOPE_API_KEY_CODING": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "DASHSCOPE_BASE_URL": {
    "present": true,
    "secret": false,
    "type": "url"
  },
  "DATABASE_URL": {
    "present": true,
    "secret": true,
    "type": "url"
  },
  "DEEPSEEK_API_KEY": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "HOST": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "LITERATURE_CONTENT_PROCESSING_ROOT": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "LITERATURE_KEY_CONTENT_READY_METHOD": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "LITERATURE_PIPELINE_EMBEDDING_MODEL": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "LITERATURE_USER_AUTH_PIPELINE_ENABLED": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "OPENAI_API_KEY": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "OPENALEX_API_KEY": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "PAPER_ENGINEER_LOCAL_DATA_ROOT": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED": {
    "present": true,
    "secret": false,
    "type": "bool"
  },
  "PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED": {
    "present": true,
    "secret": false,
    "type": "bool"
  },
  "PORT": {
    "present": true,
    "secret": false,
    "type": "int"
  },
  "RESEARCH_LIFECYCLE_REPOSITORY": {
    "present": true,
    "secret": false,
    "type": "enum"
  },
  "SEMANTIC_SCHOLAR_API_KEY": {
    "present": true,
    "secret": true,
    "type": "string"
  },
  "SERVICE_NAME": {
    "present": true,
    "secret": false,
    "type": "string"
  },
  "TITLE_CARD_REPOSITORY": {
    "present": true,
    "secret": false,
    "type": "enum"
  }
}
```

## Notes
- Secret values are written only to the local env file.
- Do not commit the local env file.
