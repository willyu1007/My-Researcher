# Environment Configuration

This document is generated from `env/contract.yaml`. Do not hand-edit.

Generated at (UTC): `2026-08-02T11:28:19Z`

## Environments
- `dev`, `dev.local`, `prod`, `staging`

## Variables

| Name | State | Type | Required | Secret | Default | Secret Ref | Scopes | Deprecate After | Replacement | Rename From | Description |
|---|---:|---:|:---:|:---:|---|---|---|---|---|---|---|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | `active` | `string` | no | yes | `` | `alibaba_cloud_access_key_id` | `dev` | `` | `` | `` | Temporary STS AccessKey ID for the dedicated Aliyun read-only preflight identity; long-lived account credentials are not accepted by the gate. |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | `active` | `string` | no | yes | `` | `alibaba_cloud_access_key_secret` | `dev` | `` | `` | `` | Temporary STS AccessKey secret for the dedicated Aliyun read-only preflight identity. |
| `ALIBABA_CLOUD_SECURITY_TOKEN` | `active` | `string` | no | yes | `` | `alibaba_cloud_security_token` | `dev` | `` | `` | `` | Temporary STS security token required by the dedicated Aliyun read-only preflight identity. |
| `APPLICATION_SETTINGS_REPOSITORY` | `active` | `enum` | no | no | `memory` | `` | `*` | `` | `` | `` | Repository strategy for application settings; must match TITLE_CARD_REPOSITORY when title-card uses Prisma. |
| `APP_ENV` | `active` | `enum` | yes | no | `dev` | `` | `*` | `` | `` | `` | Deployment environment profile. |
| `AUTO_PULL_REPOSITORY` | `active` | `enum` | no | no | `memory` | `` | `*` | `` | `` | `` | Repository strategy for auto-pull stores; must match TITLE_CARD_REPOSITORY when title-card uses Prisma. |
| `AUTO_PULL_SCHEDULER_ENABLED` | `active` | `enum` | no | no | `true` | `` | `*` | `` | `` | `` | Enable the auto-pull background scheduler. |
| `DASHSCOPE_API_KEY` | `active` | `string` | no | yes | `` | `dashscope_api_key` | `dev` | `` | `` | `` | Local DashScope API key for backend LLM workflows. |
| `DASHSCOPE_API_KEY_CODING` | `active` | `string` | no | yes | `` | `dashscope_api_key_coding` | `dev` | `` | `` | `` | Local DashScope API key reserved for coding-oriented LLM workflows. |
| `DASHSCOPE_BASE_URL` | `active` | `url` | no | no | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `` | `dev` | `` | `` | `` | OpenAI-compatible DashScope base URL used by backend LLM workflows; may be overridden in .env.local for local provider experiments. |
| `DATABASE_URL` | `active` | `url` | yes | yes | `` | `database_url` | `dev` | `` | `` | `` | Prisma database URL for the local development database. |
| `DEEPSEEK_API_KEY` | `active` | `string` | no | yes | `` | `deepseek_api_key` | `dev` | `` | `` | `` | Local DeepSeek API key for future backend LLM provider integrations. |
| `EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED` | `active` | `enum` | no | no | `false` | `` | `dev` | `` | `` | `` | Explicit opt-in switch for experiment-foundation LocalScript execution outside NODE_ENV=test. |
| `EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT` | `active` | `string` | no | no | `.ai/.tmp/experiment-foundation-local-execution` | `` | `dev` | `` | `` | `` | LocalScript execution root for experiment-foundation smoke runs; all working directories and outputs must stay inside this root. |
| `EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Comma-separated LocalScript command allowlist; keep narrow for local smoke execution. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_CLOUD_PREFLIGHT_ENABLED` | `active` | `bool` | no | no | `False` | `` | `dev` | `` | `` | `` | Enable only the zero-write Aliyun PAI read-only preflight; this switch never authorizes CreateJob or scientific execution. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IDENTITY_POLICY_EVIDENCE_PATH` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Repo-external JSON evidence binding the temporary preflight credential to the reviewed read-only RAM policy with explicit paidlc:CreateJob denial. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IDENTITY_POLICY_EVIDENCE_SHA256` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Independently supplied sha256:<lowercase-hex> digest of the exact repo-external reviewed identity-policy evidence file. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IMAGE_URI` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Exact runtime image reference used only for offline CreateJob request materialization. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_REGION_ID` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Exact Aliyun region ID for the zero-write PAI cloud preflight. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_ID` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Exact DLC resource quota ID required only for exact_quota mode; it must be absent in public_resource mode. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_MODE` | `active` | `string` | no | no | `exact_quota` | `` | `dev` | `` | `` | `` | Explicit Aliyun resource selector mode for the zero-write preflight; allowed values are exact_quota and public_resource. |
| `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_WORKSPACE_ID` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Exact PAI workspace ID inspected by the zero-write cloud preflight. |
| `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only the server-owned ExperimentFoundation v2 typed candidate promotion/canonicalization command; this switch does not reopen legacy promotion and requires the committed v2 cutover. |
| `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable the separately composed real-provider command drain; this must remain enabled until every committed real-provider submit, sync, reconcile, cancel and collect command is terminal. |
| `EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only new ExperimentFoundation v2 real-provider Attempts after committed cutover; disabling intake never stops draining already committed provider commands. |
| `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only new ExperimentFoundation v2 scientific result recording and validation intake; this switch does not stop relay draining or replay of already committed integration events and requires the committed cutover. |
| `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only new non-production ExperimentFoundation v2 workflow simulations; this switch does not stop draining, reconciling, cancelling, or collecting already committed simulation commands. |
| `HOST` | `active` | `string` | no | no | `0.0.0.0` | `` | `*` | `` | `` | `` | Service listen host. |
| `LITERATURE_CONTENT_PROCESSING_ROOT` | `active` | `string` | no | no | `/Volumes/DataDisk/Data/PaperEngineer/literature-content-processing` | `` | `dev` | `` | `` | `` | Local root directory for literature raw files, normalized text, pipeline artifacts, indexes, and exports. Defaults to <PAPER_ENGINEER_LOCAL_DATA_ROOT>/literature-content-processing (portable fallback applies when the macOS dev volume is absent). |
| `LITERATURE_KEY_CONTENT_READY_METHOD` | `active` | `enum` | no | no | `codex_curated` | `` | `*` | `` | `` | `` | Default KEY_CONTENT_READY completion mode; codex_curated blocks for curated dossier import instead of calling the LLM gateway. |
| `LITERATURE_PIPELINE_EMBEDDING_API_KEY` | `active` | `string` | no | no | `` | `` | `*` | `` | `` | `` | Optional API key for external embedding endpoint. |
| `LITERATURE_PIPELINE_EMBEDDING_MODEL` | `active` | `string` | no | no | `text-embedding-v1` | `` | `*` | `` | `` | `` | Embedding model name used when external embedding endpoint is configured. |
| `LITERATURE_PIPELINE_EMBEDDING_URL` | `active` | `string` | no | no | `` | `` | `*` | `` | `` | `` | Optional external embedding endpoint; unset means local fallback embedding. |
| `LITERATURE_USER_AUTH_PIPELINE_ENABLED` | `active` | `enum` | no | no | `false` | `` | `*` | `` | `` | `` | Enable deep pipeline stages for USER_AUTH literature rights class. |
| `OPENAI_API_KEY` | `active` | `string` | no | yes | `` | `openai_api_key` | `dev` | `` | `` | `` | Local OpenAI API key for backend LLM workflows and topic-selection dry runs. |
| `OPENALEX_API_KEY` | `active` | `string` | no | yes | `` | `openalex_api_key` | `dev` | `` | `` | `` | Optional OpenAlex API key for high-volume literature candidate discovery. |
| `OPENALEX_MAILTO` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Contact email attached to OpenAlex literature discovery requests for polite-pool identification. |
| `PAPER_ENGINEER_LOCAL_DATA_ROOT` | `active` | `string` | no | no | `/Volumes/DataDisk/Data/PaperEngineer` | `` | `dev` | `` | `` | `` | Local root directory for Paper Engineer runtime data and generated artifacts. Code default is /Volumes/DataDisk/Data/PaperEngineer when that volume exists (macOS dev machine); otherwise $XDG_DATA_HOME/paper-engineer or ~/.local/share/paper-engineer. |
| `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only new PaperImplementation experiment v2 admissions; this switch does not gate replay or draining of already committed PI/EF integration events. |
| `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Commit the single-writer v2 product boundary by rejecting legacy PI WorkOrder/Harness/live and EF generic/readiness/promotion/execution mutations while preserving diagnostics reads and integration-event draining. |
| `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED` | `active` | `bool` | no | no | `False` | `` | `*` | `` | `` | `` | Enable only the dedicated PaperImplementation v2 ValidationCycle closure lane (the sole first-release live path is the no-evidence closure); this switch does not gate readback, replay or draining of committed events and requires the committed cutover. |
| `PORT` | `active` | `int` | yes | no | `8000` | `` | `*` | `` | `` | `` | Service listen port. |
| `RESEARCH_LIFECYCLE_REPOSITORY` | `active` | `enum` | no | no | `memory` | `` | `*` | `` | `` | `` | Repository strategy for research lifecycle stores; cascades from TITLE_CARD_REPOSITORY when unset. |
| `SEMANTIC_SCHOLAR_API_KEY` | `active` | `string` | no | yes | `` | `semantic_scholar_api_key` | `dev` | `` | `` | `` | Optional Semantic Scholar Graph API key for literature candidate discovery. |
| `SERVICE_NAME` | `active` | `string` | yes | no | `your-service` | `` | `*` | `` | `` | `` | Service name (logical). |
| `TITLE_CARD_REPOSITORY` | `active` | `enum` | no | no | `memory` | `` | `*` | `` | `` | `` | Repository strategy for title-card management and topic-selection authority stores. |
| `UNPAYWALL_EMAIL` | `active` | `string` | no | no | `` | `` | `dev` | `` | `` | `` | Contact email used for Unpaywall API requests during local literature fulltext acquisition. |

## Loading model (recommended)

1. Runtime injection (cloud)
2. Local .env.local (gitignored)
3. env/values/<env>.yaml
4. env/contract.yaml defaults

## Secret handling rules

- Secret values must never be committed to the repository.
- Secret variables are defined in the contract with `secret: true` and `secret_ref`.
- Secret refs are stored in `env/secrets/<env>.ref.yaml`.
